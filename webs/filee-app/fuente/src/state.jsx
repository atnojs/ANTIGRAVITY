import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PROFILES } from './profiles.js';

const KEY = 'filee-app-settings-v1';

/** Formatos marcados por defecto: los de cada perfil. */
const DEFAULT_PROFILE_FORMATS = Object.fromEntries(PROFILES.map((p) => [p.id, [...p.formats]]));

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
  /** Perfil activo del menú circular (se guarda entre visitas). */
  profile: 'default',
  /** Formatos marcados en la tarjeta «Perfil» de Inicio, por perfil. */
  profileFormats: DEFAULT_PROFILE_FORMATS,
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

/** Ajustes guardados + valores por defecto, con las migraciones necesarias. */
function loadSettings() {
  let stored = {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) stored = JSON.parse(raw) || {};
  } catch {
    stored = {};
  }

  const merged = { ...DEFAULTS, ...stored };

  // La sección «Menú circular» ya no existe: su configuración vive en Inicio.
  if (merged.page === 'donut') merged.page = 'inicio';

  // Formatos por perfil: sólo perfiles y formatos que existen hoy.
  const savedFormats = stored.profileFormats && typeof stored.profileFormats === 'object' ? stored.profileFormats : {};
  const profileFormats = {};
  for (const p of PROFILES) {
    const saved = savedFormats[p.id];
    profileFormats[p.id] = Array.isArray(saved) ? p.formats.filter((f) => saved.includes(f)) : [...p.formats];
  }
  merged.profileFormats = profileFormats;

  if (!PROFILES.some((p) => p.id === merged.profile)) merged.profile = DEFAULTS.profile;

  return merged;
}

const Ctx = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [settings]);

  const set = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);
  const toggle = useCallback((key) => setSettings((s) => ({ ...s, [key]: !s[key] })), []);

  /** Marca o desmarca un formato del menú circular en el perfil indicado. */
  const toggleFormat = useCallback((profileId, format) => {
    setSettings((s) => {
      const base = PROFILES.find((p) => p.id === profileId);
      if (!base || !base.formats.includes(format)) return s;
      const current = new Set(s.profileFormats?.[profileId] ?? base.formats);
      if (current.has(format)) current.delete(format);
      else current.add(format);
      const next = base.formats.filter((f) => current.has(f));
      return { ...s, profileFormats: { ...s.profileFormats, [profileId]: next } };
    });
  }, []);

  const addHistory = useCallback(
    (item) => setSettings((s) => ({ ...s, history: [{ ...item, id: `h${Date.now()}` }, ...s.history].slice(0, 40) })),
    [],
  );

  const value = useMemo(() => ({ settings, set, toggle, toggleFormat, addHistory }), [settings, set, toggle, toggleFormat, addHistory]);
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
