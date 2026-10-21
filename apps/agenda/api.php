<?php
declare(strict_types=1);

/**
 * API REST de la agenda (PHP 8).
 *
 * Rutas (el .htaccess de la app reescribe /api/... a este fichero):
 *   GET    /api/health
 *   GET    /api/events | /api/tasks | /api/notes | /api/stats
 *   POST   /api/events | /api/tasks | /api/notes
 *   PUT    /api/events/{id} | /api/tasks/{id} | /api/notes/{id}
 *   DELETE /api/events/{id} | /api/tasks/{id} | /api/notes/{id}
 *   POST   /api/seed/reset
 *   POST   /api/audio/process   (JSON: audioData base64 o textInput)
 *
 * Todas las rutas salvo /api/health exigen sesión; las escrituras exigen
 * además el token CSRF que entrega auth.php.
 */

require_once __DIR__ . '/lib.php';

agenda_session_start();

$method = agenda_request_method();

$rawPath = (string)($_GET['path'] ?? '');
if ($rawPath === '' && isset($_SERVER['PATH_INFO'])) {
    $rawPath = (string)$_SERVER['PATH_INFO'];
}
$path = trim($rawPath, '/');
$segments = $path === '' ? [] : explode('/', $path);
$resource = $segments[0] ?? '';
$id = $segments[1] ?? '';

/* Diagnóstico público: no gasta API y no expone claves. */
if ($resource === 'health' && ($method === 'GET' || $method === 'HEAD')) {
    agenda_send_json(200, agenda_health());
}

