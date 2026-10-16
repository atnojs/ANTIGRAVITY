# -*- coding: utf-8 -*-
"""Asigna el sujeto unico (y las excepciones) de cada carpeta nueva.

Reutiliza los sujetos que ya usaban las tandas anteriores de esa misma carpeta
para que el conjunto quede coherente; en las que no tenian, se elige uno que
aguante todos los codigos nuevos.
"""
import os
import subprocess
import sys

TOOLS = r"E:\ANTIGRAVITY\tools\trickvault"
PY = sys.executable

# carpeta -> (sujeto unico, {codigo: sujeto propio})
PLAN = [
    ("xl-escenaprueba", "a handcrafted leather backpack", {}),
    ("xl-fotoproducto", "a glass bottle of artisanal olive oil", {}),
    ("xl-otromundo", "a classic camper van", {}),
    ("xl-estilos", "an old wooden fishing boat moored in a small Mediterranean harbour", {}),
    ("xl-negocioredes", "ORIGEN, a specialty coffee roaster", {}),
    ("xl-comidamoda", "a gourmet chocolate cake", {
        "/outfit": "a young woman in a beige trench coat",
        "/underglasseditorial": "a young woman in a beige trench coat",
        "/crosswalkprofileeditorial": "a young woman in a beige trench coat",
        "/fashioncontentsheet": "a young woman in a beige trench coat",
        "/motionblureditorial": "a young woman in a beige trench coat",
    }),
    ("xl-verdentro", "a running sneaker", {}),
    ("xl-luzcamara", "a young woman with curly dark hair", {}),
    ("xl-hechomano", "a red fox", {}),
    ("xl-ilustracion", "a friendly retro robot", {}),
    ("xl-pintura", "sunflowers on a wooden table", {}),
    ("xl-juegos", "a brave young adventurer with a sword", {}),
    ("xl-letras3d", "a red fox", {}),
    ("xl-retroedu", "a vintage typewriter", {}),
    ("xl-casaviajes", "a white Mediterranean villa with a pool", {}),
    ("xl-carteles", "a red fox", {}),
    ("xl-camararetrato", "a young woman with curly dark hair", {}),
    ("xl-planos", "a red vintage sports car", {}),
]


def main(solo=None):
    for carpeta, sujeto, exc in PLAN:
        if solo and carpeta != solo:
            continue
        cmd = [PY, os.path.join(TOOLS, "_reels_lote.py"), carpeta, "sujetos", sujeto]
        if exc:
            cmd += ["--codes-exc", "|".join("%s=%s" % (c, s) for c, s in exc.items())]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", cwd=TOOLS)
        ultimas = [l for l in (r.stdout or "").strip().splitlines() if l.startswith("   ->")]
        print("%-20s %s" % (carpeta, ultimas[-1] if ultimas else ("ERROR " + (r.stderr or "")[:120])))
        if r.returncode:
            print("   fallo:", r.returncode, (r.stderr or "")[-200:])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
