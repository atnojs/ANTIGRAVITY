// Verificación en PRODUCCIÓN del caso del usuario (máscara pequeña + «pinta de color
// fucsia»): la vista previa debe mostrar SOLO lo que se aplicará y, al aceptar, fuera
// de la máscara la capa no debe cambiar. Además comprueba el color/opacidad de la
// máscara (a 100 % tapa la imagen con el color elegido).
//
// Uso: node tools/pruebas/verificar-produccion-mascara-color-uis-hoola.mjs [foto]
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const FOTO = process.argv[2] || 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis/jobs/job_9b603f9fce95c0a1c20e55a7.png';
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
let enviado = null; let respuesta = null;
page.on('request', (r) => { if (r.url().includes('action=job.create')) { try { enviado = r.postDataJSON(); } catch { enviado = null; } } });
page.on('response', async (r) => { if (r.url().includes('action=job.create')) { try { respuesta = await r.json(); } catch { respuesta = null; } } });

async function abrirEditar() {
  for (let i = 0; i < 3; i += 1) {
    if (await page.locator('#inpaintBtn').isVisible()) return;
    await page.click('.rail-btn[data-tab="edit"]');
    await page.waitForTimeout(600);
  }
}

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(800);
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: JSON.stringify({ password: k }) });
}, password);
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);
const build = await page.evaluate(() => window.__UIS__?.build);
const versionServida = await page.evaluate(async () => (await (await fetch('api.php?action=state', { credentials: 'same-origin' })).json()).version);

// Importar la foto de detalle.
await page.evaluate(async (b64) => {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  await window.__UIS__.importFiles([new File([bytes], 'foto.png', { type: 'image/png' })], { asLayer: true });
}, fs.readFileSync(FOTO).toString('base64'));
await page.waitForTimeout(1200);

// Pintar una zona pequeña en el centro (como la boca de la captura del usuario).
await abrirEditar();
await page.click('#maskMode .seg[data-mode="paint"]');
await page.waitForTimeout(250);
const g = await page.evaluate(() => {
  const r = document.getElementById('viewCanvas').getBoundingClientRect();
  const d = window.__UIS__.state.doc;
  return { l: r.left, t: r.top, w: r.width, h: r.height, dw: d.width, dh: d.height };
});
const P = (x, y) => ({ x: g.l + (x / g.dw) * g.w, y: g.t + (y / g.dh) * g.h });
const a = P(470, 512); const b = P(554, 512);
await page.mouse.move(a.x, a.y);
await page.mouse.down();
for (let i = 1; i <= 8; i += 1) await page.mouse.move(a.x + (b.x - a.x) * i / 8, a.y, { steps: 2 });
await page.mouse.up();
await page.waitForTimeout(400);

// Color llamativo y opacidad 100 % desde los controles nuevos.
const mascara = await page.evaluate(async () => {
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const color = document.getElementById('maskColor');
  color.value = '#00ff00';
  color.dispatchEvent(new Event('input', { bubbles: true }));
  const op = document.getElementById('maskOpacity');
  op.value = '100';
  op.dispatchEvent(new Event('input', { bubbles: true }));
  await dormir(600);
  const ctx = document.getElementById('maskCanvas').getContext('2d');
  const t = ctx.getTransform();
  const sx = Math.round(512 * t.a + t.e);
  const sy = Math.round(512 * t.d + t.f);
  const pixel = Array.from(ctx.getImageData(sx, sy, 1, 1).data);
  return { color: color.value, opacidad: op.value, etiqueta: document.getElementById('maskOpacityValue').textContent, pixel };
});
await page.screenshot({ path: `${OUT}/70-produccion-mascara-verde.png` });
console.log('Máscara:', JSON.stringify(mascara));

