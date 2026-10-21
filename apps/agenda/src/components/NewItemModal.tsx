import React, { useState } from 'react';
import { Calendar, CheckSquare, FileText, X, Check } from 'lucide-react';
import { EntityType, PriorityLevel } from '../types';
import { apiFetch } from '../lib/api';

interface NewItemModalProps {
  initialType?: EntityType;
  onClose: () => void;
  onSaved: () => void;
}

export const NewItemModal: React.FC<NewItemModalProps> = ({
  initialType = 'appointment',
  onClose,
  onSaved,
}) => {
  const [entityType, setEntityType] = useState<EntityType>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cita fields
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStart, setEventStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [eventEnd, setEventEnd] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [eventLocation, setEventLocation] = useState('');
  const [eventAllDay, setEventAllDay] = useState(false);

  // Tarea fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [taskDueTime, setTaskDueTime] = useState('18:00');
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('medium');

  // Nota fields
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('general');
  const [noteTags, setNoteTags] = useState('');
  const [notePinned, setNotePinned] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let endpoint = '';
      let body: any = {};

      if (entityType === 'appointment') {
        if (!eventTitle.trim()) throw new Error('El título de la cita es obligatorio');
        endpoint = '/events';
        body = {
          title: eventTitle.trim(),
          description: eventDesc.trim(),
          start_time: new Date(eventStart).toISOString(),
          end_time: new Date(eventEnd).toISOString(),
          location: eventLocation.trim(),
          is_all_day: eventAllDay,
        };
      } else if (entityType === 'task') {
        if (!taskTitle.trim()) throw new Error('El título de la tarea es obligatorio');
        endpoint = '/tasks';
        body = {
          title: taskTitle.trim(),
          notes: taskNotes.trim(),
          due_date: taskDueDate || null,
          due_time: taskDueTime || null,
          priority: taskPriority,
          status: 'pending',
        };
      } else {
        if (!noteContent.trim()) throw new Error('El contenido de la nota es obligatorio');
        endpoint = '/notes';
        const parsedTags = noteTags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        body = {
          content: noteContent.trim(),
          category: noteCategory,
          tags: parsedTags,
          is_pinned: notePinned,
        };
      }

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear elemento');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900">Crear Nuevo Registro Manual</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setEntityType('appointment')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
                entityType === 'appointment' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Cita Fija</span>
            </button>
            <button
              type="button"
              onClick={() => setEntityType('task')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
                entityType === 'task' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tarea</span>
            </button>
            <button
              type="button"
              onClick={() => setEntityType('note')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
                entityType === 'note' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Nota</span>
            </button>
          </div>

          {/* Cita Form */}
          {entityType === 'appointment' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Título de la cita *</label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  aria-label="Título de la cita"
                  placeholder="Ej: Reunión técnica, Médico..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Fecha y hora inicio</label>
                  <input
                    type="datetime-local"
                    aria-label="Fecha y hora de inicio"
                    value={eventStart}
                    onChange={(e) => setEventStart(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Fecha y hora fin</label>
                  <input
                    type="datetime-local"
                    aria-label="Fecha y hora de fin"
                    value={eventEnd}
                    onChange={(e) => setEventEnd(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Ubicación</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  aria-label="Ubicación"
                  placeholder="Lugar o sala virtual..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Descripción</label>
                <textarea
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  rows={2}
                  aria-label="Descripción"
                  placeholder="Detalles adicionales..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tarea Form */}
          {entityType === 'task' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Título de la tarea *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  aria-label="Título de la tarea"
                  placeholder="Ej: Renovar SSL, Enviar presupuesto..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Fecha límite</label>
                  <input
                    type="date"
                    aria-label="Fecha límite"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Prioridad</label>
                  <select
                    aria-label="Prioridad"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as PriorityLevel)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-md bg-white text-slate-700"
                  >
                    <option value="urgent">🔴 Urgente</option>
                    <option value="high">🟠 Alta</option>
                    <option value="medium">🔵 Media</option>
                    <option value="low">⚪ Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Notas o checklist</label>
                <textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  rows={2}
                  aria-label="Notas de la tarea"
                  placeholder="Pasos para realizarla..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Nota Form */}
          {entityType === 'note' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Contenido de la nota *</label>
                <textarea
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={4}
                  aria-label="Contenido de la nota"
                  placeholder="Escribe tus notas, ideas o comandos..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Categoría</label>
                  <select
                    aria-label="Categoría"
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-md bg-white text-slate-700"
                  >
                    <option value="general">General</option>
                    <option value="ideas">Ideas</option>
                    <option value="trabajo">Trabajo</option>
                    <option value="servidor">Servidor / Hostinger</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Etiquetas (separadas por coma)</label>
                  <input
                    type="text"
                    value={noteTags}
                    onChange={(e) => setNoteTags(e.target.value)}
                    aria-label="Etiquetas"
                    placeholder="casa, compras, ideas"
                    className="w-full text-xs p-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notePinCheck"
                  checked={notePinned}
                  onChange={(e) => setNotePinned(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="notePinCheck" className="text-xs text-slate-700 cursor-pointer">
                  Fijar esta nota al inicio
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Crear Registro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
