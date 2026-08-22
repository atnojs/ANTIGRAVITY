// ============================================================
// API - Genera contenido de infografías con IA vía proxy canónico
// Usa proxy.php (servidor) como fuente principal; fallback directo
// ============================================================

const API = {
  // Configuración del proxy
  proxyUrl: 'proxy.php',

  /**
   * Genera la estructura de la infografía vía IA
   */
  async generate(styleId, audience, title, content, apiKey = '', options = {}) {
    const style = STYLES.find(s => s.id === styleId);
    if (!style) throw new Error('Estilo no encontrado');

    // Determinar idioma
    const isSpanish = /[áéíóúñü]/i.test(title + content);

    const format = options.format || 'informational';
    const source = String(options.source || '').trim();
    const channel = options.channel || 'social';
    const visualDirection = String(options.visualDirection || '').trim();
    const referenceSchema = options.referenceSchema && typeof options.referenceSchema === 'object'
      ? options.referenceSchema
      : null;

    const systemPrompt = `Eres un editor de datos y diseñador de infografías experto. Genera una infografía estructurada en JSON.

REGLAS:
- ${isSpanish ? 'Todo el texto debe estar en ESPAÑOL' : 'All text must be in English'}
- Crea 4-6 secciones con: titulo (corto, max 3 palabras), puntos (2-4 bullets concisos), icono (un emoji), dato_destacado (un número o frase impactante)
- Tono: ${audience === 'niños' ? 'muy simple, divertido, para niños 7-10 años' : audience === 'mayores' ? 'claro, letra grande, accesible, para adultos mayores' : 'profesional, equilibrado, para adultos'}
- Estructura narrativa: ${format}
- Canal de publicación: ${channel}
- Estilo visual: ${style.prompt}
- Dirección visual elegida por el usuario: ${visualDirection || 'usar una composición editorial clara'}
- Gramática visual extraída de la referencia: ${referenceSchema ? JSON.stringify(referenceSchema) : 'sin referencia visual; usa un diseño editorial claro'}
- Adapta el contenido a la cantidad de secciones, recorrido de lectura y densidad indicados por esa gramática.
- NO inventes cifras, porcentajes, fechas, fuentes ni afirmaciones. Usa únicamente datos explícitos del usuario.
- Si no existe un dato numérico verificable, deja dato_destacado como cadena vacía.
- Conserva la fuente exactamente como se aporta. Si no se aporta, usa una cadena vacía.
- No presentes ejemplos o estimaciones como hechos.

Devuelve SOLO JSON válido con este formato:
{
  "titulo": "Título principal",
  "subtitulo": "Subtítulo opcional",
  "sections": [
    {"titulo": "Sección 1", "icono": "📊", "dato_destacado": "73%", "puntos": ["Punto 1", "Punto 2"]}
  ],
  "fuente": ${JSON.stringify(source)},
  "color_fondo": "${style._c1}",
  "color_acento": "${style._c2}"
}`;

    const userPrompt = `Crea una infografía sobre:
TÍTULO: ${title || 'Información clave'}
CONTENIDO: ${content || 'Datos e información relevante sobre el tema'}
FUENTE APORTADA: ${source || 'No aportada'}`;

    let data = null;
    // 1. Intentar proxy.php (OpenRouter vía servidor)
    try {
      const resp = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-text',
          system: systemPrompt,
          prompt: userPrompt,
          model: 'openai/gpt-4o-mini'
        })
      });
      const json = await resp.json();
      if (json.success && json.text) {
        data = { choices: [{ message: { content: json.text } }] };
      } else if (json.error) {
        throw new Error(json.error);
      }
    } catch (e) {
      console.warn('Proxy PHP no disponible, usando fallback directo:', e.message);
    }

    // 2. Fallback: llamada directa a API con clave del usuario
    if (!data) {
      if (!apiKey) throw new Error('Necesitas configurar tu API Key (el proxy no está disponible)');

      data = await this.callAPI(
        'https://openrouter.ai/api/v1/chat/completions',
        apiKey,
        'openai/gpt-4o-mini',
        systemPrompt,
        userPrompt,
        true
      );
    }

    // Extraer JSON de la respuesta
    const jsonStr = this.extractJSON(data);
    const infographic = JSON.parse(jsonStr);

    // Validar estructura mínima
    if (!infographic.titulo || !infographic.sections) {
      throw new Error('La IA no generó una infografía válida');
    }

    return infographic;
  },

  async analyzeReference(imageData) {
    if (!/^data:image\/(png|jpeg|webp);base64,/i.test(String(imageData))) {
      throw new Error('La referencia no tiene un formato de imagen válido.');
    }
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'analyze-reference', image: imageData })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || payload.detail || `Error HTTP ${response.status}`);
    }
    const raw = payload.json || payload.text || '';
    const cleaned = String(raw).replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const schema = JSON.parse(match ? match[0] : cleaned);
    if (!schema.layout || !schema.palette || !schema.composition) {
      throw new Error('La IA no pudo extraer una estructura visual utilizable.');
    }
    return schema;
  },

  async health() {
    try {
      const response = await fetch(this.proxyUrl, { cache: 'no-store' });
      if (!response.ok) return { available: false, configured: false };
      const payload = await response.json();
      return {
        available: payload.success === true,
        configured: payload.configured?.openrouter === true
      };
    } catch {
      return { available: false, configured: false };
    }
  },

  /**
   * Llama a una API de chat directamente
   */
  async callAPI(url, apiKey, model, system, user, isOpenRouter = false) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    if (isOpenRouter) {
      headers['HTTP-Referer'] = window.location.origin || 'http://localhost';
      headers['X-Title'] = 'Infographic Generator';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Extrae JSON de la respuesta de la IA (limpia markdown ```json)
   */
  extractJSON(data) {
    const content = data.choices?.[0]?.message?.content || '';
    // Limpiar markdown code blocks
    let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    // Si empieza con { y termina con }, es JSON válido
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) return cleaned;
    // Intentar encontrar JSON embebido
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    throw new Error('La IA no devolvió JSON válido');
  }
};
