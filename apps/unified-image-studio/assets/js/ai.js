/* ============================================================
   ai.js — catálogo de modelos, trabajos y control de costes
   ============================================================ */

import { state, emit, uid, getResource, blobToBase64, dataUrlToBlob, fmtMoney } from './core.js';
import { server } from './persist.js';

/* Catálogo espejo del contrato canónico del servidor
   (lib/canonical-image-model.php). No inventa modelos: solo
   describe los que el proxy acepta. */
export const MODELS = [
  { id: 'openai-medium', group: 'OPENAI 2.5', label: 'MEDIUM', provider: 'openai', model: 'gpt-image-2.5-flare', quality: 'medium', note: 'Flare en calidad media: la opción más rápida de la gama 2.5.' },
  { id: 'openai-high', group: 'OPENAI 2.5', label: 'HIGH', provider: 'openai', model: 'gpt-image-2.5-flare', quality: 'high', note: 'Flare en calidad alta: más detalle y coste superior a MEDIUM.' },
  { id: 'openai-max-flare', group: 'OPENAI 2.5', label: 'MAX FLARE', provider: 'openai', model: 'gpt-image-2.5-flare', quality: 'max', note: 'Calidad máxima del modelo flare.' },
  { id: 'openai-xhigh', group: 'OPENAI 2.5', label: 'XHIGH', provider: 'openai', model: 'gpt-image-2.5-sunburst', quality: 'xhigh', note: 'Sunburst: precisión en edición y consistencia en rostros.' },
  { id: 'openai-max-sunburst', group: 'OPENAI 2.5', label: 'MAX SUNBURST', provider: 'openai', model: 'gpt-image-2.5-sunburst', quality: 'max', note: 'Calidad máxima del modelo sunburst.' },
  { id: 'gemini-2', group: 'GEMINI', label: 'GEMINI 2', provider: 'gemini', model: 'google/gemini-2.5-flash-image', note: 'Gemini 2.5 Flash Image: el más ligero del grupo.' },
  { id: 'gemini-flash', group: 'GEMINI', label: '3.1 FLASH', provider: 'gemini', model: 'google/gemini-3.1-flash-image', note: 'Gemini 3.1 Flash: rápido y bueno con texto.' },
  { id: 'gemini-pro', group: 'GEMINI', label: '3 PRO', provider: 'gemini', model: 'google/gemini-3-pro-image', note: 'Gemini 3 Pro: máxima calidad del grupo para texto.' },
  { id: 'qwen-pro', group: 'QWEN', label: 'QWEN 3 PRO', provider: 'qwen', model: 'qwen/qwen-image-3-pro', note: 'Qwen Image 3 Pro: texto nítido y diseños densos.' },
  { id: 'openai-image-2-low', group: 'IMAGE 2', label: 'LOW', provider: 'openai', model: 'gpt-image-2', quality: 'low', note: 'gpt-image-2 en calidad baja: el más rápido y económico. Activo por defecto.' },
  { id: 'openai-image-2', group: 'IMAGE 2', label: 'MEDIUM', provider: 'openai', model: 'gpt-image-2', quality: 'medium', note: 'gpt-image-2 en calidad media.' },
  { id: 'openai-image-2-high', group: 'IMAGE 2', label: 'HIGH', provider: 'openai', model: 'gpt-image-2', quality: 'high', note: 'gpt-image-2 en calidad alta: más detalle y coste.' },
];

export const modelById = (id) => MODELS.find((m) => m.id === id) || MODELS.find((m) => m.id === 'openai-image-2-low');

export const ASPECTS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

export const catalog = {
  loaded: false,
  pricingConfigured: false,
  pricing: {},
  providers: { openai: false, openrouter: false },
  models: MODELS.map((m) => m.id),
};

export async function loadCatalog() {
  if (!server.available || !server.writable) {
    catalog.loaded = true;
    catalog.pricingConfigured = false;
    return catalog;
  }
  try {
    const data = await server.call('catalog', {}, { method: 'GET', timeout: 8000 });
    catalog.loaded = true;
    catalog.pricingConfigured = Boolean(data?.pricingConfigured);
    catalog.pricing = data?.pricing || {};
    catalog.providers = data?.providers || catalog.providers;
    if (Array.isArray(data?.models) && data.models.length) {
      catalog.models = data.models.filter((id) => MODELS.some((m) => m.id === id));
    }
    emit('catalog:change', {});
  } catch (error) {
    catalog.loaded = true;
    catalog.pricingConfigured = false;
    emit('catalog:error', { error: error.message });
  }
  return catalog;
}

/* ── Costes ── */
export function costFor(modelId, count = 1) {
  const price = catalog.pricing[modelId];
  if (!price || !Number.isFinite(price.unit)) return null;
  return price.unit * count;
}

export function describeCost(modelId, count = 1) {
  const value = costFor(modelId, count);
  if (value === null) {
    return {
      known: false,
      text: 'Tarifa no configurada',
      detail: 'Configura api/pricing.json con el precio real de cada modelo para que el presupuesto se aplique en euros.',
    };
  }
  return { known: true, text: fmtMoney(value), detail: 'Estimación: el proveedor no informa del importe real de la operación.' };
}

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

/** Recupera trabajos pendientes del servidor tras recargar. */
export async function recoverPendingJobs() {
  if (!server.available || !server.writable) return [];
  try {
    const data = await server.call('job.list', { status: 'pending' }, { method: 'GET', timeout: 8000 });
    return data?.jobs || [];
  } catch {
    return [];
  }
}

export async function fetchBudget() {
  if (!server.available || !server.writable) return null;
  try {
    const data = await server.call('budget.get', {}, { method: 'GET', timeout: 8000 });
    return data?.budget || null;
  } catch {
    return null;
  }
}

export async function saveBudget(budget) {
  assertReady();
  const data = await server.call('budget.set', budget, { timeout: 10000 });
  return data?.budget || null;
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
