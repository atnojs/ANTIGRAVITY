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
            ['vainfo'], capture_output=True, text=True, timeout=5
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
    if vaapi_available():
        return True, "✅ **AMD VA-API detectada** — La GPU Radeon se usará para codificar."
    return False, (
        "⚠️ **AMD VA-API NO disponible**\n\n"
        "Posibles causas:\n"
        "• No tienes una GPU AMD o los drivers no están instalados\n"
        "• WSL2 no tiene acceso a `/dev/dri` (necesitas GPU-PV)\n"
        "• El servicio `vainfo` no responde\n\n"
        "👉 Activa **«Usar CPU como alternativa»** para procesar con CPU (más lento), "
        "o resuelve el acceso a la GPU antes de reintentar."
    )

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

    use_gpu = vaapi_available()
    if not use_gpu and not use_cpu_fallback:
        return None, (
            "⛔ **VA-API no disponible** y no has activado el modo CPU.\n\n"
            "Activa la casilla **«Usar CPU como alternativa»** para continuar, "
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
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True
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
            f"✅ **Optimizado para {target_platform}**\n\n"
            f"📡 Codificación: `{accel_label}`\n"
            f"📐 Resolución: {config['w']}x{config['h'] if config['h'] != -2 else 'auto'}\n"
            f"📁 Tamaño: **{size_mb:.1f} MB**"
        )
        return output_file, info
    return None, "❌ Error en la conversión. Revisa que el vídeo de entrada sea válido."

# --- CSS oscuro tipo dashboard ---

DARK_CSS = """
:root {
    --bg-primary: #0d0d0d;
    --bg-secondary: #1a1a1a;
    --bg-card: #1e1e1e;
    --bg-input: #2a2a2a;
    --text-primary: #f0f0f0;
    --text-secondary: #a0a0a0;
    --accent: #e85d26;
    --accent-hover: #ff7043;
    --border-color: #333333;
    --success: #4caf50;
    --warning: #ff9800;
    --error: #f44336;
}
.gradio-container {
    background: var(--bg-primary) !important;
    color: var(--text-primary) !important;
    max-width: 900px !important;
    margin: 0 auto !important;
    font-family: 'Inter', 'Segoe UI', sans-serif !important;
}
/* Header */
.dark-header {
    background: linear-gradient(135deg, #1a1a1a 0%, #2a1a0e 100%);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 32px 28px !important;
    margin-bottom: 24px !important;
    text-align: center;
}
.dark-header h1 {
    color: var(--text-primary) !important;
    font-size: 2rem !important;
    font-weight: 300 !important;
    letter-spacing: 0.05em;
    margin-bottom: 8px !important;
}
.dark-header p {
    color: var(--text-secondary) !important;
    font-size: 0.95rem !important;
    font-weight: 300 !important;
}
/* Cards / Panels */
.dark-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 14px !important;
    padding: 24px !important;
}
/* Status box */
.status-box {
    border-radius: 12px !important;
    padding: 18px 22px !important;
    margin-bottom: 20px !important;
    font-size: 0.9rem !important;
    line-height: 1.6 !important;
}
.status-ok {
    background: rgba(76, 175, 80, 0.08) !important;
    border: 1px solid rgba(76, 175, 80, 0.25) !important;
    color: #81c784 !important;
}
.status-warn {
    background: rgba(255, 152, 0, 0.08) !important;
    border: 1px solid rgba(255, 152, 0, 0.25) !important;
    color: #ffb74d !important;
}
/* Labels */
label, .gr-input-label, .gr-radio-label, span[data-testid="block-label"] {
    color: var(--text-secondary) !important;
    font-size: 0.85rem !important;
    font-weight: 500 !important;
    letter-spacing: 0.03em;
    text-transform: uppercase;
}
/* Inputs */
input, select, textarea, .gr-dropdown, .gr-file {
    background: var(--bg-input) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 10px !important;
    color: var(--text-primary) !important;
}
input:focus, select:focus, textarea:focus {
    border-color: var(--accent) !important;
    box-shadow: 0 0 0 2px rgba(232, 93, 38, 0.15) !important;
}
/* File upload area */
.gr-file-upload {
    background: var(--bg-input) !important;
    border: 2px dashed var(--border-color) !important;
    border-radius: 14px !important;
    min-height: 140px !important;
}
.gr-file-upload:hover {
    border-color: var(--accent) !important;
}
/* Buttons */
.primary-btn button {
    background: var(--accent) !important;
    color: #fff !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 14px 28px !important;
    font-size: 1rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.03em;
    transition: all 0.2s ease !important;
    width: 100% !important;
}
.primary-btn button:hover {
    background: var(--accent-hover) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 20px rgba(232, 93, 38, 0.3) !important;
}
/* Checkbox */
.gr-checkbox-label {
    color: var(--warning) !important;
    font-weight: 600 !important;
}
.gr-checkbox-label span {
    color: var(--text-secondary) !important;
    font-weight: 400 !important;
}
/* Info output */
.info-box textarea {
    background: var(--bg-secondary) !important;
    border: 1px solid var(--border-color) !important;
    color: var(--text-primary) !important;
    font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
    font-size: 0.88rem !important;
}
/* Footer accent line */
.accent-line {
    height: 2px;
    background: linear-gradient(90deg, var(--accent), transparent);
    border: none;
    margin: 28px 0 12px 0;
}
/* Row spacing */
.gr-row {
    gap: 20px !important;
}
/* Download file link */
.gr-download-link, a[href*="file="] {
    color: var(--accent) !important;
}
"""

