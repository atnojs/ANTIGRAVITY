---
name: analista-visual-pro
description: Realiza un análisis visual hiperpreciso de imágenes para permitir su recreación perfecta (Clonador de Fotos).
---

# Analista Visual Pro

## Cuándo usar esta habilidad
- Cuando el usuario suba una imagen y pida "analízala", "descríbela para clonar" o "saca el prompt".
- Cuando se necesite recrear un estilo visual exacto utilizando otra IA generativa.
- Cuando el usuario mencione "Protocolo Gemini" o "Clonador".

## Inputs necesarios
1.  **Imagen**: El archivo visual a analizar.
2.  **Objetivo**: Confirmar si es para clonación exacta o solo inspiración.

## Reglas de Calidad (Protocolo Gemini)
- **Precisión Quirúrgica**: No omitas ningún detalle visible.
- **Objetividad Total**: Evita interpretaciones ("parece triste"), describe hechos ("cejas inclinadas hacia abajo").
- **Estructura Fija**: Usa siempre las 8 secciones del protocolo.

## Workflow
Analiza la imagen y genera el reporte siguiendo ESTRICTAMENTE esta estructura:

### 1. [ COMPOSICIÓN GENERAL ]
- Tipo de plano (ej. frontal, cenital, contrapicado…)
- Ángulo de cámara y altura
- Encuadre y posición de los elementos
- Simetría, uso de regla de tercios o centrado

### 2. [ ILUMINACIÓN ]
- Tipo de luz (natural, artificial, LED, flash…)
- Dirección, intensidad, y color de la luz
- Sombras, reflejos, brillos, zonas de sobreexposición

### 3. [ COLORES Y TONALIDAD ]
- Colores predominantes y secundarios
- Tonos (cálidos, fríos, neutros), contraste, saturación
- Transiciones suaves o duras de color

### 4. [ TEXTURAS Y MATERIALES ]
- Textura visible de cada superficie (rugosa, brillante, mate…)
- Material de cada objeto (cerámica, metal, vidrio, piel…)

### 5. [ ELEMENTOS INDIVIDUALES ]
- Listado detallado de todos los elementos visibles
- Para cada uno: forma, color, tamaño relativo, posición exacta

### 6. [ FONDO Y PROFUNDIDAD ]
- Tipo de fondo (liso, decorado, texturizado…)
- Nivel de desenfoque (bokeh), profundidad de campo
- Elementos visibles en el fondo

### 7. [ ESTILO Y ATMÓSFERA ]
- Estilo general (fotorrealista, editorial, lifestyle, 3D render…)
- Ambiente o sensación visual transmitida
- Nivel de posprocesado aparente

### 8. [ NOTAS FINALES ]
- Microdetalles: imperfecciones, marcas, huellas, partículas, etc.

## Output
Devuelve el reporte en Markdown. No añadas introducciones largas, ve directo al análisis.
