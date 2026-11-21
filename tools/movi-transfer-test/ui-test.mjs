#!/usr/bin/env node
/**
 * Pruebas de interfaz de Movi Transfer en Chrome real (Playwright Core).
 *
 * Uso:
 *   node tools/movi-transfer-test/ui-test.mjs [--base=http://127.0.0.1:8099]
 *
 * Requiere `playwright-core` y `axe-core` instalados fuera del repo (por
 * defecto en %TEMP%\movi-pw) y Chrome instalado. Recorre el flujo completo
 * —carga, selector, foco, vista previa, compartir, subida, descarga, búsqueda,
 * copia y borrado— en escritorio, móvil y tableta; audita WCAG con axe y guarda
 * capturas + informe.
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
    return {
      violaciones: resultado.violations.map(
        (violacion) => `${violacion.id} (${violacion.impact}): ${violacion.nodes.length} nodo(s)`,
      ),
      incompletos: resultado.incomplete
        .filter((item) => item.id === 'color-contrast')
        .reduce((suma, item) => suma + item.nodes.length, 0),
    };
  });
}

/** Mide el desbordamiento horizontal anulando el overflow-x:hidden que lo tapa. */
async function medirDesborde(page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const htmlPrevio = html.style.overflowX;
    const bodyPrevio = body.style.overflowX;
    html.style.overflowX = 'visible';
    body.style.overflowX = 'visible';
    const desborde = html.scrollWidth - window.innerWidth;
    html.style.overflowX = htmlPrevio;
    body.style.overflowX = bodyPrevio;
    return desborde;
  });
}

