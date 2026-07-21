---
name: creador-de-skills-antigravity
description: Crea o actualiza skills reutilizables para Antigravity o Claude Code. Usar cuando se quiera convertir un proceso repetitivo en instrucciones estructuradas, estandarizar una skill existente o preparar sus recursos de apoyo.
---

# Creador de skills para Antigravity

Crear skills predecibles, reutilizables y fáciles de mantener. Cada skill debe resolver un único problema y contener solo las instrucciones y recursos necesarios para hacerlo.

## Recoger el contexto

Antes de crear o actualizar una skill, determinar:

- Objetivo concreto y ejemplos de peticiones que deben activarla.
- Datos de entrada esperados y resultado que debe producir.
- Restricciones y operaciones que no debe realizar.
- Nivel de libertad: `alta` para heurísticas e ideación, `media` para plantillas y estructuras, `baja` para pasos frágiles, scripts o cambios técnicos.
- Ubicación: `antigravity` (por defecto), `local` dentro del proyecto o `global` dentro del perfil de Claude Code.

Preguntar solo si una ambigüedad impide definir una skill fiable. Inferir el nivel de libertad cuando sea evidente: a mayor riesgo, mayor precisión.

## Diseñar la skill

1. Elegir un nombre corto, descriptivo y en kebab-case.
2. Definir una descripción-disparador: debe indicar qué hace la skill y qué petición del usuario debe activarla.
3. Mantener un único enfoque. Separar en otra skill cualquier flujo independiente.
4. Añadir recursos solo si eliminan trabajo repetido o aportan fiabilidad:
   - `resources/` para plantillas, configuraciones o material de referencia.
   - `scripts/` para automatizaciones deterministas o propensas a errores.
   - `examples/` solo cuando ayuden a aplicar una skill compleja.

## Ubicación y nombre del archivo

No crear archivos llamados `SKILL.md`. El archivo principal siempre debe llamarse `SKILL_<nombre-descriptivo>.md`.

- Scope `antigravity`: `E:/ANTIGRAVITY/skills/SKILL_<nombre-descriptivo>.md`
- Scope `local`: `<workspace-root>/.claude/skills/SKILL_<nombre-descriptivo>.md`
- Scope `global`: `~/.claude/skills/SKILL_<nombre-descriptivo>.md`

Si la skill necesita archivos auxiliares, guardarlos en una carpeta identificable junto al archivo principal, por ejemplo `recursos/<nombre-descriptivo>/` o `scripts/<nombre-descriptivo>/`. No crear documentación auxiliar que no sea necesaria para ejecutar la skill.

## Redactar la skill

Usar frontmatter YAML válido y un cuerpo Markdown en español, salvo indicación contraria:

```markdown
---
name: <nombre-en-kebab-case>
description: "<qué hace y cuándo debe activarse>"
---

# <Título claro>

## Instrucciones de ejecución

<pasos operativos>
```

- Redactar en imperativo y evitar relleno.
- Incluir árboles de decisión solo si existen rutas operativas realmente distintas.
- Si se incluye un script, indicar cómo consultar su ayuda y ejecutarlo; no duplicar en la skill la lógica del script.
- No incluir secretos, contraseñas, claves API ni instrucciones de despliegue ajenas a su objetivo.

## Validar y entregar

1. Comprobar que el YAML contiene `name` y `description`, y que ambos describen correctamente la función.
2. Verificar que el archivo se llama `SKILL_<nombre-descriptivo>.md`, sin excepciones.
3. Confirmar que las instrucciones son autocontenidas, no duplican recursos y respetan el nivel de libertad elegido.
4. Revisar que los recursos opcionales están referenciados y son necesarios.
5. Comunicar los archivos creados o actualizados y su ubicación.
