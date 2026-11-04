// Reproduce el fallo del pincel por zonas en Flow Studio: tras la primera zona,
// el segundo clic borra la zona 1 / cierra el diálogo / no crea la zona 2.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-04-flow-zonas-debug';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'https://atnojs.es/apps/flow_studio_hoola/';
const BASE_IMG = fs.readFileSync('E:/ANTIGRAVITY/tools/evidencias/2026-11-03-flow-zonas/base-1024.png');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 980 } });
const page = await context.newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);
const version = await page.evaluate(async () => (await (await fetch('version.txt', { cache: 'no-store' })).text()).split('\n')[0]);
await page.click('#modeEdit');
await page.waitForTimeout(400);
await page.setInputFiles('#sourceInput', { name: 'base-1024.png', mimeType: 'image/png', buffer: BASE_IMG });
await page.waitForTimeout(1500);
await page.click('#btnMaskEdit');
await page.waitForTimeout(700);
await page.click('#maskToolBrush');
await page.waitForTimeout(300);
const caja = await page.locator('#maskCanvas').boundingBox();
const estado = (etiqueta) => page.evaluate((etiqueta) => {
  const campos = [...document.querySelectorAll('[data-zone-prompt]')];
  const dialog = document.getElementById('maskDialog');
  return {
    etiqueta,
    dialogOpen: Boolean(dialog && dialog.open),
    zonasDOM: campos.length,
    prompts: campos.map((c) => c.value),
    contador: document.getElementById('maskZoneCount')?.textContent,
    hint: document.getElementById('maskHint')?.textContent,
    sizeLabel: document.getElementById('maskSizeLabel')?.textContent,
    btnMask: document.getElementById('btnMaskEdit')?.textContent,
    canvasVisible: (() => { const c = document.getElementById('maskCanvas'); return Boolean(c && c.getBoundingClientRect().width); })(),
    activeElement: document.activeElement?.id || document.activeElement?.tagName,
  };
}, etiqueta);

const p = (fx, fy) => ({ x: caja.x + caja.width * fx, y: caja.y + caja.height * fy });
const log = [await estado('inicio')];
let q = p(0.27, 0.3);
await page.mouse.move(q.x, q.y);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(500);
log.push(await estado('tras primer clic'));
await page.screenshot({ path: `${OUT}/01-primera-zona.png` });
// Escribir prompt en la zona 1.
if (await page.locator('[data-zone-prompt]').count()) {
  await page.locator('[data-zone-prompt]').first().fill('coloca un círculo cian plano');
  await page.waitForTimeout(300);
  log.push(await estado('tras escribir prompt zona 1'));
}
q = p(0.72, 0.68);
await page.mouse.move(q.x, q.y);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(600);
log.push(await estado('tras clic zona 2'));
await page.screenshot({ path: `${OUT}/02-tras-clic-2.png` });
// Un tercer clic por si acaso.
q = p(0.5, 0.5);
await page.mouse.move(q.x, q.y);
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(600);
log.push(await estado('tras clic zona 3'));
await page.screenshot({ path: `${OUT}/03-tras-clic-3.png` });
const info = { version, log, errores: errores.filter((e) => !e.includes('404')).slice(0, 8) };
fs.writeFileSync(`${OUT}/debug.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
await browser.close();
