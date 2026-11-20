import { useMemo, useState } from 'react';
import { Button, Card, Field, Segmented, Select, Slider, Switch } from '../ui.jsx';
import { useSettings } from '../state.jsx';
import { PROFILES } from '../profiles.js';

function toast(text) {
  window.dispatchEvent(new CustomEvent('filee-toast', { detail: text }));
}

const point = (r, deg) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];

function segmentPath(a0, a1, ro, ri) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = point(ro, a0);
  const [x1, y1] = point(ro, a1);
  const [x2, y2] = point(ri, a1);
  const [x3, y3] = point(ri, a0);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${ro} ${ro} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${ri} ${ri} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}

export default function Donut() {
  const { settings, set, toggle } = useSettings();
  const [profile, setProfile] = useState('default');
  const [active, setActive] = useState(['JPG', 'PNG', 'WEBP', 'PDF', 'AVIF', 'ICO']);
  const [hover, setHover] = useState(null);

  const current = PROFILES.find((p) => p.id === profile);
  const segments = useMemo(() => {
    const list = active.slice(0, 8);
    const step = 360 / Math.max(list.length, 1);
    return list.map((name, i) => {
      const a0 = i * step + 1.4;
      const a1 = (i + 1) * step - 1.4;
      return { name, d: segmentPath(a0, a1, 104, 58), mid: (a0 + a1) / 2 };
    });
  }, [active]);

  return (
    <>
      <h1 className="page-title">Menú circular</h1>
      <p className="lead-line">Ordena los formatos del menú que aparece junto al cursor. Cada perfil es un menú distinto.</p>

      <div className="donut-layout">
        <Card title="Perfil" className="donut-side">
          <Field label="Perfil activo">
            <Select
              value={profile}
              onChange={(v) => {
                setProfile(v);
                setActive(PROFILES.find((p) => p.id === v).formats.slice(0, 8));
              }}
              options={PROFILES.map((p) => ({ value: p.id, label: p.label }))}
              width="100%"
            />
          </Field>

          <div className="format-list">
            <p className="field-label">Formatos en la porción</p>
            {current.formats.map((f) => {
              const on = active.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  className={`format-row${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => setActive((list) => (on ? list.filter((x) => x !== f) : [...list, f]))}
                >
                  <span>{f}</span>
                  <Switch checked={on} onChange={() => setActive((list) => (on ? list.filter((x) => x !== f) : [...list, f]))} label="" />
                </button>
              );
            })}
          </div>

          <div className="row-actions">
            <Button icon="plus" onClick={() => toast('En la app de escritorio se elige el formato de una lista de 255.')}>
              Añadir formato
            </Button>
          </div>

          <Field label="Opacidad del menú circular">
            <Slider id="opacity" label="Opacidad del menú circular" min={40} max={100} value={settings.donutOpacity} suffix="%" onChange={(v) => set({ donutOpacity: v })} />
          </Field>
          <Field label="Anverso y reverso">
            <Segmented
              label="Cara"
              value="front"
              onChange={() => toast('El reverso se edita en la app de escritorio con las acciones de imagen.')}
              options={[
                { value: 'front', label: 'Anverso' },
                { value: 'back', label: 'Reverso' },
              ]}
            />
          </Field>
        </Card>

        <Card title="Vista previa" className="donut-preview">
          <div className="donut-stage" aria-hidden="true">
            <svg viewBox="-120 -120 240 240" className="donut-svg">
              <circle className="donut-back" r="112" />
              {segments.map((s, i) => (
                <g key={s.name} className={`donut-seg${hover === i ? ' is-hover' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <path d={s.d} />
                  <text transform={`translate(${point(81, s.mid)[0].toFixed(1)} ${point(81, s.mid)[1].toFixed(1)})`}>{s.name}</text>
                </g>
              ))}
              <circle className="donut-hub" r="54" />
              <text className="donut-hub-title" x="0" y="-3">
                {current.label}
              </text>
              <text className="donut-hub-hint" x="0" y="11">
                {active.length} formatos
              </text>
            </svg>
          </div>
          <p className="hint center">Pasa el ratón por una porción para verla resaltada. En la app, arrastras un archivo hasta ella y se convierte.</p>
        </Card>
      </div>

      <Card title="Comportamiento">
        <Field label="Abrir con la rueda del ratón">
          <Switch checked={settings.flipWheel} onChange={() => toggle('flipWheel')} />
        </Field>
        <p className="hint">Con el menú abierto, girar la rueda muestra el reverso: recortar, girar, voltear, grises, combinar en un PDF o reunirlo todo en un ZIP.</p>
      </Card>
    </>
  );
}
