---
name: analista-visual-pro
description: "Realiza un análisis visual hiperpreciso de imágenes para permitir su recreación perfecta (Clonador de Fotos). Activar cuando el usuario suba una imagen y pida analizarla, describirla para clonar o sacar el prompt."
---

# Analista Visual Pro — Protocolo Gemini

## Cuándo usar esta habilidad

- Cuando el usuario suba una imagen y pida "analízala", "descríbela para clonar" o "saca el prompt".
- Cuando se necesite recrear un estilo visual exacto utilizando otra IA generativa.
- Cuando el usuario mencione "Protocolo Gemini" o "Clonador".

## Inputs necesarios

1. **Imagen**: El archivo visual a analizar.
2. **Objetivo**: Confirmar si es para clonación exacta o solo inspiración.

## Reglas de Calidad (Protocolo Gemini)

- **Precisión Quirúrgica**: No omitir ningún detalle visible.
- **Objetividad Total**: Evitar interpretaciones ("parece triste"), describir hechos ("cejas inclinadas hacia abajo").
- **Estructura Fija**: Usar siempre las 8 secciones del protocolo.

## Workflow

Analizar la imagen y generar el reporte siguiendo ESTRICTAMENTE esta estructura:

### 1. [ COMPOSICIÓN GENERAL ]
- Tipo de plano (frontal, cenital, contrapicado, picado, etc.)
- Ángulo de cámara y altura
- Encuadre y posición de los elementos
- Simetría, uso de regla de tercios o centrado
- Relación de aspecto y orientación

### 2. [ ILUMINACIÓN ]
- Tipo de luz (natural, artificial, LED, flash, difusa, dura)
- Dirección, intensidad y color de la luz
- Sombras: dirección, dureza, longitud
- Reflejos, brillos, zonas de sobreexposición
- Temperatura de color (cálida, fría, neutra)

### 3. [ COLORES Y TONALIDAD ]
- Colores predominantes (hex aproximados si es posible)
- Colores secundarios y acentos
- Tonos: cálidos, fríos, neutros
- Contraste general (alto, medio, bajo)
- Saturación (vibrante, natural, desaturada)
- Transiciones suaves o duras de color

### 4. [ TEXTURAS Y MATERIALES ]
- Textura visible de cada superficie (rugosa, brillante, mate, granulada)
- Material de cada objeto (cerámica, metal, vidrio, madera, piel, tela, plástico)
- Patrones o repeticiones visibles

### 5. [ ELEMENTOS INDIVIDUALES ]
- Listado detallado de todos los elementos visibles, del más al menos prominente
- Para cada uno: forma, color, tamaño relativo, posición exacta (tercio, centro, esquina)
- Relaciones espaciales entre elementos

### 6. [ FONDO Y PROFUNDIDAD ]
- Tipo de fondo (liso, degradado, decorado, texturizado, natural)
- Nivel de desenfoque (bokeh, profundidad de campo)
- Elementos visibles en el fondo/desenfoque
- Planos de profundidad (primer plano, plano medio, fondo)

### 7. [ ESTILO Y ATMÓSFERA ]
- Estilo general (fotorrealista, editorial, lifestyle, 3D render, ilustración, cinematográfico)
- Ambiente o sensación visual transmitida (sin interpretar emociones)
- Nivel de posprocesado aparente (retoque, filtros, HDR, grano)
- Época o referencia estilística (si es identificable)

### 8. [ NOTAS FINALES ]
- Microdetalles: imperfecciones, marcas, huellas, partículas, polvo, arañazos
- Detalles que podrían pasarse por alto en un vistazo rápido
- Elementos inesperados o anomalías visuales

## Output

Devolver el reporte en Markdown. No añadir introducciones largas, ir directo al análisis. Usar viñetas para los detalles dentro de cada sección.

## Uso en apps de generación

Este análisis se puede usar para construir prompts de generación de imágenes. El reporte completo de 8 secciones proporciona todos los detalles necesarios para que una IA generativa replique el estilo, la composición y la atmósfera de la imagen original.
