---
description: Modelo de Gemini para generación de imágenes - OBLIGATORIO
---

# 🎨 Modelo de IA para Generación de Imágenes

**SIEMPRE usar este modelo para cualquier proyecto de generación/edición de imágenes:**

```
gemini-3-pro-image-preview
```

**Nombre comercial:** Nano Banana Pro  
**Tipo:** Modelo de pago para generación y edición de imágenes  
**API Base:** `https://generativelanguage.googleapis.com/v1beta`

## Uso en código

### JavaScript (cliente)
```javascript
const GEMINI_MODEL = 'gemini-3-pro-image-preview';
```

### PHP (proxy)
```php
$model = $req['model'] ?? 'gemini-3-pro-image-preview';
$endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$API_KEY}";
```

> ⚠️ **NO cambiar este modelo** a menos que el usuario lo indique explícitamente.
