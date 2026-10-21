<?php
declare(strict_types=1);

/**
 * La agenda vive en apps/brisa/ (Brisa). Esta ruta antigua se conserva solo
 * como redirección para no mantener dos copias del mismo código: quien abra
 * /apps/agenda/ acaba en la aplicación real.
 */

header('Location: ../brisa/', true, 302);
header('Cache-Control: no-store');
exit;
