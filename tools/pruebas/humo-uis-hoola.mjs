// Prueba de humo de la app Hoola contra PRODUCCIÓN.
// Comprueba las cuatro cosas que han fallado alguna vez en el flujo real:
//   1. Que no se carguen dos copias de los módulos (dos estados distintos).
//   2. Que importar una imagen deje una capa visible (en el estado Y en pantalla).
//   3. Que la máscara se pinte de verdad (píxeles y trazo registrados).
//   4. Que «Rellenar la máscara» envíe el trabajo al servidor.
//
// Uso:  node tools/pruebas/humo-uis-hoola.mjs
// Sale con código 0 si todo pasa.

import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const CLAVE = 'E:/ANTIGRAVITY/.private/password-acceso.txt';
const IMAGEN = 'E:/ANTIGRAVITY/.tmp-build/gen-real/diagreal.jpg';

const password = fs.readFileSync(CLAVE, 'utf8').trim();
const imagen = fs.readFileSync(IMAGEN);
const resultados = [];
const apunta = (nombre, pasa, detalle) => resultados.push({ nombre, pasa, detalle });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
const peticiones = [];
page.on('request', (r) => {
  if (r.method() === 'POST' && r.url().includes('action=job.create')) {
    peticiones.push((r.postData() || '').slice(0, 140));
  }
});

try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(async (clave) => {
    await fetch('api.php?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: clave }),
    });
  }, password);
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);

  // 1. Módulos: una sola copia de cada uno
  const modulos = await page.evaluate(() => {
    const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.includes('/assets/js/'));
    const cuenta = {};
    for (const u of urls) {
      const f = u.split('/assets/js/')[1].split('?')[0];
      if (!cuenta[f] || Number(u.split('?v=')[1] || 0) > cuenta[f]) cuenta[f] = cuenta[f] || 1;
    }
    const versiones = [...new Set(urls.map((u) => (u.split('?v=')[1] || '').split('&')[0]))];
    return { ficheros: Object.keys(cuenta).length, versiones, total: urls.length };
  });
  apunta('una sola versión de módulos', modulos.versiones.length === 1 && modulos.total === modulos.ficheros, JSON.stringify(modulos));

  // 2. Importar: capa en el estado y en la pantalla
  await page.evaluate(() => { document.getElementById('fileInput').dataset.mode = 'layer'; });
  await page.locator('#fileInput').setInputFiles({ name: 'humo.jpg', mimeType: 'image/jpeg', buffer: imagen });
  await page.waitForTimeout(3000);
  const importado = await page.evaluate(() => ({
    estado: window.__UIS__.state.doc?.layers?.length ?? 0,
    pantalla: document.querySelectorAll('.layer-item').length,
  }));
  apunta('importar deja capa visible', importado.estado >= 1 && importado.pantalla >= 1, JSON.stringify(importado));

  // 3. Máscara pintada
  await page.locator('.rail-btn[data-tab="edit"]').click();
  await page.waitForTimeout(700);
  await page.locator('#maskMode [data-mode="paint"]').click();
  await page.waitForTimeout(250);
  await page.locator('.tool-btn[data-tool="mask"]').click();
  await page.waitForTimeout(400);
  const caja = await page.locator('#maskCanvas').boundingBox();
  const cx = caja.x + caja.width / 2;
  const cy = caja.y + caja.height / 2;
  await page.mouse.move(cx + 50, cy);
  await page.mouse.down();
  for (let i = 0; i <= 40; i += 1) {
    const a = (i / 40) * Math.PI * 2;
    await page.mouse.move(cx + Math.cos(a) * 50, cy + Math.sin(a) * 50);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
  const mascara = await page.evaluate(() => {
    const c = document.getElementById('maskCanvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n += 1;
    return { pixeles: n, trazos: window.__UIS__.state.doc?.layers?.[0]?.mask?.strokes?.length ?? 0 };
  });
  apunta('la máscara se pinta', mascara.pixeles > 500 && mascara.trazos >= 1, JSON.stringify(mascara));

  // 4. Rellenar envía el trabajo
  await page.locator('#inpaintPrompt').fill('prueba de humo: un velero blanco, acuarela');
  peticiones.length = 0;
  await page.locator('#inpaintBtn').click();
  await page.waitForTimeout(1500);
  const aviso = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()).slice(-2));
  await page.waitForTimeout(6500);
  apunta('rellenar envía el trabajo', peticiones.length >= 1, peticiones[0] || ('sin petición · avisos: ' + JSON.stringify(aviso)));
} catch (error) {
  apunta('ejecución sin excepciones', false, error.message.slice(0, 160));
} finally {
  await browser.close();
}

let todoBien = true;
for (const r of resultados) {
  console.log(`${r.pasa ? 'OK   ' : 'FALLO'} ${r.nombre} — ${r.detalle}`);
  if (!r.pasa) todoBien = false;
}
console.log(todoBien ? '\nHumo: TODO OK' : '\nHumo: HAY FALLOS');
process.exit(todoBien ? 0 : 1);
