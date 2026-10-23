# Autoevaluación — T4 · Sección 4: verificación end-to-end, proyecto y entrega

## 0. Identidad y alcance

| Dato | Valor |
|---|---|
| Autor | `autor-integracion` |
| Tarea | `task-4` (T4 del BRIEF §3) |
| Fecha de esta versión | 2026-10-23 (Atlantic/Canary), ronda 3 |
| Archivo de sección | `tools/prompts/maestro-web-autocalidad/secciones/04-integracion.md` — 428 líneas, 7.059 palabras, SHA-256 `64DD6861E20E863EB1CEC2A1A749A038EA7C302CAFF0C7897E5FA8FFEC711066` |
| Informe | `tools/prompts/maestro-web-autocalidad/autoevaluaciones/autor-integracion.md` (este archivo) |
| Rondas anteriores | Ronda 1: REWORK (90,75; D-ST4-01…07). Ronda 2: REWORK (92,45; seis cerrados, D-ST4-03 abierto) |
| Scope respetado | Solo los dos archivos del scope. No se tocaron git, `apps/`, `skills/`, `tools/memoria/`, `supervision/`, `auditoria/` ni scorecards. |

**Fuentes leídas completas o en las secciones citadas:** `BRIEF.md` (150), `SKILL_MEJORADOR_PROMPT.md` (189), `SKILL_CREAR.md` (188), `SKILL_MAESTRA.md` (1.010), `SKILL_AUDITOR.md` (221), `SKILL_CAPTURAS_VERIFICACION.md` (79), `SKILL_VERIFICACION_PLAYWRIGHT.md` (87), `SKILL_history-server.md` (161), `SKILL_arquitecto-backend-php-hostinger.md` (138), `SKILL_style-guide-antigravity.md` (125), `claude.md` (109), `tools/memoria/MEMORIA.md` (47), `entorno.md` (116), `mapa.md`, `produccion.md` (97), `decisiones.md` (180), `recetas.md` y `errores.md` (entradas citadas), `secciones/01-nucleo.md:40-89` y `:235-294`, `secciones/03-supervision.md` (vigente, 614 líneas; `:1-70` y `:95-139`), `supervision/scorecard-supervisor-b.md` (§8.6–§8.8), `tools/verificar-despliegue.ps1` (53), `tools/verificar-apps-produccion.ps1` (88), `.gitignore:130-150` y `:270-295`, `apps/outfit/app.css:8-20`.

## 1. Respuesta a las rondas de supervisión

| ID | Sev. | Corrección aplicada | Ubicación (v3) |
|---|---|---|---|
| D-ST4-01 | Mayor | Criterio único de N/A: solo por ausencia real de la funcionalidad; si el brief no incluye publicación, se verifica el runtime real declarado y se registra como entorno final; sin runtime verificable → limitación o BLOCKED. Se elimina «N/A por entorno excluido» y se condiciona el cierre a entorno final verificado (producción o runtime declarado) en 9.13, 10.1, 10.2, 10.3, 12.3 y Anexo B; 9.11 declara su aplicabilidad | `:113`, `:197-205`, `:236`, `:243-244`, `:255`, `:266-267`, `:285`, `:323`, `:405`, `:411`, `:425` |
| D-ST4-02 | Medio | Terminología de §1.4: «orquestador» para escalado y coordinación; «usuario» para el cliente; «dueño de tarea» solo para el dueño del contrato. Sin apariciones de «Lead» | `:3` (nota), `:273`, `:319`, `:325`, `:327`, `:333-334`, `:341`, `:384`; `Select-String 'Lead'` = 0 |
| D-ST4-03 | Medio | **Cerrado en ronda 3.** La Fase 5 la ejecuta el **dueño de la tarea de verificación** —rol «Autores y especialistas» de §1.4—, asignado por el orquestador y registrado en el contrato de tarea (§4.4: «Dueño y supervisor» y «Gate aplicable»), conforme a §7.2 y §7.6; no firma el gate de tarea. Se retiró el rol «verificador de producto» (que la T3 vigente ya no define) y la instrucción de integración del cuerpo; la nota de integración solo aclara que no se crean roles nuevos. Plantilla de informe actualizada | `:3`, `:102`, `:221`; `verificador de producto` = 0; `dueño de la tarea de verificación` en `:3`, `:102`, `:221`; `Pendiente de integración` = 0 |
| D-ST4-04 | Medio | Re-disparo del webhook con **commit vacío (`git commit --allow-empty`) + push** y umbral ~20 min, en la regla de proyecto, en 9.2, en 9.11 y en el disparador BLOCKED | `:83`, `:114`, `:202`, `:324` |
| D-ST4-05 | Menor | Afirmación corregida: carpeta protegida por `tools/.htaccess`; capturas `.png` y `.playwright-cli/` excluidas por `.gitignore`; el resto de evidencias se mantiene fuera del índice. Aplicado en 9.2, 9.12, plantilla de entrega y Anexo B | `:118`, `:209`, `:212`, `:292`, `:401` |
| D-ST4-06 | Menor | Descripción real del verificador: `verificar-apps-produccion.ps1` comprueba health del proxy e historial de las apps (no assets) | `:84` |
| D-ST4-07 | Menor | Añadido `--text-dim:#99CCCC` a la lista de tokens mínimos (valor real de `apps/outfit/app.css:14`), usado por el subtítulo | `:62-63` |

