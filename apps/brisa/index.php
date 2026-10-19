<?php
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Permissions-Policy: microphone=(self), camera=()');
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f7f8f2"><meta name="description" content="Brisa. Tu tiempo, tus ideas y un poco de calma. Agenda personal con notas de voz.">
  <title>Brisa · Tu agenda personal</title>
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/app.css?v=1">
  <script type="module" src="assets/app.js?v=1"></script>
</head>
<body>
  <div id="app" aria-busy="true"><div class="boot"><span class="brand">brisa<span>✳</span></span><p>Preparando tu espacio…</p></div></div>
  <dialog id="editor" aria-labelledby="dialog-title"></dialog>
  <div id="recorder" hidden></div>
  <div id="toast" role="status" aria-live="polite"></div>
  <noscript>Activa JavaScript para utilizar tu agenda.</noscript>
</body>
</html>
