#!/usr/bin/env node
/* =====================================================================
 *  WORKER LOCAL DE DESCARGAS · Antigravity
 *  ---------------------------------------------------------------------
 *  Qué hace:
 *    - Pide trabajo al servidor (heartbeat + next) y descarga con yt-dlp.
 *    - Sube el resultado al servidor por trozos (multipart/form-data).
 *    - Informa de progreso, item_done, finish o fail.
 *
 *  Diseño anti-sandbox (importante):
 *    NO usamos tuberías (pipes) para leer la salida de yt-dlp. Abrimos un
 *    fichero y le pasamos su descriptor como stdout/stderr del hijo, de
 *    modo que yt-dlp escribe el progreso EN UN FICHERO y el worker lo lee
 *    por posiciones. Así funciona igual en entornos normales y en
 *    entornos donde crear pipes devuelve EPERM. Si abrir el fichero
 *    fallara, se usa automáticamente el modo tubería como respaldo.
 *
 *  Uso:
 *      node worker.mjs
 *      DESCARGAS_WORKER_CONFIG=<ruta.json> node worker.mjs
 *
 *  Códigos de salida:
 *      0 = parada normal (Ctrl+C)      2 = error de configuración
 * ===================================================================*/

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------
// Constantes generales
// ---------------------------------------------------------------------
const VERSION_WORKER = '1.1';
const NOMBRE_WORKER = 'pc-antonio';
const VERSION_YTDLP_POR_DEFECTO = '2026.08.19';

const DIR_SCRIPT = path.dirname(fileURLToPath(import.meta.url));
const RUTA_CONFIG_POR_DEFECTO = path.join(DIR_SCRIPT, '..', '..', '.private', 'descargas-worker.json');

const MS_HEARTBEAT = 30_000;          // heartbeat cada 30 s
const MS_MIN_ENTRE_PETICIONES = 1000; // nunca más de 1 petición por segundo
const MS_MIN_ENTRE_PROGRESOS = 2000;  // progreso como máximo cada 2 s
const MS_PROGRESO_CONSOLA = 5000;     // resumen de progreso en consola cada 5 s

const MAX_INTENTOS = 5;                                    // reintentos HTTP
const BACKOFF_MS = [2000, 4000, 8000, 16000, 32000];       // backoff exponencial
const TIMEOUT_HTTP_MS = 60_000;                            // petición JSON
const TIMEOUT_SUBIDA_MS = 180_000;                         // subida de un trozo
const LOG_MAX_BYTES = 5 * 1024 * 1024;                     // rotación del log (5 MB)

const CALIDADES = new Set(['best', '2160', '1440', '1080', '720', '480', '360']);
const FORMATOS_VIDEO = new Set(['mp4', 'mkv', 'webm']);
const FORMATOS_AUDIO = new Set(['mp3', 'm4a']);

const DIR_LOG = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'descargas-worker');
const RUTA_LOG = path.join(DIR_LOG, 'worker.log');

// ---------------------------------------------------------------------
// Estado global
// ---------------------------------------------------------------------
let config = null;
let versionYtDlp = VERSION_YTDLP_POR_DEFECTO;
let parando = false;
let hijoActual = null;          // ultimo proceso yt-dlp (compatibilidad)
const hijosActivos = new Map();  // job.id -> proceso yt-dlp (varias descargas a la vez)
let temporizadorHeartbeat = null;
let servidorLocal = null;
let dialogoAbierto = false;
let bytesEscritosLog = 0;
let ultimaPeticion = 0;         // marca de tiempo de la última petición HTTP
let colaHttp = Promise.resolve(); // serializa las peticiones (>1 s entre ellas)

// ---------------------------------------------------------------------
// Utilidades básicas
// ---------------------------------------------------------------------
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// yt-dlp (Python congelado) escribe en su stdout la codificación ANSI de Windows
// (cp1252) cuando la salida NO es una consola: una "í" sale como 0xED, que no es
// UTF-8 válido. Decodificamos con UTF-8 estricto y, si falla, con windows-1252.
const decodificadorUtf8 = new TextDecoder('utf-8', { fatal: true });
const decodificador1252 = new TextDecoder('windows-1252');

function decodificar(buffer) {
  if (!buffer || !buffer.length) return '';
  try {
    return decodificadorUtf8.decode(buffer);
  } catch {
    return decodificador1252.decode(buffer);
  }
}

