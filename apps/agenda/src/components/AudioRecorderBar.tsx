import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle, Upload, MessageSquare } from 'lucide-react';
import { AudioProcessResponse } from '../types';
import { apiFetch } from '../lib/api';

interface AudioRecorderBarProps {
  onAudioProcessed: (result: AudioProcessResponse) => void;
}

export const AudioRecorderBar: React.FC<AudioRecorderBarProps> = ({ onAudioProcessed }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulatedPromptText, setSimulatedPromptText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up timers and audio contexts on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta grabación directa de audio (Web Audio API).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Setup AudioContext for visualizer feedback
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (e) {
        console.warn('AudioContext visualization not available:', e);
      }

      // Check supported MIME types for Opus WebM
      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }

        const mime = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });

        if (audioBlob.size < 500) {
          setErrorMessage('La grabación fue demasiado breve o vacía. Intenta de nuevo hablando con claridad.');
          setIsProcessing(false);
          return;
        }

        await processAudioBlob(audioBlob, recordingDuration, mime);
      };

      mediaRecorder.start(250); // Collect slices every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
        // Automatic cap at 90 seconds to prevent massive files
        if (elapsed >= 90) {
          stopRecording();
        }
      }, 500);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Permiso de micrófono denegado. Permite el acceso al micrófono en el navegador o utiliza la opción de prueba de texto/archivo.');
      } else {
        setErrorMessage(err.message || 'No se pudo acceder al micrófono del dispositivo.');
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setIsProcessing(true);
      setProcessingStatus('Guardando audio y transcribiendo...');
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  const processAudioBlob = async (blob: Blob, duration: number, mimeType: string) => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Transcribiendo y analizando intención con IA...');

      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          // Strip data:*/*;base64, prefix
          const base64Data = result.split(',')[1] || result;
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);

      const base64Audio = await base64Promise;

      const response = await apiFetch('/audio/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType,
          duration,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar el audio en el servidor');
      }

      const result: AudioProcessResponse = await response.json();
      setIsProcessing(false);
      setProcessingStatus('');
      onAudioProcessed(result);
    } catch (err: any) {
      console.error('Audio processing failed:', err);
      setErrorMessage(err.message || 'Error al transcribir o clasificar el audio.');
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessingStatus('Subiendo archivo de audio...');
    setErrorMessage(null);

    await processAudioBlob(file, 0, file.type || 'audio/webm');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSimulateTextPrompt = async (presetText?: string) => {
    const text = presetText || simulatedPromptText.trim();
    if (!text) return;

    setIsProcessing(true);
    setProcessingStatus('Analizando la nota...');
    setErrorMessage(null);
    setShowSimulateModal(false);

    try {
      const response = await apiFetch('/audio/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textInput: text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar la nota');
      }

      const result: AudioProcessResponse = await response.json();
      setIsProcessing(false);
      setSimulatedPromptText('');
      onAudioProcessed(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar texto.');
      setIsProcessing(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="relative w-full">
      {errorMessage && (
        <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-800 text-xs font-semibold px-2 py-0.5"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Main Voice Capture Console */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left info or Live recording state */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isRecording ? (
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                  Grabando Audio
                </span>
                <span className="text-lg font-mono font-bold tabular-nums text-slate-900 leading-none">
                  {formatTimer(recordingDuration)}
                </span>
              </div>
              {/* Audio level bars */}
              <div className="flex items-end gap-1 h-6 px-2 bg-slate-50 border border-slate-200 rounded">
                {[1, 2, 3, 4, 5, 6].map((bar) => {
                  const barHeight = Math.max(15, Math.min(100, audioLevel * (bar * 0.3)));
                  return (
                    <div
                      key={bar}
                      className="w-1 bg-red-500 rounded-full transition-all duration-75"
                      style={{ height: `${barHeight}%` }}
                    />
                  );
                })}
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <div>
                <span className="text-xs font-medium text-slate-900 block">
                  {processingStatus || 'Procesando...'}
                </span>
                <span className="text-[11px] text-slate-500">
                  OpenAI transcribiendo y deduciendo campos
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-900">
                  Captura de Voz con 1 Toque
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Habla con naturalidad: citas ("Mañana a las 10"), tareas ("Comprar repuesto") o notas ("Idea de proyecto").
              </p>
            </div>
          )}
        </div>

        {/* Center / Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer w-full sm:w-auto"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Finalizar y Transcribir</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isProcessing}
                onClick={startRecording}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer w-full sm:w-auto hover:shadow-md"
              >
                <Mic className="w-4 h-4" />
                <span>Pulsar para Grabar</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowSimulateModal(true)}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                title="Probar con texto o ejemplos predefinidos"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Texto / Ejemplos</span>
              </button>

              <label
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                title="Subir archivo de audio pregrabado (.webm, .mp3, .wav)"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Subir Audio</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Quick Voice / Text Simulator Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Probar Transcripción y Clasificación IA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Selecciona una frase de ejemplo o escribe una nota dictada para ver cómo la IA detecta automáticamente si es una <strong>Cita fija</strong>, una <strong>Tarea</strong> o una <strong>Nota</strong>:
            </p>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Ejemplos Rápidos de Audio:
              </span>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSimulateTextPrompt('Reunión con el cliente el jueves a las cuatro y media de la tarde para revisar el presupuesto.')}
                  className="text-left text-xs p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-slate-800"
                >
                  📅 <strong>Cita:</strong> "Reunión con el cliente el jueves a las 16:30..."
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateTextPrompt('Tengo que enviar el informe de auditoría del servidor antes del viernes por la tarde urgente.')}
                  className="text-left text-xs p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-slate-800"
                >
                  ✅ <strong>Tarea:</strong> "Tengo que enviar el informe de auditoría antes del viernes urgente..."
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateTextPrompt('Idea para optimizar el almacenamiento: revisar los audios antiguos de la carpeta data.')}
                  className="text-left text-xs p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-slate-800"
                >
                  💡 <strong>Nota:</strong> "Idea para optimizar el almacenamiento: verificar periódicamente audios..."
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                O escribe tu propio dictado:
              </label>
              <textarea
                value={simulatedPromptText}
                onChange={(e) => setSimulatedPromptText(e.target.value)}
                rows={3}
                placeholder="Ejemplo: Cita médica el lunes a las 11 en el hospital..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!simulatedPromptText.trim()}
                onClick={() => handleSimulateTextPrompt()}
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm"
              >
                Clasificar con IA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
