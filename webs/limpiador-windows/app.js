// ============================================================
// 🧹 LIMPIADOR WINDOWS — App React (Babel)
// Neon Glassmorphism · Antigravity Style Guide
// ============================================================

const { useState, useEffect, useCallback, useRef } = React;

// ============================================================
// CONFIGURACIÓN
// ============================================================

// Detectar si hay servidor PHP disponible
const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
const PATH_PREFIX = IS_FILE_PROTOCOL
    ? ''
    : window.location.pathname.replace(/\/(index\.html?)?$/, '').replace(/\/$/, '');
const API_BASE = IS_FILE_PROTOCOL
    ? null
    : (window.location.origin + PATH_PREFIX + '/proxy.php?action=');

const STORAGE_KEY = 'limpiador_windows_history';
const STORAGE_SIM_KEY = 'limpiador_windows_sim_state';
const POLL_INTERVAL_MS = 3000;
const STATUS_INTERVAL_MS = 15000;

const MODES = [
    {
        id: 1,
        name: 'Analizar solamente',
        desc: 'Examina todo sin borrar nada. Ideal para ver qué ocupa espacio.',
        icon: '🔍',
        cssClass: 'mode-1',
    },
    {
        id: 2,
        name: 'Limpieza guiada',
        desc: 'Analiza por secciones sin borrar. Las confirmaciones reales se activarán desde la web.',
        icon: '🧹',
        cssClass: 'mode-2',
    },
    {
        id: 3,
        name: 'Limpieza automática',
        desc: 'Limpia todo sin preguntar. Perfecto para tareas programadas.',
        icon: '⚡',
        cssClass: 'mode-3',
    },
    {
        id: 4,
        name: 'Limpieza profunda',
        desc: 'Modo automático + Prefetch, memory dumps, logs, Windows.old.',
        icon: '💎',
        cssClass: 'mode-4',
    },
    {
        id: 5,
        name: 'Solo sistema (sin apps)',
        desc: 'Limpieza automática sin tocar navegadores ni aplicaciones.',
        icon: '🖥️',
        cssClass: 'mode-5',
    },
];

// ============================================================
// SIMULACIÓN LOCAL (cuando no hay servidor PHP)
// ============================================================

function getSimState() {
    try {
        const raw = localStorage.getItem(STORAGE_SIM_KEY);
        return raw ? JSON.parse(raw) : { orders: [], results: [] };
    } catch (e) {
        return { orders: [], results: [] };
    }
}

function saveSimState(state) {
    localStorage.setItem(STORAGE_SIM_KEY, JSON.stringify(state));
}

function simApi(endpoint, method, body) {
    const state = getSimState();

    switch (endpoint) {
        case 'status':
            return {
                ok: true,
                has_pending: state.orders.some(o => o.status === 'pending'),
                total_orders: state.orders.length,
                total_results: state.results.length,
                last_cleanup: state.results.length > 0
                    ? state.results[state.results.length - 1].completed_at
                    : null,
            };

        case 'order': {
            if (!body || !body.mode) return { error: 'Modo inválido' };

            const pending = state.orders.find(o => o.status === 'pending');
            if (pending) return { error: 'Ya hay una limpieza en curso', pending_order: pending };

            const modeNames = {
                1: 'Analizar solamente',
                2: 'Limpieza guiada',
                3: 'Limpieza automática',
                4: 'Limpieza profunda',
                5: 'Solo sistema (sin apps)',
            };

            const order = {
                id: 'sim_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                mode: body.mode,
                mode_name: modeNames[body.mode] || 'Desconocido',
                status: 'pending',
                created_at: new Date().toISOString(),
                completed_at: null,
            };

            state.orders.push(order);
            saveSimState(state);

            // Simular que el agente procesa en 3 segundos
            setTimeout(() => simCompleteOrder(order), 3000);

            return { ok: true, order: order, message: 'Orden creada (simulación). El agente la procesará...' };
        }

        case 'pending':
            // La simulación actúa como agente también
            return {
                ok: true,
                has_order: state.orders.some(o => o.status === 'pending'),
                order: state.orders.find(o => o.status === 'pending') || null,
            };

        case 'latest':
            if (state.results.length === 0) {
                return { ok: true, has_result: false, result: null };
            }
            return { ok: true, has_result: true, result: state.results[state.results.length - 1] };

        case 'history':
            return { ok: true, count: state.results.length, results: [...state.results].reverse() };

        default:
            return { error: 'Endpoint no encontrado' };
    }
}

