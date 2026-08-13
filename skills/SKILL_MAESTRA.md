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

Toda app o web debe incluir e integrar copias de estos archivos canónicos:

- `E:/ANTIGRAVITY/skills/proxy.php`: único punto servidor para llamadas protegidas y comprobación de salud. El frontend nunca llama directamente a una API que requiera una clave.
- `E:/ANTIGRAVITY/skills/history.php`: API de persistencia en Hostinger.
- `E:/ANTIGRAVITY/skills/history-manager.js`: cliente JavaScript de `history.php`; carga, guarda, elimina, limpia y notifica cambios.

Reglas de integración:

1. Copiar los tres archivos a la carpeta pública de la app. En una app existente, comparar primero y conservar adaptaciones válidas.
2. Cargar `history-manager.js` antes del código que lo use.
3. Crear una instancia con nombre único: `new HistoryManager('nombre_app')`.
4. Ejecutar `load()` al iniciar y renderizar el resultado del servidor.
5. Usar `save()`, `delete()` y `clear()` para cualquier contenido o dato persistente. El servidor es la fuente de verdad; no sustituirlo por `localStorage` o una caché exclusivamente local.
6. Mostrar errores de persistencia en la interfaz; no simular éxito si el servidor falla.
7. No versionar `history_data/`, archivos generados, credenciales ni `config.php` privado.
8. Verificar en producción que el historial continúa tras recargar y desde otro navegador o sesión cuando sea posible.
9. Incluso una web sin IA debe conservar `proxy.php` como endpoint de salud; si incorpora una API, ampliar el proxy con una acción cerrada y validada, nunca con una URL arbitraria enviada por el cliente.

## Backend, proveedores y seguridad

- Mantener este mapa del `.htaccess` raíz privado de Hostinger: `F` para FLUX y `R` para OpenRouter. No intercambiarlas.
- Guardar FLUX como `SetEnv F "..."` y OpenRouter como `SetEnv R "..."`; nunca escribir sus valores en Git, frontend, documentación, capturas compartidas ni respuestas.
- Resolver ambas claves en servidor mediante `config.php`, `getenv`, variantes `REDIRECT_`, `$_SERVER` y `$_ENV`.
- Usar FLUX para toda generación o edición de imágenes.
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

1. En apps con selector multimodelo, generar y editar imágenes con FLUX de Black Forest Labs o Gemini mediante OpenRouter según el botón elegido; no fijar FLUX ignorando la selección del usuario.
2. Ofrecer el selector canónico de cuatro modelos descrito al final de esta skill, relación de aspecto y resolución `512`, `1024`, `2048` y `4096`.
3. Mapear `flux-pro` a `flux-2-pro`, `flux-max` a `flux-2-max`, `gemini-flash` a `google/gemini-3.1-flash-image` y `gemini-pro` a `google/gemini-3-pro-image`, salvo migración confirmada de la API oficial.
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

## Selector de Modelo IA: patrón canónico de toggles pill hoola

Aplicar este patrón en toda app de generación o edición de imágenes que ofrezca varios modelos.

### Estilo (única especificación)

El campo selector de modelo IA es una **barra de toggles pill unificada** (estilo validado por Antonio, 2026-08-09, implementado en `apps/imagenes_ia/editar_copia`):

- **Un solo contenedor** de vidrio azulado `var(--card-bg)` con borde cian `var(--border)`, radio de píldora (`999px`), halo exterior suave y `gap:.5rem` entre botones. NO botones individuales separados fuera de la barra.
- **Botones pill** con `padding:.55rem 1rem`, borde transparente por defecto, texto `var(--muted)`, tipografía Electrolize y `text-transform:uppercase`.
- **Estados**: el segmento activo se resalta con gradiente `var(--contenedor) → var(--acc)` (cian) y texto `#CCFFFF` con glow; los inactivos, texto `var(--muted)` sobre fondo transparente.
- **NO usar estados separados flux/gemini**: el activo es único para los 4 modelos (sin clases `flux`/`gemini` en el HTML).

