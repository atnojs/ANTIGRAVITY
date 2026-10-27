/*
 * Servicio API — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: Lo.
 * Cliente del proxy PHP de la app (generación y edición de imagen).
 */

export const api = {
  async fetch(s) {
    const e = await fetch("proxy.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(s),
    });
    if (!e.ok) {
      const i = await e.json();
      throw new Error(i.error || "Server Error");
    }
    return e.json();
  },
  async enhancePrompt(s) {
    return this.fetch({
      task: "enhancePrompt",
      prompt: s,
    });
  },
  async generateImage(s, e = "1:1", i = "gemini") {
    const o = (
      await this.fetch({
        task: "generateImage",
        prompt: s,
        aspectRatio: e,
        provider: i,
        modalities: ["IMAGE", "TEXT"],
      })
    ).candidates?.[0]?.content?.parts?.find((c) => c.inlineData);
    if (!o) throw new Error("No se pudo generar la imagen");
    return `data:${o.inlineData.mimeType};base64,${o.inlineData.data}`;
  },
  async editWithMask(s, e, i, r = "gemini") {
    const c = (
      await this.fetch({
        task: "editWithMask",
        prompt: s,
        image: e.split(",")[1] || e,
        mask: i,
        provider: r,
      })
    ).candidates?.[0]?.content?.parts?.find((d) => d.inlineData);
    if (!c) throw new Error("No se pudo editar la imagen");
    return `data:${c.inlineData.mimeType};base64,${c.inlineData.data}`;
  },
  async upscale(s, e = 2) {
    const i = await this.fetch({
      task: "upscale",
      image: s.split(",")[1] || s,
      scale: e,
    });
    if (!i.image) throw new Error("Falla al escalar la imagen");
    return i.image;
  },
  async applyStyle(s, e) {
    const r = (
      await this.fetch({
        task: "applyStyle",
        prompt: s,
        image: e.split(",")[1] || e,
      })
    ).candidates?.[0]?.content?.parts?.find((o) => o.inlineData);
    if (!r) throw new Error("No se pudo aplicar el estilo");
    return `data:${r.inlineData.mimeType};base64,${r.inlineData.data}`;
  },
};
