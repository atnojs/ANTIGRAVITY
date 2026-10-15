import io, sys
sys.stdout.reconfigure(encoding='utf-8')
M = r'E:\ANTIGRAVITY\tools\memoria\errores.md'
TXT = """
### [2026-10-16] Mover una tarjeta de carpeta en el catálogo NO la mueve si el navegador ya la tenía

- **Síntoma:** se partió «Comida y moda» en «Comida» + «Moda» (25 códigos movidos en
  `CODE_FOLDER`) y en un navegador nuevo salían 24/27 en vez de 25/26; en un navegador con
  datos guardados, `moda=0`.
- **Causa:** dos capas pisaban el catálogo. (1) `normalizeTrickCategory` **respeta la carpeta
  guardada** si sigue existiendo (`if (cat && folderIds.includes(cat)) return item;`), que es
  lo correcto para no pisar al usuario, pero deja la tarjeta en la carpeta vieja para siempre.
  (2) La **capa publicada** (`catalogo.json`) llevaba `ig-dcek-561: { category: 'xl-comidamoda' }`
  y `applyPublishedCatalogue` la aplica **encima**, así que incluso en un navegador limpio
  devolvía esa tarjeta a la carpeta vieja.
- **Solución:** apuntar los códigos movidos en **`CATEGORY_MOVES`** (la tabla que ya existía
  para `/patternfill`): se mueven una vez y solo una. Y corregir la `category` de la entrada
  de la capa publicada.
- **Cómo comprobarlo:** `tools/trickvault/_banco/_migracion.html` con el banco: simula el
  navegador viejo (lista de carpetas sin la nueva, nombre viejo, esquema 5 y las tarjetas en
  la carpeta vieja) y tras recargar debe dar 25/26, 23 carpetas y los nombres nuevos.

### [2026-10-16] Al verificar «en producción» hay que mirar que la página pida la URL de producción

- **Síntoma:** tres pruebas etiquetadas como «producción» daban resultados distintos de las
  locales y me llevaron a buscar un fallo inexistente.
- **Causa:** esas páginas del banco llevaban `/app/index.html` **fijo** y ignoraban el parámetro
  `?base=/prod` (solo lo soportaban algunas). Estaban probando **local** con la etiqueta de
  producción.
- **Solución:** todas las páginas del banco leen `BASE` de la query. Se comprobó que el fallo
  real era otro: el commit aún no estaba desplegado (Hostinger tarda entre 1 y 20 minutos; si
  pasan más de 20, un commit vacío reempuja el webhook).
- **Cómo comprobarlo:** comparar el tamaño en bytes del `index.html` servido con
  `git cat-file -s HEAD:apps/trickvault/index.html` antes de sacar conclusiones.
"""
p = M
s = io.open(p, encoding='utf-8').read()
i = s.index('---\n') + 4
s = s[:i] + '\n' + TXT.strip() + '\n' + s[i:]
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('errores.md -> %d KB' % (len(s) // 1024))
