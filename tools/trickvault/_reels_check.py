# -*- coding: utf-8 -*-
"""Comprueba el registro de los ejemplos de los 267 codigos nuevos.

Para cada carpeta implicada:
  - que cada codigo tenga su entrada en SEED_COMMAND_IMAGES,
  - que el fichero exista en disco con tamaño razonable,
  - que exista la entrada de GENERATED_IMAGE_RELEASES con el prefijo del assets real.

Uso: _reels_check.py [carpeta ...]     (sin argumentos: todas)
"""
import hashlib
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
APP = r"E:\ANTIGRAVITY\apps\trickvault\index.html"
ASSETS = r"E:\ANTIGRAVITY\apps\trickvault\assets"
TOOLS = r"E:\ANTIGRAVITY\tools\trickvault"
sys.path.insert(0, TOOLS)

import _reels_lote as R  # noqa: E402

src = io.open(APP, encoding="utf-8").read()

# codigo -> ruta registrada (SEED_COMMAND_IMAGES + Object.assign posterior)
i = src.index("const SEED_COMMAND_IMAGES = {")
j = src.index("\n};", i)
reg = dict(re.findall(r"'(/[^']+)':\s*'([^']+)'", src[i:j]))
oa = src.index("Object.assign(SEED_COMMAND_IMAGES, {")
oa_end = src.index("\n});", oa)
reg.update(dict(re.findall(r"'(/[^']+)':\s*'([^']+)'", src[oa:oa_end])))

# releases
ri = src.index("const GENERATED_IMAGE_RELEASES = [")
rj = src.index("];", ri)
rels = {m.group(1): (m.group(2), m.group(3)) for m in re.finditer(
    r"category: '([^']+)', prefix: '([^']+)', key: '([^']+)'", src[ri:rj])}

carpetas = sys.argv[1:] or sorted(set(R.L.CODE_FOLDER.get(c, "xl-dev") for c in R.REEL))
fallos, total, ok = [], 0, 0
for carpeta in carpetas:
    sub = R.L.assets_dir(carpeta)
    rel = rels.get(carpeta)
    if not rel or rel[0] != "assets/%s/" % sub:
        fallos.append("%s: release ausente o con prefijo distinto (esperado assets/%s/)" % (carpeta, sub))
    n_ok = n_mal = 0
    for code in R.REEL:
        if R.L.CODE_FOLDER.get(code, "xl-dev") != carpeta:
            continue
        total += 1
        ruta = reg.get(code)
        if not ruta:
            fallos.append("%s %s: sin registrar" % (carpeta, code))
            n_mal += 1
            continue
        disco = os.path.join(ASSETS, *ruta.split("/")[1:])
        if not os.path.exists(disco) or os.path.getsize(disco) < 8000:
            fallos.append("%s %s: fichero ausente o diminuto (%s)" % (carpeta, code, ruta))
            n_mal += 1
            continue
        n_ok += 1
    ok += n_ok
    print("%-20s assets/%-22s registrados %2d/%2d  release=%s" % (
        carpeta, sub + "/", n_ok, n_ok + n_mal, "ok" if rel and rel[0] == "assets/%s/" % sub else "FALTA"))

print("\nTOTAL: %d/%d registrados y en disco" % (ok, total))
if fallos:
    print("FALLOS (%d):" % len(fallos))
    for f in fallos[:25]:
        print("  -", f)
sys.exit(1 if fallos else 0)
