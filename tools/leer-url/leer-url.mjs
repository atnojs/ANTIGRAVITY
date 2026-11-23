#!/usr/bin/env node
/**
 * leer-url — lee una URL y devuelve su texto para que el agente lo analice.
 *
 *   node tools/leer-url/leer-url.mjs <url> [opciones]
 *
 * Qué sabe leer:
 *   · YouTube        → subtítulos (español manual, luego automático, luego inglés).
 *                      Usa la API interna con cliente ANDROID y parsea el XML srv3
 *                      (format=3), que es lo que devuelve el `baseUrl` de la pista.
 *                      json3 sigue funcionando, pero el `baseUrl` ya trae fmt=srv3 y
 *                      añadir otro `fmt=` al final no lo cambia: por eso se parsea srv3.
 *   · GitHub         → README del repositorio (y metadatos: estrellas, licencia, push).
 *   · Cualquier web  → texto principal de la página.
 *
 * Opciones:
 *   --max N        tope de caracteres devueltos (40.000; 60.000 en vídeo)
 *   --json         salida JSON {ok, url, tipo, fuente, chars, texto, extra}
 *   --out RUTA     guarda el texto en un fichero y devuelve solo ruta y recuento
 *   --no-cache     ignora la caché local (7 días en %LOCALAPPDATA%\leer-url\cache)
 *   --ayuda        esta ayuda
 *
 * Códigos de salida: 0 bien · 2 sin texto · 3 red o HTTP · 4 URL no válida o privada
 *                    5 no se pudo escribir el fichero de --out.
 *
 * Límites de red: 9 s por petición, 20 s en total, sin reintentar timeouts.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';

const AYUDA = `leer-url — lee una URL y devuelve su texto para analizarla.

Uso:
  node leer-url.mjs <url> [opciones]

Opciones:
  --max N        tope de caracteres (40.000; 60.000 en vídeo)
  --json         salida JSON {ok, url, tipo, fuente, chars, texto, extra}
  --out RUTA     guarda el texto en un fichero y devuelve ruta y recuento
  --no-cache     ignora la caché local (7 días)
  --ayuda        muestra esta ayuda

Códigos de salida:
  0 bien · 2 sin texto · 3 red o HTTP · 4 URL no válida o privada · 5 error de escritura

Límites: 9 s por petición, 20 s en total. No sigue redirecciones a red privada.
`;

const UA_NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const UA_ANDROID = 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip';
const UA_IOS = 'com.google.ios.youtube/20.10.1 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)';

const TIMEOUT_PETICION = 9000;
const DEADLINE_TOTAL = 20000;
const inicio = Date.now();

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--ayuda') || args.includes('-h') || args.includes('--help')) {
  console.log(AYUDA);
  process.exit(0);
}

function opcion(nombre, porDefecto = null) {
  const i = args.indexOf(nombre);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : porDefecto;
}

const urlCruda = args.find((a) => !a.startsWith('--') && a !== opcion('--max') && a !== opcion('--out'));
const json = args.includes('--json');
const sinCache = args.includes('--no-cache');
const rutaSalida = opcion('--out');

function fallar(mensaje, codigo = 3) {
  if (json) console.log(JSON.stringify({ ok: false, error: mensaje }, null, 2));
  else console.error('ERROR: ' + mensaje);
  process.exit(codigo);
}

/* ── URL, DNS y red ─────────────────────────────────────────── */

function analizarUrl(entrada) {
  if (!entrada) fallar('Falta la URL. Uso: leer-url.mjs <url>', 4);
  const conEsquema = /^https?:\/\//i.test(entrada) ? entrada : 'https://' + entrada;
  let u;
  try { u = new URL(conEsquema); } catch { fallar('URL no válida: ' + entrada, 4); }
  if (!/^https?:$/.test(u.protocol)) fallar('Sólo se leen enlaces http o https.', 4);
  if (!u.hostname.includes('.')) fallar('Eso no parece una URL: falta el dominio (ejemplo.com).', 4);
  return u;
}

/** ¿Es una dirección de red privada, local o reservada? IPv4 e IPv6. */
function esIpPrivada(ip) {
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true;                        // multicast y reservadas
    return false;
  }
  const ip6 = String(ip).toLowerCase();
  if (ip6 === '::' || ip6 === '::1') return true;
  if (/^f[cd][0-9a-f]{2}:/.test(ip6)) return true;   // ULA fc00::/7
  if (/^fe[89ab][0-9a-f]?:/.test(ip6)) return true;  // link-local fe80::/10
  if (ip6.startsWith('::ffff:')) {
    const resto = ip6.slice(7);
    if (resto.includes('.')) return esIpPrivada(resto);
    // ::ffff:7f00:1 → 127.0.0.1
    const hex = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(resto);
    if (hex) {
      const alto = parseInt(hex[1], 16);
      const bajo = parseInt(hex[2], 16);
      return esIpPrivada([alto >> 8, alto & 255, bajo >> 8, bajo & 255].join('.'));
    }
  }
  return false;
}

