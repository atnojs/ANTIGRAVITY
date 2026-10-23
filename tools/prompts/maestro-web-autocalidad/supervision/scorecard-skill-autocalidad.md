# Scorecard — Verificación independiente de la skill `autocalidad-90` y su cableado

**Proyecto:** `E:\ANTIGRAVITY` — skill canónica `skills/SKILL_AUTOCALIDAD_90.md`, puntero `.claude/skills/autocalidad-90/SKILL.md` y cableado en `claude.md`, skills maestras y memoria.
**Verificador:** `verificador-skill` (agente independiente; no autor de este cambio).
**Alcance:** ronda 1 sobre el commit `3c3b963` (creación) y **ronda 2 sobre el commit `681e24f`** (rework documental); estado final del árbol para esos archivos.
**Archivo de control:** este scorecard es mi **único scope de escritura**. No edito la skill, el puntero, `claude.md`, las skills maestras, `tools/memoria/`, ni git; no cierro tareas por encima del Lead.
**Fecha:** 2026-10-23.
**Estado global:** **PASS — ronda 2: 96,3** (total exacto 96,37 truncado) sobre `681e24f`. Ronda 1: PASS 95,4 sobre `3c3b963`. El veredicto queda ligado a los SHA-256 de skill y puntero indicados en §1; cualquier cambio de bytes en el artefacto lo invalida.

---

## 0. Reglas de funcionamiento del verificador

1. **Fuente de verdad:** los archivos reales del entregable y el commit, no el mensaje del Lead ni el resumen del autor.
2. **Cobertura:** 100 % de las afirmaciones críticas del encargo de `task-14` y muestreo ≥ 50 % del resto; el muestreo lo elige el verificador, no el autor.
3. **Evidencia:** cada nota y cada defecto se respalda con `ruta:línea`, comando + salida y/o hash SHA-256 reproducible.
4. **Independencia:** no soy autor de la skill ni de su cableado; no comparto scope de escritura; no edito el entregable ni bajo el umbral.
5. **Umbral inviolable:** PASS solo con total truncado ≥ 90,0, ninguna nota < 7,0, críticos A1–A6 ≥ 9,0, cero defectos bloqueantes/mayores/medios y ≤ 3 menores justificadas.
6. **Sin atajos:** prohibido redondear al alza, aprobar «con reservas», aceptar evidencia declarada sin reproducir o supervisar el propio trabajo.
7. **Rework verificado:** cada ronda re-verifica el 100 % de defectos previos y la regresión completa antes de re-puntuar.

---

## 1. Versión evaluada y artefactos (estado final real)

| Artefacto | Líneas | Bytes | SHA-256 |
|---|---:|---:|---|
| `skills/SKILL_AUTOCALIDAD_90.md` (canónico) | 147 | 12.689 | `C0FD02337DADA7F17B305BA8394468AF49C8544EE4828C36D38F3872434E282F` |
| `.claude/skills/autocalidad-90/SKILL.md` (puntero, **sin cambios** en el rework) | 35 | 2.717 | `0D360DBE8FF10B21C79DA24F7068DEED4DEB35D7FA96B43FE1FFD58618B0252F` |
| `.dsh/skills/SKILL_AUTOCALIDAD_90.md` (junction) | — | — | `C0FD02337DADA7F17B305BA8394468AF49C8544EE4828C36D38F3872434E282F` (idéntico al canónico) |
| `tools/prompts/maestro-web-autocalidad/PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` (fuente de verdad referenciada) | 1.832 | 189.489 | `5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7` |

**Verificación de hashes:** `Get-FileHash <ruta> -Algorithm SHA256` (2026-10-23). El SHA de la skill coincide con el que declara el autor del rework (`C0FD0233…E282F`); el del protocolo coincide con `EVIDENCIA.md:9` y con la versión congelada de FG-A/FG-B (`EVIDENCIA.md:81-83`).

**Versiones anteriores (histórico):** ronda 1 sobre `3c3b963` — skill SHA-256 `91E4E74640C8158F5633AC69224CAB3D4909ED6C50208BB95FBA512009D86E2F` (12.187 B), misma puntera `0D360DBE…252F`. Este PASS de ronda 2 **sustituye** al de ronda 1, que queda invalidado por el cambio de bytes en la skill (P19).

