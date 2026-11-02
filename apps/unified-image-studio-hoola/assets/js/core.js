/* ============================================================
   core.js — estado, modelo de documento, capas e historial
   ============================================================ */

export const SCHEMA = 1;
export const LIMITS = {
  maxDimension: 8192,
  maxFileBytes: 20 * 1024 * 1024,
  maxLayers: 120,
  historyDepth: 60,
  maxPrompt: 12000,
  maxRefs: 8,
  maxMaskZones: 12,
};

export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const fmtBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/* ── Bus de eventos ── */
export const bus = new EventTarget();

export function emit(type, detail = {}) {
  bus.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on(type, handler) {
  const listener = (event) => handler(event.detail);
  bus.addEventListener(type, listener);
  return () => bus.removeEventListener(type, listener);
}

/* ── Estado global ── */
export const state = {
  project: null,
  doc: null,
  resources: new Map(),
  selection: { layerId: null, tool: 'select' },
  history: { undo: [], redo: [], limit: LIMITS.historyDepth },
  ui: {
    zoom: 1,
    fit: true,
    pan: { x: 0, y: 0 },
    compare: false,
    compareX: 0.5,
    beforeImage: null,
    showMask: true,
    maskMode: 'paint',
    brushSize: 80,
    brushHardness: 80,
    maskColor: '#ff2d6f',
    maskOpacity: 100,
    maskMargin: 50,
    maskZoneId: null,
    model: 'flow-nano-banana-2',
    aspect: '1:1',
    resolution: 1024,
    refs: [],
    recipes: [],
    saveState: 'idle',
    mode: 'unknown',
    busy: false,
    pendingResult: null,
    dpi: 300,
  },
  flags: { dirty: false, lastSavedAt: 0, saving: 0, conflict: null },
};

/* ── Recursos ── */
export function addResource({ id, name, mime, blob, url, width, height, remoteId = null }) {
  const resId = id || uid('res');
  const record = {
    id: resId,
    name: name || 'imagen',
    mime: mime || blob?.type || 'image/png',
    blob: blob || null,
    url: url || (blob ? URL.createObjectURL(blob) : ''),
    width: width || 0,
    height: height || 0,
    remoteId,
  };
  state.resources.set(resId, record);
  return record;
}

export function getResource(id) {
  return state.resources.get(id) || null;
}

/** Imagen lista para dibujar, con carga diferida y caché. */
const imageCache = new Map();

export function imageFor(id) {
  const res = state.resources.get(id);
  if (!res || !res.url) return null;
  const cached = imageCache.get(res.url);
  if (cached) return cached.complete && cached.naturalWidth ? cached : null;
  const img = new Image();
  img.decoding = 'async';
  img.src = res.url;
  img.addEventListener('load', () => emit('render:request', { reason: 'image' }), { once: true });
  imageCache.set(res.url, img);
  return img.complete && img.naturalWidth ? img : null;
}

/* ── Documento ── */
export function createDoc({ name = 'Sin título', width = 1024, height = 1024, background = null, dpi = 300 } = {}) {
  const now = Date.now();
  return {
    id: uid('doc'),
    schema: SCHEMA,
    name,
    width: Math.round(width),
    height: Math.round(height),
    dpi,
    background: background || { type: 'transparent', color: '#ffffff' },
    layers: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createProject(name, doc) {
  const now = Date.now();
  return {
    id: uid('prj'),
    name,
    docId: doc.id,
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
}

export function blankLayerProps() {
  return {
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blend: 'source-over',
  };
}

export function makeImageLayer({ name, resourceId, x, y, w, h }) {
  return {
    id: uid('lyr'),
    type: 'image',
    name: name || 'Imagen',
    resourceId,
    x, y, w, h,
    ...blankLayerProps(),
    mask: { enabled: false, strokes: [] },
  };
}

export function makeTextLayer({ text, x, y, width, fontSize = 64, color = '#ffffff', weight = '400', align = 'center', fontFamily = 'Inter' }) {
  const lines = String(text || 'Texto').split('\n');
  const lineHeight = 1.22;
  const height = Math.max(fontSize * lineHeight, lines.length * fontSize * lineHeight);
  return {
    id: uid('lyr'),
    type: 'text',
    name: (text || 'Texto').slice(0, 28),
    text: text || 'Texto',
    x, y,
    w: width || Math.max(240, fontSize * 6),
    h: height,
    fontSize,
    color,
    weight,
    align,
    fontFamily,
    lineHeight,
    letterSpacing: 0,
    ...blankLayerProps(),
    mask: { enabled: false, strokes: [] },
  };
}

export function makeShapeLayer({ shape, x, y, w, h, fill, stroke, strokeWidth = 0, radius = 0 }) {
  return {
    id: uid('lyr'),
    type: 'shape',
    name: { rect: 'Rectángulo', ellipse: 'Elipse', line: 'Línea' }[shape] || 'Forma',
    shape,
    x, y, w, h,
    fill: fill || '#2ee8ff',
    stroke: stroke || '#00d0d0',
    strokeWidth,
    radius,
    ...blankLayerProps(),
    mask: { enabled: false, strokes: [] },
  };
}

/* ── Capas ── */
export function getLayer(id = state.selection.layerId) {
  if (!id || !state.doc) return null;
  return state.doc.layers.find((layer) => layer.id === id) || null;
}

export function layerIndex(id) {
  return state.doc ? state.doc.layers.findIndex((layer) => layer.id === id) : -1;
}

export function addLayer(layer, { select = true } = {}) {
  if (!state.doc) throw new Error('No hay documento abierto.');
  if (state.doc.layers.length >= LIMITS.maxLayers) {
    throw new Error(`Límite de ${LIMITS.maxLayers} capas alcanzado.`);
  }
  state.doc.layers.push(layer);
  if (select) state.selection.layerId = layer.id;
  emit('layers:change', { reason: 'add' });
  return layer;
}

export function removeLayer(id) {
  if (!state.doc) return;
  const index = layerIndex(id);
  if (index < 0) return;
  state.doc.layers.splice(index, 1);
  if (state.selection.layerId === id) {
    state.selection.layerId = state.doc.layers[Math.max(0, index - 1)]?.id || null;
  }
  emit('layers:change', { reason: 'remove' });
}

export function duplicateLayer(id) {
  const layer = getLayer(id);
  if (!layer) return null;
  const copy = structuredClone(layer);
  copy.id = uid('lyr');
  copy.name = `${layer.name} copia`;
  copy.x += 24;
  copy.y += 24;
  const index = layerIndex(id);
  state.doc.layers.splice(index + 1, 0, copy);
  state.selection.layerId = copy.id;
  emit('layers:change', { reason: 'duplicate' });
  return copy;
}

export function reorderLayer(id, delta) {
  const index = layerIndex(id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= state.doc.layers.length) return;
  const [layer] = state.doc.layers.splice(index, 1);
  state.doc.layers.splice(target, 0, layer);
  emit('layers:change', { reason: 'reorder' });
}

export function moveLayerTo(id, targetIndex) {
  const index = layerIndex(id);
  if (index < 0) return;
  const [layer] = state.doc.layers.splice(index, 1);
  const bounded = clamp(targetIndex, 0, state.doc.layers.length);
  state.doc.layers.splice(bounded, 0, layer);
  emit('layers:change', { reason: 'reorder' });
}

export function selectLayer(id) {
  state.selection.layerId = id;
  emit('selection:change', { layerId: id });
}

/* ── Zonas de la máscara ──
   Cada zona es una zona pintada independiente, numerada (1, 2, 3…) y con su
   propio prompt. Los trazos guardan a qué zona pertenecen (`stroke.zone`); los
   trazos de BORRAR no pertenecen a ninguna y se aplican a todas, para que una
   goma borre exactamente lo que se ve en el lienzo. */
export const MASK_ZONE_COLORS = ['#ff2d6f', '#00d0d0', '#ffb020', '#a78bfa', '#26c626', '#38bdf8', '#f472b6', '#f87171'];

export function zonaColor(indice) {
  const n = Math.abs(Math.trunc(Number(indice) || 0));
  return MASK_ZONE_COLORS[n % MASK_ZONE_COLORS.length];
}

export function nextMaskZoneId(mask) {
  let max = 0;
  for (const zona of mask?.zones || []) max = Math.max(max, Number(zona?.id) || 0);
  return max + 1;
}

/** Normaliza la máscara de una capa y garantiza que cada trazo tenga una zona. */
export function ensureMaskZones(layer) {
  if (!layer) return null;
  if (!layer.mask || typeof layer.mask !== 'object' || Array.isArray(layer.mask)) {
    layer.mask = { enabled: false, strokes: [] };
  }
  const mask = layer.mask;
  if (!Array.isArray(mask.strokes)) mask.strokes = [];
  if (!Array.isArray(mask.zones)) mask.zones = [];

  for (let i = mask.zones.length - 1; i >= 0; i -= 1) {
    const zona = mask.zones[i];
    if (!zona || typeof zona !== 'object') { mask.zones.splice(i, 1); continue; }
    const id = Number(zona.id);
    zona.id = Number.isFinite(id) && id > 0 ? Math.round(id) : 0;
    if (typeof zona.prompt !== 'string') zona.prompt = '';
  }
  let max = 0;
  for (const zona of mask.zones) max = Math.max(max, zona.id);
  const usados = new Set();
  for (const zona of mask.zones) {
    if (!zona.id || usados.has(zona.id)) {
      max += 1;
      zona.id = max;
    }
    usados.add(zona.id);
  }
  // Documentos anteriores a las zonas: todo lo pintado pertenece a la zona 1.
  if (!mask.zones.length && mask.strokes.length) {
    mask.zones.push({ id: 1, prompt: '' });
    usados.add(1);
  }
  if (!mask.zones.length) return mask;
  const primera = mask.zones[0].id;
  for (const trazo of mask.strokes) {
    if (!trazo || typeof trazo !== 'object') continue;
    if (trazo.mode === 'erase') continue;
    if (!usados.has(Number(trazo.zone))) trazo.zone = primera;
  }
  return mask;
}

/** Crea la siguiente zona y la devuelve (null si se alcanzó el límite). */
export function createMaskZone(layer, prompt = '') {
  const mask = ensureMaskZones(layer);
  if (!mask) return null;
  if (mask.zones.length >= LIMITS.maxMaskZones) return null;
  const zona = { id: nextMaskZoneId(mask), prompt: String(prompt || '') };
  mask.zones.push(zona);
  return zona;
}

/** Borra una zona, sus trazos y la deja sin prompt. */
export function removeMaskZone(layer, zoneId) {
  const mask = ensureMaskZones(layer);
  if (!mask) return false;
  const id = Number(zoneId);
  const indice = mask.zones.findIndex((zona) => zona.id === id);
  if (indice < 0) return false;
  mask.zones.splice(indice, 1);
  mask.strokes = mask.strokes.filter((trazo) => Number(trazo.zone) !== id);
  if (!mask.strokes.some((trazo) => trazo.mode !== 'erase')) {
    mask.strokes = [];
    mask.enabled = false;
  }
  return true;
}

/** Trazos de pintar de una zona, en orden (los de borrar no cuentan). */
export function maskZoneStrokes(mask, zoneId) {
  const id = Number(zoneId);
  return (mask?.strokes || []).filter((trazo) => trazo.mode !== 'erase' && Number(trazo.zone) === id);
}

/** Zona más cercana a un punto (para que un trazo nuevo se una a la suya).
    Se compara el HUECO entre los bordes del pincel: si el trazo nuevo toca o
    roza la pintura existente, es de esa zona; si queda separado, es zona nueva. */
export function findMaskZoneAt(mask, point, size = 40) {
  const zonas = mask?.zones || [];
  if (!zonas.length || !point) return null;
  // Admite { x, y } y también el par [x, y] de un trazo.
  const px = Array.isArray(point) ? Number(point[0]) : Number(point.x);
  const py = Array.isArray(point) ? Number(point[1]) : Number(point.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;
  const radioNuevo = Math.max(1, (Number(size) || 40) / 2);
  let mejor = null;
  let mejorHueco = Infinity;
  for (const zona of zonas) {
    for (const trazo of mask.strokes) {
      if (trazo.mode === 'erase' || Number(trazo.zone) !== zona.id) continue;
      const radioTrazo = Math.max(1, (Number(trazo.size) || 1) / 2);
      const puntos = trazo.pts || [];
      const salto = Math.max(1, Math.ceil(puntos.length / 60));
      for (let i = 0; i < puntos.length; i += salto) {
        const dist = Math.hypot(puntos[i][0] - px, puntos[i][1] - py);
        const hueco = dist - radioNuevo - radioTrazo;
        if (hueco < mejorHueco) { mejorHueco = hueco; mejor = zona.id; }
      }
    }
  }
  // Tolerancia: hasta el radio del pincel. Si el trazo nuevo queda separado más
  // que eso de la pintura existente, es una zona nueva (o se fuerza con «＋ Zona»).
  const tolerancia = Math.max(8, Math.min(60, radioNuevo));
  return mejorHueco <= tolerancia ? mejor : null;
}

/* ── Historial ── */
function snapshot() {
  return structuredClone(state.doc);
}

export function resetHistory() {
  state.history.undo = [];
  state.history.redo = [];
  emit('history:change', {});
}

export function pushHistory(previousDoc, label = 'cambio') {
  if (!previousDoc || typeof previousDoc !== 'object') return;
  state.history.undo.push({ doc: previousDoc, label, at: Date.now() });
  if (state.history.undo.length > state.history.limit) state.history.undo.shift();
  state.history.redo = [];
  emit('history:change', {});
}

/** Aplica una mutación al documento registrando un único paso de historial. */
export function mutate(label, fn) {
  if (!state.doc) return false;
  const before = snapshot();
  fn(state.doc);
  state.doc.updatedAt = Date.now();
  pushHistory(before, label);
  markDirty();
  emit('doc:change', { label });
  return true;
}

export function undo() {
  const entry = state.history.undo.pop();
  if (!entry) return false;
  state.history.redo.push({ doc: snapshot(), label: entry.label, at: Date.now() });
  state.doc = entry.doc;
  if (!getLayer(state.selection.layerId)) state.selection.layerId = null;
  markDirty();
  emit('doc:change', { label: `deshacer: ${entry.label}`, structural: true });
  emit('history:change', {});
  return true;
}

export function redo() {
  const entry = state.history.redo.pop();
  if (!entry) return false;
  state.history.undo.push({ doc: snapshot(), label: entry.label, at: Date.now() });
  state.doc = entry.doc;
  if (!getLayer(state.selection.layerId)) state.selection.layerId = null;
  markDirty();
  emit('doc:change', { label: `rehacer: ${entry.label}`, structural: true });
  emit('history:change', {});
  return true;
}

export const canUndo = () => state.history.undo.length > 0;
export const canRedo = () => state.history.redo.length > 0;

/* ── Guardado ── */
export function markDirty() {
  state.flags.dirty = true;
  state.ui.saveState = state.ui.saveState === 'saving' ? 'saving' : 'dirty';
  emit('save:state', { state: state.ui.saveState });
  emit('project:dirty', {});
}

export function markSaved(ts = Date.now()) {
  state.flags.dirty = false;
  state.flags.lastSavedAt = ts;
  state.ui.saveState = 'saved';
  emit('save:state', { state: 'saved', at: ts });
}

export function setSaveState(value, detail = {}) {
  state.ui.saveState = value;
  emit('save:state', { state: value, ...detail });
}

/* ── Serialización del proyecto ── */
export async function serializeProject() {
  const resources = [];
  for (const res of state.resources.values()) {
    if (!res.blob) continue;
    resources.push({
      id: res.id,
      name: res.name,
      mime: res.mime,
      width: res.width,
      height: res.height,
      base64: await blobToBase64(res.blob),
    });
  }
  return {
    kind: 'unified-image-studio/project',
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    project: state.project,
    doc: state.doc,
    resources,
  };
}

export async function deserializeProject(payload) {
  if (!payload || payload.kind !== 'unified-image-studio/project') {
    throw new Error('El archivo no es un proyecto de Unified Image Studio.');
  }
  if (payload.schema > SCHEMA) {
    throw new Error(`El proyecto usa el esquema ${payload.schema}; esta versión abre hasta el ${SCHEMA}.`);
  }
  for (const item of payload.resources || []) {
    const blob = base64ToBlob(item.base64, item.mime);
    addResource({
      id: item.id,
      name: item.name,
      mime: item.mime,
      blob,
      width: item.width,
      height: item.height,
    });
  }
  return { project: payload.project, doc: payload.doc };
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('No se pudo leer el recurso.'));
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64, mime = 'image/png') {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function dataUrlToBlob(dataUrl) {
  const [head, body] = String(dataUrl).split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/png';
  return base64ToBlob(body || '', mime);
}
