---
name: unified-image-studio-hoola
description: "Manual de uso de la app Unified Image Studio · Hoola: convierte una pregunta de Antonio («¿cómo genero…?», «¿dónde está…?», «no me sale…») en un paso a paso exacto sobre su interfaz real. Actívala con cualquier duda de manejo de esa app (generar, editar, máscara, quitar fondo, recortar, texto, logo, escenario, prenda, vídeo, biblioteca, exportar, guardar/versiones/proyectos, contraseña o compuerta de modelos) y cuando pida «explícame cómo se hace», «dame los pasos» o «¿por qué no me deja?». No sirve para modificar la app: para eso, `crear` + `cirujano-codigo-produccion`."
---

# Unified Image Studio · Hoola — manual de uso

## Para qué sirve esta skill

Antonio usa esta app y se pierde: tiene tres modos, seis pestañas de herramientas, dos paneles
laterales y una compuerta de contraseña. Esta skill le da al agente el mapa exacto de la interfaz
(etiquetas reales, sitios reales) para responder **cómo conseguir un resultado concreto**, sin
inventar botones ni mandarle a leer código.

**Esta skill no modifica la app.** Si el encargo es cambiar algo de la app, se aplican
`crear`/`cirujano-codigo-produccion`; aquí solo se explica cómo se usa.

## Regla de oro

Responde con **pasos numerados, en el orden en que se hacen, con el texto literal del control entre
«»**, y di siempre **dónde está** (barra de arriba, columna izquierda, panel derecho, lienzo).
Si el usuario no ha iniciado sesión o no tiene el PC de Flow encendido, ningún paso funcionará:
comprueba eso primero y dilo antes de dar la receta.

## Ficha de la app

| Dato | Valor |
|---|---|
| Nombre visible | `Unified Image Studio · Hoola` (marca `UIS`, etiqueta `HOOLA`) |
| URL publicada | `https://atnojs.es/apps/unified-image-studio-hoola/` |
| Ruta en el repo | `apps/unified-image-studio-hoola/` |
| Versión | `3.0.0-hoola` (sello en la barra inferior) |
| Qué es | Estudio de imagen por capas: importar, generar con IA, editar, componer y exportar |
| Backend | PHP (`api.php` + `proxy.php` + `lib/`), SQLite en `storage/`; sin él solo se edita y exporta |
| Motores | Google Flow en el PC (imágenes y vídeo) + proveedores directos (OpenAI, Gemini, Qwen) |
| Apps hermanas | `apps/unified-image-studio/` (original) y `apps/unified-app/`: **no** son esta app |

## Antes de responder: tres comprobaciones

1. **¿Está dentro?** Si al abrir sale el modal «Acceso privado», hay que entrar: sin sesión se
   puede editar y exportar, pero **no generar**. Si el modal no sale y aparece el aviso
   «Servidor PHP no disponible…» o el estado de Flow se queda en `inicia sesión`, es que el backend
   no responde (o no hay sesión), no que la app esté rota.
2. **¿Qué motor va a usar?** Flow necesita que el PC con el agente de Flow esté encendido y
   conectado (indicador de Flow en la barra de arriba y «Estado del PC» en la pestaña Vídeo).
   Los modelos directos (IMAGE 2, OPENAI 2.5, GEMINI, QWEN) no necesitan el PC.
3. **¿El modelo está protegido?** Los modelos caros piden otra vez la contraseña al pulsarlos. La
   compuerta mira **la pestaña del navegador**, no la sesión: estar dentro no la desbloquea, y en una
   pestaña nueva vuelve a pedirla. Si no la tiene a mano, ofrécele un camino con los modelos libres.

## Mapa de la pantalla

### 1. Barra superior (de izquierda a derecha)

Marca `UIS · Unified Image Studio · HOOLA`; navegación **Imagen / Vídeo / Biblioteca**; nombre del
proyecto y `× —` (dimensiones); estado de Flow (`Flow: comprobando…`, con su botón de refrescar);
estado de guardado («Sin guardar» / guardado); botón de sesión (icono de candado, «Acceso y sesión»);
botón **«Exportar»**; botón para mostrar/ocultar el panel derecho.

En el mismo grupo de acciones de la barra están **deshacer**, **rehacer**, **ajustar al espacio**,
**ver al 100 %** (el botón que muestra `1:1`), **comparar antes/después**, **zoom − / +** y el valor
de zoom.

