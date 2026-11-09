// tools/verificar-sondeo-flow.mjs
//
// Arnés de regresión del sondeo de la cola de Flow Studio Hoola.
//
// Motivo: el 2026-11-09 se corrigió que la pantalla se quedara «generando» para
// siempre. El primer intento (20261109a) arregló el caso del trabajo 13 pero rompió
// el caso normal, porque dejó de contar los trabajos ya terminados. El verificador
// independiente lo cazó; esta prueba evita que vuelva.
//
// Cómo funciona: NO reimplementa el bucle. Extrae el bloque de recuento TAL CUAL
// está en el fichero servido y lo ejecuta con el contrato del servidor modelado
// (la cola devuelve estado de 12 ids como mucho). Si el bloque cambia de forma que
// el sondeo deje de cerrar, esto falla.
//
// Uso:
//   node tools/verificar-sondeo-flow.mjs
//   node tools/verificar-sondeo-flow.mjs --archivo apps/flow_studio_hoola/app.20261109a.js
//
// Sale 0 si pasa, 1 si falla.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(AQUI, '..', 'apps', 'flow_studio_hoola');
const CAP_SERVIDOR = 12; // flow_queue.php: array_slice($ids, 0, 12)

function rutaAsset(argumentos) {
  const i = argumentos.indexOf('--archivo');
  if (i >= 0) {
    const p = path.resolve(process.cwd(), argumentos[i + 1]);
    if (!fs.existsSync(p)) throw new Error('no existe el archivo indicado: ' + p);
    return p;
  }
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  const m = html.match(/src="(app\.\d{8}[a-z]?\.js)"/);
  if (!m) throw new Error('index.html no referencia ningún app.*.js');
  return path.join(APP, m[1]);
}

function cargarBloque(archivo) {
  const src = fs.readFileSync(archivo, 'utf8');
  const inicio = src.indexOf('        for (const id of ids) {');
  const fin = src.indexOf('\n        const total = ids.length;', inicio);
  if (inicio < 0 || fin < 0) throw new Error('no se localiza el bucle de recuento en ' + archivo);
  const bloque = src.slice(inicio, fin);

  // Regresión concreta que rompió el intento de 20261109a: saltarse el recuento
  // cuando no hay respuesta del servidor.
  const desdePoll = src.indexOf('async function pollOnce()');
  const enPollOnce = src.slice(desdePoll, desdePoll < 0 ? 0 : src.indexOf('\n    }', desdePoll));
  if (/if \(!info\)\s*continue/.test(enPollOnce)) {
    throw new Error('pollOnce() vuelve a saltarse el recuento con "if (!info) continue"');
  }

  return new Function(
    'state', 'data', 'ids', 'composeMaskedUrl', 'markDone', 'saveToHistory',
    'markError', 'markRunning', 'console',
    `return (async () => {
       let done = 0, running = 0, pending = 0, failed = 0;
       ${bloque}
       return { done, running, pending, failed };
     })();`
  );
}

function nuevoJob(status) {
  return { status, type: 'image', mask: null, source: null };
}

// Un sondeo tal como lo hace el fichero: se piden solo los que siguen en curso,
// el servidor recorta a 12 y responde por cada uno.
async function sondeo(run, state, servidor) {
  const ids = [...state.jobs.keys()];
  const enCurso = ids.filter((id) => {
    const j = state.jobs.get(id);
    return j.status === 'queued' || j.status === 'running';
  });
  const pedidos = enCurso.slice(0, CAP_SERVIDOR);
  const data = {
    jobs: Object.fromEntries(pedidos.map((id) => [id, servidor(id, state.jobs.get(id))])),
  };
  const c = await run(state, data, ids, async (u) => u,
    (j, info) => { j.status = 'done'; j.url = info.url; },
    async () => undefined,
    (j, e) => { j.error = e; },
    () => undefined,
    { warn() {} });
  return { ...c, total: ids.length, cerro: c.done + c.failed >= ids.length };
}

async function escenario(run, terminados, nuevos, segundosPorTrabajo = 2) {
  const state = { jobs: new Map() };
  for (let i = 0; i < terminados; i++) state.jobs.set('hecho' + i, nuevoJob('done'));
  for (let i = 0; i < nuevos; i++) state.jobs.set('nuevo' + i, nuevoJob('queued'));

  const visitas = new Map();
  const servidor = (id, j) => {
    if (j.status === 'done') return { status: 'done', url: 'x' };
    const n = (visitas.get(id) || 0) + 1;
    visitas.set(id, n);
    return n >= segundosPorTrabajo ? { status: 'done', url: 'x' } : { status: 'running', url: 'x' };
  };

  for (let i = 0; i < 40; i++) {
    const r = await sondeo(run, state, servidor);
    if (r.cerro) return { cerro: true, sondeos: i + 1 };
  }
  return { cerro: false, sondeos: 40 };
}

const archivo = rutaAsset(process.argv.slice(2));
const nombre = path.basename(archivo);
console.log('Verificando el sondeo de la cola');
console.log('  asset: ' + nombre);

let run;
try {
  run = cargarBloque(archivo);
} catch (e) {
  console.error('  FALLA ' + e.message);
  process.exit(1);
}

const casos = [
  ['2ª generación (1 terminada + 1 nueva)', 1, 1],
  ['trabajo 13 (12 terminadas + 1 nueva)', 12, 1],
  ['13 en curso a la vez (tope de 12)', 0, 13],
];

let fallos = 0;
for (const [etiqueta, terminados, nuevos] of casos) {
  const r = await escenario(run, terminados, nuevos);
  const marca = r.cerro ? 'OK  ' : 'FALLA';
  if (!r.cerro) fallos++;
  console.log(`  ${marca} ${etiqueta.padEnd(38)} ${r.cerro ? 'cierra en ' + r.sondeos + ' sondeo(s)' : 'NO cierra (40 sondeos)'}`);
}

if (fallos) {
  console.error(`\n${fallos} caso(s) sin cerrar: el sondeo dejaría la pantalla bloqueada.`);
  process.exit(1);
}
console.log('\nOK: el sondeo cierra en todos los casos.');
