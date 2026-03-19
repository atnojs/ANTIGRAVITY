<?php
/**
 * Test de manejo de imágenes
 */

require_once 'config.php';
require_once 'simple_db.php';

echo "<h1>Test de Manejo de Imágenes</h1>";

try {
    $db = new SimpleDB();
    
    echo "<h3>1. Verificar carpetas de imágenes</h3>";
    
    $folders = [
        'referencias' => REFERENCIAS_DIR,
        'uploads' => UPLOADS_DIR,
        'data' => __DIR__ . '/data/'
    ];
    
    foreach ($folders as $name => $path) {
        if (file_exists($path)) {
            $files = scandir($path);
            $fileCount = count(array_filter($files, function($f) { return $f !== '.' && $f !== '..'; }));
            echo "<div style='color: green;'>✅ $name: $path ({$fileCount} archivos)</div>";
            
            // Mostrar archivos
            foreach ($files as $file) {
                if ($file !== '.' && $file !== '..') {
                    $fullPath = $path . $file;
                    $size = filesize($fullPath);
                    $mime = function_exists('mime_content_type') ? mime_content_type($fullPath) : 'unknown';
                    echo "&nbsp;&nbsp;&nbsp;&nbsp;- $file ($size bytes, $mime)<br>";
                }
            }
        } else {
            echo "<div style='color: orange;'>⚠️ $name: $path (no existe)</div>";
        }
    }
    
    echo "<h3>2. Probar función mime_content_type</h3>";
    if (function_exists('mime_content_type')) {
        echo "✅ mime_content_type está disponible<br>";
        
        // Probar con un archivo de ejemplo si existe
        $testFile = REFERENCIAS_DIR . 'antonio_perfil.jpg';
        if (file_exists($testFile)) {
            $mime = mime_content_type($testFile);
            echo "✅ $testFile: $mime<br>";
        } else {
            echo "⚠️ Archivo de prueba no encontrado: $testFile<br>";
        }
    } else {
        echo "❌ mime_content_type no está disponible<br>";
        echo "Instalar: sudo apt-get install php-mime-type<br>";
    }
    
    echo "<h3>3. Probar base64 encoding</h3>";
    $testString = "Hello World";
    $encoded = base64_encode($testString);
    $decoded = base64_decode($encoded);
    
    if ($decoded === $testString) {
        echo "✅ Base64 encoding/decoding funciona correctamente<br>";
    } else {
        echo "❌ Error en base64 encoding/decoding<br>";
    }
    
    echo "<h3>4. Verificar referencias en la base de datos</h3>";
    $referencias = $db->obtenerReferencias();
    echo "Referencias encontradas: " . count($referencias) . "<br>";
    
    foreach ($referencias as $ref) {
        echo "<div style='border: 1px solid #ccc; padding: 10px; margin: 5px;'>";
        echo "<strong>{$ref['nombre']}</strong><br>";
        echo "Ruta: {$ref['ruta']}<br>";
        echo "Descripción: {$ref['descripcion']}<br>";
        
        $fullPath = __DIR__ . '/' . $ref['ruta'];
        if (file_exists($fullPath)) {
            echo "<span style='color: green;'>✅ Archivo existe</span><br>";
            
            // Mostrar imagen si es una imagen
            if (preg_match('/\.(jpg|jpeg|png|gif|webp)$/i', $fullPath)) {
                echo "<img src='{$ref['ruta']}' style='max-width: 200px; max-height: 150px; margin: 5px;'><br>";
            }
        } else {
            echo "<span style='color: red;'>❌ Archivo no encontrado: $fullPath</span><br>";
        }
        echo "</div>";
    }
    
    echo "<h3>5. Probar API de imágenes</h3>";
    echo "<form method='post' enctype='multipart/form-data'>";
    echo "<input type='file' name='test_image' accept='image/*'>";
    echo "<input type='submit' value='Probar subida'>";
    echo "</form>";
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['test_image'])) {
        echo "<h4>Resultado de subida:</h4>";
        var_dump($_FILES['test_image']);
        
        if ($_FILES['test_image']['error'] === UPLOAD_ERR_OK) {
            $tempPath = $_FILES['test_image']['tmp_name'];
            $targetPath = UPLOADS_DIR . 'test_' . time() . '.jpg';
            
            if (move_uploaded_file($tempPath, $targetPath)) {
                echo "<div style='color: green;'>✅ Imagen subida correctamente: $targetPath</div>";
                
                // Probar lectura
                $imageData = file_get_contents($targetPath);
                $base64 = base64_encode($imageData);
                echo "Tamaño original: " . strlen($imageData) . " bytes<br>";
                echo "Tamaño base64: " . strlen($base64) . " bytes<br>";
                
                // Mostrar imagen
                echo "<img src='uploads/" . basename($targetPath) . "' style='max-width: 300px;'><br>";
            } else {
                echo "<div style='color: red;'>❌ Error al mover el archivo</div>";
            }
        }
    }
    
    echo "<h3 style='color: green;'>✅ Test completado</h3>";
    
} catch (Exception $e) {
    echo "<h3 style='color: red;'>❌ Error: " . $e->getMessage() . "</h3>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
}

echo "<hr>";
echo "<h3>Soluciones para el error 'Cannot read clipboard':</h3>";
echo "<ol>";
echo "<li>Verificar que las imágenes de referencia existan en la carpeta 'referencias/'</li>";
echo "<li>Asegurar que las rutas en la base de datos sean correctas</li>";
echo "<li>Verificar permisos de lectura en las carpetas</li>";
echo "<li>Probar con imágenes más pequeñas si el problema persiste</li>";
echo "<li>Verificar que el modelo gemini-3.1-flash-image-preview esté disponible en tu región</li>";
echo "</ol>";