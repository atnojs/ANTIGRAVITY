// Banco LOCAL de la máscara de UIS·Hoola: sirve la app por HTTP y simula el
// proveedor con la PEOR respuesta posible (reescribe TODA la imagen aunque la
// máscara pida solo una franja). Sirve para comprobar, sin gastar API, que el
// resultado aplicado solo cambia dentro de la máscara.
//
// Uso:
//   node tools/pruebas/local-mascara-uis-hoola.mjs --dir=apps/unified-image-studio-hoola --expect=pass
//   node tools/pruebas/local-mascara-uis-hoola.mjs --dir=tools/pruebas/tmp-old-uis --expect=fail
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) || d;
const DIR = path.resolve(arg('dir', 'apps/unified-image-studio-hoola'));
const EXPECT = arg('expect', 'pass');
const PORT = Number(arg('port', String(8800 + Math.floor(Math.random() * 100))));
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };

const servidor = http.createServer((req, res) => {
  const limpio = decodeURIComponent(req.url.split('?')[0]);
  const destino = path.join(DIR, limpio === '/' ? 'index.html' : limpio);
  if (!destino.startsWith(DIR) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
    res.writeHead(404); res.end('no'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(destino).pipe(res);
});
await new Promise((ok) => servidor.listen(PORT, '127.0.0.1', ok));
const URL_BASE = `http://127.0.0.1:${PORT}/`;
console.log('Sirviendo', DIR, 'en', URL_BASE, '· esperado:', EXPECT);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const consola = [];
page.on('console', (m) => { if (m.type() === 'error') consola.push(m.text()); });
page.on('pageerror', (e) => consola.push('pageerror: ' + e.message));

// Proveedor falso: recibe la composición y devuelve TODA la imagen teñida de magenta.
await page.addInitScript(() => {
  const json = (obj) => new Response(JSON.stringify(obj), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const cargar = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
  async function resultados() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
    const x = c.getContext('2d');
    x.fillStyle = '#7a00a8'; x.fillRect(0, 0, 1024, 1024);
    x.strokeStyle = '#00ff66'; x.lineWidth = 26;
    for (let i = -1024; i < 1024; i += 120) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 1024, 1024); x.stroke(); }
    return c.toDataURL('image/png');
  }
  window.__MOCK__ = { llamadas: [] };
  const original = window.fetch.bind(window);
  window.fetch = async (entrada, init = {}) => {
    const url = typeof entrada === 'string' ? entrada : (entrada?.url || '');
    if (!url.includes('api.php')) return original(entrada, init);
    const u = new URL(url, location.href);
    const action = u.searchParams.get('action') || '';
    let body = {};
    try { body = typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch { body = {}; }
    window.__MOCK__.llamadas.push({ action, kind: body.kind || null, model: body.model || null });
    if (action === 'state') return json({ ok: true, version: '3.0.1-test', authenticated: true, configured: true, needsSetup: false, sharedSession: true, maxImageBytes: 14979657, php: '8.3', sqlite: true, curl: true });
    if (action === 'catalog') return json({ ok: true, providers: { openai: true, openrouter: true }, models: ['openai-image-2-low', 'gemini-2', 'qwen-pro'] });
    if (action === 'job.create' || action === 'generate') {
      const png = await resultados();
      const job = { id: 'job_mock_' + Date.now(), status: 'succeeded', kind: body.kind || 'generate', model: body.model || '', provider: 'mock', image: png.split(',')[1], mimeType: 'image/png', width: 1024, height: 1024, createdAt: Math.floor(Date.now() / 1000), updatedAt: Math.floor(Date.now() / 1000) };
      window.__MOCK__.ultimo = job;
      return json({ ok: true, job });
    }
    if (action === 'job.get') return json({ ok: true, job: window.__MOCK__.ultimo || { id: 'job_mock', status: 'succeeded' } });
    if (action === 'project.list') return json({ ok: true, projects: [] });
    if (action === 'resource') return new Response('', { status: 404 });
    return json({ ok: true });
  };
});

await page.goto(URL_BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
const arranque = await page.evaluate(() => ({
  uis: Boolean(window.__UIS__),
  build: window.__UIS__?.build,
  problemas: (window.__UIS_DIAG__?.problems || []).slice(0, 4),
  modelo: window.__UIS__?.state?.ui?.model,
  modulos: (() => {
    const cuenta = {};
    for (const r of performance.getEntriesByType('resource')) {
      const m = r.name.match(/\/assets\/js\/([^/?]+)/);
      if (!m) continue;
      cuenta[m[1]] = (cuenta[m[1]] || 0) + 1;
    }
    return cuenta;
  })(),
}));
console.log('Arranque:', JSON.stringify(arranque), 'consola:', consola.slice(0, 3));
if (!arranque.uis) { console.log('FALLO: la app no arrancó'); await browser.close(); servidor.close(); process.exit(3); }

// Importar imagen de prueba (cuadrantes de color).
await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#c0392b'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#27ae60'; x.fillRect(512, 0, 512, 512);
  x.fillStyle = '#2980b9'; x.fillRect(0, 512, 512, 512);
  x.fillStyle = '#f1c40f'; x.fillRect(512, 512, 512, 512);
  x.strokeStyle = '#111'; x.lineWidth = 10;
  x.beginPath(); x.moveTo(0, 0); x.lineTo(1024, 1024); x.stroke();
  x.beginPath(); x.moveTo(1024, 0); x.lineTo(0, 1024); x.stroke();
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  await window.__UIS__.importFiles([new File([blob], 'prueba.png', { type: 'image/png' })], { asLayer: true });
});
await page.waitForTimeout(1200);

