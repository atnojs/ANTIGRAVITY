<?php
declare(strict_types=1);

/**
 * Agenda personal — núcleo compartido.
 *
 * Diseño "sobrio": un único usuario, estado persistente en data/state.json
 * (escritura atómica y bloqueo con flock), audios en data/audio/ fuera de git
 * y denegados por web. Sin base de datos ni dependencias externas.
 *
 * La contraseña (hash) NO se escribe aquí: vive en .private/password-edicion.txt
 * y se puede sobreescribir con la variable de entorno AGENDA_PASSWORD_HASH
 * (sha256 en minúsculas) en el .htaccess raíz de Hostinger.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
date_default_timezone_set('Atlantic/Canary');

const AGENDA_APP            = 'agenda';
const AGENDA_VERSION        = '1.0.0';
const AGENDA_TZ             = 'Atlantic/Canary';
const AGENDA_DATA_DIR       = __DIR__ . '/data';
const AGENDA_STATE_FILE     = AGENDA_DATA_DIR . '/state.json';
const AGENDA_LOCK_FILE      = AGENDA_DATA_DIR . '/state.lock';
const AGENDA_AUDIO_DIR      = AGENDA_DATA_DIR . '/audio';
const AGENDA_MAX_AUDIO_BYTES = 8 * 1024 * 1024;   // 8 MB
const AGENDA_MAX_AUDIO_MS    = 300000;            // 5 minutos
const AGENDA_RETENTION_DAYS  = 30;
const AGENDA_MAX_ATTEMPTS    = 3;

/** Contraseña de edición compartida del proyecto (mismo mecanismo que descargas). */
const AGENDA_PASSWORD_SHA256 = '0c79272e8c147c95bedd7450abfd42cb3377947341694276c5835caeb9f435ee';

class AgendaUserError extends RuntimeException {}

/* ------------------------------------------------------------------ */
/* Salida y almacenamiento                                            */
/* ------------------------------------------------------------------ */

function agenda_send_json(int $status, array $payload, bool $exit = true): void
{
    http_response_code($status);
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: same-origin');
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($exit) {
        exit;
    }
}

function agenda_default_state(): array
{
    return [
        'version' => 1,
        'seq'     => ['event' => 0, 'task' => 0, 'note' => 0, 'audio' => 0],
        'events'  => [],
        'tasks'   => [],
        'notes'   => [],
        'audios'  => [],
    ];
}

function agenda_ensure_storage(): void
{
    foreach ([AGENDA_DATA_DIR, AGENDA_AUDIO_DIR] as $dir) {
        if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('No se pudo preparar el almacenamiento.');
        }
    }
    $htaccess = AGENDA_DATA_DIR . '/.htaccess';
    if (!is_file($htaccess)) {
        @file_put_contents(
            $htaccess,
            "Require all denied\n<IfModule mod_autoindex.c>\n    Options -Indexes\n</IfModule>\n",
            LOCK_EX
        );
    }
    $gitignore = AGENDA_DATA_DIR . '/.gitignore';
    if (!is_file($gitignore)) {
        @file_put_contents($gitignore, "*\n!.gitignore\n!.htaccess\n", LOCK_EX);
    }
}

function agenda_state_read(): array
{
    agenda_ensure_storage();
    $state = agenda_default_state();
    if (!is_file(AGENDA_STATE_FILE)) {
        return $state;
    }
    $raw = @file_get_contents(AGENDA_STATE_FILE);
    if ($raw === false || trim($raw) === '') {
        return $state;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return $state;
    }
    foreach (['seq', 'events', 'tasks', 'notes', 'audios'] as $key) {
        if (isset($data[$key]) && is_array($data[$key])) {
            $state[$key] = $data[$key];
        }
    }
    return $state;
}

function agenda_state_write(array $state): void
{
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) {
        throw new RuntimeException('No se pudo serializar el estado.');
    }
    $tmp = AGENDA_STATE_FILE . '.tmp.' . bin2hex(random_bytes(4));
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
        throw new RuntimeException('No se pudo guardar el estado.');
    }
    if (!@rename($tmp, AGENDA_STATE_FILE)) {
        // Algunos volúmenes de Windows no permiten rename sobre un fichero existente.
        if (!@copy($tmp, AGENDA_STATE_FILE)) {
            @unlink($tmp);
            throw new RuntimeException('No se pudo guardar el estado.');
        }
        @unlink($tmp);
    }
}

