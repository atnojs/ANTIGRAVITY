// --- START OF JavaScript (v3.5.2) ---
const neutralConfig = { 
    rol: "un experto en temas generales", tareaTitulo: "", userIdeas: "", userQuestionRequest: "", 
    userExpectation: "", negativePrompt: "",  taskDescriptionContextoGeneral: "", 
    contextoConsideracion: [], temas: "", formatoDescripcion: "", vocabulario: [],  
    figurasRetoricas: [], estructuraOraciones: "neutro", nivelDetalle: "conciso", 
    perspectiva: "tercera", tono: "neutro", audiencia: "", 
    formatoSalida: "Texto plano bien estructurado.", instruccionesArchivos: "", 
    textualLinksRequest: false, qualityRequest: false, templateSelector: "" 
};

const templates = {
    blogPostIdea: {
        rol: "un estratega de contenidos experto en SEO",
        tareaTitulo: "Generar 5 ideas para artículos de blog sobre [TEMA PRINCIPAL]",
        userQuestionRequest: "Necesito 5 ideas originales y atractivas para artículos de blog sobre [TEMA PRINCIPAL]. Cada idea debe incluir un posible título, una breve descripción del enfoque y 2-3 palabras clave principales.",
        userExpectation: "Una lista numerada con las 5 ideas, cada una con título, descripción y palabras clave. Enfócate en ángulos que no sean los típicos.",
        formatoDescripcion: "Lista numerada. Para cada idea: Título (H3), Descripción (párrafo), Palabras Clave (lista).",
        audiencia: "[TU AUDIENCIA OBJETIVO]",
        formatoSalida: "Markdown con encabezados para los títulos de las ideas."
    },
    socialMediaPost: {
        rol: "un community manager creativo y conciso",
        tareaTitulo: "Crear 3 borradores de posts para [RED SOCIAL] sobre [EVENTO/PRODUCTO/TEMA]",
        userQuestionRequest: "Elabora 3 opciones de posts para [RED SOCIAL] promocionando/informando sobre [EVENTO/PRODUCTO/TEMA]. Deben ser breves, llamativos e incluir un llamado a la acción y 2-3 hashtags relevantes.",
        userExpectation: "Tres borradores de texto, cada uno de no más de 280 caracteres (si es para X/Twitter) o 150 palabras (para otras redes). Incluir emojis si es apropiado para el tono.",
        tono: "informal",
        formatoSalida: "Texto plano, un post tras otro, separados por '---'."
    },
    emailDraft: {
        rol: "un copywriter experto en email marketing",
        tareaTitulo: "Redactar un borrador de email persuasivo para [PROPÓSITO DEL EMAIL]",
        userQuestionRequest: "Necesito un borrador de email para [PROPÓSITO DEL EMAIL, ej: anunciar un nuevo producto, invitar a un webinar, recuperar un carrito abandonado]. El email debe tener un asunto atractivo, un cuerpo claro y conciso, y un llamado a la acción fuerte.",
        userExpectation: "Un email completo con: Asunto, Cuerpo del email (dividido en 2-3 párrafos cortos), Llamado a la acción (CTA).",
        audiencia: "[CLIENTES/SUSCRIPTORES/LEADS]",
        tono: "persuasivo",
        formatoSalida: "Texto plano."
    },
    codeHelper: {
        rol: "un programador senior experto y paciente, especializado en [LENGUAJE/TECNOLOGÍA]",
        tareaTitulo: "Explicar o depurar un fragmento de código en [LENGUAJE]",
        userQuestionRequest: "Por favor, revisa el siguiente fragmento de código en [LENGUAJE] y [EXPLICA QUÉ HACE / AYÚDAME A ENCONTRAR EL ERROR / SUGIERE MEJORAS]:\n\n[PEGAR CÓDIGO AQUÍ]\n\n",
        userExpectation: "Una explicación clara y paso a paso, o una identificación del error con sugerencia de corrección, o alternativas más eficientes/idiomáticas. Si es depuración, indica la línea problemática si es posible.",
        taskDescriptionContextoGeneral: "Asume que tengo un nivel [PRINCIPIANTE/INTERMEDIO/AVANZADO] de conocimiento en [LENGUAJE].",
        formatoSalida: "Respuesta en Markdown, usando bloques de código para el código."
    }
};

