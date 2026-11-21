# Autoevaluación `autocalidad-90` — Movi Transfer

- **Artefacto:** `apps/movi-transfer/` + `tools/movi-transfer-test/`
- **Autor:** agente principal (DSH), 2026-11-21
- **Alcance:** app local Node (servidor + UI), pruebas y documentación.
- **Verificador independiente:** primera pasada **REWORK 84,3/100** (carrera de nombres,
  CSRF, doble decodificación, foco, contraste, evidencias). Corregido; segunda pasada
  pendiente de emitir PASS.

## Nota del autor (A1–A10)

| ID | Criterio | Nota | Evidencia |
|---|---|---:|---|
| A1 | Cobertura del contrato | 9,5 | App + pruebas + README + `.htaccess` + launchers + manifest; commits aislados `95871916`, `1c5d8e68`, `a8b3c03c` (+ correcciones). |
| A2 | Corrección funcional/técnica | 9,5 | API 32/32 (`verify.mjs`), incluida reserva atómica de nombres con 8 subidas simultáneas y SHA-256 por archivo; UI 22/22. |
| A3 | Verificación real y evidencia | 9,3 | Chrome headless real con descarga en disco y SHA-256; capturas de escritorio, móvil (390/360) y tableta; `api.json`/`ui.json`; `axe` 0 violaciones y contrastes sobre degradado medidos por píxel (5,02:1). |
| A4 | Reglas del encargo/proyecto | 9,3 | Español, rama `main`, commits aislados sin trabajo ajeno, `_inbox` ignorada, `.htaccess` 403 en producción, memoria actualizada. |
| A5 | Autoevaluación honesta | 9,3 | Límites declarados: HTTP sin auth, sin reanudación, prueba en móvil físico pendiente; este documento. |
| A6 | Mejora residual agotada | 9,2 | Corregidos los 10 defectos del verificador; quedan sólo mejoras declaradas (reanudación por trozos, ZIP, contraseña). |
| A7 | Calidad para el usuario | 9,2 | Hoola (cian/verde, Electrolize local, vidrio), responsive real a 360/390/768/1440, foco visible, sin desbordes. |
| A8 | Robustez y seguridad | 9,0 | CSP, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, traversal, CSRF por `Origin`, 400 en URL inválida, límite por archivo. Sin auth (declarado, red local). |
| A9 | Evidencias y documentación | 9,3 | README, memoria (bitácora/decisión/receta/mapa/pendientes), este scorecard; capturas limpias sin animación a medias. |
| A10 | Claridad y mantenibilidad | 9,3 | `server.mjs` sin dependencias y comentado; JS/CSS separados; un solo `id` por nodo. |

**Total autoevaluado:** (9,5×18 + 9,5×15 + 9,3×13 + 9,3×10 + 9,3×12 + 9,2×10 + 9,2×8 +
9,0×6 + 9,3×5 + 9,3×3) / 10 = **93,3** (truncado).

> El PASS lo emite el verificador independiente, no este documento.

## Defectos corregidos tras el REWORK

| # | Corrección |
|---|---|
| D-01 | Reserva **síncrona** del nombre en memoria + comprobación en disco antes de escribir; 8 subidas simultáneas → 8 archivos distintos e íntegros. |
| D-02 | README: la regla de firewall de `node.exe` es Privada **y Pública**; se declara también el borrado sin auth. |
| D-03 | `--muted` pasa a `#a9ccd9` (5,02:1 sobre `#0E5368`, antes 3,94–4,44:1). |
| D-04 | Iconos de acción a opacidad 1 (≥3:1 también en tableta táctil). |
| D-05 | Eliminada la doble decodificación: `a%20b.txt` se guarda literal. |
| D-06 | URL malformada o con `%00` → **400**, no 500. |
| D-07 | El refresco periódico no repinta si nada cambió: conserva el foco y no repite la animación; la animación sólo se aplica a filas nuevas. |
| D-08 | `#cola` sin `aria-live`; barra con `role="progressbar"`/`aria-valuenow` y `transform: scaleX()`. |
| D-09 | Capturas tras esperar animación y aviso; viewport en vez de `fullPage`; assertions reales; URL exacta; desbordamiento medido con `overflow-x: visible`; se reportan los contrastes incompletos de `axe`. |
| D-10 | `/api/state` devuelve sólo el nombre de la bandeja; `decisiones.md` restaurado sin el hunk ajeno de fin de línea. |

## Evidencias

- `tools/evidencias/2026-11-21-movi-transfer/api.json` — 32 comprobaciones.
- `tools/evidencias/2026-11-21-movi-transfer/ui.json` — 22 comprobaciones.
- `escritorio-1440.png`, `escritorio-con-archivo.png`, `movil-390.png`,
  `movil-390-lista.png`, `movil-360.png`, `tableta-768.png`.
