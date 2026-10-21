<?php
declare(strict_types=1);

function env_value(string $name, string $default = ''): string {
    foreach ([$name, 'REDIRECT_' . $name] as $key) {
        $value = getenv($key) ?: ($_SERVER[$key] ?? $_ENV[$key] ?? '');
        if ($value !== '') return (string)$value;
    }
    return $default;
}
function local_preview(): bool {
    $host = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    return PHP_SAPI === 'cli-server' && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)
        && in_array($host, ['127.0.0.1', 'localhost', '[::1]'], true)
        && env_value('BRISA_PREVIEW') === '1';
}
function storage_dir(): string {
    static $path;
    if ($path) return $path;
    $candidate = env_value('BRISA_STORAGE');
    if (!$candidate) {
        // Despliegue sin panel de entorno (Hostinger compartido): se deduce una
        // carpeta privada fuera de la raíz web. Nunca se usa una ruta pública.
        $docroot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
        $home = getenv('HOME') ?: '';
        $tries = [];
        if ($docroot) $tries[] = dirname($docroot) . DIRECTORY_SEPARATOR . 'brisa-private';
        if ($home) $tries[] = rtrim($home, '/\\') . DIRECTORY_SEPARATOR . 'brisa-private';
        foreach ($tries as $try) {
            if (!is_dir($try) && !@mkdir($try, 0700, true) && !is_dir($try)) continue;
            $resolvedTry = realpath($try);
            if ($resolvedTry !== false) { $candidate = $resolvedTry; break; }
        }
    }
    if (!$candidate) throw new RuntimeException('Configura BRISA_STORAGE con una carpeta privada fuera de la raíz web.');
    if (!is_dir($candidate) && !mkdir($candidate, 0700, true) && !is_dir($candidate)) throw new RuntimeException('No se pudo preparar el almacenamiento.');
    $resolved = realpath($candidate);
    $docroot = (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
    $root = $docroot !== '' ? (realpath($docroot) ?: false) : false;
    if ($root === false) $root = realpath(dirname(__DIR__)) ?: '';
    if ($root && str_starts_with(strtolower(str_replace('\\', '/', $resolved)) . '/', strtolower(str_replace('\\', '/', $root)) . '/')) {
        throw new RuntimeException('El almacenamiento debe estar fuera de la raíz web.');
    }
    return $path = $resolved;
}
function now_utc(): string { return gmdate('Y-m-d H:i:s'); }
function uid(): string { return bin2hex(random_bytes(16)); }
function timezone_name(): string {
    $name = env_value('BRISA_TIMEZONE', 'Atlantic/Canary');
    new DateTimeZone($name);
    return $name;
}
function db(): PDO {
    static $db;
    if ($db) return $db;
    $dsn = env_value('BRISA_DSN', 'sqlite:' . storage_dir() . '/brisa.sqlite');
    $db = new PDO($dsn, env_value('BRISA_DB_USER'), env_value('BRISA_DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    if ($db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite') {
        $db->exec('PRAGMA foreign_keys = ON');
        $db->exec('PRAGMA journal_mode = WAL');
        $db->exec('PRAGMA busy_timeout = 5000');
    }
    migrate($db);
    return $db;
}
function migrate(PDO $db): void {
    $tail = $db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    $common = 'id VARCHAR(32) PRIMARY KEY, created_at VARCHAR(19) NOT NULL, updated_at VARCHAR(19) NOT NULL, version INTEGER NOT NULL DEFAULT 1, demo INTEGER NOT NULL DEFAULT 0';
    $db->exec("CREATE TABLE IF NOT EXISTS notes ($common, title VARCHAR(200) NOT NULL, content TEXT NOT NULL, source VARCHAR(10) NOT NULL DEFAULT 'text', status VARCHAR(20) NOT NULL DEFAULT 'inbox', captured_at VARCHAR(32) NOT NULL, timezone VARCHAR(64) NOT NULL, suggestion TEXT NULL, converted_type VARCHAR(10) NULL, converted_id VARCHAR(32) NULL)$tail");
    $db->exec("CREATE TABLE IF NOT EXISTS events ($common, title VARCHAR(200) NOT NULL, description TEXT NOT NULL, start_at VARCHAR(19) NOT NULL, end_at VARCHAR(19) NOT NULL, timezone VARCHAR(64) NOT NULL, location VARCHAR(255) NOT NULL DEFAULT '', color VARCHAR(20) NOT NULL DEFAULT 'sage', note_id VARCHAR(32) NULL, FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE SET NULL)$tail");
    $db->exec("CREATE TABLE IF NOT EXISTS tasks ($common, title VARCHAR(200) NOT NULL, description TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending', priority INTEGER NOT NULL DEFAULT 2, due_date VARCHAR(10) NULL, planned_date VARCHAR(10) NULL, completed_at VARCHAR(19) NULL, note_id VARCHAR(32) NULL, FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE SET NULL)$tail");
    $db->exec("CREATE TABLE IF NOT EXISTS audios (id VARCHAR(32) PRIMARY KEY, note_id VARCHAR(32) NOT NULL, capture_key VARCHAR(64) NOT NULL UNIQUE, file_key VARCHAR(100) NULL, mime VARCHAR(100) NOT NULL, bytes BIGINT NOT NULL, duration_ms INTEGER NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending', transcript TEXT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at VARCHAR(19) NULL, lease_until VARCHAR(19) NULL, lease_token VARCHAR(32) NULL, error TEXT NULL, model VARCHAR(100) NULL, created_at VARCHAR(19) NOT NULL, transcribed_at VARCHAR(19) NULL, deleted_at VARCHAR(19) NULL, FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE)$tail");
    // An app-level marker avoids repeated index creation on both supported databases.
    $db->exec("CREATE TABLE IF NOT EXISTS meta (name VARCHAR(80) PRIMARY KEY, value TEXT NOT NULL)$tail");
    if (!$db->query("SELECT value FROM meta WHERE name='indexes-v1'")->fetchColumn()) {
        foreach (['CREATE INDEX idx_events_start ON events(start_at)', 'CREATE INDEX idx_tasks_state ON tasks(status, planned_date)', 'CREATE INDEX idx_notes_state ON notes(status, updated_at)', 'CREATE INDEX idx_audio_queue ON audios(status, next_attempt_at)', 'CREATE INDEX idx_audio_note ON audios(note_id)'] as $sql) {
            try { $db->exec($sql); } catch (PDOException $e) { if (!str_contains(strtolower($e->getMessage()), 'already exists') && !str_contains(strtolower($e->getMessage()), 'duplicate key name')) throw $e; }
        }
        try { $db->exec("INSERT INTO meta(name,value) VALUES ('indexes-v1','1')"); } catch (PDOException $e) { if (!in_array((string)$e->getCode(), ['23000', '23505'], true)) throw $e; }
    }
}
function query(string $sql, array $params = []): PDOStatement { $q = db()->prepare($sql); $q->execute($params); return $q; }
function row(string $table, string $id): array {
    if (!in_array($table, ['tasks', 'notes', 'events', 'audios'], true)) throw new InvalidArgumentException('Tipo no válido.');
    $item = query("SELECT * FROM $table WHERE id=?", [$id])->fetch();
    if (!$item) throw new DomainException('Este elemento ya no existe.', 404);
    return $item;
}
function insert_row(string $table, array $data): void {
    $names = implode(',', array_keys($data));
    query("INSERT INTO $table ($names) VALUES (" . implode(',', array_fill(0, count($data), '?')) . ')', array_values($data));
}
function text_field(array $data, string $key, int $max, bool $required = false): string {
    $v = trim((string)($data[$key] ?? ''));
    if (preg_match_all('/./us', $v) > $max || ($required && $v === '')) throw new DomainException('Revisa el campo ' . $key . '.', 422);
    return $v;
}
function date_field(mixed $v): ?string {
    if (!$v) return null;
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', (string)$v);
    if (!$d || $d->format('Y-m-d') !== $v) throw new DomainException('La fecha no es válida.', 422);
    return $v;
}
function utc_field(string $value): string {
    try { $d = new DateTimeImmutable($value, new DateTimeZone('UTC')); } catch (Exception) { throw new DomainException('La fecha y hora no son válidas.', 422); }
    if (!$value || $d->format('Y') < '2000' || $d->format('Y') > '2100') throw new DomainException('La fecha está fuera del intervalo permitido.', 422);
    return $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
}
function suggest(string $text, string $captured, string $timezone): array {
    $base = new DateTimeImmutable($captured, new DateTimeZone('UTC'));
    $base = $base->setTimezone(new DateTimeZone($timezone));
    $day = null;
    if (preg_match('/\bpasado mañana\b/iu', $text)) $day = $base->modify('+2 days')->format('Y-m-d');
    elseif (preg_match('/\bmañana\b/iu', $text)) $day = $base->modify('+1 day')->format('Y-m-d');
    elseif (preg_match('/\bhoy\b/iu', $text)) $day = $base->format('Y-m-d');
    elseif (preg_match('/\b(20\d{2}-\d{2}-\d{2})\b/u', $text, $m)) { try { $day = date_field($m[1]); } catch (DomainException) {} }
    else {
        foreach (['lunes'=>1,'martes'=>2,'miércoles'=>3,'miercoles'=>3,'jueves'=>4,'viernes'=>5,'sábado'=>6,'sabado'=>6,'domingo'=>7] as $name=>$n) {
            if (preg_match('/\b' . $name . '\b/iu', $text)) { $offset = ($n - (int)$base->format('N') + 7) % 7; $day = $base->modify('+' . ($offset ?: 7) . ' days')->format('Y-m-d'); break; }
        }
    }
    $time = null;
    if (preg_match('/(?:a las?\s+|\b)([01]?\d|2[0-3]):([0-5]\d)\b/iu', $text, $m)) $time = sprintf('%02d:%02d', $m[1], $m[2]);
    elseif (preg_match('/\ba las?\s+([01]?\d|2[0-3])\b/iu', $text, $m)) $time = sprintf('%02d:00', $m[1]);
    $action = preg_match('/\b(llamar|comprar|enviar|preparar|revisar|terminar|hacer|recordar|pagar|entregar|reservar|pedir)\b/iu', $text);
    $appointment = preg_match('/\b(cita|reunión|reunion|dentista|consulta|comida con|sesión|sesion|entrevista)\b/iu', $text);
    $type = $appointment && !$action ? 'event' : ($action ? 'task' : 'note');
    return ['type'=>$type, 'date'=>$day, 'time'=>$time, 'needs_review'=>true];
}
function save_item(string $type, array $data): array {
    $table = ['task'=>'tasks', 'event'=>'events', 'note'=>'notes'][$type] ?? null;
    if (!$table) throw new DomainException('Tipo no válido.', 422);
    $id = $data['id'] ?? '';
    $existing = $id ? row($table, $id) : null;
    $fields = ['title'=>text_field($data, 'title', 200, $type !== 'note')];
    if ($type === 'note') {
        $fields['content'] = text_field($data, 'content', 100000);
        if (!$fields['content'] && !$existing) throw new DomainException('Escribe algo para guardar la nota.', 422);
        $fields['suggestion'] = json_encode(suggest($fields['content'], $existing['captured_at'] ?? now_utc(), $existing['timezone'] ?? timezone_name()), JSON_UNESCAPED_UNICODE);
    } else {
        $fields['description'] = text_field($data, 'description', 20000);
    }
    if ($type === 'task') {
        $fields += ['priority'=>(int)($data['priority'] ?? 2), 'due_date'=>date_field($data['due_date'] ?? null), 'planned_date'=>date_field($data['planned_date'] ?? null)];
        if (!in_array($fields['priority'], [1,2,3], true)) throw new DomainException('Prioridad no válida.', 422);
    }
    if ($type === 'event') {
        $fields += ['start_at'=>utc_field((string)($data['start_at'] ?? '')), 'end_at'=>utc_field((string)($data['end_at'] ?? '')), 'timezone'=>timezone_name(), 'location'=>text_field($data, 'location', 255), 'color'=>$data['color'] ?? 'sage'];
        if ($fields['end_at'] <= $fields['start_at']) throw new DomainException('La cita debe terminar después de empezar.', 422);
        if (!in_array($fields['color'], ['sage','clay','lavender'], true)) $fields['color'] = 'sage';
        $overlap = query('SELECT id FROM events WHERE start_at < ? AND end_at > ? AND id <> ?', [$fields['end_at'], $fields['start_at'], $id])->fetchColumn();
        if ($overlap && empty($data['allow_overlap'])) throw new DomainException('Esta cita coincide con otra. Confirma el solapamiento para guardarla.', 409);
    }
    $fields['updated_at'] = now_utc();
    if ($existing) {
        $version = (int)($data['version'] ?? 0);
        $sets = implode(',', array_map(fn($key)=>"$key=?", array_keys($fields)));
        $q = query("UPDATE $table SET $sets, version=version+1 WHERE id=? AND version=?", [...array_values($fields), $id, $version]);
        if (!$q->rowCount()) throw new DomainException('Ha cambiado en otra ventana. Recarga antes de guardar.', 409);
    } else {
        $id = uid();
        $fields += ['id'=>$id, 'created_at'=>now_utc()];
        if ($type === 'note') $fields += ['captured_at'=>now_utc(),'timezone'=>timezone_name()];
        insert_row($table, $fields);
    }
    return row($table, $id);
}
function convert_note(array $data): array {
    $type = $data['type'] ?? '';
    if (!in_array($type, ['task','event'], true)) throw new DomainException('Destino no válido.', 422);
    db()->beginTransaction();
    try {
        $note = row('notes', (string)($data['note_id'] ?? ''));
        if ($note['status'] === 'converted') {
            db()->commit();
            return ['id'=>$note['converted_id'], 'type'=>$note['converted_type']];
        }
        $q = query("UPDATE notes SET status='converted',version=version+1 WHERE id=? AND version=?", [$note['id'], (int)($data['note_version'] ?? 0)]);
        if (!$q->rowCount()) throw new DomainException('La nota ha cambiado. Abre de nuevo la propuesta.', 409);
        unset($data['id']);
        $target = save_item($type, $data);
        $table = $type === 'task' ? 'tasks' : 'events';
        query("UPDATE $table SET note_id=? WHERE id=?", [$note['id'],$target['id']]);
        query('UPDATE notes SET converted_type=?,converted_id=?,updated_at=? WHERE id=?', [$type,$target['id'],now_utc(),$note['id']]);
        db()->commit();
        return ['id'=>$target['id'],'type'=>$type];
    } catch (Throwable $e) { if (db()->inTransaction()) db()->rollBack(); throw $e; }
}
function delete_item(string $type, string $id): void {
    $table = ['task'=>'tasks','event'=>'events','note'=>'notes'][$type] ?? null;
    if (!$table) throw new DomainException('Tipo no válido.',422);
    row($table,$id);
    if ($table === 'notes') {
        if (query("SELECT id FROM audios WHERE note_id=? AND status='processing' AND lease_until>?", [$id,now_utc()])->fetchColumn()) throw new DomainException('Espera a que termine la transcripción antes de eliminar.',409);
        foreach (query('SELECT file_key FROM audios WHERE note_id=?',[$id])->fetchAll() as $audio) {
            if ($audio['file_key'] && is_file(storage_dir().'/'.$audio['file_key']) && !unlink(storage_dir().'/'.$audio['file_key'])) throw new RuntimeException('No se pudo eliminar el audio.');
        }
    }
    query("DELETE FROM $table WHERE id=?",[$id]);
    if ($table !== 'notes') query("UPDATE notes SET status='inbox',converted_id=NULL,converted_type=NULL,version=version+1 WHERE converted_id=?",[$id]);
}
function transcriber_key(): string { return env_value('OPENAI_API_KEY', env_value('R')); }
function quota_bytes(): int { return max(10485760, (int)env_value('BRISA_QUOTA_MB','500') * 1048576); }
function used_bytes(): int {
    $total = 0;
    foreach (new DirectoryIterator(storage_dir()) as $file) {
        if ($file->isFile() && preg_match('/^[a-f0-9]{32}\.(webm|mp4|m4a|mp3)$/', $file->getFilename())) $total += $file->getSize();
    }
    return $total;
}
function state_data(): array {
    $audios = query('SELECT id,note_id,mime,duration_ms,status,error,attempts,created_at,deleted_at,file_key FROM audios ORDER BY created_at DESC')->fetchAll();
    foreach ($audios as &$a) { $a['available'] = (bool)$a['file_key']; unset($a['file_key']); }
    return ['events'=>query('SELECT * FROM events ORDER BY start_at')->fetchAll(), 'tasks'=>query('SELECT * FROM tasks ORDER BY priority,created_at DESC')->fetchAll(), 'notes'=>query('SELECT * FROM notes ORDER BY created_at DESC')->fetchAll(), 'audios'=>$audios, 'config'=>['timezone'=>timezone_name(),'transcription_ready'=>(bool)transcriber_key() && function_exists('curl_init'),'local'=>local_preview(),'storage_used'=>used_bytes(),'storage_quota'=>quota_bytes(),'retention_days'=>(int)env_value('BRISA_RETENTION_DAYS','30'),'model'=>env_value('BRISA_TRANSCRIPTION_MODEL','gpt-4o-mini-transcribe')]];
}