const FIXED_PROMPT_PARAMS = {};
FIXED_PROMPT_PARAMS.REGLAS = { "REGLA_1": "Mensaje inicial: 👋 Soy tu asistente IA. Mi objetivo es {tarea}. Para brindar un trabajo de la más alta calidad, necesito hacerle algunas preguntas.", "REGLA_2": "Haga hasta 5 preguntas pertinentes diseñadas para obtener todos los detalles necesarios para crear un resultado personalizado de la más alta calidad que logre el objetivo del usuario. Luego, espera una respuesta.", "REGLA_3": "Respira profundamente. Piensa en tu tarea paso a paso. Considere los factores de éxito, los criterios y el objetivo. Imagínese cuál sería el resultado óptimo. Apunte a la perfección en cada intento.", "REGLA_4": "Utilice los detalles que proporcionó el usuario y las mejores prácticas de la industria para crear el contenido óptimo.", "REGLA_5": "CONCLUYA cada finalización de trabajo con \"🤖 ¿Le gustaría que evaluara este trabajo ☝ y le brindara opciones para mejorarlo? ¿Sí o no?\"", "REGLA_6": "SIEMPRE DEBES evaluar tu trabajo usando un formato de tabla. NO añadas comentarios sugeridos en áreas donde podría incluir datos adicionales. Limítate a evaluar tu trabajo en formato de tabla, Cada evaluación DEBE incluir: Criteria, Rating (out of 10 based on evaluationRubric), Reasons for Rating, and Detailed Feedback for Improvement.", "REGLA_7": "La evaluationRubric, detallada en la sección 'criteria' de este prompt, es la guía definitiva para calificar el trabajo. Haga una referencia cruzada rigurosa del contenido con la descripción de cada criterio allí presente. Haga coincidir los atributos del trabajo con los detalles de la rúbrica. Después de cada evaluación proporcione una confirmación honesta si la evaluationRubric (sección 'criteria') se utilizó con un ✅ o ❌", "REGLA_8": "DEBE SIEMPRE mostrar las opciones de post-evaluation DESPUÉS DE CADA evaluación. Post-evaluation, mostrará las opciones: \"Opciones\": [\"1: 👍 Mejorar según los comentarios\", \"2: 👀 Proporcionar una evaluación más estricta\", \"3: 🙋‍♂️ Responder más preguntas para personalización\", \"4: 🧑‍🤝‍🧑 Emule los comentarios detallados de un grupo enfocado en ese tema\", \"5: 👑 Emule los comentarios detallados de un grupo de expertos,\", \"6: ✨ Seamos creativos y probemos un enfoque diferente\", \"8: 💡 Solicite modificación de formato, estilo o longitud\", \"9: 🤖 ¡Haz de esto un 10/10 automáticamente! \"] ", "rule_9": "Para cada revisión, agregue una sección \\REGISTRO DE CAMBIOS 📝\\ al final del contenido. Esta sección debe documentar de manera concisa las modificaciones y actualizaciones específicas realizadas." };
FIXED_PROMPT_PARAMS.criteria = { "criteria_1": {"name": "Relevancia", "description": "El texto resultado debe demostrar un profundo conocimiento de las necesidades, intereses y puntos débiles del público objetivo. Debe abordar temas relevantes y proporcionar información valiosa que resuene en los lectores."}, "criteria_2": {"name": "Originalidad", "description": "El texto resultado debe ofrecer perspectivas únicas e ideas nuevas que lo distingan de otros contenidos de la industria. Debe evitar regurgitar información comúnmente conocida y, en su lugar, proporcionar conocimientos nuevos e innovadores que capten la atención de los lectores."}, "criteria_3": {"name": "Conexión", "description": "El texto resultado debe estar escrito de un modo cautivador. y convincente que mantiene a los lectores interesados en todo momento. Debe utilizar técnicas narrativas, titulares convincentes, y un tono conversacional para crear una conexión con la audiencia y alentarlos a continuar leyendo y tomar medidas."}, "criteria_4": {"name": "Análisis Crítico Experto", "description": "Un análisis altamente crítico. Evaluación del trabajo desde la perspectiva de un experto de la industria, es decir, de un experto experimentado en el campo o industria relevante. Requiere la demostración de conocimientos y experiencia profundos que se alineen con las mejores prácticas, estándares y expectativas de la industria."}, "criteria_5": {"name": "Calificación general", "description": "Una evaluación global que considere todos los criterios juntos."}};
FIXED_PROMPT_PARAMS.promptHeader = "NO ejecutes el modo canva o lienzo. Tu tarea es crear un contenido alineado con las necesidades individuales del usuario. Inicia la interacción con el usuario para obtener detalles esenciales y resolver cualquier ambigüedad. Perfecciona iterativamente tu respuesta a través de evaluaciones consistentes utilizando la evaluationRubric dada y recopila comentarios de los usuarios para garantizar que el producto final se alinee con las expectativas de los usuarios. DEBES SEGUIR LAS REGLAS EN ORDEN.";

