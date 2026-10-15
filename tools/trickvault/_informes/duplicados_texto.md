# Duplicados en las tarjetas de TEXTO (`xl-texto`) — TrickVault

**Revisión analizada:** `apps/trickvault/index.html` sha256 `300f0c74d40cdc5eb4293a384b3c47a1e32b003fe1037f80dc3cfa575d278f9d` (967.581 bytes, 6.931 líneas).
Es **exactamente** el fichero que sirve producción (`atnojs.es/apps/trickvault/index.html`, mismo sha256,
comprobado al cerrar este informe) y el de HEAD en `main`: la foto es la que ve Antonio.
*Deriva:* mientras se escribía esto el Lead tenía cambios sin subir en ese fichero; comprobado que
mantienen **las mismas 118 tarjetas de texto con los mismos ids y códigos** y las mismas 120 plantillas,
así que todo lo de abajo sigue valiendo para la revisión viva.

## 1. Resumen (3 líneas)

1. **En el catálogo no hay ni un duplicado exacto**: las 118 tarjetas de «Comandos de texto» tienen código único, prompt único y ninguna pareja `[código, descripción]` está repetida en los arrays → **no hay nada que retirar del array** (0 ids a borrar por duplicidad).
2. **Las tarjetas duplicadas que ve Antonio son fantasmas guardados en su navegador**: el bloque de texto se renumeró (todas las tarjetas pasaron de `ig-dcek-NNN` a `ig-dcek-NNN+1`, y antes hubo saltos mayores), y `mergeSeedCards` **conserva la tarjeta vieja y añade la nueva** → mismo código, mismo prompt y sin ejemplo distinto = duplicado exacto según la regla del proyecto (`/story` llega a salir **4 veces**).
3. Por eso **no se arreglan con `flatMap` + lista de retiradas**: los ids fantasma son **hoy** los ids vivos de otras tarjetas (los 120), así que apagarlos dejaría sin tarjeta a comandos buenos. Se arreglan con 10 líneas en `mergeSeedCards` (§3.1), **ya probadas**: la carpeta vuelve a 118 tarjetas, 0 duplicados y 0 pérdidas.

| qué | cuántos |
|---|---|
| tarjetas de texto en `xl-texto` | **118** |
| duplicados exactos **en el catálogo** | **0** |
| mismo código con prompt distinto (catálogo) | **0** |
| prompts idénticos con códigos distintos (catálogo) | **0** |
| parejas `[código, descripción]` repetidas en los arrays | **0** |
| códigos de texto que pueden verse duplicados en un navegador con historia | **5** (`/brainstorm`, `/detailed`, `/pricing`, `/ultimate`, `/story`) |
| ids fantasma distintos detectados en toda la historia (126 revisiones + 4 respaldos) | **122** |
| de esos, ids que HOY son de una tarjeta viva (no retirables) | **120 (todos)** |

## 2. Tabla de las 118 tarjetas

`veredicto` = ¿es duplicado exacto (mismo código **y** mismo prompt **y** mismo ejemplo) de otra tarjeta?

| id | código | prompt (120 car.) | veredicto | acción propuesta |
|---|---|---|---|---|
| `ig-dcek-326` | `/ideas` | Dame 10 ideas originales sobre [TEMA], cada una con una frase explicando por qué funcionaría. | OK — única (no duplicada) | ninguna |
| `ig-dcek-327` | `/studyplan` | Crea un plan de estudio de [DURACIÓN] para aprender [TEMA], con objetivos semanales, sesiones diarias y repaso espaciad… | OK — única (no duplicada) | ninguna |
| `ig-dcek-328` | `/language` | Diseña un plan para aprender [IDIOMA] desde [NIVEL], con rutina diaria, recursos y hitos semanales. | OK — única (no duplicada) | ninguna |
| `ig-dcek-329` | `/website` | Propón ideas, estructura y textos para una web de [NEGOCIO/TEMA], con secciones y llamadas a la acción. | OK — única (no duplicada) | ninguna |
| `ig-dcek-330` | `/appidea` | Desarrolla una idea de app para resolver [PROBLEMA]: funcionalidades clave, público objetivo y modelo de negocio. | OK — única (no duplicada) | ninguna |
| `ig-dcek-331` | `/podcast` | Dame ideas de episodios y un guion completo para un podcast sobre [TEMA]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-332` | `/youtube` | Genera ideas y un guion para un vídeo de YouTube sobre [TEMA], con gancho inicial y estructura. | OK — única (no duplicada) | ninguna |
| `ig-dcek-333` | `/instagram` | Escribe captions y hashtags para una publicación de Instagram sobre [TEMA]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-334` | `/marketing` | Crea una estrategia de marketing para [PRODUCTO/NEGOCIO]: canales, mensajes y plan de acción. | OK — única (no duplicada) | ninguna |
| `ig-dcek-335` | `/productivity` | Dame un sistema para ser más productivo con [TAREA], con hábitos, herramientas y horario. | OK — única (no duplicada) | ninguna |
| `ig-dcek-336` | `/health` | Aconseja sobre [TEMA DE SALUD] con información práctica y hábitos sostenibles. | OK — única (no duplicada) | ninguna |
| `ig-dcek-337` | `/cooking` | Receta paso a paso de [PLATO], con ingredientes, tiempos y trucos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-338` | `/money` | Guíame para gestionar [SITUACIÓN FINANCIERA]: presupuesto, ahorro y prioridades. | OK — única (no duplicada) | ninguna |
| `ig-dcek-339` | `/books` | Recomiéndame libros sobre [TEMA], con una frase de por qué cada uno. | OK — única (no duplicada) | ninguna |
| `ig-dcek-340` | `/career` | Oriéntame profesionalmente: pasos concretos para avanzar en [SECTOR/PUESTO]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-341` | `/motivation` | Mensaje de motivación diario para [SITUACIÓN], práctico y sin frases vacías. | OK — única (no duplicada) | ninguna |
| `ig-dcek-342` | `/creative` | Ejercicios y técnicas para potenciar la creatividad en [CAMPO]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-343` | `/solve` | Guíame para resolver [PROBLEMA] paso a paso, con opciones y su mejor solución. | OK — única (no duplicada) | ninguna |
| `ig-dcek-344` | `/anything` | Explora [TEMA] en profundidad: contexto, puntos clave y ángulos poco obvios. | OK — única (no duplicada) | ninguna |
| `ig-dcek-345` | `/planner` | Crea un plan personalizado para [OBJETIVO], con pasos, plazos y recursos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-346` | `/socialpost` | Crea el contenido para una publicación en [RED] sobre [TEMA], listo para publicar. | OK — única (no duplicada) | ninguna |
| `ig-dcek-347` | `/goals` | Ayúdame a definir y alcanzar [OBJETIVO]: metas medibles, hitos y revisión. | OK — única (no duplicada) | ninguna |
| `ig-dcek-348` | `/calendar` | Organiza mi agenda para [PERIODO/TAREA]: bloques de tiempo y prioridades. | OK — única (no duplicada) | ninguna |
| `ig-dcek-349` | `/learn` | Explícame [TEMA] de forma simple, con analogías y ejemplos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-350` | `/fitness` | Plan de entreno y dieta para [OBJETIVO FÍSICO], con rutina semanal. | OK — única (no duplicada) | ninguna |
| `ig-dcek-351` | `/summarize` | Resume este contenido largo en [N] puntos clave: [TEXTO] | OK — única (no duplicada) | ninguna |
| `ig-dcek-352` | `/recipes` | Dame recetas con [INGREDIENTES], fáciles y con pasos claros. | OK — única (no duplicada) | ninguna |
| `ig-dcek-353` | `/translate` | Traduce al [IDIOMA]: [TEXTO] | OK — única (no duplicada) | ninguna |
| `ig-dcek-354` | `/itinerary` | Itinerario de viaje para [DESTINO] durante [N] días, con tiempos y transporte. | OK — única (no duplicada) | ninguna |
| `ig-dcek-355` | `/code` | Escribe o depura código para [TAREA], con explicación línea a línea. | OK — única (no duplicada) | ninguna |
| `ig-dcek-356` | `/business` | Ideas y estrategia de negocio para [SECTOR]: oportunidades, riesgos y primeros pasos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-357` | `/resume` | Mejora mi currículum para [PUESTO]: estructura, logros y palabras clave. | OK — única (no duplicada) | ninguna |
| `ig-dcek-358` | `/invest` | Analiza una inversión en [ACTIVO]: riesgos, expectativas y alternativas. | OK — única (no duplicada) | ninguna |
| `ig-dcek-359` | `/email` | Escribe un correo profesional para [MOTIVO], claro y con tono adecuado. | OK — única (no duplicada) | ninguna |
| `ig-dcek-360` | `/meditate` | Guía de mindfulness para [MOMENTO/SITUACIÓN]: ejercicios de 5-10 minutos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-361` | `/analyze` | Analiza [DATOS/INFORMACIÓN]: tendencias, patrones y conclusiones. | OK — única (no duplicada) | ninguna |
| `ig-dcek-362` | `/roleplay` | Haz un roleplay para practicar [SITUACIÓN]: simula la conversación conmigo. | OK — única (no duplicada) | ninguna |
| `ig-dcek-363` | `/brainstorm` | Lluvia de ideas para [TEMA]: 20 ideas sin filtro, luego agrúpalas. | OK en el catálogo — puede salir 2-4 veces en tu navegador | aplicar el arreglo de §3.1 (fantasma ig-dcek-362 (git 26/09→15/10)) |
| `ig-dcek-384` | `/human` | Reescribe [TEXTO] para que suene natural y humano, sin tics de IA. | OK — única (no duplicada) | ninguna |
| `ig-dcek-385` | `/expert` | Responde como especialista en [CAMPO] sobre [TEMA], con nivel profesional. | OK — única (no duplicada) | ninguna |
| `ig-dcek-386` | `/ceo` | Analiza [SITUACIÓN] con mentalidad de fundador: visión, decisiones y prioridades. | OK — única (no duplicada) | ninguna |
| `ig-dcek-387` | `/viral` | Ideas de contenido con alto engagement para [TEMA], con gancho y formato. | OK — única (no duplicada) | ninguna |
| `ig-dcek-388` | `/seo` | Optimiza [TEXTO/WEB] para buscadores: palabras clave, estructura y metadatos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-389` | `/critic` | Encuentra las debilidades y errores de [TEXTO/IDEA], con propuestas de mejora. | OK — única (no duplicada) | ninguna |
| `ig-dcek-390` | `/teacher` | Explica [TEMA] de forma clara y sencilla, apta para quien empieza. | OK — única (no duplicada) | ninguna |
| `ig-dcek-391` | `/elis` | Explícame [TEMA] como a un niño de 5 años. | OK — única (no duplicada) | ninguna |
| `ig-dcek-392` | `/brief` | Responde a [PREGUNTA] con la respuesta más corta posible. | OK — única (no duplicada) | ninguna |
| `ig-dcek-393` | `/strategy` | Plan estratégico a largo plazo para [OBJETIVO]: fases, riesgos y métricas. | OK — única (no duplicada) | ninguna |
| `ig-dcek-394` | `/copywriter` | Copy persuasivo para [PRODUCTO]: titular, cuerpo y llamada a la acción. | OK — única (no duplicada) | ninguna |
| `ig-dcek-395` | `/research` | Investiga [TEMA] en profundidad: fuentes, hallazgos y conclusiones. | OK — única (no duplicada) | ninguna |
| `ig-dcek-396` | `/promptengineer` | Mejora este prompt para obtener mejores resultados: [PROMPT] | OK — única (no duplicada) | ninguna |
| `ig-dcek-397` | `/simplify` | Simplifica [TEXTO] a lo esencial, sin perder el significado. | OK — única (no duplicada) | ninguna |
| `ig-dcek-398` | `/detailed` | Explícame [TEMA] de forma completa y detallada, con matices. | OK en el catálogo — puede salir 2-4 veces en tu navegador | aplicar el arreglo de §3.1 (fantasma ig-dcek-397 (respaldo 26/09)) |
| `ig-dcek-400` | `/examples` | Dame ejemplos prácticos de [CONCEPTO], variados y aplicados. | OK — única (no duplicada) | ninguna |
| `ig-dcek-401` | `/analyst` | Analiza [INFORMACIÓN] y dame insights accionables. | OK — única (no duplicada) | ninguna |
| `ig-dcek-402` | `/compare` | Compara [OPCIONES]: pros, contras y cuál elegir según contexto. | OK — única (no duplicada) | ninguna |
| `ig-dcek-403` | `/decision` | Ayúdame a decidir sobre [DECISIÓN]: criterios, opciones y recomendación. | OK — única (no duplicada) | ninguna |
| `ig-dcek-404` | `/action` | Convierte [OBJETIVO] en pasos concretos, ordenados y con plazos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-405` | `/prioritize` | Ordena estas tareas por importancia y urgencia: [LISTA] | OK — única (no duplicada) | ninguna |
| `ig-dcek-406` | `/focus` | Identifica la tarea más importante de [LISTA/SITUACIÓN] y por qué. | OK — única (no duplicada) | ninguna |
| `ig-dcek-407` | `/time` | Plan de gestión del tiempo para [TAREAS]: bloques, pausas y prioridades. | OK — única (no duplicada) | ninguna |
| `ig-dcek-408` | `/study` | Estrategia de estudio eficaz para [MATERIA]: técnicas y plan semanal. | OK — única (no duplicada) | ninguna |
| `ig-dcek-409` | `/quiz` | Hazme un quiz sobre [TEMA] con 10 preguntas y respuestas. | OK — única (no duplicada) | ninguna |
| `ig-dcek-410` | `/interview` | Prepárame para una entrevista de [PUESTO]: preguntas probables y respuestas. | OK — única (no duplicada) | ninguna |
| `ig-dcek-411` | `/mentor` | Responde como mentor personal sobre [SITUACIÓN], con experiencia y honestidad. | OK — única (no duplicada) | ninguna |
| `ig-dcek-412` | `/coach` | Orientación práctica para mejorar [ASPECTO]: plan y seguimiento. | OK — única (no duplicada) | ninguna |
| `ig-dcek-413` | `/consultant` | Recomendaciones profesionales para [PROBLEMA], como consultor externo. | OK — única (no duplicada) | ninguna |
| `ig-dcek-414` | `/editor` | Mejora la claridad y calidad de [TEXTO] manteniendo el estilo. | OK — única (no duplicada) | ninguna |
| `ig-dcek-415` | `/proofread` | Corrige errores gramaticales y ortográficos de [TEXTO]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-416` | `/rewrite` | Reescribe [TEXTO] con mejor redacción, mismo significado. | OK — única (no duplicada) | ninguna |
| `ig-dcek-417` | `/professional` | Reescribe [TEXTO] con tono profesional. | OK — única (no duplicada) | ninguna |
| `ig-dcek-418` | `/casual` | Reescribe [TEXTO] con tono conversacional. | OK — única (no duplicada) | ninguna |
| `ig-dcek-419` | `/friendly` | Reescribe [TEXTO] con tono cálido y amigable. | OK — única (no duplicada) | ninguna |
| `ig-dcek-420` | `/persuasive` | Reescribe [MENSAJE] para que sea más convincente. | OK — única (no duplicada) | ninguna |
| `ig-dcek-421` | `/concise` | Reescribe [TEXTO] eliminando lo innecesario. | OK — única (no duplicada) | ninguna |
| `ig-dcek-422` | `/polish` | Perfecciona [TEXTO] hasta la versión final, puliendo cada frase. | OK — única (no duplicada) | ninguna |
| `ig-dcek-423` | `/tone` | Ajusta el tono de [TEXTO] a [TONO] manteniendo el contenido. | OK — única (no duplicada) | ninguna |
| `ig-dcek-424` | `/storyteller` | Convierte [INFORMACIÓN] en una historia que enganche. | OK — única (no duplicada) | ninguna |
| `ig-dcek-425` | `/hook` | Crea 5 ganchos para [CONTENIDO] que detengan el scroll. | OK — única (no duplicada) | ninguna |
| `ig-dcek-426` | `/headline` | Crea 5 titulares impactantes para [TEMA]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-427` | `/caption` | Captions para [RED] sobre [TEMA], con emojis y llamada a la acción. | OK — única (no duplicada) | ninguna |
| `ig-dcek-428` | `/linkedin` | Contenido para LinkedIn sobre [TEMA], profesional y con historia. | OK — única (no duplicada) | ninguna |
| `ig-dcek-429` | `/reels` | Ideas de reels para [TEMA]: guion, plano y gancho en 3 segundos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-430` | `/script` | Guion completo para [VÍDEO/PRESENTACIÓN], con escenas y narración. | OK — única (no duplicada) | ninguna |
| `ig-dcek-431` | `/sales` | Mensajes de venta para [PRODUCTO]: objeciones y cierre. | OK — única (no duplicada) | ninguna |
| `ig-dcek-432` | `/offer` | Diseña una oferta irresistible para [PRODUCTO]: paquete, bonos y urgencia. | OK — única (no duplicada) | ninguna |
| `ig-dcek-433` | `/brand` | Mensajes y tono de marca para [MARCA]: propuesta de valor y voz. | OK — única (no duplicada) | ninguna |
| `ig-dcek-434` | `/customer` | Piensa como el cliente de [PRODUCTO]: qué le importa y qué objeta. | OK — única (no duplicada) | ninguna |
| `ig-dcek-435` | `/audience` | Analiza el público objetivo de [PRODUCTO]: perfil, dolores y deseos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-436` | `/competitor` | Analiza a [COMPETENCIA]: fortalezas, debilidades y cómo diferenciarte. | OK — única (no duplicada) | ninguna |
| `ig-dcek-437` | `/market` | Analiza las oportunidades de mercado para [PRODUCTO]: tamaño, tendencias y huecos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-438` | `/startup` | Piensa como estratega de startups sobre [IDEA]: validación, MVP y crecimiento. | OK — única (no duplicada) | ninguna |
| `ig-dcek-439` | `/pricing` | Estrategia de precios para [PRODUCTO]: modelos, anclas y psicología. | OK en el catálogo — puede salir 2-4 veces en tu navegador | aplicar el arreglo de §3.1 (fantasma ig-dcek-438 (respaldo 26/09)) |
| `ig-dcek-441` | `/growth` | Oportunidades de crecimiento para [NEGOCIO]: canales y experimentos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-442` | `/content` | Estrategia de contenido para [MARCA]: pilares, formatos y calendario. | OK — única (no duplicada) | ninguna |
| `ig-dcek-443` | `/unpopular` | Cuestiona la idea convencional de [TEMA] con argumentos sólidos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-444` | `/devilsadvocate` | Defiende el punto de vista contrario sobre [TEMA]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-445` | `/contrarian` | Dame perspectivas alternativas sobre [TEMA] que casi nadie considera. | OK — única (no duplicada) | ninguna |
| `ig-dcek-446` | `/assumptions` | Identifica las suposiciones ocultas en [PLAN/IDEA]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-447` | `/risks` | Identifica los riesgos de [PLAN/DECISIÓN] y cómo mitigarlos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-448` | `/factcheck` | Separa hechos de opiniones en [TEXTO]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-449` | `/verify` | Señala qué afirmaciones de [TEXTO] necesitan verificación. | OK — única (no duplicada) | ninguna |
| `ig-dcek-450` | `/logic` | Comprueba el razonamiento de [ARGUMENTO] y señala sus fallos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-451` | `/rootcause` | Encuentra la causa raíz de [PROBLEMA] con los 5 porqués. | OK — única (no duplicada) | ninguna |
| `ig-dcek-452` | `/debug` | Encuentra y soluciona los problemas de [CÓDIGO/SISTEMA]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-453` | `/solution` | Genera soluciones prácticas para [PROBLEMA], con pros y contras. | OK — única (no duplicada) | ninguna |
| `ig-dcek-454` | `/alternative` | Sugiere alternativas mejores a [OPCIÓN ACTUAL]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-455` | `/optimize` | Mejora [PROCESO/ENFOQUE] con cambios concretos y medibles. | OK — única (no duplicada) | ninguna |
| `ig-dcek-456` | `/automate` | Formas de automatizar [TAREA]: herramientas y pasos. | OK — única (no duplicada) | ninguna |
| `ig-dcek-457` | `/template` | Plantilla reutilizable para [DOCUMENTO/TAREA]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-458` | `/checklist` | Lista de verificación para [TAREA], ordenada por fases. | OK — única (no duplicada) | ninguna |
| `ig-dcek-459` | `/framework` | Estructura [TEMA] en un marco de trabajo claro, paso a paso. | OK — única (no duplicada) | ninguna |
| `ig-dcek-460` | `/matrix` | Matriz de decisión para [OPCIONES] con criterios ponderados. | OK — única (no duplicada) | ninguna |
| `ig-dcek-461` | `/table` | Convierte [INFORMACIÓN] en una tabla clara. | OK — única (no duplicada) | ninguna |
| `ig-dcek-462` | `/json` | Devuelve la respuesta en JSON válido sobre [DATOS]. | OK — única (no duplicada) | ninguna |
| `ig-dcek-463` | `/reverse` | Trabaja hacia atrás desde [RESULTADO DESEADO] hasta el primer paso. | OK — única (no duplicada) | ninguna |
| `ig-dcek-464` | `/ultimate` | Respuesta completa y potente sobre [TEMA], sin límite de detalle. | OK en el catálogo — puede salir 2-4 veces en tu navegador | aplicar el arreglo de §3.1 (fantasma ig-dcek-463 (git 26/09→15/10)) |
| `ig-dcek-593` | `/story` | Escribe una historia sobre [TEMA] con personajes, conflicto y final. | OK en el catálogo — puede salir 2-4 veces en tu navegador | aplicar el arreglo de §3.1 (fantasma ig-dcek-592 (git), ig-dcek-464 y ig-dcek-363 (respaldos 25-28/09)) |

