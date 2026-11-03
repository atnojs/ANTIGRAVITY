// Prueba local de la máscara por zonas de Flow Studio (3.2 portado):
// 2 zonas pintadas, cada una con su prompt; se aplica la máscara y se genera.
// Mock de flow_queue.php (Flow) y api.php (modelos directos) que devuelve una
// imagen de color según la palabra clave del prompt:
//   «cian» → cian, «verde»/«hierba» → verde, «humo» → gris.
//
// Uso: node tools/pruebas/local-zonas-flow-hoola.mjs [--model=flow|direct]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) || d;
const MODELO = arg('model', 'direct');
const ROOT = path.resolve('apps');
const APP = 'flow_studio_hoola';
const PORT = Number(arg('port', String(9500 + Math.floor(Math.random() * 120))));
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-03-flow-zonas';
const BASE_IMG = fs.readFileSync(`${OUT}/base-1024.png`);
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.php': 'text/plain; charset=utf-8' };
const servidor = http.createServer((req, res) => {
  const limpio = decodeURIComponent(req.url.split('?')[0]);
  let destino = path.join(ROOT, limpio.replace(/^\//, ''));
  if (fs.existsSync(destino) && fs.statSync(destino).isDirectory()) destino = path.join(destino, 'index.html');
  if (!destino.startsWith(ROOT) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
    if (fs.existsSync(destino + '.php')) { res.writeHead(500); res.end('solo estatico'); return; }
    res.writeHead(404); res.end('no'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(destino).pipe(res);
});
await new Promise((ok) => servidor.listen(PORT, '127.0.0.1', ok));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 980 } });
const page = await context.newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));

await page.addInitScript((modelo) => {
  const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const original = window.fetch.bind(window);
  window.__ZONAS__ = { jobs: [], flowRequests: 0, flowPrompts: [], apiPrompts: [], masks: [] };
  window.__COLOR_DE__ = (prompt) => {
    const texto = String(prompt || '').toLowerCase();
    if (texto.includes('cian')) return '#00e5ff';
    if (texto.includes('verde') || texto.includes('hierba')) return '#27ae60';
    if (texto.includes('humo')) return '#808080';
    return '#ff00ff';
  };
  window.__IMAGEN_DE__ = (prompt) => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
    const x = c.getContext('2d');
    x.fillStyle = window.__COLOR_DE__(prompt); x.fillRect(0, 0, 1024, 1024);
    return c.toDataURL('image/png');
  };
  window.fetch = async (entrada, init = {}) => {
    const url = typeof entrada === 'string' ? entrada : (entrada && entrada.url) || '';
    if (!/flow_queue\.php|api\.php|proxy\.php|history\.php/.test(url)) return original(entrada, init);
    let body = {};
    try { body = typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch { body = {}; }
    const action = new URL(url, location.href).searchParams.get('action') || body.action || '';
    if (action === 'state') return json({ ok: true, authenticated: true, configured: true, needsSetup: false, version: 'test-zonas', maxImageBytes: 14979657 });
    if (action === 'ping') return json({ ok: true, worker: true });
    if (action === 'request') {
      window.__ZONAS__.flowRequests += 1;
      const id = 'fl_' + window.__ZONAS__.flowRequests;
      window.__ZONAS__.flowPrompts.push({ id, prompt: String(body.prompt || '') });
      return json({ ok: true, ids: [id] });
    }
    if (action === 'status') {
      const ids = body.ids || [];
      const jobs = {};
      ids.forEach((id) => {
        const guardado = window.__ZONAS__.flowPrompts.find((p) => p.id === id);
        jobs[id] = { status: 'done', url: window.__IMAGEN_DE__(guardado ? guardado.prompt : '') };
      });
      return json({ ok: true, jobs });
    }
    if (action === 'job.create') {
      window.__ZONAS__.jobs.push({ prompt: body.prompt || '', mask: body.mask || null, model: body.model || '' });
      window.__ZONAS__.apiPrompts.push(String(body.prompt || ''));
      window.__ZONAS__.masks.push(String(body.mask || '').length);
      const imagen = window.__IMAGEN_DE__(body.prompt || '');
      return json({ ok: true, job: { id: 'job_' + window.__ZONAS__.jobs.length, status: 'succeeded', image: imagen, mimeType: 'image/png' } });
    }
    return json({ ok: true });
  };
}, MODELO);

const url = `http://127.0.0.1:${PORT}/${APP}/`;
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
const arranque = await page.evaluate(() => ({ titulo: document.title, btn: Boolean(document.getElementById('btnGenerate')), errores: [] }));

await page.click('#modeEdit');
await page.waitForTimeout(400);
await page.setInputFiles('#sourceInput', { name: 'base-1024.png', mimeType: 'image/png', buffer: BASE_IMG });
await page.waitForTimeout(1500);

await page.click('#btnMaskEdit');
await page.waitForTimeout(600);
await page.click('#maskToolBrush');
await page.waitForTimeout(300);
const caja = await page.locator('#maskCanvas').boundingBox();
if (!caja) throw new Error('sin lienzo de máscara');
const punto = (fx, fy) => ({ x: caja.x + caja.width * fx, y: caja.y + caja.height * fy });
const PUNTOS = MODELO === 'direct-single' ? [[0.5, 0.5]] : [[0.27, 0.3], [0.72, 0.68]];
for (const [fx, fy] of PUNTOS) {
  const p = punto(fx, fy);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 24, p.y + 18, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}
