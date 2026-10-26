/**
 * Comprobación automática de los defectos del rework (D3, D5, D6, D7, D8).
 * Falla (exit 1) si cualquiera reaparece. Es la evidencia reproducible que
 * faltaba: se ejecuta en cada entrega y no depende de mirar capturas.
 *
 * Uso: node tools/flow-agent/comprobar-entregable.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const APP = 'apps/unified-image-studio';
const leer = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');
const fallos = [];
const ok = (nombre, condicion, detalle = '') => {
  if (!condicion) fallos.push(`${nombre}${detalle ? ' → ' + detalle : ''}`);
  console.log(`${condicion ? 'OK  ' : 'FALLO'} ${nombre}${detalle && !condicion ? ' → ' + detalle : ''}`);
};

// ── D3: ningún botón «Usar como inicio» en tarjetas de vídeo ──
const app = leer('assets/js/app.js');
ok('D3 sin botón data-flow-frames', !app.includes('data-flow-frames'));
const sinHandler = !app.includes('if (flowFrames)');
ok('D3 sin manejador huérfano', sinHandler);

// ── D7: el visor no muestra «?×?» ──
// Invariante real: la etiqueta del visor usa la variable `medidas`, que solo
// incluye dimensiones cuando se conocen, y nunca recurre a `|| '?'`.
ok('D7 sin dimensiones inventadas', !app.includes("job.width || '?'") && !app.includes("job.height || '?'"));
ok('D7 visor con medidas condicionales', app.includes('flowLightboxMeta') && /\$\{medidas\}/.test(app));

// ── D8: sin código muerto exportado ──
const flow = leer('assets/js/flow.js');
const muertos = ['flowModelById', 'isFlowModel', 'FLOW_VIDEO_MODELS', 'FLOW_VIDEO_RATIOS', 'waitForFlowJobs', 'flowRequestKey', 'lastImageJob', 'watching', 'countSelect'];
for (const simbolo of muertos) {
  ok(`D8 sin ${simbolo}`, !flow.includes(simbolo) && !app.includes(simbolo));
}

// ── D6: sin restos de coste en la interfaz ──
const html = leer('index.html');
const css = leer('assets/css/studio.css');
const ui = leer('assets/js/ui.js');
const ai = leer('assets/js/ai.js');
const patronCoste = /costMeter|estimateValue|budgetModal|costValue|costBudget|describeCost|costFor|fetchBudget|saveBudget|pricingConfigured/;
ok('D6 sin elementos de coste en HTML', !patronCoste.test(html));
ok('D6 sin estilos de coste', !/\.cost-meter|\.cost-sub|\.estimate\b/.test(css));
ok('D6 sin lógica de coste en JS', !patronCoste.test(ui) && !patronCoste.test(ai) && !patronCoste.test(app));
ok('D6 sin bloque @media vacío de coste', !css.includes('medidor de coste'));

// ── D5: autoevaluación y ronda de rework documentadas ──
const doc = leer('docs/VERIFICACION.md');
ok('D5 con autoevaluación A1-A10', doc.includes('Autoevaluación A1–A10'));
ok('D5 con tabla de rework', doc.includes('Ronda del verificador independiente'));

// ── Contrato del motor: modelos iniciales coinciden con el servidor ──
const engine = leer('lib/flow-engine.php');
ok('contrato: modelo inicial de imagen', engine.includes("UIS_FLOW_DEFAULT_IMAGE_MODEL = 'flow-nano-banana-2'") && flow.includes("DEFAULT_FLOW_IMAGE_MODEL = 'flow-nano-banana-2'"));
ok('contrato: modelo inicial de vídeo', engine.includes("UIS_FLOW_DEFAULT_VIDEO_MODEL = 'veo-3.1-lite'") && flow.includes("DEFAULT_FLOW_VIDEO_MODEL = 'veo-3.1-lite'"));
ok('contrato: el servidor guarda el nombre del menú', engine.includes("$model = $models[$modelKey]['flow'];"));
ok('contrato: el agente traduce identificadores', fs.readFileSync('tools/flow-agent/flow_agent.py', 'utf8').includes('MODEL_NAMES'));

// ── Seguridad: la credencial no está en el frontend ──
const frontend = html + css + app + flow + ui + ai + leer('assets/js/core.js');
// El NOMBRE de la variable puede aparecer en un mensaje para el administrador;
// lo prohibido es la cabecera de autenticación y cualquier valor de credencial.
ok('seguridad: el frontend no envía la cabecera del agente', !/X-UIS-Agent/.test(frontend));
ok('seguridad: sin valor de credencial en el frontend', !/UIS_FLOW_AGENT_TOKEN\s*[:=]\s*['"][^'"]{8,}/.test(frontend));
ok('seguridad: el agente no trae token escrito', !/TOKEN\s*=\s*['"][A-Za-z0-9_-]{16,}/.test(fs.readFileSync('tools/flow-agent/flow_agent.py', 'utf8')));

console.log('');
if (fallos.length) {
  console.error(`FALLOS: ${fallos.length}`);
  for (const fallo of fallos) console.error(' - ' + fallo);
  process.exit(1);
}
console.log('TODO OK: los defectos del rework están cerrados y el contrato se mantiene.');
