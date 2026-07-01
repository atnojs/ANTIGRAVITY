# 🗺️ Hoja de Ruta: App Generadora de Infografías

## 📋 Visión General

App web que permite:
1. **Elegir entre ~50 estilos únicos de infografía**
2. **Generar la infografía** con IA (texto → imagen)
3. **Elegir entre 10 efectos de movimiento** para animar la infografía

---

## 🔬 FASE 1: Investigación — Catálogo de 50 Estilos

### Categorías de Estilos por Público Objetivo

#### 🧒 INFANTIL / NIÑOS (7-10 años)
*Estilos diseñados para captar atención infantil con colores vivos, formas simples y mucho juego visual*

| # | Nombre del Estilo | Descripción |
|---|-------------------|-------------|
| 1 | **Crayon-Kids** | Dibujo a蜡笔 / crayón grueso, trazos imperfectos, colores primarios |
| 2 | **Cuento-Mágico** | Estilo libro infantil ilustrado, acuarela suave, personajes animales |
| 3 | **Lego-Build** | Todo construido con piezas tipo Lego, bloques 3D coloridos |
| 4 | **Pixel-Adventure** | Estilo 8-bit / pixel art tipo videojuego retro |
| 5 | **Globos-Arcoíris** | Fondos de arcoíris, nubes, globos aerostáticos, muy alegre |
| 6 | **Sticker-Album** | Estilo álbum de pegatinas, bordes blancos, brillo |
| 7 | **Mono-Doodle** | Garabatos monocromáticos tipo cuaderno, trazo suelto y divertido |
| 8 | **Comic-Bubble** | Estilo cómic / viñetas con bocadillos de diálogo |
| 9 | **Play-Doh** | Textura de plastilina, formas orgánicas abultadas |
| 10 | **Finger-Paint** | Pintura de dedos, manchas coloridas, textura táctil |

#### 👴 ADULTOS MAYORES / TERCERA EDAD
*Estilos pensados para máxima legibilidad, alto contraste, tipografía grande y sin florituras*

| # | Nombre del Estilo | Descripción |
|---|-------------------|-------------|
| 11 | **Senior-Clear** | Altísimo contraste, tipografía 18px+, iconos ultra-simples, máximo blanco-negro |
| 12 | **Gran-Diario** | Estilo periódico/boletín informativo, columnas claras, titulares grandes |
| 13 | **Señal-Vial** | Inspirado en señales de tráfico: pictogramas universales, colores estándar |
| 14 | **Médico-Claro** | Estilo consulta médica: limpio, sin distracciones, verdoso/azul suave |
| 15 | **Instructivo** | Estilo manual de instrucciones IKEA: dibujos línea, pasos numerados |
| 16 | **Pizarra-Blanca** | Rotulador negro sobre fondo blanco, esquemas simples |
| 17 | **Papel-Periodico** | Estilo vintage prensa escrita, sepia, tipografía serif grande |
| 18 | **Gobierno-Claro** | Estilo institucional: serio, colores planos, máxima accesibilidad |
| 19 | **Alta-Vista** | Adaptado para baja visión: fondo oscuro, texto amarillo/ blanco brillante |
| 20 | **Calendario** | Estilo almanaque/hoja de calendario, fechas grandes, información escueta |

#### 👔 CORPORATIVO / PROFESIONAL
*Estilos para entornos de trabajo, presentaciones empresariales y comunicación formal*

| # | Nombre del Estilo | Descripción |
|---|-------------------|-------------|
| 21 | **Boardroom** | Estilo sala de juntas: azul corporativo, gráficos finos, minimal |
| 22 | **Consulting-Dark** | Estilo consultoría McKinsey: fondo negro, charts blancos, tipografía limpia |
| 23 | **Startup-Pitch** | Estilo pitch deck: gradientes vibrantes, bold, moderno |
| 24 | **Annual-Report** | Estilo memoria anual: elegante, dorado/azul marino, datos financieros |
| 25 | **Dashboard-Pro** | Estilo panel de control KPIs: widgets, indicadores, métricas |
| 26 | **Legal-Blueprint** | Estilo documento legal/azul de ingeniero: líneas, sellos, formal |
| 27 | **Newsletter** | Estilo newsletter email: franjas horizontales, CTA, limpio |
| 28 | **Corporate-Memphis** | Estilo Memphis corporativo: figuras geométricas planas, vibrante |
| 29 | **Slide-Deck** | Estilo presentación PowerPoint limpia: transiciones sutiles |
| 30 | **Brand-Guide** | Estilo guía de marca: muestras de color, tipografías, clean |

