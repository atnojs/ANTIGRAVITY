import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'filee-app-settings-v1';

export const DEFAULTS = {
  page: 'inicio',
  lang: 'auto',
  autostart: false,
  onClose: 'ask',
  contextMenu: true,
  watchMainMenu: true,
  sameFolder: true,
  keepDates: false,
  batchList: false,
  geoZip: false,
  browserDrop: true,
  browserDropLocal: false,
  proxy: '',
  historyEnabled: true,
  themeStyle: 'soft',
  appearance: 'system',
  accent: '#00d0d0',
  radius: 14,
  donutOpacity: 96,
  windowScale: 100,
  systemFont: false,
  reduceMotion: false,
  flipWheel: true,
  flipKey: 'Tab',
  presets: [
    { id: 'png', name: 'Predeterminado · PNG', short: 'PNG', target: 'PNG', kind: 'Imagen', builtin: true },
    { id: 'jpg', name: 'JPG 80', short: 'JPG', target: 'JPG', kind: 'Imagen', builtin: true },
    { id: 'pdf', name: 'PDF (una imagen por página)', short: 'PDF', target: 'PDF', kind: 'Imagen', builtin: true },
    { id: 'svg', name: 'Trazar a SVG', short: 'SVG', target: 'SVG', kind: 'Imagen', builtin: true },
  ],
  watched: [],
  engines: {
    ffmpeg: { status: 'missing' },
    libreoffice: { status: 'missing' },
    calibre: { status: 'missing' },
    pandoc: { status: 'missing' },
    gs: { status: 'system', version: '10.3', path: 'C:\\Program Files\\gs\\gs10.03.1\\bin' },
  },
  history: [
    { id: 'h1', type: 'svg', title: 'Trazar a SVG', file: '6.png', time: '13:09', ok: true },
    { id: 'h2', type: 'pdf', title: 'PDF', file: '5c62d82a50adb259770131625a66cdff.png', time: '12:58', ok: true },
  ],
};

const Ctx = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [settings]);

  const set = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);
  const toggle = useCallback((key) => setSettings((s) => ({ ...s, [key]: !s[key] })), []);

  const addHistory = useCallback(
    (item) => setSettings((s) => ({ ...s, history: [{ ...item, id: `h${Date.now()}` }, ...s.history].slice(0, 40) })),
    [],
  );

  const value = useMemo(() => ({ settings, set, toggle, addHistory }), [settings, set, toggle, addHistory]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings fuera del proveedor');
  return ctx;
}

/** Aplica al documento los ajustes visuales (acento, redondeo, escala). */
export function useApplyTheme() {
  const { settings } = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--acc', settings.accent);
    root.style.setProperty('--radius', `${settings.radius}px`);
    root.style.setProperty('--ui-scale', String(settings.windowScale / 100));
    root.dataset.appearance = settings.appearance;
    root.dataset.themeStyle = settings.themeStyle;
    root.dataset.systemFont = settings.systemFont ? '1' : '0';
    root.dataset.reduceMotion = settings.reduceMotion ? '1' : '0';
  }, [settings.accent, settings.radius, settings.windowScale, settings.appearance, settings.themeStyle, settings.systemFont, settings.reduceMotion]);
}