### 2.b Tarjetas escritas a mano (`s1`..`s11`)

Comprobadas una a una: **no hay duplicados** entre ellas (título, descripción, `codeSnippet` y carpeta
distintos en las 11), ninguna comparte `codeSnippet` con el catálogo y no hay títulos repetidos en todo
el catálogo. Si Antonio se refería a estas, no hay nada que quitar.

| id | título | carpeta | codeSnippet (1ª línea) |
|---|---|---|---|
| `s1` | Buscar historial con Ctrl+R | `xl-dev` | `# Pulsa Ctrl+R y empieza a escribir ⏎ # Para buscar hacia ad` |
| `s2` | Glassmorphism en 3 líneas CSS | `xl-dev` | `.glass { ⏎   background: rgba(255,255,255,0.08); ⏎   backdro` |
| `s3` | Prompt engineering: Chain of Thought | `xl-dev` | `No: "Resuelve este problema" ⏎ Sí: "Resuelve este problema. ` |
| `s4` | Git bisect: encontrar bugs rápido | `xl-dev` | `git bisect start ⏎ git bisect bad HEAD ⏎ git bisect good v1.` |
| `s5` | Docker prune: limpiar sistema | `xl-dev` | `docker system prune -a --volumes ⏎ # -a: todas las imágenes ` |
| `s6` | Array.from para crear rangos | `xl-dev` | `const range = (n) => Array.from({ length: n }, (_, i) => i);` |
| `s7` | Python f-strings avanzados | `xl-dev` | `n = 1234.5678 ⏎ print(f"{n:,.2f}")      # 1,234.57 ⏎ print(f` |
| `s8` | VS Code: Multi-cursor con Alt+Click | `xl-dev` | `Alt+Click       → cursor múltiple en cualquier punto ⏎ Ctrl+` |
| `s9` | Método Ivy Lee: productividad diaria | `xl-dev` | `📋 Cada noche: ⏎ 1. Escribe 6 tareas para mañana ⏎ 2. Prioríz` |
| `s10` | Regla 5-5-5 para tomar decisiones | `xl-dev` | `⏱️ ¿Importará en 5 MINUTOS? ⏎    → Déjalo pasar. No reaccion` |
| `s11` | El truco del patito de goma (Rubber Duck Debugging) | `xl-dev` | `🐤 Pasos del Rubber Duck Debugging: ⏎ 1. Coge un patito (o cu` |