function marcaTiempo(fecha = new Date()) {
  const p = (n, ancho = 2) => String(n).padStart(ancho, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())} ` +
         `${p(fecha.getHours())}:${p(fecha.getMinutes())}:${p(fecha.getSeconds())}`;
}

function hora(fecha = new Date()) {
  return marcaTiempo(fecha).slice(11);
}

function recortar(texto, max) {
  const t = String(texto ?? '');
  return t.length <= max ? t : t.slice(0, max - 1) + '…';
}

// ---------------------------------------------------------------------
// Log a fichero (con rotación a 5 MB) + consola en español
// ---------------------------------------------------------------------
function prepararLog() {
  try {
    fs.mkdirSync(DIR_LOG, { recursive: true });
    bytesEscritosLog = fs.existsSync(RUTA_LOG) ? fs.statSync(RUTA_LOG).size : 0;
    rotarLogSiHaceFalta();
  } catch (e) {
    console.error(`[aviso] No se pudo preparar el log en ${RUTA_LOG}: ${e.message}`);
  }
}

function rotarLogSiHaceFalta() {
  try {
    if (!fs.existsSync(RUTA_LOG)) { bytesEscritosLog = 0; return; }
    const tam = fs.statSync(RUTA_LOG).size;
    if (tam <= LOG_MAX_BYTES) { bytesEscritosLog = tam; return; }
    const antiguo = `${RUTA_LOG}.1`;
    try { fs.rmSync(antiguo, { force: true }); } catch { /* da igual */ }
    fs.renameSync(RUTA_LOG, antiguo);
    bytesEscritosLog = 0;
  } catch { /* si falla la rotación seguimos escribiendo */ }
}

function registrar(nivel, mensaje) {
  const linea = `[${marcaTiempo()}] [${nivel}] ${mensaje}\n`;
  try {
    if (bytesEscritosLog + Buffer.byteLength(linea) > LOG_MAX_BYTES) rotarLogSiHaceFalta();
    fs.appendFileSync(RUTA_LOG, linea, 'utf8');
    bytesEscritosLog += Buffer.byteLength(linea);
  } catch { /* el log nunca debe tumbar al worker */ }
}

const logInfo = (m) => { registrar('INFO', m); };
const logAviso = (m) => { registrar('AVISO', m); console.warn(`[aviso] ${m}`); };
const logError = (m) => { registrar('ERROR', m); console.error(`[error] ${m}`); };
const logDepurar = (m) => { registrar('DEPURA', m); };

// Salida legible en consola (resumen para el usuario)
function consola(mensaje) {
  process.stdout.write(`[${hora()}] ${mensaje}\n`);
}

// ---------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------
function abortarConfig(mensaje) {
  console.error('');
  console.error('  ╔══════════════════════════════════════════════════════════════╗');
  console.error('  ║  ERROR DE CONFIGURACIÓN DEL WORKER DE DESCARGAS              ║');
  console.error('  ╚══════════════════════════════════════════════════════════════╝');
  console.error('');
  console.error(`  ${mensaje}`);
  console.error('');
  console.error('  Revisa el fichero de configuración o define la variable de entorno');
  console.error('  DESCARGAS_WORKER_CONFIG apuntando a un JSON válido.');
  console.error('');
  process.exit(2);
}

/* ── Carpeta de descarga: informar y cambiarla ──────────────────────────── */

/** Unidades existentes, para poder elegir un USB desde la web. */
function listarUnidades() {
  const unidades = [];
  for (let c = 65; c <= 90; c++) {
    const letra = String.fromCharCode(c) + ':\\';
    try {
      if (fs.existsSync(letra)) unidades.push(letra);
    } catch (e) {
      // Una unidad sin medio (lector vacío) lanza: se ignora.
    }
  }
  return unidades;
}

/** Guarda la carpeta nueva en el fichero de configuracion, sin tocar lo demas. */
function guardarCarpetaEnConfig(ruta) {
  try {
    const bruto = fs.readFileSync(config.rutaConfig, 'utf8').replace(/^\uFEFF/, '');
    const datos = JSON.parse(bruto);
    datos.download_dir = ruta;
    fs.writeFileSync(config.rutaConfig, JSON.stringify(datos, null, 2) + '\n', 'utf8');
    logDepurar('carpeta de descarga guardada en la configuración');
  } catch (e) {
    logAviso(`No se pudo guardar la carpeta en la configuración: ${e.message}`);
  }
}

/* ── Elegir carpeta con el explorador de Windows ─────────────────────────── */

/**
 * Abre el explorador de carpetas de Windows EN EL PC y devuelve la ruta elegida.
 * El navegador no puede revelar rutas reales del disco (por seguridad), asi que
 * el dialogo tiene que abrirlo el worker, que es quien ve el disco.
 *
 * PowerShell en modo -STA porque Windows Forms lo exige; el formulario oculto
 * y siempre encima es solo para que el dialogo salga delante y no detras de la
 * ventana del worker (que esta minimizada).
 */
function abrirExploradorDeCarpetas() {
  return new Promise((resolve) => {
    // El dialogo moderno (grande, con barra de ruta y redimensionable) lo abre
    // elegir-carpeta.ps1: el FolderBrowserDialog clasico de PowerShell 5.1 es el
    // antiguo, pequeno y de tamano fijo.
    const script = path.join(DIR_SCRIPT, 'elegir-carpeta.ps1');
    const argumentos = [
      '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', script,
      '-Titulo', 'Elige la carpeta donde guardar las descargas',
      '-Inicial', String(config.downloadDir || ''),
      '-Boton', 'Elegir esta carpeta',
    ];

    let hijo;
    try {
      hijo = spawn('powershell.exe', argumentos, { windowsHide: true });
    } catch (e) {
      resolve({ ruta: '', error: 'no se pudo abrir el explorador: ' + e.message });
      return;
    }

    let salida = '';
    let terminado = false;
    hijo.stdout.on('data', (trozo) => { salida += trozo.toString('utf8'); });
    hijo.stderr.on('data', (trozo) => logDepurar('explorador: ' + trozo.toString('utf8').trim()));

    const reloj = setTimeout(() => {
      if (terminado) return;
      terminado = true;
      try { hijo.kill(); } catch (e) { /* ya no esta */ }
      resolve({ ruta: '', error: 'se cerro solo tras 4 minutos sin elegir carpeta' });
    }, 240000);

    hijo.on('error', (e) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(reloj);
      resolve({ ruta: '', error: 'no se pudo lanzar el explorador: ' + e.message });
    });

    hijo.on('close', (codigo) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(reloj);
      const ruta = salida.trim().replace(/\r/g, '');
      if (!ruta) {
        resolve({ ruta: '', error: codigo === 2 ? '' : 'el explorador no devolvio ninguna carpeta' });
        return;
      }
      resolve({ ruta, error: '' });
    });
  });
}
/** Atiende la peticion «elegir carpeta» que llega desde la web. */
async function pedirCarpetaConDialogo() {
  if (dialogoAbierto) {
    return;
  }
  dialogoAbierto = true;
  try {
    consola('Abriendo el explorador de carpetas en el PC…');
    logInfo('Explorador de carpetas abierto (peticion desde la web)');
    const resultado = await abrirExploradorDeCarpetas();
    if (!resultado.ruta) {
      const motivo = resultado.error || 'Has cerrado el explorador sin elegir carpeta.';
      logInfo(`Explorador cerrado sin elegir: ${motivo}`);
      consola(`  No se eligio ninguna carpeta: ${motivo}`);
      await peticion({ action: 'dir_applied', ok: false, error: motivo }, { etiqueta: 'dir_applied' })
        .catch(() => { /* si falla, el aviso se queda en el historial */ });
      return;
    }
    await aplicarCambioDeCarpeta(resultado.ruta);
  } finally {
    dialogoAbierto = false;
  }
}

/**
 * Aplica el cambio de carpeta que pide el servidor.
 * El worker es el unico que ve el disco del PC, asi que aqui se valida, se crea
 * si hace falta y se comprueba que se puede ESCRIBIR DE VERDAD (un USB puede
 * estar protegido contra escritura, o lleno).
 */
async function aplicarCambioDeCarpeta(ruta) {
  const destino = String(ruta || '').trim();
  logInfo(`Petición de cambiar la carpeta de descarga a: ${destino}`);
  consola(`Cambiando la carpeta de descarga a: ${destino}`);

  try {
    const esWindows = /^[A-Za-z]:[\\/]/.test(destino);
    const esUNC = destino.startsWith('\\\\');
    if (!esWindows && !esUNC) {
      throw new Error('la ruta no es una ruta completa de Windows (por ejemplo D:\\Vídeos o F:\\)');
    }
    fs.mkdirSync(destino, { recursive: true });

    const prueba = path.join(destino, '.descargas-worker-prueba');
    fs.writeFileSync(prueba, 'ok');
    fs.unlinkSync(prueba);

    config.downloadDir = destino;
    guardarCarpetaEnConfig(destino);
    logInfo(`Carpeta de descarga cambiada a ${destino}`);
    consola(`Carpeta de descarga: ${destino}`);

    await peticion({ action: 'dir_applied', ok: true, ruta: destino }, { etiqueta: 'dir_applied' });
  } catch (e) {
    const motivo = e && e.message ? e.message : String(e);
    logError(`No se pudo cambiar la carpeta a ${destino}: ${motivo}`);
    consola(`NO se pudo cambiar la carpeta: ${motivo}`);
    try {
      await peticion({ action: 'dir_applied', ok: false, error: motivo }, { etiqueta: 'dir_applied' });
    } catch (e2) {
      logAviso(`No se pudo informar del fallo de carpeta: ${e2.message}`);
    }
  }
}

/* ── Puerto local: "¿estoy abriendo la web desde este PC?" ──────────────── */

/**
 * La web necesita saber si se esta abriendo desde ESTE PC para no subir el
 * fichero cuando no hace falta. Comparar IPs no es fiable (proxies, CGNAT,
 * conexiones que salen por otro sitio), asi que se comprueba de verdad: la
 * pagina, desde el navegador, pregunta a este puerto local. Si contesta, es que
 * esta en la misma maquina.
 *
 * Chrome permite http://127.0.0.1 desde una pagina https (se considera origen
 * de confianza), pero exige responder al preflight de Private Network Access.
 */
function arrancarServidorLocal() {
  const servidor = http.createServer((peticion, respuesta) => {
    const cabeceras = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Private-Network': 'true',
      'Cache-Control': 'no-store',
    };
    if (peticion.method === 'OPTIONS') {
      respuesta.writeHead(204, cabeceras);
      respuesta.end();
      return;
    }
    const cuerpo = JSON.stringify({ pc: true, worker: NOMBRE_WORKER, carpeta: config.downloadDir });
    respuesta.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cabeceras));
    respuesta.end(cuerpo);
  });

  servidor.on('error', (e) => {
    logAviso(`No se pudo abrir el puerto local ${config.puertoLocal}: ${e.message} (la web dira que estas fuera y subira los ficheros)`);
  });
  servidor.listen(config.puertoLocal, '127.0.0.1', () => {
    logDepurar(`puerto local escuchando en 127.0.0.1:${config.puertoLocal}`);
  });
  return servidor;
}

function cargarConfig() {
  const ruta = process.env.DESCARGAS_WORKER_CONFIG || RUTA_CONFIG_POR_DEFECTO;

  if (!fs.existsSync(ruta)) {
    abortarConfig(`No existe el fichero de configuración:\n  ${ruta}`);
  }

  let bruto;
  try {
    bruto = fs.readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '');
  } catch (e) {
    abortarConfig(`No se pudo leer el fichero de configuración:\n  ${ruta}\n  Detalle: ${e.message}`);
  }

  let datos;
  try {
    datos = JSON.parse(bruto);
  } catch (e) {
    abortarConfig(`El fichero de configuración no es un JSON válido:\n  ${ruta}\n  Detalle: ${e.message}`);
  }

  const token = typeof datos.token === 'string' ? datos.token.trim() : '';
  if (!token) {
    abortarConfig(`El fichero de configuración no tiene "token":\n  ${ruta}\n\n  Sin token el servidor rechazará todas las peticiones.`);
  }
  if (!datos.server) {
    abortarConfig(`El fichero de configuración no tiene "server":\n  ${ruta}`);
  }
  if (!datos.ytdlp) {
    abortarConfig(`El fichero de configuración no tiene "ytdlp" (ruta de yt-dlp.exe):\n  ${ruta}`);
  }
  if (!datos.download_dir) {
    abortarConfig(`El fichero de configuración no tiene "download_dir":\n  ${ruta}`);
  }

  const cfg = {
    rutaConfig: ruta,
    server: String(datos.server).trim(),
    token,
    ytdlp: String(datos.ytdlp),
    ffmpegDir: datos.ffmpeg_dir ? String(datos.ffmpeg_dir) : path.dirname(String(datos.ytdlp)),    downloadDir: String(datos.download_dir),
    pollSeconds: Number(datos.poll_seconds) > 0 ? Number(datos.poll_seconds) : 5,
      // Descargas simultaneas: 2 por defecto. Mas de 3 satura la linea y YouTube.
      maxParallel: Math.min(3, Math.max(1, Number(datos.max_parallel) > 0 ? Number(datos.max_parallel) : 2)),
      // Si el video no viene en h264 (1440p/2160p solo existen en VP9/AV1) se
      // convierte con ffmpeg para que sea un MP4 de verdad (Corel, Filmora).
      convertirH264: datos.convertir_h264 !== false,
    chunkMb: Number(datos.chunk_mb) > 0 ? Number(datos.chunk_mb) : 4,
    puertoLocal: Number(datos.puerto_local) > 0 ? Number(datos.puerto_local) : 8125,
    ytdlpVersion: typeof datos.ytdlp_version === 'string' ? datos.ytdlp_version : null,
    // Cookies (opcionales). `cookies_file` vale para cualquier web; Instagram
    // casi siempre exige sesion, asi que tiene sus propias claves:
    //   instagram_cookies : ruta a un cookies.txt exportado del navegador
    //   instagram_browser : navegador del que leer las cookies (chrome por defecto)
    cookiesFile: datos.cookies_file ? String(datos.cookies_file) : null,
    instagramCookies: datos.instagram_cookies ? String(datos.instagram_cookies) : null,
    // OJO: por defecto NO se leen cookies del navegador. En Chrome/Edge modernos
  // yt-dlp no puede abrir su base de datos («Could not copy Chrome cookie
  // database») y el error es fatal incluso para posts publicos. Solo se usa si
  // Antonio lo pone a proposito en la configuracion.
  instagramBrowser: datos.instagram_browser ? String(datos.instagram_browser) : null,
  };

  if (!fs.existsSync(cfg.ytdlp)) {
    abortarConfig(`No se encuentra el ejecutable de yt-dlp:\n  ${cfg.ytdlp}\n\n  Comprueba la clave "ytdlp" de ${ruta}`);
  }
  if (!fs.existsSync(cfg.ffmpegDir)) {
    abortarConfig(`No se encuentra la carpeta de ffmpeg:\n  ${cfg.ffmpegDir}\n\n  Comprueba la clave "ffmpeg_dir" de ${ruta}`);
  }

  try {
    fs.mkdirSync(cfg.downloadDir, { recursive: true });
  } catch (e) {
    abortarConfig(`No se pudo crear la carpeta de descargas:\n  ${cfg.downloadDir}\n  Detalle: ${e.message}`);
  }

  return cfg;
}

// ---------------------------------------------------------------------
// Capa HTTP (JSON con reintentos + backoff, serializada a 1 petición/s)
// ---------------------------------------------------------------------
function enCola(fn) {
  const resultado = colaHttp.then(fn);
  colaHttp = resultado.then(() => undefined, () => undefined);
  return resultado;
}

function esperarTurno() {
  const desde = Date.now() - ultimaPeticion;
  const espera = MS_MIN_ENTRE_PETICIONES - desde;
  if (espera > 0) return dormir(espera);
  return Promise.resolve();
}

async function leerJson(respuesta) {
  const texto = await respuesta.text();
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(`respuesta no JSON (HTTP ${respuesta.status}): ${recortar(texto, 200)}`);
  }
}

/**
 * Una única petición POST JSON (sin reintentos).
 */
async function peticionUnica(cuerpo, timeoutMs) {
  return enCola(async () => {
    await esperarTurno();
    ultimaPeticion = Date.now();
    const respuesta = await fetch(config.server, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Worker-Token': config.token,
      },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(timeoutMs ?? TIMEOUT_HTTP_MS),
    });
    const datos = await leerJson(respuesta);
    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}${datos && datos.error ? ` · ${datos.error}` : ''}`);
    }
    if (!datos || datos.success !== true) {
      throw new Error(`el servidor devolvió success!=true${datos && datos.error ? ` · ${datos.error}` : ''}`);
    }
    return datos;
  });
}

