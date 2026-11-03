// Reproduce el fallo real de la máscara en un documento que YA tiene ediciones:
//  1) importar -> inpainting en la franja superior (funciona la 1.ª vez)
//  2) guardar + recargar (la app recupera el proyecto, como Antonio)
//  3) inpainting en la franja inferior -> ¿se aplica el resultado a TODA la imagen?
//
// Mide el resultado aplicado en la capa contra la imagen que había antes del 2.º relleno.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = process.argv.find((a) => a.startsWith('--url='))?.slice(6) || 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const guardar = (dataUrl, nombre) => fs.writeFileSync(`${OUT}/${nombre}`, Buffer.from(String(dataUrl).slice(String(dataUrl).indexOf(',') + 1), 'base64'));

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
const consola = [];
page.on('console', (m) => { if (m.type() === 'error') consola.push(m.text()); });
page.on('pageerror', (e) => consola.push('pageerror: ' + e.message));

let ultimoEnviado = null;
let ultimaRespuesta = null;
page.on('request', (r) => { if (r.url().includes('action=job.create')) { try { ultimoEnviado = r.postDataJSON(); } catch { ultimoEnviado = null; } } });
page.on('response', async (r) => { if (r.url().includes('action=job.create')) { try { ultimaRespuesta = await r.json(); } catch { ultimaRespuesta = null; } } });

async function entrar() {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(800);
  await page.evaluate(async (k) => {
    await fetch('api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: JSON.stringify({ password: k }) });
  }, password);
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  // Si hay un modal de acceso u otro diálogo, cerrarlo.
  await page.evaluate(() => { document.querySelectorAll('.modal.hidden, .modal-backdrop').forEach(() => {}); });
}

async function pintarFranja(y) {
  await page.click('.rail-btn[data-tab="edit"]');
  await page.click('#maskMode .seg[data-mode="paint"]');
  await page.waitForTimeout(300);
  const g = await page.evaluate(() => {
    const r = document.getElementById('viewCanvas').getBoundingClientRect();
    const doc = window.__UIS__.state.doc;
    return { left: r.left, top: r.top, width: r.width, height: r.height, w: doc.width, h: doc.height };
  });
  const P = (x, yy) => ({ x: g.left + (x / g.w) * g.width, y: g.top + (yy / g.h) * g.height });
  const a = P(260, y); const b = P(764, y);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(a.x + (b.x - a.x) * i / 10, a.y, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}

async function rellenar(prompt) {
  await ponerPromptZonas(prompt);
  await page.click('#inpaintBtn');
  for (let t = 0; t < 240; t += 2) {
    const hayPreview = await page.locator('#aiPreview:not(.hidden)').count();
    const hayTray = await page.locator('#resultTray:not(.hidden)').count();
    if (hayPreview || hayTray) break;
    const toasts = await page.locator('.toast').allTextContents();
    if (toasts.some((x) => /fall|error/i.test(x))) break;
    await page.waitForTimeout(2000);
  }
  await page.waitForTimeout(600);
  const estado = { preview: await page.locator('#aiPreview:not(.hidden)').count(), enviado: ultimoEnviado ? { model: ultimoEnviado.model, mask: String(ultimoEnviado.mask || '').length } : null, respuesta: ultimaRespuesta ? { status: ultimaRespuesta.job?.status, error: ultimaRespuesta.job?.error || ultimaRespuesta.error } : null };
  const boton = (await page.locator('#aiPreview:not(.hidden) #aiAccept').count()) ? '#aiPreview:not(.hidden) #aiAccept' : '#acceptResult';
  await page.click(boton);
  await page.waitForTimeout(2500);
  return estado;
}

const leerCapa = () => page.evaluate(async () => {
  const u = window.__UIS__;
  const doc = u.state.doc;
  const layer = doc.layers.find((l) => l.id === u.state.selection.layerId) || doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return {
    png: c.toDataURL('image/png'),
    aspectOriginal: layer.aspectOriginal || null,
    tieneOriginalCargado: layer.aspectOriginal ? Boolean((u.state.resources.get(layer.aspectOriginal) || {}).url) : null,
    capas: doc.layers.length,
  };
});

const comparar = (aUrl, bUrl) => page.evaluate(async ({ aUrl, bUrl }) => {
  const cargar = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
  const A = await cargar(aUrl); const B = await cargar(bUrl);
  const c1 = document.createElement('canvas'); c1.width = 512; c1.height = 512; c1.getContext('2d').drawImage(A, 0, 0, 512, 512);
  const c2 = document.createElement('canvas'); c2.width = 512; c2.height = 512; c2.getContext('2d').drawImage(B, 0, 0, 512, 512);
  const d1 = c1.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 512, 512).data;
  const d2 = c2.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 512, 512).data;
  const zona = (x, y) => {
    const dx = x * 2; const dy = y * 2;
    if (Math.abs(dy - 200) <= 100) return 'franja1';
    if (Math.abs(dy - 820) <= 100) return 'franja2';
    return 'resto';
  };
  const acc = { franja1: [0, 0], franja2: [0, 0], resto: [0, 0] };
  for (let y = 0; y < 512; y += 2) {
    for (let x = 0; x < 512; x += 2) {
      const i = (y * 512 + x) * 4;
      const dif = (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2])) / 3;
      const z = zona(x, y);
      acc[z][1] += 1;
      if (dif > 24) acc[z][0] += 1;
    }
  }
  const pct = (k) => +(100 * acc[k][0] / Math.max(1, acc[k][1])).toFixed(1);
  return { franja1CambiadaPct: pct('franja1'), franja2CambiadaPct: pct('franja2'), restoCambiadoPct: pct('resto') };
}, { aUrl, bUrl });

