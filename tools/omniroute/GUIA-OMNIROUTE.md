# OmniRoute en Windows: gateway local, arranque oculto y réplica en otro PC

Documentación completa del montaje de **OmniRoute** como gateway de IA local en este
equipo, del fallo de la ventana de terminal que aparecía sola, del arreglo, y de los
pasos exactos para replicarlo en otro PC.

Última revisión: 2026-10-15 · Autor del montaje: agente DSH (Antonio / E:\ANTIGRAVITY)

---

## 1. Qué es OmniRoute y por qué ahorra dinero

- Repo: <https://github.com/diegosouzapw/OmniRoute> · Licencia MIT
- npm: `npm install -g omniroute` · Web: <https://omniroute.online>
- Versión instalada aquí: **v3.8.49** (v3.8.50 ya publicada: 357 proveedores, 1312 modelos)

Es un **gateway de IA local**: un solo endpoint OpenAI-compatible
(`http://localhost:20128/v1`) al que apuntas tus herramientas (Claude Code, Codex,
Cursor, Cline, DSH…) y él decide a qué proveedor va cada petición.

De dónde sale el ahorro real:

| Mecanismo | Qué aporta |
|---|---|
| Compresión RTK + Caveman (12 motores) | 15–95 % de tokens menos según la carga. El «~89 %» del README es el mejor caso; en prompts cortos el ahorro medido aquí fue 4–8 % |
| Failover en 4 capas | Suscripción → API key → barato → gratis. Si una cuota se agota, salta a la siguiente sin cortar la sesión |
| Free tiers | 150+ proveedores con capa gratuita, ~1.62 B tokens/mes de presupuesto documentado |
| Enrutado por coste | 19 estrategias de combo + score de 16 factores (`auto`) |
| Cabecera de control | `x-omniroute-compression` por petición; la respuesta devuelve `X-OmniRoute-Compression` |

**Lo que NO ahorra nada:** tener la pestaña del panel abierta. El ahorro empieza
cuando una herramienta apunta su `base_url` al gateway en vez de a la API del
proveedor. Si nada apunta ahí, el gasto es idéntico.

Documentación oficial útil:
- Compresión: `docs/compression/COMPRESSION_GUIDE.md`
- Capas gratuitas: `docs/reference/FREE_TIERS.md`
- Variables de entorno: `docs/reference/ENVIRONMENT.md`
- CLI compatibles: `docs/reference/CLI-TOOLS.md`

---

## 2. Cómo está montado en este PC

```
Arranque de sesión de Windows
   └─ Inicio\omniroute_gateway.vbs        (oculto, WshShell.Run ..., 0)
        └─ E:\hermes-data\omniroute_autostart.cmd   (cmd oculto)
             └─ pythonw.exe E:\hermes-data\omniroute_autostart.py daemon
                  ├─ comprueba el puerto 20128 (TCP)
                  ├─ si está caído: node.exe ...\omniroute\bin\omniroute.mjs serve
                  │     (CREATE_NO_WINDOW | DETACHED_PROCESS, stdio a DEVNULL)
                  └─ cada hora: login en el panel + re-registro de DeepSeek
```

Ficheros y rutas:

| Qué | Ruta |
|---|---|
| Gateway (npm global) | `%APPDATA%\npm\node_modules\omniroute` |
| Entrypoint del servidor | `%APPDATA%\npm\node_modules\omniroute\bin\omniroute.mjs` |
| Node | `C:\Program Files\nodejs\node.exe` |
| Daemon | `E:\hermes-data\omniroute_autostart.py` |
| Lanzador | `E:\hermes-data\omniroute_autostart.cmd` |
| Autostart | `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\omniroute_gateway.vbs` |
| Log | `E:\hermes-data\logs\omniroute-autostart.log` (rota a `.1` a los 5 MB) |
| Candado de instancia | `E:\hermes-data\logs\omniroute-autostart.lock` (contiene el PID) |
| Password del panel | `%USERPROFILE%\.omniroute\panel.secret` (**fuera del repo**) |
| Clave de cifrado de OmniRoute | `%USERPROFILE%\.omniroute\.env` |
| Datos de OmniRoute | `%APPDATA%\omniroute` (o el storage por defecto del paquete) |
| Scripts reproducibles | `E:\ANTIGRAVITY\tools\omniroute\` (este repositorio) |

Panel: <http://localhost:20128> · API: <http://localhost:20128/v1>
Copia de seguridad automática de la configuración: el propio OmniRoute guarda
snapshots en `E:\hermes-data\backups\` (`omniroute-storage-pre-*.sqlite`).

---

## 3. El fallo: se abría una terminal sola

**Síntoma.** Al iniciar sesión (y en algunos reintentos) aparecía una ventana de
Windows Terminal titulada *New Session* con el banner ASCII de OmniRoute
(`v3.8.49`, `Dashboard: http://localhost:20128`, `Press Ctrl+C to stop`).

