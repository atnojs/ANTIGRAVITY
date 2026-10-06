// Comprueba los datos de las transferencias «1 → 2» en apps/trickvault/index.html
// y que los ids de catálogo (posicionales) NO se hayan desplazado respecto a HEAD.
const fs = require('fs');
const parser = require('E:/ANTIGRAVITY/node_modules/@babel/parser');

const ACTUAL = 'E:/ANTIGRAVITY/apps/trickvault/index.html';
// Versión anterior: se vuelca aparte con git (node no puede capturar la salida de
// un subproceso en este entorno: EPERM al abrir el pipe).
const HEAD = 'E:/ANTIGRAVITY/_pruebas_img/transfer_1to2/_head_index.html';

function scriptBabel(src) {
  const m = src.match(/<script[^>]*type=["']text\/babel["'][^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('sin script babel');
  return m[1];
}

function evaluar(script) {
  const ast = parser.parse(script, { sourceType: 'script', plugins: ['jsx'] });
  const candidatas = [];
  for (const n of ast.program.body) {
    const texto = script.slice(n.start, n.end);
    if (n.type === 'VariableDeclaration') {
      // Los nombres salen del AST: buscarlos con regex capturaba los `const` que
      // viven DENTRO de los strings de los snippets (s6: "const range = ...").
      const nombres = n.declarations.map(d => d.id?.name).filter(Boolean);
      if (nombres.length) candidatas.push({ code: texto, nombres });
    } else if (n.type === 'ExpressionStatement' && /^Object\.assign\(SEED_COMMAND_IMAGES/.test(texto)) {
      candidatas.push({ code: texto, nombres: [] });
    }
  }
  const validas = [];
  const nombres = new Set();
  const saltadas = [];
  for (const s of candidatas) {
    const cuerpo = [...validas.map(v => v.code), s.code].join('\n');
    const nombresNuevos = new Set([...nombres, ...s.nombres]);
    try {
      // eslint-disable-next-line no-new-func
      new Function(cuerpo + '\nreturn { ' + [...nombresNuevos].join(', ') + ' };')();
      validas.push(s);
      for (const nombre of s.nombres) nombres.add(nombre);
    } catch (e) {
      saltadas.push((s.nombres.join(',') || '(sentencia)') + ' :: ' + String(e.message).slice(0, 70));
    }
  }
  const ctx = new Function(validas.map(v => v.code).join('\n') + '\nreturn { ' + [...nombres].join(', ') + ' };')();
  return { ctx, saltadas };
}

const actualSrc = fs.readFileSync(ACTUAL, 'utf8');
const headSrc = fs.readFileSync(HEAD, 'utf8');
const A = evaluar(scriptBabel(actualSrc));
const H = evaluar(scriptBabel(headSrc));

let fallos = 0;
const ok = (cond, msg) => { console.log((cond ? '  OK   ' : '  FALLO') + ' ' + msg); if (!cond) fallos++; };

console.log('=== carpeta ===');
if (process.env.VERBOSE) {
  console.log('  [diag] declaraciones saltadas (actual):');
  for (const s of A.saltadas) console.log('    - ' + s);
  console.log('  [diag] SEED_TRICKS definido:', Array.isArray(A.ctx.SEED_TRICKS), (A.ctx.SEED_TRICKS || []).length);
}
ok(Array.isArray(A.ctx.SEED_TRICKS) && Array.isArray(H.ctx.SEED_TRICKS), 'SEED_TRICKS evaluado en ambas versiones');
ok(JSON.stringify(A.ctx.DEFAULT_FOLDERS.map(f => f.id)) === JSON.stringify([...H.ctx.DEFAULT_FOLDERS.map(f => f.id), 'xl-transfer1to2']),
  'la carpeta xl-transfer1to2 se añade al FINAL de DEFAULT_FOLDERS');

console.log('=== ids posicionales intactos ===');
const ids = c => (c.SEED_TRICKS || []).filter(t => /^(ig-dcek|xl-cmd|cap-cmd)-/.test(t.id)).map(t => t.id).join(',');
ok(ids(A.ctx) === ids(H.ctx), 'los ids ig-dcek / xl-cmd / cap-cmd son idénticos a HEAD (sin desplazamiento)');
ok((A.ctx.ALL_IMAGE_COMMANDS || []).length === (H.ctx.ALL_IMAGE_COMMANDS || []).length,
  `ALL_IMAGE_COMMANDS igual longitud (${(A.ctx.ALL_IMAGE_COMMANDS || []).length})`);
const nuevos = (A.ctx.SEED_TRICKS || []).filter(t => t.id.startsWith('tr-cmd-'));
ok(nuevos.length === 11, `11 tarjetas nuevas con id tr-cmd (${nuevos.length})`);

console.log('=== enlaces de cada código ===');
const PREFIJO = A.ctx.IMAGE_STYLE_PREFIX_TEXT;
for (const [command] of A.ctx.TRANSFER_COMMANDS) {
  const carpeta = A.ctx.CODE_FOLDER[command];
  const prompt = A.ctx.PROMPT_TEMPLATES[command];
  const imagen = A.ctx.SEED_COMMAND_IMAGES[command];
  const release = A.ctx.GENERATED_IMAGE_RELEASES.find(r => imagen?.startsWith(r.prefix));
  const tarjeta = nuevos.find(t => t.codeSnippet === command);
  const problemas = [];
  if (carpeta !== 'xl-transfer1to2') problemas.push('carpeta=' + carpeta);
  if (!prompt) problemas.push('sin prompt');
  else {
    if (!prompt.includes(PREFIJO)) problemas.push('sin preámbulo fijo');
    if (!prompt.includes('must be written in Spanish')) problemas.push('sin coletilla de español');
    if (!prompt.includes('[REFERENCIA]') || !prompt.includes('[OBJETO]')) problemas.push('sin marcadores');
  }
  if (!imagen || !imagen.startsWith('assets/transfer-1to2/')) problemas.push('imagen=' + imagen);
  if (!release) problemas.push('sin release');
  if (!tarjeta) problemas.push('sin tarjeta');
  else if (tarjeta.category !== 'xl-transfer1to2') problemas.push('tarjeta en ' + tarjeta.category);
  ok(problemas.length === 0, `${command}${problemas.length ? ' -> ' + problemas.join(', ') : ''}`);
}

console.log('=== /transferbackground mejorado en su sitio ===');
const tb = A.ctx.PROMPT_TEMPLATES['/transferbackground'];
ok(/image 1 is the REFERENCE/.test(tb) && /HARD RULES/.test(tb), '/transferbackground lleva el 1/2 explícito y las reglas duras');
ok(A.ctx.CODE_FOLDER['/transferbackground'] === H.ctx.CODE_FOLDER['/transferbackground'], 'sigue en su carpeta original');

console.log('=== no se han tocado los códigos que ya existían ===');
const claves = Object.keys(A.ctx.PROMPT_TEMPLATES).sort().join('|');
const clavesHead = Object.keys(H.ctx.PROMPT_TEMPLATES).sort().join('|');
const soloNuevas = Object.keys(A.ctx.PROMPT_TEMPLATES).filter(k => !(k in H.ctx.PROMPT_TEMPLATES));
const cambiadas = Object.keys(H.ctx.PROMPT_TEMPLATES).filter(k => A.ctx.PROMPT_TEMPLATES[k] !== H.ctx.PROMPT_TEMPLATES[k]);
ok(soloNuevas.length === 11, `solo se añaden 11 claves nuevas (${soloNuevas.length})`);
ok(cambiadas.join(',') === '/transferbackground', `único prompt existente modificado: ${cambiadas.join(', ') || '(ninguno)'}`);
void claves; void clavesHead;

console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK');
process.exit(fallos ? 1 : 0);
