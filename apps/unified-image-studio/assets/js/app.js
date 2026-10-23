/* ============================================================
   app.js — orquestador de la aplicación
   ============================================================ */

import {
  state, emit, on, uid, clamp, getLayer, getResource, addResource, imageFor,
  createDoc, createProject, makeImageLayer, makeTextLayer, makeShapeLayer,
  addLayer, removeLayer, duplicateLayer, reorderLayer, selectLayer, mutate,
  undo, redo, markDirty, resetHistory, pushHistory, LIMITS, fmtMoney, fmtBytes, fmtDate,
  deserializeProject, dataUrlToBlob,
} from './core.js';
import { renderer } from './render.js';
import { initTools, setTool } from './tools.js';
import {
  $, $$, el, toast, openModal, closeModal, closeTopModal, anyModalOpen, confirmDialog,
  showLoading, hideLoading, updateTopbar, updateSaveState, updateViewportUI, setEmptyState,
  renderLayers, renderLayerProps, renderRefs, renderVersions, renderProjects, renderAssets,
  renderRecipes, setActiveModel, switchLeftTab, switchRightTab, setToolUI, paintStorageInfo,
} from './ui.js';
import {
  server, saveNow, scheduleSave, listProjects, loadProject, deleteProject, saveVersion,
  listVersions, deleteVersion, storageInfo, clearLocalCache, uploadResource, lastProjectId, idb,
  fetchVersionDoc,
} from './persist.js';
import {
  downloadExport, copyToClipboard, downloadProject, exportImage, canvasToBlob, estimateExport,
} from './exporter.js';
import {
  MODELS, modelById, loadCatalog, catalog, describeCost, costFor, generate, fetchBudget, saveBudget,
  recoverPendingJobs, resumeJob, resourceToDataUrl, clearDataUrlCache, onJob, currentJob,
} from './ai.js';

const stageInner = $('stageInner');
const canvasWrap = $('canvasWrap');

/** Sello de versión: se muestra en la ayuda y en la consola para saber qué build corre. */
const BUILD = 'v1.2.0 · 2026-10-23 · responsive + lectura robusta';

let generationBusy = false;
let pendingResult = null;
let lastExportUrl = null;

/* ══════════════════════ Arranque ══════════════════════ */
async function boot() {
  renderer.init({
    view: $('viewCanvas'),
    mask: $('maskCanvas'),
    overlay: $('overlayCanvas'),
    wrap: canvasWrap,
    stageInner,
  });
  initTools({ stageInner });
  bindTopbar();
  bindLeftPanel();
  bindRightPanel();
  bindCanvas();
  bindShortcuts();
  bindPersistence();
  bindGeneration();
  bindProjectActions();
  bindExport();
  bindMisc();

  setActiveModel(state.ui.model);
  switchLeftTab('generate');
  switchRightTab('layers');
  renderRecipes(loadRecipes());
  // Sello de versión: nunca debe tumbar el arranque si falta el elemento.
  const buildStamp = $('buildStamp');
  if (buildStamp) buildStamp.textContent = BUILD;
  const statusBuild = $('statusBuild');
  if (statusBuild) {
    statusBuild.textContent = BUILD.split('·')[0].trim();
    statusBuild.title = BUILD;
  }
  console.info('[Unified Image Studio]', BUILD);

  const probe = await server.probe();
  paintStorageInfo(await storageInfo());
  if (probe && !probe.authenticated) {
    if (probe.configured) {
      toast('Introduce la contraseña para trabajar con el servidor privado. Mientras tanto la app funciona en local.', 'info', { duration: 8000 });
      openModal('loginModal');
      $('loginPassword').focus();
    } else {
      toast('El servidor no tiene contraseña configurada (UIS_PASSWORD_HASH). Se trabajará en modo local.', 'warn', { duration: 9000 });
    }
  } else if (!probe) {
    toast('Servidor PHP no disponible: la app funciona en local con IndexedDB. La generación con IA requiere el servidor.', 'info', { duration: 8000 });
  }
  await loadCatalog();
  updateTopbar();
  refreshBudget();

  const last = await lastProjectId();
  if (last) {
    try {
      await openProject(last, { silent: true });
      toast('Proyecto recuperado: puedes continuar donde lo dejaste.', 'ok');
    } catch {
      startNewProject({ blank: true });
    }
  } else {
    startNewProject({ blank: false });
  }
  void recoverJobsOnBoot();
  await refreshProjectLists();
  updateUtilities();

  renderer.fit();
  updateViewportUI(state.ui.zoom);
}

/** Trabajos que quedaron en curso en el servidor: se retoman sin reenviar ni pagar. */
async function recoverJobsOnBoot() {
  const pending = await recoverPendingJobs();
  if (!pending.length) return;
  const job = pending[0];
  toast(`Hay un trabajo en curso en el servidor (${job.id}). Se recupera sin volver a enviarlo.`, 'info', { duration: 9000 });
  try {
    const final = await resumeJob(job);
    if (final?.image) {
      pendingResult = {
        job: final,
        dataUrl: final.image.startsWith('data:') ? final.image : `data:${final.mimeType || 'image/png'};base64,${final.image}`,
      };
      showResultPreview(pendingResult);
      toast('Trabajo recuperado. Acéptalo para añadirlo al lienzo.', 'ok');
    }
  } catch (error) {
    toast(`No se pudo recuperar el trabajo: ${error.message}`, 'warn');
  }
}

/* ══════════════════════ Documento y proyecto ══════════════════════ */
function startNewProject({ blank = true, name = 'Proyecto sin título', width = 1024, height = 1024 } = {}) {
  state.resources.clear();
  clearDataUrlCache();
  state.doc = createDoc({ name, width, height });
  if (!blank) {
    state.doc.background = { type: 'transparent', color: '#ffffff' };
  }
  state.project = createProject(name, state.doc);
  state.selection.layerId = null;
  state.ui.beforeImage = null;
  state.ui.beforeActive = false;
  resetHistory();
  setEmptyState(!blank);
  renderLayers();
  renderAssets();
  renderRefs();
  renderVersions([]);
  updateTopbar();
  renderer.fit();
  updateViewportUI(state.ui.zoom);
  emit('doc:change', { label: 'nuevo proyecto' });
}

async function openProject(id, { silent = false } = {}) {
  state.resources.clear();
  clearDataUrlCache();
  const { project, doc } = await loadProject(id);
  state.project = project;
  state.doc = doc;
  state.selection.layerId = doc.layers.at(-1)?.id || null;
  resetHistory();
  setEmptyState(doc.layers.length === 0 && !doc.__blank);
  renderLayers();
  renderAssets();
  renderRefs();
  renderVersions(await listVersions(project.id));
  updateTopbar();
  renderer.fit();
  updateViewportUI(state.ui.zoom);
  if (state.ui.mode === 'server' && server.writable) {
    try {
      const data = await server.call('project.get', { id }, { method: 'GET', timeout: 8000 });
      if (data?.version) {
        // Adopta la versión del servidor aunque el documento local sea el vigente:
        // sin esto el primer guardado chocaría con un 409 falso.
        state.project.version = Number(data.version);
      }
      if (data?.doc && (data.doc.updatedAt || 0) > (doc.updatedAt || 0)) {
        const useServer = await confirmDialog({
          title: 'Versión más reciente en el servidor',
          text: 'El servidor tiene una copia más reciente de este proyecto. ¿Quieres cargarla? Si cancelas, se conserva la copia de este navegador.',
          okLabel: 'Cargar del servidor',
        });
        if (useServer && data.doc) {
          state.doc = data.doc;
          state.project.version = data.version || state.project.version;
          resetHistory();
          renderLayers();
          renderer.fit();
          updateTopbar();
        }
      }
    } catch { /* el proyecto local es válido */ }
  }
  if (!silent) toast(`Proyecto «${project.name}» abierto.`, 'ok');
}

/* ══════════════════════ Importación ══════════════════════ */
const MAGIC = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
];

async function sniffMime(file) {
  const buffer = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  for (const signature of MAGIC) {
    if (signature.bytes.every((byte, index) => buffer[index] === byte)) {
      if (signature.mime === 'image/webp') {
        const riff = String.fromCharCode(...buffer.subarray(8, 12));
        if (riff !== 'WEBP') continue;
      }
      return signature.mime;
    }
  }
  return '';
}

async function readImageDimensions(blob) {
  // Vía rápida y fiable; si el navegador no puede decodificarla, se intenta con <img>.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close?.();
      return dims;
    } catch { /* se prueba la vía clásica */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('El navegador no pudo decodificar esta imagen. Exporta en PNG, JPG o WebP y vuelve a intentarlo.'));
    };
    img.src = url;
  });
}

