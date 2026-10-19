# -*- coding: utf-8 -*-
"""Escribe los sujetos de las 16 tarjetas nuevas en _sujetos_<carpeta>.json.

Respeta lo que ya hubiera: solo anade/actualiza las entradas reel2-cmd-NNN.
Sujeto unico por carpeta; las excepciones (pareja/persona) se justifican:
  - xl-camararetrato: los 5 codigos son de pareja -> "a young couple in love".
  - xl-otromundo: los 3 de personajes piden una persona -> "a young woman with
    curly dark hair" (el resto de la carpeta sigue con la camper van).
"""
import io
import json
import os

TOOLS = r"E:\ANTIGRAVITY\tools\trickvault"

SUBJECT_BY_FOLDER = {
    "xl-letras3d": {
        "reel2-cmd-001": "a vintage film camera",
    },
    "xl-otromundo": {
        "reel2-cmd-002": "a classic camper van",
        "reel2-cmd-013": "a young woman with curly dark hair",
        "reel2-cmd-014": "a young woman with curly dark hair",
        "reel2-cmd-015": "a young woman with curly dark hair",
    },
    "xl-efectosempaque": {
        "reel2-cmd-003": "a glass bottle of artisanal olive oil",
    },
    "xl-camararetrato": {
        "reel2-cmd-004": "a young couple in love",
        "reel2-cmd-005": "a young couple in love",
        "reel2-cmd-006": "a young couple in love",
        "reel2-cmd-007": "a young couple in love",
        "reel2-cmd-008": "a young couple in love",
    },
    "xl-fotoproducto": {
        "reel2-cmd-009": "a glass bottle of artisanal olive oil",
        "reel2-cmd-010": "a glass bottle of artisanal olive oil",
        "reel2-cmd-011": "a glass bottle of artisanal olive oil",
    },
    "xl-escenaprueba": {
        "reel2-cmd-012": "a handcrafted leather backpack",
    },
    "xl-moda": {
        "reel2-cmd-016": "a young woman with curly dark hair",
    },
}

EXCEPCIONES = {
    "xl-camararetrato": ["reel2-cmd-004", "reel2-cmd-005", "reel2-cmd-006",
                         "reel2-cmd-007", "reel2-cmd-008"],
    "xl-otromundo": ["reel2-cmd-013", "reel2-cmd-014", "reel2-cmd-015"],
}

for carpeta, entradas in SUBJECT_BY_FOLDER.items():
    f = os.path.join(TOOLS, "_sujetos_%s.json" % carpeta)
    datos = json.load(io.open(f, encoding="utf-8")) if os.path.exists(f) else {}
    datos.update(entradas)
    json.dump(datos, io.open(f, "w", encoding="utf-8", newline="\n"),
              ensure_ascii=False, indent=1)
    print("%-20s +%d sujetos (total %d)" % (carpeta, len(entradas), len(datos)))

for carpeta, ids in EXCEPCIONES.items():
    f = os.path.join(TOOLS, "_excepciones_%s.json" % carpeta)
    datos = json.load(io.open(f, encoding="utf-8")) if os.path.exists(f) else {}
    for i in ids:
        datos[i] = SUBJECT_BY_FOLDER[carpeta][i]
    json.dump(datos, io.open(f, "w", encoding="utf-8", newline="\n"),
              ensure_ascii=False, indent=1)
    print("%-20s excepciones documentadas: %d" % (carpeta, len(datos)))
