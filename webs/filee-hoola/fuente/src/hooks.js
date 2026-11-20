import { useEffect, useRef, useState } from 'react';

/** Marca el <html> como "js" para que las animaciones de entrada solo
 *  oculten contenido cuando hay JavaScript. */
export function useJsClass() {
  useEffect(() => {
    document.documentElement.classList.add('js');
  }, []);
}

/** Añade .is-visible a los [data-reveal] cuando entran en pantalla.
 *  Incluye un barrido en scroll para que un salto de ancla (o un desplazamiento
 *  muy rápido) no deje secciones invisibles al pasar por encima de ellas. */
export function useReveal(deps = []) {
  useEffect(() => {
    const reveal = (el) => el.classList.add('is-visible');
    const pending = () => Array.from(document.querySelectorAll('[data-reveal]:not(.is-visible)'));

    if (!('IntersectionObserver' in window)) {
      pending().forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            reveal(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    pending().forEach((n) => io.observe(n));

    let raf = 0;
    const sweep = () => {
      const vh = window.innerHeight;
      pending().forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.95) reveal(el);
      });
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sweep();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    sweep();

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, deps);
}

/** true cuando la página lleva desplazamiento (barra de navegación opaca). */
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

/** true cuando el elemento está suficientemente visible en pantalla. */
export function useInView(ref, { threshold = 0.35, once = false } = {}) {
  const [inView, setInView] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) done.current = true;
        } else if (!once || !done.current) {
          setInView(false);
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, once]);
  return inView;
}
