import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, FileText, Sparkles, Check, X, Tag, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { AudioProcessResponse, EntityType, PriorityLevel } from '../types';
import { AudioPlayerInline } from './AudioPlayerInline';
import { apiFetch } from '../lib/api';

interface AudioReviewModalProps {
  data: AudioProcessResponse;
  onClose: () => void;
  onSaved: (entityType: EntityType, item: any) => void;
}

export const AudioReviewModal: React.FC<AudioReviewModalProps> = ({ data, onClose, onSaved }) => {
  const { classification, audio_id, audio_url, duration_seconds } = data;

  // Selected entity type (defaults to AI suggestion)
  const [selectedType, setSelectedType] = useState<EntityType>(classification.entity_type || 'note');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Common fields
  const [title, setTitle] = useState(classification.title || '');
  const [transcription, setTranscription] = useState(classification.transcription || '');

  // Event specific fields
  const [startTime, setStartTime] = useState<string>(() => {
    if (classification.appointment_details?.start_time) {
      return classification.appointment_details.start_time.slice(0, 16);
    }
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [endTime, setEndTime] = useState<string>(() => {
    if (classification.appointment_details?.end_time) {
      return classification.appointment_details.end_time.slice(0, 16);
    }
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const [location, setLocation] = useState(classification.appointment_details?.location || '');
  const [isAllDay, setIsAllDay] = useState(Boolean(classification.appointment_details?.is_all_day));

  // Task specific fields
  const [dueDate, setDueDate] = useState<string>(() => {
    if (classification.task_details?.due_date) return classification.task_details.due_date;
    return new Date().toISOString().split('T')[0];
  });
  const [dueTime, setDueTime] = useState<string>(classification.task_details?.due_time || '18:00');
  const [priority, setPriority] = useState<PriorityLevel>(classification.task_details?.priority || 'medium');

  // Note specific fields
  const [noteCategory, setNoteCategory] = useState<string>(classification.note_details?.category || 'general');
  const [tagsInput, setTagsInput] = useState<string>(() => {
    if (classification.note_details?.tags) {
      return classification.note_details.tags.join(', ');
    }
    return '';
  });

  const handleSave = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let endpoint = '';
      let payload: any = {};

      if (selectedType === 'appointment') {
        endpoint = '/events';
        payload = {
          title: title.trim() || 'Nueva Cita',
          description: transcription,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          location: location.trim(),
          is_all_day: isAllDay,
          audio_id: audio_id || null,
        };
      } else if (selectedType === 'task') {
        endpoint = '/tasks';
        payload = {
          title: title.trim() || 'Nueva Tarea',
          notes: transcription,
          due_date: dueDate || null,
          due_time: dueTime || null,
          priority,
          status: 'pending',
          audio_id: audio_id || null,
        };
      } else {
        endpoint = '/notes';
        const parsedTags = tagsInput
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);

        payload = {
          content: `${title.trim() ? title.trim() + '\n\n' : ''}${transcription}`,
          category: noteCategory,
          tags: parsedTags,
          is_pinned: false,
          audio_id: audio_id || null,
        };
      }

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al persistir el registro');
      }

      const created = await res.json();
      onSaved(selectedType, created);
    } catch (err: any) {
      console.error('Failed to save entity:', err);
      setSubmitError(err.message || 'Error al guardar');
      setIsSubmitting(false);
    }
  };

  const confidencePercent = Math.round((classification.confidence || 0.9) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Revisión y Clasificación de Audio</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>IA detectó: <strong>{classification.entity_type === 'appointment' ? 'Cita fija' : (classification.entity_type === 'task' ? 'Tarea' : 'Nota')}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Confianza {confidencePercent}%</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Audio Player if recording exists */}
          {audio_url && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                Audio Grabado ({duration_seconds.toFixed(1)}s)
              </label>
              <AudioPlayerInline src={audio_url} duration={duration_seconds} />
            </div>
          )}

          {/* Verbatim Transcription */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
              Transcripción de Voz
            </label>
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              rows={2}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 leading-relaxed font-sans"
              aria-label="Transcripción de la nota"
              placeholder="Transcripción de la nota..."
            />
          </div>

          {/* Entity Type Switcher (TABS) */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
              ¿Cómo deseas archivar este registro?
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedType('appointment')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                  selectedType === 'appointment'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Cita Fija</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType('task')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                  selectedType === 'task'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Tarea</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedType('note')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                  selectedType === 'note'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Nota</span>
              </button>
            </div>
          </div>

          {/* Title Field */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Título del Registro
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Título del registro"
              placeholder="Ej: Reunión con cliente, Comprar repuesto..."
            />
          </div>

          {/* Type-Specific Fields */}
          {selectedType === 'appointment' && (
            <div className="p-3.5 bg-blue-50/50 border border-blue-200/60 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span>Fecha y Hora de Inicio</span>
                  </label>
                  <input
                    type="datetime-local"
                    aria-label="Fecha y hora de inicio"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span>Fecha y Hora de Fin</span>
                  </label>
                  <input
                    type="datetime-local"
                    aria-label="Fecha y hora de fin"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  <span>Ubicación o Sala Virtual</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  aria-label="Ubicación"
                  placeholder="Ej: Sala 3B, Zoom, Google Meet..."
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDayCheck"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="allDayCheck" className="text-xs text-slate-700 cursor-pointer">
                  Evento de día completo (sin hora fija)
                </label>
              </div>
            </div>
          )}

          {selectedType === 'task' && (
            <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Fecha Límite (Due Date)
                  </label>
                  <input
                    type="date"
                    aria-label="Fecha límite"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Hora Límite
                  </label>
                  <input
                    type="time"
                    aria-label="Hora límite"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Nivel de Prioridad
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['urgent', 'high', 'medium', 'low'] as PriorityLevel[]).map((lvl) => {
                    const labels: Record<PriorityLevel, string> = {
                      urgent: 'Urgente',
                      high: 'Alta',
                      medium: 'Media',
                      low: 'Baja',
                    };
                    const isSelected = priority === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setPriority(lvl)}
                        className={`text-xs py-1.5 px-2 rounded font-medium border transition-colors ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {labels[lvl]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {selectedType === 'note' && (
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/60 rounded-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Categoría
                  </label>
                  <select
                    aria-label="Categoría"
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                  >
                    <option value="general">General</option>
                    <option value="ideas">💡 Ideas</option>
                    <option value="trabajo">💼 Trabajo</option>
                    <option value="servidor">🖥️ Servidor / Hostinger</option>
                    <option value="personal">👤 Personal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 mb-1">
                    <Tag className="w-3 h-3 text-emerald-600" />
                    <span>Etiquetas (separadas por comas)</span>
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    aria-label="Etiquetas"
                    placeholder="audio, ideas, casa"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Descartar
          </button>
          <button
            type="button"
            disabled={isSubmitting || !title.trim()}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : 'Confirmar y Guardar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
