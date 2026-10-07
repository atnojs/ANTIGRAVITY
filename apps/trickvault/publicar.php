<?php
/**
 * TrickVault — publicar cambios en el repositorio desde la propia app.
 *
 * Acciones (POST, multipart/form-data):
 *
 *   action=estado    Diagnóstico de solo lectura: rama, remoto, si hay token
 *                    configurado, si el directorio se puede escribir y si la
 *                    contraseña de edición es válida (se comprueba contra el
 *                    auth.php de al lado, sin conocer su hash).
 *
 *   action=publicar  Guarda apps/trickvault/catalogo.json (la capa de cambios
 *                    que manda la app) y las imágenes propias en
 *                    apps/trickvault/assets/publicado/<id>.jpg, y hace
 *                    git add + commit + push SOLO de esas rutas.
 *
 * La contraseña NO se guarda aquí: se delega en auth.php. El token de GitHub
 * vive únicamente en el entorno del servidor (SetEnv del .htaccess raíz) y
 * nunca se imprime ni se devuelve al navegador.
 *
 * Variables de entorno reconocidas:
 *   PUBLICAR_TOKEN      token de GitHub con permiso de escritura (obligatorio)
 *   PUBLICAR_REPO       owner/repo, por defecto atnojs/ANTIGRAVITY
 *   PUBLICAR_RAMA       rama destino, por defecto main
 *   PUBLICAR_REPO_DIR   raíz del checkout en el servidor (por defecto, dos
 *                       niveles por encima de este fichero)
 */

header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

/* ── Límites (defensa básica) ───────────────────────────────────────────── */
const MAX_JSON = 4 * 1024 * 1024;      // 4 MB de capa de cambios
const MAX_IMAGENES = 60;               // imágenes por publicación
const MAX_BYTES_IMAGEN = 400 * 1024;   // 400 KB por imagen ya decodificada
const MAX_SEGUNDOS_GIT = 60;

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

function repo_dir() {
    return rtrim(entorno('PUBLICAR_REPO_DIR', dirname(__DIR__, 2)), "/\\");
}

/** ¿Está esa función deshabilitada por el hosting? */
function deshabilitada($funcion) {
    $lista = array_map('trim', explode(',', (string) ini_get('disable_functions')));
    return in_array($funcion, $lista, true) || !function_exists($funcion);
}

/** Motores disponibles para lanzar git (según lo que permita el hosting). */
function motores_git() {
    $hay = [];
    foreach (['proc_open', 'shell_exec', 'exec'] as $f) {
        if (!deshabilitada($f)) $hay[] = $f;
    }
    return $hay;
}

/**
 * Ejecuta git en el checkout del servidor. Usa proc_open si se puede y, si el
 * hosting lo tiene capado, cae a shell_exec o exec. Devuelve [codigo, salida].
 */
function git(array $args, $timeout = MAX_SEGUNDOS_GIT) {
    $base = array_merge(['-C', repo_dir()], $args);

    if (!deshabilitada('proc_open')) {
        $cmd = array_merge(['git'], $base);
        $descriptores = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $proceso = @proc_open($cmd, $descriptores, $tuberias);
        if (is_resource($proceso)) {
            stream_set_blocking($tuberias[1], false);
            stream_set_blocking($tuberias[2], false);
            $salida = '';
            $inicio = time();
            while (true) {
                $salida .= stream_get_contents($tuberias[1]);
                $salida .= stream_get_contents($tuberias[2]);
                $estado = proc_get_status($proceso);
                if (!$estado['running']) break;
                if (time() - $inicio > $timeout) {
                    proc_terminate($proceso);
                    $salida .= "\n(agotado el tiempo de espera de git)";
                    break;
                }
                usleep(120000);
            }
            $salida .= stream_get_contents($tuberias[1]);
            $salida .= stream_get_contents($tuberias[2]);
            fclose($tuberias[1]);
            fclose($tuberias[2]);
            return [proc_close($proceso), tapar(trim($salida))];
        }
    }

    foreach (['shell_exec', 'exec'] as $motor) {
        if (deshabilitada($motor)) continue;
        $linea = 'git ' . implode(' ', array_map('escapeshellarg', $base)) . ' 2>&1; echo "__TVEXIT:$?__"';
        if ($motor === 'shell_exec') {
            $salida = (string) @shell_exec($linea);
        } else {
            $lineas = [];
            @exec($linea, $lineas);
            $salida = implode("\n", $lineas);
        }
        if (preg_match('/__TVEXIT:(\d+)__\s*$/', $salida, $m)) {
            $codigo = (int) $m[1];
            $salida = preg_replace('/__TVEXIT:\d+__\s*$/', '', $salida);
        } else {
            $codigo = -1;
        }
        return [$codigo, tapar(trim($salida))];
    }

    return [127, 'El hosting tiene deshabilitadas todas las funciones para ejecutar git (proc_open, shell_exec, exec).'];
}

