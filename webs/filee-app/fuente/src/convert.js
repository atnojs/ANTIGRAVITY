// Conversiones reales en el navegador: imagen → JPG/PNG/WEBP, ICO y PDF.

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Dibuja el archivo en un canvas (con fondo blanco opcional). */
export async function toCanvas(file, background) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  return canvas;
}

function canvasBlob(canvas, mime, quality) {
  return new Promise((res) => canvas.toBlob(res, mime, quality));
}

/** ICO con una imagen PNG dentro (formato válido, hasta 256 px). */
async function toIco(canvas) {
  const side = Math.min(256, Math.max(canvas.width, canvas.height));
  const square = document.createElement('canvas');
  square.width = side;
  square.height = side;
  const ctx = square.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, side, side);
  const png = new Uint8Array(await (await canvasBlob(square, 'image/png')).arrayBuffer());

  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint16(0, 0, true); // reservado
  view.setUint16(2, 1, true); // tipo: icono
  view.setUint16(4, 1, true); // número de imágenes
  header[6] = side >= 256 ? 0 : side; // ancho
  header[7] = side >= 256 ? 0 : side; // alto
  header[8] = 0; // colores de paleta
  header[9] = 0; // reservado
  view.setUint16(10, 1, true); // planos
  view.setUint16(12, 32, true); // bits por píxel
  view.setUint32(14, png.length, true); // tamaño
  view.setUint32(18, 22, true); // desplazamiento

  const out = new Uint8Array(22 + png.length);
  out.set(header, 0);
  out.set(png, 22);
  return new Blob([out], { type: 'image/x-icon' });
}

/** PDF de una página con la imagen en JPEG (sin dependencias). */
async function toPdf(canvas) {
  const jpeg = new Uint8Array(await (await canvasBlob(canvas, 'image/jpeg', 0.9)).arrayBuffer());
  const w = canvas.width;
  const h = canvas.height;
  const enc = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const offsets = [];

  const push = (data) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    offset += bytes.length;
  };
  const obj = (header, body, stream) => {
    offsets.push(offset);
    push(header);
    if (stream) {
      push(enc.encode(`stream\n`));
      push(stream);
      push(enc.encode(`\nendstream\n`));
    }
    push(body);
  };

  push('%PDF-1.4\n');
  obj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\n', 'endobj\n');
  obj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n', 'endobj\n');
  obj(
    '3 0 obj\n',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  );
  obj(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\n`,
    'endobj\n',
    jpeg,
  );
  const content = `q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ`;
  obj(`5 0 obj\n<< /Length ${content.length} >>\n`, 'endobj\n', enc.encode(content));

  const xrefStart = offset;
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
}

/** Convierte un File de imagen al formato pedido. Devuelve { blob, ext }. */
export async function convertImage(file, format) {
  const fmt = format.toLowerCase();
  // El JPG no tiene transparencia: se aplana sobre blanco.
  const canvas = await toCanvas(file, fmt === 'jpg' ? '#ffffff' : null);

  if (fmt === 'ico') return { blob: await toIco(canvas), ext: 'ico' };
  if (fmt === 'pdf') return { blob: await toPdf(canvas), ext: 'pdf' };

  const mime = MIME[fmt];
  if (!mime) throw new Error(`Formato no soportado: ${format}`);
  const blob = await canvasBlob(canvas, mime, fmt === 'jpg' ? 0.92 : undefined);
  if (!blob) throw new Error(`El navegador no puede generar ${format}`);
  return { blob, ext: fmt };
}

export function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Miniatura en data: (la política de seguridad del sitio no permite blob: en <img>). */
export async function makePreview(file, maxSide = 1400) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.82), width: bitmap.width, height: bitmap.height };
}

export function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
