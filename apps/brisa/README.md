# Brisa · Agenda personal

Aplicación autoalojada en PHP 8.2+ y JavaScript nativo. No necesita Node, compilación ni dependencias de frontend. Incluye calendario diario/semanal, tareas con prioridad y fechas separadas de planificación/vencimiento, notas buscables, captura de voz, transcripción asíncrona y clasificación por reglas revisable.

## Probar en Windows

Desde PowerShell, con PHP instalado:

```powershell
./start-local.ps1 -Demo
```

Abrir `http://127.0.0.1:8787/`. El script habilita las extensiones disponibles, crea ejemplos solo si la agenda está vacía y usa `.private/brisa-local` en la raíz del repositorio. Los datos no se versionan. Sin `-Demo`, no añade ejemplos. Ctrl+C detiene el servidor. La vista local permite acceso sin contraseña solo cuando concurren `BRISA_PREVIEW=1`, el servidor de desarrollo PHP y una conexión loopback. No utilizar este servidor de desarrollo para producción.

Los ejemplos son editables y no incluyen grabaciones ficticias. Los audios reales se pueden grabar y reproducir sin clave; su transcripción permanece pendiente hasta configurar el proveedor.

## Instalar en Hostinger

1. Subir esta carpeta a `public_html/apps/brisa`. Acceder mediante HTTPS.
2. Crear un directorio privado **fuera de `public_html`**, por ejemplo `/home/USUARIO/brisa-private`, escribible únicamente por el usuario del hosting. Definir `BRISA_STORAGE` con su ruta absoluta. No se permite usar una carpeta dentro de la raíz web.
3. Habilitar PHP con PDO, `pdo_mysql` (o `pdo_sqlite`), `fileinfo` y `curl`. Ajustar `upload_max_filesize=12M`, `post_max_size=13M`, memoria suficiente y tiempo de ejecución de al menos 130 segundos para el procesamiento web. El cron puede usar otra configuración PHP: comprobar sus extensiones por separado.
4. Definir las variables de entorno de abajo en el servidor. La aplicación no tiene contraseñas ni claves incrustadas. Las tablas se crean al primer acceso autenticado; no se modifica ninguna tabla externa. Se recomienda una base de datos exclusiva.
5. Configurar un cron con el PHP CLI del hosting y la ruta absoluta a `worker.php`, cada minuto si el plan lo permite. El cron debe recibir las mismas variables que la aplicación web: los `SetEnv` de Apache **no se heredan automáticamente en cron**. Usar un lanzador privado fuera de la raíz web o la configuración de entorno del proveedor.
6. Probar inicio de sesión, grabación en móvil, transcripción, recuperación tras cerrar la pestaña y una restauración de copia de seguridad.

| Variable | Uso |
| --- | --- |
| `BRISA_STORAGE` | Obligatoria. Ruta privada absoluta para audios, SQLite y control de intentos de acceso. |
| `BRISA_PASSWORD_HASH` | Obligatoria en producción. Hash generado con `password_hash` de PHP; nunca la contraseña en claro. Sin él la agenda queda bloqueada. |
| `BRISA_DSN` | MySQL: `mysql:host=localhost;dbname=TU_BD;charset=utf8mb4`. Si se omite, usa SQLite en el directorio privado. |
| `BRISA_DB_USER`, `BRISA_DB_PASSWORD` | Credenciales MySQL, solo en el servidor. |
| `OPENAI_API_KEY` | Activa la transcripción. Compatible también con el alias de entorno `R` usado por el resto del repositorio. |
| `BRISA_TRANSCRIPTION_MODEL` | Predeterminado `gpt-transcribe`; configurable sin cambiar código. |
| `BRISA_TIMEZONE` | Predeterminado `Atlantic/Canary`. Debe ser una zona IANA válida. |
| `BRISA_QUOTA_MB` | Predeterminado 500 MB para audios. |
| `BRISA_RETENTION_DAYS` | Predeterminado 30. Solo elimina archivos ya transcritos; 0 desactiva la limpieza automática. |

Para crear un hash sin poner la contraseña en el historial de comandos, ejecutar interactivamente `php -r '$p = trim(fgets(STDIN)); echo password_hash($p, PASSWORD_DEFAULT), PHP_EOL;'` y escribir la contraseña por stdin en un terminal privado. Si el terminal muestra lo escrito, usar el gestor de secretos del hosting. El hash es también una credencial: no subirlo a Git.

