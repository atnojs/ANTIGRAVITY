---
name: replicar-app
description: "Clona una app o web real a partir de su URL (o de un .exe/.dll en Windows): captura la interfaz y la red con REA, inventaría pantallas, flujos, endpoints y estados, y construye una réplica funcional en el proyecto con paridad medida. Activar con 'clona esta app', 'replica esta web', 'hazme algo igual que X', 'copia esta interfaz' o 'reconstruye esta herramienta'."
---

# Replicar app — puntero

El texto íntegro vive en **`skills/SKILL_REPLICAR_APP.md`**. Léelo y aplícalo tal cual.

Resumen:

1. Captura real: `python E:\ANTIGRAVITY\tools\replicar-app\captura_inicial.py "<URL>"` y, para lo que no ve,
   REA (screenshots, DOM, escenarios). Nada de replicar de memoria.
2. `inventario.md` con pantallas, flujos, estados, datos y endpoints observados.
3. Tokens de diseño reales.
4. Esqueleto con `crear` (+ `arquitecto-backend-php-hostinger` si hay backend).
5. Implementación pantalla a pantalla con estados vacío/carga/error.
6. Paridad medida con `verificacion-playwright` y capturas comparativas; 3 anchos.
7. `autocalidad-90` con verificador independiente y `publicar-git`.

Límites: se clona estructura, flujos y comportamiento; no se copian logos, textos ni assets ajenos, no se
saltan logins ni paywalls y no se suplanta ninguna app.

Rama nativa (Windows, .exe/.dll): captura en sandbox, REA + Ghidra para entender el binario, inventario con
prioridad por función, reconstrucción propia y matriz de paridad. Nada de crackear licencias ni DRM, y nunca
ejecutar el binario en el equipo de trabajo.
