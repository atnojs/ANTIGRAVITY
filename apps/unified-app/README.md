# Unified Studio (`apps/unified-app`)

App React 19 + Vite + Tailwind + Firebase del proyecto Antigravity.
Publicada en **https://atnojs.es/apps/unified-app/**.

## Qué es

Una sola suite con tres módulos:

- **AI Lab** — generación de imagen con prompt, relaciones de aspecto y presets de estilo.
- **Edit Studio** — inpainting/edición por máscara sobre una imagen subida.
- **Pro Effects** — acabados, presets y upscaling.

Login con Firebase Auth (email/contraseña y Google). Las llamadas a IA pasan por
`proxy.php`, que es el único que habla con la API (la clave nunca llega al navegador).

## Estructura publicada (lo que se sirve por web)

| Ruta | Qué es |
|---|---|
| `index.html` | Página de producción. **Generada** por `scripts/publish.mjs`; no la edites a mano. |
| `assets/app.<fecha>.js` / `.css` | Build versionado. Se renombra en cada publicación porque la CDN de Hostinger cachea por ruta. |
| `proxy.php` | Proxy único de IA (Gemini/Replicate). Contrato: `task` = `enhancePrompt`, `generateImage`, `inpainting`, `applyStyle`, `upscale`. |
| `config.php` | **No se versiona** (`.gitignore` lo excluye por ser el sitio habitual de una clave). `proxy.php` resuelve la clave por entorno del servidor (cascada `getenv`/`$_SERVER`/`$_ENV`); si existe un `config.php` en el servidor, manda su `define('A', ...)`. |
| `.htaccess` | CSP para Firebase/Google, caché y deny de andamiaje de desarrollo. |

> El `lightbox.js` genérico que traía `dist/` **no se publica**: inyecta un overlay oscuro
> con `display:flex` en línea que tapa toda la app. Unified Studio ya tiene su propio visor
> de imagen en React.

## Desarrollo

```powershell
cd E:\ANTIGRAVITY\apps\unified-app
npm install
npm run dev          # http://localhost:5173/apps/unified-app/index.dev.html
```

- La entrada de Vite es **`index.dev.html`** (carga `/src/main.jsx`).
- `index.html` es la página de producción y no se toca a mano.

## Compilar y publicar

```powershell
npm run publish:app            # publica el dist/ actual
npm run deploy:app             # vite build + publicar
```

`scripts/publish.mjs` copia el build a `assets/app.<fecha-hora>.js|css`, normaliza la
ruta del proxy a `proxy.php` y actualiza `index.html`. Los assets viejos no se borran:
los navegadores con HTML cacheado los siguen pidiendo.

## Historial del arreglo (2026-10-27)

La app se quedó sin `src/`: `index.html` era todavía el index de desarrollo y apuntaba
a `/src/main.jsx`, que no existía → 404 y **pantalla en blanco en producción**. El build
compilado sí funcionaba. Se publicó ese build en la raíz de la app (versionado y con el
proxy relativo), se separó la entrada de desarrollo y se dejó `scripts/publish.mjs` para
que la publicación sea reproducible.

Además se corrigió la configuración de Firebase del build publicado: el proyecto
`generacion-de-imagenes-6e624` que traía el bundle tiene el **apiKey revocado/inexistente**
(`API_KEY_INVALID`, comprobado contra `identitytoolkit.googleapis.com`), de modo que el
login fallaba siempre. Se cambió a la configuración del proyecto **`nanobanana-cbb2d`**,
el que usan las apps vivas del catálogo (`generar_imagenes`, `imagenes_ia`,
`prompts_predeterminados`, `viaje_tiempo`) y cuya clave responde correctamente
(`auth/invalid-credential` con credenciales falsas, `auth/unauthorized-domain` no).

> Si Antonio quiere conservar el proyecto antiguo, hay que **regenerar su apiKey** en
> Google Cloud/Firebase y volver a publicar; hoy no sirve.

> Pendiente conocido: el árbol `src/` original no está en git ni en backups. Se está
> reconstruyendo desde el bundle; hasta que esté verificado, el build publicado es la
> referencia funcional.
