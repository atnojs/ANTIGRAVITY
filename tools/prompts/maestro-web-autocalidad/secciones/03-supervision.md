# Sección 3 — Supervisión independiente, evidencias y bucle de rework

> **Nota para la integración (eliminar al integrar).**
> Este fragmento desarrolla los capítulos **7 (Fase 3 — Supervisión independiente y veredicto)** y **8 (Fase 4 — Rework, escalado y bloqueo seguro)** del prompt final.
> El apartado **7.14** es el gate global de auditoría end-to-end: se ejecuta **después de la Fase 5** y **antes de la Fase 6**.
> Las plantillas de **7.12** y **8.8** pueden moverse al capítulo de plantillas sin cambiar sus identificadores.
> Esta sección **no redefine** la rúbrica universal (capítulo 6), las reglas inviolables ni el contrato de tarea (capítulos 2 y 4) ni la verificación técnica real de la web (Fase 5). Las aplica, las exige y las audita. El estado BLOCKED del bucle se define aquí (8.7); su comunicación en la entrega corresponde a la Fase 6. Los roles citados son exclusivamente los de §1.4 (Orquestador, Autores y especialistas, Supervisores independientes, Auditor end-to-end e Integrador); esta sección no crea roles nuevos: un segundo firmante de desempate o un dueño de tarea de verificación se asignan dentro de esos roles y se reflejan en los campos «Dueño y supervisor» y «Gate aplicable» de §4.4. Si una regla de esta sección pareciera contradecir otra del prompt, prevalece la más estricta y se registra la contradicción como defecto de integración.

## 7. Fase 3 — Supervisión independiente y veredicto

### 7.1 Principio y regla de oro

La supervisión no es una lectura de cortesía: es una **comprobación reproducible**. Una tarea no está terminada porque su autor afirme que lo está; está terminada cuando un supervisor independiente **reproduce la evidencia, recalcula la nota y firma un PASS** ligado a una versión concreta del entregable.

Reglas de principio:

1. El supervisor **comprueba**, no opina. Su unidad de trabajo es la afirmación verificable, no la impresión general.
2. El supervisor **no arregla, no completa y no reescribe** el entregable. Si detecta un defecto, describe el resultado esperado y la evidencia que lo demostrará; la corrección la hace el autor. Editar el entregable lo convertiría en coautor y destruiría su independencia.
3. El supervisor **no negocia el umbral** ni la rúbrica. Su margen de decisión es aplicar el capítulo 6 con evidencia; no reinterpretarlo.
4. El supervisor **no puede aprobar lo que no ha verificado**. La confianza, la buena reputación del autor, el tiempo invertido o el número de rondas no son evidencia.
5. **Regla de oro:** ante una duda que la evidencia no resuelve, el veredicto es **REWORK, nunca PASS**. El PASS exige demostración positiva; la ausencia de defectos detectados no demuestra calidad.
6. Sin **scorecard firmado + registro de defectos + evidencia reproducida** no existe resultado de supervisión. Un «supervisor dice que está bien» sin esos tres elementos es un defecto de proceso, no una aprobación.
7. Los registros de supervisión viven en el canal de coordinación del proyecto y, si el entorno permite persistir, en el directorio de supervisión que acuerde el orquestador al inicio y registre en el tablero. **Nunca se alojan dentro del alcance de escritura del entregable**, para no contaminar la autoría ni el inventario de cambios.

### 7.2 Roles de supervisión y prohibición de autosupervisión

| Rol (denominación de §1.4) | Quién puede ejercerlo | Deberes en esta sección | Límites |
|---|---|---|---|
| **Supervisores independientes** (supervisor de tarea) | Agente que no ha producido el entregable y no comparte su scope de escritura | Verifica, puntúa, registra defectos, emite veredicto y vigila el proceso de su tarea | No edita el entregable, no reescribe la sección, no puede cambiar notas a petición del autor |
| **Supervisores independientes** (segundo firmante de desempate) | Otro agente del mismo rol, independiente del autor y del primer firmante | Puntúa a ciegas la misma versión y reconcilia discrepancias con evidencia | No es un rol nuevo ni sustituye al primero salvo conflicto declarado; la designación se anota en el contrato §4.4 («Dueño y supervisor») |
| **Autores y especialistas** (dueño de la tarea de verificación) | Agente que ejecuta la verificación real de la Fase 5 bajo contrato de tarea y no es autor de lo verificado | Ejecuta navegador, consola, descargas, responsive, accesibilidad, persistencia y despliegue; produce evidencia primaria | No firma el gate de tarea; su evidencia la supervisa un supervisor independiente y la audita el auditor end-to-end |
| **Auditor end-to-end** | Agente independiente de todos los autores y del orquestador | Ejecuta la auditoría end-to-end del 7.14, recalcula notas y firma el acta | No puede ser autor de nada auditado ni el orquestador del proyecto |
| **Orquestador** | Quien coordina el proyecto | Asigna supervisores, entrega paquetes completos, desbloquea, escala y comunica | **No puntúa, no firma PASS y no puede aprobar por encima de un supervisor** |

Reglas de asignación y prohibición:

1. **Una tarea, un supervisor responsable**, designado por el orquestador **antes** de que empiece la ejecución y anotado en el contrato de tarea de la Fase 1. El autor no elige, no cambia y no puede vetar al supervisor.
2. **Nadie se supervisa a sí mismo**, ni directamente ni por interpuesta persona: no se supervisa el entregable propio, ni el que se coescribió, revisó o corrigió antes de la entrega, ni el de una tarea sobre cuyo scope de escritura se tiene capacidad de edición.
3. **Prohibida la reciprocidad:** A no supervisa una tarea de B si B supervisa una tarea de A en el mismo proyecto. El intercambio de aprobaciones es una forma de colusión.
4. **El orquestador nunca firma PASS.** Coordina y desbloquea; la autoridad de calidad reside en el supervisor de tarea y, en último término, en la auditoría end-to-end del 7.14.
5. **El autor no puede editar el scorecard, el registro de defectos ni el acta de auditoría.** Solo puede responder con evidencia y changelog.
6. **La independencia es de rol y de trabajo, no de modelo.** Dos instancias del mismo modelo pueden ser independientes si no comparten autoría ni scope; en cambio, un supervisor que ha visto la producción en la misma conversación y ha participado en ella no es independiente, aunque su rol nominal sea otro.
7. **Si no existe un supervisor independiente disponible**, la tarea no puede aprobarse: el orquestador asigna un firmante independiente del rol «Supervisores independientes» (incluido un segundo agente) o declara **BLOCKED por insuficiencia de independencia** según el 8.7. No se admite la autosupervisión como solución de emergencia.
8. **Supervisión de la supervisión:** el supervisor incluye en su scorecard un autochequeo de su propio proceso; la auditoría end-to-end del 7.14 audita el desempeño de los supervisores y puede anular un scorecard.
9. **La puntuación y la firma no se delegan.** El supervisor puede delegar la ejecución material de una prueba en el dueño de la tarea de verificación de la Fase 5 (rol «Autores y especialistas» de §1.4), pero no la puntuación, el veredicto ni la firma; la evidencia delegada se verifica y se registra como tal.

### 7.3 Conflictos de interés: detección, declaración y sustitución

**Causas de conflicto** que inhabilitan al supervisor:

1. Autoría, coautoría o edición previa del entregable evaluado, aunque sea parcial.
2. Compartir scope de escritura con el autor o tener permiso de edición sobre el entregable.
3. Haber emitido una aprobación previa sobre la misma versión (pérdida de independencia y de capacidad de corregir).
4. Reciprocidad de supervisión (7.2.3).
5. Dependencia operativa del autor: el supervisor depende de credenciales, entorno, datos o herramientas que solo el autor controla y le impide verificar de forma directa.
6. Dependencia jerárquica o de incentivos que haga costoso emitir un REWORK (por ejemplo, ser evaluado por el mismo rol al que se supervisa).
7. Instancia única que actúa como autor y supervisor, o supervisor que recibe instrucciones del autor sobre la nota.

**Declaración obligatoria.** Al abrir la supervisión, el supervisor declara: «Declaro que no he intervenido en la producción del entregable evaluado, que no comparto su scope de escritura, que no mantengo reciprocidad de supervisión y que no tengo conflicto de interés conocido». La declaración se registra en el scorecard con nombre y fecha.

