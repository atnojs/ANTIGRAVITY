import { Groq } from 'groq-sdk';
import { env } from '../config.js';
import pkg from 'fs-extra';
const { createReadStream, writeFileSync, unlinkSync } = pkg;
import { tmpdir } from 'os';
import { join } from 'path';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

/**
 * Transcribe un archivo de audio (buffer) usando Groq Whisper.
 * Telegram envía archivos .ogg (opus), que Groq soporta.
 */
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
    const tempFilePath = join(tmpdir(), `voice_${Date.now()}.ogg`);

    try {
        // Guardar temporalmente para que la SDK de Groq pueda leerlo vía stream
        writeFileSync(tempFilePath, audioBuffer);

        console.log(`[Audio] Transcribiendo archivo temporal: ${tempFilePath}`);

        const transcription = await groq.audio.transcriptions.create({
            file: createReadStream(tempFilePath),
            model: 'whisper-large-v3-turbo',
            response_format: 'json',
            language: 'es', // Forzamos español por defecto
        });

        return transcription.text;
    } catch (error: any) {
        console.error('[Audio Error]', error);
        throw error;
    } finally {
        // Limpiar archivo temporal
        try {
            unlinkSync(tempFilePath);
        } catch (e) {
            // Ignorar errores al borrar el temporal
        }
    }
}
