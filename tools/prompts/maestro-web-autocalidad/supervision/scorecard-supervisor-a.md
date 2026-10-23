# Scorecard — Supervisor independiente A

**Proyecto:** `tools/prompts/maestro-web-autocalidad/` (Prompt Maestro de Generación Web con Autoevaluación y Supervisión ≥90 %).
**Supervisor:** `supervisor-calidad-a`.
**Rol:** supervisión independiente de T1 (ST1) y T2 (ST2); gate final FG-A (C1–C10). No escribo secciones ni autoevaluaciones: solo verifico, puntúo y exijo rework.
**Archivo de control:** este scorecard es mi único scope de escritura. No edito `secciones/`, `autoevaluaciones/`, `auditoria/`, `PROMPT_MAESTRO_*`, `LEEME.md`, git, `apps/`, `skills/`, `tools/memoria/` ni nada fuera de esta ruta.
**Fecha de apertura:** 2026-10-23.
**Estado global:** ST1 **PASS (94,2)**, ST2 **PASS (93,6)** y FG-A **PASS (96,0)** (2026-10-23). El gate FG-A se emitió sobre el prompt congelado con SHA-256 `5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7`; FG-B corresponde a `supervisor-calidad-b`. Solo se registran notas tras verificar el archivo real.

---

## 0. Reglas de funcionamiento del supervisor

1. **Fuente de verdad:** el archivo real del autor (`secciones/…md`) y su autoevaluación (`autoevaluaciones/…md`), no el mensaje del autor ni el resumen del Lead.
2. **Cobertura de verificación:** 100 % de las afirmaciones críticas (cobertura contractual, evidencias declaradas, coherencia numérica) y muestreo ≥ 50 % del resto, con registro documentado en la tabla de muestreo. El muestreo es determinista y previo a la puntuación: todo ítem marcado como *crítico* se verifica al completo; del resto se verifica el bloque decidido antes de leer (pares/impares + todos los encabezados y tablas), nunca «lo que me haya parecido».
3. **Evidencia:** cada nota y cada defecto se respalda con ruta de archivo + línea(s) + fragmento. Sin evidencia reproducible, la afirmación del autor vale 0 (§4 S5 y §5 C10 del BRIEF).
4. **Independencia:** no soy autor de ninguna sección; no comparto scope de escritura; no edito la sección supervisada; no acepto instrucciones del autor sobre la nota. Cualquier conflicto va al Lead con evidencias.
5. **Umbral inviolable:** PASS de sección exige total ponderado ≥ 90,0 / 100, ninguna nota < 7, **todos** los criterios críticos ≥ 9 y cero defectos bloqueantes, mayores o medios abiertos. Máximo 3 menores documentados con justificación coste/beneficio (BRIEF §4).
6. **Sin atajos:** prohibido rebajar el umbral, redondear al alza, aprobar «con reservas», aprobar por cansancio o dar por bueno un defecto no verificado. Un 89,9 es NO PASS; un 89,9 con decimales de cálculo no se «redondea» a 90,0.
7. **Rondas:** máximo 5 por tarea. Agotadas sin PASS: escalado al Lead con informe; nunca aprobación. En cada ronda de rework se re-verifican **todos** los defectos previos más la regresión completa de la checklist.
8. **Autoevaluación del autor:** el informe debe ser específico y verificable. Si falta, es genérico o sus notas no se sostienen, se emite rework por defecto de proceso (BRIEF §6.1) y S5 no puede superar 5.
9. **Calibración:** discrepancia entre la autoevaluación del autor y mi puntuación > 10 puntos = defecto de calibración (BRIEF §5, prueba 4).
10. **Registro obligatorio:** cada ronda se anota en el registro de rondas, cada defecto en el registro de defectos y cada comprobación en la tabla de muestreo. No se borra historial: las rondas se conservan.

### 0.1. Rúbrica S1–S7 (BRIEF §4) y fórmula

| ID | Criterio | Peso | Crítico | Qué verifico |
|---|---|---|---|---|
| S1 | Cumple completo el contrato de su sección | 20 | Sí | Checklist contractual al 100 %, sin recortes ni omisiones |
| S2 | Corrección técnica y coherencia con el diseño global | 15 | Sí | Sin contradicciones con BRIEF, numeración prevista ni otras secciones |
| S3 | Utilidad ejecutable: listo para integrar | 15 | Sí | Sin ambigüedad operativa, sin pasos imposibles, sin TODOs |
| S4 | Alineación literal con el encargo y el BRIEF (R1–R8) | 15 | Sí | Fidelidad al encargo del §0 y a los requisitos R1–R8 |
| S5 | Autoevaluación honesta y trazable | 15 | Sí | Evidencias reales, mejoras residuales, calibración, decisión |
| S6 | Claridad, concisión, formato y ausencia de relleno | 10 | No | Redacción directa, jerarquía, tablas útiles |
| S7 | Resistencia al autoengaño y al gaming | 10 | No | Sin escapatorias ni umbral móvil |

`total = Σ (nota × peso) / 10`, publicado con un decimal. Máximo 100,0. Umbral PASS = 90,0.

### 0.2. Severidades (BRIEF §6.6)

| Severidad | Definición | Efecto |
|---|---|---|
| Bloqueante | Incumple requisito, contradice el BRIEF, evidencia falsa o ausente en afirmación crítica | PASS imposible |
| Mayor | Omisión relevante o ambigüedad que obliga a interpretar | PASS imposible |
| Medio | Defecto de uso con solución evidente | PASS imposible |
| Menor | Estilo/documentación sin impacto operativo | Máx. 3, documentados con coste/beneficio |

### 0.3. Plantillas obligatorias de registro

**Registro de rondas (una instancia por tarea):**

| Ronda | Fecha | Archivo/versión | Veredicto | S1 | S2 | S3 | S4 | S5 | S6 | S7 | Total | Defectos B/M/Med/Men | Evidencias verificadas | Observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

Reglas: el veredicto es `PASS`, `REWORK` o `ESCALADO`; la ronda 0 es preparación y no puntúa; las rondas no se sobrescriben; cada ronda de rework re-verifica todos los defectos previos y la regresión de la checklist (se indica en observaciones).

**Registro de defectos (numerados, uno por fila):**

| ID | Severidad | Ubicación (archivo:líneas) | Esperado | Evidencia | Estado | Detección (ronda) | Verificación (ronda) |
|---|---|---|---|---|---|---|---|

Estados admitidos: `abierto`, `corregido-pendiente-de-verificar`, `verificado-cerrado`, `no-subsanado`. Un defecto solo pasa a `verificado-cerrado` cuando he leído la corrección real en el archivo.

**Tabla de muestreo (por ronda de puntuación):**

| # | Afirmación/ítem comprobado | Clase (crítica / resto) | Ubicación real | Método de verificación | Resultado | Defecto asociado |
|---|---|---|---|---|---|---|

Regla de muestreo: se enumeran primero todas las afirmaciones verificables del archivo; se verifican el 100 % de las clases *crítica* y al menos el 50 % de la clase *resto* (redondeo hacia arriba). Se documenta el recuento: `N críticas verificadas / N totales` y `M resto verificadas / M totales`.

---

## ST1 — Supervisión independiente de T1 (`secciones/01-nucleo.md`)

**Autor supervisado:** `autor-nucleo`. **Autoevaluación exigida:** `autoevaluaciones/autor-nucleo.md`.
**Estado:** rondas 1–2 supervisadas (2026-10-23). Ronda 1: REWORK (evidencia desactualizada). Ronda 2: **PASS (94,2)** sobre versión congelada v4; D1 y D2 verificados-cerrados.
**Versión con PASS (ronda 2, congelada v4):** `secciones/01-nucleo.md`, 400 líneas (401 segmentos con salto final), 6388 palabras, 13 tablas (0 mal formadas), H1=4 / H2=19; SHA-256 `7B07C1B28B2316A9DF7D6E02A07C36EE93EED939DD95D29093CCD480C75984F9`; mtime 15:34:46. Estable durante la verificación. Cualquier edición posterior invalida este PASS (P19).
**Contrato de referencia:** BRIEF §3 (T1) + encargo §2 (R1–R8) + reglas §6. Numeración prevista: sección 1 (identidad y variables), sección 2 (reglas inviolables), sección 3 (Fase 0), sección 4 (Fase 1 descomposición).

