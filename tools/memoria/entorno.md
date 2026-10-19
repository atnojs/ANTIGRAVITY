# Entorno de trabajo

Ficha de la máquina y del entorno del agente. Si algo de aquí cambia, se actualiza.

## Equipo y proyecto

| Dato | Valor |
|---|---|
| Usuario | `atnojs` (Antonio) · español, directo, exige precisión (ver `soul.md`) |
| Repo | `E:\ANTIGRAVITY` · rama **`main`** · `origin https://github.com/atnojs/ANTIGRAVITY.git` |
| Despliegue | Hostinger, **raíz pública**, automático por webhook al hacer push |
| Consecuencia | Todo fichero versionado es accesible por web → lo privado va en `tools/` (`.htaccess` con `Require all denied`) |

## Shell y ejecución

| Dato | Valor |
|---|---|
| Shell | **Windows PowerShell 5.1** — `pwsh` NO existe en este equipo |
| Ejecutar `.ps1` | Bloqueado por política → `powershell.exe -NoProfile -ExecutionPolicy Bypass -File script.ps1` |
| Jobs en segundo plano | El runner del agente espera a que el rango de procesos se vacíe: un proceso largo deja el comando "colgado" |

## Herramientas

| Herramienta | Ruta / versión |
|---|---|
| Node | `C:\Program Files\nodejs\node.exe` · npm global en `E:\npm` (verificado 2026-10-17) |
| Python | `C:\Users\atnojs\AppData\Local\Programs\Python\Python312\python.exe` (+ `pythonw.exe`) |
| ⚠️ PATH | **Empieza por el venv de Hermes** (`...\hermes-agent\venv\Scripts`). Nunca usar ese python para scripts propios |
| Git | configurado; commits con `-c user.name='atnojs' -c user.email='atnojs@gmail.com'` si hiciera falta |
| Ollama | instalado y en el arranque de Windows |
| Docker Desktop | instalado y en el arranque de Windows |

## Rutas que importan

| Qué | Dónde |
|---|---|
| Repo / apps / skills | `E:\ANTIGRAVITY` (`apps/`, `skills/`, `tools/`) |
| Memoria operativa | `E:\ANTIGRAVITY\tools\memoria\` |
| Datos de Hermes | `E:\hermes-data` (`.env` con claves, `logs/`, `scripts/`, `skills/`, `cron/`) |
| Datos de DSH (este agente) | `C:\Users\atnojs\.dsh` (sesiones, perfiles, credenciales) |
| OmniRoute | gateway en `http://localhost:20128` · API `/v1` · guía en `tools/omniroute/GUIA-OMNIROUTE.md` |
| Secreto del panel de OmniRoute | `C:\Users\atnojs\.omniroute\panel.secret` (valor **no** se escribe aquí) |
| Descargador de vídeo/audio de Antonio | `D:\Vídeos\ytdownloader\` → `ytdownloader.bat` (ventana «YouTube Downloader»), con `yt-dlp.exe`, `ffmpeg.exe` y `yt-dlp.conf` (salida **`.mp4` h264/AAC**). Acceso directo: `D:\Escritorio\Descargar vídeos y MP3.lnk`. Detalle del arreglo en `errores.md` |
| App de descargas (desde cualquier sitio) | `https://atnojs.es/apps/descargas/` · código en `apps/descargas/` · cola y ficheros en `apps/descargas/data/` (no versionado). Contraseña: la misma de edición (TrickVault/video-vault/json), en `.private/password-edicion.txt` |
| Puerto local del worker | `127.0.0.1:8125` (config `puerto_local`): la web le pregunta si se abre en el mismo PC. Chrome 155 exige permiso para que una página pública hable con 127.0.0.1 |
| ⚠️ IP pública de esta línea | **Cambia entre peticiones** (CGNAT: `45.14.x.x` y `194.116.x.x` en momentos distintos). Cualquier detección que compare IPs es poco fiable aquí |
| Assets de la app de descargas | Referenciados con nombre versionado por fecha (`app.20261017h.css/.js (van por la h)`): la CDN de Hostinger cachea **por ruta** e ignora la query. Al tocar CSS/JS hay que **renombrar**, no subir el `?v=` || Worker de la app de descargas | `tools/descargador/worker.mjs` + `iniciar-worker.bat`. Config **con el token**: `.private/descargas-worker.json` (ojo: **lleva BOM**, hay que quitarlo antes de `JSON.parse`). Log: `%LOCALAPPDATA%\descargas-worker\worker.log` (UTF-8). Arranca solo con Windows por un acceso en la carpeta de Inicio; `schtasks` está **denegado** en este equipo |
| ⚠️ Escritorio y Descargas | **Redirigidos**: Escritorio = `D:\Escritorio`, Descargas = `D:\Descargas`. `C:\Users\atnojs\Desktop` existe con restos viejos y **no es el Escritorio**. Sacarlos con `[Environment]::GetFolderPath('Desktop')`, nunca a mano |

