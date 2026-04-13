import React, { useState, useEffect } from 'react';
import { Shield, Users, Ticket, Lock, Loader2, ChevronRight, X, User, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRole } from '../types';
import KirikINSLogo from './KirikINSLogo';
import { login, addMembershipRequest, changePassword, forgotPassword, resetPassword } from '../services/storageService';

interface SplashScreenProps {
  onComplete: (role: UserRole, user?: { id?: string; name: string; username: string; avatarUrl?: string }) => void;
  teamLogo?: string;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, teamLogo = '' }) => {
  // 0: Init, 1: Logo Reveal, 2: Text Reveal, 3: Buttons Reveal, 4: Auth Mode
  const [animationStep, setAnimationStep] = useState(0);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  // Modals state
  const [showMembershipForm, setShowMembershipForm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<1|2>(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [pendingUser, setPendingUser] = useState<any>(null);

  const [memName, setMemName] = useState('');
  const [memEmail, setMemEmail] = useState('');
  const [memPhone, setMemPhone] = useState('');
  const [memSuccess, setMemSuccess] = useState(false);
  const [memSubmitting, setMemSubmitting] = useState(false);

  // Loading Screen State
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);
  const [finalRole, setFinalRole] = useState<UserRole>('guest');
  const [currentUser, setCurrentUser] = useState<{ id?: string; name: string; username: string; avatarUrl?: string }>();
  const progressBarRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.setProperty('--progress-width', `${progress}%`);
    }
  }, [progress]);

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
      const fullText = "Initializing Strikers Pulse...";
      let currentIndex = 0;
      setProgress(0);

      const startDelay = setTimeout(() => {
        const interval = setInterval(() => {
          if (currentIndex <= fullText.length) {
            setLoadingText(fullText.slice(0, currentIndex));
            // Calculate progress based on text completion
            const currentProgress = Math.min(100, Math.round((currentIndex / fullText.length) * 100));
            setProgress(currentProgress);
            currentIndex++;
          } else {
            clearInterval(interval);
            setTimeout(() => {
              onComplete(finalRole, currentUser);
            }, 1000);
          }
        }, 80);
        return () => clearInterval(interval);
      }, 500);

      return () => clearTimeout(startDelay);
    }
  }, [isAppLoading, finalRole, currentUser, onComplete]);

  const initiateAppEntry = (role: UserRole, user?: { id?: string; name: string; username: string; avatarUrl?: string }) => {
    setFinalRole(role);
    if (user) setCurrentUser(user);
    setIsAppLoading(true);
  };

  const handleGuestEntry = () => {
    initiateAppEntry('guest');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAuthenticating(true);

    const normalizedUser = userId.trim();

    login(normalizedUser, password, 'auto')
      .then(res => {
        sessionStorage.setItem('authToken', res.token);
        // Use full user object if available, otherwise fallback
        const userObj = res.user || { name: res.username || normalizedUser, username: res.username || normalizedUser };
        
        if (res.user?.isFirstLogin) {
          setPendingUser({ role: res.role, userObj });
          setIsAuthenticating(false);
          setShowChangePassword(true);
        } else {
          initiateAppEntry(res.role, userObj);
        }
      })
      .catch(err => {
        setError('Invalid User ID or Password.');
        setIsAuthenticating(false);
      });
  };

  const submitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError('Password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');
    setError('');
    setIsAuthenticating(true);
    try {
      await changePassword(password, newPassword);
      setShowChangePassword(false);
      clearModalStates();
      initiateAppEntry(pendingUser.role, pendingUser.userObj);
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
      setIsAuthenticating(false);
    }
  };

  const submitForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAuthenticating(true);
    try {
      if (forgotStep === 1) {
        const res = await forgotPassword(memEmail);
        if(res.mock_token) alert('Reset code: ' + res.mock_token); // Demo purpose
        setForgotStep(2);
      } else {
        if (newPassword !== confirmPassword) return setError('Passwords do not match.');
        await resetPassword(memEmail, resetToken, newPassword);
        alert('Password reset successful. Please sign in with your new password.');
        setShowForgotPassword(false);
        setForgotStep(1);
        setMemEmail('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
      }
    } catch(err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const clearModalStates = () => {
    setError('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
  };

  const submitMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemSubmitting(true);
    try {
      await addMembershipRequest({
        name: memName,
        email: memEmail,
        contactNumber: memPhone,
        associatedBefore: 'No',
        associationYear: ''
      });
      setMemSuccess(true);
    } catch (e) {
      alert("Failed to submit. Please try again.");
    } finally {
      setMemSubmitting(false);
    }
  };

  if (isAppLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center font-sans overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-black"></div>
        <div className="relative z-10 text-center px-4 flex flex-col items-center">
          <div className="mb-8 animate-pulse">
            {/* Using team logo for loading screen */}
            {teamLogo && !imgError ? (
              <img src={teamLogo} className="w-24 h-24 object-contain" alt="Team Logo" />
            ) : (
              <img src="/INS%20LOGO.PNG" className="w-24 h-24 object-contain" alt="INS" />
            )}
          </div>
          <h2 className="text-3xl md:text-5xl text-slate-300 font-cursive tracking-wide min-h-[60px]">
            {loadingText}
            <span className="animate-blink">|</span>
          </h2>

          {/* Progress Bar */}
          <div className="w-64 max-w-[80%] h-1 bg-slate-800/50 rounded-full mt-8 overflow-hidden relative backdrop-blur-sm">
            <div
              ref={progressBarRef}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)] progress-fill"
            >
              <div className="absolute inset-0 bg-white/30 w-full animate-[shimmer_1s_infinite] origin-left scale-x-0"></div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-slate-500 text-xs font-mono tracking-widest uppercase">
            <span>Loading Assets</span>
            <span className="text-blue-400">{progress}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto font-sans">
      {/* Brand Logo - Top Left Corner */}
      <div className="absolute top-6 left-6 z-20 opacity-80 hover:opacity-100 transition-opacity">
        <KirikINSLogo size="medium" />
      </div>

      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-black opacity-90"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        <div className="absolute inset-0 opacity-10 bg-dot-pattern"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center min-h-screen py-12">

        {/* CENTER LOGO SECTION - RESTORED INDIAN STRIKERS */}
        <div className={`
          transform transition-all duration-1000 ease-out flex flex-col items-center justify-center w-full
          ${animationStep >= 1 ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 translate-y-10'}
          ${animationStep >= 3 ? '-translate-y-2 md:-translate-y-6' : ''} 
        `}>

          {/* Main Team Logo */}
          <div className="mb-4 transform hover:scale-105 transition-transform duration-500">
            <div className="w-28 h-28 md:w-36 md:h-36 bg-transparent rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.3)] border-4 border-white/10 relative overflow-hidden group">
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
                <Shield size={64} className="text-white z-10 relative drop-shadow-md" />
              )}
              {/* Shine effect */}
              <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:animate-[shine_1.5s_infinite]"></div>
            </div>
          </div>

          {/* Restored Indian Strikers Title */}
          <div className={`text-center w-full transform transition-all duration-1000 delay-300 ${animationStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-4xl md:text-6xl font-black mb-1 tracking-tight drop-shadow-2xl">
              <span className="text-white">INDIAN</span> <span className="text-[#4169E1]">STRIKERS</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm uppercase tracking-[0.2em] font-medium text-center">
              Official Team Management Portal
            </p>
          </div>
        </div>

        {/* UNIFIED LOGIN / ACTIONS */}
        <div className={`
          w-full max-w-md mt-6 relative
          transform transition-all duration-700 ease-out delay-100
          ${animationStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}
        `}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-transparent rounded-xl flex items-center justify-center overflow-hidden">
                  <motion.img 
                    src="/cricket-hit.png" 
                    alt="Hit"
                    className="w-full h-full object-contain"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, -10, 10, 0],
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider">Sign In</h3>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="Email or User ID"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white pl-12 pr-4 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white pl-12 pr-12 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {error && (
                    <div className="mt-2 text-red-400 text-xs flex items-center gap-1 animate-pulse">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                      {error}
                    </div>
                  )}
                </div>

                <div className="flex justify-end mb-4">
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!userId || !password || isAuthenticating}
                  className={`
                    w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4 shadow-lg shadow-blue-600/20
                    ${(!userId || !password || isAuthenticating) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}
                  `}
                >
                  {isAuthenticating ? <Loader2 size={18} className="animate-spin" /> : 'Enter Portal'}
                </button>
              </form>
              
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => setShowMembershipForm(true)}
                  className="w-full py-2 text-sm text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded-lg transition-colors group"
                >
                  <span className="font-medium text-slate-300 group-hover:text-white transition-colors">Not a Member?</span> Apply Here
                </button>
                <button
                  onClick={handleGuestEntry}
                  className="w-full py-2 text-sm text-orange-400 hover:text-orange-300 group transition-colors flex items-center justify-center gap-2"
                >
                  <Ticket size={16} /> Continue as Guest <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* MEMBERSHIP APPLICATION MODAL */}
      {showMembershipForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden relative">
            <button onClick={() => { setShowMembershipForm(false); setMemSuccess(false); clearModalStates(); }} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full" title="Close"><X size={20} /></button>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                  <Users className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Membership Application</h3>
                </div>
              </div>

              {memSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                    <Users size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Application Received!</h4>
                  <p className="text-slate-400 text-sm mb-6">We have received your membership request and our admins will review it shortly. You will get an update via email or phone.</p>
                  <button onClick={() => setShowMembershipForm(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors">Return to Login</button>
                </div>
              ) : (
                <form onSubmit={submitMembership} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={memName}
                      onChange={(e) => setMemName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 text-white px-4 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Email</label>
                    <input
                      required
                      type="email"
                      value={memEmail}
                      onChange={(e) => setMemEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 text-white px-4 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Contact Number</label>
                    <input
                      required
                      type="tel"
                      value={memPhone}
                      onChange={(e) => setMemPhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 text-white px-4 py-3 rounded-xl outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!memName || !memEmail || !memPhone || memSubmitting}
                    className={`
                      w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-6 shadow-lg shadow-emerald-600/20
                      ${(!memName || !memEmail || !memPhone || memSubmitting) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}
                    `}
                  >
                    {memSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Submit Application'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangePassword && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <Lock className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Create New Password</h3>
                <p className="text-slate-400 text-sm">Mandatory for first-time login</p>
              </div>
            </div>
            <form onSubmit={submitChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">New Password</label>
                <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" minLength={6} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Confirm New Password</label>
                <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white px-4 py-3 rounded-xl outline-none" minLength={6} />
              </div>
               {error && <div className="text-red-400 text-sm">{error}</div>}
              <button disabled={isAuthenticating || newPassword.length < 6} type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold">
                {isAuthenticating ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Set Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD MODAL */}
      {showForgotPassword && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 relative">
            <button onClick={() => { setShowForgotPassword(false); setForgotStep(1); clearModalStates(); }} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors" title="Close" aria-label="Close"><X size={20} /></button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                <Lock className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Reset Password</h3>
                <p className="text-slate-400 text-sm">Recover your account</p>
              </div>
            </div>
            
            <form onSubmit={submitForgotPassword} className="space-y-4">
              {forgotStep === 1 ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Registered Email</label>
                    <input required type="email" value={memEmail} onChange={e => setMemEmail(e.target.value)} placeholder="email@example.com" className="w-full bg-slate-800 border border-slate-700 focus:border-orange-500 text-white px-4 py-3 rounded-xl outline-none" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Reset Code</label>
                    <input required type="text" value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="6-digit code" className="w-full bg-slate-800 border border-slate-700 focus:border-orange-500 text-white px-4 py-3 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">New Password</label>
                    <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="w-full bg-slate-800 border border-slate-700 focus:border-orange-500 text-white px-4 py-3 rounded-xl outline-none" minLength={6} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Confirm New Password</label>
                    <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className="w-full bg-slate-800 border border-slate-700 focus:border-orange-500 text-white px-4 py-3 rounded-xl outline-none" minLength={6} />
                  </div>
                </>
              )}
               {error && <div className="text-red-400 text-sm">{error}</div>}
              <button disabled={isAuthenticating || (forgotStep===1?!memEmail:false)} type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl font-bold mt-2">
                {isAuthenticating ? <Loader2 size={18} className="animate-spin mx-auto" /> : (forgotStep === 1 ? 'Send Code' : 'Reset Password')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
