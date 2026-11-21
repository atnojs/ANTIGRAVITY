# Autoevaluación `autocalidad-90` — Movi Transfer

- **Artefacto:** `apps/movi-transfer/` + `tools/movi-transfer-test/` (versión 1.3.0)
- **Autor:** agente principal (DSH), 2026-11-21
- **Alcance:** app local Node (servidor + UI), pruebas y documentación.
- **Verificador independiente:** 1.ª pasada **REWORK 84,3/100** (carrera de nombres,
  CSRF, doble decodificación, foco, contraste, evidencias). 2.ª pasada **REWORK 87,4/100**
  (los 10 defectos corregidos; aparecen un DoS con URL malformada y la descarga de 0 B).
  Ambos corregidos. 3.ª pasada: **PASS 92,6/100** sobre `74444082` (misma nota que la
  autoevaluación, sin defectos nuevos).
- **Cambio 1.1.0 (posterior al PASS):** la lista ordena por última actividad —el último
  archivo subido o descargado va primero— persistida en `_inbox/.descargas.json`, y se
  ocultan los ficheros basura de Windows (`Thumbs.db`, `desktop.ini`, `~$…`). Cubierto por
  las pruebas 41/41 y 22/22.
- **Cambio 1.3.0:** visores reales de **PDF** (pdf.js sobre canvas, también en móvil) y
  **DOCX** (mammoth a HTML saneado) vendorizados; corregida la regresión del orden —la
  firma de repintado no incluía `lastDownload`, así que la lista no se reordenaba—.
  Cubierto por 41/41 de API y **32/32** de UI, con fixtures reales de PDF/DOCX y una
  prueba específica de «el último descargado vuelve a ser el primero».

## Nota del autor (A1–A10)

| ID | Criterio | Nota | Evidencia |
|---|---|---:|---|
| A1 | Cobertura del contrato | 9,5 | App + pruebas + README + `.htaccess` + launchers + manifest + `CALIDAD.md`; commits aislados `95871916`, `1c5d8e68`, `a8b3c03c`, `690227c6` (+ correcciones finales). |
| A2 | Corrección funcional/técnica | 9,5 | API **41/41** (`verify.mjs`): reserva atómica con 8 subidas simultáneas, 0 B descargable, URL malformada sin tumbar el proceso, **orden por última actividad** y filtrado de basura del sistema, SHA-256 por archivo. UI **32/32**, con PDF real dibujado por pdf.js, DOCX convertido, vista previa de texto, menú de compartir y regresión del orden. |
| A3 | Verificación real y evidencia | 9,2 | Chrome real con descarga en disco y SHA-256; capturas de escritorio, móvil (390/360) y tableta; `api.json`/`ui.json`; `axe` 0 violaciones; contrastes sobre degradado medidos por píxel (pie 5,14:1; iconos 6,5:1). |
| A4 | Reglas del encargo/proyecto | 9,5 | Español, rama `main`, commits aislados sin trabajo ajeno, `_inbox` ignorada, `.htaccess` 403 en producción, memoria actualizada. |
| A5 | Autoevaluación honesta | 9,2 | Este documento corrige la sobrevaloración anterior (93,3 con dos fallos abiertos); límites declarados: HTTP sin auth, sin reanudación, prueba en móvil físico pendiente. |
| A6 | Mejora residual agotada | 9,2 | Corregidos los 10 defectos del primer informe y los 2 del segundo; quedan sólo mejoras declaradas (reanudación por trozos, ZIP, contraseña). |
| A7 | Calidad para el usuario | 8,8 | Hoola (cian/verde, Electrolize local, vidrio), responsive real a 360/390/768/1440, foco visible, sin desbordes; `touch-action` y sin resaltado azul al tocar. |
| A8 | Robustez y seguridad | 9,0 | CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, traversal, CSRF por `Origin`, 400 en URL/Host inválidos sin caída, límite por archivo. Sin auth (declarado, red local). |
| A9 | Evidencias y documentación | 9,0 | README, memoria (bitácora/decisión/receta/mapa/pendientes), este scorecard; capturas limpias sin animación a medias. |
| A10 | Claridad y mantenibilidad | 9,0 | `server.mjs` sin dependencias y comentado; JS/CSS separados; un solo `id` por nodo; fechas y números con `Intl`. |

**Total autoevaluado:** (9,5×18 + 9,5×15 + 9,2×13 + 9,5×10 + 9,2×12 + 9,2×10 + 8,8×8 +
9,0×6 + 9,0×5 + 9,0×3) / 10 = **92,6** (truncado).

> El PASS lo emite el verificador independiente, no este documento. **PASS emitido:
> 92,6/100** (3.ª ronda, commit `74444082`).

## Defectos corregidos

| # | Corrección |
|---|---|
| D-01 | Reserva **síncrona** del nombre en memoria + comprobación en disco antes de escribir; 8 subidas simultáneas → 8 archivos distintos e íntegros. |
| D-02 | README: la regla de firewall de `node.exe` es Privada **y Pública**; se declara también el borrado sin auth. |
| D-03 | `--muted` pasa a `#a9ccd9` (5,14:1 real medido, antes 4,38:1). |
| D-04 | Iconos de acción a opacidad 1 (6,5:1, también en tableta táctil). |
| D-05 | Eliminada la doble decodificación: `a%20b.txt` se guarda literal. |
| D-06 | URL malformada, `%00`, `//` o `Host` inválido → **400**, sin matar el proceso. |
| D-07 | El refresco periódico no repinta si nada cambió: conserva el foco y no repite la animación. |
| D-08 | `#cola` sin `aria-live`; barra con `role="progressbar"`/`aria-valuenow` y `transform: scaleX()`. |
| D-09 | Capturas tras esperar animación y aviso; viewport en vez de `fullPage`; aserciones reales; URL exacta; desbordamiento medido con `overflow-x: visible`; se reportan los contrastes incompletos de `axe`. |
| D-10 | `/api/state` devuelve sólo el nombre de la bandeja; `decisiones.md` restaurado sin el hunk ajeno de fin de línea. |
| N-01 | `new URL()` dentro de `try/catch` → 400; pruebas `GET //` y `Host: [` verifican que el servidor sigue vivo. |
| N-02 | Archivo de 0 B: respuesta 200 con `Content-Length: 0`, sin `createReadStream(end:-1)`. |
| N-03 | `touch-action: manipulation`, sin resaltado azul al tocar y `translate="no"` en la marca. |

## Evidencias

- `tools/evidencias/2026-11-21-movi-transfer/api.json` — 41 comprobaciones.
- `tools/evidencias/2026-11-21-movi-transfer/ui.json` — 32 comprobaciones.
- `escritorio-1440.png`, `escritorio-con-archivo.png`, `movil-390.png`,
  `movil-390-lista.png`, `movil-360.png`, `tableta-768.png`.
