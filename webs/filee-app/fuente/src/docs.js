// Conversión de documentos (PDF y DOCX) hecha en el navegador.
// Las librerías pesadas se cargan solo cuando se usan (import dinámico),
// así la página de inicio sigue cargando igual de rápida.

/* ── utilidades ─────────────────────────────────────────────────── */

const strToU8 = (s) => new TextEncoder().encode(s);

/** Medidas máximas de una imagen dentro de una página A4 con márgenes (EMU). */
const MAX_W_EMU = 6480000; // ~18 cm
const MAX_H_EMU = 8710000; // ~24,2 cm

/** Empaqueta varios blobs en un ZIP (sin dependencias de zip en el resto de la app). */
export async function zipFiles(files) {
  const { zipSync } = await import('fflate');
  const entries = {};
  const used = new Map();
  for (const { name, blob } of files) {
    let finalName = name;
    const seen = used.get(name) || 0;
    if (seen) {
      const dot = name.lastIndexOf('.');
      finalName = dot > 0 ? `${name.slice(0, dot)} (${seen + 1})${name.slice(dot)}` : `${name} (${seen + 1})`;
    }
    used.set(name, seen + 1);
    entries[finalName] = new Uint8Array(await blob.arrayBuffer());
  }
  const zipped = zipSync(entries, { level: 0 });
  return new Blob([zipped], { type: 'application/zip' });
}

/* ── PDF ─────────────────────────────────────────────────────────── */

let pdfjsPromise = null;
async function pdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const lib = await import('pdfjs-dist');
      // El worker se sirve como archivo aparte (con extensión .js para que el
      // servidor lo entregue como JavaScript y el navegador pueda usarlo).
      const workerUrl = (await import('./pdf.worker.min.js?url')).default;
      lib.GlobalWorkerOptions.workerSrc = workerUrl;
      return lib;
    })();
  }
  return pdfjsPromise;
}

/** Abre un PDF y devuelve el documento de pdf.js. */
export async function openPdf(fileOrBytes) {
  const { getDocument } = await pdfjs();
  const raw =
    fileOrBytes instanceof Uint8Array ? fileOrBytes : new Uint8Array(await fileOrBytes.arrayBuffer());
  // Copia obligatoria: pdf.js se queda con el buffer (lo transfiere al worker).
  const data = new Uint8Array(raw);
  const task = getDocument({ data, isEvalSupported: false, useSystemFonts: true });
  return task.promise;
}

/** Dibuja una página del PDF en un canvas (fondo blanco, sin transparencias). */
export async function renderPdfPage(doc, pageNumber, maxSide = 2400) {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(3, Math.max(0.5, maxSide / Math.max(base.width, base.height)));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, background: '#ffffff' }).promise;
  return canvas;
}

/** Todas las páginas del PDF como canvas. */
export async function pdfToCanvases(doc, maxSide = 2400) {
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) out.push(await renderPdfPage(doc, i, maxSide));
  return out;
}

/* ── DOCX (lectura) ──────────────────────────────────────────────── */

/** Renderiza un .docx a HTML paginado (docx-preview) en un contenedor oculto. */
export async function docxToSections(bytes, width = 794) {
  const { renderAsync } = await import('docx-preview');
  const holder = document.createElement('div');
  holder.setAttribute('data-filee-docx', '1');
  holder.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'width:' + width + 'px',
    'background:#ffffff',
    'opacity:0',
    'pointer-events:none',
    'z-index:-1',
    'overflow:hidden',
  ].join(';');
  const styleHost = document.createElement('div');
  styleHost.setAttribute('data-filee-docx-style', '1');
  document.body.appendChild(holder);
  document.body.appendChild(styleHost);
  await renderAsync(bytes, holder, styleHost, {
    className: 'docx',
    inWrapper: true,
    breakPages: true,
    ignoreWidth: false,
    ignoreHeight: false,
    ignoreFonts: false,
    ignoreLastRenderedPageBreak: true,
    experimental: true,
    useBase64URL: true,
    renderHeaders: true,
    renderFooters: true,
    renderAltChunks: true,
  });
  const sections = [...holder.querySelectorAll('section.docx')];
  return {
    holder,
    styleHost,
    sections: sections.length ? sections : [holder.querySelector('.docx-wrapper') || holder],
    cleanup() {
      holder.remove();
      styleHost.remove();
    },
  };
}

