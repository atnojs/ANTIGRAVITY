## 5. Fase 2 — Ejecución con autoevaluación

### 5.1 Principio y reglas de la fase

Producir el entregable no termina la tarea. Cada tarea delegada a un agente o subagente termina con tres piezas: (a) el entregable en su estado final, (b) un informe de autoevaluación completo (5.7) y (c) una decisión binaria ENTREGO / NO ENTREGO (5.4). La autoevaluación es la primera puerta de calidad: puede y debe impedir una entrega.

1. Se evalúa contra el contrato de la tarea (sección 4) y la rúbrica universal (sección 6), no contra la intención, el esfuerzo ni lo que el autor recuerda haber hecho.
2. Sin informe de autoevaluación no hay entrega: la tarea está incompleta aunque el entregable exista.
3. Un NO ENTREGO no es un final: se corrigen los defectos, se vuelve a verificar y se repite el ciclo interno de 5.3 hasta que la autoevaluación dé ENTREGO. La tarea no se abandona ni se entrega «como está».
4. La autoevaluación no aprueba: un ENTREGO propio es la condición para presentarse al gate de supervisión (sección 7), que se emite de forma independiente. Ningún agente se autosupervisa ni firma veredicto.
5. Todo lo afirmado en el informe debe poder reproducirlo un tercero usando solo el informe y el entregable. Lo que no se demuestra no se afirma.
6. Toda evidencia anterior a un cambio queda invalidada por ese cambio: el estado final se vuelve a verificar y se actualiza el informe.

### 5.2 Protocolo de autoevaluación en 7 pasos

Se ejecuta completo antes de declarar ENTREGO. Los pasos 2, 3 y 4 se repiten en bucle hasta agotar mejoras; los pasos 1, 5, 6 y 7 se rehacen si cambia algo.

| Paso | Qué se hace | Evidencia que deja |
|---|---|---|
| 1. Fijar el contrato | Releer el contrato de la tarea: objetivo, entregable, criterios de aceptación, dependencias, scope de escritura y evidencia exigida. Extraer los requisitos en una lista numerada. Anotar solo los supuestos autorizados en el contrato. | Lista de requisitos numerados, criterios de aceptación citados del contrato y supuestos declarados. |
| 2. Comprobar contra la realidad | Ejecutar, medir o abrir el entregable en el entorno donde se usará, no en el editor. Recolectar evidencia reproducible: comando y salida, petición y respuesta, ruta y fragmento, captura fechada posterior al último cambio. Separar lo verificado de lo no verificado. | Evidencias con ruta o comando y su resultado; lista explícita de lo que no se pudo verificar. |
| 3. Puntuar los 10 criterios | Puntuar de 0,0 hacia arriba con las anclas de 6.3 y 6.4: cada décima necesita evidencia. Marcar los criterios críticos y cualquier nota inferior a 7,0. Calcular el total según 6.5. | Tabla de 10 filas con nota, evidencia y cálculo del total. |
| 4. Agotar mejoras residuales | Listar toda mejora posible con severidad y coste (5.3). Corregir todo defecto bloqueante, mayor y medio, y toda mejora menor asequible. Volver al paso 2 para re-verificar y repetir hasta que no quede ninguna. | Registro de mejoras y changelog con estado (corregida, declarada, escalada) y evidencia de re-verificación. |
| 5. Autoexamen adversarial | Intentar refutar el propio informe como lo haría un supervisor hostil: reproducir cada afirmación desde el informe, buscar evidencias de una versión anterior, criterios reinterpretados, notas infladas, defectos disfrazados de menores y decisiones tomadas por cansancio. | Lista de ataques intentados y de cómo se resolvió cada uno. |
| 6. Decidir | Aplicar la regla de 5.4 sin matices ni excepciones. | Decisión ENTREGO o NO ENTREGO con su motivo en una línea. |
| 7. Publicar y avisar | Rellenar el informe de 5.7, actualizar el changelog, notificar al supervisor y mantener la tarea abierta hasta el veredicto de la sección 7. | Informe completo, changelog y aviso enviado; tarea en curso. |

### 5.3 Mejora residual: definición, severidades y regla de asequibilidad

