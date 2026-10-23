/* ============================================================
   tools.js — puntero, transformación, máscara, texto y formas
   ============================================================ */

import {
  state, emit, getLayer, selectLayer, clamp, makeTextLayer, makeShapeLayer, addLayer,
  pushHistory, markDirty,
} from './core.js?v=11';
import { renderer, hitTestHandle, pointInLayer } from './render.js?v=11';

const SNAP_DEG = 15;
const MIN_SIZE = 8;

let spaceDown = false;
let drag = null;

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (value) => (value * 180) / Math.PI;

function beginDocEdit() {
  return { snapshot: structuredClone(state.doc), at: Date.now() };
}

function commitDocEdit(transaction, label) {
  if (!transaction || !state.doc) return;
  pushHistory(transaction.snapshot, label);
  state.doc.updatedAt = Date.now();
  markDirty();
  emit('doc:change', { label });
}

export function initTools({ stageInner }) {
  stageInner.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  stageInner.addEventListener('wheel', onWheel, { passive: false });
  stageInner.addEventListener('dblclick', onDoubleClick);
  stageInner.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !isTyping(event.target)) {
      spaceDown = true;
      document.body.classList.add('is-panning');
    }
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
      spaceDown = false;
      document.body.classList.remove('is-panning');
    }
  });
  window.addEventListener('blur', () => { spaceDown = false; });
}

function isTyping(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function setCursor(cursor) {
  document.getElementById('stageInner').style.cursor = cursor;
}

/* ── Pointer down ── */
function onPointerDown(event) {
  if (!state.doc) return;
  if (event.button === 1 || (event.button === 0 && (spaceDown || state.selection.tool === 'hand'))) {
    event.preventDefault();
    drag = { kind: 'pan', startX: event.clientX, startY: event.clientY, panX: state.ui.pan.x, panY: state.ui.pan.y };
    setCursor('grabbing');
    return;
  }
  if (event.button !== 0) return;

  const point = renderer.screenToDoc(event.clientX, event.clientY);
  const tool = state.selection.tool;

  if (tool === 'mask') {
    startMask(event, point);
    return;
  }
  if (tool === 'text') {
    emit('tool:text', { x: point.x, y: point.y });
    return;
  }
  if (tool === 'shape') {
    startShape(event, point);
    return;
  }

  // Selección
  const layer = getLayer();
  if (layer && !layer.locked) {
    const handle = hitTestHandle(layer, point, 10);
    if (handle === 'rotate') {
      event.preventDefault();
      drag = {
        kind: 'rotate',
        ...beginDocEdit(),
        layerId: layer.id,
        center: { x: layer.x + layer.w / 2, y: layer.y + layer.h / 2 },
        startAngle: angleOf(layer, point),
        startRotation: layer.rotation || 0,
      };
      renderer.requestRender('drag');
      return;
    }
    if (handle) {
      event.preventDefault();
      drag = {
        kind: 'resize',
        ...beginDocEdit(),
        layerId: layer.id,
        handle,
        start: structuredClone(layer),
        point,
      };
      renderer.requestRender('drag');
      return;
    }
  }

  const hit = topmostLayerAt(point);
  if (hit) {
    if (hit.id !== state.selection.layerId) selectLayer(hit.id);
    event.preventDefault();
    drag = {
      kind: 'move',
      ...beginDocEdit(),
      layerId: hit.id,
      start: structuredClone(hit),
      point,
    };
    setCursor('grabbing');
    renderer.requestRender('drag');
  } else {
    selectLayer(null);
    drag = { kind: 'pan', startX: event.clientX, startY: event.clientY, panX: state.ui.pan.x, panY: state.ui.pan.y };
  }
}

function angleOf(layer, point) {
  return deg(Math.atan2(point.y - (layer.y + layer.h / 2), point.x - (layer.x + layer.w / 2)));
}

function topmostLayerAt(point) {
  const layers = state.doc.layers;
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i];
    if (!layer.visible || layer.locked) continue;
    if (pointInLayer(layer, point)) return layer;
  }
  return null;
}

