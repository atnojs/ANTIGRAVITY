# Verificación — Unified Image Studio

Informe de lo ejecutado, con el resultado real. Cada afirmación tiene un comando y una salida.

Fecha: 2026-10-23 · Entorno: Windows, Chrome 155 headless (CDP), PHP 8.3.36 portable
(`windows.php.net`, NTS x64) con `pdo_sqlite`, `sqlite3`, `curl`, `mbstring`, `openssl`, `fileinfo`.

---

## 1. Frontend en navegador real (`test-full.mjs`) — 18/18

Servidor estático local + Chrome headless a 1440×900, 1024×768 y 390×844.

| Prueba | Resultado |
|---|---|
| Carga inicial sin excepciones | PASS |
| Arranque tras borrar IndexedDB y localStorage | PASS |
| Importar imagen (PNG generado en el navegador) | PASS · 1 capa, documento 1024×1024, estado vacío oculto |
| Añadir texto editable | PASS · «Campaña otoño», 96 px |
| Crear forma arrastrando | PASS · rectángulo 384×224, coordenadas enteras |
| Deshacer y rehacer | PASS · 3 → 2 → 3 capas |
| Pintar máscara | PASS · 1 pincelada de 6 puntos |
| Zoom 100 %, acercar y ajustar | PASS · 1 → 1,25 → 0,625 |
| Exportar PNG con DPI real | PASS · 1024×1024, chunk `pHYs` → 300 ppp |
| Exportar JPG al 50 % con densidad | PASS · 512×512, `units=1`, densidad 150 |
| Exportar WebP | PASS · `image/webp`, unos 16 KB |
| Exportar proyecto con recursos | PASS · esquema 1, 3 capas, base64 del recurso presente |
| Guardado con estado visible | PASS · `data-state="saved"` |
| Reabrir restaura la composición editable | PASS · mismas capas, máscara y recurso en IndexedDB |
| Generación sin proxy bloqueada con aviso | PASS · no se envía ninguna petición |
| Sin scroll horizontal en 1440 / 1024 / 390 | PASS · `scrollWidth == innerWidth` en los tres |
| Consola del navegador | 0 errores |

## 2. Verificación ampliada (`test-05.mjs`) — 10/10

| Prueba | Resultado |
|---|---|
| Recortar documento y desplazar capas | PASS · 1024×1024 → 600×400, capa en `x-100` |
| Redimensionar documento y capas | PASS · 300×200 |
| Girar 90° | PASS · 200×300 y rotación 90 |
| Voltear horizontal | PASS · reversible y espeja el contenido (`flipX`) |
| Duplicar, ocultar y eliminar capas | PASS |
| Máscara alineada al cambiar el zoom | PASS · mismas coordenadas con zoom 2,51 → 1 |
| Deshacer/rehacer sin llamadas de red | PASS · 0 `fetch` |
| Proyecto descargado y validado en disco | PASS · `.uis.json` con `kind`, 2 capas y recurso |
| PNG exportado y validado en disco | PASS · firma PNG, 200×300, `pHYs` → 300 ppp |
| Modal de exportación con resumen y vista previa | PASS |

## 3. Backend PHP real (`api-test.mjs`) — 24/24

`php -S 127.0.0.1:8100` con `UIS_PASSWORD_HASH` (modo instalación suelta), `UIS_STORAGE_DIR` de
prueba, SQLite y un `pricing.json` de prueba. El modo con las contraseñas del proyecto
(`PW_ACCESS` / `PW_EDIT`) se verifica en el apartado 7 con otro servidor.

