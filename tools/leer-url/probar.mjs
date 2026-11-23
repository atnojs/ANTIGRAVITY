#!/usr/bin/env node
/**
 * probar.mjs — pruebas de leer-url, sin dependencias.
 *
 *   node tools/leer-url/probar.mjs            # todo
 *   node tools/leer-url/probar.mjs --sin-red  # sólo lo que no sale a internet
 *
 * Comprueba lo que de verdad importa: que rechaza destinos privados (también por alias
 * DNS), que no se cuelga, que los códigos de salida son los pactados y que los tres
 * lectores devuelven texto. Sale con 1 si algo falla.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const HERRAMIENTA = path.join(AQUI, 'leer-url.mjs');
const SIN_RED = process.argv.includes('--sin-red');

let pasadas = 0;
let fallos = 0;
const falladas = [];

function correr(args, timeout = 25000) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [HERRAMIENTA, ...args], { encoding: 'utf8', timeout });
  return {
    codigo: r.status,
    salida: (r.stdout || '') + (r.stderr || ''),
    ms: Date.now() - t0,
    matado: r.error && r.error.code === 'ETIMEDOUT'
  };
}

function comprobar(nombre, condicion, detalle) {
  if (condicion) {
    pasadas++;
    console.log('  ok   ' + nombre);
  } else {
    fallos++;
    falladas.push(nombre);
    console.log('  FALLA ' + nombre + (detalle ? '  → ' + detalle : ''));
  }
}

function esperarCodigo(nombre, args, esperado, extra) {
  const r = correr(args);
  comprobar(nombre, r.codigo === esperado, 'salió ' + r.codigo + ' (esperaba ' + esperado + '): ' + r.salida.trim().split('\n')[0]);
  if (extra) extra(r);
  return r;
}

console.log('\n1. Destinos que no se deben leer (código 4)');
for (const url of [
  'http://127.0.0.1/',
  'http://10.0.0.1/',
  'http://192.168.1.1/',
  'http://169.254.169.254/latest/meta-data/',
  'http://localhost/',
  'file:///etc/passwd',
  'gopher://example.com/',
  'noesunaurl'
]) {
  esperarCodigo(url, [url], 4);
}

console.log('\n2. Alias DNS que apuntan a loopback (código 4 si hay DNS)');
if (SIN_RED) {
  console.log('  (omitido con --sin-red)');
} else {
  for (const url of ['http://localtest.me/', 'http://127.0.0.1.nip.io/', 'http://metadata.google.internal/']) {
    const r = correr([url]);
    if (r.codigo === 4) comprobar(url, true);
    else comprobar(url, false, 'salió ' + r.codigo + ': ' + r.salida.trim().split('\n')[0]);
  }
}

console.log('\n3. No se cuelga con un host que no responde (requiere red)');
if (SIN_RED) {
  console.log('  (omitido con --sin-red)');
} else {
  const r = correr(['http://192.0.2.1/'], 30000);
  comprobar('timeout en menos de 12 s', r.ms < 12000, 'tardó ' + r.ms + ' ms');
  comprobar('sale con 3', r.codigo === 3, 'salió ' + r.codigo);
}

console.log('\n4. Ayuda y códigos de error');
{
  const r = correr(['--ayuda']);
  comprobar('--ayuda sale con 0', r.codigo === 0);
  comprobar('--ayuda sin shebang', !r.salida.includes('#!'));
  comprobar('--ayuda explica los códigos', /Códigos de salida/.test(r.salida));
}


console.log('\n5. Lectura real (requiere red)');
if (SIN_RED) {
  console.log('  (omitido con --sin-red)');
} else {
  {
    const r = correr(['https://www.youtube.com/watch?v=_fgcYcSA7oo', '--no-cache'], 40000);
    comprobar('vídeo con subtítulos', r.codigo === 0 && /subtítulo .* de YouTube/.test(r.salida), r.salida.trim().split('\n')[0]);
    comprobar('subtítulo con texto suficiente', r.codigo === 0 && Number((r.salida.match(/· (\d+) caracteres/) || [])[1] || 0) > 20000);
  }
  {
    const r = correr(['https://github.com/nightly-labs/openbot', '--no-cache', '--max', '500'], 40000);
    comprobar('README de repo', r.codigo === 0 && /README de nightly-labs\/openbot/.test(r.salida), r.salida.trim().split('\n')[0]);
  }
  {
    const r = correr(['https://coarena.ai/docs', '--no-cache', '--max', '2000'], 40000);
    comprobar('texto de página con JS', r.codigo === 0 && /texto de la página/.test(r.salida), r.salida.trim().split('\n')[0]);
  }
  {
    const r = correr(['https://coarena.ai/docs', '--json', '--max', '300'], 40000);
    let ok = false;
    try { const j = JSON.parse(r.salida); ok = j.ok === true && j.chars === 300 && typeof j.texto === 'string'; } catch { /* no json */ }
    comprobar('--json devuelve JSON válido', ok);
  }
  {
    const destino = path.join(os.tmpdir(), 'leer-url-probar-' + Date.now() + '.txt');
    const r = correr(['https://example.org/', '--out', destino], 40000);
    const existe = fs.existsSync(destino);
    const tam = existe ? fs.statSync(destino).size : 0;
    comprobar('--out escribe el fichero', r.codigo === 0 && existe && tam > 50, 'bytes ' + tam);
    if (existe) fs.unlinkSync(destino);
  }
  {
    // --out imposible: se usa un FICHERO como si fuera carpeta, así falla en cualquier equipo
    const bloqueo = path.join(os.tmpdir(), 'leer-url-bloque-' + Date.now());
    fs.writeFileSync(bloqueo, 'x');
    const imposible = path.join(bloqueo, 'sub', 'x.txt');
    const r = correr(['https://example.org/', '--out', imposible], 40000);
    comprobar('--out imposible sale con 5', r.codigo === 5, 'salió ' + r.codigo + ': ' + r.salida.trim().split('\n')[0]);
    fs.unlinkSync(bloqueo);
  }
  {
    correr(['https://example.org/', '--no-cache'], 40000);
    const segunda = correr(['https://example.org/'], 40000);
    comprobar('la segunda pasada usa caché', /\(caché\)/.test(segunda.salida));
  }
}

console.log('\n' + (fallos === 0 ? 'TODO BIEN' : 'FALLOS') + ': ' + pasadas + ' ok, ' + fallos + ' fallos');
if (fallos) {
  console.log('Fallan: ' + falladas.join(', '));
  process.exit(1);
}
