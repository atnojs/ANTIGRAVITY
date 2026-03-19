# Visual Identity Architect - Fotos Antonio

Aplicación para gestión de identidad visual con asistente de IA.

## 🚀 Características

- **Chat con Director de Arte IA**: Asistente especializado en identidad visual
- **Gestión de referencias visuales**: Subida y organización de fotos de referencia
- **Generación de imágenes**: Integración con Google Gemini para creación de imágenes
- **Base de datos simplificada**: Usa archivos JSON, no requiere MySQL
- **Interfaz moderna**: Diseño con efectos glassmorphism y neón

## 📁 Estructura del Proyecto

```
apps/fotos_antonio/
├── index.html          # Interfaz principal del chat
├── admin.html          # Panel de administración de referencias
├── app.js              # Lógica del frontend
├── app.css             # Estilos principales
├── base.css            # Estilos base
├── components.css      # Estilos de componentes
├── api.php             # API principal
├── proxy.php           # Proxy para Google Gemini API
├── config.php          # Configuración de la aplicación
├── simple_db.php       # Base de datos simplificada (JSON)
├── db.php              # Base de datos MySQL (original)
├── schema.sql          # Esquema de base de datos
├── test_simple.php     # Test de la base de datos simplificada
├── test.html           # Test de la aplicación
├── data/               # Datos almacenados en JSON
├── referencias/        # Fotos de referencia subidas
└── uploads/            # Imágenes generadas
```

## 🛠️ Instalación y Configuración

### 1. Requisitos
- Servidor web (Apache, Nginx, o servidor PHP integrado)
- PHP 7.4 o superior
- Acceso a internet para Google Gemini API

### 2. Configuración

#### a) Configurar API Key de Google Gemini
Editar `config.php` y establecer la variable de entorno `C` con tu API Key:

```php
define('GEMINI_API_KEY', getenv('C') ?: 'TU_API_KEY_AQUI');
```

O configurar la variable de entorno en el servidor:
```bash
export C="tu-api-key-de-google-gemini"
```

#### b) Configurar proxy (opcional)
Si necesitas usar un proxy para acceder a Gemini, configurar en `proxy.php`:
```php
$apiKey = getenv('D') ?: $_SERVER['GOOGLE_API_KEY'] ?? '';
```

### 3. Iniciar la aplicación

#### Opción A: Servidor PHP integrado
```bash
cd apps/fotos_antonio
php -S localhost:8000
```

#### Opción B: Servidor Python (para pruebas)
```bash
cd apps/fotos_antonio
python3 -m http.server 8000
```

Acceder a: http://localhost:8000

## 🔧 Solución de Problemas

### 1. La aplicación no se carga
- Verificar que todos los archivos existen
- Revisar permisos de las carpetas `data/`, `referencias/`, `uploads/`
- Verificar errores en la consola del navegador

### 2. Error "CONFIGURACIÓN INCOMPLETA"
- Configurar correctamente la API Key de Google Gemini
- Verificar que el proxy.php pueda acceder a la API

### 3. No se guardan conversaciones
- Verificar que la carpeta `data/` tenga permisos de escritura
- Revisar el archivo `test_simple.php` para diagnosticar problemas

### 4. No se pueden subir imágenes
- Verificar permisos de las carpetas `referencias/` y `uploads/`
- Revisar límites de tamaño de archivo en PHP

## 🧪 Testing

### Probar base de datos simplificada:
```bash
# Acceder desde navegador o curl
http://localhost:8000/test_simple.php
```

### Probar API:
```bash
# Obtener conversaciones
curl "http://localhost:8000/api.php?action=get_conversations"

# Probar chat
curl -X POST "http://localhost:8000/api.php?action=chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hola, prueba"}'
```

## 🔄 Migración a Base de Datos Real

Si necesitas migrar a MySQL:

1. Crear la base de datos:
```bash
mysql -u root -p < schema.sql
```

2. Configurar credenciales en `config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'fotos_antonio');
define('DB_USER', 'usuario');
define('DB_PASS', 'contraseña');
```

3. Cambiar en `api.php`:
```php
require_once 'db.php';  // En lugar de simple_db.php
$db = Database::getInstance();
```

## 📝 Notas

- La aplicación usa **base de datos simplificada por defecto** (archivos JSON)
- Para producción, se recomienda migrar a MySQL
- El proxy.php maneja la conexión a Google Gemini API
- Las imágenes generadas se guardan en `uploads/`
- Las referencias se guardan en `referencias/`

## 🐛 Reportar Problemas

Si encuentras algún problema:
1. Revisar archivos de log en `data/`
2. Probar con `test_simple.php`
3. Verificar configuración de API Key
4. Revisar permisos de carpetas

## 📄 Licencia

Aplicación desarrollada para gestión de identidad visual.