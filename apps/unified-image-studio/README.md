# Unified Image Studio

Estación de trabajo visual privada y autoalojada: importar o generar una imagen, editarla,
componer con textos, logos y formas, guardar el proyecto editable y exportar. PHP + SQLite en
Hostinger y frontend en HTML/CSS/JavaScript modular, sin paso de compilación.

> Estado de la entrega: **frontend verificado en navegador**; **backend PHP implementado pero no
> ejecutado en este equipo** (no hay PHP disponible). Ver [docs/VERIFICACION.md](docs/VERIFICACION.md).

---

## 1. Estructura

```text
apps/unified-image-studio/
├── index.html                  Interfaz completa (barra, paneles, lienzo, modales)
├── assets/css/base.css         Tokens, tipografía, controles, loaders
├── assets/css/studio.css       Estructura de la estación de trabajo y responsive
├── assets/js/
│   ├── app.js                  Orquestador: importación, IA, transformaciones, exportación
│   ├── core.js                 Estado, documento, capas, historial, serialización
│   ├── render.js               Motor de dibujo, viewport, máscaras, composición
│   ├── tools.js                Puntero: mover, redimensionar, rotar, máscara, texto, forma
│   ├── ui.js                   Vistas, listas, avisos, modales, estado visible
│   ├── persist.js              IndexedDB, autoguardado y cliente de la API
│   ├── exporter.js             PNG/JPG/WebP, escala, DPI real, portapapeles
│   └── ai.js                   Catálogo de modelos, trabajos y costes
├── api.php                     API privada: sesión, proyectos, recursos, trabajos, presupuesto
├── proxy.php                   Entrada del proveedor: mismo pipeline y mismo presupuesto
├── lib/bootstrap.php           Configuración, SQLite, migraciones, auth, presupuesto
├── lib/jobs.php                Pipeline único de trabajos (idempotencia, coste, proveedor)
├── lib/canonical-image-model.php  Contrato de generación del proyecto (copia sincronizada)
├── storage/                    Datos privados: SQLite, originales y derivados (denegado por web)
├── pricing.example.json        Plantilla de tarifas (sin precios inventados)
└── docs/VERIFICACION.md        Evidencia de pruebas y límites declarados
```

## 2. Requisitos

| Requisito | Mínimo | Nota |
|---|---|---|
| PHP | 8.0 | Usa `str_starts_with`, `match`, tipos union |
| Extensiones | `pdo_sqlite`, `curl`, `json`, `session` | Sin GD ni Imagick: la imagen se procesa en el navegador |
| Servidor | Apache/LiteSpeed con `.htaccess` | Hostinger compartido |
| Almacenamiento | ~50 MB + imágenes | `storage/` escribible por PHP (0770) |
| Navegador | Chrome/Edge 100+, Firefox 105+, Safari 16+ | Canvas 2D, IndexedDB, Clipboard API |

## 3. Instalación en Hostinger

1. **Subir** `apps/unified-image-studio/` (el webhook de este repositorio ya despliega en la raíz pública).
2. **Permisos** de `storage/`: `chmod 770 storage` y que el usuario PHP sea el propietario.
3. **Contraseña: no hay que configurar ninguna nueva.** La app usa el sistema centralizado del
   proyecto (`auth/lib.php`) y valida contra `PW_ACCESS` / `PW_EDIT` del `.htaccess` **raíz**,
   que ya existen para el resto de apps y webs. La sesión es la misma cookie de dominio
   (`antigravity_auth`): entrar en cualquier app del proyecto abre también esta.

   ```apache
   # Ya presente en el .htaccess raíz; no dupliques estas líneas.
   SetEnv PW_ACCESS "…"
   SetEnv PW_EDIT "…"
   # Variante con hash (opcional, manda sobre el valor en claro):
   #SetEnv PW_ACCESS_SHA256 "…"
   #SetEnv PW_EDIT_SHA256 "…"
   ```

   Solo si instalas la app **suelta**, sin el resto del proyecto, puedes definir una contraseña
   propia: `SetEnv UIS_PASSWORD_HASH "$2y$10$…"` (o `UIS_PASSWORD` en texto plano, solo pruebas).

