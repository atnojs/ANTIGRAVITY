---
name: arquitecto-backend-php-hostinger
description: "Activa este skill para configurar proxies de comunicación seguros con APIs de IA en servidores PHP de Hostinger, aislando claves y previniendo errores de entorno."
---

# Arquitecto de Backend PHP para Hostinger

## Objetivo

Configurar una comunicación segura entre una aplicación web alojada en Hostinger y una API de IA, usando PHP como proxy y evitando exponer claves privadas en el frontend.

## Inputs esperados

- `app_directory`: ruta absoluta de la aplicación en el servidor.
- `api_key_constant`: nombre de la constante a utilizar. Valor recomendado por defecto: `GEMINI_API_KEY`.

## 1. Regla crítica de seguridad

Nunca escribas claves API reales dentro de archivos compartidos, prompts, documentación o respuestas públicas.

Usa siempre uno de estos métodos:

- Variable de entorno.
- Archivo `config.php` excluido de repositorios y copias públicas.
- Marcador seguro como `AQUI_TU_API_KEY`.
- Panel de configuración privado del servidor.

## 2. Generación del archivo de aislamiento

Si el usuario solicita crear un archivo local de configuración, crea:

```text
${app_directory}/config.php
```

con este formato seguro:

```php
<?php
define('${api_key_constant}', 'AQUI_TU_API_KEY');
```

Después, indica al usuario que sustituya `AQUI_TU_API_KEY` por su clave real directamente en el servidor, nunca en una conversación pública.

## 3. Inyección de fallback en cascada en proxy.php

Busca el archivo `proxy.php` encargado de realizar llamadas `cURL` e inyecta esta lógica en el bloque de inicialización:

```php
<?php
$apiKey = '';

$configFile = __DIR__ . '/config.php';

if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('${api_key_constant}') ? ${api_key_constant} : '';
}

if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('${api_key_constant}');
}

if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('REDIRECT_${api_key_constant}');
}

if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['${api_key_constant}'] ?? '';
}

if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['REDIRECT_${api_key_constant}'] ?? '';
}

if (!$apiKey || empty($apiKey)) {
    http_response_code(500);
    echo json_encode([
        'error' => [
            'message' => 'API key no configurada de forma segura.'
        ]
    ]);
    exit;
}
```

## 4. Reglas para proxy seguro

- El frontend nunca debe llamar directamente a la API externa si requiere clave privada.
- El frontend debe llamar al proxy PHP.
- El proxy PHP debe añadir la clave en servidor.
- El proxy debe devolver errores JSON claros.
- El proxy debe validar método HTTP, cuerpo recibido y errores de cURL.
- No expongas la clave API en JavaScript, HTML, CSS ni JSON público.

## 5. Estructura recomendada en Hostinger

```text
public_html/
├── app/
│   ├── index.html
│   ├── assets/
│   ├── proxy.php
│   └── config.php
```

## 6. Reglas críticas

- No subas `config.php` a repositorios públicos.
- No incluyas claves reales en ejemplos.
- No devuelvas la clave API en errores.
- No imprimas variables sensibles con `var_dump`, `print_r` ni `console.log`.
- Si una clave fue expuesta, recomienda revocarla y generar una nueva.
