import Icon from '../icons.jsx';
import Logo from './Logo.jsx';
import { GITHUB, POPULAR, SITE, VERSION } from '../data.js';

export default function Footer() {
  const popular = POPULAR.slice(0, 12);
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a className="footer-logo" href="#main" aria-label="Filee">
            <Logo className="logo" />
            <span>Filee</span>
          </a>
          <p>Arrastra. Suelta. Convertido.</p>
          <a className="footer-badge" href="https://alternativeto.net/software/filee-1/about/" target="_blank" rel="noopener noreferrer">
            <img src="media/badges/alternativeto-light.svg" alt="Filee en AlternativeTo" height="44" loading="lazy" decoding="async" />
          </a>
        </div>

        <nav className="footer-col" aria-label="Producto">
          <h2>Producto</h2>
          <ul>
            <li>
              <a href={`${SITE}/es/formats/`} rel="noopener">
                Todos los formatos
              </a>
            </li>
            <li>
              <a href={`${SITE}/es/cli/`} rel="noopener">
                Línea de comandos
              </a>
            </li>
            <li>
              <a href={`${SITE}/es/presets/`} rel="noopener">
                Galería de ajustes preestablecidos
              </a>
            </li>
            <li>
              <a href={`${GITHUB}/releases`} target="_blank" rel="noopener noreferrer">
                Todas las versiones
              </a>
            </li>
            <li>
              <a href={`${GITHUB}#code-signing-policy`} target="_blank" rel="noopener noreferrer">
                Política de firma de código
              </a>
            </li>
          </ul>
        </nav>

        <nav className="footer-col" aria-label="Código abierto">
          <h2>Código abierto</h2>
          <ul>
            <li>
              <a href={GITHUB} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li>
              <a href={`${GITHUB}/issues`} target="_blank" rel="noopener noreferrer">
                Informar de un problema
              </a>
            </li>
            <li>
              <a href="https://github.com/sponsors/KnifeLemon" target="_blank" rel="noopener noreferrer">
                Patrocina Filee
              </a>
            </li>
            <li>
              <a href={`${GITHUB}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
                Licencia MIT
              </a>
            </li>
            <li>
              <a href={`${GITHUB}/blob/main/THIRD-PARTY-NOTICES.md`} target="_blank" rel="noopener noreferrer">
                Avisos de terceros
              </a>
            </li>
          </ul>
        </nav>

        <nav className="footer-col footer-popular" aria-label="Conversiones populares">
          <h2>Conversiones populares</h2>
          <ul>
            {popular.map(([label, slug]) => (
              <li key={label}>
                <a href={`${SITE}/es/convert/${slug}/`} rel="noopener">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer-bottom">
          <a className="footer-lang" href={`${SITE}/es/`} target="_blank" rel="noopener noreferrer">
            <Icon name="globe" /> Español
          </a>
          <p className="footer-made">
            Filee es un proyecto de <a href={GITHUB} target="_blank" rel="noopener noreferrer">Myeonggu Kim (KnifeLemon)</a>, con licencia MIT · v{VERSION}. Esta página es una{' '}
            <strong>réplica no oficial en React</strong> con fines de demostración.
          </p>
        </div>
      </div>
    </footer>
  );
}