#### 🎨 ARTÍSTICO / CREATIVO
*Estilos con identidad visual fuerte, para impacto estético y originalidad*

| # | Nombre del Estilo | Descripción |
|---|-------------------|-------------|
| 31 | **Watercolor-Story** | Acuarela artesanal, manchas de color, poético |
| 32 | **Handmade-Craft** | Papel recortado, texturas collage, hecho a mano |
| 33 | **Cyberpunk-Neon** | Neón, violeta/cian, futurista, oscuro |
| 34 | **Origami-Fold** | Papiroflexia geométrica, planos plegados |
| 35 | **Chalkboard** | Tiza sobre pizarra negra, estilo aula |
| 36 | **Aged-Academia** | Vintage científico, sepia, manuscrito antiguo |
| 37 | **Ukiyo-E** | Grabado japonés, ondas, colores planos naturales |
| 38 | **Bauhaus-Grid** | Escuela de la Bauhaus: rojo, azul, amarillo, cuadrícula |
| 39 | **Morandi-Soft** | Tonos Morandi apagados, suaves, estilo journal |
| 40 | **Knolling-Flat** | Objetos organizados en plano, vista cenital |

#### 📊 TÉCNICO / CIENTÍFICO / DATOS
*Estilos para visualización de datos, procesos técnicos y contenido educativo*

| # | Nombre del Estilo | Descripción |
|---|-------------------|-------------|
| 41 | **Lab-Report** | Estilo laboratorio: fondo cuadriculado, letra técnica |
| 42 | **Blueprint** | Plano ingenieril: azul, líneas blancas, cotas |
| 43 | **Subway-Map** | Diagrama tipo metro: líneas de colores, estaciones |
| 44 | **Isometric-Tech** | Isométrico 3D, perspectiva técnica |
| 45 | **Periodic-Table** | Estilo tabla periódica: celdas, categorías coloridas |
| 46 | **Scientific-Paper** | Estilo paper académico: dos columnas, figuras, citas |
| 47 | **Flowchart-Sys** | Diagrama de flujo técnico, conectores, decisiones |
| 48 | **Heatmap-Data** | Mapas de calor, densidad de datos, escalas cromáticas |
| 49 | **Timeline-History** | Línea de tiempo histórica, fechas clave, hitos |
| 50 | **Infographic-Map** | Mapa geográfico con datos superpuestos, regiones coloreadas |

### Matriz Público ↔ Estilo

```
                    Infantil    Adulto Mayor   Corporativo   Artístico   Técnico
Crayon-Kids            ★★★          ★              ★           ★★          
Senior-Clear           ★            ★★★            ★★          ★           
Boardroom                            ★             ★★★         ★           
Cyberpunk-Neon                      ★              ★★         ★★★          
Lab-Report              ★                           ★                     ★★★
```

---

## 📐 FASE 2: Arquitectura de la App

### Tech Stack Propuesto

| Capa | Tecnología | Razón |
|------|-----------|-------|
| Frontend | **HTML + CSS + JS vanilla** (SPA) | Sin dependencias, fácil de hostear en Hostinger |
| Estilos | **Tailwind CSS vía CDN** + CSS personalizado | Rapidez + flexibilidad |
| Generación IA | **Serverless / API** (OpenRouter + FLUX / DALL-E) | Infografía como imagen |
| Animaciones | **CSS Animations + Canvas/GSAP (opcional)** | Efectos de movimiento ligeros |
| Hosting | **Hostinger** (servidor del usuario) | Ya configurado |

### Flujo de la App

```
1. USUARIO abre la app
   ↓
2. SELECCIONA un estilo de los 50 (navegación visual con previews)
   ↓
3. INGRESA el tema / contenido de la infografía
   (título + puntos clave + datos opcionales)
   ↓
4. AJUSTA targeting de audiencia (niños / adultos / seniors)
   ↓
5. GENERAR → llamada a IA que produce la imagen
   ↓
6. PREVIEW de la infografía generada
   ↓
7. SELECCIONA EFECTO DE MOVIMIENTO (10 opciones)
   ↓
8. DESCARGA / COMPARTE (PNG estático + GIF animado)
```

---

## 🎬 FASE 3: 10 Efectos de Movimiento

*Una vez generada la infografía, el usuario elige cómo animarla*