/* ── Máscara ── */
function startMask(event, point) {
  const layer = getLayer();
  if (!layer || layer.locked) {
    emit('toast', { type: 'warn', message: 'Selecciona una capa desbloqueada para pintar la máscara.' });
    return;
  }
  event.preventDefault();
  const stroke = {
    mode: state.ui.maskMode,
    size: state.ui.brushSize,
    hardness: state.ui.brushHardness / 100,
    pts: [[point.x, point.y]],
  };
  drag = { kind: 'mask', layerId: layer.id, stroke, transaction: beginDocEdit() };
  renderer.activeStroke = { layerId: layer.id, stroke };
  renderer.requestRender('mask');
}

/* ── Formas ── */
function startShape(event, point) {
  event.preventDefault();
  const type = state.ui.shapeType || 'rect';
  const transaction = beginDocEdit();
  const layer = makeShapeLayer({
    shape: type,
    x: Math.round(point.x),
    y: Math.round(point.y),
    w: 1,
    h: 1,
    fill: state.ui.shapeFill,
    stroke: state.ui.shapeStroke,
    strokeWidth: state.ui.shapeStrokeWidth,
  });
  addLayer(layer);
  drag = { kind: 'shape', layerId: layer.id, origin: point, transaction };
  renderer.requestRender('shape');
}

/* ── Pointer move ── */
function onPointerMove(event) {
  if (!state.doc) return;
  const point = renderer.screenToDoc(event.clientX, event.clientY);
  emit('pointer:doc', { x: Math.round(point.x), y: Math.round(point.y) });

  if (!drag) {
    if (!isTyping(event.target)) {
      const tool = state.selection.tool;
      if (tool === 'hand' || spaceDown) setCursor('grab');
      else if (tool === 'mask') setCursor('crosshair');
      else if (tool === 'text') setCursor('text');
      else if (tool === 'shape') setCursor('crosshair');
      else setCursor('default');
    }
    return;
  }

  if (drag.kind === 'pan') {
    state.ui.pan.x = drag.panX + (event.clientX - drag.startX);
    state.ui.pan.y = drag.panY + (event.clientY - drag.startY);
    state.ui.fit = false;
    renderer.wrap.style.transform = `translate(${state.ui.pan.x}px, ${state.ui.pan.y}px)`;
    return;
  }

  const layer = getLayer(drag.layerId);
  if (!layer) return;

  if (drag.kind === 'mask') {
    const last = drag.stroke.pts.at(-1);
    const distance = Math.hypot(point.x - last[0], point.y - last[1]);
    if (distance * state.ui.zoom < 1.2) return;
    drag.stroke.pts.push([Math.round(point.x * 10) / 10, Math.round(point.y * 10) / 10]);
    renderer.requestRender('mask');
    return;
  }

  if (drag.kind === 'move') {
    let dx = point.x - drag.point.x;
    let dy = point.y - drag.point.y;
    if (event.shiftKey) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
    }
    layer.x = Math.round(drag.start.x + dx);
    layer.y = Math.round(drag.start.y + dy);
    emit('layer:geometry', { layerId: layer.id });
    renderer.requestRender('move');
    return;
  }

  if (drag.kind === 'resize') {
    applyResize(layer, drag.start, drag.handle, point, event);
    emit('layer:geometry', { layerId: layer.id });
    renderer.requestRender('resize');
    return;
  }

  if (drag.kind === 'rotate') {
    const current = angleOf(layer, point);
    let next = drag.startRotation + (current - drag.startAngle);
    if (event.shiftKey) next = Math.round(next / SNAP_DEG) * SNAP_DEG;
    layer.rotation = Math.round(next * 10) / 10;
    emit('layer:geometry', { layerId: layer.id });
    renderer.requestRender('rotate');
    return;
  }

  if (drag.kind === 'shape') {
    const { origin } = drag;
    const sx = point.x;
    const sy = point.y;
    let w = sx - origin.x;
    let h = sy - origin.y;
    if (event.shiftKey) {
      const size = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * size;
      h = Math.sign(h || 1) * size;
    }
    layer.x = Math.round(Math.min(origin.x, origin.x + w));
    layer.y = Math.round(Math.min(origin.y, origin.y + h));
    layer.w = Math.max(1, Math.round(Math.abs(w)));
    layer.h = Math.max(1, Math.round(Math.abs(h)));
    if (layer.shape === 'line') {
      layer.w = Math.round(w);
      layer.h = Math.round(h);
      layer.x = Math.round(origin.x);
      layer.y = Math.round(origin.y);
    }
    emit('layer:geometry', { layerId: layer.id });
    renderer.requestRender('shape');
  }
}

