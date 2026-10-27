# Agente de Google Flow para Unified Image Studio

Este agente conecta el **PC donde tienes Flow** con el estudio web. La web
(`apps/unified-image-studio`) encola los trabajos y este programa los ejecuta y
sube el resultado, así que puedes lanzar imágenes y vídeos desde el móvil o
desde otro ordenador sin exponer nada de tu red.

```text
Móvil / otro PC  ──►  servidor (cola en SQLite)  ◄──  agente de este PC
                                                      └─► Google Flow (Chrome)
```

## Qué necesitas

- Windows con Chrome instalado.
- Python 3.11 o superior con `playwright` y `Pillow`.
- La sesión de Google iniciada en el perfil de Chrome de Flow
  (`E:/herramientas/google-flow/session/flowbot-profile`).
- La credencial del agente, que se genera **en el servidor** (ver abajo).

## 0. Ya está preparado en este PC (2026-10-26)

- Entorno propio del agente: `tools/flow-agent/.venv` (Python 3.11 + Playwright + Pillow).
  No usa el Python del sistema ni el de Hermes.
- `agente.json` creado y apuntando a producción, con `tmp_dir` propio
  (`tools/flow-agent/tmp`) porque Chrome necesita escribir temporales y en algunos
  entornos la carpeta temporal del sistema está restringida.
- Lanzadores: `iniciar-agente.bat` (manual) e `iniciar-agente-oculto.vbs` (sin ventana,
  para la carpeta Inicio).
- **Falta un solo paso**: poner el token en el servidor (ver §1).

## 0-bis. Importante: no compartas el perfil de Chrome

El perfil `session/flowbot-profile` solo lo puede usar **un** Chrome a la vez. El worker
antiguo de Flow Studio (`E:\herramientas\google-flow\flow_studio_worker.py`, tarea
`FlowStudioWorker`) usa ese mismo perfil. Si los dos coinciden, uno de los dos fallará con
`Failed to create a ProcessSingleton`. Opciones:

1. **Recomendado:** desactivar el worker antiguo si ya usas el estudio unificado.
   ```powershell
   Disable-ScheduledTask -TaskName 'FlowStudioWorker'
   Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*flow_studio_worker*' } |
     ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
   ```
2. Convivir con ambos. El agente **no reclama trabajo mientras el perfil esté ocupado**
   (imprime «perfil de Flow ocupado… espero sin reclamar trabajo»), así que la colisión no
   marca trabajos como fallidos: simplemente espera al siguiente ciclo.
## 0-ter. El perfil de Chrome vive dentro del agente (importante)

El perfil **no** se usa desde `E:\herramientas\google-flow\session\flowbot-profile`: Chrome recibe
`Acceso denegado (0x5)` al crear su fichero de bloqueo en esa ruta (`Crashpad\settings.dat` y el
lock de `ProcessSingleton`), aunque el usuario sí pueda escribir ahí desde PowerShell. Pasaba
igual al ejecutar el agente a mano y desde el Programador de tareas, así que no era una colisión:
era el proceso de Chrome sin permiso en esa carpeta.

Solución aplicada: el perfil se copió a

```
E:\ANTIGRAVITY\tools\flow-agent\session\flowbot-profile
```

y `agente.json` apunta ahí. Esa ruta está ignorada por Git (contiene cookies de sesión) y Chrome
escribe sin problemas.

- **Renovar la sesión:** si alguna vez caduca, entra con
  `FLOW_CHROME_PROFILE=E:/ANTIGRAVITY/tools/flow-agent/session/flowbot-profile` y ejecuta
  `.venv\Scripts\python.exe flow.py login`.
- **Si vuelve el error `ProcessSingleton`:** comprueba que no haya un Chrome abierto con ese
  perfil (`--status` lo dice) y que `agente.json` apunta a la ruta de arriba.
## 1. Credencial del agente

El token debe coincidir con el del servidor. Se admite de dos formas:

1. **Variable de entorno del servidor** (`UIS_FLOW_AGENT_TOKEN` en el
   `.htaccess` raíz de Hostinger, nunca en Git):
   ```apache
   SetEnv UIS_FLOW_AGENT_TOKEN "..."
   ```
2. **Fichero privado del servidor** `storage/flow-agent.json` (fuera de Git y
   sin servicio web). Basta con `{"sha256":"<hash del token>"}`.

Y en este PC se guarda el valor en claro en `tools/flow-agent/agente.json`
(ignorado por Git):

```json
{
  "base": "https://atnojs.es/apps/unified-image-studio/api.php",
  "token": "el-mismo-valor-que-el-del-servidor",
  "flow_profile": "E:/herramientas/google-flow/session/flowbot-profile",
  "out_dir": ""
}
```

Genera un valor nuevo con:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 2. Comprobar que todo responde

```powershell
cd E:\ANTIGRAVITY\tools\flow-agent
.\.venv\Scripts\python.exe flow_agent.py --status
```

O simplemente: doble clic en `iniciar-agente.bat --status`.

Debe decir `credencial: OK`, los trabajos pendientes, si el perfil de Chrome
está libre y el estado de la sesión de Flow.

## 3. Ejecutarlo

- **Lo normal:** doble clic en `iniciar-agente.bat`. Trabaja 25 minutos y se cierra.
- **Si la app dice «Flow: sin conexión»:** doble clic en `conectar.bat`. Comprueba la credencial,
  arranca el agente **12 horas con la ventana abierta** y, si algo falla, deja el error en pantalla
  (no se cierra sola). Es la forma más rápida de ver qué pasa.
- **Para que no se vuelva a caer:** doble clic en `instalar-tarea.bat` **una vez**. Instala la tarea
  `UisFlowAgent` (cada 2 minutos, 6 minutos por pasada, también al iniciar sesión) y la arranca.
  A partir de ahí el PC se reconecta solo aunque cierres la ventana o reinicies.
- Una sola pasada (para tareas programadas):
  ```powershell
  iniciar-agente.bat --once
  ```
- Servicio continuo:
  ```powershell
  iniciar-agente.bat --minutes 25
  ```
- Sin ventana, al encender el PC: acceso directo a `iniciar-agente-oculto.vbs` en
  `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` (el propio VBS evita duplicados).

Mientras genera, el agente pregunta al servidor cada 3 s si hay que parar: si en la biblioteca se
pulsa **Parar**, cierra Chrome, borra los archivos parciales y no sube nada.

El agente toma **un trabajo cada vez**, lo genera con `flow.py`, comprime la
imagen a JPEG (~1400 px) o sube el MP4, y avisa al servidor. Si el PC se apaga a
mitad, el servidor marca el trabajo como **pendiente de comprobar**: no se
reenvía solo, para no gastar dos veces la generación.

## Reglas que conviene recordar

- **No dejes Chrome abierto con el perfil de Flow**: Playwright no puede abrir
  un perfil en uso y la generación falla en dos segundos. El agente lo comprueba
  antes de empezar y lo dice.
- Los vídeos consumen puntos de Google: la cola limita a **2 vídeos** pendientes.
- Los resultados quedan también en `outputs/` de esta carpeta para revisión
  manual, además de en la biblioteca del estudio.
- Este agente **nunca** guarda el token en logs ni lo imprime.

## Dos trabajadores conviviendo (estudio nuevo + app antigua)

En este PC hay **dos** servicios de Flow activos a la vez, cada uno con su cola:

| Servicio | Atiende | Tarea | Intérprete |
|---|---|---|---|
| Agente nuevo | `unified-image-studio-hoola` (cola SQLite propia) | `UisFlowAgent` | `.venv` del agente (`tools/flow-agent`) |
| Worker antiguo | `flow_studio` y `flow_studio_hoola` (comparten `flow_store/`) | `FlowStudioWorker` | venv de Hermes |

