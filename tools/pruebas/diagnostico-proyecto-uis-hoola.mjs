// Descarga (solo lectura) el proyecto indicado, sus recursos y un trabajo, para
// diagnosticar qué se aplicó y sobre qué capa.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis/diag-usuario';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const proyecto = process.argv[2];
const job = process.argv[3];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin', body: JSON.stringify({ password: k }) });
}, password);

const datos = await page.evaluate(async ({ id }) => {
  const cab = { 'X-Requested-With': 'XMLHttpRequest' };
  const doc = await (await fetch(`api.php?action=project.get&id=${encodeURIComponent(id)}`, { headers: cab, credentials: 'same-origin' })).json();
  const d = doc.doc || {};
  const salida = { proyecto: id, version: doc.version, docId: d.id, dimensiones: `${d.width}x${d.height}`, capas: [], archivos: [] };
  for (const capa of d.layers || []) {
    const info = {
      id: capa.id, nombre: capa.name, tipo: capa.type, x: capa.x, y: capa.y, w: capa.w, h: capa.h,
      resourceId: capa.resourceId, aspectOriginal: capa.aspectOriginal || null,
      inverted: Boolean(capa.mask?.inverted),
      trazos: (capa.mask?.strokes || []).map((s) => ({ mode: s.mode, size: s.size, puntos: s.pts?.length, primerPunto: s.pts?.[0] })),
    };
    salida.capas.push(info);
    for (const [etiqueta, rid] of [['layer', capa.resourceId], ['orig', capa.aspectOriginal]]) {
      if (!rid) continue;
      const r = await fetch(`api.php?action=resource&id=${encodeURIComponent(rid)}`, { headers: cab, credentials: 'same-origin' });
      if (!r.ok) { info[etiqueta] = 'HTTP ' + r.status; continue; }
      const buf = new Uint8Array(await r.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i += 1) bin += String.fromCharCode(buf[i]);
      salida.archivos.push({ nombre: `${id}-${capa.id.slice(-6)}-${etiqueta}.png`, base64: btoa(bin) });
      info[etiqueta] = `${buf.length} B`;
    }
  }
  return salida;
}, { id: proyecto });

const { archivos = [], ...resumen } = datos;
for (const archivo of archivos) fs.writeFileSync(`${OUT}/${archivo.nombre}`, Buffer.from(archivo.base64, 'base64'));
fs.writeFileSync(`${OUT}/${proyecto}-doc.json`, JSON.stringify(resumen, null, 2));
console.log(JSON.stringify(resumen, null, 2));

if (job) {
  const datos = await page.evaluate(async (id) => (await (await fetch(`api.php?action=job.get&id=${encodeURIComponent(id)}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })).json()), job);
  const img = datos.job?.image || datos.image;
  if (img) {
    fs.writeFileSync(`${OUT}/${job}.png`, Buffer.from(img, 'base64'));
    console.log('job', job, 'guardado', (img.length * 0.75 / 1024).toFixed(0), 'KB', 'status', datos.job?.status || datos.status);
  } else {
    console.log('job', job, 'sin imagen', JSON.stringify(datos).slice(0, 300));
  }
}
await browser.close();
