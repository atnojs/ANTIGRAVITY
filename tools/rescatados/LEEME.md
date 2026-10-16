# Restos

Material rescatado de sitios raros: ficheros que aparecieron donde no tocaba y
que **no se borran** (podrían ser trabajo de Antonio) pero tampoco se publican.

No se versiona nada de aquí (está en `.gitignore`). Si alguno resulta útil, se
mueve a su sitio y se documenta; si no, se borra cuando haya certeza.

## 2026-10-16 — `2026-10-16_edita-como-un-pro_app-compilada.js`

- **De dónde salió:** `apps/dev/null` (una carpeta `apps/dev/` que solo contenía
  ese fichero, llamado `null` por una redirección mal hecha).
- **Qué es:** el **bundle compilado** de una app React de generación/edición de
  imágenes con Nano Banana — «Edita como un Pro» —, con dos modos («Editar
  Imagen» y «Generar Imágenes»), 8 modelos (`openai-medium`…`max-sunburst`,
  `gemini-flash/pro`, `qwen-pro`) y selectores de proporción.
- **Detalles:** 648 líneas, 50.898 bytes,
  sha256 `4207C7B46A61538B6D53D25472DF079D93CE6DBDA5717660BA32FA2F43120AF6`.
  Es **contenido único** (ningún otro fichero del repo tiene ese tamaño ni ese
  hash), pero es una **variante de una familia que ya existe**: «Edita como un
  Pro» aparece en otras 10 apps (`editar_imagen`, `imagenes_ia/editar`,
  `editar_generar_1`, `generar`, `aura-edit`…).
- **No tiene clave incrustada:** llama a `./proxy.php`, el patrón bueno del
  proyecto. Se guardó aquí porque está **compilado** (no hay fuentes) y no se
  sabía de qué app era copia.
- **Decisión pendiente:** si Antonio lo reconoce como una app suya que quiere
  viva, se monta como `apps/<nombre>/` con su `index.html` y su `proxy.php`; si
  no, se borra.