**Mejora residual** es toda diferencia entre el entregable actual y el que un supervisor exigente consideraría listo, que no se ha corregido. Incluye requisitos sin cubrir, defectos, ambigüedades, riesgos, debilidades de evidencia y pulido visible. Una idea que amplía el alcance no es mejora residual: es propuesta; se registra y no se aplica sin autorización, y no cuenta como defecto.

| Severidad | Definición | Efecto en el gate |
|---|---|---|
| Bloqueante | Incumple un requisito del contrato o del encargo, contradice una decisión aprobada, crea riesgo de seguridad, privacidad o datos, usa evidencia falsa o ausente en una afirmación crítica, o el entregable no funciona donde se usará. | NO ENTREGO obligatorio. |
| Mayor | Requisito relevante incompleto o degradado, ambigüedad que obliga a interpretar el contrato, fallo en un caso de uso principal o verificación obligatoria no realizada. | NO ENTREGO obligatorio. |
| Medio | Defecto de uso acotado con solución evidente, caso secundario roto, inconsistencia perceptible o evidencia parcial en un punto no crítico. | NO ENTREGO obligatorio. |
| Menor | Estilo, documentación, pulido no observable en el uso previsto u optimización no exigida. | Admisible solo hasta 3 y con coste/beneficio justificado. |

**Regla de asequibilidad.** Una mejora es asequible cuando puede aplicarse y re-verificarse con un trabajo efectivo de 15 minutos o menos, sin dependencia externa, sin riesgo de regresión sobre lo ya verificado y con un beneficio observable o una reducción de riesgo demostrable. Toda mejora asequible se corrige antes de entregar y no se declara residual. Estimar su coste al alza para no hacerla es autoengaño (5.6).

**Qué puede sobrevivir como residual.** Únicamente mejoras de severidad menor, y solo si se cumple una de estas condiciones: el coste estimado supera el beneficio observable; depende de una decisión o un dato que el autor no puede tomar, en cuyo caso se escala en el informe; o es especulativa y no tiene impacto en el uso previsto. Cada residual se declara con: identificador, severidad, ubicación, descripción, coste estimado, beneficio esperado, motivo de no corregirla y quién podría decidirla. Máximo 3 por entrega.

**Bucle interno.** El ciclo 2 → 3 → 4 se repite hasta que no quede ningún defecto bloqueante, mayor o medio, ninguna mejora asequible y no más de 3 menores declaradas. Entregar antes de agotar el bucle es un NO ENTREGO anticipado.

**Registro de mejoras (changelog).** Una línea por mejora:

```text
[nivel] inventario o descripción breve — ubicación — estado: corregida | declarada | escalada — evidencia de re-verificación
```

### 5.4 Regla de decisión ENTREGO / NO ENTREGO

La decisión es binaria y no admite estados intermedios. **ENTREGO solo si se cumplen todas** las condiciones siguientes:

| ID | Condición |
|---|---|
| D1 | Total de la rúbrica truncado a un decimal ≥ 90,0. |
| D2 | Ninguna de las 10 notas es inferior a 7,0. |
| D3 | Todos los criterios críticos (A1–A6) tienen nota ≥ 9,0. |
| D4 | Cero defectos bloqueantes, mayores o medios abiertos. |
| D5 | Como máximo 3 mejoras menores declaradas, con coste/beneficio o dependencia externa justificados y sin ninguna mejora asequible pendiente. |
| D6 | Todas las afirmaciones críticas tienen evidencia reproducible del estado final del entregable. |
| D7 | El informe de 5.7 está completo, con las 10 filas puntuadas y la decisión explícita. |

Si falla una sola condición, la decisión es **NO ENTREGO** y el trabajo continúa. En ese caso:

1. Se corrigen las causas y se repite el bucle de 5.3.
2. Si no se puede corregir por falta de acceso, dato o decisión externa, se registra el bloqueo con su motivo y se escala según la sección 8. Nunca se disfraza de entrega.
3. Puede mostrarse al supervisor un borrador para revisión, pero no se declara terminado ni se presenta al usuario final como resultado.