| # | Nombre | Descripción | Tipo Técnico |
|---|--------|-------------|-------------|
| 1 | **Revelar Progresivo** | La infografía se dibuja de arriba a abajo como si se estuviera pintando | CSS clip-path + keyframes |
| 2 | **Zoom Suave** | Acercamiento lento del 100% al 110% con leve parallax | CSS transform scale |
| 3 | **Pan Deslizante** | La infografía se desplaza horizontal/verticalmente (scroll effect) | CSS translate |
| 4 | **Destello por Secciones** | Cada sección aparece con un fade-in secuencial (efecto presentación) | CSS animation-delay escalonado |
| 5 | **Respiración Sutil** | La infografía "respira": escala 1.0 → 1.02 → 1.0 en bucle | CSS animation pulse |
| 6 | **Efecto Ken Burns** | Zoom + pan combinados, como documental histórico | CSS transform + transition |
| 7 | **Partículas Flotantes** | Elementos decorativos flotan suavemente sobre la infografía | Canvas / CSS particle |
| 8 | **Resaltado Narrativo** | Cada punto clave se ilumina en secuencia (guía visual) | CSS opacity + highlight |
| 9 | **Máquina de Escribir** | El texto aparece letra por letra mientras la imagen ya está visible | CSS steps() + overflow |
| 10 | **Caleidoscopio** | Efecto espejo / kaleidoscope en transición de entrada | CSS clip-path polygon + scale |

---

## 🧩 FASE 4: Plan de Desarrollo (Fases)

### Sprint 1 — Base Frontend
- [ ] HTML estructura de la app (one-pager)
- [ ] Grid de selección de estilos (50 cards con previews)
- [ ] Formulario de entrada de contenido
- [ ] Selector de público objetivo (niño / adulto / senior)

### Sprint 2 — Motor de Generación
- [ ] Integración con API de generación de imágenes (FLUX / DALL-E)
- [ ] Prompt engineering: cada estilo tiene su prompt base
- [ ] Sistema de fallback entre modelos
- [ ] Preview de la imagen generada

### Sprint 3 — 10 Efectos de Movimiento
- [ ] Implementar los 10 efectos en CSS puro
- [ ] Selector de efecto con preview en tiempo real
- [ ] Exportar como GIF / video corto (opcional)

### Sprint 4 — UX/UI Pulido
- [ ] Adaptaciones responsive (móvil, tablet, escritorio)
- [ ] Accesibilidad (contraste, tabindex, aria-labels)
- [ ] Carga lazy de previews de estilos
- [ ] Estados: loading, error, empty, success

### Sprint 5 — Despliegue
- [ ] Subida a Hostinger
- [ ] Prueba de funcionalidad real
- [ ] Ajustes finales de rendimiento

---

## 📐 Consideraciones Técnicas

### Prompt Engineering por Estilo
Cada estilo tendrá un **prompt base** que se combina con el contenido del usuario:

```
Ejemplo estilo "Crayon-Kids":
"Children's crayon drawing style infographic, thick colored strokes, 
messy and playful texture, primary colors on white paper, 
large simple text, child-friendly illustrations..."

+ [CONTENIDO DEL USUARIO]
```

### Sistema de Targeting por Audiencia
El prompt se adapta automáticamente:

- **Niños**: "For children aged 7-10, very simple language, big colorful text, playful..."
- **Adultos**: "Professional infographic, balanced layout, standard readability..."
- **Seniors**: "High contrast, very large font (minimum 18pt), clear simple icons, no visual noise..."

### Formatos de Exportación
- PNG estático (siempre)
- GIF animado (cuando se aplica efecto de movimiento)
- HTML embed (opcional)

---

## ✅ Criterios de Éxito

- [ ] 50 estilos funcionales y visualmente distintos
- [ ] Los 10 efectos de movimiento aplicables a cualquier infografía
- [ ] App responde en < 3s (sin contar generación IA)
- [ ] Funciona en móvil, tablet y escritorio
- [ ] Generación exitosa con IA en < 30s

---

## 📁 Estructura de Archivos Propuesta

```
infographic-app/
├── index.html              # App principal SPA
├── styles/
│   ├── main.css            # Estilos base
│   └── animations.css      # 10 efectos de movimiento
├── js/
│   ├── app.js              # Lógica principal
│   ├── styles-data.js      # Datos de los 50 estilos
│   ├── animations.js       # Control de animaciones
│   ├── api.js              # Llamadas a API de generación IA
│   └── prompts.js          # Prompt templates por estilo
├── assets/
│   ├── previews/           # Thumbnails de preview de estilos
│   └── icons/              # Iconos de la UI
└── README.md
```

---

> **Próximo paso**: Cuando me des el visto bueno, empezaré a codificar la app empezando por el Sprint 1 (estructura HTML + grid de 50 estilos + formulario de contenido).
