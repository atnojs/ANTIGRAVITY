<?php
/**
 * Archivo de prueba de despliegue automático GitHub → Hostinger
 *
 * Si ves esto en https://atnojs.es/apps/generar/_deploy_test/check.php
 * significa que el despliegue automático FUNCIONA.
 *
 * Commit: DEPLOY-TEST-001
 * Fecha:  2026-06-04
 */
header('Content-Type: application/json');
echo json_encode([
    'status'    => 'ok',
    'message'   => '✅ El despliegue automático GitHub → Hostinger FUNCIONA',
    'test_id'   => 'DEPLOY-TEST-001',
    'timestamp' => date('c'),
    'server'    => $_SERVER['SERVER_NAME'] ?? 'desconocido',
    'php'       => PHP_VERSION,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
