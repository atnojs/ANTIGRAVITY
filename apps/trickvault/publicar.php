<?php
/**
 * TrickVault — publicar cambios en el repositorio desde la propia app.
 *
 * Acciones (POST, multipart/form-data):
 *
 *   action=estado    Diagnóstico de solo lectura: si hay token, si la API de
 *                    GitHub responde, si el catálogo publicado existe en el
 *                    repositorio y si la contraseña de edición es válida (se
 *                    comprueba contra el auth.php de al lado, sin conocer su hash).
 *
 *   action=publicar  Manda a GitHub, en UN commit, la capa de cambios que envía
 *                    la app (apps/trickvault/catalogo.json) y las imágenes
 *                    propias (apps/trickvault/assets/publicado/<id>.jpg).
 *
 * Ojo: en Hostinger están deshabilitados proc_open/shell_exec/exec, así que aquí
 * NO se lanza git: se usa la API de GitHub (blobs → tree → commit → ref). El
 * despliegue automático de Hostinger trae luego esos ficheros al servidor, así
 * que el checkout se queda limpio y el pull del despliegue nunca choca.
 *
 * La contraseña NO se guarda aquí: se delega en auth.php. El token de GitHub
 * vive únicamente en el entorno del servidor (SetEnv del .htaccess raíz) y
 * nunca se imprime ni se devuelve al navegador.
 *
 * Variables de entorno reconocidas:
 *   PUBLICAR_TOKEN      token de GitHub con permiso de escritura (obligatorio)
 *   PUBLICAR_REPO       owner/repo, por defecto atnojs/ANTIGRAVITY
 *   PUBLICAR_RAMA       rama destino, por defecto main
 *   PUBLICAR_RUTA       ruta del catálogo en el repo, por defecto
 *                       apps/trickvault/catalogo.json
 *   PUBLICAR_AUTH_URL   (solo pruebas) URL del auth.php a consultar
 */

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

/* ── Límites (defensa básica) ───────────────────────────────────────────── */
const MAX_JSON = 4 * 1024 * 1024;      // 4 MB de capa de cambios
const MAX_IMAGENES = 60;               // imágenes por publicación
const MAX_BYTES_IMAGEN = 400 * 1024;   // 400 KB por imagen ya decodificada
const API_GITHUB = 'https://api.github.com';