### 2. Columna de herramientas (barra vertical izquierda)

Seis pestañas, de arriba abajo:

| Pestaña | Qué contiene |
|---|---|
| **Generar** | Descripción, modelo, proporción, resolución, referencias, resultado de IA y «GENERAR» |
| **Editar** | Máscara de capa, recorte/redimensión/giro, inpainting y quitar fondo |
| **Componer** | Texto, formas, logo y alineación |
| **Producto** | Puesta en escena (escenarios) y probar prenda |
| **Utilidades** | Datos del documento, proyecto (.uis.json), almacenamiento y diagnóstico |
| **Ayuda** | Modal «Atajos y ayuda» (la lista oficial de atajos) |

### 3. Lienzo (centro)

Zona de trabajo con la imagen y las capas. Vacío muestra **«Empieza con una imagen»**: arrastrar un
PNG/JPG/WebP, pegar con `Ctrl+V`, «Importar imagen» o «Empezar en blanco». Límites visibles:
**máx. 20 MB · 8192 px de lado**.

### 4. Panel derecho (cuatro pestañas)

| Pestaña | Qué contiene |
|---|---|
| **Capas** | Propiedades de la capa (opacidad, X, Y, An, Al), duplicar/borrar, subir/bajar, lista de capas |
| **Referencias** | Rejilla de referencias del proyecto y «Añadir referencia» |
| **Biblioteca** | Recursos del proyecto (imágenes ya subidas/generadas) |
| **Recetas** | Nombre + «Guardar ajustes actuales» y lista de recetas |

Debajo de «Capas» viven también **«Versiones de este documento»** (con «Guardar versión») y
**«Proyectos»** (lista, «Nuevo proyecto»).

### 5. Barra inferior

Documento, selección, posición del cursor, modo, zoom y sello de versión.

## Arranque: entrar y desbloquear

1. Abrir `https://atnojs.es/apps/unified-image-studio-hoola/`.
2. Si aparece **«Acceso privado»**, escribir la contraseña de acceso del proyecto (`PW_ACCESS`) y
   pulsar **«Entrar»**. Es la misma contraseña que en el resto de apps; **no se muestra ni se pide
   en el chat**: si no la recuerda, que la consulte él.
3. Si el modal no aparece y la app avisa de que trabaja en local, pulsar **«Reintentar conexión»**
   o abrir `api.php?action=state`. **«Seguir en local»** sirve para editar y exportar, nada más.
4. La compuerta de modelos pide **otra vez** la contraseña al pulsar un modelo protegido y la
   recuerda mientras dure esa pestaña; en una pestaña nueva vuelve a pedirla. **Escape no cierra**
   el modal de acceso (el cursor está en el campo de contraseña): se cierra con ✕ o «Seguir en local».

## Árbol de decisión: lo que pide → flujo

| Lo que quiere | Flujo |
|---|---|
| «Que la app me deje entrar / no me carga» | F1 |
| «Partir de una foto mía» | F2 |
| «Crear una imagen de cero» | F3 |
| «Cambiar una parte de la imagen» | F4 |
| «Quitar el fondo» | F5 |
| «Recortar / hacerla más grande / girarla» | F6 |
| «Poner un texto, una forma o mi logo» | F7 |
| «Poner el producto en un escenario» | F8 |
| «Ver la prenda puesta» | F9 |
| «Hacer un vídeo» | F10 |
| «Ver / descargar lo que he generado» | F11 |
| «Guardar la imagen en un archivo» | F12 |
| «No perder el trabajo / volver atrás» | F13 |
| «Mover, ocultar o borrar una parte» | F14 |
| «Repetir los mismos ajustes» | F15 |
| «Atajos / comparar antes y después» | F16 |
| «Se me quedó a medias / cerré la pestaña» | F17 |
| «En el móvil no veo los paneles» | F18 |
| «La app no arranca / pantalla de error» | F19 |
| «Cerrar sesión» | F20 |

## Flujos paso a paso

### F1 · Entrar y dejar la app lista

1. Abrir la URL publicada.
2. «Acceso privado» → contraseña → **«Entrar»**.
3. Comprobar la barra superior: el estado de Flow debe resolverse (conectado o «inicia sesión») y el
   indicador de guardado cambia a guardado cuando se guarda (`Ctrl+S`).
4. Comprobar el motor: si no hay PC de Flow, usar modelos directos (ver «Modelos»).