Prohibiciones expresas: «entrego parcial», «entrego con reservas», «entrego y luego lo arreglo», «queda pendiente solo un detalle», «lo apruebo yo», «que lo valide el supervisor y ya». No existen. Un ENTREGO propio nunca equivale a una aprobación; el veredicto es del supervisor (sección 7).

El plazo, el cansancio, la dificultad técnica y el trabajo invertido no modifican D1–D7.

### 5.5 Regla del 90 % en la autoevaluación

1. **Umbral único.** La autoevaluación usa la misma fórmula, los mismos pesos, los mismos criterios críticos y el mismo umbral 90,0 que la supervisión, la auditoría y la entrega final. No hay versión blanda para autoevaluarse.
2. **No es orientativa.** Un total inferior a 90,0 significa que la tarea no está lista, aunque el autor considere que «casi» llega. Un 89,9 no es un aprobado.
3. **Truncado, nunca redondeo al alza.** El total se publica con un decimal truncado: un cálculo interno de 89,96 se publica como 89,9 y es NO ENTREGO. Un 90,0 exacto aprueba solo si además se cumplen D2–D7.
4. **Cálculo obligatorio.** El informe muestra el producto de cada nota por su peso y la suma; el supervisor lo recalcula. No se acepta un total sin desglose.
5. **Sin renormalizaciones.** No se pueden cambiar pesos, promediar criterios por igual, eliminar criterios, marcar N/A ni recalcular con otra fórmula para llegar al umbral.
6. **Nadie rebaja el umbral.** Ni el autor, ni el orquestador, ni el supervisor, ni el auditor pueden reducirlo, redondearlo, compensarlo entre niveles ni aprobar «con reservas». El suelo es 90,0 en autoevaluación, en supervisión de tarea, en auditoría global y en la entrega final.
7. **Calibración frente al supervisor.** Si la puntuación del supervisor difiere de la autoevaluación en más de 10,0 puntos, existe un defecto de calibración: se registra la diferencia, se identifica la causa y se corrige la forma de puntuar en la siguiente ronda. Inflar la nota y puntuar por debajo de lo que sostiene la evidencia son dos defectos de calibración, no una estrategia de prudencia.

### 5.6 Calibración y anti-autoengaño

La autoevaluación se hace contra la evidencia, no contra la reputación del propio trabajo.

**Técnica de puntuación.**
- Se puntúa de 0,0 hacia arriba: cada décima se añade cuando la evidencia sostiene el descriptor. No se empieza en 10 y se resta.
- Un criterio sin evidencia reproducible recibe 0,0, no un aprobado «porque parece bien». El 0,0 no es definitivo: se reúne la evidencia, se re-puntúa y se actualiza el informe; entregar con un 0,0 es imposible.
- El esfuerzo, el tiempo invertido, la dificultad y la cantidad de cambios no puntúan y no justifican ninguna nota.
- A5 no se autoconcede: su evidencia es el propio informe, contrastable por el supervisor; un sesgo detectado baja A5 en la re-puntuación.

**Jerarquía de evidencia.**

| Nivel | Tipo de evidencia | ¿Sostiene una nota? |
|---|---|---|
| 1 | Ejecución o medición real y reproducible en el entorno de uso (comando y salida, petición y respuesta, artefacto abierto y medido). | Sí, cualquier nota. |
| 2 | Inspección del artefacto final con ruta y fragmento concreto. | Sí, cuando el criterio es estático (contenido, configuración, estructura). |
| 3 | Captura o registro fechado posterior al último cambio, con contexto suficiente para localizarlo. | Sí, como apoyo; no sostiene por sí sola un crítico de comportamiento. |
| 4 | Declaración del autor sin artefacto que la respalde. | No. No es evidencia. |

**Señales de autoengaño y respuesta obligatoria.**

