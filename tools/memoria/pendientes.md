# Pendientes

Lo que quedó abierto. Cada uno con **el siguiente paso concreto**, no con una intención.
Cuando se cierra, se mueve a `bitacora.md` y se borra de aquí.

---

## Carpetas con dos familias de códigos: decidir si se parten

- **Estado:** detectadas y sin tocar. `xl-otromundo` mezcla personajes (astronauta, vampiro,
  mago: cada código pide el suyo) con la furgoneta camper de los códigos de producto;
  `xl-juegos` mezcla el aventurero de los códigos de juego con las escenas de temporada (esas
  ya se unificaron el 2026-10-15: ahora es el aventurero vestido de esa temporada).
- **Siguiente paso:** preguntar a Antonio si quiere partirlas como se hizo con «Comida y moda»
  o dejarlas con la excepción documentada en `trickvault-imagenes`.
- **Verificación:** `tools/trickvault/_tiras_sujetos.py` genera una tira por carpeta; si en una
  tira se ven dos familias claras, toca decidir.

## `xl-camararetrato` y `xl-casaviajes`: excepciones por código

- **Estado:** tienen excepciones legítimas (bebé, mascota, pareja, familia / castillo, volcán,
  trono, naufragio) porque **su código pide esa escena**. No es un sujeto mezclado.
- **Siguiente paso:** si Antonio quiere el sujeto único también ahí, hay que reescribir esos
  prompts (no basta con regenerar la imagen).

## 0. 🔴 ROTAR las 6 claves de Google expuestas — **urgente**

- **Estado:** detectado el 2026-10-15, sin resolver. Detalle completo en `credenciales.md`.
- **Hecho:** 37 ficheros de `apps/` llevan una clave `AIza…` incrustada; 6 claves distintas;
  la mayoría se sirven por web con HTTP 200 y el repositorio de GitHub es **público**.
  Borrar los ficheros NO basta: el historial de git las conserva.
- **Siguiente paso:** revocar y regenerar las 6 claves en Google Cloud Console (se
  identifican por el prefijo, tabla en `credenciales.md`) y sustituir su uso por `proxy.php`.
- **Verificación:** las claves viejas deben devolver error de API deshabilitada; los
  ficheros de `apps/` no deben contener ninguna cadena `AIza`.

---

## 0-bis. 🔴 El hash de la contraseña de `apps/json` y `video-vault` está publicado

- **Estado:** detectado el 2026-10-16, sin resolver.
- **Hecho:** `apps/video-vault/auth.php` **está versionado** y lleva
  `$expectedHash = '<sha256 de 64 hex>'`. `apps/json/auth.php` (sin versionar) lleva
  `AUTH_PASSWORD_HASH` con **exactamente el mismo hash** → misma contraseña para las dos apps
  (y el comentario del propio fichero dice que es la que usaba TrickVault). El repositorio
  `github.com/atnojs/ANTIGRAVITY` es **público**: ese hash lo ve cualquiera. Un sha256 **sin
  sal** de una contraseña se rompe con diccionario y GPU en poco tiempo.
- **Siguiente paso:** (1) cambiar la contraseña y **regenerar los dos hashes**; (2) sacar
  `apps/video-vault/auth.php` del repositorio y añadirlo a `.gitignore` — el historial de git
  lo conserva igual, así que **la rotación es lo único que cierra el agujero**; (3) confirmar
  que `apps/json/auth.php` **nunca** entra en git.
- **Verificación:** `git grep -n -I -E "expectedHash|AUTH_PASSWORD_HASH"` no debe devolver
  ningún hash real, y las apps deben seguir autenticando con la contraseña nueva.

---

## 1. Apuntar DSH (el agente) al gateway de OmniRoute — *el ahorro grande*

- **Estado:** sin hacer. Hoy el agente habla **directo** con la API del proveedor, así que
  no usa la compresión ni el failover: el gasto no baja nada.
