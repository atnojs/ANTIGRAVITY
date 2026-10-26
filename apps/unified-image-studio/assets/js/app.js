/* ============================================================
   app.js — orquestador de la aplicación
   ============================================================ */

import {
  state, emit, on, uid, clamp, getLayer, getResource, addResource, imageFor,
  createDoc, createProject, makeImageLayer, makeTextLayer, makeShapeLayer,
  addLayer, removeLayer, duplicateLayer, reorderLayer, selectLayer, mutate,
  undo, redo, markDirty, resetHistory, pushHistory, LIMITS, fmtBytes, fmtDate,
  deserializeProject, dataUrlToBlob, serializeProject,
} from './core.js?v=12';
import { renderer } from './render.js?v=12';
import { initTools, setTool } from './tools.js?v=12';
import {
  $, $$, el, toast, openModal, closeModal, closeTopModal, anyModalOpen, confirmDialog,
  showLoading, hideLoading, updateTopbar, updateSaveState, updateViewportUI, setEmptyState,
  renderLayers, renderLayerProps, renderRefs, renderVersions, renderProjects, renderAssets,
  renderRecipes, setActiveModel, switchLeftTab, switchRightTab, setToolUI, paintStorageInfo,
} from './ui.js?v=12';
import {
  server, saveNow, scheduleSave, listProjects, loadProject, deleteProject, saveVersion,
  listVersions, deleteVersion, storageInfo, clearLocalCache, uploadResource, lastProjectId, idb,
  fetchVersionDoc,
} from './persist.js?v=12';
import {
  downloadExport, copyToClipboard, downloadProject, exportImage, canvasToBlob, estimateExport,
} from './exporter.js?v=12';
import {
  MODELS, modelById, loadCatalog, catalog, generate,
  recoverPendingJobs, resumeJob, resourceToDataUrl, clearDataUrlCache, onJob, currentJob,
} from './ai.js?v=12';
import {
  FLOW_IMAGE_MODELS, FLOW_VIDEO_MODELS, FLOW_IMAGE_RATIOS, FLOW_VIDEO_RATIOS,
  DEFAULT_FLOW_IMAGE_MODEL, DEFAULT_FLOW_VIDEO_MODEL,
  flowState, isFlowModel, refreshFlowState, listFlowJobs, createFlowImage, createFlowVideo,
  statusFlowJobs, retryFlowJob, deleteFlowJob, downloadFlowJob, fetchFlowBlob,
} from './flow.js?v=12';

const stageInner = $('stageInner');
const canvasWrap = $('canvasWrap');

