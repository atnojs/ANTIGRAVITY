/* app_edicion.js - Solo Edición de Imágenes */
(() => {
    const { useState, useEffect, useRef } = React;

    /* ==== FIREBASE SETUP ==== */
    const firebaseConfig = {
        apiKey: "AIzaSyC1QoTQs1H6liSOosYO0qy6o9wnmG9A59M",
        authDomain: "generacion-de-imagenes-6e624.firebaseapp.com",
        projectId: "generacion-de-imagenes-6e624",
        storageBucket: "generacion-de-imagenes-6e624.firebasestorage.app",
        messagingSenderId: "347360274142",
        appId: "1:347360274142:web:bd6c3c19cb3118fc7d444f",
        measurementId: "G-KG5Y3K7ME2"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    /* ==== USER MANAGEMENT ==== */
    const ADMIN_EMAIL = 'atnojs@gmail.com';
    const DAILY_LIMIT = 8;

    const ensureUserDocument = async (user) => {
        if (!user) return null;
        const userRef = db.collection('users').doc(user.uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            const userData = {
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                role: user.email === ADMIN_EMAIL ? 'admin' : 'free',
                usage: { date: new Date().toISOString().split('T')[0], count: 0 },
                subscriptionStatus: 'none'
            };
            await userRef.set(userData);
            return userData;
        }
        return userDoc.data();
    };

    const getUserData = async (uid) => {
        const userDoc = await db.collection('users').doc(uid).get();
        return userDoc.exists ? userDoc.data() : null;
    };

    const checkCanGenerate = (userData) => {
        if (!userData) return { canGenerate: false, reason: 'No user data' };
        if (userData.role === 'admin' || userData.role === 'vip') {
            return { canGenerate: true, remaining: '∞' };
        }
        const today = new Date().toISOString().split('T')[0];
        if (userData.usage.date !== today) {
            return { canGenerate: true, remaining: DAILY_LIMIT };
        }
        const remaining = DAILY_LIMIT - (userData.usage.count || 0);
        if (remaining <= 0) {
            return { canGenerate: false, reason: 'Límite diario alcanzado', remaining: 0 };
        }
        return { canGenerate: true, remaining };
    };

    const incrementUsage = async (uid) => {
        const userRef = db.collection('users').doc(uid);
        const userData = await getUserData(uid);
        if (!userData) return;
        const today = new Date().toISOString().split('T')[0];
        if (userData.usage.date !== today) {
            await userRef.update({ 'usage.date': today, 'usage.count': 1 });
        } else {
            await userRef.update({ 'usage.count': firebase.firestore.FieldValue.increment(1) });
        }
    };

    /* ==== CONSTANTES ==== */
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
                    resolve({ data: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
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
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const dataURLtoFile = (dataUrl, filename = `imagen-${Date.now()}.png`) => {
    return new Promise((resolve) => {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        resolve(new File([u8arr], filename, { type: mime }));
    });
};
    const cssAR = (ar) => {
        if (!ar || !ar.includes(':')) return '1 / 1';
        const [w, h] = ar.split(':');
        return `${w} / ${h}`;
    };

    /* ==== COMPONENTE: SELECT ==== */
    const CustomSelect = ({ label, value, onChange, options, groups }) => {
        const [isOpen, setIsOpen] = useState(false);
        const containerRef = useRef(null);
        useEffect(() => {
            const click = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
            document.addEventListener('mousedown', click);
            return () => document.removeEventListener('mousedown', click);
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
            return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY, clientX, clientY };
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
            expCtx.fillStyle = '#0000';
            expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            expCtx.drawImage(canvasRef.current, 0, 0);
            expCtx.globalCompositeOperation = 'source-in';
            expCtx.fillStyle = '#FFFF';
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
            document.addEventListener('mousedown', click);
            return () => document.removeEventListener('mousedown', click);
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

    /* ==== AUTH MODAL ==== */
    const AuthModal = ({ onClose }) => {
        const [isLogin, setIsLogin] = useState(true);
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [error, setError] = useState('');
        const [loading, setLoading] = useState(false);
        const [showPassword, setShowPassword] = useState(false);

        const handleAuth = async (e) => {
            e.preventDefault();
            setError('');
            setLoading(true);
            try {
                if (isLogin) {
                    await auth.signInWithEmailAndPassword(email, password);
                } else {
                    await auth.createUserWithEmailAndPassword(email, password);
                }
                if (onClose) setTimeout(onClose, 100);
            } catch (err) {
                if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') setError('Credenciales incorrectas.');
                else if (err.code === 'auth/email-already-in-use') setError('El email ya está registrado.');
                else setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const handleGoogleLogin = async () => {
            setError('');
            setLoading(true);
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                await auth.signInWithPopup(provider);
                if (onClose) setTimeout(onClose, 100);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

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
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: '90%', maxWidth: '400px', padding: '40px 32px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.7)', position: 'relative' }}>
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ margin: '0 auto 16px auto', width: '64px', height: '64px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(15, 23, 42, 0) 70%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '42px', height: '42px', background: 'rgba(30, 58, 138, 0.4)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)' }}>
                                <i className="fa-solid fa-lock" style={{ fontSize: '18px', color: '#60a5fa' }}></i>
                            </div>
                        </div>
                        <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'white', marginBottom: '6px', letterSpacing: '-0.5px' }}>
                            {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta'}
                        </h2>
                        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                            {isLogin ? 'Accede para continuar editando' : 'Regístrate para empezar'}
                        </p>
                    </div>
                    {error && (
                        <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(127, 29, 29, 0.2)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', color: '#fca5a5', fontSize: '13px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ position: 'relative' }}>
                            <i className="fa-solid fa-envelope" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px', pointerEvents: 'none' }}></i>
                            <input type="email" placeholder="Tu correo electrónico" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }} onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }} required />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <i className="fa-solid fa-lock" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '16px', pointerEvents: 'none' }}></i>
                            <input type={showPassword ? "text" : "password"} placeholder="Contraseña" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }} onBlur={e => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }} required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}>
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '14px' }}></i>
                            </button>
                        </div>
                        <button type="submit" disabled={loading} style={{ marginTop: '8px', width: '100%', padding: '14px', background: 'linear-gradient(to right, #2563eb, #1d4ed8)', color: 'white', fontWeight: '600', fontSize: '15px', borderRadius: '12px', border: 'none', cursor: loading ? 'wait' : 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)', opacity: loading ? 0.7 : 1, transition: 'transform 0.1s' }} onMouseDown={e => !loading && (e.target.style.transform = 'scale(0.98)')} onMouseUp={e => !loading && (e.target.style.transform = 'scale(1)')}>
                            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
                        </button>
                    </form>
                    <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '12px' }}>
                        <div style={{ height: '1px', background: '#334155', flex: 1 }}></div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>O continúa con</span>
                        <div style={{ height: '1px', background: '#334155', flex: 1 }}></div>
                    </div>
                    <button onClick={handleGoogleLogin} type="button" disabled={loading} style={{ width: '100%', padding: '12px', background: '#ffff', color: '#0f172a', fontWeight: '600', fontSize: '15px', borderRadius: '12px', border: 'none', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'background 0.2s' }} onMouseOver={e => !loading && (e.target.style.background = '#f1f5f9')} onMouseOut={e => !loading && (e.target.style.background = '#ffff')}>
                        <i className="fa-brands fa-google" style={{ fontSize: '18px', color: '#ea4335' }}></i>
                        Continuar con Google
                    </button>
                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '14px', cursor: 'pointer' }}>
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

    /* ==== APP ==== */
    const App = () => {
        const [prompt, setPrompt] = useState('');
        const [baseImages, setBaseImages] = useState([]);
        const [originalBaseImage, setOriginalBaseImage] = useState(null);
        const [originalAspectRatio, setOriginalAspectRatio] = useState('9:16');
        const [images, setImages] = useState([]);
        const [enhancedOptions, setEnhancedOptions] = useState([]);
        const [selectedPromptId, setSelectedPromptId] = useState(null);
        const [user, setUser] = useState(null);
        const [userData, setUserData] = useState(null);
        const [authModalOpen, setAuthModalOpen] = useState(false);

        useEffect(() => {
            auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
            auth.signOut();
            const unsubscribe = auth.onAuthStateChanged(async (u) => {
                setUser(u);
                if (!u) {
                    setAuthModalOpen(true);
                    setUserData(null);
                } else {
                    const data = await ensureUserDocument(u);
                    setUserData(data);
                    setAuthModalOpen(false);
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

        // TODAS LAS OPCIONES
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
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        
        const img = new Image();
        img.onload = () => {
            const ratio = img.width / img.height;
            let detectedAR = '1:1';
            
            if (ratio > 2) detectedAR = '21:9';
            else if (ratio > 1.7) detectedAR = '16:9';
            else if (ratio > 1.4) detectedAR = '3:2';
            else if (ratio > 1.2) detectedAR = '4:3';
            else if (ratio > 0.9) detectedAR = '1:1';
            else if (ratio > 0.75) detectedAR = '4:5';
            else if (ratio > 0.65) detectedAR = '3:4';
            else if (ratio > 0.55) detectedAR = '2:3';
            else detectedAR = '9:16';
            
            setAspectRatio(detectedAR);
            setOriginalAspectRatio(detectedAR);
            
            const newFile = { id: Date.now() + Math.random(), file, url };
            setBaseImages([newFile]);
            setOriginalBaseImage(newFile);
        };
        img.src = url;
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
            } catch (e) { setError(e.message); } finally { setIsLoading(false); }
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

    const onCardEditRequest = async (imgObj, action, textPrompt = null) => {
    if (action === 'mask') {
        // Convertir la imagen resultado en imagen base
        const f = await dataURLtoFile(imgObj.src);
        setBaseImages([{ id: imgObj.id, file: f, url: imgObj.src }]);
        
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

        const handleMaskSave = async (maskObjects) => {
            setTempMaskData(prev => ({ ...prev, [activeEditImgId]: maskObjects }));
            setMaskEditorOpen(false);
            setIsLoading(true);
            setLoadingMsg('Analizando zonas de la máscara...');
            try {
                let baseSrc = null;
                const baseImgObj = baseImages.find(i => i.id === activeEditImgId);
                if (baseImgObj) baseSrc = baseImgObj.url;
                else {
                    const resImg = images.find(i => i.id === activeEditImgId);
                    if (resImg) baseSrc = resImg.src;
                }
                if (baseSrc) {
                    const combined = await combineBaseAndMaskVisual(baseSrc, maskObjects.visual);
                    const res = await api.analyzeMask(combined.data);
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
            let effPrompt = customPromptOverride || prompt;
            
            // REQUIERE IMAGEN BASE PARA EDICIÓN
            if (baseImages.length === 0) { 
                setError('Debes subir una imagen base para editar.'); 
                return; 
            }
           if (!effPrompt.trim()) {
    const autoParts = [];
    
    // Detectar cambios de estilo
    if (style !== 'Realista') autoParts.push(`Convert to ${style} style`);
    if (realism !== 'Fotorrealista') autoParts.push(`Make it ${MAP_REALISM[realism]}`);
    if (creative !== 'Ninguno') autoParts.push(MAP_CREATIVO[creative]);
    
    // Detectar cambio de AR
    if (aspectRatio !== originalAspectRatio) autoParts.push(`Adjust to ${aspectRatio} aspect ratio`);
    
    if (autoParts.length === 0) {
        setError('Describe la edición o cambia alguna opción (estilo, relación de aspecto, etc.).');
        return;
    }
    effPrompt = autoParts.join('. ') + '. Keep the rest of the image identical.';
}

            const usageCheck = checkCanGenerate(userData);
            if (!usageCheck.canGenerate) {
                setError(usageCheck.reason + '. Actualiza tu plan para continuar.');
                return;
            }

            setIsLoading(true); setLoadingMsg('Editando imagen...'); setError('');

            let maskData = null;
            if (baseImages.length > 0) {
                maskData = tempMaskData[baseImages[0].id] || null;
            }

            try {
                const blocks = [];
                let imagesToSend = [];

                if (maskData) {
                    setLoadingMsg('Fusionando máscara visual...');
                    const combinedImagePart = await combineBaseAndMaskVisual(baseImages[0].url, maskData.visual);
                    imagesToSend = [combinedImagePart];
                    blocks.push(PRE_PROMPT_INPAINT_VISUAL);
                    blocks.push(`INSTRUCTION: Fill the RED area with: "${effPrompt}".`);
                } else {
                    blocks.push(PRE_PROMPT_BASE);
                    const imageToUse = originalBaseImage || baseImages[0];
imagesToSend = [await fileToPart(imageToUse.file)];

                    if (MAP_REALISM[realism]) blocks.push(MAP_REALISM[realism]);
                    if (MAP_CREATIVO[creative]) blocks.push(MAP_CREATIVO[creative]);

                    if (!allowText) blocks.push("NO TEXT.");
                    if (allowText && customText) blocks.push(`Text: "${customText}"`);
                    if (allowObjs) blocks.push("Add objects.");
                    if (logoMode === 'Conservar logos') blocks.push("Preserve logos.");
                    blocks.push(`USER PROMPT: ${effPrompt}`);
                }

                const res = await api.generateImage(blocks.join(' '), 'gemini', imagesToSend, aspectRatio, ['IMAGE'], null);

                if (res.type === 'image') {
                    const newImg = {
                        id: Date.now(), 
                        src: `data:${res.mimeType};base64,${res.image}`,
                        arCss: cssAR(aspectRatio),
                        promptUsed: effPrompt,
                       promptLabel: maskData ? 'Editado (Máscara)' : `Editado - Prompt ${selectedPromptId || 'Manual'}`
                    };
                    setImages(prev => [newImg, ...prev]);
                    
                    // Restaurar imagen base original
                    if (originalBaseImage) {
                        setBaseImages([originalBaseImage]);
                        setTempMaskData({});
                    }
                    

                    await incrementUsage(user.uid);
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

                const res = await api.generateImage(blocks.join(' '), 'gemini', imagesToSend, null, ['IMAGE'], maskDataObj);

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
                    <h1>Editar Imágenes</h1>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {user && userData && (
                            <>
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{user.email}</span>
                                {userData.role === 'free' && (
                                    <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '8px', fontSize: '0.85rem', color: '#22d3ee' }}>
                                        Ediciones restantes: {checkCanGenerate(userData).remaining}
                                    </div>
                                )}
                                {(userData.role === 'vip' || userData.role === 'admin') && (
                                    <div style={{ padding: '0.4rem 0.8rem', background: 'linear-gradient(135deg, #22d3ee, #a78bfa)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', color: '#0c1445' }}>
                                        Ediciones restantes: ∞
                                    </div>
                                )}
                            </>
                        )}
                        {user ? (
                            <button className="btn btn-sm" onClick={() => auth.signOut()} style={{ background: 'var(--danger)' }}>
                                <i className="fa-solid fa-right-from-bracket"></i> Salir
                            </button>
                        ) : (
                            <button className="btn btn-sm" onClick={() => setAuthModalOpen(true)}>Iniciar Sesión</button>
                        )}
                    </div>
                </header>

                {!user && <div className="guest-blur-overlay"></div>}
                {!user && authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}

                <div id="app-content">
                    <div className="controls-column">
                        <input id="base-upload" type="file" accept="image/*" onChange={onUploadBase} style={{ display: 'none' }} />

                        {/* SECCIÓN: SUBIR IMAGEN BASE */}
                        <div className="base-uploader-section" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ marginBottom: '0.5rem', color: '#e5e7eb' }}>Subir Imagen Base</h3>
                            <button className="btn" onClick={() => document.getElementById('base-upload').click()} style={{ width: '100%', background: 'linear-gradient(135deg, #3b82f6, #a78bfa)' }}>
                                <i className="fa-solid fa-upload"></i> Subir Imagen Base
                            </button>
                            
                            {baseImages.length > 0 && (
                                <div className={`base-image-preview ${tempMaskData[baseImages[0].id] ? 'has-mask-indicator' : ''}`} style={{ marginTop: '1rem' }}>
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
                            )}
                            {tempMaskData[baseImages[0]?.id] && <p style={{ color: 'var(--acc)', fontSize: '0.9rem', textAlign: 'center', marginTop: '5px' }}>Máscara activa.</p>}
                        </div>

                        {/* PROMPT */}
                        <div className="input-group">
                            <label>Describe la edición</label>
                            <textarea value={prompt} onChange={e => { setPrompt(e.target.value); setSelectedPromptId(null); }} placeholder="Ej: Cambia el fondo por una playa tropical..." />
                            {enhancedOptions.length > 0 && (
                                <div className="prompt-options-grid">
                                    {enhancedOptions.map((opt, idx) => (
                                        <button key={idx} className={`prompt-opt-btn ${selectedPromptId === (idx + 1) ? 'selected' : ''}`} onClick={() => { setPrompt(opt); setSelectedPromptId(idx + 1); }}>Opción {idx + 1}</button>
                                    ))}
                                </div>
                            )}

                            <div className="input-actions-row">
                                <button className="btn" onClick={enhance} style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                    <i className="fa-solid fa-sparkles"></i> Mejorar Prompt
                                </button>
                                <button className="btn" onClick={() => generate()} style={{ background: 'linear-gradient(135deg, #22d3ee, #a78bfa)' }}>
                                    <i className="fa-solid fa-pen-to-square"></i> Editar
                                </button>
                            </div>
                            <button className="btn" onClick={clearAll} style={{ marginTop: '0.5rem', background: 'rgba(100,116,139,0.3)', width: '100%' }}>
                                <i className="fa-solid fa-rotate"></i> Limpiar Todo
                            </button>
                        </div>

                        {/* OPCIONES: Relación de aspecto */}
                        
                        <div className="select-row" style={{ marginTop: '1rem' }}>
                            <CustomSelect label="Relación de aspecto" value={aspectRatio} onChange={setAspectRatio} groups={aspectGroups} />
                        </div>

                        

                        {/* BOTÓN GENERAR */}
                        <div className="actions" style={{ marginTop: '1.5rem' }}>
                            
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