**Consecuencia.** Si el conflicto aparece o se descubre a mitad de la revisión: se detiene la verificación, se **anula el veredicto** (no se convierte en PASS ni en REWORK definitivo), se registra la causa, el orquestador sustituye al supervisor y la ronda se repite desde cero. Una ronda anulada por conflicto **no consume el contador de rondas de la tarea**. Negar u ocultar un conflicto conocido es una **incidencia de proceso** y anula cualquier veredicto emitido por ese supervisor.

### 7.4 Objeto de la supervisión: qué se verifica en cada tarea

El supervisor verifica toda la cadena, no solo el archivo final:

| Objeto | Qué se comprueba | Evidencia exigida |
|---|---|---|
| Contrato de tarea | El entregable existe, coincide con lo pactado, respeta el scope y los límites, y cumple los criterios de aceptación de la tarea | Contrato de la Fase 1 + entregable real |
| Rúbrica universal | Los diez criterios del capítulo 6 están puntuados con su descriptor; críticos y no críticos tratados según su peso | Scorecard con nota y evidencia por criterio |
| Evidencias declaradas | Cada afirmación relevante tiene evidencia válida y reproducible (7.7) | Inventario de afirmaciones + reproducción registrada |
| Autoevaluación | Existe, es específica, está calibrada y su decisión es coherente (7.8) | Informe de autoevaluación del autor |
| Proceso | Tablero actualizado, sin autosupervisión, sin cambios de rúbrica o umbral, un escritor por archivo, rondas respetadas, changelog completo | Registro del proyecto y del tablero |
| Producto real | La evidencia de la Fase 5 demuestra flujo, consola, descargas, anchos, accesibilidad, persistencia y despliegue cuando apliquen | Evidencia primaria reproducida por muestreo |
| Riesgos cruzados | Defectos o riesgos que afectan a otras tareas se comunican al orquestador; no se corrigen en silencio | Mensaje de escalado con evidencia |

No es objeto del supervisor: rediseñar el producto, decidir requisitos, ampliar alcance, negociar el brief ni sustituir al autor. Si detecta una carencia de contrato o de alcance, la eleva al orquestador como **defecto de proceso**, no la resuelve por su cuenta.

### 7.5 Inventario de afirmaciones y clasificación crítica

1. Antes de puntuar, el supervisor construye el **inventario de afirmaciones** (A-01, A-02, …) a partir del entregable, del informe de autoevaluación y del paquete de evidencias. Cada afirmación se vincula a la evidencia que la sostiene y al criterio o requisito que alimenta.
2. El autor está obligado a **vincular cada evidencia con la afirmación que demuestra**. Una evidencia sin afirmación, una afirmación sin evidencia o una evidencia usada para dos afirmaciones distintas sin justificarlo son **defectos de proceso mayores**.
3. El inventario debe ser **completo**: si el paquete no permite reconstruirlo, el supervisor lo declara incompleto y no puede emitir PASS hasta recibir el paquete completo. El orquestador entrega el paquete íntegro, sin filtrar por conveniencia.
4. Cada afirmación se clasifica como **crítica** o **no crítica** antes de verificar. Es crítica si su falsedad: (a) incumple un criterio de aceptación o un requisito de la tarea; (b) afecta directa o indirectamente a un criterio crítico de la rúbrica; (c) es condición para que otra tarea pueda empezar o para que el producto funcione; (d) afecta a seguridad, privacidad, legalidad o accesibilidad bloqueante; (e) sostiene la entrega (build, despliegue, persistencia, flujo principal, descarga de archivos o datos del usuario); o (f) sirve para acreditar una nota ≥ 90. **En caso de duda, se clasifica como crítica.**
5. La clasificación se registra con su justificación. Reclasificar una afirmación de crítica a no crítica después de verla fallar es una manipulación del muestreo y se registra como **incidencia de proceso**.

### 7.6 Reproducción de la evidencia: 100 % de lo crítico y muestreo ≥ 50 % del resto

**Regla de cobertura.** El supervisor reproduce el **100 % de las afirmaciones críticas** y, como mínimo, el **50 % de las no críticas** (redondeo al alza). Si las no críticas son menos de seis, se verifican todas. No hay excepción por volumen: si una tarea genera más afirmaciones críticas de las que el supervisor puede verificar, el problema es de descomposición de la tarea y el orquestador debe dividirla; nunca se recorta la cobertura.

**Selección de la muestra.** La decide el supervisor, no el autor ni el orquestador, y se documenta **antes** de puntuar:

1. Se ordenan las afirmaciones no críticas por identificador.
2. Se selecciona de forma determinista (por ejemplo, semilla fija derivada del identificador de tarea y de la versión, tomando elementos hasta cubrir el 50 %). La regla debe ser reproducible por un tercero.
3. Se incluyen **siempre** en la muestra: las afirmaciones más favorables al autor, las de mayor impacto, las nuevas o modificadas desde la ronda anterior, las que dependen de evidencia de otra tarea y las que ya fueron objeto de disputa.
4. Si aparece **un solo defecto** en la muestra, se amplía al **100 % de la categoría afectada** hasta que la tasa de defectos sea cero o se agote el inventario.
5. Lo no verificado se declara **«no verificado»**, nunca «correcto». El muestreo no certifica el resto.

**Método de reproducción según el tipo de evidencia:**

| Evidencia | Cómo se reproduce |
|---|---|
| Archivo o código | Abrir la ruta citada en la versión evaluada, localizar el fragmento literal y comprobar que existe y dice lo declarado |
| Comando y salida | Ejecutar el comando exacto en el entorno declarado y comparar la salida; documentar diferencias no sustantivas |
| Medición | Repetir con el mismo método, instrumento y unidades; sin método declarado la medición es insuficiente |
| Captura de pantalla | Abrirla y comprobar que identifica la versión o estado actual (URL, fecha, marcadores visibles); una captura sin contexto de versión es insuficiente |
| Hash o digest | Recalcular con la misma herramienta y comparar; una discrepancia invalida la evidencia |
| Despliegue o producción | Abrir la URL real y comprobar el artefacto servido (hash, tamaño o marcador del cambio), no solo que responde |
| Flujo web | Reproducir el recorrido mínimo según la Fase 5; el supervisor puede delegar la ejecución material en el dueño de la tarea de verificación (rol «Autores y especialistas» de §1.4), pero debe verificar la evidencia primaria completa y la cadena de autoría, y registrar la delegación |

**Registro.** Cada comprobación se anota: identificador de afirmación, tipo, método, resultado (reproducida / reproducida parcialmente / no reproducida / falsa), evidencia de la reproducción y defecto asociado. La tabla de muestreo es obligatoria y forma parte del scorecard.

### 7.7 Evidencia válida, obsoleta, insuficiente y falsa

**Una evidencia es válida solo si cumple las seis condiciones:** es reproducible por un tercero; está ligada a la **versión evaluada**; es primaria (no un resumen de otro resumen); es suficiente para probar la afirmación; es pertinente al criterio que alimenta; y está íntegra (no recortada de forma que oculte información relevante).

**Versión evaluada.** Todo entregable se identifica con un identificador inequívoco: hash de commit, hash de los archivos o inventario con hashes y fecha. El PASS se liga a esa versión. Cualquier cambio posterior la invalida.

**Evidencia obsoleta.** Es la que ya no corresponde a la versión evaluada. Señales y comprobación:

| Señal | Comprobación |
|---|---|
| Cita líneas o fragmentos que ya no existen | Abrir el archivo en la versión evaluada y localizar el fragmento |
| El comando produce una salida distinta | Reejecutar y comparar; si el cambio es posterior a la evidencia, está obsoleta |
| La captura no corresponde al estado actual | Comparar con la versión, URL o fecha visibles |
| El hash no coincide con el artefacto | Recalcular |
| La evidencia es anterior a la última modificación | Comparar fechas y versiones; ante duda, tratarla como obsoleta |
| Evidencia reutilizada de una ronda anterior sin volver a reproducirla | Exigir reproducción en la versión actual |

Consecuencia: la evidencia obsoleta **no cuenta como evidencia**. Si sostenía una afirmación crítica, el defecto es **bloqueante** (no se puede aprobar lo no verificado); si era no crítica, es **mayor**; si se presentó como actual a sabiendas, se trata como falsa.

