---
name: publicar-git
description: "Úsala siempre que haya que publicar cambios en git: commit aislado sin arrastrar trabajo ajeno, push a main, disparo del despliegue de Hostinger y verificación de que producción sirve la versión nueva. Actívala con 'haz commit', 'súbelo', 'publica', 'push', 'despliega' o al terminar cualquier cambio de archivo."
---

# Publicar en git — commit aislado, push a `main` y despliegue en Hostinger

## Qué resuelve

Deja un cambio **publicado y comprobado**: commit que contiene solo los archivos del encargo,
push a `main` (que dispara el despliegue automático de Hostinger) y verificación de que lo
publicado es lo que se acaba de cambiar. Un arreglo sin push no existe: deja producción rota.

No cubre publicar desde la app de TrickVault (`apps/trickvault/publicar.php`, lo usa Antonio:
ver `tools/memoria/recetas.md`), ni resolver merges conflictivos con trabajo ajeno.

## Reglas que no se negocian

1. **Siempre `main`** en `E:\ANTIGRAVITY`. Nada de ramas, worktrees ni copias de trabajo.
2. **Commit por ruta explícita.** Prohibido `git commit -a`, `git commit -am`, `git add .` y
   `git add -A`: escenifican todo el repo y publican trabajo ajeno o a medias.
3. **El push es obligatorio.** Hostinger despliega al recibir el push en `main`; sin push el
   cambio no está entregado, aunque el commit exista.
4. **No arrastres trabajo ajeno.** El índice (`.git/index`) es del repositorio, no de tu sesión:
   otro agente puede tener cosas preparadas. Commitea con *pathspec* y revisa lo que entra.
5. **Nada de secretos ni scripts de prueba.** El repo se despliega en la raíz pública de
   Hostinger: todo archivo versionado es accesible por web. Herramientas y pruebas van a
   `tools/` (denegado por `.htaccess`), nunca a la raíz ni a `apps/`.
6. **Nunca `--force`, nunca `git commit --amend` sobre un commit ya publicado**, nunca
   reescribas historia de `main`.
7. **Gate de calidad:** no se publica nada que no haya pasado `autocalidad-90`; si el encargo
   exigía verificación en navegador, esa verificación va antes del push.
8. **Producción se comprueba, no se supone:** si publicas una app/web, confirma que la URL real
   sirve la versión nueva (marcador, hash o tamaño) y no una caché.

## Flujo obligatorio

### Paso 0 — Pre-vuelo (contexto)

```powershell
git -C E:\ANTIGRAVITY rev-parse --abbrev-ref HEAD    # debe imprimir: main
git -C E:\ANTIGRAVITY fetch origin main              # refresca origin/main
git -C E:\ANTIGRAVITY status --porcelain             # qué hay tocado, propio y ajeno
git -C E:\ANTIGRAVITY diff --stat                    # magnitud de lo modificado
git -C E:\ANTIGRAVITY diff --cached --name-only      # qué tiene ya preparado el índice
```

- Si no estás en `main`, no sigas: vuelve a `main` sin perder trabajo (`git switch main`).
- Anota qué rutas del `status` **no** son tuyas. No las commitees, no las descartes, no las
  muevas: son de otra sesión.
- `git diff --cached --name-only` no vacío con archivos ajenos es la señal de índice compartido:
  el commit debe ir con pathspec (Paso 2), no con `git commit` a secas.

### Paso 1 — Cerrar el scope

Escribe la lista exacta de rutas del encargo. Si una ruta no aparece en `git status` ni en
`git diff`, no está tocada: no la inventes.

```powershell
$rutas = @('ruta/uno.ext', 'ruta/dos.ext')   # SOLO lo del encargo
```

Regla: un commit = una unidad lógica verificable. Si el encargo son varios archivos que se
explican juntos (skill + puntero + catálogo), van en el mismo commit; si son dos cambios
independientes, dos commits.

Antes de añadir configuración o datos, comprueba que no está ignorada ni lleva secretos:

```powershell
git -C E:\ANTIGRAVITY check-ignore -v <ruta>
git -C E:\ANTIGRAVITY diff -- <ruta>        # revisar línea a línea lo que se publica
```

### Paso 2 — Commit aislado

**Método preferido** (índice temporal propio, no toca el índice compartido). La política de
ejecución de este equipo bloquea llamar al `.ps1` directamente con `&`, así que se invoca como
proceso hijo con `-ExecutionPolicy Bypass`; el script separa las rutas por comas:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File E:\ANTIGRAVITY\tools\commit-aislado.ps1 `
  -Mensaje "docs(publicar-git): skill de commit aislado, push y verificacion de despliegue" `
  -Rutas skills/SKILL_GIT_PUBLICAR.md,.claude/skills/publicar-git/SKILL.md
