# -*- coding: utf-8 -*-
"""Lote completo: genera, aplica, comprueba y publica cada carpeta pendiente.

Uso: _reels_batch.py [carpeta ...]
Sin argumentos procesa todas las carpetas de REEL_COMMANDS que aun tengan
codigos sin ejemplo registrado.
"""
import io
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
TOOLS = r"E:\ANTIGRAVITY\tools\trickvault"
REPO = r"E:\ANTIGRAVITY"
APP = os.path.join(REPO, "apps", "trickvault", "index.html")
PY = sys.executable
os.environ.setdefault("WORKERS", "4")
sys.path.insert(0, TOOLS)

import _reels_lote as R  # noqa: E402

ORDEN = [
    "xl-escenaprueba", "xl-fotoproducto", "xl-otromundo", "xl-estilos", "xl-negocioredes",
    "xl-comidamoda", "xl-luzcamara", "xl-verdentro", "xl-hechmano", "xl-hechomano",
    "xl-ilustracion", "xl-pintura", "xl-juegos", "xl-letras3d", "xl-retroedu",
    "xl-casaviajes", "xl-carteles", "xl-camararetrato", "xl-planos",
]
ORDEN = [c for c in ORDEN if c != "xl-hechmano"]


def sh(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", cwd=kw.pop("cwd", TOOLS))
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def registrados(carpeta):
    """(n_ok, n_total) de esa carpeta."""
    rc, out = sh([PY, os.path.join(TOOLS, "_reels_check.py"), carpeta])
    m = re.search(r"TOTAL: (\d+)/(\d+)", out)
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


def procesar(carpeta, solo_gen=False):
    ok, tot = registrados(carpeta)
    if tot and ok == tot:
        print("[%s] ya estaba hecha (%d/%d)" % (carpeta, ok, tot), flush=True)
        return True
    print("\n===== %s =====" % carpeta, flush=True)

    rc, out = sh([PY, os.path.join(TOOLS, "_reels_lote.py"), carpeta, "gen"])
    print(out.strip().splitlines()[-1] if out.strip() else "(gen sin salida)", flush=True)
    if "FALLO" in out:
        print(out[-1500:], flush=True)
    if solo_gen:
        return True

    rc, out = sh([PY, os.path.join(TOOLS, "_reels_lote.py"), carpeta, "aplicar"])
    print("\n".join(l for l in out.splitlines() if "registrad" in l or "release" in l or "sin PNG" in l), flush=True)

    rc, out = sh([PY, os.path.join(TOOLS, "_reels_lote.py"), carpeta, "validar"])
    print("validar:", out.strip().splitlines()[-1] if out.strip() else "?", flush=True)

    ok, tot = registrados(carpeta)
    print("registro: %d/%d" % (ok, tot), flush=True)
    if not tot or ok != tot:
        print("!! %s NO cumple el registro; no se publica" % carpeta, flush=True)
        return False

    sub = R.L.assets_dir(carpeta)
    rc, _ = sh(["git", "add", "apps/trickvault/index.html", "apps/trickvault/assets/%s" % sub], cwd=REPO)
    msg = ("feat(trickvault): ejemplos de %s (%d imagenes nuevas)\n\n"
           "Sujeto unico de la carpeta; generadas con openai-image-2-low (1:1) en "
           "assets/%s/ y registradas en SEED_COMMAND_IMAGES." % (carpeta, tot, sub))
    rc, out = sh(["git", "-c", "core.safecrlf=false", "commit", "-q", "-m", msg], cwd=REPO)
    rc2, out2 = sh(["git", "push", "origin", "main"], cwd=REPO)
    print("commit:", "ok" if rc == 0 else out[-200:], "| push:", "ok" if rc2 == 0 else out2[-200:], flush=True)
    return True


def main():
    args = sys.argv[1:]
    solo_gen = "--solo-gen" in args
    carpetas = [a for a in args if not a.startswith("--")] or ORDEN
    hechas = 0
    for c in carpetas:
        try:
            if procesar(c, solo_gen):
                hechas += 1
        except Exception as e:  # noqa: BLE001
            print("EXCEPCION en %s: %r" % (c, e), flush=True)
    print("\nLOTE TERMINADO (%s): %d carpetas procesadas" % ("solo gen" if solo_gen else "completo", hechas), flush=True)


if __name__ == "__main__":
    main()