## 3. Cómo quitarlas

### 3.1 El arreglo que SÍ toca (verificado): 10 líneas en `mergeSeedCards`

El problema no está en los arrays, está en la fusión con lo guardado en el navegador:

```
useLocalStorage (línea ~5466)
  parsed -> filter(id ∉ REMOVED_IMAGE_IDS) -> normalizeTrickCategories -> mergeSeedCards(saved, SEED_TRICKS)
```

`mergeSeedCards` solo comprueba **el id**: si el navegador tiene una tarjeta con el id `ig-dcek-362`
(código `/brainstorm` de la numeración vieja) y hoy ese id es de otra tarjeta, la vieja **se queda** y
además entra la nueva `/brainstorm` (`ig-dcek-363`) → dos tarjetas idénticas en «Comandos de texto».

Sustituir la función actual (`index.html`, `function mergeSeedCards(saved, initial)`) por esta versión
(**probada con las funciones reales de la app**: 0 duplicados y 0 tarjetas perdidas en las 126
revisiones y en los 4 respaldos):

```js
function mergeSeedCards(saved, initial) {
    // Tarjetas de catálogo guardadas con un id de una numeración anterior: su id ya
    // pertenece a OTRO comando, así que son fantasmas (duplican a la tarjeta nueva, que
    // entra por su id de hoy). Se descartan y su id vuelve a su dueño actual.
    // OJO: `saved` llega YA filtrado por REMOVED_IMAGE_IDS (useLocalStorage).
    const seedCodeById = new Map(initial.map(seed => [String(seed.id), getImageCommandKey(seed)]));
    const limpio = saved.filter(item => {
        const codeDelSeed = seedCodeById.get(String(item.id));
        if (codeDelSeed === undefined) return true;              // tarjeta personal: se queda
        if (codeDelSeed === getImageCommandKey(item)) return true; // id de catálogo fiel a su código
        // Una variante personal recuperada puede vivir bajo un id de catálogo: no se toca.
        if (RESTORED_VARIANTS.some(variant => variant.id === item.id ||
            (variant.codeSnippet === getImageCommandKey(item) &&
             String(variant.customPrompt || '') === String(item.customPrompt || '')))) return true;
        return false;                                            // fantasma de numeración anterior
    });
    const existingIds = new Set(limpio.map(item => item.id));
    const newItems = initial.filter(seed => {
        if (existingIds.has(seed.id)) return false;
        // Una variante recuperada puede seguir con su antiguo ID en este navegador.
        if (RESTORED_VARIANTS.some(variant => variant.id === seed.id)) {
            return !limpio.some(item => item.codeSnippet === seed.codeSnippet && String(item.customPrompt || '') === String(seed.customPrompt || ''));
        }
        return true;
    });
    return [...newItems, ...limpio];
}
```

