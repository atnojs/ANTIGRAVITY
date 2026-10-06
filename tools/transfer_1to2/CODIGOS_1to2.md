# Códigos "1 to 2" — transferir de la imagen 1 a la imagen 2

Familia de códigos nuevos (no están en ninguna app). Aquí está el diseño completo, la
sintaxis comprobada y **el resultado de probarlos de verdad generando imágenes**.

- **28 imágenes generadas y pagadas** (24 de prueba + 4 de referencia) con la API
  (OpenRouter): `google/gemini-3-pro-image` y `google/gemini-3.1-flash-image`.
- **Coste real: $2,42** (fases registradas en `_run.log` y `_run_D.log`; las 4 llamadas
  fallidas de la fase C no se cobraron).
- Evidencias: `E:\ANTIGRAVITY\_pruebas_img\transfer_1to2\` (referencias, 24 salidas y
  hojas comparativas en `sheets/`).

---

## 1. Sintaxis: qué se ha comprobado

```text
/codigo 1 to 2
```

| Regla | Comprobación |
|---|---|
| **1 = PRIMERA imagen adjunta** (donante) | Sí. Probado invirtiendo el orden: adjuntando (estudio, calle) el resultado fue *la mujer de la calle con el fondo de estudio*. El número se ata al **orden de las imágenes**, no al contenido. |
| **2 = SEGUNDA imagen adjunta** (receptora) | Sí, por lo mismo. |
| El código solo ya funciona en los casos evidentes | `transferbackground` y `transferoutfit` salen bien escribiendo **únicamente** `Transferbackground 1 to 2`. |
| En el resto, el código solo **no basta** | El modelo arrastra la escena entera (fondo incluido) o no hace nada. Hay que declarar qué se transfiere **y qué no se toca**. |
| La mujer de la imagen 2 **no se sustituye** | Verificado en las 24 salidas: conserva su cara y su cuerpo; no adopta la identidad de la donante. |

**Conclusión práctica:** "1 to 2" sirve como *nombre* del código, pero el prompt debe
llevar delante la plantilla de la sección 2. Sin ella, solo `background` y `outfit` son
fiables.

---

## 2. Plantilla que funciona (copiar y sustituir)

```text
Image 1 = REFERENCE image (the donor). Image 2 = TARGET image (the one to edit).
Command: /CODIGO 1 to 2
What the command means: QUE_TRANSFIERE.
Everything else in Image 2 must stay identical: same woman, same face, same body, same
clothing, same pose, same framing. Change only the transferred attribute, integrate it
photorealistically and match perspective, scale and lighting.
All visible text and labels must be written in Spanish with no English words.
```

Y para los códigos "de imagen completa" (`colorgrade`, `transferlight`), que son los que
más se desmandan, esta variante con reglas duras:

```text
Image 1 = REFERENCE image (the donor). Image 2 = TARGET image (the one to edit).
Command: /CODIGO 1 to 2
What the command means: transfer QUE_TRANSFIERE
HARD RULES: keep the background, the setting, the pose, the clothing and every object of
Image 2 exactly as they are. Do not add or remove any element that is not part of the
transfer. Keep the same woman of Image 2: same face, same body, same identity.
Integrate the result photorealistically and match perspective, scale and lighting.
All visible text and labels must be written in Spanish with no English words.
```

---

## 3. Los 4 códigos que traías

| Código | Veredicto | Detalle medido |
|---|---|---|
| `/transferbackground 1 to 2` | ✅ **Funciona** (incluso solo el código) | Fondo de neón de Tokio sobre la mujer de la imagen 2; persona intacta. El prompt etiquetado da un resultado algo más limpio. |
| `/transferoutfit 1 to 2` | ✅ **Funciona** (incluso solo el código) | Le pone la trenca de tartán rojo y las botas; conserva su cara y su pose. |
| `/colorgrade 1 to 2` | ⚠️ **Fallaba; corregido** | En crudo y con el prompt normal **sustituía el fondo** por la calle de neón (transfería la escena, no el color). Con las reglas duras + "no cambies el fondo gris" ya no destruye la imagen, pero el grade sale **sutil**: no llega a coger el cian/magenta. Sirve para igualar tono, no para copiar un look fuerte. |
| `/matchpose 1 to 2` | ⚠️ **Depende del prompt** | Solo con el código **también copiaba la ropa** (transferencia por arrastre). Con el prompt etiquetado: pose exacta (peso en una pierna, manos en los bolsillos) **y ropa intacta**. ✅ |

---

## 4. Familia ampliada: 10 códigos nuevos probados

| Código | Transfiere | Veredicto |
|---|---|---|
| `/transfermakeup 1 to 2` | maquillaje (labios, ojos) | ✅ Funciona limpio: labios rojos, resto intacto. |
| `/transferaccessories 1 to 2` | accesorios (joyas, gafas) | ✅ Funciona limpio: gafas de sol + aros dorados. |
| `/transferscene 1 to 2` | escena/entorno completo | ✅ Funciona: la mete en la calle de Tokio. |
| `/transferweather 1 to 2` | clima/atmósfera | ✅ Funciona: lluvia y suelo mojado sobre el estudio. |
| `/transferpattern 1 to 2` | estampado del tejido | ✅ Funciona: el tartán pasa a la camiseta. |
| `/matchexpression 1 to 2` | expresión facial | ✅ Funciona, con una fuga leve de maquillaje (le añadió los labios rojos). |
| `/transferhair 1 to 2` | peinado | ⚠️ **Fallaba; corregido**: en v1 dejó el pelo suelto. Con "recógelo en una coleta alta tirante, mismo color de pelo y misma cara" ✅ hace la coleta. |
| `/transferlight 1 to 2` | iluminación | ⚠️ **Fallaba; corregido**: en v1 se llevaba el fondo entero. Con "no cambies el fondo" ✅ pone la luz cian/magenta de neón. |
| `/transferstyle 1 to 2` | estilo visual / look | ❌ **No recomendado**: pidió "solo el look" y aun así sustituyó el fondo por la escena de la imagen 1. "Estilo" es demasiado amplio: el modelo lo interpreta como rehacer la foto entera. Para looks, usa `/colorgrade`, `/transferlight` o acepta el cambio de escena. |
| `/matchcamera 1 to 2` | encuadre, lente, profundidad | ❌ **No recomendado**: no cambia el encuadre; cambia la luz y el fondo. El modelo no separa "cámara" del resto de la imagen. |

---

## 5. Correcciones listas para copiar (los que fallaban)

`/colorgrade 1 to 2`

```text
Image 1 = REFERENCE image (the donor). Image 2 = TARGET image (the one to edit).
Command: /colorgrade 1 to 2
What the command means: transfer the global colour grade of Image 1 (contrast, saturation,
colour balance and the cyan and magenta tint). Apply it to Image 2. Do NOT replace the grey
studio background of Image 2 and do NOT add any neon sign or street.
HARD RULES: keep the background, the setting, the pose, the clothing and every object of
Image 2 exactly as they are. Keep the same woman of Image 2: same face, same body, same
identity. All visible text and labels must be written in Spanish with no English words.
```

`/transferlight 1 to 2`

```text
Image 1 = REFERENCE image (the donor). Image 2 = TARGET image (the one to edit).
Command: /transferlight 1 to 2
What the command means: transfer the lighting on the woman of Image 2: neon cyan and magenta
rim light coming from both sides exactly like in Image 1. Do NOT change the background of
Image 2. Keep the same woman of Image 2: same face, same body, same identity.
All visible text and labels must be written in Spanish with no English words.
```

`/transferhair 1 to 2`

```text
Image 1 = REFERENCE image (the donor). Image 2 = TARGET image (the one to edit).
Command: /transferhair 1 to 2
What the command means: transfer her hairstyle: pull the hair of the woman in Image 2 back
into one tight high ponytail exactly like the woman in Image 1, keeping her own hair colour
and her own face. Do not change anything else. Keep the same woman of Image 2.
All visible text and labels must be written in Spanish with no English words.
```

---

## 6. Integración en la app TrickVault (hecha)

Los 12 códigos ya viven en `apps/trickvault`:

- **Carpeta nueva:** `Transferir 1 → 2` (`xl-transfer1to2`). Se añade sola a quien ya
  tuviera su lista guardada en el navegador (esquema de carpetas v4).
- **11 tarjetas nuevas** (ids propios `tr-cmd-001…011`, al final de `SEED_TRICKS` para
  **no desplazar** los ids posicionales `ig-dcek` / `xl-cmd` / `cap-cmd`):
  `/transferoutfit-1to2`, `/colorgrade-1to2`, `/matchpose-1to2`, `/transferlight-1to2`,
  `/transferhair-1to2`, `/transfermakeup-1to2`, `/transferaccessories-1to2`,
  `/transferscene-1to2`, `/transferweather-1to2`, `/matchexpression-1to2`,
  `/transferpattern-1to2`.
- **`/transferbackground`** no se duplica: se ha mejorado **en su sitio**
  (`xl-otromundo`) con el 1/2 explícito y las reglas duras.
- **No se han subido** `/transferstyle-1to2` ni `/matchcamera-1to2`: las pruebas dicen
  que no son aislables.
- **Ejemplos:** 11 `.jpg` 1024×1024 en `apps/trickvault/assets/transfer-1to2/`,
  generados con `openai-image-2-low` vía el proxy de Hostinger.

Verificación (Chrome headless, servido por HTTP local, con capturas en `evidencias/`):

| Comprobación | Resultado |
|---|---|
| Tarjetas 1→2 en el navegador | 11/11 |
| Carpeta `xl-transfer1to2` guardada | SÍ |
| Ejemplos vaciados a propósito y recargando | 11/11 se rellenan solos |
| Ficheros de ejemplo que cargan (`naturalWidth > 0`) | 11/11, ninguno falla |
| Parseo del JSX con `@babel/parser` | OK |
| Ids `ig-dcek`/`xl-cmd`/`cap-cmd` respecto a HEAD | idénticos (sin desplazamiento) |

Scripts: `_check_trickvault.js` (datos y enlaces), `_gen_ejemplos.py` (ejemplos) y
`_verifica_transfer.html` (banco de pruebas en Chrome, no versionado).

Nota: el solape del badge de carpeta sobre el título de la tarjeta es **anterior** a
este cambio (pasa igual en `/ascii`), no lo introduce esta carpeta.

---

## 7. Pendiente (lo que no se ha podido probar)

- **`gpt-image-2` (modelo por defecto del proyecto):** la clave `OPENAI_API_KEY` del
  `.env` local **da 401 (clave incorrecta/revocada)**, así que la fase C no se pudo
  ejecutar. Para repetirla hay dos vías: regenerar esa clave, o lanzar las pruebas por el
  proxy de Hostinger (`task: generateImage`, que sí acepta imágenes de referencia).
- **No se ha tocado ninguna app** (los códigos no viven en ninguna).

---

## 8. Cómo reproducirlo

```powershell
cd E:\ANTIGRAVITY\tools\transfer_1to2
& "E:\dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" _run.py all
& "E:\dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe" _sheet.py
```

- `_run.py refs|A|B|C|D|sheets|all` — genera referencias, fases y resultados.
- `_sheet.py` — monta las hojas comparativas en `_pruebas_img\transfer_1to2\sheets\`
  (y copia local en `tools\transfer_1to2\hojas\`).
- Las hojas **no se versionan**: el `.gitignore` del repo ignora `*.jpg`. Las salidas
  crudas y las hojas viven en `E:\ANTIGRAVITY\_pruebas_img\transfer_1to2\`.
