/*!
 * Antigravity · Flow Client v1.0.0 (2026-10-28)
 * ---------------------------------------------------------------------------
 * Puente entre esta app y la cola de Google Flow que sirve el worker del PC:
 *   apps/flow_studio/flow_queue.php  (request · status · ping)
 *
 * El modelo `flow` NO pasa por proxy.php: se encola en el PC y se consulta el
 * estado hasta que el worker sube el resultado. Por eso esta app necesita una
 * conexión permanente con la cola:
 *
 *   · Latido (ping) cada 15 s con la pestaña visible y cada 45 s en segundo plano.
 *   · Si falla, reintento con espera creciente (4 s → 20 s) SIN rendirse nunca.
 *   · Reconexión inmediata al volver a la pestaña, al recuperar red (`online`),
 *     al recuperar el foco y al restaurar la página desde la caché (bfcache).
 *   · Las peticiones y la espera del trabajo sobreviven a cortes puntuales.
 *
 * API pública (`window.FlowClient`):
 *   FlowClient.isFlowModel(id)          → true si el id es un modelo de Flow
 *   FlowClient.getStatus()              → {status:'checking'|'online'|'offline', worker, pending, ...}
 *   FlowClient.subscribe(fn)            → suscripción; devuelve la función para cancelarla
 *   FlowClient.start()                  → arranca el latido (idempotente)
 *   FlowClient.ping()                   → comprueba la conexión ahora
 *   FlowClient.request({prompt, ratio, model, refs, count}) → {ids:[...]}
 *   FlowClient.status(ids)              → {jobs:{id:{status,url,...}}, worker, pending}
 *   FlowClient.waitJob(id, {onProgress, timeoutMs}) → {url, ratio, model}
 *   FlowClient.imageToDataUrl(url)      → data URL del resultado
 */