/**
 * Lee, muta y guarda el estado bajo un lock exclusivo.
 * El callback recibe el array por referencia y su valor de retorno se devuelve.
 */
function agenda_state_update(callable $mutator)
{
    agenda_ensure_storage();
    $lock = @fopen(AGENDA_LOCK_FILE, 'c');
    if ($lock === false) {
        throw new RuntimeException('No se pudo bloquear el almacenamiento.');
    }
    if (!flock($lock, LOCK_EX)) {
        fclose($lock);
        throw new RuntimeException('No se pudo bloquear el almacenamiento.');
    }
    try {
        $state = agenda_state_read();
        $result = $mutator($state);
        agenda_state_write($state);
        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function agenda_next_id(array &$state, string $entity): int
{
    $state['seq'][$entity] = (int)($state['seq'][$entity] ?? 0) + 1;
    return $state['seq'][$entity];
}

function agenda_find_index(array $list, int $id): int
{
    foreach ($list as $index => $item) {
        if (is_array($item) && (int)($item['id'] ?? 0) === $id) {
            return (int)$index;
        }
    }
    return -1;
}

/** Estado apto para el cliente: sin rutas internas ni hashes de fichero. */
function agenda_public_state(array $state): array
{
    $audios = [];
    foreach ($state['audios'] as $audio) {
        unset($audio['file'], $audio['sha256']);
        $audios[] = $audio;
    }
    return [
        'events' => array_values($state['events']),
        'tasks'  => array_values($state['tasks']),
        'notes'  => array_values($state['notes']),
        'audios' => $audios,
    ];
}

function agenda_meta(): array
{
    return [
        'today' => date('Y-m-d'),
        'now'   => date('H:i'),
        'tz'    => AGENDA_TZ,
        'version' => AGENDA_VERSION,
        'stt_configured' => function_exists('agenda_stt_configured') ? agenda_stt_configured() : false,
        'stt_mock' => function_exists('agenda_stt_mock_enabled') ? agenda_stt_mock_enabled() : false,
    ];
}

/* ------------------------------------------------------------------ */
/* Sesión, autenticación y CSRF                                       */
/* ------------------------------------------------------------------ */

function agenda_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $script = (string)($_SERVER['SCRIPT_NAME'] ?? '/apps/agenda/index.php');
    $dir = rtrim(str_replace('\\', '/', dirname($script)), '/') . '/';
    session_name('agenda_session');
    session_set_cookie_params([
        'lifetime' => 2592000, // 30 días
        'path'     => $dir,
        'secure'   => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function agenda_is_authenticated(): bool
{
    return !empty($_SESSION['agenda_auth']);
}

function agenda_require_auth(): void
{
    if (!agenda_is_authenticated()) {
        agenda_send_json(401, ['ok' => false, 'error' => 'Sesión no iniciada.']);
    }
}

function agenda_csrf_token(): string
{
    if (empty($_SESSION['agenda_csrf']) || !is_string($_SESSION['agenda_csrf'])) {
        $_SESSION['agenda_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['agenda_csrf'];
}

function agenda_require_csrf(): void
{
    $provided = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf'] ?? ''));
    $expected = (string)($_SESSION['agenda_csrf'] ?? '');
    if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
        agenda_send_json(403, ['ok' => false, 'error' => 'Token de seguridad caducado. Recarga la página e inténtalo de nuevo.']);
    }
}

function agenda_password_hash(): string
{
    $fromEnv = getenv('AGENDA_PASSWORD_HASH');
    if (is_string($fromEnv) && preg_match('/^[a-f0-9]{64}$/i', trim($fromEnv)) === 1) {
        return strtolower(trim($fromEnv));
    }
    return AGENDA_PASSWORD_SHA256;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function agenda_now(): string
{
    return date('c');
}

function agenda_request_method(): string
{
    return strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
}

/** Cuerpo de la petición: JSON o formulario, sin asumir un único formato. */
function agenda_request_payload(): array
{
    $contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (strpos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw === false ? '' : $raw, true);
        return is_array($data) ? $data : [];
    }
    return $_POST;
}

function agenda_header(string $name): string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    return (string)($_SERVER[$key] ?? '');
}

function agenda_today(): string
{
    return date('Y-m-d');
}

function agenda_clean_string($value, int $maxLength): string
{
    $value = is_string($value) ? $value : '';
    $value = trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLength, 'UTF-8');
    }
    return substr($value, 0, $maxLength);
}

function agenda_multiline_string($value, int $maxLength): string
{
    $value = is_string($value) ? $value : '';
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = trim($value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLength, 'UTF-8');
    }
    return substr($value, 0, $maxLength);
}

function agenda_valid_date($value): ?string
{
    if (!is_string($value) || preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m) !== 1) {
        return null;
    }
    return checkdate((int)$m[2], (int)$m[3], (int)$m[1]) ? $value : null;
}

