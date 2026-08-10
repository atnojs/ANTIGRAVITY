const ReactObj = window.React || {};
const { useState, useRef, useEffect, useCallback } = ReactObj;
const ReactDOM = window.ReactDOM || {};

/* ─── Lucide Icons ─── */
const toPascal = (k) => k.split('-').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join('');
const Icon = ({ name, size=22, className='' }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (!ref.current || !window.lucide) return;
        ref.current.innerHTML = '';
        try {
            const d = window.lucide.icons[toPascal(name)];
            if (d) {
                const svg = window.lucide.createElement(d);
                svg.setAttribute('width', size); svg.setAttribute('height', size);
                if (className) className.split(/\s+/).filter(Boolean).forEach(c => svg.classList.add(c));
                ref.current.appendChild(svg);
            }
        } catch(e) {}
    }, [name, size, className]);
    return <span ref={ref} style={{display:'inline-flex',width:size,height:size}} />;
};
const S  = (p) => <Icon name="sparkles" {...p} />;
const W  = (p) => <Icon name="wand-2" {...p} />;
const L  = (p) => <Icon name="loader-2" {...p} />;
const Img= (p) => <Icon name="image" {...p} />;
const Dn = (p) => <Icon name="download" {...p} />;
const Tr = (p) => <Icon name="trash-2" {...p} />;
const Re = (p) => <Icon name="refresh-cw" {...p} />;
const Up = (p) => <Icon name="upload" {...p} />;
const Mo = (p) => <Icon name="monitor" {...p} />;
const Sp = (p) => <Icon name="smartphone" {...p} />;
const Sq = (p) => <Icon name="square" {...p} />;
const RH = (p) => <Icon name="rectangle-horizontal" {...p} />;
const RV = (p) => <Icon name="rectangle-vertical" {...p} />;
const Xx = (p) => <Icon name="x" {...p} />;
const Ed = (p) => <Icon name="pencil" {...p} />;

/* ─── CONSTANTES ─── */
const ASPECT_RATIOS = [
    { id: '1:1', name: '1:1', icon: <Sq size={16} /> },
    { id: '3:4', name: '3:4', icon: <RV size={16} /> },
    { id: '16:9', name: '16:9', icon: <Mo size={16} /> },
    { id: '9:16', name: '9:16', icon: <Sp size={16} /> },
    { id: '21:9', name: '21:9', icon: <RH size={16} /> }
];

const MODELS = [
    { id: 'gemini-flash', label: '3.1FLASH' },
    { id: 'gemini-pro', label: '3 PRO' },
    { id: 'flux-pro', label: 'FLUX PRO' },
    { id: 'flux-max', label: 'FLUX MAX' }
];
const getModelLabel = (m) => (MODELS.find(x => x.id === m) || {}).label || m || '—';

const STYLES = [
    { id: 'fotorrealismo', name: 'Fotorrealista', desc: 'Hyper-realismo 8K, luz natural, detalle extremo' },
    { id: 'cinematografico', name: 'Cinematografico', desc: 'Lente anamorfico, niebla, atmosfera epica' },
    { id: '3d-render', name: '3D Hyper-Render', desc: 'Render Octane, ray-tracing, texturas HD' },
    { id: 'anime', name: 'Anime Moderno', desc: 'Cel-shading, fondos acuarela, trazos nitidos' },
    { id: 'oleo', name: 'Pintura al Oleo', desc: 'Impasto, claroscuro, textura de galeria' },
    { id: 'acuarela', name: 'Acuarela Artistica', desc: 'Bordes suaves, transparencias etereas' },
    { id: 'cyberpunk', name: 'Cyberpunk', desc: 'Neon, calles mojadas, megaestructuras' },
    { id: 'minimalista', name: 'Minimalismo Puro', desc: 'Formas limpias, espacio negativo, elegancia' },
    { id: 'surrealista', name: 'Surrealismo', desc: 'Paisajes oniricos, escalas imposibles' },
    { id: 'pop-art', name: 'Pop Art', desc: 'Colores saturados, semitonos, comic' },
    { id: 'pixel-art', name: 'Pixel Art', desc: '8-bit/16-bit retro, paletas limitadas' },
    { id: 'boceto', name: 'Boceto a Lapiz', desc: 'Grafito, sombreado cruzado, textura papel' },
    { id: 'vintage', name: 'Vintage/Retro', desc: 'Grano analogico, colores calidos nostalgicos' },
    { id: 'fantasia', name: 'Fantasia Epica', desc: 'Magia, criaturas legendarias, escala epica' },
    { id: 'moda-editorial', name: 'Moda Editorial', desc: 'Alta costura, poses dramaticas, Vogue' },
    { id: 'noir', name: 'Cine Negro/Noir', desc: 'Claroscuro, sombras profundas, blanco y negro' },
    { id: 'naturaleza', name: 'Naturaleza Salvaje', desc: 'National Geographic, fauna, hora dorada' },
    { id: 'steampunk', name: 'Steampunk', desc: 'Laton, engranajes victorianos, vapor' },
    { id: 'ghibli', name: 'Studio Ghibli', desc: 'Fondos pintados, atmosfera magica nostalgica' },
    { id: 'lego', name: 'Estilo LEGO', desc: 'Ladrillos plasticos, texturas de juguete' }
];

const STYLE_SUFFIXES = {
    'fotorrealismo': 'Hyper-photorealistic, 8K, natural lighting, extreme detail, shot on Hasselblad.',
    'cinematografico': 'Cinematic film still, anamorphic lens, dramatic lighting, shallow depth of field.',
    '3d-render': 'Professional Octane render, 8K, ray-tracing, hyper-detailed textures, studio lighting.',
    'anime': 'Modern anime style, vibrant cel-shading, sharp line art, expressive characters.',
    'oleo': 'Masterpiece oil painting, thick impasto, chiaroscuro, gallery quality.',
    'acuarela': 'Exquisite watercolor, soft bleeding edges, luminous transparency.',
    'cyberpunk': 'Cyberpunk aesthetic, neon lighting, rain-soaked streets, synthwave.',
    'minimalista': 'Minimalist design, clean shapes, negative space, elegant simplicity.',
    'surrealista': 'Surrealist dreamscape, impossible proportions, Dali-esque.',
    'pop-art': 'Pop Art style, bold colors, Ben-Day dots, comic aesthetic.',
    'pixel-art': '16-bit pixel art, retro video game aesthetic, clean pixel grid.',
    'boceto': 'Artistic pencil sketch, charcoal shading, textured paper.',
    'vintage': 'Vintage film aesthetic, Kodak Portra colors, natural grain.',
    'fantasia': 'High fantasy concept art, magical elements, epic scale.',
    'moda-editorial': 'High-fashion editorial, dramatic posing, Vogue style.',
    'noir': 'Film noir, chiaroscuro, deep shadows, 1940s atmosphere.',
    'naturaleza': 'Award-winning nature photography, golden hour, National Geographic.',
    'steampunk': 'Steampunk, polished brass, Victorian gears, steam-powered.',
    'ghibli': 'Studio Ghibli style, painterly backgrounds, magical aesthetic.',
    'lego': 'LEGO aesthetic, plastic block textures, toy photography.'
};

