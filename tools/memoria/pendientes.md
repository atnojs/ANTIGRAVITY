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