function agenda_valid_time($value): ?string
{
    if (!is_string($value) || preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $value, $m) !== 1) {
        return null;
    }
    return $value;
}

function agenda_add_minutes(string $time, int $minutes): string
{
    $parts = explode(':', $time);
    $total = ((int)$parts[0]) * 60 + (int)($parts[1] ?? 0) + $minutes;
    $total = max(0, min(23 * 60 + 59, $total));
    return sprintf('%02d:%02d', intdiv($total, 60), $total % 60);
}

function timeToMinutes(string $time): int
{
    $parts = explode(':', $time);
    return ((int)$parts[0]) * 60 + (int)($parts[1] ?? 0);
}

function agenda_lower(string $text): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
}

function agenda_upper_first(string $text): string
{
    if ($text === '') {
        return '';
    }
    if (function_exists('mb_substr') && function_exists('mb_strtoupper')) {
        return mb_strtoupper(mb_substr($text, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($text, 1, null, 'UTF-8');
    }
    return ucfirst($text);
}

/** Pliega acentos para analizar texto en español sin depender del locale. */
function agenda_fold(string $text): string
{
    $map = [
        'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n',
        'Á' => 'a', 'É' => 'e', 'Í' => 'i', 'Ó' => 'o', 'Ú' => 'u', 'Ü' => 'u', 'Ñ' => 'n',
    ];
    return agenda_lower(strtr($text, $map));
}

function agenda_finish_request(): void
{
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
        return;
    }
    if (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
        return;
    }
    while (ob_get_level() > 0) {
        @ob_end_flush();
    }
    @flush();
}

/* ------------------------------------------------------------------ */
/* Validación de entidades                                            */
/* ------------------------------------------------------------------ */

function agenda_event_from_input(array $input): array
{
    $title = agenda_clean_string($input['title'] ?? '', 160);
    if ($title === '') {
        throw new AgendaUserError('El título de la cita es obligatorio.');
    }
    $date = agenda_valid_date($input['date'] ?? '');
    if ($date === null) {
        throw new AgendaUserError('La fecha de la cita no es válida.');
    }
    $allDay = !empty($input['all_day']);
    $start = $allDay ? '' : (agenda_valid_time($input['start'] ?? '') ?? '');
    if (!$allDay && $start === '') {
        throw new AgendaUserError('Indica la hora de inicio de la cita.');
    }
    $end = $allDay ? '' : (agenda_valid_time($input['end'] ?? '') ?? '');
    if (!$allDay && $end === '') {
        $end = agenda_add_minutes($start === '' ? '00:00' : $start, 60);
    }
    if (!$allDay && $end !== '' && $end <= $start) {
        throw new AgendaUserError('La hora de fin debe ser posterior a la de inicio.');
    }
    $color = (int)($input['color'] ?? 0);
    return [
        'title'       => $title,
        'description' => agenda_multiline_string($input['description'] ?? '', 2000),
        'date'        => $date,
        'start'       => $start,
        'end'         => $end,
        'all_day'     => $allDay,
        'color'       => max(0, min(4, $color)),
    ];
}

function agenda_task_from_input(array $input): array
{
    $title = agenda_clean_string($input['title'] ?? '', 200);
    if ($title === '') {
        throw new AgendaUserError('El título de la tarea es obligatorio.');
    }
    $due = $input['due_date'] ?? '';
    $dueDate = ($due === '' || $due === null) ? null : agenda_valid_date($due);
    if ($due !== '' && $due !== null && $dueDate === null) {
        throw new AgendaUserError('La fecha de la tarea no es válida.');
    }
    $priority = (int)($input['priority'] ?? 2);
    if (!in_array($priority, [1, 2, 3], true)) {
        $priority = 2;
    }
    return [
        'title'    => $title,
        'notes'    => agenda_multiline_string($input['notes'] ?? '', 2000),
        'due_date' => $dueDate,
        'priority' => $priority,
    ];
}

/* ------------------------------------------------------------------ */
/* Analizador de transcripciones (reglas en español)                  */
/* ------------------------------------------------------------------ */

function agenda_classify(string $text): array
{
    $result = [
        'type'       => 'note',
        'title'      => '',
        'date'       => null,
        'start'      => null,
        'end'        => null,
        'due_date'   => null,
        'priority'   => 2,
        'confidence' => 0.30,
        'reason'     => 'Sin fecha ni acción detectada.',
    ];
    $source = trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    if ($source === '') {
        $result['title'] = 'Nota de voz';
        return $result;
    }
    $folded = agenda_fold($source);
    $today = new DateTimeImmutable('today', new DateTimeZone(AGENDA_TZ));

    $dateInfo = agenda_extract_date($folded, $today);
    $timeInfo = agenda_extract_time($folded);

    $meeting = agenda_first_match($folded, [
        '/\b(reunion|cita|dentista|medic[oa]|doctora?|clase|curso|entrevista|presentacion|examen|comida|cena|desayuno|cafe|gimnasio|entrenamiento|peluqueria|banco|tramite|firma|visita|boda|cumpleanos|concierto|teatro|veterinari[oa])\b/',
    ]);
    $action = agenda_first_match($folded, [
        '/\b(comprar|pagar|llamar|enviar|mandar|recoger|reservar|renovar|terminar|acabar|revisar|preparar|escribir|responder|buscar|pedir|coger|hacer|limpiar|estudiar|entregar|devolver|apuntar|recordar|recordarme|recuerdame|necesito|tengo que|hay que|ir a|pasarme|acercarme|hablar con|quedar con)\b/',
    ]);
    $urgent = agenda_first_match($folded, [
        '/\b(urgente|urgentisimo|cuanto antes|prioritario|prioridad alta|importante|no se me olvide|sin falta)\b/',
    ]);
    if ($urgent !== null) {
        $result['priority'] = 3;
    }

    $hasDate = $dateInfo !== null;
    $hasTime = $timeInfo !== null;

    if ($hasDate || $hasTime) {
        if ($hasTime && ($meeting !== null || $hasDate)) {
            $result['type'] = 'event';
        } elseif ($action !== null || $hasDate) {
            $result['type'] = 'task';
        }
    } elseif ($action !== null) {
        $result['type'] = 'task';
    }

    if ($result['type'] === 'event') {
        $date = $hasDate ? $dateInfo['date'] : $today->format('Y-m-d');
        $start = $hasTime ? $timeInfo['time'] : '09:00';
        // "el lunes" dicho un lunes por la tarde se refiere al lunes siguiente.
        if ($hasDate && $hasTime && !empty($dateInfo['weekday']) && $date === $today->format('Y-m-d')) {
            $now = new DateTimeImmutable('now', new DateTimeZone(AGENDA_TZ));
            $nowMinutes = ((int)$now->format('G')) * 60 + (int)$now->format('i');
            if (timeToMinutes($start) <= $nowMinutes) {
                $date = $today->modify('+7 days')->format('Y-m-d');
            }
        }
        $result['date'] = $date;
        $result['start'] = $start;
        $result['end'] = agenda_add_minutes($start, 60);
        $result['confidence'] = ($hasDate && $hasTime) ? 0.85 : 0.62;
        $result['reason'] = 'Cita con ' . ($hasDate ? 'fecha' : 'hora') . ' detectada.';
    } elseif ($result['type'] === 'task') {
        $result['due_date'] = $hasDate ? $dateInfo['date'] : null;
        $result['confidence'] = $hasDate ? 0.72 : 0.55;
        $result['reason'] = $hasDate ? 'Tarea con fecha detectada.' : 'Acción pendiente detectada.';
    }

    $result['title'] = agenda_build_title($source, $result['type'], $meeting);
    if ($result['title'] === '') {
        $result['title'] = $result['type'] === 'event' ? 'Nueva cita' : ($result['type'] === 'task' ? 'Nueva tarea' : 'Nota de voz');
    }
    return $result;
}

function agenda_first_match(string $text, array $patterns): ?array
{
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $text, $m, PREG_OFFSET_CAPTURE) === 1) {
            return ['text' => $m[0][0], 'offset' => (int)$m[0][1]];
        }
    }
    return null;
}

