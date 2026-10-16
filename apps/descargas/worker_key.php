<?php
/**
 * Clave del worker local (el PC de Antonio).
 *
 * AQUI NO VA EL TOKEN, solo su sha256. El repositorio es publico: un hash de un
 * token aleatorio de 48 caracteres no es utilizable ni fuerza bruta viable.
 * El token en claro vive SOLO en .private/descargas-worker.json (gitignored).
 */
declare(strict_types=1);
return ['sha256' => '6c20ac53b4ab99487b55da24f64749a357b8f58d0f1d9270c0cb1e49342d9054'];
