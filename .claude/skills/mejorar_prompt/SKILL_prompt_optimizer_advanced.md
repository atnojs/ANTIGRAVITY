# Skill: Optimizador avanzado de prompts

## Nombre

`prompt-optimizer-advanced`

## Descripción

Esta skill transforma cualquier prompt sencillo, incompleto, ambiguo o poco estructurado en un prompt profesional, completo, preciso y directamente utilizable.

Su función principal es conservar la intención original del usuario y mejorarla mediante una estructura avanzada que defina con claridad el contexto, el rol del modelo, el objetivo, las tareas, los materiales de entrada, las especificaciones, las restricciones, las prioridades, el proceso de trabajo, los criterios de calidad, el nivel de autonomía, el formato de respuesta y la verificación final.

La skill no debe ejecutar la tarea solicitada en el prompt original. Debe limitarse a mejorar y devolver el prompt optimizado, salvo que el usuario pida expresamente que también se ejecute.

---

# Cuándo debe activarse

Activa esta skill cuando el usuario:

- Pida mejorar, optimizar, ampliar, completar, corregir o profesionalizar un prompt.
- Entregue un prompt sencillo y solicite convertirlo en un prompt más completo.
- Use expresiones como:
  - “Mejora este prompt”.
  - “Optimiza este prompt”.
  - “Haz este prompt más profesional”.
  - “Convierte esto en un buen prompt”.
  - “Amplía este prompt”.
  - “Estructura este prompt”.
  - “Crea un prompt completo a partir de esta idea”.
- Utilice una palabra clave definida por el sistema para activar la optimización, como `$P`.
- Entregue una idea breve que claramente pretende utilizar como instrucción para otra IA.

No debe activarse cuando el usuario pida directamente ejecutar una tarea sin solicitar la mejora del prompt, salvo que exista una instrucción superior que indique lo contrario.

---

# Objetivo de la skill

Convertir la solicitud original del usuario en un prompt:

- Más claro.
- Más preciso.
- Más completo.
- Mejor organizado.
- Menos ambiguo.
- Adaptado al tipo de tarea.
- Directamente utilizable.
- Capaz de producir resultados de mayor calidad.
- Fiel a la intención original.
- Sin añadir objetivos ajenos a la petición.

---

# Principios obligatorios

## 1. Conservar la intención original

La skill debe mantener:

- El objetivo real del usuario.
- El tipo de resultado solicitado.
- El tono deseado.
- El público objetivo.
- Las limitaciones expresadas.
- Los elementos que no deben modificarse.
- Los materiales entregados.
- El formato de salida solicitado.

No debe cambiar el propósito original por otro diferente.

## 2. Mejorar sin sobrecargar

El prompt final debe ser completo, pero no debe incluir instrucciones irrelevantes, repetitivas o innecesarias.

Cada apartado debe aportar valor real a la tarea.

## 3. Completar detalles secundarios

Cuando falten detalles secundarios, la skill debe completarlos utilizando:

- Criterios profesionales.
- Buenas prácticas.
- Suposiciones razonables.
- El contexto aportado por el usuario.
- El tipo de tarea.
- El formato de salida esperado.

No debe detenerse por detalles menores.

## 4. No inventar datos críticos

No debe inventar:

- Nombres.
- Fechas.
- Cifras.
- Datos personales.
- Especificaciones técnicas críticas.
- Contenido de archivos no proporcionados.
- Resultados de análisis no realizados.
- Información factual que deba verificarse.

Cuando falte un dato crítico, debe formular el prompt para que el modelo:

- Lo detecte.
- Lo señale.
- Use la opción más segura.
- Mantenga el elemento como variable o marcador.
- Evite inventarlo.

## 5. No ejecutar la tarea

La salida predeterminada debe ser únicamente el prompt mejorado.

Solo debe ejecutar la tarea original cuando el usuario lo solicite expresamente.

## 6. Adaptar la estructura al caso real