/** URL del auth.php que valida la contraseña de edición. */
function url_auth() {
    // En producción siempre es el auth.php de al lado. PUBLICAR_AUTH_URL existe
    // solo para poder probar el endpoint en local contra un servidor simulado.
    $fija = entorno('PUBLICAR_AUTH_URL');
    if ($fija !== '') return $fija;
    $esquema = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return "$esquema://$host$dir/auth.php";
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
    return [false, 'El hosting no permite peticiones HTTP salientes (ni cURL ni allow_url_fopen).'];
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
    $repo = entorno('PUBLICAR_REPO', 'atnojs/ANTIGRAVITY');
    $rama = entorno('PUBLICAR_RAMA', 'main');
    $dir = repo_dir();

    [$cRama, $ramaActual] = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    [$cLog, $ultimo] = git(['log', '-1', '--oneline']);
    [$cRemoto, $remoto] = git(['remote', '-v']);
    [$cSucio, $sucio] = git(['status', '--porcelain', '--', 'apps/trickvault']);
    [$cVersion] = git(['--version']);

    return salir([
        'success' => true,
        'estado' => [
            // Sin rutas absolutas del servidor: este diagnóstico es público
            // (solo informa de si la publicación puede funcionar).
            'repo_dir_encontrado' => is_dir($dir . '/.git'),
            'escribible' => is_writable($dir) && is_writable($dir . '/apps/trickvault'),
            'git_disponible' => $cVersion === 0,
            'rama_actual' => $cRama === 0 ? $ramaActual : '(error)',
            'rama_destino' => $rama,
            'ultimo_commit' => $cLog === 0 ? $ultimo : '(error)',
            'remoto' => $cRemoto === 0 ? $remoto : '(error)',
            'cambios_pendientes_trickvault' => $cSucio === 0 ? $sucio : '(error)',
            'repo_github' => $repo,
            'token_configurado' => $token !== '' ? 'sí' : 'NO',
            'catalogo_existe' => is_file(__DIR__ . '/catalogo.json'),
            'motores_git' => implode(', ', motores_git()) ?: 'NINGUNO',
            'peticiones_http' => function_exists('curl_init') ? 'curl' : (ini_get('allow_url_fopen') ? 'allow_url_fopen' : 'NINGUNA'),
            'mbstring' => function_exists('mb_substr') ? 'sí' : 'no',
            'php' => PHP_VERSION,
        ],
    ]);
}