### ST1.1 — Checklist contractual (derivada del contrato T1)

Cada ítem se comprueba en el archivo real con línea(s) y fragmento. La columna «Severidad si falta» fija el efecto; si no se cumple = defecto con esa severidad.

| ID | Comprobación | Evidencia exigida | Severidad si falta |
|---|---|---|---|
| T1-C01 | Archivo existe, es legible, encabezado como sección 1 según numeración prevista; sin TODO/«[pendiente]» salvo variables explícitas | Primera línea + cabecera | Bloqueante |
| T1-C02 | Identidad y misión del orquestador: rol, objetivo, autoridad y límites (qué decide y qué no) | Párrafos/líneas | Bloqueante |
| T1-C03 | Variables de entrada definidas (brief, proyecto/ruta, stack, restricciones, referencias, umbral 90) y conducta si faltan: supuestos explícitos, máx. 3 preguntas, no bloquear si el usuario no responde | Lista de variables + regla de faltantes | Bloqueante |
| T1-C04 | Reglas inviolables de proceso, ejecutables y con consecuencia: español, no secretos, no autosupervisión, un escritor por archivo, no ramas/worktrees, no inventar | Lista regla → consecuencia | Bloqueante |
| T1-C05 | Fase 0 completa: ingesta del brief literal, criterios de aceptación observables, máximo 3 preguntas, supuestos numerados, contrato de aceptación antes de producir | Secuencia Fase 0 | Bloqueante |
| T1-C06 | Roles del equipo: orquestador, autores/especialistas, supervisores independientes, auditor end-to-end, integrador; responsabilidad, autoridad, prohibiciones y quién puede aprobar | Tabla de roles | Bloqueante |
| T1-C07 | Fase 1: descomposición en tantas tareas distintas como haga falta (sin plantilla fija), con criterio de «tarea distinta» y regla de dividir/fusionar | Criterio + regla | Bloqueante |
| T1-C08 | Tabla de tareas con todas las columnas: id, tarea, entregable, dueño, supervisor independiente, scope de escritura, dependencias, evidencia exigida, criterios de rúbrica | Tabla real (columna a columna) | Bloqueante |
| T1-C09 | Contrato de tarea individual: entradas, salidas, límites, evidencia y definición de hecho por tarea; gate aplicable | Bloque contrato de tarea | Bloqueante |
| T1-C10 | Cobertura mínima del ciclo web enumerada (brief/alcance, diseño/estilo, contenido, frontend, responsive, accesibilidad, imágenes, backend/proxy/claves, persistencia, verificación navegador, auditoría, despliegue/commit, memoria/cierre) y regla para lo no cubierto | Lista de cobertura + regla | Bloqueante |
| T1-C11 | Tablero compartido y dependencias: estados, orden, bloqueos, un escritor por archivo, prevención de solapamiento y no avanzar con dependencias incompletas | Tablero/estado/dependencias | Bloqueante |
| T1-C12 | Asignación de supervisor independiente por tarea + regla de no autosupervisión y conflicto de interés (declaración y reasignación) | Regla + columna supervisor | Bloqueante |
| T1-C13 | Protocolo de comunicación y sincronización: formato de mensaje, quién informa a quién, cadencia, registro de decisiones, tratamiento de conflictos | Protocolo | Mayor |
| T1-C14 | Reglas de parada: no avanzar sin gate, qué bloquea, escalado al orquestador; referencia a REWORK/BLOCKED sin duplicar secciones 7–8 | Regla de parada | Bloqueante |
| T1-C15 | Listo para integrar: sin meta-comentarios del autor, sin duplicar rúbrica (sección 6), supervisión (7), verificación (9); referencias cruzadas por número de sección previsto | Revisión de voz + referencias | Mayor |
| T1-C16 | Trazabilidad y no contradicción con BRIEF: la sección sostiene R1/R3/R4/R5/R7 y ninguna regla contradice el BRIEF ni el encargo literal | Matriz R→línea | Bloqueante |
| T1-C17 | Redacción: español, directo, sin relleno épico ni promesas, jerarquía markdown, tablas legibles, sin rutas personales/temporales, sin emojis | Muestra de párrafos | Menor |
| T1-C18 | Anti-gaming: no hay escapes («el orquestador decidirá» sin criterio, tarea sin supervisor, cobertura «según necesidad» sin mínimo, autosupervisión encubierta) | Búsqueda dirigida de patrones | Bloqueante |

### ST1.2 — Verificaciones adicionales obligatorias (proceso)

| ID | Verificación | Método | Evidencia |
|---|---|---|---|
| V-T1-01 | Lectura íntegra del archivo | Lectura completa (líneas 1–final) y conteo de líneas | Rango leído |
| V-T1-02 | Autoevaluación real del autor | Leer `autoevaluaciones/autor-nucleo.md`: S1–S7 con nota, evidencias ruta+fragmento, mejoras residuales con severidad, decisión, riesgos | Archivo + líneas |
| V-T1-03 | Aritmética de la autoevaluación | Recalcular `Σ(nota×peso)/10`; comprobar un decimal y coherencia con la decisión | Cálculo reproducido |
| V-T1-04 | Cobertura de evidencias declaradas | Reproducir 100 % de afirmaciones críticas + ≥ 50 % del resto; registrar en tabla de muestreo | Tabla de muestreo |
| V-T1-05 | Independencia y scope | El autor no escribió fuera de su scope ni tocó git/skills/memoria (revisión de rutas y `git status` como lectura) | Evidencia de rutas/estado |
| V-T1-06 | Calibración | Diferencia entre total autoevaluado y mi total: ≤ 10 | Registro de cálculo |

### ST1.3 — Rúbrica S1–S7 aplicada a T1 (ronda 1)

| ID | Criterio | Peso | Crítico | Nota R1 | Evidencia de la nota |
|---|---|---|---|---|---|
| S1 | Contrato completo | 20 | Sí | 9,5 | T1-C01…T1-C18 verificados 18/18 en el archivo; 15 áreas de cobertura `:206-220`; tabla de tareas de 9 columnas `:233-234`; contrato de tarea con 13 campos `:250-264` |
| S2 | Corrección técnica y coherencia global | 15 | Sí | 9,4 | Referencias § solo dentro de 1–12 (`REFS=1,2,3,4,5,6,7,8,9,10,12`); sin contradicciones con el BRIEF; D2 menor de terminología |
| S3 | Utilidad ejecutable | 15 | Sí | 9,4 | Tablas operativas; plan B sin sistema de archivos `:275`; estados con firmante `:291-300`; gates con firma `:366-373`; sin pasos imposibles |
| S4 | Alineación literal con encargo/BRIEF | 15 | Sí | 9,6 | R1–R8 con ≥2 mecanismos: P2 `:83` + Gate 2 `:370`; P3 `:84` + parada `:382`; §4.1 `:178-198` + §4.2 `:200-227`; P5/P7 `:86-88` + §4.6 `:310-319`; P4 `:85` + PASS `:298` + Gate 3 `:371`; P12/P18 `:93,:99` + parada `:388` |
| S5 | Autoevaluación honesta y trazable | 15 | Sí | 8,0 | Informe específico y honesto, pero evidencia no reproducible contra la versión entregada (D1): métricas, áreas y referencias de línea de la versión anterior |
| S6 | Claridad, concisión, formato | 10 | No | 9,1 | 4 H1 / 19 H2; 13 tablas sin errores de columnas; sin relleno; D2 menor de terminología |
| S7 | Resistencia al gaming | 10 | No | 9,4 | P4 `:85`, P5 `:86`, P7 `:88`, P13 `:94`, P14 `:95`, P15 `:96`, P17 `:98`, P19 `:100`; tablero de solo adición `:304-308`; silencio ≠ aprobación `:355` |
| — | **Total** | 100 | — | **92,1** | `Σ(nota×peso)/10` = 921,0/10; críticas S1–S5: 9,5 / 9,4 / 9,4 / 9,6 / **8,0** |
| — | **Veredicto R1** | — | — | **REWORK** | Total ≥90 pero S5 (crítica) <9 y D1 bloqueante abierto: no procede PASS |

