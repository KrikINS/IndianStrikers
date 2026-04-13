import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PlayerList from './components/PlayerList';
import FieldingMap from './components/FieldingMap';
import OpponentTeams from './components/OpponentTeams';
import Memories from './components/Memories';
import SplashScreen from './components/SplashScreen';
import ScorerDashboard from './components/ScorerDashboard';
import LegacyEditor from './components/LegacyEditor';
import MatchCenter from './components/MatchCenter';
import ControlPanel from './components/ControlPanel';
import { useMatchCenter } from './components/matchCenterStore';
import { useMasterData } from './components/masterDataStore';
import GroundsManager from './components/GroundsManager';
import TournamentsManager from './components/TournamentsManager';
import UserManagement from './components/UserManagement';
import { ScorecardPage } from './components/ScorecardPage';
import LiveScorecardPage from './components/LiveScorecardPage';
import { Player, UserRole, OpponentTeam } from './types';
import { getPlayers, addPlayer, updatePlayer, deletePlayer, getOpponents, addOpponent, updateOpponent, deleteOpponent, getTeamLogo, saveTeamLogo, getMatches } from './services/storageService';
import { Menu, Shield, ArrowRight } from 'lucide-react';
import KirikINSLogo from './components/KirikINSLogo';

declare global {
  interface Window {
    refreshAppData: () => Promise<void>;
  }
}

const Unauthorized = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white/[0.02] backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl mx-auto max-w-2xl mt-12 animate-in fade-in zoom-in duration-500">
    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20 shadow-[0_0_50px_-12px_rgba(239,68,68,0.5)]">
      <Shield size={48} className="text-red-500" strokeWidth={1.5} />
    </div>
    <h1 className="text-4xl font-black text-black mb-4 uppercase italic tracking-tighter">Not Authorized</h1>
    <p className="text-slate-400 max-w-md mb-10 text-lg leading-relaxed">
      You are not authorized to access this Page. Please contact the administrator to upgrade your access level or return to the main dashboard.
    </p>
    <Link to="/home" className="group relative px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-[0_10px_30px_-10px_rgba(37,99,235,0.6)] uppercase tracking-[0.2em] text-xs flex items-center gap-3 active:scale-95">
      <span>Return Home</span>
      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
    </Link>
  </div>
);

