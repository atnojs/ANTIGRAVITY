# Instagram en la app de Descargas: qué funciona y qué necesita sesión

**Actualizado el 2026-10-18 (comprobado en producción):** los vídeos **públicos de Instagram se
bajan sin configurar nada**. Solo hacen falta cookies cuando el contenido es de una **cuenta
privada** o Instagram exige **seguir a esa cuenta**. En ese caso la app te dice exactamente eso:

- *«Instagram no da este contenido sin sesión…»* → hay que darle tus cookies de Instagram.
- *«This content is only available for registered users who follow this account»* → además de la
  sesión, ese vídeo es de una cuenta privada: tienes que **seguirla** con tu cuenta.

Esto **no se puede saltar** desde la app: no es un fallo del programa, es que Instagram no manda el
vídeo. Las dos formas de darle la sesión al worker (el programa que baja en tu PC) son estas.

---

## Opción A (recomendada): exportar un `cookies.txt` de Instagram

Se hace una vez. Las cookies duran semanas o meses; cuando caduquen, se repite.

1. En **Chrome**, instala la extensión **Cookie-Editor** (gratis, la de más usuarios; también vale
   «Get cookies.txt LOCALLY»).
2. Abre <https://www.instagram.com> y comprueba que estás **con tu cuenta**.
3. Pulsa el icono de **Cookie-Editor** → abajo **Export** → elige **Netscape**.
   Se descarga un fichero (o lo copia al portapapeles: entonces pégalo en un `.txt`).
4. Guárdalo en el PC, por ejemplo: `D:\Vídeos\ytdownloader\cookies-instagram.txt`.
5. Dímelo y yo añado esta línea a `.private\descargas-worker.json`:

   ```json
   "instagram_cookies": "D:\\Vídeos\\ytdownloader\\cookies-instagram.txt"
   ```

   (o lo editas tú y reinicias el worker).
6. **Reinicia el worker** (cierra su ventana y abre `tools\descargador\iniciar-worker.bat`).

A partir de ahí, Instagram baja como TikTok.

## Opción B (sin extensión): Firefox con la sesión iniciada

El problema de Chrome es que modernamente **cifra** las cookies y yt-dlp (el programa que descarga)
no puede leerlas: por eso `--cookies-from-browser chrome` falla con «Could not copy Chrome cookie
database». **Firefox no las cifra**, así que yt-dlp sí puede leerlas.

1. Instalar **Firefox** (si no está).
2. Abrir Firefox, entrar en <https://www.instagram.com> e **iniciar sesión**.
3. Añadir a `.private\descargas-worker.json`:

   ```json
   "instagram_browser": "firefox"
   ```

4. Reiniciar el worker.

Ventaja: no hay que exportar ficheros. Inconveniente: hay que instalar Firefox y, si algún día
caducan las cookies, hay que volver a iniciar sesión en Firefox.

---

## Cómo saber si ya funciona

En la app, pestaña **Instagram**, pega el enlace del reel y pulsa **DESCARGAR**. Si sale «EN COLA» y
luego «LISTO», ya está. Si vuelve a decir que no hay sesión, las cookies están caducadas: repite el
paso de exportar (o vuelve a iniciar sesión en Firefox).

> Ojo con las cuentas privadas: aunque tengas sesión, un reel de una cuenta que **no sigues** no se
> puede bajar. El propio mensaje de error lo dice («only available for registered users who follow
> this account»).

---

## ESTADO ACTUAL (2026-10-18 16:20) — ya está configurado

Antonio exportó las cookies con **Cookie-Editor** (botón Export → `.json`, que las copia al
portapapeles) y se convirtieron al formato Netscape. Está todo puesto:

- Fichero: `D:\Vídeos\ytdownloader\cookies-instagram.txt` (fuera del repositorio; contiene su
  sesión, no se versiona).
- Configuración: `"instagram_cookies": "D:\\Vídeos\\ytdownloader\\cookies-instagram.txt"` en
  `.private\descargas-worker.json` (worker reiniciado para que lo lea).
- Comprobado: yt-dlp dice `[Instagram] Found Instagram account cookies` y los reels públicos bajan
  con la sesión puesta. También se ha comprobado lo contrario: **10 reels seguidos se bajaron sin
  cookies** (14:35–16:07), así que el Instagram público no necesita sesión.

**Cuándo hay que repetirlo:** cuando Instagram caduque la sesión (semanas o meses). El síntoma es
que vuelve el error de «Instagram no da este contenido sin sesión». Para renovarlo: repetir el
Export en Cookie-Editor (Instagram abierto y con sesión) y volver a convertir el JSON a Netscape en
esa misma ruta.

**Lo que no está disponible:** los dos reels que fallaron al principio (`DemQccogGmdey…` y
`DeS9kSUjQkF…`) **siguen fallando también con las cookies** (`HTTP 400`). No es falta de sesión:
esos dos posts no están disponibles (borrados, restringidos o solo para seguidores). No hay manera
de bajarlos.

**Resumen:** Instagram público = sin cookies. Instagram con sesión = con cookies (ya puestas). Posts
que no están disponibles = imposible, con o sin sesión.