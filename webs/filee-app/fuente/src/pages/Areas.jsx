import { useState } from 'react';
import { Card, Switch } from '../ui.jsx';

const AREAS = [
  { id: 'game', name: 'Modding de juegos', formats: 'DDS, Valve Texture (VTF), Minecraft pack, Minecraft add-on, Minecraft world, Minecraft world template…' },
  { id: 'print', name: 'Diseño e impresión', formats: 'JPEG 2000, PSD, PSB, GIMP (XCF), Paint.NET (PDN), EPS…' },
  { id: 'science', name: 'Ciencia y medicina', formats: 'JPEG 2000, Jupyter' },
  { id: 'dev', name: 'Desarrollo', formats: 'PPM, ICNS, QOI, CUR, XPM, XBM…' },
  { id: 'tech', name: 'Redacción técnica y publicación', formats: 'reStructuredText, LaTeX, Org, AsciiDoc, Typst, MediaWiki…' },
  { id: 'broadcast', name: 'Producción de vídeo y radiodifusión', formats: 'DV, MXF, AC3, MP2, E-AC3, ASS…' },
  { id: 'audio', name: 'Audio profesional', formats: 'CAF, WavPack, TTA, W64' },
  { id: 'legacy', name: 'Formatos antiguos', formats: 'MNG, PCX, WBMP, SGI, Sun Raster, WMF…' },
];

const ALWAYS = ['Imagen', 'PDF', 'Documento', 'Hoja de cálculo', 'Presentación', 'HWP', 'Texto', 'Vídeo', 'Audio', 'Libro electrónico', 'Archivo comprimido', 'Vectorial', 'Subtítulo', 'Datos'];

export default function Areas() {
  const [enabled, setEnabled] = useState(() => Object.fromEntries(AREAS.map((a) => [a.id, false])));

  return (
    <>
      <h1 className="page-title">Áreas</h1>
      <p className="lead-line">Activa los formatos de nicho que quieras tener a mano en el menú circular. Las áreas desactivadas no añaden ruido.</p>

      <div className="areas-grid">
        {AREAS.map((a) => (
          <Card key={a.id} className="area-card">
            <h2>{a.name}</h2>
            <p className="hint">Formatos: {a.formats}</p>
            <Switch checked={enabled[a.id]} onChange={(v) => setEnabled((s) => ({ ...s, [a.id]: v }))} label="" />
          </Card>
        ))}
      </div>

      <Card title="Siempre visibles">
        <div className="chips">
          {ALWAYS.map((f) => (
            <span className="chip" key={f}>
              {f}
            </span>
          ))}
        </div>
      </Card>
    </>
  );
}
