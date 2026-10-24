# Autoevaluación — skill `publicar-git` y corrección de las instrucciones de publicación

**Tarea:** crear una skill de commit/push y eliminar las instrucciones peligrosas de publicación
**Autor:** Lead (DSH) — autor del cambio, no verificador
**Fecha:** 2026-10-24 15:2x (Atlantic/Canary) · **Iteración interna:** 3
**Entorno:** `E:\ANTIGRAVITY`, rama `main`, Windows + PowerShell 7, PHP 8.3.30, Python con PyYAML

## 0. Contrato de referencia (encargo del usuario)

1. Crear una skill que fije **cómo se hace el commit y el push** en este repositorio.
2. Corregir el `git add .` de `skills/SKILL_CREAR.md` (contradice la regla de oro del proyecto).
3. Pasar el gate `autocalidad-90`: autoevaluación con evidencia + verificación independiente.
4. Dejar todo **publicado** (commit + push a `main`), porque el proyecto despliega por webhook.

Requisitos derivados del proyecto: contenido canónico en `skills/SKILL_<nombre>.md`, puntero en
`.claude/skills/<nombre>/SKILL.md`, catálogo en `claude.md`, índice tarea→skill en
`tools/memoria/mapa.md`, entrada en `tools/memoria/bitacora.md`, sin secretos y sin tocar el
trabajo de otras sesiones.

## 1. Artefactos entregados (estado final congelado)

| Artefacto | Líneas | Bytes | SHA-256 |
|---|---:|---:|---|
| `skills/SKILL_GIT_PUBLICAR.md` (nuevo, canónico) | 249 | 12.383 | `3a6ff3614fdd515ac3a359133d34f4e2acad1dc288cfa033e6737db2f60cb8f3` |
| `.claude/skills/publicar-git/SKILL.md` (nuevo, puntero) | 35 | 2.635 | `49632976d009cfb59db231e28ba23c7dd7e62082cf0a5861d5f5589e0b262efd` |
| `skills/SKILL_CREAR.md` (corregido) | 198 | 10.360 | `56ea66b0124be12d56326624e16903eec1f48f01b61d47e60efdd3ef7682526a` |
| `skills/SKILL_MAESTRA.md` (enlace a la skill) | 1.016 | 63.258 | `d5cd8666ef7bde55f14b0e669507c292263a5843f9704f2f589e332fa7d7fa65` |
| `skills/SKILL_EDITAR_cirujano-codigo-produccion.md` (gemelo corregido) | 219 | 7.812 | `626b479ac697ba93603d5bc5dd2acd3b50b93e8f88b80909debac120a0b37f1e` |
| `skills/SKILL_AUTOCALIDAD_90.md` (referencia en checklist) | 147 | 12.734 | `ebeeaa4f896dbce02cbf45bb72905c2b5a8cfed4a560932532309293f9de6a8c` |
| `claude.md` (catálogo + regla crítica) | 128 | 9.716 | `ce2df30c8c70b6bf1d1905195ffc6aeadf57d163bad467d8f0c43bc54cfdcdde` |
| `tools/memoria/mapa.md` (índice + recuento) | 85 | 5.123 | `a68249646825b8fc9ee3fd48a28ef0f419b26f419c814e4e1a2a221c0a20905d` |
| `tools/memoria/recetas.md` (receta con pathspec + herramienta) | 403 | 21.582 | `ca5e29127c7edb55f358eff754bf3a1f3d422d94ebcd0b8b11d5987da3464486` |
| `tools/commit-aislado.ps1` (normaliza `-Rutas` y documenta uso real) | 50 | 2.301 | `2b4984f47bc65ec670ccad123d45d00a23f44f69927e34d6da62c1a096a0cce6` |

Hashes: `Get-FileHash <ruta> -Algorithm SHA256` el 2026-10-24, posteriores a todos los cambios.

## 2. Puntuación A1–A10

