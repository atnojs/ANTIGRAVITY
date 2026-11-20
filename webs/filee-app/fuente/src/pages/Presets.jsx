import { useState } from 'react';
import { Button, Card, Field, Select, Switch } from '../ui.jsx';
import { useSettings } from '../state.jsx';

function toast(text) {
  window.dispatchEvent(new CustomEvent('filee-toast', { detail: text }));
}

const TARGETS = ['PNG', 'JPG', 'WEBP', 'AVIF', 'PDF', 'SVG', 'ICO', 'TIFF'];

export default function Presets() {
  const { settings, set } = useSettings();
  const [selected, setSelected] = useState(settings.presets[0].id);
  const preset = settings.presets.find((p) => p.id === selected) || settings.presets[0];

  const update = (patch) =>
    set({ presets: settings.presets.map((p) => (p.id === preset.id ? { ...p, ...patch } : p)) });

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Ajustes preestablecidos</h1>
        <Button
          icon="plus"
          onClick={() => {
            const id = `p${Date.now()}`;
            set({ presets: [...settings.presets, { id, name: 'Nuevo ajuste', short: 'NEW', target: 'PNG', kind: 'Imagen', builtin: false }] });
            setSelected(id);
            toast('Ajuste preestablecido creado');
          }}
        >
          Nuevo ajuste
        </Button>
      </div>

      <div className="presets-layout">
        <Card className="presets-list">
          <ul>
            {settings.presets.map((p) => (
              <li key={p.id}>
                <button type="button" className={`preset-row${p.id === preset.id ? ' is-active' : ''}`} onClick={() => setSelected(p.id)}>
                  <span className="preset-short">{p.short}</span>
                  <span className="preset-name">
                    {p.name}
                    <small>Convertir a {p.target}</small>
                  </span>
                  {p.builtin ? <span className="tag">Integrado</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={preset.name} className="preset-editor">
          <Field label="Nombre" htmlFor="pname">
            <input id="pname" className="input" value={preset.name} onChange={(e) => update({ name: e.target.value })} />
          </Field>
          <Field label="Convertir a" htmlFor="ptarget">
            <Select id="ptarget" value={preset.target} onChange={(v) => update({ target: v, short: v })} options={TARGETS.map((t) => ({ value: t, label: t }))} width="220px" />
          </Field>
          <Field label="Nombre corto">
            <input className="input input-narrow" maxLength={6} value={preset.short} onChange={(e) => update({ short: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Mostrar en la porción">
            <Switch checked onChange={() => toast('La visibilidad en el menú circular se guarda por perfil.')} />
          </Field>

          <h3 className="sub-head">Imagen</h3>
          <Field label="Cambiar tamaño" htmlFor="psize">
            <Select id="psize" value="orig" onChange={() => {}} options={[{ value: 'orig', label: 'Tamaño original' }, { value: '50', label: '50 %' }, { value: 'max', label: 'Máximo 1920 px' }]} width="220px" />
          </Field>
          <Field label="Rotar" htmlFor="prot">
            <Select id="prot" value="none" onChange={() => {}} options={[{ value: 'none', label: 'No rotar' }, { value: '90', label: '90°' }, { value: '180', label: '180°' }, { value: '270', label: '270°' }]} width="220px" />
          </Field>
          <Field label="Voltear" htmlFor="pflip">
            <Select id="pflip" value="none" onChange={() => {}} options={[{ value: 'none', label: 'No voltear' }, { value: 'h', label: 'Horizontal' }, { value: 'v', label: 'Vertical' }]} width="220px" />
          </Field>
          <Field label="Fondo para la transparencia">
            <input className="input input-narrow" defaultValue="#FFFFFF" />
          </Field>

          <h3 className="sub-head">Salida</h3>
          <Field label="Guardar en" htmlFor="pout">
            <Select
              id="pout"
              value="default"
              onChange={() => {}}
              options={[{ value: 'default', label: 'Carpeta de guardado predeterminada (Ajustes › General)' }, { value: 'same', label: 'La misma carpeta que el original' }]}
              width="100%"
            />
          </Field>
          <Field label="Si el archivo existe" htmlFor="pexists">
            <Select id="pexists" value="ask" onChange={() => {}} options={[{ value: 'ask', label: 'Preguntar' }, { value: 'rename', label: 'Añadir un número' }, { value: 'replace', label: 'Sustituir' }]} width="220px" />
          </Field>

          <div className="row-actions">
            <Button variant="ghost" onClick={() => toast('Los ajustes integrados no se pueden borrar.')} disabled={preset.builtin}>
              Borrar
            </Button>
            <Button onClick={() => toast('Ajuste guardado')}>Guardar</Button>
          </div>
        </Card>
      </div>

      <p className="foot-note">Los ajustes integrados vienen con Filee; los tuyos se guardan en la carpeta de ajustes.</p>
    </>
  );
}
