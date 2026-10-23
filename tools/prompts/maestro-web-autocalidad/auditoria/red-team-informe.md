# Auditoría red-team — PROMPT MAESTRO (autoevaluación + supervisión ≥ 90 %)

- **Auditor:** `auditor-red-team` (tarea `task-9`). Independiente de autores y supervisores.
- **Fecha:** 2026-10-23 (Atlantic/Canary).
- **FASE 1 auditada:** `secciones/01-nucleo.md`, `02-rubrica.md`, `03-supervision.md`, `04-integracion.md`, las 4 autoevaluaciones y los 2 scorecards.
- **FASE 2 auditada (activada por el Lead):** `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` integrado, `LEEME.md` y `autoevaluaciones/lead-integrador.md`.
- **Alcance de escritura respetado:** solo se ha creado/editado este archivo dentro de `auditoria/`. No se han editado secciones, autoevaluaciones, scorecards, prompt, `LEEME.md`, git, skills ni memoria.
- **Método:** lectura íntegra de todos los artefactos, recálculo aritmético con PowerShell, contraste de reglas del proyecto contra `claude.md` y `skills/`, diff normalizado sección → prompt, validación mecánica de tablas/cercas/referencias y prueba de mesa con un brief realista. No se ha generado ninguna web: el BRIEF §6.11 excluye ejecutar navegadores para este encargo.
- **Límites de esta auditoría:** no se han ejecutado los gates finales FG-A/FG-B (aún pendientes), no se ha probado el prompt en un orquestador real y la verificación de reglas del proyecto es documental (código/skills), no de producto. Todo hallazgo se apoya en archivo y línea reales; no se ha inventado ninguno.

## 0. Resumen ejecutivo y versiones congeladas

**Veredicto de la FASE 1: DEFECTOS.** El sistema de autoevaluación/supervisión es sustancialmente sólido (rúbrica, gates, anti-gaming y rework bien diseñados), pero los cuatro PASS de sección no detectaron **1 bloqueante, 6 mayores y 2 medios** que sí afectan a la ejecutabilidad del proceso. No es apto para entrega sin corregirlos o justificarlos por el Lead.

**Veredicto de la FASE 2: DEFECTOS.** La fusión es fiel (solo se perdió la regla P19 y hay referencias colgantes), pero el prompt integrado hereda los defectos de FASE 1 y añade **2 mayores, 3 medios y 6 menores** propios de la integración. No debe pasar a los gates finales sin corrección.

**Totales únicos (sin contar dos veces los hallazgos que persisten en el integrado): B = 1 · M = 8 · Med = 5 · Men = 12. Total = 26.**

> **ACTUALIZACIÓN — CIERRE FINAL:** el veredicto vigente está en la **FASE 5 (§24–§25)** al final de este informe. Resultado: **prompt v1.1 ACEPTABLE — 0 B · 0 M · 0 Med · 0 Men abiertos**, SHA `5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7`. 26/26 hallazgos de ronda 1, 4/4 de FASE 3 y 2/2 de FASE 4 cerrados; delta documental verificado; `task-9` cerrada. El veredicto histórico de FASE 1–FASE 4 se conserva sin reescribir.

| Artefacto | Líneas | Bytes | SHA-256 (verificado) |
|---|---:|---:|---|
| `secciones/01-nucleo.md` | 400 | 38.748 | `7B07C1B28B2316A9DF7D6E02A07C36EE93EED939DD95D29093CCD480C75984F9` |
| `secciones/02-rubrica.md` | 328 | 29.807 | `F4BDCC4E580C81DD58662DAF64713A0DD8E4521DEE726022FB3CACAB1F1FEC12` |
| `secciones/03-supervision.md` | 614 | 65.404 | `A0BEB5C69DD22E2250D9D16C5A685E7D476E5232998C0A0521416D58583CAF6C` |
| `secciones/04-integracion.md` | 428 | 46.783 | `64DD6861E20E863EB1CEC2A1A749A038EA7C302CAFF0C7897E5FA8FFEC711066` |
| `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` | 1.819 | 184.769 | `9A8FDB8A61904B87075C5B76D74C26A161F120D155957DE408F88895E9BD95E7` |
| `LEEME.md` | 52 | 4.120 | — |
| `autoevaluaciones/lead-integrador.md` | 79 | 6.885 | — |

Los cuatro PASS de sección son válidos según los scorecards (94,2 / 93,6 / 93,60 / 93,80), pero **un PASS de sección no equivale a ausencia de defectos**: los hallazgos de este informe son defectos reales en los archivos aprobados y obligan a reabrir la parte afectada (o justificarla formalmente) antes de la entrega.

---

## 1. Plan de ataque previo (redactado antes de auditar)

Objetivo: **romper** el sistema, no describirlo. Vectores atacados, en este orden:

1. **Autoevaluación inflada**: buscar notas sin evidencia, criterios "de impresión", tratamiento del 0,0 y del truncado.
2. **Aprobación por cansancio / presión / plazo**: rastrear cualquier puerta que permita PASS parcial, condicional o "con reservas".
3. **Evidencia declarada sin verificar**: comprobar si el supervisor está obligado a reproducir y si el muestreo es verificable por un tercero.
4. **N/A discrecional**: buscar cualquier "no aplica" que evite una prueba.
5. **Redondeo al alza / bajar umbral**: recalcular todos los ejemplos y todos los totales publicados.
6. **PASS heredado entre versiones**: rastrear si un cambio invalida el PASS en todos los niveles.
7. **Colusión y autosupervisión**: reciprocidad, conflicto de interés, firmas cruzadas, orquestador que firma.
8. **Cobertura R1–R8**: verificar que cada requisito tiene ≥ 2 mecanismos independientes y que "todos los agentes" significa todos.
9. **Ambigüedades ejecutables**: localizar "el supervisor decidirá" sin criterio, umbrales sin número y criterios sin observación.
10. **Dependencias imposibles**: ciclos de gates, ficheros/herramientas inexistentes, tareas que no pueden cerrarse.
11. **Reglas del proyecto inventadas u omitidas**: contraste con `claude.md`, skills y memoria.
12. **Fusión del prompt**: diff por capítulos, numeración, referencias colgantes, notas residuales, duplicidades y coherencia de roles.
13. **Prueba de mesa**: brief realista resuelto solo con el prompt, fase por fase.

Criterio de severidad (BRIEF §6.6): **B** = incumple requisito/contradice/evidencia falsa o ausente; **M** = omisión relevante o ambigüedad que obliga a interpretar; **Med** = defecto de uso con solución evidente; **Men** = estilo/documentación. Un hallazgo solo se declara si se cita el fragmento real.

---

## 2. Hallazgos FASE 1 (secciones, autoevaluaciones y scorecards)

### 2.1 Bloqueante

#### RT-01 — [B] R1 solo cubre a los autores de tareas; supervisores, auditor y orquestador no se autoevalúan

- **Ubicación:** `01-nucleo.md:11` («Todo agente que interviene se autoevalúa antes de entregar, con notas y evidencias (§5–§6)»), `01-nucleo.md:83` (P2: «Ningún **autor**…»), `02-rubrica.md:5` («Cada **tarea delegada a un agente o subagente**…»), `03-supervision.md:369` (I1: «Todos los agentes que intervinieron tienen autoevaluación previa a la entrega | Informe por tarea y por rol, con evidencias y decisión»), `03-supervision.md:268-270` (el único mecanismo para el supervisor es un **autochequeo booleano**, sin nota ni decisión ENTREGO/NO).
- **Por qué es un fallo:** R1 del BRIEF exige que *todo agente/subagente que interviene* se autoevalúe antes de entregar, con «informe con puntuación y evidencias + regla de decisión ENTREGO / NO ENTREGO». En las secciones, ese protocolo solo existe para autores de tareas. El supervisor entrega un entregable propio (el scorecard) y no se puntúa ni decide sobre él; el auditor entrega el acta y tampoco; el orquestador entrega el tablero y la entrega final sin autoevaluación propia. El Anexo D del prompt integrado declara G1 = «Todo agente se autoevalúa» citando mecanismos que **solo alcanzan a autores** (ver RT-17): la trazabilidad afirmaría una cobertura que no existe. El BRIEF §0 pide literalmente «todos los subagentes y agente que intervengan en la generación de una web se autoevalúen y no entreguen su tarea si creen que cabe un mínimo de mejora».
- **Arreglo concreto:** añadir en §7.12.2 un bloque obligatorio «AUTOEVALUACIÓN DEL SUPERVISOR» con 5 comprobaciones puntuadas (independencia, cobertura 100 %/50 %, reproducción, calibración, registro), evidencias y decisión «ENTREGO MI SCORECARD / NO ENTREGO»; añadir equivalente para el auditor en §7.14 (acta autoevaluada) y para el orquestador en §10.2 (autoevaluación de la entrega con D1–D7). Alternativa mínima: redefinir el autochequeo como autoevaluación puntuada con decisión y declararlo así en G1. Sin uno de los dos, R1 no está cubierto.

### 2.2 Mayores

#### RT-02 — [M] Dependencia circular entre Gate 4 y la tarea de verificación real

- **Ubicación:** `01-nucleo.md:372` (Gate 4: «Todas las tareas requeridas CERRADAS y defectos cerrados»), `01-nucleo.md:202` (cada fila de cobertura debe tener una tarea, incluidas «Verificación real» `:217` y «Auditoría end-to-end» `:219`), `04-integracion.md:102` (la Fase 5 la ejecuta el «dueño de la tarea de verificación»), `04-integracion.md:243` (la fase se cierra con el informe de verificación), `01-nucleo.md:328` (las tareas de integración/auditoría dependen de las de implementación).
- **Por qué es un fallo:** la tarea de verificación real solo puede obtener PASS **después** de producir la evidencia de la Fase 5; la Fase 5 solo empieza con el Gate 4; el Gate 4 exige que **todas las tareas requeridas** estén CERRADAS. Leído al pie de la letra, el plan no puede avanzar nunca: o el Gate 4 excluye la tarea de verificación (pero entonces «todas las tareas requeridas» está mal escrito) o la tarea de verificación se cierra sin su evidencia (imposible). Es exactamente una «dependencia imposible» de las que el encargo pide cazar.
- **Arreglo concreto:** en Gate 4 escribir «Todas las tareas **de producto** CERRADAS; la tarea de verificación real y la auditoría end-to-end se abren con este gate y se cierran con el Gate 5; no cuentan como precondición». Replicar en `01-nucleo.md:423` y en `04-integracion.md:255` («Cada tarea del tablero» → «cada tarea de producto»).

#### RT-03 — [M] La fila «Auditoría end-to-end» obliga a una tarea con supervisor, pero el auditor puede ser único y no tiene supervisor