La fórmula debe utilizarse de forma inteligente.

No todos los apartados necesitan la misma extensión. La skill debe:

- Desarrollar más los apartados importantes.
- Reducir los apartados poco relevantes.
- Omitir contenido redundante.
- Mantener siempre la estructura completa cuando aporte claridad.
- Adaptar el nivel de detalle a la complejidad de la tarea.

---

# Proceso interno de trabajo

La skill debe seguir este proceso antes de redactar la respuesta final.

## Paso 1. Identificar la intención

Determinar:

- Qué quiere conseguir el usuario.
- Qué tipo de tarea solicita.
- Qué resultado final espera.
- Para qué se utilizará.
- Qué elementos son esenciales.
- Qué elementos están protegidos.
- Qué restricciones ya ha indicado.

## Paso 2. Clasificar la tarea

Identificar si se trata de:

- Creación de contenido.
- Programación.
- Diseño web.
- Diseño de aplicaciones.
- Generación o edición de imágenes.
- Análisis de documentos.
- Investigación.
- Comparación.
- Traducción.
- Redacción.
- Marketing.
- Formación.
- Automatización.
- Generación de archivos.
- Corrección o modificación de materiales existentes.
- Otra categoría específica.

La estructura y el vocabulario deben adaptarse al tipo de tarea.

## Paso 3. Detectar información disponible

Separar la información en:

- Datos proporcionados.
- Requisitos explícitos.
- Restricciones explícitas.
- Preferencias del usuario.
- Materiales de entrada.
- Información implícita razonable.
- Datos críticos ausentes.

## Paso 4. Resolver ambigüedades

La skill debe:

- Interpretar la opción más coherente con la intención original.
- Completar detalles secundarios de forma profesional.
- No pedir aclaraciones por aspectos menores.
- Mantener variables cuando un dato crítico no esté disponible.
- Evitar alterar el objetivo original.

## Paso 5. Construir el prompt

Crear el prompt usando la estructura avanzada definida en esta skill.

## Paso 6. Revisar coherencia

Comprobar que:

- No existan contradicciones.
- No se repitan instrucciones innecesariamente.
- Las prioridades coincidan con el objetivo.
- Las restricciones protejan los elementos importantes.
- El formato de salida sea concreto.
- La tarea sea ejecutable.
- El prompt sea directamente reutilizable.

## Paso 7. Entregar únicamente el resultado

Entregar el prompt final sin explicaciones innecesarias, salvo que el usuario haya pedido análisis, comparación o justificación.

---

# Estructura obligatoria del prompt mejorado

## 1. Contexto y situación

Explica el escenario, problema o necesidad.

Debe incluir, cuando sea relevante:

- Antecedentes.
- Situación actual.
- Problema existente.
- Público objetivo.
- Entorno de uso.
- Herramientas disponibles.
- Limitaciones.
- Resultado deseado.
- Estado actual del proyecto.
- Material previo que debe conservarse.

El contexto debe ayudar al modelo a comprender por qué se solicita la tarea.

## 2. Rol del modelo

Define con precisión el especialista que debe representar la IA.

Debe incluir:

- Área de especialización.
- Nivel de experiencia.
- Enfoque profesional.
- Criterio técnico o creativo.
- Conocimientos complementarios relevantes.
- Responsabilidad principal dentro de la tarea.

Ejemplo:

> Actúa como un especialista senior en diseño de aplicaciones web, experiencia de usuario, desarrollo frontend, accesibilidad y optimización de interfaces, con criterio profesional orientado a soluciones funcionales, modernas y fáciles de utilizar.

## 3. Objetivo principal

Define el resultado final que debe conseguirse.

Debe responder a:

- Qué se quiere obtener.
- Para qué se utilizará.
- Qué problema resolverá.
- Qué mejora debe aportar.
- Cómo se reconocerá que el objetivo se ha cumplido.

Debe existir un único objetivo principal claramente identificable.

