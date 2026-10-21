import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Trash2, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { AgendaEvent } from '../types';
import { AudioPlayerInline } from './AudioPlayerInline';
import { apiFetch, audioUrl } from '../lib/api';

interface CalendarViewProps {
  events: AgendaEvent[];
  onRefresh: () => void;
  onOpenCreateModal: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onRefresh, onOpenCreateModal }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - (viewMode === 'day' ? 1 : 7));
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (viewMode === 'day' ? 1 : 7));
    setSelectedDate(d);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cita del calendario?')) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter events for selected day
  const dayEvents = events.filter((e) => {
    const eDate = new Date(e.start_time).toISOString().split('T')[0];
    return eDate === selectedDateStr;
  });

  // Calculate start of week (Monday)
  const startOfWeek = new Date(selectedDate);
  const dayOfWeek = startOfWeek.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek.setDate(diff);

  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + idx);
    return d;
  });

  // Hours for time-blocking grid (08:00 to 20:00)
  const hours = Array.from({ length: 14 }).map((_, i) => i + 7);

  const formatDateTitle = (d: Date) => {
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Calendar View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-slate-300 rounded-lg bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-sm font-bold text-slate-900 capitalize">
            {formatDateTitle(selectedDate)}
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Segmented control for Day / Week */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* Week overview tabs if in week mode */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-7 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
          {weekDays.map((day) => {
            const dateStr = day.toISOString().split('T')[0];
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const count = events.filter((e) => new Date(e.start_time).toISOString().split('T')[0] === dateStr).length;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`p-2 rounded-lg text-center transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isToday
                    ? 'bg-blue-50 text-blue-900 border border-blue-200'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span className="text-[11px] font-medium block uppercase tracking-wider opacity-80">
                  {day.toLocaleDateString('es-ES', { weekday: 'narrow' })}
                </span>
                <span className="text-base font-bold block font-mono tabular-nums leading-tight">
                  {day.getDate()}
                </span>
                {count > 0 && (
                  <span
                    className={`inline-block text-[10px] px-1.5 rounded-full mt-1 ${
                      isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count} {count === 1 ? 'cita' : 'citas'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Day Time-Blocking Schedule */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Bloqueo de Tiempo Diario</span>
          <span>{dayEvents.length} {dayEvents.length === 1 ? 'cita programada' : 'citas programadas'}</span>
        </div>

        <div className="divide-y divide-slate-100">
          {hours.map((hour) => {
            const hourStr = `${hour < 10 ? '0' : ''}${hour}:00`;
            // Find events starting in this hour slot
            const slotEvents = dayEvents.filter((e) => {
              const start = new Date(e.start_time);
              return start.getHours() === hour;
            });

            return (
              <div key={hour} className="flex min-h-[60px] group hover:bg-slate-50/50 transition-colors">
                {/* Time column */}
                <div className="w-16 sm:w-20 py-3 px-3 text-right font-mono text-xs text-slate-400 font-medium select-none shrink-0 border-r border-slate-100">
                  {hourStr}
                </div>

                {/* Event Area */}
                <div className="flex-1 p-2 space-y-2">
                  {slotEvents.map((evt) => {
                    const startH = new Date(evt.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    const endH = new Date(evt.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div
                        key={evt.id}
                        className="bg-blue-50/80 border border-blue-200/90 rounded-lg p-3 text-slate-900 transition-all hover:border-blue-400 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                {evt.title}
                              </h4>
                              {evt.audio_file && (
                                <span className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                                  <Volume2 className="w-3 h-3" />
                                  <span>Audio adjunto</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                              <span className="flex items-center gap-1 font-mono tabular-nums text-blue-800 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{startH} - {endH}</span>
                              </span>
                              {evt.location && (
                                <span className="flex items-center gap-1 text-slate-500">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span>{evt.location}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={deletingId === evt.id}
                            onClick={() => handleDelete(evt.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                            title="Eliminar cita"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {evt.description && (
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            {evt.description}
                          </p>
                        )}

                        {evt.audio_file && (
                          <div className="mt-2 pt-2 border-t border-blue-200/50">
                            <AudioPlayerInline
                              src={audioUrl(evt.audio_file)}
                              duration={evt.audio_duration}
                              transcription={evt.audio_transcription}
                              compact
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
