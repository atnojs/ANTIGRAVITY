import re, sys
sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
SELLO = '20261015-sujeto-unico-3'
CODES = ['/highkey', '/anglepack', '/softlighting', '/lowangle', '/tiltshift', '/bts', '/brightflat']
s = open(APP, encoding='utf-8').read()
n = 0
for c in CODES:
    pat = re.compile(r"('%s':\s*')(assets/[^'?]*)(\?v=[^']*)?(')" % re.escape(c))
    s, k = pat.subn(lambda m: "%s%s?v=%s%s" % (m.group(1), m.group(2), SELLO, m.group(4)), s)
    n += k
s = re.sub(r"(\{ category: 'xl-luzcamara',[^}]*version: ')[^']*(' \})", r"\g<1>%s\g<2>" % SELLO, s)
open(APP, 'w', encoding='utf-8', newline='').write(s)
print('codigos marcados con %s: %d' % (SELLO, n))
for c in CODES:
    m = re.search(r"'%s':\s*'(assets/[^']*)'" % re.escape(c), s)
    print('   %-14s %s' % (c, m.group(1) if m else '?'))
print('release xl-luzcamara:', re.search(r"category: 'xl-luzcamara'[^}]*version: '([^']*)'", s).group(1))