async function importFiles(files, { asReference = false, asLayer = true } = {}) {
  const list = Array.from(files || []);
  if (!list.length) return;
  let imported = 0;
  for (const original of list) {
    if (original.size > LIMITS.maxFileBytes) {
      toast(`«${original.name}» supera el límite de ${fmtBytes(LIMITS.maxFileBytes)}.`, 'error');
      continue;
    }
    // Se leen los bytes UNA vez, al principio: así no dependemos de que el
    // navegador siga manteniendo válida la referencia al File del input.
    let blob;
    try {
      const bytes = await original.arrayBuffer();
      blob = new Blob([bytes], { type: original.type || '' });
    } catch (error) {
      console.error('No se pudo leer el archivo', original.name, error);
      toast(`«${original.name}»: el navegador no dejó leer el archivo (${error.name || 'error'}). Prueba a arrastrarlo al lienzo o a pegarlo con Ctrl+V.`, 'error', { duration: 9000 });
      continue;
    }

    const mime = await sniffMime(blob).catch(() => '');
    if (!mime) {
      toast(`«${original.name}» no es un PNG, JPG, WebP o GIF válido.`, 'error');
      continue;
    }
    let dims;
    try {
      dims = await readImageDimensions(blob);
    } catch (error) {
      toast(`«${original.name}»: ${error.message}`, 'error', { duration: 8000 });
      continue;
    }
    if (dims.width > LIMITS.maxDimension || dims.height > LIMITS.maxDimension) {
      toast(`«${original.name}» supera ${LIMITS.maxDimension} px de lado.`, 'error');
      continue;
    }
    const resource = addResource({
      name: original.name, mime, blob, width: dims.width, height: dims.height,
    });
    void uploadResource(resource);

    if (asReference) {
      if (state.ui.refs.length >= LIMITS.maxRefs) {
        toast(`Máximo ${LIMITS.maxRefs} referencias por generación.`, 'warn');
        break;
      }
      state.ui.refs.push({ resourceId: resource.id, role: 'estilo' });
      renderRefs();
      updateTopbar();
      imported += 1;
      continue;
    }

    if (!asLayer) { imported += 1; continue; }

    if (!state.doc) {
      state.doc = createDoc({ name: original.name.replace(/\.[^.]+$/, ''), width: dims.width, height: dims.height });
      state.project = createProject(state.doc.name, state.doc);
      resetHistory();
    }
    const fits = fitInside(dims.width, dims.height, state.doc.width, state.doc.height);
    const layer = makeImageLayer({
      name: original.name.replace(/\.[^.]+$/, ''),
      resourceId: resource.id,
      x: Math.round((state.doc.width - fits.w) / 2),
      y: Math.round((state.doc.height - fits.h) / 2),
      w: fits.w,
      h: fits.h,
    });
    mutate('importar imagen', () => {
      state.doc.layers.push(layer);
    });
    selectLayer(layer.id);
    setEmptyState(false);
    imported += 1;
  }
  if (imported) {
    renderLayers();
    renderAssets();
    renderer.requestRender('import');
    updateTopbar();
    scheduleSave('import');
    toast(imported === 1 ? 'Imagen añadida al lienzo.' : `${imported} imágenes añadidas.`, 'ok');
  }
}

function fitInside(width, height, maxW, maxH) {
  const scale = Math.min(maxW / width, maxH / height, 1);
  return { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };
}

/* ══════════════════════ Barra superior ══════════════════════ */
function bindTopbar() {
  $('undoBtn').addEventListener('click', () => { if (undo()) afterHistory(); });
  $('redoBtn').addEventListener('click', () => { if (redo()) afterHistory(); });
  $('fitBtn').addEventListener('click', () => { renderer.fit(); updateViewportUI(state.ui.zoom); });
  $('actualBtn').addEventListener('click', () => { renderer.actualSize(); updateViewportUI(state.ui.zoom); });
  $('compareBtn').addEventListener('click', toggleCompare);
  $('zoomInBtn').addEventListener('click', () => { renderer.zoomBy(1.25); updateViewportUI(state.ui.zoom); });
  $('zoomOutBtn').addEventListener('click', () => { renderer.zoomBy(0.8); updateViewportUI(state.ui.zoom); });
  $('zoomValue').addEventListener('click', () => { renderer.actualSize(); updateViewportUI(state.ui.zoom); });
  $('projectChip').addEventListener('click', openProjectsModal);
  $('authBtn').addEventListener('click', openAuth);
  $('statusMode').addEventListener('click', openAuth);
  $('statusMode').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openAuth(); }
  });
  $('retryServer').addEventListener('click', retryServerConnection);
  $('rightToggle').addEventListener('click', () => {
    const app = $('app');
    app.classList.toggle('is-right-open');
    app.classList.remove('is-left-open');
    $('rightToggle').setAttribute('aria-expanded', String(app.classList.contains('is-right-open')));
    syncPanelBackdrop();
  });
  $('exportBtn').addEventListener('click', openExport);
  $('costMeter').addEventListener('click', openBudgetModal);
  $('exportBtn').addEventListener('dblclick', () => {});
  $('saveState').addEventListener('click', () => { saveNow('manual').then(() => toast('Guardado.', 'ok')); });

  on('save:state', ({ state: value, at }) => updateSaveState(value, { at }));
  on('project:dirty', updateTopbar);
  on('history:change', updateTopbar);
  on('layers:change', updateTopbar);
}

function afterHistory() {
  renderLayers();
  renderer.requestRender('history');
  updateTopbar();
  scheduleSave('history');
}

function toggleCompare() {
  if (!state.ui.beforeImage) {
    toast('Todavía no hay un estado anterior con el que comparar. Aplica un resultado de IA para crear la referencia.', 'info');
    return;
  }
  state.ui.compare = !state.ui.compare;
  $('compareBtn').setAttribute('aria-pressed', String(state.ui.compare));
  $('compareHandle').classList.toggle('hidden', !state.ui.compare);
  positionCompareHandle();
  renderer.requestRender('compare');
}

function positionCompareHandle() {
  const handle = $('compareHandle');
  handle.style.left = `${clamp(state.ui.compareX, 0, 1) * 100}%`;
}

