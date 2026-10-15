# Decisiones tomadas y por qué

Registro de cosas que **parecen raras a propósito**. Antes de cambiarlas, lee el motivo;
si el motivo ya no aplica, actualiza esta entrada en el mismo cambio.

---

### [2026-10-15] La memoria vive en `tools/memoria/`, no en la raíz

- **Decisión:** toda la memoria operativa va en `tools/memoria/`.
- **Motivo:** el repo se despliega en la **raíz pública** de Hostinger: cualquier fichero
  versionado es accesible por web. `tools/` tiene un `.htaccess` con `Require all denied`.
  La memoria acumulará rutas y detalles internos; no tienen por qué ser públicos.
- **Contrapartida:** hay que conocer la ruta. Se resuelve con el puntero en `claude.md`,
  que sí se lee siempre.

### [2026-10-15] En la memoria se escriben rutas, nunca valores de claves

- **Decisión:** ni contraseñas, ni tokens, ni API keys — solo **dónde** están.
- **Motivo:** el valor caduca (se rota) y el fichero viaja por git. Un secreto escrito aquí
  es un secreto publicado.

### [2026-10-15] OmniRoute sigue escuchando en `0.0.0.0` (no se cambió a loopback)

- **Decisión:** dejar el bind como estaba y documentarlo en vez de "arreglarlo".
- **Motivo:** existe una skill `omniroute-wsl-claude-code` en Hermes: hay clientes que
  pueden llegar desde WSL o desde otro equipo. Cambiar a `127.0.0.1` sin comprobarlo
  rompería ese flujo. El interruptor está listo (`OMNIROUTE_BIND=127.0.0.1`).
- **Pendiente asociado:** ver `pendientes.md`.

### [2026-10-15] No se cambió la contraseña del panel de OmniRoute

- **Decisión:** dejarla y documentar sus dependencias.
- **Motivo:** al menos dos sitios la usan (el daemon y
  `E:\hermes-data\scripts\monitor-omniroute-diario.py`). Cambiarla a lo loco rompe el
  registro automático de DeepSeek. Ahora vive en
  `C:\Users\atnojs\.omniroute\panel.secret` (fuera del repo), no dentro del `.py`.

### [2026-10-15] Los ficheros sustituidos se guardan como `.bak-<fecha>`, no se borran

- **Decisión:** todo instalador deja respaldo de lo que reemplaza.
- **Motivo:** el montaje de OmniRoute llevaba meses funcionando; un arranque automático
  roto deja a Hermes sin proveedor. Los respaldos del arranque se movieron a
  `E:\hermes-data\backups\autostart-backups`.

### [2026-10-15] Nunca ramas ni worktrees (regla del proyecto)

- **Decisión:** todo se publica en `main`.
- **Motivo:** cada worktree genera historia paralela con SHAs distintos y deja ramas
  huérfanas. Ya está en `claude.md`; se repite aquí porque es el error más caro de deshacer.

### [2026-10-15] Se documenta con guía + scripts, no con capturas

- **Decisión:** para montajes de sistema, guía en Markdown y scripts ejecutables.
- **Motivo:** las capturas caducan y no se pueden volver a ejecutar. La regla de
  `capturas-verificacion` es para resultados **visuales** de apps/web, no para esto.
