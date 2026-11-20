import { useState } from 'react';
import Icon from '../icons.jsx';
import { Button, Card, Empty } from '../ui.jsx';
import { useSettings } from '../state.jsx';

function toast(text) {
  window.dispatchEvent(new CustomEvent('filee-toast', { detail: text }));
}

export default function Watched() {
  const { settings, set } = useSettings();
  const [adding, setAdding] = useState(false);
  const [path, setPath] = useState('C:\\Users\\atnoj\\Downloads');
  const [format, setFormat] = useState('PDF');

  const add = () => {
    const clean = path.trim();
    if (!clean) return;
    set({ watched: [...settings.watched, { path: clean, format, moveOriginals: false }] });
    setAdding(false);
    toast('Carpeta supervisada añadida');
  };

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Carpetas supervisadas</h1>
        <Button icon="plus" onClick={() => setAdding(true)}>
          Añadir carpeta
        </Button>
      </div>

      <p className="lead-line">
        Los archivos que lleguen a estas carpetas se convierten mientras Filee esté en ejecución.
        <br />
        Las descargas y las copias se convierten cuando terminan.
      </p>

      {adding ? (
        <Card title="Nueva carpeta supervisada">
          <div className="watch-form">
            <label className="field-label" htmlFor="watchpath">
              Carpeta
            </label>
            <input id="watchpath" className="input" value={path} onChange={(e) => setPath(e.target.value)} />
            <label className="field-label" htmlFor="watchfmt">
              Convertir a
            </label>
            <input id="watchfmt" className="input input-narrow" value={format} onChange={(e) => setFormat(e.target.value.toUpperCase())} maxLength={6} />
          </div>
          <div className="row-actions">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button onClick={add}>Guardar</Button>
          </div>
        </Card>
      ) : null}

      {settings.watched.length === 0 && !adding ? (
        <Empty icon="folder" title="Todavía no hay carpetas supervisadas.">
          <Button variant="ghost" icon="plus" onClick={() => setAdding(true)}>
            Añadir carpeta
          </Button>
        </Empty>
      ) : (
        <ul className="watch-list">
          {settings.watched.map((w) => (
            <li key={w.path} className="watch-item">
              <Icon name="folder" />
              <div>
                <span className="watch-path">{w.path}</span>
                <span className="watch-meta">Convertir a {w.format}</span>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  set({ watched: settings.watched.filter((x) => x.path !== w.path) });
                  toast('Carpeta retirada');
                }}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="foot-note">
        También en la línea de comandos: <code>filee watch &lt;carpeta&gt; --to &lt;formato&gt;</code>
      </p>
    </>
  );
}
