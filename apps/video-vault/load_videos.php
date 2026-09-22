<?php
header('Content-Type: application/json');

$dir = "uploads/videos/";
$videos = [];

if (is_dir($dir)) {
    $files = scandir($dir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        // Extract command_id from filename (format: commandId_uniqid.ext)
        if (preg_match('/^([a-zA-Z0-9_-]+)_/', $file, $m)) {
            $cmd = $m[1];
            $videos[$cmd] = [
                "filename" => $file,
                "url" => $dir . $file
            ];
        }
    }
}

echo json_encode(["success" => true, "videos" => $videos]);
?>