| Prueba | Resultado |
|---|---|
| `state` detecta PHP, SQLite, cURL y contraseña | PASS |
| Escritura sin sesión | PASS · 401 |
| `POST` sin cabecera de solicitud | PASS · 403 |
| Contraseña incorrecta | PASS · 401 |
| Login correcto establece sesión | PASS |
| `state` confirma sesión | PASS |
| Catálogo con 12 modelos canónicos y tarifas | PASS |
| Guardar proyecto (v1) | PASS |
| Conflicto de versión | PASS · 409 |
| Sobrescritura forzada | PASS · v2 |
| Reabrir proyecto con documento y capas | PASS |
| Subir recurso validando el tipo real | PASS |
| Servir recurso solo con sesión y `image/png` | PASS |
| Recurso denegado sin sesión | PASS · 401 |
| Identificador con ruta (`../`) | PASS · 400 |
| Archivo que no es imagen | PASS · 400 |
| Guardar y listar versiones | PASS |
| Presupuesto persistido y consultado | PASS |
| Trabajo sin clave de proveedor | PASS · 500 «La clave de OpenAI no está configurada.» |
| Reintento con la misma clave | PASS · `deduplicated: true`, sin segunda llamada |
| Trabajo fallido persistido y recuperable | PASS |
| Límite por operación aplicado en servidor | PASS · 402 con motivo `operation` |
| Prompt con instrucción de idioma | PASS |
| Logout invalida el acceso | PASS · 401 |

## 4. Flujo completo contra el servidor (`test-06-server.mjs`) — 6/6

| Prueba | Resultado |
|---|---|
| El servidor pide sesión al abrir | PASS · modal de acceso, modo `auth` |
| Login correcto cambia a modo servidor | PASS · «Servidor privado» |
| Estimación con la tarifa real del servidor | PASS · 0,04 € y «restante 7,00 €» |
| Proyecto guardado en servidor con sus capas | PASS · `project.get` devuelve las mismas capas |
| Generación sin clave falla con aviso y registra el trabajo | PASS · trabajo `failed` con el error del proveedor, botón restaurado |
| Presupuesto editable y persistido | PASS · 7 € leídos de vuelta |
| Consola del navegador | 0 errores |

## 5. Atajos, modales y comparación (`test-07-keys.mjs`) — 8/8

| Prueba | Resultado |
|---|---|
| Atajos V/B/T/R | PASS · mask / text / shape / select |
| Escribir en un campo no cambia de herramienta | PASS · foco en `promptInput`, herramienta intacta |
| Ctrl+Z / Ctrl+Shift+Z | PASS · 3 → 2 → 3 capas |
| Supr elimina la capa seleccionada | PASS |
| Modales de ayuda y proyectos (Escape cierra) | PASS |
| Comparación antes/después con tirador | PASS |
| Al quedarse sin capas vuelve el estado vacío | PASS |
| Errores de consola | 0 |

## 6. Correcciones del REWORK (`test-08-fixes.mjs`) — 9/9

Tras la primera verificación independiente (REWORK), se corrigieron los defectos señalados y se
añadieron estas pruebas:

| Prueba | Resultado |
|---|---|
| `proxy.php` exige sesión | PASS · 401 sin cookie |
| `proxy.php` con sesión devuelve salud y 12 modelos | PASS |
| **`proxy.php` respeta el presupuesto** (antes lo saltaba) | PASS · 402 «La operación cuesta más que el límite por operación» y no llega al proveedor |
| `budget.set` devuelve el presupuesto resultante | PASS · igual que `budget.get` |
| `logout` por GET rechazado y la sesión sigue viva | PASS · 405 |
| Trabajo colgado → se cierra como fallido al consultarlo | PASS · «Sin respuesta del proveedor: tiempo agotado.» |
| `job.list?status=active` responde | PASS |
| Límite de trabajos por minuto | PASS · 429 |
| Recuperación al arrancar | Cubierta por `status=active` + `resumeJob` (sin clave no hay trabajo que recuperar) |

## 7. Autenticación compartida del proyecto (`test-09` / `test-10`) — 13/13

La app no tiene contraseña propia: usa `auth/lib.php` con `PW_ACCESS` / `PW_EDIT` del `.htaccess`
raíz y la cookie de dominio `antigravity_auth`. Para reproducirlo:

```bash
PW_ACCESS='ClaveCompartida2026' PW_EDIT='ClaveCompartida2026' \
  php -S 127.0.0.1:8102 -t apps/unified-image-studio
```

