# Verificación — Unified Image Studio · Hoola

Fecha: 2026-10-26 · Build: `2.0.2-hoola` · Original intacto en `apps/unified-image-studio/`.

La copia reutiliza el backend PHP/SQLite del original sin cambios de contrato. Lo que se verifica
aquí es que (a) la app arranca y funciona con ese backend, (b) el flujo real del usuario funciona
en Chrome y (c) el estilo Hoola se aplica de forma medible y consistente, también en producción.

## 1. Entorno de prueba

| Elemento | Valor |
|---|---|
| Servidor local | PHP 8.3 (WinGet) con `pdo_sqlite`, `curl`, `sqlite3`, `openssl`, `mbstring`, `-S 127.0.0.1:8777 -t E:\ANTIGRAVITY` |
| Auth de prueba | `PW_ACCESS`/`PW_EDIT` en el entorno del proceso PHP (solo local; producción usa el `.htaccess` raíz) |
| Navegador | Chrome 155 vía `playwright-cli 0.1.22` |
| URL local | `http://127.0.0.1:8777/apps/unified-image-studio-hoola/` |
| URL producción | `https://atnojs.es/apps/unified-image-studio-hoola/` |

## 2. Pruebas ejecutadas y resultado

| # | Prueba | Resultado | Evidencia |
|---|---|---|---|
| 1 | Lint PHP (`api.php`, `proxy.php`, `lib/bootstrap.php`, `lib/jobs.php`) | Sin errores de sintaxis | `php -l` |
| 2 | Sintaxis JS de los 8 módulos + `lightbox.js` | Sin errores (ESM) | `node --check` sobre copia `.mjs` |
| 3 | `GET api.php?action=state` local y producción | `200`, `ok:true`, `configured:true`, `sharedSession:true`, `version:2.0.2-hoola` | petición directa |
| 4 | Login con contraseña del servidor (local) | `200`, cookie de sesión, UI en modo servidor | requests 19/65/91 |
| 5 | Importar imagen (PNG) | Imagen en lienzo, recurso subido (`resource.upload` 200) | captura `18-hoola-imagen.png` |
| 6 | Añadir texto Electrolize | Capa de texto creada y renderizada | captura `23-hoola-texto.png` |
| 7 | Exportar PNG | Descargado en disco: 1024×1024, PNG válido, 57 077 B | `export-hoola.png` + `System.Drawing` |
| 8 | Descargar proyecto `.uis.json` | JSON válido: `schema:1`, doc 1024×1024, 1 capa imagen + recurso base64 | `proyecto-hoola.uis.json` |
| 9 | Recarga y persistencia (local) | Proyecto recuperado del servidor (`project.get` 200), capas intactas | captura `22-hoola-reload2.png` |
| 10 | Guardar versión | `version.list` 200, 1 versión «15:18:14 · 2 capas», toast correcto | eval DOM |
| 11 | Modal de proyectos | Lista del servidor, acciones y cierre | captura `32-hoola-proyectos.png` |
| 12 | Overlay de carga real (job.create interceptado con 3,5 s de retardo) | Visible con `display:flex`, blur `14px saturate(1.8)`, 3 aros de 80 px, texto exacto «IA generando lo solicitado...», barra cian→verde animada, panel 360 px | captura `24-hoola-loading.png` + medidas inline |
| 13 | Error del proveedor sin claves | Overlay se oculta, prompt conservado, toast comprensible «No se pudo generar: …» | captura `25-hoola-error-proveedor.png` |
| 14 | Payload del modelo | Se envía `model:gemini-pro` con prompt, aspecto, resolución, proyecto y documento; por defecto `openai-image-2-low` | interceptación de `job.create` |
| 15 | Lightbox + zoom | Rueda real → escala 3,06; arrastre real → `translate(90px, 60px)`; clic → cierra y resetea; Escape → cierra; aviso canónico visible | capturas `26`/`27` + medidas |
| 16 | Geometría 1920→320 px | `scrollWidth == innerWidth` en los 12 anchos (0 px de desbordamiento); topbar 56 px; paneles 322/336 (292/304 a 1280); selector sin desbordamiento interno | barrido con `setViewportSize` |
| 17 | Panel móvil | Abre superpuesto (348 px), modelos en píldoras sin recorte, sin scroll horizontal | captura `28-hoola-movil-panel.png` |
| 18 | Consola local | Sin errores propios; solo aviso del navegador por campo de contraseña fuera de `<form>` (heredado) | `console` Playwright |
| 19 | Accesibilidad básica | `lang=es`, título y meta descripción, 1 `h1`, imgs con `alt`, botones con etiqueta, inputs con label, sin IDs duplicados ni `tabindex` positivo, `aria-live`, overlay `role=status`, lightbox `role=dialog` | auditoría DOM |
| 20 | Tokens Hoola en runtime | `font-family: Electrolize`, degradado + halos + rejilla 46 px, paneles `rgba(23,79,122,·)` con borde cian 2 px, primario gradiente cian→verde | `getComputedStyle` |
| 21 | **Producción: despliegue** | `version.txt` sirve `2.0.1-hoola`; `index.html` con `last-modified 15:36:43`; webhook de GitHub entregando 200 | petición directa + API GitHub |
| 22 | **Producción: CSP propia** | Cabecera servida: `img-src 'self' data: blob: https:` (sin tailwind/unpkg); consola sin violaciones CSP | cabecera HTTP + `console` |
| 23 | **Producción: importación en modo local** | Tras «Seguir en local», la imagen importada (blob de IndexedDB) se pinta en el lienzo; antes fallaba con 2 errores CSP | capturas `60`–`62` |
| 24 | **Producción: exportación** | PNG descargado 1024×1024 y 57 077 B (idéntico al local). Con el CSP viejo salía en blanco (24 805 B) | `63-prod2-export.png` |
| 25 | **Producción: responsive** | 1440/768/393 sin desbordamiento (`overflowX: 0`) y con capturas | `64`–`66-prod2-*.png` |