/**
 * Petición JSON con reintentos y backoff exponencial (2, 4, 8, 16, 32 s).
 */
async function peticion(cuerpo, { etiqueta = cuerpo.action, timeoutMs } = {}) {
  let ultimoError = null;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    if (parando) throw new Error('worker detenido');
    try {
      const datos = await peticionUnica(cuerpo, timeoutMs);
      if (intento > 1) logInfo(`[${etiqueta}] correcto en el intento ${intento}`);
      return datos;
    } catch (e) {
      ultimoError = e;
      const espera = BACKOFF_MS[Math.min(intento - 1, BACKOFF_MS.length - 1)];
      if (intento === MAX_INTENTOS) break;
      logAviso(`[${etiqueta}] intento ${intento}/${MAX_INTENTOS} fallido: ${e.message}. Reintento en ${espera / 1000} s`);
      await dormir(espera);
    }
  }
  throw new Error(`[${etiqueta}] agotados los ${MAX_INTENTOS} intentos: ${ultimoError ? ultimoError.message : 'error desconocido'}`);
}

/**
 * Subida de un trozo en multipart/form-data. Reintenta sin corromper nada:
 * cada trozo es independiente y va numerado (chunk_index).
 */
async function subirTrozo(job, itemIndex, chunkIndex, totalChunks, nombreFichero, buffer) {
  let ultimoError = null;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      return await enCola(async () => {
        await esperarTurno();
        ultimaPeticion = Date.now();

        const formulario = new FormData();
        formulario.append('action', 'upload_chunk');
        formulario.append('job_id', String(job.id));
        formulario.append('item_index', String(itemIndex));
        formulario.append('chunk_index', String(chunkIndex));
        formulario.append('total_chunks', String(totalChunks));
        formulario.append('filename', nombreFichero);
        formulario.append('chunk', new Blob([buffer]), nombreFichero);

        const respuesta = await fetch(config.server, {
          method: 'POST',
          headers: { 'X-Worker-Token': config.token },
          body: formulario,
          signal: AbortSignal.timeout(TIMEOUT_SUBIDA_MS),
        });
        const datos = await leerJson(respuesta);
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
        if (!datos || datos.success !== true) {
          throw new Error(`success!=true${datos && datos.error ? ` · ${datos.error}` : ''}`);
        }
        return datos;
      });
    } catch (e) {
      ultimoError = e;
      const espera = BACKOFF_MS[Math.min(intento - 1, BACKOFF_MS.length - 1)];
      if (intento === MAX_INTENTOS) break;
      logAviso(`[subida ${nombreFichero} trozo ${chunkIndex + 1}/${totalChunks}] intento ${intento}/${MAX_INTENTOS} fallido: ${e.message}. Reintento en ${espera / 1000} s`);
      await dormir(espera);
    }
  }
  throw new Error(`no se pudo subir el trozo ${chunkIndex + 1}/${totalChunks} de ${nombreFichero}: ${ultimoError ? ultimoError.message : 'error desconocido'}`);
}

// ---------------------------------------------------------------------
// Ejecución de procesos externos sin tuberías (descriptor → fichero)
// ---------------------------------------------------------------------
function dirTemporal() {
  const dir = path.join(os.tmpdir(), 'descargas-worker');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Ejecuta un proceso capturando su salida (stdout+stderr) en un fichero.
 * Devuelve { codigo, texto }. Si no se puede abrir el fichero, usa tuberías.
 */
function ejecutarCapturando(exe, args, { cwd = undefined, timeoutMs = 20_000 } = {}) {
  return new Promise((resolve) => {
    const rutaSalida = path.join(dirTemporal(), `captura-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.log`);
    let fd = null;
    let usarFichero = true;
    try {
      fd = fs.openSync(rutaSalida, 'a');
    } catch {
      usarFichero = false;
    }

    const opciones = {
      windowsHide: true,
      cwd,
      stdio: usarFichero ? ['ignore', fd, fd] : ['ignore', 'pipe', 'pipe'],
    };

    let hijo;
    try {
      hijo = spawn(exe, args, opciones);
    } catch (e) {
      if (fd !== null) { try { fs.closeSync(fd); } catch { /* nada */ } }
      resolve({ codigo: -1, texto: `no se pudo lanzar ${exe}: ${e.message}` });
      return;
    }
    if (fd !== null) { try { fs.closeSync(fd); } catch { /* nada */ } }

    let acumulado = '';
    const trozosSalida = [];
    if (!usarFichero) {
      hijo.stdout.on('data', (d) => { trozosSalida.push(d); });
      hijo.stderr.on('data', (d) => { trozosSalida.push(d); });
    }

    const temporizador = setTimeout(() => {
      try { hijo.kill(); } catch { /* nada */ }
    }, timeoutMs);

    const terminar = (codigo) => {
      clearTimeout(temporizador);
      if (usarFichero) {
        try { acumulado = decodificar(fs.readFileSync(rutaSalida)); } catch { /* nada */ }
        try { fs.rmSync(rutaSalida, { force: true }); } catch { /* nada */ }
      } else {
        acumulado = decodificar(Buffer.concat(trozosSalida));
      }
      resolve({ codigo, texto: acumulado });
    };

    hijo.on('error', (e) => {
      clearTimeout(temporizador);
      if (usarFichero) { try { fs.rmSync(rutaSalida, { force: true }); } catch { /* nada */ } }
      resolve({ codigo: -1, texto: `error al ejecutar ${exe}: ${e.message}` });
    });
    hijo.on('close', (codigo) => terminar(codigo === null ? -1 : codigo));
  });
}

async function detectarVersionYtDlp() {
  const { codigo, texto } = await ejecutarCapturando(config.ytdlp, ['--version'], { timeoutMs: 20_000 });
  const version = (texto || '').trim().split(/\r?\n/)[0].trim();
  if (codigo === 0 && /^[\d.]+$/.test(version)) return version;
  logAviso(`No se pudo detectar la versión de yt-dlp; se usará ${VERSION_YTDLP_POR_DEFECTO}`);
  return VERSION_YTDLP_POR_DEFECTO;
}

/** Duración en segundos de un fichero multimedia (ffmpeg -i). Mejor esfuerzo. */
async function duracionConFfmpeg(rutaFichero) {
  const ffmpeg = path.join(config.ffmpegDir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (!fs.existsSync(ffmpeg)) return 0;
  const { texto } = await ejecutarCapturando(ffmpeg, ['-hide_banner', '-i', rutaFichero], { timeoutMs: 20_000 });
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(texto || '');
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** ¿Sigue vivo ese PID? */
function procesoVivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e && e.code === 'EPERM'; // EPERM = existe pero sin permiso para señalizarlo
  }
}

/**
 * Mata el proceso y TODO su árbol.
 *
 * Muy importante en Windows: yt-dlp.exe es un ejecutable empaquetado con
 * PyInstaller, así que es un proceso RAÍZ que lanza un HIJO (y éste puede lanzar
 * ffmpeg). Si se mata primero el padre, el hijo queda huérfano y `taskkill /T`
 * ya no puede localizarlo: la descarga seguiría corriendo en segundo plano.
 * Por eso se usa taskkill /T /F de forma SÍNCRONA y se espera su resultado
 * ANTES de recurrir a cualquier otro método.
 */
function matarArbol(pid) {
  if (!pid) return true;
  let muerto = false;

  if (process.platform === 'win32') {
    for (let intento = 1; intento <= 3 && !muerto; intento++) {
      const r = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
        timeout: 20_000,
      });
      const detalle = r.error ? `error ${r.error.code || r.error.message}` : `código ${r.status}`;
      logDepurar(`taskkill /PID ${pid} /T /F (intento ${intento}): ${detalle}`);
      muerto = !procesoVivo(pid);
    }
  }

  if (!muerto) {
    // Último recurso: matar el proceso raíz directamente. Puede dejar huérfano
    // al hijo, así que solo se usa si taskkill no ha funcionado.
    logAviso(`taskkill no ha podido con el PID ${pid}; se intenta el cierre directo.`);
    try { if (hijoActual && hijoActual.pid === pid) hijoActual.kill('SIGKILL'); } catch { /* nada */ }
    muerto = !procesoVivo(pid);
  }

  if (muerto) logInfo(`Proceso ${pid} y su árbol detenidos.`);
  else logError(`No se ha podido confirmar la muerte del proceso ${pid}.`);
  return muerto;
}

