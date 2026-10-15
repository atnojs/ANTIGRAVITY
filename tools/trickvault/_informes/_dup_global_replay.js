// Replay del historial: simula un navegador que abre la app en cada revision
// (estado guardado = merge(filter(saved, REMOVED), SEED_TRICKS) de esa revision)
// y cuenta los codigos duplicados al final. Solo lectura.
//
// Uso: node _dup_global_replay.js <carpeta_con_revisiones> <salida.json>
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const salida = process.argv[3];
// Anclas robustas: el bloque de datos cambio de nombre de constantes con el tiempo.
const ANCLAS_INICIO = ['const STORAGE_KEY', 'const LEGACY_FOLDERS = [', 'const BASE_FOLDERS = [',
  'const EXCEL_FOLDERS = [', 'const INSTAGRAM_COMMANDS = ['];
const ANCLAS_FIN = ['function useLocalStorage', 'ReactDOM.createRoot', 'function App()'];

const ficheros = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();

function cargar(p) {
  const src = fs.readFileSync(p, 'utf8');
  const i = ANCLAS_INICIO.map(a => src.indexOf(a)).filter(x => x >= 0).sort((a, b) => a - b)[0];
  const j = ANCLAS_FIN.map(a => src.indexOf(a)).filter(x => x >= 0).sort((a, b) => a - b)[0];
  if (i === undefined || j === undefined || j <= i) return null;
  const code = src.slice(i, j) + `
    if (typeof SEED_TRICKS === 'undefined') return null;
    return { SEED_TRICKS,
             REMOVED_IMAGE_IDS: (typeof REMOVED_IMAGE_IDS !== 'undefined') ? REMOVED_IMAGE_IDS : new Set(),
             mergeSeedCards: (typeof mergeSeedCards === 'function') ? mergeSeedCards : null,
             normalizeTrickCategories: (typeof normalizeTrickCategories === 'function') ? normalizeTrickCategories : null,
             dedupeCardsByCommand: (typeof dedupeCardsByCommand === 'function') ? dedupeCardsByCommand : null,
             TEXT_COMMAND_TEMPLATES: (typeof TEXT_COMMAND_TEMPLATES === 'object') ? TEXT_COMMAND_TEMPLATES : {} };`;
  try { return new Function(code)(); } catch (e) { return { error: String(e).slice(0, 120) }; }
}

function mergePorId(saved, initial) {          // equivalente si la app no lo trae
  const ids = new Set(saved.map(x => x.id));
  return [...initial.filter(s => !ids.has(s.id)), ...saved];
}

let guardadas = [];
const traza = [];
for (const f of ficheros) {
  const app = cargar(path.join(dir, f));
  if (!app || app.error || !app.SEED_TRICKS) {
    traza.push({ fichero: f, nota: app && app.error ? app.error : 'sin bloque de datos' });
    continue;
  }
  const filtradas = guardadas.filter(x => !app.REMOVED_IMAGE_IDS.has(String(x.id)));
  const migradas = app.normalizeTrickCategories ? app.normalizeTrickCategories(filtradas) : filtradas;
  const merge = app.mergeSeedCards || mergePorId;
  guardadas = merge(migradas, app.SEED_TRICKS);
  if (app.dedupeCardsByCommand) guardadas = app.dedupeCardsByCommand(guardadas);
  const cuenta = new Map();
  for (const t of guardadas) {
    const k = String(t.codeSnippet || '').trim();
    if (k.startsWith('/')) cuenta.set(k, (cuenta.get(k) || 0) + 1);
  }
  traza.push({
    fichero: f,
    semillas: app.SEED_TRICKS.length,
    guardadas: guardadas.length,
    duplicados: [...cuenta.values()].filter(n => n > 1).length,
    maxId: Math.max(...[...cuenta.keys()].length ? [...guardadas].map(t => parseInt(String(t.id).replace(/\D/g, ''), 10) || 0) : [0]),
  });
}

const cuenta = new Map();
for (const t of guardadas) {
  const k = String(t.codeSnippet || '').trim();
  if (k.startsWith('/')) cuenta.set(k, (cuenta.get(k) || 0) + 1);
}
const dup = [...cuenta.entries()].filter(([, n]) => n > 1).map(([code, n]) => ({ code, n }));
const textos = new Set();
for (const f of ficheros) {
  const app = cargar(path.join(dir, f));
  if (app && app.TEXT_COMMAND_TEMPLATES) for (const k of Object.keys(app.TEXT_COMMAND_TEMPLATES)) textos.add(k);
}
const porCarpeta = {};
for (const t of guardadas) {
  const k = String(t.codeSnippet || '').trim();
  if (!k.startsWith('/') || cuenta.get(k) < 2) continue;
  porCarpeta[t.category] = (porCarpeta[t.category] || 0) + 1;
}
fs.writeFileSync(salida, JSON.stringify({
  revisiones: ficheros.length, guardadas: guardadas.length,
  duplicados: dup.length, duplicados_texto: dup.filter(d => textos.has(d.code)).length,
  detalle: dup, por_carpeta: porCarpeta, traza,
}, null, 1));
console.log('revisiones=%d guardadas=%d duplicados=%d (texto: %d)',
  ficheros.length, guardadas.length, dup.length, dup.filter(d => textos.has(d.code)).length);
