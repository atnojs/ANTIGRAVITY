# Filee 2.5 — réplica web de la aplicación

Reproducción de la **interfaz de la app de escritorio** Filee 2.5 (Avalonia, .NET),
con la estética de la casa: cian `#00D0D0` y verde `#26C626`, Electrolize, paneles
de vidrio azulado y bordes de 2 px.

> **Aviso.** No es oficial ni está afiliada a Filee. El producto, sus textos y sus
> capturas son de **Myeonggu Kim (KnifeLemon)**, que lo publica con licencia MIT —
> https://github.com/KnifeLemon/Filee. El logotipo de esta página es propio.

## Qué es

Una maqueta navegable de la ventana de Filee: barra de título, barra lateral con
las diez secciones, y cada página con sus controles reales. Se reconstruyó a partir
de la app instalada en este equipo (`C:\Program Files\Filee`): se capturaron las
diez pantallas y se extrajeron sus textos con UI Automation, así que los rótulos
son los que muestra la app en español.

| Sección | Qué incluye |
|---|---|
| **Inicio** | Zona de suelta, «Conversiones recientes» con búsqueda, y acciones Abrir archivo / Abrir con / Abrir carpeta / Deshacer. |
| **General** | Idioma, inicio de sesión, al cerrar la ventana, menú contextual, carpeta de guardado, fechas originales, arrastre desde el navegador, proxy, historial, exportar/importar y carpeta de ajustes. |
| **Atajos** | Gestos (Ctrl + Left, Ctrl + Alt + Space, Ctrl + Alt + Left), tecla de giro y apps excluidas. |
| **Menú circular** | Perfiles, formatos del menú con interruptores, opacidad y vista previa del anillo en vivo. |
| **Ajustes preestablecidos** | Lista de ajustes y editor: nombre, formato, nombre corto, opciones de imagen y salida. |
| **Áreas** | Ocho áreas de formatos de nicho con interruptor y la lista de «siempre visibles». |
| **Carpetas supervisadas** | Alta de carpetas con formato de destino y aviso de la línea de comandos. |
| **Tema** | Estilo (Filee Soft / Material You), aspecto claro/oscuro, color de acento, redondeo, opacidad, escala y vista previa. |
| **Motores** | Estado de Ghostscript, FFmpeg, Calibre, WeasyPrint, Tesseract, LibreOffice y Pandoc, con descarga y progreso. |
| **Acerca de** | Versión, enlaces, aviso de réplica y componentes de terceros con su licencia. |

## Qué funciona de verdad

- **Conversión de imágenes**: lo que sueltas en Inicio se convierte a PNG en el
  navegador con `canvas`, y «Abrir archivo» descarga el resultado.
- **Ajustes persistentes**: interruptores, idioma, acento, redondeo, opacidad,
  escala, tema y carpetas supervisadas se guardan en `localStorage`.
- **Tema en vivo**: el acento cambia toda la interfaz, el aspecto pasa a claro y el
  redondeo y la escala se aplican al instante.
- **Ventana**: minimizar, maximizar, cerrar y volver a abrir; barra lateral
  contraíble.
- **Descarga de motores**: progreso simulado con estado final «Instalado».

## Qué está representado y no ejecutado

Los gestos globales, la detección de entrada de Windows, el menú contextual del
Explorador, la carpeta de ajustes del sistema y la descarga real de motores
necesitan la app de escritorio. Aquí se muestran y se configuran, y la propia
interfaz lo advierte en los pies de página correspondientes.

## Estructura

```
filee-app/
├── index.html
├── assets/
├── favicon.svg
└── fuente/                 ← proyecto Vite (React 18)
    └── src/
        ├── App.jsx  shell.jsx  state.jsx  ui.jsx  icons.jsx  styles.css
        ├── components/Logo.jsx
        └── pages/  (Home, General, Shortcuts, Donut, Presets, Areas, Watched, Theme, Engines, About)
```

## Reconstruir

```bash
cd fuente
npm install
npm run build      # dist/
```

Y se copia `fuente/dist/*` a la raíz de esta carpeta.

## Verificación

Trece comprobaciones automáticas en Chrome (las diez secciones, interruptores,
persistencia, acento, aspecto claro, redondeo, barra lateral, ventana, búsqueda,
descarga de motores, consola y red): **13/13 OK**.
