<?php
header("Access-Control-Allow-Origin: *");
header("Content-Security-Policy: default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *;");
header("X-Content-Security-Policy: default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *;");
?>
<!-- index.html -->
<!DOCTYPE html>
<html lang="es">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Generar Imágenes</title>
  <link rel="icon" href="https://www.atnojs.es/imagenes/favicon_negro1.ico" type="image/x-icon" />

  <!-- Google Fonts: Montserrat + Poppins -->
  <link
    href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Poppins:wght@400;500;600;700&display=swap"
    rel="stylesheet" />

  <!-- Font Awesome para iconos usados en la app -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />

  <!-- Estilos adaptados -->
  <link rel="stylesheet" href="app.css" />

  <!-- Firebase SDKs (from CDN) -->
  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>

  <!-- React 18 UMD + Babel Standalone -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
</head>

<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="env,react" src="app.js?v=2"></script>
  <noscript>Activa JavaScript para usar esta aplicación.</noscript>
</body>

</html>