/* ============================================================
   ai.js — catálogo de modelos y trabajos de los proveedores directos
   ============================================================ */

import { state, emit, uid, getResource, blobToBase64, dataUrlToBlob } from './core.js?v=16';
import { server } from './persist.js?v=16';

/* Catálogo espejo del contrato canónico del servidor
   (lib/canonical-image-model.php) más el motor Flow, que se ejecuta en el PC.
   Los modelos de Flow van primero: es el motor preferente del estudio. */
export const MODELS = [
  { id: 'flow-nano-banana-2', group: 'FLOW · GOOGLE', label: 'NANO BANANA 2', provider: 'flow', model: 'Nano Banana 2', note: 'Nano Banana 2 en tu PC con Google Flow. Es el modelo inicial de un trabajo nuevo.' },
  { id: 'flow-nano-banana-pro', group: 'FLOW · GOOGLE', label: 'NANO BANANA PRO', provider: 'flow', model: 'Nano Banana Pro', note: 'Nano Banana Pro con Flow: más detalle, tarda algo más.' },
  { id: 'flow-nano-banana-2-lite', group: 'FLOW · GOOGLE', label: 'NANO BANANA 2 LITE', provider: 'flow', model: 'Nano Banana 2 Lite', note: 'Nano Banana 2 Lite con Flow: el más rápido.' },
  { id: 'openai-medium', group: 'OPENAI 2.5', label: 'MEDIUM', provider: 'openai', model: 'gpt-image-2.5-flare', quality: 'medium', note: 'Flare en calidad media: la opción más rápida de la gama 2.5.' },
  { id: 'openai-high', group: 'OPENAI 2.5', label: 'HIGH', provider: 'openai', model: 'gpt-image-2.5-flare', quality: 'high', note: 'Flare en calidad alta: más detalle que MEDIUM.' },
  { id: 'openai-max-flare', group: 'OPENAI 2.5', label: 'MAX FLARE', provider: 'openai', model: 'gpt-image-2.5-flare', quality: 'max', note: 'Calidad máxima del modelo flare.' },
  { id: 'openai-xhigh', group: 'OPENAI 2.5', label: 'XHIGH', provider: 'openai', model: 'gpt-image-2.5-sunburst', quality: 'xhigh', note: 'Sunburst: precisión en edición y consistencia en rostros.' },
  { id: 'openai-max-sunburst', group: 'OPENAI 2.5', label: 'MAX SUNBURST', provider: 'openai', model: 'gpt-image-2.5-sunburst', quality: 'max', note: 'Calidad máxima del modelo sunburst.' },
  { id: 'gemini-2', group: 'GEMINI', label: 'GEMINI 2', provider: 'gemini', model: 'google/gemini-2.5-flash-image', note: 'Gemini 2.5 Flash Image: el más ligero del grupo.' },
  { id: 'gemini-flash', group: 'GEMINI', label: '3.1 FLASH', provider: 'gemini', model: 'google/gemini-3.1-flash-image', note: 'Gemini 3.1 Flash: rápido y bueno con texto.' },
  { id: 'gemini-pro', group: 'GEMINI', label: '3 PRO', provider: 'gemini', model: 'google/gemini-3-pro-image', note: 'Gemini 3 Pro: máxima calidad del grupo para texto.' },
  { id: 'qwen-pro', group: 'QWEN', label: 'QWEN 3 PRO', provider: 'qwen', model: 'qwen/qwen-image-3-pro', note: 'Qwen Image 3 Pro: texto nítido y diseños densos.' },
  { id: 'openai-image-2-low', group: 'IMAGE 2', label: 'LOW', provider: 'openai', model: 'gpt-image-2', quality: 'low', note: 'gpt-image-2 en calidad baja: la opción más rápida de los proveedores directos.' },
  { id: 'openai-image-2', group: 'IMAGE 2', label: 'MEDIUM', provider: 'openai', model: 'gpt-image-2', quality: 'medium', note: 'gpt-image-2 en calidad media.' },
  { id: 'openai-image-2-high', group: 'IMAGE 2', label: 'HIGH', provider: 'openai', model: 'gpt-image-2', quality: 'high', note: 'gpt-image-2 en calidad alta: más detalle.' },
];

export const modelById = (id) => MODELS.find((m) => m.id === id) || MODELS[0];

export const ASPECTS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

export const catalog = {
  loaded: false,
  providers: { openai: false, openrouter: false },
  models: MODELS.map((m) => m.id),
};

export async function loadCatalog() {
  if (!server.available || !server.writable) {
    catalog.loaded = true;
    return catalog;
  }
  try {
    const data = await server.call('catalog', {}, { method: 'GET', timeout: 8000 });
    catalog.loaded = true;
    catalog.providers = data?.providers || catalog.providers;
    if (Array.isArray(data?.models) && data.models.length) {
      catalog.models = data.models.filter((id) => MODELS.some((m) => m.id === id));
    }
    emit('catalog:change', {});
  } catch (error) {
    catalog.loaded = true;
    emit('catalog:error', { error: error.message });
  }
  return catalog;
}