// Relleno con el prompt del usuario.
await ponerPromptZonas('pinta de color fucsia');
await page.click('#inpaintBtn');
for (let t = 0; t < 240; t += 2) {
  if (await page.locator('#aiPreview:not(.hidden)').count()) break;
  await page.waitForTimeout(2000);
}
const hayPreview = await page.locator('#aiPreview:not(.hidden)').count();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/71-produccion-vista-previa.png` });

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

await page.click('#aiPreview:not(.hidden) #aiAccept');
await page.waitForTimeout(2500);
const despuesPng = await page.evaluate(async () => {
  const u = window.__UIS__;
  const layer = u.state.doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});
await page.screenshot({ path: `${OUT}/72-produccion-despues.png` });

const proveedorPng = respuesta?.job?.image ? `data:image/png;base64,${respuesta.job.image}` : null;
if (proveedorPng) guardar(proveedorPng, '73-produccion-proveedor.png');
if (antesPng) guardar(antesPng, '74-produccion-antes.png');
if (despuesPng) guardar(despuesPng, '75-produccion-despues.png');
if (previewPng) guardar(previewPng, '76-produccion-vista-previa.png');

// Medidas.
const medir = await page.evaluate(async ({ antes, despues, preview, proveedor }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const A = await cargar(antes); const D = await cargar(despues);
  const PR = preview ? await cargar(preview) : null;
  const PV = proveedor ? await cargar(proveedor) : null;
  const W = 512, H = Math.round(512 * A.naturalHeight / A.naturalWidth);
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data; };
  const da = mk(A); const dd = mk(D);
  const dp = PR ? mk(PR) : null; const dv = PV ? mk(PV) : null;
  const dentro = (x, y) => Math.abs(y * 2 - 512) <= 60 && Math.abs(x * 2 - 512) <= 70;
  const margen = (x, y) => !dentro(x, y) && Math.abs(y * 2 - 512) <= 300 && Math.abs(x * 2 - 512) <= 300;
  let nC = 0, cambiosCentro = 0, nM = 0, cambiosMargen = 0, nR = 0, cambiosResto = 0;
  let difPreview = 0, nPrev = 0, difProveedorResto = 0;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      const dif = (Math.abs(da[i] - dd[i]) + Math.abs(da[i + 1] - dd[i + 1]) + Math.abs(da[i + 2] - dd[i + 2])) / 3;
      if (dentro(x, y)) { nC += 1; if (dif > 20) cambiosCentro += 1; }
      else if (margen(x, y)) { nM += 1; if (dif > 20) cambiosMargen += 1; }
      else { nR += 1; if (dif > 20) cambiosResto += 1; }
      if (dp) { difPreview += (Math.abs(dp[i] - dd[i]) + Math.abs(dp[i + 1] - dd[i + 1]) + Math.abs(dp[i + 2] - dd[i + 2])) / 3; nPrev += 1; }
      if (dv && !dentro(x, y) && !margen(x, y)) difProveedorResto += (Math.abs(dv[i] - dd[i]) + Math.abs(dv[i + 1] - dd[i + 1]) + Math.abs(dv[i + 2] - dd[i + 2])) / 3;
    }
  }
  return {
    centroCambiadoPct: +(100 * cambiosCentro / Math.max(1, nC)).toFixed(1),
    margenCambiadoPct: +(100 * cambiosMargen / Math.max(1, nM)).toFixed(1),
    restoCambiadoPct: +(100 * cambiosResto / Math.max(1, nR)).toFixed(2),
    vistaPreviaVsAplicadoMedia: +(difPreview / Math.max(1, nPrev)).toFixed(2),
    proveedorRestoMedia: +(difProveedorResto / Math.max(1, nR)).toFixed(2),
  };
}, { antes: antesPng, despues: despuesPng, preview: previewPng, proveedor: proveedorPng });

const info = { build, versionServida, modelo: enviado?.model, hayPreview: hayPreview === 1, mascara, ...medir, errores: errores.filter((e) => !e.includes('401') && !e.includes('404')).slice(0, 6) };
const ok = info.hayPreview
  && info.centroCambiadoPct > 10
  && info.margenCambiadoPct > 8
  && info.restoCambiadoPct < 1
  && info.vistaPreviaVsAplicadoMedia < 2
  && info.mascara.pixel[3] > 240
  && info.mascara.color === '#00ff00';
fs.writeFileSync(`${OUT}/77-produccion-mascara-color.json`, JSON.stringify({ ok, ...info }, null, 2));
console.log(JSON.stringify({ ok, ...info }, null, 2));
console.log(ok ? '\nPASS: vista previa = aplicado, margen aplicado y resto intacto' : '\nFALLO: revisar medidas');
await browser.close();
process.exit(ok ? 0 : 1);
