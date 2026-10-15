# Bitácora

Qué se hizo, cuándo y con qué commit. De lo más reciente a lo más antiguo.
Una entrada por sesión de trabajo relevante.

---

## 2026-10-15 — OmniRoute: arranque oculto, diagnóstico de la ventana y esta memoria

**Punto de partida.** Antonio pregunta por la memoria del agente y por un montaje antiguo:
un script que, al encender el PC, abría la URL de OmniRoute y una terminal, con la idea de
que eso optimizaba los tokens.

**Qué se descubrió**

1. El script existía: `E:\hermes-data\omniroute_deepseek_autostart.py` + `.cmd` + `.vbs`,
   este último en la carpeta de Inicio de Windows. Hacía tres cosas: arrancar el gateway si
   estaba caído, loguearse en el panel y **re-registrar DeepSeek cada hora** (sus
   credenciales no sobreviven a los reinicios del servidor).
2. **No abría ningún navegador.** La terminal que aparecía sola era otra cosa.
3. La ventana salía de un `cmd.exe` intermedio: el daemon lanzaba el shim `omniroute.cmd`,
   y `DETACHED_PROCESS` sobre un `.cmd` hace que Windows cree una consola nueva.
4. **El ahorro de tokens no viene de tener ventanas abiertas**, sino de que las
   herramientas apunten su `base_url` al gateway (`http://localhost:20128/v1`), que aplica
   compresión RTK+Caveman y failover a capas gratuitas. Una ventana abierta no ahorra nada.

**Qué se hizo**

| Acción | Resultado |
|---|---|
| Levantar el gateway | Arriba, DeepSeek activo |
| Daemon v2 | `pythonw` + `node` directo + `CREATE_NO_WINDOW` + candado de instancia + log con rotación |
| Instalador y verificador | `tools/omniroute/instalar-autostart.ps1` y `verificar-omniroute.ps1` |
| Guía de réplica | `tools/omniroute/GUIA-OMNIROUTE.md` (incluye cómo montarlo en otro PC) |
| Arranque automático | `…\Startup\omniroute_gateway.vbs`; los lanzadores v1 quedaron como `.bak` |
| Memoria del proyecto | Esta carpeta `tools/memoria/` |

**Evidencia**

- Cadena nueva: `pythonw.exe` → `node.exe ...\bin\omniroute.mjs serve` → `node dist/server-ws.mjs`.
  Sin `cmd.exe`.
- `tasklist /v`: `N/D` (sin ventana) para los tres procesos.
- Candado probado: `Ya hay un daemon vivo (PID 27956). Salgo sin duplicar.`
- Gateway arriba en 2 s; `DeepSeek ya registrado y activo. OK.`

**Errores cometidos** (detalle en `errores.md`): falso "puerto cerrado" por CIM denegado en
silencio; diagnóstico inicial incompleto de la ventana; `pythonw` del venv de Hermes; BOM en
el fichero de secreto; `pwsh` inexistente; `ExecutionPolicy`; y el error del job runner que
**sí había ejecutado** el comando (riesgo de duplicar trabajo).

**Commits**

- `f65fa58` — `feat(omniroute): arranque oculto v2 + guia de replica`
- `c7f061f` — `feat(memoria): memoria operativa del proyecto en tools/memoria`

**Queda abierto:** ver `pendientes.md` (lo importante: apuntar el agente al gateway).
