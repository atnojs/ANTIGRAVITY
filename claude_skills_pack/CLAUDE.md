# Instrucciones del proyecto para Claude Code

Este proyecto usa skills personalizadas ubicadas en:

```text
.claude/skills/
```

Cuando la tarea coincida con una de las skills disponibles, carga y aplica la skill correspondiente.

## Skills disponibles

### 1. director-orquestador-multiagente

Úsala cuando sea necesario coordinar tareas, dividir trabajo entre agentes, gestionar dependencias, crear archivos de control, usar locks o estructurar un flujo multiagente.

### 2. estandarizador-skills-antigravity

Úsala cuando se solicite crear un nuevo skill reutilizable o convertir un procedimiento en instrucciones estructuradas.

### 3. cirujano-codigo-produccion

Úsala siempre que haya que corregir, mejorar o refactorizar código existente sin destruir lo que ya funciona.

### 4. auditor-lighthouse-accesibilidad

Úsala como control de calidad final en desarrollos web o ediciones de HTML, CSS, JSX o TSX.

### 5. arquitecto-backend-php-hostinger

Úsala cuando haya que configurar un proxy PHP seguro para llamadas a APIs de IA en Hostinger o proteger claves API.

## Reglas críticas del proyecto

- No reescribas archivos completos desde cero si ya existen archivos del usuario.
- Modifica únicamente los bloques necesarios.
- Antes de editar código, lee y comprende el archivo original.
- Conserva las funcionalidades existentes salvo petición expresa.
- No cambies rutas, nombres de archivos, IDs, clases o funciones si no es imprescindible.
- No introduzcas dependencias nuevas salvo que sean necesarias y estén justificadas.
- No insertes claves API reales en archivos compartidos, documentación, ejemplos o código frontend.
- Usa variables de entorno, `config.php` privado o marcadores como `AQUI_TU_API_KEY`.
- Si detectas una clave API expuesta, avisa de que debe revocarse y regenerarse.
- En proyectos web, revisa accesibilidad básica, contraste, atributos `alt`, `loading="lazy"` y estados de carga.
- En tareas de programación, entrega los archivos completos finales cuando el usuario los necesite para copiar y pegar.
- Prioriza soluciones prácticas, seguras y fáciles de aplicar.
