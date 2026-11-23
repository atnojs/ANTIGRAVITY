<?php
declare(strict_types=1);
/**
 * Proxy de «Analista de URL».
 *
 * La app no genera ni edita nada con IA: aquí no hay claves ni proveedores.
 * Acciones:
 *   health — endpoint de salud que usan el catálogo y las comprobaciones de despliegue.
 *   meta   — metadatos públicos (YouTube y GitHub): título, autor, licencia, estrellas.
 *   leer   — texto de la fuente para poder analizarla: subtítulos de YouTube,
 *            README de un repositorio o el texto principal de una página.
 *
 * Por qué `leer` vive en el servidor: la CSP del hosting bloquea el fetch externo
 * desde el navegador, y el subtítulo de YouTube no se puede pedir con CORS.
 *
 * No es un proxy genérico:
 *   · meta  no acepta URLs: reconstruye el destino desde un id validado.
 *   · leer  acepta una URL de página, pero sólo http(s), sin IP privada ni
 *           redirecciones a la red interna, con tope de bytes y de tiempo,
 *           y devuelve texto extraído, nunca la respuesta cruda.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
set_time_limit(30);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAX_VIDEO_CHARS = 60000;
const MAX_REPO_CHARS = 60000;
const MAX_WEB_CHARS = 40000;
const MAX_BYTES = 1572864;

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** GET/POST a una URL con tope de bytes y de tiempo. Devuelve [status, cuerpo, error, truncado]. */
function pedir(string $url, array $cabeceras, int $timeout = 10, ?string $cuerpo = null): array {
    $ch = curl_init($url);
    $recibido = 0;
    $trozos = [];
    $truncado = false;
    $opciones = [
        CURLOPT_HTTPHEADER => $cabeceras,
        CURLOPT_CONNECTTIMEOUT => 6,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_WRITEFUNCTION => function ($ch, string $trozo) use (&$recibido, &$trozos, &$truncado): int {
            if ($recibido >= MAX_BYTES) { $truncado = true; return 0; } // ya hay bastante: corta
            $recibido += strlen($trozo);
            $trozos[] = $trozo;
            if ($recibido >= MAX_BYTES) { $truncado = true; return 0; }
            return strlen($trozo);
        },
    ];
    if ($cuerpo !== null) {
        $opciones[CURLOPT_POST] = true;
        $opciones[CURLOPT_POSTFIELDS] = $cuerpo;
    }
    curl_setopt_array($ch, $opciones);
    $ok = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    $texto = implode('', $trozos);
    if ($ok === false && $texto === '') return [0, '', $error !== '' ? $error : 'sin respuesta', false];
    // Si se cortó por tamaño, lo descargado vale: se devuelve marcado como truncado.
    return [$status > 0 ? $status : 200, $texto, $ok === false ? $error : '', $truncado];
}

function limpiarTexto(string $texto, int $max): string {
    $texto = preg_replace('/\s+/u', ' ', $texto) ?? '';
    $texto = trim($texto);
    if (mb_strlen($texto, 'UTF-8') > $max) {
        $texto = mb_substr($texto, 0, $max, 'UTF-8');
    }
    return $texto;
}

/** visitorData de la página del vídeo: sin él, la API interna responde «no eres un bot». */
function visitorData(string $id): string {
    [$estado, $html] = pedir('https://www.youtube.com/watch?v=' . $id . '&hl=es&gl=ES', [
        'Accept: text/html,application/xhtml+xml',
        'Accept-Language: es-ES,es;q=0.9',
        'Cookie: CONSENT=YES+cb.20210328-17-p0.en+FX+917; SOCS=CAI',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
    ], 14);
    if ($estado !== 200) return '';
    if (preg_match('/"visitorData":"([^"]{10,400})"/', $html, $m)) {
        return str_replace('\\u003d', '=', str_replace('\\u0026', '&', $m[1]));
    }
    return '';
}

