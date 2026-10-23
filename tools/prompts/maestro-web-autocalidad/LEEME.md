# LEEME — Prompt Maestro de generación web con autoevaluación y supervisión ≥ 90 %

## Qué es

`PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` es un **prompt operativo autosuficiente** para un agente orquestador que deba generar una web con un equipo de agentes o subagentes. No es una guía: es el contrato que obliga a que cada tarea se autoevalúe, tenga un supervisor independiente y no se entregue nada por debajo de **90,0/100**.

## Archivos de esta carpeta

| Archivo | Qué contiene |
|---|---|
| `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` | **El entregable.** Prompt completo (§1–§12) listo para copiar y pegar. |
| `EVIDENCIA.md` | Resultados de la doble supervisión independiente, el red-team y el cierre. |
| `secciones/` | Fragmentos originales aprobados por sus supervisores (trazabilidad de la fusión). |
| `autoevaluaciones/` | Autoevaluación de cada autor y del integrador, con evidencias. |
| `supervision/` | Scorecards firmados de `supervisor-calidad-a` y `supervisor-calidad-b` (rondas, defectos, notas). |
| `auditoria/red-team-informe.md` | Auditoría adversarial: escapatorias, contradicciones y huecos. |
| `BRIEF.md` | Contrato interno del equipo: requisitos R1–R8, rúbricas y reglas de proceso. |

## Cómo usarlo

1. Copia el prompt maestro **completo** como encargo del agente orquestador (o cárgalo en su contexto).
2. Añade el brief real de tu web: qué es, para quién, qué debe hacer, contenidos, referencias y si se publica o no. Como mínimo, cubre `BRIEF_USUARIO` (ver §1.2).
3. El agente debe empezar por la **Fase 0** (§3) y responder con el contrato de aceptación y la tabla de tareas (§4.3) antes de escribir código. No aceptes que se salte esa respuesta.
4. Cada tarea debe llevar **dueño + supervisor independiente + evidencia exigida**. Ninguna tarea se cierra sin un PASS de su supervisor ≥ 90,0.
5. La entrega final solo es válida con la tabla de veredictos de §10.2, las evidencias (capturas, descargas en disco, consola, red, responsive, auditoría), el entorno final verificado (URL de producción o runtime real declarado) y el commit. Si algo no se puede verificar, la respuesta correcta es **BLOCKED**.

## Variables

Las define §1.2. Tú solo debes aportar `BRIEF_USUARIO` como encargo; el resto de variables marcadas «Sí» debe quedar resuelta al cerrar la Fase 0 (preguntando o como supuesto explícito), nunca omitida. `UMBRAL_CALIDAD` **no es configurable**: 90,0 siempre.

## Cómo comprobar que el agente está cumpliendo

1. ¿Existe una tabla de tareas con dueño y supervisor distinto por tarea? Si no, incumple §4.3.
2. ¿Cada tarea tiene informe de autoevaluación con notas y evidencias? Si no, incumple §5.
3. ¿Cada tarea tiene un scorecard independiente firmado con PASS ≥ 90,0? Si no, no hay entrega.
4. ¿La verificación se hizo en el entorno real (navegador, consola, red, descargas en disco, 3 anchos, accesibilidad)? Si no, incumple §9.
5. ¿Hay evidencias reproducibles y versión servida comprobada? Si no, no se puede llamar «entregado».

## Tamaño y contexto

El documento completo ocupa ~185 KB (~45.000 tokens), porque incluye rúbricas, plantillas, verificación real y reglas del proyecto. Está pensado para un orquestador con ventana amplia. Si el contexto es limitado, reparte **sin recortar controles**: orquestador = prompt completo; cada supervisor = §5–§8 + §12.4; dueño de la verificación = §6 + §9–§12; auditor end-to-end = §6–§8 + §9–§10 + §12.4. Nunca entregues a quien puntúa un texto sin §5–§8 ni sin el umbral de 90,0; si no puedes garantizar eso, usa un modelo con ventana suficiente antes que recortar el prompt.

## Verificación de este documento

- Dos supervisores independientes puntuaron cada sección y el prompt integrado: **FG-A 96,0** y **FG-B 95,0** sobre el SHA-256 congelado `5be0bb94…` (notas y rondas en `supervision/`).
- Un auditor adversarial (red-team) buscó escapatorias, ambigüedades y contradicciones (`auditoria/red-team-informe.md`); veredicto final: ACEPTABLE, 0 B/M/Med/Men abiertos.
- Cada autor se autoevaluó antes de entregar y cada sección pasó por rondas de rework hasta el PASS. El historial está en `autoevaluaciones/` y `supervision/`.

## Versión y mantenimiento

- **v1.1 — 2026-10-23.** Versión corregida tras auditoría adversarial (32 IDs de hallazgo, RT-01…RT-32). **PASS final:** FG-A 96,0 y FG-B 95,0 sobre el mismo SHA-256 congelado.
- Si cambian las reglas del proyecto, las skills o el stack de destino, actualiza las secciones afectadas y **vuelve a pasar el gate de supervisión**. No edites el prompt publicado sin re-verificación.
