# Flow Studio — elegir propuesta de IA con 4 botones (2026-10-25)

Petición: «cuando clico en mejorar prompt aparecen 4 campos con los prompts. Lo que debe
pasar es que aparezcan 4 botones (prompt 1, etc.) y que al clicar en alguno de ellos el
prompt se vea en el campo del prompt principal siendo editable».

## Qué se cambió

| Fichero | Cambio |
|---|---|
| `apps/flow_studio/app.js` | `renderOptions` pinta 4 botones `.btn-prompt-option` («Prompt 1»…«Prompt 4») con el título de la propuesta en `title`/`aria-label`; `applyOption` carga el prompt en `#prompt`, coloca el cursor al final, enfoca el campo, marca el botón activo y muestra «Volver a mi idea original» |
| `apps/flow_studio/app.css` | cuadrícula 2×2 de botones, estados hover/activo y foco visible (`outline` cian 2 px); se retiran los estilos de las tarjetas antiguas |
| `apps/flow_studio/index.html` | el panel pasa a «Elige un prompt», el contador a «4 prompts» y se sirven `app.20261025e.css/js` |
| `app.20261025e.css/js` | copias fechadas para saltar la caché por ruta de la CDN |
| `version.txt` | marcador de despliegue actualizado |

## Verificación

- Local (Chrome headless + CDP con `proxy.php` simulado): 4 botones, clic en «Prompt 2» →
  el textarea contiene exactamente ese prompt, contador a 74, foco en `#prompt`, botón
  marcado como activo, aviso «Prompt 2 cargado en el editor…»; edición manual del texto
  actualiza el contador; «Volver a mi idea original» restaura la idea inicial. Cero errores
  de consola.
- Producción (`https://atnojs.es/apps/flow_studio/`, assets `e`): «Mejorar con IA» con una
  idea real devolvió 4 botones con títulos del modelo (`TAZA MINIMALISTA`, `PAUSA MATUTINA`,
  `ESENCIA BLANCA`, `REFLEJOS EN MADERA`); al pulsar «Prompt 1» el editor recibió el texto
  completo (336/1200 caracteres), con foco y botón activo; sin errores de consola.
- Móvil 390 px: dos columnas de 144×42 px por botón y `scrollWidth == clientWidth` (sin
  desbordes).

## Capturas

`01-local-escritorio.png`, `02-local-movil.png` (con datos simulados) y
`03-produccion.png`, `04-produccion-movil.png` (modelo real).

## Commit

`4e60e904` — feat(flow-studio): propuestas de IA en 4 botones que cargan en el editor.