| Señal en el informe | Qué hace el autor |
|---|---|
| «Funciona» sin haberlo ejecutado | Ejecutarlo y adjuntar la salida real. |
| «Lo he revisado» sin fragmento ni medición | Mostrar la ruta y el fragmento concreto, o retirar la afirmación. |
| «Es menor» sobre un requisito del contrato | Reclasificarlo como bloqueante o mayor y corregirlo. |
| «En general cumple» o «lo doy por bueno» | Puntuar criterio a criterio con evidencia; no hay nota global por impresión. |
| «Lo dejo para otra ronda» sobre una mejora asequible | Corregirlo antes de entregar (5.3). |
| «Ya lo arreglará el rework» | El primer filtro es el autor: si es asequible, se corrige ahora. |
| «Nadie lo va a notar» | Declararlo: un defecto oculto cuesta más que uno declarado. |
| «Redondeando llego al 90» | El total se trunca; 89,96 es 89,9 y es NO ENTREGO. |
| «Ese criterio no aplica» | Aplicar la interpretación de 6.6. N/A no existe como puntuación. |
| «El supervisor tiene manía» | Reproducir la evidencia; si tiene razón, corregir; si no, rebatir con evidencia, sin subir la nota por orgullo. |

**Frases prohibidas en el informe:** «suficientemente bueno», «en general», «N/A», «no aplica», «debería funcionar», «lo he revisado», «es menor» sin clasificación, «pendiente para otra ronda», «aprobado con reservas», «al límite vale», «redondeando», «confío en que», «parece que». Si aparece la idea, se sustituye por evidencia o por NO ENTREGO.

**Regla de la duda.** Si el autor no está seguro de algo, lo declara como supuesto o duda en el informe y no puntúa por encima de lo que la evidencia demuestra; nunca lo maquilla. Un defecto declarado cuesta menos que uno oculto.

**Registro de calibración.** Tras cada veredicto del supervisor, el autor anota en su changelog la diferencia con la puntuación propia, la causa y la corrección aplicada. Las diferencias repetidas en la misma dirección indican un problema de calibración que debe corregirse, no compensarse.

### 5.7 Informe de autoevaluación (plantilla obligatoria)

Todos los campos son obligatorios. Los valores entre `< >` se sustituyen por contenido real; no se deja ninguno vacío.

```text
INFORME DE AUTOEVALUACIÓN
Tarea: <ID> — <título>
Autor: <rol o agente> | Iteración interna: <n> | Fecha y hora: <AAAA-MM-DD HH:MM>
Contrato de referencia: <objetivo, entregable y criterios de aceptación citados del contrato; requisitos numerados>
Artefactos entregados: <rutas o identificadores>

1. PUNTUACIÓN
| ID | Criterio | Peso | Crítico | Nota | Evidencia (ruta + fragmento o comando + salida) |
| A1 | Cobertura del contrato | 18 | Sí | <x,x> | <...> |
| A2 | Corrección funcional y técnica | 15 | Sí | <x,x> | <...> |
| A3 | Verificación real y evidencia reproducible | 13 | Sí | <x,x> | <...> |
| A4 | Reglas del encargo y del proyecto | 10 | Sí | <x,x> | <...> |
| A5 | Autoevaluación honesta y calibrada | 12 | Sí | <x,x> | <...> |
| A6 | Mejora residual agotada | 10 | Sí | <x,x> | <...> |
| A7 | Calidad del resultado para el usuario final | 8 | No | <x,x> | <...> |
| A8 | Robustez y seguridad | 6 | No | <x,x> | <...> |
| A9 | Evidencias, documentación y trazabilidad | 5 | No | <x,x> | <...> |
| A10 | Claridad, mantenibilidad y limpieza | 3 | No | <x,x> | <...> |
Total: Σ(nota × peso) = <n> → <total truncado a un decimal>

2. GATE
- D1 total ≥ 90,0: <sí/no> (<total>)
- D2 ninguna nota < 7,0: <sí/no> (<detalle>)
- D3 críticos A1–A6 ≥ 9,0: <sí/no> (<detalle>)
- D4 defectos B/M/Med abiertos: <0 o lista>
- D5 menores declaradas: <n>/3 con coste/beneficio: <justificación>
- D6 evidencia reproducible del estado final: <sí/no; lo que no se reproduce>
- D7 informe completo: <sí>

3. MEJORAS RESIDUALES
| ID | Severidad | Descripción | Ubicación | Coste estimado | Beneficio esperado | Motivo de no corregirla | Quién decide | Decisión (corregida / declarada / escalada) |
| <M1> | <menor> | <...> | <...> | <...> | <...> | <...> | <...> | <declarada / corregida / escalada> |
Si no hay ninguna, escribir: «Ninguna».

4. CAMBIOS DE ESTA ITERACIÓN
<qué se corrigió, dónde y con qué evidencia se re-verificó>

5. RIESGOS Y SUPUESTOS
<lista; todo lo no verificado se declara aquí>

6. DECISIÓN
ENTREGO | NO ENTREGO — <motivo en una línea>
Declaración: no hay evidencia inventada; todo lo afirmado se reproduce desde este informe y el entregable final.
```

