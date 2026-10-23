# Autoevaluación — T1: Sección 1 (núcleo de orquestación)

- Autor: `autor-nucleo`
- Tarea: `task-1` (T1 del BRIEF §3)
- Supervisor independiente asignado: `supervisor-calidad-a`
- Entregable: `tools/prompts/maestro-web-autocalidad/secciones/01-nucleo.md`
- Fecha: 2026-10-23
- Estado: **ENTREGO** (versión congelada v4; la tarea sigue abierta hasta el PASS del supervisor; no me autopruebo ni cierro `task-1`)

## 0. Versión congelada entregada (fuente de todas las citas)

| Dato | Valor medido |
|---|---|
| Archivo | `tools/prompts/maestro-web-autocalidad/secciones/01-nucleo.md` |
| SHA-256 (bytes exactos del archivo) | `7b07c1b28b2316a9df7d6e02a07c36ee93eed939dd95d29093ccd480c75984f9` |
| Tamaño | 38.748 bytes |
| Líneas | 400 (método: `File.ReadAllLines`; 400 caracteres de salto de línea) |
| Palabras | 6.388 (método: división por espacios en blanco) |
| Tablas | 13; tablas con filas de columnas inconsistentes: 0 |
| Encabezados | 4 de nivel 1; 19 de nivel 2 |
| Última modificación (local) | 2026-10-23 15:34:46 |
| Referencias de sección citadas | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12 |
| Etiquetas internas R1–R8 / marcadores prohibidos | 0 / 0 |

Todas las referencias de línea de este informe corresponden a esta versión exacta. Si el archivo cambia, este informe queda invalidado y debe re-verificarse.

## 1. Alcance producido

Fragmento listo para integrar como secciones 1–4 del prompt final, según la numeración prevista del BRIEF §3:

1. Identidad, misión, variables y datos de entrada (§1.1–§1.4).
2. Reglas inviolables de proceso (P1–P19).
3. Fase 0 — Brief y contrato de aceptación.
4. Fase 1 — Descomposición, tablero y contratos de tarea.

Sin meta-comentarios, sin TODOs y sin duplicar la rúbrica (§6), la supervisión (§7), el rework (§8), la verificación (§9) ni la entrega (§10): se citan por número de sección.

## 2. Trazabilidad del contrato T1 (BRIEF §3, fila T1)

| Contenido exigido | Dónde está | Evidencia (archivo:líneas) |
|---|---|---|
| Identidad y misión del orquestador | §1.1 | `secciones/01-nucleo.md:3-22` (misión 5-7; compromisos 11-18; rol 20; adaptación 22) |
| Variables de entrada y qué hacer si faltan | §1.2–§1.3 | `:24-56` (tabla 28-46; reglas de datos ausentes 50-56) |
| Reglas inviolables: español, no secretos, no autosupervisión, un escritor por archivo, no ramas, no inventar | §2 | `:76-101`; P1 `:82`, P5 `:86`, P6 `:87`, P8 `:89`, P9 `:90`, P10 `:91` |
| Fase 0: ingesta del brief | §3.1 | `:106-113` |
| Fase 0: criterios de aceptación | §3.2 | `:115-138` (tabla 119-130; reglas 132-138) |
| Fase 0: preguntas máximo tres | §3.3 | `:140-145` |
| Fase 0: supuestos | §3.4 | `:147-157` |
| Roles del equipo (orquestador, autores, supervisores, auditor end-to-end, integrador) | §1.4 | `:58-75` (tabla 60-66; composición 68-74) |
| Fase 1: descomposición en tareas distintas | §4.1 | `:178-198` (criterios 182-186; dividir 188; fusionar 190; prohibiciones 194-196) |
| Fase 1: cobertura mínima del ciclo web | §4.2 | `:200-227` (15 áreas en 206-220; reglas 222-227) |
| Fase 1: tabla de tareas (id, tarea/entregable, dueño, supervisor, scope, dependencias, evidencia, rúbrica) | §4.3 | `:229-244` (columnas 233-234; reglas 238-244) |
| Fase 1: contrato de tarea individual | §4.4 | `:246-271` (campos 250-264; reglas 266-271) |
| Fase 1: tablero compartido y estados | §4.5 | `:273-309` (ruta/registro 275; contenido 279-287; estados 289-300; reglas 302-309) |
| Fase 1: asignación de supervisores independientes | §4.6 | `:311-320` |
| Fase 1: dependencias y paralelismo | §4.7 | `:322-329` |
| Fase 1: oleadas e hitos | §4.8 | `:331-336` |
| Protocolo de comunicación y sincronización | §4.9 | `:338-359` (tipos de mensaje 342-349; reglas 351-359) |
| Reglas de parada (no avanzar sin gate) | §4.10 | `:361-400` (gates 369-374; condiciones 380-391; reglas generales 393-400) |

