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
      "out_dir": "",                          # vacío = outputs/ del agente
      "tmp_dir": ""                           # opcional: temporal propio si TEMP está restringido
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
import urllib.parse
import urllib.request

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(AGENT_DIR, 'agente.json')
LOCKFILE = os.path.join(AGENT_DIR, 'flow_agent.lock')
FLOW_PY = os.path.join(AGENT_DIR, 'flow.py')
LOCK_STALE_SEC = 3 * 60 * 60
# Sello del build: permite saber qué versión está corriendo cuando hay dudas.
AGENT_BUILD = 'v1.4.0 · 2026-10-27 · servicio permanente, cancelación fiable y lock robusto'
# Cada cuánto se pregunta al servidor si hay que parar (segundos).
CANCEL_POLL_SEC = 3
# Se activa cuando el último trabajo se aplazó por el perfil ocupado: conviene
# esperar más antes de reclamar otro, para no consumir intentos en balde.
_postponed = False
MAX_SIDE = 1400
JPEG_QUALITY = 88
MAX_REFS = 2
MAX_VIDEO_BYTES = 32 * 1024 * 1024
VIDEO_EXT = ('.mp4', '.webm', '.mov')
# En Windows, lanzar un programa de consola desde pythonw abre una ventana que se
# cierra sola. Estas banderas lo evitan.
NO_WINDOW = 0x08000000 if os.name == 'nt' else 0
IMAGE_EXT = ('.jpg', '.jpeg', '.png', '.webp')
MODEL_ALIASES = {'Omni Flash': 'Omni 1.1 Flash'}
# El servidor guarda el nombre del menú de Flow, pero un trabajo antiguo puede
# traer el identificador interno: se traduce para no abortar la generación.
MODEL_NAMES = {
    'flow-nano-banana-2': 'Nano Banana 2',
    'flow-nano-banana-pro': 'Nano Banana Pro',
    'flow-nano-banana-2-lite': 'Nano Banana 2 Lite',
    'nano-banana-2': 'Nano Banana 2',
    'nano-banana-pro': 'Nano Banana Pro',
    'nano-banana-2-lite': 'Nano Banana 2 Lite',
    'veo-3.1-lite': 'Veo 3.1 - Lite',
    'veo-3.1-fast': 'Veo 3.1 - Fast',
    'veo-3.1-quality': 'Veo 3.1 - Quality',
    'omni-flash': 'Omni Flash',
}
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


def api(cfg: dict, action: str, payload: dict | None = None, timeout: int = 60, extra_query: str = '') -> dict:
    url = '%s?action=%s%s' % (cfg['base'].strip(), action, extra_query)
    data = json.dumps(payload or {}).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UIS-Agent': cfg['token'],
    })
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def api_retry(cfg: dict, action: str, payload: dict | None = None, attempts: int = 4, timeout: int = 90, extra_query: str = '') -> dict:
    last = None
    for i in range(attempts):
        try:
            return api(cfg, action, payload, timeout=timeout, extra_query=extra_query)
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
    # El edge de Hostinger (hcdn) devuelve a veces un 307/308 al subir. urllib no
    # los sigue en POST, así que el archivo se quedaba sin entregar y el trabajo
    # terminaba en "failed" aunque la imagen ya estuviera generada. Se siguen las
    # redirecciones (hasta 3 saltos) y los 3xx se reintentan como los 5xx.
    destino = url
    for i in range(attempts):
        try:
            saltos = 0
            while True:
                req = urllib.request.Request(destino, data=body, method='POST', headers=headers)
                try:
                    with urllib.request.urlopen(req, timeout=600) as resp:
                        return json.loads(resp.read().decode('utf-8'))
                except urllib.error.HTTPError as exc:
                    if exc.code in (301, 302, 303, 307, 308) and saltos < 3:
                        ubicacion = ''
                        try:
                            ubicacion = exc.headers.get('Location') or ''
                        except Exception:
                            ubicacion = ''
                        if ubicacion:
                            destino = urllib.parse.urljoin(destino, ubicacion)
                            saltos += 1
                            last = 'HTTP %d -> %s' % (exc.code, destino)
                            continue
                    raise
        except urllib.error.HTTPError as exc:
            detail = ''
            try:
                detail = exc.read().decode('utf-8', 'replace')[:300]
            except Exception:
                pass
            if exc.code in (401, 403):
                raise RuntimeError('credencial rechazada al subir (HTTP %d)' % exc.code) from exc
            last = 'HTTP %d %s' % (exc.code, detail)
            # 408, 429 y los 3xx que no se pudieron seguir son transitorios.
            if exc.code < 500 and exc.code not in (301, 302, 303, 307, 308, 408, 429):
                raise RuntimeError('el servidor rechazó el archivo: %s' % last) from exc
        except (urllib.error.URLError, OSError, ValueError) as exc:
            last = '%s: %s' % (type(exc).__name__, exc)
        if i < attempts - 1:
            time.sleep(2 ** i)
    raise RuntimeError('no se pudo subir el archivo tras %d intentos: %s' % (attempts, last))


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


