import re, sys
sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
s = open(APP, encoding='utf-8').read()
# el ?v= de estas dos tiene que ser distinto del lote anterior para que un
# navegador que ya aplico aquel release vuelva a pedirlas
for code in ('/teardown', '/4K'):
    s = re.sub(r"('%s':\s*'assets/[^'?]*)\?v=[^']*'" % re.escape(code), r"\1?v=20261015-sujeto-unico-2'", s)
for carpeta in ('xl-carteles', 'xl-estilos'):
    s = re.sub(r"(\{ category: '%s',[^}]*version: ')[^']*(' \})" % re.escape(carpeta),
               r"\g<1>20261015-sujeto-unico-2\g<2>", s)
open(APP, 'w', encoding='utf-8', newline='').write(s)
for code in ('/teardown', '/4K'):
    m = re.search(r"'%s':\s*'([^']*)'" % re.escape(code), s)
    print('  %-12s %s' % (code, m.group(1) if m else '?'))
print('  releases con -2:', len(re.findall(r"version: '20261015-sujeto-unico-2'", s)))