/* ══════════════════════ Panel izquierdo ══════════════════════ */
function bindLeftPanel() {
  $$('.rail-btn[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      switchLeftTab(button.dataset.tab);
      if (window.matchMedia('(max-width: 1100px)').matches) {
        const app = $('app');
        app.classList.add('is-left-open');
        app.classList.remove('is-right-open');
        syncPanelBackdrop();
      }
    });
  });
  $('railHelp').addEventListener('click', () => openModal('helpModal'));
  $('leftCollapse').addEventListener('click', () => {
    $('app').classList.toggle('is-left-collapsed');
    setTimeout(() => { renderer.fit(); }, 220);
  });
  $('railToggle').addEventListener('click', () => {
    const app = $('app');
    app.classList.toggle('is-left-open');
    app.classList.remove('is-right-open');
    $('railToggle').setAttribute('aria-expanded', String(app.classList.contains('is-left-open')));
    syncPanelBackdrop();
  });
  $('rightCollapse').addEventListener('click', () => {
    $('app').classList.toggle('is-right-collapsed');
    setTimeout(() => { renderer.fit(); }, 220);
  });
  $$('[data-close-panel]').forEach((button) => button.addEventListener('click', closePanels));
  $('panelBackdrop').addEventListener('click', closePanels);

  // Generación: prompt
  $('promptInput').addEventListener('input', (event) => {
    const length = event.target.value.length;
    $('promptCount').textContent = `${length} / ${LIMITS.maxPrompt.toLocaleString('es-ES')}`;
    if (length > LIMITS.maxPrompt) {
      event.target.value = event.target.value.slice(0, LIMITS.maxPrompt);
      toast('El prompt supera el máximo permitido y se ha recortado.', 'warn');
    }
  });

  $$('.model-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveModel(button.dataset.model);
      updateTopbar();
    });
  });

  $('aspectSelect').addEventListener('change', (event) => { state.ui.aspect = event.target.value; });
  $('resolutionSelect').addEventListener('change', (event) => { state.ui.resolution = Number(event.target.value); });
  $('addRefBtn').addEventListener('click', () => $('refInput').click());
  $('clearRefsBtn').addEventListener('click', () => { state.ui.refs = []; renderRefs(); });

  // Edición: máscara
  $$('#maskMode .seg').forEach((button) => {
    button.addEventListener('click', () => {
      state.ui.maskMode = button.dataset.mode;
      $$('#maskMode .seg').forEach((seg) => {
        const active = seg === button;
        seg.classList.toggle('is-active', active);
        seg.setAttribute('aria-pressed', String(active));
      });
      setTool('mask');
      setToolUI('mask');
      switchLeftTab('edit');
    });
  });
  $('brushSize').addEventListener('input', (event) => {
    state.ui.brushSize = Number(event.target.value);
    $('brushSizeValue').textContent = `${event.target.value} px`;
  });
  $('brushHardness').addEventListener('input', (event) => {
    state.ui.brushHardness = Number(event.target.value);
    $('brushHardnessValue').textContent = `${event.target.value} %`;
  });
  $('clearMaskBtn').addEventListener('click', () => {
    const layer = getLayer();
    if (!layer) return;
    mutate('limpiar máscara', () => { layer.mask = { enabled: false, strokes: [] }; });
    renderer.invalidateMask(layer.id);
    renderLayers();
    renderer.requestRender('mask-clear');
  });
  $('invertMaskBtn').addEventListener('click', () => {
    const layer = getLayer();
    if (!layer) return;
    if (!layer.mask?.strokes?.length) {
      toast('Pinta algo en la máscara antes de invertirla.', 'info');
      return;
    }
    // Invertir sin datos raster: se conserva como operación explícita en el estado.
    mutate('invertir máscara', () => {
      layer.mask.inverted = !layer.mask.inverted;
    });
    renderer.invalidateMask(layer.id);
    renderer.requestRender('mask-invert');
    toast('Máscara invertida (se aplica al enviar el inpainting).', 'ok');
  });
  $('toggleMaskBtn').addEventListener('click', (event) => {
    state.ui.showMask = !state.ui.showMask;
    event.currentTarget.setAttribute('aria-pressed', String(state.ui.showMask));
    event.currentTarget.textContent = state.ui.showMask ? 'Ocultar máscara' : 'Mostrar máscara';
    renderer.requestRender('mask-toggle');
  });

  $('cropBtn').addEventListener('click', openCropModal);
  $('resizeBtn').addEventListener('click', openResizeModal);
  $('rotateCwBtn').addEventListener('click', () => rotateDocument(90));
  $('rotateCcwBtn').addEventListener('click', () => rotateDocument(-90));
  $('flipHBtn').addEventListener('click', flipDocument);
  $('inpaintBtn').addEventListener('click', () => runInpaint());
  $('removeBgBtn').addEventListener('click', removeBackgroundLocal);
  $('removeBgAiBtn')?.addEventListener('click', removeBackgroundAi);

  // Composición
  $('addTextBtn').addEventListener('click', addTextFromPanel);
  $('textSize').addEventListener('input', (event) => {
    $('textSizeValue').textContent = event.target.value;
    const layer = getLayer();
    if (layer?.type === 'text') applyTextOptions(layer);
  });
  ['textContent', 'textColor', 'textWeight', 'textAlign'].forEach((id) => {
    $(id).addEventListener('input', () => {
      const layer = getLayer();
      if (layer?.type === 'text') applyTextOptions(layer);
    });
  });
  $$('.shape-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.ui.shapeType = button.dataset.shape;
      setTool('shape');
      setToolUI('shape');
      toast(`Forma activa: ${button.textContent.trim()}. Arrastra en el lienzo para dibujarla.`, 'info');
    });
  });
  $('shapeStrokeWidth').addEventListener('input', (event) => {
    state.ui.shapeStrokeWidth = Number(event.target.value);
    $('shapeStrokeValue').textContent = event.target.value;
  });
  $('shapeFill').addEventListener('input', (event) => { state.ui.shapeFill = event.target.value; });
  $('shapeStroke').addEventListener('input', (event) => { state.ui.shapeStroke = event.target.value; });
  $('addLogoBtn').addEventListener('click', () => { $('fileInput').dataset.mode = 'logo'; $('fileInput').click(); });
  $$('[data-align]').forEach((button) => button.addEventListener('click', () => alignLayer(button.dataset.align)));

  // Producto
  $('scenePreset').addEventListener('change', (event) => {
    const ready = server.available && server.writable;
    $('applySceneBtn').disabled = !event.target.value || !ready;
  });
  $('applySceneBtn').addEventListener('click', runSceneComposition);
  $('tryOnBtn').disabled = true;
  $('garmentPrompt').addEventListener('input', () => {
    $('tryOnBtn').disabled = !(server.available && server.writable);
  });
  $('tryOnBtn').addEventListener('click', runTryOn);

  // Utilidades
  $('dpiInput').addEventListener('input', (event) => {
    state.doc.dpi = Number(event.target.value);
    $('dpiValue').textContent = event.target.value;
    updateUtilities();
    markDirty();
  });
  $('downloadProjectBtn').addEventListener('click', async () => {
    try {
      const result = await downloadProject();
      toast(`Proyecto descargado (${fmtBytes(result.size)}).`, 'ok');
    } catch (error) { toast(error.message, 'error'); }
  });
  $('importProjectBtn').addEventListener('click', () => $('projectInput').click());
  $('duplicateProjectBtn').addEventListener('click', duplicateCurrentProject);
  $('clearLocalBtn').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Vaciar caché local',
      text: 'Se eliminarán los recursos no usados del navegador. Los proyectos y sus capas se conservan.',
      okLabel: 'Vaciar',
      danger: true,
    });
    if (!ok) return;
    const result = await clearLocalCache();
    toast(`Caché limpiada: ${result?.removed || 0} recursos liberados.`, 'ok');
    paintStorageInfo(await storageInfo());
  });
  $('diagnosticsBtn').addEventListener('click', showDiagnostics);
}

/** Paneles superpuestos en móvil y tableta: fondo oscuro y cierre explícito. */
function syncPanelBackdrop() {
  const backdrop = $('panelBackdrop');
  if (!backdrop) return;
  const app = $('app');
  const open = app.classList.contains('is-left-open') || app.classList.contains('is-right-open');
  backdrop.classList.toggle('hidden', !open);
}

function closePanels() {
  const app = $('app');
  app.classList.remove('is-left-open', 'is-right-open');
  $('railToggle').setAttribute('aria-expanded', 'false');
  $('rightToggle').setAttribute('aria-expanded', 'false');
  syncPanelBackdrop();
}

function applyTextOptions(layer) {
  mutate('editar texto', () => {
    layer.text = $('textContent').value || 'Texto';
    layer.name = layer.text.slice(0, 28);
    layer.fontSize = Number($('textSize').value);
    layer.color = $('textColor').value;
    layer.weight = $('textWeight').value;
    layer.align = $('textAlign').value;
  });
  renderLayers();
  renderer.requestRender('text');
}

function addTextFromPanel() {
  if (!state.doc) { toast('Crea un documento antes de añadir texto.', 'warn'); return; }
  const text = $('textContent').value.trim() || 'Tu texto';
  const layer = makeTextLayer({
    text,
    x: Math.round(state.doc.width * 0.1),
    y: Math.round(state.doc.height * 0.42),
    width: Math.round(state.doc.width * 0.8),
    fontSize: Number($('textSize').value),
    color: $('textColor').value,
    weight: $('textWeight').value,
    align: $('textAlign').value,
  });
  mutate('añadir texto', () => { state.doc.layers.push(layer); });
  selectLayer(layer.id);
  setEmptyState(false);
  setTool('select');
  setToolUI('select');
  renderLayers();
  renderer.requestRender('text');
  scheduleSave('text');
}

function alignLayer(mode) {
  const layer = getLayer();
  if (!layer) { toast('Selecciona una capa para alinearla.', 'info'); return; }
  mutate('alinear capa', () => {
    if (mode === 'left') layer.x = 0;
    if (mode === 'right') layer.x = state.doc.width - layer.w;
    if (mode === 'hcenter') layer.x = Math.round((state.doc.width - layer.w) / 2);
    if (mode === 'top') layer.y = 0;
    if (mode === 'bottom') layer.y = state.doc.height - layer.h;
    if (mode === 'vcenter') layer.y = Math.round((state.doc.height - layer.h) / 2);
  });
  renderLayers();
  renderer.requestRender('align');
}

