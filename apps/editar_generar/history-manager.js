/**
 * HistoryManager — Historial persistente con carpeta de imágenes
 * =================================================================
 * Módulo global (window.HistoryManager) para apps Antigravity.
 * Proporciona 3 capas de persistencia:
 *   1. IndexedDB — caché local rápida (imágenes base64 completas)
 *   2. Servidor PHP — history.php guarda imágenes en history_data/
 *   3. Merge — deduplica por ID al cargar, prefiere datos locales
 *
 * Uso básico:
 *   HistoryManager.configure({ dbName: 'mi_app_db' });
 *   await HistoryManager.init();
 *   const items = await HistoryManager.loadAll();
 *   await HistoryManager.saveItem({ id, url, prompt, createdAt });
 *   await HistoryManager.deleteItem(id);
 *   await HistoryManager.clearAll();
 *
 * Compatible con Vanilla JS y React (Babel standalone / importmaps).
 * =================================================================
 */
(function () {
  'use strict';

  const HistoryManager = {
    // ─── Configuración ───────────────────────────────────────
    _db: null,
    _initialized: false,

    config: {
      dbName: 'antigravity_history_db',
      storeName: 'history',
      dbVersion: 1,
      maxItems: 50,
      historyUrl: './history.php'
    },

    /**
     * Configurar antes de init(). Cada app DEBE llamar esto con su dbName único.
     * @param {Object} cfg - { dbName, storeName?, dbVersion?, maxItems?, historyUrl? }
     */
    configure: function (cfg) {
      Object.assign(this.config, cfg);
    },

    // ─── IndexedDB ───────────────────────────────────────────

    /**
     * Inicializa IndexedDB. Llamar una vez al arrancar la app.
     * @returns {Promise<IDBDatabase>}
     */
    init: function () {
      var self = this;
      return new Promise(function (resolve, reject) {
        if (self._initialized && self._db) {
          return resolve(self._db);
        }
        var request = indexedDB.open(self.config.dbName, self.config.dbVersion);
        request.onerror = function () {
          reject(request.error);
        };
        request.onsuccess = function () {
          self._db = request.result;
          self._initialized = true;
          resolve(self._db);
        };
        request.onupgradeneeded = function (event) {
          var database = event.target.result;
          if (!database.objectStoreNames.contains(self.config.storeName)) {
            database.createObjectStore(self.config.storeName, { keyPath: 'id' });
          }
        };
      });
    },

    /** @returns {Promise<void>} */
    _ensureDB: function () {
      if (!this._db) return this.init();
      return Promise.resolve();
    },

    /**
     * Carga todos los items desde IndexedDB, ordenados por createdAt descendente.
     * @returns {Promise<Array>}
     */
    loadFromDB: function () {
      var self = this;
      return this._ensureDB().then(function () {
        return new Promise(function (resolve, reject) {
          var tx = self._db.transaction(self.config.storeName, 'readonly');
          var store = tx.objectStore(self.config.storeName);
          var req = store.getAll();
          req.onsuccess = function () {
            var items = req.result || [];
            items.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
            resolve(items);
          };
          req.onerror = function () { reject(req.error); };
        });
      }).catch(function (e) {
        console.warn('[HistoryManager] Error loadFromDB:', e);
        return [];
      });
    },

    /**
     * Guarda un item en IndexedDB (upsert por ID).
     * @param {Object} item — debe tener { id }
     * @returns {Promise<void>}
     */
    saveToDB: function (item) {
      var self = this;
      return this._ensureDB().then(function () {
        return new Promise(function (resolve, reject) {
          var tx = self._db.transaction(self.config.storeName, 'readwrite');
          var store = tx.objectStore(self.config.storeName);
          var req = store.put(item);
          req.onsuccess = function () { resolve(); };
          req.onerror = function () { reject(req.error); };
        });
      }).catch(function (e) {
        console.warn('[HistoryManager] Error saveToDB:', e);
      });
    },

    /**
     * Elimina un item de IndexedDB por ID.
     * @param {string} id
     * @returns {Promise<void>}
     */
    deleteFromDB: function (id) {
      var self = this;
      return this._ensureDB().then(function () {
        return new Promise(function (resolve, reject) {
          var tx = self._db.transaction(self.config.storeName, 'readwrite');
          var store = tx.objectStore(self.config.storeName);
          var req = store.delete(id);
          req.onsuccess = function () { resolve(); };
          req.onerror = function () { reject(req.error); };
        });
      }).catch(function (e) {
        console.warn('[HistoryManager] Error deleteFromDB:', e);
      });
    },

    /**
     * Vacía todo el object store de IndexedDB.
     * @returns {Promise<void>}
     */
    clearDB: function () {
      var self = this;
      return this._ensureDB().then(function () {
        return new Promise(function (resolve, reject) {
          var tx = self._db.transaction(self.config.storeName, 'readwrite');
          var store = tx.objectStore(self.config.storeName);
          var req = store.clear();
          req.onsuccess = function () { resolve(); };
          req.onerror = function () { reject(req.error); };
        });
      }).catch(function (e) {
        console.warn('[HistoryManager] Error clearDB:', e);
      });
    },

    // ─── Servidor (history.php) ─────────────────────────────

    /**
     * Sincroniza un item al servidor (fire-and-forget).
     * Envía imageData como data URL base64 para que history.php guarde el archivo.
     * @param {Object} item — debe tener { id, url } (url = data URL base64)
     * @returns {Promise<void>}
     */
    syncToServer: function (item) {
      var self = this;
      return fetch(self.config.historyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          prompt: item.prompt || '',
          style: item.style || {},
          aspectRatio: item.aspectRatio || '1:1',
          size: item.size || '',
          calidad: item.calidad || 'pro',
          createdAt: item.createdAt || Date.now(),
          imageData: item.url || ''
        })
      }).then(function (res) {
        if (!res.ok) console.warn('[HistoryManager] syncToServer falló:', res.status);
      }).catch(function (e) {
        console.warn('[HistoryManager] Error syncToServer:', e);
      });
    },

    /**
     * Elimina un item del servidor.
     * @param {string} id
     * @returns {Promise<void>}
     */
    deleteFromServer: function (id) {
      return fetch(this.config.historyUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id })
      }).catch(function (e) {
        console.warn('[HistoryManager] Error deleteFromServer:', e);
      });
    },

    /**
     * Limpia todo el historial del servidor.
     * @returns {Promise<void>}
     */
    clearServerHistory: function () {
      return fetch(this.config.historyUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true })
      }).catch(function (e) {
        console.warn('[HistoryManager] Error clearServerHistory:', e);
      });
    },

    /**
     * Carga el historial desde el servidor.
     * @returns {Promise<Array>}
     */
    loadFromServer: function () {
      return fetch(this.config.historyUrl)
        .then(function (res) {
          if (!res.ok) return [];
          return res.json();
        })
        .then(function (data) {
          return (data && data.items) || [];
        })
        .catch(function (e) {
          console.warn('[HistoryManager] Error loadFromServer:', e);
          return [];
        });
    },

    // ─── Merge ───────────────────────────────────────────────

    /**
     * Fusiona items locales (IndexedDB, con data URL completa) con items del servidor
     * (que solo tienen imageUrl). Prefiere los locales; añade los del servidor que falten.
     * @param {Array} localItems
     * @param {Array} serverItems
     * @returns {Array} — ordenado por createdAt descendente
     */
    mergeHistory: function (localItems, serverItems) {
      var localMap = new Map();
      (localItems || []).forEach(function (item) {
        localMap.set(item.id, item);
      });
      (serverItems || []).forEach(function (s) {
        if (!localMap.has(s.id)) {
          localMap.set(s.id, Object.assign({}, s, { url: s.imageUrl || s.url || '' }));
        }
      });
      var merged = Array.from(localMap.values());
      merged.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      return merged;
    },

    // ─── Operaciones combinadas ─────────────────────────────

    /**
     * Carga todo el historial: IndexedDB primero (rápido), luego fusiona con servidor.
     * Guarda en IndexedDB los items nuevos que vengan del servidor.
     * @returns {Promise<Array>}
     */
    loadAll: function () {
      var self = this;
      return this.loadFromDB().then(function (localItems) {
        // Cargar del servidor en paralelo (background enrichment)
        return self.loadFromServer().then(function (serverItems) {
          if (!serverItems || !serverItems.length) return localItems;

          var merged = self.mergeHistory(localItems, serverItems);

          // Guardar en IndexedDB los items del servidor que no teníamos localmente
          var localIds = new Set(localItems.map(function (i) { return i.id; }));
          var newItems = merged.filter(function (i) { return !localIds.has(i.id); });
          var savePromises = newItems.map(function (item) { return self.saveToDB(item).catch(function () {}); });

          return Promise.all(savePromises).then(function () { return merged; });
        });
      });
    },

    /**
     * Guarda un item: IndexedDB + servidor (fire-and-forget).
     * @param {Object} item
     * @returns {Promise<void>}
     */
    saveItem: function (item) {
      var self = this;
      return this.saveToDB(item).then(function () {
        // Fire-and-forget al servidor (no esperamos)
        self.syncToServer(item);
      });
    },

    /**
     * Elimina un item: IndexedDB + servidor (fire-and-forget).
     * @param {string} id
     * @returns {Promise<void>}
     */
    deleteItem: function (id) {
      var self = this;
      return this.deleteFromDB(id).then(function () {
        self.deleteFromServer(id);
      });
    },

    /**
     * Limpia todo: IndexedDB + servidor (fire-and-forget).
     * @returns {Promise<void>}
     */
    clearAll: function () {
      var self = this;
      return this.clearDB().then(function () {
        self.clearServerHistory();
      });
    }
  };

  // Exponer globalmente
  window.HistoryManager = HistoryManager;
})();
