import React, { useMemo } from 'react';
import type { MainCriterion, WeightCriteria } from '../../types';

interface WeightTileProps {
  criterion: MainCriterion;
  weights: WeightCriteria;
  setWeights: React.Dispatch<React.SetStateAction<WeightCriteria>>;
  isExpanded: boolean;
  // FIX: Corrected the function type syntax from '->' to '=>'.
  onToggle: () => void;
}

const WeightTile: React.FC<WeightTileProps> = ({ criterion, setWeights, isExpanded, onToggle }) => {

  const total = useMemo(() => {
    return criterion.children?.reduce((sum, child) => sum + child.weight, 0) || 0;
  }, [criterion.children]);

  const handleSubChange = (childKey: string, newValue: number) => {
    setWeights(prev => {
      const newCriterion = { ...prev[criterion.key] };
      if (newCriterion.children) {
        newCriterion.children = newCriterion.children.map(child => 
          child.key === childKey ? { ...child, weight: newValue } : child
        );
      }
      return { ...prev, [criterion.key]: newCriterion };
    });
  };
  
  const progressColor = total > 20 ? 'bg-emerald-500' : total > 10 ? 'bg-blue-500' : 'bg-yellow-500';

  return (
    <div className="weight-tile bg-slate-800/60 border border-slate-700/80 rounded-xl shadow-md transition-all duration-300 hover:border-blue-500/50 hover:shadow-blue-500/10">
      <button 
        type="button"
        className="tile-head w-full flex flex-col p-3 text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <i className={`${criterion.icon} ${criterion.color} text-lg w-6 text-center`}></i>
              <span className="tile-title text-base font-semibold text-slate-200">{criterion.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="tile-badge text-base font-bold text-slate-100">
                {total}%
              </div>
               <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
            </div>
        </div>
    <div className="mt-2 mx-1 progress progress--thin">
      <div className={`progress__bar ${progressColor}`} style={{width: `${total}%`}}></div>
    </div>
      </button>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
        <div className="tile-rows p-4 pt-2 space-y-4 border-t border-slate-700/50">
          {criterion.children?.map(child => (
            <div key={child.key} className="tile-row grid grid-cols-10 items-center gap-4">
              <span className="row-label text-sm text-slate-400 col-span-4">{child.name}</span>
              <input
                type="range"
                min="0"
                max={Math.max(20, child.weight)} // Dynamic max for better slider control
                value={child.weight}
                onChange={(e) => handleSubChange(child.key, parseInt(e.target.value, 10))}
                className="row-range w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer col-span-4"
                style={{
                    background: `linear-gradient(to right, #2563eb ${child.weight / Math.max(20, child.weight) * 100}%, #475569 ${child.weight / Math.max(20, child.weight) * 100}%)`
                }}
              />
              <div className="col-span-2 text-right">
                <span className="row-badge text-sm font-semibold bg-slate-700/80 text-slate-200 px-3 py-1 rounded-md">{child.weight}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeightTile;
