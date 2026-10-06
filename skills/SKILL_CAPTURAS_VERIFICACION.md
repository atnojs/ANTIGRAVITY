---
name: capturas-verificacion
description: "Úsala en TODA creación, edición o revisión de app, web o componente con efecto visual: mide la geometría real en Chrome, guarda el antes y el después y entrega el resultado con capturas de pantalla en la respuesta. Actívala también cuando el usuario diga 'enséñame cómo queda', 'no lo veo' o pida comprobar un cambio visual."
---

# Capturas y verificación visual

## Instrucciones de ejecución

Antonio quiere **ver** el resultado, no leer que "queda mejor". Toda entrega con efecto visual termina con pruebas medidas y con capturas adjuntas en la respuesta. En arreglos, la misma imagen muestra el **antes y el después**.

### 1. Antes de tocar nada, fija el estado "antes"

- Guarda el original para poder reproducirlo: `git show HEAD:<ruta/app.css> | Set-Content tools\_antes.css -Encoding UTF8`.
- Si el cambio es de marcado, duplica la página con el marcado antiguo (copia **no versionada**, dentro de la app o en `tools/`, y bórrala al terminar).
- Anota la medida del problema (anchos, número de líneas, recortes, solapes) para poder comparar después.

### 2. Mide la geometría real con Chrome headless

Ejecutable: `C:\Program Files\Google\Chrome\Application\chrome.exe` (alternativa: `${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe`).

Banderas base, siempre con un perfil propio:

```powershell
& $chrome --headless=new --disable-gpu --no-sandbox --no-first-run --hide-scrollbars `
  --force-device-scale-factor=1 --user-data-dir=tools\_chrome_prof1 `
  --virtual-time-budget=12000 --dump-dom  "file:///.../harness.html"
& $chrome <mismas banderas> --window-size=1440,2200 --screenshot="...\captura.png" "file:///.../pagina.html"
```

Usa `skills/recursos/capturas-verificacion/plantilla-harness.html` (iframes a anchos exactos + volcado de medidas) y `plantilla-comparativa.py` (recorte + antes/después etiquetado).

**Anchos de móvil**: la ventana de Chrome no baja de 500 px. Mide dentro de **iframes** del ancho deseado (las media queries responden al viewport del iframe) y lee los números con `--allow-file-access-from-files`, que permite acceder a `iframe.contentDocument`.

**Anchos de texto sin navegador**: métricas reales con PIL y la TTF local `apps/conversor_multimedia/vendor/electrolize.ttf` (tamaño `rem × 16`, `letter-spacing` 0.04em, `box-sizing: border-box`). Sirve para predecir cápsulas y el empaquetado `flex-wrap` antes de tocar el CSS.

### 3. Trampas comprobadas (evítalas de raíz)

- **Sandbox confinado**: Chrome usa named pipes y en modo confinado termina sin salida ni error. Si no puedes ejecutarlo con permiso suficiente, dilo y no afirmes haber comprobado nada visualmente.
- **NUNCA mates Chrome filtrando por nombre de proceso.** `Get-Process chrome | Stop-Process -Force` cierra también el Chrome de Antonio y sus accesos directos de escritorio (WhatsApp y Gemini son PWAs de Chrome): se perdió su sesión entera. Lanza siempre el navegador con un `--user-data-dir` propio y, si hay que limpiar, mata **solo el PID que tú arrancaste** (`Start-Process -PassThru` + `Stop-Process -Id`). Si el navegador no devuelve salida porque hay instancias tuyas colgadas, usa un perfil nuevo en lugar de matar procesos ajenos.
- **Sin `--user-data-dir` propio**, un Chrome ya abierto se traga la petición y no obtienes salida.
- **`backdrop-filter` con `--disable-gpu`** deja los paneles en blanco. Neutrálizalo **solo** dentro del banco de pruebas (`*{backdrop-filter:none !important}`), nunca en la app.
- **El bloque de resultados del harness** (un `<pre>` ancho y sin posicionar) estira el `body` y empuja la app fuera de la captura: fíjalo con `position: fixed`.
- **Espera a las fuentes**: mide tras `document.fonts.ready` (y una espera corta). Si no, el reparto de líneas es falso.
- **Compara los mismos anchos** en el antes y en el después.
- **Reproduce el contenedor real**: la página desplegada puede tener contenido que cambia el ancho disponible (por ejemplo, un panel de historial cargado). Si el estado local no lo tiene, fuérzalo en una copia de prueba o mide la página real.
- **Mide la hoja desplegada**, no solo la local: si el CSS se sirve por ruta, comprueba la URL pública con un parámetro distinto del que usa el `index.html` (para no envenenar su entrada de caché) y verifica los marcadores del cambio.

### 4. Construye la imagen de entrega

- Recorta ajustado a la zona afectada y apila **antes arriba / después abajo** (o lado a lado si es ancho).
- Etiqueta cada banda con una frase que explique el problema y el resultado.
- Guárdala en `tools/` con nombre descriptivo: `comparativa_<componente>_<app>.png`.
- Ejemplos vivos en el proyecto: `tools/comparativa_selector_modelos.png` (angulos_de_camara) y `tools/comparativa_selector_estilizador.png` (estilizador_prompt).

### 5. Entrega

- Adjunta la imagen en línea en la respuesta: `![descripción](tools/comparativa_....png)`.
- Añade la **tabla de medidas** (ancho de ventana → contenedor → líneas/comportamiento) y, cuando exista, la captura de la **URL desplegada**.
- Indica siempre qué está medido en Chrome y qué no se ha podido comprobar.
- Nunca presentes una captura de un estado no verificado ni describas como visible algo que no has capturado.

### 6. Limpieza

- Borra el harness, las copias temporales, los perfiles de Chrome y las capturas intermedias.
- Conserva solo las imágenes comparativas que aporten a la entrega.
- No versiones nunca archivos de prueba: viven en `tools/` (protegida por `.htaccess`) y se eliminan al acabar.

## Checklist de salida

- [ ] Estado "antes" reproducido con el original de `git HEAD`.
- [ ] Medido en Chrome a los anchos reales (escritorio, tablet y móvil), antes y después.
- [ ] Comparativa antes/después en una sola imagen etiquetada, guardada en `tools/`.
- [ ] Captura de la URL desplegada cuando el cambio se publica.
- [ ] Tabla de medidas y capturas adjuntas en la respuesta final.
- [ ] Banco de pruebas eliminado y árbol de trabajo sin restos.
