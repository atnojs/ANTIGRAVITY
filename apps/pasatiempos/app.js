/**
 * CENTRO DE PASATIEMPOS INTELIGENTES
 * Lógica principal de la aplicación
 */

// 1. INICIALIZACIÓN GLOBAL SEGURA
// Definimos window.app inmediatamente para evitar errores de referencia
window.app = window.app || {};

// 2. ESTADO DE LA APLICACIÓN
const state = {
    view: 'home', // home, detail, generated
    currentPuzzle: null,
    currentDifficulty: null,
    currentMode: null, // pdf, online
    generatedData: null,
    loading: false
};

// 3. DATOS DE LOS PASATIEMPOS
const PUZZLES = [
    {
        id: 'crucigrama',
        name: 'Crucigramas',
        description: 'El clásico juego de palabras cruzadas. Rellena las casillas blancas con letras formando palabras.',
        rules: [
            'Lee las definiciones para cada palabra.',
            'Escribe la palabra correspondiente en sentido horizontal o vertical.',
            'Todas las palabras se cruzan compartiendo letras.',
            'No dejes casillas vacías en la cuadrícula activa.'
        ],
        levels: {
            principiante: 'Cuadrícula pequeña (10x10), palabras comunes y definiciones directas.',
            avanzado: 'Cuadrícula media (15x15), vocabulario más amplio y definiciones con ingenio.',
            experto: 'Cuadrícula grande (20x20), palabras cultas, jerga específica y definiciones crípticas.'
        }
    },
    {
        id: 'sudoku',
        name: 'Sudokus',
        description: 'Completa la cuadrícula de 9x9 con números del 1 al 9 sin repetir en filas, columnas ni bloques.',
        rules: [
            'Cada fila debe contener los números del 1 al 9.',
            'Cada columna debe contener los números del 1 al 9.',
            'Cada subcuadrícula de 3x3 debe contener los números del 1 al 9.',
            'No se puede repetir ningún número en ninguna fila, columna o bloque.'
        ],
        levels: {
            principiante: 'Más de 35 números iniciales. Deducción simple.',
            avanzado: 'Entre 25 y 30 números iniciales. Requiere técnicas de escaneo.',
            experto: 'Menos de 24 números iniciales. Requiere estrategias complejas (X-Wing, Swordfish).'
        }
    },
    {
        id: 'sopa',
        name: 'Sopa de Letras',
        description: 'Encuentra las palabras escondidas entre una maraña de letras desordenadas.',
        rules: [
            'Busca las palabras listadas en la cuadrícula.',
            'Pueden estar en horizontal, vertical o diagonal.',
            'Pueden estar escritas al revés.',
            'Marca todas las palabras para ganar.'
        ],
        levels: {
            principiante: 'Cuadrícula 10x10, palabras solo horizontal y vertical.',
            avanzado: 'Cuadrícula 15x15, incluye diagonales.',
            experto: 'Cuadrícula 20x20, incluye palabras invertidas y superpuestas.'
        }
    },
    { 
        id: 'diferencias', 
        name: 'Buscar las Diferencias', 
        description: 'Encuentra las sutiles discrepancias entre dos imágenes aparentemente idénticas.', 
        rules: [
            'Observa ambas imágenes.', 
            'Toca o marca donde veas algo distinto.', 
            'Encuentra todas antes del tiempo límite (opcional).'
        ], 
        levels: { 
            principiante: '3 diferencias evidentes.', 
            avanzado: '5 diferencias sutiles.', 
            experto: '7 diferencias minúsculas.' 
        } 
    },
    { 
        id: 'kakuro', 
        name: 'Kakuro', 
        description: 'Una mezcla entre crucigrama y matemáticas. Suma números para completar las casillas.', 
        rules: [
            'Pon números del 1 al 9 en las casillas vacías.', 
            'La suma de cada bloque debe dar el número clave indicado.', 
            'No puedes repetir números dentro de una misma suma.'
        ], 
        levels: { 
            principiante: 'Tablero pequeño, sumas sencillas.', 
            avanzado: 'Tablero medio, combinaciones únicas.', 
            experto: 'Tablero gigante, requiere gran cálculo mental.' 
        } 
    },
    { 
        id: 'hitori', 
        name: 'Hitori', 
        description: 'Elimina números repetidos sombreando celdas hasta que no queden duplicados.', 
        rules: [
            'No puede haber números repetidos en filas o columnas (sin sombrear).', 
            'Las celdas sombreadas no pueden tocarse horizontal ni verticalmente.', 
            'Todas las celdas blancas deben estar conectadas.'
        ], 
        levels: { 
            principiante: 'Grid 5x5.', 
            avanzado: 'Grid 8x8.', 
            experto: 'Grid 12x12.' 
        } 
    },
    { id: 'nonograma', name: 'Nonogramas', description: 'Pinta las celdas de una cuadrícula basándote en los números laterales para revelar una imagen.', rules: ['Los números indican cuántos cuadros consecutivos rellenar.', 'Debe haber al menos un espacio en blanco entre grupos de cuadros.', 'Usa la lógica para deducir qué celdas pintar.'], levels: { principiante: '5x5 o 10x10, imagen simple.', avanzado: '15x15, imagen detallada.', experto: '20x20 o más, imagen compleja.' } },
    { id: 'kenken', name: 'KenKen', description: 'Puzzle aritmético lógico similar al Sudoku.', rules: ['Usa números del 1 al tamaño de la cuadrícula.', 'No repitas números en filas o columnas.', 'Los números en las jaulas deben producir el objetivo usando la operación dada.'], levels: { principiante: '4x4, solo sumas.', avanzado: '6x6, todas las operaciones.', experto: '9x9, aritmética compleja.' } },
    { id: 'hashi', name: 'Hashiwokakero', description: 'Conecta islas con puentes según el número indicado.', rules: ['Los puentes son líneas rectas horizontales o verticales.', 'El número en la isla indica cuántos puentes salen de ella.', 'Máximo 2 puentes entre dos islas.'], levels: { principiante: 'Pocas islas.', avanzado: 'Muchas islas, redes complejas.', experto: 'Mapa denso, lógica estricta.' } },
    { id: 'slitherlink', name: 'Slitherlink', description: 'Dibuja un único bucle cerrado conectando puntos.', rules: ['Conecta puntos adyacentes vertical u horizontalmente.', 'Los números indican cuántas líneas rodean esa celda.', 'El bucle no puede cruzarse ni ramificarse.'], levels: { principiante: 'Pistas abundantes.', avanzado: 'Pistas escasas.', experto: 'Deducción global requerida.' } },
    { id: 'tents', name: 'Tents & Trees', description: 'Coloca una tienda de campaña junto a cada árbol.', rules: ['Cada árbol tiene una tienda ortogonalmente adyacente.', 'Las tiendas no pueden tocarse (ni en diagonal).', 'Los números marginales indican cuántas tiendas hay en esa fila/columna.'], levels: { principiante: '8x8.', avanzado: '12x12.', experto: '16x16.' } },
    { id: 'futoshiki', name: 'Futoshiki', description: 'Sudoku con desigualdades (mayor que, menor que).', rules: ['Completa con números del 1 al N.', 'Respeta los signos de desigualdad entre celdas.', 'No repitas números en filas o columnas.'], levels: { principiante: '5x5.', avanzado: '7x7.', experto: '9x9.' } },
    { id: 'laberinto', name: 'Laberintos', description: 'Encuentra el camino desde la entrada hasta la salida.', rules: ['No atravieses paredes.', 'Encuentra la ruta continua.', 'Evita caminos sin salida.'], levels: { principiante: 'Caminos anchos, pocas bifurcaciones.', avanzado: 'Caminos estrechos, muchas trampas.', experto: 'Laberinto gigante o multicapa.' } },
    { id: 'dominograma', name: 'Dominogramas', description: 'Encuentra la ubicación de todas las fichas de dominó en la cuadrícula.', rules: ['Se usa un set completo de dominó.', 'Los límites entre fichas están ocultos.', 'Reconstruye la posición de cada ficha.'], levels: { principiante: 'Set doble-3.', avanzado: 'Set doble-6.', experto: 'Set doble-9.' } },
    { id: 'logica', name: 'Lógica Deductiva', description: 'Resuelve el misterio usando pistas (tipo problema de Einstein).', rules: ['Usa la tabla para descartar opciones imposibles.', 'Marca las relaciones confirmadas.', 'Deduce la única solución válida.'], levels: { principiante: '3 variables, 3 ítems.', avanzado: '4 variables, 5 ítems.', experto: '5 variables, 5 ítems.' } },
    { id: 'criptaritmo', name: 'Criptaritmos', description: 'Descifra la operación matemática donde las letras reemplazan números.', rules: ['Cada letra representa un dígito único (0-9).', 'Números de varios dígitos no empiezan por 0.', 'La operación aritmética debe ser correcta.'], levels: { principiante: 'Suma simple.', avanzado: 'Resta o multiplicación.', experto: 'División o palabras largas.' } },
    { id: 'imposible', name: 'Figuras Imposibles', description: 'Identifica errores visuales o de perspectiva en figuras geométricas.', rules: ['Analiza la geometría.', 'Señala dónde la perspectiva falla.', 'Explica por qué es imposible.'], levels: { principiante: 'Figuras básicas.', avanzado: 'Escenas complejas.', experto: 'Ilusiones ópticas sutiles.' } },
    { id: 'magico', name: 'Cuadrados Mágicos', description: 'Rellena la cuadrícula para que todas las filas, columnas y diagonales sumen lo mismo.', rules: ['Usa números distintos (generalmente consecutivos).', 'Todas las líneas deben sumar la constante mágica.', 'No repitas números.'], levels: { principiante: '3x3.', avanzado: '4x4.', experto: '5x5 o más.' } },
    { id: 'puntos', name: 'Conectar Puntos', description: 'Une los puntos numerados en orden para revelar el dibujo.', rules: ['Empieza en el 1.', 'Dibuja líneas rectas al siguiente número.', 'Cierra la figura al final.'], levels: { principiante: '30 puntos.', avanzado: '100 puntos.', experto: '300+ puntos.' } },
    { id: 'adivinanza', name: 'Adivinanzas Visuales', description: 'Adivina el objeto o concepto basado en una imagen abstracta o zoom.', rules: ['Observa los detalles.', 'Escribe la respuesta correcta.', 'Usa pistas si te atascas.'], levels: { principiante: 'Objetos cotidianos.', avanzado: 'Conceptos abstractos.', experto: 'Macro fotografía.' } },
    { id: 'serpiente', name: 'Serpientes Numéricas', description: 'Crea una serpiente de números consecutivos que llene el tablero.', rules: ['Conecta el 1 con el 2, el 2 con el 3, etc.', 'Horizontal, vertical o diagonal.', 'No cruces la línea.'], levels: { principiante: 'Grid pequeño.', avanzado: 'Grid medio con obstáculos.', experto: 'Grid grande.' } },
    { id: 'logigramas', name: 'Logigramas Matemáticos', description: 'Crucigramas donde las definiciones son operaciones matemáticas.', rules: ['Resuelve la operación.', 'Escribe el resultado (en letras o números según variante).', 'Cruza los resultados.'], levels: { principiante: 'Sumas y restas.', avanzado: 'Multiplicación.', experto: 'Álgebra básica.' } },
    { id: 'blanco', name: 'Crucigramas en Blanco', description: 'Ubica las casillas negras además de las palabras.', rules: ['Coloca el esquema de negras simétricamente (usualmente).', 'Encaja las palabras dadas.', 'No aísles zonas blancas.'], levels: { principiante: 'Pocas palabras.', avanzado: 'Grid denso.', experto: 'Sin pistas de simetría.' } },
    { id: 'flechas', name: 'Rutas de Flechas', description: 'Sigue la dirección de las flechas para recorrer el tablero.', rules: ['La flecha indica la única dirección posible.', 'Visita todas las casillas.', 'Termina en la meta.'], levels: { principiante: 'Ruta única.', avanzado: 'Cruces complejos.', experto: 'Flechas condicionales.' } },
];