### ST1.3bis — Rúbrica S1–S7 aplicada a T1 (ronda 2, versión congelada v4)

| ID | Criterio | Peso | Crítico | Nota R2 | Evidencia de la nota |
|---|---|---|---|---|---|
| S1 | Contrato completo | 20 | Sí | 9,5 | T1-C01…T1-C18 verificados 18/18 también en v4; 15 áreas `:206-220`; tabla de 9 columnas `:233-234`; contrato de tarea con 13 campos `:250-264` |
| S2 | Corrección técnica y coherencia global | 15 | Sí | 9,4 | `REFS=1,2,3,4,5,6,7,8,9,10,12`; §2.3.1–2.3.9 existe en T4 (`04-integracion.md:5-98`); estados idénticos a §8.1 de T3 (`03-supervision.md:404-415`) salvo el sinónimo «Dueño/Autor», que el Lead unifica |
| S3 | Utilidad ejecutable | 15 | Sí | 9,4 | Estados con transición y firmante `:291-300`; gates con firma `:369-374`; condiciones de parada `:380-391`; plan B sin sistema de archivos `:275`; sin pasos imposibles |
| S4 | Alineación literal con encargo/BRIEF | 15 | Sí | 9,6 | R1–R8 con ≥2 mecanismos; las reglas de proyecto se referencian a §2.3 (contenido real en T4) y la verificación a §9–§10 |
| S5 | Autoevaluación honesta y trazable | 15 | Sí | 9,4 | v4: hash, bytes, métricas, tablas y referencias de línea verificados al 100 %; D1 y D2 reconocidos y subsanados; recalibración honesta (S5 9,5→9,0); historial v1–v4 y respuesta en §10 |
| S6 | Claridad, concisión, formato | 10 | No | 9,1 | 4 H1 / 19 H2; 13 tablas correctas; sin TODOs ni fugas meta; estados ya con denominación única (BLOCKED) |
| S7 | Resistencia al gaming | 10 | No | 9,4 | Congelación con SHA-256, P19 (PASS no hereditario), PASS verificado contra el archivo y no contra el mensaje del autor |
| — | **Total** | 100 | — | **94,2** | 942,0/10; críticas S1–S5: 9,5 / 9,4 / 9,4 / 9,6 / 9,4 (todas ≥9) |
| — | **Veredicto R2** | — | — | **PASS** | Total ≥90,0; ninguna nota <7,0; críticas ≥9; cero defectos B/M/Med abiertos; 3 menores del autor justificadas (≤3) |

### ST1.4 — Registro de rondas

| Ronda | Fecha | Archivo/versión | Veredicto | S1 | S2 | S3 | S4 | S5 | S6 | S7 | Total | Defectos B/M/Med/Men | Evidencias verificadas | Observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R0 | 2026-10-23 | — (preparación) | — | — | — | — | — | — | — | — | — | — | BRIEF §3/§4/§6 leído; checklists V/T1 preparadas | No puntúa. Sin borrador todavía. |
| R1 | 2026-10-23 | `01-nucleo.md` 399 líneas · SHA-256 `B0299758…31ACB1BA` · mtime 15:30:55 | **REWORK** | 9,5 | 9,4 | 9,4 | 9,6 | 8,0 | 9,1 | 9,4 | **92,1** | D1 bloqueante (evidencia), D2 menor (terminología) | Lectura íntegra de sección y autoevaluación; métricas reproducidas; 14/14 críticas + 10/10 resto muestreadas; UTF-8 sin mojibake; 13 tablas, 0 mal formadas; sin TODOs ni referencias al BRIEF | Autoevaluación escrita antes de las últimas mejoras (15:29:51 vs archivo 15:30:55). Contenido completo y coherente; el defecto es de evidencia/versión, no de redacción. |
| R2 | 2026-10-23 | `01-nucleo.md` v4 · 400 líneas · SHA-256 `7B07C1B2…75984F9` · mtime 15:34:46 | **PASS** | 9,5 | 9,4 | 9,4 | 9,6 | 9,4 | 9,1 | 9,4 | **94,2** | Ninguno (D1 y D2 cerrados) | Re-verificación completa: hash, bytes, líneas, palabras, H1/H2, tablas, REFS y BLOCKED reproducidos; 18/18 de la checklist en regresión; ~45 citas de la autoevaluación comprobadas; coherencia §8.1 (T3) y §2.3.1–2.3.9 (T4); marcadores=0; UTF-8 sin mojibake | PASS ligado a la versión congelada v4: cualquier edición posterior lo invalida. Observaciones de integración (no defectos): unificar «Dueño/Autor» con §8.1 y ubicar §2.3 de T4 dentro de la sección 2. Calibración: 93,6 del autor vs 94,2 del supervisor (0,6 puntos). |

### ST1.5 — Registro de defectos

| ID | Severidad | Ubicación (archivo:líneas) | Esperado | Evidencia | Estado | Detección (ronda) | Verificación (ronda) |
|---|---|---|---|---|---|---|---|
| D1-01 | Bloqueante | `autoevaluaciones/autor-nucleo.md` (informe completo) frente a `secciones/01-nucleo.md` | Autoevaluación de la versión exacta entregada: métricas, referencias de línea y mejoras posteriores al informe | R1: archivo 399 líneas / 6274 palabras / 15 áreas / SHA `B029…`; el informe declaraba 392 / 6043 / 14 áreas y referencias desplazadas 1–7 líneas. R2 (v4): el informe declara 400 líneas / 6388 palabras / 15 áreas / SHA `7B07…` y ~45 citas comprobadas coinciden con el archivo | verificado-cerrado | R1 | R2 |
| D1-02 | Menor | `secciones/01-nucleo.md:17,44,73,294,319,380,381,387` | Una única denominación del estado | R1: alternaba «BLOQUEADO» y «BLOQUEADA». R2 (v4): `BLOQUEAD=0`, `BLOCKED=12`, alineado con §8.1 de T3 y con R7 del BRIEF | verificado-cerrado | R1 | R2 |

### ST1.6 — Tabla de muestreo