/* Este módulo solo describe modelos y trabajos: no estima importes. */

/* ── Datos de referencia ── */
const dataUrlCache = new Map();

export async function resourceToDataUrl(resourceId) {
  if (dataUrlCache.has(resourceId)) return dataUrlCache.get(resourceId);
  const res = getResource(resourceId);
  if (!res?.blob) return null;
  const base64 = await blobToBase64(res.blob);
  const url = `data:${res.mime};base64,${base64}`;
  dataUrlCache.set(resourceId, url);
  return url;
}

export function clearDataUrlCache() { dataUrlCache.clear(); }

/* ── Trabajos ── */
let activeJob = null;
const listeners = new Set();

export function onJob(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

function notify(job) {
  for (const handler of listeners) {
    try { handler(job); } catch { /* el suscriptor no debe romper el flujo */ }
  }
}

export function currentJob() { return activeJob; }

export function assertReady() {
  if (!server.available) {
    throw new Error('No hay servidor PHP disponible: la generación con IA necesita el proxy del servidor. Puedes seguir editando y exportando.');
  }
  if (!server.writable) {
    throw new Error('Sesión no autorizada. Inicia sesión para enviar trabajos al proveedor.');
  }
}

export async function generate({
  prompt,
  model,
  aspect = '1:1',
  resolution = 1024,
  images = [],
  mask = null,
  kind = 'generate',
} = {}) {
  assertReady();
  if (activeJob) throw new Error('Ya hay una generación en curso. Espera a que termine.');

  const idempotencyKey = uid('job');
  activeJob = { id: null, status: 'creating', idempotencyKey, startedAt: Date.now() };
  notify(activeJob);

  try {
    const created = await server.call('job.create', {
      idempotencyKey,
      kind,
      model,
      prompt,
      aspectRatio: aspect,
      resolution,
      images,
      mask,
      projectId: state.project?.id || null,
      docId: state.doc?.id || null,
      docVersion: state.project?.version || 0,
    }, { timeout: 200000 });

    const job = created?.job;
    if (!job) throw new Error('El servidor no devolvió ningún trabajo.');
    activeJob = { ...job, idempotencyKey };
    notify(activeJob);

    if (job.status === 'succeeded' && job.image) {
      activeJob = { ...job, done: true };
      notify(activeJob);
      emit('job:done', activeJob);
      return activeJob;
    }
    if (job.status === 'failed') {
      activeJob = { ...job, done: true };
      notify(activeJob);
      emit('job:failed', activeJob);
      return activeJob;
    }

    const final = await pollJob(job.id);
    activeJob = final;
    return final;
  } catch (error) {
    activeJob = { status: 'failed', error: error.message, done: true };
    notify(activeJob);
    emit('job:failed', { error: error.message });
    throw error;
  } finally {
    setTimeout(() => {
      if (activeJob?.done || activeJob?.status === 'failed') {
        const finished = activeJob;
        activeJob = null;
        notify(null);
        void finished;
      }
    }, 800);
  }
}

async function pollJob(jobId, { interval = 2500, timeout = 240000 } = {}) {
  const started = Date.now();
  let attempts = 0;
  while (Date.now() - started < timeout) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    attempts += 1;
    try {
      const data = await server.call('job.get', { id: jobId }, { method: 'GET', timeout: 15000 });
      const job = data?.job;
      if (!job) continue;
      notify(job);
      if (job.status === 'succeeded' || job.status === 'failed') {
        const settled = { ...job, done: true };
        notify(settled);
        if (job.status === 'succeeded') emit('job:done', settled);
        else emit('job:failed', settled);
        return settled;
      }
    } catch (error) {
      // Un fallo de sondeo no reenvía la generación: solo se reintenta la consulta.
      if (attempts > 8) throw new Error(`No se pudo consultar el trabajo: ${error.message}`);
    }
  }
  throw new Error('El trabajo sigue pendiente en el servidor. Puedes recuperarlo al recargar: no se ha reenviado.');
}

/** Recupera trabajos en curso del servidor tras recargar. */
export async function recoverPendingJobs() {
  if (!server.available || !server.writable) return [];
  try {
    const data = await server.call('job.list', { status: 'active', limit: 10 }, { method: 'GET', timeout: 8000 });
    return data?.jobs || [];
  } catch {
    return [];
  }
}

/** Sigue un trabajo ya existente sin volver a enviarlo. */
export async function resumeJob(job) {
  if (!job?.id) return null;
  activeJob = { ...job };
  notify(activeJob);
  try {
    const final = await pollJob(job.id);
    return final;
  } finally {
    activeJob = null;
    notify(null);
  }
}

export async function jobHistory(limit = 20) {
  if (!server.available || !server.writable) return [];
  try {
    const data = await server.call('job.list', { limit }, { method: 'GET', timeout: 8000 });
    return data?.jobs || [];
  } catch {
    return [];
  }
}

export { dataUrlToBlob };
