/* ============================================================
   ui.js — vistas, listas, avisos y estado visible de la interfaz
   ============================================================ */

import {
  state, emit, on, getLayer, selectLayer, removeLayer, duplicateLayer, reorderLayer,
  moveLayerTo, mutate, getResource, fmtDate, fmtBytes, canUndo, canRedo,
  clamp, LIMITS,
} from './core.js?v=19';
import { modelById, catalog } from './ai.js?v=19';

export const $ = (id) => document.getElementById(id);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/* ══════════════ Avisos ══════════════ */
export function toast(message, type = 'info', { duration = 5200 } = {}) {
  const stack = $('toastStack');
  if (!stack) return;
  while (stack.children.length >= 3) stack.firstElementChild.remove();
  const icons = { info: '#i-info', ok: '#i-check', warn: '#i-alert', error: '#i-alert' };
  const node = el('div', { class: `toast toast-${type}`, role: 'status' }, [
    el('div', { class: 'toast-body', text: message }),
  ]);
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', 'ico ico-sm');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', icons[type] || icons.info);
  icon.appendChild(use);
  node.insertBefore(icon, node.firstChild);

  const close = el('button', { class: 'toast-close', 'aria-label': 'Cerrar aviso', text: '×' });
  close.addEventListener('click', () => dismiss());
  node.appendChild(close);
  stack.appendChild(node);

  let timer = duration ? setTimeout(dismiss, duration) : 0;
  function dismiss() {
    clearTimeout(timer);
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 200);
  }
  node.addEventListener('mouseenter', () => clearTimeout(timer));
  return dismiss;
}

/* ══════════════ Modales ══════════════ */
const openStack = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const openers = new WeakMap();