def _pid_is_python(pid: int) -> bool:
    """En Windows el PID de un lock huérfano puede reciclarse a otro programa.
    El lock solo es válido si su titular sigue siendo un proceso de Python; si
    no, se trata como huérfano y se libera (antes el agente se negaba a arrancar
    con «otro agente en marcha» aunque no hubiera ninguno)."""
    if pid <= 0 or os.name != 'nt':
        return True
    try:
        out = subprocess.check_output(
            ['tasklist', '/FI', 'PID eq %d' % pid, '/FO', 'CSV', '/NH'],
            text=True, timeout=8, stderr=subprocess.DEVNULL,
        )
    except Exception:
        return True  # si no se puede comprobar, no se bloquea el arranque
    first = out.strip().splitlines()[0] if out.strip() else ''
    name = first.split('","')[0].strip('"').strip().lower() if first else ''
    return name.startswith('python')


def take_lock() -> bool:
    try:
        if os.path.isfile(LOCKFILE):
            holder = 0
            try:
                holder = int((open(LOCKFILE, encoding='utf-8').read() or '0').strip() or 0)
            except (OSError, ValueError):
                holder = 0
            stale = time.time() - os.path.getmtime(LOCKFILE) > LOCK_STALE_SEC
            if stale or not _pid_alive(holder) or not _pid_is_python(holder):
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
    # Chrome y Playwright necesitan escribir archivos temporales. Si la carpeta
    # temporal del sistema está restringida (políticas, sandbox), se puede
    # apuntar a una propia con "tmp_dir" en agente.json.
    tmp = str(cfg.get('tmp_dir') or '').strip()
    if tmp:
        os.makedirs(tmp, exist_ok=True)
        env['TEMP'] = tmp
        env['TMP'] = tmp
        env['TMPDIR'] = tmp
    return env


def chrome_using_profile(profile: str) -> int:
    """Cuenta los Chrome que tienen abierto el perfil de Flow.

    Playwright no puede abrir un perfil persistente en uso: si hay alguno, la
    generación muere con un error de «ProcessSingleton» poco claro. La ruta se
    normaliza porque en agente.json se escribe con «/» y Chrome la recibe con «\».
    """
    if os.name != 'nt' or not profile:
        return 0
    buscado = os.path.normcase(os.path.normpath(profile))
    try:
        script = (
            "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | "
            "ForEach-Object { $_.CommandLine }"
        )
        proc = subprocess.run(
            ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', script],
            capture_output=True, text=True, timeout=60, encoding='utf-8', errors='replace',
            creationflags=NO_WINDOW,
        )
        cuenta = 0
        for linea in (proc.stdout or '').splitlines():
            if 'user-data-dir' not in linea:
                continue
            # Se extrae el valor de --user-data-dir y se compara normalizado.
            for trozo in linea.split():
                if not trozo.lower().startswith('--user-data-dir='):
                    continue
                valor = trozo.split('=', 1)[1].strip('"')
                if os.path.normcase(os.path.normpath(valor)) == buscado:
                    cuenta += 1
        return cuenta
    except Exception:
        return 0


class TransientError(RuntimeError):
    """Fallo pasajero: el trabajo debe volver a la cola, no marcarse como fallido."""


class CancelledError(RuntimeError):
    """La persona pidió parar: se cierra Chrome y no se sube nada."""


def log_dir() -> str:
    """Carpeta de logs del agente (se crea si falta)."""
    path = os.path.join(AGENT_DIR, 'logs')
    os.makedirs(path, exist_ok=True)
    return path


