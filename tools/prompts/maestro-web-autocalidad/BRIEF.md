# BRIEF — Prompt Maestro de Generación Web con Autoevaluación y Supervisión ≥90 %

Documento de coordinación del equipo. **Léelo entero antes de tocar nada.** No forma parte del entregable final: el entregable es el prompt maestro. Este BRIEF fija el contrato, los criterios de aceptación, las rúbricas y las reglas de convivencia del equipo.

---

## 0. Encargo literal del usuario (no reinterpretar, no resumir al evaluar)

> «Con el siguiente prompt lo que quiero conseguir es que todos los subagentes y agente que intervengan en la generación de una web se autoevalúen y no entreguen su tarea si creen que cabe un mínimo de mejora. Si no lo he enfocado bien, sabiendo lo que quiero genera tú el prompt para conseguir mi fin.
> ejecuta el siguiente prompt, quiero que delegues en tantos subagentes como tareas distintas haya en el prompt. por supuesto debe existir agentes que supervisen a fondo el trabajo de los diferentes agentes y no entregar nada que no se haya comprobado fielmente que el trabajo de los subagentes es de calidad. si no lo fuese el subagente debe seguir trabajando en su tarea hasta que el supervisor lo de por bueno, que no será nunca por debajo de un 90% de calidad en el resultado de su tarea.»

**Lectura operativa del encargo:** el usuario no aporta un brief de una web concreta; pide **construir el prompt maestro** que, cuando se use para generar una web, imponga (a) autoevaluación de todos los agentes, (b) no entregar con mejora razonable pendiente, (c) delegación en tantos agentes como tareas distintas, (d) supervisión independiente y profunda, (e) rework obligatorio hasta aprobación, (f) suelo de calidad del 90 % que nunca se rebaja. La ejecución de este encargo se demuestra aplicando ese mismo protocolo al equipo que construye el prompt.

## 1. Entregable final

Un único documento listo para copiar y pegar como prompt:

```text
E:/ANTIGRAVITY/tools/prompts/maestro-web-autocalidad/PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md
```

Debe ser autosuficiente: un orquestador que lo reciba, sin más contexto, debe poder generar una web con calidad ≥ 90 % en cada tarea, autoevaluación real y supervisión independiente. Además se entregará `LEEME.md` (uso, variables, cómo verificar que se cumple) y evidencia de este proceso en `supervision/` y `auditoria/`.

El prompt no genera código de web: **gobierna** a quien la genere. No debe contener pseudocódigo, ni depender de ficheros que no existan en el proyecto destino, ni pedir herramientas que el ejecutor no tenga. Cuando cite el proyecto Antigravity, debe indicar cómo adaptarse a otro entorno.

## 2. Requisitos de aceptación del producto (trazables, R1–R8)

| ID | Requisito | Cómo se demuestra en el prompt final |
|---|---|---|
| R1 | Todo agente/subagente que interviene se autoevalúa antes de entregar | Protocolo de autoevaluación obligatorio + informe con puntuación y evidencias + regla de decisión ENTREGO / NO ENTREGO |
| R2 | No se entrega si cabe una mejora mínima razonable | Regla de mejora residual (severidades y coste) y repetición interna hasta agotar mejoras significativas |
| R3 | Se delega en tantos agentes como tareas distintas haya | Fase de descomposición con tabla de tareas, dueño, supervisor independiente, scope de escritura, dependencias y evidencia exigida; cobertura mínima del ciclo web |
| R4 | Hay agentes que supervisan a fondo cada tarea | Independencia obligatoria (nadie se supervisa a sí mismo), reproducción de evidencias, muestreo y auditoría end-to-end |
| R5 | Nada se entrega sin verificación fiel; si no, el agente sigue trabajando | Gate por tarea con nota ≥ 90 %; veredicto PASS/REWORK; rework con defectos numerados; sin aprobación por cansancio |
| R6 | El suelo de calidad nunca baja de 90 % | Umbral único e inviolable en autoevaluación, supervisión de tarea, auditoría global y entrega final; prohibido rebajarlo, redondearlo o aprobar «con reservas» |
| R7 | El bucle continúa hasta aprobación | Rondas de rework con registro, escalado del orquestador, reasignación y, si es imposible, estado BLOCKED explícito (nunca entrega disfrazada) |
| R8 | El resultado de la web también se verifica de verdad | Verificación real en navegador (flujo, consola, descargas en disco), responsive, accesibilidad/Lighthouse, persistencia, despliegue y comprobación de producción antes del cierre |

