import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import multer from "multer";
import AdmZip from "adm-zip";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { 
  ProjectSummary, 
  DiagnosticIssue, 
  RepairAction, 
  DatabaseConfig, 
  CompilationLog, 
  DeploymentConfig, 
  FileItem 
} from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Temporary workspace directories
const WORKSPACE_DIR = path.join(__dirname, "temp-workspaces");
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Multer storage logic
const uploadDir = path.join(__dirname, "temp-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Max 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/zip" || path.extname(file.originalname).toLowerCase() === ".zip") {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos comprimidos (.zip)"));
    }
  }
});

// In-memory project cache for quick retrieval
const activeProjects = new Map<string, {
  summary: ProjectSummary;
  files: FileItem[];
  issues: DiagnosticIssue[];
  repairs: RepairAction[];
  compilation: CompilationLog;
  dbConfig?: DatabaseConfig;
  deployment?: DeploymentConfig;
}>();

// Helper to sanitize paths against path traversal
const sanitizePath = (targetPath: string, rootDir: string): string => {
  const resolved = path.resolve(targetPath);
  if (!resolved.startsWith(path.resolve(rootDir))) {
    throw new Error("Malicious path traversal attempted");
  }
  return resolved;
};

// Helper: Recursive File Tree Generator
const generateFileTree = (dirPath: string, projectRoot: string): FileItem[] => {
  const items: FileItem[] = [];
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file === "node_modules" || file === ".git" || file === ".next" || file === "dist" || file === "build") {
        continue;
      }
      const fullPath = path.join(dirPath, file);
      const relativePath = path.relative(projectRoot, fullPath);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        items.push({
          name: file,
          path: relativePath,
          type: "directory",
          children: generateFileTree(fullPath, projectRoot)
        });
      } else {
        items.push({
          name: file,
          path: relativePath,
          type: "file",
          size: stat.size
        });
      }
    }
  } catch (err) {
    console.error("Error mapping tree for path: " + dirPath, err);
  }
  return items;
};

// Helper: Calculate total directory size and file count
const getDirStats = (dirPath: string): { size: number; count: number } => {
  let size = 0;
  let count = 0;
  
  const scan = (p: string) => {
    try {
      if (!fs.existsSync(p)) return;
      const stats = fs.statSync(p);
      if (stats.isDirectory()) {
        const files = fs.readdirSync(p);
        for (const file of files) {
          if (file === "node_modules" || file === ".git") continue;
          scan(path.join(p, file));
        }
      } else {
        size += stats.size;
        count++;
      }
    } catch {
      // Ignored
    }
  };

  scan(dirPath);
  return { size, count };
};

