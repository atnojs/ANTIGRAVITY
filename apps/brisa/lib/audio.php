<?php
declare(strict_types=1);
require_once __DIR__ . '/core.php';

function upload_audio(array $file, array $data): array {
    $key = (string)($data['capture_key'] ?? '');
    if (!preg_match('/^[a-zA-Z0-9-]{16,64}$/', $key)) throw new DomainException('Identificador de captura no válido.',422);
    $existing = query('SELECT id,note_id FROM audios WHERE capture_key=?',[$key])->fetch();
    if ($existing) return $existing;
    if (($file['error'] ?? 1) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) throw new DomainException('No se recibió el audio completo. Comprueba el límite de subida del servidor.',422);
    $bytes = filesize($file['tmp_name']);
    if ($bytes < 64 || $bytes > 10485760) throw new DomainException('El audio debe ocupar menos de 10 MB y contener una grabación.',422);
    $duration = (int)($data['duration_ms'] ?? 0);
    if ($duration < 1 || $duration > 185000) throw new DomainException('La grabación supera los 3 minutos.',422);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $types = ['audio/webm'=>'webm','video/webm'=>'webm','audio/mp4'=>'m4a','video/mp4'=>'mp4','audio/x-m4a'=>'m4a','audio/mpeg'=>'mp3'];
    if (!isset($types[$mime])) throw new DomainException('Formato no admitido. Graba en WebM, MP4/M4A o MP3.',422);
    $lock = fopen(storage_dir().'/upload.lock','c');
    if (!$lock || !flock($lock,LOCK_EX)) throw new RuntimeException('No se pudo bloquear la subida.');
    $path = null;
    try {
        $existing = query('SELECT id,note_id FROM audios WHERE capture_key=?',[$key])->fetch();
        if ($existing) return $existing;
        if (used_bytes()+$bytes > quota_bytes()) throw new DomainException('No queda espacio. Elimina audios antiguos para continuar.',413);
        $audioId = uid(); $noteId = uid(); $filename = $audioId.'.'.$types[$mime]; $path = storage_dir().'/'.$filename;
        if (!move_uploaded_file($file['tmp_name'],$path)) throw new RuntimeException('No se pudo guardar el archivo.');
        chmod($path,0600);
        $captured = utc_field((string)($data['captured_at'] ?? now_utc()));
        db()->beginTransaction();
        insert_row('notes',['id'=>$noteId,'title'=>'Nota de voz','content'=>'','source'=>'audio','status'=>'inbox','captured_at'=>$captured,'timezone'=>timezone_name(),'created_at'=>now_utc(),'updated_at'=>now_utc()]);
        insert_row('audios',['id'=>$audioId,'note_id'=>$noteId,'capture_key'=>$key,'file_key'=>$filename,'mime'=>$mime,'bytes'=>$bytes,'duration_ms'=>$duration,'created_at'=>now_utc()]);
        db()->commit();
        return ['id'=>$audioId,'note_id'=>$noteId];
    } catch (Throwable $e) { if (db()->inTransaction()) db()->rollBack(); if ($path && is_file($path)) unlink($path); throw $e; }
    finally { flock($lock,LOCK_UN); fclose($lock); }
}
function process_audio(?string $id = null, ?callable $transport = null): array {
    if (!$transport && (!transcriber_key() || !function_exists('curl_init'))) return ['status'=>'unconfigured'];
    $where = $id ? ' AND id=?' : '';
    $params = [now_utc(), now_utc()]; if ($id) $params[]=$id;
    $audio = query("SELECT * FROM audios WHERE attempts<3 AND file_key IS NOT NULL AND ((status='pending' AND (next_attempt_at IS NULL OR next_attempt_at<=?)) OR (status='processing' AND lease_until<?)) $where ORDER BY created_at LIMIT 1",$params)->fetch();
    if (!$audio) return ['status'=>'idle'];
    $token=uid(); $until=gmdate('Y-m-d H:i:s',time()+150);
    $claim=query("UPDATE audios SET status='processing',lease_until=?,lease_token=?,attempts=attempts+1 WHERE id=? AND attempts=? AND ((status='pending' AND (next_attempt_at IS NULL OR next_attempt_at<=?)) OR (status='processing' AND lease_until<?))",[$until,$token,$audio['id'],$audio['attempts'],now_utc(),now_utc()]);
    if (!$claim->rowCount()) return ['status'=>'busy'];
    $note=row('notes',$audio['note_id']);
    try {
        $path=storage_dir().'/'.$audio['file_key'];
        if (!is_file($path)) throw new RuntimeException('No se encuentra el archivo de audio.');
        if ($transport) $text=$transport($path);
        else {
            $ch=curl_init('https://api.openai.com/v1/audio/transcriptions');
            if (PHP_OS_FAMILY === 'Windows' && defined('CURLSSLOPT_NATIVE_CA')) curl_setopt($ch, CURLOPT_SSL_OPTIONS, CURLSSLOPT_NATIVE_CA);
            curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>15,CURLOPT_TIMEOUT=>110,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.transcriber_key()],CURLOPT_POSTFIELDS=>['file'=>new CURLFile($path,$audio['mime'],basename($path)),'model'=>env_value('BRISA_TRANSCRIPTION_MODEL','gpt-4o-mini-transcribe')]]);
            $raw=curl_exec($ch); $status=curl_getinfo($ch,CURLINFO_HTTP_CODE); $failed=curl_errno($ch); curl_close($ch);
            if ($failed) throw new RuntimeException('No se pudo conectar con el servicio. Se reintentará automáticamente.');
            if ($status<200 || $status>=300) throw new RuntimeException(match($status) { 401,403=>'Revisa la clave de transcripción del servidor.', 429=>'El servicio ha alcanzado su cuota o límite. Revisa la cuenta.', default=>'El servicio de transcripción no está disponible ('.$status.').' });
            $result=json_decode((string)$raw,true); $text=trim((string)($result['text'] ?? ''));
        }
        if (!$text) throw new RuntimeException('No se detectó voz. Puedes conservar el audio o escribir la nota.');
        db()->beginTransaction();
        $q=query("UPDATE audios SET status='transcribed',transcript=?,transcribed_at=?,model=?,error=NULL,lease_until=NULL,lease_token=NULL WHERE id=? AND lease_token=?",[$text,now_utc(),env_value('BRISA_TRANSCRIPTION_MODEL','gpt-4o-mini-transcribe'),$audio['id'],$token]);
        if ($q->rowCount()) {
            // Preserve edits made while the provider was processing the recording.
            query("UPDATE notes SET content=?,suggestion=?,updated_at=?,version=version+1 WHERE id=? AND version=? AND content=''",[$text,json_encode(suggest($text,$note['captured_at'],$note['timezone']),JSON_UNESCAPED_UNICODE),now_utc(),$note['id'],$note['version']]);
        }
        db()->commit(); return ['status'=>'transcribed','id'=>$audio['id']];
    } catch (Throwable $e) {
        if (db()->inTransaction()) db()->rollBack();
        $last=(int)$audio['attempts']>=2;
        query('UPDATE audios SET status=?,error=?,next_attempt_at=?,lease_until=NULL,lease_token=NULL WHERE id=? AND lease_token=?',[$last?'failed':'pending',$e->getMessage(),gmdate('Y-m-d H:i:s',time()+(60*(2**(int)$audio['attempts']))),$audio['id'],$token]);
        return ['status'=>$last?'failed':'pending','id'=>$audio['id']];
    }
}
function cleanup_audio(): int {
    // An interrupted upload can leave an unreferenced file. Never delete recent uploads.
    $lock=fopen(storage_dir().'/upload.lock','c');
    if ($lock && flock($lock,LOCK_EX)) {
        try {
            foreach (new DirectoryIterator(storage_dir()) as $file) {
                if ($file->isFile() && preg_match('/^[a-f0-9]{32}\.(webm|mp4|m4a|mp3)$/',$file->getFilename()) && $file->getMTime()<time()-86400
                    && !query('SELECT id FROM audios WHERE file_key=?',[$file->getFilename()])->fetchColumn()) unlink($file->getPathname());
            }
        } finally { flock($lock,LOCK_UN); fclose($lock); }
    }
    // A process terminated on its final attempt must become retryable manually.
    query("UPDATE audios SET status='failed',error='El procesamiento se interrumpió. Puedes reintentarlo.',lease_token=NULL,lease_until=NULL WHERE status='processing' AND attempts>=3 AND lease_until<?",[now_utc()]);
    $days=max(0,(int)env_value('BRISA_RETENTION_DAYS','30')); $count=0;
    if (!$days) return 0;
    foreach(query("SELECT id,file_key FROM audios WHERE status='transcribed' AND file_key IS NOT NULL AND transcribed_at<?",[gmdate('Y-m-d H:i:s',time()-$days*86400)])->fetchAll() as $audio) {
        $path=storage_dir().'/'.$audio['file_key'];
        if (!is_file($path) || unlink($path)) { query('UPDATE audios SET file_key=NULL,deleted_at=? WHERE id=?',[now_utc(),$audio['id']]); $count++; }
    }
    return $count;
}
