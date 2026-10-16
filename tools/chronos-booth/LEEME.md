# Chronos Booth (antes `apps/temp_extract`)

## Qué es

App exportada de **Google AI Studio** (`ai.studio/apps/cded2645-0917-4ea2-9a81-b21940a5f1ee`):
una **cabina fotográfica con viaje en el tiempo** que inserta tu cara en escenas históricas con IA.

- **Título:** «CHRONOS BOOTH» · `metadata.json`: *"A time-traveling photo booth that inserts your
  face into historical scenes using AI."*
- **Stack:** React 19 + Vite 6 + Tailwind 4 + Firebase (Auth con Google + Firestore) +
  `@google/genai`. `src/App.tsx` tiene **909 líneas** (escenas históricas, cámara, registros
  temporales, historial por usuario).
- **Origen del nombre de la carpeta:** venía de un zip descomprimido; `package.json` se llama
  literalmente `react-example`.

## Por qué está aquí y no en `apps/`

`apps/` se despliega en la **raíz pública de Hostinger como sitio estático**. Esto es un proyecto
**Vite**: necesita `npm run build` y que se sirva el `dist/`.

Tal cual estaba, `index.html` pedía `/src/main.tsx` y el servidor devolvía **TSX en crudo** con
HTTP 200 — algo que un navegador no puede ejecutar. Comprobado el 2026-10-16:

```
https://atnojs.es/apps/temp_extract/src/main.tsx   → 200 (231 bytes de TypeScript)
https://atnojs.es/apps/temp_extract/src/App.tsx    → 200 (42 KB de TypeScript)
https://atnojs.es/apps/temp_extract/dist/          → 404 (no hay build)
```

O sea: **la app no funcionaba** donde estaba, y además publicaba sin querer todo el código fuente
y `firebase-applet-config.json` con la clave `AIzaSyAYhoQj…`.

## Qué se hizo

El **2026-10-16** se movió aquí con `git mv` desde `apps/temp_extract/` — git lo registra como
**renombrado**, así que el historial de los 17 ficheros se conserva. `tools/` está protegido por
`.htaccess` (`Require all denied`), así que ni el código ni la clave son accesibles por web.

## Para ponerla viva

1. `npm install && npm run build`.
2. Desplegar el `dist/` como app estática (o montarlo como `apps/chronos_booth/` con el build).
3. **La `GEMINI_API_KEY` no puede ir en el navegador**: `@google/genai` se usa en el cliente, así
   que hay que pasarla por `proxy.php`, el patrón del proyecto
   (`skills/SKILL_arquitecto-backend-php-hostinger.md`).
4. Revisar `firestore.rules` antes de exponerla: es una app con Auth y datos por usuario.

## Nota

Hay también un `apps/chronos-booth (1).zip` (gitignored, sin publicar) con la misma app.
