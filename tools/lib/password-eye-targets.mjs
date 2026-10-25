/*
 * password-eye-targets.mjs — fuente única de verdad del alcance del visor.
 *
 * Devuelve las páginas publicadas (versionadas) que tienen un campo de
 * contraseña en su HTML/PHP, que lo crean por JS, o que piden la contraseña
 * del bloqueo de modelos (model-gate.js).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const EXCLUDE = [
  /(^|\/)(Backup|_backups|node_modules|archivo|_pruebas_img|_tooltip_kit|1archivos_originales)(\/|$)/,
  /(^|\/)Copias[^/]*(\/|$)/i,
  /_respaldo_\d+/i,
  /(^|\/)odysseus(\/|$)/,
];

// Páginas cuyo campo de contraseña lo pinta el JS de la app (no está en el HTML).
// Lista revisada a mano: login/registro de Firebase, bóveda, agenda y los
// formularios de las webs antiguas `web_apps` (login en modal) y `compilar`
// (paso de configuración con contraseña de MySQL).
export const DYNAMIC = [
  'apps/boveda_privada/index.html',
  'apps/brisa/index.php',
  'apps/imagenes_ia/index.html',
  'apps/imagenes_ia/ajustes_imagen/index.html',
  'apps/imagenes_ia/ajustes_imagen/editor_local/index.html',
  'apps/decorar_habitacion/5/index.html',
  'apps/paginas/web_apps/1/index.html',
  'apps/paginas/web_apps/index.html',
  'apps/paginas/web_apps/index2.html',
  'apps/paginas/web_apps/index_original.html',
  'webs/compilar/index.html',
  'webs/web_apps/1/index.html',
  'webs/web_apps/index.html',
  'webs/web_apps/index2.html',
  'webs/web_apps/index_original.html',
];

export function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'buffer' })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
}

// Latin1 conserva 1 byte = 1 carácter: útil para indexar buffers sin decodificar.
export function latin1(file) {
  return readFileSync(path.join(ROOT, file)).toString('latin1');
}

export function targetList() {
  const files = trackedFiles().filter((f) => /\.(html|php)$/i.test(f));
  const out = new Map(); // file -> motivo

  for (const f of files) {
    if (!/^(apps|webs)\//.test(f)) continue;
    if (EXCLUDE.some((re) => re.test(f))) continue;
    const text = latin1(f);
    if (/type\s*=\s*["']?\s*password\b/i.test(text)) out.set(f, 'password-markup');
    else if (/model-gate\.js/.test(text)) out.set(f, 'model-gate');
  }
  for (const f of DYNAMIC) {
    if (files.includes(f) && !out.has(f)) out.set(f, 'password-js');
  }
  if (files.includes('index.html')) out.set('index.html', 'password-markup');
  return out;
}

// Fichero versionado -> URL pública en la raíz del repo.
export function publicPath(file) {
  if (file === 'index.html') return '/';
  if (/\/index\.html$/i.test(file)) return '/' + file.replace(/index\.html$/i, '');
  return '/' + file;
}