| Prueba | Resultado |
|---|---|
| `state` detecta la contraseña del `.htaccess` | PASS · `configured:true`, `sharedSession:true` |
| Sin sesión la API responde 401 | PASS |
| Contraseña incorrecta rechazada | PASS · 401 |
| `PW_ACCESS` abre la sesión | PASS |
| Cookie común del dominio | PASS · `antigravity_auth` |
| La sesión compartida autoriza el resto de la API | PASS |
| La contraseña de edición (`PW_EDIT`) también abre sesión | PASS |
| Guardar proyecto con la sesión compartida | PASS |
| Logout cierra la sesión común | PASS |
| Interfaz: pide contraseña, error visible con clave incorrecta | PASS |
| Interfaz: la contraseña del proyecto abre el estudio | PASS · «Servidor privado» |
| Interfaz: importar y guardar con esa sesión | PASS |
| Errores de consola | 0 |

## 8. Sintaxis y arranque del backend

```text
php -l api.php                        → No syntax errors detected
php -l proxy.php                      → No syntax errors detected
php -l lib/bootstrap.php              → No syntax errors detected
php -l lib/canonical-image-model.php  → No syntax errors detected
node --check assets/js/{core,render,tools,ui,persist,exporter,ai,app}.js → 8/8 OK
```

## 9. Qué NO está verificado

| Punto | Motivo | Cómo completarlo |
|---|---|---|
| Llamada real a OpenAI/Gemini/Qwen | No hay claves en este equipo | Añadir `OPENAI_API_KEY`/`R` en el `.htaccess` raíz y generar: el trabajo debe pasar a `succeeded` y guardar el archivo en `storage/resources/` |
| Inpainting y «quitar fondo con IA» | Dependen del proveedor | Mismo procedimiento con una máscara pintada |
| Ejecución bajo LiteSpeed/Hostinger | Aquí solo hay el servidor embebido de PHP | Subir la app y repetir `api.php?action=state` y un guardado real |
| El `.htaccess` de `storage/` negando el acceso | El servidor embebido de PHP ignora `.htaccess` | Comprobar en el hosting que `storage/studio.sqlite` y `storage/resources/*` devuelven 403 |
| Presupuesto con importes reales | Las tarifas de prueba eran 0,04 € | Escribir `storage/pricing.json` con los precios del panel del proveedor |
| Copia y restauración de `storage/` | No hay `sqlite3`/`tar` en este equipo | Ejecutar los comandos del README en el servidor |
| SSO real con otra app del proyecto | Aquí solo hay esta app levantada | Abrir dos apps del dominio y comprobar que una sola sesión vale para ambas |
| `PW_ACCESS_SHA256` / `PW_EDIT_SHA256` | Se probó con los valores en claro | Cambiar a la variante con hash y confirmar que el login sigue entrando |

## 10. Inventario verificado

`lib/canonical-image-model.php` conserva el hash `cc89fea361387f64`, idéntico al contrato canónico
del repositorio (`apps/dibujo_lineas_copia/canonical-image-model.php`).

## 11. Limitaciones declaradas

1. El trabajo se ejecuta dentro de `job.create`; con `max_execution_time` bajo puede cortarse la
   respuesta, aunque el trabajo queda registrado y es recuperable por `job.get`.
2. No hay cancelación ni reembolso: los proveedores usados no los admiten.
3. WebP no guarda DPI (limitación del formato).
4. El recorte de fondo local solo funciona con fondos uniformes.
5. En modo local (sin PHP) no hay IA: el resto del estudio funciona y se guarda en IndexedDB.

## 12. Defectos encontrados y corregidos

### 10.1 Detectados en la verificación propia

| Defecto | Detección | Corrección |
|---|---|---|
| Un conflicto de versión (409) se mostraba como «Guardado» | Prueba con versión base obsoleta | `persist.js`: el conflicto deja el estado en `dirty` y no llama a `markSaved()` |
| Los recursos no se recargaban al reabrir (imagen en blanco) | Recarga real del proyecto | `app.js`: `state.resources.clear()` pasa a ejecutarse **antes** de `loadProject` |
| Las versiones solo vivían en IndexedDB | Revisión de la API | `version.save`/`version.get` en servidor; `saveVersion` y `listVersions` sincronizan |
| El historial de opacidad guardaba un estado inútil | Revisión del código | Transacción con `pointerdown` + `pushHistory` |
| Sin `session.save_path` escribible no había sesión (todo 401) | Prueba en servidor local | `lib/bootstrap.php` elige una ruta escribible (`sys_get_temp_dir` o `storage/sessions`) |
| `pricing.json` con BOM no se leía | Prueba de presupuesto | `uis_pricing()` elimina el BOM antes de `json_decode` |
| Al borrar la última capa no aparecía el estado vacío | Prueba de atajos | `deleteSelectedLayer()` actualiza el estado vacío |
| Deshacer una forma no la eliminaba | Prueba de undo | La transacción se captura antes de crear la capa |
| El primer guardado tras reabrir daba un 409 falso | Captura con proyecto existente | `openProject` adopta la versión del servidor |

