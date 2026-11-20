import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEMO_FILES, DONUT_FORMATS } from '../data.js';
import Icon from '../icons.jsx';

const SIZE = 340; // diámetro máximo del menú circular
const RO = 104; // radio exterior (unidades del viewBox)
const RI = 60; // radio interior
const GAP = 2.4; // separación entre porciones, en grados
const VIEW = 220; // lado del viewBox

const rad = (deg) => (deg * Math.PI) / 180;
const point = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];

/** Path de una porción de corona entre dos ángulos (0° = arriba, sentido horario). */
function segmentPath(a0, a1, ro, ri) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = point(ro, a0);
  const [x1, y1] = point(ro, a1);
  const [x2, y2] = point(ri, a1);
  const [x3, y3] = point(ri, a0);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${ro} ${ro} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${ri} ${ri} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}

/** Devuelve el índice de porción que hay bajo un punto, o null si está fuera. */
function hitSegment(cx, cy, x, y, count) {
  const dx = x - cx;
  const dy = y - cy;
  const size = Math.min(SIZE, window.innerWidth * 0.84);
  const unit = Math.hypot(dx, dy) * (VIEW / size);
  if (unit < RI || unit > RO + 6) return null;
  let ang = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (ang < 0) ang += 360;
  return Math.floor(ang / (360 / count)) % count;
}

