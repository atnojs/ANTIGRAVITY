# Fallos históricos ya resueltos

Catálogo de fallos que YA se diagnosticaron y resolvieron una vez, para que ninguna sesión futura repita el mismo camino de investigación.
Se alimenta de la base de conocimiento de Hermes (`E:\hermes-data\skills\`, informes de `E:\hermes-data\cron\output\`), de los respaldos del segundo cerebro (`E:\ANTIGRAVITY\backups\`) y de los logs cortos que documentan un fallo con su causa; los hechos están tal cual aparecen en esas fuentes.

## Facturación y cuotas

### [2026-08-12] DeepSeek se facturaba por OpenRouter a causa de los aliases de OmniRoute
- **Síntoma:** el panel de costes de OpenRouter mostraba cargos por "DeepSeek V4 Pro" y "DeepSeek V4 Flash 0423" aunque DeepSeek estaba desactivado en los ajustes de OpenRouter y la intención era ir por API directa.
- **Causa:** los aliases de OmniRoute (almacén clave-valor `modelAliases`) mapeaban los nombres desnudos de DeepSeek a rutas `openrouter/...`, auto-sincronizadas del catálogo de OpenRouter. Todo cliente que enviara el nombre desnudo (el default de Hermes, crons con `model: deepseek-v4-flash`) se facturaba en OpenRouter; las llamadas con prefijo (`deepseek/` o `ds/`) ya iban directas, y por eso el diagnóstico previo no veía la fuga. El sufijo "0423" era la versión fechada del mismo modelo en el catálogo de OpenRouter.
- **Solución:** reescribir los aliases a la conexión directa con `PUT /api/models/alias` (POST y PATCH devuelven 405) y verificar con las cabeceras `x-omniroute-*` (`x-omniroute-provider=ds`) y con `/api/sessions` (connectionId de la conexión directa). Si se re-sincroniza el catálogo de OpenRouter, los aliases pueden regenerarse: repetir la comprobación.
- **Fuente:** E:\hermes-data\skills\antigravity\diagnostico-ruteo-facturacion\references\fix-alias-omniroute-deepseek.md

### [2026-08-18] Un cron sin `enabled_toolsets` gastaba ~1,24 M tokens por ejecución
- **Síntoma:** el cron "Top 5 vídeos del día" (`42d042c788f7`) registró 1.244.413 `prompt_tokens` en UNA sola ejecución (~0,36 $/ejecución, ~11 $/mes) con un output de 3,5 KB.
- **Causa:** `enabled_toolsets: null` hacía que el agente cargara el prompt base con TODOS los toolsets en cada turno.
- **Solución:** fijar el `enabled_toolsets` mínimo que el job necesite (p. ej. `["terminal"]` si solo ejecuta un script) y usar `no_agent=true` cuando el script ya produce el informe completo (gasto 0). Verificar la bajada en `E:\hermes-data\cron\usage_audit.jsonl` antes/después.
- **Fuente:** E:\hermes-data\skills\antigravity\diagnostico-ruteo-facturacion\references\auditoria-gasto-crons.md

### [2026-08-18] BFL sin créditos: 0 imágenes generadas; el proxy ya soportaba Gemini
- **Síntoma:** BFL devolvía "Insufficient credits" y el lote de imágenes quedó en 0 piezas.
- **Causa:** la cuenta de `api.bfl.ai` se había quedado sin créditos.
- **Solución:** usar el fallback Gemini del proxy unificado ya desplegado (`{"action":"generate","model":"gemini-flash"}` o `gemini-pro`). Ojo con el formato: la respuesta de Gemini trae el base64 en el campo `image` y SIN prefijo `data:` (no en `imageUrl`), y no incluye campos de coste ni de modelo.
- **Fuente:** E:\hermes-data\skills\software-development\cron-texto-largo\references\gemini-fallback-imagenes.md

### [s/f] Xiaomi MiMO: 401 "Invalid API Key" con una key recién generada
- **Síntoma:** HTTP 401 `Invalid API Key` al configurar Xiaomi MiMO como proveedor, incluso con una key nueva del panel.
- **Causa:** en esa plataforma la generación de la key y la activación del servicio están separadas: sin un **Token Plan** activo con saldo (Finance → Token Plan), hasta las keys válidas devuelven 401.
- **Solución:** revisar Finance → Token Plan / Account Balance antes de regenerar la key; la generación de key no equivale a activación de API.
- **Fuente:** E:\hermes-data\skills\software-development\provider-account-management\references\xiaomi-mimo-token-plan.md

## OmniRoute y proveedores

### [s/f] OmniRoute pierde las credenciales de proveedor al reiniciar
- **Síntoma:** tras reiniciar el servidor, `GET /api/providers` devolvía `total: 0` y las llamadas fallaban con 404 `No active credentials for provider`.
- **Causa:** OmniRoute guarda las credenciales solo en memoria; no sobreviven a reinicios y la clave del `.env` no se registra sola.
- **Solución:** daemon de autostart en tres capas (`.vbs` en la carpeta Inicio + `.cmd` + `.py`) que comprueba si OmniRoute está vivo, lo arranca si no y re-registra el proveedor cada hora; verificar con `GET /api/providers` después de cualquier reinicio. `Register-ScheduledTask` requiere admin (la cuenta no eleva): usar la carpeta Startup.
- **Fuente:** E:\hermes-data\skills\software-development\provider-account-management\references\omniroute-autostart-daemon.md

### [2026-10-05] Login del panel de OmniRoute: 401 "Invalid password" y rate-limit al insistir
- **Síntoma:** el login del panel devolvía 401 «Invalid password» (roto desde el 29/8/2026); el monitor diario y el autostart no entraban al panel, aunque el enrutado `/v1` no se veía afectado.
- **Causa:** la clave admin del panel había quedado inválida/caducada.
- **Solución:** restablecer la clave documentada con `omniroute setup --password … --non-interactive` (v3.8.49+), con copia previa de `%USERPROFILE%\.omniroute\storage.sqlite`. No probar claves en bucle: el login aplica rate-limit (`429 Too many failed attempts` con cabecera `Retry-After`, ~10 min).
- **Fuente:** E:\hermes-data\skills\software-development\omniroute-deepseek-autostart\SKILL.md

### [2026-08] OpenRouter por OmniRoute devuelve 401 mientras su test dice `valid: true`
- **Síntoma:** llamadas reales a OpenRouter a través de OmniRoute fallaban con 401 `Missing Authentication header`, aunque la conexión se registraba (201) y `/api/providers/{id}/test` informaba `valid: true`.
- **Causa:** bug conocido de la integración OpenRouter de OmniRoute: no envía la cabecera de autenticación (la key se comprobó correcta contra la API de OpenRouter directamente). El test de conexión es engañoso.
- **Solución:** no fiarse del test; la estrategia que funciona es OmniRoute para modelos gratuitos sin credenciales y OpenRouter DIRECTO para los de pago. El tipo de proveedor `custom` no sirve como rodeo.
- **Fuente:** E:\hermes-data\skills\software-development\hermes-integration-setup\SKILL.md

### [2026-08-13] Topes de gasto por modelo: los aliases con UUID no eligen credencial
- **Síntoma:** al intentar topar el gasto de los modelos caros, un alias del tipo `modelo → <connection-uuid>/<modelo>` devolvía 404 `No active credentials provider: <uuid>`.
- **Causa:** OmniRoute resuelve credenciales por PREFIJO de proveedor, no por UUID de conexión (los aliases con UUID solo resuelven el nodo). Además OpenRouter limita el gasto por key, no por modelo: la restricción "keys → restrict to models" de su web no se aplicó de verdad.
- **Solución:** una conexión OpenRouter dedicada por modelo caro (su propia key y prioridad) más `excludedModels` con patrones wildcard en `providerSpecificData` de cada conexión, aplicado con `PUT /api/providers/{id}` (PATCH da 405), y el tope mensual por conexión en OmniRoute. Cuidado con los patrones: `*gemini-3.5-flash` sin `*` final no cubre variantes y `google/*` excluiría todos los Gemini.
- **Fuente:** E:\hermes-data\skills\antigravity\diagnostico-ruteo-facturacion\references\enrutado-por-modelo-presupuesto.md

## Hermes y agentes

### [s/f] `delegate_task` lanzaba menos subagentes de los pedidos
- **Síntoma:** un lote de 13-15 tareas arrancaba solo 3, 5 o 9 subagentes, y el modelo lo justificaba como "el runtime limita la concurrencia".
- **Causa:** en Hermes solo existen tres topes reales (rechazo por número de tareas, truncador por turno y un aviso de coste que NO limita nada). Si esas líneas no aparecen en el log, el recorte lo hizo el propio modelo: los modelos de razonamiento redondean el lote a la baja y lo atribuyen al sistema.
- **Solución:** comprobar `hermes config get delegation.max_concurrent_children` y buscar en `agent.log` `Truncated.*delegate_task` / `Too many tasks`; si no aparecen, pedir explícitamente UN solo `delegate_task` con el array completo (o construir ese array de forma determinista). No revertir la configuración: el usuario la puso a propósito.
- **Fuente:** E:\hermes-data\skills\autonomous-ai-agents\hermes-agent\references\delegate-task-concurrency-diagnosis.md

### [2026-09-07] Marcadores de conflicto de git dentro del código: SyntaxError al cargar el cron
- **Síntoma:** `tui_gateway_crash.log` registró `SyntaxError: invalid syntax` en `cron/scheduler.py`, señalando la línea `<<<<<<< Updated upstream`; el hilo `desktop-cron-ticker` murió.
- **Causa:** el archivo contenía un bloque de conflicto de merge sin resolver (marcadores `<<<<<<<` / `>>>>>>>` dentro del código).
- **Solución:** borrar TODO el bloque de conflicto (desde `<<<<<<< Updated upstream` hasta `>>>>>>> Stashed changes`), compilar con `python -m py_compile` y `git add`. Si viene de re-aplicar el stash que deja `hermes update`, comprobar antes si el cambio ya está en el árbol: el conflicto suele ser una doble aplicación.
- **Fuente:** E:\hermes-data\logs\tui_gateway_crash.log (mecánica del stash en E:\hermes-data\skills\windows\instalacion-software-windows\SKILL.md)

### [s/f] Sesión "congelada" en el escritorio: contexto al techo o rotación de sesión
- **Síntoma:** la vista de una sesión deja de avanzar; en `desktop.log` aparece `Compacting context — summarizing earlier conversation…`; en `gui.log` el mismo `ui_session` pasa a otro `agent_session_id` sin que el usuario haya hecho `/new`; en `errors.log`, `Skipping session persistence for large failed session to prevent growth loop`.
- **Causa:** contexto al límite (compactación) y/o rotación de la sesión en esa pestaña; en sesiones muy grandes hay turnos que ni se persistieron, así que pueden faltar mensajes.
- **Solución:** diagnosticar sobre una apertura de SOLO lectura de `state.db` (`mode=ro`) acotando siempre por `session_id`, contar los mensajes de la sesión y mirar el tamaño de `sessions/request_dump_*.json` (su tamaño mide el contexto real del turno). Confirmar al usuario con cifras y citar su último mensaje real leído de la base.
- **Fuente:** E:\hermes-data\skills\productivity\continuidad-sesiones-hermes\references\state-db-sesiones.md

## Hostinger y despliegue

### [2026-08-09] Pantalla en blanco en Hostinger: el CSP del vhost bloquea cdnjs
- **Síntoma:** app React desplegada con `#root` vacío (solo el fondo), funcionando en local; sin mensaje de error visible porque los scripts nunca llegaron a cargar.
- **Causa:** el CSP del vhost permite `unpkg.com` y `cdn.tailwindcss.com` en `script-src`, pero NO `cdnjs.cloudflare.com`. El `.htaccess` de la app no puede sobrescribirlo: añade una SEGUNDA cabecera CSP y el navegador aplica la intersección (la más restrictiva gana).
- **Solución:** cambiar los scripts CDN a `unpkg.com`. Diagnóstico: `curl -sI` para leer la cabecera CSP y Chrome headless (`--enable-logging=stderr --v=0` y `--dump-dom`) para ver la violación exacta y confirmar que el DOM quedó vacío.
- **Fuente:** E:\hermes-data\skills\software-development\hostinger-static-app\references\hostinger-csp-diagnostic-log-2026-08-09.md

### [2026-07] El WAF de Hostinger elimina los `onclick` en línea: botones mudos
- **Síntoma:** botones que no hacen nada en producción (`onclick="miFuncion()"` sin efecto) y sin error en consola.
- **Causa:** el módulo de seguridad de Hostinger elimina los manejadores de eventos en línea (`onclick`, `onsubmit`, `onchange`, `onkeydown`…).
- **Solución:** registrar los manejadores con `element.addEventListener('click', handler)` desde un bloque `<script>`; y no colocar botones de acción dentro de contenedores que se ocultan/muestran.
- **Fuente:** E:\hermes-data\skills\antigravity\arquitecto-backend-php-hostinger\references\hostinger-frontend-pitfalls.md

### [2026-10-15] hcdn re-codifica las imágenes: falso "desajuste" diario repo↔producción
- **Síntoma:** 244 de 244 imágenes con `Content-Length` distinto al blob de HEAD (unas mayores y otras menores); el cron de verificación parecía detectar un despliegue desajustado.
- **Causa:** el edge (hcdn) re-codifica las imágenes (sirve WebP si el cliente lo acepta). No había dos versiones: el diff de píxeles dio 0,0 % de píxeles con diferencia >24. Los textos sí van byte-exactos.
- **Solución:** comparar imágenes por PÍXELES (`scripts/comparar-imagen-prod.py`), nunca por md5 ni tamaño; comparar texto con md5 tras `tr -d '\r'`; un 404 con `?t=` nuevo sí es incidencia real.
- **Fuente:** E:\hermes-data\skills\antigravity\verificar-despliegue-hostinger\references\hcdn-reencode-imagenes.md

### [2026-10-10] "No se ha desplegado" era la caché edge: faltaba el query en la URL
- **Síntoma:** un `curl` de `app.js` SIN querystring devolvía exactamente la versión de dos días antes, mientras el `index.html` servido ya era HEAD.
- **Causa:** caché edge de hcdn (`x-hcdn-cache-status: HIT`, `Age`); en mitad de un despliegue, peticiones distintas devuelven copias distintas (se vieron 3 versiones del mismo seed en minutos).
- **Solución:** pedir siempre la URL exacta del index servido o un cache-buster (`?v=…`, `?nc=…`); verificar convergencia y no instante (1-3 min por push; un 404 inmediato tras el push es normal, repollar). El `ETag` es el tamaño del origen en hexadecimal: si cuadra con HEAD pero el cuerpo no, el retraso es de la caché edge.
- **Fuente:** E:\hermes-data\skills\software-development\hostinger-static-app\references\comprobacion-repo-produccion.md

### [2026-09-28] `mbstring` ausente: el endpoint PHP devuelve cuerpo vacío (y no es "no responde")
- **Síntoma:** el endpoint respondía HTTP con cuerpo VACÍO según qué rama de validación se ejecutara (con `prompt` vacío respondía bien; con `prompt` no vacío, nada).
- **Causa:** `mb_strlen`/`mb_substr` no existen si falta la extensión `mbstring`; con `display_errors=off` es un fatal silencioso.
- **Solución:** helpers con fallback (`function_exists('mb_strlen')` → `preg_match_all('/./us')`), comprobar `php -m | grep -i mbstring` antes de dar el endpoint por bueno y diagnosticar con `php -l` probando las ramas por separado. La CLI no alimenta `php://input`: probar con `php -S` y una petición HTTP real.
- **Fuente:** E:\hermes-data\skills\creative\videos-flow-veo\references\flow-cola-endurecida.md

## Windows y entorno

### [2026-07-25] Telegram se cayó en silencio por CP1252 (`UnicodeDecodeError`)
- **Síntoma:** el bot dejó de responder; la app de escritorio seguía aparentemente bien; `desktop.log` con `[gateway-crash] thread Thread-302 (_readerthread) raised UnicodeDecodeError: 'charmap' codec can't decode byte 0x8f in position 73`.
- **Causa:** en Windows los lectores de subprocesos de Python usan por defecto el códec ANSI (CP1252); cualquier byte no ASCII en la salida del gateway mata el hilo lector y con él TODAS las plataformas de mensajería. Distinción clave: `tui_gateway` (websocket de la UI) NO es el gateway de plataformas: un escritorio sano no prueba que Telegram/WhatsApp estén vivos.
- **Solución:** añadir `PYTHONUTF8=1` al `.env` (con un script Python, nunca `sed` ni `python -c` en línea, porque el `.env` está protegido) y reiniciar el gateway desde una terminal aparte; verificar en `agent.log` la línea `Gateway running with N platform(s)`.
- **Fuente:** E:\hermes-data\skills\software-development\hermes-integration-setup\references\dead-platform-gateway-diagnosis.md

### [2026-08-04] La tarea programada arrancaba el gateway con el HERMES_HOME viejo
- **Síntoma:** Telegram offline desde el 25/7; `hermes gateway start` y `restart` desde otra terminal decían "success", pero `agent.log` no mostraba `Connecting to telegram...`.
- **Causa:** tres fallos independientes: `.env` sin `PYTHONUTF8=1`; el `.vbs` de la tarea `Hermes_Gateway` con el `HERMES_HOME` antiguo hardcodeado (la tarea se dispara al iniciar sesión); y `HERMES_HOME` ausente del registro porque la migración nunca ejecutó `setx`.
- **Solución:** reescribir el `.vbs` con las rutas actuales, `setx HERMES_HOME "…"`, lanzar la tarea con `schtasks /run /tn "Hermes_Gateway"` (solo corre al iniciar sesión) y verificar en `agent.log` la secuencia de conexión. Ojo: "Gateway already running" puede estar emparejando el proceso del escritorio, que no carga plataformas; los arranques por shell y por tarea son caminos INDEPENDIENTES y hay que arreglar los dos. `reg query … /v` falla en git-bash: usar `//v`.
- **Fuente:** E:\hermes-data\skills\software-development\hermes-integration-setup\references\gateway-scheduled-task-repair.md

### [s/f] Actualizar la app Electron de Hermes desde dentro falla por locks
- **Síntoma:** `hermes update` lanzado desde el propio agente termina con exit 1; parece problema de red o de permisos y no lo es.
- **Causa:** el agente corre DENTRO de la app: Windows mantiene bloqueados los archivos de `win-unpacked`, así que el proceso no puede reescribirse ni matarse a sí mismo.
- **Solución:** respaldo previo y swap mediante una tarea programada (`schtasks /Create … /SC ONCE`) que espera, hace `taskkill`, copia el build nuevo sobre `win-unpacked` y relanza el ejecutable; borrar la tarea al terminar. NO re-aplicar el stash que deja `hermes update` (doble aplicación → conflicto de ~1200 líneas aunque el cambio local fuera de 1 línea). La UI nueva vive en el `app.asar` empaquetado, no en el backend: actualizar solo el backend no trae features de UI.
- **Fuente:** E:\hermes-data\skills\windows\instalacion-software-windows\SKILL.md

### [s/f] Rutas MSYS pasadas a herramientas nativas de Windows: carpetas anidadas o error de ruta
- **Síntoma:** `git clone URL /e/herramientas/x` "termina bien" pero deja el repo en `E:\e\herramientas\x`; `wsl --export` con una ruta tipo `/d/...` falla con `Wsl/ERROR_PATH_NOT_FOUND`.
- **Causa:** las utilidades nativas de Windows (git.exe, wsl.exe, instaladores) no entienden las rutas MSYS de git-bash.
- **Solución:** usar `cd` + ruta relativa o rutas nativas (`E:/…`, `D:\…`); si ya se creó la carpeta anidada, mover el contenido y borrarla. Mismo principio para cualquier `.exe` nativo.
- **Fuente:** E:\hermes-data\skills\windows\instalacion-software-windows\SKILL.md y E:\hermes-data\skills\software-development\backups-wsl\SKILL.md

### [s/f] "No veo nada nuevo": abrir la URL desde bash fallaba en silencio
- **Síntoma:** tras un cambio de front-end el usuario no ve nada nuevo; el comando de apertura salía con exit 0 y sin ningún error.
- **Causa:** `start chrome "url"` y `cmd //c start chrome "url"` desde git-bash NO abren nada (imprimen el banner de cmd y salen con 0). Un exit 0 no prueba que la pestaña se abriera.
- **Solución:** abrir con `powershell.exe -NoProfile -Command "Start-Process 'https://…'"`; y cuando el usuario dice "no veo nada", sospechar primero de la apertura fallida y de la caché de su pestaña (bump de `?v=` + Ctrl+F5) y comprobar por `curl` la versión servida, antes de buscar el fallo en el CSS.
- **Fuente:** E:\hermes-data\skills\software-development\automatizacion-gui-windows\SKILL.md

## WhatsApp y Telegram

### [s/f] Telegram: `Conflict: terminated by other getUpdates request`
- **Síntoma:** el bot deja de responder; en `agent.log` o `gateway-stdio.log` aparecen `Conflict: terminated by other getUpdates request; make sure that only one bot instance is running` y reintentos `polling conflict (n/5)` en oleadas.
- **Causa:** dos procesos sondeando el mismo token (un segundo gateway, otro perfil con la misma credencial, o un proceso zombie que `gateway stop` dijo haber parado).
- **Solución:** comparar la HUELLA (hash) del token entre local y remoto para saber si es el mismo bot, sondear `getUpdates` para ver si hay sondeo activo en ese instante, listar procesos con `Get-CimInstance Win32_Process` buscando un segundo `gateway run`, y dejar un único dueño por token; limpiar el `.env` no mata un gateway ya arrancado, hay que reiniciar. Cierre: `✓ <canal> connected` sin nuevos `Conflict:` durante varios minutos.
- **Fuente:** E:\hermes-data\skills\autonomous-ai-agents\hermes-gateway-plataformas\references\telegram-token-conflictos.md

### [s/f] WhatsApp en modo self-chat rechazaba los mensajes propios
- **Síntoma:** los mensajes enviados a uno mismo quedaban con un solo check (enviado pero no entregado al puente); el log del puente mostraba `{"event":"ignored","reason":"self_chat_mode_rejects_non_self"}`.
- **Causa:** en modo self-chat el mensaje que envía el teléfono llega al puente como `!fromMe`, y el código rechazaba TODOS los `!fromMe` — un filtro redundante, porque ya había uno anterior que descarta los chats que no son el propio.
- **Solución:** dejar pasar los `!fromMe` cuando el modo es self-chat (manteniendo la comprobación de allowlist en modo bot) y reiniciar el gateway. La allowlist debe llevar el número completo con prefijo de país.
- **Fuente:** E:\hermes-data\skills\antigravity\cirujano-codigo-produccion\references\whatsapp-selfchat-fromme-fix.md

## Cron y automatizaciones

### [2026-08-18] Cron de relatos: `RuntimeError: Response truncated due output length limit`
- **Síntoma:** runs fallidos desde el 13/8 con ese error; los últimos relatos en disco eran del día 12; `desktop.log` con `Response truncated (finish_reason='length')` y `out=8193` justo en el tope de 8.192.
- **Causa:** el runtime de Hermes limita la salida por respuesta (~8.192 tokens); cuando el modelo emite una llamada a tool con argumentos enormes (un `write_file` con el relato completo, un `delegate_task` con los contextos de 3 subagentes), la respuesta se corta a mitad del JSON y el runtime se niega a ejecutar argumentos incompletos. El proveedor aceptaba hasta 20.000 tokens: el límite lo pone Hermes, no el backend. En sesión interactiva hay continuación; en cron, fallo directo.
- **Solución:** escribir por secciones — `write_file` (ficha + `### I`) y un `patch` por sección — con REGLA DE ORO en el prompt ("NUNCA escribas más de ~600 palabras por respuesta") y sin `delegate_task`; medir el cuerpo con `awk 'f{print} /^---$/{f=1}' archivo.md | wc -w` y verificar en disco.
- **Fuente:** E:\hermes-data\skills\software-development\cron-texto-largo\references\caso-relatos-2026-08.md y E:\hermes-data\skills\autonomous-ai-agents\diagnostico-crons-hermes\references\caso-relatos-2026-08.md

### [2026-10-03] `.part.md` huérfanos de runs cortados: recuperación obligatoria
- **Síntoma:** borradores `*.part.md` rancios que no están en el índice, pero que build.py compila igual (glob `*.md`) con un id acabado en `.part` → aparecen en la web.
- **Causa:** una sesión que muere a medias (p. ej. «Gateway shutdown») deja el relato como `.part.md`.
- **Solución:** decidir por liveness de mtime (días = muerto; minutos/horas = posible hermano vivo, no tocar); auditar con `find . -name "*.part.md"` (NUNCA `-name "*part*"`, que también captura "apartamento"); validar cuerpo en banda, `### I`-`### V` y una sola línea `Generado el`; renombrar a `NNN-titulo.md` y añadir su fila al índice con el correlativo máximo+1 recalculado justo antes. No hacer `build.py` a mano: lo hace el vigía.
- **Fuente:** E:\hermes-data\skills\software-development\cron-generacion-lotes\references\recuperacion-part-md.md

### [2026-09-28 → 2026-10-03] El vigía de relatos dejó de publicar: worktree inexistente
- **Síntoma:** los informes del job `a14f580e65eb` mostraban `Status: script failed` con `NotADirectoryError [WinError 267]` en `git fetch`; no se publicó nada entre el 28/9 y el 3/10.
- **Causa:** el script usaba `WT = E:\e\ANTIGRAVITY_MAIN_WT`, un worktree que ya no existe (solo queda `E:/e/ANTIGRAVITY`).
- **Solución:** apuntar a `E:\ANTIGRAVITY` (main directo); en este stack los scripts no deben recrear worktrees para "arreglar" rutas. Tras el fix, `Status: silent (empty output)` con exit 0 es ÉXITO por diseño (el script imprime `ERROR …` y rc=1 cuando falla).
- **Fuente:** E:\hermes-data\skills\autonomous-ai-agents\diagnostico-crons-hermes\references\caso-vigia-relatos-2026-10.md

### [2026-09-27/28] Job huérfano fallando en bucle: la función se había eliminado a propósito
- **Síntoma:** `Flow queue bridge (032692aa17c3)`, job `no_agent` cada 5 minutos, fallaba TODAS las pasadas (>19 h sin un solo `completed`) con `flow_queue_worker ERROR HTTPError`.
- **Causa:** el worker hacía POST a un `flow_queue.php` que devolvía 404 (retirado del despliegue) porque el usuario había pedido ELIMINAR el modelo FLOW y se revirtieron los commits: eliminación intencional, no avería.
- **Solución:** `hermes cron pause 032692aa17c3` (reversible; no borrar ni restaurar) y reportar los pendientes (scripts muertos del worker, skill desactualizada). Lección de clase: un fallo "desde una hora exacta" sobre una feature concreta → mirar el `git log` del repo desplegado y buscar la intención del usuario ANTES de reparar; un endpoint que da 404 mientras el resto de la app responde 200 es un fichero retirado, no una caída del host.
- **Fuente:** E:\hermes-data\skills\autonomous-ai-agents\diagnostico-crons-hermes\references\caso-cola-flow-2026-09.md

### [2026-09-28] Cola de Flow: jobs atascados en `processing` y colisión con lotes paralelos
- **Síntoma:** el frontend sondeaba indefinidamente y la cola se quedaba seca; con 4 workers de lote + el worker de la cola a la vez se llegaron a 78 procesos de chrome y todo moría con `TargetClosedError`.
- **Causa:** si el worker muere a mitad (lo típico es `TargetClosedError` al descargar de Flow), el job queda en `processing` para siempre, porque `poll` solo mira los `pending` y nunca vuelve a devolverlo. Y el worker de la cola no convive con lotes paralelos.
- **Solución:** al reclamar, anotar `startedAt` en el job y devolver a `pending` todo lo que exceda el timeout del worker más margen (1200 s); NO usar `createdAt` como atajo (reclamaría jobs recién empezados y dos workers generarían el mismo id). Cerrar los lotes antes de probar la cola: es prioridad interactiva.
- **Fuente:** E:\hermes-data\skills\creative\videos-flow-veo\references\flow-cola-endurecida.md

### [2026-09-28] Índice de relatos: filas con triple tubería y contador mal calculado
- **Síntoma:** filas corruptas tipo `||| N |` que la sesión siguiente no detecta y propaga; dudas sobre el valor de `## Relatos (N)`.
- **Causa:** varias sesiones de cron escriben el mismo `_INDICE.md` el mismo día; además `## Relatos (N)` es el número de FILAS, no el mayor número de fila (hay huecos históricos, p. ej. el #171).
- **Solución:** auditar antes de escribir (`grep -c '^|||'` debe dar 0; `grep -o '\|---' | wc -l` debe dar 9 grupos), calcular máximo+1 justo antes de insertar y aplicar cabecera + fila + balance en un solo parche, re-verificando tras el aviso `modified by sibling`. Ojo: el render de `read_file` prefija «N|» a cada línea y hace ver `|||` donde el archivo dice `||`; para montar anclas, leer los bytes crudos.
- **Fuente:** E:\hermes-data\skills\software-development\cron-generacion-lotes\references\indice-format.md y E:\hermes-data\skills\productivity\segundo-cerebro-brief\references\verificacion-recetas.md

### [s/f] build.py: dos bugs de compilación (narradoras como hombres y carpeta de imágenes como temática)
- **Síntoma:** en `data.js`, los relatos con narradora salían con `"narrador": "Hombre"`; y al crear la carpeta `imagenes/`, `REGISTRO.md` aparecía como relato fantasma en la web.
- **Causa:** (1) el parser comprobaba `"narrador" in low` antes que `"narradora"`, y "narrador" es substring de "narradora"; (2) el escaneo de temáticas no excluía la carpeta nueva `imagenes/`.
- **Solución:** comprobar `"narradora"` primero y luego `"narrador"` (verificando en `data.js` tras cada `python build.py` que los relatos con narradora salen como Mujer); y añadir `EXCLUDE_DIRS = {"series", "imagenes"}`, comprobando después el número de imágenes compiladas.
- **Fuente:** E:\hermes-data\cron\output\445188067b70\2026-10-01_14-32-20.md (pitfalls de la skill de relatos) y E:\hermes-data\skills\software-development\cron-generacion-lotes\references\caso-relatos-imagenes.md

### [2026-08-18] `execute_code` está bloqueado en los runs de cron sin usuario
- **Síntoma:** el run del cron gastó una llamada en un `execute_code` que no se ejecutó; además el cron no llegó a actualizar el `_INDICE.md` (dejó un `_update_index.py` auxiliar y filas en formato pegado `|| N Nombre…`, sin tuberías).
- **Causa:** en runs de cron sin usuario presente, `execute_code` está bloqueado por política de aprobación; y el cron puede terminar sin actualizar el índice.
- **Solución:** hacer las ediciones con `patch`/`write_file` normales, nunca con scripts de `execute_code` (probarlo primero cuesta una llamada perdida); ejecutar o hacer a mano la actualización del índice y normalizar las filas al formato canónico; mover los scripts auxiliares a `E:/ANTIGRAVITY/backups/<fix>/aux/`. Y ojo: `hermes cron run <id>` por CLI puede dejar el run `claimed` sin sesión real → usar la tool `cronjob action=run`.
- **Fuente:** E:\hermes-data\skills\software-development\cron-texto-largo\references\caso-relatos-2026-08.md

### [2026-09-22] Un merge ajeno revirtió la web de relatos en producción
- **Síntoma:** producción servía un `data.js` de 128 relatos y un `index.html` sin versionar, mientras el repo local tenía 251 relatos.
- **Causa:** `origin/main` es COMPARTIDO y otras sesiones hacen force-push/merge desde bases viejas; ese día un merge ajeno (Video Vault) borró de main los commits de relatos. El auto-deploy de Hostinger sigue a `main`, así que un push ajeno con contenido viejo revierte la web.
- **Solución:** el vigía debe AUTO-SANAR: comparar en cada pase el fingerprint de ids de `git show origin/main:webs/relatos/data.js` y que su `index.html` contenga `data.js?v=`; si el repo perdió contenido, volver a commitear, pushear y bumpear la versión.
- **Fuente:** E:\hermes-data\cron\output\445188067b70\2026-10-01_14-32-20.md

### [s/f] Hostinger cachea `data.js` por URL: sin bump, el usuario ve contenido viejo
- **Síntoma:** una petición SIN query devolvía la copia cacheada (servía 231 relatos mientras el fichero real tenía 251).
- **Causa:** el hosting cachea por URL.
- **Solución:** el `index.html` debe cargar `data.js?v=YYYYMMDDHHMM` versionado, y el vigía hace bump de `?v=` (los tres assets) cuando el contenido cambia. Verificar por IDs y no por bytes: el tamaño local (CRLF en Windows) difiere del servidor (LF) aunque el contenido sea idéntico.
- **Fuente:** E:\hermes-data\cron\output\445188067b70\2026-10-01_14-32-20.md

## Escritura y edición de textos largos

### [s/f] La banda de palabras: el primer borrador siempre engaña
- **Síntoma:** fallos en las dos direcciones: overshoot (un primer borrador de 4.275 palabras con objetivo 3.500-4.000 costó ~15 podas encadenadas) y undershoot (borradores que "parecían" ~3.700 y medían 2.948, u otro de 2.563 frente a una banda 3.500-4.000: ~30 % corto).
- **Causa:** un borrador fresco se siente más largo de lo que es; el undershoot severo es lo normal, no la excepción.
- **Solución:** apuntar al techo o por encima (para 3.500-4.000, redactar hacia 4.200-4.500) y medir el cuerpo INMEDIATAMENTE tras el primer `write` con `awk 'f{print} /^---$/{f=1}' | wc -w`; aterrizar con colchón (~3.600-3.750). Si falta o sobra poco, 1-2 ediciones quirúrgicas, no una cascada de micro-ediciones.
- **Fuente:** E:\hermes-data\cron\output\445188067b70\2026-10-01_14-32-20.md

### [s/f] Duplicados al insertar con `patch` antes de un párrafo existente
- **Síntoma:** párrafos duplicados tras una tanda de parches secuenciales (`grep -c "frase clave"` devuelve más de 1 cuando solo debería haber 1).
- **Causa:** si el `new_string` incluye el texto que ya existe y el `old_string` no lo cubre, quedan las dos copias: la nueva dentro de la inserción y la original más abajo.
- **Solución:** que el `old_string` cubra esa línea existente y su contexto inmediatamente posterior, o que el `new_string` termine justo antes de la línea existente sin incluirla; tras cada tanda de parches, buscar duplicados por frase clave.
- **Fuente:** E:\hermes-data\cron\output\445188067b70\2026-10-01_14-32-20.md

### [s/f] Secciones huérfanas al expandir un bloque, y pérdida de la línea `*Generado el*`
- **Síntoma:** un archivo quedó con 8 secciones en vez de 4 (secuencias I,II,III,IV,II,III,IV) y numeración rota; al limpiar los bloques duplicados desapareció la línea `*Generado el DD/MM/YYYY*`.
- **Causa:** al reemplazar un bloque grande por contenido con más secciones, lo que venía después del bloque original NO se borra solo; y el `old_string` del parche de limpieza incluía sin querer la línea de fecha, que va justo tras la última sección válida.
- **Solución:** tras reemplazar un bloque, leer el archivo completo y buscar secuencias duplicadas con `grep -n "^### "`; al limpiar, que el `old_string` no incluya la línea `*Generado el` y verificar después `grep -c "Generado el"` = 1 (si da 0, volver a insertarla con un parche aparte).
- **Fuente:** E:\hermes-data\cron\output\445188067b70\2026-10-01_14-32-20.md

### [s/f] Delegar la poda a subagentes: sobre-podan, colisionan y su auto-informe engaña
- **Síntoma:** un subagente recibió un relato de 5.060 palabras con objetivo 3.500-4.000 y lo dejó en 2.965 (~900 por debajo del mínimo); dos subagentes de poda en paralelo corrompían parches; un subagente reportó 3.765 palabras cuando en disco había 2.563.
- **Causa:** los subagentes sobre-podan sistemáticamente y los que escriben en paralelo colisionan entre sí y con la sesión madre (aviso `_warning: modified by sibling subagent`); el resumen del subagente es solo su auto-informe, no el estado del archivo.
- **Solución:** la poda la hace la sesión madre con parches quirúrgicos, uno a uno, midiendo tras cada operación; verificar SIEMPRE en disco lo que la tanda dejó escrito; esperar a que la tanda ENTERA termine y releer el archivo antes de tocarlo; no arreglar a mano un relato de la misma tanda que sigue en vuelo.
- **Fuente:** E:\hermes-data\cron\output\445188067b70\2026-10-01_14-32-20.md

## Imágenes y generación con IA

### [s/f] Con modelos OpenAI, cualquier AR distinto de 1:1 fallaba
- **Síntoma:** "las opciones de AR no funcionan, solo genera en 1:1"; error literal `Invalid size '1024x576'. Requested resolution is below the current minimum pixel budget.`
- **Causa:** la API Images de OpenAI exige un mínimo de 1.048.576 px (1024×1024) para quality media/alta; a resolución base 1024, 1:1 era el único AR que llegaba al mínimo y los demás se devolvían como error de generación.
- **Solución:** arreglar el cálculo canónico compartido (`ag_image_size` en `canonical-image-model.php`, del que dependen los `proxy.php` de todas las apps): suelo `max(1048576, …)`, techo 4 MP y `ceil` a múltiplos de 16 — redondear a la baja dejaba 3:4 en 1.041.920 px, rechazado. Validar la aritmética de todas las combinaciones AR×resolución antes de desplegar y repetir la matriz `curl` DESPUÉS del deploy (el CDN cachea minutos).
- **Fuente:** E:\hermes-data\skills\proxy\proxy-acciones-multiples\references\limites-tamano-proveedores.md

### [s/f] Gemini vía chat/completions ignora `aspect_ratio` y `resolution` sin avisar
- **Síntoma:** "AR genera todo 1:1 y no respeta resolución" con Gemini: pidiendo 16:9/1024 devolvía siempre 1408×768 (11:6), sin error.
- **Causa:** el endpoint `chat/completions` ignora esos parámetros silenciosamente; la API dedicada de imágenes de OpenRouter sí los respeta (16:9 + 1K → 1376×768 real).
- **Solución:** usar `POST https://openrouter.ai/api/v1/images` con `{model, prompt, aspect_ratio, resolution}`; pero antes de adoptarlo en apps que usan imágenes de referencia, probar con una imagen real que el resultado se ciña a ella (se revirtió a chat/completions porque "generaba sin utilizar las imágenes subidas"). Cada generación cuesta dinero: no lanzar pruebas de pago sin avisar al usuario.
- **Fuente:** E:\hermes-data\skills\software-development\edicion-quirurgica-determinista\references\openrouter-tamano-imagen-gemini.md

### [s/f] Comprimir imágenes en el servidor: el objetivo del encargo no es un tope del servidor
- **Síntoma:** el usuario reportaba "no se pudo guardar la imagen" al guardar imágenes grandes.
- **Causa:** se puso en el endpoint de subida un tope estricto (60 KB) tomado del objetivo del encargo, de modo que cuando la compresión best-effort del cliente se quedaba por encima, el guardado fallaba y se reportaba como error de guardado, no de tamaño.
- **Solución:** dejar el tope del servidor en el techo anti-abuso (8 MB / 12 M caracteres en data URL) y reducir el peso en lote; medir el binario REAL resultante (no estimar por la calidad), re-subir solo las fallidas con backoff, verificar por HTTP el tamaño servido de cada archivo, y limpiar SIEMPRE los sondeos de endpoints que escriben (borrar por id y comprobar que el conteo vuelve al de antes: un rechazo no escribe, un 200 sí).
- **Fuente:** E:\hermes-data\skills\software-development\hostinger-static-app\references\compresion-imagenes-servidor.md
