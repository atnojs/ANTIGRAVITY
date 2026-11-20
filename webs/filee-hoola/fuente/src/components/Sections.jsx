import { useEffect, useRef, useState } from 'react';
import Clip from './Clip.jsx';
import Logo from './Logo.jsx';
import Icon from '../icons.jsx';
import { useInView } from '../hooks.js';
import {
  AUTO_CHECKS,
  CATEGORIES,
  DOWNLOADS,
  FAQ,
  FEATURES,
  GITHUB,
  HWP_CHECKS,
  HWP_GUIDES,
  MARQUEE_A,
  MARQUEE_B,
  NEWS,
  POPULAR,
  SCREENS,
  SHOWCASE,
  SPECS,
  SITE,
  STEPS,
  VERSION,
} from '../data.js';

/* ── Cabecera de sección ─────────────────────────────────────────── */
function Head({ eyebrow, title, children }) {
  return (
    <header className="section-head" data-reveal="">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </header>
  );
}

/* ── Vídeo de presentación ───────────────────────────────────────── */
export function VideoSection() {
  const box = useRef(null);
  const vid = useRef(null);
  const inView = useInView(box, { threshold: 0.4 });

  // Se reproduce solo al entrar en pantalla, como en la web original.
  useEffect(() => {
    const v = vid.current;
    if (!v || !inView) return;
    v.play().catch(() => {
      /* si el navegador lo bloquea queda el control de reproducción */
    });
  }, [inView]);

  return (
    <section className="section video-section" id="video">
      <Head title="Míralo en 27 segundos">El mismo gesto convierte imágenes sueltas, lotes de documentos y archivos HWP sin Hancom Office.</Head>
      <div className="video-frame" data-reveal="" ref={box}>
        <video
          className="promo"
          ref={vid}
          src="media/promo-en.mp4"
          poster="media/poster-en.jpg"
          muted
          playsInline
          loop
          controls
          preload="metadata"
        />
      </div>
    </section>
  );
}

