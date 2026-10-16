"""Verificacion FINAL en la web publica: las tarjetas nuevas cargan su imagen."""
import asyncio
import base64
import json
import subprocess
import sys
import time
import urllib.request

import websockets

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
PORT = 9346
PROFILE = r"E:\ANTIGRAVITY\tools\_ig2\_chromeprof_prod"
URL = "https://atnojs.es/apps/trickvault/"
ROOT = r"E:\ANTIGRAVITY\tools\trickvault"

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

CODIGOS = ["/product lava", "/product unveil", "/product cyberpunk", "/revealparts",
           "/relight", "/blisterpack", "/steamrise", "/scripttwistlowangleeditorialposter"]


def http_json(path):
    with urllib.request.urlopen("http://127.0.0.1:%d%s" % (PORT, path), timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


async def main():
    pags = [t for t in http_json("/json/list") if t.get("type") == "page"]
    fallos = []
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

        await cmd("Runtime.enable")
        await cmd("Page.enable")
        await cmd("Page.navigate", url=URL)
        await asyncio.sleep(16)
        print("url:", await js("location.href"))
        print("total:", await js("(document.body.innerText.match(/(\\d+)\\s+trucos/)||[])[1]"), "trucos")
        for code in CODIGOS:
            await js(JS_BUSCAR % json.dumps(code))
            await asyncio.sleep(1.6)
            res = await js("""(async () => {
              const im = document.querySelector('.trick-card img.trick-image');
              if (!im) return 'sin-imagen';
              if (im.naturalWidth > 0) return 'OK ' + im.naturalWidth + 'x' + im.naturalHeight + ' ' + im.currentSrc.split('/').pop();
              await new Promise(r => { im.onload = r; im.onerror = r; setTimeout(r, 8000); });
              return im.naturalWidth > 0 ? 'OK ' + im.naturalWidth + 'x' + im.naturalHeight + ' ' + im.currentSrc.split('/').pop() : 'NO CARGA';
            })()""")
            estado = "ok" if str(res).startswith("OK") else "FALLO"
            if estado == "FALLO":
                fallos.append((code, res))
            print("%-5s %-38s %s" % (estado, code, res))
        shot = await cmd("Page.captureScreenshot", format="png")
        with open("%s\\ev_produccion.png" % ROOT, "wb") as fh:
            fh.write(base64.b64decode(shot["result"]["data"]))
    print("FALLOS:", fallos)
    return 1 if fallos else 0


if __name__ == "__main__":
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
        raise SystemExit(asyncio.run(main()))
    finally:
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True, check=False)
