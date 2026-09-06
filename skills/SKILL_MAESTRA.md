---
name: maestra-produccion-antigravity
description: Protocolo central para crear, editar y validar archivos, aplicaciones y webs de Antigravity con calidad de producción. Usar siempre que se genere o modifique un archivo, una interfaz o un proyecto completo.
---

# Skill maestra de producción Antigravity

Entregar resultados completos, funcionales, seguros y visualmente cuidados desde la primera versión. Aplicar esta skill de forma autosuficiente: no depender de otras skills para crear o editar archivos, apps o webs.

## Principios no negociables

1. Leer y comprender los archivos originales antes de modificarlos.
2. Preservar funcionalidades, rutas, nombres, IDs, clases, contratos y decisiones existentes salvo petición expresa o necesidad técnica demostrable.
3. Modificar solo el alcance necesario. No reescribir un proyecto existente desde cero ni introducir dependencias sin justificación.
4. Crear archivos nuevos completos, coherentes con el proyecto y listos para utilizar; no dejar pseudocódigo, marcadores, botones falsos ni flujos simulados.
5. Trabajar en español. Todo texto o audio generado por una IA debe incluir la instrucción de producirse en español, salvo petición explícita del usuario.
6. No exponer claves, tokens, credenciales ni datos privados. Si se detecta una clave expuesta, avisar de que debe revocarse y regenerarse.
7. No afirmar que algo funciona sin haberlo probado en el entorno que realmente lo ejecutará.
8. Conservar cambios ajenos del usuario. Revisar el diff y limitar cada commit a los archivos del encargo.

## Clasificar el encargo

Antes de actuar, identificar una de estas rutas:

- **Edición de archivo:** inspeccionar el archivo completo y sus consumidores; aplicar un cambio quirúrgico y verificar regresiones.
- **Archivo nuevo:** confirmar formato, destino, contenido, restricciones y criterio de aceptación; generarlo con la herramienta adecuada y validar que se abre o procesa correctamente.
- **Función o componente:** revisar contratos, estados, estilos, llamadas y pruebas relacionadas; integrarlo sin romper el flujo existente.
- **Web o app nueva:** definir usuarios, objetivo, flujo principal, arquitectura mínima, datos, estados y criterios de éxito antes de crear archivos.
- **Reparación:** reproducir el fallo, localizar la causa, corregirla y volver a ejecutar exactamente el flujo que fallaba.

Preguntar únicamente cuando falte una decisión crítica que cambie materialmente el resultado. Resolver detalles secundarios mediante la opción más segura, sencilla y coherente.

## Fase 1: inspección obligatoria

1. Localizar la raíz del proyecto y leer instrucciones, configuración, estructura y archivos relevantes.
2. Comprobar el estado de Git, la rama, el remoto y qué rama despliega el servidor. No mezclar cambios preexistentes.
3. Identificar stack, convenciones, dependencias, rutas públicas, backend, persistencia y URL de producción.
4. Buscar implementaciones equivalentes antes de duplicar código.
5. Si hay un error, reproducirlo o reunir evidencia suficiente antes de editar.
6. Definir de 3 a 7 criterios verificables que describan cuándo está terminado.

## Fase 2: diseño de la solución

- Elegir la solución mínima que resuelva el problema completo.
- Mantener una única fuente de verdad para datos y estado.
- Diseñar los estados inicial, vacío, carga, éxito, error y reintento.
- Definir primero el flujo principal y después los casos límite.
- Para cambios amplios, dividir el trabajo en preparación, implementación, QA y publicación.
- Si existe una referencia visual, inspeccionarla con detalle: composición, jerarquía, color, tipografía, espaciado, estados y comportamiento responsive.

## Infraestructura obligatoria para todas las apps y webs

Toda app o web debe incluir un `proxy.php` propio y copias de estos archivos canónicos de historial:

- `proxy.php` de la app: único punto servidor para llamadas protegidas y comprobación de salud. En apps de imágenes debe usar la lista blanca del bloque de `apps/dibujo_lineas_copia`. El frontend nunca llama directamente a una API que requiera una clave.
- `E:/ANTIGRAVITY/skills/history.php`: API de persistencia en Hostinger.
- `E:/ANTIGRAVITY/skills/history-manager.js`: cliente JavaScript de `history.php`; carga, guarda, elimina, limpia y notifica cambios.

Reglas de integración:

1. Copiar los dos archivos canónicos de historial a la carpeta pública de la app. En una app existente, conservar su `proxy.php` y adaptarlo solo cuando el encargo lo requiera.
2. Cargar `history-manager.js` antes del código que lo use.
3. Crear una instancia con nombre único: `new HistoryManager('nombre_app')`.
4. Ejecutar `load()` al iniciar y renderizar el resultado del servidor.
5. Usar `save()`, `delete()` y `clear()` para cualquier contenido o dato persistente. El servidor es la fuente de verdad; no sustituirlo por `localStorage` o una caché exclusivamente local.
6. Mostrar errores de persistencia en la interfaz; no simular éxito si el servidor falla.
7. No versionar `history_data/`, archivos generados, credenciales ni `config.php` privado.
8. Verificar en producción que el historial continúa tras recargar y desde otro navegador o sesión cuando sea posible.
9. Incluso una web sin IA debe conservar `proxy.php` como endpoint de salud; si incorpora una API, ampliar el proxy con una acción cerrada y validada, nunca con una URL arbitraria enviada por el cliente.

## Backend, proveedores y seguridad