/** Pide el reproductor con un cliente concreto. Devuelve [json|null, estado, motivo]. */
function reproductor(string $id, array $cliente, string $visitante = ''): array {
    $cuerpo = json_encode([
        'context' => ['client' => $cliente],
        'videoId' => $id,
        'contentCheckOk' => true,
        'racyCheckOk' => true,
    ], JSON_UNESCAPED_UNICODE);
    $ua = 'com.google.android.youtube/20.10.38 (Linux; U; Android 11)';
    if (($cliente['clientName'] ?? '') === 'IOS') $ua = 'com.google.ios.youtube/20.10.1 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X)';
    if (($cliente['clientName'] ?? '') === 'WEB') $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
    if (($cliente['clientName'] ?? '') === 'TVHTML5_SIMPLY_EMBEDDED_PLAYER') $ua = 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version';

    [$estado, $crudo] = pedir('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', [
        'Content-Type: application/json',
        'Accept-Language: es-ES,es;q=0.9',
        'User-Agent: ' . $ua,
        'X-Goog-Visitor-Id: ' . $visitante,
        'X-Youtube-Client-Name: 1',
        'X-Youtube-Client-Version: ' . (string)($cliente['clientVersion'] ?? ''),
        'Cookie: CONSENT=YES+cb.20210328-17-p0.en+FX+917; SOCS=CAI',
    ], 12, $cuerpo);

    if ($estado !== 200) return [null, $estado, 'HTTP ' . $estado];
    $json = json_decode($crudo, true);
    if (!is_array($json)) return [null, $estado, 'respuesta no JSON'];
    return [$json, $estado, ''];
}

/** Pistas de subtítulos leyendo el HTML público del vídeo (la vía que menos depende del cliente). */
function pistasDesdeHtml(string $id): array {
    [$estado, $html] = pedir('https://www.youtube.com/watch?v=' . $id . '&hl=es&gl=ES', [
        'Accept: text/html,application/xhtml+xml',
        'Accept-Language: es-ES,es;q=0.9',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
    ], 14);
    if ($estado !== 200 || $html === '') return [];
    if (!preg_match('/"captionTracks":(\[.*?\])/s', $html, $m)) return [];
    $pistas = json_decode($m[1], true);
    return is_array($pistas) ? $pistas : [];
}