Los siete defectos de la ronda 1 están cerrados. El reabierto en la ronda 2 (D-ST4-03) queda cerrado en esta versión: la sección ya no introduce roles nuevos, usa exclusivamente el rol «Autores y especialistas (dueño de la tarea de verificación)» de §1.4 (`01-nucleo.md:60-66`) y la asignación de T3 vigente (`03-supervision.md:7`, `:25-33`, `:45`, `:109`), y no deja instrucciones de integración en el cuerpo del prompt. No se reescribió la sección desde cero ni se tocó ningún otro archivo.

## 2. Rúbrica S1–S7 (BRIEF §4)

| ID | Criterio (peso, crítico) | Nota | Evidencia (ruta + línea/fragmento) y justificación |
|---|---|---|---|
| S1 | Contrato completo (20, sí) | 9,6 | `secciones/04-integracion.md:100-245` cubre los 13 puntos de la Fase 5; `:247-360` cubre Fase 6 y BLOCKED; `:5-98` cubre reglas de proyecto, skills, arquitectura, Hoola, image 2, Git y memoria; `:362-428` cubre anexos, ejemplo, adaptación y checklist. Contrato de T4 (`BRIEF.md:50`) completo. |
| S2 | Corrección técnica y coherencia (15, sí) | 9,3 | Roles validados contra `01-nucleo.md:60-66` y `03-supervision.md:7`, `:25-33`, `:45`, `:109`; la Fase 5 usa el rol existente «Autores y especialistas (dueño de la tarea de verificación)»; `verificador de producto` = 0 en la sección. Resto de reglas contrastadas: commit vacío (`errores.md:321-327`, `:481-495`), `.gitignore:141`/`:281`, `verificar-apps-produccion.ps1:49-72`, `--text-dim` (`apps/outfit/app.css:14`). |
| S3 | Utilidad ejecutable, sin ambigüedad (15, sí) | 9,3 | Un ejecutor externo puede recorrer la Fase 5 y la Fase 6: rol y designación en §4.4, entorno final (producción o runtime declarado), evidencia exigida y cierre condicionado; plantillas de informe (`:217-241`), entrega (`:263-309`) y BLOCKED (`:331-350`). Sin dependencias de integración pendientes en el cuerpo. |
| S4 | Alineación con el encargo y R1–R8 (15, sí) | 9,5 | R8 con cuatro mecanismos independientes (2.3.7, Fase 5, condiciones de entrega y checklist); R7 en 9.13 y 10.3; R4 en la intro de §9 y 9.13; R5/R6 en 10.1–10.2 y notas de entrega. El encargo literal (`BRIEF.md:9-12`) exige verificación real y no entrega por debajo de 90: la sección lo materializa. |
| S5 | Autoevaluación honesta y trazable (15, sí) | 9,3 | Este informe incluye respuesta defecto por defecto (rondas 1 y 2), notas, cálculo, contraste con fuentes vigentes, límites reales (verificación documental, no de producto), supuestos de integración, mejoras residuales con coste y corrección de la cita errónea de la ronda anterior. |
| S6 | Claridad, concisión y formato (10, no) | 9,0 | 428 líneas, tablas y listas densas, sin secciones de relleno, sin emojis y sin marcadores TODO (solo la prohibición literal de `:257`); 4 bloques de código y 8 fences equilibrados. La longitud sigue siendo el punto débil (M1). |
| S7 | Resistencia al autoengaño/gaming (10, no) | 9,5 | Sin evidencia no hay PASS (`:102-109`), N/A único y no discrecional (`:244`), BLOCKED con evidencia de intentos (`:317-352`), prohibición de inventar/reciclar evidencia (`:207-213`), entorno final verificado más allá del 200 (`:197-205`), prohibición de redondear o aprobar con reservas (`:311-315`). |