**Commits:** `git rev-parse HEAD` = `git rev-parse origin/main` = `681e24f3c0395fafee99a4ceac1c7c78fdeb3c92`; `git log --oneline origin/main..HEAD` vacío; `git branch -a --contains 681e24f` → `main`, `remotes/origin/main`. `git log --oneline -- skills/SKILL_AUTOCALIDAD_90.md` → `681e24f` y `3c3b963`.

---

## 2. Historial de rondas

| Ronda | Fecha | Commit | Versión skill | Veredicto | Total exacto → publicado | Defectos |
|---|---|---|---|---|---|---|
| 1 | 2026-10-23 | `3c3b963` | `91E4E746…D86E2F` (12.187 B) | **PASS** | 95,41 → **95,4** | 0 B/M/Med; 3 menores (V-01, V-02, V-03) |
| 2 | 2026-10-23 | `681e24f` | `C0FD0233…E282F` (12.689 B) | **PASS** | 96,37 → **96,3** | 0 B/M/Med; 1 menor residual (V-03 parcial) |

Ronda 1: creación de la skill y su cableado (9 archivos). Ronda 2: rework documental solicitado por el Lead para cerrar V-01/V-02/V-03, verificado en este scorecard.

---

## 3. Ronda 2 — verificación del delta `3c3b963..681e24f`

### 3.1 Alcance real del commit

```text
git diff --stat 3c3b963 681e24f
 skills/SKILL_AUTOCALIDAD_90.md | 6 +++---
 tools/memoria/decisiones.md    | 2 +-
 2 files changed, 4 insertions(+), 4 deletions(-)

git diff --name-only 3c3b963 681e24f
 skills/SKILL_AUTOCALIDAD_90.md
 tools/memoria/decisiones.md
```

El commit contiene **solo** el rework anunciado: 3 hunks en la skill (líneas 36, 56 y 127) y 1 línea de memoria. No toca `claude.md`, skills maestras, `mapa.md`, puntero ni ningún otro archivo: sin scope drift.

### 3.2 Resolución de los defectos previos (verificación sobre el archivo real)

| Defecto | Estado | Evidencia en `681e24f` | Comprobación |
|---|---|---|---|
| **V-01** — la vía compacta solo detallaba la autoevaluación del autor | **CERRADO** | `skills/SKILL_AUTOCALIDAD_90.md:36`: «Los supervisores, el auditor y el orquestador también se autoevalúan antes de entregar su artefacto (protocolo §5.8).» | Coincide literalmente con el requisito del protocolo §5.8 (`PROMPT…:686-701`) |
| **V-02** — asequibilidad y calibración comprimidas | **CERRADO** | `SKILL_AUTOCALIDAD_90.md:36`: mejora asequible «(≤ 15 min, sin dependencia externa, sin riesgo de regresión y con beneficio observable)»; `:56`: «Las notas se puntúan de 0,0 a 10,0. La calibración se vigila: más de 10,0 puntos de diferencia o ≥ 2,0 en un criterio crítico es defecto y se registra.» | Ambas reglas coinciden con protocolo §5.3 (`:548`) y §7.8.6/§7.10 (`:1006`, `:1033`) |
| **V-03** — «184 KB» inexacto, typo y escala implícita | **PARCIAL** | Typo corregido `:127` («supervisión»); escala explícita `:56`; tamaño corregido **solo** en `tools/memoria/decisiones.md:193` («~185 KB (189.489 bytes)»). **Siguen con «184 KB»:** `tools/memoria/bitacora.md:15` y `tools/memoria/decisiones.md:209` | Las 3 ubicaciones se comprobaron con `Select-String`; quedan 2 menciones desactualizadas (menor documental) |

**No regresión comprobada:** el diff de la skill son exactamente 3 líneas modificadas (36, 56, 127) y ninguna de las secciones de rúbrica, D1–D7, roles, rework/BLOCKED, verificación por tipo, anti-gaming ni Agent Teams fue alterada. Front matter intacto (hash de descripción y `name` iguales; parseo YAML válido). El puntero **no cambió** (mismo SHA-256 `0D360DBE…252F`) y `php tools/generar-punteros-skills.php --check` sigue emitiendo **`OK .claude/skills/autocalidad-90/SKILL.md`**.