| # | Afirmación/ítem comprobado | Clase | Ubicación real | Método | Resultado | Defecto asociado |
|---|---|---|---|---|---|---|
| 1 | Contrato T1 completo (T1-C01…C18) | Crítica | `01-nucleo.md` completo | Lectura íntegra + checklist 18/18 | Cumple | — |
| 2 | Autoevaluación con S1–S7, evidencias, residuales y decisión | Crítica | `autor-nucleo.md:44-116` | Lectura íntegra | Estructura completa | — |
| 3 | «392 líneas» | Crítica | archivo real | Conteo de líneas | Falso: 399 de contenido (400 con salto final) | D1-01 |
| 4 | «6043 palabras» | Crítica | archivo real | Conteo de palabras con lectura UTF-8 | Falso: 6274 | D1-01 |
| 5 | «13 tablas, 0 mal formadas» | Crítica | archivo real | Detección de tablas y validación de columnas | Verdadero | — |
| 6 | «H1=4 H2=19» | Crítica | archivo real | Conteo de encabezados | Verdadero | — |
| 7 | «R_TAGS=0» | Crítica | archivo real | Regex `R1–R8` | Verdadero | — |
| 8 | «MARCADORES_META=0» | Crítica | archivo real | Regex TODO / BRIEF.md / Este documento / meta-comentario | Verdadero (solo variable legítima `BRIEF_USUARIO`) | — |
| 9 | «REFS=1,2,3,4,5,6,7,8,9,10,12» | Crítica | archivo real | Extracción de referencias § | Verdadero | — |
| 10 | «14 áreas de cobertura en :203-216» | Crítica | archivo real | Conteo de filas de §4.2 | Falso: 15 áreas en :206-220 | D1-01 |
| 11 | Trazabilidad §2: 18 referencias de línea | Crítica | `autor-nucleo.md:21-42` frente a archivo | Comprobación dirigida de las 18 referencias | Todas las que apuntan a contenido posterior a la línea 34 quedan desplazadas 1–7 líneas; las anteriores a esa inserción siguen válidas | D1-01 |
| 12 | Total autoevaluado 94,6 y su aritmética | Crítica | `autor-nucleo.md:56-67` | Recálculo `Σ(nota×peso)/10` | Verdadero (946,0/10) | — |
| 13 | Condiciones de PASS declaradas | Crítica | `autor-nucleo.md:67` | Contraste con BRIEF §4 | Correctas | — |
| 14 | Sin contradicciones con BRIEF, sin meta-comentarios, sin TODOs, español | Crítica | archivo completo | Barrido dirigido + lectura | Cumple | — |
| 15 | Justificación S1 | Resto | `autor-nucleo.md:48` | Contraste con checklist | Sostiene la nota salvo el desfase de evidencia | D1-01 |
| 16 | Justificación S2 (REFS) | Resto | `autor-nucleo.md:49` | Reproducción del dato | Verdadera | — |
| 17 | Justificación S3 (tablas, plan B) | Resto | `autor-nucleo.md:50` + archivo `:275`, `:291-300` | Muestreo dirigido | Verdadera | — |
| 18 | Justificación S4 (doble mecanismo R) | Resto | `autor-nucleo.md:51` | Muestreo de R1/R2/R6/R7 | Verdadera | — |
| 19 | Justificación S5 | Resto | `autor-nucleo.md:52` | Contraste | Parcial: no cubre los cambios posteriores | D1-01 |
| 20 | Justificación S6 (formato) | Resto | `autor-nucleo.md:53` | Reproducción H1/H2/tablas | Verdadera | D1-02 |
| 21 | Justificación S7 (mecanismos anti-gaming) | Resto | `autor-nucleo.md:54` | Muestreo 6/8 mecanismos citados | Verdadera | — |
| 22 | Mejoras aplicadas §4 (8) | Resto | `autor-nucleo.md:69-80` | Muestreo 5/8 (núms. 2, 3, 4, 5, 7) | Verdaderas, con referencias de línea obsoletas | D1-01 |
| 23 | Residuales MR-1…MR-3 | Resto | `autor-nucleo.md:84-88` | Evaluación de severidad y coste | Razonables y justificadas | — |
| 24 | Riesgos y supuestos §7 (4) | Resto | `autor-nucleo.md:103-106` | Muestreo 2/4 | Coherentes | — |

| 25 | Hash, bytes, líneas, palabras, H1/H2 y tablas de v4 | Crítica | archivo real | Reproducción con hash y conteos | Coincide al 100 % con §0 del informe | — |
| 26 | Referencias de línea de la tabla de trazabilidad y de S1–S7 | Crítica | `autor-nucleo.md` frente a archivo | Comprobación de las ~45 citas | Coinciden exactamente en v4 | — |
| 27 | D2: `BLOQUEAD=0` / `BLOCKED=12` | Crítica | archivo real | Regex y lectura de los 12 contextos | Verdadero; una sola denominación | — |
| 28 | Alineación con §8.1 de T3 | Crítica | `03-supervision.md:404-415` | Comparación fila a fila de estados y transiciones | Idéntica salvo el sinónimo «Dueño/Autor» | — |
| 29 | Referencias §2.3.x | Crítica | `04-integracion.md:5-98` | Localización de las 9 subsecciones | §2.3.1–2.3.9 existen en T4; referencia válida | — |
| 30 | Regresión T1-C01…T1-C18 | Crítica | v4 completo | Re-lectura íntegra + checklist | 18/18 cumplen | — |
| 31 | Mejoras aplicadas §4 (14) | Resto | `autor-nucleo.md:88-103` | Muestreo 6/14 (núms. 2, 3, 4, 5, 8, 14) | Verdaderas en v4 | — |
| 32 | Residuales MR-1…MR-3 | Resto | `autor-nucleo.md:107-111` | Revisión 3/3 | Menores y justificadas | — |
| 33 | Riesgos y supuestos §7 (4) | Resto | `autor-nucleo.md:127-130` | Muestreo 2/4 | Coherentes | — |
| 34 | Respuesta D1/D2 (§10) | Resto | `autor-nucleo.md:145-152` | Contraste 2/2 con los defectos y sus arreglos | Coherente y honesta | — |
| 35 | Historial v1–v4 (§8) | Resto | `autor-nucleo.md:134-139` | Revisión 1/1 | Coherente con los cambios | — |

Recuento R1: `14/14 críticas · 10/10 resto (100 %)`.
Recuento R2: `14/14 críticas · 14/24 resto (58 %)` — cumple el mínimo ≥50 %.

---

## ST2 — Supervisión independiente de T2 (`secciones/02-rubrica.md`)

**Autor supervisado:** `autor-rubrica`. **Autoevaluación exigida:** `autoevaluaciones/autor-rubrica.md`.
**Estado:** rondas 1–2 supervisadas (2026-10-23). Ronda 1: **REWORK** (D1 medio, D2 y D3 menores). Ronda 2: **PASS (93,6)** sobre versión congelada.
**Versión con PASS (ronda 2):** `secciones/02-rubrica.md`, 328 líneas de contenido (329 segmentos con salto final), 5140 palabras, 12 tablas (0 mal formadas), 2 H2 + 14 H3 = 16 encabezados; SHA-256 `F4BDCC4E580C81DD58662DAF64713A0DD8E4521DEE726022FB3CACAB1F1FEC12`; mtime 15:42:10. Autoevaluación de 121 líneas (SHA-256 `FFEE690F…`). Cualquier edición posterior invalida este PASS (P19).
**Contrato de referencia:** BRIEF §3 (T2) + §2 (R1–R8) + §4/§5 (coherencia numérica) + §6 (reglas de proceso). Numeración prevista: sección 6 (rúbrica universal y cálculo del 90 %).

### ST2.1 — Checklist contractual (derivada del contrato T2)