4. **Tarifas** (opcional pero necesario para que el presupuesto en euros se aplique):
   copia `pricing.example.json` a `storage/pricing.json` y escribe el precio real por imagen de
   cada modelo. Sin tarifa, el trabajo se registra con coste desconocido y el límite en euros no
   se aplica (sí queda registrado el trabajo).

5. Comprueba `GET api.php?action=state`: debe responder `ok:true`, `configured:true`,
   `sharedSession:true` y, con sesión, `sqlite:true` y `curl:true`.

> No hay fichero `config.php`: las claves viven **solo** en el entorno. Un `config.php` antiguo
> en esta carpeta debe borrarse del servidor.

## 4. Variables de entorno

| Variable | Uso |
|---|---|
| `PW_ACCESS` / `PW_ACCESS_SHA256` | **Contraseña de acceso del proyecto** (login). La app la comparte con el resto de apps |
| `PW_EDIT` / `PW_EDIT_SHA256` | **Contraseña de edición** (aquí es la misma). Cualquiera de las dos abre sesión |
| `OPENAI_API_KEY` / `O` | OpenAI Images (`gpt-image-2`, `gpt-image-2.5-*`) |
| `R` | OpenRouter (Gemini y Qwen) |
| `UIS_STORAGE_DIR` | Ruta alternativa para `storage/` (recomendada fuera de `public_html` si el hosting lo permite) |
| `UIS_PRICING_JSON` | Tarifas en JSON, si prefieres no usar `storage/pricing.json` |
| `UIS_PASSWORD_HASH` / `UIS_PASSWORD` | Solo para una instalación suelta sin `auth/lib.php` |

## 5. Modelo de datos

Tablas SQLite (`lib/bootstrap.php`, migración `PRAGMA user_version = 1`; copia en `schema.sql`):

`projects`, `documents`, `versions`, `resources`, `jobs`, `ledger`, `budgets`, `auth_failures`.

Relación: un **proyecto** contiene uno o varios **documentos** (normalmente uno) y **recursos**;
los **trabajos** referencian proyecto, documento y versión de entrada; los **movimientos**
(`ledger`) registran el importe estimado de cada trabajo aceptado por el proveedor.

El documento serializado (`documents.json`) es el estado editable versionado (`schema: 1`):

```json
{
  "id": "doc_...", "schema": 1, "width": 1024, "height": 1024, "dpi": 300,
  "background": { "type": "transparent", "color": "#ffffff" },
  "layers": [
    { "id": "lyr_...", "type": "image", "resourceId": "res_...", "x": 0, "y": 0, "w": 1024, "h": 768,
      "rotation": 0, "opacity": 1, "visible": true, "locked": false,
      "mask": { "enabled": true, "clip": false, "strokes": [{ "mode": "paint", "size": 80, "hardness": 0.8, "pts": [[10, 10]] }] } }
  ]
}
```

Las máscaras son vectoriales (pinceladas en coordenadas del documento), lo que mantiene la
alineación con cualquier zoom y las hace recuperables y ligeras en el historial.

## 6. Copia de seguridad y restauración

Todo lo necesario para restaurar está en `storage/`:

```bash
# Copia (con la base de datos consistente)
sqlite3 storage/studio.sqlite ".backup 'storage/backup.sqlite'"
tar -czf backup-uis-$(date +%F).tar.gz storage/studio.sqlite storage/resources/
```

Restauración: subir el `.tar.gz`, extraer sobre la app y devolver permisos a `storage/`.
La copia incluye los originales (`storage/resources/`), por lo que los proyectos vuelven con sus
imágenes. Verifica tras restaurar que `GET api.php?action=state` responde y que un proyecto abre
con sus capas.

## 7. Exportación

- **PNG**: conserva transparencia y escribe la resolución real en el chunk `pHYs`.
- **JPG**: no admite transparencia; se aplica el color de fondo elegido y se escribe la densidad
  JFIF (`units = 1`, ppp).
- **WebP**: se codifica en el navegador; **no** guarda DPI (limitación del formato: las dimensiones
  en píxeles son las del documento).
- El tamaño de salida es el del documento × escala, independiente del zoom de pantalla.
- Copia al portapapeles disponible en navegadores con `ClipboardItem`.

