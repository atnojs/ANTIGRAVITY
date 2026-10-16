import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r'E:\ANTIGRAVITY\tools\trickvault\_banco\_volcado.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace("out.textContent = datos.map(t => [t.id, t.codeSnippet || '', t.imageUrl || '', t.ownImage ? 'OWN' : ''].join(' | ')).join('\\n');",
              "out.textContent = datos.map(t => [t.id, t.codeSnippet || '', t.imageUrl || '', t.ownImage ? 'OWN' : '', t.category || ''].join(' | ')).join('\\n');")
s = s.replace("const f = document.getElementById('f'), out = document.getElementById('out');",
              "const BASE = new URLSearchParams(location.search).get('base') || '/app';\nconst f = document.getElementById('f'), out = document.getElementById('out');")
s = s.replace("await cargar('/app/index.html?'", "await cargar(BASE + '/index.html?'")
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('volcado con categoria:', 't.category' in s)
