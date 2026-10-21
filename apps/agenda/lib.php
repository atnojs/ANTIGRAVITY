<?php
declare(strict_types=1);

/**
 * Agenda Personal — núcleo compartido (PHP 8).
 *
 * La agenda es de un único usuario. El estado vive en data/state.json con
 * escritura atómica y bloqueo (flock); los audios en data/audio/, fuera de Git
 * y denegados por web. No hay base de datos ni Node: el hosting es compartido.
 *
 * La transcripción usa la API de OpenAI con la clave que vive SOLO en el
 * entorno del servidor (.htaccess raíz de Hostinger: OPENAI_API_KEY o alias O).
 * La clasificación se hace con reglas en español, sin gastar más API.
 *
 * La contraseña (hash) tampoco se escribe aquí: se puede sobreescribir con la
 * variable de entorno AGENDA_PASSWORD_HASH; si no, se usa el hash de edición
 * compartido del proyecto.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
date_default_timezone_set('Atlantic/Canary');

const AGENDA_APP              = 'agenda';
const AGENDA_VERSION          = '2.0.0';
const AGENDA_TZ               = 'Atlantic/Canary';
const AGENDA_DATA_DIR         = __DIR__ . '/data';
const AGENDA_STATE_FILE       = AGENDA_DATA_DIR . '/state.json';
const AGENDA_LOCK_FILE        = AGENDA_DATA_DIR . '/state.lock';
const AGENDA_AUDIO_DIR        = AGENDA_DATA_DIR . '/audio';
const AGENDA_MAX_AUDIO_BYTES  = 8 * 1024 * 1024;   // 8 MB

/** Contraseña de edición compartida del proyecto (mismo mecanismo que descargas). */
const AGENDA_PASSWORD_SHA256 = '0c79272e8c147c95bedd7450abfd42cb3377947341694276c5835caeb9f435ee';

/** MIME admitidos para las notas de voz -> extensión en disco. */
const AGENDA_AUDIO_EXTENSIONS = [
    'audio/webm'              => 'webm',
    'audio/webm;codecs=opus'  => 'webm',
    'audio/ogg'               => 'ogg',
    'audio/opus'              => 'opus',
    'audio/mp4'               => 'm4a',
    'audio/m4a'               => 'm4a',
    'audio/aac'               => 'aac',
    'audio/mpeg'              => 'mp3',
    'audio/mp3'               => 'mp3',
    'audio/wav'               => 'wav',
    'audio/x-wav'             => 'wav',
    'audio/wave'              => 'wav',
];

const AGENDA_PRIORITIES = ['urgent', 'high', 'medium', 'low'];
const AGENDA_TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

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
        'version' => 2,
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
    foreach (['events', 'tasks', 'notes', 'audios'] as $key) {
        if (isset($data[$key]) && is_array($data[$key])) {
            $state[$key] = $data[$key];
        }
    }
    return $state;
}

function agenda_state_write(array $state): void
{
    $json = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
    if ($dir === '//') {
        $dir = '/';
    }
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
    return (new DateTimeImmutable('now', new DateTimeZone(AGENDA_TZ)))->format('c');
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

function agenda_clean_string($value, int $maxLength): string
{
    $value = is_string($value) ? $value : '';
    $value = trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    return agenda_substr($value, 0, $maxLength);
}

function agenda_multiline_string($value, int $maxLength): string
{
    $value = is_string($value) ? $value : '';
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = trim($value);
    return agenda_substr($value, 0, $maxLength);
}

function agenda_substr(string $value, int $start, ?int $length = null): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, $start, $length, 'UTF-8');
    }
    return $length === null ? substr($value, $start) : substr($value, $start, $length);
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

