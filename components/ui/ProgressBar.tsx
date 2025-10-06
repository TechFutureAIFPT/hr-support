import React from 'react';
import type { AppStep } from '../../types';

interface ProgressBarProps {
  activeStep: AppStep;
  completedSteps: AppStep[];
}

const ProgressBar: React.FC<ProgressBarProps> = ({ activeStep, completedSteps }) => {
  const steps = [
    { key: 'jd', label: 'JD', icon: 'fa-clipboard-list' },
    { key: 'weights', label: 'Trọng số', icon: 'fa-sliders' },
    { key: 'upload', label: 'CV', icon: 'fa-file-arrow-up' },
    { key: 'analysis', label: 'AI', icon: 'fa-rocket' },
  ];

  const getStepIndex = (step: AppStep): number => {
    return steps.findIndex(s => s.key === step);
  };

  const activeIndex = getStepIndex(activeStep);
  const progress = ((activeIndex + 1) / steps.length) * 100;

  return (
    <div className="md:hidden w-full mb-8 px-4">
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between relative mb-4">
          {/* Connecting line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-700 -z-10"></div>
          <div
            className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-700 ease-out -z-10"
            style={{ width: `${progress}%` }}
          ></div>

          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.key as AppStep);
            const isActive = activeStep === step.key;
            const isEnabled = index <= activeIndex;

            // Define vibrant colors for each step
            const stepColors = {
              jd: { 
                base: 'bg-blue-500 border-2 border-blue-400', 
                hover: 'hover:bg-blue-600 hover:border-blue-500', 
                active: 'bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-cyan-300', 
                completed: 'bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-emerald-300' 
              },
              weights: { 
                base: 'bg-purple-500 border-2 border-purple-400', 
                hover: 'hover:bg-purple-600 hover:border-purple-500', 
                active: 'bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-pink-300', 
                completed: 'bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-emerald-300' 
              },
              upload: { 
                base: 'bg-emerald-500 border-2 border-emerald-400', 
                hover: 'hover:bg-emerald-600 hover:border-emerald-500', 
                active: 'bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-teal-300', 
                completed: 'bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-emerald-300' 
              },
              analysis: { 
                base: 'bg-orange-500 border-2 border-orange-400', 
                hover: 'hover:bg-orange-600 hover:border-orange-500', 
                active: 'bg-gradient-to-br from-orange-400 to-red-500 border-2 border-red-300', 
                completed: 'bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-emerald-300' 
              },
            };

            const colors = stepColors[step.key as keyof typeof stepColors];

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 shadow-lg ${
                  isCompleted ? `${colors.completed} text-white shadow-green-500/30 scale-110` :
                  isActive ? `${colors.active} text-white shadow-blue-500/40 scale-110 animate-pulse` :
                  isEnabled ? `${colors.base} text-white shadow-slate-600/20 ${colors.hover}` :
                  'bg-slate-700 text-slate-500 shadow-slate-700/20'
                }`}>
                  <i className={`fa-solid ${step.icon} ${isActive ? 'animate-bounce' : ''}`}></i>
                </div>
                <span className={`text-xs mt-2 font-semibold transition-colors duration-300 ${
                  isActive ? 'text-blue-400' :
                  isCompleted ? 'text-green-400' :
                  'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress percentage */}
        <div className="text-center">
          <div className="text-sm font-medium text-slate-300 mb-1">
            Tiến trình: {Math.round(progress)}%
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 h-full rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;