/* ─── HISTORIAL ─── */
let hmReady = false;
const ensureHM = async () => {
    if (hmReady) return;
    if (typeof window.HistoryManager === 'undefined') return;
    window.HistoryManager.configure({ dbName: 'estudio_creativo_db', maxItems: 200 });
    await window.HistoryManager.init();
    hmReady = true;
};
const loadHistory = async (mode) => {
    try { await ensureHM(); if (!hmReady) return [];
        const items = await window.HistoryManager.loadAll();
        return items.filter(i => (i.mode || 'remix') === mode).sort((a,b) => (b.createdAt||0)-(a.createdAt||0));
    } catch(e) { return []; }
};
const saveHistoryItem = async (item) => {
    try { await ensureHM(); if (hmReady) await window.HistoryManager.saveItem(item); } catch(e) {}
};
const deleteHistoryItem = async (id) => {
    try { await ensureHM(); if (hmReady) await window.HistoryManager.deleteItem(id); } catch(e) {}
};
const clearHistoryAll = async (mode) => {
    try { await ensureHM(); if (!hmReady) return;
        const all = await window.HistoryManager.loadAll();
        for (const i of all) { if ((i.mode||'remix')===mode) await window.HistoryManager.deleteItem(i.id); }
    } catch(e) {}
};
/* ─── HELPERS ─── */
const getClosestAR = (w,h) => { const r = w/h; const t = [{id:'1:1',v:1},{id:'3:4',v:0.75},{id:'16:9',v:1.778},{id:'9:16',v:0.5625},{id:'21:9',v:2.333}]; return t.reduce((a,b) => Math.abs(b.v-r) < Math.abs(a.v-r) ? b : a).id; };
const resizeImg = (url, maxW=1024, q=0.85) => new Promise(res => { const i = new Image(); i.src = url; i.onload = () => { let w=i.width, h=i.height; if (w>maxW || h>maxW) { if (w>h) { h=Math.round(h*maxW/w); w=maxW; } else { w=Math.round(w*maxW/h); h=maxW; } } const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(i,0,0,w,h); res(c.toDataURL('image/jpeg',q)); }; });