En Apache/LiteSpeed se pueden definir variables mediante `SetEnv` en el `.htaccess` privado ya gestionado por el propietario, cuidando las comillas del hash. No se añade ni modifica el `.htaccess` global desde esta aplicación. En nginx/PHP-FPM se definen mediante su configuración. No activar `BRISA_PREVIEW` en producción.

## Audio y comportamiento ante fallos

- `MediaRecorder` negocia WebM/Opus o MP4 según el navegador. Requiere HTTPS o localhost y permiso del micrófono. V inicia/detiene la captura cuando no estás escribiendo.
- Límite de interfaz: 180 segundos. Límite estricto del servidor: 10 MB, formato inspeccionado mediante `fileinfo`, cuota protegida por bloqueo de archivo. La duración declarada por el navegador no sustituye a una decodificación; el límite de bytes es la protección firme del servidor. Para un servicio multiusuario sería necesario inspeccionar duración con un decodificador.
- Al detener, el archivo completo se conserva temporalmente en IndexedDB antes de subirlo. Se reintenta al recuperar conexión o al volver a abrir la aplicación. No se garantiza recuperar una grabación que el sistema operativo mate antes de detenerla.
- El identificador de captura hace idempotente la subida. Una transacción crea nota y audio; el archivo se almacena antes de confirmar el guardado. La cuota cuenta también archivos huérfanos. El trabajador elimina los que no tengan referencia y lleven más de 24 horas, con un bloqueo compartido con las subidas.
- El navegador inicia el trabajador tras la subida; el cron continúa sin pestañas abiertas. La sesión PHP se libera antes de llamar al proveedor. El trabajador reclama cada trabajo mediante una actualización condicional y un bloqueo con vencimiento. Máximo tres intentos con espera creciente; después se ofrece reintento manual.
- La transcripción original se conserva separada del texto editable. No se sobrescribe una corrección, aunque llegue una respuesta tardía. El original puede consultarse en el editor de la nota.
- El audio se envía a OpenAI solo para transcribir. El clasificador funciona en PHP con reglas españolas, sin otra llamada de IA. Fechas ambiguas se revisan en formulario; no crea compromisos automáticamente. Las horas escritas con palabras no se interpretan todavía.
- Borrar una nota borra sus archivos, pero conserva tareas/citas derivadas. Borrar el destino devuelve la nota al inbox. El exportador JSON no sustituye al respaldo de archivos.

## Seguridad

Sesión con cookies HttpOnly, SameSite=Strict, Secure en HTTPS, regeneración al acceder, caducidad por inactividad y CSRF en escrituras. Diez intentos de contraseña por IP cada 15 minutos. Consultas parametrizadas, salida HTML escapada y política CSP sin scripts externos. Los archivos se sirven mediante API autenticada. La aplicación no abre CORS.

Mantener HTTPS extremo a extremo. Si se usa un proxy inverso, configurar PHP para reconocer HTTPS desde un proxy de confianza, sin aceptar cabeceras arbitrarias del cliente. La app es de un solo usuario. Las notas de voz pendientes en IndexedDB pertenecen al perfil local del navegador; no usar un perfil compartido.

## Pruebas y límites de esta versión

`tests/integration.php` necesita un directorio nuevo de pruebas en `BRISA_STORAGE` cuyo nombre contenga `brisa-test-` y PDO SQLite. Prueba persistencia, conflictos, fechas, conversiones idempotentes, trabajador, reintentos, retención y eliminación. Las llamadas al proveedor se sustituyen por un transporte de prueba, sin cargos.

El modelo de datos admite MySQL y SQLite. El ensayo automático local usa SQLite; validar MySQL y cron en la cuenta concreta antes de usarla como agenda principal. No se incluyen recurrencias, notificaciones push, cuentas múltiples ni sincronización offline completa. La búsqueda carga las notas de esta agenda personal; para grandes volúmenes conviene paginar. El calendario representa días de 24 filas y no distingue visualmente las dos instancias de una hora durante el cambio de horario de otoño.

Respaldo: para SQLite usar su API de backup o detener escrituras antes de copiar (no copiar solo el archivo principal mientras WAL está activo). Para MySQL, volcado consistente. Respaldar también los audios del directorio privado y comprobar la restauración. El cron solo limpia audios transcritos con la antigüedad configurada.

Documentación de transcripción: https://developers.openai.com/api/docs/guides/speech-to-text