- Mantener este mapa del `.htaccess` raíz privado de Hostinger: `O` para OpenAI Images directo y `R` para OpenRouter. No intercambiarlas.
- Guardar OpenAI como `SetEnv O "..."` y OpenRouter como `SetEnv R "..."`; nunca escribir sus valores en Git, frontend, documentación, capturas compartidas ni respuestas.
- Resolver ambas claves en servidor mediante `config.php`, `getenv`, variantes `REDIRECT_`, `$_SERVER` y `$_ENV`.
- En generación o edición de imágenes, usar exclusivamente el bloque vigente de `apps/dibujo_lineas_copia`: OpenAI directo para `openai-medium` y `openai-high`, y Gemini mediante OpenRouter para `gemini-flash` y `gemini-pro`.
- Usar OpenRouter para texto, razonamiento u otras tareas compatibles mediante la acción `openrouter` o `text` del proxy.
- En OpenRouter, fijar el destino servidor a `https://openrouter.ai/api/v1/chat/completions`, autenticar con `Authorization: Bearer <R>` y no aceptar una URL remota enviada por el frontend.
- Aceptar solo métodos, acciones, modelos y parámetros validados.
- Validar JSON, tamaños, tipos MIME, dimensiones, IDs y respuestas externas.
- Evitar CORS abierto cuando frontend y PHP comparten origen.
- No devolver claves, rutas internas, trazas ni errores sensibles.
- Añadir tiempos máximos, tratamiento de errores HTTP y mensajes comprensibles.
- No construir proxies genéricos que acepten destinos remotos arbitrarios.

## Fase 3: implementación

### Al editar

1. Aplicar el parche más pequeño que resuelva el objetivo.
2. Mantener firmas y compatibilidad siempre que sea posible.
3. Actualizar consumidores, estilos y pruebas solo si el contrato cambia.
4. No mezclar refactorizaciones cosméticas con una corrección funcional.

### Al crear una web o app

Usar como base, adaptándola al stack real:

```text
<app>/
├── index.html
├── app.css
├── app.js
├── proxy.php
├── history.php
├── history-manager.js
└── assets/
```

- Producir una primera versión completa del flujo principal.
- Utilizar HTML semántico y separar estructura, estilos y lógica cuando no exista un framework que lo gestione.
- Reutilizar componentes y variables; evitar duplicación y valores mágicos dispersos.
- Mantener el frontend ligero y no añadir librerías para resolver tareas sencillas.

### Al crear o editar otros archivos

- Usar herramientas y librerías adecuadas al formato real.
- Preservar estructura, fórmulas, estilos, metadatos y compatibilidad cuando se modifique un archivo existente.
- Renderizar o abrir documentos, hojas, presentaciones, PDFs e imágenes cuando la disposición visual importe.
- Validar sintaxis, esquema, codificación y apertura del archivo final.

## Diseño y experiencia de usuario

Las interfaces nuevas deben seguir el lenguaje Hoola/Relatos:

- Cian `#00D0D0`, verde `#26C626`, tipografía Electrolize y glassmorphism.
- Jerarquía clara, contraste suficiente, espaciado consistente y animaciones funcionales.
- En interfaces existentes, conservar la identidad actual y aplicar este lenguaje solo a los elementos nuevos o afectados, salvo que se solicite una migración completa.

### Sistema visual Hoola/Relatos obligatorio

Usar `apps/dibujo_lineas_copia` como referencia visual canónica. Aplicar sus tokens, profundidad y densidad visual en toda interfaz nueva y en cada rediseño completo; adaptar la estructura al flujo de cada app, pero no inventar una variante estética distinta.

1. **Lienzo común**
   - Usar `#00D0D0` como cian principal, `#26C626` como verde de acento y Electrolize como tipografía de toda la interfaz, incluidos textos de controles.
   - Construir el fondo con `linear-gradient(180deg, #001018 0%, #062f43 60%, #0E5368 100%)` y mantenerlo fijo.
   - Añadir dos halos radiales difusos en el fondo: cian superior y azul verdoso lateral. Superponer una rejilla cian de 1 px cada 46 px, con opacidad aproximada de 0.85 y máscara radial; debe ser visible como textura, sin competir con el contenido.

2. **Paneles y profundidad**
   - Usar superficies de vidrio azuladas: `rgba(23, 79, 122, 0.42)`, con `backdrop-filter: blur(12px)`.
   - Aplicar a tarjetas y paneles principales borde sólido de 2 px `rgba(0, 208, 208, 0.45)`, radio de 14 px, halo exterior suave e iluminación interior cian tenue. Reservar radio de 9 px para controles y elementos pequeños.
   - Mantener el contraste de capas: fondo profundo, panel azul translúcido y controles más oscuros o destacados; no sustituirlos por tarjetas casi negras, bordes de 1 px sin presencia o sombras grises genéricas.

3. **Campos y controles**
   - Diseñar selectores, chips y controles con la misma superficie de vidrio, borde cian y tipografía Electrolize. Al pasar el cursor, aplicar una capa blanca translúcida al 8 % (`background: rgba(255, 255, 255, 0.08)`), aumentar el halo y aclarar el borde sin alterar la paleta.
   - Usar cian sólido para selecciones activas y un gradiente cian-verde para la acción primaria. Usar texto azul muy oscuro en esos estados.
   - Mantener botones secundarios y herramientas con borde cian, fondo azul oscuro/translúcido y halo contenido; evitar componentes blancos, violetas, rosas o estilos ajenos a esta paleta.

4. **Composición**
   - Usar una anchura máxima de 1800 px, relleno exterior de 16 px y separaciones principales de 14 a 20 px. Mantener una interfaz compacta y clara, sin grandes zonas vacías ni tarjetas sobredimensionadas.
   - **Cabecera (header) obligatoria** — usar exactamente estos valores, copiados de `apps/dibujo_lineas_copia`:
     - Título (`h1` o `.app-title`): `font-size: clamp(2rem, 5vw, 3.2rem)`, `font-weight: 400`, `letter-spacing: 0.04em`, `text-transform: uppercase`, `margin-bottom: 0.5rem`.
     - Sombra del título: `text-shadow: 0 0 10px var(--glow), 0 0 24px var(--glow), 0 0 44px var(--glow-soft)` (triple halo cian).
     - Subtítulo (`.app-subtitle`): `font-size: 1.05rem`, `letter-spacing: 0.03em`, `margin-bottom: 1.2rem`, color `var(--text-dim)`.
   - Adaptar el historial al contenido disponible sin reservar espacio inútil. En escritorio puede ser lateral y fijo; en móvil debe pasar al flujo normal a ancho completo.

