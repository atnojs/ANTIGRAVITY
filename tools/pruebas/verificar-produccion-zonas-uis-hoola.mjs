// Verificación REAL del relleno por zonas (3.2.2): 2 zonas con prompts distintos.
// Comprueba: se envían 2 trabajos con el prompt de cada zona, la vista previa
// aparece, ambas zonas cambian y lejos de ellas no cambia nada. 2 generaciones.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-03-mascara-zonas';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const FOTO = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis/jobs/job_9b603f9fce95c0a1c20e55a7.png';
const guardar = (dataUrl, n) => fs.writeFileSync(`${OUT}/${n}`, Buffer.from(String(dataUrl).slice(String(dataUrl).indexOf(',') + 1), 'base64'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
const jobs = [];
const respuestas = [];
page.on('request', (r) => {
  if (!r.url().includes('action=job.create')) return;
  try { jobs.push(r.postDataJSON()); } catch { jobs.push(null); }
});
page.on('response', async (r) => {
  if (!r.url().includes('action=job.create')) return;
  try { respuestas.push(await r.json()); } catch { respuestas.push(null); }
});
async function ponerPromptZonas(texto) {
  const viejo = page.locator('#inpaintPrompt');
  if (await viejo.count()) await viejo.fill(texto);
  const campos = page.locator('[data-zone-prompt]');
  const total = await campos.count();
  for (let i = 0; i < total; i += 1) await campos.nth(i).fill(texto);
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

// Importar la foto y pintar 2 zonas separadas.
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
});
await page.waitForTimeout(200);
const g = await page.evaluate(() => {
  const r = document.getElementById('viewCanvas').getBoundingClientRect();
  const d = window.__UIS__.state.doc;
  return { l: r.left, t: r.top, w: r.width, h: r.height, dw: d.width, dh: d.height };
});
const P = (x, y) => ({ x: g.l + (x / g.dw) * g.w, y: g.t + (y / g.dh) * g.h });
for (const [x, y] of [[250, 300], [800, 700]]) {
  const p = P(x, y);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(400);
}
// Prompt distinto para cada zona.
const prompts = ['coloca un círculo cian plano, sin texto', 'coloca un cuadrado verde plano, sin texto'];
await page.evaluate((textos) => {
  const campos = [...document.querySelectorAll('[data-zone-prompt]')];
  campos.forEach((campo, i) => {
    campo.value = textos[i] || '';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}, prompts);
await page.waitForTimeout(500);
const zonas = await page.evaluate(() => {
  const layer = window.__UIS__.state.doc.layers[0];
  return {
    total: layer.mask?.zones?.length || 0,
    prompts: (layer.mask?.zones || []).map((z) => z.prompt),
    boton: document.getElementById('inpaintBtn')?.textContent?.trim(),
  };
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

await page.click('#inpaintBtn');
for (let t = 0; t < 240; t += 2) {
  if (await page.locator('#aiPreview:not(.hidden)').count()) break;
  await page.waitForTimeout(2000);
}
const hayPreview = (await page.locator('#aiPreview:not(.hidden)').count()) === 1;
await page.screenshot({ path: `${OUT}/10-produccion-preview-2-zonas.png` });
const toasts = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()).slice(-4));
const previewPng = hayPreview ? await page.evaluate(async () => {
  const img = document.getElementById('aiPreviewImg');
  await new Promise((ok, mal) => { if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = mal; } });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
}) : null;
if (hayPreview) await page.click('#aiPreview:not(.hidden) #aiAccept');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/11-produccion-aplicado-2-zonas.png` });
const despuesPng = await page.evaluate(async () => {
  const u = window.__UIS__;
  const layer = u.state.doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});
if (previewPng) guardar(previewPng, '12-preview-2-zonas.png');
if (antesPng) guardar(antesPng, '13-antes-2-zonas.png');
if (despuesPng) guardar(despuesPng, '14-despues-2-zonas.png');

const medir = await page.evaluate(async ({ antes, despues }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const A = await cargar(antes); const D = await cargar(despues);
  const W = 512, H = 512;
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data; };
  const da = mk(A); const dd = mk(D);
  const zonas = [{ n: 1, x: 125, y: 150, r: 45 }, { n: 2, x: 400, y: 350, r: 45 }];
  const salida = {};
  for (const z of zonas) {
    let n = 0, c = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      if (Math.hypot(x - z.x, y - z.y) > z.r) continue;
      const i = (y * W + x) * 4;
      const dif = (Math.abs(da[i] - dd[i]) + Math.abs(da[i + 1] - dd[i + 1]) + Math.abs(da[i + 2] - dd[i + 2])) / 3;
      n += 1; if (dif > 20) c += 1;
    }
    salida[`zona${z.n}CambiadaPct`] = +(100 * c / Math.max(1, n)).toFixed(1);
  }
  // Lejos de las dos zonas.
  let nL = 0, cL = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    if (Math.hypot(x - zonas[0].x, y - zonas[0].y) <= 120) continue;
    if (Math.hypot(x - zonas[1].x, y - zonas[1].y) <= 120) continue;
    const i = (y * W + x) * 4;
    const dif = (Math.abs(da[i] - dd[i]) + Math.abs(da[i + 1] - dd[i + 1]) + Math.abs(da[i + 2] - dd[i + 2])) / 3;
    nL += 1; if (dif > 24) cL += 1;
  }
  salida.lejosCambiadoPct = +(100 * cL / Math.max(1, nL)).toFixed(2);
  return salida;
}, { antes: antesPng, despues: despuesPng });

const promesasEnviadas = jobs.map((j) => (j?.prompt || '').split('\n')[0].trim());
const info = {
  build, versionServida, zonas, hayPreview, jobs: jobs.length, promesasEnviadas,
  respuestas: respuestas.map((r) => r?.job?.status || null),
  ...medir, toasts, errores: errores.filter((e) => !e.includes('401') && !e.includes('404')).slice(0, 6),
};
const ok = info.hayPreview
  && info.zonas.total === 2
  && info.jobs === 2
  && promesasEnviadas[0]?.includes('círculo cian')
  && promesasEnviadas[1]?.includes('cuadrado verde')
  && info.zona1CambiadaPct > 10 && info.zona2CambiadaPct > 10
  && info.lejosCambiadoPct < 2
  && info.errores.length === 0;
info.ok = ok;
fs.writeFileSync(`${OUT}/15-produccion-2-zonas.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
console.log(ok ? '\nPASS: las 2 zonas se rellenan con su prompt real y lejos no cambia' : '\nFALLO en el relleno por zonas real');
await browser.close();
process.exit(ok ? 0 : 1);