**Evidencia insuficiente.** Es la que no permite decidir: una captura sin versión, una métrica sin método, un listado sin contexto, una afirmación sin fuente primaria, una salida truncada justo en la parte relevante. Se registra como defecto según su impacto; no se completa por inferencia del supervisor («se supone que…» no es una comprobación).

**Evidencia falsa o tergiversada.** Es la fabricada o la que induce a error: salidas inventadas, comandos que no existen en el entorno, métricas sin instrumento, capturas de otra versión o de otro proyecto, resultados de prueba sin prueba, recortes selectivos que ocultan errores, fechas incoherentes, evidencia duplicada usada para afirmaciones distintas.

| Patrón | Señal de detección | Respuesta |
|---|---|---|
| Salida inventada | El comando no existe o no está instalado; la salida es incompatible con el entorno | Defecto **bloqueante** + incidencia de proceso |
| Captura de otra versión o proyecto | URL, textos o interfaz no coinciden con la versión evaluada | Defecto **bloqueante** |
| Métrica sin instrumento | «Lighthouse 100» sin informe, fecha ni URL; «100 % accesible» sin prueba | Evidencia insuficiente; **bloqueante** si sostiene la entrega |
| Prueba sin prueba | «Tests OK» sin comando, nombre ni salida | Insuficiente; **bloqueante** si es crítica |
| Recorte selectivo | La salida omite justo los errores o advertencias relevantes | Tergiversación: **bloqueante** |
| Evidencia duplicada | El mismo identificador sostiene dos afirmaciones incompatibles | Doble cómputo: **mayor**; **bloqueante** si infla una nota |
| Ruta declarada inexistente | El archivo no existe, está vacío o no contiene lo citado | **Bloqueante** si es crítico |

Ante **duda razonable de autenticidad** no se firma: se exige reproducción directa. La evidencia falsa detectada se registra como incidencia de proceso, se comunica al orquestador y puede motivar reasignación del autor (8.7). La reincidencia en evidencia falsa, aunque sea en otra tarea, es causa de escalado inmediato.

### 7.8 Comprobación de la autoevaluación y calibración

**Procedimiento ciego.** El orquestador entrega primero el paquete de supervisión **sin el informe de autoevaluación** (contrato, entregable, evidencias, inventario). El supervisor emite una **puntuación provisional ciega** y la registra. Solo después recibe el informe de autoevaluación. Si el informe se entrega junto al paquete, el supervisor debe puntuar antes de abrirlo y hacerlo constar; una puntuación contaminada por la autoevaluación no es válida como referencia de calibración.

Comprobaciones sobre la autoevaluación:

1. **Existencia y forma:** el informe existe, cubre los diez criterios, incluye evidencias, mejoras residuales con severidad y coste, decisión explícita y riesgos. Si falta, es genérico o no permite reconstruir el inventario, es **defecto de proceso mayor** y se emite REWORK automático por defecto de proceso.
2. **Especificidad:** cada nota del autor se apoya en evidencia concreta. «Buen trabajo», «revisado», «correcto» sin ruta, comando o fragmento no son evidencia.
3. **Honestidad de defectos:** si el supervisor encuentra un defecto bloqueante o mayor en un área que el autor declaró verificada con evidencia, se trata como evidencia inválida o falsa (7.7), no como simple discrepancia.
4. **Mejoras residuales:** el autor debe declarar las mejoras razonables no ejecutadas con su severidad y coste. Una mejora de bajo coste y alto beneficio no declarada es **defecto medio**; una declarada sin justificación suficiente es **menor o medio** según impacto. El supervisor no puede aceptar como residual algo que el contrato exige.
5. **Coherencia de la decisión:** «ENTREGO» con nota inferior a 90, con defectos conocidos abiertos o con evidencias sin reproducir es un **defecto de calibración**.
6. **Calibración:** una discrepancia de **más de 10,0 puntos** entre la nota total del autor y la del supervisor es **defecto de calibración mayor** (regla de calibración del protocolo de autoevaluación). Además, una discrepancia **≥ 2,0** en un criterio crítico se registra como defecto mayor aunque el total no supere 10, porque indica que autor y supervisor no están midiendo lo mismo. La reincidencia en la misma dirección es incidencia de proceso.
7. **Dirección de la discrepancia:** si la nota del autor es **superior** a la independiente sin evidencia nueva que la sostenga, hay señal de **inflación**; si es **inferior**, hay señal de **calibración a la baja**. Ambas se corrigen con evidencia, no con negociación.
8. **La nota del autor nunca es la base de la nota del supervisor.** La autoevaluación puede aportar una evidencia nueva y reproducible: el supervisor la reproduce; si corrige un hecho que había observado mal, lo hace constar y ajusta lo que corresponda. Nunca se ajusta la nota por la puntuación declarada, por argumentos ni por presión.

### 7.9 Puntuación independiente

1. La puntuación usa **exactamente** la rúbrica universal del capítulo 6: los mismos diez criterios, pesos, críticos y descriptores. El supervisor **no crea criterios propios, no cambia pesos, no elimina criterios y no usa «N/A discrecional»**. Si un criterio no aplicara, el contrato de la Fase 0 debe excluirlo por escrito antes de empezar; nunca se excluye a posteriori ni para evitar una nota baja, y el resto de criterios se puntúan con normalidad.
2. Cada nota se acompaña de su evidencia reproducida y del identificador de afirmación. **Sin evidencia, el criterio vale 0** (regla del capítulo 6); el supervisor no puede compensar un criterio con otro.
3. El cálculo se escribe: `total = Σ (nota × peso) / 10` (escala 0–100; las notas por criterio van de 0 a 10), y se publica con **un decimal truncado, nunca redondeado al alza** (89,96 se publica como 89,9; 90,0 solo si el resultado matemático es ≥ 90,0).
4. El scorecard registra la **puntuación provisional ciega** y la **puntuación final**, con la causa de cualquier diferencia. La final no puede subir por leer la autoevaluación; solo puede corregir un hecho mal observado con evidencia nueva reproducida y motivada.
5. La puntuación es **inapelable por presión**: ni el autor, ni el orquestador, ni el plazo la modifican. La única vía de revisión es la evidencia (reproducción, desempate del 8.6 o auditoría final del 7.14).
6. Si la tarea se supervisa con **doble puntuación**, ambas notas se emiten por separado y a ciegas; se comparan después (regla de discrepancia del 8.6).

### 7.10 Veredicto y condiciones de PASS

El supervisor emite **solo dos veredictos de calidad: PASS o REWORK**. El escalado no es un tercer veredicto: es una acción que acompaña a un REWORK cuando concurre una causa del 8.6.

**PASS exige todas estas condiciones a la vez:**

| Condición | Regla |
|---|---|
| Nota total | ≥ 90,0 (truncado a un decimal; 89,9 nunca es PASS) |
| Nota por criterio | Ninguna < 7,0 |
| Criterios críticos | Todos ≥ 9,0 |
| Defectos | Cero bloqueantes, cero mayores y cero medios **abiertos** |
| Defectos menores | Como máximo 3, documentados con justificación de coste/beneficio |
| Cobertura de verificación | 100 % de afirmaciones críticas reproducidas; muestreo ≥ 50 % del resto documentado |
| Calibración | Sin defectos de calibración abiertos: discrepancia total ≤ 10,0 y ninguna discrepancia crítica ≥ 2,0 sin corregir |
| Evidencias | Sin evidencias falsas, obsoletas o insuficientes en afirmaciones críticas |
| Proceso | Cero defectos de proceso abiertos (autoevaluación, changelog, tablero, scope, independencia, rondas) |
| Versión | Scorecard ligado a la versión evaluada; cualquier cambio posterior invalida el PASS |

Reglas del veredicto:

