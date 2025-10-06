import React, { useMemo } from 'react';
import type { Candidate, DetailedScore } from '../../types';
import { analyzeExperience } from '../../services/experienceMatch';
import { extractJDRequirements, compareEvidence } from '../../services/requirementsExtractor';

const CARD_CRITERIA_ORDER = [
  'Phù hợp JD (Job Fit)', 'Kinh nghiệm', 'Kỹ năng', 'Thành tựu/KPI', 'Học vấn',
  'Ngôn ngữ', 'Chuyên nghiệp', 'Gắn bó & Lịch sử CV', 'Phù hợp văn hoá',
];

const CARD_CRITERIA_META: { [key: string]: { icon: string; color: string } } = {
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

interface CriterionAccordionProps {
  item: DetailedScore;
  isExpanded: boolean;
  onToggle: () => void;
  jdText: string;
}

const CriterionAccordion: React.FC<CriterionAccordionProps> = ({ item, isExpanded, onToggle, jdText }) => {
  const [copied, setCopied] = React.useState(false);
  const parsedData = useMemo(() => {
    const scoreMatch = item['Điểm'].match(/([\d.]+)\/([\d.]+)/);
    const score = parseFloat(scoreMatch?.[1] || '0');
    const maxScore = parseFloat(scoreMatch?.[2] || '0');

    // Debug: log the actual formula format
    console.log('Formula from AI:', item['Công thức']);
    console.log('Score format:', item['Điểm']);

    // Try new format first: "subscore X/Y% = X points"
    let formulaMatch = item['Công thức'].match(/subscore ([\d.]+)\/([\d.]+)% = ([\d.]+) points/);
    let subscore = parseFloat(formulaMatch?.[1] || '0');
    let weight = parseFloat(formulaMatch?.[2] || '0');
    let formulaResult = formulaMatch?.[3] || '0';

    // If new format doesn't match, try old format: "subscore X × trọng số Y% = Z"
    if (!formulaMatch) {
      formulaMatch = item['Công thức'].match(/subscore ([\d.]+) × trọng số ([\d]+)% = (.*)$/);
      subscore = parseFloat(formulaMatch?.[1] || '0');
      weight = parseFloat(formulaMatch?.[2] || '0');
      formulaResult = formulaMatch?.[3]?.trim() || '0';
    }

    // If still no match, try to extract numbers from any format
    if (!formulaMatch) {
      const numbers = item['Công thức'].match(/[\d.]+/g);
      if (numbers && numbers.length >= 2) {
        subscore = parseFloat(numbers[0]);
        weight = maxScore; // Assume weight equals maxScore for new format
        formulaResult = subscore.toString();
      }
    }

    console.log('Parsed data:', { score, maxScore, subscore, weight, formulaResult });

    return { score, maxScore, subscore, weight, formulaResult };
  }, [item]);

  const handleCopy = () => {
    navigator.clipboard.writeText(item['Dẫn chứng']);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const meta = CARD_CRITERIA_META[item['Tiêu chí']] || { icon: 'fa-solid fa-question-circle', color: 'text-slate-400' };
  const scorePercentage = (parsedData.score / parsedData.maxScore) * 100;
  const scoreColorClasses = scorePercentage >= 85 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                           scorePercentage >= 65 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                           'bg-red-500/20 text-red-300 border-red-500/30';

  // Derive proficiency band
  const proficiency = scorePercentage >= 90 ? 'Expert' :
                      scorePercentage >= 75 ? 'Advanced' :
                      scorePercentage >= 55 ? 'Intermediate' :
                      'Beginner';

  // Generate suggestion if low
  const suggestions: string[] = [];
  if (scorePercentage < 55) {
    if (/Kỹ năng/i.test(item['Tiêu chí'])) suggestions.push('Bổ sung chứng chỉ hoặc dự án thực tế thể hiện mức độ làm chủ công nghệ cốt lõi.');
    if (/Kinh nghiệm/i.test(item['Tiêu chí'])) suggestions.push('Làm rõ số năm, phạm vi trách nhiệm và kết quả định lượng trong từng vai trò.');
    if (/Thành tựu|KPI/i.test(item['Tiêu chí'])) suggestions.push('Thêm KPI cụ thể (ví dụ: % cải thiện, số người dùng, tốc độ, doanh thu).');
    if (/Học vấn/i.test(item['Tiêu chí'])) suggestions.push('Bổ sung chuyên ngành, đề tài hoặc môn học liên quan JD.');
    if (/Ngôn ngữ/i.test(item['Tiêu chí'])) suggestions.push('Ghi rõ cấp độ (IELTS/TOEIC/CEFR) hoặc kinh nghiệm sử dụng trong môi trường quốc tế.');
    if (/Chuyên nghiệp/i.test(item['Tiêu chí'])) suggestions.push('Chuẩn hóa format bullet, thống nhất thì hiện tại/quá khứ và kiểm tra lỗi chính tả.');
    if (/Gắn bó/i.test(item['Tiêu chí'])) suggestions.push('Làm rõ lý do chuyển việc hoặc nhấn mạnh các giai đoạn ổn định dài hạn.');
    if (/văn hoá/i.test(item['Tiêu chí'])) suggestions.push('Thêm minh chứng về teamwork, ownership hoặc growth mindset.');
  }

  const matchPercent = scorePercentage; // alias for UI clarity

  // Highlighting logic for evidence
  const highlightEvidence = (text: string) => {
    if (!text || text === 'Không tìm thấy thông tin trong CV') return text;
    const patterns = [
      /\b(aws|azure|gcp|docker|kubernetes|react|node|python|java|typescript|sql|mongodb|redis|kafka)\b/gi,
      /\b(\d+\s*(?:%|users|người|MAU|DAU|triệu|tỷ|kpi|doanh thu|revenue))\b/gi,
      /\b(leader|leadership|teamwork|ownership|growth|agile|scrum)\b/gi
    ];
    let html = text;
    patterns.forEach((re, idx) => {
      html = html.replace(re, (m) => `<span class="evidence-hl hl-${idx}">${m}</span>`);
    });
    return html;
  };

  // Specialized logic for "Kinh nghiệm" criterion: reorder sections & add quick analysis
  const isExperience = /Kinh nghiệm/i.test(item['Tiêu chí']);
  const jdRequirements = useMemo(() => extractJDRequirements(jdText), [jdText]);
  const thisRequirement = useMemo(() => jdRequirements.find(r => r.display === item['Tiêu chí']), [jdRequirements, item['Tiêu chí']]);
  const requirementComparison = useMemo(() => {
    if (isExperience) return null; // handled separately
    if (!thisRequirement) return null;
    return compareEvidence(item['Tiêu chí'], thisRequirement.keywords, item['Dẫn chứng']);
  }, [thisRequirement, item['Dẫn chứng'], isExperience, item['Tiêu chí']]);
  let experienceBlock: React.ReactNode = null;
  let matchMeta: ReturnType<typeof analyzeExperience> | null = null;
  if (isExperience) {
    matchMeta = analyzeExperience(jdText, item['Dẫn chứng'] || '');
    experienceBlock = (
      <div className="bg-slate-900/70 p-3 rounded-lg space-y-3">
        <h5 className="text-sm font-semibold text-slate-300 mb-1">Phân tích nhanh</h5>
        {matchMeta.matchPercent === 'N/A' ? (
          <p className="text-xs text-slate-500 italic">JD chưa có mục yêu cầu kinh nghiệm rõ ràng</p>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Mức độ phù hợp JD</span>
                <span className="font-semibold text-cyan-400">{matchMeta.matchPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-700/60 rounded overflow-hidden">
                <div
                  className={`h-full ${matchMeta.matchPercent! >= 80 ? 'bg-emerald-500' : matchMeta.matchPercent! >= 65 ? 'bg-yellow-500' : matchMeta.matchPercent! >= 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                  style={{ width: `${matchMeta.matchPercent}%` }}
                ></div>
              </div>
              <div className="text-xs text-slate-400">Nhận định: <span className="font-medium text-slate-300">{matchMeta.fitLabel}</span></div>
            </div>
            <div className="pt-2 border-t border-slate-700/50 space-y-2">
              <div className="text-[11px] text-slate-400 font-medium">Keyword JD</div>
              <div className="flex flex-wrap gap-1">
                {matchMeta.jdKeywords.slice(0,8).map(k => <span key={k} className="px-2 py-0.5 rounded-full bg-slate-700/60 text-[10px] text-slate-200 border border-slate-600">{k}</span>)}
              </div>
            </div>
            <div className="pt-1 space-y-2">
              <div className="text-[11px] text-slate-400 font-medium">Khớp</div>
              <div className="flex flex-wrap gap-1">
                {matchMeta.matched.slice(0,5).map(k => <span key={k} className="px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300 text-[10px] border border-emerald-500/40">{k}</span>)}
                {matchMeta.matched.length === 0 && <span className="text-[11px] text-slate-500">(Không)</span>}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Thiếu</div>
              <div className="flex flex-wrap gap-1">
                {matchMeta.missing.slice(0,5).map(k => <span key={k} className="px-2 py-0.5 rounded-full bg-yellow-600/30 text-yellow-300 text-[10px] border border-yellow-500/40">{k}</span>)}
                {matchMeta.missing.length === 0 && <span className="text-[11px] text-slate-500">(Không)</span>}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Chưa rõ</div>
              <div className="flex flex-wrap gap-1">
                {matchMeta.uncertain.slice(0,5).map(k => <span key={k} className="px-2 py-0.5 rounded-full bg-slate-600/40 text-slate-300 text-[10px] border border-slate-500/40">{k}</span>)}
                {matchMeta.uncertain.length === 0 && <span className="text-[11px] text-slate-500">(Không)</span>}
              </div>
            </div>
            {typeof matchMeta.matchPercent === 'number' && matchMeta.matchPercent < 70 && (
              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1"><i className="fa-solid fa-lightbulb text-yellow-400"></i>Gợi ý cải thiện:</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">Làm rõ thêm thời lượng, vai trò cụ thể và công nghệ chính trong các dự án gần nhất để tăng mức phù hợp.</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/80 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-blue-600/60">
      <button className="w-full flex items-center justify-between p-4 h-[64px] text-left" onClick={onToggle} aria-expanded={isExpanded}>
        <div className="flex items-center gap-3 min-w-0">
          <i className={`${meta.icon} ${meta.color} w-5 text-center text-lg`}></i>
          <span className="font-semibold text-slate-200 truncate">{item['Tiêu chí']}</span>
          <span className="ml-2 px-2 py-0.5 rounded text-[10px] tracking-wide font-semibold bg-slate-700/70 text-slate-300 border border-slate-600">{proficiency}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-base font-bold px-3 py-1.5 rounded-lg text-white ${scoreColorClasses.replace(/text-\w+-\d+/, '').replace('border-transparent', '')}`}>
            {parsedData.score}<span className="text-xs text-slate-400">/{parsedData.maxScore}</span>
          </span>
          <i className={`fa-solid fa-chevron-down text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-700/50">
          <div className={`grid grid-cols-1 ${isExperience ? 'xl:grid-cols-3' : 'xl:grid-cols-3'} gap-4`}>
            {/* Evidence always first */}
            <div className="bg-slate-900/70 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-sm font-semibold text-slate-300">Dẫn chứng (trích từ CV)</h5>
                <button onClick={handleCopy} className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                  <i className={`fa-solid ${copied ? 'fa-check text-emerald-400' : 'fa-copy'}`}></i>
                  {copied ? 'Đã chép' : 'Chép'}
                </button>
              </div>
              <blockquote className="text-sm text-slate-400 italic border-l-2 border-blue-500 pl-3 leading-relaxed evidence-block" dangerouslySetInnerHTML={{
                __html: item['Dẫn chứng'] === 'Không tìm thấy thông tin trong CV'
                  ? '<span class="not-italic bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded-md text-xs font-semibold">Chưa tìm thấy trong CV</span>'
                  : highlightEvidence(item['Dẫn chứng'])
              }} />
            </div>
            {/* If experience: insert Quick Analysis as second column */}
            {isExperience && experienceBlock}
            {!isExperience && requirementComparison && (
              <div className="bg-slate-900/70 p-3 rounded-lg space-y-3">
                <h5 className="text-sm font-semibold text-slate-300 mb-1">Phân tích nhanh</h5>
                <div className="text-[11px] text-slate-400">Từ khóa JD ({requirementComparison.jdKeywords.length})</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {requirementComparison.jdKeywords.slice(0,12).map(k => <span key={k} className="pill pill--uncertain">{k}</span>)}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Khớp</div>
                <div className="flex flex-wrap gap-1">
                  {requirementComparison.matched.length>0 ? requirementComparison.matched.slice(0,10).map(k => <span key={k} className="pill pill--match">{k}</span>) : <span className="text-[11px] text-slate-500">(Không)</span>}
                </div>
                <div className="text-[11px] text-slate-400 font-medium mt-2">Thiếu</div>
                <div className="flex flex-wrap gap-1">
                  {requirementComparison.missing.length>0 ? requirementComparison.missing.slice(0,10).map(k => <span key={k} className="pill pill--missing">{k}</span>) : <span className="text-[11px] text-slate-500">(Không)</span>}
                </div>
              </div>
            )}

            <div className="bg-slate-900/70 p-3 rounded-lg">
              <h5 className="text-sm font-semibold text-slate-300 mb-3">Giải thích & Công thức</h5>
              {!isExperience && requirementComparison && (
                <div className="mb-2 text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded p-2 leading-relaxed">
                  <span className="text-slate-300 font-medium">So khớp JD:</span> {requirementComparison.matched.length}/{requirementComparison.jdKeywords.length} từ khóa xuất hiện.
                  {requirementComparison.missing.length>0 && (
                    <>
                      {' '}Thiếu <span className="text-yellow-300 font-medium">{requirementComparison.missing.length}</span> từ: {requirementComparison.missing.slice(0,3).join(', ')}{requirementComparison.missing.length>3?'…':''}
                    </>
                  )}
                </div>
              )}
              {isExperience && matchMeta && (
                <div className="mb-2 text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/60 rounded p-2 leading-relaxed">
                  <span className="text-slate-300 font-medium">Tổng quan kinh nghiệm:</span> {matchMeta.matchPercent === 'N/A' ? 'Không xác định' : `${matchMeta.matchPercent}% (${matchMeta.fitLabel})`}.
                  {matchMeta.missing.length>0 && <> Thiếu: <span className="text-yellow-300 font-medium">{matchMeta.missing.slice(0,3).join(', ')}{matchMeta.missing.length>3?'…':''}</span></>}
                </div>
              )}

              {/* Giải thích chi tiết */}
              <div className="mb-3">
                <p className="text-sm text-slate-400 leading-relaxed">{item['Giải thích']}</p>
              </div>

              {/* Công thức tính điểm */}
              <div className="space-y-2">
                <div className="text-xs text-slate-500 font-medium">Công thức tính điểm:</div>

                {/* Hiển thị điểm đánh giá và thang điểm */}
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Đánh giá thực tế:</span>
                    <span className="font-mono text-cyan-400">{parsedData.score}/{parsedData.maxScore}</span>
                  </div>
                </div>

                {/* Công thức tính subscore */}
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-1">Công thức subscore:</div>
                  <div className="font-mono text-xs">
                    {parsedData.weight > 0 && parsedData.maxScore === parsedData.weight ? (
                      // Format mới: điểm trực tiếp trên thang trọng số
                      <span>
                        <span className="text-cyan-400">{parsedData.score}</span> / <span className="text-purple-400">{parsedData.weight}%</span> = <span className="text-yellow-400 font-bold">{parsedData.formulaResult} điểm</span>
                      </span>
                    ) : parsedData.weight > 0 ? (
                      // Format cũ: nhân với trọng số
                      <span>
                        <span className="text-cyan-400">{parsedData.subscore}</span> × <span className="text-purple-400">trọng số {parsedData.weight}%</span> = <span className="text-yellow-400 font-bold">{parsedData.formulaResult}</span>
                      </span>
                    ) : (
                      // Fallback: hiển thị công thức thô
                      <span className="text-slate-400">{item['Công thức'] || 'Không có công thức'}</span>
                    )}
                  </div>
                </div>

                {/* Giải thích đóng góp */}
                <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50">
                  <div className="text-xs text-slate-400 mb-1">Đóng góp vào điểm tổng:</div>
                  <div className="text-xs text-slate-300">
                    {parsedData.formulaResult && parsedData.formulaResult !== '0' ? (
                      <span>
                        Tiêu chí này đóng góp <span className="font-bold text-yellow-400">{parsedData.formulaResult}</span> điểm
                        {parsedData.weight > 0 && parsedData.maxScore === parsedData.weight ?
                          ` (điểm đánh giá trực tiếp trên thang ${parsedData.weight}%)` :
                          parsedData.weight > 0 ?
                          ` (từ đánh giá ${parsedData.subscore}/100 × ${parsedData.weight}%)` :
                          ''
                        }
                      </span>
                    ) : (
                      <span className="text-slate-500">Đang tính toán...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Fallback original quick analysis (non-experience criteria) */}
            {!isExperience && !requirementComparison && (
              <div className="bg-slate-900/70 p-3 rounded-lg space-y-3">
                <h5 className="text-sm font-semibold text-slate-300 mb-1">Phân tích nhanh</h5>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Mức độ phù hợp JD</span>
                    <span className="font-semibold text-cyan-400">{matchPercent.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-700/60 rounded overflow-hidden">
                    <div className={`h-full ${matchPercent>=85?'bg-emerald-500':matchPercent>=65?'bg-yellow-500':'bg-red-500'}`} style={{width: `${Math.min(100, Math.max(0, matchPercent))}%`}}></div>
                  </div>
                  <div className="text-xs text-slate-400">Đánh giá tổng quan: <span className="font-medium text-slate-300">{proficiency}</span></div>
                </div>
                {suggestions.length > 0 && (
                  <div className="pt-2 border-t border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1"><i className="fa-solid fa-lightbulb text-yellow-400"></i>Gợi ý cải thiện</p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                      {suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ExpandedContentProps {
  candidate: Candidate;
  expandedCriteria: Record<string, Record<string, boolean>>;
  onToggleCriterion: (candidateId: string, criterion: string) => void;
  jdText: string;
}

const ExpandedContent: React.FC<ExpandedContentProps> = ({ candidate, expandedCriteria, onToggleCriterion, jdText }) => {
  const sortedDetails = useMemo(() =>
    candidate.analysis?.['Chi tiết'] ?
      [...candidate.analysis['Chi tiết']].sort((a, b) =>
        CARD_CRITERIA_ORDER.indexOf(a['Tiêu chí']) - CARD_CRITERIA_ORDER.indexOf(b['Tiêu chí'])
      ) : [],
    [candidate.analysis]
  );

  const totalScore = candidate.analysis?.['Tổng điểm'] || 0;
  const maxTheoretical = 80; // standardized view
  const matchPercent = Math.min(100, Math.round((totalScore / maxTheoretical) * 100));
  const recommendation = totalScore >= 60
    ? 'Ứng viên có nền tảng tốt, nên xem xét mời phỏng vấn.'
    : totalScore >= 40
      ? 'Ứng viên có tiềm năng, cân nhắc nếu thiếu nguồn.'
      : 'Nên ưu tiên ứng viên khác có mức phù hợp cao hơn.';
  const stability = '±0.0'; // placeholder (extend with history later)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-5 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-3">
          <h4 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-cyan-400" />Tổng hợp đánh giá
          </h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ứng viên đạt <span className="font-semibold text-slate-200">{totalScore}/{maxTheoretical}</span> điểm – Mức phù hợp tổng thể: <span className="font-semibold text-cyan-400">{matchPercent}%</span>. Độ ổn định điểm: <span className="text-slate-300 font-medium">{stability}</span>
          </p>
          <div className="h-2 w-full bg-slate-700/50 rounded overflow-hidden">
            <div className={`${matchPercent>=75?'bg-emerald-500':matchPercent>=55?'bg-yellow-500':'bg-red-500'} h-full`} style={{width: `${matchPercent}%`}} />
          </div>
          <p className="text-sm text-slate-300 font-medium">Nhận định: <span className="text-slate-200 font-normal">{recommendation}</span></p>
        </div>
        <div className="w-full md:w-60 bg-slate-900/60 rounded-lg p-4 border border-slate-700/70 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between text-slate-400"><span>Điểm</span><span className="font-mono text-slate-200">{totalScore}</span></div>
            <div className="flex items-center justify-between text-slate-400"><span>Phù hợp JD</span><span className="font-mono text-cyan-400">{matchPercent}%</span></div>
            <div className="flex items-center justify-between text-slate-400"><span>Ổn định</span><span className="font-mono text-slate-300">{stability}</span></div>
            <div className="pt-1 border-t border-slate-700/50 text-slate-500 leading-relaxed">
              Hiển thị trên thang chuẩn hóa 80 điểm (8 nhóm). Dùng cho đánh giá định hướng.
            </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {candidate.analysis?.['Điểm mạnh CV'] && (
          <div className="p-4 bg-green-900/30 border border-green-500/30 rounded-xl">
            <p className="font-semibold text-green-300 mb-2 flex items-center gap-2 text-base">
              <i className="fa-solid fa-wand-magic-sparkles"></i>Điểm mạnh CV
            </p>
            <ul className="list-disc list-inside text-sm text-green-400/90 space-y-1.5 pl-2">
              {candidate.analysis['Điểm mạnh CV'].map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {candidate.analysis?.['Điểm yếu CV'] && (
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
            <p className="font-semibold text-red-300 mb-2 flex items-center gap-2 text-base">
              <i className="fa-solid fa-flag"></i>Điểm yếu CV
            </p>
            <ul className="list-disc list-inside text-sm text-red-400/90 space-y-1.5 pl-2">
              {candidate.analysis['Điểm yếu CV'].map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Education Validation Section */}
      {candidate.analysis?.educationValidation && (
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4">
          <h4 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-graduation-cap text-blue-400"></i>
            Xác thực thông tin học vấn
          </h4>

          <div className="space-y-4">
            {/* Standardized Education Info */}
            <div className="bg-slate-900/70 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-semibold text-slate-300">Thông tin học vấn chuẩn hóa</h5>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  candidate.analysis.educationValidation.validationNote === 'Hợp lệ'
                    ? 'bg-green-600 text-green-100'
                    : 'bg-red-600 text-red-100'
                }`}>
                  {candidate.analysis.educationValidation.validationNote}
                </span>
              </div>
              <p className="text-sm text-slate-400 font-mono bg-slate-800 p-2 rounded">
                {candidate.analysis.educationValidation.standardizedEducation || 'Không có thông tin'}
              </p>
            </div>

            {/* Validation Warnings */}
            {candidate.analysis.educationValidation.warnings && candidate.analysis.educationValidation.warnings.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-500/30 p-3 rounded-lg">
                <h5 className="text-sm font-semibold text-yellow-300 mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  Cảnh báo xác thực
                </h5>
                <ul className="list-disc list-inside text-sm text-yellow-400/90 space-y-1 pl-2">
                  {candidate.analysis.educationValidation.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="space-y-3">
          {sortedDetails.map((item) => (
            <CriterionAccordion
              key={item['Tiêu chí']}
              item={item}
              isExpanded={!!expandedCriteria[candidate.id]?.[item['Tiêu chí']]}
              onToggle={() => onToggleCriterion(candidate.id, item['Tiêu chí'])}
              jdText={jdText}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpandedContent;