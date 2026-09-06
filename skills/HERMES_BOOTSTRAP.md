# Puente de trabajo Antigravity para Hermes

Este archivo conecta Hermes con el mismo sistema de trabajo que usa Codex. La biblioteca canónica y única fuente de verdad está en `E:/ANTIGRAVITY/skills`. No duplicar sus instrucciones dentro de Hermes.

## Arranque obligatorio de cada tarea

Antes de planificar, editar, generar archivos o ejecutar acciones:

1. Enumerar en orden alfabético todos los archivos `E:/ANTIGRAVITY/skills/SKILL_*.md` existentes en ese momento.
2. Leer cada uno completamente. No confiar en una lista antigua ni en el contenido recordado de otra sesión.
3. Si alguno cambia durante la tarea, volver a leer el archivo afectado antes de continuar.
4. Indicar al usuario, en una frase breve, que la biblioteca Antigravity ha sido cargada.
5. Si la ruta o un archivo no se puede leer, comunicarlo con precisión; no fingir que se aplicó el flujo.

## Autoridad y resolución de conflictos

1. La petición actual del usuario tiene prioridad.
2. `SKILL_MAESTRA.md` es la autoridad para crear, editar, reparar o validar código, archivos, componentes, apps y webs. En esos trabajos debe aplicarse siempre, aunque el usuario no la nombre.
3. `SKILL_CREATOR.md` es la versión consolidada y autoritativa para crear o actualizar skills.
4. `SKILL_MEJORADOR_PROMPT.md` se aplica cuando el usuario pide mejorar u optimizar un prompt. No debe bloquear una tarea de código esperando que el usuario reformule una petición ya suficientemente clara.
5. Las demás skills son especializadas: aplicarlas solo cuando el encargo encaje con su función y siempre subordinadas a la maestra en trabajos de producción.
6. `restos.txt` es un archivo de reserva, no una fuente activa de instrucciones.
7. `history.php` y `history-manager.js` son recursos canónicos, no skills. Cada `proxy.php` debe ajustarse a la app y a la lista blanca de modelos definida en `SKILL_MAESTRA.md`.
8. Las skills nativas antiguas de `E:/hermes-data/skills/antigravity` son auxiliares. Ante cualquier diferencia, prevalece la biblioteca canónica de `E:/ANTIGRAVITY/skills`.

## Flujo de producción

Para cualquier creación o modificación:

1. Inspeccionar primero los archivos originales completos, sus consumidores, las instrucciones del repositorio, el estado de Git, la rama y el remoto.
2. Preservar cambios ajenos y contratos existentes. Hacer el cambio mínimo que resuelva el encargo completo.
3. Definir criterios verificables de finalización y contemplar estados inicial, vacío, carga, éxito, error y reintento cuando correspondan.
4. Generar resultados completos y utilizables, sin pseudocódigo, botones falsos ni flujos simulados.
5. Ejecutar comprobaciones proporcionales al riesgo y revisar el diff final.
6. En apps y webs que deban validarse desde el servidor, el commit y el push a la rama desplegada son obligatorios. Esperar el despliegue y probar la URL real en Chrome recorriendo la interfaz y el flujo principal. La inspección de código no sustituye esta validación.
7. No afirmar que algo funciona si no se ha ejecutado la verificación correspondiente. Explicar cualquier limitación real de herramientas o acceso.

## Infraestructura obligatoria de apps y webs

Toda app o web debe integrar copias de estos recursos de historial:

- `E:/ANTIGRAVITY/skills/history.php`
- `E:/ANTIGRAVITY/skills/history-manager.js`

Aplicar exactamente las reglas de integración, seguridad y persistencia definidas en `SKILL_MAESTRA.md`. El servidor es la fuente de verdad del historial; no sustituirlo por `localStorage`. El proxy de una app de imágenes debe aceptar únicamente los cuatro identificadores del bloque canónico y usar `openai-medium` como valor predeterminado.

En el entorno privado de Hostinger:

- `O` corresponde a OpenAI Images directo (`gpt-image-2`).
- `R` corresponde a OpenRouter para Gemini y texto.

No intercambiar las letras ni revelar los valores. El frontend nunca debe contener o recibir las claves.

En cualquier app de generación o edición de imágenes, el único selector permitido es el que esté implementado en ese momento en `apps/dibujo_lineas_copia`. Actualmente contiene dos bloques: `OPENAI` a la izquierda con `MEDIUM` activo por defecto y `HIGHT`, y `GEMINI` a la derecha con `3.1 FLASH` y `3 PRO`. Leer su `index.html`, `app.css` y `app.js` antes de tocar el selector; no recuperar variantes anteriores.

Mientras una IA esté trabajando, usar la experiencia de carga definida en la maestra y mostrar exactamente el texto `IA generando lo solicitado...`.

## Seguridad y entrega

- No mostrar, copiar a Git ni incluir en respuestas claves, tokens, archivos `.env`, credenciales o valores privados.
- No ejecutar acciones destructivas ni reescrituras amplias sin autorización clara.
- No mezclar archivos no relacionados en commits.
- Entregar un resumen breve de lo realizado, las verificaciones ejecutadas, el estado de commit/push/despliegue y cualquier riesgo pendiente.