/** Plan B: servicios públicos que sí pueden leer el vídeo. Devuelve texto o ''. */
function textoDeServicio(string $id): string {
    // 1) youtubetranscript.com devuelve XML con <text>
    [$estado, $xml] = pedir('https://youtubetranscript.com/?server_vid2=' . rawurlencode($id), [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
        'Accept: text/xml,application/xml,text/plain',
    ], 14);
    if ($estado === 200 && stripos($xml, '<transcript') !== false) {
        if (preg_match_all('#<text[^>]*>(.*?)</text>#is', $xml, $m)) {
            $texto = html_entity_decode(implode(' ', $m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if (trim($texto) !== '') return $texto;
        }
    }

    // 2) tactiq.io devuelve JSON con captions[]
    $cuerpo = json_encode(['videoUrl' => 'https://www.youtube.com/watch?v=' . $id, 'langCode' => 'es']);
    [$estado2, $json] = pedir('https://tactiq-apps-prod.tactiq.io/transcript', [
        'Content-Type: application/json',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
    ], 14, $cuerpo);
    if ($estado2 === 200) {
        $j = json_decode($json, true);
        if (is_array($j) && isset($j['captions']) && is_array($j['captions'])) {
            $partes = [];
            foreach ($j['captions'] as $c) {
                $t = (string)($c['text'] ?? '');
                if ($t !== '') $partes[] = $t;
            }
            $texto = trim(implode(' ', $partes));
            if ($texto !== '') return $texto;
        }
    }

    return '';
}

/** Texto de los subtítulos de un vídeo de YouTube, por la API interna. */
function leerVideo(string $id): array {
    // Primero el HTML público; si no hay pistas, se prueban clientes de la API interna.
    $pistas = pistasDesdeHtml($id);

    $clientes = [
        ['clientName' => 'ANDROID', 'clientVersion' => '21.03.36', 'androidSdkVersion' => 34, 'hl' => 'es', 'gl' => 'ES'],
        ['clientName' => 'IOS', 'clientVersion' => '21.02.1', 'deviceModel' => 'iPhone16,2', 'hl' => 'es', 'gl' => 'ES'],
        ['clientName' => 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', 'clientVersion' => '2.0', 'hl' => 'es', 'gl' => 'ES'],
        ['clientName' => 'MWEB', 'clientVersion' => '2.20241120.01.00', 'hl' => 'es', 'gl' => 'ES'],
        ['clientName' => 'WEB', 'clientVersion' => '2.20241120.00.00', 'hl' => 'es', 'gl' => 'ES'],
    ];

    $ultimoMotivo = $pistas === [] ? 'ni el HTML ni la API dieron pistas' : '';
    if ($pistas === []) {
        $visitante = visitorData($id);
        foreach ($clientes as $cliente) {
            [$json, , $motivo] = reproductor($id, $cliente, $visitante);
            if (!is_array($json)) { $ultimoMotivo = $motivo; continue; }
            $estadoRepro = (string)($json['playabilityStatus']['status'] ?? '');
            $razon = (string)($json['playabilityStatus']['reason'] ?? '');
            $posibles = $json['captions']['playerCaptionsTracklistRenderer']['captionTracks'] ?? [];
            if (is_array($posibles) && $posibles !== []) { $pistas = $posibles; break; }
            $ultimoMotivo = trim($estadoRepro . ' ' . $razon) ?: 'sin pistas de subtítulos';
        }
    }

    if (!is_array($pistas) || $pistas === []) {
        $alternativa = textoDeServicio($id);
        if ($alternativa !== '') {
            $texto = limpiarTexto($alternativa, MAX_VIDEO_CHARS);
            return [
                'ok' => true,
                'lectura' => [
                    'fuente' => 'transcripción de un servicio público (YouTube bloquea la lectura desde este servidor)',
                    'chars' => mb_strlen($texto, 'UTF-8'),
                    'texto' => $texto,
                ],
            ];
        }
        return ['ok' => false, 'error' => 'YouTube bloquea la lectura de subtítulos desde este servidor (' . $ultimoMotivo . '). Pega el texto a mano y sigo.'];
    }

    $elegida = null;
    foreach ($pistas as $pista) { // primero español manual
        $lang = strtolower((string)($pista['languageCode'] ?? ''));
        if (str_starts_with($lang, 'es') && ($pista['kind'] ?? '') !== 'asr') { $elegida = $pista; break; }
    }
    if ($elegida === null) {
        foreach ($pistas as $pista) {
            $lang = strtolower((string)($pista['languageCode'] ?? ''));
            if (str_starts_with($lang, 'es')) { $elegida = $pista; break; }
        }
    }
    if ($elegida === null) {
        foreach ($pistas as $pista) {
            $lang = strtolower((string)($pista['languageCode'] ?? ''));
            if (str_starts_with($lang, 'en')) { $elegida = $pista; break; }
        }
    }
    if ($elegida === null) $elegida = $pistas[0];

    $base = (string)($elegida['baseUrl'] ?? '');
    if ($base === '') {
        return ['ok' => false, 'error' => 'El subtítulo no trae dirección de descarga.'];
    }
    $idioma = (string)($elegida['languageCode'] ?? 'sin idioma');
    if (($elegida['kind'] ?? '') === 'asr') $idioma .= ' (automático)';

    [$estadoSub, $sub] = pedir($base . '&fmt=json3', ['Accept-Language: es-ES,es;q=0.9'], 12);
    $texto = '';
    if ($estadoSub === 200 && $sub !== '') {
        $j = json_decode($sub, true);
        if (is_array($j) && isset($j['events'])) {
            $partes = [];
            foreach ($j['events'] as $evento) {
                foreach (($evento['segs'] ?? []) as $seg) {
                    $t = (string)($seg['utf8'] ?? '');
                    if ($t !== '') $partes[] = $t;
                }
            }
            $texto = implode(' ', $partes);
        } else {
            // Respaldo: XML con <text>
            if (preg_match_all('#<text[^>]*>(.*?)</text>#is', $sub, $m)) {
                $texto = html_entity_decode(implode(' ', $m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }
        }
    }
    $texto = limpiarTexto($texto, MAX_VIDEO_CHARS);
    if ($texto === '') {
        return ['ok' => false, 'error' => 'El subtítulo llegó vacío.'];
    }
    return [
        'ok' => true,
        'lectura' => [
            'fuente' => 'subtítulo ' . $idioma . ' de YouTube',
            'chars' => mb_strlen($texto, 'UTF-8'),
            'texto' => $texto,
        ],
    ];
}

/** README de un repositorio. */
function leerRepo(string $repo): array {
    [$estado, $crudo] = pedir('https://api.github.com/repos/' . $repo . '/readme', [
        'Accept: application/vnd.github.raw',
        'User-Agent: atnojs-analista-url',
    ], 12);
    if ($estado !== 200 || trim($crudo) === '') {
        return ['ok' => false, 'error' => 'Ese repositorio no tiene README legible.'];
    }
    $texto = limpiarTexto($crudo, MAX_REPO_CHARS);
    return [
        'ok' => true,
        'lectura' => [
            'fuente' => 'README del repositorio',
            'chars' => mb_strlen($texto, 'UTF-8'),
            'texto' => $texto,
        ],
    ];
}

/** Comprueba que el destino es una web pública: sin IP privada, sin localhost, sin puertos raros. */
function destinoPublico(string $url): array {
    $partes = parse_url($url);
    if (!is_array($partes) || !isset($partes['scheme'], $partes['host'])) {
        return [false, 'URL no válida.'];
    }
    if (!in_array(strtolower($partes['scheme']), ['http', 'https'], true)) {
        return [false, 'Sólo http o https.'];
    }
    $host = strtolower($partes['host']);
    if ($host === '' || $host === 'localhost' || str_ends_with($host, '.local') || str_ends_with($host, '.internal')) {
        return [false, 'Destino no permitido.'];
    }
    if (isset($partes['port']) && !in_array((int)$partes['port'], [80, 443], true)) {
        return [false, 'Puerto no permitido.'];
    }
    $ip = filter_var($host, FILTER_VALIDATE_IP) ? $host : gethostbyname($host);
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        return [false, 'El dominio no resuelve.'];
    }
    $publica = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
    if ($publica === false) {
        return [false, 'Destino en red privada.'];
    }
    return [true, ''];
}

/** Texto principal de una página. */
function leerWeb(string $url): array {
    [$vale, $motivo] = destinoPublico($url);
    if (!$vale) {
        return ['ok' => false, 'error' => $motivo];
    }

    $actual = $url;
    $estado = 0;
    $html = '';
    $errorTransporte = '';
    $truncado = false;
    for ($salto = 0; $salto < 3; $salto++) {
        [$estado, $html, $errorTransporte, $truncado] = pedir($actual, [
            'Accept: text/html,application/xhtml+xml',
            'Accept-Language: es-ES,es;q=0.9,en;q=0.6',
            'User-Agent: Mozilla/5.0 (compatible; atnojs-analista-url/1.0)',
        ], 14);

        if ($estado >= 300 && $estado < 400) {
            $destino = '';
            // La cabecera Location no la devuelve curl_exec: se pide otra vez con HEAD.
            $ch = curl_init($actual);
            curl_setopt_array($ch, [
                CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => false, CURLOPT_TIMEOUT => 8,
                CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; atnojs-analista-url/1.0)',
            ]);
            curl_exec($ch);
            $destino = (string)curl_getinfo($ch, CURLINFO_REDIRECT_URL);
            curl_close($ch);
            if ($destino === '') break;
            [$valeDestino] = destinoPublico($destino);
            if (!$valeDestino) return ['ok' => false, 'error' => 'La página redirige a un destino no permitido.'];
            $actual = $destino;
            continue;
        }
        break;
    }

    if (($estado !== 200 && $estado !== 0) || trim($html) === '') {
        $motivo = $errorTransporte !== ''
            ? 'La página no respondió (' . $errorTransporte . ').'
            : 'La página no devolvió contenido (HTTP ' . $estado . ').';
        return ['ok' => false, 'error' => $motivo];
    }

    $html = preg_replace('#<(script|style|noscript|svg|template|iframe)[^>]*>.*?</\1>#is', ' ', $html) ?? $html;
    $html = preg_replace('#<(nav|header|footer|aside)[^>]*>.*?</\1>#is', ' ', $html) ?? $html;

    $titulo = '';
    if (preg_match('#<title[^>]*>(.*?)</title>#is', $html, $m)) {
        $titulo = limpiarTexto(html_entity_decode(strip_tags($m[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8'), 200);
    }

    $texto = preg_replace('#<(br|/p|/div|/li|/h[1-6])[^>]*>#i', '. ', $html) ?? $html;
    $texto = strip_tags($texto);
    $texto = html_entity_decode($texto, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $texto = limpiarTexto($texto, MAX_WEB_CHARS);

    if ($texto === '') {
        return ['ok' => false, 'error' => 'La página no tiene texto legible (¿es una aplicación en JavaScript?).'];
    }
    $fuente = 'texto de la página' . ($titulo !== '' ? ' · ' . $titulo : '');
    if ($truncado) $fuente .= ' (página grande: leída hasta 1,5 MB)';
    return [
        'ok' => true,
        'lectura' => [
            'fuente' => $fuente,
            'chars' => mb_strlen($texto, 'UTF-8'),
            'texto' => $texto,
        ],
    ];
}

$action = strtolower(trim((string)($_GET['action'] ?? $_POST['action'] ?? 'health')));

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respond(405, ['success' => false, 'error' => 'Método no permitido.']);
}

if ($action === 'health') {
    respond(200, [
        'success' => true,
        'app' => 'analista-url',
        'version' => '20261123j',
        'acciones' => ['health', 'meta', 'leer'],
    ]);
}

if (!in_array($action, ['meta', 'leer'], true)) {
    respond(404, ['success' => false, 'error' => 'Acción no disponible.']);
}

if ($action === 'leer') {
    // El navegador de la app manda same-origin; otras webs, cross-site. Los clientes que
    // no mandan la cabecera (curl, monitorización) se dejan pasar: esto filtra abuso
    // desde navegador, no autentica.
    $sitio = strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
    if ($sitio !== '' && !in_array($sitio, ['same-origin', 'same-site', 'none'], true)) {
        respond(403, ['success' => false, 'error' => 'Origen no permitido.']);
    }
    $tipo = strtolower(trim((string)($_GET['tipo'] ?? '')));

    if ($tipo === 'video') {
        $id = (string)($_GET['id'] ?? '');
        if (preg_match('/^[A-Za-z0-9_-]{6,20}$/', $id) !== 1) {
            respond(400, ['success' => false, 'error' => 'Identificador de vídeo no válido.']);
        }
        $r = leerVideo($id);
        respond(200, $r['ok'] ? ['success' => true, 'lectura' => $r['lectura']] : ['success' => false, 'error' => $r['error']]);
    }

    if ($tipo === 'repo') {
        $repo = (string)($_GET['repo'] ?? '');
        if (preg_match('#^[A-Za-z0-9._-]{1,39}/[A-Za-z0-9._-]{1,80}$#', $repo) !== 1) {
            respond(400, ['success' => false, 'error' => 'Repositorio no válido.']);
        }
        $r = leerRepo($repo);
        respond(200, $r['ok'] ? ['success' => true, 'lectura' => $r['lectura']] : ['success' => false, 'error' => $r['error']]);
    }

    if ($tipo === 'web') {
        $url = (string)($_GET['url'] ?? '');
        if (strlen($url) > 2048) {
            respond(400, ['success' => false, 'error' => 'URL demasiado larga.']);
        }
        $r = leerWeb($url);
        respond(200, $r['ok'] ? ['success' => true, 'lectura' => $r['lectura']] : ['success' => false, 'error' => $r['error']]);
    }

    respond(400, ['success' => false, 'error' => 'Tipo de lectura no soportado.']);
}

$tipo = strtolower(trim((string)($_GET['tipo'] ?? '')));

if ($tipo === 'video') {
    $id = (string)($_GET['id'] ?? '');
    if (preg_match('/^[A-Za-z0-9_-]{6,20}$/', $id) !== 1) {
        respond(400, ['success' => false, 'error' => 'Identificador de vídeo no válido.']);
    }
    $url = 'https://www.youtube.com/oembed?url=' . rawurlencode('https://www.youtube.com/watch?v=' . $id) . '&format=json';
    [$estado, $crudo] = pedir($url, ['Accept: application/json'], 8);
    $json = json_decode($crudo, true);
    if ($estado !== 200 || !is_array($json)) {
        respond(200, ['success' => false, 'error' => 'YouTube no devolvió metadatos.']);
    }
    respond(200, [
        'success' => true,
        'meta' => [
            'titulo' => limpiarTexto((string)($json['title'] ?? ''), 300),
            'autor' => limpiarTexto((string)($json['author_name'] ?? ''), 120),
            'fuente' => 'oEmbed de YouTube',
        ],
    ]);
}

if ($tipo === 'repo') {
    $repo = (string)($_GET['repo'] ?? '');
    if (preg_match('#^[A-Za-z0-9._-]{1,39}/[A-Za-z0-9._-]{1,80}$#', $repo) !== 1) {
        respond(400, ['success' => false, 'error' => 'Repositorio no válido.']);
    }
    [$estado, $crudo] = pedir('https://api.github.com/repos/' . $repo, [
        'Accept: application/vnd.github+json',
        'User-Agent: atnojs-analista-url',
    ], 10);
    $json = json_decode($crudo, true);
    if ($estado !== 200 || !is_array($json)) {
        respond(200, ['success' => false, 'error' => 'GitHub no devolvió el repositorio (¿privado o inexistente?).']);
    }
    $licencia = 'sin licencia declarada';
    if (isset($json['license']) && is_array($json['license'])) {
        $spdx = strtoupper((string)($json['license']['spdx_id'] ?? ''));
        if ($spdx !== '' && $spdx !== 'NOASSERTION' && $spdx !== 'NONE') {
            $licencia = limpiarTexto($spdx, 40);
        }
    }
    respond(200, [
        'success' => true,
        'meta' => [
            'titulo' => limpiarTexto((string)($json['full_name'] ?? ''), 120),
            'autor' => limpiarTexto((string)($json['owner']['login'] ?? ''), 80),
            'licencia' => $licencia,
            'estrellas' => isset($json['stargazers_count']) ? (string)(int)$json['stargazers_count'] : '',
            'actualizado' => substr((string)($json['pushed_at'] ?? ''), 0, 10),
            'fuente' => 'API pública de GitHub',
        ],
    ]);
}

respond(400, ['success' => false, 'error' => 'Tipo de metadato no soportado.']);