## 3. Autoevaluación S1–S7

| ID | Criterio | Peso | Nota | Justificación y evidencia |
|---|---|---:|---:|---|
| S1 | Cumple completo el contrato de sección | 20 | **9,5** | Todos los contenidos exigidos por el BRIEF §3/T1 están presentes y localizables en la tabla de §2 de este informe. La cobertura mínima incluye 15 áreas, entre ellas brief/alcance, commit, auditoría end-to-end y memoria/cierre. No hay recortes ni apartados diferidos; las únicas delegaciones son por diseño (rúbrica → §6, supervisión → §7, rework → §8, verificación → §9, entrega → §10). Evidencia: `secciones/01-nucleo.md:1-400`, tabla de tareas `:233-234` con las nueve columnas exigidas y cobertura `:206-220`. |
| S2 | Corrección técnica y coherencia con el diseño global | 15 | **9,4** | Referencias cruzadas solo a secciones 1–10 y 12 del prompt final (verificado: `REFS=1,2,3,4,5,6,7,8,9,10,12`), ninguna a una sección inexistente. Coherencia numérica: 90 % (`:85`, `:372`), máximo tres preguntas (`:51`, `:140-145`), máximo cinco rondas (`:389`), sin redondeo al alza. Los nombres, responsables y transiciones de estado están unificados con la definición canónica de §8.1. El reparto evita duplicar rúbrica y rework. Residual: la terminología exacta de severidades y veredictos debe coincidir con §6/§7 cuando el Lead integre. |
| S3 | Utilidad ejecutable, sin ambigüedad operativa | 15 | **9,4** | Tablas operativas con campos obligatorios: variables con acción si falta (`:28-46`), contrato de aceptación por categorías (`:119-130`), tabla de tareas (`:233-234`), contrato de tarea con definición de terminado y gate aplicable (`:250-264`), estados con quién los fija y transición (`:291-300`), gates con firma (`:369-374`) y condiciones de parada (`:380-391`). Incluye plan B sin sistema de archivos (`:275`) y modo sin subagentes (`:73`, `:320`). No pide pseudocódigo, herramientas concretas ni archivos inexistentes. Residual: la ruta por defecto `.orquestacion/` requiere confirmación de no-publicidad con §2.3.9 y §9. |
| S4 | Alineación literal con el encargo y R1–R8 | 15 | **9,6** | El encargo literal se recoge en la misión y compromisos (`:5-18`): autoevaluación obligatoria, no entregar con mejora asequible, un agente por tarea distinta, supervisión independiente que reproduce evidencias, rework hasta PASS y suelo del 90 %. Mecanismos duplicados por requisito: no entrega con mejora (P3 `:84` + parada `:383`), delegación fina (§4.1 `:178-198` + §1.1 `:13`), supervisión independiente (§1.4 `:58-75` + §4.6 `:311-320` + P5/P7), 90 % (P4 `:85` + PASS `:297` + Gate 3 `:372` + parada `:389`), bucle hasta aprobación (P12 `:93` + P18 `:99` + parada `:389`), verificación real (§3.2 `:119-130` + cobertura `:206-220`). |
| S5 | Autoevaluación honesta y trazable | 15 | **9,0** | El informe es específico, con versión congelada, hash, métricas medidas y referencias comprobadas. No me doy más nota porque la ronda 1 del supervisor detectó un fallo real de trazabilidad: el informe enviado citaba una versión anterior (392 líneas) mientras el archivo ya había avanzado; ese defecto se reconoce, se documenta en §10 y se corrige con la congelación actual. No se ocultan métricas ni se inventan: las cifras provienen de comandos reproducibles. Limitación: la puntuación es autoinformada hasta que la verifique el supervisor. |
| S6 | Claridad, concisión, formato y ausencia de relleno | 10 | **9,1** | 4 encabezados de nivel 1 y 19 de nivel 2, 13 tablas sin errores de columnas, sin TODOs, sin meta-comentarios ni etiquetas internas R1–R8 (`R_TAGS=0`, `MARCADORES_META=0`). Algún descriptor de tabla es largo, justificado por la precisión contractual; no hay párrafos ornamentales. |
| S7 | Resistencia al autoengaño y al gaming | 10 | **9,4** | Mecanismos explícitos: umbral no negociable sin redondeo (P4 `:85`), no autosupervisión (P5 `:86`), evidencia reproducible (P7 `:88`), prohibición de inventar (P8 `:89`), sin autoengaño (P13 `:94`), N/A justificado (P14 `:95`), tablero como fuente única (P15 `:96`), orquestador sin veto sobre el supervisor (P17 `:98`), PASS no heredado (P19 `:100`), tablero de solo adición (`:304-309`), silencio nunca equivale a aprobación (`:356`), el autor no elige supervisor (`:314`). Residual: en entorno sin persistencia, la integridad del tablero depende de la conversación (declarado como limitación). |

