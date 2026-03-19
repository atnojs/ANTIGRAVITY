import { registerTool, ToolImplementation } from './registry.js';

export const getCurrentTimeTool: ToolImplementation = {
    definition: {
        type: 'function',
        function: {
            name: 'get_current_time',
            description: 'Obtiene la hora y fecha actual del sistema espacial/local. Úsalo de forma autónoma cuando necesites saber qué hora o día es para responder a la petición del usuario.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
    execute: () => {
        const now = new Date();
        return {
            time: now.toISOString(),
            locale_string: now.toLocaleString('es-ES'),
        };
    },
};

registerTool(getCurrentTimeTool);