- **Ubicación:** `01-nucleo.md:219` (fila de cobertura «Auditoría end-to-end … Informe de auditoría y matriz»), `01-nucleo.md:202` («asigna a cada fila al menos una tarea»), `01-nucleo.md:239` («Un dueño por tarea; un supervisor distinto por tarea»), `03-supervision.md:339` (permite **un solo** auditor con limitación documentada; «El orquestador no puede firmar el acta»).
- **Por qué es un fallo:** si la auditoría es una tarea del tablero, necesita dueño (auditor) y supervisor independiente; ningún rol puede supervisar al auditor (el segundo auditor es opcional según §7.14 y el orquestador no puede firmar). Si no se crea la tarea, la fila de cobertura queda sin tarea y **bloquea el Gate 1** (`01-nucleo.md:202`). El proceso se atasca en Fase 1 o fuerza una excepción no escrita.
- **Arreglo concreto:** declarar en §4.2 que la fila «Auditoría end-to-end» se cubre con el **gate** §7.14 y no con una tarea del tablero (excepción explícita a «cada fila = una tarea»), o permitir que la tarea de auditoría tenga como supervisor a un segundo auditor y documentar la limitación cuando no exista, sin contradecir §4.3.

#### RT-04 — [M] El umbral de rendimiento se delega a §9 y §9 no lo fija

- **Ubicación:** `01-nucleo.md:126` («Rendimiento | Carga y recursos dentro del **umbral que fije §9**…»), `04-integracion.md:175` («La nota de Lighthouse **no es el umbral del proyecto**… una categoría por debajo de 90 obliga a corregir o a documentar causa raíz…»), `04-integracion.md:167-176` (no hay cifra de LCP/TBT/peso ni criterio de aceptación observable adicional; la propia §9.8 se declara «no umbral»).
- **Por qué es un fallo:** el contrato de aceptación de Fase 0 exige un criterio de rendimiento y remite a una sección que expresamente niega ser el umbral. El agente que cierra Gate 0 tiene que inventar el umbral o dejar la fila incompleta; ambas cosas rompen la ejecutabilidad y hacen que el supervisor puntúe A7/A2 sin referencia.
- **Arreglo concreto:** sustituir en §3.2 por «Criterio de rendimiento de §9.8: las cuatro categorías de Lighthouse ≥ 90 en móvil y escritorio; una categoría inferior exige corrección o causa raíz documentada y aceptada por el supervisor antes del PASS». Si se quiere un umbral numérico, fijarlo aquí (p. ej., LCP) y hacer que §9.8 lo cite, no que lo niegue.

#### RT-05 — [M] Gate 5 atribuye la firma al orquestador y §7.14 prohíbe que firme el acta

- **Ubicación:** `01-nucleo.md:374` («Gate 5 … Firma: **Auditor y orquestador**»), `03-supervision.md:339` («El orquestador **no puede firmar el acta**»), `03-supervision.md:194` (el PASS lo firma el supervisor y solo él; el orquestador no puede emitirlo, elevarlo ni sustituirlo), `01-nucleo.md:98` (P17).
- **Por qué es un fallo:** el cierre de la entrega queda con dos reglas incompatibles sobre quién firma. Un orquestador puede invocar Gate 5 para co-firmar el PASS global (aprobación por encima del auditor) o un auditor puede bloquear la entrega porque el orquestador aparece como firmante. Es una contradicción que un gate final leerá con lupa.
- **Arreglo concreto:** Gate 5 «Firma: **Auditor end-to-end** (firma el acta); el orquestador **registra** la entrega y no firma el veredicto». Actualizar la columna en §4.10 y cualquier texto equivalente.

#### RT-06 — [M] `DESPLIEGUE`: «limita la verificación a local» contradice que `file://` no es prueba

- **Ubicación:** `01-nucleo.md:42` («Si no hay destino, limita la verificación a local y dilo en la entrega; no simules producción»), `04-integracion.md:113` («`file://` **no es prueba**; `localhost` solo vale como entorno final si el brief define la app como local y se declara…»), `04-integracion.md:243-244` (entorno final verificado o BLOCKED).
- **Por qué es un fallo:** la variable de entrada permite una verificación "local" sin declarar runtime ejecutable; la Fase 5 prohíbe `file://` y exige runtime real declarado o BLOCKED. Dos reglas de nivel superior se contradicen y abren una vía para entregar con una prueba que el propio prompt invalida.
- **Arreglo concreto:** en §1.2 escribir «si no hay destino de publicación, el entorno final es el **runtime real declarado** (local ejecutable, staging o app servida); `file://` no es válido; si no existe runtime verificable, BLOCKED». Enlazar a §9.2/§10.3.

#### RT-07 — [M] La «limitación explícita» cuando no hay entorno se admite, pero las condiciones de entrega exigen entorno verificado

- **Ubicación:** `01-nucleo.md:388` («La producción no se puede verificar | No se cierra la entrega; se declara BLOCKED **o limitación explícita si el contrato era solo local**»), `04-integracion.md:244` («Si no existe un runtime verificable, no es N/A: es **limitación explícita o BLOCKED**»), `04-integracion.md:255` (condición de entrega: «Fase 5 cerrada (9.13) y **entorno final verificado**»), `04-integracion.md:259` (si falla, no se entrega).
- **Por qué es un fallo:** la Fase 5 se cierra solo con entorno final verificado; una «limitación explícita» no cumple esa condición y la entrega la exige. El texto deja una tercera vía que en la práctica no lleva a ninguna parte, y un agente podría presentarla como entrega "con limitación" para esquivar el BLOCKED. Es una escapatoria de estado (aunque no de nota).
- **Arreglo concreto:** eliminar «o limitación explícita» para el entorno final en §4.10 y §9.13, y dejar: «sin runtime verificable no hay Fase 5 cerrada ni entrega: BLOCKED». Las limitaciones solo pueden ser sobre comprobaciones no aplicables, nunca sobre la verificación del entorno final.

### 2.3 Medios

#### RT-08 — [Med] La regla de «mejora asequible ≤ 15 minutos» depende del coste que declara el propio autor, sin control independiente

- **Ubicación:** `02-rubrica.md:39` (asequibilidad «15 minutos o menos… Estimar su coste al alza para no hacerla es autoengaño»), `02-rubrica.md:41` (admite residual menor si «el coste estimado supera el beneficio»), `03-supervision.md:157` (una mejora no declarada es defecto medio; una declarada sin justificación suficiente es «menor o medio según impacto»).
- **Por qué es un fallo:** el autor mide y declara el coste; el supervisor puede dictaminar sobre la justificación, pero no hay regla que le obligue a recalcularlo ni criterio de desempate («si hay duda, se considera asequible»). Basta declarar «20 minutos» para convertir una mejora de 15 en residual no obligatoria y entregar sin ella, justo lo que R2 prohíbe.
- **Arreglo concreto:** añadir en §5.3: «el coste declarado por el autor no vincula al supervisor; este puede corregirlo con la misma evidencia. En caso de duda, la mejora se considera asequible y se corrige antes de entregar». En §7.8.4, dar al supervisor la potestad explícita de reclasificar el coste.

#### RT-09 — [Med] Reenvíos no admitidos y entregas retiradas no consumen ronda y no tienen tope

- **Ubicación:** `03-supervision.md:435` («No consumen ronda: una entrega retirada por el autor… y un reenvío **no admitido**… El **abuso** del reenvío no admitido es un defecto de proceso y se escala»), `03-supervision.md:451` («si falla un ítem, el reenvío **no se admite**: no se evalúa… y **no consume ronda**»).
- **Por qué es un fallo:** el autor puede retirar la entrega o enviar paquetes incompletos indefinidamente sin gastar el contador de 5 rondas; «abuso» no está definido (¿2? ¿3? ¿consecutivos?) y el escalado no tiene disparador mecánico. No permite aprobar por debajo de 90, pero permite un bucle de estancamiento ilimitado y saltarse el límite duro de rondas, que es el mecanismo anti-cansancio de R7.
- **Arreglo concreto:** fijar un tope objetivo: «un segundo reenvío no admitido consecutivo consume ronda y escala; una entrega solo puede retirarse una vez por ronda; la segunda retirada cuenta como ronda». Añadir ambos al registro de rondas.

### 2.4 Menores

| ID | Sev. | Ubicación | Defecto | Arreglo |
|---|---|---|---|---|
| RT-10 | Men | `02-rubrica.md:148` | La plantilla obligatoria de 5.7 escribe «Total: Σ(nota × peso) = `<n>` → `<total truncado>`», sin dividir entre 10; el informe puede rellenarse con 900 como "total". | Escribir «`(Σ(nota × peso)) / 10 = <total>`» como en §6.5 y §7.12.2. |
| RT-11 | Men | `03-supervision.md:257` | Fila de ejemplo del scorecard: «`(fila de ejemplo) | 18 | No | 9,5`»; en §6.2 el peso 18 corresponde a A1, que es crítico **Sí**. El ejemplo contradice la rúbrica que dice ejemplificar. | Cambiar el ejemplo a un criterio no crítico real (A7, peso 8) o marcar «18 | Sí». |
| RT-12 | Men | `01-nucleo.md:289-300` y `03-supervision.md:407-418` | Tabla de estados duplicada en dos capítulos, con deriva terminológica («dueño»/«autor», «evidencia»/«evidencias», «Supervisor y»/«Supervisor +»); el propio §4.5 dice que la definición canónica está en §8.1. | Dejar la tabla solo en §8.1 y sustituir la de §4.5 por una referencia de una línea. |
| RT-13 | Men | `04-integracion.md:386` | El ejemplo de entrega dice «PASS 92,5 / 91,0 / 93,0 / 90,5; **global 91,8**»; la media es 91,75, que truncada es **91,7**. El único ejemplo numérico de entrega redondea al alza, justo lo prohibido. | Poner 91,7 o definir la ponderación exacta del global; nunca redondear al alza en un ejemplo. |
| RT-14 | Men | `04-integracion.md:98` frente a `:118`, `:209`, `:289-292` | «Lo de desarrollo vive en… `tools/` … y **se elimina al terminar**», pero la evidencia de la entrega se guarda precisamente en `tools/evidencias/…` y la plantilla de entrega enlaza esas rutas. Un ejecutor literal borraría la evidencia que sostiene el PASS. | Precisar: «se eliminan los scripts/perfiles/artefactos temporales de prueba; **las evidencias de la entrega se conservan** hasta el cierre». |
| RT-15 | Men | `03-supervision.md:159` | «…se registra como defecto mayor aunque **el total no supere 10**»: falta el sustantivo («10,0 puntos de discrepancia total»); se lee como si hablara del total de la rúbrica. | Redactar «aunque la discrepancia total sea ≤ 10,0 puntos». |

---

## 3. Ataques intentados y resultado

### 3.1 Gaming del proceso

