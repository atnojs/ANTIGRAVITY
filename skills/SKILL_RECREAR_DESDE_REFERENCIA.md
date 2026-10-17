---
name: recrear-desde-referencia
description: "Úsala cuando el usuario aporte una captura, un Dribbble, una landing o un mockup y quiera recrearlo como código real: extrae el sistema de diseño de la referencia, lo mapea a los tokens de la marca hoola, construye y verifica con capturas y Playwright. No copia la referencia al píxel ni reproduce assets, logos o textos ajenos."
---

# Recrear una interfaz desde una referencia visual

## Cuándo

Antonio pasa una imagen (captura de una web, un diseño de Dribbble/Behance, un mockup) y pide
"hazme esto", "clóname esta landing" o "recrea este diseño". También cuando una app existente
quiere parecerse a una referencia concreta.

## Reglas duras

- **La marca manda salvo petición expresa.** El resultado usa la estética hoola/relatos
  (cian `#00D0D0`, verde `#26C626`, Electrolize, glassmorphism, `style-guide-antigravity`).
  De la referencia se copia el **sistema** (jerarquía, ritmo, densidad, patrón de layout), no
  los colores ni la tipografía si chocan con la marca. Si Antonio pide el look exacto, se
  avisa de la desviación de marca y se decide juntos.
- **No se copian assets ajenos:** ni fotos, ni logos, ni ilustraciones, ni textos de la
  referencia. Se sustituyen por material propio: imágenes generadas con **OpenAI image 2**
  (`openai-image-2-low`) y copy nuevo en español. Nada de descargar la imagen de la referencia
  para usarla en la app.
- **Nada de pixel-perfect ni OCR de textos largos.** Se replica la lógica de diseño; los
  textos se reescriben en español y con la voz del proyecto.
- **No se versionan las capturas de referencia** si son de terceros: viven en `tools/`
  (protegida) y se borran al terminar; en la entrega se describe qué se copió y qué no.

## Flujo

1. **Guardar la referencia** en `tools/` con nombre descriptivo (`ref_<nombre>.png`) y medir
   su viewport/relación de aspecto. No tocar la app todavía.
2. **Analizarla como sistema**, no como dibujo. Con `analista-visual-pro`, extraer y escribir:
   - paleta (superficies, texto, acento, acción primaria) y contraste;
   - tipografía: familia/feeling, saltos de escala, pesos, display vs cuerpo;
   - espaciado: unidad base, ritmo entre secciones, padding de tarjetas;
   - radios, bordes, sombras y profundidad;
   - arquetipo de layout (hero centrado, split asimétrico, bento, editorial) y secuencia de secciones;
   - componentes repetidos y estados (hover, foco, loading, vacío, error);
   - movimiento implícito (2-3 gestos, no una lista infinita).
3. **Mapear a tokens hoola.** Escribir la tabla "referencia → token del proyecto → desviación
   decidida". Si algo no encaja en la marca, se decide y se documenta; no se improvisa al
   final. Tokens en CSS variables (`--bg`, `--panel`, `--cyan`, `--green`, `--text`, `--radius`,
   `--space-*`), nunca hex sueltos por el CSS.
4. **Construir mobile-first** con la estructura canónica del proyecto (una sola página o app en
   `apps/<nombre>/`, `proxy.php` si hay IA, `history.php` si hay historial). Componentes con sus
   8 estados, texto real en español, imágenes `width`/`height`, `loading="lazy"` y `alt`.
5. **Verificar la construcción** con `verificacion-playwright`: abrir la URL, recorrer el flujo,
   consola y red, y capturas a 1440/768/393. Con `capturas-verificacion`, comparar la referencia
   y el resultado **lado a lado** en una sola imagen etiquetada y medir lo que se dijo que se
   copiaba (anchos, líneas, ritmo).
6. **Auditar** con `auditor-lighthouse-accesibilidad` (incluida la sección H, Web Interface
   Guidelines). Corregir y repetir.
7. **Entregar** con: tabla de tokens, captura comparativa referencia/resultado, qué se copió
   del sistema y qué se cambió por marca o por derechos, y limitaciones.

## Checklist de salida

- [ ] Tabla de tokens extraídos y su mapeo a la marca (con desviaciones justificadas).
- [ ] Cero assets, logos o textos copiados de la referencia.
- [ ] Imágenes propias generadas con `openai-image-2-low`.
- [ ] Responsive comprobado a 1440/768/393 con capturas.
- [ ] Flujo interactivo probado con `verificacion-playwright` (consola y red incluidas).
- [ ] Auditoría A-G + H sin fallos dentro del alcance.
- [ ] Comparativa referencia vs resultado adjunta en la respuesta.
- [ ] Referencia temporal borrada de `tools/` y `git status` sin restos.

## Errores que ya se han cometido (no repetir)

- Copiar la paleta de la referencia "porque queda bien" y romper la marca: la marca es el
  contrato del proyecto.
- Recrear el hero con la foto de la referencia: es material de terceros y además arrastra
  derechos. Se genera una imagen propia.
- Dar por buena la recreación sin abrirla: la comprobación es en navegador, con capturas.
