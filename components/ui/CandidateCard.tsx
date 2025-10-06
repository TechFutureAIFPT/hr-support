
import React, { useState, useMemo } from 'react';
import type { Candidate, DetailedScore } from '../../types';

// --- Constants for the new UI ---
const CRITERIA_ORDER = [
  'Phù hợp JD (Job Fit)',
  'Kinh nghiệm',
  'Kỹ năng',
  'Thành tựu/KPI',
  'Học vấn',
  'Ngôn ngữ',
  'Chuyên nghiệp',
  'Gắn bó & Lịch sử CV',
  'Phù hợp văn hoá',
];

const CRITERIA_META: { [key: string]: { icon: string; color: string } } = {
  'Phù hợp JD (Job Fit)': { icon: 'fa-solid fa-bullseye', color: 'text-sky-400' },
  'Kinh nghiệm': { icon: 'fa-solid fa-briefcase', color: 'text-green-400' },
  'Kỹ năng': { icon: 'fa-solid fa-gears', color: 'text-purple-400' },
  'Thành tựu/KPI': { icon: 'fa-solid fa-trophy', color: 'text-yellow-400' },
  'Học vấn': { icon: 'fa-solid fa-graduation-cap', color: 'text-indigo-400' },
  'Ngôn ngữ': { icon: 'fa-solid fa-language', color: 'text-orange-400' },
  'Chuyên nghiệp': { icon: 'fa-solid fa-file-invoice', color: 'text-cyan-400' },
  'Gắn bó & Lịch sử CV': { icon: 'fa-solid fa-hourglass-half', color: 'text-lime-400' },
  'Phù hợp văn hoá': { icon: 'fa-solid fa-users-gear', color: 'text-pink-400' },
};

// --- New Accordion Component ---
interface CriterionAccordionProps {
  item: DetailedScore;
  isExpanded: boolean;
  onToggle: () => void;
}