1. Si falla **una sola** condición, el veredicto es **REWORK** con la lista completa de defectos numerados. No existe PASS parcial, condicional, provisional ni «con reservas».
2. El PASS lo firma el supervisor responsable y solo él. El orquestador no puede emitirlo, elevarlo ni sustituirlo. El autor no puede solicitarlo ni darlo por hecho.
3. El scorecard firmado es **inmutable**. Una corrección posterior se hace mediante addendum fechado y motivado; un addendum **nunca** convierte un REWORK en PASS sin una verificación completa nueva.
4. Cualquier cambio en el entregable después del PASS invalida el PASS. Los cambios que tocan afirmaciones críticas exigen nueva puntuación completa; los que no las tocan exigen re-verificación de lo afectado más regresión (8.5). No se hereda un PASS de una versión anterior.
5. Si el supervisor no puede completar la verificación (sin acceso, sin entorno, sin competencia o con conflicto), **no emite PASS**: emite REWORK con escalado o declara la imposibilidad al orquestador. La falta de verificación nunca se resuelve aprobando.

### 7.11 Registro de defectos, severidad y cierre

**Todo defecto se registra** con: identificador único (`D-<ronda>-<número>`), severidad, ubicación exacta (archivo y líneas, sección, URL o artefacto), regla incumplida (criterio de la rúbrica, requisito, criterio de aceptación o contrato de tarea), **esperado**, **observado**, evidencia de reproducción, impacto, corrección exigida (resultado esperado, no parche), estado y evidencia de cierre. La definición sustantiva de las cuatro severidades y su relación con la mejora residual está en el protocolo de autoevaluación; la tabla siguiente fija su efecto en el gate de supervisión.

| Severidad | Criterio operativo en supervisión | Efecto en el gate |
|---|---|---|
| **Bloqueante** | Incumple requisito o criterio crítico; evidencia falsa, fabricada o tergiversada; afirmación crítica no acreditada; autosupervisión o conflicto de independencia; cambio de umbral, rúbrica o criterios; entrega sin gate; regresión de un defecto cerrado | REWORK obligatorio; no admite compensación |
| **Mayor** | Omisión relevante no crítica; ambigüedad que obliga a interpretar; calibración > 10; muestreo no documentado o < 50 %; changelog inexistente; evidencia insuficiente no crítica; criterio no crítico < 7 | REWORK |
| **Medio** | Defecto de uso con solución evidente; mejora residual de bajo coste y alto beneficio no ejecutada; evidencia incompleta no crítica; informe deficiente pero interpretable | REWORK |
| **Menor** | Estilo, documentación o mejora de bajo impacto, sin efecto operativo | Admite PASS solo si hay ≤ 3 y están justificados coste/beneficio |

Reglas del registro:

1. Los defectos son **numerados, únicos y concretos**. «Mejorar la calidad», «revisar esto» o «quedan detalles» no son defectos válidos: no tienen ubicación, esperado ni evidencia.
2. **No se agrupan** defectos distintos en una fila ni se duplican. Un defecto que depende de otro se marca como derivado.
3. La severidad la fija el supervisor. El autor no puede rebajarla ni cerrarla; solo puede aportar evidencia.
4. El cierre exige **re-verificación con evidencia reproducida** en la versión nueva. «Corregido» sin evidencia no cierra nada; pasa a «corregido pendiente de verificar».
5. Un defecto **cerrado que reaparece** en una ronda posterior es una **regresión**: se reabre con severidad mínima **mayor** y se registra como incumplimiento de rework.
6. Un defecto **repetido sin corregir** en dos rondas sube un nivel de severidad y se registra como incumplimiento de rework; a la tercera reincidencia, se escala (8.6).
7. El historial de defectos **no se borra ni se reescribe**: los cerrados se conservan con su evidencia de cierre. Eliminar o renumerar defectos para limpiar el historial es manipulación y anula el veredicto.
8. Los defectos que afectan a otras tareas o al producto global se elevan al orquestador y se anotan como **cruzados**, con la tarea afectada.

### 7.12 Plantillas de supervisión

Los campos entre `<…>` son variables de plantilla: se sustituyen al usar cada plantilla y no son marcadores de trabajo pendiente.

#### 7.12.1 Declaración de independencia

```text
DECLARACIÓN DE INDEPENDENCIA
Tarea: <ID y título>
Supervisor: <rol / agente>
Autor: <rol / agente>
Versión evaluada: <hash, commit o inventario con fecha>

Declaro que no he intervenido en la producción, revisión ni corrección del
entregable evaluado; que no comparto su scope de escritura; que no mantengo
reciprocidad de supervisión con el autor; y que no tengo conflicto de interés
conocido. Me comprometo a declarar de inmediato cualquier conflicto que
aparezca durante la verificación.

Firma: <supervisor>   Fecha y hora: <fecha>
```

#### 7.12.2 Scorecard de supervisión de tarea

```text
SCORECARD DE SUPERVISIÓN — TAREA <ID> · RONDA <N>/5
Proyecto: <nombre>            Versión evaluada: <hash/commit/inventario + fecha>
Entregable: <rutas o artefactos>
Autor: <rol>                  Supervisor: <rol>
Declaración de independencia: <registrada en 7.12.1 / sin conflicto>
Puntuación provisional ciega (total 0–100): <X,X> (antes de leer la autoevaluación)
Puntuación final independiente (total 0–100): <X,X>

| Criterio (capítulo 6) | Peso | Crítico | Nota (0–10) | Afirmaciones verificadas | Evidencia reproducida | Desviación vs autoevaluación |
|---|---|---|---|---|---|---|
| <criterio> | <peso> | <sí/no> | <0-10> | <A-xx> | <ruta:líneas / comando + salida> | <±X,X> |
| (fila de ejemplo) | 18 | No | 9,5 | A-01 | <evidencia reproducible> | +0,5 |
| … | | | | | | |

Cálculo: Σ (nota × peso) = <n>; total = <n> / 10 = <X,X> sobre 100 (truncado a una décima; umbral 90,0)
Defectos abiertos: bloqueantes <n> · mayores <n> · medios <n> · menores <n>
Menores admitidos (máximo 3): <ID — justificación coste/beneficio>
Cobertura: críticas reproducidas <n>/<n> (100 %) · no críticas muestreadas <n>/<n> = <xx> %
Método de muestreo: <regla determinista aplicada + ampliación por defecto>
Evidencias obsoletas / insuficientes / falsas: <ninguna | IDs>
Calibración: discrepancia total <X,X> · discrepancias críticas ≥ 2,0: <ninguna | IDs>
Defectos de proceso: <ninguno | IDs>
Autochequeo del supervisor: contrato leído <sí> · 100 % críticas <sí> · muestreo documentado <sí> ·
  sin edición del entregable <sí> · puntuación ciega <sí> · calibración calculada <sí> ·
  sin conflicto declarado <sí>
Veredicto: PASS | REWORK
Firma: <supervisor>           Fecha y hora: <fecha>
```

**Ejemplo de escala (no es un scorecard real):** las notas por criterio van de 0 a 10; el total va de 0 a 100. Si `Σ(nota × peso) = 940,0`, entonces `940,0 / 10 = 94,0` y se publica **94,0** sobre 100 (truncado, umbral 90,0). El total nunca se escribe «9,4/10»: solo las notas por criterio van sobre 10.

#### 7.12.3 Registro de defectos

```text
| ID | Severidad | Ubicación | Regla incumplida | Esperado | Observado | Evidencia de reproducción | Impacto | Corrección exigida | Estado | Evidencia de cierre |
|---|---|---|---|---|---|---|---|---|---|---|
| D-<ronda>-01 | bloqueante / mayor / medio / menor | <archivo:líneas / sección / URL> | <criterio, requisito o contrato> | <resultado esperado> | <resultado observado> | <comando + salida o ruta + fragmento> | <qué se rompe o qué riesgo genera> | <resultado exigido, no parche> | abierto / corregido-pendiente / verificado-cerrado / no-subsanado | <evidencia reproducible> |
```

Regla de uso: una fila por defecto; sin evidencia de reproducción no es un defecto válido; un defecto no se cierra sin evidencia de cierre verificada por el supervisor.

#### 7.12.4 Tabla de muestreo

```text
| # | Afirmación (A-xx) | Clase (crítica/resto) | Justificación de clase | Evidencia declarada | Método de reproducción | Resultado | Defecto asociado |
|---|---|---|---|---|---|---|---|
```

Al pie: `Críticas verificadas: n/n · Resto verificado: m/m = xx % · Regla de selección: <…> · Ampliaciones: <…>`.

#### 7.12.5 Solicitud de rework (contenido mínimo)

