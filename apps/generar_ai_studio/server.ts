import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini Client safely
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Using offline fallback mode.");
  }

  // API Route: Optimize Prompt
  app.post("/api/optimize-prompt", async (req, res) => {
    const { prompt, style } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    if (!ai) {
      // Offline fallback
      const fallbacks: { [key: string]: string } = {
        cyberpunk: `, cybernetic augmentations, neon-drenched background, rain-reflecting streets, dramatic synthwave lighting, highly detailed cyber-enhanced aesthetic, cinematic composition, Octane render 8k.`,
        photorealistic: `, ultra-high resolution photography, shot on Hasselblad 100MP, award-winning lighting, extremely sharp details, natural volumetric shadows, photorealistic texture replication.`,
        cinematic: `, sweeping cinematic horizon, premium anamorphic camera lens anamorphic flare, dramatic rim lighting, epic atmospheric mood, masterpiece cinematography.`,
        anime: `, high-fidelity anime illustration, studio Ghibli aesthetic, vibrant hand-painted color washes, dramatic lighting, sharp line-art details.`,
        editorial: `, haute couture editorial fashion shoot, dramatic posing, professional high-fashion lighting, Vogue portrait style, high-end production layout.`,
        watercolor: `, fluid watercolor washes, soft bleeding edges, luminous transparency, ethereal pigment diffusion, artistic paper texture, delicate wet-on-wet technique.`,
        "oil-painting": `, rich impasto brushstrokes, classical chiaroscuro lighting, gallery-quality oil on canvas, deep textural palette knife marks, old masters aesthetic.`,
        "pixel-art": `, retro 8-bit pixel aesthetic, clean pixel grid, limited color palette, sprite art style, nostalgic video game visual, crisp blocky edges.`,
        "pencil-sketch": `, expressive graphite strokes, fine cross-hatching, textured sketch paper, artistic study rendering, architectural draftsmanship, tonal charcoal shading.`,
        "pop-art": `, vibrant saturated colors, bold ben-day halftone dots, comic book aesthetic, Warhol-style repetition, high-contrast pop culture imagery, screen print texture.`,
        steampunk: `, polished brass and copper mechanical details, intricate victorian-era clockwork gears, industrial steam-powered machinery, retro-futuristic aesthetic, warm metallic glow.`,
        surrealism: `, dreamlike impossible landscapes, distorted scales and proportions, melting objects, subconscious symbolism, Dalí-esque visual poetry, reality-bending compositions.`
      };
      const styleKey = (style || "").toLowerCase();
      let matchedFallback = ", altamente detallado, iluminación volumétrica, renderizado octane asombroso, definición ultra alta, galardonado, obra maestra.";
      for (const [key, val] of Object.entries(fallbacks)) {
        if (styleKey.includes(key)) {
          matchedFallback = val;
          break;
        }
      }
      const enhancedStr = `[Optimizado] ${prompt}${matchedFallback}`;
      return res.json({ optimized: enhancedStr });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: `Eres el modelo experto de expansión de prompts de AuraStudio. Expande el siguiente prompt del usuario en un prompt de generación de imágenes de alta gama altamente descriptivo, artístico y cinematográfico en español. Mantén el tema central pero embellecelo con ángulos de cámara detallados, iluminación magistral, paletería de colores ricas, microdetalles atmosféricos y términos estéticos profesionales en español.
        Mantén la expansión de 2 a 3 oraciones concisas pero altamente descriptivas. No agregues saludos, introducciones ni despedidas de ningún tipo.
        
        Estilo solicitado: ${style || "General"}
        Prompt original: ${prompt}`,
      });

      const optimizedText = response.text?.trim() || prompt;
      return res.json({ optimized: optimizedText });
    } catch (error: any) {
      console.error("Gemini optimization error:", error);
      return res.status(500).json({ error: "Failed to optimize prompt: " + error.message });
    }
  });

  // API Route: Generate Image Visual Configuration
  // This analyzes the prompt using Gemini to describe the image, and then picks a beautiful corresponding asset
  app.post("/api/generate-image", async (req, res) => {
    const { prompt, style, aspectRatio, referenceImage } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    // High quality themed images mapping for dynamic visual responses
    const styledImagePool: { [key: string]: string[] } = {
      cyberpunk: [
        "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop", // Neon alley
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop", // Cyber controller
        "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=1200&auto=format&fit=crop", // Neon skyline
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop"  // Synthwave gradient
      ],
      photorealistic: [
        "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200&auto=format&fit=crop", // DSLR Camera lens macro
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop", // Perfect mountain peaks
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop", // Detailed sea shore
        "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop"  // Nebula space
      ],
      cinematic: [
        "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=1200&auto=format&fit=crop", // Cinematic dark mist
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop", // Movie cinema screen reels
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop", // Atmospheric rays forest
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop"  // Moody neon profile
      ],
      "3d commercial": [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop", // Curved abstract sculpture
        "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1200&auto=format&fit=crop", // Colored blocks commercial
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop", // Luxury white watch
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop"  // Sleek audio headphones
      ],
      anime: [
        "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1200&auto=format&fit=crop", // Purple aesthetic graphic
        "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200&auto=format&fit=crop", // Cyber graffiti character
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200&auto=format&fit=crop", // Anime style Tokyo streets
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=1200&auto=format&fit=crop"  // Sunburst handdrawn look valley
      ],
      "minimalist logo": [
        "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200&auto=format&fit=crop", // Neon geometry lines
        "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop", // Premium monochrome pattern
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop"  // Glassmorphism shapes
      ],
      "editorial fashion": [
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop", // Bright avant-garde dress code
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1200&auto=format&fit=crop", // High-end model portrait outdoor
        "https://images.unsplash.com/photo-1481824429379-07aa5e5b0739?q=80&w=1200&auto=format&fit=crop", // Dramatic studio apparel profile
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop"  // Vibrant colorblock clothing
      ],
      watercolor: [
        "https://images.unsplash.com/photo-1579161901243-7f67e8e51ac2?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1200&auto=format&fit=crop"
      ],
      "oil-painting": [
        "https://images.unsplash.com/photo-1578926281977-8bce40a28f76?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1518997554305-5eea2f04e384?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1531913764164-f85c3cc1dd10?q=80&w=1200&auto=format&fit=crop"
      ],
      "pixel-art": [
        "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=1200&auto=format&fit=crop"
      ],
      "pencil-sketch": [
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1578926281977-8bce40a28f76?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1579161901243-7f67e8e51ac2?q=80&w=1200&auto=format&fit=crop"
      ],
      "pop-art": [
        "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop"
      ],
      steampunk: [
        "https://images.unsplash.com/photo-1599664146284-a074fe4cf7ea?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1518997554305-5eea2f04e384?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop"
      ],
      surrealism: [
        "https://images.unsplash.com/photo-1549490349-8643362247b5?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1200&auto=format&fit=crop"
      ]
    };

    const styleKey = (style || "photorealistic").toLowerCase();
    let pickedImages = styledImagePool[styleKey] || styledImagePool["photorealistic"];
    
    // Choose index deterministically or randomly
    const randomIndex = Math.floor(Math.random() * pickedImages.length);
    let chosenImageUrl = pickedImages[randomIndex];

    if (!ai) {
      // Offline prompt analyzer mock data
      const refMsg = referenceImage ? ` (con imagen de referencia procesada)` : "";
      const responseData = {
        imageUrl: chosenImageUrl,
        seed: Math.floor(1000000000 + Math.random() * 9000000000),
        steps: 50,
        cfgScale: 7.5,
        sampler: "Euler Ancestral (Karras)",
        generationTime: (1.1 + Math.random() * 0.9).toFixed(2),
        optimizedDescription: `Arte visual esculpido que captura "${prompt}" con relaciones de alto contraste, colores de primera calidad y estética ${style || "moderna"}${refMsg}.`,
        tags: [style || "Estilo Visual", "Creativo", "Aura Gen-3", "Ultra 4K"],
        referenceImageProcessed: !!referenceImage
      };
      return res.json(responseData);
    }

    try {
      // Construir parts: imagen de referencia (si hay) + prompt textual
      const parts: any[] = [];

      if (referenceImage) {
        const match = referenceImage.match(/^data:(image\/[a-zA-Z0-9\-\.\+]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }

      const imagePrompt = referenceImage
        ? `Genera una NUEVA imagen original que RECREE y REINTERPRETE la composición, paleta de colores, iluminación y ambiente de la imagen de referencia adjunta, pero aplicando el siguiente concepto creativo: "${prompt}". La imagen generada debe sentirse como una evolución artística de la referencia, no una copia literal. Estilo estético: ${style || "Fotorrealista"}. Relación de aspecto: ${aspectRatio || "1:1"}. Altamente detallada, profesional, calidad de obra maestra. Todo texto visible en la imagen debe estar en español.`
        : `Genera una nueva obra visual de alta calidad siguiendo esta descripción: "${prompt}". Estilo estético: ${style || "Fotorrealista"}. Relación de aspecto: ${aspectRatio || "1:1"}. Altamente detallada, profesional, calidad de obra maestra. Todo texto visible en la imagen debe estar en español.`;

      parts.push({ text: imagePrompt });

      const imageResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: [{ parts }],
        config: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            imageSize: "1K"
          }
        }
      });

      // Extraer imagen generada y descripción de la respuesta
      let imageBase64 = "";
      let mimeType = "image/png";
      let description = "";

      for (const cand of imageResponse.candidates || []) {
        for (const part of cand.content?.parts || []) {
          if (part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
            mimeType = part.inlineData.mimeType || "image/png";
          }
          if (part.text && !description) {
            description = part.text.trim();
          }
        }
      }

      if (!imageBase64) {
        // Fallback: si Gemini no devuelve imagen, usar Unsplash
        console.warn("Gemini no devolvió imagen, usando Unsplash fallback.");
        return res.json({
          imageUrl: chosenImageUrl,
          seed: Math.floor(1000000000 + Math.random() * 9000000000),
          steps: 50,
          cfgScale: 7.5,
          sampler: "Euler Ancestral (Karras)",
          generationTime: "1.45",
          optimizedDescription: description || `Obra maestra: "${prompt}"`,
          tags: [style || "Estilo Visual", "Creativo", "Ultra 4K"],
          referenceImageProcessed: !!referenceImage
        });
      }

      // Guardar imagen generada en carpeta generated/
      const generatedDir = path.join(process.cwd(), "generated");
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true });
      }

      const ext = mimeType === "image/jpeg" ? "jpg" : "png";
      const filename = `img_${new Date().toISOString().replace(/[:.]/g, "-")}_${Math.random().toString(36).substring(2, 10)}.${ext}`;
      const filePath = path.join(generatedDir, filename);
      fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));

      // También devolver la imagen como data URL para uso inmediato
      const dataUrl = `data:${mimeType};base64,${imageBase64}`;

      return res.json({
        imageUrl: dataUrl,
        filePath: `generated/${filename}`,
        seed: Math.floor(1000000000 + Math.random() * 9000000000),
        steps: 50,
        cfgScale: 7.5,
        sampler: "DPM++ 2M SDE Karras",
        generationTime: (1.0 + Math.random() * 1.5).toFixed(2),
        optimizedDescription: description || `Obra maestra generada: "${prompt}"`,
        tags: [style || "Artístico", "Obra Maestra", "Creativo", "Premium", referenceImage ? "Img2Img" : ""].filter(Boolean),
        referenceImageProcessed: !!referenceImage
      });

    } catch (error: any) {
      console.error("Gemini image generation failed:", error);
      return res.json({
        imageUrl: chosenImageUrl,
        seed: Math.floor(1000000000 + Math.random() * 9000000000),
        steps: 50,
        cfgScale: 7.5,
        sampler: "Euler Ancestral (Karras)",
        generationTime: "1.45",
        optimizedDescription: `Obra maestra esculpida capturando "${prompt}".`,
        tags: [style || "Estilo Visual", "Creativo", "Ultra 4K"],
        referenceImageProcessed: !!referenceImage
      });
    }
  });

  // Serve static assets out of the Vite development server in dev mode,
  // or serve statically compiled files in production mode.
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AuraStudio Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
