<?php
// guardar_cambios.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

$correctPassword = '0'; // Contraseña real (la misma que en validar_password.php)
$baseDir = __DIR__; // Directorio actual del script PHP
$uploadDir = $baseDir . '/uploads/'; // Directorio para UPLOADS, relativo al script PHP

// Determinar la URL base para los archivos.
// Esto asume que 'uploads' es accesible desde la raíz de tu sitio web.
// Ajusta esto si tu estructura de URL es diferente.
// Ejemplo: Si tu sitio es https://tusitio.com y este script está en https://tusitio.com/api/guardar_cambios.php
// y 'uploads' está en https://tusitio.com/uploads/, entonces $uploadUrlBase = '/uploads/';
// O si 'uploads' está dentro de 'api', sería $uploadUrlBase = 'uploads/'; (relativo a la URL del script si se accede así)
// Para simplicidad y mayor portabilidad, intentaremos una ruta relativa si es posible,
// pero una ruta absoluta desde la raíz del sitio web es a menudo más fiable.

// Opción 1: Si 'uploads' está en el mismo nivel que el directorio que contiene este script
// $scriptDir = basename($baseDir); // api
// $pathPrefix = str_repeat('../', substr_count(dirname($_SERVER['PHP_SELF']), '/') - substr_count(dirname($baseDir), '/'));
// $uploadUrlBase = $pathPrefix . 'uploads/';

// Opción 2: Asumir que 'uploads' es accesible desde la raíz web
$docRoot = $_SERVER['DOCUMENT_ROOT'];
$relativePathFromDocRootToUploads = str_replace($docRoot, '', $uploadDir);
// Asegurarse de que comience con / si no lo hace (y no es una URL completa)
if (strpos($relativePathFromDocRootToUploads, '/') !== 0 && strpos($relativePathFromDocRootToUploads, 'http') !== 0) {
    $relativePathFromDocRootToUploads = '/' . ltrim($relativePathFromDocRootToUploads, '/');
}
$uploadUrlBase = rtrim($relativePathFromDocRootToUploads, '/') . '/';


// --- Autenticación ---
if (!isset($_POST['password']) || $_POST['password'] !== $correctPassword) {
    die(json_encode(['success' => false, 'error' => 'Autenticación fallida para guardar.']));
}

// --- Recepción y decodificación de datos JSON ---
if (!isset($_POST['jsonData'])) {
    die(json_encode(['success' => false, 'error' => 'No se recibieron datos JSON (jsonData).']));
}
$jsonData = json_decode($_POST['jsonData'], true);
if (json_last_error() !== JSON_ERROR_NONE) {
    die(json_encode(['success' => false, 'error' => 'JSON principal inválido: ' . json_last_error_msg()]));
}

if (!isset($jsonData['settings']) || !isset($jsonData['aiAppsCategories']) || !isset($jsonData['prompts']) || !isset($jsonData['promptFolders'])) {
    die(json_encode(['success' => false, 'error' => 'Estructura de datos principal incorrecta. Faltan claves esperadas.']));
}

$filePathsResponse = ['prompts' => [], 'folders' => [], 'appLogos' => []]; // Añadido appLogos

// --- Creación del directorio de uploads si no existe ---
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0775, true)) { // Usar 0775, es más seguro que 0777
        die(json_encode(['success' => false, 'error' => 'No se pudo crear el directorio de uploads. Verifica los permisos. Detalles: ' . (error_get_last()['message'] ?? 'Error desconocido')]));
    }
    // No es necesario chmod aquí si mkdir tuvo éxito con los permisos correctos y umask es apropiado.
}
if (!is_writable($uploadDir)) {
    die(json_encode(['success' => false, 'error' => 'El directorio de uploads no tiene permisos de escritura.']));
}

