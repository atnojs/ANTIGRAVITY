import io, re, sys
sys.stdout.reconfigure(encoding='utf-8')
T = r'E:\ANTIGRAVITY\tools\trickvault\_banco'
for f in ('_moda.html', '_migracion.html', '_fantasmas.html'):
    p = T + '\\' + f
    s = io.open(p, encoding='utf-8').read()
    if 'const BASE' not in s:
        s = s.replace("const sleep = ms => new Promise(r => setTimeout(r, ms));",
                      "const BASE = new URLSearchParams(location.search).get('base') || '/app';\nconst sleep = ms => new Promise(r => setTimeout(r, ms));")
    s = s.replace("cargar('/app/index.html?'", "cargar(BASE + '/index.html?'")
    s = s.replace("cargar('/app/index.html?r='", "cargar(BASE + '/index.html?r='")
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
    print('  %-18s base configurable: %s' % (f, "cargar(BASE + '/index.html?" in s))
