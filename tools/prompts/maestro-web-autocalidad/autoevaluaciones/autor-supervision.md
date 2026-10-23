# Autoevaluación — T3: Sección 3 (Supervisión independiente, evidencias y rework)

**Tarea:** T3 — `tools/prompts/maestro-web-autocalidad/secciones/03-supervision.md` y esta autoevaluación.
**Autor:** `autor-supervision`.
**Versión evaluada:** v2.0 — ronda 2 — 2026-10-23.
**Supervisor independiente asignado:** `supervisor-calidad-b` (scorecard en `tools/prompts/maestro-web-autocalidad/supervision/scorecard-supervisor-b.md`, §7.5).
**Estado:** ronda 1 corregida; pendiente del veredicto de la ronda 2. **Esta autoevaluación no es una aprobación**: la tarea no se cierra hasta PASS ≥ 90,0.
**Alcance de escritura respetado:** solo los dos archivos de mi scope. No he tocado secciones ajenas, git, apps, skills, memoria, scorecards ni ningún otro archivo. No hay reescritura de cero: solo los defectos D-ST3-01 a D-ST3-03 y lo que se deriva de ellos.

Ruta abreviada usada en las evidencias: `T3` = `tools/prompts/maestro-web-autocalidad/secciones/03-supervision.md`.

## 1. Ronda 1 y correcciones aplicadas (changelog de la sección)

**Ronda 1 (2026-10-23):** veredicto `REWORK`, total exacto **90,75/100** (90,7 truncado), notas S1 9,5 · S2 8,5 · S3 9,0 · S4 9,5 · S5 8,5 · S6 9,0 · S7 9,5. Defectos abiertos: D-ST3-01 (mayor), D-ST3-02 (medio), D-ST3-03 (medio). Calibración frente a mi declaración de 94,0: diferencia 3,25 puntos, por debajo del umbral de 10,0; no es defecto de calibración, pero era una sobreestimación mía.

**Ronda 2 (esta entrega):** correcciones quirúrgicas, sin tocar otras secciones ni reescribir la sección.

| Defecto | Corrección aplicada | Evidencia nueva (T3:líneas) | Estado |
|---|---|---|---|
| D-ST3-01 (mayor): escala incoherente en plantillas | Una sola escala: notas por criterio 0–10; total ponderado 0–100 truncado a un decimal, umbral 90,0. Corregidas 7.12.2 y 7.12.5; añadidas fila de ejemplo y párrafo demostrativo de la escala; cabecera del registro de rondas rotulada `Total (0–100)`; fórmula de 7.9.3 explicitada como escala 0–100 | T3:167 (fórmula `Σ(nota × peso)/10`, escala 0–100), T3:251–252 (puntuaciones totales 0–100), T3:257 (fila de ejemplo), T3:260 (cálculo: `Σ = <n>; total = <n>/10 = <X,X> sobre 100`), T3:275 (ejemplo de escala), T3:301 (`REWORK (<total> sobre 100)`), T3:552 (`Total (0–100)`) | Corregido |
| D-ST3-02 (medio): cinco mejoras residuales y decisión incoherente | El informe pasa a declarar **tres** mejoras residuales menores (M1–M3); las dos restantes se reclasifican como decisiones de integración y supuestos no defectuosos (§6). La decisión se alinea con el límite de 3 menores de T3 y con el BRIEF §4 | Esta autoevaluación, §5 (M1–M3) y §6 (decisiones/supuestos); T3:184 (máximo 3 menores), T3:208 (severidad menor), T3:600–614 (cierre con PASS y ≤ 3 menores) | Corregido |
| D-ST3-03 (medio): inventario de roles no alineado con §1.4 | La tabla 7.2 usa exclusivamente las denominaciones de §1.4: «Supervisores independientes», «Autores y especialistas», «Auditor end-to-end», «Orquestador», «Integrador». Se eliminan «Auditor final», «Verificador de producto» y «Segundo supervisor» como roles; el segundo firmante de desempate y el dueño de la verificación se explican como asignaciones dentro de roles existentes. La nota de integración deja instrucción explícita para reflejarlos en §4.4 | T3:7 (instrucción de roles y §1.4/§4.4), T3:29–33 (tabla de roles), T3:43 (asignación del firmante independiente), T3:109 (verificación delegada al dueño de la tarea de verificación), T3:339 (auditores end-to-end), T3:399 (auditoría end-to-end de conveniencia), T3:496–500 (segundo firmante de desempate) | Corregido |

