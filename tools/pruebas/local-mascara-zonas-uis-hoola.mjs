// Reproduce el relleno por zonas de la máscara (v3.2.x) con un proveedor simulado
// que devuelve una imagen de un color según la palabra clave del prompt:
//   «cian» → cian, «humo» → gris, «hierba» → verde.
// Cada zona debe quedar con SU color; si una zona falla, se detecta.
//
// Uso: node tools/pruebas/local-mascara-zonas-uis-hoola.mjs [--dir=apps/unified-image-studio-hoola]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) || d;
const DIR = path.resolve(arg('dir', 'apps/unified-image-studio-hoola'));
const PORT = Number(arg('port', String(9400 + Math.floor(Math.random() * 100))));
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-11-03-mascara-zonas';
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
const servidor = http.createServer((req, res) => {
  const limpio = decodeURIComponent(req.url.split('?')[0]);
  const destino = path.join(DIR, limpio === '/' ? 'index.html' : limpio);
  if (!destino.startsWith(DIR) || !fs.existsSync(destino) || fs.statSync(destino).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(destino).pipe(res);
});
await new Promise((ok) => servidor.listen(PORT, '127.0.0.1', ok));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const page = await context.newPage();
const errores = [];
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));

await page.addInitScript(() => {
  const json = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const original = window.fetch.bind(window);
  window.__MOCK__ = { llamadas: [], prompts: [], fallos: 0 };
  window.fetch = async (entrada, init = {}) => {
    const url = typeof entrada === 'string' ? entrada : (entrada?.url || '');
    if (!url.includes('api.php')) return original(entrada, init);
    const action = new URL(url, location.href).searchParams.get('action') || '';
    let body = {};
    try { body = typeof init.body === 'string' ? JSON.parse(init.body) : {}; } catch { body = {}; }
    window.__MOCK__.llamadas.push({ action, model: body.model || null, kind: body.kind || null });
    if (action === 'state') return json({ ok: true, version: 'test', authenticated: true, configured: true, maxImageBytes: 14979657 });
    if (action === 'catalog') return json({ ok: true, providers: { openai: true, openrouter: true }, models: ['openai-image-2-low'] });
    if (action === 'job.create') {
      // Centro de la zona transparente de la máscara que se manda (debe ser distinto por zona).
      let centroMascara = null;
      if (typeof body.mask === 'string' && body.mask.startsWith('data:')) {
        try {
          const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = body.mask; });
          const cm = document.createElement('canvas'); cm.width = 256; cm.height = 256;
          cm.getContext('2d').drawImage(img, 0, 0, 256, 256);
          const dm = cm.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 256, 256).data;
          let sx = 0, sy = 0, n = 0;
          for (let y = 0; y < 256; y += 1) for (let x = 0; x < 256; x += 1) { const a = dm[(y * 256 + x) * 4 + 3]; if (a < 128) { sx += x; sy += y; n += 1; } }
          if (n) centroMascara = { x: +(sx / n / 256).toFixed(3), y: +(sy / n / 256).toFixed(3), px: n };
        } catch { /* máscara no decodificable */ }
      }
      window.__MOCK__.mascaras = window.__MOCK__.mascaras || [];
      window.__MOCK__.mascaras.push(centroMascara);
      const prompt = String(body.prompt || '').toLowerCase();
      window.__MOCK__.prompts.push(prompt.slice(0, 80));
      // Color según la palabra clave del prompt (las que usa el usuario).
      let color = '#ff00ff';
      if (prompt.includes('cian')) color = '#00e5ff';
      else if (prompt.includes('humo')) color = '#808080';
      else if (prompt.includes('hierba')) color = '#27ae60';
      const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
      const x = c.getContext('2d');
      x.fillStyle = color; x.fillRect(0, 0, 1024, 1024);
      const png = c.toDataURL('image/png');
      return json({ ok: true, job: { id: 'job_mock_' + Date.now(), status: 'succeeded', kind: body.kind || 'inpaint', model: body.model, image: png.split(',')[1], mimeType: 'image/png' } });
    }
    return json({ ok: true, projects: [] });
  };
});

await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);
const build = await page.evaluate(() => window.__UIS__?.build);

// Una capa de prueba.
await page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#202020'; x.fillRect(0, 0, 1024, 1024);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  await window.__UIS__.importFiles([new File([blob], 'base.png', { type: 'image/png' })], { asLayer: true });
});
await page.waitForTimeout(1000);