async function pintar(y) {
  for (let intento = 0; intento < 3; intento += 1) {
    if (await page.locator('#inpaintPrompt').isVisible()) break;
    await page.click('.rail-btn[data-tab="edit"]');
    await page.waitForTimeout(600);
  }
  await page.click('#maskMode .seg[data-mode="paint"]');
  await page.waitForTimeout(250);
  const g = await page.evaluate(() => {
    const r = document.getElementById('viewCanvas').getBoundingClientRect();
    const d = window.__UIS__.state.doc;
    return { l: r.left, t: r.top, w: r.width, h: r.height, dw: d.width, dh: d.height, tool: window.__UIS__.state.selection.tool };
  });
  const P = (x, yy) => ({ x: g.l + (x / g.dw) * g.w, y: g.t + (yy / g.dh) * g.h });
  const a = P(260, y); const b = P(764, y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(a.x + (b.x - a.x) * i / 10, a.y, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  console.log('   pintado:', JSON.stringify(await page.evaluate(() => {
    const u = window.__UIS__;
    const l = u.state.doc.layers.find((x) => x.id === u.state.selection.layerId) || u.state.doc.layers[0];
    return { tool: u.state.selection.tool, trazos: l.mask?.strokes?.length || 0, geometria: document.getElementById('viewCanvas').getBoundingClientRect().width };
  })));
}

async function rellenar(prompt) {
  // Garantiza que la pestaña Editar esté abierta (el panel pudo cerrarse al
  // pulsar otra pestaña): sin esto, el campo no está visible.
  for (let intento = 0; intento < 3; intento += 1) {
    if (await page.locator('#inpaintPrompt').isVisible()) break;
    await page.click('.rail-btn[data-tab="edit"]');
    await page.waitForTimeout(600);
  }
  await page.fill('#inpaintPrompt', prompt);
  const previo = await page.evaluate(() => {
    const u = window.__UIS__;
    const l = u.state.doc?.layers?.find((x) => x.id === u.state.selection.layerId) || u.state.doc?.layers?.[0] || null;
    return {
      capa: l ? { id: l.id, trazos: l.mask?.strokes?.length || 0 } : null,
      prompt: document.getElementById('inpaintPrompt').value.slice(0, 40),
      modo: u.state.ui.mode,
      modelo: u.state.ui.model,
      doc: Boolean(u.state.doc),
    };
  });
  console.log('   antes de rellenar:', JSON.stringify(previo));
  await page.click('#inpaintBtn');
  for (let t = 0; t < 60; t += 1) {
    if (await page.locator('#aiPreview:not(.hidden)').count()) break;
    if (await page.locator('#resultTray:not(.hidden)').count()) break;
    await page.waitForTimeout(500);
  }
  const hay = await page.locator('#aiPreview:not(.hidden)').count();
  const diag = await page.evaluate(() => ({
    llamadas: window.__MOCK__?.llamadas?.slice(-6),
    ultimoJob: window.__MOCK__?.ultimo ? { status: window.__MOCK__.ultimo.status, len: (window.__MOCK__.ultimo.image || '').length } : null,
    toasts: [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()).slice(-4),
    loading: !document.getElementById('loadingOverlay')?.classList.contains('hidden'),
    tray: !document.getElementById('resultTray')?.classList.contains('hidden'),
    preview: !document.getElementById('aiPreview')?.classList.contains('hidden'),
  }));
  if (!hay) console.log('DIAG sin vista previa:', JSON.stringify(diag));
  const previewPng = hay ? await page.evaluate(async () => {
    const img = document.getElementById('aiPreviewImg');
    if (!img?.src) return null;
    await new Promise((ok, mal) => { if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = mal; } });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  }) : null;
  const boton = hay ? '#aiPreview:not(.hidden) #aiAccept' : '#acceptResult';
  await page.click(boton);
  await page.waitForTimeout(1800);
  return { preview: hay, previewPng };
}

const compararPngs = (aUrl, bUrl) => page.evaluate(async ({ aUrl, bUrl }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const A = await cargar(aUrl); const B = await cargar(bUrl);
  if (A.naturalWidth !== B.naturalWidth || A.naturalHeight !== B.naturalHeight) {
    return { mismasDimensiones: false, a: `${A.naturalWidth}x${A.naturalHeight}`, b: `${B.naturalWidth}x${B.naturalHeight}`, mediaDif: null };
  }
  const W = 256, H = Math.max(1, Math.round(256 * A.naturalHeight / A.naturalWidth));
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data; };
  const da = mk(A); const db = mk(B);
  let suma = 0;
  for (let i = 0; i < da.length; i += 4) suma += (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
  return { mismasDimensiones: true, mediaDif: +(suma / (da.length / 4)).toFixed(2) };
}, { aUrl, bUrl });

const leerPng = () => page.evaluate(async () => {
  const u = window.__UIS__;
  const doc = u.state.doc;
  const layer = doc.layers.find((l) => l.id === u.state.selection.layerId) || doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return { png: c.toDataURL('image/png'), recurso: res.name, capa: layer.name };
});

const medir = (aUrl, bUrl, franjas) => page.evaluate(async ({ aUrl, bUrl, franjas }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const A = await cargar(aUrl); const B = await cargar(bUrl);
  const c1 = document.createElement('canvas'); c1.width = 512; c1.height = 512; c1.getContext('2d').drawImage(A, 0, 0, 512, 512);
  const c2 = document.createElement('canvas'); c2.width = 512; c2.height = 512; c2.getContext('2d').drawImage(B, 0, 0, 512, 512);
  const d1 = c1.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 512, 512).data;
  const d2 = c2.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 512, 512).data;
  const acc = {};
  for (const f of franjas) acc[f.nombre] = [0, 0];
  for (let y = 0; y < 512; y += 2) {
    for (let x = 0; x < 512; x += 2) {
      const i = (y * 512 + x) * 4;
      const dif = (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2])) / 3;
      let cual = 'resto';
      for (const f of franjas) if (Math.abs(y * 2 - f.y) <= f.r) cual = f.nombre;
      if (!acc[cual]) acc[cual] = [0, 0];
      acc[cual][1] += 1;
      if (dif > 24) acc[cual][0] += 1;
    }
  }
  const salida = {};
  for (const k of Object.keys(acc)) salida[k + 'Pct'] = +(100 * acc[k][0] / Math.max(1, acc[k][1])).toFixed(1);
  return salida;
}, { aUrl, bUrl, franjas });

