// Verificación en PRODUCCIÓN del caso «máscara en una capa tapada» (3.0.6):
// dos capas (foto abajo, dibujo opaco arriba), se selecciona la de abajo, se pinta
// la máscara y se rellena. Debe avisar antes de rellenar y la vista previa debe ser
// el LIENZO COMPLETO con el parche aplicado, no la capa de abajo suelta.
//
// Uso: node tools/pruebas/verificar-produccion-mascara-capas-uis-hoola.mjs
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const guardar = (dataUrl, n) => fs.writeFileSync(`${OUT}/${n}`, Buffer.from(String(dataUrl).slice(String(dataUrl).indexOf(',') + 1), 'base64'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
let respuesta = null;
page.on('response', async (r) => { if (r.url().includes('action=job.create')) { try { respuesta = await r.json(); } catch { respuesta = null; } } });

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(800);
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: JSON.stringify({ password: k }) });
}, password);
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);
const build = await page.evaluate(() => window.__UIS__?.build);
const versionServida = await page.evaluate(async () => (await (await fetch('api.php?action=state', { credentials: 'same-origin' })).json()).version);

// Dos capas de prueba.
await page.evaluate(async () => {
  const crear = async (c1, c2, nombre) => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
    const x = c.getContext('2d');
    x.fillStyle = c1; x.fillRect(0, 0, 512, 1024);
    x.fillStyle = c2; x.fillRect(512, 0, 512, 1024);
    x.strokeStyle = '#111'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(1024, 1024); x.stroke();
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    await window.__UIS__.importFiles([new File([blob], nombre, { type: 'image/png' })], { asLayer: true });
  };
  await crear('#c0392b', '#f1c40f', 'foto-abajo.png');
  await crear('#2980b9', '#27ae60', 'dibujo-arriba.png');
});
await page.waitForTimeout(1500);
const capas = await page.evaluate(() => window.__UIS__.state.doc.layers.map((l) => ({ id: l.id, name: l.name })));

// Seleccionar la capa de abajo.
await page.waitForTimeout(400);
await page.locator('#layerList .layer-item').last().click();
await page.waitForTimeout(500);
const nota = await page.evaluate(() => document.getElementById('maskLayerName')?.textContent);

// Pintar máscara en el centro.
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

// Rellenar: debe salir el aviso de capa tapada.
await page.fill('#inpaintPrompt', 'pinta de color fucsia');
await page.click('#inpaintBtn');
await page.waitForTimeout(1500);
const aviso = {
  visible: (await page.locator('#confirmModal:not(.hidden)').count()) === 1,
  titulo: await page.locator('#confirmTitle').textContent().catch(() => ''),
  texto: (await page.locator('#confirmText').textContent().catch(() => '')).slice(0, 220),
};
await page.screenshot({ path: `${OUT}/90-produccion-aviso-capa-tapada.png` });
console.log('Aviso:', JSON.stringify(aviso));

// Aceptar el aviso (rellenar la capa tapada) y esperar la vista previa.
if (aviso.visible) await page.click('#confirmOk');
for (let t = 0; t < 240; t += 2) {
  if (await page.locator('#aiPreview:not(.hidden)').count()) break;
  await page.waitForTimeout(2000);
}
const hayPreview = await page.locator('#aiPreview:not(.hidden)').count();
await page.screenshot({ path: `${OUT}/91-produccion-vista-previa-lienzo.png` });

const docAntes = await page.evaluate(() => window.__UIS__.renderer.compositeToCanvas().toDataURL('image/png'));
const previewPng = await page.evaluate(async () => {
  const img = document.getElementById('aiPreviewImg');
  if (!img?.src) return null;
  await new Promise((ok, mal) => { if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = mal; } });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});

if (!hayPreview) {
  console.log('FALLO: no llegó la vista previa', JSON.stringify(respuesta?.job?.status || respuesta));
  await browser.close();
  process.exit(2);
}

const comparar = (xUrl, yUrl) => page.evaluate(async ({ xUrl, yUrl }) => {
  const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
  const X = await cargar(xUrl); const Y = await cargar(yUrl);
  const W = 256, H = Math.round(256 * X.naturalHeight / X.naturalWidth);
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H); return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data; };
  const dx = mk(X); const dy = mk(Y);
  let suma = 0;
  for (let i = 0; i < dx.length; i += 4) suma += (Math.abs(dx[i] - dy[i]) + Math.abs(dx[i + 1] - dy[i + 1]) + Math.abs(dx[i + 2] - dy[i + 2])) / 3;
  return +(suma / (dx.length / 4)).toFixed(2);
}, { xUrl, yUrl });

// Capa de abajo con el parche (para comprobar que la vista previa NO es esa capa sola).
const capaAbajo = await page.evaluate(async () => {
  const u = window.__UIS__;
  const l = u.state.doc.layers[0];
  const res = u.state.resources.get(l.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c.toDataURL('image/png');
});
const difPreviewDocumento = await comparar(previewPng, docAntes);
const difPreviewCapa = await comparar(previewPng, capaAbajo);

await page.click('#aiPreview:not(.hidden) #aiAccept');
await page.waitForTimeout(2500);
const tras = await page.evaluate(() => ({ capas: window.__UIS__.state.doc.layers.length, doc: window.__UIS__.renderer.compositeToCanvas().toDataURL('image/png') }));
const difPreviewAplicado = await comparar(previewPng, tras.doc);

guardar(previewPng, '92-produccion-vista-previa.png');
guardar(docAntes, '93-produccion-lienzo-antes.png');

const info = {
  build, versionServida, capas: capas.length, nota, aviso,
  hayPreview: hayPreview === 1, difPreviewDocumento, difPreviewCapa, difPreviewAplicado,
  capasDespues: tras.capas, errores: errores.filter((e) => !e.includes('401') && !e.includes('404')).slice(0, 6),
};
const ok = info.hayPreview
  && info.aviso.visible && /tapada/i.test(info.aviso.titulo)
  && /Capa de la máscara: «foto-abajo»/.test(info.nota || '')
  && info.difPreviewDocumento < 4
  && info.difPreviewCapa > 20
  && info.difPreviewAplicado < 2
  && info.capasDespues === 2;
info.ok = ok;
fs.writeFileSync(`${OUT}/94-produccion-caso-capas.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
console.log(ok ? '\nPASS: aviso de capa tapada y vista previa = lienzo completo' : '\nFALLO en el caso de capas');
await browser.close();
process.exit(ok ? 0 : 1);