def guardar_log(jid: str, texto: str) -> str:
    """Guarda la salida completa de una generación para poder diagnosticar.

    La ventana del agente solo muestra un resumen; cuando algo falla de verdad,
    el motivo completo está aquí.
    """
    try:
        ruta = os.path.join(log_dir(), '%s.log' % jid)
        with open(ruta, 'w', encoding='utf-8') as fh:
            fh.write(texto)
        # Se conservan los 20 logs más recientes.
        logs = sorted(
            (os.path.join(log_dir(), n) for n in os.listdir(log_dir()) if n.endswith('.log')),
            key=os.path.getmtime,
            reverse=True,
        )
        for viejo in logs[20:]:
            try:
                os.remove(viejo)
            except OSError:
                pass
        return ruta
    except OSError:
        return ''


def summarize_error(out: str) -> str:
    """Saca la causa real del error, no el ruido de cierre de asyncio.

    flow.py, cuando Chrome falla al arrancar, imprime la excepción de Playwright
    y DESPUÉS un «RuntimeError: Event loop is closed» del recolector. Si se coge
    la última línea se informa del ruido y se oculta el motivo.
    """
    ruido = (
        'event loop is closed',
        'exception ignored in:',
        '__del__',
        'base_events',
        'base_subprocess',
        'proactor_events',
        'call_soon',
        '_check_closed',
    )
    lineas = [line.strip() for line in out.splitlines() if line.strip()]

    def es_ruido(linea: str) -> bool:
        baja = linea.lower()
        return any(marca in baja for marca in ruido)

    # 1) El error de Playwright trae el motivo de verdad.
    for linea in lineas:
        if es_ruido(linea):
            continue
        if 'playwright._impl._errors' in linea or 'BrowserType.launch' in linea:
            return linea[:280]
    # 2) Errores propios del flujo (modelo, ratio, etc.).
    for linea in lineas:
        if es_ruido(linea):
            continue
        if re.match(r'^[A-Za-z_.]*(Error|Exception):', linea):
            return linea[:280]
    # 3) Cualquier línea con «error» que no sea ruido.
    for linea in reversed(lineas):
        if es_ruido(linea):
            continue
        if 'error' in linea.lower():
            return linea[:280]
    # 4) Última línea con contenido.
    utiles = [l for l in lineas if not es_ruido(l)]
    return (utiles[-1] if utiles else 'flow.py falló sin salida legible')[:280]


# Fallos que no son culpa del trabajo: otro proceso tiene el perfil de Chrome
# ocupado un momento. En ese caso el trabajo vuelve a la cola en vez de fallar.
TRANSIENT_MARKS = (
    'processsingleton',
    'lock file can not be created',
    'failed to create a processsingleton',
    'profile is already in use',
    'acceso denegado',
    'permission denied',
    'target page, context or browser has been closed',
)


def is_transient(out: str) -> bool:
    baja = out.lower()
    return any(marca in baja for marca in TRANSIENT_MARKS)


def flow_model(model: str) -> str:
    """Nombre con el que Flow llama al modelo en su menú.

    El servidor ya manda el nombre del menú; si llega un identificador interno
    (trabajo antiguo o cliente nuevo), se traduce. Nunca se cambia de modelo:
    si no se reconoce, se pasa tal cual y configure.py aborta con un mensaje
    claro en vez de generar con otro.
    """
    name = str(model or '').strip()
    if not name:
        return name
    name = MODEL_NAMES.get(name.lower(), name)
    return MODEL_ALIASES.get(name, name)


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


