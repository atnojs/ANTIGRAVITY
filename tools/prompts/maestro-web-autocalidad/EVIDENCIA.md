# EVIDENCIA — Prompt Maestro de generación web con autoevaluación y supervisión ≥ 90 %

## 1. Versión del prompt y revisión de evidencia

- **Entregable:** `PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md`
- **Versión del prompt:** 1.1 (sin cambios desde su congelación para los gates)
- **Revisión documental de evidencia:** 1.2
- **Medidas:** 1.832 líneas · 184.322 caracteres con LF normalizado (186.154 en crudo con CRLF; 182.490 sin saltos de línea) · 189.489 bytes
- **SHA-256 del prompt:** `5be0bb94ebc55ac14680c3a95b89654aed93752bb04b340b5b72ab4e8b4f1da7`
- **Fecha:** 2026-10-23
- **Estado:** **APROBADO por los dos gates finales** — FG-A 96,0 y FG-B 95,0 sobre el mismo SHA-256 congelado; red-team final ACEPTABLE (0 B/M/Med/Men abiertos). Queda únicamente la consolidación documental de esta acta (T12). Cualquier cambio de bytes en el prompt invalida los PASS (P19) y exige nueva verificación.

## 2. Cadena de calidad recorrida

| Artefacto | Autor | Autoevaluación | Rondas | PASS independiente | Nota |
|---|---|---:|---|---:|---:|
| `secciones/01-nucleo.md` | autor-nucleo | 93,6 | 2 (1 REWORK) | supervisor-calidad-a | **94,2** |
| `secciones/02-rubrica.md` | autor-rubrica | 92,5 | 2 (1 REWORK) | supervisor-calidad-a | **93,6** |
| `secciones/03-supervision.md` | autor-supervision | 93,3 | 2 (1 REWORK) | supervisor-calidad-b | **93,60** |
| `secciones/04-integracion.md` | autor-integracion | 93,8 | 3 (2 REWORK) | supervisor-calidad-b | **93,80** |
| Prompt integrado | Lead | `autoevaluaciones/lead-integrador.md` | 2 rondas de red-team + delta | FG-A y FG-B | **96,0 / 95,0** |

Red-team ronda 1: 26 hallazgos (1 bloqueante, 8 mayores, 5 medios, 12 menores). Ronda 2: cuerpo ACEPTABLE (0 B/M/Med; 4 menores y 1 medio del LEEME). Delta v1.2: ACEPTABLE (3 menores documentales corregidos). **Cierre: RT-01…RT-32, 0 B/M/Med/Men abiertos.** Gates finales FG-A y FG-B: PASS sobre el mismo SHA congelado (96,0 y 95,0).

## 3. Trazabilidad de garantías (R1–R8)

Líneas sobre el prompt v1.1. Cada garantía tiene al menos dos mecanismos independientes; incumplir cualquiera es defecto bloqueante.

| Req. | Garantía del encargo | Mecanismos (sección · línea) |
|---|---|---|
| R1 | Todo agente/subagente se autoevalúa y no entrega sin decidir | P2 (l.106) · §5.1 (l.512) · §5.2 (l.523) · §5.7 (l.634) · §5.8 (l.686) · §7.8 (l.995) · D7 (§5.4, l.560) |
| R2 | No se entrega si cabe una mejora razonable | P3 (l.107) · §5.3 (l.537) · §5.4/D5 (l.560) · §6.2/A6 (l.716) · §7.8 punto 4 (l.995) · §8.2 (l.1275) |
| R3 | Delegación en tantas tareas distintas como haya | §4.1 (l.297) · §4.2 (l.319) · §4.3 (l.348) · §4.4 (l.365) · Gate 1 (§4.10, l.469) · P12 (l.116) |
| R4 | Supervisión independiente y profunda de cada tarea | §1.4 (l.77) · §4.6 (l.419) · P5 (l.109) · P7 (l.111) · §7.2 (l.872) · §7.6 (l.934) · §7.12 (l.1068) · §7.14 (l.1183) |
| R5 | Nada se entrega sin verificación fiel; el autor sigue trabajando | P7 (l.111), P8 (l.112), P19 (l.123) · §7.6 (l.934) · §7.9 (l.1010) · §7.10 (l.1019) · §7.11 (l.1046) · §8.2 (l.1275) · §8.4 (l.1297) · §8.5 (l.1313) · §10.1 (l.1614) |
| R6 | El suelo de calidad nunca baja de 90,0 | P4 (l.108) · §5.5 (l.584) · §6.5 (l.763) · §7.10 (l.1019) · §10.1 (l.1614) · §10.2 (l.1626) |
| R7 | El bucle continúa hasta aprobación o BLOCKED | P12 (l.116) · §8.1 (l.1255) · §8.6 (l.1328) · §8.7 (l.1356) · §10.3 (l.1682) · §12.3 (l.1794) |
| R8 | La web se verifica de verdad antes de entregar | §2.2 (l.125) · §9.1 (l.1468) · §9.2 (l.1475) · §9.7 (l.1522) · §9.8 (l.1531) · §9.13 (l.1580) · §10.2 (l.1626) · §12.3 (l.1794) |

