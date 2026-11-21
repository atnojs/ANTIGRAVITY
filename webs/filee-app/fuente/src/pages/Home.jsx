import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../icons.jsx';
import { Button, Empty, Select } from '../ui.jsx';
import { useSettings } from '../state.jsx';
import { CONVERTIBLE, PROFILES } from '../profiles.js';
import { convertImage, downloadBlob, humanSize, makePreview } from '../convert.js';

const TYPE_LABEL = { svg: 'SVG', pdf: 'PDF', png: 'PNG', jpg: 'JPG', webp: 'WEBP', avif: 'AVIF', ico: 'ICO', error: 'ERR' };

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
  const [profileId, setProfileId] = useState('default');
  const [converting, setConverting] = useState(null);
  const [lastDone, setLastDone] = useState(null);
  const [preview, setPreview] = useState(null);
  const input = useRef(null);
  const blobs = useRef(new Map());

  const profile = PROFILES.find((p) => p.id === profileId) || PROFILES[0];
  const formats = profile.formats;

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

  useEffect(() => {
    if (!preview) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  /* ── Preparar: no se convierte nada todavía ───────────────────── */
  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      toast('En esta réplica se pueden preparar imágenes. El resto de formatos los convierte la app de escritorio.');
      return;
    }
    setLastDone(null);
    setPending((list) => [
      ...list,
      ...images.map((f) => ({
        id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 7)}`,
        file: f,
        name: f.name,
        size: f.size,
        dims: null,
        preview: null,
      })),
    ]);
    images.forEach(async (f) => {
      try {
        const { dataUrl, width, height } = await makePreview(f);
        setPending((list) => list.map((it) => (it.file === f ? { ...it, preview: dataUrl, dims: `${width}×${height}` } : it)));
      } catch {
        /* sin vista previa */
      }
    });
    if (images.length < files.length) {
      toast(`${files.length - images.length} archivo(s) no son imágenes y se han omitido.`);
    }
  };

  /* ── Convertir al elegir formato en el menú ───────────────────── */
  const convertAll = async (format) => {
    if (!pending.length || converting) return;
    if (!CONVERTIBLE.has(format)) {
      toast(`${format} lo convierte la app de escritorio; en el navegador no está disponible.`);
      return;
    }
    setConverting(format);
    setLastDone(null);
    const results = [];
    for (const item of pending) {
      try {
        const { blob, ext } = await convertImage(item.file, format);
        const name = `${item.name.replace(/\.[^.]+$/, '')}.${ext}`;
        blobs.current.set(name, blob);
        results.push({ name, type: ext, size: blob.size });
      } catch (err) {
        toast(String(err.message || err));
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

  const openFile = (item) => {
    const blob = blobs.current.get(item.file);
    if (!blob) {
      toast('Entrada de ejemplo: prepara una imagen y elige un formato para convertirla de verdad.');
      return;
    }
    downloadBlob(blob, item.file);
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

          {pending.length === 0 ? (
            <p className="pending-empty">La imagen que sueltes aparecerá aquí y no se tocará hasta que elijas un formato.</p>
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
                        {humanSize(p.size)}
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
          <Select id="home-profile" value={profileId} onChange={setProfileId} options={PROFILES.map((p) => ({ value: p.id, label: p.label }))} width="100%" />
          <p className="home-col-note">
            {profile.formats.length} formatos en este perfil. El menú circular de la derecha los muestra; pulsa uno para convertir.
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
                  <text transform={`translate(${point(80, s.mid)[0].toFixed(1)} ${point(80, s.mid)[1].toFixed(1)})`}>{s.name}</text>
                </g>
              ))}
              <circle className="menu-hub" r="52" />
              <text className="menu-hub-title" x="0" y="-4">
                {converting ? 'Convirtiendo' : profile.label}
              </text>
              <text className="menu-hub-hint" x="0" y="12">
                {converting ? converting : `${profile.formats.length} formatos`}
              </text>
            </svg>
          </div>
          <p className="menu-hint">
            {converting
              ? 'Generando el archivo…'
              : pending.length
                ? lastDone
                  ? `Listo: ${lastDone}. La imagen sigue preparada: pulsa otro formato para volver a convertirla.`
                  : 'Pasa el ratón por una porción para resaltarla y pulsa para convertir.'
                : 'Cuando prepares una imagen, el menú se activa.'}
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