function simCompleteOrder(order) {
    const state = getSimState();

    // Marcar orden como completada
    const ord = state.orders.find(o => o.id === order.id);
    if (ord) {
        ord.status = 'completed';
        ord.completed_at = new Date().toISOString();
    }

    // Crear resultado simulado
    const modesLog = {
        1: 'Modo: Analizar (DryRun) — No se borró nada\nSimulación: los datos son de demostración.',
        2: 'Modo: Limpieza guiada\nSimulación: los datos son de demostración.',
        3: 'Modo: Limpieza automática\nSimulación: los datos son de demostración.',
        4: 'Modo: Limpieza profunda\nSimulación: los datos son de demostración.',
        5: 'Modo: Solo sistema\nSimulación: los datos son de demostración.',
    };

    const result = {
        order_id: order.id,
        mode: order.mode,
        mode_name: order.mode_name,
        status: 'success',
        total_analyzed: '1.85 GB',
        total_freed: '856 MB',
        errors: 0,
        log: [
            '============================================================',
            '  LIMPIADOR DE BASURA - Windows 10/11',
            '============================================================',
            '  Version    : 1.0.0',
            '  Ejecucion  : ' + new Date().toISOString(),
            '  Equipo     : MI-PC',
            '  Usuario    : anton',
            '  Admin      : Si',
            '  Modo       : ' + order.mode_name + ' (simulacion)',
            '  Log        : %TEMP%\\CleanJunk_sim.log',
            '',
            '============================================================',
            '1. ARCHIVOS TEMPORALES DEL SISTEMA',
            '============================================================',
            '>> Windows Temp',
            '   [i] Encontrado: 245.32 MB',
            '   [+] Eliminado: 245.32 MB',
            '',
            '>> Temp del usuario',
            '   [i] Encontrado: 512.18 MB',
            '   [+] Eliminado: 512.18 MB',
            '',
            '============================================================',
            '2. WINDOWS UPDATE Y DELIVERY OPTIMIZATION',
            '============================================================',
            '>> Windows Update cache',
            '   [i] Encontrado: 1.02 GB',
            '   [+] Eliminado: 1.02 GB',
            '',
            '============================================================',
            '3. PAPELERA DE RECICLAJE',
            '============================================================',
            '>> Papelera de reciclaje',
            '   [i] Elementos en papelera: 12 objetos',
            '   [+] Papelera vaciada (Clear-RecycleBin)',
            '',
            '============================================================',
            '4. CACHES DE NAVEGADORES',
            '============================================================',
            '>> Chrome Cache [Default]',
            '   [i] Encontrado: 89.54 MB',
            '   [+] Eliminado: 89.54 MB',
            '',
            '============================================================',
            'RESUMEN DE LIMPIEZA',
            '============================================================',
            '  MODO: LIMPIEZA REAL',
            '',
            '  Total analizado   : 1.85 GB',
            '  Total liberado    : 856 MB',
            '  Errores           : 0',
            '  Log guardado en   : %TEMP%\\CleanJunk_sim.log',
            '',
            '============================================================',
            '⚠️ SIMULACIÓN: Estos datos son de demostración.',
            '   Sube los archivos a Hostinger y ejecuta el agente',
            '   en Windows para ver resultados reales.',
            '============================================================',
        ].join('\n'),
        sections: [
            'Windows Temp',
            'Temp del usuario',
            'Windows Update cache',
            'Papelera de reciclaje',
            'Chrome Cache',
        ],
        computer: 'MI-PC (simulación)',
        user: 'anton',
        is_admin: true,
        completed_at: new Date().toISOString(),
    };

    state.results.push(result);
    saveSimState(state);
}

// ============================================================
// HOOKS
// ============================================================

function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            console.warn('Error cargando localStorage:', e);
        }
        return initialValue;
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Error guardando localStorage:', e);
        }
    }, [key, value]);

    return [value, setValue];
}

