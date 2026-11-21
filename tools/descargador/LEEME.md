# Worker local de descargas · Antigravity

Worker de Node.js que se ejecuta **en el PC de Antonio**, pide trabajos a la web de
descargas, descarga con **yt-dlp** y sube el resultado al servidor **por trozos**.

---

## 1. Qué es y qué hace

1. Cada **30 s** envía un `heartbeat` al servidor (para que la web sepa que el PC está vivo).
2. Cada **5 s** (configurable) pregunta `next` por si hay trabajo nuevo.
3. Cuando recibe un trabajo, lanza **yt-dlp** para descargarlo en
   `<download_dir>\<id_del_trabajo>\`.
4. Mientras descarga, informa del **progreso** (porcentaje, velocidad, ETA, título y, en
   listas, elemento N de M) como máximo cada 2 segundos.
5. Al terminar, sube cada fichero **troceado** (4 MB por defecto) y avisa con `item_done`.
6. Cierra con `finish` si todo fue bien, o con `fail` (con las últimas líneas del log) si
   algo falla. Si la web responde `cancel: true` a un progreso, **mata yt-dlp** y manda
   `fail` con `"Cancelado por el usuario"`.

---

## 2. Ficheros

| Fichero | Para qué sirve |
|---|---|
| `worker.mjs` | El worker. Es lo único que hay que ejecutar. |
| `abrir-carpeta.ps1` | Abre el Explorador en la carpeta de descargas (con el fichero seleccionado) y **trae la ventana al frente**. Lo usa el botón «Carpeta» de la web. |
| `iniciar-worker.bat` | Lanzador con doble clic (relanza el worker si se cae). |
| `LEEME.md` | Este documento. |
| `_prueba\` | Servidor de prueba y config de prueba (ignorado por git). |

---

## 3. Configuración

El worker lee su configuración de:

```
E:\ANTIGRAVITY\.private\descargas-worker.json
```

> Ese fichero **no está versionado** y contiene el token. **No lo copies a ningún sitio
> que suba a git, ni a capturas, ni a chats, ni a documentos compartidos.**

Claves:

| Clave | Significado |
|---|---|
| `server` | URL del `api.php` al que se envían todas las peticiones. |
| `token` | Token del worker (obligatorio). Va en la cabecera `X-Worker-Token`. |
| `ytdlp` | Ruta completa de `yt-dlp.exe`. |
| `ffmpeg_dir` | Carpeta donde está `ffmpeg.exe`. |
| `download_dir` | Carpeta donde se descarga (se crea si no existe). |
| `poll_seconds` | Cada cuántos segundos se pregunta por trabajo (por defecto 5). |
| `max_parallel` | Informativo: el worker procesa **un trabajo a la vez**. |
| `chunk_mb` | Tamaño de cada trozo al subir (por defecto 4 MB). |
| `cookies_file` | (Opcional) `cookies.txt` para cualquier web (YouTube 403, edad…). |
| `instagram_cookies` | (Opcional) `cookies.txt` solo para Instagram. Si no está, se usan las del navegador. |
| `instagram_browser` | (Opcional) navegador del que leer las cookies de Instagram: `chrome` por defecto; `false` para desactivarlo. |

### Instagram y TikTok

Los enlaces de **Instagram** (`/reel/`, `/p/`, `/tv/`) y **TikTok** (`/@usuario/video/…`)
funcionan con el mismo worker: se les pide el mejor fichero único (`-f b`) porque esas webs
ya entregan un MP4 con audio dentro.

- **TikTok** no necesita nada más.
- **Instagram** a veces pide sesión (`login required`) o limita por peticiones. Por defecto el
  worker lee las cookies de **Chrome**: basta con tener la sesión abierta en Instagram en ese
  navegador. Si prefieres un fichero, exporta un `cookies.txt` y pon su ruta en
  `instagram_cookies`.
- Para ver qué orden exacta se lanzaría, sin descargar nada:
  `node worker.mjs --args <url> [--modo audio] [--calidad 1080] [--formato mp4]`.

Se puede usar **otro fichero de configuración** con la variable de entorno:

```bat
set DESCARGAS_WORKER_CONFIG=E:\ruta\a\mi-config.json
```

Si el fichero no existe, no es JSON válido o no tiene `token`, el worker muestra un
mensaje de error en español y **sale con código 2**.

---

## 4. Cómo arrancarlo

**Automático (lo normal):** al entrar en Windows se lanza solo, oculto, con
`iniciar-worker.vbs` (acceso directo de la carpeta **Inicio**). Además hay una tarea
programada, **`DescargasWorkerWatchdog`**, que cada 5 minutos comprueba si el worker
sigue vivo y lo vuelve a arrancar si se ha caído. Así la cola no se queda esperando
durante horas porque el worker se cerró sin avisar.

Para instalar o reparar esa tarea (no hace falta ser administrador):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File E:\ANTIGRAVITY\tools\descargador\instalar-watchdog.ps1
```