## 4. Resolución de los hallazgos del red-team

| ID | Sev. | Corrección aplicada | Estado |
|---|---|---|---|
| RT-01 | B | P2 cubre todos los roles + nueva §5.8 (autoevaluación de supervisor, auditor y orquestador) + G1 actualizado | Cerrado |
| RT-02 | M | Gate 4/§4.5/§4.7/§10.1: la verificación real y la auditoría se abren con el Gate 4; la verificación se cierra con su PASS y la auditoría con el acta del Gate 5 | Cerrado |
| RT-03 | M | §4.2: la fila «Auditoría end-to-end» se cubre con el gate §7.14, no con tarea ni supervisor de tarea | Cerrado |
| RT-04 | M | §3.2 fija el criterio de rendimiento (Lighthouse ≥ 90 en las cuatro categorías, móvil y escritorio) y §9.8 lo referencia | Cerrado |
| RT-05 | M | Gate 5: firma el auditor end-to-end; el orquestador registra, no firma el veredicto | Cerrado |
| RT-06 | M | `DESPLIEGUE`: runtime real declarado; `file://` no válido; sin runtime → BLOCKED | Cerrado |
| RT-07 | M | Eliminada la «limitación explícita» para el entorno final; solo BLOCKED | Cerrado |
| RT-08 | Med | §5.3 y §7.8 punto 4: el supervisor recalcula el coste y, en duda, la mejora es asequible | Cerrado |
| RT-09 | Med | §8.2/§8.4: topes a retiradas y reenvíos no admitidos consecutivos | Cerrado |
| RT-10 | Men | Plantilla §5.7 con división explícita entre 10 | Cerrado |
| RT-11 | Men | Ejemplo del scorecard corregido (A1, peso 18, crítico Sí) | Cerrado |
| RT-12 | Men | Tabla de estados duplicada eliminada; referencia canónica a §8.1 | Cerrado |
| RT-13 | Men | Ejemplo de entrega con global 91,7 truncado | Cerrado |
| RT-14 | Men | Las evidencias fechadas se conservan hasta el cierre | Cerrado |
| RT-15 | Men | Frase de calibración precisada (≤ 10,0 puntos) | Cerrado |
| RT-16 | M | P19 restaurada en §2 (l.123) | Cerrado |
| RT-17 | M | Anexo D con R1–R8, G1 corregido y matriz de trazabilidad en este documento | Cerrado |
| RT-18 | Med | `LEEME.md`: reparto por rol sin recortar §5–§8 ni el umbral | Cerrado |
| RT-19 | Med | `LEEME.md`: entorno final = producción o runtime declarado; variables «Sí» de §1.2 | Cerrado |
| RT-20 | Med | §2.2.7: commit por cambio de archivo; §9.8: `loading="lazy"` y dimensiones | Cerrado |
| RT-21 | Men | Renumerado §2.3 → §2.2 con §2.1, sin referencias colgantes | Cerrado |
| RT-22 | Men | Cabecera sin dependencia externa: prompt v1.1 y verificación por FG-A/FG-B | Cerrado |
| RT-23 | Men | §12.4 al mismo nivel que §12.1–§12.3 | Cerrado |
| RT-24 | Men | Autoevaluación del integrador con métricas y hash verificables | Cerrado |
| RT-25 | Men | Rol Integrador con tarea, revisor y momento definidos | Cerrado |
| RT-26 | Men | Referencias del índice §11 corregidas | Cerrado |
| RT-27 | Med | `LEEME.md`: el prompt integrado se puntúa en FG-A/FG-B, no se afirma como hecho previo | Cerrado |
| RT-28 | Men | Etiquetado coherente: prompt v1.1 · evidencia 1.2; métricas con convención declarada | Cerrado |
| RT-29 | Men | §5.8: criterios A1–A10, plantilla §5.7/§11, críticos ≥ 9,0 (D3) y veredicto del revisor registrado | Cerrado |
| RT-30 | Men | §4.4/§4.10/§4.7/§10.1: la verificación se cierra con su PASS; el Gate 5 cierra la entrega con el acta | Cerrado |
| RT-31 | Men | Aritmética de la autoevaluación del integrador corregida (947,8 → 94,7) | Cerrado |
| RT-32 | Men | Métricas documentales corregidas (71 referencias §; 581 líneas del informe red-team; cierre §24–§25) | Cerrado |