Reglas del informe: se guarda junto al entregable en la ruta que fije el contrato y se versiona con el cambio; un informe genérico, copiado de otra tarea o sin desglose de cálculo es un defecto de proceso y equivale a NO ENTREGO.

## 6. Rúbrica universal y cálculo del 90 %

### 6.1 Uso y reglas fijas

Esta rúbrica mide cualquier tarea delegada —código, contenido, diseño, configuración, verificación o documentación— y también las dimensiones de la auditoría final.

1. Se puntúa el artefacto final verificable, no el proceso, ni la intención, ni el esfuerzo, ni la dificultad, ni el volumen de cambios.
2. Los 10 criterios se puntúan siempre y con la misma escala. Ningún criterio se omite, se anula, se marca N/A ni se sustituye por una impresión global; la interpretación por tipo de entregable está en 6.6.
3. Pesos y criticidad son fijos. No se cambian, no se renormalizan y no se crean rúbricas paralelas más blandas para urgencias.
4. La rúbrica solo define la medida. La independencia, el veredicto y el rework se rigen por la sección 7.
5. La misma rúbrica y el mismo umbral se aplican en autoevaluación, supervisión, auditoría global y entrega final.
6. Regla de hierro: si un criterio no se puede sostener con evidencia reproducible, su nota es 0,0. La evidencia se reúne y el criterio se re-puntúa; entregar con una nota 0,0 es imposible.

### 6.2 Criterios, pesos y criticidad

| ID | Criterio | Peso | Crítico | Qué mide |
|---|---|---|---|---|
| A1 | Cobertura del contrato | 18 | Sí | Todos los requisitos, entregables y criterios de aceptación del contrato están cubiertos, sin recortes ni añadidos fuera de alcance. |
| A2 | Corrección funcional y técnica | 15 | Sí | El entregable hace lo que declara, en el entorno real, sin errores ni atajos que oculten fallos. |
| A3 | Verificación real y evidencia reproducible | 13 | Sí | La verificación existió, se hizo sobre el estado final y otra persona puede reproducirla con el informe. |
| A4 | Reglas del encargo y del proyecto | 10 | Sí | Se respetan las reglas aplicables: idioma, alcance, seguridad, no secretos, un escritor por archivo y decisiones aprobadas. |
| A5 | Autoevaluación honesta y calibrada | 12 | Sí | El informe refleja la realidad, no infla ni oculta, y sus notas son defendibles con evidencia. |
| A6 | Mejora residual agotada | 10 | Sí | No quedan mejoras significativas ni asequibles; solo menores justificadas por coste/beneficio. |
| A7 | Calidad del resultado para el usuario final | 8 | No | El resultado es usable, claro, responsive y accesible cuando hay interfaz, y coherente con el diseño aprobado. |
| A8 | Robustez y seguridad | 6 | No | Estados vacío, carga, error y éxito; casos límite; entradas inválidas; degradación controlada; sin datos sensibles expuestos. |
| A9 | Evidencias, documentación y trazabilidad | 5 | No | Informe, changelog y rutas permiten auditar el trabajo sin preguntar al autor. |
| A10 | Claridad, mantenibilidad y limpieza | 3 | No | Nombres y estructura claros, sin código muerto, sin restos de pruebas ni archivos temporales. |

Verificación aritmética de los pesos: 18 + 15 + 13 + 10 + 12 + 10 + 8 + 6 + 5 + 3 = 100. Criterios críticos: A1–A6, con 78 de peso; no críticos: A7–A10, con 22.

