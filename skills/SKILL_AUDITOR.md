---
name: auditor-lighthouse-accesibilidad
description: "Activa este skill de forma obligatoria como control de calidad técnico final antes de dar por completado un desarrollo o edición en una aplicación web."
---

# Auditor Técnico y de Accesibilidad WCAG 2.1

## Objetivo

Auditar una aplicación web antes de entregar, revisando rendimiento, SEO, accesibilidad WCAG 2.1 A/AA, contraste, navegación por teclado y compatibilidad con lectores de pantalla.

## Inputs esperados

- `html_file`: ruta del archivo HTML, JSX o TSX principal a auditar.
- `css_file`: ruta del archivo CSS de estilos asociado.

---

## Sección A: Rendimiento ⚡

| # | Item | Cómo verificar |
|---|------|----------------|
| 1 | Imágenes con `loading="lazy"` bajo el fold | Buscar `<img>` sin `loading="lazy"` |
| 2 | Imágenes optimizadas (WebP/AVIF o comprimidas) | No imágenes >500KB sin justificación |
| 3 | Scripts con `defer` o al final de `<body>` | Buscar `<script>` en `<head>` sin `defer` |
| 4 | CSS crítico inline o cargado eficientemente | No CSS enorme bloqueante en `<head>` |
| 5 | Sin recursos externos innecesarios | Cada CDN/font/librería externa justificada |
| 6 | Animaciones GPU-friendly (`transform`/`opacity`) | No animar `box-shadow` ni `width`/`height` |
| 7 | Sin `console.log` en producción | Buscar `console.log` y eliminar |

## Sección B: SEO 🔎

| # | Item | Cómo verificar |
|---|------|----------------|
| 1 | `<title>` descriptivo y único (máx 60 chars) | No "Document", no vacío |
| 2 | `<meta name="description">` (120-160 chars) | Descripción compelling |
| 3 | Un solo `<h1>`, jerarquía lógica h1→h2→h3 | No saltar niveles |
| 4 | HTML5 semántico: `<header>`, `<main>`, `<nav>`, `<footer>` | Al menos `<main>` presente |
| 5 | `alt` en todas las `<img>` | Descriptivo, no vacío salvo decorativas |
| 6 | `<meta name="viewport">` presente | `width=device-width, initial-scale=1` |
| 7 | `<html lang="es">` declarado | Primer atributo del tag html |
| 8 | `<meta charset="UTF-8">` como primer hijo de `<head>` | Obligatorio |
| 9 | Favicon presente | `<link rel="icon">` |
| 10 | Links externos con `rel="noopener noreferrer"` | Si hay `target="_blank"` |
| 11 | Sin librerías CDN sin usar | Verificar cada `<script src>` y `<link>` |

## Sección C: Contraste y Color 🎨

Usar la tabla pre-calculada contra fondo `#041847`:

| Color | Hex | Ratio | Normal (4.5:1) | Grande (3:1) |
|-------|-----|------:|:---:|:---:|
| Blanco | `#FFFFFF` | 14.8:1 | ✅ | ✅ |
| Acento Cyan | `#22d3ee` | 9.2:1 | ✅ | ✅ |
| Neón Cyan | `#2ee8ff` | 10.1:1 | ✅ | ✅ |
| Acento Purple | `#a78bfa` | 5.4:1 | ✅ | ✅ |
| Neón Pink | `#ff4ecd` | 5.7:1 | ✅ | ✅ |
| Gris claro | `#94a3b8` | 5.1:1 | ✅ | ✅ |
| Gris medio | `#64748b` | 3.3:1 | ❌ | ✅ |

> ⚠️ **`#64748b` sobre fondo oscuro falla contraste.** Sustituir automáticamente por `#94a3b8`.
> ⚠️ **Texto sobre glass panels**: usar siempre blanco `#FFFFFF` o cyan `#22d3ee`.

Reglas adicionales:
- No transmitir información solo por color (usar icono + texto).
- Focus visible no depende solo de color (usar outline).

## Sección D: Navegación por Teclado ⌨️

| # | Item | Cómo verificar |
|---|------|----------------|
| 1 | Todo interactivo alcanzable con Tab | Probar: Tab por toda la página |
| 2 | Orden de Tab lógico (izq→der, arriba→abajo) | No `tabindex` positivos. Orden DOM = orden Tab |
| 3 | `:focus-visible` con outline visible | `outline: 2px solid #22d3ee; outline-offset: 2px;` |
| 4 | Modales atrapan el foco (focus trap) | Tab no sale del modal abierto |
| 5 | Escape cierra modales/overlays | `keydown` listener para Escape |
| 6 | Skip-to-content (si hay nav extensa) | Primer elemento focusable |

