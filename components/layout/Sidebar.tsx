import React from 'react';
import type { AppStep } from '../../types';

interface SidebarProps {
  activeStep: AppStep;
  setActiveStep: (step: AppStep) => void;
  completedSteps: AppStep[];
  onReset: () => void;
  onLogout?: () => void;
  userEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeStep, setActiveStep, completedSteps, onReset, onLogout, userEmail }) => {
  const steps: { key: AppStep; icon: string; label: string }[] = [
    { key: 'jd', icon: 'fa-solid fa-clipboard-list', label: 'Mô tả Công việc' },
    { key: 'weights', icon: 'fa-solid fa-sliders', label: 'Phân bổ Trọng số' },
    { key: 'upload', icon: 'fa-solid fa-file-arrow-up', label: 'Tải lên CV' },
    { key: 'analysis', icon: 'fa-solid fa-rocket', label: 'Phân Tích AI' },
  ];
  

  const isStepEnabled = (step: AppStep): boolean => {
    if (step === 'jd') return true;
    if (step === 'weights') return completedSteps.includes('jd');
    if (step === 'upload') return completedSteps.includes('jd') && completedSteps.includes('weights');
  if (step === 'analysis') return completedSteps.includes('jd') && completedSteps.includes('weights') && completedSteps.includes('upload');
    return false;
  };
  
  const renderStep = (step: { key: AppStep; icon: string; label: string }) => {
    const isActive = activeStep === step.key;
    const isEnabled = isStepEnabled(step.key);
    const isCompleted = completedSteps.includes(step.key);

    // Define vibrant colors for each step icon
    const getIconColor = (stepKey: AppStep, isActive: boolean, isEnabled: boolean, isCompleted: boolean) => {
      if (isCompleted) return 'text-green-400';
      if (isActive) return 'text-white';
      if (!isEnabled) return 'text-slate-500';

      switch (stepKey) {
        case 'jd': return 'text-blue-400';
        case 'weights': return 'text-purple-400';
        case 'upload': return 'text-emerald-400';
        case 'analysis': return 'text-orange-400';
        default: return 'text-slate-400';
      }
    };

    const iconColor = getIconColor(step.key, isActive, isEnabled, isCompleted);

    return (
      <li className="w-full" key={step.key}>
        <button
          className={`sidebar-item w-full relative h-[54px] flex items-center gap-3 rounded-lg px-4 transition-all duration-300 group overflow-hidden
            ${isActive ? 'bg-gradient-to-r from-blue-500/25 to-purple-500/25 text-white shadow-lg ring-1 ring-blue-400/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'} 
            ${!isEnabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${isCompleted && !isActive ? 'hover:bg-green-500/10' : ''}`}
          data-module={step.key}
          role="tab"
          aria-selected={isActive}
          aria-controls={`module-${step.key}`}
          data-tip={step.label}
          aria-label={step.label}
          disabled={!isEnabled}
          onClick={() => isEnabled && setActiveStep(step.key)}
        >
          {isActive && <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 animate-pulse" />}
          <div className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-md ${isActive ? 'bg-slate-800/40' : 'bg-slate-800/20 group-hover:bg-slate-700/30'} transition-colors`}> 
            <i className={`${step.icon} text-[20px] ${iconColor} transition-all duration-300 ${isActive ? 'drop-shadow-lg scale-110' : 'group-hover:scale-110'}`} aria-hidden="true" />
          </div>
          <span className={`text-sm font-medium tracking-wide transition-opacity duration-300 whitespace-nowrap ${isActive ? 'text-white' : ''}`}>{step.label}</span>
          {isCompleted && !isActive && step.key !== 'process' && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#0E1A24]" />
          )}
        </button>
      </li>
    );
  }

  return (
    <aside id="cv-sidebar" className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-[240px] bg-gradient-to-b from-[#0A141C] via-[#0B151F] to-[#0A141C] border-r border-white/15 shadow-2xl z-50 backdrop-blur-md">
      {/* Logo + Brand (click để làm mới phiên) */}
      <button
        type="button"
        onClick={() => window.location.reload()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.reload(); } }}
        title="Tải lại trang"
        aria-label="Tải lại trang"
        className="group flex items-center gap-3 px-4 pt-5 pb-2 select-none text-left focus:outline-none hover:bg-white/5 transition-colors"
      >
        <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 shadow-inner bg-slate-800/40 flex items-center justify-center group-hover:border-blue-400/40 group-hover:shadow-blue-400/10 transition-all">
          {/* Ưu tiên logo.jpg nếu có, fallback Support Hr.jpg, cuối cùng là chữ S */}
          <picture className="w-full h-full">
            <source srcSet="/photo/icon/logo.jpg" />
            <img
              src="/photo/icon/logo.jpg"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = '1';
                  target.src = '/photo/icon/Support%20Hr.jpg';
                } else {
                  const parent = target.parentElement?.parentElement; // div w-11 h-11
                  if (parent) {
                    parent.innerHTML = '<span class="font-bold text-lg text-white tracking-wide">S</span>';
                  }
                }
              }}
              alt="Support HR Logo"
              className="w-full h-full object-cover object-center select-none group-active:scale-95 transition-transform"
              draggable={false}
            />
          </picture>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[18px] font-extrabold tracking-wide whitespace-nowrap bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:brightness-110 drop-shadow-[0_0_6px_rgba(180,120,255,0.25)]">Support&nbsp;HR</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 group-hover:text-slate-400">AI Screening</span>
        </div>
        {/* Hidden reset text/icon per request */}
      </button>

      <ul id="sidebar-nav" className="flex-1 flex flex-col gap-1 py-2 w-full px-4" role="tablist" aria-label="Điều hướng module CV">
        {steps.map(renderStep)}
  {/* Removed history button */}
        <div className="mt-auto w-full flex flex-col gap-3 pb-5 pt-2">
          {(userEmail || onLogout) && (
            <div className="px-3 pt-[10px] pb-2 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col gap-2 group hover:border-slate-500/60 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-slate-200 text-sm font-semibold select-none">
                    {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Tài khoản</p>
                    <p className="text-xs text-slate-300 truncate" title={userEmail}>{userEmail || '—'}</p>
                  </div>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    aria-label="Đăng xuất"
                    title="Đăng xuất"
                    className="shrink-0 p-2 rounded-md text-slate-400 hover:text-[#FCA5A5] transition-colors focus:outline-none focus:ring-2 focus:ring-red-400/40"
                  >
                    <i className="fa-solid fa-right-from-bracket text-[18px]" />
                  </button>
                )}
              </div>
              <div className="text-[10px] text-center text-slate-600/80 tracking-wide">
                2024-2025 <span className="text-slate-400">Support HR</span>
              </div>
            </div>
          )}
        </div>
      </ul>
    </aside>
  );
};

export default Sidebar;