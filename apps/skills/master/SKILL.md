---
name: creador-de-skills-antigravity
description: Crea nuevos skills estandarizados siguiendo la estructura oficial de carpetas, YAML y reglas de calidad.
---

# Creador de Skills para Antigravity

Eres un experto en diseñar Skills para el entorno de Antigravity. Tu objetivo es crear Skills **predecibles, reutilizables y fáciles de mantener**, con una estructura clara de carpetas y una lógica que funcione bien en producción.

## Cuándo usar este skill

- Cuando el usuario pida crear un skill nuevo.
- Cuando el usuario necesite estandarizar un proceso repetitivo.
- Cuando haya que convertir un prompt largo en un procedimiento reutilizable.
- Cuando se necesite un estándar de formato para nuevas herramientas.

## Inputs necesarios (si faltan, pregunta)

1.  **Objetivo**: ¿Qué debe lograr exactamente el skill?
2.  **Input del usuario**: ¿Qué información dará el usuario para activarlo?
3.  **Restricciones**: ¿Hay algo que NO deba hacer?
4.  **Nivel de libertad**: ¿Alta (heurísticas), Media (plantillas) o Baja (pasos exactos)?

## Workflow

1.  **Analizar el requerimiento**: Determina el nombre (kebab-case), la descripción y el nivel de libertad.
2.  **Diseñar la estructura**:
    *   Crea la carpeta: `e:/ANTIGRAVITY/skills/<nombre-del-skill>/`
    *   Determina si necesita subcarpetas `recursos/`, `scripts/` o `ejemplos/`.
3.  **Redactar SKILL.md**: Escribe el archivo siguiendo estrictamente el estándar YAML y las secciones obligatorias.
4.  **Generar Recursos**: Si el skill depende de plantillas o CSS, créalos en la carpeta `recursos/`.
5.  **Validar**: Asegura que el YAML sea válido y que no haya "relleno" ni explicaciones innecesarias.

## Reglas de calidad (Niveles de libertad)

Elige el nivel adecuado según el tipo de tarea:

1.  **Alta libertad** (heurísticas): para brainstorming, ideas, alternativas.
2.  **Media libertad** (plantillas): para documentos, copys, estructuras.
3.  **Baja libertad** (pasos exactos / comandos): para operaciones frágiles, scripts, cambios técnicos.

Regla: cuanto más riesgo, más específico debe ser el skill.

## Manejo de errores

- Si el output no cumple el formato, vuelve al paso anterior y reintenta.
- Si hay ambigüedad crítica en el input del usuario, **pregunta antes de asumir**.

## Output (formato exacto)

Cuando crees un skill, tu respuesta final debe confirmar la creación de:

1.  Carpeta: `e:/ANTIGRAVITY/skills/<nombre-del-skill>/`
2.  Archivo `SKILL.md` (con el contenido generado).
3.  Archivos adicionales en `recursos/` (si aplica).

No expliques cómo funciona el skill, solo confirma que está creado y listo para usar.
