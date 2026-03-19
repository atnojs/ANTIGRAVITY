import { ElevenLabsClient } from "elevenlabs";
import { env } from "../config.js";

const client = new ElevenLabsClient({
    apiKey: env.ELEVENLABS_API_KEY,
});

/**
 * Genera un buffer de audio a partir de un texto usando ElevenLabs.
 */
export async function generateTTS(text: string): Promise<Buffer> {
    try {
        console.log(`[TTS] Generando audio para: "${text.substring(0, 30)}..."`);

        const audio = await client.generate({
            voice: "21m00Tcm4TlvDq8ikWAM", // Rachel (Voz muy estable y de alta calidad)
            model_id: "eleven_multilingual_v2",
            text: text,
        });

        // La SDK devuelve un Readable stream, lo convertimos a Buffer
        const chunks: Buffer[] = [];
        for await (const chunk of audio) {
            chunks.push(Buffer.from(chunk));
        }

        return Buffer.concat(chunks);
    } catch (error) {
        console.error("[TTS Error]", error);
        throw new Error("No pude generar el audio de voz.");
    }
}
