---
name: zapier-mcp
description: "Conectar Hermes al servidor MCP de Zapier (9000+ apps sin programar integraciones). Usar cuando Antonio quiera darle a Hermes acceso a apps externas (Gmail, Calendar, Notion, WhatsApp...) vía Zapier MCP, o reparar/reconectar ese servidor. Solo lectura primero: tools.include con las 7 de lectura."
---

# Zapier MCP en Hermes (Antigravity)

Puente oficial: `https://mcp.zapier.com/api/v1/connect`. Zapier MCP expone las apps conectadas en la cuenta Zapier de Antonio como herramientas MCP. OAuth estándar (DCR + PKCE S256), sin API keys en el prompt.

## Estado (validado 2026-09-25)

- Endpoint vivo, OAuth completado con la cuenta Google de Antonio (plan free).
- Config en `E:/hermes-data/config.yaml` → `mcp_servers.zapier` (auth: oauth, enabled).
- `tools.include` = 7 tools de SOLO LECTURA. Las de escritura/borrado quedan fuera salvo petición expresa.
- Prueba end-to-end hecha (JSON-RPC crudo): initialize, tools/list y `list_zapier_connections` responden bien.
- Tokens OAuth cacheados en `E:/hermes-data/mcp-tokens/zapier.json` (+ `.client.json`, `.meta.json`).
- Las tools solo aparecen en sesiones de Hermes nuevas (reiniciar la app o nueva conversación tras cambios).

## Costes (decisivos antes de proponer uso)

- Cada `execute_zapier_*_action` exitosa consume **2 tasks** del plan Zapier (free = 100 tasks/mes → ~50 llamadas).
- `list_*`, `inspect_*`, `discover_*` NO consumen tasks.
- Si un flujo pasa a uso diario → proxy.php propio (skill_maestra), no Zapier.

## Flujo de conexión (validado)

1. `hermes mcp remove zapier` si hay restos; luego en pty (NO pipe):
   `hermes mcp add zapier --url "https://mcp.zapier.com/api/v1/connect" --auth oauth --connect-timeout 300`
   El add arranca el flow OAuth, abre navegador e imprime la URL de autorización (5 min de margen).
2. Antonio autoriza en el navegador (continúa con Google). Los tokens se guardan solos.
3. Si el add se queda en el prompt "Enable all 17 tools? [Y/n/select]": matar el proceso y relanzar SIN pty con `printf 'Y\n' | hermes mcp add ...` (los tokens ya están cacheados; conecta sin flow y guarda 17/17). `n` CANCELA todo.
4. Restringir a solo lectura añadiendo `tools.include` bajo `mcp_servers.zapier` (7 tools abajo). El patch tool de Hermes BLOQUEA config.yaml: editar con python o `hermes mcp configure zapier` interactivo.
5. Verificar: `hermes mcp test zapier` (lista 17) y `hermes mcp list`.

## Mapa de las 17 tools

| Tool | Tipo | Incluida |
|---|---|---|
| discover_zapier_actions | búsqueda apps/acciones | ✅ |
| inspect_zapier_actions | lectura (llamar ANTES de execute) | ✅ |
| execute_zapier_read_action | lectura datos apps | ✅ |
| execute_zapier_write_action | ESCRITURA (consume 2 tasks) | ❌ |
| list_zapier_connections | lectura conexiones | ✅ |
| list_zapier_skills / get_zapier_skill | lectura skills Zapier | ✅ |
| get_configuration_url | URL de configuración | ✅ |
| enable/disable_zapier_action, auto_provision_mcp | configuración | ❌ |
| manage_zapier_connections | devuelve URL para conectar cuenta | ❌ (activar solo al conectar apps) |
| create/update/delete_zapier_skill, write_code_action | escritura | ❌ |
| send_feedback | feedback | ❌ |

## Conectar una app (p. ej. Gmail) por primera vez

1. `manage_zapier_connections` (o `get_configuration_url`) → URL de conexión.
2. Antonio abre la URL y autoriza su cuenta Google en Zapier (OAuth de Zapier, 1 clic).
3. Desde entonces: `inspect_zapier_actions` → `execute_zapier_read_action` para leer datos.
4. Regla de seguridad (del tutorial de Pau Berenguer + skill_maestra): acciones poco delicadas primero — leer/borradores, nunca envíos directos sin pedirlo; añadir siempre al prompt restricciones tipo "no envíes email".

## Pitfalls

- **`hermes mcp add` sin TTY guarda el server SIN auth** (pregunta "Continue without authentication? [Y/n]"): usar pty para el flow OAuth.
- **Los `process submit` no llegan a los prompts del CLI en pty Windows**: matar y relanzar con pipe (`printf 'Y\n'`).
- **El auto-reload de Hermes da solo 30 s al flow OAuth**: el add con `--connect-timeout 300` da margen; para re-auth usar `hermes mcp login zapier` (espera 5 min).
- **El filtro tools.include se aplica en la sesión, no en `hermes mcp test`** (el test siempre lista 17).
- Borrar los mp4 de tutoriales tras transcribir (`E:/hermes-data/tmp/tutoriales/`): pesan ~33 MB.

## Prueba cruda sin SDK (por si hay que diagnosticar)

JSON-RPC directo con `urllib` y el token de `mcp-tokens/zapier.json`: initialize → notifications/initialized → tools/call. Ejemplo funcional: `E:/hermes-data/cache/scratch/test_zapier_raw.py` (el `list_zapier_connections` exige `selected_api` como string).