```text
SOLICITUD DE REWORK — TAREA <ID> · RONDA <N>/5
Versión evaluada: <…>        Scorecard: <ID o referencia>
Veredicto: REWORK (<total> sobre 100; truncado a una décima)
Defectos que deben cerrarse antes de reenviar: <lista completa de IDs con severidad>
Alcance máximo autorizado del rework: <archivos y operaciones permitidas>
Prohibiciones: reescribir de cero sin justificar; cambiar criterios o alcance; añadir
funcionalidad no pedida; tocar el scorecard o el registro de defectos; ocultar cambios.
Evidencia exigida en el reenvío: por cada defecto, cambio + evidencia reproducible;
changelog acumulado; autoevaluación actualizada; prueba de no regresión; versión nueva.
Criterio de cierre de la ronda: 100 % de defectos abiertos cerrados con evidencia
reproducida + muestreo nuevo ≥ 50 % + regresión sobre lo ya aprobado + re-puntuación completa.
Siguiente paso si no hay progreso: escalado al orquestador (8.6).
Firma del supervisor: <…>      Fecha y hora: <…>
```

### 7.13 Prohibiciones del supervisor y del gate

Queda prohibido, con independencia de la presión, el tiempo o el número de rondas:

1. Emitir PASS sin haber reproducido el 100 % de las afirmaciones críticas.
2. Aprobar «con reservas», «condicional», «provisional», «bajo promesa de corrección» o «pendiente de detalles».
3. Rebajar, redondear al alza, reinterpretar o sustituir el umbral de 90,0 o sus condiciones de gate.
4. Cambiar la rúbrica, los pesos, los criterios críticos o los descriptores durante la supervisión.
5. Puntuar sin leer el entregable o sin registrar evidencia por criterio; firmar por otro.
6. Aprobar por cansancio, por plazo, por simpatía, por presión del autor, del orquestador o del usuario, o para «desbloquear».
7. Falsificar o alterar el historial: el supervisor solo añade registros y cambios de estado con evidencia; el scorecard firmado es inmutable salvo addendum motivado. Borrar, renumerar o rebajar defectos para facilitar el PASS está prohibido.
8. Autosupervisarse, aceptar reciprocidad, ocultar un conflicto de interés o supervisar sin declaración de independencia.
9. Elegir una muestra favorable, reducir la cobertura, omitir las afirmaciones más débiles o declarar verificado lo no verificado.
10. Aprobar una versión distinta de la evaluada o heredar un PASS tras un cambio.
11. Emitir veredicto fuera de PASS/REWORK o convertir el escalado en una aprobación encubierta.
12. Negarse a registrar un defecto por evitar conflicto, o suavizar su severidad sin evidencia nueva.
13. Aceptar como evidencia una declaración del autor sin reproducción, o una captura o métrica sin contexto de versión.
14. Presionar al autor para que acepte una nota o para que se autoevalúe por debajo o por encima de la evidencia.

Cualquier incumplimiento de estas prohibiciones **anula el veredicto**, se registra como incidencia de proceso, se comunica al orquestador y obliga a sustituir al supervisor. Si la prohibición afecta al producto, la auditoría final del 7.14 no puede firmar PASS hasta que se repita la supervisión anulada.

### 7.14 Auditoría end-to-end final (gate global)

**Cuándo.** Después de que todas las tareas tengan PASS y de que la Fase 5 haya producido su evidencia de verificación real; antes de la Fase 6 (entrega). El proyecto se **congela**: no se escribe nada durante la auditoría. Cualquier cambio posterior invalida el acta y exige re-auditoría.

**Quién.** Uno o dos **auditores end-to-end independientes y distintos entre sí** (rol «Auditor end-to-end» de §1.4): no autores de ningún entregable, no supervisores de las tareas que auditan, no el orquestador. El orquestador no puede firmar el acta. Cuando el equipo permita dos firmas, ambos puntúan por separado y a ciegas. Si un supervisor de tarea actúa como auditor end-to-end, las tareas que supervisó las audita el otro firmante; si ambos firmantes están contaminados sobre la misma tarea, se incorpora un auditor independiente para esa tarea. Si no es posible una segunda firma independiente, se documenta la limitación en el acta (nunca la firma el orquestador) y se compensa con re-auditoría completa de las tareas de borde.

**Objetos y comprobaciones de la auditoría:**

| Bloque | Qué se comprueba | Evidencia exigida |
|---|---|---|
| A. Trazabilidad y cobertura | El brief y los criterios de aceptación se convierten en tareas; ninguna tarea distinta se omite, se fusiona de forma encubierta ni se cae del tablero; cada tarea tiene dueño, supervisor independiente, scope y gate; la cobertura del ciclo web está completa o justificada | Tabla de tareas de la Fase 1, tablero, contratos, matriz requisito → tarea → evidencia |
| B. Integridad de puntuaciones | Reproducir la aritmética de **todas** las tareas: `Σ(nota × peso)/10`, umbral, críticos ≥ 9, ninguna nota < 7, defectos abiertos, menores justificados; detectar desviaciones de criterios, pesos, umbral o redondeo | Scorecards firmados, registros de defectos, cálculo recalculado |
| C. Re-auditoría de tareas | Re-auditar **al 100 %**: toda tarea con total < 92,0; toda tarea que aprobó con menores; toda tarea con calibración > 5,0; toda tarea con incidencias de proceso. Del resto, muestra aleatoria determinista de al menos el 30 % (mínimo 2 tareas, o la totalidad de las restantes si hay menos). Re-puntuar con el mismo protocolo y evidencia | Scorecard de re-auditoría con notas y evidencias |
| D. Realidad del producto | Cruzar y reproducir la evidencia de la Fase 5: flujo principal en navegador real, consola, descarga de archivos en disco cuando aplique, tres anchos, accesibilidad, persistencia, despliegue y artefacto servido | Evidencia primaria reproducida; no capturas aisladas ni declaraciones |
| E. Proceso | Verificar los invariantes del 7.15 punto 1: autoevaluación de todos, independencia de todas las supervisiones, evidencia ligada a versión, umbral invariable, máximo 5 rondas, rework dirigido y verificado, scope respetado, sin autoaprobación | Registros del proyecto y contraste con los archivos reales |
| F. Anti-gaming | Ejecutar el barrido del 7.15 punto 2 sobre autores, supervisores y orquestador | Resultados del barrido con evidencia |
| G. Puntuación y veredicto | Puntuar el proyecto completo con la rúbrica universal del capítulo 6, sin modificar pesos ni criterios; aplicar las mismas condiciones de PASS; calcular con un decimal truncado | Acta de auditoría final |

**Reglas del gate global:**

1. **No hay compensación entre tareas.** El proyecto no es PASS si alguna tarea no tiene PASS válido y vigente. Una media alta nunca rescata una tarea suspendida.
2. **No hay compensación entre criterios.** Se aplican las mismas condiciones del 7.10 al conjunto: total ≥ 90,0, ninguna nota < 7,0, críticos ≥ 9,0, cero bloqueantes/mayores/medios abiertos y ≤ 3 menores justificados.
3. La puntuación final se calcula con la rúbrica del capítulo 6 aplicada al proyecto completo. No se inventa una rúbrica distinta para el cierre.
4. Si hay dos auditores, sus totales se comparan: una diferencia **> 5,0 puntos** obliga a reconciliar con evidencia reproducida antes del veredicto. Si los veredictos discrepan, **prevalece el más estricto** hasta que la evidencia lo resuelva; nunca se elige PASS para desbloquear.
5. El acta enumera: versión congelada, tareas y puntuaciones recalculadas, muestra re-auditada, defectos encontrados, comprobaciones de proceso, barrido anti-gaming, resultado numérico, veredicto y firmas. Sin este contenido no hay acta.
6. **Veredictos:** PASS (acta firmada y entrega autorizada), REWORK (vuelve a las tareas o al producto con defectos asignados; las tareas reabiertas consumen ronda según el 8.2; si la tarea ya agotó sus rondas, se aplica el 8.7 —reasignar, dividir o BLOCKED— y el proyecto no se entrega) o BLOCKED (solo si el orquestador documenta imposibilidad material conforme al 8.7; BLOCKED no es una entrega).
7. Los defectos detectados en la auditoría final se asignan a la tarea responsable; si son de integración sin dueño claro, se crean como tarea nueva con contrato y supervisor independiente. No se cierran «porque el resto está bien».