const zonas = await page.evaluate(() => ({
  items: document.querySelectorAll('[data-zone-prompt]').length,
  contador: document.getElementById('maskZoneCount')?.textContent,
  panel: !document.getElementById('maskZonesPanel')?.hidden,
}));
await page.screenshot({ path: `${OUT}/01-dialogo-zonas-${MODELO}.png` });
const prompts = ['coloca un círculo cian plano', 'coloca un cuadrado verde plano'];
if (MODELO !== 'direct-single') {
  const campos = page.locator('[data-zone-prompt]');
  for (let i = 0; i < Math.min(2, await campos.count()); i += 1) await campos.nth(i).fill(prompts[i]);
  await page.waitForTimeout(300);
}
await page.click('#maskApply');
await page.waitForTimeout(600);
const trasAplicar = await page.evaluate(() => ({ nota: document.getElementById('maskNote')?.textContent, sourceNote: document.getElementById('sourceNote')?.textContent }));

if (MODELO === 'direct-single') {
  await page.evaluate(() => { window.__SINGLE__ = true; });
  await page.fill('#prompt', 'pinta de cian plano');
  await page.click('[data-model="openai-image-2-low"]');
} else if (MODELO === 'flow') {
  await page.click('[data-model="flow-nano-banana-2"]');
} else {
  await page.click('[data-model="openai-image-2-low"]');
  await page.waitForTimeout(400);
  if (await page.locator('#accessDialog[open]').count()) {
    await page.fill('#accessPassword', 'test');
    await page.click('#accessSubmit');
    await page.waitForTimeout(800);
  }
}
await page.waitForTimeout(300);
await page.click('#btnGenerate');
for (let t = 0; t < 180; t += 2) {
  const listo = await page.evaluate(() => {
    const card = document.querySelector('#grid .card');
    return Boolean(card && card.querySelector('img') && !card.classList.contains('is-waiting'));
  });
  if (listo) break;
  await page.waitForTimeout(2000);
}
const resultado = await page.evaluate(() => {
  const card = document.querySelector('#grid .card');
  const img = card ? card.querySelector('img') : null;
  const notas = [...document.querySelectorAll('#queueNote, #studioCount')].map((n) => n.textContent.trim());
  return { hayCard: Boolean(card), src: img ? img.src.slice(0, 30) : null, notas };
});
await page.screenshot({ path: `${OUT}/02-resultado-${MODELO}.png` });
const mock = await page.evaluate(() => ({ jobs: window.__ZONAS__.jobs, apiPrompts: window.__ZONAS__.apiPrompts, flowRequests: window.__ZONAS__.flowRequests, flowPrompts: window.__ZONAS__.flowPrompts.map((p) => p.prompt), masks: window.__ZONAS__.masks }));

let pixeles = null;
if (resultado.hayCard) {
  pixeles = await page.evaluate(async () => {
    const card = document.querySelector('#grid .card');
    const img = card.querySelector('img');
    await new Promise((ok, mal) => { if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = mal; } });
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    c.getContext('2d').drawImage(img, 0, 0, 256, 256);
    const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 256, 256).data;
    const muestra = (x, y) => { const i = (y * 256 + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    if (window.__SINGLE__) return { zona1: muestra(128, 128), zona2: muestra(128, 128) };
    return { zona1: muestra(69, 77), zona2: muestra(184, 174) };
  });
}

const info = {
  modelo: MODELO,
  arranque,
  zonas,
  trasAplicar,
  resultado,
  mock,
  pixeles,
  errores: errores.filter((e) => !e.includes('404')).slice(0, 8),
};
const okZonas = MODELO === 'direct-single' ? (info.zonas.items === 1 && info.zonas.panel) : (info.zonas.items === 2 && info.zonas.panel);
const okPrompts = MODELO === 'direct-single'
  ? ((info.mock.jobs.length === 1 && String(info.mock.jobs[0].prompt).includes('cian'))
    || (info.mock.flowRequests === 1 && String(info.mock.flowPrompts[0] || '').includes('cian')))
  : MODELO === 'flow'
  ? info.mock.flowRequests === 2 && info.mock.flowPrompts.every((p, i) => p.includes(i === 0 ? 'cian' : 'verde'))
  : info.mock.jobs.length === 2 && info.mock.jobs.every((j, i) => String(j.prompt).includes(i === 0 ? 'cian' : 'verde'));
const okMascaras = MODELO === 'flow' || MODELO === 'direct-single' ? true : (info.mock.jobs.length === 2 && info.mock.jobs.every((j) => String(j.mask).startsWith('data:image/png')) && info.mock.masks[0] > 1000);
const okColor = MODELO === 'direct-single'
  ? (info.pixeles && info.pixeles.zona1[2] > 170 && info.pixeles.zona1[0] < 90)
  : (info.pixeles && info.pixeles.zona1[2] > 170 && info.pixeles.zona1[0] < 90 && info.pixeles.zona2[1] > 120 && info.pixeles.zona2[0] < 120);
const ok = okZonas && okPrompts && okMascaras && info.resultado.hayCard && okColor && info.errores.length === 0;
info.ok = ok;
fs.writeFileSync(`${OUT}/03-local-${MODELO}.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
console.log(ok ? `\nPASS (${MODELO}): 2 zonas con su prompt → una imagen final con ambas` : `\nFALLO (${MODELO}) en la máscara por zonas`);
await browser.close();
servidor.close();
process.exit(ok ? 0 : 1);