## 3. Cálculo y decisión

Fórmula del BRIEF §4 (`BRIEF.md:83`): `total = Σ (nota × peso) / 10`.

| Criterio | Nota | Peso | Producto |
|---|---|---|---|
| S1 | 9,6 | 20 | 192,0 |
| S2 | 9,3 | 15 | 139,5 |
| S3 | 9,3 | 15 | 139,5 |
| S4 | 9,5 | 15 | 142,5 |
| S5 | 9,3 | 15 | 139,5 |
| S6 | 9,0 | 10 | 90,0 |
| S7 | 9,5 | 10 | 95,0 |
| **Total** | | **100** | **938,0 / 10 = 93,8** |

- Total ponderado: **93,8** (escala 0–100; equivale a 9,38/10 normalizado). Umbral ≥90,0. Ninguna nota <7. Críticas S1–S5 ≥9. Defectos abiertos: 0 bloqueantes, 0 mayores, 0 medios; 3 menores documentadas (§6). Calibración frente a la verificación independiente de la ronda 2 (92,45): diferencia 1,35, por debajo de 10.
- **Decisión: ENTREGO** la versión corregida para la ronda 3 de `supervisor-calidad-b`. No cierro `task-4` hasta recibir PASS ≥90.

## 4. Cobertura del contrato de T4 (BRIEF §3, fila T4)

| Exigencia del contrato | Dónde está | Estado |
|---|---|---|
| Fase 5: flujo completo en Chrome | `:100-130` | Cumplido |
| Consola, red y recarga | `:131-137`, `:148-156` | Cumplido |
| Descargas en disco con contenido válido | `:139-146` | Cumplido |
| 3 anchos 360/390/768/1440 y sin scroll horizontal | `:158-165` | Cumplido |
| Lighthouse y accesibilidad A–H | `:167-176` | Cumplido |
| Persistencia server-side | `:48-54`, `:148-156` | Cumplido |
| Estados de carga, error y reintento | `:178-186` | Cumplido |
| Reglas obligatorias y skills a cargar | `:5-22`, `:40-98` | Cumplido |
| Arquitectura mínima proxy/history/history-manager | `:24-38` | Cumplido |
| Estilo Hoola: cian, verde, Electrolize, glassmorphism, tokens | `:56-65` | Cumplido |
| Imágenes image 2 y selectores calidad/AR/resolución | `:67-74` | Cumplido |
| Git solo `main`, push y comprobación de producción | `:76-84`, `:197-205`, `:253-259` | Cumplido |
| Memoria del proyecto | `:86-90`, `:354-360` | Cumplido |
| Formato de entrega con evidencias y veredictos ≥90 | `:261-315` | Cumplido |
| Regla BLOCKED | `:317-352` | Cumplido |
| Anexo compacto de ejemplo y adaptación fuera de Antigravity | `:364-407` | Cumplido |
| Español, sin TODOs, sin duplicar la mecánica de §5–§8 | Todo el archivo; verificación en §5 | Cumplido |

## 5. Verificación realizada sobre mi propio archivo (v3)

- **Estructura:** encabezados `2.3` (9 subapartados), `9` (13 subapartados), `10` (4 subapartados) y `12` (3 anexos); 4 bloques de código con 8 fences equilibrados; 428 líneas, 7.059 palabras.
- **Limpieza:** sin emojis; sin marcadores TODO/FIXME (la única aparición literal es la prohibición de `:257`); sin `[pendiente]` como marcador.
- **Correcciones comprobadas por búsqueda literal:** `Lead` = 0; `segundo push` = 0; `no versionada` = 0; `versión de assets` = 0; `verificador designado` = 0; `producción está verificada` = 0; `verificador de producto` = 0; `Pendiente de integración` = 0; `dueño de la tarea de verificación` en `:3`, `:102` y `:221`; solo queda «verificadores» en `:205` (referido a los scripts del proyecto); `--text-dim` en el subtítulo y en la lista de tokens; «commit vacío» en 4 puntos y `--allow-empty` en 3; criterio de N/A único en `:244`.
- **Idioma:** todo en español.
- **No duplicación:** no se definen pesos, descriptores, pasos de autoevaluación, puntuación de supervisor ni mecánica de rework; solo se invoca §6, §7 y §8.
- **Alcance:** todas las escrituras se hicieron con las herramientas de edición sobre los dos archivos del scope; no se ejecutaron comandos de git ni modificaciones en `apps/`, `skills/`, `tools/memoria/`, `supervision/` ni `auditoria/`.

## 6. Mejoras residuales (solo menores)

