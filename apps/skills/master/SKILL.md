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

## Patron reutilizable: loader HOOLA para apps de imagen

Usa este patron, con libertad baja, cuando una app de Antigravity necesite un overlay de generacion con tres aros, estado y porcentaje de progreso.

1. Carga la fuente Electrolize desde Google Fonts junto a las fuentes existentes:
   `https://fonts.googleapis.com/css2?family=Electrolize&display=swap`
2. Conserva la logica existente de progreso. El porcentaje debe seguir actualizando `width: ${progress}%` y el texto `${progress}%`; no simules el avance solo para el diseno.
3. Aplica el overlay de Vestir Modelo:
   - Fondo: `rgba(0, 16, 24, 0.75)` (capa al 75%).
   - Difuminado: `backdrop-filter: blur(6px)` y prefijo `-webkit-`.
   - Separacion vertical: `1.5rem`.
   - Spinner: 80 x 80 px, borde de 3 px, tres aros con cyan `#00D0D0`, verde `#26C626` y duraciones 1.2 s, 1 s inversa y 0.8 s.
4. Aplica Electrolize a `.loading-text`, `.progress-percentage` y `.progress-status`. El texto de carga debe usar 14 px, peso 400 y `letter-spacing: 0.18em`.
5. Aplica la barra HOOLA/Relatos:
   - Contenedor: `width: min(360px, calc(100vw - 48px))`, `padding: 18px 24px`, fondo oscuro, borde cyan y radio de 16 px.
   - Track: 5 px de alto, radio `999px`, fondo claro translcido e inset shadow.
   - Fill: gradiente `#00D0D0` a `#26C626`, radio `999px` y glow cyan.
   - Estado: 0.72 rem, color `#99CCCC` y `letter-spacing: 0.14em`.
6. No cambies el JSX/HTML estructural salvo la carga de fuente; reutiliza las clases ya presentes (`loading-overlay`, `spinner-triple`, `ring-*`, `progress-*`).
7. Antes de publicar, revisa el diff y valida que solo se incluyan los archivos de la app objetivo. Haz commit y push a `main` para que el usuario pueda comprobar el resultado desde Hostinger.
