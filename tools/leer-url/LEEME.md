# leer-url

Lee una URL y devuelve su texto para que el agente la analice con datos.

```powershell
node \\Principal\e\ANTIGRAVITY\tools\leer-url\leer-url.mjs "<url>"
```

- **YouTube** → subtítulos (español manual, luego automático, luego inglés). Usa la API interna con cliente ANDROID y parsea el XML `format=3`: el `fmt=json3` que circula por los ejemplos ya no devuelve nada.
- **GitHub** → README y metadatos (estrellas, licencia, último push).
- **Cualquier web** → texto principal. Si la página trae `<main>` con sustancia se usa eso; si es un caparazón de JavaScript, el documento entero.

## Opciones

| Opción | Para qué |
|---|---|
| `--max N` | Tope de caracteres (40.000 por defecto; 60.000 en vídeo) |
| `--json` | Salida `{ok, url, tipo, fuente, chars, texto, extra}` |
| `--out RUTA` | Guarda el texto y devuelve solo ruta y recuento |
| `--no-cache` | Ignora la caché (7 días en `%LOCALAPPDATA%\leer-url\cache`) |

Códigos de salida: `0` bien · `2` sin texto · `3` red/HTTP · `4` URL no válida o privada.

## Ejemplos

```powershell
node ...\leer-url.mjs "https://www.youtube.com/watch?v=_fgcYcSA7oo"
node ...\leer-url.mjs "https://github.com/nightly-labs/openbot" --max 4000 --json
node ...\leer-url.mjs "https://coarena.ai/docs" --out "$env:TEMP\coarena.txt"
```

## Límites conocidos

- Vídeos sin subtítulos: no hay texto. La herramienta lo dice con código 2.
- Desde una IP de datacenter, YouTube responde `LOGIN_REQUIRED` («no eres un bot»). Desde una IP doméstica funciona. Por eso la herramienta vive en el PC del agente y no en el hosting.
- Webs que pintan todo con JavaScript, muros de pago y PDF: no se leen.
- No sigue redirecciones a red privada ni acepta `localhost`, `127.0.0.1`, `10.*`, `192.168.*` ni `169.254.*`.
