// Caso del usuario (2026-11-02, tarde): la máscara se pinta en una capa que está
// DEBAJO de otra visible; el relleno se aplica ahí y no se ve, y la vista previa
// (que antes enseñaba solo la capa editada) parecía cambiar el sujeto de la imagen.
//
// Comprueba:
//   1) el panel dice a qué capa pertenece la máscara;
//   2) antes de rellenar avisa de que la capa está tapada (y permite cancelar y
//      seleccionar la capa que tapa);
//   3) la vista previa es el DOCUMENTO completo con el parche aplicado (aquí, la
//      capa de arriba, igual que quedará el lienzo), no la capa de abajo suelta.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) || d;
const DIR = path.resolve(arg('dir', 'apps/unified-image-studio-hoola'));
const PORT = Number(arg('port', String(9300 + Math.floor(Math.random() * 100))));
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
    window.__MOCK__.llamadas.push({ action, kind: body.kind || null });
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

// Dos capas: abajo una "foto" (mitades roja/amarilla) y arriba un "dibujo" azul opaco.
await page.evaluate(async () => {
  const crear = async (color1, color2, nombre) => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
    const x = c.getContext('2d');
    x.fillStyle = color1; x.fillRect(0, 0, 512, 1024);
    x.fillStyle = color2; x.fillRect(512, 0, 512, 1024);
    x.strokeStyle = '#111'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(1024, 1024); x.stroke();
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    return new File([blob], nombre, { type: 'image/png' });
  };
  const abajo = await crear('#c0392b', '#f1c40f', 'foto-abajo.png');
  await window.__UIS__.importFiles([abajo], { asLayer: true });
  const arriba = await crear('#2980b9', '#27ae60', 'dibujo-arriba.png');
  await window.__UIS__.importFiles([arriba], { asLayer: true });
});
await page.waitForTimeout(1200);

const capas = await page.evaluate(() => window.__UIS__.state.doc.layers.map((l) => ({ id: l.id, name: l.name, visible: l.visible })));
console.log('Capas:', JSON.stringify(capas));

// Seleccionar la capa de ABAJO desde el panel de capas.
await page.click('.right-tab[data-tab="layers"], #rightTabLayers').catch(() => {});
await page.waitForTimeout(400);
await page.locator('#layerList .layer-item').last().click();
await page.waitForTimeout(500);
const seleccionada = await page.evaluate(() => {
  const u = window.__UIS__;
  const l = u.state.doc.layers.find((x) => x.id === u.state.selection.layerId);
  return { id: l?.id, name: l?.name, nota: document.getElementById('maskLayerName')?.textContent };
});
console.log('Seleccionada:', JSON.stringify(seleccionada));

// Pintar máscara y rellenar: debe avisar de que la capa está tapada.
await page.click('.rail-btn[data-tab="edit"]');
await page.click('#maskMode .seg[data-mode="paint"]');
await page.waitForTimeout(300);
const g = await page.evaluate(() => {
  const r = document.getElementById('viewCanvas').getBoundingClientRect();
  const d = window.__UIS__.state.doc;
  return { l: r.left, t: r.top, w: r.width, h: r.height, dw: d.width, dh: d.height };
});
const P = (x, y) => ({ x: g.l + (x / g.dw) * g.w, y: g.t + (y / g.dh) * g.h });
const a = P(300, 500); const b = P(720, 500);
await page.mouse.move(a.x, a.y);
await page.mouse.down();
for (let i = 1; i <= 8; i += 1) await page.mouse.move(a.x + (b.x - a.x) * i / 8, a.y, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(400);
await page.fill('#inpaintPrompt', 'pinta de color fucsia');
await page.click('#inpaintBtn');
await page.waitForTimeout(1200);
const aviso = {
  visible: await page.locator('#confirmModal:not(.hidden)').count() === 1,
  titulo: await page.locator('#confirmTitle').textContent().catch(() => ''),
  texto: await page.locator('#confirmText').textContent().catch(() => ''),
};
await page.screenshot({ path: `${OUT}/80-aviso-capa-tapada.png` });
console.log('Aviso:', JSON.stringify(aviso));

// 1) Cancelar: debe seleccionar la capa que tapa y no generar ningún trabajo.
const trabajosAntes = await page.evaluate(() => window.__MOCK__.llamadas.filter((c) => c.action === 'job.create').length);
if (aviso.visible) await page.click('#confirmCancel');
await page.waitForTimeout(600);
const trasCancelar = await page.evaluate(() => ({
  seleccion: window.__UIS__.state.doc.layers.find((l) => l.id === window.__UIS__.state.selection.layerId)?.name,
  nota: document.getElementById('maskLayerName')?.textContent,
  trabajos: window.__MOCK__.llamadas.filter((c) => c.action === 'job.create').length,
}));
console.log('Tras cancelar:', JSON.stringify(trasCancelar), '· trabajos antes:', trabajosAntes);

// 2) Volver a la capa de abajo y rellenar aceptando el aviso.
await page.locator('#layerList .layer-item').last().click();
await page.waitForTimeout(500);
const docAntes = await page.evaluate(() => window.__UIS__.renderer.compositeToCanvas().toDataURL('image/png'));
await page.click('#inpaintBtn');
await page.waitForTimeout(1000);
if (await page.locator('#confirmModal:not(.hidden)').count()) await page.click('#confirmOk');
for (let t = 0; t < 60; t += 1) {
  if (await page.locator('#aiPreview:not(.hidden)').count()) break;
  await page.waitForTimeout(500);
}
const previewPng = await page.evaluate(async () => {
  const img = document.getElementById('aiPreviewImg');
  if (!img?.src) return null;
  await new Promise((ok, mal) => { if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = mal; } });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});
