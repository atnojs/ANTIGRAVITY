---
name: metodo-copiloto
description: Aplica el Método Copiloto de NextGen IA Hub para construir prompts profesionales en dos fases (crear prompt → ejecutar tarea). Usar cuando el usuario quiera crear una app, investigar un tema o configurar un asistente personalizado usando una de las 3 plantillas maestras. También cuando pida "aplicar el método copiloto", "crear un prompt con plantilla copiloto", o necesite refinar prompts existentes.
---

# Método Copiloto — NextGen IA Hub

Convertir ideas en prompts profesionales usando el proceso de 2 fases: **primero crea el prompt, después ejecútalo**. No mezclar nunca ambas fases.

## Principio fundamental

> No copies prompts. Aprende a construirlos.

No se necesita memorizar cientos de prompts. Se necesita aprender a convertir una idea en una instrucción clara.

## Regla fundamental (NUNCA ROMPER)

Trabajar en **DOS FASES SEPARADAS**:

1. **FASE 1 (esta conversación):** Usar la plantilla para DEFINIR y CREAR el prompt. Hacer preguntas, detectar huecos. Entregar SOLO el prompt final.
2. **FASE 2 (otra IA o conversación):** Copiar el prompt generado y EJECUTAR la tarea.

**No mezclar fases.** Si el usuario pide ejecutar la tarea en esta misma conversación, recordarle la regla y preguntar si quiere romperla conscientemente.

## Las 3 plantillas maestras

Antes de aplicar cualquier plantilla, preguntar al usuario cuál necesita:

1. **Plantilla 1 — Crear aplicación o herramienta:** convertir una necesidad práctica en especificación clara.
2. **Plantilla 2 — Investigación profunda:** separar hechos, opiniones, marketing, limitaciones y puntos pendientes.
3. **Plantilla 3 — Asistente personalizado:** definir comportamiento, contexto, reglas y límites de una IA.

---

## Plantilla 1: Crear una aplicación o herramienta

### Activación
Cuando el usuario diga: "quiero crear una app/web/herramienta para…", "necesito una herramienta que…", o mencione desarrollo de software sin tener claro el tipo de solución.

### Instrucción universal (pegar al final de cualquier plantilla)

```
IMPORTANTE: En esta conversación no debes ejecutar la tarea final. Tu única función es ayudarme a definirla y crear un prompt profesional. Hazme las preguntas necesarias y, cuando tengas suficiente información, entrega únicamente:
1) Un resumen breve de las decisiones tomadas.
2) El prompt final dentro de un único bloque de código, listo para copiar y pegar.
3) Una lista corta de supuestos o decisiones pendientes.
No ejecutes el prompt. Detente después de entregarlo.
```

### Proceso para Plantilla 1

1. **EXPLICAR:** Pedir al usuario que explique su idea en lenguaje natural.
2. **ORDENAR:** Recopilar objetivo, problema, usuario, funciones, condiciones.
3. **PREGUNTAR:** Hacer estas preguntas clave:
   - ¿Qué tipo de solución necesita? (web app, móvil, panel/tabla, hoja de cálculo, base de datos, automatización, o combinación)
   - Si no lo tiene claro, comparar brevemente las opciones según uso, complejidad, acceso multidispositivo y tipo de información.
   - ¿Consultar/modificar desde cualquier dispositivo?
   - ¿Simplicidad inmediata o solución escalable?
   - ¿Datos locales o en la nube?
   - ¿Filtros necesarios?
   - ¿Integraciones con otras plataformas?
4. **PREGUNTAS ADICIONALES:** Detectar huecos, contradicciones y decisiones pendientes.
5. **PROPONER:** Estructura clara de la herramienta, dividida en fases pequeñas y ordenadas.
6. **ENTREGAR:** Solo el prompt final + resumen + decisiones pendientes. NO programar, NO generar código, NO crear archivos.

### Ejemplo de flujo Plantilla 1

```
Usuario: "Quiero una herramienta para organizar mi canal de YouTube sobre IA."

Agente:
- ¿Qué problema concreto resuelve?
- ¿Quién la usará?
- ¿Qué funciones necesita? (ideas, estados, sponsors, métricas...)
- ¿Desde qué dispositivos?
- ¿Prefiere simplicidad o escalabilidad?
- ¿Qué tipo de solución: web app, base de datos con panel, hoja de cálculo, automatización?
- [Tras respuestas] → Entrega solo el prompt final en bloque de código.
```

---

## Plantilla 2: Investigación profunda

### Activación
Cuando el usuario diga: "investiga sobre…", "analiza esta herramienta…", "compara X con Y…", "quiero saber si merece la pena…", o quiera preparar contenido informativo verificable.

### Proceso para Plantilla 2

1. **DEFINIR:** Tema, objetivo, contexto y audiencia.
2. **PREGUNTAR:** Detectar información faltante, sesgos y puntos ciegos.
3. **ESTRATEGIA:** Crear un plan de investigación con:
   - Preguntas a responder.
   - Tipos de fuentes fiables para cada afirmación.
   - Pruebas reales a realizar.
4. **CATEGORIZAR:** Separar en el prompt final:
   - Hechos comprobables.
   - Opiniones o interpretaciones.
   - Afirmaciones comerciales o promocionales.
   - Puntos fuertes y limitaciones.
   - Riesgos, costes y gastos ocultos.
   - Privacidad y seguridad.
   - Dudas pendientes y puntos a verificar con fuentes externas.
