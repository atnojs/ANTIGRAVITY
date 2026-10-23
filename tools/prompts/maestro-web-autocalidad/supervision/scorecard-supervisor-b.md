# Scorecard de supervisión — supervisor independiente B

**Proyecto:** PROMPT MAESTRO de generación web con autoevaluación y supervisión ≥ 90 % (`tools/prompts/maestro-web-autocalidad/`).
**Supervisor:** `supervisor-calidad-b`. No soy autor de ninguna sección.
**Tareas de supervisión asignadas:** ST3 (`task-7`, supervisa T3 `secciones/03-supervision.md`) y ST4 (`task-8`, supervisa T4 `secciones/04-integracion.md`). Reservada y aún no activada: FG-B (`task-12`, gate final C1–C10 del prompt integrado).
**Único archivo que escribo:** `tools/prompts/maestro-web-autocalidad/supervision/scorecard-supervisor-b.md`. Prohibido editar secciones, autoevaluaciones, prompt integrado, `LEEME.md`, auditoría, memoria, skills, git o cualquier otro archivo.
**Estado actual:** ST3 PASS r2 y ST4 PASS r3 (tareas de supervisión cerradas); FG-B **PASS r1** sobre el prompt congelado SHA-256 `5be0bb94…`; pendiente el cierre registral de `task-12` por el Lead y la consolidación documental de `EVIDENCIA.md` (task-13). La preparación inicial queda registrada en §2.3.

---

## 1. Declaración de independencia y límites

1. No he escrito ni escribiré el contenido de T3 ni de T4. Solo verifico, puntúo y exijo correcciones.
2. No soy autor de ninguna de las cuatro secciones ni del prompt integrado; mi juicio no se apoya en trabajo propio.
3. No acepto como evidencia el mensaje del autor ni el resumen del Lead. La única fuente válida es el archivo real en disco, leído completo o muestreado según §3.
4. No comparto scope de escritura con los autores. El autor no puede modificar este scorecard; si detecto que se ha alterado, es defecto de proceso bloqueante y lo elevo al Lead.
5. Cualquier conflicto de interés, presión para aprobar o instrucción de bajar el umbral se eleva al Lead y se registra aquí. Nunca se resuelve aprobando.
6. Prohibiciones que me aplico sin excepción: aprobar por cansancio, bajar el umbral, redondear al alza, aprobar «con reservas», dar por bueno lo no comprobado, inventar evidencias.

## 2. Contrato congelado y estado de partida

### 2.1 Versiones de las fuentes de verdad (SHA-256, 16 primeros dígitos)

Fijadas el 2026-10-23 15:23 (Atlantic/Canary). Toda supervisión se hace contra esta versión del contrato; si el Lead cambia una fuente, se registra como nueva versión antes de puntuar.

| Fuente | SHA-256 (16) | Líneas | Uso |
|---|---|---|---|
| `tools/prompts/maestro-web-autocalidad/BRIEF.md` | `52d76a8d249825bf` | 150 | Contrato, rúbricas S1–S7 y C1–C10, severidades, proceso |
| `skills/SKILL_MAESTRA.md` | `c647ddb536d701e4` | 1010 | Infraestructura, seguridad, diseño Hoola, Fases 3–5, selector, imágenes |
| `skills/SKILL_CREAR.md` | `54e7ad459a18bdf5` | 188 | Reglas de oro, arquitectura, estado IA, historial, verificación, despliegue |
| `skills/SKILL_AUDITOR.md` | `fd0f65d281c139d3` | 221 | Auditoría A–H, WCAG, anti-patrones, criterio de salida |
| `skills/SKILL_CAPTURAS_VERIFICACION.md` | `710dcfcba7db9806` | 79 | Geometría real, 3 anchos, comparativa antes/después, URL desplegada |
| `skills/SKILL_VERIFICACION_PLAYWRIGHT.md` | `3b130d48ded3237b` | 87 | Flujo real, consola, red, descargas en disco, recarga |
| `skills/SKILL_MEJORADOR_PROMPT.md` | `983329f6e4a186f2` | 189 | Arquitectura de prompt, criterios de calidad, autonomía, adaptación |
| `skills/POLITICA_modelos-imagen.md` | `d8d729d33fb00220` | 36 | Modelo de imagen por defecto y catálogo |
| `claude.md` | `d00ffdb30ccb9834` | 109 | Reglas críticas del proyecto |
| `tools/memoria/MEMORIA.md` | `1609f9ed66c527f8` | 47 | Reglas de memoria |
| `tools/memoria/mapa.md` | `587863eaadf05bc2` | 83 | Índice tarea → skill |

### 2.2 Estado de las tareas en el tablero

| Tarea | Artefacto principal | Autoevaluación | Estado | Rondas usadas | Veredicto |
|---|---|---|---|---|---|
| ST3 | `secciones/03-supervision.md` | `autoevaluaciones/autor-supervision.md` | PASS en ronda 2; supervisión cerrada | 2 de 5 | PASS (2026-10-23) |
| ST4 | `secciones/04-integracion.md` | `autoevaluaciones/autor-integracion.md` | PASS en ronda 3; supervisión cerrada | 3 de 5 | PASS (2026-10-23) |
| FG-B | `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` + `LEEME.md` | `autoevaluaciones/lead-integrador.md` | PASS en ronda 1 del gate; cierre de `task-12` por el Lead | 1 de 5 | PASS (2026-10-23) |
| FG-B | `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` + `LEEME.md` | `autoevaluaciones/lead-integrador.md` | Reservada, no activada | 0 de 5 | Sin emitir |

### 2.3 Evidencia de partida

- `tools/prompts/maestro-web-autocalidad/` contiene a las 15:21 del 2026-10-23 únicamente `BRIEF.md`; `secciones/`, `autoevaluaciones/`, `supervision/` y `auditoria/` están vacíos.
- En la preparación no había ningún artefacto que puntuar; las rondas 1 de ST3 y ST4 constan en §7.5 y §8.6.
- Toda la preparación anterior está basada en lectura real de los archivos de §2.1, no en resúmenes de terceros.

---

## 3. Protocolo de verificación de evidencias

Se aplica igual en ST3, ST4 y FG-B.

1. **Fijar la versión:** SHA-256, número de líneas y fecha del archivo real; se registran en el bloque de ronda.
2. **Leer el archivo real completo**, nunca el mensaje del autor ni un resumen. Si el archivo se lee por partes, se declara qué parte no se leyó.
3. **Clasificar afirmaciones:** críticas (reglas numéricas, mecánicas obligatorias, reglas del proyecto, seguridad, evidencias, independencia, umbral) frente al resto (prosa, ejemplos, formato).
4. **Verificar el 100 % de las afirmaciones críticas:** localizar archivo:línea o fragmento, comprobar el contenido y contrastarlo con la fuente canónica (§2.1). No se admite «está claro» ni «lo dice».
5. **Muestrear ≥ 50 % del resto**, con selección declarada (plantillas, ejemplos, transiciones, anexos, formato). Se registra qué se muestreó y qué no.
6. **Comprobar la autoevaluación del autor por separado:** existencia, S1–S7 con nota, evidencia por criterio, mejoras residuales con severidad y coste, decisión ENTREGO / NO ENTREGO. Se contrastan el 100 % de sus afirmaciones críticas y ≥ 50 % del resto. Desviación de más de 10 puntos entre autoevaluación y verificación real = defecto de calibración (BRIEF §5).
7. **Buscar activamente las escapatorias:** contradicciones internas, referencias a secciones que no existen, TODOs o «[pendiente]», reglas inventadas, herramientas inexistentes, umbral rebajado, N/A discrecional, autoaprobación, evidencia declarada sin comprobar, aprobación con reservas.
8. **Reproducir lo reproducible:** comandos, hashes, recuentos y búsquedas de texto. Lo que no se pueda reproducir se declara limitación y no suma evidencia.
9. **Registrar solo lo comprobado.** Las celdas de evidencia citan archivo:línea o comando y salida. Lo no comprobado queda como «no verificado» y no puntúa.
10. **Sin evidencia = 0** en el criterio afectado (regla del BRIEF §3, T2). No se compensa una carencia con buena prosa.

---

## 4. Rúbrica S1–S7, cálculo y veredicto

### 4.1 Rúbrica (BRIEF §4)

| ID | Criterio | Peso | Crítico | Qué verifico en una sección |
|---|---|---:|---|---|
| S1 | Cumple completo el contrato de su sección (todo lo exigido, sin recortes) | 20 | Sí | Cada bloque contractual localizable y completo; nada inventado que sustituya a lo exigido |
| S2 | Corrección técnica y coherencia con el diseño global del prompt | 15 | Sí | No contradice BRIEF ni skills; referencias cruzadas y números correctos; terminología estable |
| S3 | Utilidad ejecutable: listo para integrar, sin ambigüedad operativa ni contradicciones | 15 | Sí | Plantillas rellenables y criterios operables; prueba de mesa superada; ningún paso imposible |
| S4 | Alineación literal con el encargo del usuario y con este BRIEF (R1–R8) | 15 | Sí | Requisitos asignados cubiertos, trazables y sin reinterpretar; el 90 % nunca se rebaja |
| S5 | Autoevaluación honesta y trazable: evidencias reales, mejoras residuales, calibración | 15 | Sí | Informe propio específico, evidencia por criterio, residuales con coste, decisión coherente |
| S6 | Claridad, concisión, formato y ausencia de relleno | 10 | No | Español, tablas y listas útiles, sin duplicar otras secciones, sin TODO ni emojis, longitud justificada |
| S7 | Resistencia al autoengaño y al gaming del propio proceso | 10 | No | La sección cierra escapatorias y no abre nuevas; el anti-gaming es verificable, no declamativo |

### 4.2 Fórmula y publicación

`total = Σ (nota_i × peso_i) / 10`. Se publica con un decimal.

**Regla de no redondeo al alza:** el veredicto se decide sobre el valor exacto. Si el valor exacto es menor que 90,00, el veredicto es REWORK aunque el decimal publicado muestre 90,0. Para que el cálculo sea auditable uso notas enteras o medias y publico el total exacto cuando esté cerca del umbral.

### 4.3 Condiciones de PASS (simultáneas, sin excepción)

1. Total exacto ≥ 90,00.
2. Ninguna nota S1–S7 < 7.
3. Todos los criterios críticos (S1–S5) ≥ 9.
4. Cero defectos bloqueantes, mayores o medios abiertos.
5. Como máximo 3 defectos menores documentados, con justificación de coste/beneficio.
6. Autoevaluación del autor presente, específica y no invalidada por calibración.

Si falla una sola condición: **REWORK**. No existe PASS parcial, condicional ni «con reservas».

### 4.4 Regla de las notas

- Cada nota se justifica con evidencia concreta; sin evidencia, la nota es 0 en el criterio afectado.
- No hay nota de cortesía. Un 9 exige contrato completo, cero contradicciones y evidencia reproducible, no solo ausencia de errores graves.
- No se puntúa el esfuerzo, la intención ni la estética. Se puntúa el artefacto.

---

## 5. Defectos, severidades y formato de solicitud de rework

### 5.1 Severidades (BRIEF §6.6)

