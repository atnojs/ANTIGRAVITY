// Lista los trabajos recientes del servidor de UIS·Hoola (solo lectura) para ver
// qué modelos y tipos de trabajo se han ejecutado de verdad.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = process.argv[2] || 'https://atnojs.es/apps/unified-image-studio-hoola/';
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext()).newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
const login = await page.evaluate(async (k) => {
  const r = await fetch('api.php?action=login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin', body: JSON.stringify({ password: k }),
  });
  return { status: r.status, body: (await r.text()).slice(0, 200) };
}, password);
console.log('login', JSON.stringify(login));
const datos = await page.evaluate(async () => {
  const salida = {};
  for (const q of ['job.list&limit=60', 'state', 'catalog']) {
    try {
      const r = await fetch(`api.php?action=${q}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' });
      salida[q] = { status: r.status, datos: await r.json() };
    } catch (e) { salida[q] = { error: String(e) }; }
  }
  return salida;
});
fs.writeFileSync('E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis/09-servidor.json', JSON.stringify(datos, null, 2));
const jobs = datos['job.list&limit=60']?.datos?.jobs || [];
console.log('jobs:', jobs.length);
for (const j of jobs.slice(0, 40)) console.log([j.createdAt && new Date(j.createdAt * 1000).toISOString(), j.kind, j.model, j.status, j.error || ''].join(' | '));
console.log('state:', JSON.stringify(datos.state?.datos));
await browser.close();
