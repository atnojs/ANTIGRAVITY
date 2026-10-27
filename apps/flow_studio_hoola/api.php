<?php
declare(strict_types=1);

/**
 * api.php — modelos directos de Flow Studio.
 *
 * Aquí viven la sesión de acceso y los trabajos de los proveedores directos
 * (OpenAI, Gemini y Qwen). Es el MISMO contrato que Unified Image Studio · Hoola:
 *   - la contraseña es la de acceso del proyecto (PW_ACCESS, auth/lib.php);
 *   - los trabajos pasan por lib/jobs.php (idempotencia, presupuesto, registro)
 *     y el catálogo canónico de lib/canonical-image-model.php;
 *   - las claves (OPENAI_API_KEY / O y R) solo se leen del entorno del servidor.
 *
 * La cola de Google Flow NO se toca aquí: sigue en flow_queue.php y la ejecuta
 * el worker del PC. Este endpoint no habla con Flow.
 */

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/jobs.php';

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = strtolower(trim((string)($_REQUEST['action'] ?? 'state')));

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* Fuerza JSON en las escrituras: evita POST de formularios externos. */
if ($method === 'POST' && strtolower((string)($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')) !== 'xmlhttprequest') {
    uis_fail(403, 'Solicitud no reconocida.');
}

/**
 * Cuerpo mayor que post_max_size: PHP descarta el cuerpo y deja $_POST vacío.
 * Se comprueba solo para JSON para poder devolver el motivo real.
 */
$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
$postMax = uis_ini_bytes((string)ini_get('post_max_size'));
$isJsonRequest = str_contains(strtolower((string)($_SERVER['CONTENT_TYPE'] ?? '')), 'application/json');
if ($isJsonRequest && $postMax > 0 && $contentLength > $postMax) {
    uis_json(413, [
        'ok' => false,
        'error' => sprintf(
            'La solicitud ocupa %s y el servidor admite %s por petición (post_max_size). Reduce la imagen o sube ese límite en el hosting.',
            number_format($contentLength / 1048576, 1, ',', '.') . ' MB',
            number_format($postMax / 1048576, 1, ',', '.') . ' MB'
        ),
    ]);
}

$db = uis_db();

switch ($action) {
    case 'state':
        uis_session_start();
        $authenticated = uis_authenticated();
        $payload = [
            'ok' => true,
            'version' => UIS_VERSION,
            'authenticated' => $authenticated,
            'configured' => uis_password_configured(),
            'needsSetup' => !uis_password_configured(),
            'sharedSession' => uis_auth_lib(),
            'maxImageBytes' => uis_max_image_bytes(),
        ];
        // El detalle del entorno solo se expone a una sesión válida.
        if ($authenticated) {
            $payload['php'] = PHP_VERSION;
            $payload['sqlite'] = extension_loaded('pdo_sqlite');
            $payload['curl'] = function_exists('curl_init');
        }
        uis_json(200, $payload);
        break;

    case 'login':
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        if (uis_rate_limited($db)) uis_fail(429, 'Demasiados intentos. Espera unos minutos.');
        $body = uis_read_json();
        $password = (string)($body['password'] ?? '');
        if (!uis_password_configured()) {
            uis_fail(503, 'No hay contraseña configurada en el servidor (.htaccess raíz: PW_ACCESS / PW_EDIT).');
        }
        if (!uis_check_password($password)) {
            uis_register_failure($db);
            uis_fail(401, 'Contraseña incorrecta.');
        }
        uis_session_start();
        session_regenerate_id(true);
        uis_mark_authenticated();
        uis_json(200, ['ok' => true, 'authenticated' => true]);
        break;

    case 'logout':
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        uis_logout();
        uis_json(200, ['ok' => true]);
        break;

    case 'catalog':
        // Mismo contrato que el estudio: modelos canónicos y proveedores activos.
        uis_require_auth();
        $pricing = uis_pricing();
        $models = uis_catalog();
        uis_json(200, [
            'ok' => true,
            'models' => array_keys($models),
            'pricingConfigured' => $pricing !== [],
            'providers' => [
                'openai' => uis_env('OPENAI_API_KEY', 'O') !== '',
                'openrouter' => uis_env('R') !== '',
            ],
        ]);
        break;

    case 'job.create':
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        try {
            $job = uis_job_create($db, $body, (string)($body['idempotencyKey'] ?? ''));
        } catch (UisHttpError $error) {
            uis_json($error->getCode(), ['ok' => false, 'error' => $error->getMessage()] + $error->details);
        }
        $deduplicated = false;
        if (isset($job['deduplicated'])) {
            $deduplicated = true;
            unset($job['deduplicated']);
        }
        uis_json(200, ['ok' => true, 'job' => $job, 'deduplicated' => $deduplicated]);
        break;

    case 'job.cancel':
        // Los proveedores directos se ejecutan dentro de la petición: cancelar
        // aquí solo cierra el registro para que no quede «en curso» para siempre.
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        $id = (string)($body['id'] ?? '');
        if (!uis_safe_id($id)) uis_fail(400, 'Identificador no válido.');
        $stmt = $db->prepare("UPDATE jobs SET status = 'failed', error = 'Cancelado desde la app.', updated_at = ?, completed_at = ? WHERE id = ? AND status IN ('queued','running')");
        $stmt->execute([time(), time(), $id]);
        uis_json(200, ['ok' => true, 'cancelled' => $stmt->rowCount() > 0]);
        break;

    case 'job.get':
        uis_require_auth();
        uis_jobs_sweep($db);
        $id = (string)($_GET['id'] ?? '');
        if (!uis_safe_id($id)) uis_fail(400, 'Identificador no válido.');
        $stmt = $db->prepare('SELECT * FROM jobs WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) uis_fail(404, 'El trabajo no existe.');
        $job = uis_public_job($row);
        $job['prompt'] = (string)$row['prompt'];
        uis_json(200, ['ok' => true, 'job' => $job]);
        break;

    case 'job.list':
        uis_require_auth();
        uis_jobs_sweep($db);
        $status = (string)($_GET['status'] ?? '');
        $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
        $sql = 'SELECT * FROM jobs';
        $params = [];
        if ($status === 'active' || in_array($status, ['queued', 'running'], true)) {
            $sql .= ' WHERE status IN (?, ?)';
            $params = ['queued', 'running'];
        } elseif ($status !== '') {
            $sql .= ' WHERE status = ?';
            $params = [$status];
        }
        $sql .= ' ORDER BY created_at DESC LIMIT ' . $limit;
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $jobs = array_map('uis_public_job', $stmt->fetchAll());
        // La lista no devuelve imágenes en base64 ni el prompt.
        foreach ($jobs as $index => $job) unset($jobs[$index]['image']);
        uis_json(200, ['ok' => true, 'jobs' => $jobs]);
        break;

    default:
        uis_fail(404, 'Acción no reconocida.');
}
