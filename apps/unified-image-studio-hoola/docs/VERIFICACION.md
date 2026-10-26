# Verificación — Unified Image Studio · Hoola

Fecha: 2026-10-26 · Build: `v2.0.0-hoola` · Original intacto en `apps/unified-image-studio/`.

La copia reutiliza el backend PHP/SQLite del original sin cambios de contrato. Lo que se verifica
aquí es que (a) la app arranca y funciona con ese backend, (b) el flujo real del usuario funciona
en Chrome y (c) el estilo Hoola se aplica de forma medible y consistente.

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
| 3 | `GET api.php?action=state` | `200`, `ok:true`, `configured:true`, `sharedSession:true` | petición directa |
| 4 | Login con contraseña del servidor | `200`, cookie de sesión, UI en modo servidor | requests 19/65/91 |
| 5 | Importar imagen (PNG) | Imagen en lienzo, recurso subido (`resource.upload` 200) | captura `18-hoola-imagen.png` |
| 6 | Añadir texto Electrolize | Capa de texto creada y renderizada | captura `23-hoola-texto.png` |
| 7 | Exportar PNG | Descargado en disco: 1024×1024, PNG válido, 57 KB | `export-hoola.png` + `System.Drawing` |
| 8 | Descargar proyecto `.uis.json` | JSON válido: `schema:1`, doc 1024×1024, 1 capa imagen + recurso base64 | `proyecto-hoola.uis.json` |
| 9 | Recarga y persistencia | Proyecto recuperado del servidor (`project.get` 200), capas intactas, toast «Proyecto recuperado» | captura `22-hoola-reload2.png` |
| 10 | Guardar versión | `version.list` 200, 1 versión «15:18:14 · 2 capas», toast correcto | eval DOM |
| 11 | Modal de proyectos | Lista del servidor, acciones y cierre | captura `32-hoola-proyectos.png` |
| 12 | Overlay de carga real (job.create interceptado con 3,5 s de retardo) | Visible con `display:flex`, blur `14px saturate(1.8)`, 3 aros de 80 px, texto exacto «IA generando lo solicitado...», barra cian→verde animada, panel 360 px | captura `24-hoola-loading.png` + medidas inline |
| 13 | Error del proveedor sin claves | Overlay se oculta, prompt conservado, toast comprensible «No se pudo generar: …» | captura `25-hoola-error-proveedor.png` |
| 14 | Payload del modelo | Se envía `model:gemini-pro` con prompt, aspecto, resolución, proyecto y documento | interceptación de `job.create` |
| 15 | Lightbox + zoom | Abre con imagen real; rueda real → escala 3,06; arrastre real → `translate(90px, 60px)`; clic → cierra y resetea; Escape → cierra; aviso canónico visible | capturas `26`/`27` + medidas |
| 16 | Geometría 1920→320 px | `scrollWidth == innerWidth` en los 12 anchos (0 px de desbordamiento); topbar 56 px; paneles 322/336 (292/304 a 1280); selector de modelo sin desbordamiento interno | barrido con `setViewportSize` |
| 17 | Panel móvil | Abre superpuesto (348 px), modelos en píldoras sin recorte, sin scroll horizontal | captura `28-hoola-movil-panel.png` |
| 18 | Consola | Sin errores propios; solo aviso del navegador por campo de contraseña fuera de `<form>` (heredado del original) | `console` Playwright |
| 19 | Accesibilidad básica | `lang=es`, título y meta descripción, 1 `h1`, imgs con `alt`, 136 botones con etiqueta, inputs con label (los 3 file ocultos llevan `aria-label`), sin IDs duplicados, sin `tabindex` positivo, `aria-live` en zonas dinámicas, overlay `role=status` + `aria-busy`, lightbox `role=dialog` | auditoría DOM |
| 20 | Tokens Hoola en runtime | `font-family: Electrolize`, `body` con degradado, rejilla `::after`, bordes cian y botón primario con gradiente cian→verde | `getComputedStyle` |

## 3. Pruebas no ejecutadas y por qué

- **Generación real con proveedor**: el equipo de desarrollo no tiene las claves del `.htaccess`
  raíz (`OPENAI_API_KEY` / `R`). Se ha verificado todo lo anterior al envío y el tratamiento del
  error 500 devuelto por el servidor sin claves. El pipeline es el mismo código que el original.
- **Persistencia contra producción**: requiere la contraseña `PW_ACCESS` de producción, que no está
  disponible para el agente. Se ha verificado en local con el mismo `api.php`/SQLite y contra la
  base SQLite del servidor local, y la app se comprueba publicada en producción (arranque, estilo,
  modo local, edición y exportación) sin credenciales.
- **Restauración desde copia de seguridad** del `storage/`: procedimiento documentado, no probado
  en esta tarea.