**Qué verá:** el lienzo vacío con «Empieza con una imagen» y el panel «Generación» a la izquierda.
**Si falla:** el mensaje literal y su causa están en «Errores frecuentes».

### F2 · Empezar con una imagen propia

1. Arrastrar el archivo al lienzo **o** pulsar `Ctrl+V` para pegar **o** **«Importar imagen»**.
2. Formatos: PNG, JPG, WebP. **Los GIF no se admiten** (hay que exportar un fotograma).
3. Límites: 20 MB y 8192 px de lado.
4. La imagen entra como **capa**; se selecciona en el panel derecho «Capas».

**Si falla:** «no es un PNG, JPG, WebP o GIF válido», «supera el límite de 20 MB» o «supera 8192 px
de lado». Con archivos muy grandes, reducir antes de subir.

### F3 · Generar una imagen de cero

1. Pestaña **«Generar»** (icono de destellos, la primera de la izquierda).
2. Escribir en **«Descripción de la imagen»** (máx. **12.000** caracteres). Estructura recomendada:
   sujeto + acción + escena + luz + estilo, y qué texto debe llevar (en español).
3. Elegir **Modelo** con las píldoras. Camino simple si no hay PC de Flow: **IMAGE 2 · «LOW»**
   (sin compuerta; la sesión sigue siendo necesaria). Camino con PC encendido:
   **FLOW · GOOGLE · «NANO BANANA 2»**.
4. **Proporción**: `1:1`, `4:5`, `3:4`, `2:3`, `16:9`, `9:16`, `3:2`, `4:3`, `21:9`. **Con Flow**, las
   que no admite (`4:5`, `2:3`, `3:2`, `21:9`) aparecen **desactivadas** en la lista: no se pueden
   elegir. Si alguna llegara al servidor con Flow, cae a `1:1`.
5. **Resolución**: `512`, `1024`, `2048`, `4096` con los modelos directos. **Con Flow el control está
   desactivado**: Flow genera a su resolución nativa (~1K).
6. **Referencias** (opcional): «Añadir referencia» y asignar papel (producto, identidad, estilo, pose
   o composición). El límite de la interfaz es **8**, pero **con Flow solo viajan las 2 primeras**.
   Solo se envían al generar.
7. Si quiere partir de lo que ya hay en el lienzo: **«Usar lienzo como referencia»**.
8. Pulsar **«GENERAR»**.
9. Esperar: overlay **«IA generando imagen…»** con barra indeterminada y el aviso
   «Enviando la solicitud al proveedor. No cierres esta pestaña.». No se puede lanzar otra mientras
   dura.
10. En **«Resultado de IA»**: **«Aceptar»** (entra como capa nueva), **«Regenerar»**,
    **«Guardar variante»** o **«Descartar»**.

**Opcional — varias imágenes de una vez:** con Flow, «Imágenes por encolado» `1`–`4` encola varias
generaciones seguidas en el PC (con modelos directos ese selector está desactivado).

### F4 · Cambiar una parte de la imagen (inpainting)

1. Seleccionar la capa en el panel derecho **«Capas»**.
2. Pestaña **«Editar»**.
3. En **«Máscara de la capa»**: **«Pintar»**, ajustar «Tamaño del pincel» y «Dureza» y pintar la
   zona sobre el lienzo. «Borrar» corrige lo pintado.
4. Escribir la **«Instrucción de inpainting»** (qué debe aparecer en esa zona).
5. **«Rellenar la máscara»** y aceptar el resultado igual que en F3.

**Extras:** «Invertir» (necesita algo pintado), «Limpiar», «Ocultar máscara».

### F5 · Quitar el fondo

Dos caminos, misma pestaña **«Editar»**:

| Botón | Qué hace | Cuándo |
|---|---|---|
| **«Quitar fondo por color (local)»** | Analiza el color de las esquinas; no envía nada al proveedor | Fondos uniformes (estudio, color plano) |
| **«Quitar fondo con IA»** | Envía la imagen al proveedor; conserva el original como recurso aparte | Fondos complejos, pelo, transparencias |

Después hay que **«Aceptar»** el resultado. Los textos y logos se mantienen como capas aparte.

### F6 · Recortar, redimensionar, girar

- **«Recortar»**: abre «Recortar documento» con X, Y, Ancho y Alto; **«Recortar»** aplica. Las capas
  conservan su posición relativa.
