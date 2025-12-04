
import React, { useState, useEffect } from 'react';
import { Shield, Users, Ticket, Lock, Loader2, ChevronRight, X, User } from 'lucide-react';
import { UserRole } from '../types';
import KirikINSLogo from './KirikINSLogo';

interface SplashScreenProps {
  onComplete: (role: UserRole) => void;
  teamLogo?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, teamLogo = '' }) => {
  // 0: Init, 1: Logo Reveal, 2: Text Reveal, 3: Buttons Reveal, 4: Auth Mode
  const [animationStep, setAnimationStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Loading Screen State
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [finalRole, setFinalRole] = useState<UserRole>('guest');

  useEffect(() => {
    setImgError(false);
  }, [teamLogo]);

  useEffect(() => {
    // Cinematic Sequence
    const timers = [
      setTimeout(() => setAnimationStep(1), 500),  // Logo Pop
      setTimeout(() => setAnimationStep(2), 1500), // Title Fade In
      setTimeout(() => setAnimationStep(3), 2200), // Buttons Slide Up
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  useEffect(() => {
    if (isAppLoading) {
      const fullText = "The Legacy of some Crackheads...";
      let currentIndex = 0;
      
      const startDelay = setTimeout(() => {
        const interval = setInterval(() => {
          if (currentIndex <= fullText.length) {
            setLoadingText(fullText.slice(0, currentIndex));
            currentIndex++;
          } else {
            clearInterval(interval);
            setTimeout(() => {
              onComplete(finalRole);
            }, 1000);
          }
        }, 80);
        return () => clearInterval(interval);
      }, 500);

      return () => clearTimeout(startDelay);
    }
  }, [isAppLoading, finalRole, onComplete]);

  const initiateAppEntry = (role: UserRole) => {
    setFinalRole(role);
    setIsAppLoading(true);
  };

  const handleRoleSelect = (role: UserRole) => {
    if (role === 'guest') {
      initiateAppEntry('guest');
    } else {
      setSelectedRole(role);
      setError('');
      setUserId('');
      setPassword('');
      setAnimationStep(4);
    }
  };

  const handleCloseAuth = () => {
    setAnimationStep(3);
    setSelectedRole(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);
      
      let isValid = false;
      const normalizedUser = userId.trim().toLowerCase();

      if (selectedRole === 'admin') {
         if (normalizedUser === 'admin' && password === 'admin123') {
           isValid = true;
         }
      } else if (selectedRole === 'member') {
         if (normalizedUser === 'member' && password === 'member123') {
           isValid = true;
         }
      }

      if (isValid && selectedRole) {
        initiateAppEntry(selectedRole);
      } else {
        setError('Invalid User ID or Password.');
      }
    }, 800);
  };

  if (isAppLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center font-sans overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-black"></div>
        <div className="relative z-10 text-center px-4 flex flex-col items-center">
           <div className="mb-8 animate-pulse">
              {/* Using team logo for loading screen */}
              {teamLogo && !imgError ? (
                  <img src={teamLogo} className="w-24 h-24 object-contain" />
              ) : (
                  <Shield size={64} className="text-blue-500" />
              )}
           </div>
           <h2 className="text-3xl md:text-5xl text-slate-300 font-cursive tracking-wide min-h-[60px]" style={{ fontFamily: '"Dancing Script", cursive' }}>
              {loadingText}
              <span className="animate-blink">|</span>
           </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Brand Logo - Top Left Corner */}
      <div className="absolute top-6 left-6 z-20 opacity-80 hover:opacity-100 transition-opacity">
        <KirikINSLogo size="medium" />
      </div>

      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-black opacity-90"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center h-full">
        
        {/* CENTER LOGO SECTION - RESTORED INDIAN STRIKERS */}
        <div className={`
          transform transition-all duration-1000 ease-out flex flex-col items-center justify-center w-full
          ${animationStep >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-10'}
          ${animationStep >= 3 ? '-translate-y-12 md:-translate-y-20' : ''} 
        `}>
          
          {/* Main Team Logo */}
          <div className="mb-6 transform hover:scale-105 transition-transform duration-500">
            <div className="w-32 h-32 md:w-48 md:h-48 bg-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.5)] border-4 border-white/10 relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-blue-500 opacity-50"></div>
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
               {teamLogo && !imgError ? (
                 <img 
                   src={teamLogo} 
                   onError={() => setImgError(true)}
                   className="w-full h-full object-cover z-10 relative" 
                   alt="Team Logo"
                 />
               ) : (
                 <Shield size={80} className="text-white z-10 relative drop-shadow-md" />
               )}
               {/* Shine effect */}
               <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:animate-[shine_1.5s_infinite]"></div>
            </div>
          </div>

          {/* Restored Indian Strikers Title */}
          <div className={`text-center w-full transform transition-all duration-1000 delay-300 ${animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-4xl md:text-7xl font-black mb-2 tracking-tight drop-shadow-2xl">
              <span className="text-white">INDIAN</span> <span className="text-[#4169E1]">STRIKERS</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-lg uppercase tracking-[0.3em] font-medium text-center">
              Official Team Management Portal
            </p>
          </div>
        </div>

        {/* LOGIN BUTTONS */}
        <div className={`
          w-full max-w-4xl grid md:grid-cols-3 gap-4 md:gap-6 mt-8
          transform transition-all duration-700 ease-out delay-100
          ${animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}
        `}>
          <button 
            onClick={() => handleRoleSelect('admin')}
            className="group relative bg-slate-800/60 hover:bg-slate-800 backdrop-blur-md border border-slate-700/50 hover:border-blue-500 rounded-xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-500/10 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Shield size={64} className="text-blue-500 rotate-12" /></div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Shield size={24} /></div>
            <h3 className="text-xl font-bold text-white mb-1">Team Admin</h3>
            <p className="text-xs text-slate-400 mb-4">Full management access</p>
            <div className="flex items-center text-xs font-bold text-blue-400 uppercase tracking-wider group-hover:text-white transition-colors">Login Required <ChevronRight size={14} className="ml-1" /></div>
          </button>

          <button 
            onClick={() => handleRoleSelect('member')}
            className="group relative bg-slate-800/60 hover:bg-slate-800 backdrop-blur-md border border-slate-700/50 hover:border-emerald-500 rounded-xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-emerald-500/10 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users size={64} className="text-emerald-500 rotate-12" /></div>
            <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Users size={24} /></div>
            <h3 className="text-xl font-bold text-white mb-1">Club Member</h3>
            <p className="text-xs text-slate-400 mb-4">Player & Staff access</p>
            <div className="flex items-center text-xs font-bold text-emerald-400 uppercase tracking-wider group-hover:text-white transition-colors">Login Required <ChevronRight size={14} className="ml-1" /></div>
          </button>

          <button 
            onClick={() => handleRoleSelect('guest')}
            className="group relative bg-slate-800/60 hover:bg-slate-800 backdrop-blur-md border border-slate-700/50 hover:border-orange-500 rounded-xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-orange-500/10 text-left overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Ticket size={64} className="text-orange-500 rotate-12" /></div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4 text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-colors"><Ticket size={24} /></div>
            <h3 className="text-xl font-bold text-white mb-1">Guest Fan</h3>
            <p className="text-xs text-slate-400 mb-4">View-only access</p>
            <div className="flex items-center text-xs font-bold text-orange-400 uppercase tracking-wider group-hover:text-white transition-colors">Enter App <ChevronRight size={14} className="ml-1" /></div>
          </button>
        </div>
      </div>

      {/* AUTH MODAL */}
      {animationStep === 4 && selectedRole && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden relative transform transition-all scale-100 opacity-100">
            <button onClick={handleCloseAuth} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full"><X size={20} /></button>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedRole === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                  {selectedRole === 'admin' ? <Shield className="text-white" size={24} /> : <Users className="text-white" size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white capitalize">{selectedRole} Login</h3>
                  {/* Removed hint text as requested previously */}
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      autoFocus
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="User ID"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white pl-12 pr-4 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white pl-12 pr-4 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>
                  {error && (
                    <div className="mt-2 text-red-400 text-xs flex items-center gap-1 animate-pulse">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                      {error}
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={!userId || !password || isAuthenticating}
                  className={`
                    w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4
                    ${selectedRole === 'admin' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20'}
                    ${(!userId || !password || isAuthenticating) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}
                  `}
                >
                  {isAuthenticating ? <Loader2 size={18} className="animate-spin" /> : 'Enter'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
