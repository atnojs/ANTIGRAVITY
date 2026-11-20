import { Card, Field, Segmented, Slider, Switch } from '../ui.jsx';
import { useSettings } from '../state.jsx';

const ACCENTS = [
  { value: '#00d0d0', label: 'Personalizado' },
  { value: '#8b7cf6', label: 'Lavanda' },
  { value: '#f0a58f', label: 'Melocotón' },
  { value: '#6fe3a8', label: 'Menta' },
  { value: '#f08fb8', label: 'Rosa' },
  { value: '#7ec8f2', label: 'Cielo' },
  { value: '#f2c76e', label: 'Ámbar' },
  { value: '#a8c98f', label: 'Salvia' },
];

export default function Theme() {
  const { settings, set, toggle } = useSettings();

  return (
    <>
      <h1 className="page-title">Tema</h1>

      <Card title="Estilo de tema">
        <div className="style-cards">
          <button type="button" className={`style-card${settings.themeStyle === 'soft' ? ' is-active' : ''}`} onClick={() => set({ themeStyle: 'soft' })}>
            <span className="style-preview style-preview-soft" aria-hidden="true" />
            <strong>Filee Soft</strong>
            <small>Aspecto clásico de Filee con esquinas redondeadas suaves y superficies pastel.</small>
          </button>
          <button type="button" className={`style-card${settings.themeStyle === 'm3' ? ' is-active' : ''}`} onClick={() => set({ themeStyle: 'm3' })}>
            <span className="style-preview style-preview-m3" aria-hidden="true" />
            <strong>Material You</strong>
            <small>Diseño Google Material 3 con superficies tonales dinámicas y roles de acento adaptables.</small>
          </button>
        </div>
      </Card>

      <Card title="Aspecto">
        <Field label="Tema de la interfaz">
          <Segmented
            label="Aspecto"
            value={settings.appearance}
            onChange={(v) => set({ appearance: v })}
            options={[
              { value: 'system', label: 'Sistema' },
              { value: 'dark', label: 'Oscuro' },
              { value: 'light', label: 'Claro' },
            ]}
          />
        </Field>
      </Card>

      <Card title="Color de acento">
        <p className="hint">Muestras vibrantes y pastel. El acento se aplica a toda la interfaz.</p>
        <div className="swatches">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              className={`swatch${settings.accent === a.value ? ' is-active' : ''}`}
              style={{ '--swatch': a.value }}
              aria-label={a.label}
              title={a.label}
              aria-pressed={settings.accent === a.value}
              onClick={() => set({ accent: a.value })}
            >
              <span />
            </button>
          ))}
        </div>
        <label className="custom-color">
          Personalizado
          <input type="color" value={settings.accent} onChange={(e) => set({ accent: e.target.value })} aria-label="Color de acento personalizado" />
        </label>
      </Card>

      <Card title="Forma y movimiento">
        <Field label="Redondeo">
          <Slider id="radius" label="Redondeo" min={0} max={22} value={settings.radius} suffix=" px" onChange={(v) => set({ radius: v })} />
        </Field>
        <Field label="Opacidad del menú circular">
          <Slider id="opacity2" label="Opacidad del menú circular" min={40} max={100} value={settings.donutOpacity} suffix="%" onChange={(v) => set({ donutOpacity: v })} />
        </Field>
        <Field label="Muestra el texto con la fuente de tu sistema">
          <Switch checked={settings.systemFont} onChange={() => toggle('systemFont')} />
        </Field>
        <p className="hint">Las fuentes integradas de Filee siguen dibujando las escrituras que le falten.</p>
        <Field label="Reducir movimiento">
          <Switch checked={settings.reduceMotion} onChange={() => toggle('reduceMotion')} />
        </Field>
        <p className="hint">Recomendado para PC antiguos. Desactiva las transiciones y el rebote del menú circular.</p>
      </Card>

      <Card title="Tamaño de las ventanas">
        <Field label="Escala de la interfaz">
          <Slider id="scale" label="Tamaño de las ventanas" min={80} max={140} step={5} value={settings.windowScale} suffix="%" onChange={(v) => set({ windowScale: v })} />
        </Field>
        <p className="hint">Agranda o reduce todo en las ventanas de Filee. En cualquier ventana, Ctrl + rueda del ratón y Ctrl + más / menos hacen lo mismo, y Ctrl + 0 vuelve al 100 %.</p>
      </Card>

      <Card title="Vista previa">
        <div className="theme-preview">
          <div className="tp-card">
            <span className="tp-badge">PNG</span>
            <div>
              <strong>viaje.png</strong>
              <small>convertido · hace un momento</small>
            </div>
            <span className="tp-btn">Abrir</span>
          </div>
        </div>
        <p className="hint">Los cambios se aplican al instante en toda la ventana y se guardan en la carpeta de ajustes.</p>
      </Card>
    </>
  );
}
