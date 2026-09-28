# Protocolo de migración por app (repetible, una app = un commit)

Documento operativo para migrar cualquier app del §6.1 de
`apps/ESTADO_MIGRACION_APPS.md` **sin inventar nada** y sin reescribir la app.
Referencia viva: `apps/dibujo_lineas_copia` (ya migrada) y
`apps/angulos_de_camara` + `apps/escenario_modelo` (migradas en la sesión nocturna).

## Reglas de oro

1. **Edición quirúrgica**: leer el archivo antes de tocarlo; cambiar solo el bloque
   necesario; conservar ids, clases, rutas, nombres de funciones y funcionalidad.
   Nunca reescribir la app desde cero ni "limpiar" archivos ajenos al encargo.
2. **Sin FLUX, sin DALL·E, sin `config.php`**. Las claves viven SOLO en el `.htaccess`
   raíz del servidor (`SetEnv R` / `SetEnv OPENAI_API_KEY`) y se resuelven desde el
   entorno (`getenv`, `REDIRECT_`, `$_SERVER`, `$_ENV`).
3. **Una app = un commit**, siempre en `main`, sin ramas ni worktrees. `git add` solo de
   los archivos de esa app.
4. **No pasar a la siguiente app sin verificarla en producción** (URLs reales, con
   `?cb=<random>` para esquivar cachés).
5. Si la app no encaja en este protocolo (proxy propio con otro contrato, build de
   `dist/`, historia en otro formato…), **parar y reportar** en vez de improvisar.

## Paso 1 — Historial (obligatorio y mecánico)

```powershell
Copy-Item apps/dibujo_lineas_copia/history.php apps/<app>/history.php -Force
```

- `history.php` canónico: datos en `history_store/` (nunca versionado), migración de un
  solo paso desde `history_data/`, `.htaccess` propio del almacén, bloqueos y límites.
- En `apps/<app>/history-manager.js`, si NO es idéntico al canónico, hay que dejarle
  **dos cosas** del canónico (edición quirúrgica, sin reescribir el archivo):
  1. El **sello anti-caché** en `load()`:
     ```js
     const url = `${this.apiUrl}${separator}action=list&app=${encodeURIComponent(this.appName)}&_=${Date.now()}`;
     ```
  2. El **shim de la API legacy** (`HistoryManager.configure/init/loadAll/saveItem/
     deleteItem/clearAll`) que va al final del archivo, copiado del canónico.
- Comprobar que `**/history_data/` y `**/history_store/` están ignorados por Git
  (`.gitignore` raíz) y que no hay historial versionado (`git ls-files 'apps/<app>/history_*'`).
- Si la app tenía `config.php`, borrar sus referencias en el código (el archivo del
  servidor no está versionado: se anota en el informe final que hay que retirarlo).

## Paso 2 — Proxy

- Si el proxy incluye `require_once __DIR__ . '/../dibujo_lineas_copia/canonical-image-model.php'`
  (o `../../`), el catálogo de modelos ya es el correcto (incluye `gemini-2`,
  `openai-image-2` y `openai-image-2-high`): **no dupliques catálogos**.
- Si tiene catálogo propio, debe ser lista blanca cerrada con los identificadores
  vigentes y sin FLUX ni DALL·E.
- `action=health` debe existir y responder:
  ```json
  {"success":true,"configured":{"openai":true,"openrouter":true},"models":["openai-image-2", "..."]}
  ```
  (nunca devuelve claves). Añade `action=models` si la app no lo tenía.

## Paso 3 — Frontend (selector de modelo)

Estado inicial y orden obligatorios (de izquierda a derecha, menor → mayor capacidad
dentro de cada modelo real):

1. `OPENAI 2.5`: `MEDIUM` (`openai-medium`), `HIGH` (`openai-high`), `MAX FLARE`
   (`openai-max-flare`), `XHIGH` (`openai-xhigh`), `MAX SUNBURST` (`openai-max-sunburst`).
2. `GEMINI`: **`GEMINI 2` (`gemini-2`) primero**, luego `3.1 FLASH` (`gemini-flash`) y
   `3 PRO` (`gemini-pro`).
3. `QWEN`: `QWEN 3 PRO` (`qwen-pro`).
4. `IMAGE 2`: `MEDIUM` (`openai-image-2`, **activo por defecto**) y `HIGH`
   (`openai-image-2-high`).

Además:

- `DEFAULT_MODEL` / `selectedModel` = `'openai-image-2'`.
- Añadir las etiquetas nuevas al mapa de etiquetas legibles (`MODEL_LABELS` /
  `modelLabel`) si existe.
- Subir la versión (`?v=N`) de `app.js` / `app.css` / `history-manager.js` / demás
  bundles servidos en el `index.html` (cache busting).
- Si el selector se construye en JS (no en el `index.html`), editar ese archivo y
  también el bundle compilado que sirva el `index.html`, si existe.

## Paso 4 — QA local antes de publicar

```powershell
php -l apps/<app>/proxy.php; php -l apps/<app>/history.php
node --check apps/<app>/app.js
Select-String -Path apps/<app>/*.php -Pattern 'config\.php|dall-e|dalle|flux|bfl\.ai'
```

## Paso 5 — Commit + push

```powershell
git add apps/<app>
git commit -m "migracion(<app>): gemini-2 en el selector, historial en history_store y default IMAGE 2"
git push origin main
```

## Paso 6 — Verificación en producción (obligatoria, no vale la inspección local)

Con `?cb=<aleatorio>` para no leer caché:

1. `POST https://atnojs.es/apps/<app>/proxy.php {"action":"health"}` → incluye `gemini-2`.
2. `GET https://atnojs.es/apps/<app>/history.php?action=list&app=<app>` → responde y las
   `imageUrl` apuntan a `./history_store/`, no a `history_data`.
3. El HTML/JS servido devuelve los `data-model` en el orden correcto (comprobar el
   archivo realmente servido, no el local).

El despliegue de Hostinger va con retraso y **no es inmediato**: medido en la sesión
nocturna del 2026-09-28, más de 10 minutos entre el push y la publicación, y no todas
las rutas (`proxy.php`) se refrescan a la vez. Comprobar en bucle (hasta ~30 minutos,
con `?cb=<aleatorio>`) antes de dar la app por buena. Si sigue sirviendo la versión
antigua, dejarlo anotado en `apps/ESTADO_VERIFICACION_PRODUCCION.md` y **no** marcar la
app como ✅.

Pista para saber si el deploy ya llegó sin mirar el proxy: los ficheros de datos
(`history.php`) se actualizan antes que los `.php` de la app en algunos casos; el
marcador fiable es el `?v=` del `index.html` servido y el `action=health` del proxy.

## Paso 7 — Documentar

Marcar la fila de la app en el §6.1 de `apps/ESTADO_MIGRACION_APPS.md` como ✅ (o dejar
la nota de lo que falte) y añadir el commit al informe.
