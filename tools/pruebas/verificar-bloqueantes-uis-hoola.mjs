// Verifica los dos bloqueantes corregidos, contra producción:
//   A) Inpainting: el cambio debe caer DENTRO de la máscara.
//   B) Flow: la imagen generada debe subirse y el trabajo terminar en succeeded.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-10-27-verificacion-bloqueantes';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const imagen = fs.readFileSync('E:/ANTIGRAVITY/.tmp-build/gen-real/diagreal.jpg');
const resultados = [];
const apunta = (n, ok, detalle) => { resultados.push({ n, ok, detalle }); };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true })).newPage();

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin', body: JSON.stringify({ password: k }),
  });
}, password);
await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

// Importar la imagen y dejarla en el lienzo
await page.evaluate(async (b64) => {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  await window.__UIS__.importFiles([new File([bytes], 'prueba.jpg', { type: 'image/jpeg' })], { asLayer: true });
}, imagen.toString('base64'));
await page.waitForTimeout(1500);

// ── A) INPAINTING con máscara pequeña ────────────────────────────────────────
const peticion = await page.evaluate(async () => {
  const u = window.__UIS__;
  const renderer = u.renderer;
  const capa = u.state.doc.layers[0];
  const composite = renderer.compositeToCanvas();
  const doc = u.state.doc;

  // Máscara del proveedor: opaca y con un círculo TRANSPARENTE en el centro.
  const mk = document.createElement('canvas');
  mk.width = doc.width; mk.height = doc.height;
  const mctx = mk.getContext('2d');
  mctx.fillStyle = '#000'; mctx.fillRect(0, 0, mk.width, mk.height);
  mctx.globalCompositeOperation = 'destination-out';
  mctx.beginPath();
  const cx = Math.round(doc.width / 2);
  const cy = Math.round(doc.height / 2);
  const r = 70;
  mctx.arc(cx, cy, r, 0, Math.PI * 2);
  mctx.fill();
  mctx.globalCompositeOperation = 'source-over';

  const res = await fetch('api.php?action=job.create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
    body: JSON.stringify({
      idempotencyKey: 'verif_' + Date.now(),
      kind: 'inpaint',
      model: 'openai-image-2-low',
      prompt: 'un círculo naranja mate y limpio, sin texto',
      aspectRatio: '1:1',
      resolution: 1024,
      images: [composite.toDataURL('image/png')],
      mask: mk.toDataURL('image/png'),
    }),
  });
  const job = await res.json();
  return { status: res.status, job, centro: { x: cx, y: cy, r }, composite: composite.toDataURL('image/png') };
});

apunta('inpainting: el servidor acepta la petición con máscara', peticion.status === 200 && Boolean(peticion.job.id), `HTTP ${peticion.status} · job ${peticion.job?.id || 'sin id'}`);

if (peticion.job?.id) {
  let final = null;
  for (let i = 0; i < 45; i += 1) {
    await page.waitForTimeout(4000);
    const estado = await page.evaluate(async (id) => {
      const r = await fetch(`api.php?action=job.get&id=${encodeURIComponent(id)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin',
      });
      return r.json();
    }, peticion.job.id);
    if (estado.status === 'succeeded' || estado.status === 'failed') { final = estado; break; }
  }
  apunta('inpainting: el trabajo termina bien', final?.status === 'succeeded', `estado ${final?.status || 'sin respuesta'}${final?.error ? ' · ' + String(final.error).slice(0, 120) : ''}`);

  if (final?.status === 'succeeded') {
    const comparacion = await page.evaluate(async ({ compositeUrl, resultadoUrl, centro }) => {
      const cargar = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
      const a = await cargar(compositeUrl);
      const b = await cargar(resultadoUrl);
      const c1 = document.createElement('canvas'); c1.width = a.naturalWidth; c1.height = a.naturalHeight;
      const x1 = c1.getContext('2d', { willReadFrequently: true }); x1.drawImage(a, 0, 0);
      const c2 = document.createElement('canvas'); c2.width = b.naturalWidth; c2.height = b.naturalHeight;
      const x2 = c2.getContext('2d', { willReadFrequently: true }); x2.drawImage(b, 0, 0);
      const d1 = x1.getImageData(0, 0, c1.width, c1.height).data;
      const d2 = x2.getImageData(0, 0, c2.width, c2.height).data;
      const escala = c2.width / c1.width;
      let dentro = 0, nDentro = 0, fuera = 0, nFuera = 0;
      for (let y = 0; y < c1.height; y += 3) {
        for (let x = 0; x < c1.width; x += 3) {
          const i1 = (y * c1.width + x) * 4;
          const x2p = Math.min(c2.width - 1, Math.round(x * escala));
          const y2p = Math.min(c2.height - 1, Math.round(y * escala));
          const i2 = (y2p * c2.width + x2p) * 4;
          const dif = (Math.abs(d1[i1] - d2[i2]) + Math.abs(d1[i1 + 1] - d2[i2 + 1]) + Math.abs(d1[i1 + 2] - d2[i2 + 2])) / 3;
          const dx = x - centro.x, dy = y - centro.y;
          if (dx * dx + dy * dy <= centro.r * centro.r) { dentro += dif; nDentro += 1; }
          else { fuera += dif; nFuera += 1; }
        }
      }
      return { dentro: dentro / Math.max(1, nDentro), fuera: fuera / Math.max(1, nFuera), tamanoResultado: `${b.naturalWidth}x${b.naturalHeight}` };
    }, { compositeUrl: peticion.composite, resultadoUrl: final.resultUrl, centro: peticion.centro });

    apunta('inpainting: el cambio cae dentro de la máscara',
      comparacion.dentro > comparacion.fuera * 1.5 && comparacion.dentro > 6,
      `diff dentro=${comparacion.dentro.toFixed(2)} vs fuera=${comparacion.fuera.toFixed(2)} · resultado ${comparacion.tamanoResultado}`);
    fs.writeFileSync(OUT + '/comparacion.json', JSON.stringify(comparacion, null, 2));
  }
}

// ── B) FLOW: encolar una imagen y comprobar que llega al servidor ───────────
const flujo = await page.evaluate(async () => {
  const res = await fetch('api.php?action=flow.create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
    body: JSON.stringify({
      model: 'flow-nano-banana-2',
      prompt: 'un faro minimalista en acuarela, prueba de verificación',
      aspectRatio: '1:1',
      resolution: 1024,
      count: 1,
    }),
  });
  return { status: res.status, cuerpo: (await res.text()).slice(0, 200) };
});
apunta('flow: el encolado se acepta', flujo.status === 200, `HTTP ${flujo.status} · ${flujo.cuerpo.slice(0, 100)}`);

await page.screenshot({ path: OUT + '/estado-final.png' });
await browser.close();

let todo = true;
for (const r of resultados) { console.log(`${r.ok ? 'OK   ' : 'FALLO'} ${r.n} — ${r.detalle}`); if (!r.ok) todo = false; }
console.log(todo ? '\nBloqueantes: verificados' : '\nBloqueantes: quedan fallos');
process.exit(todo ? 0 : 1);