**CSS para skip-link:**
```css
.skip-link {
    position: absolute;
    top: -100%;
    left: 0;
    padding: 0.5rem 1rem;
    background: var(--neon-cyan, #22d3ee);
    color: #041847;
    font-weight: 600;
    z-index: 99999;
    transition: top 0.2s;
}
.skip-link:focus { top: 0; }
```

## Sección E: Imágenes y Multimedia 🖼️

| # | Item | Cómo verificar |
|---|------|----------------|
| 1 | Todas las `<img>` tienen `alt` descriptivo | "Foto de un paisaje montañoso" |
| 2 | Imágenes decorativas: `alt=""` + `aria-hidden="true"` | Iconos, separadores, fondos |
| 3 | Iconos sin texto: `aria-label` en el botón | `<button aria-label="Cerrar"><svg>...</svg></button>` |
| 4 | Videos con subtítulos (si aplica) | `<track kind="subtitles">` o texto alternativo |

## Sección F: Formularios 📝

| # | Item | Cómo verificar |
|---|------|----------------|
| 1 | Cada `<input>` tiene `<label>` asociado | `<label for="id">` o `aria-label` |
| 2 | Campos requeridos: `aria-required="true"` | No solo asterisco visual |
| 3 | Errores con `aria-live="polite"` | Zona de errores actualizable |
| 4 | Placeholders NO sustituyen labels | El placeholder desaparece al escribir |
| 5 | `autocomplete` en campos comunes | `autocomplete="email"`, `"name"`, etc. |
| 6 | `<button>` para acciones, `<a>` para navegación | No `<div onclick>` como botón |
| 7 | IDs únicos en elementos interactivos | No IDs duplicados |

## Sección G: Contenido Dinámico (IA) 🤖

| # | Item | Cómo verificar |
|---|------|----------------|
| 1 | `aria-live="polite"` en zonas de resultados | El lector anuncia nuevos resultados |
| 2 | Estado de carga: `aria-busy="true"` | En el contenedor mientras carga |
| 3 | Botón disabled: `aria-disabled="true"` | Además de atributo HTML `disabled` |
| 4 | Lightbox: foco se mueve al abrir, vuelve al cerrar | Focus management con `.focus()` |
| 5 | La app debe tener estado visual "PROCESANDO..." | Botón + spinner + overlay (ver `style_guide_skill`) |

---

## Workflow de Auditoría

```
1.  ABRIR la app en navegador
2.  REVISAR Rendimiento (Sección A) — 7 items
3.  REVISAR SEO (Sección B) — 11 items
4.  VERIFICAR Contraste con tabla pre-calculada (Sección C)
5.  PROBAR Navegación por Teclado (Sección D) — Tab, Escape, focus
6.  AUDITAR Imágenes y Multimedia (Sección E)
7.  VERIFICAR Formularios si existen (Sección F)
8.  VERIFICAR Contenido Dinámico si la app usa IA (Sección G)
9.  LISTAR problemas encontrados priorizados
10. CORREGIR directamente en el código
11. RE-PROBAR en navegador (Tab completo + visual)
12. REPORTAR resultado
```

## Criterio de Salida

- Secciones A-D: **100% items resueltos** (obligatorio).
- Sección E: **100%** (obligatorio).
- Sección F: **100%** si hay formularios, N/A si no.
- Sección G: **100%** si la app usa IA/contenido dinámico, N/A si no.
- Excepciones documentadas en el reporte.

## Output (Formato)

```
### Auditoría Lighthouse & Accesibilidad 🔍♿

- Rendimiento: 7/7 ✅
- SEO: 11/11 ✅
- Contraste: 4/4 ✅
- Teclado: 6/6 ✅
- Imágenes: 3/3 ✅ (1 N/A: no hay video)
- Formularios: 5/5 ✅
- Contenido Dinámico: 5/5 ✅

- Correcciones aplicadas:
  1. Añadido `defer` a 2 scripts
  2. Eliminados 3 `console.log`
  3. Añadido `<meta description>`
  4. Cambiado `#64748b` → `#94a3b8` en textos
  5. Añadido `aria-label` a 3 botones iconográficos
  6. Añadido `:focus-visible` global
  7. Añadido `aria-live="polite"` al contenedor de resultados

- Archivos modificados: index.html, app.css
```

## Reglas críticas

- No cambies el diseño visual salvo que sea necesario por contraste o accesibilidad.
- No elimines estilos funcionales.
- No introduzcas dependencias nuevas salvo petición expresa.
- Prioriza cambios seguros y mínimos.
- Si hay errores en consola que no son del código (extensiones del navegador), ignorarlos y documentar.
