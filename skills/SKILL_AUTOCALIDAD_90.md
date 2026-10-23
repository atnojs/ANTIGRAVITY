---
name: autocalidad-90
description: "Puerta de calidad OBLIGATORIA antes de generar o editar cualquier artefacto (archivo, app, web, documento, hoja, presentación, imagen, datos, configuración o script). Exige autoevaluación de todos los agentes, verificación por un supervisor independiente y no entregar nada por debajo de 90,0/100. Cárgala SIEMPRE que vayas a crear o modificar algo; para webs y apps se aplica además el protocolo completo indicado."
---

# Autocalidad 90 — puerta obligatoria de creación y edición

## 0. Activación obligatoria

Carga y aplica esta skill **antes de tocar nada** cuando la tarea vaya a producir o modificar un artefacto: archivo, app, web, componente, documento, hoja de cálculo, presentación, imagen, datos, configuración, script, commit o publicación.

- No es opcional. No se desactiva por prisa, por ser «un cambio pequeño», por costumbre ni porque el usuario no la mencione.
- Si la tarea es solo una consulta conversacional sin artefacto, no aplica.
- Si produce o modifica algo, se aplica **siempre**, y tampoco se entrega nada hasta que exista un PASS independiente ≥ 90,0.
- Esta skill es la puerta de entrada. El protocolo completo y detallado vive en **`tools/prompts/maestro-web-autocalidad/PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md`** (v1.1, doble gate 96,0/95,0). Para **generar o editar una web/app o un trabajo multiarchivo**, léelo y aplica sus §1–§12 tal cual. Para el resto de artefactos, aplica esta versión compacta con el mismo gate, sin saltarte ningún control.

## 1. Regla cero

**Sin PASS ≥ 90,0 no hay entrega.** No existe «casi», «con reservas», «lo entrego y luego lo arreglo», «queda solo un detalle» ni «que lo valide el supervisor y ya». Si no se puede verificar, el resultado correcto es **BLOCKED** con la causa exacta, nunca una entrega disfrazada.

## 2. Roles mínimos

| Rol | Responsabilidad | Límite |
|---|---|---|
| Autor o dueño | Ejecuta el artefacto, produce evidencia y se autoevalúa antes de entregar | No firma su propio PASS ni se supervisa |
| Verificador independiente | Reproduce la evidencia, recalcula la nota y emite PASS o REWORK con defectos numerados | No es autor, no comparte scope de escritura, no edita el entregable, no baja el umbral |
| Orquestador (si hay varios) | Descompone, asigna, encarga rework y escala | No emite PASS ni puede elevar la nota de un verificador |

Si no existe un verificador independiente posible, el gate queda **BLOCKED**. La autoevaluación nunca cuenta como supervisión.

## 3. Procedimiento obligatorio

1. **Contexto.** Lee `claude.md`, la memoria (`tools/memoria/MEMORIA.md` y lo que la tarea necesite), la skill específica (`crear`, `maestra-produccion-antigravity`, `cirujano-codigo-produccion`, `history-server`, `verificacion-playwright`, `auditor-lighthouse-accesibilidad`, etc.) y, si es web/app, el protocolo completo indicado en §0.
2. **Descomposición.** Divide en tareas con entregable verificable. Cada tarea declara: dueño, entregable, archivos/scope, evidencia exigida y verificador independiente distinto del dueño. Una tarea sin verificador no empieza.
3. **Ejecución.** Aplica la skill específica, la skill maestra y las reglas del proyecto. No inventes requisitos ni datos; lo no verificado se declara.
4. **Autoevaluación del autor.** Puntúa A1–A10 con evidencia, calcula el total truncado, declara mejoras residuales con severidad y decide **ENTREGO / NO ENTREGO** según D1–D7. Si queda una mejora asequible (≤ 15 min, sin dependencia externa, sin riesgo de regresión y con beneficio observable), se corrige antes de entregar. Los supervisores, el auditor y el orquestador también se autoevalúan antes de entregar su artefacto (protocolo §5.8).
5. **Verificación independiente.** El verificador reproduce el 100 % de las afirmaciones críticas y ≥ 50 % del resto, recalcula el total y emite veredicto escrito con evidencia. Sin scorecard firmado no hay PASS.
6. **Rework o BLOCKED.** Si algo falla, defectos numerados con severidad, ubicación y esperado. El autor corrige solo lo pedido, re-verifica todo y se repite. Máximo 5 rondas; después, escalar o BLOCKED. **Nunca se rebaja el umbral.**
7. **Entrega.** Solo con PASS. Incluye la tabla de tareas con notas y veredictos, evidencias reproducibles, riesgos residuales y la verificación real del entorno. Si no se puede verificar algo, se dice: BLOCKED o limitación declarada, nunca «hecho».

## 4. Rúbrica universal (resumen ejecutable; fuente canónica: §6 del protocolo)

| ID | Criterio | Peso | Crítico |
|---|---|---:|---|
| A1 | Cobertura del contrato o encargo (sin recortes ni añadidos fuera de alcance) | 18 | Sí |
| A2 | Corrección funcional y técnica en el entorno real | 15 | Sí |
| A3 | Verificación real y evidencia reproducible del estado final | 13 | Sí |
| A4 | Reglas del encargo y del proyecto (idioma, alcance, seguridad, no secretos) | 10 | Sí |
| A5 | Autoevaluación honesta y calibrada | 12 | Sí |
| A6 | Mejora residual agotada | 10 | Sí |
| A7 | Calidad del resultado para el usuario final | 8 | No |
| A8 | Robustez y seguridad (estados, errores, casos límite, datos sensibles) | 6 | No |
| A9 | Evidencias, documentación y trazabilidad | 5 | No |
| A10 | Claridad, mantenibilidad y limpieza | 3 | No |

`total = (A1×18 + A2×15 + A3×13 + A4×10 + A5×12 + A6×10 + A7×8 + A8×6 + A9×5 + A10×3) / 10`, **truncado a un decimal, nunca redondeado al alza**. Las notas se puntúan de 0,0 a 10,0. La calibración se vigila: más de 10,0 puntos de diferencia o ≥ 2,0 en un criterio crítico es defecto y se registra.

**Condiciones simultáneas de PASS (D1–D7):**

1. Total truncado ≥ 90,0.
2. Ninguna nota < 7,0.
3. Todos los criterios críticos A1–A6 ≥ 9,0.
4. Cero defectos bloqueantes, mayores o medios abiertos.
5. Como máximo 3 mejoras menores declaradas, con coste/beneficio justificado y ninguna asequible pendiente.
6. Todas las afirmaciones críticas tienen evidencia reproducible del estado final.
7. Informe de autoevaluación y scorecard del verificador completos y ligados a la versión (hash/commit).

## 5. Plantilla mínima de autoevaluación

```text
AUTOEVALUACIÓN — Tarea: <ID y título> · Autor: <rol> · Versión: <hash/commit/fecha>
| A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | A9 | A10 | Total (truncado) |
| x,x | ... |
Evidencia por criterio: <ruta:línea / comando y salida / captura / medición>
Mejoras residuales: <ninguna | ID, severidad, coste, motivo, quién decide>
Gate D1–D7: <cumple/no cumple, detalle>
DECISIÓN: ENTREGO | NO ENTREGO — <motivo en una línea>
Declaración: no hay evidencia inventada; todo se reproduce desde el informe y el artefacto final.
```

## 6. Verificación independiente y scorecard

- **Muestreo:** 100 % de afirmaciones críticas + ≥ 50 % del resto; si hay pocas, todas. La muestra la elige el verificador, no el autor.
- **Reproducción:** abre los archivos, ejecuta los comandos, navega la web, revisa capturas/descargas, mide. «Lo he revisado» no es evidencia.
- **Calibración:** si la nota del verificador difiere de la autoevaluación en más de 10,0 puntos, hay defecto de calibración que se registra y corrige.
- **PASS escrito:** nota por criterio, total exacto truncado, evidencias reproducidas, defectos y versión evaluada (SHA-256, commit o inventario con hashes). Un PASS sin versión es inválido.
- **Prohibido:** aprobar por cansancio, bajar el umbral, redondear al alza, aprobar «con reservas», aceptar evidencia declarada sin reproducir, marcar N/A discrecional o supervisar el propio trabajo.

## 7. Rework, escalado y BLOCKED

- Cada defecto se numera con severidad: **Bloqueante** (rompe requisito/seguridad o evidencia falsa), **Mayor** (omisión relevante o ambigüedad grave), **Medio** (defecto de uso con solución evidente), **Menor** (estilo/documentación).
- El rework es dirigido: se corrige lo pedido y lo que se derive; no se reescribe de cero sin justificarlo ni se cuela scope drift.
- Se re-verifica el 100 % de defectos previos y la regresión completa; después se re-puntúa todo.
- Máximo 5 rondas. Si se agotan: se escala al orquestador o se declara **BLOCKED** con causa, intentos y qué falta. Nunca se aprueba por debajo de 90,0.
- Un PASS queda ligado a una versión exacta: cualquier cambio posterior lo invalida y exige nueva verificación.

