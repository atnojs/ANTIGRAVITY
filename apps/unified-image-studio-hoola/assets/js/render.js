/* ============================================================
   render.js — motor de dibujo, viewport y composición
   ============================================================ */

import { state, clamp, getResource, imageFor, getLayer } from './core.js?v=23';

const HANDLE_DEFS = [
  ['nw', -1, -1], ['n', 0, -1], ['ne', 1, -1],
  ['w', -1, 0], ['e', 1, 0],
  ['sw', -1, 1], ['s', 0, 1], ['se', 1, 1],
];

const TAU = Math.PI * 2;
const MAX_CANVAS_PIXELS = 18_000_000;

const rad = (deg) => (deg * Math.PI) / 180;

export function rotatePoint(x, y, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/* ══════════════ Renderer ══════════════ */
class Renderer {
  constructor() {
    this.view = null;
    this.mask = null;
    this.overlay = null;
    this.wrap = null;
    this.stageInner = null;
    this.maskCache = new Map();
    this.rafId = 0;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
  }

  init({ view, mask, overlay, wrap, stageInner }) {
    this.view = view;
    this.mask = mask;
    this.overlay = overlay;
    this.wrap = wrap;
    this.stageInner = stageInner;
    this.viewCtx = view.getContext('2d', { alpha: true });
    this.maskCtx = mask.getContext('2d');
    this.overlayCtx = overlay.getContext('2d');
    window.addEventListener('resize', () => this.requestRender('resize'));
  }

  get zoom() { return state.ui.zoom; }

  /** Escala de render: nitidez sin reventar memoria. */
  get renderScale() {
    const raw = clamp(this.zoom * this.dpr, 1, 3);
    const doc = state.doc;
    if (!doc) return raw;
    const pixels = doc.width * doc.height * raw * raw;
    if (pixels <= MAX_CANVAS_PIXELS) return raw;
    return Math.max(0.25, Math.sqrt(MAX_CANVAS_PIXELS / (doc.width * doc.height)));
  }

  requestRender(reason = '') {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.render(reason);
    });
  }

  /* ── Viewport ── */
  layout() {
    const doc = state.doc;
    if (!doc || !this.wrap) return;
    const cssW = Math.max(1, doc.width * this.zoom);
    const cssH = Math.max(1, doc.height * this.zoom);
    this.wrap.style.width = `${cssW}px`;
    this.wrap.style.height = `${cssH}px`;
    this.wrap.style.transform = `translate(${state.ui.pan.x}px, ${state.ui.pan.y}px)`;

    const scale = this.renderScale;
    const bw = Math.max(1, Math.round(doc.width * scale));
    const bh = Math.max(1, Math.round(doc.height * scale));
    if (this.view.width !== bw || this.view.height !== bh) {
      this.view.width = bw;
      this.view.height = bh;
    }
    this.viewCtx.setTransform(scale, 0, 0, scale, 0, 0);
    this.viewCtx.imageSmoothingQuality = 'high';

    const screenW = Math.round(cssW * this.dpr);
    const screenH = Math.round(cssH * this.dpr);
    for (const canvas of [this.mask, this.overlay]) {
      if (canvas.width !== screenW || canvas.height !== screenH) {
        canvas.width = screenW;
        canvas.height = screenH;
      }
    }
    this.maskCtx.setTransform(screenW / doc.width, 0, 0, screenH / doc.height, 0, 0);
    this.overlayCtx.setTransform(screenW / doc.width, 0, 0, screenH / doc.height, 0, 0);
  }

  fit() {
    const doc = state.doc;
    if (!doc || !this.stageInner) return;
    const pad = 64;
    const rect = this.stageInner.getBoundingClientRect();
    const zoom = clamp(Math.min((rect.width - pad) / doc.width, (rect.height - pad) / doc.height), 0.02, 8);
    state.ui.zoom = zoom;
    state.ui.fit = true;
    state.ui.pan = { x: 0, y: 0 };
    this.emitView();
    this.render('fit');
  }

  actualSize() {
    state.ui.zoom = 1;
    state.ui.fit = false;
    state.ui.pan = { x: 0, y: 0 };
    this.emitView();
    this.render('actual');
  }

  setZoom(zoom, anchorDoc = null) {
    const next = clamp(zoom, 0.02, 16);
    const prev = state.ui.zoom;
    if (Math.abs(next - prev) < 0.0001) return;
    state.ui.zoom = next;
    state.ui.fit = false;
    if (anchorDoc && state.doc) {
      // El punto del documento bajo el cursor se queda donde está:
      // pan' = pan + (p - centro) * (z0 - z1)
      state.ui.pan.x += (anchorDoc.x - state.doc.width / 2) * (prev - next);
      state.ui.pan.y += (anchorDoc.y - state.doc.height / 2) * (prev - next);
    }
    this.emitView();
    this.requestRender('zoom');
  }

  zoomBy(factor, anchorDoc = null) {
    this.setZoom(state.ui.zoom * factor, anchorDoc);
  }

  panBy(dx, dy) {
    state.ui.pan.x += dx;
    state.ui.pan.y += dy;
    state.ui.fit = false;
    this.wrap.style.transform = `translate(${state.ui.pan.x}px, ${state.ui.pan.y}px)`;
    this.requestRender('pan');
  }

  resetPan() {
    state.ui.pan = { x: 0, y: 0 };
    this.layout();
    this.requestRender('reset');
  }

  emitView() {
    const { zoom, fit } = state.ui;
    document.dispatchEvent(new CustomEvent('uis:view', { detail: { zoom, fit } }));
  }

  screenToDoc(clientX, clientY) {
    const doc = state.doc;
    if (!doc) return { x: 0, y: 0 };
    const rect = this.wrap.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.zoom,
      y: (clientY - rect.top) / this.zoom,
    };
  }

  docToScreen(x, y) {
    const rect = this.wrap.getBoundingClientRect();
    return { x: rect.left + x * this.zoom, y: rect.top + y * this.zoom };
  }

  /* ── Render principal ── */
  render() {
    const doc = state.doc;
    if (!doc) return;
    this.layout();
    const ctx = this.viewCtx;
    ctx.save();
    ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
    ctx.clearRect(0, 0, doc.width, doc.height);
    this.paintBackground(ctx);
    for (const layer of doc.layers) this.paintLayer(ctx, layer);
    ctx.restore();

    this.paintMask();
    this.paintOverlay();
  }

  paintBackground(ctx) {
    const doc = state.doc;
    if (!doc) return;
    if (doc.background?.type === 'color') {
      ctx.fillStyle = doc.background.color || '#ffffff';
      ctx.fillRect(0, 0, doc.width, doc.height);
    }
  }

  paintLayer(ctx, layer) {
    if (!layer.visible || layer.opacity <= 0) return;
    const doc = state.doc;
    const masked = layer.mask?.clip && layer.mask.enabled && layer.mask.strokes?.length > 0;
    const target = masked ? this.acquireScratch(doc.width, doc.height) : ctx;
    const tctx = masked ? target.getContext('2d') : ctx;

    if (masked) {
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.clearRect(0, 0, doc.width, doc.height);
      tctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
    }

    tctx.save();
    tctx.globalAlpha = layer.opacity;
    tctx.globalCompositeOperation = layer.blend || 'source-over';
    const cx = layer.x + layer.w / 2;
    const cy = layer.y + layer.h / 2;
    tctx.translate(cx, cy);
    if (layer.rotation) tctx.rotate(rad(layer.rotation));
    tctx.translate(-layer.w / 2, -layer.h / 2);
    if (layer.flipX) { tctx.translate(layer.w, 0); tctx.scale(-1, 1); }

    if (layer.type === 'image') this.paintImage(tctx, layer);
    else if (layer.type === 'text') this.paintText(tctx, layer);
    else if (layer.type === 'shape') this.paintShape(tctx, layer);
    tctx.restore();

    if (masked) {
      tctx.save();
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      tctx.globalCompositeOperation = 'destination-in';
      tctx.drawImage(this.maskCanvasFor(layer), 0, 0, doc.width, doc.height);
      tctx.restore();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.drawImage(target, 0, 0, doc.width * this.renderScale, doc.height * this.renderScale);
      ctx.restore();
      this.releaseScratch(target);
    }
  }

  paintImage(ctx, layer) {
    const img = imageFor(layer.resourceId);
    if (!img || !img.naturalWidth) {
      ctx.fillStyle = 'rgba(139,148,158,.14)';
      ctx.fillRect(0, 0, layer.w, layer.h);
      ctx.strokeStyle = 'rgba(139,148,158,.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, layer.w - 1, layer.h - 1);
      return;
    }
    ctx.drawImage(img, 0, 0, layer.w, layer.h);
  }

  paintText(ctx, layer) {
    const size = layer.fontSize || 48;
    ctx.fillStyle = layer.color || '#ffffff';
    ctx.textAlign = layer.align === 'center' ? 'center' : layer.align === 'right' ? 'right' : 'left';
    ctx.textBaseline = 'top';
    try { ctx.letterSpacing = `${layer.letterSpacing || 0}px`; } catch { /* opcional */ }
    ctx.font = `${layer.weight || 400} ${size}px ${layer.fontFamily || 'Inter'}, Inter, system-ui, sans-serif`;
    const lines = String(layer.text ?? '').split('\n');
    const lineHeight = size * (layer.lineHeight || 1.22);
    const x = layer.align === 'center' ? layer.w / 2 : layer.align === 'right' ? layer.w : 0;
    const totalHeight = lines.length * lineHeight;
    const startY = Math.max(0, (layer.h - totalHeight) / 2);
    lines.forEach((line, index) => {
      ctx.fillText(line, x, startY + index * lineHeight, layer.w);
    });
  }

  paintShape(ctx, layer) {
    const { w, h, shape } = layer;
    ctx.beginPath();
    if (shape === 'ellipse') {
      ctx.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, TAU);
      ctx.closePath();
    } else if (shape === 'line') {
      ctx.moveTo(0, 0);
      ctx.lineTo(w, h);
    } else {
      const r = Math.min(layer.radius || 0, Math.abs(w) / 2, Math.abs(h) / 2);
      if (r > 0 && ctx.roundRect) ctx.roundRect(0, 0, w, h, r);
      else ctx.rect(0, 0, w, h);
    }
    if (shape === 'line') {
      ctx.strokeStyle = layer.stroke || layer.fill || '#2ee8ff';
      ctx.lineWidth = Math.max(1, layer.strokeWidth || 2);
      ctx.lineCap = 'round';
      ctx.stroke();
      return;
    }
    if (layer.fill && layer.fill !== 'none') {
      ctx.fillStyle = layer.fill;
      ctx.fill();
    }
    if (layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.stroke || '#000';
      ctx.lineWidth = layer.strokeWidth;
      ctx.stroke();
    }
  }

  /* ── Scratch canvas pool ── */
  acquireScratch(w, h) {
    if (!this.scratch) {
      this.scratch = document.createElement('canvas');
    }
    const scale = this.renderScale;
    const bw = Math.round(w * scale);
    const bh = Math.round(h * scale);
    if (this.scratch.width !== bw || this.scratch.height !== bh) {
      this.scratch.width = bw;
      this.scratch.height = bh;
    }
    return this.scratch;
  }

  releaseScratch() { /* el canvas se reutiliza */ }

  /* ── Máscaras ── */
  maskCanvasFor(layer) {
    const key = layer.id;
    const cache = this.maskCache.get(key);
    const strokes = layer.mask?.strokes || [];
    const signature = strokes.length + ':' + (strokes.at(-1)?.pts.length || 0);
    if (cache && cache.signature === signature && cache.w === state.doc.width && cache.h === state.doc.height) {
      return cache.canvas;
    }
    const canvas = cache?.canvas || document.createElement('canvas');
    canvas.width = state.doc.width;
    canvas.height = state.doc.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    for (const stroke of strokes) paintStroke(ctx, stroke);
    this.maskCache.set(key, { canvas, signature, w: canvas.width, h: canvas.height });
    return canvas;
  }

  invalidateMask(layerId) {
    this.maskCache.delete(layerId);
  }

  paintMask() {
    const doc = state.doc;
    const ctx = this.maskCtx;
    if (!doc) return;
    ctx.save();
    ctx.clearRect(0, 0, doc.width, doc.height);
    const layer = getLayer();
    const live = this.activeStroke && this.activeStroke.layerId === layer?.id ? this.activeStroke.stroke : null;
    const show = state.ui.showMask && layer && (layer.mask?.strokes?.length > 0 || live) && !state.ui.compare;
    if (show) {
      if (layer.mask?.strokes?.length > 0) {
        const canvas = this.maskCanvasFor(layer);
        if (layer.mask?.inverted) {
          // Vista de la máscara invertida: se muestra el complemento de lo pintado.
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = 'rgba(46,232,255,.55)';
          ctx.fillRect(0, 0, doc.width, doc.height);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'destination-out';
          ctx.drawImage(canvas, 0, 0, doc.width, doc.height);
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.globalAlpha = 0.55;
        ctx.drawImage(canvas, 0, 0, doc.width, doc.height);
        // Tinte cian sobre la máscara pintada.
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgba(46,232,255,.55)';
        ctx.fillRect(0, 0, doc.width, doc.height);
        ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        }
      }
      if (live) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = live.mode === 'erase' ? 'rgba(248,81,73,.8)' : 'rgba(46,232,255,.85)';
        ctx.fillStyle = ctx.strokeStyle;
        paintStroke(ctx, { ...live, mode: 'paint' });
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ── Overlay de selección / comparación ── */
  paintOverlay() {
    const doc = state.doc;
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, doc.width, doc.height);
    ctx.save();
    if (state.ui.compare && state.ui.beforeImage) {
      this.paintCompare(ctx);
      ctx.restore();
      return;
    }
    const layer = getLayer();
    if (!layer || layer.locked) { ctx.restore(); return; }

    ctx.translate(layer.x + layer.w / 2, layer.y + layer.h / 2);
    if (layer.rotation) ctx.rotate(rad(layer.rotation));
    const lw = 1.4 / this.zoom;
    const halfW = layer.w / 2;
    const halfH = layer.h / 2;

    ctx.strokeStyle = 'rgba(46,232,255,.95)';
    ctx.lineWidth = lw;
    ctx.setLineDash([]);
    ctx.strokeRect(-halfW, -halfH, layer.w, layer.h);

    const size = 7 / this.zoom;
    for (const [, sx, sy] of HANDLE_DEFS) {
      const x = (sx * layer.w) / 2;
      const y = (sy * layer.h) / 2;
      ctx.fillStyle = '#0d1117';
      ctx.strokeStyle = '#2ee8ff';
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.rect(x - size / 2, y - size / 2, size, size);
      ctx.fill();
      ctx.stroke();
    }

    // Tirador de rotación
    const rotY = -halfH - 22 / this.zoom;
    ctx.strokeStyle = 'rgba(46,232,255,.7)';
    ctx.beginPath();
    ctx.moveTo(0, -halfH);
    ctx.lineTo(0, rotY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, rotY, size * 0.72, 0, TAU);
    ctx.fillStyle = '#0d1117';
    ctx.fill();
    ctx.strokeStyle = '#2ee8ff';
    ctx.stroke();
    ctx.restore();
  }

  paintCompare(ctx) {
    const doc = state.doc;
    const img = state.ui.beforeImage;
    const split = clamp(state.ui.compareX, 0, 1) * doc.width;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, split, doc.height);
    ctx.clip();
    if (img && img.complete && img.naturalWidth) {
      ctx.drawImage(img, 0, 0, doc.width, doc.height);
    } else {
      ctx.fillStyle = 'rgba(13,17,23,.6)';
      ctx.fillRect(0, 0, split, doc.height);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#2ee8ff';
    ctx.lineWidth = 2 / this.zoom;
    ctx.beginPath();
    ctx.moveTo(split, 0);
    ctx.lineTo(split, doc.height);
    ctx.stroke();
    ctx.fillStyle = 'rgba(46,232,255,.9)';
    ctx.font = `${11 / this.zoom}px Inter, sans-serif`;
    ctx.fillText('ANTES', 10 / this.zoom, 18 / this.zoom);
    ctx.fillStyle = 'rgba(230,237,243,.9)';
    ctx.fillText('DESPUÉS', split + 10 / this.zoom, 18 / this.zoom);
    ctx.restore();
  }

  /* ── Composición a canvas (export, miniaturas, snapshot) ── */
  compositeToCanvas({ width, height, background = 'transparent', includeLayers = true } = {}) {
    const doc = state.doc;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width || doc.width));
    canvas.height = Math.max(1, Math.round(height || doc.height));
    const ctx = canvas.getContext('2d');
    const sx = canvas.width / doc.width;
    const sy = canvas.height / doc.height;
    ctx.scale(sx, sy);

    if (background && background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, doc.width, doc.height);
    }
    if (includeLayers) {
      for (const layer of doc.layers) {
        if (!layer.visible || layer.opacity <= 0) continue;
        const masked = layer.mask?.clip && layer.mask.enabled && layer.mask.strokes?.length > 0;
        if (!masked) {
          this.paintLayerOnto(ctx, layer);
        } else {
          const holder = document.createElement('canvas');
          holder.width = doc.width;
          holder.height = doc.height;
          const hctx = holder.getContext('2d');
          this.paintLayerOnto(hctx, layer);
          hctx.globalCompositeOperation = 'destination-in';
          hctx.drawImage(this.maskCanvasFor(layer), 0, 0);
          ctx.save();
          ctx.setTransform(sx, 0, 0, sy, 0, 0);
          ctx.drawImage(holder, 0, 0, doc.width, doc.height);
          ctx.restore();
        }
      }
    }
    return canvas;
  }

  paintLayerOnto(ctx, layer) {
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.translate(layer.x + layer.w / 2, layer.y + layer.h / 2);
    if (layer.rotation) ctx.rotate(rad(layer.rotation));
    ctx.translate(-layer.w / 2, -layer.h / 2);
    if (layer.flipX) { ctx.translate(layer.w, 0); ctx.scale(-1, 1); }
    if (layer.type === 'image') this.paintImage(ctx, layer);
    else if (layer.type === 'text') this.paintText(ctx, layer);
    else if (layer.type === 'shape') this.paintShape(ctx, layer);
    ctx.restore();
  }

  /* ── Máscara a PNG (para inpainting) ── */
  maskToCanvas(layer) {
    const doc = state.doc;
    const canvas = document.createElement('canvas');
    canvas.width = doc.width;
    canvas.height = doc.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const painted = this.maskCanvasFor(layer);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(painted, 0, 0);
    return canvas;
  }

  /** Snapshot del estado actual como Image (para comparar). */
  snapshotImage() {
    const canvas = this.compositeToCanvas();
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    return img;
  }
}

