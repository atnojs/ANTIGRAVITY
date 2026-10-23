# Autoevaluación — T2: Autoevaluación y rúbrica universal

| Campo | Valor |
|---|---|
| Tarea | `task-2` — T2 (BRIEF §3) |
| Autor | `autor-rubrica` |
| Fecha | 2026-10-23 |
| Archivo entregable | `tools/prompts/maestro-web-autocalidad/secciones/02-rubrica.md` — **328 líneas**, SHA-256 `F4BDCC4E580C81DD58662DAF64713A0DD8E4521DEE726022FB3CACAB1F1FEC12`, mtime 2026-10-23 15:42:10 |
| Versión anterior (ronda 1) | SHA-256 `69CF07DDCD1D5EC820E68FFFD2203D7C705085A0A72766145E86D9B8E8EBA7B1`, 328 líneas, mtime 15:30:31; hash confirmado por `supervisor-calidad-a` y por `Get-FileHash` |
| Este informe | `tools/prompts/maestro-web-autocalidad/autoevaluaciones/autor-rubrica.md` |
| Mapa de integración | Fragmento redactado como secciones **5** (Fase 2 — Ejecución con autoevaluación) y **6** (Rúbrica universal y cálculo del 90 %) de la numeración prevista del BRIEF §3 |
| Estado | Ronda 2 enviada a ST2: ronda 1 = **REWORK** (D1 medio, D2 y D3 menores), corregidos con C10–C12; pendiente de PASS independiente |
| Decisión | **ENTREGO** (ronda 2) |

Las rutas de evidencia `secciones/...` y `autoevaluaciones/...` son relativas a `tools/prompts/maestro-web-autocalidad/`.

## 1. Contrato de la tarea → evidencia

| Exigencia de T2 (BRIEF §3) | Dónde se cumple | Comprobación |
|---|---|---|
| Rúbrica universal de 10 criterios con pesos que suman 100 | `secciones/02-rubrica.md:190-205` | Tabla 6.2 con A1–A10, pesos y criticidad; verificación aritmética explícita: 18+15+13+10+12+10+8+6+5+3 = 100 |
| Criterios críticos | `secciones/02-rubrica.md:194-199`, `:213-216`, `:59` | A1–A6 marcados como críticos; mínimo 9,0 para cada uno (D3 y descriptor de nivel 9,0) |
| Descriptores por nivel | `secciones/02-rubrica.md:209-220` y `:222-235` | Niveles 10/9/8/7/5/0 con significado y efecto en el gate; anclas de 9,0–10,0 y de ≤ 6,0 por cada criterio; regla de notas intermedias corregida en `:220` |
| Reglas de puntuación: sin evidencia = 0 y sin redondeo al alza | `secciones/02-rubrica.md:188`, `:90-93`, `:245-251` | Regla de hierro, jerarquía de evidencia y truncado obligatorio con casos 89,87 → 89,8 y 89,96 → 89,9 |
| Protocolo de autoevaluación en 7 pasos | `secciones/02-rubrica.md:14-26` | Tabla con exactamente 7 pasos, acción y evidencia que deja cada uno |
| Mejora residual y severidades | `secciones/02-rubrica.md:28-49` | Definición, tabla bloqueante/mayor/medio/menor, regla de asequibilidad (≤ 15 min), qué puede sobrevivir, bucle interno y changelog |
| Regla de decisión ENTREGO / NO ENTREGO | `secciones/02-rubrica.md:51-73` | Condiciones D1–D7, prohibición de estados intermedios, conducta ante NO ENTREGO y prohibiciones expresas |
| Regla del 90 % en la autoevaluación | `secciones/02-rubrica.md:75-83` | Umbral único, truncado, cálculo obligatorio, sin renormalizaciones, umbral inviolable, discrepancia > 10,0 = defecto de calibración |
| Informe de autoevaluación (plantilla) | `secciones/02-rubrica.md:125-175` y `:159-162` | Plantilla completa: puntuación 10 filas, gate D1–D7, residuales con los 8 campos de 5.3 más la decisión, cambios, riesgos y decisión; reglas de uso |
| Calibración y anti-autoengaño | `secciones/02-rubrica.md:85-123` | Técnica de puntuación, jerarquía de evidencia, 10 señales de autoengaño con respuesta, frases prohibidas, regla de la duda y registro de calibración |
| 2–3 ejemplos de puntuación límite | `secciones/02-rubrica.md:269-328` | Tres ejemplos: NO ENTREGO con total 91,0 por crítico; NO ENTREGO 88,7 por umbral/crítico/mejora asequible; ENTREGO exacto 90,0 |
| Sin duplicar la mecánica de supervisión (sección 7) ni la descomposición (sección 4) | `secciones/02-rubrica.md:7`, `:68`, `:186`, `:267` | Solo referencias cruzadas; no se definen scorecards, rondas de rework, independencia ni tablero de tareas |
| Español, sin TODOs, sin variables sin definir, sin rutas personales, sin emojis | Archivo completo | Verificado con comandos de la sección 6 de este informe |