Todo requisito debe aparecer **al menos dos veces** con mecanismos independientes (p. ej. R6 en rúbrica, gate, veredicto y prohibiciones). El supervisor final rellenará la matriz de trazabilidad R1–R8 → sección/línea/evidencia.

## 3. Contratos de sección (artefactos intermedios)

Cada autor escribe **solo** los archivos de su scope. Nada de editar secciones ajenas, git, memoria ni otros ficheros del repo. Cada autor escribe su sección + su autoevaluación:

| Tarea | Autor | Escribe (scope exclusivo) | Contenido exigido |
|---|---|---|---|
| T1 | `autor-nucleo` | `secciones/01-nucleo.md` + `autoevaluaciones/autor-nucleo.md` | Identidad y misión del orquestador; variables de entrada y qué hacer si faltan; reglas inviolables de proceso (español, no secretos, no autosupervisión, un escritor por archivo, no ramas, no inventar); Fase 0 (ingesta del brief, criterios de aceptación, preguntas máx. 3, supuestos); roles del equipo; Fase 1 (descomposición en tareas distintas, tabla y contrato de tarea, tablero compartido, dependencias, cobertura mínima del ciclo web, asignación de supervisores); protocolo de comunicación y sincronización; reglas de parada (no avanzar sin gate) |
| T2 | `autor-rubrica` | `secciones/02-rubrica.md` + `autoevaluaciones/autor-rubrica.md` | Rúbrica universal de 10 criterios con pesos (suma 100), criterios críticos, descriptores por nivel, reglas de puntuación (sin evidencia = 0, no redondeo al alza); protocolo de autoevaluación en 7 pasos; definición de mejora residual y severidades; regla de decisión ENTREGO / NO ENTREGO; informe de autoevaluación (plantilla); regla del 90 % en autoevaluación; reglas anti-autoengaño y calibración; ejemplos de puntuaciones límite |
| T3 | `autor-supervision` | `secciones/03-supervision.md` + `autoevaluaciones/autor-supervision.md` | Independencia y conflictos de interés; qué y cómo verifica el supervisor (reproducción de evidencias, muestreo, comprobación de autoevaluación); puntuación independiente y veredicto PASS/REWORK; registro de defectos con severidad; plantillas de scorecard, defectos y solicitud de rework; bucle de rework (máx. 5 rondas, changelog, re-verificación, regresión); escalado y desempate; prohibición de bajar el umbral; auditoría end-to-end final; verificación de que el proceso se cumplió (anti-gaming) |
| T4 | `autor-integracion` | `secciones/04-integracion.md` + `autoevaluaciones/autor-integracion.md` | Fase de verificación real de la web (navegador, consola, descargas en disco, 3 anchos, Lighthouse/accesibilidad); reglas obligatorias del proyecto Antigravity y skills a cargar; arquitectura mínima (proxy/history/history-manager); estilo Hoola/Electrolize/glassmorphism; imágenes image 2; persistencia server-side; git main + commit/push + comprobación de producción; memoria del proyecto; formato de entrega final al usuario con evidencias y puntuaciones; regla BLOCKED; anexo de ejemplo de uso compacto y adaptación fuera de Antigravity |

**Numeración prevista del prompt final** (para que las referencias cruzadas sean coherentes):

1. Identidad, misión, variables y datos de entrada.
2. Reglas inviolables (proceso y proyecto).
3. Fase 0 — Brief y contrato de aceptación.
4. Fase 1 — Descomposición, tablero y contratos de tarea.
5. Fase 2 — Ejecución con autoevaluación.
6. Rúbrica universal y cálculo del 90 %.
7. Fase 3 — Supervisión independiente y veredicto.
8. Fase 4 — Rework, escalado y bloqueo seguro.
9. Fase 5 — Verificación end-to-end del proyecto.
10. Fase 6 — Entrega, cierre y memoria.
11. Plantillas.
12. Anexos (ejemplo, adaptación fuera de Antigravity, checklist final).

El Lead integra los fragmentos, elimina duplicidades, unifica voz y numeración y escribe la cabecera de uso. Los autores no necesitan escribir la cabecera.

## 4. Rúbrica de sección (gate ≥ 90 % de cada tarea de autor)

Cada supervisor puntúa 0–10 y pondera. **PASS** exige: total ponderado ≥ 90,0; ninguna nota < 7; todos los criterios críticos ≥ 9; cero defectos bloqueantes, mayores o medios abiertos; y como máximo 3 menores documentados con justificación de coste/beneficio.

