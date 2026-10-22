---
name: mejora-continua
description: "Convierte un fallo o una tarea repetida en una regla reutilizable con evidencia: propone, prueba y guarda la lección en la biblioteca de experiencia. Activar tras un error que costó tiempo, cuando algo se hace por tercera vez, o al terminar una tarea con aprendizaje reaprovechable."
---

# Mejora continua (propose · probe · compose)

Adaptación local del bucle de Harness²: el modelo no se reentrena; lo que mejora es el arnés
(reglas, skills, scripts y memoria). Aquí el arnés son `skills/`, `tools/memoria/` y `scripts/`.

## Cuándo activarla

- Un error hizo perder más de cinco minutos o se repitió dos veces.
- Una tarea se resolvió con un rodeo que volverá a aparecer.
- Se acaba de entregar algo y hay una lección que evita repetir trabajo.

No la actives para fallos triviales de sintaxis corregidos al momento: eso no es experiencia,
es ruido.

## Regla de oro

**Sin evidencia no hay lección.** Cada entrada necesita el comando, el error literal o la medición
que la respalda. "Hay que tener cuidado" no es una lección; "cerrar Chrome con `flowbot-profile`
antes de generar, porque Playwright no abre un perfil en uso" sí lo es.

## Bucle

### 1. Capturar (1 minuto)

Anotar en bruto:

- Objetivo que se perseguía.
- Qué se intentó y en qué orden.
- El fallo exacto (texto del error, no un resumen).
- Qué lo resolvió.

### 2. Propose — dos candidatos, no uno

- **Candidato general**: la regla que sirve para cualquier tarea parecida (planificar antes,
  verificar el despliegue, comprobar el entorno).
- **Candidato específico**: la regla atada a este caso (esta ruta, esta herramienta, este proyecto).

Si solo se te ocurre uno, es que no has entendido el fallo: vuelve al paso 1.

### 3. Probe — comprobar que la regla es cierta

Antes de escribirla como verdad:

- Repetir el comando o el flujo con la corrección aplicada y ver que funciona.
- Si no se puede repetir, buscar la evidencia en la salida real (log, cabecera, medición).
- Si no hay forma de comprobarlo, se guarda como **hipótesis**, no como regla.

### 4. Compose — escribir la lección

Elegir destino según el alcance:

| Tipo de lección | Destino |
|---|---|
| Error con causa y solución | `tools/memoria/errores.md` |
| Comando o receta verificada | `tools/memoria/recetas.md` |
| Decisión con su porqué | `tools/memoria/decisiones.md` |
| Procedimiento repetible | una skill en `skills/` |
| Lección transversal con evidencia | `tools/memoria/experiencia.md` (biblioteca) |

Formato de la biblioteca (`experiencia.md`), una entrada por lección:

```markdown
### <AAAA-MM-DD> — <título corto>
- **Ámbito:** general | <proyecto> | <herramienta>
- **Fallo:** <qué pasó, con el error literal>
- **Causa:** <por qué>
- **Regla:** <qué hacer siempre>
- **Evidencia:** <comando, log o medición que lo demuestra>
- **Cuándo aplica:** <disparador para recuperarla>
```

Registrar con el script para no romper el formato:

```powershell
python E:\ANTIGRAVITY\scripts\mejora\registrar_leccion.py --titulo "..." --ambito general `
  --fallo "..." --causa "..." --regla "..." --evidencia "..." --aplica "..."
```

### 5. Enlazar

- Si la lección cambia cómo se hace una tarea que ya tiene skill, **editar la skill**, no solo la memoria.
- Si la lección aplica a una carpeta concreta, añadirla al `AGENTS.md`/`CLAUDE.md` de esa carpeta o al índice `mapa.md`.
- Máximo una entrada por lección: si ya existe, se amplía en vez de duplicarla.

## Límites

- No convertir esto en un diario: una lección por fallo real, no por cada paso.
- No reescribir skills enteras por una anécdota; primero comprobar que la regla se sostiene.
- Nada de credenciales, tokens ni rutas privadas en la biblioteca.
- No ejecutar código generado sin sandbox ni revisión, ni siquiera si viene de un agente.

## Presupuesto

Este bucle cuesta minutos, no horas. Si una lección necesita más de 15 minutos de investigación,
convierte eso en una tarea aparte (con la skill `investigacion`) y deja aquí solo el hallazgo.
