import { useState } from 'react';
import Icon from '../icons.jsx';
import { Button, Card, Field, Kbd, Select, Switch } from '../ui.jsx';
import { useSettings } from '../state.jsx';

function toast(text) {
  window.dispatchEvent(new CustomEvent('filee-toast', { detail: text }));
}

const GESTURES = [
  {
    id: 'g1',
    title: 'Ctrl + Left',
    kind: 'Gesto',
    type: 'Tecla modificadora + arrastrar archivos',
    mods: ['Ctrl'],
    button: 'left',
    opens: 'front',
  },
  {
    id: 'g2',
    title: 'Ctrl + Alt + Space',
    kind: 'Atajo de teclado (archivos seleccionados)',
    type: 'Tecla modificadora + tecla',
    mods: ['Ctrl', 'Alt'],
    key: 'Space',
    opens: 'front',
  },
  {
    id: 'g3',
    title: 'Ctrl + Alt + Left',
    kind: 'Modificador + clic del ratón (Filee Connect)',
    type: 'En todo el sistema',
    mods: ['Ctrl', 'Alt'],
    button: 'left',
    opens: 'front',
  },
];

export default function Shortcuts() {
  const { settings, set, toggle } = useSettings();
  const [gestures, setGestures] = useState(GESTURES);

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Atajos</h1>
        <Button icon="plus" onClick={() => toast('Añadir gesto: elige teclas o botón del ratón en la app de escritorio.')}>
          Añadir gesto
        </Button>
      </div>

      <p className="lead-line">Elige cómo se abre el menú circular. Puedes añadir tantos gestos como quieras.</p>
      <p className="status-line">
        <span className="dot" /> La detección global de entrada está en ejecución.
      </p>

      {gestures.map((g) => (
        <Card key={g.id} className="gesture">
          <header className="gesture-head">
            <div>
              <h2>{g.title}</h2>
              <p className="gesture-kind">{g.kind}</p>
            </div>
            <Button variant="ghost" onClick={() => setGestures((list) => list.filter((x) => x.id !== g.id))}>
              Quitar
            </Button>
          </header>

          <div className="gesture-grid">
            <Field label="Activo en">
              <Select
                value="files"
                onChange={() => {}}
                options={[
                  { value: 'files', label: 'Gestores de archivos y escritorio' },
                  { value: 'all', label: 'En todo el sistema' },
                ]}
                width="100%"
              />
            </Field>
            <Field label="Teclas modificadoras">
              <div className="chips">
                {g.mods.map((m) => (
                  <span className="chip" key={m}>
                    {m}
                  </span>
                ))}
              </div>
            </Field>
            <Field label={g.key ? 'Tecla' : 'Botón del ratón'}>
              <Select
                value={g.key || g.button}
                onChange={() => {}}
                options={
                  g.key
                    ? [{ value: 'Space', label: 'Space' }]
                    : [
                        { value: 'left', label: 'Izquierdo' },
                        { value: 'right', label: 'Derecho' },
                        { value: 'middle', label: 'Central' },
                      ]
                }
                width="100%"
              />
            </Field>
            <Field label="Abre">
              <Select
                value={g.opens}
                onChange={() => {}}
                options={[
                  { value: 'front', label: 'Anverso del menú circular' },
                  { value: 'back', label: 'Reverso del menú circular' },
                ]}
                width="100%"
              />
            </Field>
          </div>

          <p className="hint">
            Da a dos gestos teclas modificadoras distintas para abrir cada cara directamente. Si el reverso no tiene nada para los archivos, se abre el anverso.
          </p>
        </Card>
      ))}

      <Card title="Dar la vuelta al menú circular">
        <p className="hint">Con el menú circular abierto, esta tecla o un giro de la rueda del ratón muestra su reverso. El reverso de cada menú se elige en Menú circular.</p>
        <Field label="Tecla" htmlFor="flipkey">
          <div className="key-row">
            <Kbd>{settings.flipKey}</Kbd>
            <input id="flipkey" className="input input-narrow" value={settings.flipKey} maxLength={8} onChange={(e) => set({ flipKey: e.target.value })} />
            <Button variant="ghost" onClick={() => toast(`Tecla «${settings.flipKey}» guardada`)}>
              Grabar
            </Button>
          </div>
        </Field>
        <Field label="La rueda del ratón da la vuelta al menú circular">
          <Switch checked={settings.flipWheel} onChange={() => toggle('flipWheel')} />
        </Field>
      </Card>

      <Card title="Nunca se activa en estas apps">
        <p className="hint">Los gestos y los atajos no hacen nada mientras el puntero esté sobre estas apps.</p>
        <div className="row-actions">
          <Button icon="plus" onClick={() => toast('Elige una app en ejecución: la lista se lee del sistema en la app de escritorio.')}>
            Elige una app en ejecución
          </Button>
        </div>
      </Card>

      <p className="foot-note">
        <Icon name="info" /> Los gestos globales necesitan la app de escritorio; aquí se muestra y edita su configuración.
      </p>
    </>
  );
}