function agenda_extract_date(string $folded, DateTimeImmutable $today): ?array
{
    // "pasado mañana" antes que "mañana".
    if (strpos($folded, 'pasado manana') !== false) {
        return ['date' => $today->modify('+2 days')->format('Y-m-d'), 'label' => 'pasado mañana'];
    }
    $mañanaPos = strpos($folded, 'manana');
    if ($mañanaPos !== false) {
        $before = substr($folded, max(0, $mañanaPos - 8), min(8, $mañanaPos));
        if (!preg_match('/(de la|por la)\s*$/', $before)) {
            return ['date' => $today->modify('+1 day')->format('Y-m-d'), 'label' => 'mañana'];
        }
    }
    if (preg_match('/\bhoy\b/', $folded) === 1) {
        return ['date' => $today->format('Y-m-d'), 'label' => 'hoy'];
    }

    // Día de la semana: la próxima aparición (hoy cuenta si es el mismo día).
    $weekdays = [
        'lunes' => 1, 'martes' => 2, 'miercoles' => 3, 'jueves' => 4,
        'viernes' => 5, 'sabado' => 6, 'domingo' => 7,
    ];
    foreach ($weekdays as $name => $iso) {
        if (preg_match('/\b(?:el|este|proximo|la proxima)?\s*' . $name . '\b/', $folded) === 1) {
            $current = (int)$today->format('N');
            $delta = $iso - $current;
            if ($delta < 0) {
                $delta += 7;
            }
            return ['date' => $today->modify('+' . $delta . ' days')->format('Y-m-d'), 'label' => $name, 'weekday' => true];
        }
    }

    $months = [
        'enero' => 1, 'febrero' => 2, 'marzo' => 3, 'abril' => 4, 'mayo' => 5, 'junio' => 6,
        'julio' => 7, 'agosto' => 8, 'septiembre' => 9, 'setiembre' => 9, 'octubre' => 10,
        'noviembre' => 11, 'diciembre' => 12,
    ];
    foreach ($months as $name => $number) {
        if (preg_match('/\b(\d{1,2}) de ' . $name . '\b/', $folded, $m) === 1) {
            $day = (int)$m[1];
            $year = (int)$today->format('Y');
            $candidate = DateTimeImmutable::createFromFormat('Y-n-j', $year . '-' . $number . '-' . $day, new DateTimeZone(AGENDA_TZ));
            if ($candidate === false || (int)$candidate->format('j') !== $day) {
                return null;
            }
            if ($candidate < $today) {
                $candidate = $candidate->modify('+1 year');
            }
            return ['date' => $candidate->format('Y-m-d'), 'label' => $day . ' de ' . $name];
        }
    }

    if (preg_match('/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/', $folded, $m) === 1) {
        $day = (int)$m[1];
        $month = (int)$m[2];
        $year = isset($m[3]) && $m[3] !== '' ? (int)$m[3] : (int)$today->format('Y');
        if ($year < 100) {
            $year += 2000;
        }
        $candidate = DateTimeImmutable::createFromFormat('Y-n-j', $year . '-' . $month . '-' . $day, new DateTimeZone(AGENDA_TZ));
        if ($candidate !== false && (int)$candidate->format('j') === $day) {
            if ($candidate < $today) {
                $candidate = $candidate->modify('+1 year');
            }
            return ['date' => $candidate->format('Y-m-d'), 'label' => $day . '/' . $month];
        }
    }

    if (preg_match('/\bel (?:dia )?(\d{1,2})\b/', $folded, $m) === 1) {
        $day = (int)$m[1];
        if ($day >= 1 && $day <= 31) {
            $year = (int)$today->format('Y');
            $month = (int)$today->format('n');
            $candidate = DateTimeImmutable::createFromFormat('Y-n-j', $year . '-' . $month . '-' . $day, new DateTimeZone(AGENDA_TZ));
            if ($candidate === false || (int)$candidate->format('j') !== $day) {
                $month++;
                if ($month > 12) {
                    $month = 1;
                    $year++;
                }
                $candidate = DateTimeImmutable::createFromFormat('Y-n-j', $year . '-' . $month . '-' . $day, new DateTimeZone(AGENDA_TZ));
            }
            if ($candidate !== false && (int)$candidate->format('j') === $day) {
                if ($candidate < $today) {
                    $candidate = $candidate->modify('+1 month');
                }
                return ['date' => $candidate->format('Y-m-d'), 'label' => 'el ' . $day];
            }
        }
    }
    return null;
}