/* ─── API ─── */
const PROXY_URL = './proxy.php';
const callProxy = async (model, contents, config={}, promptText='') => {
    const payload = { model:(window.selectedModel || model), prompt:promptText, contents, ...config };
    const resp = await fetch(PROXY_URL, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (!resp.ok) { const t = await resp.text(); throw new Error('Error '+resp.status+': '+t.slice(0,200)); }
    return await resp.json();
};

const generateImage = async (params) => {
    const prompt = (params.prompt||'').trim(); const suffix = (params.styleSuffix||'').trim();
    const fullPrompt = `${prompt} ${suffix}`.trim();
    let finalPrompt = '';
    if (params.sourceImage) {
        const arMsg = 'Adjust aspect ratio to '+params.aspectRatio+'.';
        finalPrompt = suffix ? arMsg+' TRANSFORM this image into: '+fullPrompt+'. Fill '+params.aspectRatio+' perfectly.'
                             : arMsg+' Fill empty areas seamlessly. Result must be complete, natural.';
    } else { finalPrompt = fullPrompt || 'A beautiful high-quality image'; }
    const parts = [{text:finalPrompt}];
    if (params.sourceImage) { const b64 = params.sourceImage.split(',')[1]; parts.push({inlineData:{data:b64,mimeType:'image/jpeg'}}); }
    const contents = [{parts}];
    const cfg = {aspectRatio:params.aspectRatio, resolution:'1K', generationConfig:{imageConfig:{aspectRatio:params.aspectRatio}}};
    const r = await callProxy('flux', contents, cfg, finalPrompt);
    if (!r?.success || !r?.imageUrl) throw new Error(r?.error?.message || 'No se pudo generar la imagen');
    return r.imageUrl;
};

const enhancePromptAPI = async (basePrompt) => {
    try {
        const sys = 'Eres un experto en mejora de prompts para generacion de imagenes. Respeta la intencion del usuario. No inventes sujetos nuevos. Genera 4 variantes en espanol: Descriptiva, Cinematografica, Artistica, Minimalista. Responde SOLO JSON: [{"type":"Descriptiva","text":"..."},{"type":"Cinematografica","text":"..."},{"type":"Artistica","text":"..."},{"type":"Minimalista","text":"..."}]';
        const r = await callProxy('',[],{action:'text',system:sys,model:'openrouter/auto',temperature:0.7,max_tokens:2000},basePrompt);
        if (!r?.success || !r?.text) return [];
        const raw = String(r.text||'').trim(); const m = raw.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(m?m[0]:raw);
        return (Array.isArray(parsed)?parsed:[]).filter(p=>p&&p.type&&p.text);
    } catch(e) { console.error('Enhance error:',e); return []; }
};

const analyzeImageAPI = async (imgB64, promptText) => {
    try {
        const compressed = await resizeImg(imgB64); const b64 = compressed.split(',')[1];
        const sys = 'Eres un experto en edicion de imagenes. Analiza esta imagen y genera 4 variantes para editarla: Iluminacion, Fondo, Detalles, Calidad. Responde SOLO JSON: [{"type":"Iluminacion","text":"..."},{"type":"Fondo","text":"..."},{"type":"Detalles","text":"..."},{"type":"Calidad","text":"..."}]';
        const r = await callProxy('',[],{action:'text',system:sys,model:'openai/gpt-4o',temperature:0.7,max_tokens:2000,imagen:b64},promptText||'Analiza esta imagen y sugiere mejoras');
        if (!r?.success || !r?.text) return [];
        const raw = String(r.text||'').trim(); const m = raw.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(m?m[0]:raw);
        return (Array.isArray(parsed)?parsed:[]).filter(p=>p&&p.type&&p.text);
    } catch(e) { console.error('Analyze error:',e); return []; }
};
/* ─── COMPONENTS ─── */
const LoadingOverlay = ({ status='' }) => (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
        <div className="spinner-triple"><div className="ring ring-1"></div><div className="ring ring-2"></div><div className="ring ring-3"></div></div>
        <p className="loading-text">IA generando lo solicitado...</p>
        <div className="progress-panel">
            <div className="progress-bar-track"><div className="progress-bar-fill" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div></div>
            <div className="secondary-status">{status || 'Procesando solicitud...'}</div>
        </div>
    </div>
);

const Splash = ({ onSelect }) => (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',gap:'3rem',padding:'2rem'}}>
        <div style={{textAlign:'center'}}>
            <h1 className="splash-title">Estudio Creativo</h1>
            <p className="splash-subtitle">Generacion y Edicion de Imagenes con IA</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))',gap:'1.5rem',maxWidth:'52rem',width:'100%'}}>
            <div className="splash-card" onClick={() => onSelect('remix')}>
                <div className="splash-card-icon"><W size={32}/></div>
                <h2>Editar Imagen</h2>
                <p>Transforma imagenes existentes con la potencia de FLUX y Gemini. Sube tu foto, describe los cambios y la IA los aplica.</p>
            </div>
            <div className="splash-card" onClick={() => onSelect('text-to-image')}>
                <div className="splash-card-icon"><S size={32}/></div>
                <h2>Generar Imagenes</h2>
                <p>Describe tu vision y FLUX o Gemini la materializaran en alta resolucion. 14 estilos artisticos, 4 modelos y control total.</p>
            </div>
        </div>
    </div>
);

const ImageCard = ({ image, onDelete, onRegenerate, onEdit, onClick }) => {
    const [copied, setCopied] = useState(false);
    const copyPrompt = (e) => {
        e.stopPropagation();
        const text = image.prompt || '';
        if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false),1600); }).catch(()=>{}); }
        else { const ta = document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); setCopied(true); setTimeout(()=>setCopied(false),1600); }
    };
    const dl = (e) => { e.stopPropagation(); const a=document.createElement('a'); a.href=image.url; a.download='estudio-'+image.id+'.jpg'; a.click(); };
    return (
        <div onClick={() => onClick && onClick(image)} className="image-card">
            <img src={image.url} alt={image.prompt} loading="lazy" />
            <div className="image-card-overlay">
                <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                    <button onClick={(e)=>{e.stopPropagation();onRegenerate(image);}} className="card-action"><Re size={16}/></button>
                    <button onClick={(e)=>{e.stopPropagation();onEdit(image);}} className="card-action"><Ed size={16}/></button>
                    <button onClick={dl} className="card-action"><Dn size={16}/></button>
                    <button onClick={(e)=>{e.stopPropagation();onDelete(image.id);}} className="card-action delete"><Tr size={16}/></button>
                </div>
            </div>
            <div style={{padding:'0.6rem',display:'flex',flexDirection:'column',gap:'0.3rem'}}>
                <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap'}}>
                    <span className="card-badge">{image.style?.name || 'Estilo'}</span>
                    <span className="card-badge">{image.aspectRatio}</span>
                    <span className="card-badge">{getModelLabel(image.model)}</span>
                </div>
                <p className="card-prompt">{image.prompt}</p>
            </div>
        </div>
    );
};