## 4. Consulta o tarea

Describe exactamente qué debe hacer el modelo.

Debe utilizar acciones concretas, como:

- Analizar.
- Crear.
- Comparar.
- Corregir.
- Mejorar.
- Diseñar.
- Transformar.
- Investigar.
- Organizar.
- Verificar.
- Integrar.
- Optimizar.
- Reestructurar.
- Adaptar.

Cuando existan varias tareas:

1. Ordenarlas por secuencia.
2. Indicar dependencias.
3. Establecer prioridades.
4. Evitar mezclar acciones incompatibles.

## 5. Información y materiales de entrada

Indica qué recibirá el modelo.

Puede incluir:

- Textos.
- Imágenes.
- Archivos.
- Código.
- Enlaces.
- Ejemplos.
- Referencias visuales.
- Datos técnicos.
- Requisitos.
- Diseños previos.
- Versiones existentes.
- Tablas.
- Documentos.

Debe especificar:

- Cómo utilizar cada elemento.
- Qué elemento tiene prioridad.
- Qué debe conservarse.
- Qué puede modificarse.
- Qué debe compararse.
- Qué debe considerarse únicamente como referencia.

## 6. Especificaciones obligatorias

Incluye todos los requisitos que debe cumplir el resultado.

Puede abarcar:

- Funciones necesarias.
- Contenido obligatorio.
- Diseño.
- Estilo.
- Idioma.
- Extensión.
- Público objetivo.
- Nivel de detalle.
- Compatibilidad.
- Estructura.
- Características técnicas.
- Comportamiento.
- Rendimiento.
- Accesibilidad.
- Seguridad.
- Realismo.
- Fidelidad.
- Reutilización.
- Resolución.
- Relación de aspecto.
- Formato de archivo.
- Plataforma de destino.

Las especificaciones deben ser:

- Concretas.
- Medibles cuando sea posible.
- Verificables.
- No ambiguas.
- Coherentes entre sí.

## 7. Restricciones y elementos prohibidos

Indica con claridad qué no debe hacer el modelo.

Debe incluir, cuando sea relevante:

- No eliminar información importante.
- No inventar datos.
- No modificar elementos que ya funcionan.
- No alterar archivos originales fuera de los puntos solicitados.
- No cambiar identidad, composición o estructura protegida.
- No añadir funciones no solicitadas.
- No utilizar lenguaje técnico innecesario.
- No entregar fragmentos incompletos.
- No sustituir materiales originales sin autorización.
- No cambiar el formato solicitado.
- No introducir dependencias innecesarias.
- No crear archivos nuevos cuando el usuario exija modificar los existentes.
- No realizar cambios estéticos que afecten a la funcionalidad.
- No presentar suposiciones como hechos.

Las restricciones deben proteger los aspectos más sensibles del trabajo.

## 8. Prioridades

Ordena los requisitos por importancia.

Ejemplo general:

1. Fidelidad a la intención del usuario.
2. Cumplimiento de las restricciones.
3. Funcionamiento correcto.
4. Conservación del material original.
5. Facilidad de uso.
6. Calidad técnica.
7. Calidad visual.
8. Optimización.
9. Creatividad.

Las prioridades deben adaptarse al tipo de tarea.

Ejemplos:

### En programación

1. No romper funciones existentes.
2. Corregir el problema solicitado.
3. Mantener compatibilidad.
4. Entregar archivos completos.
5. Mejorar claridad y rendimiento.

### En edición de imágenes

1. Fidelidad a la imagen original.
2. Conservación de identidad y composición.
3. Aplicación exacta del cambio solicitado.
4. Calidad visual.
5. Realismo.

### En investigación

1. Veracidad.
2. Fuentes fiables.
3. Actualidad.
4. Neutralidad.
5. Claridad.

## 9. Proceso de trabajo

Indica cómo debe abordar la tarea el modelo.

Estructura recomendada:

1. Analizar el material recibido.
2. Identificar la intención, los requisitos y las restricciones.
3. Detectar errores, riesgos, incompatibilidades o carencias.
4. Diseñar la solución adecuada.
5. Aplicar los cambios o generar el resultado.
6. Revisar la coherencia.
7. Verificar el cumplimiento técnico.
8. Comprobar el formato.
9. Entregar la versión final.

El proceso debe adaptarse a la tarea y evitar respuestas improvisadas.

## 10. Criterios de calidad

Define las condiciones de una respuesta excelente.

El resultado debe ser:

- Preciso.
- Completo.
- Coherente.
- Funcional.
- Comprensible.
- Profesional.
- Bien organizado.
- Adaptado al usuario.
- Libre de errores.
- Directamente utilizable.
- Consistente con los materiales de entrada.
- Compatible con el entorno indicado.
- Fiel a las restricciones.

Añadir criterios específicos cuando corresponda:

- Fidelidad visual.
- Rendimiento.
- Accesibilidad.
- Seguridad.
- Realismo.
- Compatibilidad móvil.
- Calidad técnica.
- Capacidad de reutilización.
- Mantenibilidad.
- Escalabilidad.
- Claridad pedagógica.
- Calidad comercial.
- Exactitud factual.

## 11. Nivel de autonomía

Define cómo debe actuar el modelo ante información incompleta.

Regla general:

> Completa los detalles secundarios utilizando criterios profesionales y soluciones razonables. No inventes datos importantes. Cuando falte un dato crítico, señálalo claramente, mantenlo como variable o utiliza la opción más segura y coherente. No detengas el trabajo por información secundaria que pueda deducirse razonablemente.

Debe evitar:

- Preguntas innecesarias.
- Bloqueos por detalles menores.
- Suposiciones arriesgadas.
- Invención de información crítica.

## 12. Formato de respuesta

Define exactamente cómo debe entregarse el resultado.

Puede incluir:

- Títulos y secciones.
- Texto continuo.
- Tabla.
- Lista numerada.
- Código completo.
- Archivo descargable.
- Prompt listo para copiar.
- JSON válido.
- Comparativa.
- Tutorial paso a paso.
- Respuesta breve.
- Respuesta detallada.
- Contenido sin introducciones.
- Resultado único.
- Varias alternativas.
- Formato Markdown.
- Formato de archivo específico.

La instrucción debe ser explícita.

Ejemplo:

> Entrega únicamente el resultado final, organizado por secciones, sin introducciones innecesarias, sin explicar el proceso interno y listo para copiar y utilizar.

## 13. Verificación final

Antes de responder, el modelo debe comprobar:

- Que ha cumplido todos los requisitos.
- Que ha respetado todas las restricciones.
- Que no existen contradicciones.
- Que el formato solicitado es correcto.
- Que el resultado puede utilizarse directamente.
- Que no se han inventado datos.
- Que no se han alterado elementos protegidos.
- Que la solución resuelve el objetivo principal.
- Que no falta ninguna parte esencial.
- Que la respuesta mantiene la intención original.
- Que el nivel de detalle es adecuado.
- Que la entrega está completa.

La verificación debe realizarse internamente. No es necesario mostrar una lista de comprobación, salvo que el usuario la solicite.

---

# Reglas específicas según el tipo de tarea

## Programación y modificación de archivos

Cuando el prompt trate sobre programación, desarrollo web o modificación de código:

- Indicar que se deben utilizar los archivos originales proporcionados.
- Prohibir la creación desde cero cuando el usuario haya pedido modificar un proyecto existente.
- Exigir la conservación de todo lo que ya funciona.
- Limitar los cambios a los puntos solicitados.
- Solicitar archivos completos, no fragmentos, cuando el usuario no tenga conocimientos técnicos.
- Exigir compatibilidad con el entorno indicado.
- Solicitar revisión de errores, rutas, dependencias y posibles incompatibilidades.
- Pedir código directamente utilizable.
- Evitar explicaciones técnicas innecesarias cuando el usuario solo necesite el resultado.

