import React, { useState, useCallback, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { detectIndustryFromJD } from './services/industryDetector';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import type { AppStep, Candidate, HardFilters, WeightCriteria, AnalysisRunData } from './types';
import { initialWeights } from './constants';
import Sidebar from './components/layout/Sidebar';
import ProgressBar from './components/ui/ProgressBar';

// Lazy load pages for code-splitting
const ScreenerPage = lazy(() => import('./components/pages/ScreenerPage'));
const ProcessPage = lazy(() => import('./components/pages/ProcessPage'));
const AchievementsContactPage = lazy(() => import('./components/pages/AchievementsContactPage'));
const LoginPage = lazy(() => import('./components/pages/LoginPage'));
// HistoryPage removed from UI (still saving to Firestore silently)
import { saveHistorySession } from './services/historyService';
 
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const App: React.FC = () => {
  return (
    <HashRouter>
      <MainApp />
    </HashRouter>
  );
};

const MainApp: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  const handleStartProcess = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowIntro(false);
      setIsTransitioning(false);
    }, 800);
  };
  
  const handleLogin = (email: string) => {
    setIsLoggedIn(true);
  };
  
  const resetApp = () => {
    setShowIntro(true);
    // The main layout will handle its own state reset via the key prop
  };

  // Using a key on MainLayout ensures its state is completely reset when the key changes.
  // We change the key when resetting the app.
  const [resetKey, setResetKey] = useState(Date.now());
  const handleFullReset = () => {
    resetApp();
    setResetKey(Date.now());
  };


  if (!isLoggedIn) {
  return <LoginPage onLogin={handleLogin} />;
  }

  if (showIntro) {
    return (
      <div className={`min-h-screen text-slate-200 flex items-center justify-center transition-all duration-800 ease-in-out ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-10 py-8">
          <ProcessPage isIntroMode={true} onStart={handleStartProcess} />
        </div>
      </div>
    );
  }

  return <MainLayout key={resetKey} onResetRequest={handleFullReset} className={`transition-all duration-800 ease-in-out ${showIntro ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} />;
};


interface MainLayoutProps {
  onResetRequest: () => void;
  className?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onResetRequest, className }) => {
  const [userEmail, setUserEmail] = useState<string>(() => {
    // attempt to get from auth current user if available
    return (typeof window !== 'undefined' && (window as any).localStorage?.getItem('authEmail')) || '';
  });
  const [completedSteps, setCompletedSteps] = useState<AppStep[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = useCallback(() => {
    try { localStorage.removeItem('authEmail'); } catch {}
    window.location.reload();
  }, []);
  const [jdText, setJdText] = useState<string>('');
  const [jobPosition, setJobPosition] = useState<string>('');
  const [weights, setWeights] = useState<WeightCriteria>(initialWeights);
  const [hardFilters, setHardFilters] = useState<HardFilters>({
    location: '',
    minExp: '',
    seniority: '',
    education: '',
      industry: '',
    language: '',
    languageLevel: '',
    certificates: '',
    salaryMin: '',
    salaryMax: '',
    workFormat: '',
    contractType: '',
    locationMandatory: true,
    minExpMandatory: true,
    seniorityMandatory: true,
    educationMandatory: false,
    contactMandatory: false,
    industryMandatory: true,
    languageMandatory: false,
    certificatesMandatory: false,
    salaryMandatory: false,
    workFormatMandatory: false,
    contractTypeMandatory: false,
  });
  const [cvFiles, setCvFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  // Đồng bộ lại email nếu ban đầu rỗng hoặc thay đổi ở tab khác
  useEffect(() => {
    const syncEmail = () => {
      try {
        const stored = localStorage.getItem('authEmail') || '';
        setUserEmail(prev => (prev && prev.length > 0) ? prev : stored);
      } catch {}
    };
    syncEmail();
    window.addEventListener('storage', syncEmail);
    const interval = setInterval(syncEmail, 5000); // phòng trường hợp storage event không bắn
    return () => {
      window.removeEventListener('storage', syncEmail);
      clearInterval(interval);
    };
  }, []);
  

  const handleRestore = useCallback((payload: any) => {
    if (!payload) return;
    try {
      setJdText(payload.jdText || '');
      setJobPosition(payload.jobPosition || '');
      if (payload.weights) setWeights(payload.weights);
      if (payload.hardFilters) setHardFilters(payload.hardFilters);
      if (payload.candidates) setAnalysisResults(payload.candidates);
      setCompletedSteps(['jd','weights','upload','analysis']);
      navigate('/analysis');
    } catch (e) {
      console.warn('Restore failed', e);
    }
  }, [navigate]);
  

  const prevIsLoading = usePrevious(isLoading);

  // Auto-detect industry from JD whenever jdText changes significantly (throttle by length change)
  useEffect(() => {
    if (!jdText || jdText.length < 80) return; // avoid too-early detection
    setHardFilters(prev => {
      // If user already typed a custom industry different from last detected one, don't overwrite
      if (prev.industry && prev.industryManual) return prev as any; // we will extend type dynamically
      const detected = detectIndustryFromJD(jdText);
      if (detected && detected !== prev.industry) {
        return { ...prev, industry: detected } as HardFilters & { industryManual?: boolean };
      }
      return prev;
    });
  }, [jdText]);

  // Mark manual edits to industry (listener could be added where HardFilterPanel handles changes)
  // Quick patch: wrap original setHardFilters to flag manual change when id==='industry'
  const originalSetHardFilters = setHardFilters;
  const setHardFiltersWithFlag: typeof setHardFilters = (update) => {
    if (typeof update === 'function') {
      originalSetHardFilters(prev => {
        const next = (update as any)(prev);
        if (next.industry !== prev.industry && next._lastIndustryAuto !== true) {
          (next as any).industryManual = true;
        }
        return next;
      });
    } else {
      if (update.industry !== (hardFilters as any).industry) (update as any).industryManual = true;
      originalSetHardFilters(update);
    }
  };

  useEffect(() => {
    if (prevIsLoading && !isLoading && analysisResults.length > 0) {
      const successfulCandidates = analysisResults.filter(c => c.status === 'SUCCESS');
      if (successfulCandidates.length > 0) {
        // Add unique IDs to candidates before saving
        const candidatesWithIds = successfulCandidates.map(c => ({
          ...c,
          id: c.id || `${c.fileName}-${c.candidateName}-${Math.random()}`
        }));

        const analysisRun: AnalysisRunData = {
          timestamp: Date.now(),
          job: {
            position: jobPosition,
            locationRequirement: hardFilters.location || 'Không có',
          },
          candidates: candidatesWithIds,
        };
        localStorage.setItem('cvAnalysis.latest', JSON.stringify(analysisRun));
        // Firestore persistence (best-effort)
        saveHistorySession({
          jdText,
          jobPosition,
          locationRequirement: hardFilters.location || 'Không có',
          candidates: candidatesWithIds,
          userEmail: userEmail || 'anonymous',
          weights,
          hardFilters,
        }).catch(err => console.warn('Save history failed', err));
      }
    }
  }, [isLoading, prevIsLoading, analysisResults, jobPosition, hardFilters.location, jdText, userEmail]);

  const activeStep = useMemo((): AppStep => {
    switch(location.pathname) {
      case '/process': return 'process';
      case '/weights': return 'weights';
      case '/upload': return 'upload';
      case '/analysis': return 'analysis';
      case '/':
      default:
        return 'jd';
    }
  }, [location.pathname]);

  const setActiveStep = useCallback((step: AppStep) => {
    const pathMap: Partial<Record<AppStep, string>> = {
      jd: '/',
      weights: '/weights',
      upload: '/upload',
      analysis: '/analysis',
      process: '/process'
    };
    if (pathMap[step]) navigate(pathMap[step]!);
  }, [navigate]);

  const markStepAsCompleted = useCallback((step: AppStep) => {
    setCompletedSteps(prev => [...new Set([...prev, step])]);
  }, []);

  const screenerPageProps = {
    jdText, setJdText,
    jobPosition, setJobPosition,
    weights, setWeights,
    hardFilters, setHardFilters,
    cvFiles, setCvFiles,
    analysisResults, setAnalysisResults,
    isLoading, setIsLoading,
    loadingMessage, setLoadingMessage,
    activeStep, setActiveStep,
    completedSteps, markStepAsCompleted,
  };

  return (
     <div className={`min-h-screen text-slate-200 ${className || ''}`}>
      <Sidebar 
        activeStep={activeStep} 
        setActiveStep={setActiveStep} 
        completedSteps={completedSteps}
        onReset={onResetRequest}
        onLogout={handleLogout}
        userEmail={userEmail}
      />
  <main className="transition-all duration-300 md:ml-[240px] h-screen overflow-y-auto">
        <ProgressBar activeStep={activeStep} completedSteps={completedSteps} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-2">
            <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>}>
              <Routes>
                <Route path="/process" element={<ProcessPage />} />
                <Route path="/*" element={<ScreenerPage {...screenerPageProps} />} />
              </Routes>
            </Suspense>
        </div>
      </main>
    </div>
  );
};

export default App;