function focusables(modal) {
  return Array.from(modal.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

function trapFocus(event) {
  if (event.key !== 'Tab') return;
  const modal = event.currentTarget;
  const items = focusables(modal);
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function openModal(id) {
  const modal = $(id);
  if (!modal) return;
  if (openStack.includes(id)) return; // ya está abierto: no dupliques la pila
  openers.set(modal, document.activeElement);
  modal.classList.remove('hidden');
  modal.addEventListener('keydown', trapFocus);
  openStack.push(id);
  const focusable = focusables(modal)[0];
  setTimeout(() => focusable?.focus(), 40);
}

export function closeModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.classList.add('hidden');
  modal.removeEventListener('keydown', trapFocus);
  const index = openStack.indexOf(id);
  if (index >= 0) openStack.splice(index, 1);
  const opener = openers.get(modal);
  if (opener && document.contains(opener) && typeof opener.focus === 'function') {
    opener.focus();
  }
  openers.delete(modal);
}

export function closeTopModal() {
  const id = openStack.at(-1);
  if (id) closeModal(id);
  return Boolean(id);
}

export function anyModalOpen() { return openStack.length > 0; }

export function confirmDialog({ title = 'Confirmar', text = '¿Seguro?', okLabel = 'Aceptar', danger = false } = {}) {
  return new Promise((resolve) => {
    $('confirmTitle').textContent = title;
    $('confirmText').textContent = text;
    const ok = $('confirmOk');
    const cancel = $('confirmCancel');
    ok.textContent = okLabel;
    ok.classList.toggle('btn-danger', danger);
    ok.classList.toggle('btn-primary', !danger);
    openModal('confirmModal');
    ok.focus();

    const finish = (value) => {
      closeModal('confirmModal');
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      resolve(value);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
  });
}

export function showLoading(text = 'IA generando imagen…', secondary = 'Enviando la solicitud al proveedor.') {
  const overlay = $('loadingOverlay');
  $('loadingText').textContent = text;
  $('loadingSecondary').textContent = secondary;
  overlay.classList.remove('hidden');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-busy', 'true');
  // Mientras el overlay está visible no se desplaza el documento de fondo.
  document.documentElement.classList.add('is-loading');
}

export function hideLoading() {
  const overlay = $('loadingOverlay');
  overlay.classList.add('hidden');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-busy', 'false');
  document.documentElement.classList.remove('is-loading');
}

/* ══════════════ Barra superior / estado ══════════════ */
export function updateTopbar() {
  const doc = state.doc;
  $('projectName').textContent = state.project?.name || 'Sin proyecto';
  $('docMeta').textContent = doc ? `${doc.width} × ${doc.height} px` : '— × —';
  $('undoBtn').disabled = !canUndo();
  $('redoBtn').disabled = !canRedo();
  $('statusDoc').textContent = doc ? `${doc.width} × ${doc.height} · ${doc.layers.length} capas` : 'Sin documento';
  $('statusSelection').textContent = getLayer() ? getLayer().name : 'Sin selección';
  $('statusZoom').textContent = `${Math.round(state.ui.zoom * 100)} %`;
  $('zoomValue').textContent = `${Math.round(state.ui.zoom * 100)} %`;
  $('dirtyDot').classList.toggle('is-dirty', state.flags.dirty);

  $('saveState').dataset.state = state.ui.saveState;
  const labels = {
    idle: 'Sin guardar', dirty: 'Cambios sin guardar', saving: 'Guardando…',
    saved: 'Guardado', partial: 'Imágenes sin subir', offline: 'Solo local', error: 'Error al guardar',
  };
  $('saveStateText').textContent = labels[state.ui.saveState] || 'Sin guardar';
  $('exportBtn').disabled = !doc || doc.layers.length === 0;

  const mode = state.ui.mode;
  const modeEl = $('statusMode');
  modeEl.dataset.mode = mode === 'server' ? 'server' : 'local';
  $('statusModeText').textContent = mode === 'server'
    ? 'Servidor privado'
    : mode === 'auth' ? 'Sin sesión' : 'Modo local';

  const authBtn = $('authBtn');
  if (authBtn) {
    authBtn.querySelector('use').setAttribute('href', mode === 'server' ? '#i-unlock' : '#i-lock');
    authBtn.title = mode === 'server' ? 'Sesión iniciada (pulsa para cerrar sesión)' : 'Acceso al servidor privado';
    authBtn.classList.toggle('is-active', mode === 'server');
  }
  modeEl.title = mode === 'server'
    ? 'Sesión iniciada. Pulsa para gestionar el acceso'
    : 'Sin sesión: pulsa para entrar con la contraseña del proyecto';
}

export function updateSaveState(value, detail = {}) {
  state.ui.saveState = value;
  const node = $('saveState');
  node.dataset.state = value;
  const labels = {
    idle: 'Sin guardar', dirty: 'Cambios sin guardar', saving: 'Guardando…',
    saved: detail.at ? `Guardado ${new Date(detail.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Guardado',
    partial: 'Guardado sin las imágenes', offline: 'Solo local', error: 'Error al guardar',
  };
  $('saveStateText').textContent = labels[value] || 'Sin guardar';
  $('dirtyDot').classList.toggle('is-dirty', state.flags.dirty);
}

/* ══════════════ Vista del lienzo ══════════════ */
export function updateViewportUI(zoom) {
  $('zoomValue').textContent = `${Math.round(zoom * 100)} %`;
  $('statusZoom').textContent = `${Math.round(zoom * 100)} %`;
  $('fitBtn').setAttribute('aria-pressed', String(state.ui.fit));
  $('actualBtn').setAttribute('aria-pressed', String(Math.abs(zoom - 1) < 0.001 && !state.ui.fit));
}

export function setEmptyState(empty) {
  $('emptyState').classList.toggle('hidden', !empty);
}

/* ══════════════ Capas ══════════════ */
export function renderLayers() {
  const list = $('layerList');
  const doc = state.doc;
  list.innerHTML = '';
  if (!doc || doc.layers.length === 0) {
    list.appendChild(el('div', { class: 'empty-line', text: 'Sin capas todavía. Importa una imagen o añade texto.' }));
    renderLayerProps();
    updateTopbar();
    return;
  }
  const layers = [...doc.layers].reverse();
  layers.forEach((layer, reverseIndex) => {
    const realIndex = doc.layers.length - 1 - reverseIndex;
    const item = el('div', {
      class: `layer-item${layer.id === state.selection.layerId ? ' is-selected' : ''}`,
      role: 'option',
      draggable: 'true',
      'aria-selected': String(layer.id === state.selection.layerId),
      'data-id': layer.id,
      'data-index': String(realIndex),
      tabindex: '0',
    });

    const thumb = el('div', { class: 'layer-thumb' });
    const res = layer.type === 'image' ? getResource(layer.resourceId) : null;
    if (res?.url) thumb.style.backgroundImage = `url("${res.url}")`;
    else thumb.innerHTML = layer.type === 'text'
      ? '<span style="font-family:var(--font-display);font-size:14px;color:var(--muted)">T</span>'
      : '<svg class="ico ico-sm"><use href="#i-shape"/></svg>';

    const meta = el('div', { class: 'layer-meta' }, [
      el('div', { class: 'layer-name', text: layer.name }),
      el('div', { class: 'layer-sub', text: layerSubtitle(layer) }),
    ]);

    const visibleBtn = iconBtn(layer.visible ? '#i-eye' : '#i-eye-off', layer.visible ? 'Ocultar capa' : 'Mostrar capa', () => {
      mutate('visibilidad de capa', () => { const l = getLayer(layer.id); if (l) l.visible = !l.visible; });
      renderLayers();
    });
    if (!layer.visible) visibleBtn.classList.add('is-off');

    const lockBtn = iconBtn(layer.locked ? '#i-lock' : '#i-unlock', layer.locked ? 'Desbloquear capa' : 'Bloquear capa', () => {
      mutate('bloqueo de capa', () => { const l = getLayer(layer.id); if (l) l.locked = !l.locked; });
      renderLayers();
    });
    if (layer.locked) lockBtn.classList.add('is-off');

    const buttons = el('div', { class: 'layer-btns' }, [visibleBtn, lockBtn]);

    item.append(thumb, meta, buttons);
    item.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      selectLayer(layer.id);
    });
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectLayer(layer.id); }
    });
    item.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/layer', layer.id);
      event.dataTransfer.effectAllowed = 'move';
      item.classList.add('is-dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('is-dragging'));
    item.addEventListener('dragover', (event) => {
      event.preventDefault();
      item.classList.add('drop-target');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drop-target'));
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      item.classList.remove('drop-target');
      const draggedId = event.dataTransfer.getData('text/layer');
      if (!draggedId || draggedId === layer.id) return;
      mutate('reordenar capas', () => moveLayerTo(draggedId, realIndex));
      renderLayers();
    });

    list.appendChild(item);
  });
  renderLayerProps();
  updateTopbar();
}

function layerSubtitle(layer) {
  const type = { image: 'imagen', text: 'texto', shape: 'forma' }[layer.type] || layer.type;
  const mask = layer.mask?.strokes?.length ? ` · máscara ${layer.mask.strokes.length}` : '';
  return `${type} · ${Math.round(layer.w)}×${Math.round(layer.h)}${mask}`;
}

function iconBtn(icon, label, onClick, extra = '') {
  const button = el('button', { class: `icon-btn ${extra}`, 'aria-label': label, title: label });
  button.innerHTML = `<svg class="ico ico-sm"><use href="${icon}"/></svg>`;
  button.addEventListener('click', (event) => { event.stopPropagation(); onClick(event); });
  return button;
}

export function renderLayerProps() {
  const layer = getLayer();
  const ids = ['layerOpacity', 'layerX', 'layerY', 'layerW', 'layerH', 'dupLayerBtn', 'delLayerBtn'];
  ids.forEach((id) => { $(id).disabled = !layer; });
  $('propsName').textContent = layer ? layer.name : 'Sin selección';
  if (!layer) {
    $('opacityValue').textContent = '—';
    return;
  }
  $('layerOpacity').value = String(Math.round(layer.opacity * 100));
  $('opacityValue').textContent = `${Math.round(layer.opacity * 100)} %`;
  $('layerX').value = Math.round(layer.x);
  $('layerY').value = Math.round(layer.y);
  $('layerW').value = Math.round(layer.w);
  $('layerH').value = Math.round(layer.h);
}

/* ══════════════ Referencias ══════════════ */
export function renderRefs() {
  const strip = $('refStrip');
  const grid = $('refsGrid');
  strip.innerHTML = '';
  grid.innerHTML = '';
  $('refCount').textContent = String(state.ui.refs.length);

  if (state.ui.refs.length === 0) {
    strip.appendChild(el('span', { class: 'ref-empty', text: 'Sin referencias.' }));
    grid.appendChild(el('div', { class: 'empty-line', text: 'Añade una imagen de referencia para guiar la generación.' }));
    return;
  }

  state.ui.refs.forEach((ref, index) => {
    const res = getResource(ref.resourceId);
    const chip = el('div', {
      class: 'ref-chip',
      style: res?.url ? `background-image:url("${res.url}")` : '',
      title: `${res?.name || 'referencia'} · ${ref.role}`,
    });
    const removeBtn = el('button', { 'aria-label': `Quitar referencia ${index + 1}`, text: '×' });
    removeBtn.addEventListener('click', () => {
      state.ui.refs.splice(index, 1);
      renderRefs();
      updateTopbar();
    });
    chip.appendChild(removeBtn);
    strip.appendChild(chip);

    const card = el('div', { class: 'ref-card' });
    const img = el('img', { src: res?.url || '', alt: `Referencia ${index + 1}` });
    const select = el('select', { 'aria-label': `Papel de la referencia ${index + 1}` });
    for (const role of ['producto', 'identidad', 'estilo', 'pose', 'composición']) {
      const option = el('option', { value: role, text: role });
      if (role === ref.role) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', () => { ref.role = select.value; });
    card.append(img, select);
    grid.appendChild(card);
  });
}

/* ══════════════ Biblioteca ══════════════ */
export function renderVersions(versions = []) {
  const list = $('versionList');
  list.innerHTML = '';
  if (!versions.length) {
    list.appendChild(el('div', { class: 'empty-line', text: 'Sin versiones guardadas.' }));
    return;
  }
  for (const version of versions) {
    const detail = version.doc
      ? `${fmtDate(version.at)} · ${version.doc.layers?.length || 0} capas`
      : `${fmtDate(version.at)} · en el servidor`;
    const row = el('div', { class: 'list-row' }, [
      el('div', { class: 'list-row-main' }, [
        el('div', { class: 'list-row-title', text: version.label }),
        el('div', { class: 'mono', text: detail }),
      ]),
    ]);
    const actions = el('div', { class: 'list-row-actions' });
    const restore = iconBtn('#i-history', 'Restaurar versión', () => {
      emit('version:restore', { version });
    });
    actions.appendChild(restore);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

export function renderProjects(projects = [], targetId = 'projectList', limit = 6) {
  const list = $(targetId);
  list.innerHTML = '';
  if (!projects.length) {
    list.appendChild(el('div', { class: 'empty-line', text: 'Sin proyectos guardados.' }));
    return;
  }
  for (const project of projects.slice(0, limit)) {
    const current = project.id === state.project?.id;
    const row = el('div', { class: `list-row${current ? ' is-current' : ''}` }, [
      el('div', { class: 'list-row-main' }, [
        el('div', { class: 'list-row-title', text: project.name }),
        el('div', { class: 'mono', text: `${fmtDate(project.updatedAt)} · ${project.width || 0}×${project.height || 0}` }),
      ]),
    ]);
    const actions = el('div', { class: 'list-row-actions' });
    const open = iconBtn('#i-folder', 'Abrir proyecto', () => emit('project:open', { id: project.id }));
    const del = iconBtn('#i-trash', 'Eliminar proyecto', () => emit('project:delete', { id: project.id }));
    actions.append(open, del);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

export function renderAssets() {
  const grid = $('assetGrid');
  grid.innerHTML = '';
  const resources = [...state.resources.values()].filter((r) => r.url);
  if (!resources.length) {
    const line = el('div', { class: 'empty-line', text: 'Sin recursos en este proyecto.' });
    line.style.gridColumn = '1 / -1';
    grid.appendChild(line);
    return;
  }
  for (const res of resources.slice(-18).reverse()) {
    const card = el('div', {
      class: 'asset-card',
      style: `background-image:url("${res.url}")`,
      title: `${res.name} · ${res.width}×${res.height} · ${fmtBytes(res.blob?.size || 0)}`,
      tabindex: '0',
      role: 'button',
      'aria-label': `Añadir ${res.name} al lienzo`,
    });
    card.appendChild(el('span', { text: res.name }));
    const add = () => emit('resource:addToCanvas', { id: res.id });
    card.addEventListener('click', add);
    card.addEventListener('keydown', (event) => { if (event.key === 'Enter') add(); });
    grid.appendChild(card);
  }
}

/* ══════════════ Recetas ══════════════ */
export function renderRecipes(recipes = state.ui.recipes) {
  const list = $('recipeList');
  list.innerHTML = '';
  if (!recipes.length) {
    list.appendChild(el('div', { class: 'empty-line', text: 'Sin recetas. Guarda los ajustes actuales para reutilizarlos.' }));
    return;
  }
  for (const recipe of recipes) {
    const model = modelById(recipe.model);
    const row = el('div', { class: 'list-row' }, [
      el('div', { class: 'list-row-main' }, [
        el('div', { class: 'list-row-title', text: recipe.name }),
        el('div', { class: 'mono', text: `${model.label} · ${recipe.aspect} · ${recipe.resolution}px` }),
      ]),
    ]);
    const actions = el('div', { class: 'list-row-actions' });
    actions.appendChild(iconBtn('#i-check', 'Aplicar receta', () => emit('recipe:apply', { recipe })));
    actions.appendChild(iconBtn('#i-trash', 'Eliminar receta', () => emit('recipe:delete', { recipe })));
    row.appendChild(actions);
    list.appendChild(row);
  }
}

/* ══════════════ Selector de modelo ══════════════ */
export function setActiveModel(modelId) {
  state.ui.model = modelId;
  // Solo el selector de imagen: vídeo y filtros usan la misma clase visual.
  $$('#modelSelector .model-toggle').forEach((button) => {
    const active = button.dataset.model === modelId;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const model = modelById(modelId);
  $('modelNote').textContent = `${model.model}${model.quality ? ` · calidad ${model.quality}` : ''} · ${model.note}`;
  updateTopbar();
}

/* ══════════════ Paneles ══════════════ */
export function switchLeftTab(tab) {
  $$('.rail-btn[data-tab]').forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $$('.tabpane').forEach((pane) => {
    const active = pane.dataset.pane === tab;
    pane.classList.toggle('is-active', active);
    pane.hidden = !active;
  });
  const titles = { generate: 'Generación', edit: 'Edición y máscaras', compose: 'Composición', product: 'Producto y moda', utilities: 'Utilidades', video: 'Vídeo', library: 'Biblioteca' };
  $('panelTitle').textContent = titles[tab] || 'Herramientas';
  document.body.dataset.leftTab = tab;
}

export function switchRightTab(tab) {
  $$('.ptab').forEach((button) => {
    const active = button.dataset.rtab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('.r-pane').forEach((pane) => {
    const active = pane.dataset.rpane === tab;
    pane.classList.toggle('is-active', active);
    pane.hidden = !active;
  });
  document.body.dataset.rightTab = tab;
}

export function setToolUI(tool) {
  $$('.tool-btn').forEach((button) => {
    const active = button.dataset.tool === tool;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

/* ══════════════ Diagnóstico ══════════════ */
export function paintStorageInfo(info) {
  const node = $('storageInfo');
  if (!node) return;
  if (!info) { node.textContent = 'No se pudo leer el almacenamiento.'; return; }
  const lines = [
    `Modo: ${info.mode === 'server' ? 'servidor privado' : 'local'}`,
    `Servidor: ${info.server ? (info.writable ? 'conectado y autorizado' : 'conectado, sesión no iniciada') : 'no disponible'}`,
    `Proyectos locales: ${info.projects}`,
    `Caché: ${fmtBytes(info.used)}${info.quota ? ` de ${fmtBytes(info.quota)}` : ''}`,
  ];
  node.textContent = lines.join('\n');
  node.style.whiteSpace = 'pre-line';
}

export { LIMITS, clamp };
