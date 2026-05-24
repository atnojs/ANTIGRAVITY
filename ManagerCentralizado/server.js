const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sharp = require('sharp');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE SEGURIDAD Y TAMAÑO ---
app.use(cors()); // Esto arregla el "Failed to fetch"
app.use(express.json({ limit: '20mb' })); // Permitimos imágenes grandes

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- FUNCIÓN CENTRAL DE PROCESAMIENTO ---
async function procesarImagen(imageData, prompt) {
    // Mi recomendación: Usar gemini-1.5-flash. Es el más estable en España/Canarias.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        // Optimizamos la imagen antes de mandarla para ahorrar tokens (dinero)
        const optimizedBuffer = await sharp(Buffer.from(imageData, 'base64'))
            .resize(1024) // Redimensionado automático
            .jpeg({ quality: 80 })
            .toBuffer();

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: optimizedBuffer.toString('base64'),
                    mimeType: "image/jpeg"
                }
            }
        ]);

        return result.response.text();
    } catch (error) {
        console.error("Error en la API de Google:", error.message);
        throw error;
    }
}

// --- RUTA QUE USARÁN TUS 25 APPS ---
app.post('/v1/chat/completions', async (req, res) => {
    const { image, prompt } = req.body;

    if (!image || !prompt) {
        return res.status(400).json({ error: "Falta la imagen o el prompt" });
    }

    console.log(`[MANAGER] Recibida petición. Procesando con Gemini 1.5 Flash...`);

    try {
        const respuesta = await procesarImagen(image, prompt);
        res.json({ response: respuesta });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`CEREBRO CENTRAL ACTIVO EN PUERTO ${PORT}`);
    console.log(`Listo para recibir peticiones de tus apps`);
    console.log(`=========================================`);
});
