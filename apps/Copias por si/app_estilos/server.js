const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
// AUMENTAR LÍMITE DE TAMAÑO PARA BASE64
app.use(express.json({ limit: '50mb' })); // Permitir payloads grandes
app.use(express.static('public'));

// Configurar Gemini
// Nota: Si el usuario usa 'C' como key dummy, esto fallará al llamar a la API, 
// pero el servidor arrancará.
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Endpoint Principal
app.post('/generate', async (req, res) => {
  try {
    console.log("Recibida petición /generate");

    // 1. Validaciones básicas
    if (!apiKey || apiKey === 'C') {
      return res.status(500).json({
        error: 'API Key no válida en el servidor. Revisa .env (GOOGLE_API_KEY).'
      });
    }

    const payload = req.body;

    // 2. Extraer datos del payload enviado por el frontend
    // El frontend envía estructura: { model: '...', contents: [...], generationConfig: ... }
    const modelName = payload.model || "gemini-3.1-flash-image-preview";
    const contents = payload.contents;
    const generationConfig = payload.generationConfig;

    if (!contents) {
      return res.status(400).json({ error: 'Faltan los contenidos (contents) en el JSON.' });
    }

    console.log(`Modelo solicitado: ${modelName}`);

    // 3. Obtener modelo
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: generationConfig
    });

    // 4. Llamar a Gemini
    // Nota: Pasamos 'contents' directamente. 
    // La librería de Node espera array de parts o contents dependiendo del método.
    // generateContent toma (prompt) o ([prompt, images]).
    // Si ya tenemos la estructura 'contents' estilo REST, a veces es mejor desempaquetarla 
    // para la librería JS SDK, O usar modo REST directo si la librería da problemas con estructuras raw.

    // Intentaremos usar la librería SDK mapeando lo que llega.
    // El SDK espera: model.generateContent(request)
    // donde request puede ser un array de parts, o un objeto con contents.

    const result = await model.generateContent({
      contents: contents, // Pasamos los contents tal cual
      generationConfig: generationConfig
    });

    const response = await result.response;
    // Obtenemos texto o lo que devuelva
    // Para imágenes, a veces el SDK devuelve datos complejos.
    // Vamos a devolver todo el objeto candidato para que el frontend procese.

    // Hack: Acceder a los candidatos crudos si existen
    // La librería abstrae la respuesta, pero para imágenes generadas a veces necesitamos raw.
    // serializamos la respuesta completa.

    // Simplemente devolvemos lo que la librería entendió como respuesta completa
    // Mapeamos a un formato JSON que el frontend entienda (similar a la API REST)

    // Construimos una respuesta compatible con lo que espera nuestro frontend
    const candidates = response.candidates || [{
      content: {
        parts: [{ text: response.text() }] // Fallback texto
      }
    }];

    res.json({
      candidates: candidates
    });

  } catch (error) {
    console.error('Error en /generate:', error);

    // Manejo de errores detallado
    let errorMessage = error.message;
    if (error.response) {
      errorMessage = `Gemini API Error: ${error.response.status} - ${error.response.statusText}`;
    }

    res.status(500).json({ error: errorMessage });
  }
});

app.listen(port, () => {
  console.log(`Servidor Node.js corriendo en http://localhost:${port}`);
  console.log(`Límite de payload: 50mb`);
});
