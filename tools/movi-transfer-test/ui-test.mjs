#!/usr/bin/env node
/**
 * Pruebas de interfaz de Movi Transfer en Chrome real (Playwright Core).
 *
 * Uso:
 *   node tools/movi-transfer-test/ui-test.mjs [--base=http://127.0.0.1:8099]
 *
 * Requiere `playwright-core` instalado fuera del repo (por defecto en
 * %TEMP%\movi-pw) y Chrome instalado. Hace el flujo completo —carga, QR,
 * subida, descarga, búsqueda, copia, borrado— en escritorio y móvil, comprueba
 * consola y desbordes, y guarda capturas + informe en tools/evidencias/.
 */

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.argv.find((arg) => arg.startsWith('--base='))?.split('=')[1] ?? 'http://127.0.0.1:8099';
const PW = process.env.MOVI_PW ?? path.join(os.tmpdir(), 'movi-pw', 'node_modules', 'playwright-core');
const AXE = process.env.MOVI_AXE ?? path.join(os.tmpdir(), 'movi-pw', 'node_modules', 'axe-core', 'axe.min.js');
const CHROME = process.env.MOVI_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EVIDENCIA = path.join(ROOT, 'tools', 'evidencias', `${new Date().toISOString().slice(0, 10)}-movi-transfer`);

const { chromium } = require(PW);
const resultados = [];
let fallos = 0;
let navegador = null;

