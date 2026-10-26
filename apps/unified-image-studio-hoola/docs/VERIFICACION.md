# Verificación — Unified Image Studio · Hoola

Fecha: 2026-10-26 · Build: `3.0.0-hoola` · Original intacto en `apps/unified-image-studio/`.

Esta versión **no es un rediseño parcial**: es una copia completa del código actual del original
(con Google Flow, la compuerta de modelos y la cancelación de trabajos) sobre la que se aplica el
sistema visual Hoola/Relatos al 100 %. Lo que se verifica aquí es que la copia arranca, conserva
todas las funciones, aplica de verdad los tokens Hoola y no rompe el flujo ni la responsividad.

## 1. Entorno de prueba

| Elemento | Valor |
|---|---|
| Servidor local | Node 24 (estático) sirviendo `apps/`; `*.php` responde 503 para forzar el modo local |
| Navegador | Chrome real (headless) manejado por CDP, perfil propio |
| URL local | `http://127.0.0.1:8781/unified-image-studio-hoola/index.html` |
| URL producción | `https://atnojs.es/apps/unified-image-studio-hoola/` |
| Evidencias | `tools/evidencias/2026-10-26-uis-hoola-v3/` |

## 2. Pruebas funcionales locales (12/12)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Arranque y sello de versión | PASS · `v3.0.0 · 2026-10-26 · copia Hoola al 100%` |
| 2 | Compuerta de modelos cargada | PASS · Model Gate 1.2.0, **12 candados** exactos |
| 3 | Electrolize en toda la interfaz | PASS · `document.fonts.check('12px Electrolize')` |
| 4 | Fondo Hoola medido | PASS · degradado `rgb(0,16,24) → rgb(6,47,67) → rgb(14,83,104)` + rejilla `46px 46px` |
| 5 | Sin errores de arranque | PASS · `__UIS_DIAG__.problems` vacío |
| 6 | IMAGE 2 LOW libre | PASS · se selecciona sin modal |
| 7 | OPENAI 2.5 MEDIUM protegido | PASS · modal «Modelo protegido», no cambia la selección |
| 8 | Desbloqueo con el código de modelos | PASS · MEDIUM activo, 0 candados |
| 9 | El desbloqueo persiste al recargar | PASS · `sessionStorage` y 0 candados |
| 10 | Pestaña de vídeo | PASS · `data-mode=video`, modelos y fotograma presentes |
| 11 | Biblioteca | PASS · filtros y contenedor de trabajos |
| 12 | Pestaña nueva: VEO 3.1 QUALITY | PASS · vuelve a pedir contraseña con 12 candados |

## 3. Estilo Hoola: medidas y capturas

| Comprobación | Medida / evidencia |
|---|---|
| Barra superior | 56 px de alto, vidrio con borde inferior cian de 2 px |
| Paneles | 322 px (izquierdo) y 336 px (derecho) a 1422 px de ventana; borde cian de separación |
| Navegación Imagen/Vídeo/Biblioteca | 304 × 34 px, píldora de vidrio; activo con gradiente `#174F7A → #00D0D0` |
| Lienzo | 622 × 622 px a 1422; sin scroll horizontal (`scrollWidth == innerWidth`) |
| 390 y 768 px | `scrollWidth == innerWidth`; panel móvil superpuesto; sin desbordes |
| Overlay de carga | Tres aros, fondo translúcido con blur, título «IA generando lo solicitado...», barra indeterminada cian→verde |
| Modales | Acceso privado, compuerta y ayuda en vidrio azulado con borde cian y botón primario cian→verde |

Capturas: `01-hoola-escritorio.png`, `02-hoola-video.png`, `03-hoola-biblioteca.png`,
`04-hoola-ayuda.png`, `05-hoola-movil.png`, `06-hoola-tablet.png`, `07-hoola-carga.png`,
`08-hoola-acceso.png`, `09-hoola-compuerta.png`, `10-hoola-ayuda.png`,
`11-hoola-biblioteca-vacia.png`.

## 4. Producción

Pendiente de completar tras el despliegue de este commit: comprobación de `index.html` servido,
`api.php?action=state`, CSP y fuentes, y repetición del flujo de compuerta y pestañas sobre la URL
real.

## 5. Límites declarados

- No hay PHP en el equipo de desarrollo de esta ronda: las pruebas locales cubren interfaz, estilo,
  compuerta y navegación; la API se comprueba en producción (copia literal del backend del original).
- La generación real con Flow depende de un agente encendido en el PC de Flow; no se lanzaron
  generaciones (coste real).
- La base SQLite es propia de esta copia: no comparte proyectos con el original.
