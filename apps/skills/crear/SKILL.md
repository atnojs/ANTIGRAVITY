---
name: crear
description: Meta-skill que orquesta la creación de apps/webs premium. Invoca planificación, diseño y código automáticamente.
---

# 🚀 CREAR: El Orquestador de Apps Premium

Esta es la skill principal para **crear** cualquier proyecto. No solo "escribe código", sino que actúa como un Director de Producto que coordina a los mejores expertos (otras skills) para garantizar un resultado **Antigravity Premium**.

## 🧠 Cerebro Colectivo (Skills Integradas)

Cuando me invocas con `crear`, activo automáticamente lo siguiente:

1.  **Planificación Pro** (`skills/planificacion_pro`): Para no improvisar la estructura.
2.  **Style Guide** (`skills/style_guide_skill`): Para asegurar Glassmorphism y estética Neón.
3.  **Brainstorming Pro** (`skills/brainstorming_pro`): Si tu idea es vaga, propongo mejoras antes de programar.
4.  **Generación de Activos** (`skills/analista_visual_pro`): Para prompts de imágenes si la app lo requiere.

5.  **Hover Effects** (`style_guide/resources/hover-effects.css`): Implementar `.glass-hover` y `.btn-3d` según estándar.

6.  **Loading Overlay 3-Ring** ⚠️ MUY IMPORTANTE:
    - **SIEMPRE** usar la clase `.loading-overlay` del Style Guide.
    - **NUNCA** usar clases Tailwind inline (bg-black/30, backdrop-blur-sm).
    
    **Implementación HTML/CSS puro:**
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
    
    **Implementación React/JSX:**
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
    
    **Valores de transparencia:** `background: rgba(0, 0, 0, 0.30)` + `backdrop-filter: blur(4px)`

## workflow de Creación Premium

### Paso 1: Entender y Pulir
Analizo tu petición.
- *Si es vaga*: Uso principios de `brainstorming_pro` para ofrecerte 3 opciones de enfoque (A, B, C).
- *Si es compleja*: Uso `planificacion_pro` para listarte las fases antes de escribir una sola línea de código.

### Paso 2: Diseño del Sistema
Defino la estructura técnica basándome en el estándar **Antigravity**:
- **Backend**: `proxy.php` (Siempre oculto, template estándar).
- **Frontend**: `index.html` + `app.js` (React/Babel).
- **Estilo**: `app.css` (Neon Glassmorphism estricto).
- **Modelo AI**: `FLUX` (Black Forest Labs).

### Paso 3: Ejecución (Scaffolding)
Genero los archivos físicos en `e:/ANTIGRAVITY/<nombre-proyecto>/`:
1.  Copio `resources/proxy_template.php` -> `proxy.php`.
2.  Copio `resources/index_template.html` -> `index.html`.
3.  Copio `resources/css_template.css` -> `app.css` (e inyecto estilos extra si hiciera falta).
4.  Escribo `app.js` implementando la lógica visada en el Paso 1.

#### ⚠️ ESTÁNDAR UX: HISTORIAL PERSISTENTE EN PHP (OBLIGATORIO)

Cualquier app que genere contenido debe persistir su historial con `history.php` y `history-manager.js` en el servidor Hostinger.

```javascript
const hm = new HistoryManager('nombre_app');

await hm.load();
await hm.save({ type: 'image', data: resultado });
await hm.delete(id);
await hm.clear();
```

La interfaz debe mostrar el historial, permitir descargar y eliminar cada elemento, y pedir confirmación antes de limpiar todo.
#### ⚠️ ESTÁNDAR UX: LIGHTBOX/ZOOM DE IMÁGENES (OBLIGATORIO)
Cualquier app que muestre imágenes generadas **DEBE** implementar un lightbox para verlas amplificadas.

**Comportamiento del Lightbox:**
- **cursor: zoom-in** en las imágenes del historial (indica que son clicables).
- **cursor: zoom-out** en la imagen ampliada (indica que se puede cerrar).
- **Clic en cualquier parte** cierra el lightbox (excepto en controles de descarga).
- **Tecla Escape** cierra el lightbox.

**Implementación CSS:**
```css
/* Imagen en el historial */
.result-card img {
    cursor: zoom-in;
    transition: transform 0.3s ease;
}

.result-card:hover img {
    transform: scale(1.02);
}

/* Lightbox */
.lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    z-index: 30000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.lightbox.hidden {
    display: none;
}

#lightbox-img {
    max-width: 90%;
    max-height: 80vh;
    object-fit: contain;
    cursor: zoom-out;
}
```

**Implementación JavaScript:**
```javascript
// Abrir lightbox
function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.remove('hidden');
}

// Cerrar lightbox
function closeLightbox() {
    lightbox.classList.add('hidden');
}

// Cerrar al hacer clic en cualquier parte (excepto controles)
lightbox.onclick = (e) => {
    if (e.target.closest('.lightbox-controls')) return;
    closeLightbox();
};

// Cerrar con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});
```

---

## Inputs
- "Quiero una web para..."
- "Crea una app que..."

## Output
- Carpeta del proyecto lista.
- Captura o confirmación del navegador diciendo "El estado de carga (PROCESANDO...) funciona correctamente".
- URL local para abrir `index.html`.
