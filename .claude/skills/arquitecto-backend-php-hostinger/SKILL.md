---
name: arquitecto-backend-php-hostinger
description: "Activa este skill para configurar proxies de comunicación seguros con APIs de IA en servidores PHP de Hostinger, aislando claves y previniendo errores de entorno."
---

# Arquitecto de Backend PHP para Hostinger

## Objetivo

Configurar una comunicación segura entre una aplicación web alojada en Hostinger y una API de IA, usando PHP como proxy y evitando exponer claves privadas en el frontend.

## Inputs esperados

- `app_directory`: ruta absoluta de la aplicación en el servidor.
- `api_key_constant`: nombre de la constante a utilizar. Valor recomendado por defecto: `F`.

## 1. Regla crítica de seguridad

Nunca escribas claves API reales dentro de archivos compartidos, prompts, documentación o respuestas públicas.

Usa siempre uno de estos métodos:

- Variable de entorno.
- Archivo `config.php` excluido de repositorios y copias públicas.
- Marcador seguro como `AQUI_TU_API_KEY`.
- Panel de configuración privado del servidor.

## 2. Diagnóstico previo (obligatorio)

Antes de modificar nada, diagnosticar el estado actual:

1. Localizar el archivo PHP que realiza peticiones cURL a la API (normalmente `proxy.php`).
2. Identificar cómo obtiene la API Key actualmente (buscar `getenv()`, constantes, `$_SERVER`).
3. Identificar el nombre de la variable/constante usada (`F`, `A`, etc.).
4. Verificar si existe `.htaccess` en la carpeta con directivas `SetEnv`.

## 3. Generación del archivo de aislamiento

Crear `${app_directory}/config.php` con este formato seguro:

```php
<?php
define('${api_key_constant}', 'AQUI_TU_API_KEY');
```

Indicar al usuario que sustituya `AQUI_TU_API_KEY` por su clave real directamente en el servidor.

## 4. Cascada de 7 fuentes en proxy.php

Reemplazar el bloque de inicialización de la API key en `proxy.php` con esta cascada completa que cubre todos los modos de Apache/FastCGI/FPM en Hostinger:

```php
<?php
$apiKey = '';

// 1. Archivo de configuración local (máxima prioridad)
$configFile = __DIR__ . '/config.php';
if (file_exists($configFile)) {
    include $configFile;
    $apiKey = defined('${api_key_constant}') ? ${api_key_constant} : '';
}

// 2. Variable de entorno estándar
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('${api_key_constant}');
}

// 3. Variable de entorno con prefijo REDIRECT_ (Apache FastCGI)
if (!$apiKey || empty($apiKey)) {
    $apiKey = getenv('REDIRECT_${api_key_constant}');
}

// 4. Superglobal $_SERVER
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['${api_key_constant}'] ?? '';
}

// 5. Superglobal $_SERVER con prefijo REDIRECT_
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_SERVER['REDIRECT_${api_key_constant}'] ?? '';
}

// 6. Superglobal $_ENV (FPM en algunas configuraciones)
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['${api_key_constant}'] ?? '';
}

// 7. Superglobal $_ENV con prefijo REDIRECT_
if (!$apiKey || empty($apiKey)) {
    $apiKey = $_ENV['REDIRECT_${api_key_constant}'] ?? '';
}

// Error si no se encontró la clave en ninguna fuente
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

## 5. Ajuste de .htaccess (si existe)

Si hay un archivo `.htaccess` en la carpeta de la app:

1. Verificar que la directiva `SetEnv` usa el nombre correcto de variable.
2. Ejemplo: `SetEnv F "AQUI_TU_API_KEY"` o `SetEnv A "AQUI_TU_API_KEY"`.
3. Si NO existe `.htaccess`, no crearlo — `config.php` actúa como fuente primaria.

## 6. Reglas para proxy seguro

- El frontend nunca debe llamar directamente a la API externa si requiere clave privada.
- El frontend debe llamar al proxy PHP.
- El proxy PHP debe añadir la clave en servidor.
- El proxy debe devolver errores JSON claros.
- El proxy debe validar método HTTP, cuerpo recibido y errores de cURL.
- No expongas la clave API en JavaScript, HTML, CSS ni JSON público.

## 7. Validación final

Tras la migración:

1. Verificar sintaxis PHP: `php -l proxy.php`
2. Probar que la API responde HTTP 200 con una petición de prueba.
3. Si hay errores, revisar logs del servidor.

## 8. Estructura recomendada en Hostinger

```text
public_html/
├── app/
│   ├── index.html
│   ├── assets/
│   ├── proxy.php        ← Cascada de 7 fuentes
│   ├── config.php       ← Clave aislada (no en repo)
│   └── .htaccess        ← Opcional, solo si ya existe
```

## 9. Reglas críticas

- No subas `config.php` a repositorios públicos.
- No incluyas claves reales en ejemplos.
- No devuelvas la clave API en errores.
- No imprimas variables sensibles con `var_dump`, `print_r` ni `console.log`.
- Si una clave fue expuesta, recomienda revocarla y generar una nueva.
- Diagnostica antes de tocar: lee el estado actual y confirma la variable usada.