let history = []; let historyIndex = -1; const MAX_HISTORY_STATES = 20; let lastLoadedConfigFilename = null; let promptHasUnsavedChanges = false;

const promptForm = document.getElementById('promptForm'); 
const outputPromptTextarea = document.getElementById('outputPrompt'); 
const currentDateEl = document.getElementById('currentDate'); 
const btnGeneratePrompt = document.getElementById('btnGeneratePrompt'); 
const btnCopyPrompt = document.getElementById('btnCopyPrompt'); 
const btnClearForm = document.getElementById('btnClearForm');  
const btnOpenConfig = document.getElementById('btnOpenConfig'); 
const fileOpenConfigInput = document.getElementById('fileOpenConfig'); 
const btnSaveConfig = document.getElementById('btnSaveConfig'); 
const btnUndo = document.getElementById('btnUndo'); 
const btnRedo = document.getElementById('btnRedo'); 
const loadedConfigNameDisplay = document.getElementById('loadedConfigNameDisplay'); 
const scrollToTopBtn = document.getElementById('scrollToTopBtn'); 
const templateSelector = document.getElementById('templateSelector');
const quickGuideModal = document.getElementById('quickGuideModal');
const btnQuickGuideInline = document.getElementById('btnQuickGuideInline');
const closeQuickGuideModal = document.getElementById('closeQuickGuideModal');

function setUnsavedChanges(status) { promptHasUnsavedChanges = status; }

function getFormValues() { const formData = new FormData(promptForm); const values = {}; for (const element of promptForm.elements) { if (!element.name) continue;  if (element.type === 'checkbox') { if (element.name.endsWith('[]') || ['contextoConsideracion', 'vocabulario', 'figurasRetoricas'].includes(element.name)) {  if (!values[element.name]) values[element.name] = []; if (element.checked) values[element.name].push(element.value); } else { values[element.name] = element.checked; } } else if (element.type === 'radio') { if (element.checked) values[element.name] = element.value; } else if (element.tagName === 'SELECT' && element.multiple) {  values[element.name] = Array.from(element.selectedOptions).map(opt => opt.value); } else { values[element.name] = element.value; } } ['contextoConsideracion', 'vocabulario', 'figurasRetoricas'].forEach(chkGroup => { if (!values[chkGroup]) values[chkGroup] = []; }); ['qualityRequest', 'textualLinksRequest'].forEach(chkName => { if (typeof values[chkName] === 'undefined') values[chkName] = false; }); if (typeof values['negativePrompt'] === 'undefined') values['negativePrompt'] = ""; return values; }