/* ── Utilidades ─────────────────────────────────────────────────────────── */
function salir($datos, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function entorno($nombre, $defecto = '') {
    if (isset($_SERVER[$nombre]) && $_SERVER[$nombre] !== '') return $_SERVER[$nombre];
    $v = getenv($nombre);
    return ($v === false || $v === '') ? $defecto : $v;
}

/** Tapa cualquier token que aparezca en un texto antes de devolverlo. */
function tapar($texto) {
    $token = entorno('PUBLICAR_TOKEN');
    if ($token !== '' && strlen($token) > 8) {
        $texto = str_replace($token, '***TOKEN***', $texto);
        $texto = str_replace(urlencode($token), '***TOKEN***', $texto);
    }
    return $texto;
}

function repo_github() { return entorno('PUBLICAR_REPO', 'atnojs/ANTIGRAVITY'); }
function rama_destino() { return entorno('PUBLICAR_RAMA', 'main'); }
function ruta_catalogo() { return ltrim(entorno('PUBLICAR_RUTA', 'apps/trickvault/catalogo.json'), '/'); }

/**
 * Llamada a la API de GitHub. Devuelve [codigo_http, datos_decodificados, error].
 * El token nunca sale de aquí.
 */
function github($metodo, $ruta, $cuerpo = null) {
    if (!function_exists('curl_init')) return [0, null, 'El hosting no tiene cURL.'];
    $token = entorno('PUBLICAR_TOKEN');
    // PUBLICAR_API_URL existe solo para poder probar el endpoint contra una API
    // simulada; en producción siempre es la API real de GitHub.
    $base = rtrim(entorno('PUBLICAR_API_URL', API_GITHUB), '/');
    $ch = curl_init($base . $ruta);
    $cabeceras = [
        'Accept: application/vnd.github+json',
        'X-GitHub-Api-Version: 2022-11-28',
        'User-Agent: TrickVault-Publicar',
    ];
    if ($token !== '') $cabeceras[] = 'Authorization: Bearer ' . $token;
    $opciones = [
        CURLOPT_CUSTOMREQUEST => $metodo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $cabeceras,
        CURLOPT_TIMEOUT => 30,
    ];
    if ($cuerpo !== null) {
        $opciones[CURLOPT_POSTFIELDS] = json_encode($cuerpo, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $cabeceras[] = 'Content-Type: application/json';
        $opciones[CURLOPT_HTTPHEADER] = $cabeceras;
    }
    curl_setopt_array($ch, $opciones);
    $respuesta = curl_exec($ch);
    $codigo = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $fallo = curl_error($ch);
    curl_close($ch);
    if ($respuesta === false) return [0, null, tapar($fallo ?: 'sin respuesta de la API')];
    $datos = json_decode($respuesta, true);
    if ($codigo >= 400) {
        $mensaje = is_array($datos) ? ($datos['message'] ?? 'error de la API') : substr((string) $respuesta, 0, 160);
        return [$codigo, $datos, tapar("HTTP $codigo: $mensaje")];
    }
    return [$codigo, $datos, null];
}

/** Petición HTTP con cURL si está, y si no con file_get_contents. */
function peticion_http($url, $cuerpo, $frontera) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $cuerpo,
            CURLOPT_HTTPHEADER => ["Content-Type: multipart/form-data; boundary=$frontera"],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
        ]);
        $respuesta = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);
        if ($respuesta === false) return [false, 'cURL: ' . $error];
        return [true, $respuesta];
    }
    if (ini_get('allow_url_fopen')) {
        $contexto = stream_context_create(['http' => [
            'method' => 'POST',
            'header' => "Content-Type: multipart/form-data; boundary=$frontera\r\n",
            'content' => $cuerpo,
            'timeout' => 15,
            'ignore_errors' => true,
        ]]);
        $respuesta = @file_get_contents($url, false, $contexto);
        if ($respuesta === false) {
            $fallo = error_get_last();
            return [false, 'file_get_contents: ' . ($fallo['message'] ?? 'error desconocido')];
        }
        return [true, $respuesta];
    }
    return [false, 'El hosting no permite peticiones HTTP salientes.'];
}

/** URL del auth.php que valida la contraseña de edición. */
function url_auth() {
    $fija = entorno('PUBLICAR_AUTH_URL');
    if ($fija !== '') return $fija;
    $esquema = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return "$esquema://$host$dir/auth.php";
}

/** Valida la contraseña de edición contra el auth.php de al lado. */
function password_valida($password) {
    if (!is_string($password) || $password === '') return [false, 'Falta la contraseña.'];
    if (!is_file(__DIR__ . '/auth.php') && entorno('PUBLICAR_AUTH_URL') === '') {
        return [false, 'No encuentro auth.php para validar la contraseña.'];
    }
    $frontera = '----TrickVault' . bin2hex(random_bytes(8));
    $cuerpo = "--$frontera\r\n"
        . "Content-Disposition: form-data; name=\"password\"\r\n\r\n"
        . $password . "\r\n--$frontera--\r\n";
    [$ok, $respuesta] = peticion_http(url_auth(), $cuerpo, $frontera);
    if (!$ok) return [false, 'No pude consultar auth.php: ' . $respuesta];
    $json = json_decode($respuesta, true);
    if (!is_array($json)) return [false, 'auth.php no devolvió JSON: ' . substr($respuesta, 0, 120)];
    if (!empty($json['success'])) return [true, ''];
    return [false, $json['error'] ?? 'Contraseña incorrecta.'];
}

