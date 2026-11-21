#!/usr/bin/env node
/**
 * Pruebas de la API de Movi Transfer. Uso:
 *   node tools/movi-transfer-test/verify.mjs [--base http://127.0.0.1:8099]
 *
 * Comprueba subida, descarga byte a byte (SHA-256), Range, nombres repetidos,
 * unicode, rutas maliciosas, borrado y subidas concurrentes. Deja el informe en
 * tools/evidencias/<fecha>-movi-transfer/api.json y sale con código 1 si falla.
 */

import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv.find((arg) => arg.startsWith('--base='))?.split('=')[1] ?? 'http://127.0.0.1:8099';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const INBOX = path.join(ROOT, 'apps', 'movi-transfer', '_inbox');
const EVIDENCIA = path.join(ROOT, 'tools', 'evidencias', `${new Date().toISOString().slice(0, 10)}-movi-transfer`);

const resultados = [];
let fallos = 0;

function check(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok, detalle });
  if (!ok) fallos += 1;
  const marca = ok ? 'PASS' : 'FAIL';
  process.stdout.write(`${marca}  ${nombre}${detalle ? `  — ${detalle}` : ''}\n`);
}

function sha(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function subir(nombre, contenido, opciones = {}) {
  const url = `${BASE}/api/upload?name=${encodeURIComponent(nombre)}`;
  return fetch(url, { method: 'POST', body: contenido, ...opciones });
}

async function descargar(nombre, headers = {}) {
  return fetch(`${BASE}/api/download?name=${encodeURIComponent(nombre)}`, { headers });
}

async function listar() {
  const res = await fetch(`${BASE}/api/files`);
  const datos = await res.json();
  return datos.files ?? [];
}

async function borrar(nombre) {
  return fetch(`${BASE}/api/files?name=${encodeURIComponent(nombre)}`, { method: 'DELETE' });
}

const creados = [];

async function main() {
  // 1. Salud y estado
  const salud = await fetch(`${BASE}/api/health`);
  const saludJson = await salud.json();
  check('health responde 200 y versión', salud.status === 200 && saludJson.ok === true, `v${saludJson.version}`);

  const estado = await (await fetch(`${BASE}/api/state`)).json();
  check(
    'state trae ip, puerto y bandeja',
    Boolean(estado.ip) && Number(estado.port) > 0 && Boolean(estado.inbox),
    `${estado.ip}:${estado.port}`,
  );

  // 2. Página y cabeceras
  const index = await fetch(`${BASE}/`);
  const html = await index.text();
  const csp = index.headers.get('content-security-policy') ?? '';
  check('index sirve HTML', index.status === 200 && html.includes('Movi Transfer'));
  check('index con CSP y nosniff', csp.includes("default-src 'self'") && index.headers.get('x-content-type-options') === 'nosniff');

  // 3. Subida y descarga idéntica
  const contenido = randomBytes(256 * 1024);
  const subida = await subir('prueba-api.bin', contenido);
  const subidaJson = await subida.json();
  creados.push(subidaJson.name);
  check('subida devuelve 201', subida.status === 201 && subidaJson.ok === true, subidaJson.name);

  const bajada = await descargar(subidaJson.name);
  const bytes = Buffer.from(await bajada.arrayBuffer());
  check('descarga byte a byte (SHA-256)', sha(bytes) === sha(contenido), `${bytes.length} bytes`);

  const head = await fetch(`${BASE}/api/download?name=${encodeURIComponent(subidaJson.name)}`, { method: 'HEAD' });
  check('HEAD de descarga', head.status === 200 && Number(head.headers.get('content-length')) === contenido.length);

  // 4. Range
  const rango = await descargar(subidaJson.name, { Range: 'bytes=10-19' });
  const trozo = Buffer.from(await rango.arrayBuffer());
  check(
    'Range devuelve 206 y 10 bytes exactos',
    rango.status === 206 && trozo.length === 10 && trozo.equals(contenido.subarray(10, 20)),
  );

  const sufijo = await descargar(subidaJson.name, { Range: 'bytes=-8' });
  const cola = Buffer.from(await sufijo.arrayBuffer());
  check(
    'Range sufijo devuelve los últimos 8 bytes',
    sufijo.status === 206 && cola.equals(contenido.subarray(-8)),
  );

  const sinRango = await descargar(subidaJson.name, { Range: 'bytes=999999999-' });
  check('Range fuera de rango devuelve 416', sinRango.status === 416);

  // Archivo vacío y archivo grande (20 MB) por streaming
  const vacioSubida = await subir('vacio.txt', Buffer.alloc(0));
  const vacioJson = await vacioSubida.json();
  creados.push(vacioJson.name);
  check('archivo de 0 bytes', vacioSubida.status === 201 && vacioJson.size === 0);

  const grandeContenido = randomBytes(20 * 1024 * 1024);
  const grandeSubida = await subir('grande-20mb.bin', grandeContenido);
  const grandeJson = await grandeSubida.json();
  creados.push(grandeJson.name);
  const grandeBajada = Buffer.from(await (await descargar(grandeJson.name)).arrayBuffer());
  check(
    'archivo de 20 MB íntegro (SHA-256)',
    grandeSubida.status === 201 && sha(grandeBajada) === sha(grandeContenido),
    `${grandeBajada.length} bytes`,
  );

  // 5. Nombre repetido
  const repetida = await subir('prueba-api.bin', Buffer.from('otra versión'));
  const repetidaJson = await repetida.json();
  creados.push(repetidaJson.name);
  check('nombre repetido no sobrescribe', repetidaJson.name === 'prueba-api (2).bin', repetidaJson.name);

  // 6. Unicode y espacios
  const unicode = await subir('foto ñandú – 2026 (1).txt', Buffer.from('hola'));
  const unicodeJson = await unicode.json();
  creados.push(unicodeJson.name);
  check('nombre unicode se conserva', unicode.status === 201 && unicodeJson.name === 'foto ñandú – 2026 (1).txt', unicodeJson.name);
  await borrar(unicodeJson.name);

  // 7. Rutas maliciosas y nombres prohibidos
  const traversal = await subir('..\\..\\fuera-de-la-bandeja.txt', Buffer.from('x'));
  const traversalJson = await traversal.json();
  if (traversalJson.ok) creados.push(traversalJson.name);
  const fuera = path.join(ROOT, 'apps', 'fuera-de-la-bandeja.txt');
  let existeFuera = true;
  try {
    await fs.access(fuera);
  } catch {
    existeFuera = false;
  }
  check('traversal no escribe fuera de la bandeja', !existeFuera, traversalJson.name ?? traversalJson.error);

  const punto = await subir('.htaccess', Buffer.from('x'));
  check('nombre que empieza por punto rechazado', punto.status === 400);

  const vacio = await subir('..', Buffer.from('x'));
  check('nombre ".." rechazado', vacio.status === 400);

  // 8. Métodos incorrectos
  const getSubida = await fetch(`${BASE}/api/upload`);
  check('GET en /api/upload devuelve 405', getSubida.status === 405);

  // 9. Concurrencia
  const lotes = Array.from({ length: 5 }, (_, i) => ({
    nombre: `concurrente-${i}.bin`,
    contenido: randomBytes(512 * 1024),
  }));
  const respuestas = await Promise.all(lotes.map((lote) => subir(lote.nombre, lote.contenido)));
  const creadosLote = await Promise.all(respuestas.map((res) => res.json()));
  creadosLote.forEach((item) => item.ok && creados.push(item.name));
  check('5 subidas concurrentes', respuestas.every((res) => res.status === 201), `${respuestas.filter((r) => r.status === 201).length}/5`);

  // 10. Descarga inexistente y borrado
  const noExiste = await descargar('no-existe-jamas.bin');
  check('descarga inexistente 404', noExiste.status === 404);

  const borrado = await borrar(subidaJson.name);
  check('borrado 200', borrado.status === 200);
  const trasBorrar = await descargar(subidaJson.name);
  check('tras borrar, descarga 404', trasBorrar.status === 404);

  // 11. Limpieza
  for (const nombre of creados) await borrar(nombre);
  const restantes = (await listar()).filter((file) => creados.includes(file.name));
  check('limpieza completa', restantes.length === 0, `${restantes.length} restantes`);

  await fs.mkdir(EVIDENCIA, { recursive: true });
  await fs.writeFile(
    path.join(EVIDENCIA, 'api.json'),
    `${JSON.stringify({ base: BASE, fecha: new Date().toISOString(), fallos, resultados }, null, 2)}\n`,
    'utf8',
  );

  process.stdout.write(`\n${resultados.length - fallos}/${resultados.length} pruebas correctas\n`);
  if (fallos > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`ERROR fatal: ${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
