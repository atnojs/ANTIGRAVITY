import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../icons.jsx';
import { Button, Empty, Select } from '../ui.jsx';
import { useSettings } from '../state.jsx';
import { CONVERTIBLE, PROFILES } from '../profiles.js';
import {
  canvasBlobOf,
  convertImage,
  downloadBlob,
  humanSize,
  icoFromCanvas,
  makePreview,
  toCanvas,
} from '../convert.js';
import {
  canvasesToDocx,
  canvasesToPdf,
  docxPreview,
  docxToCanvases,
  fileKind,
  imageToDocx,
  openPdf,
  pdfPreview,
  pdfToCanvases,
  pdfToDocx,
  zipFiles,
} from '../docs.js';

const TYPE_LABEL = {
  svg: 'SVG',
  pdf: 'PDF',
  png: 'PNG',
  jpg: 'JPG',
  webp: 'WEBP',
  avif: 'AVIF',
  ico: 'ICO',
  docx: 'DOCX',
  error: 'ERR',
};

const KIND_LABEL = { image: 'Imagen', pdf: 'PDF', docx: 'DOCX' };

const point = (r, deg) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];

function segmentPath(a0, a1, ro, ri) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = point(ro, a0);
  const [x1, y1] = point(ro, a1);
  const [x2, y2] = point(ri, a1);
  const [x3, y3] = point(ri, a0);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${ro} ${ro} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${ri} ${ri} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}

function toast(text) {
  window.dispatchEvent(new CustomEvent('filee-toast', { detail: text }));
}

/** Nombre sin extensión. */
const baseName = (name) => String(name || 'archivo').replace(/\.[^.]+$/, '');

/** Salidas de imagen a partir de una o varias páginas. */
async function imageOutputs(canvases, base, fmt) {
  if (fmt === 'ico') {
    const blob = await icoFromCanvas(canvases[0]);
    return [{ blob, name: `${base}.ico`, type: 'ico' }];
  }
  const mime = fmt === 'jpg' ? 'image/jpeg' : `image/${fmt}`;
  const pages = [];
  for (let i = 0; i < canvases.length; i++) {
    const blob = await canvasBlobOf(canvases[i], mime, fmt === 'jpg' ? 0.92 : undefined);
    if (!blob) throw new Error(`El navegador no puede generar ${fmt.toUpperCase()}`);
    pages.push({ blob, name: canvases.length > 1 ? `${base}-pagina-${i + 1}.${fmt}` : `${base}.${fmt}` });
  }
  if (pages.length === 1) return [{ blob: pages[0].blob, name: pages[0].name, type: fmt }];
  const zip = await zipFiles(pages);
  return [{ blob: zip, name: `${base}-${fmt}.zip`, type: fmt }];
}

