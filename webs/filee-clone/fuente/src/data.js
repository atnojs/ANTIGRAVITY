// Contenido de la landing (réplica de filee.sh/es). Los textos describen el
// proyecto Filee, de Myeonggu Kim, publicado con licencia MIT.

export const GITHUB = 'https://github.com/KnifeLemon/Filee';
export const RELEASES = 'https://github.com/KnifeLemon/Filee/releases';
export const VERSION = '2.5.0';
export const SITE = 'https://filee.sh';

export const NAV_LINKS = [
  { label: 'Cómo funciona', href: '#how' },
  { label: 'Funciones', href: '#features' },
  { label: 'Formatos', href: '#formats' },
  { label: 'Línea de comandos', href: '#automation' },
  { label: 'Ajustes preestablecidos', href: '#gallery' },
  { label: 'HWP', href: '#hwp' },
  { label: 'Preguntas', href: '#faq' },
];

export const LANGS = [
  { code: 'en', path: '/', flag: 'us', name: 'English' },
  { code: 'ko', path: '/ko/', flag: 'kr', name: '한국어' },
  { code: 'zh-CN', path: '/zh-cn/', flag: 'cn', name: '简体中文' },
  { code: 'zh-TW', path: '/zh-tw/', flag: 'tw', name: '繁體中文' },
  { code: 'pl', path: '/pl/', flag: 'pl', name: 'Polski' },
  { code: 'es', path: '/es/', flag: 'es', name: 'Español' },
  { code: 'hi', path: '/hi/', flag: 'in', name: 'हिन्दी' },
  { code: 'ja', path: '/ja/', flag: 'jp', name: '日本語' },
  { code: 'ru', path: '/ru/', flag: 'ru', name: 'Русский' },
  { code: 'ar', path: '/ar/', flag: 'sa', name: 'العربية' },
  { code: 'pt-BR', path: '/pt-br/', flag: 'br', name: 'Português (Brasil)' },
  { code: 'fr', path: '/fr/', flag: 'fr', name: 'Français' },
  { code: 'ne', path: '/ne/', flag: 'np', name: 'नेपाली' },
  { code: 'th', path: '/th/', flag: 'th', name: 'ไทย' },
  { code: 'tr', path: '/tr/', flag: 'tr', name: 'Türkçe' },
  { code: 'pt-PT', path: '/pt-pt/', flag: 'pt', name: 'Português (Portugal)' },
  { code: 'de', path: '/de/', flag: 'de', name: 'Deutsch' },
  { code: 'it', path: '/it/', flag: 'it', name: 'Italiano' },
  { code: 'id', path: '/id/', flag: 'id', name: 'Bahasa Indonesia' },
  { code: 'vi', path: '/vi/', flag: 'vn', name: 'Tiếng Việt' },
  { code: 'bn-BD', path: '/bn-bd/', flag: 'bd', name: 'বাংলা (বাংলাদেশ)' },
  { code: 'fa', path: '/fa/', flag: 'ir', name: 'فارسی' },
];

export const STEPS = [
  {
    title: 'Mantén una tecla y arrastra',
    text: 'Selecciona archivos en el Explorador de archivos o en el escritorio y arrástralos manteniendo pulsado Ctrl, o la tecla modificadora que elijas.',
  },
  {
    title: 'Suelta sobre un formato',
    text: 'Junto al cursor se abre un menú circular con los formatos que encajan con esos archivos. Pasa por encima de uno y suelta.',
  },
  {
    title: 'Listo, junto al original',
    text: 'Un anillo de progreso avanza y los archivos nuevos aparecen junto a los originales. ¿Prefieres los menús? Haz clic derecho y elige «Convertir con Filee».',
  },
];

