import io, sys
sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault\index.html'
s = io.open(APP, encoding='utf-8').read()
viejo = "return normalizeTrickOrder(cleanLegacyImageCommandDescriptions(migrateGeneratedCardImages(merged)));"
nuevo = "return normalizeTrickOrder(cleanLegacyImageCommandDescriptions(migrateGeneratedCardImages(dedupeCardsByCommand(merged))));"
assert s.count(viejo) == 1, 'ancla no unica: %d' % s.count(viejo)
s = s.replace(viejo, nuevo)
io.open(APP, 'w', encoding='utf-8', newline='').write(s)
print('dedupe enganchado en useLocalStorage')