Cálculo (fórmula del BRIEF §4: `total = Σ(nota × peso) / 10`):

- S1: 9,5 × 20 = 190,0
- S2: 9,4 × 15 = 141,0
- S3: 9,4 × 15 = 141,0
- S4: 9,6 × 15 = 144,0
- S5: 9,0 × 15 = 135,0
- S6: 9,1 × 10 = 91,0
- S7: 9,4 × 10 = 94,0
- **Total = 936,0 / 10 = 93,6 / 100 (equivalente 9,36 / 10)**

Condiciones de PASS del BRIEF §4: total ≥ 90,0 (93,6), ninguna nota < 7 (mínimo 9,0), todos los criterios críticos S1–S5 ≥ 9 (mínimo 9,0) y cero defectos bloqueantes, mayores o medios declarados. Se declaran tres menores en §5 con justificación de coste-beneficio.

## 4. Mejoras aplicadas antes de reportar (regla «si cabe una mejora asequible, hazla»)

| # | Mejora aplicada | Evidencia en el archivo |
|---|---|---|
| 1 | Se eliminaron filas de plantilla con puntos suspensivos en §3.4 y §4.3 para no dejar marcadores de relleno; ahora solo quedan encabezados y reglas de uso. | `:151-157` y `:233-234` |
| 2 | Se añadió la frontera explícita de reglas del proyecto destino (se completan en §2.3 y §9) para evitar confusión con las reglas de proceso. | `:78` |
| 3 | Se añadió la regla P19: un PASS no se hereda entre versiones y queda ligado a la versión exacta del entregable. | `:100` |
| 4 | Se añadió que el supervisor lo asigna el orquestador y que el autor no elige ni descarta supervisores; se exige constancia escrita de independencia y conflictos. | `:314-315` |
| 5 | Se precisó que el auditor end-to-end no puede ser autor ni el propio orquestador, ni auditar tareas que haya supervisado. | `:71` |
| 6 | Se corrigieron referencias cruzadas y criterios vagos (referencia a oleadas §4.8, criterio de rendimiento medible, redacción de la parada por rework agotado, diferencia entre mejora asequible y menor admitida). | `:44`, `:126`, `:389`, `:383` |
| 7 | Se retiraron las etiquetas internas del BRIEF (R1)–(R8) del texto del prompt final para que sea autosuficiente; la trazabilidad se conserva en este informe. | `R_TAGS=0` (verificación en §6) |
| 8 | Se fijó ruta por defecto del tablero (`.orquestacion/`) y un plan B explícito sin sistema de archivos. | `:275` |
| 9 | Se amplió la cobertura mínima con brief/alcance explícito, despliegue+commit, auditoría end-to-end y memoria/cierre (15 áreas). | `:206-220` |
| 10 | Se añadieron al contrato de tarea la definición de terminado y el gate aplicable. | `:263-264` |
| 11 | Se añadió la regla de fusión de tareas (solo si comparten entregable, criterio y evidencia, y no pueden fallar por separado) junto al criterio de división. | `:190` |
| 12 | Se añadió al protocolo de comunicación el sentido y la cadencia de los mensajes (dueño→supervisor→orquestador; auditor→orquestador; informes al abrir, cerrar y bloquear). | `:354` |
| 13 | Se estableció que no se produce ningún entregable de la web antes del Gate 0. | `:172` |
| 14 | Se unificaron los nombres, responsables y transiciones de estado del tablero con la definición canónica de §8.1, incluida la regla de que el cierre lo registran supervisor y orquestador. | `:289-309` |

