// Reproduce el merge REAL de la app: estado guardado de una revision anterior
// frente a las tarjetas semilla de hoy, con el mismo pipeline de useLocalStorage
// (filtro por REMOVED_IMAGE_IDS -> normalizeTrickCategories -> mergeSeedCards).
//
// Los ids de catalogo son POSICIONALES. Si una revision inserta un codigo en medio
// de un array, todos los siguientes cambian de numero: la tarjeta guardada (id
// viejo, codigo X) y la semilla nueva (id nuevo, codigo X) conviven -> duplicado.
//
// Solo lectura. Uso:
//   node _dup_global_merge.js <index_actual.html> <index_anterior.html> <salida.json>
const fs = require('fs');

const [actual, anterior, salida] = process.argv.slice(2);
const INICIO = 'const EXCEL_FOLDERS = [';
const FIN = 'function useLocalStorage';           // incluye normalizeTrickCategories y mergeSeedCards

function bloque(src, etiqueta) {
  const i = src.indexOf(INICIO);
  const j = src.indexOf(FIN);
  if (i < 0 || j < 0) throw new Error('anclas no encontradas en ' + etiqueta);
  return src.slice(i, j);
}

const srcNuevo = fs.readFileSync(actual, 'utf8');
const srcViejo = fs.readFileSync(anterior, 'utf8');
process.env.OUT_SIM = salida;

// El bloque de datos de la revision ANTIGUA da el estado "guardado" del navegador;
// el de la ACTUAL da las semillas y las funciones reales de merge.
const code = bloque(srcNuevo, 'actual') + '\n' +
  `// readFolderIds() ya vive dentro del bloque: sin localStorage en Node,
// loadFolders() cae en su catch y devuelve DEFAULT_FOLDERS (solo afecta a la
// carpeta asignada, no a los ids ni a los codigos).
const guardadas = SEED_TRICKS_VIEJO;
const filtradas = guardadas.filter(item => !REMOVED_IMAGE_IDS.has(String(item.id)));
const migradas = normalizeTrickCategories(filtradas);
const mezcladas = mergeSeedCards(migradas, SEED_TRICKS);
// useLocalStorage remata el pipeline con cleanLegacyImageCommandDescriptions(
// migrateGeneratedCardImages(merged)); si la revision trae dedupeCardsByCommand,
// se aplica igual que en la app.
const finales = (typeof dedupeCardsByCommand === 'function') ? dedupeCardsByCommand(mezcladas) : mezcladas;

const cuenta = new Map();
for (const t of finales) {
  const k = String(t.codeSnippet || '').trim();
  if (!k.startsWith('/')) continue;
  if (!cuenta.has(k)) cuenta.set(k, []);
  cuenta.get(k).push(t.id);
}
const duplicados = [...cuenta.entries()].filter(([, ids]) => ids.length > 1)
  .map(([code, ids]) => ({ code, ids, carpeta: (finales.find(t => String(t.codeSnippet||'').trim() === code) || {}).category || '' }))
  .sort((a, b) => a.code.localeCompare(b.code));

const textos = new Set(Object.keys(TEXT_COMMAND_TEMPLATES));
const dupTexto = duplicados.filter(d => textos.has(d.code));

require('fs').writeFileSync(process.env.OUT_SIM, JSON.stringify({
  guardadas: guardadas.length,
  semillas: SEED_TRICKS.length,
  mezcladas: mezcladas.length,
  finales: finales.length,
  duplicados: duplicados.length,
  duplicados_texto: dupTexto.length,
  detalle: duplicados,
  detalle_texto: dupTexto,
}, null, 1));
console.log('guardadas=%d semillas=%d mezcladas=%d | duplicados=%d (de texto: %d)',
  guardadas.length, SEED_TRICKS.length, mezcladas.length, duplicados.length, dupTexto.length);
`;

// El bloque antiguo se evalua aparte (mismo codigo, otra revision) y se inyecta
// como SEED_TRICKS_VIEJO en el mismo ambito.
const viejo = new Function(bloque(srcViejo, 'viejo') + '\nreturn { SEED_TRICKS };')();
const runner = new Function('SEED_TRICKS_VIEJO', 'require', code);
runner(viejo.SEED_TRICKS, require);