(function () {
    'use strict';

    if (window.FlowClient) { return; }

    var VERSION = '1.0.0';

    /* ── Rutas: la cola vive en la app hermana apps/flow_studio/ ── */
    var dir = String(location.pathname || '/').replace(/[^\/]*$/, '');
    var appsMatch = dir.match(/^(.*\/apps\/)([^\/]+)\/$/);
    var APPS_DIR = appsMatch ? appsMatch[1] : '/apps/';
    var QUEUE_DIR = APPS_DIR + 'flow_studio/';
    var QUEUE_URL = QUEUE_DIR + 'flow_queue.php';

    /* ── Tiempos ── */
    var PING_TIMEOUT = 6000;
    var REQUEST_TIMEOUT = 20000;
    var POLL_MS = 2500;
    var MAX_WAIT_MS = 15 * 60 * 1000;
    var TICK_ONLINE = 15000;
    var TICK_HIDDEN = 45000;
    var TICK_RETRY_BASE = 4000;
    var TICK_RETRY_MAX = 20000;

    /* Modelos de Flow: id del selector → nombre literal que valida la cola. */
    var MODELS = {
        'flow-nano-banana-2': 'Nano Banana 2',
        'flow-nano-banana-pro': 'Nano Banana Pro',
        'flow-nano-banana-2-lite': 'Nano Banana 2 Lite'
    };

    var state = {
        status: 'checking',
        worker: null,
        pending: 0,
        lastCheck: 0,
        lastOk: 0,
        error: ''
    };
    var listeners = [];
    var timer = null;
    var started = false;
    var failures = 0;
    var pingInFlight = null;

    function isFlowModel(model) {
        return Object.prototype.hasOwnProperty.call(MODELS, String(model || ''));
    }

    function snapshot() {
        return {
            version: VERSION,
            status: state.status,
            worker: state.worker,
            pending: state.pending,
            lastCheck: state.lastCheck,
            lastOk: state.lastOk,
            error: state.error
        };
    }

    function notify() {
        var data = snapshot();
        for (var i = 0; i < listeners.length; i++) {
            try { listeners[i](data); } catch (e) { /* un suscriptor roto no rompe el latido */ }
        }
    }

    function setState(patch) {
        var changed = false;
        for (var key in patch) {
            if (!Object.prototype.hasOwnProperty.call(patch, key)) { continue; }
            if (state[key] !== patch[key]) { changed = true; }
            state[key] = patch[key];
        }
        if (changed) { notify(); }
    }

    function delay(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    function fetchWithTimeout(url, options, timeoutMs) {
        var controller = null;
        var opts = options || {};
        if (typeof AbortController === 'function') {
            controller = new AbortController();
            opts.signal = controller.signal;
            setTimeout(function () {
                try { controller.abort(); } catch (e) { /* ya terminó */ }
            }, timeoutMs || PING_TIMEOUT);
        }
        return fetch(url, opts);
    }

    function readJson(response) {
        return response.text().then(function (raw) {
            var data = null;
            try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
            if (!response.ok) {
                var message = data && data.error ? data.error : ('HTTP ' + response.status);
                throw new Error(message);
            }
            if (!data) { throw new Error('La cola de Flow devolvió una respuesta no válida.'); }
            return data;
        });
    }

    /* ── Latido: se reprograma solo, nunca se detiene ── */
    function nextDelay() {
        if (document.hidden) { return TICK_HIDDEN; }
        if (state.status === 'online') { return TICK_ONLINE; }
        if (state.status === 'checking') { return TICK_RETRY_BASE; }
        var backoff = TICK_RETRY_BASE * Math.pow(1.6, Math.max(0, failures - 1));
        return Math.min(TICK_RETRY_MAX, Math.round(backoff));
    }

    function schedule() {
        if (!started) { return; }
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(function () {
            timer = null;
            ping();
        }, nextDelay());
    }

    function ping() {
        if (pingInFlight) { return pingInFlight; }
        var url = QUEUE_URL + '?action=ping&_=' + Date.now();
        pingInFlight = fetchWithTimeout(url, { cache: 'no-store' }, PING_TIMEOUT)
            .then(readJson)
            .then(function (data) {
                if (!data || data.ok !== true) { throw new Error('La cola de Flow no respondió.'); }
                failures = 0;
                setState({
                    status: data.worker === true ? 'online' : 'offline',
                    worker: data.worker === true,
                    pending: Number(data.pending) || 0,
                    lastCheck: Date.now(),
                    lastOk: Date.now(),
                    error: ''
                });
            })
            .catch(function (err) {
                failures += 1;
                setState({
                    status: 'offline',
                    worker: false,
                    pending: 0,
                    lastCheck: Date.now(),
                    error: (err && err.message) || 'Sin conexión con el PC de Flow.'
                });
            })
            .then(function () {
                pingInFlight = null;
                schedule();
            });
        return pingInFlight;
    }

    function start() {
        if (started) { return; }
        started = true;
        ping();

        /* Reconexión inmediata en los cuatro disparadores que importan. */
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) { ping(); }
        });
        window.addEventListener('online', function () { ping(); });
        window.addEventListener('focus', function () { ping(); });
        window.addEventListener('pageshow', function (event) {
            if (event && event.persisted) { ping(); }
        });
    }

    function post(payload, attempt) {
        var tries = attempt || 0;
        return fetchWithTimeout(QUEUE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, REQUEST_TIMEOUT)
            .then(readJson)
            .catch(function (err) {
                /* Solo se reintenta lo que puede ser un corte de red; un error
                   de validación de la cola (4xx con mensaje) se devuelve tal cual. */
                var retriable = !err || !err.message || /Failed to fetch|NetworkError|abort|HTTP 5\d\d/i.test(err.message);
                if (retriable && tries < 2) {
                    return delay(700 * (tries + 1)).then(function () { return post(payload, tries + 1); });
                }
                throw err;
            });
    }

    function request(payload) {
        var body = {
            action: 'request',
            prompt: String((payload && payload.prompt) || '').slice(0, 1200),
            ratio: String((payload && payload.ratio) || '1:1'),
            model: String((payload && payload.model) || MODELS['flow-nano-banana-2']),
            count: Math.max(1, Math.min(4, Number(payload && payload.count) || 1)),
            refs: Array.isArray(payload && payload.refs) ? payload.refs.slice(0, 2) : []
        };
        return post(body).then(function (data) {
            if (data && data.ok === true) {
                setState({ status: state.worker ? 'online' : state.status, lastCheck: Date.now() });
            }
            return data;
        });
    }

    function status(ids) {
        return post({ action: 'status', ids: (ids || []).slice(0, 12) }).then(function (data) {
            if (data && typeof data.worker === 'boolean') {
                setState({
                    worker: data.worker,
                    status: data.worker ? 'online' : 'offline',
                    pending: Number(data.pending) || 0,
                    lastCheck: Date.now()
                });
                schedule();
            }
            return data;
        });
    }

    function waitJob(id, options) {
        var opts = options || {};
        var deadline = Date.now() + (Number(opts.timeoutMs) || MAX_WAIT_MS);
        var pollMs = Number(opts.pollMs) || POLL_MS;

        function step() {
            if (Date.now() > deadline) {
                return Promise.reject(new Error('Flow tardó demasiado. El trabajo puede seguir en cola: vuelve a intentarlo en unos minutos.'));
            }
            /* Un fallo de red en la consulta no cancela la espera: se reintenta. */
            return delay(pollMs)
                .then(function () { return status([id]).catch(function () { return null; }); })
                .then(function (data) {
                    if (!data || !data.jobs) { return step(); }
                    var job = data.jobs[id];
                    if (!job || job.status === 'missing') {
                        throw new Error('Flow perdió el trabajo en la cola. Vuelve a intentarlo.');
                    }
                    if (job.status === 'done') { return job; }
                    if (job.status === 'error') {
                        throw new Error(job.error || 'Flow no pudo generar la imagen.');
                    }
                    if (typeof opts.onProgress === 'function') {
                        opts.onProgress(job.status === 'running' ? 'running' : 'queued', data);
                    }
                    return step();
                });
        }

        return step();
    }

    function imageToDataUrl(url) {
        return fetch(url, { cache: 'no-store' })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Flow terminó la imagen, pero no se pudo descargar el resultado.');
                }
                return response.blob();
            })
            .then(function (blob) {
                return new Promise(function (resolve, reject) {
                    var reader = new FileReader();
                    reader.onload = function () { resolve(String(reader.result || '')); };
                    reader.onerror = function () { reject(new Error('No se pudo leer el resultado de Flow.')); };
                    reader.readAsDataURL(blob);
                });
            });
    }

    window.FlowClient = {
        VERSION: VERSION,
        MODELS: MODELS,
        QUEUE_DIR: QUEUE_DIR,
        QUEUE_URL: QUEUE_URL,
        isFlowModel: isFlowModel,
        getStatus: snapshot,
        subscribe: function (fn) {
            if (typeof fn !== 'function') { return function () {}; }
            listeners.push(fn);
            try { fn(snapshot()); } catch (e) { /* suscriptor roto */ }
            return function () {
                var index = listeners.indexOf(fn);
                if (index !== -1) { listeners.splice(index, 1); }
            };
        },
        start: start,
        ping: ping,
        request: request,
        status: status,
        waitJob: waitJob,
        imageToDataUrl: imageToDataUrl
    };
})();