/* ══════════════════════ Panel derecho ══════════════════════ */
function bindRightPanel() {
  $$('.ptab').forEach((button) => button.addEventListener('click', () => switchRightTab(button.dataset.rtab)));
  let opacityTransaction = null;
  $('layerOpacity').addEventListener('pointerdown', () => {
    opacityTransaction = structuredClone(state.doc);
  });
  $('layerOpacity').addEventListener('input', (event) => {
    const layer = getLayer();
    if (!layer) return;
    layer.opacity = Number(event.target.value) / 100;
    $('opacityValue').textContent = `${event.target.value} %`;
    renderer.requestRender('opacity');
  });
  $('layerOpacity').addEventListener('change', () => {
    const layer = getLayer();
    if (!layer) return;
    if (opacityTransaction) {
      pushHistory(opacityTransaction, 'opacidad de capa');
      markDirty();
      emit('doc:change', { label: 'opacidad' });
      opacityTransaction = null;
    }
    scheduleSave('opacity');
  });
  ['layerX', 'layerY', 'layerW', 'layerH'].forEach((id) => {
    $(id).addEventListener('change', () => {
      const layer = getLayer();
      if (!layer) return;
      mutate(`ajustar ${id.slice(-1).toLowerCase()}`, () => {
        if (id === 'layerX') layer.x = Number($('layerX').value);
        if (id === 'layerY') layer.y = Number($('layerY').value);
        if (id === 'layerW') layer.w = Math.max(1, Number($('layerW').value));
        if (id === 'layerH') layer.h = Math.max(1, Number($('layerH').value));
      });
      renderLayers();
      renderer.requestRender('geometry');
    });
  });
  $('dupLayerBtn').addEventListener('click', () => {
    const layer = getLayer();
    if (!layer) return;
    mutate('duplicar capa', () => duplicateLayer(layer.id));
    renderLayers();
    renderer.requestRender('duplicate');
  });
  $('delLayerBtn').addEventListener('click', deleteSelectedLayer);
  $('layerUpBtn').addEventListener('click', () => {
    const layer = getLayer();
    if (!layer) return;
    mutate('subir capa', () => reorderLayer(layer.id, 1));
    renderLayers();
    renderer.requestRender('order');
  });
  $('layerDownBtn').addEventListener('click', () => {
    const layer = getLayer();
    if (!layer) return;
    mutate('bajar capa', () => reorderLayer(layer.id, -1));
    renderLayers();
    renderer.requestRender('order');
  });
  $('addLayerBtn').addEventListener('click', () => { $('fileInput').dataset.mode = 'layer'; $('fileInput').click(); });
  $('refsAddBtn').addEventListener('click', () => $('refInput').click());

  $('saveVersionBtn').addEventListener('click', async () => {
    const version = await saveVersion();
    renderVersions(await listVersions());
    toast(`Versión guardada: ${version.label}`, 'ok');
  });

  $('saveRecipeBtn').addEventListener('click', saveRecipe);
}

function deleteSelectedLayer() {
  const layer = getLayer();
  if (!layer) return;
  mutate('eliminar capa', () => removeLayer(layer.id));
  setEmptyState(state.doc.layers.length === 0);
  renderLayers();
  renderAssets();
  renderer.requestRender('delete');
  scheduleSave('delete');
}

/* ══════════════════════ Lienzo ══════════════════════ */
function bindCanvas() {
  $('importBtn').addEventListener('click', () => { $('fileInput').dataset.mode = 'layer'; $('fileInput').click(); });
  $('blankBtn').addEventListener('click', () => { startNewProject({ blank: true }); setEmptyState(false); });

  const dropzone = $('dropzone');
  ['dragenter', 'dragover'].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach((type) => {
    dropzone.addEventListener(type, () => dropzone.classList.remove('is-dragover'));
  });
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    importFiles(event.dataTransfer.files);
  });
  stageInner.addEventListener('dragover', (event) => { event.preventDefault(); });
  stageInner.addEventListener('drop', (event) => {
    event.preventDefault();
    if (event.dataTransfer.files?.length) importFiles(event.dataTransfer.files);
  });

  window.addEventListener('paste', (event) => {
    if (isTypingTarget(event.target)) return;
    const items = Array.from(event.clipboardData?.items || []);
    const files = items.filter((item) => item.type.startsWith('image/')).map((item) => item.getAsFile()).filter(Boolean);
    if (files.length) {
      event.preventDefault();
      importFiles(files);
    }
  });

  $('fileInput').addEventListener('change', async (event) => {
    const input = event.target;
    const mode = input.dataset.mode;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    try {
      // No se vacía el input hasta terminar: al limpiarlo, Chrome puede invalidar
      // los File y la lectura falla con «no se pudo leer».
      await importFiles(files, { asLayer: mode !== 'reference' });
    } finally {
      input.value = '';
    }
  });
  $('refInput').addEventListener('change', async (event) => {
    const input = event.target;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    try {
      await importFiles(files, { asReference: true });
    } finally {
      input.value = '';
    }
  });
  $('projectInput').addEventListener('change', async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const { project, doc } = await deserializeProject(payload);
      state.project = project;
      state.doc = doc;
      resetHistory();
      setEmptyState(false);
      renderLayers();
      renderAssets();
      renderRefs();
      renderer.fit();
      updateTopbar();
      scheduleSave('import-project');
      toast('Proyecto importado.', 'ok');
    } catch (error) {
      toast(`No se pudo importar: ${error.message}`, 'error');
    } finally {
      input.value = '';
    }
  });

  $$('.tool-btn').forEach((button) => {
    button.addEventListener('click', () => {
      setTool(button.dataset.tool);
      setToolUI(button.dataset.tool);
      if (button.dataset.tool === 'mask') switchLeftTab('edit');
      if (button.dataset.tool === 'text' || button.dataset.tool === 'shape') switchLeftTab('compose');
    });
  });

  const handle = $('compareHandle');
  let dragging = false;
  handle.addEventListener('pointerdown', (event) => {
    dragging = true;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const rect = canvasWrap.getBoundingClientRect();
    state.ui.compareX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    positionCompareHandle();
    renderer.requestRender('compare');
  });
  handle.addEventListener('pointerup', () => { dragging = false; });

  on('pointer:doc', ({ x, y }) => { $('statusCursor').textContent = `${x}, ${y}`; });
  on('tool:change', ({ tool }) => setToolUI(tool));
  on('text:edit', ({ layerId }) => {
    const layer = getLayer(layerId);
    if (!layer) return;
    $('textContent').value = layer.text;
    $('textSize').value = String(layer.fontSize);
    $('textSizeValue').textContent = String(layer.fontSize);
    $('textColor').value = layer.color;
    $('textWeight').value = layer.weight;
    $('textAlign').value = layer.align;
    switchLeftTab('compose');
    $('textContent').focus();
  });
  on('tool:text', ({ x, y }) => {
    if (!state.doc) return;
    const text = $('textContent').value.trim() || 'Tu texto';
    const layer = makeTextLayer({
      text, x: Math.round(x), y: Math.round(y),
      width: Math.round(state.doc.width * 0.7),
      fontSize: Number($('textSize').value),
      color: $('textColor').value,
      weight: $('textWeight').value,
      align: $('textAlign').value,
    });
    mutate('añadir texto', () => { state.doc.layers.push(layer); });
    selectLayer(layer.id);
    setTool('select');
    setToolUI('select');
    renderLayers();
    renderer.requestRender('text');
  });
  on('resource:addToCanvas', ({ id }) => addResourceToCanvas(id));
  on('render:request', () => renderer.requestRender('image'));
}

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function addResourceToCanvas(resourceId) {
  const res = getResource(resourceId);
  if (!res || !state.doc) return;
  const fits = fitInside(res.width || state.doc.width, res.height || state.doc.height, state.doc.width, state.doc.height);
  const layer = makeImageLayer({
    name: res.name.replace(/\.[^.]+$/, ''),
    resourceId: res.id,
    x: Math.round((state.doc.width - fits.w) / 2),
    y: Math.round((state.doc.height - fits.h) / 2),
    w: fits.w, h: fits.h,
  });
  mutate('añadir recurso', () => { state.doc.layers.push(layer); });
  selectLayer(layer.id);
  setEmptyState(false);
  renderLayers();
  renderer.requestRender('resource');
}

/* ══════════════════════ Transformaciones de documento ══════════════════════ */
function openCropModal() {
  if (!state.doc) return;
  $('cropX').value = '0';
  $('cropY').value = '0';
  $('cropW').value = String(state.doc.width);
  $('cropH').value = String(state.doc.height);
  $('cropNote').textContent = `Documento actual: ${state.doc.width} × ${state.doc.height} px.`;
  openModal('cropModal');
}

function applyCrop() {
  if (!state.doc) return;
  const x = clamp(Number($('cropX').value) || 0, 0, state.doc.width - 1);
  const y = clamp(Number($('cropY').value) || 0, 0, state.doc.height - 1);
  const w = clamp(Number($('cropW').value) || state.doc.width, 1, state.doc.width - x);
  const h = clamp(Number($('cropH').value) || state.doc.height, 1, state.doc.height - y);
  mutate('recortar documento', () => {
    for (const layer of state.doc.layers) { layer.x -= x; layer.y -= y; }
    state.doc.width = Math.round(w);
    state.doc.height = Math.round(h);
  });
  closeModal('cropModal');
  renderer.fit();
  updateViewportUI(state.ui.zoom);
  renderLayers();
  updateTopbar();
  scheduleSave('crop');
}

function openResizeModal() {
  if (!state.doc) return;
  $('resizeW').value = String(state.doc.width);
  $('resizeH').value = String(state.doc.height);
  $('resizeKeepRatio').checked = true;
  openModal('resizeModal');
}