async function main() {
  await fs.mkdir(EVIDENCIA, { recursive: true });
  const estadoServidor = await (await fetch(`${BASE}/api/state`)).json();
  const urlEsperada = `http://${estadoServidor.ip}:${estadoServidor.port}`;

  // Fixtures para las vistas previas de PDF y DOCX (nombres únicos por pasada).
  const sello = Date.now();
  const fixtures = [
    { nombre: `prueba-${sello}.pdf`, archivo: 'prueba.pdf' },
    { nombre: `prueba-${sello}.docx`, archivo: 'prueba.docx' },
  ];
  const subidos = [];
  for (const fixture of fixtures) {
    const contenido = await fs.readFile(path.join(ROOT, 'tools', 'movi-transfer-test', 'fixtures', fixture.archivo));
    const respuesta = await fetch(`${BASE}/api/upload?name=${encodeURIComponent(fixture.nombre)}`, {
      method: 'POST',
      body: contenido,
    });
    if (respuesta.status === 201) subidos.push((await respuesta.json()).name);
  }
  const [pdfNombre, docxNombre] = subidos;
  check('fixtures PDF y DOCX subidas', Boolean(pdfNombre && docxNombre));

  navegador = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check', '--force-device-scale-factor=1'],
  });

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
  check('la página muestra la URL exacta de la red local', textoUrl === urlEsperada, textoUrl);
  check('estado del servidor activo', ((await page.textContent('#estadoTexto')) ?? '').includes('Servidor activo'));
  check('Electrolize carga de verdad', await page.evaluate(() => document.fonts.check('16px Electrolize')));
  await page.evaluate(() => document.fonts.ready);

  await page.screenshot({ path: path.join(EVIDENCIA, 'escritorio-1440.png') });

  await page.click('#copiar');
  const portapapeles = await page.evaluate(() => navigator.clipboard.readText());
  check('botón copiar deja la URL en el portapapeles', portapapeles === textoUrl, portapapeles);

  // Vista previa de un PDF real, dibujado con pdf.js
  await page.click(`li.archivo:has-text("${pdfNombre}") .archivo__nombre`);
  await page.waitForSelector('#capaVista:not([hidden])');
  await page.waitForSelector('.visor__pdf canvas', { timeout: 30_000 });
  const anchoPdf = await page.evaluate(() => document.querySelector('.visor__pdf canvas')?.width ?? 0);
  check('el PDF se dibuja dentro de la app (pdf.js)', anchoPdf > 100, `${anchoPdf}px`);
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(EVIDENCIA, 'vista-previa-pdf.png') });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#capaVista')?.hidden === true);

  // Vista previa de un DOCX real, convertido con mammoth
  await page.click(`li.archivo:has-text("${docxNombre}") .archivo__nombre`);
  await page.waitForSelector('.visor__docx', { timeout: 30_000 });
  await page.waitForFunction(
    () => document.querySelector('.visor__docx')?.textContent.includes('DOCX DE PRUEBA'),
    undefined,
    { timeout: 15_000 },
  );
  const textoDocx = (await page.textContent('.visor__docx')) ?? '';
  check('el DOCX se convierte y se lee dentro de la app', textoDocx.includes('DOCX DE PRUEBA'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(EVIDENCIA, 'vista-previa-docx.png') });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#capaVista')?.hidden === true);

  // El selector real del móvil: tocar la zona abre el diálogo de archivos.
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
  const filasSelector = await page.locator(`li.archivo:has-text("${nombreSelector}")`).count();
  check('tocar la zona abre el selector de archivos', filasSelector === 1, nombreSelector);

  // Vista previa de un archivo de texto al pulsar su nombre
  await page.click(`li.archivo:has-text("${nombreSelector}") .archivo__nombre`);
  await page.waitForSelector('#capaVista:not([hidden])');
  await page.waitForFunction(
    () => document.querySelector('.visor__texto')?.textContent.includes('archivo elegido desde el selector'),
    { timeout: 10_000 },
  );
  const textoVista = (await page.textContent('.visor__texto')) ?? '';
  check('la vista previa muestra el contenido del texto', textoVista.includes('archivo elegido desde el selector'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(EVIDENCIA, 'vista-previa-texto.png') });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#capaVista')?.hidden === true);
  const vistaCerrada = await page.evaluate(() => document.querySelector('#capaVista')?.hidden === true);
  check('Escape cierra la vista previa', vistaCerrada);

  // Menú de compartir con WhatsApp y Gmail
  await page.click(`li.archivo:has-text("${nombreSelector}") .accion--compartir`);
  await page.waitForSelector('#capaCompartir:not([hidden])');
  const whatsapp = await page.getAttribute('#compartirOpciones a[href^="https://wa.me/"]', 'href');
  const gmail = await page.getAttribute('#compartirOpciones a[href*="mail.google.com"]', 'href');
  check('el menú de compartir ofrece WhatsApp y Gmail', Boolean(whatsapp) && Boolean(gmail));
  check(
    'los enlaces de compartir llevan el nombre y la URL del archivo',
    Boolean(whatsapp?.includes(encodeURIComponent(nombreSelector)) && whatsapp?.includes('http')),
    whatsapp?.slice(0, 80),
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(EVIDENCIA, 'compartir.png') });
  await page.click('#cerrarCompartir');
  await page.waitForFunction(() => document.querySelector('#capaCompartir')?.hidden === true);

  // El refresco de 15 s no debe robar el foco ni repintar la lista.
  await page.focus(`li.archivo:has-text("${nombreSelector}") .accion--borrar`);
  const focoAntes = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
  await page.waitForTimeout(16_500);
  const focoDespues = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
  check('el refresco periódico conserva el foco del teclado', focoAntes !== '' && focoAntes === focoDespues, focoDespues);

  page.once('dialog', (dialogo) => dialogo.accept());
  await page.click(`li.archivo:has-text("${nombreSelector}") .accion--borrar`);
  await page.waitForFunction(
    (nombre) => !Array.from(document.querySelectorAll('.archivo__nombre')).some((nodo) => nodo.textContent === nombre),
    nombreSelector,
    { timeout: 15_000 },
  );
  const filasTrasBorrar = await page.locator(`li.archivo:has-text("${nombreSelector}")`).count();
  check('borrado desde la interfaz', filasTrasBorrar === 0);

  const auditoriaEscritorio = await auditarAuditoria(navegador, { width: 1440, height: 900 });
  check(
    'axe sin violaciones WCAG A/AA (escritorio)',
    auditoriaEscritorio.violaciones.length === 0,
    `${auditoriaEscritorio.violaciones.join(' | ')} · ${auditoriaEscritorio.incompletos} contraste(s) incompleto(s) por fondo degradado`,
  );

  // Subida desde el input file, con descarga real y comparación de bytes.
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
  const filasPrueba = await page.locator(`li.archivo:has-text("${nombrePrueba}")`).count();
  check('el archivo aparece en la lista', filasPrueba === 1, nombrePrueba);

  // Cualquier archivo abre su ficha de vista previa al pulsar el nombre
  await page.click(`li.archivo:has-text("${nombrePrueba}") .archivo__nombre`);
  await page.waitForSelector('#capaVista:not([hidden])');
  const vacioVista = (await page.textContent('.visor__vacio strong')) ?? '';
  check('un formato sin visor muestra su ficha con descarga y compartir', vacioVista.includes('No hay vista previa'));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#capaVista')?.hidden === true);
  await page.waitForTimeout(3600); // deja terminar animación y aviso
  await page.screenshot({ path: path.join(EVIDENCIA, 'escritorio-con-archivo.png') });

  const descarga = page.waitForEvent('download', { timeout: 15_000 });
  await page.click(`li.archivo:has-text("${nombrePrueba}") .accion--descargar`);
  const evento = await descarga;
  const destino = path.join(EVIDENCIA, 'descarga.bin');
  await evento.saveAs(destino);
  const descargado = await fs.readFile(destino);
  check('descarga desde la interfaz, byte a byte', sha(descargado) === sha(contenido), `${descargado.length} bytes`);

  await page.fill('#buscar', 'zzz-no-existe');
  await page.waitForFunction(() => document.querySelector('#vacio')?.hidden === false);
  check(
    'búsqueda sin resultados muestra el estado vacío',
    ((await page.textContent('.vacio__titulo')) ?? '').includes('Sin coincidencias'),
  );
  await page.fill('#buscar', '');
  await page.waitForFunction(() => document.querySelector('#vacio')?.hidden === true);

  page.once('dialog', (dialogo) => dialogo.accept());
  await page.click(`li.archivo:has-text("${nombrePrueba}") .accion--borrar`);
  await page.waitForFunction(
    (nombre) => !Array.from(document.querySelectorAll('.archivo__nombre')).some((nodo) => nodo.textContent === nombre),
    nombrePrueba,
    { timeout: 15_000 },
  );
  const restantesPrueba = await page.locator(`li.archivo:has-text("${nombrePrueba}")`).count();
  check('borrado del archivo de prueba', restantesPrueba === 0);

  // Regresión: el orden por última descarga debe refrescarse en la interfaz.
  const ordenA = `orden-a-${sello}.bin`;
  const ordenB = `orden-b-${sello}.bin`;
  await fetch(`${BASE}/api/upload?name=${encodeURIComponent(ordenA)}`, { method: 'POST', body: Buffer.from('A') });
  await new Promise((resolve) => setTimeout(resolve, 60));
  await fetch(`${BASE}/api/upload?name=${encodeURIComponent(ordenB)}`, { method: 'POST', body: Buffer.from('B') });
  await page.click('#refrescar');
  await page.waitForFunction(
    (nombre) => document.querySelector('.archivo__nombre')?.textContent === nombre,
    ordenB,
    { timeout: 15_000 },
  );
  const primeroAntes = (await page.textContent('.archivo__nombre')) ?? '';
  check('el último subido es el primero', primeroAntes === ordenB, primeroAntes);

  const descargaOrden = page.waitForEvent('download', { timeout: 15_000 });
  await page.click(`li.archivo:has-text("${ordenA}") .accion--descargar`);
  await descargaOrden;
  await page.waitForFunction(
    (nombre) => document.querySelector('.archivo__nombre')?.textContent === nombre,
    ordenA,
    { timeout: 15_000 },
  );
  const primeroDespues = (await page.textContent('.archivo__nombre')) ?? '';
  check('el último descargado vuelve a ser el primero', primeroDespues === ordenA, primeroDespues);
  await fetch(`${BASE}/api/files?name=${encodeURIComponent(ordenA)}`, { method: 'DELETE' });
  await fetch(`${BASE}/api/files?name=${encodeURIComponent(ordenB)}`, { method: 'DELETE' });

  // Accesibilidad básica de los controles visibles.
  const controlesSinNombre = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button, a[href]'))
      .filter((nodo) => nodo.offsetParent !== null)
      .filter((nodo) => !(nodo.getAttribute('aria-label') || nodo.textContent?.trim() || nodo.getAttribute('title')))
      .map((nodo) => nodo.outerHTML.slice(0, 120)),
  );
  check('todos los controles visibles tienen nombre accesible', controlesSinNombre.length === 0, controlesSinNombre.join(' | '));

  // Móvil real (390 × 844), con un archivo de muestra para que la captura
  // enseñe la lista tal y como la ve el usuario.
  const demoNombre = `demo-movil-${Date.now()}.txt`;
  await fetch(`${BASE}/api/upload?name=${encodeURIComponent(demoNombre)}`, {
    method: 'POST',
    body: Buffer.from('Archivo de demostración para la captura móvil.\n'),
  });

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
  await paginaMovil.evaluate(() => document.fonts.ready);
  await paginaMovil.screenshot({ path: path.join(EVIDENCIA, 'movil-390.png') });
  await paginaMovil.locator('#lista').scrollIntoViewIfNeeded();
  await paginaMovil.waitForTimeout(250);
  await paginaMovil.screenshot({ path: path.join(EVIDENCIA, 'movil-390-lista.png') });

  await paginaMovil.locator('.accion--compartir').first().click();
  await paginaMovil.waitForSelector('#capaCompartir:not([hidden])');
  await paginaMovil.waitForTimeout(400);
  await paginaMovil.screenshot({ path: path.join(EVIDENCIA, 'movil-compartir.png') });
  const altoHoja = await paginaMovil.evaluate(() => {
    const hoja = document.querySelector('.hoja');
    return hoja ? Math.round(hoja.getBoundingClientRect().height) : 0;
  });
  check('el menú de compartir cabe en el móvil', altoHoja > 0 && altoHoja <= 844, `${altoHoja}px`);
  await paginaMovil.keyboard.press('Escape');
  await paginaMovil.waitForFunction(() => document.querySelector('#capaCompartir')?.hidden === true);

  const desborde390 = await medirDesborde(paginaMovil);
  check('sin desbordamiento horizontal en 390 px', desborde390 <= 1, `${desborde390}px`);

  const auditoriaMovil = await auditarAuditoria(navegador, {
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
  });
  check(
    'axe sin violaciones WCAG A/AA (móvil)',
    auditoriaMovil.violaciones.length === 0,
    `${auditoriaMovil.violaciones.join(' | ')} · ${auditoriaMovil.incompletos} contraste(s) incompleto(s) por fondo degradado`,
  );

  await paginaMovil.setViewportSize({ width: 360, height: 780 });
  const desborde360 = await medirDesborde(paginaMovil);
  check('sin desbordamiento horizontal en 360 px', desborde360 <= 1, `${desborde360}px`);
  await paginaMovil.screenshot({ path: path.join(EVIDENCIA, 'movil-360.png') });

  const tableta = await navegador.newContext({ viewport: { width: 768, height: 1024 }, locale: 'es-ES' });
  const paginaTableta = await tableta.newPage();
  await paginaTableta.goto(BASE, { waitUntil: 'networkidle' });
  const desbordeTableta = await medirDesborde(paginaTableta);
  check('sin desbordamiento horizontal en 768 px', desbordeTableta <= 1, `${desbordeTableta}px`);
  await paginaTableta.screenshot({ path: path.join(EVIDENCIA, 'tableta-768.png') });
  await fetch(`${BASE}/api/files?name=${encodeURIComponent(demoNombre)}`, { method: 'DELETE' });

  check('sin errores de consola en escritorio', erroresConsola.length === 0, erroresConsola.join(' | '));
  check('sin errores de consola en móvil', erroresMovil.length === 0, erroresMovil.join(' | '));

  for (const nombre of [pdfNombre, docxNombre]) {
    if (nombre) await fetch(`${BASE}/api/files?name=${encodeURIComponent(nombre)}`, { method: 'DELETE' });
  }

  await navegador.close();
  navegador = null;

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

async function auditarAuditoria(contextoPadre, opciones) {
  const contexto = await contextoPadre.newContext({ ...opciones, bypassCSP: true, locale: 'es-ES' });
  const pagina = await contexto.newPage();
  await pagina.goto(BASE, { waitUntil: 'networkidle' });
  const resultado = await auditar(pagina);
  await contexto.close();
  return resultado;
}

main().catch(async (error) => {
  process.stderr.write(`ERROR fatal: ${error.stack ?? error.message}\n`);
  process.exitCode = 1;
  if (navegador) await navegador.close().catch(() => {});
});
