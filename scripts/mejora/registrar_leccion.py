#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Registra una lección con evidencia en la biblioteca de experiencia.

Uso:
    python registrar_leccion.py --titulo "..." --ambito general \
        --fallo "..." --causa "..." --regla "..." --evidencia "..." --aplica "..."

Añade la entrada al principio de tools/memoria/experiencia.md, debajo de la cabecera.
Si ya existe una entrada con el mismo título, no duplica: avisa y sale con 0.
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DESTINO = ROOT / "tools" / "memoria" / "experiencia.md"

CABECERA = """# Experiencia acumulada

Lecciones con evidencia, reutilizables. Una entrada por lección; si se repite, se amplía.
Formato y reglas: `skills/SKILL_MEJORA_CONTINUA.md`. No escribas credenciales ni rutas privadas.

---
"""


def limpiar(texto: str) -> str:
    return " ".join(str(texto).split()).strip()


def main() -> int:
    ap = argparse.ArgumentParser(description="Añade una lección a la biblioteca de experiencia.")
    ap.add_argument("--titulo", required=True)
    ap.add_argument("--ambito", default="general", help="general | proyecto | herramienta")
    ap.add_argument("--fallo", required=True)
    ap.add_argument("--causa", default="")
    ap.add_argument("--regla", required=True)
    ap.add_argument("--evidencia", required=True)
    ap.add_argument("--aplica", default="")
    ap.add_argument("--fecha", default=None, help="AAAA-MM-DD (por defecto hoy)")
    ap.add_argument("--archivo", default=str(DESTINO))
    args = ap.parse_args()

    titulo = limpiar(args.titulo)
    if not titulo or not limpiar(args.fallo) or not limpiar(args.regla) or not limpiar(args.evidencia):
        print("ERROR: título, fallo, regla y evidencia son obligatorios.", file=sys.stderr)
        return 2

    fecha = args.fecha or dt.date.today().isoformat()
    destino = Path(args.archivo)
    destino.parent.mkdir(parents=True, exist_ok=True)
    if not destino.is_file():
        destino.write_text(CABECERA, encoding="utf-8")

    actual = destino.read_text(encoding="utf-8")
    if ("— " + titulo) in actual or ("# " + titulo) in actual:
        print("YA EXISTE: %s (no se duplica)" % titulo)
        return 0

    entrada = [
        "### %s — %s" % (fecha, titulo),
        "- **Ámbito:** %s" % limpiar(args.ambito),
        "- **Fallo:** %s" % limpiar(args.fallo),
    ]
    if limpiar(args.causa):
        entrada.append("- **Causa:** %s" % limpiar(args.causa))
    entrada += [
        "- **Regla:** %s" % limpiar(args.regla),
        "- **Evidencia:** %s" % limpiar(args.evidencia),
    ]
    if limpiar(args.aplica):
        entrada.append("- **Cuándo aplica:** %s" % limpiar(args.aplica))
    bloque = "\n".join(entrada) + "\n\n"

    # Insertar justo después de la cabecera (primer '---').
    marca = actual.find("\n---\n")
    if marca == -1:
        nuevo = actual.rstrip() + "\n\n" + bloque
    else:
        corte = marca + len("\n---\n")
        nuevo = actual[:corte] + "\n" + bloque + actual[corte:].lstrip("\n")

    destino.write_text(nuevo, encoding="utf-8")
    print(str(destino))
    print("ok: %s" % titulo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