## 5. Mejoras residuales

| ID | Mejora residual | Severidad | Coste | Decisión y justificación |
|---|---|---|---|---|
| MR-1 | Los umbrales numéricos de accesibilidad y rendimiento se delegan a §9 (verificación). Si §9 no los fija, el criterio de aceptación queda incompleto. | Menor | Bajo (coordinación Lead/T4) | No se duplican aquí: el BRIEF asigna la verificación real y las reglas del proyecto a T4. Se eleva al Lead para que §9 fije el umbral concreto. |
| MR-2 | No se desarrollan plantillas completas de declaración de independencia, mensajes y contrato: se dan los campos mínimos y se referencian §6, §7 y §11. | Menor | Bajo | Desarrollarlas aquí duplicaría las plantillas de otras secciones. El contenido mínimo de §4.6 y §4.9 ya es ejecutable. |
| MR-3 | En entornos sin sistema de archivos, el tablero vive en la conversación y su integridad es más débil que un registro persistente. | Menor | Alto (requiere persistencia externa) | Mitigado con transiciones inmutables, PASS no heredado y fuente única de verdad. No es asequible dentro de este fragmento; queda declarado como limitación. |

No hay mejoras de severidad bloqueante, mayor o media abiertas. No se ocultan defectos.

## 6. Verificaciones objetivas realizadas

- Lectura completa del BRIEF: `tools/prompts/maestro-web-autocalidad/BRIEF.md` (150 líneas), en especial §0 (encargo), R1–R8 (`:26-39`), contrato T1 (`:47`), numeración (`:52-66`), rúbrica S1–S7 (`:69-82`), reglas de proceso (`:109-123`) e informe (`:134-144`).
- Lectura de las skills obligatorias: `skills/SKILL_MEJORADOR_PROMPT.md` (189 líneas; preguntas máx. 3 en `:41-44`, jerarquía de conflictos `:46-56`, criterios de calidad `:152-161`) y `skills/SKILL_director-orquestador-multiagente.md` (215 líneas; roles `:20-29`, gatekeeping y locks `:61-76`, reglas críticas `:208-215`).
- Comprobación de la versión congelada (PowerShell sobre el archivo): `BYTES=38748 NUEVAS_LINEAS=400 LINEAS=400 PALABRAS=6388 H1=4 H2=19 TABLAS=13 TABLAS_INCORRECTAS=0 SHA256=7b07c1b28b2316a9df7d6e02a07c36ee93eed939dd95d29093ccd480c75984f9 BLOQUEAD=0 BLOCKED=12 R_TAGS=0 MARCADORES=0 REFS=1,2,3,4,5,6,7,8,9,10,12`.
- Búsqueda exacta de marcadores prohibidos (`TODO`, `[pendiente]`, `BRIEF.md`, `meta-comentario`, `Este documento`): sin coincidencias.
- Comprobación de tablas: cada fila conserva el número de columnas del encabezado; 0 incidencias.
- Revisión cruzada del contrato T1 contra la checklist pública ST1 del supervisor (sin copiar texto de ella) y de coherencia con las secciones 2, 3 y 4 escritas por el equipo; se corrigieron huecos de cobertura, contrato, comunicación y estados.
- No se ejecutaron navegadores ni pruebas de web: el BRIEF §6.11 lo excluye expresamente para este encargo; la verificación aplicable es textual y de mecanismos de proceso.