- **«Redimensionar»**: «Redimensionar documento» con Ancho/Alto y «Mantener proporción»;
  **«Aplicar»** reescala la composición (los originales no se tocan).
- **`90° ↻`**, **`90° ↺`**, **`↔`** (voltear) actúan sobre la capa.

### F7 · Texto, formas y logo

1. Pestaña **«Componer»**.
2. **Texto**: rellenar «Contenido», «Tamaño» (por defecto 64), «Color», «Grosor»
   (Regular/Semibold/Bold), «Alineación» y pulsar **«Añadir texto»**.
3. **Formas**: elegir Rectángulo, Elipse o Línea, ajustar «Relleno», «Borde» y «Grosor del borde»,
   y dibujar arrastrando en el lienzo.
4. **Logotipo**: **«Importar logo como capa»**.
5. **Alinear**: con una capa seleccionada, los botones de alineación del bloque «Alinear».
6. Los textos y logos quedan como capas independientes: se pueden recolocar después de editar el fondo.

### F8 · Poner el producto en un escenario

1. Pestaña **«Producto»** → **«Puesta en escena»**.
2. Elegir **«Escenario»**: Estudio neutro, Interior de tienda, Exterior urbano o Bodegón.
3. **«Componer escenario»**. Usa la capa seleccionada y el modelo activo, y exige proveedor
   configurado (si no hay servidor, no envía nada).

### F9 · Ver la prenda puesta

1. Pestaña **«Producto»** → **«Prenda o producto»**.
2. Escribir la **«Descripción de la prenda»**.
3. **«Probar sobre la imagen»** y aceptar el resultado.
4. Aviso que hay que repetirle siempre: son **propuestas editables**; no hay fidelidad exacta de
   prendas, rostros ni productos.

### F10 · Generar un vídeo

1. Pulsar **«Vídeo»** en la navegación superior (cambia la app al modo vídeo).
2. Escribir **«Describe el vídeo»** (máx. **1.500** caracteres).
3. **«Fotograma inicial»** (opcional): «Elegir imagen» o **«Usar el lienzo como fotograma inicial»**;
   «Quitar» lo elimina.
4. **Modelo de vídeo**: `VEO 3.1 LITE` (libre), `VEO 3.1 FAST` (libre), `VEO 3.1 QUALITY`
   (protegido), `OMNI FLASH` (protegido).
5. **Formato**: `16:9` o `9:16`. Flow no genera otra cosa.
6. **«Estado del PC»** → **«Comprobar conexión»**. Si no responde, el vídeo no se puede generar.
7. **«GENERAR VÍDEO»**. Queda **en cola**: se puede cerrar la pestaña y se recupera en Biblioteca.

### F11 · Biblioteca: ver, ampliar, descargar, parar

1. **«Biblioteca»** en la navegación superior (o la pestaña «Biblioteca» del panel derecho).
2. Filtros **TODO / IMÁGENES / VÍDEOS**; **«Actualizar»** refresca.
3. Cada resultado se abre ampliado: **rueda del ratón** para zoom (1x–8x), **arrastrar** para mover,
   **clic** (sin arrastrar) o `Escape` para cerrar. Los vídeos se reproducen en el visor.
4. Acciones por trabajo: descargar, parar una generación en curso o quitarlo de la cola, eliminar.
5. Si está vacía: «Todavía no hay resultados…» y un botón «GENERAR».

### F12 · Exportar la imagen

1. **«Exportar»** (barra superior o `Ctrl+E`) → modal «Exportar imagen».
2. **Formato**: PNG, JPG o WebP. **Calidad** (JPG/WebP, 92 % por defecto).
3. **Escala**: `25 %`, `50 %`, `100 % (documento)`, `200 %`. **DPI**: solo metadatos de impresión.
4. **Fondo para JPG** (el JPG no admite transparencia) y «Mantener transparencia» (PNG/WebP).
5. **«Exportar»** descarga el archivo; **«Copiar»** lo manda al portapapeles.
6. La vista previa del modal muestra las dimensiones finales antes de exportar.

### F13 · Guardar, versiones y proyectos

- **Guardar**: `Ctrl+S` o el indicador de guardado de la barra (pasa de «Sin guardar» a guardado).
- **Versiones**: panel derecho «Capas» → **«Versiones de este documento»** → **«Guardar versión»**;
  la lista permite volver a una versión anterior.
