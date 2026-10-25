/*
 * smoke-password-eye.mjs — humo en Chrome real (CDP) de todas las páginas
 * objetivo del visor de contraseña.
 *
 * Para cada URL:
 *   - carga la página (sin caché),
 *   - comprueba que el componente está cargado (window.AGPasswordEye),
 *   - si hay campos de contraseña VISIBLES, exige que cada uno tenga su ojo,
 *   - recoge excepciones y errores de consola atribuibles al componente.
 *
 * Uso:
 *   node tools/smoke-password-eye.mjs                       # local http://127.0.0.1:8123
 *   node tools/smoke-password-eye.mjs --base https://atnojs.es --limit 40
 *   node tools/smoke-password-eye.mjs --only descargas,trickvault
 *   node tools/smoke-password-eye.mjs --json tools/evidencias/.../smoke.json
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { targetList, publicPath, ROOT } from './lib/password-eye-targets.mjs';

const CHROME =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = Number(process.env.CDP_PORT || 9333);

const argv = process.argv.slice(2);
const arg = (name, def = null) => {
  const i = argv.indexOf(name);
  return i === -1 ? def : argv[i + 1];
};
const BASE = (arg('--base', 'http://127.0.0.1:8123') || '').replace(/\/$/, '');
const LIMIT = Number(arg('--limit', '0')) || 0;
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean);
const JSON_OUT = arg('--json', '');
const NAV_TIMEOUT = Number(arg('--timeout', '15000')) || 15000;
const SETTLE = Number(arg('--settle', '900')) || 900;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }
  on(fn) { this.listeners.add(fn); }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout CDP ${method}`));
        }
      }, 30000);
    });
  }
}

async function launchChrome() {
  const profile = mkdtempSync(path.join(tmpdir(), 'agp-smoke-'));
  const child = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      '--window-size=1280,800',
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${CDP_PORT}`,
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true }
  );
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) return { child, profile, version: await res.json() };
    } catch { /* aún arrancando */ }
  }
  child.kill();
  throw new Error('Chrome no ha arrancado (CDP no responde)');
}

async function pageTarget() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const list = await res.json();
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('sin pestaña');
  return page.webSocketDebuggerUrl;
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('WS error')), { once: true });
    setTimeout(() => reject(new Error('WS timeout')), 10000);
  });
  return new CDP(ws);
}

async function checkUrl(cdp, url) {
  const errors = [];
  const exceptions = [];
  let loaded = false;
  const listener = (msg) => {
    if (msg.method === 'Page.loadEventFired') loaded = true;
    // Algunas páginas antiguas abren alert() al cargar recursos que en local
    // dan 404; se descartan para que no bloqueen la evaluación.
    if (msg.method === 'Page.javascriptDialogOpening') {
      cdp.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params?.exceptionDetails;
      exceptions.push((d?.exception?.description || d?.text || 'excepción').slice(0, 240));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
      const text = (msg.params.args || [])
        .map((a) => a.value ?? a.description ?? '')
        .join(' ')
        .slice(0, 240);
      errors.push(text);
    }
  };
  cdp.on(listener);
  try {
    loaded = false;
    await cdp.send('Page.navigate', { url });
    const t0 = Date.now();
    while (!loaded && Date.now() - t0 < NAV_TIMEOUT) await sleep(60);
    await sleep(SETTLE);
    const evalRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const ins = Array.from(document.querySelectorAll('input[type="password"], input[data-agp-eye]'));
        const visible = ins.filter(i => {
          const r = i.getBoundingClientRect();
          const cs = getComputedStyle(i);
          if (!(r.width > 4 && r.height > 4 && cs.display !== 'none' && cs.visibility !== 'hidden')) return false;
          // En pantalla (evita contar cajas ocultas lejos del viewport).
          if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
          // Opacidad acumulada de los antecesores.
          let op = parseFloat(cs.opacity);
          let el = i.parentElement;
          let guard = 0;
          while (el && el !== document.body && guard++ < 200) {
            const a = parseFloat(getComputedStyle(el).opacity);
            if (!isNaN(a)) op *= a;
            el = el.parentElement;
          }
          return !(op < 0.05);
        });
        const eyes = Array.from(document.querySelectorAll('.agp-eye'));
        const shownEyes = eyes.filter(b => b.style.visibility !== 'hidden');
        const r = visible.length ? visible[0].getBoundingClientRect() : null;
        const eyeInFirst = eyes.map(b => b.getBoundingClientRect()).filter(e => r && e.left >= r.left && e.right <= r.right + 1 && e.top >= r.top && e.bottom <= r.bottom + 1).length;
        return {
          ready: document.readyState,
          api: window.AGPasswordEye ? window.AGPasswordEye.version : null,
          marker: document.documentElement.getAttribute('data-agp-eye'),
          inputs: ins.length,
          visibleInputs: visible.length,
          eyes: eyes.length,
          shownEyes: shownEyes.length,
          eyesInsideFirstVisible: eyeInFirst,
          firstVisibleSize: r ? [Math.round(r.width), Math.round(r.height)] : null,
        };
      })()`,
      returnByValue: true,
      awaitPromise: false,
    });
    const v = evalRes.result?.value || {};
    const problems = [];
    if (!v.api) problems.push('componente no cargado');
    if (v.visibleInputs > 0 && v.shownEyes < v.visibleInputs) {
      problems.push(`ojos visibles ${v.shownEyes} < campos visibles ${v.visibleInputs}`);
    }
    if (v.visibleInputs > 0 && v.eyesInsideFirstVisible === 0) problems.push('ojo fuera del campo');
    const fam = [...errors, ...exceptions].filter((e) => /password-eye|AGPasswordEye|agp-eye|AGP_EYE/i.test(e));
    if (fam.length) problems.push('error propio: ' + fam[0]);
    return { url, ok: problems.length === 0, problems, ...v, errors: errors.slice(0, 4), exceptions: exceptions.slice(0, 4) };
  } finally {
    cdp.listeners.delete(listener);
  }
}

async function main() {
  const targets = [...targetList().keys()].sort();
  let files = targets;
  if (ONLY.length) files = files.filter((f) => ONLY.some((s) => f.includes(s)));
  if (LIMIT) files = files.slice(0, LIMIT);

  console.log(`Smoke password-eye · base=${BASE} · páginas=${files.length}`);
  const { child, version } = await launchChrome();
  console.log(`Chrome ${version.Browser}`);
  const cdp = await connect(await pageTarget());
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const url = `${BASE}${publicPath(file)}?cb=smoke${Date.now()}${i}`;
    let r;
    try {
      r = await checkUrl(cdp, url);
    } catch (e) {
      r = { url, ok: false, problems: ['excepción de harness: ' + e.message], errors: [], exceptions: [] };
    }
    r.file = file;
    results.push(r);
    const tag = r.ok ? 'OK  ' : 'FAIL';
    console.log(`${tag} ${file}${r.problems?.length ? ' :: ' + r.problems.join(' | ') : ''}`);
  }

  const fails = results.filter((r) => !r.ok);
  console.log(`\nResumen: ${results.length - fails.length}/${results.length} OK, ${fails.length} fallos`);
  if (JSON_OUT) {
    writeFileSync(path.resolve(ROOT, JSON_OUT), JSON.stringify({ base: BASE, results }, null, 2) + '\n');
    console.log(`Detalle: ${JSON_OUT}`);
  }
  try { child.kill(); } catch { /* ignorado */ }
  if (fails.length) process.exitCode = 2;
}

main().catch((e) => {
  console.error('ERROR:', e.stack || e.message);
  process.exit(1);
});
