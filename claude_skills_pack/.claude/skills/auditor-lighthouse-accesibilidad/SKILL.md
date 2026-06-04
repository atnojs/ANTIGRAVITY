---
name: auditor-lighthouse-accesibilidad
description: "Activa este skill de forma obligatoria como control de calidad técnico final antes de dar por completado un desarrollo o edición en una aplicación web."
---

# Auditor Técnico y de Accesibilidad WCAG 2.1

## Objetivo

Auditar una aplicación web antes de dar por completado un desarrollo o una edición, revisando rendimiento, accesibilidad, SEO técnico básico, contraste y compatibilidad con lectores de pantalla.

## Inputs esperados

- `html_file`: ruta del archivo HTML, JSX o TSX principal a auditar.
- `css_file`: ruta del archivo CSS de estilos asociado.

## 1. Verificación automática de rendimiento y SEO

Analiza el código de los archivos de entrada y marca como `FAIL` si detectas cualquiera de estos problemas:

- Imágenes `<img>` sin atributo `loading="lazy"`.
- Imágenes `<img>` sin atributo `alt`.
- Llamadas activas a `console.log()` en bloques de producción.
- Más de una etiqueta `<h1>` en el árbol semántico del DOM.
- Scripts situados en el `<head>` sin atributo `defer`.

## 2. Validación de contraste en interfaces Glassmorphism

Revisa la paleta de colores CSS contra el fondo base:

```text
#041847
```

Ratios mínimos exigidos:

- Texto normal:
  - `#FFFFFF`
  - `#22d3ee`
  - `#a78bfa`

## 3. Restricción crítica de contraste

Si se detecta el color gris medio:

```text
#64748b
```

sobre fondo oscuro, sustitúyelo por:

```text
#94a3b8
```

para mejorar la legibilidad y cumplir contraste mínimo para texto normal.

## 4. Atributos ARIA para contenido dinámico de IA

Busca contenedores donde el cliente renderice outputs dinámicos de modelos de IA e inyecta los atributos ARIA necesarios.

### Contenedor de resultados

Añade:

```html
aria-live="polite"
```

### Estado de carga

Mientras dure el estado de carga, añade dinámicamente:

```html
aria-busy="true"
```

Cuando termine la carga, debe volver a:

```html
aria-busy="false"
```

## 5. Resultado esperado de auditoría

Devuelve un informe breve con:

```text
PASS / FAIL
Problemas encontrados
Correcciones aplicadas
Correcciones pendientes
Archivos modificados
```

## 6. Reglas críticas

- No cambies el diseño visual salvo que sea necesario por contraste o accesibilidad.
- No elimines estilos funcionales.
- No introduzcas dependencias nuevas salvo petición expresa.
- Prioriza cambios seguros y mínimos.
