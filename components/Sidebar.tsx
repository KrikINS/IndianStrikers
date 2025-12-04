
import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
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
  Upload
} from 'lucide-react';
import { UserRole, Match } from '../types';
import KirikINSLogo from './KirikINSLogo';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  userRole?: UserRole;
  onSignOut: () => void;
  teamLogo: string;
  onUpdateLogo: (url: string) => void;
  matches: Match[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, userRole = 'guest', onSignOut, teamLogo, onUpdateLogo, matches = [] }) => {
  const [imgError, setImgError] = useState(false);
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Reset error state when prop changes
  useEffect(() => {
    setImgError(false);
  }, [teamLogo]);

  // Next Match Logic
  useEffect(() => {
    if (!matches || !Array.isArray(matches)) {
        setNextMatch(null);
        return;
    }

    const upcoming = matches
        .filter(m => m.isUpcoming)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setNextMatch(upcoming.length > 0 ? upcoming[0] : null);
  }, [matches]);

  // Countdown Logic
  useEffect(() => {
    if (!nextMatch) return;

    const calculateTimeLeft = () => {
      const matchDateStr = nextMatch.date;
      const matchTimeStr = nextMatch.tossTime || '00:00';
      
      const targetDate = new Date(`${matchDateStr}T${matchTimeStr}`);
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        if (targetDate.toDateString() === now.toDateString()) {
             return "Today!";
        }
        return "Started";
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) return `${days}d ${hours}h`;
      return `${hours}h ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000);

    return () => clearInterval(interval);
  }, [nextMatch]);

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
    { to: '/scorecard', icon: <Shield size={20} />, label: 'Scorecard' },
    { to: '/memories', icon: <Image size={20} />, label: 'Memories' },
  ];

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
             <div className="opacity-90 hover:opacity-100 transition-opacity">
               <KirikINSLogo size="medium" />
             </div>
             <button onClick={toggle} className="md:hidden text-gray-400 hover:text-white">
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
               />
             </div>
             <span className="text-xl font-black tracking-tight leading-none">
               <span className="text-white">INDIAN</span><br/>
               <span className="text-[#4169E1]">STRIKERS</span>
             </span>
          </div>
        </div>

        <nav className="mt-2 px-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => { if(window.innerWidth < 768) toggle(); }}
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
                  w-10 h-10 rounded-full flex items-center justify-center shrink-0
                  ${userRole === 'admin' ? 'bg-blue-600 text-white' : 
                    userRole === 'member' ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white'}
                `}>
                  {userRole === 'admin' ? <Shield size={18} /> : userRole === 'member' ? <User size={18} /> : <Ticket size={18} />}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Logged In</p>
                  <p className="text-sm font-bold text-white capitalize truncate">{userRole}</p>
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

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-xl border border-slate-700/50 shadow-inner min-h-[140px] flex flex-col justify-center">
            {nextMatch ? (
              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-green-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar size={12} /> Next Match
                    </p>
                    {timeLeft && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold animate-pulse">{timeLeft}</span>}
                 </div>
                 
                 <div>
                   <p className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">VS Opponent</p>
                   <p className="text-white font-bold text-lg leading-tight truncate">{nextMatch.opponent}</p>
                 </div>

                 <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400 text-[10px] font-bold uppercase">Date</p>
                      <p className="text-slate-200">{new Date(nextMatch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] font-bold uppercase">Ground</p>
                      <p className="text-slate-200 truncate" title={nextMatch.venue}>{nextMatch.venue}</p>
                    </div>
                 </div>
                 
                 {nextMatch.tossTime && (
                   <div className="flex items-center gap-1 text-xs text-orange-300 font-medium">
                     <Clock size={12} /> Toss at {nextMatch.tossTime}
                   </div>
                 )}
              </div>
            ) : (
              <div className="text-center py-2 space-y-2">
                 <div className="w-10 h-10 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto text-slate-500">
                    <Calendar size={20} />
                 </div>
                 <div>
                   <p className="text-slate-300 font-bold text-sm">No Upcoming Matches</p>
                   <p className="text-slate-500 text-xs mt-1">Match announcement coming soon</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