### Orden de los modelos (menor → mayor capacidad)

Siempre en este orden de izquierda a derecha, de menor a mayor capacidad (validado con precios oficiales de Black Forest Labs y OpenRouter):

1. `3.1FLASH` — `gemini-flash` — `google/gemini-3.1-flash-image`
2. `3 PRO` — `gemini-pro` — `google/gemini-3-pro-image` — **seleccionado por defecto**
3. `FLUX PRO` — `flux-pro` — `flux-2-pro`
4. `FLUX MAX` — `flux-max` — `flux-2-max`

No cambiar este orden ni el estado inicial: **3 PRO por defecto**.

### Marcado HTML

```html
<div class="model-selector">
  <span class="model-selector-label">Modelo IA</span>
  <div class="model-toggle-group" role="group" aria-label="Seleccionar modelo">
    <button type="button" class="model-toggle" data-model="gemini-flash">3.1FLASH</button>
    <button type="button" class="model-toggle active" data-model="gemini-pro">3 PRO</button>
    <button type="button" class="model-toggle" data-model="flux-pro">FLUX PRO</button>
    <button type="button" class="model-toggle" data-model="flux-max">FLUX MAX</button>
  </div>
</div>
```

No añadir clases `flux`/`gemini` a los botones: el activo se marca únicamente con `active`.

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

### CSS canónico responsive (toggles pill hoola)

Copiar este bloque completo, idéntico al implementado en `apps/imagenes_ia/editar_copia`:

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
```

**Validación visual (Antonio, 2026-08-09):** los botones pill NO deben tocarse entre sí. Usar `gap:.5rem` dentro del contenedor `inline-flex` y NO usar `border-left` divisor. Barra centrada debajo de todos los campos.

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
let selectedModel = 'gemini-pro';
document.querySelectorAll('.model-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.model-toggle').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    selectedModel = button.dataset.model;
  });
});

// React
const [selectedModel, setSelectedModel] = useState('gemini-pro');
useEffect(() => { window.selectedModel = selectedModel; }, [selectedModel]);
// Incluir siempre en el payload: model: selectedModel
```

No cambiar solo el aspecto: comprobar que cada botón actualiza el estado y que el `fetch` envía el identificador elegido.

### Mapeo seguro en PHP

```php
$reqModel = strtolower((string)($data['model'] ?? 'gemini-pro'));
$backend = 'gemini';
$geminiModelId = 'google/gemini-3-pro-image';
$fluxEndpoint = 'flux-2-pro';

if (strpos($reqModel, 'max') !== false) {
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-max';
} elseif (strpos($reqModel, 'pro') !== false && strpos($reqModel, 'flux') !== false) {
    $backend = 'flux';
    $fluxEndpoint = 'flux-2-pro';
} elseif (strpos($reqModel, 'flash') !== false) {
    $geminiModelId = 'google/gemini-3.1-flash-image';
}
```

Comparar siempre `strpos(...) !== false`; no usar el resultado como booleano. Mantener `gemini-pro` como fallback seguro para valores omitidos.

### Validación y publicación obligatorias

1. Confirmar que la app de referencia no aparece en el diff cuando solo es el origen visual.
2. Probar que la barra de toggles no desborda el panel y que no existe scroll horizontal ni texto recortado.
3. Verificar las cuatro etiquetas completas: `3.1FLASH`, `3 PRO`, `FLUX PRO`, `FLUX MAX`.
4. Probar estados normal, hover y activo: activo con gradiente `contenedor→cian` y texto `#CCFFFF`.
5. Probar los cinco botones AR: icono y texto legibles, selección funcional y foco visible.
6. Confirmar `gemini-pro` (3 PRO) como estado inicial y revisar el payload de los cuatro botones.
7. Actualizar la versión de `app.css` o `app.js` en `index.html` cuando exista cache busting.
8. Revisar el diff, crear commit, hacer push a la rama de despliegue y verificar la URL real sin caché antigua.
