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
- `119901a` — `docs(memoria): anota el commit de la propia memoria en la bitacora`
  ⚠️ **Este commit salió contaminado**: por usar `git commit -am` arrastró y publicó
  trabajo pendiente de otra sesión (`apps/json/`, `skills/SKILL_VIDEOVAULT_VIDEOS.md`,
  `tools/trickvault/*`). Ver `errores.md`. Detectado y avisado a Antonio; **no se revirtió**
  para no borrar ese trabajo del disco.

**Queda abierto:** ver `pendientes.md` (lo importante: apuntar el agente al gateway).

---

## 2026-10-15 (segunda parte) — Ampliación de la memoria: credenciales, producción y hallazgo de seguridad

Antonio pide ampliar la memoria con los pasos **1 (credenciales), 3 (producción) y
4 (histórico de fallos)**.

**Se hizo**

| Acción | Resultado |
|---|---|
| Inventario de credenciales | `credenciales.md`: 9 almacenes, nombres de claves (nunca valores) y a quién afecta cada rotación |
| Estado de producción | `produccion.md`: barrido de **80 rutas de `apps/`, las 80 con HTTP 200**, con la fecha del `index.html` de cada una |
| Histórico de fallos | `errores-historicos.md`: **40 entradas** rescatadas de Hermes, cron y backups (trabajo delegado a un subagente) |

**Hallazgo de seguridad (lo más importante del día)**

- **37 ficheros** dentro de `apps/` llevan una clave de Google (`AIza…`) escrita en el
  código: **6 claves distintas**, casi todas servidas por web con HTTP 200.
- El repositorio `github.com/atnojs/ANTIGRAVITY` es **público**, así que están expuestas por
  partida doble, y el historial de git las conserva aunque se borren.
- Afecta a apps vivas (`generar_imagenes`, `imagenes_ia`, `viaje_tiempo`,
  `prompts_predeterminados`, `decorar_habitacion`) y a `apps/Copias por si/`, que también se
  sirve.
- Se documentó en `credenciales.md` y se marcó como **urgente** en `pendientes.md`.
  **No se tocó ninguna clave**: la revocación es decisión de Antonio.

**Comprobado que está bien:** `E:\ANTIGRAVITY\keys\` (gitignored, línea 106) y
`E:\ANTIGRAVITY\.private\` están fuera de git e inaccesibles por web (`403`/`404`).

**Método que funcionó:** delegar el rastreo del histórico a un subagente con un fichero de
salida propio (`errores-historicos.md`) evitó cargar decenas de documentos en el contexto
del agente principal y no hubo conflicto de escritura.