| Severidad | Definición | Efecto en el veredicto |
|---|---|---|
| Bloqueante | Incumple un requisito del contrato, contradice el BRIEF, la evidencia es falsa o ausente, se rebaja el umbral o hay autosupervisión | PASS imposible |
| Mayor | Omisión relevante o ambigüedad que obliga a interpretar algo indispensable | PASS imposible |
| Medio | Defecto de uso con solución evidente (referencia cruzada errónea, término inconsistente que induce error) | PASS imposible |
| Menor | Estilo o documentación, sin impacto operativo | Máximo 3, justificados por coste/beneficio |

### 5.2 Formato obligatorio de cada defecto

```text
ID: D-ST3-01 (o D-ST4-01)
Severidad: Bloqueante / Mayor / Medio / Menor
Ubicación: archivo:línea o sección y fragmento citado
Esperado: qué exige el contrato o la fuente canónica (con su cita)
Observado: qué dice el artefacto (fragmento literal)
Evidencia: comprobación reproducible (lectura, búsqueda, comando y salida)
Acción requerida: cambio concreto y mínimo; qué NO debe tocarse
```

Reglas del rework: se envía al autor correspondiente (`autor-supervision` o `autor-integracion`) con todos los defectos numerados y copia-resumen al Lead. El autor corrige solo lo pedido y lo que se derive, actualiza changelog y autoevaluación, y avisa. No se reescribe la sección de cero sin justificarlo.

---

## 6. Rondas, escalado y cierre

1. **Máximo 5 rondas por tarea.** Cada ronda se registra con fecha, versión del artefacto (SHA-256 y líneas), notas, defectos y veredicto.
2. **Re-verificación tras cada corrección:** 100 % de los defectos señalados + regresión (que lo antes correcto siga correcto) + muestreo del resto según §3.
3. **Sin PASS tras 5 rondas:** elevo al Lead con informe (historial de defectos, causa raíz, rondas, opciones: reasignar, dividir alcance o declarar BLOCKED). No apruebo.
4. **Escalado inmediato** si: el autor no responde en una ronda, hay desacuerdo técnico, no puedo verificar una afirmación crítica, detecto evidencia falsa o se intenta alterar el umbral o este scorecard.
5. **PASS:** aviso al Lead y cierro `task-7`/`task-8` con el scorecard firmado. No cierro antes de PASS ni delego la firma.
6. **Gate final FG-B:** mismas reglas con C1–C10. Si mi total difiere en más de 5 puntos del de `supervisor-calidad-a`, se reconcilia con evidencias antes de emitir veredicto (BRIEF §5). Ningún supervisor puede ser aprobado por encima de su propio veredicto.
7. **Registro de comunicaciones:** cada envío relevante (aviso, defectos, PASS, escalado) se anota en la bitácora de §10 con fecha y destinatario.

---

## 7. ST3 — Supervisión de T3 (`secciones/03-supervision.md`)

### 7.1 Rúbrica aplicada a T3

Se usa la rúbrica de §4. Focos específicos para T3:

- **S1:** los diez bloques del contrato T3 del BRIEF §3 están completos y localizables.
- **S2:** no reescribe la rúbrica universal (§6 del prompt final) ni las reglas del proyecto (§9); referencias y numeración (§7–§8) correctas; no contradice T1, T2 ni T4.
- **S3:** con solo T3 se puede supervisar una tarea real: rellenar scorecard, listar defectos, emitir veredicto y conducir un rework sin interpretar nada.
- **S4:** cubre R4, R5, R6 y R7 con mecanismos explícitos; contribuye a R1 y R2 vía comprobación de autoevaluación; R8 vía auditoría end-to-end.
- **S5:** `autoevaluaciones/autor-supervision.md` es específico, con evidencias reales y decisión honesta.
- **S6:** sin duplicidades con §6 y §9, sin meta-comentarios, sin TODOs, sin emojis.
- **S7:** la mecánica cierra gaming del autor y del supervisor (evidencia fabricada, autoevaluación inflada, scope drift, aprobación por cansancio, umbral rebajado).

### 7.2 Lista de comprobación del contrato T3

Origen: BRIEF §3 (fila T3), §4, §5 y §6; contrato de `task-3`. La columna «Estado» conserva el valor de preparación; el resultado real de la ronda 1 está en §7.5: verificación completa, incumplimientos D-ST3-01 a D-ST3-03 y resto conforme.

| ID | Comprobación | Nivel | Criterio de aceptación | Estado | Evidencia |
|---|---|---|---|---|---|
| T3-01 | Independencia del supervisor | Contrato | Supervisor ≠ autor; no edita la sección; conflicto de interés declarado y resuelto por elevación, nunca por autoaprobación; si no hay independencia posible, se escala | PENDIENTE | — |
| T3-02 | Objeto de la verificación | Contrato | Define qué verifica: afirmaciones del autor, evidencias, autoevaluación, cumplimiento del contrato de tarea y del scope; nada queda fuera por omisión | PENDIENTE | — |
| T3-03 | Reproducción de evidencias | Contrato | No se fía de lo declarado: se abren archivos, se ejecutan comandos, se comprueban líneas y resultados; la evidencia no reproducible no cuenta | PENDIENTE | — |
| T3-04 | Muestreo cuantificado | Contrato | 100 % de afirmaciones críticas y ≥ 50 % del resto, con criterio de selección y registro de lo muestreado | PENDIENTE | — |
| T3-05 | Comprobación de la autoevaluación | Contrato | Verifica existencia, evidencia por criterio, notas frente a evidencia y calibración; desviación > 10 puntos = defecto de calibración | PENDIENTE | — |
| T3-06 | Puntuación independiente | Contrato | Usa la rúbrica universal por referencia (no la redefine), una nota por criterio con evidencia, total calculado y un decimal | PENDIENTE | — |
| T3-07 | Reglas de puntuación | Contrato | Sin evidencia = 0; sin redondeo al alza; criterios críticos ≥ 9; ninguna nota < 7 | PENDIENTE | — |
| T3-08 | Veredicto PASS/REWORK | Contrato | Condiciones completas y binarias (≥ 90,00 exacto; críticas ≥ 9; ninguna < 7; cero B/M/Med; ≤ 3 menores justificados); veredicto firmado y fechado | PENDIENTE | — |
| T3-09 | Registro de defectos | Contrato | Numerados y con severidad, ubicación, esperado, observado, evidencia y acción; PASS exige cero B/M/Med abiertos | PENDIENTE | — |
| T3-10 | Plantillas | Contrato | Scorecard de supervisor, listado de defectos y solicitud de rework, rellenables y sin campos ambiguos | PENDIENTE | — |
| T3-11 | Bucle de rework | Contrato | Máx. 5 rondas; feedback dirigido; changelog del autor; re-verificación completa de defectos + regresión; re-puntuación y nueva versión identificada | PENDIENTE | — |
| T3-12 | Escalado y desempate | Contrato | Rutas para agotamiento de rondas, desacuerdo, imposibilidad de verificar y bloqueo; decisión del orquestador, reasignación o segundo supervisor; queda registrado | PENDIENTE | — |
| T3-13 | Prohibición de bajar el umbral | Contrato | Lista explícita: no bajar, no redondear al alza, no aprobar con reservas, no aprobar por cansancio, no N/A discrecional, no evidencia declarada sin comprobar; consecuencia definida si ocurre | PENDIENTE | — |
| T3-14 | Auditoría end-to-end final | Contrato | Auditor independiente de los supervisores de tarea; verifica el conjunto, no tareas aisladas; reproduce el flujo completo; puede vetar; su veredicto se registra | PENDIENTE | — |
| T3-15 | Verificación del proceso y anti-gaming | Contrato | Audita scorecards completos, rondas, orden de gates, independencia, umbral intacto y evidencias reproducibles; sanciona gaming (autoevaluación inflada, evidencia fabricada, scope drift, rubber-stamping) | PENDIENTE | — |
| T3-16 | Referencias y no duplicación | Coherencia | Remite a §6 (rúbrica universal) y §9 (reglas del proyecto) sin copiarlas; usa la numeración §7–§8 del BRIEF | PENDIENTE | — |
| T3-17 | Coherencia con T1, T2 y T4 | Coherencia | Mismos roles, términos (tarea, gate, PASS/REWORK, evidencia, BLOCKED), fases y números; sin contradicciones con el BRIEF ni con las otras secciones | PENDIENTE | — |
| T3-18 | Autoevaluación del autor T3 | Proceso | `autoevaluaciones/autor-supervision.md` existe, S1–S7 con nota, evidencias reales (ruta + fragmento), mejoras residuales con severidad y coste, decisión ENTREGO / NO ENTREGO | PENDIENTE | — |
| T3-19 | Claridad y formato | Coherencia | Español directo, plantillas y tablas útiles, sin relleno, sin TODO, sin emojis, sin pseudocódigo, sin meta-comentarios | PENDIENTE | — |

### 7.3 Consistencia numérica y cruzada (obligatoria, 100 %)

| Regla canónica | Valor exigido | Dónde debe aparecer en T3 | Estado |
|---|---|---|---|
| Umbral de aprobación | 90,00 exacto, en todos los niveles | T3-07, T3-08, T3-13 | PENDIENTE |
| Criterios de la rúbrica | 10 criterios, pesos suman 100, críticos ≥ 9 | Referencia a §6, sin duplicar | PENDIENTE |
| Notas | Sin redondeo al alza; una decimal; sin evidencia = 0 | T3-06, T3-07 | PENDIENTE |
| Rondas | Máximo 5 por tarea | T3-11, T3-12 | PENDIENTE |
| Calibración | Desviación > 10 puntos = defecto | T3-05 | PENDIENTE |
| Defectos | Cero B/M/Med para PASS; máximo 3 menores justificados | T3-08, T3-09 | PENDIENTE |
| Muestreo | 100 % críticas + ≥ 50 % resto | T3-04 | PENDIENTE |
| Auditoría | Independiente de los supervisores de tarea | T3-14 | PENDIENTE |

### 7.4 Prueba de mesa parcial de T3

Ejercicio obligatorio antes de puntuar S3: con solo T3, supervisar una tarea ficticia con (a) autoevaluación inflada 2 puntos por encima de la evidencia, (b) un defecto mayor oculto, (c) evidencia declarada sin archivo. Debe ser posible, sin interpretar nada: declarar independencia, muestrear, puntuar cada criterio, numerar los defectos, emitir REWORK y pedir la corrección. Cualquier dato imprescindible que falte o cualquier regla que obligue a decidir «a criterio» es defecto (S3, mínimo Medio; Mayor si impide emitir veredicto).

### 7.5 Registro por ronda de ST3

**Puntuaciones:**

| Ronda | Fecha | S1 | S2 | S3 | S4 | S5 | S6 | S7 | Total exacto |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 — preparación | 2026-10-23 | — | — | — | — | — | — | — | N/A |
| 1 | 2026-10-23 15:40 | 9,5 | 8,5 | 9,0 | 9,5 | 8,5 | 9,0 | 9,5 | 90,75 (publicado 90,7 truncado) |
| 2 | 2026-10-23 15:50 | 9,5 | 9,3 | 9,4 | 9,5 | 9,2 | 9,0 | 9,5 | 93,60 |
| 3 | | | | | | | | | |
| 4 | | | | | | | | | |
| 5 | | | | | | | | | |

**Registro narrativo y veredicto:**

