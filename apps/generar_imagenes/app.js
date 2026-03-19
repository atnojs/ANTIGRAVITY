/* app.js */
(() => {
    const { useState, useEffect, useRef } = React;

    /* ==== FIREBASE SETUP ==== */
    console.log("DEBUG: generar_imagenes app.js loaded");
    const firebaseConfig = {
        apiKey: "AIzaSyAlTZgodkiHACqJSRcDqymTdvaegBdLZMk",
        authDomain: "nanobanana-cbb2d.firebaseapp.com",
        projectId: "nanobanana-cbb2d",
        storageBucket: "nanobanana-cbb2d.firebasestorage.app",
        messagingSenderId: "490656740654",
        appId: "1:490656740654:web:104f76973c1254d5b876bf",
        measurementId: "G-8XK035PGTV"
    };


    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Forzar logout al cargar la página para siempre pedir login (solo se ejecuta 1 vez)
    auth.signOut();

    /* ==== USER MANAGEMENT ==== */
    const ADMIN_EMAIL = 'atnojs@gmail.com';
    const DAILY_LIMIT = 8;

    // Crear o actualizar documento de usuario en Firestore
    const ensureUserDocument = async (user) => {
        if (!user) return null;

        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            // Crear nuevo usuario
            const userData = {
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: user.email === ADMIN_EMAIL ? 'admin' : 'free',
                usage: {
                    date: new Date().toISOString().split('T')[0],
                    count: 0
                },
                subscriptionStatus: 'none'
            };
            await userRef.set(userData);
            return userData;
        }

        return userDoc.data();
    };

    // Obtener datos del usuario
    const getUserData = async (uid) => {
        const userDoc = await db.collection('users').doc(uid).get();
        return userDoc.exists ? userDoc.data() : null;
    };

    // Verificar si el usuario puede generar
    const checkCanGenerate = (userData) => {
        if (!userData) return { canGenerate: false, reason: 'No user data' };

        // Admin y VIP tienen acceso ilimitado
        if (userData.role === 'admin' || userData.role === 'vip') {
            return { canGenerate: true, remaining: '∞' };
        }

        // Verificar límite diario para usuarios free
        const today = new Date().toISOString().split('T')[0];

        // Handle case where usage object doesn't exist yet
        if (!userData.usage) {
            return { canGenerate: true, remaining: DAILY_LIMIT };
        }

        if (userData.usage.date !== today) {
            // Nuevo día, resetear contador
            return { canGenerate: true, remaining: DAILY_LIMIT };
        }

        const remaining = DAILY_LIMIT - (userData.usage.count || 0);
        if (remaining <= 0) {
            return { canGenerate: false, reason: 'Límite diario alcanzado', remaining: 0 };
        }

        return { canGenerate: true, remaining };
    };

    // Incrementar contador de uso
    const incrementUsage = async (uid) => {
        const userRef = db.collection('users').doc(uid);
        const userData = await getUserData(uid);

        if (!userData) return;

        const today = new Date().toISOString().split('T')[0];

        if (userData.usage.date !== today) {
            // Nuevo día, resetear
            await userRef.update({
                'usage.date': today,
                'usage.count': 1
            });
        } else {
            // Incrementar
            await userRef.update({
                'usage.count': firebase.firestore.FieldValue.increment(1)
            });
        }
    };

    /* ==== CONSTANTES BÁSICAS ==== */
    const PRE_PROMPT_BASE = "CRITICAL: ABSOLUTELY NO TEXT, NO WATERMARKS. If a base image is provided, PRESERVE IT EXACTLY unless explicitly changed.";
    const PRE_PROMPT_INPAINT_VISUAL = "ROLE: Precise Image Editor. TASK: Edit ONLY the area highlighted with a RED semi-transparent overlay in the image. The rest of the image MUST REMAIN IDENTICAL.";

    /* ==== API ==== */
    const api = {
        async call(body) {
            const res = await fetch('./proxy.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
            return data;
        },
        enhancePrompt(prompt, isMaskMode = false) {
            return this.call({ task: 'enhancePrompt', prompt, isMaskMode });
        },
        // NUEVO: Analizar máscara para generar plantilla
        analyzeMask(imageB64) {
            return this.call({
                task: 'analyzeMaskPosition',
                images: [{ data: imageB64, mimeType: 'image/jpeg' }]
            });
        },

        generateImage(prompt, provider = 'gemini', images = [], aspectRatio = '', modalities = ['IMAGE'], maskDataObj = null) {
            const finalImages = [...images];
            let maskPayload = null;

            if (maskDataObj && maskDataObj.binary && images.length > 0) {
                const parts = maskDataObj.binary.split(',');
                if (parts.length === 2) {
                    maskPayload = { data: parts[1], mimeType: 'image/png' };
                }
            }
            const temp = (maskDataObj || images.length === 1 && provider === 'gemini') ? 0.3 : 0.6;

            const payload = {
                task: 'generateImage',
                provider,
                prompt,
                images: finalImages,
                maskImage: maskPayload,
                aspectRatio,
                modalities,
                generationConfig: { responseModalities: modalities, temperature: temp }
            };

            if (modalities.includes('IMAGE') && provider === 'gemini') {
                payload.imageConfig = { gradingPreset: 'filmic-soft', perceivedGamma: 1.03 };
            }
            return this.call(payload);
        }
    };

    /* ==== Utils ==== */
    const combineBaseAndMaskVisual = async (baseImgUrl, visualMaskUrl) => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const imgBase = new Image();
            const imgMask = new Image();

            imgBase.onload = () => {
                canvas.width = imgBase.width;
                canvas.height = imgBase.height;
                ctx.drawImage(imgBase, 0, 0);

                imgMask.onload = () => {
                    ctx.drawImage(imgMask, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                    resolve({
                        data: dataUrl.split(',')[1],
                        mimeType: 'image/jpeg'
                    });
                };
                imgMask.onerror = reject;
                imgMask.src = visualMaskUrl;
            };
            imgBase.onerror = reject;
            imgBase.src = baseImgUrl;
        });
    };

    const fileToPart = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ data: String(reader.result).split(',')[1], mimeType: file.type || 'image/png' });
        reader.onerror = reject; reader.readAsDataURL(file);
    });

    const dataURLtoFile = async (dataUrl, filename = `imagen-${Date.now()}.png`) => {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return new File([blob], filename, { type: blob.type || 'image/png' });
    };

    const cssAR = (ar) => {
        if (!ar || !ar.includes(':')) return '1 / 1';
        const [w, h] = ar.split(':'); return `${w} / ${h}`;
    };

    /* ==== COMPONENTE: SELECT ==== */
    const CustomSelect = ({ label, value, onChange, options, groups }) => {
        const [isOpen, setIsOpen] = useState(false);
        const containerRef = useRef(null);
        useEffect(() => {
            const click = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
            document.addEventListener('mousedown', click); return () => document.removeEventListener('mousedown', click);
        }, []);
        const selectedLabel = groups?.flatMap(g => g.options).find(o => o === value) || options?.find(o => o.value === value)?.label || value;
        return (
            <div ref={containerRef} className="custom-select-container">
                <label>{label}</label>
                <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
                    <span>{selectedLabel}</span>
                    <i className={`fa-solid fa-chevron-down ${isOpen ? 'fa-rotate-180' : ''}`} style={{ transition: '0.2s' }}></i>
                </div>
                {isOpen && (
                    <ul className="custom-select-options">
                        {groups ? groups.map(g => (
                            <React.Fragment key={g.label}>
                                <li className="custom-select-optgroup">{g.label}</li>
                                {g.options.map(opt => (
                                    <li key={opt} className={`custom-select-option ${value === opt ? 'selected' : ''}`} onClick={() => { onChange(opt); setIsOpen(false); }}>{opt}</li>
                                ))}
                            </React.Fragment>
                        )) : options.map(opt => (
                            <li key={opt.value} className={`custom-select-option ${value === opt.value ? 'selected' : ''}`} onClick={() => { onChange(opt.value); setIsOpen(false); }}>{opt.label}</li>
                        ))}
                    </ul>
                )}
            </div>
        );
    };

    /* ==== COMPONENTE: EDITOR DE MÁSCARA ==== */
    const MaskEditor = ({ src, onClose, onSave }) => {
        const canvasRef = useRef(null);
        const imgRef = useRef(null);
        const cursorRef = useRef(null);

        const [isDrawing, setIsDrawing] = useState(false);
        const [brushSize, setBrushSize] = useState(40);
        const [zoom, setZoom] = useState(1);
        const [context, setContext] = useState(null);
        const [showCursor, setShowCursor] = useState(false);

        useEffect(() => {
            const img = imgRef.current;
            const canvas = canvasRef.current;
            if (!img || !canvas) return;

            const initCanvas = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                setContext(ctx);
            };

            if (img.complete) initCanvas();
            else img.onload = initCanvas;
        }, [src]);

        useEffect(() => { if (context) context.lineWidth = brushSize; }, [brushSize, context]);

        const getCoords = (e) => {
            const rect = canvasRef.current.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const scaleX = canvasRef.current.width / rect.width;
            const scaleY = canvasRef.current.height / rect.height;
            const x = (clientX - rect.left) * scaleX;
            const y = (clientY - rect.top) * scaleY;
            return { x, y, clientX, clientY };
        };

        const updateCursor = (clientX, clientY) => {
            if (cursorRef.current) {
                const visualSize = brushSize * zoom;
                cursorRef.current.style.width = `${visualSize}px`;
                cursorRef.current.style.height = `${visualSize}px`;
                cursorRef.current.style.left = `${clientX}px`;
                cursorRef.current.style.top = `${clientY}px`;
            }
        };

        const startDraw = (e) => {
            if (!context) return;
            setIsDrawing(true);
            const { x, y, clientX, clientY } = getCoords(e);
            updateCursor(clientX, clientY);
            context.beginPath(); context.moveTo(x, y); context.lineTo(x, y); context.stroke();
        };

        const draw = (e) => {
            const { x, y, clientX, clientY } = getCoords(e);
            updateCursor(clientX, clientY);
            if (!isDrawing || !context) return;
            if (e.type !== 'mousemove' && e.type !== 'touchmove') return;
            e.preventDefault();
            context.lineTo(x, y); context.stroke();
        };

        const stopDraw = () => { if (context) context.closePath(); setIsDrawing(false); };

        const handleSave = () => {
            if (!canvasRef.current) return;
            const visualDataUrl = canvasRef.current.toDataURL('image/png');

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvasRef.current.width;
            exportCanvas.height = canvasRef.current.height;
            const expCtx = exportCanvas.getContext('2d');
            expCtx.fillStyle = '#000000';
            expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            expCtx.drawImage(canvasRef.current, 0, 0);
            expCtx.globalCompositeOperation = 'source-in';
            expCtx.fillStyle = '#FFFFFF';
            expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

            onSave({ visual: visualDataUrl, binary: exportCanvas.toDataURL('image/png') });
        };

        return (
            <div className="mask-editor-overlay">
                {showCursor && <div ref={cursorRef} className="brush-cursor" />}
                <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Editor de Máscara</h3>
                <div className="mask-editor-container">
                    <div className="mask-zoom-wrapper" style={{ transform: `scale(${zoom})` }} onMouseEnter={() => setShowCursor(true)} onMouseLeave={() => setShowCursor(false)}>
                        <img ref={imgRef} src={src} alt="reference" style={{ display: 'block', maxWidth: 'none' }} />
                        <canvas ref={canvasRef} className="mask-canvas" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                    </div>
                </div>
                <div className="mask-controls">
                    <div className="control-group">
                        <i className="fa-solid fa-paintbrush"></i>
                        <input type="range" min="10" max="150" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="slider-input" />
                    </div>
                    <div className="control-group">
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="slider-input" />
                        <span style={{ fontSize: '0.8rem', minWidth: '30px' }}>{zoom}x</span>
                    </div>
                    <div style={{ flex: 1 }}></div>
                    <button className="btn btn-sm" onClick={() => { const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }} style={{ background: 'var(--muted)' }}>Borrar</button>
                    <button className="btn btn-sm" onClick={onClose} style={{ background: 'var(--danger)' }}>Cancelar</button>
                    <button className="btn btn-sm" onClick={handleSave} style={{ background: '#22c55e' }}>Confirmar</button>
                </div>
            </div>
        );
    };

    /* ==== RESULT CARD ==== */
    const ResultCard = ({ img, setModalImage, onEditRequest, onDelete, onRegenerate, maskObj }) => {
        const [showEditBox, setShowEditBox] = useState(false);
        const [editPrompt, setEditPrompt] = useState('');
        const cardRef = useRef(null);

        useEffect(() => {
            if (!showEditBox) return;
            const click = (e) => { if (cardRef.current && !cardRef.current.contains(e.target)) setShowEditBox(false); };
            document.addEventListener('mousedown', click); return () => document.removeEventListener('mousedown', click);
        }, [showEditBox]);

        const executeEdit = () => {
            if (!editPrompt.trim()) return;
            onEditRequest(img, 'generate', editPrompt);
            setShowEditBox(false); setEditPrompt('');
        };

        const download = (src) => {
            const a = document.createElement('a'); a.href = src; a.download = `imagen-${Date.now()}.jpg`;
            document.body.appendChild(a); a.click(); a.remove();
        };

        return (
            <div className="card" ref={cardRef}>
                <div className={`ar-box ${maskObj ? 'has-mask-indicator' : ''}`}
                    onClick={() => setModalImage(img.src)}
                    style={{ position: 'relative', aspectRatio: img.arCss || '1 / 1' }}>

                    <img className="card-img" src={img.src} alt="resultado" />
                    {maskObj && maskObj.visual && <img className="mask-overlay-img" src={maskObj.visual} alt="mask overlay" />}
                    {img.promptLabel && <div className="prompt-legend">{img.promptLabel}</div>}

                    <div className="overlay-actions" onClick={e => e.stopPropagation()}>
                        <button className="action-btn btn-dl" data-tooltip="Descargar" onClick={() => download(img.src)}>
                            <i className="fa-solid fa-download"></i>
                        </button>
                        <button className="action-btn" style={{ background: '#f59e0b' }} data-tooltip="Crear Máscara" onClick={() => onEditRequest(img, 'mask')}>
                            <i className="fa-solid fa-paintbrush"></i>
                        </button>
                        <button className="action-btn btn-edit" data-tooltip="Editar con texto" onClick={() => setShowEditBox(!showEditBox)}>
                            <i className="fa-solid fa-pen"></i>
                        </button>
                        <button className="action-btn btn-regen" data-tooltip="Regenerar" onClick={() => onRegenerate(img)}>
                            <i className="fa-solid fa-rotate-right"></i>
                        </button>
                        <button className="action-btn btn-del" data-tooltip="Eliminar" onClick={() => onDelete(img.id)}>
                            <i className="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                {showEditBox && (
                    <div className="inline-edit-container">
                        {maskObj && <div style={{ color: 'var(--acc)', fontSize: '0.8rem', marginBottom: '5px' }}><i className="fa-solid fa-circle-check"></i> Zona marcada activa</div>}
                        <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Describe el cambio..." autoFocus />
                        <div className="actions"><button className="btn btn-sm" onClick={executeEdit}>Generar</button></div>
                    </div>
                )}
            </div>
        );
    };

    /* ==== LOGIN MODAL (copiado de imagenes_ia que funciona perfecto) ==== */
    const LoginModal = ({ onLogin }) => {
        const [isLogin, setIsLogin] = useState(true);
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [error, setError] = useState('');
        const [loading, setLoading] = useState(false);
        const [showPassword, setShowPassword] = useState(false);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError('');
            try {
                let userCredential;
                if (isLogin) {
                    userCredential = await auth.signInWithEmailAndPassword(email, password);
                } else {
                    userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    // Crear documento de usuario en Firestore
                    await db.collection('users').doc(userCredential.user.uid).set({
                        email: userCredential.user.email,
                        role: 'free',
                        usage: { date: new Date().toISOString().split('T')[0], count: 0 },
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                onLogin(userCredential.user);
            } catch (err) {
                if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                    setError('Credenciales incorrectas.');
                } else if (err.code === 'auth/email-already-in-use') {
                    setError('El email ya está registrado.');
                } else {
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        };

        const handleGoogleLogin = async () => {
            setLoading(true);
            setError('');
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const result = await auth.signInWithPopup(provider);
                // Crear documento si no existe
                const userDoc = await db.collection('users').doc(result.user.uid).get();
                if (!userDoc.exists) {
                    await db.collection('users').doc(result.user.uid).set({
                        email: result.user.email,
                        displayName: result.user.displayName || result.user.email.split('@')[0],
                        role: result.user.email === ADMIN_EMAIL ? 'admin' : 'free',
                        usage: { date: new Date().toISOString().split('T')[0], count: 0 },
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                onLogin(result.user);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        // Estilos comunes para los inputs
        const inputStyle = {
            width: '100%',
            padding: '14px 16px 14px 48px',
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid #334155',
            borderRadius: '12px',
            color: 'white',
            fontSize: '15px',
            outline: 'none',
            transition: 'all 0.2s ease'
        };

        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)' }}>

                {/* TARJETA PRINCIPAL */}
                <div style={{
                    width: '90%',
                    maxWidth: '400px',
                    padding: '40px 32px',
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '24px',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.7)',
                    position: 'relative'
                }}>

                    {/* CABECERA */}
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{
                            margin: '0 auto 16px auto',
                            width: '64px', height: '64px',
                            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(15, 23, 42, 0) 70%)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{
                                width: '42px', height: '42px',
                                background: 'rgba(30, 58, 138, 0.4)',
                                borderRadius: '14px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
                            }}>
                                <i className="fa-solid fa-lock" style={{ fontSize: '18px', color: '#60a5fa' }}></i>
                            </div>
                        </div>

                        <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'white', marginBottom: '6px', letterSpacing: '-0.5px' }}>
                            {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                            {isLogin ? 'Accede para continuar creando' : 'Regístrate para empezar'}
                        </p>
                    </div>

                    {/* ERROR */}
                    {error && (
                        <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(127, 29, 29, 0.2)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    {/* FORMULARIO */}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* EMAIL */}
                        <div style={{ position: 'relative' }}>
                            <i className="fa-solid fa-envelope" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px', pointerEvents: 'none' }}></i>
                            <input
                                type="email"
                                placeholder="Tu correo electrónico"
                                style={inputStyle}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                                onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
                                required
                            />
                        </div>

                        {/* PASSWORD */}
                        <div style={{ position: 'relative' }}>
                            <i className="fa-solid fa-lock" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px', pointerEvents: 'none' }}></i>
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Contraseña"
                                style={inputStyle}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                                onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}
                            >
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '14px' }}></i>
                            </button>
                        </div>

                        {/* BOTÓN SUBMIT */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: '8px',
                                width: '100%',
                                padding: '14px',
                                background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                                color: 'white',
                                fontWeight: '600',
                                fontSize: '15px',
                                borderRadius: '12px',
                                border: 'none',
                                cursor: loading ? 'wait' : 'pointer',
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                                opacity: loading ? 0.7 : 1,
                                transition: 'transform 0.1s'
                            }}
                            onMouseDown={e => !loading && (e.target.style.transform = 'scale(0.98)')}
                            onMouseUp={e => !loading && (e.target.style.transform = 'scale(1)')}
                        >
                            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
                        </button>
                    </form>

                    {/* SEPARADOR */}
                    <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '12px' }}>
                        <div style={{ height: '1px', background: '#334155', flex: 1 }}></div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>O continúa con</span>
                        <div style={{ height: '1px', background: '#334155', flex: 1 }}></div>
                    </div>

                    {/* BOTÓN GOOGLE */}
                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontWeight: '600',
                            fontSize: '15px',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: loading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={e => !loading && (e.target.style.background = '#f1f5f9')}
                        onMouseOut={e => !loading && (e.target.style.background = '#ffffff')}
                    >
                        <i className="fa-brands fa-google" style={{ fontSize: '18px', color: '#ea4335' }}></i>
                        Continuar con Google
                    </button>

                    {/* FOOTER */}
                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '14px', cursor: 'pointer' }}
                        >
                            {isLogin ? (
                                <span>¿No tienes cuenta? <span style={{ fontWeight: '700', textDecoration: 'underline' }}>Regístrate gratis</span></span>
                            ) : (
                                <span>¿Ya tienes cuenta? <span style={{ fontWeight: '700', textDecoration: 'underline' }}>Inicia sesión</span></span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    /* ==== PREMIUM ADMIN DASHBOARD ==== */
    const AdminPanel = ({ onClose }) => {
        const [users, setUsers] = useState([]);
        const [loading, setLoading] = useState(true);
        const [stats, setStats] = useState(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [selectedTab, setSelectedTab] = useState('overview'); // 'overview' or 'users'

        useEffect(() => {
            loadData();
        }, []);

        const loadData = async () => {
            setLoading(true);
            try {
                const snapshot = await db.collection('users').get();
                const usersData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
                setUsers(usersData);

                // Calculate statistics
                calculateStats(usersData);
            } catch (e) {
                console.error('Error loading data:', e);
            } finally {
                setLoading(false);
            }
        };

        const calculateStats = (usersData) => {
            const today = new Date().toISOString().split('T')[0];

            const totalFree = usersData.filter(u => u.role === 'free').length;
            const totalVIP = usersData.filter(u => u.role === 'vip').length;
            const totalAdmin = usersData.filter(u => u.role === 'admin').length;

            const todayUsage = usersData.reduce((sum, u) => {
                return sum + (u.usage?.date === today ? (u.usage?.count || 0) : 0);
            }, 0);

            const activeToday = usersData.filter(u => u.usage?.date === today && u.usage?.count > 0).length;

            const topUsers = usersData
                .filter(u => u.usage?.date === today)
                .sort((a, b) => (b.usage?.count || 0) - (a.usage?.count || 0))
                .slice(0, 5);

            setStats({
                totalUsers: { free: totalFree, vip: totalVIP, admin: totalAdmin, total: usersData.length },
                todayUsage,
                activeToday,
                avgUsage: activeToday > 0 ? (todayUsage / activeToday).toFixed(1) : 0,
                topUsers
            });
        };

        const toggleVIP = async (uid, currentRole) => {
            const newRole = currentRole === 'vip' ? 'free' : 'vip';
            try {
                await db.collection('users').doc(uid).update({ role: newRole });
                await loadData();
            } catch (e) {
                alert('Error al actualizar usuario: ' + e.message);
            }
        };

        const deleteUser = async (uid, email) => {
            if (!confirm(`¿Eliminar usuario ${email}?`)) return;
            try {
                await db.collection('users').doc(uid).delete();
                await loadData();
            } catch (e) {
                alert('Error al eliminar usuario: ' + e.message);
            }
        };

        const resetDailyLimit = async (uid) => {
            try {
                await db.collection('users').doc(uid).update({
                    'usage.count': 0,
                    'usage.date': new Date().toISOString().split('T')[0]
                });
                await loadData();
            } catch (e) {
                alert('Error al resetear límite: ' + e.message);
            }
        };

        const filteredUsers = users.filter(u =>
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const StatCard = ({ icon, label, value, subtext, gradient }) => (
            <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(34, 211, 238, 0.2)',
                borderRadius: '16px',
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: gradient || 'linear-gradient(135deg, #22d3ee, #a78bfa)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem'
                        }}>
                            {icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{label}</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>{value}</div>
                        </div>
                    </div>
                    {subtext && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{subtext}</div>}
                </div>
            </div>
        );

        return (
            <div className="modal-overlay" onClick={onClose} style={{ background: 'rgba(0,0,0,0.85)' }}>
                <div style={{
                    maxWidth: '1400px',
                    width: '95%',
                    maxHeight: '90vh',
                    background: 'rgba(10, 15, 30, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(34, 211, 238, 0.2)',
                    borderRadius: '24px',
                    padding: '2rem',
                    overflowY: 'auto',
                    position: 'relative'
                }} onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: '2rem',
                                background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                fontWeight: '700'
                            }}>
                                Panel de Administración
                            </h2>
                            <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                Gestión completa y estadísticas de la plataforma
                            </p>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}>
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <button
                            onClick={() => setSelectedTab('overview')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: selectedTab === 'overview' ? 'linear-gradient(135deg, #22d3ee, #a78bfa)' : 'rgba(255,255,255,0.05)',
                                color: selectedTab === 'overview' ? '#0c1445' : '#94a3b8',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: '0.3s'
                            }}
                        >
                            <i className="fa-solid fa-chart-line"></i> Estadísticas
                        </button>
                        <button
                            onClick={() => setSelectedTab('users')}
                            style={{
                                padding: '0.75rem 1.5rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: selectedTab === 'users' ? 'linear-gradient(135deg, #22d3ee, #a78bfa)' : 'rgba(255,255,255,0.05)',
                                color: selectedTab === 'users' ? '#0c1445' : '#94a3b8',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: '0.3s'
                            }}
                        >
                            <i className="fa-solid fa-users"></i> Usuarios ({users.length})
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}>
                            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '3rem', color: '#22d3ee' }}></i>
                            <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Cargando datos...</p>
                        </div>
                    ) : (
                        <>
                            {/* Overview Tab */}
                            {selectedTab === 'overview' && stats && (
                                <div>
                                    {/* Stats Grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                        gap: '1.5rem',
                                        marginBottom: '2rem'
                                    }}>
                                        <StatCard
                                            icon="👥"
                                            label="Total Usuarios"
                                            value={stats.totalUsers.total}
                                            subtext={`${stats.totalUsers.free} Free · ${stats.totalUsers.vip} VIP · ${stats.totalUsers.admin} Admin`}
                                            gradient="linear-gradient(135deg, #3b82f6, #8b5cf6)"
                                        />
                                        <StatCard
                                            icon="🖼️"
                                            label="Generaciones Hoy"
                                            value={stats.todayUsage}
                                            subtext={`Promedio: ${stats.avgUsage} por usuario activo`}
                                            gradient="linear-gradient(135deg, #22d3ee, #06b6d4)"
                                        />
                                        <StatCard
                                            icon="⚡"
                                            label="Usuarios Activos Hoy"
                                            value={stats.activeToday}
                                            subtext={`${((stats.activeToday / stats.totalUsers.total) * 100).toFixed(0)}% del total`}
                                            gradient="linear-gradient(135deg, #10b981, #059669)"
                                        />
                                        <StatCard
                                            icon="📊"
                                            label="Tasa de Conversión VIP"
                                            value={`${((stats.totalUsers.vip / stats.totalUsers.total) * 100).toFixed(1)}%`}
                                            subtext={`${stats.totalUsers.vip} de ${stats.totalUsers.total} usuarios`}
                                            gradient="linear-gradient(135deg, #f59e0b, #d97706)"
                                        />
                                    </div>

                                    {/* Top Users */}
                                    <div style={{
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(34, 211, 238, 0.2)',
                                        borderRadius: '16px',
                                        padding: '1.5rem'
                                    }}>
                                        <h3 style={{ margin: '0 0 1.5rem 0', color: '#22d3ee', fontSize: '1.2rem' }}>
                                            <i className="fa-solid fa-trophy"></i> Top Usuarios Hoy
                                        </h3>
                                        {stats.topUsers.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {stats.topUsers.map((u, idx) => (
                                                    <div key={u.uid} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem',
                                                        padding: '1rem',
                                                        background: 'rgba(255,255,255,0.02)',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(255,255,255,0.05)'
                                                    }}>
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            background: idx === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' :
                                                                idx === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
                                                                    idx === 2 ? 'linear-gradient(135deg, #d97706, #92400e)' :
                                                                        'rgba(255,255,255,0.1)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: '700',
                                                            fontSize: '0.9rem'
                                                        }}>
                                                            #{idx + 1}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ color: '#e5e7eb', fontWeight: '500' }}>{u.email}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                                {u.role === 'admin' ? '👑 Admin' : u.role === 'vip' ? '⭐ VIP' : 'Free'}
                                                            </div>
                                                        </div>
                                                        <div style={{
                                                            padding: '0.5rem 1rem',
                                                            borderRadius: '8px',
                                                            background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
                                                            fontWeight: '700',
                                                            color: '#0c1445'
                                                        }}>
                                                            {u.usage?.count || 0} generaciones
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                                                No hay actividad hoy
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Users Tab */}
                            {selectedTab === 'users' && (
                                <div>
                                    {/* Search Bar */}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Buscar por email..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem',
                                                background: 'rgba(15, 23, 42, 0.6)',
                                                border: '1px solid rgba(34, 211, 238, 0.3)',
                                                borderRadius: '10px',
                                                color: '#e5e7eb',
                                                fontSize: '0.95rem'
                                            }}
                                        />
                                    </div>

                                    {/* Users Table */}
                                    <div style={{
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(34, 211, 238, 0.2)',
                                        borderRadius: '16px',
                                        overflow: 'hidden'
                                    }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'rgba(34, 211, 238, 0.1)' }}>
                                                    <th style={{ padding: '1rem', textAlign: 'left', color: '#22d3ee', fontWeight: '600' }}>Email</th>
                                                    <th style={{ padding: '1rem', textAlign: 'left', color: '#22d3ee', fontWeight: '600' }}>Rol</th>
                                                    <th style={{ padding: '1rem', textAlign: 'left', color: '#22d3ee', fontWeight: '600' }}>Uso Hoy</th>
                                                    <th style={{ padding: '1rem', textAlign: 'left', color: '#22d3ee', fontWeight: '600' }}>Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map(u => (
                                                    <tr key={u.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '1rem', color: '#e5e7eb' }}>{u.email}</td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <span style={{
                                                                padding: '0.4rem 0.8rem',
                                                                borderRadius: '8px',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600',
                                                                background: u.role === 'admin' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' :
                                                                    u.role === 'vip' ? 'linear-gradient(135deg, #22d3ee, #a78bfa)' :
                                                                        'rgba(255,255,255,0.1)',
                                                                color: '#fff'
                                                            }}>
                                                                {u.role === 'admin' ? '👑 Admin' : u.role === 'vip' ? '⭐ VIP' : 'Free'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem', color: '#94a3b8' }}>
                                                            {u.usage?.count || 0} / {u.role === 'free' ? DAILY_LIMIT : '∞'}
                                                        </td>
                                                        <td style={{ padding: '1rem' }}>
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                {u.role !== 'admin' && (
                                                                    <>
                                                                        <button
                                                                            className="btn btn-sm"
                                                                            onClick={() => toggleVIP(u.uid, u.role)}
                                                                            style={{
                                                                                background: u.role === 'vip' ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #22d3ee, #a78bfa)',
                                                                                border: u.role === 'vip' ? '1px solid #ef4444' : 'none',
                                                                                fontSize: '0.8rem',
                                                                                padding: '0.4rem 0.8rem'
                                                                            }}
                                                                        >
                                                                            {u.role === 'vip' ? '❌ VIP' : '⭐ VIP'}
                                                                        </button>
                                                                        {u.role === 'free' && u.usage?.count > 0 && (
                                                                            <button
                                                                                className="btn btn-sm"
                                                                                onClick={() => resetDailyLimit(u.uid)}
                                                                                style={{
                                                                                    background: 'rgba(34, 197, 94, 0.2)',
                                                                                    border: '1px solid #22c55e',
                                                                                    color: '#22c55e',
                                                                                    fontSize: '0.8rem',
                                                                                    padding: '0.4rem 0.8rem'
                                                                                }}
                                                                            >
                                                                                🔄 Reset
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            className="btn btn-sm"
                                                                            onClick={() => deleteUser(u.uid, u.email)}
                                                                            style={{
                                                                                background: 'rgba(239, 68, 68, 0.2)',
                                                                                border: '1px solid #ef4444',
                                                                                color: '#ef4444',
                                                                                fontSize: '0.8rem',
                                                                                padding: '0.4rem 0.8rem'
                                                                            }}
                                                                        >
                                                                            🗑️
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {filteredUsers.length === 0 && (
                                            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                                No se encontraron usuarios
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };

    /* ==== APP ==== */
    const App = () => {
        const [prompt, setPrompt] = useState('');
        const [provider, setProvider] = useState('gemini');
        const [baseImages, setBaseImages] = useState([]);
        const [images, setImages] = useState([]);
        const [enhancedOptions, setEnhancedOptions] = useState([]);
        const [selectedPromptId, setSelectedPromptId] = useState(null);
        const [user, setUser] = useState(null);
        const [userData, setUserData] = useState(null);
        const [loading, setAuthLoading] = useState(true);
        const [adminPanelOpen, setAdminPanelOpen] = useState(false);

        useEffect(() => {
            const unsubscribe = auth.onAuthStateChanged(async (u) => {
                setUser(u);
                setAuthLoading(false);
                if (u) {
                    try {
                        const data = await ensureUserDocument(u);
                        setUserData(data);
                    } catch (e) {
                        console.error('Error cargando usuario:', e);
                    }
                } else {
                    setUserData(null);
                }
            });
            return () => unsubscribe();
        }, []);

        const [isLoading, setIsLoading] = useState(false);
        const [loadingMsg, setLoadingMsg] = useState('');
        const [error, setError] = useState('');
        const [modalImage, setModalImage] = useState(null);

        const [maskEditorOpen, setMaskEditorOpen] = useState(false);
        const [maskImageSrc, setMaskImageSrc] = useState(null);
        const [activeEditImgId, setActiveEditImgId] = useState(null);
        const [tempMaskData, setTempMaskData] = useState({});

        const [aspectRatio, setAspectRatio] = useState('9:16');
        const [realism, setRealism] = useState('Fotorrealista');
        const [style, setStyle] = useState('Realista');
        const [creative, setCreative] = useState('Ninguno');
        const [allowText, setAllowText] = useState(false);
        const [customText, setCustomText] = useState('');
        const [allowObjs, setAllowObjs] = useState(false);
        const [logoMode, setLogoMode] = useState('Conservar logos');

        const aspectGroups = [{ label: 'Vertical', options: ['9:16', '3:4', '2:3', '4:5'] }, { label: 'Horizontal', options: ['16:9', '4:3', '3:2', '21:9'] }, { label: 'Cuadrado', options: ['1:1'] }];
        const MAP_REALISM = { 'Fotorrealista': 'Photorealistic', 'Hiperrealista': 'Hyperrealistic', 'Ilustración': 'Illustration', 'Anime': 'Anime style' };
        const MAP_CREATIVO = { 'Ninguno': '', 'Cinemático': 'Cinematic', 'Fantasía': 'Fantasy', 'Cyberpunk': 'Cyberpunk', 'Vintage': 'Vintage' };

        const onUploadBase = (e) => {
            if (e.target.files?.length > 0) {
                const newFiles = Array.from(e.target.files).map(f => ({ id: Date.now() + Math.random(), file: f, url: URL.createObjectURL(f) }));
                setBaseImages(newFiles);
            }
            e.target.value = '';
        };

        const enhance = async () => {
            if (!prompt.trim()) return;
            setIsLoading(true); setLoadingMsg('Mejorando Prompt con IA...'); setError(''); setEnhancedOptions([]);
            const hasActiveMask = baseImages.length > 0 && !!tempMaskData[baseImages[0].id];
            try {
                const res = await api.enhancePrompt(prompt, hasActiveMask);
                if (res.options) setEnhancedOptions(res.options);
            }
            catch (e) { setError(e.message); } finally { setIsLoading(false); }
        };

        const regenerateFromCard = (img) => {
            if (img.promptUsed) {
                setPrompt(img.promptUsed);
                generate(img.promptUsed);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        const setAsBaseImage = async (imgSrc) => {
            const f = await dataURLtoFile(imgSrc);
            setBaseImages([{ id: Date.now(), file: f, url: imgSrc }]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const clearAll = () => {
            setPrompt(''); setEnhancedOptions([]); setBaseImages([]); setTempMaskData({}); setSelectedPromptId(null);
        };

        const onCardEditRequest = (imgObj, action, textPrompt = null) => {
            if (action === 'mask') {
                setMaskImageSrc(imgObj.src);
                setActiveEditImgId(imgObj.id);
                setMaskEditorOpen(true);
            } else if (action === 'generate') {
                const maskToUse = tempMaskData[imgObj.id] || null;
                generateInlineEdit(imgObj, textPrompt, maskToUse);
                if (maskToUse) {
                    const newMasks = { ...tempMaskData };
                    delete newMasks[imgObj.id];
                    setTempMaskData(newMasks);
                }
            }
        };

        const onBaseImageMask = (baseImg) => {
            setMaskImageSrc(baseImg.url);
            setActiveEditImgId(baseImg.id);
            setMaskEditorOpen(true);
        };

        // ==== MODIFICADO: ANÁLISIS DE MÁSCARA AL CONFIRMAR ====
        const handleMaskSave = async (maskObjects) => {
            // 1. Guardar máscara visual y binaria en el estado
            setTempMaskData(prev => ({ ...prev, [activeEditImgId]: maskObjects }));
            setMaskEditorOpen(false); // Cerramos visualmente el editor, pero mostramos loader

            setIsLoading(true);
            setLoadingMsg('Analizando zonas de la máscara...');

            try {
                // Buscamos la imagen base para fusionar
                let baseSrc = null;
                const baseImgObj = baseImages.find(i => i.id === activeEditImgId);
                if (baseImgObj) baseSrc = baseImgObj.url;
                else {
                    const resImg = images.find(i => i.id === activeEditImgId);
                    if (resImg) baseSrc = resImg.src;
                }

                if (baseSrc) {
                    // 2. Fusionar imagen + máscara visual
                    const combined = await combineBaseAndMaskVisual(baseSrc, maskObjects.visual);

                    // 3. Enviar a Gemini para que escriba la plantilla
                    const res = await api.analyzeMask(combined.data);

                    // 4. Poner la plantilla en el cuadro de texto
                    if (res.template) {
                        setPrompt(res.template);
                    }
                }
            } catch (e) {
                setError('Error analizando máscara: ' + e.message);
            } finally {
                setIsLoading(false);
                setActiveEditImgId(null);
            }
        };

        const generate = async (customPromptOverride = null) => {
            const effPrompt = customPromptOverride || prompt;
            if (!effPrompt.trim() && baseImages.length === 0) { setError('Falta prompt o imagen.'); return; }

            // Verificar límite de uso
            const usageCheck = checkCanGenerate(userData);
            if (!usageCheck.canGenerate) {
                setError(usageCheck.reason + '. Actualiza tu plan para continuar.');
                return;
            }

            setIsLoading(true); setLoadingMsg(`Generando Imagen con ${provider === 'gemini' ? 'Nano Banana Pro' : 'Flux.2'}...`); setError('');

            let maskData = null;
            if (baseImages.length > 0) {
                maskData = tempMaskData[baseImages[0].id] || null;
            }

            try {
                const blocks = [];
                let imagesToSend = [];

                if (maskData && provider === 'gemini') {
                    setLoadingMsg('Fusionando máscara visual...');
                    const combinedImagePart = await combineBaseAndMaskVisual(baseImages[0].url, maskData.visual);
                    imagesToSend = [combinedImagePart];

                    blocks.push(PRE_PROMPT_INPAINT_VISUAL);
                    blocks.push(`INSTRUCTION: Fill the RED area with: "${effPrompt}".`);

                } else {
                    if (baseImages.length > 0) {
                        blocks.push(PRE_PROMPT_BASE);
                        imagesToSend = await Promise.all(baseImages.map(img => fileToPart(img.file)));
                    }

                    if (provider === 'gemini') {
                        if (MAP_REALISM[realism]) blocks.push(MAP_REALISM[realism]);
                        if (MAP_CREATIVO[creative]) blocks.push(MAP_CREATIVO[creative]);
                        if (aspectRatio && baseImages.length === 0) blocks.push(`AspectRatio: ${aspectRatio}.`);
                    } else {
                        if (MAP_REALISM[realism]) blocks.push(MAP_REALISM[realism]);
                        if (style !== 'Realista') blocks.push(style + " style");
                    }

                    if (!allowText) blocks.push("NO TEXT.");
                    if (allowText && customText) blocks.push(`Text: "${customText}"`);
                    if (allowObjs) blocks.push("Add objects.");
                    if (logoMode === 'Conservar logos' && provider === 'gemini') blocks.push("Preserve logos.");
                    blocks.push(`USER PROMPT: ${effPrompt}`);
                }

                const res = await api.generateImage(blocks.join(' '), provider, imagesToSend, aspectRatio, ['IMAGE'], null);

                if (res.type === 'image') {
                    const newImg = {
                        id: Date.now(), src: `data:${res.mimeType};base64,${res.image}`,
                        arCss: cssAR(aspectRatio),
                        promptUsed: effPrompt,
                        promptLabel: (maskData ? 'Editado (Visual)' : (customPromptOverride ? 'Regenerado' : 'Original')) + ` (${provider})`
                    };
                    setImages(prev => [newImg, ...prev]);

                    // Incrementar contador de uso
                    await incrementUsage(user.uid);
                    // Recargar datos del usuario para actualizar el contador
                    const updatedData = await getUserData(user.uid);
                    setUserData(updatedData);

                    if (maskData) {
                        const newMasks = { ...tempMaskData };
                        delete newMasks[baseImages[0].id];
                        setTempMaskData(newMasks);
                    }
                }
            } catch (e) { setError(e.message); } finally { setIsLoading(false); }
        };

        const generateInlineEdit = async (baseImgObj, instruction, maskDataObj = null) => {
            setIsLoading(true); setLoadingMsg(maskDataObj ? 'Inpainting...' : 'Editando...');
            try {
                const blocks = [];
                let imagesToSend = [];

                if (maskDataObj) {
                    blocks.push("ROLE: Precise Editor. TASK: Edit ONLY the area defined by the white mask.");
                    blocks.push(`INSTRUCTION: "${instruction}".`);
                    imagesToSend = [await fileToPart(await dataURLtoFile(baseImgObj.src))];
                } else {
                    blocks.push(PRE_PROMPT_BASE);
                    blocks.push("TASK: Edit the image.");
                    blocks.push(`INSTRUCTION: "${instruction}".`);
                    imagesToSend = [await fileToPart(await dataURLtoFile(baseImgObj.src))];
                }

                const editProvider = 'gemini';

                const res = await api.generateImage(blocks.join(' '), editProvider, imagesToSend, null, ['IMAGE'], maskDataObj);

                if (res.type === 'image') {
                    setImages(prev => [{
                        id: Date.now(),
                        src: `data:${res.mimeType};base64,${res.image}`,
                        arCss: baseImgObj.arCss,
                        promptUsed: instruction,
                        promptLabel: maskDataObj ? 'Inpainting' : 'Editado'
                    }, ...prev]);
                }
            } catch (e) { setError(e.message); } finally { setIsLoading(false); }
        };

        return (
            <div className="container">
                {isLoading && <div className="loading-overlay"><div className="spinner"></div><p style={{ marginTop: '1rem', color: 'white' }}>{loadingMsg}</p></div>}
                {modalImage && <div className="modal-overlay" onClick={() => setModalImage(null)}><img src={modalImage} alt="zoom" /></div>}
                {maskEditorOpen && <MaskEditor src={maskImageSrc} onClose={() => { setMaskEditorOpen(false); setActiveEditImgId(null); }} onSave={handleMaskSave} />}

                <header className="app-header">
                    <h1>Generador de Imágenes</h1>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {user && userData && (
                            <>
                                {/* Mostrar uso restante */}
                                {userData.role === 'free' && (
                                    <div style={{
                                        padding: '0.4rem 0.8rem',
                                        background: 'rgba(34, 211, 238, 0.1)',
                                        border: '1px solid rgba(34, 211, 238, 0.3)',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        color: '#22d3ee'
                                    }}>
                                        {checkCanGenerate(userData).remaining}/{DAILY_LIMIT} usos hoy
                                    </div>
                                )}
                                {(userData.role === 'vip' || userData.role === 'admin') && (
                                    <div style={{
                                        padding: '0.4rem 0.8rem',
                                        background: 'linear-gradient(135deg, #22d3ee, #a78bfa)',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        color: '#0c1445'
                                    }}>
                                        {userData.role === 'admin' ? '👑 Admin' : '⭐ VIP'}
                                    </div>
                                )}
                            </>
                        )}
                        {user && userData && userData.role === 'admin' && (
                            <button className="btn btn-sm" onClick={() => setAdminPanelOpen(true)} style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                                <i className="fa-solid fa-users-gear"></i> Panel Admin
                            </button>
                        )}
                        {user && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '0.9rem' }}>{user.displayName || user.email}</span>
                                <button className="btn btn-sm" onClick={() => { auth.signOut(); setUser(null); setUserData(null); }} style={{ background: 'var(--danger)' }}>Salir</button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Login modal cuando no hay usuario */}
                {!user && <LoginModal onLogin={(u) => setUser(u)} />}

                {adminPanelOpen && <AdminPanel onClose={() => setAdminPanelOpen(false)} />}

                <div className="big-actions">
                    <button className="btn-big" onClick={clearAll}>Generar desde cero</button>
                    <button className="btn-big" onClick={() => { document.getElementById('base-upload').click(); }}>Subir Imagen Base</button>
                </div>

                <div id="app-content">
                    <div className="controls-column">
                        <input id="base-upload" type="file" accept="image/*" onChange={onUploadBase} style={{ display: 'none' }} />

                        <div style={{ marginBottom: '1rem', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <CustomSelect
                                label="Elige Modelo de Generación"
                                value={provider}
                                onChange={setProvider}
                                options={[
                                    { value: 'gemini', label: 'Nano Banana Pro' },
                                    { value: 'flux', label: 'Flux.2 Pro' }
                                ]}
                            />
                            {provider === 'flux' && <p style={{ fontSize: '0.8rem', color: '#aaa', marginTop: '5px' }}>* Flux es excelente para fotorrealismo.</p>}
                        </div>

                        {baseImages.length > 0 && (
                            <div className="base-uploader-section">
                                <div className={`base-image-preview ${tempMaskData[baseImages[0].id] ? 'has-mask-indicator' : ''}`}>
                                    <img src={baseImages[0].url} alt="base" onClick={() => setModalImage(baseImages[0].url)} />
                                    {tempMaskData[baseImages[0].id] && tempMaskData[baseImages[0].id].visual && <img className="mask-overlay-img" src={tempMaskData[baseImages[0].id].visual} alt="mask overlay" />}
                                    <div className="base-overlay-actions">
                                        <button className="base-action-btn" title="Pintar área a editar" onClick={() => onBaseImageMask(baseImages[0])}>
                                            <i className="fa-solid fa-paintbrush"></i>
                                        </button>
                                        <button className="base-action-btn danger" title="Eliminar imagen" onClick={() => { setBaseImages([]); setTempMaskData({}); }}>
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                {tempMaskData[baseImages[0].id] && <p style={{ color: 'var(--acc)', fontSize: '0.9rem', textAlign: 'center', marginTop: '5px' }}>Máscara activa.</p>}
                            </div>
                        )}

                        <div className="input-group">
                            <label>Prompt</label>
                            <textarea value={prompt} onChange={e => { setPrompt(e.target.value); setSelectedPromptId(null); }} placeholder="Describe la imagen..." />
                            {enhancedOptions.length > 0 && (
                                <div className="prompt-options-grid">
                                    {enhancedOptions.map((opt, idx) => (
                                        <button key={idx} className={`prompt-opt-btn ${selectedPromptId === (idx + 1) ? 'selected' : ''}`} onClick={() => { setPrompt(opt); setSelectedPromptId(idx + 1); }}>Opción {idx + 1}</button>
                                    ))}
                                </div>
                            )}

                            <div className="input-actions-row">
                                <button className="btn" onClick={enhance} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    <i className="fa-solid fa-sparkles"></i> Mejorar Prompt (4 Opciones)
                                </button>
                                <button className="btn" onClick={clearAll} style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                                    <i className="fa-solid fa-rotate"></i> Limpiar
                                </button>
                            </div>
                        </div>

                        <div className="select-row">
                            <CustomSelect label="Realismo" value={realism} onChange={setRealism} options={Object.keys(MAP_REALISM).map(k => ({ value: k, label: k }))} />
                            <CustomSelect label="Estilo" value={style} onChange={setStyle} options={['Realista', 'Cinemático', 'Anime', '3D Render'].map(k => ({ value: k, label: k }))} />
                        </div>
                        <div className="select-row" style={{ marginTop: '1rem' }}>
                            <CustomSelect label="Creativo" value={creative} onChange={setCreative} options={Object.keys(MAP_CREATIVO).map(k => ({ value: k, label: k }))} />
                            <CustomSelect label="Relación de aspecto" value={aspectRatio} onChange={setAspectRatio} groups={aspectGroups} />
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                            <label className="section-title" style={{ fontSize: '1rem' }}>Opciones Extra</label>
                            <div style={{ display: 'flex', gap: '1rem', margin: '.5rem 0' }}>
                                <label><input type="checkbox" checked={allowText} onChange={e => setAllowText(e.target.checked)} /> Texto explícito</label>
                                <label><input type="checkbox" checked={allowObjs} onChange={e => setAllowObjs(e.target.checked)} /> Objetos extra</label>
                            </div>
                            {allowText && <input className="input" placeholder="Texto..." value={customText} onChange={e => setCustomText(e.target.value)} />}
                            <div style={{ marginTop: '.5rem' }}><label>Logos</label><select className="select" value={logoMode} onChange={e => setLogoMode(e.target.value)}><option>Conservar logos</option><option>Eliminar logos</option></select></div>
                        </div>

                        <div className="actions" style={{ marginTop: '1.5rem' }}>
                            <button className="btn" onClick={() => generate()} style={{ width: '100%', fontSize: '1.1rem' }}><i className="fa-solid fa-wand-magic-sparkles"></i> Generar</button>
                        </div>
                        {error && <p className="error-message">{error}</p>}
                    </div>

                    <div className="results-column">
                        <h2 className="section-title">Resultados</h2>
                        <div className="preview">
                            {images.map(img => (
                                <ResultCard
                                    key={img.id} img={img}
                                    maskObj={tempMaskData[img.id]}
                                    setModalImage={setModalImage}
                                    onEditRequest={onCardEditRequest}
                                    onDelete={(id) => setImages(l => l.filter(x => x.id !== id))}
                                    setThisAsBase={setAsBaseImage}
                                    onRegenerate={regenerateFromCard}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    const root = ReactDOM.createRoot(document.getElementById('root')); root.render(<App />);
})();