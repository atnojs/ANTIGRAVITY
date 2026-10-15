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
| Node | `C:\Program Files\nodejs\node.exe` · npm global en `%APPDATA%\npm` |
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
