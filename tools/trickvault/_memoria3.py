import io, sys
sys.stdout.reconfigure(encoding='utf-8')
M = r'E:\ANTIGRAVITY\tools\memoria\errores.md'
TXT = """
### [2026-10-16] La capa publicada también manda la CARPETA, y va por id: sacaba 5 tarjetas de «Carteles»

- **Síntoma:** tras regenerar las 10 tarjetas de `xl-carteles` con el zorro, la carpeta
  enseñaba **44** en vez de 49. Faltaban `/banner`, `/crosssection`, `/invitation`,
  `/museumplaque` y `/securitycam`.
- **Causa:** la capa publicada (`catalogo.json`) guarda `category` por **id**, y esos ids
  hoy son otras tarjetas: `ig-dcek-373: { category: 'xl-negocioredes' }` se aplicaba sobre
  `/banner` (de Carteles) y la sacaba de su carpeta. Igual con 376, 540, 570 y 004 (esta
  última apuntaba a una carpeta de otro navegador, `f_mv…`). `applyPublishedCatalogue`
  aplica la capa **encima** del catálogo, así que ganaba la entrada vieja.
- **Solución:** `tools/trickvault/_limpiar_capa_categorias.py`: para cada entrada con
  `category`, compara con la carpeta que el catálogo da hoy a ese id y **quita el campo**
  si no coincide (manda el catálogo). Quitó 9; respetó la única correcta
  (`ig-dcek-561` → `xl-moda`).
- **Regla que se repite:** todo lo que la app guarda **por id** (tarjetas, imágenes de la
  capa, categorías de la capa) envejece mal porque los ids son posicionales. Al tocar
  carpetas o renumerar, revisa `catalogo.json` además del HTML.
- **Cómo comprobarlo:** `tools/trickvault/_banco/_carpetas.html` con el banco: debe dar
  `carteles=49`, `moda=25`, `comida=26` y ninguna categoría huérfana.
"""
s = io.open(M, encoding='utf-8').read()
i = s.index('---\n') + 4
s = s[:i] + '\n' + TXT.strip() + '\n' + s[i:]
io.open(M, 'w', encoding='utf-8', newline='\n').write(s)
print('errores.md -> %d KB' % (len(s) // 1024))
