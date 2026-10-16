import re, sys
sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
SELLO = '20261016-carteles-zorro'
CODES = ['/crosssection','/knolling','/magazinecover','/minime','/movieposter','/polaroid',
         '/statue','/timelineboard','/monogram','/yearbook90s']
s = open(APP, encoding='utf-8').read()
n = 0
for c in CODES:
    pat = re.compile(r"('%s':\s*')(assets/[^'?]*)(\?v=[^']*)?(')" % re.escape(c))
    s, k = pat.subn(lambda m: "%s%s?v=%s%s" % (m.group(1), m.group(2), SELLO, m.group(4)), s)
    n += k
s = re.sub(r"(\{ category: 'xl-carteles',[^}]*version: ')[^']*(' \})", r"\g<1>%s\g<2>" % SELLO, s)
open(APP, 'w', encoding='utf-8', newline='').write(s)
print('codigos marcados: %d de %d' % (n, len(CODES)))
print('release xl-carteles ->', re.search(r"category: 'xl-carteles'[^}]*version: '([^']*)'", s).group(1))
