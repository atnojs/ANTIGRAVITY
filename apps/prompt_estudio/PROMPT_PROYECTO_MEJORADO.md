# Prompt optimizado utilizado para crear Prompt Studio Premium

## Objetivo

Diseñar y desarrollar una aplicación web premium llamada **Prompt Studio Premium** que permita a personas sin formación en inteligencia artificial utilizar dos metodologías complementarias:

1. **Método Copiloto**, para transformar una idea poco definida en un prompt profesional.
2. **Mejorador profesional de prompts**, para optimizar un prompt existente conservando su intención.

La aplicación debe decidir automáticamente qué skill usar cuando la persona no lo sepa y permitir también una selección manual.

## Público

Personas principiantes que usan ChatGPT, Claude, Gemini, Flux o agentes de programación, pero no conocen conceptos técnicos de prompting.

## Experiencia principal

1. La persona elige entre modo automático, crear desde cero o mejorar un prompt.
2. Explica con lenguaje normal qué quiere conseguir o pega su prompt actual.
3. Puede indicar de forma opcional la herramienta de destino, nivel de detalle, formato, público, restricciones y contexto.
4. La app ejecuta en servidor la skill correspondiente mediante OpenRouter.
5. Devuelve un prompt final listo para copiar, mejoras aplicadas, supuestos, validación y una puntuación de calidad.
6. Guarda el resultado en un historial persistente del servidor.

## Requisitos funcionales

- Modo automático con detección conservadora de la skill adecuada.
- Modos manuales Método Copiloto y Mejorador.
- Adaptación a ChatGPT, Claude, Gemini, herramientas visuales y agentes de código.
- Niveles compacto, profesional y exhaustivo.
- Salida solo prompt, prompt con mejoras o prompt con diagnóstico.
- Importación local de archivos TXT, Markdown, JSON o CSV de hasta 1 MB como contexto.
- Resultado editable, copiable y descargable en Markdown.
- Historial con búsqueda, apertura, edición, eliminación y vaciado.
- Estados reales de carga, error, éxito y reintento.
- Interfaz responsive y accesible por teclado.

## Arquitectura y seguridad

- Frontend ligero en HTML, CSS y JavaScript sin frameworks innecesarios.
- Backend PHP con un único `proxy.php` para OpenRouter.
- Clave únicamente en servidor mediante la variable `R`, `REDIRECT_R`, `OPENROUTER_API_KEY` o `config.php` privado.
- Endpoint remoto fijo; no aceptar URLs arbitrarias desde el navegador.
- Validar acciones, modelos, tamaños, campos y respuestas.
- Mantener las skills en archivos Markdown protegidos frente al acceso web directo.
- Persistencia mediante `history.php` y `history-manager.js`, con archivos JSON protegidos y bloqueo de escritura.
- No utilizar `localStorage` como fuente de verdad.

## Diseño visual

Aplicar el sistema Hoola/Relatos de la Skill Maestra:

- Cian `#00D0D0`, verde `#26C626` y tipografía Electrolize.
- Fondo fijo con degradado azul profundo, halos difusos y rejilla cian de 46 px.
- Paneles de vidrio azulados con blur de 12 px, bordes cian de 2 px y profundidad visible.
- Acción principal con gradiente cian-verde.
- Diseño compacto, claro y profesional, sin grandes espacios vacíos.
- Overlay obligatorio de carga con fondo translúcido, spinner de tres aros, mensaje `IA generando lo solicitado...` y barra indeterminada sin porcentaje.

## Salida estructurada de la IA

Solicitar un único objeto JSON válido con:

- `title`
- `detected_mode`
- `prompt_final`
- `changes[]`
- `assumptions[]`
- `validation[]`
- `score`
- `metrics.claridad`
- `metrics.contexto`
- `metrics.restricciones`
- `metrics.formato`
- `metrics.verificacion`

Si un modelo no admite `response_format`, repetir la solicitud sin ese parámetro y aplicar una recuperación segura del JSON.

## Criterios de aceptación

1. Una persona principiante puede obtener un prompt sin conocer ninguna terminología de IA.
2. El modo automático diferencia de forma razonable entre una idea y un prompt existente.
3. La clave no aparece en HTML, JavaScript, respuestas ni errores.
4. El resultado puede copiarse, editarse, descargarse y recuperarse después de recargar.
5. Los errores de API o persistencia se muestran claramente; nunca se simula éxito.
6. La interfaz funciona sin scroll horizontal en móvil, tableta y escritorio.
7. Los controles tienen etiquetas, foco visible, estados accesibles y objetivos táctiles cómodos.
8. PHP y JavaScript pasan validación sintáctica y el flujo local de historial funciona.
