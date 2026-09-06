---
name: crear
description: "Meta-skill que orquesta la creación completa de apps/webs premium Antigravity. Invoca planificación, diseño, código, historial server-side, auditoría y despliegue automáticamente. Activar cuando el usuario pida crear una app, web o herramienta nueva."
---

# CREAR — Orquestador de Apps Premium

## Objetivo

Actuar como Director de Producto que coordina las skills especializadas para garantizar un resultado **Antigravity Premium** en cada app creada.

## ⚠️ Reglas de Oro

1. **Idioma español estricto**: NUNCA generar texto ni audio en otro idioma. Todo prompt a IA debe incluir: *"todo texto o audio generado debe estar obligatoriamente en español."*
2. **No regenerar desde cero**: si hay archivos base, modificarlos quirúrgicamente (ver `cirujano-codigo-produccion`).
3. **Bloque de modelos de imagen**: usar únicamente el selector canónico de `apps/dibujo_lineas_copia`: `OPENAI` a la izquierda (`MEDIUM` activo por defecto y `HIGHT`) y `GEMINI` a la derecha (`3.1 FLASH` y `3 PRO`). No añadir proveedores ni conservar selectores anteriores.

## 🧠 Skills integradas

Al activar `crear`, se invocan automáticamente:

| Skill | Para qué |
|-------|----------|
| `planificacion-pro` | Planificar antes de codificar |
| `brainstorming-pro` | Refinar ideas vagas |
| `style-guide-antigravity` | Aplicar diseño Neon Glassmorphism |
| `analista-visual-pro` | Prompts de imágenes si la app lo requiere |
| `arquitecto-backend-php-hostinger` | Configurar proxy.php + config.php |
| `history-server` | Historial persistente server-side |
| `auditor-lighthouse-accesibilidad` | Control de calidad final |

---

## Workflow de Creación (6 pasos)

### Paso 1: Entender y Pulir

Analizar la petición del usuario:
- *Si es vaga* → usar `brainstorming-pro` para ofrecer 3 opciones de enfoque (A, B, C).
- *Si es compleja* → usar `planificacion-pro` para listar fases antes de escribir código.

### Paso 2: Diseño del Sistema

Definir estructura técnica según el estándar **Antigravity**:

```text
apps/<nombre-app>/
├── index.html              ← Frontend principal
├── app.js                  ← Lógica (React/Babel o vanilla JS)
├── app.css                 ← Estilos (Neon Glassmorphism)
├── proxy.php               ← Backend seguro (cascada 7 fuentes)
├── config.php              ← Clave API aislada (.gitignore)
├── history.php             ← API de historial server-side
├── history-manager.js      ← Cliente JavaScript para historial
└── history/data/           ← Datos de historial (auto-creado)
```

### Paso 3: Ejecución (Scaffolding)

Generar archivos en `e:/ANTIGRAVITY/apps/<nombre-app>/`:

1. **`proxy.php`**: Usar cascada de 7 fuentes de `arquitecto-backend-php-hostinger`.
2. **`config.php`**: Con marcador `AQUI_TU_API_KEY`.
3. **`history.php` + `history-manager.js`**: Copiar de `history-server/resources/`.
4. **`index.html`**: Con dependencias a CSS del `style-guide-antigravity`.
5. **`app.css`**: Importar `base.css` y `components.css`. Inyectar estilos extra si necesario.
6. **`app.js`**: Implementar la lógica acordada en Paso 1.

### ⚠️ Estándar UX: Estado "PENSANDO" (OBLIGATORIO)

Cada botón que llame a la IA debe implementar:

```jsx
<button disabled={isGenerating} className="...">
    {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
    {isGenerating ? 'PROCESANDO...' : 'GENERAR'}
</button>
```

### ⚠️ Loading Overlay 3-Ring (OBLIGATORIO)

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

### ⚠️ Historial Persistente Server-Side (OBLIGATORIO)

Toda app que genere contenido debe usar `history-server` con PHP:

```javascript
// Usar HistoryManager con historial PHP en servidor
const hm = new HistoryManager('nombre_app');
await hm.load();

const addToHistory = async (result) => {
    await hm.save({ type: 'image', data: result });
};
```

El sistema `history-server` proporciona:
- Sin límite de 5MB
- Accesible desde cualquier navegador
- Datos en servidor, no en el dispositivo

### ⚠️ Lightbox/Zoom (OBLIGATORIO para apps de imágenes)

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

### Paso 4: Revisión Visual y Funcional (OBLIGATORIO)

1. Abrir `index.html` en navegador.
2. Verificar Glassmorphism, estado "PROCESANDO...", spinner, lightbox.
3. Verificar que no hay errores rojos en consola.
4. Corregir inmediatamente si algo falla.

### Paso 5: Auditoría Final (OBLIGATORIO)

Ejecutar `auditor-lighthouse-accesibilidad` completo:
- Rendimiento (7 items) → SEO (11 items) → Contraste → Teclado → Imágenes → Formularios → Contenido Dinámico
- Corregir todos los problemas antes de entregar.
- Incluir reporte en la entrega final.

### Paso 6: Sincronización con GitHub (OBLIGATORIO)

1. `git remote -v`
2. Si existe remoto:
   - `git add .`
   - `git commit -m "feat: creación de <nombre-app>"`
   - `git pull --rebase origin main`
   - `git push origin main`

---

## Inputs

- "Quiero una web para..."
- "Crea una app que..."
- "Necesito un generador de..."

## Output

- Carpeta del proyecto lista en `apps/<nombre-app>/`.
- `proxy.php` con cascada de 7 fuentes.
- `history.php` + `history-manager.js` para historial server-side.
- Confirmación de sincronización con GitHub.
- Captura o confirmación visual: "El estado PROCESANDO funciona correctamente".
- Reporte de auditoría Lighthouse + Accesibilidad.
