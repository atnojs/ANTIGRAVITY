# Movi Transfer

Pasa archivos **del móvil al PC y del PC al móvil** por la red Wi-Fi de casa, sin cables,
sin cuentas y sin nube. El PC hace de servidor; el móvil sólo abre una dirección en el
navegador.

```
móvil  ──Wi-Fi──►  PC (Node en :8099)  ──►  apps/movi-transfer/_inbox/
```

## Arranque rápido

1. Doble clic en **`permitir-firewall.cmd`** (sólo la primera vez). Pide permisos de
   administrador y abre el puerto 8099 en redes privadas.
2. Doble clic en **`iniciar.cmd`**. Se abre el navegador del PC con la página.
3. En el móvil: escanea el **QR** que aparece, o escribe la dirección
   `http://IP-DEL-PC:8099` en el navegador. Tienen que estar en la misma Wi-Fi.
4. Arrastra o elige archivos en el móvil → se guardan en la bandeja del PC.
   Desde el PC, cada archivo de la lista se descarga al móvil con su botón.

Para parar el servidor, cierra la ventana de `iniciar.cmd`.

### Arrancar solo con Windows (opcional)

- **`instalar-en-inicio.vbs`** crea un acceso en la carpeta Inicio que arranca el
  servidor oculto al iniciar sesión.
- **`desinstalar-de-inicio.vbs`** lo quita.

## Dónde van los archivos

A la carpeta indicada en `config.json` (`inbox`), por defecto `_inbox/` dentro de esta
app. Está ignorada por git: lo que llega del móvil **no se publica** en el repositorio.
Los nombres repetidos se guardan como `foto (2).jpg`; nunca se sobrescribe nada.

## Configuración (`config.json`)

| Clave | Por defecto | Qué hace |
|---|---|---|
| `port` | `8099` | Puerto HTTP del servidor. |
| `host` | `0.0.0.0` | Interfaz de escucha (todas las de la red local). |
| `inbox` | `_inbox` | Carpeta de destino, relativa a la app o ruta absoluta. |
| `maxFileBytes` | `26843545600` | Tamaño máximo por archivo (25 GB). |

También se puede forzar por variables de entorno: `MOVI_PORT`, `MOVI_HOST`,
`MOVI_INBOX`, `MOVI_MAX_BYTES`.

## Qué hace la página

- **Subida** de varios archivos a la vez, con barra de progreso, velocidad y cancelación.
  Acepta arrastrar y soltar y el selector del móvil.
- **Lista** de la bandeja con nombre, tamaño, fecha relativa y tipo; buscador y refresco.
- **Descarga** individual (con soporte `Range` para vídeos) y **vista previa** de
  imágenes, vídeo y audio.
- **Borrado** con confirmación.
- **QR** con la dirección de la red local y botón de copiar.

## Límites y seguridad

- Es **HTTP sin cifrar**, pensado para la red de casa. No lo publiques en internet ni lo
  abras en redes públicas: cualquiera en esa red podría subir o descargar archivos.
- El firewall abre el puerto **solo en el perfil de red privada**.
- La carpeta lleva un `.htaccess` que la deniega por web en Hostinger; el servidor Node
  no se ejecuta allí, así que la copia desplegada es sólo respaldo de código.
- En subidas muy largas desde el móvil, mantén la pantalla encendida: si el navegador se
  suspende, la subida se corta (no hay reanudación por trozos en esta versión).
- Límite por archivo de 25 GB; el resto depende del espacio del disco del PC.

## Estructura

| Archivo | Papel |
|---|---|
| `server.mjs` | Servidor HTTP sin dependencias: estáticos, subida, descarga, borrado. |
| `public/` | Página (`index.html`, `app.css`, `app.js`), QR vendorizado, fuente e iconos. |
| `config.json` | Puerto, bandeja y límite de tamaño. |
| `iniciar.cmd` / `iniciar-oculto.vbs` | Arranque manual / oculto al iniciar sesión. |
| `permitir-firewall.cmd` | Regla de entrada para el puerto 8099 (UAC). |
| `_inbox/` | Archivos recibidos (ignorada por git). |

## Nota sobre el estándar del repo

El resto de apps del repo son PHP + Hostinger (proxy, historial). Esta **no**: es una
herramienta local que necesita un servidor Node en el PC, así que no lleva `proxy.php`,
`history.php` ni `history_store/`. Se mantienen las reglas que sí aplican: estilo
Hoola/Relatos (cian `#00D0D0`, verde `#26C626`, Electrolize, vidrio), responsive,
accesibilidad, evidencia con capturas y commit+push. El detalle está en
`tools/memoria/decisiones.md`.

## Verificación

- API: `node tools/movi-transfer-test/verify.mjs` (subida, SHA-256, descarga, borrado,
  rutas maliciosas y concurrencia).
- UI real: `node tools/movi-transfer-test/ui-test.mjs` (Chrome headless, escritorio y
  móvil, capturas en `tools/evidencias/`).
