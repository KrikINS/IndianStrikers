import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import GroundsManager from './components/GroundsManager';
import TournamentsManager from './components/TournamentsManager';
import UserManagement from './components/UserManagement';
import { ScorecardPage } from './components/ScorecardPage';
import { Player, UserRole, OpponentTeam } from './types';
import { getPlayers, addPlayer, updatePlayer, deletePlayer, getOpponents, addOpponent, updateOpponent, deleteOpponent, getTeamLogo, saveTeamLogo, getMatches } from './services/storageService';
import { Menu } from 'lucide-react';
import KirikINSLogo from './components/KirikINSLogo';

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
  currentUser?: { id?: string; name: string; username: string; avatarUrl?: string },
  linkedPlayer?: Player
}> = ({ players, opponents, userRole, onAddPlayer, onUpdatePlayer, onDeletePlayer, onAddOpponent, onUpdateOpponent, onDeleteOpponent, onSignOut, teamLogo, onUpdateLogo, currentUser, linkedPlayer }) => {
  const location = useLocation();
  const navigate = useNavigate();

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
        onSignOut={onSignOut}
        teamLogo={teamLogo}
        onUpdateLogo={onUpdateLogo}
        currentUser={currentUser}
        linkedPlayer={linkedPlayer}
      />

      <main className="flex-1 min-w-0 transition-all duration-300 relative h-screen overflow-y-auto">
        <div className="p-3 md:p-6 lg:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
          <Routes>
            <Route path="/home" element={<Dashboard players={players} userRole={userRole} teamLogo={teamLogo} />} />
            <Route
              path="/roster"
              element={
                <PlayerList
                  players={players}
                  userRole={userRole}
                  onAddPlayer={onAddPlayer}
                  onUpdatePlayer={onUpdatePlayer}
                  onDeletePlayer={onDeletePlayer}
                />
              }
            />
            <Route path="/fielding" element={<FieldingMap userRole={userRole} />} />
            <Route
              path="/opponents"
              element={
                <OpponentTeams
                  teams={opponents}
                  onAddTeam={onAddOpponent}
                  onUpdateTeam={onUpdateOpponent}
                  onDeleteTeam={onDeleteOpponent}
                  userRole={userRole}
                />
              }
            />
            <Route path="/memories" element={<Memories userRole={userRole} currentUser={currentUser} />} />
            <Route path="/match-center" element={<MatchCenter players={players} opponents={opponents} userRole={userRole} teamLogo={teamLogo} onUpdatePlayer={onUpdatePlayer} onUpdateOpponent={onUpdateOpponent} />} />
            <Route path="/scorer" element={(userRole === 'admin' || userRole === 'scorer') ? <ScorerDashboard /> : <Navigate to="/home" />} />
            {/* Control Panel Routes - Admin only */}
            <Route path="/control-panel" element={userRole === 'admin' ? <ControlPanel players={players} onUpdatePlayer={onUpdatePlayer} /> : <Navigate to="/home" />}>
              <Route index element={<Navigate to="grounds" replace />} />
              <Route path="grounds" element={<GroundsManager />} />
              <Route path="tournaments" element={<TournamentsManager />} />
              <Route path="legacy" element={<LegacyEditor players={players} onUpdatePlayer={onUpdatePlayer} />} />
              <Route path="users" element={<UserManagement />} />
            </Route>
            
            <Route path="/scorecard/:id" element={<ScorecardPage opponents={opponents} homeTeamName={teamLogo ? 'Indian Strikers' : 'Indian Strikers'} />} />
            
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
  const [currentUser, setCurrentUser] = useState<{ id?: string; name: string; username: string; avatarUrl?: string }>();
  const [teamLogo, setTeamLogo] = useState<string>('');
  const resetZombieMatches = useMatchCenter(state => state.resetZombieMatches);

  // Auto-reset "Zombie" matches (Live matches from previous days)
  useEffect(() => {
    resetZombieMatches();
  }, [resetZombieMatches]);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("Fetching data from backend...");
        const [p, o, l] = await Promise.all([
          getPlayers(),
          getOpponents(),
          getTeamLogo()
        ]);
        console.log("Data received:", { players: p.length, opponents: o.length });

        if (p.length === 0) {
          console.warn("Received empty data. Backend might be connected but empty, or request failed silently.");
          // Optional: alert check
        }

        setPlayers(p);
        setOpponents(o);
        setTeamLogo(l);
      } catch (e: any) {
        console.error('Failed to load data:', e);
        alert(`Backend Error: ${e.message}. \n\nIf "fetch failed", the Backend cannot reach Supabase. Check your internet or Supabase Project status.`);
      }
    };
    loadData();

    // Check if splash has been seen this session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      // Recover session role if exists, default to guest if not
      const savedRole = sessionStorage.getItem('userRole') as UserRole;
      if (savedRole) setUserRole(savedRole);
      // 3. Load Matches directly into the store
      const loadMatches = async () => {
        try {
          const dbMatches = await getMatches();
          const localMatches = useMatchCenter.getState().matches;
          
          // Merge: Database matches are truth, but keep local matches that don't exist in DB yet
          const dbIds = new Set(dbMatches.map(m => m.id));
          const unsyncedMatches = localMatches.filter(m => !dbIds.has(m.id));
          
          useMatchCenter.getState().setMatches([...dbMatches, ...unsyncedMatches]);
        } catch (e) {
          console.error("Match sync fetch failed:", e);
        }
      };
      loadMatches();

      const savedUser = sessionStorage.getItem('currentUser');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));

      setShowSplash(false);
    }
  }, []);

  const handleLoginComplete = (role: UserRole, user?: { id?: string; name: string; username: string; avatarUrl?: string }) => {
    setUserRole(role);
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    }
    setShowSplash(false);
    sessionStorage.setItem('hasSeenSplash', 'true');
    sessionStorage.setItem('userRole', role);
  };

  const handleSignOut = () => {
    setUserRole('guest');
    setCurrentUser(undefined);
    setShowSplash(true);
    sessionStorage.removeItem('hasSeenSplash');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('currentUser');
  };

  const handleAddPlayer = async (player: Player) => {
    if (userRole !== 'admin') return;
    try {
      const newPlayer = await addPlayer(player);
      // Use the verified player from backend (with real ID)
      setPlayers(prev => [newPlayer, ...prev]);
    } catch (e) {
      console.error(e);
      alert("Failed to add player");
    }
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    if (userRole !== 'admin') return;
    try {
      await updatePlayer(updatedPlayer);
      setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
    } catch (e: any) {
      console.error(e);
      alert(`Failed to update player: ${e.message}`);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await deletePlayer(id);
      setPlayers(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete player");
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

  if (showSplash) {
    return <SplashScreen onComplete={handleLoginComplete} teamLogo={teamLogo} />;
  }

  return (
    <HashRouter>
      <AppContent
        players={players}
        opponents={opponents}
        userRole={userRole}
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
      />
    </HashRouter>
  );
};

export default App;