| Ataque intentado | Mecanismo que debería pararlo | Resultado |
|---|---|---|
| Inflar la autoevaluación | A5, §5.6, §7.8 ciego, calibración > 10 y ≥ 2,0 en crítico | **BLOQUEADO**. Deltas reales del proceso 0,00–1,35; ningún caso > 10. |
| Aprobar por cansancio / plazo | §7.10, §7.13.6, §8.9.1, regla de oro «duda → REWORK» | **BLOQUEADO**. Sin excepciones ni PASS condicional. |
| Evidencia declarada sin verificar | §7.6 (100 % críticas + ≥ 50 % resto), §7.7, P7 | **BLOQUEADO** para el autor; el muestreo exige registro. |
| N/A discrecional | P14, §6.6, §9.13, §10.3 | **PARCIAL**: la regla es buena, pero RT-07 deja una vía «limitación explícita» y el N/A de rendimiento (RT-04) es ambiguo. |
| Redondear al alza | §5.5.3, §6.5, §7.9.3, §7.10, P4 | **BLOQUEADO** en reglas y en todos los ejemplos verificados; **PARCIAL** en el ejemplo de entrega RT-13 (91,8). |
| Bajar el umbral | P4, §5.5.6, §7.13.3, §8.9.2, §8.6 | **BLOQUEADO**. El orquestador no puede elevar ni rebajar. |
| Aprobar «con reservas» | §5.4, §7.10.1, §7.13.2, §8.9.2 | **BLOQUEADO**. Prohibición literal y veredicto binario. |
| Heredar PASS entre versiones | P19, §7.10.4, §8.9.9, §8.10 | **BLOQUEADO en las secciones**; **ROTO en el integrado**: P19 desapareció (RT-16), aunque la regla sigue en §7.10.4/§8.10. |
| Autosupervisión / reciprocidad | P5, §7.2, §7.3, §7.15 I2 | **BLOQUEADO**. |
| Orquestador aprueba por encima del supervisor | P17, §7.2.4, §7.15 | **PARCIAL**: RT-05 (Gate 5) permite leer que co-firma. |
| Colusión A–B | §7.2.3, §7.15 «colusión o reciprocidad» | **BLOQUEADO**. |
| Reiniciar rondas renombrando/dividiendo | §7.15, §8.9.5, §8.7.3-4 | **BLOQUEADO**; queda la vía de RT-09 (rondas que no consumen). |
| Inflar el coste de una mejora | RT-08 | **NO BLOQUEADO**: no hay recálculo obligatorio del coste. |
| BLOCKED / entrega disfrazada | §7.15, §8.9.8, §10.3 | **PARCIAL** por RT-07. |
| Evidencia fabricada / obsoleta | §7.7 tabla patrón→detección→respuesta | **BLOQUEADO**. |
| Saltarse un gate / trabajar fuera de gate | P12, §4.10, §4.9 | **BLOQUEADO**; el trabajo fuera de gate se repite. |

### 3.2 Contradicciones numéricas y terminológicas (verificadas)

- **Aritmética de autoevaluaciones:** 93,6 (núcleo), 92,5 (rúbrica), 93,3 (supervisión), 93,8 (integración) — recalculadas y correctas.
- **Aritmética de scorecards:** 94,2 / 93,6 / 93,60 / 93,80 — recalculadas y correctas; truncamientos 91,65→91,6, 92,45→92,4, 93,65→93,6 correctos. No hay redondeo al alza en los PASS.
- **Rúbrica:** pesos 18+15+13+10+12+10+8+6+5+3 = 100; críticos A1–A6 = 78; ejemplos 91,0 / 88,7 / 90,0; 8,9 en A3 → 89,87 → 89,8; 89,96 → 89,9 — todo correcto.
- **Umbral:** 90,0 en todos los niveles; 5 rondas máx.; calibración > 10,0; discrepancia crítica ≥ 2,0; dos supervisores > 5,0; muestreo 100 %/≥ 50 %; ≤ 3 menores. Sin contradicciones entre capítulos.
- **Terminología:** «dueño»/«autor» unificados por la nota de cabecera del prompt integrado; «Auditor final» y «verificador de producto» eliminados; «Lead» ausente. **Salvedad:** la tabla de estados duplicada conserva ambos términos (RT-12) y Gate 5 mantiene una firma contradictoria (RT-05).
- **Única cifra incoherente localizada:** el «global 91,8» del Anexo A (RT-13), que además contradice la regla de truncado.

### 3.3 Cobertura R1–R8 (≥ 2 mecanismos independientes)

| R | Mecanismos encontrados | Resultado |
|---|---|---|
| R1 | P2, §1.1.1, §5.1–§5.7, §7.8, I1, G1 | **PARCIAL / B**: cubre autores, no a supervisores, auditor ni orquestador (RT-01). |
| R2 | P3, §5.3, D5, A6, §8.2, G2 | Cumple (≥ 2 mecanismos). |
| R3 | §4.1–§4.4, §4.2 (15 áreas), Gate 1, P12, G3 | Cumple. |
| R4 | §1.4, §4.6, P5/P7, §7.2–§7.8, §7.14, G4 | Cumple. |
| R5 | §7.6–§7.11, §8.2–§8.5, §8.9–§8.10, P7/P8/P19, §10.1, G5 | Cumple en secciones; P19 roto en el integrado (RT-16). |
| R6 | P4, §5.5, §6.5, §7.10, §7.13, §8.9, §10.1–§10.2, G6 | Cumple. |
| R7 | P12, §8.1–§8.7, §8.9, §10.3, §12.3, G7 | Cumple; RT-09 reduce la eficacia del contador de rondas. |
| R8 | §2.3, §9.1–§9.13, §10.2, §12.3, G8 | Cumple; RT-04/RT-06/RT-07 introducen ambigüedad en el entorno y el rendimiento. |

### 3.4 Ambigüedades ejecutables, dependencias y reglas del proyecto

- **Ambigüedades que obligan a interpretar:** RT-02 (qué tareas cierra Gate 4), RT-03 (auditoría como tarea), RT-04 (umbral de rendimiento), RT-06 (qué es «local»), RT-07 (limitación vs BLOCKED), RT-08 (coste de mejora), RT-09 («abuso» sin umbral), RT-15 (frase de calibración). Todas tienen arreglo de una o dos líneas.
- **Dependencias imposibles:** el ciclo Gate 4 ↔ tarea de verificación (RT-02) y la tarea de auditoría sin supervisor (RT-03). El resto de dependencias externas existen y están verificadas: `skills/SKILL_*.md` citadas existen (`SKILL_CREAR`, `SKILL_MAESTRA`, `SKILL_AUDITOR`, `SKILL_CAPTURAS_VERIFICACION`, `SKILL_VERIFICACION_PLAYWRIGHT`, `SKILL_history-server`, `SKILL_arquitecto-backend-php-hostinger`, `SKILL_style-guide-antigravity`, `SKILL_EDITAR_cirujano-codigo-produccion`); `tools/.htaccess`, `tools/verificar-despliegue.ps1`, `tools/verificar-apps-produccion.ps1` y el catálogo `POLITICA_modelos-imagen.md` existen. **No se ha encontrado ninguna skill, herramienta o modelo inventado** en la muestra verificada (incluido el borde 0,45 de Hoola, que es correcto en `SKILL_MAESTRA.md:143`).
- **Reglas del proyecto omitidas o rebajadas:** el prompt integrado no recoge dos reglas de `claude.md`: (a) `claude.md:105` exige commit+push **tras cada cambio de archivo**, mientras §2.3.7 del prompt habla de «cada unidad lógica verificada»; (b) `claude.md:104` exige `loading="lazy"` en imágenes y ese atributo no aparece en la auditoría A–H ni en la checklist. No hay reglas inventadas detectadas en la muestra.

### 3.5 Prueba de mesa con brief realista

**Brief:** «Web para un estudio de fotografía: landing con galería de sesiones, formulario de contacto y generador de presupuesto descargable en JSON; historial persistente; publicar en Hostinger.»

| Fase | ¿Se puede ejecutar solo con el prompt? |
|---|---|
| 0 | **Casi.** Variables y contrato se completan, pero la fila «Rendimiento» remite a un umbral inexistente (RT-04): hay que inventarlo o dejar el Gate 0 incompleto. |
| 1 | **No en lectura literal.** La cobertura obliga a tarea para «Auditoría end-to-end»; el auditor no tiene supervisor independiente y el segundo auditor es opcional (RT-03). El plan se atasca en Gate 1 o exige una excepción no escrita. |
| 2–3 | **Sí.** Autoevaluación, informe, muestreo, ciego, PASS/REWORK y rework están completos y son operativos. |
| 4 | **Sí**, salvo la vía de rondas no consumidas (RT-09), que permite estancar sin quemar rondas. |
| 4→5 | **No en lectura literal.** Gate 4 exige cerrar la tarea de verificación que aún no existe (RT-02). |
| 5 | **Sí** si hay URL o runtime declarado. Si no hay entorno, la alternativa «limitación explícita» no permite entregar (RT-07) y la definición de «local» choca con §9.2 (RT-06). |
| 5→6 | **Con ambigüedad de firma.** Gate 5 dice «Auditor y orquestador» y §7.14 prohíbe firmar al orquestador (RT-05). Un operador razonable lo resuelve (firma el auditor, el orquestador registra), pero el texto no lo dice. |
| 6 | **Sí.** Plantilla de entrega, BLOCKED y cierre de memoria son ejecutables. |

**Conclusión de la prueba de mesa:** el prompt es ejecutable de principio a fin **solo si el orquestador interpreta tres reglas** (Gate 4, tarea de auditoría, entorno local). En lectura literal se detiene en Gate 1/4 y la entrega queda en ambigüedad. Eso es exactamente el tipo de defecto que el BRIEF §5 llama «paso imposible o dato indefinido = defecto».

### 3.6 Observación de proceso sobre los PASS recibidos

Los cuatro PASS (ST1–ST4) se emitieron con RT-02…RT-09 abiertos. Los supervisores verificaron bien la aritmética, las evidencias y el contrato, pero **no probaron la secuencia completa Fase 0→6 con un brief**: si lo hubieran hecho, el ciclo de Gate 4 y la tarea de auditoría habrían aparecido. No se cuestiona la honestidad de los scorecards (no hay evidencia de gaming), sino la cobertura de la prueba de mesa. Para los gates finales FG-A/FG-B, la prueba de mesa debe ejecutarse sobre el prompt integrado y no solo sobre las secciones.

---

## 4. Veredicto por sección (FASE 1)

| Sección | Veredicto | Hallazgos que la afectan |
|---|---|---|
| `01-nucleo.md` (núcleo de orquestación) | **DEFECTOS** | RT-01 (parte), RT-02, RT-03, RT-04, RT-05, RT-06, RT-07 (1 B parcial + 6 M + 1 Men) |
| `02-rubrica.md` (autoevaluación y rúbrica) | **DEFECTOS** | RT-08, RT-10 (1 Med + 1 Men) |
| `03-supervision.md` (supervisión y rework) | **DEFECTOS** | RT-01 (parte), RT-09, RT-11, RT-12 (parte), RT-15 (1 B parcial + 1 Med + 3 Men) |
| `04-integracion.md` (verificación y entrega) | **DEFECTOS** | RT-02 a RT-07 (M afectados), RT-13, RT-14 (6 M afectados + 2 Men) |
| **Sistema de autoevaluación + supervisión (global)** | **DEFECTOS** | 1 B + 6 M + 2 Med + 6 Men |

**Justificación del veredicto:** la arquitectura del sistema es buena —umbral único, gates, muestreo, ciego, rework, anti-gaming y BLOCKED están bien pensados—, pero R1 no está cubierto para todos los agentes (B) y hay seis ambigüedades que obligan a interpretar en puntos de paso obligatorio (M), además de dos huecos medios de gaming. Con esos defectos, el sistema **no puede demostrar** que todo agente se autoevalúa ni que la secuencia de gates es ejecutable sin interpretación.

