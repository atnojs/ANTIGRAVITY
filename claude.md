# Instrucciones del proyecto para Claude Code

El contenido canónico de las skills vive en:

```text
skills/
```

`.claude/skills/<nombre>/SKILL.md` son solo **punteros** (conservan el front matter para
que se descubran por su descripción): al abrir uno, lee el archivo `skills/<archivo>.md`
que indica y aplícalo tal cual. No dupliques el contenido en el puntero.

Cuando la tarea coincida con una de las skills disponibles, carga y aplica la skill correspondiente.

## Skill maestra (cárgala SIEMPRE para crear o editar apps/webs)

### crear

Puerta de entrada ÚNICA para crear o editar cualquier app/web del proyecto. Fija las reglas OBLIGATORIAS (estilo hoola, imágenes con OpenAI image 2, selectores de calidad + formato + resolución, historial en servidor, proxy.php, diseño responsive, commit+push) y llama a las skills de detalle según haga falta. Úsala en cuanto la tarea sea "crea una app/web…", "haz una herramienta…", "edita / mejora / añade / cambia X en esta app".

## Skills de detalle y apoyo

### analista-visual-pro

Úsala para el análisis visual hiperpreciso de una imagen: describirla, clonarla o extraer su prompt.

### arquitecto-backend-php-hostinger

Úsala cuando haya que configurar un proxy PHP seguro para llamadas a APIs de IA en Hostinger o proteger claves API.

### auditor-lighthouse-accesibilidad

Úsala de forma obligatoria como control de calidad técnico final antes de dar por completado un desarrollo o edición web.

### brainstorming-pro

Úsala para generar opciones creativas con criterio (nombres, hooks, formatos, enfoques) y obtener una recomendación clara.

### capturas-verificacion

Úsala en toda creación, edición o revisión con efecto visual: mide la geometría real en Chrome (anchos, líneas, desbordes, recortes), guarda la comparativa antes/después y **entrega el resultado con capturas de pantalla** en la respuesta. El resultado visual se enseña, no se describe.

### cirujano-codigo-produccion

Úsala siempre que haya que corregir, mejorar o refactorizar código existente sin destruir lo que ya funciona.

### director-orquestador-multiagente

Úsala cuando sea necesario coordinar tareas, dividir trabajo entre agentes, gestionar dependencias, crear archivos de control, usar locks o estructurar un flujo multiagente.

### estandarizador-skills-antigravity

Úsala cuando se solicite crear un nuevo skill reutilizable o convertir un procedimiento en instrucciones estructuradas.

### history-server

Úsala para dar historial persistente mediante PHP en Hostinger.

### planificacion-pro

Úsala para convertir una idea en un plan ejecutable por fases, con checklist, riesgos y entregables.

### style-guide-antigravity

Úsala para aplicar el estilo hoola/relatos (cian #00D0D0 + verde #26C626, Electrolize, glassmorphism) a una app o web.

## Reglas críticas del proyecto

- **Comprueba SIEMPRE que la app funciona como debe EN UN NAVEGADOR antes de dar nada por terminado.** Recorre el flujo completo del usuario en Chrome, no basta con leer el código, ni con el diff, ni con comprobar el HTML servido: clics, navegación, formularios, subida, **descarga y generación de ficheros (.json incluidos)**, errores, consola y recarga. Una descarga se da por buena solo cuando el fichero aparece en disco y su contenido es válido. No afirmes que algo funciona sin haberlo probado en el entorno que realmente lo ejecutará.
- **Comprueba SIEMPRE que se ha seguido al pie de la letra la skill maestra** (`skills/SKILL_MAESTRA.md`, con sus Fases 4 y 5, y `skills/SKILL_CREAR.md`) y repasa su checklist de salida. Si un paso obligatorio no se ha cumplido, no lo maquilles: dilo y complétalo antes de entregar.
- **Un arreglo sin subir no existe: un commit sin push deja la app rota en producción.** Antes de decir que algo está terminado, `git log --oneline origin/main..HEAD` debe estar vacío y `git status` no debe tener modificados los ficheros del encargo. Comprueba siempre que la versión que se sirve en producción es la que acabas de arreglar (tamaño, hash o marcador del cambio en el fichero servido).
- Las imágenes se generan/editan SIEMPRE con OpenAI image 2 (`gpt-image-2`, calidad `low`, identificador `openai-image-2-low`).
- El estilo es SIEMPRE hoola/relatos: cian `#00D0D0` + verde `#26C626`, tipografía Electrolize, glassmorphism.
- Todo lo que se cree o edite debe ser RESPONSIVE (se ve y funciona bien en móvil, tablet y escritorio).
- Las apps que generen/editen imagen deben llevar selectores de calidad + formato (AR) + resolución (512/1024/2048/4096).
- El historial es SIEMPRE persistente en el servidor mediante PHP en Hostinger.
- No reescribas archivos completos desde cero si ya existen archivos del usuario. Modifica únicamente los bloques necesarios.
- Antes de editar código, lee y comprende el archivo original.
- Conserva las funcionalidades, rutas, nombres de archivos, IDs, clases y funciones existentes salvo petición expresa.
- No introduzcas dependencias nuevas salvo que sean necesarias y estén justificadas.
- No insertes claves API reales en archivos compartidos, documentación, ejemplos o código frontend.
- Si detectas una clave API expuesta, avisa de que debe revocarse y regenerarse.
- En proyectos web, revisa accesibilidad básica: contraste, atributos `alt`, `loading="lazy"`, foco visible y estados de carga.
- Haz commit + push tras CADA cambio de archivo (el webhook de Hostinger despliega automáticamente).
- Trabaja SIEMPRE sobre la rama `main` en `E:\ANTIGRAVITY`. NO crees ramas, worktrees ni copias de trabajo: cada worktree genera una historia paralela con SHAs distintos y deja ramas huérfanas si la tarea se abandona.
- Si por alguna razón abres una rama o un worktree, bórralos al terminar la tarea y publica siempre en `main`.
- El repositorio se despliega en la RAÍZ PÚBLICA de Hostinger: **cualquier archivo versionado es accesible por web**. Nunca versiones scripts de prueba ni herramientas de desarrollo; déjalas en `tools/`, que está protegida por `.htaccess`.
- Prioriza soluciones prácticas, seguras y fáciles de aplicar.
