---
name: creador-de-skills
description: Crea nuevas skills para el agente siguiendo el estándar oficial de Antigravity. Úsalo cuando el usuario solicite crear o definir una nueva skill, asegurando que siga el formato correcto con SKILL.md y frontmatter.
---

# Creador de Skills

Esta skill define el procedimiento, las reglas y el estándar oficial de Antigravity que debes seguir cada vez que se te pida crear una nueva skill.

## 1. Estructura y Formato Obligatorio

* **Carpeta Propia**: Toda nueva skill es esencialmente una carpeta independiente. El nombre de la carpeta debe ser representativo de la skill (preferiblemente en minúsculas y usando guiones `kebab-case`).
* **Archivo Principal (`SKILL.md`)**: El núcleo de cada skill es un archivo llamado `SKILL.md` que debe ser creado obligatoriamente en la raíz de la carpeta de la skill.
* **Frontmatter YAML**: El archivo `SKILL.md` **siempre** debe comenzar con un bloque YAML de configuración (frontmatter) que incluya:
  * `name`: Un identificador corto y único.
  * `description`: La explicación clara de qué hace la skill y bajo qué condiciones el agente debería activarla (esta descripción es el "trigger" o disparador).

## 2. Ubicaciones Soportadas

Dependiendo del alcance que el usuario desee que tenga la skill, debes crear la carpeta en uno de los siguientes directorios:

* **Específico del Workspace (Proyectos)**: `<workspace-root>/.agent/skills/<nombre-skill>/`
* **Global (Todas tus instancias)**: `~/.gemini/antigravity/skills/<nombre-skill>/`

*Nota: Por defecto, si el usuario no especifica lo contrario, créala en el .agent/skills de la raíz del proyecto actual.*

## 3. Mejores Prácticas al Escribir el `SKILL.md`

1. **Enfoque único**: Cada skill debe hacer una sola cosa pero hacerla bien (Keep it focused).
2. **Descripciones como "Triggers"**: Escribe la sección `description` del frontmatter pensando en qué le dirías a otro agente para que sepa exactamente cuándo debe usar esta skill.
3. **Árboles de decisión**: Si la tarea es compleja, incluye árboles de decisión o diagramas simples en Markdown para ayudar al agente a elegir el enfoque correcto.
4. **Scripts como Cajas Negras**: Si la skill incluye scripts (ej. en una subcarpeta `scripts/`), instruye al agente en el `SKILL.md` para que ejecute el script con el parámetro `--help` en lugar de leer su código fuente, esto ahorrará contexto.

## 4. Ejemplo de Creación de Skill (`SKILL.md`)

```markdown
---
name: mi-nueva-skill
description: Úsala cuando necesites validar código, formatear textos, o realizar [Acción Específica].
---

# Título de la Skill

Instrucciones detalladas sobre cómo debe actuar el agente.

## Reglas a seguir
1. Primero verifica X.
2. Luego ejecuta Y.

## Scripts de apoyo
Dispones de un script en `scripts/validador.py`. Ejecútalo con `python scripts/validador.py --help` para ver sus opciones.
```

## 5. Pasos a seguir para crear la skill solicitada

1. Entiende los requerimientos del usuario para la nueva skill.
2. Determina el nombre (`name`) y una descripción accionable (`description`).
3. Crea la ruta del directorio (`.agent/skills/nombre-de-la-skill`).
4. Crea el archivo `SKILL.md` con su frontmatter y desarrolla el cuerpo en Markdown con las instrucciones detalladas.
5. Confirma con el usuario que la skill ha sido estructurada y guardada de manera exitosa.
