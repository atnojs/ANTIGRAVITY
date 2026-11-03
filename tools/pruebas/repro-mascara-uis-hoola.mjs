// Reproduce el flujo real de la máscara de Unified Image Studio · Hoola en producción:
// login -> importar imagen de prueba -> pintar máscara con el pincel (ratón real)
// -> escribir instrucción -> pulsar «Rellenar la máscara» -> Aceptar -> medir.
//
// Mide dos cosas:
//  1) La máscara que se ENVÍA al servidor (alfa transparente = zona a editar).
//  2) El resultado APLICADO en la capa (píxeles fuera de la zona pintada deben quedar igual).
//
// Uso: node tools/pruebas/repro-mascara-uis-hoola.mjs [--url=https://...]
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const argUrl = process.argv.find((a) => a.startsWith('--url='));
const BASE = argUrl ? argUrl.slice('--url='.length) : 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
fs.mkdirSync(OUT, { recursive: true });

const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const guardar = (dataUrl, nombre) => {
  const i = String(dataUrl).indexOf(',');
  fs.writeFileSync(`${OUT}/${nombre}`, Buffer.from(String(dataUrl).slice(i + 1), 'base64'));
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
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
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consola.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`));

let enviado = null;
let respuesta = null;
page.on('request', (r) => {
  if (!r.url().includes('action=job.create')) return;
  try { enviado = r.postDataJSON(); } catch { enviado = null; }
});
page.on('response', async (r) => {
  if (!r.url().includes('action=job.create')) return;
  try { respuesta = await r.json(); } catch { respuesta = null; }
});

console.log('Abriendo', BASE);
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(1200);

// Si sale el modal de acceso, entrar por la puerta normal.
if (await page.locator('#loginModal:not(.hidden)').count()) {
  await page.fill('#loginPassword', password);
  await page.click('#loginForm button[type="submit"], #loginBtn');
  await page.waitForTimeout(1500);
}
// Login por API (por si el modal ya no está y la sesión no vive en localStorage).
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
    body: JSON.stringify({ password: k }),
  });
}, password);
await page.reload({ waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);

const listo = await page.evaluate(() => ({
  arrancada: Boolean(window.__UIS__),
  problemas: (window.__UIS_DIAG__?.problems || []).slice(0, 6),
  error: window.__UIS_DIAG__?.problems?.length ? window.__UIS_DIAG__.problems[0] : null,
  servidor: window.__UIS__ ? undefined : null,
}));
console.log('Arranque:', JSON.stringify(listo));

// ── Importar una imagen de prueba con zonas de color distinguibles ──
const argImagen = process.argv.find((a) => a.startsWith('--image='));
const imagenExterna = argImagen ? fs.readFileSync(argImagen.slice('--image='.length)) : null;
const importada = await page.evaluate(async (b64) => {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const x = c.getContext('2d');
  if (b64) {
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = `data:image/png;base64,${b64}`; });
    x.drawImage(img, 0, 0, 1024, 1024);
  } else {
    x.fillStyle = '#c0392b'; x.fillRect(0, 0, 512, 512);
    x.fillStyle = '#27ae60'; x.fillRect(512, 0, 512, 512);
    x.fillStyle = '#2980b9'; x.fillRect(0, 512, 512, 512);
    x.fillStyle = '#f1c40f'; x.fillRect(512, 512, 512, 512);
    x.strokeStyle = '#111'; x.lineWidth = 10;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(1024, 1024); x.stroke();
    x.beginPath(); x.moveTo(1024, 0); x.lineTo(0, 1024); x.stroke();
  }
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'prueba-mascara.png', { type: 'image/png' });
  await window.__UIS__.importFiles([file], { asLayer: true });
  const doc = window.__UIS__.state.doc;
  return { w: doc.width, h: doc.height, capas: doc.layers.length, resumen: doc.layers.map((l) => ({ id: l.id, x: l.x, y: l.y, w: l.w, h: l.h, type: l.type })) };
}, imagenExterna ? imagenExterna.toString('base64') : null);
console.log('Importada:', JSON.stringify(importada));
await page.waitForTimeout(1200);

// ── Activar pincel de máscara y pintar una franja horizontal en el centro ──
await page.click('.rail-btn[data-tab="edit"]');
await page.click('#maskMode .seg[data-mode="paint"]');
await page.waitForTimeout(400);

const geometria = await page.evaluate(() => {
  const r = document.getElementById('viewCanvas').getBoundingClientRect();
  const doc = window.__UIS__.state.doc;
  return { left: r.left, top: r.top, width: r.width, height: r.height, docW: doc.width, docH: doc.height, tool: window.__UIS__.state.selection.tool };
});
console.log('Geometría:', JSON.stringify(geometria));
const aPantalla = (x, y) => ({
  x: geometria.left + (x / geometria.docW) * geometria.width,
  y: geometria.top + (y / geometria.docH) * geometria.height,
});

// Franja: de x=260 a x=764 en y=512, pincel 150 px
const p0 = aPantalla(260, 512);
const p1 = aPantalla(764, 512);
await page.mouse.move(p0.x, p0.y);
await page.mouse.down();
for (let i = 1; i <= 12; i += 1) {
  const t = i / 12;
  await page.mouse.move(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t, { steps: 3 });
  await page.waitForTimeout(20);
}
await page.mouse.up();
await page.waitForTimeout(600);

const estadoMascara = await page.evaluate(() => {
  const l = window.__UIS__.state.doc.layers.find((x) => x.id === window.__UIS__.state.selection.layerId) || window.__UIS__.state.doc.layers[0];
  const mask = window.__UIS__.renderer.maskCanvasFor(l);
  const ctx = mask.getContext('2d', { willReadFrequently: true });
  const d = ctx.getImageData(0, 0, mask.width, mask.height).data;
  let opacos = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 10) opacos += 1;
  return { trazos: (l.mask?.strokes || []).length, puntos: (l.mask?.strokes || []).map((s) => s.pts.length), opacos, total: mask.width * mask.height, w: mask.width, h: mask.height };
});
console.log('Máscara pintada:', JSON.stringify(estadoMascara));
await page.screenshot({ path: `${OUT}/01-mascara-pintada.png` });

// ── Instrucción y envío ──
await ponerPromptZonas('Rellena la franja con un color lila plano y liso, sin texto ni formas.');
await page.click('#inpaintBtn');

let espera = 0;
while (espera < 240) {
  const listoPreview = await page.locator('#resultTray:not(.hidden)').count();
  const errorToast = await page.locator('.toast.is-error, .toast[data-type="error"]').count();
  if (listoPreview || errorToast) break;
  await page.waitForTimeout(2000);
  espera += 2;
}
await page.waitForTimeout(800);

const preview = await page.evaluate(() => ({
  tray: !document.getElementById('resultTray').classList.contains('hidden'),
  srcLen: (document.getElementById('resultPreview').getAttribute('src') || '').length,
  toasts: [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()).slice(-4),
}));
console.log('Previsualización:', JSON.stringify(preview));
await page.screenshot({ path: `${OUT}/02-previsualizacion.png` });

if (enviado) {
  fs.writeFileSync(`${OUT}/03-request.json`, JSON.stringify({ prompt: enviado.prompt, model: enviado.model, kind: enviado.kind, aspectRatio: enviado.aspectRatio, imagesLen: enviado.images?.map((s) => String(s).length), maskLen: String(enviado.mask || '').length }, null, 2));
  if (enviado.images?.[0]) guardar(enviado.images[0], '03-composicion-enviada.png');
  if (enviado.mask) guardar(enviado.mask, '04-mascara-enviada.png');
}
if (respuesta?.job?.image) guardar(`data:image/png;base64,${respuesta.job.image}`, '05-resultado-proveedor.png');
console.log('Enviado:', enviado ? { modelo: enviado.model, kind: enviado.kind, mask: String(enviado.mask || '').length, images: enviado.images?.length } : 'NO CAPTURADO');
console.log('Respuesta:', respuesta ? { status: respuesta.job?.status, error: respuesta.job?.error || respuesta.error, tieneImagen: Boolean(respuesta.job?.image) } : 'NO CAPTURADA');

if (!preview.tray) {
  console.log('FALLO: no se llegó a la vista previa. Consola:', consola.slice(0, 10));
  await browser.close();
  process.exit(2);
}

// ── Aceptar y medir el resultado aplicado en la capa ──
const botonAceptar = (await page.locator('#aiPreview:not(.hidden) #aiAccept').count())
  ? '#aiPreview:not(.hidden) #aiAccept'
  : '#acceptResult';
console.log('Aceptar con', botonAceptar);
await page.click(botonAceptar);
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/06-aplicado.png` });