/** Sello de versión: se muestra en la ayuda y en la consola para saber qué build corre. */
const BUILD = 'v1.4.0 · 2026-10-23 · recursos verificados';

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
  bindFlowUI();
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
  // El límite real lo manda el servidor: aceptar 20 MB contra un post_max_size
  // de 8 MB hacía fallar la subida sin ningún aviso.
  if (Number.isFinite(probe?.maxImageBytes) && probe.maxImageBytes > 0) {
    LIMITS.maxFileBytes = Math.min(LIMITS.maxFileBytes, probe.maxImageBytes);
  }
  const uploadHint = document.querySelector('.empty-hint');
  if (uploadHint) uploadHint.textContent = `Máx. ${fmtBytes(LIMITS.maxFileBytes)} · 8192 px de lado`;
  if (probe && !probe.authenticated) {
    if (probe.configured) {
      toast('Introduce la contraseña para trabajar con el servidor privado. Mientras tanto la app funciona en local.', 'info', { duration: 8000 });
      openModal('loginModal');
      $('loginPassword').focus();
    } else {
      toast('El servidor no tiene contraseña configurada (.htaccess: PW_ACCESS). Se trabajará en modo local.', 'warn', { duration: 9000 });
    }
  } else if (!probe) {
    toast('Servidor PHP no disponible: la app funciona en local con IndexedDB. La generación con IA requiere el servidor.', 'info', { duration: 8000 });
  }
  await loadCatalog();
  updateTopbar();
  await refreshFlowState();
  paintFlowAgent();

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
  // Arranque completado: el vigilante ya no debe mostrar el aviso.
  if (window.__UIS_DIAG__) window.__UIS_DIAG__.started = true;
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
    if (mime === 'image/gif') {
      toast(`«${original.name}»: los GIF no se admiten. Exporta el fotograma como PNG o WebP.`, 'error', { duration: 8000 });
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
    // Subida al servidor: si falla, se dice. Nunca un recurso fantasma que el
    // proyecto referencie y que en otro dispositivo no exista.
    if (server.available && server.writable) {
      try {
        await uploadResource(resource);
      } catch (error) {
        const reason = String(error.message || '').replace(/\.\s*$/, '');
        toast(`«${original.name}» está en el lienzo, pero no se ha podido guardar en el servidor: ${reason}. Se reintentará al guardar.`, 'error', { duration: 11000 });
      }
    }

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
      // Elegir una herramienta de imagen devuelve a la sección Imagen.
      if (flowUi.mode !== 'image') setMode('image');
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

  // Solo los botones del selector de imagen: los de vídeo y los filtros de la
  // biblioteca comparten la clase de estilo pero tienen su propio manejador.
  $$('#modelSelector .model-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveModel(button.dataset.model);
      syncFlowControls();
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

  const selected = modelById(state.ui.model);
  const isFlow = selected?.provider === 'flow';

  try {
    if (isFlow) {
      // Motor Flow: se encola en el servidor y lo ejecuta el PC.
      await runFlowImage({
        prompt,
        model: state.ui.model,
        ratio: $('aspectSelect').value,
        images,
        mode: images.length ? 'edit' : 'generate',
      });
      return;
    }

    showLoading('IA generando imagen…', 'Enviando la solicitud al proveedor. No cierres esta pestaña.');
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
    updateTopbar();
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

/* ══════════════════════ Presupuesto (retirado) ══════════════════════
   La interfaz de costes, saldos y límites en euros se ha retirado del
   estudio: la generación con Flow no cobra por la app. El servidor sigue
   protegiendo los proveedores de pago con sus propios límites técnicos. */

/* ══════════════════════ Google Flow: seguimiento no bloqueante ══════════════════════
   Encolar es instantáneo; la generación la hace el PC y puede tardar minutos.
   La interfaz NO se bloquea: un aviso compacto informa del avance y el usuario
   puede seguir trabajando, cambiar de sección o cerrar la pestaña. */

const flowWatch = {
  ids: new Set(),
  jobs: new Map(),
  timer: 0,
};

function paintFlowProgress() {
  const box = $('flowProgress');
  if (!box) return;
  const jobs = [...flowWatch.jobs.values()];
  const active = jobs.filter((job) => job.status === 'queued' || job.status === 'running');
  if (!active.length) {
    box.classList.add('hidden');
    box.setAttribute('aria-busy', 'false');
    return;
  }
  const running = active.filter((job) => job.status === 'running');
  const total = jobs.length;
  const done = jobs.filter((job) => job.status === 'done').length;
  const label = running.length
    ? `Generando ${running.length === 1 ? (running[0].type === 'video' ? 'vídeo' : 'imagen') : `${running.length} trabajos`} en tu PC…`
    : `En cola: esperando a que el PC recoja ${active.length === 1 ? 'el trabajo' : 'los trabajos'}…`;
  const extra = total > 1 ? ` (${done}/${total} listos)` : '';
  $('flowProgressText').textContent = label + extra;
  box.classList.remove('hidden');
  box.setAttribute('aria-busy', 'true');
}

/** Sigue un grupo de trabajos en segundo plano; avisa al terminar. */
function watchFlowJobs(ids, { source = 'image', autoPreview = false } = {}) {
  for (const id of ids) {
    flowWatch.ids.add(id);
    // Estado provisional: el aviso aparece al instante, sin esperar al sondeo.
    if (!flowWatch.jobs.has(id)) {
      flowWatch.jobs.set(id, { id, status: 'queued', type: source === 'video' ? 'video' : 'image' });
    }
  }
  paintFlowProgress();
  if (flowWatch.timer) return;
  const tick = async () => {
    flowWatch.timer = 0;
    const pendingIds = [...flowWatch.ids];
    if (!pendingIds.length) { paintFlowProgress(); return; }
    let jobs = [];
    try {
      jobs = await statusFlowJobs(pendingIds);
    } catch {
      // Un fallo de consulta no reenvía ni cancela: se reintenta en el próximo ciclo.
      flowWatch.timer = window.setTimeout(tick, 6000);
      return;
    }
    for (const job of jobs) {
      const before = flowWatch.jobs.get(job.id)?.status;
      flowWatch.jobs.set(job.id, job);
      if (before !== job.status) {
        if (job.status === 'done') {
          flowWatch.ids.delete(job.id);
          toast(`${job.type === 'video' ? 'Vídeo' : 'Imagen'} listo: ${job.id.slice(0, 8)}. Está en Biblioteca.`, 'ok');
          void refreshLibrary();
          if (autoPreview && job.type === 'image' && source === 'image') showFlowPreview(job);
        } else if (job.status === 'failed') {
          flowWatch.ids.delete(job.id);
          toast(job.error || 'Un trabajo de Flow falló. Revisa Biblioteca para reintentarlo.', 'error', { duration: 10000 });
          void refreshLibrary();
        } else if (job.status === 'unknown') {
          flowWatch.ids.delete(job.id);
          toast('El PC dejó de responder. El trabajo queda pendiente de comprobar en Biblioteca: no se ha reenviado.', 'warn', { duration: 12000 });
          void refreshLibrary();
        }
      }
    }
    paintFlowProgress();
    if (flowWatch.ids.size) {
      flowWatch.timer = window.setTimeout(tick, 3500);
    } else {
      void refreshFlowState().then(paintFlowAgent);
      // La lista se refresca una vez más para reflejar el estado final.
      void refreshLibrary();
    }
  };
  flowWatch.timer = window.setTimeout(tick, 2500);
}

/** Muestra el resultado de una imagen de Flow como vista previa aplicable. */
async function showFlowPreview(job) {
  try {
    const blob = await fetchFlowBlob(job);
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    });
    pendingResult = { job, dataUrl, flow: true };
    showResultPreview(pendingResult);
  } catch { /* la vista previa es opcional: el resultado ya está en Biblioteca */ }
}

/* ══════════════════════ Google Flow (imagen y vídeo) ══════════════════════ */
const flowUi = {
  mode: 'image',
  videoModel: DEFAULT_FLOW_VIDEO_MODEL,
  videoRatio: '16:9',
  startFrame: null,      // data URL del fotograma inicial de vídeo
  libraryFilter: 'all',
  watching: new Set(),   // ids en seguimiento para no lanzar dos esperas
  lastImageJob: null,
};

/** Cambia de sección sin perder el trabajo en curso. */
function setMode(mode) {
  if (!['image', 'video', 'library'].includes(mode)) return;
  flowUi.mode = mode;
  for (const button of $$('#modeNav .mode-btn')) {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  }
  // El rail conserva su columna en la rejilla: ocultarlo dejaba el panel de
  // herramientas en un hueco de 84 px y el texto se partía palabra a palabra.
  $('rail').classList.toggle('is-inactive', mode !== 'image');
  if (mode === 'image') {
    switchLeftTab('generate');
  } else if (mode === 'video') {
    switchLeftTab('video');
    openLeftPanel();
    void refreshFlowState().then(paintFlowAgent);
    void refreshLibrary();
  } else {
    switchLeftTab('library');
    openLeftPanel();
    void refreshFlowState().then(paintFlowAgent);
    void refreshLibrary();
  }
  document.body.dataset.mode = mode;
}

/** En móvil, las secciones Vídeo y Biblioteca viven en el cajón izquierdo:
    hay que abrirlo o el usuario pulsa «Vídeo» y no ve nada. */
function openLeftPanel() {
  if (window.innerWidth > 1100) return;
  const app = $('app');
  app.classList.add('is-left-open');
  app.classList.remove('is-right-open');
  $('railToggle').setAttribute('aria-expanded', 'true');
  syncPanelBackdrop();
}

/** Pinta el estado del PC que ejecuta Flow en la tarjeta del panel y en la barra. */
function paintFlowAgent() {
  const online = flowState.workerOnline;
  const configured = flowState.agentConfigured;
  const text = $('flowStatusText');
  const dot = $('flowStatus').querySelector('.dot');
  let label = 'Flow: sin conexión';
  let detail = 'El PC con Google Flow no está conectado. Puedes encolar igualmente: el trabajo espera a que se conecte.';
  if (!server.available) {
    label = 'Flow: sin servidor';
    detail = 'El servidor PHP no responde, así que no se puede encolar nada. Revisa api.php?action=state.';
  } else if (!configured) {
    label = 'Flow: sin credencial';
    detail = 'Falta la credencial del agente en el servidor (storage/flow-agent.json o UIS_FLOW_AGENT_TOKEN).';
  } else if (online) {
    label = `Flow: conectado${flowState.pending ? ` · ${flowState.pending} en cola` : ''}`;
    detail = `Última señal del PC: ${formatFlowSeen(flowState.workerSeen)}. Los trabajos se ejecutan en tu PC.`;
  }
  if (text) text.textContent = label;
  if (dot) {
    dot.classList.toggle('is-online', online);
    dot.classList.toggle('is-offline', !online);
  }
  const statusCard = $('flowAgentCard');
  if (statusCard) {
    $('flowAgentTitle').textContent = online ? 'PC conectado' : (configured ? 'PC desconectado' : 'Credencial pendiente');
    $('flowAgentText').textContent = detail;
  }
  const card = $('flowStatus');
  if (card) card.title = detail;
}

function formatFlowSeen(seconds) {
  if (!seconds) return 'nunca';
  const diff = Math.max(0, Math.round(Date.now() / 1000 - seconds));
  if (diff < 60) return `hace ${diff} s`;
  if (diff < 3600) return `hace ${Math.round(diff / 60)} min`;
  return `hace ${Math.round(diff / 3600)} h`;
}

/** Etiqueta legible del estado de un trabajo. */
function flowStatusLabel(job) {
  const map = {
    queued: 'En cola',
    running: 'Generando',
    done: 'Listo',
    failed: 'Falló',
    unknown: 'Pendiente de comprobar',
  };
  return map[job.status] || job.status;
}

/** Anima una imagen existente: la imagen pasa a ser el fotograma inicial del vídeo. */
async function animateImage(dataUrl, { jump = true } = {}) {
  if (!dataUrl) { toast('No hay ninguna imagen que animar.', 'warn'); return; }
  flowUi.startFrame = dataUrl;
  paintStartFrame();
  if (jump) {
    setMode('video');
    $('videoPrompt').focus();
    toast('Imagen cargada como fotograma inicial. Escribe el movimiento y pulsa generar.', 'ok');
  }
}

function paintStartFrame() {
  const img = $('videoStartThumb');
  const empty = $('videoStartEmpty');
  const clear = $('videoStartClear');
  if (flowUi.startFrame) {
    img.src = flowUi.startFrame;
    img.classList.remove('hidden');
    empty.classList.add('hidden');
    clear.classList.remove('hidden');
  } else {
    img.src = '';
    img.classList.add('hidden');
    empty.classList.remove('hidden');
    clear.classList.add('hidden');
  }
}

/** Pide un archivo de imagen para usarlo como fotograma inicial. */
function pickStartFrame() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > LIMITS.maxFileBytes) {
      toast(`La imagen pesa ${fmtBytes(file.size)} y el máximo es ${fmtBytes(LIMITS.maxFileBytes)}.`, 'error');
      return;
    }
    const url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    }).catch((error) => { toast(error.message, 'error'); return ''; });
    if (url) { flowUi.startFrame = url; paintStartFrame(); }
  });
  input.click();
}

