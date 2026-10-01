<?php
/**
 * Contraseña del modo edición del panel "Nueva Pestaña".
 *
 * Fuente de verdad: la variable de entorno NUEVA_PESTANA_PASSWORD, definida con
 * SetEnv en el .htaccess de la RAÍZ pública. Ese fichero no está en Git, así que
 * la clave no acaba ni en el repositorio ni en su historial.
 *
 *     SetEnv NUEVA_PESTANA_PASSWORD "miClaveLarga"
 *
 * Mientras la variable no exista se mantiene la clave antigua para no dejar al
 * usuario fuera de su propio panel; la app lo avisa en el modal "Copias de
 * seguridad" (load_state.php?copias=1 devuelve "clave_por_defecto").
 */

// Clave anterior a esta migración, sólo como puente.
const CLAVE_PANEL_ANTIGUA = '0';

// Nombre de la variable de entorno que hay que definir en el .htaccess raíz.
const CLAVE_PANEL_VARIABLE = 'NUEVA_PESTANA_PASSWORD';

/** Clave que se exige ahora mismo (entorno si existe; si no, la antigua). */
function clave_panel_esperada()
{
    $nombre = CLAVE_PANEL_VARIABLE;
    $valor = '';

    // Apache con SetEnv la deja en $_SERVER; otros SAPIs sólo en getenv().
    if (isset($_SERVER[$nombre])) {
        $valor = (string) $_SERVER[$nombre];
    }
    if ($valor === '') {
        $desde_entorno = getenv($nombre);
        if ($desde_entorno !== false) {
            $valor = (string) $desde_entorno;
        }
    }

    return $valor !== '' ? $valor : CLAVE_PANEL_ANTIGUA;
}

/** ¿Sigue sin definirse la variable de entorno? */
function clave_panel_es_por_defecto()
{
    return clave_panel_esperada() === CLAVE_PANEL_ANTIGUA;
}

/** Comprueba una clave recibida del navegador. */
function clave_panel_valida($introducida)
{
    if (!is_string($introducida) || $introducida === '') {
        return false;
    }
    return hash_equals(clave_panel_esperada(), $introducida);
}