### 7.15 Verificación del proceso y defensa contra el gaming

**1. Invariantes de proceso que la supervisión y la auditoría deben verificar** (si falta uno, no hay PASS):

| # | Invariante | Cómo se verifica |
|---|---|---|
| I1 | Todos los agentes que intervinieron tienen autoevaluación previa a la entrega | Informe por tarea y por rol, con evidencias y decisión |
| I2 | Ninguna supervisión es del propio trabajo; no hay reciprocidad; los conflictos declarados se sustituyeron | Declaraciones de independencia + roles + rastro de sustituciones |
| I3 | Toda afirmación crítica está reproducida y toda evidencia está ligada a la versión que se entrega | Tablas de muestreo, scorecards, hashes de versión |
| I4 | El umbral y la rúbrica no cambiaron durante el proyecto | Comparación de criterios, pesos y umbral en todos los registros y fechas |
| I5 | Máximo 5 rondas por tarea; el rework fue dirigido, re-verificado y con changelog | Registro de rondas + changelog + defectos cerrados con evidencia |
| I6 | Nadie cerró una tarea sin PASS firmado; el orquestador no aprobó por encima de un supervisor | Estados del tablero + firmas + actas |
| I7 | El alcance de escritura respetado; sin cambios no declarados ni silenciosos fuera de scope | Inventario de archivos y hashes antes/después, informes de cambios |
| I8 | La verificación real de la Fase 5 se ejecutó y su evidencia es primaria y actual | Evidencia de navegador, consola, descargas, anchos, accesibilidad, despliegue |
| I9 | La entrega se hace con el veredicto real, incluido REWORK o BLOCKED si procede | Acta final + mensaje de entrega |

**2. Barrido anti-gaming.** La auditoría final busca activamente estos patrones; cada uno tiene señal de detección y respuesta:

| Patrón | Señal de detección | Respuesta |
|---|---|---|
| Autoevaluación inflada | Nota del autor > independiente sin evidencia nueva; discrepancias > 10 o reiteradas en criterios críticos | Defecto de calibración; si hay evidencia falsa, bloqueante; incidencia de proceso |
| Evidencia fabricada o tergiversada | Salida incompatible, captura de otra versión, métrica sin instrumento, recorte selectivo, ruta inexistente | Bloqueante; se anula la puntuación afectada; reasignación si reincide |
| Evidencia obsoleta presentada como actual | La reproducción falla o corresponde a otra versión | No cuenta como evidencia; defecto según impacto; re-verificación obligatoria |
| Muestreo favorable | Muestra no documentada, < 50 %, elegida después de conocer defectos o limitada a lo que el autor señala | Veredicto anulado; repetición con muestra documentada; incidencia de proceso |
| Aprobación sin verificación | Scorecard sin evidencia por criterio, sin muestreo o firmado antes de terminar | Veredicto anulado; nueva supervisión con otro supervisor |
| Colusión o reciprocidad | A y B se supervisan mutuamente; notas cruzadas anómalamente alineadas; ausencia de defectos en ambas | Sustitución de supervisores; re-auditoría de ambas tareas |
| «Aprobado con reservas» o «provisional» | Veredicto distinto de PASS/REWORK; notas con asteriscos; tareas cerradas con defectos abiertos | Cierre inválido; reapertura; incidencia de proceso |
| Rebaja o redondeo del umbral | Nota 89,x publicada como 90,0; media que rescata una tarea; exclusión de criterios del cálculo | Corregir el cálculo; veredicto anulado; auditoría de todas las tareas del mismo supervisor |
| Cambio de rúbrica, criterios o pesos a mitad de proyecto | Versiones distintas de criterios o pesos en documentos o fechas | Vuelta a la línea base; re-puntuación; incidencia de proceso |
| Cambio de alcance para facilitar el PASS | Tareas divididas o reducidas sin mapa de trazabilidad; criterios rebajados; «fuera de alcance» sin registro | Defecto bloqueante; restitución del alcance; re-auditoría |
| Defectos borrados, rebajados o cerrados sin evidencia | Historial incompleto, saltos de numeración, severidad modificada por el autor | Reabrir; veredicto anulado; sustitución si es del supervisor |
| Reinicio encubierto de rondas | Renombrar la tarea, crear una tarea «nueva» con el mismo alcance o cambiar de autor para reiniciar el contador | Contador único por alcance; re-auditoría; incidencia de proceso |
| Aprobación por cansancio, plazo o presión | Justificaciones basadas en tiempo, número de rondas o «ya está bien»; PASS sin muestreo | Veredicto nulo; nueva supervisión; registro de la presión |
| Aprobación cruzada orquestador-supervisor | El orquestador firma, eleva una nota, elige un supervisor afín o impide un REWORK | Acta bloqueada; escalado al usuario; re-auditoría independiente |
| Scope drift | Cambios fuera del scope declarado, archivos no inventariados, dependencias no previstas | Defecto bloqueante si altera el producto; re-verificación de lo afectado |
| BLOCKED disfrazado o entrega disfrazada | Se declara bloqueo sin causa material, o se entrega con veredicto REWORK omitido | Entrega inválida; escalado; registro |
| Auditoría end-to-end de conveniencia | Auditor end-to-end que es autor, supervisor de lo auditado u orquestador; acta sin muestreo ni aritmética | Acta nula; auditoría repetida con auditor independiente |

**3. Supervisión de la supervisión.** La auditoría end-to-end comprueba el desempeño de cada supervisor: cobertura declarada, muestreo real, evidencia por criterio, cierre de defectos con prueba, calibración y ausencia de conflicto. Un supervisor con dos veredictos anulados o con evidencia no reproducida en su scorecard queda apartado de la supervisión del proyecto. Las incidencias de proceso se registran aunque el producto final sea bueno: un PASS obtenido con proceso inválido no es un PASS.

**4. Consecuencias.** Según la gravedad: corrección y nueva ronda; anulación de la puntuación y nueva supervisión; reasignación del autor (8.7); sustitución del supervisor; bloqueo de la entrega; y registro en el acta final. La reincidencia en cualquier patrón de gaming se trata como causa de escalado inmediato al orquestador y, si este fuera parte del patrón, al usuario.

## 8. Fase 4 — Rework, escalado y bloqueo seguro

### 8.1 Estados y regla de avance

| Estado | Significado | Quién lo fija | Transición |
|---|---|---|---|
| PENDIENTE | Tarea creada, sin empezar | Orquestador | A EN_EJECUCIÓN cuando el dueño la acepta |
| EN_EJECUCIÓN | El autor produce el entregable | Autor | A EN_SUPERVISIÓN cuando entrega con autoevaluación y evidencias |
| EN_SUPERVISIÓN | El supervisor verifica | Supervisor | A REWORK o a PASS |
| REWORK | Hay defectos abiertos | Supervisor | A EN_EJECUCIÓN cuando el autor reenvía; a ESCALADA si se agota o incumple |
| PASS | Gate superado y firmado | Supervisor | A CERRADA cuando se registra el cierre |
| ESCALADA | Decisión pendiente del orquestador | Orquestador | A REWORK con nueva ronda, reasignación, división o BLOCKED |
| BLOCKED | Imposibilidad material documentada | Orquestador, con evidencia | A EN_EJECUCIÓN si se resuelve la causa |
| CERRADA | Tarea terminada y verificada | Supervisor + orquestador registran | Solo se reabre con evidencia nueva, regresión o conflicto de independencia |

Reglas de avance:

1. **No se avanza sin veredicto firmado.** Una tarea no pasa a CERRADA por silencio, por acuerdo verbal ni por decisión del autor.
2. Las tareas dependientes **no empiezan** hasta que la tarea de la que dependen está CERRADA, salvo que el contrato de la Fase 1 autorice expresamente trabajo en paralelo con un punto de integración y un gate conjunto.
3. **No existe PASS preventivo.** Ninguna tarea se cierra «a falta de un detalle»; ese detalle es un defecto y exige ronda.
4. El estado se refleja en el tablero con la versión evaluada, la ronda y el enlace al scorecard. Un tablero que no refleja el estado real es un defecto de proceso.

### 8.2 Disparo del rework y contrato de la ronda

