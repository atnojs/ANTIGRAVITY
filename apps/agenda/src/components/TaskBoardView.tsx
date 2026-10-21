import React, { useState } from 'react';
import { CheckSquare, Square, Clock, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AgendaTask, PriorityLevel, TaskStatus } from '../types';
import { AudioPlayerInline } from './AudioPlayerInline';
import { apiFetch, audioUrl } from '../lib/api';

interface TaskBoardViewProps {
  tasks: AgendaTask[];
  onRefresh: () => void;
  onOpenCreateModal: () => void;
}

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({ tasks, onRefresh, onOpenCreateModal }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'urgent' | 'completed'>('pending');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('medium');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleStatus = async (task: AgendaTask) => {
    setUpdatingId(task.id);
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';

    try {
      const res = await apiFetch(`/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error updating task status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      const res = await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsAdding(true);
    try {
      const res = await apiFetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          due_date: newDueDate || null,
          priority: newPriority,
          status: 'pending',
        }),
      });
      if (res.ok) {
        setNewTitle('');
        onRefresh();
      }
    } catch (err) {
      console.error('Error adding quick task:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'urgent') return t.priority === 'urgent' && t.status !== 'completed';
    return true;
  });

  const getPriorityLabel = (p: PriorityLevel) => {
    switch (p) {
      case 'urgent':
        return { label: 'Urgente', color: 'text-red-700 bg-red-50 border-red-200' };
      case 'high':
        return { label: 'Alta', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'medium':
        return { label: 'Media', color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'low':
        return { label: 'Baja', color: 'text-slate-700 bg-slate-50 border-slate-200' };
    }
  };

  const getDueBadge = (dueDate?: string | null) => {
    if (!dueDate) return null;
    const today = new Date().toISOString().split('T')[0];
    const isPast = dueDate < today;
    const isToday = dueDate === today;

    if (isPast) {
      return <span className="text-[11px] font-mono text-red-600 font-medium flex items-center gap-1">Atrasada ({dueDate})</span>;
    }
    if (isToday) {
      return <span className="text-[11px] font-mono text-amber-600 font-medium flex items-center gap-1">Vence hoy</span>;
    }
    return <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {dueDate}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              filter === 'pending' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pendientes ({tasks.filter((t) => t.status !== 'completed').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('urgent')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              filter === 'urgent' ? 'bg-white text-red-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Urgentes ({tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              filter === 'completed' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completadas ({tasks.filter((t) => t.status === 'completed').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({tasks.length})
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Detallar Tarea</span>
        </button>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="+ Añadir tarea rápida y presionar Enter..."
          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono"
            title="Fecha límite"
          />

          <select
            aria-label="Prioridad"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
            className="text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>

          <button
            type="submit"
            disabled={isAdding || !newTitle.trim()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            Añadir
          </button>
        </div>
      </form>

      {/* Tasks List */}
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-600">No hay tareas en esta vista</p>
            <p className="text-[11px] text-slate-400 mt-1">Usa la barra superior de voz o el formulario rápido para crear una tarea.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const priorityInfo = getPriorityLabel(task.priority);

            return (
              <div
                key={task.id}
                className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isCompleted ? 'bg-slate-50/60 opacity-75' : 'hover:bg-slate-50/70'
                }`}
              >
                {/* Left check and title */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={updatingId === task.id}
                    onClick={() => handleToggleStatus(task)}
                    className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0 p-0.5"
                    title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
                  >
                    {isCompleted ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs sm:text-sm font-medium text-slate-900 leading-tight ${
                          isCompleted ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${priorityInfo.color}`}
                      >
                        {priorityInfo.label}
                      </span>
                    </div>

                    {task.notes && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {task.notes}
                      </p>
                    )}

                    {task.audio_file && (
                      <div className="mt-2">
                        <AudioPlayerInline
                          src={audioUrl(task.audio_file)}
                          duration={task.audio_duration}
                          transcription={task.audio_transcription}
                          compact
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right metadata & actions */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {getDueBadge(task.due_date)}

                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    className="text-slate-300 hover:text-red-600 p-1 rounded transition-colors"
                    title="Eliminar tarea"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
