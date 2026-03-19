---
name: accesibilidad
description: Verifica y corrige accesibilidad WCAG 2.1 (nivel A/AA) en apps/webs. Úsala como paso final en creación o edición para garantizar que la app sea usable por todos.
---

# ♿ Accesibilidad: Apps Para Todos

Skill que garantiza que cada app/web cumpla estándares de accesibilidad WCAG 2.1 nivel A/AA. Compatible con la estética **Neon Glassmorphism** del Style Guide.

## Cuándo Usar
- Al terminar de crear una app (último paso de `crear`, junto con Auditoría Lighthouse).
- Al terminar una edición significativa (último paso de `editar`).
- Cuando el usuario pida "revisar accesibilidad" o "hacer accesible".
- Antes de publicar una app profesional.

## Tabla de Contraste — Paleta Neon Glassmorphism

Ratios pre-calculados contra el fondo principal `#041847`:

| Color | Hex | Ratio vs #041847 | Texto Normal (4.5:1) | Texto Grande (3:1) |
|-------|-----|------------------:|:--------------------:|:-------------------:|
| Blanco | `#FFFFFF` | 14.8:1 | ✅ Pasa | ✅ Pasa |
| Accent Cyan | `#22d3ee` | 9.2:1 | ✅ Pasa | ✅ Pasa |
| Neon Cyan | `#2ee8ff` | 10.1:1 | ✅ Pasa | ✅ Pasa |
| Accent Purple | `#a78bfa` | 5.4:1 | ✅ Pasa | ✅ Pasa |
| Neon Pink | `#ff4ecd` | 5.7:1 | ✅ Pasa | ✅ Pasa |
| Gris claro | `#94a3b8` | 5.1:1 | ✅ Pasa | ✅ Pasa |
| Gris medio | `#64748b` | 3.3:1 | ❌ Falla | ✅ Pasa |
| Texto sobre glass* | `#FFFFFF` sobre `rgba(255,255,255,0.08)` | ~13.5:1 | ✅ Pasa | ✅ Pasa |

> [!IMPORTANT]
> **Cuidado con textos sobre glassmorphism**: El `backdrop-filter: blur()` hace que el contraste varíe según el fondo detrás del vidrio. Usar siempre texto blanco o cyan claro sobre glass panels.

## Checklist de Accesibilidad (Orden Fijo)

### A) Estructura Semántica 🏗️

| # | Item | Cómo verificar |
|---|------|-----------------|
| 1 | `<html lang="es">` declarado | Primer atributo del tag html. |
| 2 | Un solo `<h1>`, jerarquía h1→h2→h3 | No saltar niveles. |
| 3 | Landmarks: `<header>`, `<main>`, `<nav>`, `<footer>` | Al menos `<main>` presente siempre. |
| 4 | Listas semánticas para menús | `<ul>/<li>` para navegación, no divs sueltos. |
| 5 | `<button>` para acciones, `<a>` para navegación | No usar `<div onclick>` como botón. |

### B) Contraste y Color 🎨

| # | Item | Cómo verificar |
|---|------|-----------------|
| 1 | Texto normal: ratio ≥ 4.5:1 | Consultar tabla de contraste arriba. |
| 2 | Texto grande (≥18px bold, ≥24px regular): ratio ≥ 3:1 | Headings y botones. |
| 3 | No transmitir info solo por color | Error: rojo + icono/texto. Éxito: verde + icono/texto. |
| 4 | Focus visible no depende solo de color | Outline o borde + cambio de estilo. |

### C) Navegación por Teclado ⌨️