| Ronda | Artefacto y versión | Autoevaluación comprobada | Defectos abiertos | Evidencias reproducidas | Veredicto | Acción |
|---|---|---|---|---|---|---|
| 0 — preparación | No existe `secciones/03-supervision.md` a las 15:23 | No existe a las 15:23 | Ninguno | Directorio vacío; BRIEF y skills fijados por SHA-256 (§2.1) | N/A (preparación) | Esperar aviso del Lead con el borrador |
| 1 | `03-supervision.md` SHA-256 `88feaa22e39c3916…` (611 líneas, 63.886 caracteres, mtime 15:33:38) + `autor-supervision.md` SHA-256 `27369272fd5a244f…` (177 líneas) | Sí: declara 94,0 y sus evidencias mecánicas se reprodujeron; la decisión ENTREGO es incoherente con su propio límite de 3 menores (D-ST3-02) | D-ST3-01 (mayor), D-ST3-02 (medio), D-ST3-03 (medio) | Lectura completa de T3 y su autoevaluación; reproducidos 611 líneas, 63.886 caracteres, 37 encabezados (38 con el título), 0 reglas de proyecto (`Antigravity`, `Hostinger`, `Electrolize`, `00D0D0`, `apps/`, `skills/`, `tools/memoria`, `git commit`, `proxy.php`), 0 rutas personales/URLs, 0 TODO/FIXME, 0 emojis, 17 patrones anti-gaming, 14 prohibiciones del supervisor, 12 del bucle, 5+5 plantillas; contraste con BRIEF, T1, T2 y T4 | REWORK | Enviar defectos a `autor-supervision` con copia al Lead; esperar ronda 2 |
| 2 | `03-supervision.md` SHA-256 `a0beb5c69dd22e22…` (614 líneas, 65.404 caracteres, mtime 15:45:42) + `autor-supervision.md` SHA-256 `2732c03499c691da…` (174 líneas) | Sí: declara 93,3, tres menores (M1–M3), M4/M5 reclasificadas y decisión coherente; mecánica reproducible | Ninguno: D-ST3-01, D-ST3-02 y D-ST3-03 cerrados | Lectura completa de T3 y su autoevaluación; reproducidos 614 líneas, 65.404 caracteres, 37 encabezados sin el título, 0 reglas de proyecto, 0 rutas/URLs, 0 TODO/FIXME, 0 emojis, 0 nombres de rol retirados; plantillas con escala 0–100 en 7.12.2/7.12.5 y registro con `Total (0–100)` en 8.8.3; tres mejoras residuales y M4/M5 reclasificadas; contraste de roles con §1.4 (T1:60-66) y de la escala con T2 y esta rúbrica | PASS | Notificar al Lead; el cierre de `task-3` corresponde al Lead |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |

#### Defectos de la ronda 1 de ST3

| ID | Severidad | Ubicación | Esperado | Observado | Evidencia de reproducción | Acción exigida |
|---|---|---|---|---|---|---|
| D-ST3-01 | Mayor | `03-supervision.md:251-252` y `:298`; contraste en `:167`, `:180`, `:259`, `:601` | Una sola escala en todas las plantillas: notas por criterio 0–10 y total ponderado 0–100 truncado a un decimal (umbral 90,0); el total no se rotula como `/10` | Las plantillas escriben «Puntuación provisional ciega: <X,X>/10», «Puntuación final independiente: <X,X>/10» y «REWORK (<total>/10)», mientras la fórmula exigida es `Σ(nota × peso)/10` con umbral 90,0 (94,0/100 frente a 9,4/10) | Lectura de T3:167, 180, 251-252, 259, 298, 601; cálculo de ejemplo de la propia autoevaluación (94,0) | Unificar la notación en 7.12.2 y 7.12.5: por criterio 0–10, total 0–100 truncado; añadir una fila de ejemplo que lo demuestre |
| D-ST3-02 | Medio | `autoevaluaciones/autor-supervision.md:41, 145-155, 167`; contraste en `03-supervision.md:184, 208, 602` | Como máximo 3 mejoras residuales menores abiertas y decisión coherente; el resto se corrige o se reclasifica como supuesto/decisión de integración no defectuosa | Declara **cinco** mejoras residuales menores (M1–M5), afirma «sin defectos conocidos abiertos» y decide ENTREGO; la propia T3 fija el máximo de 3 menores para el PASS | Autoeval:41, 145-155, 167; T3:184, 208, 602; BRIEF:71 | Reducir a ≤3 (M3–M5 pueden ser supuestos/decisiones, M1–M2 notas de integración), ejecutar lo asequible, actualizar autoevaluación y decisión |
| D-ST3-03 | Medio | `03-supervision.md:30-32`; contraste con `01-nucleo.md:60-66` y `:250-264` | Inventario de roles único: «Auditor final» debe ser el «Auditor end-to-end» de §1.4 o declararse equivalente; los roles nuevos deben figurar en §1.4 y su designación en el contrato §4.4 | Introduce «Verificador de producto» y «Segundo supervisor» y renombra «Auditor final»; §1.4 no los contiene y §4.4 no tiene campo para designar verificador | T3:30-32; T1:60-66; T1:250-264 | Alinear nombres con §1.4 y dejar instrucción explícita al integrador para ampliar §1.4/§4.4, o usar solo roles ya definidos |

#### Defectos de la ronda 2 de ST3

| ID (ronda 1) | Severidad | Estado en ronda 2 | Verificación | Evidencia |
|---|---|---|---|---|
| D-ST3-01 | Mayor | CERRADO | Escala única: notas por criterio 0–10 y total 0–100 truncado; sin totales rotulados `/10` en las plantillas; ejemplo de escala añadido | T3:167, 251-252, 257, 260, 275, 301, 552; autoeval:20 |
| D-ST3-02 | Medio | CERRADO | Declara exactamente 3 menores (M1–M3) con coste/beneficio; M4 y M5 pasan a decisiones/supuestos no defectuosos; decisión coherente con el límite | autoeval:38, 145-165; T3:184, 208, 605 |
| D-ST3-03 | Medio | CERRADO | Tabla 7.2 solo con denominaciones de §1.4; 0 ocurrencias de los nombres retirados; la verificación se asigna al «dueño de la tarea de verificación» dentro de «Autores y especialistas» y el desempate a un segundo firmante de «Supervisores independientes» | T3:7, 25-33, 43, 109, 339, 399, 496-500; T1:60-66; búsquedas = 0 |
| — | — | Sin defectos nuevos | La lectura completa de las 614 líneas no detecta regresiones ni nuevas contradicciones; el barrido mecánico reproduce las cifras del autor | §7.6 |

### 7.6 Evidencias verificadas de ST3

- **2026-10-23, preparación:** leído `BRIEF.md` completo (150 líneas); contrato T3 localizado en BRIEF §3; rúbrica S1–S7 en §4; severidades y proceso en §6; referencias en §7. Skills no específicas de T3 leídas para coherencia: `SKILL_MEJORADOR_PROMPT.md` (189 líneas). Hash de todas las fuentes en §2.1.
- **2026-10-23 15:40, ronda 1:** leído `03-supervision.md` completo (611 líneas) y `autor-supervision.md` completo (177 líneas), más contraste con `01-nucleo.md`, `02-rubrica.md` y `04-integracion.md`. Se fijó la versión: T3 SHA-256 `88feaa22e39c3916c75a696a645e9b8b400ea8f0aedffb76d7b8d540a0e56628` (mtime 15:33:38); autoeval SHA-256 `27369272fd5a244fb98be6201b5aacd9feb9da312d84ecb758c320c1a4184430`. Reproducciones: 611 líneas; 63.886 caracteres (`(Get-Content -Raw).Length`); 37 encabezados sin contar el título (38 con él); 0 coincidencias de `Antigravity`, `Hostinger`, `Electrolize`, `00D0D0`, `apps/`, `skills/`, `tools/memoria`, `git commit`, `proxy.php`, `E:\`, `C:\`, `http://`, `https://`; 0 TODO/FIXME en mayúsculas; 0 emojis; 17 patrones anti-gaming (7.15), 14 prohibiciones del supervisor (7.13), 12 del bucle (8.9), plantillas 7.12.1–7.12.5 y 8.8.1–8.8.5; aritmética de la autoevaluación comprobada (940,0/10 = 94,0). Contraste de calibración: 90,75 independiente frente a 94,0 del autor = diferencia 3,25, por debajo de 10 (no hay defecto de calibración). Contraste de roles y numeración con T1/T2/T4: hallazgos D-ST3-03 y D-ST3-01.
- **2026-10-23 15:50, ronda 2:** leídos `03-supervision.md` (614 líneas) y `autor-supervision.md` (174 líneas) completos. Versión fijada: T3 SHA-256 `a0beb5c69dd22e2250d9d16c5a685e7d476e5232998c0a0521416d58583caf6c` (mtime 15:45:42); autoeval SHA-256 `2732c03499c691da07c0cc1dcdea573d53300c93bc2916c493ad74e3c0339d36`. Reproducciones: 614 líneas, 65.404 caracteres, 37 encabezados sin el título, 0 coincidencias de las reglas de proyecto y de rutas/URLs, 0 TODO/FIXME, 0 emojis, 0 nombres de rol retirados; plantillas 7.12.2/7.12.5 con total 0–100 y registro 8.8.3 con `Total (0–100)`; tres mejoras residuales M1–M3 y M4/M5 reclasificadas; lectura completa de 7.13–8.10 sin regresiones; roles contrastados con `01-nucleo.md:60-66` y `:250-264`. Calibración: 93,60 independiente frente a 93,3 del autor = diferencia 0,30 (sin defecto de calibración).
- **Limitaciones declaradas:** no se ha leído `skills/SKILL_director-orquestador-multiagente.md` (solo se verificó su existencia y sus 215 líneas citadas); no es necesario para puntuar porque T3 no cita sus reglas y no se ha detectado dependencia de ellas. La evidencia mecánica del autor se reprodujo; la de navegador no aplica (`BRIEF:121`). La integración con T4 quedó alineada en su ronda 3: T4 ya usa «dueño de la tarea de verificación» (rol «Autores y especialistas»), sin citar «verificador de producto».

### 7.7 Veredicto ST3

**PASS — ronda 2 (2026-10-23).** Total exacto 93,60; S1 9,5 · S2 9,3 · S3 9,4 · S4 9,5 · S5 9,2 · S6 9,0 · S7 9,5. Ninguna nota <7; críticas S1–S5 ≥9; cero defectos bloqueantes, mayores o medios abiertos; tres menores (M1–M3) justificadas con coste/beneficio; D-ST3-01, D-ST3-02 y D-ST3-03 cerrados con evidencia. PASS ligado a la versión SHA-256 `a0beb5c69dd22e2250d9d16c5a685e7d476e5232998c0a0521416d58583caf6c`; cualquier cambio posterior lo invalida. El cierre de `task-3` corresponde al Lead. La integración con T4 quedó resuelta: T4 ronda 3 usa el mismo rol («dueño de la tarea de verificación») y ya no cita «verificador de producto».

---

## 8. ST4 — Supervisión de T4 (`secciones/04-integracion.md`)

### 8.1 Rúbrica aplicada a T4

Se usa la rúbrica de §4. Focos específicos para T4:

