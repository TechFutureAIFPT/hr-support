import React, { useEffect, useState, useCallback } from 'react';
import { fetchRecentHistory, fetchManualHistory } from '../../services/historyService';
import type { HistoryEntry } from '../../types';

interface HistoryPageProps { userEmail?: string; onRestore?: (payload: any) => void }

const HistoryPage: React.FC<HistoryPageProps> = ({ userEmail, onRestore }) => {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');
  const [selected, setSelected] = useState<HistoryEntry | null>(null); // mục được chọn để xem chi tiết
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    setError(null);
    try {
      const [autoHistory, manualHistory] = await Promise.all([
        fetchRecentHistory(50, userEmail),
        fetchManualHistory(userEmail)
      ]);
      // Tag manual entries by prefixing ID (UI only)
      const taggedManual = manualHistory.map(h => ({ ...h, id: `manual-${h.id}` }));
      const merged = [...taggedManual, ...autoHistory].sort((a,b)=> b.timestamp - a.timestamp);
      setItems(merged);
    } catch (e) {
      console.warn('History load failed', e);
      setError('Không tải được lịch sử');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userEmail]);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  
  // Debug log để xác minh dữ liệu
  useEffect(() => {
    console.log('[HistoryPage] userEmail=', userEmail, 'items=', items);
  }, [userEmail, items]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
  };

  const filtered = items.filter(it => {
    if (timeFilter === 'all') return true;
    const now = Date.now();
    const diff = now - it.timestamp;
    if (timeFilter === '24h') return diff <= 24*60*60*1000;
    if (timeFilter === '7d') return diff <= 7*24*60*60*1000;
    if (timeFilter === '30d') return diff <= 30*24*60*60*1000;
    return true;
  });

  if (loading) return <div className="p-8 text-slate-300">Đang tải lịch sử...</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Lịch sử Phân tích</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={`px-3 py-1 rounded-lg text-xs font-semibold border ${refreshing ? 'border-slate-600 text-slate-500 cursor-not-allowed' : 'border-slate-600 text-slate-300 hover:bg-slate-700/50'} flex items-center gap-2`}
        >
          <i className={`fa-solid fa-rotate ${refreshing ? 'animate-spin text-slate-500' : 'text-blue-300'}`}></i>
          {refreshing ? 'Đang làm mới...' : 'Làm mới'}
        </button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-slate-400">Thời gian:</label>
        {(['all','24h','7d','30d'] as const).map(tf => (
          <button key={tf} onClick={()=>setTimeFilter(tf)} className={`px-3 py-1 rounded-full text-xs font-semibold border ${timeFilter===tf? 'bg-blue-600 border-blue-500 text-white':'border-slate-600 text-slate-300 hover:bg-slate-700'}`}>{
            tf==='all'?'Tất cả': tf==='24h'?'24h': tf==='7d'?'7 ngày':'30 ngày'
          }</button>
        ))}
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} phiên</span>
      </div>
      {filtered.length === 0 && <p className="text-slate-400">Không có phiên phù hợp bộ lọc.</p>}
      <div className="grid md:grid-cols-2 gap-5">
        {filtered.map(item => (
          <div
            key={item.id}
            className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 hover:bg-slate-700/40 transition-colors cursor-pointer"
            onClick={() => setSelected(item)}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-200 text-lg flex items-center gap-2">{item.jobPosition || 'Chức danh chưa đặt'} {item.id.startsWith('manual-') && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">Thủ công</span>}</h3>
              <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-3 whitespace-pre-wrap">{item.jdTextSnippet}</p>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1"><span className="text-slate-400">Tổng:</span><span className="font-semibold text-white">{item.totalCandidates}</span></div>
              <div className="flex items-center gap-1"><span className="text-emerald-400">A</span><span className="font-semibold">{item.grades.A}</span></div>
              <div className="flex items-center gap-1"><span className="text-blue-400">B</span><span className="font-semibold">{item.grades.B}</span></div>
              <div className="flex items-center gap-1"><span className="text-red-400">C</span><span className="font-semibold">{item.grades.C}</span></div>
            </div>
            {item.topCandidates?.length > 0 && (
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-slate-400">Top 3:</p>
                {item.topCandidates.map(c => (
                  <div key={c.id} className="flex justify-between">
                    <span className="truncate max-w-[55%]" title={c.name}>{c.name}</span>
                    <span className="text-slate-400">{c.score} điểm • {c.jdFit}% JD</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
              {!item.id.startsWith('manual-') && (
                <button
                  onClick={() => onRestore && item.fullPayload && onRestore(item.fullPayload)}
                  disabled={!item.fullPayload}
                  className={`px-3 py-1 rounded text-xs font-semibold border ${item.fullPayload ? 'border-emerald-500 text-emerald-300 hover:bg-emerald-600/20':'border-slate-600 text-slate-500 cursor-not-allowed'}`}
                  title={item.fullPayload ? 'Khôi phục phiên này' : 'Phiên cũ không đủ dữ liệu để khôi phục'}
                >Khôi phục</button>
              )}
              <button
                onClick={() => setSelected(item)}
                className="px-3 py-1 rounded text-xs font-semibold border border-blue-500 text-blue-300 hover:bg-blue-600/20"
              >Chi tiết</button>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/70 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true">
          <div className="w-full max-w-4xl bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-6 animate-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  {selected.jobPosition || 'Chức danh chưa đặt'}
                  {selected.id.startsWith('manual-') && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">Thủ công</span>}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{new Date(selected.timestamp).toLocaleString()} • {selected.totalCandidates} ứng viên</p>
              </div>
              <div className="flex items-center gap-2">
                {!selected.id.startsWith('manual-') && selected.fullPayload && (
                  <button
                    onClick={() => onRestore && selected.fullPayload && onRestore(selected.fullPayload)}
                    className="px-3 py-1 rounded text-xs font-semibold border border-emerald-500 text-emerald-300 hover:bg-emerald-600/20"
                  >Khôi phục phiên</button>
                )}
                <button onClick={() => setSelected(null)} className="px-3 py-1 rounded text-xs font-semibold border border-slate-600 text-slate-300 hover:bg-slate-700/40">Đóng</button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-4">
                <section>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Mô tả công việc (JD)</h4>
                  <div className="max-h-64 overflow-y-auto rounded-lg bg-slate-800/40 p-3 text-xs whitespace-pre-wrap text-slate-300">
                    {selected.fullPayload?.jdText || selected.jdTextSnippet}
                  </div>
                </section>
                {selected.fullPayload?.hardFilters && (
                  <section>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Hard Filters</h4>
                    <pre className="bg-slate-800/40 rounded-lg p-3 text-[11px] text-slate-400 overflow-auto max-h-40">{JSON.stringify(selected.fullPayload.hardFilters, null, 2)}</pre>
                  </section>
                )}
                {selected.fullPayload?.weights && (
                  <section>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Trọng số</h4>
                    <pre className="bg-slate-800/40 rounded-lg p-3 text-[11px] text-slate-400 overflow-auto max-h-40">{JSON.stringify(selected.fullPayload.weights, null, 2)}</pre>
                  </section>
                )}
              </div>
              <div className="space-y-5">
                <section className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/70">
                  <h4 className="text-sm font-semibold text-slate-200 mb-3">Phân bố hạng</h4>
                  <div className="flex gap-4 text-sm">
                    <div className="flex flex-col items-center"><span className="text-emerald-400 font-semibold">A</span><span className="text-slate-200">{selected.grades.A}</span></div>
                    <div className="flex flex-col items-center"><span className="text-blue-400 font-semibold">B</span><span className="text-slate-200">{selected.grades.B}</span></div>
                    <div className="flex flex-col items-center"><span className="text-red-400 font-semibold">C</span><span className="text-slate-200">{selected.grades.C}</span></div>
                  </div>
                </section>
                {selected.topCandidates?.length > 0 && (
                  <section className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/70">
                    <h4 className="text-sm font-semibold text-slate-200 mb-3">Top Ứng viên</h4>
                    <ul className="space-y-2 text-xs">
                      {selected.topCandidates.map(c => (
                        <li key={c.id} className="flex justify-between gap-2">
                          <span className="truncate max-w-[55%]" title={c.name}>{c.name}</span>
                          <span className="text-slate-400">{c.score} • {c.jdFit}% • {c.grade}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {selected.fullPayload?.candidates && (
                  <section className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/70 max-h-72 overflow-y-auto">
                    <h4 className="text-sm font-semibold text-slate-200 mb-3">Danh sách ứng viên</h4>
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="text-slate-400">
                        <tr className="border-b border-slate-700/60">
                          <th className="py-1 pr-2 font-medium">Tên</th>
                          <th className="py-1 pr-2 font-medium">File</th>
                          <th className="py-1 pr-2 font-medium">Hạng</th>
                          <th className="py-1 pr-2 font-medium">Điểm</th>
                          <th className="py-1 pr-2 font-medium">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        {selected.fullPayload.candidates.map(c => (
                          <tr key={c.id || c.fileName} className="border-b border-slate-800/40 last:border-none">
                            <td className="py-1 pr-2 truncate max-w-[120px]" title={c.candidateName}>{c.candidateName}</td>
                            <td className="py-1 pr-2 truncate max-w-[120px]" title={c.fileName}>{c.fileName}</td>
                            <td className="py-1 pr-2">{c.analysis?.['Hạng'] || '-'}</td>
                            <td className="py-1 pr-2">{c.analysis?.['Tổng điểm'] ?? '-'}</td>
                            <td className="py-1 pr-2">{c.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )}
              </div>
            </div>
            {!selected.fullPayload && !selected.id.startsWith('manual-') && (
              <p className="text-[11px] text-amber-400">Phiên cũ không lưu đầy đủ payload nên chỉ xem được dữ liệu tóm tắt.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
