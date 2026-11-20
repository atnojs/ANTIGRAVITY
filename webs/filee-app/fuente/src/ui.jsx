import Icon from './icons.jsx';

/** Tarjeta de sección de la app. */
export function Card({ title, children, aside, className = '' }) {
  return (
    <section className={`card ${className}`.trim()}>
      {(title || aside) && (
        <header className="card-head">
          {title ? <h2>{title}</h2> : null}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

/** Bloque con etiqueta arriba y ayuda debajo (patrón de la app). */
export function Field({ label, htmlFor, hint, children, inline = false }) {
  return (
    <div className={`field${inline ? ' is-inline' : ''}`}>
      {label ? (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Switch({ checked, onChange, label, id }) {
  return (
    <button
      type="button"
      id={id}
      className={`switch${checked ? ' is-on' : ''}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-track">
        <span className="switch-knob" />
      </span>
      <span className="switch-text">{label ?? (checked ? 'Activado' : 'Desactivado')}</span>
    </button>
  );
}

export function Select({ id, value, onChange, options, width }) {
  return (
    <span className="select-wrap" style={width ? { width } : undefined}>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevron" className="select-chevron" />
    </span>
  );
}

export function Button({ children, icon, variant = 'default', ...rest }) {
  return (
    <button type="button" className={`btn btn-${variant}`} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </button>
  );
}

export function Slider({ id, value, min, max, step = 1, suffix = '', onChange, label }) {
  return (
    <div className="slider-row">
      <input
        id={id}
        className="slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-value">
        {value}
        {suffix}
      </span>
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`segmented-item${value === o.value ? ' is-active' : ''}`}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pill({ children, tone = 'default' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Empty({ icon = 'folder', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} className="empty-icon" />
      <p>{title}</p>
      {children}
    </div>
  );
}

export function Kbd({ children }) {
  return <kbd>{children}</kbd>;
}