**Causa.** La v1 del daemon lanzaba el gateway así:

```python
OMNI = r"%APPDATA%\npm\omniroute.cmd"
subprocess.Popen([OMNI, "serve"],
                 creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
```

Dos problemas de Windows en una sola línea:

1. `omniroute.cmd` es un **script por lotes**, no un ejecutable. `CreateProcess`
   tiene que arrancar `cmd.exe` para interpretarlo, y con `DETACHED_PROCESS`
   ese `cmd.exe` **crea una consola nueva** → ventana visible. La bandera que
   evita la consola es `CREATE_NO_WINDOW`, no `DETACHED_PROCESS`.
2. La consola recién creada es la que pinta el banner del servidor, de ahí que
   la ventana mostrara el arranque del gateway y no otra cosa.

A esto se sumaba que el daemon no tenía candado: cada inicio de sesión apilaba
otra instancia (en el log se ven varias líneas `Modo daemon` seguidas) y cada
una podía lanzar su propio `cmd.exe`, multiplicando las ventanas.

**Arreglo (v2).** Se eliminan todas las vías por las que puede nacer una consola:

1. El daemon se ejecuta con **`pythonw.exe`** (intérprete sin consola) en vez de `python.exe`.
2. El gateway se lanza con **`node.exe` directo** sobre `bin/omniroute.mjs` — sin
   `cmd.exe` de por medio.
3. Banderas **`CREATE_NO_WINDOW | DETACHED_PROCESS`** y `stdin/stdout/stderr` a `DEVNULL`.
4. **Candado de instancia única** (`omniroute-autostart.lock` con PID + comprobación
   de que el proceso sigue vivo): un solo daemon aunque se inicie sesión diez veces.
5. El `.vbs` de Inicio sigue llamando al `.cmd` con `WshShell.Run ..., 0` (ventana
   oculta) y ahora el `.cmd` usa `start "" /b` sobre `pythonw.exe`.

---

## 4. Instalación desde cero en otro PC

### 4.1 Requisitos

- Windows 10/11
- **Node.js LTS** (`node -v` ≥ 22) → <https://nodejs.org>
- **Python 3** con `pythonw.exe` (viene con el instalador oficial de python.org)
- Cuenta/clave del proveedor que vayas a registrar (aquí: DeepSeek)

### 4.2 Pasos

```powershell
# 1. Instalar el gateway
npm install -g omniroute

# 2. Comprobar que arranca a mano (primera vez: abre el panel y configura
#    la password del panel y los proveedores)
omniroute
#    -> Dashboard http://localhost:20128   API http://localhost:20128/v1
#    -> Ctrl+C para pararlo

# 3. Traer los scripts de este repo
git clone https://github.com/atnojs/ANTIGRAVITY.git
cd ANTIGRAVITY\tools\omniroute

# 4. Instalar el arranque automatico oculto
#    (ajusta HermesHome si en el otro PC la carpeta de datos es otra)
.\instalar-autostart.ps1 -HermesHome 'E:\hermes-data' -Password 'LA_DEL_PANEL'

# 5. Arrancarlo ya, sin reiniciar
& "$env:LOCALAPPDATA\Programs\Python\Python312\pythonw.exe" `
  "E:\hermes-data\omniroute_autostart.py" daemon

