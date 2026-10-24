# Scorecard — Verificación independiente de la skill `publicar-git` y de la corrección de las instrucciones de publicación

**Proyecto:** `E:\ANTIGRAVITY` — skill canónica `skills/SKILL_GIT_PUBLICAR.md`, puntero `.claude/skills/publicar-git/SKILL.md` y cableado en `claude.md`, skills maestras y memoria.
**Verificador:** verificador independiente (subagente; no autor del cambio).
**Alcance:** ronda 1 sobre los commits `002e74c` (11 archivos) y `1143365` (3 archivos), con el estado del árbol a 2026-10-24 15:1x–15:2x (Atlantic/Canary).
**Archivo de control:** este scorecard es mi **único scope de escritura**. No edité la skill, el puntero, `claude.md`, las skills maestras, la memoria, el script ni git; no hice `add`/`commit`/`push`/`reset`/`stash`/`checkout`/`switch`; no cerré ninguna tarea.
**Estado global (ronda 1, histórica):** **REWORK — 92,0** (total exacto 92,08 truncado). A6 = 8,8 (< 9,0); 0 defectos bloqueantes/mayores/medios; **4 menores abiertas asequibles + 1 menor diferida**; el PASS no se cumple por A6 y por el límite de ≤ 3 menores sin mejoras asequibles pendientes.
**Versión evaluada:** `HEAD = 114336504075ca6dc17b266a371f47a5237e5098` + `002e74c`; skill `4D248062…99C2`, puntero `49632976…2EFD`, script `D0196BB6…1C49`, informe `F222F1B0…0CCE`. Cualquier cambio de bytes posterior invalida este scorecard.

> **Estado actual — ronda 2 (2026-10-24, 15:26–15:31):** **PASS 94,2** sobre el commit `37d1d8ff09e7c82816758d91d321c586462da0e7` (V-01…V-05 cerrados; regresión en verde; 0 defectos B/M/Med). La ronda 1 (§0–§16) se conserva como historial del **REWORK 92,0**. Evidencia, hashes, cierre de V-01…V-05 y nueva puntuación en **§17**.

---

## 0. Reglas de funcionamiento del verificador

1. **Fuente de verdad:** los archivos reales y los commits, no el informe del autor.
2. **Cobertura:** 100 % de las afirmaciones críticas del encargo y muestreo ≥ 50 % del resto; la muestra la elige el verificador.
3. **Evidencia:** cada nota y cada defecto se respalda con `ruta:línea`, comando + salida y/o SHA-256 reproducible.
4. **Independencia:** no soy autor de la skill ni de su cableado; no comparto scope de escritura; no edito el entregable.
5. **Umbral inviolable:** PASS solo con total truncado ≥ 90,0, ninguna nota < 7,0, A1–A6 ≥ 9,0, cero B/M/Med y ≤ 3 menores **sin mejoras asequibles pendientes**.
6. **Sin atajos:** prohibido redondear al alza, aprobar por cortesía, aceptar «lo revisé» sin salida real o supervisar el propio trabajo.
7. **Asequibilidad:** ≤ 15 min, sin dependencia externa, sin riesgo de regresión y con beneficio observable. Si queda una mejora así, es defecto y **no hay PASS**.

---

## 1. Versión evaluada y artefactos (estado final real)

`Get-FileHash <ruta> -Algorithm SHA256` y `(Get-Content <ruta>).Count`, 2026-10-24 15:1x–15:2x. La columna «§1» reproduce el hash declarado por el autor en `lead-skill-publicar-git.md:22-33` (minúsculas); el cálculo se muestra en mayúsculas porque así lo devuelve `Get-FileHash`.

| # | Artefacto | Líneas | Bytes | SHA-256 calculado | §1 | Coincide |
|---:|---|---:|---:|---|---|---|
| 1 | `skills/SKILL_GIT_PUBLICAR.md` (canónico, nuevo) | 255 | 13.159 | `4D248062D5E60031CAEB56174DC625CE4E27F167268F3A56982E0F20369599C2` | `4d2480…99c2` | **SÍ** |
| 2 | `.claude/skills/publicar-git/SKILL.md` (puntero, nuevo) | 35 | 2.635 | `49632976D009CFB59DB231E28BA23C7DD7E62082CF0A5861D5F5589E0B262EFD` | `496329…2efd` | **SÍ** |
| 3 | `skills/SKILL_CREAR.md` (corregido) | 198 | 10.360 | `56EA66B0124BE12D56326624E16903EEC1F48F01B61D47E60EFDD3EF7682526A` | `56ea66…526a` | **SÍ** |
| 4 | `skills/SKILL_MAESTRA.md` (Fase 5) | 1.016 | 63.258 | `D5CD8666EF7BDE55F14B0E669507C292263A5843F9704F2F589E332FA7D7FA65` | `d5cd86…fa65` | **SÍ** |
| 5 | `skills/SKILL_EDITAR_cirujano-codigo-produccion.md` (Paso 8) | 219 | 7.812 | `626B479AC697BA93603D5BC5DD2ACD3B50B93E8F88B80909DEBAC120A0B37F1E` | `626b47…7f1e` | **SÍ** |
| 6 | `skills/SKILL_AUTOCALIDAD_90.md` (fila Publicación/commit) | 147 | 12.734 | `EBEEAA4F896DBCE02CBF45BB72905C2B5A8CFED4A560932532309293F9DE6A8C` | `ebeeaa…a8c` | **SÍ** |
| 7 | `claude.md` (catálogo + regla crítica) | 128 | 9.716 | `CE2DF30C8C70B6BF1D1905195FFC6AEADF57D163BAD467D8F0C43BC54CFDCDDE` | `ce2df3…cdde` | **SÍ** |
| 8 | `tools/memoria/mapa.md` (índice + recuento 13→19) | 85 | 5.123 | `A68249646825B8FC9EE3FD48A28EF0F419B26F419C814E4E1A2A221C0A20905D` | `a68249…905d` | **SÍ** |
| 9 | `tools/memoria/recetas.md` (receta Git + skill) | 403 | 21.582 | `CA5E29127C7EDB55F358EFF754BF3A1F3D422D94EBCD0B8B11D5987DA3464486` | `ca5e29…4486` | **SÍ** |
| 10 | `tools/commit-aislado.ps1` (normaliza + refresca índice) | 60 | 2.832 | `D0196BB6BE3D6AA97A09C8DA699108DE2B53C467EE468CA7F882995C40271C49` | `d0196b…1c49` | **SÍ** |
| 11 | `tools/prompts/maestro-web-autocalidad/autoevaluaciones/lead-skill-publicar-git.md` (informe del autor) | 120 | 12.187 | `F222F1B0964E1E34B6DE2D5E32FFD9084112717C28A0B4E2A7EBBD29EF0D0CCE` | — | **no declarado** |

**Resultado:** 10/10 hashes declarados coinciden; líneas y bytes coinciden en los 10. El 11.º artefacto (el propio informe) no tiene hash en §1: es una **observación de trazabilidad** (O-03), no una discrepancia, porque un documento no puede auto-hashearse antes de escribirse. Su SHA real es `F222F1B0…0CCE` y está versionado en `1143365`.

**Codificación:** los cuatro archivos comprobados (skill, puntero, script, `claude.md`) son UTF-8 **sin BOM** y con saltos LF (`open(...,'rb')` → `b'---\n'` / `b'# Co'`). El puntero generado por PHP es byte-idéntico al oficial (§5).

---

## 2. Historial de rondas

| Ronda | Fecha | Commits | Artefactos | Veredicto | Total exacto → publicado | Defectos |
|---|---|---|---|---|---|---|
| Verificador 1 | 2026-10-24 | `002e74c` + `1143365` | 11 | **REWORK** | 92,08 → **92,0** | 0 B/M/Med; 4 menores abiertas asequibles (V-01…V-04) + 1 diferida (V-05) |

No hay rondas previas del verificador. El autor declara «iteración interna 4» en `lead-skill-publicar-git.md:5`; esas iteraciones no son verificaciones independientes y no se computan como rondas.

---

## 3. Alcance real de los commits y estado del árbol

```text
PS> git -C E:\ANTIGRAVITY log --oneline -3
1143365 fix(commit-aislado): rutas por comas, indice real refrescado y skill publicar-git
002e74c docs(publicar-git): commit aislado por rutas, push y verificacion de despliegue
9c87fdb chore(relatos): data.js regenerado por vigia (24/10 14:00) v=202610241400

PS> git show --name-only --pretty=format: HEAD
skills/SKILL_GIT_PUBLICAR.md
tools/commit-aislado.ps1
tools/prompts/maestro-web-autocalidad/autoevaluaciones/lead-skill-publicar-git.md

PS> git show --name-only --pretty=format: 002e74c
.claude/skills/publicar-git/SKILL.md
claude.md
skills/SKILL_AUTOCALIDAD_90.md
skills/SKILL_CREAR.md
skills/SKILL_EDITAR_cirujano-codigo-produccion.md
skills/SKILL_GIT_PUBLICAR.md
skills/SKILL_MAESTRA.md
tools/commit-aislado.ps1
tools/memoria/mapa.md
tools/memoria/recetas.md
tools/prompts/maestro-web-autocalidad/autoevaluaciones/lead-skill-publicar-git.md
```

**Conclusión:** los dos commits contienen **solo** rutas de los 11 artefactos. No aparece `apps/trickvault/index.html`, `agenda/`, `*.prod`, `tools/VoiceStudio/`, `tools/evidencias/…`, `mcp_flow_server.py` ni `apps/imagenes_ia/…` (trabajo ajeno legítimo). `git show --name-only 002e74c 1143365 | Select-String '(^|/)\.env$|inicio\.md'` → **sin coincidencias**. Tampoco hay `inicio.md` ni `.env` entre las rutas tocadas.