// --- Procesamiento de archivos subidos ---
if (!empty($_FILES)) {
    foreach ($_FILES as $fileKey => $file) {
        if ($file['error'] !== UPLOAD_ERR_OK) {
            error_log("Error en el archivo '$fileKey' (código: " . $file['error'] . ")");
            continue; 
        }

        $originalName = $file['name'];
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $safeName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
        // Asegurar que uniqid() no genere puntos adicionales si $safeName termina en punto.
        $safeName = rtrim($safeName, '.');
        $uniqueFileName = $safeName . '_' . uniqid('', true) . '.' . $extension;
        
        $destinationPath = $uploadDir . $uniqueFileName;
        $urlPath = $uploadUrlBase . $uniqueFileName;

        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!in_array($extension, $allowedExtensions)) {
            error_log("Extensión no permitida para '$fileKey': $extension");
            continue;
        }
        
        if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
            error_log("No se pudo mover el archivo subido '$fileKey' a '$destinationPath'");
            continue;
        }
        chmod($destinationPath, 0664); // Permisos más seguros para archivos

        // Parsear fileKey de forma más robusta y preparar respuesta
        if (preg_match('/^prompt_image_(.+?)_(\d+)$/', $fileKey, $matches)) {
            $promptId = $matches[1];
            $originalPlaceholderIndex = intval($matches[2]);
            $filePathsResponse['prompts'][] = [
                'promptId' => $promptId,
                'originalName' => $originalName,
                'originalPlaceholderIndex' => $originalPlaceholderIndex,
                'newPath' => $urlPath
            ];
        } elseif (preg_match('/^folder_icon_(.+)$/', $fileKey, $matches)) {
            $folderId = $matches[1];
            // Actualizar directamente $jsonData para iconos de carpeta es simple
            foreach ($jsonData['promptFolders'] as &$folder) {
                if ($folder['id'] === $folderId) {
                    $folder['iconUrl'] = $urlPath;
                    break;
                }
            }
            unset($folder);
            $filePathsResponse['folders'][] = ['folderId' => $folderId, 'newPath' => $urlPath, 'originalName' => $originalName];
        } elseif (preg_match('/^app_logo_(.+)$/', $fileKey, $matches)) { // Para logos de App
            $appId = $matches[1];
            // Actualizar $jsonData para logos de app
            foreach ($jsonData['aiAppsCategories'] as &$category) {
                foreach ($category['apps'] as &$app) {
                    if ($app['id'] === $appId) {
                        $app['logoUrl'] = $urlPath;
                        goto appLogoUpdated; // Salir de ambos bucles
                    }
                }
                unset($app);
            }
            unset($category);
            appLogoUpdated:
            $filePathsResponse['appLogos'][] = ['appId' => $appId, 'newPath' => $urlPath, 'originalName' => $originalName];
        }
    } // fin foreach $_FILES
} // fin if !empty($_FILES)


// --- Guardar en archivo ---
try {
    $ruta_archivo = $baseDir . '/estado_sitio.json';

    // Reconstruir exampleImageUrls en jsonData['prompts'] ANTES de guardar el JSON.
    // Esto asegura que estado_sitio.json tenga el estado más actualizado.
    if (!empty($filePathsResponse['prompts'])) {
        foreach ($jsonData['prompts'] as &$promptDataRef) {
            $promptId = $promptDataRef['id'];
            $currentExistingUrls = [];
            if (isset($promptDataRef['exampleImageUrls']) && is_array($promptDataRef['exampleImageUrls'])) {
                // El JS envía solo URLs string que quiere conservar
                $currentExistingUrls = array_filter($promptDataRef['exampleImageUrls'], 'is_string');
            }

            // Crear un array temporal de 3 slots para las URLs finales
            $finalImageSlots = array_fill(0, 3, null);

            // Colocar las URLs existentes que el JS envió (y quiere conservar)
            // en sus posiciones originales si es posible, o al inicio.
            // Esta parte asume que el JS ya limpió y ordenó las URLs existentes como las quiere.
            $slotIdx = 0;
            foreach ($currentExistingUrls as $url) {
                if ($slotIdx < 3) {
                    $finalImageSlots[$slotIdx++] = $url;
                }
            }
            
            // Sobrescribir/Insertar las NUEVAS URLs de los archivos recién subidos para este prompt
            // en la posición que el JS indicó con originalPlaceholderIndex.
            foreach ($filePathsResponse['prompts'] as $uploadedImageInfo) {
                if ($uploadedImageInfo['promptId'] === $promptId) {
                    $originalIndex = $uploadedImageInfo['originalPlaceholderIndex'];
                    if ($originalIndex >= 0 && $originalIndex < 3) { // Asegurar que el índice está dentro de los 3 slots
                        $finalImageSlots[$originalIndex] = $uploadedImageInfo['newPath'];
                    }
                }
            }
            
            // Limpiar el array final: quitar nulls y reindexar numéricamente.
            $promptDataRef['exampleImageUrls'] = array_values(array_filter($finalImageSlots, function($value) {
                return $value !== null && $value !== '';
            }));
        }
        unset($promptDataRef); 
    }

    $contenido_final_json = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Error al codificar JSON final: " . json_last_error_msg());
    }

    $bytes = file_put_contents($ruta_archivo, $contenido_final_json);
    
    if ($bytes === false) {
        throw new Exception("Error al escribir en el archivo de estado. Verifica los permisos de escritura para '$ruta_archivo'.");
    }
    // No es necesario chmod aquí si file_put_contents tuvo éxito y el umask del servidor es correcto.
    
    echo json_encode([
        'success' => true,
        'message' => 'Datos guardados correctamente.',
        'filePaths' => $filePathsResponse, 
        'bytes_written' => $bytes
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    die(json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString() // Más útil para depuración que error_get_last en este punto
    ]));
}
?>