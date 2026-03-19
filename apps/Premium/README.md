# 🎨 Guía de Estilo - Neon Glassmorphism

Sistema de diseño completo para crear apps/webs con estilo **Neon Glassmorphism**.

## 📁 Archivos Disponibles

| Archivo | Descripción |
|---------|-------------|
| `base.css` | Variables CSS, colores, gradientes, tipografía |
| `components.css` | Glass, botones 3D, cards interactivas, inputs, alertas |
| `hover-effects.css` | **Efecto animated hover**: icono que se agranda, rota e ilumina |
| `login-modal.css` | Modal de login completo con estilo premium |
| `loaders.css` | Spinners, dots, pulse, skeleton, progress bar |
| `examples.css` | Código JSX/React listo para copiar |
| `index-template.html` | Plantilla HTML con todas las dependencias |

---

## 🚀 Uso Rápido

1. Copia los archivos CSS que necesites a tu proyecto
2. Usa `index-template.html` como base para tu HTML
3. Consulta `examples.css` para código JSX listo para copiar

---

## 🎯 Características del Estilo

### Colores Principales
```css
--bg1: #041847          /* Fondo oscuro azul */
--acc: #22d3ee          /* Acento cyan */
--acc2: #a78bfa         /* Acento purple */
--neon-cyan: #2ee8ff    /* Neón cyan brillante */
--neon-pink: #ff4ecd    /* Neón rosa */
```

### Efectos
- **Glassmorphism** - Fondo cristal con blur
- **Neón glow** - Brillos en bordes y textos
- **3D buttons** - Hover con elevación y luz deslizante
- **Gradientes** - Fondos y textos con gradiente

### Tipografía
- **Montserrat** - Títulos (600-800 weight)
- **Poppins** - Texto general (300-600 weight)

---

##   Componentes Incluidos

### Login Modal (`login-modal.css`)
- Overlay difuminado
- Modal glass con resplandor azul
- Inputs con iconos
- Botón submit con gradiente
- Separador "O accede con"
- Botón Google glass
- Link cambiar login/registro

### Loaders (`loaders.css`)
- `.spinner` - Círculo simple
- `.spinner-double` - Dos círculos concéntricos
- `.spinner-triple` - Tres círculos (ultra premium)
- `.dots-loader` - Puntos rebotando
- `.pulse-loader` - Círculo pulsante
- `.progress-bar` - Barra de progreso indeterminada
- `.skeleton` - Skeleton para contenido
- `.loading-overlay` - Fondo difuminado completo

### Componentes Base (`components.css`)
- `.glass` / `.glass-hover` - Efecto cristal
- `.glass-modal` - Para modales
- `.btn-3d` - Botón con efecto luz
- `.btn-primary` / `.btn-secondary` - Botones estilizados
- `.card-interactive` - Cards con hover animado
- `.alert-*` - Mensajes de alerta

---

##   Ejemplo Rápido

```html
<!-- Overlay de carga -->
<div class="loading-overlay">
    <div class="spinner-double"></div>
    <p class="loading-text">Generando imagen...</p>
</div>
```

```jsx
// Uso condicional en React
{isLoading && (
    <div className="loading-overlay">
        <div className="spinner-double"></div>
        <p className="loading-text">Procesando...</p>
    </div>
)}
```