- **Siguiente paso:** localizar dónde define DSH su `base_url` de proveedor
  (`C:\Users\atnojs\.dsh\`: perfiles, `storages`, ajustes del proveedor) o añadir un
  proveedor personalizado OpenAI-compatible con base URL `http://localhost:20128/v1` y la
  clave de `Dashboard → Endpoints`.
- **Riesgo:** cambiar el endpoint propio a mitad de sesión puede dejar al agente sin
  responder. Hacerlo entre sesiones y con la configuración anterior anotada.
- **Verificación:** una petición debe devolver la cabecera `X-OmniRoute-Compression` y
  aparecer en `Dashboard → Analytics`.

## 2. Confirmar que la ventana de terminal NO reaparece

- **Estado:** arreglado y verificado en caliente (sin `cmd.exe` en la cadena, procesos sin
  título de ventana), pero falta la prueba definitiva.
- **Siguiente paso:** en el próximo arranque del PC, comprobar que no aparece ninguna
  terminal de OmniRoute. Si apareciera, vendría de **fuera** de esta cadena: buscar con
  `Get-CimInstance Win32_Process | Where-Object CommandLine -match 'omniroute'`.
- **Verificación:** `E:\hermes-data\logs\omniroute-autostart.log` con una línea
  `Modo daemon: reviso cada hora` de la hora del arranque.

## 3. Decidir el bind del gateway: `0.0.0.0` → `127.0.0.1`

- **Estado:** documentado, sin tocar (ver `decisiones.md`).
- **Siguiente paso:** comprobar si algún cliente llama al gateway desde WSL o desde otro
  equipo (skills `omniroute-wsl-claude-code`, `omniroute-deepseek-autostart` en Hermes).
  Si nadie lo necesita: añadir `set OMNIROUTE_BIND=127.0.0.1` al `.cmd` y reiniciar el daemon.
- **Verificación:** `netstat -ano | Select-String ':20128'` debe mostrar `127.0.0.1:20128`.

## 4. Ver las sesiones de DSH desde otro PC

- **Estado:** explicado, sin montar. Las sesiones son locales
  (`C:\Users\atnojs\.dsh\sessions`, formato `session.v4.jsonl.zstd`) y la GUI escucha solo
  en `127.0.0.1:19387`.
- **Siguiente paso elegido:** túnel SSH desde el otro PC
  (`ssh -L 19387:127.0.0.1:19387 atnojs@IP-DE-ESTE-PC` y abrir `http://127.0.0.1:19387`).
  Alternativa: copiar la carpeta de sesiones (**nunca** `.credentials.yaml`).
- **Verificación:** desde el otro PC aparece el historial de este.

## 5. Higiene: token de GitHub en claro

- **Estado:** `E:\ANTIGRAVITY\inicio.md` contiene un token de GitHub en texto plano.
  Está en `.gitignore` (línea 25), así que **no** se publica, pero vive en claro y hay
  zips en la raíz (`skills.zip`, `claude_skills_pack.zip`) que podrían arrastrarlo.
- **Siguiente paso:** decidir si se rota el token; si se toca, no quitar nunca esa línea
  del `.gitignore`.

## 6. Ampliar la memoria con lo que aún no está

- **Mapa del repositorio**: qué hay en `apps/` y `skills/` y para qué sirve cada cosa
  (evita exploraciones caras).
- **Índice tarea → skill**: tabla rápida para no dudar qué skill cargar.
- **Histórico de fallos ya resueltos de sesiones anteriores** a 2026-10-15 (hay material en
  `E:\hermes-data\skills\`, `E:\hermes-data\cron\output\` y backups).

## 7. Limpieza de lo no versionado: 256 entradas, 57.427 ficheros, ~5,8 GB

Lista preparada el 2026-10-16, **pendiente de que la valide Antonio**. El panel de git enseña
«un montón de carpetas» porque git **colapsa** los directorios sin versionar: esas 256 entradas
son 57.427 ficheros. Nada de esto se sube hoy, y seguirá apareciendo hasta decidir.
**Regla:** se sube lo que es herramienta o contenido; se ignora el material de trabajo; lo que
tenga secretos o datos de terceros, no se sube nunca. **Jamás `git add -A`.**

### a) SUBIR — herramientas y datos que faltan en el repo

| Qué | Ficheros | Por qué |
|---|---|---|
| `tools/commit-aislado.ps1` | 1 | La memoria lo cita como «ya existente en el repo» y **no lo está** |
| `tools/trickvault/`: `_carpeta_gen.py`, `_carpeta_upload.py`, `_carpeta_contact.py`, `_carpeta_verificar.py`, `_carpeta_fix_prompts.py`, `_escribir_sujetos.py`, `_listar_faltan_sujetos.py`, `_listar_sin_objeto.py`, `_contact_sheet.py`, `_contact_carpeta.py` | 10 | Es **el pipeline que manda usar la skill `trickvault-imagenes`**. Un clon limpio no lo tiene (solo `_carpeta_lote.py` está versionado) |
| `tools/trickvault/_xl-*.json` (11) + `_ejemplos_xl-fotoproducto.json` + `_retroedu.json` | 13 | Son las **specs** por carpeta. Ya hay 50 specs, 20 `_sujetos_`, 19 `_ejemplos_` y 4 `_excepciones_` versionadas: falta igualar |
| `tools/video-vault/` → sus `.py` (~25), `.ps1` (2) y `.js` | ~28 | Herramientas del flujo de `videovault-videos` (`generar_videos_pendientes.py`, `runner_diario.py`, `lanzar_lote.ps1`…). **Sin** los 104 `.mp4` (482 MB), que ya están ignorados |
| `skills/SKILL_VIDEOVAULT_VIDEOS.md` | 1 | Ya versionado; solo tiene 13 líneas nuevas sin commitear |

### b) IGNORAR — material de trabajo (añadir a `.gitignore`)

| Patrón | Ficheros | MB |
|---|---|---|
| `tools/trickvault/*_gen/` (22 carpetas) | 979 (959 PNG) | 1.618 |
| `tools/trickvault/_e2e/` (repo de prueba, perfil de Chrome, `remoto.git`, logs) | 1.745 | 234 |
| `tools/trickvault/_revision/` | 178 | 291 |
| `tools/trickvault/_banco_export/`, `_imgs_revisar/`, `_prueba_api/`, `prompts_in/`, `prompts_out/` | 104 | 23 |
| `tools/_ig2/` | 26.440 | 1.900 |
| `tools/imagen_json_prompt/` | 34.339 | 941 |
| `tools/imagen_json_prompt_prueba/`, `tools/_reel_ig/` | 19 | 14 |
| `tools/json/_e2e/` (mock de GitHub) | 2 | 0 |
| `tools/video-vault/` → `.log` y `.txt` | ~15 | 0 |
| `apps/dev/null` (50 KB, accidente de `> null`) | 1 | 0 |

Y dentro de `tools/trickvault/`, los sueltos: `_*.log` (26), `_*.txt` (28), `_*.cmd` (12),
`_*_jobs.json` (**22 manifiestos de lote**), `_prod_hoy*.html`, `_verifica_*`, `_dump_*`, y los
JSON de **estado derivado** (`_auditoria_*.json`, `_cruce_rotas.json`, `_desajustes.json`,
`_ocr_*.json`, `_catalogo_estado.json`, `_plan_imagenes.json`, `_rutas_imagenes.json`,
`_sin_objeto.json`, `_recuperadas.json`). Guiones de un solo uso: `_fix_*` (9), `_ver_*` (14),
`_diag_*`, `_antes_*`, `_ids_*`, `_hojas_*`.

### c) NUNCA VERSIONAR — secretos o datos de terceros

- **`apps/json/auth.php`** → `AUTH_PASSWORD_HASH` (ver el hallazgo 0-bis).
- **`tools/veronicaz/Clientes_2026-10-02_antes_de_septiembre.xlsx`** → datos de clientes.
- **`Capturas.xlsx`** (en la **raíz pública**) → si se versiona queda servido por web. Si hay
  que conservarlo, moverlo a `tools/`.

### d) DECIDIR

- `tools/evidencias/` → solo 3 `.py` (`generar_*_dia_de_muertos.py`); las 50 imágenes ya están
  ignoradas por `*.jpg`/`*.png`.
- `tools/logo_solo_lineas.py`, `tools/quitar_fondo.py` → parecen herramientas reutilizables.
- `tools/veronicaz/` → `conv.mjs`, `ejecutar.py`, `render.mjs` (¿herramienta o encargo puntual?).
- `tools/trickvault/_reels_*.py` (9) → ¿lote terminado o herramienta viva?

- **Siguiente paso:** Antonio valida a), c) y d); después, `git add` explícito de a) y un bloque
  nuevo en `.gitignore` para b) + c). Nunca `git add -A`.
- **Verificación:** `git status --porcelain` debe bajar de 256 entradas a cerca de 0 (quedarían
  solo las de d) mientras se deciden).