/* ── Publicar ───────────────────────────────────────────────────────────── */
function accion_publicar() {
    $password = $_POST['password'] ?? '';
    [$ok, $motivo] = password_valida($password);
    if (!$ok) return salir(['success' => false, 'error' => $motivo], 403);

    if (entorno('PUBLICAR_TOKEN') === '') {
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

    // 1) Imágenes propias -> apps/trickvault/assets/publicado/<id>.jpg
    $dirPublicado = __DIR__ . '/assets/publicado';
    $escritas = [];
    if ($imagenes) {
        if (!is_dir($dirPublicado) && !@mkdir($dirPublicado, 0755, true)) {
            return salir(['success' => false, 'error' => 'No pude crear assets/publicado.'], 500);
        }
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
            $destino = $dirPublicado . '/' . $id . '.jpg';
            if (@file_put_contents($destino, $bytes) === false) {
                return salir(['success' => false, 'error' => "No pude escribir la imagen de $id."], 500);
            }
            $escritas[] = 'apps/trickvault/assets/publicado/' . $id . '.jpg';
        }
    }

    // 2) La capa de cambios -> apps/trickvault/catalogo.json
    // Si el contenido es el mismo que ya está publicado (ignorando la marca de
    // tiempo) y no vienen imágenes nuevas, no se toca nada: así el botón se
    // puede pulsar dos veces sin llenar el historial de commits vacíos.
    $rutaCatalogo = __DIR__ . '/catalogo.json';
    $previo = is_file($rutaCatalogo) ? json_decode((string) file_get_contents($rutaCatalogo), true) : null;
    if (is_array($previo) && !$escritas) {
        $a = $previo;
        $b = $datos;
        unset($a['actualizado'], $b['actualizado']);
        if (json_encode($a) === json_encode($b)) {
            return salir([
                'success' => true,
                'sin_cambios' => true,
                'mensaje' => 'No hay nada nuevo que publicar: el repositorio ya está como tu app.',
                'imagenes' => 0,
            ]);
        }
    }

    $datos['actualizado'] = date('c');
    $temporal = $rutaCatalogo . '.tmp';
    $json = json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (@file_put_contents($temporal, $json) === false || !@rename($temporal, $rutaCatalogo)) {
        @unlink($temporal);
        return salir(['success' => false, 'error' => 'No pude escribir catalogo.json.'], 500);
    }

    // 3) git add SOLO de lo publicado
    $rutas = array_merge(['apps/trickvault/catalogo.json'], $escritas);
    [$cAdd, $sAdd] = git(array_merge(['add', '--'], $rutas));
    if ($cAdd !== 0) {
        return salir(['success' => false, 'error' => 'git add falló: ' . $sAdd], 500);
    }

    [$cPend, $pendiente] = git(['diff', '--cached', '--name-only']);
    if ($cPend === 0 && trim($pendiente) === '') {
        return salir([
            'success' => true,
            'sin_cambios' => true,
            'mensaje' => 'No hay nada nuevo que publicar: el repositorio ya está como tu app.',
            'imagenes' => count($escritas),
        ]);
    }

    $mensaje = trim($_POST['mensaje'] ?? '');
    if ($mensaje === '') $mensaje = 'publicar: cambios de TrickVault desde modo edición';
    // Sin depender de mbstring: quitar saltos y recortar.
    $mensaje = substr(preg_replace('/[\r\n\t]+/', ' ', $mensaje), 0, 120);

    [$cCommit, $sCommit] = git([
        '-c', 'user.name=TrickVault', '-c', 'user.email=trickvault@atnojs.es',
        'commit', '-m', $mensaje, '--', ...$rutas,
    ]);
    if ($cCommit !== 0 && stripos($sCommit, 'nothing to commit') === false) {
        return salir(['success' => false, 'error' => 'git commit falló: ' . $sCommit], 500);
    }

    [$cHash, $hash] = git(['rev-parse', '--short', 'HEAD']);

    // 4) push con el token en la URL, que nunca se imprime
    $token = entorno('PUBLICAR_TOKEN');
    $repo = entorno('PUBLICAR_REPO', 'atnojs/ANTIGRAVITY');
    $rama = entorno('PUBLICAR_RAMA', 'main');
    // PUBLICAR_URL_PUSH permite apuntar a otro remoto (pruebas locales); en
    // producción se usa el remoto de GitHub con el token.
    $url = entorno('PUBLICAR_URL_PUSH', 'https://x-access-token:' . rawurlencode($token) . '@github.com/' . $repo . '.git');
    [$cPush, $sPush] = git(['push', $url, 'HEAD:' . $rama], 90);

    return salir([
        'success' => $cPush === 0,
        'error' => $cPush === 0 ? null : 'git push falló: ' . $sPush,
        'commit' => $cHash === 0 ? $hash : null,
        'mensaje' => $mensaje,
        'rutas' => $rutas,
        'imagenes' => count($escritas),
        'push' => $sPush,
    ], $cPush === 0 ? 200 : 500);
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