/** Convierte cada página del .docx en un canvas. */
export async function docxToCanvases(bytes, maxWidth = 1400) {
  const { default: html2canvas } = await import('html2canvas');
  const rendered = await docxToSections(bytes, 794);
  try {
    const canvases = [];
    for (const section of rendered.sections) {
      const rect = section.getBoundingClientRect();
      const scale = Math.min(2.5, Math.max(1, maxWidth / Math.max(1, rect.width)));
      const canvas = await html2canvas(section, {
        backgroundColor: '#ffffff',
        scale,
        useCORS: false,
        logging: false,
        allowTaint: false,
        windowWidth: 1024,
      });
      canvases.push(canvas);
    }
    return canvases;
  } finally {
    rendered.cleanup();
  }
}

/* ── DOCX (escritura) ────────────────────────────────────────────── */

function xmlEscape(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="jpeg" ContentType="image/jpeg"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
</w:styles>`;

function sectPr() {
  return '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>';
}

/** Crea un .docx con los párrafos indicados. pages: array de arrays de párrafos. */
async function buildDocx(pages, { imagePart } = {}) {
  const { zipSync } = await import('fflate');
  const body = [];
  pages.forEach((paragraphs, index) => {
    if (index > 0) body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    for (const text of paragraphs) {
      const runs = String(text)
        .split('\n')
        .map((line, i) => (i ? `<w:r><w:br/></w:r><w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>` : `<w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`))
        .join('');
      body.push(`<w:p>${runs}</w:p>`);
    }
    if (!paragraphs.length) body.push('<w:p/>');
  });

  let media = null;
  let drawing = '';
  if (imagePart) {
    // Imagen dentro de un párrafo (EMU: 1 px = 9525 EMU; A4 con márgenes ~18 x 24 cm).
    const { width, height, png, name } = imagePart;
    const scale = Math.min(1, MAX_W_EMU / (width * 9525), MAX_H_EMU / (height * 9525));
    const cx = Math.round(width * 9525 * scale);
    const cy = Math.round(height * 9525 * scale);
    const rid = 'rIdImg1';
    const picId = 1;
    drawing = `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${picId}" name="Imagen"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${picId}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    media = { name, png };
  }

  if (drawing) body.unshift(drawing);

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}${sectPr()}</w:body></w:document>`;

  const files = {
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(ROOT_RELS),
    'word/document.xml': strToU8(document),
    'word/styles.xml': strToU8(STYLES),
  };

  if (media) {
    files['word/media/' + media.name] = media.png;
    files['word/_rels/document.xml.rels'] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImg1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${media.name}"/></Relationships>`,
    );
  }

  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/** PDF → DOCX: extrae el texto de cada página y lo vuelca en Word. */
export async function pdfToDocx(doc) {
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const lines = [];
    for (const item of content.items || []) {
      const text = item.str;
      if (!text) continue;
      const x = item.transform?.[4] ?? 0;
      const y = item.transform?.[5] ?? 0;
      const h = Math.abs(item.transform?.[3] ?? 10) || 10;
      let line = lines.find((l) => Math.abs(l.y - y) <= Math.max(1.5, h * 0.35));
      if (!line) {
        line = { y, parts: [] };
        lines.push(line);
      }
      line.parts.push({ x, text });
    }
    lines.sort((a, b) => b.y - a.y);
    const paragraphs = lines
      .map((l) =>
        l.parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean);
    pages.push(paragraphs);
  }
  return buildDocx(pages);
}

/** Una imagen → DOCX con la imagen a página completa. */
export async function imageToDocx(canvas, quality = 0.92) {
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const png = new Uint8Array(await blob.arrayBuffer());
  return buildDocx([[]], {
    imagePart: { width: canvas.width, height: canvas.height, png, name: 'imagen.png' },
  });
}

