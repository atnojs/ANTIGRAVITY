---
description: Convierte la transcripción de un vídeo en una web de documentación premium con estilo Neon Glassmorphism.
---

Este flujo de trabajo guía el proceso de transformar una transcripción de vídeo (con marcas de tiempo y texto crudo) en un tutorial web estructurado, profesional y visualmente impresionante.

### Pasos a seguir:

1. **Análisis de Contenido**:
   - Lee la transcripción y extrae los capítulos o secciones principales.
   - Identifica atajos de teclado (shortcuts), comandos de terminal, nombres de archivos y arquitecturas (ej: MVC) mencionados.
   - Localiza consejos (tips), advertencias de seguridad y pasos de prácticas de programación.

2. **Configuración del Diseño**:
   - Accede a la carpeta `_style_guide` para obtener los tokens de diseño (colores, fuentes, efectos glass).
   - Crea un archivo `style.css` que consolide estos estilos, adaptándolos a una estructura de documentación (sidebar fijo, contenido centralizado).
   - Asegura que el diseño sea responsivo desde el inicio.

3. **Estructura Semántica (index.html)**:
   - Usa etiquetas HTML5: `<header>`, `<nav>`, `<main>`, `<section>`, `<aside>`, `<footer>`.
   - Implementa un menú lateral (`aside`) con enlaces internos (anclas) a cada capítulo.
   - Utiliza tarjetas (`.card.glass`) para agrupar el contenido de cada sección.

4. **Desarrollo del Tutorial**:
   - **Introducción**: Resume el objetivo del curso y a quién va dirigido.
   - **Secciones Técnicas**: Convierte explicaciones largas en listas de pasos (`.step-list`) o bloques de código (`<code>`).
   - **Contexto**: Añade bloques de consejos (`.tip-box`) y advertencias (`.warning-box`) donde sea relevante.
   - **Interactividad**: Añade JavaScript para:
     - *Smooth Scrolling*: Desplazamiento suave al hacer clic en el menú.
     - *Active Highlighting*: Resaltar automáticamente la sección actual en el menú mientras el usuario hace scroll.

5. **Profundización Técnica**:
   - No te limites a resumir. Si el vídeo menciona un flujo (ej: debugging), detalla sus fases (Investigación -> Resolución -> Limpieza).
   - Destaca menciones especiales como `@terminal`, `@file` o archivos de configuración.

6. **Verificación y Pulido**:
   - Usa un sub-agente de navegador para verificar:
     - Legibilidad y contraste.
     - Funcionamiento de todos los enlaces del menú.
     - Adaptabilidad en móviles (viewport 375px).
   - Corrige cualquier desajuste visual antes de entregar.

7. **Entrega Final**:
   - Crea un `walkthrough.md` con capturas o grabaciones que demuestren el funcionamiento y el diseño premium del sitio.
