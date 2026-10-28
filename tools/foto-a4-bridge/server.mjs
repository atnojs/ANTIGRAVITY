/**
 * Foto A4 — puente local de impresión
 * Sirve la app desde webs/foto-a4 y habla con el driver de Windows.
 * Solo escucha en 127.0.0.1. No se despliega: vive en tools/.
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', 'webs', 'foto-a4');
const PS1 = path.join(__dirname, 'print.ps1');
const VERSION = '1.0.0';

const argv = process.argv.slice(2);
const portArg = argv.indexOf('--port');
const PORT = portArg >= 0 ? Number(argv[portArg + 1]) : 8787;
const OPEN_BROWSER = !argv.includes('--no-open');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

const capsCache = new Map();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '600');
}

function json(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function runPowerShell(args, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', PS1, ...args
    ], { windowsHide: true });

    let out = '';
    let err = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error('La impresora tardó demasiado en responder.'));
      }
    }, timeout);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });

    child.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const line = out.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('{')).pop();
      if (!line) {
        reject(new Error(err.trim() || 'El driver de impresión no devolvió respuesta.'));
        return;
      }
      try {
        const data = JSON.parse(line);
        if (!data.ok) reject(new Error(data.error || 'Error del driver de impresión.'));
        else resolve(data);
      } catch (e) {
        reject(new Error('Respuesta no válida del driver: ' + line.slice(0, 160)));
      }
    });
  });
}

function readBody(req, limit = 60 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('La imagen es demasiado grande.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Prohibido');
    return;
  }
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) {
      const index = path.join(filePath, 'index.html');
      return serveFile(res, index);
    }
    return serveFile(res, filePath);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}

async function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const data = await fsp.readFile(filePath);
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': data.length,
    'Cache-Control': 'no-store'
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  const url = new URL(req.url, 'http://127.0.0.1');
  const pathname = url.pathname;

  try {
    if (pathname === '/api/health') {
      let appPresent = true;
      try { await fsp.access(path.join(ROOT, 'index.html')); } catch { appPresent = false; }
      json(res, 200, { ok: true, app: 'foto-a4-bridge', version: VERSION, appPresent });
      return;
    }

    if (pathname === '/api/printers') {
      const data = await runPowerShell(['-Mode', 'printers'], 30000);
      json(res, 200, { printers: data.printers || [] });
      return;
    }

    if (pathname === '/api/capabilities') {
      const printer = url.searchParams.get('printer') || '';
      const cached = capsCache.get(printer);
      if (cached && Date.now() - cached.at < 60000) {
        json(res, 200, cached.data);
        return;
      }
      const data = await runPowerShell(['-Mode', 'caps', '-Printer', printer], 30000);
      capsCache.set(printer, { at: Date.now(), data });
      json(res, 200, data);
      return;
    }

    if (pathname === '/api/preferences' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req, 1024 * 64)).toString('utf8') || '{}');
      await runPowerShell(['-Mode', 'prefs', '-Printer', String(body.printer || '')], 20000);
      json(res, 200, { ok: true });
      return;
    }

    if (pathname === '/api/print' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)).toString('utf8') || '{}');
      if (!body.data) {
        json(res, 400, { ok: false, error: 'Falta la imagen del folio.' });
        return;
      }
      const ext = body.format === 'png' ? '.png' : '.jpg';
      const tmp = path.join(os.tmpdir(), 'foto-a4-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
      await fsp.writeFile(tmp, Buffer.from(body.data, 'base64'));

      try {
        const args = [
          '-Mode', 'print',
          '-Printer', String(body.printer || ''),
          '-Image', tmp,
          '-Paper', String(body.paper || 'A4'),
          '-Res', String(body.resolution || ''),
          '-Copies', String(Math.max(1, Math.min(99, Number(body.copies) || 1)))
        ];
        const data = await runPowerShell(args, 180000);
        json(res, 200, data);
      } finally {
        fsp.unlink(tmp).catch(() => {});
      }
      return;
    }

    if (pathname.startsWith('/api/')) {
      json(res, 404, { ok: false, error: 'Ruta no encontrada.' });
      return;
    }

    await serveStatic(req, res, pathname);
  } catch (err) {
    json(res, 500, { ok: false, error: err && err.message ? err.message : 'Error interno.' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + PORT + '/';
  console.log('');
  console.log('  Foto A4 — puente de impresión local');
  console.log('  App:    ' + url);
  console.log('  Datos:  ' + ROOT);
  console.log('  Cierra esta ventana para detenerlo.');
  console.log('');

  if (OPEN_BROWSER) {
    spawn('cmd.exe', ['/c', 'start', '', url], { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('El puerto ' + PORT + ' ya está ocupado. Abre http://127.0.0.1:' + PORT + '/ o arranca con --port otro.');
  } else {
    console.error('Error del servidor:', err.message);
  }
  process.exitCode = 1;
});
