
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Users,
  Calendar,
  Map,
  ClipboardList,
  Shield,
  Swords,
  X,
  User,
  Ticket,
  LogOut,
  Home,
  Image,
  Clock,
  Upload,
  Settings,
  UserPlus
} from 'lucide-react';
import { UserRole, Match } from '../types';
import MembershipRequestForm from './MembershipRequestForm';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  userRole?: UserRole;
  onSignOut: () => void;
  teamLogo: string;
  onUpdateLogo: (url: string) => void;
  matches: Match[];
  currentUser?: { id?: string; name: string; username: string; avatarUrl?: string };
  linkedPlayer?: { name: string; avatarUrl?: string }; // Minimal player type needed
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, userRole = 'guest', onSignOut, teamLogo, onUpdateLogo, matches = [], currentUser, linkedPlayer }) => {
  const [imgError, setImgError] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset error state when prop changes
  useEffect(() => {
    setImgError(false);
  }, [teamLogo]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && userRole === 'admin') {
      // Basic size check (approx 2MB limit for local storage safety)
      if (file.size > 2 * 1024 * 1024) {
        alert("Image is too large. Please upload a logo smaller than 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const links = [
    { to: '/home', icon: <Home size={20} />, label: 'Home' },
    { to: '/roster', icon: <Users size={20} />, label: 'Squad Roster' },
    { to: '/opponents', icon: <Swords size={20} />, label: 'Opponent Teams' },
    { to: '/matches', icon: <Calendar size={20} />, label: 'Matches' },
    { to: '/selection', icon: <ClipboardList size={20} />, label: 'Match Selection' },
    { to: '/fielding', icon: <Map size={20} />, label: 'Fielding Board' },
    { to: '/live-scoring', icon: <Shield size={20} />, label: 'Live Scoring' },
    { to: '/memories', icon: <Image size={20} />, label: 'Memories' },
  ];

  if (userRole === 'admin') {
    links.push({ to: '/users', icon: <Settings size={20} />, label: 'User Management' });
  }

  const effectiveAvatar = linkedPlayer?.avatarUrl || currentUser?.avatarUrl;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={toggle}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-30 transform transition-transform duration-300 ease-in-out shadow-xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-screen flex flex-col
      `}>
        <div className="p-5 flex flex-col gap-2 shrink-0 bg-slate-950/30">
          <div className="flex items-center justify-between">
            {/* Brand Logo - Top Corner */}
            <div className="w-8 h-8"></div>
            <button onClick={toggle} className="md:hidden text-gray-400 hover:text-white" title="Close sidebar">
              <X size={24} />
            </button>
          </div>

          {/* Restored Team Name Section with Upload Capability */}
          <div className="flex items-center space-x-3 pt-4 border-t border-slate-800/50 mt-2">
            <div
              onClick={() => userRole === 'admin' && fileInputRef.current?.click()}
              className={`
                 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 
                 text-white overflow-hidden shrink-0 border border-blue-500/50 relative group
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
                <Shield size={20} />
              )}

              {/* Admin Upload Overlay */}
              {userRole === 'admin' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload size={14} className="text-white" />
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
            <Link to="/home" className="text-xl font-black tracking-tight leading-none hover:opacity-80 transition-opacity block">
              <span className="text-white">INDIAN</span><br />
              {/* Removed text stroke for simpler styling as requested previously */}
              <span className="text-[#4169E1]">STRIKERS</span>
            </Link>
          </div>
        </div>

        <nav className="mt-2 px-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => { if (window.innerWidth < 768) toggle(); }}
              className={({ isActive }) => `
                flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/50 translate-x-1'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                }
              `}
            >
              {link.icon}
              <span className="font-medium">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          {/* User Badge */}
          <div className="mb-4 flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden
                  ${!effectiveAvatar ? (
                  userRole === 'admin' ? 'bg-blue-600 text-white' :
                    userRole === 'member' ? 'bg-emerald-600 text-white' :
                      userRole === 'scorer' ? 'bg-purple-600 text-white' : 'bg-orange-500 text-white'
                ) : 'bg-slate-900 border border-slate-600'}
                `}>
                {effectiveAvatar ? (
                  <img src={effectiveAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userRole === 'admin' ? <Shield size={18} /> :
                    userRole === 'member' ? <User size={18} /> :
                      userRole === 'scorer' ? <ClipboardList size={18} /> : <Ticket size={18} />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Logged In</p>
                {/* Use linked player name if available, else current user name */}
                <p className="text-sm font-bold text-white capitalize truncate">{linkedPlayer?.name || currentUser?.name || userRole}</p>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-all"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* Join Us Button for Guests */}
          {userRole === 'guest' && (
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full mb-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              <UserPlus size={18} /> Join Us / Apply
            </button>
          )}

        </div>
      </aside >

      {/* Membership Request Modal */}
      {isJoinModalOpen && <MembershipRequestForm onClose={() => setIsJoinModalOpen(false)} />}
    </>
  );
};

export default Sidebar;