/* ── Diagnóstico ────────────────────────────────────────────────────────── */
function accion_estado() {
    $token = entorno('PUBLICAR_TOKEN');
    $repo = repo_github();
    $rama = rama_destino();

    $salida = [
        'repo_github' => $repo,
        'rama_destino' => $rama,
        'token_configurado' => $token !== '' ? 'sí' : 'NO',
        'php' => PHP_VERSION,
        'curl' => function_exists('curl_init') ? 'sí' : 'NO',
    ];

    if ($token === '') {
        $salida['api_github'] = 'sin token: no se puede comprobar';
        $salida['siguiente_paso'] = 'Añade PUBLICAR_TOKEN al .htaccess raíz del servidor.';
        return salir(['success' => true, 'estado' => $salida]);
    }

    [$codigo, $datos, $error] = github('GET', "/repos/$repo");
    $salida['api_github'] = $error ?: "ok (HTTP $codigo)";
    if (is_array($datos)) {
        $salida['permiso_escritura'] = !empty($datos['permissions']['push']) ? 'sí' : 'NO (el token no puede escribir)';
        $salida['rama_por_defecto'] = $datos['default_branch'] ?? '?';
        $salida['repo_privado'] = !empty($datos['private']) ? 'sí' : 'no';
    }

    [$codigoRama, , $errorRama] = github('GET', "/repos/$repo/git/ref/heads/$rama");
    $salida['rama_existe'] = $errorRama ? $errorRama : "sí (HTTP $codigoRama)";

    [$codigoCat, $datosCat] = github('GET', "/repos/$repo/contents/" . ruta_catalogo());
    $salida['catalogo_en_el_repo'] = ($codigoCat === 200)
        ? ('sí (' . ($datosCat['size'] ?? '?') . ' bytes)')
        : 'todavía no';

    // Prueba REAL de escritura: permissions.push de la API refleja el permiso
    // del usuario, no el del token, así que la única forma de saber si el token
    // puede escribir es intentar crear un blob (si sale bien queda huérfano y
    // GitHub lo recoge; no toca ningún commit).
    [$codigoBlob, , $errorBlob] = github('POST', "/repos/$repo/git/blobs", [
        'content' => base64_encode('TrickVault: prueba de escritura'),
        'encoding' => 'base64',
    ]);
    if ($errorBlob) {
        $salida['puede_escribir'] = 'NO → ' . $errorBlob;
        $salida['siguiente_paso'] = 'En GitHub, edita el token: Repository access → solo este repositorio, y '
            . 'Permissions → Repository permissions → Contents: Read and write. Guarda y reintenta.';
    } else {
        $salida['puede_escribir'] = 'sí (HTTP ' . $codigoBlob . ')';
    }

    return salir(['success' => true, 'estado' => $salida]);
}

