---
name: planificacion-pro
description: "Convierte una idea en un plan ejecutable por fases, con checklist, riesgos y entregables. Activar cuando haya que pasar de idea a acción sin improvisar, o cuando el usuario pida un plan, estrategia u hoja de ruta."
---

# Planificación Pro

## Cuándo usar esta habilidad

- Cuando el usuario pida un plan paso a paso, una estrategia o una hoja de ruta.
- Cuando haya que entregar algo (landing, vídeo, proyecto, lanzamiento) con tiempos.
- Cuando el usuario tenga muchas tareas sueltas y quiera ordenarlas.
- Antes de ejecutar la skill `crear` para proyectos complejos.

## Inputs necesarios (si faltan, pregunta primero)

1. **Resultado final**: qué significa "terminado" (1 frase).
2. **Fecha límite o ritmo**: hoy, esta semana, sin prisa.
3. **Recursos disponibles**: herramientas, equipo, presupuesto, tiempo diario.
4. **Criterios de éxito**: qué debe cumplir para considerarse bien hecho.

## Workflow

### 1. Definir el resultado

- Resultado final en 1 frase.
- 3 criterios de éxito medibles.

### 2. Dividir en fases (máximo 4)

```
Fase 1: Preparación
Fase 2: Producción / Ejecución
Fase 3: Revisión / QA
Fase 4: Publicación / Entrega
```

Para cada fase:

- **Tareas** en orden de ejecución.
- **Entregable claro**: qué sale de esa fase (archivo, documento, versión funcional).
- **Tiempo estimado** por tarea (aproximado).
- **Dependencias**: "esto depende de que X esté completado".

### 3. Riesgos y mitigación (3-5)

```
Si pasa X → hago Y
```

Identificar:
- Lo que puede salir mal.
- Probabilidad (baja/media/alta).
- Impacto (bajo/medio/alto).
- Plan de contingencia.

### 4. Checklist final de validación

Lista de verificación para saber que el proyecto está realmente terminado:

- [ ] Criterio de éxito 1
- [ ] Criterio de éxito 2
- [ ] Criterio de éxito 3
- [ ] Todos los entregables completados
- [ ] Riesgos mitigados o aceptados

## Reglas de calidad

- **Evitar planes infinitos**: priorizar lo que desbloquea lo siguiente.
- **Dependencias explícitas**: indicar claramente "esto depende de X".
- **Usuario principiante**: reducir pasos y dar opciones simples.
- **Usuario avanzado**: incluir optimizaciones y atajos.
- **Tiempos realistas**: redondear hacia arriba, añadir 20% de margen.

## Output (formato exacto)

```markdown
## 📋 Plan: [nombre del proyecto]

### 🎯 Resultado final
[1 frase]

### ✅ Criterios de éxito
1. ...
2. ...
3. ...

---

### Fase 1: Preparación
| # | Tarea | Tiempo est. | Depende de |
|---|-------|-------------|------------|
| 1 | ... | 30 min | — |
| 2 | ... | 1 h | #1 |

**Entregable**: ...

### Fase 2: Producción
...

### Fase 3: Revisión / QA
...

### Fase 4: Publicación / Entrega
...

**Tiempo total estimado**: X horas/días

---

### ⚠️ Riesgos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|:-----------:|:-------:|------------|
| ... | Media | Alto | ... |

---

### 📝 Checklist final
- [ ] ...
```