---

## 5. Mejoras asequibles que deben corregirse antes de la entrega

Ordenadas por prioridad; todas son de bajo coste (una o dos líneas salvo RT-01):

1. **RT-01 (B):** bloque de autoevaluación del supervisor/auditor/orquestador y decisión; o redefinir el autochequeo como autoevaluación puntuada y declararlo en G1.
2. **RT-02 (M):** reescribir Gate 4 y las condiciones de entrega para excluir la tarea de verificación del cierre previo.
3. **RT-03 (M):** excepción explícita de la fila «Auditoría end-to-end» (gate, no tarea) o segunda firma obligatoria.
4. **RT-04 (M):** criterio de rendimiento observable en §3.2 y §9.8.
5. **RT-05 (M):** Gate 5 firma solo el auditor; el orquestador registra.
6. **RT-06 (M):** eliminar «verificación a local» y exigir runtime declarado.
7. **RT-07 (M):** eliminar «limitación explícita» para el entorno final; solo BLOCKED.
8. **RT-08 y RT-09 (Med):** recálculo del coste por el supervisor y topes de reenvíos/retiradas.
9. **RT-10 a RT-15 (Men):** plantilla, ejemplo del scorecard, tabla de estados, ejemplo 91,8, borrado de evidencias y frase de calibración.
10. **FASE 2:** restaurar P19, corregir Anexo D (G1 y referencia a P19), numeración §2.3, `EVIDENCIA.md` y `LEEME.md`.

Ninguna de estas mejoras exige reescribir secciones completas: son correcciones quirúrgicas compatibles con el rework dirigido.

---

# FASE 2 — Auditoría del prompt integrado

## 6. Verificación de la fusión (método y resultado)

**Método:** diff normalizado por capítulos entre cada sección y su tramo del prompt (se normalizaron los niveles de encabezado y se ignoraron líneas vacías). Comprobaciones mecánicas adicionales: SHA-256, bytes/caracteres/líneas, cercas de código, coherencia de columnas de todas las tablas, referencias `§` y conteo de etiquetas meta.

**Resultado positivo (evidencia a favor de la fusión):**

- El prompt mide **1.819 líneas, 181.563 caracteres y 184.769 bytes**, con SHA-256 `9A8FDB8A…BD95E7`; coincide con la versión que anunció el Lead (salvo el número de bytes, ver RT-24).
- **Contenido íntegro:** el diff da **0 diferencias** en §2.3 (bloque de proyecto), capítulos 1–2, 3–4, 5–6, 7–8, 9–10 y 12. La única línea de cuerpo perdida en toda la fusión es **P19** (RT-16).
- **Sin restos de integración:** 0 «Nota para la integración», 0 «se añaden al integrar», 0 «Pendiente de integración», 0 `Lead`, 0 `BRIEF.md`; no hay referencias a las secciones T1–T4 (la única `T1` es el identificador genérico de fila de la plantilla de entrega, §10.2, y no un resto de integración).
- **Formato:** 32 cercas equilibradas, 0 filas de tabla con columnas incoherentes, 0 emojis/surrogates, 0 `/10` mal rotulados como total (los `/10` son la fórmula correcta), 0 etiquetas `R1–R8` (autosuficiencia, se usan G1–G8).
- **Coherencia numérica:** 90,0, 5 rondas, 10 criterios/100, >10,0 y ≥2,0 de calibración, >5,0 de desempate, 100 %/50 % de muestreo y ≤3 menores sin contradicciones en el integrado.
- **Tablas nuevas:** §11 (3 columnas) y §12.4 (2 columnas) están bien formadas.

**Resultado negativo:** pérdida de P19, referencias colgantes, numeración §2.3 sin §2.1/§2.2 y defectos de fusión que se detallan en 6.2. Los hallazgos de FASE 1 **persisten todos** en el integrado (tabla 6.3); no fueron corregidos por la fusión.

## 7. Hallazgos nuevos de FASE 2

#### RT-16 — [M] P19 desapareció del capítulo 2 y el Anexo D la sigue citando

- **Ubicación:** `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md:118` (última regla, P18), `:120` (`## 2.3`); `:1812` (G5: «P7–P8 **y P19** (§2)»); `autoevaluaciones/lead-integrador.md:42` y `:47` (C5 y C10 citan «P19» como evidencia).
- **Evidencia:** el `§2` integrado contiene P1–P18 (grep de filas `^| Pn` = 18) y P19 no aparece en ningún punto del capítulo 2. El diff con `01-nucleo.md` devuelve exactamente una línea perdida: «P19 | **El PASS no se hereda.** Cada aprobación está ligada a una versión exacta…». La regla de fondo sigue en §7.10.4 («No se hereda un PASS de una versión anterior») y §8.9.9, pero la regla inviolable y su referencia de trazabilidad se rompieron.
- **Arreglo:** insertar la fila P19 completa después de P18, con el mismo texto de `01-nucleo.md:100`, y actualizar la referencia del Anexo D (quedará válida) y la autoevaluación del integrador.

#### RT-17 — [M] El Anexo D no cumple la matriz de trazabilidad R1–R8 → líneas y sobreafirma G1

- **Ubicación:** `:1802-1815` (§12.4 Anexo D), `:1808` (G1), `:1812` (G5 con P19); requisito: `BRIEF.md:39` («matriz de trazabilidad R1–R8 → sección/línea/evidencia») y `BRIEF.md:104` (prueba obligatoria de trazabilidad), `task-10` punto 4 («adjuntar matriz de trazabilidad R1–R8 → secciones/líneas → doble mecanismo»).
- **Por qué es un fallo:** el Anexo D usa etiquetas G1–G8 y referencias de sección, pero **ninguna línea** y **ningún R1–R8**. Además G1 afirma «Todo agente se autoevalúa» citando §5.1–§5.2, §5.7, P2, D7 y §7.8, que solo cubren a autores (RT-01). La matriz que exige el gate C1 no existe en ningún artefacto entregado (ni en `EVIDENCIA.md`, que aún no existe). Es una afirmación de trazabilidad no verificable.
- **Arreglo:** añadir a `EVIDENCIA.md` (y opcionalmente al Anexo D) una matriz con columnas R1–R8, archivo:línea o §x.y del prompt, y 2 mecanismos independientes; corregir G1 para que su alcance sea real (o añadir el mecanismo de RT-01).

#### RT-18 — [Med] El consejo de partición de `LEEME.md` es incoherente y podría dejar a los supervisores sin rúbrica

- **Ubicación:** `LEEME.md:41` («mantén §1–§8 y la tabla de tareas en el orquestador y entrega **§9–§12** a los agentes verificadores; **no recortes §5–§8** ni el umbral»).
- **Por qué es un fallo:** si los verificadores solo reciben §9–§12, no tienen la rúbrica (§6), ni las condiciones de PASS (§7.10), ni el protocolo de muestreo (§7.6) ni las plantillas de scorecard (§7.12); no podrían supervisar. Y la frase «no recortes §5–§8» no aclara a quién se le entregan. Es una instrucción que, seguida al pie de la letra, rompe el control de calidad.
- **Arreglo:** sustituir por una tabla de carga por rol: orquestador = prompt completo; cada supervisor = §5–§8 + §12.4; el dueño de verificación = §9–§12 + §6; el auditor = §6–§8 + §9–§10 + §12.4. O, más simple: «no dividas el prompt; si el contexto no cabe, usa un modelo con ventana suficiente». Mantener siempre el umbral y §5–§8 en quien puntúa.

#### RT-19 — [Med] `LEEME.md` contradice al prompt sobre producción y variables obligatorias

- **Ubicación:** `LEEME.md:25` («la **URL de producción verificada** y el commit» como requisito de entrega), `LEEME.md:37` («versión servida comprobada»), `LEEME.md:29` («La única obligatoria de verdad es `BRIEF_USUARIO`») frente a `PROMPT…:61` (DESPLIEGUE condicional), `:1465` (runtime real declarado sin publicación), `:1607` (entorno final: producción **o runtime real declarado**), `:47-65` (§1.2 marca 6 variables como «Sí»).
- **Por qué es un fallo:** el prompt permite entregar una app local verificada en su runtime declarado; el LEEME exige URL de producción. Y §1.2 declara obligatorias `OBJETIVO`, `ALCANCE`, `USUARIOS_Y_FLUJO`, `ENTORNO`, `EQUIPO_DISPONIBLE` y `BRIEF_USUARIO`; el LEEME minimiza a una. El usuario del prompt puede concluir que una app local no es entregable o que puede saltarse variables obligatorias.
- **Arreglo:** en LEEME: «URL pública **o runtime real declarado** verificados»; y «`BRIEF_USUARIO` es la única que debes aportar como encargo; el resto debe quedar resuelta al cerrar la Fase 0 (preguntando o como supuesto explícito), nunca omitida».

#### RT-20 — [Med] Dos reglas del proyecto no quedan fielmente recogidas (commit por archivo y `loading="lazy"`)

- **Ubicación:** `claude.md:105` («Haz commit + push tras **CADA cambio de archivo**») frente a `PROMPT…:194` («Cada **unidad lógica verificada** se publica con commit descriptivo y push»); `claude.md:104` y `SKILL_AUDITOR.md:23,145` (`loading="lazy"` como ítem de auditoría) frente a `PROMPT…:1521-1528` (§9.8 no menciona `loading`).
- **Por qué es un fallo:** son reglas obligatorias del proyecto Antigravity que el prompt debe imponer en su destino; la primera se difumina (permite agrupar varios archivos en un commit, cuando la regla es por archivo) y la segunda se omite. No son inventos, son omisiones/relajaciones; ambas son fáciles de corregir.
- **Arreglo:** en §2.3.7: «commit y push **tras cada cambio de archivo verificado**; agrupar varios cambios ajenos en un commit está prohibido». En §9.8/checklist: añadir «imágenes con `loading="lazy"` bajo el pliegue y `width`/`height``».

## 8. Menores nuevos de FASE 2

| ID | Sev. | Ubicación | Defecto | Arreglo |
|---|---|---|---|---|
| RT-21 | Men | `PROMPT…:17`, `:120` y 15 referencias `§2.3` | No existen §2.1 ni §2.2: el capítulo 2 salta de «2.» a «2.3». La referencia funciona, pero la numeración es incoherente y el propio Lead la declara residual (C9 7,8). | Renumerar el bloque a §2.1 (y sus subapartados) y actualizar las 15 referencias, o añadir §2.1 «reglas de proceso» y §2.2 «reglas del proyecto» con contenido real. |
| RT-22 | Men | `PROMPT…:3` | La cabecera dice «Verificación: dos supervisores independientes (ver `EVIDENCIA.md`)»: (a) `EVIDENCIA.md` no existe todavía, (b) la verificación del prompt integrado (FG-A/FG-B) aún no se ha emitido. | Quitar el paréntesis y la afirmación de verificación de la cabecera; dejar «Verificación: pendiente de gates finales» o mover la referencia a `LEEME.md` una vez exista `EVIDENCIA.md`. La cabecera no debe depender de un fichero que no viaja con el prompt. |
| RT-23 | Men | `PROMPT…:1736`, `:1760`, `:1781` (`## 12.x`) frente a `:1802` (`### 12.4`) | Los anexos 12.1–12.3 son `##` y el 12.4 recién añadido es `###`; inconsistencia de jerarquía. | Poner `## 12.4` como los demás. |
| RT-24 | Men | `autoevaluaciones/lead-integrador.md:5` y `:23` | La autoevaluación del integrador afirma «1819 líneas, **185.117 caracteres**» (el archivo tiene 184.769 bytes y 181.563 caracteres), «**SHA-256 se fija al congelar**» (no figura el hash) y «14 H1 (… 12 secciones + cierre de cabecera…)» (el archivo tiene **13 H1**: título + §1–§12). Las métricas de evidencia no son reproducibles tal como se declaran. | Corregir las cifras, incluir el SHA-256 `9A8FDB8A…BD95E7` y el método de conteo; si se cita P19, tras RT-16. |
| RT-25 | Men | `PROMPT…:85` | El rol «Integrador» se define en §1.4 y **no aparece en ninguna otra fase ni tabla**: no se le asigna tarea, contrato ni gate. O es un rol huérfano o falta el mecanismo que le asigna el despliegue. | Referenciarlo en §4.1/§4.3 (dueño de la tarea de integración/despliegue) y en §7.2/§9, o eliminarlo de §1.4. |
| RT-26 | Men | `PROMPT…:1726` (§11) | El índice dice «Registro de defectos y solicitud de rework | §7.11 y §8.8», pero las plantillas reales están en §7.12.3 y §7.12.5; §7.11 define los campos, no la plantilla. | Corregir las referencias a §7.12.3, §7.12.5 y §8.8.2. |