- **S1:** los bloques del contrato T4 del BRIEF §3 están completos (verificación real, reglas y skills del proyecto, arquitectura mínima, estilo Hoola, imagen 2, persistencia server-side, git main push y producción, memoria, formato de entrega, BLOCKED, anexo y adaptación).
- **S2:** cada regla de proyecto citada existe en `claude.md` o en las skills (§8.3); ninguna contradice a otra; referencias y numeración (§9, §10, §12) correctas; no duplica la mecánica de autoevaluación ni la de supervisión.
- **S3:** un ejecutor externo puede recorrer la Fase 5 de verificación y la Fase 6 de entrega sin ambigüedad: pasos, responsables, evidencia exigida y criterio de cierre.
- **S4:** cubre R8 (verificación real de la web) y R3 (cobertura del ciclo web) con mecanismos explícitos; sostiene R6 y R7 desde la entrega y el estado BLOCKED.
- **S5:** `autoevaluaciones/autor-integracion.md` es específico, con evidencias reales y decisión honesta.
- **S6:** sin duplicar §5–§8 ni copiar skills enteras; sin TODO, sin emojis, sin rutas personales que rompan la autosuficiencia.
- **S7:** cierra la entrega sin verificación, la entrega disfrazada, el «funciona en local», la evidencia declarada y el commit sin push.

### 8.2 Lista de comprobación del contrato T4

Origen: BRIEF §3 (fila T4), §2 (R1–R8), §5, §6, `claude.md`, skills de §2.1 y contrato de `task-4`. La columna «Estado» conserva el valor de preparación; el resultado real está en §8.6: ronda 1 con D-ST4-01 a D-ST4-07; ronda 2 con D-ST4-01/02/04/05/06/07 cerrados y D-ST4-03 abierto; ronda 3 con D-ST4-03 cerrado y sin defectos abiertos.

| ID | Comprobación | Nivel | Criterio de aceptación | Estado | Evidencia |
|---|---|---|---|---|---|
| T4-01 | Fase de verificación real en navegador | Contrato | Se abre la URL desplegada en Chrome y se recorre el flujo completo del usuario (clics, navegación, formularios, subida); no se acepta leer código, diff ni HTML servido como prueba | PENDIENTE | — |
| T4-02 | Consola y red | Contrato | Consola revisada y errores propios corregidos o documentados; peticiones 4xx/5xx propias identificadas | PENDIENTE | — |
| T4-03 | Descargas en disco | Contrato | Tras la descarga, el fichero aparece en disco y su contenido es válido (JSON parseado si aplica); no basta el clic | PENDIENTE | — |
| T4-04 | Recarga, sesión y estados | Contrato | Recarga y estado se conservan; estados vacío, carga, error y reintento comprobados; el fallo conserva la entrada del usuario | PENDIENTE | — |
| T4-05 | Responsive real | Contrato | Tres anchos (360, 390, 768, 1440; mínimo tres) con captura, sin scroll horizontal accidental; escritorio, tablet y móvil | PENDIENTE | — |
| T4-06 | Lighthouse y accesibilidad | Contrato | Auditoría completa A–H con 100 % de ítems aplicables resueltos o N/A justificado; contraste, teclado, foco, alt, labels, aria-live, WCAG 2.1 A/AA | PENDIENTE | — |
| T4-07 | Evidencia visual | Contrato | Capturas de cada paso, comparativa antes/después etiquetada, captura de la URL desplegada y tabla de medidas; el resultado se enseña, no se describe | PENDIENTE | — |
| T4-08 | Skills obligatorias del proyecto | Contrato | Lista explícita y momento de carga: `crear`, `maestra-produccion-antigravity`, `capturas-verificacion`, `verificacion-playwright`, `auditor-lighthouse-accesibilidad`, `style-guide-antigravity`, `history-server`, `arquitecto-backend-php-hostinger`; Fases 4 y 5 obligatorias | PENDIENTE | — |
| T4-09 | Arquitectura mínima | Contrato | `apps/<nombre>/` con `index.html`, `app.css`, `app.js`, `proxy.php`, `history.php`, `history-manager.js`, `assets/`; se copian los tres archivos canónicos | PENDIENTE | — |
| T4-10 | Proxy y seguridad | Contrato | `proxy.php` es el único punto servidor; claves solo desde entorno (`getenv`, `REDIRECT_`, `$_SERVER`, `$_ENV`); validación cerrada de acciones, modelos y parámetros; sin URL remota arbitraria; sin claves en frontend ni en git | PENDIENTE | — |
| T4-11 | Historial server-side | Contrato | `history-manager.js` + `history.php`; `load()` al iniciar; `save/delete/clear`; servidor como fuente de verdad (no `localStorage`); errores visibles; `history_store/` no versionado; verificado tras recarga y en otra sesión | PENDIENTE | — |
| T4-12 | Estilo Hoola | Contrato | Cian `#00D0D0`, verde `#26C626`, Electrolize, glassmorphism; tokens, fondo, paneles, bordes y radios coherentes; overlay de IA con tres aros, texto exacto, barra indeterminada, `role=status`, `aria-live`, `aria-busy`; responsive | PENDIENTE | — |
| T4-13 | Imágenes OpenAI image 2 | Contrato | Por defecto `openai-image-2-low` (`gpt-image-2`, `low`); IDs del catálogo sin inventar; selectores de calidad, relación de aspecto y resolución 512/1024/2048/4096 si la app genera o edita imágenes; edición por `/v1/images/edits` multipart sin `response_format`; persistir antes de que caduque la URL firmada | PENDIENTE | — |
| T4-14 | Git, push y producción | Contrato | Solo rama `main`, sin ramas ni worktrees; commit aislado de los archivos del encargo; push obligatorio (despliega Hostinger); `git log --oneline origin/main..HEAD` vacío; versión servida comprobada (hash, tamaño o marcador) y no caché antigua; URL real recorrida | PENDIENTE | — |
| T4-15 | Memoria del proyecto | Contrato | Actualiza `tools/memoria/` cuando aporta algo replicable o tras resolver un error, antes de terminar; sin valores de claves; puntero, no copia; plantilla de `MEMORIA.md` | PENDIENTE | — |
| T4-16 | Formato de entrega final | Contrato | Tabla de tareas con dueño, veredicto y nota ≥ 90; evidencias y capturas; riesgos residuales y limitaciones; URL de producción; commit; puntuaciones; entrega visual al usuario | PENDIENTE | — |
| T4-17 | Regla BLOCKED | Contrato | Estado BLOCKED definido con formato, causas válidas y escalado; prohibido entregar disfrazado, aprobar con reservas o callar lo no verificado | PENDIENTE | — |
| T4-18 | Anexo de uso y adaptación | Contrato | Ejemplo de uso compacto y adaptación fuera de Antigravity: variables definidas, qué es obligatorio y qué sustituible, sin depender de ficheros ni rutas inexistentes en el destino | PENDIENTE | — |
| T4-19 | Referencias y no duplicación | Coherencia | Remite a §5–§8 sin repetir la mecánica de autoevaluación/supervisión; usa la numeración §9–§12 del BRIEF; no redefine la rúbrica | PENDIENTE | — |
| T4-20 | Coherencia con T1, T2 y T3 | Coherencia | Mismos roles, términos y números; la evidencia que exige es coherente con la que verifica T3; sin contradicciones con el BRIEF | PENDIENTE | — |
| T4-21 | Sin reglas ni herramientas inventadas | Coherencia | Cada regla citada existe en `claude.md` o en una skill; herramientas reales (Chrome, `playwright-cli`, PHP, git) o alternativa declarada; sin pseudocódigo, sin capacidades supuestas | PENDIENTE | — |
| T4-22 | Autoevaluación del autor T4 | Proceso | `autoevaluaciones/autor-integracion.md` existe, S1–S7 con nota, evidencias reales (ruta + fragmento), mejoras residuales con severidad y coste, decisión ENTREGO / NO ENTREGO | PENDIENTE | — |
| T4-23 | Claridad y formato | Coherencia | Español directo, tablas y listas útiles, sin relleno, sin TODO ni `[pendiente]`, sin emojis, sin meta-comentarios, longitud proporcionada | PENDIENTE | — |

### 8.3 Contraste obligatorio con skills y reglas del proyecto

Cada fila se comprueba contra la cita canónica y se marca VERIFICADO, OMITIDO, CONTRADICHO o NO APLICA. Un dato inventado o una fase obligatoria omitida es defecto Mayor como mínimo; si afecta al suelo del 90 % o permite entrega sin verificación, es Bloqueante.

| Fuente | Regla canónica que T4 no puede omitir ni contradecir | Cita | Estado |
|---|---|---|---|
| `claude.md` | Prueba real en navegador con flujo completo y descargas en disco; skill maestra Fases 4–5; commit + push + comprobar versión en producción; image 2 low; Hoola; responsive; selectores calidad + formato + resolución; historial PHP; sin claves; solo `main`; no versionar pruebas | `claude.md:88-109` | PENDIENTE |
| `SKILL_CREAR.md` | Seis pasos; arquitectura `apps/<nombre>/`; estado «PROCESANDO» y overlay de tres aros; historial server-side; lightbox; verificación visual con capturas; auditoría Lighthouse; git add/commit/pull/push | `SKILL_CREAR.md:37-188` | PENDIENTE |
| `SKILL_MAESTRA.md` | Infraestructura obligatoria (proxy, history, manager); claves solo entorno; Fases 4 y 5; diseño Hoola detallado; overlay de IA; panel de historial; catálogo de imágenes; caché de estáticos y comprobación de URL publicada | `SKILL_MAESTRA.md:52-122`, `:124-195`, `:196-458`, `:459-535`, `:805-819` | PENDIENTE |
| `SKILL_AUDITOR.md` | Secciones A–H; 100 % de ítems aplicables; anti-patrones de la sección H; contraste `#64748b` → `#94a3b8`; reporte de auditoría | `SKILL_AUDITOR.md:19-189` | PENDIENTE |
| `SKILL_CAPTURAS_VERIFICACION.md` | Geometría real en Chrome; anchos de escritorio, tablet y móvil; comparativa antes/después; captura de URL desplegada; tabla de medidas; limpieza | `SKILL_CAPTURAS_VERIFICACION.md:12-79` | PENDIENTE |
| `SKILL_VERIFICACION_PLAYWRIGHT.md` | URL desplegada; flujo con clics y teclado; formularios; descargas comprobadas en disco; consola y red; recarga; tres anchos; sesión cerrada | `SKILL_VERIFICACION_PLAYWRIGHT.md:20-59` | PENDIENTE |
| `POLITICA_modelos-imagen.md` | `openai-image-2-low` como modelo por defecto; catálogo vigente; edición multipart sin `response_format`; no cambiar modelo por defecto | `POLITICA_modelos-imagen.md:15-36` | PENDIENTE |
| `tools/memoria/MEMORIA.md` | Obligación de escribir memoria; sin valores de claves; «verificable o no entra»; plantilla de entrada | `tools/memoria/MEMORIA.md:24-47` | PENDIENTE |
| `tools/memoria/mapa.md` | Índice tarea → skill (`crear`, `capturas-verificacion`, `verificacion-playwright`, `auditor-lighthouse-accesibilidad`, `style-guide-antigravity`, `history-server`, `arquitecto-backend-php-hostinger`) | `tools/memoria/mapa.md:48-76` | PENDIENTE |