**Observación de pulido (no defecto, no computa):** `SKILL_AUTOCALIDAD_90.md:86` (sección §6, sin cambios) sigue citando solo el umbral de calibración `> 10,0`; la regla completa ya está en `:56`. No hay contradicción (la de §6 es un subconjunto), pero en una futura revisión conviene que §6 remita a §4 para evitar duplicidad parcial.

---

## 4. Cobertura del contrato de `task-14` (ronda 2)

| # | Requisito | Evidencia (ruta:línea / comando) | Resultado |
|---|---|---|---|
| 1 | Front matter válido (name/description) | `skills/SKILL_AUTOCALIDAD_90.md:1-4`; PyYAML 6.0.3 → claves `['name','description']`, `name: autocalidad-90`, descripción de 415 caracteres; puntero con el mismo front matter (`front_matter_identico_puntero: True`) | **CUMPLE** |
| 2 | Activación obligatoria para **cualquier creación o edición** (no solo webs) | `SKILL_AUTOCALIDAD_90.md:3`, `:8-15`; `claude.md:36-44`; `tools/memoria/mapa.md:52` | **CUMPLE** |
| 3 | Roles mínimos y límites | `SKILL_AUTOCALIDAD_90.md:21-29` + autoevaluación de supervisores/auditor/orquestador en `:36` (V-01 cerrado) | **CUMPLE** |
| 4 | Rúbrica A1–A10 con pesos y críticos | `:43-54`; pesos 18+15+13+10+12+10+8+6+5+3 = **100**; críticos A1–A6 = 78; idénticos a protocolo §6.2 (`PROMPT…:718-731`) | **CUMPLE** |
| 5 | D1–D7 | `:58-66`; 7 condiciones, sin cambios en el rework (script: 7 detectadas) | **CUMPLE** |
| 6 | Autoevaluación de todos los roles | `:36` (autor + supervisores/auditor/orquestador con remisión a protocolo §5.8), plantilla `:68-79`; `claude.md:40` | **CUMPLE (V-01 cerrado)** |
| 7 | Verificador independiente | `:26`, `:29`, `:37`, `:81-87`, `:124-128` | **CUMPLE** |
| 8 | Rework 5 rondas | `:38`, `:94`; coincide con protocolo `:1282` | **CUMPLE** |
| 9 | BLOCKED | `:19`, `:29`, `:94`, `:108`, `:116`, `:128`, `:147` | **CUMPLE** |
| 10 | Verificación real por tipo de entregable | `:97-108` | **CUMPLE** |
| 11 | Anti-gaming | `:118-120` | **CUMPLE** |
| 12 | Uso con Agent Teams | `:122-128` | **CUMPLE** |
| 13 | Referencia al protocolo completo sin duplicarlo | `:15`, `:130-135`; protocolo 189.489 B/1.832 líneas; skill 12.689 B; **2,3 %** de shingles de 8 palabras compartidos (medido con script) | **CUMPLE** |
| 14 | Cableado en `claude.md` | `claude.md:36-44` (gate), `:48-50` (skill maestra), `:104` (regla crítica) | **CUMPLE** |
| 15 | Referencias en `SKILL_MAESTRA.md`, `SKILL_CREAR.md`, `SKILL_EDITAR…` y `mapa.md` | `SKILL_MAESTRA.md:10-12`; `SKILL_CREAR.md:19,35`; `SKILL_EDITAR_cirujano-codigo-produccion.md:12-14`; `tools/memoria/mapa.md:52-53` | **CUMPLE** |
| 16 | Memoria actualizada sin valores sensibles | `bitacora.md:8-30` y `decisiones.md:201-217`; sin patrones de secreto en archivos ni en el diff de `681e24f` | **CUMPLE con 1 menor (V-03)** |
| 17 | Coherencia umbral 90,0 / truncado / críticos / cero B/M/Med / ≤3 menores | `SKILL_AUTOCALIDAD_90.md:56` (fórmula única `/10`, truncado), `:58-66`; `claude.md:42`; protocolo `:771-780` | **CUMPLE** |
| 18 | Sin contradicciones con `claude.md` ni con el protocolo completo | Contraste de rúbrica, D1–D7, rondas, BLOCKED, verificación, prohibiciones y nuevas precisiones (§2.1, §3.4, §4): sin contradicciones | **CUMPLE** |

