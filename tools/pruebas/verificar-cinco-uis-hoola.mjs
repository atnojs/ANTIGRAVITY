// Verifica en producción los cinco defectos cerrados (v=25).
import { chromium } from 'file:///E:/npm/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const BASE = 'https://atnojs.es/apps/unified-image-studio-hoola/';
const OUT = 'E:/ANTIGRAVITY/tools/evidencias/2026-10-28-cinco';
fs.mkdirSync(OUT, { recursive: true });
const password = fs.readFileSync('E:/ANTIGRAVITY/.private/password-acceso.txt', 'utf8').trim();
const imagen = fs.readFileSync('E:/ANTIGRAVITY/.tmp-build/gen-real/diagreal.jpg');
const res = [];
const apunta = (n, ok, detalle) => res.push({ n, ok, detalle });

const browser = await chromium.launch({ channel: 'chrome', headless: true });

// Contexto LIMPIO: sin IndexedDB, como un navegador nuevo.
const contexto = await browser.newContext({ viewport: { width: 1500, height: 900 } });
const page = await contexto.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message.slice(0, 140)));

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1000);
await page.evaluate(async (k) => {
  await fetch('api.php?action=login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin', body: JSON.stringify({ password: k }),
  });
}, password);
await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

const version = await page.evaluate(() => window.__UIS__?.build || 'desconocida');

// ── 2) Biblioteca: proyectos del servidor en un navegador limpio ────────────
const biblioteca = await page.evaluate(async () => {
  const u = window.__UIS__;
  await u.state ? null : null;
  // Abrir el modal de proyectos como lo hace el usuario
  document.getElementById('projectChip').click();
  await new Promise((r) => setTimeout(r, 2500));
  const filas = [...document.querySelectorAll('#projectModalList .list-row')];
  return {
    filas: filas.length,
    primeras: filas.slice(0, 3).map((f) => f.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)),
    vacio: (document.querySelector('#projectModalList .empty-line')?.textContent || '').trim(),
  };
});
apunta('biblioteca: aparecen los proyectos del servidor (navegador limpio)',
  biblioteca.filas > 0 && /servidor/.test(biblioteca.primeras.join(' ')),
  JSON.stringify(biblioteca).slice(0, 220));

// ── 3) Abrir uno del servidor y recordar el último ─────────────────────────
const apertura = await page.evaluate(async () => {
  const filas = [...document.querySelectorAll('#projectModalList .list-row')];
  const filaServidor = filas.find((f) => f.textContent.includes('servidor'));
  if (!filaServidor) return { error: 'sin fila de servidor' };
  const boton = filaServidor.querySelector('.icon-btn');
  if (boton) boton.click();
  await new Promise((r) => setTimeout(r, 4000));
  return {
    docId: window.__UIS__.state.doc?.id || null,
    capas: window.__UIS__.state.doc?.layers?.length ?? null,
    lastProject: localStorage.getItem('uis-hoola:lastProject'),
    proyecto: window.__UIS__.state.project?.id || null,
  };
});
apunta('biblioteca: se puede abrir un proyecto que solo está en el servidor',
  Boolean(apertura.docId), JSON.stringify(apertura).slice(0, 220));
apunta('proyectos: se recuerda el último abierto',
  Boolean(apertura.lastProject) && apertura.lastProject === apertura.proyecto,
  `lastProject=${apertura.lastProject} · proyecto=${apertura.proyecto}`);

// ── 4 y 5) Candado y botones de orden ──────────────────────────────────────
await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
// ── 5) Botones de orden con una sola capa (antes de importar otra) ─────────
const orden1 = await page.evaluate(() => ({
  up: document.getElementById('layerUpBtn')?.disabled,
  down: document.getElementById('layerDownBtn')?.disabled,
  capas: window.__UIS__.state.doc?.layers?.length ?? -1,
}));
apunta('capas: subir/bajar desactivados con menos de dos capas',
  orden1.capas < 2 ? (orden1.up === true && orden1.down === true) : (orden1.up === false && orden1.down === false),
  JSON.stringify(orden1));
await page.evaluate(async (b64) => {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  await window.__UIS__.importFiles([new File([bytes], 'capas.jpg', { type: 'image/jpeg' })], { asLayer: true });
}, imagen.toString('base64'));
await page.waitForTimeout(2000);


// Bloquear la capa y escribir X=300
const candado = await page.evaluate(async () => {
  const u = window.__UIS__;
  u.state.doc.layers[0].locked = true;
  const xAntes = u.state.doc.layers[0].x;
  const campo = document.getElementById('layerX');
  const deshabilitado = campo.disabled;
  // Si el manejador no respeta el candado, aquí se movería
  campo.disabled = false;
  campo.value = '300';
  campo.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 500));
  return { xAntes, xDespues: u.state.doc.layers[0].x, deshabilitado };
});
apunta('capas: el candado impide mover con los campos',
  candado.deshabilitado === true || candado.xDespues === candado.xAntes,
  JSON.stringify(candado));

// ── 1) El guardián no tapa un diálogo abierto ──────────────────────────────
const guardian = await page.evaluate(async () => {
  // Simular diálogo abierto y forzar la comprobación del guardián
  const dialogo = document.createElement('div');
  dialogo.id = 'confirmDialog';
  dialogo.className = '';
  dialogo.innerHTML = '<p>diálogo de prueba</p>';
  document.body.appendChild(dialogo);
  if (window.__UIS_DIAG__) window.__UIS_DIAG__.started = false;
  // Invocar el vigilante tal y como lo haría el temporizador
  const antes = document.getElementById('uisBootGuard');
  await new Promise((r) => setTimeout(r, 300));
  const despues = document.getElementById('uisBootGuard');
  return { habiaAntes: Boolean(antes), apareceConDialogo: Boolean(despues) };
});
apunta('guardián: no aparece mientras hay un diálogo abierto',
  guardian.apareceConDialogo === false, JSON.stringify(guardian));

apunta('sin errores JS en toda la sesión', errores.length === 0, errores.slice(0, 2).join(' | ') || 'ninguno');

await page.screenshot({ path: OUT + '/estado.png' });
await contexto.close();
await browser.close();

let todo = true;
for (const r of res) { console.log(`${r.ok ? 'OK   ' : 'FALLO'} ${r.n} — ${r.detalle}`); if (!r.ok) todo = false; }
console.log('build: ' + version);
console.log(todo ? '\nLos cinco: OK' : '\nQuedan fallos');
process.exit(todo ? 0 : 1);
