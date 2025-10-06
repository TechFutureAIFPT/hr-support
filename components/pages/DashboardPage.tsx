import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { AnalysisRunData, Candidate } from '../../types';
import CandidateCard from '../ui/CandidateCard';
import ChatbotPanel from '../modules/ChatbotPanel';

const DashboardPage: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<AnalysisRunData | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const latestRun = localStorage.getItem('cvAnalysis.latest');
    if (latestRun) {
      try {
        const parsedData: AnalysisRunData = JSON.parse(latestRun);
        // Sort candidates by score descending by default
        const sortedCandidates = parsedData.candidates.sort((a, b) => (b.analysis?.['Tổng điểm'] || 0) - (a.analysis?.['Tổng điểm'] || 0));
        setAnalysisData({ ...parsedData, candidates: sortedCandidates });
      } catch (error) {
        console.error("Failed to parse analysis data from localStorage", error);
        setAnalysisData(null);
      }
    }
  }, []);
  
  const handleSelectCandidate = useCallback((candidateId: string) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  }, []);

  const summaryData = useMemo(() => {
    if (!analysisData) return { total: 0, countA: 0, countB: 0, countC: 0, failed: 0 };
    const candidates = analysisData.candidates;
    const total = candidates.length;
    const countA = candidates.filter(c => c.analysis?.['Hạng'] === 'A').length;
    const countB = candidates.filter(c => c.analysis?.['Hạng'] === 'B').length;
    const countC = candidates.filter(c => c.analysis?.['Hạng'] === 'C').length;
    const failed = candidates.filter(c => c.status === 'FAILED').length;
    return { total, countA, countB, countC, failed };
  }, [analysisData]);

  const filteredCandidates = useMemo(() => {
    if (!analysisData) return [];
    let candidates = analysisData.candidates;

    if (filter !== 'all') {
      if (filter === 'FAILED') {
        candidates = candidates.filter(c => c.status === 'FAILED');
      } else {
        candidates = candidates.filter(c => c.analysis?.['Hạng'] === filter && c.status === 'SUCCESS');
      }
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      candidates = candidates.filter(c => 
        c.candidateName?.toLowerCase().includes(lowercasedFilter) ||
        c.jobTitle?.toLowerCase().includes(lowercasedFilter)
      );
    }
    return candidates;
  }, [analysisData, searchTerm, filter]);

  const exportToCSV = useCallback(() => {
    if (!analysisData) return;
    const candidatesToExport = analysisData.candidates.filter(c => selectedCandidates.has(c.id));
    if (candidatesToExport.length === 0) return;

    const headers = ['Rank', 'Name', 'Grade', 'Total Score', 'JD Fit (%)', 'Phone', 'Email', 'Strengths', 'Weaknesses'];
    const rows = candidatesToExport.map((c, index) => [
      index + 1,
      c.candidateName,
      c.analysis?.['Hạng'] || 'N/A',
      c.analysis?.['Tổng điểm'] || 'N/A',
      c.analysis?.['Chi tiết']?.find(i => i['Tiêu chí'].startsWith('Phù hợp JD'))?.['Điểm']?.split('/')[0] || 'N/A',
      c.phone || 'N/A',
      c.email || 'N/A',
      `"${c.analysis?.['Điểm mạnh CV']?.join(', ') || 'N/A'}"`,
      `"${c.analysis?.['Điểm yếu CV']?.join(', ') || 'N/A'}"`,
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cv_export_${analysisData.job.position.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [analysisData, selectedCandidates]);

  if (!analysisData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <i className="fa-solid fa-folder-open text-6xl text-slate-600 mb-6 animate-pulse"></i>
        <h2 className="text-2xl font-bold text-white">Chưa có dữ liệu phân tích</h2>
        <p className="text-slate-400 mt-2 max-w-md">Vui lòng quay lại trang chính và chạy một lượt phân tích CV để xem dashboard.</p>
      </div>
    );
  }

  const StatCard = ({ title, value, colorClass }: { title: string, value: number, colorClass: string }) => (
    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700">
      <p className="text-sm text-slate-400">{title}</p>
      <p className={`text-3xl font-bold ${colorClass} mt-1`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-700 pb-4">
        <p className="text-sm text-sky-400 font-semibold">Dashboard Tuyển dụng</p>
        <h1 className="text-3xl font-bold text-white mt-1">{analysisData.job.position}</h1>
        <p className="text-slate-400 mt-2 text-sm">
          Phân tích lúc: <span className="font-semibold text-slate-300">{new Date(analysisData.timestamp).toLocaleString('vi-VN')}</span>
        </p>
      </header>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tổng CV Phân Tích" value={summaryData.total} colorClass="text-white" />
        <StatCard title="Hạng A" value={summaryData.countA} colorClass="text-emerald-400" />
        <StatCard title="Hạng B" value={summaryData.countB} colorClass="text-blue-400" />
        <StatCard title="Hạng C/Lỗi" value={summaryData.countC + summaryData.failed} colorClass="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <main className="lg:col-span-2 space-y-6">
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex flex-col sm:flex-row gap-3 items-center flex-wrap">
            <div className="relative flex-grow sm:flex-grow-0">
              <i className="fa-solid fa-magnifying-glass text-slate-500 absolute left-4 top-1/2 -translate-y-1/2"></i>
              <input type="text" placeholder="Tìm theo tên, chức danh..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:w-60 pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"/>
            </div>
            <div className="flex items-center gap-1 bg-slate-700/50 p-1 rounded-lg">
              <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filter === 'all' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>Tất cả</button>
              <button onClick={() => setFilter('A')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filter === 'A' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>Hạng A</button>
              <button onClick={() => setFilter('B')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filter === 'B' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>Hạng B</button>
              <button onClick={() => setFilter('C')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filter === 'C' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>Hạng C</button>
              <button onClick={() => setFilter('FAILED')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filter === 'FAILED' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>Lỗi</button>
            </div>
            <div className="flex-grow text-right">
                <button onClick={exportToCSV} disabled={selectedCandidates.size === 0} className="h-9 px-4 flex items-center justify-center text-sm font-medium text-slate-200 bg-emerald-600/50 border border-emerald-500/50 rounded-lg hover:bg-emerald-600/80 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-600/50 disabled:border-slate-500">
                  <i className="fa-solid fa-file-csv mr-2"></i>
                  Xuất {selectedCandidates.size > 0 ? `${selectedCandidates.size} ` : ''}CV (CSV)
                </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredCandidates.map((candidate, index) => (
              <div key={candidate.id} className="relative group">
                <CandidateCard candidate={candidate} rank={index + 1} />
                <label className="absolute top-5 right-5 w-6 h-6 flex items-center justify-center cursor-pointer">
                  <input type="checkbox" checked={selectedCandidates.has(candidate.id)} onChange={() => handleSelectCandidate(candidate.id)} className="w-5 h-5 bg-slate-700 border-slate-500 rounded text-sky-500 focus:ring-sky-600 transition-opacity duration-200 opacity-50 group-hover:opacity-100 checked:opacity-100" />
                </label>
              </div>
            ))}
             {filteredCandidates.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <i className="fa-solid fa-ghost text-4xl mb-4"></i>
                <p>Không có ứng viên nào khớp bộ lọc.</p>
              </div>
            )}
          </div>
        </main>
        
        <aside className="lg:col-span-1 sticky top-8">
          <ChatbotPanel analysisData={analysisData} />
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;