## 2. Puntuación S1–S7 (rúbrica del BRIEF §4)

| ID | Criterio | Peso | Crítico | Nota | Evidencia y juicio |
|---|---|---|---|---|---|
| S1 | Cumple completo el contrato de su sección | 20 | Sí | 9,5 | Los 13 elementos del contrato de T2 están cubiertos (tabla de la sección 1). La plantilla de 5.7 ya declara todos los campos que exige 5.3 (corrección C10). Única desviación deliberada: descriptores universales por nivel más anclas por criterio (6.3–6.4) en lugar de una matriz de 10 × 6 celdas; se documenta y no recorta ninguna exigencia. |
| S2 | Corrección técnica y coherencia con el diseño global | 15 | Sí | 9,3 | Pesos y totales recalculados con `pwsh` (sección 6): suma 100; ejemplos 91,0 / 88,7 / 90,0; 8,9 en A3 → 89,8; 89,96 → 89,9. Referencias cruzadas a secciones 4, 7 y 8 coherentes con el BRIEF §3. Sin contradicciones internas tras C1–C12; citas exactas verificadas tras D3. |
| S3 | Utilidad ejecutable: listo para integrar, sin ambigüedad operativa | 15 | Sí | 9,2 | Regla binaria con condiciones D1–D7 verificables; umbral de asequibilidad fijado en 15 minutos; plantilla copiable con 9 columnas de residuales; regla de notas intermedias sin ambigüedad (C11); tres ejemplos que resuelven los límites. Sin «el supervisor decidirá» ni criterios abiertos. |
| S4 | Alineación literal con el encargo del usuario y el BRIEF (R1–R8) | 15 | Sí | 9,3 | R1: protocolo + informe + decisión; R2: asequibilidad + A6 crítico + D5; R5: gate D1–D7 y continuación del trabajo; R6: umbral único, truncado y prohibición de rebajarlo; R7: NO ENTREGO → seguir trabajando y escalar si hay bloqueo; R4: autoevaluación no aprueba ni se autosupervisa; R8: criterio A3 de verificación real. |
| S5 | Autoevaluación honesta y trazable | 15 | Sí | 9,2 | Versión congelada con hash y mtime; evidencias con ruta y líneas verificadas con dos pasadas de comprobación (0 fallos en UTF-8); defectos D1–D3 aceptados sin disputa y corregidos con evidencia; mejoras residuales declaradas con los 8 campos de 5.3; cambios internos y de ronda documentados. Autoevaluación propia todavía sin PASS externo: no se concede más. |
| S6 | Claridad, concisión, formato y ausencia de relleno | 10 | No | 8,9 | Tablas y listas operativas, sin relleno ni épica; 328 líneas para dos secciones con 12 tablas y 3 ejemplos. La densidad es alta y alguna tabla de 6.4 exige lectura atenta; se penaliza. |
| S7 | Resistencia al autoengaño y al gaming del proceso | 10 | No | 9,1 | Sin evidencia = 0; sin N/A; truncado; críticos con mínimo independiente del total; defectos y mejoras asequibles como NO ENTREGO; frases prohibidas; registro de calibración; ejemplos muestran los tres atajos típicos (total alto, casi 90, redondeo). |

Comparativa informativa con ST2 ronda 1 (versión anterior): supervisor 91,6 (S1 9,3 · S2 9,0 · S3 9,1 · S4 9,4 · S5 9,0 · S6 9,0 · S7 9,3). Diferencia con la autoevaluación de esta ronda: 0,9 puntos, dentro de la tolerancia de calibración (< 10,0).

