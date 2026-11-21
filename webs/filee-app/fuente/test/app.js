// Prueba de integración: monta la app real, suelta un PDF y un DOCX y
// comprueba que se preparan y que se convierten con el menú circular.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App.jsx';
import '../src/styles.css';

const log = [];
const pre = document.getElementById('log');
const push = (line) => {
  log.push(line);
  pre.textContent = log.join('\n');
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(label, fn, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const value = fn();
      if (value) return value;
    } catch {
      /* sigue */
    }
    await sleep(100);
  }
  throw new Error('tiempo agotado esperando ' + label);
}

const toasts = [];
window.addEventListener('filee-toast', (e) => toasts.push(String(e.detail)));

const texts = () => [...document.querySelectorAll('.history-item')].map((el) => el.textContent);

async function clickFormat(label) {
  const seg = [...document.querySelectorAll('.menu-seg')].find(
    (el) => el.querySelector('text')?.textContent?.trim() === label,
  );
  if (!seg) throw new Error('no encuentro la porción ' + label);
  seg.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

async function run() {
  localStorage.clear();
  const root = createRoot(document.getElementById('root'));
  root.render(React.createElement(App));

  await waitFor('pantalla de Inicio', () => document.querySelector('.page-title')?.textContent === 'Inicio');
  push('OK   app montada y en Inicio');

  const pdfBytes = new Uint8Array(await (await fetch('./fixtures/texto.pdf')).arrayBuffer());
  const docxBytes = new Uint8Array(await (await fetch('./fixtures/informe.docx')).arrayBuffer());

  const dt = new DataTransfer();
  dt.items.add(new File([pdfBytes], 'texto.pdf', { type: 'application/pdf' }));
  dt.items.add(
    new File([docxBytes], 'informe.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
  );
  const zone = document.querySelector('.dropzone');
  zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));

  await waitFor('dos tarjetas preparadas', () => document.querySelectorAll('.pending-card').length === 2);
  push('OK   dos archivos preparados (PDF + DOCX)');

  const previews = await waitFor(
    'vistas previas',
    () => [...document.querySelectorAll('.pending-figure img')].filter((i) => i.src.startsWith('data:')).length === 2,
  );
  push('OK   vistas previas generadas: ' + previews);

  const subs = [...document.querySelectorAll('.pending-sub')].map((el) => el.textContent.trim());
  push('     meta: ' + subs.join(' | '));

  await clickFormat('PDF');
  await waitFor('conversión a PDF', () => texts().some((t) => t.includes('informe.pdf')) && texts().some((t) => t.includes('texto.pdf')));
  push('OK   PDF: ' + texts().filter((t) => t.includes('.pdf')).slice(0, 3).join(' || '));

  await clickFormat('JPG');
  await waitFor('conversión a JPG', () => texts().some((t) => t.includes('informe.jpg')) && texts().some((t) => t.includes('texto-jpg.zip')));
  push('OK   JPG: ' + texts().filter((t) => t.includes('.jpg') || t.includes('.zip')).slice(0, 3).join(' || '));

  await clickFormat('DOCX');
  await waitFor('conversión a DOCX', () => texts().filter((t) => t.includes('.docx')).length >= 2);
  push('OK   DOCX: ' + texts().filter((t) => t.includes('.docx')).slice(0, 3).join(' || '));

  push('avisos: ' + (toasts.length ? toasts.join(' / ') : 'ninguno'));
  push('FIN');
  await fetch('/report', { method: 'POST', body: log.join('\n') });
  document.title = 'DONE';
}

run().catch(async (err) => {
  push('FAIL :: ' + (err && (err.stack || err.message || err)));
  push('avisos: ' + (toasts.length ? toasts.join(' / ') : 'ninguno'));
  try {
    await fetch('/report', { method: 'POST', body: log.join('\n') });
  } catch {
    /* nada */
  }
  document.title = 'DONE';
});
