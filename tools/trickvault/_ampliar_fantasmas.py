import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r'E:\ANTIGRAVITY\tools\trickvault\_banco\_fantasmas.html'
s = io.open(p, encoding='utf-8').read()
# ademas de los fantasmas de id, mete una copia con un id que YA NO existe en la semilla
# y el mismo codigo+prompt que otra tarjeta (el caso /glitch)
s = s.replace("""    ls.setItem('trickvault_data', JSON.stringify(datos));""",
"""    // Caso /glitch: una copia guardada con un id que ya no existe en la semilla, pero
    // con el mismo codigo y prompt que otra tarjeta (el dedupe por código debe tirarla).
    const victima = texto[texto.length - 1];
    const copiaGlitch = { ...victima, id: 'ig-dcek-998' };
    datos.push(copiaGlitch);
    ls.setItem('trickvault_data', JSON.stringify(datos));""")
s = s.replace("""      codigos_repetidos: repetidos,""",
"""      codigos_repetidos: repetidos,
      copia_glitch_eliminada: !despues.some(t => t.id === 'ig-dcek-998'),""")
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('test ampliado con el caso /glitch')