/* ── Pinceladas de máscara ── */
export function paintStroke(ctx, stroke) {
  const pts = stroke.pts || [];
  if (pts.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = stroke.mode === 'erase' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = stroke.mode === 'erase' ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
  ctx.fillStyle = stroke.mode === 'erase' ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
  ctx.lineWidth = Math.max(1, stroke.size);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const blur = Math.max(0, (1 - (stroke.hardness ?? 0.8)) * stroke.size * 0.5);
  if (blur > 0.5 && 'filter' in ctx) ctx.filter = `blur(${blur.toFixed(2)}px)`;
  ctx.beginPath();
  if (pts.length === 1) {
    ctx.arc(pts[0][0], pts[0][1], Math.max(0.5, stroke.size / 2), 0, TAU);
    ctx.fill();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  ctx.restore();
}

/* ── Handle helpers (compartidos con tools.js) ── */
export function layerCorner(layer, sx, sy) {
  const angle = rad(layer.rotation || 0);
  const local = rotatePoint((sx * layer.w) / 2, (sy * layer.h) / 2, angle);
  return {
    x: layer.x + layer.w / 2 + local.x,
    y: layer.y + layer.h / 2 + local.y,
  };
}

export function getHandles(layer) {
  return HANDLE_DEFS.map(([name, sx, sy]) => ({ name, sx, sy, ...layerCorner(layer, sx, sy) }))
    .concat([{ name: 'rotate', sx: 0, sy: -1, ...rotateHandlePos(layer) }]);
}

export function rotateHandlePos(layer) {
  const angle = rad(layer.rotation || 0);
  const local = rotatePoint(0, -(layer.h / 2) - 22 / Math.max(0.05, state.ui.zoom), angle);
  return { x: layer.x + layer.w / 2 + local.x, y: layer.y + layer.h / 2 + local.y };
}

export function hitTestHandle(layer, point, tolerance = 9) {
  const zoom = Math.max(0.02, state.ui.zoom);
  const tol = tolerance / zoom;
  const rot = rotateHandlePos(layer);
  if (Math.hypot(point.x - rot.x, point.y - rot.y) <= tol * 1.2) return 'rotate';
  for (const [, sx, sy] of HANDLE_DEFS) {
    const pos = layerCorner(layer, sx, sy);
    if (Math.abs(point.x - pos.x) <= tol && Math.abs(point.y - pos.y) <= tol) {
      return HANDLE_DEFS.find(([name, a, b]) => a === sx && b === sy)[0];
    }
  }
  return null;
}

export function pointInLayer(layer, point) {
  const angle = rad(layer.rotation || 0);
  const dx = point.x - (layer.x + layer.w / 2);
  const dy = point.y - (layer.y + layer.h / 2);
  const local = rotatePoint(dx, dy, -angle);
  return Math.abs(local.x) <= Math.abs(layer.w) / 2 && Math.abs(local.y) <= Math.abs(layer.h) / 2;
}

export const renderer = new Renderer();
export { getResource };
