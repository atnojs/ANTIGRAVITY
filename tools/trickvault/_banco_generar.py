# -*- coding: utf-8 -*-
"""
Genera el banco de pruebas definitivo (tools/trickvault/_banco/index.html).

Comprueba, tarjeta por tarjeta, los DATOS que guarda la app despues de cargar
(con el almacen contaminado de verdad servido por _banco_server.py):

  * toda tarjeta de CATALOGO (id ig-dcek-*/xl-cmd-*/cap-cmd-*) cuyo codigo tenga
    ejemplo en el repositorio debe quedarse con ESA imagen (assets/...);
  * y ese fichero debe cargar de verdad (naturalWidth > 0).

Las tarjetas propias (id que no es de catalogo) y las variantes personales se
respetan: no se comprueban.
"""
import importlib.util, json, os, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
BANCO = os.path.join(T, '_banco')
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

esperado = {c: str(r) for c, r in cl.SEED_IMAGES.items() if str(r).startswith('assets/')}
print('codigos con ejemplo en el repositorio: %d' % len(esperado))

HTML = '''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>midiendo</title>
<style>html,body{margin:0;background:#05070c;color:#cfe}iframe{border:0;width:1200px;height:700px}
pre{position:fixed;left:0;bottom:0;width:100%%;max-height:60%%;overflow:auto;background:#000d;color:#9fe;font-size:12px}</style>
</head><body>
<iframe id="f" src="/app/index.html"></iframe>
<pre id="out">midiendo...</pre>
<script>
const ESPERADO = %(esperado)s;
// Variantes personales: tienen su propia imagen a proposito, no se comprueban.
const VARIANTES = [['mu7fpvmx114wfqvaw', '/expressionsheet'], ['tv-glassart-optical', '/glassart']];
const BASE = new URLSearchParams(location.search).get('base') || '/app';
const f = document.getElementById('f'), out = document.getElementById('out');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const limpiar = u => String(u || '').split('?')[0];
function cargar(u) { return new Promise(res => { f.onload = res; f.src = u; setTimeout(res, 20000); }); }

(async () => {
  const fallos = [], ok = [], sinEjemplo = [], propias = [];
  try {
    await cargar(BASE + '/index.html?' + Date.now());
    await sleep(12000);
    const win = f.contentWindow;
    const datos = JSON.parse(win.localStorage.getItem('trickvault_data') || '[]');
    for (const t of datos) {
      const code = String(t.codeSnippet || '').trim();
      const img = limpiar(t.imageUrl);
      const esperada = ESPERADO[code];
      if (!esperada) { sinEjemplo.push(code); continue; }
      // Tu imagen (propia o ya subida) y las variantes personales mandan: no se tocan.
      if (t.ownImage || img.startsWith('data:')) { propias.push(code); continue; }
      if (VARIANTES.some(v => v[0] === String(t.id) || v[1] === code)) { propias.push(code); continue; }
      if (img === esperada.split('?')[0]) ok.push(code);
      else fallos.push({ id: t.id, code, guarda: img, deberia: esperada });
    }
    // que los ficheros carguen de verdad
    const urls = [...new Set(ok.map(c => ESPERADO[c].split('?')[0]))];
    const malas = [];
    for (const u of urls) {
      const bien = await new Promise(res => {
        const im = new Image();
        im.onload = () => res(im.naturalWidth > 0);
        im.onerror = () => res(false);
        im.src = BASE + '/' + u;
      });
      if (!bien) malas.push(u);
    }
    out.textContent = JSON.stringify({
      tarjetas: datos.length, ok: ok.length, fallos, sinEjemplo: [...new Set(sinEjemplo)],
      propias: propias.length, ficheros_que_no_cargan: malas
    }, null, 1);
    document.title = 'OK=' + ok.length + ' FALLOS=' + fallos.length + ' SIN_EJEMPLO=' + new Set(sinEjemplo).size
      + ' PROPIAS=' + propias.length + ' NO_CARGAN=' + malas.length;
  } catch (e) {
    out.textContent = 'ERROR ' + (e && e.message || e);
    document.title = 'ERROR';
  }
})();
</script>
</body></html>
''' % {'esperado': json.dumps(esperado, ensure_ascii=False)}

os.makedirs(BANCO, exist_ok=True)
open(os.path.join(BANCO, 'index.html'), 'w', encoding='utf-8').write(HTML)
print('escrito', os.path.join(BANCO, 'index.html'))