// ── 1. Importar ──
await entrar();
const importada = await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#c0392b'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#27ae60'; x.fillRect(512, 0, 512, 512);
  x.fillStyle = '#2980b9'; x.fillRect(0, 512, 512, 512);
  x.fillStyle = '#f1c40f'; x.fillRect(512, 512, 512, 512);
  x.strokeStyle = '#111'; x.lineWidth = 10;
  x.beginPath(); x.moveTo(0, 0); x.lineTo(1024, 1024); x.stroke();
  x.beginPath(); x.moveTo(1024, 0); x.lineTo(0, 1024); x.stroke();
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  await window.__UIS__.importFiles([new File([blob], 'prueba.png', { type: 'image/png' })], { asLayer: true });
  return { capas: window.__UIS__.state.doc.layers.length, proyecto: window.__UIS__.state.project.id };
});
console.log('1) Importada', JSON.stringify(importada));
await page.waitForTimeout(1000);
const antes1 = await leerCapa();
guardar(antes1.png, '20-antes-1.png');

// ── 2. Primer relleno (franja superior) ──
await pintarFranja(200);
const r1 = await rellenar('Rellena la franja con un color lila plano y liso, sin texto.');
const tras1 = await leerCapa();
guardar(tras1.png, '21-tras-relleno-1.png');
const m1 = await comparar(antes1.png, tras1.png);
console.log('2) Relleno 1', JSON.stringify(r1), '| diferencias:', JSON.stringify(m1));

// ── 3. Guardar y recargar (la app recupera el proyecto) ──
await page.evaluate(() => window.__UIS__.saveNow('test'));
await page.waitForTimeout(2500);
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3500);
const restaurado = await page.evaluate(() => ({
  capas: window.__UIS__.state.doc?.layers.length,
  proyecto: window.__UIS__.state.project?.id,
  capa: (() => { const u = window.__UIS__; const d = u.state.doc; const l = d.layers.find((x) => x.id === u.state.selection.layerId) || d.layers[0]; return l ? { id: l.id, aspectOriginal: l.aspectOriginal || null, recursoExiste: Boolean(u.state.resources.get(l.resourceId)) } : null; })(),
}));
console.log('3) Tras recargar', JSON.stringify(restaurado));
const antes2 = await leerCapa();
guardar(antes2.png, '22-antes-2.png');
const m2 = await comparar(tras1.png, antes2.png);
console.log('   ¿La recarga cambió la capa?', JSON.stringify(m2));

// ── 4. Segundo relleno (franja inferior) ──
await pintarFranja(820);
const r2 = await rellenar('Rellena la franja con un color verde plano y liso, sin texto.');
const tras2 = await leerCapa();
guardar(tras2.png, '23-tras-relleno-2.png');
if (ultimaRespuesta?.job?.image) guardar(`data:image/png;base64,${ultimaRespuesta.job.image}`, '24-proveedor-2.png');
if (ultimoEnviado?.mask) guardar(ultimoEnviado.mask, '24-mascara-2.png');
const m3 = await comparar(antes2.png, tras2.png);
console.log('4) Relleno 2', JSON.stringify(r2), '| diferencias antes/después:', JSON.stringify(m3));

const medicion = {
  importada, relleno1: r1, diferencias1: m1, relleno2: r2, diferencias2: m3, restaurado, consola: consola.slice(0, 10),
};
fs.writeFileSync(`${OUT}/25-medicion-documento-editado.json`, JSON.stringify(medicion, null, 2));
console.log('\nMEDICIÓN:', JSON.stringify(medicion, null, 2));

// PASS si el 2.º relleno solo cambia su franja y conserva el resto (incluida la franja 1).
const ok = m3.franja2CambiadaPct > 20 && m3.restoCambiadoPct < 2 && m3.franja1CambiadaPct < 15;
console.log(ok ? '\nPASS: el 2.º relleno respeta la máscara y conserva lo anterior' : '\nFALLO: el 2.º relleno altera zonas fuera de la máscara');
await browser.close();
process.exit(ok ? 0 : 1);