## 3. Cálculo del total y gate de autor

- Pesos: 20 + 15 + 15 + 15 + 15 + 10 + 10 = **100**.
- Suma ponderada: 9,5×20 + 9,3×15 + 9,2×15 + 9,3×15 + 9,2×15 + 8,9×10 + 9,1×10 = 190 + 139,5 + 138 + 139,5 + 138 + 89 + 91 = **925**.
- Total: 925 / 10 = **92,5**; truncado a un decimal: **92,5**.
- Condiciones del BRIEF §4: total ≥ 90,0 (**sí**); ninguna nota < 7,0 (**sí**; mínima 8,9); críticos S1–S5 ≥ 9,0 (**sí**: 9,5 / 9,3 / 9,2 / 9,3 / 9,2); cero defectos bloqueantes, mayores o medios abiertos (**sí**: D1–D3 de ronda 1 corregidos y re-verificados); como máximo 3 menores documentadas con coste/beneficio (**sí**, 2).

## 4. Mejoras residuales

| ID | Severidad | Descripción | Ubicación | Coste estimado | Beneficio esperado | Motivo de no corregirla | Quién decide | Decisión |
|---|---|---|---|---|---|---|---|---|
| M1 | Menor | Los tres ejemplos de 6.7 son sintéticos; sustituirlos por un caso real exigiría ejecutar un encargo completo del proyecto Antigravity. | `secciones/02-rubrica.md:269-328` | > 60 min y depende de un encargo real | Realismo didáctico; el contrato solo pedía 2–3 ejemplos que aclaren el límite | El contrato de T2 pide ejemplos aclaratorios, no un caso real; el coste supera el beneficio para esta tarea. | Lead, en una iteración posterior del prompt | Declarada |
| M2 | Menor | Parametrizar en el contrato de tarea el umbral de asequibilidad (15 min) y el máximo de menores (3), en lugar de fijarlos en esta sección. | `secciones/02-rubrica.md:39-41`, `:61` | ≈ 20 min | Flexibilidad por proyecto | Los valores fijados son deliberados y coherentes con el BRIEF; tocarlos implica rediseñar la sección 4, que es de otro autor. | Lead / autor de la sección 4 | Declarada |

No quedan defectos bloqueantes, mayores ni medios abiertos ni mejoras asequibles (≤ 15 min) pendientes.

## 5. Cambios de la iteración interna y de la ronda de supervisión