export const SHOWCASE = [
  {
    index: '01',
    title: 'Arrastra y el menú circular aparece',
    text: 'Mantén Ctrl y arrastra un archivo: los formatos que le sirven se abren en un menú circular junto al cursor. Detente en una porción de grupo y se despliega un segundo anillo; suelta en WEBP y trip.webp aparece junto al original.',
    hint: 'Mantén y arrastra',
    key: 'Ctrl',
    poster: 'demos/expand.webp',
    posterDark: 'demos/expand-dark.webp',
    video: 'demos/expand.mp4',
  },
  {
    index: '02',
    title: 'Dale la vuelta para ver más',
    text: 'Pulsa Tab o gira la rueda del ratón y el menú circular muestra su reverso: recortar, girar, voltear, grises, quitar fondo, combinar en un PDF o reunirlo todo en un ZIP.',
    hint: 'o la rueda del ratón',
    key: 'Tab',
    poster: 'demos/flip.webp',
    video: 'demos/flip.mp4',
  },
  {
    index: '03',
    title: 'Directo desde el navegador',
    text: 'Arrastra una imagen fuera de una página web y suéltala en un formato. Filee la descarga, muestra la velocidad y el progreso en el anillo y guarda el original y el archivo convertido en Descargas.',
    hint: 'Arrastra desde cualquier página',
    poster: 'demos/browser.webp',
    video: 'demos/browser.mp4',
  },
  {
    index: '04',
    title: 'Recorta con el dial de proporciones',
    text: 'Suelta fotos en Recortar y encuadra una tras otra. Pulsa A sobre la imagen y el dial de proporciones se abre junto al cursor: 1:1, 4:3, 3:2, 16:9 o la original. Luego «Recortar y seguir», «Recortar y guardar» y listo.',
    hint: 'abre el dial de proporciones',
    key: 'A',
    poster: 'demos/crop.webp',
    video: 'demos/crop.mp4',
  },
];

export const NEWS = [
  {
    title: 'Galería de ajustes preestablecidos',
    text: 'Explora los ajustes que otras personas han compartido, mira qué hace cada uno con tus archivos e instálalo con un clic. Ábrela en Ajustes preestablecidos → Galería.',
    poster: 'whats-new/2.5/gallery.webp',
    video: 'whats-new/2.5/gallery.mp4',
  },
  {
    title: 'Comparte tus ajustes',
    text: '«Exportar para la galería…» revisa tus ajustes como lo hace la galería, te dice qué corregir y guarda un preset.json para enviarlo.',
    poster: 'whats-new/2.5/share.webp',
    video: 'whats-new/2.5/share.mp4',
  },
  {
    title: 'Los originales, a la Papelera',
    text: 'Un ajuste puede mover el original a la Papelera de reciclaje cuando el resultado está listo. No se borra nada: puedes restaurarlo desde allí.',
    poster: 'whats-new/2.5/trash.webp',
    video: 'whats-new/2.5/trash.mp4',
  },
  {
    title: 'Nuevos formatos',
    text: 'Texturas de Valve (VTF), placas de circuito Gerber, Obsidian Canvas, G-code, grabaciones NOV de Wisenet, sketches de Arduino y más.',
    poster: 'whats-new/2.5/formats.webp',
    video: 'whats-new/2.5/formats.mp4',
  },
  {
    title: 'Windows on Arm y mongol',
    text: 'Filee ya funciona de forma nativa en equipos Windows on Arm y habla mongol (Монгол).',
    poster: 'whats-new/2.5/mongolian.webp',
    video: 'whats-new/2.5/mongolian.mp4',
  },
  {
    title: 'Y un poco más',
    text: 'Imágenes ISO UDF 2.01, PDF combinados en un solo tamaño de papel, Combinar PDF en el menú de Imágenes, PDF/A que conserva los enlaces y Yazi en Linux.',
    poster: 'whats-new/2.5/more.webp',
    video: 'whats-new/2.5/more.mp4',
  },
];