try {
    agenda_require_auth();
    if ($method !== 'GET' && $method !== 'HEAD') {
        agenda_require_csrf();
    }
    $payload = agenda_request_payload();

    if ($resource === 'events') {
        agenda_handle_events($method, $id, $payload);
    }
    if ($resource === 'tasks') {
        agenda_handle_tasks($method, $id, $payload);
    }
    if ($resource === 'notes') {
        agenda_handle_notes($method, $id, $payload);
    }
    if ($resource === 'stats' && $method === 'GET') {
        agenda_send_json(200, agenda_system_stats(agenda_state_read()));
    }
    if ($resource === 'seed' && ($segments[1] ?? '') === 'reset' && $method === 'POST') {
        $stats = agenda_state_update(static function (array &$state): array {
            foreach ($state['audios'] as $audio) {
                $file = AGENDA_AUDIO_DIR . '/' . basename((string)($audio['file'] ?? ''));
                if (($audio['file'] ?? '') !== '' && is_file($file)) {
                    @unlink($file);
                }
            }
            $state = agenda_default_state();
            agenda_seed_state($state);
            return agenda_system_stats($state);
        });
        agenda_send_json(200, ['ok' => true, 'stats' => $stats]);
    }
    if ($resource === 'audio' && ($segments[1] ?? '') === 'process' && $method === 'POST') {
        agenda_handle_audio_process($payload);
    }

    agenda_send_json(404, ['ok' => false, 'error' => 'Ruta no encontrada.']);
} catch (AgendaUserError $error) {
    agenda_send_json(400, ['ok' => false, 'error' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log('[agenda] ' . $error->getMessage() . ' @ ' . $error->getFile() . ':' . $error->getLine());
    agenda_send_json(500, ['ok' => false, 'error' => 'Error interno del servidor. Inténtalo de nuevo.']);
}

/* ------------------------------------------------------------------ */
/* Citas fijas                                                        */
/* ------------------------------------------------------------------ */

function agenda_handle_events(string $method, string $id, array $payload): never
{
    if ($method === 'GET') {
        $state = agenda_state_read();
        $audios = agenda_audio_map($state);
        $events = array_map(static fn(array $event): array => agenda_decorate($event, $audios), $state['events']);
        agenda_sort_events($events);
        agenda_send_json(200, array_values($events));
    }

    if ($method === 'POST' && $id === '') {
        $created = agenda_state_update(static function (array &$state) use ($payload): array {
            $now = agenda_now();
            $data = agenda_event_from_input($payload);
            $event = array_merge($data, [
                'id'         => agenda_new_id('evt'),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $state['events'][] = $event;
            return $event;
        });
        agenda_send_json(201, agenda_decorate($created, agenda_audio_map(agenda_state_read())));
    }

    if ($method === 'PUT' && $id !== '') {
        $updated = agenda_state_update(static function (array &$state) use ($id, $payload): ?array {
            $index = agenda_find_index($state['events'], $id);
            if ($index < 0) {
                return null;
            }
            $current = $state['events'][$index];
            $data = agenda_event_from_input($payload, $current);
            $event = array_merge($current, $data, ['updated_at' => agenda_now()]);
            $state['events'][$index] = $event;
            return $event;
        });
        if ($updated === null) {
            agenda_send_json(404, ['ok' => false, 'error' => 'Cita no encontrada.']);
        }
        agenda_send_json(200, agenda_decorate($updated, agenda_audio_map(agenda_state_read())));
    }

    if ($method === 'DELETE' && $id !== '') {
        agenda_state_update(static function (array &$state) use ($id): void {
            $index = agenda_find_index($state['events'], $id);
            if ($index < 0) {
                return;
            }
            $audioId = (string)($state['events'][$index]['audio_id'] ?? '');
            array_splice($state['events'], $index, 1);
            agenda_purge_audio($state, $audioId);
        });
        agenda_send_json(200, ['ok' => true, 'success' => true, 'id' => $id]);
    }

    agenda_send_json(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

/* ------------------------------------------------------------------ */
/* Tareas                                                             */
/* ------------------------------------------------------------------ */

function agenda_handle_tasks(string $method, string $id, array $payload): never
{
    if ($method === 'GET') {
        $state = agenda_state_read();
        $audios = agenda_audio_map($state);
        $tasks = array_map(static fn(array $task): array => agenda_decorate($task, $audios), $state['tasks']);
        agenda_sort_tasks($tasks);
        agenda_send_json(200, array_values($tasks));
    }

    if ($method === 'POST' && $id === '') {
        $created = agenda_state_update(static function (array &$state) use ($payload): array {
            $now = agenda_now();
            $data = agenda_task_from_input($payload);
            $task = array_merge($data, [
                'id'           => agenda_new_id('tsk'),
                'completed_at' => $data['status'] === 'completed' ? $now : null,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
            $state['tasks'][] = $task;
            return $task;
        });
        agenda_send_json(201, agenda_decorate($created, agenda_audio_map(agenda_state_read())));
    }

    if ($method === 'PUT' && $id !== '') {
        $updated = agenda_state_update(static function (array &$state) use ($id, $payload): ?array {
            $index = agenda_find_index($state['tasks'], $id);
            if ($index < 0) {
                return null;
            }
            $current = $state['tasks'][$index];
            $data = agenda_task_from_input($payload, $current);
            $completedAt = $current['completed_at'] ?? null;
            if ($data['status'] === 'completed' && ($current['status'] ?? '') !== 'completed') {
                $completedAt = agenda_now();
            } elseif ($data['status'] !== 'completed') {
                $completedAt = null;
            }
            $task = array_merge($current, $data, [
                'completed_at' => $completedAt,
                'updated_at'   => agenda_now(),
            ]);
            $state['tasks'][$index] = $task;
            return $task;
        });
        if ($updated === null) {
            agenda_send_json(404, ['ok' => false, 'error' => 'Tarea no encontrada.']);
        }
        agenda_send_json(200, agenda_decorate($updated, agenda_audio_map(agenda_state_read())));
    }

    if ($method === 'DELETE' && $id !== '') {
        agenda_state_update(static function (array &$state) use ($id): void {
            $index = agenda_find_index($state['tasks'], $id);
            if ($index < 0) {
                return;
            }
            $audioId = (string)($state['tasks'][$index]['audio_id'] ?? '');
            array_splice($state['tasks'], $index, 1);
            agenda_purge_audio($state, $audioId);
        });
        agenda_send_json(200, ['ok' => true, 'success' => true, 'id' => $id]);
    }

    agenda_send_json(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

/* ------------------------------------------------------------------ */
/* Notas rápidas                                                      */
/* ------------------------------------------------------------------ */

function agenda_handle_notes(string $method, string $id, array $payload): never
{
    if ($method === 'GET') {
        $state = agenda_state_read();
        $audios = agenda_audio_map($state);
        $notes = array_map(static fn(array $note): array => agenda_decorate($note, $audios), $state['notes']);
        agenda_sort_notes($notes);
        agenda_send_json(200, array_values($notes));
    }

    if ($method === 'POST' && $id === '') {
        $created = agenda_state_update(static function (array &$state) use ($payload): array {
            $now = agenda_now();
            $data = agenda_note_from_input($payload);
            $note = array_merge($data, [
                'id'         => agenda_new_id('not'),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $state['notes'][] = $note;
            return $note;
        });
        agenda_send_json(201, agenda_decorate($created, agenda_audio_map(agenda_state_read())));
    }

    if ($method === 'PUT' && $id !== '') {
        $updated = agenda_state_update(static function (array &$state) use ($id, $payload): ?array {
            $index = agenda_find_index($state['notes'], $id);
            if ($index < 0) {
                return null;
            }
            $current = $state['notes'][$index];
            $data = agenda_note_from_input($payload, $current);
            $note = array_merge($current, $data, ['updated_at' => agenda_now()]);
            $state['notes'][$index] = $note;
            return $note;
        });
        if ($updated === null) {
            agenda_send_json(404, ['ok' => false, 'error' => 'Nota no encontrada.']);
        }
        agenda_send_json(200, agenda_decorate($updated, agenda_audio_map(agenda_state_read())));
    }

    if ($method === 'DELETE' && $id !== '') {
        agenda_state_update(static function (array &$state) use ($id): void {
            $index = agenda_find_index($state['notes'], $id);
            if ($index < 0) {
                return;
            }
            $audioId = (string)($state['notes'][$index]['audio_id'] ?? '');
            array_splice($state['notes'], $index, 1);
            agenda_purge_audio($state, $audioId);
        });
        agenda_send_json(200, ['ok' => true, 'success' => true, 'id' => $id]);
    }

    agenda_send_json(405, ['ok' => false, 'error' => 'Método no permitido.']);
}

/* ------------------------------------------------------------------ */
/* Audio: guardar, transcribir con OpenAI y clasificar                */
/* ------------------------------------------------------------------ */

function agenda_handle_audio_process(array $payload): never
{
    $audioData = $payload['audioData'] ?? null;
    $mimeRaw = trim((string)($payload['mimeType'] ?? ''));
    $duration = (float)($payload['duration'] ?? 0);
    $textInput = trim((string)($payload['textInput'] ?? ''));

    if ((!is_string($audioData) || trim($audioData) === '') && $textInput === '') {
        throw new AgendaUserError('Se requiere un audio o un texto para procesar la nota.');
    }

    $audioId = null;
    $audioFile = null;
    $fileSize = 0;
    $mime = $mimeRaw !== '' ? $mimeRaw : 'audio/webm';

    if (is_string($audioData) && trim($audioData) !== '') {
        $binary = base64_decode($audioData, true);
        if ($binary === false || $binary === '') {
            throw new AgendaUserError('El audio recibido no es válido.');
        }
        if (strlen($binary) > AGENDA_MAX_AUDIO_BYTES) {
            throw new AgendaUserError('El audio supera el límite de 8 MB.');
        }
        $baseMime = strtolower(trim(explode(';', $mime)[0]));
        $extension = AGENDA_AUDIO_EXTENSIONS[$baseMime] ?? null;
        if ($extension === null) {
            throw new AgendaUserError('Formato de audio no admitido. Usa webm, mp4, mp3, wav u ogg.');
        }
        agenda_ensure_storage();
        $audioId = agenda_new_id('aud');
        $audioFile = $audioId . '.' . $extension;
        $absolute = AGENDA_AUDIO_DIR . '/' . $audioFile;
        if (@file_put_contents($absolute, $binary, LOCK_EX) === false) {
            throw new RuntimeException('No se pudo guardar el audio en el servidor.');
        }
        $fileSize = strlen($binary);

        $result = agenda_transcribe_audio($absolute, $baseMime, (int)(microtime(true) * 1000));
        $transcription = $result['ok'] ? trim($result['text']) : '';
        if (!$result['ok'] && ($result['error'] ?? '') !== '') {
            error_log('[agenda] Transcripción no disponible: ' . $result['error']);
        }
    } else {
        $transcription = $textInput;
    }

    $textForAnalysis = $transcription;
    if ($textForAnalysis === '' && $textInput !== '') {
        $textForAnalysis = $textInput;
    }

    $classification = agenda_classify_payload($textForAnalysis, $audioFile !== null);
    $classification['transcription'] = $transcription;

    $audioRecord = null;
    if ($audioId !== null && $audioFile !== null) {
        $audioRecord = [
            'id'            => $audioId,
            'file'          => $audioFile,
            'mime'          => $mime,
            'size'          => $fileSize,
            'duration'      => max(0, $duration),
            'transcription' => $transcription,
            'created_at'    => agenda_now(),
        ];
        $record = $audioRecord;
        agenda_state_update(static function (array &$state) use ($record): void {
            $state['audios'][] = $record;
        });
    }

    agenda_send_json(200, [
        'success'          => true,
        'audio_id'         => $audioId,
        'audio_url'        => $audioFile !== null ? 'uploads/audio/' . $audioFile : null,
        'duration_seconds' => max(0, $duration),
        'file_size_bytes'  => $fileSize,
        'classification'   => $classification,
    ]);
}

/**
 * Borra el audio asociado a una entidad eliminada si ya no lo usa nada más.
 * Evita dejar ficheros huérfanos consumiendo disco.
 */
function agenda_purge_audio(array &$state, string $audioId): void
{
    if ($audioId === '') {
        return;
    }
    foreach (['events', 'tasks', 'notes'] as $collection) {
        foreach ($state[$collection] as $entity) {
            if ((string)($entity['audio_id'] ?? '') === $audioId) {
                return;
            }
        }
    }
    $index = agenda_find_index($state['audios'], $audioId);
    if ($index < 0) {
        return;
    }
    $file = AGENDA_AUDIO_DIR . '/' . basename((string)($state['audios'][$index]['file'] ?? ''));
    if (($state['audios'][$index]['file'] ?? '') !== '' && is_file($file)) {
        @unlink($file);
    }
    array_splice($state['audios'], $index, 1);
}
