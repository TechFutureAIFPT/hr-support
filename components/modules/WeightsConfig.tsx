import React, { useMemo, useState } from 'react';
// FIX: Import MainCriterion to explicitly type 'criterion' and resolve 'unknown' type errors.
import type { HardFilters, WeightCriteria, MainCriterion } from '../../types';
import HardFilterPanel from '../ui/HardFilterPanel';
import WeightTile from '../ui/WeightTile';
import TotalWeightDisplay from '../ui/TotalWeightDisplay';

interface WeightsConfigProps {
  weights: WeightCriteria;
  setWeights: React.Dispatch<React.SetStateAction<WeightCriteria>>;
  hardFilters: HardFilters;
  setHardFilters: React.Dispatch<React.SetStateAction<HardFilters>>;
  onComplete: () => void;
}

const WeightsConfig: React.FC<WeightsConfigProps> = ({ weights, setWeights, hardFilters, setHardFilters, onComplete }) => {
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const totalWeight = useMemo(() => {
    // FIX: Explicitly type the accumulator 'total' as a number. The TypeScript compiler was incorrectly
    // inferring its type as 'unknown', which caused an error with the '+' operator.
    return Object.values(weights).reduce((total: number, criterion: MainCriterion) => {
      if (criterion.children) {
        return total + criterion.children.reduce((subTotal, child) => subTotal + child.weight, 0);
      }
      return total + (criterion.weight || 0);
    }, 0);
  }, [weights]);

  const handleComplete = () => {
    setValidationError(null);

    const mandatoryFieldsForValidation = [
        { key: 'location', label: 'Địa điểm' },
        { key: 'minExp', label: 'Kinh nghiệm' },
        { key: 'seniority', label: 'Cấp bậc' },
        { key: 'education', label: 'Bằng cấp' },
        { key: 'industry', label: 'Ngành nghề' },
        { key: 'language', label: 'Ngôn ngữ' },
        { key: 'certificates', label: 'Chứng chỉ' },
        { key: 'salary', label: 'Mức lương' },
        { key: 'workFormat', label: 'Hình thức' },
        { key: 'contractType', label: 'Hợp đồng' },
    ];
    
    const invalidField = mandatoryFieldsForValidation.find(field => {
        const mandatoryKey = `${field.key}Mandatory` as keyof HardFilters;
        if (!hardFilters[mandatoryKey]) return false;

        if (field.key === 'salary') {
            return !hardFilters.salaryMin && !hardFilters.salaryMax;
        }
        const valueKey = field.key as keyof HardFilters;
        return !hardFilters[valueKey];
    });

    if (invalidField) {
        setValidationError(`Vui lòng điền giá trị cho tiêu chí bắt buộc: ${invalidField.label}.`);
        return;
    }

    onComplete();
  };


  return (
    <section id="module-weights" className="module-pane active w-full">
      <div className="weights-layout">
        {/* Left Column: Hard Filters */}
        <div className="filters-col sticky top-6">
          <HardFilterPanel hardFilters={hardFilters} setHardFilters={setHardFilters} />
        </div>

        <div className="layout-divider" aria-hidden="true" />

        {/* Right Column: Weights */}
        <div className="weights-col flex flex-col">
          <div className="flex items-start justify-between px-6 pt-6 pb-3">
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-blue-500 to-cyan-400 text-transparent bg-clip-text flex items-center gap-3">
              <i className="fa-solid fa-balance-scale text-purple-400 text-2xl"></i>
              Phân bổ Trọng số Chấm điểm
            </h2>
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
              <span className={`px-3 py-1 rounded-full border text-xs tracking-wide ${totalWeight === 100 ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : 'border-red-500 text-red-400 bg-red-500/10'}`}>Tổng: {totalWeight}%</span>
            </div>
          </div>
          <div className="weights-body flex-1 px-6 pb-6 space-y-2">
            {Object.values(weights)
              .filter((c: MainCriterion) => c.children)
              .map((criterion: MainCriterion) => (
                <WeightTile
                  key={criterion.key}
                  criterion={criterion}
                  weights={weights}
                  setWeights={setWeights}
                  isExpanded={expandedCriterion === criterion.key}
                  onToggle={() =>
                    setExpandedCriterion((prev) =>
                      prev === criterion.key ? null : criterion.key
                    )
                  }
                />
              ))}
          </div>
          <div className="weights-footer mt-auto border-t border-white/10 bg-slate-900/30 px-6 py-5 rounded-b-xl flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 w-full">
              <TotalWeightDisplay totalWeight={totalWeight} />
            </div>
            <div className="toolbar w-full sm:w-auto">
              <button
                onClick={handleComplete}
                disabled={totalWeight !== 100}
                className="btn-elevate h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-blue-500/40 transition-base text-base flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700"
              >
                <span className="hidden md:inline">Hoàn thành & Tiếp tục</span>
                <i className="fa-solid fa-check" />
              </button>
            </div>
            {validationError && (
              <p className="text-red-400 text-sm w-full text-center font-medium">
                {validationError}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WeightsConfig;