function agenda_extract_time(string $folded): ?array
{
    if (preg_match('/\bmediodia\b/', $folded) === 1) {
        return ['time' => '12:00', 'label' => 'mediodía'];
    }
    if (preg_match('/\bmedianoche\b/', $folded) === 1) {
        return ['time' => '00:00', 'label' => 'medianoche'];
    }
    if (preg_match('/\ba las? (\d{1,2})(?:[:.](\d{2}))?\s*(?:(?:de la|por la)\s+(manana|tarde|noche))?/', $folded, $m) === 1) {
        return agenda_time_result((int)$m[1], (int)($m[2] ?? 0), $m[3] ?? '');
    }
    if (preg_match('/\b(\d{1,2}):(\d{2})\b/', $folded, $m) === 1) {
        return agenda_time_result((int)$m[1], (int)$m[2], '');
    }
    if (preg_match('/\b(\d{1,2})\s*(am|pm)\b/', $folded, $m) === 1) {
        $hour = (int)$m[1];
        if ($m[2] === 'pm' && $hour < 12) {
            $hour += 12;
        }
        if ($m[2] === 'am' && $hour === 12) {
            $hour = 0;
        }
        return agenda_time_result($hour, 0, '');
    }
    $words = ['una' => 1, 'dos' => 2, 'tres' => 3, 'cuatro' => 4, 'cinco' => 5, 'seis' => 6,
        'siete' => 7, 'ocho' => 8, 'nueve' => 9, 'diez' => 10, 'once' => 11, 'doce' => 12];
    foreach ($words as $word => $hour) {
        if (preg_match('/\ba las? ' . $word . '\b(?:\s*(?:de la|por la)\s+(manana|tarde|noche))?/', $folded, $m) === 1) {
            return agenda_time_result($hour, 0, $m[1] ?? '');
        }
    }
    return null;
}