| ID | Cambio | Ubicación | Motivo y re-verificación |
|---|---|---|---|
| C1 | La regla de asequibilidad exige ahora «beneficio observable o reducción de riesgo demostrable». | `secciones/02-rubrica.md:39` | Eliminaba la contradicción entre «toda mejora ≤ 15 min se corrige» y «residual admisible si el coste supera al beneficio». Re-verificado por lectura conjunta con `:41`. |
| C2 | Ejemplo 1: la evidencia débil de A3 ya no es una captura de la versión anterior (que el ancla de 6.4 castiga con ≤ 6), sino evidencia indirecta por limitación externa, coherente con una nota 8,0. | `secciones/02-rubrica.md:281`, `:284` | Coherencia con 6.4 y con A6 = 9,0 (la comprobación pendiente depende de un proveedor externo). |
| C3 | Ejemplo 2: A6 baja de 9,0 a 8,5 y el total se recalcula de 89,2 a 88,7. | `secciones/02-rubrica.md:303`, `:309` | El ejemplo declaraba una mejora asequible pendiente y a la vez A6 = 9,0; era incoherente. Recalculado con `pwsh`: 887 → 88,7; tras corregir la mejora, 900 → 90,0 exacto. |
| C4 | Plantilla: añadida fila de ejemplo en «Mejoras residuales» e instrucción «Si no hay ninguna, escribir: “Ninguna”». | `secciones/02-rubrica.md:160-162` | Evita campos vacíos en el informe y mejora la ejecutabilidad. |
| C5 | Eliminada la referencia meta «(R6)» del apartado 5.5.1. | `secciones/02-rubrica.md:77` | Fuga de un identificador del BRIEF al prompt final; el prompt debe ser autosuficiente. |
| C6 | Se precisa que cada nota se registra con un decimal y que el umbral exige «media ponderada de 9,0». | `secciones/02-rubrica.md:245`, `:248` | Cierra la ambigüedad de notas con más decimales y aclara la relación entre media y umbral (cita corregida en D3). |
| C7 | La regla de la duda ya no dice «ajusta la nota a la baja»: dice «no puntúa por encima de lo que la evidencia demuestra». | `secciones/02-rubrica.md:121`, `:83` | Evita contradicción con la calibración (puntuar a la baja deliberadamente también es defecto). |
| C8 | El placeholder de residual `<R1>` pasa a `<M1>`. | `secciones/02-rubrica.md:161` | Evitaba confusión con los identificadores R1–R8 del BRIEF; verificado: 0 referencias a IDs del BRIEF en el archivo. |
| C9 | Precisión del gate: D5 admite justificación por dependencia externa y el descriptor de 7,0 distingue defectos B/M/Med abiertos de menores declaradas. | `secciones/02-rubrica.md:61`, `:216` | Elimina una posible lectura de que cualquier defecto abierto, incluida una menor declarada, impide la nota 7,0 y la entrega; alineado con D4 y D5. |
| C10 | **D1 (medio) corregido:** la tabla de residuales de la plantilla incorpora «Beneficio esperado», «Motivo de no corregirla» y «Quién decide»; la fila de ejemplo cubre los 9 campos. | `secciones/02-rubrica.md:159-162` (contraste con `:41`) | 5.3 exige 8 campos por residual y la plantilla solo tenía 6; un informe válido era imposible. Verificado: cabecera y fila de ejemplo tienen 9 columnas y todos los campos de 5.3. |
| C11 | **D2 (menor) corregido:** reescrita la regla de notas intermedias: 6,0–6,9 para defectos peores que 7,0 pero por encima de 5,0; 4,9–0,0 para 5,0 o peores; 8,x y 9,x con el descriptor inferior inmediato. | `secciones/02-rubrica.md:220` | La redacción anterior era imprecisa para el 6 («no llega a 5»). Verificado por lectura y por comprobación de cadena. |
| C12 | **D3 (menor) corregido:** citas de este informe ajustadas a la versión congelada (`:184` → `:186`; `:243` → `:245`; rango `:243-251` → `:245-251`) y versión congelada con hash y mtime en la cabecera. | Este informe; `secciones/02-rubrica.md` (hash `F4BDCC4E…CAB1F1FEC12`) | Las citas apuntaban a líneas contiguas, no al pasaje exacto. Verificado con dos pasadas de comprobación automatizada: 0 fallos. |

## 6. Evidencias reproducibles

1. **Versión congelada** (comando `pwsh` ejecutado en esta sesión):
   - Salida: `Hash: F4BDCC4E580C81DD58662DAF64713A0DD8E4521DEE726022FB3CACAB1F1FEC12`; `Lineas: 328`; `mtime: 2026-10-23 15:42:10`.
   - La versión de la ronda 1 se congeló como `69CF07DD…B8E8EBA7B1`, 328 líneas, mtime 15:30:31, y coincide con el hash comunicado por el supervisor.
2. **Citas exactas** (dos pasadas con `pwsh` y lectura `-Encoding UTF8`):
   - 23 comprobaciones de cita en la primera pasada más 9 de contraste en la segunda: **0 fallos**. Comprobadas, entre otras: `:186` «independencia, el veredicto y el rework»; `:245` «Cada nota se registra con un decimal»; `:220` «6,0–6,9»; `:160` «Quién decide» y «Motivo de no corregirla»; `:59` «A1–A6»; `:7`/`:267` «sección 4»; `:68` «sección 8»; `:281` «Flujo verificado en Chromium»; `:303` «Mejora asequible pendiente».
   - Nota de reproducción: sin `-Encoding UTF8`, PowerShell compara mal el guion largo y los acentos y produce falsos fallos; no es un defecto del archivo.
