# -*- coding: utf-8 -*-
"""Inyecta en apps/video-vault/index.html las tarjetas nuevas de la captura del 100+50
(_comandos_nuevos_20261010.py), añade las carpetas nuevas y hace que las carpetas
guardadas en el navegador se fusionen con las nuevas (merge por esquema).

Uso: python _inyectar_comandos.py [--dry]
"""
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r'E:\ANTIGRAVITY\tools\video-vault')

from _comandos_nuevos_20261010 import ENTRADAS, FOLDERS_NUEVAS  # noqa: E402

APP = r'E:\ANTIGRAVITY\apps\video-vault\index.html'
DRY = '--dry' in sys.argv

src = open(APP, encoding='utf-8').read()


def cita(texto):
    """Devuelve el literal JS para un string, eligiendo comilla simple o doble."""
    if "'" in texto:
        return '"' + texto.replace('"', '\\"') + '"'
    return "'" + texto + "'"


# ── 1) Códigos que ya existen ────────────────────────────────────────────────
existentes = set(re.findall(r"name:\s*'([^']+)'", src))
print(f'comandos existentes: {len(existentes)}')

vistos = set()
nuevas = []
for (cid, cat, name, title, desc, prompt, example, diff) in ENTRADAS:
    if name in existentes or name in vistos:
        print('  ya existe (se omite):', name)
        continue
    vistos.add(name)
    nuevas.append((cid, cat, name, title, desc, prompt, example, diff))

print(f'tarjetas nuevas a inyectar: {len(nuevas)}')
if not nuevas:
    print('nada que hacer')
    sys.exit(0)

# ── 2) Carpetas nuevas ───────────────────────────────────────────────────────
carpetas_existentes = set(re.findall(r"\{\s*id:\s*'([a-z0-9]+)'", src.split('const FOLDERS_KEY')[0]))
carpetas = [f for f in FOLDERS_NUEVAS if f['id'] not in carpetas_existentes]
print('carpetas nuevas:', [f['id'] for f in carpetas])

lineas_carpetas = '\n'.join(
    "    {{ id: '{id}',{pad}label: {label}, icon: {icon}, color: {color}, bgIcon: {bg} }},".format(
        id=f['id'],
        pad=' ' * max(1, 10 - len(f['id'])),
        label=cita(f['label']), icon=cita(f['icon']), color=cita(f['color']), bg=cita(f['bgIcon']),
    ) for f in carpetas
)

ancla_carpetas = "    { id: 'trucos',  label: 'Trucos y atajos',        icon: '💻', color: 'emerald', bgIcon: '⌨️' },\n];"
nuevo_carpetas = ("    { id: 'trucos',  label: 'Trucos y atajos',        icon: '💻', color: 'emerald', bgIcon: '⌨️' },\n"
                  "    // Captura 2026-10-10 (100 comandos + 50 bonus de Google Flow/Gemini): carpetas nuevas.\n"
                  + lineas_carpetas + "\n];")
assert src.count(ancla_carpetas) == 1, 'no encuentro el cierre de DEFAULT_FOLDERS'
src = src.replace(ancla_carpetas, nuevo_carpetas)

# ── 3) Comandos nuevos ───────────────────────────────────────────────────────
lineas_comandos = []
for (cid, cat, name, title, desc, prompt, example, diff) in nuevas:
    lineas_comandos.append(
        "  {{ id: '{cid}', cat: '{cat}', name: '{name}', title: {title}, desc: {desc}, prompt: {prompt}, example: {ex} }},".format(
            cid=cid, cat=cat, name=name, title=cita(title), desc=cita(desc),
            prompt=cita(prompt), ex=cita(example)))

ancla_comandos = re.search(r"\n\s*\{ id: 'cm08', cat: 'comp', name: '/ruleofthirds'", src)
assert ancla_comandos, 'no encuentro la ultima entrada de VIDEO_COMMANDS'
i = ancla_comandos.start()
cierre = src.index('\n];', i)
src = (src[:cierre]
       + '\n\n  // ── Captura 2026-10-10: 100 comandos (planos, cámara, acción, luz, paisajes, ciudad,\n'
       + '  //    personas, estilo de vida, tecnología, producto) + 50 bonus creativos ──\n'
       + '\n'.join('  ' + l.strip() for l in lineas_comandos)
       + src[cierre:])