| # | Item | Cómo verificar |
|---|------|-----------------|
| 1 | Todo interactivo alcanzable con Tab | Probar: Tab por toda la página. ¿Se puede llegar a todo? |
| 2 | Orden de Tab lógico (izq→der, arriba→abajo) | No `tabindex` positivos. Orden del DOM = orden de Tab. |
| 3 | `:focus-visible` con outline visible | Estilo recomendado: `outline: 2px solid #22d3ee; outline-offset: 2px;` |
| 4 | Modales atrapan el foco (focus trap) | Tab no sale del modal mientras está abierto. |
| 5 | Escape cierra modales/overlays | `keydown` listener para Escape. |
| 6 | Skip-to-content link (si hay nav extensa) | Primer elemento focusable: `<a href="#main-content" class="skip-link">`. |

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
.skip-link:focus {
    top: 0;
}
```

### D) Imágenes y Multimedia 🖼️

| # | Item | Cómo verificar |
|---|------|-----------------|
| 1 | Todas las `<img>` tienen `alt` | Descriptivo: "Foto de un paisaje montañoso". |
| 2 | Imágenes decorativas: `alt=""` + `aria-hidden="true"` | Iconos, separadores, fondos. |
| 3 | Iconos sin texto tienen `aria-label` | `<button aria-label="Cerrar"><svg>...</svg></button>` |
| 4 | Videos con subtítulos (si aplica) | `<track kind="subtitles">` o texto alternativo. |

### E) Formularios 📝

| # | Item | Cómo verificar |
|---|------|-----------------|
| 1 | Cada `<input>` tiene `<label>` asociado | `<label for="inputId">` o `aria-label`. |
| 2 | Campos requeridos marcados con `aria-required="true"` | No solo asterisco visual. |
| 3 | Errores anunciados con `aria-live="polite"` | Zona de errores actualizable sin recarga. |
| 4 | Placeholders NO sustituyen labels | El placeholder desaparece al escribir. |
| 5 | `autocomplete` en campos comunes | `autocomplete="email"`, `autocomplete="name"`, etc. |

### F) Contenido Dinámico (Apps con IA) 🤖

| # | Item | Cómo verificar |
|---|------|-----------------|
| 1 | `aria-live="polite"` en zonas de resultados | Cuando la IA devuelve resultado, el lector lo anuncia. |
| 2 | Estado de carga anunciado | `aria-busy="true"` en el contenedor mientras carga. |
| 3 | Botón disabled tiene `aria-disabled="true"` | Además del atributo HTML `disabled`. |
| 4 | Lightbox: foco se mueve al abrirse, vuelve al cerrarse | Focus management con `element.focus()`. |

## Workflow

```
1. REVISAR estructura HTML para semántica (sección A)
2. VERIFICAR contraste con la tabla pre-calculada (sección B)
3. PROBAR navegación por teclado en el navegador (sección C)
4. AUDITAR imágenes y multimedia (sección D)
5. VERIFICAR formularios si existen (sección E)
6. VERIFICAR contenido dinámico si la app usa IA (sección F)
7. LISTAR problemas encontrados priorizados
8. CORREGIR directamente en el código
9. RE-PROBAR en navegador (Tab completo + visual)
10. REPORTAR resultado
```

## Reglas Especiales para Neon Glassmorphism

1. **Nunca** usar gris medio (`#64748b`) para texto normal sobre fondo oscuro — falla contraste.
2. **Siempre** que haya glass panel con `backdrop-filter`, usar texto blanco `#FFFFFF` o cyan `#22d3ee`.
3. **Focus outlines** en estilo neón: `outline: 2px solid #22d3ee; outline-offset: 2px;` — mantiene la estética.
4. **No eliminar** outlines de focus sin reemplazar por alternativa visible.

## Criterio de Salida

- Secciones A-D: **100% items resueltos** (obligatorio).
- Sección E: **100%** si hay formularios, N/A si no.
- Sección F: **100%** si la app usa IA/contenido dinámico, N/A si no.
- Excepciones documentadas en el reporte.

## Output (Formato)

```
### Accesibilidad ♿ ✅
- Semántica: 5/5 ✅
- Contraste: 4/4 ✅
- Teclado: 6/6 ✅
- Imágenes: 3/3 ✅ (1 N/A: no hay video)
- Formularios: N/A
- Contenido Dinámico: 4/4 ✅
- Correcciones aplicadas:
  1. Añadido `aria-label` a 3 botones iconográficos
  2. Añadido `:focus-visible` global
  3. Cambiado `<div onclick>` por `<button>` en 2 lugares
```