def cancel_requested(cfg: dict, jid: str) -> bool:
    """Pregunta al servidor si hay que parar. Si no contesta, se sigue generando.

    Un fallo de red no debe abortar una generación en curso: solo se para cuando
    el servidor dice explícitamente que sí.
    """
    try:
        datos = api_retry(
            cfg, 'agent.cancelled', {'id': jid}, attempts=1, timeout=10,
            extra_query='&id=' + urllib.parse.quote(jid, safe=''),
        )
        return bool(datos.get('cancel'))
    except Exception:  # noqa: BLE001 - nunca interrumpir por un fallo de red
        return False


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

    # Se lanza en segundo plano para poder vigilar la cancelación mientras genera.
    proc = subprocess.Popen(
        [sys.executable, FLOW_PY] + extra,
        cwd=flow_dir(),
        env=child_env(cfg),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding='utf-8',
        errors='replace',
        creationflags=NO_WINDOW,
    )
    while proc.poll() is None:
        time.sleep(CANCEL_POLL_SEC)
        if cancel_requested(cfg, jid):
            proc.kill()
            try:
                proc.communicate(timeout=20)
            except subprocess.TimeoutExpired:
                pass
            drop_output(folder, jid, exts)
            raise CancelledError('cancelado desde la biblioteca')
    salida, errores = proc.communicate()
    out = (salida or '') + (errores or '')
    ruta_log = guardar_log(jid, out)
    if proc.returncode != 0:
        # Se distingue el fallo pasajero (otro Chrome con el perfil) del fallo real.
        if is_transient(out):
            raise TransientError(summarize_error(out) or 'perfil de Chrome ocupado')
        error = RuntimeError(summarize_error(out) or ('flow.py terminó con código %d' % proc.returncode))
        if ruta_log:
            print('  detalle completo en %s' % ruta_log)
        raise error
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
    profile = str(cfg.get('flow_profile') or '')

    # El perfil de Chrome solo lo puede usar un proceso a la vez. Si otro worker
    # (por ejemplo el antiguo de Flow Studio) lo tiene ocupado, NO se reclama el
    # trabajo: reclamarlo y fallar quemaría el intento y marcaría el trabajo como
    # fallido por una colisión pasajera.
    if profile:
        ocupado = chrome_using_profile(profile)
        if ocupado > 0:
            print('perfil de Flow ocupado por %d Chrome: espero sin reclamar trabajo' % ocupado)
            return False

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
        # Segunda comprobación: entre el claim y la generación pudo abrirse otro
        # Chrome. Aquí ya hay trabajo reclamado, así que se informa del fallo.
        open_chrome = chrome_using_profile(profile)
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
    except CancelledError:
        print('%s cancelado: se cerró la generación y no se subió nada' % jid)
    except TransientError as exc:
        # El perfil lo tenía otro proceso: se devuelve el trabajo a la cola y se
        # espera. No es un fallo del trabajo ni debe gastar un intento.
        global _postponed
        _postponed = True
        motivo = ('%s' % exc)[:300]
        try:
            salida = api_retry(cfg, 'agent.release', {'id': jid, 'error': motivo}, attempts=4)
            if salida.get('released', True):
                print('%s aplazado: %s' % (jid, motivo))
            else:
                print('%s aplazado %s veces: se marca como fallido' % (jid, salida.get('attempts', '?')))
        except Exception as report_exc:  # pylint: disable=broad-except
            print('%s no se pudo aplazar (%s); se reintentará al caducar' % (jid, type(report_exc).__name__))
    except Exception as exc:  # noqa: BLE001 - el fallo se informa al servidor
        motivo = ('%s: %s' % (type(exc).__name__, exc))[:300]
        try:
            api_retry(cfg, 'agent.fail', {'id': jid, 'error': motivo}, attempts=4)
        except Exception as report_exc:  # pylint: disable=broad-except
            # Si no se puede informar, el trabajo se quedará «pendiente de
            # comprobación» al caducar la ventana: nunca se reenvía solo.
            print('%s no se pudo informar del fallo (%s)' % (jid, type(report_exc).__name__))
        print('%s FALLÓ %s' % (jid, motivo))
        print('  log completo: %s' % os.path.join(log_dir(), '%s.log' % jid))
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
    print('Agente de Flow · %s' % AGENT_BUILD)
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
            global _postponed
            _postponed = False
            try:
                if work_once(cfg):
                    time.sleep(1)
                elif _postponed:
                    # El perfil estaba ocupado: se da tiempo a que se libere.
                    print('  espero 15 s antes de reintentar')
                    time.sleep(15)
                else:
                    time.sleep(6)
            except Exception as exc:  # noqa: BLE001
                # Un fallo inesperado no debe tumbar el servicio: se anota y se
                # sigue. Si es la red, el próximo ciclo lo resolverá.
                print('ciclo con error (%s): %s — sigo' % (type(exc).__name__, str(exc)[:160]))
                time.sleep(10)
        return 0
    finally:
        drop_lock()


if __name__ == '__main__':
    sys.exit(main())