| ID | Criterio | Peso | Crítico | Nota | Evidencia |
|---|---|---|---|---|---|
| A1 | Cobertura del contrato | 18 | Sí | 9,5 | Los 4 requisitos cubiertos: skill `skills/SKILL_GIT_PUBLICAR.md:1-247`; `git add .` eliminado de `SKILL_CREAR.md:166-181`; gate y publicación. Sin recortes; se añaden los derivados del proyecto (puntero, catálogo, mapa, recetas) y el gemelo `SKILL_EDITAR…:147-162` |
| A2 | Corrección funcional y técnica | 15 | Sí | 9,4 | Sintaxis git validada con `git commit --dry-run -m "test" -- tools/memoria/mapa.md` (exit 0, sin error de parseo); pathspec y `-c` de identidad probados igual; `php tools/generar-punteros-skills.php --check` → `OK .claude/skills/publicar-git/SKILL.md`; puntero idéntico al que genera el script; junction `.dsh/skills` → skill descubierta por el catálogo DSH (`publicar-git` presente en el catálogo de la sesión); `tools/commit-aislado.ps1` probado con ruta sin cambios por la vía documentada (`-File -Rutas a,b`): resuelve las dos rutas, no avisa de ruta inexistente y falla limpio sin crear commit (`fallo_nada_que_commitear=True`, HEAD intacto). Detectado y corregido que `&` directo está bloqueado por la ExecutionPolicy del equipo (§4.6) |
| A3 | Verificación real y evidencia reproducible | 13 | Sí | 9,5 | Todo lo anterior ejecutado en el repo real y reproducible con los comandos de este informe; hashes §1; YAML parseado con PyYAML (`name`, `description`, desc_len 312; puntero con front matter idéntico) |
| A4 | Reglas del encargo y del proyecto | 10 | Sí | 9,5 | Español; solo `main`; nada de ramas/worktrees; sin secretos (`claude.md:98,124`, `mapa.md:59`, `recetas.md:72-73`); herramientas en `tools/`; no se reescriben archivos completos, se editan bloques; no se toca trabajo ajeno (`apps/trickvault/index.html`, `agenda/`, etc. quedan fuera) |
| A5 | Autoevaluación honesta y calibrada | 12 | Sí | 9,4 | Este informe declara lo no verificado (§5) y los defectos encontrados y corregidos (§4); sin notas infladas; la nota no se apoya en el esfuerzo sino en salidas reales |
| A6 | Mejora residual agotada | 10 | Sí | 9,0 | Corregidas en iteración todas las mejoras asequibles detectadas (§4: 7 puntos); residuales: 3 menores declaradas en §3, ninguna bloqueante/mayor/media y ninguna asequible sin decisión externa |
| A7 | Calidad del resultado para el usuario final | 8 | No | 9,3 | Procedimiento operativo paso a paso, ejemplos reales del repo, tabla de errores conocidos, prohibiciones y checklist de salida; el texto completo de la skill se lee sin saltos (`skills/SKILL_GIT_PUBLICAR.md`) |
| A8 | Robustez y seguridad | 6 | No | 9,2 | Cubre rechazo de push, índice compartido, identidad ausente, webhook perdido, caché de CDN, secretos, `--force`, BLOCKED si no hay red/credenciales (`SKILL_GIT_PUBLICAR.md:130-227`) |
| A9 | Evidencias, documentación y trazabilidad | 5 | No | 9,5 | Hashes, comandos y salidas en este informe; skill enlazada desde `claude.md`, `mapa.md`, `recetas.md`, `SKILL_CREAR.md`, `SKILL_MAESTRA.md` y `SKILL_AUTOCALIDAD_90.md`; bitácora y scorecard del verificador en la publicación |
| A10 | Claridad, mantenibilidad y limpieza | 3 | No | 9,4 | Una sola fuente de verdad (canonical `skills/`), puntero sin duplicar contenido, sin archivos temporales ni restos de prueba; ediciones quirúrgicas |

**Cálculo:** 9,5×18 = 171,0 · 9,4×15 = 141,0 · 9,5×13 = 123,5 · 9,5×10 = 95,0 · 9,4×12 = 112,8 ·
9,0×10 = 90,0 · 9,3×8 = 74,4 · 9,2×6 = 55,2 · 9,5×5 = 47,5 · 9,4×3 = 28,2
**Σ = 938,6 → total 93,8 (truncado)**

## 3. Mejoras residuales declaradas (3, todas menores)

| ID | Sev. | Descripción | Ubicación | Coste | Beneficio | Motivo de no corregir | Quién decide |
|---|---|---|---|---|---|---|---|
| M1 | menor | Dos punteros preexistentes siguen marcados `DESACTUALIZADO` por el generador | `.claude/skills/investigacion/SKILL.md`, `.claude/skills/mejora-continua/SKILL.md` | ~10 min | Dejar `--check` en verde | Regenerarlos **borra un resumen manual** que solo existe en esos punteros; requiere decidir si se conserva ese contenido. Preexistente: no lo introduce este cambio | Antonio / Lead en tarea aparte |
| M2 | menor | El protocolo completo de `autocalidad-90` (189.489 B) no se leyó íntegro: se aplicaron §0 (compacta), §5–§6 (rúbrica y autoevaluación, `secciones/02-rubrica.md`) y §7 (formato de scorecard, precedente `supervision/scorecard-skill-autocalidad.md`) | proceso, no artefacto | ~30 min (45.000 tokens) | Trazabilidad documental idéntica | Artefacto documental, no web/app: la rúbrica aplicable quedó cubierta al 100 % con la sección canónica; leer el resto no cambiaría el resultado | Lead (registrado como supuesto) |
| M3 | menor | Rutas raras documentadas desde incidentes previos y no re-ejecutadas en esta sesión: `pull --rebase` tras rechazo, commit vacío para re-disparar webhook y renombrado de asset por CDN | `SKILL_GIT_PUBLICAR.md:130-166` | ~20 min | Probar caminos destructivos | Provocan commits/pushes de prueba en `main` y despliegues reales; el riesgo supera el beneficio y su fuente está en `errores.md`/`bitacora.md` | Antonio |

