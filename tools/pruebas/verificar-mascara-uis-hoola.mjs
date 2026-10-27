// Comprueba que el inpainting respeta la máscara: el cambio debe caer DENTRO.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-10-27-verificacion-bloqueantes';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const imagen = fs.readFileSync('E:/ANTIGRAVITY/.tmp-build/gen-real/diagreal.jpg');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
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

await page.evaluate(async (b64) => {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  await window.__UIS__.importFiles([new File([bytes], 'prueba.jpg', { type: 'image/jpeg' })], { asLayer: true });
}, imagen.toString('base64'));
await page.waitForTimeout(1500);

const salida = await page.evaluate(async () => {
  const u = window.__UIS__;
  const doc = u.state.doc;
  const composite = u.renderer.compositeToCanvas();
  const cx = Math.round(doc.width / 2);
  const cy = Math.round(doc.height / 2);
  const r = 70;
  const mk = document.createElement('canvas');
  mk.width = doc.width; mk.height = doc.height;
  const m = mk.getContext('2d');
  m.fillStyle = '#000'; m.fillRect(0, 0, mk.width, mk.height);
  m.globalCompositeOperation = 'destination-out';
  m.beginPath(); m.arc(cx, cy, r, 0, Math.PI * 2); m.fill();

  const res = await fetch('api.php?action=job.create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
    body: JSON.stringify({
      idempotencyKey: 'verif2_' + Date.now(),
      kind: 'inpaint',
      model: 'openai-image-2-low',
      prompt: 'un círculo naranja mate, sin texto',
      aspectRatio: '1:1',
      resolution: 1024,
      images: [composite.toDataURL('image/png')],
      mask: mk.toDataURL('image/png'),
    }),
  });
  const datos = await res.json();
  const job = datos.job || {};
  let b64 = job.image || '';
  let estado = job.status || 'sin-estado';
  if (!b64 && job.id) {
    for (let i = 0; i < 40; i += 1) {
      await new Promise((listo) => setTimeout(listo, 4000));
      const g = await fetch(`api.php?action=job.get&id=${encodeURIComponent(job.id)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin',
      });
      const j = await g.json();
      estado = j.status;
      if (j.image) { b64 = j.image; break; }
      if (j.status === 'failed') break;
    }
  }
  return {
    estado,
    error: job.error || '',
    composite: composite.toDataURL('image/png'),
    mascara: mk.toDataURL('image/png'),
    resultado: b64 ? (b64.startsWith('data:') ? b64 : 'data:image/png;base64,' + b64) : '',
    centro: { x: cx, y: cy, r },
  };
});

if (!salida.resultado) {
  console.log('FALLO el trabajo no devolvió imagen · estado ' + salida.estado + ' · ' + salida.error);
  await browser.close();
  process.exit(1);
}

const med = await page.evaluate(async ({ compositeUrl, resultadoUrl, centro }) => {
  const cargar = (src) => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
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
  let dentro = 0, nD = 0, fuera = 0, nF = 0, naranjasDentro = 0, naranjasFuera = 0;
  for (let y = 0; y < c1.height; y += 2) {
    for (let x = 0; x < c1.width; x += 2) {
      const i1 = (y * c1.width + x) * 4;
      const x2p = Math.min(c2.width - 1, Math.round(x * escala));
      const y2p = Math.min(c2.height - 1, Math.round(y * escala));
      const i2 = (y2p * c2.width + x2p) * 4;
      const dif = (Math.abs(d1[i1] - d2[i2]) + Math.abs(d1[i1 + 1] - d2[i2 + 1]) + Math.abs(d1[i1 + 2] - d2[i2 + 2])) / 3;
      const r2 = d2[i2], g2 = d2[i2 + 1], b2 = d2[i2 + 2];
      const esNaranja = r2 > 150 && g2 > 60 && g2 < 200 && b2 < 110;
      const dx = x - centro.x, dy = y - centro.y;
      const dentroCirculo = dx * dx + dy * dy <= centro.r * centro.r;
      if (dentroCirculo) { dentro += dif; nD += 1; if (esNaranja) naranjasDentro += 1; }
      else { fuera += dif; nF += 1; if (esNaranja) naranjasFuera += 1; }
    }
  }
  return {
    diffDentro: dentro / Math.max(1, nD),
    diffFuera: fuera / Math.max(1, nF),
    naranjaDentro: naranjasDentro,
    naranjaFuera: naranjasFuera,
    tamano: `${b.naturalWidth}x${b.naturalHeight}`,
  };
}, { compositeUrl: salida.composite, resultadoUrl: salida.resultado, centro: salida.centro });

const acierta = med.diffDentro > med.diffFuera * 1.5 && med.diffDentro > 6 && med.naranjaFuera < med.naranjaDentro * 0.5;
console.log(JSON.stringify({ estado: salida.estado, ...med, acierta }, null, 2));

// Guardar evidencias
const guardar = async (dataUrl, nombre) => {
  const base64 = dataUrl.split(',')[1];
  fs.writeFileSync(`${OUT}/${nombre}`, Buffer.from(base64, 'base64'));
};
await guardar(salida.composite, 'a-composicion.png');
await guardar(salida.mascara, 'b-mascara.png');
await guardar(salida.resultado, 'c-resultado.png');
await browser.close();
console.log(acierta ? '\nMáscara respetada: el cambio está dentro de la zona pintada' : '\nLa máscara NO se respeta: el cambio cae fuera');
process.exit(acierta ? 0 : 1);