export const FEATURES = [
  {
    icon: 'donut',
    title: 'Un menú circular junto al cursor',
    text: 'Los formatos aparecen donde ya estás, sin ninguna ventana de por medio. Se abre con una tecla modificadora, un botón del ratón, un gesto de mantener pulsado o un atajo de teclado. Una porción puede contener un grupo de ajustes preestablecidos.',
  },
  {
    icon: 'layers',
    title: '250+ formatos, un solo gesto',
    text: 'Imágenes, PDF, Word, Excel, PowerPoint, HWP, libros electrónicos, vídeo, audio, subtítulos, archivos de datos, modelos 3D, datos geoespaciales, archivos comprimidos, planos CAD y tipografías. Filee planifica automáticamente el camino entre formatos.',
  },
  {
    icon: 'doc',
    title: 'Sin Office',
    text: 'Los archivos de Word, Excel y PowerPoint se convierten sin Microsoft Office ni LibreOffice, y los HWP sin Hancom Office. Filee no usa Office ni Hancom Office aunque estén instalados.',
  },
  {
    icon: 'grid',
    title: 'Conversión por lotes',
    text: 'Suelta 1 archivo o 100. Se convierten en paralelo, un fallo nunca detiene al resto y los ajustes preestablecidos pueden combinarlo todo en un PDF o un ZIP.',
  },
  {
    icon: 'lock',
    title: '100 % en tu PC',
    text: 'No se sube nada. Filee funciona sin conexión, así que tus documentos privados, fotos y grabaciones nunca salen de tu ordenador.',
  },
  {
    icon: 'windows',
    title: 'Justo donde trabajas',
    text: 'El gesto de arrastre, «Convertir con Filee» en el menú contextual (en Windows 11 también en el menú principal), Enviar a, un atajo de teclado o la zona de suelta de la ventana principal.',
  },
  {
    icon: 'sliders',
    title: 'Ajustes preestablecidos por tipo de archivo',
    text: 'Calidad, cambio de tamaño, girar y voltear, DPI, escala de grises, metadatos, quitar el fondo, trazar a SVG, compresión TIFF, tamaños de ICO, combinar y dividir PDF, rangos de páginas, compresión e imagen larga, 720p, vídeo HEVC y AV1, codificación por hardware, cada fotograma como imagen, tasa de bits de MP3, carpeta de salida, nombres de archivo y fechas originales de los archivos.',
  },
  {
    icon: 'download',
    title: 'Motores a demanda',
    text: 'Los motores grandes son opcionales. Márcalos en el instalador o descárgalos después en la aplicación: FFmpeg, LibreOffice, Calibre, Ghostscript y Pandoc. Filee muestra sus versiones, la velocidad de descarga y el tiempo restante. ¿Ya tienes FFmpeg, calibre o Pandoc? Filee los encuentra y se salta la descarga.',
  },
  {
    icon: 'code',
    title: 'Gratis y de código abierto',
    text: 'Licencia MIT, sin anuncios ni cuenta. En English, Español, 日本語, 한국어, 简体中文, 繁體中文, Polski, हिन्दी, Русский, العربية, Português (Brasil), Français, नेपाली, ไทย, Türkçe, Português (Portugal), Deutsch, Italiano, Bahasa Indonesia, Tiếng Việt, বাংলা (বাংলাদেশ) y فارسی. Filee te avisa de las versiones nuevas; cada versión enumera sus cambios y colaboradores.',
  },
];