Riesgo específico ya detectado a vigilar: `SKILL_MAESTRA.md` incluye en su catálogo `gemini-2` y `SKILL_CREAR.md` no; `SKILL_MAESTRA.md:463` cita «verificado en producción el 2026-09-28» y `POLITICA_modelos-imagen.md` es la fuente vigente. Si T4 reproduce un catálogo, debe coincidir con `POLITICA_modelos-imagen.md` en lo esencial (`openai-image-2-low` por defecto) y no inventar IDs; detallar de más sin contradecir no es defecto.

### 8.4 Coherencia cruzada y trazabilidad de T4

| Regla canónica | Valor exigido | Dónde debe aparecer en T4 | Estado |
|---|---|---|---|
| Umbral de aprobación | 90,00 exacto, sin rebaja | T4-16, T4-17 | PENDIENTE |
| Rondas y veredicto | Coherente con §7–§8; sin duplicar la mecánica | T4-19, T4-20 | PENDIENTE |
| Criterios de rúbrica | 10 criterios, pesos suman 100, críticas ≥ 9 | T4-19 (referencia a §6) | PENDIENTE |
| Verificación real | Navegador, consola, red, descargas en disco, recarga | T4-01 a T4-04 | PENDIENTE |
| Responsive y accesibilidad | Tres anchos + auditoría A–H al 100 % | T4-05, T4-06 | PENDIENTE |
| Estilo y estado IA | Hoola y overlay canónicos | T4-12 | PENDIENTE |
| Imágenes | `openai-image-2-low` por defecto y selectores completos | T4-13 | PENDIENTE |
| Persistencia | Servidor como fuente de verdad | T4-11 | PENDIENTE |
| Publicación | `main`, commit, push y comprobación de producción | T4-14 | PENDIENTE |
| Entrega y bloqueo | Formato con evidencias y BLOCKED sin entrega disfrazada | T4-16, T4-17 | PENDIENTE |
| Trazabilidad R1–R8 | R8 y R3 cubiertos por T4; R6 y R7 sostenidos desde entrega y BLOCKED | T4-20 y matriz del prompt final | PENDIENTE |

### 8.5 Prueba de mesa parcial de T4

Ejercicio obligatorio antes de puntuar S3: con solo T4, verificar una app ficticia y cerrar la entrega. Debe ser posible saber: quién verifica, en qué URL, con qué herramienta, qué evidencia exacta se exige, cuándo se declara producción, qué se hace si no se puede verificar (BLOCKED) y cómo se entrega al usuario. Cualquier paso imposible, herramienta supuesta o evidencia no verificable es defecto (Medio; Mayor si impide cerrar o permite entregar sin verificar).

### 8.6 Registro por ronda de ST4

**Puntuaciones:**

| Ronda | Fecha | S1 | S2 | S3 | S4 | S5 | S6 | S7 | Total exacto |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 — preparación | 2026-10-23 | — | — | — | — | — | — | — | N/A |
| 1 | 2026-10-23 15:40 | 9,5 | 8,5 | 8,5 | 9,5 | 9,0 | 9,0 | 9,5 | 90,75 (publicado 90,7 truncado) |
| 2 | 2026-10-23 15:51 | 9,6 | 9,0 | 9,0 | 9,5 | 9,0 | 9,0 | 9,5 | 92,45 (publicado 92,4 truncado) |
| 3 | 2026-10-23 15:55 | 9,6 | 9,3 | 9,3 | 9,5 | 9,3 | 9,0 | 9,5 | 93,80 |
| 4 | | | | | | | | | |
| 5 | | | | | | | | | |

**Registro narrativo y veredicto:**

| Ronda | Artefacto y versión | Autoevaluación comprobada | Defectos abiertos | Evidencias reproducidas | Veredicto | Acción |
|---|---|---|---|---|---|---|
| 0 — preparación | No existe `secciones/04-integracion.md` a las 15:23 | No existe a las 15:23 | Ninguno | Directorio vacío; BRIEF, skills, `claude.md` y política de modelos fijados por SHA-256 (§2.1) | N/A (preparación) | Esperar aviso del Lead con el borrador |
| 1 | `04-integracion.md` SHA-256 `9de703ad8762257c…` (428 líneas, mtime 15:29:48) + `autor-integracion.md` SHA-256 `30f97d2df5bb9249…` (134 líneas) | Sí: declara 93,5, 3 menores y evidencias mecánicas que se reprodujeron; no detectó la contradicción de N/A ni la de terminología (D-ST4-01/02) | D-ST4-01 (mayor), D-ST4-02/03/04 (medios), D-ST4-05/06/07 (menores) | Lectura completa de T4 y su autoevaluación; reproducidos 428 líneas, 6.668 palabras, 8 fences, 0 TODO/FIXME, 0 emojis, hash y recuentos de fuentes citadas; contraste con `claude.md`, `SKILL_CREAR`, `SKILL_MAESTRA`, `SKILL_AUDITOR`, `SKILL_CAPTURAS_VERIFICACION`, `SKILL_VERIFICACION_PLAYWRIGHT`, `POLITICA_modelos-imagen`, `SKILL_history-server`, `SKILL_arquitecto-backend-php-hostinger`, `SKILL_style-guide-antigravity`, memoria (`errores`, `recetas`, `decisiones`) y scripts `tools/verificar-*.ps1`; verificado que todas las reglas de proyecto citadas existen y que no hay modelos ni herramientas inventados | REWORK | Enviar defectos a `autor-integracion` con copia al Lead; esperar ronda 2 |
| 2 | `04-integracion.md` SHA-256 `a8fead0072bea21e…` (428 líneas, 7.070 palabras, mtime 15:47:35) + `autor-integracion.md` SHA-256 `09d1930e9665a3cd…` (121 líneas) | Sí: declara 93,8, 3 menores y respuesta defecto a defecto que se reprodujo; el cierre de D-ST4-03 es incorrecto porque T3 ronda 2 ya no define «verificador de producto» | D-ST4-03 sigue abierto (medio); D-ST4-01/02/04/05/06/07 cerrados; sin defectos nuevos distintos | Lectura completa de T4 y su autoevaluación; reproducidos 428 líneas, 7.070 palabras, 8 fences, 0 TODO/FIXME, 0 emojis, `Lead`=0, `segundo push`=0, `no versionada`=0, `versión de assets`=0, `producción está verificada`=0, `commit --allow-empty` en 3 puntos, `--text-dim` en tokens; N/A unificado en 9.13/10.1/10.3/Anexo B; contraste con T3 r2 (0 ocurrencias de «verificador»), T1 y fuentes de proyecto | REWORK | Enviar D-ST4-03 actualizado a `autor-integracion` con copia al Lead; esperar ronda 3 |
| 3 | `04-integracion.md` SHA-256 `64dd6861e20e863e…` (428 líneas, 7.059 palabras, mtime 15:53:20) + `autor-integracion.md` SHA-256 `de307f615d2e2d4d…` (122 líneas) | Sí: declara 93,8, tres menores y el cierre de D-ST4-03 con evidencia; coincide con la verificación independiente | Ninguno: D-ST4-03 cerrado; D-ST4-01/02/04/05/06/07 siguen cerrados; sin defectos nuevos | Lectura completa de T4 y su autoevaluación; reproducidos 428 líneas, 7.059 palabras, 8 fences, 0 TODO/FIXME, 0 emojis, `verificador de producto`=0, `Pendiente de integración`=0, `se añaden al integrar`=0, `dueño de la tarea de verificación` en 3, 102 y 221, «verificadores» solo en :205 (scripts); contraste con T1/T3 vigentes y regresión del resto de la sección | PASS | Notificar al Lead; el cierre de `task-4` corresponde al Lead |
| 4 | | | | | | |
| 5 | | | | | | |

#### Defectos de la ronda 1 de ST4

| ID | Severidad | Ubicación | Esperado | Observado | Evidencia de reproducción | Acción exigida |
|---|---|---|---|---|---|---|
| D-ST4-01 | Mayor | `04-integracion.md:243-244` frente a `:405` | Criterio único de N/A: la funcionalidad no existe o el entorno está excluido; si el brief excluye publicación, se verifica en el runtime real declarado (Anexo B) y no se marca N/A; si no hay runtime verificable, limitación/BLOCKED, nunca N/A discrecional | 9.13 admite N/A cuando «el brief excluye expresamente un entorno (por ejemplo, publicación)», mientras el Anexo B dice que en ese caso se verifica en el runtime real y «no se usa N/A para evitar probar»; además 9.13 exige producción verificada | T4:243-244 y T4:405; lectura literal de ambos pasajes | Alinear ambos pasajes con una sola regla de N/A y conservar la exigencia de verificación real |
| D-ST4-02 | Medio | `04-integracion.md:325, 327, 333, 334, 341, 384` | Vocabulario de §1.4: «orquestador» para el escalado y «usuario» para el cliente; «dueño» solo para el dueño de tarea del contrato | «el Lead decide» (327), «Avisar al Lead» (333) y «se avisó al Lead» (384) sin definición; «decisión del dueño» y «si el dueño pide» (325, 334) para el usuario, mientras «Dueño: <rol>» (341) es el dueño de tarea | T4:325-341 y 384; T1:60-66; T3:493 (decisiones al orquestador) | Sustituir Lead → orquestador y dueño → usuario en los pasajes indicados |
| D-ST4-03 | Medio | `04-integracion.md:102` | Designación del verificador mediante un rol definido en §1.4 y un mecanismo real (orquestador/contrato ampliado); «Verificador de producto» solo está definido en T3 §7.2 y §4.4 no tiene ese campo | «La ejecuta el verificador designado en el contrato de tarea»: el contrato §4.4 no contempla verificador y §1.4 no lo define | T4:102; T1:60-66; T1:250-264; T3:31 | Referenciar el rol y su designación; el Lead debe ampliar §1.4/§4.4 o T4 debe usar un rol existente |
| D-ST4-04 | Medio | `04-integracion.md:83` y `:202` | Para re-disparar el webhook atascado hace falta un commit vacío (o nuevo) + push; un push sin cambios no se ejecuta ni re-dispara | «si no publica, un segundo push re-dispara el webhook» / «si se atasca, segundo push», sin indicar commit vacío ni nuevo commit | T4:83 y 202; `tools/memoria/errores.md:190`, `:321-327`, `:481-495` | Precisar «commit vacío + push» y el umbral de espera (~20 min) |
| D-ST4-05 | Menor | `04-integracion.md:118` y `:209` | «Protegida por `tools/.htaccess` y con capturas fuera de Git», o añadir la regla de `.gitignore`; no afirmar que toda la carpeta es no versionada | «protegida y no versionada» / «fuera de Git»; `.gitignore` solo ignora `*.png` y `.playwright-cli/`, no `tools/evidencias/` completa | `.gitignore:141`, `:281`; `tools/.htaccess` existe; T4:118 y 209 | Corregir la afirmación o pedir al Lead la regla de `.gitignore` |
| D-ST4-06 | Menor | `04-integracion.md:84` | Describir lo que el verificador hace realmente: health del proxy e historial (y assets solo si el script lo comprueba) | «health del proxy, historial y versión de assets»; el script consulta health e historial, no assets (aunque su cabecera lo anuncie) | `tools/verificar-apps-produccion.ps1:2-3` frente a `:49-72`; T4:84 | Ajustar la descripción o completar el script (fuera del scope del autor; decide el Lead) |
| D-ST4-07 | Menor | `04-integracion.md:62-63` | Todo token usado debe estar en la lista mínima o definirse (p. ej., `--text-dim:#99CCCC`) | El subtítulo usa `var(--text-dim)` pero la lista de tokens mínimos no incluye `--text-dim`; no se encontró en los CSS/HTML/JS de `apps/dibujo_lineas_copia` (sí en `apps/outfit/app.css:14`) | T4:62-63; `SKILL_MAESTRA.md:156`; `apps/outfit/app.css:14`; búsqueda sin coincidencias en CSS/HTML/JS de `apps/dibujo_lineas_copia` | Añadir el token a la lista mínima o usar `--muted` |

