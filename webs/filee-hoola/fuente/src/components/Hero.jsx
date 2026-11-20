import Icon from '../icons.jsx';
import Demo from './Demo.jsx';
import { GITHUB, RELEASES, VERSION } from '../data.js';

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <a className="badge is-visible" href={RELEASES} target="_blank" rel="noopener noreferrer" data-reveal="">
          Novedades de la 2.5: galería de ajustes preestablecidos, originales a la Papelera, nuevos formatos, Windows on Arm y mongol
        </a>

        <h1 className="hero-title">
          <span className="kicker">Conversor de archivos gratis para Windows, macOS y Linux</span>
          <span className="word" style={{ '--i': 0 }}>
            Arrastra.
          </span>{' '}
          <span className="word" style={{ '--i': 1 }}>
            Suelta.
          </span>{' '}
          <span className="word" style={{ '--i': 2 }}>
            Convertido.
          </span>
        </h1>

        <p className="lead is-visible" data-reveal="">
          Convierte imágenes, PDF, archivos de Word, Excel y PowerPoint, vídeos, música, libros electrónicos, archivos comprimidos y mucho más, directamente en tu PC. Mantén pulsada una
          tecla, arrastra los archivos y suéltalos sobre un formato. Sin subidas, sin cuenta, gratis y de código abierto.
        </p>

        <div className="cta" data-reveal="">
          <a className="btn btn-primary btn-large" href="#download">
            <Icon name="download" />
            <span>Elige una descarga</span>
          </a>
          <a className="btn btn-ghost btn-large" href="#formats">
            <Icon name="layers" />
            <span>Explora 250+ formatos</span>
          </a>
        </div>

        <p className="cta-note" data-reveal="">
          Windows 10/11 · Linux · macOS en versión preliminar · Gratis <span className="version">v{VERSION}</span>
        </p>
      </div>

      <Demo />
    </section>
  );
}