# 6. Verificar
.\verificar-omniroute.ps1 -ApiKey 'LA_DE_ENDPOINTS' -Probe
```

Si PowerShell bloquea el script por política de ejecución:

```powershell
powershell -ExecutionPolicy Bypass -File .\instalar-autostart.ps1 -Password '...'
```

### 4.3 Qué deja instalado el instalador

| Fichero | Contenido |
|---|---|
| `E:\hermes-data\omniroute_autostart.py` | daemon v2 (el de este repo) |
| `E:\hermes-data\omniroute_autostart.cmd` | lanzador con `pythonw` y las rutas ya resueltas |
| `…\Startup\omniroute_gateway.vbs` | entrada de Inicio, oculta |
| `%USERPROFILE%\.omniroute\panel.secret` | `OMNIROUTE_DASH_PW=…` |
| `.bak-<fecha>` de todo lo que sustituye | respaldo, nunca borra |

### 4.4 Variables de entorno que entiende el daemon

| Variable | Defecto | Para qué |
|---|---|---|
| `HERMES_HOME` | `E:\hermes-data` | carpeta de datos (`.env`, `logs`) |
| `OMNIROUTE_PORT` | `20128` | puerto del gateway |
| `OMNIROUTE_NODE` | `C:\Program Files\nodejs\node.exe` | intérprete de Node |
| `OMNIROUTE_ENTRY` | `%APPDATA%\npm\node_modules\omniroute\bin\omniroute.mjs` | entrypoint |
| `OMNIROUTE_BIND` | vacío (todas las interfaces) | `127.0.0.1` para atar solo a loopback |
| `OMNIROUTE_DASH_PW` | — | password del panel (o `panel.secret`) |
| `DEEPSEEK_API_KEY` | — | se lee de `$HERMES_HOME\.env` |

---

## 5. Apuntar una herramienta al gateway (el ahorro de verdad)

```txt
Base URL: http://localhost:20128/v1
API Key : la de Dashboard -> Endpoints
Model   : auto        (enrutado inteligente)  o  deepseek/… para forzar
```

Prueba rápida sin ninguna herramienta:

```powershell
curl.exe http://localhost:20128/v1/chat/completions `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer LA_DE_ENDPOINTS" `
  -d '{\"model\":\"auto\",\"messages\":[{\"role\":\"user\",\"content\":\"Hola\"}]}'
```

En el panel, `Dashboard → Endpoints` da la API key. `Dashboard → Providers` lista
las conexiones; `Dashboard → Analytics` muestra el gasto, el ahorro y la latencia.

---

## 6. Verificación y diagnóstico

```powershell
# Estado interno del daemon (puerto, node, entrypoint, credenciales)
pythonw E:\hermes-data\omniroute_autostart.py status

# Salud completa (puerto, interfaz, panel, API, candado, autostart, log)
.\verificar-omniroute.ps1 -ApiKey 'LA_DE_ENDPOINTS' -Probe

# Quién tiene el puerto (netstat funciona aunque CIM esté restringido)
netstat -ano | findstr :20128

