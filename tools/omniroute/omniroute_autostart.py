#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""OmniRoute gateway - arranque oculto + registro de DeepSeek (v2).

QUE HACE
  1) Si el gateway no escucha en el puerto, lo arranca.
  2) Se loguea en el panel y garantiza que DeepSeek siga registrado como
     proveedor (sus credenciales NO sobreviven a los reinicios del servidor,
     por eso se re-registra cada hora en modo daemon).

POR QUE EXISTE LA v2 (fallo corregido)
  La v1 (omniroute_deepseek_autostart.py) lanzaba el gateway con
  subprocess.Popen sobre el shim `omniroute.cmd` usando DETACHED_PROCESS.
  En Windows, lanzar un .cmd asi hace que cmd.exe cree una CONSOLA NUEVA:
  de ahi la ventana de terminal que aparecia sola en cada arranque/reintento.
  La v2 elimina todas las vias por las que puede nacer una consola:
    * se ejecuta bajo pythonw.exe (no tiene consola propia),
    * lanza node.exe DIRECTO sobre bin/omniroute.mjs (nada de cmd.exe),
    * usa CREATE_NO_WINDOW | DETACHED_PROCESS y stdio a DEVNULL,
    * candado de instancia unica (antes se apilaban varios daemons),
    * ninguna credencial vive dentro del codigo.

CONFIGURACION (todo por variables de entorno; nada obligatorio)
  HERMES_HOME        carpeta de datos          (def. E:\\hermes-data)
  OMNIROUTE_PORT     puerto del gateway        (def. 20128)
  OMNIROUTE_NODE     ruta a node.exe           (def. C:\\Program Files\\nodejs\\node.exe)
  OMNIROUTE_ENTRY    ruta a bin/omniroute.mjs  (def. %APPDATA%\\npm\\node_modules\\omniroute\\bin\\omniroute.mjs)
  OMNIROUTE_BIND     "127.0.0.1" para atar solo a loopback (def. vacio = como siempre)
  OMNIROUTE_DASH_PW  password del panel; si no esta, se lee de
                     %USERPROFILE%\\.omniroute\\panel.secret o de $HERMES_HOME\\.env
  DEEPSEEK_API_KEY   se lee de $HERMES_HOME\\.env

USO
  pythonw omniroute_autostart.py            una pasada y sale
  pythonw omniroute_autostart.py daemon     bucle horario (modo autostart)
  python  omniroute_autostart.py status     imprime estado y sale

