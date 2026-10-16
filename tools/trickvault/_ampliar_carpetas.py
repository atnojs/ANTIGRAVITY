import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r'E:\ANTIGRAVITY\tools\trickvault\_banco\_carpetas.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    document.title = 'carpetas=' + carpetas.length + ' moda=' + (cuenta['xl-moda'] || 0)""",
"""    out.textContent += '\\n\\n--- tarjetas en xl-carteles (' + (cuenta['xl-carteles'] || 0) + ') ---\\n'
      + datos.filter(t => t.category === 'xl-carteles').map(t => t.codeSnippet).join(' ');
    out.textContent += '\\n\\n--- tarjetas en la carpeta f_mv73ghs02h22sxpzp ---\\n'
      + datos.filter(t => t.category === 'f_mv73ghs02h22sxpzp').map(t => t.codeSnippet).join(' ');
    document.title = 'carpetas=' + carpetas.length + ' moda=' + (cuenta['xl-moda'] || 0)""")
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('test ampliado')