Qué hace y qué no:

- **Quita** solo tarjetas de catálogo cuyo id pertenece hoy a otro comando (los fantasmas).
- **Respeta** tus ediciones: una tarjeta cuyo id sigue siendo suyo se queda tal cual (con `customPrompt`).
- **Respeta** las variantes personales (`RESTORED_VARIANTS`, p. ej. `tv-glassart-optical`).
- **Arregla de propina** el síntoma contrario: hoy un fantasma que ocupa un id vivo **impide entrar**
  a la tarjeta legítima de ese id (esas tarjetas de texto *faltan* o enseñan el texto de otro código).
- Se aplica sola en la siguiente recarga: al no estar ya en la lista guardada, el id queda libre y la
  tarjeta nueva entra. No hace falta que Antonio borre nada.

### 3.2 Lo que NO hay que hacer aquí: `flatMap` + `REMOVED_IMAGE_IDS`

El patrón que usa la app para retirar tarjetas es el de `cap-cmd` / `/glassart`:

```js
// CAPTURE_COMMANDS.flatMap (línea ~3283)
if (REMOVED_IMAGE_IDS.has(id)) return [];
```

**Con los fantasmas de texto ese patrón rompe la app.** Los 120 ids fantasma son **hoy** los ids vivos de
otras tarjetas (comprobado sobre las 126 revisiones y los 4 respaldos). Medido con las funciones reales:

| era del navegador | ids fantasma | si fueran a `REMOVED_IMAGE_IDS` se apagarían |
|---|---|---|
| respaldo 25/09 (`_respaldo_20260925`, `index.html.bak`) | 39 | **39 tarjetas vivas** (p. ej. `ig-dcek-325` /mercury, `ig-dcek-326` /ideas…) |
| respaldos 26-28/09 y git 26/09→15/10 | 118-120 | **118-120 tarjetas vivas** |

Además **no arreglaría nada**: el fantasma no está en ningún array, está en el `localStorage`; lo que
duplica es su **código**, y `REMOVED_IMAGE_IDS` solo sabe de ids.

### 3.3 Si algún día hay que retirar una tarjeta de verdad (patrón de referencia)

Solo para tarjetas que existan en un array y sin tocar los ids posicionales (si se borra la entrada,
todos los `ig-dcek`/`xl-cmd` siguientes se desplazan y las imágenes guardadas apuntan a otro comando):

```js
// 1) en el array, la entrada se queda (no se borra) y se marca como retirada
['/restaurarfotoantigua', 'RETIRADO: fundido en la tarjeta /restaurarfotoantigua'],
// 2) el flatMap devuelve [] para esa posición, sin renumerar el resto
...CAPTURE_COMMANDS.flatMap(([command, meaning], index) => {
    const id = `cap-cmd-${String(index + 1).padStart(3, '0')}`;
    if (REMOVED_IMAGE_IDS.has(id)) return [];
    return [{ id, /* … */ }];
}),
// 3) y su id se añade a la lista de retiradas, que además lo borra de los navegadores
const REMOVED_IMAGE_IDS = new Set([ 'cap-cmd-114', /* … */ ]);
```