Se llevan bien porque usan **perfiles de Chrome distintos**: el agente nuevo trabaja sobre
`tools/flow-agent/session/flowbot-profile` (copia) y el antiguo sobre
`E:\herramientas\google-flow\session\flowbot-profile`. Ninguno bloquea al otro.

Lo que sí comparten es la **cuenta de Google**: si los dos generan a la vez compiten por la cuota y
pueden tardar más. Es el precio de tener las dos apps activas; se aceptó el 2026-10-27.

Cada uno se instala y se comprueba por separado:

```powershell
# Estudio nuevo
powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1 -Estado

# App antigua
powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea-antigua.ps1 -Estado
```

Los dos aceptan `-Quitar` para desactivarlos sin borrar nada del worker.

**Ojo con la app antigua:** su cola puede tener trabajos viejos esperando (de cuando el worker
estaba parado). Al activar el worker se generan todos. Si no se quieren, hay que vaciarlos desde la
propia app antes de activarlo.
## Dejarlo siempre conectado (recomendado)

```powershell
cd E:\ANTIGRAVITY\tools\flow-agent
powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1
```

Registra la tarea `UisFlowAgent`: arranca al iniciar sesión y se repite cada 2 minutos, con turnos
de 6 minutos, así que **siempre hay uno trabajando**. Se recupera tras suspensión o apagado y
reintenta si el proceso falla. Comprobar el estado en cualquier momento:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1 -Estado
```

Y para quitarlo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\instalar-tarea.ps1 -Quitar
```

## Instalar como tarea programada (alternativa manual)

```powershell
$py = "E:\ANTIGRAVITY\tools\flow-agent\.venv\Scripts\pythonw.exe"
$accion = New-ScheduledTaskAction -Execute $py `
  -Argument "flow_agent.py --minutes 6" `
  -WorkingDirectory "E:\ANTIGRAVITY\tools\flow-agent"
$disparo = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 2)
Register-ScheduledTask -TaskName "UisFlowAgent" -Action $accion -Trigger $disparo -Description "Agente de Google Flow para Unified Image Studio"
```

## Diagnóstico rápido

| Síntoma | Causa habitual | Qué hacer |
|---|---|---|
| `credencial rechazada (HTTP 401)` | El token del PC no coincide con el del servidor | Regenerarlo y actualizar los dos lados |
| `hay N Chrome con el perfil de Flow abierto` | Chrome abierto a mano con ese perfil | Cerrar esos Chrome |
| `Flow no reconoce el modelo` | Google renombró el modelo | Revisar `MODEL_ALIASES` en `flow_agent.py` |
| El trabajo se queda en cola | El agente no corre o no llega al servidor | `conectar.bat` y revisar la ventana |
| «otro agente en marcha» sin haber ninguno | Lock huérfano con el PID reciclado por otro programa | Corregido en v1.3.1; `conectar.bat` también lo limpia |
| `aplazado: …ProcessSingleton` | Otro Chrome tiene el perfil ocupado | Normal: el trabajo vuelve a la cola y se reintenta solo |
| `Event loop is closed` en el mensaje | Antes tapaba la causa real | Actualizado: ahora se informa del motivo verdadero y se guarda `logs/<id>.log` |
| `pendiente de comprobar` en la web | El PC se apagó generando | Comprobar en Flow si salió y pulsar «Reintentar» |
| `Failed to create a ProcessSingleton` | Otro Chrome usa el perfil de Flow (el worker antiguo) | Desactivar `FlowStudioWorker` (ver §0-bis) |
| `EPERM: operation not permitted, mkdtemp` | La carpeta temporal del sistema está restringida | Rellenar `tmp_dir` en `agente.json` |
| `credencial rechazada (HTTP 401)` tras pegar el token | El servidor no lo ha recibido todavía | Comprobar `SetEnv` y que no haya espacios ni comillas de más |