| ID | Criterio | Peso | Crítico |
|---|---|---|---|
| S1 | Cumple completo el contrato de su sección (todo lo exigido, sin recortes) | 20 | Sí |
| S2 | Corrección técnica y coherencia con el diseño global del prompt | 15 | Sí |
| S3 | Utilidad ejecutable: listo para integrar, sin ambigüedad operativa ni contradicciones | 15 | Sí |
| S4 | Alineación literal con el encargo del usuario y con este BRIEF (R1–R8) | 15 | Sí |
| S5 | Autoevaluación honesta y trazable: evidencias reales, mejoras residuales, calibración | 15 | Sí |
| S6 | Claridad, concisión, formato y ausencia de relleno | 10 | No |
| S7 | Resistencia al autoengaño y al gaming del propio proceso | 10 | No |

La fórmula: `total = Σ (nota × peso) / 10`. Se publica con un decimal.

## 5. Rúbrica del prompt final (gate global ≥ 90 %)

| ID | Criterio | Peso | Crítico |
|---|---|---|---|
| C1 | Fidelidad literal al encargo del usuario (R1–R8, matriz de trazabilidad completa) | 14 | Sí |
| C2 | Ejecutabilidad: copiar y pegar y funciona; variables definidas; sin contradicciones | 14 | Sí |
| C3 | Cobertura del ciclo web y de las tareas distintas (incluye skills y proyecto) | 8 | No |
| C4 | Mecánica de autoevaluación y regla de no-entrega (rúbrica, informe, decisión) | 12 | Sí |
| C5 | Supervisión independiente y umbral 90 % (reproducción, veredicto, veto, doble nivel) | 14 | Sí |
| C6 | Bucle de rework, escalado y bloqueo seguro (sin aprobación por cansancio) | 9 | Sí |
| C7 | Integración Antigravity y verificación real (navegador, descargas, responsive, deploy) | 9 | No |
| C8 | Evidencias, plantillas y trazabilidad | 7 | No |
| C9 | Claridad, estructura y consistencia (sin duplicidades ni contradicciones) | 6 | No |
| C10 | Resistencia al autoengaño/gaming (calibración, muestreo, evidencias verificadas) | 7 | No |

Fórmula y umbral idénticos a la sección. Ambos supervisores puntúan el final por separado; si sus totales difieren en más de 5 puntos, reconcilian con evidencias antes de emitir veredicto. El Lead no puede aprobar por encima de un supervisor: solo puede ordenar rework o bloquear.

**Pruebas obligatorias del prompt final:**

1. **Trazabilidad:** cada R1–R8 mapeado a secciones/líneas concretas y a ≥ 2 mecanismos independientes.
2. **Prueba de mesa:** simular un brief realista y recorrer fases 0–6 solo con el prompt. Debe ser posible saber quién hace qué, qué evidencia se exige, quién supervisa y cuándo se entrega. Cualquier paso imposible o dato indefinido = defecto.
3. **Prueba anti-gaming:** verificar que no existen escapatorias («si no llega, entrega», «N/A discrecional», «aprobado con reservas», «el supervisor puede bajar el umbral», «redondear al alza», «evidencia declarada por el autor sin comprobar»).
4. **Prueba de consistencia numérica:** 10 criterios = 100 de peso; umbral 90 en todos los niveles; 5 rondas máx.; discrepancia de autoevaluación > 10 puntos = defecto de calibración; ninguna regla posterior contradice otra anterior.

## 6. Reglas de proceso del equipo (obligatorias)

