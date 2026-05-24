# Guía de Instalación: VA-API para AMD en WSL2 (Ubuntu)

Para que tu **AMD Radeon RX 6600** funcione correctamente con FFmpeg dentro de WSL2, sigue estos pasos exactos:

## 1. Requisitos en Windows 11
Asegúrate de que tu Windows 11 esté actualizado y que tengas instalados los drivers de AMD más recientes. WSL2 usa el driver de Windows a través de `/dev/dxg`.

## 2. Configurar Ubuntu en WSL2
Abre tu terminal de Ubuntu y ejecuta:

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar los drivers de MESA y VA-API
sudo apt install -y mesa-va-drivers libva-drm2 libva2 vainfo ffmpeg
```

## 3. Verificar acceso a la GPU
Ejecuta el siguiente comando para confirmar que WSL2 ve tu hardware:
```bash
ls -l /dev/dri
```
Deberías ver `renderD128`.

Luego verifica el soporte de codificación VA-API:
```bash
vainfo
```
Busca líneas que digan `VAEntrypointEncSlice`. Si ves `VA_PROFILE_H264_MAIN` o `VA_PROFILE_H264_HIGH` con ese entrypoint, estás listo.

## 4. Instalar Python y la App
```bash
sudo apt install -y python3-pip
pip3 install -r requirements.txt
```

## 5. Ejecutar
```bash
python3 app.py
```

## Notas sobre FFmpeg y VA-API
El script `app.py` utiliza:
- `-hwaccel vaapi`: Activa la aceleración.
- `-c:v h264_vaapi`: Usa el codificador de hardware AMD.
- `scale_vaapi`: Realiza el reescalado a 720p directamente en la GPU para que sea instantáneo.

> **Importante:** Si el comando `vainfo` falla o no muestra los entrypoints de codificación, es posible que necesites actualizar el Kernel de WSL o verificar que no haya conflictos con drivers de video antiguos.
