import sys
sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
VIEJA = 'all visible text and labels must be written in Spanish with no English words'
NUEVA = ('all visible text and labels must be written in Spanish with no English words: '
         'every sign, label, headline and button must be in Spanish, never in English')
s = open(APP, encoding='utf-8').read()
n = s.count(VIEJA)
s = s.replace(VIEJA, NUEVA)
open(APP, 'w', encoding='utf-8', newline='').write(s)
print('coletillas reforzadas: %d' % n)