5. **Coherencia y validación visual**
   - Reutilizar los mismos tokens, grosor de borde, radios, rejilla, fondo y patrón de iluminación en cada pantalla de la app.
   - No usar una interpretación "suave", minimalista o editorial como sustituto del estilo de Outfit. La similitud visual con `apps/outfit` es el criterio de aceptación.
   - Antes de entregar, comprobar en navegador la presencia de la rejilla, el degradado, los paneles azulados, los bordes cian de 2 px, la tipografía Electrolize y los estados activos cian-verde.
Toda interfaz debe:

- Ser responsive en móvil, tableta y escritorio, sin scroll horizontal accidental.
- Tener objetivos táctiles cómodos, textos legibles y controles utilizables con teclado.
- Incluir foco visible, `alt` correcto, etiquetas de formulario, jerarquía de encabezados y regiones semánticas.
- Usar `aria-live` para resultados/errores dinámicos y `aria-busy` durante procesos.
- Respetar `prefers-reduced-motion` cuando haya animaciones relevantes.
- Mostrar estados de carga reales; deshabilitar acciones duplicadas y ofrecer reintento tras errores.
- Mantener la entrada del usuario si una operación falla.
- Evitar placeholders, enlaces muertos, acciones sin implementar y mensajes técnicos crudos.

### Estado universal mientras trabaja la IA

Toda llamada a un modelo debe usar exactamente el overlay de carga de referencia de `apps/dibujo_lineas_copia`, adaptando solo los nombres de clases o IDs cuando el stack lo requiera:

- Overlay a pantalla completa, centrado, con `gap: 1.5rem`.
- **Fondo semi-transparente** (se ve el contenido detrás): usar este degradado exacto:
  ```css
  background:
    radial-gradient(ellipse at 30% 20%, rgba(0, 40, 60, 0.32) 0%, rgba(0, 12, 20, 0.38) 55%),
    radial-gradient(ellipse at 70% 80%, rgba(0, 60, 60, 0.20) 0%, rgba(0, 8, 14, 0.28) 60%);
  backdrop-filter: blur(14px) saturate(1.8);
  -webkit-backdrop-filter: blur(14px) saturate(1.8);
  ```
  Las opacidades clave son `0.32 / 0.38` y `0.20 / 0.28`. Si se quiere más transparencia bajar los 4 números; si se quiere más opacidad subirlos. El blur es `14px`.
- Spinner de tres aros de 80 × 80 px y bordes de 3 px: aro exterior cian con giro de 1.2 s, aro medio verde con giro inverso de 1 s y aro interior cian con giro de 0.8 s; cada aro conserva su halo de color.
- Texto principal exacto: `IA generando lo solicitado...`, en Electrolize, mayúsculas y color cian `#00D0D0`.
- Panel de progreso de `min(360px, 85vw)`, borde cian, fondo `rgba(6, 16, 24, 0.8)`, desenfoque de 0 px y halo cian suave.
- Barra de 6 px, redondeada, con fondo blanco al 8 % y relleno con gradiente cian-verde. Debe usar el movimiento indeterminado de la referencia: ancho del 40 % y animación de traslación de 2.5 s (`-100 % → 150 % → -100 %`).
- No mostrar porcentaje. El progreso se expresa siempre mediante la barra indeterminada y un estado secundario centrado y adaptado a la operación, por ejemplo: `Generando imagen 1 de 2...`, `Procesando solicitud...` o `Guardando resultado...`.
- El contenedor usa `role="status"`, `aria-live="polite"` y `aria-busy="true"`; la barra conserva `role="progressbar"` con mínimo 0 y máximo 100.
- Al iniciar, mostrar el overlay, bloquear el scroll del documento y deshabilitar la acción que duplicaría la petición. Al terminar o fallar, ocultarlo, restaurar el scroll y los controles, y mostrar el resultado o un error comprensible.
- Respetar `prefers-reduced-motion`: detener los giros y la animación de la barra.
## Panel de historial: patrón canónico clonable

Toda app que genere o edite imágenes debe incluir un **panel lateral de historial** con scroll propio, idéntico al implementado en `apps/escenario_modelo`. Este panel es la referencia única; copiar sus tres capas (HTML, CSS y JS) sin inventar variantes.

### 1. HTML — estructura del panel

El historial vive en un `<aside>` dentro de `.main-layout`, como columna hermana de `.main-col`:

```html
<div class="main-layout">
  <div class="main-col">
    <!-- …resto de la app… -->
  </div>

  <!-- COLUMNA DERECHA: HISTORIAL -->
  <aside class="history-col" id="history-section">
    <h2 id="history-title" class="section-title" style="display:none;">Historial</h2>
    <div id="history-grid"></div>
    <button id="history-clear-btn" class="btn-danger-outline" style="display:none;">Limpiar</button>
  </aside>
</div>
```

- `#history-title` y `#history-clear-btn` empiezan ocultos (`display:none`) y se muestran solo cuando hay items.
- `#history-grid` es el contenedor donde el JS inyecta los items.

### 2. CSS — estilos completos del panel

Copiar este bloque completo al `app.css` de la app destino. Los tokens `--acc`, `--border`, `--glow-soft`, etc. deben existir en `:root` (ver sección de tokens Hoola).

```css
/* === HISTORIAL (panel lateral con scroll propio) === */
.history-col {
  flex: 0 0 clamp(320px, 24vw, 460px);
  width: clamp(320px, 24vw, 460px);
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  position: sticky; top: 16px;
  background: var(--card-bg);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: 0 0 20px var(--glow-soft);
}

.history-col::-webkit-scrollbar { width: 6px; }
.history-col::-webkit-scrollbar-thumb { background: var(--acc); border-radius: 999px; }

.history-col .section-title { font-size: 0.82rem; margin-bottom: 8px; }

.history-col #history-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
}

.history-item-wrap {
  position: relative; aspect-ratio: 3/4;
  border-radius: var(--radius-sm); overflow: hidden;
  border: 1px solid var(--border);
  background: rgba(0,0,0,0.25);
  transition: border-color .2s, box-shadow .2s;
}

.history-item-wrap:hover {
  border-color: var(--border-strong);
  box-shadow: 0 0 16px var(--glow-soft);
}

.history-item-wrap img {
  width: 100%; height: 100%; object-fit: cover; cursor: pointer;
  transition: transform .2s;
}

.history-item-wrap img:hover { transform: scale(1.04); }

.history-item-wrap .btn-square {
  position: absolute; top: 3px; right: 3px;
  width: 22px; height: 22px; border-radius: 5px;
  border: none; background: rgba(239,68,68,0.75); color: #fff;
  cursor: pointer; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}

.history-item-wrap .btn-square:hover { background: var(--danger); }

.history-item-wrap .history-date {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 2px 5px;
  background: rgba(0,0,0,0.65);
  color: var(--faint); font-size: 0.55rem; text-align: center;
}

/* Botón Limpiar (danger outline) */
.btn-danger-outline {
  display: block; margin-top: 8px; margin-left: auto; margin-right: auto;
  padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--danger);
  background: rgba(239,68,68,0.2); color: var(--danger);
  cursor: pointer; font-size: 0.65rem;
  font-family: var(--font); text-transform: uppercase; letter-spacing: 0.06em;
  transition: background .2s, color .2s;
}
.btn-danger-outline:hover { background: rgba(239,68,68,0.35); color: #fff; }
```

**Responsive** (añadir dentro del `@media (max-width: 768px)` existente):

```css
.history-col { flex: none; width: 100%; position: static; max-height: none; border-radius: var(--radius-sm); }
.history-col #history-grid { grid-template-columns: repeat(2, 1fr); }
```

### 3. JS — integración con HistoryManager

Copiar estas funciones al `app.js` de la app destino, adaptando solo el nombre de la app en `new HistoryManager('nombre_app')`.

#### 3a. Instanciación y carga (dentro de DOMContentLoaded)

```js
let history; // instancia de HistoryManager

// Dentro de DOMContentLoaded:
history = new HistoryManager('nombre_app'); // nombre único de la app
await loadAndRenderHistory();
history.onChange(() => renderHistoryFromState());
```

#### 3b. Carga y renderizado

```js
async function loadAndRenderHistory() {
  try {
    await history.load();
    renderHistoryFromState();
  } catch (e) {
    console.warn('Error cargando historial:', e);
  }
}

function renderHistoryFromState() {
  const grid = document.getElementById('history-grid');
  const title = document.getElementById('history-title');
  const clearBtn = document.getElementById('history-clear-btn');
  if (!grid) return;

  const items = history.getAll();

  if (!items || !items.length) {
    grid.innerHTML = '';
    if (title) title.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }
  if (title) title.style.display = 'block';
  if (clearBtn) clearBtn.style.display = 'block';

  grid.innerHTML = items.map(item => {
    const url = item.imageUrl || (item.data && item.data.url) || '';
    const createdAt = item.createdAt || '';

    return `<div class="history-item-wrap">
      <img src="${url}" alt="Historial" loading="lazy" onclick="window._openLightbox('${url}')">
      <button class="btn-square" onclick="event.stopPropagation();window._deleteHistoryItem('${item.id}')" aria-label="Eliminar">✕</button>
      <span class="history-date">${new Date(createdAt).toLocaleString()}</span>
    </div>`;
  }).join('');
}
```

#### 3c. Eliminación individual y lightbox

```js
window._deleteHistoryItem = async function (id) {
  if (confirm('¿Eliminar del historial?')) {
    try {
      await history.delete(id);
    } catch (e) {
      console.warn('Error eliminando del historial:', e);
    }
  }
};

window._openLightbox = function (url) {
  let lb = document.getElementById('antigravity-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'antigravity-lightbox';
    lb.style.cssText = 'position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;cursor:zoom-out';
    lb.onclick = function () { lb.style.display = 'none'; };
    const img = document.createElement('img');
    img.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:12px';
    lb.appendChild(img);
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = url;
  lb.style.display = 'flex';
};
```

#### 3d. Limpiar todo el historial

```js
document.getElementById('history-clear-btn').addEventListener('click', async function () {
  if (confirm('¿Eliminar todo el historial?')) {
    try {
      await history.clear();
    } catch (e) {
      console.warn('Error limpiando historial:', e);
    }
  }
});
```

#### 3e. Guardar una imagen en el historial (al generar)

Después de obtener la imagen generada (dataUrl o procesada):

```js
const histId = 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
try {
  await history.save({
    id: histId,
    type: 'image',             // o el tipo que use la app
    data: {
      url: processedImageUrl,  // la URL o dataUrl de la imagen
      prompt: promptUsado,
      // …cualquier metadato relevante…
    },
    imageData: processedImageUrl,  // dataUrl base64 para persistencia en servidor
    createdAt: new Date().toISOString()
  });
} catch (e) {
  console.warn('Error guardando en historial:', e);
}
```

#### 3f. Cerrar lightbox con Escape

```js
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const lb = document.getElementById('antigravity-lightbox');
    if (lb) lb.style.display = 'none';
  }
});
```

### 4. Checklist de integración

Al clonar el historial en una app nueva o existente:

1. ✅ Copiar el HTML del `<aside class="history-col">` dentro de `.main-layout`.
2. ✅ Copiar el bloque CSS completo (panel, items, scrollbar, responsive).
3. ✅ Copiar las funciones JS: `loadAndRenderHistory`, `renderHistoryFromState`, `_deleteHistoryItem`, `_openLightbox`, listener del botón Limpiar y cierre con Escape.
4. ✅ Crear la instancia con `new HistoryManager('nombre_unico_app')`.
5. ✅ Llamar `await history.load()` + `history.onChange(...)` en la inicialización.
6. ✅ Llamar `await history.save({...})` tras cada generación o edición exitosa.
7. ✅ Asegurar que `history-manager.js` y `history.php` están copiados en la carpeta de la app.
8. ✅ Verificar que el panel tiene scroll propio (no scrollea la página entera).
9. ✅ Confirmar que en móvil el panel pasa al flujo normal (ancho completo, sin sticky).
10. ✅ Comprobar que el título "Historial" y el botón "Limpiar" solo aparecen cuando hay items.

## Reglas para apps de generación o edición de imágenes

1. El único selector multimodelo permitido es el bloque vigente de `apps/dibujo_lineas_copia`, descrito al final de esta skill. Antes de tocarlo, leer completos `index.html`, `app.css` y `app.js` de esa app.
2. Mantener dos grupos: `OPENAI` a la izquierda con `MEDIUM` activo por defecto y `HIGHT`; `GEMINI` a la derecha con `3.1 FLASH` y `3 PRO`. No añadir otros proveedores ni recuperar bloques anteriores.
3. Mapear `openai-medium` y `openai-high` a `gpt-image-2` directo con calidad `medium` y `high`; mapear `gemini-flash` y `gemini-pro` a `google/gemini-3.1-flash-image` y `google/gemini-3-pro-image` mediante OpenRouter.
4. Respetar límites reales del modelo. Si una combinación solicitada supera el máximo admitido, calcular dimensiones válidas y mostrar las dimensiones efectivas; nunca fingir una resolución.
5. Separar claramente imagen de entrada, referencias, prompt, formato y opciones de calidad.
6. Conservar identidad, composición o elementos protegidos al editar una imagen.
7. Incluir carga real, resultado ampliable, descarga, historial persistente y mensajes de moderación/error.
8. Descargar o persistir la imagen antes de que caduque una URL firmada del proveedor.

## Fase 4: control de calidad local

Antes de publicar:

- Ejecutar validadores, linters, pruebas y compilación disponibles.
- Verificar sintaxis de PHP y JavaScript, rutas, imports y consola.
- Revisar el diff completo y confirmar que no contiene secretos ni archivos ajenos.
- Comprobar funcionamiento, responsive, accesibilidad, rendimiento básico y SEO cuando sea una página pública.
- Probar teclado, foco, formularios, carga, error, reintento, historial, eliminación y recarga.
- No usar la inspección de código como prueba final de una app/web.

## Fase 5: publicación y validación obligatoria en servidor

Cuando se cree o modifique una app/web, la validación debe realizarse siempre desde el servidor:

1. Completar primero una unidad lógica y verificable.
2. Añadir a Git únicamente los archivos del encargo.
3. Crear un commit descriptivo.
4. Sincronizar de forma segura con la rama de despliegue, preservando cambios ajenos.
5. Hacer push. El push es obligatorio porque activa el despliegue de Hostinger.
6. Esperar la publicación y confirmar que no se está viendo una caché antigua.
7. Abrir la URL real en Chrome y recorrer el flujo visible: clics, navegación, formularios, API, loader, resultado, historial, recarga, errores y responsive.
8. Revisar consola y red cuando algo falle.
9. Si se detecta un problema, corregirlo, validar localmente, crear otro commit, hacer push y repetir la prueba en servidor.

No declarar una app/web terminada hasta que el flujo principal funcione en la URL de producción.

## Criterio de salida

La entrega final debe indicar:

- Resultado conseguido.
- Archivos creados o modificados.
- Pruebas locales realizadas.
- Commit y push efectuados, si corresponde.
- URL y flujos verificados en Chrome desde el servidor.
- Limitaciones o aspectos no comprobables, sin presentar suposiciones como resultados.

El trabajo solo está terminado cuando el resultado es utilizable, está validado y no quedan fallos conocidos dentro del alcance solicitado.

---

## Selector de Modelo IA: bloque canónico de `apps/dibujo_lineas_copia`

Aplicar este patrón en toda app de generación o edición de imágenes que ofrezca varios modelos.

### Estilo (única especificación)

La única fuente de verdad es el bloque implementado en `apps/dibujo_lineas_copia`. Antes de crear, editar o reparar un selector, leer completos `index.html`, `app.css` y `app.js` de esa app y copiar su versión vigente. No conservar ejemplos, proveedores, etiquetas ni estructuras de selectores anteriores.

- **Dos columnas de proveedor**: `OPENAI` a la izquierda y `GEMINI` a la derecha, dentro de `.model-provider-layout`.
- **Un grupo pill por proveedor** con vidrio azulado `var(--card-bg)`, borde cian `var(--border)`, radio de píldora (`999px`), halo exterior suave y `gap:.5rem` entre botones.
- **Botones pill** con `padding:.55rem 1rem`, borde transparente por defecto, texto `var(--muted)`, tipografía Electrolize y `text-transform:uppercase`.
- **Estados**: el segmento activo se resalta con gradiente `var(--contenedor) → var(--acc)` (cian) y texto `#CCFFFF` con glow; los inactivos, texto `var(--muted)` sobre fondo transparente.
- **Estado único**: solo un botón puede tener la clase `active`; `MEDIUM` debe estar activo al cargar.

### Proveedores, orden y modelos

Mantener exactamente este orden dentro de cada bloque:

1. `OPENAI`: `MEDIUM` — `openai-medium` — `gpt-image-2` con calidad `medium` — **seleccionado por defecto**.
2. `OPENAI`: `HIGHT` — `openai-high` — `gpt-image-2` con calidad `high`.
3. `GEMINI`: `3.1 FLASH` — `gemini-flash` — `google/gemini-3.1-flash-image` mediante OpenRouter.
4. `GEMINI`: `3 PRO` — `gemini-pro` — `google/gemini-3-pro-image` mediante OpenRouter.

No añadir otros modelos ni cambiar el estado inicial: **MEDIUM por defecto**.

### Marcado HTML

```html
<div id="model-selector" class="model-selector">
  <span class="model-selector-label">Modelo IA</span>
  <div class="model-provider-layout" role="group" aria-label="Seleccionar modelo">
    <div class="model-provider-column">
      <span class="model-provider-title">OPENAI</span>
      <div class="model-toggle-group">
        <button type="button" id="model-openai-medium" class="model-toggle active" data-model="openai-medium">MEDIUM</button>
        <button type="button" id="model-openai-high" class="model-toggle" data-model="openai-high">HIGHT</button>
      </div>
    </div>
    <div class="model-provider-column">
      <span class="model-provider-title">GEMINI</span>
      <div class="model-toggle-group">
        <button type="button" id="model-g31" class="model-toggle" data-model="gemini-flash">3.1 FLASH</button>
        <button type="button" id="model-g3" class="model-toggle" data-model="gemini-pro">3 PRO</button>
      </div>
    </div>
  </div>
</div>
```

No añadir botones, grupos o alias heredados. El activo se marca únicamente con `active`.

### Tokens Hoola requeridos

Verificar que existan estos tokens. Si faltan, añadirlos al `:root` de la app de destino; no sustituirlos por un fondo negro:

```css
:root {
  --acc: #00D0D0;
  --acc2: #26C626;
  --text: #eaffff;
  --muted: #99CCCC;
  --contenedor: #174F7A;
  --border: rgba(0,208,208,.7);
  --border-strong: #00D0D0;
  --card-bg: rgba(23,79,122,.42);
  --card-hover: rgba(30,100,150,.55);
  --glow: rgba(0,208,208,.8);
  --glow-soft: rgba(0,208,208,.4);
  --font-ui: 'Electrolize', system-ui, sans-serif;
}
```

### CSS canónico responsive

Copiar este bloque completo desde `apps/dibujo_lineas_copia/app.css` y volver a comprobar la fuente si la app canónica cambia:

```css
.model-selector {
  display:flex; flex-direction:column; align-items:center; gap:.6rem;
  margin:1.8rem 0 1.2rem; width:100%;
}
.model-selector-label {
  color:var(--muted); font-size:.8rem; letter-spacing:0.08em; text-transform:uppercase;
}
.model-toggle-group {
  display:inline-flex; gap:.5rem; padding:.3rem; border-radius:999px;
  background:var(--card-bg); border:1px solid var(--border);
  box-shadow:0 0 12px var(--glow-soft);
}
.model-provider-layout {
  display:flex; justify-content:center; align-items:flex-start; gap:1rem;
  width:100%;
}
.model-provider-column {
  display:flex; flex-direction:column; align-items:center; gap:.35rem;
}
.model-provider-title {
  color:var(--muted); font-size:.68rem; letter-spacing:.1em; text-transform:uppercase;
}
.model-toggle {
  font-family:var(--font-ui); font-size:.9rem; letter-spacing:0.04em;
  padding:.55rem 1rem; border-radius:999px; border:1px solid transparent;
  background:transparent; color:var(--muted); cursor:pointer;
  transition:all .25s ease; text-transform:uppercase; white-space:nowrap;
}
.model-toggle:hover {
  color:var(--text); border-color:var(--border-strong);
  background:rgba(255,255,255,0.06); backdrop-filter:blur(4px);
  box-shadow:0 0 12px var(--glow-soft);
}
.model-toggle.active {
  background:linear-gradient(135deg,var(--contenedor),var(--acc));
  color:#CCFFFF; text-shadow:0 0 8px var(--glow);
  border-color:var(--border-strong); box-shadow:0 0 18px var(--glow);
}
@media (max-width:700px) {
  .model-provider-layout { gap:.5rem; }
  .model-toggle-group { gap:.2rem; }
  .model-toggle { font-size:.76rem; padding:.5rem .65rem; }
}
```

Los botones pill no deben tocarse entre sí. Conservar las dos columnas de proveedor, los dos grupos independientes y el centrado de `apps/dibujo_lineas_copia`.

### Botones de relación de aspecto (AR)

No dejar los botones AR con texto gris oscuro o bordes casi invisibles. Aplicar el mismo lenguaje Hoola y conservar su cuadrícula existente:

```jsx
className={`aspect-ratio-button ${selectedAR === ar.id ? 'active' : ''}`}
```

```css
.aspect-ratio-button {
  min-width:0; padding:1rem .35rem; border-radius:1rem;
  border:1px solid rgba(0,208,208,.28); background:var(--card-bg);
  color:var(--muted); display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:.5rem;
  transition:all .25s ease; box-shadow:inset 0 0 12px rgba(0,208,208,.05);
}
.aspect-ratio-button:hover {
  color:var(--text); border-color:var(--border-strong);
  background:var(--card-hover); box-shadow:0 0 12px var(--glow-soft);
}
.aspect-ratio-button.active {
  color:#CCFFFF; border-color:var(--border-strong);
  background:linear-gradient(135deg,var(--contenedor),rgba(0,208,208,.55));
  text-shadow:0 0 8px var(--glow); box-shadow:0 0 16px var(--glow-soft);
}
.aspect-ratio-button .btn-canon {
  color:inherit; font-size:.65rem; line-height:1; white-space:nowrap;
}
```

### Estado y envío al backend

```js
// Vanilla
let selectedModel = 'openai-medium';
const MODEL_LABELS = {
  'openai-medium': 'MEDIUM',
  'openai-high': 'HIGHT',
  'gemini-flash': '3.1 FLASH',
  'gemini-pro': '3 PRO'
};
document.querySelectorAll('.model-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.model-toggle').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    selectedModel = button.dataset.model;
  });
});

// React
const [selectedModel, setSelectedModel] = useState('openai-medium');
useEffect(() => { window.selectedModel = selectedModel; }, [selectedModel]);
// Incluir siempre en el payload: model: selectedModel
```

No cambiar solo el aspecto: comprobar que cada botón actualiza el estado y que el `fetch` envía el identificador elegido.

### Mapeo seguro en PHP

```php
$reqModel = strtolower((string)($data['model'] ?? 'openai-medium'));
$models = [
    'openai-medium' => ['provider' => 'openai', 'model' => 'gpt-image-2', 'quality' => 'medium'],
    'openai-high'   => ['provider' => 'openai', 'model' => 'gpt-image-2', 'quality' => 'high'],
    'gemini-flash'  => ['provider' => 'openrouter', 'model' => 'google/gemini-3.1-flash-image'],
    'gemini-pro'    => ['provider' => 'openrouter', 'model' => 'google/gemini-3-pro-image'],
];

if (!isset($models[$reqModel])) {
    http_response_code(400);
    exit('Modelo no permitido');
}
$selected = $models[$reqModel];
```

Validar por lista blanca exacta y mantener `openai-medium` como fallback seguro para valores omitidos.

### Validación y publicación obligatorias

1. Confirmar que la app de referencia no aparece en el diff cuando solo es el origen visual.
2. Probar que la barra de toggles no desborda el panel y que no existe scroll horizontal ni texto recortado.
3. Verificar las cuatro etiquetas completas y sus bloques: `OPENAI` con `MEDIUM` / `HIGHT`, y `GEMINI` con `3.1 FLASH` / `3 PRO`.
4. Probar estados normal, hover y activo: activo con gradiente `contenedor→cian` y texto `#CCFFFF`.
5. Probar los cinco botones AR: icono y texto legibles, selección funcional y foco visible.
6. Confirmar `openai-medium` (`MEDIUM`) como estado inicial y revisar el payload de los cuatro botones.
7. Actualizar la versión de `app.css` o `app.js` en `index.html` cuando exista cache busting.
8. Revisar el diff, crear commit, hacer push a la rama de despliegue y verificar la URL real sin caché antigua.

---

## Modal de Login y Campos de Autenticación: patrón canónico Hoola (`apps/prompts_predeterminados`)

Aplicar este patrón estético y funcional para cualquier interfaz de autenticación (Login / Registro / Control de Sesión) basada en la arquitectura Hoola/Relatos.

### Estilo e Identidad Visual

1. **Overlay de Fondo (`.modal-overlay.auth-modal`)**
   - Fondo azul oscuro profundo con desenfoque de cristal: `background: rgba(0, 16, 24, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 1000; position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;`.

2. **Contenedor Modal (`.modal-content.auth-modal-content`)**
   - **Superficie de vidrio**: `background: var(--card-bg)` (`rgba(23, 79, 122, 0.42)`); `backdrop-filter: blur(16px);`.
   - **Borde cian**: `border: 2px solid var(--border)` (`rgba(0, 208, 208, 0.7)`).
   - **Dimensiones y curvatura**: `max-width: 420px; width: 95%; padding: 35px; border-radius: 16px;`.
   - **Resplandor exterior**: `box-shadow: 0 0 30px rgba(0, 208, 208, 0.3);`.

3. **Cabecera del Modal (`.auth-header`)**
   - **Icono destacado (`.auth-icon`)**: Icono centrado (`<i class="fa fa-user-circle auth-icon"></i>`), tamaño `3.5rem`, texto con degradado cian-verde: `background: linear-gradient(135deg, var(--neon-cyan), var(--acc2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`.
   - **Título principal (`<h2>`)**: `font-family: 'Electrolize', system-ui, sans-serif; font-size: 1.5rem; background: linear-gradient(90deg, #fff, var(--neon-cyan)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;`.
   - **Subtítulo (`.auth-subtitle`)**: `color: var(--muted)` (`#99CCCC`); `font-size: 0.9rem;`.

4. **Campos de Entrada y Etiquetas (`.form-group`)**
   - **Etiqueta (`<label>`)**: `color: var(--muted); font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; gap: 8px; margin-bottom: 8px;` con icono FontAwesome (`fa-envelope`, `fa-lock`).
   - **Campos de entrada (`input[type="email"]`, `input[type="password"]`, `input[type="text"]`)**:
     ```css
     .auth-modal .form-group input {
         width: 100%;
         padding: 12px 15px;
         background: rgba(23, 79, 122, 0.8);
         border: 1px solid var(--border);
         border-radius: 10px;
         color: var(--text);
         font-size: 0.95rem;
         transition: var(--transition-main);
     }
     ```
   - **Estado Foco (`:focus`)**:
     ```css
     .auth-modal .form-group input:focus {
         outline: none;
         border-color: var(--acc); /* #00D0D0 */
         box-shadow: 0 0 15px rgba(0, 208, 208, 0.3);
     }
     ```

5. **Mensaje de Error (`.auth-error`)**
   - `background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #f87171; padding: 10px; font-size: 0.85rem; margin-bottom: 15px; display: none;`. Se activa añadiendo la clase `.show`.