### 10.2 Detectados por el verificador independiente (ronda 1 → REWORK)

| # | Severidad | Defecto | Corrección aplicada |
|---|---|---|---|
| 1 | Mayor | `proxy.php` gastaba sin pasar por presupuesto ni registrar trabajo | Pipeline único `lib/jobs.php`: `api.php` y `proxy.php` usan `uis_job_create` (presupuesto, idempotencia, registro y libro de costes). Probado: `proxy.php` → 402 |
| 2 | Mayor | `recoverPendingJobs` pedía `status=pending` (nunca escrito) y el arranque descartaba el resultado | `status=active` en servidor y cliente; `resumeJob()` retoma el trabajo y muestra la vista previa |
| 3 | Medio | Cualquier fallo HTTP de guardado degradaba la app a modo local | Solo los fallos de red cambian de modo; los errores HTTP se muestran sin perder la sesión |
| 4 | Medio | `budget.set` devolvía solo `{ok:true}` y la barra quedaba a ciegas | Devuelve el mismo objeto que `budget.get` |
| 5 | Medio | `UIS_MAX_JOBS_PER_MINUTE` sin usar | Límite aplicado en `uis_job_create` (429 comprobado) |
| 6 | Medio | `project_id = ?` con NULL nunca casaba; el gasto «de sesión» era global | `IS ?` en las consultas; la ventana de 24 h se documenta como tal (app mono-usuario) |
| 7 | Medio | Trabajo insertado `running` sin `set_time_limit`; un corte lo dejaba colgado | `set_time_limit(200)` y reconciliación: los `running` con más de 15 min pasan a `failed` |
| 8 | Menor | `state` y `proxy.php` sin sesión revelaban entorno y claves configuradas | `state` solo expone PHP/SQLite/cURL con sesión; `proxy.php` exige sesión (401) |
| 9 | Menor | Longitud del prompt comprobada antes de añadir la frase en español | Se comprueba después; un prompt de 12.000 caracteres da 413 sin registrar trabajo |
| 10 | Menor | El aviso apuntaba a `api/pricing.json` | Ahora indica `storage/pricing.json` |
| 11 | Menor | `logout` por GET | Solo POST (405 comprobado) |
| 12 | Menor | `.htaccess` de `storage/` no verificable con el servidor embebido | Declarado como pendiente de comprobar bajo Apache/LiteSpeed. Además, el repositorio ignora `.htaccess` de forma global, así que `lib/` no puede llevarlo: `bootstrap.php` y `jobs.php` responden **404** si se piden por HTTP directamente (comprobado); `canonical-image-model.php` solo define funciones y devuelve un cuerpo vacío, sin filtrar código fuente |
| 13 | Menor | Prueba de idioma vacua y tamaño de WebP mal documentado | La prueba lee `job.get` y comprueba la frase; el tamaño real es ≈16 KB |
| 14 | Menor | Carrera de idempotencia con `UNIQUE` → 500 | Se captura la violación y se devuelve el trabajo ganador |
| 15 | Menor | No se valida `doc.id`↔`project.id` | Aceptado: app mono-usuario; documentado |

## 13. Fuera de alcance de esta entrega

- Kit de marca y formatos predefinidos de la fase 6 (hay recetas y logos como capa).
- Cancelación de trabajos y reembolsos (los proveedores no los admiten).
- Interfaz de copias de seguridad en la app (se resuelve con los comandos del README).
- Colaboración multiusuario, roles y suscripciones: fuera del producto por diseño.