// API ENDPOINT: Project Upload
app.post("/api/upload", upload.single("projectZip"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó ningún archivo (.zip)." });
    }

    const projectId = "proj_" + Date.now();
    const projDir = path.join(WORKSPACE_DIR, projectId);
    const sourceDir = path.join(projDir, "source");
    const backupDir = path.join(projDir, "backups");

    fs.mkdirSync(projDir, { recursive: true });
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });

    // Extract ZIP file securely
    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();

    // Verify for Zip Slip sequence
    for (const entry of zipEntries) {
      const entryPath = entry.entryName;
      if (entryPath.includes("..") || entryPath.startsWith("/")) {
        throw new Error("Estructura de archivo ZIP inválida o sospechosa (Path Traversal).");
      }
    }

    zip.extractAllTo(sourceDir, true);
    
    // Clean up uploaded physical file
    fs.unlinkSync(req.file.path);

    // Analyze Stack of Uploaded Project
    const { size, count } = getDirStats(sourceDir);
    
    let technology: ProjectSummary["technology"] = "Unknown";
    let packageManager: ProjectSummary["packageManager"] = "none";
    let buildCommand = "";
    let outputFolder = "";

    const packageJsonPath = path.join(sourceDir, "package.json");
    let packageJson: any = null;

    if (fs.existsSync(packageJsonPath)) {
      try {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      } catch (e) {
        console.warn("package.json inválido o corrupto");
      }
    }

    // Lock file audit
    if (fs.existsSync(path.join(sourceDir, "package-lock.json"))) {
      packageManager = "npm";
    } else if (fs.existsSync(path.join(sourceDir, "yarn.lock"))) {
      packageManager = "yarn";
    } else if (fs.existsSync(path.join(sourceDir, "pnpm-lock.yaml"))) {
      packageManager = "pnpm";
    } else if (packageJson) {
      packageManager = "npm"; // Default
    }

    // Technology scanning heuristics
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.next) {
        technology = "NextJS";
        buildCommand = "npm run build";
        outputFolder = "out"; // Next.js export or production directory
      } else if (deps.react && deps.vite) {
        technology = "React_Vite";
        buildCommand = "npm run build";
        outputFolder = "dist";
      } else if (deps.vue && deps.vite) {
        technology = "Vue_Vite";
        buildCommand = "npm run build";
        outputFolder = "dist";
      } else if (deps.angular) {
        technology = "Angular";
        buildCommand = "npm run build";
        outputFolder = "dist";
      } else if (deps.express || deps.koa || deps.fastify) {
        technology = "NodeJS";
        buildCommand = "npm run start";
        outputFolder = "dist";
      }
    }

    // PHP heuristics
    if (technology === "Unknown") {
      let containsPHP = false;
      let containsHTML = false;

      const checkFiles = (p: string) => {
        try {
          const files = fs.readdirSync(p);
          for (const file of files) {
            const fp = path.join(p, file);
            if (fs.statSync(fp).isDirectory()) {
              if (file !== "node_modules" && file !== ".git") {
                checkFiles(fp);
              }
            } else {
              if (file.endsWith(".php")) containsPHP = true;
              if (file.endsWith(".html") || file.endsWith(".htm")) containsHTML = true;
            }
          }
        } catch {}
      };

      checkFiles(sourceDir);

      if (containsPHP) {
        technology = "PHP";
        outputFolder = "."; // PHP runs from root folder
        buildCommand = "";
      } else if (containsHTML) {
        technology = "Static";
        outputFolder = "."; // Static runs from root folder
        buildCommand = "";
      }
    }

    const summary: ProjectSummary = {
      id: projectId,
      name: path.basename(req.file.originalname, ".zip"),
      technology,
      sizeBytes: size,
      fileCount: count,
      packageManager,
      buildCommand,
      outputFolder,
      compatibilityScore: 100, // Starts perfect, drops when diagnoses execute
      correctionsPending: 0
    };

    const files = generateFileTree(sourceDir, sourceDir);

    // Store initially
    activeProjects.set(projectId, {
      summary,
      files,
      issues: [],
      repairs: [],
      compilation: { status: "idle", stdout: "", stderr: "" }
    });

    res.json({ projectId, summary, files });

  } catch (error: any) {
    console.error("Error subiendo el ZIP:", error);
    res.status(500).json({ error: error.message || "Error procesando el archivo ZIP." });
  }
});

