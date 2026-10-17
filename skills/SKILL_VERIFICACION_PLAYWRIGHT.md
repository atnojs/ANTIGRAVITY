---
name: verificacion-playwright
description: "Úsala para probar de verdad una app/web en Chrome recorriendo el flujo completo del usuario: clics, navegación, formularios, subida y descarga de ficheros, consola, red, recarga y tres anchos, con capturas como evidencia. Actívala en toda entrega con interacción (aunque no haya cambio visual) y cuando `capturas-verificacion` necesite pulsar, rellenar o comprobar descargas."
---

# Verificación funcional en navegador con Playwright CLI

## Qué resuelve

`capturas-verificacion` mide geometría con Chrome headless y un harness de iframes, pero **no puede pulsar, rellenar, subir, descargar ni leer la consola**. Esta skill recorre el flujo real del usuario sobre la URL desplegada y deja evidencia. Se usan juntas: aquella para píxeles, esta para comportamiento.

## Requisitos (verificado en este equipo el 2026-10-17)

- `playwright-cli` **0.1.22** instalado global (`npm i -g @playwright/cli@latest`); binario en `E:\npm\playwright-cli.ps1`, ya en PATH.
- Node 18+ (aquí 24.14) y Chrome instalado (aquí 155). No descarga navegadores: se abre Chrome con `--browser=chrome`.
- Comprobación rápida: `playwright-cli --version`.
- En otro PC sin instalación: `npx -y @playwright/cli@latest ...` (más lento) o instalar el global.
- **Sandbox:** con DSH en modo `workspace-write` Chrome no puede arrancar (`spawn EPERM`); esta skill necesita permiso ampliado. En Claude Code no aplica.

## Reglas

- **Una sesión por app:** `-s=<app>` en todos los comandos; cerrar con `close`.
- **No matar Chrome por nombre.** `Get-Process chrome | Stop-Process` cierra también el Chrome de Antonio (WhatsApp y Gemini son PWAs). Si quedan sesiones del CLI: `playwright-cli list` y `-s=<app> close`. `kill-all` solo como último recurso.
- **cwd = carpeta de evidencias** (`tools/evidencias/<AAAA-MM-DD>-<app>/`) para que `.playwright-cli/` (snapshots y consola) no ensucie la raíz. Está en `.gitignore`.
- Sesión limpia por defecto. `--persistent`/`--profile` solo si el flujo exige login; nunca versionar `state` ni cookies.
- Probar la **URL desplegada**, no `file://`, salvo banco de pruebas aislado y desechable.

## Flujo

1. **Abrir** la app desplegada:

   ```powershell
   playwright-cli -s=<app> open https://atnojs.es/apps/<app>/ --browser=chrome
   ```

2. **Snapshot** para obtener refs (`e32`): `playwright-cli -s=<app> snapshot`. El YAML queda en `.playwright-cli/` y el CLI imprime uno nuevo tras cada acción. Si es enorme: `snapshot --depth=4` y `find "texto"`.
3. **Interactuar** por ref o por locator: `click e37`, `fill e32 "texto"`, `type`, `press Enter`, `select`, `check`, `upload <ruta>`, `drop`, `hover`. Se aceptan locators: `click "getByRole('button', { name: 'Comida: 26 trucos' })"`.
4. **Comprobar el resultado**: `snapshot`, `find "texto esperado"`, `eval "document.querySelectorAll('.card').length"` y captura.
5. **Consola y red**: `console` (o `console error`), `requests` (`--static` si hace falta). Distinguir errores propios del ruido de terceros o extensiones, y anotar los propios.
6. **Descargas**: tras el clic, comprobar que el fichero aparece en disco y que su contenido es válido (JSON parseado si aplica). Si la descarga la gestiona el navegador: `run-code` con `page.waitForEvent('download')` + `download.saveAs(...)`.
7. **Recarga y estado**: `reload`, `go-back`; comprobar que historial y sesión persisten.
8. **Responsive real**: `resize 768 1024` y `resize 393 844` + capturas (o sesión aparte con `--device="iPhone 15"`).
9. **Cerrar**: `close`; `playwright-cli list` para confirmar que no queda sesión.

## Evidencias

Guardar en `tools/evidencias/<fecha>-<app>/` con nombres por paso: `01-<paso>.png`, `02-...`, `03-tablet.png`, `04-movil.png`, y los `.yml`/`console-*.log` de `.playwright-cli/`. Nunca presentar una captura de un estado no comprobado.

## Checklist de salida

- [ ] URL desplegada abierta; título y contenido esperados.
- [ ] Flujo principal recorrido con clics/teclado; resultado comprobado en DOM o captura.
- [ ] Formularios rellenados y enviados; validación y errores vistos.
- [ ] Descargas verificadas en disco y con contenido válido.
- [ ] Consola revisada; errores propios anotados (o corregidos).
- [ ] Red revisada; 4xx/5xx propios identificados.
- [ ] Recarga: estado/historial se mantiene.
- [ ] Tres anchos con captura.
- [ ] Sesión cerrada; sin Chrome huérfano; `git status` sin restos.

## Ejemplo real (probado 2026-10-17)

TrickVault (`https://atnojs.es/apps/trickvault/`); los refs son los de esa sesión:

```powershell
playwright-cli -s=trickvault open https://atnojs.es/apps/trickvault/ --browser=chrome
playwright-cli -s=trickvault snapshot
playwright-cli -s=trickvault fill e32 "logo"
playwright-cli -s=trickvault screenshot --filename=01-busqueda-logo.png
playwright-cli -s=trickvault click e73        # carpeta «Comida»
playwright-cli -s=trickvault screenshot --filename=02-carpeta-comida.png
playwright-cli -s=trickvault console
playwright-cli -s=trickvault requests
playwright-cli -s=trickvault resize 768 1024
playwright-cli -s=trickvault screenshot --filename=03-tablet.png
playwright-cli -s=trickvault resize 393 844
playwright-cli -s=trickvault screenshot --filename=04-movil.png
playwright-cli -s=trickvault close
```

Resultado: búsqueda con 14 resultados, navegación a carpeta, peticiones dinámicas 200 (catálogo, favoritos, imágenes) y un error de consola **preexistente** (Babel en el navegador), anotado y no provocado por la prueba. Evidencias en `tools/evidencias/2026-10-17-verificacion-playwright/`.

## Limitaciones

- `screenshot` captura el viewport; página completa con `run-code`: `await page.screenshot({ fullPage: true })`.
- No sustituye a la medida exacta de geometría (iframes + PIL de `capturas-verificacion`).
- Para Safari/iOS real hace falta webkit (`npx playwright install webkit`), que no está instalado.
