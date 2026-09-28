---
name: arquitecto-backend-php-hostinger
description: "Activa este skill para configurar proxies de comunicación seguros con APIs de IA en servidores PHP de Hostinger, aislando claves y previniendo errores de entorno."
---

# Arquitecto de Backend PHP para Hostinger

## Objetivo

Configurar una comunicación segura entre una aplicación web alojada en Hostinger y una API de IA, usando PHP como proxy y evitando exponer claves privadas en el frontend.

## Inputs esperados

- `app_directory`: ruta absoluta de la aplicación en el servidor.
- `provider_keys`: variables del `.htaccess` raíz que necesita la app. Mapa vigente: `R` (OpenRouter) y `OPENAI_API_KEY` (alias `O`) para OpenAI.

## 1. Regla crítica de seguridad

Nunca escribas claves API reales dentro de archivos compartidos, prompts, documentación o respuestas públicas.

La ÚNICA fuente de claves del proyecto es el entorno del servidor, con `SetEnv` en el `.htaccess` raíz privado de Hostinger. No crear ni leer ficheros de claves locales (`config.php` o similares): un fichero así no está en Git, nadie lo ve, y cuando la clave se rota la app empieza a fallar con `401` sin que el error lo explique. En `apps/dibujo_lineas_copia` ocurrió exactamente eso y hubo que borrar el `config.php` del servidor.

Métodos admitidos, en este orden:

1. `SetEnv` en el `.htaccess` raíz de Hostinger (fuente de verdad).
2. Panel de entorno del servidor (hPanel → Advanced → Environment), equivalente a lo anterior.
3. Marcador seguro como `AQUI_TU_API_KEY` en ejemplos y plantillas, nunca una clave real.

Prohibido: `define('CLAVE', '...')` en un fichero del proyecto, claves en el frontend y claves en la documentación.

## 2. Diagnóstico previo (obligatorio)

Antes de modificar nada, diagnosticar el estado actual:

1. Localizar el archivo PHP que realiza peticiones cURL a la API (normalmente `proxy.php`).
2. Identificar cómo obtiene la API Key actualmente (buscar `getenv()`, constantes, `$_SERVER`).
3. Identificar el nombre de la variable/constante usada (`F`, `A`, etc.).
4. Verificar si existe `.htaccess` en la carpeta con directivas `SetEnv`.

## 3. Alta de la clave en el `.htaccess` raíz

No se crea ningún fichero dentro de la app. La clave se declara una sola vez en el `.htaccess` raíz de Hostinger (fuera del repositorio):

```apache
SetEnv OPENAI_API_KEY "AQUI_TU_API_KEY_OPENAI"
SetEnv R "AQUI_TU_API_KEY_OPENROUTER"
```

Indicar al usuario que sustituya los marcadores por sus claves reales directamente en el servidor y que compruebe el resultado con la acción de salud del proxy.

Si en la carpeta de la app existe un `config.php` antiguo, BORRARLO en el servidor: ya no se lee y solo puede aportar una clave caducada.

## 4. Resolución de la clave en `proxy.php`

Solo desde el entorno, sin leer ficheros ni constantes locales:

```php
<?php
function getKey(string $name): string {
    foreach ([
        getenv($name), getenv('REDIRECT_' . $name),
        $_SERVER[$name] ?? '', $_SERVER['REDIRECT_' . $name] ?? '',
        $_ENV[$name] ?? '', $_ENV['REDIRECT_' . $name] ?? '',
    ] as $value) {
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
}

$openaiKey = getKey('OPENAI_API_KEY');
if ($openaiKey === '') $openaiKey = getKey('O');
$orKey = getKey('R');

if ($openaiKey === '') {
    http_response_code(500);
    echo json_encode(['error' => ['message' => 'Clave OpenAI (OPENAI_API_KEY/O) no configurada en el servidor.']]);
    exit;
}
```

Añadir además una acción de salud que informe sin gastar API y sin exponer claves:

```php
if (strtolower(trim((string)($req['action'] ?? ''))) === 'health') {
    http_response_code(200);
    echo json_encode([
        'success'    => true,
        'configured' => ['openai' => $openaiKey !== '', 'openrouter' => $orKey !== ''],
        'models'     => array_keys($modelCatalog),
    ]);
    exit;
}
```

## 5. Ajuste del `.htaccess`

1. Verificar que cada `SetEnv` usa el nombre correcto: `R` (OpenRouter) y `OPENAI_API_KEY` (alias `O`) para OpenAI. No inventar letras de proveedor ni reutilizar siglas retiradas.
2. El `.htaccess` raíz es la única fuente; no delegar en ficheros de la app.
3. Los datos del historial viven en una carpeta no versionada (`history_store/`) con su propio `.htaccess` que sirve imágenes y deniega JSON, `.lock` y PHP.

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
├── .htaccess            ← Claves con SetEnv (fuera del repositorio)
└── app/
    ├── index.html
    ├── assets/
    ├── proxy.php        ← Resuelve la clave solo desde el entorno
    └── history_store/   ← Historial no versionado (imágenes + history.json)
```

## 9. Reglas críticas

- La clave vive SOLO en el `.htaccess` raíz del servidor; nunca en un fichero de la app ni en el repositorio.
- No incluyas claves reales en ejemplos, plantillas ni documentación.
- No devuelvas la clave API en errores.
- No imprimas variables sensibles con `var_dump`, `print_r` ni `console.log`.
- Si una clave fue expuesta, recomienda revocarla y generar una nueva.
- Diagnostica antes de tocar: lee el estado actual y confirma la variable usada.
- Si algo falla con `401`, sospecha primero de una clave antigua servida desde un fichero local o de una caché intermedia, y compruébalo con la acción de salud y la lista real de modelos.