/** Varias páginas (canvas) → un .docx con una imagen por página. */
export async function canvasesToDocx(canvases, quality = 0.92) {
  const { zipSync } = await import('fflate');
  const media = {};
  const body = [];

  for (let i = 0; i < canvases.length; i++) {
    const canvas = canvases[i];
    const name = `pagina-${i + 1}.jpg`;
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) throw new Error('El navegador no puede generar la imagen de la página');
    media['word/media/' + name] = new Uint8Array(await blob.arrayBuffer());
    const scale = Math.min(1, MAX_W_EMU / (canvas.width * 9525), MAX_H_EMU / (canvas.height * 9525));
    const cx = Math.round(canvas.width * 9525 * scale);
    const cy = Math.round(canvas.height * 9525 * scale);
    const rid = `rIdP${i + 1}`;
    if (i > 0) body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    body.push(
      `<w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${i + 1}" name="Pagina ${i + 1}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${i + 1}" name="Pagina ${i + 1}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`,
    );
  }

  const rels = canvases
    .map((_, i) => `<Relationship Id="rIdP${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/pagina-${i + 1}.jpg"/>`)
    .join('');

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}${sectPr()}</w:body></w:document>`;

  const files = {
    '[Content_Types].xml': strToU8(CONTENT_TYPES),
    '_rels/.rels': strToU8(ROOT_RELS),
    'word/document.xml': strToU8(document),
    'word/styles.xml': strToU8(STYLES),
    'word/_rels/document.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`,
    ),
    ...media,
  };
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/* ── PDF de varias páginas ───────────────────────────────────────── */

/** Construye un PDF con una página por canvas (imagen JPEG dentro). */
export async function canvasesToPdf(canvases, quality = 0.9) {
  const enc = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let offset = 0;

  const push = (data) => {
    const bytes = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(bytes);
    offset += bytes.length;
  };
  const obj = (header, body, stream) => {
    offsets.push({ num: offsets.length + 1, at: offset });
    push(header);
    if (stream) {
      push('stream\n');
      push(stream);
      push('\nendstream\n');
    }
    push(body);
  };

  const n = canvases.length;
  push('%PDF-1.4\n');
  obj('1 0 obj\n', '<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const kids = canvases.map((_, i) => `${4 + i * 3} 0 R`).join(' ');
  obj('2 0 obj\n', `<< /Type /Pages /Kids [${kids}] /Count ${n} >>\nendobj\n`);
  obj('3 0 obj\n', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  for (let i = 0; i < n; i++) {
    const canvas = canvases[i];
    const jpeg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg', quality)).arrayBuffer());
    const pageNum = 4 + i * 3;
    const imageNum = pageNum + 1;
    const contentNum = pageNum + 2;
    // El canvas está a 96 ppp; el PDF mide en puntos (72 ppp) → 0,75.
    const pw = Math.round(canvas.width * 0.75);
    const ph = Math.round(canvas.height * 0.75);
    obj(
      `${pageNum} 0 obj\n`,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 ${imageNum} 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`,
    );
    obj(
      `${imageNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\n`,
      'endobj\n',
      jpeg,
    );
    const content = `q\n${pw} 0 0 ${ph} 0 0 cm\n/Im0 Do\nQ`;
    obj(
      `${contentNum} 0 obj\n<< /Length ${content.length} >>\n`,
      'endobj\n',
      enc.encode(content),
    );
  }

  const xrefStart = offset;
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o.at).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((res) => canvas.toBlob(res, mime, quality));
}

/* ── vistas previas ──────────────────────────────────────────────── */

/** Miniatura de la primera página de un PDF. */
export async function pdfPreview(file, maxSide = 700) {
  const doc = await openPdf(file);
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const canvas = await renderPdfPage(doc, 1, maxSide);
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.82),
      pages: doc.numPages,
      width: Math.round(base.width),
      height: Math.round(base.height),
    };
  } finally {
    try {
      doc.destroy?.();
    } catch {
      /* nada */
    }
  }
}

/** Miniatura de la primera página de un .docx. */
export async function docxPreview(bytes, maxWidth = 700) {
  const { default: html2canvas } = await import('html2canvas');
  const rendered = await docxToSections(bytes, 794);
  try {
    const section = rendered.sections[0];
    const rect = section.getBoundingClientRect();
    const scale = Math.min(1.4, Math.max(0.6, maxWidth / Math.max(1, rect.width)));
    const canvas = await html2canvas(section, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: false,
      logging: false,
      allowTaint: false,
      windowWidth: 1024,
    });
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.82),
      pages: rendered.sections.length,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  } finally {
    rendered.cleanup();
  }
}

/* ── clasificación de archivos ───────────────────────────────────── */

export function fileKind(file) {
  const name = (file?.name || '').toLowerCase();
  const type = (file?.type || '').toLowerCase();
  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif|ico|svg)$/.test(name)) return 'image';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (type.includes('wordprocessingml') || name.endsWith('.docx')) return 'docx';
  return 'other';
}
