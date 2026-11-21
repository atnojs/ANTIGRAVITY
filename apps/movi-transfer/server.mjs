#!/usr/bin/env node
/**
 * Movi Transfer — servidor local de intercambio de archivos móvil ↔ PC.
 *
 * Sin dependencias: sólo la librería estándar de Node (>= 20).
 * Escucha en la red local y sirve una única página que permite subir archivos
 * desde el móvil y descargarlos al móvil, sin cables ni cuentas.
 *
 * Uso:  node server.mjs [--open]
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const VERSION = '1.2.0';
const APP_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(APP_DIR, 'public');

const DEFAULT_CONFIG = {
  port: 8099,
  host: '0.0.0.0',
  inbox: '_inbox',
  maxFileBytes: 25 * 1024 * 1024 * 1024,
};

async function readConfig() {
  try {
    const raw = await fsp.readFile(path.join(APP_DIR, 'config.json'), 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

const CONFIG = await readConfig();
const PORT = Number(process.env.MOVI_PORT || CONFIG.port);
const HOST = process.env.MOVI_HOST || CONFIG.host;
const MAX_FILE_BYTES = Number(process.env.MOVI_MAX_BYTES || CONFIG.maxFileBytes);
const INBOX_DIR = path.resolve(APP_DIR, process.env.MOVI_INBOX || CONFIG.inbox);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.heic']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v']);
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac']);

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self'; " +
    "style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; " +
    "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { ok: false, error: message });
}

/**
 * Bloquea peticiones de escritura lanzadas desde otra web abierta en el
 * navegador (CSRF): si el navegador envía `Origin`, tiene que ser el nuestro.
 * Sin `Origin` (curl, apps nativas) se permite, porque no hay cookie que robar.
 */
function origenPermitido(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/** Convierte cualquier nombre recibido en un nombre de archivo seguro. */
export function safeName(raw) {
  if (typeof raw !== 'string') return null;
  // El nombre llega ya decodificado por URLSearchParams: no se decodifica otra vez.
  let name = raw;
  // Corta cualquier intento de ruta (Windows y POSIX) quedándose con el último tramo.
  name = name.split(/[\\/]/).pop() ?? '';
  name = name.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').trim();
  name = name.replace(/[. ]+$/g, '');
  if (!name || name === '.' || name === '..' || name.startsWith('.')) return null;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)) name = `_${name}`;
  if (name.length > 180) {
    const ext = path.extname(name).slice(0, 20);
    name = name.slice(0, 180 - ext.length) + ext;
  }
  return name;
}