const antes1 = await leerPng();
await pintar(200);
const r1 = await rellenar('Rellena la franja con un color lila plano, sin texto.');
const tras1 = await leerPng();
const m1 = await medir(antes1.png, tras1.png, [{ nombre: 'franja1', y: 200, r: 100 }]);
const v1 = r1.previewPng ? await compararPngs(r1.previewPng, tras1.png) : { mismasDimensiones: false, mediaDif: null };
console.log('Relleno 1:', JSON.stringify({ preview: r1.preview }), JSON.stringify(m1), '· vista previa vs aplicado:', JSON.stringify(v1));

// Recargar: la app recupera el proyecto y las imágenes se cargan de nuevo.
await page.evaluate(() => window.__UIS__.saveNow('test'));
await page.waitForTimeout(2000);
await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
const antes2 = await leerPng();
await pintar(820);
const r2 = await rellenar('Rellena la franja con un color verde plano, sin texto.');
const tras2 = await leerPng();
const m2 = await medir(antes2.png, tras2.png, [{ nombre: 'franja1', y: 200, r: 100 }, { nombre: 'franja2', y: 820, r: 100 }]);
const v2 = r2.previewPng ? await compararPngs(r2.previewPng, tras2.png) : { mismasDimensiones: false, mediaDif: null };
console.log('Relleno 2 (tras recargar):', JSON.stringify({ preview: r2.preview }), JSON.stringify(m2), '· vista previa vs aplicado:', JSON.stringify(v2));

