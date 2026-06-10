/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Prompt, Version } from '../../types';
import { useStorage } from '../../context/StorageContext';
import { useToast } from '../shared/Toast';
import { IconRenderer } from '../shared/IconRenderer';
import { enhancePromptMock } from '../../utils/parser';
import { Copy, Star, Edit3, Trash2, Sliders, Clock, Globe, Zap, ArrowLeftRight, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: () => void;
  onUse: () => void;
  viewType: 'grid' | 'list' | 'compact';
}

export function PromptCard({ prompt, onEdit, onUse, viewType }: PromptCardProps) {
  const { categories, collections, updatePrompt, deletePrompt, restorePrompt, permanentlyDeletePrompt, restoreVersion, createVersion } = useStorage();
  const { showToast } = useToast();
  
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Match category
  const category = categories.find((c) => c.id === prompt.categoryId);
  // Match collection
  const collection = collections.find((col) => col.id === prompt.collectionId);

  // Quick Direct Copy
  const handleQuickCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      showToast('¡Texto original del prompt copiado con éxito!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('No se pudo copiar el texto', 'error');
    }
  };

  // Toggle Favorite State
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updatePrompt(prompt.id, { isFavorite: !prompt.isFavorite });
    showToast(
      prompt.isFavorite ? 'Quitado de favoritos' : 'Añadido a tus favoritos',
      'info'
    );
  };

  // Enhance/Simulate Actions
  const handleAIAction = async (e: React.MouseEvent, type: 'enhance' | 'translate' | 'temperature') => {
    e.stopPropagation();
    if (isEnhancing) return;
    setIsEnhancing(true);
    showToast('Consultando Asistente IA (Función Configurada)...', 'info');
    
    try {
      let actionType: any = 'enhance';
      if (type === 'translate') actionType = 'translate';
      if (type === 'temperature') actionType = 'optimize';

      const enrichedText = await enhancePromptMock(prompt.content, actionType);
      
      // Save original as a version, and set current text to the enriched text!
      await createVersion(
        prompt.id, 
        enrichedText, 
        `Optimización IA: ${type === 'translate' ? 'Traducción' : type === 'temperature' ? 'Formato estricto' : 'Mejora estructurada'}`
      );
      
      showToast('¡Prompt optimizado y guardado como nueva versión!', 'success');
    } catch (err) {
      showToast('Error al optimizar prompt', 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Version Restore Handler
  const handleRestoreVersion = async (vId: string) => {
    await restoreVersion(prompt.id, vId);
    showToast('Hito histórico restaurado con éxito.', 'success');
    setShowHistory(false);
  };

  // Determine specific premium gradient based on category or ID as fallback
  const getGradientStyle = (): React.CSSProperties => {
    if (prompt.categoryId === 'cat-images') {
      return { backgroundImage: 'linear-gradient(135deg, #FF0066 0%, #FF6B35 50%, #FFD700 100%)' }; // Fuego solar: rosa neón → naranja → dorado
    }
    if (prompt.categoryId === 'cat-coding') {
      return { backgroundImage: 'linear-gradient(135deg, #6C3CE1 0%, #3B82F6 50%, #06B6D4 100%)' }; // Deep violeta → azul eléctrico → cian
    }
    if (prompt.categoryId === 'cat-marketing') {
      return { backgroundImage: 'linear-gradient(135deg, #E11D48 0%, #F97316 50%, #FBBF24 100%)' }; // Rojo fuego → naranja → amarillo
    }
    if (prompt.categoryId === 'cat-creative') {
      return { backgroundImage: 'linear-gradient(135deg, #059669 0%, #10B981 50%, #34D399 100%)' }; // Esmeralda intenso → verde neón → menta
    }
    return { backgroundImage: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #EC4899 100%)' }; // Azul eléctrico → púrpura → rosa intenso
  };

  const hasVariables = prompt.variables.length > 0;
  
  if (viewType === 'list') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-lg transition-all hover:border-slate-250 dark:hover:border-slate-700 relative overflow-hidden group">
        {/* Left Side: General Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            {category && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${category.color}`}>
                <IconRenderer name={category.icon} size={10} />
                {category.name}
              </span>
            )}
            {collection && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {collection.name}
              </span>
            )}
          </div>

          <div className="flex items-start gap-2.5">
            <h4 className="font-display font-semibold text-slate-900 dark:text-slate-150 text-base leading-tight">
              {prompt.title}
            </h4>
            {prompt.isFavorite && <Star className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse shrink-0 mt-1" />}
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 max-w-2xl">
            {prompt.description || 'Sin descripción adicional descriptiva.'}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {hasVariables && (
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {prompt.variables.length} var{prompt.variables.length > 1 ? 's' : ''}
              </span>
            )}
            {prompt.tags.map((tag) => (
              <span key={tag} className="text-[10px] text-slate-400 dark:text-slate-500">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right Side: Quick Action Handlers */}
        <div className="flex items-center gap-2 md:self-center shrink-0">
          {!prompt.isTrash ? (
            <>
              {hasVariables ? (
                <button
                  onClick={onUse}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-550 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  title="Inyectar variables y usar"
                >
                  <Sliders size={13} />
                  Usar
                </button>
              ) : (
                <button
                  onClick={handleQuickCopy}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              )}

              <button
                onClick={onEdit}
                className="p-2 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-850 transition-all"
                title="Editar Prompt"
              >
                <Edit3 size={14} />
              </button>

              <button
                onClick={handleToggleFavorite}
                className={`p-2 border border-slate-100 dark:border-slate-800 rounded-xl transition-all ${
                  prompt.isFavorite 
                    ? 'text-amber-500 border-amber-200/50 bg-amber-50/20 dark:bg-amber-955/10' 
                    : 'text-slate-400 hover:text-amber-500 bg-slate-50 dark:bg-slate-900'
                }`}
              >
                <Star size={14} className={prompt.isFavorite ? 'fill-current' : ''} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePrompt(prompt.id);
                  showToast('Movido a la papelera con éxito', 'info');
                }}
                className="p-2 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-705 bg-slate-50 dark:bg-slate-900 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-all"
                title="Mover a Papelera"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await restorePrompt(prompt.id);
                  showToast('Prompt restaurado con éxito', 'success');
                }}
                className="px-3.5 py-2 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-semibold text-xs rounded-xl transition-all"
              >
                Restaurar
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm('¿Estás seguro de que quieres eliminar de forma permanente este prompt? Esta acción es irreversible.')) {
                    await permanentlyDeletePrompt(prompt.id);
                    showToast('Prompt eliminado permanentemente', 'info');
                  }
                }}
                className="p-2 border border-rose-200 dark:border-rose-900 text-rose-605 bg-rose-50/20 dark:bg-rose-955/10 hover:bg-rose-50 hover:text-rose-750 rounded-xl text-xs transition-all"
                title="Eliminar permanentemente"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (viewType === 'compact') {
    return (
      <div 
        onClick={prompt.isTrash ? undefined : onUse}
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 hover:shadow-md transition-all hover:border-slate-250 dark:hover:border-slate-700 cursor-pointer flex items-center justify-between gap-3 group relative overflow-hidden"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg text-white ${category ? category.color : 'bg-slate-400'} shrink-0`}>
            {category ? <IconRenderer name={category.icon} size={14} /> : <Zap size={14} />}
          </div>
          <div className="min-w-0">
            <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-150 line-clamp-1">
              {prompt.title}
            </h5>
            {hasVariables && (
              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-mono font-bold mt-0.5 block">
                {prompt.variables.length} variables
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!prompt.isTrash ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 px-1.5 text-[10px] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 rounded-md hover:text-indigo-550 hover:bg-white transition-all"
                title="Editar"
              >
                Editar
              </button>
              <button
                onClick={handleToggleFavorite}
                className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
              >
                <Star size={13} className={prompt.isFavorite ? 'text-amber-400 fill-current' : ''} />
              </button>
            </>
          ) : (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await restorePrompt(prompt.id);
                showToast('Prompt restaurado', 'success');
              }}
              className="text-[10px] px-2 py-1 border border-emerald-350 text-emerald-600 rounded-md hover:bg-emerald-50 transition-all font-medium"
            >
              Restaurar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Premium Pinterest Grid Card
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[16px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.13)] hover:-translate-y-1 transition-all duration-300 group flex flex-col relative h-full">
      {/* Visual Image / Gradient Header */}
      <div className="h-32 relative overflow-hidden shrink-0 transition-transform duration-500">
        {prompt.imageUrl ? (
          <img
            src={prompt.imageUrl}
            alt={prompt.title}
            className="w-full h-full object-cover select-none"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : (
          <div 
            style={getGradientStyle()} 
            className="w-full h-full flex items-center justify-center transition-all"
          >
            {category ? (
              <IconRenderer name={category.icon} className="w-12 h-12 text-white/90 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500" />
            ) : (
              <Zap className="w-12 h-12 text-white/90" />
            )}
          </div>
        )}

        {/* Floating overlays */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          {category && (
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 px-2.5 py-1 rounded-full text-white shadow-xs bg-opacity-90 ${category.color}`}>
              <IconRenderer name={category.icon} size={9} />
              {category.name}
            </span>
          )}
          {collection && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 px-2.5 py-1 rounded-full bg-slate-900/60 backdrop-blur-sm text-slate-100 shadow-xs">
              {collection.name}
            </span>
          )}
        </div>

        {/* Favorite Icon Toggle */}
        {!prompt.isTrash && (
          <button
            onClick={handleToggleFavorite}
            type="button"
            className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md shadow-xs transition-all hover:scale-105 active:scale-95 ${
              prompt.isFavorite
                ? 'bg-amber-500 text-white'
                : 'bg-white/90 dark:bg-slate-950/90 text-slate-650 hover:text-amber-500 dark:text-slate-450 dark:hover:text-amber-400'
            }`}
          >
            <Star size={14} className={prompt.isFavorite ? 'fill-current' : ''} />
          </button>
        )}

        {/* Quick Variables Pill indicator */}
        {hasVariables && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-[4px] bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold font-mono select-none">
            {prompt.variables.length} VARS
          </div>
        )}
      </div>

      {/* Card Information Body */}
      <div className="p-4 flex-1 flex flex-col space-y-3 justify-between min-h-0">
        <div>
          <h4 className="font-display font-bold text-[#0F172A] dark:text-slate-150 text-base leading-snug group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors">
            {prompt.title}
          </h4>

          {prompt.description && (
            <p className="text-[13px] text-slate-700 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
              {prompt.description}
            </p>
          )}

          {/* Subtly Masked Preview of Content with clean markup */}
          <div className="mt-3 p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-700 rounded-xl max-h-[110px] overflow-hidden relative select-none">
            <span className="text-[10px] font-mono text-slate-800 dark:text-slate-200 line-clamp-4 whitespace-pre-wrap leading-relaxed select-none">
              {prompt.content}
            </span>
          </div>
        </div>

        {/* Tags, Actions */}
        <div className="space-y-4 pt-1">
          {/* Tags */}
          {prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-semibold select-none border border-indigo-100 dark:border-indigo-800/40"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Inline Action Row */}
          {!prompt.isTrash ? (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3.5">
              {/* Left quick edit & history icons */}
              <div className="flex items-center gap-1">
                {/* Edit Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-650 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                  title="Editar Prompt"
                >
                  <Edit3 size={14} />
                </button>

                {/* Direct copy */}
                <button
                  type="button"
                  onClick={handleQuickCopy}
                  className="p-2 text-[#6366F1] hover:text-indigo-750 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-bold text-[13px] hover:underline flex items-center gap-1 transition-all"
                  title="Copiar texto directo"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>

                {/* Version History Toggle */}
                {prompt.versions && prompt.versions.length > 0 && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHistory(!showHistory);
                      }}
                      className={`p-2 rounded-lg transition-all flex items-center gap-1 ${
                        showHistory 
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650' 
                          : 'text-slate-400 hover:text-[#4F46E5] hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      title="Ver Historial de Versiones"
                    >
                      <Clock size={14} />
                      <span className="text-[10px] font-semibold">{prompt.versions.length}</span>
                    </button>
                    
                    {/* Version history absolute floating dropdown */}
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute bottom-10 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-64 z-20 p-2 overflow-hidden max-h-56 overflow-y-auto"
                        >
                          <div className="px-2 py-1 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historial</span>
                            <span className="text-[9px] text-indigo-500">Haz click para restaurar</span>
                          </div>
                          {prompt.versions.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreVersion(v.id);
                              }}
                              className="w-full text-left p-2 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg transition-colors flex flex-col space-y-0.5 border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                            >
                              <div className="flex items-center justify-between select-none">
                                <span className="text-[10px] font-bold text-indigo-550 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/30 px-1 py-0.2 rounded">
                                  {v.id}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {new Date(v.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-700 dark:text-slate-350 font-medium line-clamp-1">
                                {v.note}
                              </p>
                              <p className="text-[9px] text-slate-450 truncate font-mono">
                                {v.content}
                              </p>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* AI improvement menu (Small absolute popover or trigger) */}
                <div className="relative group/ai hover:overflow-visible">
                  <button
                    type="button"
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    title="Herramientas IA (Simuladas)"
                  >
                    <Zap size={14} className={isEnhancing ? 'animate-spin text-indigo-500' : ''} />
                  </button>
                  <div className="absolute hidden group-hover/ai:block bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-950 text-white text-xs rounded-xl shadow-lg border border-slate-800 p-1.5 w-40 z-20 space-y-1">
                    <button
                      type="button"
                      onClick={(e) => handleAIAction(e, 'enhance')}
                      className="w-full text-left p-1.5 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <Zap size={11} className="text-indigo-400" /> Mejorar detallado
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleAIAction(e, 'translate')}
                      className="w-full text-left p-1.5 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <Globe size={11} className="text-emerald-400" /> Traducir a ESP
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleAIAction(e, 'temperature')}
                      className="w-full text-left p-1.5 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <ArrowLeftRight size={11} className="text-rose-450" /> Formatear CRO
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Use Button / Delete Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePrompt(prompt.id);
                    showToast('Movido a la papelera', 'info');
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl transition-all"
                  title="Mover a Papelera"
                >
                  <Trash2 size={14} />
                </button>

                <button
                  type="button"
                  onClick={onUse}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-550 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-650/10 hover:shadow-indigo-650/20 active:scale-95 flex items-center gap-1.5 shrink-0"
                >
                  <Sliders size={12} className="shrink-0" />
                  Usar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-805 pt-3.5">
              <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} />
                Papelera
              </span>
              <div className="flex gap-2">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await restorePrompt(prompt.id);
                    showToast('Prompt retirado de la papelera con éxito', 'success');
                  }}
                  className="px-3 px-3.5 py-1.5 border border-emerald-250 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-semibold text-[11px] rounded-lg transition-all"
                >
                  Restaurar
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm('¿Eliminar permanentemente este prompt de tu biblioteca?')) {
                      await permanentlyDeletePrompt(prompt.id);
                      showToast('Eliminado de forma permanente', 'info');
                    }
                  }}
                  className="p-1.5 text-rose-600 bg-rose-50 border border-rose-150 hover:bg-rose-100 rounded-lg text-xs transition-colors"
                  title="Borrar para siempre"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
