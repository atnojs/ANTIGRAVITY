/**
 * Cliente canónico del historial persistente de Antigravity.
 *
 * Conecta la interfaz con history.php. El servidor es la fuente de verdad:
 * carga, guarda, elimina, limpia y notifica cambios a la UI.
 *
 * const history = new HistoryManager('nombre_app');
 * await history.load();
 * await history.save({ type: 'image', data: { prompt: '...' }, imageData: dataUrl });
 */
class HistoryManager {
    constructor(appName, apiUrl = 'history.php') {
        if (!appName || typeof appName !== 'string') {
            throw new Error('HistoryManager necesita un nombre de app.');
        }
        this.appName = appName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
        this.apiUrl = apiUrl;
        this.history = [];
        this.listeners = new Set();
    }

    async _request(url, options = {}) {
        const response = await fetch(url, {
            cache: 'no-store',
            credentials: 'same-origin',
            ...options
        });

        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new Error(`El servidor de historial devolvió una respuesta inválida (HTTP ${response.status}).`);
        }

        if (!response.ok || !payload.success) {
            throw new Error(payload.error || `Error del historial (HTTP ${response.status}).`);
        }
        return payload;
    }

    async load() {
        const separator = this.apiUrl.includes('?') ? '&' : '?';
        const url = `${this.apiUrl}${separator}action=list&app=${encodeURIComponent(this.appName)}`;
        const payload = await this._request(url);
        this.history = Array.isArray(payload.history) ? payload.history : [];
        this._notify();
        return this.getAll();
    }

    async save(entry = {}) {
        const id = String(entry.id || `h_${Date.now()}_${cryptoRandomId()}`);
        const data = entry.data ?? entry;
        let imageData = entry.imageData || '';

        if (!imageData && data && typeof data === 'object') {
            const candidate = data.dataUrl || data.url || '';
            if (typeof candidate === 'string' && candidate.startsWith('data:image/')) {
                imageData = candidate;
            }
        }

        // Modelo: prioriza entry.model, luego data.model, luego el nombre de la app.
        const model = entry.model || data.model || this.appName;

        const payload = await this._request(`${this.apiUrl}?action=save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                app: this.appName,
                type: entry.type || 'item',
                model,
                data,
                imageData,
                createdAt: entry.createdAt || new Date().toISOString()
            })
        });

        this.history = this.history.filter(item => item.id !== payload.entry.id);
        this.history.unshift(payload.entry);
        this._notify();
        return payload.entry;
    }

    async delete(id) {
        if (!id) {
            throw new Error('Falta el ID del elemento que se quiere eliminar.');
        }
        await this._request(`${this.apiUrl}?action=delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app: this.appName, id })
        });
        this.history = this.history.filter(item => item.id !== id);
        this._notify();
        return true;
    }

    async clear() {
        const payload = await this._request(`${this.apiUrl}?action=clear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app: this.appName })
        });
        this.history = [];
        this._notify();
        return payload.deleted || 0;
    }

    async refresh() {
        return this.load();
    }

    getAll() {
        return this.history.map(item => ({ ...item }));
    }

    onChange(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('El listener del historial debe ser una función.');
        }
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    _notify() {
        const snapshot = this.getAll();
        this.listeners.forEach(callback => {
            try {
                callback(snapshot);
            } catch (error) {
                console.error('[HistoryManager] Error en listener:', error);
            }
        });
    }
}

function cryptoRandomId() {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const values = new Uint32Array(2);
        crypto.getRandomValues(values);
        return Array.from(values, value => value.toString(36)).join('');
    }
    return Math.random().toString(36).slice(2, 12);
}

if (typeof window !== 'undefined') {
    window.HistoryManager = HistoryManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}

// ============================================================
// SHIM DE COMPATIBILIDAD (API legacy)
// ------------------------------------------------------------
// Varias apps usan la API antigua: HistoryManager.configure(),
// init(), loadAll(), saveItem(), deleteItem(), clearAll().
// Este shim las delega en la API canonica (load/save/delete/clear)
// y mapea el formato servidor (imageUrl + data) al formato antiguo
// (url plano) que esas apps esperan al renderizar.
// El servidor (history.php) sigue siendo la fuente de verdad.
// ============================================================
(function () {
    if (typeof window === 'undefined' || !window.HistoryManager) return;

    const HM = window.HistoryManager;
    let legacyInstance = null;
    let legacyAppName = 'default';

    // configure({ dbName }) -> crea la instancia con la app legacy
    HM.configure = function (options) {
        legacyAppName = (options && options.dbName)
            ? String(options.dbName).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100)
            : 'default';
        legacyInstance = new HM(legacyAppName);
        return legacyInstance;
    };

    function getLegacy() {
        if (!legacyInstance) legacyInstance = new HM(legacyAppName);
        return legacyInstance;
    }

    // init() -> load()
    HM.init = function () {
        return getLegacy().load().then(function (items) {
            return items.map(mapLegacyItem);
        });
    };

    // loadAll() -> load() con mapeo al formato antiguo (item.url plano)
    HM.loadAll = function () {
        return getLegacy().load().then(function (items) {
            return items.map(mapLegacyItem);
        });
    };

    function mapLegacyItem(item) {
        const data = item.data || {};
        return {
            id: item.id,
            app: item.app,
            type: item.type,
            model: item.model || data.model || '',
            url: item.imageUrl || data.url || data.dataUrl || item.url || '',
            prompt: data.prompt || item.prompt || '',
            aspectRatio: data.aspectRatio || item.aspectRatio || '1:1',
            size: data.size || item.size || '',
            style: data.style || item.style || null,
            createdAt: item.createdAt || data.createdAt || Date.now()
        };
    }

    // saveItem({ id, url, prompt, model, ... }) -> save() canonico
    HM.saveItem = function (item) {
        const history = getLegacy();
        return history.save({
            id: item.id,
            type: item.type || 'image',
            model: item.model || 'desconocido',
            data: {
                prompt: item.prompt,
                aspectRatio: item.aspectRatio || '1:1',
                size: item.size || '',
                model: item.model || 'desconocido',
                style: item.style || {}
            },
            imageData: item.url || '',
            createdAt: new Date(item.createdAt || Date.now()).toISOString()
        }).then(function (entry) {
            return mapLegacyItem(entry);
        });
    };

    // deleteItem(id) -> delete(id)
    HM.deleteItem = function (id) {
        return getLegacy().delete(id);
    };

    // clearAll() -> clear()
    HM.clearAll = function () {
        return getLegacy().clear();
    };
})();