5. **ENTREGAR:** Solo el prompt final + resumen + pendientes. NO investigar, NO buscar datos, NO concluir.

### CLAVE
Una respuesta que suena convincente no siempre es correcta. Exigir siempre distinguir lo confirmado de lo pendiente. No inventar datos, enlaces, cifras ni fuentes. Marcar como "pendiente de verificación" lo no confirmado.

---

## Plantilla 3: Asistente personalizado

### Activación
Cuando el usuario diga: "configura un asistente…", "crea instrucciones para un GPT…", "quiero que la IA se comporte como…", "necesito un asistente especializado en…".

### Proceso para Plantilla 3

1. **RECOPILAR:**
   - Área, tareas y resultados que debe conseguir.
   - Tipo de usuario y nivel de conocimiento.
   - Personalidad o estilo (tono, claridad, nivel de detalle).
   - Contexto que debe conocer (datos, preferencias, reglas, objetivos, procesos).
   - Comportamientos obligatorios (verificaciones, preguntas, formato).
   - Comportamientos prohibidos (errores, tono, respuestas genéricas, suposiciones).
   - Qué hacer cuando no tenga información suficiente.
2. **DETECTAR:** Contradicciones, ambigüedades, reglas faltantes.
3. **PREGUNTAR:** Hacer preguntas necesarias para cerrar huecos.
4. **ESTRUCTURAR:** Identidad, funciones, reglas, límites y formato de respuesta.
5. **ENTREGAR:** Solo las instrucciones finales + resumen + reglas o datos pendientes. NO actuar como el asistente.

### CLAVE
No se está entrenando un modelo nuevo: se está configurando su comportamiento, contexto, reglas y límites. Una buena configuración busca una IA **útil, crítica y coherente**, no una IA complaciente.

---

## Refinamiento post-ejecución

Después de probar el prompt en Fase 2, ofrecer estos prompts de mejora:

1. "Revisa este prompt y señala las cinco ambigüedades que podrían producir resultados inconsistentes."
2. "Reescribe el prompt para que sea más claro y un 30% más breve, sin perder requisitos importantes."
3. "Añade criterios de calidad objetivos para poder comprobar si la respuesta cumple lo pedido."
4. "Crea tres casos de prueba: uno normal, uno difícil y uno que debería ser rechazado o pedir aclaraciones."
5. "Identifica qué partes son datos confirmados, qué partes son preferencias y qué partes son suposiciones."
6. "Adapta el prompt para [ChatGPT / Claude / Gemini / NotebookLM / herramienta de programación], manteniendo el mismo objetivo."
7. "Reescribe únicamente la sección de [tono / formato / restricciones / proceso] y conserva el resto."

### Regla de iteración
Corregir UNA variable cada vez y volver a probar. No cambiar varias cosas a la vez.

---

## Checklist final (11 puntos)

Antes de dar por terminado un prompt en Fase 1, verificar:

| # | Pregunta | Check |
|---|----------|-------|
| 1 | OBJETIVO: ¿Está claro qué debe conseguir la IA? | ☐ |
| 2 | CONTEXTO: ¿Sabe para qué se utilizará el resultado y quién es el usuario? | ☐ |
| 3 | ENTRADA: ¿Se han proporcionado los datos, documentos o fuentes necesarios? | ☐ |
| 4 | DECISIONES: ¿La IA ha preguntado lo que faltaba antes de actuar? | ☐ |
| 5 | RESTRICCIONES: ¿Están definidos límites, presupuesto, privacidad, tono o herramientas? | ☐ |
| 6 | SALIDA: ¿Está claro el formato exacto que se quiere recibir? | ☐ |
| 7 | VERIFICACIÓN: ¿Debe citar fuentes, marcar incertidumbre o evitar inventar datos? | ☐ |
| 8 | CALIDAD: ¿Existen criterios para decidir si el resultado es bueno? | ☐ |
| 9 | PRUEBA: ¿Se ha probado con un caso real y un caso difícil? | ☐ |
| 10 | REUTILIZACIÓN: ¿Se ha guardado la versión que funciona y sus aprendizajes? | ☐ |
| 11 | SEPARACIÓN DE FASES: ¿La IA ha generado solo el prompt y se ha detenido sin ejecutar la tarea? | ☐ |

---

## Biblioteca personal de prompts (recomendar al usuario)

- Poner nombre claro: `tarea + herramienta + versión`
- Guardar fecha de la última prueba y resultado.
- Anotar limitaciones conocidas y casos donde falla.
- Conservar ejemplo de entrada y salida usado para validar.
- Actualizar cuando cambie la herramienta o el proceso.

---

## Interacción con otras skills

- Si el usuario pide mejorar un prompt existente con esta metodología, aplicar esta skill antes que `SKILL_MEJORADOR_PROMPT.md`.
- Si el prompt resultante necesita ejecución de código, derivar a `SKILL_MAESTRA.md`.
- Esta skill es complementaria a `SKILL_MEJORADOR_PROMPT.md`: el Método Copiloto estructura el PROCESO de creación; el mejorador afina el TEXTO del prompt.
