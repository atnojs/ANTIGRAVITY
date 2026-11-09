---
name: superagente-antigravity
description: "Actívala cuando llegue trabajo por GitHub (issue, comentario o PR que mencione al agente), cuando haya que operar el superagente (filtro, router, workers, tickets, panel) o cuando se instale, arranque o diagnostique dsh-superagent. Fija el triaje, la rama agent/<ticket>, el PR sin merge, el gate autocalidad-90 y los límites de atención."
---

# Superagente — puntero

El agente que vive en GitHub (prototipo `deepseek-ai/dsh-superagent-prototype`, bundle de DeepSeek
Harness) y el modo manual equivalente. La regla que más se olvida: **`main` publica en producción,
así que el merge lo decide una persona**; el agente trabaja en `agent/<ticket>` y entrega PR en draft.

### Contenido completo de esta skill

El texto íntegro vive en **`skills/SKILL_SUPERAGENT.md`** (relativo a la raíz del proyecto). Léelo y
aplícalo tal cual. Instalación y estado del prototipo: `tools/superagent/INSTALAR.md`. Si hay que
cambiar algo, se cambia SOLO en el árbol canónico `skills/`.