A3 mide que la verificación se hizo y es reproducible; A9 mide que el informe y la trazabilidad permiten encontrarla y auditarla sin el autor. No son lo mismo y no se compensan.

### 6.3 Descriptores de nivel

| Nivel | Significado | Efecto en el gate |
|---|---|---|
| 10,0 | Excelencia demostrada: requisito cubierto y verificado con evidencia reproducible; no se identifica ninguna mejora con beneficio real dentro del alcance. | Apto. |
| 9,0 | Cumple íntegro y verificado; solo mejoras no significativas, declaradas. Es el mínimo de un criterio crítico. | Apto. |
| 8,0 | Cumple con un hueco menor no crítico o una evidencia indirecta. En un crítico ya no aprueba. | No apto en crítico; en no crítico obliga a compensar con otras notas. |
| 7,0 | Mínimo no crítico: debilidad documentada sin defecto B/M/Med abierto. | No apto si hay un defecto B/M/Med abierto o si el total no compensa. |
| 5,0 | Insuficiente: requisito central parcialmente cubierto, verificación débil o evidencia incompleta. | No apto. |
| 0,0 | Sin evidencia o requisito ausente o incumplido; incluye no poder demostrar lo afirmado. | No apto. |

Los valores 6,0–6,9 se usan para defectos peores que 7,0 pero aún por encima de 5,0; los valores 4,9–0,0, para defectos de 5,0 o peores. Las notas 8,x y 9,x se justifican con el descriptor inferior inmediato. Cualquier nota inferior a 7,0 bloquea la entrega aunque el total alcance 90,0; el umbral no rescata un criterio suspendido.

### 6.4 Anclas de evidencia por criterio

| ID | Exigencia para 9,0–10,0 | Qué fuerza una nota ≤ 6,0 |
|---|---|---|
| A1 | Checklist requisito → ubicación verificada al 100 % del contrato, sin añadidos fuera de alcance. | Un requisito del contrato sin cubrir o un entregable parcial presentado como completo. |
| A2 | Flujo principal y casos declarados ejecutados con salida real; sin errores relevantes en consola, red o servicio. | Falla un flujo principal, se oculta un error o se justifica con «no probado». |
| A3 | Evidencia reproducible por un tercero, del estado final y posterior al último cambio; 100 % de afirmaciones críticas comprobadas. | Evidencia declarada, captura de una versión anterior o «lo he comprobado» sin salida. |
| A4 | Reglas aplicables listadas y comprobadas una a una; alcance de escritura respetado; sin secretos. | Regla del proyecto incumplida o no comprobada, secreto en archivo o edición fuera de scope. |
| A5 | Informe completo, notas defendibles, sin inflación ni ocultación, dudas declaradas. | Informe genérico, nota sin evidencia o mejora asequible disfrazada de menor. |
| A6 | Mejoras agotadas; residuales ≤ 3, menores, con coste mayor que beneficio; ninguna asequible pendiente. | Queda un defecto B/M/Med o una mejora de 15 minutos o menos sin hacer. |
| A7 | Resultado usable a todos los anchos exigidos, sin desbordes ni recortes; foco visible, contraste y textos claros; coherencia visual. | Desborde, ilegibilidad o flujo confuso en un tamaño o contexto de uso. |
| A8 | Estados vacío, carga, error y éxito probados; entradas inválidas gestionadas; sin datos sensibles en registros. | Error no gestionado, pantalla bloqueada o dato sensible expuesto. |
| A9 | Informe, changelog, rutas y comandos suficientes para auditar sin preguntar; sin enlaces temporales. | Falta changelog, rutas ambiguas o evidencia no localizable. |
| A10 | Estructura y nombres claros; sin código muerto, duplicados ni restos de pruebas; comentarios útiles. | Código duplicado, restos de pruebas o nombres engañosos. |

### 6.5 Cálculo del total, truncado y umbral

Fórmula única:

```text
total = (A1 × 18 + A2 × 15 + A3 × 13 + A4 × 10 + A5 × 12 + A6 × 10 + A7 × 8 + A8 × 6 + A9 × 5 + A10 × 3) / 10
```

