import { registerTool, ToolImplementation } from './registry.js';
import { generateTTS } from '../services/tts.js';

export const speakTool: ToolImplementation = {
    definition: {
        type: 'function',
        function: {
            name: 'speak',
            description: 'Convierte texto en un mensaje de voz y lo envía al usuario. DEBES usar esta herramienta OBLIGATORIAMENTE si el usuario te envía un mensaje de voz o te pide un audio/voz.',
            parameters: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'El texto que quieres que sea locutado por voz.'
                    }
                },
                required: ['text']
            }
        }
    },
    execute: async ({ text }) => {
        try {
            const audioBuffer = await generateTTS(text);
            return {
                status: 'success',
                message: 'Voz generada correctamente.',
                _audio_buffer: audioBuffer
            };
        } catch (error: any) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }
};

registerTool(speakTool);
