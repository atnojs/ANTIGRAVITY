# Autoevaluación — integración final del PROMPT MAESTRO (prompt v1.1 · evidencia 1.2)

- **Rol:** Lead / integrador
- **Tarea:** T9 (`task-10`)
- **Entregable:** `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` — 1.832 líneas · 184.322 caracteres con LF normalizado (186.154 en crudo con CRLF; 182.490 sin saltos) · 189.489 bytes · SHA-256 `5be0bb94ebc55ac14680c3a95b89654aed93752bb04b340b5b72ab4e8b4f1da7`
- **Fuentes:** 4 secciones con PASS independiente (94,2 · 93,6 · 93,60 · 93,80), 2 scorecards, BRIEF §5, informe red-team (RT-01…RT-32; 0 abiertos al cierre).
- **Fecha:** 2026-10-23
- **Estado:** ENTREGO a la verificación delta del red-team y a los gates FG-A/FG-B (≥ 90,0 cada uno).

## 1. Qué se hizo

1. Fusión de las 4 secciones aprobadas con la numeración §1–§12; bloque de reglas de proyecto dentro de §2; eliminación de notas de integración y títulos de fragmento; normalización de encabezados.
2. Cabecera de uso, terminología común, §11 (índice de plantillas), Anexo D (garantías R1–R8) y pie.
3. **Ronda 1 de rework (red-team, 26 hallazgos):**
   - R1 universal: P2 ampliado y nueva §5.8 de autoevaluación de supervisor, auditor y orquestador; G1 actualizado.
   - Gates sin dependencias imposibles: Gate 4 cierra solo tareas de producto; verificación y auditoría se abren con Gate 4; Gate 5 lo firma el auditor.
   - Entorno y rendimiento: `DESPLIEGUE` exige runtime real declarado; sin runtime ⇒ BLOCKED; criterio Lighthouse ≥ 90 en cuatro categorías.
   - Anti-gaming: el supervisor recalcula el coste de las mejoras (RT-08) y hay topes a retiradas/reenvíos no admitidos (RT-09).
   - Contenido y formato: P19 restaurada, §2.1/§2.2 sin salto de numeración, tabla de estados única, plantilla 5.7 con `/10`, ejemplo de scorecard correcto, global de ejemplo 91,7 truncado, `loading="lazy"`, commit por cambio de archivo, evidencias conservadas, §11/§12.4 coherentes, Integrador con tarea.
   - `LEEME.md` corregido (partición por rol, entorno final, variables obligatorias).
4. **Ronda 2 de rework (red-team, 5 hallazgos):**
   - RT-27: el LEEME ya no afirma que el prompt integrado se puntuó antes de los gates.
   - RT-28: versión v1.1/v1.2 coherente; medidas con convención declarada; recuento del informe actualizado.
   - RT-29: §5.8 exige plantilla §5.7/§11, críticos A1–A6 ≥ 9,0 y veredicto del revisor registrado.
   - RT-30: la verificación se cierra con su PASS; el Gate 5 cierra la entrega con el acta; contrato de tarea actualizado.
   - RT-22: cabecera sin dependencia de `EVIDENCIA.md`.
5. Re-verificación mecánica: 1.832 líneas, 49 tablas markdown (51 agrupaciones) sin columnas incoherentes, 32 cercas equilibradas, 13 H1, 71 referencias § únicas resueltas, 0 restos de integración, 0 «Lead», 0 «verificador de producto», 0 `TODO` reales.

## 2. Autoevaluación C1–C10 (rúbrica del BRIEF §5)