No hace falta para nada de este informe: **no hay ninguna tarjeta de texto que retirar**.

### 3.4 Diagnóstico en 10 segundos (para ver lo que tiene Antonio AHORA)

Pegar en la consola del navegador, en `https://atnojs.es/apps/trickvault/` (F12 → Console):

```js
(() => {
  const t = JSON.parse(localStorage.getItem('trickvault_data') || '[]');
  const m = new Map();
  for (const c of t) { const k = String(c.codeSnippet || '').trim(); if (k) m.set(k, [...(m.get(k) || []), c.id]); }
  const dup = [...m.entries()].filter(([, ids]) => ids.length > 1);
  console.table(dup.map(([code, ids]) => ({ codigo: code, copias: ids.length, ids: ids.join(' + ') })));
  return dup.length + ' códigos duplicados de ' + t.length + ' tarjetas';
})()
```

Eso lista exactamente los duplicados reales de su navegador. Los que ya están identificados en las
simulaciones son `/story` (hasta **4** copias: `ig-dcek-593` + `ig-dcek-592` + `ig-dcek-464` +
`ig-dcek-363`), `/brainstorm` (2: `363` + `362`), `/ultimate` (2: `464` + `463`) y, según la era que
tenga guardada, `/detailed` (2: `398` + `397`) y `/pricing` (2: `439` + `438`). Después de aplicar
§3.1 y recargar, ese comando debe devolver **0**.

### 3.5 Cómo comprobarlo al terminar

1. `diff` de la carpeta «Comandos de texto»: debe decir **118** tarjetas (hoy su navegador puede enseñar 119-123).
2. El snippet de §3.4 → **0 códigos duplicados**.
3. Que sigan existiendo las tarjetas buenas: `ig-dcek-326` (`/ideas`) … `ig-dcek-593` (`/story`), y las
   variantes personales (`tv-glassart-optical`, `mu7fpvmx114wfqvaw`).
4. Subir a `main` (Hostinger despliega solo) y recargar producción con el mismo sha256 verificado aquí.

## 4. Qué NO es duplicado (que no se borre de más)

- **Mismo código con prompt distinto** (caso b, no es duplicado): en el catálogo de texto **no hay ningún
  caso**. Sí existe a propósito en las tarjetas de imagen retiradas: en `CAPTURE_COMMANDS` el código
  `/restaurarfotoantigua`, `/colorizarfotoantigua` y `/prepararparaimprimir` aparece **dos veces** (la
  entrada `RETIRADO: …` y la viva). La retirada está apagada con `REMOVED_IMAGE_IDS` (`cap-cmd-114`…
  `cap-cmd-122`): **no tocar**, están ahí para no renumerar.
- **Prompts idénticos con códigos distintos** (caso c, no es duplicado): en el catálogo de texto **no hay
  ningún par** con el prompt idéntico (normalizado, sin espacios de más y sin distinguir mayúsculas).