export const CATEGORIES = [
  { slug: 'images', icon: 'img', color: '#378add', name: 'Imágenes', count: '38 formatos', sample: 'JPG · PNG · WEBP · AVIF · HEIC · TIFF', tags: ['Integrado', 'FFmpeg'] },
  { slug: 'vector', icon: 'vector', color: '#d4537e', name: 'Gráficos vectoriales', count: '12 formatos', sample: 'SVG · SVGZ · EMF · WMF · AI · EPS', tags: ['Integrado', 'LibreOffice', 'Ghostscript'] },
  { slug: 'pdf', icon: 'pdf', color: '#e5252a', name: 'PDF', count: '1 formato', sample: 'PDF', tags: ['Integrado', 'Ghostscript', 'LibreOffice'] },
  { slug: 'documents', icon: 'doc', color: '#2b579a', name: 'Documentos', count: '24 formatos', sample: 'DOCX · DOCM · DOTX · DOTM · DOC · DOT', tags: ['Integrado', 'Pandoc', 'LibreOffice'] },
  { slug: 'hwp', icon: 'hwp', color: '#1b7fc4', name: 'HWP (Hangul)', count: '2 formatos', sample: 'HWP · HWPX', tags: ['Integrado'] },
  { slug: 'spreadsheets', icon: 'sheet', color: '#1d7a46', name: 'Hojas de cálculo', count: '13 formatos', sample: 'XLSX · XLSM · XLTX · XLS · XLT · ODS', tags: ['Integrado', 'LibreOffice'] },
  { slug: 'presentations', icon: 'slides', color: '#c8502e', name: 'Presentaciones', count: '12 formatos', sample: 'PPTX · PPTM · POTX · POTM · PPSX · PPT', tags: ['Integrado', 'LibreOffice'] },
  { slug: 'text', icon: 'text', color: '#5f5e5a', name: 'Texto y marcado', count: '15 formatos', sample: 'TXT · Markdown · HTML · MHTML · reStructuredText · LaTeX', tags: ['Integrado', 'Pandoc'] },
  { slug: 'data', icon: 'data', color: '#4d7c0f', name: 'Datos', count: '6 formatos', sample: 'JSON · JSON Lines · YAML · TOML · XML · vCard', tags: ['Integrado'] },
  { slug: 'ebooks', icon: 'book', color: '#8a5cc2', name: 'Libros electrónicos y cómics', count: '24 formatos', sample: 'EPUB · KEPUB · MOBI · AZW · AZW3 · AZW4', tags: ['Integrado', 'Calibre'] },
  { slug: 'video', icon: 'video', color: '#9c36b5', name: 'Vídeo', count: '22 formatos', sample: 'MP4 · MOV · MKV · WEBM · AVI · M4V', tags: ['FFmpeg'] },
  { slug: 'audio', icon: 'audio', color: '#0f9d8a', name: 'Audio', count: '30 formatos', sample: 'MP3 · M4A · M4B · AAC · WAV · FLAC', tags: ['FFmpeg'] },
  { slug: 'subtitles', icon: 'subs', color: '#4f46e5', name: 'Subtítulos', count: '9 formatos', sample: 'SRT · ASS · SSA · WebVTT · SAMI · LRC', tags: ['Integrado', 'FFmpeg'] },
  { slug: 'archives', icon: 'archive', color: '#b7791f', name: 'Archivos comprimidos', count: '28 formatos', sample: 'ZIP · 7Z · RAR · TAR · TAR.GZ · TAR.BZ2', tags: ['Integrado'] },
  { slug: 'cad', icon: 'cad', color: '#0e7490', name: 'Planos CAD', count: '2 formatos', sample: 'DWG · DXF', tags: ['Integrado'] },
  { slug: 'models', icon: 'model', color: '#be185d', name: 'Modelos 3D', count: '7 formatos', sample: 'GLB · glTF · STL · OBJ · 3MF · PLY', tags: ['Integrado'] },
  { slug: 'fonts', icon: 'font', color: '#4b5563', name: 'Tipografías', count: '5 formatos', sample: 'TTF · OTF · WOFF · WOFF2 · EOT', tags: ['Integrado'] },
  { slug: 'geo', icon: 'geo', color: '#16a34a', name: 'Datos geoespaciales', count: '5 formatos', sample: 'GeoJSON · KML · KMZ · GPX · Shapefile', tags: ['Integrado'] },
];

