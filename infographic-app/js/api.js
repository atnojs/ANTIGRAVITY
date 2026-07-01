// ============================================================
// API - Generación de Infografías con IA
// ============================================================

const API = {
  // Config - the user will set their own API key
  // Can use: OpenRouter, DeepSeek, or any image generation API
  provider: 'openrouter',
  model: 'black-forest-labs/flux-1.1-pro',
  
  // For OpenRouter
  openrouterUrl: 'https://openrouter.ai/api/v1/chat/completions',
  
  // Fallback models
  fallbackModels: [
    'black-forest-labs/flux-1.1-pro',
    'black-forest-labs/flux-1-schnell',
    'stabilityai/stable-diffusion-3.5-large',
    'openai/dall-e-3'
  ],

  /**
   * Generate an infographic image
   */
  async generate(styleId, audience, title, content, apiKey) {
    if (!apiKey) {
      throw new Error('Necesitas configurar tu API Key primero');
    }

    const prompt = buildPrompt(styleId, audience, title, content);
    const style = STYLES.find(s => s.id === styleId);
    const aud = AUDIENCE_PROMPTS[audience] || AUDIENCE_PROMPTS.adultos;

    const aspectRatio = this.getAspectRatio(aud.aspect);

    // Try primary model first, then fallbacks
    let lastError = null;
    const models = [this.model, ...this.fallbackModels];

    for (const model of models) {
      try {
        const result = await this.callImageAPI(apiKey, prompt, model, aspectRatio);
        if (result) return result;
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} failed:`, err.message);
        continue;
      }
    }

    throw new Error(lastError?.message || 'No se pudo generar la imagen');
  },

  /**
   * Map audience aspect to actual aspect ratio string
   */
  getAspectRatio(aspect) {
    switch(aspect) {
      case 'portrait': return '9:16';
      case 'landscape': return '16:9';
      case 'square': return '1:1';
      default: return '16:9';
    }
  },

  /**
   * Call the image generation API
   */
  async callImageAPI(apiKey, prompt, model, aspectRatio) {
    // OpenRouter / FLUX call
    const response = await fetch(this.openrouterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Infographic Generator'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Generate an infographic as an image. IMPORTANT: Output ONLY the image, no text wrapper.\n\n${prompt}` }
            ]
          }
        ],
        response_format: { type: 'image' }
      })
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      let errMsg = `HTTP ${response.status}`;
      try {
        const errJson = JSON.parse(errBody);
        errMsg = errJson.error?.message || errJson.error || errMsg;
      } catch {}
      throw new Error(`${model}: ${errMsg}`);
    }

    const data = await response.json();
    
    // OpenRouter returns image in different formats depending on model
    if (data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      if (typeof content === 'string' && content.startsWith('data:image')) {
        return content; // data URL
      }
      if (Array.isArray(content)) {
        const imagePart = content.find(p => p.type === 'image_url' || p.type === 'image');
        if (imagePart?.image_url?.url) return imagePart.image_url.url;
        if (imagePart?.url) return imagePart.url;
        if (imagePart?.image?.url) return imagePart.image.url;
      }
      if (content?.url) return content.url;
    }

    // Alternative: check for direct image_url in response
    if (data.image_url) return data.image_url;
    if (data.data?.[0]?.url) return data.data[0].url;

    throw new Error('Formato de respuesta no reconocido');
  },

  /**
   * Alternative method using text-to-image via OpenRouter
   * (for models that output images differently)
   */
  async callTextToImage(apiKey, prompt, model, aspectRatio) {
    const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Infographic Generator'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        n: 1,
        size: aspectRatio === '16:9' ? '1024x576' : 
              aspectRatio === '9:16' ? '576x1024' : '1024x1024'
      })
    });

    if (!response.ok) {
      throw new Error(`Image API HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.data?.[0]?.url) return data.data[0].url;
    if (data.data?.[0]?.b64_json) return `data:image/png;base64,${data.data[0].b64_json}`;
    throw new Error('No image URL in response');
  }
};
