---
name: cirujano-codigo-produccion
description: "Activa este skill para aplicar correcciones de errores, añadir características o refactorizar archivos existentes sin destruir el código previo."
---

# Cirujano de Código y UX de Producción

## Objetivo

Aplicar correcciones, mejoras o refactorizaciones sobre archivos existentes de forma no destructiva, preservando el código funcional y modificando solo los bloques necesarios.

## Inputs esperados

- `target_file`: ruta del archivo físico que se va a modificar.
- `error_log`: mensaje de error del compilador, consola o descripción del bug. Opcional.
- `modification_request`: instrucciones de la mejora o parche a aplicar.

---

## Workflow de Edición Quirúrgica (8 pasos)

### Paso 1: Diagnóstico (Read-only)

Leer los archivos actuales. Identificar el problema.
**No tocar nada todavía.**

### Paso 2: Plan Quirúrgico

Decidir qué líneas exactas cambiar. Localizar los bloques afectados.

### Paso 3: Intervención (Edit)

Aplicar edición quirúrgica reemplazando únicamente el bloque afectado:
1. Leer el archivo completo.
2. Comprender su estructura antes de modificarlo.
3. Localizar las líneas exactas del conflicto o mejora.
4. Aplicar edición reemplazando solo el bloque afectado.
5. Conservar todo lo que ya funciona.

### Paso 4: QA Post-Operatorio (OBLIGATORIO)

**Antes de confirmar el arreglo**, verificar en navegador:
1. Abrir la app modificada.
2. Si se tocó lógica de botones/API, **pulsarlo** para verificar:
   - El botón se deshabilita al cargar.
   - Muestra spinner (`Loader2` con `animate-spin`).
   - El texto cambia a **"PROCESANDO..."**.
3. Revisar consola por errores.
4. Si falla, volver al Paso 2.

### Paso 5: Verificar Historial Persistente

**Diagnóstico rápido:**
1. Buscar `localStorage` o `HistoryManager` en el código.
2. Si la app genera contenido y **NO tiene historial server-side** → añadir sistema `history-server`.

**Patrón a inyectar:**
```javascript
// Incluir history-manager.js
const hm = new HistoryManager('nombre_app');

// Cargar al montar
useEffect(() => {
    hm.load().then(() => setHistory(hm.getAll()));
}, []);

// Guardar resultado
const addToHistory = async (result) => {
    await hm.save({ type: 'image', data: result });
    setHistory(hm.getAll());
};

// Eliminar
const removeFromHistory = async (id) => {
    await hm.delete(id);
    setHistory(hm.getAll());
};

// Limpiar todo
const clearHistory = async () => {
    if (confirm('¿Eliminar todo el historial?')) {
        await hm.clear();
        setHistory([]);
    }
};
```

**UI requerida:**
- Panel lateral o sección con grid de items del historial.
- Botones de descarga y eliminar por item.
- Botón "Limpiar todo" con `confirm()`.
- `cursor: zoom-in` en imágenes del historial.

### Paso 6: Verificar Lightbox/Zoom

Si la app muestra imágenes generadas, añadir o verificar lightbox.

**Comportamiento requerido:**
- `cursor: zoom-in` en imágenes del historial.
- `cursor: zoom-out` en la imagen ampliada.
- Clic en cualquier parte cierra el lightbox (excepto controles de descarga).
- Tecla Escape cierra el lightbox.

**CSS:**
```css
.result-card img { cursor: zoom-in; transition: transform 0.3s ease; }
.result-card:hover img { transform: scale(1.02); }

.lightbox {
    position: fixed; inset: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    z-index: 30000;
    display: flex; align-items: center; justify-content: center;
}
.lightbox.hidden { display: none; }
#lightbox-img { max-width: 90%; max-height: 80vh; object-fit: contain; cursor: zoom-out; }
```

**JavaScript:**
```javascript
function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.remove('hidden');
}
function closeLightbox() { lightbox.classList.add('hidden'); }

lightbox.onclick = (e) => {
    if (e.target.closest('.lightbox-controls')) return;
    closeLightbox();
};
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});
```

### Paso 7: Auditoría Final

Si la edición afecta estructura HTML, estilos CSS o lógica de interacción, ejecutar skill `auditor-lighthouse-accesibilidad`.

> Para ediciones menores (fix de bug puntual, cambio de texto), esta auditoría es opcional.

### Paso 8: Sincronización con GitHub (OBLIGATORIO)

1. `git remote -v` (verificar remoto).
2. Si existe:
   - `git add .`
   - `git commit -m "fix: descripción del cambio"`
   - `git pull --rebase origin main`
   - `git push origin main`

---

## UX de carga para llamadas a IA

Cada vez que el código implique una petición asíncrona hacia una API de IA, el botón de envío debe seguir este patrón:

```jsx
<button 
  disabled={isProcessing} 
  className={isProcessing ? "opacity-20 target-style" : "target-style"}
>
  {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles />}
  {isProcessing ? "PROCESANDO..." : "GENERAR"}
</button>
```

## Checklist QA Rápido (modo_produccion)

Para revisiones rápidas pre-entrega:

### A) Funciona y se ve
- Abre sin errores en consola.
- Imágenes cargan (sin rutas rotas).
- Tipografías y estilos se aplican correctamente.

### B) Responsive (móvil primero)
- Se ve bien en móvil (no scroll horizontal).
- Botones y textos con tamaños legibles.
- Espaciado coherente entre secciones.

### C) Copy y UX básica
- Titular claro y coherente.
- CTAs consistentes.
- No texto placeholder tipo "lorem ipsum".

### D) Accesibilidad mínima
- Contraste razonable en textos.
- Imágenes con alt.
- Estructura de headings (h1, h2) lógica.

---

## Reglas críticas

- **NUNCA rehagas una app desde cero** si el usuario ya entregó archivos.
- **NUNCA elimines funcionalidades existentes** sin petición expresa.
- No cambies nombres de funciones, IDs, clases o rutas si no es imprescindible.
- Si hay un error concreto, corrige ESE error antes de añadir mejoras.
- Antes de tocar código, revisa el archivo original.
- Cuando el usuario no sabe programar, entrega el archivo completo final listo para pegar si lo solicita.
- Si hay conflicto entre "bonito" y "claro", prioriza claridad.
