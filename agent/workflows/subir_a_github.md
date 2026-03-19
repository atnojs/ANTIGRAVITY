---
description: Subir una app a un nuevo repositorio de GitHub
---

Este workflow automatiza la creación de un repositorio en GitHub con el mismo nombre que la carpeta contenedora de la app, inicializa git, hace commit y sube el código.

1. Identificar la ruta de la app que el usuario quiere subir.
2. Extraer el nombre de la carpeta contenedora (ej. `combinar_imagenes`).
3. Usar la herramienta `mcp_github-mcp-server_create_repository` para crear el repositorio con ese nombre en la cuenta de GitHub conectada.
// turbo-all
4. Ejecutar los siguientes comandos en la ruta de la app usando `run_command` reemplazando `<nombre_carpeta>` por el nombre extraído:
   `git init`
   `git add .`
   `git commit -m "Initial commit"`
   `git branch -M main`
   `git remote add origin https://github.com/atnojs/<nombre_carpeta>.git`
   `git push -u origin main`
5. Informar al usuario que la app ha sido subida exitosamente con la URL del repositorio.
