/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckSquare,
  FileText,
  Server,
  Plus,
  RefreshCw,
  Sparkles,
  Layers,
  HardDrive,
  Info,
  LogOut,
} from 'lucide-react';
import {
  AgendaEvent,
  AgendaTask,
  AgendaNote,
  SystemStats,
  AudioProcessResponse,
  EntityType,
} from './types';
import { AudioRecorderBar } from './components/AudioRecorderBar';
import { AudioReviewModal } from './components/AudioReviewModal';
import { CalendarView } from './components/CalendarView';
import { TaskBoardView } from './components/TaskBoardView';
import { NotesInboxView } from './components/NotesInboxView';
import { NewItemModal } from './components/NewItemModal';
import { HostingerGuideModal } from './components/HostingerGuideModal';
import { apiFetch, logout } from './lib/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks' | 'notes' | 'overview'>('overview');
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [tasks, setTasks] = useState<AgendaTask[]>([]);
  const [notes, setNotes] = useState<AgendaNote[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [audioResult, setAudioResult] = useState<AudioProcessResponse | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showHostingerGuide, setShowHostingerGuide] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      const [eventsRes, tasksRes, notesRes, statsRes] = await Promise.all([
        apiFetch('/events'),
        apiFetch('/tasks'),
        apiFetch('/notes'),
        apiFetch('/stats'),
      ]);

      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (notesRes.ok) setNotes(await notesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Error fetching agenda data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAudioSaved = (entityType: EntityType, item: any) => {
    setAudioResult(null);
    fetchAllData();
    const typeNames: Record<EntityType, string> = {
      appointment: 'Cita guardada en el Calendario',
      task: 'Tarea guardada en la Lista de Prioridades',
      note: 'Nota guardada en el Inbox',
    };
    showToast(`✓ ${typeNames[entityType]}`);
  };

  const handleResetData = async () => {
    if (!confirm('¿Restablecer datos a la configuración inicial de prueba?')) return;
    try {
      const res = await apiFetch('/seed/reset', { method: 'POST' });
      if (res.ok) {
        fetchAllData();
        showToast('Datos de prueba restablecidos');
      }
    } catch (err) {
      console.error('Error resetting data:', err);
    }
  };

  const formatDiskSpace = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;
  const urgentTasksCount = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Contract (1 line brand, nav tabs, primary actions) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Agenda Personal
            </span>
            <span className="hidden sm:inline-block text-slate-300">/</span>
            <span className="hidden sm:inline-block text-xs text-slate-500 font-mono">
              Servidor propio · PHP
            </span>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>General</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Citas ({events.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'tasks'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tareas ({pendingTasksCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notas ({notes.length})</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action & Hostinger Guide */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHostingerGuide(true)}
              className="px-2.5 py-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors whitespace-nowrap shrink-0 hidden md:flex items-center gap-1"
              title="Cómo funciona esta agenda"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Cómo funciona</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewModal(true)}
              aria-label="Nuevo Registro"
              title="Nuevo Registro"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo Registro</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col gap-5 w-full">
        {/* Floating / Sticky 1-Touch Voice Capture Bar */}
        <AudioRecorderBar onAudioProcessed={(res) => setAudioResult(res)} />

        {/* System telemetry & storage health bar */}
        {stats && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 py-1 px-1">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                <strong>{events.length}</strong> Citas
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                <strong>{pendingTasksCount}</strong> Pendientes
                {urgentTasksCount > 0 && (
                  <span className="text-red-600 font-semibold ml-1">({urgentTasksCount} urgentes)</span>
                )}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                <strong>{notes.length}</strong> Notas
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="flex items-center gap-1 font-mono tabular-nums text-slate-600">
                <HardDrive className="w-3 h-3 text-slate-400" />
                <span>Audios: {stats.audiosCount} ({formatDiskSpace(stats.totalAudioDiskBytes)})</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchAllData}
                className="hover:text-slate-800 flex items-center gap-1 text-[11px]"
                title="Actualizar datos"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sincronizar</span>
              </button>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => setShowHostingerGuide(true)}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium"
              >
                Cómo funciona
              </button>
            </div>
          </div>
        )}

        {/* View Switching */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Cargando agenda local...
          </div>
        ) : activeTab === 'overview' ? (
          /* Multi-column Executive Dashboard View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Calendar & Appointments (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <CalendarView
                  events={events}
                  onRefresh={fetchAllData}
                  onOpenCreateModal={() => setShowNewModal(true)}
                />
              </div>
            </div>

            {/* Right Column: Tasks and Quick Notes (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Tareas Prioritarias</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tasks')}
                    className="text-[11px] font-normal text-blue-600 hover:underline"
                  >
                    Ver todas →
                  </button>
                </h3>
                <TaskBoardView
                  tasks={tasks}
                  onRefresh={fetchAllData}
                  onOpenCreateModal={() => setShowNewModal(true)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Inbox de Notas Rápidas</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className="text-[11px] font-normal text-blue-600 hover:underline"
                  >
                    Ver todas →
                  </button>
                </h3>
                <NotesInboxView
                  notes={notes}
                  onRefresh={fetchAllData}
                  onOpenCreateModal={() => setShowNewModal(true)}
                />
              </div>
            </div>
          </div>
        ) : activeTab === 'calendar' ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-2xs">
            <CalendarView
              events={events}
              onRefresh={fetchAllData}
              onOpenCreateModal={() => setShowNewModal(true)}
            />
          </div>
        ) : activeTab === 'tasks' ? (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-2xs">
            <TaskBoardView
              tasks={tasks}
              onRefresh={fetchAllData}
              onOpenCreateModal={() => setShowNewModal(true)}
            />
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-2xs">
            <NotesInboxView
              notes={notes}
              onRefresh={fetchAllData}
              onOpenCreateModal={() => setShowNewModal(true)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span>Agenda Personal · PHP en Hostinger · Web Audio API y transcripción con OpenAI</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
              className="text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Salir</span>
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              type="button"
              onClick={handleResetData}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              Restablecer datos de prueba
            </button>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setShowHostingerGuide(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Cómo funciona este servidor
            </button>
          </div>
        </div>
      </footer>

      {/* Audio Review Modal */}
      {audioResult && (
        <AudioReviewModal
          data={audioResult}
          onClose={() => setAudioResult(null)}
          onSaved={handleAudioSaved}
        />
      )}

      {/* Manual Item Creation Modal */}
      {showNewModal && (
        <NewItemModal
          initialType="appointment"
          onClose={() => setShowNewModal(false)}
          onSaved={() => {
            fetchAllData();
            showToast('✓ Nuevo registro añadido');
          }}
        />
      )}

      {/* Hostinger Guide Modal */}
      {showHostingerGuide && (
        <HostingerGuideModal onClose={() => setShowHostingerGuide(false)} />
      )}
    </div>
  );
}
