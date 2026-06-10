/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStorage } from '../../context/StorageContext';
import { IconRenderer, ICON_PRESETS, COLOR_PRESETS } from './IconRenderer';
import { useToast } from './Toast';
import { X, Folder, Plus, Trash2, Tag, Bookmark, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface ManageTaxonomyModalProps {
  onClose: () => void;
  defaultTab?: 'categories' | 'collections';
}

export function ManageTaxonomyModal({ onClose, defaultTab = 'categories' }: ManageTaxonomyModalProps) {
  const { categories, collections, createCategory, deleteCategory, createCollection, deleteCollection } = useStorage();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'categories' | 'collections'>(defaultTab);

  // New Category States
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState(ICON_PRESETS[0]);
  const [catColor, setCatColor] = useState(COLOR_PRESETS[0].value);

  // New Collection States
  const [collName, setCollName] = useState('');
  const [collDesc, setCollDesc] = useState('');
  const [collIcon, setCollIcon] = useState(ICON_PRESETS[0]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      showToast('Por favor introduce un nombre para la categoría', 'error');
      return;
    }
    
    try {
      await createCategory({
        name: catName.trim(),
        icon: catIcon,
        color: catColor
      });
      showToast(`Categoría "${catName}" creada con éxito`, 'success');
      setCatName('');
    } catch (err) {
      showToast('Error al crear categoría', 'error');
    }
  };

  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collName.trim()) {
      showToast('Por favor introduce un nombre para la colección', 'error');
      return;
    }

    try {
      await createCollection({
        name: collName.trim(),
        description: collDesc.trim(),
        icon: collIcon
      });
      showToast(`Colección "${collName}" creada con éxito`, 'success');
      setCollName('');
      setCollDesc('');
    } catch (err) {
      showToast('Error al crear la colección', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Folder size={18} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-150">
                Organizar Taxonomía
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Crea y elimina categorías generales o colecciones premium
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-6 pt-2">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'categories'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Tag size={15} />
            Categorías ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'collections'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Bookmark size={15} />
            Colecciones ({collections.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'categories' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Category Creation */}
              <form onSubmit={handleAddCategory} className="space-y-4">
                <h4 className="font-display font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Plus size={16} className="text-indigo-500" />
                  Nueva Categoría
                </h4>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Ej. Redes Sociales, Marketing..."
                    className="w-full text-sm px-3 py-2 bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                    Icono Representativo
                  </label>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-2 border border-slate-100 dark:border-slate-805/80 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
                    {ICON_PRESETS.map((icon) => (
                      <button
                        type="button"
                        key={icon}
                        onClick={() => setCatIcon(icon)}
                        className={`p-2 flex items-center justify-center rounded-lg border transition-all ${
                          catIcon === icon
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-805 text-indigo-600 dark:text-indigo-400 scale-105'
                            : 'border-transparent bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                      >
                        <IconRenderer name={icon} size={18} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                    Color de Fondo
                  </label>
                  <div className="flex gap-2.5 flex-wrap">
                    {COLOR_PRESETS.map((col) => (
                      <button
                        type="button"
                        key={col.value}
                        onClick={() => setCatColor(col.value)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${col.value} ${
                          catColor === col.value ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-slate-400 scale-105' : ''
                        }`}
                        title={col.label}
                      >
                        {catColor === col.value && <Sparkles size={11} />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
                >
                  Agregar Categoría
                </button>
              </form>

              {/* List Categories */}
              <div className="space-y-3">
                <h4 className="font-display font-semibold text-sm text-slate-700 dark:text-slate-300">
                  Categorías Existentes ({categories.length})
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl text-white ${cat.color || 'bg-slate-400'}`}>
                          <IconRenderer name={cat.icon} size={16} />
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {cat.name}
                        </span>
                      </div>
                      
                      {/* Only show delete if it's not a protected primary Category */}
                      <button
                        onClick={async () => {
                          if (confirm(`¿Estás seguro de eliminar la categoría "${cat.name}"? Los prompts no se borrarán, solo perderán su categoría.`)) {
                            await deleteCategory(cat.id);
                            showToast(`Categoría "${cat.name}" eliminada`, 'info');
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-all"
                        title="Eliminar Categoría"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Collection Creation */}
              <form onSubmit={handleAddCollection} className="space-y-4">
                <h4 className="font-display font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Plus size={16} className="text-indigo-500" />
                  Nueva Colección
                </h4>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nombre</label>
                  <input
                    type="text"
                    required
                    value={collName}
                    onChange={(e) => setCollName(e.target.value)}
                    placeholder="Ej. Kit ChatGPT, Midjourney v6..."
                    className="w-full text-sm px-3 py-2 bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Descripción</label>
                  <input
                    type="text"
                    value={collDesc}
                    onChange={(e) => setCollDesc(e.target.value)}
                    placeholder="Breve descripción del propósito..."
                    className="w-full text-sm px-3 py-2 bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">
                    Icono Representativo
                  </label>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-2 border border-slate-100 dark:border-slate-805/80 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
                    {ICON_PRESETS.map((icon) => (
                      <button
                        type="button"
                        key={icon}
                        onClick={() => setCollIcon(icon)}
                        className={`p-2 flex items-center justify-center rounded-lg border transition-all ${
                          collIcon === icon
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-805 text-indigo-600 dark:text-indigo-400 scale-105'
                            : 'border-transparent bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                      >
                        <IconRenderer name={icon} size={18} />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
                >
                  Agregar Colección
                </button>
              </form>

              {/* List Collections */}
              <div className="space-y-3">
                <h4 className="font-display font-semibold text-sm text-slate-700 dark:text-slate-300">
                  Colecciones Existentes ({collections.length})
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {collections.map((coll) => (
                    <div
                      key={coll.id}
                      className="flex items-start justify-between p-3 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 mr-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          <IconRenderer name={coll.icon} size={16} />
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                            {coll.name}
                          </span>
                          {coll.description && (
                            <span className="block text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                              {coll.description}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={async () => {
                          if (confirm(`¿Estás seguro de eliminar la colección "${coll.name}"? Los prompts no se borrarán.`)) {
                            await deleteCollection(coll.id);
                            showToast(`Colección "${coll.name}" eliminada`, 'info');
                          }
                        }}
                        className="p-1.5 ml-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg transition-all shrink-0"
                        title="Eliminar Colección"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 hover:bg-slate-150 active:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            Listo
          </button>
        </div>
      </motion.div>
    </div>
  );
}