# --- Interfaz ---

with gr.Blocks(title="AMD Video Optimizer") as demo:

    # Header
    gr.Markdown(
        "# 🚀 AMD Video Optimizer\nOptimiza tus vídeos para redes sociales con aceleración por hardware VA-API.",
        elem_classes=["dark-header"]
    )

    # Estado de hardware
    status_class = "status-ok" if HW_AVAILABLE else "status-warn"
    hw_status = gr.Markdown(HW_STATUS_MSG, elem_classes=["status-box", status_class])

    with gr.Row():
        # Panel izquierdo: controles
        with gr.Column(scale=1, elem_classes=["dark-card"]):
            video_input = gr.File(
                label="📹 Sube tu vídeo",
                file_types=["video"],
                elem_classes=["gr-file-upload"]
            )
            target_platform = gr.Dropdown(
                choices=["WhatsApp", "Instagram Reels", "TikTok", "YouTube Shorts", "Twitter/X", "Custom"],
                value="WhatsApp",
                label="🎯 Plataforma de destino",
            )
            custom_width = gr.Number(
                value=1280,
                label="Ancho personalizado (solo Custom)",
                visible=False
            )
            use_cpu_fallback = gr.Checkbox(
                label="⚠️ Usar CPU como alternativa",
                value=False,
                visible=not HW_AVAILABLE,
                info="Activa solo si VA-API no está disponible. La codificación será más lenta."
            )
            optimize_btn = gr.Button(
                "🎯 Optimizar Vídeo",
                variant="primary",
                elem_classes=["primary-btn"]
            )

        # Panel derecho: resultado
        with gr.Column(scale=1, elem_classes=["dark-card"]):
            video_output = gr.File(label="📥 Vídeo Optimizado", file_types=["video"])
            info_output = gr.Markdown(
                value="*Esperando vídeo...*",
                label="Información",
                elem_classes=["info-box"]
            )

    gr.HTML('<hr class="accent-line">')
    gr.Markdown(
        "<small style='color:#666;'>Desarrollado con FFmpeg + VA-API · Gradio · AMD GPU</small>"
    )

    # Lógica
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
    demo.launch(server_name="0.0.0.0", server_port=7860, css=DARK_CSS)