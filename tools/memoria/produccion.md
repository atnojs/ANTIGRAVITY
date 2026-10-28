# Estado de producción

Foto fechada de qué está publicado. **Sirve para cazar el clásico "arreglado en local y
sin desplegar"**, no para certificar que cada app funciona.

## [2026-10-15] Barrido de las 80 rutas de `apps/`

**Método:** para cada carpeta de `apps/` con `index.html` (hasta 2 niveles), petición HTTP a
`https://atnojs.es/apps/<ruta>/` y fecha de modificación del `index.html` local.

**Resultado:** **80 rutas, 80 con HTTP 200.** Ninguna caída.

> ⚠️ **Límite de esta prueba:** `HTTP 200` significa que el fichero se sirve, **no** que la
> app funcione. La comprobación funcional (proxy, historial, flujo de usuario) es la de
> `tools/verificar-apps-produccion.ps1` y, cuando toque, la del navegador.

### Apps tocadas más recientemente (señal de trabajo vivo)

| Fecha del index | Apps |
|---|---|
| 2026-10-28 | `flow_studio_hoola` (**el botón de la zona a editar pasa a «Crear máscara»**: `20261028a-flow-studio`, `app.20261028a.js` (copia del `d` con una línea), «Ajustar círculo» intacto; JS servido con SHA-256 idéntico al local y Chrome sobre la URL real; verificador independiente PASS 97,6; desplegado a las 22:36 tras re-disparar el webhook; ver `bitacora.md`) |
| 2026-10-28 | `dibujo_lineas_copia` (**modelos de Google Flow gratis con la cola del PC y estado «PC conectado»**; `app.20261028c.js|css`, `model-gate.20261028.js`, historial con `flow-nano-banana-2` y descarga real; **arranca con FLOW · NANO BANANA 2 por defecto** desde `c6259f0a`, petición expresa del 28/10; verificado en producción con Chrome; ver `bitacora.md`) |
| 2026-10-27 | `flow_studio_hoola` (**modelos de IA del estudio, compuerta y máscara circular**: `20261027d-flow-studio`, `app.20261027d.*`, `api.php`+`lib/` con SQLite, referencias por modo y máscara con 0 píxeles distintos fuera del círculo; verificado contra el origen y en Chrome; ver `bitacora.md`) |
| 2026-10-27 | `unified-app` (**arreglada la pantalla blanca**: build versionado `assets/app.20261027.js|css` + `index.html` de producción + `proxy.php`; Firebase movido a `nanobanana-cbb2d`; verificado en el origen, SHA-256 del JS idéntico al local; ver `bitacora.md`) |
| 2026-10-23 | `trickvault` (**carpeta «Restauración de fotos antiguas»**: se retiran las 10 tarjetas duplicadas del carrusel del 22 y quedan las 3 canónicas —restaurar / colorear / imprimir—; verificado en producción) |
| 2026-10-21 | `agenda` (**recreada**: app React del modelo portada a PHP + OpenAI en `/apps/agenda/`) |
| 2026-10-21 | `trickvault` (35 códigos de texto de la infografía de 100 códigos de ChatGPT; aviso en «Últimas» con enlace a la tanda de texto; 1339 trucos) |
| 2026-10-19 | `agenda` (nueva: citas, tareas, notas y transcripción de audio) |
| 2026-10-19 | `trickvault` (16 tarjetas nuevas de reels de Instagram; 1258 trucos) |
| 2026-10-13 | `json`, `neonshot`, `video-vault` |
| 2026-10-10 | 27 apps (angulos_de_camara, aura-edit, banco_de_imagenes, clonador, color, creador_memes, crear_historias, decorar_habitacion, dibujo_lineas, dibujo_lineas_copia, editar_generar, editar_generar_1, editar_imagen, escenario_modelo, estilizador_prompt, estudio_creativo, estudio_imagenes, ficha_producto, fotos_antonio, galletas_infografias, generador_ia, generador_ia_flux, generar, generar_ai_studio, generar_imagene_personalizadas, illusion_diffusion, infografia-referencia, outfit, prompts_predeterminados, protocolo_gemini_web, publicidad_producto, transferir_estilo, vestir_modelo) |
| 2026-10-03 | `transferir_estilo` |
| 2026-09-29 | `asistente_inmoviliario`, `conversor_multimedia`, `hermes_academy`, `pasatiempos`, `prompt_copilot_premium`, `prompt_estudio`, `rrss`, `texto_creativo`, `viaje_tiempo` |

### Apps sin tocar desde hace meses (candidatas a archivar o revisar)