#### Defectos de la ronda 2 de ST4

| ID (ronda 1) | Severidad | Estado en ronda 2 | Verificación | Evidencia |
|---|---|---|---|---|
| D-ST4-01 | Mayor | CERRADO | N/A único por ausencia real de funcionalidad; si el brief no incluye publicación se verifica el runtime real declarado y se registra como entorno final; sin «producción está verificada» incondicional | T4:113, 199, 243-244, 255, 266-267, 285, 323, 405, 411, 425 |
| D-ST4-02 | Medio | CERRADO | `Lead` = 0; escalado/coordinación con «orquestador» (327, 333, 384) y cliente con «usuario» (325, 334); «dueño de tarea» solo para el contrato (273, 319, 341) | T4:3, 273, 319, 325-334, 341, 384; `01-nucleo.md:60-66` |
| D-ST4-03 | Medio | **ABIERTO** | T4:102 y T4:3 citan «verificador de producto» como «rol de §7.2» y la autoeval:105 lo da por definido en `03-supervision.md:31`; la T3 vigente (r2) **ya no define ese rol**: 0 ocurrencias de «verificador», §7.2 usa solo roles de §1.4 y atribuye la verificación al «dueño de la tarea de verificación» dentro de «Autores y especialistas». Además, T4:102 incluye una instrucción de integración dentro del cuerpo del prompt («Si §1.4 o §4.4 no contemplan todavía ese rol… se añaden al integrar el prompt») que no debe quedar en el prompt final | T4:3, 102, 221; `03-supervision.md:7, 25-33, 43, 109`; `01-nucleo.md:60-66`; autoeval:105; búsqueda «verificador» en T3 = 0 |
| D-ST4-04 | Medio | CERRADO | Re-disparo con commit vacío (`git commit --allow-empty`) + push, umbral ~20 min; sin «segundo push» | T4:83, 114, 202, 324; `errores.md:190, 321-327, 481-495` |
| D-ST4-05 | Menor | CERRADO | Carpeta protegida por `tools/.htaccess`; capturas `.png` y `.playwright-cli/` excluidas por `.gitignore`; el resto se mantiene fuera del índice; sin «no versionada» | T4:118, 209, 212, 292, 401; `.gitignore:141, 281` |
| D-ST4-06 | Menor | CERRADO | El verificador descrito comprueba health e historial (no assets) | T4:84; `verificar-apps-produccion.ps1:49-72` |
| D-ST4-07 | Menor | CERRADO | `--text-dim:#99CCCC` añadido a los tokens mínimos y usado por el subtítulo | T4:62-63; `apps/outfit/app.css:14` |
| — | — | Sin defectos nuevos distintos | Lectura completa de las 428 líneas sin regresiones; el resto de la sección mantiene contrato, verificación real, Hoola, image 2, historial, git/entorno final, BLOCKED y anexos | §8.7 |

#### Defectos de la ronda 3 de ST4

| ID (ronda 1) | Severidad | Estado en ronda 3 | Verificación | Evidencia |
|---|---|---|---|---|
| D-ST4-03 | Medio | CERRADO | T4:102 asigna la Fase 5 al «dueño de la tarea de verificación», rol «Autores y especialistas» de §1.4, designado por el orquestador y registrado en §4.4; sin «verificador de producto», sin «Pendiente de integración» y sin instrucción de integración en el cuerpo; plantilla :221 actualizada; la autoeval:105 ya no cita `03-supervision.md:31` | T4:3, 102, 221; `03-supervision.md:7, 25-33, 45, 109`; `01-nucleo.md:60-66, 250-264`; búsquedas = 0 |
| — | — | Sin defectos nuevos | Regresión completa de las 428 líneas: el resto del contenido se mantiene (contrato, Fase 5, Hoola, image 2, historial, git/entorno final, BLOCKED y anexos); sin contradicciones nuevas | §8.7 |

### 8.7 Evidencias verificadas de ST4

- **2026-10-23, preparación:** leídos completos `BRIEF.md` (150 líneas), `SKILL_CREAR.md` (188), `SKILL_MAESTRA.md` (1010, incluidas infraestructura, diseño, historial, imágenes, selector y caché), `SKILL_AUDITOR.md` (221), `SKILL_CAPTURAS_VERIFICACION.md` (79), `SKILL_VERIFICACION_PLAYWRIGHT.md` (87), `SKILL_MEJORADOR_PROMPT.md` (189), `POLITICA_modelos-imagen.md` (36), `claude.md` (109), `MEMORIA.md` (47) y `mapa.md` (83). Hashes en §2.1.
- **2026-10-23 15:40, ronda 1:** leído `04-integracion.md` completo (428 líneas) y `autor-integracion.md` completo (134 líneas). Versión fijada: T4 SHA-256 `9de703ad8762257c3cddbdb37562cf8db6348c93d3262ba259e0f4ff076ae1c3` (mtime 15:29:48); autoeval SHA-256 `30f97d2df5bb9249bd145a4f5317be2550e81ca57f0fb2d2ad476e847699d0eb`. Reproducciones: 428 líneas; 6.668 palabras; 8 fences (4 bloques); 0 TODO/FIXME en mayúsculas (la única aparición es la prohibición de T4:257); 0 emojis; hash del autoeval y recuentos de fuentes citadas comprobados; contraste de las 23 comprobaciones T4-01…T4-23 y de la matriz §8.3 contra las fuentes reales: `claude.md`, `SKILL_CREAR`, `SKILL_MAESTRA`, `SKILL_AUDITOR`, `SKILL_CAPTURAS_VERIFICACION`, `SKILL_VERIFICACION_PLAYWRIGHT`, `POLITICA_modelos-imagen`, `SKILL_history-server`, `SKILL_arquitecto-backend-php-hostinger`, `SKILL_style-guide-antigravity`, `errores.md`, `recetas.md`, `decisiones.md`, `verificar-despliegue.ps1` y `verificar-apps-produccion.ps1`. Comprobado que los endpoints, claves, tokens, modelo por defecto, referencias de caché/despliegue y nombres de skills citados existen y son correctos; no se detectaron modelos, reglas ni herramientas inventadas. Contraste de calibración: 90,75 independiente frente a 93,5 del autor = diferencia 2,75, por debajo de 10 (no hay defecto de calibración).
- **Observaciones de integración (no numeradas como defecto, sin efecto en el veredicto):** (a) la regla de caché de T4:82 difiere de `SKILL_MAESTRA.md:813-817` pero coincide con la medición real de `errores.md:412-425` y queda resuelta por la regla «requisito más exigente» de T4:22; el Lead debe conservar esa precedencia; (b) la fila de `SKILL_style-guide-antigravity` (T4:14) lo describe como Hoola, mientras la skill vigente contiene la paleta Neon antigua; la precedencia de T4:22 lo resuelve, pero conviene que el Lead lo deje explícito; (c) el ejemplo de T4:386 dice «global 91,8» para 92,5 / 91,0 / 93,0 / 90,5 (media 91,75) sin definir la ponderación; es un ejemplo declarado ilustrativo y no es evidencia, no se corrige; (d) la afirmación de T4:84 sobre «versión de assets» del verificador se recoge como D-ST4-06.
- **2026-10-23 15:51, ronda 2:** leídos `04-integracion.md` (428 líneas, 7.070 palabras) y `autor-integracion.md` (121 líneas) completos. Versión fijada: T4 SHA-256 `a8fead0072bea21e0c1f67518ce9fd9beed8d05dec617fbd2a57a1dafc109f77` (mtime 15:47:35); autoeval SHA-256 `09d1930e9665a3cd6558773bb0f3f0057a1c02c073f1e3bb7b5ab0433f99db14` (mtime 15:47:58; el autor corrigió el hash en un mensaje posterior y coincide con el archivo real). Reproducciones: 428 líneas, 7.070 palabras, 8 fences, 0 TODO/FIXME, 0 emojis, `Lead`=0, `segundo push`=0, `no versionada`=0, `versión de assets`=0, `producción está verificada`=0, `commit --allow-empty` en 3 puntos, `--text-dim` en el subtítulo y en tokens; verificación de los siete cierres en el archivo real; contraste con `03-supervision.md` r2 para el rol del verificador (0 ocurrencias de «verificador» en T3), con `01-nucleo.md:60-66` y con las fuentes de proyecto. Calibración: 92,45 independiente frente a 93,8 del autor = diferencia 1,35 (sin defecto de calibración).
- **2026-10-23 15:55, ronda 3:** leídos `04-integracion.md` (428 líneas, 7.059 palabras) y `autor-integracion.md` (122 líneas) completos. Versión fijada: T4 SHA-256 `64dd6861e20e863eb1cec2a1a749a038ea7c302caff0c7897e5fa8ffec711066` (mtime 15:53:20); autoeval SHA-256 `de307f615d2e2d4d67f243a382319e5fbf9de6edab5d9323544e63ee530a5f0e` (mtime 15:54:19). Reproducciones: 428 líneas, 7.059 palabras, 8 fences, 0 TODO/FIXME, 0 emojis; `verificador de producto`=0, `Pendiente de integración`=0, `se añaden al integrar`=0; `dueño de la tarea de verificación` en :3, :102 y :221; «verificadores» solo en :205 (scripts del proyecto); contraste con `03-supervision.md` vigente (mismo término en §7.2, §7.6 y §7.9) y con `01-nucleo.md:60-66` y `:250-264`; regresión de las 428 líneas sin pérdidas. Calibración: 93,80 independiente frente a 93,8 del autor = 0,00.
- **Limitaciones declaradas:** no se ha leído `.claude/skills/*/SKILL.md` (son punteros) ni `skills/recursos/web-interface-guidelines/`; no se ha reproducido una web real porque el encargo produce un prompt (`BRIEF:121`). Las afirmaciones sobre herramientas se comprobaron contra el código real de los scripts y las skills. La antigua dependencia de integración del rol quedó resuelta al usar T4 el rol existente de §1.4, el mismo que cita T3.

### 8.8 Veredicto ST4

**PASS — ronda 3 (2026-10-23).** Total exacto 93,80; S1 9,6 · S2 9,3 · S3 9,3 · S4 9,5 · S5 9,3 · S6 9,0 · S7 9,5. Ninguna nota <7; críticas S1–S5 ≥9; cero defectos bloqueantes, mayores o medios abiertos; tres menores (M1–M3) justificadas con coste/beneficio; D-ST4-01 a D-ST4-07 cerrados con evidencia (D-ST4-03 en esta ronda) y sin defectos nuevos. PASS ligado a la versión SHA-256 `64dd6861e20e863eb1cec2a1a749a038ea7c302caff0c7897e5fa8ffec711066`; cualquier cambio posterior lo invalida. El cierre de `task-4` corresponde al Lead. La alineación de rol con T3 r2 queda resuelta: T4 usa «dueño de la tarea de verificación» (rol «Autores y especialistas» de §1.4) y no introduce roles nuevos ni instrucciones de integración en el cuerpo.