function applyResize(layer, start, handle, point, event) {
  const angle = rad(start.rotation || 0);
  const cx = start.x + start.w / 2;
  const cy = start.y + start.h / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  // Punto en el sistema local de la capa.
  const lx = dx * Math.cos(-angle) - dy * Math.sin(-angle);
  const ly = dx * Math.sin(-angle) + dy * Math.cos(-angle);

  const sx = handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0;
  const sy = handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0;

  const anchorX = (-sx * start.w) / 2;
  const anchorY = (-sy * start.h) / 2;

  let newW = sx ? Math.max(MIN_SIZE, Math.abs(lx - anchorX)) : start.w;
  let newH = sy ? Math.max(MIN_SIZE, Math.abs(ly - anchorY)) : start.h;

  if (event.shiftKey && sx && sy) {
    const ratio = start.w / start.h;
    if (newW / newH > ratio) newH = newW / ratio; else newW = newH * ratio;
  }

  // Centro nuevo en el sistema local, relativo al ancla fija.
  const centerLocalX = anchorX + (sx * newW) / 2;
  const centerLocalY = anchorY + (sy * newH) / 2;
  const anchorDocX = cx + anchorX * Math.cos(angle) - anchorY * Math.sin(angle);
  const anchorDocY = cy + anchorX * Math.sin(angle) + anchorY * Math.cos(angle);
  const newCx = anchorDocX + centerLocalX * Math.cos(angle) - centerLocalY * Math.sin(angle);
  const newCy = anchorDocY + centerLocalX * Math.sin(angle) + centerLocalY * Math.cos(angle);

  layer.w = Math.round(newW);
  layer.h = Math.round(newH);
  layer.x = Math.round(newCx - newW / 2);
  layer.y = Math.round(newCy - newH / 2);
}

/* ── Pointer up ── */
function onPointerUp() {
  if (!drag) return;
  const current = drag;
  drag = null;
  document.body.classList.remove('is-panning');

  if (current.kind === 'mask') {
    const layer = getLayer(current.layerId);
    renderer.activeStroke = null;
    if (layer && current.stroke.pts.length) {
      const snapshot = current.transaction.snapshot;
      // Añade la pincelada al estado actual y registra un único paso.
      layer.mask = layer.mask || { enabled: true, strokes: [] };
      if (!layer.mask.enabled) layer.mask.enabled = true;
      layer.mask.strokes.push(current.stroke);
      renderer.invalidateMask(layer.id);
      pushHistory(snapshot, current.stroke.mode === 'erase' ? 'borrar máscara' : 'pintar máscara');
      markDirty();
      emit('doc:change', { label: 'máscara' });
      emit('layers:change', { reason: 'mask' });
    }
    renderer.requestRender('mask');
    return;
  }

  if (current.kind === 'move') commitDocEdit(current, 'mover capa');
  else if (current.kind === 'resize') commitDocEdit(current, 'redimensionar capa');
  else if (current.kind === 'rotate') commitDocEdit(current, 'rotar capa');
  else if (current.kind === 'shape') {
    const layer = getLayer(current.layerId);
    if (layer && layer.w < 4 && layer.h < 4) {
      layer.w = 160;
      layer.h = 160;
    }
    commitDocEdit(current.transaction || current, 'crear forma');
  }
  renderer.requestRender('commit');
}

/* ── Zoom con rueda ── */
function onWheel(event) {
  if (!state.doc) return;
  event.preventDefault();
  const point = renderer.screenToDoc(event.clientX, event.clientY);
  if (event.shiftKey) {
    renderer.panBy(-event.deltaY, 0);
    return;
  }
  const factor = Math.exp(-event.deltaY * 0.0016);
  renderer.setZoom(state.ui.zoom * factor, point);
}

/* ── Doble clic: editar texto ── */
function onDoubleClick(event) {
  if (!state.doc) return;
  const point = renderer.screenToDoc(event.clientX, event.clientY);
  const layer = topmostLayerAt(point);
  if (layer?.type === 'text') {
    selectLayer(layer.id);
    emit('text:edit', { layerId: layer.id });
  }
}

/* ── API pública ── */
export function setTool(tool) {
  state.selection.tool = tool;
  emit('tool:change', { tool });
  if (tool === 'mask' && !getLayer()) {
    emit('toast', { type: 'info', message: 'Elige una capa para pintar su máscara.' });
  }
}

export { makeTextLayer, makeShapeLayer };

