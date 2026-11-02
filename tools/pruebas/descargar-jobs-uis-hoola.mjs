// Descarga los resultados de trabajos concretos (solo lectura) para inspeccionarlos.
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-02-mascara-uis/jobs';
fs.mkdirSync(OUT, { recursive: true });
const ids = process.argv.slice(2);
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
for (const id of ids) {
  const datos = await page.evaluate(async (jobId) => {
    const r = await fetch(`api.php?action=job.get&id=${encodeURIComponent(jobId)}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' });
    return r.json();
  }, id);
  const job = datos.job || datos;
  const info = { id, status: job.status, model: job.model, kind: job.kind, len: (job.image || '').length, error: job.error || null };
  console.log(JSON.stringify(info));
  if (job.image) fs.writeFileSync(`${OUT}/${id}.png`, Buffer.from(job.image, 'base64'));
}
await browser.close();
