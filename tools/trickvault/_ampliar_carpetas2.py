import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r'E:\ANTIGRAVITY\tools\trickvault\_banco\_carpetas.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    out.textContent += '\\n\\n--- tarjetas en la carpeta f_mv73ghs02h22sxpzp ---\\n'
      + datos.filter(t => t.category === 'f_mv73ghs02h22sxpzp').map(t => t.codeSnippet).join(' ');""",
"""    out.textContent += '\\n\\n--- tarjetas en la carpeta f_mv73ghs02h22sxpzp ---\\n'
      + datos.filter(t => t.category === 'f_mv73ghs02h22sxpzp').map(t => t.codeSnippet).join(' ');
    const mirar = ['/banner', '/crosssection', '/invitation', '/museumplaque', '/securitycam'];
    out.textContent += '\\n\\n--- donde estan las 5 que faltan ---\\n'
      + mirar.map(c => { const t = datos.find(x => x.codeSnippet === c); return c + ' -> ' + (t ? t.category + ' (id ' + t.id + ')' : 'NO EXISTE'); }).join('\\n');""")
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('test con las 5')