# ── 4) Dificultades ──────────────────────────────────────────────────────────
por_dificultad = {}
for (cid, cat, name, title, desc, prompt, example, diff) in nuevas:
    por_dificultad.setdefault(diff, []).append(cid)

lineas_dif = []
for diff in ('beginner', 'intermediate', 'advanced'):
    ids = por_dificultad.get(diff) or []
    for j in range(0, len(ids), 12):
        trozo = ids[j:j + 12]
        lineas_dif.append('    ' + ' '.join(f"{cid}: '{diff}'," for cid in trozo))

ancla_dif = "    tm05: 'intermediate', l05: 'beginner', cm06: 'beginner', cm07: 'beginner', cm08: 'beginner',\n};"
assert src.count(ancla_dif) == 1, 'no encuentro el cierre de VIDEO_DIFFICULTY'
src = src.replace(ancla_dif,
                  "    tm05: 'intermediate', l05: 'beginner', cm06: 'beginner', cm07: 'beginner', cm08: 'beginner',\n"
                  + '\n'.join(lineas_dif) + "\n};")

# ── 5) Merge de carpetas guardadas (para que las nuevas aparezcan) ───────────
ancla_schema = "const FOLDERS_KEY = 'videovault_folders';"
assert src.count(ancla_schema) == 1
src = src.replace(ancla_schema,
                  "const FOLDERS_KEY = 'videovault_folders';\n"
                  "const FOLDERS_SCHEMA_KEY = 'videovault_folders_schema';\n"
                  "const FOLDERS_SCHEMA_VERSION = 2;")

ancla_read = """function readFolderIds() {
    try {
        const saved = localStorage.getItem(FOLDERS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length) return parsed.map(f => f.id);
        }
    } catch { /* ignorar */ }
    return DEFAULT_FOLDERS.map(f => f.id);
}"""
assert src.count(ancla_read) == 1, 'no encuentro readFolderIds'
nuevo_read = """function mergeFolders(saved) {
    if (!Array.isArray(saved) || !saved.length) return DEFAULT_FOLDERS;
    try {
        const schema = Number(localStorage.getItem(FOLDERS_SCHEMA_KEY)) || 0;
        if (schema >= FOLDERS_SCHEMA_VERSION) return saved;
        const known = new Set(saved.map(f => f && f.id));
        const missing = DEFAULT_FOLDERS.filter(f => !known.has(f.id));
        return missing.length ? [...saved, ...missing] : saved;
    } catch { return saved; }
}
function readFolderIds() {
    try {
        const saved = localStorage.getItem(FOLDERS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            const merged = mergeFolders(parsed);
            if (merged.length) return merged.map(f => f.id);
        }
    } catch { /* ignorar */ }
    return DEFAULT_FOLDERS.map(f => f.id);
}"""
src = src.replace(ancla_read, nuevo_read)

ancla_use = """            const saved = localStorage.getItem(FOLDERS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length) return parsed;
            }
        } catch { /* ignorar */ }
        return DEFAULT_FOLDERS;"""
assert src.count(ancla_use) == 1, 'no encuentro useFolders'
src = src.replace(ancla_use, """            const saved = localStorage.getItem(FOLDERS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length) return mergeFolders(parsed);
            }
        } catch { /* ignorar */ }
        return DEFAULT_FOLDERS;""")

ancla_guardar = "        try { localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders)); }"
assert src.count(ancla_guardar) == 1
src = src.replace(ancla_guardar,
                  "        try {\n"
                  "            localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));\n"
                  "            localStorage.setItem(FOLDERS_SCHEMA_KEY, String(FOLDERS_SCHEMA_VERSION));\n"
                  "        }")

if DRY:
    print('DRY: no se escribe nada')
    sys.exit(0)

open(APP, 'w', encoding='utf-8', newline='').write(src)
print(f'OK: {len(nuevas)} comandos y {len(carpetas)} carpetas inyectados en {APP}')