- **Proyectos**: `Ctrl+O` o el botón de proyecto → «Proyectos»: abrir uno, **«Nuevo proyecto»**,
  eliminar.
- **Archivo**: pestaña **«Utilidades»** → **«Descargar proyecto (.uis.json)»**,
  **«Importar proyecto»**, **«Duplicar proyecto»**.
- **Caché**: «Utilidades» → **«Vaciar caché local»** libera espacio en el navegador. Si un proyecto
  vive solo en local, **descargarlo antes** (`.uis.json`).

### F14 · Capas: mover, ocultar, borrar

1. Panel derecho **«Capas»**: seleccionar en la lista.
2. Ajustar **Opacidad** o escribir **X**, **Y**, **An**, **Al**.
3. En cada fila de la lista: **ojo** (ocultar/mostrar la capa) y **candado** (bloquearla para que no
   se mueva al hacer clic); **arrastrar la fila** la reordena.
4. **«Añadir capa»**, subir/bajar, **duplicar capa** (icono o `Ctrl+D`) y eliminar capa (`Supr`).
5. En el lienzo, la herramienta de selección (`V`) mueve y redimensiona.
6. **Alinear**: con una capa seleccionada, los botones de «Componer → Alinear» (seis ejes).
7. **DPI del documento**: en «Utilidades» → «DPI del documento» (por defecto 300).

### F15 · Recetas (repetir los mismos ajustes)

1. Panel derecho **«Recetas»**.
2. Escribir **«Nombre de la receta»** → **«Guardar ajustes actuales»**.
3. Una receta guarda **modelo, proporción, resolución, referencias y prompt**; se aplica desde su
   lista y es independiente del documento.
4. Si la receta usa un modelo protegido, pedirá la contraseña al aplicarla.

### F16 · Atajos y comparación

| Atajo | Acción |
|---|---|
| `V` | Seleccionar y mover |
| `B` / `E` | Pincel de máscara / borrar máscara |
| `T` / `R` | Texto / forma |
| `H` o `Espacio` | Desplazar el lienzo |
| `Shift+1` / `Shift+2` | Ajustar al espacio / ver al 100 % |
| `C` | Comparar antes/después |
| `+` / `−` / `0` | Zoom / centrar |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Deshacer / rehacer |
| `Ctrl+S` / `Ctrl+E` / `Ctrl+O` | Guardar / exportar / proyectos |
| `Ctrl+D` | Duplicar la capa seleccionada |
| `Supr` | Eliminar capa |

**Comparar** necesita un resultado de IA previo aceptado; si no lo hay, avisa de que no hay estado
anterior. La lista oficial siempre está en **«Ayuda»** (modal «Atajos y ayuda») y es la que manda.
**Ningún atajo funciona con el cursor dentro de un campo**: primero hay que salir de él.

### F17 · Recuperar un trabajo que quedó a medias

1. Si se cerró la pestaña o se cortó la red con una generación en curso, al volver a abrir sale
   «Hay un trabajo en curso en el servidor (…). Se recupera sin volver a enviarlo.»
2. La app retoma el trabajo sola y muestra la vista previa: se acepta o se descarta como cualquier
   otro resultado.
3. Si no se puede recuperar («No se pudo recuperar el trabajo: …»), mirar en **Biblioteca** antes de
   volver a generar: no se ha reenviado ni se ha vuelto a cobrar.

### F18 · Móvil y paneles

1. En pantalla estrecha, los paneles izquierdo y derecho se abren **superpuestos** sobre el lienzo.
2. Se abren desde sus pestañas (la columna de iconos y «Capas») y se cierran con ✕ o tocando el
   fondo oscuro.
3. El lienzo se desplaza con la herramienta mano (`H` o `Espacio`) y se amplía con `+` / `−`.

### F19 · Si la app no arranca

1. Si aparece la pantalla **«La aplicación no ha arrancado»**, pulsar **«Recargar sin caché»**.
2. Si vuelve a salir, **«Copiar diagnóstico»** copia URL, problemas y navegador: que lo pegue en el
   chat y se revisa con eso.
3. Esa pantalla aparece sola cuando el estudio no puede iniciarse; no es un fallo raro del navegador.

### F20 · Cerrar sesión

1. Pulsar el botón de sesión de la barra superior (el candado cambia a candado abierto con sesión).
2. Si hay sesión, abre «Sesión iniciada» con la pregunta de cerrarla; confirmar con
   **«Cerrar sesión»**.
