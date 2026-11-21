# Filee 2.5 — réplica web de la aplicación

Reproducción de la **interfaz de la app de escritorio** Filee 2.5 (Avalonia, .NET),
con la estética de la casa: cian `#00D0D0` y verde `#26C626`, Electrolize, paneles
de vidrio azulado y bordes de 2 px.

> **Aviso.** No es oficial ni está afiliada a Filee. El producto, sus textos y sus
> capturas son de **Myeonggu Kim (KnifeLemon)**, que lo publica con licencia MIT —
> https://github.com/KnifeLemon/Filee. El logotipo de esta página es propio.

## Qué es

Una maqueta navegable de la ventana de Filee: barra de título, barra lateral con
las nueve secciones, y cada página con sus controles reales. Se reconstruyó a partir
de la app instalada en este equipo: se capturaron sus pantallas y se extrajeron
sus textos con UI Automation, así que los rótulos son los que muestra la app en español.

| Sección | Qué incluye |
|---|---|
| **Inicio** | Zona de suelta compacta, **perfil activo** (eliges el perfil y marcas los formatos que salen en el círculo; se guardan entre visitas), **menú circular integrado** y lista de «Preparados» con miniatura ampliable (rueda del ratón para acercar, arrastrar para mover, doble clic para el tamaño normal). Nada se toca hasta que eliges formato. Después, «Conversiones recientes» con búsqueda y acciones Abrir con / Abrir carpeta / Deshacer. |
| **General** | Idioma, inicio de sesión, al cerrar la ventana, menú contextual, carpeta de guardado, fechas originales, arrastre desde el navegador, proxy, historial, exportar/importar y carpeta de ajustes. |
| **Atajos** | Gestos (Ctrl + Left, Ctrl + Alt + Space, Ctrl + Alt + Left), tecla de giro y apps excluidas. |
| **Ajustes preestablecidos** | Lista de ajustes y editor: nombre, formato, nombre corto, opciones de imagen y salida. |
| **Áreas** | Ocho áreas de formatos de nicho con interruptor y la lista de «siempre visibles». |
| **Carpetas supervisadas** | Alta de carpetas con formato de destino y aviso de la línea de comandos. |
| **Tema** | Estilo (Filee Soft / Material You), aspecto claro/oscuro, color de acento, redondeo, opacidad, escala y vista previa. |
| **Motores** | Estado de Ghostscript, FFmpeg, Calibre, WeasyPrint, Tesseract, LibreOffice y Pandoc, con descarga y progreso. |
| **Acerca de** | Versión, enlaces, aviso de réplica y componentes de terceros con su licencia. |

## Qué funciona de verdad

- **Flujo de conversión en dos pasos**, como la app: sueltas un archivo y se queda
  en «Preparados» con su miniatura (clic para verla en grande y **zoom con la rueda
  del ratón**, botones o teclas `+` / `-`; arrastra para mover y doble clic para
  volver al tamaño normal), su peso y sus dimensiones o páginas. **No se convierte
  nada** hasta que pulsas un formato del menú circular; entonces se genera el
  archivo y se añade al historial.
- **Imágenes** (JPG, PNG, WEBP, AVIF, GIF, BMP…): salida JPG, PNG y WEBP con
  `canvas`; ICO (contenedor con PNG dentro); PDF de una página con la imagen
  incrustada en JPEG; y DOCX con la imagen a página completa.
- **PDF**: salida JPG, PNG, WEBP e ICO (una imagen por página, en ZIP si hay
  varias), PDF (copia) y DOCX con el texto extraído página a página.
- **DOCX**: salida PDF (una página por hoja), JPG, PNG, WEBP e ICO (primera página
  o ZIP con todas) y DOCX (copia).
- **Todo en el navegador**: las conversiones de documentos usan `pdfjs-dist`
  (PDF), `docx-preview` + `html2canvas` (DOCX) y `fflate` (ZIP), cargados solo
  cuando hacen falta. Nada se sube a ningún servidor.
- **Ajustes persistentes**: interruptores, idioma, acento, redondeo, opacidad,
  escala, tema, carpetas supervisadas, el perfil activo y **los formatos marcados de
  cada perfil** (lo que aparece en el menú circular) se guardan en `localStorage` y
  sobreviven a la recarga.
- **Tema en vivo**: el acento cambia toda la interfaz, el aspecto pasa a claro y el
  redondeo y la escala se aplican al instante.
- **Ventana**: minimizar, maximizar, cerrar y volver a abrir; barra lateral
  contraíble.
- **Descarga de motores**: progreso simulado con estado final «Instalado».

## Límites conocidos

- Un PDF se convierte a DOCX como **texto** (párrafos y saltos de página): no se
  conservan tablas, columnas ni imágenes del PDF original.
- Un DOCX se convierte a PDF **dibujando cada hoja tal y como la maqueta el
  navegador**: el resultado se parece mucho, pero no es idéntico al de Word.
- Las macros, los documentos protegidos y los formatos `.doc` antiguos no se
  admiten.

## Qué está representado y no ejecutado

Los gestos globales, la detección de entrada de Windows, el menú contextual del
Explorador, la carpeta de ajustes del sistema y la descarga real de motores
necesitan la app de escritorio. Aquí se muestran y se configuran, y la propia
interfaz lo advierte en los pies de página correspondientes.

## Estructura

```
filee-app/
├── index.html              ← página compilada (esto es lo que se sirve)
├── assets/                 ← JS y CSS con hash (incluye el worker de pdf.js)
├── favicon.svg
└── fuente/                 ← proyecto Vite (React 18)
    ├── src/
    │   ├── App.jsx  shell.jsx  state.jsx  ui.jsx  icons.jsx  styles.css
    │   ├── convert.js      ← imágenes y PDF de una página
    │   ├── docs.js         ← PDF y DOCX (pdf.js, docx-preview, html2canvas, fflate)
    │   ├── pdf.worker.min.js  ← worker de pdf.js (se sirve como archivo aparte)
    │   ├── components/Logo.jsx
    │   └── pages/  (Home, General, Shortcuts, Presets, Areas, Watched, Theme, Engines, About)
    └── test/               ← pruebas automáticas (no se publican)
        ├── index.html  main.js   ← conversiones con archivos reales
        ├── app.html    app.js    ← integración: suelta PDF + DOCX y convierte
        └── fixtures/  informe.docx, texto.pdf
```

## Reconstruir

```bash
cd fuente
npm install
npm run build      # dist/
```

Y se copia `fuente/dist/*` a la raíz de esta carpeta.

## Verificación

- Conversiones (Chrome headless, con CSP estricta `script-src 'self'`,
  `worker-src 'self'` y sin `unsafe-eval`): **13/13 OK** — abrir PDF, páginas a
  canvas, PDF de varias páginas, PDF→DOCX, miniatura de PDF, DOCX→canvas,
  DOCX→PDF, DOCX→PNG, miniatura de DOCX, ZIP, PDF→PNG en ZIP, DOCX→JPG e
  imagen→DOCX.
- Integración con la app real: soltar un PDF y un DOCX, ver las dos miniaturas y
  convertir a PDF, JPG y DOCX: **OK**, sin avisos de error.
- Los PDF generados se comprueban con Ghostscript (sin errores ni reparaciones) y
  el DOCX generado con `python-docx`.

Para repetir las pruebas:

```bash
cd fuente
npm run build:test
# sirve dist-test y abre /test/index.html o /test/app.html en Chrome
```
