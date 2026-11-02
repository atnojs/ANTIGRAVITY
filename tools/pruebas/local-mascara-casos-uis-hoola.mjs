// Casos límite de la máscara de UIS·Hoola, en local y sin coste (proveedor simulado
// que reescribe TODA la imagen):
//   A) «Invertir»: el proveedor edita FUERA de lo pintado y la capa debe recibir el
//      cambio fuera, no dentro.
//   B) Vista previa + Escape (deselecciona la capa): «Aceptar» debe aplicarse sobre
//      la capa original (no añadir la imagen entera como capa nueva).
//
// Uso: node tools/pruebas/local-mascara-casos-uis-hoola.mjs [--dir=apps/unified-image-studio-hoola]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) || d;
const DIR = path.resolve(arg('dir', 'apps/unified-image-studio-hoola'));
const PORT = Number(arg('port', String(9100 + Math.floor(Math.random() * 100))));
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
const servidor = http.createServer((req, res) => {
  const limpio = decodeURIComponent(req.url.split('?')[0]);
  const destino = path.join(DIR, limpio === '/' ? 'index.html' : limpio);
  if (!destino.startsWith(DIR) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(destino).pipe(res);
});
await new Promise((ok) => servidor.listen(PORT, '127.0.0.1', ok));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));

await page.addInitScript(() => {
  const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const original = window.fetch.bind(window);
  window.__MOCK__ = { llamadas: [] };
  window.fetch = async (entrada, init = {}) => {
    const url = typeof entrada === 'string' ? entrada : (entrada?.url || '');
    if (!url.includes('api.php')) return original(entrada, init);
    const action = new URL(url, location.href).searchParams.get('action') || '';
    let body = {};
    try { body = typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch { body = {}; }
    window.__MOCK__.llamadas.push({ action, kind: body.kind || null, model: body.model || null });
    if (action === 'state') return json({ ok: true, version: 'test', authenticated: true, configured: true, maxImageBytes: 14979657 });
    if (action === 'catalog') return json({ ok: true, providers: { openai: true, openrouter: true }, models: ['openai-image-2-low'] });
    if (action === 'job.create') {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
      const x = c.getContext('2d');
      x.fillStyle = '#7a00a8'; x.fillRect(0, 0, 1024, 1024);
      x.strokeStyle = '#00ff66'; x.lineWidth = 26;
      for (let i = -1024; i < 1024; i += 120) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 1024, 1024); x.stroke(); }
      const png = c.toDataURL('image/png');
      return json({ ok: true, job: { id: 'job_mock', status: 'succeeded', kind: body.kind, model: body.model, image: png.split(',')[1], mimeType: 'image/png' } });
    }
    return json({ ok: true, projects: [] });
  };
});

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