/** Resuelve un nombre dentro de la bandeja de entrada, sin salir de ella. */
function inboxPath(rawName) {
  const name = safeName(rawName);
  if (!name) return null;
  const full = path.resolve(INBOX_DIR, name);
  const rel = path.relative(INBOX_DIR, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return { name, full };
}

// Reserva en memoria de los nombres que se están subiendo ahora mismo. El
// servidor es un único proceso, así que este Set elimina la carrera entre dos
// subidas simultáneas del mismo nombre (antes la segunda pisaba a la primera).
const reservas = new Set();

function reservarNombre(rawName) {
  const baseName = safeName(rawName);
  if (!baseName) return null;
  const ext = path.extname(baseName);
  const base = baseName.slice(0, baseName.length - ext.length);
  for (let i = 1; i < 500; i += 1) {
    const nombre = i === 1 ? baseName : `${base} (${i})${ext}`;
    const candidato = inboxPath(nombre);
    if (!candidato) return null;
    const clave = nombre.toLowerCase();
    if (reservas.has(clave)) continue;
    // Reserva síncrona antes de comprobar el disco: al ser un único proceso,
    // no hay ventana entre «está libre» y «queda reservado».
    reservas.add(clave);
    let ocupado = false;
    try {
      fs.accessSync(candidato.full);
      ocupado = true;
    } catch {
      /* libre */
    }
    if (!ocupado) return { ...candidato, clave };
    reservas.delete(clave);
  }
  return null;
}

/**
 * Archivos que Windows crea al abrir la carpeta en el Explorador y que no son
 * del usuario: no deben aparecer en la lista ni contar en los totales.
 */
function esBasuraDelSistema(nombre) {
  const n = nombre.toLowerCase();
  return n === 'thumbs.db' || n === 'desktop.ini' || n.startsWith('~$');
}

// Historial de actividad (nombre → {u: subida, d: descarga}). Vive en un fichero
// oculto dentro de la bandeja para que el orden «último tocado primero» sobreviva
// a un reinicio. El fichero empieza por punto y no se lista.
const HISTORIAL_ACTIVIDAD = path.join(INBOX_DIR, '.descargas.json');
const actividad = new Map();
let guardadoPendiente = null;

async function cargarActividad() {
  try {
    const datos = JSON.parse(await fsp.readFile(HISTORIAL_ACTIVIDAD, 'utf8'));
    for (const [nombre, valor] of Object.entries(datos)) {
      if (typeof nombre !== 'string') continue;
      if (Number.isFinite(valor)) {
        // Formato antiguo: sólo fecha de descarga.
        actividad.set(nombre, { d: valor });
      } else if (valor && typeof valor === 'object') {
        actividad.set(nombre, {
          u: Number.isFinite(valor.u) ? valor.u : undefined,
          d: Number.isFinite(valor.d) ? valor.d : undefined,
        });
      }
    }
  } catch {
    /* primer arranque o fichero corrupto: se empieza vacío */
  }
}

function guardarActividad() {
  if (guardadoPendiente) return;
  guardadoPendiente = setTimeout(async () => {
    guardadoPendiente = null;
    const temporal = `${HISTORIAL_ACTIVIDAD}.tmp`;
    try {
      await fsp.writeFile(temporal, JSON.stringify(Object.fromEntries(actividad)), 'utf8');
      await fsp.rename(temporal, HISTORIAL_ACTIVIDAD);
    } catch {
      await fsp.rm(temporal, { force: true }).catch(() => {});
    }
  }, 400);
}

function registrarActividad(nombre, tipo) {
  const previo = actividad.get(nombre) ?? {};
  previo[tipo] = Date.now();
  actividad.set(nombre, previo);
  guardarActividad();
}

async function listFiles() {
  const entries = await fsp.readdir(INBOX_DIR, { withFileTypes: true });
  const files = [];
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && !esBasuraDelSistema(entry.name))
      .map(async (entry) => {
        try {
          const stat = await fsp.stat(path.join(INBOX_DIR, entry.name));
          const ext = path.extname(entry.name).toLowerCase();
          const historial = actividad.get(entry.name);
          files.push({
            name: entry.name,
            size: stat.size,
            mtime: stat.mtimeMs,
            lastUpload: historial?.u ?? null,
            lastDownload: historial?.d ?? null,
            kind: IMAGE_EXT.has(ext)
              ? 'image'
              : VIDEO_EXT.has(ext)
                ? 'video'
                : AUDIO_EXT.has(ext)
                  ? 'audio'
                  : 'file',
          });
        } catch {
          /* el archivo desapareció mientras se listaba */
        }
      }),
  );
  // El último tocado (subido o descargado) va primero. Se usa la marca del
  // servidor porque el reloj del share puede ir desfasado respecto al PC.
  files.sort(
    (a, b) =>
      Math.max(b.lastUpload ?? 0, b.lastDownload ?? 0, b.mtime) -
      Math.max(a.lastUpload ?? 0, a.lastDownload ?? 0, a.mtime),
  );
  return files;
}

function localAddress() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const [name, addresses] of Object.entries(nets)) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        // Prioriza Wi‑Fi/Ethernet reales frente a adaptadores virtuales (WSL, Hyper-V).
        const virtual = /vEthernet|Loopback|Virtual|Hyper-V|WSL|Docker/i.test(name);
        candidates.push({ address: address.address, virtual });
      }
    }
  }
  candidates.sort((a, b) => Number(a.virtual) - Number(b.virtual));
  return candidates[0]?.address ?? '127.0.0.1';
}

