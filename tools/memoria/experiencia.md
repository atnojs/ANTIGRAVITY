# Experiencia acumulada

Lecciones con evidencia, reutilizables. Una entrada por lección; si se repite, se amplía.
Formato y reglas: `skills/SKILL_MEJORA_CONTINUA.md`. No escribas credenciales ni rutas privadas.

---

### 2026-10-23 — El CDN de Hostinger cachea app.js y app.css
- **Ámbito:** proyecto
- **Fallo:** La app servia el JavaScript anterior aunque el archivo estuviera desplegado
- **Causa:** El CDN cachea estaticos y la URL no cambiaba
- **Regla:** Subir la version en index.html (app.js?v=AAAA...) cada vez que cambie un estatico
- **Evidencia:** app.js 22261 bytes sin improvePrompt hasta pedirlo con ?v=20261022a (30302 bytes)
- **Cuándo aplica:** Todo cambio en apps con estaticos en Hostinger

### 2026-10-23 — nginx corta a 60 s: la IA debe responder antes de 50
- **Ámbito:** proyecto
- **Fallo:** El proxy de Flow Studio devolvia 504 Gateway Time-out a los 55 s
- **Causa:** La llamada a OpenRouter tardaba mas que el corte de nginx
- **Regla:** Limitar la llamada al modelo a 50 s, bajar max_tokens y pedir respuestas cortas; si no cabe, devolver error claro antes del 504
- **Evidencia:** 504 a 55,4 s con prompt largo; 21-30 s con max_tokens 650 y 40-55 palabras
- **Cuándo aplica:** Cualquier endpoint PHP que llame a un modelo de IA

### 2026-10-23 — El despliegue de Hostinger se congela en silencio
- **Ámbito:** proyecto
- **Fallo:** Produccion seguia sirviendo el index anterior horas despues del push
- **Causa:** El webhook de despliegue no siempre dispara, aunque GitHub tenga el commit
- **Regla:** Comprobar git ls-remote y Last-Modified del index; si no coincide, commit vacio y push para re-disparar, o implementar desde hPanel
- **Evidencia:** HEAD c42a0fb del 22/10 17:03 frente a index con Last-Modified 15:47 UTC
- **Cuándo aplica:** Siempre que se verifique un cambio en produccion

### 2026-10-23 — Los topes de tiempo del puente cortaban tareas largas
- **Ámbito:** herramienta
- **Fallo:** Las tareas se cortaban a los 15 minutos con el trabajo a medias
- **Causa:** runTimeoutMs valia 900000 en config.json y en los valores por defecto de config.mjs y dsh.mjs
- **Regla:** runTimeoutMs a 86400000 y sin timeout en los subprocess de generacion; no reintroducir topes de 900 s
- **Evidencia:** config.json runTimeoutMs 900000 -> 86400000; dsh.mjs timeoutMs 900000 -> 86400000
- **Cuándo aplica:** Cualquier tarea larga que pase por el puente de WhatsApp

### 2026-10-23 — Chrome con el perfil de Flow abierto rompe la generacion
- **Ámbito:** herramienta
- **Fallo:** flow.py moria en 2 s con un RuntimeError de asyncio, sin mensaje util
- **Causa:** Playwright no puede abrir un perfil persistente que ya usa otro Chrome (--user-data-dir flowbot-profile)
- **Regla:** Cerrar todo Chrome con flowbot-profile antes de generar: Get-CimInstance Win32_Process ... Stop-Process
- **Evidencia:** Trabajos en error a los 2 s; tras cerrar Chrome, flow.py genero prueba_perfil.jpg
- **Cuándo aplica:** Antes de cualquier generacion con Flow o con el worker de la cola