- **Primos cercanos que NO son duplicados** (prompt distinto → resultado distinto → dos herramientas).
  Los más parecidos, medidos con `difflib` sobre `código + prompt`:
  - `/professional` vs `/casual` (parecido 0.78): «Reescribe [TEXTO] con tono profesional.» / «Reescribe [TEXTO] con tono conversacional.»
  Y estas familias, que conviven a propósito: reescritura y tono (`/editor`, `/proofread`, `/rewrite`,
  `/polish`, `/simplify`, `/concise`, `/human`, `/professional`, `/casual`, `/friendly`, `/persuasive`,
  `/tone`); explicar (`/learn`, `/teacher`, `/elis`, `/detailed`); analizar (`/analyze`, `/analyst`);
  resolver (`/solve`, `/solution`); ideas (`/ideas`, `/brainstorm`); redes (`/instagram`, `/socialpost`,
  `/caption`, `/linkedin`, `/reels`); planes (`/planner`, `/studyplan`, `/study`, `/language`).
- **`/story` no duplica a `/storyteller`**: códigos y prompts distintos.
- **`/funnel` y `/stepbystep`**: son plantillas de texto, pero viven en `xl-negocioredes` y `xl-retroedu`
  a propósito (no están en «Comandos de texto» y no se cuentan entre las 118). No son duplicados; si se
  mueven, se cambia de carpeta una tarjeta que hoy funciona.
- **Variantes personales** (`tv-glassart-optical` vs la tarjeta `/glassart` del catálogo,
  `mu7fpvmx114wfqvaw` vs `/expressionsheet`): mismo comando pero **prompt propio y ejemplo propio** →
  según la regla del proyecto no son duplicados, y la app las conserva a propósito.
- **`s1`..`s11`**: únicas (§2.b).

## 5. Anexo: método y evidencia

- **Foto congelada**: copia del fichero en `%TEMP%\tv_dup_snapshot.html`, sha256 `300f0c74d40cdc5eb4293a384b3c47a1e32b003fe1037f80dc3cfa575d278f9d`. Comprobado que
  es idéntico al de HEAD (`git diff` vacío) y al que sirve producción (`Invoke-WebRequest`, mismo sha256);
  `catalogo.json` de producción leído y comparado (idéntico en contenido al del repo: **sin entradas de
  `xl-texto`**, así que la capa publicada no duplica tarjetas de texto).
- **Extracción de tarjetas**: `tools/trickvault/_carpeta_lote.py` importado como módulo
  (`_lit`, `CODE_FOLDER`, `tarjetas_de('xl-texto')`), con `src` apuntando a la copia congelada.
  Resultado: `tarjetas_de('xl-texto')` = **118** ids, idénticos a los que produce el `flatMap`/`map` real.
- **Duplicados en el catálogo**: agrupación por código y por prompt normalizado
  (`re.sub(r'\s+',' ',p).strip().lower()`), `Counter` sobre las parejas `[código, descripción]` de los 5
  arrays, títulos y descripciones duplicadas en todo el catálogo, y solape
  `PROMPT_TEMPLATES` (1.130 claves de imagen) ∩ `TEXT_COMMAND_TEMPLATES` (120) = **vacío**.
- **Simulación del navegador**: se extrajeron del fichero congelado los bloques literales
  (`CODE_FOLDER`, `INSTAGRAM_COMMANDS`, `ADDITIONAL_IMAGE_COMMANDS`, `ALL_IMAGE_COMMANDS`,
  `REMOVED_IMAGE_IDS`, `SEED_COMMAND_IMAGES`, `EXCEL_COMMANDS`, `CAPTURE_COMMANDS`, `RESTORED_VARIANTS`,
  `REEL_COMMANDS`, `SEED_TRICKS`, `EXCEL_FOLDERS`, `EXTRA_FOLDERS`, `CATEGORY_MOVES`, `CODE_MOVES`) y las
  funciones reales (`getImageCommandKey`, `normalizeTrickCode(s)`, `normalizeTrickCategory`,
  `mergeSeedCards`), y se ejecutaron en Node 24 con la misma secuencia que `useLocalStorage`:
  `filter(REMOVED) → normalizeTrickCategories → mergeSeedCards`. Escenarios: navegador nuevo (118/0
  duplicados), y navegador con el catálogo completo de cada era guardado (respaldos del repo 25/26/28-09
  y las **126 revisiones** de `git log -- apps/trickvault/index.html`, 26/09→15/10).
- **Resultado peor caso** (fantasmas de todas las eras + respaldos, 122 tarjetas fantasma):
  `/story` sale **4 veces** (`ig-dcek-593` + `ig-dcek-592` + `ig-dcek-464` + `ig-dcek-363`);
  con el arreglo §3.1 → **118 tarjetas, 0 duplicados, 0 tarjetas vivas perdidas, 0 variantes perdidas**.
- **Límite honesto**: la lista exacta de copias que tiene Antonio depende de su `localStorage` (no es
  legible desde el repo). Por eso §3.4 trae el comando de consola que la lista en 10 segundos; el arreglo
  §3.1 limpia todos los casos, no uno concreto.
