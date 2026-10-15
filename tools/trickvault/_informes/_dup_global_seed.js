// Verificacion INDEPENDIENTE del inventario de tarjetas semilla.
// Ejecuta el codigo REAL de apps/trickvault/index.html (el bloque de datos, sin JSX)
// en Node y vuelca id/codigo/carpeta de cada tarjeta de SEED_TRICKS.
// Solo lectura: escribe el volcado en %TEMP%\dup_global_seed.json
const fs = require('fs');
const path = require('path');

const SNAP = process.argv[2];
const OUT = process.argv[3];
const src = fs.readFileSync(SNAP, 'utf8');

const inicio = src.indexOf('const EXCEL_FOLDERS = [');
const fin = src.indexOf('const BROKEN_STORE_IMAGES');
if (inicio < 0 || fin < 0) { console.error('anclas no encontradas'); process.exit(2); }
const datos = src.slice(inicio, fin);

const code = datos + `
const filas = SEED_TRICKS.map(t => ({
  id: t.id,
  code: (typeof t.codeSnippet === 'string' ? t.codeSnippet.trim() : ''),
  categoria: t.category,
  imagen: t.imageUrl || '',
  tieneCustom: !!String(t.customPrompt || '').trim(),
}));
require('fs').writeFileSync(process.env.OUT_SEED, JSON.stringify({
  total: SEED_TRICKS.length,
  carpetas: DEFAULT_FOLDERS.map(f => f.id),
  filas,
  idPorCodigo: Object.keys(SEED_ID_BY_COMMAND).length,
}, null, 1));
`;
process.env.OUT_SEED = OUT;
new Function('require', code)(require);
console.log('SEED_TRICKS volcado en ' + OUT);
