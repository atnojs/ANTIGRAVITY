# Instalar el superagente (dsh-superagent) en este equipo

Runbook del prototipo [`deepseek-ai/dsh-superagent-prototype`](https://github.com/deepseek-ai/dsh-superagent-prototype)
sobre Windows, adaptado a nuestro flujo (`skills/SKILL_SUPERAGENT.md`). La documentación de origen
manda: `docs/006-deployment.md` del repo del plugin. Esto solo traduce lo que en Windows cambia.

> **Estado (2026-11-09, 20:15): plugin instalado y arranca; falta la cuenta.** Node, pnpm, `gh`,
> Python, el wrapper `gh-agent.cmd`, el perfil `superagent`, el bundle compilado y el panel en 3082
> ya funcionan en este equipo. `estado.ps1` sale 3 con `repositoryUnset`, que es lo correcto hasta
> que exista la cuenta del agente y se configure el repositorio. ⏳ pendiente: `gh auth login` con
> `24atnoia`, configurar Sources/Policy/Execution y el primer ticket real.

## Requisitos y estado real

| Requisito | Comprobación | Estado hoy |
|---|---|---|
| DeepSeek Harness ≥ `0.2.1-alpha.2` | `dsh --version` | ✅ `0.2.1-rc.3` |
| Node 22.19+ / 24+ **con npm** | `node --version` | ✅ `24.22.2` en `%LOCALAPPDATA%\Programs\node` (zip oficial; va antes que el `node.cmd` del harness en el PATH del usuario) |
| pnpm | `pnpm --version` | ✅ `11.28.11` (global, en el mismo directorio que Node) |
| git ≥ 2.32 | `git --version` | ✅ `2.55.0` |
| Python 3.8+ | `python --version` | ✅ `3.12.10` en `%LOCALAPPDATA%\Programs\Python\Python312` (ya estaba; se añadió al PATH del usuario, que solo tenía el alias de la Store) |
| GitHub CLI `gh` ≥ 2.48 | `gh --version` | ✅ `2.103.3` en `%LOCALAPPDATA%\Programs\gh\bin` |
| Wrapper de credenciales del agente | `gh-agent.cmd api user --jq .login` | ✅ existe en `C:\Users\atnoj\bin\gh-agent.cmd`; ⏳ sin autenticar |
| Cuenta de GitHub del agente | — | ❌ pedida a Antonio: `24atnoia` / `atnoia24@gmail.com`; falta crearla y darle Write en el repo |
| tmux | — | ➖ no hace falta: solo lo usan los scripts `.sh` del prototipo, que aquí se sustituyen por el arranque directo del perfil |

**Cómo se instaló (2026-11-09), por si hay que repetirlo en otro PC.** La sesión no tiene
elevación, así que en vez de los MSI de `winget` (piden UAC) se usaron los ZIP oficiales:

```powershell
# Node 24 (LTS): zip oficial descomprimido en %LOCALAPPDATA%\Programs\node
# GitHub CLI:    zip oficial descomprimido en %LOCALAPPDATA%\Programs\gh
# PATH de usuario: se anteponen node, gh\bin, Python312 y Python312\Scripts
npm install -g pnpm@11   # queda en el mismo directorio que Node (prefix = carpeta de node.exe)
```

Comprobado en una consola nueva: `where node` → `node.exe` de `Programs\node` (no el `.cmd` del
harness), `node -v` 24.22.2, `pnpm -v` 11.28.11, `gh --version` 2.103.3, `python --version` 3.12.10.


## Paso 0 — Cuenta de GitHub del agente (humano)

Datos decididos por Antonio (2026-11-09): usuario **`24atnoia`**, correo **`atnoia24@gmail.com`**.

1. Crear la cuenta en `https://github.com/signup` con ese correo y ese usuario (un GitHub App no
   sirve: el plugin lee las notificaciones de la cuenta). El código de verificación llega al buzón:
   ese paso solo lo puede hacer Antonio.
2. Activar 2FA y guardar el código de recuperación. En `tools/memoria/credenciales.md` se anota
   **dónde vive**, nunca el valor.
3. Darle permiso de **escritura** en `atnojs/ANTIGRAVITY`: repositorio → Settings → Collaborators →
   Add people → `24atnoia` con rol **Write**.
4. Aceptar la invitación desde la cuenta del agente.

⏳ Nada de esto se puede automatizar desde aquí (captcha + código de correo + 2FA). Cuando exista la
cuenta, el siguiente comando es el `gh auth login` del Paso 1 y a partir de ahí el resto lo hace el
agente.

## Paso 1 — `gh` CLI y wrapper de credenciales

`gh` ya está instalado (`%LOCALAPPDATA%\Programs\gh\bin`, 2.103.3) y el wrapper existe en
`C:\Users\atnoj\bin\gh-agent.cmd`: fija su propio `GH_CONFIG_DIR` para que el token del agente no se
mezcle con el de Antonio — es el equivalente Windows del `gh-agent` de la doc 006:

```bat
@echo off
setlocal
set "GH_CONFIG_DIR=%USERPROFILE%\.config\gh-agent"
set "GH_EXE=%LOCALAPPDATA%\Programs\gh\bin\gh.exe"
if exist "%GH_EXE%" ( "%GH_EXE%" %* ) else ( gh %* )
exit /b %ERRORLEVEL%
```

⏳ Lo único que falta es autenticarlo, y lo hace Antonio en el navegador (no se pasa ningún token
por el chat):

```powershell
& C:\Users\atnoj\bin\gh-agent.cmd auth login          # iniciar sesion como 24atnoia
& C:\Users\atnoj\bin\gh-agent.cmd api user --jq .login  # debe imprimir: 24atnoia
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

Python 3.8+ (la doc 006 lo pide entre los prerrequisitos; el `python` del PATH es hoy el alias de
Microsoft Store y no ejecuta nada):

```powershell
winget install --id Python.Python.3.12
python --version    # 3.12.x, en una consola nueva
```

Si `python --version` sigue abriendo la Store, desactivar el alias en
Configuración → Aplicaciones → Alias de ejecución de aplicaciones, o usar la ruta absoluta que deja
el instalador (`%LOCALAPPDATA%\Programs\Python\Python312\python.exe`).

## Paso 3 — Checkout del plugin, fuera del repo público

```powershell
New-Item -ItemType Directory -Force E:\_superagent | Out-Null
git clone https://github.com/deepseek-ai/dsh-superagent-prototype.git E:\_superagent\dsh-superagent
cd E:\_superagent\dsh-superagent
pnpm install
pnpm build
```

En PowerShell, `pnpm` resuelve a `pnpm.ps1` y la política de ejecución de este equipo lo bloquea
(`PSSecurityException`). Usar `pnpm.cmd` o lanzarlo desde `cmd.exe`; con eso el build pasa
(comprobado: `lib/index.js` 450 kB, `lib/client.js` 359 kB, 12 s).

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
| `dsh-superagent.stateDir` | `/Users/atnoj/.dsh/state/superagent` — **debe empezar por `/`** (el esquema la valida con `^\/`); en Windows se resuelve contra la unidad del directorio de trabajo, así que se arranca con `cd /d C:\` y queda en `C:\Users\atnoj\.dsh\state\superagent`. Fuera del repo; **respaldar antes de actualizar** |

### Lo que se descubrió al arrancar (2026-11-09)

- Con `stateDir: C:\Users\...` el plugin **no activa**: `ValidationError: $.stateDir expect string to
  match regexp /^\//`. Hay que usar la forma POSIX y fijar el directorio de trabajo al arrancar.
- Con el perfil arrancado, el panel responde y `estado.ps1` sale **3** con el motivo real:
  `github / repositoryUnset — The GitHub Source names no repository`. Es decir: el plugin está vivo y
  solo falta configurar la cuenta y el repositorio.
- La base de datos se crea en `<stateDir>/orchestrator.sqlite` (+ `-shm`, `-wal`): 4 KB al arrancar.

## Paso 6 — Arrancar y parar sin tmux

Los scripts `scripts/dsh-superagent start|stop` son POSIX y usan tmux: en Windows no valen. Arranque
directo del perfil, en segundo plano:

```powershell
Start-Process -FilePath "$env:USERPROFILE\bin\dsh.cmd" `
  -ArgumentList '--profile','superagent','--no-open' `
  -WorkingDirectory 'C:\' `
  -WindowStyle Minimized
```

`-WorkingDirectory 'C:\'` no es decorativo: `stateDir` se resuelve contra la unidad del directorio de
trabajo, y sin eso el estado acaba en la unidad desde la que se lance. `--no-open` evita que abra el
navegador; la URL con token se imprime en el log.

- Para que sobreviva al cierre de sesión, crear una tarea programada «al iniciar sesión» que lance
  esa misma línea (en este equipo `schtasks` está denegado: usar el patrón de
  `tools/descargador/iniciar-worker.vbs`, que arranca oculto y sin duplicar).
- Parada ordenada: cerrar la ventana del perfil o `Stop-Process` sobre el proceso `dsh` del perfil.
  El prototipo espera hasta 5 minutos a los workers; no matar a la fuerza. Si hace falta forzar,
  matar el proceso que escucha en 3082.
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

## Lo ya verificado (2026-11-09, 20:15)

- ✅ Build del plugin en Windows: `pnpm build` (`tsdown`) genera `lib/` en 12 s.
- ✅ Perfil creado, bundle enlazado y composición correcta (`--dump-config` muestra `port: 3082` y el
  `stateDir` aplicados; los presets `dsh-superagent-worker` y `dsh-superagent-router` aparecen).
- ✅ Arranque: el panel responde en 3082 y `estado.ps1` devuelve **3** con el motivo exacto
  (`repositoryUnset`), que es lo que toca mientras no haya cuenta y repositorio configurados.

## Lo que este runbook no ha verificado

- Un ticket de verdad de principio a fin: el `prepare` con el host real, la rama `agent/…` y el PR.
- Con qué intérprete lanza el host el `prepare` (`cmd.exe` propio frente al `sh` que documenta la
  doc 003). El `.cmd` está probado a mano contra un repositorio local: Issue, PR, rama inexistente y
  reintento.
- Que la cuenta `24atnoia` exista, esté autenticada y pueda empujar a `atnojs/ANTIGRAVITY`.

Cada uno se marca ✅ en este fichero cuando se ejecute de verdad.
