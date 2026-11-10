---
name: replicar-app
description: "Clona una app o web real a partir de su URL: captura la interfaz y la red con REA, inventaría pantallas, flujos, endpoints y estados, y construye una réplica funcional en el proyecto con paridad medida. Activar con 'clona esta app', 'replica esta web', 'hazme algo igual que X', 'copia esta interfaz' o 'reconstruye esta herramienta'."
---

# Replicar una app (clonado funcional con paridad medida)

## Qué significa «clonar» aquí

Se replica lo observable y lo reconstruible:

- **Sí**: estructura de pantallas, jerarquía visual, tipografía y colores, componentes, estados (vacío, carga, error), navegación, formularios, validaciones visibles, formato de datos, endpoints públicos y flujos de usuario.
- **No**: el backend privado de la app, su base de datos, sus claves, su lógica antifraude, sus datos de usuarios, su contenido con derechos (logos, ilustraciones, textos largos) ni el acceso a zonas que exigen una cuenta que no es tuya.

Si el encargo pide copiar marca, textos o assets ajenos, se sustituyen por equivalentes propios y se dice en la entrega. Copiar el aspecto y el flujo es legítimo; copiar la identidad o el contenido de terceros, no.

## Entradas

1. URL de la app (o varias: landing + app).
2. Qué se quiere replicar: una pantalla, un flujo completo o toda la app.
3. Si hay login: credenciales **propias** de una cuenta de prueba, o se replica solo lo público.
4. Stack destino (por defecto: HTML/CSS/JS + PHP en Hostinger, estilo hoola).

Si falta la URL o el alcance, no empieces: sin URL no hay captura real y sin alcance no hay paridad medible.

## Fase 1 — Captura real (no de memoria)

1. Abre la app en Chrome con depuración remota y conéctate con REA:

   ```text
   chrome.exe --remote-debugging-port=9333 --user-data-dir=<perfil-temporal-o-propio> <URL>
   ```

   - Usa un perfil **temporal** para apps de terceros; nunca el perfil personal de Flow.
   - `list_browser_targets` para obtener `target_id`.
2. Captura evidencia:
   - Atajo reproducible: `python E:\ANTIGRAVITY\tools\replicar-app\captura_inicial.py "<URL>"` guarda capturas en 390/820/1440, el HTML renderizado, `pagina.json` (textos, enlaces, botones, campos, formularios, imágenes) y `red.json` (XHR/fetch). Es solo observación: no rellena ni envía nada.
   - Con REA, para lo que el script no ve: `capture_web_screenshot` de cada pantalla, `inspect_web_page` con `include_accessibility_text: true`, y `capture_browser_scenario` si hay que abrir menús, modales o pestañas.
   - Guarda todo en `tools/evidencias/<fecha>-clon-<app>/`.
3. Anota lo que **no** se ve: red (endpoints en la pestaña Network del propio Chrome si se necesita), almacenamiento, rutas.

## Fase 2 — Inventario (el plano antes del código)

Escribe `inventario.md` con:

| Pantalla | Ruta | Componentes | Estados | Datos que muestra | Acciones |
|---|---|---|---|---|---|
| Inicio | / | cabecera, grid, filtros | vacío/carga/error | tarjetas | buscar, abrir |

Añade:

- **Flujos**: paso a paso de cada tarea (registro, crear, editar, exportar).
- **Modelo de datos** deducido de la UI (no inventes campos del backend).
- **Endpoints públicos** observados y su forma de respuesta; si no hay, se sustituyen por datos locales o un PHP propio.
- **Reglas de negocio visibles**: límites, validaciones, formatos.

Sin este documento no se pasa a la fase 3. Es lo que evita una maqueta bonita que no funciona.

## Fase 3 — Sistema de diseño

Extrae tokens reales de la captura: colores (fondo, superficie, texto, borde, acento), tipografía y escalas, radios, sombras, espaciados, alturas de control y comportamiento responsive (qué se apila, qué se oculta).

Mapéalos al estilo del proyecto (`style-guide-antigravity`) salvo que el encargo pida mantener la estética original. Si se mantiene, documenta el mapa token original → token propio.

## Fase 4 — Esqueleto

Usa `crear` para la estructura del proyecto y `arquitecto-backend-php-hostinger` si hay backend. Mínimo:

- `index.html`, `app.css`, `app.js`, y `proxy.php`/`history.php` si la app guarda datos.
- Una pantalla por ruta del inventario, con estados vacío/carga/error implementados desde el principio.
- Datos de ejemplo derivados del inventario, nunca copiados de la app original.

Si la app usa React, se permite; no añadas dependencias que no estén justificadas.

## Fase 5 — Implementación por pantallas

Orden: layout → componentes → estados → interacción → datos.

- Una pantalla cerrada y verificada antes de pasar a la siguiente.
- Nada de «luego lo ajusto»: cada pantalla se compara con su captura (geometría y jerarquía).
- Conserva nombres y estructura del inventario para que la trazabilidad sea posible.

## Fase 6 — Verificación de paridad (obligatoria)

Con `verificacion-playwright` y `capturas-verificacion`:

1. Recorre **todos** los flujos del inventario en Chrome, de principio a fin.
2. Comprueba: consola limpia, red sin 404, recarga, estados vacío/carga/error, formularios con datos inválidos, descargas reales en disco.
3. Tres anchos (móvil 390, tablet 820, escritorio 1440) sin scroll horizontal ni recortes.
4. Compara captura original vs réplica lado a lado y anota diferencias.
5. Calcula la paridad: pantallas y flujos replicados / total del inventario. **Umbral de entrega: 100 % de los flujos del alcance acordado**; si algo queda fuera, se declara en la entrega, no se maquilla.

## Fase 7 — Cierre

- `autocalidad-90` con verificador independiente; PASS ≥ 90,0 antes de publicar.
- `publicar-git`: commit aislado, push a `main`, comprobación de la versión servida.
- Entrega con: paridad declarada, capturas comparativas, diferencias conocidas y qué no se copió (marca, textos, datos).

## Límites y seguridad

- No se clonan apps para suplantarlas ni para captar usuarios; si el encargo apunta a eso, se rechaza y se explica.
- No se copian logos, ilustraciones ni textos de la app original: sustitutos propios.
- No se saltan logins, paywalls, captchas ni límites de servicio.
- No se guardan credenciales en el repo ni en la app.
- Si la app original cambia mientras se clona, se congela la versión capturada (fecha y capturas) y se trabaja sobre ella.

## Checklist de salida

- [ ] `inventario.md` completo y aprobado por el encargo.
- [ ] Tokens de diseño documentados.
- [ ] Todas las pantallas del alcance implementadas con estados.
- [ ] Flujos recorridos en Chrome, sin errores de consola.
- [ ] Responsive verificado en 3 anchos.
- [ ] Capturas comparativas guardadas.
- [ ] Paridad declarada y diferencias explicadas.
- [ ] PASS de `autocalidad-90` y publicación en `main`.
