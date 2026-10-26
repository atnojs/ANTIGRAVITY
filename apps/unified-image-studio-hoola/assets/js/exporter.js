/* ============================================================
   exporter.js — formatos, escala, DPI real y portapapeles
   ============================================================ */

import { state, emit, fmtBytes, serializeProject, clamp } from './core.js?v=2';
import { renderer } from './render.js?v=2';

const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const FORMAT_LABEL = { 'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP' };

export function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('El navegador no pudo codificar la imagen en este formato.'));
    }, type, quality);
  });
}

export function canvasSupports(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  return canvas.toDataURL(type).startsWith(`data:${type}`);
}

/* ── CRC32 para el chunk pHYs de PNG ── */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Añade un chunk pHYs (resolución física) a un PNG. */
export function patchPngDpi(bytes, dpi) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 33) return bytes;
  const ppm = Math.max(1, Math.round(dpi / 0.0254));
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // pHYs
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // unidad: metro
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  // Inserta después del IHDR (firma 8 + longitud 4 + tipo 4 + datos 13 + crc 4)
  const insertAt = 33;
  const out = new Uint8Array(bytes.length + chunk.length);
  out.set(bytes.subarray(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(bytes.subarray(insertAt), insertAt + chunk.length);
  return out;
}

/** Ajusta la densidad JFIF de un JPEG (o inserta el segmento APP0). */
export function patchJpegDpi(bytes, dpi) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 4) return bytes;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const density = clamp(Math.round(dpi), 1, 65535);

  const hasJfif = bytes[2] === 0xff && bytes[3] === 0xe0
    && bytes[6] === 0x4a && bytes[7] === 0x46 && bytes[8] === 0x49 && bytes[9] === 0x46;

  if (hasJfif) {
    const out = new Uint8Array(bytes);
    out[13] = 1; // unidades: puntos por pulgada
    out[14] = (density >> 8) & 0xff;
    out[15] = density & 0xff;
    out[16] = (density >> 8) & 0xff;
    out[17] = density & 0xff;
    return out;
  }

  // APP0 JFIF mínimo
  const app0 = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x01, 0x01,
    (density >> 8) & 0xff, density & 0xff,
    (density >> 8) & 0xff, density & 0xff,
    0x00, 0x00,
  ]);
  const out = new Uint8Array(bytes.length + app0.length);
  out.set(bytes.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(bytes.subarray(2), 2 + app0.length);
  return out;
}

export async function exportImage({
  format = 'image/png',
  quality = 0.92,
  scale = 1,
  dpi = 300,
  background = 'transparent',
  dpiEnabled = true,
} = {}) {
  if (!state.doc) throw new Error('No hay documento que exportar.');
  const width = Math.max(1, Math.round(state.doc.width * scale));
  const height = Math.max(1, Math.round(state.doc.height * scale));
  const canvas = renderer.compositeToCanvas({
    width,
    height,
    background: format === 'image/jpeg' ? (background === 'transparent' ? '#ffffff' : background) : background,
  });

  let blob = await canvasToBlob(canvas, format, format === 'image/png' ? undefined : quality);

  if (dpiEnabled && format === 'image/png') {
    const buffer = new Uint8Array(await blob.arrayBuffer());
    blob = new Blob([patchPngDpi(buffer, dpi)], { type: 'image/png' });
  } else if (dpiEnabled && format === 'image/jpeg') {
    const buffer = new Uint8Array(await blob.arrayBuffer());
    blob = new Blob([patchJpegDpi(buffer, dpi)], { type: 'image/jpeg' });
  }

  return { blob, width, height, format, dpi: format === 'image/webp' ? null : dpi };
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function safeName(name) {
  return String(name || 'documento')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'documento';
}

export async function downloadExport(options) {
  const result = await exportImage(options);
  const ext = MIME_EXT[options.format] || 'png';
  const name = `${safeName(state.project?.name || state.doc?.name)}-${result.width}x${result.height}.${ext}`;
  downloadBlob(result.blob, name);
  return { ...result, filename: name };
}

export async function copyToClipboard(options = {}) {
  const result = await exportImage({ ...options, format: 'image/png' });
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('Este navegador no permite copiar imágenes al portapapeles.');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': result.blob })]);
  return result;
}

export async function downloadProject() {
  const payload = await serializeProject();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${safeName(state.project?.name)}-${Date.now()}.uis.json`);
  return { size: blob.size };
}

export function exportLabel(format) {
  return FORMAT_LABEL[format] || format;
}

export function estimateExport(options) {
  const width = Math.round((state.doc?.width || 0) * options.scale);
  const height = Math.round((state.doc?.height || 0) * options.scale);
  const pixels = width * height;
  return {
    width,
    height,
    megapixels: pixels / 1e6,
    transparent: options.format !== 'image/jpeg',
    label: `${width} × ${height} px · ${(pixels / 1e6).toFixed(2)} Mpx`,
  };
}

export function humanSize(bytes) { return fmtBytes(bytes); }

export { emit };