## 2. Rúbrica S1–S7 (BRIEF §4) — versión 2.0

| ID | Criterio | Peso | Crítico | Nota | Justificación breve |
|---|---|---|---|---|---|
| S1 | Cumple completo el contrato de su sección | 20 | Sí | **9,5** | Los diez bloques del contrato T3 siguen cubiertos con mecanismos ejecutables; la ronda 2 no recorta contenido y añade precisión de escala y roles. No pongo 10 porque la integración aún debe deduplicar y reubicar 7.14 (M1/M2). |
| S2 | Corrección técnica y coherencia con el diseño global | 15 | Sí | **9,2** | Corregidos los dos problemas que motivaron el 8,5 de la ronda 1: una sola escala (T3:167, 251–252, 260, 301, 552) e inventario de roles único con §1.4 (T3:7, 29–33). Referencia la rúbrica del capítulo 6 sin redefinirla. No pongo 10 porque el integrador debe conservar esas decisiones al fusionar. |
| S3 | Utilidad ejecutable: listo para integrar | 15 | Sí | **9,4** | Plantillas copiables, gate numérico, estados, admisión, paquete de escalado y prohibiciones. Baja una décima respecto a v1.0 porque la corrección de escala demuestra que la ejecutabilidad dependía de un detalle que la ronda 1 detectó; ya está resuelto. |
| S4 | Alineación literal con el encargo y el BRIEF (R1–R8) | 15 | Sí | **9,5** | Cada R mantiene al menos dos mecanismos (mapa de §3). R3 se apoya en la Fase 1 y esta sección la audita, por reparto del BRIEF. |
| S5 | Autoevaluación honesta y trazable | 15 | Sí | **9,1** | Corregida la incoherencia que motivó el 8,5 (cinco mejoras → tres, decisión coherente) y reconocida la sobreestimación de calibración de la ronda 1. No pongo 10 porque la calibración final de esta ronda solo la puede confirmar el supervisor. |
| S6 | Claridad, concisión, formato y ausencia de relleno | 10 | No | **9,0** | Jerarquía clara y tablas útiles; la sección es extensa (614 líneas) porque el contrato exige cobertura amplia y mecanismos redundantes. Es mi nota más baja y la declaro como M1. |
| S7 | Resistencia al autoengaño y al gaming del proceso | 10 | No | **9,5** | Barrido de 17 patrones, 14 prohibiciones del supervisor, 12 del bucle, «duda → REWORK», prohibición de autoaprobación y muestreo no elegible por el autor. No pongo 10 porque ningún catálogo prueba la ausencia de un patrón no previsto. |

**Cálculo:** total = Σ (nota × peso) / 10 = (9,5×20 + 9,2×15 + 9,4×15 + 9,5×15 + 9,1×15 + 9,0×10 + 9,5×10) / 10 = (190,0 + 138,0 + 141,0 + 142,5 + 136,5 + 90,0 + 95,0) / 10 = **93,3 / 100** (un decimal truncado).

**Condiciones de la rúbrica:** ninguna nota < 7,0; los cinco criterios críticos ≥ 9,0; sin defectos bloqueantes, mayores ni medios conocidos abiertos; tres mejoras residuales menores (M1–M3), dentro del máximo de 3. Calibración declarada: 93,3 frente a los 90,75 independientes de la ronda 1 (diferencia 2,55; dentro del límite de 10,0).

## 3. Evidencias por criterio

### S1 — Contrato completo