## 7. Riesgos y supuestos de esta entrega

- Supuesto: el Lead conserva la numeración de secciones del BRIEF §3 (1–12). Si cambia, deben actualizarse las referencias cruzadas del fragmento.
- Supuesto: T2, T3 y T4 usarán la misma terminología de severidades, veredicto y estados. Mi fragmento remite a §6/§7/§8 en lugar de redefinirlos; los estados están alineados con §8.1.
- Riesgo: duplicidad con §11 si el Lead pega además plantillas completas de tablero o contrato; las tablas de §4.3–§4.5 son operativas y deben quedar una sola vez.
- Riesgo declarado: la autoevaluación es autoinformada; su calibración real la determina el supervisor independiente.

## 8. Historial del informe

| Versión | Fecha | Cambio |
|---|---|---|
| v1 | 2026-10-23 | Entrega inicial tras lectura del BRIEF y skills, escritura del fragmento, verificación mecánica y aplicación de las mejoras de §4. |
| v2 | 2026-10-23 | Ampliación proactiva de cobertura (brief, commit, auditoría, memoria), contrato (definición de terminado y gate), regla de fusión, comunicación con cadencia y Gate 0 sin entregables previos; recalculadas líneas y métricas. |
| v3 | 2026-10-23 | Alineación de estados y cierre del tablero con §8.1; independencia del auditor reforzada; paralelismo condicionado a autorización de contrato. |
| v4 | 2026-10-23 | Ronda 1 del supervisor: congelación de la versión final con SHA-256, métricas y referencias actualizadas; corrección de la deriva de versión (D1); verificación de denominación única BLOCKED (D2); historial y respuesta a defectos en §10. |

## 9. Decisión

**ENTREGO** la versión congelada v4 para la ronda 2 de supervisión independiente. No cierro `task-1`: queda en `in_progress` hasta el PASS de `supervisor-calidad-a` con 90 o más. Si recibo nuevos defectos, los corrijo, actualizo historial y autoevaluación, y aviso al supervisor, con un máximo de cinco rondas.

## 10. Respuesta a la ronda 1 del supervisor (ST1)

| Defecto | Severidad | Estado | Respuesta y evidencia |
|---|---|---|---|
| D1 — Deriva de versión entre autoevaluación y sección | Bloqueante | **Subsanado** | Reconocido el fallo: el informe enviado citaba la versión de 392 líneas y el supervisor leyó una posterior de 399; la causa fue seguir mejorando el fragmento después de reportar sin congelar el informe. Corrección: versión congelada v4 con SHA-256 `7b07c1b2…984f9`, 38.748 bytes, 400 líneas, 6.388 palabras, 13 tablas; todas las referencias de línea re-verificadas contra esta versión (tabla de variables `:28-46`, roles `:60-66`, cobertura 15 áreas `:206-220`, tabla de tareas `:233-234`, contrato `:250-264`, tablero `:273-309`, gates `:369-374`); añadidas las mejoras posteriores (nº 9–14 de §4). No se reescribió la sección: se completó y se congeló la versión. |
| D2 — Denominación alterna del estado de bloqueo | Menor | **Subsanado en la versión congelada** | La versión que revisó el supervisor mezclaba «BLOQUEADO/BLOQUEADA»; la versión actual tiene **una sola denominación**: 0 apariciones de «BLOQUEADO»/«BLOQUEADA» y 12 de «BLOCKED», alineadas con la definición canónica de §8.1 de la sección 3 y con el BRIEF (estado BLOCKED). Si el Lead decide otra etiqueta final, debe unificarse en §8.1 y propagarse; no en dos fragmentos. Evidencia: `BLOQUEAD=0 BLOCKED=12`. |

Ronda solicitada: re-verificación de D1 y D2 y regresión completa de la checklist T1-C01…T1-C18 sobre la versión congelada v4. Umbral intacto: 90,0.
