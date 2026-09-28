# Estado de migración en producción (comprobación continua)

Marcador de despliegue por app: la única forma barata de saber si el deploy de
Hostinger ya ha publicado los cambios. El poller
(`tools/verificar-despliegue.ps1`) lo comprueba en bucle y avisa cuando aparece el
marcador esperado.

| App | Marcador esperado | Estado |
|---|---|---|
| `angulos_de_camara` | `gemini-2` en `proxy.php {"action":"health"}` | ✅ 00:58 |
| `escenario_modelo` | `gemini-2` en `proxy.php {"action":"health"}` | ✅ 00:52 |
| `imagenes_ia/ajustes_imagen` | `gemini-2` en `proxy.php {"action":"health"}` | ✅ 00:56 |
| `estilizador_prompt` | `gemini-2` en `proxy.php {"action":"health"}` | ⏳ |
| `conversor_multimedia` | `gemini-2` en `proxy.php {"action":"health"}` | ⏳ |
| `creador_memes` | `gemini-2` en `proxy.php {"action":"health"}` | ⏳ |
| `infografia-referencia` | `gemini-2` en `proxy.php {"action":"health"}` | ⏳ |
| `infografia` | `history-manager.js?v=7` en `folio.html` | ⏳ |

## Verificaciones directas hechas (no solo el marcador)

- `imagenes_ia/ajustes_imagen`: `history.php?action=list&app=ajustes_imagen` → todas las
  `imageUrl` en `./history_store/`; `index.html` sirve `ai-tools.js?v=17`.
- `escenario_modelo`: `history.php` → `./history_store/`; orden `data-model` correcto
  (MEDIUM, HIGH, MAX FLARE, XHIGH, MAX SUNBURST, GEMINI 2, 3.1 FLASH, 3 PRO, QWEN, IMAGE 2
  MEDIUM, IMAGE 2 HIGH); `app.js?v=16`.
- `angulos_de_camara`: `history.php` → `./history_store/`; `gemini-2` publicado.
- `dibujo_lineas_copia` (canónica): prueba real de `gemini-2` con foto →
  HTTP 200 en 8,4 s, PNG 864×1184 en blanco y negro (ver §9.1 del documento de estado).

Notas de operación:
- El despliegue de Hostinger se retrasa varios minutos (medido: commit → publicación entre
  ~2 y ~12 min) y no todas las rutas se refrescan a la vez; el `index.html` servido puede
  tardar más que el `history.php`.
- Sondea siempre con `?cb=<aleatorio>`: hay caché intermedia (`Server: hcdn`).
- No se marca una app como ✅ hasta que el marcador aparece en producción.
