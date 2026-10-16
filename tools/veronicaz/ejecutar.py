# -*- coding: utf-8 -*-
"""Emite las facturas 153-179 de Veronica'z y actualiza Clientes.xlsx.

Uso:
  ejecutar.py --facturas-dir <carpeta> [--clientes <ruta xlsx>] [--backup <ruta>]

- Copia Factura 152.xlsx y parchea solo las celdas necesarias (fidelidad del resto).
- Anade los clientes nuevos a Clientes.xlsx por orden alfabetico.
"""
import argparse, os, re, shutil, zipfile, datetime, builtins, unicodedata

TPL = "E:\\Ver\u00f3nica\u00b4z\\Contabilidad\\Facturas\\Facturas Emitidas\\2026\\Agosto\\Factura 152.xlsx"
CLIENTES_ORIG = "E:\\Ver\u00f3nica\u00b4z\\Contabilidad\\Clientes.xlsx"

# numero, fecha, importe, concepto literal, nombre en Clientes.xlsx, DNI
FACTURAS = [
    (153, (2026, 9, 1), 50, "clases mensuales de pintura", "Lidia", None),
    (154, (2026, 9, 1), 50, "clases mensuales de pintura", "Tibiabin", None),
    (155, (2026, 9, 1), 50, "clases mensuales de pintura", "Carolina Figueroa Guti\u00e9rrez", "78524000V"),
    (156, (2026, 9, 1), 15, "Delantal MPL", "Aida Soto", None),
    (157, (2026, 9, 2), 50, "clases mensuales de pintura", "Cynthia", None),
    (158, (2026, 9, 4), 15, "Delantal MPL", "Mar\u00eda Berta", None),
    (159, (2026, 9, 4), 50, "clases semanales de pintura", "Cristina", None),
    (160, (2026, 9, 5), 120, "Taller Privado", "Cristo", None),
    (161, (2026, 9, 6), 50, "Clases de Pintura mensuales", "Carmen Delia D\u00edaz P\u00e9rez", "784913869M"),
    (162, (2026, 9, 7), 75, "clases de pintura mensuales y Taller", "Ana Daura Pe\u00f1a", "78537777E"),
    (163, (2026, 9, 7), 50, "clases de pintura mensuales", "Silvia", None),
    (164, (2026, 9, 8), 50, "clases de pintura mensuales", "Cristina", None),
    (165, (2026, 9, 8), 50, "clases de pintura mensuales", "Pili", None),
    (166, (2026, 9, 9), 50, "clases de pintura mensuales", "Vanesa Matoso Vera", "78502865R"),
    (167, (2026, 9, 10), 80, "clases y Taller Tem\u00e1tico Mensual", "Ingrid Fabelo Fuentes", "78502865R"),
    (168, (2026, 9, 13), 50, "clases mensuales de pintura", "Domingo Elvira", None),
    (169, (2026, 9, 14), 12, "clase pintura textil creativa", "Aridiam", None),
    (170, (2026, 9, 25), 20, "Delantal MPL", "Cristina", None),
    (171, (2026, 9, 26), 30, "Taller Tem\u00e1tico octubre", "Carolina Figueroa Guti\u00e9rrez", "78524000V"),
    (172, (2026, 9, 28), 75, "mes de clases y Taller pintura", "Victor De Vera Pe\u00f1a", "78594053V"),
    (173, (2026, 9, 28), 24, "dos clases pintura", "Adri\u00e1n", None),
    (174, (2026, 9, 29), 50, "clases mensuales de pintura", "Marcela Batista Falc\u00f3n", "52843441K"),
    (175, (2026, 9, 30), 30, "Taller Tem\u00e1tico Mensual", "Carolina Figueroa Guti\u00e9rrez", "78524000V"),
    (176, (2026, 9, 30), 28, "Taza y Maxibolso MPL", "Noelia Soto", None),
    (177, (2026, 9, 30), 60, "dos Talleres tem\u00e1ticos de pintura", "Minerva", None),
    (178, (2026, 9, 30), 50, "clases mensuales de pintura", "Lourdes", None),
    (179, (2026, 9, 30), 80, "clases mensuales y Taller Tem\u00e1tico", "Mari Carmen Monta\u00f1ez", "42889111E"),
]