// 4. LÓGICA DE LA APP

// Definimos la implementación de los métodos
const appImplementation = {
    // Navegación
    goHome: () => {
        state.view = 'home';
        state.currentPuzzle = null;
        state.currentDifficulty = null;
        state.generatedData = null;
        render();
    },

    selectPuzzle: (id) => {
        state.currentPuzzle = PUZZLES.find(p => p.id === id);
        state.view = 'detail';
        render();
    },

    selectDifficulty: (level) => {
        state.currentDifficulty = level;
        render(); // Re-render to update UI selection
        // Auto-scroll to mode selection if needed
        setTimeout(() => {
            const modeSection = document.getElementById('mode-selection');
            if (modeSection) modeSection.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    },

    selectMode: (mode) => {
        state.currentMode = mode;
        generatePuzzle();
    }
};

// Asignamos la implementación al objeto global window.app
Object.assign(window.app, appImplementation);

// Exponer funciones auxiliares globalmente para el HTML generado dinámicamente
// Usamos function declarations abajo para aprovechar el hoisting, 
// así que podemos asignarlas aquí incluso antes de su definición en el código.
window.resetOnlinePuzzle = resetOnlinePuzzle;
window.generatePuzzle = generatePuzzle;


// 5. FUNCIONES DE RENDERIZADO

// Función principal de renderizado
function render() {
    const appContainer = document.getElementById('app-content');
    if (!appContainer) return;
    
    appContainer.innerHTML = '';
    
    if (state.loading) {
        renderLoading(appContainer);
        return;
    }

    switch (state.view) {
        case 'home':
            renderHome(appContainer);
            break;
        case 'detail':
            renderDetail(appContainer);
            break;
        case 'generated':
            renderGenerated(appContainer);
            break;
        default:
            renderHome(appContainer);
    }
}

// Vista: Loading
function renderLoading(container) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full min-h-[60vh] fade-in">
            <div class="spinner mb-4"></div>
            <h2 class="text-xl font-semibold text-slate-700">Generando tu pasatiempo...</h2>
            <p class="text-slate-500 mt-2">Preparando el juego</p>
        </div>
    `;
}

// Vista: Home
function renderHome(container) {
    const hero = `
        <div class="bg-white border-b border-slate-200 py-12 px-4 sm:px-6 lg:px-8 mb-8 fade-in">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-3xl font-extrabold text-slate-900 sm:text-4xl mb-4">
                    Ejercita tu mente, imprime o juega online
                </h2>
                <p class="text-lg text-slate-600 mb-8">
                    Elige entre nuestra colección de pasatiempos generados por Inteligencia Artificial.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
                    <div class="flex items-start">
                        <div class="flex-shrink-0 bg-indigo-100 rounded-md p-2">
                            <span class="text-2xl">1️⃣</span>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-md font-medium text-slate-900">Elige un reto</h3>
                            <p class="text-sm text-slate-500">Más de 20 tipos disponibles.</p>
                        </div>
                    </div>
                    <div class="flex items-start">
                        <div class="flex-shrink-0 bg-indigo-100 rounded-md p-2">
                            <span class="text-2xl">2️⃣</span>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-md font-medium text-slate-900">Personaliza</h3>
                            <p class="text-sm text-slate-500">Nivel principiante a experto.</p>
                        </div>
                    </div>
                    <div class="flex items-start">
                        <div class="flex-shrink-0 bg-indigo-100 rounded-md p-2">
                            <span class="text-2xl">3️⃣</span>
                        </div>
                        <div class="ml-4">
                            <h3 class="text-md font-medium text-slate-900">Juega</h3>
                            <p class="text-sm text-slate-500">Imprime en PDF o resuelve aquí.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in';

    PUZZLES.forEach(puzzle => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-sm border border-slate-100 p-6 cursor-pointer card-hover flex flex-col justify-between h-full';
        card.onclick = () => window.app.selectPuzzle(puzzle.id);
        
        card.innerHTML = `
            <div>
                <h3 class="text-xl font-bold text-slate-800 mb-2">${puzzle.name}</h3>
                <p class="text-slate-600 text-sm line-clamp-3">${puzzle.description}</p>
            </div>
            <div class="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                <span class="text-indigo-600 text-sm font-medium hover:text-indigo-800 flex items-center gap-1">
                    Ver detalles 
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </span>
            </div>
        `;
        grid.appendChild(card);
    });

    container.innerHTML = hero;
    container.appendChild(grid);
}

// Vista: Detalle
function renderDetail(container) {
    const p = state.currentPuzzle;
    if (!p) return window.app.goHome();

    const wrapper = document.createElement('div');
    wrapper.className = 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in w-full';

    // Header del detalle
    const header = `
        <button onclick="window.app.goHome()" class="mb-6 flex items-center text-slate-500 hover:text-indigo-600 transition-colors">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Volver al menú
        </button>
        <div class="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6">
            <h1 class="text-3xl font-bold text-slate-900 mb-4">${p.name}</h1>
            <p class="text-lg text-slate-600 mb-6">${p.description}</p>
            
            <div class="bg-slate-50 rounded-xl p-6 mb-6">
                <h3 class="font-semibold text-slate-800 mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Reglas del juego
                </h3>
                <ul class="space-y-2">
                    ${p.rules.map(r => `<li class="flex items-start text-slate-600"><span class="mr-2 mt-1.5 h-1.5 w-1.5 bg-indigo-400 rounded-full flex-shrink-0"></span>${r}</li>`).join('')}
                </ul>
            </div>

            <div class="border-t border-slate-100 pt-6">
                <h3 class="font-semibold text-slate-800 mb-4">Selecciona la dificultad:</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${['principiante', 'avanzado', 'experto'].map(level => `
                        <button 
                            onclick="window.app.selectDifficulty('${level}')"
                            class="p-4 rounded-xl border-2 text-left transition-all ${state.currentDifficulty === level ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}"
                        >
                            <div class="font-bold capitalize ${state.currentDifficulty === level ? 'text-indigo-700' : 'text-slate-700'}">${level}</div>
                            <div class="text-xs mt-1 ${state.currentDifficulty === level ? 'text-indigo-600' : 'text-slate-500'}">${p.levels[level]}</div>
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    wrapper.innerHTML = header;

    // Sección de selección de modo (solo visible si hay dificultad seleccionada)
    if (state.currentDifficulty) {
        const modeSection = document.createElement('div');
        modeSection.id = 'mode-selection';
        modeSection.className = 'bg-white rounded-2xl shadow-sm p-6 md:p-8 fade-in';
        modeSection.innerHTML = `
            <h3 class="font-semibold text-slate-800 mb-4 text-center">¿Cómo quieres resolverlo?</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <button onclick="window.app.selectMode('pdf')" class="flex flex-col items-center justify-center p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-slate-50 transition-all group">
                    <div class="bg-indigo-100 p-3 rounded-full mb-3 group-hover:bg-indigo-200">
                        <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    </div>
                    <span class="font-bold text-slate-700">Imprimir (PDF)</span>
                    <span class="text-xs text-slate-500 mt-1">Descarga formato A4 limpio</span>
                </button>
                <button onclick="window.app.selectMode('online')" class="flex flex-col items-center justify-center p-6 border-2 border-slate-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all group">
                    <div class="bg-teal-100 p-3 rounded-full mb-3 group-hover:bg-teal-200">
                        <svg class="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    </div>
                    <span class="font-bold text-slate-700">Resolver Online</span>
                    <span class="text-xs text-slate-500 mt-1">Interactivo en el navegador</span>
                </button>
            </div>
        `;
        wrapper.appendChild(modeSection);
    }

    container.appendChild(wrapper);
}

