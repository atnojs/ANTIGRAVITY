/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Prompt } from '../../types';
import { replaceVariables } from '../../utils/parser';
import { useToast } from '../shared/Toast';
import { X, Copy, Check, Sliders, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UsePromptModalProps {
  prompt: Prompt;
  onClose: () => void;
}

export function UsePromptModal({ prompt, onClose }: UsePromptModalProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  
  // Initialize values
  useEffect(() => {
    const initial: Record<string, string> = {};
    prompt.variables.forEach((variable) => {
      initial[variable] = '';
    });
    setVarValues(initial);
  }, [prompt]);

  const compiledPrompt = replaceVariables(prompt.content, varValues);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compiledPrompt);
      setCopied(true);
      showToast('¡Prompt copiado al portapapeles con variables inyectadas!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('Error al copiar al portapapeles', 'error');
    }
  };

  const hasVariables = prompt.variables.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-150">
                Inyectar Variables Dinámicas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rellena las variables detectadas para componer el prompt final
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0 h-full divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
            {/* Left Column: Form Fields */}
            <div className="md:col-span-5 p-6 space-y-5 overflow-y-auto">
              <div className="pb-2">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Especificar Valores
                </span>
                <h4 className="font-display font-medium text-slate-700 dark:text-slate-300 mt-1">
                  {prompt.title}
                </h4>
              </div>

              {!hasVariables ? (
                <div className="p-5 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 text-center space-y-3">
                  <div className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-medium text-slate-800 dark:text-slate-300 text-sm">
                      No se detectaron variables
                    </h5>
                    <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                      Este prompt es estático. Puedes copiarlo directamente del lado derecho.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {prompt.variables.map((variable) => (
                    <div key={variable} className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                        {variable.replace(/_|-/g, ' ')}
                      </label>
                      <textarea
                        rows={2}
                        value={varValues[variable] || ''}
                        onChange={(e) => setVarValues((prev) => ({ ...prev, [variable]: e.target.value }))}
                        placeholder={`Escribe el valor para colocar en ${variable}...`}
                        className="w-full text-sm px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white dark:bg-slate-950 dark:hover:bg-slate-950/80 dark:focus:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-200 resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Dynamic Live Preview */}
            <div className="md:col-span-7 p-6 flex flex-col bg-slate-50/50 dark:bg-slate-950/10 min-h-[300px]">
              <div className="flex items-center justify-between pb-3.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-500" />
                  Vista Previa Compuesta
                </span>
                
                {hasVariables && (
                  <button
                    onClick={() => {
                      const reset: Record<string, string> = {};
                      prompt.variables.forEach(v => reset[v] = '');
                      setVarValues(reset);
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700 transition-colors"
                  >
                    Limpiar valores
                  </button>
                )}
              </div>

              {/* Preview Box */}
              <div className="flex-1 min-h-[180px] p-5 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300 font-mono text-xs overflow-y-auto leading-relaxed whitespace-pre-wrap select-text relative group">
                {compiledPrompt ? (
                  compiledPrompt
                ) : (
                  <span className="text-slate-650">Componiendo prompt...</span>
                )}
                
                {/* Visual glow overlay representing highlights on altered content */}
                <div className="absolute top-3 right-3 pointer-events-none px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-500">
                  {compiledPrompt.length} chars
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-auto flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-medium text-sm rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-[2] items-center justify-center inline-flex gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-indigo-550/10 hover:shadow-indigo-550/20"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copiar Compuesto
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
