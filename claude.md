# Instrucciones del proyecto para Claude Code

Este proyecto usa skills personalizadas ubicadas en:

```text
.claude/skills/
```

Cuando la tarea coincida con una de las skills disponibles, carga y aplica la skill correspondiente.

## Skill maestra (cárgala SIEMPRE para crear o editar apps/webs)

### crear-editar

Puerta de entrada ÚNICA para crear o editar cualquier app/web del proyecto. Fija las reglas OBLIGATORIAS (estilo hoola, imágenes con FLUX, selectores PRO/MAX + formato + resolución, historial en servidor, proxy.php, diseño responsive, commit+push) y llama a las skills de detalle según haga falta. Úsala en cuanto la tarea sea "crea una app/web…", "haz una herramienta…", "edita / mejora / añade / cambia X en esta app".

## Skills de detalle y apoyo

### director-orquestador-multiagente

Úsala cuando sea necesario coordinar tareas, dividir trabajo entre agentes, gestionar dependencias, crear archivos de control, usar locks o estructurar un flujo multiagente.

### estandarizador-skills-antigravity

Úsala cuando se solicite crear un nuevo skill reutilizable o convertir un procedimiento en instrucciones estructuradas.

### cirujano-codigo-produccion

Úsala siempre que haya que corregir, mejorar o refactorizar código existente sin destruir lo que ya funciona.

### auditor-lighthouse-accesibilidad

Úsala como control de calidad final en desarrollos web o ediciones de HTML, CSS, JSX o TSX.

### arquitecto-backend-php-hostinger

Úsala cuando haya que configurar un proxy PHP seguro para llamadas a APIs de IA en Hostinger o proteger claves API.

### flux-bfl-imagenes

Úsala para generar o editar imágenes con FLUX (Black Forest Labs): API asíncrona, proxy de polling, selectores PRO/MAX + formato + resolución.

### estilo-web-relatos

Úsala para aplicar el estilo hoola/relatos (cian #00D0D0 + verde #26C626, Electrolize, glassmorphism) a una app o web.

### history-server

Úsala para dar historial persistente en el servidor (PHP en Hostinger), en lugar de localStorage.

### mejorar-prompt

Úsala para afinar u optimizar un prompt o un encargo vago antes de crear nada.

## Reglas críticas del proyecto

- Las imágenes se generan/editan SIEMPRE con FLUX (Black Forest Labs). NUNCA con Gemini.
- El estilo es SIEMPRE hoola/relatos: cian `#00D0D0` + verde `#26C626`, tipografía Electrolize, glassmorphism.
- Todo lo que se cree o edite debe ser RESPONSIVE (se ve y funciona bien en móvil, tablet y escritorio).
- Las apps que generen/editen imagen deben llevar selectores PRO/MAX + formato (AR) + resolución (512/1024/2048/4096).
- El historial es SIEMPRE persistente en el servidor (PHP), nunca solo en localStorage.
- No reescribas archivos completos desde cero si ya existen archivos del usuario. Modifica únicamente los bloques necesarios.
- Antes de editar código, lee y comprende el archivo original.
- Conserva las funcionalidades, rutas, nombres de archivos, IDs, clases y funciones existentes salvo petición expresa.
- No introduzcas dependencias nuevas salvo que sean necesarias y estén justificadas.
- No insertes claves API reales en archivos compartidos, documentación, ejemplos o código frontend.
- La clave de FLUX va en `SetEnv F "bfl_..."` del `.htaccess` RAÍZ de Hostinger, NUNCA en git.
- Si detectas una clave API expuesta, avisa de que debe revocarse y regenerarse.
- En proyectos web, revisa accesibilidad básica: contraste, atributos `alt`, `loading="lazy"`, foco visible y estados de carga.
- Haz commit + push tras CADA cambio de archivo (el webhook de Hostinger despliega automáticamente).
- Prioriza soluciones prácticas, seguras y fáciles de aplicar.