function applyResize() {
  if (!state.doc) return;
  const w = clamp(Number($('resizeW').value) || state.doc.width, 16, LIMITS.maxDimension);
  const h = clamp(Number($('resizeH').value) || state.doc.height, 16, LIMITS.maxDimension);
  const scaleX = w / state.doc.width;
  const scaleY = h / state.doc.height;
  mutate('redimensionar documento', () => {
    for (const layer of state.doc.layers) {
      layer.x = Math.round(layer.x * scaleX);
      layer.y = Math.round(layer.y * scaleY);
      layer.w = Math.round(layer.w * scaleX);
      layer.h = Math.round(layer.h * scaleY);
      if (layer.type === 'text') layer.fontSize = Math.max(4, Math.round(layer.fontSize * Math.min(scaleX, scaleY)));
    }
    state.doc.width = Math.round(w);
    state.doc.height = Math.round(h);
  });
  closeModal('resizeModal');
  renderer.fit();
  updateViewportUI(state.ui.zoom);
  renderLayers();
  updateTopbar();
  scheduleSave('resize');
}

function rotateDocument(direction) {
  if (!state.doc) return;
  mutate(`girar ${direction > 0 ? '90°' : '-90°'}`, () => {
    const { width, height } = state.doc;
    for (const layer of state.doc.layers) {
      const cx = layer.x + layer.w / 2;
      const cy = layer.y + layer.h / 2;
      const nx = direction > 0 ? height - cy : cy;
      const ny = direction > 0 ? cx : width - cx;
      const w = layer.w;
      layer.w = layer.h;
      layer.h = w;
      layer.x = Math.round(nx - layer.w / 2);
      layer.y = Math.round(ny - layer.h / 2);
      layer.rotation = (layer.rotation || 0) + direction;
    }
    state.doc.width = height;
    state.doc.height = width;
  });
  renderer.fit();
  updateViewportUI(state.ui.zoom);
  renderLayers();
  updateTopbar();
  scheduleSave('rotate');
}

function flipDocument() {
  if (!state.doc) return;
  mutate('voltear horizontal', () => {
    for (const layer of state.doc.layers) {
      layer.x = Math.round(state.doc.width - (layer.x + layer.w));
      layer.rotation = -(layer.rotation || 0);
      layer.flipX = !layer.flipX;
    }
  });
  renderer.requestRender('flip');
  renderLayers();
  scheduleSave('flip');
}

/* ══════════════════════ Generación ══════════════════════ */
function bindGeneration() {
  $('generateBtn').addEventListener('click', runGeneration);
  $('useDocAsContext').addEventListener('click', () => {
    state.ui.useCanvasRef = !state.ui.useCanvasRef;
    $('useDocAsContext').textContent = state.ui.useCanvasRef ? 'Quitar lienzo de referencias' : 'Usar lienzo como referencia';
    toast(state.ui.useCanvasRef ? 'El lienzo actual se enviará como referencia.' : 'El lienzo ya no se envía como referencia.', 'info');
  });
  $('acceptResult').addEventListener('click', () => acceptResult('apply'));
  $('variantResult').addEventListener('click', () => acceptResult('variant'));
  $('discardResult').addEventListener('click', discardResult);
  $('closeResult').addEventListener('click', discardResult);
  $('regenResult').addEventListener('click', regenerateResult);
  $('aiAccept').addEventListener('click', () => acceptResult('apply'));
  $('aiVariant').addEventListener('click', () => acceptResult('variant'));
  $('aiDiscard').addEventListener('click', discardResult);
  $('aiRegen').addEventListener('click', regenerateResult);
}

/** Vuelve a generar con el mismo prompt y ajustes, sin dejar la vista previa encima. */
async function regenerateResult() {
  if (generationBusy) {
    toast('La generación anterior sigue en curso. Espera a que termine.', 'warn');
    return;
  }
  discardResult();
  await runGeneration();
}

async function runGeneration() {
  const prompt = $('promptInput').value.trim();
  if (!prompt) { toast('Escribe una descripción para generar.', 'warn'); $('promptInput').focus(); return; }
  if (generationBusy) { toast('Ya hay una generación en curso. Espera a que termine.', 'warn'); return; }

  try {
    if (!server.available) {
      toast('La generación con IA necesita el proxy PHP del servidor. Ahora mismo no responde.', 'error');
      return;
    }
    if (!server.writable) {
      toast('Sesión no autorizada: inicia sesión para enviar trabajos al proveedor.', 'error');
      return;
    }
  } catch { /* sigue */ }

  // La vista previa anterior estorbaba: se retira antes de lanzar la nueva.
  if (pendingResult) discardResult();

  const images = [];
  for (const ref of state.ui.refs) {
    const dataUrl = await resourceToDataUrl(ref.resourceId);
    if (dataUrl) images.push(dataUrl);
  }
  if (state.ui.useCanvasRef && state.doc?.layers?.length) {
    const canvas = renderer.compositeToCanvas({ width: state.doc.width, height: state.doc.height });
    images.push(canvas.toDataURL('image/png'));
  }

  generationBusy = true;
  const btn = $('generateBtn');
  const text = $('generateBtnText');
  btn.disabled = true;
  text.textContent = 'PROCESANDO…';
  showLoading('IA generando imagen…', 'Enviando la solicitud al proveedor. No cierres esta pestaña.');

  try {
    const job = await generate({
      prompt,
      model: state.ui.model,
      aspect: $('aspectSelect').value,
      resolution: Number($('resolutionSelect').value),
      images,
    });
    if (job?.error) throw new Error(job.error);
    if (!job?.image) throw new Error('El trabajo terminó sin imagen.');
    pendingResult = { job, dataUrl: job.image.startsWith('data:') ? job.image : `data:${job.mimeType || 'image/png'};base64,${job.image}` };
    showResultPreview(pendingResult);
    if (job.cost) state.ui.spent = (state.ui.spent || 0) + Number(job.cost);
    updateTopbar();
    refreshBudget();
    toast('Resultado listo. Acéptalo para añadirlo al lienzo.', 'ok');
  } catch (error) {
    toast(`No se pudo generar: ${error.message}`, 'error', { duration: 9000 });
  } finally {
    generationBusy = false;
    btn.disabled = false;
    text.textContent = 'GENERAR';
    hideLoading();
  }
}

function showResultPreview(result) {
  $('resultPreview').src = result.dataUrl;
  $('resultTray').classList.remove('hidden');
  $('aiPreviewImg').src = result.dataUrl;
  $('aiPreview').classList.remove('hidden');
}

async function acceptResult(mode) {
  const result = pendingResult;
  if (!result) return;
  const blob = dataUrlToBlob(result.dataUrl);
  const dims = await readImageDimensions(blob);
  const resource = addResource({ name: `${mode === 'variant' ? 'variante' : 'ia'}-${Date.now()}.png`, mime: 'image/png', blob, width: dims.width, height: dims.height });
  void uploadResource(resource);

  if (!state.doc) {
    state.doc = createDoc({ name: 'Generación', width: dims.width, height: dims.height });
    state.project = createProject('Generación', state.doc);
  }

  state.ui.beforeImage = renderer.snapshotImage();
  const fits = fitInside(dims.width, dims.height, state.doc.width, state.doc.height);
  const layer = makeImageLayer({
    name: mode === 'variant' ? `Variante ${state.doc.layers.length + 1}` : 'Resultado IA',
    resourceId: resource.id,
    x: Math.round((state.doc.width - fits.w) / 2),
    y: Math.round((state.doc.height - fits.h) / 2),
    w: fits.w, h: fits.h,
  });
  mutate(mode === 'variant' ? 'resultado como variante' : 'aplicar resultado IA', () => {
    state.doc.layers.push(layer);
  });
  if (mode === 'variant') {
    await saveVersion(`Variante ${new Date().toLocaleTimeString('es-ES')}`);
    renderVersions(await listVersions());
  }
  selectLayer(layer.id);
  setEmptyState(false);
  renderLayers();
  renderAssets();
  renderer.requestRender('ai-apply');
  scheduleSave('ai-apply');
  discardResult();
  toast(mode === 'variant' ? 'Variante guardada como capa nueva.' : 'Resultado aplicado como capa nueva.', 'ok');
}

function discardResult() {
  pendingResult = null;
  $('resultTray').classList.add('hidden');
  $('aiPreview').classList.add('hidden');
  $('resultPreview').src = '';
  $('aiPreviewImg').src = '';
}

