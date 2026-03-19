/* app_edicion.js - Edición con rectángulos + máscara automática */
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
    measurementId: "G-KG5Y3K7ME2",
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();
  const db = firebase.firestore();

  /* ==== USER MANAGEMENT ==== */
  const ADMIN_EMAIL = "atnojs@gmail.com";
  const DAILY_LIMIT = 8;

  const ensureUserDocument = async (user) => {
    if (!user) return null;
    const userRef = db.collection("users").doc(user.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      const userData = {
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        role: user.email === ADMIN_EMAIL ? "admin" : "free",
        usage: {
          date: new Date().toISOString().split("T")[0],
          count: 0,
        },
        subscriptionStatus: "none",
      };
      await userRef.set(userData);
      return userData;
    }
    return userDoc.data();
  };

  const getUserData = async (uid) => {
    const userDoc = await db.collection("users").doc(uid).get();
    return userDoc.exists ? userDoc.data() : null;
  };

  const checkCanGenerate = (userData) => {
    if (!userData) return { canGenerate: false, reason: "No user data" };
    if (userData.role === "admin" || userData.role === "vip") {
      return { canGenerate: true, remaining: "∞" };
    }
    const today = new Date().toISOString().split("T")[0];
    if (userData.usage.date !== today) {
      return { canGenerate: true, remaining: DAILY_LIMIT };
    }
    const remaining = DAILY_LIMIT - (userData.usage.count || 0);
    if (remaining <= 0) {
      return {
        canGenerate: false,
        reason: "Límite diario alcanzado",
        remaining: 0,
      };
    }
    return { canGenerate: true, remaining };
  };

  const incrementUsage = async (uid) => {
    const userRef = db.collection("users").doc(uid);
    const userData = await getUserData(uid);
    if (!userData) return;
    const today = new Date().toISOString().split("T")[0];
    if (userData.usage.date !== today) {
      await userRef.update({ "usage.date": today, "usage.count": 1 });
    } else {
      await userRef.update({
        "usage.count": firebase.firestore.FieldValue.increment(1),
      });
    }
  };

  /* ==== CONSTANTES ==== */
  const PRE_PROMPT_BASE =
    "CRITICAL: ABSOLUTELY NO TEXT, NO WATERMARKS. If a base image is provided, PRESERVE IT EXACTLY unless explicitly changed.";

  /* ==== API ==== */
  const api = {
    async call(body) {
      const res = await fetch("./proxy.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error)
        throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },
    enhancePrompt(prompt) {
      return this.call({ task: "enhancePrompt", prompt });
    },
    generateImage(
      prompt,
      provider = "gemini",
      images = [],
      aspectRatio = "",
      modalities = ["IMAGE"],
      maskImage = null
    ) {
      return this.call({
        task: "generateImage",
        provider,
        prompt,
        images,
        maskImage,
        aspectRatio,
        modalities,
        generationConfig: {
          responseModalities: modalities,
          temperature: 0.6,
        },
      });
    },
  };

  /* ==== UTILS ==== */
  const fileToPart = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          data: String(reader.result).split(",")[1],
          mimeType: file.type || "image/png",
        });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const dataURLtoFile = (dataUrl, filename = `imagen-${Date.now()}.png`) => {
    return new Promise((resolve) => {
      const arr = dataUrl.split(",");
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
    if (!ar || !ar.includes(":")) return "1 / 1";
    const [w, h] = ar.split(":");
    return `${w} / ${h}`;
  };

  /* ==== Construir máscara B/N desde rectángulos ==== */
  async function buildMaskFromRectangles(imageUrl, rectangles) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "white";

        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;

        rectangles.forEach((r) => {
          const left = r.w >= 0 ? r.x : r.x + r.w;
          const top = r.h >= 0 ? r.y : r.y + r.h;
          const width = Math.abs(r.w);
          const height = Math.abs(r.h);

          ctx.fillRect(
            left * scaleX,
            top * scaleY,
            width * scaleX,
            height * scaleY
          );
        });

        const dataUrl = canvas.toDataURL("image/png");
        resolve({
          data: dataUrl.split(",")[1],
          mimeType: "image/png",
        });
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  /* ==== SELECT ==== */
  const CustomSelect = ({ label, value, onChange, options, groups }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    useEffect(() => {
      const click = (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target))
          setIsOpen(false);
      };
      document.addEventListener("mousedown", click);
      return () => document.removeEventListener("mousedown", click);
    }, []);
    const selectedLabel =
      groups?.flatMap((g) => g.options).find((o) => o === value) ||
      options?.find((o) => o.value === value)?.label ||
      value;
    return (
      <div ref={containerRef} className="custom-select-container">
        <label>{label}</label>
        <div
          className="custom-select-trigger"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{selectedLabel}</span>
          <i
            className={`fa-solid fa-chevron-down ${
              isOpen ? "fa-rotate-180" : ""
            }`}
            style={{ transition: "0.2s" }}
          ></i>
        </div>
        {isOpen && (
          <ul className="custom-select-options">
            {groups
              ? groups.map((g) => (
                  <React.Fragment key={g.label}>
                    <li className="custom-select-optgroup">{g.label}</li>
                    {g.options.map((opt) => (
                      <li
                        key={opt}
                        className={`custom-select-option ${
                          value === opt ? "selected" : ""
                        }`}
                        onClick={() => {
                          onChange(opt);
                          setIsOpen(false);
                        }}
                      >
                        {opt}
                      </li>
                    ))}
                  </React.Fragment>
                ))
              : options.map((opt) => (
                  <li
                    key={opt.value}
                    className={`custom-select-option ${
                      value === opt.value ? "selected" : ""
                    }`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                  >
                    {opt.label}
                  </li>
                ))}
          </ul>
        )}
      </div>
    );
  };

  /* ==== EDITOR DE RECTÁNGULOS ==== */
  const RectangleEditor = ({ src, onClose, onConfirm }) => {
    const containerRef = useRef(null);
    const [rectangles, setRectangles] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(null);

    const getPos = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseDown = (e) => {
      e.preventDefault();
      const { x, y } = getPos(e);
      const newRect = { x, y, w: 0, h: 0 };
      setRectangles((prev) => [...prev, newRect]);
      setCurrentIndex(rectangles.length);
      setIsDrawing(true);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing || currentIndex === null) return;
      setRectangles((prev) => {
        const copy = [...prev];
        const { x, y } = getPos(e);
        const r = copy[currentIndex];
        if (!r) return prev;
        r.w = x - r.x;
        r.h = y - r.y;
        return copy;
      });
    };

    const handleMouseUp = () => {
      setIsDrawing(false);
      setCurrentIndex(null);
    };

    const handleMouseLeave = () => {
      if (isDrawing) {
        setIsDrawing(false);
        setCurrentIndex(null);
      }
    };

    const confirm = () => {
      const valid = rectangles.filter(
        (r) => Math.abs(r.w) > 10 && Math.abs(r.h) > 10
      );
      onConfirm(valid);
    };

    return (
      <div className="mask-editor-overlay">
        <h3 style={{ color: "white", marginBottom: ".5rem" }}>
          Selecciona zonas con clic y arrastre
        </h3>
        <div
          ref={containerRef}
          className="mask-editor-container"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <img
            src={src}
            draggable={false}
            style={{ display: "block", userSelect: "none" }}
          />

          {rectangles.map((r, i) => {
            const left = r.w >= 0 ? r.x : r.x + r.w;
            const top = r.h >= 0 ? r.y : r.y + r.h;
            const width = Math.abs(r.w);
            const height = Math.abs(r.h);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left,
                  top,
                  width,
                  height,
                  border: "2px solid orange",
                  background: "rgba(255,165,0,.15)",
                  color: "white",
                  fontSize: "12px",
                  padding: "2px 4px",
                  pointerEvents: "none",
                }}
              >
                Rectángulo {i + 1}
              </div>
            );
          })}
        </div>

        <div className="mask-controls">
          <button className="btn btn-sm" onClick={() => setRectangles([])}>
            Borrar todo
          </button>
          <button
            className="btn btn-sm"
            onClick={onClose}
            style={{ background: "var(--danger)" }}
          >
            Cancelar
          </button>
          <button
            className="btn btn-sm"
            onClick={confirm}
            style={{ background: "#22c55e" }}
          >
            Confirmar
          </button>
        </div>
      </div>
    );
  };

  /* ==== RESULT CARD ==== */
  const ResultCard = ({
    img,
    setModalImage,
    onTextEdit,
    onDelete,
    onRegenerate,
    onUseAsBase,
  }) => {
    const [showEditBox, setShowEditBox] = useState(false);
    const [editPrompt, setEditPrompt] = useState("");
    const cardRef = useRef(null);

    useEffect(() => {
      if (!showEditBox) return;
      const click = (e) => {
        if (cardRef.current && !cardRef.current.contains(e.target))
          setShowEditBox(false);
      };
      document.addEventListener("mousedown", click);
      return () => document.removeEventListener("mousedown", click);
    }, [showEditBox]);

    const executeEdit = () => {
      if (!editPrompt.trim()) return;
      onTextEdit(img, editPrompt);
      setShowEditBox(false);
      setEditPrompt("");
    };

    const download = (src) => {
      const a = document.createElement("a");
      a.href = src;
      a.download = `imagen-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    return (
      <div className="card" ref={cardRef}>
        <div
          className="ar-box"
          onClick={() => setModalImage(img.src)}
          style={{ position: "relative", aspectRatio: img.arCss || "1 / 1" }}
        >
          <img className="card-img" src={img.src} alt="resultado" />
          {img.promptLabel && (
            <div className="prompt-legend">{img.promptLabel}</div>
          )}
          <div
            className="overlay-actions"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="action-btn btn-dl"
              data-tooltip="Descargar"
              onClick={() => download(img.src)}
            >
              <i className="fa-solid fa-download"></i>
            </button>
            <button
              className="action-btn"
              style={{ background: "#0ea5e9" }}
              data-tooltip="Usar como base"
              onClick={() => onUseAsBase(img.src)}
            >
              <i className="fa-solid fa-image"></i>
            </button>
            <button
              className="action-btn btn-edit"
              data-tooltip="Editar con texto"
              onClick={() => setShowEditBox(!showEditBox)}
            >
              <i className="fa-solid fa-pen"></i>
            </button>
            <button
              className="action-btn btn-regen"
              data-tooltip="Regenerar"
              onClick={() => onRegenerate(img)}
            >
              <i className="fa-solid fa-rotate-right"></i>
            </button>
            <button
              className="action-btn btn-del"
              data-tooltip="Eliminar"
              onClick={() => onDelete(img.id)}
            >
              <i className="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
        {showEditBox && (
          <div className="inline-edit-container">
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Describe el cambio..."
              autoFocus
            />
            <div className="actions">
              <button className="btn btn-sm" onClick={executeEdit}>
                Generar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ==== AUTH MODAL ==== */
  const AuthModal = ({ onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
      	const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async (e) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        if (isLogin) {
          await auth.signInWithEmailAndPassword(email, password);
        } else {
          await auth.createUserWithEmailAndPassword(email, password);
        }
        if (onClose) setTimeout(onClose, 100);
      } catch (err) {
        if (
          err.code === "auth/wrong-password" ||
          err.code === "auth/user-not-found"
        )
          setError("Credenciales incorrectas.");
        else if (err.code === "auth/email-already-in-use")
          setError("El email ya está registrado.");
        else setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleGoogleLogin = async () => {
      setError("");
      setLoading(true);
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await auth.signInWithPopup(provider);
        if (onClose) setTimeout(onClose, 100);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const inputStyle = {
      width: "100%",
      padding: "14px 16px 14px 48px",
      background: "rgba(15, 23, 42, 0.6)",
      border: "1px solid #334155",
      borderRadius: "12px",
      color: "white",
      fontSize: "15px",
      outline: "none",
      transition: "all 0.2s ease",
    };

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "rgba(2, 6, 23, 0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            width: "90%",
            maxWidth: "400px",
            padding: "40px 32px",
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "24px",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.7)",
            position: "relative",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                margin: "0 auto 16px auto",
                width: "64px",
                height: "64px",
                background:
                  "radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(15, 23, 42, 0) 70%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  background: "rgba(30, 58, 138, 0.4)",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  boxShadow: "0 0 15px rgba(59, 130, 246, 0.2)",
                }}
              >
                <i
                  className="fa-solid fa-lock"
                  style={{ fontSize: "18px", color: "#60a5fa" }}
                ></i>
              </div>
            </div>
            <h2
              style={{
                fontSize: "26px",
                fontWeight: "800",
                color: "white",
                marginBottom: "6px",
                letterSpacing: "-0.5px",
              }}
            >
              {isLogin ? "Bienvenido de nuevo" : "Crear cuenta"}
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>
              {isLogin ? "Accede para continuar editando" : "Regístrate para empezar"}
            </p>
          </div>
          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                background: "rgba(127, 29, 29, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: "10px",
                color: "#fca5a5",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}
          <form
            onSubmit={handleAuth}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div style={{ position: "relative" }}>
              <i
                className="fa-solid fa-envelope"
                style={{
                  position: "absolute",
                  left: "18px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontSize: "16px",
                  pointerEvents: "none",
                }}
              ></i>
              <input
                type="email"
                placeholder="Tu correo electrónico"
                style={inputStyle}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.boxShadow = "0 0 0 1px #3b82f6";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#334155";
                  e.target.style.boxShadow = "none";
                }}
                required
              />
            </div>
            <div style={{ position: "relative" }}>
              <i
                className="fa-solid fa-lock"
                style={{
                  position: "absolute",
                  left: "18px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                  fontSize: "16px",
                  pointerEvents: "none",
                }}
              ></i>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña"
                style={inputStyle}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.boxShadow = "0 0 0 1px #3b82f6";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#334155";
                  e.target.style.boxShadow = "none";
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#64748b",
                }}
              >
                <i
                  className={`fa-solid ${
                    showPassword ? "fa-eye-slash" : "fa-eye"
                  }`}
                  style={{ fontSize: "14px" }}
                ></i>
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "8px",
                width: "100%",
                padding: "14px",
                background: "linear-gradient(to right, #2563eb, #1d4ed8)",
                color: "white",
                fontWeight: "600",
                fontSize: "15px",
                borderRadius: "12px",
                border: "none",
                cursor: loading ? "wait" : "pointer",
                boxShadow:
                  "0 4px 12px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                opacity: loading ? 0.7 : 1,
                transition: "transform 0.1s",
              }}
              onMouseDown={(e) =>
                !loading && (e.target.style.transform = "scale(0.98)")
              }
              onMouseUp={(e) =>
                !loading && (e.target.style.transform = "scale(1)")
              }
            >
              {loading ? (
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              ) : isLogin ? (
                "Iniciar Sesión"
              ) : (
                "Crear Cuenta"
              )}
            </button>
          </form>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "24px 0",
              gap: "12px",
            }}
          >
            <div style={{ height: "1px", background: "#334155", flex: 1 }}></div>
            <span
              style={{
                fontSize: "11px",
                color: "#64748b",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              O continúa con
            </span>
            <div style={{ height: "1px", background: "#334155", flex: 1 }}></div>
          </div>
          <button
            onClick={handleGoogleLogin}
            type="button"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#ffff",
              color: "#0f172a",
              fontWeight: "600",
              fontSize: "15px",
              borderRadius: "12px",
              border: "none",
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) =>
              !loading && (e.target.style.background = "#f1f5f9")
            }
            onMouseOut={(e) =>
              !loading && (e.target.style.background = "#ffff")
            }
          >
            <i
              className="fa-brands fa-google"
              style={{ fontSize: "18px", color: "#ea4335" }}
            ></i>
            Continuar con Google
          </button>
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#60a5fa",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {isLogin ? (
                <span>
                  ¿No tienes cuenta?{" "}
                  <span
                    style={{
                      fontWeight: "700",
                      textDecoration: "underline",
                    }}
                  >
                    Regístrate gratis
                  </span>
                </span>
              ) : (
                <span>
                  ¿Ya tienes cuenta?{" "}
                  <span
                    style={{
                      fontWeight: "700",
                      textDecoration: "underline",
                    }}
                  >
                    Inicia sesión
                  </span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ==== APP ==== */
  const App = () => {
    const [prompt, setPrompt] = useState("");
    const [baseImages, setBaseImages] = useState([]);
    const [images, setImages] = useState([]);
    const [enhancedOptions, setEnhancedOptions] = useState([]);
    const [selectedPromptId, setSelectedPromptId] = useState(null);
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [authModalOpen, setAuthModalOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState("");
    const [error, setError] = useState("");
    const [modalImage, setModalImage] = useState(null);

    const [rectEditorOpen, setRectEditorOpen] = useState(false);
    const [rectImageSrc, setRectImageSrc] = useState(null);
    const [rectangles, setRectangles] = useState([]);

    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [realism, setRealism] = useState("Fotorrealista");
    const [style, setStyle] = useState("Realista");
    const [creative, setCreative] = useState("Ninguno");
    const [allowText, setAllowText] = useState(false);
    const [customText, setCustomText] = useState("");
    const [allowObjs, setAllowObjs] = useState(false);
    const [logoMode, setLogoMode] = useState("Conservar logos");

    const aspectGroups = [
      { label: "Vertical", options: ["9:16", "3:4", "2:3", "4:5"] },
      { label: "Horizontal", options: ["16:9", "4:3", "3:2", "21:9"] },
      { label: "Cuadrado", options: ["1:1"] },
    ];
    const MAP_REALISM = {
      Fotorrealista: "Photorealistic",
      Hiperrealista: "Hyperrealistic",
      Ilustración: "Illustration",
      Anime: "Anime style",
    };
    const MAP_CREATIVO = {
      Ninguno: "",
      Cinemático: "Cinematic",
      Fantasía: "Fantasy",
      Cyberpunk: "Cyberpunk",
      Vintage: "Vintage",
    };

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

    const onUploadBase = (e) => {
      if (e.target.files?.length > 0) {
        const newFiles = Array.from(e.target.files).map((f) => ({
          id: Date.now() + Math.random(),
          file: f,
          url: URL.createObjectURL(f),
        }));
        setBaseImages(newFiles);
        setRectangles([]);
      }
      e.target.value = "";
    };

    const enhance = async () => {
      if (!prompt.trim()) return;
      setIsLoading(true);
      setLoadingMsg("Mejorando Prompt con IA...");
      setError("");
      setEnhancedOptions([]);
      try {
        const res = await api.enhancePrompt(prompt);
        if (res.options) setEnhancedOptions(res.options);
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    const regenerateFromCard = (img) => {
      if (img.promptUsed) {
        setPrompt(img.promptUsed);
        generate(img.promptUsed);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    const setAsBaseImage = async (imgSrc) => {
      const f = await dataURLtoFile(imgSrc);
      setBaseImages([{ id: Date.now(), file: f, url: imgSrc }]);
      setRectangles([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const clearAll = () => {
      setPrompt("");
      setEnhancedOptions([]);
      setBaseImages([]);
      setSelectedPromptId(null);
      setRectangles([]);
    };

    const openRectanglesOnBase = () => {
      if (baseImages.length === 0) return;
      setRectImageSrc(baseImages[0].url);
      setRectEditorOpen(true);
    };

    const handleRectanglesConfirmed = (rects) => {
      setRectEditorOpen(false);
      if (!rects || rects.length === 0) return;
      setRectangles(rects);

      let txt = `EDITA ÚNICAMENTE DENTRO DE LOS RECTÁNGULOS INDICADOS.
Trata cada rectángulo como una zona independiente de edición localizada.
No modifiques píxeles que no estén dentro de los rectángulos.
Respeta la luz, el estilo, la gama de color, la perspectiva y la coherencia visual de la imagen.

INSTRUCCIONES POR ZONA:
`;

      rects.forEach((_, i) => {
        txt += `

RECTÁNGULO ${i + 1}:
Describe de forma muy específica lo que debe ocurrir solo dentro del rectángulo ${
          i + 1
        }. Indica objeto, estilo, iluminación, textura y grado de integración.
`;
      });

      txt += `

IMPORTANTE:
• No hagas cambios fuera de los rectángulos.
• Ajusta las ediciones para que queden perfectamente integradas.
• Mantén proporciones, perspectiva y coherencia con la escena original.
`;

      setPrompt(txt);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const generate = async (customPromptOverride = null) => {
      const effPrompt = customPromptOverride || prompt;

      if (baseImages.length === 0) {
        setError("Debes subir una imagen base para editar.");
        return;
      }
      if (!effPrompt.trim()) {
        setError("Describe la edición que deseas realizar.");
        return;
      }

      const usageCheck = checkCanGenerate(userData);
      if (!usageCheck.canGenerate) {
        setError(usageCheck.reason + ". Actualiza tu plan para continuar.");
        return;
      }

      setIsLoading(true);
      setLoadingMsg("Editando imagen...");
      setError("");

      try {
        const blocks = [];
        blocks.push(PRE_PROMPT_BASE);

        if (MAP_REALISM[realism]) blocks.push(MAP_REALISM[realism]);
        if (MAP_CREATIVO[creative]) blocks.push(MAP_CREATIVO[creative]);
        if (!allowText) blocks.push("NO TEXT.");
        if (allowText && customText) blocks.push(`Text: "${customText}"`);
        if (allowObjs) blocks.push("Add objects.");
        if (logoMode === "Conservar logos") blocks.push("Preserve logos.");
        if (logoMode === "Eliminar logos") blocks.push("Remove logos.");

        if (rectangles.length > 0) {
          blocks.push(
            "You receive 2 images: the FIRST is the original scene, the SECOND is a binary mask where WHITE means 'EDIT THIS AREA' and BLACK means 'DO NOT CHANGE'. Edit ONLY inside the white zones."
          );
        }

        blocks.push(`USER PROMPT: ${effPrompt}`);

        const imagesToSend = await Promise.all(
          baseImages.map((img) => fileToPart(img.file))
        );

        let maskImage = null;
        if (rectangles.length > 0) {
          maskImage = await buildMaskFromRectangles(
            baseImages[0].url,
            rectangles
          );
        }

        const res = await api.generateImage(
          blocks.join(" "),
          "gemini",
          imagesToSend,
          aspectRatio,
          ["IMAGE"],
          maskImage
        );

        if (res.type === "image") {
          const newImg = {
            id: Date.now(),
            src: `data:${res.mimeType};base64,${res.image}`,
            arCss: cssAR(aspectRatio),
            promptUsed: effPrompt,
            promptLabel:
              rectangles.length > 0 ? "Editado (Rectángulos)" : "Editado",
          };
          setImages((prev) => [newImg, ...prev]);

          await incrementUsage(user.uid);
          const updatedData = await getUserData(user.uid);
          setUserData(updatedData);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    const generateInlineEdit = async (baseImgObj, instruction) => {
      setIsLoading(true);
      setLoadingMsg("Editando...");
      try {
        const blocks = [];
        let imagesToSend = [];

        blocks.push(PRE_PROMPT_BASE);
        blocks.push("TASK: Edit the image.");
        blocks.push(`INSTRUCTION: "${instruction}".`);

        imagesToSend = [
          await fileToPart(await dataURLtoFile(baseImgObj.src)),
        ];

        const res = await api.generateImage(
          blocks.join(" "),
          "gemini",
          imagesToSend,
          null,
          ["IMAGE"],
          null
        );

        if (res.type === "image") {
          setImages((prev) => [
            {
              id: Date.now(),
              src: `data:${res.mimeType};base64,${res.image}`,
              arCss: baseImgObj.arCss,
              promptUsed: instruction,
              promptLabel: "Editado",
            },
            ...prev,
          ]);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="container">
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p style={{ marginTop: "1rem", color: "white" }}>{loadingMsg}</p>
          </div>
        )}

        {modalImage && (
          <div className="modal-overlay" onClick={() => setModalImage(null)}>
            <img src={modalImage} alt="zoom" />
          </div>
        )}

        {rectEditorOpen && (
          <RectangleEditor
            src={rectImageSrc}
            onClose={() => setRectEditorOpen(false)}
            onConfirm={handleRectanglesConfirmed}
          />
        )}

        <header className="app-header">
          <h1>Editar Imágenes</h1>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "15px",
            }}
          >
            {user && userData && (
              <>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "#94a3b8",
                  }}
                >
                  {user.email}
                </span>
                {userData.role === "free" && (
                  <div
                    style={{
                      padding: "0.4rem 0.8rem",
                      background: "rgba(34, 211, 238, 0.1)",
                      border: "1px solid rgba(34, 211, 238, 0.3)",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      color: "#22d3ee",
                    }}
                  >
                    Ediciones restantes: {checkCanGenerate(userData).remaining}
                  </div>
                )}
                {(userData.role === "vip" || userData.role === "admin") && (
                  <div
                    style={{
                      padding: "0.4rem 0.8rem",
                      background:
                        "linear-gradient(135deg, #22d3ee, #a78bfa)",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      color: "#0c1445",
                    }}
                  >
                    Ediciones restantes: ∞
                  </div>
                )}
              </>
            )}
            {user ? (
              <button
                className="btn btn-sm"
                onClick={() => auth.signOut()}
                style={{ background: "var(--danger)" }}
              >
                <i className="fa-solid fa-right-from-bracket"></i> Salir
              </button>
            ) : (
              <button
                className="btn btn-sm"
                onClick={() => setAuthModalOpen(true)}
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        </header>

        {!user && <div className="guest-blur-overlay"></div>}
        {!user && authModalOpen && (
          <AuthModal onClose={() => setAuthModalOpen(false)} />
        )}

        <div id="app-content">
          <div className="controls-column">
            <input
              id="base-upload"
              type="file"
              accept="image/*"
              onChange={onUploadBase}
              style={{ display: "none" }}
            />

            {/* SUBIR IMAGEN BASE */}
            <div
              className="base-uploader-section"
              style={{ marginBottom: "1rem" }}
            >
              <h3 style={{ marginBottom: "0.5rem", color: "#e5e7eb" }}>
                Subir Imagen Base
              </h3>
              <button
                className="btn"
                onClick={() =>
                  document.getElementById("base-upload").click()
                }
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(135deg, #3b82f6, #a78bfa)",
                }}
              >
                <i className="fa-solid fa-upload"></i> Subir Imagen Base
              </button>

              {baseImages.length > 0 && (
                <div
                  className="base-image-preview"
                  style={{ marginTop: "1rem" }}
                >
                  <img
                    src={baseImages[0].url}
                    alt="base"
                    onClick={() => setModalImage(baseImages[0].url)}
                  />
                  <div className="base-overlay-actions">
                    <button
                      className="base-action-btn"
                      title="Seleccionar rectángulos"
                      onClick={openRectanglesOnBase}
                    >
                      <i className="fa-regular fa-square"></i>
                    </button>
                    <button
                      className="base-action-btn danger"
                      title="Eliminar imagen"
                      onClick={() => {
                        setBaseImages([]);
                        setRectangles([]);
                      }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  {rectangles.length > 0 && (
                    <p
                      style={{
                        color: "var(--acc)",
                        fontSize: "0.85rem",
                        marginTop: "4px",
                        textAlign: "center",
                      }}
                    >
                      {rectangles.length} rectángulo(s) definidos.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* PROMPT */}
            <div className="input-group">
              <label>Describe la edición</label>
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setSelectedPromptId(null);
                }}
                placeholder="Ej: Cambia el fondo por una playa tropical..."
              />
              {enhancedOptions.length > 0 && (
                <div className="prompt-options-grid">
                  {enhancedOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      className={`prompt-opt-btn ${
                        selectedPromptId === idx + 1 ? "selected" : ""
                      }`}
                      onClick={() => {
                        setPrompt(opt);
                        setSelectedPromptId(idx + 1);
                      }}
                    >
                      Opción {idx + 1}
                    </button>
                  ))}
                </div>
              )}

              <div className="input-actions-row">
                <button
                  className="btn"
                  onClick={enhance}
                  style={{
                    background:
                      "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  }}
                >
                  <i className="fa-solid fa-sparkles"></i> Mejorar Prompt
                </button>
                <button
                  className="btn"
                  onClick={() => generate()}
                  style={{
                    background:
                      "linear-gradient(135deg, #22d3ee, #a78bfa)",
                  }}
                >
                  <i className="fa-solid fa-pen-to-square"></i> Editar
                </button>
              </div>
              <button
                className="btn"
                onClick={clearAll}
                style={{
                  marginTop: "0.5rem",
                  background: "rgba(100,116,139,0.3)",
                  width: "100%",
                }}
              >
                <i className="fa-solid fa-rotate"></i> Limpiar Todo
              </button>
            </div>

            {/* OPCIONES */}
            <div className="select-row">
              <CustomSelect
                label="Realismo"
                value={realism}
                onChange={setRealism}
                options={Object.keys(MAP_REALISM).map((k) => ({
                  value: k,
                  label: k,
                }))}
              />
              <CustomSelect
                label="Estilo"
                value={style}
                onChange={setStyle}
                options={["Realista", "Cinemático", "Anime", "3D Render"].map(
                  (k) => ({
                    value: k,
                    label: k,
                  })
                )}
              />
            </div>
            <div className="select-row" style={{ marginTop: "1rem" }}>
              <CustomSelect
                label="Creativo"
                value={creative}
                onChange={setCreative}
                options={Object.keys(MAP_CREATIVO).map((k) => ({
                  value: k,
                  label: k,
                }))}
              />
              <CustomSelect
                label="Relación de aspecto"
                value={aspectRatio}
                onChange={setAspectRatio}
                groups={aspectGroups}
              />
            </div>

            {/* OPCIONES EXTRA */}
            <div style={{ marginTop: "1rem" }}>
              <label className="section-title" style={{ fontSize: "1rem" }}>
                Opciones Extra
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  margin: ".5rem 0",
                }}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={allowText}
                    onChange={(e) => setAllowText(e.target.checked)}
                  />{" "}
                  Texto explícito
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={allowObjs}
                    onChange={(e) => setAllowObjs(e.target.checked)}
                  />{" "}
                  Objetos extra
                </label>
              </div>
              {allowText && (
                <input
                  className="input"
                  placeholder="Texto..."
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                />
              )}
            </div>

            <div style={{ marginTop: ".5rem" }}>
              <CustomSelect
                label="Logos"
                value={logoMode}
                onChange={setLogoMode}
                options={[
                  { value: "Conservar logos", label: "Conservar logos" },
                  { value: "Eliminar logos", label: "Eliminar logos" },
                ]}
              />
            </div>

            <div className="actions" style={{ marginTop: "1.5rem" }}>
              <button
                className="btn"
                onClick={() => generate()}
                style={{
                  width: "100%",
                  fontSize: "1.1rem",
                  background:
                    "linear-gradient(135deg, #22d3ee, #a78bfa)",
                }}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i> Generar
              </button>
            </div>
            {error && <p className="error-message">{error}</p>}
          </div>

          <div className="results-column">
            <h2 className="section-title">Resultados</h2>
            <div className="preview">
              {images.map((img) => (
                <ResultCard
                  key={img.id}
                  img={img}
                  setModalImage={setModalImage}
                  onTextEdit={generateInlineEdit}
                  onDelete={(id) =>
                    setImages((l) => l.filter((x) => x.id !== id))
                  }
                  onRegenerate={regenerateFromCard}
                  onUseAsBase={setAsBaseImage}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App />);
})();
