import { Groq } from 'groq-sdk';
import { env } from '../config.js';
import { StoredMessage } from './db.js';
import { getAllToolDefinitions } from '../tools/registry.js';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

export async function chatCompletion(
    systemPrompt: string,
    messages: StoredMessage[],
    newUserMessage: string | null = null,
    toolOutput: { tool_call_id: string, content: string } | null = null
) {

    // Transform db messages to groq format
    const formattedMessages: any[] = [
        { role: 'system', content: systemPrompt }
    ];

    for (const msg of messages) {
        if (msg.role === 'assistant') {
            const formatted: any = {
                role: 'assistant',
                content: msg.content || '',  // Groq requiere content aunque sea vacío
            };
            if (msg.tool_calls) {
                try {
                    formatted.tool_calls = typeof msg.tool_calls === 'string'
                        ? JSON.parse(msg.tool_calls)
                        : msg.tool_calls;
                } catch (e) {
                    console.warn('[LLM] Error parseando tool_calls guardados:', e);
                }
            }
            formattedMessages.push(formatted);
        } else if (msg.role === 'tool') {
            formattedMessages.push({
                role: 'tool',
                tool_call_id: msg.tool_call_id || 'unknown',
                content: msg.content || '{}',
            });
        } else {
            // user / system
            formattedMessages.push({
                role: msg.role,
                content: msg.content || '',
            });
        }
    }

    // Si hay un mensaje nuevo del usuario
    if (newUserMessage !== null) {
        formattedMessages.push({ role: 'user', content: newUserMessage });
    }

    // Si hay un return de una tool
    if (toolOutput !== null) {
        formattedMessages.push({
            role: 'tool',
            tool_call_id: toolOutput.tool_call_id,
            content: toolOutput.content
        });
    }

    const tools = getAllToolDefinitions();

    console.log(`[LLM] Enviando ${formattedMessages.length} mensajes a Groq (${DEFAULT_MODEL}). Herramientas: ${tools.map(t => t.function.name).join(', ')}`);

    try {
        const response = await groq.chat.completions.create({
            messages: formattedMessages,
            model: DEFAULT_MODEL,
            tools: tools.length > 0 ? tools as any : undefined,
            tool_choice: 'auto',
        });

        return response.choices[0].message;
    } catch (error: any) {
        console.error('❌ Error en LLM calling con Groq:');
        console.error('  Status:', error?.status);
        console.error('  Message:', error?.message);
        if (error?.error) console.error('  Details:', JSON.stringify(error.error, null, 2));
        console.error('  Num messages enviados:', formattedMessages.length);
        throw error;
    }
}