Se puede quitar con `... instalar-watchdog.ps1 -Quitar`.

**Con doble clic** (para probar a mano):

```
E:\ANTIGRAVITY\tools\descargador\iniciar-worker.bat
```

El `.bat` se coloca en su carpeta, arranca el worker y, si el proceso termina, espera 10
segundos y lo vuelve a lanzar (mostrando la hora). Si el worker sale con **código 2**
(error de configuración) **no** lo relanza: deja el mensaje en pantalla y espera una tecla.
(Eso es solo el lanzador manual; el `.vbs` del Inicio/watchdog sí reintenta el código 2
cada 5 minutos.)

**Desde una consola:**

```bat
cd /d E:\ANTIGRAVITY\tools\descargador
"C:\Program Files\nodejs\node.exe" worker.mjs
```

> **Si la cola de la web se queda «En cola»:** casi siempre es que el worker no está
> corriendo. La propia web avisa arriba con «PC desconectado…» y la cola cambia a
> «Esperando al PC». Comprueba el proceso (`Get-CimInstance Win32_Process -Filter
> "Name='node.exe'" | Where-Object { $_.CommandLine -match 'worker.mjs' }`), mira
> `supervisor.log` y, si hace falta, ejecuta el VBS o espera al watchdog.

---

## 5. Cómo ver los logs

El log del worker está en:

```
%LOCALAPPDATA%\descargas-worker\worker.log
```

Es decir: `C:\Users\atnojs\AppData\Local\descargas-worker\worker.log`.

El del lanzador (arranques, paradas, reintentos y errores de configuración) está al lado:

```
%LOCALAPPDATA%\descargas-worker\supervisor.log
```

- Se crea la carpeta automáticamente.
- `worker.log` rota a los **5 MB** (`worker.log.1`); `supervisor.log` a **1 MB**
  (`supervisor.log.1`).
- En **consola** se ve un resumen legible en español (arranque, trabajo recibido,
  progreso cada 5 s, subidas, errores).
- Si el worker cae por una excepción no controlada, ahora deja la traza completa en
  `worker.log` como `[ERROR] Excepción no controlada: …` y sale con código 1 para que el
  lanzador lo relance. Antes se moría en silencio y la cola se quedaba parada sin rastro.

Para seguirlo en vivo desde otra consola:

```bat
powershell -NoProfile -Command "Get-Content -Wait -Tail 40 -Encoding UTF8 '$env:LOCALAPPDATA\descargas-worker\worker.log'"
```

> **Ojo con los acentos:** el log es UTF-8 **sin BOM**. La consola de Windows
> PowerShell 5.1 lo lee por defecto como ANSI y muestra `cÃ³digo` en vez de `código`.
> Usa siempre `Get-Content ... -Encoding UTF8` (o ábrelo con el Bloc de notas o VS Code).

---

## 6. Cómo pararlo

