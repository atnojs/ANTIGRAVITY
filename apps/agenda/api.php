<?php
declare(strict_types=1);

/**
 * api.php — API de la agenda personal.
 *
 * Autenticación por sesión; las escrituras exigen la cabecera X-CSRF-Token.
 * El estado vive en data/state.json (single-user) y se devuelve completo tras
 * cada cambio: el cliente no necesita mantener un modelo parcial.
 */

define('AGENDA_INTERNAL', true);
require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/proxy.php';

agenda_session_start();

$method  = agenda_request_method();
$payload = agenda_request_payload();
$action  = strtolower(trim((string)($payload['action'] ?? $_GET['action'] ?? '')));

function agenda_respond_state(array $extra = [], int $status = 200): void
{
    $state = agenda_state_read();
    agenda_send_json($status, array_merge([
        'ok'   => true,
        'state' => agenda_public_state($state),
        'meta'  => agenda_meta(),
    ], $extra));
}

function agenda_id($value): int
{
    return is_numeric($value) ? (int)$value : 0;
}

function agenda_upload_error_message(int $code): string
{
    $messages = [
        UPLOAD_ERR_INI_SIZE   => 'El audio supera el tamaño permitido por el servidor.',
        UPLOAD_ERR_FORM_SIZE  => 'El audio supera el tamaño permitido.',
        UPLOAD_ERR_PARTIAL    => 'La subida se interrumpió. Inténtalo otra vez.',
        UPLOAD_ERR_NO_FILE    => 'No se recibió ningún audio.',
        UPLOAD_ERR_NO_TMP_DIR => 'El servidor no tiene carpeta temporal.',
        UPLOAD_ERR_CANT_WRITE => 'El servidor no pudo escribir el audio.',
        UPLOAD_ERR_EXTENSION  => 'Una extensión del servidor bloqueó la subida.',
    ];
    return $messages[$code] ?? 'No se pudo subir el audio (' . $code . ').';
}

function agenda_audio_allowed_mime(string $mime): ?string
{
    $map = [
        'audio/webm'  => 'webm',
        'video/webm'  => 'webm',
        'audio/ogg'   => 'ogg',
        'audio/mp4'   => 'm4a',
        'audio/x-m4a' => 'm4a',
        'audio/aac'   => 'aac',
        'audio/mpeg'  => 'mp3',
        'audio/wav'   => 'wav',
        'audio/x-wav' => 'wav',
    ];
    return $map[strtolower($mime)] ?? null;
}

function agenda_detect_mime(string $path): string
{
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $mime = (string)finfo_file($finfo, $path);
            finfo_close($finfo);
            if ($mime !== '') {
                return $mime;
            }
        }
    }
    return '';
}

/** Envía la respuesta, cierra la sesión y deja procesando el audio en segundo plano. */
function agenda_dispatch_audio(int $audioId, int $status, array $body): never
{
    agenda_send_json($status, $body, false);
    ignore_user_abort(true);
    @set_time_limit(180);
    session_write_close();
    agenda_finish_request();
    agenda_process_audio($audioId);
    exit;
}

