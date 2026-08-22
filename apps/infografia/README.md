# 📊 Folio — Infografías que se entienden

Generador de infografías con IA y modo local. `index.html` abre automáticamente la experiencia desde `folio.html`.

Separa el tipo de historia —datos, comparación, proceso, cronología, mapa o resumen— del lenguaje visual. Los 50 estilos se agrupan y se pueden buscar sin convertir la pantalla principal en un catálogo interminable.

## ✨ Características

- 6 estructuras narrativas y 50 estilos visuales buscables
- Recomendador de estructura según el contenido
- Generación mediante OpenRouter a través de proxy PHP
- Fallback local si la IA no está configurada
- Validación para no introducir cifras que el usuario no haya aportado
- Historial persistente con fallback al navegador
- Editor de títulos, bloques, datos y fuentes
- Salidas vertical, apaisada y cuadrada
- Descarga PNG e impresión/guardado PDF

## 🚀 Cómo usar

1. Abre `index.html` desde un servidor PHP.
2. Elige el tipo de historia y un estilo visual.
3. Introduce el contenido y, si existe, su fuente.
4. Genera, revisa y edita la pieza.
5. Descárgala o recupérala desde **Mis proyectos**.

## 📁 Estructura

```
infografia/
├── index.html               # Entrada; abre Folio
├── folio.html               # Interfaz principal
├── proxy.php                # Proxy seguro de OpenRouter
├── history.php              # Persistencia de proyectos
├── history-manager.js       # Cliente del historial
├── config.example.php       # Ejemplo de configuración
├── styles/folio.css         # Diseño de Folio
└── js/
    ├── styles-data.js       # Catálogo de 50 estilos
    ├── api.js               # Cliente IA
    ├── folio-app.js         # Interfaz base
    └── folio-operational.js # Historial, edición y layouts
```

## 🔧 Configuración de OpenRouter

La vía recomendada es configurar la clave en el servidor:

1. Copia `config.example.php` como `config.php`.
2. Sustituye el valor de `R` por la clave de OpenRouter.
3. Alternativamente, define la variable de entorno `R` en el hosting.

`config.php` está excluido de Git. La interfaz también admite una clave personal guardada en el navegador como fallback.

## 🌐 Publicación

1. Publica la rama `main` en un hosting con PHP 8.1+ y cURL.
2. Configura el secreto `R` en el servidor.
3. Da permiso de escritura a PHP en la carpeta de la app para que pueda crear `history_data/`.
4. Comprueba `proxy.php?action=health` y abre la ruta de la app.

## 📐 Requisitos

- PHP 8.1 o superior con extensión cURL
- Navegador moderno
- HTTPS en producción
- Clave de OpenRouter para generación con IA; sin ella funciona el modo local