const AppContent: React.FC<{
  players: Player[],
  opponents: OpponentTeam[],
  userRole: UserRole,
  onAddPlayer: (p: Player) => void,
  onUpdatePlayer: (p: Player) => void,
  onDeletePlayer: (id: string) => void,
  onAddOpponent: (t: OpponentTeam) => void,
  onUpdateOpponent: (t: OpponentTeam) => void,
  onDeleteOpponent: (id: string) => void,
  onSignOut: () => void,
  teamLogo: string,
  onUpdateLogo: (url: string) => void,
  isAdminView: boolean,
  onToggleAdminView: () => void,
  currentUser?: { id?: string; name: string; username: string; avatarUrl?: string; canScore?: boolean },
  linkedPlayer?: Player,
  onRefresh: () => Promise<void>
}> = ({ players, opponents, userRole, onAddPlayer, onUpdatePlayer, onDeletePlayer, onAddOpponent, onUpdateOpponent, onDeleteOpponent, onSignOut, teamLogo, onUpdateLogo, isAdminView, onToggleAdminView, currentUser, linkedPlayer, onRefresh }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const effectiveRole = userRole === 'admin' ? (isAdminView ? 'admin' : 'member') : userRole;

  useEffect(() => {
    const handleBackButton = async () => {
      // If on home screen, exit app
      if (location.pathname === '/home' || location.pathname === '/') {
        await CapacitorApp.exitApp();
      } else {
        // Otherwise go back in history
        navigate(-1);
      }
    };

    // Add listener
    const listener = CapacitorApp.addListener('backButton', handleBackButton);

    // Cleanup
    return () => {
      listener.then(l => l.remove());
    };
  }, [location, navigate]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
        <Sidebar
          userRole={userRole}
          effectiveRole={effectiveRole}
          isAdminView={isAdminView}
          onToggleAdminView={onToggleAdminView}
          onSignOut={onSignOut}
          teamLogo={teamLogo}
          onUpdateLogo={onUpdateLogo}
          currentUser={currentUser}
          linkedPlayer={linkedPlayer}
        />

        <main className="flex-1 min-w-0 transition-all duration-300 relative h-screen overflow-y-auto">
          <div className="p-3 md:p-6 lg:p-8 w-full pb-24 md:pb-8">
            <Routes>
              <Route path="/home" element={<Dashboard players={players} userRole={effectiveRole} teamLogo={teamLogo} currentUser={currentUser} />} />
              <Route
                path="/roster"
                element={
                  <PlayerList
                    players={players}
                    userRole={effectiveRole}
                    currentUser={currentUser}
                    onAddPlayer={onAddPlayer}
                    onUpdatePlayer={onUpdatePlayer}
                    onDeletePlayer={onDeletePlayer}
                  />
                }
              />
              <Route path="/fielding" element={<FieldingMap players={players} userRole={effectiveRole} currentUser={currentUser} />} />
              <Route
                path="/opponents"
                element={
                  <OpponentTeams
                    teams={opponents}
                    onAddTeam={onAddOpponent}
                    onUpdateTeam={onUpdateOpponent}
                    onDeleteTeam={onDeleteOpponent}
                    userRole={effectiveRole}
                    currentUser={currentUser}
                  />
                }
              />
              <Route path="/memories" element={<Memories userRole={effectiveRole} currentUser={currentUser} />} />
              <Route path="/match-center" element={<MatchCenter players={players} opponents={opponents} userRole={effectiveRole} currentUser={currentUser} teamLogo={teamLogo} onUpdatePlayer={onUpdatePlayer} onUpdateOpponent={onUpdateOpponent} onRefresh={onRefresh} />} />
              <Route path="/scorer" element={(effectiveRole === 'admin' || currentUser?.canScore) ? <ScorerDashboard players={players} /> : <Unauthorized />} />
              <Route path="/scorer/:id" element={(effectiveRole === 'admin' || currentUser?.canScore) ? <ScorerDashboard players={players} /> : <Unauthorized />} />
              <Route path="/live/:id" element={<LiveScorecardPage players={players} opponents={opponents} />} />
              {/* Control Panel Routes - Admin view required */}
              <Route path="/control-panel" element={effectiveRole === 'admin' ? <ControlPanel players={players} onUpdatePlayer={onUpdatePlayer} /> : <Unauthorized />}>
                <Route index element={<Navigate to="grounds" replace />} />
                <Route path="grounds" element={<GroundsManager />} />
                <Route path="tournaments" element={<TournamentsManager isAdmin={true} />} />
                <Route path="legacy" element={<LegacyEditor players={players} onUpdatePlayer={onUpdatePlayer} />} />
                <Route path="users" element={<UserManagement />} />
              </Route>
            
            <Route path="/scorecard/:id" element={<ScorecardPage players={players} opponents={opponents} homeTeamName={teamLogo ? 'Indian Strikers' : 'Indian Strikers'} />} />
            
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>
        
        {/* Persistent Branding Logo - Fixed Bottom Right, 50% Size */}
        <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none select-none opacity-40 transition-opacity hover:opacity-100 hidden md:block">
          <div className="scale-50 origin-bottom-right">
            <KirikINSLogo size="medium" />
          </div>
        </div>

      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [isAdminView, setIsAdminView] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id?: string; name: string; username: string; avatarUrl?: string; canScore?: boolean }>();
  const [teamLogo, setTeamLogo] = useState<string>('');
  const resetZombieMatches = useMatchCenter(state => state.resetZombieMatches);

  // Auto-reset "Zombie" matches (Live matches from previous days)
  useEffect(() => {
    resetZombieMatches();
  }, [resetZombieMatches]);

  const loadData = async () => {
    try {
      console.log("Fetching data from backend...");
      const [p, o, l] = await Promise.all([
        getPlayers(),
        getOpponents(),
        getTeamLogo(),
        useMasterData.getState().syncMasterData()
      ]);
      console.log("Data received:", { players: p.length, opponents: o.length });

      if (p.length === 0) {
        console.warn("Received empty data. Backend might be connected but empty, or request failed silently.");
      }

      setPlayers(p);
      setOpponents(o);
      setTeamLogo(l);
    } catch (e: any) {
      console.error('Failed to load data:', e);
      alert(`Backend Error: ${e.message}. \n\nThe API could not connect to the database. Please check the network connectivity and database configuration.`);
    }
  };

  useEffect(() => {
    // Expose loadData as refreshData
    window.refreshAppData = loadData;
    loadData();

    // Check if splash has been seen this session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      // Recover session role if exists, default to guest if not
      const savedRole = sessionStorage.getItem('userRole') as UserRole;
      if (savedRole) setUserRole(savedRole);
      
      const savedAdminView = sessionStorage.getItem('isAdminView');
      if (savedAdminView === 'true') setIsAdminView(true);

      // 3. Load Matches via cloud sync (utilizes nuclear filters)
      useMatchCenter.getState().syncWithCloud();

      const savedUser = sessionStorage.getItem('currentUser');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));

      setShowSplash(false);
    }
  }, []);

  const handleLoginComplete = (role: UserRole, user?: { id?: string; name: string; username: string; avatarUrl?: string; canScore?: boolean }) => {
    setUserRole(role);
    setIsAdminView(false); // Default to member view on entry
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    }
    setShowSplash(false);
    sessionStorage.setItem('hasSeenSplash', 'true');
    sessionStorage.setItem('userRole', role);
    sessionStorage.setItem('isAdminView', 'false');
  };

  const handleToggleAdminView = () => {
    const newVal = !isAdminView;
    setIsAdminView(newVal);
    sessionStorage.setItem('isAdminView', String(newVal));
  };

  const handleSignOut = () => {
    setUserRole('guest');
    setIsAdminView(false);
    setCurrentUser(undefined);
    setShowSplash(true);
    sessionStorage.removeItem('hasSeenSplash');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('isAdminView');
  };

  const handleAddPlayer = async (player: Player) => {
    if (userRole !== 'admin') return;
    try {
      const newPlayer = await addPlayer(player);
      // Use the verified player from backend (with real ID)
      setPlayers(prev => [newPlayer, ...prev]);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to add player: ${e.message || 'Unknown Error'}`);
    }
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    if (userRole !== 'admin') return;
    try {
      await updatePlayer(updatedPlayer);
      setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    } catch (e: any) {
      console.error(e);
      alert(`Failed to update player: ${e.message || 'Unknown Error'}`);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await deletePlayer(id);
      setPlayers(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      console.error(e);
      alert(`Failed to delete player: ${e.message || 'Unknown Error'}`);
    }
  };

  const handleAddOpponent = async (team: OpponentTeam) => {
    if (userRole !== 'admin') return;
    try {
      const savedTeam = await addOpponent(team);
      setOpponents(prev => [...prev, savedTeam]);
    } catch (e) {
      console.error(e);
      alert("Failed to add opponent team");
    }
  };

  const handleUpdateOpponent = async (updatedTeam: OpponentTeam) => {
    if (userRole !== 'admin') return;
    try {
      await updateOpponent(updatedTeam);
      setOpponents(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    } catch (e) { console.error(e); }
  };

  const handleDeleteOpponent = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await deleteOpponent(id);
      setOpponents(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  };



  const handleUpdateLogo = async (url: string) => {
    if (userRole !== 'admin') return;
    setTeamLogo(url);
    await saveTeamLogo(url);
  };

  return (
    <HashRouter>
      {showSplash ? (
        <SplashScreen onComplete={handleLoginComplete} teamLogo={teamLogo} />
      ) : (
        <AppContent
          players={players}
          opponents={opponents}
          userRole={userRole}
          isAdminView={isAdminView}
          onToggleAdminView={handleToggleAdminView}
          onAddPlayer={handleAddPlayer}
          onUpdatePlayer={handleUpdatePlayer}
          onDeletePlayer={handleDeletePlayer}
          onAddOpponent={handleAddOpponent}
          onUpdateOpponent={handleUpdateOpponent}
          onDeleteOpponent={handleDeleteOpponent}
          onSignOut={handleSignOut}
          teamLogo={teamLogo}
          onUpdateLogo={handleUpdateLogo}
          currentUser={currentUser}
          linkedPlayer={currentUser?.id ? players.find(p => String(p.linkedUserId) === String(currentUser?.id)) : undefined}
          onRefresh={loadData}
        />
      )}
    </HashRouter>
  );
};

export default App;