const guardar = (dataUrl, n) => fs.writeFileSync(`${OUT}/${n}`, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));

// 3) Con un modelo que NO admite máscaras (Gemini), el relleno debe viajar con IMAGE 2.
await pintar(820);
const desde = await page.evaluate(() => (window.__MOCK__.llamadas || []).length);
await page.evaluate(() => { window.__UIS__.state.ui.model = 'gemini-pro'; });
await page.fill('#inpaintPrompt', 'pinta un cuadrado amarillo plano');
await page.click('#inpaintBtn');
for (let t = 0; t < 40; t += 1) {
  if (await page.locator('#aiPreview:not(.hidden)').count()) break;
  await page.waitForTimeout(500);
}
const llamada = await page.evaluate((n) => (window.__MOCK__.llamadas || []).slice(n).find((c) => c.action === 'job.create') || null, desde);
console.log('Modelo con Gemini seleccionado →', JSON.stringify(llamada));
await page.evaluate(() => { const b = document.querySelector('#aiPreview:not(.hidden) #aiDiscard'); if (b) b.click(); });
await page.waitForTimeout(600);
guardar(antes1.png, `30-${EXPECT}-antes1.png`);
guardar(tras1.png, `31-${EXPECT}-tras1.png`);
guardar(antes2.png, `32-${EXPECT}-antes2.png`);
guardar(tras2.png, `33-${EXPECT}-tras2.png`);

const ok1 = m1.franja1Pct > 15 && (m1.restoPct || 0) < 3;
const ok2 = m2.franja2Pct > 15 && (m2.restoPct || 0) < 3;
const ok3 = llamada?.model === 'openai-image-2-low';
const okPreview = [v1, v2].every((v) => v.mismasDimensiones && v.mediaDif !== null && v.mediaDif < 2);
const pasa = ok1 && ok2 && ok3 && okPreview;
const resultado = { dir: DIR, expectativa: EXPECT, relleno1: m1, relleno2: m2, modeloConGemini: llamada?.model || null, vistaPreviaVsAplicado: { v1, v2 }, okPreview, pasa, consola: consola.slice(0, 8) };
fs.writeFileSync(`${OUT}/34-local-${EXPECT}.json`, JSON.stringify(resultado, null, 2));
console.log('\nRESULTADO:', JSON.stringify(resultado, null, 2));
const correcto = EXPECT === 'pass' ? pasa : !pasa;
console.log(correcto ? `\nOK: el comportamiento ${pasa ? 'respeta' : 'NO respeta'} la máscara, como se esperaba` : '\nNO COINCIDE con lo esperado');
await browser.close();
servidor.close();
process.exit(correcto ? 0 : 1);
