let database;
async function db() {
  if(database) return database;
  database=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('brisa-voice',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('pending',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  return database;
}
async function storage(action,value) {
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction('pending',action==='getAll'?'readonly':'readwrite');
    const request=tx.objectStore('pending')[action](value);
    tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
export class VoiceCapture {
  constructor({onState,onSaved,onError,upload}) {Object.assign(this,{onState,onSaved,onError,upload});this.busy=false;this.recording=false;this.queue=[];this.sending=false;}
  async restore() { try{this.queue=await storage('getAll');this.notify();await this.flush();}catch{this.onError('El almacenamiento temporal no está disponible. Mantén la pestaña abierta hasta guardar el audio.');} }
  notify(extra={}) {this.onState({recording:this.recording,busy:this.busy,seconds:this.recording?Math.floor((Date.now()-this.started)/1000):0,pending:this.queue.length,...extra});}
  async start() {
    if(this.busy || this.recording)return;
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {this.onError('Este navegador no permite grabar aquí. Usa Chrome o Safari con HTTPS (o localhost).');return;}
    this.busy=true;this.notify();
    try {
      this.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true}});
      const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
      if(!mime)throw new Error('El navegador no ofrece un formato compatible. Prueba Chrome o Safari actualizado.');
      this.recorder=new MediaRecorder(this.stream,{mimeType:mime,audioBitsPerSecond:64000});
      this.parts=[];this.size=0;this.discard=false;this.started=Date.now();this.capturedAt=new Date().toISOString();
      this.recorder.ondataavailable=e=>{if(e.data.size){this.parts.push(e.data);this.size+=e.data.size;if(this.size>9*1048576)this.stop();}};
      this.recorder.onerror=()=>{this.onError('La grabación se ha interrumpido. Intentaremos guardar el audio recuperado.');this.stop();};
      this.recorder.onstop=()=>this.finish();
      this.recorder.start(1000);this.recording=true;this.busy=false;
      this.stream.getAudioTracks()[0].onended=()=>{if(this.recording){this.onError('El micrófono se ha desconectado.');this.stop();}};
      this.timer=setInterval(()=>{this.notify();if(Date.now()-this.started>=180000)this.stop();},250);this.notify();
    } catch(e) {this.stream?.getTracks().forEach(t=>t.stop());this.busy=false;this.notify();this.onError(e.name==='NotAllowedError'?'Permite el acceso al micrófono en el navegador y vuelve a pulsar Grabar.':e.message);}
  }
  stop(discard=false) {this.discard=discard;if(this.recorder?.state==='recording'){this.duration=Math.min(180000,Date.now()-this.started);this.recorder.stop();}clearInterval(this.timer);}
  async finish() {
    this.duration ||= Math.min(180000,Date.now()-this.started);
    this.recording=false;this.stream?.getTracks().forEach(t=>t.stop());this.notify();
    if(this.discard)return;
    const blob=new Blob(this.parts,{type:this.recorder.mimeType});this.parts=[];
    if(blob.size<64){this.onError('La grabación está vacía. Vuelve a intentarlo.');return;}
    const item={id:crypto.randomUUID(),blob,duration_ms:this.duration,captured_at:this.capturedAt};
    try{await storage('put',item);}catch{this.onError('No se pudo guardar una copia local. No cierres la pestaña hasta que termine la subida.');}
    this.queue.push(item);this.notify();await this.flush();
  }
  async flush() {
    if(this.sending || !this.queue.length)return;
    this.sending=true;
    try {
      for(const item of [...this.queue]) {
        await this.upload(item);
        this.queue=this.queue.filter(x=>x.id!==item.id);
        try{await storage('delete',item.id);}catch{/* server copy is already durable */}
        this.notify();await this.onSaved();
      }
    } catch(e) {this.onError('Audio pendiente de subir: '+e.message);} finally {this.sending=false;this.notify();}
  }
}
