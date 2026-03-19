import { Groq } from "groq-sdk";
import 'dotenv/config';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
    const tools = [
        {
            type: "function",
            function: {
                name: "speak",
                description: "Convierte texto en un mensaje de voz y lo envía al usuario. DEBES usar esta herramienta OBLIGATORIAMENTE si el usuario te envía un mensaje de voz o te pide un audio/voz.",
                parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
            }
        }
    ];

    const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
            { role: "system", content: "Eres OpenGravity, un asistente de IA conversacional y muy amigable." },
            { role: "user", content: "Mensaje de voz del usuario: ¿Me escuchas chat? Dime si me escuchas, pero dímelo hablando." },
            { role: "assistant", content: "", tool_calls: [{ id: "call_123", type: "function", function: { name: "speak", arguments: "{\"text\":\"Sí, te escucho fuerte y claro.\"}" } }] },
            { role: "tool", tool_call_id: "call_123", content: "{\"status\":\"success\",\"message\":\"Voz generada correctamente.\"}" }
        ],
        tools: tools,
        tool_choice: "auto"
    });

    console.log("TOOL CALLS:", JSON.stringify(response.choices[0].message.tool_calls, null, 2));
    console.log("TEXT CONTENT:", response.choices[0].message.content);
}

main().catch(console.error);