function serveStatic(req, res, pathname) {
  let relative;
  try {
    relative = decodeURIComponent(pathname);
  } catch {
    sendError(res, 400, 'Dirección no válida.');
    return;
  }
  if (relative === '/') relative = '/index.html';
  if (relative.includes('\u0000')) {
    sendError(res, 400, 'Dirección no válida.');
    return;
  }
  const full = path.resolve(PUBLIC_DIR, `.${relative}`);
  const rel = path.relative(PUBLIC_DIR, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    sendError(res, 403, 'Ruta no permitida.');
    return;
  }
  fs.stat(full, (err, stat) => {
    if (err || !stat.isFile()) {
      sendError(res, 404, 'No encontrado.');
      return;
    }
    const ext = path.extname(full).toLowerCase();
    const cache = ext === '.html' ? 'no-store' : 'no-cache';
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': cache,
      'Last-Modified': stat.mtime.toUTCString(),
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = fs.createReadStream(full);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}

async function handleState(res) {
  let count = 0;
  let totalSize = 0;
  try {
    const files = await listFiles();
    count = files.length;
    totalSize = files.reduce((sum, file) => sum + file.size, 0);
  } catch {
    /* bandeja vacía o inaccesible */
  }
  sendJson(res, 200, {
    ok: true,
    app: 'Movi Transfer',
    version: VERSION,
    hostname: os.hostname(),
    ip: localAddress(),
    port: PORT,
    inbox: path.basename(INBOX_DIR),
    count,
    totalSize,
    maxFileBytes: MAX_FILE_BYTES,
  });
}

async function handleUpload(req, res, url) {
  const name = url.searchParams.get('name') ?? req.headers['x-file-name'] ?? '';
  const target = reservarNombre(name);
  if (!target) {
    sendError(res, 400, 'Nombre de archivo no válido.');
    return;
  }
  const liberar = () => reservas.delete(target.clave);

  const length = Number(req.headers['content-length'] ?? 0);
  if (length > MAX_FILE_BYTES) {
    liberar();
    sendError(res, 413, 'El archivo supera el límite configurado.');
    return;
  }

  const tmp = path.join(INBOX_DIR, `.subiendo-${randomBytes(6).toString('hex')}`);
  const out = fs.createWriteStream(tmp, { flags: 'wx' });
  let bytes = 0;
  let aborted = false;
  let limpiado = false;

  const cleanup = async () => {
    if (limpiado) return;
    limpiado = true;
    aborted = true;
    out.destroy();
    await fsp.rm(tmp, { force: true }).catch(() => {});
    liberar();
  };

  req.on('aborted', cleanup);
  res.on('close', () => {
    if (!res.writableEnded) cleanup();
  });
  out.on('error', async () => {
    await cleanup();
    if (!res.headersSent) sendError(res, 500, 'No se pudo escribir el archivo.');
  });

  req.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > MAX_FILE_BYTES) {
      req.destroy();
      cleanup();
    }
  });

  req.pipe(out);

  out.on('finish', async () => {
    if (aborted) return;
    try {
      await fsp.rename(tmp, target.full);
      const stat = await fsp.stat(target.full);
      registrarActividad(target.name, 'u');
      sendJson(res, 201, { ok: true, name: target.name, size: stat.size, mtime: stat.mtimeMs });
    } catch {
      await fsp.rm(tmp, { force: true }).catch(() => {});
      if (!res.headersSent) sendError(res, 500, 'No se pudo guardar el archivo.');
    } finally {
      liberar();
    }
  });
}

