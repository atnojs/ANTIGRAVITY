// Verificación REAL en producción de la máscara por zonas de Flow Studio:
// 2 zonas pintadas con prompts distintos y un modelo directo (2 generaciones).
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/flow_studio_hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-03-flow-zonas';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const BASE_IMG = fs.readFileSync(`${OUT}/base-1024.png`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 980 } });
const page = await context.newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
const jobs = [];
page.on('request', (r) => {
  if (!r.url().includes('action=job.create')) return;
  try { jobs.push(r.postDataJSON()); } catch { jobs.push(null); }
});

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(1000);
const version = await page.evaluate(async () => (await (await fetch('version.txt', { cache: 'no-store' })).text()).split('\n')[0]);
const buildRef = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).filter((s) => /app\.\d{8}[a-z]?\.js/.test(s)));
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: JSON.stringify({ password: k }) });
}, password);
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);

await page.click('#modeEdit');
await page.waitForTimeout(400);
await page.setInputFiles('#sourceInput', { name: 'base-1024.png', mimeType: 'image/png', buffer: BASE_IMG });
await page.waitForTimeout(1500);
await page.click('#btnMaskEdit');
await page.waitForTimeout(700);
await page.click('#maskToolBrush');
await page.waitForTimeout(300);
const caja = await page.locator('#maskCanvas').boundingBox();
if (!caja) throw new Error('sin lienzo de máscara');
for (const [fx, fy] of [[0.27, 0.3], [0.72, 0.68]]) {
  const x = caja.x + caja.width * fx;
  const y = caja.y + caja.height * fy;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 24, y + 18, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}
const prompts = ['coloca un círculo cian plano, sin texto', 'coloca un cuadrado verde plano, sin texto'];
const campos = page.locator('[data-zone-prompt]');
const total = await campos.count();
for (let i = 0; i < total; i += 1) await campos.nth(i).fill(prompts[i] || prompts[0]);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/10-produccion-dialogo.png` });
await page.click('#maskApply');
await page.waitForTimeout(800);
await page.click('[data-model="openai-image-2-low"]');
await page.waitForTimeout(600);
// Vaciar la rejilla (puede traer tarjetas del historial) para esperar SOLO la nueva.
await page.evaluate(() => { const g = document.getElementById('grid'); if (g) g.innerHTML = ''; });
await page.click('#btnGenerate');
for (let t = 0; t < 300; t += 2) {
  const listo = await page.evaluate(() => {
    const card = document.querySelector('#grid .card');
    if (!card || !card.querySelector('img') || card.classList.contains('is-waiting')) return false;
    const meta = [...card.querySelectorAll('.card-meta span')].map((s) => s.textContent.toLowerCase()).join('|');
    return meta.includes('máscara') || meta.includes('mascara');
  });
  if (listo) break;
  await page.waitForTimeout(2000);
}
await page.screenshot({ path: `${OUT}/11-produccion-resultado.png` });
const baseB64 = BASE_IMG.toString('base64');
const cardInfo = await page.evaluate(async (baseB64) => {
  const card = document.querySelector('#grid .card');
  if (!card) return null;
  // La tarjeta puede tener miniaturas de referencia: usar la imagen MÁS GRANDE.
  const imgs = [...card.querySelectorAll('.card-media img')];
  if (!imgs.length) return null;
  const img = imgs.reduce((a, b) => ((b.naturalWidth || 0) > (a.naturalWidth || 0) ? b : a));
  await new Promise((ok, mal) => { if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = mal; } });
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const base = await cargar('data:image/png;base64,' + baseB64);
  const W = 256, H = 256;
  const leer = (fuente) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(fuente, 0, 0, W, H);
    return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
  };
  const A = leer(base);
  const B = leer(img);
  const zonas = [{ x: 69, y: 77 }, { x: 184, y: 174 }];
  const cambiada = zonas.map((z) => {
    let n = 0; let c = 0;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      if (Math.hypot(x - z.x, y - z.y) > 34) continue;
      const i = (y * W + x) * 4;
      const dif = (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3;
      n += 1; if (dif > 24) c += 1;
    }
    return +(100 * c / Math.max(1, n)).toFixed(1);
  });
  let nLejos = 0; let cLejos = 0; let cian = 0; let verde = 0;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * 4;
    const dif = (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2])) / 3;
    const cerca = zonas.some((z) => Math.hypot(x - z.x, y - z.y) <= 62);
    if (!cerca) { nLejos += 1; if (dif > 24) cLejos += 1; }
    if (B[i + 2] > 190 && B[i + 1] > 150 && B[i] < 90) cian += 1;
    if (B[i + 1] > 130 && B[i] < 100 && B[i + 2] < 110) verde += 1;
  }
  return {
    zonasCambiadasPct: cambiada,
    lejosCambiadoPct: +(100 * cLejos / Math.max(1, nLejos)).toFixed(2),
    cianPx: cian,
    verdePx: verde,
    meta: [...card.querySelectorAll('.card-meta span')].map((s) => s.textContent.trim()),
    prompt: card.querySelector('.card-prompt')?.textContent || '',
  };
}, baseB64);
const info = {
  version,
  buildRef,
  jobs: jobs.length,
  promptsEnviados: jobs.map((j) => String((j && j.prompt) || '').split(':').pop().trim().slice(0, 60)),
  mascaras: jobs.map((j) => String((j && j.mask) || '').length),
  cardInfo,
  errores: errores.filter((e) => !e.includes('404')).slice(0, 8),
};
const ok = info.version.startsWith('20261103c-flow-studio')
  && info.jobs === 2
  && info.promptsEnviados[0].includes('círculo cian') && info.promptsEnviados[1].includes('cuadrado verde')
  && info.mascaras.every((n) => n > 1000)
  && cardInfo && cardInfo.zonasCambiadasPct.every((p) => p > 4)
  && cardInfo.lejosCambiadoPct < 2
  && (cardInfo.cianPx > 50 || cardInfo.verdePx > 50)
  && info.errores.length === 0;
info.ok = ok;
fs.writeFileSync(`${OUT}/12-produccion-zonas.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
console.log(ok ? '\nPASS: producción rellena las 2 zonas con su prompt' : '\nFALLO en producción (zonas)');
await browser.close();
process.exit(ok ? 0 : 1);
