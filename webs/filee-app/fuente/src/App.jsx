import { useCallback, useEffect, useState } from 'react';
import { SettingsProvider, useApplyTheme, useSettings } from './state.jsx';
import { Sidebar, TitleBar } from './shell.jsx';
import Home from './pages/Home.jsx';
import General from './pages/General.jsx';
import Shortcuts from './pages/Shortcuts.jsx';
import Donut from './pages/Donut.jsx';
import Presets from './pages/Presets.jsx';
import Areas from './pages/Areas.jsx';
import Watched from './pages/Watched.jsx';
import Theme from './pages/Theme.jsx';
import Engines from './pages/Engines.jsx';
import About from './pages/About.jsx';

const PAGES = {
  inicio: Home,
  general: General,
  atajos: Shortcuts,
  donut: Donut,
  presets: Presets,
  areas: Areas,
  watch: Watched,
  tema: Theme,
  motores: Engines,
  acerca: About,
};

function Toasts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const id = `${Date.now()}-${Math.random()}`;
      setItems((list) => [...list, { id, text: e.detail }]);
      setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3600);
    };
    window.addEventListener('filee-toast', onToast);
    return () => window.removeEventListener('filee-toast', onToast);
  }, []);

  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div className="toast" key={t.id}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Window() {
  const { settings } = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [closed, setClosed] = useState(false);
  useApplyTheme();

  const Page = PAGES[settings.page] || Home;
  const reopen = useCallback(() => setClosed(false), []);

  if (closed) {
    return (
      <div className="app-stage">
        <div className="closed-card">
          <h1>La ventana está cerrada</h1>
          <p>En la app de escritorio, «Al cerrar la ventana» decide si Filee sigue en segundo plano o sale del todo.</p>
          <button type="button" className="btn btn-primary" onClick={reopen}>
            <span>Volver a abrir Filee</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-stage">
      <div className={`app${maximized ? ' is-maximized' : ''}${minimized ? ' is-minimized' : ''}`}>
        <TitleBar
          onMinimize={() => setMinimized((v) => !v)}
          onMaximize={() => setMaximized((v) => !v)}
          onClose={() => setClosed(true)}
        />
        <div className="app-body" hidden={minimized}>
          <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} />
          <main className="content" id="main">
            <Page />
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Window />
      <Toasts />
    </SettingsProvider>
  );
}
