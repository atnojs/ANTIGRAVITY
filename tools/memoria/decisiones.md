# Decisiones tomadas y por qué

Registro de cosas que **parecen raras a propósito**. Antes de cambiarlas, lee el motivo;
si el motivo ya no aplica, actualiza esta entrada en el mismo cambio.

---

### [2026-10-15] Una carpeta = un sujeto; y «Comida y moda» se parte en dos

- **Decisión:** cada carpeta de TrickVault usa **un solo sujeto** en todas sus imágenes
  (Antonio: «dentro de una carpeta todas las imágenes deben utilizar el mismo sujeto para que
  de verdad se vea la diferencia»). Excepciones documentadas: códigos de lettering (una
  palabra), escenas autosuficientes (`/galaxy`, `/dragon`), y códigos que exigen una categoría
  concreta (un animal, una célula, un plato) o cuyo prompt nombra otra cosa (p. ej.
  `/footweartechpack` dice «footwear tech pack / sneaker»).
- **Decisión:** `xl-comidamoda` («Comida y moda») se parte en **`xl-comidamoda` = «Comida»**
  (26 tarjetas) y **`xl-moda` = «Moda»** (25: ropa, estilismo, belleza, joyería).
  Las fotos **siguen en `assets/comida-moda/`**: ya funcionan y moverlas obligaría a tocar
  todas las URLs.
- **Motivo:** mezclar dos temas en una carpeta impide comparar el mismo sujeto entre códigos,
  que es para lo que sirve la carpeta.
- **Contrapartida:** al cambiar el nombre de una carpeta, un navegador que ya tenía la lista
  guardada conserva el nombre viejo. Se resuelve con `FOLDERS_SCHEMA_VERSION` (5 → 6) y el
  mapa `FOLDERS_LABELS_ANTIGUOS`, que renombra solo si el nombre guardado es el viejo por
  defecto (si Antonio le puso otro a mano, se respeta).

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

### [2026-10-17] Se documenta con guía + scripts, no con capturas

- **Decisión:** para montajes de sistema, guía en Markdown y scripts ejecutables.
- **Motivo:** las capturas caducan y no se pueden volver a ejecutar. La regla de
  `capturas-verificacion` es para resultados **visuales** de apps/web, no para esto.

### [2026-10-17] Web Interface Guidelines, copia fijada en el repo

- **Decisión:** las reglas de interfaz de Vercel se guardan fechadas en
  `skills/recursos/web-interface-guidelines/` y se aplican desde la sección H de
  `auditor-lighthouse-accesibilidad`; no se descargan en cada revisión.
- **Motivo:** una skill que baja instrucciones de una URL cada vez es superficie de inyección y
  cambia el criterio sin avisar. Fijarla hace la auditoría reproducible; actualizarla es una
  decisión explícita (nueva copia fechada + revisar la sección H).
- **Contrapartida:** hay que actualizarla a mano cuando cambien las guías.

### [2026-10-17] Recrear desde referencia: sistema sí, assets no

- **Decisión:** `recrear-desde-referencia` copia el **sistema** de la referencia (jerarquía, ritmo,
  layout) y lo mapea a los tokens hoola; nunca copia fotos, logos, ilustraciones ni textos ajenos,
  y las imágenes se generan con `openai-image-2-low`.
- **Motivo:** derechos de terceros y coherencia de marca. El pixel-perfect no aporta y el material
  ajeno no se puede usar.
- **Contrapartida:** si Antonio pide el look exacto, se avisa de la desviación de marca y se decide
  juntos.

### [2026-10-17] Playwright CLI como verificación funcional estándar

- **Decisión:** el flujo real en navegador (clics, formularios, subida/descarga, consola, red,
  recarga y 3 anchos) se comprueba con `playwright-cli` siguiendo la skill `verificacion-playwright`.
  `capturas-verificacion` sigue siendo la herramienta de **medida de geometría** (harness + iframes + PIL).
- **Motivo:** `capturas-verificacion` no puede pulsar ni rellenar, y la regla del proyecto exige
  recorrer el flujo completo en el navegador y verificar descargas. Playwright CLI es oficial
  (Microsoft), reutiliza el Chrome instalado (no descarga navegadores) y evita cargar en contexto
  esquemas MCP grandes.
- **Contrapartida:** en DSH con sandbox `workspace-write` Chrome no arranca (`spawn EPERM`): hay que
  ejecutarlo con permiso ampliado. No sustituye a Safari/iOS real (webkit no está instalado).