| ID | Criterio | Peso | Crítico | Nota | Evidencia |
|---|---|---:|---|---:|---|
| C1 | Fidelidad literal al encargo (R1–R8, matriz) | 14 | Sí | 9,6 | Anexo D + matriz R1–R8 en `EVIDENCIA.md` §3; R1 cubre a todos los roles (§5.8) |
| C2 | Ejecutabilidad (copiar y pegar; variables; sin contradicciones) | 14 | Sí | 9,5 | Cabecera, §1.2, gates sin ciclos (§4.10), prueba de mesa del red-team sobre v1.1/v1.2 |
| C3 | Cobertura del ciclo web y tareas distintas | 8 | No | 9,6 | §4.1–§4.2 (15 áreas), §9.1–§9.13, §2.2 |
| C4 | Autoevaluación y regla de no-entrega | 12 | Sí | 9,6 | §5.1–§5.8, D1–D7, P2–P3, A6 |
| C5 | Supervisión independiente y umbral 90 | 14 | Sí | 9,6 | §7.1–§7.15, P5, P17, PASS ligado a versión (P19), Gate 5 firmado por auditor |
| C6 | Rework, escalado y bloqueo seguro | 9 | Sí | 9,5 | §8.1–§8.10 (topes de rondas), §10.3, P12 |
| C7 | Integración Antigravity y verificación real | 9 | No | 9,4 | §2.2 completo, §9, §10.2, §12.2 |
| C8 | Evidencias, plantillas y trazabilidad | 7 | No | 9,5 | §11, plantillas, `EVIDENCIA.md`, scorecards |
| C9 | Claridad, estructura y consistencia | 6 | No | 8,6 | Estructura §1–§12 correcta y sin saltos de numeración; queda el tamaño (~184 KB) como residual M1 |
| C10 | Resistencia al autoengaño y gaming | 7 | No | 9,4 | §5.6, §7.6–§7.8, §7.15, §8.9, P13, P19; rework RT-08/RT-09 |

Cálculo: 14×9,6 + 14×9,5 + 8×9,6 + 12×9,6 + 14×9,6 + 9×9,5 + 9×9,4 + 7×9,5 + 6×8,6 + 7×9,4 = 947,8 → **94,7 / 100** truncado.

Gate D1–D7: D1 94,7 ≥ 90,0 ✓ · D2 mínimo 8,6 ≥ 7,0 ✓ · D3 críticas = 9,6/9,5/9,6/9,6/9,5 ≥ 9,0 ✓ · D4 cero B/M/Med ✓ · D5 tres menores declaradas ✓ · D6 evidencias reproducibles ✓ · D7 informe completo ✓.

## 3. Mejoras residuales

| ID | Mejora | Severidad | Coste | Motivo de no aplicar |
|---|---|---|---|---|
| M1 | Documento extenso (~184 KB); comprimirlo exige re-verificar los cuatro fragmentos y arriesga perder mecanismos auditados | Menor | Alto | Consecuencia de la exhaustividad exigida; mitigado en `LEEME.md` con reparto por rol |
| M2 | El prompt no se ha ejercitado generando una web real en esta sesión: las pruebas son de mesa, trazabilidad y coherencia | Menor | Alto | El encargo era el prompt, no una web; ejercitarlo de verdad es un encargo posterior |
| M3 | Las líneas de la matriz R1–R8 corresponden al prompt v1.1 (evidencia 1.2); si cambia el prompt hay que recalcularlas | Menor | Bajo | Se actualizarán al congelar la versión definitiva tras los gates |

No hay mejoras bloqueantes, mayores ni medias abiertas. Los 33 hallazgos del red-team (26 + 5 + 2 documentales) están corregidos; el red-team confirmó el prompt como ACEPTABLE y quedan los gates finales.

## 4. Riesgos y supuestos

- Supuesto: el entorno destino conserva las rutas y skills de Antigravity; fuera de él se aplica §12.2.
- Riesgo: si cambian las skills o las reglas del proyecto, hay que re-verificar (mantenimiento en `LEEME.md`).
- La autoevaluación es autoinformada; el veredicto real lo emiten el red-team y los gates FG-A/FG-B.

## 5. Decisión

**ENTREGO** el prompt v1.1 (revisión de evidencia 1.2) a los gates finales independientes. No se publica como definitiva hasta que ambos gates emitan PASS ≥ 90,0 sobre el mismo SHA-256 y el red-team confirme el cierre de sus hallazgos.