export default function Demo() {
  const [files, setFiles] = useState(DEMO_FILES);
  const [results, setResults] = useState([]);
  const [drag, setDrag] = useState(null); // { index, ox, oy } — origen del menú
  const [pointer, setPointer] = useState(null); // posición actual del puntero
  const [hover, setHover] = useState(null);
  const [ring, setRing] = useState(null); // { x, y, pct, done }
  const [hint, setHint] = useState('Arrastra un archivo al escenario');
  const [busy, setBusy] = useState(false);
  const raf = useRef(0);
  const fileRefs = useRef([]);

  const formats = drag ? DONUT_FORMATS[files[drag.index].kind] : [];

  const segments = useMemo(() => {
    const step = 360 / Math.max(formats.length, 1);
    return formats.map((name, i) => {
      const a0 = i * step + GAP / 2;
      const a1 = (i + 1) * step - GAP / 2;
      const mid = (a0 + a1) / 2;
      return { name, d: segmentPath(a0, a1, RO, RI), mid, label: point((RO + RI) / 2, mid) };
    });
  }, [formats]);

  const closeDonut = useCallback(() => {
    setDrag(null);
    setHover(null);
    setPointer(null);
  }, []);

  const convert = useCallback(
    (index, format, x, y) => {
      const source = files[index];
      const base = source.name.replace(/\.[^.]+$/, '');
      const out = `${base}.${format.toLowerCase()}`;
      closeDonut();
      setBusy(true);
      setRing({ x, y, pct: 0, done: false });

      const t0 = performance.now();
      const duration = 1100;
      const tick = (now) => {
        const pct = Math.min(100, ((now - t0) / duration) * 100);
        setRing((r) => (r ? { ...r, pct } : r));
        if (pct < 100) {
          raf.current = requestAnimationFrame(tick);
        } else {
          setRing((r) => (r ? { ...r, done: true } : r));
          setTimeout(() => {
            setRing(null);
            setBusy(false);
            setResults((prev) => [...prev, { name: out, type: format.toLowerCase() }]);
            setHint(`Listo: ${out}`);
          }, 700);
        }
      };
      raf.current = requestAnimationFrame(tick);
    },
    [closeDonut, files],
  );

  /* ── Arrastre con puntero ─────────────────────────────────────── */
  const onPointerDown = (index) => (e) => {
    if (busy) return;
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;
    setDrag({ index, ox: x, oy: y });
    setPointer({ x, y });
    setHover(null);
    setHint(`Suelta ${files[index].name} sobre un formato`);
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      setPointer({ x: e.clientX, y: e.clientY });
      const idx = hitSegment(drag.ox, drag.oy, e.clientX, e.clientY, formats.length);
      if (idx != null) setHover(idx);
    };
    const onUp = (e) => {
      const idx = hitSegment(drag.ox, drag.oy, e.clientX, e.clientY, formats.length);
      if (idx != null) convert(drag.index, formats[idx], e.clientX, e.clientY);
      else {
        closeDonut();
        setHint('Arrastra un archivo al escenario');
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', closeDonut);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', closeDonut);
    };
  }, [drag, formats, convert, closeDonut]);

  /* ── Teclado: Intro abre el menú, flechas eligen, Intro convierte ── */
  const openWithKeyboard = (index) => {
    const el = fileRefs.current[index];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    setDrag({ index, ox: x, oy: y });
    setPointer({ x, y });
    setHover(0);
    setHint(`Elige un formato para ${files[index].name}`);
  };

  const onFileKeyDown = (index) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (drag) {
        const idx = hover ?? 0;
        convert(drag.index, formats[idx], drag.ox, drag.oy);
      } else {
        openWithKeyboard(index);
      }
      return;
    }
    if (e.key === 'Escape' && drag) {
      closeDonut();
      setHint('Arrastra un archivo al escenario');
      return;
    }
    if (drag && ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Tab'].includes(e.key)) {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Tab' ? 1 : -1;
      setHover((h) => ((h ?? 0) + dir + formats.length) % formats.length);
    }
  };

  /* ── Archivos reales soltados sobre el escenario ──────────────── */
  const onDrop = async (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer?.files || []);
    if (!dropped.length) return;
    const images = dropped.filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      setHint('La demo del navegador solo convierte imágenes. El resto lo hace la app de escritorio.');
      return;
    }
    setBusy(true);
    setHint('Convirtiendo en local…');
    const added = [];
    for (const file of images) {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
        if (!blob) throw new Error('sin blob');
        added.push({
          name: `${file.name.replace(/\.[^.]+$/, '')}.png`,
          type: 'png',
          url: URL.createObjectURL(blob),
          size: blob.size,
        });
      } catch {
        added.push({ name: file.name, type: 'error' });
      }
    }
    setResults((prev) => [...prev, ...added]);
    setBusy(false);
    setHint(added.length === 1 ? `Listo: ${added[0].name}` : `Listo: ${added.length} archivos`);
    setFiles((prev) => [
      ...prev,
      ...images.map((f) => ({ name: f.name, type: (f.name.split('.').pop() || 'img').toLowerCase(), kind: 'image' })),
    ]);
  };

  const donutStyle = drag ? { left: drag.ox, top: drag.oy, width: SIZE } : undefined;

  return (
    <div className={`demo${drag ? ' is-dragging' : ''}`} aria-label="Pruébalo aquí" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className="demo-window">
        <div className="demo-titlebar">
          <span className="folder" aria-hidden="true" />
          <span>Pruébalo aquí</span>
          <span className="demo-controls" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>

        <ul className="demo-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              <button
                className={`file${drag?.index === i ? ' is-dragging' : ''}`}
                type="button"
                ref={(el) => {
                  fileRefs.current[i] = el;
                }}
                data-index={i}
                aria-label={f.name}
                aria-haspopup="true"
                aria-expanded={drag?.index === i}
                onPointerDown={onPointerDown(i)}
                onKeyDown={onFileKeyDown(i)}
              >
                <span className="file-icon" data-kind={f.kind === 'doc' ? 'doc' : f.kind} data-type={f.type}>
                  <b>{f.type.toUpperCase()}</b>
                </span>
                <span className="file-name">{f.name}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="demo-output">
          <p className="demo-output-title">Archivos convertidos</p>
          <ul className="demo-results" aria-live="polite">
            {results.length === 0 ? <li className="demo-empty">Aquí aparecerán tus archivos convertidos</li> : null}
            {results.map((r, i) => (
              <li key={`${r.name}-${i}`} data-type={r.type}>
                <b>{r.type.toUpperCase()}</b>
                {r.url ? (
                  <a href={r.url} download={r.name}>
                    {r.name}
                  </a>
                ) : (
                  <span>{r.name}</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <p className="demo-hint">
          <kbd>Ctrl</kbd>
          <span className="plus">+</span>
          <span>{hint}</span>
        </p>
      </div>

      <p className="sr-only">Con teclado: selecciona un archivo, pulsa Intro, elige con las flechas y pulsa Intro para convertir.</p>
      <p className="sr-only" role="status">
        {hint}
      </p>

      {ring ? (
        <div className={`ring${ring.done ? ' is-done' : ''} is-visible`} style={{ left: ring.x, top: ring.y }} aria-hidden="true">
          <svg viewBox="0 0 124 124">
            <circle className="disc" cx="62" cy="62" r="58" />
            <circle className="track" cx="62" cy="62" r="50" />
            <circle
              className="bar"
              cx="62"
              cy="62"
              r="50"
              strokeDasharray={2 * Math.PI * 50}
              strokeDashoffset={2 * Math.PI * 50 * (1 - ring.pct / 100)}
            />
            <circle className="ok" cx="62" cy="62" r="50" />
            <path className="tick" d="M42 62 L55 75 L82 48" />
            <text className="pct" x="62" y="62">
              {Math.round(ring.pct)}%
            </text>
          </svg>
        </div>
      ) : null}

      {drag && pointer ? (
        <div className="ghost" style={{ left: pointer.x, top: pointer.y }} aria-hidden="true">
          <span className="file-icon" data-kind={files[drag.index].kind} data-type={files[drag.index].type}>
            <b>{files[drag.index].type.toUpperCase()}</b>
          </span>
        </div>
      ) : null}

      <div className={`donut${drag ? ' is-open' : ''}`} style={donutStyle} aria-hidden={!drag}>
        {drag ? (
          <svg viewBox="-110 -110 220 220">
            <circle className="backing" cx="0" cy="0" r={RO + 8} />
            {segments.map((s, i) => (
              <g
                key={s.name}
                className={`seg${hover === i ? ' is-hover' : ''}`}
                data-seg={s.name}
                style={{ '--dx': `${6 * Math.sin(rad(s.mid))}px`, '--dy': `${-6 * Math.cos(rad(s.mid))}px` }}
                onPointerEnter={() => setHover(i)}
              >
                <path d={s.d} />
                <text transform={`translate(${s.label[0].toFixed(1)} ${s.label[1].toFixed(1)})`}>{s.name}</text>
              </g>
            ))}
            <circle className="hub" cx="0" cy="0" r={RI - 6} />
            <text className="hub-title" x="0" y="-4">
              {files[drag.index].name.split('.').pop().toUpperCase()}
            </text>
            <text className="hub-hint" x="0" y="9">
              suelta en un formato
            </text>
          </svg>
        ) : null}
      </div>
    </div>
  );
}