```text
PS> git -C E:\ANTIGRAVITY status --porcelain
 M apps/imagenes_ia/ajustes_imagen/index.html
 M apps/trickvault/index.html
?? agenda/
?? apps/imagenes_ia/ajustes_imagen/_antes_verificacion.html
?? apps/imagenes_ia/ajustes_imagen/ai-tools.20261024a.js
?? apps/imagenes_ia/ajustes_imagen/app.20261024a.css
?? apps_editar_generar_app.js.prod
?? apps_editar_imagen_history-manager.js.prod
?? mcp_flow_server.py
?? tools/VoiceStudio/
?? tools/evidencias/2026-10-21-agenda/
… (7 directorios de evidencias más)
?? tools/verificar_password_descargas.py

PS> git status --porcelain -- <las 11 rutas>
(sin salida)
```

**Conclusión:** las 11 rutas del encargo están **limpias** (ni modificadas ni sin seguimiento); el trabajo ajeno sigue presente e intacto. El árbol se movió durante la verificación por otra sesión (`apps/imagenes_ia/…`), lo que confirma que hay concurrencia real, pero **ninguna** de esas rutas entra en los commits ni en las 11.

**Publicación:** `git rev-parse HEAD` = `114336504075ca6dc17b266a371f47a5237e5098`; `git rev-parse origin/main` = `9c87fdb7bee544982db45f9b590ae335f43da243`; `git log --oneline origin/main..HEAD` = los 2 commits. **No está publicado**: el autor lo declara en `lead-skill-publicar-git.md:103-108` («el push es posterior al gate»). No lo computo como defecto del artefacto, pero el PASS no certifica producción (O-04).

---

## 4. Cobertura requisito → evidencia

| # | Requisito del encargo | Evidencia | Resultado |
|---:|---|---|---|
| 1 | Crear skill canónica de publicación | `skills/SKILL_GIT_PUBLICAR.md:1-255`; hash §1 | **CUMPLE** |
| 2 | Puntero oficial `.claude/skills/publicar-git/SKILL.md` | 35 líneas, front matter idéntico; `--check` OK (§5) | **CUMPLE** |
| 3 | Corregir `git add .` de `SKILL_CREAR.md` | `SKILL_CREAR.md:167-181`; versión anterior `git show 002e74c^:…` contenía `git add .` | **CUMPLE** |
| 4 | Corregir el gemelo `git add .` de `SKILL_EDITAR…` | `SKILL_EDITAR…:147-162`; versión anterior contenía `git add .` | **CUMPLE** |
| 5 | `SKILL_MAESTRA.md` Fase 5 remite a la skill | `SKILL_MAESTRA.md:506-513` (diff `002e74c`) | **CUMPLE** |
| 6 | `SKILL_AUTOCALIDAD_90.md` fila «Publicación/commit» remite | `SKILL_AUTOCALIDAD_90.md:103` | **CUMPLE** |
| 7 | `claude.md`: entrada en «Skills de detalle y apoyo» + regla crítica | `claude.md:98-100` y `:124` | **CUMPLE** |
| 8 | `mapa.md`: índice tarea→skill y recuento 13→19 | `mapa.md:12` (19) y `:59` (fila `publicar-git`); 19 directorios reales | **CUMPLE** |
| 9 | `recetas.md`: receta Git con pathspec, remisión y uso de `commit-aislado.ps1` | `recetas.md:67-90`; diff `002e74c` | **CUMPLE** |
| 10 | `commit-aislado.ps1`: normaliza `-Rutas` por comas y refresca el índice real solo de esas rutas | `commit-aislado.ps1:19-21` y `:46-54`; prueba §7 | **CUMPLE** |
| 11 | Autoevaluación A1–A10, total 93,8, residuales M1–M3 | `lead-skill-publicar-git.md:37-62`; cálculo recomputado = 938,6/10 = 93,86 → 93,8 | **CUMPLE en cálculo**; ver defectos de detalle V-02/V-03 |
| 12 | Gate `autocalidad-90` y verificación independiente | Este scorecard; el autor declara la autoevaluación | **CUMPLE** (con REWORK) |
| 13 | Publicación (commit + push a `main`) | Commits sí; push pendiente y declarado | **PARCIAL / diferido** |
| 14 | Memoria: entrada en `tools/memoria/bitacora.md` | No existe entrada de este cambio; el autor la difiere a la publicación (§5) | **PENDIENTE** (V-05) |
| 15 | Sin secretos ni archivos prohibidos | Barrido §8; sin `sk-`, `ghp_`, `AIza`, PEM, `Bearer`, `api_key=`; sin `.env`/`inicio.md` | **CUMPLE** |
| 16 | Solo `main`; sin ramas/worktrees; sin tocar trabajo ajeno | `git rev-parse --abbrev-ref HEAD` = `main`; commits solo rutas del encargo; status ajeno intacto | **CUMPLE** |
| 17 | Coherencia con `claude.md`, `SKILL_MAESTRA`, `SKILL_CREAR`, `recetas.md`, `errores.md` | §10 | **CUMPLE con 1 observación** (O-02) |
| 18 | Evidencia reproducible y trazable (A3/A9) | §1, §5–§8, §16; V-04 por la condición de estado del `--dry-run` | **CUMPLE parcialmente** |

---

## 5. Front matter, puntero y descubrimiento DSH

```text
PS> python -c "import yaml; ..."
skills/SKILL_GIT_PUBLICAR.md ['description','name'] name=publicar-git desc_len=312
.claude/skills/publicar-git/SKILL.md ['description','name'] name=publicar-git desc_len=312
front_matter_identico=True
yaml_version=6.0.3
```

El front matter es YAML válido, solo `name`/`description`, `name` coincide con el directorio del puntero y la descripción es idéntica en canónico y puntero (312 caracteres). Sin BOM.

```text
PS> php tools/generar-punteros-skills.php --check
OK         .claude/skills/analista-visual-pro/SKILL.md
…
OK         .claude/skills/publicar-git/SKILL.md
DESACTUALIZADO  .claude/skills/investigacion/SKILL.md
DESACTUALIZADO  .claude/skills/mejora-continua/SKILL.md
…
Punteros: 19 | regenerados: 0 | a revisar: 2
[EXIT=1]
```

`OK .claude/skills/publicar-git/SKILL.md` se imprime; el exit 1 lo provocan los **2 preexistentes** (`investigacion`, `mejora-continua`), que no aparecen en `git show --name-only` de `002e74c` ni de `1143365`. El puntero es byte-idéntico al que genera el script oficial (incluida la sección de modelos de imagen que el generador añade a todos los punteros; no es contenido manual).

```text
PS> $d=Get-Item E:\ANTIGRAVITY\.dsh\skills -Force; $d.LinkType; $d.Target
Junction
Global\E:\ANTIGRAVITY\skills
PS> Get-FileHash E:\ANTIGRAVITY\.dsh\skills\SKILL_GIT_PUBLICAR.md -Algorithm SHA256
4D248062D5E60031CAEB56174DC625CE4E27F167268F3A56982E0F20369599C2   (== canónico)
PS> (Get-ChildItem E:\ANTIGRAVITY\.claude\skills -Directory).Count
19
```

El junction apunta a `E:\ANTIGRAVITY\skills`; la skill existe en `.dsh/skills` con el **mismo SHA-256** que el canónico (sin copia divergente); hay 19 punteros reales, coherente con `mapa.md:12`. El catálogo DSH de esta sesión incluye `publicar-git` con la descripción del front matter → descubrimiento efectivo.

---

## 6. Comandos git documentados: sintaxis real

| Comprobación | Comando | Resultado |
|---|---|---|
| Orden correcto `-m … -- <ruta>` con ruta **modificada** | `git commit --dry-run -m "test" -- apps/trickvault/index.html` | **exit 0**; «Changes to be committed: modified: apps/trickvault/index.html»; sin error de parseo |
| Orden correcto con `-c` de identidad | `git -c user.name='verificador' -c user.email='verificador@example.invalid' commit --dry-run -m "test" -- apps/trickvault/index.html` | **exit 0**; idéntico |
| Control negativo (orden antiguo) | `git commit --dry-run -- tools/memoria/mapa.md -m "test"` | **falla**: `error: pathspec '-m' did not match any file(s) known to git` |
| Orden correcto con ruta **limpia** | `git commit --dry-run -m "test" -- tools/memoria/mapa.md` | **exit 1**: «no changes added to commit»; **no** es error de pathspec ni de parseo |

El orden `git commit -m "…" -- <rutas>` es correcto y está en la skill (`SKILL_GIT_PUBLICAR.md:95`, `:102-103`), en `SKILL_CREAR.md:176` y en `SKILL_EDITAR…:156`. El control negativo demuestra que el orden antiguo era el defecto. La única precisión es que el «exit 0» del informe se obtuvo cuando `mapa.md` estaba modificado; hoy, con la ruta limpia, el mismo comando sale 1 por «nada que commitear» (V-04).

---

## 7. `tools/commit-aislado.ps1`: lectura completa y prueba segura

Leído entero (60 líneas). Puntos verificados:

- **Normalización** (`:19-21`): `$Rutas | ForEach-Object { $_ -split ',' } | Trim | Where-Object { $_ -ne '' }`; funciona tanto con array como con la cadena `"a,b"` que entrega `-File`. Probado con dos rutas reales y sin cambios:

```text
PS> powershell -NoProfile -ExecutionPolicy Bypass -File E:\ANTIGRAVITY\tools\commit-aislado.ps1 `
      -Mensaje "test verificador (no debe commitear)" `
      -Rutas "tools/memoria/mapa.md,tools/memoria/recetas.md"
--- contenido que se va a commitear ---
…
git commit fallo (nada que commitear?)
[EXIT=1]
```

No se imprimió `AVISO: no existe …` → la cadena con comas se separó y ambas rutas existieron. HEAD antes = HEAD después = `114336504075ca6dc17b266a371f47a5237e5098`; `git status --porcelain -- tools/memoria/mapa.md tools/memoria/recetas.md` vacío. **No se creó commit ni se modificó el repo.**

- **Aislamiento del índice** (`:23-31`): `GIT_INDEX_FILE` propio + `git read-tree HEAD`; el commit sale de ahí, no del índice compartido.
- **Commit** (`:42-44`): `git commit -q -m $Mensaje`; si falla, `throw` antes de tocar el índice real (mi prueba lo confirma: no hubo `git add` sobre `.git/index`).
- **Refresco del índice real** (`:46-54`): tras el commit borra `GIT_INDEX_FILE` y ejecuta **solo** `git add -- @Rutas` (las rutas commiteadas). No hay `git add .`, `-A` ni `-u`; no puede escenificar rutas ajenas. Si ese `git add` falla, avisa y no oculta el problema.
- **Limpieza** (`:55-59`): `Pop-Location`, borra el índice temporal y su `.lock`, y el env var.

**Límites de la prueba:** no puedo ejecutar un commit real (el encargo lo prohíbe), así que el refresco del índice real se verifica por lectura + la evidencia del autor (`002e74c` dejó el índice desincronizado y `1143365` lo corrigió; el `git status` actual de las 11 rutas está vacío). No se probaron borrados, renombrados ni concurrencia de HEAD (O-06).

---

## 8. Grep de prácticas peligrosas y secretos

```text
PS> Get-ChildItem skills\*.md, .claude\skills\*\SKILL.md |
      Select-String -Pattern 'git add \.|git add -A|git commit -a|git commit -am'
skills\SKILL_CREAR.md:170: … Nunca `git add .`, `git add -A`,
skills\SKILL_CREAR.md:171: `git commit -a` ni `-am`: arrastran trabajo ajeno o a medias.
skills\SKILL_EDITAR_cirujano-codigo-produccion.md:150: … Nunca `git add .`, `git add -A`,
skills\SKILL_EDITAR_cirujano-codigo-produccion.md:151: `git commit -a` ni `-am`.
skills\SKILL_GIT_PUBLICAR.md:20: 2. **Commit por ruta explícita.** Prohibido `git commit -a`, `git commit -am`, `git add .` y
skills\SKILL_GIT_PUBLICAR.md:21: `git add -A`: escenifican todo el repo y publican trabajo ajeno o a medias.
skills\SKILL_GIT_PUBLICAR.md:220: | `git commit -am` publicó trabajo ajeno a medias | … | prohibido; commit por ruta explícita |
skills\SKILL_GIT_PUBLICAR.md:230: - `git commit -a`, `-am`, `git add .`, `git add -A`, `git push --force`.
```

**Todas** las coincidencias son **prohibitivas** (texto que prohíbe o explica el error), ninguna ordena la práctica. Barrido ampliado (`git reset --hard`, `git clean -`, `git stash`, `git push --force`, `git push -f`, `git add --all`, `git add -u`): solo `SKILL_GIT_PUBLICAR.md:230` (prohibición). Las versiones anteriores sí contenían el defecto:

```text
PS> git show 002e74c^:skills/SKILL_CREAR.md | Select-String 'git add|git commit'
- `git add .`
- `git commit -m "feat: creación de <nombre-app>"`
PS> git show 002e74c^:skills/SKILL_EDITAR_cirujano-codigo-produccion.md | Select-String 'git add|git commit'
- `git add .`
- `git commit -m "fix: descripción del cambio"`
PS> git show 002e74c^:tools/memoria/recetas.md | Select-String 'commit -m'
git -C E:\ANTIGRAVITY -c user.name='atnojs' … commit -m "tipo(ambito): resumen"
```

La corrección es real y elimina la instrucción peligrosa; el commit antiguo de la receta no llevaba pathspec y el nuevo sí (`recetas.md:79`).

**Secretos:** barrido de los 11 archivos y de `git show 002e74c --pretty=format: 1143365` con `sk-…`, `ghp_…`, `AIza…`, `BEGIN … PRIVATE KEY`, `api_key=…`, `Bearer …` → **sin coincidencias**. Las rutas tocadas no incluyen `.env` ni `inicio.md`.

---

## 9. Residuales declaradas por el autor (M1–M3)

| ID | Declarada | Verificación independiente | ¿Menor? | ¿Asequible? |
|---|---|---|---|---|
| **M1** | 2 punteros preexistentes `DESACTUALIZADO` (`investigacion`, `mejora-continua`) | `--check` los marca; ninguno de los 2 commits los toca. Ambos punteros contienen un **resumen manual** (investigación: entrada/salida/reglas/vídeos; mejora continua: bucle/biblioteca/comando) que el generador oficial no produce: regenerarlos lo borraría | **Sí** | **No** sin decidir si se conserva ese contenido; coste ~10 min + decisión |
| **M2** | No se leyó íntegro el protocolo de 189 KB; se aplicaron §0, §5–§6 y §7 | Es un artefacto documental, no una web/app; la rúbrica aplicable y el formato de scorecard quedaron cubiertos; no hay evidencia de que las secciones no leídas cambiaran el resultado | **Sí** | **No** con beneficio observable claro (~30 min/45k tokens para un cambio documental) |
| **M3** | Rutas raras (`pull --rebase`, commit vacío, renombrado CDN) documentadas desde incidentes y no re-ejecutadas | `SKILL_GIT_PUBLICAR.md:143-147`, `:163-172`; son operaciones destructivas o con efecto en producción; re-ejecutarlas crearía commits/pushes de prueba en `main` y despliegues reales | **Sí** | **No**: el riesgo supera el beneficio; la fuente está en `errores.md`/`bitacora.md` |

**Conclusión:** M1–M3 son realmente menores y su no-corrección está justificada. **No** son el problema del veredicto; el problema son las 4 mejoras asequibles **no declaradas** (V-01…V-04) y la entrada de bitácora diferida (V-05).

---

## 10. Coherencia interna

| Comprobación | Evidencia | Resultado |
|---|---|---|
| Rama `main`, sin ramas/worktrees | `git rev-parse --abbrev-ref HEAD` = `main`; `claude.md:125-126`; `SKILL_GIT_PUBLICAR.md:19` | **Coherente** |
| Nunca `--force` / `--amend` publicado | `SKILL_GIT_PUBLICAR.md:29-30`, `:147`, `:230` | **Coherente** |
| Commit por ruta explícita / pathspec | `SKILL_GIT_PUBLICAR.md:20-25`, `:90-104`; `SKILL_CREAR.md:169-177`; `SKILL_EDITAR…:149-157` | **Coherente** |
| Webhook de Hostinger y verificación en producción | `SKILL_GIT_PUBLICAR.md:22-23`, `:149-175`; `claude.md:124`; `SKILL_MAESTRA.md:508-513` | **Coherente** |
| Gate `autocalidad-90` antes de publicar | `SKILL_GIT_PUBLICAR.md:31-32`; `SKILL_AUTOCALIDAD_90.md:103`; `claude.md:108` | **Coherente** |
| Trabajo ajeno / índice compartido | `SKILL_GIT_PUBLICAR.md:24-25`, `:49-52`; `recetas.md:69-70`; `errores.md:117-126` | **Coherente** |
| `git add -A` histórico en `errores.md:110-111` | Texto: «no conviene un `git add -A` genérico»; solución `git add -A -- auth` (path-scoped). No arrastra el repo, pero conviene alinearlo con `git add -- auth` | **Observación O-02** |
| `SKILL_CREAR` vs `SKILL_EDITAR` | `SKILL_CREAR:175` dice «nuevas o modificadas»; `SKILL_EDITAR:155` dice «solo nuevas; las modificadas van sin add». Ambas son válidas (`git commit -- <ruta>` resuelve modificadas) | **Observación O-07**, sin contradicción material |

---

## 11. Defectos y observaciones (numerados por severidad)

**Cero defectos bloqueantes (B), mayores (M) o medios (Med).** Las 4 menores abiertas son asequibles; la 5.ª está diferida y debe entrar en el commit de cierre.