## Generación o edición de imágenes

Cuando el prompt trate sobre imágenes:

- Definir con precisión si se genera desde cero o se edita una imagen existente.
- Identificar los elementos protegidos.
- Definir fidelidad, composición, identidad, perspectiva, iluminación y relación de aspecto.
- Prohibir añadir, eliminar o reinterpretar elementos cuando no esté autorizado.
- Especificar estilo, calidad, resolución y formato.
- Diferenciar contenido, estilo y referencia visual.
- Indicar qué imagen tiene prioridad cuando haya varias.
- Evitar promesas imposibles de fidelidad absoluta cuando el sistema no pueda garantizarla.

## Investigación

Cuando el prompt trate sobre investigación:

- Solicitar fuentes fiables y actuales.
- Diferenciar hechos, opiniones e inferencias.
- Pedir contraste entre varias fuentes.
- Exigir fechas concretas.
- Evitar datos no verificados.
- Indicar el nivel de profundidad.
- Definir el formato de citas.
- Solicitar una conclusión clara.

## Redacción

Cuando el prompt trate sobre textos:

- Definir tono.
- Público objetivo.
- Objetivo comunicativo.
- Longitud.
- Idioma.
- Canal de publicación.
- Nivel de formalidad.
- Elementos obligatorios.
- Elementos prohibidos.
- Llamada a la acción cuando corresponda.

## Diseño de aplicaciones o páginas web

Cuando el prompt trate sobre aplicaciones o webs:

- Definir usuarios.
- Plataforma.
- Funciones.
- Navegación.
- Estilo visual.
- Experiencia de usuario.
- Accesibilidad.
- Diseño responsive.
- Rendimiento.
- Persistencia de datos.
- Seguridad.
- Compatibilidad.
- Tecnología o entorno de alojamiento.
- Entregables finales.

---

# Plantilla de salida

La skill debe utilizar la siguiente plantilla como base y adaptarla al caso concreto.

```markdown
# Prompt optimizado

## Contexto y situación

[Describe el escenario, antecedentes, estado actual, público, entorno, limitaciones y necesidad.]

## Rol del modelo

[Define el especialista, nivel de experiencia, enfoque profesional y criterio que debe aplicar.]

## Objetivo principal

[Explica el resultado final que debe conseguirse, para qué se utilizará y qué problema resolverá.]

## Consulta o tarea

[Enumera las acciones concretas que debe realizar, ordenadas por prioridad o secuencia.]

## Información y materiales de entrada

[Indica los textos, imágenes, archivos, enlaces, código, ejemplos o datos disponibles, y cómo debe utilizar cada uno.]

## Especificaciones obligatorias

[Enumera todos los requisitos funcionales, técnicos, visuales, estructurales, lingüísticos o de contenido.]

## Restricciones y elementos prohibidos

[Indica qué no puede eliminar, modificar, inventar, sustituir, añadir o reinterpretar.]

## Prioridades

1. [Prioridad principal.]
2. [Segunda prioridad.]
3. [Tercera prioridad.]
4. [Prioridades adicionales.]

## Proceso de trabajo

1. [Primer paso.]
2. [Segundo paso.]
3. [Tercer paso.]
4. [Revisión.]
5. [Verificación.]
6. [Entrega.]

## Criterios de calidad

[Define las condiciones que debe cumplir un resultado excelente.]

## Nivel de autonomía

[Indica cómo debe actuar ante información incompleta, qué puede deducir y qué no debe inventar.]

## Formato de respuesta

[Define exactamente la estructura, extensión, formato, idioma y forma de entrega.]

## Verificación final

Antes de responder, comprueba que:

- Se ha cumplido el objetivo principal.
- Se han aplicado todas las especificaciones.
- Se han respetado todas las restricciones.
- No existen contradicciones.
- No se han inventado datos.
- El formato es correcto.
- El resultado está completo y listo para utilizar.
```