const importar = async () => page.evaluate(async () => {
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

async function abrirEditar() {
  for (let i = 0; i < 3; i += 1) {
    if (await page.locator('#inpaintPrompt').isVisible()) return;
    await page.click('.rail-btn[data-tab="edit"]');
    await page.waitForTimeout(600);
  }
}

async function pintar() {
  await abrirEditar();
  await page.click('#maskMode .seg[data-mode="paint"]');
  await page.waitForTimeout(250);
  const g = await page.evaluate(() => {
    const r = document.getElementById('viewCanvas').getBoundingClientRect();
    const d = window.__UIS__.state.doc;
    return { l: r.left, t: r.top, w: r.width, h: r.height, dw: d.width, dh: d.height };
  });
  const P = (x, y) => ({ x: g.l + (x / g.dw) * g.w, y: g.t + (y / g.dh) * g.h });
  const a = P(300, 512); const b = P(724, 512);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(a.x + (b.x - a.x) * i / 8, a.y, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function enviar(prompt) {
  await page.fill('#inpaintPrompt', prompt);
  await page.click('#inpaintBtn');
  for (let t = 0; t < 40; t += 1) {
    if (await page.locator('#aiPreview:not(.hidden)').count()) break;
    await page.waitForTimeout(500);
  }
}

const leerCapa = () => page.evaluate(async () => {
  const u = window.__UIS__;
  const doc = u.state.doc;
  const layer = doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return { png: c.toDataURL('image/png'), capas: doc.layers.length, invertida: Boolean(layer.mask?.inverted) };
});

const medirFranja = (antesUrl, despuesUrl) => page.evaluate(async ({ antesUrl, despuesUrl }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const A = await cargar(antesUrl); const B = await cargar(despuesUrl);
  const mk = (img) => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; c.getContext('2d').drawImage(img, 0, 0, 512, 512); return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 512, 512).data; };
  const da = mk(A); const db = mk(B);
  // Zonas: núcleo pintado, margen aplicado (objetos que sobresalen) y resto.
  let nD = 0, cD = 0, nM = 0, cM = 0, nR = 0, cR = 0;
  for (let y = 0; y < 512; y += 2) {
    for (let x = 0; x < 512; x += 2) {
      const i = (y * 512 + x) * 4;
      const dif = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
      const dy = Math.abs(y * 2 - 512);
      if (dy <= 30 && x * 2 >= 330 && x * 2 <= 690) { nD += 1; if (dif > 24) cD += 1; }
      else if (dy <= 300) { nM += 1; if (dif > 24) cM += 1; }
      else { nR += 1; if (dif > 24) cR += 1; }
    }
  }
  return {
    dentroPct: +(100 * cD / Math.max(1, nD)).toFixed(1),
    margenPct: +(100 * cM / Math.max(1, nM)).toFixed(1),
    restoPct: +(100 * cR / Math.max(1, nR)).toFixed(1),
  };
}, { antesUrl, despuesUrl });

const guardar = (dataUrl, n) => fs.writeFileSync(`${OUT}/${n}`, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
const resultados = {};

// ── A) «Invertir» ───────────────────────────────────────────────────────────
await importar();
await page.waitForTimeout(1000);
await pintar();

// Máscara: color elegido y opacidad. A 100 % debe tapar la imagen (alfa alto y
// color elegido); al bajar la opacidad, el alfa baja.
const mascaraVisual = await page.evaluate(async () => {
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const color = document.getElementById('maskColor');
  color.value = '#00ff00';
  color.dispatchEvent(new Event('input', { bubbles: true }));
  const op = document.getElementById('maskOpacity');
  op.value = '100';
  op.dispatchEvent(new Event('input', { bubbles: true }));
  await dormir(500);
  const u = window.__UIS__;
  const ctx = document.getElementById('maskCanvas').getContext('2d');
  const t = ctx.getTransform();
  const sx = Math.round(512 * t.a + t.e);
  const sy = Math.round(512 * t.d + t.f);
  const leer = () => Array.from(ctx.getImageData(sx, sy, 1, 1).data);
  const pixel100 = leer();
  const op30 = document.getElementById('maskOpacity');
  op30.value = '30';
  op30.dispatchEvent(new Event('input', { bubbles: true }));
  await dormir(500);
  const pixel30 = leer();
  return { color: color.value, etiqueta: document.getElementById('maskOpacityValue').textContent, punto: [sx, sy], pixel100, pixel30 };
});
console.log('   máscara visible:', JSON.stringify(mascaraVisual));

await abrirEditar();
await page.click('#invertMaskBtn');
await page.waitForTimeout(500);
const antesA = await leerCapa();
await enviar('pinta un fondo morado con rayas verdes');
const toastInvertido = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()).pop() || '');
await page.click('#aiPreview:not(.hidden) #aiAccept');
await page.waitForTimeout(2000);
const despuesA = await leerCapa();
guardar(antesA.png, '60-invertir-antes.png');
guardar(despuesA.png, '61-invertir-despues.png');
resultados.invertir = { invertida: antesA.invertida, toastVistaPrevia: toastInvertido, ...(await medirFranja(antesA.png, despuesA.png)) };

// ── B) Vista previa + Escape (deselecciona la capa) ─────────────────────────
// Se vacía el documento para partir de una sola capa limpia.
await page.evaluate(() => {
  const u = window.__UIS__;
  u.state.doc.layers = [];
  u.state.selection.layerId = null;
});
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
  await window.__UIS__.importFiles([new File([blob], 'prueba2.png', { type: 'image/png' })], { asLayer: true });
});
await page.waitForTimeout(1000);
const capasAntes = await page.evaluate(() => window.__UIS__.state.doc.layers.length);
await pintar();
const antesB = await leerCapa();
await enviar('pinta un fondo morado con rayas verdes');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const seleccion = await page.evaluate(() => window.__UIS__.state.selection.layerId);
const hayPreview = await page.locator('#aiPreview:not(.hidden)').count();
await page.click('#aiPreview:not(.hidden) #aiAccept');
await page.waitForTimeout(2000);
const despuesB = await leerCapa();
guardar(antesB.png, '62-escape-antes.png');
guardar(despuesB.png, '63-escape-despues.png');
resultados.escape = { capasAntes, capasDespues: despuesB.capas, seleccionTrasEscape: seleccion, previewSeguiaAbierta: hayPreview === 1, ...(await medirFranja(antesB.png, despuesB.png)) };

const okInvertir = resultados.invertir.invertida
  && resultados.invertir.margenPct > 20
  && resultados.invertir.dentroPct < 5
  && /fuera de lo pintado/i.test(resultados.invertir.toastVistaPrevia || '');
const okEscape = resultados.escape.capasAntes === resultados.escape.capasDespues
  && resultados.escape.dentroPct > 15
  && resultados.escape.margenPct > 3
  && resultados.escape.restoPct < 3;
const okMascara = mascaraVisual.color === '#00ff00'
  && mascaraVisual.pixel100[3] > 240
  && mascaraVisual.pixel100[1] > 220
  && mascaraVisual.pixel30[3] < 140;
const salida = { okInvertir, okEscape, okMascara, mascaraVisual, ...resultados, errores: errores.filter((e) => !e.includes('404')).slice(0, 6) };
fs.writeFileSync(`${OUT}/64-casos-limite.json`, JSON.stringify(salida, null, 2));
console.log(JSON.stringify(salida, null, 2));
console.log(okInvertir && okEscape && okMascara ? '\nPASS: «Invertir», vista previa + Escape y color/opacidad de la máscara se comportan como deben' : '\nFALLO en algún caso límite');
await browser.close();
servidor.close();
process.exit(okInvertir && okEscape && okMascara ? 0 : 1);