const LightboxModal = ({ image, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <button className="modal-close" onClick={onClose} style={{top:'1rem',right:'1rem'}}><Xx size={20}/></button>
        <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-image-wrap">
                <img src={image.url} alt={image.prompt} />
            </div>
            <div className="modal-info">
                <span className="modal-badge">Obra IA de Alta Gama</span>
                <div className="modal-prompt-box">"{image.prompt}"</div>
                <div className="modal-stats">
                    <div className="modal-stat"><span className="modal-stat-label">Formato</span><span className="modal-stat-value">{image.aspectRatio}</span></div>
                    <div className="modal-stat"><span className="modal-stat-label">Modelo</span><span className="modal-stat-value">{getModelLabel(image.model)}</span></div>
                    <div className="modal-stat"><span className="modal-stat-label">Resolucion</span><span className="modal-stat-value">{image.size||'1K'}</span></div>
                    <div className="modal-stat"><span className="modal-stat-label">ID</span><span className="modal-stat-value" style={{fontSize:'0.65rem'}}>{image.id}</span></div>
                </div>
                {image.tags && image.tags.length>0 && (
                    <div className="modal-tags">{image.tags.map((t,i) => <span key={i} className="modal-tag">#{t}</span>)}</div>
                )}
                <button className="btn-download-modal" onClick={() => { const a=document.createElement('a'); a.href=image.url; a.download='estudio-'+image.id+'.jpg'; a.click(); }}>
                    <Dn size={18}/> Descargar Imagen
                </button>
                <div style={{fontSize:'0.6rem',color:'var(--text-dim)',textAlign:'center'}}>
                    Creado: {new Date(image.createdAt).toLocaleString()}
                </div>
            </div>
        </div>
    </div>
);
/* ─── APP ─── */
const App = () => {
    const [view, setView] = useState('splash');
    const [mode, setMode] = useState('remix');
    const [prompt, setPrompt] = useState('');
    const [enhancedPrompts, setEnhancedPrompts] = useState([]);
    const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
    const [selectedAR, setSelectedAR] = useState('1:1');
    const [selectedModel, setSelectedModel] = useState('gemini-pro');
    const [images, setImages] = useState([]);
    const [remixSource, setRemixSource] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [progressStatus, setProgressStatus] = useState('');
    const [error, setError] = useState(null);
    const [lightboxImg, setLightboxImg] = useState(null);
    const [editImage, setEditImage] = useState(null);
    const [editInstruction, setEditInstruction] = useState('');
    const fileRef = useRef(null);

    useEffect(() => { window.selectedModel = selectedModel; }, [selectedModel]);

    useEffect(() => {
        (async () => { if (view==='editor') { const items = await loadHistory(mode); setImages(items); } })();
    }, [view, mode]);

    const handleStart = (m) => { setMode(m); setView('editor'); setPrompt(''); setEditInstruction(''); setEnhancedPrompts([]); if (m==='text-to-image') setRemixSource(null); setError(null); };

    const handleFile = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const r = new FileReader(); r.onload = (f) => {
            const img = new Image(); img.onload = () => { setSelectedAR(getClosestAR(img.width,img.height)); setRemixSource(f.target.result); setEnhancedPrompts([]); };
            img.src = f.target.result;
        }; r.readAsDataURL(file);
    };

    const handleEnhance = async () => {
        if (mode==='remix' && !remixSource) { setError('Sube una imagen antes de mejorar el prompt.'); return; }
        if (mode==='text-to-image' && !prompt.trim()) { setError('Escribe una descripcion antes de mejorar.'); return; }
        setIsEnhancing(true);
        try {
            let enhanced;
            if (mode==='remix') { enhanced = await analyzeImageAPI(remixSource, prompt.trim()); }
            else { enhanced = await enhancePromptAPI(prompt); }
            setEnhancedPrompts(enhanced);
        } catch(e) { setEnhancedPrompts([]); } finally { setIsEnhancing(false); }
    };

    const handleGenerate = async (finalPrompt = prompt) => {
        const effPrompt = (typeof finalPrompt === 'string' ? finalPrompt : prompt).trim();
        if (mode==='text-to-image' && !effPrompt) { setError('Escribe una descripcion antes de generar.'); return; }
        if (mode==='remix' && !remixSource) { setError('Sube una imagen para poder editarla.'); return; }
        setIsGenerating(true); setError(null); setProgressStatus('Preparando...');
        try {
            const suffix = STYLE_SUFFIXES[selectedStyle.id] || '';
            let source = mode==='remix' ? (remixSource||undefined) : undefined;
            if (source) source = await resizeImg(source);
            setProgressStatus('Generando primera imagen...');
            const url1 = await generateImage({ prompt:effPrompt, styleSuffix:suffix, aspectRatio:selectedAR, sourceImage:source });
            const img1 = { id:'gen-'+Date.now(), url:url1, prompt:effPrompt, style:selectedStyle, aspectRatio:selectedAR, model:selectedModel, size:'1K', mode:mode, createdAt:Date.now() };
            await saveHistoryItem(img1);
            setProgressStatus('Generando variacion...');
            const varPrompt = effPrompt + ', alternative variation with different composition and perspective';
            const url2 = await generateImage({ prompt:varPrompt, styleSuffix:suffix, aspectRatio:selectedAR, sourceImage:source });
            await new Promise(r=>setTimeout(r,50));
            const img2 = { id:'gen-'+Date.now(), url:url2, prompt:effPrompt, style:selectedStyle, aspectRatio:selectedAR, model:selectedModel, size:'1K', mode:mode, createdAt:Date.now() };
            await saveHistoryItem(img2);
            setImages(prev => [img2, img1, ...prev]);
            setProgressStatus('Completado');
        } catch(e) { setError(e.message||'Error de generacion'); }
        finally { setTimeout(() => { setIsGenerating(false); setProgressStatus(''); }, 500); }
    };

    const handleDelete = async (id) => { await deleteHistoryItem(id); setImages(prev => prev.filter(i=>i.id!==id)); };
    const handleClear = async () => { if (!confirm('Eliminar todo el historial de este modo?')) return; await clearHistoryAll(mode); setImages([]); };
    const handleRegenerate = (img) => { setPrompt(img.prompt); if (img.style) setSelectedStyle(img.style); setSelectedAR(img.aspectRatio); if (img.model) setSelectedModel(img.model); handleGenerate(img.prompt); };
    const handleOpenEdit = (img) => { setEditImage(img); setEditInstruction(''); };
    const handleEditSubmit = async () => {
        if (!editImage || !editInstruction.trim()) return; setIsGenerating(true);
        try {
            const comp = await resizeImg(editImage.url);
            const updatedUrl = await generateImage({ prompt:editInstruction, styleSuffix:'', aspectRatio:editImage.aspectRatio, sourceImage:comp });
            const up = {...editImage, id:'edit-'+Date.now(), url:updatedUrl, mode:mode, model:selectedModel, createdAt:Date.now()};
            await saveHistoryItem(up); setImages([up,...images]); setEditImage(null);
        } catch(e) { setError('Error de edicion'); } finally { setIsGenerating(false); }
    };

    const genDisabled = isGenerating || (mode==='text-to-image' && !prompt.trim()) || (mode==='remix' && !remixSource);

    if (view==='splash') return <Splash onSelect={handleStart} />;

    return (
        <div style={{display:'flex',flexDirection:'column',minHeight:'100vh'}}>
            {isGenerating && <LoadingOverlay status={progressStatus} />}
            {editImage && (
                <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',background:'rgba(0,4,12,0.9)',backdropFilter:'blur(14px)'}}>
                    <div style={{maxWidth:'36rem',width:'100%',borderRadius:'14px',background:'var(--card-bg)',border:'1px solid var(--border)',boxShadow:'0 0 30px var(--glow-soft)',overflow:'hidden'}}>
                        <div style={{padding:'1.25rem',borderBottom:'1px solid var(--border-dim)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                            <h3 style={{fontFamily:'var(--font-ui)',color:'var(--acc)',textTransform:'uppercase',fontSize:'0.9rem',display:'flex',alignItems:'center',gap:'0.5rem'}}><W size={20}/> Refinar Imagen</h3>
                            <button onClick={()=>setEditImage(null)} style={{color:'var(--muted)',fontSize:'1.2rem'}}><Xx size={20}/></button>
                        </div>
                        <div style={{padding:'1.25rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
                            <img src={editImage.url} style={{maxHeight:'180px',objectFit:'contain',borderRadius:'8px',border:'1px solid var(--border-dim)'}} alt="Edit" />
                            <textarea value={editInstruction} onChange={e=>setEditInstruction(e.target.value)} placeholder="Describe el cambio que quieres aplicar..." className="prompt-textarea" rows={3} />
                            <button onClick={handleEditSubmit} disabled={isGenerating || !editInstruction.trim()} className="btn-generate active" style={{padding:'0.75rem',fontSize:'0.85rem'}}>
                                {isGenerating ? <><L className="animate-spin" size={18}/> Aplicando...</> : <><S size={18}/> Aplicar Cambio</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {lightboxImg && <LightboxModal image={lightboxImg} onClose={()=>setLightboxImg(null)} />}
            <div className="editor-layout">
                {/* SIDEBAR */}
                <aside className="editor-sidebar custom-scrollbar">
                    <button onClick={()=>setView('splash')} className="btn-goback">← Volver</button>
                    <h1 style={{fontSize:'1.3rem'}} className="app-title">{mode==='remix' ? 'Editar Imagen' : 'Generar Imagenes'}</h1>

                    {mode==='remix' && (
                        <div>
                            <div className="label-row"><span className="label-icon"><Up size={16}/></span><span className="label-text">Imagen a Editar</span></div>
                            <div onClick={()=>fileRef.current?.click()} className="dropzone" style={{minHeight: remixSource ? 'auto' : '100px'}}>
                                <input type="file" ref={fileRef} onChange={handleFile} style={{display:'none'}} accept="image/*" />
                                {remixSource ? <img src={remixSource} alt="Src" style={{maxHeight:'140px',borderRadius:'8px'}} />
                                : <div><div className="dropzone-icon"><Up size={24}/></div><div className="dropzone-title">Clic o arrastra una imagen</div></div>}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="label-row"><span className="label-icon"><Ed size={16}/></span><span className="label-text">{mode==='remix'?'Especifica los cambios':'Describe tu imagen'}</span></div>
                        <div style={{position:'relative'}}>
                            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={mode==='remix'?'Describe que quieres cambiar...':'Detalla lo que quieres ver en tu imagen...'} className="prompt-textarea" rows={4} />
                            <button onClick={handleEnhance} disabled={isEnhancing || !prompt.trim()} title="Mejorar con IA" style={{position:'absolute',bottom:'0.5rem',right:'0.5rem',padding:'0.5rem',borderRadius:'50%',background:'rgba(0,208,208,0.15)',border:'1px solid var(--border)',color:'var(--acc)',cursor:'pointer',display:'flex'}}>
                                {isEnhancing ? <L size={16} className="animate-spin"/> : <S size={16}/>}
                            </button>
                        </div>
                    </div>

                    {enhancedPrompts.length>0 && (
                        <div className="prompt-chips">
                            {enhancedPrompts.map((p,i) => (
                                <button key={i} onClick={()=>{setPrompt(p.text);setEnhancedPrompts([]);}} className="prompt-chip">
                                    <div className="prompt-chip-type">{p.type}</div>
                                    <div>{p.text.length>100?p.text.slice(0,100)+'...':p.text}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    <div>
                        <div className="label-row"><span className="label-icon" style={{color:'var(--acc2)'}}>◆</span><span className="label-text">Estilo Visual</span></div>
                        <div className="styles-carousel">
                            {STYLES.map(s => (
                                <button key={s.id} onClick={()=>setSelectedStyle(s)} className={`style-chip ${selectedStyle.id===s.id?'selected':''}`}>
                                    <div className="style-chip-img" style={{background:'linear-gradient(135deg, var(--card-bg), var(--contenedor))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',color:'var(--acc)'}}>
                                        {s.id===selectedStyle.id ? '✦' : '○'}
                                    </div>
                                    <div className="style-chip-info">{s.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="ar-label">Formato de Salida</div>
                    <div className="ar-grid">
                        {ASPECT_RATIOS.map(ar => (
                            <button key={ar.id} onClick={()=>setSelectedAR(ar.id)} className={`ar-btn ${selectedAR===ar.id?'active':''}`}>
                                {ar.icon}
                                <span>{ar.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="model-selector">
                        <span className="model-selector-label">Modelo IA</span>
                        <div className="model-toggle-group" role="group" aria-label="Seleccionar modelo">
                            {MODELS.map(m => (
                                <button key={m.id} onClick={()=>setSelectedModel(m.id)} className={`model-toggle ${selectedModel===m.id?'active':''}`} aria-pressed={selectedModel===m.id}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={()=>handleGenerate()} disabled={genDisabled} className={`btn-generate ${!genDisabled?'active':''}`} style={{marginTop:'0.5rem'}}>
                        {isGenerating ? <><L className="animate-spin" size={20}/> PROCESANDO...</> : <><S size={20}/> {mode==='remix'?'GENERAR EDICION':'GENERAR IMAGENES (x2)'}</>}
                    </button>
                    {error && <div className="error-msg">{error}</div>}
                </aside>

                {/* MAIN GALLERY */}
                <main className="editor-main custom-scrollbar">
                    <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:'1.5rem'}}>
                        <div>
                            <h2 className="section-title">{mode==='remix'?'Historial de Ediciones':'Historial de Imagenes Generadas'}</h2>
                            <p className="empty-subtitle" style={{textAlign:'left',margin:0}}>Todas tus creaciones en un solo lugar.</p>
                        </div>
                        {images.length>0 && (
                            <button onClick={handleClear} className="btn-goback" style={{color:'var(--text-dim)',borderColor:'rgba(255,80,80,0.25)'}}>
                                <Tr size={14}/> Limpiar
                            </button>
                        )}
                    </div>
                    {images.length===0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon"><Img size={64}/></div>
                            <h3 className="empty-title">No hay imagenes aun</h3>
                            <p className="empty-subtitle">Describe tu idea en el panel lateral y pulsa Generar.</p>
                        </div>
                    ) : (
                        <div className="masonry-grid">
                            {images.map(img => (
                                <ImageCard key={img.id} image={img} onDelete={handleDelete} onRegenerate={handleRegenerate} onEdit={handleOpenEdit} onClick={setLightboxImg} />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

/* ─── BOOT ─── */
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
