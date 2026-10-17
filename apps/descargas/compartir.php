<?php
declare(strict_types=1);

/**
 * Destino del boton "Compartir" del movil (share_target del manifest).
 * Android/Chrome manda aqui el enlace que compartes desde YouTube y este script
 * lo lleva a la app. No guarda nada: solo limpia la URL y redirige.
 */

$url = '';
foreach (['url', 'text', 'title'] as $campo) {
    if (isset($_POST[$campo]) && is_string($_POST[$campo])) {
        $candidata = trim($_POST[$campo]);
        if (preg_match('~https?://[^\s"<>]+~i', $candidata, $m)) {
            $url = $m[0];
            break;
        }
        if ($campo === 'url' && $candidata !== '') {
            $url = $candidata;
            break;
        }
    }
}

// Solo enlaces http(s) y de longitud razonable.
if (!preg_match('~^https?://~i', $url) || strlen($url) > 500) {
    header('Location: ./index.html', true, 303);
    exit;
}

header('Location: ./index.html?compartido=' . rawurlencode($url), true, 303);