6. **Botones de Acción**
   - **Botón Iniciar Sesión (`.btn-auth-login`)**:
     - `background: linear-gradient(135deg, rgba(0, 208, 208, 0.3), rgba(38, 198, 38, 0.3)); border: 2px solid var(--acc); color: #fff; border-radius: 12px; font-weight: 700; text-transform: uppercase; font-size: 1rem; padding: 14px 24px; cursor: pointer; width: 100%; margin-bottom: 20px;`.
     - Hover: `background: linear-gradient(135deg, rgba(0, 208, 208, 0.5), rgba(38, 198, 38, 0.5)); box-shadow: 0 0 25px rgba(0, 208, 208, 0.4); transform: translateY(-2px);`.
   - **Botón Crear Cuenta (`.btn-auth-register`)**:
     - `background: linear-gradient(135deg, rgba(38, 198, 38, 0.2), rgba(0, 208, 208, 0.2)); border: 2px solid #26C626; color: #26C626; border-radius: 12px; font-weight: 700; text-transform: uppercase; font-size: 1rem; padding: 14px 24px; cursor: pointer; width: 100%; margin-bottom: 15px;`.
     - Hover: `background: linear-gradient(135deg, rgba(38, 198, 38, 0.4), rgba(0, 208, 208, 0.4)); box-shadow: 0 0 25px rgba(38, 198, 38, 0.4); transform: translateY(-2px);`.
   - **Separador Horizontal (`.auth-divider`)**:
     - Líneas `::before` y `::after` con `flex: 1; height: 1px; background: var(--border);` y texto central `span` `"o"` (`padding: 0 15px; color: var(--muted);`).
   - **Botón Google OAuth (`.btn-auth-google`)**:
     - `background: rgba(255, 255, 255, 0.95); border: 2px solid rgba(255, 255, 255, 0.3); color: #333; border-radius: 12px; font-weight: 600; font-size: 1rem; padding: 14px 24px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;`.
     - **Logo de Google SVG Multicolor Obligatorio**: Usar NUNCA `<i class="fa fa-google"></i>`. Usar SIEMPRE el logo SVG oficial multicolor con cuatro rutas exactas (`#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`):
       ```html
       <svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
       ```
     - Hover: `background: #fff; box-shadow: 0 0 20px rgba(255, 255, 255, 0.3); transform: translateY(-2px);`.

---

### Marcado Canónico HTML (`index.html`)

```html
<!-- MODAL DE AUTENTICACIÓN FIREBASE -->
<div id="auth-modal" class="modal-overlay auth-modal">
     <div class="modal-content auth-modal-content">
          <div class="auth-header">
               <i class="fa fa-user-circle auth-icon"></i>
               <h2>Acceso a Galería</h2>
               <p class="auth-subtitle">Inicia sesión o crea una cuenta para acceder</p>
          </div>
          
          <div id="auth-login-form">
               <div class="form-group">
                    <label><i class="fa fa-envelope"></i> Email</label>
                    <input type="email" id="auth-email" placeholder="tu@email.com" autocomplete="email" />
               </div>
               <div class="form-group">
                    <label><i class="fa fa-lock"></i> Contraseña</label>
                    <input type="password" id="auth-password" placeholder="••••••••" autocomplete="current-password" />
               </div>
               <div id="auth-error" class="auth-error"></div>
               <button id="auth-login-btn" class="btn-auth-login">
                    <i class="fa fa-sign-in-alt"></i> Iniciar Sesión
               </button>
               <button id="auth-register-btn" class="btn-auth-register">
                    <i class="fa fa-user-plus"></i> Crear Cuenta
               </button>
               <div class="auth-divider">
                    <span>o</span>
               </div>
               <button id="auth-google-btn" class="btn-auth-google">
                    <svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg> Continuar con Google
               </button>
          </div>
          
          <div id="auth-user-info" class="auth-user-info hidden">
               <div class="user-avatar">
                    <img id="auth-user-photo" src="" alt="Foto de perfil">
                    <div id="auth-user-initial" class="user-initial"></div>
               </div>
               <div class="user-details">
                    <p id="auth-user-name" class="user-name"></p>
                    <p id="auth-user-email" class="user-email"></p>
               </div>
               <button id="auth-logout-btn" class="btn-auth-logout">
                    <i class="fa fa-sign-out-alt"></i> Cerrar Sesión
               </button>
          </div>
     </div>
</div>
```

---

### Lógica Técnica y Resiliencia de Autenticación (Firebase Auth)

```javascript
// Inicialización y configuración de Firebase Auth
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Observador central del estado de autenticación
auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
});

// Login con Email y Contraseña
async function loginWithEmail() {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password) return showAuthError('Introduce email y contraseña');
    clearAuthError();
    authLoginBtn.disabled = true;
    authLoginBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Entrando...';
    try {
        await auth.signInWithEmailAndPassword(email, password);
        authModal.style.display = 'none';
    } catch (error) {
        showAuthError(parseAuthError(error));
    } finally {
        authLoginBtn.disabled = false;
        authLoginBtn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Iniciar Sesión';
    }
}

// Registro con Email y Contraseña
async function registerWithEmail() {
    const email = authEmail.value.trim();
    const password = authPassword.value;
    if (!email || !password || password.length < 6) return showAuthError('La contraseña requiere al menos 6 caracteres');
    clearAuthError();
    authRegisterBtn.disabled = true;
    authRegisterBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creando cuenta...';
    try {
        await auth.createUserWithEmailAndPassword(email, password);
    } catch (error) {
        showAuthError(parseAuthError(error));
    } finally {
        authRegisterBtn.disabled = false;
        authRegisterBtn.innerHTML = '<i class="fa fa-user-plus"></i> Crear Cuenta';
    }
}

// Login con Google OAuth
async function loginWithGoogle() {
    clearAuthError();
    authGoogleBtn.disabled = true;
    authGoogleBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Conectando...';
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await auth.signInWithPopup(provider);
    } catch (error) {
        showAuthError('Error al iniciar sesión con Google');
    } finally {
        authGoogleBtn.disabled = false;
        authGoogleBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align: middle; margin-right: 8px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg> Continuar con Google';
    }
}
```

