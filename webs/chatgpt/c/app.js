
        // Variables globales
        let progress = 0;
        let moduleCompleted = [false, false, false, false, false, false, false];
        let quizScores = [0, 0, 0, 0, 0, 0, 0];
        let totalScore = 0;
        let unlockedBadges = [];
        let challengeTimerInterval = null;
        
        // Empezar tutorial y navegar al Módulo 1
        function startTutorial() {
            const module1Link = document.querySelector('a[data-section="module1"]');
            if (module1Link) {
                module1Link.click();
                window.scrollTo(0, 0);
            }
        }

        // Inicialización
        document.addEventListener('DOMContentLoaded', function() {
            loadProgress();
            setupSidebarNavigation();
            setupGlossary();
            setupDraggable();
            setupTabs();
            setupSimulator();
            document.getElementById('certDate').textContent = new Date().toLocaleDateString();
            startMemoryGame(); // Inicializar el juego de memoria
            startHangmanGame(); // Inicializar el juego de ahorcado
        });
        
        // Configuración de navegación lateral
        function setupSidebarNavigation() {
            const links = document.querySelectorAll('.sidebar-menu a');
            links.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const sectionId = this.getAttribute('data-section');
                    links.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
                    document.getElementById(sectionId).classList.add('active');
                });
            });
        }
        
        // Actualizar progreso
        function updateProgress() {
            const completedModules = moduleCompleted.filter(m => m).length;
            progress = Math.round((completedModules / 7) * 100);
            
            document.getElementById('globalProgress').style.width = progress + '%';
            document.getElementById('progressText').textContent = `${progress}% completado`;
            document.getElementById('finalProgress').style.width = progress + '%';
            document.getElementById('finalProgressText').textContent = `${progress}% completado`;
            
            const completedModulesList = document.getElementById('completedModulesList');
            completedModulesList.innerHTML = '';
            moduleCompleted.forEach((completed, index) => {
                if (completed) {
                    const li = document.createElement('li');
                    li.textContent = `Módulo ${index + 1}: ${['Introducción a ChatGPT', 'Creación de GPTs', 'Prompt Engineering', 'Documentación y Conocimiento', 'Agentes de IA', 'Modelos de Razonamiento', 'Asistente de Código'][index]}`;
                    completedModulesList.appendChild(li);
                }
            });
            
            totalScore = quizScores.reduce((sum, score) => sum + score, 0);
            document.getElementById('totalScore').textContent = `${totalScore}/35`;
            
            updateBadges();
            saveProgress();
        }
        
        // Actualizar logros
        function updateBadges() {
            unlockedBadges = [];
            document.querySelectorAll('.badges-container .badge').forEach((badge, index) => {
                if (index < 7) {
                    if (moduleCompleted[index]) {
                        badge.classList.add('unlocked');
                        unlockedBadges.push(`Módulo ${index + 1}`);
                    } else {
                        badge.classList.remove('unlocked');
                    }
                }
            });
            
            const allDoneBadge = document.getElementById('badge8');
            if (moduleCompleted.every(m => m)) {
                allDoneBadge.classList.add('unlocked');
                unlockedBadges.push("¡Todo completado!");
            } else {
                allDoneBadge.classList.remove('unlocked');
            }
            
            const highScoreBadge = document.getElementById('badge9');
            if (totalScore >= 30) {
                highScoreBadge.classList.add('unlocked');
                unlockedBadges.push("Puntaje Alto");
            } else {
                highScoreBadge.classList.remove('unlocked');
            }
            
            const unlockedBadgesList = document.getElementById('unlockedBadgesList');
            unlockedBadgesList.innerHTML = '';
            unlockedBadges.forEach(badge => {
                const li = document.createElement('li');
                li.textContent = badge;
                unlockedBadgesList.appendChild(li);
            });
        }
        
        // Evaluación de quizzes
        function evaluateQuiz(moduleId) {
            const moduleNum = parseInt(moduleId.replace('module', ''));
            const moduleIndex = moduleNum - 1;
            let score = 0;
            const questions = document.querySelectorAll(`#${moduleId} .question`);
            
            const correctAnswers = {
                'module1': ['b', 'b', 'c', 'b', 'b'], 'module2': ['b', 'c', 'b', 'b', 'c'], 'module3': ['b', 'b', 'c', 'b', 'b'],
                'module4': ['d', 'b', 'b', 'b', 'a'], 'module5': ['b', 'a', 'b', 'c', 'c'], 'module6': ['b', 'b', 'b', 'd', 'b'],
                'module7': ['b', 'b', 'b', 'c', 'b']
            };
            
            questions.forEach((question, index) => {
                const qName = question.querySelector('input[type="radio"]').name;
                const selectedOption = question.querySelector(`input[name="${qName}"]:checked`);
                const feedback = question.querySelector('.feedback');
                
                if (selectedOption) {
                    if (selectedOption.value === correctAnswers[moduleId][index]) {
                        score++;
                        feedback.textContent = "¡Correcto! 🎉";
                        feedback.className = "feedback correct";
                    } else {
                        feedback.textContent = "Incorrecto. Inténtalo de nuevo.";
                        feedback.className = "feedback incorrect";
                    }
                } else {
                    feedback.textContent = "Por favor, selecciona una respuesta.";
                    feedback.className = "feedback incorrect";
                }
                feedback.style.display = "block";
            });
            
            quizScores[moduleIndex] = score;
            document.getElementById(`${moduleId}Score`).textContent = `Puntuación: ${score}/5`;
            
            if(score > 0) { moduleCompleted[moduleIndex] = true; }
            updateProgress();
            if (score === 5) { showNotification(`¡Excelente! Puntuación perfecta en el Módulo ${moduleNum}!`); }
        }
        
        // Navegación entre módulos
        function nextModule(currentModule) {
            const currentNum = parseInt(currentModule.replace('module', ''));
            const nextModuleId = (currentNum < 7) ? `module${currentNum + 1}` : 'games';
            const nextLink = document.querySelector(`.sidebar-menu a[data-section="${nextModuleId}"]`);
            if (nextLink) { nextLink.click(); window.scrollTo(0, 0); }
        }
        
        // --- LÓGICA DE JUEGOS ---
        let draggedElement = null;

        function setupDraggable() {
            document.querySelectorAll('.draggable-item').forEach(item => {
                item.setAttribute('draggable', true);
                if (!item.id) item.id = 'draggable-' + Math.random().toString(36).substr(2, 9);
                item.addEventListener('dragstart', dragStart);
                item.addEventListener('dragend', dragEnd);
            });

            document.querySelectorAll('.drop-zone, .drop-item').forEach(zone => {
                zone.addEventListener('dragover', dragOver);
                zone.addEventListener('dragleave', dragLeave);
                zone.addEventListener('drop', drop);
            });
        }
        
        function dragStart(e) {
            draggedElement = e.target;
            e.dataTransfer.setData('text/plain', e.target.id);
            setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
        }

        function dragEnd(e) {
            if (draggedElement) draggedElement.style.opacity = '1';
            draggedElement = null;
        }

        function dragOver(e) {
            e.preventDefault();
            const target = e.target.closest('.drop-item, .drop-zone');
            if (target) target.classList.add('drag-over');
        }

        function dragLeave(e) {
            const target = e.target.closest('.drop-item, .drop-zone');
            if (target) target.classList.remove('drag-over');
        }

        function drop(e) {
            e.preventDefault();
            if (!draggedElement) return;
            const target = e.target.closest('.drop-item, .drop-zone');
            if(target) {
                target.classList.remove('drag-over');
                if (target.classList.contains('drop-item')) {
                    // Evita soltar múltiples items en el mismo lugar en el juego de emparejar
                    if (target.children.length === 0) target.appendChild(draggedElement);
                } else {
                    target.appendChild(draggedElement);
                }
            }
        }

        function checkMatch() {
            let correct = 0;
            const dropItems = document.querySelectorAll('#matchGame .drop-item');
            dropItems.forEach(item => {
                item.classList.remove('correct', 'incorrect');
                const child = item.querySelector('.draggable-item');
                if (child && child.getAttribute('data-match') === item.getAttribute('data-target')) {
                    correct++;
                    item.classList.add('correct');
                } else {
                    item.classList.add('incorrect');
                }
            });
            document.getElementById('matchResult').textContent = `Has acertado ${correct}/4.`;
            document.getElementById('matchResult').style.color = (correct === 4) ? 'var(--success)' : 'var(--danger)';
        }

        function checkDrag() {
            const dropZone = document.getElementById('drag-target');
            const droppedItems = Array.from(dropZone.querySelectorAll('.draggable-item'));
            let isCorrect = droppedItems.length === 6 && droppedItems.every((item, i) => parseInt(item.getAttribute('data-order')) === i + 1);
            
            const result = document.getElementById('dragResult');
            result.textContent = isCorrect ? "¡Perfecto! Has ordenado los pasos correctamente." : "El orden es incorrecto. Inténtalo de nuevo.";
            result.style.color = isCorrect ? "var(--success)" : "var(--danger)";
        }

        function checkFill() {
            let correct = 0;
            const answers = {'fill1': 'prompt', 'fill2': 'Markdown', 'fill3': 'Tree of Thoughts', 'fill4': 'Agent', 'fill5': 'Intérprete de código' };
            for (const id in answers) { if (document.getElementById(id).value === answers[id]) correct++; }
            
            const result = document.getElementById('fillResult');
            result.textContent = `Has acertado ${correct}/5.`;
            result.style.color = (correct === 5) ? 'var(--success)' : 'var(--danger)';
        }

        function startChallenge() {
            const timerElement = document.getElementById('challengeTimer');
            let timeLeft = 60;
            timerElement.textContent = timeLeft;

            const startBtn = document.getElementById('startChallengeBtn');
            let submitBtn = document.getElementById('submitChallengeBtn');
            if (!submitBtn) {
                submitBtn = document.createElement('button');
                submitBtn.id = 'submitChallengeBtn';
                submitBtn.className = 'btn btn-success';
                submitBtn.textContent = 'Entregar Respuestas';
                submitBtn.onclick = submitChallenge;
                startBtn.parentNode.insertBefore(submitBtn, startBtn.nextSibling);
            }
            submitBtn.style.display = 'inline-block';
            startBtn.style.display = 'none';

            if (challengeTimerInterval) clearInterval(challengeTimerInterval);
            challengeTimerInterval = setInterval(() => {
                timeLeft--;
                timerElement.textContent = timeLeft;
                if (timeLeft <= 0) submitChallenge();
            }, 1000);
        }

        function submitChallenge() {
            if(challengeTimerInterval) { clearInterval(challengeTimerInterval); challengeTimerInterval = null; }
            checkChallengeAnswers();
            document.getElementById('startChallengeBtn').style.display = 'inline-block';
            const submitBtn = document.getElementById('submitChallengeBtn');
            if (submitBtn) submitBtn.style.display = 'none';
        }

        function checkChallengeAnswers() {
            let correct = 0;
            const correctValues = ['a', 'b', 'c', 'd', 'c'];
            for (let i = 1; i <= 5; i++) {
                const answer = document.querySelector(`input[name="q${i}challenge"]:checked`);
                if (answer && answer.value === correctValues[i - 1]) correct++;
            }
            const result = document.getElementById('challengeResult');
            result.textContent = `Has acertado ${correct}/5.`;
            result.style.color = (correct === 5) ? 'var(--success)' : 'var(--danger)';
        }
        
        // Setup tabs
        function setupTabs() {
            document.querySelectorAll('[data-tab], [data-game]').forEach(button => {
                button.addEventListener('click', () => {
                    const group = button.closest('.nav-tabs');
                    group.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    const contentContainer = button.closest('.card') || document;
                    contentContainer.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                    const tabName = button.getAttribute('data-tab') || button.getAttribute('data-game');
                    const tabId = button.hasAttribute('data-tab') ? `${tabName}Tab` : `${tabName}Game`;
                    document.getElementById(tabId).classList.add('active');
                });
            });
        }
        
        // Glosario
        function setupGlossary() {
            const popup = document.getElementById('glossaryPopup');
            document.querySelectorAll('.glossary-term').forEach(term => {
                term.addEventListener('mouseenter', function() {
                    popup.textContent = this.getAttribute('data-definition');
                    const rect = this.getBoundingClientRect();
                    popup.style.left = (rect.left + window.scrollX) + 'px';
                    popup.style.top = (rect.bottom + window.scrollY + 5) + 'px';
                    popup.style.display = 'block';
                });
                term.addEventListener('mouseleave', () => { popup.style.display = 'none'; });
            });
        }
        
        // Simulador
        function setupSimulator() {}
        
        function evaluateInstructions() {
            const input = document.getElementById('simulatorInput').value.toLowerCase();
            const output = document.getElementById('simulatorOutput');
            let score = 0;
            let feedback = "Análisis de tu prompt:\n";
            const checks = {
                "Definición de objetivo": input.includes('analizar') && input.includes('pliego'),
                "Asignación de rol": input.includes('rol') || input.includes('actúa como'),
                "Especificación de formato": input.includes('markdown') || input.includes('resumen'),
                "Medidas de protección": input.includes('confidencial') || input.includes('no reveles'),
                "Inclusión de refuerzo": input.includes('importante') || input.includes('calidad'),
            };
            for (const key in checks) {
                feedback += `- ${key}: ${checks[key] ? '✅' : '❌'}\n`;
                if(checks[key]) score++;
            }
            output.innerText = feedback;
            output.style.backgroundColor = (score >= 4) ? "rgba(46, 204, 113, 0.2)" : "rgba(231, 76, 60, 0.2)";
        }
        
        // Notificaciones
        function showNotification(message) {
            const notification = document.createElement('div');
            notification.textContent = message;
            Object.assign(notification.style, {
                position: 'fixed', bottom: '20px', right: '20px', backgroundColor: 'var(--success)',
                color: 'white', padding: '15px', borderRadius: '8px', zIndex: '2000',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            });
            document.body.appendChild(notification);
            setTimeout(() => document.body.removeChild(notification), 3000);
        }
        
        // Modales
        function showModal(id) { document.getElementById(id).style.display = 'block'; }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }
        
        // Guardar y cargar progreso
        function saveProgress() {
            localStorage.setItem('minicampusProgress', JSON.stringify({ moduleCompleted, quizScores }));
        }
        
        function loadProgress() {
            const saved = localStorage.getItem('minicampusProgress');
            if (saved) {
                const data = JSON.parse(saved);
                moduleCompleted = data.moduleCompleted || Array(7).fill(false);
                quizScores = data.quizScores || Array(7).fill(0);
                quizScores.forEach((score, i) => {
                    if (score > 0) document.getElementById(`module${i + 1}Score`).textContent = `Puntuación: ${score}/5`;
                });
            }
            updateProgress();
        }
        
        // Resetear progreso
        function resetProgress() {
            if (confirm('¿Estás seguro de que quieres reiniciar todo tu progreso?')) {
                localStorage.removeItem('minicampusProgress');
                localStorage.removeItem('minicampusUserName');
                location.reload();
            }
        }
        
        // Certificado
        function downloadCertificate() {
            let userName = localStorage.getItem('minicampusUserName') || prompt("Por favor, introduce tu nombre para el certificado:") || "Estudiante Dedicado";
            if (userName) localStorage.setItem('minicampusUserName', userName);
            document.getElementById('certUserName').textContent = userName;
            document.getElementById('certScore').textContent = `${totalScore}/35`;
            document.getElementById('certModules').textContent = `${moduleCompleted.filter(m => m).length}/7`;
            document.getElementById('certBadges').textContent = unlockedBadges.length;
            showModal('certificateModal');
        }
        
        function downloadCertificateFile() {
             const certContent = `Certificado de Finalización - Minicampus GPT\n-------------------------------------------\nOtorgado a: ${localStorage.getItem('minicampusUserName')}\n\nPor completar exitosamente el Minicampus sobre GPTs Personalizados.\n\nPuntuación: ${totalScore}/35\nMódulos: ${moduleCompleted.filter(m => m).length}/7\nFecha: ${new Date().toLocaleDateString()}`;
            const blob = new Blob([certContent], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'Certificado_Minicampus_GPT.txt';
            a.click();
            URL.revokeObjectURL(a.href);
        }
        
        // Menú móvil
        document.getElementById('menuToggle').addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            const isVisible = sidebar.style.display === 'block';
            sidebar.style.display = isVisible ? 'none' : 'block';
        });

        // --- LÓGICA PARA NUEVOS JUEGOS ---

        // Juego 5: Juego de Memoria
        let memoryCards = [
            {id: 1, term: 'Prompt', match: 1, type: 'term'},
            {id: 2, term: 'Solicitud para modelo de lenguaje', match: 1, type: 'def'},
            {id: 3, term: 'GPT', match: 3, type: 'term'},
            {id: 4, term: 'Generative Pre-trained Transformer', match: 3, type: 'def'},
            {id: 5, term: 'RAG', match: 5, type: 'term'},
            {id: 6, term: 'Retrieval Augmented Generation', match: 5, type: 'def'},
            {id: 7, term: 'Tree of Thoughts', match: 7, type: 'term'},
            {id: 8, term: 'Técnica de razonamiento dividido', match: 7, type: 'def'}
        ];
        let selectedCards = [];
        let matchedPairs = 0;

        function startMemoryGame() {
            const board = document.getElementById('memoryBoard');
            board.innerHTML = '';
            memoryCards.sort(() => Math.random() - 0.5);
            memoryCards.forEach(card => {
                const cardElement = document.createElement('div');
                cardElement.classList.add('draggable-item'); // Reusamos estilo
                cardElement.dataset.match = card.match;
                cardElement.innerText = '?';
                cardElement.onclick = flipMemoryCard;
                board.appendChild(cardElement);
            });
            matchedPairs = 0;
            document.getElementById('memoryResult').textContent = '';
        }

        function flipMemoryCard(e) {
            const card = e.target;
            if (selectedCards.length < 2 && !card.classList.contains('flipped')) {
                const index = Array.from(card.parentNode.children).indexOf(card);
                card.innerText = memoryCards[index].term;
                card.classList.add('flipped');
                selectedCards.push(card);
                if (selectedCards.length === 2) {
                    setTimeout(checkMemoryMatch, 1000);
                }
            }
        }

        function checkMemoryMatch() {
            const [card1, card2] = selectedCards;
            if (card1.dataset.match === card2.dataset.match) {
                matchedPairs++;
                if (matchedPairs === memoryCards.length / 2) {
                    document.getElementById('memoryResult').textContent = '¡Has encontrado todas las parejas!';
                    document.getElementById('memoryResult').style.color = 'var(--success)';
                }
            } else {
                card1.innerText = '?';
                card2.innerText = '?';
                card1.classList.remove('flipped');
                card2.classList.remove('flipped');
            }
            selectedCards = [];
        }

        function resetMemoryGame() {
            startMemoryGame();
        }

        // Juego 6: Verdadero o Falso
        function checkTrueFalse() {
            let correct = 0;
            const answers = {'tf1': 'true', 'tf2': 'false', 'tf3': 'true', 'tf4': 'false', 'tf5': 'true'};
            for (let i = 1; i <= 5; i++) {
                const selected = document.querySelector(`input[name="tf${i}"]:checked`);
                if (selected && selected.value === answers[`tf${i}`]) correct++;
            }
            const result = document.getElementById('truefalseResult');
            result.textContent = `Has acertado ${correct}/5.`;
            result.style.color = (correct === 5) ? 'var(--success)' : 'var(--danger)';
        }

        // Juego 7: Palabras Revueltas
        function checkWordScramble() {
            let correct = 0;
            const answers = {'scramble1': 'PROMPT', 'scramble2': 'GPT', 'scramble3': 'TREE OF THOUGHTS', 'scramble4': 'AGENTE', 'scramble5': 'DOCUMENTACION'};
            for (const id in answers) {
                if (document.getElementById(id).value.toUpperCase().replace(/\s+/g, '') === answers[id].replace(/\s+/g, '')) correct++;
            }
            const result = document.getElementById('wordscrambleResult');
            result.textContent = `Has acertado ${correct}/5.`;
            result.style.color = (correct === 5) ? 'var(--success)' : 'var(--danger)';
        }

        // Juego 8: Ahorcado
        const hangmanTerms = ['PROMPT', 'GPT', 'RAG', 'AGENTE', 'DOCUMENTACION'];
        let currentHangmanWord = '';
        let guessedLetters = [];
        let wrongGuesses = 0;
        const maxWrong = 6;

        function startHangmanGame() {
            currentHangmanWord = hangmanTerms[Math.floor(Math.random() * hangmanTerms.length)];
            guessedLetters = [];
            wrongGuesses = 0;
            updateHangmanDisplay();
            document.getElementById('hangmanInput').value = '';
            document.getElementById('hangmanGuesses').textContent = 'Intentos incorrectos: 0';
            document.getElementById('hangmanResult').textContent = '';
        }

        function updateHangmanDisplay() {
            let display = '';
            for (let char of currentHangmanWord) {
                display += guessedLetters.includes(char) ? char + ' ' : '_ ';
            }
            document.getElementById('hangmanWord').textContent = display.trim();
        }

        function guessHangmanLetter() {
            const input = document.getElementById('hangmanInput').value.toUpperCase();
            if (input.length === 1 && !guessedLetters.includes(input)) {
                guessedLetters.push(input);
                if (!currentHangmanWord.includes(input)) {
                    wrongGuesses++;
                    document.getElementById('hangmanGuesses').textContent = `Intentos incorrectos: ${wrongGuesses}`;
                }
                updateHangmanDisplay();
                if (wrongGuesses >= maxWrong) {
                    document.getElementById('hangmanResult').textContent = `¡Perdiste! La palabra era: ${currentHangmanWord}`;
                    document.getElementById('hangmanResult').style.color = 'var(--danger)';
                } else if (!document.getElementById('hangmanWord').textContent.includes('_')) {
                    document.getElementById('hangmanResult').textContent = '¡Ganaste!';
                    document.getElementById('hangmanResult').style.color = 'var(--success)';
                }
            }
            document.getElementById('hangmanInput').value = '';
        }

        // Juego 9: Constructor de Prompts
        function checkPromptBuilder() {
            const dropZone = document.getElementById('prompt-target');
            const droppedItems = Array.from(dropZone.querySelectorAll('.draggable-item'));
            const correctOrder = ['context', 'task', 'instruction', 'clarification', 'refinement'];
            let isCorrect = droppedItems.length === 5 && droppedItems.every((item, i) => item.getAttribute('data-part') === correctOrder[i]);
            
            const result = document.getElementById('promptbuilderResult');
            result.textContent = isCorrect ? "¡Prompt construido correctamente!" : "El orden es incorrecto. Recuerda: Contexto, Tarea, Instrucción, Clarificación, Refinamiento.";
            result.style.color = isCorrect ? "var(--success)" : "var(--danger)";
        }

    


