# Guía de Empaquetamiento y Distribución: Hostinger Project Compiler (.exe)

Esta guía explica las instrucciones y comandos detallados para ejecutar la aplicación localmente en modo desarrollo, compilarla y empaquetarla como una aplicación nativa de escritorio para **Windows 11 Pro** utilizando **Electron**.

---

## 1. Arquitectura de Distribución

Nuestra aplicación es full-stack de alto rendimiento. En entornos de escritorio, Electron levanta el backend local en Node.js de fondo (encontrando puertos libres automáticamente o usando el puerto `3000`) mientras el frontend en React se renderiza dentro del contenedor de renderizado nativo `BrowserWindow` de Chromium.

---

## 2. Configuración del Entorno de Desarrollo Local

Si deseas probar o extender la aplicación en tu máquina local:

### Requisitos Previos:
- **Node.js** (v18 o superior recomendado)
- **NPM** o **Yarn**

### Comandos de Inicialización:
1. Instala todas las dependencias del proyecto:
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo integrado (Express API + Vite Middleware):
   ```bash
   npm run dev
   ```
3. Abre tu navegador web en `http://localhost:3000` para probar e interactuar con la aplicación.

---

## 3. Preparación de Empaquetado de Electron

Para convertir esta aplicación web en un ejecutable de escritorio para Windows 11:

### Paso 1: Instalar Dependencias de Electron
Instala Electron y el empaquetador `electron-packer` o `electron-builder` en tu terminal:
```bash
npm install electron electron-is-dev --save-prod
npm install electron-builder --save-dev
```

### Paso 2: Crear el Archivo de Arranque Desktop (`main.js`)
Crea un archivo llamado `main.js` en la raíz del proyecto para indicarle a Electron cómo lanzar el backend Express y abrir la interfaz de usuario:

```javascript
// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

// Levantar el servidor Express local en background de forma automática
if (!isDev) {
  require('./dist/server.cjs'); // Carga nuestro servidor Express automatizado
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Hostinger Project Compiler",
    icon: path.join(__dirname, 'icon.ico'), // Icono para Windows
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Si está en desarrollo, carga el servidor de Vite; en producción carga el puerto local
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : 'http://localhost:3000'; // Express sigue sirviendo la build estática local

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

### Paso 3: Configurar `package.json` para Escritorio
Agrega el punto de entrada y los scripts de distribución de Windows en tu `package.json`:

```json
{
  "main": "main.js",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",
    "electron-dev": "electron .",
    "dist:win": "npm run build && electron-builder --windows"
  },
  "build": {
    "appId": "com.hostinger.compiler",
    "productName": "HostingerProjectCompiler",
    "files": [
      "dist/**/*",
      "main.js",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Hostinger Project Compiler"
    }
  }
}
```

---

## 4. Comandos de Construcción Executable (.exe) para Windows 11

Una vez completadas las configuraciones, puedes empaquetar tu aplicación en un único instalador autocontenido ejecutando el siguiente comando en tu Powershell o CMD de Windows:

```bash
# Paso 1: Limpiar compilaciones previas (Opcional)
npm run clean

# Paso 2: Generar compilado optimizado y empaquetar ejecutable .exe de Windows
npm run dist:win
```

### Ubicación del Ejecutable Resultante:
Tras completar la tarea, el asistente de empaquetado creará una carpeta llamada `dist_electron/` o `dist/` en tu proyecto que contiene:
- `HostingerProjectCompiler-Setup-1.0.0.exe` (Instalador listo para Windows 11 con instalación asistida, accesos directos y compatibilidad garantizada).
