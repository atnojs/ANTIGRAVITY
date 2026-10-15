import io, sys
p = r'E:\ANTIGRAVITY\tools\trickvault\_banco\_carpetas.html'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    await cargar('/app/index.html?' + Date.now());
    await sleep(12000);""",
"""    await cargar('/app/index.html?' + Date.now());
    await sleep(12000);
    // simular que las tarjetas de moda estaban guardadas en la carpeta vieja
    const previos = JSON.parse(ls.getItem('trickvault_data') || '[]');
    for (const t of previos) if (t.category === 'xl-moda') t.category = 'xl-comidamoda';
    ls.setItem('trickvault_data', JSON.stringify(previos));
    ls.setItem('trickvault_folders_schema', '5');
    await cargar('/app/index.html?r=' + Date.now());
    await sleep(12000);""")
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('  test de carpetas guardadas listo')
