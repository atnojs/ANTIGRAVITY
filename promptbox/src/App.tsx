/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useState } from 'react';
import { StorageProvider, useStorage } from './context/StorageContext';
import { ToastProvider, useToast } from './components/shared/Toast';
import { Sidebar } from './components/layout/Sidebar';
import { PromptCard } from './components/prompts/PromptCard';
import { PromptFormModal } from './components/prompts/PromptFormModal';
import { UsePromptModal } from './components/prompts/UsePromptModal';
import { ManageTaxonomyModal } from './components/shared/ManageTaxonomyModal';
import { BackupModal } from './components/shared/BackupModal';
import { Prompt } from './types';
import { 
  Search, 
  Grid, 
  List, 
  LayoutGrid, 
  Layers, 
  FilterX, 
  TrendingUp, 
  FolderGit2, 
  Sliders, 
  Bookmark, 
  Sparkles, 
  Bot,
  Layers2,
  CalendarDays,
  Menu,
  X,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function Dashboard() {
  const { prompts, categories, collections } = useStorage();
  const { showToast } = useToast();

  // Active filters and query terms
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setFilter] = useState<{
    type: 'all' | 'favorite' | 'trash' | 'category' | 'collection';
    value?: string;
  }>({ type: 'all' });

  // View style
  const [viewType, setViewType] = useState<'grid' | 'list' | 'compact'>('grid');
  // Order Sort
  const [sortBy, setSortBy] = useState<'newest' | 'alphabetical' | 'variables'>('newest');

  // Modal visual handlers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [promptToEdit, setPromptToEdit] = useState<Prompt | undefined>(undefined);
  const [promptToUse, setPromptToUse] = useState<Prompt | undefined>(undefined);
  const [taxonomyModalTab, setTaxonomyModalTab] = useState<'categories' | 'collections' | undefined>(undefined);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Filter & Search Engine
  const filteredPrompts = prompts
    .filter((p) => {
      // 1. Trash status matching
      if (currentFilter.type === 'trash') {
        if (!p.isTrash) return false;
      } else {
        if (p.isTrash) return false; // hide trashed items in normal views

        if (currentFilter.type === 'favorite' && !p.isFavorite) return false;
        if (currentFilter.type === 'category' && p.categoryId !== currentFilter.value) return false;
        if (currentFilter.type === 'collection' && p.collectionId !== currentFilter.value) return false;
      }

      // 2. Textual search query indexing
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const inTitle = p.title.toLowerCase().includes(query);
        const inContent = p.content.toLowerCase().includes(query);
        const inDesc = p.description?.toLowerCase().includes(query) || false;
        const inTags = p.tags.some((t) => t.toLowerCase().includes(query));
        return inTitle || inContent || inDesc || inTags;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'variables') {
        return b.variables.length - a.variables.length;
      }
      // default: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Calculate high-level analytical metrics
  const totalActivePrompts = prompts.filter((p) => !p.isTrash).length;
  const totalDynamicTemplates = prompts.filter((p) => !p.isTrash && p.variables.length > 0).length;
  const totalFavorites = prompts.filter((p) => !p.isTrash && p.isFavorite).length;
  
  // Calculate unique tags count
  const uniqueTagsList = new Set<string>();
  prompts.forEach(p => {
    if (!p.isTrash) p.tags.forEach(t => uniqueTagsList.add(t));
  });
  const totalUniqueTags = uniqueTagsList.size;

  // Filter descriptive label
  const getFilterHeading = () => {
    if (currentFilter.type === 'all') return 'Todos los Prompts';
    if (currentFilter.type === 'favorite') return 'Prompts Guardados en Favoritos';
    if (currentFilter.type === 'trash') return 'Papelera de Reciclaje';
    if (currentFilter.type === 'category') {
      const cat = categories.find((c) => c.id === currentFilter.value);
      return cat ? `Categoría: ${cat.name}` : 'Prompts';
    }
    if (currentFilter.type === 'collection') {
      const coll = collections.find((col) => col.id === currentFilter.value);
      return coll ? `Colección: ${coll.name}` : 'Prompts';
    }
    return 'Prompts de tu biblioteca';
  };

  const getFilterDescription = () => {
    if (currentFilter.type === 'all') return 'Visualiza y gestiona el repertorio completo de instrucciones.';
    if (currentFilter.type === 'favorite') return 'Acceso rápido a los prompts marcados con estrella como imprescindibles.';
    if (currentFilter.type === 'trash') return 'Elementos descartados. Puedes restaurarlos o purgarlos permanentemente.';
    if (currentFilter.type === 'category') {
      const cat = categories.find((c) => c.id === currentFilter.value);
      return cat ? `Mostrando prompts asociados con la categoría general "${cat.name}".` : 'Filtrado por categoría.';
    }
    if (currentFilter.type === 'collection') {
      const coll = collections.find((col) => col.id === currentFilter.value);
      return coll ? `Mostrando prompts agrupados bajo la colección selecta "${coll.name}".` : 'Filtrado por colección.';
    }
    return '';
  };

  return (
    <div className="flex h-screen w-screen bg-white dark:bg-slate-950 text-[#1E293B] dark:text-slate-100 overflow-hidden font-sans">
      
      {/*Collapsible Navigation Sidebar */}
      <Sidebar
        currentFilter={currentFilter}
        setFilter={setFilter}
        onCreatePrompt={() => setShowCreateModal(true)}
        onManageTaxonomy={(tab) => setTaxonomyModalTab(tab)}
        onManageBackup={() => setShowBackupModal(true)}
      />

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        
        {/* Superior Search & Dynamic Topbar Header with height 72px */}
        <header className="h-[72px] px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shrink-0">
          
          {/* Text search input within a width 400px container */}
          <div className="relative w-[400px] max-w-full">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar prompts por título, contenido, variables o #tag..."
              className="w-full pl-10 pr-8 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-450 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                title="Limpiar búsqueda"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Metrics Dashboard Badge Indicators */}
          <div className="flex items-center gap-4 text-xs font-sans overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-1.5 shrink-0 shadow-sm">
              <Bot className="w-4 h-4 text-indigo-500" />
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Activos</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{totalActivePrompts}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-1.5 shrink-0 shadow-sm">
              <Sliders className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Variables</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{totalDynamicTemplates}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-1.5 shrink-0 shadow-sm">
              <Star className="w-4 h-4 text-amber-500" />
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Favoritos</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">{totalFavorites}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border border-slate-100 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl px-3 py-1.5 shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tags</span>
                <span className="block font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">#{totalUniqueTags}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner Workspace body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          
          {/* Title of Active View Section with Filtering Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="font-display font-semibold text-xl tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
                {getFilterHeading()}
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                  {filteredPrompts.length} items
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {getFilterDescription()}
              </p>
            </div>

            {/* Layout Filters (Sort, Display mode) */}
            <div className="flex items-center gap-3 self-end md:self-center">
              {/* Order Sorting dropdown */}
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
                <span className="text-slate-400">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="font-semibold text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="newest">Más recientes</option>
                  <option value="alphabetical">Alfabético</option>
                  <option value="variables">Por n° de variables</option>
                </select>
              </div>

              {/* View switches (Grid, List, Compact) */}
              <div className="flex border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewType('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewType === 'grid'
                      ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Vista de Mosaico (Pinterest)"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('list')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewType === 'list'
                      ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Vista de Lista Detallada"
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('compact')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewType === 'compact'
                      ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Vista Compacta"
                >
                  <Layers2 size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Cards Display Grid Section */}
          <AnimatePresence mode="popLayout">
            {filteredPrompts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="py-16 text-center max-w-md mx-auto space-y-4"
              >
                <div className="p-4 bg-white dark:bg-slate-900 rounded-full w-14 h-14 mx-auto flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-md">
                  <FilterX className="w-6 h-6 text-indigo-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200">
                    No se encontraron prompts
                  </h3>
                  <p className="text-xs text-slate-450 dark:text-slate-450 leading-relaxed">
                    No hay ningún elemento que coincida con los criterios de búsqueda o filtros activos. Introduce otro término o añade un prompt nuevo para empezar.
                  </p>
                </div>
                {(searchQuery || currentFilter.type !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilter({ type: 'all' });
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl border border-indigo-150 transition-all font-sans"
                  >
                    Restablecer filtros
                  </button>
                )}
              </motion.div>
            ) : viewType === 'grid' ? (
              /* Grid Layout */
              <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5"
              >
                {filteredPrompts.map((p) => (
                  <motion.div
                    layout
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PromptCard
                      prompt={p}
                      onEdit={() => setPromptToEdit(p)}
                      onUse={() => setPromptToUse(p)}
                      viewType="grid"
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : viewType === 'list' ? (
              /* List Layout */
              <motion.div
                layout
                className="space-y-4"
              >
                {filteredPrompts.map((p) => (
                  <motion.div
                    layout
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PromptCard
                      prompt={p}
                      onEdit={() => setPromptToEdit(p)}
                      onUse={() => setPromptToUse(p)}
                      viewType="list"
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* Compact view type */
              <motion.div
                layout
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
              >
                {filteredPrompts.map((p) => (
                  <motion.div
                    layout
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <PromptCard
                      prompt={p}
                      onEdit={() => setPromptToEdit(p)}
                      onUse={() => setPromptToUse(p)}
                      viewType="compact"
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Modals System */}
      <AnimatePresence>
        {/* Create Prompt Modal */}
        {showCreateModal && (
          <PromptFormModal
            onClose={() => setShowCreateModal(false)}
          />
        )}

        {/* Edit Prompt / Version Modal */}
        {promptToEdit && (
          <PromptFormModal
            promptToEdit={promptToEdit}
            onClose={() => setPromptToEdit(undefined)}
          />
        )}

        {/* Use / Variable injection Modal */}
        {promptToUse && (
          <UsePromptModal
            prompt={promptToUse}
            onClose={() => setPromptToUse(undefined)}
          />
        )}

        {/* Taxonomy / Categories & Collections CRUD Modal */}
        {taxonomyModalTab && (
          <ManageTaxonomyModal
            defaultTab={taxonomyModalTab}
            onClose={() => setTaxonomyModalTab(undefined)}
          />
        )}

        {/* Backup serialize Modal */}
        {showBackupModal && (
          <BackupModal
            onClose={() => setShowBackupModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <StorageProvider>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </StorageProvider>
  );
}