- **Ctrl+C** en la ventana del worker: termina limpiamente y **mata yt-dlp** si estaba
  descargando. El `.bat` lo relanzará a los 10 s, así que para pararlo del todo cierra la
  ventana (o pulsa Ctrl+C dos veces seguidas).
- Cerrando la ventana de la consola también se detiene.

---

## 7. Seguridad del token

- El token vive **solo** en `E:\ANTIGRAVITY\.private\descargas-worker.json` (no versionado).
- **Nunca** lo copies a un fichero del repositorio, a un `.md`, a un ejemplo, a una captura
  de pantalla ni a un chat. Cualquier fichero versionado del repo es **accesible por web**.
- Si sospechas que se ha filtrado, revócalo y genera otro en el servidor.

---

## 8. Notas técnicas y limitaciones reales

- **Sin tuberías (pipes).** Para que funcione incluso en entornos restringidos donde crear
  pipes devuelve `EPERM`, el worker **no** lee la salida de yt-dlp por tubería: abre el
  fichero `<download_dir>\<id>\_ytdlp.log` y le pasa su **descriptor de fichero** como
  `stdout`/`stderr` del proceso hijo. yt-dlp escribe ahí el progreso (con `--newline
  --progress`) y el worker lee lo nuevo por posiciones cada 400 ms. Si abrir el fichero
  fallara, se usa automáticamente el modo tubería como respaldo.
- **`yt-dlp.conf`.** El motor lleva su propio `yt-dlp.conf` en `D:\Vídeos\ytdownloader` con
  `--js-runtimes node`, `--remote-components ejs:github`, `--merge-output-format mp4` y
  `-S vcodec:h264,acodec:aac,ext:mp4:m4a`. Los argumentos que añade el worker van **después**
  en la línea de comandos, así que mandan sobre el `.conf`; aun así, si pides `mkv` o `webm`
  y ves que sale MP4, la causa está en ese `.conf` (bórrale esas dos líneas si quieres que el
  formato lo decida siempre la web).
- **Metadatos.** El worker añade `--write-info-json` para conocer el **título y la duración
  reales**; esos `.info.json` se ignoran al subir (igual que `.part`, `.ytdl`, `.log` y
  miniaturas).
- **Duración.** Se toma del `.info.json`. Si no existe, se intenta leer con
  `ffmpeg -i`; si tampoco, se envía `0`.
- **Reintentos.** Toda llamada HTTP se reintenta hasta 5 veces con espera 2, 4, 8, 16 y 32 s.
  Los trozos son independientes y van numerados, así que reenviar un trozo nunca corrompe el
  fichero.
- **Ritmo.** Nunca se hacen más de 1 petición por segundo; el progreso se envía como máximo
  cada 2 s.
- Un trabajo con `playlist: false` añade `--no-playlist`; con `true`, `--yes-playlist` y
  numeración `001 - Título [id].ext`.
- `--force-overwrites` **solo en el primer intento**: los reintentos no deben quedarse
  parados pidiendo confirmación, pero al reanudar un trabajo en pausa ese flag incluye
  `--no-continue` y tiraría el `.part` ya descargado.
- **Matar yt-dlp es matar un ÁRBOL.** `yt-dlp.exe` es un ejecutable empaquetado con
  PyInstaller: el proceso que lanza el worker es un padre que crea un hijo (y éste puede
  crear un `ffmpeg`). Por eso, al cancelar un trabajo o al pulsar Ctrl+C, el worker usa
  `taskkill /PID <pid> /T /F` de forma **síncrona** y comprueba que el PID ha muerto antes
  de dar la cancelación por buena. Matar solo el proceso padre dejaría la descarga
  corriendo en segundo plano (se detectó y se corrigió durante las pruebas).
- **La cancelación depende del progreso.** El worker solo puede enterarse de un
  `cancel: true` cuando envía un `progress` (y el progreso se manda como máximo cada 2 s,
  con líneas reales de yt-dlp). Si yt-dlp se queda sin líneas de progreso (por ejemplo,
  atascado en reintentos de red), el `cancel` tardará en llegar.
