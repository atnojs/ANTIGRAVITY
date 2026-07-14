document.addEventListener('DOMContentLoaded', () => {
    // ==== State ====
    let originalImageBase64 = null;
    let generatedImageBase64 = null;
    let historyManager;
    let isLoading = false;
    let activeCategory = null;

    // Selectores FLUX
    let selectedQuality = 'pro';
    let selectedAR = '1:1';
    let selectedRes = 1024;

    // State para regeneración
    let imageToRegenerate = null;
    let regenModal = null;
    let lightboxModal = null;
    let globalLoader = null;

    // ==== Elements ====
    const dragArea = document.getElementById('drag-area');
    const fileInput = document.getElementById('file-input');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadedImagePreview = document.getElementById('uploaded-image-preview');

    const categoryContainer = document.getElementById('category-container');  // legacy (puede no existir)
    const catsLeft  = document.getElementById('cats-left');
    const catsRight = document.getElementById('cats-right');
    const catsBelow = document.getElementById('cats-below');
    const subcategoryContainer = document.getElementById('subcategory-container');

    const customPromptInput = document.getElementById('custom-prompt');
    const ideaGeneratorBtn = document.getElementById('idea-generator-btn');
    const ideaGeneratorIcon = document.getElementById('idea-generator-icon');
    const ideaGeneratorSpinner = document.getElementById('idea-generator-spinner');

    const enhancePromptBtn = document.getElementById('enhance-prompt-btn');
    const enhancePromptIcon = document.getElementById('enhance-prompt-icon');
    const enhancePromptSpinner = document.getElementById('enhance-prompt-spinner');

    const intensitySlider = document.getElementById('intensity-slider');
    const intensityValue = document.getElementById('intensity-value');

    const keepColorsCheckbox = document.getElementById('keep-colors-checkbox');
    const changeBackgroundCheckbox = document.getElementById('change-background-checkbox');
    const changePoseCheckbox = document.getElementById('change-pose-checkbox');

    const generateBtn = document.getElementById('generate-btn');
    const generateBtnText = document.getElementById('generate-btn-text');
    const loader = document.getElementById('loader');

    const comparisonContainer = document.getElementById('comparison-container');
    const imageBefore = document.getElementById('image-before');
    const imageAfter = document.getElementById('image-after');

    const downloadBtn = document.getElementById('download-btn');
    const historySection = document.getElementById('history-section');
    const historyContainer = document.getElementById('history-container');

    const styleDescriptionSection = document.getElementById('style-description-section');
    const describeStyleBtn = document.getElementById('describe-style-btn');
    const describeBtnText = document.getElementById('describe-btn-text');
    const describeLoader = document.getElementById('describe-loader');
    const styleDescriptionOutput = document.getElementById('style-description-output');

    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // ==== INYECCIONES DOM ====

    // 1. LOADER GLOBAL
    const injectGlobalLoader = () => {
        if (document.getElementById('global-loader')) return;
        const div = document.createElement('div');
        div.id = 'global-loader';
        div.className = 'global-loader';
        div.innerHTML = `
    <div class="spinner-container">
    <div class="spinner-outer"></div>
    <div class="spinner-inner"></div>
    </div>
    <div class="loader-text" id="global-loader-text">Procesando...</div>
    `;
        document.body.appendChild(div);
        globalLoader = div;
    };

    const showGlobalLoader = (text) => {
        const txt = document.getElementById('global-loader-text');
        if (txt) txt.textContent = text;
        if (globalLoader) globalLoader.classList.add('show');
    };

    const hideGlobalLoader = () => {
        if (globalLoader) globalLoader.classList.remove('show');
    };

    // 2. Botón Descargar Todo
    let downloadAllBtn = null;
    const injectDownloadAllButton = () => {
        if (downloadAllBtn) return;
        const header = historySection.querySelector('h2');
        if (!header) return;
        const container = document.createElement('div');
        container.className = 'flex justify-between items-center mb-4';
        header.parentNode.insertBefore(container, header);
        container.appendChild(header);

        downloadAllBtn = document.createElement('button');
        downloadAllBtn.className = 'text-sm text-accent hover:text-white underline transition-colors cursor-pointer';
        downloadAllBtn.textContent = 'Descargar todo (.zip)';
        container.appendChild(downloadAllBtn);
        downloadAllBtn.addEventListener('click', handleDownloadAll);
    };

    // 3. Lightbox
    const injectLightbox = () => {
        if (document.getElementById('lightbox-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'lightbox-overlay';
        overlay.className = 'lightbox-overlay';
        overlay.innerHTML = `<button class="lightbox-close">&times;</button><img src="" class="lightbox-content" id="lightbox-img">`;
        document.body.appendChild(overlay);

        overlay.querySelector('.lightbox-close').onclick = () => overlay.classList.remove('show');
        overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('show'); };
        lightboxModal = overlay;
    };

    const openLightbox = (src) => {
        document.getElementById('lightbox-img').src = src;
        lightboxModal.classList.add('show');
    };

    // 4. Modal Regenerar/Fondo
    const injectRegenModal = () => {
        if (document.getElementById('regen-modal-backdrop')) return;
        const backdrop = document.createElement('div');
        backdrop.id = 'regen-modal-backdrop';
        backdrop.className = 'regen-modal-backdrop';

        backdrop.innerHTML = `
    <div class="regen-modal-content">
    <h3 class="text-2xl font-bold text-white mb-2" id="regen-title">✨ Edición</h3>
    <p class="text-sm text-gray-400 mb-4" id="regen-subtitle">Instrucción</p>
    <textarea id="regen-textarea" class="regen-textarea"></textarea>
    <div class="flex justify-end gap-4">
    <button id="regen-cancel-btn" class="px-6 py-3 rounded-xl border border-gray-600 text-white hover:bg-white/10 transition-colors">Cancelar</button>
    <button id="regen-confirm-btn" class="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg transition-all">Generar</button>
    </div>
    </div>
    `;
        document.body.appendChild(backdrop);

        document.getElementById('regen-cancel-btn').onclick = closeRegenModal;
        document.getElementById('regen-confirm-btn').onclick = handleRegenConfirm;
        backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeRegenModal(); });
        regenModal = backdrop;
    };

    const openRegenModal = (imgBase64, mode) => {
        imageToRegenerate = imgBase64;
        const title = document.getElementById('regen-title');
        const sub = document.getElementById('regen-subtitle');
        const area = document.getElementById('regen-textarea');

        area.dataset.mode = mode;
        area.value = '';

        if (mode === 'bg') {
            title.textContent = "Cambiar Fondo";
            sub.textContent = "Describe el nuevo lugar. El outfit se mantendrá igual.";
            area.placeholder = "Ej: En una playa tropical al atardecer...";
        } else {
            title.textContent = "Edición Avanzada";
            sub.textContent = "Describe qué detalle quieres cambiar.";
            area.placeholder = "Ej: Ponle gafas de sol, cambia la corbata a roja...";
        }

        regenModal.classList.add('show');
    };

    const closeRegenModal = () => {
        if (regenModal) regenModal.classList.remove('show');
        imageToRegenerate = null;
    };

    const handleRegenConfirm = async () => {
        const textarea = document.getElementById('regen-textarea');
        const prompt = textarea.value.trim();
        if (!prompt) {
            showToast("Escribe una instrucción.");
            return;
        }

        const mode = textarea.dataset.mode;

        // IMPORTANTE: guardar la imagen ANTES de cerrar el modal
        const baseImage = imageToRegenerate;
        if (!baseImage) {
            showToast("No se ha encontrado la imagen a editar. Vuelve a abrir el menú desde el historial.");
            return;
        }

        // Cerrar modal y mostrar loader
        closeRegenModal();
        showGlobalLoader(mode === 'bg' ? "Generando Fondo" : "Editando Imagen");

        try {
            let finalPrompt = "";
            if (mode === 'bg') {
                finalPrompt = `Change ONLY the background to: ${prompt}. Keep the person and outfit exactly as is. High quality photorealism.`;
            } else {
                finalPrompt = `Edit this image based on: ${prompt}. Maintain photorealism.`;
            }

            // Usamos la copia local baseImage (ya no es null)
            const resultBase64 = await callImageAPI(baseImage, finalPrompt);

            generatedImageBase64 = resultBase64;
            imageAfter.src = generatedImageBase64;

            // Si no había original (caso raro), usar la imagen base
            if (!originalImageBase64) {
                originalImageBase64 = baseImage;
            }

            const label = mode === 'bg' ? 'Fondo Nuevo' : 'Editado';
            await addToHistory(
                generatedImageBase64,
                { style: label, subcategory: 'Personalizado' },
                finalPrompt
            );
            resetComparisonSlider();

            showToast("¡Imagen actualizada!");
        } catch (e) {
            console.error(e);
            showToast("Error al procesar: " + e.message);
        } finally {
            hideGlobalLoader();
        }
    };

    // ==== Categorías COMPLETAS ====
    const categories = [
        {
            name: 'Formal', icon: '👔', prompt: "Replace the model's outfit with an ultra-realistic formal ensemble featuring premium fabrics, precise tailoring, soft cinematic lighting, and subtle reflections enhancing every texture for a high-end editorial look.", subcategories: [
                { name: 'Traje de Gala', prompt: "Replace the model's outfit with an elegant evening gown made of flowing silk and delicate lace details, illuminated by soft studio lighting that enhances fabric depth, sheen, and realistic skin-light interaction." },
                { name: 'Esmoquin', prompt: "Replace the model's outfit with a classic black tuxedo crafted from fine wool with satin lapels, crisp white shirt, and polished bow tie, under warm cinematic lighting revealing smooth textures and subtle reflections." },
                { name: 'Traje Negocios', prompt: "Replace the model's outfit with a professional business suit featuring sharp lines, structured shoulders, and matte-finish wool fabric under balanced soft lighting highlighting every seam and texture with photoreal precision." },
                { name: 'Vestido Cóctel', prompt: "Replace the model's outfit with a chic cocktail dress made of luxurious velvet or silk, emphasizing realistic draping, soft highlights, and lifelike reflections that convey a cinematic sense of sophistication." },
                { name: 'Frac', prompt: "Replace the model's outfit with a traditional full evening dress (white tie) including a black tailcoat, white waistcoat, and bow tie, under crisp cinematic lighting that highlights the sharp contrast, fine fabric weave, and structural precision." },
                { name: 'Chaqué', prompt: "Replace the model's outfit with a classic morning suit featuring a grey or black morning coat, striped trousers, and waistcoat, illuminated by soft daylight emphasizing the fine wool textures and sophisticated layering for a photorealistic formal day event look." },
                { name: 'Vestido de Baile', prompt: "Replace the model's outfit with an opulent ball gown featuring a voluminous skirt of layered tulle or satin, intricate beading, and a structured bodice, under dramatic studio lighting that creates deep shadows and sparkling highlights, enhancing its majestic realism." },
                { name: 'Traje de Lino', prompt: "Replace the model's outfit with an elegant linen suit in a light color, showcasing the fabric's natural weave and characteristic light creasing, under warm, soft outdoor lighting that emphasizes its breathable texture and relaxed, sophisticated realism." },
                { name: 'Mono de Noche', prompt: "Replace the model's outfit with a high-fashion evening jumpsuit made of crepe or silk, featuring a wide-leg silhouette and tailored bodice, illuminated by soft cinematic light that gracefully follows the contours and highlights the material's fluid drape and subtle sheen." },
                { name: 'Smoking Blanco', prompt: "Replace the model's outfit with a stunning white dinner jacket tuxedo featuring an ivory blazer with black lapels, black trousers, and a bow tie, under crisp event lighting emphasizing the immaculate contrast and luxurious fabric textures." },
                { name: 'Uniforme de Gala', prompt: "Replace the model's outfit with a ceremonial military dress uniform featuring gold braid, medals, polished buttons, and a peaked cap, under formal lighting that highlights the precise tailoring, regal details, and photorealistic material quality." },
                { name: 'Vestido Alfombra Roja', prompt: "Replace the model's outfit with a show-stopping red carpet gown made of silk charmeuse with dramatic train, exquisite embellishments, and figure-skimming silhouette, under flash photography lighting that captures every shimmer, fold, and glamorous detail." }
            ]
        },
        {
            name: 'Casual', icon: '👕', prompt: "Replace the model's outfit with a casual modern look featuring breathable fabrics, natural folds, soft daylight illumination, and balanced contrast for an authentic lifestyle appearance.", subcategories: [
                { name: 'Urbano', prompt: "Replace the model's outfit with a stylish urban streetwear set of layered cotton, denim, and nylon textures, illuminated by natural soft light to reveal fine stitching and tactile material realism." },
                { name: 'Bohemio', prompt: "Replace the model's outfit with a bohemian-inspired combination of loose fabrics, woven patterns, and subtle earthy tones, portrayed under diffused light to emphasize natural drape and fiber detail." },
                { name: 'Vaquero', prompt: "Replace the model's outfit with a timeless denim jeans and t-shirt combination, capturing fabric creases, natural wear, and matte lighting that evokes tactile authenticity and relaxed realism." },
                { name: 'Playero', prompt: "Replace the model's outfit with a relaxed beachwear ensemble of light linen and cotton, rendered with bright but soft lighting to enhance airy textures and realistic cloth translucency." },
                { name: 'Preppy', prompt: "Replace the model's outfit with a preppy ensemble featuring a crisp polo shirt or oxford, chino shorts, and a cable-knit sweater, under bright, clear lighting that highlights the clean lines and rich cotton textures." },
                { name: 'Loungewear', prompt: "Replace the model's outfit with a comfortable loungewear set made of ultra-soft fleece or modal cotton, emphasizing relaxed fit and fabric softness, under warm, diffused indoor lighting that creates a cozy, tactile, and realistic appearance." },
                { name: 'Athleisure', prompt: "Replace the model's outfit with a modern athleisure look, combining technical fabric leggings or joggers with a stylish hoodie, under neutral studio light that accentuates the mix of matte and sheen textures and sporty seams." },
                { name: 'Minimalista', prompt: "Replace the model's outfit with a minimalist casual look using monochrome colors, clean silhouettes, and high-quality basic fabrics like heavy cotton, under soft, even lighting that emphasizes form, simplicity, and subtle texture realism." },
                { name: 'Veraniego', prompt: "Replace the model's outfit with a light summer dress or shorts and a linen shirt, rendered with bright, natural sunlight that casts soft shadows, highlighting the airy fabric, vibrant colors, and relaxed, photorealistic seasonal feel." },
                { name: 'Grunge', prompt: "Replace the model's outfit with a 90s grunge style featuring a worn flannel shirt tied at the waist, faded band t-shirt, ripped jeans, and combat boots, under moody, overcast lighting that emphasizes the distressed textures and rebellious aesthetic." },
                { name: 'Oversized', prompt: "Replace the model's outfit with a trendy oversized look featuring a massively oversized hoodie or coat, wide-leg trousers, and chunky sneakers, under urban street lighting that plays with proportion, volume, and fabric drape." },
                { name: 'Monocromático', prompt: "Replace the model's outfit with an all-monochrome casual ensemble in shades of one color (black, white, beige, or any hue), featuring tone-on-tone layering, varied textures, and clean lines, under soft lighting that highlights subtle tonal variations." }
            ]
        },
        {
            name: 'Deportivo', icon: '🏃', prompt: "Replace the model's outfit with ultra-detailed sportswear emphasizing elasticity, breathable mesh textures, and dynamic lighting to convey motion, tension, and lifelike athletic realism.", subcategories: [
                { name: 'Gimnasio', prompt: "Replace the model's outfit with sleek gym wear of stretchable fabric showing muscular definition and tension, rendered with directional lighting enhancing sheen, depth, and micro-texture realism." },
                { name: 'Running', prompt: "Replace the model's outfit with modern running gear made of technical fabrics, moisture-wicking mesh, and reflective strips illuminated with cinematic rim light enhancing contours and material contrast." },
                { name: 'Yoga', prompt: "Replace the model's outfit with soft, form-fitting yoga attire made of smooth breathable fabric, rendered with warm balanced lighting to highlight comfort, subtle sheen, and surface texture." },
                { name: 'Tenis', prompt: "Replace the model's outfit with a refined tennis outfit including polo and skirt or shorts, featuring crisp cotton texture under bright diffused lighting revealing clean, photorealistic surface details." },
                { name: 'Baloncesto', prompt: "Replace the model's outfit with a basketball uniform, including a loose-fitting mesh jersey and shorts, showcasing fabric perforations and sweat-wicking texture under bright arena lighting that highlights material sheen and dynamic folds." },
                { name: 'Fútbol', prompt: "Replace the model's outfit with a professional soccer kit, featuring a lightweight technical jersey and shorts, rendered with dynamic lighting that emphasizes fabric tension over muscles and the realistic texture of the team crest." },
                { name: 'Ciclismo', prompt: "Replace the model's outfit with a form-fitting cycling kit (maillot and bib shorts) made of aerodynamic lycra, under bright outdoor sunlight that reveals the high-contrast graphics, seam details, and fabric's elastic sheen." },
                { name: 'Natación', prompt: "Replace the model's outfit with a competitive swimsuit made of sleek, water-repellent fabric, rendered with sharp lighting that accentuates the body's contours and the material's smooth, skin-tight texture and subtle reflections." },
                { name: 'Esquí', prompt: "Replace the model's outfit with a modern ski suit, including an insulated waterproof jacket and pants, under bright, cold lighting that highlights the nylon texture, protective padding, and realistic snow reflections." },
                { name: 'Surf', prompt: "Replace the model's outfit with a surf-style look featuring a rash guard or wetsuit top, board shorts, and casual flip-flops, under bright tropical sunlight with ocean reflections that emphasize the water-sport textures and sun-kissed realism." },
                { name: 'Golf', prompt: "Replace the model's outfit with a classic golf ensemble featuring a crisp polo shirt, tailored slacks, a visor, and a lightweight vest, under perfect golf-course morning lighting that highlights the neat, preppy contours and fine fabric textures." },
                { name: 'Artes Marciales', prompt: "Replace the model's outfit with a traditional martial arts uniform (gi/dobok) made of heavyweight cotton with a tied belt, rendered under dojo lighting that emphasizes the fabric's coarse weave, crisp folds, and disciplined, authentic silhouette." }
            ]
        },
        {
            name: 'Disfraz', icon: '🎭', prompt: "Replace the model's outfit with a high-fidelity costume design featuring layered textures, fabric contrast, and cinematic illumination that enhances realism while preserving facial and body proportions of the model.", subcategories: [
                { name: 'Pirata', prompt: "Replace the model's outfit with a richly detailed pirate costume including leather vest, cotton shirt, and weathered fabric accents, rendered with soft directional lighting emphasizing texture, depth, and authentic material wear." },
                { name: 'Personaje Sci-Fi', prompt: "Replace the model's outfit with a futuristic science-fiction costume made of metallic fabrics, tech patterns, and synthetic reflections, rendered under cold cinematic lighting to enhance realism and precision." },
                { name: 'Payaso', prompt: "Replace the model's outfit with a photorealistic clown costume featuring layered satin, ruffles, and vibrant color gradients, captured with balanced lighting to preserve authentic material gloss and soft shadow detail." },
                { name: 'Vampiro', prompt: "Replace the model's outfit with an aristocratic vampire costume, featuring a high-collar velvet cape, satin vest, and lace jabot, under dramatic, low-key cinematic lighting that emphasizes the deep shadows and rich, dark textures." },
                { name: 'Zombie', prompt: "Replace the model's outfit with a distressed zombie costume, showcasing torn, dirt-stained fabrics with realistic weathering, under a grim, cool-toned light that highlights the grime and tattered material." },
                { name: 'Detective Noir', prompt: "Replace the model's outfit with a classic film noir detective costume, including a trench coat with a defined collar and fedora, under harsh, high-contrast lighting that creates sharp shadows and emphasizes the heavy wool texture." },
                { name: 'Vaquero', prompt: "Replace the model's outfit with an authentic cowboy costume, featuring a leather vest, denim, plaid shirt, and weathered hat, illuminated by warm, dusty sunlight that highlights the rugged textures of leather, felt, and cotton." },
                { name: 'Princesa de Cuento', prompt: "Replace the model's outfit with a classic fairy tale princess gown, made of sparkling fabric, layered tulle, and delicate embroidery, under magical, soft-focus lighting that enhances the shimmer, volume, and ethereal realism." },
                { name: 'Ninja', prompt: "Replace the model's outfit with a stealthy ninja costume featuring a wrapped black gi, mesh face mask, tabi boots, and an obi sash, under moody, nighttime lighting that emphasizes the matte textures, layered wraps, and mysterious silhouette." },
                { name: 'Gladiador', prompt: "Replace the model's outfit with an ancient Roman gladiator costume featuring leather armor straps, a metal shoulder guard, wrist bracers, and a tattered tunic, under harsh arena sunlight that accentuates the battle-worn metal and rugged leather." },
                { name: 'Bruja/Mago Oscuro', prompt: "Replace the model's outfit with a dark witch or warlock costume featuring flowing black robes, pointed hat, mystical runes, and layered tattered fabric, under an eerie moonlit glow that emphasizes the occult textures and dramatic silhouette." },
                { name: 'Robot/Androide', prompt: "Replace the model's outfit with a sci-fi android costume featuring metallic body panels, glowing LED lines, synthetic joints, and futuristic plating, under cool neon lighting that reflects off the polished metal and high-tech composites." }
            ]
        },
        {
            name: 'Cultural', icon: '👘', prompt: "Replace the model's outfit with traditional cultural attire crafted with authentic textiles, detailed stitching, and realistic illumination emphasizing fabric density, embroidery texture, and natural color richness.", subcategories: [
                { name: 'Kimono', prompt: "Replace the model's outfit with a traditional Japanese kimono showcasing fine silk patterns, embroidered motifs, and precise layering, under warm soft lighting enhancing folds, reflections, and material depth." },
                { name: 'Sari', prompt: "Replace the model's outfit with a traditional Indian sari made of lustrous fabric and intricate embroidery, rendered with cinematic lighting that highlights folds, golden accents, and realistic cloth sheen." },
                { name: 'Escocés', prompt: "Replace the model's outfit with a Scottish kilt ensemble featuring wool texture and tartan pattern realism, under soft daylight tones emphasizing natural fiber texture and realistic shadowing." },
                { name: 'Egipcio', prompt: "Replace the model's outfit with an ancient Egyptian-inspired attire made of fine linen, gold-toned accessories, and layered fabrics illuminated with warm cinematic lighting to accentuate surface realism and subtle shine." },
                { name: 'Romano', prompt: "Replace the model's outfit with a Roman-era toga or armor set, displaying detailed fabric drape and metallic reflections under directional lighting revealing craftsmanship, realism, and tactile material contrast." },
                { name: 'Mariachi', prompt: "Replace the model's outfit with a traditional Mariachi 'traje de charro', featuring intricate 'botonadura' (silver buttons) and embroidery on fine wool, under crisp studio lighting that highlights the metallic reflections and deep fabric texture." },
                { name: 'Hanfu', prompt: "Replace the model's outfit with a traditional Chinese Hanfu, characterized by flowing, wide sleeves and layered robes of silk or brocade, under soft, diffused lighting that beautifully captures the garment's graceful drape and intricate patterns." },
                { name: 'Bávaro', prompt: "Replace the model's outfit with traditional Bavarian attire (Lederhosen or Dirndl), showcasing detailed embroidery, leather textures, and crisp linen, under warm, festive lighting that enhances the handcrafted, authentic material realism." },
                { name: 'Dashiki', prompt: "Replace the model's outfit with a vibrant West African Dashiki, known for its colorful embroidery around the neckline, made of rich cotton, under bright, natural light that makes the colors pop and highlights the threadwork." },
                { name: 'Flamenca', prompt: "Replace the model's outfit with a Spanish 'traje de flamenca', featuring a form-fitting body and voluminous 'volantes' (ruffles) in polka-dot fabric, under dramatic, warm lighting that emphasizes the costume's dynamic shape and textile layers." },
                { name: 'Hawaiano', prompt: "Replace the model's outfit with a vibrant Hawaiian Aloha shirt featuring bold floral prints, paired with casual shorts or a flowing muumuu dress, under bright tropical sunlight with a lei garland adding color, highlighting the relaxed island fabrics and joyful realism." },
                { name: 'Árabe', prompt: "Replace the model's outfit with an elegant Arabic thawb or flowing abaya featuring subtle embroidery, paired with a traditional keffiyeh or hijab, under warm desert sunset lighting that emphasizes the delicate fabric, graceful drape, and intricate textile patterns." }
            ]
        },
        {
            name: 'Profesional', icon: '💼', prompt: "Replace the model's outfit with a professional uniform rendered with true-to-life materials, stitching accuracy, and soft cinematic lighting emphasizing cleanliness, detail, and functional design realism.", subcategories: [
                { name: 'Médico', prompt: "Replace the model's outfit with a doctor's uniform including a clean white coat, realistic fabric folds, and subtle reflections, illuminated softly to convey professionalism and authentic texture balance." },
                { name: 'Chef', prompt: "Replace the model's outfit with a chef uniform featuring crisp cotton, structured buttons, and a hat, rendered under soft neutral lighting emphasizing tactile realism and fabric depth." },
                { name: 'Piloto', prompt: "Replace the model's outfit with an airline pilot uniform made of pressed dark fabric with metallic accents, illuminated by cinematic rim lighting enhancing detail, sheen, and texture fidelity." },
                { name: 'Bombero', prompt: "Replace the model's outfit with a firefighter uniform showing matte protective textures and reflective strips, under dynamic lighting enhancing the tactile realism and light absorption of the fabric." },
                { name: 'Astronauta', prompt: "Replace the model's outfit with a modern astronaut spacesuit featuring technical material layers, subtle reflections, and high dynamic lighting enhancing the realism of the composite and contours." },
                { name: 'Científico', prompt: "Replace the model's outfit with a realistic scientist lab coat and inner garments rendered with smooth cotton texture and cinematic soft light emphasizing cleanliness and micro-texture fidelity." },
                { name: 'Juez', prompt: "Replace the model's outfit with a judge's robe made of heavy black fabric, featuring voluminous sleeves and a formal collar, under solemn, directional lighting that emphasizes the deep folds and authoritative, matte texture." },
                { name: 'Militar', prompt: "Replace the model's outfit with a modern military combat uniform, featuring a digital camouflage pattern on durable ripstop fabric and a tactical vest, under neutral, clear lighting that reveals the complex textures and functional realism." },
                { name: 'Policía', prompt: "Replace the model's outfit with a police officer uniform, including a dark, crisp-pressed shirt, utility belt with gear, and badge, rendered with clean, direct lighting that highlights the badge's metallic sheen and the fabric's durable weave." },
                { name: 'Mecánico', prompt: "Replace the model's outfit with a mechanic's jumpsuit (coveralls), made of heavy-duty cotton, realistically stained with grease, under bright workshop lighting that highlights the worn texture and fabric's tactile quality." },
                { name: 'Buzo', prompt: "Replace the model's outfit with a full scuba diver suit, including a neoprene wetsuit, mask, and BCD vest, rendered with lighting that simulates underwater caustics, highlighting the suit's texture and gear's reflective surfaces." },
                { name: 'Camarero', prompt: "Replace the model's outfit with an elegant waiter uniform featuring a crisp white shirt, black vest, bow tie, and a long apron, under warm restaurant lighting that emphasizes the pressed fabric, professional presentation, and refined texture." }
            ]
        },
        {
            name: 'Época', icon: '🕰️', prompt: "Replace the model's outfit with a historically accurate period costume featuring authentic fabrics, realistic tailoring, and balanced cinematic lighting to enhance texture depth and timeless visual richness.", subcategories: [
                { name: 'Medieval', prompt: "Replace the model's outfit with a medieval-style ensemble of layered leather and linen, detailed seams, and subtle metallic accents illuminated with warm directional light for handcrafted realism." },
                { name: 'Años 20', prompt: "Replace the model's outfit with a 1920s flapper dress or tailored suit featuring fine beading or pinstripes, under soft art-deco lighting highlighting textures and period-correct materials." },
                { name: 'Años 50', prompt: "Replace the model's outfit with a 1950s rockabilly look including polished leather, cotton fabrics, and defined silhouettes, illuminated with nostalgic soft light enhancing shape and textile realism." },
                { name: 'Años 70', prompt: "Replace the model's outfit with a 1970s disco-inspired attire showcasing glossy synthetic fabrics and metallic accents, under vibrant cinematic lighting emphasizing texture and realistic sheen." },
                { name: 'Años 80', prompt: "Replace the model's outfit with a bold 1980s fashion style including bright fabrics, layered textures, and reflective surfaces, rendered under soft colored lighting enhancing realism and fabric complexity." },
                { name: 'Años 90', prompt: "Replace the model's outfit with a 1990s grunge-inspired ensemble made of worn denim, flannel, and cotton layers, captured under diffused neutral lighting to enhance tactile realism and depth." },
                { name: 'Futurista', prompt: "Replace the model's outfit with a futuristic sci-fi costume of synthetic metallic fabrics and ergonomic lines, rendered with precise directional lighting emphasizing high-tech realism and clean material definition." },
                { name: 'Victoriano', prompt: "Replace the model's outfit with an elaborate Victorian-era costume, such as a bustle dress with corset, featuring rich velvet, lace, and brocade, under soft, gaslight-style lighting that enhances the luxurious textures and complex layers." },
                { name: 'Regencia', prompt: "Replace the model's outfit with a Regency-era ensemble, like an empire-waist muslin dress or a tailcoat with cravat, under soft, natural window light that emphasizes the delicate fabrics and elegant, clean silhouettes." },
                { name: 'Años 60', prompt: "Replace the model's outfit with a 1960s 'Swinging London' look, featuring a bold geometric print mini-dress or a mod suit, under bright, high-contrast studio lighting that highlights the pop-art colors and synthetic fabric textures." },
                { name: 'Antigua Grecia', prompt: "Replace the model's outfit with an Ancient Greek chiton or peplos, made of flowing, draped linen, secured with fibulae, under warm Mediterranean sunlight that beautifully defines the cascading folds and natural fabric." },
                { name: 'Renacimiento', prompt: "Replace the model's outfit with an opulent Renaissance costume, featuring slashed sleeves, heavy brocade, and velvet doublets or gowns, under a rich, painterly light that highlights the intricate details and fabric's immense depth." }
            ]
        },
        {
            name: 'Superhéroe', icon: '🦸', prompt: "Replace the model's outfit with an ultra-detailed superhero costume rendered with lifelike materials, complex lighting, and physical accuracy, preserving anatomy, contours, and texture realism of the model.", subcategories: [
                { name: 'Superman', prompt: "Replace the model's outfit with a hyperrealistic Superman suit made of stretch fabric and embossed details, illuminated with cinematic highlights enhancing texture depth and authentic color brilliance." },
                { name: 'Batman', prompt: "Replace the model's outfit with a dark, tactical Batman suit made of armored materials and matte surfaces, rendered under low-key lighting emphasizing sculpted realism and surface contrast." },
                { name: 'Iron Man', prompt: "Replace the model's outfit with sleek metallic Iron Man armor featuring realistic reflections, micro-scratches, and balanced highlights to convey polished surface realism and physical believability." },
                { name: 'Spiderman', prompt: "Replace the model's outfit with a detailed Spiderman suit showing fabric mesh pattern, tensioned elasticity, and accurate lighting reflections revealing depth and material fidelity." },
                { name: 'Hulk', prompt: "Replace the model's outfit with torn purple shorts revealing skin-texture realism, under balanced lighting emphasizing surface detail, shadow transition, and lifelike anatomical fidelity." },
                { name: 'Wonder Woman', prompt: "Replace the model's outfit with a Wonder Woman armor made of brushed metal and leather, illuminated with cinematic highlights emphasizing realistic texture depth and handcrafted material contrast." },
                { name: 'Capitán América', prompt: "Replace the model's outfit with a hyperrealistic Captain America suit, emphasizing the scaled armor texture, leather straps, and metallic sheen of the shield, under bright, cinematic lighting that highlights heroism and material definition." },
                { name: 'Black Panther', prompt: "Replace the model's outfit with the intricate Black Panther suit, made of vibranium-weave texture that absorbs and reflects light, under cool, dramatic lighting that emphasizes its sleek, alien technology and sculpted muscular form." },
                { name: 'Thor', prompt: "Replace the model's outfit with Asgardian armor (Thor), featuring chainmail, a flowing red cape, and metallic plates, under dynamic, stormy lighting that highlights the weathered metal, cape's heavy fabric, and divine realism." },
                { name: 'Capitana Marvel', prompt: "Replace the model's outfit with a Captain Marvel suit, capturing the technical fabric, metallic gold accents, and an ethereal glow, under powerful, high-energy lighting that enhances the suit's contours and cosmic power." },
                { name: 'Deadpool', prompt: "Replace the model's outfit with a tactical Deadpool suit, showcasing the detailed red and black fabric weave, leather harnesses, and weathered katanas, under dynamic, action-oriented lighting that highlights the suit's texture and realistic wear." },
                { name: 'Flash', prompt: "Replace the model's outfit with a hyperrealistic Flash suit, made of crimson aerodynamic fabric with ribbed texture and gold metallic accents, rendered with dynamic motion blur and crackling energy lighting that emphasizes speed and material fidelity." },
                { name: 'Aquaman', prompt: "Replace the model's outfit with a photorealistic Aquaman suit, featuring iridescent, scale-like armor in gold and green, and metallic gauntlets, under dramatic underwater lighting (caustics) that highlights the armor's sheen and tactile, waterproof texture." },
                { name: 'Doctor Strange', prompt: "Replace the model's outfit with a Doctor Strange costume, featuring the layered, heavy-weave 'Cloak of Levitation' in red, and blue tunic, under mystical, glowing light from spell sigils that highlights the intricate fabric textures and golden amulet." },
                { name: 'Ant-Man', prompt: "Replace the model's outfit with a detailed Ant-Man suit, capturing the segmented, high-tech design in red and black, with metallic piping and helmet, under clean studio lighting that emphasizes the mix of leather-like textures and polished metal components." },
                { name: 'Vision', prompt: "Replace the model's outfit with the synthetic body of Vision, showcasing the complex musculature, metallic sheen, and flowing yellow cape, under soft, ethereal lighting that highlights the suit's otherworldly texture and the glowing Mind Stone." },
                { name: 'Black Widow', prompt: "Replace the model's outfit with a tactical Black Widow catsuit, made of sleek, form-fitting black synthetic material with utility belts, under cool, low-key lighting that highlights the suit's stealthy texture and realistic material flexing." },
                { name: 'Silver Surfer', prompt: "Replace the model's outfit with the iconic Silver Surfer's liquid-metal skin, rendered with extreme, high-key cosmic lighting that emphasizes the flawless, mirror-like chrome reflections and smooth, anatomical contours." },
                { name: 'Luke Cage', prompt: "Replace the model's outfit with Luke Cage's signature look, featuring a torn yellow t-shirt and denim jeans, showcasing bullet holes on the fabric, under gritty urban lighting that highlights the contrast between the soft cotton and his invulnerable skin." },
                { name: 'Storm', prompt: "Replace the model's outfit with Storm's costume, a sleek white or black ensemble with a flowing cape, under dynamic, stormy lighting with lightning flashes that illuminate the suit's texture and the model's glowing eyes with photorealistic intensity." },
                { name: 'Cyclops', prompt: "Replace the model's outfit with a Cyclops suit, a dark blue tactical X-Men uniform made of durable fabric with yellow accents and a high-tech ruby-quartz visor, under neutral lighting that highlights the visor's metallic sheen and the suit's practical texture." },
                { name: 'Professor X', prompt: "Replace the model's outfit with Professor X's classic look, a sharp, professional business suit (e.g., in fine wool) while seated in his high-tech chrome wheelchair, under soft, intellectual lighting that emphasizes the suit's tailoring and the chair's polished surfaces." },
                { name: 'Supergirl', prompt: "Replace the model's outfit with a hyperrealistic Supergirl suit, featuring the iconic blue stretch fabric and red cape, with an embossed 'S' shield, under bright, optimistic sunlight that highlights the vibrant colors and fine material weave." },
                { name: 'Batgirl', prompt: "Replace the model's outfit with a tactical Batgirl suit, made of dark, armored plates, reinforced fabric, and a utility belt, under moody, low-key Gotham lighting that emphasizes the material contrast between matte fabric and armored sections." },
                { name: 'Catwoman', prompt: "Replace the model's outfit with a sleek Catwoman catsuit, made of glossy black leather or PVC, with a cowl and goggles, rendered under high-contrast lighting that creates sharp reflections and emphasizes the suit's tight, second-skin realism." },
                { name: 'Ghost Rider', prompt: "Replace the model's outfit with a Ghost Rider ensemble, featuring a weathered leather biker jacket, chains, and denim, with the head replaced by a photorealistic flaming skull, under dark, fiery lighting that casts dramatic shadows." },
                { name: 'She-Hulk', prompt: "Replace the model's outfit with a torn professional blouse and skirt (She-Hulk), revealing realistic green skin muscle definition, under bright, balanced lighting that highlights the fabric distress and realistic skin-tone transition." }
            ]
        },
        {
            name: 'Fantasía', icon: '🧙', prompt: "Replace the model's outfit with a fantasy-inspired costume featuring layered materials, magical luminosity, and soft cinematic lighting emphasizing ethereal realism and handcrafted textile detail.", subcategories: [
                { name: 'Elfo', prompt: "Replace the model's outfit with an elegant elven attire composed of silk, velvet, and metallic ornaments, rendered with luminous soft light revealing fine textures and smooth tonal gradients." },
                { name: 'Vikingo', prompt: "Replace the model's outfit with a rugged Viking outfit made of fur, leather, and metal, captured under warm cinematic lighting highlighting tactile realism and authentic material wear." },
                { name: 'Hada', prompt: "Replace the model's outfit with a fairy costume featuring translucent fabrics, glowing wings, and iridescent accents, illuminated with soft diffused light enhancing ethereal realism and fabric shimmer." },
                { name: 'Mago', prompt: "Replace the model's outfit with a wizard robe crafted from heavy woven fabric and detailed accessories, rendered with balanced cinematic lighting emphasizing texture realism and depth." },
                { name: 'Enano', prompt: "Replace the model's outfit with rugged dwarven armor, featuring heavy steel plates, intricate gold inlays, and thick fur lining, under a hard, forge-like light that emphasizes the hammered metal textures and solid, geometric realism." },
                { name: 'Orco', prompt: "Replace the model's outfit with a brutal orcish armor set, composed of salvaged metal plates, raw leather straps, and bone trophies, under harsh, gritty lighting that highlights the crude craftsmanship and battle-worn surfaces." },
                { name: 'Caballero', prompt: "Replace the model's outfit with a full suit of polished plate armor, complete with a helmet and chainmail, under bright directional light that creates brilliant highlights, deep shadows, and shows every scratch and reflection with photoreal precision." },
                { name: 'Sacerdotisa', prompt: "Replace the model's outfit with the flowing robes of a fantasy priestess, made of layered white and gold silk, with mystical sigils, under a soft, divine light that gives the garment an ethereal glow and realistic drape." },
                { name: 'Ladrón', prompt: "Replace the model's outfit with a stealthy rogue's attire, featuring dark, form-fitting leather armor, a hooded cloak, and multiple belts, under low-key, shadowy lighting that emphasizes the material's texture and silhouette." },
                { name: 'Druida', prompt: "Replace the model's outfit with a mystical druid's attire made of natural bark-like armor plates, leafy cloak, woven vines, and wooden staff, under dappled forest light that highlights the organic textures and earthy, primal realism." },
                { name: 'Bárbaro', prompt: "Replace the model's outfit with a fearsome barbarian outfit featuring fur-lined leather harness, animal pelts, fur boots, and tribal paint, under a harsh northern light that emphasizes the rugged, untamed wilderness aesthetic and realistic fur density." },
                { name: 'Nigromante', prompt: "Replace the model's outfit with a menacing necromancer's robe made of tattered black silk, adorned with skull motifs, bone pauldrons, and a dark staff, under an eerie purple necrotic glow that highlights the sinister textures and shadowy presence." }
            ]
        },
        {
            name: 'Alternativo', icon: '🤘', prompt: "Replace the model's outfit with an alternative subculture-inspired look featuring layered materials, striking contrasts, and realistic lighting enhancing texture accuracy and style authenticity.", subcategories: [
                { name: 'Gótico', prompt: "Replace the model's outfit with a gothic ensemble made of dark velvet, lace, and leather textures illuminated with soft moody light emphasizing depth, realism, and fine textile contrast." },
                { name: 'Punk', prompt: "Replace the model's outfit with a punk rock outfit featuring distressed leather, metal studs, and vivid fabric layers, under cinematic lighting accentuating grit, texture, and realistic reflections." },
                { name: 'Steampunk', prompt: "Replace the model's outfit with a steampunk inventor outfit made of leather, brass, and fabric layers, illuminated by warm cinematic light revealing detailed textures and material authenticity." },
                { name: 'Cyberpunk', prompt: "Replace the model's outfit with a futuristic cyberpunk attire featuring synthetic fabrics, neon accents, and glossy surfaces, rendered under cool directional lighting enhancing realistic reflections and contrast." },
                { name: 'Emo', prompt: "Replace the model's outfit with an 'emo' style look, featuring a tight-fitting band t-shirt, skinny jeans, and a studded belt, under moody, high-contrast lighting that emphasizes the dark colors and layered, personal aesthetic." },
                { name: 'Metalero', prompt: "Replace the model's outfit with a 'metalhead' style, including a distressed black band t-shirt, leather jacket or denim vest with patches, and worn-out jeans, under dramatic, concert-style lighting that highlights the rough textures." },
                { name: 'Skater', prompt: "Replace the model's outfit with a 'skater' look, featuring a loose-fitting graphic hoodie, baggy pants, and skate shoes, under bright, outdoor skate-park lighting that emphasizes the casual fit and cotton/canvas textures." },
                { name: 'Hip-Hop 90s', prompt: "Replace the model's outfit with an 'old school' hip-hop style, including a colorful tracksuit or baggy denim, and oversized chains, under bright, urban lighting that makes the synthetic fabrics and metallic jewelry shine realistically." },
                { name: 'Rave', prompt: "Replace the model's outfit with a 'rave' costume, featuring bright neon colors, fuzzy materials, and futuristic accessories, under UV or strobing light effects that highlight the fluorescent and reflective properties of the materials." },
                { name: 'Visual Kei', prompt: "Replace the model's outfit with a dramatic Visual Kei Japanese rock style featuring elaborate hair, theatrical makeup, layered gothic-punk attire with lace, leather straps, and platform boots, under dramatic concert stage lighting that emphasizes the detailed, androgynous aesthetic." },
                { name: 'Lolita', prompt: "Replace the model's outfit with an elegant Japanese Lolita fashion ensemble featuring a bell-shaped knee-length dress with lace, ribbons, petticoat, knee-high socks, and a bonnet or headdress, under soft, storybook lighting that highlights the delicate, doll-like silhouette and fabric details." },
                { name: 'Industrial', prompt: "Replace the model's outfit with an industrial music subculture look featuring black PVC clothing, military-style boots, gas mask accessory, and cyber-goth neon accents, under harsh, warehouse lighting with strobe effects that emphasize the synthetic textures and dystopian vibe." }
            ]
        },
        {
            name: 'Invierno', icon: '❄️', prompt: "Replace the model's outfit with a stylish winter ensemble featuring warm, layered fabrics, cozy textures, and soft cold-weather lighting that enhances the seasonal coziness and photorealistic material depth.", subcategories: [
                { name: 'Abrigo Largo', prompt: "Replace the model's outfit with an elegant long wool coat in a neutral color, layered over a turtleneck sweater and tailored trousers, under crisp winter daylight that highlights the coat's smooth drape and fine wool texture." },
                { name: 'Parka', prompt: "Replace the model's outfit with a practical fur-lined parka featuring a waterproof shell, hood with faux-fur trim, rugged boots, and insulated gloves, under a snowy outdoor light that emphasizes the cold-weather functionality and material resilience." },
                { name: 'Chaqueta Acolchada', prompt: "Replace the model's outfit with a stylish puffer jacket in a bold color, paired with slim-fit jeans and winter boots, under crisp cold lighting that highlights the quilted texture and glossy fabric finish." },
                { name: 'Gorro y Bufanda', prompt: "Replace the model's outfit with a cozy winter look centered on a chunky knit beanie, an oversized scarf, a wool peacoat, and leather gloves, under soft, overcast winter light that emphasizes the knitted textures and warm layers." },
                { name: 'Traje de Nieve', prompt: "Replace the model's outfit with a full snowsuit or ski onesie featuring insulated, waterproof fabric, bold color-blocking, and technical zippers, under bright alpine sunlight reflecting off snow, highlighting the suit's smooth finish and cold-weather practicality." },
                { name: 'Estilo Nórdico', prompt: "Replace the model's outfit with a traditional Nordic-inspired winter look featuring a Fair Isle knit sweater with intricate patterns, wool trousers, fur-lined boots, and a knitted hat, under soft fireplace-like light that enhances the rustic textures and warm colors." },
                { name: 'Gabardina', prompt: "Replace the model's outfit with a classic double-breasted trench coat in beige, layered over a fine merino sweater, dark trousers, and leather gloves, under misty, sophisticated city lighting that emphasizes the coat's timeless cut and fabric quality." },
                { name: 'Capa', prompt: "Replace the model's outfit with a dramatic winter cape or cloak made of heavy wool, featuring a clasp closure, thick lining, and elegant draping, under moody winter light that enhances the volume, movement, and rich fabric realism." },
                { name: 'Estilo Alpino', prompt: "Replace the model's outfit with a Swiss alpine winter look featuring a boiled wool jacket, embroidered details, corduroy trousers, and hiking boots, under clear mountain light that highlights the authentic, handcrafted fabric textures." },
                { name: 'Piel Sintética', prompt: "Replace the model's outfit with a glamorous faux-fur coat in a luxurious color, paired with sleek leather trousers, heeled boots, and statement accessories, under evening city light that emphasizes the plush fur texture and sophisticated winter fashion." },
                { name: 'Tweed', prompt: "Replace the model's outfit with a refined country winter ensemble featuring a tailored tweed blazer, cashmere sweater, wool trousers, and leather brogues, under soft, low winter sunlight that highlights the classic patterns and textured wool weave." },
                { name: 'Térmico Deportivo', prompt: "Replace the model's outfit with a high-performance winter sports look featuring thermal compression layers, a lightweight insulated jacket, fleece-lined leggings, and waterproof trail shoes, under crisp morning light that highlights the technical fabrics and athletic cut." }
            ]
        },
        {
            name: 'Verano', icon: '☀️', prompt: "Replace the model's outfit with a breezy summer look featuring lightweight fabrics, vibrant colors, and bright natural sunlight that enhances the airy textures and relaxed seasonal realism.", subcategories: [
                { name: 'Vestido Veraniego', prompt: "Replace the model's outfit with a flowing floral sundress made of lightweight cotton, featuring a flattering cut, spaghetti straps, and a ruffled hem, under golden hour sunlight that enhances the fabric's movement, print vibrancy, and effortless femininity." },
                { name: 'Camiseta y Shorts', prompt: "Replace the model's outfit with a classic summer casual combo of a soft cotton t-shirt and relaxed-fit shorts, paired with sandals or sneakers, under bright midday sunlight that highlights the casual comfort and sun-kissed realism." },
                { name: 'Traje de Baño', prompt: "Replace the model's outfit with a stylish swimsuit or bikini paired with a sheer cover-up sarong or kaftan, under intense tropical beach light with sparkling water reflections, emphasizing the fabric's wet-look texture and summery appeal." },
                { name: 'Lino Total', prompt: "Replace the model's outfit with an all-linen ensemble featuring a breathable linen shirt and matching wide-leg trousers or shorts in a light color, under warm sunlight that beautifully reveals the fabric's natural slub texture and relaxed, elegant drape." },
                { name: 'Polo y Bermudas', prompt: "Replace the model's outfit with a smart-casual summer look of a fitted polo shirt in a pastel color, tailored Bermuda shorts, and boat shoes, under crisp, clean resort lighting that highlights the neat stitching and refined textures." },
                { name: 'Vestido Camisero', prompt: "Replace the model's outfit with a classic shirt dress in light chambray or crisp cotton poplin, featuring rolled-up sleeves, a defined waist, and subtle stripe pattern, under breezy, natural light that captures its effortless, wearable sophistication." },
                { name: 'Look Bohemio', prompt: "Replace the model's outfit with a bohemian summer ensemble of a crochet or macrame top, high-waisted flowy skirt, layered beaded jewelry, and flat sandals, under warm, dappled sunlight filtering through trees, emphasizing the handcrafted textures." },
                { name: 'Mono Corto', prompt: "Replace the model's outfit with a stylish one-piece romper or playsuit made of soft rayon or cotton, featuring a playful pattern, cinched waist, and relaxed short fit, under fun, bright daylight that highlights the garment's fluid shape." },
                { name: 'Camisa Hawaiana', prompt: "Replace the model's outfit with a classic camp-collar Hawaiian shirt in a bold botanical print, worn open or closed over a plain tank top with chino shorts, under vivid tropical sunlight that makes the colors pop with photoreal brilliance." },
                { name: 'Conjunto Deportivo', prompt: "Replace the model's outfit with a sporty summer set of a cropped tank top with a built-in bra, high-waisted bike shorts, and chunky trainers, under bright urban or gym lighting that emphasizes the stretch fabric and activewear texture." },
                { name: 'Pareo', prompt: "Replace the model's outfit with a versatile sarong or pareo wrapped elegantly as a skirt or dress, featuring a vibrant batik or tie-dye print, paired with minimal sandals, under beachside golden light that highlights the fabric's fluid drape and printed details." },
                { name: 'Vestido Camiseta', prompt: "Replace the model's outfit with a relaxed, oversized t-shirt dress made of soft jersey cotton, featuring a simple, effortless silhouette and maybe a fun graphic or solid pastel color, under laid-back weekend light that emphasizes comfort and casual texture." }
            ]
        },
        {
            name: 'Fiesta', icon: '🎉', prompt: "Replace the model's outfit with a dazzling party look featuring glamorous fabrics, sparkling details, and dynamic event lighting that enhances the celebratory mood and photorealistic texture brilliance.", subcategories: [
                { name: 'Vestido Lentejuelas', prompt: "Replace the model's outfit with a show-stopping sequin dress that catches light from every angle, featuring a flattering silhouette and dazzling sparkle, under dynamic party lighting that creates a mesmerizing play of reflections on each sequin." },
                { name: 'Terciopelo', prompt: "Replace the model's outfit with a luxurious velvet suit or dress in a jewel tone like emerald or sapphire, under warm, low event lighting that emphasizes the fabric's plush pile, deep color, and rich textural realism." },
                { name: 'Mono de Fiesta', prompt: "Replace the model's outfit with a chic evening jumpsuit made of flowing crepe or silk, featuring a deep V-neck, wide legs, and elegant draping, under cocktail lounge lighting that highlights the garment's fluid movement and sophisticated sheen." },
                { name: 'Traje con Estampado', prompt: "Replace the model's outfit with a bold printed suit featuring a unique pattern (floral, baroque, or abstract) on a modern slim-fit cut, under vibrant party lighting that makes the print pop and emphasizes the modern luxury fabric." },
                { name: 'Falda de Tul', prompt: "Replace the model's outfit with a playful yet elegant tulle midi skirt in a bold color, paired with a simple fitted top, under festive, twinkling light that highlights the skirt's volume, layered transparency, and ethereal texture." },
                { name: 'Americana Brillante', prompt: "Replace the model's outfit with a statement metallic or brocade blazer worn over a simple dress or with tailored trousers, under sophisticated event lighting that enhances the luminous fabric and creates sharp, photorealistic highlights." },
                { name: 'Minivestido', prompt: "Replace the model's outfit with a chic mini dress featuring architectural details, cut-outs, or asymmetrical hemlines in a bold color, under club or party lighting that emphasizes the modern design, smooth fabric, and confident silhouette." },
                { name: 'Traje Blanco', prompt: "Replace the model's outfit with a crisp, all-white party ensemble (suit or dress) that radiates sophistication and freshness, under bright event lighting with subtle colored accents, highlighting the clean lines and pure fabric texture." },
                { name: 'Años 80 Party', prompt: "Replace the model's outfit with a retro 80s party look featuring a metallic lamé dress or jacket with exaggerated shoulders, bold accessories, and bright electro colors, under neon club lighting that amplifies the retro-futuristic fabric sheen." },
                { name: 'Accesorios Statement', prompt: "Replace the model's outfit with a simple, elegant base (like a black dress) elevated by oversized statement jewelry, a jeweled clutch, and dramatic heels, under a spotlight effect that makes the accessories' textures and sparkle central to the look." },
                { name: 'Manga Abullonada', prompt: "Replace the model's outfit with a dramatic party dress or top featuring voluminous puff sleeves in organza or taffeta, a fitted bodice, and a sleek skirt with elegant sheen under high-end gala lighting that captures the sculptural volume and luxury." },
                { name: 'Vestido con Plumas', prompt: "Replace the model's outfit with an extravagant dress adorned with delicate feather trim at the hem or sleeves, in silk or satin, showcasing movement and high-fashion flair under soft, dramatic spotlighting that emphasizes the ethereal texture and luxurious drape." }
            ]
        },
        {
            name: 'Aventura', icon: '🏕️', prompt: "Replace the model's outfit with a rugged adventure-ready ensemble featuring durable technical fabrics, practical layers, and natural outdoor lighting that enhances the tactile realism and explorer spirit.", subcategories: [
                { name: 'Safari', prompt: "Replace the model's outfit with a classic safari look featuring a khaki utility shirt with multiple pockets, matching cargo shorts or pants, a wide-brimmed hat, and sturdy boots, under harsh, golden savanna sunlight that emphasizes the rugged cotton twill texture." },
                { name: 'Trekking', prompt: "Replace the model's outfit with a full hiking gear ensemble including a moisture-wicking base layer, lightweight fleece, convertible cargo pants, and trail shoes, under crisp alpine light with panoramic views that highlights the technical fabric weave." },
                { name: 'Escalada', prompt: "Replace the model's outfit with practical rock-climbing attire featuring stretchy, abrasion-resistant pants, a breathable tank top, climbing shoes, and a chalk bag, under dramatic cliff-face lighting that emphasizes the form-fitting, flexible material." },
                { name: 'Pesca', prompt: "Replace the model's outfit with a fishing outfit including a quick-dry vented shirt, waterproof waders or cargo shorts, and a bucket hat covered with lures, under serene lakeside morning light that enhances the water-resistant fabric and outdoor realism." },
                { name: 'Campamento', prompt: "Replace the model's outfit with a cozy campsite look featuring a plaid flannel shirt, rugged denim jeans, hiking boots, and a beanie, under warm campfire glow that casts flickering shadows on the soft, lived-in fabrics." },
                { name: 'Explorador', prompt: "Replace the model's outfit with an old-world explorer costume featuring a leather flight jacket, a worn canvas shirt, whipcord trousers, and vintage binoculars, under the dramatic light of a setting sun in an uncharted landscape, highlighting textured leather and canvas." },
                { name: 'Selva', prompt: "Replace the model's outfit with a jungle expedition look comprised of a breathable long-sleeve shirt, quick-dry zip-off pants, gaiters, and a machete, under dappled, intense green canopy light that emphasizes the sweat-wicking fabric and practical gear." },
                { name: 'Desierto', prompt: "Replace the model's outfit with a desert trekking ensemble featuring a loose, light-colored tunic for sun protection, a shemagh scarf, wide linen pants, and sand goggles, under harsh, bright desert sun that highlights the protective, flowing fabrics." },
                { name: 'Montañismo', prompt: "Replace the model's outfit with a high-altitude mountaineering suit consisting of a heavy down parka, insulated salopettes, double-layer gloves, and crampon-ready boots, under the intense, thin air light of a snowy peak for maximum realism." },
                { name: 'Rafting', prompt: "Replace the model's outfit with a white-water rafting ensemble including a neoprene wetsuit, splash jacket, helmet, and PFD life vest, under dynamic river spray lighting that captures the glossy wet textures and high-energy adventure." },
                { name: 'Caza', prompt: "Replace the model's outfit with a realistic hunting outfit featuring camouflage-patterned jacket and pants made of quiet, brushed fabric, a blaze orange vest, and durable leather boots, under crisp woodland morning light that emphasizes the stealth-oriented, functional textures." },
                { name: 'Fotógrafo Naturaleza', prompt: "Replace the model's outfit with a wildlife photographer's practical gear, including a multi-pocketed photographer's vest, neutral-toned durable shirt and trousers, and a camera with a large telephoto lens on a strap, under magical golden hour light that highlights the functional fabrics." }
            ]
        },
        {
            name: 'Romántico', icon: '💕', prompt: "Replace the model's outfit with a soft, romantic look featuring delicate fabrics, gentle colors, and dreamy lighting that enhances the tender, intimate aesthetic and photorealistic fabric softness.", subcategories: [
                { name: 'Cena Romántica', prompt: "Replace the model's outfit with an elegant dinner date look featuring a silk wrap dress or a soft cashmere jumper with tailored trousers, under warm, intimate candlelit lighting that emphasizes the luxurious fabric sheen and romantic atmosphere." },
                { name: 'Boda', prompt: "Replace the model's outfit with a stunning wedding guest or bridal outfit, such as a chiffon midi dress with floral embroidery or a formal morning suit, under soft, romantic natural light with bokeh effects that highlights the delicate fabrics and joyous elegance." },
                { name: 'Aniversario', prompt: "Replace the model's outfit with a celebratory yet intimate anniversary ensemble, like a champagne-colored satin gown or a velvet dinner jacket, under sophisticated low-light with sparkling accents that enhance the rich, romantic fabric quality." },
                { name: 'Paseo al Atardecer', prompt: "Replace the model's outfit with a romantic evening stroll look, like a soft, oversized knit sweater worn over a flowy midi skirt, under the golden-orange light of a stunning sunset that creates a warm, flattering glow on the cozy, soft fabrics." },
                { name: 'Picnic', prompt: "Replace the model's outfit with a charming picnic date look, featuring a vintage-inspired gingham dress or a relaxed linen shirt with rolled chinos, under dappled sunlight filtering through leaves in a park, highlighting the fresh, cheerful fabric textures." },
                { name: 'Vestido Encaje', prompt: "Replace the model's outfit with a timeless lace dress in a soft pastel or ivory color, featuring delicate scalloped edges and a flattering fit, under soft, diffused window light that enhances the intricate lace patterns and ethereal texture." },
                { name: 'Seda Fluida', prompt: "Replace the model's outfit with a bias-cut silk slip dress or camisole and skirt set that drapes elegantly over the body, under smooth, glamorous boudoir lighting that emphasizes the liquid-like sheen and sensuous movement of the silk." },
                { name: 'Traje Color Claro', prompt: "Replace the model's outfit with a romantic, modern suit in a soft color like blush pink or light blue, made of lightweight wool or linen, worn with a simple white tee, under bright, airy daylight that highlights the gentle hue and textile finish." },
                { name: 'Estilo Campestre', prompt: "Replace the model's outfit with a rustic romantic look featuring a prairie-style dress with puffed sleeves, a corset-style bodice, and a flowy midi skirt in a small floral print, under soft countryside light that emphasizes the natural, breathable fabrics." },
                { name: 'Chaqueta de Punto', prompt: "Replace the model's outfit with a cozy-chic look featuring a long, fine-gauge cardigan or duster coat layered over a camisole and tailored pants, under moody, soft-focus evening light that highlights the cozy knitted texture and graceful silhouette." },
                { name: 'Drapeado Griego', prompt: "Replace the model's outfit with a Grecian-inspired draped gown made of matte jersey, with an asymmetrical neckline and elegant gathering, under the dramatic light of a golden hour beach or terrace, showcasing the sculptural folds and soft fabric weight." },
                { name: 'Estilo Príncipe/Princesa', prompt: "Replace the model's outfit with a romantic, modern take on royalty, like a high-collar blouse with ruffled jabot and velvet trousers, or an off-the-shoulder satin top with a voluminous skirt, under soft, majestic palace lighting that looks straight out of a fairy tale." }
            ]
        },
        {
            name: 'Lujo', icon: '💎', prompt: "Replace the model's outfit with a high-fashion luxury look featuring premium materials, designer silhouettes, and sophisticated studio illumination that screams opulence and photorealistic haute couture.", subcategories: [
                { name: 'Alta Costura', prompt: "Replace the model's outfit with a bespoke haute couture gown featuring hand-sewn embroidery, dramatic volume, and architectural structure, under intense, high-contrast runway spotlighting that reveals every artisanal stitch and luxurious material." },
                { name: 'Traje a Medida', prompt: "Replace the model's outfit with a perfectly tailored bespoke suit made from Super 180s wool or vicuña, with a handmade shirt, silk tie, and polished oxfords, under the refined lighting of a luxury atelier emphasizing the impeccable fit and fabric." },
                { name: 'Piel y Cuero', prompt: "Replace the model's outfit with a luxury leather ensemble featuring a buttery-soft leather trench coat or fitted jacket, paired with fine cashmere and silk accessories, under dramatic, high-contrast lighting that highlights the leather sheen and premium texture." },
                { name: 'Capa de Diseñador', prompt: "Replace the model's outfit with a dramatic designer cape or opera coat made of double-faced cashmere or silk gazar, featuring bold lines and a sweeping silhouette, under theatrical, wind-swept lighting that emphasizes the volume and luxury." },
                { name: 'Joyas', prompt: "Replace the model's outfit with a simple, elegant black column dress or tuxedo as a canvas for an extraordinary display of high-jewelry: a diamond rivière necklace, chandelier earrings, and cocktail rings, under pinpoint lighting that creates stunning sparkle and reflections." },
                { name: 'Abrigo de Pieles', prompt: "Replace the model's outfit with a floor-length faux fur coat in a dramatic color or pattern, thrown over a glamorous evening dress, under the flash of paparazzi cameras that highlights the plush, voluminous texture and old-Hollywood allure." },
                { name: 'Esmoquin Blanco', prompt: "Replace the model's outfit with a flawless white dinner jacket ensemble paired with black trousers, a wing-collar shirt, and a cummerbund, under the dazzling light of a luxury gala or red carpet, emphasizing the stark contrast and immaculate fit." },
                { name: 'Vestido de Gala', prompt: "Replace the model's outfit with a custom ball gown made of duchesse satin or mikado, with a corseted bodice and a majestic full skirt, under the chandelier-lit splendor of a grand ballroom that highlights the fabric's structural weight and subtle sheen." },
                { name: 'Moda de Pasarela', prompt: "Replace the model's outfit with an avant-garde runway look that defies convention: think exaggerated proportions, mixed unconventional materials (plastic, metal mesh, feathers), and a conceptual silhouette, under stark, futuristic catwalk lighting for high-impact realism." },
                { name: 'Monogramas', prompt: "Replace the model's outfit with a head-to-toe designer logo/monogram print ensemble, such as a matching silk shirt and pants or a full dress featuring a signature pattern, under high-end boutique lighting that makes the recognizable print and silk sheen pop." },
                { name: 'Cashmere', prompt: "Replace the model's outfit with an understated yet astronomically expensive look featuring a simple, flawless cashmere sweater, elegantly draped trousers, and minimal accessories, under a pure, soft light that reveals the incredible depth, softness, and halo of the fine fibers." },
                { name: 'Vestido Vintage', prompt: "Replace the model's outfit with a museum-grade vintage designer dress (like a 1950s Dior New Look or a 1970s Halston), impeccably preserved, with period-appropriate accessories, under classic studio lighting that honors the garment's historical fabric and silhouette." }
            ]
        },
        {
            name: 'Rockero', icon: '🎸', prompt: "Replace the model's outfit with an edgy rock and roll look featuring leather, denim, metallic hardware, and dramatic stage lighting that captures the raw energy and photorealistic texture of rock fashion.", subcategories: [
                { name: 'Cuero Total', prompt: "Replace the model's outfit with an all-black leather ensemble: a classic biker jacket, skinny leather pants, and heavy boots, under the smoky, backlit atmosphere of a rock venue that highlights the glossy, worn-in leather texture." },
                { name: 'Glam Rock', prompt: "Replace the model's outfit with a 70s glam rock look featuring metallic silver trousers, a sequined or lurex top, platform boots, and glitter makeup, under colorful, sweeping stage spotlights that create dazzling reflections and a theatrical vibe." },
                { name: 'Grunge', prompt: "Replace the model's outfit with a 90s grunge rock look featuring a worn flannel tied around the waist, a faded vintage band tee, ripped black denim, and combat boots, under gritty, low-light venue lighting that emphasizes the raw, distressed textures." },
                { name: 'Punk Rock', prompt: "Replace the model's outfit with a hardcore punk style featuring a patched denim vest over a torn t-shirt, plaid bondage trousers, studded belt, and Dr. Martens, under harsh, anarchic lighting that highlights the DIY attitude and tactile material contrasts." },
                { name: 'Indie Rock', prompt: "Replace the model's outfit with a modern indie rock look: a slim-fit blazer over a graphic tee, dark skinny jeans, desert boots or sneakers, and a slouched beanie, under the cool, blue-tinged light of a trendy club, emphasizing a relaxed, artistic texture." },
                { name: 'Heavy Metal', prompt: "Replace the model's outfit with a metalhead style featuring a battle jacket (denim vest with band patches), black band t-shirt, black cargo pants, and chains, under dramatic, fiery red stage lighting that highlights the metal hardware and worn fabric." },
                { name: 'Rockabilly', prompt: "Replace the model's outfit with a classic rockabilly look: a polka-dot swing dress or a bowling shirt and cuffed jeans, with a pompadour-inspired hair accessory, under the warm, nostalgic neon glow of a retro diner that emphasizes the vintage cotton and leather." },
                { name: 'Guitarrista', prompt: "Replace the model's outfit with a lead guitarist's stage outfit: a flamboyant silk or velvet jacket, ripped skinny jeans, and a guitar strapped on, under a dramatic solo spotlight that accentuates the fluid fabric movement and stage presence." },
                { name: 'Estilo Grupo', prompt: "Replace the model's outfit as a member of a coordinated band, with a matching custom stage suit (like the Beatles' Sgt. Pepper or matching leather jackets) under vibrant, synchronized concert lighting that highlights the group identity and uniform fabric." },
                { name: 'Folk Rock', prompt: "Replace the model's outfit with an earthy folk-rock musician look featuring a suede fringed jacket, embroidered cotton shirt, corduroy trousers, and leather boots, under the warm, organic light of an acoustic set, highlighting the natural, tactile materials." },
                { name: 'Riñonera y Accesorios', prompt: "Replace the model's outfit with a practical yet stylish festival rock look, featuring a colorful printed shirt, shorts, a utility belt or cross-body bag, and funky sunglasses, under bright, sunny outdoor concert light that emphasizes the vibrant casual textures." },
                { name: 'Cantante Principal', prompt: "Replace the model's outfit with a charismatic frontperson's outfit designed to captivate: a striking one-of-a-kind coat (like a gold metallic trench), ripped fishnets, and bold makeup, under a white-hot center-stage spotlight that demands all attention on the unique fabric and persona." }
            ]
        },
        {
            name: 'Vintage', icon: '📻', prompt: "Replace the model's outfit with a carefully curated vintage look from a specific era, featuring period-accurate fabrics, cuts, and nostalgic lighting that captures authentic retro texture and timeless charm.", subcategories: [
                { name: 'Años 40', prompt: "Replace the model's outfit with a 1940s wartime-era look featuring an A-line utility dress or high-waisted, wide-leg trousers with a fitted blouse, under soft, sepia-toned light that emphasizes the practical, sturdy fabric and elegant silhouette." },
                { name: 'Pin-Up', prompt: "Replace the model's outfit with a classic 1950s pin-up style: a high-waisted polka dot bikini or a wiggle dress with a sweetheart neckline, accessorized with a headscarf, under bright, saturated Technicolor-inspired lighting that highlights the playful femininity." },
                { name: 'Mod Sixties', prompt: "Replace the model's outfit with a swinging 60s mod look: a color-block mini dress with a geometric pattern, white go-go boots, and a pillbox hat, under bright, high-contrast pop-art lighting that emphasizes the bold synthetic fabric and graphic shapes." },
                { name: 'Hippie 70s', prompt: "Replace the model's outfit with a free-spirited 70s hippie ensemble: bell-bottom jeans with embroidered patches, a peasant blouse, a suede vest with fringe, and a flower crown, under warm, hazy, sun-drenched light that enhances the natural textures." },
                { name: 'Ochentero', prompt: "Replace the model's outfit with a bold 80s look: an oversized graphic sweatshirt or a power-shoulder blazer in neon colors, paired with acid-wash jeans or stirrup pants, under the bright, geometric neon light of an 80s arcade, emphasizing synthetic textures." },
                { name: 'Vintage Deportivo', prompt: "Replace the model's outfit with a retro sportswear look: a classic varsity jacket with leather sleeves, a vintage-inspired track jacket, sweatpants, and old-school sneakers, under gymnasium lighting that highlights the satin sheen and chenille patches." },
                { name: 'Dandy', prompt: "Replace the model's outfit with an Edwardian or 1920s dandy style: a three-piece suit with a waistcoat and pocket watch, a wing-collar shirt, and a boater hat, under the soft, sepia light of an old photograph, capturing the refined wool and linen textures." },
                { name: 'Flapper', prompt: "Replace the model's outfit with a dazzling 1920s flapper dress adorned with cascading fringe, intricate beading, and a dropped waist, paired with a feathered headband, under the glittering light of a speakeasy, emphasizing the kinetic movement and art-deco elegance." },
                { name: 'Y2K', prompt: "Replace the model's outfit with a futuristic Y2K look from the late 90s/early 2000s: a shiny metallic puffer vest, low-rise wide-leg jeans, a tiny top, and chunky sneakers, under the cold, techy flash of a digital camera, highlighting the synthetic, space-age fabrics." },
                { name: 'Aviador', prompt: "Replace the model's outfit with a vintage aviator look: a classic shearling-lined leather bomber jacket, a white silk scarf, khaki trousers, and aviator sunglasses, under the dramatic light of a sunset airfield, emphasizing the rugged leather and timeless appeal." },
                { name: 'Estilo Náutico', prompt: "Replace the model's outfit with a classic Breton-inspired nautical look: a striped boatneck shirt, high-waisted white sailor pants or shorts, and espadrilles, under the crisp, clean light of a Mediterranean harbor, highlighting the fresh cotton textures." },
                { name: 'Estilo Ruta 66', prompt: "Replace the model's outfit with an Americana road trip look: a classic white t-shirt, blue jeans with cuffed hems, a leather belt, and a denim jacket or mechanic's cap, under the brilliant, dusty light of a desert highway, emphasizing iconic denim and cotton realism." }
            ]
        },
        {
            name: 'Gótico Elegante', icon: '🌑', prompt: "Replace the model's outfit with a sophisticated dark aesthetic featuring luxurious black fabrics, dramatic silhouettes, and moody, atmospheric lighting that enhances the elegant gothic romance.", subcategories: [
                { name: 'Encaje Negro', prompt: "Replace the model's outfit with an intricate black lace gown or blouse, featuring delicate spiderweb-like patterns and scalloped edges, under the cold, ethereal light of a full moon, highlighting the transparency and fine detail of the lace." },
                { name: 'Capa Dramática', prompt: "Replace the model's outfit with a sweeping floor-length black cape lined in deep crimson satin, worn over a sleek black ensemble, under a dramatic, wind-blown night setting with a single lamp post glow, emphasizing the fabric's flow and gothic romance." },
                { name: 'Corsé', prompt: "Replace the model's outfit with a modern gothic look centered on a beautifully structured velvet or satin corset over a flowing poet shirt, paired with leather pants, under dim, flickering candlelight that emphasizes the hourglass silhouette and rich textures." },
                { name: 'Abadía', prompt: "Replace the model's outfit with a somber, monastic gothic style: a long, hooded black robe resembling a monk's habit, made of heavy matte fabric, under the cold, streaming light from a stained-glass window, highlighting the austere texture and gravity." },
                { name: 'Victoriano Oscuro', prompt: "Replace the model's outfit with a full mourning-era Victorian ensemble: a black bombazine or crape dress with a bustle, high lace collar, jet beading, and a veiled hat, under a misty, melancholic gaslight ambiance for historical accuracy." },
                { name: 'Cuero y Tachuelas', prompt: "Replace the model's outfit with a more industrial gothic look: a sleek black leather trench coat adorned with silver studs and buckles, worn with tight vinyl pants, under the harsh light of an abandoned warehouse, emphasizing the material's hard edge and gleam." },
                { name: 'Terciopelo Rojo', prompt: "Replace the model's outfit with a luxurious dark red velvet smoking jacket or long coat, as a striking contrast to an all-black base, under warm, moody library lighting (think dark academia), highlighting the plush, deep texture of the velvet." },
                { name: 'Novia Gótica', prompt: "Replace the model's outfit with a hauntingly beautiful gothic wedding dress in black, grey, or blood-red, featuring a long train, skeletal embroidery, and a black veil, under the dramatic, cold light of a stone cathedral, capturing dark romanticism." },
                { name: 'Ropa Interior', prompt: "Replace the model's outfit with a boudoir gothic look: a black silk and lace chemise or balconette set, paired with a sheer robe with feather trim, under soft, intimate boudoir lighting with deep shadows for a seductive, sophisticated darkness." },
                { name: 'Aristócrata Vampiro', prompt: "Replace the model's outfit with an aristocratic vampire style: a high-collared black silk cape, a white ruffled shirt, a velvet frock coat, and antique rings, under the dramatic, cold lighting of a gothic castle interior, enhancing the timeless, supernatural elegance." },
                { name: 'Estilo Bruja', prompt: "Replace the model's outfit with a modern witchy aesthetic: layers of flowing black jersey and gauze, occult silver jewelry with moon motifs, and a wide-brimmed felt hat, under the dappled, mystical light of an ancient forest, emphasizing the organic, flowing textures." },
                { name: 'Ciber Gótico', prompt: "Replace the model's outfit with a futuristic cyber-goth look: black PVC clothing with neon green or purple circuit-like piping, gas mask accessories, and platform boots with LED lights, under pulsing, blacklight-lit club ambiance that makes the neon pop against matte black." }
            ]
        },
        {
            name: 'Anime', icon: '🎌', prompt: "Replace the model's outfit with a vibrant anime or manga-inspired costume, blending hyper-realistic fabric rendering with the iconic silhouettes and colorful designs of Japanese animation.", subcategories: [
                { name: 'Uniforme Escolar', prompt: "Replace the model's outfit with a classic Japanese school uniform: a sailor-style fuku or a dark gakuran with brass buttons, under the crisp, bright light of a spring school day, emphasizing the clean lines and cotton-polyester texture with photoreal clarity." },
                { name: 'Guerrero Samurái', prompt: "Replace the model's outfit with an elaborate samurai armor (ō-yoroi) made of lacquered iron plates, silk cords, and a dramatic kabuto helmet, under the intense, filtered light of a bamboo forest, highlighting the metallic sheen and intricate lacing." },
                { name: 'Mago/Aventurero', prompt: "Replace the model's outfit with a fantasy anime adventurer's garb: a long, flowing blue or red cape, leather pauldrons, a worn tunic, and a magical staff, under the dynamic, lens-flare light of a fantastical battle scene, capturing the sense of motion." },
                { name: 'Mecha Pilot', prompt: "Replace the model's outfit with a sleek, futuristic plugsuit worn by a mecha pilot: a form-fitting, high-tech bodysuit with glowing conduits and armored sections, under the sterile, high-contrast light of a hangar bay, emphasizing the sci-fi materials." },
                { name: 'Kimono', prompt: "Replace the model's outfit with a vibrantly patterned furisode (long-sleeved kimono) featuring cranes, flowers, and dramatic color, tied with an elaborate obi, under the soft, diffused light of a traditional Japanese room, enhancing the luxurious silk texture." },
                { name: 'Shinigami', prompt: "Replace the model's outfit with a soul-reaper's shihakushō: a flowing black kimono and hakama, with a white under-robe and a katana at the hip, under the stark, high-contrast light of a moonlit rooftop, emphasizing the voluminous fabric." },
                { name: 'Estilo Harajuku', prompt: "Replace the model's outfit with a wild, colorful Harajuku street fashion decora or fairy-kei look, with layered tutus, pastel colors, cartoon motifs, and countless accessories, under bright, fun, Tokyo street lighting that captures the maximalist joy." },
                { name: 'Cyberpunk', prompt: "Replace the model's outfit with a futuristic cyberpunk anime look, featuring a transparent PVC jacket, neon-bathed tactical gear, and cybernetic limb aesthetics, under the rain-slicked, neon-lit alleys of a futuristic city for a high-tech realism." },
                { name: 'Príncipe/Princesa', prompt: "Replace the model's outfit with a fairy-tale anime royal costume: a gown with a corset bodice, flowing layers of chiffon, and gold tiara, or a princely military-style coat with epaulets and a sash, under soft, sparkling castle ballroom light." },
                { name: 'Ninja', prompt: "Replace the model's outfit with a sleek, tactical ninja outfit: a form-fitting black gi with mesh armor, arm guards, a red scarf, and a ninjatō, under the dappled light and shadow of a night-time forest, emphasizing stealth and athletic texture." },
                { name: 'Idol', prompt: "Replace the model's outfit with a sparkling J-Pop/K-Pop idol stage costume: a sequined and frilled two-piece set or mini-dress, in bright, energetic colors, with a handheld microphone, under dynamic concert lighting with fan chants, capturing the polished performance vibe." },
                { name: 'Personaje Ghibli', prompt: "Replace the model's outfit with the soft, pastoral aesthetic of a Studio Ghibli film: a simple apron dress, a mechanic's jumpsuit, or a flying witch's dark robe and red bow, rendered with photorealistic fabric but under a soft, nostalgic, painterly natural light." }
            ]
        },
        {
            name: 'Marinero', icon: '⚓', prompt: "Replace the model's outfit with a classic nautical or seafaring ensemble featuring maritime colors, practical fabrics, and seaside illumination that captures the ocean-faring spirit and photorealistic texture.", subcategories: [
                { name: 'Capitán de Barco', prompt: "Replace the model's outfit with a distinguished sea captain's uniform: a navy blue double-breasted blazer with gold buttons and stripes, a white peaked cap, and tailored trousers, under the bright, salty light of a ship's bridge, emphasizing authority and crisp wool." },
                { name: 'Estilo Bretón', prompt: "Replace the model's outfit with a timeless French Riviera look: a navy-and-white striped Breton shirt, white sailor pants, and espadrilles, under the brilliant, clear light of a harbor town, highlighting the iconic cotton knit and relaxed chic." },
                { name: 'Pescador', prompt: "Replace the model's outfit with a rugged fisherman's gear: a yellow or orange oilskin rain jacket and bib overalls, a knitted 'gansey' sweater, and rubber boots, under the misty, gritty light of an early morning at sea, emphasizing durable, waterproof textures." },
                { name: 'Marinero Clásico', prompt: "Replace the model's outfit with a traditional navy sailor's dress uniform: the iconic square collar with three white stripes, a navy jumper, bell-bottom trousers, and a 'Dixie cup' hat, under the bright, clean light of a ship at port, capturing naval tradition." },
                { name: 'Look de Regata', prompt: "Replace the model's outfit with a preppy sailing look: a windbreaker or softshell jacket over a polo, quick-dry shorts, deck shoes, and sailing gloves, under the bright, windy, reflective light of a sunny day on the water, emphasizing high-tech, sporty fabrics." },
                { name: 'Pirata', prompt: "Replace the model's outfit with a romanticized yet realistic pirate captain's look: a weathered leather tricorn hat, a ruffled linen shirt under a frock coat, worn leather boots, and a cutlass, under the golden light of a tropical sunset at sea." },
                { name: 'Buzo Antiguo', prompt: "Replace the model's outfit with a steampunk-tinged vintage diving suit: the classic brass helmet with a round viewport, a heavy canvas suit, and weighted boots, under the eerie, filtered light of the ocean floor, emphasizing the rubberized canvas and metallic weight." },
                { name: 'Marina Civil', prompt: "Replace the model's outfit with a merchant navy officer's uniform: a crisp white short-sleeve shirt with epaulets, black trousers, and polished shoes, under the bright, equatorial sun on a cargo ship's deck, highlighting the practical, professional cotton." },
                { name: 'Estilo Náutico Sport', prompt: "Replace the model's outfit with a sporty maritime look: a color-blocked windbreaker, navy swim trunks, water shoes, and a life vest, under the dynamic, spray-filled light of a speedboat ride, capturing the energy and water-resistant materials." },
                { name: 'Almirante', prompt: "Replace the model's outfit with a formal admiral's full dress uniform: a dark navy tailcoat with heavy gold epaulets and medals, a ceremonial sword, and white gloves, under the somber, respectful light of a naval ceremony, highlighting the ornate, prestigious fabrics." },
                { name: 'Estilo Yate Club', prompt: "Replace the model's outfit with a luxurious yachting look: a white linen shirt, tailored beige chinos, a cashmere sweater draped over the shoulders, and leather driving moccasins, under the golden light of a Mediterranean sunset, emphasizing relaxed, breathable luxury." },
                { name: 'Bailarina Hawaiana', prompt: "Replace the model's outfit with a graceful Polynesian-inspired look for a hula dancer: a grass or ti-leaf skirt, a coconut shell or floral top, and beautiful leis and flower crowns, under the warm, fire-lit ambiance of a beach luau at twilight." }
            ]
        },
        {
            name: 'Hippie', icon: '✌️', prompt: "Replace the model's outfit with a free-spirited bohemian hippie look featuring natural fabrics, earthy tie-dye or floral patterns, and sun-drenched festival lighting that captures peace, love, and photorealistic texture.", subcategories: [
                { name: 'Tie-Dye', prompt: "Replace the model's outfit with a vibrant, hand-dyed tie-dye t-shirt or dress in a spiral or sunburst pattern, paired with distressed denim shorts, under the bright, hazy sun of an outdoor music festival, emphasizing the soft cotton and psychedelic colors." },
                { name: 'Vestido Largo', prompt: "Replace the model's outfit with a sweeping bohemian maxi dress in a paisley or floral print, featuring billowy sleeves and a ruffled hem, under the golden, back-lit glow of a sunset in a field, capturing the movement and lightweight fabric." },
                { name: 'Chaleco de Ante', prompt: "Replace the model's outfit with a classic 70s hippie staple: a fringed suede or leather vest worn over a bell-sleeve blouse, with flared jeans and round sunglasses, under warm, earthy, analog-filtered light highlighting the hide texture." },
                { name: 'Poncho', prompt: "Replace the model's outfit with a colorful, hand-woven South American poncho or serape featuring geometric patterns in wool or cotton, worn with flared denim, under the crisp, clear light of high-altitude plains, emphasizing the textile's dense weave." },
                { name: 'Corona de Flores', prompt: "Replace the model's outfit with a romantic boho-goddess look: a sheer, white eyelet lace dress, barefoot or in delicate sandals, with a massive crown of fresh wildflowers on long flowing hair, under soft, enchanted forest light with lens flare." },
                { name: 'Pantalones Acampanados', prompt: "Replace the model's outfit with the quintessential hippie bottom: high-waisted, wide-flared jeans or corduroy pants, often with embroidered patches, paired with a tight-fitting ribbed top, under moody, counterculture-era lighting that flatters the retro silhouette." },
                { name: 'Estilo Woodstock', prompt: "Replace the model's outfit with an authentic 1969 Woodstock look: a fringed leather or suede jacket, a simple tank top, cut-off denim shorts, and mud-splattered boots, under the iconic, muddy, rain-soaked festival light of a legendary concert field." },
                { name: 'Crochet', prompt: "Replace the model's outfit with a delicate hand-crocheted top or dress in an open, lacy stitch, worn over a simple camisole or bandeau, with a long flowing skirt, under dappled sunlight that beautifully outlines the intricate handmade pattern." },
                { name: 'Bandana', prompt: "Replace the model's outfit with a classic hippie staple: a colorful paisley bandana worn as a headband, with a simple white cotton peasant blouse, ripped jeans, and many beaded bracelets and necklaces, under the raw, direct sun of a protest march or sit-in." },
                { name: 'Patchwork', prompt: "Replace the model's outfit with a unique patchwork garment made of sewn-together vintage fabrics, like a patchwork maxi skirt or a quilted jacket, under the warm, nostalgic light of a vintage market, highlighting the diverse fabric textures and bohemian DIY spirit." },
                { name: 'Estilo Hare Krishna', prompt: "Replace the model's outfit with the simple, spiritual look of a Hare Krishna devotee: a flowing, unstitched white or saffron dhoti or sari, minimal jewelry, and tulsi bead necklaces, under the serene, early morning light of a temple or park." },
                { name: 'Chal', prompt: "Replace the model's outfit with a cozy, oversized woven shawl or serape draped around the shoulders, layered over a simple base of a tank top and jeans, under crisp, cool evening air at a drum circle, emphasizing the shawl's warm texture and intricate pattern." }
            ]
        },
        {
            name: 'Oficina Moderna', icon: '🏢', prompt: "Replace the model's outfit with a sharp, contemporary office look featuring modern tailoring, smart fabrics, and clean corporate lighting that conveys competence, style, and photorealistic workwear excellence.", subcategories: [
                { name: 'Business Casual', prompt: "Replace the model's outfit with a modern business casual staple: a well-fitted blazer over a simple merino sweater or silk blouse, dark denim or chinos, and clean white sneakers, under the bright, clean light of a modern co-working space." },
                { name: 'Traje Pantalón', prompt: "Replace the model's outfit with a powerful women's pantsuit in a bold color like red or cobalt blue, featuring a sharp, single-button closure and slim-fit trousers, under sleek corporate boardroom lighting that emphasizes the form and fabric." },
                { name: 'Falda Lápiz', prompt: "Replace the model's outfit with a classic secretary-chic ensemble: a high-waisted pencil skirt in tweed or wool, paired with a tucked-in silk blouse, sheer tights, and classic pumps, under soft office fluorescent lighting that captures the professional fabric weave." },
                { name: 'Look Creativo', prompt: "Replace the model's outfit with a creative-office look that bends the rules: an asymmetrical midi skirt with a graphic tee and a deconstructed blazer, or architectural-looking trousers, under the bright, artful light of a design studio emphasizing innovative textiles." },
                { name: 'Americana y Camiseta', prompt: "Replace the model's outfit with a smart-casual tech-bro look: a perfectly tailored unstructured blazer, a high-quality plain white t-shirt, slim-fit chinos, and minimalist sneakers, under the natural light of a Silicon Valley campus, highlighting the refined casual textures." },
                { name: 'Vestido Archivador', prompt: "Replace the model's outfit with a sophisticated, office-appropriate sheath or shirt dress in a solid color or subtle geometric print, accessorized with a thin leather belt and a structured tote bag, under bright morning office light for clean, crisp realism." },
                { name: 'Traje de Tres Piezas', prompt: "Replace the model's outfit with a classic, modern-cut three-piece suit (jacket, trousers, and waistcoat) in charcoal or navy wool, with a silk tie and pocket square, under the prestigious, wood-paneled light of an executive office." },
                { name: 'Monocromo', prompt: "Replace the model's outfit with a head-to-toe single-color office look in shades of beige, grey, or navy, playing with layered textures like a wool coat over a silk top and crepe trousers, under soft, diffused office light to emphasize tonal depth." },
                { name: 'Startup', prompt: "Replace the model's outfit with a laid-back startup founder's style: a branded hoodie or quarter-zip over a collared shirt, joggers that look like slacks, and trendy sneakers, under the colorful, playful lighting of a modern tech headquarters." },
                { name: 'Chaleco Sastre', prompt: "Replace the model's outfit with a chic, modern look centered on a tailored vest (waistcoat) worn as a top, paired with matching wide-leg trousers, under the sharp, editorial light of a fashion-forward office or magazine." },
                { name: 'Pañuelo de Seda', prompt: "Replace the model's outfit with a classic, polished office look where the accessory makes the statement: a simple black sheath dress or a crisp white shirt and black trousers, dramatically elevated by a colorful, patterned Hermès-style silk scarf tied around the neck or bag, under soft, elegant office lighting." },
                { name: 'Oficina Casual Viernes', prompt: "Replace the model's outfit with a perfect 'Casual Friday' look: dark, non-ripped premium denim jeans, a cashmere crewneck sweater, a tailored blazer, and leather loafers, under the more relaxed, warm end-of-week office light." }
            ]
        },
        {
            name: 'Festival', icon: '🎪', prompt: "Replace the model's outfit with a vibrant music festival look featuring bold colors, eclectic accessories, and energetic outdoor lighting that captures the euphoria and photorealistic fabric play of festival fashion.", subcategories: [
                { name: 'Boho Festival', prompt: "Replace the model's outfit with the ultimate boho festival look: a crochet crop top, high-waisted denim shorts, a fringed suede crossbody bag, layered turquoise necklaces, and ankle boots, under the hazy, golden dust of a Coachella-like field." },
                { name: 'Glitter', prompt: "Replace the model's outfit with a dazzling festival look covered in biodegradable glitter and rhinestones: a sparkly bikini top, sheer mesh top, holographic shorts or skirt, and glitter roots in the hair, under the strobe lights and lasers of an EDM stage." },
                { name: 'Neón', prompt: "Replace the model's outfit with a head-to-toe neon festival look: a fluorescent green crop top, bright orange cargo pants, chunky sneakers, and lots of glow stick accessories, under intense blacklight and UV stage lighting that makes the colors scream." },
                { name: 'Chubasquero', prompt: "Replace the model's outfit with a practical yet stylish rainy festival outfit: a transparent or brightly colored PVC raincoat over a fun outfit, paired with a bucket hat and Hunter-style rain boots, under the grey, wet light of a drizzle that makes the waterproof surfaces gleam." },
                { name: 'Traje de Cuerpo', prompt: "Replace the model's outfit with a striking one-piece bodysuit or unitard in a wild pattern (zebra, cosmic, liquid metal), which serves as a complete look on its own, under the dramatic, sweeping spotlight of a main stage headliner act." },
                { name: 'Gafas de Sol', prompt: "Replace the model's outfit with a classic festival look anchored by statement sunglasses: tiny matrix shades, heart-shaped glasses, or a futuristic visor, paired with a band tee and a utility vest, under the harsh midday festival sun, making the glasses reflective and cool." },
                { name: 'Sombrero', prompt: "Replace the model's outfit with a festival look dominated by a dramatic wide-brimmed hat, decorated with feathers, chains, and pins, worn with a lace bodysuit and a flowing skirt, under the warm, setting sun that casts a majestic shadow from the hat." },
                { name: 'Kimono', prompt: "Replace the model's outfit with a flowing, printed kimono or duster coat in silk or a sheer fabric, worn open over a bikini top and denim shorts, under the breezy, sunset light of an outdoor festival, capturing the wind-blown fabric movement." },
                { name: 'Botas de Combate', prompt: "Replace the model's outfit with a tough, utilitarian festival look featuring scuffed combat boots with fishnet stockings, a tartan mini skirt, a ripped band tee, and a leather harness, under the gritty, mosh-pit lighting for a punk rock edge." },
                { name: 'Mono de Festival', prompt: "Replace the model's outfit with a playful one-piece romper or boilersuit in a bright, solid color or fun pattern, rolled up to the shins and paired with a fanny pack worn cross-body, under the colorful, whimsical light of a daytime festival art installation." },
                { name: 'Hippie', prompt: "Replace the model's outfit with a classic 60s-inspired festival look: a fringed suede vest, bell-bottom jeans with peace signs, a tie-dye headband, and John Lennon-style round glasses, under the vintage-hued, peace-and-love light of a retro festival revival." },
                { name: 'Fantasy/Sci-Fi', prompt: "Replace the model's outfit with an elaborate fantasy or sci-fi costume repurposed as festival wear: elf ears, a flowing elven cloak with LED lights, or post-apocalyptic wasteland armor with a respirator, under otherworldly stage fog and laser lights blending reality and fantasy." }
            ]
        },
        {
            name: 'Streetwear', icon: '🏙️', prompt: "Replace the model's outfit with a cutting-edge streetwear look featuring oversized fits, bold graphics, premium sneakers, and urban environmental lighting that captures the hype and photorealistic texture of modern street fashion.", subcategories: [
                { name: 'Hypebeast', prompt: "Replace the model's outfit with a classic hypebeast look: a limited-edition branded logo t-shirt, cargo pants with straps, the most coveted sneakers (like Jordans or Yeezys), and a crossbody bag, under the flash of street-style paparazzi." },
                { name: 'Techwear', prompt: "Replace the model's outfit with a futuristic techwear ensemble: a black Gore-Tex shell jacket with multiple zippered pockets, tapered cargo pants, and high-tech sneakers by Acronym or Nike ACG, under the cold, blue light of a rainy neon-lit Tokyo alley." },
                { name: 'Skater', prompt: "Replace the model's outfit with an authentic skater fit: a loose graphic t-shirt from a skate brand, baggy chino or denim pants, a beanie, and worn-out skate shoes, under the bright, harsh California sun at a concrete skatepark, emphasizing wear and tear." },
                { name: 'Gorpcore', prompt: "Replace the model's outfit with a gorpcore (outdoor/tech) look: a fleece zip-up or puffer vest from Arc'teryx or Patagonia, hiking trousers, trail runners, and a 5-panel cap, under the overcast, moody light of a city park, blending practicality with style." },
                { name: 'Vintage', prompt: "Replace the model's outfit with a curated vintage streetwear look: an oversized, worn-in band or university sweatshirt from the 90s, distressed 501 Levi's, and retro sneakers, under the nostalgic, slightly desaturated light of a thrift store or Sunday market." },
                { name: 'Oversized', prompt: "Replace the model's outfit with a silhouette-focused look of extreme oversizing: an XXXL hoodie or graphic t-shirt that hangs like a dress, with massively baggy jeans or wide tailored pants, and chunky sneakers, under stark, industrial city lighting that emphasizes volume." },
                { name: 'Monocromo', prompt: "Replace the model's outfit with an all-black or all-grey streetwear look, layered with different materials like a nylon puffer, cotton hoodie, and leather cargos, under moody, high-contrast shadows for a sleek, undercover operative feel." },
                { name: 'Logomanía', prompt: "Replace the model's outfit with a playful, ironic take on logomania: a tracksuit covered in a fake or real repeating monogram print, a matching bucket hat, and designer sneakers, under glossy, high-end boutique light that flashes off the shiny material." },
                { name: 'Corte y Costura', prompt: "Replace the model's outfit with a deconstructed, reworked streetwear piece: like a jacket made of two different halves sewn together, pants with built-in leg warmers, or excessive straps and buckles, under the avant-garde gallery lighting of a fashion show." },
                { name: 'Bomber', prompt: "Replace the model's outfit with a clean, classic look centered on a MA-1 bomber jacket (in classic green, black, or a satin finish), worn with black skinny jeans and combat boots or high-tops, under a crisp, cold night in the city." },
                { name: 'Bucket Hat', prompt: "Replace the model's outfit with a fit anchored by a bold bucket hat (in a plush fabric, vibrant pattern, or designer monogram), paired with an oversized graphic tee, shorts, and high socks, under a fun, fish-eye lens street shot." },
                { name: 'Estilo K-Pop', prompt: "Replace the model's outfit with a polished, experimental K-Pop idol airport fashion or dance-practice look: a perfectly color-coordinated set (e.g., plaid blazer, pleated skirt, loafers), with attention to neat, flawless fabrics and a crisp, fresh aesthetic." }
            ]
        },
        {
            name: 'Deportes Extremos', icon: '🪂', prompt: "Replace the model's outfit with high-adrenaline extreme sports gear featuring protective equipment, technical fabrics, and dynamic action lighting that captures the thrill and photorealistic material performance.", subcategories: [
                { name: 'Paracaidismo', prompt: "Replace the model's outfit with a complete skydiving suit: a colorful, aerodynamic jumpsuit, an altimeter on the wrist, a helmet with a visor, and the harness and parachute backpack, under the intense, thin-air light of a freefall with a blurred earth below." },
                { name: 'Snowboard', prompt: "Replace the model's outfit with a stylish snowboarder's kit: a baggy, insulated jacket and pants in bold patterns, a beanie under a helmet, goggles with a colorful lens, and a snowboard with cool graphics, under the bright, reflective glare of a half-pipe." },
                { name: 'Surf', prompt: "Replace the model's outfit with a surf-ready look: a spring wetsuit pulled down to the waist, a rash guard top, board shorts, and a surfboard under the arm, under the intense, shimmering light of a perfect barreling wave and sea spray." },
                { name: 'Mountain Bike', prompt: "Replace the model's outfit with a downhill mountain biker's gear: a full-face helmet, impact-protective suit under a loose, long-sleeve jersey, padded shorts, and flat-pedal shoes, under the dusty, dynamic light of a forest trail with motion blur." },
                { name: 'Escalada en Roca', prompt: "Replace the model's outfit with a real rock climbing setup: a chalk bag dangling, harness with quickdraws clinking, form-fitting stretchy pants, and an aggressive tank top, under the dramatic, side-lit texture of a massive vertical cliff face." },
                { name: 'Patinaje', prompt: "Replace the model's outfit with a rollerblading or skateboarding look in mid-trick: an urban streetwear fit, knee and elbow pads, wrist guards, and the board or blades, under the kinetic, sun-flared light of a city plaza with a frozen action-shot feel." },
                { name: 'Ala Delta', prompt: "Replace the model's outfit with a hang glider pilot's gear: a cocoon-like harness, a streamlined helmet, a warm flight suit, and the vast, curved wing overhead, under the serene, breathtaking light of a panoramic coastal sunset from a thousand feet above." },
                { name: 'Motonieve', prompt: "Replace the model's outfit with a snowmobiler's heavy winter gear: a thick, insulated one-piece suit with high-visibility panels, a balaclava, heated visor helmet, and massive gloves, under the blinding, powdery spray of fresh snow at high speed." },
                { name: 'Wingsuit', prompt: "Replace the model's outfit with a wingsuit flyer's specialized gear: the fabric wings stretched between arms and legs, a streamlined full-face helmet, and a compact parachute, under the dizzying, vertical perspective of proximity flying near a mountain ridge, emphasizing the suit's ribbed texture." },
                { name: 'Motonáutica', prompt: "Replace the model's outfit with a jet ski/personal watercraft racing outfit: a sleek, form-fitting wetsuit top with team logos, impact vest, board shorts, and a sturdy pair of water-sport boots, under the dynamic, sun-sparkled glare of choppy water and speed." },
                { name: 'Parkour', prompt: "Replace the model's outfit with a traceur's functional parkour attire: flexible, sweat-wicking joggers, a tight-fitting athletic shirt, minimal padded gloves, and lightweight running shoes, under the dramatic, urban silhouette of a rooftop at sunrise during a precision jump." },
                { name: 'Rafting en Aguas Bravas', prompt: "Replace the model's outfit with extreme white-water rafting gear: a heavy-duty dry suit, a cut-resistant helmet, a PFD with a rescue knife, and neoprene booties, under the chaos of a Class V rapid where furious water and spray are frozen in detail." }
            ]
        },
        {
            name: 'Caza y Campo', icon: '🏹', prompt: "Replace the model's outfit with authentic hunting and countryside attire featuring camouflage patterns, rugged natural fabrics, and outdoorsman lighting that captures the connection to nature and photorealistic gear detail.", subcategories: [
                { name: 'Cazador', prompt: "Replace the model's outfit with a classic deer hunter's gear: a head-to-toe Mossy Oak or Realtree camouflage jacket and pants, a blaze orange beanie or vest, leather hunting boots, and a compound bow, under the golden, misty light of a forest at dawn." },
                { name: 'Pato', prompt: "Replace the model's outfit with a waterfowl hunter's look: a marsh-brown camouflage wading jacket, chest waders, and a shotgun broken over the arm, under the grey, foggy light of a duck marsh at sunrise with realistic mud and water textures." },
                { name: 'Tiro Deportivo', prompt: "Replace the model's outfit with a sporting clays or trap shooting outfit: a classic tweed shooting vest with leather shoulder patches, a breathable sporting shirt, chinos, and protective shooting glasses, under the bright, open sky of a shooting range, emphasizing the gun's wood and metal." },
                { name: 'Equitación Inglesa', prompt: "Replace the model's outfit with a formal English riding habit: a tailored black or navy hunt coat, white show shirt with a stock tie, beige breeches, and tall leather riding boots, under the pristine light of a show jumping arena, with an optional horse nearby." },
                { name: 'Vaquería', prompt: "Replace the model's outfit with a working cowboy or cowgirl outfit: worn-in denim jeans, a long-sleeve pearl-snap shirt, leather chaps, dusty boots with spurs, and a weathered, wide-brimmed hat, under the harsh midday sun of a cattle ranch." },
                { name: 'Montañero', prompt: "Replace the model's outfit with a classic woodsman's look: a red-and-black buffalo plaid wool jacket over a henley shirt, heavy canvas trousers, leather logger boots, and a trapper hat, with an axe, under the deep green, mystical light of an old-growth forest." },
                { name: 'Apicultor', prompt: "Replace the model's outfit with a full beekeeper's protective suit: the iconic white coveralls, a wide-brimmed hat with a mesh veil, and thick gauntlet gloves, under the warm, buzzing, sun-drenched light of an apiary surrounded by wildflowers." },
                { name: 'Guardabosques', prompt: "Replace the model's outfit with a park ranger's official uniform: a khaki shirt with patches, olive-green cargo trousers, a broad campaign hat (like a Smokey Bear hat), and sturdy service boots, under the majestic, awe-inspiring light of a national park vista." },
                { name: 'Pesca con Mosca', prompt: "Replace the model's outfit with a fly fisherman's attire: a lightweight, quick-dry shirt and shorts, a multi-pocketed fishing vest covered in hand-tied flies, hip waders, and a wide-brimmed hat, under the serene, sparkling light of a pristine river." },
                { name: 'Cazador con Arco', prompt: "Replace the model's outfit with a sleek, modern bowhunter's getup: a form-fitting camouflage top and pants optimized for silence, a low-profile bino harness, face paint, and a high-tech compound bow at full draw, under the tense, golden light of the rut." },
                { name: 'Sabueso', prompt: "Replace the model's outfit with a classic English fox-hunting or beagling ensemble: a scarlet hunt coat ('pink'), white jodhpurs, black leather boots, and a velvet hunt cap, accompanied by a pack of realistic beagles or foxhounds, under the traditional, sweeping landscape of the countryside." },
                { name: 'Fotógrafo Vida Salvaje', prompt: "Replace the model's outfit with a wildlife photographer's safari vest and muted green/brown clothing to blend in, crouching or standing with a massive telephoto lens, under the dramatic, sharp morning light of the African savanna, emphasizing the functional pockets and rugged fabric." }
            ]
        },
        {
            name: 'Lounge', icon: '😴', prompt: "Replace the model's outfit with the ultimate cozy loungewear or sleepwear ensemble featuring sumptuously soft fabrics, relaxed fits, and warm, dim indoor lighting that evokes comfort, relaxation, and photorealistic tactile softness.", subcategories: [
                { name: 'Pijama de Seda', prompt: "Replace the model's outfit with a classic, luxurious silk pajama set: a button-down shirt with piping details and matching relaxed trousers in a beautiful solid color or subtle pattern, under the soft, moody light of a bedroom at dusk, emphasizing liquid-like sheen." },
                { name: 'Franela', prompt: "Replace the model's outfit with a cozy, classic plaid flannel pajama set, slightly oversized, with a soft thermal henley underneath, under the warm, flickering glow of a fireplace on a snowy evening, highlighting the brushed cotton texture." },
                { name: 'Albornoz', prompt: "Replace the model's outfit with a plush, thick bathrobe made of toweling cotton or velour, wrapped tightly after a bath, with slippers, under steamy, post-shower bathroom lighting that clings to the texture of the damp fabric." },
                { name: 'Bata', prompt: "Replace the model's outfit with a floor-length satin or lace-trimmed dressing gown or peignoir, worn open over a matching slip, under the gentle, sensual light of a vanity mirror in a boudoir, evoking old Hollywood glamour." },
                { name: 'Conjunto Punto', prompt: "Replace the model's outfit with a matching knitted loungewear set: a chunky cable-knit sweater and wide-leg or legging-style bottoms made of a soft cashmere-wool blend, under the soft, natural light of a lazy Sunday morning, emphasizing the cozy, voluminous yarn." },
                { name: 'Onesie', prompt: "Replace the model's outfit with a playful, hooded onesie or kigurumi in a fun animal or character design, made of super-soft fleece, under the bright, colorful light of a pillow fort or a sleepover with fairy lights." },
                { name: 'Algodón', prompt: "Replace the model's outfit with a simple, high-quality cotton pajama set (classic white t-shirt and drawstring shorts or pants), under the crisp, fresh light of morning sun on white bedsheets, emphasizing pure comfort and breathable texture." },
                { name: 'Calcetines', prompt: "Replace the model's outfit with an oversized, thick wool sweater that serves as a mini-dress, worn with nothing but a pair of extra-cozy, slouchy cable-knit thigh-high socks, under the dim, cozy light of a home library, emphasizing the soft, warm wool." },
                { name: 'Top Corto', prompt: "Replace the model's outfit with a youthful, casual PJ set: a soft, ribbed tank top or bralette and matching shorts in a light, heathered fabric, under the relaxed, warm light of a bedroom with string lights, highlighting comfort and a lived-in feel." },
                { name: 'Monograma', prompt: "Replace the model's outfit with a personalized, high-end loungewear set: a velour zip-up hoodie and matching joggers, featuring an embroidered crest or initials, under the sophisticated, soft lighting of a first-class airline lounge, emphasizing plush luxury." },
                { name: 'Manta con Mangas', prompt: "Replace the model's outfit with the ultimate cozy comfort of a wearable blanket hoodie, an oversized, impossibly soft, sherpa-lined fleece that envelops the wearer, under the blue, cozy light of a TV or laptop screen on a dark winter night." },
                { name: 'Pijama Navideño', prompt: "Replace the model's outfit with a festive, matching family Christmas pajama set: a bright red and green plaid or a fun pattern of snowflakes and reindeer, under the magical, multi-colored twinkle of Christmas tree lights in a dark room." }
            ]
        }
    ];


    function computeTargetDims(ar, resolution) {
        const ratios = { '1:1': [1,1], '16:9': [16,9], '9:16': [9,16], '4:3': [4,3], '3:4': [3,4] };
        const [rw, rh] = ratios[ar] || [1, 1];
        const ratio = rw / rh;
        let width, height;
        if (ratio >= 1) {
            width = resolution;
            height = Math.round(resolution / ratio);
        } else {
            height = resolution;
            width = Math.round(resolution * ratio);
        }
        // Redondear a múltiplos de 32 (requisito FLUX)
        width = Math.max(32, Math.round(width / 32) * 32);
        height = Math.max(32, Math.round(height / 32) * 32);
        return { width, height };
    }

    function composePrePrompt(userPrompt, ctx = {}) {
        // Reforzamos el prompt para evitar bloqueos de seguridad
        return "Generate a high-quality, photorealistic fashion image. The goal is to showcase a specific outfit style. " + (userPrompt || "") + " Ensure the result is safe, artistic, and suitable for a general audience.";
    }

    async function postProcessDataURL(dataURL, opts = {}) {
        const img = await new Promise((res, rej) => {
            const im = new Image(); im.crossOrigin = 'anonymous';
            im.onload = () => res(im); im.onerror = rej; im.src = dataURL;
        });
        const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        const x = c.getContext('2d'); x.drawImage(img, 0, 0);
        return c.toDataURL('image/png', 0.95);
    }

    // ==== Init ====
    const init = async () => {
        renderCategories();
        setupEventListeners();
        setupSelectors();
        injectDownloadAllButton();
        injectRegenModal();
        injectGlobalLoader();
        injectLightbox();
        ensureStyleDescClose();
        setupComparisonSlider();
        await initHistory();
    };

    const setupSelectors = () => {
        // Calidad PRO/MAX
        document.querySelectorAll('#quality-selector .toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#quality-selector .toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedQuality = btn.dataset.quality;
            });
        });
        // Formato AR
        document.querySelectorAll('#ar-selector .toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#ar-selector .toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedAR = btn.dataset.ar;
            });
        });
        // Resolución
        document.querySelectorAll('#res-selector .toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#res-selector .toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedRes = parseInt(btn.dataset.res);
            });
        });
    };

    const renderCategories = () => {
        // Limpiar
        if (catsLeft) catsLeft.innerHTML = '';
        if (catsRight) catsRight.innerHTML = '';
        if (catsBelow) catsBelow.innerHTML = '';

        const createCatBtn = (cat, index) => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.innerHTML = `<span class="cat-icon">${cat.icon}</span><span class="cat-name">${cat.name}</span>`;
            btn.dataset.index = index;
            btn.addEventListener('click', () => handleCategoryClick(btn, cat));
            return btn;
        };

        const createEmptyBtn = () => {
            const btn = document.createElement('button');
            btn.className = 'category-btn category-btn-empty';
            btn.innerHTML = `<span class="cat-icon">—</span><span class="cat-name">vacío</span>`;
            btn.disabled = true;
            return btn;
        };
        // Sides: 2 rows x 3 columns = 6 slots on each side
        // catsLeft → top-left, catsRight → top-right en layout
        // Categories 0-5 go on the left; 6-11 go on the right
        const leftSlots = 6;
        const rightSlots = 6;
        // Left: 6 slots (2 rows x 3 columns)
        if (catsLeft) {
            for (let i = 0; i < leftSlots; i++) {
                const btn = i < categories.length ? createCatBtn(categories[i], i) : createEmptyBtn();
                catsLeft.appendChild(btn);
            }
        }
        // Right: 6 slots (2 rows x 3 columns)
        if (catsRight) {
            for (let i = 0; i < rightSlots; i++) {
                const idx = leftSlots + i;
                const btn = idx < categories.length ? createCatBtn(categories[idx], idx) : createEmptyBtn();
                catsRight.appendChild(btn);
            }
        }

        // Below: 2 filas × 8 columnas = 16 slots
        if (catsBelow) {
            const belowStart = leftSlots + rightSlots; // 12
            const belowSlots = 16;
            for (let i = 0; i < belowSlots; i++) {
                const idx = belowStart + i;
                const btn = idx < categories.length ? createCatBtn(categories[idx], idx) : createEmptyBtn();
                catsBelow.appendChild(btn);
            }
        }
    };

    const renderSubcategories = (subcategories) => {
        subcategoryContainer.innerHTML = '';
        const section = document.getElementById('subcategory-section');
        subcategories.forEach(subCat => {
            const btn = document.createElement('button');
            btn.className = 'subcategory-btn';
            btn.textContent = subCat.name;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.subcategory-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                customPromptInput.value = subCat.prompt;
            });
            subcategoryContainer.appendChild(btn);
        });
        if (section) section.style.display = 'block';
    };

    const handleCategoryClick = (btn, category) => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = category;
        if (category.subcategories) renderSubcategories(category.subcategories);
    };

    // ==== Events ====
    const setupEventListeners = () => {
        dragArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => dragArea.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }));
        dragArea.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

        if (intensitySlider) {
            intensitySlider.addEventListener('input', (e) => {
                intensityValue.textContent = e.target.value;
                e.target.style.setProperty('--val', e.target.value + '%');
            });
            intensitySlider.style.setProperty('--val', intensitySlider.value + '%');
        }

        generateBtn.addEventListener('click', handleGenerateClick);

        ideaGeneratorBtn.addEventListener('click', handleGenerateIdea);
        enhancePromptBtn.addEventListener('click', handleEnhancePrompt);
        describeStyleBtn.addEventListener('click', handleDescribeStyle);
    };

    const showToast = (message) => {
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    };

    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) { showToast("Sube una imagen válida."); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            originalImageBase64 = reader.result;
            uploadedImagePreview.src = originalImageBase64;
            uploadedImagePreview.classList.remove('hidden');
            uploadPlaceholder.classList.add('hidden');
            imageBefore.src = originalImageBase64;
            comparisonContainer.classList.remove('hidden');
            imageAfter.src = 'https://placehold.co/1024x1024/1f2937/d1d5db?text=Genera+un+outfit';
            resetComparisonSlider();
        };
        reader.readAsDataURL(file);
    };

    const setLoading = (state) => {
        isLoading = state;
        generateBtn.disabled = state;

        if (state) {
            generateBtnText.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            generateBtnText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    };

    // ==== Describe style modal close ====
    function ensureStyleDescClose() {
        styleDescriptionOutput.style.position = 'relative';
        if (styleDescriptionOutput.querySelector('.style-desc-close')) return;
        const closeBtn = document.createElement('button');
        closeBtn.className = 'style-desc-close';
        closeBtn.type = 'button';
        closeBtn.ariaLabel = 'Cerrar descripción';
        closeBtn.textContent = '✕';
        Object.assign(closeBtn.style, {
            position: 'absolute', top: '8px', right: '8px',
            width: '28px', height: '28px', borderRadius: '9999px',
            background: 'rgba(17,24,39,0.9)', color: '#fff',
            fontWeight: '700', lineHeight: '28px', textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 2px 6px rgba(0,0,0,0.35)', cursor: 'pointer', zIndex: '2'
        });
        closeBtn.addEventListener('click', () => {
            styleDescriptionOutput.classList.add('hidden');
            styleDescriptionOutput.innerHTML = '';
            styleDescriptionOutput.appendChild(closeBtn);
        });
        styleDescriptionOutput.appendChild(closeBtn);
    }

    const handleDescribeStyle = async () => {
        if (!generatedImageBase64) { showToast("Primero genera un outfit."); return; }
        describeBtnText.classList.add('hidden');
        describeLoader.classList.remove('hidden');
        describeStyleBtn.disabled = true;
        styleDescriptionOutput.classList.remove('hidden');
        ensureStyleDescClose();
        const closeBtn = styleDescriptionOutput.querySelector('.style-desc-close');
        styleDescriptionOutput.innerHTML = '<div class="flex items-center justify-center"><div class="spinner" style="width: 24px; height: 24px;"></div><span class="ml-2">Analizando estilo...</span></div>';
        if (closeBtn) styleDescriptionOutput.appendChild(closeBtn);
        try {
            const prompt = "Describe en español, breve y con gancho, el outfit de la imagen. Nombra el estilo.";
            const description = await callMultimodalAPI(prompt, generatedImageBase64);
            styleDescriptionOutput.innerHTML = `<div style="padding-right:40px;">${description}</div>`;
            ensureStyleDescClose();
        } catch (e) {
            styleDescriptionOutput.innerHTML = '<div style="padding-right:40px;">No se pudo generar la descripción del estilo.</div>';
            ensureStyleDescClose();
            console.error(e);
        } finally {
            describeBtnText.classList.remove('hidden');
            describeLoader.classList.add('hidden');
            describeStyleBtn.disabled = false;
        }
    };

    // ==== Generate ====
    const handleGenerateClick = async () => {
        if (!originalImageBase64) { showToast("Primero sube una imagen."); return; }
        if (!activeCategory && !customPromptInput.value) { showToast("Elige un estilo."); return; }

        const prompt = constructPrompt();
        const currentStyle = {
            style: activeCategory ? activeCategory.name : 'Personalizado',
            subcategory: 'Generado'
        };

        try {
            const iterations = 1;
            let lastResult = null;

            for (let i = 0; i < iterations; i++) {
                showGlobalLoader(`Generando imagen ${i + 1} de ${iterations}`);
                try {
                    if (i > 0) await new Promise(r => setTimeout(r, 2000));
                    const resultBase64 = await callImageAPI(originalImageBase64, prompt);
                    lastResult = resultBase64;
                    await addToHistory(resultBase64, currentStyle, prompt);
                } catch (innerError) {
                    console.warn(`Generación ${i + 1} falló:`, innerError);
                    // Si falla la primera, intentamos seguir, pero si es la última y no hay resultado, lanzamos error
                    if (i === iterations - 1 && !lastResult) throw innerError;
                }
            }

            if (lastResult) {
                generatedImageBase64 = lastResult;
                imageAfter.src = generatedImageBase64;
                styleDescriptionSection.classList.remove('hidden');
                styleDescriptionOutput.classList.add('hidden');
                resetComparisonSlider();
                showToast('¡Outfit generado!');
            }

        } catch (error) {
            console.error(error);
            showToast("Error: " + (error.message || "No se pudo generar la imagen."));
        } finally {
            hideGlobalLoader();
        }
    };

    const handleGenerateIdea = async () => {
        ideaGeneratorIcon.classList.add('hidden'); ideaGeneratorSpinner.classList.remove('hidden'); ideaGeneratorBtn.disabled = true;
        try {
            const prompt = "Generate a short, creative outfit idea in spanish. No extra text.";
            const idea = await callTextAPI(prompt); customPromptInput.value = idea.replace(/[\"*]/g, '').trim();
        } catch (error) { showToast('Error al generar idea.'); } finally {
            ideaGeneratorIcon.classList.remove('hidden'); ideaGeneratorSpinner.classList.add('hidden'); ideaGeneratorBtn.disabled = false;
        }
    };

    const handleEnhancePrompt = async () => {
        const current = customPromptInput.value.trim();
        if (!current) { showToast("Escribe una idea."); return; }
        enhancePromptIcon.classList.add('hidden'); enhancePromptSpinner.classList.remove('hidden'); enhancePromptBtn.disabled = true;
        try {
            const prompt = `Eres un experto en prompts. Mejora esta idea de outfit en español: '${current}'`;
            const out = await callTextAPI(prompt); customPromptInput.value = out.replace(/["*]/g, '').trim();
        } catch (e) { showToast('Error al mejorar.'); } finally {
            enhancePromptIcon.classList.remove('hidden'); enhancePromptSpinner.classList.add('hidden'); enhancePromptBtn.disabled = false;
        }
    };

    const constructPrompt = () => {
        const parts = ["Change the person's outfit."];
        const customText = customPromptInput.value.trim();
        if (customText) parts.push(`New outfit: ${customText}.`);
        else if (activeCategory) parts.push(`New style: ${activeCategory.prompt}`);

        if (changeBackgroundCheckbox?.checked) parts.push("Change background to a realistic matching environment.");
        if (changePoseCheckbox?.checked) parts.push("Change pose dynamically.");

        return parts.join(' ');
    };

    const setupComparisonSlider = () => {
        const slider = document.getElementById('comparison-slider');
        if (!slider) return;
        let isDragging = false;
        imageAfter.style.clipPath = `polygon(50% 0, 100% 0, 100% 100%, 50% 100%)`;

        const moveSlider = (x) => {
            const rect = comparisonContainer.getBoundingClientRect();
            let pos = (x - rect.left) / rect.width;
            pos = Math.max(0, Math.min(1, pos));
            slider.style.left = `${pos * 100}%`;
            imageAfter.style.clipPath = `polygon(${pos * 100}% 0, 100% 0, 100% 100%, ${pos * 100}% 100%)`;
        };

        comparisonContainer.addEventListener('mousedown', () => isDragging = true);
        window.addEventListener('mouseup', () => isDragging = false);
        comparisonContainer.addEventListener('mousemove', (e) => { if (isDragging) moveSlider(e.clientX); });
        comparisonContainer.addEventListener('touchstart', () => isDragging = true);
        window.addEventListener('touchend', () => isDragging = false);
        comparisonContainer.addEventListener('touchmove', (e) => { if (isDragging) moveSlider(e.touches[0].clientX); });
    };

    const resetComparisonSlider = () => {
        const slider = document.getElementById('comparison-slider');
        if (!slider) return;
        slider.style.left = '50%';
        imageAfter.style.clipPath = 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)';
    };

    const initHistory = async () => {
        historyManager = new HistoryManager('outfit');
        historyManager.onChange(() => renderHistory());
        try {
            await historyManager.load();
            if (historyManager.getAll().length) renderHistory();
        } catch (error) {
            console.warn('No se pudo cargar el historial persistente:', error);
        }
    };

    const addToHistory = async (imageBase64, styleInfo, promptUsed) => {
        if (!historyManager) return;
        const id = `outfit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        try {
            await historyManager.save({
                id,
                type: 'image',
                data: {
                    prompt: promptUsed || '',
                    style: styleInfo || { style: 'Personalizado', subcategory: 'Generado' },
                    original: originalImageBase64,
                    aspectRatio: selectedAR,
                    size: String(selectedRes)
                },
                imageData: imageBase64,
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.warn('No se pudo guardar el historial:', error);
        }
    };

    const renderHistory = () => {
        if (!historyManager) return;
        const items = historyManager.getAll();
        if (!items.length) {
            historySection.classList.add('hidden');
            return;
        }
        historySection.classList.remove('hidden');
        historyContainer.innerHTML = '';
        items.forEach((entry) => {
            // Mapear de formato HistoryManager al formato interno
            const item = mapHistoryEntry(entry);

            const wrapper = document.createElement('div');
            wrapper.className = 'history-item-wrapper';

            const thumb = document.createElement('img');
            thumb.src = item.image;

            const actions = document.createElement('div');
            actions.className = 'history-item-actions';

            const createBtn = (cls, icon, tooltip, onClick) => {
                const b = document.createElement('button');
                b.className = `btn-square ${cls}`;
                b.innerHTML = `${icon}<span class="btn-tooltip">${tooltip}</span>`;
                b.onclick = (e) => { e.stopPropagation(); onClick(); };
                return b;
            };

            // 1. Descargar
            actions.appendChild(createBtn('btn-sq-green',
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
                'Descargar',
                () => { const a = document.createElement('a'); a.href = item.image; a.download = `outfit_${item.id}.png`; a.click(); }
            ));

            actions.appendChild(createBtn('btn-sq-white',
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
                'Ver en grande',
                () => openLightbox(item.image)
            ));

            // 2. Reintentar
            actions.appendChild(createBtn('btn-sq-blue',
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
                'Regenerar imagen',
                async () => {
                    showGlobalLoader("Regenerando la Imagen");
                    try {
                        const res = await callImageAPI(originalImageBase64, item.prompt || constructPrompt());
                        await addToHistory(res, item.style, item.prompt);
                        generatedImageBase64 = res; imageAfter.src = res;
                    } catch (e) { showToast("Error"); } finally { hideGlobalLoader(); }
                }
            ));

            // 3. Editar
            actions.appendChild(createBtn('btn-sq-purple',
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
                'Editar Imagen',
                () => openRegenModal(item.image, 'edit')
            ));

            // 4. Fondo
            actions.appendChild(createBtn('btn-sq-orange',
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" ry="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-4.5-4.5L9 18"/><path d="M5 16l2-2 3.5 3.5"/></svg>',
                'Cambiar Fondo',
                () => openRegenModal(item.image, 'bg')
            ));

            // 5. Eliminar
            actions.appendChild(createBtn('btn-sq-red',
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
                'Eliminar',
                async () => {
                    try {
                        await historyManager.delete(item.id);
                    } catch (error) {
                        console.warn('No se pudo eliminar del historial:', error);
                    }
                }
            ));

            wrapper.onclick = () => openLightbox(item.image);
            wrapper.append(thumb, actions);
            historyContainer.appendChild(wrapper);
        });
    };

    const mapHistoryEntry = (entry) => ({
        id: entry.id,
        image: entry.imageData || entry.imageUrl || (entry.data && entry.data.url) || '',
        original: (entry.data && entry.data.original) || null,
        style: (entry.data && entry.data.style) || { style: 'Personalizado', subcategory: 'Generado' },
        prompt: (entry.data && entry.data.prompt) || '',
        createdAt: entry.createdAt ? new Date(entry.createdAt).getTime() : Date.now(),
        aspectRatio: (entry.data && entry.data.aspectRatio) || '1:1',
        size: (entry.data && entry.data.size) || '1024'
    });

    async function handleDownloadAll() {
        if (!historyManager || !historyManager.getAll().length) return;
        await ensureJSZip();
        const zip = new JSZip();
        historyManager.getAll().forEach((entry, i) => {
            const img = entry.imageData || entry.imageUrl || (entry.data && entry.data.url) || '';
            if (img && img.includes(',')) zip.file(`outfit_${i}.png`, img.split(',')[1], { base64: true });
        });
        const c = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(c); a.download = 'outfits.zip'; a.click();
    }

    function ensureJSZip() {
        return new Promise(r => { if (window.JSZip) return r(); const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'; s.onload = r; document.head.appendChild(s); });
    }

    const callApi = async (payload) => {
        let response;
        for (let i = 0; i < 3; i++) {
            try {
                response = await fetch('proxy.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (response.ok && data.success) return data;
                if (data.error && data.error.message) throw new Error(data.error.message);
                throw new Error('API Error: ' + response.status);
            } catch (e) {
                if (i === 2) throw e;
                await new Promise(r => setTimeout(r, 1500 * (i + 1)));
            }
        }
        throw new Error("API Failed after retries");
    };

    const callTextAPI = async (prompt) => {
        const data = await callApi({
            action: 'text',
            prompt: prompt
        });
        return data.text || '';
    };

    const callMultimodalAPI = async (prompt, base64Image) => {
        const data = await callApi({
            action: 'vision',
            prompt: prompt,
            image: base64Image,
            mimeType: 'image/jpeg'
        });
        return data.text || '';
    };

    const upscaleDataUrl = async (dataUrl, targetW, targetH) => {
        if (!targetW || !targetH) return dataUrl;
        const img = await new Promise((res, rej) => {
            const im = new Image(); im.crossOrigin = 'anonymous';
            im.onload = () => res(im); im.onerror = rej; im.src = dataUrl;
        });
        if (img.naturalWidth >= targetW && img.naturalHeight >= targetH) return dataUrl;
        const c = document.createElement('canvas');
        c.width = targetW;
        c.height = targetH;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);
        return c.toDataURL('image/png', 0.92);
    };

    const callImageAPI = async (base64Image, prompt) => {
        const dims = computeTargetDims(selectedAR, selectedRes);
        const needsUpscale = selectedRes === 4096;

        const data = await callApi({
            action: 'generate',
            image: base64Image,
            prompt: prompt,
            quality: selectedQuality,
            width: dims.width,
            height: dims.height
        });

        if (!data.image) {
            throw new Error("La API no devolvió imagen.");
        }

        let resultUrl = `data:${data.mimeType || 'image/png'};base64,${data.image}`;
        resultUrl = await postProcessDataURL(resultUrl);

        // Upscale cliente si pidió 4096
        if (needsUpscale) {
            const targetDims = computeTargetDims(selectedAR, 4096);
            resultUrl = await upscaleDataUrl(resultUrl, targetDims.width, targetDims.height);
        }

        return resultUrl;
    };

    init();
});