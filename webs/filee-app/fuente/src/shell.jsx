import Icon from './icons.jsx';
import Logo from './components/Logo.jsx';
import { useSettings } from './state.jsx';

export const NAV = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'general', label: 'General', icon: 'cog' },
  { id: 'atajos', label: 'Atajos', icon: 'keyboard' },
  { id: 'donut', label: 'Menú circular', icon: 'donut' },
  { id: 'presets', label: 'Ajustes preestablecidos', icon: 'presets' },
  { id: 'areas', label: 'Áreas', icon: 'areas' },
  { id: 'watch', label: 'Carpetas supervisadas', icon: 'folder' },
  { id: 'tema', label: 'Tema', icon: 'palette' },
  { id: 'motores', label: 'Motores', icon: 'engines' },
  { id: 'acerca', label: 'Acerca de', icon: 'info' },
];

export function TitleBar({ onMinimize, onMaximize, onClose }) {
  return (
    <div className="titlebar">
      <div className="titlebar-brand">
        <Logo className="titlebar-logo" />
        <span>Filee</span>
      </div>
      <div className="titlebar-controls">
        <button type="button" className="win-btn" aria-label="Minimizar" onClick={onMinimize}>
          <Icon name="minus" />
        </button>
        <button type="button" className="win-btn" aria-label="Maximizar o restaurar" onClick={onMaximize}>
          <Icon name="square" />
        </button>
        <button type="button" className="win-btn is-close" aria-label="Cerrar" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse }) {
  const { settings, set } = useSettings();

  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <Logo className="sidebar-logo" />
        {!collapsed && (
          <div className="sidebar-brand-text">
            <span className="sidebar-name">Filee</span>
            <span className="sidebar-tagline">Arrastra, suelta y convierte.</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Secciones">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item${settings.page === item.id ? ' is-active' : ''}`}
            aria-current={settings.page === item.id ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            onClick={() => set({ page: item.id })}
          >
            <Icon name={item.icon} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <button type="button" className="icon-btn collapse-btn" aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'} onClick={onToggleCollapse}>
          <Icon name="collapse" />
        </button>
        <div className="sidebar-links">
          <a className="chip-link" href="https://github.com/KnifeLemon/Filee" target="_blank" rel="noopener noreferrer">
            <Icon name="github" /> GitHub
          </a>
          <a className="chip-link is-heart" href="https://github.com/sponsors/KnifeLemon" target="_blank" rel="noopener noreferrer">
            <Icon name="heart" /> Patrocinar
          </a>
        </div>
        <span className="version">Versión 2.5.0</span>
      </div>
    </aside>
  );
}
