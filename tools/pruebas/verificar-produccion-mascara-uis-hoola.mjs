// Verificación en PRODUCCIÓN del arreglo de la máscara (UIS·Hoola v3.0.1).
//
// Recrea el escenario real que fallaba:
//   1) foto con detalle, se rellena una franja (primera edición) y se acepta;
//   2) se simula un documento guardado por la versión ANTERIOR dejando
//      `layer.aspectOriginal` apuntando a la imagen previa a la edición
//      (los proyectos de Antonio ya guardados lo tienen);
//   3) se guarda, se recarga la app (la recupera del navegador) y se rellena otra
//      franja.
//
// Con el fallo, el 2.º relleno aplicaba la imagen ENTERA del proveedor. Se mide:
//   - fuera de las franjas y respecto a la imagen de ANTES del 2.º relleno: 0 cambios
//   - fuera de las franjas, la capa NO es igual a lo que devolvió el proveedor
//     (el proveedor sí cambia fuera: se conserva el original)
//   - dentro de la franja pintada, la capa SÍ es lo que devolvió el proveedor
//
// Uso: node tools/pruebas/verificar-produccion-mascara-uis-hoola.mjs [ruta-foto]
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

async function entrar() {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(800);
  await page.evaluate(async (k) => {
    await fetch('api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: JSON.stringify({ password: k }) });
  }, password);
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
}

async function abrirEditar() {
  for (let i = 0; i < 3; i += 1) {
    if (await page.locator('#inpaintBtn').isVisible()) return;
    await page.click('.rail-btn[data-tab="edit"]');
    await page.waitForTimeout(600);
  }
}

async function pintar(y) {
  await abrirEditar();
  await page.click('#maskMode .seg[data-mode="paint"]');
  await page.waitForTimeout(250);
  const g = await page.evaluate(() => {
    const r = document.getElementById('viewCanvas').getBoundingClientRect();
    const d = window.__UIS__.state.doc;
    return { l: r.left, t: r.top, w: r.width, h: r.height, dw: d.width, dh: d.height };
  });
  const P = (x, yy) => ({ x: g.l + (x / g.dw) * g.w, y: g.t + (yy / g.dh) * g.h });
  const a = P(240, y); const b = P(784, y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(a.x + (b.x - a.x) * i / 10, a.y, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function rellenar(prompt) {
  await abrirEditar();
  await ponerPromptZonas(prompt);
  await page.click('#inpaintBtn');
  for (let t = 0; t < 240; t += 2) {
    if (await page.locator('#aiPreview:not(.hidden)').count()) break;
    await page.waitForTimeout(2000);
  }
  await page.click('#aiPreview:not(.hidden) #aiAccept');
  await page.waitForTimeout(2500);
  if (!respuesta?.job?.image) throw new Error('no se capturó la imagen del proveedor');
  return `data:image/png;base64,${respuesta.job.image}`;
}

const estadoCapa = () => page.evaluate(() => {
  const u = window.__UIS__;
  const doc = u.state.doc;
  const layer = doc.layers.find((l) => l.id === u.state.selection.layerId) || doc.layers[0];
  return { id: layer.id, resourceId: layer.resourceId, aspectOriginal: layer.aspectOriginal || null, trazos: layer.mask?.strokes?.length || 0 };
});

const leerPng = () => page.evaluate(async () => {
  const u = window.__UIS__;
  const layer = u.state.doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});

const medir = ({ antesUrl, despuesUrl, provUrl, bandas }) => page.evaluate(async ({ antesUrl, despuesUrl, provUrl, bandas }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const a = await cargar(antesUrl); const d = await cargar(despuesUrl); const p = await cargar(provUrl);
  const W = 512, H = 512;
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data; };
  const da = mk(a); const dd = mk(d); const dp = mk(p);
  const dentro = (x, y) => bandas.some((b) => Math.abs(y * 2 - b.y) <= b.r && x * 2 >= b.x0 && x * 2 <= b.x1);
  let nF = 0, cambiosFuera = 0, nD = 0, igualProvDentro = 0, sumaDifProvFuera = 0;
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const i = (y * W + x) * 4;
      const difAntes = (Math.abs(da[i] - dd[i]) + Math.abs(da[i + 1] - dd[i + 1]) + Math.abs(da[i + 2] - dd[i + 2])) / 3;
      const difProv = (Math.abs(dp[i] - dd[i]) + Math.abs(dp[i + 1] - dd[i + 1]) + Math.abs(dp[i + 2] - dd[i + 2])) / 3;
      if (dentro(x, y)) { nD += 1; if (difProv < 4) igualProvDentro += 1; }
      else { nF += 1; if (difAntes > 6) cambiosFuera += 1; sumaDifProvFuera += difProv; }
    }
  }
  return {
    fueraCambiadoPct: +(100 * cambiosFuera / Math.max(1, nF)).toFixed(2),
    dentroIgualAlProveedorPct: +(100 * igualProvDentro / Math.max(1, nD)).toFixed(1),
    fueraDiferenciaMediaVsProveedor: +(sumaDifProvFuera / Math.max(1, nF)).toFixed(2),
  };
}, { antesUrl, despuesUrl, provUrl, bandas });

await entrar();
const build = await page.evaluate(() => window.__UIS__?.build);
const versionServida = await page.evaluate(async () => (await (await fetch('api.php?action=state', { credentials: 'same-origin' })).json()).version);

// Importar la foto de detalle.
await page.evaluate(async (b64) => {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  await window.__UIS__.importFiles([new File([bytes], 'foto.png', { type: 'image/png' })], { asLayer: true });
}, fs.readFileSync(FOTO).toString('base64'));
await page.waitForTimeout(1200);

// 1) Primera edición: deja la capa editada.
const antesPrimera = await estadoCapa();
await pintar(260);
await rellenar('Rellena la franja con un color lila plano y liso, sin texto.');
const despuesPrimera = await estadoCapa();

// 2) Simular documento guardado por la versión anterior: aspectOriginal = imagen previa.
await page.evaluate((rid) => {
  const u = window.__UIS__;
  const layer = u.state.doc.layers[0];
  layer.aspectOriginal = rid;
  u.state.flags.dirty = true;
}, antesPrimera.resourceId);
await page.evaluate(() => window.__UIS__.saveNow('test'));
await page.waitForTimeout(2500);

// 3) Recargar: la app recupera el proyecto (con aspectOriginal heredado).
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3500);
const restaurado = await estadoCapa();
const antes2 = await leerPng();
guardar(antes2, '50-produccion-antes2.png');

