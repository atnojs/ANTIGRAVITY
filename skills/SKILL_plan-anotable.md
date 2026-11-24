---
name: plan-anotable
description: "Convierte un plan largo en una página local que se comenta por secciones y devuelve el feedback en markdown listo para el agente. Úsala cuando haya que revisar un plan, una propuesta, un índice de documento o un informe de más de ~15 líneas, o cuando el usuario tenga que aprobar punto por punto antes de ejecutar."
---

# Plan anotable — revisar el plan en el navegador, no en el chat

## Qué resuelve

Un plan largo en el chat se responde a ciegas: «cambia el punto 3» obliga al agente a adivinar qué punto. Esta skill publica el plan como página local, deja anotar sección por sección y devuelve **un solo bloque de markdown** con las decisiones. El agente aplica ese bloque; no relee la conversación.

Coste: cero red, cero cuota, un archivo. No sustituye a nada del gate: el plan sigue necesitando verificador antes de ejecutarse.

## Cuándo se usa

1. Planes, propuestas, índices, guiones y borradores de más de ~15 líneas.
2. Cuando el usuario vaya a aprobar, recortar o corregir punto por punto.
3. Antes de ejecutar algo caro: la aprobación queda fechada y firmada por sección.

No se usa para: planes de dos líneas (se contestan en el chat), ni para revisar código (eso es `cirujano-codigo-produccion` + diff), ni para entregables ya terminados (eso es `autocalidad-90`).

## Cómo se usa

1. **Rellenar los datos.**

   **Vía rápida (por defecto).** Escribe el plan en markdown y que el generador monte la página:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File \\Principal\e\ANTIGRAVITY\tools\plan-anotable\plan-a-html.ps1 plan.md -Abrir
   ```

   Traduce `# título` → título, los párrafos previos al primer `##` → contexto, cada `##` → una sección revisable, y `## Riesgos` / `## Preguntas` → sus listas. Genera el JSON con `ConvertTo-Json` y lo **relee para verificar**: aquí no se escribe JSON a mano. Con `-WhatIf` enseña qué secciones saldrían; con `-Salida` se elige destino (por defecto `tools/evidencias/<fecha>-plan-<slug>/plan.html`).

   **A mano (solo si el generador no encaja).** En `recursos/plan-anotable/plantilla.html`, sustituir el bloque `<script type="application/json" id="datos">` por el plan real:

   ```json
   {
     "titulo": "Plan: <título>",
     "fecha": "AAAA-MM-DD",
     "contexto": "una línea con el objetivo y el alcance",
     "secciones": [{ "titulo": "<paso>", "texto": "<qué se hace y cómo se comprueba>" }],
     "riesgos": ["<lo que puede salir mal>"],
     "preguntas": ["<decisión que depende del usuario>"]
   }
   ```

   El orden de `secciones` es el que se ve. Los `texto` admiten markdown mínimo (`**negrita**`, `-` listas, `código`). **No pongas el número en `titulo`**: la plantilla ya numera sola («1. Primera decisión»).

2. **Abrirla y pasarla.** La vía rápida ya la deja escrita en `tools/evidencias/<AAAA-MM-DD>-plan-<tema>/plan.html` (o donde diga `-Salida`), así que **no copies nada encima**: si la sobrescribes con la plantilla vacía, pierdes el plan. Solo si vas a mano, copia ahí la plantilla ya rellenada. Abrirla:

   **Con Chrome por ruta, no por asociación.** Abrir el archivo con el manejador del
   sistema depende de `assoc` y de `UserChoice`, y no siempre acaba en Chrome: en esta
   máquina `assoc .html` apunta a `iexplore.exe`, que no pinta la página. Abrir siempre
   con la ruta del navegador:

   ```powershell
   Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" `
     "\\Principal\e\ANTIGRAVITY\tools\evidencias\2026-11-23-plan-tema\plan.html"
   ```

   O más simple: `plan-a-html.ps1 plan.md -Abrir` ya lo lanza así.

   En la respuesta al usuario, una línea: qué se está revisando y el enlace al archivo. **El plan no se vuelca en el chat.**

3. **Recoger el resultado.** El usuario pulsa «Copiar feedback» (o «Descargar .md») y lo pega. Se aplica tal cual: lo aprobado se ejecuta, lo comentado se rehace, lo marcado como rechazado se cae. Lo que no tenga marca se declara **sin revisar** y no se ejecuta.

## Qué devuelve

Un markdown con esta forma, que es el contrato de entrada del agente:

```text
## Feedback del plan — <título> (fecha)
Estado: 2 aprobadas · 1 con cambios · 0 rechazadas · 1 sin revisar

### 1. <sección>
APROBADA

### 2. <sección>
CON CAMBIOS
> <comentario literal del usuario>

### 4. <sección>
SIN REVISAR
```

## Reglas

1. **Una sección, una decisión.** Si una sección mezcla dos cosas, se parte: el comentario debe poder aplicarse sin ambigüedad.
2. **El comentario manda literal.** No se «interpreta» a favor de lo que ya estaba escrito.
3. **Sin marca no hay permiso.** Lo `SIN REVISAR` no se ejecuta ni se da por bueno.
4. **Los comentarios se guardan solos** (`localStorage`, por título y fecha): recargar la página no pierde nada. No se envía nada a ningún servidor.
5. **La página es local.** No se publica en el hosting ni se comparte por URL: se abre desde disco.
6. **El feedback entra en el gate.** Si el plan cambia, la versión cambia y el verificador revisa la nueva.

## Checklist

- [ ] ¿El plan está en JSON válido y la fecha es la de hoy?
- [ ] ¿Cada sección es una decisión, no un párrafo?
- [ ] ¿He abierto la página y comprobado que se ve bien (sin scroll horizontal)?
- [ ] ¿He dicho al usuario qué revisar y dónde está el archivo, sin volcar el plan en el chat?
- [ ] ¿Al aplicar el feedback he respetado lo `SIN REVISAR` como no aprobado?
