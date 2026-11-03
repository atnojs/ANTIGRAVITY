// Verificación en PRODUCCIÓN del caso «capa de la máscara OCULTA» (3.0.8):
// dos capas, la de arriba (seleccionada) con el ojo cerrado. Al rellenar debe
// avisar y, si se acepta, mostrar la capa y continuar; la vista previa debe ser
// el lienzo completo y coincidir con lo aplicado.
//
// Uso: node tools/pruebas/verificar-produccion-mascara-oculta-uis-hoola.mjs
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const guardar = (dataUrl, n) => fs.writeFileSync(`${OUT}/${n}`, Buffer.from(String(dataUrl).slice(String(dataUrl).indexOf(',') + 1), 'base64'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();

// Rellena el prompt de todas las zonas de la máscara (UI 3.2+: un campo por zona;
// en versiones antiguas existía un único #inpaintPrompt).
async function ponerPromptZonas(texto) {
  const viejo = page.locator('#inpaintPrompt');
  if (await viejo.count()) await viejo.fill(texto);
  const campos = page.locator('[data-zone-prompt]');
  const total = await campos.count();
  for (let i = 0; i < total; i += 1) await campos.nth(i).fill(texto);
}
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
let respuesta = null;
page.on('response', async (r) => { if (r.url().includes('action=job.create')) { try { respuesta = await r.json(); } catch { respuesta = null; } } });

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(800);
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: JSON.stringify({ password: k }) });
}, password);
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);
const build = await page.evaluate(() => window.__UIS__?.build);
const versionServida = await page.evaluate(async () => (await (await fetch('api.php?action=state', { credentials: 'same-origin' })).json()).version);

// Dos capas; la de arriba queda seleccionada.
await page.evaluate(async () => {
  const crear = async (c1, c2, nombre) => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
    const x = c.getContext('2d');
    x.fillStyle = c1; x.fillRect(0, 0, 512, 1024);
    x.fillStyle = c2; x.fillRect(512, 0, 512, 1024);
    x.strokeStyle = '#111'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(1024, 1024); x.stroke();
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    await window.__UIS__.importFiles([new File([blob], nombre, { type: 'image/png' })], { asLayer: true });
  };
  await crear('#c0392b', '#f1c40f', 'fondo.png');
  await crear('#2980b9', '#27ae60', 'oculta.png');
});
await page.waitForTimeout(1500);

// Ocultar la capa seleccionada (arriba) con el ojo del panel.
await page.locator('#layerList .layer-item').first().locator('button[aria-label="Ocultar capa"]').click();
await page.waitForTimeout(500);
const notaOculta = await page.evaluate(() => document.getElementById('maskLayerName')?.textContent);
await page.screenshot({ path: `${OUT}/95-produccion-nota-capa-oculta.png` });

// Pintar máscara y rellenar.
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
await ponerPromptZonas('pinta de color fucsia');
await page.click('#inpaintBtn');
await page.waitForTimeout(1500);
const aviso = {
  visible: (await page.locator('#confirmModal:not(.hidden)').count()) === 1,
  titulo: await page.locator('#confirmTitle').textContent().catch(() => ''),
};
await page.screenshot({ path: `${OUT}/96-produccion-aviso-capa-oculta.png` });
if (aviso.visible) await page.click('#confirmOk');
for (let t = 0; t < 240; t += 2) {
  if (await page.locator('#aiPreview:not(.hidden)').count()) break;
  await page.waitForTimeout(2000);
}
const hayPreview = (await page.locator('#aiPreview:not(.hidden)').count()) === 1;
await page.screenshot({ path: `${OUT}/97-produccion-vista-previa-oculta.png` });

const capaYaVisible = await page.evaluate(() => {
  const u = window.__UIS__;
  const capa = u.state.doc.layers.find((l) => l.id === u.state.selection.layerId);
  return capa ? capa.visible : null;
});

const previewPng = await page.evaluate(async () => {
  const img = document.getElementById('aiPreviewImg');
  if (!img?.src) return null;
  await new Promise((ok, mal) => { if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = mal; } });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});
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

await page.click('#aiPreview:not(.hidden) #aiAccept');
await page.waitForTimeout(2500);
const tras = await page.evaluate(() => ({ capas: window.__UIS__.state.doc.layers.length, doc: window.__UIS__.renderer.compositeToCanvas().toDataURL('image/png') }));
const difPreviewAplicado = await comparar(previewPng, tras.doc);
if (previewPng) guardar(previewPng, '98-produccion-vista-previa.png');

const info = {
  build, versionServida, notaOculta, aviso, hayPreview, capaYaVisible,
  difPreviewAplicado, capasDespues: tras.capas, trabajos: respuesta?.job?.status || null,
  errores: errores.filter((e) => !e.includes('401') && !e.includes('404')).slice(0, 6),
};
const ok = info.hayPreview
  && info.aviso.visible && /oculta/i.test(info.aviso.titulo)
  && /CAPA OCULTA/.test(info.notaOculta || '')
  && info.capaYaVisible === true
  && info.difPreviewAplicado < 2
  && info.capasDespues === 2
  && info.errores.length === 0;
info.ok = ok;
fs.writeFileSync(`${OUT}/99-produccion-capa-oculta.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
console.log(ok ? '\nPASS: capa oculta avisada, mostrada y relleno aplicado (vista previa = aplicado)' : '\nFALLO en el caso de capa oculta');
await browser.close();
process.exit(ok ? 0 : 1);
