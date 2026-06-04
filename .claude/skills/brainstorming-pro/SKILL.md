---
name: brainstorming-pro
description: "Genera ideas de calidad con estructura, filtros y selección final. Activar cuando el usuario necesite opciones creativas con criterio, nombres, hooks, formatos o enfoques, y una recomendación clara."
---

# Brainstorming Pro

## Cuándo usar esta habilidad

- Cuando el usuario pida ideas, variantes, conceptos, hooks, nombres, formatos o enfoques.
- Cuando haya bloqueo creativo o demasiadas opciones y haga falta ordenar.
- Cuando el usuario necesite ideas "buenas para ejecutar", no solo ocurrencias.
- Antes de crear una app con la skill `crear`, si la idea es vaga.

## Inputs necesarios (si faltan, pregunta primero)

1. **Objetivo exacto**: qué se quiere conseguir.
2. **Público / contexto**: para quién es y dónde se usa.
3. **Restricciones**: tiempo, presupuesto, tono, formato, herramientas.
4. **Ejemplos**: de lo que SÍ y lo que NO (si el usuario tiene preferencias).

## Workflow

### 1. Aclarar el encargo

Si faltan datos, hacer 3-5 preguntas rápidas antes de generar.

### 2. Generar en 4 tandas

#### A) 10 ideas rápidas
Claras, concretas y ejecutables. Sin ideas genéricas tipo "mejorar tu productividad".

#### B) 5 ideas "diferentes"
Ángulos no obvios, aproximaciones laterales, combinaciones inesperadas.

#### C) 5 ideas "low effort"
Rápidas de producir, bajo coste, alto retorno inmediato.

#### D) 3 ideas "high impact"
Más ambiciosas, más potentes, mayor diferenciación. Pueden requerir más recursos.

### 3. Filtrar y puntuar

Puntuar cada idea (1-5) en estas 5 dimensiones:

| Dimensión | Qué mide |
|-----------|----------|
| **Impacto** | ¿Cuánto mueve la aguja? |
| **Claridad** | ¿Se entiende en 5 segundos? |
| **Novedad** | ¿Es diferente a lo que ya existe? |
| **Esfuerzo** | ¿Cuánto cuesta ejecutarla? (5 = bajo esfuerzo) |
| **Viabilidad** | ¿Se puede hacer con los recursos disponibles? |

### 4. TOP 5 recomendado

Para cada una de las 5 mejores:
- **Idea** (1 línea)
- **Por qué funciona** (2 líneas)
- **Primer paso** (1 línea concreta para empezar YA)

## Reglas de calidad

- **Nada genérico**: "mejorar tu productividad" no vale. Concretar siempre.
- **Hooks/títulos**: cortos, con tensión o curiosidad.
- **Formatos**: incluir estructura + ejemplo del primer minuto.
- **Si algo depende de un factor incierto**, decirlo y ofrecer alternativa.
- **Priorizar lo ejecutable**: una idea mediocre ejecutada > una idea brillante en un cajón.

## Output (formato exacto)

```markdown
## 🎯 Brainstorming: [tema]

### A) 10 ideas rápidas
1. ...
2. ...
...

### B) 5 ideas diferentes
1. ...
...

### C) 5 ideas low effort
1. ...
...

### D) 3 ideas high impact
1. ...
...

### 🏆 TOP 5 recomendado

| # | Idea | Impacto | Claridad | Novedad | Esfuerzo | Viabilidad | Total |
|---|------|---------|----------|---------|----------|------------|-------|
| 1 | ... | 5 | 4 | 5 | 4 | 5 | 23 |
| ... | ... | ... | ... | ... | ... | ... | ... |

#### 1. [Nombre de la idea]
**Por qué funciona**: ...
**Primer paso**: ...
```