| Fecha del index | Apps |
|---|---|
| 2025-05-27 | `paginas/primera_pagina_principal` |
| 2025-07-18 | `paginas/pagina_corel_fonts` |
| 2025-08-11 | `paginas/Google` |
| 2025-08-31 | `paginas/nano_banana` |
| 2025-09-04 | `paginas/carpetas_nuevas` |
| 2025-09-12 | `paginas/chatgpt` |
| 2025-10-21 | `paginas/apps_imagenes`, `paginas/generar_prompts` |
| 2025-11-07 / 11-23 | `paginas/web_apps`, `paginas/web_app` |
| 2025-12-11 | `pagina_camisetas`, `paginas/pagina_camisetas` |
| 2025-12-24 / 12-25 | `paginas/nueva_pestaña`, `tutoriales/*` (4) |
| 2026-01-07 / 01-27 | `nueva_pestaña`, `1` |
| 2026-04-24 | `amd-video-optimizer` |
| 2026-06-10 | `compilar`, `promptbox` |

> Varias de estas llevan **claves de Google incrustadas** (ver `credenciales.md`): al
> archivarlas, es la ocasión de limpiarlas.

## Carpetas de `apps/` sin `index.html` (no son apps desplegables)

`agent`, `base_library_extracted`, `dev`, `out`, `temp_extract`, `_shared`, `_clonador`,
`_illusion_diffusion (1)`, `_viaje_tiempo_backup`, `Premium`, `PROTOCOLO GEMINI- CLONADOR
DE FOTOS`, `style_guide`, `vscode`, `estudio_creativo`-similares y `Copias por si`
(esta **sí** se sirve por web y contiene claves: ver `credenciales.md`).

## Comprobación funcional de las apps migradas

`tools/verificar-apps-produccion.ps1` revisa 18 apps concretas contra su `proxy.php`
(health del catálogo de modelos, historial y versión de assets). Ejecución y resultado
crudo: `tools/memoria/evidencia-produccion-2026-10-15.txt`.

| Fecha | Resultado |
|---|---|
| 2026-10-15 | **17 de 18 apps OK. `prompt_estudio` falla de forma reproducible.** Detalle abajo. Evidencia cruda en `evidencia-produccion-2026-10-15.txt` |

### 🔴 `prompt_estudio`: error 400 persistente (detectado 2026-10-15)

- **Síntoma:** el verificador devuelve, en tres rondas separadas ~2,5 minutos (23:16, 23:19,
  23:22), `error … Error en el servidor remoto: (400) Solicitud incorrecta`.
  `historial=0 store=0 legacy=0`.
- **Contraste:** `prompt_copilot_premium` (mismo tipo `texto`) da `ok`.
  `https://atnojs.es/apps/prompt_estudio/` se sirve con HTTP 200 y su `index.html` es del
  2026-09-29 → el fichero está, **el fallo es del backend**.
- **No investigado todavía.** Siguiente paso: comparar su `proxy.php` con el de
  `prompt_copilot_premium` y probar la acción `health` a mano:

  ```powershell
  $body = (Invoke-WebRequest -Uri "https://atnojs.es/apps/prompt_estudio/proxy.php" -Method Post `
           -Body '{"action":"health"}' -ContentType 'application/json' -TimeoutSec 60 -UseBasicParsing).Content
  $body
  ```

**Cómo repetirlo:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\ANTIGRAVITY\tools\verificar-apps-produccion.ps1"
```

## Barrido rápido de todas las apps (el de esta foto)

```powershell
# detecta apps con index.html y comprueba su codigo HTTP + fecha del index
Get-ChildItem E:\ANTIGRAVITY\apps -Directory | ForEach-Object { ... }   # ver bitacora 2026-10-15
```

## `unified-app` — foto del 2026-10-27 (tras el arreglo de la pantalla blanca)

| Comprobación | Resultado |
|---|---|
| `GET /apps/unified-app/` | 200, **925 B** (index nuevo con refs `./assets/app.20261027.js|css`), `x-hcdn-cache-status: DYNAMIC` |
| `GET assets/app.20261027.js` | 200, **597.037 B**, SHA-256 `75d74b92…` = idéntico al local |
| `GET assets/app.20261027.css` | 200, 35.742 B |
| `GET /apps/unified-app/index.dev.html`, `package.json`, `scripts/*` | **403** (denegados por `.htaccess`; correcto) |
| `proxy.php` GET | **405** JSON `{"error":"Método no permitido"}` (correcto por diseño) |
| `proxy.php` POST `{"task":"enhancePrompt"}` | **403** JSON de Google: «Your billing account has an outstanding balance» → **bloqueante externo** para generar imágenes: revisar la clave `A`/facturación en hPanel |
| Login (credenciales falsas) | UI «Credenciales inválidas o error de red.» + `auth/invalid-credential` (correcto; antes daba `auth/api-key-not-valid`) |

**No verificado (declarado):** el interior de la app tras el login (AI Lab / Edit Studio /
Pro Effects) porque no hay credenciales de usuario disponibles y no se crean cuentas en producción;
y la generación real de imagen, bloqueada por la facturación externa. `src/` está en
reconstrucción desde el bundle.
