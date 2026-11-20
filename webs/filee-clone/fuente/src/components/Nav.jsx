import { useEffect, useRef } from 'react';
import Icon from '../icons.jsx';
import Logo from './Logo.jsx';
import { GITHUB, LANGS, NAV_LINKS, SITE, VERSION } from '../data.js';
import { useScrolled } from '../hooks.js';

export default function Nav() {
  const scrolled = useScrolled();
  const details = useRef(null);

  // Cierra el menú de idioma al pulsar fuera o con Escape.
  useEffect(() => {
    const onDown = (e) => {
      const el = details.current;
      if (el && el.open && !el.contains(e.target)) el.open = false;
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && details.current?.open) details.current.open = false;
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="nav-inner">
        <a className="brand" href="#main" aria-label="Filee, inicio">
          <Logo className="logo" />
          <span>Filee</span>
        </a>

        <nav className="nav-links" aria-label="Menú">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <details className="lang-menu" ref={details}>
            <summary aria-label="Idioma">
              <Icon name="globe" />
              <span>Español</span>
            </summary>
            <ul>
              {LANGS.map((l) => (
                <li key={l.code}>
                  <a
                    href={l.code === 'es' ? '#main' : `${SITE}${l.path}`}
                    hrefLang={l.code}
                    lang={l.code}
                    aria-current={l.code === 'es' ? 'page' : undefined}
                    rel={l.code === 'es' ? undefined : 'noopener'}
                  >
                    <img className="flag" src={`media/flags/${l.flag}.svg`} alt="" width="20" height="20" loading="lazy" decoding="async" />
                    <span>{l.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>

          <a className="btn btn-ghost github" href={GITHUB} target="_blank" rel="noopener noreferrer">
            <Icon name="github" />
            <span className="stars">★ 29k</span>
          </a>

          <a className="btn btn-primary btn-small" href="#download">
            <Icon name="download" />
            <span>Descargar</span>
          </a>
        </div>
      </div>
      <p className="sr-only">Versión {VERSION}</p>
    </header>
  );
}