| ID | Severidad | Estado | Ubicación | Observado / esperado | Impacto y corrección exacta |
|---|---|---|---|---|---|
| **V-01** | **Menor** | **ABIERTO** | `skills/SKILL_GIT_PUBLICAR.md:94-95` | El método manual añade `ruta/nueva.md` y `otra/nueva.md`, pero commitea `ruta/nueva.md` y `ruta/otra.md`: la segunda ruta no existe / no se añadió. Un usuario que copie el bloque obtiene `pathspec 'ruta/otra.md' did not match` | Ejemplo no ejecutable tal cual. **Corregir** a `git add -- ruta/nueva.md otra/nueva.md` + `git commit … -- ruta/nueva.md otra/nueva.md` (o los paths reales que se quieran ilustrar); coste ~1 min |
| **V-02** | **Menor** | **ABIERTO** | `lead-skill-publicar-git.md:44` (A4) | Cita `claude.md:98,124` para «sin secretos»; `:98` es el encabezado `### publicar-git` y `:124` es la regla de commit+push. Las reglas de claves están en `claude.md:121-122` | Trazabilidad: la cita no sostiene la afirmación. **Corregir** a `claude.md:121-122` (secretos) y, si se quiere, `:124-126` (main/commit); coste ~1 min |
| **V-03** | **Menor** | **ABIERTO** | `lead-skill-publicar-git.md:46` (A6) | Dice «§4: 7 puntos»; §4 tiene **8** puntos numerados (1–8) | Inconsistencia numérica en la autoevaluación. **Corregir** a «8 puntos»; coste ~1 min |
| **V-04** | **Menor** | **ABIERTO** | `lead-skill-publicar-git.md:42` (A2) | Afirma que `git commit --dry-run -m "test" -- tools/memoria/mapa.md` dio **exit 0**. Hoy, con `mapa.md` ya commiteado y limpio, el mismo comando da **exit 1** («no changes added to commit»), sin error de parseo. El 0 solo se reproduce con una ruta modificada | Evidencia dependiente del estado del árbol; un tercero no la reproduce. **Corregir**: indicar que se ejecutó con la ruta modificada, o repetir con una ruta sucia (`apps/trickvault/index.html`) y anotar el estado; coste ~2 min |
| **V-05** | **Menor (diferida)** | **ABIERTO** | `tools/memoria/bitacora.md` | No hay entrada de este cambio (`Select-String 'publicar-git'` solo encuentra líneas 857/884 antiguas). El autor la declara requisito derivado en `lead-skill-publicar-git.md:17` y la da por hecha en A9 (`:49`), pero §5 la difiere a después del push | Trazabilidad del cierre. **Añadir** la entrada en el commit de cierre (qué, motivo, verificación, commits `002e74c`/`1143365` y SHA del push); coste ~5 min. No es defecto de los 11 artefactos, pero el PASS queda condicionado a que exista |
| **O-01** | Observación (no computa) | — | `C:\Users\atnojs\AppData\Local\Temp\dsh_index_f4cc6c35fdd54075930267f0d4cff560` | Índice temporal de 746.665 B, creado 15:11:39 y modificado 15:12:15 (ventana de la prueba del autor; `002e74c` es de 15:13:25). Mi ejecución creó y borró el suyo; el `finally` usa `Remove-Item … -ErrorAction SilentlyContinue` | Residuo fuera del repo; no atribuible con certeza (pudo quedar por un cierre/interrupción). Recomendación: borrarlo y, si se quiere robustez, reintentar la limpieza. **No** afecta a los 11 artefactos ni al árbol |
| **O-02** | Observación de coherencia | — | `tools/memoria/errores.md:110-111` | «no conviene un `git add -A` genérico» + solución `git add -A -- auth` (path-scoped). No arrastra el repo, pero la skill prohíbe `git add -A` en absoluto | Recomendación: `git add -- auth` (equivalente moderno) o una nota de que es histórico y path-scoped. No es contradicción material |
| **O-03** | Observación de trazabilidad | — | `lead-skill-publicar-git.md:22-33` | La tabla §1 lista 10 artefactos; el 11.º (el propio informe) no tiene hash. Su SHA real es `F222F1B0…0CCE` y está en `1143365` | Un documento no puede auto-hashearse; no es discrepancia. El verificador lo calculó y lo fija aquí |
| **O-04** | Limitación declarada | — | `lead-skill-publicar-git.md:103-108` | `HEAD = 1143365`, `origin/main = 9c87fdb`, 2 commits sin publicar; push y despliegue no verificados | El gate es pre-push; el PASS (si se alcanza tras el rework) no certifica producción. El autor debe pushear y anotar el SHA |
| **O-05** | Limitación de la verificación | — | — | No se ejecutó un commit real de prueba (el encargo lo prohíbe); el refresco del índice real se validó por lectura + evidencia del autor + estado limpio actual | No se prueba el camino feliz completo del script; sí la normalización, el fallo limpio y la ausencia de commit |
| **O-06** | Observación de robustez | — | `tools/commit-aislado.ps1:34` | `Test-Path` omite rutas **borradas** (una baja no se puede commitear con el método preferido); tampoco hay guarda contra un movimiento de HEAD concurrente entre `read-tree` y `commit` | Preexistente/teórico, fuera del alcance de este cambio; conviene documentarlo o endurecerlo en otra tarea |
| **O-07** | Observación menor | — | `SKILL_CREAR.md:175` vs `SKILL_EDITAR…:155` | «nuevas o modificadas» vs «solo nuevas; las modificadas van sin add» | Ambas válidas; no hay contradicción. Unificar redacción si se quiere pulir |

---

## 12. Rúbrica A1–A10 (ronda 1, con evidencia)

| ID | Criterio | Peso | Crítico | Nota | Evidencia |
|---|---|---:|---|---:|---|
| A1 | Cobertura del contrato | 18 | Sí | **9,3** | §4: 11 artefactos + skill completa; `git add .` eliminado de `SKILL_CREAR` y `SKILL_EDITAR`; puntero, catálogo, mapa y recetas cableados. Restan push/publicación (diferido), bitácora (V-05) y el hash del 11.º (O-03) |
| A2 | Corrección funcional y técnica | 15 | Sí | **9,2** | §5–§8: YAML, `--check`, junction, `--dry-run` (orden correcto y control negativo), script con comas y fallo limpio. V-01 (ejemplo con paths incoherentes) y V-04 (exit 0 dependiente del estado) bajan la nota |
| A3 | Verificación real y evidencia reproducible | 13 | Sí | **9,2** | §1, §3, §5–§8: hashes 10/10, commits solo rutas, status limpio, YAML, puntero, junction, script. V-02/V-04: dos citas/salidas no reproducibles tal cual |
| A4 | Reglas del encargo y del proyecto | 10 | Sí | **9,5** | Español; `main`; sin ramas/worktrees; sin secretos; solo `tools/`; no se reescriben archivos; trabajo ajeno intacto; no se tocó `bitacora` ni memoria |
| A5 | Autoevaluación honesta y calibrada | 12 | Sí | **9,1** | Declara push no verificado (§5), M1–M3 (§3) y 8 defectos corregidos (§4); pero A4 cita mal, A6 cuenta 7 en vez de 8 y A10 afirma «sin restos» con un índice temporal fuera del repo. Sin notas infladas graves; la honestidad es alta |
| A6 | Mejora residual agotada | 10 | Sí | **8,8** | **< 9,0.** M1–M3 justificadas, pero quedan 4 mejoras asequibles no declaradas (V-01…V-04: 1–2 min cada una) y la bitácora diferida (V-05). El autor afirma «sin mejoras asequibles pendientes» y no es exacto |
| A7 | Calidad para el usuario final | 8 | No | **9,4** | Procedimiento paso a paso, ejemplos reales, tabla de errores, prohibiciones y checklist; el bloque manual de V-01 es el único punto que un usuario copy-paste rompería |
| A8 | Robustez y seguridad | 6 | No | **9,3** | Sin `--force`; BLOCKED sin red/credenciales/despliegue; índice temporal; rechazo de push; caché/CDN; secretos. O-06 (borrados/concurrencia) es preexistente/teórico |
| A9 | Evidencias, documentación y trazabilidad | 5 | No | **9,0** | Hashes, comandos y rutas; enlaces en `claude.md`, `mapa.md`, `recetas.md`, `SKILL_CREAR`, `SKILL_MAESTRA`, `SKILL_AUTOCALIDAD`; pero V-02, V-05, O-03 y el residuo O-01 restan |
| A10 | Claridad, mantenibilidad y limpieza | 3 | No | **9,2** | Una fuente de verdad, puntero sin duplicar, sin BOM, sin temporales **en el repo**; V-01 y el residuo de `%TEMP%` impiden el 9,5 |

**Mínima nota:** A6 = 8,8 (< 9,0). **Críticas A1–A6:** 9,3 · 9,2 · 9,2 · 9,5 · 9,1 · **8,8** → **A6 no cumple**.

---

## 13. Cálculo del total (truncado, nunca redondeado al alza)

```text
A1  9,3 × 18 = 167,4
A2  9,2 × 15 = 138,0
A3  9,2 × 13 = 119,6
A4  9,5 × 10 =  95,0
A5  9,1 × 12 = 109,2
A6  8,8 × 10 =  88,0
A7  9,4 ×  8 =  75,2
A8  9,3 ×  6 =  55,8
A9  9,0 ×  5 =  45,0
A10 9,2 ×  3 =  27,6
              ------
Suma        = 920,8
Total       = 920,8 / 10 = 92,08 → publicado 92,0 (truncado a un decimal)
```

El total del autor (93,8) no es reproducible con la evidencia independiente: la diferencia (17,8 puntos de suma, 1,8 de total) procede de A6 (8,8 vs 9,0), A5 (9,1 vs 9,4), A9 (9,0 vs 9,5), A1 (9,3 vs 9,5), A2 (9,2 vs 9,4), A3 (9,2 vs 9,5), A7 (9,4 vs 9,3) y A8 (9,3 vs 9,2). El cálculo aritmético del autor es correcto; lo que no se sostiene es la afirmación de que no quedan mejoras asequibles.

---

## 14. Condiciones de PASS (ronda 1)

| Condición | Resultado |
|---|---|
| Total truncado ≥ 90,0 | **92,0 ✓** |
| Ninguna nota < 7,0 | **mínima 8,8 ✓** |
| Críticos A1–A6 ≥ 9,0 | 9,3 · 9,2 · 9,2 · 9,5 · 9,1 · **8,8 ✗** |
| Cero defectos B/M/Med | **0 B / 0 M / 0 Med ✓** |
| ≤ 3 menores declaradas y justificadas **sin mejoras asequibles pendientes** | **4 menores abiertas asequibles (V-01…V-04) + 1 diferida (V-05) ✗** |
| Evidencia reproducible del estado final | **Parcial**: V-04 (exit 0) y V-02 (citas) no se reproducen tal cual; el resto sí ✓/✗ |
| Informe completo | **Parcial**: falta bitácora (V-05) y el hash del 11.º (O-03); el resto está ✓/✗ |