| Evidencia (T3:líneas) | Contenido que lo demuestra |
|---|---|
| 25–62 | Roles de §1.4, prohibición de autosupervisión, reciprocidad, conflicto de interés y sustitución (7.2–7.3) |
| 87–111 | Reproducción del 100 % de afirmaciones críticas + muestreo ≥ 50 % determinista, ampliación al 100 % si aparece un defecto y método por tipo de evidencia (7.6) |
| 113–147 | Evidencia válida, obsoleta, insuficiente y falsa/tergiversada con tabla patrón → detección → respuesta (7.7) |
| 148–162 | Procedimiento ciego, comprobación de la autoevaluación y calibración (7.8) |
| 163–198 | Puntuación con la rúbrica del capítulo 6 y gate PASS/REWORK (7.9–7.10) |
| 199–220 | Registro de defectos con severidad, ubicación, esperado, observado y cierre re-verificado (7.11) |
| 221–313 | Plantillas: declaración (225), scorecard (243), defectos (277), muestreo (287) y solicitud de rework (296) (7.12) |
| 314–334 | Prohibiciones del supervisor y del gate (7.13) |
| 335–362 | Auditoría end-to-end final: trazabilidad, aritmética, re-auditoría, producto, proceso, anti-gaming y veredicto (7.14) |
| 363–404 | Invariantes I1–I9, barrido de 17 patrones, supervisión de la supervisión y consecuencias (7.15) |
| 427–479, 526–584 | Bucle de rework: máximo 5 rondas, changelog, admisión, 100 % de defectos previos, regresión, re-puntuación y plantillas (8.2–8.5, 8.8) |
| 480–525 | Escalado, desempate, reasignación, división de alcance y BLOCKED (8.6–8.7) |
| 585–599, 600–614 | Prohibiciones del bucle y cierre con PASS ligado a versión; el cierre no autoriza la entrega (8.9–8.10) |

### S2 — Coherencia y corrección técnica (defectos de ronda 1 cerrados)

| Evidencia (T3:líneas) | Qué demuestra |
|---|---|
| 167 | Fórmula con escala explícita: `total = Σ (nota × peso) / 10` (0–100; notas 0–10) |
| 251–252, 260 | Scorecard: puntuaciones totales 0–100 y cálculo `total = <n>/10 = <X,X> sobre 100` (sin `/10` en el total) |
| 257, 275 | Fila de ejemplo y ejemplo de escala que demuestran la notación 0–100 frente a 9,4/10 |
| 301, 552 | Solicitud de rework con `REWORK (<total> sobre 100)` y registro de rondas con `Total (0–100)` |
| 7, 29–33, 43 | Roles exclusivamente de §1.4, instrucción de integración a §4.4 y asignación del firmante independiente sin crear roles |
| 109, 339, 399, 496–500 | Uso uniforme de «dueño de la tarea de verificación», «auditor end-to-end» y «segundo firmante independiente» |
| 165, 355–357 | Rúbrica del capítulo 6 usada por referencia y gate global sin compensación entre tareas ni criterios |
| 0 coincidencias de `Antigravity`, `Hostinger`, `Electrolize`, `00D0D0`, `apps/`, `skills/`, `tools/memoria`, `git commit`, `proxy.php` | No se duplican reglas del proyecto |

### S3 — Ejecutabilidad

| Evidencia (T3:líneas) | Qué demuestra |
|---|---|
| 176–190 | Gate con condiciones verificables una a una |
| 427–439 | Reglas de ronda, cómputo de rondas, disputa de defectos y límite duro de 5 |
| 449–464 | Lista de admisión A1–A7 y protocolo de re-verificación del reenvío |
| 496 | Paquete de escalado y decisiones permitidas al orquestador |
| 243–313 | Plantillas rellenables, con escala corregida y ejemplo |
| 335–362 | Emplazamiento de la auditoría entre Fase 5 y Fase 6, con versión congelada y acta |

### S4 — Alineación con el encargo literal y con R1–R8