const CriterionAccordion: React.FC<CriterionAccordionProps> = ({ item, isExpanded, onToggle }) => {
  const [copied, setCopied] = useState(false);

  const parsedData = useMemo(() => {
    const scoreMatch = item['Điểm'].match(/(\d+)\/(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    const subscoreMatch = item['Công thức'].match(/subscore ([\d.]+)/);
    const subscore = subscoreMatch ? parseFloat(subscoreMatch[1]) : null;
    
    const weightMatch = item['Công thức'].match(/trọng số ([\d]+)%/);
    const weight = weightMatch ? parseInt(weightMatch[1], 10) : null;

    const formulaResultMatch = item['Công thức'].match(/= (.*)$/);
    const formulaResult = formulaResultMatch ? formulaResultMatch[1].trim() : '';

    return { score, subscore, weight, formulaResult };
  }, [item]);

  const getScoreColorClasses = (score: number) => {
    if (score >= 85) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (score >= 70) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(item['Dẫn chứng']);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const meta = CRITERIA_META[item['Tiêu chí']] || { icon: 'fa-solid fa-question-circle', color: 'text-slate-400' };

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/80 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-blue-600/60">
      {/* Header */}
      <button 
        className="w-full flex items-center justify-between p-4 h-[64px] text-left"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`accordion-content-${item['Tiêu chí'].replace(/\s/g, '')}`}
      >
        <div className="flex items-center gap-3">
          <i className={`${meta.icon} ${meta.color} w-5 text-center text-lg`}></i>
          <span className="font-semibold text-slate-200">{item['Tiêu chí']}</span>
        </div>
        <div className="flex items-center gap-3">
          {parsedData.subscore !== null && <span className="hidden md:inline-block text-xs font-semibold bg-slate-700/80 text-slate-300 px-2.5 py-1 rounded-full">subscore {parsedData.subscore}</span>}
          {parsedData.weight !== null && <span className="hidden md:inline-block text-xs font-semibold bg-slate-700/80 text-slate-300 px-2.5 py-1 rounded-full">{parsedData.weight}%</span>}
          <span className={`text-base font-bold px-3 py-1.5 rounded-lg text-white ${getScoreColorClasses(parsedData.score).replace(/text-\w+-\d+/, '').replace('border-transparent', '')}`}>
            {parsedData.score}<span className="text-xs text-slate-400">/100</span>
          </span>
          <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div id={`accordion-content-${item['Tiêu chí'].replace(/\s/g, '')}`} className="px-4 pb-4 pt-2 border-t border-slate-700/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Evidence */}
            <div className="bg-slate-900/70 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-sm font-semibold text-slate-300">Dẫn chứng (trích từ CV)</h5>
                <button onClick={handleCopy} className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                  {copied ? 'Đã chép' : 'Chép'}
                </button>
              </div>
              <blockquote className="text-sm text-slate-400 italic border-l-2 border-blue-500 pl-3 leading-relaxed">
                {item['Dẫn chứng'] === "Không tìm thấy thông tin trong CV" 
                  ? <span className="not-italic bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-md text-xs font-semibold">Chưa tìm thấy trong CV</span>
                  : item['Dẫn chứng']}
              </blockquote>
            </div>
            {/* Right: Explanation */}
            <div className="bg-slate-900/70 p-3 rounded-lg">
              <h5 className="text-sm font-semibold text-slate-300 mb-2">Giải thích & Công thức</h5>
              <p className="text-sm text-slate-400 leading-relaxed mb-2">{item['Giải thích']}</p>
              <p className="font-mono text-xs bg-slate-800 text-slate-400 p-2 rounded-md">
                <span className="text-cyan-400">subscore {parsedData.subscore ?? 'N/A'}</span> × 
                <span className="text-purple-400"> trọng số {parsedData.weight ?? 'N/A'}%</span> = 
                <span className="text-yellow-400"> {parsedData.formulaResult || 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- Main Candidate Card Component (Modified) ---
interface CandidateCardProps {
  candidate: Candidate;
  rank: number;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, rank }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});

  const { candidateName, phone, email, fileName, jobTitle, status, error, experienceLevel, hardFilterFailureReason, softFilterWarnings, analysis } = candidate;

  const failed = status === 'FAILED';
  const grade = analysis?.["Hạng"] || 'C';
  const overallScore = analysis?.["Tổng điểm"] || 0;
  const strengths = analysis?.['Điểm mạnh CV'];
  const weaknesses = analysis?.['Điểm yếu CV'];

  const gradeColor = failed ? 'bg-slate-600' : (grade === 'A' ? 'bg-emerald-600' : grade === 'B' ? 'bg-blue-600' : 'bg-red-600');
  const gradeTextColor = failed ? 'text-slate-400' : (grade === 'A' ? 'text-emerald-400' : grade === 'B' ? 'text-blue-400' : 'text-red-400');
  
  const jdFitScoreItem = useMemo(() => analysis?.['Chi tiết']?.find(item => item['Tiêu chí'].startsWith('Phù hợp JD')), [analysis]);
  const jdFitScore = jdFitScoreItem ? parseInt(jdFitScoreItem['Điểm'].split('/')[0], 10) : 0;
  
  const getHeaderScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 text-green-300';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-300';
    return 'bg-red-500/20 text-red-300';
  };
  
  const overallScoreColor = failed ? 'bg-slate-700/60 text-slate-400' : getHeaderScoreColor(overallScore);
  const jdFitScoreColor = failed ? 'bg-slate-700/60 text-slate-400' : getHeaderScoreColor(jdFitScore);
  
  const sortedDetails = useMemo(() => {
    if (!analysis) return [];
    return [...analysis['Chi tiết']].sort((a, b) => {
      return CRITERIA_ORDER.indexOf(a['Tiêu chí']) - CRITERIA_ORDER.indexOf(b['Tiêu chí']);
    });
  }, [analysis]);

  const toggleAccordion = (criterion: string) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [criterion]: !prev[criterion]
    }));
  };

  const toggleExpandAll = () => {
    const areAllExpanded = sortedDetails.every(item => expandedAccordions[item['Tiêu chí']]);
    const newExpandedState: Record<string, boolean> = {};
    sortedDetails.forEach(item => {
      newExpandedState[item['Tiêu chí']] = !areAllExpanded;
    });
    setExpandedAccordions(newExpandedState);
  };
  
  return (
    <div className="candidate-card bg-slate-800/70 border border-slate-700 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-2xl hover:border-blue-600 backdrop-blur-sm">
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        {/* Simplified Header for toggling */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div 
            title="Thứ tự xếp hạng" 
            className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-base font-bold rounded-full text-white ${gradeColor}`}
          >
            #{rank}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-slate-100 truncate">{candidateName || 'Chưa xác định'}</p>
            <p className="text-sm text-slate-400 truncate">
              {!failed && <span className={`font-bold ${gradeTextColor}`}>{`Hạng ${grade}`}</span>}
              {jobTitle && <span className="hidden sm:inline"> • {jobTitle}</span>}
              {experienceLevel && <span className="hidden sm:inline font-normal text-slate-500"> • {experienceLevel}</span>}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-center">
                <p className="text-xs text-slate-400 mb-1 font-medium">Phù hợp JD</p>
                <span className={`text-lg font-bold px-3 py-1 rounded-md ${jdFitScoreColor}`}>{failed ? '--' : `${jdFitScore}%`}</span>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1 font-medium">Điểm Tổng</p>
              <span className={`text-lg font-bold px-3 py-1 rounded-md ${overallScoreColor}`}>{failed ? '--' : overallScore}</span>
            </div>
          </div>
          <button className="text-blue-400 font-semibold hover:text-blue-300 flex items-center gap-2">
            <span className="hidden sm:inline">Chi Tiết</span>
            <i className={`fa-solid fa-chevron-down transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
          </button>
        </div>
        {failed && <p className='text-sm font-semibold text-rose-400 mt-3 flex items-center gap-2'><i className="fa-solid fa-circle-xmark"></i>Lỗi: {error || 'Không xác định'}</p>}
      </div>
      
      {isExpanded && !failed && analysis && (
        <div className="border-t border-slate-700/80 p-4 md:p-6 bg-slate-900/40 space-y-6">
          
          {/* Top Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {strengths && strengths.length > 0 && (
              <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-xl">
                <p className="font-semibold text-green-300 mb-2 flex items-center gap-2 text-base">
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  Điểm mạnh CV
                </p>
                <ul className="list-disc list-inside text-sm text-green-400/90 space-y-1.5 pl-2">
                  {strengths.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            )}

            {weaknesses && weaknesses.length > 0 && (
              <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                <p className="font-semibold text-red-300 mb-2 flex items-center gap-2 text-base">
                  <i className="fa-solid fa-flag"></i>
                  Điểm yếu CV
                </p>
                <ul className="list-disc list-inside text-sm text-red-400/90 space-y-1.5 pl-2">
                  {weaknesses.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            )}
          </div>

          {softFilterWarnings && softFilterWarnings.length > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
              <p className="font-semibold text-yellow-300 mb-1 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Lưu ý Thêm
              </p>
              <ul className="list-disc list-inside text-yellow-400 space-y-1 pl-2">
                {softFilterWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {hardFilterFailureReason && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
              <p className="font-semibold text-red-300 mb-1 flex items-center gap-2">
                <i className="fa-solid fa-ban"></i>
                Không Đạt Yêu Cầu Bắt Buộc
              </p>
              <p className="text-red-400">{hardFilterFailureReason}</p>
            </div>
          )}
          
          {/* Detailed Scoring Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xl font-bold text-slate-100">Chi tiết Chấm điểm</h4>
              <button onClick={toggleExpandAll} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                {sortedDetails.every(item => expandedAccordions[item['Tiêu chí']]) ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
              </button>
            </div>
            <div className="space-y-3">
              {sortedDetails.map((item) => (
                <CriterionAccordion 
                  key={item['Tiêu chí']} 
                  item={item} 
                  isExpanded={!!expandedAccordions[item['Tiêu chí']]}
                  onToggle={() => toggleAccordion(item['Tiêu chí'])}
                />
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500 text-right pt-4 border-t border-slate-700/50">
             <p className="mb-1">Liên hệ: {phone || 'N/A'} • {email || 'N/A'}</p>
             <p>Nguồn CV: {fileName || 'N/A'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateCard;