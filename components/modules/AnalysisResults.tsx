
import React, { useState, useMemo, useCallback } from 'react';
import debounce from 'lodash.debounce';
import type { Candidate, DetailedScore } from '../../types';
import ChatbotPanel from './ChatbotPanel';
import ExpandedContent from './ExpandedContent';
// Removed manual history save functionality


interface AnalysisResultsProps {
  isLoading: boolean;
  loadingMessage: string;
  results: Candidate[];
  jobPosition: string;
  locationRequirement: string;
  jdText: string;
}

// --- Inlined Loader Component ---
// This component is inlined to avoid a separate import that fails during lazy loading.
const Loader: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex justify-center items-center flex-col gap-6 text-center py-12 md:py-16">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 bg-blue-500/20 rounded-full pulse-animation"></div>
        </div>
      </div>
      <div>
        <p className="text-slate-300 font-semibold text-lg">{message || 'Đang phân tích CV với AI...'}</p>
        <p className="text-slate-500 text-sm mt-2">Quá trình này có thể mất một chút thời gian để đảm bảo độ chính xác cao nhất.</p>
      </div>
    </div>
  );
};

// --- Main AnalysisResults Component ---

type RankedCandidate = Candidate & { rank: number; jdFitScore: number; gradeValue: number };
interface AnalysisResultsProps { isLoading: boolean; loadingMessage: string; results: Candidate[]; jobPosition: string; locationRequirement: string; }

