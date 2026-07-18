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

### Fuente canónica de estilo y overlay

**`apps/dibujo_lineas_copia`** es la referencia visual única y obligatoria para toda app o web nueva de Antigravity. Contiene la paleta exacta, el fondo, los tokens CSS, la tipografía, el glassmorphism, los bordes, los halos, la rejilla de circuito, las tarjetas, los botones, los controles, el overlay de carga y todos los estados visuales. Cualquier agente debe **leer sus archivos `app.css` e `index.html` completos** antes de crear o retematizar una interfaz.

Reglas:

1. **Estilo**: copiar los tokens `:root` y el fondo (`body::before` + `body::after`) exactamente como están en `dibujo_lineas_copia/app.css`. Usar sus mismas clases y variables; no improvisar colores, grosores de borde, radios ni sombras.
2. **Overlay de carga**: copiar la estructura HTML (`.loading-overlay`, `.spinner-triple`, `.loading-text`, `.progress-panel`, `.progress-bar-track`, `.progress-bar-fill`, `.secondary-status`) y el CSS completo del overlay de `dibujo_lineas_copia`. El texto "IA generando lo solicitado..." y la barra de progreso indeterminada son obligatorios.
3. **Cabecera**: usar el mismo `h1` con triple glow cian (`text-shadow: 0 0 10px var(--glow), 0 0 24px var(--glow), 0 0 44px var(--glow-soft)`), uppercase, y subtítulo con tracking amplio.
4. **Adaptación**: conservar las clases y funcionalidades propias de cada app, pero aplicarles los tokens de `dibujo_lineas_copia`. Si una app existente usa otra paleta, retematizarla sustituyendo `:root` y el fondo; luego barrer cualquier color hardcodeado que no coincida con la paleta canónica.

### Accesibilidad y usabilidad

Toda interfaz debe:

- Ser responsive en móvil, tableta y escritorio, sin scroll horizontal accidental.
- Tener objetivos táctiles cómodos, textos legibles y controles utilizables con teclado.
- Incluir foco visible, `alt` correcto, etiquetas de formulario, jerarquía de encabezados y regiones semánticas.
- Usar `aria-live` para resultados/errores dinámicos y `aria-busy` durante procesos.
- Respetar `prefers-reduced-motion` cuando haya animaciones relevantes.
- Mostrar estados de carga reales; deshabilitar acciones duplicadas y ofrecer reintento tras errores.
- Mantener la entrada del usuario si una operación falla.
- Evitar placeholders, enlaces muertos, acciones sin implementar y mensajes técnicos crudos.
## Reglas para apps de generación o edición de imágenes

1. Generar y editar imágenes exclusivamente con FLUX de Black Forest Labs.
2. Ofrecer selector `PRO` / `MAX`, relación de aspecto y resolución `512`, `1024`, `2048` y `4096`.
3. Mapear `PRO` a `flux-2-pro` y `MAX` a `flux-2-max`, salvo que la API oficial exija una migración posterior.
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

El trabajo solo está terminado cuando el resultado es utilizable, está validado en proporción a su riesgo y no quedan fallos conocidos dentro del alcance solicitado.
