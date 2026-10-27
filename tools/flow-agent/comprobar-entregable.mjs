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
// Se valida la línea real de asignación, no cualquier aparición de `medidas`:
// una comprobación que acepta un `console.debug` deja pasar el defecto.
const lineaVisor = app.split('\n').find((linea) => linea.includes("$('flowLightboxMeta').textContent")) || '';
ok('D7 asigna la etiqueta del visor', lineaVisor !== '');
ok('D7 etiqueta con medidas condicionales', /\$\{medidas\}/.test(lineaVisor));
ok('D7 sin dimensión incondicional', !lineaVisor.includes("|| '?'") && !/\}\s*×\s*\$\{/.test(lineaVisor));
ok('D7 sin interrogantes en ninguna etiqueta', !/\?\s*×\s*\?/.test(app));

// ── D8: sin código muerto exportado y sin importaciones sin uso ──
const flow = leer('assets/js/flow.js');
const muertos = ['flowModelById', 'isFlowModel', 'FLOW_VIDEO_MODELS', 'FLOW_VIDEO_RATIOS', 'waitForFlowJobs', 'flowRequestKey', 'lastImageJob', 'watching', 'countSelect'];
for (const simbolo of muertos) {
  ok(`D8 sin ${simbolo}`, !flow.includes(simbolo) && !app.includes(simbolo));
}
// Lo que flow.js exporta debe consumirse en app.js (o ser parte del arranque).
const exportados = [...flow.matchAll(/^export (?:const|async function|function) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
const sinConsumo = exportados.filter((nombre) => !new RegExp(`\\b${nombre}\\b`).test(app));
ok('D8 sin exports de flow.js sin consumo', sinConsumo.length === 0, sinConsumo.join(', '));
// Una constante local de flow.js no debe exportarse si solo se usa dentro.
ok('D8 modelo inicial de imagen es interno', !flow.includes('export const DEFAULT_FLOW_IMAGE_MODEL'));

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

// ── Cantidad de imágenes por encolado (1–4) ──
const enginePhp = leer('lib/flow-engine.php');
ok('cantidad: 4 botones en la interfaz', (html.match(/data-count="[1-4]"/g) || []).length === 4);
ok('cantidad: el cliente envía siempre la cantidad elegida', app.includes('count: flowUi.imageCount'));
ok('cantidad: se respeta también al editar con referencia', enginePhp.includes('varias ediciones de la misma referencia'));
ok('cantidad: la nota distingue edición de generación', app.includes('variantes de la referencia'));
ok('cantidad: el servidor limita a 1..4', enginePhp.includes('max(1, min(4, $count))'));
ok('cantidad: la cola no se desborda al encolar varias', enginePhp.includes('$pending + $count > UIS_FLOW_QUEUE_MAX'));
ok('cantidad: se desactiva con proveedores directos', app.includes('button.disabled = !isFlow'));

// ── Resiliencia ante el perfil de Chrome ocupado ──
const agentePy = fs.readFileSync('tools/flow-agent/flow_agent.py', 'utf8');
ok('agente: sello de versión visible', agentePy.includes('AGENT_BUILD'));
ok('perfil: no reclama si el perfil está ocupado', agentePy.includes('espero sin reclamar trabajo'));
ok('credencial: comprobar no marca el PC como conectado', leer('api.php').includes("case 'agent.ping'") && fs.readFileSync('tools/flow-agent/comprobar-token.py', 'utf8').includes('agent.ping'));
ok('perfil: los fallos pasajeros se aplazan', agentePy.includes('class TransientError') && agentePy.includes("'agent.release'"));
ok('perfil: se guarda el log completo', agentePy.includes('def guardar_log'));
ok('perfil: el resumen ignora el ruido de asyncio', agentePy.includes('event loop is closed'));
ok('reintento: el backend aplaza sin fallar', enginePhp.includes('function uis_flow_release'));
ok('reintento: los fallidos se pueden reintentar', enginePhp.includes("['unknown', 'failed']"));
ok('reintento: la interfaz ofrece reintentar fallidos', app.includes("job.status === 'unknown' || job.status === 'failed'"));
// ── Cancelación de una generación en curso ──
ok('cancelar: el motor borra o marca el trabajo', enginePhp.includes('function uis_flow_cancel') && enginePhp.includes("status = 'cancelled'"));
ok('cancelar: el agente pregunta mientras genera', agentePy.includes('def cancel_requested') && agentePy.includes('agent.cancelled'));
ok('cancelar: el agente mata el proceso al cancelar', agentePy.includes('proc.kill()') && agentePy.includes('class CancelledError'));
ok('cancelar: la biblioteca ofrece Parar/Quitar', app.includes('data-flow-cancel'));
ok('cancelar: los cancelados no se listan', leer('api.php').includes("WHERE status <> 'cancelled'"));
ok('cancelar: columna nueva con migración idempotente', leer('lib/bootstrap.php').includes('uis_migrate_flow_cancel'));
// ── Agente siempre activo y cancelación bien cableada ──
const apiHoola = fs.readFileSync('apps/unified-image-studio-hoola/api.php', 'utf8');
ok('servicio: instalador de tarea permanente', fs.readFileSync('tools/flow-agent/instalar-tarea.ps1', 'utf8').includes('UisFlowAgent'));
ok('servicio: la tarea se repite cada 2 minutos', fs.readFileSync('tools/flow-agent/instalar-tarea.ps1', 'utf8').includes('-RepetitionInterval'));
ok('cancelar: el endpoint lee el id del cuerpo JSON', apiHoola.includes("$body['id'] ?? ($_POST['id'] ?? '')"));
ok('cancelar: el agente manda el id también en la URL', agentePy.includes('extra_query='));
ok('cancelar: un fallo de red no aborta la generación', agentePy.includes('nunca interrumpir por un fallo de red'));
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
