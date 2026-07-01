// ============================================================
// API - Generación de Infografías con IA
// Soporta: proxy PHP (Hostinger) y fetch directo
// ============================================================

const API = {
  provider: 'openrouter',
  model: 'black-forest-labs/flux-1.1-pro',
  openrouterUrl: 'https://openrouter.ai/api/v1/chat/completions',
  proxyUrl: 'proxy.php',

  fallbackModels: [
    'black-forest-labs/flux-1.1-pro',
    'black-forest-labs/flux-1-schnell',
    'stabilityai/stable-diffusion-3.5-large',
    'openai/dall-e-3'
  ],

  /**
   * Generate an infographic image
   * Primero intenta proxy PHP (sin CSP), luego fetch directo
   */
  async generate(styleId, audience, title, content, apiKey) {
    if (!apiKey) {
      throw new Error('Necesitas configurar tu API Key primero');
    }

    const prompt = buildPrompt(styleId, audience, title, content);
    const aud = AUDIENCE_PROMPTS[audience] || AUDIENCE_PROMPTS.adultos;
    const aspectRatio = this.getAspectRatio(aud.aspect);

    let lastError = null;
    const models = [this.model, ...this.fallbackModels];

    for (const model of models) {
      try {
        // Intento 1: Proxy PHP (funciona siempre en Hostinger)
        try {
          const result = await this.callViaProxy(prompt, model, aspectRatio);
          if (result) return result;
        } catch (proxyErr) {
          console.log('Proxy no disponible, intentando fetch directo:', proxyErr.message);
        }

        // Intento 2: Fetch directo (requiere CSP configurada)
        const result = await this.callDirect(apiKey, prompt, model, aspectRatio);
        if (result) return result;
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} failed:`, err.message);
        continue;
      }
    }

    throw new Error(lastError?.message || 'No se pudo generar la imagen');
  },

  getAspectRatio(aspect) {
    switch(aspect) {
      case 'portrait': return '9:16';
      case 'landscape': return '16:9';
      case 'square': return '1:1';
      default: return '16:9';
    }
  },

  /**
   * Llama al proxy PHP (mismo dominio → sin CSP)
   */
  async callViaProxy(prompt, model, aspectRatio) {
    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model, aspect_ratio: aspectRatio })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Proxy HTTP ${response.status}`);
    }

    const data = await response.json();
    return this.extractImage(data);
  },

  /**
   * Llama directamente a OpenRouter (puede fallar por CSP)
   */
  async callDirect(apiKey, prompt, model, aspectRatio) {
    const response = await fetch(this.openrouterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin || 'http://localhost',
        'X-Title': 'Infographic Generator'
      },
      body: JSON.stringify({
        model: model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Generate an infographic as an image. Output ONLY the image.\n\n${prompt}` }
          ]
        }],
        response_format: { type: 'image' }
      })
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      let errMsg = `HTTP ${response.status}`;
      try { const j = JSON.parse(errBody); errMsg = j.error?.message || j.error || errMsg; } catch {}
      throw new Error(`${model}: ${errMsg}`);
    }

    const data = await response.json();
    return this.extractImage(data);
  },

  /**
   * Extrae la URL de la imagen de la respuesta de OpenRouter
   */
  extractImage(data) {
    // Formato 1: content como string (data:image)
    if (data.choices?.[0]?.message?.content) {
      const c = data.choices[0].message.content;
      if (typeof c === 'string' && c.startsWith('data:image')) return c;
      if (typeof c === 'string' && (c.startsWith('http://') || c.startsWith('https://'))) return c;
      if (Array.isArray(c)) {
        const img = c.find(p => p.type === 'image_url' || p.type === 'image');
        if (img?.image_url?.url) return img.image_url.url;
        if (img?.url) return img.url;
        if (img?.image?.url) return img.image.url;
      }
    }

    // Formato 2: image_url directo
    if (data.image_url) return data.image_url;
    if (data.url) return data.url;

    // Formato 3: data array (DALL-E style)
    if (data.data?.[0]?.url) return data.data[0].url;
    if (data.data?.[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;

    throw new Error('No se pudo extraer la imagen de la respuesta de la API');
  }
};