3. La app sigue funcionando en local: se puede editar y exportar, pero no generar.

## Qué verás mientras trabaja

El overlay de carga (tres aros + barra indeterminada) cambia de texto según la operación. Sirve para
saber que la app está trabajando y no colgada:

| Operación | Título | Segundo aviso |
|---|---|---|
| Generar imagen | «IA generando imagen…» | «Enviando la solicitud al proveedor. No cierres esta pestaña.» |
| Rellenar la máscara | «Rellenando la máscara…» | «Se envía la composición y la máscara al proveedor.» |
| Quitar fondo por color | «Recortando el fondo…» | «Análisis de color local, sin enviar nada al servidor.» |
| Quitar fondo con IA | «Quitando el fondo con IA…» | «Se envía la imagen seleccionada al proveedor.» |
| Componer escenario | «Componiendo escenario…» | «Propuesta editable, no una reproducción exacta.» |
| Probar prenda | «Probando la prenda…» | «Propuesta editable; revisa el resultado antes de publicar.» |

El vídeo no usa este overlay: se encola y su progreso se sigue en **Biblioteca** («En cola…»).

## Modelos: cuál recomendar y por qué

Libres = no piden contraseña. Protegidos = piden la contraseña de acceso al pulsarlos.

| Grupo | Etiqueta | Identificador | Compuerta | Cuándo recomendarlo |
|---|---|---|---|---|
| FLOW · GOOGLE | NANO BANANA 2 | `flow-nano-banana-2` | libre | Motor inicial de un trabajo nuevo (viene activo) |
| FLOW · GOOGLE | NANO BANANA PRO | `flow-nano-banana-pro` | libre | Más detalle, tarda algo más |
| FLOW · GOOGLE | NANO BANANA 2 LITE | `flow-nano-banana-2-lite` | libre | El más rápido |
| OPENAI 2.5 | MEDIUM / HIGH / MAX FLARE | `openai-medium` / `openai-high` / `openai-max-flare` | protegido | Calidad creciente del modelo flare |
| OPENAI 2.5 | XHIGH / MAX SUNBURST | `openai-xhigh` / `openai-max-sunburst` | protegido | Edición precisa y consistencia de rostros |
| GEMINI | GEMINI 2 | `gemini-2` | protegido | El más ligero del grupo |
| GEMINI | 3.1 FLASH | `gemini-flash` | protegido | Rápido y bueno con texto |
| GEMINI | 3 PRO | `gemini-pro` | protegido | Máxima calidad para texto |
| QWEN | QWEN 3 PRO | `qwen-pro` | protegido | Texto nítido y diseños densos |
| IMAGE 2 | LOW | `openai-image-2-low` | libre | **El más simple y barato para empezar** |
| IMAGE 2 | MEDIUM | `openai-image-2` | libre | Punto medio sin contraseña extra |
| IMAGE 2 | HIGH | `openai-image-2-high` | protegido | Más detalle |
| VÍDEO | VEO 3.1 LITE / FAST | `veo-3.1-lite` / `veo-3.1-fast` | libres | Vídeo sin contraseña extra |
| VÍDEO | VEO 3.1 QUALITY / OMNI FLASH | `veo-3.1-quality` / `omni-flash` | protegidos | Más calidad |

**Contexto de proyecto:** la política general fija `openai-image-2-low` como modelo por defecto;
esta app arranca con **FLOW · NANO BANANA 2** porque Flow es su motor preferente y no gasta clave
de API. Esa elección inicial no es un error: es el diseño de la app.

## Límites que hay que decir antes de que choque

| Límite | Valor |
|---|---|
| Caracteres del prompt de imagen | 12.000 en el contador; el servidor **rechaza por encima de 11.800** porque añade la instrucción de idioma |
| Caracteres del prompt de vídeo | 1.500 (Flow **recorta en silencio** si se pasa) |
| Peso por archivo | el que anuncia el lienzo: tope 20 MB, rebajado si el servidor tiene un `post_max_size` menor |
| Lado máximo de imagen | 8192 px |
| Capas por documento | 120 |
| Referencias por generación | 8 en la interfaz; **con Flow solo viajan las 2 primeras** |
| Imágenes por encolado (solo Flow) | 1–4 |
| Deshacer | 60 pasos |
| Proporciones con Flow | 1:1, 16:9, 4:3, 3:4, 9:16 (el resto, desactivadas) |
| Resolución con Flow | no se elige: ~1K nativa |
| Formatos de vídeo | 16:9 y 9:16 |
| Formatos de imagen admitidos | PNG, JPG, WebP (GIF no) |

