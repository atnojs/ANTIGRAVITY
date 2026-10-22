---
name: mejora-continua
description: "Convierte un fallo o una tarea repetida en una regla reutilizable con evidencia: propone, prueba y guarda la lección en la biblioteca de experiencia. Activar tras un error que costó tiempo, cuando algo se hace por tercera vez, o al terminar una tarea con aprendizaje reaprovechable."
---

# Mejora continua — puntero

El texto íntegro vive en **`skills/SKILL_MEJORA_CONTINUA.md`**. Léelo y aplícalo tal cual.

Resumen:

- Bucle: capturar → **propose** (regla general + regla específica) → **probe** (comprobar con
  evidencia real) → **compose** (escribir la lección y enlazarla).
- Biblioteca: `tools/memoria/experiencia.md`, entrada por lección, con fallo, causa, regla y evidencia.
- Registrar sin romper el formato:

  ```powershell
  python E:\ANTIGRAVITY\scripts\mejora\registrar_leccion.py --titulo "..." --ambito general `
    --fallo "..." --causa "..." --regla "..." --evidencia "..." --aplica "..."
  ```

- Sin evidencia no hay lección. Si no se puede comprobar, se guarda como hipótesis.
