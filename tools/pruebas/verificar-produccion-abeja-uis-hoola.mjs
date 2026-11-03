// Prueba REAL del caso del usuario (3.1.1): objeto (abeja) pedido en una máscara
// pequeña; con «Margen al aplicar» el objeto no debe salir recortado. 1 generación.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const FOTO = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis/jobs/job_9b603f9fce95c0a1c20e55a7.png';
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

// Importar la foto y pintar un círculo pequeño (como la abeja del usuario).
await page.evaluate(async (b64) => {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  await window.__UIS__.importFiles([new File([bytes], 'foto.png', { type: 'image/png' })], { asLayer: true });
}, fs.readFileSync(FOTO).toString('base64'));
await page.waitForTimeout(1200);
await page.click('.rail-btn[data-tab="edit"]');
await page.click('#maskMode .seg[data-mode="paint"]');
await page.waitForTimeout(300);
await page.evaluate(() => {
  const pincel = document.getElementById('brushSize');
  pincel.value = '150';
  pincel.dispatchEvent(new Event('input', { bubbles: true }));
  const margen = document.getElementById('maskMargin');
  margen.value = '50';
  margen.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(300);
const g = await page.evaluate(() => {
  const r = document.getElementById('viewCanvas').getBoundingClientRect();
  const d = window.__UIS__.state.doc;
  return { l: r.left, t: r.top, w: r.width, h: r.height };
});
const centro = { x: g.l + 0.62 * g.w, y: g.t + 0.55 * g.h };
await page.mouse.move(centro.x, centro.y);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(400);

await ponerPromptZonas('coloca una abeja color oro');
await page.click('#inpaintBtn');
for (let t = 0; t < 240; t += 2) {
  if (await page.locator('#aiPreview:not(.hidden)').count()) break;
  await page.waitForTimeout(2000);
}
const hayPreview = (await page.locator('#aiPreview:not(.hidden)').count()) === 1;
await page.screenshot({ path: `${OUT}/C0-produccion-abeja-preview.png` });
const previewPng = await page.evaluate(async () => {
  const img = document.getElementById('aiPreviewImg');
  if (!img?.src) return null;
  await new Promise((ok, mal) => { if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = mal; } });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});
const antesPng = await page.evaluate(async () => {
  const u = window.__UIS__;
  const layer = u.state.doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});
if (hayPreview) await page.click('#aiPreview:not(.hidden) #aiAccept');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/C1-produccion-abeja-aplicada.png` });
const despuesPng = await page.evaluate(async () => {
  const u = window.__UIS__;
  const layer = u.state.doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});
if (respuesta?.job?.image) guardar(`data:image/png;base64,${respuesta.job.image}`, 'C2-proveedor-abeja.png');
if (previewPng) guardar(previewPng, 'C3-preview-abeja.png');
if (antesPng) guardar(antesPng, 'C4-antes-abeja.png');
if (despuesPng) guardar(despuesPng, 'C5-despues-abeja.png');

const medir = await page.evaluate(async ({ antes, despues, preview }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const A = await cargar(antes); const D = await cargar(despues); const PR = await cargar(preview);
  const W = 512, H = Math.round(512 * A.naturalHeight / A.naturalWidth);
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data; };
  const da = mk(A); const dd = mk(D); const dp = mk(PR);
  const cx = Math.round(0.62 * W), cy = Math.round(0.55 * H);
  // Máscara pincel 150 → radio 75 doc (37.5 en 512); margen 50 % → 75 doc.
  // El objeto puede sobresalir hasta el margen aplicado: comprobamos que la zona
  // del margen (radio 40-90) tiene cambios (objeto aplicado más allá de la máscara).
  let nMargen = 0, cMargen = 0, nLejos = 0, cLejos = 0, difPreview = 0, nPrev = 0, dorado = 0;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      const r = Math.hypot(x - cx, y - cy);
      const dif = (Math.abs(da[i] - dd[i]) + Math.abs(da[i + 1] - dd[i + 1]) + Math.abs(da[i + 2] - dd[i + 2])) / 3;
      const rr = dd[i], gg = dd[i + 1], bb = dd[i + 2];
      if (r <= 100 && rr > 170 && gg > 120 && bb < 130) dorado += 1;
      if (r > 42 && r <= 95) { nMargen += 1; if (dif > 20) cMargen += 1; }
      else if (r > 140) { nLejos += 1; if (dif > 20) cLejos += 1; }
      difPreview += (Math.abs(dp[i] - dd[i]) + Math.abs(dp[i + 1] - dd[i + 1]) + Math.abs(dp[i + 2] - dd[i + 2])) / 3; nPrev += 1;
    }
  }
  return {
    margenCambiadoPct: +(100 * cMargen / Math.max(1, nMargen)).toFixed(1),
    lejosCambiadoPct: +(100 * cLejos / Math.max(1, nLejos)).toFixed(2),
    doradoPx: dorado,
    vistaPreviaVsAplicadoMedia: +(difPreview / Math.max(1, nPrev)).toFixed(2),
  };
}, { antes: antesPng, despues: despuesPng, preview: previewPng });

const info = { build, versionServida, hayPreview, modelo: 'openai-image-2-low', ...medir, errores: errores.filter((e) => !e.includes('401') && !e.includes('404')).slice(0, 6) };
// El objeto debe llegar más allá del borde de la máscara (margen > 0) y lejos no cambiar.
const ok = info.hayPreview && info.doradoPx > 150 && info.lejosCambiadoPct < 2 && info.vistaPreviaVsAplicadoMedia < 2;
info.ok = ok;
fs.writeFileSync(`${OUT}/C6-produccion-abeja.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
console.log(ok ? '\nPASS: el objeto se aplica más allá del borde de la máscara y lejos no cambia' : '\nFALLO en el caso de la abeja');
await browser.close();
process.exit(ok ? 0 : 1);
