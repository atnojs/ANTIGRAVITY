import React, { useState } from 'react';
import { Search, Pin, PinOff, Plus, Trash2, Copy, Check, Tag, Volume2, FileText } from 'lucide-react';
import { AgendaNote } from '../types';
import { AudioPlayerInline } from './AudioPlayerInline';
import { apiFetch, audioUrl } from '../lib/api';

interface NotesInboxViewProps {
  notes: AgendaNote[];
  onRefresh: () => void;
  onOpenCreateModal: () => void;
}

export const NotesInboxView: React.FC<NotesInboxViewProps> = ({ notes, onRefresh, onOpenCreateModal }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [quickContent, setQuickContent] = useState('');
  const [quickCategory, setQuickCategory] = useState('general');
  const [isAdding, setIsAdding] = useState(false);

  const handleTogglePin = async (note: AgendaNote) => {
    try {
      const res = await apiFetch(`/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !note.is_pinned }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta nota?')) return;
    try {
      const res = await apiFetch(`/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContent.trim()) return;

    setIsAdding(true);
    try {
      const res = await apiFetch('/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: quickContent.trim(),
          category: quickCategory,
          tags: ['rápida'],
        }),
      });
      if (res.ok) {
        setQuickContent('');
        onRefresh();
      }
    } catch (err) {
      console.error('Error adding quick note:', err);
    } finally {
      setIsAdding(false);
    }
  };

  // Filter notes by search and category
  const filteredNotes = notes.filter((n) => {
    const matchesCategory = selectedCategory === 'all' || n.category === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const contentMatch = n.content.toLowerCase().includes(q);
    const audioMatch = n.audio_transcription?.toLowerCase().includes(q);
    const tagsMatch = typeof n.tags === 'string' ? n.tags.toLowerCase().includes(q) : false;
    return contentMatch || audioMatch || tagsMatch;
  });

  const categories = ['all', 'ideas', 'trabajo', 'servidor', 'personal', 'general'];

  return (
    <div className="space-y-4">
      {/* Search Bar & Categories Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en contenido, audios o etiquetas..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all capitalize whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'all' ? 'Todas' : cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Nota</span>
          </button>
        </div>
      </div>

      {/* Quick Text Volcado Form */}
      <form onSubmit={handleQuickAdd} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <textarea
          value={quickContent}
          onChange={(e) => setQuickContent(e.target.value)}
          rows={2}
          placeholder="Volcar una nota rápida o apunte aquí..."
          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Categoría:</span>
            <select
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="text-xs py-1 px-2 bg-white border border-slate-300 rounded-md text-slate-700"
            >
              <option value="general">General</option>
              <option value="ideas">💡 Ideas</option>
              <option value="trabajo">💼 Trabajo</option>
              <option value="servidor">🖥️ Servidor</option>
              <option value="personal">👤 Personal</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isAdding || !quickContent.trim()}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Guardar Nota
          </button>
        </div>
      </form>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="p-10 text-center bg-white border border-slate-200 rounded-xl">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No se encontraron notas</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {searchQuery ? 'Prueba con otros términos de búsqueda.' : 'Graba un audio o escribe una nota en el cuadro superior.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredNotes.map((note) => {
            const isPinned = Boolean(note.is_pinned);
            let parsedTags: string[] = [];
            try {
              if (note.tags) {
                parsedTags = typeof note.tags === 'string' ? JSON.parse(note.tags) : note.tags;
              }
            } catch (e) {
              parsedTags = [];
            }

            return (
              <div
                key={note.id}
                className={`bg-white border rounded-xl p-4 transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                  isPinned ? 'border-amber-300/80 bg-amber-50/20 ring-1 ring-amber-300/40' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Note meta */}
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider capitalize">
                      {note.category}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note)}
                        className={`p-1 rounded transition-colors ${
                          isPinned ? 'text-amber-600 bg-amber-100/60' : 'text-slate-300 hover:text-slate-600'
                        }`}
                        title={isPinned ? 'Desfijar de la cabecera' : 'Fijar nota en la cabecera'}
                      >
                        {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(note.id, note.content)}
                        className="text-slate-300 hover:text-slate-600 p-1 rounded transition-colors"
                        title="Copiar contenido"
                      >
                        {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="text-slate-300 hover:text-red-600 p-1 rounded transition-colors"
                        title="Eliminar nota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>

                  {/* Audio player if note was audio-recorded */}
                  {note.audio_file && (
                    <div className="mt-3">
                      <AudioPlayerInline
                        src={audioUrl(note.audio_file)}
                        duration={note.audio_duration}
                        transcription={note.audio_transcription}
                        compact
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Tags */}
                {parsedTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-slate-100">
                    {parsedTags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