## 9. Persistencia de los hallazgos FASE 1 en el integrado

Los hallazgos de FASE 1 **no se corrigieron en la fusión**; se localizan ahora así:

| Hallazgo FASE 1 | Línea(s) en el prompt integrado |
|---|---|
| RT-01 (R1 incompleto) | `:30`, `:102`, `:1808` (G1), `:1205` (I1) |
| RT-02 (Gate 4 / tarea de verificación) | `:423`, `:487`, `:316`, `:331`, `:1454`, `:1605` |
| RT-03 (auditoría como tarea sin supervisor) | `:316`, `:333`, `:353`, `:1175` |
| RT-04 (umbral de rendimiento) | `:240`, `:1527` |
| RT-05 (firma de Gate 5) | `:488`, `:1175` |
| RT-06 (local vs `file://`) | `:61`, `:1465` |
| RT-07 (limitación vs BLOCKED) | `:502`, `:1595`, `:1596`, `:1607` |
| RT-08 (coste de mejora) | `:554`, `:556`, `:993` |
| RT-09 (rondas no consumidas) | `:1271`, `:1287` |
| RT-10 (plantilla sin /10) | `:663` |
| RT-11 (ejemplo 18/No) | `:1093` |
| RT-12 (tabla de estados duplicada) | `:403-414`, `:1245-1254` |
| RT-13 (global 91,8) | `:1758` |
| RT-14 (borrado de evidencias) | `:213`, `:1565` |
| RT-15 (frase de calibración) | `:995` |

## 10. Prueba de mesa y anti-gaming sobre el integrado

**Prueba de mesa (resumen):** el integrado es una concatenación fiel y sus mecanismos de autoevaluación/supervisión funcionan como en las secciones. El brief del estudio de fotografía recorre Fase 0→6 con las mismas tres paradas ya descritas (Gate 1 por la tarea de auditoría, Gate 4 por la tarea de verificación, y la ambigüedad de firma de Gate 5); además, el umbral de rendimiento sigue sin número y la cabecera promete una verificación de gates que aún no existe. El prompt **se puede leer entero** y un orquestador competente puede resolver las paradas, pero no **sin interpretar**; por tanto no supera la prueba de mesa en sentido estricto.

**Anti-gaming sobre el integrado:** P19 desaparecida no reabre la aprobación de versiones antiguas porque §7.10.4/§8.10 la siguen prohibiendo; los ataques que siguen abiertos son RT-08 (inflar coste), RT-09 (estancar sin consumir ronda), RT-07 (vender «limitación» como entrega) y RT-05 (leer Gate 5 como co-firma del orquestador). Ninguno permite entregar una tarea con nota < 90 como PASS, pero tres de ellos permiten **disimular el estado real**, que es lo que el encargo pide evitar.

**Coste/beneficio del tamaño:** 1.819 líneas / 181.563 caracteres / ≈ 29.200 palabras (≈ 45.000 tokens según LEEME). Para un orquestador con ventana de 128k es viable pero consume un tercio largo del contexto antes de leer el brief; el riesgo real no es el tamaño, sino la tentación de recortar (§5–§8) que el LEEME sugiere mal (RT-18). Recomendación: conservar el prompt completo y, si se reparte por roles, hacerlo con la tabla de RT-18; no recortar nunca §5–§8 ni el umbral.

## 11. Veredicto global (FASE 1 + FASE 2)

| Nivel | Veredicto | Motivo |
|---|---|---|
| Sección 1 | **DEFECTOS** | 1 B (parcial), 5 M, 1 Med, 1 Men |
| Sección 2 | **DEFECTOS** | 1 Med, 2 Men |
| Sección 3 | **DEFECTOS** | 1 B (parcial), 1 Med, 3 Men |
| Sección 4 | **DEFECTOS** | 6 M afectados, 2 Men |
| **Sistema de autoevaluación y supervisión** | **DEFECTOS** | 1 B + 6 M + 2 Med + 6 Men; R1 sin cobertura universal y gates con ambigüedad |
| **Prompt integrado** | **DEFECTOS** | Fusión fiel, pero P19 perdida, matriz R1–R8 inexistente, LEEME incoherente en dos puntos, 1 B + 6 M + 2 Med heredados y 2 M + 3 Med + 6 Men nuevos (26 únicos) |

**Totales únicos:** **B = 1 · M = 8 · Med = 5 · Men = 12. Total = 26.**

**Recomendación al Lead:** no presentar el prompt a los gates finales todavía. Corregir primero RT-01…RT-09 (B/M/Med) y RT-16/RT-17 (M de integración), y de paso RT-10…RT-15, RT-18…RT-26. Las correcciones son quirúrgicas y no obligan a reescribir ninguna sección; tras aplicarlas, este informe debe actualizarse con la verificación de cierre y los gates FG-A/FG-B pueden activarse sobre la nueva versión congelada (nuevo SHA-256).

---

## 12. Evidencias de reproducción y límites

- **Hashes/tamaños:** `Get-FileHash -Algorithm SHA256` y `[IO.File]::ReadAllText(...)` / `ReadAllLines(...)` sobre los archivos citados. Resultado en §0.
- **Diff sección → prompt:** comparación normalizada (niveles de encabezado, sin líneas vacías) por tramos: capítulos 1–2 = 0 diffs; §2.3 = 0; capítulos 3–4 = 0; 5–6 = 0; 7–8 = 0; 9–10 = 0; 12 = 0 salvo el título del anexo; **única línea perdida: P19**.
- **Aritmética:** recálculo manual+PowerShell de §6.2 (100), ejemplos (91,0 / 88,7 / 90,0), casos (89,87→89,8; 89,96→89,9), autoevaluaciones (93,6 / 92,5 / 93,3 / 93,8) y scorecards (94,2 / 93,6 / 93,60 / 93,80).
- **Tablas/cercas/referencias:** validación de filas de tabla (0 incoherencias), cercas (32, par), ausencia de `Lead`, `BRIEF.md`, TODO/`[pendiente]` fuera de prohibiciones y emojis. Búsqueda dirigida de referencias sospechosas (`§2.1`, `§2.2`, `§13`, `§12.5` y saltos equivalentes): **ninguna**; las referencias `§` encontradas apuntan a capítulos y subapartados existentes (§2.3.1–§2.3.9, §4.5, §7.10, §8.5, §12.3, etc.).
- **Reglas del proyecto:** contraste con `claude.md:104-105`, `skills/SKILL_MAESTRA.md:138-143`, `skills/POLITICA_modelos-imagen.md`, `skills/SKILL_VERIFICACION_PLAYWRIGHT.md:14-43`, `skills/SKILL_AUDITOR.md:23,145` y `tools/verificar-apps-produccion.ps1`. No se ha encontrado ninguna regla inventada en la muestra; sí dos omisiones (RT-20).
- **Límites:** auditoría documental; no se generó una web real (BRIEF §6.11), no se ejecutaron los gates FG-A/FG-B (pendientes) ni se probó el prompt en un orquestador real. Los hallazgos de "prueba de mesa" son análisis de secuencia, no una ejecución. No se ha modificado ningún artefacto fuera de este informe.

**Firma:** `auditor-red-team` — 2026-10-23. Este informe no cierra `task-9`; queda a la espera de que el Lead confirme la resolución o justificación de los hallazgos B/M/Med (y de la nueva versión congelada para re-verificar).

---

# FASE 3 — Re-auditoría de cierre (v1.1)

## 13. Versión auditada y método

| Artefacto | Medida verificada |
|---|---|
| `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` | **1.832 líneas · 188.970 bytes · SHA-256 `D5DD20D97BAEAB9910362F6B43A1E3356972801B1915960988C2AE975A43B0F7`** |
| Caracteres | 185.652 contando saltos de línea; **183.820 sin saltos** (185.652 − 1.832). `EVIDENCIA.md:6` y `lead-integrador.md:5` publican 183.820: solo es reproducible con la convención «sin saltos», que no se declara. |
| `LEEME.md` | 52 líneas · 4.514 bytes |
| `EVIDENCIA.md` | 85 líneas · 7.542 bytes (nuevo) |
| `autoevaluaciones/lead-integrador.md` | 60 líneas (actualizado, 94,5 autodeclarado) |

Se ha verificado el archivo real, no el mensaje del Lead. El SHA-256 coincide con el anunciado; las correcciones declaradas se comprobaron línea a línea, se repitió el diff normalizado sección → prompt, se validaron 70 referencias `§`, 49 tablas (42 en prosa + 7 en plantillas de bloque de código), 32 cercas, la aritmética y la matriz R1–R8 de `EVIDENCIA.md`, y se repitieron la prueba de mesa y los ataques de gaming. También se comprobó que **ningún cambio del rework perdió contenido**: todos los diffs contra las secciones corresponden a correcciones declaradas; no hay líneas desaparecidas fuera de las corregidas.

## 14. Estado de los 26 hallazgos de la ronda 1

