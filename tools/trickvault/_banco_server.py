# -*- coding: utf-8 -*-
"""
Banco de pruebas local que reproduce la app REAL (mismo origen, mismo almacen).

  http://127.0.0.1:8765/            -> banco (tools/trickvault/_banco/)
  http://127.0.0.1:8765/app/...     -> apps/trickvault/...
  http://127.0.0.1:8765/app/image_store.php  -> respuesta guardada del servidor
                                                 (la contaminada, tal cual)

Asi el iframe del banco es del MISMO origen que la app y se puede registrar
dentro: abrir carpetas, leer que imagen ensena cada tarjeta y comprobarlo.
"""
import http.server, json, os, socketserver, sys, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
APP = r'E:\ANTIGRAVITY\apps\trickvault'
BANCO = r'E:\ANTIGRAVITY\tools\trickvault\_banco'
PUERTO = 8765
PROD = 'https://atnojs.es/apps/trickvault/'
STORE = os.path.join(BANCO, 'image_store_list.json')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=BANCO, **k)

    def log_message(self, fmt, *args):
        pass

    def _json(self, obj, code=200):
        cuerpo = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(cuerpo)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(cuerpo)

    def do_GET(self):
        ruta = urllib.parse.unquote(urllib.parse.urlparse(self.path).path)
        # /prod/... = la app TAL CUAL se sirve en produccion (para verificar lo
        # desplegado con el mismo banco). El almacen se sigue simulando aqui.
        if ruta == '/prod/image_store.php':
            return self._almacen()
        if ruta == '/prod/auth.php':
            return self._json({'success': True, 'authenticated': False})
        if ruta.startswith('/prod/'):
            return self._produccion(ruta[len('/prod/'):], urllib.parse.urlparse(self.path).query)
        if ruta == '/app/image_store.php':
            return self._almacen()
        if ruta == '/app/auth.php':
            return self._json({'success': True, 'authenticated': False})
        if ruta.startswith('/app/'):
            return self._fichero(APP, ruta[len('/app/'):])
        return super().do_GET()

    def _almacen(self):
        accion = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('action', [''])[0]
        if accion == 'list':
            with open(STORE, encoding='utf-8') as f:
                return self._json(json.load(f))
        if accion == 'fav_list':
            return self._json({'success': True, 'favorites': []})
        return self._json({'success': True})

    def _produccion(self, rel, query):
        # los nombres llevan espacios y tildes: hay que codificarlos o urlopen falla
        url = PROD + urllib.parse.quote(rel) + (('?' + query) if query else '')
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                datos = r.read()
                tipo = r.headers.get('Content-Type') or self.guess_type(rel)
        except Exception as e:
            return self.send_error(502, 'no puedo traer %s: %s' % (rel, e))
        self.send_response(200)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(datos)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(datos)

    def do_POST(self):
        ruta = urllib.parse.unquote(urllib.parse.urlparse(self.path).path)
        if ruta in ('/app/image_store.php', '/app/auth.php'):
            return self._json({'success': True})
        self.send_error(404)

    def _fichero(self, raiz, rel):
        destino = os.path.normpath(os.path.join(raiz, rel))
        if not destino.startswith(raiz) or not os.path.isfile(destino):
            return self.send_error(404)
        tipo = self.guess_type(destino)
        with open(destino, 'rb') as f:
            datos = f.read()
        self.send_response(200)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(datos)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(datos)


if __name__ == '__main__':
    os.makedirs(BANCO, exist_ok=True)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('127.0.0.1', PUERTO), Handler) as httpd:
        print('banco en http://127.0.0.1:%d/  (app en /app/)' % PUERTO, flush=True)
        httpd.serve_forever()