// Vista: Generado (Integración Real con Backend)
async function generatePuzzle() {
    console.log('=== INICIANDO GENERACIÓN ===');
    console.log('Puzzle:', state.currentPuzzle?.id);
    console.log('Dificultad:', state.currentDifficulty);
    
    state.loading = true;
    state.error = null;
    render();

    const { currentPuzzle, currentDifficulty, currentMode } = state;

    try {
        // PRIMERO: Generar datos locales inmediatamente
        console.log('Generando puzzle local...');
        console.log('Tipo:', currentPuzzle.id);
        
        const mockData = generateMockData(currentPuzzle.id, currentDifficulty);
        console.log('Datos locales generados:', mockData ? 'OK' : 'ERROR');
        
        state.generatedData = mockData;
        state.view = 'generated';
        state.loading = false;
        render();
        
        console.log('Renderizado completado con datos locales');
        
        // DESPUÉS: Intentar obtener mejores datos de la API (opcional)
        // Esto corre en paralelo sin bloquear la interfaz
        fetchFromAPI(currentPuzzle.id, currentDifficulty).then(apiData => {
            if (apiData && isValidPuzzleData(currentPuzzle.id, apiData)) {
                console.log('Datos de API recibidos, actualizando...');
                state.generatedData = apiData;
                render();
            }
        }).catch(err => {
            console.log('API no disponible, usando datos locales');
        });
        
    } catch (error) {
        console.error('Error crítico:', error);
        // Fallback de emergencia
        state.generatedData = { message: "Error al generar el puzzle. Intenta recargar la página." };
        state.view = 'generated';
        state.loading = false;
        render();
    }
}

