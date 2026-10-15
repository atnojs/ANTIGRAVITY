# Credenciales: dónde viven y quién las usa

**Regla absoluta: aquí no se escribe ningún valor.** Solo rutas, nombres de clave y
dependencias. Si necesitas el valor, ve al almacén.

Última revisión: 2026-10-15

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
| Carpeta `keys/` | `E:\ANTIGRAVITY\keys\` (**gitignored**, línea 106) | Cuenta de servicio Google (`nano-banana-*.json`) y varios | Apps de imagen |
| Carpeta `.private/` | `E:\ANTIGRAVITY\.private\` | `config.json` + su `.htaccess` | Apps privadas |

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
| Claves de Google | `.env`, `keys/`, y **los frontends que las tengan incrustadas** (ver abajo) |
| Token de GitHub | `inicio.md` (está en `.gitignore`: **no** quitar esa línea) |

---

## 🔴 Claves expuestas detectadas el 2026-10-15 (sin resolver)

**37 ficheros dentro de `apps/` llevan una clave de Google (`AIza…`) escrita en el código.**
Son **6 claves distintas**, y casi todas se sirven por web con `HTTP 200`:

| Prefijo | Ficheros (muestra) |
|---|---|
| `AIzaSyC1QoTQ…` | `apps/Copias por si/((((ajustes_imagen))))/app.js`, `apps/decorar_habitacion/5/app1.js`, `apps/generar_imagenes/{,1/,mascara/,rectangulos/}app*.js` |
| `AIzaSyAlTZgo…` | `apps/generar_imagenes/app.js`, `apps/imagenes_ia/app.js`, `apps/imagenes_ia/ajustes_imagen/app.js`, `apps/prompts_predeterminados/web.js`, `apps/viaje_tiempo/assets/index-DprkQdw_.js` |
| `AIzaSyBwlhkj…` | `apps/Copias por si/((((ajustes_imagen))))/app_mejorado_cambios_realizados.js` |
| `AIzaSyA1uwqu…` | `apps/paginas/nano_banana/api/base.php` y `integrate.php` |
| `AIzaSyDPb62H…` | `apps/paginas/pagina_corel/puntillizer.html` |
| `AIzaSyCabuZR…` | `apps/paginas/prompts_predeterminados/1/web.js` |

**Agravante:** el repositorio `github.com/atnojs/ANTIGRAVITY` es **público**
(`api.github.com/repos/atnojs/ANTIGRAVITY` → `200`), así que las claves están publicadas
por dos vías: el sitio y GitHub. Y aunque se borren los ficheros, **el historial de git las
conserva**: por eso rotarlas es obligatorio, no opcional.

### Qué hacer (en este orden)

1. **Revocar y regenerar las 6 claves** en Google Cloud Console → APIs y servicios →
   Credenciales (se identifican por el prefijo de la tabla).
2. Sustituir su uso en los frontends por llamadas a **`proxy.php`** (patrón del proyecto:
   la clave vive en el servidor, nunca en el navegador). Referencia:
   `skills/SKILL_arquitecto-backend-php-hostinger.md` y `skills/proxy.php`.
3. Si alguna clave tiene que seguir siendo de navegador, ponerle **restricción por
   referrer y por API** en Google Cloud (mitiga, no arregla).
4. Limpiar los ficheros con `git rm` y publicar… **después** de rotar, nunca antes.

### Lo que SÍ está bien

- `E:\ANTIGRAVITY\keys\` y `E:\ANTIGRAVITY\.private\` → fuera de git e inaccesibles por web
  (`https://atnojs.es/keys/.env` → `403`, `/.env` → `403`).
- Los secretos de Hermes y OmniRoute no están versionados.