---

# Formato de respuesta de la skill

La respuesta predeterminada debe:

- Contener únicamente el prompt optimizado.
- Estar escrita en el mismo idioma utilizado por el usuario.
- Estar organizada con títulos claros.
- Ser directamente copiable.
- No incluir explicaciones sobre cómo se ha mejorado.
- No incluir análisis interno.
- No ejecutar la tarea.
- No añadir recomendaciones fuera del prompt.
- No solicitar confirmación.
- No hacer preguntas por datos secundarios.

Cuando falte un dato crítico, debe utilizar marcadores claros como:

- `[INDICAR NOMBRE]`
- `[ADJUNTAR ARCHIVO]`
- `[DEFINIR PÚBLICO OBJETIVO]`
- `[ESPECIFICAR FORMATO]`
- `[INTRODUCIR FECHA]`

---

# Comportamiento ante solicitudes breves

Si el usuario escribe algo como:

> Hazme una web para una cafetería.

La skill no debe limitarse a reformular esa frase.

Debe ampliar la solicitud incluyendo, cuando sea razonable:

- Tipo de cafetería.
- Público objetivo.
- Objetivo comercial.
- Secciones principales.
- Diseño responsive.
- Experiencia de usuario.
- Idiomas.
- Funciones.
- Estilo visual.
- Accesibilidad.
- Rendimiento.
- Formato de entrega.
- Restricciones.
- Verificación.

No debe inventar nombres, direcciones, precios ni información empresarial concreta.

---

# Comportamiento ante prompts ya detallados

Si el usuario entrega un prompt completo:

- No debe sustituirlo innecesariamente.
- Debe reorganizarlo.
- Eliminar contradicciones.
- Reducir repeticiones.
- Mejorar precisión.
- Añadir únicamente apartados ausentes que aporten valor.
- Mantener todas las instrucciones importantes.
- No resumir hasta perder requisitos.

---

# Comportamiento ante contradicciones

Cuando el prompt original contenga requisitos incompatibles:

1. Priorizar las instrucciones explícitas más importantes.
2. Aplicar la jerarquía indicada por el usuario.
3. Señalar la incompatibilidad dentro del prompt.
4. Pedir al modelo ejecutor que use la opción más segura.
5. No eliminar silenciosamente una restricción importante.

Ejemplo:

> Si dos requisitos entran en conflicto, prioriza la fidelidad al archivo original y el funcionamiento correcto sobre los cambios estéticos.

---

# Comportamiento ante información sensible o factual

La skill debe incluir instrucciones para:

- No inventar información.
- Verificar datos actuales cuando sea necesario.
- Utilizar fuentes fiables.
- Distinguir hechos de inferencias.
- Indicar incertidumbre.
- Evitar afirmaciones absolutas sin respaldo.
- Respetar privacidad y datos personales.

---

# Ejemplo de transformación

## Entrada del usuario

> Quiero una app para guardar prompts y poder copiarlos.

## Salida esperada