/** Usa el lienzo actual como fotograma inicial (sin descargar ni volver a subir). */
function useCanvasAsStartFrame() {
  if (!state.doc?.layers?.length) {
    toast('El lienzo está vacío: importa o genera una imagen primero.', 'warn');
    return;
  }
  const canvas = renderer.compositeToCanvas({ width: state.doc.width, height: state.doc.height });
  animateImage(canvas.toDataURL('image/png'));
}

/** Encola una imagen con Flow. Devuelve al instante: el seguimiento es en segundo plano. */
async function runFlowImage({ prompt, model, ratio, images, count = 1, mode = 'generate' }) {
  const jobs = await createFlowImage({ prompt, model, ratio, images, count, mode });
  const ids = jobs.map((job) => job.id);
  flowUi.lastImageJob = ids[0] || null;
  toast(ids.length > 1
    ? `${ids.length} variantes encoladas. Se generan en tu PC; puedes seguir trabajando.`
    : 'Trabajo encolado en tu PC. Puedes seguir trabajando o cerrar la pestaña.', 'ok');
  watchFlowJobs(ids, { source: 'image', autoPreview: true });
  return ids;
}

/** Genera el vídeo: fotograma inicial opcional (modo Fotogramas de Flow). */
async function runFlowVideo() {
  const prompt = $('videoPrompt').value.trim();
  if (!prompt) { toast('Describe el vídeo antes de generar.', 'warn'); $('videoPrompt').focus(); return; }
  if (!server.available || !server.writable) {
    toast('Para encolar vídeos necesitas sesión en el servidor privado.', 'error');
    return;
  }
  const button = $('videoGenerateBtn');
  if (button?.disabled) return;
  if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
  try {
    const jobs = await createFlowVideo({
      prompt,
      model: flowUi.videoModel,
      ratio: flowUi.videoRatio,
      images: flowUi.startFrame ? [flowUi.startFrame] : [],
    });
    const ids = jobs.map((job) => job.id);
    toast('Vídeo encolado. Puedes cerrar la pestaña: seguirá en la cola.', 'ok');
    watchFlowJobs(ids, { source: 'video' });
    flowUi.startFrame = null;
    paintStartFrame();
  } catch (error) {
    toast(`No se pudo encolar el vídeo: ${error.message}`, 'error', { duration: 9000 });
  } finally {
    if (button) {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }
}

/** Refresca la lista de resultados de Flow en Biblioteca. */
async function refreshLibrary() {
  if (!server.available) return;
  const jobs = await listFlowJobs(flowUi.libraryFilter === 'all' ? '' : flowUi.libraryFilter);
  renderFlowJobs(jobs);
}

function renderFlowJobs(jobs) {
  const grid = $('flowJobs');
  const empty = $('flowJobsEmpty');
  if (!grid) return;
  const visible = flowUi.libraryFilter === 'all' ? jobs : jobs.filter((job) => job.type === flowUi.libraryFilter);
  empty.classList.toggle('hidden', visible.length > 0);
  if (!visible.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = visible.map((job) => {
    const active = job.status === 'queued' || job.status === 'running';
    const media = job.status === 'done' && job.url
      ? (job.type === 'video'
        ? `<video class="flow-job-media" src="${escapeAttr(job.url)}" muted playsinline preload="metadata"></video>`
        : `<img class="flow-job-media" src="${escapeAttr(job.url)}" alt="${escapeAttr(job.prompt || 'Resultado de Flow')}" loading="lazy" />`)
      : `<div class="flow-job-placeholder"><svg class="ico"><use href="#i-${job.type === 'video' ? 'film' : 'image'}"/></svg><span>${escapeHtml(flowStatusLabel(job))}</span></div>`;
    const actions = [];
    if (job.status === 'done') {
      actions.push(`<button class="btn btn-sm btn-ghost" data-flow-open="${job.id}">Ver</button>`);
      actions.push(`<button class="btn btn-sm btn-ghost" data-flow-download="${job.id}">Descargar</button>`);
      if (job.type === 'image') {
        actions.push(`<button class="btn btn-sm btn-primary" data-flow-apply="${job.id}">Al lienzo</button>`);
        actions.push(`<button class="btn btn-sm btn-ghost" data-flow-animate="${job.id}">Animar</button>`);
      } else {
        actions.push(`<button class="btn btn-sm btn-ghost" data-flow-frames="${job.id}">Usar como inicio</button>`);
      }
    }
    if (job.status === 'unknown') {
      actions.push(`<button class="btn btn-sm btn-primary" data-flow-retry="${job.id}">Reintentar</button>`);
    }
    if (!active) {
      actions.push(`<button class="btn btn-sm btn-danger" data-flow-delete="${job.id}" aria-label="Eliminar resultado">✕</button>`);
    }
    return `<article class="flow-job" data-job="${job.id}">
      <div class="flow-job-thumb">${media}</div>
      <div class="flow-job-body">
        <div class="flow-job-row">
          <span class="flow-job-state" data-state="${job.status}">${escapeHtml(flowStatusLabel(job))}</span>
          <span class="flow-job-meta mono">${escapeHtml(job.ratio || '')} ${job.type === 'video' ? '· vídeo' : ''}</span>
        </div>
        <p class="flow-job-prompt">${escapeHtml(job.prompt || 'Sin prompt')}</p>
        ${job.error ? `<p class="flow-job-error">${escapeHtml(job.error)}</p>` : ''}
        <div class="flow-job-actions">${actions.join('')}</div>
      </div>
    </article>`;
  }).join('');
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

/** Abre el visor grande (imagen o vídeo) con su descarga. */
function openFlowViewer(job) {
  const box = $('flowLightbox');
  const img = $('flowLightboxImg');
  const video = $('flowLightboxVideo');
  if (!job?.url) return;
  $('flowLightboxMeta').textContent = `${job.type === 'video' ? 'Vídeo' : 'Imagen'} · ${job.ratio || ''} · ${job.width || '?'}×${job.height || '?'}`;
  $('flowLightboxDownload').href = `${job.url}${job.url.includes('?') ? '&' : '?'}download=1`;
  $('flowLightboxDownload').setAttribute('download', '');
  if (job.type === 'video') {
    img.classList.add('hidden');
    img.src = '';
    video.classList.remove('hidden');
    video.src = job.url;
  } else {
    video.classList.add('hidden');
    video.removeAttribute('src');
    img.classList.remove('hidden');
    img.src = job.url;
  }
  box.classList.remove('hidden');
  box.dataset.job = job.id;
  $('flowLightboxClose').focus();
}

function closeFlowViewer() {
  const box = $('flowLightbox');
  if (!box || box.classList.contains('hidden')) return;
  box.classList.add('hidden');
  const video = $('flowLightboxVideo');
  video.pause?.();
  video.removeAttribute('src');
  $('flowLightboxImg').src = '';
  delete box.dataset.job;
}

function findJob(id) {
  return flowState.jobs.find((job) => job.id === id) || null;
}

/** Añade un resultado de Flow al lienzo como capa nueva. */
async function applyFlowJobToCanvas(job) {
  if (!job?.url) return;
  try {
    const blob = await fetchFlowBlob(job);
    const dims = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const probe = new Image();
      probe.onload = () => { resolve({ width: probe.naturalWidth, height: probe.naturalHeight }); URL.revokeObjectURL(url); };
      probe.onerror = () => { URL.revokeObjectURL(url); reject(new Error('La imagen del resultado no se pudo leer.')); };
      probe.src = url;
    });
    const resource = addResource({ name: `${job.type}-${job.id.slice(0, 6)}.jpg`, mime: blob.type || 'image/jpeg', blob, width: dims.width, height: dims.height });
    void uploadResource(resource);
    if (!state.doc) {
      state.doc = createDoc({ name: 'Generación', width: dims.width, height: dims.height });
      state.project = createProject('Generación', state.doc);
    }
    state.ui.beforeImage = renderer.snapshotImage();
    const fits = fitInside(dims.width, dims.height, state.doc.width, state.doc.height);
    const layer = makeImageLayer({
      name: 'Resultado Flow',
      resourceId: resource.id,
      x: Math.round((state.doc.width - fits.w) / 2),
      y: Math.round((state.doc.height - fits.h) / 2),
      w: fits.w, h: fits.h,
    });
    mutate('aplicar resultado de Flow', () => { state.doc.layers.push(layer); });
    selectLayer(layer.id);
    setEmptyState(false);
    renderLayers();
    renderAssets();
    renderer.requestRender('flow-apply');
    scheduleSave('flow-apply');
    setMode('image');
    toast('Resultado añadido al lienzo como capa nueva.', 'ok');
  } catch (error) {
    toast(`No se pudo aplicar el resultado: ${error.message}`, 'error');
  }
}

/** Acciones de la biblioteca (delegación de eventos). */
async function onFlowLibraryClick(event) {
  const button = event.target.closest('button[data-flow-open], button[data-flow-download], button[data-flow-apply], button[data-flow-animate], button[data-flow-frames], button[data-flow-retry], button[data-flow-delete]');
  if (!button) return;
  const {
    flowOpen, flowDownload, flowApply, flowAnimate, flowFrames, flowRetry, flowDelete,
  } = button.dataset;
  const id = flowOpen || flowDownload || flowApply || flowAnimate || flowFrames || flowRetry || flowDelete;
  const job = findJob(id);
  if (!job) { toast('Ese resultado ya no está disponible: actualiza la lista.', 'warn'); return; }
  button.disabled = true;
  try {
    if (flowOpen) { openFlowViewer(job); return; }
    if (flowDownload) { const name = await downloadFlowJob(job); toast(`Descargado ${name}.`, 'ok'); return; }
    if (flowApply) { await applyFlowJobToCanvas(job); return; }
    if (flowAnimate) {
      const blob = await fetchFlowBlob(job);
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
      await animateImage(dataUrl);
      return;
    }
    if (flowFrames) {
      const blob = await fetchFlowBlob(job);
      const url = URL.createObjectURL(blob);
      flowUi.startFrame = url;
      // El visor de vídeo no sirve como fotograma: se avisa con claridad.
      toast('Un vídeo no se puede usar como fotograma. Elige una imagen generada.', 'warn');
      URL.revokeObjectURL(url);
      flowUi.startFrame = null;
      return;
    }
    if (flowRetry) {
      const updated = await retryFlowJob(job.id);
      toast(updated?.status === 'queued'
        ? 'Trabajo devuelto a la cola. Se ejecutará en cuanto el PC pueda.'
        : 'El trabajo no se pudo reprogramar.', updated?.status === 'queued' ? 'ok' : 'warn');
      await refreshFlowState().then(paintFlowAgent);
      await refreshLibrary();
      return;
    }
    if (flowDelete) {
      const ok = await confirmDialog({
        title: 'Eliminar resultado',
        text: 'Se borrará el archivo del servidor. Esta acción no se puede deshacer.',
        okLabel: 'Eliminar',
        danger: true,
      });
      if (!ok) return;
      await deleteFlowJob(job.id);
      renderFlowJobs(flowState.jobs);
      toast('Resultado eliminado.', 'ok');
    }
  } catch (error) {
    toast(`No se pudo completar la acción: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

/** Refleja en el selector si el modelo elegido usa Flow (y ajusta los controles). */
function syncFlowControls() {
  const model = modelById(state.ui.model);
  const isFlow = model?.provider === 'flow';
  document.body.classList.toggle('is-flow-model', isFlow);
  const note = $('modelNote');
  if (note) {
    note.textContent = isFlow
      ? `${model.model} en tu PC con Google Flow: no consume clave de API. Genera a ~1K; el formato se elige abajo.`
      : (model?.note || '');
  }
  // Flow solo admite cinco proporciones: el resto se marca como no disponible.
  const aspect = $('aspectSelect');
  if (aspect) {
    for (const option of aspect.options) {
      const supported = FLOW_IMAGE_RATIOS.includes(option.value);
      option.disabled = isFlow && !supported;
    }
    if (isFlow && !FLOW_IMAGE_RATIOS.includes(aspect.value)) {
      aspect.value = '1:1';
      state.ui.aspect = '1:1';
    }
  }
  // La resolución la decide Flow: el control no aplica.
  const resolution = $('resolutionSelect');
  if (resolution) {
    resolution.disabled = isFlow;
    resolution.title = isFlow ? 'Google Flow genera a su resolución nativa (~1K).' : '';
  }
  const count = $('countSelect');
  if (count) {
    count.disabled = isFlow ? false : count.disabled;
    count.title = isFlow ? 'Flow permite hasta 4 variantes por encolado.' : '';
  }
}

/** Enlaza la interfaz de Flow (navegación, vídeo y biblioteca). */
function bindFlowUI() {
  for (const button of $$('#modeNav .mode-btn')) {
    button.addEventListener('click', () => setMode(button.dataset.mode));
  }
  $('flowRefreshBtn').addEventListener('click', async () => {
    $('flowRefreshBtn').disabled = true;
    await refreshFlowState();
    paintFlowAgent();
    $('flowRefreshBtn').disabled = false;
    toast(flowState.workerOnline ? 'El PC con Flow está conectado.' : 'El PC con Flow no responde ahora mismo.', flowState.workerOnline ? 'ok' : 'warn');
  });
  $('flowAgentRefresh').addEventListener('click', async () => {
    await refreshFlowState();
    paintFlowAgent();
  });
  $('videoModelGroup').addEventListener('click', (event) => {
    const button = event.target.closest('[data-vmodel]');
    if (!button) return;
    flowUi.videoModel = button.dataset.vmodel;
    for (const item of $$('#videoModelGroup [data-vmodel]')) {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    }
  });
  $('videoRatioGroup').addEventListener('click', (event) => {
    const button = event.target.closest('[data-vratio]');
    if (!button) return;
    flowUi.videoRatio = button.dataset.vratio;
    for (const item of $$('#videoRatioGroup [data-vratio]')) {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    }
  });
  $('videoPrompt').addEventListener('input', () => {
    const length = $('videoPrompt').value.length;
    $('videoPromptCount').textContent = `${length} / 1.500`;
  });
  $('videoStartPick').addEventListener('click', pickStartFrame);
  $('videoStartClear').addEventListener('click', () => { flowUi.startFrame = null; paintStartFrame(); });
  $('videoGenerateBtn').addEventListener('click', runFlowVideo);
  $('videoUseCanvas').addEventListener('click', useCanvasAsStartFrame);
  $('flowLibraryRefresh').addEventListener('click', () => { void refreshLibrary(); });
  $('flowProgressMore').addEventListener('click', () => setMode('library'));
  $('libraryFilter').addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    flowUi.libraryFilter = button.dataset.filter;
    for (const item of $$('#libraryFilter [data-filter]')) {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    }
    void refreshLibrary();
  });
  $('flowJobs').addEventListener('click', onFlowLibraryClick);
  $('flowLightboxClose').addEventListener('click', closeFlowViewer);
  $('flowLightbox').addEventListener('click', (event) => {
    if (event.target.id === 'flowLightbox') closeFlowViewer();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeFlowViewer();
  });
  on('flow:state', paintFlowAgent);
  // El selector de modelo cambia los controles de Flow.
  const selector = $('modelSelector');
  if (selector) selector.addEventListener('click', () => setTimeout(syncFlowControls, 0));
  syncFlowControls();
  document.addEventListener('keydown', (event) => {
    // Atajo: animar el lienzo actual desde la sección de imagen.
    if (event.altKey && event.key.toLowerCase() === 'v' && !isTypingTarget(event.target)) {
      event.preventDefault();
      useCanvasAsStartFrame();
    }
  });
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
  $('doCropBtn').addEventListener('click', applyCrop);
  $('doResizeBtn').addEventListener('click', applyResize);
  $('resizeKeepRatio').addEventListener('change', () => {});
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
    await refreshFlowState();
    paintFlowAgent();
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
    `Modelos de Flow: ${flowState.agentConfigured ? 'agente configurado' : 'sin credencial de agente'} · PC ${flowState.workerOnline ? 'conectado' : 'desconectado'}`,
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
    if (window.__UIS_DIAG__) {
      window.__UIS_DIAG__.problems.push('Arranque: ' + (error?.message || String(error)));
      window.__UIS_DIAG__.show();
    }
    toast(`Error al iniciar: ${error.message}`, 'error', { duration: 12000 });
  });
  document.addEventListener('uis:tab', (event) => switchLeftTab(event.detail.tab));
  setInterval(() => { if (state.flags.dirty && !state.ui.saving) scheduleSave('interval', 0); }, 30000);
  setInterval(updateUtilities, 4000);
});

// Exponer un mínimo para depuración en consola (sin datos sensibles).
window.__UIS__ = { state, renderer, importFiles, saveNow, exportImage, serializeProject, build: BUILD };
