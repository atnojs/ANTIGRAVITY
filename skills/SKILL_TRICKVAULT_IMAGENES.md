---
name: trickvault-imagenes
description: "Úsala para generar o rellenar las imágenes de ejemplo de las tarjetas de apps/trickvault, siempre carpeta por carpeta y con el modelo openai-image-2-low. Actívala cuando Antonio diga 'sigue con las imágenes de trickvault', 'continúa carpeta por carpeta' o 'rellena las tarjetas que no tienen imagen'."
---

# TrickVault — imágenes de ejemplo de las tarjetas

## Objetivo

Que **todas** las tarjetas de comando de imagen de `apps/trickvault` tengan su
ejemplo visible. Se hace **carpeta por carpeta**, y una carpeta no se da por
terminada hasta que está **generada, registrada, verificada y publicada
(commit + push)**. Solo entonces se pasa a la siguiente.

## Modelo (obligatorio)

**`openai-image-2-low`** = `gpt-image-2` con `quality: low`. Es el modelo por
defecto del proyecto (`skills/POLITICA_modelos-imagen.md`) y es el que se usa en
estos lotes por petición expresa de Antonio: la diferencia de coste frente a
`medium` lo justifica. Formato **1:1** (las imágenes que ya hay son 1024×1024 y
480×480). No cambiar de modelo dentro de un lote sin petición expresa.

## Regla de oro (el error que costó una tarde)

**El ejemplo tiene que estar en el repositorio**, en
`apps/trickvault/assets/<carpeta>/<codigo>.jpg`. **Subirlo al store NO basta.**

El motivo está en `index.html`:

- `applyRemoteImages()` hace `if (!imageUrl) { ... return ...; }`: si la tarjeta
  no tiene imagen, **sale antes** de consultar el store.
- `seedAssetImage()` solo devuelve rutas que empiezan por `assets/`, nunca
  `uploads/`.

Resultado: una tarjeta que nació sin imagen **jamás** recogerá la del servidor.
Las ~216 imágenes que sí se sirven desde `uploads/` funcionan porque están
declaradas en `SEED_COMMAND_IMAGES` desde su creación, no por estar subidas.

Corolario: la subida al store es **opcional** y secundaria.

## Dónde vive todo

- App: `apps/trickvault/index.html` (un solo fichero con los datos dentro).
- Ejemplos del repo: `apps/trickvault/assets/<carpeta>/<codigo>.jpg`.
- Registro de ejemplos: `SEED_COMMAND_IMAGES` (objeto) y, para lo añadido
  después, el bloque `Object.assign(SEED_COMMAND_IMAGES, { … })`.
- Relleno de tarjetas ya guardadas: `GENERATED_IMAGE_RELEASES`.
- Herramientas: `tools/trickvault/` (`_carpeta_gen.py`, `_gen_spec*.py`,
  `_carpeta_upload.py`, `_carpeta_contact.py`, `_escribir_sujetos.py`).
- Carpetas con `[OBJETO]` en el prompt: necesitan un sujeto concreto por
  tarjeta (`SUJETOS_POR_CARPETA` en `_carpeta_gen.py`). Sin sujeto no se genera.

## Flujo por carpeta

1. **Elegir carpeta y contar**: qué tarjetas de esa carpeta son comandos de
   imagen (tienen entrada en `PROMPT_TEMPLATES`) y **no** tienen ejemplo. Las de
   texto (`TEXT_COMMAND_TEMPLATES`) y los trucos escritos a mano (`s1`–`s11`)
   **no llevan imagen nunca**.
2. **Spec**: un `_<carpeta>.json` con `id`, `code`, `desc`, `origen`, `prompt`.
   El prompt que se envía es **exactamente el que copia el usuario**
   (`getTrickCopyText()`: `/codigo` + la parte fija + el cuerpo), con `[OBJETO]`
   sustituido por su sujeto. Comprobar antes de gastar: que lleve la parte fija,
   la coletilla `must be written in Spanish` y ningún `[OBJETO]` suelto.
3. **Generar** con `openai-image-2-low` a `tools/trickvault/<carpeta>_gen/<id>.png`.
4. **Pasar a assets**: convertir a `.jpg` (1024×1024, calidad ~85) en
   `apps/trickvault/assets/<carpeta>/<codigo sin la barra>.jpg`.
5. **Registrar** en el bloque `Object.assign(SEED_COMMAND_IMAGES, { … })`:
   `'/codigo': 'assets/<carpeta>/<fichero>.jpg'`, y añadir la entrada de
   `GENERATED_IMAGE_RELEASES` de esa carpeta
   (`{ category, prefix: 'assets/<carpeta>/', key: 'trickvault-<carpeta>-images-version', version }`).
   Sin esa entrada, las tarjetas **ya guardadas** en un navegador no se rellenan.
6. **Verificar** (obligatorio, ver abajo) y **commit + push**. Solo después,
   siguiente carpeta.

## Verificación obligatoria antes del commit

Hay que reproducir el caso de una tarjeta **ya guardada**, no solo el de un
navegador nuevo:

1. Cargar la app en Chrome headless con perfil propio y `--allow-file-access-from-files`.
2. Leer `localStorage['trickvault_data']`, **vaciar a propósito** el `imageUrl`
   de las tarjetas de esa carpeta, borrar las claves `<carpeta>-images-version`
   y recargar el iframe.
3. Comprobar que tras recargar cada tarjeta recupera su `assets/…jpg`.
4. Comprobar que los ficheros cargan de verdad (`naturalWidth > 0`).
5. Validar la sintaxis del JSX incrustado con `@babel/parser` antes de publicar.
6. Verificar en la URL pública que el `index.html` trae los registros y que los
   `.jpg` responden 200.

## Trampas comprobadas

- **Nunca matar Chrome filtrando por nombre de proceso.** `Get-Process chrome |
  Stop-Process` cierra también el Chrome de Antonio y sus accesos de escritorio
  (WhatsApp, Gemini son PWAs de Chrome). Lanzar siempre con `--user-data-dir`
  propio y matar **solo el PID que uno mismo arrancó**.
- **Sin `--allow-file-access-from-files`** no se puede leer `iframe.contentDocument`
  desde `file://`.
- Las tarjetas sin imagen **no** son imágenes rotas: los ficheros de `assets/`
  existen. No confundir "sin ejemplo" con "imagen que falla".
- Al leer bloques grandes de `index.html` con regex (por ejemplo
  `PROMPT_TEMPLATES`), usar lookahead `(?=\n)`: si el patrón consume el salto de
  línea final, captura **una de cada dos** entradas.
- Los `id` de catálogo son posicionales (`ig-dcek-NNN`, `xl-cmd-NNN`,
  `cap-cmd-NNN`). Para quitar una tarjeta **nunca** se borra la entrada del array
  (desplaza todos los ids): se usa `flatMap` + `return []`, y si la tarjeta ya
  está guardada, su id se añade a `REMOVED_IMAGE_IDS`.

## Qué NO es un duplicado

Dos tarjetas con el mismo código **no** son duplicadas si el prompt es distinto:
dan resultados distintos y son dos herramientas. Solo es duplicado si coinciden
código **y** prompt **y** ejemplo.