export const POPULAR = [
  ['HEIC → JPG', 'heic-to-jpg'], ['WEBP → PNG', 'webp-to-png'], ['PNG → JPG', 'png-to-jpg'],
  ['JPG → PDF', 'jpg-to-pdf'], ['SVG → PNG', 'svg-to-png'], ['PDF → JPG', 'pdf-to-jpg'],
  ['PDF → DOCX', 'pdf-to-docx'], ['DOCX → PDF', 'docx-to-pdf'], ['HWP → PDF', 'hwp-to-pdf'],
  ['XLSX → PDF', 'xlsx-to-pdf'], ['PPTX → PDF', 'pptx-to-pdf'], ['EPUB → PDF', 'epub-to-pdf'],
  ['MP4 → MP3', 'mp4-to-mp3'], ['MOV → MP4', 'mov-to-mp4'], ['WAV → MP3', 'wav-to-mp3'],
  ['RAR → ZIP', 'rar-to-zip'], ['PNG → SVG', 'png-to-svg'], ['SRT → WebVTT', 'srt-to-vtt'],
];

export const HWP_CHECKS = [
  'HWP, HWPX → PDF, PNG, JPG, DOCX, TXT, Markdown, HTML, EPUB',
  'HWP → HWPX',
  'HWPX → HWP',
  'DOCX, XLSX, PPTX, Markdown, PDF → HWPX',
  'DOCX, XLSX, PPTX, Markdown, TXT, HTML, PDF, EPUB → HWP',
  'DOCX → HWPX conserva la configuración de página, los encabezados y pies de página, las tablas con celdas combinadas, los cuadros de texto y las imágenes',
];

export const HWP_GUIDES = [
  ['HWP → PDF', 'hwp-to-pdf'], ['HWP → DOCX', 'hwp-to-docx'], ['HWPX → PDF', 'hwpx-to-pdf'],
  ['HWP → HWPX', 'hwp-to-hwpx'], ['DOCX → HWPX', 'docx-to-hwpx'], ['PDF → HWPX', 'pdf-to-hwpx'],
];

export const AUTO_CHECKS = [
  { text: 'con cualquiera de los 250+ formatos', code: 'filee convert *.heic --to jpg' },
  { text: 'Descargas y escaneos convertidos en cuanto están completos' },
  { text: 'Los originales se apartan, así que la carpeta funciona como una bandeja de entrada' },
  { text: 'Salida JSON y códigos de salida para scripts y tareas programadas' },
];

export const SCREENS = [
  { src: 'screens/page-toolbar-en.webp', caption: 'Editor del menú circular con perfiles y ajustes preestablecidos' },
  { src: 'screens/page-home-en.webp', caption: 'Pantalla de inicio con la zona de suelta y las conversiones recientes' },
  { src: 'screens/page-presets-en.webp', caption: 'Editor de ajustes preestablecidos con calidad y opciones de salida' },
  { src: 'screens/page-toolbar-dark.webp', caption: 'Tema oscuro' },
];

