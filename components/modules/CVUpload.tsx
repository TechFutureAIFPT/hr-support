import React, { useState, useCallback } from 'react';
import type { Candidate, HardFilters, WeightCriteria, AppStep } from '../../types';
import { analyzeCVs } from '../../services/geminiService';

interface CVUploadProps {
  cvFiles: File[];
  setCvFiles: React.Dispatch<React.SetStateAction<File[]>>;
  jdText: string;
  weights: WeightCriteria;
  hardFilters: HardFilters;
  setAnalysisResults: React.Dispatch<React.SetStateAction<Candidate[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
  onAnalysisStart: () => void;
  completedSteps: AppStep[];
}

const CVUpload: React.FC<CVUploadProps> = (props) => {
  const { cvFiles, setCvFiles, jdText, weights, hardFilters, setAnalysisResults, setIsLoading, setLoadingMessage, onAnalysisStart, completedSteps } = props;
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length > 12) {
        setError('Chỉ được phép tải lên tối đa 12 CV mỗi lần.');
        setCvFiles([]);
        return;
      }
      setError('');
      setCvFiles(files);
    }
  };

  const handleAnalyzeClick = async () => {
    const requiredSteps: AppStep[] = ['jd', 'weights'];
    const missingSteps = requiredSteps.filter(step => !completedSteps.includes(step));
    
    if (missingSteps.length > 0) {
      const stepNames = missingSteps.map(s => {
        if (s === 'jd') return 'Mô tả công việc';
        if (s === 'weights') return 'Phân bổ trọng số';
        return s;
      }).join(', ');
      setError(`Vui lòng hoàn thành các bước trước: ${stepNames}.`);
      return;
    }
    
    if (cvFiles.length === 0) {
      setError('Vui lòng chọn ít nhất một tệp CV để phân tích.');
      return;
    }

    setError('');
    setIsLoading(true);
    onAnalysisStart();
    setAnalysisResults([]);

    try {
      const analysisGenerator = analyzeCVs(jdText, weights, hardFilters, cvFiles);
      for await (const result of analysisGenerator) {
        if (result.status === 'progress') {
          setLoadingMessage(result.message);
        } else {
          setAnalysisResults(prev => [...prev, result as Candidate]);
        }
      }
    } catch (err) {
      console.error("Lỗi phân tích CV:", err);
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
      
      setError(message);
      
      setAnalysisResults(prev => {
        // Avoid adding duplicate system error cards
        if (prev.some(c => c.candidateName === 'Lỗi Hệ Thống')) return prev;
        return [...prev, {
          // FIX: Added the 'id' property to conform to the Candidate type for system error messages.
          id: `system-error-${Date.now()}`,
          status: 'FAILED',
          error: message,
          candidateName: 'Lỗi Hệ Thống',
          fileName: 'N/A',
          jobTitle: '',
          industry: '',
          department: '',
          experienceLevel: '',
          detectedLocation: '',
        }];
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage('Hoàn tất phân tích!');
    }
  };

  return (
    <section id="module-upload" className="module-pane active w-full">
      <div className="glass-effect tf-card p-4 md:p-6 rounded-2xl border border-blue-500/20 space-y-6">
        <div className="relative">
          <label htmlFor="cv-files" className="w-full cursor-pointer bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-300 font-bold py-3 px-3 sm:py-4 sm:px-5 rounded-xl border-2 border-dashed border-blue-500/40 hover:from-blue-500/30 hover:to-purple-500/30 hover:border-blue-500/60 transition duration-300 flex items-center justify-center gap-3 backdrop-blur-sm group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <i className="fa-solid fa-cloud-arrow-up text-white text-lg"></i>
            </div>
            <div className="text-center">
              <span className="block text-base md:text-lg font-bold">Chọn Tệp CV</span>
              <span className="block text-xs sm:text-sm text-slate-400 mt-1">Hỗ trợ PDF, DOC, DOCX, TXT, JPG, PNG</span>
              <span className="block text-xs text-orange-400 mt-1 font-semibold">Tối đa 12 CV mỗi lần phân tích</span>
            </div>
          </label>
          <input type="file" id="cv-files" multiple accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleFileChange} />
          
          <div id="file-list" className="mt-4 space-y-2 text-sm text-slate-400">
            {cvFiles.map((file, index) => (
              <div key={index} className="flex items-center bg-slate-800/50 p-2 rounded-md border border-slate-700">
                <i className="fa-regular fa-file-lines mr-3 text-slate-400"></i>
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-xs text-slate-500 ml-2">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4 pt-2">
          {error && <div className="text-sm text-red-400 font-semibold bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}
          <button
            id="analyze-button"
            onClick={handleAnalyzeClick}
            disabled={cvFiles.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold py-4 md:py-5 px-8 rounded-xl hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-300 disabled:from-slate-600 disabled:via-slate-600 disabled:to-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xl btn-glow shadow-xl relative overflow-hidden group"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <i className="fa-solid fa-rocket text-white"></i>
            </div>
            <span>Phân Tích CV với AI</span>
          </button>
        </div>
      </div>
    </section>
  );
};


export default CVUpload;