function setFormValues(config, calledFromHistory = false) { Object.keys(neutralConfig).forEach(key => { const elements = promptForm.elements[key]; if (elements) { if (elements.length && typeof elements.forEach === 'function' && elements[0].type === 'checkbox' ) { elements.forEach(chk => { chk.checked = Array.isArray(config[key]) && config[key].includes(chk.value); }); } else if (elements.type === 'checkbox') { elements.checked = config[key] || false; } else if (elements.type === 'radio') { let radioSelected = false; const radioGroup = (elements.length === undefined) ? [elements] : Array.from(elements); for (const radio of radioGroup) { if (radio.value === config[key]) { radio.checked = true; radioSelected = true; break; } } if(!radioSelected && radioGroup.length > 0 && radioGroup[0].name === key) { let found = false; for(const radio of radioGroup) { if(radio.value === neutralConfig[key]) {radio.checked = true; found = true; break;} } if(!found && radioGroup.length > 0) radioGroup[0].checked = true;} } else { if(elements.value !== undefined) { elements.value = config[key] || (elements.tagName === 'SELECT' ? (neutralConfig[key] || (elements.options.length > 0 ? elements.options[0].value : "")) : ""); } } } }); if (templateSelector) templateSelector.value = config.templateSelector || ""; if (!calledFromHistory) { setUnsavedChanges(false); } updateUndoRedoButtons(); }

function applyTemplate(templateKey) { if (templateKey && templates[templateKey]) { const templateConf = templates[templateKey]; let fullConfigForTemplate = { ...neutralConfig }; for (const key in templateConf) { if (templateConf.hasOwnProperty(key)) { fullConfigForTemplate[key] = templateConf[key]; } } fullConfigForTemplate.templateSelector = templateKey; setFormValues(fullConfigForTemplate); outputPromptTextarea.value = "Plantilla aplicada. Ajusta los campos [ENTRE CORCHETES] y genera el prompt."; alert("Plantilla '" + templateSelector.options[templateSelector.selectedIndex].text + "' aplicada. \nRecuerda reemplazar los textos entre [CORCHETES] con tu información específica."); saveStateToHistory(); } }

function clearLoadedConfigName() { loadedConfigNameDisplay.textContent = ''; loadedConfigNameDisplay.style.display = 'none'; lastLoadedConfigFilename = null; }

function resetFormToNeutral() { if (promptHasUnsavedChanges) { if (!window.confirm("Hay cambios sin guardar. ¿Estás seguro de que quieres limpiar el formulario y perder esos cambios?")) { return;  } } setFormValues(neutralConfig, false);  outputPromptTextarea.value = "Aquí aparecerá el prompt JSON generado..."; clearLoadedConfigName(); history = []; historyIndex = -1; const neutralStateValues = getFormValues(); history.push(neutralStateValues); historyIndex = 0; updateUndoRedoButtons(); setUnsavedChanges(false); if(templateSelector) templateSelector.value = ""; }