export const FAQ = [
  {
    q: '¿Filee es realmente gratis?',
    a: ['Sí. Filee es gratuito y de código abierto con licencia MIT: sin anuncios, sin marcas de agua, sin cuenta, sin periodo de prueba y sin límites propios de número ni de tamaño de archivos.'],
  },
  {
    q: '¿Funciona sin conexión? ¿Se suben mis archivos?',
    a: ['Todas las conversiones se hacen en tu propio PC y los archivos nunca se suben. Internet solo se usa para descargar un motor opcional o buscar actualizaciones, así que los documentos confidenciales, las fotos y las grabaciones se quedan en tu ordenador.'],
  },
  {
    q: '¿Qué formatos de archivo admite Filee?',
    a: ['Filee lee 255 formatos de archivo en 18 categorías: imágenes, gráficos vectoriales, PDF, documentos, HWP/HWPX coreanos, hojas de cálculo, presentaciones, texto y marcado, archivos de datos, libros electrónicos y cómics, vídeo, audio, subtítulos, archivos comprimidos, planos CAD, modelos 3D, tipografías y datos geoespaciales. De ellos, 147 funcionan nada más instalarlo; los demás usan un motor opcional gratuito. El catálogo de formatos enumera cada formato y a qué se convierte.'],
    link: { label: 'Ver los 255 formatos en el catálogo', href: '#formats' },
  },
  {
    q: '¿Necesito Microsoft Office, Hancom Office o LibreOffice?',
    a: [
      'No. Los archivos de Word, Excel y PowerPoint (DOCX, XLSX, XLS, CSV, PPTX) y los documentos coreanos HWP/HWPX los convierten motores integrados en Filee. Filee no usa Office ni Hancom Office aunque estén instalados; LibreOffice es solo una descarga opcional dentro de la aplicación para formatos antiguos como DOC, PPT, ODT y RTF.',
      'La excepción es el texto que necesita modelado de glifos (árabe, hebreo, escrituras índicas, tailandés y otras): los archivos DOCX, TXT, Markdown, HTML, XLSX, PPTX y HWPX con ese texto pasan a PDF e imágenes con el motor opcional LibreOffice. Sin LibreOffice, ese archivo falla con un mensaje que nombra la escritura, en lugar de convertirse en un PDF defectuoso.',
    ],
    pills: [['DOCX → PDF', 'docx-to-pdf'], ['XLSX → PDF', 'xlsx-to-pdf'], ['PPTX → PDF', 'pptx-to-pdf'], ['HWP → PDF', 'hwp-to-pdf']],
  },
  {
    q: '¿Qué son los motores opcionales?',
    a: [
      'Los motores grandes no van en el instalador. Márcalos en la página de motores del instalador o descárgalos dentro de Filee cuando los necesites: FFmpeg para vídeo y audio, extracción de subtítulos y guardado en HEIC (unos 100 MB); LibreOffice para formatos de oficina antiguos como DOC, PPT y ODT (unos 420 MB); Calibre para formatos poco comunes de libros electrónicos y salida en MOBI/AZW3; Ghostscript para EPS y PostScript; Pandoc para LaTeX, Org, AsciiDoc y otros lenguajes de marcado, Word → Markdown y Markdown → diapositivas (unos 42 MB).',
      'Se guardan en la carpeta propia de Filee y se pueden quitar en cualquier momento, y la aplicación muestra sus versiones, la velocidad de descarga y el tiempo restante. Si FFmpeg, calibre, Pandoc, Ghostscript o LibreOffice ya están en tu PC (en el PATH, Scoop incluido, o en Program Files), Filee los usa y se salta la descarga, y te avisa cuando esa copia es más antigua que la versión con la que se ha probado. En Ajustes → Motores → Usar mi copia puedes elegir una concreta.',
    ],
  },
  {
    q: '¿Instalar Filee requiere permisos de administrador?',
    a: ['Solo una vez, durante la instalación. El instalador pone Filee en Program Files para todos los usuarios y, en Windows 11, añade «Convertir con Filee» a la parte superior del menú del Explorador de archivos. Después, Filee se ejecuta con tu usuario normal. Para una instalación silenciosa, ejecuta el instalador con /VERYSILENT /SUPPRESSMSGBOXES. Si no puedes instalar programas, usa el ZIP portátil: descomprímelo en cualquier sitio y ejecuta Filee.exe.'],
  },
  {
    q: 'Filee no se abre en Windows 10, sin ventana ni error. ¿Qué puedo hacer?',
    a: ['Ocurre en un Windows 10 que lleva mucho tiempo sin actualizarse, en un PC cuyo procesador admite la protección de pila aplicada por hardware (CET). Windows activa esa protección, pero le falta una parte que .NET necesita, así que Filee y su instalador se cierran al instante, sin ventana ni mensaje. Instalar las actualizaciones de Windows disponibles (la última actualización acumulativa) lo soluciona. Si no puedes actualizar, desactivar la protección solo para Filee suele funcionar: en PowerShell como administrador, ejecuta Set-ProcessMitigation -Name Filee.exe -Disable UserShadowStack y lo mismo con filee-cli.exe y con el nombre de archivo del instalador (o usa el ZIP portátil). Para deshacerlo, quita esas entradas en Seguridad de Windows → Control de aplicaciones y navegador → Configuración de protección contra vulnerabilidades → Configuración de programas.'],
  },
  {
    q: '¿Puedo convertir muchos archivos a la vez?',
    a: ['Sí. Selecciona todos los archivos que quieras y suéltalos de una vez: Filee los convierte en paralelo, un archivo que falla nunca detiene a los demás, y los ajustes preestablecidos pueden combinarlo todo en un PDF o empaquetarlo en un ZIP.'],
  },
  {
    q: '¿Puedo convertir desde el menú contextual de Windows 11?',
    a: ['Sí. Haz clic derecho sobre los archivos en el Explorador de archivos y elige «Convertir con Filee». En Windows 11 también puedes ponerlo en el menú principal, sin «Mostrar más opciones»: haz clic una vez en «Añadir al menú principal» en Ajustes → General y acepta la solicitud de administrador. También funcionan Enviar a, un atajo de teclado y la zona de suelta de la ventana principal.'],
  },
  {
    q: '¿Puede Filee convertir desde la línea de comandos o automáticamente?',
    a: ['Sí. El instalador puede añadir el comando filee al PATH: filee convert *.heic --to jpg convierte archivos, comodines y carpetas con tus ajustes preestablecidos, imprime JSON para scripts y devuelve códigos de salida. Las carpetas supervisadas convierten automáticamente los archivos que llegan a una carpeta y pueden apartar los originales. Configúralas en la página Carpetas supervisadas de la aplicación o con filee watch en un terminal.'],
    link: { label: 'Leer la guía de la línea de comandos', href: '#automation' },
  },
  {
    q: '¿Cómo convierto un archivo, por ejemplo de HEIC a JPG?',
    a: ['Selecciona los archivos en el Explorador de archivos, mantén pulsado Ctrl (o la tecla que hayas elegido) y arrástralos. En el cursor se abre un menú circular de formatos: suelta los archivos sobre JPG y los nuevos archivos aparecen junto a los originales. Hay guías paso a paso para las conversiones más habituales.'],
    pills: [['HEIC → JPG', 'heic-to-jpg'], ['PDF → DOCX', 'pdf-to-docx'], ['MP4 → MP3', 'mp4-to-mp3'], ['WEBP → PNG', 'webp-to-png'], ['JPG → PDF', 'jpg-to-pdf'], ['MOV → MP4', 'mov-to-mp4']],
  },
  {
    q: '¿Por qué usar Filee en lugar de un conversor en línea?',
    a: ['Los conversores en línea suben tus archivos al servidor de otra persona, a menudo limitan el tamaño y el número de archivos y dependen de una conexión rápida. Filee convierte en tu PC: los archivos privados siguen siendo privados, los vídeos grandes y los cientos de archivos no son ningún problema, y funciona sin internet, gratis y sin anuncios.'],
  },
  {
    q: '¿Qué sistemas operativos son compatibles?',
    a: ['Windows 10 y 11 (x64 y ARM64) y Linux (x64 y ARM64, Ubuntu 22.04 o posterior) son versiones completas. En Linux, el gesto de arrastre necesita una sesión X11; en KDE Plasma con Wayland es experimental, y en otros escritorios Wayland funcionan la zona de suelta y el menú contextual del gestor de archivos. macOS 13 o posterior (Apple silicon e Intel) es una versión preliminar: la app aún no está notarizada, así que macOS te pide permitirla una vez en Privacidad y seguridad. Elige tu sistema en la sección de descarga.'],
  },
];

