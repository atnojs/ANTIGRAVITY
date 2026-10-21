<?php
declare(strict_types=1);
require_once __DIR__.'/lib/audio.php';
ini_set('display_errors','0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
function respond(array $data, int $code=200): never { http_response_code($code); echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE); exit; }

/**
 * Contraseña de edición compartida del proyecto (mismo mecanismo que el resto
 * de apps: solo se guarda su sha256). Se usa cuando el hosting no permite
 * definir BRISA_PASSWORD_HASH en el panel de entorno.
 */
const BRISA_EDIT_PASSWORD_SHA256 = '0c79272e8c147c95bedd7450abfd42cb3377947341694276c5835caeb9f435ee';

try {
    $secure=(!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS']!=='off');
    if (!local_preview() && !$secure) respond(['error'=>'Accede a la agenda mediante HTTPS.'],403);
    session_name('brisa_session');
    session_set_cookie_params(['httponly'=>true,'secure'=>$secure,'samesite'=>'Strict','path'=>rtrim(str_replace('\\','/',dirname($_SERVER['SCRIPT_NAME'])),'/').'/']);
    ini_set('session.use_strict_mode','1'); session_start();
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    $csrf=$_SESSION['csrf'];
    $action=(string)($_GET['action'] ?? 'state');
    $auth=local_preview() || (!empty($_SESSION['authenticated']) && ($_SESSION['last_active'] ?? 0)>time()-43200);
    if ($auth) $_SESSION['last_active']=time();
    $method=$_SERVER['REQUEST_METHOD'];
    $readActions=['state','audio','export','transcript'];
    if (!in_array($action,$readActions,true)) {
        if ($method!=='POST') respond(['error'=>'Método no permitido.'],405);
        if (!hash_equals($csrf,(string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) respond(['error'=>'La sesión ha cambiado. Recarga la página.'],403);
    }
    $data=[];
    if (str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>200000) respond(['error'=>'Petición demasiado grande.'],413);
        $data=json_decode(file_get_contents('php://input'),true);
        if (!is_array($data)) respond(['error'=>'Datos no válidos.'],422);
    }
    if ($action==='login') {
        // BRISA_PASSWORD_HASH (bcrypt) si está configurada; si no, la contraseña
        // de edición compartida del proyecto (sha256, solo su hash).
        $hash=env_value('BRISA_PASSWORD_HASH');
        $handle=fopen(storage_dir().'/login-'.hash('sha256',$_SERVER['REMOTE_ADDR'] ?? 'unknown').'.json','c+');
        if (!$handle || !flock($handle,LOCK_EX)) throw new RuntimeException('No se pudo verificar el acceso.');
        $attempts=json_decode(stream_get_contents($handle),true) ?: ['since'=>time(),'count'=>0];
        if ($attempts['since']<time()-900) $attempts=['since'=>time(),'count'=>0];
        $password=(string)($data['password'] ?? '');
        $valid=$attempts['count']<10 && ($hash
            ? password_verify($password,$hash)
            : hash_equals(BRISA_EDIT_PASSWORD_SHA256, hash('sha256', $password)));
        $attempts['count']=$valid?0:$attempts['count']+1;
        rewind($handle); ftruncate($handle,0); fwrite($handle,json_encode($attempts)); flock($handle,LOCK_UN); fclose($handle);
        if (!$valid) respond(['error'=>$attempts['count']>=10?'Demasiados intentos. Espera 15 minutos.':'La contraseña no es correcta.'],401);
        session_regenerate_id(true); $_SESSION['authenticated']=true; $_SESSION['last_active']=time(); $_SESSION['csrf']=bin2hex(random_bytes(32));
        respond(['ok'=>true,'csrf'=>$_SESSION['csrf']]);
    }
    if (!$auth) respond(['authenticated'=>false,'csrf'=>$csrf,'setup_required'=>false],$action==='state'?200:401);
    if ($action==='logout') { $_SESSION=[]; session_destroy(); respond(['ok'=>true]); }
    session_write_close();
    switch ($action) {
        case 'state': respond(['authenticated'=>true,'csrf'=>$csrf,...state_data()]);
        case 'save': respond(['item'=>save_item((string)($data['type'] ?? ''),$data)]);
        case 'convert': respond(convert_note($data));
        case 'delete': delete_item((string)($data['type'] ?? ''),(string)($data['id'] ?? '')); respond(['ok'=>true]);
        case 'toggle':
            $item=row('tasks',(string)($data['id'] ?? '')); $done=!empty($data['completed']);
            $q=query('UPDATE tasks SET status=?,completed_at=?,version=version+1,updated_at=? WHERE id=? AND version=?',[$done?'completed':'pending',$done?now_utc():null,now_utc(),$item['id'],(int)($data['version'] ?? 0)]);
            if (!$q->rowCount()) throw new DomainException('La tarea ha cambiado. Actualiza la lista.',409);
            respond(['ok'=>true]);
        case 'archive':
            $item=row('notes',(string)($data['id'] ?? ''));
            if ($item['status']==='converted') throw new DomainException('La nota ya está vinculada a una tarea o cita.',409);
            $q=query('UPDATE notes SET status=?,updated_at=?,version=version+1 WHERE id=? AND version=?',[!empty($data['archived'])?'archived':'inbox',now_utc(),$item['id'],(int)($data['version'] ?? 0)]);
            if (!$q->rowCount()) throw new DomainException('La nota ha cambiado. Actualiza la bandeja.',409);
            respond(['ok'=>true]);
        case 'upload': respond(upload_audio($_FILES['audio'] ?? [],$_POST),201);
        case 'process': set_time_limit(130); ignore_user_abort(true); cleanup_audio(); respond(process_audio(isset($data['id'])?(string)$data['id']:null));
        case 'retry':
            $a=row('audios',(string)($data['id'] ?? ''));
            if ($a['status']==='processing' && $a['lease_until']>now_utc()) throw new DomainException('Este audio todavía se está procesando.',409);
            if (!$a['file_key'] || $a['status']==='transcribed') throw new DomainException('Este audio no requiere un reintento.',422);
            query("UPDATE audios SET status='pending',attempts=0,error=NULL,next_attempt_at=NULL,lease_until=NULL,lease_token=NULL WHERE id=?",[$a['id']]); respond(['ok'=>true]);
        case 'transcript': $a=row('audios',(string)($_GET['id'] ?? '')); respond(['text'=>$a['transcript'] ?? '']);
        case 'audio':
            $a=row('audios',(string)($_GET['id'] ?? ''));
            $file=$a['file_key']?storage_dir().'/'.$a['file_key']:'';
            if (!$file || !is_file($file)) throw new DomainException('El audio ya no está disponible.',404);
            header('Content-Type: '.$a['mime']); header('Content-Length: '.filesize($file)); header('Content-Disposition: inline; filename="nota-voz.'.pathinfo($file,PATHINFO_EXTENSION).'"'); readfile($file); exit;
        case 'export':
            $state=state_data(); unset($state['config']);
            $state['audios']=query('SELECT id,note_id,mime,duration_ms,status,transcript,created_at FROM audios')->fetchAll();
            header('Content-Disposition: attachment; filename="brisa-'.gmdate('Y-m-d').'.json"'); respond(['format'=>'brisa-1','exported_at'=>gmdate('c'),...$state]);
        default: respond(['error'=>'Ruta no encontrada.'],404);
    }
} catch (DomainException $e) { respond(['error'=>$e->getMessage()],in_array($e->getCode(),[404,409,413,422],true)?$e->getCode():422); }
catch (Throwable $e) { error_log('Brisa: '.$e->getMessage()); respond(['error'=>'No se pudo completar la operación. Revisa la configuración del servidor.'],500); }
