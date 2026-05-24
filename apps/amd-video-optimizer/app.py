import gradio as gr
import subprocess
import os
import re

def vaapi_available():
    """Verifica si VA-API está disponible en el sistema."""
    if not os.path.exists('/dev/dri/renderD128'):
        return False
    try:
        result = subprocess.run(
            ['vainfo'],
            capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False

def get_video_duration(file_path):
    cmd = [
        'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', file_path
    ]
    try:
        duration = subprocess.check_output(cmd).decode('utf-8').strip()
        return float(duration)
    except:
        return 0

def check_hw_status():
    """Devuelve el estado de la aceleración por hardware."""
    if vaapi_available():
        return True, "✅ AMD VA-API detectada. La GPU se usará para codificar."
    else:
        return False, (
            "⚠️ AMD VA-API NO disponible.\n\n"
            "Posibles causas:\n"
            "• No tienes una GPU AMD o los drivers no están instalados\n"
            "• WSL2 no tiene acceso a /dev/dri (necesitas pasar la GPU con GPU-PV)\n"
            "• El servicio vainfo no responde\n\n"
            "Puedes continuar con codificación CPU (más lenta) o cancelar."
        )

# Comprobar estado al arrancar
HW_AVAILABLE, HW_STATUS_MSG = check_hw_status()

def optimize_video(input_file, target_platform, custom_width, use_cpu_fallback, progress=gr.Progress()):
    if not input_file:
        return None, "No se proporcionó ningún vídeo."

    base_dir = os.path.dirname(os.path.abspath(input_file))

    platform_configs = {
        "WhatsApp": {"w": 1280, "h": -2, "suffix": "whatsapp", "max_bitrate": "2500k", "fps": 30},
        "Instagram Reels": {"w": 1080, "h": 1920, "suffix": "insta_reels", "max_bitrate": "3500k", "fps": 30},
        "TikTok": {"w": 1080, "h": 1920, "suffix": "tiktok", "max_bitrate": "3500k", "fps": 30},
        "YouTube Shorts": {"w": 1080, "h": 1920, "suffix": "yt_shorts", "max_bitrate": "4000k", "fps": 30},
        "Twitter/X": {"w": 1280, "h": -2, "suffix": "twitter", "max_bitrate": "2500k", "fps": 30},
        "Custom": {"w": int(custom_width), "h": -2, "suffix": "custom", "max_bitrate": "3500k", "fps": 30},
    }

    config = platform_configs.get(target_platform, platform_configs["WhatsApp"])
    output_file = os.path.join(base_dir, f"optimized_{config['suffix']}.mp4")
    if os.path.exists(output_file):
        os.remove(output_file)

    duration = get_video_duration(input_file)

    # Decidir modo de codificación
    use_gpu = vaapi_available()
    if not use_gpu and not use_cpu_fallback:
        return None, (
            "⛔ VA-API no disponible y no has activado el modo CPU.\n\n"
            "Activa la casilla 'Usar CPU como alternativa' para continuar, "
            "o resuelve el acceso a la GPU antes de reintentar."
        )

    if use_gpu:
        cmd = [
            'ffmpeg', '-y',
            '-hwaccel', 'vaapi',
            '-hwaccel_output_format', 'vaapi',
            '-i', input_file,
            '-vf', f'scale_vaapi=w={config["w"]}:h={config["h"]},format=nv12,hwdownload,format=nv12',
            '-c:v', 'h264_vaapi',
            '-qp', '24',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-r', str(config['fps']),
            '-movflags', '+faststart',
            output_file
        ]
        accel_label = "AMD VA-API (GPU)"
    else:
        cmd = [
            'ffmpeg', '-y',
            '-i', input_file,
            '-vf', f'scale={config["w"]}:{config["h"]}',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-maxrate', config['max_bitrate'],
            '-bufsize', config['max_bitrate'],
            '-c:a', 'aac',
            '-b:a', '128k',
            '-r', str(config['fps']),
            '-movflags', '+faststart',
            output_file
        ]
        accel_label = "CPU (libx264) — más lento"

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True
    )

    for line in process.stdout:
        match = re.search(r"time=(\d+):(\d+):(\d+\.\d+)", line)
        if match and duration > 0:
            hours, minutes, seconds = map(float, match.groups())
            current_time = hours * 3600 + minutes * 60 + seconds
            progress(current_time / duration, desc=f"Optimizando con {accel_label}...")

    process.wait()

    if process.returncode == 0:
        size_mb = os.path.getsize(output_file) / (1024 * 1024)
        info = (
            f"✅ Optimizado para {target_platform}\n"
            f"Codificación: {accel_label}\n"
            f"Resolución: {config['w']}x{config['h'] if config['h'] != -2 else 'auto'}\n"
            f"Tamaño: {size_mb:.1f} MB"
        )
        return output_file, info
    else:
        return None, "❌ Error en la conversión. Revisa que el vídeo de entrada sea válido."

# --- Interfaz ---

with gr.Blocks(title="AMD Video Optimizer", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🚀 Optimizador de Vídeo para Redes Sociales")
    gr.Markdown("Optimiza tus vídeos para WhatsApp, Instagram, TikTok y más.")

    # Estado de hardware visible al usuario
    hw_class = "success" if HW_AVAILABLE else "warning"
    hw_status_box = gr.Markdown(
        value=HW_STATUS_MSG,
        elem_classes=[hw_class]
    )

    with gr.Row():
        with gr.Column():
            video_input = gr.File(label="Sube tu vídeo", file_types=["video"])
            target_platform = gr.Dropdown(
                choices=["WhatsApp", "Instagram Reels", "TikTok", "YouTube Shorts", "Twitter/X", "Custom"],
                value="WhatsApp",
                label="Plataforma de destino"
            )
            custom_width = gr.Number(value=1280, label="Ancho personalizado (solo si seleccionas Custom)", visible=False)
            use_cpu_fallback = gr.Checkbox(
                label="Usar CPU como alternativa",
                value=False,
                visible=not HW_AVAILABLE,
                info="Activa esto solo si VA-API no está disponible y quieres procesar con CPU (más lento)."
            )
            optimize_btn = gr.Button("🎯 Optimizar", variant="primary")

        with gr.Column():
            video_output = gr.File(label="Vídeo Optimizado (Descargar)")
            info_output = gr.Textbox(label="Información", lines=5)

    target_platform.change(
        fn=lambda p: gr.update(visible=(p == "Custom")),
        inputs=target_platform,
        outputs=custom_width
    )

    optimize_btn.click(
        fn=optimize_video,
        inputs=[video_input, target_platform, custom_width, use_cpu_fallback],
        outputs=[video_output, info_output]
    )

if __name__ == "__main__":
    print(f"\n{'='*50}")
    print(f"  Estado VA-API: {'✅ Disponible' if HW_AVAILABLE else '❌ No disponible'}")
    print(f"{'='*50}\n")
    demo.launch(server_name="0.0.0.0", server_port=7860)