<?php
/**
 * Verificación de la contraseña de EDICIÓN (centralizada).
 *
 * El valor NO está escrito aquí: vive en el `.htaccess` raíz del servidor
 * (PW_EDIT / PW_EDIT_SHA256), igual que las claves de API. Ver auth/lib.php.
 */
declare(strict_types=1);

require_once dirname(__DIR__, 4) . '/auth/lib.php';

au_endpoint('edicion');
