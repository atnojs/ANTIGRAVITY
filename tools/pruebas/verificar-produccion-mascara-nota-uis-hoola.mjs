// Verificación en PRODUCCIÓN de los avisos de capa oculta / casi transparente (3.0.9),
// SIN generar (solo se prueba el diálogo y el camino de cancelar, que no llama al
// proveedor). Comprueba también la nota de la máscara tras abrir/recargar.
//
// Uso: node tools/pruebas/verificar-produccion-mascara-nota-uis-hoola.mjs
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
let trabajos = 0;
page.on('request', (r) => { if (r.url().includes('action=job.create')) trabajos += 1; });

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(800);
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: JSON.stringify({ password: k }) });
}, password);
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);
const build = await page.evaluate(() => window.__UIS__?.build);
const versionServida = await page.evaluate(async () => (await (await fetch('api.php?action=state', { credentials: 'same-origin' })).json()).version);
const notaAlAbrir = await page.evaluate(() => document.getElementById('maskLayerName')?.textContent);

// Dos capas de prueba.
await page.evaluate(async () => {
  const crear = async (c1, c2, nombre) => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
    const x = c.getContext('2d');
    x.fillStyle = c1; x.fillRect(0, 0, 512, 1024);
    x.fillStyle = c2; x.fillRect(512, 0, 512, 1024);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    await window.__UIS__.importFiles([new File([blob], nombre, { type: 'image/png' })], { asLayer: true });
  };
  await crear('#c0392b', '#f1c40f', 'fondo-nota.png');
  await crear('#2980b9', '#27ae60', 'nota-oculta.png');
});
await page.waitForTimeout(1500);

// Recargar: la app recupera el proyecto y la nota debe decir la capa (no «sin selección»).
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);
const notaTrasRecarga = await page.evaluate(() => document.getElementById('maskLayerName')?.textContent);

// Ocultar la capa seleccionada y pintar máscara.
await page.locator('#layerList .layer-item').first().locator('button[aria-label="Ocultar capa"]').click();
await page.waitForTimeout(400);
const notaOculta = await page.evaluate(() => ({
  texto: document.getElementById('maskLayerName')?.textContent,
  color: getComputedStyle(document.getElementById('maskLayerName')).color,
}));
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

// 1) Capa oculta → aviso; cancelar no genera trabajo.
await page.fill('#inpaintPrompt', 'pinta de color fucsia');
await page.click('#inpaintBtn');
await page.waitForTimeout(1200);
const avisoOculta = {
  visible: (await page.locator('#confirmModal:not(.hidden)').count()) === 1,
  titulo: await page.locator('#confirmTitle').textContent().catch(() => ''),
};
await page.screenshot({ path: `${OUT}/A0-produccion-aviso-oculta.png` });
if (avisoOculta.visible) await page.click('#confirmCancel');
await page.waitForTimeout(600);
const trabajosTrasCancelar = trabajos;

// Volver a mostrar la capa para probar el aviso de opacidad.
await page.locator('#layerList .layer-item').first().locator('button[aria-label="Mostrar capa"]').click();
await page.waitForTimeout(400);

// 2) Opacidad 5 % → nota «OPACIDAD MUY BAJA» y aviso de opacidad.
const opacidad = await page.evaluate(async () => {
  const slider = document.getElementById('layerOpacity');
  slider.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  slider.value = '5';
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 600));
  return { nota: document.getElementById('maskLayerName')?.textContent, valor: slider.value };
});
await page.click('#inpaintBtn');
await page.waitForTimeout(1200);
const avisoTenue = {
  visible: (await page.locator('#confirmModal:not(.hidden)').count()) === 1,
  titulo: await page.locator('#confirmTitle').textContent().catch(() => ''),
  ok: await page.locator('#confirmOk').textContent().catch(() => ''),
};
await page.screenshot({ path: `${OUT}/A1-produccion-aviso-opacidad.png` });
if (avisoTenue.visible) await page.click('#confirmCancel');
await page.waitForTimeout(600);

const info = {
  build, versionServida, notaAlAbrir, notaTrasRecarga, notaOculta, opacidad,
  avisoOculta, avisoTenue, trabajos, trabajosTrasCancelar,
  errores: errores.filter((e) => !e.includes('401') && !e.includes('404')).slice(0, 6),
};
const ok = /Capa de la máscara: «/.test(info.notaTrasRecarga || '')
  && /CAPA OCULTA/.test(info.notaOculta.texto || '')
  && info.avisoOculta.visible && /oculta/i.test(info.avisoOculta.titulo)
  && /OPACIDAD MUY BAJA/.test(info.opacidad.nota || '')
  && info.avisoTenue.visible && /casi no se ve/i.test(info.avisoTenue.titulo) && /100 %/.test(info.avisoTenue.ok || '')
  && info.trabajos === 0 && info.trabajosTrasCancelar === 0 && info.errores.length === 0;
info.ok = ok;
fs.writeFileSync(`${OUT}/A2-produccion-notas.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
console.log(ok ? '\nPASS: nota de capa tras recargar, CAPA OCULTA y aviso de opacidad (0 generaciones)' : '\nFALLO en los avisos de capa');
await browser.close();
process.exit(ok ? 0 : 1);