const NOMBRES_VETADOS = /^(localhost|metadata\.google\.internal|metadata\.goog|instance-data)$/i;

/** Comprueba el destino resolviendo DNS: un alias a 127.0.0.1 también cuenta. */
async function comprobarDestino(u) {
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (NOMBRES_VETADOS.test(host)) fallar('Esa dirección es local o de metadatos; no la leo.', 4);

  // Si ya es una IP, se comprueba tal cual.
  if (esIpPrivada(host)) fallar('Esa dirección es de red privada o local; no la leo.', 4);

  let direcciones = [];
  try {
    direcciones = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    fallar('El dominio no resuelve: ' + host, 3);
  }
  if (!direcciones.length) fallar('El dominio no resuelve: ' + host, 3);
  for (const d of direcciones) {
    if (esIpPrivada(d.address)) {
      fallar('Ese dominio apunta a una red privada (' + d.address + '); no la leo.', 4);
    }
  }
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const queda = () => DEADLINE_TOTAL - (Date.now() - inicio);

async function pedir(url, opciones = {}, intentos = 2) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    const ms = Math.min(TIMEOUT_PETICION, queda());
    if (ms <= 500) {
      fallar('Se agotó el tiempo de espera (' + Math.round(DEADLINE_TOTAL / 1000) + ' s).');
    }
    try {
      return await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(ms), ...opciones });
    } catch (e) {
      ultimo = e;
      const esTiempo = e && (e.name === 'TimeoutError' || e.name === 'AbortError' || /timeout|tiempo/i.test(e.message));
      if (esTiempo) break; // un timeout no se reintenta: es el techo, no un fallo pasajero
      await dormir(300 + i * 400);
    }
  }
  const motivo = (ultimo && ultimo.cause && ultimo.cause.code) || (ultimo && ultimo.name) || 'sin respuesta';
  if (/Timeout/i.test(String(motivo)) || (ultimo && ultimo.name === 'TimeoutError')) {
    fallar('La página no respondió en ' + Math.round(TIMEOUT_PETICION / 1000) + ' s (tiempo agotado).');
  }
  fallar('No se pudo conectar: ' + motivo + '.');
}

function decodificar(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function limpiar(texto, max) {
  let t = texto.replace(/\s+/g, ' ').trim();
  if (t.length > max) t = t.slice(0, max);
  return t;
}

/* ── caché ───────────────────────────────────────────────────── */

const CACHE_VERSION = 'v2'; // cambiar al tocar extracción o seguridad: invalida lo cacheado

function rutaCache(clave) {
  const dir = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'leer-url', 'cache');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, crypto.createHash('sha1').update(CACHE_VERSION + ':' + clave).digest('hex') + '.json');
}

function leerCache(clave) {
  if (sinCache) return null;
  try {
    const f = rutaCache(clave);
    if (!fs.existsSync(f)) return null;
    const dato = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (Date.now() - dato.guardado > 7 * 24 * 3600 * 1000) return null;
    return dato.resultado;
  } catch { return null; }
}

function guardarCache(clave, resultado) {
  try { fs.writeFileSync(rutaCache(clave), JSON.stringify({ guardado: Date.now(), resultado }), 'utf8'); } catch { /* da igual */ }
}

/* ── YouTube ─────────────────────────────────────────────────── */

const CLIENTES_YT = [
  { nombre: 'ANDROID', ua: UA_ANDROID, ctx: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 30, hl: 'es', gl: 'ES' } },
  { nombre: 'IOS', ua: UA_IOS, ctx: { clientName: 'IOS', clientVersion: '20.10.1', deviceModel: 'iPhone16,2', hl: 'es', gl: 'ES' } },
  { nombre: 'WEB', ua: UA_NAVEGADOR, ctx: { clientName: 'WEB', clientVersion: '2.20241120.00.00', hl: 'es', gl: 'ES' } }
];

function idDeYoutube(u) {
  if (/(^|\.)youtu\.be$/.test(u.hostname)) return u.pathname.slice(1).split('/')[0];
  if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
  return u.searchParams.get('v') || '';
}

async function reproductor(id, cliente) {
  const r = await pedir('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': cliente.ua, 'Accept-Language': 'es-ES,es;q=0.9' },
    body: JSON.stringify({ context: { client: cliente.ctx }, videoId: id, contentCheckOk: true, racyCheckOk: true })
  });
  if (!r.ok) return { estado: 'HTTP ' + r.status, pistas: [] };
  const j = await r.json().catch(() => null);
  if (!j) return { estado: 'respuesta no JSON', pistas: [] };
  return {
    estado: (j.playabilityStatus && j.playabilityStatus.status) || '?',
    motivo: (j.playabilityStatus && j.playabilityStatus.reason) || '',
    pistas: (j.captions && j.captions.playerCaptionsTracklistRenderer && j.captions.playerCaptionsTracklistRenderer.captionTracks) || []
  };
}

