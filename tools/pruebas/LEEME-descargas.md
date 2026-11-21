# Pruebas de la app Descargas (21/11/2026)

`descargas-api-test.mjs` prueba la API de `apps/descargas` sin tocar producción:
siembra una cola de 8 trabajos y comprueba sonda, orden, pausa, límites, errores
y limpieza. Necesita:

1. Una copia local de la app con `auth.php` que entre sin contraseña (como
   `E:\ANTIGRAVITY\.tmp-build\descargas-test`) y un `fake-worker.mjs` que conteste
   sondas y herramientas (no versionados).
2. Un servidor PHP: `php -n -d yac.enable=0 -d session.save_path=<carpeta> -S 127.0.0.1:4305 -t <copia>`
3. Ejecutar: `API_BASE=http://127.0.0.1:4305 node descargas-api-test.mjs`

El motor y el worker de verdad se prueban aparte, contra producción.