## Errores frecuentes: mensaje literal → causa → qué decirle

| Lo que ve | Causa | Respuesta |
|---|---|---|
| «Servidor PHP no disponible: la app funciona en local con IndexedDB. La generación con IA requiere el servidor.» | Se abrió sin PHP (archivo local o servidor caído) | Abrir la URL publicada, no el archivo |
| «Sesión no autorizada: inicia sesión para enviar trabajos al proveedor.» | No ha entrado con la contraseña | «Acceso privado» → contraseña → «Entrar» |
| «La generación con IA necesita el proxy PHP del servidor. Ahora mismo no responde.» | El backend no contesta | «Reintentar conexión» o esperar |
| «Escribe una descripción para generar.» | Prompt vacío | Escribir la descripción antes de «GENERAR» |
| «Ya hay una generación en curso…» | Ya hay un trabajo lanzado | Esperar a que termine o cancelarlo en Biblioteca |
| «El PC con Flow no responde ahora mismo.» / «El PC dejó de responder…» | El agente de Flow está apagado o desconectado | Encender el PC de Flow, o cambiar a un modelo directo |
| «Para encolar vídeos necesitas sesión en el servidor privado.» | Vídeo sin sesión | Entrar con la contraseña |
| «Máximo 8 referencias por generación.» | Demasiadas referencias | Quitar referencias hasta 8 |
| «…supera el límite de 20 MB.» / «…supera 8192 px de lado.» | Archivo demasiado grande | Reducir antes de importar |
| «…los GIF no se admiten.» | Formato no soportado | Exportar un fotograma a PNG/WebP |
| «El navegador no dejó leer el archivo…» | Permiso del navegador | Arrastrarlo al lienzo o pegarlo con `Ctrl+V` |
| «Pinta algo en la máscara antes de invertirla.» | Máscara vacía | Pintar la zona primero |
| «Crea un documento antes de añadir texto.» | Lienzo vacío | Importar/generar una imagen o «Empezar en blanco» |
| «Selecciona una capa para alinearla.» | Nada seleccionado | Elegir la capa en «Capas» |
| «Añade al menos una capa antes de exportar.» | Documento vacío | Componer algo antes de «Exportar» |
| «Todavía no hay un estado anterior con el que comparar…» | No hay resultado de IA previo | Aplicar un resultado y volver a comparar |
| «La receta usa un modelo protegido: introduce la contraseña para aplicarla.» | Receta con modelo caro | Introducir la contraseña |
| «Ese resultado ya no está disponible: actualiza la lista.» | Trabajo borrado o caducado | «Actualizar» en Biblioteca |
| «El trabajo sigue pendiente en el servidor… no se ha reenviado.» | Corte de red con trabajo en curso | Recargar: el trabajo se recupera solo |
| «Imagen copiada al portapapeles.» / «No se pudo copiar…» | «Copiar» del modal de exportación | Si falla, exportar a archivo |
| «El prompt es demasiado largo: deja margen para la instrucción de idioma (máximo 12.000 caracteres en total).» | Más de 11.800 caracteres | Acortar el prompt |
| «Demasiados trabajos en un minuto. Espera antes de volver a generar.» | Ráfaga de envíos | Esperar un minuto y reintentar |
| «No se pudo recuperar el trabajo: …» | El trabajo pendiente no se pudo retomar | Mirar en Biblioteca antes de repetir |

## Trampas que conviene avisar (no son errores)

- **Los atajos se mueren al escribir**: con el cursor en un campo se ignoran `Ctrl+S`, `Ctrl+E`,
  `Ctrl+O`, `Supr` y `Escape`. Hay que salir del campo (clic en el lienzo) y volver a probar.
- **El modal de acceso no se cierra con Escape**, porque enfoca la contraseña: ✕ o «Seguir en local».
- **«Eliminar proyecto» borra la copia de este navegador**, no la del servidor: la copia remota se
  queda huérfana. Si el proyecto importa, descargar antes el `.uis.json`.
- **Las versiones se restauran pero no se borran** desde la interfaz: se acumulan.
- **Con Flow llegan al modelo solo 2 referencias** y la resolución no se elige, por mucho que se
  configuren en el panel.