## Puertos en uso

| Puerto | Qué | Interfaz |
|---|---|---|
| 20128 | OmniRoute (panel + API) | `0.0.0.0` (toda la red local) |
| 19387 | GUI web de DSH | `127.0.0.1` (solo este PC) |

## Limitaciones conocidas del entorno del agente

- **CIM/WMI puede denegarse** (`Get-CimInstance Win32_Process`, `Win32_OperatingSystem`).
  Y peor: `Get-NetTCPConnection` devuelve **vacío sin error** → parece "no hay nada".
  Usar `netstat -ano` o `TcpClient` (ver `recetas.md`).
- **`tasklist`** puede devolver `Acceso denegado`; con `Get-CimInstance` suele funcionar.
- Los **globs recursivos** sobre este repo agotan el timeout de 30 s. Usar rutas concretas
  o `Get-ChildItem -Depth`.
- Las **capturas de pantalla** llegan como adjuntos del usuario; el agente no ve el escritorio.
- **Pillow 13 instalado en el Python 3.12 del proyecto** (2026-10-17): lo exige el pipeline de
  TrickVault (`_carpeta_lote.py`, que convierte y monta hojas de contacto) y los scripts de
  revisión. Ejecutar esos scripts con el Python del proyecto, **no** con el venv de Hermes.
- **Navegador headless en DSH**: con el sandbox `workspace-write`, Chrome **no arranca**
  (`spawn EPERM` con Playwright; `Start-Process: Acceso denegado` con Chrome directo). Hay que
  reintentar con permiso ampliado. Playwright **1.63** está en el venv de Hermes
  (`...\hermes-agent\venv\Scripts\playwright.exe`) y usa el Chrome 155 instalado con
  `--channel chrome`; `--device` exige `-b chromium`. Además, `@playwright/cli` **0.1.22** está
  instalado global (`E:\npm\playwright-cli.ps1`, en PATH): es el que usa la skill
  `verificacion-playwright`.

**Arranque del worker de descargas (cambiado el 2026-10-19).** El acceso directo del Inicio apuntaba
a `tools\descargador\iniciar-worker.bat` y Windows mostraba en cada arranque el aviso «No se pudo
comprobar el editor ¿está seguro…?» (es el aviso de Seguridad de Windows para .bat sin firma, no un
virus). Ahora en `shell:startup` hay **`Worker de Descargas.vbs`**, que lanza el .bat **oculto** con
`WScript.Shell.Run(..., 0, False)` y comprueba antes si ya hay un `node … worker.mjs` para no
duplicar. El .lnk antiguo se borró. El .bat sigue igual (bucle de relanzado cada 10 s).
**Corrección (2026-10-19, misma tarde):** el VBS del Inicio ya **no lanza el .bat** (Windows también
preguntaba por él): ahora ejecuta `node.exe worker.mjs` directamente, oculto, con bucle propio de
relanzado cada 10 s, guarda de instancia única y corte si el código es 2.
**Aclarado (2026-10-19, tarde): el aviso de Windows lo provoca SIEMPRE el .bat.** El fichero no tiene
marca de Internet (solo flujo `:$DATA`); es el filtro de adjuntos de Windows para `.bat` lanzados desde
Explorer/Inicio. Solución definitiva: el acceso directo del Inicio apunta a
`wscript.exe "tools\descargador\iniciar-worker.vbs"`, y el VBS **arranca Node directamente** (oculto,
bucle cada 10 s, sin duplicar, corta con código 2). El `.bat` queda solo para uso manual (si se abre a
mano, Windows preguntará: es normal).