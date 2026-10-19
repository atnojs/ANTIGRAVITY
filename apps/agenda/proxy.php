<?php
declare(strict_types=1);

/**
 * proxy.php — transcripción de audio y acceso a la IA.
 *
 * Igual que en el resto del proyecto, la clave NO vive en este archivo: se
 * resuelve del entorno del servidor (SetEnv del .htaccess raíz de Hostinger).
 * Variables admitidas, en orden: OPENAI_API_KEY y su alias O.
 *
 * Funciona de dos formas:
 *   - Incluido desde api.php/worker.php (define AGENDA_INTERNAL): expone funciones.
 *   - Acceso web directo: solo ?action=health (diagnóstico sin gastar API).
 */

/**
 * Busca una clave en todas las formas en que Hostinger puede exponer SetEnv.
 */
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

function agenda_proxy_health(): array
{
    return [
        'ok'       => true,
        'app'      => 'agenda',
        'version'  => AGENDA_VERSION,
        'time'     => date('c'),
        'stt'      => agenda_stt_configured(),
        'stt_mock' => agenda_stt_mock_enabled(),
    ];
}

/**
 * Transcribe un audio con OpenAI. Si AGENDA_MOCK_STT está activo (solo
 * desarrollo/pruebas locales) devuelve una transcripción de ejemplo para
 * poder probar el flujo completo sin gastar API.
 *
 * @return array{ok:bool,text:string,error:string,model:string}
 */
function agenda_stt_transcribe(string $path, string $mime, int $seed = 0): array
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
        $text = $samples[$seed % count($samples)];
        return ['ok' => true, 'text' => $text, 'error' => '', 'model' => 'mock-local'];
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

/**
 * Procesa un audio: lo reclama, transcribe, clasifica y actualiza la nota.
 * Se ejecuta en segundo plano (ignore_user_abort) o desde worker.php por cron.
 */
function agenda_process_audio(int $audioId): void
{
    $claimed = agenda_state_update(function (array &$state) use ($audioId) {
        $index = agenda_find_index($state['audios'], $audioId);
        if ($index < 0) {
            return null;
        }
        $audio = $state['audios'][$index];
        if (in_array($audio['status'] ?? '', ['transcribing', 'transcribed'], true)) {
            return null;
        }
        if ((int)($audio['attempts'] ?? 0) >= AGENDA_MAX_ATTEMPTS) {
            return null;
        }
        $audio['status']    = 'transcribing';
        $audio['attempts']  = (int)($audio['attempts'] ?? 0) + 1;
        $audio['last_error'] = null;
        $audio['locked_at'] = agenda_now();
        $state['audios'][$index] = $audio;
        return $audio;
    });
    if (!is_array($claimed)) {
        return;
    }

    $absolute = AGENDA_AUDIO_DIR . '/' . ltrim((string)($claimed['file'] ?? ''), '/');
    $result = agenda_stt_transcribe($absolute, (string)($claimed['mime'] ?? 'audio/webm'), (int)$audioId);
    $text = trim((string)($result['text'] ?? ''));

    if (!$result['ok'] || $text === '') {
        $message = $result['ok'] ? 'La transcripción llegó vacía. Prueba a grabar de nuevo.' : (string)$result['error'];
        agenda_state_update(function (array &$state) use ($audioId, $message) {
            $index = agenda_find_index($state['audios'], $audioId);
            if ($index >= 0) {
                $state['audios'][$index]['status']     = 'failed';
                $state['audios'][$index]['last_error'] = $message;
                $state['audios'][$index]['locked_at']  = null;
            }
        });
        return;
    }

    $suggestion = agenda_classify($text);
    $noteText = agenda_upper_first(rtrim($text, " \t\n\r"));
    if (!preg_match('/[.!?…]$/u', $noteText)) {
        $noteText .= '.';
    }
    $title = (string)($suggestion['title'] ?? 'Nota de voz');
    if ($title === '') {
        $title = 'Nota de voz';
    }

    agenda_state_update(function (array &$state) use ($audioId, $text, $noteText, $title, $suggestion, $result) {
        $audioIndex = agenda_find_index($state['audios'], $audioId);
        if ($audioIndex < 0) {
            return;
        }
        $noteId = (int)($state['audios'][$audioIndex]['note_id'] ?? 0);
        $noteIndex = agenda_find_index($state['notes'], $noteId);
        if ($noteIndex >= 0) {
            $state['notes'][$noteIndex]['title']      = $title;
            $state['notes'][$noteIndex]['body']       = $noteText;
            $state['notes'][$noteIndex]['source']     = 'audio';
            $state['notes'][$noteIndex]['updated_at'] = agenda_now();
        }
        $state['audios'][$audioIndex]['status']         = 'transcribed';
        $state['audios'][$audioIndex]['transcript_raw'] = $text;
        $state['audios'][$audioIndex]['language']       = 'es';
        $state['audios'][$audioIndex]['model']          = (string)($result['model'] ?? '');
        $state['audios'][$audioIndex]['suggestion']     = $suggestion;
        $state['audios'][$audioIndex]['processed_at']   = agenda_now();
        $state['audios'][$audioIndex]['locked_at']      = null;
    });

    agenda_cleanup_audio();
}

/** Elimina los audios que superan su fecha de retención (la transcripción se conserva). */
function agenda_cleanup_audio(): void
{
    $today = agenda_today();
    $toDelete = agenda_state_update(function (array &$state) use ($today) {
        $paths = [];
        foreach ($state['audios'] as $index => $audio) {
            if (!empty($audio['deleted_at']) || empty($audio['file'])) {
                continue;
            }
            if (empty($audio['delete_after']) || strcmp((string)$audio['delete_after'], $today) > 0) {
                continue;
            }
            if (!in_array($audio['status'] ?? '', ['transcribed', 'failed'], true)) {
                continue;
            }
            $paths[] = AGENDA_AUDIO_DIR . '/' . ltrim((string)$audio['file'], '/');
            unset($state['audios'][$index]['file']);
            $state['audios'][$index]['deleted_at'] = agenda_now();
        }
        return $paths;
    });
    foreach ($toDelete as $path) {
        if (is_file($path)) {
            @unlink($path);
        }
    }
}

/* ------------------------------------------------------------------ */
/* Acceso web directo: solo health (diagnóstico sin gastar API)       */
/* ------------------------------------------------------------------ */
if (!defined('AGENDA_INTERNAL')) {
    require_once __DIR__ . '/lib.php';
    $action = strtolower((string)($_GET['action'] ?? 'health'));
    if ($action === 'health') {
        agenda_send_json(200, agenda_proxy_health());
    }
    agenda_send_json(404, ['ok' => false, 'error' => 'No encontrado.']);
}
