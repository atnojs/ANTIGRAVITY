// Inspecciona los proyectos guardados en el servidor: capas, aspectOriginal y si
// sus recursos existen. Solo lectura.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis';
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin', body: JSON.stringify({ password: k }),
  });
}, password);
const datos = await page.evaluate(async () => {
  const salida = {};
  const lista = await (await fetch('api.php?action=project.list', { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })).json();
  salida.proyectos = lista.projects || lista.proyectos || [];
  salida.detalle = [];
  for (const p of salida.proyectos.slice(0, 8)) {
    const d = await (await fetch(`api.php?action=project.get&id=${encodeURIComponent(p.id)}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })).json();
    const doc = d.doc || {};
    const capas = (doc.layers || []).map((l) => ({ id: l.id, type: l.type, resourceId: l.resourceId, aspectOriginal: l.aspectOriginal || null, maskStrokes: l.mask?.strokes?.length || 0, name: l.name }));
    // ¿existen los recursos?
    const recursos = {};
    for (const capa of capas) {
      for (const rid of [capa.resourceId, capa.aspectOriginal].filter(Boolean)) {
        if (recursos[rid] !== undefined) continue;
        const r = await fetch(`api.php?action=resource&id=${encodeURIComponent(rid)}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' });
        recursos[rid] = r.status;
      }
    }
    salida.detalle.push({ id: p.id, nombre: p.name || doc.name, version: d.version, updatedAt: p.updatedAt || doc.updatedAt, capas, recursos });
  }
  return salida;
});
fs.writeFileSync(`${OUT}/10-proyectos-servidor.json`, JSON.stringify(datos, null, 2));
console.log('proyectos:', datos.proyectos.length);
for (const d of datos.detalle) {
  console.log('—', d.id, d.nombre, '| capas:', d.capas.length);
  for (const c of d.capas) console.log('   ', JSON.stringify(c), '| recurso:', d.recursos[c.resourceId], '| original:', c.aspectOriginal ? d.recursos[c.aspectOriginal] : '—');
}
await browser.close();