**Resultado:** **REWORK**. No es un fallo de diseño ni de seguridad: los artefactos son sustancialmente correctos y el 92,0 supera el suelo. Falla el criterio crítico A6 por mejoras asequibles no agotadas y el límite de menores.

---

## 15. Veredicto y correcciones exactas para el autor

**REWORK — 92,0.** El autor debe corregir, en este orden, y volver a pedir verificación independiente:

1. **V-01** — `skills/SKILL_GIT_PUBLICAR.md:94-95`: alinear los paths del ejemplo manual. Propuesta:
   ```powershell
   git -C E:\ANTIGRAVITY add -- ruta/nueva.md otra/nueva.md
   git -C E:\ANTIGRAVITY commit -m "docs(ambito): resumen" -- ruta/nueva.md otra/nueva.md
   ```
   Validar el bloque con `git commit --dry-run` en un repo de prueba (no en `main` real).
2. **V-02** — `lead-skill-publicar-git.md:44`: cambiar `claude.md:98,124` por `claude.md:121-122` para «sin secretos»; si se quiere, citar `:124-126` para `main`/commit.
3. **V-03** — `lead-skill-publicar-git.md:46`: «§4: 7 puntos» → «§4: 8 puntos».
4. **V-04** — `lead-skill-publicar-git.md:42`: precisar que el `--dry-run` con exit 0 se ejecutó con `mapa.md` **modificado**, o repetir la evidencia con una ruta sucia y anotar el estado; aclarar que con ruta limpia git sale 1 por «nada que commitear», no por parseo/pathspec.
5. **V-05** — añadir la entrada de `tools/memoria/bitacora.md` en el commit de cierre, con qué, motivo, verificación y commits `002e74c`/`1143365`; o retirar la afirmación de A9 de que la bitácora ya está «en la publicación» hasta que exista.
6. **O-01** — borrar el índice temporal `C:\Users\atnojs\AppData\Local\Temp\dsh_index_f4cc6c35fdd54075930267f0d4cff560` y, si se quiere, endurecer la limpieza del script (reintento/`-Force` con comprobación). No es un artefacto del repo.
7. **O-02** — opcional pero recomendable: `tools/memoria/errores.md:111` `git add -A -- auth` → `git add -- auth`, para que la memoria no contradiga la prohibición absoluta de la skill.
8. **Re-verificación:** tras los cambios, recalcular los SHA-256 de los 11 artefactos (cambiarán la skill y el informe), repetir `php tools/generar-punteros-skills.php --check`, el YAML, el `--dry-run`, la prueba segura del script y el `git status --porcelain -- <rutas>`; actualizar §1/§2 del informe y solicitar una nueva ronda. **No** hacer push hasta el PASS; después, push a `main`, comprobar `origin/main..HEAD` vacío y anotar el SHA en la bitácora.

**Versión evaluada (ligadura):** commits `002e74c` + `1143365`; `skills/SKILL_GIT_PUBLICAR.md` SHA-256 `4D248062D5E60031CAEB56174DC625CE4E27F167268F3A56982E0F20369599C2`; `.claude/skills/publicar-git/SKILL.md` `49632976D009CFB59DB231E28BA23C7DD7E62082CF0A5861D5F5589E0B262EFD`; `tools/commit-aislado.ps1` `D0196BB6BE3D6AA97A09C8DA699108DE2B53C467EE468CA7F882995C40271C49`; informe `F222F1B0964E1E34B6DE2D5E32FFD9084112717C28A0B4E2A7EBBD29EF0D0CCE`. **Cualquier cambio de bytes posterior invalida este scorecard** y exige nueva verificación.

**Firma del verificador:** verificador independiente — 2026-10-24. No soy autor de la skill ni de su cableado; no edité nada fuera de este scorecard; no hice commit/push; no cerré tareas.

---

## 16. Registro de evidencias ejecutadas (reproducible)

| Comprobación | Comando / método | Resultado |
|---|---|---|
| Commits y alcance | `git log --oneline -3`; `git show --name-only --pretty=format: HEAD`; `git show --name-only --pretty=format: 002e74c` | HEAD: 3 rutas; `002e74c`: 11 rutas; todas del encargo; sin ajenas |
| Estado | `git status --porcelain`; `git status --porcelain -- <11 rutas>` | Ajenos sucios; 11 rutas limpias |
| Publicación | `git rev-parse HEAD`; `git rev-parse origin/main`; `git log --oneline origin/main..HEAD` | `1143365` vs `9c87fdb`; 2 commits pendientes (declarado) |
| Hashes | `Get-FileHash -Algorithm SHA256` × 11; `(Get-Content).Count`; `(Get-Item).Length` | §1: 10/10 coinciden; 11.º sin declarar |
| YAML | `python -c` + PyYAML 6.0.3 | Válido; `name`/`description`; idénticos; 312 chars |
| Puntero | `php tools/generar-punteros-skills.php --check` | `OK .claude/skills/publicar-git/SKILL.md`; 2 `DESACTUALIZADO` preexistentes; exit 1 por ellos |
| Descubrimiento | `Get-Item .dsh\skills -Force`; `Get-FileHash .dsh\skills\SKILL_GIT_PUBLICAR.md`; catálogo DSH | Junction → `E:\ANTIGRAVITY\skills`; hash idéntico; `publicar-git` en el catálogo |
| Git sintaxis | `git commit --dry-run -m "test" -- apps/trickvault/index.html`; `-c user.name/user.email`; control negativo `-- tools/memoria/mapa.md -m "test"` | exit 0 con ruta sucia; exit 0 con `-c`; el orden antiguo falla con `pathspec '-m'` |
| Script | `powershell -NoProfile -ExecutionPolicy Bypass -File … -Rutas "mapa.md,recetas.md"`; `git rev-parse HEAD` antes/después; `git status --porcelain -- rutas` | Sin `AVISO`; fallo limpio «nada que commitear»; HEAD sin cambios; rutas limpias |
| `&` directo | `& E:\ANTIGRAVITY\tools\commit-aislado.ps1 …` | Bloqueado: «no está firmado digitalmente» (confirma la nota de la skill) |
| Herramientas citadas | `Test-Path` de `verificar-despliegue.ps1`, `verificar-apps-produccion.ps1`, `publicar.php`, `link-dsh-skills.ps1`, `generar-punteros-skills.php` | Todos `True` |
| Grep peligroso | `Get-ChildItem skills\*.md, .claude\skills\*\SKILL.md \| Select-String …` | Solo menciones prohibitivas |
| Grep ampliado | `reset --hard`, `clean -`, `stash`, `push --force`, `push -f`, `add --all`, `add -u` | Solo la prohibición de `SKILL_GIT_PUBLICAR.md:230` |
| Secretos | `Select-String` de patrones × 11 archivos y `git show 002e74c … 1143365` | Sin coincidencias; sin `.env`/`inicio.md` |
| Antiguos defectos | `git show 002e74c^:skills/SKILL_CREAR.md`; `…SKILL_EDITAR…`; `…recetas.md` | `git add .` y commit sin pathspec en las versiones previas; corregidos |
| Residuales | Lectura de los 2 punteros; `--check`; `errores.md:104-115`; `SKILL_GIT_PUBLICAR.md:143-172` | M1–M3 menores y justificadas |
| Coherencia | Lectura de `claude.md:95-126`, `SKILL_MAESTRA.md:506-513`, `SKILL_CREAR.md:167-181`, `SKILL_EDITAR…:147-162`, `recetas.md:67-90`, `errores.md:104-126` | Coherente; O-02/O-07 |
| Codificación | `open(...,'rb').read(6)` en 4 archivos | UTF-8 sin BOM; LF |
| Entorno | `php -v`; `python --version` | PHP 8.3.30; Python 3.11.15; PyYAML 6.0.3 |

**Limitaciones de esta verificación:** no se ejecutó push ni despliegue (el encargo lo prohíbe y el autor lo declara); no se creó un commit de prueba (el encargo lo prohíbe), por lo que el camino feliz del refresco del índice real se acredita por lectura + evidencia del autor + estado limpio; no se probaron borrados, renombrados ni concurrencia de HEAD (O-06); no se re-ejecutaron las rutas destructivas de M3; el protocolo completo de 189 KB no se releyó (M2). El árbol se movió por otra sesión durante la verificación (aparición de `apps/imagenes_ia/…`), sin afectar a las 11 rutas ni a los commits.

---

## 17. Ronda 2 — cierre de V-01…V-05 y veredicto final (2026-10-24)

**Verificador:** el mismo verificador independiente (subagente; no autor del cambio). **Fecha de la verificación:** 2026-10-24, 15:26–15:31 (Atlantic/Canary). **Commit evaluado:** `37d1d8ff09e7c82816758d91d321c586462da0e7`, padre `1143365`. **Estado:** **PASS — 94,2** (suma 942,6; total exacto 94,26, truncado a un decimal).

### 17.1. HEAD real: `37d1d8f` evaluado, `6cf4e2d` ajeno encima

El encargo esperaba `HEAD = 37d1d8f`. Mi primera lectura de git (15:27) ya encontró `6cf4e2d`, un commit de **otra sesión** creado a las 15:26:43, diez segundos después de empezar mi turno (15:26:33). **No lo he creado ni movido**: `git rev-parse HEAD` dio `6cf4e2d` antes y después de todas mis pruebas.

