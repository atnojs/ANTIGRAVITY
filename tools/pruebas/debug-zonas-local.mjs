// Debug local de las correcciones de zonas (20261103e):
// 1) dos clics separados crean DOS zonas numeradas;
// 2) cerrar y reabrir la máscara conserva zonas y prompts;
// 3) un clic en el fondo del diálogo ya no lo cierra.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';

const ROOT = path.resolve('apps');
const PORT = Number(process.argv.find((a) => a.startsWith('--port='))?.slice(7) || 9610);
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-04-flow-zonas-debug';
const BASE_IMG = fs.readFileSync(`${OUT}/../2026-11-03-flow-zonas/base-1024.png`);
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
const servidor = http.createServer((req, res) => {
  const limpio = decodeURIComponent(req.url.split('?')[0]);
  let destino = path.join(ROOT, limpio.replace(/^\//, ''));
  if (fs.existsSync(destino) && fs.statSync(destino).isDirectory()) destino = path.join(destino, 'index.html');
  if (!destino.startsWith(ROOT) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(destino).pipe(res);
});
await new Promise((ok) => servidor.listen(PORT, '127.0.0.1', ok));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 980 } })).newPage();
const errores = [];
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
await page.goto(`http://127.0.0.1:${PORT}/flow_studio_hoola/`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2200);
const version = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src')).filter((s) => /app\.\d{8}[a-z]?\.js/.test(s)).join(','));
await page.click('#modeEdit');
await page.waitForTimeout(400);
await page.setInputFiles('#sourceInput', { name: 'base-1024.png', mimeType: 'image/png', buffer: BASE_IMG });
await page.waitForTimeout(1500);
await page.click('#btnMaskEdit');
await page.waitForTimeout(700);
// La máscara debe abrirse ya en Pincel (varias zonas).
const toolInicial = await page.evaluate(() => ({ brush: document.getElementById('maskToolBrush')?.classList.contains('is-active'), circle: document.getElementById('maskToolCircle')?.classList.contains('is-active') }));
const caja = await page.locator('#maskCanvas').boundingBox();
const p = (fx, fy) => ({ x: caja.x + caja.width * fx, y: caja.y + caja.height * fy });
const estado = () => page.evaluate(() => {
  const campos = [...document.querySelectorAll('[data-zone-prompt]')];
  const dialog = document.getElementById('maskDialog');
  return {
    dialogOpen: Boolean(dialog && dialog.open),
    zonas: campos.length,
    prompts: campos.map((c) => c.value),
    contador: document.getElementById('maskZoneCount')?.textContent,
  };
});
const clic = async (fx, fy) => {
  const q = p(fx, fy);
  await page.mouse.move(q.x, q.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(450);
};
const log = [{ paso: 'abierto', ...(await estado()), toolInicial }];
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
await page.screenshot({ path: `${OUT}/20-dos-zonas.png` });
// Cerrar con la X y reabrir: debe conservar zonas y prompts.
await page.click('#maskClose');
await page.waitForTimeout(400);
log.push({ paso: 'cerrado con X', ...(await estado()) });
await page.click('#btnMaskEdit');
await page.waitForTimeout(900);
log.push({ paso: 'reabierto', ...(await estado()) });
await page.screenshot({ path: `${OUT}/21-reabierto.png` });
// Clic en el fondo (fuera de la tarjeta): el diálogo NO debe cerrarse.
await page.mouse.click(8, 8);
await page.waitForTimeout(400);
log.push({ paso: 'clic en el fondo', ...(await estado()) });
// Cambiar a Círculo: debe aparecer el atajo para volver a Pincel.
await page.click('#maskToolCircle');
await page.waitForTimeout(300);
const ctaCirculo = await page.evaluate(() => ({ cta: Boolean(document.querySelector('.btn-zone-brush')), texto: document.querySelector('.btn-zone-brush')?.textContent || '' }));
if (await page.locator('.btn-zone-brush').count()) {
  await page.click('.btn-zone-brush');
  await page.waitForTimeout(300);
}
const toolTrasCta = await page.evaluate(() => ({ brush: document.getElementById('maskToolBrush')?.classList.contains('is-active'), zonas: document.querySelectorAll('[data-zone-prompt]').length }));
const info = { version, toolInicial, log, ctaCirculo, toolTrasCta, errores };
fs.writeFileSync(`${OUT}/debug-local.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
const ok = toolInicial.brush && !toolInicial.circle
  && log[1].zonas === 1 && log[1].prompts[0] === ''
  && log[2].zonas === 2 && log[2].prompts[0] === 'coloca un círculo cian plano'
  && log[2].prompts[1] === ''
  && !log[3].dialogOpen
  && log[4].dialogOpen && log[4].zonas === 2
  && log[4].prompts[0] === 'coloca un círculo cian plano' && log[4].prompts[1] === 'coloca un cuadrado verde plano'
  && log[5].dialogOpen && log[5].zonas === 2
  && ctaCirculo.cta && toolTrasCta.brush;console.log(ok ? '\nPASS: dos zonas + prompts se conservan al reabrir' : '\nFALLO en el pintado por zonas (local)');
await browser.close();
servidor.close();
process.exit(ok ? 0 : 1);
