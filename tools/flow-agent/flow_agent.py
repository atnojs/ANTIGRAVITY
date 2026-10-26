#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""flow_agent.py — agente del PC para el motor Google Flow del Unified Image Studio.

El servidor es la fuente de verdad: la web (móvil, otro ordenador) encola los
trabajos y este agente los reclama por HTTPS con su propia credencial, los
genera con Google Flow (flow.py, incluido aquí) y sube el resultado.

Uso:
    python flow_agent.py --once            # una pasada (Programador de tareas)
    python flow_agent.py --minutes 25      # servicio durante N minutos
    python flow_agent.py --status          # comprueba credencial, cola y sesión de Flow

Configuración (agente.json, en esta misma carpeta; fuera de git):
    {
      "base": "https://atnojs.es/apps/unified-image-studio/api.php",
      "token": "...",                        # credencial del agente
      "flow_profile": "E:/herramientas/google-flow/session/flowbot-profile",
      "out_dir": ""                          # vacío = outputs/ del agente
    }

Reglas de seguridad:
  - El token nunca se imprime ni se escribe en logs.
  - Ante un fallo de red al informar del resultado se reintenta: un fallo de
    conexión NO significa que la generación fallara.
  - Antes de generar, comprueba que ningún Chrome use el perfil de Flow: Playwright
    no puede abrir un perfil que ya está en uso.
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(AGENT_DIR, 'agente.json')
LOCKFILE = os.path.join(AGENT_DIR, 'flow_agent.lock')
FLOW_PY = os.path.join(AGENT_DIR, 'flow.py')
LOCK_STALE_SEC = 3 * 60 * 60
MAX_SIDE = 1400
JPEG_QUALITY = 88
MAX_REFS = 2
MAX_VIDEO_BYTES = 32 * 1024 * 1024
VIDEO_EXT = ('.mp4', '.webm', '.mov')
IMAGE_EXT = ('.jpg', '.jpeg', '.png', '.webp')
MODEL_ALIASES = {'Omni Flash': 'Omni 1.1 Flash'}
REF_MIME_EXT = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
}


def load_config() -> dict:
    if not os.path.isfile(CONFIG_FILE):
        raise SystemExit(
            'Falta %s. Crea agente.json con {"base": "<url del api.php>", "token": "<credencial>"}'
            % CONFIG_FILE
        )
    with open(CONFIG_FILE, 'r', encoding='utf-8-sig') as fh:
        cfg = json.load(fh)
    if not isinstance(cfg, dict) or not cfg.get('base') or not cfg.get('token'):
        raise SystemExit('agente.json necesita "base" y "token".')
    return cfg


def api(cfg: dict, action: str, payload: dict | None = None, timeout: int = 60) -> dict:
    url = '%s?action=%s' % (cfg['base'].strip(), action)
    data = json.dumps(payload or {}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UIS-Agent': cfg['token'],
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def api_retry(cfg: dict, action: str, payload: dict | None = None, attempts: int = 4, timeout: int = 90) -> dict:
    last = None
    for i in range(attempts):
        try:
            return api(cfg, action, payload, timeout=timeout)
        except urllib.error.HTTPError as exc:
            detail = ''
            try:
                detail = exc.read().decode('utf-8', 'replace')[:300]
            except Exception:
                pass
            if exc.code in (401, 403):
                raise RuntimeError('credencial rechazada por el servidor (HTTP %d)' % exc.code) from exc
            last = 'HTTP %d %s' % (exc.code, detail)
            if exc.code < 500:
                raise RuntimeError('el servidor rechazó la operación: %s' % last) from exc
        except (urllib.error.URLError, OSError, ValueError) as exc:
            last = '%s: %s' % (type(exc).__name__, exc)
        if i < attempts - 1:
            time.sleep(2 ** i)
    raise RuntimeError(str(last))


def api_upload(cfg: dict, action: str, job_id: str, field: str, raw: bytes, attempts: int = 4) -> dict:
    """Sube el archivo como multipart: un vídeo supera los límites de una
    petición JSON, mientras que el formulario solo está acotado por
    upload_max_filesize del servidor."""
    boundary = '----uisagent' + os.urandom(16).hex()
    name = 'file_upload' if field == 'video' else 'file_image'
    head = (
        '--%s\r\nContent-Disposition: form-data; name="id"\r\n\r\n%s\r\n'
        '--%s\r\nContent-Disposition: form-data; name="%s"; filename="%s.bin"\r\n'
        'Content-Type: application/octet-stream\r\n\r\n'
        % (boundary, job_id, boundary, name, field)
    ).encode('utf-8')
    tail = ('\r\n--%s--\r\n' % boundary).encode('utf-8')
    body = head + raw + tail
    url = '%s?action=%s' % (cfg['base'].strip(), action)
    headers = {
        'Content-Type': 'multipart/form-data; boundary=%s' % boundary,
        'Accept': 'application/json',
        'X-UIS-Agent': cfg['token'],
    }
    last = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, data=body, method='POST', headers=headers)
            with urllib.request.urlopen(req, timeout=600) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as exc:
            detail = ''
            try:
                detail = exc.read().decode('utf-8', 'replace')[:300]
            except Exception:
                pass
            if exc.code in (401, 403):
                raise RuntimeError('credencial rechazada al subir (HTTP %d)' % exc.code) from exc
            last = 'HTTP %d %s' % (exc.code, detail)
            if exc.code < 500:
                raise RuntimeError('el servidor rechazó el archivo: %s' % last) from exc
        except (urllib.error.URLError, OSError, ValueError) as exc:
            last = '%s: %s' % (type(exc).__name__, exc)
        if i < attempts - 1:
            time.sleep(2 ** i)
    raise RuntimeError(str(last))


