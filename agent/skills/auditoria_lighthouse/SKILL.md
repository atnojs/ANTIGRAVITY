---
name: auditoria-lighthouse
description: Audita rendimiento, SEO y buenas prácticas de una app/web antes de entregarla. Úsala como paso final en creación o edición para garantizar calidad técnica.
---

# 🔍 Auditoría Lighthouse: Calidad Técnica Sin Excusas

Skill que verifica rendimiento, SEO y buenas prácticas usando un checklist manual riguroso. Se ejecuta **antes de entregar** cualquier app/web, tanto en creación como en edición.

## Cuándo Usar
- Al terminar de crear una app (último paso de `crear`).
- Al terminar una edición significativa (último paso de `editar`).
- Cuando el usuario pida "revisar rendimiento" o "optimizar".
- Antes de publicar o enseñar a un cliente.

## Checklist de Auditoría (Orden Fijo)

### A) Rendimiento ⚡

| # | Item | Cómo verificar |
|---|------|-----------------|
| 1 | Imágenes optimizadas (WebP/AVIF o comprimidas) | Revisar `<img>` y assets. No imágenes >500KB sin justificación. |
| 2 | Scripts con `defer` o al final del `<body>` | Verificar que `<script>` no bloquea el render inicial. |
| 3 | CSS crítico inline o cargado eficientemente | No CSS enorme bloqueante en `<head>` sin necesidad. |
| 4 | No recursos externos innecesarios | Cada CDN/font/librería externa justificada. |
| 5 | Lazy loading en imágenes bajo el fold | Imágenes que no se ven al inicio deben tener `loading="lazy"`. |
| 6 | Sin animaciones pesadas (no `box-shadow` animado masivamente) | Las animaciones usan `transform`/`opacity` (GPU-friendly). |
| 7 | Sin console.log en producción | Buscar `console.log` y eliminar/comentar los de debug. |

### B) SEO 🔎

| # | Item | Cómo verificar |
|---|------|-----------------|
| 1 | `<title>` descriptivo y único | No "Document", no vacío, máx 60 caracteres. |
| 2 | `<meta name="description">` presente | Descripción compelling, 120-160 caracteres. |
| 3 | Un solo `<h1>` por página | Buscar todos los `<h1>`. Solo uno. |
| 4 | Jerarquía de headings lógica | h1 → h2 → h3. No saltar niveles. |
| 5 | HTML5 semántico | Usar `<header>`, `<main>`, `<nav>`, `<footer>`, `<section>`, `<article>` donde aplique. |
| 6 | `alt` en todas las `<img>` | Sin `alt` es penalización directa. |
| 7 | `<meta name="viewport">` presente | `width=device-width, initial-scale=1`. |
| 8 | `<html lang="es">` (o idioma correspondiente) | Debe coincidir con el idioma del contenido. |

### C) Buenas Prácticas ✅

| # | Item | Cómo verificar |
|---|------|-----------------|
| 1 | Sin errores en consola del navegador | Abrir DevTools → Console. Cero errores rojos. |
| 2 | Sin warnings críticos en consola | Warnings de deprecación o seguridad deben resolverse. |
| 3 | Favicon presente | `<link rel="icon">` definido. |
| 4 | IDs únicos en elementos interactivos | No IDs duplicados. Cada botón/input con ID descriptivo. |
| 5 | Links externos con `rel="noopener noreferrer"` | Si hay `target="_blank"`, añadir rel de seguridad. |
| 6 | No librerías sin usar | Verificar que cada `<script src>` y `<link>` CDN se usa realmente. |
| 7 | Charset declarado | `<meta charset="UTF-8">` como primer hijo de `<head>`. |

## Workflow

```
1. ABRIR la app en el navegador (browser_subagent)
2. VERIFICAR cada sección del checklist (A, B, C) en orden
3. LISTAR problemas encontrados (prioridad: Rendimiento > SEO > Prácticas)
4. CORREGIR los problemas directamente en el código
5. RE-VERIFICAR en navegador que los cambios no rompieron nada
6. REPORTAR: "Auditoría completada: X/Y items OK. Correcciones aplicadas: [lista]"
```

## Criterio de Salida

- **Todos los items** del checklist deben estar ✅ resueltos.
- Si algún item no se puede resolver (ej: imágenes generadas dinámicamente no pueden tener `alt` estático), **documentar la excepción** en el reporte final.
- Si hay errores en consola que no son del código (ej: extensiones del navegador), ignorarlos y documentar.

## Output (Formato)

```
### Auditoría Lighthouse ✅
- Rendimiento: 7/7 ✅
- SEO: 8/8 ✅  
- Buenas Prácticas: 7/7 ✅
- Correcciones aplicadas:
  1. Añadido `defer` a scripts
  2. Eliminados 3 `console.log` de debug
  3. Añadido `<meta description>`
```
