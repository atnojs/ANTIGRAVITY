// Verificación en PRODUCCIÓN de «Margen al aplicar» (3.1.0), SIN gastar generaciones:
// se intercepta job.create para devolver una imagen de proveedor con un objeto
// GRANDE (disco de radio 150 px) centrado en una máscara pequeña (radio ~60 px).
// Debe aplicarse el objeto completo (gracias al margen), no recortado.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const proveedorB64 = fs.readFileSync(`${OUT}/objeto-grande-proveedor.png`).toString('base64');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));

await page.route('**/api.php?action=job.create', async (route) => {
  let body = {};
  try { body = route.request().postDataJSON(); } catch { body = {}; }
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      job: {
        id: 'job_mock_grande',
        status: 'succeeded',
        kind: body.kind || 'inpaint',
        model: body.model || 'openai-image-2-low',
        provider: 'mock',
        image: proveedorB64,
        mimeType: 'image/png',
        width: 1024,
        height: 1024,
      },
    }),
  });
});

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(800);
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: JSON.stringify({ password: k }) });
}, password);
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);
const build = await page.evaluate(() => window.__UIS__?.build);
const versionServida = await page.evaluate(async () => (await (await fetch('api.php?action=state', { credentials: 'same-origin' })).json()).version);

// Una sola capa de prueba.
await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#c0392b'; x.fillRect(0, 0, 512, 1024);
  x.fillStyle = '#27ae60'; x.fillRect(512, 0, 512, 1024);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  await window.__UIS__.importFiles([new File([blob], 'prueba-margen.png', { type: 'image/png' })], { asLayer: true });
});
await page.waitForTimeout(1200);
await page.click('.rail-btn[data-tab="edit"]');
await page.click('#maskMode .seg[data-mode="paint"]');
await page.waitForTimeout(300);
// Pincel de 120 px (máscara radio ~60) y margen al 100 % (120 px).
await page.evaluate(() => {
  const pincel = document.getElementById('brushSize');
  pincel.value = '120';
  pincel.dispatchEvent(new Event('input', { bubbles: true }));
  const margen = document.getElementById('maskMargin');
  margen.value = '100';
  margen.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(300);
const g = await page.evaluate(() => {
  const r = document.getElementById('viewCanvas').getBoundingClientRect();
  const d = window.__UIS__.state.doc;
  return { l: r.left, t: r.top, w: r.width, h: r.height, dw: d.width, dh: d.height };
});
const centro = { x: g.l + 0.5 * g.w, y: g.t + 0.5 * g.h };
await page.mouse.move(centro.x, centro.y);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(400);

await page.fill('#inpaintPrompt', 'coloca una abeja color oro');
await page.click('#inpaintBtn');
for (let t = 0; t < 120; t += 1) {
  if (await page.locator('#aiPreview:not(.hidden)').count()) break;
  await page.waitForTimeout(500);
}
const hayPreview = (await page.locator('#aiPreview:not(.hidden)').count()) === 1;
await page.screenshot({ path: `${OUT}/B0-produccion-margen-preview.png` });
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
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/B1-produccion-margen-aplicado.png` });
const despuesPng = await page.evaluate(async () => {
  const u = window.__UIS__;
  const layer = u.state.doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});

const medir = await page.evaluate(async ({ antes, despues, preview }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const A = await cargar(antes); const D = await cargar(despues);
  const PR = preview ? await cargar(preview) : null;
  const W = 512, H = 512;
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data; };
  const da = mk(A); const dd = mk(D); const dp = PR ? mk(PR) : null;
  const cx = 256, cy = 256;
  let nObjeto = 0, cObjeto = 0, nLejos = 0, cLejos = 0, difPreview = 0, nPrev = 0;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      const r = Math.hypot(x - cx, y - cy);
      const dif = (Math.abs(da[i] - dd[i]) + Math.abs(da[i + 1] - dd[i + 1]) + Math.abs(da[i + 2] - dd[i + 2])) / 3;
      // Objeto del proveedor: disco de radio 75 (en 512) → se espera aplicado hasta ~75.
      if (r <= 70) { nObjeto += 1; if (dif > 20) cObjeto += 1; }
      else if (r >= 120) { nLejos += 1; if (dif > 20) cLejos += 1; }
      if (dp) { difPreview += (Math.abs(dp[i] - dd[i]) + Math.abs(dp[i + 1] - dd[i + 1]) + Math.abs(dp[i + 2] - dd[i + 2])) / 3; nPrev += 1; }
    }
  }
  return {
    objetoAplicadoPct: +(100 * cObjeto / Math.max(1, nObjeto)).toFixed(1),
    lejosCambiadoPct: +(100 * cLejos / Math.max(1, nLejos)).toFixed(2),
    vistaPreviaVsAplicadoMedia: +(difPreview / Math.max(1, nPrev)).toFixed(2),
  };
}, { antes: antesPng, despues: despuesPng, preview: previewPng });

const info = { build, versionServida, hayPreview, ...medir, errores: errores.filter((e) => !e.includes('401') && !e.includes('404')).slice(0, 6) };
// El objeto (radio 70 en la medida) debe estar aplicado casi entero y lejos no cambiar.
const ok = info.hayPreview
  && info.objetoAplicadoPct > 90
  && info.lejosCambiadoPct < 2
  && info.vistaPreviaVsAplicadoMedia < 2
  && info.errores.length === 0;
info.ok = ok;
fs.writeFileSync(`${OUT}/B2-produccion-margen.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
console.log(ok ? '\nPASS: el objeto mayor que la máscara se aplica completo y lejos no cambia' : '\nFALLO en el margen de aplicación');
await browser.close();
process.exit(ok ? 0 : 1);
