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
python flow_agent.py --status
```

Debe decir `credencial: OK`, los trabajos pendientes, si el perfil de Chrome
está libre y el estado de la sesión de Flow.

## 3. Ejecutarlo

- Una pasada (para el Programador de tareas):
  ```powershell
  python flow_agent.py --once
  ```
- Servicio continuo durante un rato:
  ```powershell
  python flow_agent.py --minutes 25
  ```

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
$py = "C:\Users\atnojs\AppData\Local\Programs\Python\Python312\python.exe"
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
| `pendiente de comprobar` en la web | El PC se apagó generando | Comprobar en Flow si salió y pulsar «Reintentar» |
