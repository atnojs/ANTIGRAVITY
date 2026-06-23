import React from "react";
import { Check } from "lucide-react";

interface WizardStepsProps {
  currentStep: number;
  steps: string[];
}

export const WizardSteps: React.FC<WizardStepsProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full" id="wizard-stepper-header">
      {/* Desktop horizontal stepper */}
      <div className="hidden md:flex items-center justify-between gap-1 border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-6">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <React.Fragment key={step}>
              <div className="flex items-center gap-2" id={`step-bubble-${index}`}>
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-200 ${
                    isCompleted 
                      ? "bg-indigo-600 text-white" 
                      : isActive 
                        ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 ring-4 ring-neutral-100 dark:ring-neutral-800" 
                        : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                  }`}
                >
                  {isCompleted ? <Check size={12} /> : index + 1}
                </div>
                <span 
                  className={`text-xs font-medium transition-colors duration-200 ${
                    isActive 
                      ? "text-neutral-900 dark:text-neutral-100 font-bold" 
                      : isCompleted 
                        ? "text-indigo-600 dark:text-indigo-400" 
                        : "text-neutral-400 dark:text-neutral-500"
                  }`}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={`h-[1px] flex-1 transition-colors duration-200 ${
                    isCompleted ? "bg-indigo-600" : "bg-neutral-200 dark:bg-neutral-800"
                  }`} 
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile responsive stepper card view */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border border-neutral-200 dark:border-neutral-800 mb-4">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
          Paso {currentStep + 1} de {steps.length}
        </span>
        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {steps[currentStep]}
        </span>
      </div>
    </div>
  );
};