// Función separada para llamar a la API (no bloqueante)
async function fetchFromAPI(puzzleType, difficulty) {
    const prompt = buildPrompt(puzzleType, difficulty);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos máximo
    
    try {
        const response = await fetch('proxy.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        return data;
    } catch (error) {
        console.log('Error en fetchFromAPI:', error.message);
        return null;
    }
}

// Validar datos del puzzle según el tipo
function isValidPuzzleData(type, data) {
    if (!data || typeof data !== 'object') return false;
    
    switch(type) {
        case 'sudoku':
            return Array.isArray(data.grid) && data.grid.length === 9;
        case 'crucigrama':
            return Array.isArray(data.grid) && data.clues && (data.clues.across || data.clues.down);
        case 'sopa':
            return Array.isArray(data.grid) && Array.isArray(data.words);
        default:
            return true;
    }
}

// Nueva función: Construir prompts específicos por tipo
function buildPrompt(puzzleType, difficulty) {
    const prompts = {
        sudoku: `Genera un Sudoku ${difficulty}. 
Grid 9x9 con algunos números prellenados.
Dificultad: ${difficulty === 'principiante' ? '35+ números visibles' : difficulty === 'avanzado' ? '25-30 números visibles' : 'menos de 24 números'}
Responde SOLO en JSON: {"grid": [[...9 arrays de 9 números o null...]], "solution": [[...solución completa...]]}`,

        crucigrama: `Genera un crucigrama ${difficulty} simple en español.
Tamaño: 8x8. 5 palabras: 3 horizontales y 2 verticales.
Palabras comunes: PERRO, GATO, LUNA, SOL, CASA.
Pistas cortas tipo: "1. Animal que ladra"
Responde en JSON: {"grid":[[...]], "clues":{"across":[{"number":1,"clue":"...","row":0,"col":0}], "down":[]}}`,

        sopa: `Sopa de letras ${difficulty}.
Grid 10x10 con 6 palabras: PERRO, GATO, CASA, LUNA, SOL, MAR.
Palabras solo horizontal y vertical.
Responde JSON: {"grid":[[...]], "words":[{"word":"PERRO","positions":[[0,0],[0,1],[0,2],[0,3],[0,4]]}]}`,

        diferencias: `Juego de diferencias ${difficulty}.
3 diferencias simples entre dos imágenes de un parque.
Responde JSON: {"differences":[{"id":1,"description":"Árbol diferente"}]}`,

        kakuro: `Kakuro simple 5x5.
Celdas negras con sumas, blancas para números 1-9.
Responde JSON: {"grid":[[{"type":"black","sum":10},{"type":"white"}]], "solution":[[1,2]]}`,

        hitori: `Hitori 5x5 simple.
Números 1-5 en grid. Marcar celdas para eliminar duplicados.
Responde JSON: {"grid":[[1,2,3,4,5]], "solution":[[true,false]]}`,

        nonograma: `Nonograma 5x5 simple.
Pistas indican celdas a pintar. Forma: corazón.
Responde JSON: {"rows":[[5],[3]], "cols":[[2],[4]], "solution":[[1,1]]}`,

        kenken: `KenKen 4x4 simple.
Grid con jaulas y operaciones +,-,×,÷.
Responde JSON: {"size":4, "cages":[{"cells":[[0,0],[0,1]],"operation":"+","target":6}]}`,

        laberinto: `Laberinto 10x10 simple.
Desde esquina superior izquierda a inferior derecha.
Responde JSON: {"grid":[[0,0,1]], "solution":[[0,0],[0,1]]}`,

        logica: `Problema lógico simple.
3 personas, 3 mascotas. Pistas para deducir quién tiene qué.
Responde JSON: {"variables":[{"name":"Persona","options":["Ana","Luis"]}], "clues":["..."]}`,

        criptaritmo: `Criptaritmo: DOS + DOS = CUATRO.
Letras representan dígitos únicos.
Responde JSON: {"operation":"DOS+DOS=CUATRO", "letters":["D","O","S","C","U","A","T","R"]}`,

        magico: `Cuadrado mágico 3x3.
Filas, columnas y diagonales suman 15.
Responde JSON: {"size":3, "grid":[[8,null,6]], "magicConstant":15}`,

        puntos: `Conectar 20 puntos.
Forma: un gato simple.
Responde JSON: {"points":[[10,10],[20,20]], "pointCount":20, "shape":"gato"}`,

        futoshiki: `Genera un Futoshiki ${difficulty}.
Grid: ${difficulty === 'principiante' ? '5x5' : difficulty === 'avanzado' ? '7x7' : '9x9'}
Algunas celdas prellenadas, desigualdades entre celdas (>, <).
Responde SOLO en JSON: {"size": 5/7/9, "grid": [[5, null, ...]], "constraints": [{"from": [0,0], "to": [0,1], "type": ">"}], "solution": [[...]]}`,

        hashi: `Genera un Hashiwokakero ${difficulty}.
Islas con números que indican cuántos puentes conectar.
${difficulty === 'principiante' ? 'Pocas islas' : difficulty === 'avanzado' ? 'Islas moderadas' : 'Muchas islas, red compleja'}
Responde SOLO en JSON: {"islands": [{"x": 0, "y": 0, "value": 3}, ...], "bridges": [{"from": [0,0], "to": [2,0], "count": 2}], "size": [ancho, alto]}`,

        default: `Genera un puzzle tipo ${puzzleType} de dificultad ${difficulty}.
Incluye el tablero/juego y su solución.
Responde SOLO en JSON con la estructura apropiada para este tipo de puzzle.`
    };

    return prompts[puzzleType] || prompts.default;
}

function renderGenerated(container) {
    const { currentPuzzle, currentMode, generatedData, currentDifficulty } = state;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'w-full max-w-5xl mx-auto px-4 py-8 fade-in';

    // Barra de controles superior
    const toolbar = `
        <div class="flex flex-col sm:flex-row justify-between items-center mb-6 no-print gap-4">
            <div class="flex items-center gap-4">
                <button onclick="window.app.goHome()" class="text-slate-500 hover:text-slate-700 font-medium text-sm flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    Inicio
                </button>
                <div class="h-4 w-px bg-slate-300"></div>
                <h2 class="text-lg font-bold text-slate-800">${currentPuzzle.name} <span class="text-slate-400 font-normal text-sm">(${currentDifficulty})</span></h2>
                ${state.error ? `<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded" title="${state.error}">⚡ Modo offline</span>` : ''}
            </div>
            <div class="flex gap-3">
                <button onclick="generatePuzzle()" class="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                    Generar otro
                </button>
                ${currentMode === 'pdf' 
                    ? `<button onclick="window.print()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        Descargar / Imprimir
                       </button>`
                    : `<button onclick="resetOnlinePuzzle()" class="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm">
                        Reiniciar
                       </button>`
                }
            </div>
        </div>
    `;

    // Contenido del Puzzle
    let puzzleContent = '';

    if (currentMode === 'pdf') {
        // VISTA PARA IMPRIMIR
        puzzleContent = `
            <div class="bg-white p-8 sm:p-12 shadow-sm border border-slate-200 mx-auto print:shadow-none print:border-none print:w-full print:p-0" style="max-width: 210mm; min-height: 297mm;">
                <div class="text-center mb-8 border-b-2 border-slate-800 pb-4">
                    <h1 class="text-3xl font-bold uppercase tracking-widest text-slate-900">${currentPuzzle.name}</h1>
                    <p class="text-slate-500 mt-2">Dificultad: ${currentDifficulty.toUpperCase()} | Fecha: ${new Date().toLocaleDateString()}</p>
                </div>
                
                <div class="mb-8">
                    <h3 class="font-bold text-slate-800 mb-2">Instrucciones:</h3>
                    <ul class="list-disc pl-5 space-y-1 text-sm text-slate-700">
                        ${currentPuzzle.rules.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>

                <!-- Representación visual del puzzle para imprimir -->
                <div class="flex justify-center mb-12">
                    ${renderPuzzleVisual(currentPuzzle.id, generatedData, true)}
                </div>

                <!-- Footer de impresión -->
                <div class="mt-auto pt-8 text-center text-xs text-slate-400 border-t border-slate-100">
                    Generado por Centro de Pasatiempos Inteligentes con IA
                </div>
            </div>
        `;
    } else {
        // VISTA ONLINE INTERACTIVA
        puzzleContent = `
            <div class="flex flex-col lg:flex-row gap-8 items-start">
                <div class="flex-grow bg-white p-6 rounded-xl shadow-sm border border-slate-200 w-full">
                    <div class="flex justify-center">
                        ${renderPuzzleVisual(currentPuzzle.id, generatedData, false)}
                    </div>
                </div>
                <div class="w-full lg:w-80 flex-shrink-0 space-y-6">
                    <div class="bg-indigo-50 p-5 rounded-xl border border-indigo-100">
                        <h3 class="font-bold text-indigo-900 mb-3">Reglas rápidas</h3>
                        <ul class="text-sm text-indigo-800 space-y-2 list-disc pl-4">
                             ${currentPuzzle.rules.slice(0,3).map(r => `<li>${r}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 class="font-bold text-slate-800 mb-3">Controles</h3>
                        <p class="text-sm text-slate-600">
                            Usa el ratón o teclado para navegar. <br>
                            Click en una celda para editar.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    wrapper.innerHTML = toolbar + puzzleContent;
    container.appendChild(wrapper);
}

// 6. GENERADORES DE DATOS FALSOS (MOCK)


// 7. RENDERIZADORES DE PUZZLES ESPECÍFICOS

function renderPuzzleVisual(type, data, isPrint) {
    switch(type) {
        case 'sudoku':
            return renderSudokuGrid(data);
        case 'crucigrama':
            return renderCrosswordGrid(data);
        case 'sopa':
            return renderWordSearch(data, isPrint);
        case 'diferencias':
            return renderSpotDifferences(data, isPrint);
        case 'kakuro':
            return renderKakuro(data, isPrint);
        case 'hitori':
            return renderHitori(data, isPrint);
        case 'nonograma':
            return renderNonogram(data, isPrint);
        case 'kenken':
            return renderKenKen(data, isPrint);
        case 'laberinto':
            return renderMaze(data, isPrint);
        case 'logica':
            return renderLogicPuzzle(data, isPrint);
        case 'criptaritmo':
            return renderCryptarithm(data, isPrint);
        case 'magico':
            return renderMagicSquare(data, isPrint);
        case 'puntos':
            return renderConnectDots(data, isPrint);
        case 'futoshiki':
            return renderFutoshiki(data, isPrint);
        case 'hashi':
            return renderHashi(data, isPrint);
        case 'slitherlink':
            return renderSlitherlink(data, isPrint);
        case 'tents':
            return renderTents(data, isPrint);
        case 'dominograma':
        case 'logigramas':
        case 'blanco':
        case 'flechas':
        case 'serpiente':
        case 'adivinanza':
        case 'imposible':
        default:
            return renderGenericGrid(type, data, isPrint);
    }
}

function renderSudokuGrid(cells) {
    let gridHtml = '<div class="grid-sudoku bg-white shadow-lg">';
    cells.forEach((val, i) => {
        const isGiven = val !== '';
        gridHtml += `
            <div class="cell-sudoku ${isGiven ? 'bg-slate-50 text-slate-900 font-bold' : 'bg-white text-indigo-600'}" 
                 ${!isGiven ? 'contenteditable="true"' : ''} 
                 data-index="${i}">
                ${val}
            </div>
        `;
    });
    gridHtml += '</div>';
    return gridHtml;
}

function renderCrosswordGrid(data) {
    // Si no hay datos válidos, generar un crucigrama automáticamente
    if (!data || !data.grid || !data.clues) {
        data = generateCrosswordPuzzle();
    }
    
    const { grid, clues, size } = data;
    const cellSize = size > 12 ? 28 : 32;
    
    let html = `
        <div class="flex flex-col lg:flex-row gap-8 items-start">
            <!-- Grid del crucigrama -->
            <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <h4 class="text-center font-bold text-slate-800 mb-4 text-lg">Crucigrama</h4>
                <div class="grid gap-px bg-slate-800 p-px mx-auto" 
                     style="grid-template-columns: repeat(${size}, ${cellSize}px); width: fit-content;">
    `;
    
    // Renderizar celdas del grid
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = grid[row][col];
            const isBlack = cell === '#' || cell === null || cell === '';
            const number = getCrosswordCellNumber(row, col, clues);
            
            html += `
                <div class="${isBlack ? 'bg-slate-800' : 'bg-white'} relative flex items-center justify-center crossword-cell"
                     style="width: ${cellSize}px; height: ${cellSize}px;"
                     data-row="${row}" data-col="${col}">
                    ${!isBlack ? `
                        ${number ? `<span class="absolute top-0.5 left-0.5 text-[8px] font-bold text-slate-500 leading-none">${number}</span>` : ''}
                        <div contenteditable="true" 
                             class="w-full h-full flex items-center justify-center outline-none uppercase font-bold text-slate-800 text-center crossword-input"
                             style="font-size: ${cellSize > 28 ? '0.9rem' : '1rem'};"
                             data-row="${row}" data-col="${col}"
                             oninput="validateCrosswordInput(this)"
                             onkeydown="handleCrosswordKeydown(event, this)"></div>
                    ` : ''}
                </div>
            `;
        }
    }
    
    html += `
                </div>
            </div>
            
            <!-- Panel de definiciones -->
            <div class="flex-1 bg-white p-6 rounded-lg border border-slate-200 shadow-sm w-full lg:w-96">
                <h4 class="font-bold text-slate-800 mb-4 text-lg flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                    Definiciones
                </h4>
                
                <!-- Horizontales -->
                <div class="mb-6">
                    <h5 class="font-semibold text-slate-700 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">HORIZONTAL</span>
                    </h5>
                    <ul class="space-y-2 text-sm">
                        ${clues.across.map(clue => `
                            <li class="flex gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors crossword-clue" 
                                data-number="${clue.number}" data-direction="across"
                                onclick="focusCrosswordCell(${clue.number}, 'across')">
                                <span class="font-bold text-indigo-600 min-w-[24px]">${clue.number}.</span>
                                <span class="text-slate-700">${clue.clue}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <!-- Verticales -->
                <div>
                    <h5 class="font-semibold text-slate-700 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                        <span class="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-xs font-bold">VERTICAL</span>
                    </h5>
                    <ul class="space-y-2 text-sm">
                        ${clues.down.map(clue => `
                            <li class="flex gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors crossword-clue" 
                                data-number="${clue.number}" data-direction="down"
                                onclick="focusCrosswordCell(${clue.number}, 'down')">
                                <span class="font-bold text-teal-600 min-w-[24px]">${clue.number}.</span>
                                <span class="text-slate-700">${clue.clue}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div class="mt-6 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                    💡 Haz clic en una definición para ir a la celda correspondiente
                </div>
            </div>
        </div>
        
        <!-- Botón verificar -->
        <div class="mt-6 text-center">
            <button onclick="checkCrosswordSolution()" 
                    class="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 mx-auto">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Verificar solución
            </button>
        </div>
    `;
    
    return html;
}

// Función auxiliar para obtener el número de celda
function getCrosswordCellNumber(row, col, clues) {
    // Buscar si esta celda es el inicio de alguna palabra
    const acrossClue = clues.across.find(c => c.row === row && c.col === col);
    const downClue = clues.down.find(c => c.row === row && c.col === col);
    
    return acrossClue?.number || downClue?.number || null;
}

// Generar crucigrama automático
function generateCrosswordPuzzle() {
    // Ejemplo de crucigrama 10x10
    const size = 10;
    
    // Definir palabras y sus posiciones
    const words = [
        // Horizontales
        { word: 'LLAVE', row: 0, col: 0, number: 1, direction: 'across', clue: 'Se necesita para abrir una puerta' },
        { word: 'TINTA', row: 2, col: 2, number: 3, direction: 'across', clue: 'Líquido de la impresora' },
        { word: 'LUNA', row: 4, col: 0, number: 5, direction: 'across', clue: 'Astro que brilla por la noche' },
        { word: 'CUCHARA', row: 6, col: 2, number: 7, direction: 'across', clue: 'Utensilio para comer sopa' },
        { word: 'LIBRO', row: 8, col: 0, number: 9, direction: 'across', clue: 'Tiene páginas y se lee' },
        
        // Verticales
        { word: 'LAPICERO', row: 0, col: 0, number: 1, direction: 'down', clue: 'Instrumento para escribir' },
        { word: 'Tenedor', row: 0, col: 4, number: 2, direction: 'down', clue: 'Utensilio para comer carne' },
        { word: 'NUBE', row: 2, col: 2, number: 3, direction: 'down', clue: 'Flota en el cielo y trae lluvia' },
        { word: 'RELOJ', row: 0, col: 6, number: 4, direction: 'down', clue: 'Indica la hora' },
        { word: 'CASA', row: 4, col: 0, number: 5, direction: 'down', clue: 'Lugar donde vivimos' },
        { word: 'MANO', row: 4, col: 6, number: 6, direction: 'down', clue: 'Tiene cinco dedos' },
        { word: 'ARbol', row: 6, col: 3, number: 8, direction: 'down', clue: 'Tiene hojas y da sombra' }
    ];
    
    // Crear grid vacío (null = celda negra)
    let grid = Array(size).fill(null).map(() => Array(size).fill(null));
    
    // Colocar palabras en el grid
    words.forEach(w => {
        for (let i = 0; i < w.word.length; i++) {
            const row = w.direction === 'across' ? w.row : w.row + i;
            const col = w.direction === 'down' ? w.col : w.col + i;
            grid[row][col] = w.word[i];
        }
    });
    
    // Convertir null a '#' para el renderizado
    grid = grid.map(row => row.map(cell => cell === null ? '#' : cell));
    
    // Organizar pistas
    const clues = {
        across: words.filter(w => w.direction === 'across').map(w => ({
            number: w.number,
            clue: w.clue,
            answer: w.word,
            row: w.row,
            col: w.col,
            length: w.word.length
        })),
        down: words.filter(w => w.direction === 'down').map(w => ({
            number: w.number,
            clue: w.clue,
            answer: w.word,
            row: w.row,
            col: w.col,
            length: w.word.length
        }))
    };
    
    return { grid, clues, size, words };
}

// Validar input del crucigrama
function validateCrosswordInput(element) {
    const text = element.innerText.toUpperCase();
    // Solo permitir una letra
    if (text.length > 1) {
        element.innerText = text[0];
    }
    // Mover al siguiente input
    const row = parseInt(element.dataset.row);
    const col = parseInt(element.dataset.col);
    moveToNextCell(row, col);
}

// Manejar teclas especiales
function handleCrosswordKeydown(event, element) {
    const row = parseInt(element.dataset.row);
    const col = parseInt(element.dataset.col);
    
    switch(event.key) {
        case 'ArrowRight':
            event.preventDefault();
            focusCell(row, col + 1);
            break;
        case 'ArrowLeft':
            event.preventDefault();
            focusCell(row, col - 1);
            break;
        case 'ArrowDown':
            event.preventDefault();
            focusCell(row + 1, col);
            break;
        case 'ArrowUp':
            event.preventDefault();
            focusCell(row - 1, col);
            break;
        case 'Backspace':
            if (element.innerText === '') {
                event.preventDefault();
                moveToPrevCell(row, col);
            }
            break;
    }
}

// Mover al siguiente input
function moveToNextCell(row, col) {
    // Intentar mover a la derecha
    let nextInput = document.querySelector(`[contenteditable="true"][data-row="${row}"][data-col="${col + 1}"]`);
    if (nextInput) {
        nextInput.focus();
    }
}

// Mover al input anterior
function moveToPrevCell(row, col) {
    let prevInput = document.querySelector(`[contenteditable="true"][data-row="${row}"][data-col="${col - 1}"]`);
    if (prevInput) {
        prevInput.focus();
    }
}

// Enfocar celda específica
function focusCell(row, col) {
    const input = document.querySelector(`[contenteditable="true"][data-row="${row}"][data-col="${col}"]`);
    if (input) {
        input.focus();
    }
}

// Enfocar celda por número de pista
function focusCrosswordCell(number, direction) {
    // Encontrar la celda inicial de la pista
    const clue = document.querySelector(`.crossword-clue[data-number="${number}"][data-direction="${direction}"]`);
    if (clue) {
        // Resaltar pista seleccionada
        document.querySelectorAll('.crossword-clue').forEach(c => c.classList.remove('bg-indigo-50', 'border-l-4', 'border-indigo-500'));
        clue.classList.add('bg-indigo-50', 'border-l-4', 'border-indigo-500');
        
        // Encontrar y enfocar primera celda
        const inputs = document.querySelectorAll('.crossword-input');
        for (let input of inputs) {
            const cellNum = input.parentElement.querySelector('span')?.innerText;
            if (cellNum == number) {
                input.focus();
                break;
            }
        }
    }
}

// Verificar solución del crucigrama
function checkCrosswordSolution() {
    const crosswordData = generateCrosswordPuzzle();
    let correct = 0;
    let total = 0;
    
    crosswordData.words.forEach(word => {
        let wordCorrect = true;
        for (let i = 0; i < word.word.length; i++) {
            const row = word.direction === 'across' ? word.row : word.row + i;
            const col = word.direction === 'down' ? word.col : word.col + i;
            
            const input = document.querySelector(`.crossword-input[data-row="${row}"][data-col="${col}"]`);
            if (input) {
                const userAnswer = input.innerText.toUpperCase();
                const correctAnswer = word.word[i].toUpperCase();
                
                if (userAnswer === correctAnswer) {
                    input.parentElement.classList.add('bg-green-100');
                    input.parentElement.classList.remove('bg-red-100');
                } else {
                    input.parentElement.classList.add('bg-red-100');
                    input.parentElement.classList.remove('bg-green-100');
                    wordCorrect = false;
                }
                total++;
                if (userAnswer === correctAnswer) correct++;
            }
        }
    });
    
    // Mostrar resultado
    const percentage = Math.round((correct / total) * 100);
    
    if (percentage === 100) {
        showCrosswordVictoryModal();
    } else {
        alert(`Has completado el ${percentage}% del crucigrama. ¡Sigue intentando!`);
    }
}

// Modal de victoria para crucigrama
function showCrosswordVictoryModal() {
    if (document.getElementById('crossword-victory-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'crossword-victory-modal';
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 fade-in';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center transform scale-100">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-3xl font-bold text-slate-800 mb-2">¡Excelente!</h2>
            <p class="text-slate-600 mb-6">Has completado correctamente todo el crucigrama.</p>
            
            <div class="flex flex-col sm:flex-row gap-3">
                <button onclick="generatePuzzle()" class="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Generar otro
                </button>
                <button onclick="window.app.goHome()" class="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    Volver al inicio
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function resetOnlinePuzzle() {
    const inputs = document.querySelectorAll('[contenteditable="true"]');
    inputs.forEach(el => el.innerText = '');
    
    // Resetear estilos de celdas interactivas
    document.querySelectorAll('.hitori-cell').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = '';
    });
    
    document.querySelectorAll('.nonogram-cell').forEach(el => {
        el.style.backgroundColor = '';
        el.dataset.state = '0';
        el.innerHTML = '';
    });
    
    document.querySelectorAll('.word-to-find').forEach(el => {
        el.classList.remove('line-through', 'opacity-50');
    });
    
    // Resetear checkboxes de diferencias
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
        el.checked = false;
    });
}

// ============================================
// FUNCIONES INTERACTIVAS DE PUZZLES
// ============================================

function toggleHitoriCell(element) {
    const isShaded = element.style.backgroundColor === 'rgb(30, 41, 59)';
    if (isShaded) {
        element.style.backgroundColor = '';
        element.style.color = '';
    } else {
        element.style.backgroundColor = '#1e293b';
        element.style.color = '#1e293b';
    }
}

function toggleNonogramCell(element) {
    const state = parseInt(element.dataset.state) || 0;
    const newState = (state + 1) % 3;
    
    element.dataset.state = newState;
    
    switch(newState) {
        case 0:
            element.style.backgroundColor = 'white';
            element.innerHTML = '';
            break;
        case 1:
            element.style.backgroundColor = '#1e293b';
            element.innerHTML = '';
            break;
        case 2:
            element.style.backgroundColor = 'white';
            element.innerHTML = '✕';
            element.style.color = '#94a3b8';
            break;
    }
}

function toggleWordSearchCell(element) {
    const isSelected = element.classList.contains('bg-indigo-600');
    
    if (isSelected) {
        element.classList.remove('bg-indigo-600', 'text-white');
        element.classList.add('hover:bg-indigo-100');
    } else {
        element.classList.add('bg-indigo-600', 'text-white');
        element.classList.remove('hover:bg-indigo-100');
    }
    
    // Verificar si se completó alguna palabra
    checkWordSearchCompletion();
}

function checkWordSearchCompletion() {
    const wordData = document.getElementById('wordsearch-data');
    if (!wordData) return;
    
    const words = JSON.parse(wordData.dataset.words || '[]');
    const selectedCells = document.querySelectorAll('.wordsearch-cell.bg-indigo-600');
    const selectedPositions = Array.from(selectedCells).map(cell => {
        return [parseInt(cell.dataset.row), parseInt(cell.dataset.col)];
    });
    
    let foundWords = 0;
    
    words.forEach(word => {
        const wordPositions = word.positions;
        const isComplete = wordPositions.every(pos => 
            selectedPositions.some(sel => sel[0] === pos[0] && sel[1] === pos[1])
        );
        
        // Actualizar visual de la palabra en la lista
        const wordElement = document.querySelector(`.word-to-find[data-word="${word.word}"]`);
        if (wordElement) {
            if (isComplete) {
                wordElement.classList.add('bg-green-100', 'text-green-800', 'line-through');
                wordElement.classList.remove('bg-indigo-100', 'text-indigo-800');
            } else {
                wordElement.classList.remove('bg-green-100', 'text-green-800', 'line-through');
                wordElement.classList.add('bg-indigo-100', 'text-indigo-800');
            }
        }
        
        if (isComplete) foundWords++;
    });
    
    // Verificar si se encontraron todas las palabras
    if (foundWords === words.length && words.length > 0) {
        showVictoryModal();
    }
}

function showVictoryModal() {
    // Evitar múltiples modales
    if (document.getElementById('victory-modal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'victory-modal';
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 fade-in';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center transform scale-100">
            <div class="text-6xl mb-4">🎉</div>
            <h2 class="text-3xl font-bold text-slate-800 mb-2">¡Felicitaciones!</h2>
            <p class="text-slate-600 mb-6">Has encontrado todas las palabras de la sopa de letras.</p>
            
            <div class="flex flex-col sm:flex-row gap-3">
                <button onclick="generatePuzzle()" class="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Generar otro
                </button>
                <button onclick="window.app.goHome()" class="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    Volver al inicio
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function toggleTent(element) {
    const content = element.textContent.trim();
    if (content === '⛺') {
        element.textContent = '';
        element.classList.remove('bg-orange-100');
    } else {
        element.textContent = '⛺';
        element.classList.add('bg-orange-100');
    }
}

// ============================================
// NUEVOS RENDERIZADORES DE PUZZLES
// ============================================

function renderWordSearch(data, isPrint) {
    // Si no hay datos válidos, generar una sopa de letras automáticamente según la dificultad
    if (!data || !data.grid || data.grid.length === 0) {
        data = generateWordSearchPuzzle(state.currentDifficulty);
    }
    
    const grid = data.grid;
    const words = data.words || [];
    const size = grid.length;
    
    // Ajustar tamaño de celda según el tamaño del grid
    const cellSize = size > 15 ? 28 : (size > 10 ? 32 : 38);
    const title = state.currentDifficulty ? state.currentDifficulty.charAt(0).toUpperCase() + state.currentDifficulty.slice(1) : 'Sopa de Letras';
    
    let html = `
        <div class="flex flex-col items-center gap-6">
            <div class="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <h4 class="text-center font-bold text-slate-800 mb-2 text-lg">Sopa de Letras - ${title}</h4>
                <p class="text-center text-slate-500 text-sm mb-4">Grid ${size}x${size}</p>
                <div class="grid gap-0.5 bg-slate-800 p-0.5 mx-auto" 
                     style="grid-template-columns: repeat(${size}, ${cellSize}px); width: fit-content;">
    `;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const letter = grid[row][col] || generateRandomLetter();
            html += `
                <div class="bg-white flex items-center justify-center font-bold text-base uppercase select-none cursor-pointer hover:bg-indigo-100 transition-colors wordsearch-cell border border-slate-200"
                     style="width: ${cellSize}px; height: ${cellSize}px; font-size: ${cellSize > 30 ? '1rem' : '0.875rem'};"
                     data-row="${row}" data-col="${col}"
                     onclick="toggleWordSearchCell(this)">
                    ${letter}
                </div>
            `;
        }
    }
    
    html += `</div></div>`;
    
    // Guardar datos de palabras para verificación
    html += `<div id="wordsearch-data" data-words='${JSON.stringify(words)}' class="hidden"></div>`;
    
    // Mostrar lista de palabras SIEMPRE
    html += `
        <div class="bg-white p-6 rounded-lg border border-slate-200 shadow-sm w-full max-w-lg">
            <h4 class="font-bold text-slate-800 mb-3 text-lg flex items-center gap-2">
                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                Palabras a encontrar (${words.length}):
            </h4>
            <div class="flex flex-wrap gap-2 justify-center" id="words-list">
                ${words.map(w => `<span class="px-3 py-2 bg-indigo-100 text-indigo-800 rounded-lg text-sm font-semibold word-to-find border border-indigo-200 hover:bg-indigo-200 transition-colors cursor-pointer" data-word="${w.word}">${w.word}</span>`).join('')}
            </div>
            <p class="text-sm text-slate-500 mt-4 text-center bg-slate-50 p-2 rounded">
                💡 Haz clic en las letras del grid para marcarlas
            </p>
        </div>
    `;
    
    html += `</div>`;
    return html;
}

// Función auxiliar para generar una sopa de letras
function generateWordSearchPuzzle(difficulty) {
    // Configurar tamaño y opciones según la dificultad
    let size, directions, allowReverse, numWords;
    
    switch(difficulty) {
        case 'principiante':
            size = 10;
            directions = ['horizontal', 'vertical'];
            allowReverse = false;
            numWords = 6;
            break;
        case 'avanzado':
            size = 15;
            directions = ['horizontal', 'vertical', 'diagonal'];
            allowReverse = false;
            numWords = 8;
            break;
        case 'experto':
            size = 20;
            directions = ['horizontal', 'vertical', 'diagonal'];
            allowReverse = true;
            numWords = 10;
            break;
        default:
            size = 10;
            directions = ['horizontal', 'vertical'];
            allowReverse = false;
            numWords = 6;
    }
    
    const palabras = [
        'CASA', 'PERRO', 'GATO', 'SOL', 'LUNA', 'MAR', 'RIO', 'ARBOL',
        'FLOR', 'NUBE', 'LIBRO', 'MESA', 'SILLA', 'PUERTA', 'VENTANA',
        'CIELO', 'TIERRA', 'AGUA', 'FUEGO', 'MANO', 'PIE', 'CARA',
        'DIA', 'NOCHE', 'ESTRELLA', 'LAPIZ', 'PAPEL', 'PIEDRA'
    ];
    
    // Seleccionar palabras aleatorias según la dificultad
    const wordsToUse = palabras.sort(() => 0.5 - Math.random()).slice(0, numWords);
    
    // Crear grid vacío
    let grid = Array(size).fill(null).map(() => Array(size).fill(''));
    
    // Colocar palabras en el grid
    const placedWords = [];
    
    for (let word of wordsToUse) {
        let placed = false;
        let attempts = 0;
        
        while (!placed && attempts < 100) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const reverse = allowReverse && Math.random() > 0.6; // 40% probabilidad de palabra al revés solo en experto
            const wordToPlace = reverse ? word.split('').reverse().join('') : word;
            
            let row, col;
            let rowStep = 0, colStep = 0;
            
            // Configurar dirección
            switch(direction) {
                case 'horizontal':
                    rowStep = 0; colStep = 1;
                    row = Math.floor(Math.random() * size);
                    col = Math.floor(Math.random() * (size - word.length));
                    break;
                case 'vertical':
                    rowStep = 1; colStep = 0;
                    row = Math.floor(Math.random() * (size - word.length));
                    col = Math.floor(Math.random() * size);
                    break;
                case 'diagonal':
                    rowStep = 1; colStep = 1;
                    row = Math.floor(Math.random() * (size - word.length));
                    col = Math.floor(Math.random() * (size - word.length));
                    break;
            }
            
            // Verificar si cabe
            let fits = true;
            for (let i = 0; i < word.length; i++) {
                let r = row + (i * rowStep);
                let c = col + (i * colStep);
                if (grid[r][c] !== '' && grid[r][c] !== wordToPlace[i]) {
                    fits = false;
                    break;
                }
            }
            
            if (fits) {
                for (let i = 0; i < word.length; i++) {
                    let r = row + (i * rowStep);
                    let c = col + (i * colStep);
                    grid[r][c] = wordToPlace[i];
                }
                placedWords.push({
                    word: word,
                    positions: Array.from({length: word.length}, (_, i) => {
                        let r = row + (i * rowStep);
                        let c = col + (i * colStep);
                        return [r, c];
                    }),
                    direction: direction
                });
                placed = true;
            }
            attempts++;
        }
    }
    
    // Rellenar espacios vacíos con letras aleatorias
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (grid[row][col] === '') {
                grid[row][col] = generateRandomLetter();
            }
        }
    }
    
    return {
        grid: grid,
        words: placedWords,
        directions: directions,
        difficulty: difficulty,
        size: size
    };
}

function generateRandomLetter() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return letters[Math.floor(Math.random() * letters.length)];
}

function renderSpotDifferences(data, isPrint) {
    const diffs = data?.differences || [
        {id: 1, description: "Diferencia 1", location: "Arriba izquierda"},
        {id: 2, description: "Diferencia 2", location: "Centro"},
        {id: 3, description: "Diferencia 3", location: "Abajo derecha"}
    ];
    
    let html = `
        <div class="flex flex-col items-center gap-6">
            <div class="grid grid-cols-2 gap-4 max-w-4xl">
                <div class="bg-slate-100 p-4 rounded-lg border-2 border-slate-300">
                    <h4 class="text-center font-bold text-slate-700 mb-2">Imagen Original</h4>
                    <div class="bg-white aspect-square flex items-center justify-center border border-slate-200 relative">
                        <div class="text-6xl">🖼️</div>
                        <p class="absolute bottom-2 text-xs text-slate-400">${data?.scene || 'Escena del parque'}</p>
                    </div>
                </div>
                <div class="bg-slate-100 p-4 rounded-lg border-2 border-slate-300">
                    <h4 class="text-center font-bold text-slate-700 mb-2">Imagen Modificada</h4>
                    <div class="bg-white aspect-square flex items-center justify-center border border-slate-200 relative">
                        <div class="text-6xl">🖼️</div>
                        <p class="absolute bottom-2 text-xs text-slate-400">Encuentra las diferencias</p>
                    </div>
                </div>
            </div>
    `;
    
    if (!isPrint) {
        html += `
            <div class="bg-white p-6 rounded-lg border border-slate-200 max-w-2xl w-full">
                <h4 class="font-bold text-slate-800 mb-3">Diferencias encontradas:</h4>
                <div class="space-y-2">
                    ${diffs.map((d, i) => `
                        <label class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                            <input type="checkbox" class="w-5 h-5 text-indigo-600 rounded" id="diff-${d.id}">
                            <span class="text-slate-700">${i + 1}. ${d.description || d.location}</span>
                        </label>
                    `).join('')}
                </div>
                <p class="text-xs text-slate-500 mt-3">Marca las diferencias que encuentres</p>
            </div>
        `;
    } else {
        html += `
            <div class="text-center text-sm text-slate-600">
                <p>Encuentra ${diffs.length} diferencias entre las dos imágenes</p>
            </div>
        `;
    }
    
    html += `</div>`;
    return html;
}

function renderKakuro(data, isPrint) {
    if (!data || !data.grid) return renderGenericGrid('kakuro', data, isPrint);
    
    const grid = data.grid;
    const size = grid.length;
    
    let html = `
        <div class="inline-block bg-slate-800 p-1">
            <div class="grid gap-px" style="grid-template-columns: repeat(${grid[0]?.length || size}, 40px);">
    `;
    
    for (let row of grid) {
        for (let cell of row) {
            if (cell.type === 'black') {
                html += `
                    <div class="bg-slate-800 text-white text-xs flex flex-col items-center justify-center relative" 
                         style="width: 40px; height: 40px;">
                        ${cell.sumRight ? `<span class="absolute top-0.5 right-1 text-[10px]">${cell.sumRight}</span>` : ''}
                        ${cell.sumDown ? `<span class="absolute bottom-0.5 left-1 text-[10px]">${cell.sumDown}</span>` : ''}
                        ${!cell.sumRight && !cell.sumDown ? '<span class="text-slate-600">●</span>' : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="bg-white flex items-center justify-center text-lg font-bold"
                         style="width: 40px; height: 40px;"
                         ${!isPrint ? 'contenteditable="true"' : ''}>
                        ${cell.value || ''}
                    </div>
                `;
            }
        }
    }
    
    html += `</div></div>`;
    return html;
}

function renderHitori(data, isPrint) {
    if (!data || !data.grid) return renderGenericGrid('hitori', data, isPrint);
    
    const grid = data.grid;
    const size = grid.length;
    
    let html = `
        <div class="bg-white p-4 rounded-lg border border-slate-200 inline-block">
            <div class="grid gap-0.5 bg-slate-400 p-0.5" 
                 style="grid-template-columns: repeat(${size}, 40px);">
    `;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const value = grid[row][col];
            html += `
                <div class="bg-white flex items-center justify-center text-lg font-bold cursor-pointer hover:bg-slate-100 transition-all select-none hitori-cell"
                     style="width: 40px; height: 40px;"
                     data-row="${row}" data-col="${col}"
                     onclick="toggleHitoriCell(this)">
                    ${value}
                </div>
            `;
        }
    }
    
    html += `
            </div>
            ${!isPrint ? `
                <div class="mt-4 text-sm text-slate-600">
                    <p>Haz clic en una celda para sombrearla (eliminar el número)</p>
                    <p class="text-xs text-slate-500 mt-1">Reglas: No números repetidos en filas/columnas, celdas sombreadas no pueden tocarse</p>
                </div>
            ` : ''}
        </div>
    `;
    
    return html;
}

function renderNonogram(data, isPrint) {
    if (!data || !data.solution) return renderGenericGrid('nonograma', data, isPrint);
    
    const rows = data.rows || [];
    const cols = data.cols || [];
    const solution = data.solution;
    const maxRowHints = Math.max(...rows.map(r => r.length));
    const maxColHints = Math.max(...cols.map(c => c.length));
    
    let html = `
        <div class="inline-block bg-white p-4 rounded-lg border border-slate-200">
            <div class="grid gap-px bg-slate-400" 
                 style="grid-template-columns: ${maxRowHints * 25}px repeat(${cols.length}, 30px);">
    `;
    
    html += `<div style="grid-column: span ${maxRowHints};"></div>`;
    
    for (let colHints of cols) {
        html += `<div class="flex flex-col-reverse items-center justify-end bg-slate-100 text-xs font-medium p-1" style="min-height: ${maxColHints * 20}px;">`;
        for (let hint of colHints) {
            html += `<span class="leading-tight">${hint}</span>`;
        }
        html += `</div>`;
    }
    
    for (let i = 0; i < rows.length; i++) {
        html += `<div class="flex items-center justify-end gap-1 bg-slate-100 text-xs font-medium px-2" style="grid-column: span ${maxRowHints};">`;
        for (let hint of rows[i]) {
            html += `<span>${hint}</span>`;
        }
        html += `</div>`;
        
        for (let j = 0; j < solution[i].length; j++) {
            html += `
                <div class="bg-white cursor-pointer hover:bg-slate-100 transition-colors nonogram-cell"
                     style="width: 30px; height: 30px;"
                     data-row="${i}" data-col="${j}"
                     onclick="toggleNonogramCell(this)"
                     data-state="0">
                </div>
            `;
        }
    }
    
    html += `
            </div>
            ${!isPrint ? `
                <div class="mt-4 text-sm text-slate-600 flex items-center gap-4">
                    <span class="flex items-center gap-2"><span class="w-4 h-4 bg-slate-800 inline-block"></span> Pintar</span>
                    <span class="flex items-center gap-2"><span class="w-4 h-4 border border-slate-400 inline-block"></span> Marcar X</span>
                    <span class="flex items-center gap-2"><span class="w-4 h-4 bg-white inline-block"></span> Vacío</span>
                </div>
                <p class="text-xs text-slate-500 mt-2">Haz clic: Vacío → Pintar → X → Vacío</p>
            ` : ''}
        </div>
    `;
    
    return html;
}

function renderKenKen(data, isPrint) {
    if (!data || !data.cages) return renderGenericGrid('kenken', data, isPrint);
    
    const size = data.size || 4;
    const cages = data.cages || [];
    const colors = ['bg-red-100', 'bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100', 'bg-pink-100', 'bg-indigo-100'];
    
    let html = `
        <div class="inline-block bg-white p-4 rounded-lg border border-slate-200">
            <div class="grid gap-0.5 bg-slate-800 p-0.5" 
                 style="grid-template-columns: repeat(${size}, 45px);">
    `;
    
    const cellMap = {};
    cages.forEach((cage, idx) => {
        cage.cells.forEach(([r, c]) => {
            cellMap[`${r},${c}`] = {
                color: colors[idx % colors.length],
                op: cage.operation,
                target: cage.target,
                isFirst: cage.cells[0][0] === r && cage.cells[0][1] === c
            };
        });
    });
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const key = `${row},${col}`;
            const cageInfo = cellMap[key];
            
            html += `
                <div class="${cageInfo ? cageInfo.color : 'bg-white'} relative flex items-center justify-center text-lg font-bold kenken-cell"
                     style="width: 45px; height: 45px; border: 2px solid #334155;"
                     ${!isPrint ? 'contenteditable="true"' : ''}>
                    ${cageInfo && cageInfo.isFirst ? `
                        <span class="absolute top-0.5 left-0.5 text-[10px] font-bold text-slate-700">
                            ${cageInfo.target}${cageInfo.op}
                        </span>
                    ` : ''}
                </div>
            `;
        }
    }
    
    html += `
            </div>
            ${!isPrint ? '<p class="text-xs text-slate-500 mt-2">Completa cada fila/columna con números 1-' + size + ' sin repetir</p>' : ''}
        </div>
    `;
    
    return html;
}

function renderMaze(data, isPrint) {
    if (!data || !data.grid) return renderGenericGrid('laberinto', data, isPrint);
    
    const grid = data.grid;
    const size = grid.length;
    const cellSize = Math.min(25, 400 / size);
    
    let html = `
        <div class="inline-block bg-white p-4 rounded-lg border border-slate-200">
            <div class="relative" style="width: ${size * cellSize}px; height: ${size * cellSize}px;">
    `;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const isWall = grid[row][col] === 1;
            const isStart = data.start && data.start[0] === row && data.start[1] === col;
            const isEnd = data.end && data.end[0] === row && data.end[1] === col;
            
            let content = '';
            let bgClass = isWall ? 'bg-slate-800' : 'bg-white';
            
            if (isStart) {
                content = '<span class="text-green-600 font-bold text-xs">IN</span>';
                bgClass = 'bg-green-100';
            } else if (isEnd) {
                content = '<span class="text-red-600 font-bold text-xs">OUT</span>';
                bgClass = 'bg-red-100';
            }
            
            html += `
                <div class="${bgClass} absolute flex items-center justify-center text-xs border border-slate-200"
                     style="width: ${cellSize}px; height: ${cellSize}px; left: ${col * cellSize}px; top: ${row * cellSize}px;">
                    ${content}
                </div>
            `;
        }
    }
    
    html += `
            </div>
            ${!isPrint ? '<p class="text-xs text-slate-500 mt-2">Encuentra el camino del verde (IN) al rojo (OUT)</p>' : ''}
        </div>
    `;
    
    return html;
}

function renderLogicPuzzle(data, isPrint) {
    const vars = data?.variables || [
        {name: "Persona", options: ["Ana", "Luis", "Pedro"]},
        {name: "Mascota", options: ["Perro", "Gato", "Pez"]},
        {name: "Bebida", options: ["Café", "Té", "Agua"]}
    ];
    const clues = data?.clues || ["Ana no tiene perro", "Quien tiene gato bebe té"];
    
    let html = `
        <div class="max-w-3xl mx-auto bg-white p-6 rounded-lg border border-slate-200">
            <div class="mb-6">
                <h4 class="font-bold text-slate-800 mb-2">Pistas:</h4>
                <ol class="list-decimal list-inside space-y-1 text-slate-700">
                    ${clues.map(c => `<li>${c}</li>`).join('')}
                </ol>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full border-collapse border border-slate-300 logic-table">
                    <thead>
                        <tr class="bg-slate-100">
                            <th class="border border-slate-300 p-2 text-left">${vars[0]?.name || 'Item'}</th>
                            ${vars.slice(1).map(v => `<th class="border border-slate-300 p-2">${v.name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${vars[0]?.options.map((opt, i) => `
                            <tr>
                                <td class="border border-slate-300 p-2 font-medium">${opt}</td>
                                ${vars.slice(1).map(() => `
                                    <td class="border border-slate-300 p-2 text-center">
                                        ${!isPrint ? `
                                            <select class="text-sm border rounded px-1 py-0.5 logic-select">
                                                <option value="">?</option>
                                                ${vars[1]?.options.map(o => `<option value="${o}">${o}</option>`).join('')}
                                            </select>
                                        ` : '<span class="text-slate-400">____</span>'}
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    return html;
}

function renderCryptarithm(data, isPrint) {
    const operation = data?.operation || "SEND + MORE = MONEY";
    const letters = data?.letters || ["S", "E", "N", "D", "M", "O", "R", "Y"];
    
    let html = `
        <div class="max-w-2xl mx-auto bg-white p-8 rounded-lg border border-slate-200 text-center">
            <div class="mb-8 font-mono text-2xl font-bold text-slate-800 space-y-2">
                ${operation.split('=')[0].split('+').map((term, i, arr) => `
                    <div class="flex justify-end gap-1">
                        ${term.trim().split('').map(char => `
                            <div class="w-10 h-12 border-b-2 border-slate-400 flex items-end justify-center pb-1 bg-slate-50">
                                ${!isPrint ? 
                                    `<input type="text" maxlength="1" class="cryptarithm-input" placeholder="${char}" data-letter="${char}">` : 
                                    `<span class="text-slate-800">${char}</span>`
                                }
                            </div>
                        `).join('')}
                        ${i < arr.length - 1 ? '<span class="self-center mx-2">+</span>' : ''}
                    </div>
                `).join('')}
                <div class="border-t-2 border-slate-800 pt-2 flex justify-end gap-1">
                    ${operation.split('=')[1].trim().split('').map(char => `
                        <div class="w-10 h-12 border-b-2 border-slate-400 flex items-end justify-center pb-1 bg-slate-50">
                            ${!isPrint ? 
                                `<input type="text" maxlength="1" class="cryptarithm-input" placeholder="${char}" data-letter="${char}">` : 
                                `<span class="text-slate-800">${char}</span>`
                            }
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="bg-slate-50 p-4 rounded-lg inline-block">
                <h4 class="font-bold text-slate-700 mb-2">Letras únicas:</h4>
                <div class="flex gap-4 justify-center flex-wrap">
                    ${letters.map(letter => `
                        <div class="flex items-center gap-1">
                            <span class="font-bold text-slate-800">${letter}</span>
                            <span>=</span>
                            ${!isPrint ? 
                                `<input type="number" min="0" max="9" class="w-10 h-8 text-center border rounded" data-assign="${letter}">` : 
                                '<span class="text-slate-400">?</span>'
                            }
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <p class="text-sm text-slate-500 mt-4">Cada letra representa un dígito único (0-9)</p>
        </div>
    `;
    
    return html;
}

function renderMagicSquare(data, isPrint) {
    if (!data || !data.grid) {
        const size = 3;
        data = {size, grid: Array(size).fill(null).map(() => Array(size).fill(null))};
    }
    
    const size = data.size;
    const grid = data.grid;
    const constant = data.magicConstant || (size * (size * size + 1)) / 2;
    
    let html = `
        <div class="text-center">
            <p class="text-slate-600 mb-4">Constante mágica: <span class="font-bold text-indigo-600">${constant}</span></p>
            <div class="inline-block bg-slate-800 p-1">
                <div class="grid gap-px" style="grid-template-columns: repeat(${size}, 50px);">
    `;
    
    for (let row of grid) {
        for (let cell of row) {
            html += `
                <div class="bg-white flex items-center justify-center text-xl font-bold magic-square-cell"
                     style="width: 50px; height: 50px;"
                     ${!isPrint && cell === null ? 'contenteditable="true"' : ''}>
                    ${cell !== null ? cell : ''}
                </div>
            `;
        }
    }
    
    html += `
                </div>
            </div>
            <p class="text-sm text-slate-500 mt-4">Todas las filas, columnas y diagonales deben sumar ${constant}</p>
        </div>
    `;
    
    return html;
}

function renderConnectDots(data, isPrint) {
    const points = data?.points || Array.from({length: 30}, (_, i) => [Math.random() * 200, Math.random() * 200]);
    const pointCount = data?.pointCount || points.length;
    
    let html = `
        <div class="text-center">
            <h4 class="font-bold text-slate-700 mb-2">${data?.shape || 'Animal misterioso'} - ${pointCount} puntos</h4>
            <div class="relative inline-block bg-white border-2 border-slate-300 rounded-lg p-4">
                <svg width="300" height="300" class="border border-slate-200 bg-slate-50 connect-dots-svg">
                    ${points.map((p, i) => `
                        <circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#4f46e5" />
                        <text x="${p[0] + 5}" y="${p[1] - 5}" font-size="10" fill="#1e293b">${i + 1}</text>
                    `).join('')}
                </svg>
            </div>
            ${!isPrint ? `
                <div class="mt-4">
                    <p class="text-slate-600">Une los puntos en orden del 1 al ${pointCount}</p>
                    <button onclick="alert('Usa lápiz y papel para conectar los puntos en orden!')" 
                            class="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                        Ver pista
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    return html;
}

function renderFutoshiki(data, isPrint) {
    if (!data || !data.grid) return renderGenericGrid('futoshiki', data, isPrint);
    
    const size = data.size || 5;
    const constraints = data.constraints || [];
    
    let html = `
        <div class="inline-block bg-white p-4 rounded-lg border border-slate-200">
            <div class="grid gap-1" style="grid-template-columns: repeat(${size * 2 - 1}, 40px);">
    `;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const value = data.grid[row]?.[col];
            
            html += `
                <div class="bg-white border-2 border-slate-400 flex items-center justify-center text-lg font-bold"
                     style="width: 40px; height: 40px;"
                     ${!isPrint ? 'contenteditable="true"' : ''}>
                    ${value || ''}
                </div>
            `;
            
            if (col < size - 1) {
                const constraint = constraints.find(c => 
                    c.from[0] === row && c.from[1] === col && c.to[0] === row && c.to[1] === col + 1
                );
                html += `
                    <div class="flex items-center justify-center text-slate-600 font-bold futoshiki-constraint" style="width: 40px;">
                        ${constraint ? (constraint.type === '>' ? '>' : '<') : ''}
                    </div>
                `;
            }
        }
        
        if (row < size - 1) {
            for (let col = 0; col < size; col++) {
                const constraint = constraints.find(c => 
                    c.from[0] === row && c.from[1] === col && c.to[0] === row + 1 && c.to[1] === col
                );
                html += `
                    <div class="flex items-center justify-center text-slate-600 font-bold futoshiki-constraint" style="height: 40px;">
                        ${constraint ? (constraint.type === '>' ? '∧' : '∨') : ''}
                    </div>
                `;
                if (col < size - 1) {
                    html += `<div></div>`;
                }
            }
        }
    }
    
    html += `
            </div>
            <p class="text-xs text-slate-500 mt-2">Usa números 1-${size}. Respeta los signos > y <</p>
        </div>
    `;
    
    return html;
}

function renderHashi(data, isPrint) {
    const islands = data?.islands || [
        {x: 0, y: 0, value: 3}, {x: 2, y: 0, value: 2},
        {x: 0, y: 2, value: 1}, {x: 2, y: 2, value: 2}
    ];
    
    const maxX = Math.max(...islands.map(i => i.x)) + 1;
    const maxY = Math.max(...islands.map(i => i.y)) + 1;
    
    let html = `
        <div class="inline-block bg-white p-4 rounded-lg border border-slate-200">
            <div class="relative" style="width: ${maxX * 60}px; height: ${maxY * 60}px;">
    `;
    
    for (let island of islands) {
        html += `
            <div class="absolute bg-white border-2 border-slate-800 rounded-full flex items-center justify-center font-bold text-lg cursor-pointer hover:bg-indigo-50 transition-colors"
                 style="width: 40px; height: 40px; left: ${island.x * 60 + 10}px; top: ${island.y * 60 + 10}px;">
                ${island.value}
            </div>
        `;
    }
    
    html += `
            </div>
            ${!isPrint ? `
                <div class="mt-4 text-sm text-slate-600">
                    <p>Conecta islas con puentes (líneas) según el número indicado</p>
                    <p class="text-xs text-slate-500">Máximo 2 puentes entre islas. Puentes no se cruzan.</p>
                </div>
            ` : ''}
        </div>
    `;
    
    return html;
}

function renderSlitherlink(data, isPrint) {
    const size = data?.size || 5;
    const grid = data?.grid || Array(size).fill(null).map(() => Array(size).fill(null));
    
    let html = `
        <div class="inline-block bg-white p-4 rounded-lg border border-slate-200">
            <div class="relative" style="width: ${size * 40 + 20}px; height: ${size * 40 + 20}px;">
                ${Array.from({length: size + 1}, (_, row) => 
                    Array.from({length: size + 1}, (_, col) => `
                        <div class="absolute w-2 h-2 bg-slate-800 rounded-full" 
                             style="left: ${col * 40 + 9}px; top: ${row * 40 + 9}px;"></div>
                    `).join('')
                ).join('')}
                
                ${grid.map((row, r) => 
                    row.map((cell, c) => cell !== null ? `
                        <div class="absolute flex items-center justify-center font-bold text-lg text-slate-700"
                             style="left: ${c * 40 + 20}px; top: ${r * 40 + 20}px; width: 20px; height: 20px;">
                            ${cell}
                        </div>
                    ` : '').join('')
                ).join('')}
            </div>
            ${!isPrint ? '<p class="text-xs text-slate-500 mt-2">Dibuja un bucle continuo. Los números indican líneas alrededor.</p>' : ''}
        </div>
    `;
    
    return html;
}

function renderTents(data, isPrint) {
    const size = data?.size || 8;
    const trees = data?.trees || [[1, 1], [3, 4], [5, 2]];
    
    let html = `
        <div class="inline-block bg-white p-4 rounded-lg border border-slate-200">
            <div class="grid gap-px bg-slate-400 p-0.5" 
                 style="grid-template-columns: repeat(${size}, 35px);">
    `;
    
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const hasTree = trees.some(t => t[0] === row && t[1] === col);
            
            html += `
                <div class="flex items-center justify-center text-lg cursor-pointer hover:bg-indigo-100 transition-colors ${hasTree ? 'tree-cell bg-green-100' : 'bg-white tent-cell'}"
                     style="width: 35px; height: 35px;"
                     onclick="${!isPrint && !hasTree ? 'toggleTent(this)' : ''}">
                    ${hasTree ? '🌲' : ''}
                </div>
            `;
        }
    }
    
    html += `
            </div>
            ${!isPrint ? `
                <div class="mt-4 text-sm text-slate-600">
                    <p>Coloca una tienda ⛺ junto a cada árbol</p>
                    <p class="text-xs text-slate-500">Las tiendas no pueden tocarse ni en diagonal</p>
                </div>
            ` : ''}
        </div>
    `;
    
    return html;
}

function renderGenericGrid(type, data, isPrint) {
    const size = 8;
    const title = type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    
    return `
        <div class="text-center p-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 w-full">
            <h3 class="text-xl font-bold text-slate-700 mb-4">${title}</h3>
            <div class="grid gap-px bg-slate-800 p-0.5 inline-block" 
                 style="grid-template-columns: repeat(${size}, 40px);">
                ${Array(size * size).fill(0).map((_, i) => `
                    <div class="bg-white flex items-center justify-center text-sm font-medium cursor-pointer hover:bg-indigo-50 transition-colors cell-interactive"
                         style="width: 40px; height: 40px;"
                         ${!isPrint ? 'contenteditable="true"' : ''}>
                    </div>
                `).join('')}
            </div>
            ${!isPrint ? `
                <p class="mt-4 text-sm text-indigo-600 font-medium">
                    Modo interactivo: haz clic en las celdas para editar
                </p>
                <p class="text-xs text-slate-500 mt-1">
                    Puzzle tipo "${type}" - Grid genérico de ${size}x${size}
                </p>
            ` : ''}
        </div>
    `;
}

// Función para generar datos mock (fallback cuando la API falla)
function generateMockData(type, difficulty) {
    if (type === 'sudoku') {
        return {
            grid: Array(9).fill(null).map(() => 
                Array(9).fill(null).map(() => Math.random() > 0.7 ? Math.floor(Math.random() * 9) + 1 : null)
            ),
            solution: Array(9).fill(null).map(() => Array(9).fill(null).map(() => Math.floor(Math.random() * 9) + 1))
        };
    }
    if (type === 'crucigrama') {
        // Generar crucigrama completo con pistas
        return generateCrosswordPuzzle();
    }
    if (type === 'sopa') {
        return generateWordSearchPuzzle(difficulty);
    }
    return { message: "Contenido generado simulado" };
}

// 8. INICIO DE LA APLICACIÓN
document.addEventListener('DOMContentLoaded', () => {
    // Iniciar app cuando el DOM esté listo
    if (window.app && typeof window.app.goHome === 'function') {
        window.app.goHome();
    } else {
        console.error('La aplicación no se ha inicializado correctamente.');
    }
});