| ID | Comprobación | Evidencia exigida | Severidad si falta |
|---|---|---|---|
| T2-C01 | Archivo existe, legible, encabezado como sección 6 según numeración prevista; sin TODO/«[pendiente]» salvo variables | Primera línea + cabecera | Bloqueante |
| T2-C02 | Exactamente 10 criterios universales, con identificador, nombre y qué evalúa cada uno | Tabla rúbrica (conteo = 10) | Bloqueante |
| T2-C03 | Pesos de los 10 criterios con suma **exacta = 100** (recalculado fila a fila, no aceptado por declaración) | Tabla de pesos + suma reproducida | Bloqueante |
| T2-C04 | Criterios críticos marcados explícitamente; coherentes con BRIEF §5 (críticos C1, C2, C4, C5, C6; no críticos C3, C7–C10); regla «crítica < 9 = no PASS» | Marca de crítico + regla | Bloqueante |
| T2-C05 | Descriptores por nivel: 10, 9, 8, 7, 5, 0 (según encargo de T2), observables y distinguibles entre sí; no adjetivos vacíos repetidos | Tabla de niveles/ejemplos | Bloqueante |
| T2-C06 | Reglas de puntuación: sin evidencia = 0; sin redondeo al alza; una decimal; nota > 7 exige evidencia; N/A no discrecional | Lista de reglas | Bloqueante |
| T2-C07 | Fórmula del total explícita (`Σ(nota×peso)/10`), con un decimal, y un ejemplo de cálculo reproducible | Fórmula + ejemplo | Bloqueante |
| T2-C08 | Umbral 90 % en autoevaluación definido, inviolable y con borde explícito (89,9 = NO ENTREGO; 89,95 → 89,9 no se redondea) | Regla + ejemplo límite | Bloqueante |
| T2-C09 | Protocolo de autoevaluación en **exactamente 7 pasos** numerados, previos a entregar, ejecutables (incluye re-medición y rework interno, no basta con «revisar») | Lista numerada 1–7 | Bloqueante |
| T2-C10 | Definición operacional de mejora residual + regla de coste/beneficio (cuándo una mejora asequible impide la entrega) | Definición + regla | Bloqueante |
| T2-C11 | Severidades bloqueante/mayor/medio/menor definidas con ejemplo y consecuencia sobre la decisión; coherente con BRIEF §6.6 (B/M/Med abiertos = no PASS) | Tabla severidades | Bloqueante |
| T2-C12 | Regla de decisión ENTREGO / NO ENTREGO binaria y completa: condiciones exactas de ENTREGO; prohibido «con reservas», «si no llega, entrega», aprobación condicional | Regla de decisión | Bloqueante |
| T2-C13 | Plantilla de informe de autoevaluación con campos verificables: archivo, ronda, criterios/notas/evidencias, total y cálculo, mejoras residuales con severidad, decisión, riesgos/supuestos, fecha | Plantilla | Bloqueante |
| T2-C14 | Reglas anti-autoengaño y calibración: anclas de calibración, detección de inflación, prohibición de criterios propios, discrepancia autor-supervisor > 10 = defecto, evidencia declarada no basta | Sección calibración | Bloqueante |
| T2-C15 | 2–3 ejemplos de puntuación límite con resolución correcta y razonada (aprobación y no aprobación), no solo enunciados | Ejemplos desarrollados | Mayor |
| T2-C16 | Coherencia numérica global y no contradicción: 10 = 100; 90 en todos los niveles; 5 rondas máx.; ninguna regla posterior contradice otra ni el BRIEF; no duplica supervisión (sección 7) ni descomposición (sección 4) | Barrido de cifras + referencias | Bloqueante |
| T2-C17 | Listo para integrar: español, sin meta-comentarios, sin relleno, tablas, jerarquía, sin TODOs | Revisión de formato | Mayor |
| T2-C18 | Anti-gaming propio de la rúbrica: sin N/A discrecional, sin autoaprobación, sin umbral móvil, sin redondeo al alza, sin nota sin evidencia, sin «aprobado con reservas» | Búsqueda dirigida de patrones | Bloqueante |

### ST2.2 — Verificaciones adicionales obligatorias (proceso)

| ID | Verificación | Método | Evidencia |
|---|---|---|---|
| V-T2-01 | Lectura íntegra del archivo | Lectura completa y conteo de líneas | Rango leído |
| V-T2-02 | Autoevaluación real del autor | Leer `autoevaluaciones/autor-rubrica.md` completo (mismos campos que V-T1-02) | Archivo + líneas |
| V-T2-03 | Aritmética de la autoevaluación | Recalcular total declarado; un decimal | Cálculo reproducido |
| V-T2-04 | Coherencia numérica del contenido | Sumas de pesos, fórmula en todos los lugares, ejemplos extremos (89,9 / 89,95 / crítica 8,9), umbral repetido sin variantes | Tabla de recálculo |
| V-T2-05 | Cobertura de evidencias declaradas | 100 % críticas + muestreo ≥ 50 % resto; registrar en tabla de muestreo | Tabla de muestreo |
| V-T2-06 | Calibración | Diferencia entre total autoevaluado y mi total: ≤ 10 | Registro de cálculo |
| V-T2-07 | Independencia y scope | Sin edición fuera de scope ni toque de git/skills/memoria | Evidencia de rutas/estado |

### ST2.3 — Rúbrica S1–S7 aplicada a T2 (ronda 1)

| ID | Criterio | Peso | Crítico | Nota R1 | Evidencia de la nota |
|---|---|---|---|---|---|
| S1 | Contrato completo | 20 | Sí | 9,3 | Los 13 elementos del contrato T2 están presentes; la plantilla de 5.7 queda incompleta frente a 5.3 (D2-01) |
| S2 | Corrección técnica y coherencia global | 15 | Sí | 9,0 | Pesos 100 y críticos 78 reproducidos; ejemplos 91,0/88,7/90,0; truncado verificado; D2-01 y D2-02 son inconsistencias internas acotadas |
| S3 | Utilidad ejecutable | 15 | Sí | 9,1 | Regla D1–D7 ejecutable; protocolo de 7 pasos; 3 ejemplos límite; D2-01 obliga a interpretar un campo de la plantilla |
| S4 | Alineación literal con encargo/BRIEF | 15 | Sí | 9,4 | R1, R2, R4, R5, R6 y R7 con mecanismos explícitos; umbral 90 y calibración >10 alineados con el BRIEF |
| S5 | Autoevaluación honesta y trazable | 15 | Sí | 9,0 | Evidencias mecánicas reproducidas por el supervisor (100 / 78 / 91,0 / 88,7 / 90,0 / 89,87 / 89,9); dos citas de línea imprecisas (D2-03) y «plantilla completa» ligeramente sobreafirmado |
| S6 | Claridad, concisión, formato | 10 | No | 9,0 | 12 tablas correctas; sin TODOs, fugas meta, IDs del BRIEF ni emojis; frase imprecisa en `:220` (D2-02) |
| S7 | Resistencia al gaming | 10 | No | 9,3 | Sin evidencia = 0, truncado, críticos con mínimo propio, D1–D7, señales de autoengaño y frases prohibidas |
| — | **Total** | 100 | — | **91,6** | 916,5/10 = 91,65 → truncado 91,6; críticas S1–S5: 9,3 / 9,0 / 9,1 / 9,4 / 9,0 |
| — | **Veredicto R1** | — | — | **REWORK** | Total ≥90 pero D2-01 (Medio) abierto; dos menores más |

### ST2.3bis — Rúbrica S1–S7 aplicada a T2 (ronda 2, versión corregida)

| ID | Criterio | Peso | Crítico | Nota R2 | Evidencia de la nota |
|---|---|---|---|---|---|
| S1 | Contrato completo | 20 | Sí | 9,5 | 13 elementos del contrato T2 cubiertos; la plantilla de 5.7 ya declara los 8 campos de 5.3 más la decisión (`:159-161`, 9 columnas) |
| S2 | Corrección técnica y coherencia global | 15 | Sí | 9,4 | Pesos 100 y críticos 78; ejemplos 91,0/88,7/90,0 y truncado reproducidos; sin contradicciones internas tras C10–C12; referencias §4/§7/§8 válidas |
| S3 | Utilidad ejecutable | 15 | Sí | 9,4 | Decisión D1–D7 binaria; plantilla copiable de 9 columnas; regla de notas intermedias sin ambigüedad (`:220`); tres ejemplos límite |
| S4 | Alineación literal con encargo/BRIEF | 15 | Sí | 9,4 | R1, R2, R4, R5, R6 y R7 con mecanismos explícitos; umbral 90, truncado y calibración >10 alineados |
| S5 | Autoevaluación honesta y trazable | 15 | Sí | 9,3 | Hash, mtime, métricas y citas verificadas (`:186`, `:245`, `:245-251`); acepta y documenta D1–D3; total 92,5 reproducible y comparativa con la supervisión |
| S6 | Claridad, concisión, formato | 10 | No | 9,0 | 12 tablas correctas; 16 encabezados; 0 fugas meta/IDs/emojis; densidad alta, penalizada |
| S7 | Resistencia al gaming | 10 | No | 9,4 | Sin evidencia = 0; truncado; D1–D7; ejemplos de atajos; registro de calibración |
| — | **Total** | 100 | — | **93,6** | 936,5/10 = 93,65 → truncado 93,6; críticas ≥9 (9,5 / 9,4 / 9,4 / 9,4 / 9,3) |
| — | **Veredicto R2** | — | — | **PASS** | ≥90,0; ninguna <7,0; críticas ≥9; cero B/M/Med; 2 menores justificadas; D1, D2 y D3 cerrados |

### ST2.4 — Registro de rondas

