# Réplica Infográfica

App web + cliente Electron para crear una infografía nueva a partir de una referencia visual.

## Flujo

1. Abre Google desde la app de Windows y descarga una referencia, o súbela manualmente.
2. La app detecta la última imagen de Descargas y la analiza en un JSON de estilo/composición.
3. El usuario introduce contenido libre y/o campos estructurados.
4. FLUX.2 genera una nueva infografía usando la referencia y el JSON como guía.
5. El resultado se persiste en el historial del servidor y puede descargarse.

## Servidor

Subir esta carpeta a `public_html/apps/infografia-referencia/`. El servidor debe exponer las variables `F` (Black Forest Labs) y `R` (OpenRouter) mediante `SetEnv` en el `.htaccess` raíz. Las claves nunca se incluyen en estos archivos.

## Escritorio

```powershell
npm install
npm start
```

Para otra URL de producción, define `INFOGRAFIA_APP_URL` antes de iniciar Electron.
