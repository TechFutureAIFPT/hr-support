
import React from 'react';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
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

export default Loader;