| Ronda | Fecha | Archivo/versión | Veredicto | S1 | S2 | S3 | S4 | S5 | S6 | S7 | Total | Defectos B/M/Med/Men | Evidencias verificadas | Observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| R0 | 2026-10-23 | — (preparación) | — | — | — | — | — | — | — | — | — | — | BRIEF §3/§4/§5/§6 leído; checklists V/T2 preparadas | No puntúa. Sin borrador todavía. |
| R1 | 2026-10-23 | `02-rubrica.md` 328 líneas · SHA-256 `69CF07DD…E8EBA7B1` · mtime 15:30:31 | **REWORK** | 9,3 | 9,0 | 9,1 | 9,4 | 9,0 | 9,0 | 9,3 | **91,6** | D2-01 Medio (plantilla 5.7 vs 5.3), D2-02 Menor (notas intermedias), D2-03 Menor (citas autoeval) | Lectura íntegra de sección y autoevaluación; aritmética reproducida (pesos 100, críticos 78, ejemplos 91,0/88,7/90,0, A3 8,9→89,87→89,8, 89,96→89,9, total propio 92,2); 12 tablas, 0 mal formadas; 16 encabezados; 0 fugas meta/IDs/emojis/mojibake; citas de §1 comprobadas | Mecánica de rúbrica sólida; defectos acotados y baratos. Calibración: 92,2 declarado vs 91,6 supervisado = 0,6. |
| R2 | 2026-10-23 | `02-rubrica.md` 328 líneas · SHA-256 `F4BDCC4E…CAB1F1FEC12` · mtime 15:42:10 | **PASS** | 9,5 | 9,4 | 9,4 | 9,4 | 9,3 | 9,0 | 9,4 | **93,6** | Ninguno (D2-01/02/03 cerrados) | Re-verificación: hash, líneas, tablas y encabezados reproducidos; plantilla `:160-161` con 9 columnas y los 8 campos de 5.3; `:220` reescrita sin contradicción; citas `:186`/`:245`/`:245-251` exactas; aritmética 100/78/91,0/88,7/90,0/89,87; autoevaluación de 121 líneas con total 925→92,5; 0 fugas; regresión completa de la checklist T2 | PASS ligado a SHA `F4BDCC4E…`: cualquier edición posterior lo invalida. Calibración 92,5 vs 93,6 = 1,1. |

### ST2.5 — Registro de defectos

| ID | Severidad | Ubicación (archivo:líneas) | Esperado | Evidencia | Estado | Detección (ronda) | Verificación (ronda) |
|---|---|---|---|---|---|---|---|
| D2-01 | Medio | `secciones/02-rubrica.md:41` frente a `:160-161` | La plantilla obligatoria de 5.7 debe permitir declarar todos los campos que 5.3 exige por residual | R1: 5.3 exige 8 campos; la tabla tenía 7 columnas y faltaba «quién podría decidirla». R2: cabecera y fila de ejemplo con 9 columnas que cubren los 8 campos + decisión; verificado 9/9 celdas | verificado-cerrado | R1 | R2 |
| D2-02 | Menor | `secciones/02-rubrica.md:220` | Descripción correcta del uso de notas intermedias | R1: «6, 4, 3, 2 y 1… no llega a 5» era impreciso. R2: «6,0–6,9 … por encima de 5,0; 4,9–0,0 para 5,0 o peores»; coherente con 6.3 y sin contradicción | verificado-cerrado | R1 | R2 |
| D2-03 | Menor | `autoevaluaciones/autor-rubrica.md:24,32,74` | Citas de línea exactas y reproducibles | R1: `:184` debía ser `:186`; `:243` debía ser `:245`; rango impreciso. R2: informe de 121 líneas con `:186`, `:245` y `:245-251` exactos, comprobados contra el archivo | verificado-cerrado | R1 | R2 |

### ST2.6 — Tabla de muestreo

| # | Afirmación/ítem comprobado | Clase | Ubicación real | Método | Resultado | Defecto asociado |
|---|---|---|---|---|---|---|
| 1 | Contrato T2 completo (13 elementos) | Crítica | `02-rubrica.md` completo | Lectura íntegra + checklist | Cumple, salvo la plantilla (D2-01) | D2-01 |
| 2 | Exactamente 10 criterios A1–A10 | Crítica | `:192-203` | Conteo de filas | Verdadero | — |
| 3 | Pesos suman 100 | Crítica | `:205` | Recálculo fila a fila | Verdadero | — |
| 4 | Críticos A1–A6 = 78 | Crítica | `:194-199`, `:205` | Recálculo | Verdadero | — |
| 5 | Descriptores 10/9/8/7/5/0 y anclas | Crítica | `:209-235` | Verificación de niveles y anclas | Presentes; matiz de redacción (D2-02) | D2-02 |
| 6 | Sin evidencia = 0 y sin redondeo al alza | Crítica | `:188`, `:90-93`, `:245-251` | Verificación de reglas | Verdadero | — |
| 7 | Fórmula y truncado | Crítica | `:241-251` | Recálculo: 8,9 en A3 → 89,87 → 89,8; 89,96 → 89,9 | Verdadero | — |
| 8 | Protocolo de autoevaluación en 7 pasos | Crítica | `:14-26` | Conteo de pasos | Verdadero (7) | — |
| 9 | Mejora residual, severidades y asequibilidad | Crítica | `:28-49` | Verificación contra contrato | Cumple; la plantilla no refleja todos los campos (D2-01) | D2-01 |
| 10 | Regla de decisión binaria D1–D7 | Crítica | `:51-73` | Verificación | Verdadero | — |
| 11 | Regla del 90 % y calibración > 10 | Crítica | `:75-83` | Verificación | Verdadero | — |
| 12 | Plantilla de informe de autoevaluación | Crítica | `:125-175` | Contraste con 5.3 | Incompleta (falta «quién decide») | D2-01 |
| 13 | Anti-autoengaño y calibración | Crítica | `:85-123` | Verificación | Verdadero | — |
| 14 | Tres ejemplos de puntuación límite | Crítica | `:269-328` | Recálculo de los 3 | Verdaderos: 91,0 / 88,7 / 90,0 | — |
| 15 | Sin duplicar supervisión (sección 7) ni descomposición (sección 4) | Crítica | `:7`, `:68`, `:186`, `:267` | Verificación de referencias | Solo referencias, no definiciones | — |
| 16 | Coherencia numérica global y ausencia de TODOs/meta | Crítica | archivo completo | Barrido dirigido | Cumple (D2-02 es redacción) | D2-02 |
| 17 | Justificaciones S1–S7 del informe | Resto | `autor-rubrica.md:38-44` | Muestreo 4/7 (S1, S2, S5, S6) | Coherentes; «plantilla completa» sobreafirmado | D2-01 |
| 18 | Evidencias §6 del informe | Resto | `autor-rubrica.md:78-88` | Reproducción 4/4 | Verdaderas, con las salvedades de D2-03 | D2-03 |
| 19 | Residuales M1/M2 | Resto | `autor-rubrica.md:57-58` | Revisión 2/2 | Menores y justificadas | — |
| 20 | Riesgos y supuestos | Resto | `autor-rubrica.md:92-96` | Muestreo 3/5 | Coherentes | — |
| 21 | Citas de línea de la tabla §1 | Resto | `autor-rubrica.md:20-31` | Comprobación de ~20 citas | Mayoría correctas; 2 imprecisas | D2-03 |
| 22 | Hash, líneas, tablas y encabezados de la versión corregida | Crítica | archivo real | Reproducción con pwsh | Coincide: `F4BDCC…`, 328 líneas, 12 tablas / 0 mal formadas, 16 encabezados | — |
| 23 | D1: plantilla de 5.7 con los 8 campos de 5.3 | Crítica | `:159-161` | Conteo de columnas y campos | 9 columnas / 9 celdas; 8 campos + decisión | — |
| 24 | D2: regla de notas intermedias | Crítica | `:220` | Lectura y contraste con 6.3 | Correcta y sin contradicción | — |
| 25 | D3: citas corregidas del informe | Crítica | `autor-rubrica.md:24,32,74` | Comprobación contra el archivo | `:186`, `:245` y `:245-251` exactas | — |
| 26 | Regresión de la checklist T2 | Crítica | archivo completo | Re-lectura íntegra | Los 13 elementos del contrato se mantienen | — |
| 27 | Aritmética y ejemplos | Crítica | `:241-251`, `:290,309,328` | Recálculo | Pesos 100, críticos 78, 91,0 / 88,7 / 90,0, 89,87, 89,9 | — |
| 28 | Autoevaluación actualizada y su total | Crítica | `autor-rubrica.md` | Recálculo y contraste | 121 líneas; 925→92,5; hash nuevo y anterior en cabecera | — |
| 29 | Cambios quirúrgicos declarados | Resto | archivo | Comparación con la lectura de ronda 1 | Solo `:160-161` y `:220` cambiaron; sigue con 328 líneas | — |
| 30 | Residuales M1/M2 y limpieza | Resto | `autor-rubrica.md:58-61`, `:94` | Revisión | 2 menores justificadas; 0 fugas meta; 0 TODOs | — |

