import { chatCompletion } from './llm.js';
import { addMessage, getMessageHistory, StoredMessage } from './db.js';
import { getTool, getAllToolDefinitions } from '../tools/registry.js';
import { env } from '../config.js';

const SYSTEM_PROMPT = `Eres OpenGravity, un asistente de IA conversacional y muy amigable.
El usuario puede interactuar contigo por voz o texto. Tienes herramientas a tu disposición.
Responde siempre en español de forma natural, concisa y humana. No menciones que eres una IA salvo que sea estrictamente necesario.`;

const MAX_ITERATIONS = 10;

export interface ProcessResult {
    text: string;
    audio?: Buffer;
}

export async function processUserMessage(userId: number, text: string): Promise<ProcessResult> {
    await addMessage(userId, 'user', text);

    let iterations = 0;
    let finalResponse = '';
    let audioBuffer: Buffer | undefined;
    let executedToolSignatures = new Set<string>();

    while (iterations < MAX_ITERATIONS) {
        iterations++;
        const history = await getMessageHistory(userId, 12);

        try {
            const responseMessage = await chatCompletion(SYSTEM_PROMPT, history, iterations === 1 ? text : null);

            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                // Verificamos si el LLM está atrapado en un bucle llamando a la misma herramienta con los mismos args
                let isLooping = false;
                for (const toolCall of responseMessage.tool_calls) {
                    const sig = `${toolCall.function.name}-${toolCall.function.arguments}`;
                    if (executedToolSignatures.has(sig)) {
                        isLooping = true;
                        break;
                    }
                    executedToolSignatures.add(sig);
                }

                if (isLooping) {
                    console.warn('[Agent] Bucle de herramienta detectado. Abortando iteraciones internas.');
                    break;
                }

                await addMessage(userId, 'assistant', responseMessage.content ?? '', responseMessage.tool_calls);

                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    let toolArgs = {};
                    try {
                        toolArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
                        if (toolArgs === null) toolArgs = {};
                    } catch (e) {
                        console.warn(`[Agent] Error parseando argumentos para ${functionName}:`, toolCall.function.arguments);
                    }

                    console.log(`[Agent] Ejecutando tool: ${functionName}`, toolArgs);

                    const tool = getTool(functionName);
                    let toolResult;
                    try {
                        if (tool) {
                            toolResult = await tool.execute(toolArgs);
                        } else {
                            toolResult = { error: `Herramienta desconocida: ${functionName}` };
                        }
                    } catch (error: any) {
                        console.error(`Error ejecutando tool ${functionName}:`, error);
                        toolResult = { error: `Error interno: ${error.message}` };
                    }

                    // Si la tool devolvió un buffer de audio (ej: speak)
                    if (toolResult && (toolResult as any)._audio_buffer) {
                        audioBuffer = (toolResult as any)._audio_buffer;
                        // Limpiamos el buffer del resultado público para no ensuciar el historial de chat (es muy grande)
                        delete (toolResult as any)._audio_buffer;
                    }

                    await addMessage(userId, 'tool', JSON.stringify(toolResult), null, toolCall.id);
                }

                // Si ya conseguimos el audio, también podemos salir temprano para este caso de uso específico,
                // asegurando que no entra en bucle pidiendo más confirmaciones.
                if (audioBuffer) {
                    finalResponse = responseMessage.content || '';
                    break;
                }
                continue;

            } else {
                // Si no hay tool_calls, terminamos el bucle.
                // Guardamos el contenido si existe, incluso si es solo un espacio o confirmación corta.
                finalResponse = responseMessage.content || '';

                if (finalResponse) {
                    await addMessage(userId, 'assistant', finalResponse);
                } else if (!audioBuffer) {
                    finalResponse = "Operación completada.";
                }
                break;
            }
        } catch (error: any) {
            console.error('[Agent Loop Error]', error);
            finalResponse = `❌ Error interno: ${error.message}${error.status ? ` (Status: ${error.status})` : ''}\n\nPor favor, contacta con soporte o revisa los logs.`;
            break;
        }
    }

    if (iterations >= MAX_ITERATIONS && !finalResponse) {
        finalResponse = "He alcanzado el límite de operaciones internas. ¿Puedes replantearlo?";
    }

    return {
        text: finalResponse,
        audio: audioBuffer
    };
}