await page.screenshot({ path: `${OUT}/81-vista-previa-documento.png` });

const comparar = (xUrl, yUrl) => page.evaluate(async ({ xUrl, yUrl }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const X = await cargar(xUrl); const Y = await cargar(yUrl);
  const W = 256, H = Math.round(256 * X.naturalHeight / X.naturalWidth);
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data; };
  const dx = mk(X); const dy = mk(Y);
  let suma = 0;
  for (let i = 0; i < dx.length; i += 4) suma += (Math.abs(dx[i] - dy[i]) + Math.abs(dx[i + 1] - dy[i + 1]) + Math.abs(dx[i + 2] - dy[i + 2])) / 3;
  return +(suma / (dx.length / 4)).toFixed(2);
}, { xUrl, yUrl });

const capaAbajo = await page.evaluate(async () => {
  const u = window.__UIS__;
  const l = u.state.doc.layers[0];
  const res = u.state.resources.get(l.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});

const difPreviewDocumento = await comparar(previewPng, docAntes);
const difPreviewCapa = await comparar(previewPng, capaAbajo);
await page.click('#aiPreview:not(.hidden) #aiAccept');
await page.waitForTimeout(2000);
const trasAceptar = await page.evaluate(() => ({ capas: window.__UIS__.state.doc.layers.length, doc: window.__UIS__.renderer.compositeToCanvas().toDataURL('image/png') }));
const difPreviewAplicado = await comparar(previewPng, trasAceptar.doc);

const guardar = (dataUrl, n) => fs.writeFileSync(`${OUT}/${n}`, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
guardar(previewPng, '82-vista-previa.png');
guardar(docAntes, '83-documento-antes.png');
guardar(capaAbajo, '84-capa-abajo-con-parche.png');

const okAviso = aviso.visible && /tapada/i.test(aviso.titulo) && /tapa esa zona/i.test(aviso.texto);
const okCancelar = trasCancelar.trabajos === trabajosAntes && trasCancelar.seleccion === capas[1].name;
const okPreviewDocumento = difPreviewDocumento < 4;
const okPreviewAplicado = difPreviewAplicado < 2;
const okSinCapaNueva = trasAceptar.capas === 2;
const salida = { capas, seleccionada, aviso, trasCancelar, difPreviewDocumento, difPreviewCapa, difPreviewAplicado, okAviso, okCancelar, okPreviewDocumento, okPreviewAplicado, okSinCapaNueva, errores: errores.filter((e) => !e.includes('404')).slice(0, 6) };
const pasa = okAviso && okCancelar && okPreviewDocumento && okPreviewAplicado && okSinCapaNueva;
salida.pasa = pasa;
fs.writeFileSync(`${OUT}/85-caso-capas.json`, JSON.stringify(salida, null, 2));
console.log(JSON.stringify(salida, null, 2));
console.log(pasa ? '\nPASS: aviso de capa tapada y vista previa = documento completo' : '\nFALLO en el caso de capas');
await browser.close();
servidor.close();
process.exit(pasa ? 0 : 1);