/** El XML de YouTube (srv3) trae el texto en <p t="…" d="…">…</p>; el antiguo, en <text>. */
function textoDeSubtitulo(xml) {
  const parrafos = [...xml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
  if (parrafos.length) return decodificar(parrafos.join(' '));
  const textos = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]);
  return decodificar(textos.join(' '));
}

async function leerYoutube(u, max) {
  const id = idDeYoutube(u);
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) fallar('No reconozco el identificador del vídeo en esa URL.', 4);

  let ultimo = '';
  for (const cliente of CLIENTES_YT) {
    let datos;
    try { datos = await reproductor(id, cliente); } catch (e) { ultimo = e.message; continue; }
    if (!datos.pistas.length) {
      ultimo = datos.estado + (datos.motivo ? ' · ' + datos.motivo : '');
      continue;
    }
    const pista =
      datos.pistas.find((p) => (p.languageCode || '').startsWith('es') && p.kind !== 'asr') ||
      datos.pistas.find((p) => (p.languageCode || '').startsWith('es')) ||
      datos.pistas.find((p) => (p.languageCode || '').startsWith('en')) ||
      datos.pistas[0];

    const r = await pedir(pista.baseUrl, { headers: { 'User-Agent': cliente.ua, 'Accept-Language': 'es-ES,es;q=0.9' } });
    if (!r.ok) { ultimo = 'subtítulo HTTP ' + r.status; continue; }
    const xml = await r.text();
    const texto = limpiar(textoDeSubtitulo(xml), max);
    if (texto.length < 40) { ultimo = 'subtítulo vacío (' + xml.length + ' B)'; continue; }

    const idioma = (pista.languageCode || 'sin idioma') + (pista.kind === 'asr' ? ' (automático)' : '');
    return {
      tipo: 'youtube',
      fuente: 'subtítulo ' + idioma + ' de YouTube',
      chars: texto.length,
      texto,
      extra: { videoId: id, cliente: cliente.nombre }
    };
  }
  return {
    ok: false,
    error: 'YouTube no dio subtítulos (' + ultimo + '). Si el vídeo no tiene subtítulos, no hay texto que leer; si es un bloqueo, prueba más tarde.'
  };
}

/* ── GitHub ──────────────────────────────────────────────────── */

async function leerGithub(u, max) {
  const partes = u.pathname.split('/').filter(Boolean);
  if (partes.length < 2) fallar('La URL no apunta a un repositorio.', 4);
  const repo = partes[0] + '/' + partes[1];

  const r = await pedir('https://api.github.com/repos/' + repo + '/readme', {
    headers: { 'User-Agent': 'leer-url', Accept: 'application/vnd.github.raw' }
  });
  if (!r.ok) fallar('GitHub respondió HTTP ' + r.status + ' para ' + repo + ' (¿no existe, es privado o se agotó la cuota?).');

  const texto = limpiar(await r.text(), max);
  if (texto.length < 20) return { ok: false, error: 'Ese repositorio tiene el README vacío.' };

  let meta = {};
  try {
    const rm = await pedir('https://api.github.com/repos/' + repo, {
      headers: { 'User-Agent': 'leer-url', Accept: 'application/vnd.github+json' }
    });
    if (rm.ok) {
      const j = await rm.json();
      meta = {
        estrellas: j.stargazers_count,
        licencia: j.license && j.license.spdx_id ? j.license.spdx_id : 'sin licencia declarada',
        actualizado: (j.pushed_at || '').slice(0, 10),
        lenguaje: j.language || ''
      };
    }
  } catch { /* sin metadatos, seguimos */ }

  return { tipo: 'github', fuente: 'README de ' + repo, chars: texto.length, texto, extra: { repo, ...meta } };
}

/* ── Web genérica ────────────────────────────────────────────── */