function agenda_time_result(int $hour, int $minute, string $period): ?array
{
    if ($period === 'tarde' || $period === 'noche') {
        if ($hour < 12) {
            $hour += 12;
        }
    }
    if ($hour > 23 || $minute > 59) {
        return null;
    }
    return ['time' => sprintf('%02d:%02d', $hour, $minute), 'label' => sprintf('%02d:%02d', $hour, $minute)];
}

function agenda_build_title(string $source, string $type, ?array $meeting): string
{
    $title = preg_replace('/^(recu[eé]rdame|recordarme|ap[uú]ntame|apunta|apuntar|tengo que|hay que|necesito|quiero|no olvidar(?:me)?)\s+(que\s+)?/iu', '', $source) ?? $source;
    if ($type === 'event' && $meeting !== null) {
        $match = preg_match('/reuni[oó]n|cita|dentista|m[eé]dic[oa]|doctora?|clase|curso|entrevista|presentaci[oó]n|examen|comida|cena|desayuno|caf[eé]|gimnasio|entrenamiento|peluquer[ií]a|banco|tr[aá]mite|firma|visita|boda|cumplea[nñ]os|concierto|teatro|veterinari[oa]/iu', $title, $m, PREG_OFFSET_CAPTURE);
        if ($match === 1) {
            $title = substr($title, (int)$m[0][1]);
            $title = preg_split('/[.!?;]\s*/u', $title)[0] ?? $title;
            $title = preg_replace('/\s+(ma[nñ]ana|hoy|pasado ma[nñ]ana|el (lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|a las? \d.*)$/iu', '', $title) ?? $title;
        }
    } else {
        $title = preg_split('/[.!?;]\s*/u', $title)[0] ?? $title;
        // "el viernes", "antes del jueves", "para el lunes"… fuera del título de la tarea.
        $title = preg_replace('/\s+(antes de(?:l)?|para el|para la|el|este|esta|pr[oó]xim[oa])\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|hoy|ma[nñ]ana|pasado ma[nñ]ana|\d{1,2}(?:\s+de\s+\w+)?).*$/iu', '', $title) ?? $title;
        $title = preg_replace('/\s+(es urgente|urgente|cuanto antes|importante|sin falta)\.?$/iu', '', $title) ?? $title;
    }
    $title = trim((string)$title, " \t\n\r\0\x0B,.;:-");
    if (function_exists('mb_substr')) {
        $title = mb_substr($title, 0, 90, 'UTF-8');
    } else {
        $title = substr($title, 0, 90);
    }
    return agenda_upper_first($title);
}
