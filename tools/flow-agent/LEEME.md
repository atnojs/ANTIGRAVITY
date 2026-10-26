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

## Instalar como tarea programada (opcional)

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
| El trabajo se queda en cola | El agente no corre o no llega al servidor | `--status` y revisar la conexión |
| `aplazado: …ProcessSingleton` | Otro Chrome tiene el perfil ocupado | Normal: el trabajo vuelve a la cola y se reintenta solo |
| `Event loop is closed` en el mensaje | Antes tapaba la causa real | Actualizado: ahora se informa del motivo verdadero y se guarda `logs/<id>.log` |
| `pendiente de comprobar` en la web | El PC se apagó generando | Comprobar en Flow si salió y pulsar «Reintentar» |
| `Failed to create a ProcessSingleton` | Otro Chrome usa el perfil de Flow (el worker antiguo) | Desactivar `FlowStudioWorker` (ver §0-bis) |
| `EPERM: operation not permitted, mkdtemp` | La carpeta temporal del sistema está restringida | Rellenar `tmp_dir` en `agente.json` |
| `credencial rechazada (HTTP 401)` tras pegar el token | El servidor no lo ha recibido todavía | Comprobar `SetEnv` y que no haya espacios ni comillas de más |