El REWORK se dispara cuando falla cualquiera de las condiciones del 7.10. El supervisor emite la **solicitud de rework** del 7.12.5 con: veredicto y nota, lista completa de defectos, alcance máximo autorizado, prohibiciones, evidencia exigida y criterio de cierre.

Reglas de la ronda:

1. **Una ronda = una entrega admitida + una verificación firmada.** La ronda 1 es la primera entrega evaluada; la ronda 0 es preparación y no cuenta.
2. **Máximo 5 rondas por tarea.** Es un límite duro: al agotarse no hay sexta ronda ni excepción. El orquestador decide conforme al 8.6 y al 8.7.
3. **No consumen ronda:** una entrega retirada por el autor antes del veredicto (se registra), una ronda anulada por conflicto de independencia (7.3) y un reenvío **no admitido** (8.4). El abuso del reenvío no admitido es un defecto de proceso y se escala.
4. **Disputa de defectos:** el autor puede impugnar un defecto con evidencia reproducible. El supervisor la re-verifica y documenta la resolución: cierra el defecto con motivo o lo mantiene con evidencia. La disputa no consume ronda por sí misma; si el supervisor mantiene el defecto y el autor no corrige, la ronda se cierra con REWORK y cuenta.
5. El rework es **dirigido**: se corrige lo pedido y lo que se derive directamente. Añadir funciones, rediseñar por gusto o reescribir lo que ya pasaba no es rework y se considera scope drift.
6. Cada ronda se registra íntegra en el registro de rondas del 8.8.3: no se sobrescribe, no se borra y no se renombra.

### 8.3 Alcance quirúrgico y changelog del autor

1. **Corrección mínima suficiente.** El autor conserva lo que ya funcionaba y corrige solo los defectos abiertos y sus efectos derivados. Si una reescritura es imprescindible, la justifica, pide autorización de alcance al orquestador y presenta un plan de regresión; sin autorización, la reescritura no se admite.
2. **Prohibido el arreglo oportunista:** cambios de estilo, refactors, nuevas dependencias o «mejoras» no solicitadas que alteren el entregable y compliquen la re-verificación.
3. **Changelog acumulado obligatorio** (plantilla 8.8.1): una fila por defecto corregido con estado anterior, cambio realizado con ubicación, evidencia nueva, efectos colaterales comprobados y confirmación de que el cambio está dentro del alcance permitido. Sin changelog completo, el reenvío no se admite.
4. **Autoevaluación actualizada:** el autor rehace su autoevaluación sobre la versión nueva (notas, evidencias, mejoras residuales y decisión). No puede limitarse a decir «lo anterior sigue valiendo» si algún criterio cambió.
5. **Versión nueva:** identificador nuevo, evidencias nuevas ligadas a esa versión. Las evidencias de la versión anterior no valen para la nueva sin reproducción.
6. **Informe de reenvío:** el autor comunica al supervisor y al orquestador con el formato del capítulo de autoevaluación, añadiendo la tabla defecto → cambio → evidencia y el changelog. El mensaje no sustituye al archivo ni a la evidencia.

### 8.4 Admisión del reenvío

Antes de puntuar, el supervisor comprueba la **lista de admisión**. Si falla un ítem, el reenvío **no se admite**: no se evalúa, se devuelve con la causa y no consume ronda; se registra como defecto de proceso y, si se repite, se escala.

| # | Condición de admisión | Comprobación |
|---|---|---|
| A1 | Todos los defectos abiertos están tratados (corregidos o impugnados con evidencia) | Changelog + versión nueva |
| A2 | Changelog completo y trazable | Una fila por defecto, con ubicación y evidencia |
| A3 | Autoevaluación actualizada y calibrada | Informe nuevo, no el anterior |
| A4 | Evidencias nuevas ligadas a la versión nueva | Identificadores de versión coincidentes |
| A5 | Prueba de no regresión sobre lo ya aprobado | Resultados y evidencia de regresión |
| A6 | Scope respetado | Inventario de cambios frente al alcance autorizado |
| A7 | Versión identificable | Hash, commit o inventario con fecha |

Una vez admitido, se aplica el protocolo completo de verificación: **100 % de los defectos previos**, muestreo nuevo de al menos el 50 % de las afirmaciones no críticas y re-puntuación completa. No se re-verifica solo lo corregido.

### 8.5 Re-verificación, regresión y re-puntuación

1. **Cierre de defectos:** cada defecto abierto se re-verifica con evidencia en la versión nueva. No se cierra por changelog ni por declaración. La tabla de cierre muestra, por defecto: situación anterior, cambio, evidencia de reproducción, resultado.
2. **Regresión:** se comprueba que lo que ya pasaba sigue pasando:
   - todos los defectos cerrados en rondas anteriores siguen cerrados (100 % de los críticos y muestra representativa del resto);
   - ningún criterio que antes superaba el gate cae por debajo del gate (críticos ≥ 9,0; ningún criterio < 7,0);
   - las afirmaciones críticas antes reproducidas se reproducen en la versión nueva;
   - los criterios de aceptación de la tarea se re-verifican;
   - se notifica a las tareas dependientes cualquier cambio que les afecte.
3. **Re-puntuación completa:** se puntúan otra vez los diez criterios, no solo los defectos. Una ronda con todos los defectos cerrados puede seguir siendo REWORK si la nota global no alcanza 90,0 o si hay un criterio bajo el umbral.
4. **Áreas no re-verificadas:** se declaran «no verificadas»; no se asume que siguen bien. Si el cambio toca una afirmación crítica, su verificación es obligatoria.
5. **Defectos nuevos:** se registran con la severidad que corresponda; un defecto nuevo detectado en rework no se ignora por «no estar en la lista original».
6. **Repetición:** un defecto que no se corrige en dos rondas sube un nivel de severidad y se marca como incumplimiento de rework; a la tercera reincidencia se escala.
7. **Tendencia:** el registro de rondas conserva las notas de cada ronda. La tendencia informa, no justifica: una mejora continuada que no llega al umbral sigue siendo REWORK.

### 8.6 Escalado y desempate

**Causas de escalado al orquestador:**

1. Desacuerdo entre autor y supervisor que persiste tras una re-verificación con evidencia.
2. Conflicto de independencia declarado o descubierto (7.3).
3. El supervisor no puede verificar por falta de acceso, entorno o competencia.
4. Agotamiento de las 5 rondas sin PASS.
5. Reincidencia de defectos o de incumplimiento de rework, o estancamiento (dos rondas consecutivas sin reducir defectos abiertos ni subir la nota total).
6. Sospecha fundada de evidencia falsa o de manipulación del proceso.
7. Contradicción entre dos supervisores o discrepancia de puntuación > 5,0 puntos.
8. Ambigüedad del contrato de tarea que afecta a la aceptación.
9. Bloqueo de dependencia externa o imposibilidad material.

**Paquete de escalado:** tarea y contrato; versión evaluada; ronda actual; scorecards; registro de defectos completo; tabla de muestreo; evidencia reproducida; posición del autor; posición del supervisor; decisión solicitada. Sin paquete completo, el orquestador devuelve el escalado.

**Decisiones permitidas al orquestador:** mantener la tarea con las rondas restantes; nombrar un segundo firmante independiente (mismo rol «Supervisores independientes» de §1.4) para desempate; reasignar el autor (8.7); dividir el alcance (8.7); declarar BLOCKED (8.7). **No puede** subir una nota, emitir un PASS, rebajar el umbral, borrar defectos ni ampliar el número máximo de rondas. Si el propio orquestador es parte del conflicto, el escalado pasa al usuario o a un coordinador independiente. Un cambio de requisitos del usuario se tramita como cambio de contrato de la Fase 0 con análisis de impacto y nueva línea base; **no autoriza a rebajar el 90 %, a reutilizar PASS ni a saltarse la verificación**.

**Desempate con un segundo firmante independiente:**

1. El segundo firmante puntúa **a ciegas** la misma versión, sin ver la nota del primero ni su autoevaluación.
2. Si ambos emiten PASS y sus totales difieren en **≤ 5,0 puntos**, el PASS queda válido y se registran ambas firmas.
3. Si ambos emiten REWORK, el REWORK se mantiene.
4. Si hay discrepancia de veredicto o de más de 5,0 puntos, se reconcilia con evidencia reproducida: se revisan juntos los criterios en disputa y las afirmaciones críticas. Si tras la reconciliación persiste la discrepancia, **prevalece el veredicto más estricto** (REWORK) hasta que la evidencia lo resuelva; nunca se elige PASS para desbloquear.
5. El desempate no reinicia rondas ni borra defectos. Se documenta en el acta de la tarea.