async function runInpaint() {
  const layer = getLayer();
  if (!layer) { toast('Selecciona la capa que quieres editar.', 'warn'); return; }
  if (!layer.mask?.strokes?.length) { toast('Pinta la zona a rellenar en la máscara.', 'warn'); return; }
  const prompt = $('inpaintPrompt').value.trim();
  if (!prompt) { toast('Escribe qué debe aparecer dentro de la máscara.', 'warn'); return; }
  if (!server.available || !server.writable) {
    toast('El inpainting necesita el proxy del servidor y una clave configurada.', 'error');
    return;
  }
  showLoading('Rellenando la máscara…', 'Se envía la composición y la máscara al proveedor.');
  try {
    const composite = renderer.compositeToCanvas();
    const mask = renderer.maskToCanvas(layer);
    const job = await generate({
      prompt,
      model: state.ui.model,
      aspect: '1:1',
      images: [composite.toDataURL('image/png')],
      mask: mask.toDataURL('image/png'),
      kind: 'inpaint',
    });
    if (job?.error) throw new Error(job.error);
    pendingResult = { job, dataUrl: job.image.startsWith('data:') ? job.image : `data:${job.mimeType || 'image/png'};base64,${job.image}` };
    showResultPreview(pendingResult);
  } catch (error) {
    toast(`El inpainting falló: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

/* ── Quitar fondo (local, por color) ── */
async function removeBackgroundLocal() {
  const layer = getLayer();
  if (!layer || layer.type !== 'image') { toast('Selecciona una capa de imagen.', 'warn'); return; }
  const img = imageFor(layer.resourceId);
  if (!img) { toast('La imagen aún no está cargada.', 'warn'); return; }

  showLoading('Recortando el fondo…', 'Análisis de color local, sin enviar nada al servidor.');
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const removed = floodCorners(data);
    ctx.putImageData(data, 0, 0);
    const blob = await canvasToBlob(canvas, 'image/png');
    const resource = addResource({ name: `${layer.name}-sin-fondo.png`, mime: 'image/png', blob, width: canvas.width, height: canvas.height });
    void uploadResource(resource);
    mutate('quitar fondo (local)', () => {
      layer.aspectOriginal = layer.resourceId;
      layer.resourceId = resource.id;
      layer.name = `${layer.name} sin fondo`;
    });
    renderLayers();
    renderAssets();
    renderer.requestRender('bg');
    scheduleSave('bg');
    toast(removed > 0 ? `Fondo eliminado (${removed.toLocaleString('es-ES')} píxeles).` : 'No se detectó un fondo uniforme en las esquinas.', removed ? 'ok' : 'warn');
  } catch (error) {
    toast(`No se pudo quitar el fondo: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function floodCorners(imageData) {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const stack = [];
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  const seed = corners.map(([x, y]) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  });
  let removed = 0;
  const tolerance = 34;
  for (let c = 0; c < corners.length; c += 1) {
    stack.push(corners[c]);
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const index = y * width + x;
      if (visited[index]) continue;
      visited[index] = 1;
      const i = index * 4;
      const [r, g, b] = seed[c];
      const dr = data[i] - r;
      const dg = data[i + 1] - g;
      const db = data[i + 2] - b;
      if (dr * dr + dg * dg + db * db > tolerance * tolerance) continue;
      data[i + 3] = 0;
      removed += 1;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  return removed;
}

async function removeBackgroundAi() {
  const layer = getLayer();
  if (!layer || layer.type !== 'image') { toast('Selecciona una capa de imagen.', 'warn'); return; }
  if (!server.available || !server.writable) { toast('La edición con IA necesita el proxy del servidor.', 'error'); return; }
  const dataUrl = await resourceToDataUrl(layer.resourceId);
  if (!dataUrl) { toast('No se pudo leer la imagen.', 'error'); return; }
  showLoading('Quitando el fondo con IA…', 'Se envía la imagen seleccionada al proveedor.');
  try {
    const job = await generate({
      prompt: 'Elimina por completo el fondo de esta imagen y devuelve solo el sujeto sobre fondo transparente. Todo texto o audio generado debe estar obligatoriamente en español.',
      model: state.ui.model,
      aspect: '1:1',
      images: [dataUrl],
      kind: 'remove-background',
    });
    if (job?.error) throw new Error(job.error);
    pendingResult = { job, dataUrl: job.image.startsWith('data:') ? job.image : `data:${job.mimeType || 'image/png'};base64,${job.image}` };
    showResultPreview(pendingResult);
    toast('Resultado listo: acéptalo para sustituir el fondo sin tocar textos ni logos.', 'ok');
  } catch (error) {
    toast(`No se pudo quitar el fondo: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

/* ── Producto y moda (propuestas) ── */
async function runSceneComposition() {
  const preset = $('scenePreset').value;
  if (!preset) return;
  const layer = getLayer();
  const base = layer?.type === 'image' ? await resourceToDataUrl(layer.resourceId) : null;
  if (!server.available || !server.writable) { toast('Necesita el proxy del servidor y una clave configurada.', 'error'); return; }
  showLoading('Componiendo escenario…', 'Propuesta editable, no una reproducción exacta.');
  try {
    const job = await generate({
      prompt: `Coloca el producto de la imagen en este escenario: ${preset}. Mantén el producto reconocible, con luz y sombras coherentes. Propuesta editable. Todo texto generado debe estar obligatoriamente en español.`,
      model: state.ui.model,
      images: base ? [base] : [],
      kind: 'scene',
    });
    if (job?.error) throw new Error(job.error);
    pendingResult = { job, dataUrl: job.image.startsWith('data:') ? job.image : `data:${job.mimeType || 'image/png'};base64,${job.image}` };
    showResultPreview(pendingResult);
  } catch (error) {
    toast(`No se pudo componer: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

async function runTryOn() {
  const garment = $('garmentPrompt').value.trim();
  if (!garment) { toast('Describe la prenda.', 'warn'); return; }
  const layer = getLayer();
  const base = layer?.type === 'image' ? await resourceToDataUrl(layer.resourceId) : null;
  showLoading('Probando la prenda…', 'Propuesta editable; revisa el resultado antes de publicar.');
  try {
    const job = await generate({
      prompt: `Viste a la persona de la imagen con: ${garment}. Conserva la pose y la iluminación. Es una propuesta editable: no garantiza fidelidad exacta de la prenda. Todo texto generado debe estar obligatoriamente en español.`,
      model: state.ui.model,
      images: base ? [base] : [],
      kind: 'try-on',
    });
    if (job?.error) throw new Error(job.error);
    pendingResult = { job, dataUrl: job.image.startsWith('data:') ? job.image : `data:${job.mimeType || 'image/png'};base64,${job.image}` };
    showResultPreview(pendingResult);
  } catch (error) {
    toast(`No se pudo probar la prenda: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

/* ══════════════════════ Exportación ══════════════════════ */
function bindExport() {
  $$('#exportFormat .seg').forEach((button) => {
    button.addEventListener('click', () => {
      $$('#exportFormat .seg').forEach((seg) => {
        const active = seg === button;
        seg.classList.toggle('is-active', active);
        seg.setAttribute('aria-pressed', String(active));
      });
      updateExportOptions();
    });
  });
  ['exportQuality', 'exportScale', 'exportDpi', 'exportBg', 'exportTransparent'].forEach((id) => {
    $(id).addEventListener('input', updateExportOptions);
    $(id).addEventListener('change', updateExportOptions);
  });
  $('doExportBtn').addEventListener('click', doExport);
  $('copyBtn').addEventListener('click', async () => {
    try {
      const options = exportOptions();
      await copyToClipboard(options);
      toast('Imagen copiada al portapapeles.', 'ok');
    } catch (error) {
      toast(`No se pudo copiar: ${error.message}`, 'error');
    }
  });
  $$('[data-close]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.close)));
  $$('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) closeModal(backdrop.id);
    });
  });
}

function openExport() {
  if (!state.doc || !state.doc.layers.length) {
    toast('Añade al menos una capa antes de exportar.', 'warn');
    return;
  }
  updateExportOptions();
  openModal('exportModal');
}

function exportOptions() {
  const format = $$('#exportFormat .seg').find((seg) => seg.classList.contains('is-active'))?.dataset.format || 'image/png';
  const scale = Number($('exportScale').value) || 1;
  return {
    format,
    scale,
    quality: Number($('exportQuality').value) / 100,
    dpi: Number($('exportDpi').value) || 72,
    background: $('exportTransparent').checked ? 'transparent' : $('exportBg').value,
    transparent: $('exportTransparent').checked,
  };
}

let exportPreviewTimer = 0;
function updateExportOptions() {
  const options = exportOptions();
  const jpeg = options.format === 'image/jpeg';
  $('qualityField').style.display = options.format === 'image/png' ? 'none' : 'block';
  $('exportQualityValue').textContent = `${Math.round(options.quality * 100)} %`;
  $('bgField').style.display = jpeg ? 'block' : 'none';
  $('exportTransparent').disabled = jpeg;
  if (jpeg) $('exportTransparent').checked = false;
  $('exportQuality').disabled = options.format === 'image/png';

  const estimate = estimateExport(options);
  $('exportDims').textContent = estimate.label;
  $('exportSummary').textContent = [
    `Formato: ${jpeg ? 'JPG' : options.format === 'image/webp' ? 'WebP' : 'PNG'}`,
    `Dimensiones: ${estimate.width} × ${estimate.height} px`,
    jpeg ? 'Transparencia: sustituida por el fondo elegido' : 'Transparencia: conservada',
    `Resolución: ${options.dpi} ppp (metadatos)`,
  ].join('\n');
  $('exportSummary').style.whiteSpace = 'pre-line';

  let notice = '';
  if (options.format === 'image/webp') {
    const supported = typeof document.createElement('canvas').toBlob === 'function';
    notice = supported
      ? 'WebP se codifica en el navegador. El DPI no se escribe en WebP: las dimensiones en píxeles son las del documento.'
      : 'Este navegador no admite WebP.';
  } else if (jpeg) {
    notice = 'JPG no admite transparencia: se aplicará el fondo elegido.';
  } else {
    notice = 'PNG conserva la transparencia y escribe la resolución (chunk pHYs) con el DPI indicado.';
  }
  const noticeNode = $('exportNotice');
  noticeNode.textContent = notice;
  noticeNode.className = 'notice notice-info';

  clearTimeout(exportPreviewTimer);
  exportPreviewTimer = window.setTimeout(async () => {
    try {
      const preview = await exportImage({ ...options, scale: Math.min(options.scale, 0.5), quality: 0.7, dpi: options.dpi });
      if (lastExportUrl) URL.revokeObjectURL(lastExportUrl);
      lastExportUrl = URL.createObjectURL(preview.blob);
      $('exportPreviewImg').src = lastExportUrl;
    } catch { /* la vista previa es opcional */ }
  }, 220);
}

async function doExport() {
  const options = exportOptions();
  const button = $('doExportBtn');
  button.disabled = true;
  try {
    const result = await downloadExport(options);
    toast(`Exportado ${result.width} × ${result.height} · ${fmtBytes(result.blob.size)}.`, 'ok');
    closeModal('exportModal');
  } catch (error) {
    toast(`No se pudo exportar: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

/* ══════════════════════ Proyectos ══════════════════════ */
function bindProjectActions() {
  $('newProjectBtn').addEventListener('click', async () => {
    closeModal('projectModal');
    const name = `Proyecto ${new Date().toLocaleDateString('es-ES')}`;
    startNewProject({ blank: true, name });
    setEmptyState(true);
    await saveNow('new-project');
    toast('Proyecto nuevo creado.', 'ok');
  });
  on('project:open', async ({ id }) => {
    closeModal('projectModal');
    try { await openProject(id); } catch (error) { toast(error.message, 'error'); }
  });
  on('project:delete', async ({ id }) => {
    const ok = await confirmDialog({ title: 'Eliminar proyecto', text: 'Esta acción borra el proyecto y sus versiones de este navegador. No se puede deshacer.', okLabel: 'Eliminar', danger: true });
    if (!ok) return;
    await deleteProject(id);
    await refreshProjectLists();
    toast('Proyecto eliminado.', 'ok');
  });
  on('version:restore', async ({ version }) => {
    const ok = await confirmDialog({ title: 'Restaurar versión', text: `¿Sustituir el documento actual por «${version.label}»? Podrás deshacerlo.`, okLabel: 'Restaurar' });
    if (!ok) return;
    let doc = version.doc;
    if (!doc) {
      try {
        doc = await fetchVersionDoc(version.id);
      } catch (error) {
        toast(error.message, 'error');
        return;
      }
    }
    mutate('restaurar versión', () => {
      state.doc = structuredClone(doc);
      state.selection.layerId = state.doc.layers.at(-1)?.id || null;
    });
    resetHistory();
    renderLayers();
    renderer.fit();
    updateViewportUI(state.ui.zoom);
    scheduleSave('restore');
    toast('Versión restaurada.', 'ok');
  });
  on('recipe:apply', ({ recipe }) => applyRecipe(recipe));
  on('recipe:delete', ({ recipe }) => {
    state.ui.recipes = state.ui.recipes.filter((item) => item.id !== recipe.id);
    localStorage.setItem('uis:recipes', JSON.stringify(state.ui.recipes));
    renderRecipes(state.ui.recipes);
    toast('Receta eliminada.', 'ok');
  });
  on('save:conflict', async ({ server: data }) => {
    const keep = await confirmDialog({
      title: 'Conflicto de versiones',
      text: 'Otra pestaña o dispositivo ha guardado una versión más reciente. ¿Quieres conservar la tuya y sobrescribir, o prefieres descargar tu proyecto antes de recargar?',
      okLabel: 'Conservar la mía',
    });
    if (!keep) {
      toast('Se conserva tu copia local. Descarga el proyecto si quieres conservarla al recargar.', 'warn', { duration: 9000 });
      return;
    }
    try {
      const saved = await server.call('project.save', {
        project: { id: state.project.id, name: state.project.name },
        doc: state.doc,
        baseVersion: data?.version ?? state.project.version,
        force: true,
      });
      state.project.version = saved?.version ?? state.project.version;
      setSaveState('saved');
      toast('Versión sobrescrita.', 'ok');
    } catch (error) {
      toast(`No se pudo sobrescribir: ${error.message}`, 'error');
    }
  });
}

async function openProjectsModal() {
  await refreshProjectLists();
  openModal('projectModal');
}

async function refreshProjectLists() {
  const projects = await listProjects();
  renderProjects(projects, 'projectList', 6);
  renderProjects(projects, 'projectModalList', 50);
}

async function duplicateCurrentProject() {
  if (!state.doc) return;
  const name = `${state.project?.name || 'Proyecto'} (copia)`;
  const doc = structuredClone(state.doc);
  doc.id = uid('doc');
  doc.name = name;
  const previousProject = state.project;
  void previousProject;
  state.project = createProject(name, doc);
  state.doc = doc;
  resetHistory();
  renderLayers();
  renderAssets();
  updateTopbar();
  await saveNow('duplicate-project');
  toast('Proyecto duplicado.', 'ok');
}

/* ══════════════════════ Recetas ══════════════════════ */
function loadRecipes() {
  try {
    const raw = localStorage.getItem('uis:recipes');
    state.ui.recipes = raw ? JSON.parse(raw) : [];
  } catch { state.ui.recipes = []; }
  return state.ui.recipes;
}

function saveRecipe() {
  const name = $('recipeName').value.trim();
  if (!name) { toast('Ponle un nombre a la receta.', 'warn'); return; }
  const recipe = {
    id: uid('rec'),
    name,
    model: state.ui.model,
    aspect: $('aspectSelect').value,
    resolution: Number($('resolutionSelect').value),
    prompt: $('promptInput').value.slice(0, 2000),
    refs: state.ui.refs.map((ref) => ({ role: ref.role })),
    at: Date.now(),
  };
  state.ui.recipes = [recipe, ...state.ui.recipes].slice(0, 24);
  localStorage.setItem('uis:recipes', JSON.stringify(state.ui.recipes));
  renderRecipes(state.ui.recipes);
  $('recipeName').value = '';
  toast('Receta guardada.', 'ok');
}

function applyRecipe(recipe) {
  setActiveModel(recipe.model);
  $('aspectSelect').value = recipe.aspect;
  $('resolutionSelect').value = String(recipe.resolution);
  state.ui.aspect = recipe.aspect;
  state.ui.resolution = recipe.resolution;
  if (recipe.prompt) {
    $('promptInput').value = recipe.prompt;
    $('promptCount').textContent = `${recipe.prompt.length} / ${LIMITS.maxPrompt.toLocaleString('es-ES')}`;
  }
  toast(`Receta «${recipe.name}» aplicada.`, 'ok');
}

/* ══════════════════════ Presupuesto ══════════════════════ */
async function openBudgetModal() {
  const budget = await fetchBudget();
  if (budget) {
    $('budgetSession').value = String(budget.sessionLimit ?? 5);
    $('budgetProject').value = String(budget.projectLimit ?? 20);
    $('budgetOperation').value = String(budget.operationLimit ?? 1.5);
  }
  openModal('budgetModal');
}

async function saveBudgetFromModal() {
  if (!server.available || !server.writable) {
    toast('El presupuesto se guarda en el servidor: no está disponible en modo local.', 'error');
    return;
  }
  try {
    const budget = await saveBudget({
      sessionLimit: Number($('budgetSession').value),
      projectLimit: Number($('budgetProject').value),
      operationLimit: Number($('budgetOperation').value),
    });
    state.ui.budget = budget;
    updateTopbar();
    closeModal('budgetModal');
    toast('Presupuesto guardado. Se comprueba en el servidor antes de cada envío.', 'ok');
  } catch (error) {
    toast(`No se pudo guardar: ${error.message}`, 'error');
  }
}

async function refreshBudget() {
  const budget = await fetchBudget();
  if (!budget) return;
  state.ui.budget = budget;
  state.ui.spent = budget.projectSpent || 0;
  updateTopbar();
}

/* ══════════════════════ Persistencia y atajos ══════════════════════ */
function bindPersistence() {
  on('doc:change', () => { scheduleSave('doc'); updateTopbar(); });
  on('save:state', ({ state: value, at }) => updateSaveState(value, { at }));
  window.addEventListener('beforeunload', (event) => {
    if (!state.flags.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

function bindShortcuts() {
  window.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) return;
    const meta = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (event.key === 'Escape') {
      if (closeTopModal()) return;
      if (state.ui.compare) toggleCompare();
      selectLayer(null);
      return;
    }
    if (meta && key === 'z' && !event.shiftKey) { event.preventDefault(); if (undo()) afterHistory(); return; }
    if (meta && key === 'z' && event.shiftKey) { event.preventDefault(); if (redo()) afterHistory(); return; }
    if (meta && key === 'y') { event.preventDefault(); if (redo()) afterHistory(); return; }
    if (meta && key === 's') { event.preventDefault(); saveNow('manual').then(() => toast('Guardado.', 'ok')); return; }
    if (meta && key === 'e') { event.preventDefault(); openExport(); return; }
    if (meta && key === 'o') { event.preventDefault(); openProjectsModal(); return; }
    if (meta && key === 'd') { event.preventDefault(); const layer = getLayer(); if (layer) { mutate('duplicar capa', () => duplicateLayer(layer.id)); renderLayers(); } return; }

    if (event.key === '+' || event.key === '=') { renderer.zoomBy(1.2); updateViewportUI(state.ui.zoom); return; }
    if (event.key === '-') { renderer.zoomBy(0.83); updateViewportUI(state.ui.zoom); return; }
    if (event.key === '0') { renderer.fit(); updateViewportUI(state.ui.zoom); return; }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelectedLayer(); return; }

    const shortcuts = {
      v: 'select', b: 'mask', t: 'text', r: 'shape', h: 'hand', e: 'mask',
    };
    if (!meta && event.shiftKey && (event.key === '!' || event.key === '1')) { renderer.fit(); updateViewportUI(state.ui.zoom); return; }
    if (!meta && event.shiftKey && event.key === '@') { renderer.actualSize(); updateViewportUI(state.ui.zoom); return; }
    if (!meta && shortcuts[key] && !event.shiftKey) {
      setTool(shortcuts[key]);
      setToolUI(shortcuts[key]);
      if (key === 'e') { state.ui.maskMode = 'erase'; switchLeftTab('edit'); }
      return;
    }
    if (!meta && key === 'c') { toggleCompare(); return; }
  });
}

/* ══════════════════════ Varios ══════════════════════ */
function bindMisc() {
  $('loginBtn').addEventListener('click', submitLogin);
  $('loginPassword').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submitLogin();
  });
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (window.innerWidth > 1100) closePanels();
      if (state.ui.fit) {
        renderer.fit();
        updateViewportUI(state.ui.zoom);
      } else {
        renderer.requestRender('resize');
      }
    }, 140);
  });
  $('saveBudgetBtn').addEventListener('click', saveBudgetFromModal);
  $('doCropBtn').addEventListener('click', applyCrop);
  $('doResizeBtn').addEventListener('click', applyResize);
  $('resizeKeepRatio').addEventListener('change', () => {});
  $('budgetModal').addEventListener('click', (event) => { if (event.target.id === 'budgetModal') closeModal('budgetModal'); });
  document.addEventListener('uis:view', ({ detail }) => updateViewportUI(detail.zoom));
  onJob((job) => {
    if (!job) return;
    if (job.status === 'running' || job.status === 'queued') {
      $('loadingSecondary').textContent = job.progressText || 'El proveedor está procesando la solicitud.';
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') document.body.classList.add('using-keyboard');
  });
}

/** Acceso siempre a mano: candado de la barra y estado de la barra inferior. */
async function openAuth() {
  if (server.available && server.writable) {
    const out = await confirmDialog({
      title: 'Sesión iniciada',
      text: 'Tienes sesión en el servidor privado. ¿Quieres cerrarla? La app seguirá funcionando en modo local.',
      okLabel: 'Cerrar sesión',
      danger: true,
    });
    if (!out) return;
    try { await server.call('logout', {}); } catch { /* la cookie puede haber caducado */ }
    server.writable = false;
    state.ui.mode = 'auth';
    updateTopbar();
    toast('Sesión cerrada.', 'ok');
    return;
  }
  $('loginError').textContent = server.available
    ? ''
    : 'El servidor PHP no responde, por eso no aparece solo. Comprueba api.php?action=state en el navegador.';
  openModal('loginModal');
  setTimeout(() => $('loginPassword').focus(), 60);
}

async function retryServerConnection() {
  $('loginError').textContent = 'Comprobando el servidor…';
  const probe = await server.probe();
  if (probe?.ok) {
    $('loginError').textContent = '';
    await loadCatalog();
    updateTopbar();
    if (probe.authenticated) {
      closeModal('loginModal');
      toast('Sesión ya activa en el servidor privado.', 'ok');
    } else {
      toast('Servidor disponible: introduce la contraseña.', 'ok');
    }
  } else {
    $('loginError').textContent = 'Sigue sin responder. Abre api.php?action=state en el navegador para ver el error exacto.';
  }
}

async function submitLogin() {
  const password = $('loginPassword').value;
  $('loginError').textContent = '';
  if (!password) { $('loginError').textContent = 'Escribe la contraseña.'; return; }
  const button = $('loginBtn');
  button.disabled = true;
  try {
    await server.call('login', { password }, { timeout: 15000 });
    const probe = await server.probe();
    if (!probe?.authenticated) throw new Error('La sesión no se ha establecido.');
    closeModal('loginModal');
    $('loginPassword').value = '';
    await loadCatalog();
    await refreshBudget();
    updateTopbar();
    toast('Sesión iniciada: guardado y generación disponibles en el servidor.', 'ok');
  } catch (error) {
    $('loginError').textContent = error.status === 401 ? 'Contraseña incorrecta.' : error.message;
  } finally {
    button.disabled = false;
  }
}

function updateUtilities() {
  const doc = state.doc;
  if (!doc) return;
  $('utilDims').textContent = `${doc.width} × ${doc.height} px`;
  $('utilLayers').textContent = `${doc.layers.length}`;
  $('utilDpi').textContent = `${doc.dpi || 300} ppp`;
  const inchesW = (doc.width / (doc.dpi || 300)).toFixed(2);
  const inchesH = (doc.height / (doc.dpi || 300)).toFixed(2);
  $('utilPhysical').textContent = `${inchesW} × ${inchesH} in · ${(inchesW * 2.54).toFixed(1)} × ${(inchesH * 2.54).toFixed(1)} cm`;
  $('dpiValue').textContent = String(doc.dpi || 300);
  $('dpiInput').value = String(doc.dpi || 300);
}

async function showDiagnostics() {
  const info = await storageInfo();
  const pending = await recoverPendingJobs();
  const lines = [
    `Versión: ${BUILD}`,
    `Modo: ${info.mode}`,
    `Servidor: ${info.server ? (info.writable ? 'conectado y autorizado' : 'conectado, sin sesión') : 'no disponible'}`,
    `Proyectos locales: ${info.projects}`,
    `Caché: ${fmtBytes(info.used)}${info.quota ? ` / ${fmtBytes(info.quota)}` : ''}`,
    `Trabajos pendientes en servidor: ${pending.length}`,
    `Catálogo de precios: ${catalog.pricingConfigured ? 'configurado' : 'no configurado'}`,
    `Motor de render: ${renderer.view.width}×${renderer.view.height} px (${renderer.renderScale.toFixed(2)}×)`,
    `Último guardado: ${state.flags.lastSavedAt ? fmtDate(state.flags.lastSavedAt) : '—'}`,
  ];
  toast(lines.join(' · '), 'info', { duration: 14000 });
  paintStorageInfo(info);
}

/* ══════════════════════ Eventos globales ══════════════════════ */
on('layers:change', () => { renderLayers(); renderAssets(); });
on('selection:change', () => {
  renderLayers();
  renderer.requestRender('selection');
  updateTopbar();
});
on('layer:geometry', () => {
  renderLayerProps();
  $('statusSelection').textContent = getLayer()?.name || 'Sin selección';
});
on('save:conflict', () => {});

document.addEventListener('DOMContentLoaded', () => {
  boot().catch((error) => {
    console.error(error);
    toast(`Error al iniciar: ${error.message}`, 'error', { duration: 12000 });
  });
  document.addEventListener('uis:tab', (event) => switchLeftTab(event.detail.tab));
  setInterval(() => { if (state.flags.dirty && !state.ui.saving) scheduleSave('interval', 0); }, 30000);
  setInterval(updateUtilities, 4000);
});

// Exponer un mínimo para depuración en consola (sin datos sensibles).
window.__UIS__ = { state, renderer, importFiles, saveNow, exportImage, build: BUILD };
