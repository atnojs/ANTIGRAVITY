import { useId } from 'react';

/** Logotipo de Filee (anillo de seis porciones + documento). Cada instancia
 *  usa ids de gradiente propios para no colisionar en el DOM. */
export default function Logo({ className = 'logo', title }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gl = `gl-${uid}`;
  const gd = `gd-${uid}`;
  const gg = `gg-${uid}`;
  const doc = `doc-${uid}`;
  const sh = `sh-${uid}`;

  return (
    <svg className={className} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gl} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A39CF4" />
          <stop offset="1" stopColor="#6C63D8" />
        </linearGradient>
        <linearGradient id={gd} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8179E6" />
          <stop offset="1" stopColor="#4F46B5" />
        </linearGradient>
        <linearGradient id={gg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3FD6A0" />
          <stop offset="1" stopColor="#13875F" />
        </linearGradient>
        <linearGradient id={doc} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4B41AA" />
          <stop offset="1" stopColor="#2D2675" />
        </linearGradient>
        <filter id={sh} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#2D2675" floodOpacity="0.10" />
        </filter>
      </defs>
      <g filter={`url(#${sh})`} strokeWidth="24" strokeLinejoin="round">
        <path d="M169.99 71.02A204 204 0 0 1 342.01 71.02L297.71 147.76A116 116 0 0 0 214.29 147.76Z" fill={`url(#${gl})`} stroke={`url(#${gl})`} />
        <path d="M373.19 89.02A204 204 0 0 1 459.2 238L370.59 238A116 116 0 0 0 328.89 165.76Z" fill={`url(#${gg})`} stroke={`url(#${gg})`} transform="translate(10.39 -6)" />
        <path d="M459.2 274A204 204 0 0 1 373.19 422.98L328.89 346.24A116 116 0 0 0 370.59 274Z" fill={`url(#${gl})`} stroke={`url(#${gl})`} />
        <path d="M342.01 440.98A204 204 0 0 1 169.99 440.98L214.29 364.24A116 116 0 0 0 297.71 364.24Z" fill={`url(#${gd})`} stroke={`url(#${gd})`} />
        <path d="M138.81 422.98A204 204 0 0 1 52.8 274L141.41 274A116 116 0 0 0 183.11 346.24Z" fill={`url(#${gl})`} stroke={`url(#${gl})`} />
        <path d="M52.8 238A204 204 0 0 1 138.81 89.02L183.11 165.76A116 116 0 0 0 141.41 238Z" fill={`url(#${gd})`} stroke={`url(#${gd})`} />
      </g>
      <g filter={`url(#${sh})`} strokeLinejoin="round">
        <path d="M227 217H262L285 240V295H227Z" fill={`url(#${doc})`} stroke={`url(#${doc})`} strokeWidth="10" />
        <path d="M262 217V240H285Z" fill="#C9C4F7" stroke="#C9C4F7" strokeWidth="4" />
      </g>
      <g fill="#fff">
        <rect x="235" y="256" width="42" height="5" rx="2.5" opacity="0.55" />
        <rect x="235" y="268" width="32" height="5" rx="2.5" opacity="0.4" />
        <rect x="235" y="280" width="38" height="5" rx="2.5" opacity="0.3" />
      </g>
    </svg>
  );
}
