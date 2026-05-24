const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // Usamos fetch nativo de Node.js
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        
        if (data.error) {
            console.error("Error de Google:", data.error.message);
            return;
        }

        console.log("\n--- MODELOS DISPONIBLES EN TU REGIÓN ---");
        data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes("generateContent")) {
                // Limpiamos el nombre para que veas el ID exacto
                console.log(`> ${m.name.split('/')[1]}`);
            }
        });
        console.log("----------------------------------------\n");
    } catch (error) {
        console.error("Error de conexión:", error.message);
    }
}

listModels();