Procedimiento: (1) multiplicar cada nota por su peso; (2) sumar los 10 productos; (3) dividir entre 10; (4) truncar a un decimal, nunca redondear al alza; (5) comparar con 90,0. Cada nota se registra con un decimal entre 0,0 y 10,0; no se admiten notas con más precisión ni se redondean al alza.

Casos de referencia:
- Todas las notas 9,0: 900 / 10 = **90,0 exacto**. El umbral exige una media ponderada de 9,0 y no deja margen para defectos no declarados.
- Un 8,9 en A3 (peso 13): 900 − 1,3 = 898,7 → 89,87 → publicado 89,8 → NO ENTREGO (además A3 es crítico).
- Partiendo de todo 9,0, un 10,0 en A7 no rescata un 8,0 en A3: 900 + 8 − 13 = 895 → 89,5.
- Cálculo interno 89,96 → publicado 89,9 → NO ENTREGO. No existe el 90 por redondeo.
- 90,0 exacto aprueba solo si se cumplen D2–D7 de 5.4. La cifra es condición necesaria, no suficiente.

El umbral es el mismo en todos los niveles (autoevaluación, supervisión de tarea, auditoría global y entrega final). Ningún nivel usa pesos distintos ni otro denominador.

### 6.6 Interpretación por tipo de entregable (sin N/A)

| Tipo de entregable | A2, A3 y A7 se evalúan así | A4 y A8 se evalúan así |
|---|---|---|
| Interfaz web: página, componente o flujo | A2: flujo real en navegador; A3: evidencia de ejecución (consola, red, captura fechada); A7: usabilidad, responsive, accesibilidad y coherencia visual. | A4: reglas de estilo, alcance y no secretos; A8: estados, entradas inválidas, errores visibles y degradación. |
| Servicio o configuración: proxy, historial, scripts | A2: servicio ejecutado y respuesta correcta; A3: petición y respuesta reales; A7: calidad de la salida observable (mensajes, formato, estructura) y errores comprensibles. | A4: seguridad, claves fuera del cliente y alcance; A8: timeouts, entradas malformadas y filtrado de datos. |
| Datos y persistencia | A2: integridad y recuperación real; A3: evidencia de escritura, lectura y persistencia tras recarga; A7: claridad de la estructura y de los mensajes que la exponen. | A4: privacidad y reglas de datos; A8: corrupción, concurrencia, límites y borrado. |
| Contenido o documentación | A2: exactitud verificada contra la fuente; A3: muestra reproducible de afirmaciones; A7: claridad, estructura y utilidad para el lector. | A4: idioma, tono, alcance y derechos; A8: afirmaciones sin respaldo, ambigüedad y enlaces muertos. |
| Diseño o imagen | A2: requisitos técnicos (formato, proporción, resolución, legibilidad); A3: artefacto final abierto y comparado; A7: calidad visual y coherencia con la dirección aprobada. | A4: estilo, derechos de uso y texto; A8: textos ilegibles, recortes y artefactos. |
| Verificación o auditoría: el informe es el entregable | A2: método válido y aplicado; A3: evidencia citada y reproducible; A7: utilidad y claridad del informe. | A4: alcance y reglas; A8: conclusiones sin evidencia y fallos no detectados. |

Si ningún tipo encaja, el contrato de tarea está incompleto: se eleva a la sección 4 antes de puntuar. No se inventa una interpretación ni se marca N/A.

### 6.7 Ejemplos de puntuación límite

Los tres casos usan la rúbrica y la regla de decisión de 5.4. Las evidencias se resumen; en un informe real van con ruta o comando.

**Ejemplo 1 — NO ENTREGO por criterio crítico, con total por encima de 90.**

Tarea: «Sección de precios responsive».