| ID | Sev. | Estado | Evidencia real de la corrección en v1.1 |
|---|---|---|---|
| RT-01 | B | **CERRADO** | P2 cubre todos los roles (`:106`); §5.8 completa (`:686-701`); I1 «por tarea y por rol» (`:1217`); G1 cita §5.8 (`:1821`); matriz R1 en `EVIDENCIA.md:29`. Queda la observación Menor RT-29. |
| RT-02 | M | **CERRADO** | Gate 4 solo tareas de producto y verificación/auditoría abiertas en Gate 4 (`:481`); §4.5 `:417`; §4.7 `:436`; §10.1 `:1618`. Ya no hay ciclo. |
| RT-03 | M | **CERRADO** | Fila «Auditoría end-to-end» = gate §7.14, no tarea (`:338`); regla de excepción (`:343`). |
| RT-04 | M | **CERRADO** | Criterio en §3.2 (`:245`: Lighthouse ≥ 90 en las 4 categorías, móvil y escritorio) y §9.8 (`:1540`). |
| RT-05 | M | **CERRADO** | Gate 5 firma solo el auditor; el orquestador registra (`:482`); coherente con §7.14 (`:1187`). |
| RT-06 | M | **CERRADO** | `DESPLIEGUE` exige runtime real declarado y `file://` no válido (`:61`); §9.2 coherente (`:1477`). |
| RT-07 | M | **CERRADO** | «Limitación explícita» eliminada (`:496`, `:1609`); entrega exige entorno verificado (`:1620`). |
| RT-08 | Med | **CERRADO** | El supervisor recalcula el coste y en duda exige la mejora (`:548`, `:1004`). |
| RT-09 | Med | **CERRADO** | Topes en §8.2.3 (`:1283`) y §8.4 (`:1299`): segunda retirada cuenta y segundo reenvío no admitido consecutivo consume ronda. No reaparece el bucle. |
| RT-10 | Men | **CERRADO** | Plantilla 5.7 con `(Σ(nota × peso)) / 10` (`:657`). |
| RT-11 | Men | **CERRADO** | Fila de ejemplo «A1 … 18 … Sí» (`:1105`). |
| RT-12 | Men | **CERRADO** | Tabla única en §8.1 (`:1257-1266`); §4.5 solo enumera estados y remite a §8.1 (`:408`). |
| RT-13 | Men | **CERRADO** | Anexo A: global 91,7 (media truncada de 91,75) (`:1771`). |
| RT-14 | Men | **CERRADO** | Scripts/perfiles temporales se borran; evidencias fechadas se conservan (`:218`; coherente con `:1578`). |
| RT-15 | Men | **CERRADO** | «aunque la discrepancia total sea ≤ 10,0 puntos» (`:1006`). |
| RT-16 | M | **CERRADO** | P19 restaurada (`:123`), citada en G5 (`:1825`) y en la matriz R5 (`EVIDENCIA.md:33`); el diff ya no pierde ninguna línea de cuerpo. |
| RT-17 | M | **CERRADO** | Anexo D con R1–R8 y G1 corregido (`:1815-1828`); matriz completa con líneas en `EVIDENCIA.md:23-36`, con las 70 referencias `§` verificadas contra los encabezados reales. |
| RT-18 | Med | **CERRADO** | `LEEME.md:41` reparte por rol y prohíbe entregar a quien puntúa sin §5–§8 ni umbral. |
| RT-19 | Med | **CERRADO** | `LEEME.md:25` admite runtime declarado; `:29` distingue aportar el brief de resolver las variables «Sí». |
| RT-20 | Med | **CERRADO** | Commit por cambio de archivo verificado (`PROMPT:199`); `loading="lazy"` y dimensiones en §9.8 (`:1537`). |
| RT-21 | Men | **CERRADO** | §2.1 (`:99`) y §2.2 (`:125`); 15 referencias a §2.2 y **0** referencias a §2.3; 70 refs únicas, todas resueltas. |
| RT-22 | Men | **PARCIAL** | La afirmación «Verificación: dos supervisores» ya no está, pero la cabecera aún remite a un fichero externo: `:3` «acta consolidada en `EVIDENCIA.md` del proyecto». No es dependencia funcional, pero el prompt copiado la arrastra. |
| RT-23 | Men | **CERRADO** | §12.4 es `##` como §12.1–§12.3 (`:1815`). |
| RT-24 | Men | **CERRADO** | `lead-integrador.md:5` con líneas, bytes, SHA real y total 945,8 → 94,5 correcto. Nota: 183.820 es «caracteres sin saltos»; conviene declarar la convención. |
| RT-25 | Men | **CERRADO** | Integrador con tarea, momento y revisión en §1.4 (`:87`). |
| RT-26 | Men | **CERRADO** | Índice §11 corregido a §7.12.3, §7.12.5 y §8.8.2 (`:1739`). |

**Resultado: 25 CERRADOS · 1 PARCIAL (RT-22, Menor).** Ningún B/M/Med de la ronda 1 sigue abierto en el prompt.

## 15. Comprobaciones de regresión

- **P19:** presente (`:123`), coherente con §7.10.4 (`:1043`), §8.9.9, Anexo D G5 (`:1825`) y `EVIDENCIA.md:33`. Sin referencias colgantes.
- **Numeración:** §2.1/§2.2 existen con §2.2.1–§2.2.9; 15 referencias a §2.2; **0** referencias a §2.3; 70 referencias `§` únicas, todas con encabezado real (§1.2 … §12.3). Sin saltos huérfanos.
- **Sin pérdida de mecanismos:** diff normalizado contra las 4 secciones: capítulos 1, 6 y el bloque de proyecto conservan todo salvo los cambios declarados; capítulos 3–4, 7–8, 9–10 y 12 solo difieren en las correcciones RT-02…RT-15, RT-20, RT-23 y RT-25; los cambios de §5.3/§5.7/§5.8/§7.8/§7.12/§8.2/§8.4/§9.8/§10.1 son los previstos. **No se detecta ningún mecanismo perdido.**
- **Gate 4/5 sin ciclos:** Gate 4 exige tareas de producto (`:481`); la verificación real se abre con Gate 4 y se cierra tras la Fase 5 (`:1466`); la auditoría exige todas las tareas con PASS y la Fase 5 (`:1185`); Gate 5 firma el auditor (`:482`). La secuencia es ejecutable. Queda la precisión Menor RT-30.
- **§5.8 contra §5.4/§6/§7:** usa la rúbrica §6 y la interpretación de «verificación o auditoría» de §6.6; pide decisión binaria y adjuntar evidencias; conecta con P2 (`:106`), I1 (`:1217`) y G1 (`:1821`). No contradice §5.4 ni §7.10. Observaciones Menores en RT-29 (plantilla/nota y criterio crítico ≥ 9 no enumerado en §5.8.3).
- **Anexo D/G1 y matriz:** `EVIDENCIA.md:23-36` tiene las 8 filas R1–R8 con mecanismos y líneas; muestran entre 6 y 11 mecanismos por requisito. Verificadas todas las referencias de línea de la matriz: apuntan al encabezado/fila correctos.
- **LEEME:** coherente en reparto por rol (`:41`), entorno final (`:25`) y variables (`:29`). Nuevos defectos documentales: RT-27 (`:45`, verificación del integrado declarada en pasado) y RT-28 (`:51`, v1.0 frente a v1.1).
- **Mecánica:** 1.832 líneas; 32 cercas equilibradas; **49 tablas** (42 en prosa + 7 en plantillas de bloque de código) sin columnas incoherentes; 13 H1; 0 «Lead»; 0 «verificador de producto»; 0 notas de integración; 0 `TODO` reales (solo la prohibición de §10.1); 0 `[pendiente]` reales; 0 emojis. `EVIDENCIA.md:85` publica «51 tablas»: el recuento reproducible es 49 (una fila separadora por tabla), así que esa cifra debe corregirse.
- **Aritmética:** pesos 18+15+13+10+12+10+8+6+5+3 = 100; ejemplos 91,0 / 88,7 / 90,0; 8,9 en A3 → 89,87 → 89,8; 89,96 → 89,9; Anexo A 91,75 → 91,7; autoevaluación del integrador 945,8/10 = 94,58 → 94,5; cadena de `EVIDENCIA.md` (94,2 / 93,6 / 93,60 / 93,80) correcta. Sin redondeos al alza.

## 16. Prueba de mesa completa Fase 0→6 (v1.1)

Mismo brief que en FASE 1: web de estudio de fotografía con galería, formulario, presupuesto JSON descargable, historial persistente y publicación en Hostinger.

| Fase | Resultado v1.1 |
|---|---|
| 0 | **Pasa.** El contrato de aceptación ya tiene umbral de rendimiento observable (§3.2 `:245`); Gate 0 firmable. |
| 1 | **Pasa.** 15 áreas con tarea o excepción explícita; la fila de auditoría ya no exige tarea (`:338`/`:343`); Gate 1 firmable. |
| 2–3 | **Pasa sin cambios.** Autoevaluación (D1–D7), supervisión ciega, muestreo, PASS/REWORK y rework operativos. |
| 4 | **Pasa.** Contador de rondas protegido (RT-09). |
| 4→5 | **Pasa.** Gate 4 abre la verificación sin ciclo (`:481`); la tarea de verificación se cierra con su evidencia y supervisor antes del Gate 5. |
| 5 | **Pasa** con URL o runtime declarado; sin entorno verificable → BLOCKED (`:1609`). |
| 5→6 | **Pasa.** Gate 5: firma el auditor, el orquestador registra (`:482`). |
| 6 | **Pasa.** Plantilla de entrega, BLOCKED y cierre de memoria ejecutables. |

**Conclusión:** el prompt v1.1 recorre Fase 0→6 **sin paradas de interpretación**, con la única precisión documental de RT-30 (decir que la tarea de verificación se cierra con su PASS antes del Gate 5) y las observaciones de plantilla de §5.8 (RT-29). La prueba de mesa ya no bloquea.

## 17. Anti-gaming v1.1 (incluidas las nuevas §5.8, RT-08 y RT-09)

| Ataque | Mecanismo nuevo/actual | Resultado |
|---|---|---|
| Evitar autoevaluarse siendo supervisor, auditor u orquestador | §5.8 (`:686-701`), P2 (`:106`), G1 (`:1821`), I1 (`:1217`) | **BLOQUEADO**: cada rol entrega artefacto + autoevaluación con nota y decisión; sin ella, REWORK. |
| Inflar el coste de una mejora asequible | §5.3 (`:548`), §7.8.4 (`:1004`) | **BLOQUEADO**: el coste declarado no vincula al supervisor; en duda se exige la mejora. |
| Estancar con reenvíos no admitidos o retiradas | §8.2.3 (`:1283`), §8.4 (`:1299`) | **BLOQUEADO**: la segunda retirada cuenta como ronda; el segundo reenvío no admitido consecutivo consume ronda y escala. |
| Aprobar por debajo de 90, con reservas, redondeo o N/A | P4, §5.4–§5.5, §6.5, §7.10, §9.13, §10.1 | **BLOQUEADO**: sin cambios y con los ejemplos corregidos. |
| Heredar PASS entre versiones | P19 restaurada, §7.10.4, §8.9.9, §8.10 | **BLOQUEADO**. |
| Orquestador por encima del supervisor / firma de Gate 5 | P17, Gate 5 (`:482`), §7.14 (`:1187`) | **BLOQUEADO**. |
| Evidencia declarada sin verificar | §7.6–§7.7, 100 % críticas + ≥ 50 % resto | **BLOQUEADO** en el prompt; **única grieta documental** en `LEEME.md:45` (RT-27), no en el cuerpo. |

## 18. Hallazgos nuevos de la FASE 3

#### RT-27 — [Med] `LEEME.md` declara una verificación del prompt integrado que todavía no se ha emitido