```

El script, tras commitear, **refresca el índice real solo de esas rutas** para que `git status`
no muestre borrados/modificados fantasma; el resto de lo preparado por otras sesiones queda
intacto. Si usas la vía manual, `git add` + `commit` normales ya mantienen el índice al día.

**Método manual** (si el script no está disponible). Con rutas **nuevas** hay que prepararlas
primero; `git commit -- <ruta>` solo resuelve rutas que git ya conoce:

```powershell
git -C E:\ANTIGRAVITY add -- ruta/nueva.md otra/nueva.md
git -C E:\ANTIGRAVITY commit -m "docs(ambito): resumen" -- ruta/nueva.md ruta/otra.md
```

Si git pide identidad (no hay `user.name`/`user.email` configurados), pásala en el propio
commit con `-c`; los valores del equipo están en `tools/memoria/recetas.md`:

```powershell
git -C E:\ANTIGRAVITY -c user.name='<nombre>' -c user.email='<email>' `
  commit -m "docs(ambito): resumen" -- ruta/uno.ext
```

`tools/commit-aislado.ps1` hace `git commit` sin `-c`: si no hay identidad configurada, exporta
las variables en la misma sesión de PowerShell antes de llamarlo:

```powershell
$env:GIT_AUTHOR_NAME='<nombre>'; $env:GIT_AUTHOR_EMAIL='<email>'
$env:GIT_COMMITTER_NAME='<nombre>'; $env:GIT_COMMITTER_EMAIL='<email>'
```

### Paso 3 — Verificar el commit antes de subirlo

```powershell
git -C E:\ANTIGRAVITY show --name-only --pretty=format: HEAD   # SOLO las rutas del encargo
git -C E:\ANTIGRAVITY show --stat HEAD
git -C E:\ANTIGRAVITY status --porcelain -- ruta/uno.ext ruta/dos.ext   # vacío
```

- `show --name-only` con una ruta que no es del encargo = commit contaminado. No lo arregles
  con `--amend` si ya está publicado; si aún no lo está, deshazlo y repite con pathspec.
- Si el commit salió vacío, git avisa; normalmente es que la ruta era nueva y faltó `git add`.

### Paso 4 — Push a `main`

```powershell
git -C E:\ANTIGRAVITY push origin main
git -C E:\ANTIGRAVITY fetch origin main
git -C E:\ANTIGRAVITY log --oneline origin/main..HEAD    # vacío = todo subido
git -C E:\ANTIGRAVITY rev-parse HEAD
git -C E:\ANTIGRAVITY rev-parse origin/main              # debe coincidir con HEAD
```

Si el push se rechaza por non-fast-forward (`fetch first` o `rejected`):

```powershell
git -C E:\ANTIGRAVITY fetch origin main
git -C E:\ANTIGRAVITY log --oneline HEAD..origin/main    # qué hay en el remoto que no tienes
```

- Con el árbol limpio de cambios ajenos: `git -C E:\ANTIGRAVITY pull --rebase origin main` y
  repite el push.
- Si hay cambios ajenos sin commitear, **no** rebasees ni hagas stash global: puedes perder el
  trabajo de la otra sesión. Publica tu commit por separado y coordina; si no hay forma segura,
  declara BLOCKED. Nunca uses `--force` ni `--force-with-lease` sobre `main`.

### Paso 5 — Verificar el despliegue y lo servido

Hostinger despliega al recibir el push; tarda de decenas de segundos a minutos. Comprueba el
marcador real del cambio, no que el HTML responde 200:

```powershell
$cb = [guid]::NewGuid().ToString('N')          # parámetro aleatorio: evita la CDN
$r = Invoke-WebRequest "https://atnojs.es/<ruta>?cb=$cb" -UseBasicParsing -TimeoutSec 45
$r.StatusCode
$r.Content -match '<marcador del cambio>'
```

- Usa un parámetro **nuevo y distinto** en cada comprobación. Reutilizar el mismo o pedir la
  URL sin parámetro puede devolver la versión cacheada vieja (error ya cometido).
- Si la CDN sigue sirviendo lo antiguo, **renombra el asset con fecha** (`app.css` →
  `app.20261024.css`), actualiza la referencia, commit y push; no esperes a que expire.
- Apps del catálogo: `powershell -NoProfile -ExecutionPolicy Bypass -File E:\ANTIGRAVITY\tools\verificar-despliegue.ps1`
  comprueba en bucle el health de los proxies publicados (`-Solo <subcadena>` para acotar).
- Si el despliegue no llega tras varios minutos, re-dispara el webhook con un commit vacío:

```powershell
git -C E:\ANTIGRAVITY commit --allow-empty -m "chore: re-disparar despliegue (<motivo>)"
git -C E:\ANTIGRAVITY push origin main
```

- Si publicabas una app/web, la entrega incluye la prueba del flujo en Chrome sobre la URL
  real (`verificacion-playwright`).

### Paso 6 — Cierre