// 4) Segunda edición en otra franja. Aquí fallaba: se aplicaba la imagen entera.
await pintar(820);
const prov = await rellenar('Rellena la franja con un color verde plano y liso, sin texto.');
const despues2 = await leerPng();
guardar(despues2, '51-produccion-despues2.png');
guardar(prov, '52-produccion-proveedor2.png');

const m = await medir({
  antesUrl: antes2, despuesUrl: despues2, provUrl: prov,
  bandas: [{ y: 260, r: 120, x0: 225, x1: 800 }, { y: 820, r: 120, x0: 225, x1: 800 }],
});
const info = {
  build, versionServida, modelo: enviado?.model,
  escenario: { aspectOriginalHeredado: restaurado.aspectOriginal, recursoExiste: Boolean(restaurado.resourceId), trazos: restaurado.trazos },
  ...m,
  errores: errores.filter((e) => !e.includes('401') && !e.includes('404')).slice(0, 6),
};
const ok = m.fueraCambiadoPct < 1 && m.fueraDiferenciaMediaVsProveedor > 1.5 && m.dentroIgualAlProveedorPct > 40;
fs.writeFileSync(`${OUT}/53-produccion-medicion.json`, JSON.stringify({ ok, ...info }, null, 2));
console.log(JSON.stringify({ ok, ...info }, null, 2));
console.log(ok ? '\nPASS: en producción el relleno se aplica SOLO dentro de la máscara' : '\nFALLO: revisar las medidas');
await browser.close();
process.exit(ok ? 0 : 1);