**No imputable a este cambio (preexistente, fuera del commit):** los 2 punteros desactualizados `investigacion` y `mejora-continua` (`--check` los marca y ni `3c3b963` ni `681e24f` los tocan); el recuento «13 punteros» de `tools/memoria/mapa.md:12` (ya era inexacto antes: hoy hay 18); archivos sucios ajenos en el working tree (`skills/SKILL_VIDEOVAULT_VIDEOS.md` modificado y directorios sin seguimiento), ninguno de los archivos del encargo.

---

## 5. Descubrimiento y puntero (comandos y salidas reales, ronda 2)

```text
PS> $p='E:\ANTIGRAVITY\.dsh\skills\SKILL_AUTOCALIDAD_90.md'; Test-Path $p
True
PS> Get-FileHash $p -Algorithm SHA256
C0FD02337DADA7F17B305BA8394468AF49C8544EE4828C36D38F3872434E282F   (== canónico)
PS> $d=Get-Item 'E:\ANTIGRAVITY\.dsh\skills' -Force; $d.LinkType; $d.Target
Junction ; Global\E:\ANTIGRAVITY\skills
PS> (Get-ChildItem 'E:\ANTIGRAVITY\.dsh\skills' -Filter 'SKILL_*.md').Count
25   (igual que skills/, sin copias)
PS> php tools/generar-punteros-skills.php --check
OK         .claude/skills/autocalidad-90/SKILL.md
… 2 DESACTUALIZADO (investigacion, mejora-continua) preexistentes
Punteros: 18 | regenerados: 0 | a revisar: 2
[EXIT=1]   ← el exit 1 lo provocan los 2 preexistentes, no autocalidad-90
```

- El junction está documentado como mecanismo oficial en `tools/link-dsh-skills.ps1:1-42` («DSH descubre skills en `<raiz_proyecto>/.dsh/skills`… junction… no hay copia ni duplicación»); `.dsh/` está gitignored (`.gitignore:121`).
- **Mismo SHA-256** en `skills/SKILL_AUTOCALIDAD_90.md` y `.dsh/skills/SKILL_AUTOCALIDAD_90.md` → no hay copia divergente.
- El catálogo de skills de esta sesión DSH incluye `autocalidad-90` con la descripción exacta del front matter (invariante en el rework, porque el front matter no cambió) → descubrimiento efectivo por descripción.
- Puntero: `name: autocalidad-90`, descripción idéntica al canónico, ruta canónica `skills/SKILL_AUTOCALIDAD_90.md` existente, y `--check` OK. El puntero **no cambió** en `681e24f` (mismo SHA-256).

---

## 6. Cableado verificado (sin cambios en el rework, comprobado)

| Archivo | Línea(s) | Contenido comprobado |
|---|---|---|
| `claude.md` | 36-44 | Gate obligatorio antes de generar/editar cualquier cosa; autoevaluación de todo agente; verificador independiente; umbral 90,0; críticos A1–A6; cero B/M/Med; BLOCKED; protocolo completo para webs/apps |
| `claude.md` | 48-50 | La skill figura en la «Skill maestra» con su disparador universal |
| `claude.md` | 104 | Regla crítica: «Ninguna entrega sin PASS de `autocalidad-90`» |
| `skills/SKILL_MAESTRA.md` | 10-12 | Separa «cómo producir» de «cuándo se puede entregar» |
| `skills/SKILL_CREAR.md` | 19, 35 | Requisito 6 y fila en skills integradas |
| `skills/SKILL_EDITAR_cirujano-codigo-produccion.md` | 12-14 | Gate antes de dar por terminado |
| `tools/memoria/mapa.md` | 52-53 | «Crear o editar CUALQUIER cosa → `autocalidad-90` (OBLIGATORIA)» |
| `tools/memoria/bitacora.md` | 8-30 | Entrada con qué, motivo, integración, verificación y commit |
| `tools/memoria/decisiones.md` | 201-217 (+194-199 actualizado) | Decisión, motivo, contrapartida y verificación |

`git diff --name-only 3c3b963 681e24f` demuestra que el rework no modificó ninguno de estos archivos (solo skill y una línea de memoria), por lo que el cableado verificado en ronda 1 sigue intacto.

---