---

## 9. Gate final FG-B — rúbrica C1–C10

### 9.1 Versión congelada y alcance

- **Prompt:** `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` — v1.1 · 1.832 líneas · 189.489 bytes · SHA-256 `5be0bb94ebc55ac14680c3a95b89654aed93752bb04b340b5b72ab4e8b4f1da7` · mtime 2026-10-23 16:20:50.
- **Hash verificado dos veces durante el gate** (16:26 y 16:30), sin cambios de bytes. Cualquier cambio posterior invalida este veredicto (P19).
- **Artefactos leídos/contrastados:** prompt completo por bloques (cabecera, §1–§12; 13 H1, 49 tablas, 32 cercas, 0 emojis), `LEEME.md` (52 líneas), `EVIDENCIA.md` (93), `auditoria/red-team-informe.md` (581 líneas, §0–§25), las cuatro secciones con sus PASS y `autoevaluaciones/lead-integrador.md`. La lectura se hizo en ventanas que cubren todas las secciones y mecanismos críticos; la comprobación estructural y de búsqueda se ejecutó sobre las 1.832 líneas completas.
- **Medidas propias reproducidas:** 13 H1, 49 tablas, 32 cercas, 0 emojis, 0 «Lead», 0 «verificador de producto», 0 notas de integración, 1 única aparición de «TODO» (la prohibición de §10.1), 19 reglas P1–P19 (P19 en l.123), 230 referencias `§` totales (71 únicas según EVIDENCIA/RT-32).

### 9.2 Rúbrica C1–C10 — notas y evidencia

| ID | Criterio | Peso | Crítico | Nota | Evidencia principal |
|---|---|---:|---|---:|---|
| C1 | Fidelidad literal al encargo (R1–R8, matriz de trazabilidad) | 14 | Sí | **9,6** | §1.1 compromisos 1–8; Anexo D G1–G8 (l.1815–1828); `EVIDENCIA.md` §3 (R1–R8 con 6–10 mecanismos cada uno) y §4 (RT-01…RT-32); matriz de líneas contrastada: todas resuelven a la sección/mecanismo citado |
| C2 | Ejecutabilidad: copiar y pegar, variables, sin contradicciones | 14 | Sí | **9,4** | Cabecera de uso; §1.2 variables y defaults; §3–§4 contratos/gates; §4.10 Gate 0–5 sin dependencias imposibles; §5.7 informe; §7.12/§8.8/§9.13/§10.2/§10.3 plantillas; prueba de mesa Fase 0→6 superada (ver §9.4) |
| C3 | Cobertura del ciclo web y de tareas distintas | 8 | No | **9,5** | §4.2 tabla de 15 áreas con evidencia mínima y excepción explícita para auditoría end-to-end; §4.1 descomposición; §9.1–§9.13 Fase 5; §2.2 proyecto |
| C4 | Mecánica de autoevaluación y regla de no-entrega | 12 | Sí | **9,7** | §5.1–§5.8; §5.4 D1–D7; §5.5 umbral/truncado; §5.6 calibración; §5.7 plantilla con total sobre 100; P2/P3; §7.8 comprobación de la autoevaluación |
| C5 | Supervisión independiente y umbral 90 (reproducción, veredicto, veto, doble nivel) | 14 | Sí | **9,7** | §7.1–§7.15; §7.2 roles/independencia; §7.6 100 % críticas + ≥50 % resto; §7.10 PASS; §7.14 auditoría end-to-end; §8.6 desempate; P4/P5/P17/P19 |
| C6 | Rework, escalado y bloqueo seguro (sin aprobación por cansancio) | 9 | Sí | **9,6** | §8.1–§8.10; 5 rondas duras; escalado §8.6; reasignación/división/BLOCKED §8.7; prohibiciones §8.9; §10.3 BLOCKED sin entrega disfrazada |
| C7 | Integración Antigravity y verificación real | 9 | No | **9,4** | §2.1–§2.2 (P1–P19 y reglas de proyecto reales); §9.1–§9.13 (navegador, consola, red, descargas en disco, persistencia, 360/390/768/1440, A–H, Lighthouse ≥90, seguridad, entorno final); §10.2 y §12.2 |
| C8 | Evidencias, plantillas y trazabilidad | 7 | No | **9,2** | §5.7, §7.12, §8.8, §9.12, §9.13, §10.2, §10.3, §11 índice único, §12.3 checklist, Anexo D; `EVIDENCIA.md` §2–§4. Se descuenta 0,8 por los recuentos documentales desactualizados (M-FG-02) |
| C9 | Claridad, estructura y consistencia | 6 | No | **9,0** | §1–§12 sin saltos ni duplicidades; 13 H1 y 49 tablas coherentes; 0 restos de integración; se descuenta 1,0 por la ambigüedad del «global de ejemplo» (M-FG-01) |
| C10 | Resistencia al autoengaño/gaming | 7 | No | **9,6** | §5.6 jerarquía de evidencia/señales; §7.8 ciego y calibración; §7.15 invariantes y 17 patrones; §8.9 prohibiciones; §10.3 BLOCKED; P8/P13/P19 |

**Cálculo:** 14×9,6 + 14×9,4 + 8×9,5 + 12×9,7 + 14×9,7 + 9×9,6 + 9×9,4 + 7×9,2 + 6×9,0 + 7×9,6 = **950,8 / 10 = 95,08 → publicado 95,0** (truncado, nunca redondeado al alza).

**Condiciones de PASS:** total 95,08 ≥ 90,0 ✓ · ninguna nota < 7,0 ✓ · críticas C1, C2, C4, C5 y C6 ≥ 9,0 ✓ · cero defectos bloqueantes, mayores y medios abiertos ✓ · dos mejoras residuales menores documentadas (M-FG-01/M-FG-02), dentro del máximo de 3 ✓ · PASS ligado al SHA-256 congelado ✓.

### 9.3 Resultado de las pruebas obligatorias (BRIEF §5)

| Prueba | Resultado | Evidencia |
|---|---|---|
| (a) Matriz R1–R8 → secciones/líneas → ≥ 2 mecanismos | **PASA** | `EVIDENCIA.md` §3: R1 7 mecanismos, R2 6, R3 6, R4 8, R5 10, R6 6, R7 6, R8 8; cada línea citada resuelve a la sección/mecanismo indicado (contraste línea a línea); Anexo D (l.1815–1828) replica G1–G8; red-team §16 y §3.3 independientes |
| (b) Prueba de mesa con brief realista, Fase 0→6 | **PASA con 1 observación menor** | Brief «fichas de producto» (§12.1): Fase 0 CA (§3.2), Fase 1 tareas y Gates 0–1 (§4), Fase 2 autoevaluación (§5), Fase 3 supervisión PASS (§7), Fase 4 rework/escalado (§8), Fase 5 verificación real (§9), Fase 6 entrega/BLOCKED (§10). Cada fase tiene sujeto, evidencia y gate; única ambigüedad: el Anexo A llama «global» a la media de notas de tarea (M-FG-01) |
| (c) Anti-gaming | **PASA** | §5.6 (señales y jerarquía de evidencia), §7.15 (I1–I9 + 17 patrones con respuesta), §8.9 (12 prohibiciones), §10.3 (BLOCKED sin entrega disfrazada); búsquedas de «aprobado con reservas», «redondeo», «N/A discrecional», «autosupervisión»: todas aparecen solo como prohibición/regla |
| (d) Coherencia numérica | **PASA** | Pesos 18+15+13+10+12+10+8+6+5+3 = 100 (l.731); críticos A1–A6 = 78; fórmula /10 con total sobre 100 (l.768, l.1108); umbral 90,0 en autoevaluación, supervisión, auditoría y entrega (l.586, l.780, l.1027, l.1204, l.1618); truncado 89,96→89,9 (l.588, l.775-777); máximo 5 rondas (l.1282); calibración >10,0 y ≥2,0 en crítico (l.592, l.1006); ≤3 menores (l.1031); muestreo 100 %/≥50 % (l.936); auditoría >5,0 reconcilia (l.1206). Sin cifras contradictorias en la norma; solo el ejemplo del «global» (M-FG-01) |
| (e) Especialidad B: reglas de proyecto reales, sin invenciones ni omisiones | **PASA con observación** | §2.2 contrastado con `claude.md`, `SKILL_CREAR`, `SKILL_MAESTRA`, `SKILL_AUDITOR`, `SKILL_CAPTURAS_VERIFICACION`, `SKILL_VERIFICACION_PLAYWRIGHT`, `SKILL_history-server`, `SKILL_arquitecto-backend-php-hostinger`, `POLITICA_modelos-imagen` y memoria: Hoola/Electrolize/tokens y overlay canónicos; `openai-image-2-low` por defecto, selectores calidad/AR/512-4096, edición multipart sin `response_format`; historial server-side con `list/save/delete/clear`; claves solo en entorno y `health`; `main`+commit por ruta+push+verificación de versión servida+caché por ruta+commit vacío; memoria del proyecto; verificación real (navegador, consola, red, descargas en disco, 3 anchos, Lighthouse ≥90, seguridad). Ninguna regla inventada ni fase obligatoria omitida. Observación no bloqueante: §2.2.6 cita como fuente canónica `SKILL_MAESTRA` y la app de referencia, mientras `SKILL_MAESTRA` declara `POLITICA_modelos-imagen.md` como fuente única del catálogo; ambas son reales y el catálogo mínimo incluido es correcto |
| (f) Correcciones RT-01…RT-32 presentes y sin pérdida de mecanismos | **PASA** | `EVIDENCIA.md` §4 lista RT-01…RT-32; verificación por muestreo amplio: RT-01 (P2 todos los roles + §5.8 l.686–701), RT-02/05/30 (Gates 4/5 l.481–482, §4.4 l.383, §10.1 l.1618), RT-03 (§4.2 l.338), RT-04 (Lighthouse ≥90 §3.2 l.245, §9.8 l.1540), RT-06/07 (`runtime real declarado`, sin «limitación explícita» para entorno final, §1.2 l.61, §9.11 l.1564, §9.13 l.1609), RT-08 (recalcula coste l.548, l.1004), RT-09 (topes a retiradas/reenvíos l.1283), RT-10 (plantilla §5.7 con `/10` y «sobre 100» l.657), RT-11 (ejemplo A1 peso 18 crítico Sí l.1105), RT-13 (global 91,7 l.1771), RT-15 (calibración >10,0 l.592, l.1006), RT-16 (P19 l.123), RT-17 (Anexo D l.1815), RT-18/19/27 (LEEME), RT-20 (commit por archivo l.199; `loading="lazy"` y dimensiones l.1537), RT-21 (§2.1/§2.2 sin §2.3), RT-22 (cabecera sin dependencia externa l.1–17), RT-23–§12.4, RT-25 (Integrador l.87), RT-26 (§11 l.1739), RT-29 (§5.8 l.690–701), RT-31 (94,7 en lead-integrador), RT-32 (métricas documentales). No se ha perdido P19 ni ningún mecanismo de las secciones aprobadas |
| (g) Red-team: confirmar o refutar | **Confirmo 0 B/M/Med; refuto «0 Men»** | El reporte final (§25, l.568–581) declara ACEPTABLE con 0 B/M/Med/Men sobre el mismo SHA. Coincido en 0 B/M/Med. Discrepo en Menores abiertos: M-FG-01 (global de ejemplo) y M-FG-02 (recuentos documentales) son menores reales no contabilizados. No afectan al cuerpo del prompt ni al SHA; se documentan abajo |

