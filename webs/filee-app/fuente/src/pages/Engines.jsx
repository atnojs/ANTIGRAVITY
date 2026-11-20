import { useState } from 'react';
import { Button, Card, Pill } from '../ui.jsx';
import Icon from '../icons.jsx';

const ENGINES = [
  {
    id: 'gs',
    name: 'Ghostscript (EPS y PostScript)',
    status: 'system',
    desc: 'EPS, PS y archivos antiguos de Illustrator → PDF e imágenes, PDF o SVG → EPS/PS.',
    note: 'SVG y AI compatibles con PDF se convierten sin él.',
    where: 'En este equipo · C:\\Program Files\\gs\\gs10.03.1\\bin · versión 10.3',
    warn: 'Actualización recomendada: esta copia es la 10.3 y Filee está probado con la 10.8. La mayoría de las conversiones seguirán funcionando.',
  },
  {
    id: 'ffmpeg',
    name: 'FFmpeg (vídeo y audio)',
    status: 'missing',
    desc: 'Añade conversión de vídeo y audio, vídeo → GIF o imagen fija, sonido de vídeos y GIF → MP4.',
    note: 'Solo es necesario para vídeo y audio.',
    size: 'Descargar 99 MB · 272 MB en disco',
  },
  {
    id: 'calibre',
    name: 'Calibre (Kindle y libros electrónicos poco habituales)',
    status: 'missing',
    desc: 'Guarda MOBI y AZW3 para Kindle y convierte formatos de libro electrónico poco habituales (LIT, LRF, PDB, CHM…).',
    note: 'EPUB, MOBI, AZW3, FB2 y cómics se leen sin él.',
    size: 'Descargar 240 MB · 663 MB en disco',
  },
  {
    id: 'weasy',
    name: 'WeasyPrint (HTML, Markdown y correo a PDF)',
    status: 'missing',
    desc: 'Crea mejores PDF de páginas HTML, Markdown y correos (EML, MSG, MHTML): títulos, tablas, negrita y escrituras de derecha a izquierda o índicas como las imprime un navegador.',
    note: 'Sin él también se convierten en PDF, por la ruta integrada.',
    size: 'Descargar 32 MB · 65 MB en disco',
  },
  {
    id: 'tesseract',
    name: 'Tesseract (reconocimiento de texto, OCR)',
    status: 'missing',
    desc: 'Lee el texto de PDF escaneados e imágenes: PDF con búsqueda, DOCX, TXT.',
    note: 'Cada idioma se descarga la primera vez que se usa.',
    size: 'Descargar 50 MB · 168 MB en disco',
  },
  {
    id: 'libreoffice',
    name: 'LibreOffice (formatos de oficina antiguos)',
    status: 'missing',
    desc: 'DOC, PPT, ODT, RTF y el texto con escrituras que necesitan modelado de glifos.',
    note: 'DOCX, XLSX y PPTX se convierten sin él.',
    size: 'Descargar 420 MB · 1,2 GB en disco',
  },
  {
    id: 'pandoc',
    name: 'Pandoc (LaTeX, Org y AsciiDoc)',
    status: 'missing',
    desc: 'Convierte LaTeX, Org y AsciiDoc, Word → Markdown y Markdown → diapositivas.',
    note: '',
    size: 'Descargar 42 MB · 118 MB en disco',
  },
];

export default function Engines() {
  const [state, setState] = useState({});
  const [progress, setProgress] = useState({});

  const download = (id) => {
    if (progress[id] != null) return;
    setProgress((p) => ({ ...p, [id]: 0 }));
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = (p[id] ?? 0) + 7 + Math.random() * 9;
        if (next >= 100) {
          clearInterval(timer);
          setState((s) => ({ ...s, [id]: 'installed' }));
          return { ...p, [id]: undefined };
        }
        return { ...p, [id]: Math.round(next) };
      });
    }, 260);
  };

  return (
    <>
      <h1 className="page-title">Motores</h1>

      <Card title="Descarga de Filee">
        <p className="hint">Los motores grandes no van en el instalador: se descargan aquí cuando los necesitas y se guardan en la carpeta propia de Filee.</p>
        <p className="meta-line">
          <Icon name="engines" /> versión 3.13 · 236 MB en disco
        </p>
      </Card>

      <ul className="engines">
        {ENGINES.map((e) => {
          const status = state[e.id] || (e.status === 'system' ? 'system' : 'missing');
          const pct = progress[e.id];
          return (
            <li key={e.id} className="engine">
              <div className="engine-head">
                <h2>{e.name}</h2>
                <Pill tone={status === 'missing' ? 'muted' : status === 'system' ? 'ok' : 'accent'}>
                  {status === 'missing' ? 'No instalado' : status === 'system' ? 'Disponible' : 'Instalado'}
                </Pill>
              </div>
              <p className="engine-desc">{e.desc}</p>
              {e.note ? <p className="hint">{e.note}</p> : null}
              {e.where ? <p className="engine-where">{e.where}</p> : null}
              {e.warn ? <p className="engine-warn">{e.warn}</p> : null}

              <div className="engine-foot">
                {status === 'missing' ? (
                  pct != null ? (
                    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label={`Descargando ${e.name}`}>
                      <span style={{ width: `${pct}%` }} />
                      <em>{pct}%</em>
                    </div>
                  ) : (
                    <Button icon="download" onClick={() => download(e.id)}>
                      {e.size}
                    </Button>
                  )
                ) : status === 'installed' ? (
                  <Button
                    variant="ghost"
                    icon="trash"
                    onClick={() => {
                      setState((s) => ({ ...s, [e.id]: 'missing' }));
                    }}
                  >
                    Quitar
                  </Button>
                ) : (
                  <Button variant="ghost" icon="folder" onClick={() => {}}>
                    Usar mi copia
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="foot-note">La descarga de motores está simulada en esta réplica; la app de escritorio descarga los binarios reales.</p>
    </>
  );
}
