
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Map,
  Shield,
  ClipboardList,
  Swords,
  X,
  User,
  Ticket,
  LogOut,
  Home,
  Image,
  Upload,
  Settings,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Trophy,
  MapPin,
  Calendar,
  Key,
  Lock,
  Loader2
} from 'lucide-react';
import { APP_VERSION } from '../src/version';
import { UserRole, MembershipRequest, AppUser, Player } from '../types';
import MembershipRequestForm from './MembershipRequestForm';
import { getMembershipRequests, changePassword } from '../services/storageService';
import { useMatchCenter } from '../store/matchStore';

interface SidebarProps {
  userRole?: UserRole;
  effectiveRole?: UserRole;
  isAdminView?: boolean;
  onToggleAdminView?: () => void;
  onSignOut: () => void;
  teamLogo: string;
  onUpdateLogo: (url: string) => void;
  isOffline?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole = 'guest', effectiveRole = 'guest', isAdminView = false, onToggleAdminView, onSignOut, teamLogo, onUpdateLogo, isOffline }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1024);
  const [pendingRequests, setPendingRequests] = useState(0);

  const [showConfig, setShowConfig] = useState(false);
  const [cpwPassword, setCpwPassword] = useState('');
  const [cpwNewPassword, setCpwNewPassword] = useState('');
  const [cpwConfirmPassword, setCpwConfirmPassword] = useState('');
  const [cpwMessage, setCpwMessage] = useState('');
  const [cpwSubmitting, setCpwSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset error state when prop changes
  useEffect(() => {
    setImgError(false);
  }, [teamLogo]);

  // Fetch pending membership requests for admin
  useEffect(() => {
    if (userRole === 'admin') {
      const fetchCount = async () => {
        try {
          const reqs = await getMembershipRequests();
          const pending = reqs.filter(r => r.status === 'Pending').length;
          setPendingRequests(pending);
        } catch (e) { console.error("Sidebar: Failed to fetch requests", e); }
      };
      fetchCount();
      // Poll every 5 minutes
      const interval = setInterval(fetchCount, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const handleCpwSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpwMessage('');
    if (cpwNewPassword.length < 6) return setCpwMessage('New password must be at least 6 characters');
    if (cpwNewPassword !== cpwConfirmPassword) return setCpwMessage('Passwords do not match');
    setCpwSubmitting(true);
    try {
      await changePassword(cpwPassword, cpwNewPassword);
      setCpwMessage('Password updated successfully!');
      setTimeout(() => {
        setShowConfig(false);
        setCpwPassword('');
        setCpwNewPassword('');
        setCpwConfirmPassword('');
        setCpwMessage('');
      }, 2000);
    } catch (err: any) {
      setCpwMessage(err.message || 'Failed to update');
    } finally {
      setCpwSubmitting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && userRole === 'admin') {
      // Basic size check (approx 2MB limit for local storage safety)
      if (file.size > 1 * 1024 * 1024) {
        alert("Image is too large. Please upload a logo smaller than 1MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  interface SidebarLink {
    to: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
  }

  const mainLinks: SidebarLink[] = [
    { to: '/home', icon: <Home size={20} />, label: 'Home' },
    { to: '/match-center', icon: <Calendar size={20} />, label: 'Match Center' },
    { to: '/league-center', icon: <Trophy size={20} />, label: 'League Center' },
    { to: '/roster', icon: <Users size={20} />, label: 'Squad Roster' },

    { to: '/fielding', icon: <Map size={20} />, label: 'Fielding Board' },
    { to: '/memories', icon: <Image size={20} />, label: 'Memories' },
  ];

  const controlPanelLinks: SidebarLink[] = [];

  mainLinks.push({ to: '/scorer', icon: <ClipboardList size={20} />, label: 'Live Scores' });

  if (effectiveRole === 'admin') {
    controlPanelLinks.push({
      to: '/control-panel/grounds',
      icon: <Settings size={20} />,
      label: 'Control Panel',
      badge: pendingRequests > 0 ? pendingRequests : undefined
    });
  }

  return (
    <>
      {/* Sidebar */}
      <aside className={`
        sticky top-0 h-screen bg-slate-900 text-white z-30 transition-all duration-300 ease-in-out flex flex-col shrink-0 shadow-xl border-r border-slate-800
        ${isCollapsed ? 'w-16' : 'w-48 md:w-52'}
      `}>
        <div className={`pt-4 pb-4 px-5 flex flex-col gap-6 shrink-0 bg-slate-950/30 relative transition-all ${isCollapsed ? 'items-center px-2' : ''}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all absolute -right-5 top-18 z-50 border border-slate-700 shadow-xl"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Restored Team Name Section with Upload Capability */}
          <div className={`flex items-center transition-all ${isCollapsed ? 'justify-center space-x-0' : 'space-x-'}`}>
            <div
              onClick={() => userRole === 'admin' && fileInputRef.current?.click()}
              className={`
                w-15 h-15 bg-transparent rounded-xl flex items-center justify-center 
                text-white overflow-hidden shrink-0 border border-white/10 relative group
                ${userRole === 'admin' ? 'cursor-pointer hover:border-white transition-colors' : ''}
              `}
              title={userRole === 'admin' ? "Click to change logo" : ""}
            >
              {teamLogo && !imgError ? (
                <img
                  src={teamLogo}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                  alt="Team Logo"
                />
              ) : (
                <img src="/INS%20LOGO.PNG" alt="INS" className="w-16 h-16 object-contain" />
              )}

              {/* Admin Upload Overlay */}
              {userRole === 'admin' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload size={16} className="text-white" />
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
                title="Upload Team Logo"
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <Link to="/home" className="text-xl font-black tracking-tight leading-none hover:opacity-80 transition-opacity block truncate">
                  <span className="text-white">INDIAN</span><br />
                  <span className="text-[#4169E1]">STRIKERS</span>
                </Link>
                {isOffline && (
                  <div className="flex items-center gap-3 mt-1 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Database Offline</span>
                  </div>
                )}
              </div>
            )}
            {isCollapsed && isOffline && (
              <div className="absolute top-0 right-0 -mt-1 -mr-1">
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-slate-900 shadow-lg animate-pulse"></div>
              </div>
            )}
          </div>
        </div>

        <nav className={`mt-6 px-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar transition-all ${isCollapsed ? 'px-2' : ''}`}>
          {/* Admin Switcher */}
          {userRole === 'admin' && (
            <button
              onClick={onToggleAdminView}
              className={`
                w-full flex items-center rounded-xl transition-all duration-300 group
                ${isCollapsed ? 'justify-center p-2' : 'space-x-2 px-1 py-2'}
                ${isAdminView
                  ? 'bg-blue-400/10 text-blue-300 border border-blue-400/20'
                  : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                }
                hover:scale-[1.02] active:scale-95
              `}
              title={isCollapsed ? (isAdminView ? "Switch to Member" : "Switch to Admin") : ""}
            >
              <div className="shrink-0">
                {isAdminView ? <Shield size={20} /> : <User size={20} />}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col items-start leading-none">
                  <span className="font-bold text-[10px]">{isAdminView ? 'ADMIN MODE' : 'MEMBER MODE'}</span>
                </div>
              )}
            </button>
          )}

          {/* Main Links */}
          {mainLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              title={isCollapsed ? link.label : ""}
              className={({ isActive }) => `
                flex items-center rounded-xl transition-all duration-200 relative
                ${isCollapsed ? 'justify-center p-2' : 'space-x-2 px-1 py-3'}
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50' + (isCollapsed ? '' : ' translate-x-1')
                  : 'text-slate-400 hover:bg-white/5 hover:text-white' + (isCollapsed ? '' : ' hover:translate-x-1')
                }
              `}
            >
              <div className="shrink-0">{link.icon}</div>
              {!isCollapsed && <span className="font-medium truncate">{link.label}</span>}

              {/* Notification Badge */}
              {(link as any).badge && (
                <span className={`
                  absolute flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full
                  ${isCollapsed ? 'top-1 right-1 w-4 h-4' : 'right-4 px-1.5 py-0.5 min-w-[18px]'}
                `}>
                  {(link as any).badge}
                </span>
              )}
            </NavLink>
          ))}

          {/* Control Panel Section */}
          {controlPanelLinks.length > 0 && (
            controlPanelLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                title={isCollapsed ? link.label : ""}
                className={({ isActive }) => `
                  flex items-center rounded-xl transition-all duration-200 relative
                  ${isCollapsed ? 'justify-center p-2' : 'space-x-2 px-1 py-2'}
                  ${isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/50' + (isCollapsed ? '' : ' translate-x-1')
                    : 'text-slate-400 hover:bg-white/5 hover:text-white' + (isCollapsed ? '' : ' hover:translate-x-1')
                  }
                `}
              >
                <div className="shrink-0">{link.icon}</div>
                {!isCollapsed && <span className="font-medium truncate">{link.label}</span>}

                {/* Notification Badge */}
                {(link as any).badge && (
                  <span className={`
                    absolute flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full
                    ${isCollapsed ? 'top-1 right-1 w-4 h-4' : 'right-4 px-1.5 py-0.5 min-w-[18px]'}
                  `}>
                    {(link as any).badge}
                  </span>
                )}
              </NavLink>
            ))
          )}
        </nav>

        <UserFooter
          isCollapsed={isCollapsed}
          userRole={userRole}
          onSignOut={onSignOut}
          onShowConfig={() => setShowConfig(true)}
          isJoinModalOpen={isJoinModalOpen}
          setIsJoinModalOpen={setIsJoinModalOpen}
        />
      </aside >

      {/* Change Password Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative">
            <button onClick={() => { setShowConfig(false); setCpwMessage(''); setCpwPassword(''); setCpwNewPassword(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors" title="Close" aria-label="Close"><X size={20} /></button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Lock className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Change Password</h3>
              </div>
            </div>

            <form onSubmit={handleCpwSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Current Password</label>
                <input required type="password" value={cpwPassword} onChange={e => setCpwPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white px-4 py-2.5 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">New Password</label>
                <input required type="password" value={cpwNewPassword} onChange={e => setCpwNewPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white px-4 py-2.5 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 pl-1">Confirm New Password</label>
                <input required type="password" value={cpwConfirmPassword} onChange={e => setCpwConfirmPassword(e.target.value)} placeholder="Repeat new password" minLength={6} className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 text-white px-4 py-2.5 rounded-xl outline-none" />
              </div>
              {cpwMessage && <div className={`text-sm ${cpwMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{cpwMessage}</div>}
              <button disabled={cpwSubmitting || cpwNewPassword.length < 6} type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold mt-2">
                {cpwSubmitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Membership Request Modal */}
      {isJoinModalOpen && <MembershipRequestForm onClose={() => setIsJoinModalOpen(false)} />}
    </>
  );
};

const UserFooter: React.FC<{
  isCollapsed: boolean;
  userRole: UserRole;
  onSignOut: () => void;
  onShowConfig: () => void;
  isJoinModalOpen: boolean;
  setIsJoinModalOpen: (open: boolean) => void;
}> = ({ isCollapsed, userRole, onSignOut, onShowConfig, isJoinModalOpen, setIsJoinModalOpen }) => {
  const navigate = useNavigate();
  const currentUser = useMatchCenter(state => state.currentUser);
  const squadPlayers = useMatchCenter(state => state.squadPlayers);

  const linkedPlayer = React.useMemo(() => {
    if (!currentUser?.id) return null;
    return squadPlayers.find(p => String(p.linkedUserId) === String(currentUser.id));
  }, [currentUser?.id, squadPlayers]);

  const photoURL = linkedPlayer?.avatarUrl || currentUser?.avatarUrl;

  return (
    <div className={`mt-auto border-t border-slate-800 bg-slate-900/80 backdrop-blur-md transition-all ${isCollapsed ? 'p-1' : 'p-6'}`}>
      {/* User Badge */}
      <div
        onClick={() => {
          if (linkedPlayer?.id) {
            navigate(`/roster?id=${linkedPlayer.id}`);
          }
        }}
        title={isCollapsed ? (linkedPlayer?.name || currentUser?.name || userRole) : ""}
        className={`mb-4 flex items-center bg-slate-800 rounded-xl border border-slate-700 transition-all ${isCollapsed ? 'justify-center p-1' : 'justify-between p-3'} ${linkedPlayer?.id ? 'cursor-pointer hover:bg-slate-700/50 group/user' : ''}`}
      >
        <div className={`flex items-center transition-all ${isCollapsed ? 'justify-center' : 'gap-3 overflow-hidden'}`}>
          <div className={`
              rounded-full flex items-center justify-center shrink-0 overflow-hidden transition-all
              ${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'}
              ${!photoURL ? (
              userRole === 'admin' ? 'bg-blue-600 text-white' :
                (currentUser?.canScore) ? 'bg-purple-600 text-white' :
                  userRole === 'member' ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'
            ) : 'bg-slate-900 border border-slate-600'}
            `}>
            {photoURL ? (
              <img src={photoURL} alt="Avatar" className="w-full h-full object-cover group-hover/user:scale-110 transition-transform" />
            ) : (
              userRole === 'admin' ? <Shield size={18} /> :
                (currentUser?.canScore) ? <ClipboardList size={18} /> :
                  userRole === 'member' ? <User size={18} /> : <Ticket size={18} />
            )}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Logged In</p>
              <p className="text-sm font-bold text-white capitalize truncate group-hover/user:text-blue-300 transition-colors">
                {(linkedPlayer?.name || currentUser?.name || userRole).split(' ')[0]}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Actions */}
      <div className={`flex mb-4 ${isCollapsed ? 'flex-col gap-1' : 'gap-2'}`}>
        {currentUser?.id && (
          <button
            onClick={onShowConfig}
            title={isCollapsed ? "Change Password" : ""}
            className={`flex-1 flex items-center justify-center gap-1 font-bold text-slate-500 hover:text-blue-400 hover:bg-blue-950/20 rounded-lg transition-all border border-transparent hover:border-blue-900/30 ${isCollapsed ? 'p-2' : 'py-2 text-[8px]'}`}
          >
            <Key size={isCollapsed ? 18 : 14} />
            {!isCollapsed && <span>PASSWORD</span>}
          </button>
        )}
        <button
          onClick={onSignOut}
          title={isCollapsed ? "Sign Out" : ""}
          className={`flex-1 flex items-center justify-center gap-1 font-bold text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-all border border-transparent hover:border-red-900/30 ${isCollapsed ? 'p-2' : 'py-2 text-[8px]'}`}
        >
          <LogOut size={isCollapsed ? 18 : 14} />
          {!isCollapsed && <span>SIGN OUT</span>}
        </button>
      </div>

      {/* Join Us Button for Guests */}
      {userRole === 'guest' && (
        <button
          onClick={() => setIsJoinModalOpen(true)}
          title={isCollapsed ? "Join Us" : ""}
          className={`w-full mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center transition-all hover:scale-[1.02] ${isCollapsed ? 'p-3' : 'p-3 gap-2'}`}
        >
          <UserPlus size={isCollapsed ? 20 : 18} />
          {!isCollapsed && <span>Join Us / Apply</span>}
        </button>
      )}

      {/* Version Display */}
      <div className={`mt-2 pt-2 pb-4 border-t border-slate-800/50 flex flex-col items-center opacity-80 ${isCollapsed ? 'px-0' : 'px-0'}`}>
        <span className="text-[7px] font-black tracking-[0.2em] text-slate-400 uppercase">
          {isCollapsed ? APP_VERSION.split('-')[0] : APP_VERSION}
        </span>
      </div>
    </div>
  );
};

export default Sidebar;
