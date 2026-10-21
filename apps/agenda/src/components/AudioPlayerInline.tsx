import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerInlineProps {
  src: string;
  duration?: number | null;
  transcription?: string | null;
  compact?: boolean;
}

export const AudioPlayerInline: React.FC<AudioPlayerInlineProps> = ({
  src,
  duration: initialDuration,
  transcription,
  compact = false,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscription, setShowTranscription] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Playback prevented:', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextRate = playbackRate === 1 ? 1.5 : (playbackRate === 1.5 ? 2 : 1);
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audio.play().then(() => setIsPlaying(true));
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors w-fit">
        <audio ref={audioRef} src={src} preload="metadata" />
        <button
          type="button"
          onClick={togglePlay}
          className="text-slate-900 hover:text-blue-600 transition-colors p-0.5"
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
        <span className="font-mono tabular-nums text-[11px] text-slate-600">
          {formatSeconds(currentTime)} / {formatSeconds(totalDuration)}
        </span>
        {transcription && (
          <button
            type="button"
            onClick={() => setShowTranscription(!showTranscription)}
            className="text-[11px] text-blue-600 hover:underline ml-1"
          >
            {showTranscription ? 'Ocultar texto' : 'Ver texto'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-slate-50/70 rounded-lg p-3 my-2 text-slate-800">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0 shadow-sm"
          title={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={restart}
          className="text-slate-500 hover:text-slate-800 p-1 transition-colors"
          title="Reiniciar audio"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="relative w-full flex items-center">
            <input
              type="range"
              min={0}
              max={totalDuration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-mono tabular-nums text-slate-500">
            <span>{formatSeconds(currentTime)}</span>
            <span>{formatSeconds(totalDuration)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleSpeed}
          className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-white transition-colors shrink-0"
          title="Velocidad de reproducción"
        >
          {playbackRate}x
        </button>

        <button
          type="button"
          onClick={toggleMute}
          className="text-slate-500 hover:text-slate-800 p-1 transition-colors shrink-0"
          title={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {transcription && (
        <div className="mt-2 pt-2 border-t border-slate-200/80 text-xs text-slate-600 leading-relaxed italic">
          "{transcription}"
        </div>
      )}
    </div>
  );
};