| Comprobación | Resultado |
|---|---|
| `git rev-parse HEAD` (inicio y fin) | `6cf4e2d13b6d84b6361953980363893f495a630e` |
| `git show -s --format='%ci %s' 6cf4e2d` | `2026-10-24 15:26:43 +0100 feat(ajustes-imagen): selector de modelos en filas y botones de tono frio/calido` |
| `git show --name-only 6cf4e2d` | 3 rutas ajenas: `apps/imagenes_ia/ajustes_imagen/ai-tools.20261024a.js`, `app.20261024a.css`, `index.html` |
| `git show --name-only 37d1d8f` | **solo** las 3 rutas del encargo: `skills/SKILL_GIT_PUBLICAR.md`, `tools/memoria/bitacora.md`, `tools/prompts/maestro-web-autocalidad/autoevaluaciones/lead-skill-publicar-git.md` |
| `git rev-parse 37d1d8f^` / `6cf4e2d^` | `1143365…` / `37d1d8f…` (cadena intacta) |
| `git log --oneline 9c87fdb..37d1d8f` | `37d1d8f`, `1143365`, `002e74c` |
| `git diff --stat 37d1d8f -- <3 rutas del commit>` | **vacío** (árbol idéntico al commit) |
| `git diff --stat 37d1d8f -- <11 rutas + bitácora>` | **vacío** |
| `git branch --show-current` / `git worktree list` | `main` / solo `E:/ANTIGRAVITY 6cf4e2d [main]` |
| `git status --porcelain -- <11 rutas + bitácora>` | **vacío** |

**Conclusión:** la versión evaluada es `37d1d8f` y su contenido es exactamente el que dejó el autor; `6cf4e2d` no toca ninguno de los 11 artefactos ni la bitácora. **No es defecto del cambio**: es concurrencia real (O-10). Sí es una limitación de la ligadura «HEAD»: este PASS se liga a `37d1d8f`, no a `6cf4e2d`. Para el cierre, `origin/main..HEAD` tiene ahora **4 commits** (los 3 del encargo + el ajeno); el autor debe confirmar que `6cf4e2d` debe subirse o coordinarlo, sin reescribir nada.

### 17.2. Hashes del estado final (recalculados)

`Get-FileHash -Algorithm SHA256`, `(Get-Content).Count` y `(Get-Item).Length`, 2026-10-24 15:27–15:28.

| # | Artefacto | Líneas | Bytes | SHA-256 calculado | Esperado / §1 | Coincide |
|---:|---|---:|---:|---|---|---|
| 1 | `skills/SKILL_GIT_PUBLICAR.md` | 255 | 13.160 | `2DB294A001F52493A8DE18469732C9F1106B927B89CC9E855E8F118C7423A30A` | `2db294a0…a30a` | **SÍ** |
| 2 | `.claude/skills/publicar-git/SKILL.md` | 35 | 2.635 | `49632976D009CFB59DB231E28BA23C7DD7E62082CF0A5861D5F5589E0B262EFD` | `49632976…2efd` | **SÍ** |
| 3 | `skills/SKILL_CREAR.md` | 198 | 10.360 | `56EA66B0124BE12D56326624E16903EEC1F48F01B61D47E60EFDD3EF7682526A` | `56ea66b0…526a` | **SÍ** |
| 4 | `skills/SKILL_MAESTRA.md` | 1.016 | 63.258 | `D5CD8666EF7BDE55F14B0E669507C292263A5843F9704F2F589E332FA7D7FA65` | `d5cd8666…fa65` | **SÍ** |
| 5 | `skills/SKILL_EDITAR_cirujano-codigo-produccion.md` | 219 | 7.812 | `626B479AC697BA93603D5BC5DD2ACD3B50B93E8F88B80909DEBAC120A0B37F1E` | `626b479a…7f1e` | **SÍ** |
| 6 | `skills/SKILL_AUTOCALIDAD_90.md` | 147 | 12.734 | `EBEEAA4F896DBCE02CBF45BB72905C2B5A8CFED4A560932532309293F9DE6A8C` | `ebeeaa4f…a8c` | **SÍ** |
| 7 | `claude.md` | 128 | 9.716 | `CE2DF30C8C70B6BF1D1905195FFC6AEADF57D163BAD467D8F0C43BC54CFDCDDE` | `ce2df30c…cdde` | **SÍ** |
| 8 | `tools/memoria/mapa.md` | 85 | 5.123 | `A68249646825B8FC9EE3FD48A28EF0F419B26F419C814E4E1A2A221C0A20905D` | `a6824964…905d` | **SÍ** |
| 9 | `tools/memoria/recetas.md` | 403 | 21.582 | `CA5E29127C7EDB55F358EFF754BF3A1F3D422D94EBCD0B8B11D5987DA3464486` | `ca5e2912…4486` | **SÍ** |
| 10 | `tools/commit-aislado.ps1` | 60 | 2.832 | `D0196BB6BE3D6AA97A09C8DA699108DE2B53C467EE468CA7F882995C40271C49` | `d0196bb6…1c49` | **SÍ** |
| — | `tools/prompts/…/lead-skill-publicar-git.md` (informe) | 132 | 13.559 | `1EF2D4CC862DE1A2FD9EF55494B255B621C5651D6740CE737FDDA8755BA3306C` | no declarado (O-03) | — |
| — | `tools/memoria/bitacora.md` (evidencia) | 1.699 | 118.220 | `B5E1E7393CE9192F5564F839AD81E9228A4E0549667BE52734F0524800D381D6` | no congelado (se amplía al cerrar) | — |

**Resultado:** **10/10** artefactos de §1 coinciden en hash, líneas y bytes con lo declarado y con lo que validó la ronda 1 (los 9 ajenos a la skill siguen idénticos). La skill pasó de 13.159 a **13.160 B** y de `4D248062…99C2` a `2DB294A0…A30A` por el arreglo V-01; el informe pasó a 132 líneas / 13.559 B / `1EF2D4CC…306C` por V-02…V-05. La bitácora es documento vivo: su hash cambiará al añadir la línea del push, como marca el Paso 6.

### 17.3. Cierre de V-01…V-05 (uno a uno)

| ID | Esperado | Observado en el estado final | Evidencia reproducible | Estado |
|---|---|---|---|---|
| **V-01** | Ejemplo manual con rutas alineadas | `skills/SKILL_GIT_PUBLICAR.md:94-95`: `git add -- ruta/nueva.md otra/nueva.md` y `git commit -m "docs(ambito): resumen" -- ruta/nueva.md otra/nueva.md`. En `skills/SKILL_GIT_PUBLICAR.md`, el diff `37d1d8f^..37d1d8f` cambia **solo** `ruta/otra.md` → `otra/nueva.md` | Repo temporal fuera de `E:\ANTIGRAVITY`: `git add -- ruta/nueva.md otra/nueva.md` → **exit 0**; `git commit --dry-run -m "docs(ambito): resumen" -- ruta/nueva.md otra/nueva.md` → **exit 0**; ambos aparecen como `new file`; temporal borrado | **CERRADO** |
| **V-02** | A4 cita las líneas reales de claves y de commit/main/raíz pública | `lead-skill-publicar-git.md:46` (A4) cita `claude.md:121-122` (claves API) y `:124-127` (commit+push, `main`, ramas, raíz pública). Verificadas las líneas 121-122 y 124-127 en `claude.md` | `claude.md:121-122` = «No insertes claves API reales…» / «Si detectas una clave expuesta…»; `:124` = commit+push con `publicar-git`; `:125-126` = `main`/sin ramas; `:127` = raíz pública | **CERRADO** |
| **V-03** | A6 sin el recuento falso «§4: 7 puntos» | `lead-skill-publicar-git.md:48` (A6): «Corregidas en iteración todas las mejoras asequibles detectadas (§4); residuales: 3 menores declaradas en §3…». No hay recuento en A6 | `Select-String '7 puntos'` solo encuentra la **explicación histórica** de V-03 en §4.9 (`:100`), no la nota A6; §4 tiene 9 puntos y ya no se usa como recuento | **CERRADO** |
| **V-04** | A2 documenta el `--dry-run` con su estado real y el control negativo | `lead-skill-publicar-git.md:44` (A2): ruta sucia `apps/trickvault/index.html` → exit 0; control negativo `-- tools/memoria/mapa.md -m "test"` → `error: pathspec '-m'`; con ruta limpia el mismo comando sale 1 por «nada que commitear», no por parseo/pathspec | Reproducido: ruta sucia → **exit 0** (también con `-c user.name/user.email`); control negativo → **exit 1** con `pathspec '-m'` (y `'test'`); ruta limpia → **exit 1** con `no changes added to commit`, sin pathspec | **CERRADO** |
| **V-05** | Entrada de bitácora veraz con creación, integración, herramienta, ronda 1 y commits `002e74c`/`1143365`, y push anotado al cerrar | `tools/memoria/bitacora.md:8-38`, entrada `## 2026-10-24 — Skill publicar-git…`; incluye qué se creó, motivo, integración, herramienta corregida, **REWORK 92,0 (A6 8,8)** con V-01…V-04, commits `002e74c`/`1143365` y «el push a `main` y su comprobación… se anotan al cerrar la tarea» (Paso 6 de la skill) | `git log --oneline -2 -- tools/memoria/bitacora.md` → `37d1d8f` es el último; `002e74c` = 11 archivos (skill y cableado); `1143365` = 3 archivos (script, skill, informe); mapa antiguo `13 punteros` → actual `19`; versiones antiguas de `SKILL_CREAR`/`SKILL_EDITAR` contenían `git add .`; `1143365` añade el refresco del índice real al script | **CERRADO** |