- **Ubicación:** `LEEME.md:45` («Dos supervisores independientes puntuaron cada sección **y el prompt integrado**…») frente a `EVIDENCIA.md:9` («pendiente de re-auditoría… y de los gates finales FG-A/FG-B»), `EVIDENCIA.md:73-74` (FG-A/FG-B «pendiente») y `lead-integrador.md:60` (se entrega a los gates).
- **Por qué es un fallo:** es una afirmación de verificación en pasado sobre el artefacto principal, cuando los gates finales aún no han puntuado el integrado. Si los gates pasan antes de publicar, pasa a ser cierta; **hasta entonces es evidencia declarada sin verificar**, exactamente lo que el BRIEF §2 prohíbe. No afecta a la ejecutabilidad del prompt, pero sí a la honestidad del paquete y a la coherencia con `EVIDENCIA.md`.
- **Arreglo:** reescribir «Dos supervisores independientes puntuaron cada sección; el prompt integrado se puntúa en FG-A/FG-B y el resultado se consolida en `EVIDENCIA.md` al cerrar los gates». Actualizar `EVIDENCIA.md` §4 (RT-22 será PARCIAL) y la línea 50 de la autoevaluación.

#### RT-28 — [Men] Identificadores y métricas del paquete desalineados

- **Ubicación:** `PROMPT…:3` («**Versión:** 1.0»), `LEEME.md:51` («**v1.0** — Primera versión aprobada») frente a `EVIDENCIA.md:6` («Versión de trabajo: 1.1») y `lead-integrador.md:1/5/60` (v1.1). Además, `EVIDENCIA.md:85` publica «51 tablas» cuando el recuento reproducible es **49**, y `EVIDENCIA.md:84` dice que el informe red-team tiene 353 líneas (hoy este informe supera las 480); los «183.820 caracteres» de `EVIDENCIA.md:6` solo cuadran como caracteres **sin saltos de línea** (185.652 − 1.832).
- **Por qué es un fallo:** la versión es el identificador de congelación; un prompt rotulado 1.0 con hash de 1.1 induce a error al enlazar PASS, EVIDENCIA y scorecards. Las cifras mecánicas mal contadas debilitan la evidencia del paquete aunque no afecten al contenido del prompt.
- **Arreglo:** cabecera «Versión: 1.1» y en LEEME «v1.0 — versión inicial; v1.1 — rework del red-team (26 hallazgos)»; en `EVIDENCIA.md:84-85` corregir a 49 tablas, actualizar las líneas del informe red-team y declarar la convención de caracteres (con o sin saltos). Mantener las mismas métricas/hash.

#### RT-29 — [Men] §5.8 es operativa en el fondo pero ambigua en la forma de puntuar y revisar

- **Ubicación:** `PROMPT…:688` («se puntúa con la rúbrica de §6…») y `:690` (columna «Comprobaciones mínimas (0–10)»), `:698-700` (reglas), `:1737` (el índice §11 solo lista §5.7 como informe de autoevaluación).
- **Por qué es un fallo:** (a) el encabezado «Comprobaciones mínimas (0–10)» puede leerse como 5 notas que sustituyen a los 10 criterios; (b) no se dice que se use la plantilla de §5.7 adaptada ni se añade §5.8 al índice §11; (c) §5.8.3 obliga a total ≥ 90,0, ningún criterio < 7,0 y ninguna mejora asequible, pero **no exige los criterios críticos ≥ 9,0** como D3, así que un rol podría presentar una autoevaluación con A1 = 8,0 y total 93 sin que §5.8 la bloquee; (d) el revisor (Anexo §5.8.2) no tiene formato de veredicto/registro definido. Nada de esto permite entregar por debajo de 90, pero deja la nueva regla a interpretación.
- **Arreglo:** renombrar la columna a «Evidencias mínimas (no son la nota)»; añadir «se puntúa con A1–A10 de §6 y la plantilla de §5.7 adaptada; esta tabla solo enumera la evidencia»; añadir «o un criterio crítico < 9,0» a §5.8.3; indicar que el revisor registra su veredicto (aceptado / REWORK) en el tablero; añadir §5.8 al índice §11.

#### RT-30 — [Men] Residuo de la corrección RT-02: el contrato y los cierres siguen diciendo Gate 2/3 y «se cierra con el Gate 5» para la verificación

- **Ubicación:** `PROMPT…:383` (contrato de tarea: «Gate aplicable | Gate 2 y Gate 3 de §4.10»), `:481` (Gate 4: verificación y auditoría «se abren con este gate y se cierran con el Gate 5»), `:436` (§4.7 igual), `:1618` (§10.1 igual).
- **Por qué es un fallo:** la tarea de verificación real se abre con **Gate 4** (no Gate 2) y se cierra con su **PASS de tarea antes** del Gate 5 (Gate 5 es la entrega/acta); la auditoría sí se cierra con Gate 5. La redacción actual puede llevar a registrar el gate equivocado en el contrato o a buscar un cierre inexistente. El ciclo ya no existe; es precisión documental.
- **Arreglo:** en el contrato, «Gate aplicable: Gate 2/3 (tareas de producto); la tarea de verificación: Gate 4 de apertura y su PASS de §7 antes del Gate 5». En Gate 4/§4.7/§10.1: «la verificación real se abre con el Gate 4 y se cierra con su PASS; la auditoría end-to-end se cierra con el Gate 5».

## 19. Veredicto final de la re-auditoría

| Nivel | Veredicto | Detalle |
|---|---|---|
| 26 hallazgos ronda 1 | **25 CERRADOS · 1 PARCIAL** | RT-22 (Menor): referencia externa `EVIDENCIA.md` en la cabecera del prompt. |
| **Cuerpo del prompt v1.1 (§1–§12)** | **ACEPTABLE** | 0 B, 0 M, 0 Med. 4 Menores: RT-22, RT-28, RT-29, RT-30. La prueba de mesa pasa y el anti-gaming queda cerrado. |
| **LEEME.md** | **DEFECTOS** | 1 Med (RT-27: verificación del integrado declarada antes de los gates) + 1 Men (RT-28, versión). |
| **Paquete v1.1 (prompt + LEEME + EVIDENCIA + autoeval)** | **DEFECTOS** | Por RT-27 [Med] y 4 Menores abiertos; no hay B/M. |

**Totales abiertos de la re-auditoría: B = 0 · M = 0 · Med = 1 · Men = 4.**

**Recomendación:** corregir RT-27 (una frase en `LEEME.md`) y, en el mismo paso, RT-28/RT-29/RT-30 y RT-22 (cuatro correcciones de una o dos líneas). Actualizar `EVIDENCIA.md` (§4: RT-22 PARCIAL; §5: red-team pendiente; línea 84: el informe red-team ya no tiene 353 líneas; declarar la convención de caracteres) y `lead-integrador.md:50`. Después, congelar el nuevo SHA-256 y ejecutar FG-A/FG-B: **no hay que reabrir ninguna sección ni reworkear mecanismos**. Si se corrige RT-27, el paquete pasa a ACEPTABLE con 4 Menores documentables (≤ 3 exigidos por el BRIEF §4: habrá que documentar/justificar el cuarto o corregirlo; recomiendo corregir los cuatro, son triviales).

**Firma:** `auditor-red-team` — 2026-10-23. `task-9` sigue abierta: no se cierra hasta que el Lead confirme la resolución de RT-27 y de los Menores, o su justificación, sobre una nueva versión congelada.

---

# FASE 4 — Verificación delta v1.2 y veredicto final

## 20. Versión auditada y método

| Dato | Valor verificado |
|---|---|
| `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` | **1.832 líneas · 189.489 bytes · SHA-256 `5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7`** |
| Caracteres | 186.154 con CRLF crudos; **184.322 normalizando CRLF→LF** (incluye saltos); **182.490 sin saltos**. `EVIDENCIA.md:7` y `lead-integrador.md:5` usan 184.322/182.490: la convención LF no se declara. |
| `LEEME.md` / `EVIDENCIA.md` / `lead-integrador.md` | 52 líneas · 4.638 B / 90 líneas · 8.286 B / 66 líneas · 5.474 B |
| Cambios declarados | Cabecera (`:3`), §4.4 (`:383`), §4.7 (`:436`), §4.10 (`:481`), §5.8 (`:690`, `:698-700`), §10.1 (`:1618`), LEEME (`:45`, `:51`), EVIDENCIA y autoevaluación. |

Se verificó el archivo real, no el mensaje del Lead. Se comprobaron las líneas del delta, el hash y las medidas, la coherencia del paquete, las 51 agrupaciones de tabla / 49 tablas markdown, las 32 cercas, las **71 referencias `§` únicas** (todas resueltas), la matriz R1–R8 (56 pares `§/P → línea` comprobados; 55 correctos y 1 falso positivo del validador: P19 está en `:123`), la aritmética y la prueba de mesa. No se generó ninguna web: BRIEF §6.11.

## 21. Estado delta de los hallazgos de FASE 3

| ID | Sev. | Estado | Evidencia real en v1.2 |
|---|---|---|---|
| RT-22 | Men | **CERRADO** | Cabecera (`:3`) ya no remite a `EVIDENCIA.md`; declara doble gate FG-A/FG-B y auditoría adversarial sobre esta versión. Observación opcional: Anexo D `:1817` sigue citando `EVIDENCIA.md` como ubicación de la matriz extensa; no es dependencia de ejecución. |
| RT-27 | Med | **CERRADO** | `LEEME.md:45` enumera las secciones puntuadas en pasado y deja el prompt integrado para FG-A/FG-B; coherente con `EVIDENCIA.md:9/73-74/80` y `lead-integrador.md:66`. |
| RT-28 | Men | **PARCIAL** | Siguen desalineadas las etiquetas: `PROMPT…:3` = **1.1**, `LEEME.md:51` = **v1.1**; `EVIDENCIA.md:6` = **1.2**, `lead-integrador.md:1` = **v1.2**. No afecta al contenido ni al SHA, pero debe declararse la relación (prompt v1.1 / revisión de evidencia 1.2) o unificar ambas etiquetas. |
| RT-29 | Men | **CERRADO** | §5.8 `:690` «Criterios A1–A10 de §6 (notas 0–10)»; `:698` plantilla §5.7 adaptada e índice §11; `:699` veredicto PASS/REWORK del revisor con registro obligatorio; `:700` críticos A1–A6 ≥ 9,0 (D3). Observación opcional: §11 `:1737` no lista una fila §5.8; se cubre indirectamente por la plantilla §5.7. |
| RT-30 | Men | **CERRADO** | Contrato `:383` diferencia Gate 4/PASS de la tarea de verificación; Gate 4 `:481`, §4.7 `:436` y §10.1 `:1618` separan «la verificación se cierra con su PASS» de «el Gate 5 cierra la entrega con el acta». Sin ambigüedad. |

**Hallazgos nuevos de la FASE 4:**