## 5. Gates finales

| Gate | Supervisor | Versión evaluada | Nota | Veredicto | Scorecard |
|---|---|---|---:|---|---|
| FG-A | supervisor-calidad-a | prompt v1.1 SHA `5be0bb94…` | **96,0** (96,06 truncado) | **PASS** — críticas ≥9,6; cero B/M/Med; 1 menor documental (LEEME, corregida en T12) | `supervision/scorecard-supervisor-a.md` |
| FG-B | supervisor-calidad-b | prompt v1.1 SHA `5be0bb94…` | **95,0** (95,08 truncado) | **PASS** — críticas ≥9,0; cero B/M/Med; 2 menores documentales | `supervision/scorecard-supervisor-b.md` |
| Red-team final | auditor-red-team | prompt v1.1 SHA `5be0bb94…` | — | **ACEPTABLE** (0 B/M/Med/Men abiertos) | `auditoria/red-team-informe.md` (§24–§25) |

**Regla de cierre:** este documento solo se considera cerrado cuando ambos gates FG-A y FG-B emiten PASS ≥ 90,0 sobre el mismo SHA-256. Cualquier cambio posterior invalida los PASS (P19) y exige re-verificación.

## 6. Menores documentales de los gates (resueltos o justificados)

Los dos gates dejaron 2 menores documentales cada uno, todas ajenas al cuerpo del prompt y a su SHA; se resuelven aquí sin tocar el prompt:

- **FG-A M-01 / FG-B M-FG-02 (recuentos):** corregidos — LEEME ya no dice «26 hallazgos» sino RT-01…RT-32; EVIDENCIA cita el informe con 581 líneas y §24–§25; la autoevaluación del integrador habla de RT-01…RT-32.
- **FG-A M-02 (métricas):** corregidas en esta acta (581 líneas, §24–§25, convención de caracteres declarada).
- **FG-B M-FG-01 («global» del Anexo A):** justificado y no requiere cambio en el prompt. El «global 91,7» del ejemplo de §12.1 es una **media truncada ilustrativa** de las notas de tarea; no es una puntuación de entrega ni evidencia. La puntuación final del proyecto se rige por §7.14 (auditoría end-to-end con la rúbrica §6) y el gate §10.1. Queda aclarado en esta acta.

## 7. Evidencias de reproducción

- Decisiones y reglas del proyecto: `claude.md`, `skills/SKILL_CREAR.md`, `skills/SKILL_MAESTRA.md`, `skills/SKILL_AUDITOR.md`, `skills/SKILL_CAPTURAS_VERIFICACION.md`, `skills/SKILL_VERIFICACION_PLAYWRIGHT.md`, `skills/POLITICA_modelos-imagen.md`.
- Autoevaluaciones: `autoevaluaciones/autor-*.md`, `autoevaluaciones/lead-integrador.md`.
- Supervisión: `supervision/scorecard-supervisor-a.md` (T1/T2 y FG-A), `supervision/scorecard-supervisor-b.md` (T3/T4 y FG-B).
- Auditoría adversarial: `auditoria/red-team-informe.md` (581 líneas; rondas 1–2, verificaciones y cierre final §24–§25).
- Comprobaciones mecánicas sobre el prompt v1.1: 1.832 líneas, 13 H1 (título + 12 secciones), 49 tablas markdown (51 agrupaciones) sin filas incoherentes, 32 cercas equilibradas, 71 referencias `§` únicas resueltas contra encabezados, P19 en l.123, 0 «Lead», 0 «verificador de producto», 0 notas de integración, 0 `TODO` reales (solo la prohibición de §10.1), 0 emojis.
