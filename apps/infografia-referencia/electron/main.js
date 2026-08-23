const {app,BrowserWindow,ipcMain,shell}=require('electron');
const fs=require('fs');const path=require('path');const os=require('os');
let win,watcher,lastSeen='';
const IMAGE_EXT=new Set(['.png','.jpg','.jpeg','.webp']);
const APP_URL=process.env.INFOGRAFIA_APP_URL||'https://atnojs.es/apps/infografia-referencia/';
function downloads(){return app.getPath('downloads')||path.join(os.homedir(),'Downloads')}
function newestImage(){try{return fs.readdirSync(downloads()).map(name=>path.join(downloads(),name)).filter(file=>IMAGE_EXT.has(path.extname(file).toLowerCase())).map(file=>({file,stat:fs.statSync(file)})).filter(x=>x.stat.isFile()).sort((a,b)=>b.stat.mtimeMs-a.stat.mtimeMs)[0]?.file||null}catch{return null}}
function serialize(file){if(!file||!fs.existsSync(file))return null;const ext=path.extname(file).toLowerCase(),mime=ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';return{name:path.basename(file),path:file,dataUrl:`data:${mime};base64,${fs.readFileSync(file).toString('base64')}`}}
function startWatcher(){if(watcher)return true;watcher=fs.watch(downloads(),{persistent:false},(_event,name)=>{if(!name||!IMAGE_EXT.has(path.extname(name).toLowerCase()))return;const file=path.join(downloads(),name);setTimeout(()=>{if(file===lastSeen||!fs.existsSync(file))return;lastSeen=file;win?.webContents.send('downloaded-image',serialize(file))},900)});return true}
function createWindow(){win=new BrowserWindow({width:1480,height:940,minWidth:900,minHeight:700,backgroundColor:'#001018',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});win.loadURL(APP_URL);win.webContents.setWindowOpenHandler(({url})=>{shell.openExternal(url);return{action:'deny'}});win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith(APP_URL)){e.preventDefault();shell.openExternal(url)}});startWatcher()}
ipcMain.handle('open-google',()=>shell.openExternal('https://www.google.com/search?tbm=isch&q=infograf%C3%ADa'));
ipcMain.handle('latest-download',()=>serialize(newestImage()));
ipcMain.handle('start-watcher',()=>startWatcher());
app.whenReady().then(createWindow);app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