**Resultado:** **V-01…V-05 cerrados**. No queda ninguno de los 5 defectos de la ronda 1 abierto ni parcialmente corregido.

### 17.4. Regresión completa (estado final)

| Comprobación | Comando / método | Resultado |
|---|---|---|
| Punteros | `php tools/generar-punteros-skills.php --check` | `OK .claude/skills/publicar-git/SKILL.md`; 2 `DESACTUALIZADO` preexistentes (`investigacion`, `mejora-continua`), no tocados por los commits; `Punteros: 19, regenerados: 0, a revisar: 2`; exit 1 por los 2 preexistentes |
| YAML | PyYAML 6.0.3 sobre skill y puntero | Válido; claves solo `description`,`name`; `name=publicar-git`; `desc_len=312`; `front_matter_identico=True`; sin BOM |
| Fences | `Select-String '^```'` en la skill | **28** (par); 14 bloques cerrados |
| Prácticas peligrosas | grep `git add .`, `git add -A`, `git commit -a`, `git commit -am` en `skills/*.md` y `.claude/skills/*/SKILL.md` | Solo menciones **prohibitivas**: `SKILL_CREAR.md:170-171`, `SKILL_EDITAR…:150-151`, `SKILL_GIT_PUBLICAR.md:20-21`, `:220`, `:230`. Ninguna ordena la práctica |
| Grep ampliado | `reset --hard`, `clean -`, `stash`, `push --force`, `push -f`, `add --all`, `add -u` | Solo `SKILL_GIT_PUBLICAR.md:230` (prohibición) |
| Secretos | 6 patrones (`sk-`, `ghp_`, `AIza`, PEM, `api_key=`, `Bearer`) sobre los diffs de `002e74c`, `1143365`, `37d1d8f` | **0** coincidencias |
| Rutas prohibidas | `git show --name-only` de los 3 commits + grep `.env`/`inicio.md` | Ningún `.env`, `.env.*` ni `inicio.md`; solo rutas del encargo |
| Junction DSH | `Get-Item .dsh\skills -Force` + hash | `LinkType=Junction`; `Target=Global\E:\ANTIGRAVITY\skills`; SHA-256 `.dsh/skills/SKILL_GIT_PUBLICAR.md` = `2DB294A0…A30A` = canónico |
| Script (prueba segura) | `powershell -NoProfile -ExecutionPolicy Bypass -File tools/commit-aislado.ps1 -Mensaje "test…" -Rutas "tools/memoria/mapa.md,tools/memoria/recetas.md"` | Normaliza la cadena con comas; **no** imprime `AVISO`; falla limpio con `git commit fallo (nada que commitear?)`; exit 1; HEAD `6cf4e2d` antes y después; `git status --porcelain -- esas rutas` vacío; no crea commit |
| Árbol | `git status --porcelain -- <11 rutas + bitácora>` | **vacío**; el resto del status es trabajo ajeno (`apps/trickvault/index.html`, `agenda/`, `*.prod`, `tools/VoiceStudio/`, `tools/evidencias/…`, `mcp_flow_server.py`, `tools/verificar_password_descargas.py`) + mi scorecard `??` |
| Índice | `git diff --cached --name-only` tras los `--dry-run` | **vacío** (los dry-run no escenificaron nada) |
| Commits | `git show --name-only` y `git show --stat` de `002e74c`, `1143365`, `37d1d8f` | `002e74c`: 11 archivos; `1143365`: 3; `37d1d8f`: 3 (solo rutas del encargo) |

### 17.5. Veracidad de la entrada de bitácora

| Afirmación de la entrada | Verificación independiente | ¿Cierta? |
|---|---|---|
| Se creó la skill canónica y el puntero con formato oficial | `skills/SKILL_GIT_PUBLICAR.md` 255 líneas; puntero 35 líneas; `--check` OK | **Sí** |
| La norma estaba repartida y dos skills ordenaban `git add .` | `002e74c^:SKILL_CREAR.md` y `…SKILL_EDITAR…` contenían `- git add .`; hoy solo queda la prohibición | **Sí** |
| `commit-aislado.ps1` no aceptaba la forma documentada | `1143365` añade el bloque de refresco; la normalización por comas está en el script actual (`:19-21`) y el comentario de uso (`:6-8`) | **Sí** |
| Integración en `claude.md`, `SKILL_MAESTRA` Fase 5, `SKILL_CREAR` Paso 6, `SKILL_EDITAR` Paso 8, `SKILL_AUTOCALIDAD_90`, `mapa.md` y `recetas.md` | Verificadas las remisiones: `claude.md:98-100`; `SKILL_MAESTRA.md:507-511`; `SKILL_CREAR.md:36` (tabla) y `:167-181` (Paso 6); `SKILL_EDITAR…:147-162`; `SKILL_AUTOCALIDAD_90.md:106`; `mapa.md:12` y `:59`; `recetas.md:72-79` | **Sí** |
| Recuento de punteros 13→19 | `002e74c^:mapa.md` decía `13 punteros`; el actual dice `19`; hay 19 directorios reales | **Sí** |
| Ronda 1 REWORK 92,0 (A6 8,8) con V-01…V-04 y bitácora pendiente | Coincide con §7 y §12 del scorecard de ronda 1 | **Sí** |
| Commits `002e74c` (skill y cableado) y `1143365` (correcciones del script y de la skill) | Ambos existen; `002e74c` toca 11 archivos; `1143365` toca script, skill e informe | **Sí** |
| El push y su comprobación se anotan al cerrar (Paso 6) | `SKILL_GIT_PUBLICAR.md:177-184` lo exige; el push no se ha hecho (declarado) | **Sí** |

### 17.6. Hallazgos nuevos y observaciones (no computan como defecto)

| ID | Tipo | Ubicación | Observación | Impacto |
|---|---|---|---|---|
| **O-08** | Observación de exactitud documental | `lead-skill-publicar-git.md:5` | Dice «Fecha: 2026-10-24 **15:4x**»; el archivo se escribió a las **15:25:57** (mtime) y el commit `37d1d8f` es de las **15:26:12**; la verificación se hizo 15:26–15:31. El día es correcto; el bloque de minutos no | No afecta a la versión evaluada (ligada por SHA/commit), al contenido ni a la reproducibilidad. No es defecto; si el autor toca el informe al cerrar, puede poner la hora real, pero cambiarlo ahora invalidaría su hash por un dato sin efecto funcional |
| **O-09** | Observación de precisión de cita | `lead-skill-publicar-git.md:50` (A8) | Cita `SKILL_GIT_PUBLICAR.md:130-227` para «secretos, `--force`, BLOCKED»; el rango cubre push/errores, pero secretos están en `:26-28` y `:232`, `--force` en `:29-30`, `:147` y `:230`, y BLOCKED en `:235` | La afirmación es **cierta** (la skill cubre las tres cosas); la cita es parcial. No es defecto material; precisión documental |
| **O-10** | Observación de concurrencia | HEAD del repo | `6cf4e2d` (otra sesión, 15:26:43) se añadió sobre `37d1d8f` con 3 archivos de `apps/imagenes_ia/…`; el árbol de los 11 artefactos + bitácora sigue idéntico a `37d1d8f` | No contamina los commits del encargo ni los artefactos; sí obliga a coordinar el push (4 commits en `origin/main..HEAD`) |
| **O-01** | Observación de limpieza | `%TEMP%\dsh_index_f4cc6c35fdd54075930267f0d4cff560` | Sigue el índice temporal de 746.665 B de la ronda 1 (15:12:15), fuera del repo; mi prueba del script no dejó uno nuevo | No es artefacto del repo ni afecta al gate; se puede borrar cuando no haya otra sesión usándolo |
| **O-03** | Observación de trazabilidad | `lead-skill-publicar-git.md:20-37` | El informe no incluye su propio SHA-256 (no puede auto-hashearse); su hash real es `1EF2D4CC…306C` | Ya estaba en ronda 1; no es discrepancia |

**No hay defectos bloqueantes, mayores ni medios nuevos.** O-08/O-09 son precisiones documentales; O-10 es concurrencia ajena; O-01 sigue fuera del repo.

### 17.7. Rúbrica A1–A10 (ronda 2, con evidencia)

