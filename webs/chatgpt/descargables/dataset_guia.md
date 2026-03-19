# Guía de Dataset para Prompts

## 1. Propósito
Definir ejemplos y contraejemplos para que el modelo entienda criterios de calidad.

## 2. Estructura sugerida
- **Instrucción**: [tarea_clara_y_concreta]
- **Contexto**: [datos_relevantes]
- **Salida esperada**: [formato_y_criterios]
- **Razón**: [por_qué_esta_salida_es_correcta]

## 3. Ejemplo positivo
- Instrucción: [..]
- Contexto: [..]
- Salida esperada: [..]
- Razón: [..]

## 4. Contraejemplo
- Instrucción: [..]
- Contexto: [..]
- Salida incorrecta: [..]
- Por qué está mal: [..]
- Corrección: [..]

## 5. Etiquetado mínimo
- Calidad: {alta|media|baja}
- Cumple formato: {sí|no}
- Riesgos detectados: [lista]

## 6. Lista de verificación
- Cobertura de casos frecuentes y bordes
- Claridad de formato
- Datos realistas y consistentes