## 7. Coherencia numérica y con el protocolo completo (ronda 2)

| Comprobación | Skill (ronda 2) | Protocolo | Resultado |
|---|---|---|---|
| Pesos A1–A10 | 18/15/13/10/12/10/8/6/5/3 | `:720-729` idénticos | **Iguales** |
| Suma de pesos | 100 | `:731` = 100 | **Igual** |
| Críticos | A1–A6 (78 de peso) | A1–A6 | **Iguales** |
| Fórmula | `(Σ nota×peso)/10`, truncado a un decimal | `:768-771` idéntica | **Igual** |
| Escala de notas | «de 0,0 a 10,0» `:56` (nuevo) | `:771` | **Igual** |
| Umbral | 90,0 | 90,0 en autoevaluación/supervisión/auditoría/entrega (`:586, :780, :1027, :1618`) | **Igual** |
| D1–D7 | 7 condiciones `:58-66` | `:564-572` mismas 7 | **Equivalente** |
| Rondas | máx. 5 | `:1282` máx. 5 por tarea | **Igual** |
| Asequibilidad | `:36` condiciones completas (nuevo) | `:548` 15 min + sin dependencia externa + sin riesgo de regresión + beneficio observable | **Igual (V-02 cerrado)** |
| Calibración | `:56` > 10,0 total **o** ≥ 2,0 en crítico (nuevo) | `:1006` y `:1033` | **Igual (V-02 cerrado)** |
| Muestreo | 100 % críticas + ≥ 50 % resto `:37, :83` | `:934` idéntico | **Igual** |
| Versión del protocolo citada | «v1.1, doble gate 96,0/95,0» `:15` | `PROMPT…:3` v1.1; `EVIDENCIA.md:81-82` FG-A 96,0 / FG-B 95,0 | **Verificado** |
| Duplicación de la fuente de verdad | 12.689 B / **2,3 %** de shingles compartidos | 189.489 B / 1.832 líneas | **No duplica** |

**Front matter / YAML:** `yaml.safe_load` sobre el bloque `---` → sin error; solo `name` y `description`; `name` coincide con el directorio del puntero (`autocalidad-90`). Archivo UTF-8 sin BOM y con saltos LF; acentos correctos.

**Seguridad:** búsqueda de patrones de secreto (`sk-…`, `AIza…`, `ghp_…`, `Bearer …`, `OPENAI_API_KEY=sk-…`, claves privadas PEM, `password=…`) en los 9 archivos del encargo y en el diff de `681e24f` → **sin coincidencias**. El único `const password = authPassword.value;` detectado está en `SKILL_MAESTRA.md:963,982`, es código de ejemplo **preexistente** (verificado en `3c3b963^:skills/SKILL_MAESTRA.md`) y no es una credencial.

---

## 8. Utilidad real: lectura «como la leería otro agente» (ronda 2)

Leí la skill completa (147 líneas) respondiendo a las cuatro preguntas operativas:

1. **¿Sabría activarla?** Sí: descripción del front matter y §0 inequívocas (cualquier creación/edición, no solo webs), con lista de artefactos y la única excepción (consulta conversacional sin artefacto). El catálogo de DSH la muestra por esa descripción.
2. **¿Sabría autoevaluarme?** Sí, y ahora sin ambigüedad de escala: §3.4 (asequibilidad completa y autoevaluación de todos los roles), plantilla §5 (10 filas, evidencia por criterio, residuales, gate, decisión) y §4 con escala 0,0–10,0, pesos, críticos, fórmula, truncado y calibración.
3. **¿Sabría pedir verificación independiente?** Sí: §2, §3.5, §6 y §11 dicen quién verifica, qué muestrea, qué reproduce, qué firma y qué le está prohibido; §11 concreta `team_task_create`/`spawn_teammate`/`send_message`.
4. **¿Sabría que no puede entregar sin PASS?** Sí: «Sin PASS ≥ 90,0 no hay entrega», BLOCKED obligatorio, prohibición de «casi/con reservas», rework máximo 5 rondas sin rebajar umbral y checklist final que bloquea si alguna respuesta es «no».

No encontré ninguna ambigüedad que permita **saltarse el gate** (ni activación, ni autoevaluación, ni verificación, ni entrega). Las precisiones de la ronda 2 mejoran la ejecutabilidad de la vía compacta; la única imprecisión restante es documental (V-03) y no afecta al gate.

