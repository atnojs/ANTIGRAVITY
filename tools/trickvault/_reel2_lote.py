# -*- coding: utf-8 -*-
"""Ciclo de imagenes para los 16 codigos NUEVOS de los reels del 2026-10-19.

Reutiliza _carpeta_lote.py y le anade la pieza que le falta: las tarjetas viven
en el array REEL2_COMMANDS (ids reel2-cmd-NNN), que la herramienta original no
lee (igual que _reels_lote.py hizo con REEL_COMMANDS).

Uso: _reel2_lote.py <carpeta> plan|gen|aplicar|validar
"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
TOOLS = r"E:\ANTIGRAVITY\tools\trickvault"
sys.path.insert(0, TOOLS)

import _carpeta_lote as L  # noqa: E402

_i = L.src.index("const REEL2_COMMANDS = [")
_j = L.src.index("\n];", _i)
REEL2 = re.findall(r"\['(/[^']+)',", L.src[_i:_j])
assert len(REEL2) == 16, "esperaba 16 codigos nuevos, hay %d" % len(REEL2)

_tarjetas_original = L.tarjetas_de


def tarjetas_de(carpeta):
    salida = _tarjetas_original(carpeta)
    for n, code in enumerate(REEL2):
        if L.CODE_FOLDER.get(code, "xl-dev") == carpeta:
            salida.append({"id": "reel2-cmd-%03d" % (n + 1), "code": code})
    return salida


L.tarjetas_de = tarjetas_de


def main():
    carpeta = sys.argv[1]
    modo = sys.argv[2] if len(sys.argv) > 2 else "plan"
    if modo == "plan":
        pend, sujetos = L.plan(carpeta)
        faltan = [t for t in pend if "[OBJETO]" in L.PROMPTS[t["code"]]
                  and t["id"] not in L._sujetos(carpeta)]
        print("SIN SUJETO: %d %s" % (len(faltan), [t["code"] for t in faltan]))
        return 0
    if modo == "gen":
        return L.generar(carpeta)
    if modo == "aplicar":
        return L.aplicar(carpeta)
    if modo == "validar":
        return L.validar()
    raise SystemExit("modo no reconocido: %s" % modo)


if __name__ == "__main__":
    sys.exit(main())