try {
    /* Diagnóstico público, sin gastar API y sin exponer claves. */
    if ($action === 'health') {
        $writable = is_dir(AGENDA_DATA_DIR) && is_writable(AGENDA_DATA_DIR);
        if (!$writable) {
            try {
                agenda_ensure_storage();
                $writable = is_writable(AGENDA_DATA_DIR);
            } catch (Throwable $ignored) {
                $writable = false;
            }
        }
        agenda_send_json(200, [
            'ok'      => true,
            'app'     => AGENDA_APP,
            'version' => AGENDA_VERSION,
            'time'    => date('c'),
            'stt'     => agenda_stt_configured(),
            'storage' => $writable,
        ]);
    }

    agenda_require_auth();

    if ($method === 'POST') {
        agenda_require_csrf();
    }

    switch ($action) {
        case 'state':
            agenda_respond_state();
            break;

        /* ---------------- Citas ---------------- */

        case 'event_save':
            $id = agenda_id($payload['id'] ?? 0);
            $data = agenda_event_from_input($payload);
            $savedId = agenda_state_update(function (array &$state) use ($id, $data): int {
                if ($id > 0) {
                    $index = agenda_find_index($state['events'], $id);
                    if ($index < 0) {
                        throw new AgendaUserError('Esa cita ya no existe.');
                    }
                    $created = $state['events'][$index]['created_at'] ?? agenda_now();
                    $data['id']         = $id;
                    $data['created_at'] = $created;
                    $data['updated_at'] = agenda_now();
                    $state['events'][$index] = $data;
                    return $id;
                }
                $data['id']         = agenda_next_id($state, 'event');
                $data['created_at'] = agenda_now();
                $data['updated_at'] = $data['created_at'];
                $state['events'][]  = $data;
                return (int)$data['id'];
            });
            agenda_respond_state(['id' => $savedId]);
            break;

        case 'event_delete':
            $id = agenda_id($payload['id'] ?? 0);
            if ($id <= 0) {
                throw new AgendaUserError('Falta la cita que quieres borrar.');
            }
            agenda_state_update(function (array &$state) use ($id): void {
                $index = agenda_find_index($state['events'], $id);
                if ($index < 0) {
                    throw new AgendaUserError('Esa cita ya no existe.');
                }
                array_splice($state['events'], $index, 1);
            });
            agenda_respond_state();
            break;

        /* ---------------- Tareas ---------------- */

        case 'task_save':
            $id = agenda_id($payload['id'] ?? 0);
            $data = agenda_task_from_input($payload);
            $savedId = agenda_state_update(function (array &$state) use ($id, $data): int {
                if ($id > 0) {
                    $index = agenda_find_index($state['tasks'], $id);
                    if ($index < 0) {
                        throw new AgendaUserError('Esa tarea ya no existe.');
                    }
                    $previous = $state['tasks'][$index];
                    $data['id']         = $id;
                    $data['status']     = $previous['status'] ?? 'pending';
                    $data['completed_at'] = $previous['completed_at'] ?? null;
                    $data['created_at'] = $previous['created_at'] ?? agenda_now();
                    $data['updated_at'] = agenda_now();
                    $state['tasks'][$index] = $data;
                    return $id;
                }
                $data['id']           = agenda_next_id($state, 'task');
                $data['status']       = 'pending';
                $data['completed_at'] = null;
                $data['created_at']   = agenda_now();
                $data['updated_at']   = $data['created_at'];
                $state['tasks'][]     = $data;
                return (int)$data['id'];
            });
            agenda_respond_state(['id' => $savedId]);
            break;

        case 'task_toggle':
            $id = agenda_id($payload['id'] ?? 0);
            if ($id <= 0) {
                throw new AgendaUserError('Falta la tarea.');
            }
            agenda_state_update(function (array &$state) use ($id): void {
                $index = agenda_find_index($state['tasks'], $id);
                if ($index < 0) {
                    throw new AgendaUserError('Esa tarea ya no existe.');
                }
                $task = $state['tasks'][$index];
                $done = ($task['status'] ?? 'pending') === 'done';
                $task['status']       = $done ? 'pending' : 'done';
                $task['completed_at'] = $done ? null : agenda_now();
                $task['updated_at']   = agenda_now();
                $state['tasks'][$index] = $task;
            });
            agenda_respond_state();
            break;

        case 'task_postpone':
            $id = agenda_id($payload['id'] ?? 0);
            if ($id <= 0) {
                throw new AgendaUserError('Falta la tarea.');
            }
            agenda_state_update(function (array &$state) use ($id): void {
                $index = agenda_find_index($state['tasks'], $id);
                if ($index < 0) {
                    throw new AgendaUserError('Esa tarea ya no existe.');
                }
                $task = $state['tasks'][$index];
                try {
                    $base = !empty($task['due_date'])
                        ? new DateTimeImmutable((string)$task['due_date'], new DateTimeZone(AGENDA_TZ))
                        : new DateTimeImmutable('today', new DateTimeZone(AGENDA_TZ));
                } catch (Throwable $ignored) {
                    $base = new DateTimeImmutable('today', new DateTimeZone(AGENDA_TZ));
                }
                $task['due_date']  = $base->modify('+1 day')->format('Y-m-d');
                $task['updated_at'] = agenda_now();
                $state['tasks'][$index] = $task;
            });
            agenda_respond_state();
            break;

        case 'task_delete':
            $id = agenda_id($payload['id'] ?? 0);
            if ($id <= 0) {
                throw new AgendaUserError('Falta la tarea que quieres borrar.');
            }
            agenda_state_update(function (array &$state) use ($id): void {
                $index = agenda_find_index($state['tasks'], $id);
                if ($index < 0) {
                    throw new AgendaUserError('Esa tarea ya no existe.');
                }
                array_splice($state['tasks'], $index, 1);
            });
            agenda_respond_state();
            break;

        /* ---------------- Notas ---------------- */

        case 'note_save':
            $id = agenda_id($payload['id'] ?? 0);
            $body = agenda_multiline_string($payload['body'] ?? '', 12000);
            if ($body === '') {
                throw new AgendaUserError('La nota está vacía.');
            }
            $title = agenda_clean_string($payload['title'] ?? '', 160);
            if ($title === '') {
                $firstLine = agenda_clean_string((preg_split('/\n/u', $body)[0] ?? $body), 100);
                $limit = 52;
                $length = function_exists('mb_strlen') ? mb_strlen($firstLine, 'UTF-8') : strlen($firstLine);
                if ($length > $limit) {
                    $cut = function_exists('mb_substr') ? mb_substr($firstLine, 0, $limit, 'UTF-8') : substr($firstLine, 0, $limit);
                    $space = function_exists('mb_strrpos') ? mb_strrpos($cut, ' ') : strrpos($cut, ' ');
                    if ($space !== false && $space > 20) {
                        $cut = function_exists('mb_substr') ? mb_substr($cut, 0, (int)$space, 'UTF-8') : substr($cut, 0, (int)$space);
                    }
                    $title = rtrim($cut, " \t\n\r\0\x0B,.;:-") . '…';
                } else {
                    $title = $firstLine;
                }
            }
            $status = in_array(($payload['status'] ?? ''), ['inbox', 'archived'], true)
                ? (string)$payload['status']
                : 'inbox';
            $savedId = agenda_state_update(function (array &$state) use ($id, $title, $body, $status): int {
                if ($id > 0) {
                    $index = agenda_find_index($state['notes'], $id);
                    if ($index < 0) {
                        throw new AgendaUserError('Esa nota ya no existe.');
                    }
                    $note = $state['notes'][$index];
                    $note['title']      = $title;
                    $note['body']       = $body;
                    $note['status']     = $status;
                    $note['updated_at'] = agenda_now();
                    $state['notes'][$index] = $note;
                    return $id;
                }
                $note = [
                    'id'         => agenda_next_id($state, 'note'),
                    'title'      => $title,
                    'body'       => $body,
                    'source'     => 'text',
                    'status'     => $status,
                    'pinned'     => false,
                    'created_at' => agenda_now(),
                    'updated_at' => agenda_now(),
                ];
                $state['notes'][] = $note;
                return (int)$note['id'];
            });
            agenda_respond_state(['id' => $savedId]);
            break;

        case 'note_archive':
            $id = agenda_id($payload['id'] ?? 0);
            if ($id <= 0) {
                throw new AgendaUserError('Falta la nota.');
            }
            agenda_state_update(function (array &$state) use ($id): void {
                $index = agenda_find_index($state['notes'], $id);
                if ($index < 0) {
                    throw new AgendaUserError('Esa nota ya no existe.');
                }
                $note = $state['notes'][$index];
                $note['status']     = ($note['status'] ?? 'inbox') === 'archived' ? 'inbox' : 'archived';
                $note['updated_at'] = agenda_now();
                $state['notes'][$index] = $note;
            });
            agenda_respond_state();
            break;

        case 'note_delete':
            $id = agenda_id($payload['id'] ?? 0);
            if ($id <= 0) {
                throw new AgendaUserError('Falta la nota que quieres borrar.');
            }
            $files = agenda_state_update(function (array &$state) use ($id): array {
                $index = agenda_find_index($state['notes'], $id);
                if ($index < 0) {
                    throw new AgendaUserError('Esa nota ya no existe.');
                }
                $paths = [];
                foreach ($state['audios'] as $audioIndex => $audio) {
                    if ((int)($audio['note_id'] ?? 0) !== $id) {
                        continue;
                    }
                    if (!empty($audio['file'])) {
                        $paths[] = AGENDA_AUDIO_DIR . '/' . ltrim((string)$audio['file'], '/');
                    }
                    unset($state['audios'][$audioIndex]);
                }
                array_splice($state['notes'], $index, 1);
                return $paths;
            });
            foreach ($files as $path) {
                if (is_file($path)) {
                    @unlink($path);
                }
            }
            agenda_respond_state();
            break;

        /* ---------------- Audio ---------------- */

        case 'audio_upload':
            if (!isset($_FILES['audio']) || !is_array($_FILES['audio'])) {
                throw new AgendaUserError('No se recibió ningún audio.');
            }
            $file = $_FILES['audio'];
            $error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
            if ($error !== UPLOAD_ERR_OK) {
                throw new AgendaUserError(agenda_upload_error_message($error));
            }
            $size = (int)($file['size'] ?? 0);
            if ($size <= 0) {
                throw new AgendaUserError('El audio llegó vacío.');
            }
            if ($size > AGENDA_MAX_AUDIO_BYTES) {
                throw new AgendaUserError('El audio supera los 8 MB permitidos. Graba menos de 5 minutos.');
            }
            $tmp = (string)($file['tmp_name'] ?? '');
            if ($tmp === '' || !is_uploaded_file($tmp)) {
                throw new AgendaUserError('La subida del audio no es válida.');
            }
            $mime = agenda_detect_mime($tmp);
            $ext = agenda_audio_allowed_mime($mime);
            if ($ext === null) {
                $clientExt = strtolower(pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION));
                $byExtension = ['webm' => 'webm', 'ogg' => 'ogg', 'm4a' => 'm4a', 'mp4' => 'm4a', 'mp3' => 'mp3', 'wav' => 'wav', 'aac' => 'aac'];
                if (!isset($byExtension[$clientExt])) {
                    throw new AgendaUserError('Formato de audio no admitido. Usa webm, m4a, mp3, ogg o wav.');
                }
                $ext = $byExtension[$clientExt];
                $mime = $ext === 'm4a' ? 'audio/mp4' : 'audio/' . $ext;
            }
            $durationMs = min(AGENDA_MAX_AUDIO_MS, max(0, (int)($payload['duration_ms'] ?? 0)));

            $dir = AGENDA_AUDIO_DIR . '/' . date('Y') . '/' . date('m');
            if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
                throw new RuntimeException('No se pudo preparar la carpeta de audios.');
            }
            $relative = date('Y') . '/' . date('m') . '/' . bin2hex(random_bytes(16)) . '.' . $ext;
            $absolute = AGENDA_AUDIO_DIR . '/' . $relative;
            if (!move_uploaded_file($tmp, $absolute)) {
                throw new RuntimeException('No se pudo guardar el audio en el servidor.');
            }
            @chmod($absolute, 0640);
            $sha = @hash_file('sha256', $absolute);
            $created = agenda_now();

            $ids = agenda_state_update(function (array &$state) use ($relative, $mime, $size, $durationMs, $sha, $created): array {
                $note = [
                    'id'         => agenda_next_id($state, 'note'),
                    'title'      => 'Nota de voz',
                    'body'       => '',
                    'source'     => 'audio',
                    'status'     => 'inbox',
                    'pinned'     => false,
                    'created_at' => $created,
                    'updated_at' => $created,
                ];
                $state['notes'][] = $note;
                $audio = [
                    'id'             => agenda_next_id($state, 'audio'),
                    'note_id'        => $note['id'],
                    'file'           => $relative,
                    'mime'           => $mime,
                    'bytes'          => $size,
                    'duration_ms'    => $durationMs,
                    'sha256'         => is_string($sha) ? $sha : '',
                    'status'         => 'uploaded',
                    'attempts'       => 0,
                    'available_at'   => $created,
                    'locked_at'      => null,
                    'transcript_raw' => null,
                    'language'       => null,
                    'model'          => null,
                    'suggestion'     => null,
                    'last_error'     => null,
                    'reviewed'       => false,
                    'converted_to'   => null,
                    'converted_id'   => null,
                    'delete_after'   => date('Y-m-d', strtotime('+' . AGENDA_RETENTION_DAYS . ' days')),
                    'deleted_at'     => null,
                    'created_at'     => $created,
                    'processed_at'   => null,
                ];
                $state['audios'][] = $audio;
                return ['note_id' => (int)$note['id'], 'audio_id' => (int)$audio['id']];
            });

            $state = agenda_state_read();
            agenda_dispatch_audio((int)$ids['audio_id'], 202, [
                'ok'       => true,
                'state'    => agenda_public_state($state),
                'meta'     => agenda_meta(),
                'audio_id' => (int)$ids['audio_id'],
                'note_id'  => (int)$ids['note_id'],
            ]);
            break;

        case 'audio_status':
            $id = agenda_id($_GET['id'] ?? ($payload['id'] ?? 0));
            $state = agenda_state_read();
            $index = agenda_find_index($state['audios'], $id);
            if ($index < 0) {
                agenda_send_json(404, ['ok' => false, 'error' => 'Audio no encontrado.']);
            }
            $audio = $state['audios'][$index];
            unset($audio['file'], $audio['sha256']);
            $note = null;
            $noteIndex = agenda_find_index($state['notes'], (int)($audio['note_id'] ?? 0));
            if ($noteIndex >= 0) {
                $note = $state['notes'][$noteIndex];
            }
            agenda_send_json(200, [
                'ok'    => true,
                'audio' => $audio,
                'note'  => $note,
                'state' => agenda_public_state($state),
                'meta'  => agenda_meta(),
            ]);
            break;

        case 'audio_retry':
            $id = agenda_id($payload['id'] ?? 0);
            $state = agenda_state_read();
            $index = agenda_find_index($state['audios'], $id);
            if ($index < 0) {
                throw new AgendaUserError('Ese audio ya no existe.');
            }
            $reset = agenda_state_update(function (array &$state) use ($id): bool {
                $index = agenda_find_index($state['audios'], $id);
                if ($index < 0) {
                    return false;
                }
                $state['audios'][$index]['status']     = 'uploaded';
                $state['audios'][$index]['attempts']   = 0;
                $state['audios'][$index]['last_error'] = null;
                return true;
            });
            if (!$reset) {
                throw new AgendaUserError('Ese audio ya no existe.');
            }
            $state = agenda_state_read();
            agenda_dispatch_audio($id, 200, [
                'ok'    => true,
                'state' => agenda_public_state($state),
                'meta'  => agenda_meta(),
            ]);
            break;

        case 'audio_reviewed':
            $id = agenda_id($payload['id'] ?? 0);
            if ($id <= 0) {
                throw new AgendaUserError('Falta el audio.');
            }
            agenda_state_update(function (array &$state) use ($id): void {
                $index = agenda_find_index($state['audios'], $id);
                if ($index >= 0) {
                    $state['audios'][$index]['reviewed'] = true;
                }
            });
            agenda_respond_state();
            break;

        /* ---------------- Conversión de nota a tarea/cita ---------------- */

        case 'convert':
            $noteId = agenda_id($payload['note_id'] ?? 0);
            $type   = strtolower(trim((string)($payload['type'] ?? 'note')));
            if ($noteId <= 0) {
                throw new AgendaUserError('Falta la nota que quieres convertir.');
            }
            if (!in_array($type, ['note', 'task', 'event'], true)) {
                throw new AgendaUserError('Tipo de destino no válido.');
            }
            $title = agenda_clean_string($payload['title'] ?? '', 200);
            $body  = agenda_multiline_string($payload['body'] ?? '', 12000);

            $createdId = agenda_state_update(function (array &$state) use ($noteId, $type, $title, $body, $payload): ?int {
                $noteIndex = agenda_find_index($state['notes'], $noteId);
                if ($noteIndex < 0) {
                    throw new AgendaUserError('Esa nota ya no existe.');
                }
                $note = $state['notes'][$noteIndex];
                if ($body !== '') {
                    $note['body'] = $body;
                }
                if ($title !== '') {
                    $note['title'] = $title;
                }
                $note['updated_at'] = agenda_now();
                $state['notes'][$noteIndex] = $note;

                $convertedId = null;
                if ($type === 'event') {
                    $event = agenda_event_from_input([
                        'title'       => $title !== '' ? $title : (string)$note['title'],
                        'description' => (string)($payload['description'] ?? ''),
                        'date'        => (string)($payload['date'] ?? ''),
                        'start'       => (string)($payload['start'] ?? ''),
                        'end'         => (string)($payload['end'] ?? ''),
                        'all_day'     => !empty($payload['all_day']),
                        'color'       => (int)($payload['color'] ?? 0),
                    ]);
                    $event['id']             = agenda_next_id($state, 'event');
                    $event['source_note_id'] = $noteId;
                    $event['created_at']     = agenda_now();
                    $event['updated_at']     = $event['created_at'];
                    $state['events'][]       = $event;
                    $convertedId             = (int)$event['id'];
                    $state['notes'][$noteIndex]['status'] = 'archived';
                } elseif ($type === 'task') {
                    $task = agenda_task_from_input([
                        'title'    => $title !== '' ? $title : (string)$note['title'],
                        'notes'    => (string)($payload['description'] ?? ''),
                        'due_date' => (string)($payload['due_date'] ?? ''),
                        'priority' => (int)($payload['priority'] ?? 2),
                    ]);
                    $task['id']             = agenda_next_id($state, 'task');
                    $task['status']         = 'pending';
                    $task['completed_at']   = null;
                    $task['source_note_id'] = $noteId;
                    $task['created_at']     = agenda_now();
                    $task['updated_at']     = $task['created_at'];
                    $state['tasks'][]       = $task;
                    $convertedId            = (int)$task['id'];
                    $state['notes'][$noteIndex]['status'] = 'archived';
                }

                foreach ($state['audios'] as $audioIndex => $audio) {
                    if ((int)($audio['note_id'] ?? 0) === $noteId) {
                        $state['audios'][$audioIndex]['reviewed']     = true;
                        $state['audios'][$audioIndex]['converted_to'] = $type;
                        $state['audios'][$audioIndex]['converted_id'] = $convertedId;
                    }
                }
                return $convertedId;
            });

            agenda_respond_state(['created_id' => $createdId, 'created_type' => $type]);
            break;

        default:
            agenda_send_json(400, ['ok' => false, 'error' => 'Acción no reconocida.']);
    }
} catch (AgendaUserError $error) {
    agenda_send_json(400, ['ok' => false, 'error' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log('[agenda] ' . get_class($error) . ': ' . $error->getMessage());
    agenda_send_json(500, ['ok' => false, 'error' => 'Error interno del servidor. Inténtalo de nuevo.']);
}