function generatePrompt() { const userValues = getFormValues(); const currentDateFormatted = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }); clearLoadedConfigName();  let taskDescriptionParts = []; taskDescriptionParts.push(`[[[descripción de tarea:\n`); taskDescriptionParts.push(`FECHA_ACTUALIZACION: ${currentDateFormatted}\n`); if(userValues.userIdeas) taskDescriptionParts.push(`\n== IDEAS DEL USUARIO ==\n${userValues.userIdeas}\n`); if(userValues.userQuestionRequest) taskDescriptionParts.push(`\n== PREGUNTA / SOLICITUD PRINCIPAL ==\n${userValues.userQuestionRequest}\n`); if(userValues.userExpectation) taskDescriptionParts.push(`\n== EXPECTATIVA DEL USUARIO ==\n${userValues.userExpectation}\n`); if(userValues.negativePrompt) taskDescriptionParts.push(`\n== PROMPT NEGATIVO (QUÉ EVITAR) ==\n${userValues.negativePrompt}\n`); if(userValues.taskDescriptionContextoGeneral) taskDescriptionParts.push(`\n== CONTEXTO GENERAL ADICIONAL Y DETALLES DE LA TAREA ==\n${userValues.taskDescriptionContextoGeneral}\n`); if (userValues.contextoConsideracion && userValues.contextoConsideracion.length > 0) { let contextoStr = "\n== CONSIDERACIONES DE CONTEXTO ADICIONALES (marcadas por el usuario) ==\n"; userValues.contextoConsideracion.forEach(item => { const formattedItem = item.replace(/([A-Z])/g, ' $1').trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase()); contextoStr += `- ${formattedItem}\n`;  }); taskDescriptionParts.push(contextoStr); } if(userValues.temas) taskDescriptionParts.push(`\n== TEMAS ADICIONALES A CUBRIR ==\n${userValues.temas}\n`); if(userValues.formatoDescripcion) taskDescriptionParts.push(`\n== FORMATO DEL CONTENIDO DESCRITO POR EL USUARIO ==\n${userValues.formatoDescripcion}\n`); let estiloStr = "\n== ESTILO DE ESCRITURA EN LA RESPUESTA ==\n"; let estiloAdded = false; if (userValues.vocabulario && userValues.vocabulario.length > 0) { estiloStr += `  Vocabulario: ${userValues.vocabulario.join(', ')}. (Se busca equilibrio si hay múltiples selecciones)\n`; estiloAdded = true; } if(userValues.estructuraOraciones !== "neutro") { estiloStr += `  Estructura de las oraciones: ${userValues.estructuraOraciones}\n`; estiloAdded = true; } if (userValues.figurasRetoricas && userValues.figurasRetoricas.length > 0) { estiloStr += `  Uso de figuras retóricas: ${userValues.figurasRetoricas.join(', ')}. (Se busca equilibrio si hay múltiples selecciones)\n`; estiloAdded = true; } if(userValues.nivelDetalle !== "conciso") { estiloStr += `  Nivel de detalle: ${userValues.nivelDetalle}\n`; estiloAdded = true; } if(userValues.perspectiva !== "tercera") { estiloStr += `  Perspectiva: ${userValues.perspectiva}\n`; estiloAdded = true; } if(estiloAdded) taskDescriptionParts.push(estiloStr); if(userValues.tono !== "neutro") { taskDescriptionParts.push(`\n== TONO ==\n${userValues.tono}\n`); } if(userValues.audiencia) taskDescriptionParts.push(`\n== AUDIENCIA OBJETIVO ==\n${userValues.audiencia}\n`); taskDescriptionParts.push(`\n== FORMATO DE SALIDA DESEADO POR EL USUARIO ==\n${userValues.formatoSalida || "Texto plano bien estructurado."}\n`); if (userValues.instruccionesArchivos) { taskDescriptionParts.push(`\n== INSTRUCCIONES SOBRE ARCHIVOS ADJUNTOS ==\n${userValues.instruccionesArchivos}\n`); } if (userValues.textualLinksRequest) { taskDescriptionParts.push(`\n== SOLICITUD EXPRESA DE LINKS TEXTUALES ==\nPor favor, incluye todos los links externos de forma textual y completa (ej. https://www.ejemplo.com) en lugar de ocultarlos en hipervínculos numerados o acortados.\n`); } if (userValues.qualityRequest) { taskDescriptionParts.push(`\n== SOLICITUD ADICIONAL DE CALIDAD Y PRECISIÓN ==\nAntes de darme una respuesta, si todavía te hace falta información, o si luego de investigar en Internet, ves que: IMPORTANTE: Mis conceptos están errados o desactualizados a la fecha de hoy ${currentDateFormatted}, hazme preguntas de calidad, para que puedas encontrar la respuesta perfecta y 100% efectiva a mis necesidades, y ofrecerme mejores alternativas que yo no haya encontrado hasta éste instante.\n`); } taskDescriptionParts.push("\n]]]");  const taskDescription = taskDescriptionParts.join(''); const fullPrompt = { prompt: FIXED_PROMPT_PARAMS.promptHeader, rol: `[[[rol Actúa como si fueras ${userValues.rol}]]]`, tarea: `[[[título tarea ${userValues.tareaTitulo || "No especificada"}]]]`, task_description: taskDescription, REGLAS: FIXED_PROMPT_PARAMS.REGLAS, criteria: FIXED_PROMPT_PARAMS.criteria }; let tareaParaRegla1 = userValues.tareaTitulo || userValues.userQuestionRequest || "ayudarte con tu solicitud"; const reglasCopiadas = JSON.parse(JSON.stringify(FIXED_PROMPT_PARAMS.REGLAS)); reglasCopiadas.REGLA_1 = `Mensaje inicial: 👋 Soy tu asistente IA. Mi objetivo es ${tareaParaRegla1}. Para brindar un trabajo de la más alta calidad, necesito hacerle algunas preguntas.`; fullPrompt.REGLAS = reglasCopiadas; outputPromptTextarea.value = JSON.stringify(fullPrompt, null, 2); setUnsavedChanges(true);  }

