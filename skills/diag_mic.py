# -*- coding: utf-8 -*-
"""Diagnóstico de captura de micrófono: graba N segundos, mide RMS y guarda WAV."""
import sys, wave, time, numpy as np
import sounddevice as sd

SAMPLE_RATE = 16000
DURATION = float(sys.argv[1]) if len(sys.argv) > 1 else 6.0
OUT = sys.argv[2] if len(sys.argv) > 2 else r"E:\hermes-data\cache\audio\mic_test.wav"

dev = sd.default.device[0]
info = sd.query_devices(dev)
print(f"Dispositivo de entrada: [{dev}] {info['name']} (ch={info['max_input_channels']})")

# Grabación
frames = []
def cb(indata, frames_count, t, status):
    frames.append(indata.copy())

print(f"Grabando {DURATION}s... HABLA AHORA")
with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="int16", callback=cb, blocksize=int(SAMPLE_RATE*0.03)):
    time.sleep(DURATION)

audio = np.concatenate(frames).flatten().astype(np.int16)
rms = np.sqrt(np.mean(audio.astype(np.float32) ** 2))
peak = np.max(np.abs(audio.astype(np.float32)))
db = 20 * np.log10(max(rms, 1) / 32768.0) if rms > 1 else -90

# guardar
with wave.open(OUT, "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(SAMPLE_RATE)
    wf.writeframes(audio.tobytes())

print(f"\nResultado:")
print(f"  RMS: {rms:.0f} / 32768  (dbFS: {db:.1f})")
print(f"  Pico: {peak}")
print(f"  Guardado: {OUT} ({len(audio)/SAMPLE_RATE:.1f}s)")
if rms < 100:
    print("  ⚠️  NIVEL MUY BAJO — el micrófono capta casi nada (problema de ganancia/dispositivo)")
elif rms < 800:
    print("  ⚠️  NIVEL BAJO — se oye pero débil; subir volumen del micrófono en Windows")
elif rms < 3000:
    print("  ✅  NIVEL CORRECTO — señal saludable para whisper")
else:
    print("  ✅  NIVEL ALTO — posible saturación si pico > 30000")
