
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PlayerList from './components/PlayerList';
import MatchSchedule from './components/MatchSchedule';

import MatchSelection from './components/MatchSelection';
import FieldingMap from './components/FieldingMap';
import OpponentTeams from './components/OpponentTeams';
import Scorecard from './components/Scorecard';
import Memories from './components/Memories';
import SplashScreen from './components/SplashScreen';
import UserManagement from './components/UserManagement';
import { Player, Match, UserRole, OpponentTeam } from './types';
import { getPlayers, addPlayer, updatePlayer, deletePlayer, getMatches, addMatch, updateMatch, getOpponents, addOpponent, updateOpponent, deleteOpponent, getTeamLogo, saveTeamLogo } from './services/storageService';
import { Menu } from 'lucide-react';
import KirikINSLogo from './components/KirikINSLogo';

const AppContent: React.FC<{
  players: Player[],
  matches: Match[],
  opponents: OpponentTeam[],
  userRole: UserRole,
  onAddPlayer: (p: Player) => void,
  onUpdatePlayer: (p: Player) => void,
  onDeletePlayer: (id: string) => void,
  onAddOpponent: (t: OpponentTeam) => void,
  onUpdateOpponent: (t: OpponentTeam) => void,
  onDeleteOpponent: (id: string) => void,
  onAddMatch: (m: Match) => void,
  onUpdateMatch: (m: Match) => void,
  onSignOut: () => void,
  teamLogo: string,
  onUpdateLogo: (url: string) => void,
  currentUser?: { name: string; username: string }
}> = ({ players, matches, opponents, userRole, onAddPlayer, onUpdatePlayer, onDeletePlayer, onAddOpponent, onUpdateOpponent, onDeleteOpponent, onAddMatch, onUpdateMatch, onSignOut, teamLogo, onUpdateLogo, currentUser }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        toggle={() => setSidebarOpen(!isSidebarOpen)}
        userRole={userRole}
        onSignOut={onSignOut}
        teamLogo={teamLogo}
        onUpdateLogo={onUpdateLogo}
        matches={matches}
        currentUser={currentUser}
      />

      <main className="flex-1 min-w-0 transition-all duration-300 relative h-screen overflow-y-auto">
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <KirikINSLogo size="small" className="scale-75 origin-left" />
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            <h1 className="font-bold text-sm tracking-wide">
              <span className="text-white">INDIAN</span> <span className="text-[#4169E1]">STRIKERS</span>
            </h1>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 p-1 hover:text-white">
            <Menu size={24} />
          </button>
        </header>

        <div className="p-3 md:p-6 lg:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
          <Routes>
            <Route path="/home" element={<Dashboard players={players} matches={matches} userRole={userRole} />} />
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
            <Route
              path="/matches"
              element={
                <MatchSchedule
                  matches={matches}
                  opponents={opponents}
                  onAddMatch={onAddMatch}
                  onUpdateMatch={onUpdateMatch}
                  userRole={userRole}
                />
              }
            />
            <Route path="/selection" element={<MatchSelection players={players} userRole={userRole} matches={matches} teamLogo={teamLogo} onUpdateMatch={onUpdateMatch} />} />
            <Route path="/fielding" element={<FieldingMap />} />
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
            <Route path="/scorecard" element={<Scorecard opponents={opponents} players={players} matches={matches} />} />
            <Route path="/memories" element={<Memories userRole={userRole} />} />
            {/* User Management Route - Only visible if admin */}
            <Route path="/users" element={userRole === 'admin' ? <UserManagement /> : <Navigate to="/home" />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>


      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [currentUser, setCurrentUser] = useState<{ name: string; username: string }>();
  const [teamLogo, setTeamLogo] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("Fetching data from backend...");
        const [p, m, o, l] = await Promise.all([
          getPlayers(),
          getMatches(),
          getOpponents(),
          getTeamLogo()
        ]);
        console.log("Data received:", { players: p.length, matches: m.length, opponents: o.length });

        if (p.length === 0 && m.length === 0) {
          console.warn("Received empty data. Backend might be connected but empty, or request failed silently.");
          // Optional: alert check
        }

        setPlayers(p);
        setMatches(m);
        setOpponents(o);
        setTeamLogo(l);
      } catch (e: any) {
        console.error('Failed to load data:', e);
        alert(`Backend Connection Failed: ${e.message}. Please check if the server is running on port 4000.`);
      }
    };
    loadData();

    // Check if splash has been seen this session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      // Recover session role if exists, default to guest if not
      const savedRole = sessionStorage.getItem('userRole') as UserRole;
      if (savedRole) setUserRole(savedRole);

      const savedUser = sessionStorage.getItem('currentUser');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));

      setShowSplash(false);
    }
  }, []);

  const handleLoginComplete = (role: UserRole, user?: { name: string; username: string }) => {
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

  const handleAddMatch = async (match: Match) => {
    if (userRole !== 'admin') return;
    try {
      const savedMatch = await addMatch(match);
      setMatches(prev => [...prev, { ...match, id: savedMatch.id }]);
    } catch (e) { console.error(e); }
  };

  const handleUpdateMatch = async (updatedMatch: Match) => {
    if (userRole !== 'admin') {
      console.warn("Attempt to update match without admin role");
      return;
    }
    console.log("Updating match:", updatedMatch);
    try {
      await updateMatch(updatedMatch);
      console.log("Match updated successfully in backend");
      setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    } catch (e: any) {
      console.error("Match update failed:", e);
      alert(`Failed to update match: ${e.message}`);
    }
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
        matches={matches}
        opponents={opponents}
        userRole={userRole}
        onAddPlayer={handleAddPlayer}
        onUpdatePlayer={handleUpdatePlayer}
        onDeletePlayer={handleDeletePlayer}
        onAddOpponent={handleAddOpponent}
        onUpdateOpponent={handleUpdateOpponent}
        onDeleteOpponent={handleDeleteOpponent}
        onAddMatch={handleAddMatch}
        onUpdateMatch={handleUpdateMatch}
        onSignOut={handleSignOut}
        teamLogo={teamLogo}
        onUpdateLogo={handleUpdateLogo}
        currentUser={currentUser}
      />
    </HashRouter>
  );
};

export default App;
