
import React, { useMemo } from 'react';

interface TotalWeightDisplayProps {
  totalWeight: number;
}

const TotalWeightDisplay: React.FC<TotalWeightDisplayProps> = ({ totalWeight }) => {
  const textColor = useMemo(() => {
    if (totalWeight === 100) return 'text-emerald-400';
    if (totalWeight > 100) return 'text-red-400';
    return 'text-yellow-400';
  }, [totalWeight]);

  return (
    <div className="flex items-center gap-3 total-weight-display">
        <div className="flex-grow total-progress-bar relative h-[3px] bg-slate-700/60 rounded-full overflow-hidden">
        <div
            style={{ width: `${Math.min(100, (totalWeight / 100) * 100)}%` }}
            className={`h-full rounded-full transition-all duration-500 ease-out ${
            totalWeight > 100 
            ? 'bg-red-500' 
            : totalWeight === 100 
            ? 'bg-gradient-to-r from-blue-500 to-emerald-500' 
            : 'bg-yellow-500'
            }`}
        ></div>
        </div>
        <span className={`text-sm font-bold flex-shrink-0 ${textColor}`}>Tổng {totalWeight}%</span>
    </div>
  );
};

export default TotalWeightDisplay;