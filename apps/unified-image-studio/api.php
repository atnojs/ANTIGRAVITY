<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/bootstrap.php';
require_once __DIR__ . '/lib/jobs.php';
require_once __DIR__ . '/lib/flow-engine.php';

$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$action = strtolower(trim((string)($_REQUEST['action'] ?? 'state')));

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* Fuerza JSON en las escrituras: evita POST de formularios externos.
   Las rutas del agente usan multipart y se autentican con su propia credencial;
   agent.complete envía el archivo en multipart para superar el límite de JSON. */
if ($method === 'POST' && !str_starts_with($action, 'agent.')) {
    $requestedWith = strtolower((string)($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));
    if ($requestedWith !== 'xmlhttprequest') {
        uis_fail(403, 'Solicitud no reconocida.');
    }
}

$db = uis_db();

/**
 * Cuerpo mayor que post_max_size: PHP descarta el cuerpo y deja $_POST vacío.
 * Solo se comprueba para JSON: las descargas del agente son formularios
 * multipart acotados por sus propios límites.
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
        uis_require_auth();
        $pricing = uis_pricing();
        $models = uis_catalog();
        uis_json(200, [
            'ok' => true,
            'models' => array_keys($models),
            'pricingConfigured' => $pricing !== [],
            'pricing' => $pricing,
            'providers' => [
                'openai' => uis_env('OPENAI_API_KEY', 'O') !== '',
                'openrouter' => uis_env('R') !== '',
            ],
        ]);
        break;

    case 'resource':
        uis_require_auth();
        $id = (string)($_GET['id'] ?? '');
        if (!uis_safe_id($id)) uis_fail(400, 'Identificador no válido.');
        $stmt = $db->prepare('SELECT * FROM resources WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) uis_fail(404, 'El recurso no existe.');
        $path = uis_resource_dir() . '/' . basename((string)$row['filename']);
        if (!is_file($path)) uis_fail(404, 'El archivo del recurso no está disponible.');
        header('Content-Type: ' . $row['mime']);
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: inline; filename="' . basename((string)$row['filename']) . '"');
        header("Content-Security-Policy: default-src 'none'; sandbox");
        header('Cache-Control: private, max-age=86400');
        readfile($path);
        exit;

    case 'resource.upload':
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        $id = (string)($body['id'] ?? '');
        if (!uis_safe_id($id)) uis_fail(400, 'Identificador no válido.');
        try {
            $image = uis_decode_image((string)($body['data'] ?? ''));
        } catch (Throwable $error) {
            uis_fail((int)($error->getCode() ?: 400), $error->getMessage());
        }
        $ext = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'][$image['mime']];
        $filename = $id . '.' . $ext;
        uis_write_file(uis_resource_dir() . '/' . $filename, $image['binary']);
        $stmt = $db->prepare(
            'INSERT INTO resources (id, project_id, name, mime, size, width, height, filename, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name, mime = excluded.mime, size = excluded.size,
                width = excluded.width, height = excluded.height, filename = excluded.filename'
        );
        $stmt->execute([
            $id,
            $body['projectId'] ?? null,
            mb_substr((string)($body['name'] ?? 'imagen'), 0, 160),
            $image['mime'],
            strlen($image['binary']),
            $image['width'],
            $image['height'],
            $filename,
            time(),
        ]);
        uis_json(200, ['ok' => true, 'id' => $id, 'url' => 'api.php?action=resource&id=' . urlencode($id)]);
        break;

    case 'project.list':
        uis_require_auth();
        $rows = $db->query('SELECT id, name, doc_id, version, created_at, updated_at FROM projects ORDER BY updated_at DESC LIMIT 200')->fetchAll();
        uis_json(200, ['ok' => true, 'projects' => array_map(static fn(array $row): array => [
            'id' => $row['id'], 'name' => $row['name'], 'docId' => $row['doc_id'],
            'version' => (int)$row['version'], 'updatedAt' => (int)$row['updated_at'],
        ], $rows)]);
        break;

    case 'project.get':
        uis_require_auth();
        $id = (string)($_GET['id'] ?? '');
        if (!uis_safe_id($id)) uis_fail(400, 'Identificador no válido.');
        $stmt = $db->prepare('SELECT * FROM projects WHERE id = ?');
        $stmt->execute([$id]);
        $project = $stmt->fetch();
        if (!$project) uis_fail(404, 'El proyecto no existe en el servidor.');
        $stmt = $db->prepare('SELECT * FROM documents WHERE id = ?');
        $stmt->execute([$project['doc_id']]);
        $document = $stmt->fetch();
        uis_json(200, [
            'ok' => true,
            'version' => (int)$project['version'],
            'updatedAt' => (int)$project['updated_at'],
            'doc' => $document ? json_decode((string)$document['json'], true) : null,
        ]);
        break;

    case 'project.save':
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        $project = $body['project'] ?? null;
        $doc = $body['doc'] ?? null;
        if (!is_array($project) || !is_array($doc) || !uis_safe_id((string)($project['id'] ?? ''))) {
            uis_fail(400, 'Faltan datos del proyecto o del documento.');
        }
        if (!uis_safe_id((string)($doc['id'] ?? ''))) uis_fail(400, 'El documento no tiene un identificador válido.');
        if ((int)($doc['width'] ?? 0) < 1 || (int)($doc['height'] ?? 0) < 1) uis_fail(400, 'El documento no tiene dimensiones válidas.');

        $baseVersion = (int)($body['baseVersion'] ?? 0);
        $force = !empty($body['force']);

        $stmt = $db->prepare('SELECT version, doc_id FROM projects WHERE id = ?');
        $stmt->execute([(string)$project['id']]);
        $existing = $stmt->fetch();
        $currentVersion = $existing ? (int)$existing['version'] : 0;
        if ($existing && !$force && $baseVersion < $currentVersion) {
            uis_json(409, [
                'ok' => false,
                'error' => 'Hay una versión más reciente guardada desde otro dispositivo.',
                'version' => $currentVersion,
            ]);
        }
        $nextVersion = $currentVersion + 1;
        $now = time();
        $db->beginTransaction();
        try {
            $stmt = $db->prepare(
                'INSERT INTO projects (id, name, doc_id, version, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET name = excluded.name, doc_id = excluded.doc_id,
                    version = excluded.version, updated_at = excluded.updated_at'
            );
            $stmt->execute([
                (string)$project['id'],
                mb_substr((string)($project['name'] ?? 'Proyecto'), 0, 120),
                (string)$doc['id'],
                $nextVersion,
                $now,
                $now,
            ]);
            $stmt = $db->prepare(
                'INSERT INTO documents (id, project_id, json, version, updated_at) VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET json = excluded.json, version = excluded.version, updated_at = excluded.updated_at'
            );
            $stmt->execute([
                (string)$doc['id'],
                (string)$project['id'],
                json_encode($doc, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                $nextVersion,
                $now,
            ]);
            $db->commit();
        } catch (Throwable $error) {
            $db->rollBack();
            uis_fail(500, 'No se pudo guardar el proyecto.');
        }
        uis_json(200, ['ok' => true, 'version' => $nextVersion, 'updatedAt' => $now]);
        break;

    case 'version.list':
        uis_require_auth();
        $projectId = (string)($_GET['projectId'] ?? '');
        $stmt = $db->prepare('SELECT id, project_id, label, created_at FROM versions WHERE project_id = ? ORDER BY created_at DESC LIMIT 50');
        $stmt->execute([$projectId]);
        uis_json(200, ['ok' => true, 'versions' => $stmt->fetchAll()]);
        break;

    case 'version.save':
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        $id = (string)($body['id'] ?? '');
        if (!uis_safe_id($id)) uis_fail(400, 'Identificador no válido.');
        $stmt = $db->prepare('INSERT OR REPLACE INTO versions (id, project_id, label, json, created_at) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([
            $id,
            (string)($body['projectId'] ?? ''),
            mb_substr((string)($body['label'] ?? 'Versión'), 0, 120),
            json_encode($body['doc'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            time(),
        ]);
        uis_json(200, ['ok' => true]);
        break;

    case 'version.get':
        uis_require_auth();
        $id = (string)($_GET['id'] ?? '');
        if (!uis_safe_id($id)) uis_fail(400, 'Identificador no válido.');
        $stmt = $db->prepare('SELECT * FROM versions WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) uis_fail(404, 'La versión no existe.');
        uis_json(200, [
            'ok' => true,
            'version' => [
                'id' => $row['id'],
                'projectId' => $row['project_id'],
                'label' => $row['label'],
                'at' => (int)$row['created_at'] * 1000,
                'doc' => json_decode((string)$row['json'], true),
            ],
        ]);
        break;

    case 'budget.get':
        uis_require_auth();
        $projectId = (string)($_GET['projectId'] ?? '');
        $spent = uis_spent($db, $projectId !== '' ? $projectId : null);
        $sessionLimit = uis_budget($db, 'session', 5.0);
        $projectLimit = uis_budget($db, 'project:' . ($projectId !== '' ? $projectId : 'null'), 20.0);
        $operationLimit = uis_budget($db, 'operation', 1.5);
        uis_json(200, ['ok' => true, 'budget' => [
            'sessionLimit' => $sessionLimit,
            'projectLimit' => $projectLimit,
            'operationLimit' => $operationLimit,
            'sessionSpent' => $spent['session'],
            'projectSpent' => $spent['project'],
            'pending' => $spent['pending'],
            'remaining' => max(0, min($sessionLimit - $spent['session'], $projectLimit - $spent['project'])),
            'currency' => 'EUR',
        ]]);
        break;

    case 'budget.set':
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        $scopeProject = (string)($body['projectId'] ?? 'null');
        $pairs = [
            'session' => (float)($body['sessionLimit'] ?? 5),
            'project:' . $scopeProject => (float)($body['projectLimit'] ?? 20),
            'operation' => (float)($body['operationLimit'] ?? 1.5),
        ];
        $stmt = $db->prepare('INSERT INTO budgets (scope, limit_amount, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(scope) DO UPDATE SET limit_amount = excluded.limit_amount, updated_at = excluded.updated_at');
        foreach ($pairs as $scope => $value) {
            $stmt->execute([$scope, max(0.0, $value), time()]);
        }
        // Devuelve el presupuesto resultante para que la interfaz no quede a ciegas.
        $spent = uis_spent($db, $scopeProject !== 'null' ? $scopeProject : null);
        uis_json(200, ['ok' => true, 'budget' => [
            'sessionLimit' => uis_budget($db, 'session', 5.0),
            'projectLimit' => uis_budget($db, 'project:' . $scopeProject, 20.0),
            'operationLimit' => uis_budget($db, 'operation', 1.5),
            'sessionSpent' => $spent['session'],
            'projectSpent' => $spent['project'],
            'pending' => $spent['pending'],
            'remaining' => max(0, min(
                uis_budget($db, 'session', 5.0) - $spent['session'],
                uis_budget($db, 'project:' . $scopeProject, 20.0) - $spent['project']
            )),
            'currency' => 'EUR',
        ]]);
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

    /* ── Google Flow: motor preferente (cola persistente + agente del PC) ── */

    case 'flow.state':
        uis_require_auth();
        uis_json(200, uis_flow_state($db));
        break;

    case 'flow.create':
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        $pending = (int)$db->query("SELECT COUNT(*) FROM flow_jobs WHERE status IN ('queued','running')")->fetchColumn();
        if ($pending >= UIS_FLOW_QUEUE_MAX) {
            uis_fail(429, 'La cola de Flow está llena (' . $pending . ' trabajos pendientes). Espera a que termine alguno.');
        }
        // Los vídeos consumen puntos del servicio: se limitan por separado.
        $isVideo = ((string)($body['type'] ?? 'image')) === 'video';
        if ($isVideo) {
            $videos = (int)$db->query("SELECT COUNT(*) FROM flow_jobs WHERE type = 'video' AND status IN ('queued','running')")->fetchColumn();
            if ($videos >= UIS_FLOW_VIDEO_QUEUE_MAX) {
                uis_fail(429, 'Ya hay ' . $videos . ' vídeos en la cola. Espera a que termine alguno antes de encargar otro.');
            }
        }
        try {
            $created = uis_flow_create($db, $body);
        } catch (InvalidArgumentException $error) {
            uis_fail((int)($error->getCode() ?: 400), $error->getMessage());
        } catch (LengthException $error) {
            uis_fail(413, $error->getMessage());
        }
        uis_json(200, ['ok' => true] + $created);
        break;

    case 'flow.list':
        uis_require_auth();
        uis_flow_sweep($db);
        // Si el PC murió a mitad, aquí se marca «pendiente de comprobar»:
        // el usuario ve el estado real aunque el agente no vuelva.
        uis_flow_expire($db);
        $limit = max(1, min(60, (int)($_GET['limit'] ?? 24)));
        $type = (string)($_GET['type'] ?? '');
        // Los trabajos cancelados no se muestran en la biblioteca: la persona ya
        // ha pedido que desaparezcan.
        $sql = "SELECT * FROM flow_jobs WHERE status <> 'cancelled'";
        $params = [];
        if ($type === 'image' || $type === 'video') {
            $sql .= ' AND type = ?';
            $params[] = $type;
        }
        $sql .= ' ORDER BY created_at DESC LIMIT ' . $limit;
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $seen = uis_flow_worker_seen($db);
        $jobs = array_map(
            static fn(array $row): array => uis_flow_decorate_timing(uis_flow_public_row($row), $seen),
            $stmt->fetchAll()
        );
        uis_json(200, ['ok' => true, 'jobs' => $jobs, 'workerOnline' => $seen > 0 && (time() - $seen) < UIS_FLOW_AGENT_FRESH, 'workerSeen' => $seen]);
        break;

    case 'flow.status':
        uis_require_auth();
        uis_flow_expire($db);
        $ids = [];
        foreach (explode(',', (string)($_GET['ids'] ?? '')) as $id) {
            $id = trim($id);
            if (uis_safe_id($id)) $ids[] = $id;
        }
        if ($ids === []) uis_fail(400, 'Faltan identificadores.');
        $ids = array_slice(array_unique($ids), 0, 24);
        $sql = 'SELECT * FROM flow_jobs WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')';
        $stmt = $db->prepare($sql);
        $stmt->execute($ids);
        $seen = uis_flow_worker_seen($db);
        $jobs = [];
        foreach ($stmt->fetchAll() as $row) {
            $jobs[] = uis_flow_decorate_timing(uis_flow_public_row($row), $seen);
        }
        uis_json(200, [
            'ok' => true,
            'jobs' => $jobs,
            'workerOnline' => $seen > 0 && (time() - $seen) < UIS_FLOW_AGENT_FRESH,
            'workerSeen' => $seen,
        ]);
        break;

    case 'flow.file':
        // El agente también puede descargar el resultado (verificación manual).
        if (!uis_authenticated() && !uis_flow_agent_token_matches((string)($_SERVER['HTTP_X_UIS_AGENT'] ?? ''))) {
            uis_fail(401, 'Sesión no autorizada. Inicia sesión para continuar.', ['needsLogin' => true]);
        }
        $id = preg_replace('/[^a-f0-9]/', '', strtolower((string)($_GET['id'] ?? ''))) ?? '';
        if ($id === '' || strlen($id) !== 16) uis_fail(400, 'Identificador no válido.');
        $stmt = $db->prepare('SELECT * FROM flow_jobs WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row || ($row['status'] ?? '') !== 'done' || empty($row['file'])) uis_fail(404, 'El resultado no está disponible.');
        $path = uis_flow_result_dir() . '/' . basename((string)$row['file']);
        if (!is_file($path)) uis_fail(404, 'El archivo del resultado no está disponible.');
        $size = (int)filesize($path);
        $mime = (string)($row['mime'] ?? 'application/octet-stream');
        $name = $id . '.' . pathinfo($path, PATHINFO_EXTENSION);
        $download = (string)($_GET['download'] ?? '') === '1';
        header('Content-Type: ' . $mime);
        header('Content-Disposition: ' . ($download ? 'attachment' : 'inline') . '; filename="' . $name . '"');
        // Los resultados son privados: caché corta y revalidable. Un immutable de un
        // año dejaba el archivo en el navegador después de cerrar sesión.
        header('Cache-Control: private, max-age=600, must-revalidate');
        header('X-Content-Type-Options: nosniff');
        if (str_starts_with($mime, 'video/')) header('Accept-Ranges: bytes');
        $start = 0;
        $end = $size - 1;
        $range = (string)($_SERVER['HTTP_RANGE'] ?? '');
        if ($range !== '' && preg_match('/bytes=(\d*)-(\d*)/', $range, $match) === 1) {
            if ($match[1] === '' && $match[2] !== '') {
                $start = max(0, $size - (int)$match[2]);
            } else {
                $start = $match[1] === '' ? 0 : (int)$match[1];
                $end = $match[2] === '' ? $size - 1 : min((int)$match[2], $size - 1);
            }
            if ($start > $end || $start >= $size) {
                header('Content-Range: bytes */' . $size);
                http_response_code(416);
                exit;
            }
            http_response_code(206);
            header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
        }
        header('Content-Length: ' . ($end - $start + 1));
        $handle = fopen($path, 'rb');
        if ($handle === false) uis_fail(500, 'No se pudo leer el archivo.');
        fseek($handle, $start);
        $left = $end - $start + 1;
        while ($left > 0 && !feof($handle)) {
            $chunk = fread($handle, (int)min(262144, $left));
            if ($chunk === false || $chunk === '') break;
            echo $chunk;
            $left -= strlen($chunk);
        }
        fclose($handle);
        exit;

    case 'flow.cancel':
        // Parar una generación: se borra si no había empezado y se marca para que
        // el agente cierre Chrome si estaba generando.
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        try {
            $cancelado = uis_flow_cancel($db, (string)($body['id'] ?? ''));
        } catch (InvalidArgumentException $error) {
            uis_fail((int)($error->getCode() ?: 400), $error->getMessage());
        }
        uis_json(200, $cancelado);
        break;

    case 'agent.cancelled':
        // El agente pregunta si debe parar. Es barato y no toca el latido.
        uis_flow_require_agent();
        $id = (string)($_GET['id'] ?? ($_POST['id'] ?? ''));
        uis_json(200, ['ok' => true, 'cancel' => uis_flow_cancelled($db, $id)]);
        break;
    case 'flow.retry':
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        try {
            $job = uis_flow_schedule($db, (string)($body['id'] ?? ''));
        } catch (InvalidArgumentException $error) {
            uis_fail((int)($error->getCode() ?: 400), $error->getMessage());
        }
        uis_json(200, ['ok' => true, 'job' => uis_flow_decorate_timing($job, uis_flow_worker_seen($db))]);
        break;

    case 'flow.delete':
        uis_require_auth();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $body = uis_read_json();
        try {
            uis_flow_delete($db, (string)($body['id'] ?? ''));
        } catch (InvalidArgumentException $error) {
            uis_fail((int)($error->getCode() ?: 400), $error->getMessage());
        }
        uis_json(200, ['ok' => true]);
        break;

    /* ── API del agente del PC (credencial independiente, nunca la sesión) ── */

    case 'agent.claim':
        uis_flow_require_agent();
        $job = uis_flow_claim($db);
        uis_json(200, ['ok' => true, 'job' => $job, 'seen' => time()]);
        break;

    case 'agent.ping':
        // Comprobar la credencial SIN marcar el PC como conectado: si no hay
        // agente corriendo, la web no debe decir «Flow: conectado».
        uis_flow_require_agent();
        uis_json(200, ['ok' => true, 'version' => UIS_VERSION, 'now' => time()]);
        break;

    case 'agent.release':
        // Fallo pasajero (perfil de Chrome ocupado): el trabajo vuelve a la cola
        // sin contar como fallo, salvo que ya se haya aplazado demasiadas veces.
        uis_flow_require_agent();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $isMultipart = str_contains(strtolower((string)($_SERVER['CONTENT_TYPE'] ?? '')), 'multipart/form-data');
        $body = $isMultipart ? $_POST : uis_read_json();
        try {
            $resultado = uis_flow_release($db, (string)($body['id'] ?? ''), (string)($body['error'] ?? ''));
        } catch (InvalidArgumentException $error) {
            uis_fail((int)($error->getCode() ?: 400), $error->getMessage());
        }
        uis_json(200, $resultado);
        break;

    case 'agent.heartbeat':
        uis_flow_require_agent();
        uis_json(200, uis_flow_heartbeat($db, (string)($_REQUEST['note'] ?? '')));
        break;

    case 'agent.complete':
    case 'agent.fail':
        uis_flow_require_agent();
        if ($method !== 'POST') uis_fail(405, 'Método no permitido.');
        $isMultipart = str_contains(strtolower((string)($_SERVER['CONTENT_TYPE'] ?? '')), 'multipart/form-data');
        if ($isMultipart) {
            $id = (string)($_POST['id'] ?? '');
            // El agente sube los bytes crudos en el campo file_upload o file_image.
            $file = $_FILES['file_upload'] ?? $_FILES['file_image'] ?? null;
            if (is_array($file) && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                uis_fail(400, 'La subida del archivo falló (código ' . (int)$file['error'] . ').');
            }
            if (is_array($file) && is_string($file['tmp_name'] ?? null) && is_file($file['tmp_name'])) {
                if ((int)$file['size'] > UIS_FLOW_VIDEO_BYTES) {
                    uis_fail(413, 'El archivo supera el tamaño permitido.');
                }
                $raw = (string)file_get_contents($file['tmp_name']);
                // El campo describe el archivo recibido. El tipo del trabajo
                // decide después si es imagen o vídeo: un PNG no es MP4.
                $isVideoFile = strlen($raw) > 12 && substr($raw, 4, 4) === 'ftyp';
                $body = $isVideoFile
                    ? ['video' => $raw, 'image' => '', 'raw' => true]
                    : ['video' => '', 'image' => $raw, 'raw' => true];
            } else {
                $body = [
                    'video' => (string)($_POST['video'] ?? ''),
                    'image' => (string)($_POST['image'] ?? ''),
                ];
            }
            if ($action === 'agent.fail') {
                uis_json(200, uis_flow_fail($db, $id, (string)($_POST['error'] ?? '')));
            }
        } else {
            $body = uis_read_json();
            $id = (string)($body['id'] ?? '');
            if ($action === 'agent.fail') {
                uis_json(200, uis_flow_fail($db, $id, (string)($body['error'] ?? '')));
            }
        }
        if (!uis_safe_id($id)) uis_fail(400, 'Identificador no válido.');
        try {
            $job = uis_flow_finish($db, $id, $body);
        } catch (InvalidArgumentException $error) {
            uis_fail((int)($error->getCode() ?: 400), $error->getMessage());
        } catch (LengthException $error) {
            uis_fail(413, $error->getMessage());
        } catch (RuntimeException $error) {
            uis_fail(500, $error->getMessage());
        }
        uis_json(200, ['ok' => true, 'job' => $job]);
        break;

    default:
        uis_fail(404, 'Acción no reconocida.');
}
