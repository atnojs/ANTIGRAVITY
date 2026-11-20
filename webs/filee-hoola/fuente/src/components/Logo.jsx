import { useId } from 'react';

/** Marca de la casa: anillo de seis porciones en cian/verde con el documento
 *  en el centro. Sustituye al logotipo ajeno al aplicar la estética propia. */
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
          <stop offset="0" stopColor="#7EF0D0" />
          <stop offset="1" stopColor="#00C2C2" />
        </linearGradient>
        <linearGradient id={gd} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00D0D0" />
          <stop offset="1" stopColor="#0E8C99" />
        </linearGradient>
        <linearGradient id={gg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5BE05B" />
          <stop offset="1" stopColor="#1B9E1B" />
        </linearGradient>
        <linearGradient id={doc} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A3B4E" />
          <stop offset="1" stopColor="#02161F" />
        </linearGradient>
        <filter id={sh} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="9" floodColor="#00D0D0" floodOpacity="0.45" />
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
        <path d="M262 217V240H285Z" fill="#00D0D0" stroke="#00D0D0" strokeWidth="4" />
      </g>
      <g fill="#00D0D0">
        <rect x="235" y="256" width="42" height="5" rx="2.5" opacity="0.85" />
        <rect x="235" y="268" width="32" height="5" rx="2.5" opacity="0.6" />
        <rect x="235" y="280" width="38" height="5" rx="2.5" opacity="0.4" />
      </g>
    </svg>
  );
}
