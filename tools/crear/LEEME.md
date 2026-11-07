# crear.ps1 — código, imágenes y vídeo con lo gratuito que ya hay en el equipo

Envoltorio de una sola orden para las tres cosas, usando **primero las vías sin coste** y
dejando las de pago solo como último recurso. No guarda claves: lee las del `.env` del
equipo en cada ejecución y no las imprime nunca.

## Qué usa

| Tarea | Vía | Coste | Estado verificado (2026-11-07) |
|---|---|---|---|
| Código | `cohere/north-mini-code:free` (OpenRouter) | 0 € | respondió en 0,9–1,8 s |
| Código | `gemini-3.1-flash-lite` (Google) | 0 € (nivel gratuito) | respondió en 0,6–8,3 s |
| Código | `deepseek-chat` (respaldo) | céntimos | solo si fallan los dos anteriores |
| Imagen | Pollinations (`image.pollinations.ai`) | 0 €, sin clave | **oportunista**: dio 200 (1–5 s, 13–25 KB) y a las pocas peticiones pasó a **402** |
| Vídeo | `flow.py` (Google Flow / Veo 3.1 Lite) | 10 puntos de los 50 diarios | comando preparado; no lanzado en esta sesión |

Orden de intentos en `code`: OpenRouter → Google → DeepSeek. Si uno falla, pasa al siguiente
y dice cuál respondió.

## Uso

```powershell
# 1. Ver qué está vivo ahora mismo (hace una petición real a cada vía)
.\crear.ps1 estado

# 2. Código: imprime la respuesta y la guarda en salidas\code-<fecha>.md
.\crear.ps1 code -Texto "funcion PowerShell que cuente palabras de un fichero"

# Desde un fichero con la petición (para encargos largos)
.\crear.ps1 code -Desde .\peticion.txt -Salida .\salida.md

# 3. Imagen: guarda JPEG en salidas\img-<fecha>.jpg
.\crear.ps1 img -Texto "manzana roja sobre fondo blanco, foto de estudio" -Ancho 1024 -Alto 1024

# Otro modelo de Pollinations
.\crear.ps1 img -Texto "gato minimalista" -Modelo turbo

# 4. Vídeo: comprueba requisitos e imprime el comando exacto (NO gasta nada)
.\crear.ps1 video -Texto "una ola rompiendo al amanecer, plano lento"

# 5. Vídeo de verdad: abre Chrome y gasta 10 puntos de Flow
.\crear.ps1 video -Texto "una ola rompiendo al amanecer, plano lento" -Generar
```

## Parámetros

| Parámetro | Para qué |
|---|---|
| `estado` \| `code` \| `img` \| `video` | acción (obligatoria, primera posición) |
| `-Texto` | la petición |
| `-Desde` | leer la petición de un fichero (alternativa a `-Texto`) |
| `-Salida` | ruta del fichero de salida |
| `-Ancho` / `-Alto` | tamaño de la imagen (64–2048, por defecto 1024×1024) |
| `-Modelo` | en `img`, modelo de Pollinations (por defecto `flux`); en `code`, fuerza el modelo de Google (`gemini-3.1-flash-lite` por defecto). Solo se usa si responde Google: OpenRouter va antes con su modelo `:free` |
| `-Generar` | lanza `flow.py` de verdad (solo `video`; en otras acciones se avisa y se ignora) |
| `-EnvFile` | `.env` alternativo al de por defecto |

## Códigos de salida

- `0` correcto.
- `1` fallo de la operación (ningún proveedor de texto respondió, imagen inválida, `flow.py` con error, parámetros mal usados).
- `2` requisito no disponible ahora mismo: no existe `flow.py`, **o** la cuota gratuita de imagen está agotada, **o** `estado` no encuentra ninguna vía operativa.

## Límites reales (no son fallos del script)

- **Imagen**: la vía gratis es **oportunista**, no fiable. Verificado el 2026-11-07: Pollinations
  devolvió imágenes correctas (1–5 s, JPEG de 13–25 KB) y, tras unas pocas peticiones anónimas,
  pasó a **402 «se requiere pago» en todos los tamaños y modelos** (256/512/1024 × sin modelo,
  flux, turbo). No es un fallo del script: es su cuota anónima, que no se anuncia ni se repone a
  una hora conocida. El script lo detecta, **no reintenta en vano** y sale con código 2.
  Además Pollinations puede añadir una **marca de agua** aunque se pida `nologo=true`, y su
  adherencia al prompt es baja (pedí «manzana roja sobre fondo blanco» y devolvió un cánido rojo
  bajo un manzano): sirve para bocetos, no para una entrega.
- **Imagen de calidad y fiable**: no se hace aquí a propósito.
  - `apps/unified-image-studio-hoola` con **IMAGE 2 · LOW** es la más barata (calidad baja, la que
    el proyecto usa por defecto) y acepta tu clave de OpenAI.
  - **Flow / Nano Banana** si el PC de Flow está encendido: gasta puntos, no clave de API.
  - Gemini y Qwen están en la misma app, con pago por uso.
- **Vídeo**: depende de que el PC de Flow tenga sesión de Chrome válida y puntos. 50 puntos al
  día = 5 vídeos de Veo 3.1 Lite. Si la cuota está a 0, `flow.py` falla por *timeout* al no
  existir el botón de enviar: es cuota, no un error del código.
- **Vídeo por API de Google**: no disponible en este nivel (0 modelos `veo` en la clave).
- **Local**: este equipo es un Celeron de 2 núcleos con Intel HD 610 y sin CUDA. Ollama para
  texto iría a pocos tokens por segundo e imagen/vídeo locales son inviables. Todo va a la nube.

## Seguridad

- Las claves se leen de `E:\hermes-data\.env` (fuera del repositorio) y nunca se escriben,
  imprimen ni se incluyen en la salida.
- Este script vive en `tools/`, que el `.htaccess` de Hostinger deniega: no se sirve por web.

## Verificación (2026-11-07)

Pasó una verificación independiente (agente distinto del autor) con **PASS 92,1/100** sobre la
rúbrica A1–A10 del gate `autocalidad-90`. Esa ronda reprodujo 8 pruebas: `estado`, `code` con
`-Texto` y con `-Desde`/`-Salida`, acentos en el fichero final, `img` por sus dos ramas (200 y
402), `video` sin lanzar Chrome, los casos de error y la comprobación de que ninguna clave
aparece en la salida (con un `.env` falso de centinelas).

Corregido después de esa ronda: `estado` ya devuelve 2 si ninguna vía funciona; la instrucción de
idioma ya no contamina el prompt de imagen; si el proveedor devuelve PNG se guarda como `.png`;
`-Generar` avisa si se usa fuera de `video`; los fallos van a *stderr*; comando de vídeo con
comillas simples para que aguante comillas dobles en el prompt; tildes en los mensajes.

**Sin probar de extremo a extremo**: `video -Generar`. Abre Chrome y gasta 10 puntos de la cuenta
de Flow, así que no se ejecutó sin permiso. El comando que imprime está validado contra el
`argparse` real de `flow.py` (`--prompt`, `--ratio`, `--model`, `--name`, `--out`).
