import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../icons.jsx';
import { Button, Empty } from '../ui.jsx';
import { useSettings } from '../state.jsx';
import { convertImage, downloadBlob, humanSize } from '../convert.js';

const FORMATS = ['JPG', 'PNG', 'WEBP', 'PDF', 'ICO'];
const TYPE_LABEL = { svg: 'SVG', pdf: 'PDF', png: 'PNG', jpg: 'JPG', webp: 'WEBP', ico: 'ICO', error: 'ERR' };

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

export default function Home() {
  const { settings, addHistory, set } = useSettings();
  const [pending, setPending] = useState([]);
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(null);
  const [converting, setConverting] = useState(null); // formato en curso
  const [preview, setPreview] = useState(null); // imagen ampliada
  const input = useRef(null);
  const urls = useRef(new Map());

  useEffect(() => {
    if (!preview) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  const segments = useMemo(() => {
    const step = 360 / FORMATS.length;
    return FORMATS.map((name, i) => {
      const a0 = i * step + 1.4;
      const a1 = (i + 1) * step - 1.4;
      return { name, d: segmentPath(a0, a1, 104, 58), mid: (a0 + a1) / 2 };
    });
  }, []);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return settings.history;
    return settings.history.filter((h) => `${h.title} ${h.file} ${h.type}`.toLowerCase().includes(q));
  }, [settings.history, query]);

  /* ── Añadir archivos: solo se preparan, no se convierten ───────── */
  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      toast('En esta réplica se pueden preparar imágenes. El resto de formatos los convierte la app de escritorio.');
      return;
    }
    setPending((list) => [
      ...list,
      ...images.map((f) => ({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        name: f.name,
        size: f.size,
        dims: null,
        preview: URL.createObjectURL(f),
      })),
    ]);
    // Las dimensiones se leen aparte para no retrasar la vista previa.
    images.forEach(async (f) => {
      try {
        const bmp = await createImageBitmap(f);
        const dims = `${bmp.width}×${bmp.height}`;
        setPending((list) => list.map((it) => (it.file === f ? { ...it, dims } : it)));
      } catch {
        /* sin dimensiones */
      }
    });
    if (images.length < files.length) {
      toast(`${files.length - images.length} archivo(s) no son imágenes y se han omitido.`);
    }
  };

  /* ── Convertir cuando el usuario elige un formato ─────────────── */
  const convertAll = async (format) => {
    if (!pending.length || converting) return;
    setConverting(format);
    const results = [];
    for (const item of pending) {
      try {
        const { blob, ext } = await convertImage(item.file, format);
        const name = `${item.name.replace(/\.[^.]+$/, '')}.${ext}`;
        urls.current.set(name, URL.createObjectURL(blob));
        results.push({ name, type: ext, size: blob.size });
      } catch (err) {
        toast(String(err.message || err));
      }
    }
    pending.forEach((p) => URL.revokeObjectURL(p.preview));
    setPending([]);
    setConverting(null);

    if (!results.length) return;

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

    if (results.length === 1) {
      const blob = await (await fetch(urls.current.get(results[0].name))).blob();
      downloadBlob(blob, results[0].name);
    }
    toast(results.length === 1 ? `Listo: ${results[0].name}` : `${results.length} archivos convertidos a ${format}`);
  };

  const openFile = async (item) => {
    const url = urls.current.get(item.file);
    if (!url) {
      toast('Entrada de ejemplo: prepara una imagen y elige un formato para convertirla de verdad.');
      return;
    }
    downloadBlob(await (await fetch(url)).blob(), item.file);
  };

  return (
    <>
      <h1 className="page-title">Inicio</h1>

      <div className="workspace">
        <div className="workspace-main">
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
              <p className="drop-sub">o mantén Ctrl mientras arrastras en el Explorador</p>
            </div>
            <button type="button" className="drop-link" onClick={() => input.current?.click()}>
              Elegir archivo
            </button>
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {pending.length > 0 ? (
            <div className="pending">
              <div className="section-row">
                <h2 className="section-title">Preparados ({pending.length})</h2>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    pending.forEach((p) => URL.revokeObjectURL(p.preview));
                    setPending([]);
                  }}
                >
                  Vaciar
                </button>
              </div>
              <ul className="pending-list">
                {pending.map((p) => (
                  <li key={p.id} className="pending-item">
                    <button type="button" className="pending-thumb-btn" onClick={() => setPreview(p)} aria-label={`Ver ${p.name} en grande`}>
                      <img src={p.preview} alt="" className="pending-thumb" />
                    </button>
                    <div className="pending-meta">
                      <span className="pending-name">{p.name}</span>
                      <span className="pending-sub">
                        {humanSize(p.size)}
                        {p.dims ? ` · ${p.dims}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Quitar ${p.name}`}
                      onClick={() => {
                        URL.revokeObjectURL(p.preview);
                        setPending((list) => list.filter((x) => x.id !== p.id));
                      }}
                    >
                      <Icon name="close" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="pending-empty">Suelta una imagen: aparecerá aquí y no se tocará hasta que elijas un formato.</p>
          )}
        </div>

        <div className={`menu-panel${pending.length ? ' is-active' : ''}`}>
          <h2 className="section-title">Menú circular</h2>
          <div className="menu-stage">
            <svg viewBox="-120 -120 240 240" className="menu-svg" role="group" aria-label="Elegir formato de destino">
              <circle className="menu-back" r="112" />
              {segments.map((s, i) => (
                <g
                  key={s.name}
                  className={`menu-seg${hover === i ? ' is-hover' : ''}${converting === s.name ? ' is-busy' : ''}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => convertAll(s.name)}
                  role="button"
                  tabIndex={pending.length && !converting ? 0 : -1}
                  aria-label={`Convertir a ${s.name}`}
                  aria-disabled={!pending.length || !!converting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      convertAll(s.name);
                    }
                  }}
                >
                  <path d={s.d} />
                  <text transform={`translate(${point(81, s.mid)[0].toFixed(1)} ${point(81, s.mid)[1].toFixed(1)})`}>{s.name}</text>
                </g>
              ))}
              <circle className="menu-hub" r="54" />
              <text className="menu-hub-title" x="0" y="-2">
                {converting ? 'Convirtiendo' : pending.length ? (pending.length === 1 ? '1 listo' : `${pending.length} listos`) : 'Sin archivos'}
              </text>
              <text className="menu-hub-hint" x="0" y="12">
                {converting ? converting : pending.length ? 'elige un formato' : 'suelta una imagen'}
              </text>
            </svg>
          </div>
          <p className="menu-hint">
            {converting
              ? 'Generando el archivo…'
              : pending.length
                ? 'Pulsa un formato para convertir. Hasta entonces no se toca la imagen.'
                : 'Cuando prepares una imagen, este menú se activa.'}
          </p>
        </div>
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
          {query ? null : <p className="empty-sub">Prepara una imagen, elige un formato en el menú circular y aparecerá aquí.</p>}
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
                <Button variant="ghost" icon="file" onClick={() => openFile(h)}>
                  Abrir archivo
                </Button>
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

      <p className="foot-note">La conversión se ejecuta en tu navegador: la imagen no sale de este equipo.</p>

      {preview ? (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={preview.name} onClick={() => setPreview(null)}>
          <figure className="lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img src={preview.preview} alt={preview.name} />
            <figcaption>
              <span>
                {preview.name}
                {preview.dims ? ` · ${preview.dims}` : ''}
              </span>
              <button type="button" className="icon-btn" aria-label="Cerrar la vista previa" onClick={() => setPreview(null)}>
                <Icon name="close" />
              </button>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}