def _pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name != 'nt':
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False
    import ctypes

    process_query_limited_information = 0x1000
    still_active = 259
    kernel32 = ctypes.windll.kernel32
    handle = kernel32.OpenProcess(process_query_limited_information, False, pid)
    if not handle:
        return False
    try:
        code = ctypes.c_ulong()
        if not kernel32.GetExitCodeProcess(handle, ctypes.byref(code)):
            return False
        return code.value == still_active
    finally:
        kernel32.CloseHandle(handle)


def take_lock() -> bool:
    try:
        if os.path.isfile(LOCKFILE):
            holder = 0
            try:
                holder = int((open(LOCKFILE, encoding='utf-8').read() or '0').strip() or 0)
            except (OSError, ValueError):
                holder = 0
            stale = time.time() - os.path.getmtime(LOCKFILE) > LOCK_STALE_SEC
            if stale or not _pid_alive(holder):
                os.remove(LOCKFILE)
            else:
                return False
        fd = os.open(LOCKFILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        return True
    except FileExistsError:
        return False
    except OSError:
        return False


def drop_lock() -> None:
    try:
        os.remove(LOCKFILE)
    except OSError:
        pass


def flow_dir() -> str:
    return os.path.dirname(FLOW_PY)


def out_dir(cfg: dict) -> str:
    configured = str(cfg.get('out_dir') or '').strip()
    path = configured if configured else os.path.join(AGENT_DIR, 'outputs')
    os.makedirs(path, exist_ok=True)
    return path


def child_env(cfg: dict) -> dict:
    env = os.environ.copy()
    env['FLOW_HEADLESS'] = 'true'
    env['PYTHONIOENCODING'] = 'utf-8'
    env['PYTHONUTF8'] = '1'
    # La sesión de Flow se reutiliza del sitio donde ya esté iniciada.
    if cfg.get('flow_profile'):
        env['FLOW_CHROME_PROFILE'] = str(cfg['flow_profile'])
    return env


def chrome_using_profile(profile: str) -> int:
    """Cuenta los Chrome que tienen abierto el perfil de Flow.

    Playwright no puede abrir un perfil persistente en uso: si hay alguno, la
    generación muere en dos segundos con un error de asyncio poco claro.
    """
    if os.name != 'nt' or not profile:
        return 0
    try:
        script = (
            "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | "
            "Where-Object { $_.CommandLine -like '*%s*' } | Measure-Object | "
            "Select-Object -ExpandProperty Count" % profile.replace("'", "''")
        )
        proc = subprocess.run(
            ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', script],
            capture_output=True, text=True, timeout=60, encoding='utf-8', errors='replace',
        )
        return int((proc.stdout or '0').strip() or 0)
    except Exception:
        return 0


def summarize_error(out: str) -> str:
    lines = [line.strip() for line in out.splitlines() if line.strip()]
    for line in reversed(lines):
        if re.match(r'^[A-Za-z_.]*(Error|Exception):', line):
            return line[:280]
    for line in reversed(lines):
        if 'playwright' in line.lower() or 'error' in line.lower():
            return line[:280]
    return (lines[-1] if lines else 'flow.py falló sin salida')[:280]


def flow_model(model: str) -> str:
    return MODEL_ALIASES.get(model, model)


def check_model_used(out: str, model: str) -> None:
    if model and 'no está en el menú' in out:
        raise RuntimeError("Flow no reconoce el modelo '%s'; no se usa otro" % model)


def drop_output(folder: str, name: str, exts: tuple[str, ...]) -> None:
    for ext in exts:
        path = os.path.join(folder, name + ext)
        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass


def materialize_refs(cfg: dict, job: dict) -> list[str]:
    folder = out_dir(cfg)
    paths: list[str] = []
    for index, ref in enumerate((job.get('refs') or [])[:MAX_REFS], 1):
        if not isinstance(ref, dict):
            continue
        data = ref.get('data') or ''
        ext = REF_MIME_EXT.get(str(ref.get('mime') or '').lower()) or 'jpg'
        if not isinstance(data, str) or not data:
            continue
        try:
            raw = base64.b64decode(data)
        except (ValueError, TypeError):
            continue
        if not raw:
            continue
        if ext not in ('png', 'jpg', 'jpeg', 'webp', 'gif'):
            ext = 'jpg'
        path = os.path.join(folder, '%s_ref%d.%s' % (job['id'], index, ext))
        with open(path, 'wb') as fh:
            fh.write(raw)
        paths.append(path)
    return paths


def generate(cfg: dict, job: dict, refs: list[str]) -> str:
    jid = job['id']
    folder = out_dir(cfg)
    if (job.get('type') or 'image') == 'video':
        extra = ['video',
                 '--prompt', job['prompt'],
                 '--ratio', job.get('ratio', '16:9'),
                 '--model', flow_model(job.get('model', 'Veo 3.1 - Lite')),
                 '--count', '1',
                 '--name', jid,
                 '--out', folder]
        frames = [ref for ref in refs if ref][:2]
        if frames:
            extra += ['--start', frames[0]]
        if len(frames) > 1:
            extra += ['--end', frames[1]]
        exts = VIDEO_EXT
    else:
        extra = ['image',
                 '--prompt', job['prompt'],
                 '--ratio', job.get('ratio', '1:1'),
                 '--model', flow_model(job.get('model', 'Nano Banana 2')),
                 '--count', '1',
                 '--name', jid,
                 '--out', folder]
        for ref in refs[:MAX_REFS]:
            extra += ['--image', ref]
        exts = IMAGE_EXT

    proc = subprocess.run(
        [sys.executable, FLOW_PY] + extra,
        cwd=flow_dir(),
        env=child_env(cfg),
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
    )
    out = (proc.stdout or '') + (proc.stderr or '')
    if proc.returncode != 0:
        raise RuntimeError(summarize_error(out) or ('flow.py terminó con código %d' % proc.returncode))
    try:
        check_model_used(out, job.get('model', ''))
    except RuntimeError:
        drop_output(folder, jid, exts)
        raise
    for ext in exts:
        candidate = os.path.join(folder, jid + ext)
        if os.path.isfile(candidate):
            return candidate
    raise RuntimeError('Flow no dejó ningún archivo para el trabajo %s' % jid)


def compress_image(path: str) -> bytes:
    from PIL import Image

    with Image.open(path) as im:
        im = im.convert('RGB')
        w, h = im.size
        if max(w, h) > MAX_SIDE:
            scale = MAX_SIDE / float(max(w, h))
            im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format='JPEG', quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()


def work_once(cfg: dict) -> bool:
    try:
        payload = api_retry(cfg, 'agent.claim', {}, attempts=2, timeout=45)
    except RuntimeError as exc:
        print('cola no disponible: %s' % exc)
        return False

    job = payload.get('job')
    if not job:
        return False

    jid = job['id']
    is_video = (job.get('type') or 'image') == 'video'
    refs: list[str] = []
    try:
        open_chrome = chrome_using_profile(str(cfg.get('flow_profile') or ''))
        if open_chrome > 0:
            raise RuntimeError(
                'hay %d Chrome con el perfil de Flow abierto: ciérralos antes de generar' % open_chrome
            )
        refs = materialize_refs(cfg, job)
        path = generate(cfg, job, refs)
        if is_video:
            size = os.path.getsize(path)
            if size > MAX_VIDEO_BYTES:
                raise RuntimeError('el vídeo pesa %.1f MB y el tope es 32 MB' % (size / 1048576.0))
            with open(path, 'rb') as fh:
                raw = fh.read()
            api_upload(cfg, 'agent.complete', jid, 'video', raw)
            print('%s OK vídeo %.1f MB refs=%d' % (jid, size / 1048576.0, len(refs)))
        else:
            raw = compress_image(path)
            api_upload(cfg, 'agent.complete', jid, 'image', raw)
            print('%s OK imagen %d KB refs=%d' % (jid, len(raw) // 1024, len(refs)))
    except Exception as exc:  # noqa: BLE001 - el fallo se informa al servidor
        motivo = ('%s: %s' % (type(exc).__name__, exc))[:300]
        try:
            api_retry(cfg, 'agent.fail', {'id': jid, 'error': motivo}, attempts=4)
        except Exception as report_exc:  # pylint: disable=broad-except
            # Si no se puede informar, el trabajo se quedará «pendiente de
            # comprobación» al caducar la ventana: nunca se reenvía solo.
            print('%s no se pudo informar del fallo (%s)' % (jid, type(report_exc).__name__))
        print('%s FALLÓ %s' % (jid, motivo))
    finally:
        for ref in refs:
            try:
                os.remove(ref)
            except OSError:
                pass
    return True


def show_status(cfg: dict) -> int:
    ok = True
    try:
        seen = api_retry(cfg, 'agent.heartbeat', {'note': 'status'}, attempts=2, timeout=20)
        print('credencial: OK')
        print('cola: %s trabajos pendientes' % seen.get('pending', '?'))
    except Exception as exc:  # noqa: BLE001
        print('credencial o servidor: FALLO (%s: %s)' % (type(exc).__name__, exc))
        ok = False
    profile = str(cfg.get('flow_profile') or '')
    if profile:
        abiertos = chrome_using_profile(profile)
        print('perfil de Flow: %s (%s Chrome usándolo)' % ('libre' if abiertos == 0 else 'en uso', abiertos))
        if abiertos > 0:
            ok = False
    try:
        proc = subprocess.run([sys.executable, FLOW_PY, 'status'], cwd=flow_dir(),
                              env=child_env(cfg), capture_output=True, text=True,
                              encoding='utf-8', errors='replace', timeout=180)
        print('sesión de Flow: %s' % ((proc.stdout or proc.stderr or '').strip()[:400] or 'sin salida'))
    except Exception as exc:  # noqa: BLE001
        print('sesión de Flow: FALLO (%s)' % type(exc).__name__)
        ok = False
    return 0 if ok else 2


def main() -> int:
    try:
        import playwright  # noqa: F401
    except Exception as exc:  # pragma: no cover
        print('sin Playwright (%s): no puedo generar; no reclamo trabajos' % type(exc).__name__)
        return 3

    parser = argparse.ArgumentParser(description='Agente de Google Flow para Unified Image Studio')
    parser.add_argument('--minutes', type=float, default=25.0)
    parser.add_argument('--once', action='store_true')
    parser.add_argument('--status', action='store_true')
    args = parser.parse_args()

    cfg = load_config()
    if args.status:
        return show_status(cfg)
    if not os.path.isfile(FLOW_PY):
        print('falta flow.py junto al agente (%s)' % FLOW_PY)
        return 4
    if not take_lock():
        print('otro agente en marcha')
        return 0
    deadline = time.time() + (args.minutes * 60)
    try:
        if args.once:
            work_once(cfg)
            return 0
        while time.time() < deadline:
            if work_once(cfg):
                time.sleep(1)
            else:
                time.sleep(6)
        return 0
    finally:
        drop_lock()


if __name__ == '__main__':
    sys.exit(main())