async function handleDownload(req, res, url) {
  const target = inboxPath(url.searchParams.get('name') ?? '');
  if (!target) {
    sendError(res, 400, 'Nombre de archivo no válido.');
    return;
  }
  let stat;
  try {
    stat = await fsp.stat(target.full);
    if (!stat.isFile()) throw new Error('no es un archivo');
  } catch {
    sendError(res, 404, 'El archivo no existe.');
    return;
  }

  const ext = path.extname(target.name).toLowerCase();
  const inline = url.searchParams.get('inline') === '1';
  const type = MIME[ext] ?? 'application/octet-stream';
  const disposition = `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(target.name)}`;

  // Una descarga real (no la vista previa ni un HEAD) sube el archivo al
  // principio de la lista: «el último descargado, primero».
  if (req.method === 'GET' && !inline) registrarActividad(target.name, 'd');

  // Un archivo vacío no puede abrirse con createReadStream({end: -1}): se
  // responde 200 con cuerpo de 0 bytes.
  if (stat.size === 0) {
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': type,
      'Content-Disposition': disposition,
      'Accept-Ranges': 'bytes',
      'Content-Length': 0,
      'Cache-Control': 'no-store',
    });
    res.end();
    return;
  }

  let start = 0;
  let end = stat.size - 1;
  let status = 200;
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] !== '' || match[2] !== '')) {
      if (match[1] === '') {
        // Rango sufijo: «bytes=-500» son los últimos 500 bytes.
        const sufijo = Number(match[2]);
        start = Math.max(stat.size - sufijo, 0);
        end = stat.size - 1;
      } else {
        start = Number(match[1]);
        end = match[2] === '' ? stat.size - 1 : Number(match[2]);
      }
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
        res.writeHead(416, { ...SECURITY_HEADERS, 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      end = Math.min(end, stat.size - 1);
      status = 206;
    }
  }

  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': type,
    'Content-Disposition': disposition,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Cache-Control': 'no-store',
  };
  if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = fs.createReadStream(target.full, { start, end });
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}

async function handleDelete(res, url) {
  const target = inboxPath(url.searchParams.get('name') ?? '');
  if (!target) {
    sendError(res, 400, 'Nombre de archivo no válido.');
    return;
  }
  try {
    await fsp.unlink(target.full);
    if (actividad.delete(target.name)) guardarActividad();
    sendJson(res, 200, { ok: true, name: target.name });
  } catch {
    sendError(res, 404, 'El archivo no existe.');
  }
}

const server = http.createServer(async (req, res) => {
  // Las subidas no deben cortarse por el tiempo máximo de petición.
  req.setTimeout(0);
  res.setTimeout(0);

  // Una URL o un Host malformados no pueden tumbar el proceso: se responden 400.
  let url;
  try {
    url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  } catch {
    sendError(res, 400, 'Dirección no válida.');
    return;
  }
  const { pathname } = url;

  try {
    if (pathname === '/api/health') {
      sendJson(res, 200, { ok: true, version: VERSION });
      return;
    }
    if (pathname === '/api/state') {
      await handleState(res);
      return;
    }
    if (pathname === '/api/files') {
      if (req.method === 'GET') {
        sendJson(res, 200, { ok: true, files: await listFiles() });
      } else if (req.method === 'DELETE') {
        if (!origenPermitido(req)) {
          sendError(res, 403, 'Origen no permitido.');
          return;
        }
        await handleDelete(res, url);
      } else {
        sendError(res, 405, 'Método no permitido.');
      }
      return;
    }
    if (pathname === '/api/upload') {
      if (req.method === 'POST') {
        if (!origenPermitido(req)) {
          sendError(res, 403, 'Origen no permitido.');
          return;
        }
        await handleUpload(req, res, url);
      } else {
        sendError(res, 405, 'Método no permitido.');
      }
      return;
    }
    if (pathname === '/api/download') {
      await handleDownload(req, res, url);
      return;
    }
    if (pathname.startsWith('/api/')) {
      sendError(res, 404, 'Endpoint no encontrado.');
      return;
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res, pathname);
      return;
    }
    sendError(res, 405, 'Método no permitido.');
  } catch {
    if (!res.headersSent) sendError(res, 500, 'Error interno del servidor.');
    else res.destroy();
  }
});

server.on('clientError', (err, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

await fsp.mkdir(INBOX_DIR, { recursive: true });
await cargarActividad();

server.listen(PORT, HOST, () => {
  const ip = localAddress();
  const localUrl = `http://127.0.0.1:${PORT}`;
  const lanUrl = `http://${ip}:${PORT}`;
  process.stdout.write(`\n  Movi Transfer ${VERSION}\n`);
  process.stdout.write(`  Bandeja: ${INBOX_DIR}\n`);
  process.stdout.write(`  PC:   ${localUrl}\n`);
  process.stdout.write(`  Móvil: ${lanUrl}\n`);
  process.stdout.write(`  (misma red Wi-Fi; Ctrl+C para parar)\n\n`);

  if (process.argv.includes('--open')) {
    const child = spawn('cmd', ['/c', 'start', '', localUrl], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
