# PASAFOTOS · copia de carpetas de fotos al servidor de ANTONIO

App local de Windows que, al abrirla, te pide **qué carpetas quieres copiar** (puedes elegir
muchas a la vez) y **dónde quieres pegarlas** en el servidor. Copia por la red al servidor
`ANTONIO` (`192.168.18.10`) y deja las fotos en la biblioteca que ya usa Jellyfin:
`D:\Media\Fotos` (también accesible como `Z:\Media\Fotos`).

> **El original nunca se toca.** La app solo copia: no mueve, no renombra y no borra nada del
> origen. Si un fichero ya está en el destino y es idéntico, se omite; si es distinto, **no se
> sobrescribe** salvo que marques la casilla.

---

## Cómo se usa

1. Abre **PASAFOTOS** desde el acceso directo del Escritorio (o `PasaFotos.exe`).
2. En **1 · Carpetas que quieres copiar**:
   - Pulsa **+ Añadir carpetas** y elige una o varias con `Ctrl+clic`.
   - También puedes **arrastrar carpetas** desde el Explorador a la ventana.
   - Se puede quitar una carpeta de la lista (selecciónala y pulsa **Quitar**) o **Vaciar**.
3. En **2 · Dónde las quiero pegar**:
   - Viene puesta la carpeta del servidor: `\\192.168.18.10\D\Media\Fotos`.
   - Con **Cambiar…** eliges otra (por ejemplo una subcarpeta por año o por evento).
   - Con **Servidor · Fotos** vuelves a la carpeta de fotos del servidor.
   - También puedes escribir o pegar una ruta a mano.
4. Pulsa **COPIAR AL SERVIDOR**. Verás progreso, velocidad, tiempo restante y un registro.
5. Al terminar, el resumen indica ficheros copiados, omitidos, avisos y errores. Desde ahí
   puedes **Abrir destino** o **Guardar informe**.

Cada carpeta se copia **con su nombre** dentro del destino. Si dos carpetas del lote se llaman
igual, la segunda entra como `Nombre (2)`.

### Opciones

- **Comprobar cada fichero al terminar** (activada): después de copiar compara tamaño y fecha de
  cada fichero. Si algo no coincide, aparece como error.
- **Sobrescribir si el fichero ya existe y es distinto** (desactivada): protección para no pisar
  nada del servidor. Actívala solo si quieres reemplazar versiones.

---

## Qué hace exactamente

- Copia por SMB usando la sesión de Windows (las unidades `X:`, `Y:`, `Z:` ya mapeadas o la ruta
  `\\192.168.18.10\...`). No guarda contraseñas.
- Crea en el destino la carpeta de cada origen y todas sus subcarpetas, incluidas las vacías.
- Conserva la fecha de modificación de los ficheros.
- Omite los ficheros idénticos (mismo tamaño y fecha): se puede relanzar sin duplicar trabajo.
- Por defecto, un fichero distinto que ya exista en el destino **no se toca**: se cuenta como
  aviso y se ve en el resumen.
- Comprueba el destino antes de empezar (que exista, que se pueda escribir y el espacio libre).
- Escribe un informe `.json` y un `.log` de cada copia, y guarda un historial de las últimas
  operaciones. Todo en `%APPDATA%\PasaFotos\` (esta app no envía nada a Internet).
  Si esa carpeta no se pudiera escribir, usa `data\` junto al ejecutable.

### Qué NO hace

- No borra ni mueve los originales (a propósito).
- No sincroniza en segundo plano: la copia se lanza a mano.
- No indexa en Immich: Jellyfin ve la carpeta `Fotos` directamente; para Immich habría que
  importarlas desde su propia app.
- No soporta móviles por MTP (conecta el móvil como unidad o copia antes al PC).
- No sigue accesos directos simbólicos (los salta para no duplicar ni entrar en bucles).

---

## Modo automático (sin ventana)

Útil para lotes o para probar. Desde una consola:

```powershell
PasaFotos.exe --cli --origen "C:\fotos\viaje|D:\fotos\playa" --destino "\\192.168.18.10\D\Media\Fotos\2026"
```

Opciones: `--sobrescribir`, `--sin-verificar`, `--informe "C:\ruta\informe.json"`.

Códigos de salida: `0` bien · `1` con avisos o errores · `2` argumentos · `3` destino
inaccesible · `4` cancelado · `5` origen inválido.

Diagnóstico del equipo (usuario, rutas y permisos de escritura):

```powershell
PasaFotos.exe --diagnostico --destino "\\192.168.18.10\D\Media\Fotos"
```

---

## Comprobar una copia (hashes)

`verificar-copia.ps1` compara dos árboles por SHA-256 (o solo tamaño+fecha con `-Rapido`) y
soporta nombres de más de 260 caracteres y rutas UNC:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File verificar-copia.ps1 `
  -Origen "C:\fotos\viaje" -Destino "\\192.168.18.10\D\Media\Fotos\viaje" -Json "C:\temp\verificacion.json"
```

Sale `0` si es idéntico y `1` si hay diferencias.

---

## Requisitos y notas de red

- Windows 10/11 x64 con .NET Framework 4.8 (viene de serie).
- El servidor `ANTONIO` encendido y la carpeta compartida accesible.
- En ANTONIO, `C`, `D`, `E` y `F` pueden pedir usuario y contraseña. La app usa la sesión de
  Windows: si el Explorador abre `\\192.168.18.10\D` sin pedir nada, la app también.
- Rutas largas (>260 caracteres) soportadas.
- Si el destino aparece como **SIN CONEXIÓN**: revisa que el PC esté encendido, que el perfil de
  red sea Privada y que la carpeta exista. **DESTINO NO EXISTE** solo indica que la ruta no está
  creada todavía (la app ofrece crearla).

---

## Archivos y recompilación

| Fichero | Qué es |
|---|---|
| `PasaFotos.exe` | La app compilada |
| `PasaFotos.exe.config` | Habilita rutas largas en .NET Framework |
| `electrolize.ttf` | Tipografía del proyecto (se incrusta y se copia al lado) |
| `ui.xaml` | Interfaz (se incrusta en el .exe) |
| `PasaFotos.Core.cs` | Motor de copia, informes, configuración y diálogos |
| `PasaFotos.Ui.cs` | Ventana, eventos y modo CLI |
| `build.ps1` | Compila el .exe con el compilador de .NET Framework 4.8 (sin Visual Studio) |
| `crear-acceso-directo.ps1` | Vuelve a crear el acceso directo del Escritorio |
| `verificar-copia.ps1` | Comprobación por hashes de una copia |

Recompilar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File build.ps1
```

Reponer el acceso directo:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File crear-acceso-directo.ps1
```