## 3. Incidencia detectada y corregida (CSP + blob)

- **Síntoma (solo producción):** al importar una imagen en modo local aparecía la capa pero el
  lienzo no pintaba la imagen; consola: `Loading the image 'blob:…' violates … img-src 'self' data: https:`. El PNG exportado salía en blanco (24 805 B).
- **Causa:** la CSP heredada de la raíz no permitía `blob:`, que es el esquema con el que el
  estudio sirve los blobs de IndexedDB mientras no hay sesión.
- **Corrección:** `.htaccess` propio de la app (mismo patrón que `apps/conversor_multimedia`) que
  sustituye la CSP por una política del proyecto con `blob:` solo en `img-src`/`media-src` y
  scripts/conexiones en `'self'` (commit `33516df0`). Validada primero con un proxy local que
  inyecta la misma cabecera (`50`/`51-csp-local*.png`, `export-csp-local.png`) y después en la URL
  real (`version.txt` + import/export OK).

## 4. Pruebas no ejecutadas y por qué

- **Generación real con proveedor**: el equipo de desarrollo no tiene las claves del `.htaccess`
  raíz (`OPENAI_API_KEY` / `R`). Se ha verificado todo lo anterior al envío y el tratamiento del
  error 500 devuelto por el servidor sin claves. El pipeline es el mismo código que el original.
- **Persistencia con sesión en producción**: requiere la contraseña `PW_ACCESS` de producción, que
  no está disponible para el agente. Se verificó en local con el mismo `api.php`/SQLite; en
  producción se verificó el arranque, el modo local, edición/exportación y la CSP.
- **Restauración desde copia de seguridad** del `storage/`: procedimiento documentado, no probado
  en esta tarea.

## 5. Despliegue

El primer push se desplegó a los ~40 s. Los siguientes (fix CSP y marcador) no se publicaron
durante ~15 min pese a que GitHub entregó todos los hooks con HTTP 200; se re-disparó con commits
vacíos (`baaaace1`, `29569591`) y el despliegue llegó a las 15:36:43 UTC. Verificado con
`version.txt`, cabecera CSP y prueba de import/export en la URL real.

## 6. Correcciones menores de la ronda final (build 2.0.2)

Dos defectos menores detectados por la verificación funcional independiente, corregidos antes de
cerrar:

- **Sello de versión interno desactualizado:** `const BUILD` de `app.js` decía `v2.0.0-hoola`
  mientras `version.txt` ya era `2.0.2-hoola`. Ahora ambos coinciden (`v2.0.2-hoola`).
- **Panel de Utilidades/Biblioteca no se refrescaba tras el login:** mostraba «Modo local · sin
  sesión» hasta recargar. Ahora, al iniciar sesión, se refrescan presupuesto, lista de proyectos,
  información de almacenamiento y utilidades sin recargar la página.
- **Versión de la API desincronizada:** `UIS_VERSION` de `lib/bootstrap.php` seguía en `2.0.0-hoola`
  mientras el build era `2.0.2`. Ahora `api.php?action=state` informa `version: 2.0.2-hoola`, igual
  que `version.txt`, el sello de `app.js` y la ayuda.