---

## 9. Defectos y mejoras residuales (estado final)

**Cero defectos bloqueantes, mayores o medios abiertos.** Historial:

| ID | Severidad | Estado | Ubicación | Observado / esperado | Impacto / justificación |
|---|---|---|---|---|---|
| V-01 | Menor (cobertura documental) | **CERRADO en `681e24f`** | `skills/SKILL_AUTOCALIDAD_90.md:36` | Añadida la autoevaluación de supervisores, auditor y orquestador con remisión a protocolo §5.8; coincide con `PROMPT…:686-701` | — |
| V-02 | Menor (precisión normativa) | **CERRADO en `681e24f`** | `SKILL_AUTOCALIDAD_90.md:36`, `:56` | Asequibilidad con sus 4 condiciones (protocolo §5.3) y calibración > 10,0 o ≥ 2,0 en crítico (protocolo §7.8.6/§7.10) | — |
| V-03 | Menor (pulido documental) | **PARCIAL / residual** | `tools/memoria/bitacora.md:15` y `tools/memoria/decisiones.md:209` | Typo corregido (`:127`) y escala explicitada (`:56`); tamaño corregido solo en `decisiones.md:193` («~185 KB (189.489 bytes)»). **Quedan 2 menciones con «184 KB»** frente al tamaño real 189.489 bytes (185,0 KiB) | Documental, sin impacto operativo ni sobre el artefacto: no toca skill, puntero, umbral ni gate. Corrección de 2 líneas recomendada en el commit de cierre; si no se aplica, queda como menor declarada y no bloquea el PASS del artefacto |

**Observación no computable:** en `SKILL_AUTOCALIDAD_90.md:86` (§6, sin cambios) se cita solo el umbral de calibración `> 10,0`; la regla completa está en `:56`. No hay contradicción; sería limpieza futura remitir §6 a §4.

**No computan como defecto del entregable (limitaciones declaradas):** no se conserva en el repo ni en el tablero un informe de autoevaluación A1–A10 del **autor de este cambio** (`task-14` es la verificación independiente; el autor es el Lead y su autoevaluación no está versionada). La puntuación A5 se emite sobre la honestidad verificable de las afirmaciones de la memoria y sobre la calidad del mecanismo de autoevaluación que define la propia skill. El contrato de `task-14` no exige ese informe como entregable.

---

## 10. Rúbrica A1–A10 (ronda 2, con evidencia)

| ID | Criterio | Peso | Crítico | Nota | Evidencia |
|---|---|---:|---|---:|---|
| A1 | Cobertura del contrato o encargo | 18 | Sí | **9,7** | §4: los 18 requisitos cubiertos; V-01/V-02 cerrados; residual V-03 es solo memoria (A9) |
| A2 | Corrección funcional y técnica en el entorno real | 15 | Sí | **9,8** | Delta correcto y acotado (2 archivos/3 hunks), front matter intacto, `--check` OK, junction y catálogo DSH funcionales, hashes coincidentes con lo declarado |
| A3 | Verificación real y evidencia reproducible | 13 | Sí | **9,8** | Delta y regresión reproducidos por el verificador (§3), hashes y `git` verificados; evidencia ligada a versión |
| A4 | Reglas del encargo y del proyecto | 10 | Sí | **9,8** | `main`, commit aislado de 2 archivos, push verificado; español; sin secretos; no toqué git/memoria; scope de escritura respetado |
| A5 | Autoevaluación honesta y calibrada | 12 | Sí | **9,4** | Las afirmaciones del rework se reprodujeron; V-01/V-02 ciertos; el anuncio de V-03 «resuelto» era parcial (quedan 2 menciones) → se refleja en A5 y A9 |
| A6 | Mejora residual agotada | 10 | Sí | **9,4** | V-01/V-02 cerrados; solo queda V-03 residual (2 líneas, documental), declarada con coste/beneficio; ninguna afecta al umbral ni al gate |
| A7 | Calidad del resultado para el usuario final | 8 | No | **9,7** | Lectura como agente en §8: activación, autoevaluación con escala explícita, verificación y bloqueo sin PASS resolubles; mejor que ronda 1 |
| A8 | Robustez y seguridad | 6 | No | **9,5** | BLOCKED en entorno no verificable y sin verificador; prohibición de autosupervisión; anti-gaming; sin claves; protocolo separado |
| A9 | Evidencias, documentación y trazabilidad | 5 | No | **9,3** | Referencias con rutas y líneas; memoria actualizada; imprecisión residual «184 KB» en 2 ubicaciones y autoevaluación del autor no versionada (declarado) |
| A10 | Claridad, mantenibilidad y limpieza | 3 | No | **9,6** | Typo corregido, estructura clara de 13 secciones, sin duplicar el protocolo (2,3 % de shingles); queda la duplicidad parcial §4/§6 como observación |

