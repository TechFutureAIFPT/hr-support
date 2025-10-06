import React, { useMemo } from 'react';
import type { WeightCriteria } from '../../types';

interface JDRelevanceControlProps {
  weights: WeightCriteria;
  setWeights: React.Dispatch<React.SetStateAction<WeightCriteria>>;
}

const JDRelevanceControl: React.FC<JDRelevanceControlProps> = ({ weights, setWeights }) => {
  const jdCriterion = weights.positionRelevance;
  
  // FIX: Add a guard to prevent crash if criterion doesn't exist in weights.
  if (!jdCriterion) {
    return null;
  }

  const value = jdCriterion.weight || 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setWeights(prev => ({
      ...prev,
      positionRelevance: { ...prev.positionRelevance, weight: newValue }
    }));
  };

  const progressRingStyle = useMemo(() => {
    const radius = 25;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 30) * circumference;
    return {
      strokeDasharray: `${circumference} ${circumference}`,
      strokeDashoffset: offset,
    };
  }, [value]);

  const ringColorUrl = useMemo(() => {
    if (value >= 25) return "url(#jdGradientGreen)";
    if (value >= 15) return "url(#jdGradient)";
    if (value >= 5) return "url(#jdGradientYellow)";
    return "url(#jdGradientRed)";
  }, [value]);

  return (
    <div className="jd-inline flex items-center gap-4 py-2.5 px-4 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-700/60 border border-slate-600/30">
      <div className="progress-ring-container relative flex-shrink-0">
        <svg className="progress-ring" width="60" height="60" viewBox="0 0 60 60">
          <defs>
            <linearGradient id="jdGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
             <linearGradient id="jdGradientGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="jdGradientYellow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="jdGradientRed" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <circle className="progress-ring-bg" cx="30" cy="30" r="25" fill="none" stroke="#374151" strokeWidth="4"></circle>
          <circle
            className="progress-ring-progress"
            cx="30" cy="30" r="25"
            fill="none" stroke={ringColorUrl}
            strokeWidth="4" strokeLinecap="round"
            style={progressRingStyle}
          ></circle>
        </svg>
        <div className="progress-ring-text absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{value}%</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-sm font-semibold text-blue-300 flex items-center gap-2">
            <i className={`${jdCriterion.icon} ${jdCriterion.color}`}></i>
            {jdCriterion.name}
          </span>
          <span className="jd-inline-badge text-sm font-bold bg-slate-700/70 px-3 py-1 rounded-lg text-slate-200 shadow-inner border border-slate-600/50">{value}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="30"
          value={value}
          onChange={handleChange}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          aria-label={`Trọng số ${jdCriterion.name}`}
        />
      </div>
    </div>
  );
};

export default JDRelevanceControl;