// Memoized table row component for performance
const TableRow = React.memo<{
  candidate: RankedCandidate;
  index: number;
  isSelected: boolean;
  expandedCandidate: string | null;
  expandedCriteria: Record<string, Record<string, boolean>>;
  onSelect: (id: string, index: number) => void;
  onExpand: (id: string) => void;
  onToggleCriterion: (candidateId: string, criterion: string) => void;
}>(({ candidate, index, isSelected, expandedCandidate, expandedCriteria, onSelect, onExpand, onToggleCriterion }) => {
  const grade = candidate.status === 'FAILED' ? 'FAILED' : (candidate.analysis?.['Hạng'] || 'C');
  const overallScore = candidate.status === 'FAILED' ? 0 : (candidate.analysis?.['Tổng điểm'] || 0);
  const jdFitScore = candidate.status === 'FAILED' ? 0 : parseInt(candidate.analysis?.['Chi tiết']?.find(i => i['Tiêu chí'].startsWith('Phù hợp JD'))?.['Điểm'].split('/')[0] || '0', 10);

  return (
    <React.Fragment>
      <tr 
        className={`border-t border-slate-700/50 ${isSelected ? 'bg-blue-500/10' : 'hover:bg-slate-700/30'} cursor-pointer`}
        onClick={(e) => {
          if ((e.target as HTMLInputElement).type !== 'checkbox') {
            onExpand(candidate.id);
          }
        }}
      >
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(candidate.id, index);
            }}
            className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
          />
        </td>
        <td className="px-4 py-3 text-sm text-slate-200">{candidate.candidateName || 'Chưa xác định'}</td>
        <td className="px-4 py-3 text-sm">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            candidate.status === 'FAILED' ? 'bg-slate-600 text-slate-400' :
            grade === 'A' ? 'bg-emerald-600 text-emerald-400' :
            grade === 'B' ? 'bg-blue-600 text-blue-400' :
            'bg-red-600 text-red-400'
          }`}>
            {grade}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-slate-200">{overallScore}</td>
        <td className="px-4 py-3 text-sm text-slate-200">{jdFitScore}%</td>
        <td className="px-4 py-3 text-sm text-slate-200">{candidate.jobTitle || ''}</td>
        <td className="px-4 py-3 text-sm text-slate-200">
          <div className="text-xs">
            <div>{candidate.phone || 'N/A'}</div>
            <div className="text-slate-400">{candidate.email || 'N/A'}</div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-200 flex items-center justify-between">
          <span>{candidate.fileName || ''}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onExpand(candidate.id);
            }}
            className="text-blue-400 hover:text-blue-300 ml-2"
          >
            <i className={`fa-solid fa-chevron-down transition-transform duration-300 ${expandedCandidate === candidate.id ? 'rotate-180' : ''}`}></i>
          </button>
        </td>
      </tr>
      {expandedCandidate === candidate.id && candidate.status !== 'FAILED' && candidate.analysis && (
        <tr>
          <td colSpan={8} className="bg-slate-900/40 border-t border-slate-700/50">
            <ExpandedContent
              candidate={candidate}
              expandedCriteria={expandedCriteria}
              onToggleCriterion={onToggleCriterion}
            />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});


const AnalysisResults: React.FC<AnalysisResultsProps> = ({ isLoading, loadingMessage, results, jobPosition, locationRequirement, jdText }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'score' | 'jdFit'>('score');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, Record<string, boolean>>>({});
  // Removed manual save state & handler

  // Debounced search handler
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => setDebouncedSearchTerm(value), 300),
    []
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSetSearchTerm(value);
  };

  const handleSelectCandidate = (candidateId: string, index: number, isShift: boolean = false) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (isShift && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          const id = filteredResults[i]?.id;
          if (id) newSet.add(id);
        }
      } else {
        if (newSet.has(candidateId)) {
          newSet.delete(candidateId);
        } else {
          newSet.add(candidateId);
        }
        setLastSelectedIndex(index);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredResults.map(c => c.id).filter(Boolean);
    setSelectedCandidates(prev => {
      if (prev.size === allIds.length) {
        return new Set();
      } else {
        return new Set(allIds);
      }
    });
  };

  const handleRemoveSelected = (candidateId: string) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      newSet.delete(candidateId);
      return newSet;
    });
  };

  const handleClearAllSelected = () => {
    if (window.confirm('Bạn có chắc muốn bỏ chọn tất cả ứng viên?')) {
      setSelectedCandidates(new Set());
    }
  };

  const handleExpandCandidate = (candidateId: string) => {
    setExpandedCandidate(expandedCandidate === candidateId ? null : candidateId);
  };

  const handleToggleCriterion = (candidateId: string, criterion: string) => {
    setExpandedCriteria(prev => ({
      ...prev,
      [candidateId]: {
        ...prev[candidateId],
        [criterion]: !prev[candidateId]?.[criterion]
      }
    }));
  };

  const exportSelectedToCSV = () => {
    if (selectedCandidates.size === 0) return;

    const selectedData = filteredResults.filter(c => selectedCandidates.has(c.id));
    const csvContent = [
      ['STT', 'HoTen', 'Hang', 'DiemTong', 'PhuHopJD%', 'ChucDanh', 'FileName', 'CandidateID'],
      ...selectedData.map((c, index) => [
        (index + 1).toString(),
        c.candidateName || '',
        c.status === 'FAILED' ? 'FAILED' : (c.analysis?.['Hạng'] || 'C'),
        c.status === 'FAILED' ? '0' : (c.analysis?.['Tổng điểm']?.toString() || '0'),
        c.status === 'FAILED' ? '0' : (parseInt(c.analysis?.['Chi tiết']?.find(i => i['Tiêu chí'].startsWith('Phù hợp JD'))?.['Điểm'].split('/')[0] || '0', 10)).toString(),
        c.jobTitle || '',
        c.fileName || '',
        c.id || ''
      ])
    ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

    // Thêm BOM để Excel nhận ra UTF-8
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ung_vien_da_chon_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const summaryData = useMemo(() => {
    if (!results || results.length === 0) {
      return { total: 0, countA: 0, countB: 0, countC: 0 };
    }
    const successfulCandidates = results.filter(c => c.status === 'SUCCESS' && c.analysis);
    const countA = successfulCandidates.filter(c => c.analysis?.['Hạng'] === 'A').length;
    const countB = successfulCandidates.filter(c => c.analysis?.['Hạng'] === 'B').length;
    const countC = results.length - countA - countB; // Includes failed and grade C
    return {
      total: successfulCandidates.length,
      countA,
      countB,
      countC,
    };
  }, [results]);

  const analysisData = useMemo(() => {
    if (!results || results.length === 0) return null;
    return {
      timestamp: Date.now(),
      job: {
        position: jobPosition,
        locationRequirement: locationRequirement || 'Không có',
      },
      candidates: results.map((c, index) => ({
        ...c,
        id: c.id || `candidate-${index}-${c.fileName}-${c.candidateName}`.replace(/[^a-zA-Z0-9]/g, '-')
      })),
    };
  }, [results, jobPosition, locationRequirement]);

  const rankedAndSortedResults = useMemo((): RankedCandidate[] => {
    if (!results || results.length === 0) return [];
    const gradeValues: { [key: string]: number } = { 'A': 3, 'B': 2, 'C': 1, 'FAILED': 0 };
    const enrichedResults = results.map(c => ({
        ...c,
        jdFitScore: parseInt(c.analysis?.['Chi tiết']?.find(i => i['Tiêu chí'].startsWith('Phù hợp JD'))?.['Điểm'].split('/')[0] || '0', 10),
        gradeValue: gradeValues[c.status === 'FAILED' ? 'FAILED' : (c.analysis?.['Hạng'] || 'C')]
    }));
    enrichedResults.sort((a, b) => {
      const primaryDiff = sortBy === 'score' ? (b.analysis?.['Tổng điểm'] || 0) - (a.analysis?.['Tổng điểm'] || 0) : b.jdFitScore - a.jdFitScore;
      if (primaryDiff !== 0) return primaryDiff;
      const secondaryDiff = sortBy === 'score' ? b.jdFitScore - a.jdFitScore : (b.analysis?.['Tổng điểm'] || 0) - (a.analysis?.['Tổng điểm'] || 0);
      if (secondaryDiff !== 0) return secondaryDiff;
      return b.gradeValue - a.gradeValue;
    });
    return enrichedResults.map((c, index) => ({ ...c, rank: index + 1 }));
  }, [results, sortBy]);

  const filteredResults = useMemo(() => {
    let resultsToFilter = rankedAndSortedResults;
    if (debouncedSearchTerm) resultsToFilter = resultsToFilter.filter(c => (c.candidateName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) || (c.jobTitle?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())));
    if (filter !== 'all') resultsToFilter = resultsToFilter.filter(c => c.status === 'FAILED' ? filter === 'C' : c.analysis?.['Hạng'] === filter);
    
    // Remove duplicates based on id
    const uniqueResults = resultsToFilter.filter((candidate, index, self) => 
      index === self.findIndex(c => c.id === candidate.id)
    );
    
    return uniqueResults;
  }, [rankedAndSortedResults, filter, debouncedSearchTerm]);

  if (isLoading) return <section id="module-analysis" className="module-pane active w-full"><Loader message={loadingMessage} /></section>;

  if (results.length === 0) return (
    <section id="module-analysis" className="module-pane active w-full">
      <div className="text-center py-16 md:py-20">
        <div className="relative inline-block mb-6"><i className="fa-solid fa-chart-line text-5xl md:text-6xl text-slate-600 float-animation"></i><div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full pulse-animation"></div></div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3">Sẵn Sàng Phân Tích</h3>
        <p className="text-slate-400 text-lg max-w-md mx-auto leading-relaxed">Kết quả AI sẽ xuất hiện ở đây sau khi bạn cung cấp mô tả công việc và các tệp CV.</p>
      </div>
    </section>
  );

  return (
    <>
      <section id="module-analysis" className="module-pane active w-full"><div className="space-y-6">
        {/* Job Position Header */}
        {jobPosition && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Chức danh đang phân tích</p>
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 text-transparent bg-clip-text">{jobPosition}</h2>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="px-3 py-1 rounded-full bg-slate-700/60 border border-slate-600">Tổng CV: {summaryData.total}</span>
              <span className="px-3 py-1 rounded-full bg-slate-700/60 border border-slate-600">A: {summaryData.countA}</span>
              <span className="px-3 py-1 rounded-full bg-slate-700/60 border border-slate-600">B: {summaryData.countB}</span>
              <span className="px-3 py-1 rounded-full bg-slate-700/60 border border-slate-600">C/Lỗi: {summaryData.countC}</span>
            </div>
          </div>
        )}
        {/* Removed save message display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
              <p className="text-sm text-slate-400">Tổng CV Phân Tích</p>
              <p className="text-3xl font-bold text-white mt-1">{summaryData.total}</p>
          </div>
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
              <p className="text-sm text-slate-400">Hạng A</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{summaryData.countA}</p>
          </div>
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
              <p className="text-sm text-slate-400">Hạng B</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{summaryData.countB}</p>
          </div>
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
              <p className="text-sm text-slate-400">Hạng C/Lỗi</p>
              <p className="text-3xl font-bold text-red-400 mt-1">{summaryData.countC}</p>
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4">
              <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                  <i className="fa-solid fa-magnifying-glass text-slate-500 absolute left-4 top-1/2 -translate-y-1/2"></i>
                  <input 
                      type="text" 
                      placeholder="Tìm theo tên, chức danh..." 
                      value={searchTerm} 
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full sm:w-64 pl-11 pr-4 py-2.5 bg-slate-900/70 border border-slate-600 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
              </div>
              
              <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-full">
                  <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Tất cả</button>
                  <button onClick={() => setFilter('A')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${filter === 'A' ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Hạng A</button>
                  <button onClick={() => setFilter('B')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${filter === 'B' ? 'bg-blue-500 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Hạng B</button>
                  <button onClick={() => setFilter('C')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${filter === 'C' ? 'bg-red-500 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>Hạng C</button>
              </div>
              
              <div className="flex items-center gap-2">
                  <label htmlFor="sort-by" className="text-sm font-medium text-slate-400">Sắp xếp:</label>
                  <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'score' | 'jdFit')} className="bg-slate-700/80 border-slate-600 text-slate-200 text-sm font-semibold rounded-full py-2 pl-4 pr-8 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none">
                      <option value="score">Điểm Tổng</option>
                      <option value="jdFit">Phù hợp JD</option>
                  </select>
              </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto results-container">
            <table className="w-full">
              <thead className="bg-slate-700/50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.size === filteredResults.length && filteredResults.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Họ tên</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Hạng</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Điểm</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Phù hợp JD</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Chức danh</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Liên hệ</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">File</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((candidate, index) => {
                  const isSelected = selectedCandidates.has(candidate.id);
                  const grade = candidate.status === 'FAILED' ? 'FAILED' : (candidate.analysis?.['Hạng'] || 'C');
                  const overallScore = candidate.status === 'FAILED' ? 0 : (candidate.analysis?.['Tổng điểm'] || 0);
                  const jdFitScore = candidate.status === 'FAILED' ? 0 : parseInt(candidate.analysis?.['Chi tiết']?.find(i => i['Tiêu chí'].startsWith('Phù hợp JD'))?.['Điểm'].split('/')[0] || '0', 10);
                  
                  return (
                    <React.Fragment key={candidate.id}>
                      <tr 
                        className={`border-t border-slate-700/50 ${isSelected ? 'bg-blue-500/10' : 'hover:bg-slate-700/30'} cursor-pointer transition-colors duration-150`}
                        onClick={(e) => {
                          if ((e.target as HTMLInputElement).type !== 'checkbox') {
                            handleExpandCandidate(candidate.id);
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectCandidate(candidate.id, index);
                            }}
                            className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">{candidate.candidateName || 'Chưa xác định'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            candidate.status === 'FAILED' ? 'bg-slate-600 text-slate-400' :
                            grade === 'A' ? 'bg-emerald-600 text-emerald-400' :
                            grade === 'B' ? 'bg-blue-600 text-blue-400' :
                            'bg-red-600 text-red-400'
                          }`}>
                            {grade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">{overallScore}</td>
                        <td className="px-4 py-3 text-sm text-slate-200">{jdFitScore}%</td>
                        <td className="px-4 py-3 text-sm text-slate-200">{candidate.jobTitle || ''}</td>
                        <td className="px-4 py-3 text-sm text-slate-200">
                          <div className="text-xs">
                            <div>{candidate.phone || 'N/A'}</div>
                            <div className="text-slate-400">{candidate.email || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200 flex items-center justify-between">
                          <span>{candidate.fileName || ''}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExpandCandidate(candidate.id);
                            }}
                            className="text-blue-400 hover:text-blue-300 ml-2 transition-colors duration-150"
                          >
                            <i className={`fa-solid fa-chevron-down transition-transform duration-300 ${expandedCandidate === candidate.id ? 'rotate-180' : ''}`}></i>
                          </button>
                        </td>
                      </tr>
                      {expandedCandidate === candidate.id && candidate.status !== 'FAILED' && candidate.analysis && (
                        <tr className="expanded-content">
                          <td colSpan={8} className="bg-slate-900/40 border-t border-slate-700/50">
                            <ExpandedContent
                              candidate={candidate}
                              expandedCriteria={expandedCriteria}
                              onToggleCriterion={handleToggleCriterion}
                              jdText={jdText}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredResults.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      <i className="fa-solid fa-ghost text-4xl mb-4"></i>
                      <p>Không có ứng viên nào khớp với bộ lọc của bạn.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedCandidates.size > 0 && (
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200">Ứng viên đã chọn ({selectedCandidates.size})</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportSelectedToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-full transition-colors"
                >
                  <i className="fa-solid fa-file-csv"></i>
                  Xuất CSV đã chọn
                </button>
                <button 
                  onClick={handleClearAllSelected}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-full transition-colors"
                >
                  <i className="fa-solid fa-trash"></i>
                  Xoá tất cả
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredResults.filter(c => selectedCandidates.has(c.id)).map(candidate => {
                const grade = candidate.status === 'FAILED' ? 'FAILED' : (candidate.analysis?.['Hạng'] || 'C');
                const overallScore = candidate.status === 'FAILED' ? 0 : (candidate.analysis?.['Tổng điểm'] || 0);
                const jdFitScore = candidate.status === 'FAILED' ? 0 : parseInt(candidate.analysis?.['Chi tiết']?.find(i => i['Tiêu chí'].startsWith('Phù hợp JD'))?.['Điểm'].split('/')[0] || '0', 10);
                
                return (
                  <div key={candidate.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-400">{candidate.candidateName || 'Chưa xác định'}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        candidate.status === 'FAILED' ? 'bg-slate-600 text-slate-400' :
                        grade === 'A' ? 'bg-emerald-600 text-emerald-400' :
                        grade === 'B' ? 'bg-blue-600 text-blue-400' :
                        'bg-red-600 text-red-400'
                      }`}>
                        {grade}
                      </span>
                      <span className="text-sm text-slate-400">{overallScore} / {jdFitScore}%</span>
                      <span className="text-sm text-slate-500">{candidate.jobTitle || ''}</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveSelected(candidate.id)}
                      className="text-red-400 hover:text-red-300 text-sm underline"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div></section>

      {/* Floating Chat Button */}
      {analysisData && (
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-sky-600 hover:bg-sky-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-50"
          aria-label="Mở chatbot"
        >
          <i className="fa-solid fa-brain text-xl"></i>
        </button>
      )}

      {/* Chatbot Panel */}
      {isChatOpen && analysisData && (
        <div className="fixed bottom-20 right-6 w-96 max-w-[calc(100vw-2rem)] z-40">
          <ChatbotPanel analysisData={analysisData} onClose={() => setIsChatOpen(false)} />
        </div>
      )}
    </>
  );
};


export default AnalysisResults;