Recuento R1: `16/16 críticas · 14/19 resto (74 %)` — cumple el mínimo ≥50 %.
Recuento R2: `7/7 críticas · 2/3 resto (67 %)` — cumple el mínimo ≥50 %.

---

## GATE FINAL — Prompt integrado (FG-A, C1–C10)

**Estado:** **SUPERVISADO (2026-10-23)**. Versión congelada: `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` v1.1 (evidencia 1.2), 1.832 líneas, 189.489 bytes, SHA-256 `5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7`, mtime 16:20:50. Hash reproducido con `Get-FileHash` antes y durante la revisión; sin cambios. Cualquier cambio de bytes invalida este gate.
**Fuente de verdad:** el prompt integrado real (lectura íntegra de las 1.832 líneas) + `LEEME.md` + `EVIDENCIA.md` + las 4 secciones + autoevaluaciones + `supervision/scorecard-supervisor-b.md` + `auditoria/red-team-informe.md` (incluida su FASE 5 de cierre); no el mensaje del Lead.
**Coordinación:** comparar este total con el de `supervisor-calidad-b` (FG-B). Si difieren en > 5 puntos, reconciliar con evidencias antes del veredicto (BRIEF §5). El Lead no puede aprobar por encima de un supervisor.

### Gate.1 — Rúbrica C1–C10 (BRIEF §5)

| ID | Criterio | Peso | Crítico | Qué verifico | Nota | Evidencia (sección/línea/fragmento) |
|---|---|---|---|---|---|---|
| C1 | Fidelidad literal al encargo (R1–R8, matriz completa) | 14 | Sí | Matriz R1–R8 → sección/línea → ≥2 mecanismos independientes; encargo §0 respetado | 9,6 | Encargo §0 cubierto en §1.1, P2–P4, §4.1–§4.3, §5, §7 y §8; `EVIDENCIA.md:29-38` (8 filas, 6–11 mecanismos cada una); las 48 referencias de línea citadas se comprobaron una a una contra el prompt (todas existen y corresponden); Anexo D `:1815-1828` |
| C2 | Ejecutabilidad: copiar y pegar y funciona | 14 | Sí | Variables definidas, sin contradicciones, sin pseudocódigo, sin ficheros/herramientas inexistentes, sin pasos imposibles | 9,6 | Variables §1.2 completas; Fases 0–6 con salidas y gates; flujo Gate 4→Fase 5→Gate 5 sin ciclos (`:481-482`, `:1464-1466`, `:1618`); 9/9 skills citadas existen; `tools/verificar-despliegue.ps1`, `tools/verificar-apps-produccion.ps1`, `tools/.htaccess` y `playwright-cli` 0.1.22 existen; sin pseudocódigo; sin contradicciones detectadas; adaptación §12.2 |
| C3 | Cobertura del ciclo web y tareas distintas | 8 | No | Cobertura completa del ciclo y de skills/proyecto; descomposición suficiente | 9,7 | §4.1–§4.2 (15 áreas); §9.1–§9.13 (flujo, consola, red, descargas, persistencia, responsive, accesibilidad, entorno final); §2.2 (proyecto) y §12.2 (adaptación) |
| C4 | Autoevaluación y regla de no-entrega | 12 | Sí | Rúbrica, informe, decisión ENTREGO/NO ENTREGO, 7 pasos, 90 % | 9,7 | §5.1–§5.8: protocolo de 7 pasos, rúbrica §6, D1–D7, plantilla §5.7, autoevaluación de todos los roles §5.8; 89,9 ≠ 90 y truncado (`:588`) |
| C5 | Supervisión independiente y umbral 90 | 14 | Sí | Independencia, reproducción de evidencias, PASS/REWORK, veto, doble nivel | 9,7 | §7.1–§7.15: independencia y conflictos, inventario de afirmaciones, 100 % de críticas + ≥50 % del resto, evidencia válida/obsoleta/falsa, puntuación ciega, PASS/REWORK, scorecards, auditoría end-to-end y anti-gaming |
| C6 | Rework, escalado y bloqueo seguro | 9 | Sí | 5 rondas, re-verificación, escalado, BLOCKED sin entrega disfrazada | 9,6 | §8.1–§8.10: máximo 5 rondas, admisión de reenvíos, re-verificación completa, escalado/desempate, reasignación, división de alcance y BLOCKED; prohibiciones §8.9 |
| C7 | Integración Antigravity y verificación real | 9 | No | Navegador, descargas en disco, responsive, Lighthouse, deploy, reglas del proyecto sin inventar | 9,5 | §2.2.1–§2.2.9 contrastado con archivos reales: `SKILL_MAESTRA.md:467-472` (image 2), `:128/:137` (Hoola/Electrolize), `SKILL_history-server.md:43-46` (list/save/delete/clear), `SKILL_arquitecto-backend-php-hostinger.md:84` (health), `SKILL_AUDITOR.md` secciones A–H, `SKILL_VERIFICACION_PLAYWRIGHT.md:14-43` (playwright-cli); §9 completo y §12.2 |
| C8 | Evidencias, plantillas y trazabilidad | 7 | No | Plantillas completas y utilizables; evidencia reproducible | 9,5 | §11 índice único; plantillas §5.7/§7.12/§8.8/§9.13/§10.2/§10.3; `EVIDENCIA.md` §3–§4 (matriz R1–R8 verificada, 48 citas válidas) y Anexo D; 1 menor documental en `LEEME.md` (M-01), no en el prompt |
| C9 | Claridad, estructura y consistencia | 6 | No | Sin duplicidades ni contradicciones; numeración 1–12 coherente | 9,4 | 13 H1 (título + §1–§12), 84 H2 y 19 H3; 71 referencias § únicas resueltas (0 rotas); tabla de estados única; sin duplicados ni contradicciones; 32 cercas equilibradas; tamaño mitigado por `LEEME.md` §«Tamaño y contexto» |
| C10 | Resistencia al autoengaño/gaming | 7 | No | Sin escapatorias; calibración; muestreo; evidencia verificada | 9,6 | §5.6, §7.6–§7.8, §7.15 y §8.9, P13/P19; barrido anti-gaming con señal y respuesta por patrón; prohibiciones expresas de «con reservas», N/A discrecional, redondeo, umbral móvil, evidencia declarada, autosupervisión y PASS heredado |
| — | **Total** | 100 | — | `Σ(nota×peso)/10` un decimal | **96,0** | 960,6/10 = 96,06 → truncado 96,0; críticas C1/C2/C4/C5/C6 = 9,6 / 9,6 / 9,7 / 9,7 / 9,6 |
| — | **Veredicto FG-A** | — | — | PASS / REWORK / ESCALADO | **PASS** | Total ≥90,0; ninguna nota <7,0 (mínima 9,4); críticas ≥9,0; cero B/M/Med abiertos; 1 menor documental justificada (≤3; M-02 quedó resuelta durante el gate al actualizarse `EVIDENCIA.md`) |

### Gate.2 — Pruebas obligatorias del prompt final

