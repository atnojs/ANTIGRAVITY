import re, sys
sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
SELLO = '20261016-pixelart-es'
s = open(APP, encoding='utf-8').read()
pat = re.compile(r"('/pixelart':\s*')(assets/[^'?]*)(\?v=[^']*)?(')")
s, k = pat.subn(lambda m: "%s%s?v=%s%s" % (m.group(1), m.group(2), SELLO, m.group(4)), s)
s = re.sub(r"(\{ category: 'xl-carteles',[^}]*version: ')[^']*(' \})", r"\g<1>%s\g<2>" % SELLO, s)
open(APP, 'w', encoding='utf-8', newline='').write(s)
print('marcas puestas: %d' % k)
print('  /pixelart ->', re.search(r"'/pixelart':\s*'([^']*)'", s).group(1))
print('  release xl-carteles ->', re.search(r"category: 'xl-carteles'[^}]*version: '([^']*)'", s).group(1))
