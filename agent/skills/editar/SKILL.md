---
name: editar
description: Meta-skill para mantenimiento, QA y mejoras. NUNCA regenera desde cero; aplica cirugía de código.
---

# 🛠️ EDITAR: El Cirujano de Código

Esta es la skill principal para **modificar, arreglar o mejorar** cualquier proyecto existente. Su filosofía es la "Cirugía de Alta Precisión": nunca matamos al paciente (borrar todo) para curar un resfriado.

## ⚠️ REGLA DE ORO: IDIOMA ESPAÑOL ESTRICTO (OBLIGATORIO)
**NUNCA** generes texto ni audio en otro idioma que no sea Español. **CUALQUIER** instrucción que le des a un modelo de IA o prompt que construyas en el código (Gemini, Veo, etc.) para generar contenido visual o auditivo **DEBE** incluir explícitamente la orden de que **todo texto o audio generado deba estar obligatoriamente en español.** No añadas texto ni audios que no cumplan este criterio.

## ⚠️ REGLA DE ORO (ZERO DESTRUCTION POLICY)
**NUNCA, NUNCA GENERE ARCHIVOS DESDE CERO PARA CORREGIR LOS ERRORES.**
**SIEMPRE UTILICE COMO BASE LOS ARCHIVOS QUE LE HE DADO Y QUE REALICE LAS CORRECCIONES NECESARIAS PERO SIEMPRE EN MIS ARCHIVOS.**

## Skills Integradas
- **Modelo AI por Defecto**: `gemini-3.1-flash-image-preview` (Utilizar siempre este modelo).

1.  **Modo Producción** (`skills/modo_produccion`): Aplica el checklist de QA (Visual, Responsive, Code).
2.  **Style Guide** (`skills/style_guide_skill`): Consulta las variables CSS oficiales para no romper la estética.

3.  **Hover Effects** (`style_guide/resources/hover-effects.css`): Usar siempre classes `.glass-hover` para tarjetas y `.btn-3d` para botones interactivos.

4.  **Loading Overlay 3-Ring** ⚠️ MUY IMPORTANTE:

5.  **Auditoría Lighthouse** (`skills/auditoria_lighthouse`): Checklist de rendimiento, SEO y buenas prácticas.
6.  **Accesibilidad** (`skills/accesibilidad`): Verificación WCAG 2.1 A/AA (contraste, teclado, ARIA, semántica).
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

## Workflow de Edición

### Paso 1: Diagnóstico (Read-only)
Leo los archivos actuales. Identifico el problema.
*No toco nada todavía.*

### Paso 2: Plan Quirúrgico
Decido qué líneas exactas cambiar.

### Paso 3: Intervención (Edit)
Uso herramientas de edición (`replace_file_content`).
- **IMPORTANTE**: Si toco lógica de botones/API, debo asegurar el estándar de carga:
    - Botón deshabilitado al cargar.
    - Icono Spinner (`Loader2`).
    - Texto **"PROCESANDO..."**.

### Paso 4: QA Post-Operatorio (OBLIGATORIO) 🕵️
**Antes de confirmar el arreglo**, DEBO usar mi navegador para verificar.

1.  **Lanzar Navegador**: Abro la app modificada.
2.  **Verificación de Confirmación**:
    - Si arreglé un botón, **lo pulso** para ver si funciona.
    - **VERIFICACIÓN DEL ESTADO "PENSANDO"**: Al pulsar, ¿el botón dice "PROCESANDO..." y sale el spinner? Si no, **ES UN BUG** y debo arreglarlo.
    - Reviso consola por errores.
3.  **Iteración**: Si la verificación falla, vuelvo al Paso 2.

### Paso 5: Añadir Historial Persistente (SI APLICA)
Si la app genera contenido y **NO tiene historial local**, debo añadirlo.

**Diagnóstico Rápido:**
1. Buscar `localStorage` en el código.
2. Si no existe → Añadir el patrón estándar.

**Patrón de Código a Inyectar (React):**
```jsx
// Constante única
const STORAGE_KEY = 'nombre_app_history';

// Estado
const [history, setHistory] = useState([]);

// Cargar al montar
useEffect(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setHistory(parsed);
        }
    } catch (e) { console.warn('Error cargando historial:', e); }
}, []);

// Guardar cuando cambia
useEffect(() => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) { console.warn('Error guardando historial:', e); }
}, [history]);
```

**UI Mínima a Añadir:**
- Sidebar o sección con grid de items del historial.
- Botones de descarga/eliminar por item.
- Botón "Limpiar todo" con `confirm()`.

### Paso 6: Añadir Lightbox/Zoom (SI APLICA)
Si la app muestra imágenes generadas, debo añadir el lightbox estándar.

**Comportamiento del Lightbox:**
- **cursor: zoom-in** en las imágenes del historial (para indicar que son clicables).
- **cursor: zoom-out** en la imagen ampliada (para indicar que se puede cerrar).
- **Clic en cualquier parte** cierra el lightbox (excepto en los controles de descarga).
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
// Cerrar lightbox al hacer clic en cualquier parte (excepto controles)
lightbox.onclick = (e) => {
    if (e.target.closest('.lightbox-controls')) return;
    closeLightbox();
};

// Cerrar con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});
```

### Paso 7: Auditoría Final (SI ES EDICIÓN SIGNIFICATIVA) 🔍♿
Si la edición afecta estructura HTML, estilos CSS o lógica de interacción, ejecutar:

1.  **Auditoría Lighthouse**: Checklist de `skills/auditoria_lighthouse` (Rendimiento → SEO → Buenas Prácticas).
2.  **Accesibilidad**: Checklist de `skills/accesibilidad` (Semántica → Contraste → Teclado → Imágenes).
3.  **Corregir** problemas encontrados.
4.  **Incluir reporte** en la confirmación final.

> ⚠️ Para ediciones menores (fix de un bug puntual, cambio de texto), esta auditoría es **opcional**.

### Paso 8: Sincronización con GitHub (OBLIGATORIO) 🔄
**Cualquier cambio realizado DEBE ser subido a GitHub si el proyecto tiene un repositorio remoto.**

1.  **Verificar Remoto**: Ejecutar `git remote -v` en la carpeta del proyecto.
2.  **Sincronizar**: Si existe un remoto, ejecutar:
    - `git add .`
    - `git commit -m "Descripción de los cambios"`
    - `git pull --rebase origin main` (para evitar conflictos)
    - `git push origin main`
3.  **Confirmar**: Informar al usuario que los cambios están en GitHub.

---

## Inputs
- "Arregla el botón de..."
- "Añade una sección de..."

## Output
- Confirmación de archivos modificados.
- Confirmación de sincronización con GitHub.
- **Confirmación Visual**: "He comprobado en el navegador que el cambio funciona y el estado PROCESANDO se activa".
