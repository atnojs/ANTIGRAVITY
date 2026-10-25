#!/usr/bin/env node
/*
 * inject-password-eye.mjs — añade la etiqueta del visor de contraseña
 * (apps/_shared/password-eye.js) a todas las páginas publicadas que tienen
 * o crean campos type="password".
 *
 * Uso:
 *   node tools/inject-password-eye.mjs            # informe (dry-run)
 *   node tools/inject-password-eye.mjs --apply    # escribe los cambios
 *   node tools/inject-password-eye.mjs --check    # falla si falta alguna
 *
 * Reglas:
 *  - Solo actúa sobre ficheros versionados (git ls-files) de apps/ y webs/,
 *    y sobre index.html raíz, excluyendo backups/copias/evidencias.
 *  - Inserción a nivel de bytes: no decodifica ni reescribe la codificación
 *    original del fichero (hay páginas antiguas en latin1 / con BOM).
 *  - Inserta antes del ÚLTIMO </body> (evita los </body> que aparecen dentro
 *    de plantillas JS) o al final si no hay cierre de body.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, targetList, latin1 } from './lib/password-eye-targets.mjs';

const VERSION = '20261025a';
const TAG = `<script src="/apps/_shared/password-eye.js?v=${VERSION}" defer></script>`;
const MARK = 'password-eye.js';
const ATTR_MARK = 'data-agp-eye';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const CHECK = args.has('--check');

function insertTag(file) {
  const abs = path.join(ROOT, file);
  const buf = readFileSync(abs);
  const text = buf.toString('latin1');

  // Ya incluido: si la versión de la URL es distinta, se actualiza in situ
  // (misma longitud de bytes no garantizada, por eso se reescribe en latin1,
  // que conserva 1 byte = 1 carácter y no toca la codificación original).
  if (text.includes(MARK)) {
    const re = /password-eye\.js\?v=[A-Za-z0-9._-]+/g;
    const updated = text.replace(re, 'password-eye.js?v=' + VERSION);
    if (updated !== text) {
      if (APPLY) writeFileSync(abs, Buffer.from(updated, 'latin1'));
      return { file, action: 'update-version', tags: 1 };
    }
    return { file, action: 'skip' };
  }
  if (new RegExp(ATTR_MARK).test(text)) return { file, action: 'skip', tags: 0 };

  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lower = text.toLowerCase();

  // Algunas páginas PHP tienen VARIAS ramas con su propio </body> (login y
  // panel, por ejemplo) y el `exit` de la primera impide llegar al final del
  // fichero: se inserta el visor en todas las ramas. En HTML normal solo hay
  // un cierre real: se usa el último por si hay "</body>" dentro de plantillas JS.
  const closes = [];
  let from = 0;
  let pos = lower.indexOf('</body>', from);
  while (pos !== -1) {
    closes.push(pos);
    from = pos + 7;
    pos = lower.indexOf('</body>', from);
  }
  const isPhp = /\.php$/i.test(file);
  const indexes = closes.length === 0 ? [] : isPhp ? closes : [closes[closes.length - 1]];

  if (indexes.length === 0) {
    const next = Buffer.concat([buf, Buffer.from(nl + TAG + nl, 'utf8')]);
    if (APPLY) writeFileSync(abs, next);
    return { file, action: 'append', tags: 1 };
  }

  // Se construye de atrás hacia delante para que los índices no se desplacen.
  let next = buf;
  for (let i = indexes.length - 1; i >= 0; i--) {
    const idx = indexes[i];
    next = Buffer.concat([next.subarray(0, idx), Buffer.from(TAG + nl, 'utf8'), next.subarray(idx)]);
  }
  if (APPLY) writeFileSync(abs, next);
  return { file, action: 'insert-before-body', tags: indexes.length };
}

const targets = targetList();
const results = [];
for (const file of [...targets.keys()].sort()) results.push(insertTag(file));

const done = results.filter((r) => r.action !== 'skip');
const skipped = results.filter((r) => r.action === 'skip');

console.log(`password-eye ${VERSION} — ${APPLY ? 'APLICAR' : 'dry-run'}`);
console.log(`Objetivos: ${results.length} | pendientes: ${done.length} | ya incluidos: ${skipped.length}`);
for (const r of done) {
  const label = r.action === 'append' ? 'APPEND   ' : r.action === 'update-version' ? 'VERSION  ' : 'INSERTAR ';
  console.log(`  ${label} ${r.file}`);
}
if (skipped.length) {
  console.log('Ya incluidos (no se tocan):');
  for (const r of skipped) console.log(`  SKIP     ${r.file}`);
}

if (CHECK) {
  const missing = results.filter((r) => {
    const text = latin1(r.file);
    return !text.includes(MARK);
  });
  if (missing.length) {
    console.error(`FALTAN ${missing.length} páginas por incluir`);
    process.exitCode = 1;
  } else {
    console.log('OK: todas las páginas objetivo incluyen el visor.');
  }
}