| R | Mecanismos en esta sección (evidencia) |
|---|---|
| R1 | Comprobación de la autoevaluación en 7.8 (148–162) e invariante I1 (369) |
| R2 | Mejoras residuales en 7.8.4 (157) y severidad «medio» en 7.11 (207) |
| R3 | Cobertura y trazabilidad en 7.14 A (345) e invariantes I1–I9 (369–377) |
| R4 | Independencia (25–62), reproducción 100 %/≥ 50 % (87–111), evidencia verificada (113–147) y auditoría end-to-end (335–362) |
| R5 | Gate PASS/REWORK (172–198), rework dirigido (427–479), escalado (480–525) y cierre solo con PASS (600–614) |
| R6 | Umbral en el gate (176–190), prohibiciones de rebaja/redondeo (314–334, 585–599) e invariante I4 (372) |
| R7 | Máximo 5 rondas (434), escalado/desempate (480–507), reasignación/división/BLOCKED (508–525) |
| R8 | Auditoría de la verificación real del producto en 7.14 D (348) y supervisión de evidencias en 7.4 (74) |

### S5 — Honestidad y trazabilidad de esta autoevaluación

| Evidencia | Qué demuestra |
|---|---|
| `T3:1–614` | Versión completa declarada; conteo y SHA-256 en §4 |
| Este informe, §1 y §8 | Changelog de ronda 1 → ronda 2 con defecto, corrección y evidencia nueva |
| Este informe, §2 | Notas por criterio con justificación; S2 y S5 corregidas respecto a la ronda 1 |
| Este informe, §5–§6 | Exactamente tres mejoras residuales menores y decisiones/supuestos de integración que no son defectos |
| Este informe, §4 | Comandos y salidas reproducibles; líneas citadas del archivo final |

### S6 — Claridad y formato

| Evidencia | Qué demuestra |
|---|---|
| `T3:9–614` | 37 encabezados jerárquicos (7.1–7.15, 8.1–8.10 con subapartados), tablas de decisión y plantillas |
| §4 de este informe | 614 líneas, 65.404 caracteres, tablas coherentes, 0 marcadores pendientes, 0 rutas personales, 0 reglas de proyecto |
| T3:243–276, 526–584 | Plantillas con escala única y ejemplos de uso |

### S7 — Resistencia al autoengaño y al gaming

| Evidencia (T3:líneas) | Qué demuestra |
|---|---|
| 379–399 | Barrido anti-gaming de 17 patrones con señal y respuesta |
| 314–334 | 14 prohibiciones del supervisor: PASS sin 100 % crítico, «con reservas», rebaja/redondeo, cansancio, historial, autosupervisión |
| 585–599 | 12 prohibiciones del bucle: reiniciar rondas, borrar defectos, reducir alcance, BLOCKED disfrazado, entregar sin PASS |
| 21 | Regla de oro: duda no resuelta → REWORK, nunca PASS |
| 89, 95 | Muestreo decidido por el supervisor y no certificación de lo no verificado |
| 355–357, 372, 434 | Sin compensación entre tareas, invariante de umbral/rúbrica y límite duro de 5 rondas |
| 7, 25–45, 335–362 | Roles de §1.4 sin autosupervisión; el orquestador no puntúa ni firma; auditoría con auditores independientes |

## 4. Verificaciones mecánicas ejecutadas (comando + salida)

Ejecutadas sobre `T3` después de la última edición, el 2026-10-23:

| Comprobación | Resultado |
|---|---|
| Integridad y tamaño de la sección | **614 líneas · 65.404 caracteres** |
| SHA-256 de `03-supervision.md` | **`a0beb5c69dd22e2250d9d16c5a685e7d476e5232998c0a0521416d58583caf6c`** |
| Estructura | **37 encabezados** sin contar el título, con 7.12.1–7.12.5 y 8.8.1–8.8.5 |
| Tablas Markdown | **Todas coherentes** (recuento de pipes por grupos contiguos) |
| Marcadores de trabajo pendiente | **0** |
| Roles prohibidos (`Auditor final`, `auditores finales`, `Segundo supervisor`, `Verificador de producto`) | **0 coincidencias** |
| Totales mal rotulados en plantillas (`Puntuación…/10`, `REWORK (<total>/10)`) | **0 coincidencias** |
| Reglas del proyecto (`Antigravity`, `Hostinger`, `Electrolize`, `00D0D0`, `apps/`, `skills/`, `tools/memoria`, `git commit`, `proxy.php`) | **0 coincidencias en todos** |
| Rutas personales y URLs (`E:\`, `C:\`, `http://`, `https://`) | **0 coincidencias** |
| Emojis | **0** |
| Referencias cruzadas internas | 7.10 ×4 · 7.12 ×10 · 7.14 ×8 · 7.15 ×4 · 8.2 ×4 · 8.5 ×3 · 8.6 ×8 · 8.7 ×8 · 8.8 ×9 |

## 5. Mejoras residuales (máximo 3)

| ID | Mejora residual | Severidad | Coste / decisión |
|---|---|---|---|
| M1 | Longitud alta (614 líneas / 65,4 KB) para un fragmento de integración | Menor | Coste de recorte bajo, pero el beneficio es dudoso y el riesgo de perder cobertura contractual o precisión es alto; el BRIEF exige mecanismos redundantes (R1–R8 al menos dos veces). Se deja al integrador la deduplicación contra los capítulos 5–6. |
| M2 | 7.14 (auditoría end-to-end) está numerada dentro del capítulo 7 aunque se ejecuta tras la Fase 5 | Menor | Coste bajo, pero la reubicación pertenece a la integración y está indicada en la nota inicial; moverla ahora rompería la numeración prevista del BRIEF §3. |
| M3 | La doble firma del acta final depende de que el equipo tenga dos auditores independientes | Menor | No resoluble sin conocer el equipo real; la regla ya prevé la limitación documentada, prohíbe firmar al orquestador y compensa con re-auditoría de las tareas de borde. |

No hay más mejoras residuales abiertas. Las antiguas M4 y M5 de la ronda 1 se reclasifican en §6 como decisiones de integración y supuestos, no como defectos ni mejoras pendientes.

## 6. Decisiones de integración y supuestos (no son defectos)

1. **Umbrales de auditoría más estrictos que el mínimo del BRIEF** (re-auditoría al 100 % por debajo de 92,0; muestra ≥ 30 %; discrepancia crítica ≥ 2,0): decisión de diseño que solo endurece el estándar. El integrador o el supervisor pueden endurecerla más, nunca suavizarla sin incumplir el BRIEF.
2. **Referencias numéricas a los capítulos 5, 6 y a la Fase 5:** si el Lead renumera al integrar, debe actualizar los números, no el contenido; las piezas también se nombran («rúbrica universal», «protocolo de autoevaluación», «Fase 5»).
3. **Asignación de firmantes dentro de los roles de §1.4:** el integrador debe reflejar en §4.4 («Dueño y supervisor» y «Gate aplicable») cualquier segundo firmante o dueño de verificación; no se crean roles nuevos.
4. **Campos entre `<…>` en las plantillas:** son variables de uso, no marcadores de trabajo pendiente.
5. **Supuestos:** existe una rúbrica universal en el capítulo 6 y un protocolo de autoevaluación con severidades; la Fase 5 produce evidencia primaria; el proyecto puede designar supervisor y auditor independientes. Si no puede, la sección ordena BLOCKED por insuficiencia de independencia, nunca autosupervisión.

## 7. Decisión

**ENTREGO la ronda 2.** No tengo defectos bloqueantes, mayores ni medios conocidos abiertos; quedan tres mejoras residuales menores (M1–M3) dentro del máximo permitido, y la calibración se mantiene dentro del límite. No solicito PASS ni cierro `task-3`: espero el scorecard de `supervisor-calidad-b`. Si emite REWORK, corregiré solo los defectos numerados, mantendré el máximo de 5 rondas y no negociaré el umbral.

## 8. Changelog de esta autoevaluación

| Versión | Ronda | Fecha | Cambio |
|---|---|---|---|
| v1.0 | Ronda 1 | 2026-10-23 | Entrega inicial; 94,0/100; cinco mejoras residuales (M1–M5) |
| v2.0 | Ronda 2 | 2026-10-23 | Corrección D-ST3-01 (escala única), D-ST3-02 (tres mejoras residuales y decisión coherente) y D-ST3-03 (roles de §1.4); notas S2/S3/S5 ajustadas; 93,3/100; nueva versión de la sección con SHA-256 `a0beb5c6…` |

Firma: `autor-supervision` — 2026-10-23.