(function(){
  const ROUTES = ["basico","pro","plantillas"];
  const sel = s => document.querySelector(s);
  const selAll = s => Array.from(document.querySelectorAll(s));
  const visited = new Set(JSON.parse(localStorage.getItem("mc_visited_routes") || "[]"));

  function showRoute(route){
    const views = [
      sel('#view-basico'),
      sel('#view-pro'),
      sel('#view-plantillas')
    ].filter(Boolean);
    views.forEach(v => v.style.display = 'none');
    const target = sel('#view-' + route);
    if(target){ target.style.display = ''; }
    visited.add(route);
    localStorage.setItem("mc_visited_routes", JSON.stringify([...visited]));
    localStorage.setItem("mc_last_route", route);
    updateProgress();
  }

  function updateProgress(){
    const pct = Math.round((visited.size / ROUTES.length) * 100);
    const fill = sel("#mc-progress-fill");
    const label = sel("#mc-progress-label");
    if(fill) fill.style.width = pct + "%";
    if(label) label.textContent = "Progreso: " + pct + "%";
  }

  function initNav(){
    selAll('[data-route]').forEach(btn=>{
      btn.addEventListener('click', ()=> showRoute(btn.dataset.route));
    });
  }

  function exportProgress(){
    const data = {
      schema: "minicampus-progress-v1",
      exported_at: new Date().toISOString(),
      visited_routes: JSON.parse(localStorage.getItem("mc_visited_routes") || "[]"),
      last_route: localStorage.getItem("mc_last_route") || null
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "minicampus_progreso_" + Date.now() + ".json";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function validateProgressJson(obj){
    if(!obj || typeof obj !== "object") return false;
    if(obj.schema !== "minicampus-progress-v1") return false;
    if(!Array.isArray(obj.visited_routes)) return false;
    if(obj.last_route && !ROUTES.includes(obj.last_route)) return false;
    obj.visited_routes = obj.visited_routes.filter(r => ROUTES.includes(r));
    return true;
  }

  function importProgressFromFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if(!validateProgressJson(data)) throw new Error("Archivo inválido");
        localStorage.setItem("mc_visited_routes", JSON.stringify(data.visited_routes || []));
        localStorage.setItem("mc_last_route", data.last_route || "basico");
        visited.clear(); (data.visited_routes || []).forEach(v => visited.add(v));
        showRoute(data.last_route && ROUTES.includes(data.last_route) ? data.last_route : "basico");
        alert("Progreso importado correctamente.");
      }catch(e){
        alert("No se pudo importar el progreso. Selecciona un .json válido.");
      }
    };
    reader.onerror = () => alert("Error leyendo el archivo seleccionado.");
    reader.readAsText(file, "utf-8");
  }

  function initExportImport(){
    const exportBtn = sel("#mc-btn-export");
    const importBtn = sel("#mc-btn-import");
    const importInput = sel("#mc-import-file");
    if(exportBtn) exportBtn.addEventListener("click", exportProgress);
    if(importBtn && importInput){
      importBtn.addEventListener("click", ()=> importInput.click());
      importInput.addEventListener("change", ()=>{
        const file = importInput.files && importInput.files[0];
        if(file) importProgressFromFile(file);
        importInput.value = "";
      });
    }
  }

  function renderBasicMarkdown(md){
    md = md.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    md = md.replace(/```([\s\S]*?)```/g, (_,code)=> "<pre><code>"+code+"</code></pre>");
    md = md.replace(/^###\s+(.*)$/gm, "<h3>$1</h3>");
    md = md.replace(/^##\s+(.*)$/gm, "<h2>$1</h2>");
    md = md.replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");
    const lines = md.split("\n");
    let html = "", inList = false;
    for(const raw of lines){
      const line = raw.trimEnd();
      if(/^<pre>/.test(line) || /^<\/pre>/.test(line) || /^<h[1-3]>/.test(line)){
        if(inList){ html += "</ul>"; inList = false; }
        html += line + "\n"; continue;
      }
      if(/^\-\s+/.test(line)){
        if(!inList){ html += "<ul>"; inList = true; }
        html += "<li>" + line.replace(/^\-\s+/, "") + "</li>"; continue;
      }
      if(line === ""){
        if(inList){ html += "</ul>"; inList = false; }
        html += "\n"; continue;
      }
      if(inList){ html += "</ul>"; inList = false; }
      if(/^<(h[1-3]|ul|li|pre|code)/.test(line)) html += line + "\n";
      else html += "<p>" + line + "</p>\n";
    }
    if(inList) html += "</ul>";
    return html;
  }

  function openModal(){ const m = sel("#mc-preview-modal"); if(m) m.style.display = "flex"; }
  function closeModal(){ const m = sel("#mc-preview-modal"); if(m) m.style.display = "none"; }

  async function openPreview(mdPath){
    const title = sel("#mc-preview-title");
    const content = sel("#mc-preview-content");
    const btnDownload = sel("#mc-preview-download");
    if(title) title.textContent = "Vista previa — " + mdPath.split("/").pop();
    if(content) content.innerHTML = "<p class='muted'>Cargando...</p>";
    if(btnDownload){
      btnDownload.onclick = ()=>{
        const link = document.createElement("a");
        link.href = mdPath; link.download = mdPath.split("/").pop();
        document.body.appendChild(link); link.click(); link.remove();
      };
    }
    try{
      const res = await fetch(mdPath, {cache:"no-cache"});
      if(!res.ok) throw new Error("HTTP " + res.status);
      const md = await res.text();
      if(content) content.innerHTML = renderBasicMarkdown(md);
    }catch(e){
      if(content) content.innerHTML = "<p class='muted'>No se pudo cargar la vista previa. Descarga el archivo para verlo. ("+ e.message +")</p>";
    }
    openModal();
  }

  function initPreview(){
    selAll("[data-preview]").forEach(btn=>{
      btn.addEventListener("click", ()=> openPreview(btn.dataset.preview));
    });
    const closeBtn = sel("#mc-preview-close");
    if(closeBtn) closeBtn.addEventListener("click", closeModal);
    document.addEventListener("keydown", e=>{ if(e.key === "Escape") closeModal(); });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    initNav();
    initExportImport();
    initPreview();
    const last = localStorage.getItem("mc_last_route") || "basico";
    showRoute(ROUTES.includes(last) ? last : "basico");
  });
})();
