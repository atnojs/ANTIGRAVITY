import {
  canvasesToPdf,
  docxPreview,
  docxToCanvases,
  openPdf,
  pdfPreview,
  pdfToCanvases,
  pdfToDocx,
  imageToDocx,
  zipFiles,
} from '../src/docs.js';
const PDF_URL = './fixtures/texto.pdf';
const DOCX_URL = './fixtures/informe.docx';

const pre = document.getElementById('out');
const log = [];
const push = (line) => {
  log.push(line);
  pre.textContent = log.join('\n');
};

const save = (name, blob) => fetch('/save?name=' + encodeURIComponent(name), { method: 'POST', body: blob });

async function step(name, fn) {
  try {
    const value = await fn();
    push('OK   ' + name + (value ? ' :: ' + value : ''));
    return value;
  } catch (err) {
    push('FAIL ' + name + ' :: ' + (err && (err.stack || err.message || err)));
    return null;
  }
}

/** Porcentaje de píxeles no blancos (para comprobar que la página se dibujó). */
function inkRatio(canvas) {
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let dark = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) dark++;
  }
  return ((dark / (data.length / 4)) * 100).toFixed(2) + '%';
}

async function run() {
  const pdfBytes = new Uint8Array(await (await fetch(PDF_URL)).arrayBuffer());
  const docxBytes = new Uint8Array(await (await fetch(DOCX_URL)).arrayBuffer());
  push('pdf fixture: ' + pdfBytes.length + ' bytes; docx fixture: ' + docxBytes.length + ' bytes');

  let doc = null;
  let canvases = [];
  let docxCanvases = [];

  await step('pdf: abrir', async () => {
    doc = await openPdf(pdfBytes);
    return 'paginas=' + doc.numPages;
  });

  await step('pdf: paginas a canvas', async () => {
    canvases = await pdfToCanvases(doc, 1200);
    return canvases.map((c) => `${c.width}x${c.height} (tinta ${inkRatio(c)})`).join(' / ');
  });

  await step('pdf -> pdf (varias paginas)', async () => {
    const blob = await canvasesToPdf(canvases);
    await save('desde-pdf.pdf', blob);
    return blob.size + ' bytes';
  });

  await step('pdf -> docx', async () => {
    const blob = await pdfToDocx(doc);
    await save('desde-pdf.docx', blob);
    return blob.size + ' bytes';
  });

  await step('pdf: miniatura', async () => {
    const file = new File([pdfBytes], 'texto.pdf', { type: 'application/pdf' });
    const preview = await pdfPreview(file);
    return `${preview.pages} pag, ${preview.width}x${preview.height}, imagen ${preview.dataUrl.length} chars`;
  });

  await step('docx: paginas a canvas', async () => {
    docxCanvases = await docxToCanvases(docxBytes, 1400);
    return docxCanvases.map((c) => `${c.width}x${c.height} (tinta ${inkRatio(c)})`).join(' / ');
  });

  await step('docx -> pdf', async () => {
    const blob = await canvasesToPdf(docxCanvases);
    await save('desde-docx.pdf', blob);
    return blob.size + ' bytes';
  });

  await step('docx -> png', async () => {
    const blob = await new Promise((res) => docxCanvases[0].toBlob(res, 'image/png'));
    await save('desde-docx.png', blob);
    return blob.size + ' bytes';
  });

  await step('docx: miniatura', async () => {
    const preview = await docxPreview(docxBytes);
    return `${preview.pages} pag, ${preview.width}x${preview.height}, imagen ${preview.dataUrl.length} chars`;
  });

  await step('zip de paginas', async () => {
    const blob = await zipFiles([
      { name: 'pagina-1.png', blob: new Blob(['uno']) },
      { name: 'pagina-2.png', blob: new Blob(['dos']) },
    ]);
    await save('paginas.zip', blob);
    return blob.size + ' bytes';
  });

  await step('pdf -> png (2 paginas, zip)', async () => {
    const pages = [];
    for (let i = 0; i < canvases.length; i++) {
      const blob = await new Promise((res) => canvases[i].toBlob(res, 'image/png'));
      pages.push({ blob, name: `texto-pagina-${i + 1}.png` });
    }
    const zip = await zipFiles(pages);
    await save('pdf-a-png.zip', zip);
    return zip.size + ' bytes';
  });

  await step('docx -> jpg (1 pagina)', async () => {
    const blob = await new Promise((res) => docxCanvases[0].toBlob(res, 'image/jpeg', 0.92));
    await save('docx-a-jpg.jpg', blob);
    return blob.size + ' bytes';
  });

  await step('imagen -> docx', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00d0d0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#04121a';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('Filee', 40, 180);
    const blob = await imageToDocx(canvas);
    await save('imagen-a-docx.docx', blob);
    return blob.size + ' bytes';
  });

  try {
    doc?.destroy?.();
  } catch {
    /* nada */
  }

  push('FIN');
  await fetch('/report', { method: 'POST', body: log.join('\n') });
  document.title = 'DONE';
}

run().catch(async (err) => {
  push('ERROR GENERAL :: ' + (err && (err.stack || err.message || err)));
  try {
    await fetch('/report', { method: 'POST', body: log.join('\n') });
  } catch {
    /* nada */
  }
  document.title = 'DONE';
});

