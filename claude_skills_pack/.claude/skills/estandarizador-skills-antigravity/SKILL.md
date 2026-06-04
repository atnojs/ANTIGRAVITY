---
name: estandarizador-skills-antigravity
description: "Activa este skill cuando el usuario solicite explícitamente crear un nuevo skill reutilizable o automatizar un procedimiento mediante prompts estructurados."
---

# Estandarizador de Skills para Antigravity y Claude Code

## Objetivo

Crear nuevos skills reutilizables con una estructura limpia, consistente y preparada para ser usada dentro de proyectos con Claude Code o Antigravity.

## Inputs esperados

- `skill_name`: nombre del skill en formato kebab-case. Ejemplo: `validador-imagenes`.
- `trigger_description`: descripción exacta que usará el motor de IA para activar esta habilidad.
- `instructions_body`: cuerpo de instrucciones técnicas en Markdown.
- `scope`: ubicación de guardado.
  - `local`: dentro del proyecto.
  - `global`: dentro del perfil de usuario.

## 1. Generación de estructura de directorios

Construye la ruta destino según el parámetro `scope`.

### Si `scope` es `local`

Usa esta ruta:

```text
<workspace-root>/.claude/skills/${skill_name}/
```

### Si `scope` es `global`

Usa esta ruta:

```text
~/.claude/skills/${skill_name}/
```

## 2. Carpetas internas

Crea la carpeta raíz del skill y, si son necesarias, estas subcarpetas:

```text
resources/
scripts/
```

La estructura final puede ser:

```text
${skill_name}/
├── SKILL.md
├── resources/
└── scripts/
```

## 3. Renderizado automático de SKILL.md

Escribe siempre un archivo llamado:

```text
SKILL.md
```

en la raíz de la carpeta creada.

El archivo debe usar este formato:

```markdown
---
name: ${skill_name}
description: "${trigger_description}"
---

# ${skill_name}

## Instrucciones de ejecución

${instructions_body}
```

## 4. Reglas de calidad

- El nombre del skill debe estar en kebab-case.
- El archivo principal debe llamarse exactamente `SKILL.md`.
- Las instrucciones deben estar en español salvo que el usuario pida otro idioma.
- La descripción debe ser clara, breve y orientada a cuándo debe activarse el skill.
- No mezcles varios skills en el mismo `SKILL.md`.
- No incluyas claves API, contraseñas ni credenciales reales.