export const SPECS = [
  ['Precio', 'Gratis'],
  ['Licencia', 'MIT (código abierto)'],
  ['Versión', '2.5.0'],
  ['Plataforma', 'Windows 10/11 x64/ARM64 · Linux x64/ARM64 (Ubuntu 22.04+) · macOS 13+ (versión preliminar)'],
  ['Funciona sin conexión', 'Sí, los archivos nunca salen de tu PC'],
  ['Formatos', '255 en 18 categorías'],
  ['Integrados', '147 formatos, sin nada más que instalar'],
  ['Motores opcionales', 'FFmpeg, LibreOffice, Calibre, Ghostscript y Pandoc'],
  ['Línea de comandos', 'filee convert y filee watch, añadidos al PATH por el instalador'],
  ['Idiomas', 'English, Español, 日本語, 한국어, 简体中文, 繁體中文, Polski, हिन्दी, Русский, العربية, Português (Brasil), Français, नेपाली, ไทย, Türkçe, Português (Portugal), Deutsch, Italiano, Bahasa Indonesia, Tiếng Việt, বাংলা (বাংলাদেশ) y فارسی'],
  ['Actualizaciones', 'Se instalan desde la propia aplicación con un clic; cada una indica si es obligatoria, recomendada u opcional'],
];

export const MARQUEE_A = ['JPG', 'PNG', 'HEIC', 'WEBP', 'AVIF', 'PSD', 'CR2', 'SVG', 'PDF', 'DOCX', 'HWP', 'HWPX', 'XLSX', 'CSV', 'PPTX', 'TXT', 'Markdown', 'EPUB', 'MOBI', 'MP4'];
export const MARQUEE_B = ['MOV', 'MKV', 'WEBM', 'MP3', 'WAV', 'FLAC', 'M4A', 'SRT', 'JSON', 'ZIP', 'RAR', '7Z', 'DWG', 'DXF', 'STL', 'TTF', 'WOFF2', 'GIF', 'ICO'];

