// Verificación en PRODUCCIÓN de la interacción de zonas de Flow Studio (sin generar):
// dos clics separados → dos zonas con campo; el prompt se conserva; cerrar y reabrir
// mantiene el borrador; el clic en el fondo no cierra el diálogo.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/flow_studio_hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-04-flow-zonas-debug';
const BASE_IMG = fs.readFileSync(`${OUT}/../2026-11-03-flow-zonas/base-1024.png`);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 980 } })).newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);
const version = await page.evaluate(async () => (await (await fetch('version.txt', { cache: 'no-store' })).text()).split('\n')[0]);
const scripts = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).filter((s) => /app\.\d{8}[a-z]?\.js/.test(s)).join(','));
await page.click('#modeEdit');
await page.waitForTimeout(400);
await page.setInputFiles('#sourceInput', { name: 'base-1024.png', mimeType: 'image/png', buffer: BASE_IMG });
await page.waitForTimeout(1500);
await page.click('#btnMaskEdit');
await page.waitForTimeout(700);
await page.click('#maskToolBrush');
await page.waitForTimeout(300);
const caja = await page.locator('#maskCanvas').boundingBox();
if (!caja) throw new Error('sin lienzo');
const p = (fx, fy) => ({ x: caja.x + caja.width * fx, y: caja.y + caja.height * fy });
const estado = () => page.evaluate(() => {
  const campos = [...document.querySelectorAll('[data-zone-prompt]')];
  return { dialogOpen: Boolean(document.getElementById('maskDialog')?.open), zonas: campos.length, prompts: campos.map((c) => c.value) };
});
const clic = async (fx, fy) => {
  const q = p(fx, fy);
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(450);
};
const log = [];
await clic(0.25, 0.28);
log.push({ paso: 'clic 1', ...(await estado()) });
if (await page.locator('[data-zone-prompt]').count()) {
  await page.locator('[data-zone-prompt]').first().fill('coloca un círculo cian plano');
  await page.waitForTimeout(250);
}
await clic(0.75, 0.72);
log.push({ paso: 'clic 2 (lejos)', ...(await estado()) });
if (await page.locator('[data-zone-prompt]').count() > 1) {
  await page.locator('[data-zone-prompt]').nth(1).fill('coloca un cuadrado verde plano');
  await page.waitForTimeout(250);
}
await page.screenshot({ path: `${OUT}/30-produccion-dos-zonas.png` });
await page.click('#maskClose');
await page.waitForTimeout(400);
await page.click('#btnMaskEdit');
await page.waitForTimeout(900);
log.push({ paso: 'cerrado y reabierto', ...(await estado()) });
await page.mouse.click(8, 8);
await page.waitForTimeout(400);
log.push({ paso: 'clic en el fondo', ...(await estado()) });
await page.screenshot({ path: `${OUT}/31-produccion-reabierto.png` });
const clics = await page.evaluate(() => ({ zonas: document.querySelectorAll('[data-zone-prompt]').length }));
const info = { version, scripts, log, clics, errores: errores.filter((e) => !e.includes('404')).slice(0, 6) };
info.ok = version.startsWith('20261103e-flow-studio')
  && log[1].zonas === 2 && log[1].prompts[0] === 'coloca un círculo cian plano'
  && log[2].zonas === 2 && log[2].prompts[1] === 'coloca un cuadrado verde plano'
  && log[2].dialogOpen && log[3].dialogOpen && log[3].zonas === 2
  && log[3].dialogOpen && log[3].zonas === 2
  && info.errores.length === 0;
fs.writeFileSync(`${OUT}/32-produccion-ui-zonas.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
console.log(info.ok ? '\nPASS: producción crea varias zonas, conserva prompts y no cierra al clicar fuera' : '\nFALLO en producción (interacción de zonas)');
await browser.close();
process.exit(info.ok ? 0 : 1);
