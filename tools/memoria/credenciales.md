# Credenciales: dónde viven y quién las usa

**Regla absoluta: aquí no se escribe ningún valor.** Solo rutas, nombres de clave y
dependencias. Si necesitas el valor, ve al almacén.

Última revisión: 2026-10-21

---

## Almacenes

| Almacén | Ruta | Qué guarda | Quién lo usa |
|---|---|---|---|
| Hermes `.env` | `E:\hermes-data\.env` (33 claves) | Claves de IA, bots, FTP | Hermes y sus scripts |
| OmniRoute storage | `C:\Users\atnojs\.omniroute\.env` | `STORAGE_ENCRYPTION_KEY` (cifra el storage de OmniRoute) | El propio gateway |
| OmniRoute panel | `C:\Users\atnojs\.omniroute\panel.secret` | `OMNIROUTE_DASH_PW` | Daemon `omniroute_autostart.py` **y** `E:\hermes-data\scripts\monitor-omniroute-diario.py` |
| Hermes auth | `E:\hermes-data\auth.json` (11 KB) | Sesiones/credenciales de Hermes | Hermes |
| Google OAuth | `E:\hermes-data\google_token.json` + `google_client_secret.json` | Acceso a Gmail/Drive/Calendar (CLI `gws`) | Hermes / WSL |
| Token GitHub | `E:\ANTIGRAVITY\inicio.md` | Token de GitHub | Flujos git manuales |
| MCP | `E:\hermes-data\mcp-tokens\` | Tokens de servidores MCP | Hermes |
| Carpeta `keys/` | `E:\ANTIGRAVITY\keys\` (**gitignored**) | Cuenta de servicio Google (`nano-banana-*.json`) y varios | Apps de imagen |
| Carpeta `.private/` | `E:\ANTIGRAVITY\.private\` (**gitignored**) | `config.json`, `.htaccess` y `password-edicion.txt` (**obsoleto** desde el 2026-10-21: las contraseñas van al `.htaccess` raíz) | Apps privadas |

### Claves del `.env` de Hermes (nombres, nunca valores)

- **IA:** `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_API_KEY`, `OPENAI_API_KEY`,
  `BFL_API_KEY`, `OPENCODE_GO_API_KEY`
- **Telegram:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_HOME_CHANNEL`, `TELEGRAM_ALLOWED_USERS`,
  `TELEGRAM_ALLOW_ALL_USERS`
- **WhatsApp:** `WHATSAPP_MODE`, `WHATSAPP_ENABLED`, `WHATSAPP_ALLOWED_USERS`,
  `WHATSAPP_HOME_CHANNEL`, `WHATSAPP_HOME_CHANNEL_THREAD_ID`
- **FTP relatos:** `RELATOS_FTP_HOST`, `RELATOS_FTP_USER`, `RELATOS_FTP_PASS`,
  `RELATOS_FTP_REMOTEDIR`
- **Navegador/automatización:** `BROWSERBASE_PROXIES`, `BROWSERBASE_ADVANCED_STEALTH`,
  `BROWSER_SESSION_TIMEOUT`, `BROWSER_INACTIVITY_TIMEOUT`
- **Ajustes (no secretos):** `TERMINAL_*`, `*_TOOLS_DEBUG`, `PYTHONUTF8`, `OBSIDIAN_VAULT_PATH`

## Al rotar una credencial, actualiza TODOS sus usuarios

| Si rotas… | Hay que tocar |
|---|---|
| `OMNIROUTE_DASH_PW` | El panel de OmniRoute + `panel.secret` + `monitor-omniroute-diario.py` |
| `DEEPSEEK_API_KEY` | `.env` (el daemon la re-registra sola cada hora) |
| `OPENAI_API_KEY` / `O` | `.htaccess` raíz de Hostinger. La usan los proxies de IA del proyecto y la **transcripción de `apps/agenda`**. Si se rota o falta, la agenda sigue guardando audios pero no transcribe (permite escribir el texto a mano). |
| Claves de Google | `.env`, `keys/`, y **los frontends que las tengan incrustadas** (ver abajo) |
| Token de GitHub | `inicio.md` (está en `.gitignore`: **no** quitar esa línea) |
| **Contraseñas del proyecto** (edición y acceso) | **Un solo sitio desde el 2026-10-21:** el `.htaccess` raíz de Hostinger (`SetEnv PW_EDIT` y `SetEnv PW_ACCESS`), igual que las claves de API. **No** hay que tocar ninguna app ni desplegar. Ver la sección «Contraseñas centralizadas» abajo |

---

## 🔑 Contraseñas centralizadas (2026-10-21)

**Un único sitio para las dos contraseñas: el `.htaccess` raíz del servidor.**

```apache
SetEnv PW_EDIT "…"      # editar: candado / modo edición de cualquier app
SetEnv PW_ACCESS "…"    # acceder: login de Descargas, agenda (Brisa) y publicar en GitHub
```