# Log en vivo
Get-Content E:\hermes-data\logs\omniroute-autostart.log -Tail 30 -Wait
```

Interpretación del log:

| Línea | Significado |
|---|---|
| `Gateway ya escuchando en 20128.` | todo en orden, no toca arrancar nada |
| `Gateway caido. Arrancando node directo…` | el servidor se había caído y se relanza |
| `DeepSeek ya registrado y activo. OK.` | el proveedor sigue válido |
| `Registro de DeepSeek -> HTTP 200` | se re-registró tras un reinicio del servidor |
| `Ya hay un daemon vivo (PID …). Salgo sin duplicar.` | el candado hizo su trabajo |

---

## 7. Problemas conocidos

| Problema | Causa | Solución |
|---|---|---|
| 401 de OpenRouter a través del gateway | bug conocido del enrutado | usar OpenRouter **directo** mientras dure |
| DeepSeek desaparece de proveedores | las credenciales no sobreviven a reinicios del servidor | ya lo cubre el daemon: re-registro cada hora |
| Aparece una terminal al arrancar | `cmd.exe` intermedio (v1) | usar la v2 con `pythonw` + `node` directo |
| Varios daemons a la vez | sin candado (v1) | candado por PID (v2) |
| El panel pide password y no la sabes | está hasheada en el storage de OmniRoute | `node bin/reset-password.mjs` del propio paquete |

---

## 8. Seguridad (pendiente de decisión)

1. **Escucha en todas las interfaces.** `netstat` muestra `0.0.0.0:20128`, no
   `127.0.0.1:20128`: el panel y la API son alcanzables desde la red local.
   Mitigación: `OMNIROUTE_BIND=127.0.0.1` (el daemon lo aplica como `HOSTNAME`
   al lanzar). **Antes de cambiarlo**, comprobar que nada lo llame desde WSL o
   desde otro equipo (existe una skill `omniroute-wsl-claude-code`).
2. **Password del panel en claro.** Vivía dentro del `.py` (v1) y sigue en
   `%USERPROFILE%\.omniroute\panel.secret` (v2, fuera del repositorio, pero en
   claro). Dependencias conocidas de esa password: el daemon y
   `E:\hermes-data\scripts\monitor-omniroute-diario.py`. Si se cambia en el
   panel, hay que actualizar los dos.
3. **Nada de esto se versiona con secretos**: `tools/omniroute/` no contiene
   ninguna clave. La raíz del repo se publica en Hostinger, así que cualquier
   fichero versionado es accesible por web.

---

## 9. Estado tras el arreglo (2026-10-15, verificado en este equipo)

Instalado y comprobado en vivo:

| Comprobación | Resultado |
|---|---|
| Cadena de procesos ANTES | `cmd.exe /c …\npm\omniroute.cmd serve` → `node bin/omniroute.mjs serve` → `node dist/server-ws.mjs` |
| Cadena de procesos DESPUÉS | `pythonw.exe omniroute_autostart.py daemon` → `node.exe …\bin\omniroute.mjs serve` → `node dist/server-ws.mjs` (**sin `cmd.exe`**) |
| Ventana de consola | `tasklist /v` devuelve `N/D` (sin título de ventana) para `pythonw` y los dos `node` |
| Tiempo de arranque | gateway arriba en 2 s |
| DeepSeek | `DeepSeek ya registrado y activo. OK.` |
| Candado | al relanzar el `.vbs` con el gateway ya arriba: `Ya hay un daemon vivo (PID 27956). Salgo sin duplicar.` |
| Autostart | `…\Startup\omniroute_gateway.vbs` presente; los lanzadores v1 quedaron en `.bak` |
| Puerto | `TCP 0.0.0.0:20128 LISTENING` |

Comandos usados para verificarlo (repetibles):

```powershell
# cadena de procesos (CIM; requiere permisos normales de usuario)
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'omniroute' } |
  Select-Object ProcessId,ParentProcessId,Name,CommandLine

# ¿tiene ventana?  N/D = sin consola
tasklist /v /fo csv /nh | Select-String 'node.exe|pythonw.exe'

# que el autoarranque no duplique
wscript "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\omniroute_gateway.vbs"
Get-Content E:\hermes-data\logs\omniroute-autostart.log -Tail 3
```

### Arrancar el daemon sin que se lo lleve por delante el proceso padre

Si lanzas el daemon desde una terminal o desde un agente que mata su árbol de
procesos al terminar, el daemon muere con él. Para despegarlo del job:

```powershell
$cmd = '"C:\Users\atnojs\AppData\Local\Programs\Python\Python312\pythonw.exe" "E:\hermes-data\omniroute_autostart.py" daemon'
([wmiclass]'Win32_Process').Create($cmd)   # ReturnValue=0 y PID -> ya es independiente
```

Al iniciar sesión esto no hace falta: el `.vbs` ya lo lanza fuera de cualquier job.

### Pendiente de decisión (no tocado a propósito)

1. **`0.0.0.0` → `127.0.0.1`**: el gateway escucha en todas las interfaces. Cambiarlo
   con `OMNIROUTE_BIND=127.0.0.1` en el `.cmd` **solo** si se confirma que nada lo
   llama desde WSL o desde otro equipo.
2. **Password del panel**: sigue en claro en `%USERPROFILE%\.omniroute\panel.secret`.
   Cambiarla exige actualizar también `E:\hermes-data\scripts\monitor-omniroute-diario.py`.
3. **Apuntar DSH (este agente) al gateway**: hoy habla con la API del proveedor
   directamente, así que **no** se beneficia de la compresión. Es el ahorro grande
   que queda pendiente; hay que localizar dónde define DSH su `base_url`.

---

## 10. Historial de cambios

| Fecha | Cambio |
|---|---|
| 2026-10-15 | v2 del daemon instalada y verificada en este PC: `pythonw`, `node` directo, `CREATE_NO_WINDOW`, candado, log con rotación, sin credenciales en el código. Instalador, verificador y esta guía añadidos. Los lanzadores v1 quedaron como `.bak` |
| (antes) | v1: `omniroute_deepseek_autostart.py/.cmd/.vbs` (arrancaba el gateway por el shim `.cmd` → ventana visible de `cmd.exe`) |