async function fetchJson(url, options = {}, timeoutMs = 5000) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    try {
        const resp = await fetch(url, {
            ...options,
            signal: controller ? controller.signal : options.signal,
        });
        return await resp.json();
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

// ============================================================
// COMPONENTE: StatusBar
// ============================================================

function StatusBar({ status, lastCleanup, onRefresh, isSimulation, stalePending }) {
    const statusConfig = {
        idle:    { dot: 'online',  text: isSimulation ? 'Simulación activa — Pulsa un modo' : 'Conectado — Esperando orden', color: 'text-emerald' },
        waiting: { dot: 'waiting', text: isSimulation ? 'Simulando limpieza...' : 'Agente trabajando...',       color: 'text-cyan' },
        done:    { dot: 'online',  text: 'Limpieza completada',        color: 'text-emerald' },
        error:   { dot: 'offline', text: isSimulation ? 'Simulación activa' : 'Agente no disponible',       color: 'text-amber' },
    };

    const cfg = statusConfig[status] || statusConfig.idle;

    return (
        <div className="status-bar glass-card">
            <div>
                <span className={`status-dot ${cfg.dot}`}></span>
                <span className={cfg.color}>{cfg.text}</span>
                {stalePending && status === 'idle' && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>
                        Orden atascada
                    </span>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {isSimulation && (
                    <span style={{ fontSize: '0.7rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>
                        DEMO
                    </span>
                )}
                {lastCleanup && (
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Última: {new Date(lastCleanup).toLocaleString('es-ES')}
                    </span>
                )}
                <button className="agent-switch" onClick={onRefresh} title="Verificar estado">
                    ↻
                </button>
            </div>
        </div>
    );
}

// ============================================================
// COMPONENTE: ModeSelector
// ============================================================

function ModeSelector({ onSelect, disabled, activeMode, isSimulation }) {
    return (
        <div className="mode-selector">
            {MODES.map((mode, idx) => (
                <button
                    key={mode.id}
                    className={`mode-btn ${mode.cssClass} fade-in-up ${activeMode === mode.id ? 'processing' : ''}`}
                    onClick={() => onSelect(mode.id)}
                    disabled={disabled}
                >
                    <div className="mode-icon">
                        {activeMode === mode.id ? (
                            <div className="btn-spinner"></div>
                        ) : mode.icon}
                    </div>
                    <div className="mode-info">
                        <div className="mode-name">
                            {activeMode === mode.id ? 'PROCESANDO...' : mode.name}
                        </div>
                        <div className="mode-desc">{isSimulation && activeMode !== mode.id ? '🟣 Demo: ' : ''}{mode.desc}</div>
                    </div>
                </button>
            ))}
        </div>
    );
}

// ============================================================
// COMPONENTE: LoadingOverlay
// ============================================================

function LoadingOverlay({ visible, text, subtext, onCancel }) {
    return (
        <div className={`loading-overlay ${visible ? '' : 'hidden'}`}>
            <div className="spinner-triple">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
            </div>
            <p className="loading-text">{text || 'IA Generando Obra Maestra...'}</p>
            {subtext && <p className="loading-subtext">{subtext}</p>}
            {onCancel && (
                <button className="btn-glass danger" onClick={onCancel} style={{ marginTop: '1rem' }}>
                    Cancelar limpieza
                </button>
            )}
        </div>
    );
}

// ============================================================
// COMPONENTE: ResultsPanel
// ============================================================

function GuidedApproval({ plan, onRun, disabled }) {
    const available = (plan || []).filter(block => (block.analyzed_bytes || 0) > 0 || block.id === 'recycle_bin');
    const [selected, setSelected] = useState(() => available.filter(block => (block.analyzed_bytes || 0) > 0).map(block => block.id));

    useEffect(() => {
        setSelected(available.filter(block => (block.analyzed_bytes || 0) > 0).map(block => block.id));
    }, [JSON.stringify(available.map(block => [block.id, block.analyzed_bytes]))]);

    if (available.length === 0) return null;

    const toggle = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    return (
        <div className="glass-card fade-in-up" style={{ marginTop: '1rem', borderColor: 'rgba(34,211,238,0.3)' }}>
            <h3 style={{ color: '#22d3ee', marginBottom: '0.75rem' }}>Aprobar limpieza por bloques</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {available.map(block => (
                    <label key={block.id} className="history-item" style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="checkbox"
                                checked={selected.includes(block.id)}
                                onChange={() => toggle(block.id)}
                            />
                            <div>
                                <div className="hist-mode">{block.name}</div>
                                <div className="hist-date">Encontrado: {block.total_analyzed || '0 B'}</div>
                            </div>
                        </div>
                        <div className="hist-freed">{block.total_freed || '0 B'}</div>
                    </label>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn-glass danger" disabled={disabled || selected.length === 0} onClick={() => onRun(selected)}>
                    Limpiar bloques seleccionados
                </button>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Solo se borrarán los bloques marcados.
                </span>
            </div>
        </div>
    );
}

function ResultsPanel({ result, onViewLog, isSimulation, onRunGuided, isBusy }) {
    if (!result) return null;

    const hasErrors = (result.errors || 0) > 0;
    const canApproveGuided = result.mode === 2
        && result.guided_plan
        && result.guided_plan.length > 0
        && !(result.mode_name || '').includes('bloques aprobados');

    return (
        <div className="results-panel fade-in-up">
            <h2 className="gradient-text">Resultados de la limpieza</h2>

            {isSimulation && (
                <div style={{
                    background: 'rgba(167,139,250,0.1)',
                    border: '1px solid rgba(167,139,250,0.3)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    color: '#a78bfa',
                }}>
                    ⚠️ <strong>Modo demostración:</strong> Los datos son simulados. Sube los archivos a Hostinger y ejecuta el agente en Windows para resultados reales.
                </div>
            )}

            <div className="result-stats">
                <div className="stat-card">
                    <div className="stat-value">{result.total_freed || '0 B'}</div>
                    <div className="stat-label">Espacio liberado</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{result.total_analyzed || '0 B'}</div>
                    <div className="stat-label">Analizado</div>
                </div>
                <div className={`stat-card ${hasErrors ? 'danger' : 'success'}`}>
                    <div className="stat-value">{result.errors || 0}</div>
                    <div className="stat-label">Errores</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{result.mode_name || '—'}</div>
                    <div className="stat-label">Modo usado</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn-glass" onClick={() => onViewLog(result)}>
                    📋 Ver log completo
                </button>
                <span className="text-muted" style={{ fontSize: '0.75rem', alignSelf: 'center' }}>
                    {result.computer} · {new Date(result.completed_at).toLocaleString('es-ES')}
                </span>
            </div>
            {canApproveGuided && (
                <GuidedApproval
                    plan={result.guided_plan}
                    onRun={onRunGuided}
                    disabled={isBusy}
                />
            )}
        </div>
    );
}

// ============================================================
// COMPONENTE: HistorySection
// ============================================================

function HistorySection({ history, onSelect, onClear }) {
    if (!history || history.length === 0) return null;

    return (
        <div className="history-section fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3>📜 Historial de limpiezas</h3>
                <button className="btn-glass danger" onClick={onClear} style={{ fontSize: '0.75rem' }}>
                    Limpiar todo
                </button>
            </div>

            {history.map((item) => (
                <div
                    key={item.id}
                    className="history-item"
                    onClick={() => onSelect(item)}
                >
                    <div>
                        <div className="hist-mode">{item.mode_name || 'Limpieza'}</div>
                        <div className="hist-date">
                            {new Date(item.completed_at || item.id.split('_')[0]).toLocaleString('es-ES')}
                        </div>
                    </div>
                    <div className="hist-freed">{item.total_freed || '0 B'}</div>
                </div>
            ))}
        </div>
    );
}

// ============================================================
// COMPONENTE: Lightbox
// ============================================================

function Lightbox({ visible, content, title, onClose }) {
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (visible) {
            document.addEventListener('keydown', handleEsc);
        }
        return () => document.removeEventListener('keydown', handleEsc);
    }, [visible, onClose]);

    return (
        <div className={`lightbox ${visible ? '' : 'hidden'}`} onClick={onClose}>
            <button className="lightbox-close" onClick={onClose}>✕</button>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                {title && <h3 className="text-cyan" style={{ marginBottom: '0.75rem' }}>{title}</h3>}
                {content}
            </div>
        </div>
    );
}

// ============================================================
// COMPONENTE: SetupBanner (cuando no hay servidor ni demo)
// ============================================================

function SetupBanner({ isSimulation, onEnableSim }) {
    if (!IS_FILE_PROTOCOL && !isSimulation) return null;

    return (
        <div className="glass-card fade-in-up" style={{
            marginBottom: '1.5rem',
            borderColor: 'rgba(167,139,250,0.3)',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
            <h3 style={{ color: '#a78bfa', marginBottom: '0.5rem' }}>
                {isSimulation ? 'Modo Demostración' : 'App no conectada a servidor'}
            </h3>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                {isSimulation
                    ? 'Estás viendo datos simulados. Para usar la app de verdad:'
                    : 'Has abierto el archivo directamente. Para que funcione necesitas:'}
            </p>
            <div style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
            }}>
                {!isSimulation && (
                    <button className="btn-glass" onClick={onEnableSim} style={{ borderColor: 'rgba(167,139,250,0.4)' }}>
                        🟣 Activar modo demo
                    </button>
                )}
                <button className="btn-glass" onClick={() => {
                    const cmd = IS_FILE_PROTOCOL
                        ? 'php -S localhost:8080'
                        : 'php -S localhost:8080 -t ' + PATH_PREFIX;
                    alert(
                        '🚀 Para probar en local:\n\n' +
                        '1. Abre una terminal en la carpeta del proyecto\n' +
                        '2. Ejecuta: php -S localhost:8080\n' +
                        '3. Abre: http://localhost:8080\n\n' +
                        '📤 Para usar en producción:\n' +
                        'Sube todos los archivos a Hostinger por FTP.'
                    );
                }} style={{ borderColor: 'rgba(34,211,238,0.4)' }}>
                    💡 ¿Cómo lo pongo en marcha?
                </button>
            </div>
        </div>
    );
}

// ============================================================
// COMPONENTE PRINCIPAL: App
// ============================================================

function App() {
    const [status, setStatus] = useState(IS_FILE_PROTOCOL ? 'idle' : 'idle');
    const [activeMode, setActiveMode] = useState(null);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [latestResult, setLatestResult] = useState(null);
    const [history, setHistory] = useLocalStorage(STORAGE_KEY, []);
    const [lightbox, setLightbox] = useState({ visible: false, content: '', title: '' });
    const [lastCleanup, setLastCleanup] = useState(null);
    const [isSimulation, setIsSimulation] = useState(IS_FILE_PROTOCOL);
    const [serverAvailable, setServerAvailable] = useState(!IS_FILE_PROTOCOL);
    const [stalePendingOrder, setStalePendingOrder] = useState(null);
    const pollingRef = useRef(null);
    const stopPollingRef = useRef(null);
    const statusRef = useRef(null);

    // ─── Verificar conexión con el servidor ──────────
    const checkConnection = useCallback(async () => {
        if (IS_FILE_PROTOCOL) {
            setServerAvailable(false);
            return;
        }

        try {
            const data = await fetchJson(API_BASE + 'status');
            if (data.ok) {
                setServerAvailable(true);
                setIsSimulation(false);
                if (data.has_pending) {
                    setStalePendingOrder(data.pending_order || { id: 'unknown', mode_name: 'Desconocido' });
                    setStatus('idle');
                } else {
                    setStalePendingOrder(null);
                    setStatus('idle');
                }
                if (data.last_cleanup) {
                    setLastCleanup(data.last_cleanup);
                }
                return true;
            }
        } catch (e) {
            setServerAvailable(false);
        }
        return false;
    }, []);

    // ─── Inicialización ──────────────────────────────
    useEffect(() => {
        const init = async () => {
            const available = await checkConnection();
            if (!available && !IS_FILE_PROTOCOL) {
                // Servidor no disponible → ofrecer demo
                setStatus('error');
            }
        };
        init();
        statusRef.current = setInterval(checkConnection, STATUS_INTERVAL_MS);
        return () => {
            if (statusRef.current) clearInterval(statusRef.current);
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [checkConnection]);

    // ─── Activar modo simulación ──────────────────────
    const handleEnableSim = () => {
        setIsSimulation(true);
        setStatus('idle');
        setServerAvailable(true); // La simulación "es" el servidor
    };

    // ─── Obtener último resultado ─────────────────────
    const fetchLatestResult = async () => {
        if (isSimulation) {
            const data = simApi('latest');
            if (data.ok && data.has_result && data.result) {
                setLatestResult(data.result);
                setLastCleanup(data.result.completed_at);
            }
            return;
        }

        if (!API_BASE) return;
        try {
            const data = await fetchJson(API_BASE + 'latest');
            if (data.ok && data.has_result && data.result) {
                setLatestResult(data.result);
                setLastCleanup(data.result.completed_at);
            }
        } catch (e) {
            // Silencioso
        }
    };

    // ─── Polling tras crear orden ────────────────────
    const startPolling = useCallback((orderId) => {
        let attempts = 0;
        const maxAttempts = 200;

        const poll = async () => {
            attempts++;

            let data;
            if (isSimulation) {
                data = simApi('latest');
            } else {
                try {
                    data = await fetchJson(API_BASE + 'latest');
                } catch (e) {
                    if (attempts >= maxAttempts) {
                        stopPolling();
                        setStatus('error');
                        setActiveMode(null);
                    }
                    return;
                }
            }

            if (data && data.ok && data.has_result && data.result && data.result.order_id === orderId) {
                stopPolling();
                setLatestResult(data.result);
                setStatus('done');
                setActiveMode(null);
                setCurrentOrder(null);
                setLastCleanup(data.result.completed_at);

                const historyItem = {
                    id: data.result.order_id,
                    mode_name: data.result.mode_name,
                    total_freed: data.result.total_freed,
                    total_analyzed: data.result.total_analyzed,
                    errors: data.result.errors,
                    completed_at: data.result.completed_at,
                    computer: data.result.computer,
                };
                setHistory(prev => {
                    const exists = prev.find(h => h.id === historyItem.id);
                    if (exists) return prev;
                    return [historyItem, ...prev].slice(0, 30);
                });
                return;
            }

            if (attempts >= maxAttempts) {
                stopPolling();
                setStatus('error');
                setActiveMode(null);
            }
        };

        const stopPolling = () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };

        stopPollingRef.current = stopPolling;
        stopPolling();
        pollingRef.current = setInterval(poll, POLL_INTERVAL_MS);
        poll();
    }, [isSimulation, setHistory]);

    // ─── Cancelar orden pendiente ────────────────────
    const handleCancelPending = useCallback(async () => {
        stopPollingRef.current?.();
        setStatus('idle');
        setActiveMode(null);
        setCurrentOrder(null);
        setStalePendingOrder(null);
        setLatestResult(null);

        if (isSimulation) {
            const state = getSimState();
            state.orders = state.orders.map(o =>
                o.status === 'pending' ? { ...o, status: 'cancelled', completed_at: new Date().toISOString() } : o
            );
            saveSimState(state);
            return;
        }

        if (!API_BASE) return;
        try {
            await fetchJson(API_BASE + 'cancel');
        } catch (e) {
            // Silencioso — el servidor puede no responder pero el frontend ya se reseteó
        }
    }, [isSimulation]);

    // ─── Manejar selección de modo ────────────────────
    const handleModeSelect = async (modeId, extraBody = {}) => {
        if (activeMode) return;

        // Si hay orden pendiente atascada, cancelarla primero automáticamente
        if (stalePendingOrder) {
            await handleCancelPending();
        }

        setActiveMode(modeId);
        setStatus('waiting');
        setLatestResult(null);

        if (isSimulation) {
            const data = simApi('order', 'POST', { mode: modeId });
            if (data.ok && data.order) {
                setCurrentOrder(data.order);
                startPolling(data.order.id);
            } else if (data.error) {
                if (data.pending_order) {
                    setCurrentOrder(data.pending_order);
                    startPolling(data.pending_order.id);
                } else {
                    setStatus('error');
                    setActiveMode(null);
                    alert('Error: ' + data.error);
                }
            }
            return;
        }

        try {
            const data = await fetchJson(API_BASE + 'order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: modeId, ...extraBody }),
            });

            if (data.ok && data.order) {
                setCurrentOrder(data.order);
                startPolling(data.order.id);
            } else if (data.error) {
                if (data.pending_order) {
                    setCurrentOrder(data.pending_order);
                    startPolling(data.pending_order.id);
                } else {
                    setStatus('error');
                    setActiveMode(null);
                    alert('Error del servidor: ' + data.error);
                }
            }
        } catch (e) {
            setStatus('error');
            setActiveMode(null);
            setServerAvailable(false);
        }
    };

    const handleRunGuided = (guidedBlocks) => {
        if (!guidedBlocks || guidedBlocks.length === 0) return;
        handleModeSelect(2, { guided_blocks: guidedBlocks });
    };

    // ─── Ver log en lightbox ──────────────────────────
    const handleViewLog = (result) => {
        setLightbox({
            visible: true,
            title: `Log de limpieza — ${result.mode_name || ''}`,
            content: result.log || 'Sin log disponible',
        });
    };

    // ─── Cargar resultado del historial ───────────────
    const handleHistorySelect = (item) => {
        setLatestResult({
            order_id: item.id,
            mode_name: item.mode_name,
            total_freed: item.total_freed,
            total_analyzed: item.total_analyzed,
            errors: item.errors,
            completed_at: item.completed_at,
            computer: item.computer || 'Historial',
            log: item.log || '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ─── Limpiar historial ────────────────────────────
    const handleClearHistory = () => {
        if (confirm('¿Eliminar todo el historial de limpiezas?')) {
            setHistory([]);
        }
    };

    // ─── Refrescar estado ─────────────────────────────
    const handleRefresh = () => {
        checkConnection();
        fetchLatestResult();
    };

    // ─── Servidor no disponible ───────────────────────
    if (!serverAvailable && !isSimulation && !IS_FILE_PROTOCOL) {
        return (
            <div id="root">
                <header className="app-header fade-in-up">
                    <h1 className="gradient-text">🧹 Limpiador Windows</h1>
                    <p className="subtitle">Neon Glassmorphism Edition</p>
                    <span className="version-badge">v1.0 · Antigravity</span>
                </header>

                <SetupBanner isSimulation={false} onEnableSim={handleEnableSim} />
            </div>
        );
    }

    return (
        <div id="root">
            {/* Header */}
            <header className="app-header fade-in-up">
                <h1 className="gradient-text">🧹 Limpiador Windows</h1>
                <p className="subtitle">Elimina archivos basura al instante — Neon Glassmorphism Edition</p>
                <span className="version-badge">v1.0 · Antigravity</span>
            </header>

            {/* Banner si es simulación o file:// */}
            {(isSimulation || IS_FILE_PROTOCOL) && (
                <SetupBanner isSimulation={isSimulation} onEnableSim={handleEnableSim} />
            )}

            {/* Banner de orden pendiente atascada */}
            {stalePendingOrder && !activeMode && (
                <div className="glass-card fade-in-up" style={{
                    marginBottom: '1rem',
                    borderColor: 'rgba(251,191,36,0.4)',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>⚠️</div>
                    <p style={{ color: '#fbbf24', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Hay una limpieza pendiente sin completar
                    </p>
                    <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                        {stalePendingOrder.mode_name} · {stalePendingOrder.id}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="btn-glass danger" onClick={handleCancelPending} style={{ fontSize: '0.8rem' }}>
                            Cancelar y desatascar
                        </button>
                        <button className="btn-glass" onClick={() => {
                            setStalePendingOrder(null);
                            handleModeSelect(stalePendingOrder.mode || 3);
                        }} style={{ fontSize: '0.8rem', borderColor: 'rgba(34,211,238,0.4)' }}>
                            Reanudar con este modo
                        </button>
                    </div>
                </div>
            )}

            {/* Estado */}
            <StatusBar
                status={status}
                lastCleanup={lastCleanup}
                onRefresh={handleRefresh}
                isSimulation={isSimulation}
                stalePending={!!stalePendingOrder}
            />

            {/* Selector de modos */}
            <ModeSelector
                onSelect={handleModeSelect}
                disabled={activeMode !== null}
                activeMode={activeMode}
                isSimulation={isSimulation}
            />

            {/* Resultados */}
            {latestResult && (
                <ResultsPanel
                    result={latestResult}
                    onViewLog={handleViewLog}
                    isSimulation={isSimulation}
                    onRunGuided={handleRunGuided}
                    isBusy={activeMode !== null}
                />
            )}

            {/* Historial */}
            <HistorySection
                history={history}
                onSelect={handleHistorySelect}
                onClear={handleClearHistory}
            />

            {/* Overlay de carga */}
            <LoadingOverlay
                visible={status === 'waiting' && !latestResult}
                text={isSimulation ? 'Simulando limpieza...' : 'El agente está limpiando tu Windows...'}
                subtext={currentOrder ? `Modo: ${currentOrder.mode_name} · Esto puede tardar unos minutos` : 'Conectando con el agente...'}
                onCancel={handleCancelPending}
            />

            {/* Lightbox para log */}
            <Lightbox
                visible={lightbox.visible}
                title={lightbox.title}
                content={<div className="log-viewer" style={{ maxHeight: 'none' }}>{lightbox.content}</div>}
                onClose={() => setLightbox({ visible: false, content: '', title: '' })}
            />
        </div>
    );
}

// ============================================================
// RENDER
// ============================================================

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
