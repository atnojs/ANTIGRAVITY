/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStorage } from '../../context/StorageContext';
import { useToast } from '../shared/Toast';
import { extractVariables } from '../../utils/parser';
import { Prompt } from '../../types';
import { X, Image as ImageIcon, Sparkles, Plus, AlertCircle, Save, History, Clipboard, FileText, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PromptFormModalProps {
  promptToEdit?: Prompt; // If provided, we are in Edit mode
  onClose: () => void;
}

export function PromptFormModal({ promptToEdit, onClose }: PromptFormModalProps) {
  const { categories, collections, createPrompt, updatePrompt, createVersion } = useStorage();
  const { showToast } = useToast();
  const isEditMode = !!promptToEdit;

  // Form Fields State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  
  // Version control
  const [isNewVersion, setIsNewVersion] = useState(false);
  const [versionNote, setVersionNote] = useState('');

  // Live variable extraction
  const [liveVariables, setLiveVariables] = useState<string[]>([]);

  // Drag and Drop State
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form if Editing
  useEffect(() => {
    if (promptToEdit) {
      setTitle(promptToEdit.title);
      setContent(promptToEdit.content);
      setDescription(promptToEdit.description || '');
      setCategoryId(promptToEdit.categoryId || '');
      setCollectionId(promptToEdit.collectionId || '');
      setTags(promptToEdit.tags || []);
      setImageUrl(promptToEdit.imageUrl || '');
      setLiveVariables(promptToEdit.variables || []);
    } else {
      // Create defaults
      setTitle('');
      setContent('');
      setDescription('');
      setCategoryId('');
      setCollectionId('');
      setTags([]);
      setImageUrl('');
      setLiveVariables([]);
    }
  }, [promptToEdit]);

  // Track live variable updates as the user types content
  useEffect(() => {
    const vars = extractVariables(content);
    setLiveVariables(vars);
  }, [content]);

  // Handle Tags Chip Input
  const handleAddTag = () => {
    const raw = tagInput.trim().replace(/#/g, '');
    if (raw && !tags.includes(raw)) {
      setTags((prev) => [...prev, raw]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setTags((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Convert files to Base64
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Por favor, selecciona solo archivos de imagen', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      showToast('Imagen cargada con éxito', 'success');
    };
    reader.onerror = () => {
      showToast('Error al procesar la imagen', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Por favor introduce un título', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('Por favor introduce el texto del prompt', 'error');
      return;
    }

    try {
      if (isEditMode && promptToEdit) {
        // If they checked "Save as new historical version"
        if (isNewVersion) {
          await createVersion(promptToEdit.id, content, versionNote || 'Nueva edición histórica');
          // Also update metadata (title, tags, category etc.)
          await updatePrompt(promptToEdit.id, {
            title: title.trim(),
            description: description.trim(),
            categoryId: categoryId || undefined,
            collectionId: collectionId || undefined,
            tags,
            imageUrl,
          });
          showToast('Prompt guardado e historial de versiones actualizado con éxito', 'success');
        } else {
          // Normal edit update (updates current content & details without generating version notes)
          await updatePrompt(promptToEdit.id, {
            title: title.trim(),
            content: content.trim(),
            description: description.trim(),
            categoryId: categoryId || undefined,
            collectionId: collectionId || undefined,
            tags,
            imageUrl,
          });
          showToast('Prompt actualizado correctamente', 'success');
        }
      } else {
        // Create brand new prompt (creates initial version automatic)
        await createPrompt({
          title: title.trim(),
          content: content.trim(),
          description: description.trim(),
          categoryId: categoryId || undefined,
          collectionId: collectionId || undefined,
          tags,
          imageUrl,
        });
        showToast('Prompt creado con éxito en tu biblioteca', 'success');
      }
      onClose();
    } catch (err: any) {
      showToast(`Error al guardar: ${err.message}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/85 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isEditMode ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-650' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650'}`}>
              {isEditMode ? <History size={20} /> : <Plus size={20} />}
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-150">
                {isEditMode ? 'Editar Prompt & Versiones' : 'Crear Nuevo Prompt'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isEditMode ? 'Modifica el contenido del prompt, añade notas o restaura hitos' : 'Escribe las instrucciones y define variables autodetectadas'}
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

        {/* Content form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-y-auto flex-1 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
            {/* Left Column: Prompts instructions & values (Big fields) */}
            <div className="md:col-span-7 p-6 space-y-5">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Contenido Principal
              </span>

              {/* Title field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Título del Prompt *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Redactor Copywriting, Generador SQL..."
                  className="w-full text-base font-display font-medium px-4 py-2.5 bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-150 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-650"
                />
              </div>

              {/* Big Textarea field */}
              <div className="space-y-1 relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Instrucciones / Texto del Prompt *
                  </label>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
                    Usa [variable], {'{variable}'} o {'{{variable}}'}
                  </span>
                </div>
                <textarea
                  required
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escribe el prompt aquí. Ejemplo: Actúa como un experto en [NICHO] para redactar un mail sobre {{PRODUCTO}}..."
                  className="w-full text-sm font-mono px-4 py-3 bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-650 resize-y min-h-[160px]"
                />
                
                {/* Live Variables indicator */}
                <div className="mt-2.5">
                  {liveVariables.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-950/50 rounded-xl">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-1">
                        Variables Detectadas:
                      </span>
                      {liveVariables.map((v) => (
                        <span
                          key={v}
                          className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/40 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <AlertCircle size={12} />
                      No se han detectado variables dinámicas en el texto.
                    </div>
                  )}
                </div>
              </div>

              {/* Snapshot Version creation details */}
              {isEditMode && (
                <div className="p-4 border border-amber-100 dark:border-amber-950/40 bg-amber-50/20 dark:bg-amber-955/10 rounded-2xl space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isNewVersion}
                      onChange={(e) => setIsNewVersion(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Guardar cambios como nueva versión histórica (Snapshot)
                    </span>
                  </label>
                  
                  <AnimatePresence>
                    {isNewVersion && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 overflow-hidden"
                      >
                        <input
                          type="text"
                          value={versionNote}
                          onChange={(e) => setVersionNote(e.target.value)}
                          placeholder="Nota sobre los cambios (Ej. Añadidos parámetros de estilo Midjourney v6)..."
                          className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-slate-300"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Right Column: Taxonomy / Meta fields (Categories, collections, images, tags) */}
            <div className="md:col-span-5 p-6 space-y-5 bg-slate-50/30 dark:bg-slate-950/5">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Metadatos e Identidad
              </span>

              {/* Description field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Breve Descripción</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Redactor enfocado en conversiones de startups..."
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-650"
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Categoría</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 transition-all"
                >
                  <option value="">-- Sin Categoría --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Collection selector */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Socio de Colección</label>
                <select
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 transition-all"
                >
                  <option value="">-- Sin Colección --</option>
                  {collections.map((coll) => (
                    <option key={coll.id} value={coll.id}>
                      {coll.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags Editor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Etiquetas (Tags)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe y presiona Enter..."
                    className="flex-1 text-xs px-3 py-2 bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all"
                  >
                    Añadir
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5 p-2 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-805/40 rounded-xl">
                    {tags.map((tag, idx) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-650 dark:text-slate-300 shadow-sm"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(idx)}
                          className="text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Premium Drag & Drop Upload Space */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Imagen Asociada (Muestra / Estética)</label>
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                      : imageUrl
                      ? 'border-indigo-400/50 bg-indigo-50/10 dark:bg-indigo-950/5'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/20 dark:hover:bg-slate-950/30'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {imageUrl ? (
                    <div className="relative group/img w-full max-h-[140px] overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full object-cover max-h-[130px] rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-xs font-bold flex items-center gap-1">
                          <Upload size={14} /> Cambiar Imagen
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageUrl('');
                        }}
                        className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-lg hover:bg-rose-600 shadow-md transform scale-90"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                      <div>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block">Arrastra tu imagen aquí</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">o haz click para buscar archivo (Base64)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2 shadow-sm"
            >
              <Save size={16} />
              {isEditMode ? 'Guardar Cambios' : 'Crear Prompt'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