| ID | Severidad | Mejora | Coste | Beneficio | Decisión |
|---|---|---|---|---|---|
| M1 | Menor | La sección tiene 428 líneas; parte de las reglas de proyecto puede deduplicarse con §2 al integrar | Bajo | Medio | Se deja al integrador; no afecta a cobertura |
| M2 | Menor | Los comandos exactos de Playwright y Lighthouse dependen del entorno; se describen a nivel de flujo y el Anexo B los mapea | Medio | Bajo | Aceptado; el Anexo B cubre la adaptación |
| M3 | Menor | El Anexo A es ilustrativo y no desarrolla un brief completo de Fase 0; el contrato pide un anexo compacto | Medio | Bajo | Aceptado por contrato |

No hay defectos bloqueantes, mayores ni medios abiertos y no queda ninguna dependencia de integración pendiente en el cuerpo del prompt.

## 7. Supuestos, límites y riesgos declarados

1. **Referencias por numeración prevista:** uso §6 (rúbrica), §7 (supervisión) y §8 (rework) según `BRIEF.md:52-65`. Si el Lead renumera, debe reajustar esas referencias.
2. **Rol de verificación:** la Fase 5 se asigna al «dueño de la tarea de verificación» dentro del rol «Autores y especialistas» de §1.4, conforme a la T3 vigente (`03-supervision.md:7`, `:25-33`, `:45`, `:109`) y registrado en los campos «Dueño y supervisor» y «Gate aplicable» de §4.4. No se crean roles nuevos ni se dejan instrucciones de integración en el cuerpo.
3. **Escala de puntuación:** el BRIEF §4 fija `Σ(nota × peso)/10` con umbral ≥90,0 (0–100), mientras el §8 escribe «X,X/10». Publico 93,8 (fórmula) y 9,38/10 normalizado; el Lead debe unificar la notación.
4. **Verificación documental:** este encargo produce un prompt, no una web (`BRIEF.md:121`); no hay capturas de navegador de un producto real. Lo verificado es que la sección exige y hace verificable la Fase 5.
5. **«3 anchos 360/390/768/1440»:** resuelto como matriz de 4 con mínimo de 3 que incluya móvil, tablet y escritorio (`:160`).
6. **Skills vigentes a 2026-10-23:** si cambian (catálogo de imagen, overlay, auditoría), la sección puede quedar desactualizada; la regla de precedencia de `:22` y las fuentes canónicas citadas mitigan el riesgo.
7. **Memoria:** no actualicé `tools/memoria/` porque el BRIEF §6.7 lo prohíbe a los autores; corresponde al Lead en T12 (`task-13`).

## 8. Historial de revisiones (changelog)

- **v0.1 — borrador inicial:** estructura 2.3 / 9 / 10 / 12 con contenido contractual completo.
- **v0.2 — correcciones propias antes de la ronda 1:** precedencia entre skills; 2.3.9 edición segura; notación de puntuaciones sin `/10`; informe BLOCKED; captura de entorno final en la entrega; método de Lighthouse; regla de caché según `errores.md:412-425`; trazabilidad R4/R8.
- **v0.3 — ronda 2 (respuesta a D-ST4-01…07):** criterio único de N/A y cierre por entorno final; terminología orquestador/usuario/dueño de tarea; commit vacío + push; corrección de la afirmación sobre `.gitignore` de evidencias; descripción real de `verificar-apps-produccion.ps1`; token `--text-dim`. El rol de verificación usado en esta versión se retiró en v0.4 al no existir en la T3 vigente.
- **v0.4 — ronda 3 (respuesta a D-ST4-03 reabierto):** Fase 5 asignada al «dueño de la tarea de verificación» (rol «Autores y especialistas» de §1.4) conforme a §7.2/§7.6 y registrada en §4.4; eliminado el rol «verificador de producto» y toda instrucción de integración del cuerpo y de la nota; plantilla de informe actualizada en `:221`; cita de la autoevaluación corregida. Nueva versión: 428 líneas, 7.059 palabras, SHA-256 `64DD6861E20E863EB1CEC2A1A749A038EA7C302CAFF0C7897E5FA8FFEC711066`.
- **Pendiente:** ronda 3 de `supervisor-calidad-b`; si hay defectos, se registran aquí con fecha, corrección y nueva puntuación.

## 9. Decisión

**ENTREGO** la versión corregida a la ronda 3 de supervisión independiente. Solicito PASS ≥90 de `supervisor-calidad-b`; no cierro `task-4` hasta recibirlo. Si quedan defectos, los corregiré con changelog y aviso, máximo 5 rondas.