| ID | Nota | Evidencia resumida |
|---|---|---|
| A1 | 9,5 | Checklist del contrato completa. |
| A2 | 9,0 | Flujo de compra probado en navegador. |
| A3 | 8,0 | Flujo verificado en Chromium; el estado de error de pago solo tiene evidencia indirecta porque el proveedor está en sandbox y no devuelve ese error. |
| A4 | 9,0 | Reglas de estilo y alcance respetadas. |
| A5 | 9,5 | Informe detallado; declara la debilidad de A3. |
| A6 | 9,0 | Sin mejoras asequibles: la comprobación pendiente depende del proveedor externo y queda escalada. |
| A7 | 10,0 | Sin desbordes a 360, 390, 768 y 1440; foco visible. |
| A8 | 9,0 | Estados de carga y error probados. |
| A9 | 9,0 | Rutas y comandos documentados. |
| A10 | 9,0 | Estructura limpia. |

Cálculo: (171 + 135 + 104 + 90 + 114 + 90 + 80 + 54 + 45 + 27) / 10 = 910 / 10 = **91,0** → truncado 91,0. Pero A3 es crítico con 8,0, incumple D3. **NO ENTREGO.** Lección: el total no rescata un crítico suspendido; una evidencia indirecta en un punto secundario basta para bajar un crítico por debajo de 9 y bloquear la entrega.

**Ejemplo 2 — NO ENTREGO por umbral y por mejora asequible pendiente.**

Tarea: «Página de contacto con formulario».

| ID | Nota | Evidencia resumida |
|---|---|---|
| A1 | 9,0 | Todos los requisitos cubiertos. |
| A2 | 9,0 | Envío y validación probados. |
| A3 | 9,0 | Salida real de consola y red del estado final. |
| A4 | 9,0 | Reglas y scope respetados. |
| A5 | 9,0 | Informe completo. |
| A6 | 8,5 | Mejora asequible pendiente: la desalineación se corrige en 5 minutos. |
| A7 | 8,0 | Etiquetas desalineadas en 390 px; el autor declara «alinear etiquetas, 5 minutos» como menor. |
| A8 | 9,0 | Estados y errores probados. |
| A9 | 9,0 | Trazabilidad completa. |
| A10 | 9,0 | Limpieza correcta. |

Cálculo: (162 + 135 + 117 + 90 + 108 + 85 + 64 + 54 + 45 + 27) / 10 = 887 / 10 = **88,7** → NO ENTREGO por D1, por D3 (A6 crítico con 8,5) y por D5: una mejora de 5 minutos es asequible y no puede quedar residual. Al corregirla, A6 sube a 9,0, A7 sube a 9,0 y el total queda en 900 / 10 = 90,0 exacto. Lección: «casi» no existe; la mejora barata se hace antes de puntuar, y si el cálculo interno hubiera dado 89,96 se publicaría 89,9, no 90,0.

**Ejemplo 3 — ENTREGO en el límite exacto.**

Tarea: «Proxy de generación de imágenes».

| ID | Nota | Evidencia resumida |
|---|---|---|
| A1 | 9,2 | Todos los requisitos cubiertos; sin añadidos fuera de alcance. |
| A2 | 9,0 | Petición real completada con respuesta válida. |
| A3 | 9,0 | Comando y salida del estado final, reproducibles. |
| A4 | 9,0 | Clave solo en servidor; alcance respetado. |
| A5 | 9,0 | Informe completo y calibrado. |
| A6 | 9,0 | Mejoras agotadas; 1 menor declarada. |
| A7 | 9,0 | Mensajes y errores comprensibles para el usuario. |
| A8 | 9,0 | Errores, timeouts y entradas inválidas gestionados. |
| A9 | 9,0 | Trazabilidad completa. |
| A10 | 7,8 | Funciones duplicadas en dos archivos; refactor estimado en 40 minutos, sin impacto observable ahora; declarado menor. |

Cálculo: (165,6 + 135 + 117 + 90 + 108 + 90 + 72 + 54 + 45 + 23,4) / 10 = 900,0 / 10 = **90,0 exacto**. D1–D7 se cumplen: A1–A6 ≥ 9,0; ninguna nota < 7,0; cero defectos abiertos; una menor declarada con coste 40 minutos (> 15) y beneficio no observable; evidencia del estado final completa. **ENTREGO.** Lección: el límite se aprueba exacto cuando todo lo demás está limpio; no hay colchón para un defecto no declarado.
