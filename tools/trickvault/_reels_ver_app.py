# -*- coding: utf-8 -*-
"""Verificacion obligatoria: tarjetas YA GUARDADAS sin imagen recuperan su ejemplo.

Simula el caso real (localStorage con las tarjetas guardadas):
  - a la mitad de los 267 codigos se les vacia imageUrl,
  - a la otra mitad se les pone una imagen generada ANTIGUA (otra tanda),
  - se borran las claves de release (<carpeta>-images-version),
  - se recarga la app,
y se comprueba que TODAS acaban con su assets/...jpg y que los ficheros cargan
de verdad (naturalWidth > 0).
"""
import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.request

import websockets

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9342
PROFILE = r"E:\ANTIGRAVITY\tools\_ig2\_chromeprof_img"
APP = r"E:\ANTIGRAVITY\apps\trickvault"
URL = "http://127.0.0.1:8770/index.html"
TOOLS = r"E:\ANTIGRAVITY\tools\trickvault"
LOG = open(os.path.join(TOOLS, "_reels_verificacion.txt"), "w", encoding="utf-8")
sys.path.insert(0, TOOLS)
import _reels_lote as R  # noqa: E402


def out(*a):
    txt = " ".join(str(x) for x in a)
    LOG.write(txt + "\n")
    LOG.flush()
    print(txt.encode("ascii", "replace").decode("ascii"))


def http_json(path):
    with urllib.request.urlopen("http://127.0.0.1:%d%s" % (PORT, path), timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


JS_PREPARAR = """
(() => {
  const KEY = 'trickvault_data';
  const codes = %s;
  const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
  let n = 0, tocadas = 0;
  const arr2 = arr.map(t => {
    if (codes.indexOf(t.codeSnippet) >= 0) {
      tocadas++;
      t.imageUrl = (n++ %% 2 === 0) ? '' : 'assets/xl-efectosempaque/lava.jpg';
      t.updatedAt = 0;
    }
    return t;
  });
  localStorage.setItem(KEY, JSON.stringify(arr2));
  let claves = 0;
  Object.keys(localStorage).filter(k => k.indexOf('-images-version') >= 0).forEach(k => { localStorage.removeItem(k); claves++; });
  return JSON.stringify({tarjetas: arr.length, tocadas: tocadas, claves_borradas: claves});
})()
"""

JS_COMPROBAR = """
(async () => {
  const KEY = 'trickvault_data';
  const codes = %s;
  const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
  const porCodigo = {};
  arr.forEach(t => { if (codes.indexOf(t.codeSnippet) >= 0) porCodigo[t.codeSnippet] = t.imageUrl || ''; });
  const sinTarjeta = [], sinRuta = [], noCarga = [];
  await Promise.all(codes.map(c => new Promise(res => {
    const img = porCodigo[c];
    if (img === undefined) { sinTarjeta.push(c); return res(); }
    if (!img.startsWith('assets/')) { sinRuta.push(c + ' -> ' + (img || '(vacia)')); return res(); }
    const im = new Image();
    im.onload = () => { if (!im.naturalWidth) noCarga.push(c); res(); };
    im.onerror = () => { noCarga.push(c); res(); };
    im.src = img + '?cb=' + Math.random();
  })));
  return JSON.stringify({total: codes.length, sinTarjeta: sinTarjeta, sinRuta: sinRuta, noCarga: noCarga});
})()
"""


async def main():
    pags = [t for t in http_json("/json/list") if t.get("type") == "page"]
    async with websockets.connect(pags[0]["webSocketDebuggerUrl"], max_size=200 * 1024 * 1024) as ws:
        n = 0

        async def cmd(method, **params):
            nonlocal n
            n += 1
            mid = n
            await ws.send(json.dumps({"id": mid, "method": method, "params": params}))
            while True:
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=180))
                if msg.get("id") == mid:
                    return msg

        async def js(expr, esperar=True):
            r = await cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=esperar)
            res = r.get("result", {})
            if res.get("exceptionDetails"):
                return "EXC:" + str(res["exceptionDetails"])[:300]
            return res.get("result", {}).get("value")

        codes_js = json.dumps(R.REEL)
        await cmd("Runtime.enable")
        await cmd("Page.enable")
        await cmd("Page.navigate", url=URL)
        await asyncio.sleep(14)
        out("carga inicial ->", await js("(document.body.innerText.match(/(\\d+)\\s+trucos/)||[])[1]"), "trucos")
        out("preparar estado guardado ->", await js(JS_PREPARAR % codes_js))
        await cmd("Page.reload")
        await asyncio.sleep(15)
        res = await js(JS_COMPROBAR % codes_js)
        try:
            d = json.loads(res)
        except Exception:
            out("respuesta inesperada:", str(res)[:400])
            return 1
        out("RESULTADO: total=%d  sin tarjeta=%d  sin ruta assets=%d  no cargan=%d" % (
            d["total"], len(d["sinTarjeta"]), len(d["sinRuta"]), len(d["noCarga"])))
        for k in ("sinTarjeta", "sinRuta", "noCarga"):
            if d[k]:
                out("  %s: %s" % (k, d[k][:15]))
        return 0 if not (d["sinTarjeta"] or d["sinRuta"] or d["noCarga"]) else 1


if __name__ == "__main__":
    servidor = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8770", "--bind", "127.0.0.1", "--directory", APP],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    proc = subprocess.Popen([
        CHROME, "--headless=new", "--remote-debugging-port=%d" % PORT,
        "--remote-allow-origins=*", "--user-data-dir=" + PROFILE,
        "--no-first-run", "--no-default-browser-check", "--disable-gpu",
        "--hide-scrollbars", "--window-size=1400,1800", "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            http_json("/json/version")
            break
        except Exception:  # noqa: BLE001
            time.sleep(0.5)
    try:
        raise SystemExit(asyncio.run(main()))
    finally:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True, check=False)
        servidor.terminate()
