/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { IconRenderer } from '../shared/IconRenderer';
import { 
  Plus, 
  Menu, 
  Grid, 
  Star, 
  Trash2, 
  FolderLock, 
  BookOpen, 
  SlidersHorizontal,
  FolderOpen,
  Settings,
  Database,
  Sun,
  Moon,
  Compass,
  ChevronsLeft,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  currentFilter: {
    type: 'all' | 'favorite' | 'trash' | 'category' | 'collection';
    value?: string;
  };
  setFilter: (f: { type: 'all' | 'favorite' | 'trash' | 'category' | 'collection'; value?: string }) => void;
  onCreatePrompt: () => void;
  onManageTaxonomy: (tab?: 'categories' | 'collections') => void;
  onManageBackup: () => void;
}

export function Sidebar({ currentFilter, setFilter, onCreatePrompt, onManageTaxonomy, onManageBackup }: SidebarProps) {
  const { prompts, categories, collections, theme, toggleTheme } = useStorage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Active query count helpers
  const countAll = prompts.filter((p) => !p.isTrash).length;
  const countFavorites = prompts.filter((p) => !p.isTrash && p.isFavorite).length;
  const countTrash = prompts.filter((p) => p.isTrash).length;

  const countForCategory = (catId: string) => {
    return prompts.filter((p) => !p.isTrash && p.categoryId === catId).length;
  };

  const countForCollection = (collId: string) => {
    return prompts.filter((p) => !p.isTrash && p.collectionId === collId).length;
  };

  return (
    <motion.div
      animate={{ width: isCollapsed ? 76 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col h-screen shrink-0 relative text-slate-600 dark:text-slate-400 select-none overflow-hidden"
    >
      {/* Sidebar Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-tr from-indigo-500 to-indigo-650 flex items-center justify-center text-white shadow-sm font-bold text-lg">
            P
          </div>
          {!isCollapsed && (
            <span className="font-display font-extrabold text-[#0F172A] dark:text-white text-xl tracking-tight">
              Prompt<span className="text-indigo-650 dark:text-indigo-405">Box</span>
            </span>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title={isCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      {/* Primary Action Button (Add prompt) */}
      <div className="p-4 shrink-0">
        {isCollapsed ? (
          <button
            onClick={onCreatePrompt}
            className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/10 transition-all hover:scale-105"
            title="Crear un prompt nuevo"
          >
            <Plus size={20} />
          </button>
        ) : (
          <button
            onClick={onCreatePrompt}
            className="w-full py-2.5 bg-[#4F46E5] hover:bg-indigo-705 active:bg-indigo-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            <Plus size={16} />
            Nuevo Prompt
          </button>
        )}
      </div>

      {/* Navigation list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6 scrollbar-thin">
        {/* Core items (all, favorites, trash) */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
            {!isCollapsed && 'Main'}
          </p>
          <SidebarNavButton
            icon={<Compass size={16} />}
            label="Todos los prompts"
            count={countAll}
            isActive={currentFilter.type === 'all'}
            isCollapsed={isCollapsed}
            onClick={() => setFilter({ type: 'all' })}
          />
          <SidebarNavButton
            icon={<Star size={16} />}
            label="Favoritos"
            count={countFavorites}
            isActive={currentFilter.type === 'favorite'}
            isCollapsed={isCollapsed}
            onClick={() => setFilter({ type: 'favorite' })}
          />
          <SidebarNavButton
            icon={<Trash2 size={16} />}
            label="Papelera"
            count={countTrash}
            isActive={currentFilter.type === 'trash'}
            isCollapsed={isCollapsed}
            onClick={() => setFilter({ type: 'trash' })}
          />
        </div>

        {/* Collections listing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
            {!isCollapsed && <span>Colecciones</span>}
            <button
              onClick={() => onManageTaxonomy('collections')}
              className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors rounded-sm"
              title="Gestionar Colecciones"
            >
              {!isCollapsed ? (
                <span className="text-[11px] font-semibold text-indigo-500 lowercase hover:underline">+ editar</span>
              ) : (
                <BookOpen size={12} className="mx-auto text-slate-400 hover:text-indigo-550" />
              )}
            </button>
          </div>
          
          <div className="space-y-1">
            {collections.map((coll) => (
              <SidebarNavButton
                key={coll.id}
                icon={<IconRenderer name={coll.icon || 'BookmarkOpen'} size={14} />}
                label={coll.name}
                count={countForCollection(coll.id)}
                isActive={currentFilter.type === 'collection' && currentFilter.value === coll.id}
                isCollapsed={isCollapsed}
                onClick={() => setFilter({ type: 'collection', value: coll.id })}
              />
            ))}
          </div>
        </div>

        {/* Categories listing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
            {!isCollapsed && <span>Categorías</span>}
            <button
              onClick={() => onManageTaxonomy('categories')}
              className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors rounded-sm"
              title="Gestionar Categorías"
            >
              {!isCollapsed ? (
                <span className="text-[11px] font-semibold text-indigo-505 lowercase hover:underline">+ editar</span>
              ) : (
                <Compass size={12} className="mx-auto text-slate-400 hover:text-indigo-550" />
              )}
            </button>
          </div>

          <div className="space-y-1">
            {categories.map((cat) => (
              <SidebarNavButton
                key={cat.id}
                icon={
                  <div className={`p-1 rounded text-white ${cat.color || 'bg-slate-400'} flex items-center justify-center shrink-0`}>
                    <IconRenderer name={cat.icon} size={11} />
                  </div>
                }
                label={cat.name}
                count={countForCategory(cat.id)}
                isActive={currentFilter.type === 'category' && currentFilter.value === cat.id}
                isCollapsed={isCollapsed}
                onClick={() => setFilter({ type: 'category', value: cat.id })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 space-y-2 bg-slate-50/50 dark:bg-slate-900/45">
        <div className="flex items-center gap-2">
          {/* Backup Action button */}
          {isCollapsed ? (
            <button
              onClick={onManageBackup}
              className="w-10 h-10 mx-auto rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Exportar / Importar base de datos"
            >
              <Database size={16} />
            </button>
          ) : (
            <button
              onClick={onManageBackup}
              className="flex-1 py-1.5 px-3 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:text-slate-705 dark:hover:text-white transition-all text-slate-500"
            >
              <Database size={13} />
              Respaldo
            </button>
          )}

          {/* Theme Toggler trigger */}
          {isCollapsed ? (
            <button
              onClick={toggleTheme}
              className="w-10 h-10 mx-auto rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-705"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          ) : (
            <button
              onClick={toggleTheme}
              className="py-1.5 px-3 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-755 dark:hover:text-white transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
              title="Cambiar tema de diseño"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={13} className="text-amber-500" />
                  Claro
                </>
              ) : (
                <>
                  <Moon size={13} className="text-indigo-600" />
                  Oscuro
                </>
              )}
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div className="pt-2 text-center select-none text-[9px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-850 flex items-center justify-center gap-1">
            <Info size={10} /> Local-first habilitado
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Sidebar modular navigation component
interface SidebarNavButtonProps {
  key?: React.Key;
  icon: React.ReactNode;
  label: string;
  count?: number;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

function SidebarNavButton({ icon, label, count = 0, isActive, isCollapsed, onClick }: SidebarNavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-[10px_12px] rounded-lg transition-colors font-sans text-left ${
        isActive
          ? 'bg-[#F1F5F9] dark:bg-slate-800 text-[#0F172A] dark:text-slate-100 font-semibold shadow-xs'
          : 'text-[#475569] dark:text-slate-450 hover:text-[#0F172A] dark:hover:text-slate-200 hover:bg-[#F8FAFC] dark:hover:bg-slate-850/50'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`shrink-0 ${isActive ? 'text-[#0F172A] dark:text-slate-100' : 'text-[#94A3B8]'}`}>
          {icon}
        </div>
        {!isCollapsed && (
          <span className="text-sm truncate select-none">{label}</span>
        )}
      </div>
      
      {!isCollapsed && count > 0 && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isActive 
            ? 'bg-[#E2E8F0] dark:bg-slate-700 text-[#0F172A] dark:text-slate-200' 
            : 'bg-[#F1F5F9] dark:bg-slate-800 text-[#64748B] dark:text-slate-400'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
