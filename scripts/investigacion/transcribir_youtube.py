#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Descarga los subtítulos de un vídeo de YouTube y los convierte en texto legible.

Uso:
    python transcribir_youtube.py "<url>" [--out CARPETA] [--lang es,es-orig,en]

Salida:
    <carpeta>/<id>.txt  con la transcripción limpia (una línea cada 180 caracteres)
    y por stdout la ruta y el número de caracteres.

El VTT original se conserva junto al .txt. No descarga el vídeo ni lo ejecuta.
"""
from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

KNOWN_YTDLP = r"C:\Users\atnojs\AppData\Local\hermes\hermes-agent\venv\Scripts\yt-dlp.exe"


def find_ytdlp() -> str:
    env = os.environ.get("YTDLP_PATH")
    if env and Path(env).is_file():
        return env
    if Path(KNOWN_YTDLP).is_file():
        return KNOWN_YTDLP
    found = shutil.which("yt-dlp") or shutil.which("yt-dlp.exe")
    if found:
        return found
    print("ERROR: no encuentro yt-dlp. Define YTDLP_PATH.", file=sys.stderr)
    sys.exit(2)


def clean_vtt(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")
    lines: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or "-->" in line:
            continue
        if line.upper().startswith(("WEBVTT", "KIND:", "LANGUAGE:")):
            continue
        line = re.sub(r"<[^>]+>", "", line)
        line = re.sub(r"&nbsp;?", " ", line).strip()
        if line and (not lines or lines[-1] != line):
            lines.append(line)
    return " ".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Transcribe un vídeo de YouTube a texto.")
    ap.add_argument("url")
    ap.add_argument("--out", default=None, help="carpeta de salida (por defecto E:\\tmp\\transcripciones)")
    ap.add_argument("--lang", default="es,es-orig,en", help="idiomas de subtítulos, separados por comas")
    args = ap.parse_args()

    out = Path(args.out) if args.out else Path(r"E:\tmp\transcripciones")
    out.mkdir(parents=True, exist_ok=True)

    cmd = [find_ytdlp(), "--skip-download", "--write-auto-subs", "--write-subs",
           "--sub-lang", args.lang, "--sub-format", "vtt", "--no-warnings",
           "-o", str(out / "%(id)s"), args.url]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")

    vtts = sorted(out.glob("*.vtt"), key=lambda p: p.stat().st_mtime, reverse=True)
    if proc.returncode != 0 and not vtts:
        tail = (proc.stderr or proc.stdout or "").strip().splitlines()[-3:]
        print("ERROR yt-dlp: " + " | ".join(tail), file=sys.stderr)
        return 2
    if not vtts:
        print("SIN SUBTITULOS: el vídeo no ofrece subtítulos descargables.", file=sys.stderr)
        return 3

    def score(p: Path) -> int:
        name = p.name.lower()
        for i, tag in enumerate(("es-orig", "es.", "en.")):
            if tag in name:
                return i
        return 9

    vtt = sorted(vtts, key=score)[0]
    text = clean_vtt(vtt)
    if not text:
        print("SIN TEXTO: los subtítulos llegaron vacíos.", file=sys.stderr)
        return 3

    txt = vtt.with_suffix(".txt")
    txt.write_text("\n".join(textwrap.wrap(text, 180)), encoding="utf-8")
    print(str(txt))
    print("chars: %d | idioma: %s" % (len(text), vtt.name))
    return 0


if __name__ == "__main__":
    sys.exit(main())