Solo libreria estandar. Sin dependencias.
"""
import io
import os
import socket
import subprocess
import sys
import time
import json
import ctypes
import urllib.request
import urllib.error

HERMES_HOME = os.environ.get("HERMES_HOME", r"E:\hermes-data")
LOG_PATH = os.path.join(HERMES_HOME, "logs", "omniroute-autostart.log")
LOCK_PATH = os.path.join(HERMES_HOME, "logs", "omniroute-autostart.lock")
ENV_PATH = os.path.join(HERMES_HOME, ".env")
SECRET_PATH = os.path.join(os.environ.get("USERPROFILE", ""), ".omniroute", "panel.secret")

PORT = str(os.environ.get("OMNIROUTE_PORT", "20128")).strip()
BASE = "http://127.0.0.1:%s" % PORT
NODE = os.environ.get("OMNIROUTE_NODE", r"C:\Program Files\nodejs\node.exe")
ENTRY = os.environ.get(
    "OMNIROUTE_ENTRY",
    os.path.join(os.environ.get("APPDATA", ""), "npm", "node_modules", "omniroute", "bin", "omniroute.mjs"),
)

MAX_LOG_BYTES = 5 * 1024 * 1024
DETACHED_PROCESS = 0x00000008
CREATE_NO_WINDOW = 0x08000000
STILL_ACTIVE = 259


# --------------------------------------------------------------------------- log
def log(msg):
    line = "[%s] %s\n" % (time.strftime("%Y-%m-%d %H:%M:%S"), msg)
    try:
        if os.path.exists(LOG_PATH) and os.path.getsize(LOG_PATH) > MAX_LOG_BYTES:
            os.replace(LOG_PATH, LOG_PATH + ".1")
    except OSError:
        pass
    try:
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
        with io.open(LOG_PATH, "a", encoding="utf-8") as fh:
            fh.write(line)
    except OSError:
        pass
    if sys.stdout is not None:          # bajo pythonw.exe stdout es None
        try:
            sys.stdout.write(line)
            sys.stdout.flush()
        except Exception:
            pass


# ------------------------------------------------------------------- config/env
def read_env_file(path, key):
    """Devuelve el valor de KEY= en un fichero .env, o None."""
    try:
        with io.open(path, "r", encoding="utf-8", errors="replace") as fh:
            for raw in fh:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                name, value = line.split("=", 1)
                if name.strip() == key:
                    return value.strip().strip('"').strip("'")
    except OSError:
        return None
    return None


def setting(key, paths):
    """Busca en entorno -> ficheros indicados (en orden)."""
    value = os.environ.get(key)
    if value:
        return value.strip()
    for path in paths:
        value = read_env_file(path, key)
        if value:
            return value
    return None


DASH_PW = setting("OMNIROUTE_DASH_PW", [SECRET_PATH, ENV_PATH])
DEEPSEEK_KEY = setting("DEEPSEEK_API_KEY", [ENV_PATH])


# ------------------------------------------------------------------------ red
def port_open(host="127.0.0.1", port=None, timeout=2):
    """TCP connect puro: no depende de CIM/WMI ni de que el HTTP conteste."""
    sock = socket.socket()
    sock.settimeout(timeout)
    try:
        sock.connect((host, int(port or PORT)))
        return True
    except OSError:
        return False
    finally:
        sock.close()


def http_json(url, payload=None, cookie_jar=None, timeout=10):
    """POST si hay payload, GET si no. Devuelve (status, json|None)."""
    headers = {"Content-Type": "application/json"}
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=body, headers=headers,
                                     method="POST" if body else "GET")
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookie_jar)
    ) if cookie_jar is not None else urllib.request.build_opener()
    try:
        response = opener.open(request, timeout=timeout)
        raw = response.read().decode("utf-8", errors="replace")
        return response.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as exc:
        return exc.code, None
    except Exception as exc:                       # noqa: BLE001
        log("HTTP %s -> %s" % (url, exc))
        return 0, None


# --------------------------------------------------------------------- candado
def pid_alive(pid):
    handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, int(pid))
    if not handle:
        return False
    try:
        code = ctypes.c_ulong()
        if not ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code)):
            return False
        return code.value == STILL_ACTIVE
    finally:
        ctypes.windll.kernel32.CloseHandle(handle)


def acquire_lock():
    """Un solo daemon. Si el PID del candado sigue vivo, salimos."""
    try:
        if os.path.exists(LOCK_PATH):
            with io.open(LOCK_PATH, "r", encoding="utf-8", errors="replace") as fh:
                other = int((fh.read() or "0").strip() or 0)
            if other and other != os.getpid() and pid_alive(other):
                log("Ya hay un daemon vivo (PID %d). Salgo sin duplicar." % other)
                return False
    except (OSError, ValueError):
        pass
    try:
        with io.open(LOCK_PATH, "w", encoding="utf-8") as fh:
            fh.write(str(os.getpid()))
    except OSError:
        pass
    return True


# -------------------------------------------------------------------- arranque
def start_server():
    if not os.path.exists(NODE):
        log("No encuentro node.exe en %s" % NODE)
        return False
    if not os.path.exists(ENTRY):
        log("No encuentro el entrypoint de OmniRoute en %s" % ENTRY)
        return False

    env = dict(os.environ)
    env["PORT"] = PORT
    bind = (os.environ.get("OMNIROUTE_BIND") or "").strip()
    if bind:
        env["HOSTNAME"] = bind

    log("Gateway caido. Arrancando node directo (sin consola ni cmd.exe)...")
    try:
        subprocess.Popen(
            [NODE, ENTRY, "serve"],
            cwd=HERMES_HOME,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=DETACHED_PROCESS | CREATE_NO_WINDOW,
            close_fds=True,
        )
    except Exception as exc:                       # noqa: BLE001
        log("Fallo al lanzar el gateway: %s" % exc)
        return False

    for _ in range(60):
        time.sleep(1)
        if port_open():
            log("Gateway arriba en el puerto %s." % PORT)
            return True
    log("El gateway no abrio el puerto %s en 60 s." % PORT)
    return False


# ------------------------------------------------------------------- DeepSeek
def ensure_deepseek():
    if not DEEPSEEK_KEY:
        log("Sin DEEPSEEK_API_KEY en %s -> no hay nada que registrar." % ENV_PATH)
        return
    if not DASH_PW:
        log("Sin password del panel (OMNIROUTE_DASH_PW / %s) -> no puedo loguearme." % SECRET_PATH)
        return

    import http.cookiejar
    jar = http.cookiejar.CookieJar()

    status, _ = http_json(BASE + "/api/auth/login", {"password": DASH_PW}, cookie_jar=jar)
    if status != 200:
        log("Login en el panel fallido (HTTP %s)." % status)
        return

    status, providers = http_json(BASE + "/api/providers", cookie_jar=jar)
    if status != 200 or providers is None:
        log("No pude leer /api/providers (HTTP %s)." % status)
        return

    active = [
        c for c in providers.get("connections", [])
        if c.get("provider") == "deepseek" and c.get("isActive")
    ]
    if active:
        log("DeepSeek ya registrado y activo. OK.")
        return

    status, _ = http_json(
        BASE + "/api/providers",
        {"provider": "deepseek", "apiKey": DEEPSEEK_KEY, "name": "DeepSeek Antonio"},
        cookie_jar=jar,
        timeout=15,
    )
    log("Registro de DeepSeek -> HTTP %s" % status)


# ----------------------------------------------------------------------- modos
def run_once():
    if port_open():
        log("Gateway ya escuchando en %s." % PORT)
    elif not start_server():
        return
    ensure_deepseek()


def daemon():
    if not acquire_lock():
        return
    log("Modo daemon: reviso cada hora (PID %d)." % os.getpid())
    while True:
        try:
            run_once()
        except Exception as exc:                   # noqa: BLE001
            log("Error en el ciclo: %s" % exc)
        time.sleep(3600)


def status():
    log("--- estado ---")
    log("puerto %s: %s" % (PORT, "ABIERTO" if port_open() else "CERRADO"))
    log("node: %s (%s)" % (NODE, "ok" if os.path.exists(NODE) else "NO EXISTE"))
    log("entrypoint: %s (%s)" % (ENTRY, "ok" if os.path.exists(ENTRY) else "NO EXISTE"))
    log("password de panel: %s" % ("configurada" if DASH_PW else "FALTA"))
    log("deepseek key: %s" % ("configurada" if DEEPSEEK_KEY else "FALTA"))


if __name__ == "__main__":
    arg = sys.argv[1].lower() if len(sys.argv) > 1 else ""
    if arg == "daemon":
        daemon()
    elif arg == "status":
        status()
    else:
        run_once()
