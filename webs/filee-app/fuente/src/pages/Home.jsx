import { useMemo, useRef, useState } from 'react';
import Icon from '../icons.jsx';
import { Button, Empty } from '../ui.jsx';
import { useSettings } from '../state.jsx';

const TYPE_LABEL = { svg: 'SVG', pdf: 'PDF', png: 'PNG', jpg: 'JPG', webp: 'WEBP', gif: 'GIF', avif: 'AVIF' };

function toast(text) {
  window.dispatchEvent(new CustomEvent('filee-toast', { detail: text }));
}

export default function Home() {
  const { settings, addHistory, set } = useSettings();
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const urls = useRef(new Map());

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return settings.history;
    return settings.history.filter((h) => `${h.title} ${h.file} ${h.type}`.toLowerCase().includes(q));
  }, [settings.history, query]);

  const convert = async (files) => {
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!images.length) {
      toast('En esta réplica solo se convierten imágenes. El resto lo hace la app de escritorio.');
      return;
    }
    setBusy(true);
    for (const file of images) {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
        const name = `${file.name.replace(/\.[^.]+$/, '')}.png`;
        urls.current.set(name, URL.createObjectURL(blob));
        addHistory({
          type: 'png',
          title: 'PNG',
          file: name,
          time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          ok: true,
          real: true,
        });
      } catch {
        addHistory({ type: 'error', title: 'Error', file: file.name, time: '—', ok: false });
      }
    }
    setBusy(false);
    toast(images.length === 1 ? 'Archivo convertido a PNG' : `${images.length} archivos convertidos a PNG`);
  };

  const openFile = (item) => {
    const url = urls.current.get(item.file);
    if (!url) {
      toast('Entrada de ejemplo: suelta una imagen para convertirla de verdad.');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = item.file;
    a.click();
  };

  return (
    <>
      <h1 className="page-title">Inicio</h1>

      <div
        className={`dropzone${dragging ? ' is-over' : ''}${busy ? ' is-busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          convert(e.dataTransfer.files);
        }}
      >
        <span className="drop-icon">
          <Icon name="upload" />
        </span>
        <p className="drop-title">{busy ? 'Convirtiendo…' : 'Suelta archivos aquí'}</p>
        <p className="drop-sub">O mantén Ctrl mientras arrastras archivos en el Explorador. El menú circular se abre donde esté el cursor.</p>
        <button type="button" className="drop-link" onClick={() => input.current?.click()}>
          …o elige un archivo del equipo
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            convert(e.target.files);
            e.target.value = '';
          }}
        />
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
          {query ? null : <p className="empty-sub">Suelta una imagen arriba y aparecerá aquí.</p>}
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

      <p className="foot-note">
        Réplica web: las imágenes que sueltas se convierten de verdad en tu navegador; el resto de la app es una reproducción de la interfaz.
      </p>
    </>
  );
}
