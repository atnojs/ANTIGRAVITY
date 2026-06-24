import React, { useState } from "react";
import { 
  AlertCircle, 
  AlertTriangle, 
  Wrench, 
  Info, 
  Lock, 
  Check, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { DiagnosticIssue, DiagnosticSeverity } from "../types.js";

interface DiagnosticListProps {
  issues: DiagnosticIssue[];
  selectedIssueIds: string[];
  onToggleIssue: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onManualFix: () => void;
  repairing: boolean;
}

const severityConfig: Record<DiagnosticSeverity, { 
  label: string; 
  bg: string; 
  text: string; 
  border: string; 
  icon: React.ReactNode 
}> = {
  info: {
    label: "Informativo",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/40",
    icon: <Info size={16} />
  },
  warning: {
    label: "Advertencia",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/40",
    icon: <AlertTriangle size={16} />
  },
  error_fixable: {
    label: "Error Corregible",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900/40",
    icon: <Wrench size={16} />
  },
  error_critical: {
    label: "Error Crítico",
    bg: "bg-rose-50 dark:bg-rose-950/20",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-100 dark:border-rose-900/40",
    icon: <Lock size={16} />
  },
  incompatibility: {
    label: "Incompatibilidad",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-100 dark:border-purple-900/40",
    icon: <AlertCircle size={16} />
  }
};

export const DiagnosticList: React.FC<DiagnosticListProps> = ({
  issues,
  selectedIssueIds,
  onToggleIssue,
  onSelectAll,
  onDeselectAll,
  onManualFix,
  repairing
}) => {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-neutral-150 dark:border-neutral-800 rounded-xl bg-emerald-50/10 dark:bg-emerald-950/5 text-center" id="diagnostic-no-issues">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500 mb-3 animate-pulse">
          <Check size={24} />
        </div>
        <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">¡Ningún problema crítico detectado!</h4>
        <p className="text-xs text-neutral-500 max-w-sm mt-1">
          Tu proyecto está optimizado y estructurado con altos índices de compatibilidad para servidores Hostinger.
        </p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedIssue(expandedIssue === id ? null : id);
  };

  const fixableCount = issues.filter(i => i.canAutoFix && !i.fixed).length;

  return (
    <div className="space-y-4" id="diagnostic-list-component">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          Encontrados <span className="font-semibold text-neutral-800 dark:text-neutral-200">{issues.length}</span> problemas.{" "}
          {fixableCount > 0 && (
            <span>
              (<span className="font-semibold text-emerald-600 dark:text-emerald-400">{fixableCount}</span> reparables de forma autónoma)
            </span>
          )}
        </div>
        {fixableCount > 0 && (
          <div className="flex gap-2">
            <button
              onClick={onSelectAll}
              className="text-[11px] px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              disabled={repairing}
            >
              Seleccionar Todos
            </button>
            <button
              onClick={onDeselectAll}
              className="text-[11px] px-2 py-1 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              disabled={repairing}
            >
              Deseleccionar
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
        {issues.map((issue) => {
          const cfg = severityConfig[issue.severity];
          const isSelected = selectedIssueIds.includes(issue.id);
          const isExpanded = expandedIssue === issue.id;

          return (
            <div 
              key={issue.id}
              className={`border rounded-lg transition-all duration-200 ${cfg.border} ${
                issue.fixed 
                  ? "bg-neutral-50/50 dark:bg-neutral-900/10 border-neutral-200 opacity-60" 
                  : isSelected 
                    ? "bg-neutral-50/20 dark:bg-neutral-950/5" 
                    : "bg-white dark:bg-neutral-900"
              }`}
            >
              {/* Header */}
              <div 
                className="flex items-center justify-between p-3.5 cursor-pointer gap-2"
                onClick={() => toggleExpand(issue.id)}
              >
                <div className="flex items-start gap-3 min-w-0">
                  {issue.canAutoFix && !issue.fixed ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleIssue(issue.id);
                      }}
                      className="mt-1 h-3.5 w-3.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
                      disabled={repairing}
                    />
                  ) : (
                    <div className="w-3.5 h-3.5 mt-1 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      {issue.fixed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                          <Check size={10} /> Corregido
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-neutral-400 max-w-[180px] truncate">
                        {issue.file}
                      </span>
                    </div>
                    <h5 className="font-medium text-neutral-800 dark:text-neutral-100 text-xs sm:text-sm">
                      {issue.title}
                    </h5>
                  </div>
                </div>

                <div className="text-neutral-400 shrink-0">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Collapsible details */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/10 text-xs text-neutral-600 dark:text-neutral-400 space-y-2 animate-fade-in">
                  <p>{issue.description}</p>
                  
                  {issue.codeSnippet && (
                    <div className="mt-2 p-2 bg-neutral-950 text-neutral-200 rounded font-mono text-[10px] overflow-x-auto border border-neutral-800">
                      <span className="text-neutral-500 block mb-1 select-none">// Código detectado:</span>
                      <code>{issue.codeSnippet}</code>
                    </div>
                  )}
                  
                  {issue.canAutoFix && !issue.fixed && (
                    <div className="mt-2.5 flex items-center justify-between text-[11px] p-2 bg-emerald-500/5 dark:bg-emerald-500/10 rounded border border-emerald-500/10 text-emerald-800 dark:text-emerald-400">
                      <span>Este problema será corregido automáticamente al avanzar.</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isSelected) onToggleIssue(issue.id);
                        }}
                        className="font-semibold text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        {isSelected ? "Incluido" : "Marcar para corregir"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {fixableCount > 0 && selectedIssueIds.length > 0 && (
        <button
          onClick={onManualFix}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-all duration-150 cursor-pointer shadow-md shadow-emerald-600/10"
          disabled={repairing}
        >
          {repairing ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
              Aplicando reparaciones de código reales...
            </>
          ) : (
            <>
              <Wrench size={15} />
              Reparar automáticamente los {selectedIssueIds.length} problemas seleccionados
            </>
          )}
        </button>
      )}
    </div>
  );
};