- El `.bat` espera 10 s antes de relanzar. Usa `timeout` (con cuenta atrás si hay consola)
  y, si la entrada está redirigida y `timeout` no está disponible, `ping` como espera
  garantizada. Si el worker sale con **código 2** (configuración incorrecta) **no** lo
  relanza: deja el mensaje en pantalla esperando una tecla.

---

## 8-bis. Botones «Ver» y «Carpeta» de la web (worker 1.2)

La cola de la app tiene dos botones por descarga terminada:

- **Ver**: ver o escuchar el fichero. Si la descarga está subida a la nube, la app abre
  `api.php?action=download&item=…&ver=1` en una pestaña y el navegador lo reproduce (vale
  también desde el móvil). Si el fichero **solo** está en el PC, la app pide al worker que lo
  abra con el programa predeterminado de Windows.
- **Carpeta**: abre el Explorador en `download_dir` (`D:\Descargas Y, I y T`), con el fichero
  seleccionado cuando la app conoce su ruta. La ventana se trae **al frente** con
  `abrir-carpeta.ps1` (`SwitchToThisWindow`): abrirla desde el worker, que es un proceso en
  segundo plano, la dejaba detrás del navegador y parecía que el botón no hacía nada.

**Cómo viaja la petición (importante): por la API, no por el puerto local.** La CSP del sitio
(la del `.htaccess` raíz) solo deja `connect-src` a `'self'` y a unos CDN, así que el navegador
bloquea cualquier `fetch` a `http://127.0.0.1`. Por eso:

1. La web hace `POST api.php?action=abrir` con `{modo, job_id, item_id}`.
2. `api.php` apunta la petición en `data/abrir.json`, pero **solo si el PC ha dado señales en
   los últimos 2 minutos** (si no, responde 503 «PC desconectado»).
3. El worker la recoge en su sondeo (`next`, cada 5 s) o en el latido (30 s), la ejecuta y la
   borra: es de un solo uso y caduca a los 2 minutos.
4. Si la descarga ya se subió a la nube, el servidor **no conoce la ruta** del fichero: manda
   su nombre y el worker lo busca en `download_dir` (nombre exacto, el más reciente).

El puerto local se conserva para pruebas manuales (misma lógica, sin pasar por la API):

```text
GET http://127.0.0.1:8125/pc
GET http://127.0.0.1:8125/abrir?modo=ver&ruta=<ruta completa>[&nombre=<fichero>]
GET http://127.0.0.1:8125/abrir?modo=carpeta[&ruta=<ruta completa>]
```

Reglas de seguridad (no quitarlas):

1. **Solo orígenes del proyecto** en el puerto local: `https://atnojs.es`, `https://www.atnojs.es`
   y `http://127.0.0.1`/`http://localhost`. Cualquier otra web recibe `403`.
2. **Solo rutas dentro de `download_dir`**: se resuelve la ruta y se comprueba que cuelga de
   la carpeta de descargas; si no, no se abre. Así el navegador no puede abrir cualquier
   fichero del disco.
3. La ruta viaja por **variable de entorno** a PowerShell (`Start-Process -FilePath`), no
   concatenada en la orden: no hay forma de inyectar comandos.

Comprobación rápida desde una consola (`curl` de Windows 10/11):

```bat
curl -s http://127.0.0.1:8125/pc
curl -i -H "Origin: https://atnojs.es" "http://127.0.0.1:8125/abrir?modo=carpeta"
```

La primera debe devolver `{"pc":true,...,"acciones":["ver","carpeta"]}`. Si el worker es
anterior a la 1.2, no trae `acciones`.

---

## 9. Prueba de extremo a extremo