**Mínima nota:** A9 = 9,3 (≥ 7,0). **Críticas A1–A6:** 9,7 · 9,8 · 9,8 · 9,8 · 9,4 · 9,4 → todas ≥ 9,0.

---

## 11. Cálculo del total (truncado, nunca redondeado al alza)

```text
A1 9,7 × 18 = 174,6
A2 9,8 × 15 = 147,0
A3 9,8 × 13 = 127,4
A4 9,8 × 10 =  98,0
A5 9,4 × 12 = 112,8
A6 9,4 × 10 =  94,0
A7 9,7 ×  8 =  77,6
A8 9,5 ×  6 =  57,0
A9 9,3 ×  5 =  46,5
A10 9,6 × 3 =  28,8
              ------
Suma        = 963,7
Total       = 963,7 / 10 = 96,37  → publicado 96,3 (truncado a un decimal)
```

---

## 12. Condiciones de PASS (ronda 2)

| Condición | Resultado |
|---|---|
| Total truncado ≥ 90,0 | **96,3 ✓** |
| Ninguna nota < 7,0 | **mínima 9,3 ✓** |
| Críticos A1–A6 ≥ 9,0 | **9,7 · 9,8 · 9,8 · 9,8 · 9,4 · 9,4 ✓** |
| Cero defectos bloqueantes, mayores o medios abiertos | **0 B / 0 M / 0 Med ✓** |
| ≤ 3 mejoras menores justificadas | **1 (V-03 residual, documental)** ✓ |
| Evidencia reproducible del estado final | **§3–§7, comandos y hashes ✓** |
| Scorecard ligado a la versión | **commit `681e24f` + SHA-256 de skill y puntero ✓** |

---

## 13. Veredicto final

**PASS — ronda 2: 96,3.** Total exacto 96,37 truncado a 96,3. Críticas A1–A6 ≥ 9,0; ninguna nota < 7,0; cero defectos bloqueantes, mayores o medios; 1 menor residual documental (V-03 parcial, memoria). V-01 y V-02 quedan cerrados con evidencia sobre `681e24f`; el rework respetó el alcance (solo 2 archivos, sin tocar umbral ni cableado) y no introdujo regresiones. La skill sigue activándose para cualquier creación/edición (no solo webs), es descubrible por DSH vía el junction oficial, su puntero canónico sigue validado (`--check` OK) y la fuente de verdad (protocolo SHA `5BE0BB94…`) se referencia sin duplicarse.

**Versión evaluada:** commit `681e24f3c0395fafee99a4ceac1c7c78fdeb3c92` en `main`, `skills/SKILL_AUTOCALIDAD_90.md` SHA-256 `C0FD02337DADA7F17B305BA8394468AF49C8544EE4828C36D38F3872434E282F`, puntero `.claude/skills/autocalidad-90/SKILL.md` SHA-256 `0D360DBE8FF10B21C79DA24F7068DEED4DEB35D7FA96B43FE1FFD58618B0252F`. **Cualquier cambio de bytes posterior en skill o puntero invalida este PASS** y exige nueva verificación independiente. La corrección de las 2 menciones de V-03 en memoria es documental: no altera el artefacto ni este veredicto; se recomienda aplicarla en el commit de cierre.

**Firma del verificador:** `verificador-skill` — 2026-10-23. No soy autor de la skill ni de su cableado; no edité nada fuera de este scorecard; no cerré ninguna otra tarea.

---

## 14. Registro de evidencias ejecutadas (reproducible)

### Ronda 1 — `3c3b963` (PASS 95,4)

