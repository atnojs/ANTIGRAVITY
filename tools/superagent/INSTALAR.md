# Instalar el superagente (dsh-superagent) en este equipo

Runbook del prototipo [`deepseek-ai/dsh-superagent-prototype`](https://github.com/deepseek-ai/dsh-superagent-prototype)
sobre Windows, adaptado a nuestro flujo (`skills/SKILL_SUPERAGENT.md`). La documentación de origen
manda: `docs/006-deployment.md` del repo del plugin. Esto solo traduce lo que en Windows cambia.

> **Estado (2026-11-09): NO instalado.** Este runbook está escrito contra `docs/006-deployment.md`
> y con el equipo comprobado, pero **no se ha ejecutado**: faltan los requisitos marcados ❌ o ⚠️ en
> la tabla, salvo tmux, que no hace falta. Cada paso pendiente va marcado ⏳. No se declara
> funcionando nada que no se haya arrancado.

## Requisitos y estado real

| Requisito | Comprobación | Estado hoy |
|---|---|---|
| DeepSeek Harness ≥ `0.2.1-alpha.2` | `dsh --version` | ✅ `0.2.1-rc.3` |
| Node 22.19+ / 24+ **con npm** | `node --version` | ⚠️ el `node` del PATH es el empaquetado en la app (`…\DeepSeek Harness\resources\runtime\…\node.exe`), **sin npm ni corepack** |
| pnpm | `pnpm --version` | ❌ no está |
| git ≥ 2.32 | `git --version` | ✅ `2.55.0` |
| Python 3.8+ | `python --version` | ❌ el `python` del PATH es el alias de Microsoft Store (no hay intérprete real); la doc 006 lo pide entre los prerrequisitos |
| GitHub CLI `gh` ≥ 2.48 | `gh --version` | ❌ no está |
| Cuenta de GitHub del agente | `gh api user --jq .login` con su propia config | ❌ no existe (la crea Antonio) |
| tmux | — | ❌ no hace falta: solo lo usan los scripts `.sh` del prototipo, que aquí se sustituyen por el arranque directo del perfil |

Coste: la instalación completa son ~20-30 minutos contando creación de cuenta y build.

## Paso 0 — Cuenta de GitHub del agente (humano)

1. Crear una cuenta de usuario **solo** para el agente (un GitHub App no sirve: el plugin lee las
   notificaciones de la cuenta).
2. Darle permiso de **escritura** en `atnojs/ANTIGRAVITY` (colaborador con Write).
3. Activar 2FA y guardar el código de recuperación junto al resto de credenciales
   (`tools/memoria/credenciales.md`: solo *dónde vive*, nunca el valor).

⏳ Pedir a Antonio el nombre de la cuenta y el token **antes** de seguir: los pasos 1-3 no se pueden
inventar.

## Paso 1 — `gh` CLI y wrapper de credenciales

Instalar GitHub CLI (`winget install --id GitHub.cli`), abrir una consola nueva y crear el wrapper
que aísla las credenciales del agente — el equivalente Windows del `gh-agent` de la doc 006:

```bat
rem C:\Users\atnoj\bin\gh-agent.cmd
@echo off
set "GH_CONFIG_DIR=%USERPROFILE%\.config\gh-agent"
gh %*
```

```powershell
# Iniciar sesión SOLO como la cuenta del agente (nunca la de Antonio)
& C:\Users\atnoj\bin\gh-agent.cmd auth login
& C:\Users\atnoj\bin\gh-agent.cmd api user --jq .login   # debe imprimir la cuenta del agente
```

`GH_CONFIG_DIR` distinto ⇒ token distinto. Si ese comando imprime `atnojs`, el aislamiento está
roto y hay que parar.

## Paso 2 — Node con npm y pnpm

El `node` del PATH es el runtime interno de la app y no trae gestor de paquetes. Instalar Node LTS
aparte (`winget install --id OpenJS.NodeJS.LTS`) y después:

```powershell
corepack enable pnpm
pnpm --version    # 11.x
```

## Paso 3 — Checkout del plugin, fuera del repo público

```powershell
New-Item -ItemType Directory -Force E:\_superagent | Out-Null
git clone https://github.com/deepseek-ai/dsh-superagent-prototype.git E:\_superagent\dsh-superagent
cd E:\_superagent\dsh-superagent
pnpm install
pnpm build
```

`E:\_superagent` queda **fuera** de `E:\ANTIGRAVITY`: el repo se despliega en la raíz pública y el
plugin no debe estar dentro.

Clone propio del que salen los tickets (el script de preparación lo exige con `.git`):

```powershell
git clone https://github.com/atnojs/ANTIGRAVITY.git E:\_superagent\repo
```

## Paso 4 — Perfil `superagent` y alta del bundle

```powershell
dsh superagent --from-default-profile web --dump-config > $null
dsh plugin --profile superagent add "link:E:/_superagent/dsh-superagent"
```

- El primer comando crea `%USERPROFILE%\.dsh\profiles\superagent` desde la plantilla web. **Solo la
  primera vez**: si se repite, borra el `cordis.patch.yml` del perfil.
- El segundo enlaza el checkout en el perfil. Si pnpm rechaza el `link:` con ruta de Windows,
  comprobar la ruta con barras normales (arriba) y que `pnpm` sea el de corepack, no otro.

## Paso 5 — Configuración de máquina

Copiar `profile.cordis.patch.example.yml` (esta carpeta) a
`%USERPROFILE%\.dsh\profiles\superagent\cordis.patch.yml` y revisar:

| Clave | Valor aquí |
|---|---|
| `webserver.port` | `3082` (libre; OmniRoute usa 20128 y la GUI de DSH 19387) |
| `dsh-superagent.stateDir` | `C:\Users\atnoj\.dsh\state\superagent` — absoluto, fuera del repo, **respaldar antes de actualizar** |

## Paso 6 — Arrancar y parar sin tmux

Los scripts `scripts/dsh-superagent start|stop` son POSIX y usan tmux: en Windows no valen. Arranque
directo del perfil, en segundo plano:

```powershell
Start-Process -FilePath "$env:USERPROFILE\bin\dsh.cmd" `
  -ArgumentList '--profile','superagent' `
  -WindowStyle Minimized
```

- Para que sobreviva al cierre de sesión, crear una tarea programada «al iniciar sesión» que lance
  esa misma línea (en este equipo `schtasks` está denegado: usar el patrón de
  `tools/descargador/iniciar-worker.vbs`, que arranca oculto y sin duplicar).
- Parada ordenada: cerrar la ventana del perfil o `Stop-Process` sobre el proceso `dsh` del perfil.
  El prototipo espera hasta 5 minutos a los workers; no matar a la fuerza.
- Estado, sin panel:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File E:\ANTIGRAVITY\tools\superagent\estado.ps1
```

Sale 0 (bien), 1 (no responde / error), 2 (una parte falla; reiniciar no lo arregla) o 3 (espera
setup). Los cuatro códigos son los del `status` oficial.

## Paso 7 — Configurar el panel (`http://127.0.0.1:3082`, el puerto configurado → Superagent)

| Bloque | Qué poner |
|---|---|
| **Sources → GitHub** | Repositorio `atnojs/ANTIGRAVITY`, CLI `C:\Users\atnoj\bin\gh-agent.cmd`. `observeIssues` / `observePulls` / `observeComments` apagados hasta que el agente esté fino; `observeCi` también |
| **Policy → allowed** | Solo `atnojs`. Sin nadie en la lista, ninguna petición se convierte en ticket. `bots`: `dependabot[bot]` solo si se quiere que sus avisos generen candidatos |
| **Execution** | `directory`: `E:\_superagent\work`; `maxWorkers`: 1 al principio; `blockedCommands`: el `gh` personal (`C:\Program Files\GitHub CLI\gh.exe`) y cualquier CLI con la cuenta de Antonio |
| **Prompts → equipo** | Línea de divulgación en cada mensaje (`This is by an automated agent, not a human`), autor del commit, «never merge: a human merges», y la obligación de leer `AGENTS.md` + `skills/` antes de tocar archivos |

**Comando de preparación.** El de la doc 006 es POSIX y asume variables con sintaxis de shell. Aquí
se usa `preparar-ticket.cmd`, que lee las variables del entorno y elige la base: head del PR en
tickets de PR, `main` en tickets de Issue.

| Bloque | Valor |
|---|---|
| `directory` | `E:\_superagent\work` |
| `prepare` | `E:\ANTIGRAVITY\tools\superagent\preparar-ticket.cmd` |

El script crea el worktree en `%DSH_SUPERAGENT_DIR%` con rama `agent/%DSH_SUPERAGENT_NAME%`. Si es
un reintento y quedan restos del intento anterior, falla con las tres órdenes de limpieza escritas
(`worktree remove --force`, `worktree prune` y `branch -D`): no borra nada por su cuenta.

Probado contra un repositorio local de prueba, no contra GitHub: Issue (sin head de PR) → OK desde
`main`; PR con head `feature` → OK desde ese head; rama inexistente → 1 con el motivo; reintento con
la rama ya creada → 1 con la ayuda.

**⏳ Falta lo importante:** el `.cmd` se ejecuta con `cmd.exe`, y la doc 003 dice que el `prepare`
corre con `sh`. Antes de dar el ticket por bueno hay que ver con qué intérprete lo lanza este host
y, si es `sh`, envolver el script (`cmd.exe /c ...`) o portarlo. No se ha probado con el host real.

**No** apuntar `directory` a `E:\ANTIGRAVITY`: los worktrees dentro del repo desplegado acaban
publicados en la web.

## Paso 8 — Primera prueba

1. Desde la cuenta autorizada, abrir un Issue en `atnojs/ANTIGRAVITY` que mencione a la cuenta del
   agente con un encargo pequeño y real (p. ej. corregir una errata en una ficha de `skills/`).
2. En un minuto debe aparecer el Ticket en el panel. Confirmación en el hilo, rama `agent/…`, PR en
   draft.
3. Revisar el PR: ¿commits aislados? ¿evidencia? ¿sin secretos? ¿sin merge?
4. Mergear con squash, borrar la rama, comprobar despliegue con `publicar-git`.

## Aislamiento y respaldo

- **Cuenta de Windows dedicada.** Los presets corren con `danger-full-access` como el usuario del
  sistema; el worker puede ejecutar programas por ruta y leer el home. La doc 006 lo recomienda para
  aislar de verdad («for isolation, use a dedicated OS account»); aquí se toma como requisito.
- Copiar `<stateDir>\orchestrator.sqlite` antes de cada actualización (`pnpm install && pnpm build`,
  luego reiniciar). Una base migrada por una versión nueva no la abre una vieja.
- El perfil `superagent` es independiente del perfil de trabajo: no se mezclan sesiones ni
  configuraciones.

## Diagnóstico rápido

| Síntoma | Causa / qué hacer |
|---|---|
| `estado.ps1` sale 1 y no hay nada escuchando | El perfil no está arrancado, o el puerto no es 3082 |
| Panel dice que no responde | Está reiniciando o no arrancó: leer el log del perfil en `.artifacts\` |
| El log dice que el plugin es incompatible con el `dsh` en marcha | Instalar un `dsh` dentro del rango `engines.dsh` del `package.json` del plugin |
| Un ticket falla con «prepare command failed» | La salida del comando dice la causa (ruta del clone, variables sin expandir) |
| `… was not written by dsh-superagent` | Hay un fichero ajeno en `worker-bin` o `worker-gitconfig`: moverlo o cambiar `stateDir` |

## Lo que este runbook no ha verificado

- El build del plugin en Windows (depende de `pnpm build` con `tsdown`).
- El arranque del perfil `superagent` y el panel en el puerto configurado.
- El comando de preparación con el host real expandiendo las variables (sí está probado contra un
  repositorio local: Issue, PR, rama inexistente y reintento).
- Que la cuenta del agente pueda empujar a `atnojs/ANTIGRAVITY`.

Cada uno se marca ✅ en este fichero cuando se ejecute de verdad.
