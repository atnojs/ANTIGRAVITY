# -*- coding: utf-8 -*-
"""
Genera el banco del caso «navegador que YA tenia las tarjetas guardadas»
(tools/trickvault/_banco/_ya_guardadas.html).

Hace lo mismo que el navegador de Antonio:
  1. carga la app (se crean las tarjetas),
  2. ENSucia a proposito la imagen de cada tarjeta con la que tiene el ALMACEN
     del servidor para su id (las contaminadas de verdad),
  3. borra las marcas de version y recarga,
  4. comprueba que todas vuelven a su ejemplo del repositorio.
"""
import importlib.util, json, os, sys

sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault'
BANCO = os.path.join(T, '_banco')
spec = importlib.util.spec_from_file_location('cl', os.path.join(T, '_carpeta_lote.py'))
cl = importlib.util.module_from_spec(spec); spec.loader.exec_module(cl)

esperado = {c: str(r) for c, r in cl.SEED_IMAGES.items() if str(r).startswith('assets/')}
store = json.load(open(os.path.join(BANCO, 'image_store_list.json'), encoding='utf-8'))['images']
print('codigos con ejemplo: %d | entradas del almacen: %d' % (len(esperado), len(store)))

HTML = '''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>midiendo</title>
<style>html,body{margin:0;background:#05070c;color:#cfe}iframe{border:0;width:1200px;height:700px}
pre{position:fixed;left:0;bottom:0;width:100%%;max-height:60%%;overflow:auto;background:#000d;color:#9fe;font-size:12px}</style>
</head><body>
<iframe id="f" src="/app/index.html"></iframe>
<pre id="out">midiendo...</pre>
<script>
const ESPERADO = %(esperado)s;
const ALMACEN = %(almacen)s;
const VARIANTES = [['mu7fpvmx114wfqvaw', '/expressionsheet'], ['tv-glassart-optical', '/glassart']];
const BASE = new URLSearchParams(location.search).get('base') || '/app';
const f = document.getElementById('f'), out = document.getElementById('out');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const limpiar = u => String(u || '').split('?')[0];
function cargar(u) { return new Promise(res => { f.onload = res; f.src = u; setTimeout(res, 20000); }); }

(async () => {
  const fallos = [], ok = [], sinEjemplo = [], propias = [];
  let ensuciadas = 0, conAlmacen = 0;
  try {
    await cargar(BASE + '/index.html?' + Date.now());
    await sleep(12000);
    const win = f.contentWindow;
    const ls = win.localStorage;
    const datos = JSON.parse(ls.getItem('trickvault_data') || '[]');
    // 1) ensuciar: a cada tarjeta, la imagen que el almacen tiene para su id
    for (const t of datos) {
      const delAlmacen = ALMACEN[String(t.id)];
      if (delAlmacen) { t.imageUrl = delAlmacen; conAlmacen++; }
      else if (ESPERADO[t.codeSnippet]) { t.imageUrl = 'uploads/example_' + t.id + '_sucio.webp'; }
      else continue;
      t.ownImage = false;
      t.imageFromLayer = false;
      ensuciadas++;
    }
    ls.setItem('trickvault_data', JSON.stringify(datos));
    Object.keys(ls).filter(k => k.indexOf('trickvault-') === 0 && k.indexOf('images-version') > 0)
      .forEach(k => ls.removeItem(k));
    // 2) recargar (como cuando Antonio abre la app)
    await cargar(BASE + '/index.html?r=' + Date.now());
    await sleep(14000);
    const despues = JSON.parse(f.contentWindow.localStorage.getItem('trickvault_data') || '[]');
    for (const t of despues) {
      const code = String(t.codeSnippet || '').trim();
      const img = limpiar(t.imageUrl);
      const esperada = ESPERADO[code];
      if (!esperada) { sinEjemplo.push(code); continue; }
      if (t.ownImage || img.startsWith('data:')) { propias.push(code); continue; }
      if (VARIANTES.some(v => v[0] === String(t.id) || v[1] === code)) { propias.push(code); continue; }
      if (img === esperada.split('?')[0]) ok.push(code);
      else fallos.push({ id: t.id, code, guarda: img, deberia: esperada });
    }
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
      ensuciadas, con_imagen_del_almacen: conAlmacen, ok: ok.length, fallos,
      sinEjemplo: [...new Set(sinEjemplo)].length, propias: propias.length,
      ficheros_que_no_cargan: malas
    }, null, 1);
    document.title = 'ENSUCIADAS=' + ensuciadas + ' OK=' + ok.length + ' FALLOS=' + fallos.length
      + ' SIN_EJEMPLO=' + new Set(sinEjemplo).size + ' PROPIAS=' + propias.length + ' NO_CARGAN=' + malas.length;
  } catch (e) {
    out.textContent = 'ERROR ' + (e && e.message || e);
    document.title = 'ERROR';
  }
})();
</script>
</body></html>
''' % {'esperado': json.dumps(esperado, ensure_ascii=False), 'almacen': json.dumps(store, ensure_ascii=False)}

open(os.path.join(BANCO, '_ya_guardadas.html'), 'w', encoding='utf-8').write(HTML)
print('escrito', os.path.join(BANCO, '_ya_guardadas.html'))
