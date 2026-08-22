# 📊 Folio — Infografías que se entienden

La propuesta renovada vive en `folio.html` y se abre automáticamente desde `index.html`. Separa el tipo de historia (datos, comparación, proceso, cronología, mapa o resumen) del lenguaje visual, agrupando los estilos en carpetas para que la elección sea rápida.

Incluye recomendación automática, ejemplos de contenido, borrador guardado localmente, generación de boceto sin API, conexión opcional con DeepSeek/OpenRouter, descarga PNG e impresión a PDF.

Generador de infografías con inteligencia artificial. **50 estilos únicos** para diferentes audiencias + **10 efectos de movimiento** para animar el resultado.

## ✨ Características

- 🎯 **50 estilos** divididos en 5 categorías por audiencia
- 🧒 **Infantil** (10 estilos) — para niños de 7-10 años
- 👴 **Senior** (10 estilos) — alta legibilidad para adultos mayores
- 👔 **Corporativo** (10 estilos) — profesional y elegante
- 🎨 **Artístico** (10 estilos) — creativo y visualmente impactante
- 📊 **Técnico** (10 estilos) — científico y datos
- 🎬 **10 efectos de movimiento** para animar la infografía
- 🔑 API Key configurable (soporta OpenRouter, FLUX, DALL-E)

## 🚀 Cómo usar

1. **Abrir** `index.html` en cualquier navegador
2. **Configurar API Key** (OpenRouter o similar)
3. **Elegir estilo** entre los 50 disponibles
4. **Ingresar contenido** (título + puntos clave)
5. **Generar** la infografía con IA
6. **Elegir efecto de movimiento** entre 10 opciones
7. **Descargar** PNG o animación

## 📁 Estructura

```
infographic-app/
├── index.html              # App principal
├── styles/
│   ├── main.css            # Estilos base
│   └── animations.css      # 10 efectos de movimiento
├── js/
│   ├── styles-data.js      # 50 estilos (datos completos)
│   ├── prompts.js          # Plantillas de prompt por estilo
│   ├── animations.js       # Controlador de animaciones
│   └── api.js              # API de generación IA
└── README.md
```

## 🔧 Configuración de API

La app usa **OpenRouter** por defecto. Necesitas una API Key de:

1. [OpenRouter.ai](https://openrouter.ai) — modelos FLUX, DALL-E, Stable Diffusion
2. Ingresarla en el campo superior de la app
3. Se guarda en localStorage del navegador

## 🌐 Subir a Hostinger

1. Sube toda la carpeta `infographic-app/` a tu hosting
2. Abre `https://tudominio.com/infographic-app/`
3. Configura tu API Key y ¡a crear infografías!

## 📐 Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- API Key de OpenRouter (o servicio compatible)
- Conexión a internet (para generar las imágenes)

## 🎬 Los 10 efectos de movimiento

| # | Efecto | Descripción |
|---|--------|-------------|
| 1 | Revelar Progresivo | Se dibuja de arriba a abajo |
| 2 | Zoom Suave | Acercamiento lento continuo |
| 3 | Pan Deslizante | Se desplaza horizontalmente |
| 4 | Destello Secciones | Cada sección aparece en secuencia |
| 5 | Respiración Sutil | La infografía "respira" suavemente |
| 6 | Ken Burns | Zoom + paneo tipo documental |
| 7 | Partículas Flotantes | Elementos decorativos flotan |
| 8 | Resaltado Narrativo | Cada punto se ilumina en secuencia |
| 9 | Máquina Escribir | Texto aparece letra por letra |
| 10 | Caleidoscopio | Entrada con efecto espejo |