| Comprobación | Comando / método | Resultado |
|---|---|---|
| Commit y árbol | `git log/show/status` | 9 archivos; en `main`; sin archivos ajenos |
| Publicación | `git rev-parse HEAD`, `git rev-parse origin/main`, `git log origin/main..HEAD` | `HEAD == origin/main == 3c3b963`; 0 sin publicar |
| Hashes | `Get-FileHash` SHA-256 skill, puntero, junction, protocolo | §1 (versión ronda 1) |
| Front matter | Script Python + PyYAML 6.0.3 | Válido; `name: autocalidad-90`; 415 chars |
| Puntero | `php tools/generar-punteros-skills.php --check` | `OK …/autocalidad-90/SKILL.md`; 2 `DESACTUALIZADO` preexistentes |
| Descubrimiento | `Test-Path`; `Get-Item .dsh/skills -Force`; conteo 25/25; catálogo DSH | True; Junction → `skills/`; sin copia; catálogo muestra la skill |
| Cobertura | Script de 18 patrones | Todos presentes con líneas |
| Coherencia | Script: pesos/suma/críticos/fórmula/D1–D7 | Iguales a protocolo §6.2/§5.4 |
| Duplicación | Shingles 8 palabras | 2,4 % |
| Secretos | Expresiones sobre 9 archivos y diff | Limpio; ejemplo de `password` preexistente |
| Uso | Lectura íntegra como agente | Ambigüedades V-01/V-02/V-03; ninguna permite saltarse el gate |

### Ronda 2 — `681e24f` (PASS 96,3)

| Comprobación | Comando / método | Resultado |
|---|---|---|
| Commit y alcance | `git log --oneline -4`; `git show --stat 681e24f`; `git diff --stat/--name-only 3c3b963 681e24f` | 2 archivos, 4 insert/4 delete; solo rework anunciado |
| Publicación | `git rev-parse HEAD`, `git rev-parse origin/main`, `git log origin/main..HEAD`, `git branch -a --contains 681e24f` | `HEAD == origin/main == 681e24f`; 0 sin publicar; en `main` |
| Hash skill | `Get-FileHash` | `C0FD0233…E282F` (coincide con el declarado); 12.689 B; 147 líneas |
| Hash puntero | `Get-FileHash` | `0D360DBE…252F` (sin cambios respecto a ronda 1) |
| Delta skill | `git show 681e24f` | Hunks en `:36` (V-01+V-02), `:56` (V-02/escala), `:127` (typo) |
| Delta memoria | `git show 681e24f`; `Select-String 184 KB/185 KB/189.489` | `decisiones.md:193` corregido; `bitacora.md:15` y `decisiones.md:209` siguen con 184 KB → V-03 parcial |
| V-01/V-02 | Lectura de `:36` y `:56` + contraste con `PROMPT…:548, :686-701, :1006, :1033` | Cerrados, sin contradicción |
| Regresión | Diff acotado + script de cobertura 18 patrones + front matter + D1–D7 (7) | Sin regresión; front matter intacto |
| Puntero | `php tools/generar-punteros-skills.php --check` | `OK …/autocalidad-90/SKILL.md`; 2 `DESACTUALIZADO` preexistentes |
| Descubrimiento | `Test-Path`; junction hash | True; `C0FD0233…E282F` == canónico |
| Coherencia | Script: pesos 100, críticos A1–A6, fórmula, escala 0,0–10,0 (`:56`), calibración ≥2,0 crítico (`:56`), D1–D7 | Igual a protocolo; escala y calibración ya explícitas |
| Duplicación | Shingles 8 palabras | 2,3 % |
| Secretos | Expresiones sobre diff `681e24f` y archivos | Limpio |
| Estado del árbol | `git status --porcelain -- <archivos del encargo>` | Vacío; sucios ajenos no imputables |

**Limitaciones de esta verificación:** no se ejecutó un simulacro real de Agent Teams (autor/verificador) dentro de esta sesión porque el verificador está en el último nivel de delegación y no puede crear subagentes; la utilidad se evaluó por lectura operativa + catálogo + protocolo. El descubrimiento se acredita con el catálogo DSH de la sesión y el junction; no se reinició el servidor de skills. El protocolo completo no se re-auditó (ya tiene gates FG-A 96,0 / FG-B 95,0 publicados); solo se comprobó la coherencia de la skill con sus reglas y su SHA congelado.
