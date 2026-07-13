/**
 * HistoryManager — Gestor de historial server-side para apps Antigravity
 *
 * Gestiona almacenamiento
 * en servidor PHP (sin límite, accesible desde cualquier navegador).
 *
 * Uso:
 *   const hm = new HistoryManager('nombre_app');
 *   await hm.load();
 *   await hm.save({ type: 'image', data: { url: '...', prompt: '...' } });
 *   await hm.delete(id);
 *   await hm.clear();
 */
class HistoryManager {
    /**
     * @param {string} appName - Nombre único de la app
     * @param {string} apiUrl  - Ruta al history.php (por defecto 'history.php')
     */
    constructor(appName, apiUrl = 'history.php') {
        this.appName = appName;
        this.apiUrl = apiUrl;
        this.history = [];
        this.listeners = [];
    }

    /**
     * Carga el historial desde el servidor
     * @returns {Promise<Array>}
     */
    async load() {
        try {
            const res = await fetch(`${this.apiUrl}?action=list`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success) {
                this.history = data.history;
                this._notify();
            } else {
                console.warn('HistoryManager: error del servidor:', data.error);
            }
            return this.history;
        } catch (e) {
            console.warn('HistoryManager: error cargando historial:', e.message);
            return [];
        }
    }

    /**
     * Guarda una nueva entrada en el historial
     * @param {Object} entry - { type, data, ... }
     * @returns {Promise<Object>}
     */
    async save(entry) {
        const item = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: entry.type || 'image',
            data: entry.data || entry,
            createdAt: new Date().toISOString()
        };

        try {
            const res = await fetch(`${this.apiUrl}?action=save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success) {
                this.history.unshift(data.entry);
                this._notify();
            }
            return data;
        } catch (e) {
            console.warn('HistoryManager: error guardando:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Elimina una entrada por ID
     * @param {string} id
     * @returns {Promise<Object>}
     */
    async delete(id) {
        try {
            const res = await fetch(`${this.apiUrl}?action=delete&id=${encodeURIComponent(id)}`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success) {
                this.history = this.history.filter(e => e.id !== id);
                this._notify();
            }
            return data;
        } catch (e) {
            console.warn('HistoryManager: error eliminando:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Limpia todo el historial
     * @returns {Promise<Object>}
     */
    async clear() {
        try {
            const res = await fetch(`${this.apiUrl}?action=clear`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success) {
                this.history = [];
                this._notify();
            }
            return data;
        } catch (e) {
            console.warn('HistoryManager: error limpiando:', e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Suscribe a cambios en el historial
     * @param {Function} callback - recibe (historyArray)
     * @returns {Function} unsubscribe
     */
    onChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Obtiene el historial actual (caché local)
     * @returns {Array}
     */
    getAll() {
        return this.history;
    }

    /**
     * Fuerza recarga desde servidor
     * @returns {Promise<Array>}
     */
    async refresh() {
        return this.load();
    }

    // ── Interno ────────────────────────────────────────────
    _notify() {
        this.listeners.forEach(cb => {
            try {
                cb(this.history);
            } catch (e) {
                console.warn('HistoryManager: error en listener:', e);
            }
        });
    }
}

// Exportar para módulos y uso global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HistoryManager;
}
