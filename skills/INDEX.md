# Índice de skills — ANTIGRAVITY

**Para qué sirve:** cargar la puerta + la ficha que toca en vez de leer los 28 ficheros (≈290 KB, ≈75k tokens) antes de cada tarea.

**Qué es y qué no es:** este índice está generado desde el `frontmatter` y la estructura de cada `SKILL_*.md` (2026-11-09). Dice **cuál abrir**; no sustituye su contenido. Cuando una skill entra en juego, se lee entera.

---

## 1. Puertas obligatorias (siempre, antes de tocar nada)

| Ficha | `name` | Cuándo | KB |
|---|---|---|---|
| `SKILL_MAESTRA.md` | `maestra-produccion-antigravity` | Protocolo central: cómo producir. Todo archivo, app, interfaz o proyecto que se cree o modifique. | 64,8 |
| `SKILL_AUTOCALIDAD_90.md` | `autocalidad-90` | Cuándo se puede entregar: gate ≥ 90,0 con verificación independiente. Sin PASS no hay entrega (BLOCKED). | 14,8 |

> Suelo de coste: ~22k tokens. El índice no lo evita — evita el resto.

## 2. Crear

| Ficha | Cuándo | KB |
|---|---|---|
| `SKILL_CREAR.md` | App, web o herramienta nueva: orquesta planificación, diseño, código, historial, auditoría y despliegue. | 10,8 |
| `SKILL_style-guide-antigravity.md` | Aplicar la estética Neon Glassmorphism (fondos oscuros, neón, cristal, Electrolize). | 5,0 |
| `SKILL_history-server.md` | Historial persistente server-side en Hostinger para una app. | 4,8 |
| `SKILL_CREATOR.md` | Convertir un proceso repetitivo en una skill nueva. | 3,4 |
| `SKILL_estandarizador-skills-antigravity.md` | Estandarizar o reescribir una skill existente (niveles de libertad, recursos, validación). | 5,3 |

## 3. Editar y recrear

| Ficha | Cuándo | KB |
|---|---|---|
| `SKILL_EDITAR_cirujano-codigo-produccion.md` | Corregir, ampliar o refactorizar código existente sin destruir lo previo (8 pasos + gate). | 8,8 |
| `SKILL_RECREAR_DESDE_REFERENCIA.md` | Recrear una interfaz desde captura/Dribbble/mockup, mapeada a tokens de marca. No copia al píxel. | 4,6 |

## 4. Verificar y entregar

| Ficha | Cuándo | KB |
|---|---|---|
| `SKILL_CAPTURAS_VERIFICACION.md` | Todo cambio con efecto visual: geometría real en Chrome, antes/después, capturas en la respuesta. | 6,3 |
| `SKILL_VERIFICACION_PLAYWRIGHT.md` | Probar de verdad el flujo completo (clics, formularios, subida/descarga, consola, red, 3 anchos). | 5,8 |
| `SKILL_AUDITOR.md` | Control final antes de dar por cerrado un desarrollo web: Lighthouse, SEO, contraste, teclado, formularios. | 10,3 |

## 5. Publicar

| Ficha | Cuándo | KB |
|---|---|---|
| `SKILL_GIT_PUBLICAR.md` | Commit aislado, push a `main`, despliegue de Hostinger y verificación de lo servido. Actívala al terminar **cualquier** cambio. | 13,2 |

## 6. Pensar el encargo

| Ficha | Cuándo | KB |
|---|---|---|
| `SKILL_investigacion.md` | «Examina esta URL», «investiga X», «¿esto nos viene bien?»: dossier con fuentes verificadas. | 5,5 |
| `SKILL_brainstorming-pro.md` | Generar opciones con criterio y una recomendación (nombres, hooks, formatos, enfoques). | 3,0 |
| `SKILL_planificacion-pro.md` | Pasar de idea a plan ejecutable: fases (máx. 4), riesgos, checklist. | 2,9 |
| `SKILL_MEJORADOR_PROMPT.md` | Reescribir un prompt incompleto sin ejecutar la tarea. | 10,4 |
| `SKILL_METODO_COPILOTO.md` | Construir prompts profesionales con las 3 plantillas maestras (dos fases). | 10,4 |
| `SKILL_MEJORA_CONTINUA.md` | Un fallo costoso o algo que se repite por tercera vez → regla reutilizable con evidencia. | 4,0 |
| `SKILL_director-orquestador-multiagente.md` | Coordinar varios agentes en paralelo: roles, dependencias, `.lock`, mensajería. | 6,9 |
| `SKILL_SUPERAGENT.md` | Trabajo que llega por GitHub (issue/comentario/PR), operar el superagente (filtro→router→workers, tickets, panel) o instalarlo. Fija rama `agent/<ticket>`, PR sin merge y límites de atención. | 8,9 |

## 7. Apps y medios concretos (cargar solo si el encargo es ese)

| Ficha | Cuándo | KB |
|---|---|---|
| `SKILL_unified-image-studio-hoola.md` | Dudas de **manejo** de la app Unified Image Studio · Hoola (generar, máscara, exportar, versiones). Para modificarla: `crear` + `cirujano`. | 33,8 |
| `SKILL_TRICKVAULT_IMAGENES.md` | Rellenar imágenes de tarjetas de `apps/trickvault`, carpeta por carpeta, con `openai-image-2-low`. | 9,1 |
| `SKILL_VIDEOVAULT_VIDEOS.md` | Generar y subir los vídeos de las tarjetas de `video-vault` (Flow/Veo). | 9,9 |
| `SKILL_GOOGLE_FLOW.md` | Vídeos gratis con Veo vía la CLI de `E:/herramientas/google-flow`, o implantar el modelo `flow` en una app. | 10,9 |
| `SKILL_analista-visual-pro.md` | Analizar una imagen para clonarla o extraer su prompt. | 4,0 |
| `SKILL_arquitecto-backend-php-hostinger.md` | Proxies seguros con APIs de IA en PHP de Hostinger, aislando claves. | 6,0 |
| `SKILL_ZAPIER_MCP.md` | Conectar Hermes a apps externas vía Zapier MCP (solo lectura primero). | 4,7 |

---

## 8. Orden de carga típico

| Encargo | Cargar |
|---|---|
| Cualquier cambio | `AUTOCALIDAD_90` + `MAESTRA` |
| Crear app/web | + `CREAR` (+ `style-guide`, + `history-server`) |
| Editar código existente | + `EDITAR_cirujano` |
| Entregar web | + `CAPTURAS_VERIFICACION` + `VERIFICACION_PLAYWRIGHT` + `AUDITOR` |
| Cerrar el trabajo | + `GIT_PUBLICAR` |
| Encargo ambiguo | + `brainstorming-pro` o `planificacion-pro` |
| «Examina esta URL» | + `investigacion` |
| Trabajo que llega por GitHub | + `SUPERAGENT` |
| App concreta | + su ficha de la sección 7 |

## 9. Mantenimiento

- Al crear, renombrar o borrar un `SKILL_*.md`, **actualizar este índice en el mismo commit**.
- Origen de cada fila: el campo `description` del frontmatter y los `##` del fichero. Si cambia la descripción, cambia la fila.
- Conteo vigente (2026-11-09): **28** `SKILL_*.md` en `skills/`. El `AGENTS.md` de la raíz, creado en esa fecha, no lleva lista propia: apunta a este índice. La lista obsoleta de 26 fichas estaba en el `AGENTS.md` del workspace de DeepSeek Harness (fuera de este repo) y sigue sin actualizar allí.
