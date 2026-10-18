# Instagram en la app de Descargas: hace falta la sesión

**TikTok y YouTube funcionan sin configurar nada. Instagram no**: desde hace un par de años
Instagram no entrega los vídeos a quien no ha iniciado sesión. La app lo intenta, y si el vídeo es
privado o de una cuenta que no sigues, te dice exactamente eso:

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