export const DOWNLOADS = [
  { value: 'win-x64', label: 'Windows 10/11 · x64', file: `Filee-${VERSION}-win-Setup.exe`, status: `Windows 10/11 · x64 · v${VERSION} · 143 MB`, cta: 'Descargar para Windows' },
  { value: 'win-arm64', label: 'Windows 10/11 · ARM64', file: `Filee-${VERSION}-win-arm64-Setup.exe`, status: `Windows 10/11 · ARM64 · v${VERSION} · 141 MB`, cta: 'Descargar para Windows on Arm' },
  { value: 'linux-x64', label: 'Linux · x64', file: `Filee-${VERSION}-linux-x64.tar.gz`, status: `Linux · x64 · v${VERSION} · 138 MB`, cta: 'Descargar para Linux', archive: true },
  { value: 'linux-arm64', label: 'Linux · ARM64', file: `Filee-${VERSION}-linux-arm64.tar.gz`, status: `Linux · ARM64 · v${VERSION} · 137 MB`, cta: 'Descargar para Linux', archive: true },
  { value: 'osx-arm64', label: 'macOS · Apple Silicon (ARM64)', file: `Filee-${VERSION}-osx-arm64.tar.gz`, status: `macOS · Apple Silicon · v${VERSION} · 140 MB`, cta: 'Descargar para macOS', archive: true, mac: true },
  { value: 'osx-x64', label: 'macOS · Intel (x64)', file: `Filee-${VERSION}-osx-x64.tar.gz`, status: `macOS · Intel · v${VERSION} · 142 MB`, cta: 'Descargar para macOS', archive: true, mac: true },
];

// Formatos del menú circular de la demo (por tipo de archivo).
export const DONUT_FORMATS = {
  image: ['JPG', 'PNG', 'WEBP', 'PDF', 'AVIF', 'ICO'],
  video: ['MP4', 'WEBM', 'GIF', 'MP3', 'M4V'],
  doc: ['PDF', 'TXT', 'MD', 'HTML', 'DOCX'],
};

export const DEMO_FILES = [
  { name: 'viaje.heic', type: 'heic', kind: 'image' },
  { name: 'clip.mov', type: 'mov', kind: 'video' },
  { name: 'informe.docx', type: 'docx', kind: 'doc' },
];