| ID | Prueba | Criterio de aceptación | Resultado | Evidencia |
|---|---|---|---|---|
| PF-01 | Trazabilidad R1–R8 | Cada requisito mapeado a sección/línea y a ≥ 2 mecanismos independientes | **PASA** | `EVIDENCIA.md:29-38` (8 filas, 6–11 mecanismos); 48 líneas citadas comprobadas una a una contra el prompt, todas correctas; Anexo D `:1819-1828` |
| PF-02 | Prueba de mesa | Simular brief realista y recorrer Fases 0–6 solo con el prompt | **PASA** | Brief simulado: app de fichas de producto con imagen, selectores calidad/formato/resolución, historial en Hostinger, descarga JSON y publicación. Fase 0: §1.2 + §3.2 + ≤3 preguntas + supuestos + Gate 0. Fase 1: §4.1 tareas + §4.2 15 áreas + §4.3 tabla + §4.4 contratos + §4.5 tablero + §4.6 supervisores + §4.10 gates. Fase 2: §5.2/§5.7 + §6 + D1–D7. Fase 3: §7.2/§7.5/§7.6/§7.10/§7.12/§7.14. Fase 4: §8. Fase 5: §9.1–§9.13. Fase 6: §10.2/§10.3 + §10.4. Sin pasos imposibles ni datos indefinidos |
| PF-03 | Prueba anti-gaming | Cero escapatorias: entrega <90, N/A discrecional, «aprobado con reservas», umbral móvil, redondeo al alza, evidencia declarada sin comprobar, autosupervisión, PASS heredado, coste inflado, rondas no consumidas | **PASA** | Barrido real: 0 ocurrencias de «si no llega/entregar igual»; N/A solo por ausencia real y con aprobación (§9.13, §9.8); «con reservas»/«provisional» solo en prohibiciones; truncado sin redondeo (§6.5); PASS ligado a versión (P19); muestreo documentado (§7.6); coste recalculado por el supervisor (§5.3, §7.8.4); topes a retiradas/reenvíos (§8.2, §8.4); 5 rondas sin reinicio (§8.7) |
| PF-04 | Coherencia numérica | 10 criterios = 100; umbral 90 en todos; 5 rondas; calibración >10 | **PASA** | §6.2: 10 criterios, 18+15+13+10+12+10+8+6+5+3 = 100, críticos A1–A6 = 78; 90,0 en autoevaluación/supervisión/auditoría/entrega (§5.5, §6.5, §7.10, §10.1); máximo 5 rondas (§8.2, §8.6, §8.7, §10.3); discrepancia >10 = defecto (§5.5.7, §7.8.6) y ≥2,0 en crítico; ≤3 menores (§5.3, §7.10, §8.10) |
| PF-05 | `LEEME.md` coherente | Uso, variables y verificación sin contradecir el prompt | **PASA CON 1 MENOR** | `LEEME.md` pasos 1–5, variables `:29` y comprobación `:33-37` coherentes; RT-27 corregido (`:45`); 1 menor documental M-01 en Gate.4; M-02 quedó resuelta al actualizarse `EVIDENCIA.md` durante el gate |
| PF-06 | Adaptación y reglas del proyecto | Instrucciones fuera de Antigravity; reglas correctas y no inventadas | **PASA** | Skills y herramientas reales verificadas (ver C7); §12.2 cubre fuera de Antigravity; reglas de proyecto coinciden con `CLAUDE.md` y skills |

### Gate.3 — Registro de rondas del gate final

| Ronda | Fecha | Versión del prompt | Veredicto FG-A | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | Total | Defectos B/M/Med/Men | Evidencias verificadas | Observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G0 | 2026-10-23 | — (preparación) | — | — | — | — | — | — | — | — | — | — | — | — | — | BRIEF §5/§7 leído; rúbrica y pruebas preparadas | No puntúa. Sin prompt integrado. |
| G1 | 2026-10-23 | prompt v1.1 · 1.832 líneas · SHA-256 `5BE0BB94…F1DA7` · mtime 16:20:50 | **PASS** | 9,6 | 9,6 | 9,7 | 9,7 | 9,7 | 9,6 | 9,5 | 9,5 | 9,4 | 9,6 | **96,0** | M-01 (1 menor documental) | Lectura íntegra de 1.832 líneas; hash/bytes/líneas/tablas/cercas/referencias; PF-01…06; matriz R1–R8 (48 líneas citadas); prueba de mesa; anti-gaming; coherencia numérica; skills y herramientas reales; autoevaluación del integrador (94,7) contrastada; red-team FASE 5 | Calibración 94,7 vs 96,0 = 1,3. Red-team final ACEPTABLE (0 B/M/Med/Men). Discrepancia con el red-team reportada: 1 menor documental en `LEEME.md` (no en el prompt); M-02 resuelta durante el gate al actualizarse `EVIDENCIA.md`; prevalece mi verificación. |

### Gate.4 — Registro de defectos del gate final

| ID | Severidad | Ubicación (archivo:líneas) | Esperado | Evidencia | Estado | Detección (ronda) | Verificación (ronda) |
|---|---|---|---|---|---|---|---|
| FG-A-M01 | Menor | `LEEME.md:51` | Cifra de hallazgos coherente con el total auditado | Dice «(26 hallazgos)»; el red-team documenta RT-01…RT-32 (32 IDs) y la autoevaluación del integrador habla de 2 rondas + delta (31 hallazgos + 2 documentales). No afecta al prompt | abierto (documental) | G1 | — |

**M-02 retirada durante el gate (no es defecto abierto):** `EVIDENCIA.md` se actualizó a las 16:27:40 y ahora declara 581 líneas y cierra con §24–§25; el prompt no cambió. La mención histórica «550 líneas» dentro del propio informe red-team es texto de auditoría de una fase anterior, no una dependencia del paquete.
**Justificación de la menor (PASS permite hasta 3 con coste/beneficio):** es exclusivamente documental, no afecta a la ejecución del prompt ni a su SHA `5BE0BB94…`, y su corrección cuesta minutos en T12 sin re-verificación del prompt. No bloquea el gate.
**Observaciones no bloqueantes:** (a) Anexo D `:1817` cita `EVIDENCIA.md` como ubicación de la matriz extensa; el red-team lo calificó de observación opcional, no de dependencia de ejecución; (b) §3.2/§9.8 admiten una categoría de Lighthouse < 90 con causa raíz documentada y aprobada por el supervisor: excepción explícita y registrada, no «N/A discrecional»; (c) tamaño ~184 KB mitigado en `LEEME.md` con reparto por rol.

---

## Estado de tareas de supervisión

| Tarea | Objeto | Estado | Cierre |
|---|---|---|---|
| `task-5` (ST1) | T1 `secciones/01-nucleo.md` | **PASS ronda 2 (94,2)**; `task-5` cerrada | Registro R1/R2; D1 y D2 verificados-cerrados |
| `task-6` (ST2) | T2 `secciones/02-rubrica.md` | **PASS ronda 2 (93,6)**; `task-6` cerrada | Registro R1/R2; D1, D2 y D3 verificados-cerrados |
| `task-11` (FG-A) | Prompt integrado C1–C10 | **PASS FG-A (96,0)** sobre SHA `5BE0BB94…`; `task-11` cerrada | Registro G1, PF-01…06 y 1 menor documental justificada |

**Firma del supervisor:** `supervisor-calidad-a` — 2026-10-23. ST1 94,2 (`7B07C1B2…75984F9`), ST2 93,6 (`F4BDCC4E…CAB1F1FEC12`) y FG-A **96,0** (`5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7`) quedan certificados con PASS. El PASS de FG-A está ligado a la versión congelada de 1.832 líneas y 189.489 bytes: cualquier cambio de bytes lo invalida (P19). El veredicto se emitió con total exacto 96,0 ≥ 90,0, críticas ≥ 9,0, ninguna nota < 7,0 y cero defectos B/M/Med; la menor documental M-01 se documenta y acepta con justificación de coste/beneficio. No se aprueba nada «con reservas»: el PASS es pleno sobre esta versión.