| ID | Criterio | Peso | Crítico | Nota | Evidencia |
|---|---|---:|---|---:|---|
| A1 | Cobertura del contrato | 18 | Sí | **9,5** | Skill completa (255 líneas, pre-vuelo→cierre), `git add .` eliminado de `SKILL_CREAR` y `SKILL_EDITAR`, puntero, catálogo, mapa, recetas, script y **bitácora ya creada**; push pendiente declarado como cierre post-PASS (§17.10), no como recorte |
| A2 | Corrección funcional y técnica | 15 | Sí | **9,4** | §17.4: YAML, `--check`, junction, fences 28, grep, `--dry-run` (sucio 0, limpio 1 con «nada que commitear»), control negativo `pathspec '-m'`, script con comas y fallo limpio, ejemplo V-01 ejecutable. No se ejecutó un commit real (prohibido): camino feliz del script por lectura + evidencia de ronda 1 |
| A3 | Verificación real y evidencia reproducible | 13 | Sí | **9,4** | §17.2–§17.5: 10/10 hashes, 3 commits con alcance exacto, árbol idéntico a `37d1d8f`, YAML, puntero, junction, script, bitácora veraz. O-08 (hora del informe) es la única salida no reproducible al minuto; no afecta a la evidencia del artefacto |
| A4 | Reglas del encargo y del proyecto | 10 | Sí | **9,6** | Español; `main`; sin ramas/worktrees; sin secretos ni `.env`/`inicio.md`; solo `tools/`; trabajo ajeno intacto; V-02 corregido (citas reales de `claude.md:121-122` y `:124-127`) |
| A5 | Autoevaluación honesta y calibrada | 12 | Sí | **9,3** | Informe de 132 líneas con §1 de hashes, §3 residuales M1–M3, §4 cambios (incluida la ronda 1) y §5 límites; autoevaluación 93,8 vs 94,2 independiente (Δ 0,4). O-08 (hora) y O-09 (cita amplia) son deslices menores, sin inflar la nota |
| A6 | Mejora residual agotada | 10 | Sí | **9,3** | **V-01…V-05 cerrados**; M1–M3 siguen justificadas (punteros preexistentes con resumen manual, protocolo no releído, rutas destructivas no re-ejecutadas); O-02/O-06 son preexistentes y fuera de scope. No queda mejora asequible del artefacto sin decisión externa o riesgo |
| A7 | Calidad para el usuario final | 8 | No | **9,6** | Procedimiento paso a paso, ejemplos reales, tabla de errores, prohibiciones y checklist; el bloque manual de V-01 ya se puede copiar y ejecutar (probado en repo temporal) |
| A8 | Robustez y seguridad | 6 | No | **9,3** | Cubre rechazo de push, índice compartido, identidad, webhook, CDN, secretos, `--force`, BLOCKED; O-06 (borrados/concurrencia) es preexistente/teórico; O-09 es solo precisión de la cita |
| A9 | Evidencias, documentación y trazabilidad | 5 | No | **9,4** | Hashes, comandos y salidas; bitácora `2026-10-24` con commits y verificación; referencias en `claude.md`, `mapa.md`, `recetas.md`, `SKILL_CREAR`, `SKILL_MAESTRA`, `SKILL_AUTOCALIDAD`; scorecard enlazado. O-03 (auto-hash) y O-08 restan 0,1 |
| A10 | Claridad, mantenibilidad y limpieza | 3 | No | **9,4** | Una fuente de verdad, puntero sin duplicar, sin BOM, sin temporales **en el repo**; V-01 corregido. O-01 (índice temporal en `%TEMP%`, fuera del repo) impide el 9,5 |

**Mínima nota:** A5/A6 = 9,3 (≥ 9,0). **Críticas A1–A6:** 9,5 · 9,4 · 9,4 · 9,6 · 9,3 · 9,3 → **todas ≥ 9,0**.

### 17.8. Cálculo del total (truncado, nunca redondeado al alza)

```text
A1  9,5 × 18 = 171,0
A2  9,4 × 15 = 141,0
A3  9,4 × 13 = 122,2
A4  9,6 × 10 =  96,0
A5  9,3 × 12 = 111,6
A6  9,3 × 10 =  93,0
A7  9,6 ×  8 =  76,8
A8  9,3 ×  6 =  55,8
A9  9,4 ×  5 =  47,0
A10 9,4 ×  3 =  28,2
               ------
Suma        = 942,6
Total       = 942,6 / 10 = 94,26 → 94,2 (truncado a un decimal)
```

### 17.9. Condiciones de PASS (ronda 2)

| Condición | Resultado |
|---|---|
| Total truncado ≥ 90,0 | **94,2 ✓** |
| Ninguna nota < 7,0 | **mínima 9,3 ✓** |
| Críticos A1–A6 ≥ 9,0 | 9,5 · 9,4 · 9,4 · 9,6 · 9,3 · 9,3 **✓** |
| Cero defectos B/M/Med | **0 B / 0 M / 0 Med ✓** |
| ≤ 3 menores declaradas y justificadas **sin mejoras asequibles pendientes** | **M1–M3 (3)**, todas justificadas; V-01…V-05 cerrados; O-08/O-09 son observaciones documentales, no defectos ✓ |
| Evidencia reproducible del estado final | 10/10 hashes, 3 commits, árbol idéntico a `37d1d8f`, regresión completa ✓ |
| Informe y scorecard completos y ligados a la versión | Informe 132 líneas; scorecard §1–§17; ligadura a `37d1d8f` y hashes ✓ |

### 17.10. Veredicto y pasos de cierre

**PASS — 94,2.** El cambio corrige de forma verificable los 5 defectos de la ronda 1, mantiene la regresión en verde y no introduce defectos B/M/Med. Queda fuera del gate, por diseño, el push y el despliegue.

Pasos de cierre (posteriores a este PASS, no defectos):

1. **Push a `main`** con el procedimiento de `publicar-git`. `origin/main..HEAD` tiene ahora **4 commits**: `002e74c`, `1143365`, `37d1d8f` y `6cf4e2d` (ajeno). Confirmar que `6cf4e2d` debe publicarse o coordinarlo con la otra sesión; no reescribir historia.
2. Comprobar `git log --oneline origin/main..HEAD` **vacío** y `git rev-parse HEAD` = `git rev-parse origin/main`. Anotar el SHA del push.
3. Añadir a `tools/memoria/bitacora.md` la línea del push y su comprobación (Paso 6) y commitearla con el método aislado (nuevo commit; la bitácora cambiará de hash, es esperado).
4. El scorecard sigue **sin seguimiento** (`??`): es el documento de control del verificador; el autor puede commitearlo en el cierre documental.
5. **Cualquier cambio posterior invalida este scorecard** y exige nueva verificación. El push y el despliegue no son verificables antes del PASS; Hostinger no aplica a este cambio documental (no hay marcador web), así que la comprobación de producción se limita al push y a la coherencia del repo.

### 17.11. Registro de evidencias ejecutadas (ronda 2)

| Comprobación | Comando / método | Resultado |
|---|---|---|
| HEAD y cadena | `git rev-parse HEAD`; `git rev-parse 37d1d8f^`; `git rev-parse 6cf4e2d^`; `git log --oneline 9c87fdb..37d1d8f` | `6cf4e2d`; `1143365`; `37d1d8f`; 3 commits del encargo |
| Alcance | `git show --name-only 37d1d8f`; `git show --name-only 6cf4e2d` | 3 rutas del encargo; 3 rutas ajenas |
| Árbol | `git status --porcelain`; `git status --porcelain -- <11+bitácora>`; `git diff --stat 37d1d8f -- <3>` | Ajenos + scorecard; 11+bitácora vacío; diff vacío |
| Hashes | `Get-FileHash -Algorithm SHA256` × 12; `(Get-Content).Count`; `(Get-Item).Length` | §17.2: 10/10 coinciden |
| Punteros | `php tools/generar-punteros-skills.php --check` | `OK publicar-git`; 2 preexistentes; 19; exit 1 |
| YAML | PyYAML 6.0.3 | Válido; `name`/`description`; 312; idéntico |
| Fences | `Select-String '^```'` | 28 (par) |
| Grep | `Select-String` de prácticas peligrosas y ampliadas | Solo prohibiciones |
| Secretos | 6 patrones sobre diffs de los 3 commits | 0 |
| Junction | `Get-Item .dsh\skills -Force`; hash | Junction; hash idéntico |
| Script | Prueba segura con 2 rutas limpias | Falla limpio; HEAD sin cambios |
| Git sintaxis | 4 `--dry-run` (sucio, `-c`, control negativo, limpio) | 0 / 0 / 1 (`pathspec '-m'`) / 1 (`no changes added`) |
| V-01 | Repo temporal con `ruta/nueva.md` y `otra/nueva.md` | `add` 0; `commit --dry-run` 0; 2 `new file`; temporal borrado |
| Bitácora | Lectura `:8-38`; `git log -- bitacora`; mapa antiguo/actual; versiones antiguas | Entrada veraz; `37d1d8f` último |
| Entorno | `php -v`; `python --version`; `Get-Date` | PHP 8.3.30; Python 3.11.15; 2026-10-24 15:30 +01:00 |

### 17.12. Limitaciones de la ronda 2

- **Push y despliegue:** no ejecutados (el encargo los sitúa después del PASS). No son defecto; quedan como pasos de cierre §17.10.
- **Commit real del script:** no ejecutado (prohibido por el encargo); el camino feliz del refresco del índice real se acredita por lectura del código, la prueba de fallo limpio y la evidencia de `1143365`. No se probaron borrados, renombrados ni concurrencia de HEAD (O-06).
- **HEAD:** `6cf4e2d` (ajeno) se añadió durante la verificación; el PASS se liga a `37d1d8f` y el árbol de los 11 artefactos + bitácora coincide con él. No he creado ni movido HEAD.
- **O-08:** la hora del informe (15:4x) no coincide con su mtime (15:25:57); no afecta a la sustancia ni a la ligadura por SHA/commit.
- **M2:** el protocolo completo de 189 KB no se releyó íntegro; se aplicaron §0, §5–§6 y §7, como en la ronda 1.
- **M3:** las rutas destructivas (`pull --rebase` tras rechazo, commit vacío, renombrado por CDN) no se re-ejecutaron por su riesgo en `main`/producción.
- **Producción:** este cambio es documental; no hay app/web ni marcador que comprobar en `atnojs.es`. La comprobación de producción se limita a que el push llegue y `origin/main` = HEAD.

**Firma del verificador (ronda 2):** verificador independiente — 2026-10-24. No soy autor de la skill ni de su cableado; no edité nada fuera de este scorecard; no hice `add`/`commit`/`push`/`reset`/`stash`/`checkout`/`switch`; no moví HEAD; no cerré tareas.