- Las lee **`auth/lib.php`** (versionado; no contiene ningún valor) con la misma cascada
  que los proxies: `getenv` → `REDIRECT_` → `$_SERVER` → `$_ENV`.
- **Ninguna app guarda ya contraseñas**: los `auth.php`, `validar_password.php`,
  `guardar_cambios.php`, `save.php`, `admin.php`… de `apps/`, `webs/` y `Paginas/` llaman a
  `au_comprobar()` / `au_autorizado()` / `au_endpoint()`.
- Endpoint común para apps nuevas: **`/auth/validar.php`**
  - `GET` → `{"configurado":{"edicion":bool,"acceso":bool},"sesion":{…}}` (no revela valores)
  - `POST password=…&tipo=edicion|acceso` → 200 + cookie de sesión (`antigravity_auth`,
    `path=/`), o 403. La sesión vale en **todas** las apps del dominio durante 12 h.
- `api/estado` de publicación → **`PW_ACCESS`**: TrickVault pide la contraseña de acceso
  aparte al publicar en GitHub (`apps/trickvault/publicar.php`). Decisión: la de edición es
  débil a propósito; el token de GitHub no se protege con ella.
- **Cambiarla:** `powershell -NoProfile -ExecutionPolicy Bypass -File tools/rotar-password.ps1`
  imprime el bloque para pegar en hPanel → Administrador de archivos →
  `public_html/.htaccess`. Al guardar es inmediato: **sin commit y sin despliegue**.
  Con `-Hash` imprime solo los sha256 (`PW_EDIT_SHA256` / `PW_ACCESS_SHA256`), que también
  se aceptan.
- **Comprobar:** `GET https://atnojs.es/auth/validar.php` debe decir
  `"configurado":{"edicion":true,"acceso":true}`; después entrar en Descargas o desbloquear
  el candado de TrickVault.
- **Excepción:** `apps/boveda_privada` cifra en el navegador; su contraseña **es la llave de
  descifrado** y no se centraliza. Si se pierde, no hay recuperación posible.
- **Restos obsoletos en el servidor:** `apps/codigos_imagen/config.php` (gitignored) ya no se
  usa; se puede borrar por hPanel. La compatibilidad temporal `AU_PERMITIR_ANTIGUAS` se retiró el
  mismo día (commit `9fb2175`): las contraseñas antiguas (la de 20 caracteres y `050309`) ya
  **no** entran.

---

## 📜 Historial: contraseña de edición, incidente del 2026-10-16 (sistema anterior)

**Qué pasó.** La contraseña de edición de TrickVault / video-vault / json era **un solo dígito**.
Su sha256 estaba escrito en `apps/video-vault/auth.php`, que **está versionado**, y el repo es
**público**: el hash llevaba en el historial de git desde `6d7ef50`, `7037dc1` y `577652e`.
Diez intentos bastaban para entrar; el hash publicado solo lo confirmaba.

**Qué se hizo entonces (sistema antiguo, ya sustituido).**

1. Contraseña nueva de **20 caracteres aleatorios**, generada con el antiguo
   `tools/rotar-password.ps1`. El valor en claro quedó en
   `E:\ANTIGRAVITY\.private\password-edicion.txt` (gitignored, `.htaccess` con `Deny from all`).
   **Ese fichero ya no manda nada**: desde el 2026-10-21 las contraseñas viven en el
   `.htaccess` raíz del servidor (`PW_EDIT` / `PW_ACCESS`).
2. Hash nuevo en los tres `auth.php`. **`apps/trickvault/auth.php` se trajo a git**: vivía
   *solo en el servidor*, sin versionar y sin copia local, y por eso no se podía rotar desde el
   repositorio ni verlo.
3. **Verificado en producción** con Chrome real: `POST` a `apps/trickvault/auth.php` → `200`, y el
   modo edición se desbloquea en la app. Evidencia:
   `tools/evidencias/2026-10-16_trickvault-modo-edicion-desbloqueado.png`.

**Lección que sigue valiendo.** Un hash sha256 de una contraseña corta se revienta en segundos y
el repositorio es público. Por eso la contraseña de edición (`PW_EDIT`, hoy `0`) **no protege la
publicación en GitHub**: publicar pide `PW_ACCESS`.

**Lo que no se puede deshacer.** Los hashes viejos seguirán en el historial de git para siempre.
Da igual: corresponden a contraseñas que ya no existen.

**Código muerto que quedó.** `apps/json/auth.php` no tenía `publicar.php` desplegado; hoy ese
`auth.php` valida `PW_ACCESS` por si el fichero aparece en el servidor. `apps/codigos_imagen/config.php`
(gitignored, con `ADMIN_PASSWORD`) ya no se lee: se puede borrar en hPanel.

---

## 🔴 Claves de Google: inventario verificado el 2026-10-16

**19 claves distintas incrustadas en el código.** La entrada del 2026-10-15 decía «6 claves en 37
ficheros»: era un barrido más estrecho. Comprobadas una a una contra la API de Google, el asunto
es **más pequeño de lo que parecía y a la vez más matizado**.

### Solo 5 están publicadas de verdad