1. **Autoevaluación antes de entregar.** Ningún autor envía su tarea sin informe de autoevaluación propio (S1–S7) con evidencias, mejoras residuales y decisión. Si el informe falta o es genérico, el supervisor emite rework automático por defecto de proceso.
2. **Evidencia real.** Cada afirmación relevante se respalda con ruta de archivo + fragmento/contenido, o comando + salida. No vale «lo he revisado». No se inventan capturas, métricas ni resultados.
3. **Independencia.** El supervisor de una tarea nunca es su autor; no comparte scope de escritura; no edita la sección supervisada, solo exige cambios. El autor no puede modificar su scorecard.
4. **Rework dirigido.** El supervisor envía defectos numerados con severidad, ubicación, esperado y evidencia. El autor corrige únicamente lo pedido (y lo que se derive), actualiza changelog y autoevaluación, y avisa. Nada de reescribir de cero sin justificarlo.
5. **Rondas.** Máximo 5 rondas por tarea. Si se agotan sin PASS, el Lead decide: reasignar, dividir alcance o declarar BLOCKED con el motivo exacto. **Nunca se baja el umbral.**
6. **Severidades.** Bloqueante: incumple requisito/contradice/evidencia falsa o ausente. Mayor: omisión relevante o ambigüedad que obliga a interpretar. Medio: defecto de uso con solución evidente. Menor: estilo/documentación. PASS = cero bloqueantes, mayores y medios abiertos.
7. **Alcance de escritura.** Solo los archivos de la tabla del punto 3. Prohibido tocar `apps/`, `skills/`, `tools/memoria/`, git, index.html del repo o cualquier cosa fuera de `tools/prompts/maestro-web-autocalidad/`. El único que hace commit es el Lead, al final.
8. **Idioma y tono.** Español. Directo, preciso, sin relleno, sin épica ni promesas vacías. Nada de emojis en el prompt final; tablas y listas cuando aporten.
9. **Formato.** Markdown. Encabezados jerárquicos. Nada de TODOs ni «[pendiente]» salvo variables explícitas del prompt final. Sin enlaces a ficheros temporales ni rutas personales.
10. **Comunicación.** Al terminar, cada autor envía al Lead un mensaje con: tarea, archivos, autoevaluación resumida (total y notas), evidencias, mejoras residuales y decisión. Los supervisores envían scorecard + veredicto al autor y copia-resumen al Lead. Los conflictos van al Lead con evidencias, nunca se resuelven por cansancio.
11. **Sin ejecución web.** Este encargo produce un prompt, no una web. No se lanzan navegadores ni tests de apps. Sí se verifica la calidad del texto y de los mecanismos.
12. **Prohibido el autoengaño.** Si un autor no está seguro de algo, lo escribe como supuesto o duda en su autoevaluación; no lo maquilla. Un defecto declarado cuesta menos que uno oculto.

## 7. Referencias obligatorias (leer según sección)

- `tools/memoria/MEMORIA.md` (reglas de memoria) y `tools/memoria/mapa.md` (índice tarea → skill).
- `skills/SKILL_MEJORADOR_PROMPT.md` (arquitectura de prompts, criterios de calidad, expansión profesional).
- `skills/SKILL_CREAR.md` (fases 4 y 5 obligatorias) y `skills/SKILL_MAESTRA.md` (reglas de producción, diseño Hoola, modelos de imagen, historial, proxy, despliegue).
- `skills/SKILL_AUDITOR.md` (auditoría Lighthouse/accesibilidad), `skills/SKILL_CAPTURAS_VERIFICACION.md` (evidencia visual), `skills/SKILL_VERIFICACION_PLAYWRIGHT.md` (flujo real en navegador).
- `skills/SKILL_history-server.md`, `skills/SKILL_arquitecto-backend-php-hostinger.md`, `skills/SKILL_style-guide-antigravity.md` (solo la sección 4 las necesita).
- `skills/SKILL_director-orquestador-multiagente.md` (roles, locks, dependencias; útil para la sección 1).
- `claude.md` (reglas del proyecto) — si ya se conoce, basta con el resumen de este BRIEF.

## 8. Plantilla de informe al Lead (autores)

```text
TAREA: T<n> — <título>
ARCHIVOS: <rutas>
AUTOEVALUACIÓN: total X,X/10 (detalle por criterio S1–S7)
EVIDENCIAS: <ruta + qué demuestra>
MEJORAS RESIDUALES: <ninguna | lista con severidad y coste>
DECISIÓN: ENTREGO / NO ENTREGO (si NO ENTREGO: qué falta)
RIESGOS/SUPUESTOS: <lista breve>
```

## 9. Definición de «hecho» de cada tarea

Una tarea de autor está hecha cuando: (a) su archivo existe y cumple el contrato completo; (b) su autoevaluación está escrita y es específica; (c) las evidencias son comprobables; (d) el supervisor independiente emite PASS con ≥ 90 %; (e) el autor actualiza y cierra su tarea en el tablero compartido. Una tarea de supervisor está hecha cuando su scorecard está firmada con veredicto y evidencias, y el autor ha corregido o la tarea queda escalada.

El objetivo del prompt final no es describir un proceso bonito: es que un equipo real no pueda entregar una web por debajo del 90 % sin que quede por escrito y sin aprobación independiente.