const medicion = await page.evaluate(async ({ prov, maskUrl, origB64 }) => {
  const u = window.__UIS__;
  const doc = u.state.doc;
  const layer = doc.layers.find((l) => l.id === u.state.selection.layerId) || doc.layers[0];
  const res = u.state.resources.get(layer.resourceId);
  const cargar = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });

  // Imagen original de prueba (la misma que se importó)
  const orig = document.createElement('canvas'); orig.width = 1024; orig.height = 1024;
  const ox = orig.getContext('2d');
  if (origB64) {
    const oi = await cargar(`data:image/png;base64,${origB64}`);
    ox.drawImage(oi, 0, 0, 1024, 1024);
  } else {
    ox.fillStyle = '#c0392b'; ox.fillRect(0, 0, 512, 512);
    ox.fillStyle = '#27ae60'; ox.fillRect(512, 0, 512, 512);
    ox.fillStyle = '#2980b9'; ox.fillRect(0, 512, 512, 512);
    ox.fillStyle = '#f1c40f'; ox.fillRect(512, 512, 512, 512);
    ox.strokeStyle = '#111'; ox.lineWidth = 10;
    ox.beginPath(); ox.moveTo(0, 0); ox.lineTo(1024, 1024); ox.stroke();
    ox.beginPath(); ox.moveTo(1024, 0); ox.lineTo(0, 1024); ox.stroke();
  }

  const img = await cargar(res.url);
  const fin = document.createElement('canvas'); fin.width = img.naturalWidth; fin.height = img.naturalHeight;
  fin.getContext('2d').drawImage(img, 0, 0);

  const A = document.createElement('canvas'); A.width = 512; A.height = 512;
  A.getContext('2d').drawImage(orig, 0, 0, 512, 512);
  const B = document.createElement('canvas'); B.width = 512; B.height = 512;
  B.getContext('2d').drawImage(fin, 0, 0, 512, 512);
  const da = A.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 512, 512).data;
  const db = B.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 512, 512).data;

  // Zona pintada: franja y=512±75, x 260..764 (en coords del documento 1024)
  const dentro = (x, y) => x >= 245 && x <= 780 && Math.abs(y - 512) <= 90;
  let nDentro = 0, cDentro = 0, nFuera = 0, cFuera = 0;
  let maxFuera = 0;
  for (let y = 0; y < 512; y += 2) {
    for (let x = 0; x < 512; x += 2) {
      const dx = x * 2, dy = y * 2;
      const i = (y * 512 + x) * 4;
      const dif = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
      if (dentro(dx, dy)) { nDentro += 1; if (dif > 24) cDentro += 1; }
      else { nFuera += 1; if (dif > 24) cFuera += 1; if (dif > maxFuera) maxFuera = dif; }
    }
  }
  // ¿La capa final es exactamente la imagen del proveedor (fallo del compuesto)?
  let igualProveedor = null;
  const provSrc = prov || null;
  if (provSrc) {
    const prov = await cargar(provSrc);
    const P = document.createElement('canvas'); P.width = 512; P.height = 512;
    P.getContext('2d').drawImage(prov, 0, 0, 512, 512);
    const dp = P.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 512, 512).data;
    let sum = 0, n = 0;
    for (let i = 0; i < dp.length; i += 4 * 7) { sum += Math.abs(dp[i] - db[i]); n += 1; }
    igualProveedor = +(sum / Math.max(1, n)).toFixed(2);
  }

  // Alfa de la máscara que viajó al servidor: transparencia = zona a editar.
  let mascara = null;
  if (maskUrl) {
    const m = await cargar(maskUrl);
    const M = document.createElement('canvas'); M.width = 512; M.height = 512;
    M.getContext('2d').drawImage(m, 0, 0, 512, 512);
    const dm = M.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 512, 512).data;
    let tD = 0, nD = 0, tF = 0, nF = 0;
    for (let y = 0; y < 512; y += 2) {
      for (let x = 0; x < 512; x += 2) {
        const i = (y * 512 + x) * 4;
        const trans = dm[i + 3] < 128;
        if (dentro(x * 2, y * 2)) { nD += 1; if (trans) tD += 1; } else { nF += 1; if (trans) tF += 1; }
      }
    }
    mascara = {
      transparenteDentroPct: +(100 * tD / Math.max(1, nD)).toFixed(1),
      transparenteFueraPct: +(100 * tF / Math.max(1, nF)).toFixed(1),
    };
  }

  return {
    capaW: img.naturalWidth, capaH: img.naturalHeight,
    docW: doc.width, docH: doc.height,
    dentroCambiadoPct: +(100 * cDentro / Math.max(1, nDentro)).toFixed(1),
    fueraCambiadoPct: +(100 * cFuera / Math.max(1, nFuera)).toFixed(1),
    maxDifFuera: +maxFuera.toFixed(1),
    sampleFuera: nFuera,
    difMediaVsProveedor: igualProveedor,
    mascaraEnviada: mascara,
    finalPng: fin.toDataURL('image/png'),
  };
}, {
  prov: respuesta?.job?.image ? `data:image/png;base64,${respuesta.job.image}` : null,
  maskUrl: enviado?.mask || null,
  origB64: imagenExterna ? imagenExterna.toString('base64') : null,
});

guardar(medicion.finalPng, '07-capa-final.png');
delete medicion.finalPng;
console.log('MEDICIÓN:', JSON.stringify(medicion, null, 2));
console.log('Consola:', consola.slice(0, 12));
fs.writeFileSync(`${OUT}/08-medicion.json`, JSON.stringify({ importada, geometria, estadoMascara, preview, medicion, consola }, null, 2));

const ok = medicion.fueraCambiadoPct < 2 && medicion.dentroCambiadoPct > 20;
console.log(ok ? '\nPASS: la máscara se respeta (fuera intacto, dentro cambiado)' : '\nFALLO: el cambio cae fuera de la máscara');
await browser.close();
process.exit(ok ? 0 : 1);