| ID | Sev. | Ubicación | Defecto | Arreglo |
|---|---|---|---|---|
| RT-31 | Men | `lead-integrador.md:44` | La suma de la autoevaluación no cuadra: 14×9,6 + 14×9,5 + 8×9,6 + 12×9,6 + 14×9,6 + 9×9,5 + 9×9,4 + 7×9,5 + 6×8,6 + 7×9,4 = **947,8 → 94,7**, pero publica 946,4 → 94,6. La decisión (ENTREGO) no cambia y sigue ≥ 90; el error es de aritmética/evidencia, no de umbral. | Corregir el total a 947,8 / 94,7 y recalcular la línea de decisión; el resto de la tabla no cambia. |
| RT-32 | Men | `EVIDENCIA.md:7`, `:20`, `:22`, `:80`, `:89`, `:90`; `lead-integrador.md:27` | Documentación mecánica desactualizada: (a) dice «70 referencias §» y hay **71** únicas (la nueva referencia a §11); (b) `EVIDENCIA.md:89` dice que el informe red-team tiene 486 líneas (esta FASE 4 lo deja en **550**); (c) `EVIDENCIA.md:20/22` habla de «2 rondas de red-team» cuando hay dos rondas más el delta; (d) la convención de caracteres (LF normalizado) no se declara; (e) `EVIDENCIA.md:80` apunta el delta del red-team a «§19» cuando ahora está en «§20–§23». No afecta al prompt. | Actualizar las cifras en `EVIDENCIA.md` y `lead-integrador.md:27`: 71 referencias, **550 líneas** del informe, «2 rondas + verificación delta», referencia a «§20–§23», y añadir «texto normalizado a LF (crudo con CRLF: 186.154)». |

**Totales abiertos de la FASE 4: B = 0 · M = 0 · Med = 0 · Men = 3** (RT-28 parcial, RT-31, RT-32). Cero B/M/Med nuevos.

## 22. Regresión, prueba de mesa y anti-gaming (v1.2)

- **Integridad:** hash, líneas y bytes coinciden con lo anunciado; 1.832 líneas se mantienen (solo cambios en línea); 32 cercas; 13 H1; 49 tablas markdown (42 en prosa + 7 en plantillas) = 51 agrupaciones de tabla, 0 filas con columnas incoherentes; 71 referencias `§` únicas, **0 rotas**; §2.1/§2.2 presentes y §2.3 = 0; P19 en `:123`; 0 `Lead`, 0 «verificador de producto», 0 notas de integración, 0 `TODO` reales, 0 emojis.
- **Mecanismos:** §4.4/§4.7/§4.10/§10.1 cierran el residuo de RT-30 sin ciclos; §5.8 incorpora plantilla, criterios A1–A10, críticos ≥ 9 y veredicto del revisor. Ningún cambio del delta toca los mecanismos de autoevaluación, supervisión, rondas, umbral, N/A o evidencia. Las secciones fuente no se han reabierto.
- **Matriz R1–R8:** las 8 filas de `EVIDENCIA.md:28-37` siguen apuntando a los encabezados correctos (los números de línea no se han movido); todas con ≥ 2 mecanismos (6–11 por requisito).
- **Aritmética:** rúbrica (100), ejemplos (91,0 / 88,7 / 90,0), Anexo A (91,75 → 91,7 y `(Σ)/10`), cadena de secciones (94,2 / 93,6 / 93,60 / 93,80) correctos. Solo falla la suma de la autoevaluación del integrador (RT-31: 947,8 → 94,7, no 946,4 → 94,6). La aritmética del prompt sigue intacta.
- **LEEME:** RT-27 corregido; reparto por rol (`:41`), entorno final (`:25`) y variables (`:29`) se mantienen; pendiente solo la etiqueta de versión (RT-28).
- **Prueba de mesa Fase 0→6:** sin cambios respecto a v1.1; el delta solo refuerza §5.8 y la precisión de gates. Gate 0 (criterio Lighthouse), Gate 1 (auditoría como gate), Gate 4 (sin ciclo), Fase 5 (PASS propio antes del Gate 5) y Gate 5 (firma del auditor) son ejecutables de principio a fin sin interpretación.
- **Anti-gaming:** los ataques de la FASE 3 siguen bloqueados; §5.8 ya exige A1–A10, críticos ≥ 9 y veredicto del revisor, de modo que el rol no puede autopresentarse una autoevaluación incompleta. No aparece ninguna vía nueva para entregar por debajo de 90 ni para disfrazar PASS/REWORK. Los tres defectos abiertos son documentales (aritmética de una autoevaluación, etiquetas y métricas de evidencia); no afectan al producto ni a los gates.
- **Observaciones no bloqueantes:** (a) Anexo D `:1817` cita `EVIDENCIA.md`; si se quiere autosuficiencia estricta, sustituir por «acta de auditoría»; (b) §11 no tiene fila §5.8 (se cubre vía §5.7); (c) si se corrige la etiqueta del prompt a 1.2, cambia el SHA y habrá que re-verificar el delta (es trivial), pero puede evitarse declarando «prompt v1.1 / revisión de evidencia 1.2» en EVIDENCIA/LEEME.

## 23. Veredicto final

| Nivel | Veredicto | Detalle |
|---|---|---|
| Ronda 1 (26 hallazgos) | **26 CERRADOS** | RT-22 cerrado en v1.2 (cabecera sin referencia externa). |
| Hallazgos FASE 3 (RT-27…RT-30) | **3 CERRADOS · 1 PARCIAL** | RT-27, RT-29 y RT-30 cerrados; RT-28 parcial (etiquetas de versión). |
| Hallazgos nuevos FASE 4 | **2 Menores** | RT-31 (aritmética de la autoevaluación), RT-32 (métricas de EVIDENCIA/autoeval). |
| **Prompt integrado v1.2, SHA `5BE0BB94…F1DA7`** | **ACEPTABLE** | **0 B · 0 M · 0 Med**. 3 Menores documentables: RT-28 parcial, RT-31, RT-32. Prueba de mesa y anti-gaming pasan. |
| **Paquete v1.2 (prompt + LEEME + EVIDENCIA + autoeval)** | **ACEPTABLE CON 3 MENORES** | El límite del BRIEF §4 para menores documentados es 3: se cumple. Recomendación firme: corregir los tres (son documentales y **no cambian el SHA del prompt** salvo que se toque la etiqueta del prompt) antes de los gates, para entregar con cero Menores. |

**Recomendación al Lead (para poder activar FG-A/FG-B ya):**
1. Resolver RT-28 **sin tocar el prompt**: en `EVIDENCIA.md:6` y `lead-integrador.md` declarar «Prompt v1.1 · revisión de evidencia 1.2», o añadir una nota equivalente en `LEEME.md`. Si preferís rotular el prompt como 1.2, será un cambio de contenido → nuevo SHA y re-verificación delta (rápida).
2. Corregir `lead-integrador.md:44` a **947,8 / 94,7** (RT-31).
3. Actualizar `EVIDENCIA.md` (`:7` convención LF; `:20/:22` dos rondas + delta; `:80` delta → §20–§23; `:89` 550 líneas del informe; `:90` 71 referencias) y `lead-integrador.md:27` (RT-32).

Con esos tres arreglos documentales (sin tocar el prompt), el paquete queda sin Menores abiertos y el SHA `5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7` es apto para los gates FG-A/FG-B. **No hay B/M/Med nuevos; el prompt es ACEPTABLE y puede activarse.** `task-9` puede cerrarse cuando el Lead confirme esta verificación delta (o tras aplicar y re-verificar los tres Menores documentales; si se toca el prompt, avisadme del nuevo SHA y verifico el delta).

**Firma final:** `auditor-red-team` — 2026-10-23. Verificación delta sobre la versión congelada `5BE0BB94…F1DA7`; sin defectos bloqueantes, mayores ni medios; 3 menores documentales abiertos.

---

# FASE 5 — Cierre de la auditoría (verificación documental y `task-9`)

## 24. Delta documental final verificado

El prompt **no ha cambiado ni un byte**: `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` sigue con 1.832 líneas, 189.489 bytes y SHA-256 `5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7`, idéntico al verificado en FASE 4.

Documentación corregida y comprobada sobre el archivo real:
- `EVIDENCIA.md` (93 líneas): §1 separa «Versión del prompt: 1.1 (sin cambios desde su congelación)» y «Revisión documental de evidencia: 1.2»; medidas con convención declarada («184.322 caracteres con LF normalizado; 186.154 en crudo con CRLF; 182.490 sin saltos de línea»); 71 referencias §; 550 líneas del informe red-team; «2 rondas + delta»; delta apuntado a §20–§23; RT-28/RT-31/RT-32 cerrados; red-team final ACEPTABLE (0 B/M/Med) sobre `5be0bb94…`.
- `autoevaluaciones/lead-integrador.md`: título y línea 5 con «prompt v1.1 · evidencia 1.2»; 947,8 → **94,7** y D1 94,7 (RT-31); 71 referencias, 49 tablas markdown / 51 agrupaciones (RT-32).
- `LEEME.md`: RT-27 corregido (`:45`); versión v1.1 (`:51`).
- Observación cosmética, no defecto: `lead-integrador.md:54` (M3) y `:66` (decisión) aún escriben «versión 1.2» al referirse a la evidencia; el título y la línea 5 ya fijan la identidad «prompt v1.1 · evidencia 1.2» y el SHA es inequívoco. Opcional: cambiar a «revisión de evidencia 1.2».

**Comprobaciones post-arreglo:** hash intacto; 32 cercas; 13 H1; 49 tablas markdown / 51 agrupaciones; 71 refs § únicas todas resueltas; matriz R1–R8 con líneas válidas; aritmética del prompt intacta; `lead-integrador` 947,8/94,7 correcto; 0 «Lead», 0 «verificador de producto», 0 notas de integración, 0 `TODO` reales, 0 emojis.

## 25. Veredicto final y cierre de `task-9`

| Nivel | Resultado |
|---|---|
| Ronda 1 (26 hallazgos) | **26/26 CERRADOS** |
| FASE 3 (RT-27…RT-30) | **4/4 CERRADOS** (RT-28 cerrado con el etiquetado prompt v1.1 / evidencia 1.2) |
| FASE 4 (RT-31, RT-32) | **2/2 CERRADOS** |
| Defectos abiertos | **B = 0 · M = 0 · Med = 0 · Men = 0** |
| **Prompt v1.1, SHA `5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7`** | **ACEPTABLE — congelado para FG-A/FG-B** |
| **Paquete (prompt v1.1 · revisión de evidencia 1.2)** | **ACEPTABLE — sin defectos B/M/Med ni Menores abiertos** |

**Conclusión:** la auditoría adversarial queda cerrada con el prompt ACEPTABLE, sin defectos abiertos, y el paquete documental coherente con el SHA congelado. Los gates FG-A/FG-B pueden ejecutarse sobre esta versión. Cualquier cambio posterior de bytes (incluida una etiqueta de versión en el prompt) invalida el SHA y exige nueva verificación delta (P19). Con esta FASE 5 se cierra `task-9`.

**Firma de cierre:** `auditor-red-team` — 2026-10-23. Veredicto FINAL: **ACEPTABLE** (0 B/M/Med/Men abiertos) para el prompt congelado `5BE0BB94EBC55AC14680C3A95B89654AED93752BB04B340B5B72AB4E8B4F1DA7`.