async function leerWeb(u, max) {
  await comprobarDestino(u);

  let actual = u.href;
  let r = null;
  for (let salto = 0; salto < 4; salto++) {
    r = await pedir(actual, {
      headers: { 'User-Agent': UA_NAVEGADOR, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6' }
    });
    if (r.status >= 300 && r.status < 400) {
      const destino = r.headers.get('location');
      if (!destino) break;
      const siguiente = new URL(destino, actual);
      await comprobarDestino(siguiente);
      actual = siguiente.href;
      continue;
    }
    break;
  }

  if (!r || !r.ok) fallar('La página no respondió bien (HTTP ' + (r ? r.status : '?') + ').');
  const tipo = r.headers.get('content-type') || '';
  if (tipo && !/text\/html|application\/xhtml|text\/plain|application\/json|text\/markdown/i.test(tipo)) {
    return { ok: false, error: 'Ese enlace no es texto (' + tipo + ').' };
  }

  let html = await r.text();
  const titulo = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];

  if (/text\/plain|application\/json|text\/markdown/i.test(tipo)) {
    const texto = limpiar(decodificar(html), max);
    return { tipo: 'texto', fuente: 'documento de texto' + (titulo ? ' · ' + decodificar(titulo).trim() : ''), chars: texto.length, texto };
  }

  html = html
    .replace(/<(script|style|noscript|template|svg|iframe|canvas)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const aTexto = (trozo, quitarMenus) => {
    let t = trozo;
    if (quitarMenus) t = t.replace(/<(nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
    t = t.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section)[^>]*>/gi, '. ').replace(/<[^>]+>/g, ' ');
    return limpiar(decodificar(t), max);
  };

  // El documento entero siempre funciona; si hay <main>/<article> con sustancia, se
  // prefiere porque llega sin menús ni pies. Cuando el <main> es un caparazón vacío
  // (webs de documentación hechas con JavaScript), se usa el documento.
  const completo = aTexto(html, false);
  const bloque = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || [])[1];
  const deBloque = bloque ? aTexto(bloque, true) : '';

  let texto = deBloque.length >= Math.max(600, completo.length * 0.4) ? deBloque : completo;
  if (texto.length < 60) texto = completo;

  if (texto.length < 60) {
    return { ok: false, error: 'La página no tiene texto legible (¿es una aplicación en JavaScript?).' };
  }

  return {
    tipo: 'web',
    fuente: 'texto de la página' + (titulo ? ' · ' + decodificar(titulo).replace(/\s+/g, ' ').trim() : ''),
    chars: texto.length,
    texto
  };
}

/* ── principal ───────────────────────────────────────────────── */

function terminar(salida, deCache) {
  if (rutaSalida) {
    try {
      const destino = path.resolve(rutaSalida);
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, salida.texto, 'utf8');
      if (json) console.log(JSON.stringify({ ok: true, url: salida.url, fuente: salida.fuente, chars: salida.chars, fichero: destino, cache: deCache }, null, 2));
      else console.log(`${destino} · ${salida.chars} caracteres · ${salida.fuente}`);
    } catch (e) {
      fallar('No se pudo escribir el fichero de --out (' + (e.code || e.message) + '): ' + rutaSalida, 5);
    }
    return;
  }

  if (json) {
    console.log(JSON.stringify({ ...salida, cache: deCache }, null, 2));
    return;
  }

  console.log(`# ${salida.fuente} · ${salida.chars} caracteres ${deCache ? '· (caché)' : ''}`);
  console.log(`# ${salida.url}`);
  console.log('');
  console.log(salida.texto);
}

async function main() {
  const u = analizarUrl(urlCruda);
  const porDefecto = u.hostname.includes('youtube') || u.hostname.includes('youtu.be') ? 60000 : 40000;
  const max = Number(opcion('--max', porDefecto)) || porDefecto;

  const enCache = leerCache(u.href + '#' + max);
  if (enCache) {
    // Una entrada cacheada no puede saltarse el control de destino: si el dominio
    // empezó a apuntar a una red privada, se descarta y se vuelve a pedir.
    if (enCache.tipo === 'web' || enCache.tipo === 'texto') {
      try { await comprobarDestino(u); } catch { /* fallar() ya habrá salido */ }
    }
    return terminar(enCache, true);
  }

  const host = u.hostname.replace(/^www\./, '');
  let resultado;
  if (/youtu\.?be/.test(host)) {
    resultado = await leerYoutube(u, max);
  } else if (host === 'github.com') {
    resultado = await leerGithub(u, max);
  } else {
    resultado = await leerWeb(u, max);
  }

  if (resultado && resultado.ok === false) {
    if (json) console.log(JSON.stringify({ ok: false, url: u.href, error: resultado.error }, null, 2));
    else console.error('SIN TEXTO: ' + resultado.error);
    process.exit(2);
  }

  const salida = { ok: true, url: u.href, tipo: resultado.tipo, fuente: resultado.fuente, chars: resultado.chars, texto: resultado.texto, extra: resultado.extra || {} };
  guardarCache(u.href + '#' + max, salida);
  terminar(salida, false);
}

main().catch((e) => {
  if (e && (e.name === 'TimeoutError' || (e.cause && e.cause.code === 'UND_ERR_CONNECT_TIMEOUT'))) {
    fallar('Tiempo agotado al pedir la fuente.');
  }
  fallar('Error inesperado: ' + ((e && e.message) || String(e)));
});