| Clave | Tipo | Proyecto | Ficheros publicados | Qué la arregla |
|---|---|---|---|---|
| `AIzaSyAlTZgo…` | **Firebase web apiKey** | `nanobanana-cbb2d` | `generar_imagenes/app.js`, `imagenes_ia/app.js`, `prompts_predeterminados/web.js`, `viaje_tiempo/firebase-applet-config.json` (y hasta 22, varios ya no servidos) | **Restringir** (referrer + APIs) |
| `AIzaSyDPb62H…` | Google AI (applet) | `1031118683051` | `pagina_corel/puntillizer.html` | Rotar |
| `AIzaSyAYhoQj…` | Firebase web apiKey | `t-dispatcher-490620-r4` | `tools/chronos-booth/firebase-applet-config.json` — **ya no se sirve por web** (16-10-2026) pero **sigue en GitHub** | Rotar |
| `AIzaSyC1C-hX…` | Gemini (servidor) | — | `webs/nano_banana/api/base.php` | Rotar; la restricción por IP limita el daño |
| `AIzaSyAlyFoK…` | Gemini (servidor) | — | `webs/nano_banana/api/integrate.php` | Rotar |

**Matiz que cambia el consejo:** el `apiKey` de Firebase (`firebase-applet-config.json`) **está
diseñado para ser público** — identifica el proyecto; la seguridad la dan las *Security Rules* y
las restricciones. Ahí lo que tapa el agujero es **restringir la clave** (referrer
`https://atnojs.es/*` + limitarla a las APIs que se usan), no solo rotarla.

### 12 ya están muertas: no hay nada que rotar

Google las rechaza con `API key not valid`: `C1QoTQ` (15 ficheros), `cBEh9ZAg`, `CabuZR`,
`PPnp9ZeO`, `Yz4BEZyF`, `wdHoSBt6`, `JMQxCD4e`, `HiVW19zY`, `Bwlhkj`, `CeV3D7`, `gUP5k2AR`.
Y **`A1uwqu` figura como «reported as leaked» y bloqueada**: Google detectó la filtración sola.
Aquí solo queda **limpiar el código**, no rotar.

### Lo que NO está publicado (comprobado con HTTP, uno a uno)

- `apps/ESTADO_ACTUAL_2026-05-1{7,8}.md` → **404 y gitignored**. Dentro viven la clave Gemini
  **viva y sin restricción** (`CLOhDJ`) y **una clave de OpenAI `sk-proj-…`**. No están expuestas…
  pero es un documento con secretos en claro dentro del árbol: **jamás debe entrar en git**.
- `apps/paginas/_Paginas.zip`, `apps/chronos-booth (1).zip`, `apps/Copias por si/app_estilos/.env`
  (`403`), `*.bak`, `*.backup_*` → todas fuera de git y sin servir.

### Trampa encontrada (importante)

`apps/generar_imagenes/1/app.js.bak` → **HTTP 200 aunque no está en git**. Los ficheros
**ignorados por git NO se borran del servidor**: si en su día estuvieron versionados, siguen
publicados. Hay que retirarlos **a mano** en el servidor.

### Lo que NO se puede hacer desde el agente (comprobado)

- **No hay `gcloud`** instalado.
- El token OAuth de Hermes (`E:\hermes-data\google_token.json`) tiene permisos de Gmail, Calendar,
  Docs, Sheets, Drive y YouTube — **ninguno de `cloud-platform`**, y además caducó el
  2026-07-09.
- El service account de `keys/` vive en **otro proyecto** (`nano-banana-470719`) que las claves
  expuestas.

→ **Crear claves nuevas es cosa de la consola de Google Cloud, con sesión de Antonio.**

### Herramienta para el intercambio

`tools/rotar-claves-google.ps1` (nunca hace commit: publicar es una decisión).

```powershell
# Inventario con el estado de cada clave (no toca nada)
powershell -NoProfile -ExecutionPolicy Bypass -File tools\rotar-claves-google.ps1 -Listar

# Simulacro de la sustitución
... -Vieja AIzaSyVIEJA... -Nueva AIzaSyNUEVA...

# Aplicarlo
... -Vieja AIzaSyVIEJA... -Nueva AIzaSyNUEVA... -Aplicar

# Varias a la vez, desde un JSON {"AIzaVIEJA":"AIzaNUEVA", ...}
... -MapaJson tools\claves-nuevas.json -Aplicar
```

Recorre `apps/`, `webs/`, `skills/` y `public_html/` (salta `node_modules`), **relee cada fichero
después de escribirlo** para confirmar que no queda la vieja y avisa si quedara.

### Qué SÍ está bien

- `E:\ANTIGRAVITY\keys\` y `E:\ANTIGRAVITY\.private\` → fuera de git e inaccesibles por web
  (`https://atnojs.es/keys/.env` → `403`, `/.env` → `403`).
- Los secretos de Hermes y OmniRoute no están versionados.
- La contraseña de edición: rotada el 2026-10-16 (ver arriba).