3. **Estructura del template corregido** (mismo comando): `Columnas tabla residuales: 9 / 9`; `Separadores de tabla: 12`; `Encabezados: 16`.
4. **Aritmética** (comando `pwsh` ejecutado en esta sesión):
   - `Pesos: 100`; `Ej1: 91`; `Ej2: 88.7`; `Ej3: 90`; 8,9 en A3 → 89,87 → 89,8; 89,96 → 89,9.
   - Autoevaluación: `Suma ponderada: 925`; `Total: 92.5`; `Truncado: 92.5`; `Criticos: S1=9.5, S2=9.3, S3=9.2, S4=9.3, S5=9.2`; `Minima nota: 8.9`; `Gate >=90: True`; diferencia con la supervisión provisional 0,9.
5. **Limpieza y ausencia de fugas meta** (mismo comando): `Fugas meta: 0`; `IDs BRIEF: 0`; `TODO exactos: 0`; `Emojis/surrogates: 0`; `Lineas: 328`.
6. **Lectura completa** del archivo con la herramienta `read` antes y después de cada corrección de esta ronda.

## 7. Ronda de supervisión ST2

| Ronda | Versión | Veredicto | Defectos | Respuesta |
|---|---|---|---|---|
| 1 | SHA-256 `69CF07DD…B8E8EBA7B1` (328 líneas) | **REWORK** | D1 medio (plantilla de residuales incompleta frente a 5.3); D2 menor (frase de notas intermedias imprecisa); D3 menor (citas de línea desalineadas) | Aceptados sin disputa y corregidos en C10, C11 y C12; versión congelada con hash nuevo |
| 2 | SHA-256 `F4BDCC4E…CAB1F1FEC12` (328 líneas) | Pendiente de re-verificación | — | Reenvío a `supervisor-calidad-a` con evidencia de cada corrección |

Puntuación provisional de ST2 ronda 1 (informativa): S1 9,3 · S2 9,0 · S3 9,1 · S4 9,4 · S5 9,0 · S6 9,0 · S7 9,3 → 91,6/100. Calibración frente a mi declaración de la ronda 1 (92,2): 0,6 puntos, sin defecto. No procede PASS con un defecto medio abierto; por eso se corrigió y se reenvía.

## 8. Riesgos y supuestos

- **Supuesto de numeración:** el fragmento ocupa las secciones 5 y 6 de la numeración prevista del BRIEF §3. Si el Lead renumera al integrar, deben actualizarse las referencias internas a las secciones 4, 7 y 8; el contenido no cambia.
- **Supuesto de escala única:** la rúbrica A1–A10 es la única escala de tarea. Si el Lead adopta otra, deben actualizarse a la vez 6.2, 6.5 y la plantilla de 5.7 para no romper la coherencia numérica.
- **Riesgo de calibración:** la nota propia puede diferir de la del supervisor. Si la diferencia supera 10,0 puntos, se aplicará la regla 5.5.7, se registrará la causa y se corregirá con evidencia.
- **Riesgo de referencias obsoletas:** cualquier edición posterior del archivo invalida el hash `F4BDCC4E…` y exige recalcular línea, hash y citas de este informe antes de volver a enviarlo.
- **Sin ejecución web:** este encargo produce un prompt, no una app (BRIEF §6.11). No hay capturas, navegadores ni tests de la web y no se inventan.
- **Validación pendiente:** esta autoevaluación es el ENTREGO del autor, no una aprobación. El PASS ≥ 90,0 corresponde a `supervisor-calidad-a` (ST2); la tarea `task-2` no se cierra hasta ese veredicto.

## 9. Declaración de honestidad

Todo lo afirmado en este informe se respalda con el archivo real y con comandos ejecutados en esta sesión; no hay evidencia inventada ni resultados supuestos. Los defectos D1–D3 de la ronda 1 se aceptaron como ciertos, se corrigieron y se documentan con su verificación. Las limitaciones y dudas están declaradas en las secciones 4 y 8. No se ha editado ningún archivo fuera del scope de T2: solo `secciones/02-rubrica.md` y este informe.

## 10. Decisión

**ENTREGO** — autoevaluación 92,5/100, sin defectos bloqueantes, mayores ni medios abiertos, con 2 mejoras menores declaradas y los 3 defectos de la ronda 1 corregidos. Queda pendiente el gate independiente de ST2 (ronda 2, PASS ≥ 90,0) para cerrar `task-2`.
