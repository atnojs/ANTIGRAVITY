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
- `scope`: ubicación de guardado. `local` (dentro del proyecto) o `global` (perfil de usuario).
- `freedom_level`: nivel de libertad. `alta` (heurísticas), `media` (plantillas), `baja` (pasos exactos).

---

## 1. Niveles de Libertad

Elegir el nivel adecuado según el tipo de tarea:

| Nivel | Para qué | Ejemplos |
|-------|----------|----------|
| **Alta** (heurísticas) | Brainstorming, ideas, alternativas creativas | `brainstorming_pro` |
| **Media** (plantillas) | Documentos, copys, estructuras | `planificacion_pro` |
| **Baja** (pasos exactos) | Operaciones frágiles, scripts, cambios técnicos | `arquitecto-backend-php-hostinger` |

**Regla**: cuanto más riesgo, más específico debe ser el skill.

## 2. Flujo de Creación (5 pasos)

### Paso 1: Analizar el requerimiento
- Determinar nombre (kebab-case).
- Redactar descripción-disparador (¿qué diría el usuario para activarlo?).
- Elegir nivel de libertad.

### Paso 2: Diseñar la estructura
- Crear carpeta según `scope`:
  - `local`: `<workspace-root>/.claude/skills/${skill_name}/`
  - `global`: `~/.claude/skills/${skill_name}/`
- Determinar si necesita subcarpetas `resources/`, `scripts/`.

### Paso 3: Redactar SKILL.md
- Usar formato estándar con frontmatter YAML y cuerpo Markdown.
- Instrucciones en español (salvo que el usuario pida otro idioma).
- Para skills complejas, incluir árboles de decisión.

### Paso 4: Generar Recursos
- Si el skill usa plantillas CSS, scripts Python, o configuraciones → crearlos en `resources/` o `scripts/`.
- **Scripts como cajas negras**: instruir al agente para ejecutar `python script.py --help` en lugar de leer el código fuente (ahorra contexto).

### Paso 5: Validar
- YAML del frontmatter válido.
- Sin "relleno" ni explicaciones innecesarias.
- Confirmar con el usuario.

## 3. Formato de SKILL.md

```markdown
---
name: ${skill_name}
description: "${trigger_description}"
---

# ${skill_name}

## Instrucciones de ejecución

${instructions_body}
```

## 4. Árboles de Decisión (para skills complejas)

Si el skill tiene múltiples caminos, incluir un diagrama de decisión:

```markdown
## Árbol de decisión

1. ¿El archivo existe?
   - SÍ → pasar al paso 3
   - NO → crearlo desde plantilla (paso 2)

2. ¿Tiene config.php?
   - SÍ → leer constante
   - NO → usar variables de entorno
```

## 5. Scripts como Cajas Negras

Si el skill incluye scripts, añadir esta instrucción:

```markdown
## Scripts de apoyo

Dispones de un script en `scripts/validador.py`.
Ejecútalo con `python scripts/validador.py --help` para ver sus opciones.
**No leas el código fuente del script**, ejecuta `--help` para ahorrar contexto.
```

## 6. Manejo de Errores

- Si el output no cumple el formato → volver al paso anterior y reintentar.
- Si hay ambigüedad crítica en el input del usuario → **preguntar antes de asumir**.
- Si el usuario no especifica scope → por defecto `local`.
- Si no se especifica nivel de libertad → inferir según el tipo de tarea.

## 7. Estructura de directorios resultante

```text
${skill_name}/
├── SKILL.md          ← Obligatorio (cerebro del skill)
├── resources/        ← Opcional (plantillas, CSS, assets)
└── scripts/          ← Opcional (Python, Bash, Node.js)
```

## 8. Reglas de calidad

- El nombre del skill debe estar en kebab-case.
- El archivo principal debe llamarse exactamente `SKILL.md`.
- Las instrucciones deben estar en español salvo que el usuario pida otro idioma.
- La descripción debe ser clara, breve y orientada a cuándo debe activarse el skill.
- **Enfoque único**: cada skill hace una sola cosa pero bien.
- No mezcles varios skills en el mismo `SKILL.md`.
- No incluyas claves API, contraseñas ni credenciales reales.
- Las descripciones son "triggers": escribe pensando en qué diría un usuario para activarlo.