// API ENDPOINT: Diagnostics Execution
app.get("/api/project/:id/diagnose", (req, res) => {
  const { id } = req.params;
  const project = activeProjects.get(id);

  if (!project) {
    return res.status(404).json({ error: "Proyecto no encontrado." });
  }

  const sourceDir = path.join(WORKSPACE_DIR, id, "source");
  const issues: DiagnosticIssue[] = [];

  // Scopes for recursion limit
  let scannedCount = 0;
  const MAX_SCAN_FILES = 500;

  const runAudit = (currentDir: string) => {
    try {
      const files = fs.readdirSync(currentDir);
      for (const file of files) {
        if (scannedCount >= MAX_SCAN_FILES) break;
        if (file === "node_modules" || file === ".git" || file === "dist" || file === "build" || file === ".next") {
          continue;
        }

        const fullPath = path.join(currentDir, file);
        const relativePath = path.relative(sourceDir, fullPath);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
          runAudit(fullPath);
        } else {
          scannedCount++;
          // Core text-based audits
          const isTextFile = /\.(ts|tsx|js|jsx|json|html|css|php|env|example)$/i.test(file);
          if (isTextFile) {
            const content = fs.readFileSync(fullPath, "utf-8");
            
            // 1. Audit Localhost strings
            if (content.includes("localhost:") || content.includes("127.0.0.1:")) {
              const matchedDevPort = content.match(/localhost:(\d+)/i);
              const port = matchedDevPort ? matchedDevPort[1] : "desarrollo";
              issues.push({
                id: "issue_lh_" + Math.random().toString(36).substr(2, 9),
                file: relativePath,
                severity: "warning",
                title: `URL de Desarrollo local detectada`,
                description: `Se detectaron referencias a 'localhost:${port}' o '127.0.0.1' en el código. Las llamadas a servidores locales fallarán al subir el sitio a Hostinger.`,
                canAutoFix: true,
                codeSnippet: content.slice(Math.max(0, content.indexOf("localhost:") - 30), content.indexOf("localhost:") + 40)
              });
            }

            // 2. Audit Exposed Private API Keys
            const geminiKeyRegex = /AIzaSy[A-Za-z0-9_\-]{35}/g;
            const matchesGemini = content.match(geminiKeyRegex);
            if (matchesGemini) {
              issues.push({
                id: "issue_key_gemini_" + Math.random().toString(36).substr(2, 9),
                file: relativePath,
                severity: "error_critical",
                title: "Exposición crítica de API Key de Gemini",
                description: "Se detectó una clave privada de Google AI Studio / Gemini expuesta directamente en un archivo de frontend. Debe ser aislada y proxyficada en un script seguro para evitar robo de cuotas.",
                canAutoFix: true,
                codeSnippet: "AIzaSy..." + matchesGemini[0].substring(6, 12) + "..."
              });
            }

            // 3. Check for general exposed password secrets or stripe keys
            if (content.includes("sk_test_") || content.includes("sk_live_")) {
              issues.push({
                id: "issue_key_stripe_" + Math.random().toString(36).substr(2, 9),
                file: relativePath,
                severity: "error_critical",
                title: "Exposición crítica de API Key de Stripe",
                description: "Se detectaron claves secretas de Stripe en el código de cliente. Estas deben residir únicamente en archivos .env no empaquetados en el frontend.",
                canAutoFix: false,
                codeSnippet: "sk_test_..."
              });
            }

            // 4. Case sensitivity issues in import statements
            // We search for import statements in JS/TS/TSX/JSX files
            if (/\.(ts|tsx|js|jsx)$/i.test(file)) {
              const importLines = content.match(/(import\s+.*\s+from\s+['"](.*)['"])|(require\(['"](.*)['"]\))/g);
              if (importLines) {
                for (const line of importLines) {
                  // Extract relative path
                  const relativeImportMatch = line.match(/from\s+['"](\.\/|\.\.\/)(.*)['"]/) || line.match(/require\(['"](\.\/|\.\.\/)(.*)['"]\)/);
                  if (relativeImportMatch) {
                    const relativePathImported = relativeImportMatch[1] + relativeImportMatch[2];
                    // Strip extensions
                    const importDir = path.dirname(fullPath);
                    let targetFilePath = path.join(importDir, relativePathImported);
                    
                    // Attempt to locate file
                    let resolvedExact = false;
                    let alternatives: string[] = [];

                    // Standard extensions to match
                    const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".png", ".jpg", ".jpeg", ".svg"];
                    for (const ext of extensions) {
                      const completePath = targetFilePath + ext;
                      if (fs.existsSync(completePath)) {
                        // Check case exact match via fs.readdirSync to resolve casing
                        const dirname = path.dirname(completePath);
                        const basename = path.basename(completePath);
                        try {
                          const dirFiles = fs.readdirSync(dirname);
                          if (dirFiles.includes(basename)) {
                            resolvedExact = true;
                          } else {
                            // Find case insensitive match
                            const matchInsensitive = dirFiles.find(f => f.toLowerCase() === basename.toLowerCase());
                            if (matchInsensitive) {
                              alternatives.push(path.join(path.dirname(relativePathImported), matchInsensitive));
                            }
                          }
                        } catch {}
                      }
                    }

                    if (!resolvedExact && alternatives.length > 0) {
                      issues.push({
                        id: "issue_case_" + Math.random().toString(36).substr(2, 9),
                        file: relativePath,
                        severity: "error_fixable",
                        title: "Diferencia de Mayúsculas/Minúsculas en Importaciones (Case Sensitivity)",
                        description: `La importación '${relativePathImported}' coincide con el archivo físico '${alternatives[0]}' pero difiere en mayúsculas. Esto provocará fallos en los servidores linux de Hostinger, que son case-sensitive, mientras que en entornos de desarrollo locales suele funcionar.`,
                        canAutoFix: true,
                        codeSnippet: line
                      });
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error en autodiagnóstico:", e);
    }
  };

  runAudit(sourceDir);

  // 5. Audit Hostinger Environment Compatibility (SSR warning, packages, etc)
  if (project.summary.technology === "NextJS") {
    // Check if there is next export script. If not, inform that NextJS requires Static HTML Export for shared servers or node config
    const packageJsonPath = path.join(sourceDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        const buildScript = packageJson.scripts?.build || "";
        if (!buildScript.includes("next export") && !buildScript.includes("export")) {
          issues.push({
            id: "issue_next_ssr",
            file: "package.json",
            severity: "incompatibility",
            title: "Despliegue de Next.js SSR en Server Compartido",
            description: "Hostinger de alojamiento compartido ejecuta servidores web basados en Apache/LiteSpeed y no procesos permanentes Node.js para SSR. Sugerimos reparar el proyecto para forzar una compilación estática ('export').",
            canAutoFix: true
          });
        }
      } catch {}
    }
  }

  // 6. Check for missing .htaccess configured for React routing
  if (project.summary.technology === "React_Vite" || project.summary.technology === "Vue_Vite") {
    const htaccessPath = path.join(sourceDir, ".htaccess");
    if (!fs.existsSync(htaccessPath)) {
      issues.push({
        id: "issue_missing_htaccess",
        file: ".htaccess",
        severity: "warning",
        title: "Falta el archivo de redireccionamiento para SPA (.htaccess)",
        description: "El proyecto React/Vue tiene rutas virtuales. En Hostinger, recargar cualquier página que no sea la de inicio dará error 404 si no se configura un redireccionamiento que enrute las peticiones al index.html.",
        canAutoFix: true
      });
    }
  }

  // 7. Check if database scripts are mapped
  let containsDatabaseFiles = false;
  const findDBFiles = (p: string) => {
    try {
      const files = fs.readdirSync(p);
      for (const file of files) {
        if (file === "node_modules" || file === ".git") continue;
        const fp = path.join(p, file);
        if (fs.statSync(fp).isDirectory()) {
          findDBFiles(fp);
        } else {
          if (file.endsWith(".sql") || file.includes("db_connection") || file.includes("conexion")) {
            containsDatabaseFiles = true;
          }
        }
      }
    } catch {}
  };
  findDBFiles(sourceDir);

  if (containsDatabaseFiles) {
    issues.push({
      id: "issue_database_detect",
      file: "Acción requerida",
      severity: "info",
      title: "Base de Datos o Guiones SQL Detectados",
      description: "Hemos encontrado indicios o archivos de base de datos MySQL/SQL en tu proyecto. Recuerda que requerirás configurar credenciales de producción.",
      canAutoFix: false
    });
  }

  // Deduct compatibility score
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error_critical") score -= 30;
    else if (issue.severity === "incompatibility") score -= 25;
    else if (issue.severity === "error_fixable") score -= 15;
    else if (issue.severity === "warning") score -= 8;
  }
  project.summary.compatibilityScore = Math.max(10, score);
  project.summary.correctionsPending = issues.filter(i => i.canAutoFix).length;
  project.issues = issues;

  res.json({ issues, score: project.summary.compatibilityScore });
});

// API ENDPOINT: Auto-Repair Actions
app.post("/api/project/:id/repair", (req, res) => {
  const { id } = req.params;
  const { SelectedIssueIds } = req.body; // Array of ids to apply
  const project = activeProjects.get(id);

  if (!project) {
    return res.status(404).json({ error: "Proyecto no encontrado." });
  }

  const sourceDir = path.join(WORKSPACE_DIR, id, "source");
  const backupDir = path.join(WORKSPACE_DIR, id, "backups");
  const appliedActions: RepairAction[] = [];

  const issuesToFix = project.issues.filter(issue => 
    issue.canAutoFix && (!SelectedIssueIds || SelectedIssueIds.includes(issue.id))
  );

  for (const issue of issuesToFix) {
    try {
      const filePath = path.join(sourceDir, issue.file);
      if (!fs.existsSync(filePath) && issue.file !== ".htaccess" && issue.file !== "package.json") {
        continue;
      }

      // Safe Backup step
      if (fs.existsSync(filePath)) {
        const backupPath = path.join(backupDir, issue.file.replace(/\//g, "_"));
        fs.copyFileSync(filePath, backupPath);
      }

      let changeProposed = "";
      let applied = false;

      // Type 1: Localhost URL corrections
      if (issue.id.startsWith("issue_lh_")) {
        let content = fs.readFileSync(filePath, "utf-8");
        // Replace localhost urls with server-relative roots or general API triggers
        const regexLH = /http:\/\/localhost:\d+\/api/g;
        const regexLH2 = /http:\/\/127.0.0.1:\d+\/api/g;
        content = content.replace(regexLH, "./api").replace(regexLH2, "./api");
        // Remove individual trailing locs
        content = content.replace(/http:\/\/localhost:\d+/g, "").replace(/http:\/\/127.0.0.1:\d+/g, "");
        fs.writeFileSync(filePath, content, "utf-8");
        changeProposed = "Sustitución de direcciones 'localhost' por rutas relativas './' o endpoints limpios en producción.";
        applied = true;
      }

      // Type 2: Casing match repair (Case Sensitivity)
      else if (issue.id.startsWith("issue_case_")) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        // We look up physical files to query equivalent spelling
        const importSegments = issue.codeSnippet?.match(/(import\s+.*\s+from\s+['"](.*)['"])|(require\(['"](.*)['"]\))/);
        if (importSegments) {
          const relativePathImported = importSegments[2] || importSegments[4];
          const importDir = path.dirname(filePath);
          const targetFilePath = path.join(importDir, relativePathImported);
          const dirname = path.dirname(targetFilePath);
          const basename = path.basename(targetFilePath);

          try {
            const dirFiles = fs.readdirSync(dirname);
            const matchInsensitive = dirFiles.find(f => f.toLowerCase() === basename.toLowerCase());
            if (matchInsensitive) {
              const actualRelativePath = path.join(path.dirname(relativePathImported), matchInsensitive).replace(/\\/g, "/");
              const correctedContent = fileContent.replace(relativePathImported, actualRelativePath);
              fs.writeFileSync(filePath, correctedContent, "utf-8");
              changeProposed = `Corregido la importación: de '${relativePathImported}' a '${actualRelativePath}'`;
              applied = true;
            }
          } catch {}
        }
      }

      // Type 3: Missing .htaccess SPA generation
      else if (issue.id === "issue_missing_htaccess") {
        // We write htaccess config safely in production
        const htaccessContent = 
`<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;
        fs.writeFileSync(filePath, htaccessContent, "utf-8");
        changeProposed = "Generación de archivo .htaccess adaptado para el direccionamiento SPA de Vite/React Router.";
        applied = true;
      }

      // Type 4: Exposición de claves Gemini - Inyectar un Proxy Seguro en PHP y cambiar llamadas en JavaScript
      else if (issue.id.startsWith("issue_key_gemini_")) {
        let content = fs.readFileSync(filePath, "utf-8");
        const geminiKeyRegex = /AIzaSy[A-Za-z0-9_\-]{35}/;
        const matchesGemini = content.match(geminiKeyRegex);
        
        if (matchesGemini) {
          const rawKey = matchesGemini[0];
          
          // 1. Create a secure gemini_proxy.php at source root
          const phpProxyContent = `<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Obtener parámetros de entrada
const API_KEY = "${rawKey}";
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["error" => "Solo se permiten peticiones POST"]);
    exit;
}

$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" . $API_KEY;

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
if (curl_errno($ch)) {
    echo json_encode(["error" => curl_error($ch)]);
} else {
    echo $response;
}
curl_close($ch);
?>`;
          fs.writeFileSync(path.join(sourceDir, "gemini_proxy.php"), phpProxyContent, "utf-8");

          // 2. Modify Javascript source code: reference to generic endpoint API instead of raw target
          // Let's replace any fetch google endpoint with proxy call
          const googleEndpointUrl = "https://generativelanguage.googleapis.com/v1beta/models/";
          content = content.replace(googleEndpointUrl, "./gemini_proxy.php?model=");
          // Or general replaces
          content = content.replace(rawKey, "CLAVE_AISLADA_Y_PROTEGIDA_EN_PHP");
          fs.writeFileSync(filePath, content, "utf-8");
          
          changeProposed = "Aislado API Key Gemini. Se ha creado './gemini_proxy.php' del lado del servidor y se han redirigido las peticiones en frontend para ocultar la clave al usuario.";
          applied = true;
        }
      }

      // Type 5: NextJS static SSR bypass
      else if (issue.id === "issue_next_ssr") {
        const pkgPath = path.join(sourceDir, "package.json");
        const packageJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        
        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts.build = "next build && next export";
        
        fs.writeFileSync(pkgPath, JSON.stringify(packageJson, null, 2), "utf-8");
        changeProposed = "Inyectado el comando 'next export' en el script de compilación para generar salida estática pura.";
        applied = true;
      }

      issue.fixed = true;
      appliedActions.push({
        id: issue.id,
        file: issue.file,
        issueTitle: issue.title,
        changeProposed,
        applied
      });

    } catch (e: any) {
      console.error("Error reparando issue:", e);
      appliedActions.push({
        id: issue.id,
        file: issue.file,
        issueTitle: issue.title,
        changeProposed: "Fallo al aplicar reparación autónoma.",
        applied: false,
        error: e.message
      });
    }
  }

  project.repairs.push(...appliedActions);
  project.summary.correctionsPending = project.issues.filter(i => i.canAutoFix && !i.fixed).length;
  // Re-calculate compatibility
  let finishedScore = 100;
  for (const issue of project.issues) {
    if (issue.fixed) continue;
    if (issue.severity === "error_critical") finishedScore -= 30;
    else if (issue.severity === "incompatibility") finishedScore -= 25;
    else if (issue.severity === "error_fixable") finishedScore -= 15;
    else if (issue.severity === "warning") finishedScore -= 8;
  }
  project.summary.compatibilityScore = Math.max(30, finishedScore);

  res.json({ repaired: appliedActions, score: project.summary.compatibilityScore });
});

// API ENDPOINT: Database Connection Generation Form
app.post("/api/project/:id/configure-db", (req, res) => {
  const { id } = req.params;
  const config = req.body as DatabaseConfig;
  const project = activeProjects.get(id);

  if (!project) {
    return res.status(404).json({ error: "Proyecto no encontrado." });
  }

  const sourceDir = path.join(WORKSPACE_DIR, id, "source");

  try {
    let fileCreated = "";
    if (config.type === "PHP_PDO") {
      fileCreated = "db_connection.php";
      const pdoCode = `<?php
// Configuración de Conexión Segura de Base de Datos para Hostinger MySQL
$db_host = "${config.host}";
$db_name = "${config.database}";
$db_user = "${config.user}";
$db_pass = "${config.pass}";
$db_port = "${config.port || '3306'}";

try {
    $pdo = new PDO("mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    error_log("Fallo de conexión: " . $e->getMessage());
    die("Error de conexión a la base de datos de producción. Comuníquese con el administrador.");
}
?>`;
      fs.writeFileSync(path.join(sourceDir, fileCreated), pdoCode, "utf-8");
    } else if (config.type === "PHP_MYSQLI") {
      fileCreated = "db_connection.php";
      const mysqliCode = `<?php
// Configuración de Conexión Segura de Base de Datos para Hostinger MySQL (MySQLi)
$db_host = "${config.host}";
$db_name = "${config.database}";
$db_user = "${config.user}";
$db_pass = "${config.pass}";
$db_port = ${config.port || '3306'};

$mysqli = @new mysqli($db_host, $db_user, $db_pass, $db_name, $db_port);

if ($mysqli->connect_error) {
    error_log("Error de conexión MySQLi: " . $mysqli->connect_error);
    die("Error de base de datos.");
}
$mysqli->set_charset("utf8mb4");
?>`;
      fs.writeFileSync(path.join(sourceDir, fileCreated), mysqliCode, "utf-8");
    } else { // Generic_ENV or Node_ENV
      fileCreated = ".env.production";
      const envLines = [
        `# Variables de Producción de Base de Datos para Hostinger`,
        `DATABASE_URL="mysql://${config.user}:${config.pass}@${config.host}:${config.port || '3306'}/${config.database}"`,
        `DB_HOST="${config.host}"`,
        `DB_USER="${config.user}"`,
        `DB_PASS="${config.pass}"`,
        `DB_NAME="${config.database}"`,
        `DB_PORT="${config.port || '3306'}"`
      ];
      fs.writeFileSync(path.join(sourceDir, fileCreated), envLines.join("\n"), "utf-8");
    }

    project.dbConfig = config;
    res.json({ success: true, fileCreated });

  } catch (err: any) {
    console.error("Error inyectando BD:", err);
    res.status(500).json({ error: "Fallo al generar archivos de conexiones: " + err.message });
  }
});

// API ENDPOINT: Compilation Execution (Real NPM CLI Command Subprocesses)
app.post("/api/project/:id/compile", (req, res) => {
  const { id } = req.params;
  const { deployPath } = req.body || {};
  const project = activeProjects.get(id);

  if (!project) {
    return res.status(404).json({ error: "Proyecto no encontrado." });
  }

  const sourceDir = path.join(WORKSPACE_DIR, id, "source");

  // Prevent multiple compilation loops running simultaneously
  if (project.compilation.status === "installing" || project.compilation.status === "compiling") {
    return res.json({ status: project.compilation.status, msg: "Compilación ya en progreso..." });
  }

  // Guardar deployPath para usarlo en el empaquetado
  if (deployPath) {
    project.deployment = project.deployment || { deployType: 'root', subfolderPath: deployPath, databaseConfigured: false };
    project.deployment.subfolderPath = deployPath;
  }

  // Inyectar base path en vite.config.ts antes de compilar
  if (deployPath) {
    const viteConfigPath = path.join(sourceDir, "vite.config.ts");
    if (fs.existsSync(viteConfigPath)) {
      try {
        let viteContent = fs.readFileSync(viteConfigPath, "utf-8");
        const basePath = "/" + deployPath + "/";
        if (viteContent.includes("base:")) {
          viteContent = viteContent.replace(/base:\s*['"][^'"]*['"]/, `base: '${basePath}'`);
        } else {
          viteContent = viteContent.replace(
            /(export default defineConfig[^}]*return\s*\{)/,
            `$1\n    base: '${basePath}',`
          );
        }
        fs.writeFileSync(viteConfigPath, viteContent, "utf-8");
        project.compilation.stdout += `\n[OK] Base path inyectado en vite.config.ts: ${basePath}\n`;
      } catch (e: any) {
        console.error("Error inyectando base en vite.config.ts:", e);
      }
    }
  }

  project.compilation = { status: "installing", stdout: "Iniciando instalación de dependencias...\n", stderr: "" };

  res.json({ success: true, status: "installing" });

  // Run install asynchronously to keep server fully responsive
  const pkgMgr = project.summary.packageManager !== "none" ? project.summary.packageManager : "npm";
  
  // Set execution timeout to 5 minutes
  const cmdInstall = `${pkgMgr} install --production=false --ignore-scripts`;
  
  exec(cmdInstall, { cwd: sourceDir, timeout: 300000 }, (error, stdout, stderr) => {
    project.compilation.stdout += stdout;
    project.compilation.stderr += stderr;

    if (error) {
      console.error("Error en npm install:", error);
      project.compilation.status = "failed";
      project.compilation.errorMsg = `Fallo en el aprovisionamiento de dependencias del sistema (${pkgMgr} install). Revise los logs técnicos para más detalles.`;
      return;
    }

    // Now proceed with build command if technology has compilations needed
    if (project.summary.buildCommand) {
      project.compilation.status = "compiling";
      project.compilation.stdout += `\nInstalación finalizada con éxito. Iniciando compilación de producción (${project.summary.buildCommand})...\n`;

      exec(project.summary.buildCommand, { cwd: sourceDir, timeout: 300000 }, (buildErr, bStdout, bStderr) => {
        project.compilation.stdout += bStdout;
        project.compilation.stderr += bStderr;

        if (buildErr) {
          console.error("Error en build:", buildErr);
          project.compilation.status = "failed";
          project.compilation.errorMsg = `El proceso de compilación devolvió un código de salida diferente de cero.`;
        } else {
          project.compilation.status = "success";
          project.compilation.stdout += `\n¡PROYECTO COMPILADO CON ÉXITO PARA HOSTINGER!`;
        }
      });
    } else {
      // PHP or Static project requires no build phase
      project.compilation.status = "success";
      project.compilation.stdout += `\nProyecto estático/PHP aprobado sin requerir compilación intermedia npm.`;
    }
  });
});

// API ENDPOINT: Get compilation status / live logs
app.get("/api/project/:id/compile/status", (req, res) => {
  const { id } = req.params;
  const project = activeProjects.get(id);

  if (!project) {
    return res.status(404).json({ error: "Proyecto no encontrado." });
  }

  res.json(project.compilation);
});

// API ENDPOINT: Production ZIP Packager & SPA config routing
app.post("/api/project/:id/package", (req, res) => {
  const { id } = req.params;
  const { deployType, subfolderPath, deployPath } = req.body as { deployType: 'root' | 'subfolder', subfolderPath: string, deployPath?: string };
  const project = activeProjects.get(id);

  if (!project) {
    return res.status(404).json({ error: "Proyecto no encontrado." });
  }

  const projDir = path.join(WORKSPACE_DIR, id);
  const sourceDir = path.join(projDir, "source");

  // Detect where the compiled assets live
  let finalDistPath = sourceDir;

  if (project.summary.buildCommand) {
    // E.g. React Vite compiled in 'dist' or 'out'
    const targetOut = path.join(sourceDir, project.summary.outputFolder || "dist");
    if (fs.existsSync(targetOut)) {
      finalDistPath = targetOut;
    }
  }

  // Usar deployPath del body, o del proyecto, o derivar de deployType/subfolderPath
  const effectiveDeployPath = deployPath || project.deployment?.subfolderPath ||
    (deployType === 'subfolder' ? subfolderPath : '');

  try {
    // 1. Generate customized htaccess dynamically depending on the subfolder targeting select
    if (project.summary.technology === "React_Vite" || project.summary.technology === "Vue_Vite" || project.summary.technology === "NextJS") {
      const cleanSub = effectiveDeployPath ? "/" + effectiveDeployPath.replace(/^\/+|\/+$/g, "") : "";

      const htaccessCode =
`<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase ${cleanSub || "/"}
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . ${cleanSub || ""}/index.html [L]
</IfModule>
`;
      fs.writeFileSync(path.join(finalDistPath, ".htaccess"), htaccessCode, "utf-8");
    }

    // 2. Package prod files into standard zip
    const pZip = new AdmZip();
    
    // Check if target has files
    if (!fs.existsSync(finalDistPath)) {
      throw new Error(`La ruta de distribución no existe: ${finalDistPath}. compile el proyecto primero.`);
    }

    const addFilesRecursively = (currentPath: string, zipPrefix: string) => {
      const items = fs.readdirSync(currentPath);
      for (const item of items) {
        if (item === "node_modules" || item === ".git" || item === ".next" || item === "temp-workspaces") {
          continue;
        }
        const fullPath = path.join(currentPath, item);
        const relativeZipPath = zipPrefix ? `${zipPrefix}/${item}` : item;
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          pZip.addFile(relativeZipPath + "/", Buffer.alloc(0));
          addFilesRecursively(fullPath, relativeZipPath);
        } else {
          pZip.addLocalFile(fullPath, zipPrefix);
        }
      }
    };

    addFilesRecursively(finalDistPath, "");

    const zipDest = path.join(projDir, "hostinger-project.zip");
    pZip.writeZip(zipDest);

    project.deployment = {
      deployType,
      subfolderPath,
      databaseConfigured: !!project.dbConfig,
      databaseParams: project.dbConfig
    };

    res.json({ 
      success: true, 
      downloadUrl: `/api/project/${id}/download`,
      previewUrl: `/api/project/${id}/preview/`
    });

  } catch (error: any) {
    console.error("Error en empaquetado final:", error);
    res.status(500).json({ error: "Fallo durante la compresión del ZIP final: " + error.message });
  }
});

// API ENDPOINT: Physical download zip pipeline
app.get("/api/project/:id/download", (req, res) => {
  const { id } = req.params;
  const zipDest = path.join(WORKSPACE_DIR, id, "hostinger-project.zip");

  if (!fs.existsSync(zipDest)) {
    return res.status(404).send("Error de descarga: El compilado final todavía no se ha generado.");
  }

  res.setHeader("Content-Disposition", `attachment; filename=hostinger-proyecto-listo.zip`);
  res.setHeader("Content-Type", "application/zip");
  
  const stream = fs.createReadStream(zipDest);
  stream.pipe(res);
});

// API ENDPOINT / PREVIEW STATIC MOUNTS overlay for direct live preview
app.use("/api/project/:id/preview", (req, res, next) => {
  const { id } = req.params;
  const project = activeProjects.get(id);

  if (!project) {
    return res.status(404).send("Vista previa no encontrada para este id.");
  }

  // Get compiled folder path
  let finalDistPath = path.join(WORKSPACE_DIR, id, "source");
  
  if (project.summary.buildCommand) {
    const targetOut = path.join(finalDistPath, project.summary.outputFolder || "dist");
    if (fs.existsSync(targetOut)) {
      finalDistPath = targetOut;
    }
  }

  // If path is root preview index or specific path
  const reqUrl = req.url.split("?")[0];
  const physicalAsset = path.join(finalDistPath, reqUrl);

  if (fs.existsSync(physicalAsset) && fs.statSync(physicalAsset).isFile()) {
    return res.sendFile(physicalAsset);
  }

  // SPA fallback redirect to virtual route
  const indexHtml = path.join(finalDistPath, "index.html");
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }

  res.status(404).send("No hay ningún recurso compilado disponible. Compile primero.");
});

// VITE CLIENT INTEGRATION
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
