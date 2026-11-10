#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Captura inicial de una app para replicarla: pantallas, HTML y elementos.

Uso:
    python captura_inicial.py <url> [--out CARPETA] [--widths 390,820,1440]

Genera en la carpeta de salida:
    <ancho>.png      captura de página completa por ancho
    <ancho>.html     HTML renderizado (no el fuente)
    pagina.json      título, textos visibles, enlaces, botones, inputs y formularios
    red.json         peticiones XHR/fetch observadas (método, URL, estado)

Es solo observación: no rellena formularios, no envía datos y no toca el login.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright


def texto_limpio(t: str) -> str:
    return re.sub(r"\s+", " ", t or "").strip()


def main() -> int:
    ap = argparse.ArgumentParser(description="Captura una app para replicarla.")
    ap.add_argument("url")
    ap.add_argument("--out", default=None)
    ap.add_argument("--widths", default="390,820,1440")
    args = ap.parse_args()

    anchos = [int(w) for w in args.widths.split(",") if w.strip().isdigit()]
    out = Path(args.out) if args.out else Path(r"E:\tmp\replicar") / re.sub(r"\W+", "_", args.url)[:60]
    out.mkdir(parents=True, exist_ok=True)

    red = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        ctx = b.new_context(locale="es-ES", user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36"))
        page = ctx.new_page()

        def on_response(r):
            try:
                if r.request.resource_type in ("xhr", "fetch"):
                    red.append({"metodo": r.request.method, "url": r.url,
                                "estado": r.status, "tipo": r.headers.get("content-type", "")})
            except Exception:
                pass

        page.on("response", on_response)

        for ancho in anchos:
            page.set_viewport_size({"width": ancho, "height": 900})
            page.goto(args.url, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(1200)
            page.screenshot(path=str(out / f"{ancho}.png"), full_page=True)
            (out / f"{ancho}.html").write_text(page.content(), encoding="utf-8")

        if anchos:
            page.set_viewport_size({"width": max(anchos), "height": 900})
            page.goto(args.url, wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(800)

        datos = page.evaluate("""() => {
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            const txt = (e) => (e.innerText || e.textContent || '').trim().replace(/\\s+/g, ' ');
            const q = (sel, f) => [...document.querySelectorAll(sel)].filter(vis).map(f).filter(Boolean).slice(0, 80);
            return {
                titulo: document.title,
                url: location.href,
                textos: [...new Set([...document.querySelectorAll('h1,h2,h3,p,li,span,label')]
                    .filter(vis).map(txt).filter(t => t.length > 2))].slice(0, 200),
                enlaces: q('a[href]', a => ({texto: txt(a).slice(0, 60), href: a.href})),
                botones: q('button, [role=button]', b => ({texto: txt(b).slice(0, 60),
                    aria: b.getAttribute('aria-label') || ''})),
                campos: q('input, textarea, select', i => ({tag: i.tagName.toLowerCase(),
                    tipo: i.type || '', nombre: i.name || '', placeholder: i.placeholder || '',
                    aria: i.getAttribute('aria-label') || ''})),
                formularios: q('form', f => ({accion: f.action, metodo: f.method})),
                imagenes: q('img', i => ({alt: i.alt || '', src: i.currentSrc || i.src})).slice(0, 60)
            };
        }""")

        (out / "pagina.json").write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
        (out / "red.json").write_text(json.dumps(red[:200], ensure_ascii=False, indent=2), encoding="utf-8")
        b.close()

    print(str(out))
    print("capturas: %d | textos: %d | enlaces: %d | botones: %d | campos: %d | red: %d" % (
        len(anchos), len(datos["textos"]), len(datos["enlaces"]),
        len(datos["botones"]), len(datos["campos"]), len(red)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