# nuevos clientes: (nombre, numero asignado)
NUEVOS = [("Adri\u00e1n", 160), ("Aridiam", 161), ("Cristo", 162), ("Cynthia", 163),
          ("Domingo Elvira", 164), ("Lidia", 165), ("Silvia", 166)]

ap = argparse.ArgumentParser()
ap.add_argument("--facturas-dir", required=True)
ap.add_argument("--clientes")
ap.add_argument("--backup")
args = ap.parse_args()

LOG = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "ejecutar_log.txt"), "w", encoding="utf-8")
def log(*a):
    builtins.print(*a, file=LOG); LOG.flush()


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def serial(y, m, d):
    return (datetime.date(y, m, d) - datetime.date(1899, 12, 30)).days


def set_cell(xml, ref, inner):
    pat = re.compile(r'<c r="%s"(?:\s[^>]*)?(?:/>|>.*?</c>)' % re.escape(ref), re.S)
    new, n = pat.subn(inner, xml, count=1)
    if n != 1:
        raise SystemExit("no encontrada la celda " + ref)
    return new


def norm(s):
    s = unicodedata.normalize("NFKD", str(s or "").strip().lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return " ".join(s.split())


# ---------------------------------------------------------------- facturas
os.makedirs(args.facturas_dir, exist_ok=True)
with zipfile.ZipFile(TPL) as z:
    TPL_ENTRIES = z.namelist()
    TPL_DATA = {n: z.read(n) for n in TPL_ENTRIES}

sheet_tpl = TPL_DATA["xl/worksheets/sheet1.xml"].decode("utf-8")
sst_tpl = TPL_DATA["xl/sharedStrings.xml"].decode("utf-8")
wb_tpl = TPL_DATA["xl/workbook.xml"].decode("utf-8")
m = re.search(r"<sst[^>]*>(.*)</sst>", sst_tpl, re.S)
SST_HEAD, SST_BODY = sst_tpl[:m.start(1)], m.group(1)
SST_COUNT = len(re.findall(r"<si>", SST_BODY))
wb_area = wb_tpl.replace(
    "</sheets>",
    "</sheets><definedNames><definedName name=\"_xlnm.Print_Area\" localSheetId=\"0\">Ejecutiva!$A$1:$D$30</definedName></definedNames>", 1)
if wb_area == wb_tpl:
    raise SystemExit("no se pudo fijar el area de impresion")

creadas, saltadas = [], []
for num, (y, mo, d), imp, concepto, nombre, dni in FACTURAS:
    dst = os.path.join(args.facturas_dir, "Factura %d.xlsx" % num)
    if os.path.exists(dst):
        saltadas.append((num, "ya existe, no se sobrescribe"))
        continue
    idx, extra = {}, []
    for s in [nombre] + ([dni] if dni else []) + [concepto]:
        if s not in idx:
            idx[s] = SST_COUNT + len(extra)
            extra.append(s)
    sst_new = SST_HEAD + SST_BODY + "".join("<si><t>%s</t></si>" % esc(s) for s in extra) + "</sst>"
    sst_new = sst_new.replace('count="%d"' % SST_COUNT, 'count="%d"' % (SST_COUNT + len(extra)), 1)
    sst_new = sst_new.replace('uniqueCount="%d"' % SST_COUNT, 'uniqueCount="%d"' % (SST_COUNT + len(extra)), 1)

    x = sheet_tpl
    x = set_cell(x, "A7", '<c r="A7" s="22" t="s"><v>%d</v></c>' % idx[nombre])
    if dni:
        x = re.sub(r'(<row r="8"[^>]*>)', r'\1<c r="A8" t="s"><v>%d</v></c>' % idx[dni], x, count=1)
    x = set_cell(x, "D2", '<c r="D2" s="17"><v>%d</v></c>' % serial(y, mo, d))
    x = set_cell(x, "D3", '<c r="D3" s="18"><v>%d</v></c>' % num)
    x = set_cell(x, "A12", '<c r="A12" s="35" t="s"><v>%d</v></c>' % idx[concepto])
    x = set_cell(x, "C12", '<c r="C12" s="37"><v>%d</v></c>' % imp)
    x = set_cell(x, "D12", '<c r="D12" s="38"><f>B12*C12</f><v>%d</v></c>' % imp)
    x = set_cell(x, "D26", '<c r="D26" s="33"><f>SUM(D12:D15)</f><v>%d</v></c>' % imp)

    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zo:
        for n in TPL_ENTRIES:
            if n == "xl/worksheets/sheet1.xml":
                zo.writestr(n, x)
            elif n == "xl/sharedStrings.xml":
                zo.writestr(n, sst_new)
            elif n == "xl/workbook.xml":
                zo.writestr(n, wb_area)
            else:
                zo.writestr(n, TPL_DATA[n])
    creadas.append((num, dst))
    log("creada", num, nombre, imp, concepto, "DNI=", dni)
log("facturas creadas:", len(creadas), "saltadas:", saltadas)

# ---------------------------------------------------------------- clientes
if args.clientes:
    from openpyxl import load_workbook
    from copy import copy as _copy

    if args.backup and os.path.abspath(args.backup) != os.path.abspath(args.clientes):
        os.makedirs(os.path.dirname(args.backup), exist_ok=True)
        shutil.copy2(args.clientes, args.backup)
        log("copia de seguridad:", args.backup)

    wb = load_workbook(args.clientes, data_only=False)
    ws = wb["Hoja1"] if "Hoja1" in wb.sheetnames else wb.active

    filas = {}
    for r in range(3, ws.max_row + 1):
        v = ws.cell(r, 2).value
        if v is not None and str(v).strip():
            filas[r] = str(v).strip()
    ultima_lista = max(filas)

    pendientes = []
    for nombre, numero in NUEVOS:
        objetivo = norm(nombre)
        destino = None
        for r in sorted(filas):
            if r > ultima_lista:
                break
            if norm(filas[r]) > objetivo:
                destino = r
                break
        if destino is None:
            destino = ultima_lista + 1
        pendientes.append((destino, nombre, numero))
        log("insertar", nombre, "antes de la fila", destino,
            "(", filas.get(destino, "(fin de la lista)"), ") numero", numero)

    alturas = {r: dm.height for r, dm in ws.row_dimensions.items() if dm.height is not None}
    merges = [(m.min_col, m.min_row, m.max_col, m.max_row) for m in ws.merged_cells.ranges]
    for m in list(ws.merged_cells.ranges):
        ws.unmerge_cells(str(m))

    for destino, nombre, numero in sorted(pendientes, key=lambda t: (t[0], t[1]), reverse=True):
        ws.insert_rows(destino)
        for c in range(1, 11):
            src = ws.cell(destino - 1, c)
            dstc = ws.cell(destino, c)
            dstc._style = _copy(src._style)
            dstc.value = None
        ws.cell(destino, 1).value = numero
        ws.cell(destino, 2).value = nombre
        ws.row_dimensions[destino].height = alturas.get(destino - 1, 15.75)

    for mc, mr, xc, xr in merges:
        salto = sum(1 for d, _, _ in pendientes if d <= mr)
        ws.merge_cells(start_row=mr + salto, start_column=mc, end_row=xr + salto, end_column=xc)

    for r, h in alturas.items():
        salto = sum(1 for d, _, _ in pendientes if d <= r)
        if salto:
            ws.row_dimensions[r + salto].height = h

    wb.save(args.clientes)
    log("clientes guardados en", args.clientes)

    wb2 = load_workbook(args.clientes, data_only=False)
    ws2 = wb2.active
    for r in range(1, ws2.max_row + 1):
        vals = [ws2.cell(r, c).value for c in range(1, 7)]
        if any(v not in (None, "") for v in vals):
            log("FILA", r, vals)

LOG.close()
builtins.print("hecho")