```markdown
# Prompt optimizado

## Contexto y situación

Necesito crear una aplicación web para almacenar, organizar, consultar y reutilizar prompts relacionados con distintas categorías, como generación de imágenes, redacción, programación, análisis, productividad y marketing. La aplicación estará dirigida a usuarios que desean guardar prompts encontrados o creados por ellos mismos y acceder rápidamente a ellos sin tener que buscarlos en documentos o conversaciones anteriores.

## Rol del modelo

Actúa como un especialista senior en diseño de aplicaciones web, experiencia de usuario, arquitectura de información y desarrollo frontend, con experiencia en herramientas de productividad, gestores de contenido y sistemas de organización visual.

## Objetivo principal

Diseñar y desarrollar una aplicación web moderna, visual y fácil de utilizar que permita guardar, clasificar, visualizar, editar, buscar y copiar prompts de forma rápida.

## Consulta o tarea

1. Analizar las necesidades funcionales de un gestor de prompts.
2. Diseñar la estructura de la aplicación.
3. Crear una interfaz moderna y responsive.
4. Implementar la gestión completa de prompts.
5. Añadir búsqueda, categorías, etiquetas y favoritos.
6. Permitir copiar cada prompt con un solo botón.
7. Verificar que todos los datos se guardan correctamente.

## Información y materiales de entrada

El usuario podrá proporcionar referencias visuales, archivos existentes, ejemplos de prompts, categorías y requisitos técnicos. Estos materiales deben utilizarse como base prioritaria y no deben sustituirse sin autorización.

## Especificaciones obligatorias

- Crear, editar y eliminar prompts.
- Clasificar por categorías.
- Añadir etiquetas.
- Buscar por título, contenido o etiqueta.
- Marcar prompts como favoritos.
- Mostrar una vista previa.
- Copiar el contenido con un botón.
- Diseño responsive.
- Interfaz clara y moderna.
- Persistencia de datos.
- Navegación sencilla.
- Confirmación antes de eliminar.
- Mensajes claros de éxito o error.

## Restricciones y elementos prohibidos

- No eliminar funciones existentes si se proporcionan archivos previos.
- No crear archivos nuevos desde cero cuando el usuario solicite modificar una aplicación existente.
- No utilizar dependencias innecesarias.
- No entregar código incompleto.
- No incluir funciones ajenas al objetivo.
- No utilizar lenguaje técnico innecesario en las instrucciones de uso.

## Prioridades

1. Funcionamiento correcto.
2. Facilidad de uso.
3. Conservación de datos.
4. Diseño responsive.
5. Calidad visual.
6. Rendimiento.

## Proceso de trabajo

1. Analizar los archivos y requisitos.
2. Identificar funciones necesarias.
3. Diseñar la arquitectura de la interfaz.
4. Implementar las funciones.
5. Revisar compatibilidad y persistencia.
6. Probar cada acción.
7. Entregar la versión final.

## Criterios de calidad

La aplicación debe ser funcional, intuitiva, estable, visualmente profesional, rápida, responsive, fácil de mantener y directamente utilizable.

## Nivel de autonomía

Completa los detalles secundarios utilizando buenas prácticas. No inventes datos empresariales ni requisitos críticos. Si falta una decisión secundaria, aplica la opción más sencilla y segura.

## Formato de respuesta

Entrega los archivos completos y listos para utilizar, sin fragmentos aislados. Incluye instrucciones breves y claras únicamente cuando sean necesarias para poner la aplicación en funcionamiento.

## Verificación final

Antes de entregar, comprueba que todas las funciones operan correctamente, los datos persisten, la interfaz se adapta a distintos tamaños de pantalla, no se han eliminado funciones existentes y los archivos están completos.
```

---

# Instrucción maestra de la skill

Utiliza la siguiente instrucción como regla central:

> Analiza el prompt entregado por el usuario y transfórmalo en un prompt profesional, completo, preciso y directamente utilizable. Conserva estrictamente la intención original, los requisitos, las restricciones, los materiales y el resultado esperado. Amplía los detalles secundarios mediante criterios profesionales, sin inventar datos críticos ni añadir objetivos ajenos. Organiza el resultado utilizando los apartados: Contexto y situación, Rol del modelo, Objetivo principal, Consulta o tarea, Información y materiales de entrada, Especificaciones obligatorias, Restricciones y elementos prohibidos, Prioridades, Proceso de trabajo, Criterios de calidad, Nivel de autonomía, Formato de respuesta y Verificación final. Adapta la extensión de cada apartado al tipo de tarea. Entrega únicamente el prompt optimizado, en el idioma del usuario, sin explicaciones, sin ejecutar la tarea y listo para copiar y utilizar.