## 8. Verificación real por tipo de entregable

| Artefacto | Verificación mínima obligatoria |
|---|---|
| Web o app | Flujo completo en Chrome (clics, formularios, navegación, errores), consola y red, recarga, **descargas comprobadas en disco con contenido válido**, 3 anchos sin scroll horizontal, accesibilidad/Lighthouse, persistencia server-side y, si se publica, comprobación de la versión servida en producción |
| Documento, hoja o presentación | Abrirlo o renderizarlo, validar formato, contenido y disposición; comprobar que se abre en la herramienta real |
| Código o script | Ejecutar/tests/build, consola limpia, caso principal y de error; revisar el diff contra el scope |
| Imagen | Abrirla, comprobar dimensiones, formato, legibilidad y que el contenido pedido está |
| Datos o configuración | Validar esquema, integridad, muestra representativa y que el consumidor real los procesa |
| Publicación/commit | `main`, commit aislado, push, `git log origin/main..HEAD` vacío y comprobación de la versión servida |

Si el entorno impide la verificación real, **no se declara verificado**: BLOCKED.

## 9. Entrega

- Tabla de tareas: dueño, verificador, nota, veredicto y evidencia.
- Evidencias reproducibles: rutas, comandos, capturas, mediciones, descargas y hashes.
- Riesgos y mejoras residuales (máx. 3 menores) y lo que no se pudo verificar.
- Confirmación de commit/push y del entorno final si aplica.
- **Nunca** presentes como terminado algo que no ha pasado el gate.

## 10. Anti-gaming

Vigila y rechaza estas señales: «funciona» sin ejecutarlo; «lo he revisado» sin fragmento; «es menor» sobre un requisito; «en general cumple» sin puntuar criterio a criterio; «lo dejo para otra ronda» sobre algo asequible; «redondeando llego al 90»; «N/A» por conveniencia; inflar el coste de una mejora para no hacerla; retirar o reenviar paquetes incompletos para no gastar rondas; que un verificador comparta autoría o scope con el autor.

## 11. Uso con Agent Teams (DSH) y alternativa

- Descompón con `team_task_create` y asigna dueño y verificador distintos. Cada tarea declara write scope disjunto y evidencia.
- Crea agentes con `spawn_teammate` (autores y verificadores separados) o `subagent` para verificaciones puntuales. El verificador no puede ser el autor ni compartir el archivo que supervisa.
- El autor se autoevalúa y envía el paquete; el verificador responde con PASS/REWORK; el rework va al autor y se registra la ronda. Usa `send_message`/`team_task_update` y cierra la tarea solo con PASS.
- Para un cambio pequeño, basta un verificador independiente con el diff/artefacto y la rúbrica; para una web/app, sigue el protocolo completo con tareas y supervisión por tarea.
- Si el entorno no permite separar contextos: declara la limitación y queda **BLOCKED** para el gate. Nunca te autosupervisas.

## 12. Referencias

- Protocolo completo: `tools/prompts/maestro-web-autocalidad/PROMPT_MAESTRO_WEB_AUTOCALIDAD_90.md` (§1–§12; rúbrica en §6; supervisión en §7; verificación en §9; entrega en §10).
- Uso y reparto por rol: `tools/prompts/maestro-web-autocalidad/LEEME.md`.
- Evidencia y acta de aprobación: `tools/prompts/maestro-web-autocalidad/EVIDENCIA.md`.
- Reglas de proyecto y diseño: `skills/SKILL_MAESTRA.md`, `skills/SKILL_CREAR.md`, `skills/SKILL_AUDITOR.md`, `skills/SKILL_VERIFICACION_PLAYWRIGHT.md`, `skills/SKILL_CAPTURAS_VERIFICACION.md`, `claude.md`.

## 13. Checklist de activación rápida

- [ ] ¿He cargado `autocalidad-90` antes de tocar el artefacto?
- [ ] ¿He identificado tareas, dueños y verificadores independientes?
- [ ] ¿Cada autor ha escrito su autoevaluación A1–A10 con evidencia y decisión?
- [ ] ¿El verificador reprodujo evidencias y firmó PASS ≥ 90,0 con versión exacta?
- [ ] ¿Cero defectos B/M/Med y máx. 3 menores justificadas?
- [ ] ¿La verificación real del entorno está hecha (navegador/archivo/ejecución)?
- [ ] ¿Commit y push verificados si aplica, sin entregar nada por debajo del umbral?

Si alguna respuesta es «no», **no se entrega**: se corrige, se re-verifica o se declara BLOCKED.