// ---------------------------------------------------------------------
// Argumentos de yt-dlp
// ---------------------------------------------------------------------
function normalizarJob(job) {
  const id = job && job.id !== undefined && job.id !== null ? String(job.id) : null;
  if (!id) throw new Error('el trabajo recibido no tiene id');
  const url = String(job.url || '').trim();
  if (!/^https?:\/\//i.test(url)) throw new Error(`URL de trabajo no válida: ${recortar(url, 120)}`);

  const modo = job.mode === 'audio' ? 'audio' : 'video';
  let calidad = String(job.quality || 'best').toLowerCase();
  if (!CALIDADES.has(calidad)) calidad = 'best';
  let formato = String(job.format || (modo === 'audio' ? 'mp3' : 'mp4')).toLowerCase();
  if (modo === 'audio' && !FORMATOS_AUDIO.has(formato)) formato = 'mp3';
  if (modo === 'video' && !FORMATOS_VIDEO.has(formato)) formato = 'mp4';

  return {
    id, url, modo, calidad, formato,
    playlist: job.playlist === true,
    attempts: Number(job.attempts) || 0,
    // El servidor decide si este trabajo hay que subirlo a la web o dejarlo
    // solo en el PC (en casa y sin casilla marcada, se queda en el PC).
    subir: job.subir !== false,
    origen: job.origen === 'casa' ? 'casa' : 'fuera',
  };
}

/**
 * Traduce los fallos mas habituales de yt-dlp a algo que se entienda.
 * Lo que devuelve se antepone al log crudo en el error que ve el usuario: el
 * log de yt-dlp, solo, no le dice nada.
 */
function mensajeUtil(texto, url = '') {
  const t = String(texto || '');
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch (e) { /* sin url */ }
  const esInstagram = /(^|\.)instagram\.com$/.test(host) || host === 'instagr.am';
  const esTikTok = /(^|\.)tiktok\.com$/.test(host) || /(^|\.)tiktokv\.com$/.test(host);

  // Instagram: sin sesion no sirve casi nada y ademas limita por peticiones.
  if (esInstagram && /login required|rate-?limit|Please wait a few minutes|not available|empty media response/i.test(t)) {
    return 'Instagram no da este contenido sin sesion (o te ha limitado por muchas peticiones seguidas). Para que funcione: inicia sesion en Instagram desde el navegador, exporta las cookies con una extension (por ejemplo "Get cookies.txt LOCALLY") y guarda el fichero en el PC; despues pon su ruta en "instagram_cookies" dentro de .private/descargas-worker.json y reinicia el worker. Leer las cookies del navegador automaticamente no funciona con Chrome/Edge modernos.';
  }
  // TikTok: el video puede haberse borrado o estar restringido por pais.
  if (esTikTok && /unavailable|not available|item doesn.?t exist|status code 10204/i.test(t)) {
    return 'Ese video de TikTok ya no esta disponible (borrado, privado o restringido por pais).';
  }
  if (/HTTP Error 403/i.test(t)) {
    return 'YouTube ha bloqueado la descarga desde este PC (error 403). Casi siempre es temporal y pasa tras muchas peticiones seguidas: espera unos minutos y reintentalo. Si sigue igual, YouTube esta pidiendo una sesion: exporta las cookies del navegador a un cookies.txt y pon su ruta en "cookies_file" de la configuracion del worker.';
  }
  if (/Sign in to confirm you.?re not a bot/i.test(t)) {
    return 'YouTube exige comprobar que no eres un robot. Necesita cookies: exporta las del navegador a un cookies.txt y pon la ruta en "cookies_file" del worker.';
  }
  if (/Incomplete YouTube ID|looks truncated/i.test(t)) {
    return 'El enlace esta cortado: el identificador del video esta incompleto. Copia la direccion entera desde el navegador.';
  }
  if (/video (is )?(not )?unavailable|private video|this video is private|has been removed|removed by the uploader|no longer available|not available in your country/i.test(t)) {
    return 'El video no esta disponible: puede ser privado, estar borrado o restringido por pais.';
  }
  if (/age.?restricted|confirm your age/i.test(t)) {
    return 'El video tiene restriccion de edad: hace falta iniciar sesion (cookies).';
  }
  if (/Requested format is not available/i.test(t)) {
    return 'Esa calidad o formato no existe para este video. Prueba con la calidad "Mejor" y formato MP4.';
  }
  if (/Unable to download webpage|getaddrinfo|ENOTFOUND|Temporary failure in name resolution|timed out/i.test(t)) {
    return 'No se pudo conectar: revisa que el PC tenga internet y que el enlace siga vivo.';
  }
  if (/Unsupported URL/i.test(t)) {
    return 'Esa direccion no es de una web que yt-dlp sepa descargar.';
  }
  return 'La descarga fallo. Abajo tienes el detalle de yt-dlp: casi siempre el enlace no es valido o el video ya no esta.';
}

function construirArgumentos(job, dirJob) {
  const args = ['--newline', '--no-warnings', '--progress', '--no-color'];

  // Red social del enlace: Instagram y TikTok solo sirven un fichero ya montado
  // (mp4 con audio dentro), asi que no se les puede pedir "bestvideo+bestaudio"
  // ni forzar codecs: se baja el mejor fichero unico y punto.
  let host = '';
  try { host = new URL(job.url).hostname.toLowerCase(); } catch (e) { /* url rara */ }
  const esInstagram = /(^|\.)instagram\.com$/.test(host) || host === 'instagr.am';
  const esTikTok = /(^|\.)tiktok\.com$/.test(host) || /(^|\.)tiktokv\.com$/.test(host);
  const redSocial = esInstagram || esTikTok;

  // Carpeta de destino y plantilla de nombre
  args.push('-P', dirJob);
  args.push('-o', job.playlist
    ? '%(playlist_index)03d - %(title).150B [%(id)s].%(ext)s'
    : '%(title).150B [%(id)s].%(ext)s');

  if (job.modo === 'audio') {
    args.push('-x', '--audio-format', job.formato);
  } else if (redSocial) {
    args.push('-f', 'b');
    args.push('--merge-output-format', 'mp4');
  } else {
    const filtro = job.calidad === 'best'
      ? 'bv*+ba/b'
      : `bv*[height<=${job.calidad}]+ba/b[height<=${job.calidad}]/b`;
    args.push('-f', filtro);
    args.push('--merge-output-format', job.formato);
    if (job.formato === 'mp4') {
      const calidadAlta = job.calidad !== 'best' && Number(job.calidad) > 1080;
      if (calidadAlta) {
        // A 1440p y 2160p NO existe h264 en YouTube (solo VP9/AV1). Si se forzara
        // h264, yt-dlp bajaria 1080p y el usuario pediria 1440p para nada: se baja
        // la resolucion pedida y el worker la convierte luego a h264.
        args.push('-S', 'res,acodec:aac,ext:mp4:m4a');
      } else {
        // Compatibilidad con editores: H.264 + AAC dentro de MP4
        args.push('-S', 'vcodec:h264,acodec:aac,ext:mp4:m4a');
      }
    }
  }

  // Cookies opcionales. YouTube responde 403 o pide "confirma que no eres un
  // robot" cuando no le consta una sesion; con un cookies.txt exportado del
  // navegador se resuelve. Instagram va mas alla: sin sesion devuelve
  // "login required" casi siempre, asi que tiene sus propias claves.
  if (config.cookiesFile && fs.existsSync(config.cookiesFile)) {
    args.push('--cookies', config.cookiesFile);
  } else if (esInstagram) {
    if (config.instagramCookies && fs.existsSync(config.instagramCookies)) {
      args.push('--cookies', config.instagramCookies);
    } else if (config.instagramBrowser) {
      // Lee las cookies del navegador del PC (hay que tener la sesion abierta
      // en Instagram en ese navegador). No falla si el navegador esta cerrado.
      args.push('--cookies-from-browser', config.instagramBrowser);
    }
  }

  args.push('--ffmpeg-location', config.ffmpegDir);
  args.push('--force-overwrites');        // los reintentos no deben fallar
  args.push('--write-info-json');         // título y duración fiables (no se sube)
  args.push(job.playlist ? '--yes-playlist' : '--no-playlist');
  args.push(job.url);
  return args;
}

// ---------------------------------------------------------------------
// Analizador de la salida de yt-dlp
// ---------------------------------------------------------------------
const RE_PROGRESO_ESTANDAR = /^\[download\]\s+(?<pct>\d+(?:[.,]\d+)?)%\s+of\s+(?<total>~?\s*[\d.,]+\s*\S+?)(?:\s+at\s+(?<vel>\S+))?(?:\s+ETA\s+(?<eta>[\d:]+))?/i;
const RE_PROGRESO_PLANTILLA = /^@@PROG@@\|(?<pct>[^|]*)\|(?<vel>[^|]*)\|(?<eta>[^|]*)\|(?<titulo>[^|]*)\|(?<indice>[^|]*)\|(?<total>[^|]*)\|(?<etapa>[^|]*)$/;
const RE_DESTINO = /^\[download\]\s+Destination:\s*(.+)$/i;
const RE_ITEM = /^\[download\]\s+Downloading item\s+(\d+)\s+of\s+(\d+)/i;
const RE_PLAYLIST = /^\[download\]\s+Downloading playlist:\s*(.+)$/i;
const RE_MEZCLA = /^\[Merger\]\s+Merging formats into\s+"?(.+?)"?\s*$/i;
const RE_INFO_FORMATOS = /^\[info\]\s*(.+?):\s*Downloading \d+ format\(s\)/i;
const RE_POSTPROCESO = /^\[(Merger|ExtractAudio|VideoConvertor|VideoRemuxer|Fixup\w*|Metadata|EmbedThumbnail|SponsorBlock|FFmpeg\w*)\]/;

function tituloDesdeRuta(ruta) {
  const base = path.basename(String(ruta).trim().replace(/^"|"$/g, ''));
  let t = base.replace(/\.[A-Za-z0-9]{1,5}$/, '');
  t = t.replace(/\s*\[[A-Za-z0-9_-]{11}\]\s*$/, '');     // quita " [idDeYouTube]"
  t = t.replace(/^\d{3}\s*-\s*/, '');                    // quita "001 - " de playlists
  return t.trim() || base;
}

function limpiarNumero(valor) {
  const n = Number(String(valor ?? '').replace('%', '').replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}

function limpiarTexto(valor) {
  const t = String(valor ?? '').trim();
  return (!t || /^(n\/a|unknown|na|-)$/i.test(t)) ? '' : t;
}

// ---------------------------------------------------------------------
// Descarga con yt-dlp
// ---------------------------------------------------------------------
/**
 * Ejecuta yt-dlp para un trabajo.
 * Devuelve { codigo, cancelado, lineas, rutaLogYtDlp }.
 */
function ejecutarYtDlp(job, dirJob, { alProgreso }) {
  return new Promise((resolve) => {
    const rutaLogYtDlp = path.join(dirJob, '_ytdlp.log');
    const args = construirArgumentos(job, dirJob);

    logInfo(`yt-dlp ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);

    let fd = null;
    let usarFichero = true;
    try {
      fd = fs.openSync(rutaLogYtDlp, 'a');
    } catch (e) {
      usarFichero = false;
      logAviso(`No se pudo abrir el fichero de progreso (${e.code || e.message}); se usará el modo tubería.`);
    }

    const opciones = {
      cwd: dirJob,
      windowsHide: true,
      stdio: usarFichero ? ['ignore', fd, fd] : ['ignore', 'pipe', 'pipe'],
    };

    const hijo = spawn(config.ytdlp, args, opciones);
    hijoActual = hijo;
    hijosActivos.set(job.id, hijo);
    if (fd !== null) { try { fs.closeSync(fd); } catch { /* nada */ } }

    // ---- Estado del análisis ----
    const lineas = [];        // anillo con las últimas 200 líneas
    let restoBytes = Buffer.alloc(0); // bytes de la última línea aún incompleta
    let posLectura = 0;       // posición leída del fichero de progreso
    let fdLectura = null;
    let intervalo = null;
    let cancelado = false;

    if (usarFichero) {
      try { fdLectura = fs.openSync(rutaLogYtDlp, 'r'); } catch { fdLectura = null; }
    }

    const contexto = {
      titulo: '',
      itemIndex: 1,
      itemCount: 1,
      etapa: 'preparando',
      porcentaje: 0,
      velocidad: '',
      eta: '',
      ultimoEnvio: 0,
      ultimoConsola: 0,
    };

    function publicar(forzar = false, nuevaEtapa = null) {
      if (nuevaEtapa) contexto.etapa = nuevaEtapa;
      const ahora = Date.now();
      if (!forzar && ahora - contexto.ultimoEnvio < MS_MIN_ENTRE_PROGRESOS) return;
      contexto.ultimoEnvio = ahora;

      if (ahora - contexto.ultimoConsola >= MS_PROGRESO_CONSOLA || forzar) {
        contexto.ultimoConsola = ahora;
        const partes = [`${contexto.porcentaje.toFixed(1)}%`];
        if (contexto.velocidad) partes.push(contexto.velocidad);
        if (contexto.eta) partes.push(`ETA ${contexto.eta}`);
        if (contexto.itemCount > 1) partes.push(`elemento ${contexto.itemIndex}/${contexto.itemCount}`);
        consola(`  ${contexto.etapa} · ${partes.join(' · ')}${contexto.titulo ? ` · ${recortar(contexto.titulo, 60)}` : ''}`);
      }

      // No esperamos la respuesta: la descarga sigue mientras se informa.
      alProgreso({
        job_id: job.id,
        percent: Number(contexto.porcentaje.toFixed(1)),
        speed: contexto.velocidad,
        eta: contexto.eta,
        stage: contexto.etapa,
        title: contexto.titulo,
        item_index: contexto.itemIndex,
        item_count: contexto.itemCount,
      }).then((datos) => {
        if (datos && datos.cancel === true && !cancelado) {
          cancelado = true;
          logAviso('El servidor ha pedido CANCELAR el trabajo; matando yt-dlp.');
          consola('  El servidor ha pedido cancelar el trabajo. Deteniendo yt-dlp…');
          const detenido = matarArbol(hijo.pid);
          logInfo(`Cancelación: proceso yt-dlp ${detenido ? 'detenido con su árbol' : 'NO detenido'}.`);
        }
      }).catch((e) => {
        logAviso(`No se pudo enviar el progreso: ${e.message}`);
      });
    }

    function procesarLinea(lineaBruta) {
      const linea = lineaBruta.replace(/\u001b\[[0-9;]*m/g, '').replace(/\s+$/, '');
      if (!linea.trim()) return;

      lineas.push(linea);
      if (lineas.length > 200) lineas.shift();
      logDepurar(`yt-dlp> ${linea}`);

      // Plantilla de progreso opcional (@@PROG@@...)
      const mp = RE_PROGRESO_PLANTILLA.exec(linea);
      if (mp) {
        const pct = limpiarNumero(mp.groups.pct);
        if (pct !== null) contexto.porcentaje = Math.min(100, Math.max(0, pct));
        contexto.velocidad = limpiarTexto(mp.groups.vel);
        contexto.eta = limpiarTexto(mp.groups.eta);
        if (limpiarTexto(mp.groups.titulo)) contexto.titulo = limpiarTexto(mp.groups.titulo);
        const idx = limpiarNumero(mp.groups.indice);
        const tot = limpiarNumero(mp.groups.total);
        if (idx !== null && idx > 0) contexto.itemIndex = idx;
        if (tot !== null && tot > 0) contexto.itemCount = tot;
        publicar(false, 'descargando');
        return;
      }

      const mItem = RE_ITEM.exec(linea);
      if (mItem) {
        contexto.itemIndex = Number(mItem[1]) || 1;
        contexto.itemCount = Number(mItem[2]) || 1;
        contexto.porcentaje = 0;
        publicar(true, 'descargando');
        return;
      }

      const mPlaylist = RE_PLAYLIST.exec(linea);
      if (mPlaylist && !contexto.titulo) {
        contexto.titulo = String(mPlaylist[1]).trim();
        return;
      }

      const mDestino = RE_DESTINO.exec(linea);
      if (mDestino) {
        const t = tituloDesdeRuta(mDestino[1]);
        if (t) contexto.titulo = t;
        publicar(false, 'descargando');
        return;
      }

      const mMezcla = RE_MEZCLA.exec(linea);
      if (mMezcla) {
        const t = tituloDesdeRuta(mMezcla[1]);
        if (t) contexto.titulo = t;
        contexto.velocidad = '';
        contexto.eta = '';
        publicar(true, 'procesando');
        return;
      }

      if (RE_POSTPROCESO.test(linea)) {
        contexto.velocidad = '';
        contexto.eta = '';
        publicar(true, 'procesando');
        return;
      }

      const mProg = RE_PROGRESO_ESTANDAR.exec(linea);
      if (mProg) {
        const pct = limpiarNumero(mProg.groups.pct);
        if (pct !== null) contexto.porcentaje = Math.min(100, Math.max(0, pct));
        contexto.velocidad = limpiarTexto(mProg.groups.vel);
        contexto.eta = limpiarTexto(mProg.groups.eta);
        publicar(false, 'descargando');
        return;
      }

      const mInfo = RE_INFO_FORMATOS.exec(linea);
      if (mInfo && !contexto.titulo) {
        const posible = String(mInfo[1]).trim();
        if (!/^[A-Za-z0-9_-]{11}$/.test(posible)) contexto.titulo = posible;
        return;
      }

      if (/^\[download\]\s+100%/.test(linea)) {
        contexto.porcentaje = 100;
        publicar(true, 'descargando');
      }
    }

    /** Trocea por bytes (0x0A) y decodifica cada línea completa: soporta cp1252 y UTF-8. */
    function procesarBytes(bytes) {
      if (!bytes || !bytes.length) return;
      restoBytes = restoBytes.length ? Buffer.concat([restoBytes, bytes]) : Buffer.from(bytes);
      let idx;
      while ((idx = restoBytes.indexOf(0x0a)) !== -1) {
        const linea = decodificar(restoBytes.subarray(0, idx)).replace(/\r$/, '');
        restoBytes = restoBytes.subarray(idx + 1);
        procesarLinea(linea);
      }
    }

    /** Lee lo nuevo del fichero de progreso (síncrono: no se solapa consigo mismo). */
    function leerNuevo() {
      if (fdLectura === null) return;
      const buffer = Buffer.allocUnsafe(64 * 1024);
      for (;;) {
        let leidos = 0;
        try {
          leidos = fs.readSync(fdLectura, buffer, 0, buffer.length, posLectura);
        } catch {
          return;
        }
        if (!leidos) return;
        posLectura += leidos;
        procesarBytes(buffer.subarray(0, leidos));
      }
    }

    if (usarFichero) {
      intervalo = setInterval(leerNuevo, 400);
    } else {
      hijo.stdout.on('data', (d) => procesarBytes(d));
      hijo.stderr.on('data', (d) => procesarBytes(d));
      hijo.stdout.on('error', () => { /* nada */ });
      hijo.stderr.on('error', () => { /* nada */ });
    }

    const finalizar = (codigo) => {
      if (intervalo) clearInterval(intervalo);
      leerNuevo();                                  // último tramo
      if (restoBytes.length) {
        const ultima = decodificar(restoBytes).replace(/\r$/, '');
        restoBytes = Buffer.alloc(0);
        procesarLinea(ultima);
      }
      if (fdLectura !== null) { try { fs.closeSync(fdLectura); } catch { /* nada */ } }
      hijoActual = null;
      hijosActivos.delete(job.id);
      if (hijoActual && hijoActual.pid === hijo.pid) hijoActual = null;
      resolve({ codigo, cancelado, lineas, rutaLogYtDlp });
    };

    hijo.on('error', (e) => {
      lineas.push(`[error-worker] no se pudo ejecutar yt-dlp: ${e.message}`);
      finalizar(-1);
    });
    hijo.on('close', (codigo) => finalizar(codigo === null ? -1 : codigo));
  });
}

// ---------------------------------------------------------------------
// Ficheros resultantes
// ---------------------------------------------------------------------
function esFicheroSubible(nombre) {
  if (nombre.startsWith('_')) return false;                 // _ytdlp.log
  if (/\.(part|ytdl|temp|tmp|log)$/i.test(nombre)) return false;
  if (/\.info\.json$/i.test(nombre)) return false;          // metadatos de yt-dlp
  if (/\.(jpg|jpeg|png|webp)$/i.test(nombre)) return false; // miniaturas
  return true;
}

async function listarFicherosSubibles(dirJob) {
  const entradas = await fsp.readdir(dirJob, { withFileTypes: true });
  const lista = [];
  for (const entrada of entradas) {
    if (!entrada.isFile()) continue;
    if (!esFicheroSubible(entrada.name)) continue;
    const ruta = path.join(dirJob, entrada.name);
    let info;
    try { info = await fsp.stat(ruta); } catch { continue; }
    if (!info.size) continue;
    lista.push({
      nombre: entrada.name,
      ruta,
      bytes: info.size,
      ext: path.extname(entrada.name).slice(1).toLowerCase(),
    });
  }
  lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  return lista;
}

/** Lee los .info.json de yt-dlp para obtener título y duración exactos. */
async function leerMetadatos(dirJob) {
  const mapa = new Map();
  let entradas = [];
  try { entradas = await fsp.readdir(dirJob); } catch { return mapa; }
  for (const nombre of entradas) {
    if (!/\.info\.json$/i.test(nombre)) continue;
    try {
      const datos = JSON.parse(await fsp.readFile(path.join(dirJob, nombre), 'utf8'));
      mapa.set(nombre.replace(/\.info\.json$/i, ''), {
        titulo: typeof datos.title === 'string' ? datos.title : '',
        duracion: Number(datos.duration) || 0,
      });
    } catch { /* metadatos ilegibles: se ignora */ }
  }
  return mapa;
}

async function leerExacto(mango, buffer, posicion, longitud) {
  let leidos = 0;
  while (leidos < longitud) {
    const r = await mango.read(buffer, leidos, longitud - leidos, posicion + leidos);
    if (r.bytesRead === 0) break;
    leidos += r.bytesRead;
  }
  return leidos;
}

// ---------------------------------------------------------------------
// Subida completa de un fichero
// ---------------------------------------------------------------------
async function subirFichero(job, itemIndex, fichero, contexto, alProgreso) {
  const tamTrozo = Math.max(1, Math.round(config.chunkMb * 1024 * 1024));
  const totalTrozo = Math.max(1, Math.ceil(fichero.bytes / tamTrozo));
  const mango = await fsp.open(fichero.ruta, 'r');
  let ultimoEnvio = 0;
  try {
    for (let i = 0; i < totalTrozo; i++) {
      if (parando) throw new Error('worker detenido durante la subida');
      const longitud = Math.min(tamTrozo, fichero.bytes - i * tamTrozo);
      const buffer = Buffer.allocUnsafe(longitud);
      const leidos = await leerExacto(mango, buffer, i * tamTrozo, longitud);
      if (leidos !== longitud) throw new Error(`lectura incompleta del trozo ${i + 1} de ${fichero.nombre}`);

      await subirTrozo(job, itemIndex, i, totalTrozo, fichero.nombre, buffer);

      if (i === 0 || i === totalTrozo - 1 || i % 5 === 0) {
        logInfo(`Subido ${fichero.nombre}: trozo ${i + 1}/${totalTrozo}`);
      }
      const ahora = Date.now();
      if (ahora - ultimoEnvio >= MS_MIN_ENTRE_PROGRESOS) {
        ultimoEnvio = ahora;
        const pct = totalTrozo === 1 ? 100 : ((i + 1) / totalTrozo) * 100;
        alProgreso({
          job_id: job.id,
          percent: Number(pct.toFixed(1)),
          speed: '',
          eta: '',
          stage: 'subiendo',
          title: contexto.titulo,
          item_index: itemIndex,
          item_count: contexto.itemCount,
        }).catch(() => { /* el progreso nunca aborta la subida */ });
      }
    }
  } finally {
    await mango.close();
  }
  return totalTrozo;
}

/**
 * Informa al servidor de que un trabajo ha fallado.
 * Si el worker se está parando (Ctrl+C) NO se envía nada: no es un fallo del
 * trabajo, y el servidor lo reintentará por su cuenta.
 */
/**
 * ¿El fallo es de los que se arreglan solos en un rato? Un 403 puntual de YouTube,
 * un corte de red o un tiempo de espera agotado merecen reintentarse solos; un
 * video privado o un enlace cortado no.
 */
function esErrorTemporal(mensaje) {
  const t = String(mensaje || '');
  const definitivo = /no esta disponible|Private video|removed by|Unsupported URL|cortado|calidad o formato no existe|restriccion de edad|no se genero ningun fichero|sin salida de yt-dlp|URL no valida|identificador del video esta incompleto/i;
  if (definitivo.test(t)) {
    return false;
  }
  const temporal = /403|no eres un robot|not a bot|timed out|tiempo de espera|getaddrinfo|ENOTFOUND|ECONNRESET|ETIMEDOUT|429|Too Many Requests|conectar|interrump|se reinicio|temporal|fallo la descarga pl/i;
  return temporal.test(t);
}

async function informarFallo(job, mensaje) {
  if (parando) {
    logInfo('Parada en curso: no se envía "fail" (el servidor reintentará el trabajo).');
    return;
  }
  const reintentar = esErrorTemporal(mensaje);
  try {
    const respuesta = await peticion({
      action: 'fail',
      job_id: job && job.id,
      error: recortar(mensaje, 900),
      reintentar,
    }, { etiqueta: 'fail' });
    if (respuesta && respuesta.reintento) {
      logInfo(`Se reintentara solo (intento ${respuesta.reintento}) en ${respuesta.espera} s`);
      consola(`  Se reintentara solo en ${respuesta.espera} s (intento ${respuesta.reintento}).`);
    }
  } catch (e) {
    logError(`No se pudo informar del fallo: ${e.message}`);
  }
}

// ---------------------------------------------------------------------
// Procesamiento de un trabajo completo
// ---------------------------------------------------------------------
/* ── El fichero va SUELTO a la carpeta elegida ──────────────────────────── */

/**
 * Deja los ficheros descargados directamente en la carpeta elegida y borra la
 * carpeta de trabajo (donde yt-dlp deja el log y el .info.json).
 *
 * Antonio: «cuando se descarga el archivo se crea una carpeta nueva y tiene esos
 * 3 archivos y no los quiero así. el archivo debe alojarse solo y en la carpeta
 * seleccionada».
 */
function moverFicherosAlDestino(dirJob, ficheros) {
  const destino = config.downloadDir;
  const movidos = [];

  for (const fichero of ficheros) {
    let nombre = fichero.nombre;
    let final = path.join(destino, nombre);

    // Si ya existe uno con ese nombre NO se pisa: se numera.
    if (path.resolve(final) !== path.resolve(fichero.ruta) && fs.existsSync(final)) {
      const ext = path.extname(nombre);
      const base = nombre.slice(0, nombre.length - ext.length);
      let n = 2;
      do {
        nombre = `${base} (${n})${ext}`;
        final = path.join(destino, nombre);
        n += 1;
      } while (fs.existsSync(final) && n < 1000);
    }

    try {
      fs.renameSync(fichero.ruta, final);
    } catch (e) {
      // Volumenes distintos (un USB, por ejemplo): copiar y borrar el original.
      fs.copyFileSync(fichero.ruta, final);
      fs.unlinkSync(fichero.ruta);
    }

    const info = fs.statSync(final);
    movidos.push({
      ...fichero,
      nombre,
      ruta: final,
      bytes: info.size,
      ext: path.extname(nombre).slice(1).toLowerCase(),
    });
    logInfo(`Fichero movido a la carpeta elegida: ${final}`);
    consola(`  → ${nombre}`);
  }

  borrarCarpetaDeTrabajo(dirJob);
  return movidos;
}

/** Borra la carpeta temporal del trabajo (log, .info.json, restos). */
function borrarCarpetaDeTrabajo(dirJob) {
  try {
    fs.rmSync(dirJob, { recursive: true, force: true });
    logDepurar(`Carpeta de trabajo borrada: ${dirJob}`);
  } catch (e) {
    logAviso(`No se pudo borrar la carpeta de trabajo ${dirJob}: ${e.message}`);
  }
  // Y la base .descargas-tmp si se ha quedado vacia: la carpeta elegida queda
  // limpia del todo.
  try {
    const base = path.dirname(dirJob);
    if (path.basename(base) === '.descargas-tmp' && fs.readdirSync(base).length === 0) {
      fs.rmdirSync(base);
      logDepurar('Carpeta temporal .descargas-tmp eliminada (vacia)');
    }
  } catch (e) { /* si no esta o no se puede, da igual */ }
}

/* ── MP4 de verdad: convertir a h264 cuando no lo trae ──────────────────── */

function ffmpegExe() {
  return path.join(config.ffmpegDir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
}

/** Codec de video del fichero (h264, vp9, av01...). Cadena vacia si no se sabe. */
async function codecDeVideo(ruta) {
  const r = await ejecutarCapturando(ffmpegExe(), ['-hide_banner', '-i', ruta], { timeoutMs: 60_000 });
  const m = /Stream #\d+:\d+[^:]*: Video: ([A-Za-z0-9]+)/.exec(r.texto || '');
  if (!m) return '';
  const codec = m[1].toLowerCase();
  return (codec === 'avc1' || codec === 'h264') ? 'h264' : codec;
}

/**
 * Convierte un video a MP4 h264 (el formato que abren Corel y Filmora sin
 * problemas). 1440p y 2160p solo existen en VP9/AV1, asi que hay que recodificar.
 */
function convertirAH264(ruta, duracion, alPorcentaje) {
  return new Promise((resolve, reject) => {
    const ext = path.extname(ruta);
    const base = ruta.slice(0, ruta.length - ext.length);
    const salida = base + '.h264.mp4';
    const args = [
      '-y', '-hide_banner', '-loglevel', 'error', '-i', ruta,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      '-progress', 'pipe:1', '-nostats', salida,
    ];
    let hijo;
    try {
      hijo = spawn(ffmpegExe(), args, { windowsHide: true });
    } catch (e) {
      reject(e);
      return;
    }
    hijosActivos.set('conv:' + ruta, hijo);
    const terminar = (fn, valor) => {
      hijosActivos.delete('conv:' + ruta);
      fn(valor);
    };
    let resto = '';
    let ultimoAviso = 0;
    hijo.stdout.on('data', (trozo) => {
      resto += trozo.toString('utf8');
      const lineas = resto.split('\n');
      resto = lineas.pop() || '';
      for (const linea of lineas) {
        const m = /^out_time_us=(\d+)/.exec(linea.trim());
        if (!m || !(duracion > 0)) continue;
        const pct = Math.min(99, (Number(m[1]) / 1e6 / duracion) * 100);
        const ahora = Date.now();
        if (ahora - ultimoAviso > 900) {
          ultimoAviso = ahora;
          if (typeof alPorcentaje === 'function') alPorcentaje(pct);
        }
      }
    });
    hijo.stderr.on('data', (trozo) => logDepurar('ffmpeg> ' + trozo.toString('utf8').trim()));
    hijo.on('error', (e) => terminar(reject, new Error('no se pudo lanzar ffmpeg: ' + e.message)));
    hijo.on('close', (codigo) => {
      if (codigo === 0) terminar(resolve, salida);
      else terminar(reject, new Error('ffmpeg termino con codigo ' + codigo));
    });
  });
}

/* ── Buscar en YouTube para la web ──────────────────────────────────────── */

/**
 * Busca en YouTube con yt-dlp (`ytsearchN:consulta`) y devuelve los resultados al
 * servidor. Se hace en el PC a proposito: el hosting compartido no puede con los
 * bloqueos de YouTube y asi no hace falta clave de la API de YouTube.
 */
async function buscarEnYoutube(peticionBusqueda) {
  const idBusqueda = String(peticionBusqueda.id || '');
  const consulta = String(peticionBusqueda.q || '').trim();
  if (!consulta) {
    return;
  }
  logInfo(`Busqueda en YouTube: "${consulta}" (${idBusqueda})`);
  consola(`Buscando en YouTube: ${consulta}`);
  const args = [
    '--flat-playlist', '--dump-json', '--no-warnings', '--no-color',
    `ytsearch${10}:${consulta}`,
  ];
  try {
    const salida = await ejecutarCapturando(config.ytdlp, args, { timeoutMs: 90_000 });
    const resultados = [];
    for (const linea of String(salida.texto || '').split(/\r?\n/)) {
      const limpia = linea.trim();
      if (!limpia.startsWith('{')) continue;
      let datos;
      try { datos = JSON.parse(limpia); } catch { continue; }
      if (!datos || !datos.id) continue;
      const miniaturas = Array.isArray(datos.thumbnails) ? datos.thumbnails : [];
      const elegida = miniaturas.find((m) => Number(m.width) >= 320) || miniaturas[0] || {};
      resultados.push({
        id: String(datos.id),
        title: String(datos.title || 'Sin titulo'),
        url: 'https://www.youtube.com/watch?v=' + String(datos.id),
        duration: Math.round(Number(datos.duration) || 0),
        channel: String(datos.uploader || datos.channel || ''),
        thumbnail: String(elegida.url || ''),
      });
      if (resultados.length >= 12) break;
    }
    if (!resultados.length) {
      throw new Error('YouTube no devolvio resultados (o los bloqueo un momento)');
    }
    await peticion({
      action: 'search_results',
      id: idBusqueda,
      resultados,
    }, { etiqueta: 'search_results' });
    consola(`  ${resultados.length} resultado(s) enviados a la web.`);
    logInfo(`Busqueda ${idBusqueda}: ${resultados.length} resultados`);
  } catch (e) {
    logAviso(`Fallo la busqueda "${consulta}": ${e.message}`);
    consola(`  La busqueda fallo: ${recortar(e.message, 120)}`);
    await peticion({
      action: 'search_results',
      id: idBusqueda,
      resultados: [],
      error: e.message,
    }, { etiqueta: 'search_results' }).catch(() => {});
  }
}

async function procesarJob(jobBruto) {
  let job;
  try {
    job = normalizarJob(jobBruto);
  } catch (e) {
    logError(`Trabajo inválido: ${e.message}`);
    await informarFallo(jobBruto, `Trabajo inválido: ${e.message}`);
    return;
  }

  // La descarga se hace en una carpeta OCULTA y temporal dentro de la elegida:
  // asi no aparecen carpetas ni ficheros sueltos (log, .info.json) a la vista, y
  // al terminar el fichero se mueve arriba y la carpeta se borra.
  const dirTrabajoBase = path.join(config.downloadDir, '.descargas-tmp');
  const dirJob = path.join(dirTrabajoBase, job.id);
  await fsp.mkdir(dirJob, { recursive: true });
  try {
    spawnSync('attrib', ['+h', dirTrabajoBase], { windowsHide: true });
  } catch (e) { /* si no se puede ocultar, no pasa nada */ }

  consola(`Trabajo ${job.id} recibido: ${job.modo}/${job.calidad}/${job.formato}${job.playlist ? ' (lista)' : ''}${job.attempts ? ` · intento ${job.attempts}` : ''}`);
  consola(`  ${job.url}`);
  logInfo(`Trabajo ${job.id}: ${JSON.stringify(job)} · carpeta ${dirJob}`);

  const contexto = { titulo: '', itemCount: 1 };
  const alProgreso = (cuerpo) => peticion({ action: 'progress', ...cuerpo }, { etiqueta: 'progress' });

  // 1) Descarga
  const resultado = await ejecutarYtDlp(job, dirJob, { alProgreso });
  const cola = resultado.lineas.filter((l) => l.trim());

  if (resultado.cancelado) {
    consola(`Trabajo ${job.id} CANCELADO por el usuario.`);
    logAviso(`Trabajo ${job.id} cancelado por el usuario.`);
    borrarCarpetaDeTrabajo(dirJob);
    await informarFallo(job, 'Cancelado por el usuario');
    return;
  }

  if (resultado.codigo !== 0) {
    const resumen = cola.slice(-5).join(' | ') || `yt-dlp terminó con código ${resultado.codigo}`;
    logError(`Trabajo ${job.id} falló (código ${resultado.codigo}): ${resumen}`);
    consola(`Trabajo ${job.id} FALLÓ: ${recortar(resumen, 160)}`);
    borrarCarpetaDeTrabajo(dirJob);
    // Se antepone una explicacion en castellano: el log crudo de yt-dlp no le
    // dice nada al usuario y estos fallos se repiten.
    await informarFallo(job, `${mensajeUtil(resumen, job.url)} || yt-dlp código ${resultado.codigo}: ${resumen}`);
    return;
  }

  // 2) Ficheros obtenidos
  let ficheros = await listarFicherosSubibles(dirJob);
  if (!ficheros.length) {
    const resumen = cola.slice(-5).join(' | ') || 'sin salida de yt-dlp';
    logError(`Trabajo ${job.id}: yt-dlp terminó bien pero no hay ficheros. ${resumen}`);
    borrarCarpetaDeTrabajo(dirJob);
    await informarFallo(job, `No se generó ningún fichero. ${resumen}`);
    return;
  }

  const metadatos = await leerMetadatos(dirJob);

  // 2b) MP4 de verdad: 1440p y 2160p no existen en h264 (solo VP9/AV1), asi que
  // si el video no es h264 se recodifica para que Corel y Filmora lo abran bien.
  if (job.modo === 'video' && job.formato === 'mp4' && config.convertirH264) {
    for (const fichero of ficheros) {
      if (!/^\.(mp4|mkv|webm)$/i.test(path.extname(fichero.nombre))) continue;
      let codec = '';
      try {
        codec = await codecDeVideo(fichero.ruta);
      } catch (e) {
        logAviso(`No se pudo mirar el codec de ${fichero.nombre}: ${e.message}`);
      }
      if (!codec || codec === 'h264') continue;

      const metaConv = metadatos.get(fichero.nombre.replace(/\.[^.]+$/, '')) || null;
      let duracionConv = metaConv && metaConv.duracion ? metaConv.duracion : 0;
      if (!duracionConv) duracionConv = await duracionConFfmpeg(fichero.ruta);

      consola(`  Viene en ${codec.toUpperCase()}; convirtiendo a H.264 para editar (tarda un poco)...`);
      logInfo(`Convirtiendo a h264: ${fichero.nombre} (codec ${codec}, ${duracionConv}s)`);
      const aviso = (pct) => {
        alProgreso({
          job_id: job.id,
          percent: Number(pct.toFixed(1)),
          speed: '',
          eta: '',
          stage: 'convirtiendo',
          item_index: 1,
          item_count: ficheros.length,
        }).catch(() => { /* el progreso nunca debe romper la conversion */ });
      };

      try {
        const convertido = await convertirAH264(fichero.ruta, duracionConv, aviso);
        try { fs.unlinkSync(fichero.ruta); } catch { /* puede no estar */ }
        const nombreFinal = path.basename(fichero.ruta, path.extname(fichero.ruta)) + '.mp4';
        const rutaFinal = path.join(dirJob, nombreFinal);
        fs.renameSync(convertido, rutaFinal);
        const infoFinal = fs.statSync(rutaFinal);
        fichero.ruta = rutaFinal;
        fichero.nombre = nombreFinal;
        fichero.bytes = infoFinal.size;
        fichero.ext = 'mp4';
        consola(`  Convertido a H.264: ${nombreFinal} (${(infoFinal.size / 1048576).toFixed(1)} MiB)`);
        logInfo(`Conversion terminada: ${nombreFinal} (${infoFinal.size} bytes)`);
      } catch (e) {
        // Si falla la conversion se queda el original: es mejor un VP9 que nada.
        logAviso(`No se pudo convertir ${fichero.nombre} a h264: ${e.message}`);
        consola(`  Aviso: no se pudo convertir a H.264 (${recortar(e.message, 80)}); se queda el original.`);
      }
    }
  }

  // El fichero, SUELTO en la carpeta elegida; la carpeta de trabajo se borra.
  // Los metadatos se leen antes (el .info.json vive en esa carpeta).
  ficheros = ficheros.map((f) => ({
    ...f,
    meta: metadatos.get(f.nombre.replace(/\.[^.]+$/, '')) || null,
  }));
  ficheros = moverFicherosAlDestino(dirJob, ficheros);
  contexto.itemCount = ficheros.length;
  consola(`Descarga terminada: ${ficheros.length} fichero(s) en ${config.downloadDir}.`);

  // 3) Subida por trozos + item_done (en orden)… o nada, si va solo al PC.
  if (job.subir === false) {
    // El fichero se queda donde yt-dlp lo ha dejado: no se sube ni un byte a
    // internet. Solo se registra su ruta para que aparezca en la cola y en el
    // historial y Antonio sepa donde esta.
    consola(`Descarga terminada: ${ficheros.length} fichero(s). Se quedan en el PC (no se suben).`);
    logInfo(`Trabajo ${job.id}: subida omitida (origen ${job.origen}). Carpeta: ${dirJob}`);

    for (let i = 0; i < ficheros.length; i++) {
      const fichero = ficheros[i];
      const itemIndex = i + 1;
      const meta = fichero.meta || null;
      const titulo = (meta && meta.titulo) || tituloDesdeRuta(fichero.nombre) || fichero.nombre;
      let duracion = meta && meta.duracion ? meta.duracion : 0;
      if (!duracion) {
        duracion = await duracionConFfmpeg(fichero.ruta);
      }
      contexto.titulo = titulo;

      await peticion({
        action: 'item_local',
        job_id: job.id,
        item_index: itemIndex,
        filename: fichero.nombre,
        title: titulo,
        bytes: fichero.bytes,
        ext: fichero.ext,
        duration: Number(duracion.toFixed(3)),
        ruta_local: fichero.ruta,
      }, { etiqueta: 'item_local' });

      logInfo(`item_local enviado: ${fichero.nombre}`);
      consola(`  En el PC ${itemIndex}/${ficheros.length}: ${fichero.nombre} (${(fichero.bytes / 1048576).toFixed(2)} MiB)`);
    }
  } else {
    for (let i = 0; i < ficheros.length; i++) {
      const fichero = ficheros[i];
      const itemIndex = i + 1;
      const meta = fichero.meta || null;
      const titulo = (meta && meta.titulo) || tituloDesdeRuta(fichero.nombre) || fichero.nombre;
      let duracion = meta && meta.duracion ? meta.duracion : 0;
      if (!duracion) {
        duracion = await duracionConFfmpeg(fichero.ruta);
      }
      contexto.titulo = titulo;

      consola(`  Subiendo ${itemIndex}/${ficheros.length}: ${fichero.nombre} (${(fichero.bytes / 1048576).toFixed(2)} MiB)`);
      logInfo(`Subiendo ${fichero.nombre} (${fichero.bytes} bytes, duración ${duracion}s)`);

      const totalTrozo = await subirFichero(job, itemIndex, fichero, contexto, alProgreso);

      await peticion({
        action: 'item_done',
        job_id: job.id,
        item_index: itemIndex,
        filename: fichero.nombre,
        title: titulo,
        bytes: fichero.bytes,
        ext: fichero.ext,
        duration: Number(duracion.toFixed(3)),
      }, { etiqueta: 'item_done' });

      logInfo(`item_done enviado: ${fichero.nombre} (${totalTrozo} trozos)`);
      consola(`  Elemento ${itemIndex} completado (${totalTrozo} trozo(s)).`);
    }
  }

  // 4) finish
  const logTail = cola.slice(-20).join('\n');
  await peticion({
    action: 'finish',
    job_id: job.id,
    item_count: ficheros.length,
    log_tail: recortar(logTail, 4000),
  }, { etiqueta: 'finish' });

  logInfo(`Trabajo ${job.id} terminado correctamente (${ficheros.length} fichero/s)`);
  consola(`Trabajo ${job.id} TERMINADO correctamente (${ficheros.length} fichero/s).`);
}

/**
 * «Traer a la web»: sube un fichero que ya esta en el PC porque el usuario lo
 * ha pedido desde la web. Se sube por trozos y se cierra con item_done + el
 * item_id, para que el servidor ACTUALICE la ficha en vez de crear otra.
 */
async function subirPedido(pedido) {
  const ruta = String(pedido.ruta_local || '');
  const etiqueta = `subida pedida ${pedido.item_id}`;
  logInfo(`Peticion de traer a la web: ${ruta}`);

  if (!ruta || !fs.existsSync(ruta)) {
    logError(`No encuentro el fichero local: ${ruta}`);
    await peticion({
      action: 'subida_fallida',
      job_id: pedido.job_id,
      item_id: pedido.item_id,
      error: 'El fichero ya no esta en el PC: ' + ruta,
    }, { etiqueta }).catch(() => {});
    return;
  }

  const stat = fs.statSync(ruta);
  const fichero = {
    ruta,
    nombre: path.basename(ruta),
    bytes: stat.size,
    ext: (path.extname(ruta).replace('.', '') || 'bin').toLowerCase(),
  };
  const contexto = { jobId: pedido.job_id, itemCount: 1, itemIndex: 1, titulo: pedido.title || fichero.nombre };

  try {
    consola(`Subiendo a la web: ${fichero.nombre} (${(fichero.bytes / 1048576).toFixed(2)} MiB)`);
    // El callback de progreso no puede ser null: subirFichero lo llama siempre.
    // Debe devolver una promesa: subirFichero encadena .catch() al resultado.
    const sinProgreso = () => Promise.resolve();
    const trozos = await subirFichero({ id: pedido.job_id }, pedido.item_index || 1, fichero, contexto, sinProgreso);
    await peticion({
      action: 'item_done',
      job_id: pedido.job_id,
      item_id: pedido.item_id,
      item_index: pedido.item_index || 1,
      filename: fichero.nombre,
      title: pedido.title || fichero.nombre,
      bytes: fichero.bytes,
      ext: fichero.ext,
      duration: Number(pedido.duration) || 0,
    }, { etiqueta: 'item_done' });
    logInfo(`Traido a la web: ${fichero.nombre} (${trozos} trozos)`);
    consola(`  En la web: ${fichero.nombre}`);
  } catch (e) {
    logError(`Fallo al traer a la web ${fichero.nombre}: ${e.message}`);
    await peticion({
      action: 'subida_fallida',
      job_id: pedido.job_id,
      item_id: pedido.item_id,
      error: e.message,
    }, { etiqueta }).catch(() => {});
  }
}
// ---------------------------------------------------------------------
// Bucle principal
// ---------------------------------------------------------------------
function pararLimpiamente(motivo) {
  if (parando) return;
  parando = true;
  consola('');
  consola(`Parando el worker (${motivo})…`);
  logInfo(`Parada solicitada: ${motivo}`);
  if (temporizadorHeartbeat) clearInterval(temporizadorHeartbeat);
  if (servidorLocal) {
    try { servidorLocal.close(); } catch (e) { /* da igual al cerrar */ }
  }
  for (const [idJob, proceso] of hijosActivos) {
    if (proceso && proceso.pid) {
      consola('  Matando la descarga en curso (' + idJob + ')…');
      matarArbol(proceso.pid);
    }
  }
  hijosActivos.clear();

  setTimeout(() => {
    logInfo('Worker detenido.');
    process.exit(0);
  }, 700);
}

async function principal() {
  // Modo de diagnostico: imprime la orden de yt-dlp que se lanzaria y no descarga
  // nada. Sirve para comprobar de un vistazo como se trata cada web (YouTube,
  // Instagram, TikTok...).
  //   node worker.mjs --args <url> [--modo video|audio] [--calidad best|1080] [--formato mp4|mp3]
  const iArgs = process.argv.indexOf('--args');
  if (iArgs !== -1) {
    const url = process.argv[iArgs + 1];
    if (!url) {
      console.error('Uso: node worker.mjs --args <url> [--modo video|audio] [--calidad best|2160|1080|720...] [--formato mp4|mp3|m4a]');
      process.exit(2);
    }
    const leerOpcion = (nombre, defecto) => {
      const i = process.argv.indexOf('--' + nombre);
      return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : defecto;
    };
    config = cargarConfig();
    const job = normalizarJob({
      id: 'diagnostico',
      url,
      mode: leerOpcion('modo', 'video'),
      quality: leerOpcion('calidad', 'best'),
      format: leerOpcion('formato', 'mp4'),
    });
    const args = construirArgumentos(job, path.join(config.downloadDir, job.id));
    console.log(args.map((a) => (/\s/.test(a) ? '"' + a + '"' : a)).join(' '));
    process.exit(0);
  }

  prepararLog();

  config = cargarConfig();
  versionYtDlp = config.ytdlpVersion || await detectarVersionYtDlp();

  consola('==============================================================');
  consola(` Worker local de descargas ${VERSION_WORKER}  ·  ${NOMBRE_WORKER}`);
  consola('==============================================================');
  consola(` Servidor    : ${config.server}`);
  consola(` yt-dlp      : ${config.ytdlp} (${versionYtDlp})`);
  consola(` ffmpeg      : ${config.ffmpegDir}`);
  consola(` Descargas   : ${config.downloadDir}`);
  consola(` Config      : ${config.rutaConfig}`);
  consola(` Log         : ${RUTA_LOG}`);
  consola(` Sondeo      : cada ${config.pollSeconds} s · trozos de ${config.chunkMb} MiB`);
  consola(' Pulsa Ctrl+C para detenerlo.');
  consola('');

  logInfo(`Arranque del worker ${VERSION_WORKER} (yt-dlp ${versionYtDlp}) · config ${config.rutaConfig}`);

  process.on('SIGINT', () => pararLimpiamente('Ctrl+C'));
  process.on('SIGBREAK', () => pararLimpiamente('Ctrl+Pausa'));
  process.on('SIGHUP', () => pararLimpiamente('cierre de consola'));

  // Heartbeat cada 30 s, independiente del bucle de sondeo.
  const latido = async () => {
    if (parando) return;
    try {
      const respuesta = await peticion({
        action: 'heartbeat',
        worker: NOMBRE_WORKER,
        version: VERSION_WORKER,
        ytdlp: versionYtDlp,
        download_dir: config.downloadDir,
        unidades: listarUnidades(),
      }, { etiqueta: 'heartbeat' });
      logDepurar('heartbeat enviado');
      // El servidor puede pedir cambiar la carpeta de descarga (por ejemplo a un
      // USB). La aplica el worker, que es quien ve el disco del PC.
      if (respuesta && respuesta.cambiar_dir) {
        await aplicarCambioDeCarpeta(String(respuesta.cambiar_dir));
      }
      // El explorador NO se espera aqui: puede tardar minutos y el latido tiene
      // que seguir vivo (si no, el servidor creeria que el worker se cayo).
      if (respuesta && respuesta.abrir_dialogo) {
        pedirCarpetaConDialogo().catch((e) => logAviso(`Fallo el explorador de carpetas: ${e.message}`));
      }
    } catch (e) {
      logAviso(`Heartbeat fallido: ${e.message}`);
    }
  };
  await latido();
  temporizadorHeartbeat = setInterval(latido, MS_HEARTBEAT);

  // Puerto local: la web lo consulta para saber si se abre desde ESTE PC.
  servidorLocal = arrancarServidorLocal();

  // Bucle de trabajo: hasta `max_parallel` descargas a la vez. Solo se pide
  // trabajo cuando hay hueco, para no reclamar algo que no se puede empezar.
  const trabajosActivos = new Set();
  while (!parando) {
    try {
      if (trabajosActivos.size >= config.maxParallel) {
        await dormir(1000);
        continue;
      }

      const respuesta = await peticion({ action: 'next' }, { etiqueta: 'next' });
      const job = respuesta.job;

      // El boton «elegir carpeta» de la web pide abrir el explorador en el PC.
      // Viaja por aqui (sondeo cada 5 s) para que el dialogo salga enseguida.
      // OJO: NO se puede hacer `continue` despues. El servidor ya ha marcado el
      // trabajo como "running" al entregarlo, asi que si se descarta aqui se
      // queda colgado para siempre (pasaba cuando coincidian las dos cosas).
      if (respuesta && respuesta.abrir_dialogo) {
        pedirCarpetaConDialogo().catch((e) => logAviso(`Fallo el explorador de carpetas: ${e.message}`));
      }

      // Los «traer a la web» pendientes se atienden en segundo plano: no deben
      // parar la cola.
      // Busquedas de YouTube pedidas desde la web (en segundo plano).
      const busquedas = Array.isArray(respuesta.busquedas) ? respuesta.busquedas : [];
      for (const busqueda of busquedas) {
        buscarEnYoutube(busqueda).catch((e) => logAviso('Fallo la busqueda: ' + e.message));
      }

      const pedidos = Array.isArray(respuesta.subidas) ? respuesta.subidas : [];
      for (const pedido of pedidos) {
        subirPedido(pedido).catch((e) => logAviso(`Fallo trayendo a la web ${pedido.item_id}: ${e.message}`));
      }

      if (!job) {
        logDepurar('sin trabajo disponible');
        await dormir(config.pollSeconds * 1000);
        continue;
      }

      trabajosActivos.add(job.id);
      logInfo(`Trabajos en curso: ${trabajosActivos.size}/${config.maxParallel}`);
      procesarJob(job)
        .catch(async (e) => {
          logError(`Error procesando el trabajo ${job && job.id}: ${e.message}`);
          consola(`ERROR en el trabajo ${job && job.id}: ${recortar(e.message, 200)}`);
          await informarFallo(job, e.message);
        })
        .finally(() => {
          trabajosActivos.delete(job.id);
          hijosActivos.delete(job.id);
        });

      // Pequena pausa para no encadenar peticiones sin respiro.
      await dormir(150);
    } catch (e) {
      logError(`Error en el bucle principal: ${e.message}`);
      await dormir(config.pollSeconds * 1000);
    }
  }
}

principal().catch((e) => {
  logError(`Error fatal: ${e && e.stack ? e.stack : e}`);
  console.error('');
  console.error(`  Error fatal del worker: ${e && e.message ? e.message : e}`);
  console.error(`  Revisa el log: ${RUTA_LOG}`);
  console.error('');
  process.exit(1);
});

// Red de seguridad: nunca dejar un yt-dlp huérfano.
// matarArbol es síncrono (taskkill /T /F), así que puede usarse aquí.
process.on('exit', () => {
  for (const proceso of hijosActivos.values()) {
    if (proceso && proceso.pid) matarArbol(proceso.pid);
  }
  hijosActivos.clear();
});