### 9.4 Registro de rondas del gate

| Ronda | Fecha | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | Total exacto | Veredicto |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 2026-10-23 16:30 | 9,6 | 9,4 | 9,5 | 9,7 | 9,7 | 9,6 | 9,4 | 9,2 | 9,0 | 9,6 | 95,08 (95,0 truncado) | **PASS** |
| 2 | | | | | | | | | | | | | |
| 3 | | | | | | | | | | | | | |
| 4 | | | | | | | | | | | | | |
| 5 | | | | | | | | | | | | | |

Reconciliación con `supervisor-calidad-a`: si los totales difieren en más de 5 puntos, se reconcilian con evidencias antes de emitir veredicto. Mi veredicto no se modifica por presión ni por media aritmética.

### 9.5 Mejoras residuales del gate (menores, no bloqueantes)

| ID | Severidad | Descripción | Ubicación | Coste | Beneficio | Motivo de no corregir ahora | Decisión |
|---|---|---|---|---|---|---|---|
| M-FG-01 | Menor | El Anexo A llama «global» a la media truncada de las notas de tarea (`91,7`, media de 92,5/91,0/93,0/90,5), mientras §7.14.3 define la puntuación final con la rúbrica del capítulo 6 aplicada al proyecto. No hay regla que defina la media como total global; puede confundir la lectura del total del acta, aunque la entrega exige el acta §7.14 y el PASS por tarea, por lo que no permite saltarse el gate | `PROMPT…:1771` frente a `:1205`, `:1642` | Bajo (aclaración en EVIDENCIA/LEEME; editar el prompt invalidaría el hash) | Elimina una ambigüedad de lectura del total global | Es un ejemplo marcado como ilustrativo y la norma §7.14 es explícita; corregirlo en el prompt exigiría re-congelar y repetir ambos gates | Declarada; el Lead debe aclarar en `EVIDENCIA.md` que el total global válido es el del acta §7.14 y que 91,7 es solo resumen del ejemplo |
| M-FG-02 | Menor | Recuentos documentales desactualizados: `LEEME.md:51` dice «26 hallazgos» (total real 32); `EVIDENCIA.md:23/92` cita el informe red-team con «550 líneas» y delta §20–§23, pero el informe tiene 581 líneas y §20–§25; `autoevaluaciones/lead-integrador.md` alterna 31/33/32 hallazgos | `LEEME.md:51`, `EVIDENCIA.md:23/92`, `lead-integrador.md:6/56` | Bajo | Trazabilidad documental exacta | No afecta al prompt ni al SHA; se corrige al consolidar la evidencia en task-13 | Declarada; el Lead corrige los recuentos al consolidar |

No hay otras mejoras residuales abiertas. Dos menores documentadas con coste/beneficio (< máximo de 3). No hay B/M/Med.

### 9.6 Veredicto FG-B

**PASS — ronda 1 del gate (2026-10-23).** Total exacto **95,08** → publicado **95,0** (truncado). Críticas C1 9,6 · C2 9,4 · C4 9,7 · C5 9,7 · C6 9,6 (todas ≥ 9,0). Ninguna nota < 7,0. Cero defectos bloqueantes, mayores y medios abiertos. Dos menores documentadas con coste/beneficio. PASS ligado a la versión congelada SHA-256 `5be0bb94ebc55ac14680c3a95b89654aed93752bb04b340b5b72ab4e8b4f1da7`; cualquier cambio de bytes lo invalida y exige re-verificación completa (P19). El prompt integrado se considera **apto para publicación condicionada al cierre de FG-A sobre el mismo SHA y a la consolidación documental de task-13**; no es un PASS «con reservas»: las dos menores no afectan al cuerpo normativo ni al umbral.

Firma: `supervisor-calidad-b` — 2026-10-23 16:30 (Atlantic/Canary).

---

## 10. Bitácora, comunicaciones y firma

### 10.1 Bitácora

| Fecha y hora | Hecho | Evidencia |
|---|---|---|
| 2026-10-23 15:21 | Reclamadas `task-7` (rev. 1 → 2) y `task-8` (rev. 1 → 2) | Respuesta de `team_task_update` con `ownerName: supervisor-calidad-b` |
| 2026-10-23 15:21 | Leído `BRIEF.md` completo (150 líneas) | Lectura del archivo real |
| 2026-10-23 15:23 | Leídas skills y reglas del proyecto (§8.3); hashes fijados | Comando `Get-FileHash` con salida registrada en §2.1 |
| 2026-10-23 15:23 | Verificado que `secciones/` y `autoevaluaciones/` están vacíos | Listado de directorio |
| 2026-10-23 15:25 | Publicado este scorecard de preparación, sin puntuar (versión inicial: SHA-256 `bbafe2ba1e9667d9`, 427 líneas; documento vivo que se versiona en cada ronda) | Archivo real en `supervision/scorecard-supervisor-b.md` |
| 2026-10-23 15:32 | Recibidos los avisos del Lead de ronda 1 de ST4 y ST3; iniciada la verificación independiente | Mensajes del Lead; lectura de los archivos reales (no del mensaje) |
| 2026-10-23 15:40 | Verificadas T4 y T3 completas, autoevaluaciones y contraste de fuentes; versiones fijadas por SHA-256 | Lecturas completas y comandos registrados en §7.6 y §8.7 |
| 2026-10-23 15:42 | Emitidos REWORK de ronda 1 de ST3 y ST4; defectos numerados enviados a los autores y resumen al Lead | Este scorecard (§7.5, §8.6); mensajes `send_message` confirmados |
| 2026-10-23 15:47 | Recibidas las rondas 2 de T3 y T4 (más las erratas de hash/texto de los autores); verificadas contra los archivos reales | Mensajes de `autor-supervision` y `autor-integracion`; hashes comprobados |
| 2026-10-23 15:51 | Verificadas T3 r2 (PASS) y T4 r2 (REWORK por D-ST4-03); cierres y regresiones comprobados | Lecturas completas y comandos en §7.6 y §8.7 |
| 2026-10-23 15:52 | Emitido PASS de ST3 ronda 2 y REWORK de ST4 ronda 2; avisos a autores y Lead | Este scorecard; mensajes `send_message` |
| 2026-10-23 15:54 | Recibida la ronda 3 de T4 (respuesta a D-ST4-03); verificada contra el archivo real | Mensaje de `autor-integracion`; hashes comprobados |
| 2026-10-23 15:55 | Verificado el cierre de D-ST4-03 y la regresión completa de T4; emitido PASS de ST4 ronda 3 | Lectura completa de T4 y su autoevaluación; §8.6–§8.8 |
| 2026-10-23 15:56 | Avisados `autor-integracion` y el Lead del PASS de ST4 ronda 3 | Mensajes `send_message` |
| 2026-10-23 16:26 | FG-B activado; verificada la versión congelada (SHA-256, 1.832 líneas, 189.489 bytes, mtime 16:20:50) y leídos `LEEME.md`, `EVIDENCIA.md`, red-team y autoevaluación del integrador | Mensaje del Lead; `Get-FileHash` |
| 2026-10-23 16:30 | Verificado el gate FG-B: C1–C10, pruebas (a)–(g), matriz R1–R8, RT-01…RT-32 y reglas de proyecto; hash re-verificado sin cambios | Este scorecard §9; lecturas y búsquedas registradas |
| 2026-10-23 16:31 | Emitido PASS de FG-B (95,08 → 95,0) sobre el SHA congelado; cerrada `task-12`; resumen enviado al Lead | `team_task_update`; `send_message` |

### 10.2 Comunicaciones

| Fecha | Destinatario | Asunto | Contenido | Estado |
|---|---|---|---|---|
| 2026-10-23 15:25 | Lead | Disponibilidad de supervisor B | Scorecard preparado; task-7 y task-8 reclamadas; a la espera de aviso de borradores de T3 y T4 | Enviado (`send_message` → lead, confirmado) |
| 2026-10-23 15:42 | `autor-integracion` | REWORK ST4 ronda 1 | Verificación, notas S1–S7, total 90,75 (90,7), 7 defectos D-ST4-01…D-ST4-07, observaciones e instrucciones de ronda 2 | Enviado (`send_message`, confirmado) |
| 2026-10-23 15:42 | `autor-supervision` | REWORK ST3 ronda 1 | Verificación, notas S1–S7, total 90,75 (90,7), 3 defectos D-ST3-01…D-ST3-03, observaciones e instrucciones de ronda 2 | Enviado (`send_message`, confirmado) |
| 2026-10-23 15:42 | Lead | Resumen de rondas 1 de ST3 y ST4 | Ambos REWORK; notas, defectos y evidencias; verificación de la inconsistencia de notación del BRIEF §8; observaciones de integración | Enviado (`send_message`, confirmado) |
| 2026-10-23 15:52 | `autor-supervision` | PASS ST3 ronda 2 | Notas, total 93,60, cierres D-ST3-01…03; PASS ligado a SHA-256 `a0beb5c6…`; el cierre de `task-3` lo registra el Lead | Enviado (`send_message`, confirmado) |
| 2026-10-23 15:52 | `autor-integracion` | REWORK ST4 ronda 2 | Total 92,45 (92,4); seis defectos cerrados; D-ST4-03 abierto (medio) con instrucción concreta para la ronda 3 | Enviado (`send_message`, confirmado) |
| 2026-10-23 15:52 | Lead | PASS ST3 r2 y REWORK ST4 r2 | Resumen de ambos; T3 apto para cierre por el Lead; T4 debe alinear el rol con T3 r2; ninguna aprobación por encima del supervisor | Enviado (`send_message`, confirmado) |
| 2026-10-23 15:56 | `autor-integracion` | PASS ST4 ronda 3 | Notas, total 93,80, cierre de D-ST4-03 y regresión; PASS ligado a SHA-256 `64dd6861…`; el cierre de `task-4` lo registra el Lead | Enviado (`send_message`, confirmado) |
| 2026-10-23 15:56 | Lead | PASS ST4 ronda 3 | T3 y T4 aptas para cierre (el Lead registra el cierre); sin defectos abiertos; FG-B pendiente de activación | Enviado (`send_message`, confirmado) |
| 2026-10-23 16:31 | Lead | PASS FG-B ronda 1 | Notas C1–C10, total exacto 95,08 (95,0), SHA verificado `5be0bb94…`, dos menores documentadas (M-FG-01/M-FG-02) y cierre de `task-12` | Enviado (`send_message`, confirmado) |

### 10.3 Firma

- **Supervisor:** `supervisor-calidad-b`.
- **Veredictos emitidos:** REWORK de ronda 1 en ST3 y ST4; PASS de ST3 ronda 2; REWORK de ST4 ronda 2; PASS de ST4 ronda 3; **PASS de FG-B ronda 1** (2026-10-23). `task-7`, `task-8` y `task-12` cerradas por el supervisor tras su PASS.
- **Compromiso:** no cerraré ninguna tarea de supervisión hasta que exista PASS con evidencia registrada, o hasta elevar el escalado al Lead con informe. No aprobaré por debajo del umbral ni con reservas.