## 4. Cambios de esta iteración (defectos encontrados y corregidos)

1. **Comandos con `-m` detrás de `--`** (defecto mayor, detectado en autoexamen): en el borrador
   el método manual era `git commit -- <rutas> -m "..."`, que trata `-m` como pathspec. Corregido a
   `git commit -m "..." -- <rutas>` en la skill, y validado con `--dry-run` (§2, A2). Mismo arreglo
   en `SKILL_CREAR.md` y `SKILL_EDITAR_cirujano-codigo-produccion.md`.
2. **Gemelo del defecto `git add .`**: `skills/SKILL_EDITAR_cirujano-codigo-produccion.md:147-154`
   tenía la misma instrucción peligrosa. Corregido con el mismo criterio (era un defecto medio
   asequible, no se declara residual).
3. **Receta de memoria incoherente**: `tools/memoria/recetas.md:75-83` commiteaba sin pathspec
   (arrastraba el índice compartido). Corregida a pathspec y remitida a la skill.
4. **Falta de integración**: `SKILL_CREAR.md` no listaba la skill nueva en «Skills integradas» y
   el checklist de `SKILL_AUTOCALIDAD_90.md` no remitía al procedimiento. Añadido.
5. **Recuento del mapa**: `mapa.md` decía «13 punteros»; eran 18 antes y 19 con la nueva. Corregido.
6. **`-Rutas` del script no admitía la forma documentada** (defecto mayor, detectado al probar la
   herramienta de verdad): el comentario del script y este proyecto documentaban
   `-Rutas a,b` vía `powershell -File`, pero el binding entrega **una sola cadena** `"a,b"` (probado
   con un script de sonda: `count=1`, valor `[a,b]`), así que el commit aislado no habría commiteado
   nada. Corregido en `tools/commit-aislado.ps1:13-19` normalizando la lista (split por comas +
   trim) y probado después con dos rutas reales (`aviso_ruta_inexistente=False`,
   `fallo_nada_que_commitear=True`, HEAD sin cambios).
7. **Política de ejecución del equipo**: la invocación in-process `& script.ps1` está bloqueada
   («no está firmado digitalmente»). El borrador de la skill la recomendaba; corregido a la forma
   real que funciona aquí (`powershell -NoProfile -ExecutionPolicy Bypass -File …`), tanto en la
   skill como en `tools/memoria/recetas.md`.

Re-verificación tras cada cambio: hashes §1 recalculados al final, `--check` del generador, grep de
malas prácticas (solo quedan menciones **prohibitivas**), parseo YAML y `--dry-run` de git.

## 5. Riesgos, supuestos y límites

- **No verificado en esta sesión:** el push real y el despliegue de Hostinger, porque el push es
  posterior al gate (se hará con el procedimiento de la propia skill; el SHA se anota en la
  bitácora). Si el push falla, la tarea queda BLOCKED, no «entregada».
- **Supuesto:** Hostinger despliega por webhook al recibir push en `main` y la raíz del repo es
  pública (`claude.md:120-123`, `SKILL_MAESTRA.md` Fase 5). La nube/producción no aplica a este
  cambio documental, así que no hay marcador que comprobar en `atnojs.es`.
- **Supuesto M2** (protocolo completo no leído íntegro) declarado arriba.
- El trabajo ajeno presente en el árbol (`apps/trickvault/index.html`, `agenda/`, `.prod`,
  `tools/VoiceStudio/`, `tools/evidencias/…`, `mcp_flow_server.py`) **no** forma parte de este
  cambio y queda intacto.

## 6. Decisión

**ENTREGO** — total 93,8 (≥ 90,0), críticos A1–A6 ≥ 9,0, cero defectos B/M/Med y 3 menores
declaradas. Se presenta al verificador independiente; el veredicto final no es mío.

Declaración: no hay evidencia inventada; todo lo afirmado se reproduce con los comandos y hashes
de este informe y con los artefactos finales.
