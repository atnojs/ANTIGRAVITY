---
name: history-server
description: "Sistema de historial persistente server-side para apps Antigravity. Reemplaza localStorage (límite 5MB, solo local) por almacenamiento PHP en servidor Hostinger sin límite de tamaño y accesible desde cualquier navegador."
---

# History Server — Historial Persistente Server-Side

## Objetivo

Proporcionar un sistema de historial para apps web alojadas en Hostinger que:
- **No tiene límite de 5MB** (a diferencia de localStorage)
- **Es accesible desde cualquier navegador/dispositivo** (los datos viven en el servidor)
- **Persiste entre sesiones y dispositivos**
- **Usa PHP como backend** (compatible con Hostinger)

## Arquitectura

Cada app tiene su propia carpeta de historial:

```text
apps/<nombre-app>/
├── history.php              ← API REST de historial
├── history-manager.js       ← Cliente JavaScript
├── history/
│   └── data/
│       └── history.json     ← Datos persistentes (sin límite de tamaño)
```

## Inputs esperados

- `app_directory`: ruta absoluta de la app donde se instalará el sistema de historial.

## 1. Instalación del backend PHP

Copiar `resources/history.php` a `${app_directory}/history.php`.

Este archivo expone 4 endpoints:

| Acción | Método | URL | Body |
|--------|--------|-----|------|
| `list` | GET | `history.php?action=list` | — |
| `save` | POST | `history.php?action=save` | JSON con `{ type, data }` |
| `delete` | POST | `history.php?action=delete&id=X` | — |
| `clear` | POST | `history.php?action=clear` | — |

El archivo `history/data/history.json` se crea automáticamente en la primera escritura.

## 2. Instalación del cliente JavaScript

Copiar `resources/history-manager.js` a `${app_directory}/history-manager.js`.

Incluirlo en el HTML:

```html
<script src="history-manager.js"></script>
```

## 3. Patrón de uso en React/JS

```jsx
// Inicializar
const hm = new HistoryManager('nombre_app');

// Cargar al montar
useEffect(() => {
    hm.load().then(() => setHistory(hm.getAll()));
}, []);

// Guardar nuevo item
const addToHistory = async (item) => {
    await hm.save({
        type: 'image',
        data: {
            url: item.url,
            prompt: item.prompt,
            // ... cualquier dato serializable
        }
    });
    setHistory(hm.getAll());
};

// Eliminar item
const removeFromHistory = async (id) => {
    await hm.delete(id);
    setHistory(hm.getAll());
};

// Limpiar todo
const clearHistory = async () => {
    if (confirm('¿Eliminar todo el historial?')) {
        await hm.clear();
        setHistory([]);
    }
};
```

## 4. Patrón de uso en vanilla JS

```javascript
const hm = new HistoryManager('nombre_app');

// Cargar historial al iniciar
document.addEventListener('DOMContentLoaded', async () => {
    const history = await hm.load();
    renderHistory(history);
});

// Guardar
async function onGenerate(result) {
    await hm.save({ type: 'image', data: result });
    renderHistory(hm.getAll());
}

// Eliminar
async function onDelete(id) {
    await hm.delete(id);
    renderHistory(hm.getAll());
}
```

## 5. Estructura de cada entrada

```json
{
    "id": "1717000000_abc123def",
    "type": "image",
    "data": {
        "url": "https://...",
        "prompt": "una casa en el bosque",
        "model": "gemini-3.1-flash-image-preview"
    },
    "createdAt": "2026-06-04T12:00:00+02:00"
}
```

## 6. Componentes UI requeridos

Al implementar el historial, la interfaz debe incluir:

- Panel lateral o sección de historial visible con grid de items
- Cada item con botones de **Descargar** y **Eliminar**
- Botón global de **Limpiar todo** con confirmación (`confirm()`)
- **cursor: zoom-in** en imágenes del historial
- Lightbox para ver imágenes ampliadas (ver skill `style_guide_skill`)

## 7. Ventajas sobre localStorage

| Característica | localStorage | History Server |
|---------------|-------------|----------------|
| Límite de tamaño | 5MB | Sin límite (disco) |
| Alcance | Solo este navegador | Cualquier navegador |
| Persistencia | Se pierde al limpiar datos | Archivo en servidor |
| Sincronización | No | Sí (mismo servidor) |
| Backups | Manual | Se incluye en backups del hosting |

## 8. Reglas críticas

- No almacenar datos sensibles (contraseñas, tokens, claves API) en el historial.
- El archivo `history.json` puede crecer indefinidamente; considerar paginación si la app genera miles de entradas.
- No exponer `history.php` sin protección si la app tiene datos privados de usuarios.
- El directorio `history/data/` debe tener permisos de escritura para PHP.
