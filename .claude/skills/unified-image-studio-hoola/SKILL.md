---
name: unified-image-studio-hoola
description: "Manual de uso de la app Unified Image Studio · Hoola: convierte una pregunta de Antonio («¿cómo genero…?», «¿dónde está…?», «no me sale…») en un paso a paso exacto sobre su interfaz real. Actívala con cualquier duda de manejo de esa app (generar, editar, máscara, quitar fondo, recortar, texto, logo, escenario, prenda, vídeo, biblioteca, exportar, guardar/versiones/proyectos, contraseña o compuerta de modelos) y cuando pida «explícame cómo se hace», «dame los pasos» o «¿por qué no me deja?». No sirve para modificar la app: para eso, `crear` + `cirujano-codigo-produccion`."
---

# Unified Image Studio · Hoola — puntero

El texto íntegro de esta skill vive en **`skills/SKILL_unified-image-studio-hoola.md`** (relativo a
la raíz del proyecto). Léelo y aplícalo tal cual: contiene el mapa completo de la interfaz, los 16
flujos paso a paso, la tabla de modelos y los errores con su mensaje literal.

Resumen operativo:

- App: `apps/unified-image-studio-hoola/` · publicada en
  `https://atnojs.es/apps/unified-image-studio-hoola/` · build `3.0.0-hoola`.
- Tres modos: **Imagen / Vídeo / Biblioteca**. Seis pestañas de herramientas: **Generar, Editar,
  Componer, Producto, Utilidades, Ayuda**. Panel derecho: **Capas, Referencias, Biblioteca, Recetas**.
- Sin contraseña de acceso (`PW_ACCESS`) se edita y se exporta, pero **no se genera**. Los modelos
  caros piden la contraseña otra vez (compuerta).
- Flow necesita **sesión + PC del agente encendido**; IMAGE 2 LOW/MEDIUM y los Flow no piden
  contraseña extra, el resto sí.
- Límites: prompt 12.000 caracteres (vídeo 1.500), archivo 20 MB, 8192 px de lado, 120 capas,
  8 referencias, 1–4 imágenes por encolado (solo Flow).
- Con Flow solo existen las proporciones `1:1`, `16:9`, `4:3`, `3:4` y `9:16`; el resto cae a `1:1`.

Si hay que cambiar el procedimiento (etiquetas, límites, modelos), se cambia SOLO en
`skills/SKILL_unified-image-studio-hoola.md`. Si hay que cambiar la app, no es esta skill:
`crear` + `cirujano-codigo-produccion`.