## 8. Cobertura por fases de la especificación

| Fase | Estado | Nota |
|---|---|---|
| 1 · Entorno y estructura | Hecha | Esquema SQLite, capas de código separadas, configuración por entorno |
| 2 · Estudio básico | Hecha y verificada | Acceso, proyectos, importación, lienzo, persistencia, exportación |
| 3 · Primera generación real | Hecha, pendiente de clave | Proveedor, trabajos idempotentes, costes, presupuestos, biblioteca y recuperación |
| 4 · Edición | Hecha | Versiones, recorte, redimensión, giro, volteo, máscaras, inpainting (pendiente de clave), quitar fondo local |
| 5 · Composición | Hecha | Textos, formas, logos, capas, alineación, referencias, comparación antes/después |
| 6 · Reutilización | Parcial | Recetas sí; kit de marca y formatos predefinidos no |
| 7 · Preparación final | Parcial | Documentación, verificación y esquema sí; interfaz de copias no |

## 9. Decisiones y conflictos resueltos

1. **Paleta**: la especificación del producto fija `#0d1117` / `#161b22` con acentos cian y ámbar.
   Se combina con el acento cian hoola (`#00D0D0`) y con `glassmorphism`, tipografía Electrolize
   para títulos/marca, Inter para la interfaz y JetBrains Mono para datos técnicos. No se sustituye
   el estilo del proyecto: se especializa para una herramienta de edición.
2. **Máscara**: es una **región de edición** (overlay cian), no un recorte de capa. Si se necesita
   recorte, `mask.clip = true` activa el recorte real sin cambiar el modelo de datos.
3. **Costes**: no se inventan precios. Sin `storage/pricing.json`, la estimación es «Tarifa no
   configurada», el trabajo se registra con coste desconocido y el presupuesto en euros no bloquea.
4. **Trabajos**: `job.create` es idempotente por `idempotencyKey`; un reintento con la misma clave
   devuelve el trabajo existente y **no** vuelve a llamar al proveedor. El sondeo (`job.get`) nunca
   reenvía la generación. `proxy.php` usa el **mismo pipeline** (`lib/jobs.php`): no existe ningún
   camino que gaste sin registrar trabajo ni comprobar presupuesto.
5. **Sin cron garantizado**: el trabajo se ejecuta dentro de `job.create` y queda persistido. Al
   arrancar, la app busca trabajos `queued`/`running` (`status=active`) y los retoma con
   `resumeJob()` sin reenviarlos; los que llevan más de 15 minutos en `running` se cierran como
   `failed` («tiempo agotado»).
6. **Historial**: se cubre con proyectos + versiones + tabla `jobs` (con el archivo resultante), en
   lugar de un `history.php` separado, para no duplicar almacenamiento.
7. **Presupuesto**: el importe «de sesión» es la ventana de las últimas 24 h, porque la app tiene un
   único administrador. El límite por proyecto se aplica aunque no llegue `projectId`.
8. **Contraseñas**: no hay contraseña propia. Se usa `auth/lib.php` del proyecto con
   `PW_ACCESS` / `PW_EDIT` del `.htaccess` raíz y la cookie de dominio `antigravity_auth`, de modo
   que la misma contraseña sirve para el login y la edición y vale para todas las apps. La
   comprobación se hace siempre en el servidor; el cliente nunca ve el valor.

## 10. Limitaciones conocidas

- La generación, el inpainting, la edición con IA y el presupuesto **no se han podido ejecutar** en
  el equipo de desarrollo: no hay PHP ni claves. Ver `docs/VERIFICACION.md`.
- Sin proveedor configurado la app funciona en **modo local** (IndexedDB): todo el flujo de
  importación, edición, composición, guardado, versiones y exportación funciona; la IA no.
- El trabajo se ejecuta en la misma petición (`job.create`). En hostings con `max_execution_time`
  bajo, una generación lenta puede cortar la respuesta; el trabajo queda registrado y se recupera
  al consultar `job.get`.
- El recorte de fondo local usa relleno por color desde las esquinas: funciona con fondos
  uniformes, no con fondos complejos (para eso está la variante con IA).
- No hay colaboración multiusuario ni roles: una sola cuenta administradora.
