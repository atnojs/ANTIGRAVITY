/* ============================================================
   persist.js — IndexedDB, sincronización con el servidor y versiones
   ============================================================ */

import {
  state, emit, addResource, markSaved, setSaveState, uid, SCHEMA,
} from './core.js?v=18';

const DB_NAME = 'unified-image-studio-hoola';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_DOCS = 'documents';
const STORE_RESOURCES = 'resources';
const STORE_VERSIONS = 'versions';
const API = 'api.php';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_DOCS)) db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_RESOURCES)) db.createObjectStore(STORE_RESOURCES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_VERSIONS)) db.createObjectStore(STORE_VERSIONS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'));
  });
  return dbPromise;
}

function tx(storeName, mode = 'readonly') {
  return openDb().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const idb = {
  async put(store, value) { return wrap((await tx(store, 'readwrite')).put(value)); },
  async get(store, key) { return wrap((await tx(store)).get(key)); },
  async all(store) { return wrap((await tx(store)).getAll()); },
  async remove(store, key) { return wrap((await tx(store, 'readwrite')).delete(key)); },
  async clear(store) { return wrap((await tx(store, 'readwrite')).clear()); },
};

/* ══════════════ Cliente HTTP ══════════════ */
export const server = {
  available: null,
  lastError: '',
  writable: false,

  async call(action, payload = {}, { method = 'POST', timeout = 45000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const options = {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        signal: controller.signal,
        cache: 'no-store',
      };
      if (method === 'POST') options.body = JSON.stringify(payload);
      const url = method === 'GET'
        ? `${API}?action=${encodeURIComponent(action)}&${new URLSearchParams(payload).toString()}`
        : `${API}?action=${encodeURIComponent(action)}`;
      const response = await fetch(url, options);
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        // PHP puede anteponer avisos en HTML (p. ej. al superar post_max_size).
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
          try { data = JSON.parse(text.slice(start, end + 1)); } catch { data = null; }
        }
      }
      if (!response.ok) {
        const error = new Error(data?.error || `Error HTTP ${response.status}${data ? '' : ' (respuesta no válida del servidor)'}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      if (!data) throw new Error('El servidor devolvió una respuesta no válida.');
      return data;
    } finally {
      clearTimeout(timer);
    }
  },

  async probe() {
    try {
      const data = await this.call('state', {}, { method: 'GET', timeout: 6000 });
      this.available = Boolean(data?.ok);
      this.writable = Boolean(data?.authenticated);
      state.ui.mode = this.available ? (this.writable ? 'server' : 'auth') : 'local';
      this.lastError = '';
      return data;
    } catch (error) {
      this.available = false;
      this.writable = false;
      this.lastError = error.message;
      state.ui.mode = 'local';
      return null;
    }
  },
};

/* ══════════════ Persistencia local ══════════════ */
export async function saveLocal(reason = 'auto') {
  if (!state.doc || !state.project) return;
  state.flags.saving += 1;
  if (reason !== 'silent') setSaveState('saving');
  try {
    await idb.put(STORE_DOCS, state.doc);
    for (const res of state.resources.values()) {
      if (!res.blob) continue;
      const existing = await idb.get(STORE_RESOURCES, res.id);
      if (!existing) {
        await idb.put(STORE_RESOURCES, {
          id: res.id, name: res.name, mime: res.mime, blob: res.blob,
          width: res.width, height: res.height, remoteId: res.remoteId || null,
        });
      }
    }
    localStorage.setItem('uis-hoola:lastProject', state.project.id);
    let sync = 'local';
    let uploadFailures = 0;
    if (state.ui.mode === 'server' && server.writable) {
      // Primero las imágenes: un proyecto que apunta a recursos que no existen en el
      // servidor no se puede recuperar en otro dispositivo.
      uploadFailures = await flushPendingUploads();
      sync = await syncServer();
    }
    // El proyecto se escribe después de sincronizar para guardar la versión real del servidor.
    await idb.put(STORE_PROJECTS, {
      ...state.project,
      updatedAt: Date.now(),
      layerCount: state.doc.layers.length,
      width: state.doc.width,
      height: state.doc.height,
      thumbnail: state.project.thumbnail || null,
    });
    if (sync === 'conflict') {
      // Hay una copia más reciente en el servidor: no se puede decir «guardado».
      setSaveState('dirty');
      emit('toast', { type: 'warn', message: 'Hay una versión más reciente en el servidor: elige qué conservar.' });
    } else if (sync === 'offline') {
      setSaveState('offline');
    } else if (sync === 'error') {
      setSaveState('error');
    } else if (uploadFailures > 0) {
      // El documento está, pero sus imágenes no: se dice tal cual.
      setSaveState('partial');
      emit('toast', {
        type: 'error',
        duration: 10000,
        message: `${uploadFailures} imagen(es) no se han podido guardar en el servidor. El proyecto está guardado, pero en otro dispositivo faltarán esos recursos. Revisa el límite de subida del hosting.`,
      });
    } else {
      markSaved();
    }
  } catch (error) {
    state.ui.saveState = 'error';
    emit('save:state', { state: 'error', error: error.message });
    emit('toast', { type: 'error', message: `No se pudo guardar: ${error.message}` });
  } finally {
    state.flags.saving -= 1;
  }
}

async function syncServer() {
  try {
    const result = await server.call('project.save', {
      project: { id: state.project.id, name: state.project.name },
      doc: state.doc,
      baseVersion: state.project.version || 0,
    });
    state.project.version = result.version ?? state.project.version;
    state.project.syncedAt = Date.now();
    return 'ok';
  } catch (error) {
    if (error.status === 409) {
      emit('save:conflict', { server: error.data });
      return 'conflict';
    }
    if (error.status) {
      // Error del servidor (401/413/500): no se pierde la conexión, solo este guardado.
      emit('toast', { type: 'error', message: `El servidor rechazó el guardado: ${error.message}` });
      return 'error';
    }
    // Fallo de red: se sigue trabajando en local.
    state.ui.mode = 'local';
    server.available = false;
    emit('toast', { type: 'warn', message: 'Sin conexión con el servidor: guardando solo en este navegador.' });
    return 'offline';
  }
}

export async function uploadResource(resource) {
  if (!server.available || !server.writable) {
    throw new Error('sin sesión en el servidor');
  }
  if (!resource?.blob) {
    throw new Error('el recurso no tiene datos');
  }
  const base64 = await blobToBase64(resource.blob);
  const result = await server.call('resource.upload', {
    id: resource.id,
    name: resource.name,
    mime: resource.mime,
    width: resource.width,
    height: resource.height,
    data: base64,
  }, { timeout: 120000 });
  resource.remoteId = result?.id || resource.id;
  resource.uploadError = null;
  await idb.put(STORE_RESOURCES, {
    id: resource.id, name: resource.name, mime: resource.mime, blob: resource.blob,
    width: resource.width, height: resource.height, remoteId: resource.remoteId,
  });
  return resource.remoteId;
}

/** Reintenta subir los recursos que aún no están en el servidor. Devuelve cuántos fallan. */
export async function flushPendingUploads() {
  if (!server.available || !server.writable) return 0;
  let failures = 0;
  for (const resource of state.resources.values()) {
    if (!resource.blob || resource.remoteId) continue;
    try {
      await uploadResource(resource);
    } catch (error) {
      failures += 1;
      resource.uploadError = error.message;
    }
  }
  return failures;
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('No se pudo leer el recurso.'));
    reader.readAsDataURL(blob);
  });
}

/* ══════════════ Autoguardado ══════════════ */
let saveTimer = 0;
let pendingReason = 'auto';
// Los guardados se encadenan: dos en paralelo enviaban la misma versión base y
// el segundo recibía un 409 falso que dejaba la app en «Cambios sin guardar».
let saveChain = Promise.resolve();

function runSave(reason) {
  saveChain = saveChain.then(() => saveLocal(reason), () => saveLocal(reason));
  return saveChain;
}

export function scheduleSave(reason = 'auto', delay = 900) {
  pendingReason = reason;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    runSave(pendingReason);
  }, delay);
}

export function saveNow(reason = 'manual') {
  clearTimeout(saveTimer);
  return runSave(reason);
}

/* ══════════════ Carga de proyectos ══════════════ */
export async function listProjects() {
  const local = await idb.all(STORE_PROJECTS);
  return local.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function loadProject(id) {
  const project = await idb.get(STORE_PROJECTS, id);
  if (!project) throw new Error('El proyecto no existe en este navegador.');
  const doc = await idb.get(STORE_DOCS, project.docId) || await idb.get(STORE_DOCS, project.id);
  if (!doc) throw new Error('Falta el documento del proyecto.');
  const resources = await idb.all(STORE_RESOURCES);
  for (const res of resources) {
    if (!res.blob) continue;
    addResource({ ...res, url: URL.createObjectURL(res.blob) });
  }
  return { project, doc };
}

export async function deleteProject(id) {
  const project = await idb.get(STORE_PROJECTS, id);
  await idb.remove(STORE_PROJECTS, id);
  if (project?.docId) await idb.remove(STORE_DOCS, project.docId);
  const versions = await idb.all(STORE_VERSIONS);
  for (const version of versions.filter((v) => v.projectId === id)) {
    await idb.remove(STORE_VERSIONS, version.id);
  }
}

export async function lastProjectId() {
  return localStorage.getItem('uis-hoola:lastProject');
}

/* ══════════════ Versiones ══════════════ */
export async function saveVersion(label) {
  if (!state.doc) return null;
  const version = {
    id: uid('ver'),
    projectId: state.project?.id || 'local',
    label: label || `Versión ${new Date().toLocaleTimeString('es-ES')}`,
    at: Date.now(),
    doc: structuredClone(state.doc),
  };
  await idb.put(STORE_VERSIONS, version);
  if (server.available && server.writable) {
    // Copia en servidor: sobrevive a borrar la caché del navegador.
    server.call('version.save', {
      id: version.id,
      projectId: version.projectId,
      label: version.label,
      doc: version.doc,
    }, { timeout: 30000 }).catch(() => null);
  }
  emit('versions:change', {});
  return version;
}

export async function listVersions(projectId = state.project?.id) {
  const local = (await idb.all(STORE_VERSIONS)).filter((v) => !projectId || v.projectId === projectId);
  const merged = new Map(local.map((version) => [version.id, version]));
  if (server.available && server.writable && projectId) {
    try {
      const data = await server.call('version.list', { projectId }, { method: 'GET', timeout: 8000 });
      for (const remote of data?.versions || []) {
        const id = String(remote.id || '');
        if (!id || merged.has(id)) continue;
        merged.set(id, {
          id,
          projectId: remote.project_id || projectId,
          label: remote.label || 'Versión',
          at: Number(remote.created_at || 0) * 1000,
          doc: null,
          remote: true,
        });
      }
    } catch { /* solo las locales */ }
  }
  return [...merged.values()].sort((a, b) => b.at - a.at);
}

/** Recupera el documento de una versión guardada solo en el servidor. */
export async function fetchVersionDoc(id) {
  if (!server.available || !server.writable) throw new Error('La versión solo está en el servidor y la sesión no está activa.');
  const data = await server.call('version.get', { id }, { method: 'GET', timeout: 15000 });
  const doc = data?.version?.doc;
  if (!doc) throw new Error('El servidor no devolvió el documento de la versión.');
  return doc;
}

export async function deleteVersion(id) {
  await idb.remove(STORE_VERSIONS, id);
  emit('versions:change', {});
}

/* ══════════════ Diagnóstico ══════════════ */
export async function storageInfo() {
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
  const projects = await idb.all(STORE_PROJECTS);
  return {
    used: estimate?.usage || 0,
    quota: estimate?.quota || 0,
    projects: projects.length,
    mode: state.ui.mode,
    server: server.available,
    writable: server.writable,
  };
}

export async function clearLocalCache({ keepProjects = true } = {}) {
  if (!keepProjects) {
    for (const store of [STORE_PROJECTS, STORE_DOCS, STORE_RESOURCES, STORE_VERSIONS]) {
      await idb.clear(store);
    }
    return;
  }
  const used = new Set();
  for (const project of await idb.all(STORE_PROJECTS)) used.add(project.docId);
  for (const version of await idb.all(STORE_VERSIONS)) used.add(version.projectId);
  const resources = await idb.all(STORE_RESOURCES);
  const referenced = new Set();
  for (const doc of await idb.all(STORE_DOCS)) {
    for (const layer of doc.layers || []) {
      if (layer.resourceId) referenced.add(layer.resourceId);
    }
  }
  let removed = 0;
  for (const res of resources) {
    if (!referenced.has(res.id)) {
      await idb.remove(STORE_RESOURCES, res.id);
      removed += 1;
    }
  }
  return { removed, used: used.size };
}

export { SCHEMA };