export default function Home() {
  const { settings, addHistory, set, toggleFormat } = useSettings();
  const [pending, setPending] = useState([]);
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(null);
  const [converting, setConverting] = useState(null);
  const [lastDone, setLastDone] = useState(null);
  const [preview, setPreview] = useState(null);
  /** Zoom de la vista previa: escala y desplazamiento en píxeles. */
  const [zoom, setZoom] = useState({ scale: 1, x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const input = useRef(null);
  const blobs = useRef(new Map());
  const lightbox = useRef(null);
  const lightboxImg = useRef(null);
  const panStart = useRef(null);

  const profile = PROFILES.find((p) => p.id === settings.profile) || PROFILES[0];
  // Sólo los formatos marcados en «Perfil» llegan al círculo, y en el orden del perfil.
  const checked = settings.profileFormats?.[profile.id] ?? profile.formats;
  const formats = useMemo(() => profile.formats.filter((f) => checked.includes(f)).slice(0, 8), [profile, checked]);

  const segments = useMemo(() => {
    const step = 360 / Math.max(formats.length, 1);
    return formats.map((name, i) => {
      const a0 = i * step + 1.2;
      const a1 = (i + 1) * step - 1.2;
      return { name, d: segmentPath(a0, a1, 104, 56), mid: (a0 + a1) / 2 };
    });
  }, [formats]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return settings.history;
    return settings.history.filter((h) => `${h.title} ${h.file} ${h.type}`.toLowerCase().includes(q));
  }, [settings.history, query]);

  /* ── Vista previa ampliable: rueda para acercar, arrastrar para mover ── */
  const clampZoom = (value) => Math.min(6, Math.max(1, value));

  /** Limita el desplazamiento para que la imagen no se pierda de vista. */
  const limitPan = (next) => {
    const img = lightboxImg.current;
    if (!img || next.scale <= 1) return { scale: next.scale, x: 0, y: 0 };
    const maxX = ((next.scale - 1) * img.offsetWidth) / 2;
    const maxY = ((next.scale - 1) * img.offsetHeight) / 2;
    return { ...next, x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
  };

  /** Acerca o aleja alrededor del centro de la imagen (botones y teclas). */
  function zoomBy(factor) {
    setZoom((z) => limitPan({ ...z, scale: clampZoom(z.scale * factor) }));
  }

  /** Doble clic en la vista: tamaño normal o 2× en el punto pulsado. */
  const toggleZoomAt = (e) => {
    if (e.target.closest('button')) return;
    e.stopPropagation();
    if (zoom.scale > 1) {
      setZoom({ scale: 1, x: 0, y: 0 });
      return;
    }
    const img = lightboxImg.current;
    if (!img) return;
    const box = img.getBoundingClientRect();
    const cx = e.clientX - (box.left + box.width / 2);
    const cy = e.clientY - (box.top + box.height / 2);
    setZoom(limitPan({ scale: 2, x: -cx, y: -cy }));
  };

  const startPan = (e) => {
    if (zoom.scale <= 1 || e.button !== 0) return;
    if (e.target.closest('button')) return;
    panStart.current = { px: e.clientX, py: e.clientY, x: zoom.x, y: zoom.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPanning(true);
  };

  const movePan = (e) => {
    const start = panStart.current;
    if (!start) return;
    setZoom((z) => limitPan({ ...z, x: start.x + (e.clientX - start.px), y: start.y + (e.clientY - start.py) }));
  };

  const endPan = () => {
    panStart.current = null;
    setPanning(false);
  };

  // El zoom arranca limpio en cada vista previa y la rueda amplía sobre el cursor.
  useEffect(() => {
    setZoom({ scale: 1, x: 0, y: 0 });
    setPanning(false);
    panStart.current = null;
  }, [preview]);

  useEffect(() => {
    const el = lightbox.current;
    if (!preview || !el) return;
    const onWheel = (e) => {
      e.preventDefault();
      setZoom((z) => {
        const scale = clampZoom(z.scale * Math.exp(-e.deltaY * 0.0018));
        if (scale === z.scale) return z;
        if (scale === 1) return { scale: 1, x: 0, y: 0 };
        const img = lightboxImg.current;
        const box = (img || lightbox.current)?.getBoundingClientRect();
        if (!box) return z;
        // El rect ya está transformado: su centro es el centro del diseño más
        // (x, y), así que se deshace el desplazamiento para anclar el cursor.
        const cx = e.clientX - (box.left + box.width / 2 - z.x);
        const cy = e.clientY - (box.top + box.height / 2 - z.y);
        return limitPan({ scale, x: cx - ((cx - z.x) * scale) / z.scale, y: cy - ((cy - z.y) * scale) / z.scale });
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      el.removeEventListener('wheel', onWheel);
      document.body.style.overflow = previous;
    };
  }, [preview]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setPreview(null);
      else if (e.key === '+' || e.key === '=') zoomBy(1.3);
      else if (e.key === '-') zoomBy(1 / 1.3);
      else if (e.key === '0') setZoom({ scale: 1, x: 0, y: 0 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  /* ── Preparar: no se convierte nada todavía ───────────────────── */
  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const accepted = files
      .map((f) => ({ file: f, kind: fileKind(f) }))
      .filter((x) => x.kind !== 'other');
    const rejected = files.length - accepted.length;
    if (!accepted.length) {
      toast('Formatos admitidos: imágenes (JPG, PNG, WEBP, AVIF, ICO…), PDF y DOCX.');
      return;
    }
    setLastDone(null);
    setPending((list) => [
      ...list,
      ...accepted.map(({ file: f, kind }) => ({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        name: f.name,
        size: f.size,
        kind,
        pages: null,
        dims: null,
        preview: null,
      })),
    ]);

    accepted.forEach(async ({ file: f, kind }) => {
      const patch = (data) =>
        setPending((list) => list.map((it) => (it.file === f ? { ...it, ...data } : it)));
      try {
        if (kind === 'image') {
          const { dataUrl, width, height } = await makePreview(f);
          patch({ preview: dataUrl, dims: `${width}×${height}`, pages: 1 });
        } else if (kind === 'pdf') {
          const { dataUrl, width, height, pages } = await pdfPreview(f);
          patch({ preview: dataUrl, dims: `${width}×${height}`, pages });
        } else if (kind === 'docx') {
          const { dataUrl, width, height, pages } = await docxPreview(await f.arrayBuffer());
          patch({ preview: dataUrl, dims: `${width}×${height}`, pages: pages || 1 });
        }
      } catch (err) {
        toast(`No se pudo leer ${f.name}: ${err?.message || err}`);
      }
    });

    if (rejected) {
      toast(`${rejected} archivo(s) con formato no admitido se han omitido.`);
    }
  };

  /** Convierte un elemento preparado al formato pedido. */
  const convertItem = async (item, format) => {
    const fmt = format.toLowerCase();
    const base = baseName(item.name);

    if (item.kind === 'image') {
      if (fmt === 'docx') {
        const canvas = await toCanvas(item.file, null);
        return [{ blob: await imageToDocx(canvas), name: `${base}.docx`, type: 'docx' }];
      }
      const { blob, ext } = await convertImage(item.file, format);
      return [{ blob, name: `${base}.${ext}`, type: ext }];
    }

    if (item.kind === 'pdf') {
      if (fmt === 'pdf') return [{ blob: item.file, name: `${base}.pdf`, type: 'pdf' }];
      const doc = await openPdf(item.file);
      try {
        if (fmt === 'docx') {
          return [{ blob: await pdfToDocx(doc), name: `${base}.docx`, type: 'docx' }];
        }
        const canvases = await pdfToCanvases(doc, 2200);
        return await imageOutputs(canvases, base, fmt);
      } finally {
        try {
          doc.destroy?.();
        } catch {
          /* nada */
        }
      }
    }

    // .docx
    if (fmt === 'docx') return [{ blob: item.file, name: `${base}.docx`, type: 'docx' }];
    const canvases = await docxToCanvases(await item.file.arrayBuffer(), 2200);
    if (fmt === 'pdf') {
      return [{ blob: await canvasesToPdf(canvases), name: `${base}.pdf`, type: 'pdf' }];
    }
    return await imageOutputs(canvases, base, fmt);
  };

  /* ── Convertir al elegir formato en el menú ───────────────────── */
  const convertAll = async (format) => {
    if (!pending.length || converting || !formats.length) return;
    if (!CONVERTIBLE.has(format)) {
      toast(`${format} lo convierte la app de escritorio; en el navegador no está disponible.`);
      return;
    }
    setConverting(format);
    setLastDone(null);
    const results = [];
    for (const item of pending) {
      try {
        const out = await convertItem(item, format);
        for (const r of out) {
          blobs.current.set(r.name, r.blob);
          results.push({ name: r.name, type: r.type, size: r.blob.size });
        }
      } catch (err) {
        toast(String(err?.message || err));
      }
    }
    // El archivo se queda preparado: se puede volver a convertir a otro formato.
    setConverting(null);
    if (!results.length) return;
    setLastDone(results[0].name);

    results.forEach((r) =>
      addHistory({
        type: r.type,
        title: r.type === 'pdf' ? 'PDF' : `Convertido a ${r.type.toUpperCase()}`,
        file: r.name,
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        ok: true,
        real: true,
        size: r.size,
      }),
    );

    if (results.length === 1) downloadBlob(blobs.current.get(results[0].name), results[0].name);
    toast(results.length === 1 ? `Listo: ${results[0].name}` : `${results.length} archivos convertidos a ${format}`);
  };

  return (
    <>
      <h1 className="page-title">Inicio</h1>

      <div className="home-grid">
        {/* ── Zona izquierda: subida + miniatura ─────────────────── */}
        <section className="home-col home-col-upload" aria-label="Archivo">
          <div
            className={`dropzone${dragging ? ' is-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <span className="drop-icon">
              <Icon name="upload" />
            </span>
            <div className="drop-copy">
              <p className="drop-title">Suelta archivos aquí</p>
              <p className="drop-sub">Imágenes, PDF y DOCX · o mantén Ctrl mientras arrastras en el Explorador</p>
            </div>
            <button type="button" className="drop-link" onClick={() => input.current?.click()}>
              Elegir archivo
            </button>
            <input
              ref={input}
              type="file"
              accept="image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {pending.length === 0 ? (
            <p className="pending-empty">
              El archivo que sueltes aparecerá aquí y no se tocará hasta que elijas un formato. Se admiten imágenes, PDF y DOCX.
            </p>
          ) : (
            <ul className="pending-list">
              {pending.map((p) => (
                <li key={p.id} className="pending-card">
                  <button type="button" className="pending-figure" onClick={() => setPreview(p)} aria-label={`Ver ${p.name} en grande`}>
                    {p.preview ? <img src={p.preview} alt={p.name} /> : <span className="pending-loading">Preparando vista previa…</span>}
                  </button>
                  <div className="pending-bar">
                    <div className="pending-meta">
                      <span className="pending-name" title={p.name}>
                        {p.name}
                      </span>
                      <span className="pending-sub">
                        {KIND_LABEL[p.kind] || 'Archivo'}
                        {p.pages && p.pages > 1 ? ` · ${p.pages} pág.` : ''} · {humanSize(p.size)}
                        {p.dims ? ` · ${p.dims}` : ''}
                      </span>
                    </div>
                    <button type="button" className="icon-btn" aria-label={`Quitar ${p.name}`} onClick={() => setPending((list) => list.filter((x) => x.id !== p.id))}>
                      <Icon name="close" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pending.length > 1 ? (
            <button type="button" className="link-btn pending-clear" onClick={() => setPending([])}>
              Vaciar la lista
            </button>
          ) : null}
        </section>

        {/* ── Zona central: perfil activo ────────────────────────── */}
        <section className="home-col home-col-profile" aria-label="Perfil activo">
          <h2 className="home-col-title">Perfil</h2>
          <label className="field-label" htmlFor="home-profile">
            Perfil activo
          </label>
          <Select id="home-profile" value={profile.id} onChange={(v) => set({ profile: v })} options={PROFILES.map((p) => ({ value: p.id, label: p.label }))} width="100%" />
          <div className="format-list" role="group" aria-label="Formatos del menú circular">
            <p className="field-label">Formatos del menú circular</p>
            {profile.formats.map((f) => {
              const on = formats.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  className={`format-row${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => toggleFormat(profile.id, f)}
                >
                  <span>{f}</span>
                  <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true">
                    <span className="switch-track">
                      <span className="switch-knob" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="home-col-note">
            {formats.length
              ? `${formats.length === 1 ? '1 formato marcado' : `${formats.length} formatos marcados`} · el círculo de la derecha los muestra. Pulsa uno para convertir.`
              : 'Ningún formato marcado: el círculo está vacío. Marca en la lista los formatos que quieras ver.'}
          </p>
          <p className="home-col-note muted">
            {pending.length ? `${pending.length} archivo(s) listos.` : 'Sin archivos preparados.'}
          </p>
        </section>

        {/* ── Zona derecha: menú circular ────────────────────────── */}
        <section className={`home-col home-col-menu${pending.length ? ' is-active' : ''}`} aria-label="Menú circular">
          <h2 className="home-col-title">Menú circular</h2>
          <div className="menu-stage">
            <svg viewBox="-120 -120 240 240" className="menu-svg" role="group" aria-label={`Formatos de ${profile.label}`}>
              <circle className="menu-back" r="112" />
              {!segments.length ? <circle className="menu-empty" r="96" /> : null}
              {segments.map((s, i) => (
                <g
                  key={s.name}
                  className={`menu-seg${hover === i ? ' is-hover' : ''}${converting === s.name ? ' is-busy' : ''}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => convertAll(s.name)}
                  role="button"
                  tabIndex={pending.length && !converting && formats.length ? 0 : -1}
                  aria-label={`Convertir a ${s.name}`}
                  aria-disabled={!pending.length || !!converting || !formats.length}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      convertAll(s.name);
                    }
                  }}
                >
                  <path d={s.d} />
                  <text transform={`translate(${point(80, s.mid)[0].toFixed(1)} ${point(80, s.mid)[1].toFixed(1)})`}>{s.name}</text>
                </g>
              ))}
              <circle className="menu-hub" r="52" />
              <text className="menu-hub-title" x="0" y="-4">
                {converting ? 'Convirtiendo' : profile.label}
              </text>
              <text className="menu-hub-hint" x="0" y="12">
                {converting ? converting : formats.length ? `${formats.length} formatos` : 'sin formatos'}
              </text>
            </svg>
          </div>
          <p className="menu-hint">
            {converting
              ? 'Generando el archivo…'
              : !formats.length
                ? 'Marca formatos en «Perfil» y aparecerán aquí.'
                : pending.length
                  ? lastDone
                    ? `Listo: ${lastDone}. El archivo sigue preparado: pulsa otro formato para volver a convertirlo.`
                    : 'Pasa el ratón por una porción para resaltarla y pulsa para convertir.'
                  : 'Cuando prepares un archivo, el menú se activa.'}
          </p>
        </section>
      </div>

      <div className="section-row">
        <h2 className="section-title">Conversiones recientes</h2>
        <Button
          variant="ghost"
          disabled={!settings.history.length}
          onClick={() => {
            set({ history: [] });
            toast('Historial borrado');
          }}
        >
          Borrar
        </Button>
      </div>

      <div className="search">
        <Icon name="search" />
        <input type="search" placeholder="Buscar" aria-label="Buscar en el historial" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {items.length === 0 ? (
        <Empty icon="clock" title={query ? 'Ningún resultado para esa búsqueda.' : 'Todavía no hay conversiones.'}>
          {query ? null : <p className="empty-sub">Prepara un archivo, elige un formato en el menú circular y aparecerá aquí.</p>}
        </Empty>
      ) : (
        <ul className="history">
          {items.map((h) => (
            <li key={h.id} className="history-item">
              <span className={`badge badge-${h.type}`}>{TYPE_LABEL[h.type] || h.type.toUpperCase()}</span>
              <div className="history-main">
                <span className="history-title">{h.title}</span>
                <span className="history-meta">
                  {h.file} <i>·</i> {h.time}
                  {h.size ? (
                    <>
                      {' '}
                      <i>·</i> {humanSize(h.size)}
                    </>
                  ) : null}
                </span>
              </div>
              {h.ok ? <Icon name="check" className="history-ok" /> : null}
              <div className="history-actions">
                <button type="button" className="icon-btn" aria-label="Abrir con" onClick={() => toast('En la app de escritorio se elige el programa con el que abrir.')}>
                  <Icon name="external" />
                </button>
                <Button variant="ghost" icon="folderOpen" onClick={() => toast('La carpeta del archivo solo existe en la app de escritorio.')}>
                  Abrir carpeta
                </Button>
                <Button
                  variant="ghost"
                  icon="undo"
                  onClick={() => {
                    set({ history: settings.history.filter((x) => x.id !== h.id) });
                    toast('Entrada retirada del historial');
                  }}
                >
                  Deshacer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="foot-note">La conversión se ejecuta en tu navegador: los archivos no salen de este equipo.</p>

      {preview ? (
        <div
          className={`lightbox${panning ? ' is-panning' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={`Vista previa de ${preview.name}`}
          onClick={() => setPreview(null)}
        >
          <figure
            className="lightbox-figure"
            ref={lightbox}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={toggleZoomAt}
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
          >
            {preview.preview ? (
              <img
                ref={lightboxImg}
                className={`lightbox-img${zoom.scale > 1 ? ' is-zoomed' : ''}`}
                src={preview.preview}
                alt={preview.name}
                draggable={false}
                style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` }}
              />
            ) : null}
            <figcaption>
              <span>
                {preview.name}
                {preview.pages && preview.pages > 1 ? ` · ${preview.pages} páginas` : ''}
                {preview.dims ? ` · ${preview.dims}` : ''}
              </span>
              <div className="lightbox-tools">
                <button type="button" className="icon-btn" aria-label="Alejar" title="Alejar (rueda hacia abajo)" onClick={() => zoomBy(1 / 1.3)}>
                  <Icon name="minus" />
                </button>
                <span className="lightbox-zoom" aria-live="polite">
                  {Math.round(zoom.scale * 100)}%
                </span>
                <button type="button" className="icon-btn" aria-label="Acercar" title="Acercar (rueda hacia arriba)" onClick={() => zoomBy(1.3)}>
                  <Icon name="plus" />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Tamaño normal"
                  title="Tamaño normal (doble clic)"
                  onClick={() => setZoom({ scale: 1, x: 0, y: 0 })}
                >
                  <Icon name="undo" />
                </button>
                <button type="button" className="icon-btn" aria-label="Cerrar la vista previa" onClick={() => setPreview(null)}>
                  <Icon name="close" />
                </button>
              </div>
            </figcaption>
            <p className="lightbox-hint">Rueda del ratón: ampliar · arrastrar: mover · doble clic: tamaño normal · Esc: cerrar</p>
          </figure>
        </div>
      ) : null}
    </>
  );
}
