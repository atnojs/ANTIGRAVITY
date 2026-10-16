# -*- coding: utf-8 -*-
"""Ciclo de imagenes para los 267 codigos NUEVOS (reels + carruseles, 2026-10-13).

Reutiliza tal cual la herramienta del proyecto (_carpeta_lote.py) y le anade la
unica pieza que le falta: las tarjetas nuevas viven en el array REEL_COMMANDS
(ids reel-cmd-NNN), que la herramienta original no lee.

Uso:
  _reels_lote.py <carpeta> plan|gen|aplicar|validar|borrar|sujetos <sujeto> [--excepciones f.json]
"""
import io
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
TOOLS = r"E:\ANTIGRAVITY\tools\trickvault"
sys.path.insert(0, TOOLS)

import _carpeta_lote as L  # noqa: E402

# ── tarjetas nuevas (REEL_COMMANDS) ──────────────────────────────────────────
_i = L.src.index("const REEL_COMMANDS = [")
_j = L.src.index("\n];", _i)
REEL = re.findall(r"\['(/[^']+)',", L.src[_i:_j])
assert len(REEL) == 267, "esperaba 267 codigos nuevos, hay %d" % len(REEL)

_tarjetas_original = L.tarjetas_de


def tarjetas_de(carpeta):
    salida = _tarjetas_original(carpeta)
    for n, code in enumerate(REEL):
        if L.CODE_FOLDER.get(code, "xl-dev") == carpeta:
            salida.append({"id": "reel-cmd-%03d" % (n + 1), "code": code})
    return salida


L.tarjetas_de = tarjetas_de


def sujetos(carpeta, sujeto, excepciones=None, codes_exc=None):
    """Como L.sujetos, pero SIN pisar los sujetos ya decididos en tandas
    anteriores: los conserva y solo anade/actualiza las tarjetas nuevas.

    `codes_exc` permite dar sujeto propio a codigos concretos (los que chocan con
    el sujeto unico de la carpeta) sin tocar el resto.
    """
    f_suj = os.path.join(TOOLS, "_sujetos_%s.json" % carpeta)
    f_eje = os.path.join(TOOLS, "_ejemplos_%s.json" % carpeta)
    prev_suj = json.load(io.open(f_suj, encoding="utf-8")) if os.path.exists(f_suj) else {}
    prev_eje = json.load(io.open(f_eje, encoding="utf-8")) if os.path.exists(f_eje) else {}
    exc = json.load(io.open(excepciones, encoding="utf-8")) if excepciones else {}
    exc_por_codigo = dict(codes_exc or {})

    pend = L.pendientes(carpeta)
    con, sin, cuenta = dict(prev_suj), dict(prev_eje), {"objeto": 0, "excepcion": 0, "escena": 0}
    for t in pend:
        if "[OBJETO]" not in L.PROMPTS[t["code"]]:
            # comando "aplica esto a tu imagen": necesita pista para que el ejemplo
            # no sea un cartel inventado.
            sin[t["id"]] = "Example: %s." % sujeto.rstrip(".")
            cuenta["escena"] += 1
            continue
        if t["code"] in exc_por_codigo:
            con[t["id"]] = exc_por_codigo[t["code"]]
            cuenta["excepcion"] += 1
        elif t["id"] in exc:
            con[t["id"]] = exc[t["id"]]
            cuenta["excepcion"] += 1
        else:
            con[t["id"]] = sujeto
            cuenta["objeto"] += 1
    json.dump(con, io.open(f_suj, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(sin, io.open(f_eje, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("carpeta %s | pendientes %d | sujeto unico: %s" % (carpeta, len(pend), sujeto))
    for t in pend:
        print("   %-14s %-40s %s" % (t["id"], t["code"], con.get(t["id"], "(sin [OBJETO])")))
    print("   -> %d con sujeto, %d excepciones, %d con pista" % (
        cuenta["objeto"], cuenta["excepcion"], cuenta["escena"]))
    return 0


def main():
    carpeta = sys.argv[1]
    modo = sys.argv[2] if len(sys.argv) > 2 else "plan"
    if modo == "plan":
        pend, _ = L.plan(carpeta)
        faltan = [t for t in pend if "[OBJETO]" in L.PROMPTS[t["code"]]
                  and t["id"] not in L._sujetos(carpeta)]
        print("SIN SUJETO: %d %s" % (len(faltan), [t["code"] for t in faltan][:6]))
        return 0
    if modo == "gen":
        return L.generar(carpeta)
    if modo == "aplicar":
        return L.aplicar(carpeta)
    if modo == "validar":
        return L.validar()
    if modo == "borrar":
        return L.borrar(carpeta)
    if modo == "sujetos":
        exc = None
        codes_exc = {}
        if "--excepciones" in sys.argv:
            exc = sys.argv[sys.argv.index("--excepciones") + 1]
        if "--codes-exc" in sys.argv:
            for par in sys.argv[sys.argv.index("--codes-exc") + 1].split("|"):
                if "=" in par:
                    cod, sub = par.split("=", 1)
                    codes_exc[cod.strip()] = sub.strip()
        return sujetos(carpeta, sys.argv[3], exc, codes_exc)
    raise SystemExit("modo no reconocido: %s" % modo)


if __name__ == "__main__":
    sys.exit(main())
