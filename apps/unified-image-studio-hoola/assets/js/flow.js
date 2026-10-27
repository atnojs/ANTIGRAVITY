/* ============================================================
   flow.js — motor Google Flow en el estudio (imagen y vídeo)
   ------------------------------------------------------------
   La generación NO ocurre en el navegador: se encola en el servidor y el
   agente del PC la ejecuta con Google Flow. Así funciona desde el móvil y
   desde cualquier ordenador, y cerrar la pestaña no cancela el trabajo.
   ============================================================ */

import { emit } from './core.js?v=18';
import { server } from './persist.js?v=18';

/* Contrato mínimo del cliente con el motor Flow. El catálogo visible de modelos
   vive en ai.js (selector y notas) y la autoridad de nombres es el servidor;
   aquí solo lo imprescindible: proporciones admitidas e identificadores
   iniciales, que coinciden con lib/flow-engine.php. */
export const FLOW_IMAGE_RATIOS = ['1:1', '16:9', '4:3', '3:4', '9:16'];

const DEFAULT_FLOW_IMAGE_MODEL = 'flow-nano-banana-2';
export const DEFAULT_FLOW_VIDEO_MODEL = 'veo-3.1-lite';

/* ── Estado del motor y del agente del PC ── */
export const flowState = {
  loaded: false,
  workerOnline: false,
  workerSeen: 0,
  pending: 0,
  agentConfigured: false,
  jobs: [],
  filter: 'all',
  error: '',
};

function callFlow(action, payload = {}, options = {}) {
  if (!server.available) {
    throw new Error('No hay servidor PHP disponible: Google Flow necesita el servidor para encolar los trabajos.');
  }
  if (!server.writable) {
    throw new Error('Sesión no autorizada. Inicia sesión para encolar trabajos de Flow.');
  }
  return server.call(action, payload, { timeout: 30000, ...options });
}

/** Consulta el estado del motor (PC conectado, cola pendiente, modelos). */
export async function refreshFlowState() {
  if (!server.available) {
    flowState.loaded = true;
    flowState.workerOnline = false;
    return flowState;
  }
  try {
    const data = await server.call('flow.state', {}, { method: 'GET', timeout: 12000 });
    flowState.loaded = true;
    flowState.workerOnline = Boolean(data?.workerOnline);
    flowState.workerSeen = Number(data?.workerSeen || 0);
    flowState.pending = Number(data?.pending || 0);
    flowState.agentConfigured = Boolean(data?.agentConfigured);
    flowState.error = '';
    emit('flow:state', flowState);
  } catch (error) {
    flowState.loaded = true;
    flowState.error = error.message;
    emit('flow:state', flowState);
  }
  return flowState;
}

function normalizeJob(job) {
  if (!job || typeof job !== 'object') return null;
  return {
    id: String(job.id || ''),
    type: job.type === 'video' ? 'video' : 'image',
    status: String(job.status || 'queued'),
    model: String(job.model || ''),
    ratio: String(job.ratio || ''),
    prompt: String(job.prompt || ''),
    mode: String(job.mode || 'generate'),
    createdAt: Number(job.createdAt || 0),
    startedAt: Number(job.startedAt || 0),
    finishedAt: Number(job.finishedAt || 0),
    bytes: Number(job.bytes || 0),
    width: Number(job.width || 0),
    height: Number(job.height || 0),
    error: String(job.error || ''),
    workerOnline: Boolean(job.workerOnline),
    planned: Boolean(job.planned),
    leaseExpired: Boolean(job.leaseExpired),
    url: job.url ? String(job.url) : '',
  };
}

/** Lista los trabajos de Flow (imagen, vídeo o ambos). */
export async function listFlowJobs(type = '') {
  if (!server.available) return [];
  try {
    const query = { limit: 40 };
    if (type === 'image' || type === 'video') query.type = type;
    const data = await server.call('flow.list', query, { method: 'GET', timeout: 15000 });
    flowState.workerOnline = Boolean(data?.workerOnline);
    flowState.workerSeen = Number(data?.workerSeen || 0);
    flowState.jobs = (data?.jobs || []).map(normalizeJob).filter(Boolean);
    emit('flow:jobs', flowState.jobs);
    return flowState.jobs;
  } catch (error) {
    flowState.error = error.message;
    emit('flow:jobs', flowState.jobs);
    return flowState.jobs;
  }
}

/** Encola una imagen; `count` permite varias variantes en una sola petición. */
export async function createFlowImage({ prompt, model = DEFAULT_FLOW_IMAGE_MODEL, ratio = '1:1', images = [], mode = 'generate', count = 1 }) {
  const data = await callFlow('flow.create', {
    type: 'image',
    prompt,
    model,
    ratio,
    mode,
    images: images.slice(0, 2),
    count,
  });
  const jobs = (data?.jobs || []).map(normalizeJob).filter(Boolean);
  emit('flow:created', jobs);
  return jobs;
}

/** Encola un vídeo; `images[0]` es el fotograma inicial (anima una imagen). */
export async function createFlowVideo({ prompt, model = DEFAULT_FLOW_VIDEO_MODEL, ratio = '16:9', images = [] }) {
  const data = await callFlow('flow.create', {
    type: 'video',
    prompt,
    model,
    ratio,
    images: images.slice(0, 2),
  });
  const jobs = (data?.jobs || []).map(normalizeJob).filter(Boolean);
  emit('flow:created', jobs);
  return jobs;
}

/** Consulta los trabajos indicados (sin reenviarlos). */
export async function statusFlowJobs(ids) {
  if (!server.available || !ids.length) return [];
  const data = await server.call('flow.status', { ids: ids.join(',') }, { method: 'GET', timeout: 15000 });
  flowState.workerOnline = Boolean(data?.workerOnline);
  flowState.workerSeen = Number(data?.workerSeen || 0);
  return (data?.jobs || []).map(normalizeJob).filter(Boolean);
}

/** Vuelve a poner en cola un trabajo que quedó pendiente de comprobación. */
export async function retryFlowJob(id) {
  const data = await callFlow('flow.retry', { id });
  return normalizeJob(data?.job);
}

/** Elimina un resultado terminado (con su archivo). */
/**
 * Para una generación: si está en curso, el agente cierra Chrome en el PC; si
 * aún está en cola, se borra. En ambos casos la tarjeta desaparece.
 */
export async function cancelFlowJob(id) {
  const data = await callFlow('flow.cancel', { id });
  flowState.jobs = flowState.jobs.filter((job) => job.id !== id);
  emit('flow:jobs', flowState.jobs);
  return data;
}
export async function deleteFlowJob(id) {
  await callFlow('flow.delete', { id });
  flowState.jobs = flowState.jobs.filter((job) => job.id !== id);
  emit('flow:jobs', flowState.jobs);
}

/**
 * Descarga el archivo del resultado como Blob.
 * La URL exige sesión: se pide con credenciales de mismo origen.
 */
export async function fetchFlowBlob(job) {
  if (!job?.url) throw new Error('El resultado todavía no tiene archivo.');
  const response = await fetch(job.url, { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo descargar el resultado (HTTP ${response.status}).`);
  return response.blob();
}

/** Fuerza la descarga con el nombre correcto (imagen o vídeo). */
export async function downloadFlowJob(job) {
  const blob = await fetchFlowBlob(job);
  const ext = job.type === 'video' ? 'mp4' : (blob.type.includes('png') ? 'png' : 'jpg');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${job.id}.${ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return `${job.id}.${ext}`;
}

