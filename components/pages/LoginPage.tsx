import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/firebase';


interface LoginPageProps {
  onLogin: (email: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successStage, setSuccessStage] = useState<'idle' | 'celebrating' | 'transitioning'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp!');
        return;
      }
      try {
  await createUserWithEmailAndPassword(auth, email, password);
  try { localStorage.setItem('authEmail', email); } catch {}
        setSuccessMessage('Đăng ký thành công!');
        setShowSuccess(true);
        setSuccessStage('celebrating');
        setTimeout(() => {
          setSuccessStage('transitioning');
          setTimeout(() => {
            onLogin(email);
          }, 800);
        }, 2000);
      } catch (err: any) {
        setError(err.message || 'Đăng ký thất bại!');
      }
    } else {
      try {
  await signInWithEmailAndPassword(auth, email, password);
  try { localStorage.setItem('authEmail', email); } catch {}
        setSuccessMessage('Đăng nhập thành công!');
        setShowSuccess(true);
        setSuccessStage('celebrating');
        setTimeout(() => {
          setSuccessStage('transitioning');
          setTimeout(() => {
            onLogin(email);
          }, 800);
        }, 2000);
      } catch (err: any) {
        setError('Email/ mật khẩu không chính xác');
      }
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden transition-all duration-800 ${successStage === 'transitioning' ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className={`absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl transition-all duration-1000 ${successStage === 'celebrating' ? 'animate-pulse scale-110 bg-green-500/20' : 'animate-pulse'}`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl transition-all duration-1000 delay-1000 ${successStage === 'celebrating' ? 'animate-pulse scale-110 bg-emerald-500/20' : 'animate-pulse'}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl transition-all duration-1000 delay-500 ${successStage === 'celebrating' ? 'animate-pulse scale-110 bg-teal-500/20' : 'animate-pulse'}`}></div>
        
        {/* Success confetti effect */}
        {successStage === 'celebrating' && (
          <>
            <div className="absolute top-10 left-10 w-4 h-4 bg-yellow-400 rounded-full animate-bounce delay-0 opacity-70"></div>
            <div className="absolute top-20 right-20 w-3 h-3 bg-pink-400 rounded-full animate-bounce delay-200 opacity-70"></div>
            <div className="absolute bottom-20 left-20 w-5 h-5 bg-blue-400 rounded-full animate-bounce delay-400 opacity-70"></div>
            <div className="absolute bottom-10 right-10 w-2 h-2 bg-green-400 rounded-full animate-bounce delay-600 opacity-70"></div>
            <div className="absolute top-1/3 left-1/3 w-3 h-3 bg-purple-400 rounded-full animate-bounce delay-300 opacity-70"></div>
            <div className="absolute bottom-1/3 right-1/3 w-4 h-4 bg-orange-400 rounded-full animate-bounce delay-500 opacity-70"></div>
          </>
        )}
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Success Notification */}
        {showSuccess && (
          <div className={`mb-6 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/50 rounded-2xl backdrop-blur-sm shadow-lg transition-all duration-700 ease-out transform
            ${successStage === 'celebrating' ? 'scale-100 opacity-100 translate-y-0 animate-pulse' : 'scale-95 opacity-0 translate-y-4'}`}>
            <div className="flex items-center justify-center space-x-2">
              <i className={`fa-solid fa-check-circle text-green-400 text-xl transition-all duration-500 ${successStage === 'celebrating' ? 'animate-bounce scale-110' : ''}`}></i>
              <span className="text-green-200 font-medium animate-pulse">{successMessage}</span>
            </div>
            {successStage === 'celebrating' && (
              <div className="mt-3 flex justify-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-0"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-200"></div>
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-400/50 rounded-2xl backdrop-blur-sm shadow-lg transition-all duration-500 ease-in-out">
            <div className="flex items-center justify-center space-x-2">
              <i className="fa-solid fa-exclamation-triangle text-red-400 text-xl animate-bounce"></i>
              <span className="text-red-200 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Main card */}
        <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 transform transition-all duration-500 hover:scale-[1.02] ${successStage === 'celebrating' ? 'scale-105 shadow-green-500/20 border-green-400/30 animate-pulse' : ''}`}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}
            </h2>
            <p className="bg-gradient-to-r from-blue-300 to-purple-300 text-transparent bg-clip-text text-sm font-medium">
              {isRegister ? 'Đăng ký để bắt đầu sàng lọc CV' : 'Đăng nhập để tiếp tục'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="email" className="block text-sm font-medium text-slate-200 mb-2">
                  <i className="fa-solid fa-envelope mr-2 text-blue-400"></i>
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 pl-12 border border-slate-600/50 rounded-xl shadow-sm bg-slate-800/50 backdrop-blur-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <i className="fa-solid fa-envelope absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                </div>
              </div>

              <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
                  <i className="fa-solid fa-lock mr-2 text-purple-400"></i>
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-3 pl-12 border border-slate-600/50 rounded-xl shadow-sm bg-slate-800/50 backdrop-blur-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <i className="fa-solid fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                </div>
              </div>

              {isRegister && (
                <div className="relative">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200 mb-2">
                    <i className="fa-solid fa-lock mr-2 text-pink-400"></i>
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="w-full px-4 py-3 pl-12 border border-slate-600/50 rounded-xl shadow-sm bg-slate-800/50 backdrop-blur-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <i className="fa-solid fa-lock absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center items-center py-3 px-6 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 hover:from-blue-600 hover:via-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
              >
                <i className={`fa-solid ${isRegister ? 'fa-user-plus' : 'fa-sign-in-alt'} mr-2`}></i>
                {isRegister ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </div>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-sm text-blue-300 hover:text-blue-200 transition-colors duration-200 underline underline-offset-2"
              >
                {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-slate-500 text-xs">
          <p>© 2025 Support Hr - Sàng lọc CV thông minh</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;