- **La compuerta admite un código de respaldo sin servidor**, además de la contraseña de acceso.
  No se escribe en el chat: si hace falta, que lo introduzca él.

## Glosario para no perderlo

- **Capa**: cada pieza del documento (imagen, texto, forma, logo) con su posición y opacidad.
- **Máscara**: la zona pintada que se va a modificar; no se ve en el resultado.
- **Inpainting**: «rellenar la máscara» con lo que pide la instrucción.
- **Referencia**: imagen que guía la generación (producto, identidad, estilo, pose, composición).
- **Variante**: resultado guardado como capa nueva sin sustituir lo anterior.
- **Compuerta**: la contraseña extra que protege los modelos caros.
- **Cola**: trabajos (sobre todo Flow) que se ejecutan uno detrás de otro en el PC.
- **Receta**: ajustes guardados (modelo, proporción, resolución, referencias, prompt).
- **Versión**: copia del documento en un momento dado, recuperable.

## Cómo redactar la respuesta

1. **Una línea de situación** («eso está en la pestaña Editar, panel izquierdo»).
2. **Pasos numerados**, uno por acción, con el control literal entre «».
3. **Qué verá** al terminar (y qué botón cierra el paso: «Aceptar», «Aplicar», «Exportar»).
4. **Un aviso** solo si aplica: coste/modelo protegido, Flow apagado, límite, pérdida de fidelidad.
5. **El atajo**, si existe, al final y en una sola línea.
6. Máximo ~9 pasos. Si la tarea necesita más, pártela en «primero esto, cuando lo tengas, seguimos».
7. Si algo no está en este manual, **no lo inventes**: di que no consta y ofrece la alternativa que sí
   existe (o propón abrir «Ayuda»).
8. No mandes a leer código ni a la consola: Antonio quiere hacer la tarea, no depurar.

## Cuándo esta skill no vale

- Cambiar, arreglar o ampliar la app → `crear` + `cirujano-codigo-produccion` + `autocalidad-90`.
- Dudas de la app original `apps/unified-image-studio/`: comparte casi toda la interfaz, pero **no**
  tiene Flow ni la compuerta; no mezclar instrucciones.
- Generar imágenes masivamente para tarjetas de TrickVault → `trickvault-imagenes`.
- Flow como herramienta de línea de comandos (`flow.py`) → `google-flow`.

## Mantenimiento: de dónde sale cada dato

| Dato | Fuente de verdad |
|---|---|
| Etiquetas, pestañas, ids y textos de la interfaz | `apps/unified-image-studio-hoola/index.html` |
| Mensajes de aviso y comportamiento de cada flujo | `assets/js/app.js` (buscar `toast(` y `throw new Error(`) |
| Catálogo de modelos y notas | `assets/js/ai.js` (`MODELS`, `ASPECTS`) |
| Qué modelos piden contraseña | `apps/_shared/model-gate.20261026b.js` (`FREE_MODELS`, `LABELS`) |
| Proporciones y recortes reales de Flow | `lib/flow-engine.php` (`uis_flow_image_ratios`, `uis_flow_video_ratios`, truncado del prompt) |
| Límites que aplica el servidor | `lib/jobs.php` (prompt máximo, ráfaga por minuto) |
| Límites | `assets/js/core.js` (`LIMITS`) y `app.js` (ajuste del peso máximo al arrancar) |
| Pruebas y límites declarados | `docs/VERIFICACION.md` |

Al cambiar la app, **actualiza esta skill en el mismo encargo**: si cambia una etiqueta o un límite,
la receta que da el agente deja de funcionar. Comprobación rápida:

```powershell
Select-String -Path 'apps\unified-image-studio-hoola\index.html' -Pattern '<label for=|<button|data-model='
Select-String -Path 'apps\unified-image-studio-hoola\assets\js\app.js' -Pattern 'toast\(|LIMITS\.'
```

## Checklist antes de entregar una respuesta

- [ ] He mirado si necesita sesión y si el modelo elegido está protegido.
- [ ] He dicho en qué pestaña/modo está y qué control pulsar, con su texto literal.
- [ ] Los pasos van en orden y terminan en un resultado visible («Aceptar», «Exportar»…).
- [ ] He avisado de límites/costes solo cuando afectan a esa tarea.
- [ ] No he inventado ningún botón que no esté en el mapa de arriba.
