import { useEffect, useRef, useState } from 'react';
import Icon from '../icons.jsx';
import { useInView } from '../hooks.js';

/** Clip corto de la app: póster estático + vídeo que se carga al pulsar
 *  (o al entrar en pantalla, en el carrusel de funciones). */
export default function Clip({
  poster,
  posterDark,
  video,
  wide = false,
  autoPlayInView = false,
  playLabel = 'Reproducir clip',
  pauseLabel = 'Pausar clip',
  width = 720,
  height = 720,
}) {
  const box = useRef(null);
  const vid = useRef(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const inView = useInView(box, { threshold: 0.5 });

  const play = () => {
    const v = vid.current;
    if (!v) return;
    const start = () =>
      v
        .play()
        .then(() => {
          setStarted(true);
          setPlaying(true);
        })
        .catch(() => {
          /* el navegador puede bloquear la reproducción sin interacción */
        });
    if (!v.getAttribute('src')) {
      v.addEventListener('canplay', start, { once: true });
      v.setAttribute('src', video);
      v.load();
    } else {
      start();
    }
  };

  const toggle = () => {
    const v = vid.current;
    if (!v) return;
    if (v.paused) play();
    else v.pause();
  };

  useEffect(() => {
    if (autoPlayInView && inView) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, autoPlayInView]);

  return (
    <div className={`clip${wide ? ' clip-wide' : ''}${started ? ' is-started' : ''}${playing ? ' is-playing' : ''}`} ref={box}>
      <video
        ref={vid}
        muted
        loop
        playsInline
        preload="none"
        width={width}
        height={height}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <picture className="clip-poster">
        {posterDark ? <source srcSet={posterDark} media="(prefers-color-scheme: dark)" /> : null}
        <img src={poster} alt="" width={width} height={height} loading="lazy" decoding="async" />
      </picture>
      <button className="clip-toggle" type="button" aria-label={playing ? pauseLabel : playLabel} onClick={toggle}>
        <Icon name="play" className="icon icon-play" />
        <Icon name="pause" className="icon icon-pause" />
      </button>
    </div>
  );
}
