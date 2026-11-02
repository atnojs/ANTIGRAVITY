// Publica una versión nueva de los módulos ES de UIS·Hoola con nombre fechado.
// La CDN de Hostinger cachea los estáticos por RUTA e ignora `?v=`: si se edita
// `app.js` en el sitio, los navegadores pueden seguir recibiendo el viejo. Este
// script copia TODOS los módulos con sufijo de fecha y reescribe los imports
// entre ellos, para que se cargue una sola copia de cada módulo y todas de la
// misma versión.
//
// Uso: node tools/pruebas/versionar-modulos-uis.mjs 20261102
import fs from 'node:fs';
import path from 'node:path';

const VERSION = process.argv[2];
if (!/^\d{8}[a-z]?$/.test(VERSION || '')) {
  console.error('Uso: node tools/pruebas/versionar-modulos-uis.mjs YYYYMMDD[a-z]');
  process.exit(1);
}
const DIR = path.resolve('apps/unified-image-studio-hoola/assets/js');
const MODULOS = ['app', 'ai', 'core', 'exporter', 'flow', 'persist', 'render', 'tools', 'ui'];
const base = (n) => `${n}.${VERSION}.js`;

let escritos = 0;
for (const nombre of MODULOS) {
  const origen = path.join(DIR, `${nombre}.js`);
  if (!fs.existsSync(origen)) throw new Error(`Falta ${origen}`);
  let texto = fs.readFileSync(origen, 'utf8');
  for (const otro of MODULOS) {
    texto = texto.split(`'./${otro}.js?v=25'`).join(`'./${base(otro)}?v=${VERSION}'`);
    texto = texto.split(`"./${otro}.js?v=25"`).join(`"./${base(otro)}?v=${VERSION}"`);
  }
  const destino = path.join(DIR, base(nombre));
  fs.writeFileSync(destino, texto, 'utf8');
  escritos += 1;
  console.log('·', path.basename(destino), texto.length, 'bytes');
}

// Comprobación: ningún import debe quedar apuntando al módulo sin fecha.
for (const nombre of MODULOS) {
  const texto = fs.readFileSync(path.join(DIR, base(nombre)), 'utf8');
  const imports = [...texto.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
  for (const spec of imports) {
    if (!spec.startsWith('./')) throw new Error(`${base(nombre)}: import no relativo ${spec}`);
    const archivo = spec.split('?')[0].replace(/^\.\//, '');
    if (!MODULOS.some((m) => archivo === base(m))) throw new Error(`${base(nombre)}: import apunta a ${spec}`);
  }
  const repetidos = imports.filter((s) => !s.includes(`.${VERSION}.js`));
  if (repetidos.length) throw new Error(`${base(nombre)}: imports sin fecha: ${repetidos.join(', ')}`);
}
console.log(`\n${escritos} módulos versionados como *.${VERSION}.js`);

// index.html debe cargar la versión nueva (y solo ella).
const html = path.resolve('apps/unified-image-studio-hoola/index.html');
let indice = fs.readFileSync(html, 'utf8');
const antes = (indice.match(/assets\/js\/app[^"']*/) || ['(ninguna)'])[0];
indice = indice.replace(/assets\/js\/app[^"']*/g, `assets/js/${base('app')}?v=${VERSION}`);
fs.writeFileSync(html, indice, 'utf8');
const despues = (indice.match(/assets\/js\/app[^"']*/) || ['(ninguna)'])[0];
console.log(`index.html: ${antes} → ${despues}`);