/* ── Publicar ───────────────────────────────────────────────────────────── */
function accion_publicar() {
    $password = $_POST['password'] ?? '';
    [$ok, $motivo] = password_valida($password);
    if (!$ok) return salir(['success' => false, 'error' => $motivo], 403);

    $token = entorno('PUBLICAR_TOKEN');
    if ($token === '') {
        return salir([
            'success' => false,
            'error' => 'Falta PUBLICAR_TOKEN en el entorno del servidor (.htaccess raíz).',
        ], 500);
    }

    $catalogo = $_POST['catalogo'] ?? '';
    if (!is_string($catalogo) || $catalogo === '') {
        return salir(['success' => false, 'error' => 'No llegó el catálogo.'], 400);
    }
    if (strlen($catalogo) > MAX_JSON) {
        return salir(['success' => false, 'error' => 'El catálogo supera el tamaño permitido.'], 413);
    }
    $datos = json_decode($catalogo, true);
    if (!is_array($datos) || !isset($datos['version'])) {
        return salir(['success' => false, 'error' => 'El catálogo no es un JSON válido.'], 400);
    }

    $imagenes = json_decode($_POST['imagenes'] ?? '[]', true);
    if (!is_array($imagenes)) $imagenes = [];
    if (count($imagenes) > MAX_IMAGENES) {
        return salir(['success' => false, 'error' => 'Demasiadas imágenes en una publicación.'], 413);
    }

    $repo = repo_github();
    $rama = rama_destino();
    $rutaCat = ruta_catalogo();

    // 1) ¿Hay algo nuevo respecto a lo que ya está en el repositorio?
    $previo = null;
    [$codigoCat, $datosCat] = github('GET', "/repos/$repo/contents/$rutaCat");
    if ($codigoCat === 200 && !empty($datosCat['content'])) {
        $previo = json_decode(base64_decode(str_replace(["\n", "\r"], '', $datosCat['content'])), true);
        if (is_array($previo) && !$imagenes) {
            $a = $previo;
            $b = $datos;
            unset($a['actualizado'], $b['actualizado'], $a['carpetas'], $b['carpetas'], $a['ids'], $b['ids']);
            if (json_encode($a) === json_encode($b)) {
                return salir([
                    'success' => true,
                    'sin_cambios' => true,
                    'mensaje' => 'No hay nada nuevo que publicar: el repositorio ya está como tu app.',
                ]);
            }
        }
    }

    // Si se publica UNA carpeta, se quitan de la capa anterior sus entradas: así
    // lo publicado refleja esa carpeta tal cual está ahora (y lo demás se
    // conserva para que publicar una carpeta no borre lo ya publicado de otras).
    if (is_array($previo)) {
        foreach ((array) ($datos['ids'] ?? []) as $id) {
            unset($previo['tarjetas'][(string) $id]);
        }
        foreach ((array) ($datos['carpetas'] ?? []) as $cat) {
            unset($previo['orden'][(string) $cat]);
        }
        $porId = [];
        foreach ((array) ($previo['nuevas'] ?? []) as $nueva) {
            if (isset($nueva['id'])) $porId[(string) $nueva['id']] = $nueva;
        }
        $datos['tarjetas'] = array_merge((array) ($previo['tarjetas'] ?? []), (array) ($datos['tarjetas'] ?? []));
        $datos['orden'] = array_merge((array) ($previo['orden'] ?? []), (array) ($datos['orden'] ?? []));
        $datos['borradas'] = array_values(array_unique(array_merge(
            (array) ($previo['borradas'] ?? []),
            (array) ($datos['borradas'] ?? [])
        )));
        $nuevasFusion = $porId;
        foreach ((array) ($datos['nuevas'] ?? []) as $nueva) {
            if (isset($nueva['id'])) $nuevasFusion[(string) $nueva['id']] = $nueva;
        }
        $datos['nuevas'] = array_values($nuevasFusion);
    }
    unset($datos['ids'], $datos['carpetas']);

    $datos['actualizado'] = date('c');
    $json = json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    // 2) Ficheros del commit: el catálogo y, si las hay, las imágenes propias
    $ficheros = [$rutaCat => $json];
    foreach ($imagenes as $id => $dataUrl) {
        $id = preg_replace('/[^A-Za-z0-9._-]/', '', (string) $id);
        if ($id === '' || !is_string($dataUrl)) continue;
        if (!preg_match('#^data:image/jpeg;base64,#', $dataUrl)) {
            return salir(['success' => false, 'error' => "La imagen de $id no es un JPEG en base64."], 400);
        }
        $bytes = base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1), true);
        if ($bytes === false || strlen($bytes) < 100) {
            return salir(['success' => false, 'error' => "La imagen de $id está corrupta."], 400);
        }
        if (strlen($bytes) > MAX_BYTES_IMAGEN) {
            return salir(['success' => false, 'error' => "La imagen de $id supera los 400 KB."], 413);
        }
        if (substr($bytes, 0, 3) !== "\xFF\xD8\xFF") {
            return salir(['success' => false, 'error' => "La imagen de $id no es un JPEG de verdad."], 400);
        }
        $ficheros['apps/trickvault/assets/publicado/' . $id . '.jpg'] = $bytes;
    }

    // 3) Commit por la API: blobs -> tree -> commit -> mover la rama
    [$codigoRef, $ref, $errorRef] = github('GET', "/repos/$repo/git/ref/heads/$rama");
    if ($errorRef) return salir(['success' => false, 'error' => 'No pude leer la rama: ' . $errorRef], 500);
    $padre = $ref['object']['sha'] ?? '';
    if ($padre === '') return salir(['success' => false, 'error' => 'La rama no tiene commit padre.'], 500);

    [$codigoCommit, $commitPadre, $errorPadre] = github('GET', "/repos/$repo/git/commits/$padre");
    if ($errorPadre) return salir(['success' => false, 'error' => 'No pude leer el commit padre: ' . $errorPadre], 500);
    $treeBase = $commitPadre['tree']['sha'] ?? '';

    $entradas = [];
    foreach ($ficheros as $ruta => $contenido) {
        [$codigoBlob, $blob, $errorBlob] = github('POST', "/repos/$repo/git/blobs", [
            'content' => base64_encode($contenido),
            'encoding' => 'base64',
        ]);
        if ($errorBlob) return salir(['success' => false, 'error' => "No pude subir $ruta: $errorBlob"], 500);
        $entradas[] = ['path' => $ruta, 'mode' => '100644', 'type' => 'blob', 'sha' => $blob['sha']];
    }

    [$codigoTree, $tree, $errorTree] = github('POST', "/repos/$repo/git/trees", [
        'base_tree' => $treeBase,
        'tree' => $entradas,
    ]);
    if ($errorTree) return salir(['success' => false, 'error' => 'No pude crear el árbol: ' . $errorTree], 500);

    $mensaje = trim($_POST['mensaje'] ?? '');
    if ($mensaje === '') $mensaje = 'publicar: cambios de TrickVault desde modo edición';
    $mensaje = substr(preg_replace('/[\r\n\t]+/', ' ', $mensaje), 0, 120);

    [$codigoNuevo, $nuevo, $errorNuevo] = github('POST', "/repos/$repo/git/commits", [
        'message' => $mensaje,
        'tree' => $tree['sha'],
        'parents' => [$padre],
    ]);
    if ($errorNuevo) return salir(['success' => false, 'error' => 'No pude crear el commit: ' . $errorNuevo], 500);

    [$codigoMover, , $errorMover] = github('PATCH', "/repos/$repo/git/refs/heads/$rama", [
        'sha' => $nuevo['sha'],
        'force' => false,
    ]);
    if ($errorMover) {
        return salir([
            'success' => false,
            'error' => 'No pude mover la rama (¿ha publicado alguien a la vez? Vuelve a intentarlo): ' . $errorMover,
        ], 500);
    }

    $corto = substr($nuevo['sha'], 0, 7);

    // La comprobación de «ya está en el aire» la hace la app (sondea
    // catalogo.json); aquí se responde en cuanto el commit está en GitHub.
    return salir([
        'success' => true,
        'error' => null,
        'commit' => $corto,
        'mensaje' => $mensaje,
        'actualizado' => $datos['actualizado'],
        'rutas' => array_keys($ficheros),
        'imagenes' => count($ficheros) - 1,
    ]);
}

/* ── Enrutado ───────────────────────────────────────────────────────────── */
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    salir(['success' => false, 'error' => 'Este endpoint solo acepta POST.'], 405);
}

$accion = $_POST['action'] ?? ($_GET['action'] ?? '');
switch ($accion) {
    case 'estado':
        accion_estado();
        break;
    case 'publicar':
        accion_publicar();
        break;
    default:
        salir(['success' => false, 'error' => 'Acción no reconocida (usa estado o publicar).'], 400);
}