**Regla de desbloqueo:** ninguna decisión de escalado puede basarse en el tiempo transcurrido, el coste, el cansancio o el número de rondas. «Ya llevamos mucho» no es un argumento de calidad; va contra la regla de oro del 7.1 y se registra como incidencia de proceso si se usa para aprobar.

### 8.7 Reasignación, división de alcance y bloqueo seguro

**Reasignación del autor.** Procede cuando: hay evidencia falsa o manipulación; incumplimiento reiterado del rework; agotamiento de las 5 rondas sin PASS; pérdida de disponibilidad; conflicto que impide la independencia. El nuevo autor recibe el contrato completo, la versión actual, el registro de defectos, la evidencia válida y el número de rondas ya consumidas. **La reasignación no reinicia el contador de rondas.** Si no quedan rondas, solo cabe dividir el alcance o declarar BLOCKED.

**División de alcance.** Se permite para hacer viable la ejecución, nunca para rebajar el criterio de aceptación. Reglas:

1. Cada tarea nueva tiene su propio contrato, dueño, supervisor independiente, scope y contador de 5 rondas.
2. El mapa de trazabilidad conserva la relación tarea original → tareas nuevas; nada desaparece del alcance agregado.
3. Los criterios de aceptación del conjunto no se reducen. La entrega parcial no se entrega al usuario hasta que el conjunto completo pase el gate y la auditoría final.
4. Si la división se usa para esconder una tarea que no pasa, es gaming (7.15) y se recompone el alcance.

**Bloqueo seguro (BLOCKED).** Solo procede cuando la tarea o el producto no pueden completarse por una causa material y verificable: falta de acceso, credenciales o entorno; decisión del usuario pendiente; dependencia externa caída o no disponible; imposibilidad de disponer de un supervisor independiente; contradicción de requisitos que solo el usuario puede resolver. El registro de bloqueo incluye: causa exacta, evidencia de los intentos, qué está verificado, qué no, qué decisión se necesita, quién puede desbloquear y fecha. Reglas:

1. **BLOCKED no es una entrega.** No se presenta como terminado, no se disfraza de PASS y no se omite en el informe al usuario.
2. El orquestador informa al usuario con el estado real y la decisión pendiente, sin maquillar la calidad alcanzada.
3. Cuando se resuelve la causa, la tarea vuelve a EN_EJECUCIÓN con la ronda que corresponda; no se regala un PASS ni se borra el historial.
4. Declarar BLOCKED para evitar un REWORK, o mantenerlo sin causa material, es una manipulación del proceso y se registra en el acta.

### 8.8 Plantillas de rework y registro de rondas

#### 8.8.1 Changelog del autor

```text
CHANGELOG — TAREA <ID> · RONDA <N> · VERSIÓN <identificador>
Autor: <rol>                 Fecha: <fecha>

| Defecto | Estado anterior | Cambio realizado (archivo:líneas) | Evidencia nueva | Efectos colaterales comprobados | ¿Dentro del alcance? |
|---|---|---|---|---|---|
| D-<ronda>-01 | abierto | <qué se cambió y dónde> | <ruta:líneas, comando + salida> | <pruebas de no regresión> | sí / no (justificar) |
| … | | | | | |

Autoevaluación nueva: <referencia al informe actualizado>
Versión anterior: <…>   Versión nueva: <…>
```

#### 8.8.2 Solicitud de rework

Se usa la plantilla del 7.12.5, completada con la ronda, la versión y la lista de defectos. La solicitud no puede contener defectos nuevos no registrados ni instrucciones genéricas.

#### 8.8.3 Registro de rondas

```text
REGISTRO DE RONDAS — TAREA <ID>

| Ronda | Fecha | Versión | Veredicto | Total (0–100) | B | M | Med | Men | Cerrados | Nuevos | Incidencias de proceso | Observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | <fecha> | <hash> | REWORK | <X,X> | <n> | <n> | <n> | <n> | — | <n> | <ninguna> | <…> |
| 2 | <fecha> | <hash> | PASS | <X,X> | 0 | 0 | 0 | ≤3 | <n> | <n> | <ninguna> | <…> |
```

Reglas: la ronda 0 es preparación y no puntúa; las rondas no se sobrescriben; cada fila enlaza su scorecard y su registro de defectos; el contador no se reinicia por reasignación ni por renombrar la tarea.

#### 8.8.4 Registro de escalado

```text
ESCALADO — TAREA <ID> · RONDA <N>
Causa: <causa del 8.6>
Paquete completo: <sí, con referencias> 
Posición del autor: <…>       Posición del supervisor: <…>
Evidencia reproducida: <…>
Decisión solicitada: <…>
Decisión del orquestador: <mantener / desempate / reasignar / dividir / BLOCKED> 
Motivo y evidencia de la decisión: <…>
Fecha: <…>
```

#### 8.8.5 Registro de bloqueo

```text
BLOQUEO — TAREA <ID>
Causa material: <…>          Evidencia de los intentos: <…>
Verificado hasta ahora: <…>  No verificado: <…>
Decisión necesaria: <…>      Quién puede desbloquear: <…>
Estado del producto: <no entregable / parcial, nunca PASS>
Fecha y responsable: <…>
```

### 8.9 Prohibiciones del bucle de rework

1. **Aprobar por cansancio, prisa o presión.** El agotamiento, el plazo, el coste o el número de rondas no son criterios de calidad. Una decisión justificada por «ya está bien» o «no queda tiempo» es inválida.
2. **Bajar el umbral, redondear al alza o aprobar con reservas**, en cualquier ronda y por cualquier rol, incluido el orquestador.
3. **Aceptar una corrección sin evidencia** o cerrar un defecto por changelog, promesa o mensaje.
4. **Reabrir sin evidencia nueva** o usar la reapertura para presionar al autor.
5. **Reiniciar rondas** renombrando la tarea, dividiéndola de forma encubierta, cambiando de autor o creando una tarea «nueva» con el mismo alcance.
6. **Borrar, renumerar o rebajar defectos** para facilitar el cierre.
7. **Reducir alcance o criterios** para que la tarea quepa en el umbral.
8. **Declarar BLOCKED para evitar un REWORK** o mantener un bloqueo sin causa material.
9. **Entregar al usuario una tarea sin PASS, un PASS de otra versión o un PASS de otro autor.**
10. **Silenciar una regresión** o no informar de un cambio que afecta a tareas dependientes.
11. **Sustituir la revisión por la confianza:** «el autor es bueno», «ya lo revisamos en otra tarea» no son evidencia.
12. **Presionar al supervisor** para que cambie la nota; si ocurre, se registra y se escala.

### 8.10 Cierre de la tarea

Una tarea solo pasa a CERRADA cuando se cumplen **todas** estas condiciones, verificadas por el supervisor:

1. Existe un PASS firmado con total ≥ 90,0, truncado a una décima, y se cumplen todas las condiciones del 7.10.
2. Cero defectos bloqueantes, mayores y medios abiertos; como máximo 3 menores documentados con coste/beneficio.
3. Calibración dentro de los límites del 7.8, sin defectos de calibración abiertos.
4. Cero defectos de proceso abiertos: autoevaluación, changelog, tablero, scope, independencia y rondas en orden.
5. La versión del PASS es la versión que se cierra; no hay cambios posteriores.
6. El changelog y el registro de rondas están completos y enlazados al scorecard.
7. El tablero refleja el estado real y las tareas dependientes han sido notificadas.

El cierre lo registran el supervisor y el orquestador; **el autor no cierra su propia tarea**. Una tarea cerrada solo se reabre con evidencia nueva, regresión o conflicto de independencia; la reapertura se registra y consume ronda según el 8.2. Cerrar sin estas condiciones es un defecto de proceso bloqueante y obliga a reabrir.

El cierre de todas las tareas **no autoriza la entrega**: el proyecto solo se entrega cuando el acta de auditoría final del 7.14 está firmada con PASS y la versión entregada es exactamente la versión congelada en el acta. Si el acta es REWORK o BLOCKED, no hay entrega y se informa del estado real.
