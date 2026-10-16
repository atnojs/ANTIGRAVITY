import re, sys
sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
CODES = ['/crosssection','/knolling','/magazinecover','/minime','/movieposter','/polaroid',
         '/statue','/timelineboard','/monogram','/yearbook90s']
s = open(APP, encoding='utf-8').read()
ini = s.index('Object.assign(SEED_COMMAND_IMAGES, {')
fin = s.index('\n});', ini)
lit = s[:ini]
quitados = 0
for c in CODES:
    pat = re.compile(r"\n?[ \t]*'%s':\s*'assets/[^']*'," % re.escape(c))
    while True:
        m = pat.search(s, ini, fin)
        if not m or pat.search(lit) is None:
            break
        s = s[:m.start()] + s[m.end():]
        fin -= (m.end() - m.start())
        quitados += 1
open(APP, 'w', encoding='utf-8', newline='').write(s)
print('entradas duplicadas quitadas: %d' % quitados)
s2 = open(APP, encoding='utf-8').read()
for c in CODES:
    m = re.search(r"'%s':\s*'([^']*)'" % re.escape(c), s2)
    print('  %-16s %s' % (c, m.group(1) if m else '?'))