function check(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok, detalle });
  if (!ok) fallos += 1;
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${nombre}${detalle ? `  — ${detalle}` : ''}\n`);
}

function sha(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function auditar(page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const resultado = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return resultado.violations.map(
      (violacion) => `${violacion.id} (${violacion.impact}): ${violacion.nodes.length} nodo(s)`,
    );
  });
}

async function main() {
  await fs.mkdir(EVIDENCIA, { recursive: true });
  const navegadorAbierto = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check', '--force-device-scale-factor=1'],
  });
  navegador = navegadorAbierto;

  const erroresConsola = [];
  const contexto = await navegador.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-ES',
    acceptDownloads: true,
  });
  await contexto.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await contexto.newPage();
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') erroresConsola.push(mensaje.text());
  });
  page.on('pageerror', (error) => erroresConsola.push(`pageerror: ${error.message}`));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  check('título de la página', (await page.title()).includes('Movi Transfer'));

  const textoUrl = (await page.textContent('#urlLan'))?.trim() ?? '';
  const esperado = new URL(BASE).host;
  check(
    'la página muestra la URL de la red local',
    textoUrl.startsWith('http://') && textoUrl.endsWith(esperado.split(':').pop()),
    textoUrl,
  );
  check('QR generado en SVG', (await page.locator('#qr svg').count()) === 1);
  check('estado del servidor activo', ((await page.textContent('#estadoTexto')) ?? '').includes('Servidor activo'));
  check(
    'Electrolize carga de verdad',
    await page.evaluate(() => document.fonts.check('16px Electrolize')),
  );

  await page.screenshot({ path: path.join(EVIDENCIA, 'escritorio-1440.png'), fullPage: true });

  // Copiar el enlace
  await page.click('#copiar');
  const portapapeles = await page.evaluate(() => navigator.clipboard.readText());
  check('botón copiar deja la URL en el portapapeles', portapapeles === textoUrl, portapapeles);

  // El selector real del móvil: tocar la zona abre el diálogo de archivos
  const [selector] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10_000 }),
    page.click('#zona'),
  ]);
  const nombreSelector = `selector-${Date.now()}.txt`;
  await selector.setFiles({
    name: nombreSelector,
    mimeType: 'text/plain',
    buffer: Buffer.from('archivo elegido desde el selector'),
  });
  await page.waitForFunction(
    (nombre) => Array.from(document.querySelectorAll('.archivo__nombre')).some((nodo) => nodo.textContent === nombre),
    nombreSelector,
    { timeout: 15_000 },
  );
  check('tocar la zona abre el selector de archivos', true, nombreSelector);
  page.once('dialog', (dialogo) => dialogo.accept());
  await page.click(`li.archivo:has-text("${nombreSelector}") .accion--borrar`);
  await page.waitForFunction(
    (nombre) => !Array.from(document.querySelectorAll('.archivo__nombre')).some((nodo) => nodo.textContent === nombre),
    nombreSelector,
    { timeout: 15_000 },
  );

  // Auditoría automática de accesibilidad (contexto aparte con bypassCSP sólo
  // para poder inyectar axe; la página auditada es la misma).
  const contextoAuditoria = await navegador.newContext({
    viewport: { width: 1440, height: 900 },
    bypassCSP: true,
    locale: 'es-ES',
  });
  const paginaAuditoria = await contextoAuditoria.newPage();
  await paginaAuditoria.goto(BASE, { waitUntil: 'networkidle' });
  const violaciones = await auditar(paginaAuditoria);
  check('axe sin violaciones WCAG A/AA (escritorio)', violaciones.length === 0, violaciones.join(' | '));

  // Subida desde el "móvil" (input file)
  const contenido = randomBytes(300 * 1024);
  const nombrePrueba = `prueba-ui-${Date.now()}.bin`;
  const origen = path.join(EVIDENCIA, 'origen.bin');
  await fs.writeFile(origen, contenido);

  const respuestaSubida = page.waitForResponse(
    (respuesta) => respuesta.url().includes('/api/upload') && respuesta.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await page.setInputFiles('#archivos', { name: nombrePrueba, mimeType: 'application/octet-stream', buffer: contenido });
  const respuesta = await respuestaSubida;
  check('subida desde la interfaz responde 201', respuesta.status() === 201);

  await page.waitForFunction(
    (nombre) => Array.from(document.querySelectorAll('.archivo__nombre')).some((nodo) => nodo.textContent === nombre),
    nombrePrueba,
    { timeout: 15_000 },
  );
  check('el archivo aparece en la lista', true, nombrePrueba);
  await page.screenshot({ path: path.join(EVIDENCIA, 'escritorio-con-archivo.png'), fullPage: true });

  // Descarga real y comparación de bytes
  const descarga = page.waitForEvent('download', { timeout: 15_000 });
  await page.click(`li.archivo:has-text("${nombrePrueba}") .accion`);
  const evento = await descarga;
  const destino = path.join(EVIDENCIA, 'descarga.bin');
  await evento.saveAs(destino);
  const descargado = await fs.readFile(destino);
  check('descarga desde la interfaz, byte a byte', sha(descargado) === sha(contenido), `${descargado.length} bytes`);

  // Búsqueda
  await page.fill('#buscar', 'zzz-no-existe');
  await page.waitForFunction(() => document.querySelector('#vacio')?.hidden === false);
  check(
    'búsqueda sin resultados muestra el estado vacío',
    ((await page.textContent('.vacio__titulo')) ?? '').includes('Sin coincidencias'),
  );
  await page.fill('#buscar', '');
  await page.waitForFunction(() => document.querySelector('#vacio')?.hidden === true);

  // Borrado con confirmación
  page.once('dialog', (dialogo) => dialogo.accept());
  await page.click(`li.archivo:has-text("${nombrePrueba}") .accion--borrar`);
  await page.waitForFunction(
    (nombre) => !Array.from(document.querySelectorAll('.archivo__nombre')).some((nodo) => nodo.textContent === nombre),
    nombrePrueba,
    { timeout: 15_000 },
  );
  check('borrado desde la interfaz', true);

  // Accesibilidad básica de los controles visibles
  const controlesSinNombre = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button, a[href]'))
      .filter((nodo) => nodo.offsetParent !== null)
      .filter((nodo) => !(nodo.getAttribute('aria-label') || nodo.textContent?.trim() || nodo.getAttribute('title')))
      .map((nodo) => nodo.outerHTML.slice(0, 120)),
  );
  check('todos los controles visibles tienen nombre accesible', controlesSinNombre.length === 0, controlesSinNombre.join(' | '));

  // Móvil real (390 × 844) y comprobación de desbordes
  const movil = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
  });
  const paginaMovil = await movil.newPage();
  const erroresMovil = [];
  paginaMovil.on('console', (mensaje) => {
    if (mensaje.type() === 'error') erroresMovil.push(mensaje.text());
  });
  paginaMovil.on('pageerror', (error) => erroresMovil.push(`pageerror: ${error.message}`));
  await paginaMovil.goto(BASE, { waitUntil: 'networkidle' });
  const desborde = await paginaMovil.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  check('sin desbordamiento horizontal en 390 px', desborde <= 1, `${desborde}px`);
  await paginaMovil.screenshot({ path: path.join(EVIDENCIA, 'movil-390.png'), fullPage: true });

  const contextoAxeMovil = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    bypassCSP: true,
    locale: 'es-ES',
  });
  const paginaAxeMovil = await contextoAxeMovil.newPage();
  await paginaAxeMovil.goto(BASE, { waitUntil: 'networkidle' });
  const violacionesMovil = await auditar(paginaAxeMovil);
  check('axe sin violaciones WCAG A/AA (móvil)', violacionesMovil.length === 0, violacionesMovil.join(' | '));

  await paginaMovil.setViewportSize({ width: 360, height: 780 });
  const desborde360 = await paginaMovil.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  check('sin desbordamiento horizontal en 360 px', desborde360 <= 1, `${desborde360}px`);
  await paginaMovil.screenshot({ path: path.join(EVIDENCIA, 'movil-360.png'), fullPage: true });

  const tableta = await navegador.newContext({ viewport: { width: 768, height: 1024 }, locale: 'es-ES' });
  const paginaTableta = await tableta.newPage();
  await paginaTableta.goto(BASE, { waitUntil: 'networkidle' });
  const desbordeTableta = await paginaTableta.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  check('sin desbordamiento horizontal en 768 px', desbordeTableta <= 1, `${desbordeTableta}px`);
  await paginaTableta.screenshot({ path: path.join(EVIDENCIA, 'tableta-768.png'), fullPage: true });

  check('sin errores de consola en escritorio', erroresConsola.length === 0, erroresConsola.join(' | '));
  check('sin errores de consola en móvil', erroresMovil.length === 0, erroresMovil.join(' | '));

  await navegador.close();

  await fs.writeFile(
    path.join(EVIDENCIA, 'ui.json'),
    `${JSON.stringify({ base: BASE, fecha: new Date().toISOString(), fallos, resultados }, null, 2)}\n`,
    'utf8',
  );
  await fs.rm(destino, { force: true });
  await fs.rm(origen, { force: true });

  process.stdout.write(`\n${resultados.length - fallos}/${resultados.length} comprobaciones correctas\n`);
  process.stdout.write(`Evidencias: ${EVIDENCIA}\n`);
  if (fallos > 0) process.exitCode = 1;
}

main().catch(async (error) => {
  process.stderr.write(`ERROR fatal: ${error.stack ?? error.message}\n`);
  process.exitCode = 1;
  if (navegador) await navegador.close().catch(() => {});
});