/** ISO 8601 -> ISO 8601 UTC normalizado (o null si no es válido). */
function agenda_iso_utc($value): ?string
{
    if (!is_string($value) || trim($value) === '') {
        return null;
    }
    try {
        $date = new DateTimeImmutable(trim($value));
    } catch (Exception $error) {
        return null;
    }
    return $date->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
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

function agenda_env_value(array $names): string
{
    foreach ($names as $name) {
        $candidates = [
            getenv($name),
            getenv('REDIRECT_' . $name),
            $_SERVER[$name] ?? '',
            $_SERVER['REDIRECT_' . $name] ?? '',
            $_ENV[$name] ?? '',
            $_ENV['REDIRECT_' . $name] ?? '',
        ];
        foreach ($candidates as $value) {
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }
    }
    return '';
}

/* ------------------------------------------------------------------ */
/* Identificadores y utilidades de entidades                          */
/* ------------------------------------------------------------------ */

function agenda_new_id(string $prefix): string
{
    return $prefix . '-' . (string)round(microtime(true) * 1000) . '-' . bin2hex(random_bytes(2));
}

function agenda_find_index(array $list, string $id): int
{
    foreach ($list as $index => $item) {
        if (is_array($item) && (string)($item['id'] ?? '') === $id) {
            return (int)$index;
        }
    }
    return -1;
}

/** Índice de audios por id para decorar entidades con audio_file/duración/transcripción. */
function agenda_audio_map(array $state): array
{
    $map = [];
    foreach ($state['audios'] as $audio) {
        if (is_array($audio) && isset($audio['id'])) {
            $map[(string)$audio['id']] = $audio;
        }
    }
    return $map;
}

function agenda_public_audio(?array $audio): array
{
    if (!is_array($audio)) {
        return ['audio_file' => null, 'audio_duration' => null, 'audio_transcription' => null];
    }
    return [
        'audio_file'          => $audio['file'] ?? null,
        'audio_duration'      => isset($audio['duration']) ? (float)$audio['duration'] : null,
        'audio_transcription' => $audio['transcription'] ?? null,
    ];
}

/** Añade los datos del audio enlazado a una cita/tarea/nota. */
function agenda_decorate(array $entity, array $audioMap): array
{
    $audioId = isset($entity['audio_id']) ? (string)$entity['audio_id'] : '';
    $audio = $audioId !== '' && isset($audioMap[$audioId]) ? $audioMap[$audioId] : null;
    return array_merge($entity, agenda_public_audio($audio));
}

/* ------------------------------------------------------------------ */
/* Validación de entidades (payloads del frontend React)              */
/* ------------------------------------------------------------------ */

function agenda_event_from_input(array $input, array $current = []): array
{
    $title = agenda_clean_string($input['title'] ?? ($current['title'] ?? ''), 200);
    if ($title === '') {
        throw new AgendaUserError('El título de la cita es obligatorio.');
    }
    $start = agenda_iso_utc($input['start_time'] ?? ($current['start_time'] ?? ''));
    if ($start === null) {
        throw new AgendaUserError('La fecha y hora de inicio de la cita no son válidas.');
    }
    $end = agenda_iso_utc($input['end_time'] ?? ($current['end_time'] ?? ''));
    if ($end === null || strcmp($end, $start) <= 0) {
        $end = (new DateTimeImmutable($start))->modify('+1 hour')->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    }
    $audioId = $input['audio_id'] ?? ($current['audio_id'] ?? null);
    return [
        'title'       => $title,
        'description' => agenda_multiline_string($input['description'] ?? ($current['description'] ?? ''), 4000),
        'start_time'  => $start,
        'end_time'    => $end,
        'location'    => agenda_clean_string($input['location'] ?? ($current['location'] ?? ''), 300),
        'is_all_day'  => (bool)($input['is_all_day'] ?? ($current['is_all_day'] ?? false)),
        'audio_id'    => is_string($audioId) && $audioId !== '' ? $audioId : null,
    ];
}

function agenda_task_from_input(array $input, array $current = []): array
{
    $title = agenda_clean_string($input['title'] ?? ($current['title'] ?? ''), 200);
    if ($title === '') {
        throw new AgendaUserError('El título de la tarea es obligatorio.');
    }
    $dueDateRaw = array_key_exists('due_date', $input) ? $input['due_date'] : ($current['due_date'] ?? null);
    $dueDate = null;
    if (is_string($dueDateRaw) && trim($dueDateRaw) !== '') {
        $dueDate = agenda_valid_date(trim($dueDateRaw));
        if ($dueDate === null) {
            throw new AgendaUserError('La fecha de la tarea no es válida.');
        }
    }
    $dueTimeRaw = array_key_exists('due_time', $input) ? $input['due_time'] : ($current['due_time'] ?? null);
    $dueTime = null;
    if (is_string($dueTimeRaw) && trim($dueTimeRaw) !== '') {
        $dueTime = agenda_valid_time(trim($dueTimeRaw));
        if ($dueTime === null) {
            throw new AgendaUserError('La hora de la tarea no es válida.');
        }
    }
    $priority = (string)($input['priority'] ?? ($current['priority'] ?? 'medium'));
    if (!in_array($priority, AGENDA_PRIORITIES, true)) {
        $priority = 'medium';
    }
    $status = (string)($input['status'] ?? ($current['status'] ?? 'pending'));
    if (!in_array($status, AGENDA_TASK_STATUSES, true)) {
        $status = 'pending';
    }
    $audioId = $input['audio_id'] ?? ($current['audio_id'] ?? null);
    return [
        'title'    => $title,
        'notes'    => agenda_multiline_string($input['notes'] ?? ($current['notes'] ?? ''), 4000),
        'due_date' => $dueDate,
        'due_time' => $dueTime,
        'priority' => $priority,
        'status'   => $status,
        'audio_id' => is_string($audioId) && $audioId !== '' ? $audioId : null,
    ];
}

function agenda_note_from_input(array $input, array $current = []): array
{
    $content = agenda_multiline_string($input['content'] ?? ($current['content'] ?? ''), 8000);
    if ($content === '') {
        throw new AgendaUserError('El contenido de la nota es obligatorio.');
    }
    $category = agenda_clean_string($input['category'] ?? ($current['category'] ?? 'general'), 40);
    if ($category === '') {
        $category = 'general';
    }
    $tags = [];
    if (array_key_exists('tags', $input)) {
        $rawTags = $input['tags'];
        if (is_string($rawTags)) {
            $rawTags = preg_split('/[,;]+/', $rawTags) ?: [];
        }
        if (is_array($rawTags)) {
            foreach ($rawTags as $tag) {
                $clean = agenda_lower(agenda_clean_string($tag, 40));
                if ($clean !== '' && !in_array($clean, $tags, true)) {
                    $tags[] = $clean;
                }
                if (count($tags) >= 10) {
                    break;
                }
            }
        }
    } elseif (isset($current['tags']) && is_array($current['tags'])) {
        $tags = $current['tags'];
    }
    $audioId = $input['audio_id'] ?? ($current['audio_id'] ?? null);
    return [
        'content'     => $content,
        'category'    => $category,
        'tags'        => $tags,
        'is_pinned'   => (bool)($input['is_pinned'] ?? ($current['is_pinned'] ?? false)),
        'is_archived' => (bool)($input['is_archived'] ?? ($current['is_archived'] ?? false)),
        'audio_id'    => is_string($audioId) && $audioId !== '' ? $audioId : null,
    ];
}

/* ------------------------------------------------------------------ */
/* Ordenación y estadísticas                                          */
/* ------------------------------------------------------------------ */

function agenda_sort_events(array &$events): void
{
    usort($events, static function (array $a, array $b): int {
        return strcmp((string)($a['start_time'] ?? ''), (string)($b['start_time'] ?? ''));
    });
}

function agenda_sort_tasks(array &$tasks): void
{
    $statusRank = ['pending' => 1, 'in_progress' => 2, 'completed' => 3, 'cancelled' => 4];
    $priorityRank = ['urgent' => 1, 'high' => 2, 'medium' => 3, 'low' => 4];
    usort($tasks, static function (array $a, array $b) use ($statusRank, $priorityRank): int {
        $statusA = $statusRank[(string)($a['status'] ?? 'pending')] ?? 9;
        $statusB = $statusRank[(string)($b['status'] ?? 'pending')] ?? 9;
        if ($statusA !== $statusB) {
            return $statusA <=> $statusB;
        }
        $priorityA = $priorityRank[(string)($a['priority'] ?? 'medium')] ?? 9;
        $priorityB = $priorityRank[(string)($b['priority'] ?? 'medium')] ?? 9;
        if ($priorityA !== $priorityB) {
            return $priorityA <=> $priorityB;
        }
        return strcmp((string)($a['due_date'] ?? '9999-12-31'), (string)($b['due_date'] ?? '9999-12-31'));
    });
}

function agenda_sort_notes(array &$notes): void
{
    usort($notes, static function (array $a, array $b): int {
        $pinnedA = !empty($a['is_pinned']) ? 1 : 0;
        $pinnedB = !empty($b['is_pinned']) ? 1 : 0;
        if ($pinnedA !== $pinnedB) {
            return $pinnedB <=> $pinnedA;
        }
        return strcmp((string)($b['updated_at'] ?? ''), (string)($a['updated_at'] ?? ''));
    });
}

function agenda_system_stats(array $state): array
{
    $pending = 0;
    $completed = 0;
    foreach ($state['tasks'] as $task) {
        if (($task['status'] ?? '') === 'completed') {
            $completed++;
        } else {
            $pending++;
        }
    }
    $audioBytes = 0;
    foreach ($state['audios'] as $audio) {
        $audioBytes += (int)($audio['size'] ?? 0);
    }
    return [
        'eventsCount'         => count($state['events']),
        'pendingTasksCount'   => $pending,
        'completedTasksCount' => $completed,
        'notesCount'          => count($state['notes']),
        'audiosCount'         => count($state['audios']),
        'totalAudioDiskBytes' => $audioBytes,
    ];
}

/* ------------------------------------------------------------------ */
/* Datos de ejemplo (botón «Restablecer datos de prueba»)             */
/* ------------------------------------------------------------------ */

function agenda_seed_state(array &$state): void
{
    $tz = new DateTimeZone(AGENDA_TZ);
    $now = new DateTimeImmutable('now', $tz);
    $today = $now->format('Y-m-d');
    $tomorrow = $now->modify('+1 day')->format('Y-m-d');
    $iso = static function (string $date, string $time) use ($tz): string {
        return (new DateTimeImmutable($date . ' ' . $time, $tz))
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d\TH:i:s\Z');
    };
    $stamp = $now->format('c');

    $state['audios'] = [];
    $state['events'] = [
        [
            'id'          => 'evt-demo-1',
            'title'       => 'Reunión de coordinación',
            'description' => 'Revisión del estado del proyecto y de los próximos entregables.',
            'start_time'  => $iso($today, '10:00'),
            'end_time'    => $iso($today, '11:30'),
            'location'    => 'Google Meet / Online',
            'is_all_day'  => false,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
        [
            'id'          => 'evt-demo-2',
            'title'       => 'Revisión médica anual',
            'description' => 'Consulta preventiva y análisis rutinario.',
            'start_time'  => $iso($today, '16:00'),
            'end_time'    => $iso($today, '17:00'),
            'location'    => 'Centro médico',
            'is_all_day'  => false,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
        [
            'id'          => 'evt-demo-3',
            'title'       => 'Planificación de la semana',
            'description' => 'Alinear prioridades y reservar tiempo para lo importante.',
            'start_time'  => $iso($tomorrow, '12:00'),
            'end_time'    => $iso($tomorrow, '13:00'),
            'location'    => 'Oficina',
            'is_all_day'  => false,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
    ];

    $state['tasks'] = [
        [
            'id'          => 'tsk-demo-1',
            'title'       => 'Hacer copia de seguridad de la agenda',
            'notes'       => 'Descargar la carpeta data/ desde el hPanel del hosting.',
            'due_date'    => $today,
            'due_time'    => '18:00',
            'priority'    => 'urgent',
            'status'      => 'pending',
            'completed_at'=> null,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
        [
            'id'          => 'tsk-demo-2',
            'title'       => 'Revisar el correo pendiente',
            'notes'       => '',
            'due_date'    => $tomorrow,
            'due_time'    => '14:00',
            'priority'    => 'high',
            'status'      => 'pending',
            'completed_at'=> null,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
        [
            'id'          => 'tsk-demo-3',
            'title'       => 'Preparar el resumen de la semana',
            'notes'       => '',
            'due_date'    => $tomorrow,
            'due_time'    => '19:00',
            'priority'    => 'medium',
            'status'      => 'in_progress',
            'completed_at'=> null,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
        [
            'id'          => 'tsk-demo-4',
            'title'       => 'Actualizar la contraseña de edición',
            'notes'       => 'Hecho con tools/rotar-password.ps1.',
            'due_date'    => $today,
            'due_time'    => '09:00',
            'priority'    => 'low',
            'status'      => 'completed',
            'completed_at'=> $stamp,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
    ];

    $state['notes'] = [
        [
            'id'          => 'not-demo-1',
            'content'     => "Ideas para la agenda:\n- Recordatorios de citas por Telegram.\n- Exportar todo a JSON desde el servidor.",
            'category'    => 'ideas',
            'tags'        => ['agenda', 'ideas'],
            'is_pinned'   => true,
            'is_archived' => false,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
        [
            'id'          => 'not-demo-2',
            'content'     => 'Los datos se guardan en data/state.json y los audios en data/audio. Nada de eso va a GitHub.',
            'category'    => 'servidor',
            'tags'        => ['hostinger', 'backup'],
            'is_pinned'   => true,
            'is_archived' => false,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
        [
            'id'          => 'not-demo-3',
            'content'     => 'Idea rápida: probar la captura de voz desde el móvil cuando esté en la calle.',
            'category'    => 'personal',
            'tags'        => ['voz'],
            'is_pinned'   => false,
            'is_archived' => false,
            'audio_id'    => null,
            'created_at'  => $stamp,
            'updated_at'  => $stamp,
        ],
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
    $mananaPos = strpos($folded, 'manana');
    if ($mananaPos !== false) {
        $before = substr($folded, max(0, $mananaPos - 8), min(8, $mananaPos));
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
    $title = agenda_substr($title, 0, 90);
    return agenda_upper_first($title);
}

/* ------------------------------------------------------------------ */
/* Clasificación lista para la respuesta del frontend                 */
/* ------------------------------------------------------------------ */

/**
 * Convierte una transcripción en el objeto que espera el modal de revisión:
 * appointment | task | note + detalles ya precargados.
 */
function agenda_classify_payload(string $text, bool $hasAudio): array
{
    $analysis = agenda_classify($text);
    $folded = agenda_fold($text);
    $timeInfo = agenda_extract_time($folded);
    $tz = new DateTimeZone(AGENDA_TZ);

    $entityType = 'note';
    if ($analysis['type'] === 'event') {
        $entityType = 'appointment';
    } elseif ($analysis['type'] === 'task') {
        $entityType = 'task';
    }

    $appointment = [
        'start_time' => null,
        'end_time'   => null,
        'location'   => '',
        'is_all_day' => false,
    ];
    if ($entityType === 'appointment') {
        $date = (string)($analysis['date'] ?? date('Y-m-d'));
        $start = (string)($analysis['start'] ?? '09:00');
        $end = (string)($analysis['end'] ?? agenda_add_minutes($start, 60));
        $startIso = (new DateTimeImmutable($date . ' ' . $start, $tz))
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d\TH:i:s\Z');
        $endIso = (new DateTimeImmutable($date . ' ' . $end, $tz))
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d\TH:i:s\Z');
        $appointment = [
            'start_time' => $startIso,
            'end_time'   => $endIso,
            'location'   => agenda_detect_location($folded),
            'is_all_day' => false,
        ];
    }

    $priority = 'medium';
    if (preg_match('/\b(urgente|urgentisimo|cuanto antes|sin falta|no se me olvide)\b/', $folded) === 1) {
        $priority = 'urgent';
    } elseif (preg_match('/\b(importante|prioritario|prioridad alta)\b/', $folded) === 1
        || (int)($analysis['priority'] ?? 2) === 3) {
        $priority = 'high';
    } elseif (preg_match('/\b(cuando pueda|sin prisa|baja prioridad|algun dia)\b/', $folded) === 1) {
        $priority = 'low';
    }

    $task = [
        'due_date' => $entityType === 'task' && !empty($analysis['due_date']) ? $analysis['due_date'] : null,
        'due_time' => $entityType === 'task' && $timeInfo !== null ? $timeInfo['time'] : null,
        'priority' => $priority,
    ];

    $note = [
        'category' => agenda_detect_category($folded),
        'tags'     => agenda_detect_tags($folded),
    ];

    $summaries = [
        'appointment' => 'Cita con fecha y hora detectada en la transcripción.',
        'task'        => 'Tarea o pendiente detectado en la transcripción.',
        'note'        => 'Nota rápida: no se ha detectado una cita ni una acción concreta.',
    ];

    return [
        'transcription'       => $text,
        'entity_type'         => $entityType,
        'confidence'          => (float)($analysis['confidence'] ?? 0.5),
        'title'               => (string)($analysis['title'] ?? ($hasAudio ? 'Nota de voz' : 'Nota rápida')),
        'summary'             => $summaries[$entityType],
        'appointment_details' => $appointment,
        'task_details'        => $task,
        'note_details'        => $note,
    ];
}

function agenda_detect_location(string $folded): string
{
    if (preg_match('/\bzoom\b/', $folded) === 1) {
        return 'Zoom';
    }
    if (preg_match('/\b(google meet|meet)\b/', $folded) === 1) {
        return 'Google Meet';
    }
    if (preg_match('/\b(teams)\b/', $folded) === 1) {
        return 'Microsoft Teams';
    }
    if (preg_match('/\b(oficina|despacho)\b/', $folded) === 1) {
        return 'Oficina';
    }
    if (preg_match('/\b(hospital|clinica|consulta|centro medico|centro de salud)\b/', $folded) === 1) {
        return 'Centro médico';
    }
    if (preg_match('/\b(casa|domicilio)\b/', $folded) === 1) {
        return 'Casa';
    }
    return '';
}

function agenda_detect_category(string $folded): string
{
    if (preg_match('/\b(idea|ideas|ocurrencia|proyecto|inventar)\b/', $folded) === 1) {
        return 'ideas';
    }
    if (preg_match('/\b(servidor|hostinger|dominio|web|backup|copia de seguridad|codigo|php|ssh|ftp)\b/', $folded) === 1) {
        return 'servidor';
    }
    if (preg_match('/\b(trabajo|reunion|cliente|equipo|proyecto|informe|presupuesto|entrega)\b/', $folded) === 1) {
        return 'trabajo';
    }
    if (preg_match('/\b(casa|familia|personal|medico|salud|comprar|supermercado|coche)\b/', $folded) === 1) {
        return 'personal';
    }
    return 'general';
}

function agenda_detect_tags(string $folded): array
{
    $catalog = [
        'casa'     => ['casa', 'hogar'],
        'compras'  => ['comprar', 'compra', 'supermercado'],
        'salud'    => ['medico', 'medica', 'salud', 'hospital', 'dentista'],
        'trabajo'  => ['trabajo', 'reunion', 'cliente', 'informe', 'presupuesto'],
        'servidor' => ['servidor', 'hostinger', 'backup', 'dominio', 'web'],
        'ideas'    => ['idea', 'ideas', 'proyecto'],
        'llamadas' => ['llamar', 'llamada', 'telefono'],
        'pagos'    => ['pagar', 'pago', 'factura', 'luz', 'banco'],
    ];
    $tags = [];
    foreach ($catalog as $tag => $words) {
        foreach ($words as $word) {
            if (preg_match('/\b' . $word . '\b/', $folded) === 1) {
                $tags[] = $tag;
                break;
            }
        }
        if (count($tags) >= 3) {
            break;
        }
    }
    return $tags;
}

/* ------------------------------------------------------------------ */
/* Transcripción con OpenAI (clave SOLO del entorno del servidor)     */
/* ------------------------------------------------------------------ */

function agenda_openai_key(): string
{
    return agenda_env_value(['OPENAI_API_KEY', 'O']);
}

function agenda_stt_configured(): bool
{
    return agenda_openai_key() !== '';
}

function agenda_stt_mock_enabled(): bool
{
    $value = trim((string)getenv('AGENDA_MOCK_STT'));
    return $value !== '' && $value !== '0';
}

/**
 * Transcribe un audio con OpenAI. Si AGENDA_MOCK_STT está activo (solo
 * desarrollo/pruebas locales) devuelve una transcripción de ejemplo.
 *
 * @return array{ok:bool,text:string,error:string,model:string}
 */
function agenda_transcribe_audio(string $path, string $mime, int $seed = 0): array
{
    if (!is_file($path)) {
        return ['ok' => false, 'text' => '', 'error' => 'El archivo de audio ya no está en el servidor.', 'model' => ''];
    }
    if (agenda_stt_mock_enabled()) {
        $samples = [
            'Mañana a las diez reunión con Ana para revisar el presupuesto del proyecto.',
            'Recuérdame comprar pilas y pagar la luz antes del viernes. Es urgente.',
            'Idea para la web: usar una portada más limpia, con menos texto en la cabecera principal.',
        ];
        return ['ok' => true, 'text' => $samples[$seed % count($samples)], 'error' => '', 'model' => 'mock-local'];
    }
    $key = agenda_openai_key();
    if ($key === '') {
        return [
            'ok'    => false,
            'text'  => '',
            'error' => 'La transcripción automática no está configurada en el servidor. Puedes escribir el texto a mano.',
            'model' => '',
        ];
    }
    if (!class_exists('CURLFile')) {
        return ['ok' => false, 'text' => '', 'error' => 'El servidor no tiene cURL habilitado.', 'model' => ''];
    }
    if (filesize($path) > 25 * 1024 * 1024) {
        return ['ok' => false, 'text' => '', 'error' => 'El audio supera el máximo de la API de transcripción.', 'model' => ''];
    }

    $models = ['gpt-4o-mini-transcribe', 'whisper-1'];
    $lastError = 'No se pudo transcribir el audio.';
    foreach ($models as $model) {
        $fields = [
            'file'     => new CURLFile($path, $mime, basename($path)),
            'model'    => $model,
            'language' => 'es',
            'prompt'   => 'Nota de voz personal en español: citas, tareas y recordatorios. Nombres propios y fechas.',
        ];
        if ($model === 'whisper-1') {
            $fields['response_format'] = 'json';
        }
        $ch = curl_init('https://api.openai.com/v1/audio/transcriptions');
        if ($ch === false) {
            return ['ok' => false, 'text' => '', 'error' => 'No se pudo iniciar la conexión con el servicio de transcripción.', 'model' => $model];
        }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $fields,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $key],
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_FOLLOWLOCATION => false,
        ]);
        $raw = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            $lastError = 'No se pudo conectar con el servicio de transcripción.';
            error_log('[agenda] STT curl: ' . $curlError);
            break;
        }
        $json = json_decode((string)$raw, true);
        if ($status === 200 && is_array($json) && isset($json['text']) && is_string($json['text'])) {
            return ['ok' => true, 'text' => trim($json['text']), 'error' => '', 'model' => $model];
        }
        $message = is_array($json) && isset($json['error']['message'])
            ? (string)$json['error']['message']
            : 'El servicio de transcripción respondió con un error (' . $status . ').';
        $lastError = 'No se pudo transcribir el audio: ' . $message;
        error_log('[agenda] STT HTTP ' . $status . ' (' . $model . '): ' . $message);
        if (!in_array($status, [400, 403, 404, 422], true)) {
            break;
        }
    }
    return ['ok' => false, 'text' => '', 'error' => $lastError, 'model' => ''];
}

/* ------------------------------------------------------------------ */
/* Salud del sistema (diagnóstico sin gastar API)                     */
/* ------------------------------------------------------------------ */

function agenda_health(): array
{
    $storageOk = false;
    try {
        agenda_ensure_storage();
        $storageOk = is_writable(AGENDA_DATA_DIR) && is_writable(AGENDA_AUDIO_DIR);
    } catch (Throwable $error) {
        $storageOk = false;
    }
    return [
        'status'            => 'ok',
        'app'               => AGENDA_APP,
        'version'           => AGENDA_VERSION,
        'time'              => agenda_now(),
        'timezone'          => AGENDA_TZ,
        'openai_configured' => agenda_stt_configured(),
        'stt_mock'          => agenda_stt_mock_enabled(),
        'storage'           => $storageOk,
    ];
}
