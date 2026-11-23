#!/usr/bin/env node
/**
 * leer-url — lee una URL y devuelve su texto para que el agente lo analice.
 *
 *   node tools/leer-url/leer-url.mjs <url> [opciones]
 *
 * Qué sabe leer:
 *   · YouTube        → subtítulos (prefiere español manual, luego español automático, luego inglés).
 *                      Usa la API interna con cliente ANDROID y parsea el XML srv3 (format=3),
 *                      que es lo que devuelve YouTube de verdad; `fmt=json3` se ignora desde 2026.
 *   · GitHub         → README del repositorio (y metadatos: estrellas, licencia, último push).
 *   · Cualquier web  → texto principal de la página.
 *
 * Opciones:
 *   --max N        tope de caracteres devueltos (por defecto 40000; vídeo 60000)
 *   --json         salida JSON {ok, tipo, fuente, chars, url, texto}
 *   --out RUTA     guarda el texto en un fichero y devuelve solo la ruta y el recuento
 *   --no-cache     ignora la caché local
 *   --ayuda        esta ayuda
 *
 * Códigos de salida: 0 bien · 2 no hay texto · 3 error de red/HTTP · 4 URL no válida.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const UA_NAVEGADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const UA_ANDROID = 'com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip';
const UA_IOS = 'com.google.ios.youtube/20.10.1 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)';

const args = process.argv.slice(2);
if (args.includes('--ayuda') || args.includes('-h') || args.includes('--help') || args.length === 0) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, '').trim());
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

/* ── URL y seguridad ─────────────────────────────────────────── */

function analizarUrl(entrada) {
  if (!entrada) fallar('Falta la URL. Uso: leer-url.mjs <url>', 4);
  const conEsquema = /^https?:\/\//i.test(entrada) ? entrada : 'https://' + entrada;
  let u;
  try { u = new URL(conEsquema); } catch { fallar('URL no válida: ' + entrada, 4); }
  if (!/^https?:$/.test(u.protocol)) fallar('Sólo http o https.', 4);
  if (!u.hostname.includes('.')) fallar('Eso no parece una URL: falta el dominio (ejemplo.com).', 4);
  return u;
}

const BLOQUEADOS = /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|::1|\[::1\])/i;

function esPrivada(host) {
  if (BLOQUEADOS.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

/* ── Utilidades ──────────────────────────────────────────────── */

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(url, opciones = {}, intentos = 2) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url, { redirect: 'manual', ...opciones });
      return r;
    } catch (e) {
      ultimo = e;
      await dormir(400 + i * 600);
    }
  }
  throw ultimo;
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

function rutaCache(clave) {
  const dir = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'leer-url', 'cache');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, crypto.createHash('sha1').update(clave).digest('hex') + '.json');
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
  try {
    fs.writeFileSync(rutaCache(clave), JSON.stringify({ guardado: Date.now(), resultado }), 'utf8');
  } catch { /* sin caché, da igual */ }
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

/** El XML de YouTube (format=3) trae el texto en <p t="…" d="…">…</p>; el antiguo, en <text>. */
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
    error: 'YouTube no dio subtítulos (' + ultimo + '). Si es un vídeo sin subtítulos, no hay texto que leer; si es un bloqueo, prueba más tarde.'
  };
}

/* ── GitHub ──────────────────────────────────────────────────── */

async function leerGithub(u, max) {
  const partes = u.pathname.split('/').filter(Boolean);
  if (partes.length < 2) return { ok: false, error: 'La URL no apunta a un repositorio.' };
  const repo = partes[0] + '/' + partes[1];
  const cabeceras = { 'User-Agent': 'leer-url', Accept: 'application/vnd.github.raw' };

  const r = await pedir('https://api.github.com/repos/' + repo + '/readme', { headers: cabeceras });
  if (!r.ok) {
    return { ok: false, error: 'GitHub no devolvió el README de ' + repo + ' (HTTP ' + r.status + ').' };
  }
  const texto = limpiar(await r.text(), max);

  let meta = {};
  try {
    const rm = await pedir('https://api.github.com/repos/' + repo, { headers: { 'User-Agent': 'leer-url', Accept: 'application/vnd.github+json' } });
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
  if (esPrivada(u.hostname)) fallar('Esa dirección es de red privada o local; no la leo.', 4);

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
      if (esPrivada(siguiente.hostname)) fallar('La página redirige a una dirección privada; no la sigo.', 4);
      actual = siguiente.href;
      continue;
    }
    break;
  }

  if (!r || !r.ok) fallar('La página no respondió bien (HTTP ' + (r ? r.status : '?') + ').');
  const tipo = r.headers.get('content-type') || '';
  if (tipo && !/text\/html|application\/xhtml|text\/plain|application\/json|text\/markdown/i.test(tipo)) {
    fallar('Ese enlace no es texto (' + tipo + ').');
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

  // El documento entero siempre funciona; si hay <main>/<article> con suficiente sustancia,
  // se prefiere porque llega sin menús ni pies. Cuando el <main> es un caparazón vacío
  // (pasa en webs de documentación hechas con JavaScript), se usa el documento.
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

async function main() {
  const u = analizarUrl(urlCruda);
  const max = Number(opcion('--max', u.hostname.includes('youtube') || u.hostname.includes('youtu.be') ? 60000 : 40000)) || 40000;

  const enCache = leerCache(u.href + '#' + max);
  if (enCache) return terminar(enCache, true);

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

function terminar(salida, deCache) {
  if (rutaSalida) {
    fs.mkdirSync(path.dirname(path.resolve(rutaSalida)), { recursive: true });
    fs.writeFileSync(path.resolve(rutaSalida), salida.texto, 'utf8');
    if (json) console.log(JSON.stringify({ ok: true, url: salida.url, fuente: salida.fuente, chars: salida.chars, fichero: path.resolve(rutaSalida), cache: deCache }, null, 2));
    else console.log(`${path.resolve(rutaSalida)} · ${salida.chars} caracteres · ${salida.fuente}`);
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

main().catch((e) => {
  const motivo = (e && e.cause && e.cause.code) || (e && e.message) || String(e);
  fallar('No se pudo conectar: ' + motivo + '. Comprueba el enlace o la red.');
});
