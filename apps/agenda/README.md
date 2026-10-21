# Agenda Personal

Agenda privada de un solo usuario: citas fijas (calendario), tareas con prioridad,
inbox de notas rápidas y captura de voz con transcripción automática y clasificación.

Publicada en **https://atnojs.es/apps/agenda/**.

## Arquitectura (adaptada a Hostinger compartido)

El proyecto original que generó el modelo era Node + Express + SQLite + Gemini.
El hosting de atnojs.es es compartido (LiteSpeed + PHP): no ejecuta Node. Por eso
la app se ha portado sin perder el diseño ni las funciones:

- **Frontend**: React 19 + Vite + Tailwind 4, compilado a estático (`index.html` +
  `assets/`). Código fuente en `src/`, plantilla de desarrollo en `index.dev.html`.
- **Backend**: PHP 8 (`api.php`, `auth.php`, `audio.php`, `lib.php`). Estado en
  `data/state.json` con escritura atómica y `flock`; audios en `data/audio/`.
  Sin MySQL, sin Node, sin SQLite que mantener.
- **Transcripción**: OpenAI (`gpt-4o-mini-transcribe`, fallback `whisper-1`) con la
  clave que vive en el `.htaccess` raíz del servidor (`OPENAI_API_KEY` o `O`).
  La clasificación se hace con reglas en español (`lib.php`), sin gastar más API.
- **Acceso**: contraseña de edición del proyecto (sesión con cookie HttpOnly +
  SameSite=Strict y token CSRF en todas las escrituras).

## Flujo

1. `GET /api/events|tasks|notes|stats` pinta la agenda.
2. `POST /api/audio/process` recibe el audio en base64, lo guarda en `data/audio/`,
   lo transcribe con OpenAI y devuelve una sugerencia (`appointment` / `task` / `note`)
   con fecha, hora y prioridad precargadas.
3. El usuario revisa y confirma: `POST /api/events|tasks|notes` (o `PUT`/`DELETE`).
4. `data/` está protegida por `.htaccess` y fuera de Git: el despliegue no la pisa.

## Desarrollo local

```bash
npm install
npm run dev        # Vite en http://localhost:3000
npm run publish    # build + copia index.html y assets/ a la raíz de la app
```

Para probar el backend PHP sin la clave real:

```powershell
$env:AGENDA_MOCK_STT='1'
php -S 127.0.0.1:8091 -t apps/agenda router-local.php
```

`router-local.php` (fuera del repo) emula las reglas del `.htaccess`:
`/api/*` → `api.php` y `/uploads/audio/*` → `audio.php`.

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | diagnóstico (no gasta API) |
| GET | `/api/events`, `/api/tasks`, `/api/notes` | listados |
| POST | `/api/events`, `/api/tasks`, `/api/notes` | crear |
| PUT/DELETE | `/api/events/{id}`, … | editar / borrar |
| GET | `/api/stats` | contadores y espacio de audios |
| POST | `/api/seed/reset` | datos de ejemplo |
| POST | `/api/audio/process` | guardar + transcribir + clasificar |

## Seguridad

- Sin sesión, la API responde `401` y `audio.php` no sirve ningún audio.
- Las escrituras exigen `X-CSRF-Token`.
- Los audios no son ficheros estáticos: se sirven con `audio.php` y Range.
- Ninguna clave se escribe en el frontend, en este README ni en el repositorio.