/* ── Tres pasos ──────────────────────────────────────────────────── */
export function How() {
  return (
    <section className="section" id="how">
      <Head title="Convierte archivos en tres pasos" />
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li className="step" key={s.title} data-reveal="" style={{ '--i': i }}>
            <span className="step-number">{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── Cuatro gestos (carrusel) ────────────────────────────────────── */
export function Showcase() {
  return (
    <section className="section showcase" id="showcase">
      <Head eyebrow="En movimiento" title="Mira Filee en acción">
        Cuatro bucles cortos generados con la interfaz real de Filee, no maquetas.
      </Head>
      <div className="showcase-body">
        <div className="showcase-rail" aria-hidden="true">
          <i />
        </div>
        <ol className="showcase-list">
          {SHOWCASE.map((f) => (
            <li className="feature" key={f.index}>
              <span className="feature-index" aria-hidden="true">
                {f.index}
              </span>
              <div className="feature-copy">
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <p className="feature-hint">
                  {f.hintBefore ? `${f.hintBefore} ` : null}
                  {f.key ? <kbd>{f.key}</kbd> : null} {f.hintAfter}
                </p>
              </div>
              <div className="feature-media">
                <Clip
                  poster={`media/${f.poster}`}
                  posterDark={f.posterDark ? `media/${f.posterDark}` : undefined}
                  video={`media/${f.video}`}
                  videoDark={f.videoDark ? `media/${f.videoDark}` : undefined}
                  autoPlayInView
                />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Novedades ───────────────────────────────────────────────────── */
export function WhatsNew() {
  return (
    <section className="section whats-new" id="whats-new">
      <Head title="Novedades de Filee 2.5">Lo más destacado de esta versión, en clips cortos tomados de la propia app.</Head>
      <ul className="news-grid">
        {NEWS.map((n, i) => (
          <li className="news-card" key={n.title} data-reveal="" style={{ '--i': i }}>
            <Clip poster={`media/${n.poster}`} video={`media/${n.video}`} wide width={768} height={432} autoPlayInView />
            <h3>{n.title}</h3>
            <p>{n.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Funciones (tarjetas con inclinación) ────────────────────────── */
export function Features() {
  const tilt = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    el.style.setProperty('--rx', `${(0.5 - py) * 4}deg`);
    el.style.setProperty('--ry', `${(px - 0.5) * 4}deg`);
  };
  const reset = (e) => {
    e.currentTarget.style.setProperty('--rx', '0deg');
    e.currentTarget.style.setProperty('--ry', '0deg');
  };

  return (
    <section className="section" id="features">
      <Head title="Lo que hace Filee" />
      <ul className="bento">
        {FEATURES.map((f, i) => (
          <li className="card" key={f.title} data-reveal="" style={{ '--i': i }} onMouseMove={tilt} onMouseLeave={reset}>
            <Icon name={f.icon} className="card-icon" />
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Formatos ────────────────────────────────────────────────────── */
export function Formats() {
  return (
    <section className="section" id="formats">
      <Head title="255 formatos en 18 categorías">
        Filee encuentra automáticamente el mejor camino entre formatos, por ejemplo HWPX → PDF → PNG, y usa en cada paso el motor que mejor lo hace.
      </Head>

      <div className="marquee" aria-hidden="true">
        {[MARQUEE_A, MARQUEE_B].map((row, idx) => (
          <div className={`marquee-row${idx === 1 ? ' reverse' : ''}`} key={idx}>
            <div className="marquee-track">
              {[...row, ...row].map((f, i) => (
                <span className="chip" key={`${f}-${i}`}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ul className="cat-grid">
        {CATEGORIES.map((c, i) => (
          <li key={c.slug} data-reveal="" style={{ '--i': i }}>
            <a className="cat-card" href={`${SITE}/es/formats/#${c.slug}`} style={{ '--cat': c.color }} rel="noopener">
              <Icon name={c.icon} className="cat-icon" />
              <span className="cat-name">{c.name}</span>
              <span className="cat-count">{c.count}</span>
              <span className="cat-sample">{c.sample}</span>
              <span className="cat-tags">
                {c.tags.map((t) => (
                  <span key={t} className={`tag ${t === 'Integrado' ? 'tag-builtin' : 'tag-optional'}`} title={t === 'Integrado' ? 'Funciona nada más instalar, sin descargas adicionales' : undefined}>
                    {t}
                  </span>
                ))}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <div className="popular" data-reveal="">
        <h3>Conversiones populares</h3>
        <ul className="pills">
          {POPULAR.map(([label, slug]) => (
            <li key={label}>
              <a className="pill" href={`${SITE}/es/convert/${slug}/`} rel="noopener">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <p className="more-link">
          <a href={`${SITE}/es/formats/`} rel="noopener">
            Ver los 255 formatos en el catálogo <Icon name="arrow" />
          </a>
        </p>
      </div>
    </section>
  );
}

/* ── HWP ─────────────────────────────────────────────────────────── */
export function Hwp() {
  return (
    <section className="section hwp" id="hwp">
      <div className="hwp-copy" data-reveal="">
        <p className="eyebrow">Para usuarios de HWP</p>
        <h2>HWP y HWPX sin Hancom Office</h2>
        <p>Filee lee y escribe documentos coreanos de Hangul por sí mismo, así que no hay que comprar ninguna licencia de Hancom ni aceptar ventanas de aprobación.</p>
        <ul className="checks">
          {HWP_CHECKS.map((c) => (
            <li key={c}>
              <Icon name="check" className="icon" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="guides-label">Guías de HWP</p>
        <ul className="pills">
          {HWP_GUIDES.map(([label, slug]) => (
            <li key={label}>
              <a className="pill" href={`${SITE}/es/convert/${slug}/`} rel="noopener">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="hwp-visual" aria-hidden="true" data-reveal="">
        <div className="doc doc-docx">
          <i className="doc-head" />
          <i className="doc-title" />
          <i className="doc-table" />
          <i className="doc-lines" />
          <b>DOCX</b>
        </div>
        <div className="doc-arrow">
          <Icon name="arrow" className="icon" />
        </div>
        <div className="doc doc-hwpx">
          <i className="doc-head" />
          <i className="doc-title" />
          <i className="doc-table" />
          <i className="doc-lines" />
          <b>HWPX</b>
        </div>
      </div>
    </section>
  );
}

/* ── Automatización (terminal) ───────────────────────────────────── */
export function Automation() {
  return (
    <section className="section auto" id="automation">
      <div className="auto-copy" data-reveal="">
        <p className="eyebrow">Para automatizar</p>
        <h2>Convierte desde la línea de comandos o deja que una carpeta lo haga</h2>
        <p>El comando filee convierte archivos, comodines y carpetas enteras con tus ajustes preestablecidos, imprime JSON para scripts y devuelve códigos de salida. Las carpetas supervisadas convierten todo lo que llega a ellas, en la aplicación o en un terminal.</p>
        <ul className="checks">
          {AUTO_CHECKS.map((c) => (
            <li key={c.text}>
              <Icon name="check" className="icon" />
              <span>
                {c.code ? (
                  <>
                    <code>filee convert *.heic --to jpg</code> {c.text}
                  </>
                ) : (
                  c.text
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="more-link">
          <a href={`${SITE}/es/cli/`} rel="noopener">
            Leer la guía de la línea de comandos <Icon name="arrow" />
          </a>
        </p>
      </div>

      <div className="auto-visual" data-reveal="">
        <figure className="terminal">
          <div className="terminal-bar" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <pre>
            <code>
              <span className="t-prompt">D:\Inbox&gt; </span>
              <span className="t-cmd">filee watch . --to pdf --move-originals</span>
              {'\n'}
              <span className="t-out">Watching D:\Inbox → PDF, saving to D:\Inbox\converted. Press Ctrl+C to stop.</span>
              {'\n'}
              <span className="t-ok">ok</span>
              <span className="t-out">    scan-0412.jpg -&gt; converted\scan-0412.pdf</span>
              {'\n'}
              <span className="t-ok">ok</span>
              <span className="t-out">    receipt.heic -&gt; converted\receipt.pdf</span>
              {'\n'}
              <span className="t-ok">ok</span>
              <span className="t-out">    contract.docx -&gt; converted\contract.pdf</span>
            </code>
          </pre>
        </figure>
      </div>
    </section>
  );
}

/* ── Galería de capturas ─────────────────────────────────────────── */
export function Gallery() {
  return (
    <section className="section" id="gallery">
      <Head title="Haz tuyo el menú circular">
        Ordena los formatos en un menú circular en vivo arrastrando y soltando: una barra por tipo de archivo, etiquetas de extensión y barras para selecciones mixtas.
      </Head>
      <div className="gallery" data-reveal="">
        {SCREENS.map((s) => (
          <figure key={s.src}>
            <div className="shot">
              <img src={`media/${s.src}`} alt={s.caption} width="1080" height="820" loading="lazy" decoding="async" />
            </div>
            <figcaption>{s.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ── Preguntas ───────────────────────────────────────────────────── */
export function Faq() {
  return (
    <section className="section" id="faq">
      <Head title="Preguntas y respuestas">Respuestas breves sobre precio, privacidad, formatos y cómo funciona Filee.</Head>
      <div className="faq" data-reveal="">
        {FAQ.map((item, i) => (
          <details key={item.q} open={i === 0}>
            <summary>
              <h3>{item.q}</h3>
              <Icon name="chevron" className="icon faq-chevron" />
            </summary>
            <div className="faq-answer">
              {item.a.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
              {item.pills ? (
                <ul className="pills">
                  {item.pills.map(([label, slug]) => (
                    <li key={label}>
                      <a className="pill" href={`${SITE}/es/convert/${slug}/`} rel="noopener">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {item.link ? (
                <p className="more-link">
                  <a href={item.link.href} rel="noopener">
                    {item.link.label} <Icon name="arrow" />
                  </a>
                </p>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ── De un vistazo ───────────────────────────────────────────────── */
export function Specs() {
  return (
    <section className="section" id="specs">
      <Head title="De un vistazo" />
      <dl className="specs" data-reveal="">
        {SPECS.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ── Descarga ────────────────────────────────────────────────────── */
export function Download() {
  const [target, setTarget] = useState(DOWNLOADS[0].value);
  const current = DOWNLOADS.find((d) => d.value === target) || DOWNLOADS[0];

  return (
    <section className="section download" id="download">
      <div className="download-card" data-reveal="">
        <Logo className="logo" />
        <h2>Descargar Filee</h2>
        <p>
          La mayoría de los formatos se convierten nada más instalar.
          <br />
          Los motores para vídeo, audio y formatos poco comunes se añaden en la aplicación cuando los necesites.
        </p>

        <div className="download-picker">
          <label htmlFor="download-target">Sistema operativo y procesador</label>
          <select id="download-target" value={target} onChange={(e) => setTarget(e.target.value)}>
            {DOWNLOADS.map((d) => (
              <option value={d.value} key={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <a className="btn btn-primary btn-large" href={`https://dl.filee.sh/${VERSION}/${current.file}`} rel="noopener">
          <Icon name="download" />
          <span>{current.cta}</span>
        </a>

        {current.archive ? (
          <p className="download-archive">
            <a href={`https://github.com/KnifeLemon/Filee/releases/tag/v${VERSION}`} target="_blank" rel="noopener noreferrer">
              ¿Necesitas el comando filee? Descarga el paquete y ejecuta install.sh.
            </a>
          </p>
        ) : null}

        <a className="store-badge" href="https://apps.microsoft.com/detail/XPDCN05L89WS0C" target="_blank" rel="noopener noreferrer">
          <img src="media/badges/ms-store/es.svg" alt="Obténlo en Microsoft Store" width="161" height="44" loading="lazy" decoding="async" />
        </a>
        <p className="download-winget">
          O con WinGet <code>winget install KnifeLemon.Filee</code>
        </p>

        <p className="download-status" role="status">
          {current.status}
        </p>
        <p className="download-platform-note">
          macOS está en versión preliminar. Linux necesita Ubuntu 22.04 o posterior; los gestos de arrastre requieren X11 (experimental en KDE Plasma con Wayland).
        </p>
        {current.mac ? (
          <p className="download-macos-note">
            Se necesita macOS 13 o posterior. Filee aún no está notarizado: abre la imagen de disco y autorízalo una vez en Privacidad y seguridad.
          </p>
        ) : null}

        <p className="download-meta">
          <a href={`https://github.com/KnifeLemon/Filee/releases/tag/v${VERSION}`} target="_blank" rel="noopener noreferrer">
            Descargar desde GitHub
          </a>
          <a href="https://github.com/KnifeLemon/Filee/releases" target="_blank" rel="noopener noreferrer">
            Todas las versiones
          </a>
          <a href={GITHUB} target="_blank" rel="noopener noreferrer">
            Código fuente
          </a>
        </p>
        <p className="download-sponsor">
          Filee es gratis y seguirá siéndolo.{' '}
          <a href="https://github.com/sponsors/KnifeLemon" target="_blank" rel="noopener noreferrer">
            Patrocina su desarrollo
          </a>
        </p>
      </div>
    </section>
  );
}
