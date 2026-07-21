# Prompt Studio Premium

Aplicación web para crear y mejorar prompts profesionales mediante Método Copiloto y Mejorador profesional de prompts. Está pensada para personas sin formación en inteligencia artificial.

## Archivos principales

- `index.html`: interfaz.
- `app.css`: sistema visual Hoola/Relatos y responsive.
- `app.js`: flujo de usuario, resultados e historial.
- `proxy.php`: conexión protegida con OpenRouter.
- `history.php`: persistencia JSON en servidor.
- `history-manager.js`: cliente del historial.
- `skills/`: skills ejecutadas por el backend.
- `MANUAL_USUARIO.md`: instrucciones sencillas para personas principiantes.
- `.htaccess`: protección de archivos privados y cabeceras.

## Instalación en Hostinger

1. Sube toda la carpeta a una ruta pública de tu dominio.
2. Comprueba que PHP tiene habilitados `curl`, `json` y `mbstring`.
3. Configura la clave de OpenRouter en el `.htaccess` privado de la raíz del hosting:

   ```apache
   SetEnv R "sk-or-v1-TU_CLAVE"
   ```

   Mantén `F` reservado para FLUX y `R` para OpenRouter.

4. Alternativa: copia `config.example.php` como `config.php`, introduce la clave y no subas ese archivo a Git.
5. Da permiso de escritura al servidor sobre `history_data/` sin hacer la carpeta pública.
6. Abre `proxy.php` en el navegador. Debe responder con `configured: true`.
7. Abre `index.html` y prueba generación, historial, recarga, edición y eliminación.

El historial se separa mediante una cookie anónima `HttpOnly`; cada navegador dispone de su propia biblioteca y no comparte resultados con visitantes distintos.

## Modelos configurados

- Automática: `openrouter/auto`.
- Equilibrada: `openai/gpt-5-mini`.
- Máxima calidad: `~openai/gpt-latest`.

Los modelos solo se seleccionan mediante un mapa cerrado en `proxy.php`; el navegador no puede enviar un slug arbitrario.

## Seguridad

- No pongas la clave en `app.js`, HTML ni repositorios.
- No publiques `config.php`.
- Mantén `.htaccess` activo para bloquear `skills/` e `history_data/`.
- Usa HTTPS en producción.

## Pruebas locales

Desde la carpeta del proyecto:

```bash
php -S 127.0.0.1:8080
```

Después abre `http://127.0.0.1:8080`.

Sin una clave configurada, la interfaz y el historial pueden probarse, pero la generación con IA mostrará el aviso correspondiente.
