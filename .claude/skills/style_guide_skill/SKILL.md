---
name: style-guide-antigravity
description: "Sistema de diseño Neon Glassmorphism completo. Activar al crear o editar apps para aplicar la estética Antigravity: fondos oscuros, acentos neón, efectos cristal, botones 3D y tipografía Montserrat/Poppins."
---

# Style Guide — Neon Glassmorphism

## Objetivo

Proporcionar un sistema de diseño completo para crear aplicaciones con estética **Neon Glassmorphism**: fondos oscuros, acentos brillantes, efectos de cristal desenfocado y tipografía premium.

## Recursos disponibles

Todos los archivos están en `resources/`:

| Archivo | Contenido |
|---------|-----------|
| `base.css` | Variables CSS, colores, gradientes, tipografía |
| `components.css` | Efectos glass, botones 3D, cards interactivas, inputs, alertas |
| `hover-effects.css` | Efectos hover animados (`.glass-hover`, `.btn-3d`) |
| `loaders.css` | Spinners, dots, pulse, skeleton, progress bar, `.loading-overlay` |
| `logins-modal.css` | Modal de login premium con overlay glass |
| `examples.css` | Snippets JSX/React listos para copiar |
| `index-templates.html` | Plantilla HTML base con todas las dependencias |

## Paleta de colores

```css
--bg1: #041847          /* Fondo oscuro principal */
--acc: #22d3ee          /* Acento cyan */
--acc2: #a78bfa         /* Acento purple */
--neon-cyan: #2ee8ff    /* Neón cyan brillante */
--neon-pink: #ff4ecd    /* Neón rosa */
```

### Tabla de contraste (contra fondo `#041847`)

| Color | Hex | Ratio | Texto normal (4.5:1) | Texto grande (3:1) |
|-------|-----|------:|:--------------------:|:-------------------:|
| Blanco | `#FFFFFF` | 14.8:1 | ✅ | ✅ |
| Acento Cyan | `#22d3ee` | 9.2:1 | ✅ | ✅ |
| Neón Cyan | `#2ee8ff` | 10.1:1 | ✅ | ✅ |
| Acento Purple | `#a78bfa` | 5.4:1 | ✅ | ✅ |
| Neón Pink | `#ff4ecd` | 5.7:1 | ✅ | ✅ |
| Gris claro | `#94a3b8` | 5.1:1 | ✅ | ✅ |
| Gris medio | `#64748b` | 3.3:1 | ❌ | ✅ |

> ⚠️ **Nunca usar `#64748b` para texto normal sobre fondo oscuro.** Sustituir por `#94a3b8`.

## Tipografía

- **Encabezados**: Montserrat (600-800)
- **Cuerpo**: Poppins (300-600)

## Uso al crear una app

1. Copiar `base.css` y `components.css` a la carpeta de la app
2. Copiar `hover-effects.css` y `loaders.css` si la app tiene carga asíncrona
3. Usar `index-templates.html` como base para el HTML
4. Aplicar las clases según el tipo de elemento

## Componentes principales

### Glassmorphism
```css
.glass        → Efecto cristal base
.glass-hover  → Cristal + hover interactivo
.glass-modal  → Para modales
```

### Botones
```css
.btn-3d        → Botón con efecto de luz deslizante
.btn-primary   → Botón principal con gradiente
.btn-secondary → Botón secundario
```

### Loaders
```css
.spinner, .spinner-double, .spinner-triple → Spinners circulares
.dots-loader   → Puntos rebotando
.pulse-loader  → Círculo pulsante
.progress-bar  → Barra de progreso
.skeleton      → Placeholder de carga
.loading-overlay → Overlay de pantalla completa con blur
```

### Loading Overlay (obligatorio para apps con IA)

**HTML/CSS puro:**
```html
<div class="loading-overlay hidden" id="loadingOverlay">
    <div class="spinner-triple">
        <div class="ring ring-1"></div>
        <div class="ring ring-2"></div>
        <div class="ring ring-3"></div>
    </div>
    <p class="loading-text">IA Generando Obra Maestra...</p>
</div>
```

**React/JSX:**
```jsx
{isProcessing && (
    <div className="loading-overlay">
        <div className="spinner-triple">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
        </div>
        <p className="loading-text">IA Generando Obra Maestra...</p>
    </div>
)}
```

## Reglas de diseño

1. **Fondo**: Siempre `#041847` o variante oscura derivada
2. **Texto sobre glass**: Usar blanco `#FFFFFF` o cyan `#22d3ee` (nunca gris medio)
3. **Focus outlines**: `outline: 2px solid #22d3ee; outline-offset: 2px;` — mantiene la estética neón
4. **No eliminar outlines** de focus sin reemplazar por alternativa visible
5. **Animaciones GPU-friendly**: usar solo `transform` y `opacity`, evitar animar `box-shadow`
6. **Glass con blur**: `background: rgba(0,0,0,0.30)` + `backdrop-filter: blur(4px)`
7. **Formato exportación imágenes**: siempre `.jpg` para compatibilidad con visores del sistema
