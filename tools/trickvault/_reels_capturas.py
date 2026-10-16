"""Capturas de evidencia: las tarjetas nuevas ya con su imagen en la app."""
import asyncio
import base64
import json
import subprocess
import sys
import time
import urllib.request

import websockets

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9344
PROFILE = r"E:\ANTIGRAVITY\tools\_ig2\_chromeprof_img2"
APP = r"E:\ANTIGRAVITY\apps\trickvault"
ROOT = r"E:\ANTIGRAVITY\tools\trickvault"
URL = "http://127.0.0.1:8772/index.html"

JS_BUSCAR = """
(() => {
  const input = document.querySelector('input[placeholder*="Buscar c"]');
  if (!input) return 'sin-campo';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, %s);
  input.dispatchEvent(new Event('input', {bubbles: true}));
  return 'ok';
})()
"""


def http_json(path):
    with urllib.request.urlopen("http://127.0.0.1:%d%s" % (PORT, path), timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


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

        async def js(expr):
            r = await cmd("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
            return r.get("result", {}).get("result", {}).get("value")

        async def shot(nombre, recorte=None):
            s = await cmd("Page.captureScreenshot", format="png")
            with open("%s\\%s" % (ROOT, nombre), "wb") as fh:
                fh.write(base64.b64decode(s["result"]["data"]))
            print("captura:", nombre)

        await cmd("Runtime.enable")
        await cmd("Page.enable")
        await cmd("Page.navigate", url=URL)
        await asyncio.sleep(14)
        print("total:", await js("(document.body.innerText.match(/(\\d+)\\s+trucos/)||[])[1]"))

        # 1) una tarjeta nueva con su imagen
        await js(JS_BUSCAR % json.dumps("/product lava"))
        await asyncio.sleep(2.5)
        print("imagenes cargadas en la tarjeta:", await js("Array.from(document.images).filter(i=>i.naturalWidth>0).length"))
        await shot("ev_tarjeta_con_imagen.png")

        # 2) rejilla de una carpeta con muchas nuevas
        await js("(() => { const i=document.querySelector('input[placeholder*=\"Buscar c\"]'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,''); i.dispatchEvent(new Event('input',{bubbles:true})); return 'ok'; })()")
        await asyncio.sleep(1.2)
        await js(JS_BUSCAR % json.dumps("/product "))
        await asyncio.sleep(4.5)
        print("tarjetas con '/product':", await js("document.querySelectorAll('.trick-card').length"))
        print("imagenes de tarjeta cargadas:", await js(
            "Array.from(document.images).filter(i=>i.naturalWidth>0 && i.className.indexOf('trick-image')>=0).length"))
        await shot("ev_rejilla_con_imagenes.png")


if __name__ == "__main__":
    servidor = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8772", "--bind", "127.0.0.1", "--directory", APP],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    proc = subprocess.Popen([
        CHROME, "--headless=new", "--remote-debugging-port=%d" % PORT,
        "--remote-allow-origins=*", "--user-data-dir=" + PROFILE,
        "--no-first-run", "--no-default-browser-check", "--disable-gpu",
        "--hide-scrollbars", "--window-size=1440,1900", "about:blank",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            http_json("/json/version")
            break
        except Exception:  # noqa: BLE001
            time.sleep(0.5)
    try:
        asyncio.run(main())
    finally:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True, check=False)
        servidor.terminate()