1. Añade la entrada en `tools/memoria/bitacora.md` (qué se publicó y con qué commit) y, si
   aporta algo replicable, en la memoria que corresponda (`recetas.md`, `errores.md`,
   `decisiones.md`).
2. Commitea y sube también esa entrada con el mismo procedimiento aislado (es otro commit).
3. Informa al usuario con: rutas publicadas, SHA del commit, `origin/main..HEAD` vacío y
   resultado de la comprobación en producción.

## Formato del mensaje de commit

```text
tipo(ámbito): resumen en imperativo y minúsculas
```

| Tipo | Cuándo |
|---|---|
| `feat` | funcionalidad nueva |
| `fix` | corrección de un fallo |
| `docs` | documentación, skills, memoria |
| `chore` | mantenimiento, datos regenerados, despliegue |
| `refactor` | reorganización sin cambio de comportamiento |
| `style` | estética o formato sin lógica |
| `perf` | rendimiento |
| `sync` | sincronización con producción u otra fuente |

Ejemplos reales del repositorio:

```text
chore(relatos): data.js regenerado por vigia (24/10 14:00) v=202610241400
fix(unified-image-studio): modulos versionados y subida de recursos sin perdidas
docs(unified-image-studio): ronda del verificador y correcciones
sync(nueva_pestana): estado sincronizado desde produccion
```

Sin punto final, sin mayúscula inicial en el resumen, un solo tema por commit.

## Errores conocidos y qué hacer

| Síntoma | Causa | Solución |
|---|---|---|
| `error: pathspec 'carpeta' did not match any file(s) known to git` | la ruta es nueva y no está en el índice | `git add -- carpeta` y después commit con pathspec |
| El commit incluye renames/archivos de otra sesión | `.git/index` es compartido; `git commit` sin pathspec commitea todo lo preparado | `git commit -m "..." -- <mis rutas>`; revisar antes `git diff --cached --name-only` |
| `git commit -am` publicó trabajo ajeno a medias | `-am` escenifica todo lo modificado | prohibido; commit por ruta explícita |
| Push rechazado por non-fast-forward | el remoto avanzó (otra sesión o la web) | `fetch`, revisar `HEAD..origin/main`, `pull --rebase` solo con árbol ajeno limpio; nunca `--force` |
| Hostinger no publica el último push | webhook perdido | `git commit --allow-empty -m "chore: re-disparar despliegue (...)"` + push |
| Producción sigue sirviendo lo viejo | CDN/caché con la URL ya pedida | comprobar con `?cb=<guid>` nuevo; si persiste, renombrar el asset con fecha |
| `fatal: unable to auto-detect email address` | identidad git sin configurar | `-c user.name=... -c user.email=...` o variables de entorno (ver `recetas.md`) |
| `commit-aislado` imprime `AVISO: no existe <ruta>` y no commitea | rutas mal pasadas al script (con `-File` van separadas por comas; no por espacios) | corregir la lista; el script normaliza comas y espacios alrededor, nada más |
| Tras un commit aislado `git status` muestra `D` + `??` de los archivos nuevos | el índice real no se refrescó (versión antigua del script o commit interrumpido) | `git add -- <rutas del commit>` y comprobar `git status --porcelain -- <rutas>` vacío |

## Prohibiciones

- `git commit -a`, `-am`, `git add .`, `git add -A`, `git push --force`.
- Crear ramas, worktrees o copias de trabajo.
- Versionar `.env`, `inicio.md`, claves API, scripts de prueba o herramientas fuera de `tools/`.
- Commitear archivos de otra sesión «porque ya estaban ahí».
- Dar por publicado sin `origin/main..HEAD` vacío y sin comprobar producción.
- Declarar éxito si no hay red, credenciales o despliegue: se declara BLOCKED con la causa.

## Checklist de salida

- [ ] Rama `main` y `origin/main` refrescado con `fetch`.
- [ ] Scope cerrado por escrito; trabajo ajeno identificado y respetado.
- [ ] Commit aislado y `git show --name-only HEAD` lista solo las rutas del encargo.
- [ ] Sin secretos ni scripts de prueba en lo publicado.
- [ ] `git push origin main` correcto.
- [ ] `git log --oneline origin/main..HEAD` vacío y `rev-parse HEAD` = `rev-parse origin/main`.
- [ ] Producción comprobada con marcador y caché evitada (si aplica).
- [ ] Bitácora actualizada y publicada.

## Referencias

- Fase de publicación del proyecto: `skills/SKILL_MAESTRA.md` (Fase 5).
- Comandos verificados en este equipo: `tools/memoria/recetas.md` (§ «Git: publicar»).
- Errores ya cometidos con el índice compartido y los pathspec: `tools/memoria/errores.md`.
- Herramientas: `tools/commit-aislado.ps1`, `tools/verificar-despliegue.ps1`,
  `tools/verificar-apps-produccion.ps1`.
- Reglas del proyecto: `claude.md` (§ «Reglas críticas del proyecto»).