// Pintar 3 zonas separadas.
await page.click('.rail-btn[data-tab="edit"]');
await page.click('#maskMode .seg[data-mode="paint"]');
await page.waitForTimeout(300);
await page.evaluate(() => {
  const pincel = document.getElementById('brushSize');
  pincel.value = '120';
  pincel.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(200);
const g = await page.evaluate(() => {
  const r = document.getElementById('viewCanvas').getBoundingClientRect();
  const d = window.__UIS__.state.doc;
  return { l: r.left, t: r.top, w: r.width, h: r.height, dw: d.width, dh: d.height };
});
const P = (x, y) => ({ x: g.l + (x / g.dw) * g.w, y: g.t + (y / g.dh) * g.h });
for (const [x, y] of [[250, 250], [760, 250], [512, 800]]) {
  const p = P(x, y);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(350);
}
const zonas = await page.evaluate(() => {
  const u = window.__UIS__;
  const layer = u.state.doc.layers[0];
  return { zonas: layer.mask?.zones?.length || 0, trazos: layer.mask?.strokes?.length || 0, prompts: (layer.mask?.zones || []).map((z) => z.prompt) };
});
console.log('Zonas creadas:', JSON.stringify(zonas));

// Poner un prompt a cada zona.
const promptSets = ['pintar de cian', 'pintar de humo', 'pintar de hierba'];
await page.evaluate((prompts) => {
  const campos = [...document.querySelectorAll('[data-zone-prompt]')];
  campos.forEach((campo, i) => {
    campo.value = prompts[i] || '';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}, promptSets);
await page.waitForTimeout(500);
const zonasConPrompt = await page.evaluate(() => {
  const layer = window.__UIS__.state.doc.layers[0];
  return (layer.mask?.zones || []).map((z) => z.prompt);
});
console.log('Prompts:', JSON.stringify(zonasConPrompt));
const textoBoton = await page.locator('#inpaintBtn').textContent();
console.log('Botón:', textoBoton.trim());

// Rellenar y esperar la vista previa.
await page.click('#inpaintBtn');
let espera = 0;
while (espera < 120) {
  if (await page.locator('#aiPreview:not(.hidden)').count()) break;
  await page.waitForTimeout(1000);
  espera += 1;
}
const hayPreview = (await page.locator('#aiPreview:not(.hidden)').count()) === 1;
const toasts = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim()).slice(-4));
const llamadas = await page.evaluate(() => window.__MOCK__.prompts);
const mascaras = await page.evaluate(() => window.__MOCK__.mascaras || []);
console.log('Llamadas al proveedor:', JSON.stringify(llamadas));
console.log('Avisos:', JSON.stringify(toasts));
await page.screenshot({ path: `${OUT}/01-preview-zonas.png` });

let aplicado = null;
if (hayPreview) {
  const previewPng = await page.evaluate(async () => {
    const img = document.getElementById('aiPreviewImg');
    await new Promise((ok, mal) => { if (img.complete && img.naturalWidth) ok(); else { img.onload = ok; img.onerror = mal; } });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  });
  await page.evaluate(() => { const b = document.querySelector('#aiPreview:not(.hidden) #aiAccept'); if (b) b.click(); });
  await page.waitForTimeout(2000);
  const finalPng = await page.evaluate(async () => {
    const u = window.__UIS__;
    const layer = u.state.doc.layers[0];
    const res = u.state.resources.get(layer.resourceId);
    const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = res.url; });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  });
  const guardar = (dataUrl, n) => fs.writeFileSync(`${OUT}/${n}`, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  guardar(previewPng, '02-preview.png');
  guardar(finalPng, '03-final.png');
  aplicado = await page.evaluate(async (finalUrl) => {
    const cargar = (s) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = s; });
    const img = await cargar(finalUrl);
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    c.getContext('2d').drawImage(img, 0, 0, 256, 256);
    const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 256, 256).data;
    const muestra = (x, y) => {
      const i = (y * 256 + x) * 4;
      return [d[i], d[i + 1], d[i + 2]];
    };
    return {
      zona1: muestra(62, 62),
      zona2: muestra(190, 62),
      zona3: muestra(128, 200),
    };
  }, finalPng);
}
const info = { build, zonas, zonasConPrompt, textoBoton: textoBoton.trim(), hayPreview, llamadas, mascaras, toasts, aplicado, errores: errores.filter((e) => !e.includes('404')).slice(0, 6) };
fs.writeFileSync(`${OUT}/04-resultado.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 2));
const okMascaras = info.mascaras.length === 3 && info.mascaras.every((m) => m && m.px > 100)
  && info.mascaras[0].x < 0.45 && info.mascaras[1].x > 0.55 && info.mascaras[2].y > 0.6;
const ok = okMascaras && info.zonas.zonas === 3 && info.hayPreview && info.llamadas.length === 3
  && info.aplicado
  && info.aplicado.zona1[2] > 180 && info.aplicado.zona1[0] < 80      // cian
  && Math.abs(info.aplicado.zona2[0] - info.aplicado.zona2[1]) < 30 && info.aplicado.zona2[1] < 180 // gris
  && info.aplicado.zona3[1] > 120 && info.aplicado.zona3[0] < 120;   // verde
console.log(ok ? '\nPASS: las 3 zonas se rellenan con su prompt' : '\nFALLO: el relleno por zonas no aplica todas');
await browser.close();
servidor.close();
process.exit(ok ? 0 : 1);