En `_prueba\` hay un servidor falso (`mock-server.mjs`) que implementa el protocolo. La
prueba completa está documentada, con la salida literal de cada paso, en
`_prueba\resultado.txt`:

> ⚠️ **`tools\descargador\_prueba\` NO está en `.gitignore`** (se comprobó con
> `git check-ignore`). No hagas `git add` de esa carpeta: dentro vive la config de prueba
> y todo lo que hay ahí acabaría versionado y desplegado en la raíz pública de Hostinger.
> La config de prueba usa un **token de mentira** precisamente para que no haya ningún
> secreto en esa ruta; el token real vive solo en `.private\descargas-worker.json`.

- job → descarga real de YouTube (360p MP4) → 3 trozos subidos **en orden** →
  `item_done` → `finish`;
- el fichero que reconstruye el servidor es **byte a byte idéntico** al descargado
  (mismo SHA-256) y `ffmpeg -i` lo valida como MP4 (h264 + aac, 19,06 s);
- cancelación a mitad de transferencia: `cancel: true` → `fail "Cancelado por el usuario"`
  y **cero** procesos de yt-dlp supervivientes;
- yt-dlp con código de salida ≠ 0 → `fail` con las últimas líneas del log.

Para repetirla:

```bat
cd /d E:\ANTIGRAVITY\tools\descargador\_prueba
start "" node mock-server.mjs
set "DESCARGAS_WORKER_CONFIG=E:\ANTIGRAVITY\tools\descargador\_prueba\config.prueba.json"
cd /d E:\ANTIGRAVITY\tools\descargador
node worker.mjs
:: en otra consola:  curl http://127.0.0.1:8099/__estado   y   /__ensamblar
```

---

## Novedades de la versión 1.3 (21/11/2026)

### Previsualizar el enlace antes de bajarlo
La web pide al PC una **sonda** del enlace (`action: probe`). El worker lanza
`yt-dlp -J` y contesta con `sonda_result`: título, canal, duración, miniatura,
calidades disponibles y si es una lista. Si el enlace es de una lista pura
(`/playlist?list=…`) reintenta con `--flat-playlist` y devuelve el primer
elemento. La web enseña la tarjeta y apaga las calidades que el vídeo no tiene.

### Pausar y reanudar
- «Pausar» en una descarga **en curso**: la web marca `pause_requested` y el
  worker, al ver `pause: true` en la respuesta de `progress`, mata yt-dlp **sin
  borrar** la carpeta de trabajo y avisa con `action: paused`.
- «Reanudar»: el trabajo vuelve a `queued` y yt-dlp **continúa el `.part`** donde
  se quedó (misma carpeta `.descargas-tmp\<id>`).
- «Pausar todo» / «Reanudar todo» usan `pause_all` / `resume_all` (bandera
  `paused` de la cola).

### Cola con orden y filtros
- Cada trabajo nuevo lleva `orden` (FIFO): el worker coge el de menor `orden`.
- `move` intercambia el orden con el vecino (botones ↑ ↓).
- `clear_finished` quita de la lista las terminadas y borra sus copias del
  servidor (los ficheros del PC no se tocan).

### Errores explicados y registro
En `fail` el worker manda además `pista` (frase en castellano), `clase`
(`login`, `actualizar`, `limite`, `bloqueo`, `espacio`, `nodisponible`, `red`,
`otro`), `log_tail` (últimas 30 líneas) y `comando` (la orden exacta de yt-dlp).
La web los enseña con «Ver registro» / «Copiar registro» y un botón según la
clase. `update_tool` + `tool_result` permiten pedirle al PC **actualizar yt-dlp**
(`yt-dlp -U`).

### Límite de velocidad
`limit_rate` (MB/s: 1, 2, 3, 5 o 10) se guarda en el trabajo y el worker añade
`--limit-rate <n>M`.

### Pruebas locales sin servidor real
En `E:\ANTIGRAVITY\.tmp-build\descargas-test` hay una copia con un `auth.php`
que entra sin contraseña (solo pruebas) y un `fake-worker.mjs` que contesta
sondas, herramientas y late. No se versiona: vive fuera del repo.