function copyPromptToClipboard() { if (!outputPromptTextarea.value || outputPromptTextarea.value === "Aquí aparecerá el prompt JSON generado...") { alert("Primero genera un prompt para copiar."); return; } navigator.clipboard.writeText(outputPromptTextarea.value).then(() => { alert("¡Prompt copiado al portapapeles!"); }).catch(err => { console.error('Error al copiar el prompt: ', err); try { outputPromptTextarea.select(); document.execCommand('copy'); alert("¡Prompt copiado al portapapeles! (fallback)"); } catch (e) { alert("No se pudo copiar el prompt. Por favor, cópialo manualmente."); } }); }

function saveConfiguration() { const currentConfig = getFormValues(); let dataToSave = { formConfiguration: currentConfig, savedAt: new Date().toISOString() }; if (outputPromptTextarea.value && outputPromptTextarea.value !== "Aquí aparecerá el prompt JSON generado...") { try { dataToSave.generatedPrompt = JSON.parse(outputPromptTextarea.value); } catch (e) { dataToSave.generatedPrompt = outputPromptTextarea.value; } } let defaultFilename = "prompt_configuracion"; if (lastLoadedConfigFilename) { defaultFilename = lastLoadedConfigFilename.endsWith('.json') ? lastLoadedConfigFilename.slice(0, -5) : lastLoadedConfigFilename; } else if (promptForm.elements.tareaTitulo.value) { defaultFilename = promptForm.elements.tareaTitulo.value.substring(0, 40).replace(/\s+/g, '_').replace(/[^\w-]/g, ''); } let userInputFilename = prompt("Ingresa un nombre para guardar el prompt:", defaultFilename); if (userInputFilename === null) { return; } let finalFilename = userInputFilename.trim() || defaultFilename; if (!finalFilename.toLowerCase().endsWith('.json')) { finalFilename += '.json'; } finalFilename = finalFilename.replace(/[<>:"/\\|?*]+/g, '_'); const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = finalFilename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setUnsavedChanges(false); if (!lastLoadedConfigFilename || lastLoadedConfigFilename !== finalFilename) { lastLoadedConfigFilename = finalFilename; loadedConfigNameDisplay.textContent = `Configuración guardada como: ${finalFilename}`; loadedConfigNameDisplay.style.display = 'block'; } }

function openConfiguration(event) { const file = event.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (e) => { try { const loadedData = JSON.parse(e.target.result); if (loadedData.formConfiguration) { setFormValues(loadedData.formConfiguration, false); if (loadedData.generatedPrompt) { outputPromptTextarea.value = typeof loadedData.generatedPrompt === 'string' ? loadedData.generatedPrompt : JSON.stringify(loadedData.generatedPrompt, null, 2); } else { outputPromptTextarea.value = "Configuración cargada. Genera un nuevo prompt si es necesario."; } loadedConfigNameDisplay.textContent = `Configuración cargada: ${file.name}`; loadedConfigNameDisplay.style.display = 'block'; lastLoadedConfigFilename = file.name; history = []; const loadedState = getFormValues(); history.push(loadedState); historyIndex = 0; updateUndoRedoButtons(); setUnsavedChanges(false); } else { alert("El archivo de configuración no tiene el formato esperado (falta 'formConfiguration')."); clearLoadedConfigName(); } } catch (error) { console.error("Error al parsear JSON:", error, "Contenido:", e.target.result); alert("Error al leer o parsear el archivo de configuración: " + error.message + ". Revisa la consola (F12) para más detalles."); clearLoadedConfigName(); } }; reader.readAsText(file); } fileOpenConfigInput.value = ""; }

function saveStateToHistory(stateToSave = null) { const currentState = stateToSave || getFormValues(); if (history.length > 0 && historyIndex >=0 && historyIndex < history.length && JSON.stringify(currentState) === JSON.stringify(history[historyIndex])) { return;  } let isNeutralEquivalent = JSON.stringify(currentState) === JSON.stringify(neutralConfig); history = history.slice(0, historyIndex + 1);  history.push(currentState); if (history.length > MAX_HISTORY_STATES) { history.shift(); } historyIndex = history.length - 1; updateUndoRedoButtons(); if (!isNeutralEquivalent) { setUnsavedChanges(true); } else { if (history.length > 1) { setUnsavedChanges(true); } else { setUnsavedChanges(false); } } }

function undo() { if (historyIndex > 0) { historyIndex--; setFormValues(history[historyIndex], true); if (outputPromptTextarea.value && outputPromptTextarea.value !== "Aquí aparecerá el prompt JSON generado...") { outputPromptTextarea.value = "Estado anterior restaurado. Genera el prompt si es necesario para reflejar estos valores."; } else { outputPromptTextarea.value = "Estado anterior restaurado."; } setUnsavedChanges(true); updateUndoRedoButtons(); } }

function redo() { if (historyIndex < history.length - 1) { historyIndex++; setFormValues(history[historyIndex], true); if (outputPromptTextarea.value && outputPromptTextarea.value !== "Aquí aparecerá el prompt JSON generado...") { outputPromptTextarea.value = "Estado posterior restaurado. Genera el prompt si es necesario para reflejar estos valores."; } else { outputPromptTextarea.value = "Estado posterior restaurado."; } setUnsavedChanges(true); updateUndoRedoButtons(); } }

function updateUndoRedoButtons() { btnUndo.disabled = historyIndex <= 0; btnRedo.disabled = historyIndex >= history.length - 1; }

window.onscroll = function() {scrollFunction()}; function scrollFunction() { if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) { scrollToTopBtn.style.display = "flex"; setTimeout(() => scrollToTopBtn.style.opacity = "1", 10); } else { scrollToTopBtn.style.opacity = "0"; setTimeout(() => scrollToTopBtn.style.display = "none", 300); } }

function positionTooltips() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltipContainer => {
        const tooltipTextElement = tooltipContainer.querySelector('.tooltiptext');
        if (!tooltipTextElement) return;
        tooltipContainer.addEventListener('mouseenter', function() {
            const currentTooltipText = this.querySelector('.tooltiptext');
            if (!currentTooltipText) return;
            currentTooltipText.classList.remove('tooltiptext-bottom');
            
            const iconRect = this.getBoundingClientRect();
            const tooltipHeight = currentTooltipText.offsetHeight;
            const viewportHeight = window.innerHeight;
            let showAtBottom = false;
            const theoreticalTopWhenUp = iconRect.top - tooltipHeight - 8;
            if (theoreticalTopWhenUp < 10) {
                showAtBottom = true;
            }
            if (showAtBottom) {
                const theoreticalBottomWhenDown = iconRect.bottom + tooltipHeight + 8;
                if (theoreticalBottomWhenDown > (viewportHeight - 10)) {
                    if (iconRect.top > (viewportHeight - iconRect.bottom)) {
                        showAtBottom = false; 
                    }
                }
            }
            
            if (showAtBottom) {
                currentTooltipText.classList.add('tooltiptext-bottom');
            } else {
                currentTooltipText.classList.remove('tooltiptext-bottom');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {  
    currentDateEl.textContent = `Fecha actual: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`; 
    resetFormToNeutral();  
    
    const donateButtonContainer = document.getElementById('donate-button-container');
    if (donateButtonContainer && typeof PayPal !== 'undefined' && PayPal.Donation && PayPal.Donation.Button) {
        PayPal.Donation.Button({ env:'production', hosted_button_id:'HSKS65HNDHDCW', image: { src:'https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif', alt:'Donate with PayPal button', title:'PayPal - The safer, easier way to pay online!',} }).render('#donate-button'); 
    } else if (!donateButtonContainer) {
        console.warn("Contenedor #donate-button-container no encontrado. El botón de PayPal no se renderizará.");
    } else if (typeof PayPal === 'undefined') {
        console.warn("SDK de PayPal no cargado. El botón de PayPal no se renderizará.");
    }

    positionTooltips(); 

    if(btnQuickGuideInline) { 
        btnQuickGuideInline.addEventListener('click', () => { 
            if (quickGuideModal) quickGuideModal.style.display = "block"; 
        });
    }
    if(closeQuickGuideModal) {
        closeQuickGuideModal.addEventListener('click', () => { 
            if (quickGuideModal) quickGuideModal.style.display = "none"; 
        });
    }
    window.addEventListener('click', (event) => {
        if (quickGuideModal && event.target == quickGuideModal) {
            quickGuideModal.style.display = "none";
        }
    });

    if (btnGeneratePrompt) btnGeneratePrompt.addEventListener('click', generatePrompt);
    if (btnCopyPrompt) btnCopyPrompt.addEventListener('click', copyPromptToClipboard); 
    if (btnClearForm) btnClearForm.addEventListener('click', resetFormToNeutral);  
    if (btnSaveConfig) btnSaveConfig.addEventListener('click', saveConfiguration);  
    if (btnOpenConfig) btnOpenConfig.addEventListener('click', () => { if(fileOpenConfigInput) fileOpenConfigInput.click(); }); 
    if (fileOpenConfigInput) fileOpenConfigInput.addEventListener('change', openConfiguration);  
    if (btnUndo) btnUndo.addEventListener('click', undo); 
    if (btnRedo) btnRedo.addEventListener('click', redo);

    document.addEventListener('keydown', (event) => { 
        const activeElement = document.activeElement; 
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT')) { 
            // No action needed here, browser handles it
        } else { 
            if (event.ctrlKey && (event.key === 'z' || event.key === 'Z') && !event.shiftKey) { 
                event.preventDefault(); 
                if(typeof undo === 'function') undo(); 
            } 
            if (event.ctrlKey && event.shiftKey && (event.key === 'Z' || event.key === 'z')) { 
                event.preventDefault(); 
                if(typeof redo === 'function') redo(); 
            } 
        } 
    });

    window.addEventListener('beforeunload', (event) => { 
        if (promptHasUnsavedChanges) {
            event.preventDefault(); 
            event.returnValue = ''; 
            return ''; 
        }
    });
}); 

if (promptForm) {
    promptForm.addEventListener('input', (event) => { 
        if (event.target.id !== 'outputPrompt' && event.target.id !== 'templateSelector') {
            if(typeof saveStateToHistory === 'function') saveStateToHistory(getFormValues()); 
        } 
    }); 
}

if (templateSelector) {
    templateSelector.addEventListener('change', (event) => {
        if(typeof applyTemplate === 'function') applyTemplate(event.target.value);
    });
}
// --- FIN DEL SCRIPT ---