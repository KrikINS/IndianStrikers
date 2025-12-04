
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PlayerList from './components/PlayerList';
import MatchSchedule from './components/MatchSchedule';
import AICoach from './components/AICoach';
import MatchSelection from './components/MatchSelection';
import FieldingMap from './components/FieldingMap';
import OpponentTeams from './components/OpponentTeams';
import Scorecard from './components/Scorecard';
import Memories from './components/Memories';
import SplashScreen from './components/SplashScreen';
import { Player, Match, UserRole, OpponentTeam } from '../types';
import { getPlayers, savePlayers, getMatches, saveMatches, getOpponents, saveOpponents, getTeamLogo, saveTeamLogo } from './services/storageService';
import { Menu, BrainCircuit } from 'lucide-react';
import KirikINSLogo from './KirikINSLogo';

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
  onUpdateLogo: (url: string) => void
}> = ({ players, matches, opponents, userRole, onAddPlayer, onUpdatePlayer, onDeletePlayer, onAddOpponent, onUpdateOpponent, onDeleteOpponent, onAddMatch, onUpdateMatch, onSignOut, teamLogo, onUpdateLogo }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showAICoach, setShowAICoach] = useState(false);
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
            <Route path="/home" element={<Dashboard players={players} matches={matches} />} />
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
            <Route path="/selection" element={<MatchSelection players={players} userRole={userRole} matches={matches} teamLogo={teamLogo} />} />
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
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </div>

        {/* AI Coach FAB */}
        <div className="fixed bottom-4 right-4 z-40 md:bottom-8 md:right-8">
           <button 
             onClick={() => setShowAICoach(!showAICoach)}
             className="bg-blue-600 hover:bg-blue-700 text-white p-3 md:p-4 rounded-full shadow-lg shadow-blue-600/30 transition-all hover:scale-110 flex items-center justify-center active:scale-95"
           >
             <BrainCircuit size={24} />
           </button>
        </div>

        {/* AI Coach Overlay Modal */}
        {showAICoach && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
             <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl h-[80vh] relative flex flex-col">
                <button 
                  onClick={() => setShowAICoach(false)}
                  className="absolute top-4 right-4 text-white hover:text-red-200 z-10"
                >
                  <div className="bg-white/20 p-1 rounded-full"><Menu size={20} className="rotate-45" /></div>
                </button>
                <AICoach players={players} matches={matches} />
             </div>
          </div>
        )}
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
  const [teamLogo, setTeamLogo] = useState<string>('');

  useEffect(() => {
    // Load initial data
    setPlayers(getPlayers());
    setMatches(getMatches());
    setOpponents(getOpponents());
    setTeamLogo(getTeamLogo());
    
    // Check if splash has been seen this session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) { 
      // Recover session role if exists, default to guest if not
      const savedRole = sessionStorage.getItem('userRole') as UserRole;
      if (savedRole) setUserRole(savedRole);
      setShowSplash(false); 
    }
  }, []);

  const handleLoginComplete = (role: UserRole) => {
    setUserRole(role);
    setShowSplash(false);
    sessionStorage.setItem('hasSeenSplash', 'true');
    sessionStorage.setItem('userRole', role);
  };

  const handleSignOut = () => {
    setUserRole('guest');
    setShowSplash(true);
    sessionStorage.removeItem('hasSeenSplash');
    sessionStorage.removeItem('userRole');
  };

  const handleAddPlayer = (player: Player) => {
    if (userRole !== 'admin') return;
    const updated = [player, ...players];
    setPlayers(updated);
    savePlayers(updated);
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    if (userRole !== 'admin') return;
    const updated = players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
    setPlayers(updated);
    savePlayers(updated);
  };

  const handleDeletePlayer = (id: string) => {
    if (userRole !== 'admin') return;
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated);
    savePlayers(updated);
  };

  const handleAddOpponent = (team: OpponentTeam) => {
    if (userRole !== 'admin') return;
    const updated = [...opponents, team];
    setOpponents(updated);
    saveOpponents(updated);
  };

  const handleUpdateOpponent = (updatedTeam: OpponentTeam) => {
    if (userRole !== 'admin') return;
    const updated = opponents.map(t => t.id === updatedTeam.id ? updatedTeam : t);
    setOpponents(updated);
    saveOpponents(updated);
  };

  const handleDeleteOpponent = (id: string) => {
    if (userRole !== 'admin') return;
    const updated = opponents.filter(t => t.id !== id);
    setOpponents(updated);
    saveOpponents(updated);
  };

  const handleAddMatch = (match: Match) => {
    if (userRole !== 'admin') return;
    const updated = [...matches, match];
    setMatches(updated);
    saveMatches(updated);
  };

  const handleUpdateMatch = (updatedMatch: Match) => {
    if (userRole !== 'admin') return;
    const updated = matches.map(m => m.id === updatedMatch.id ? updatedMatch : m);
    setMatches(updated);
    saveMatches(updated);
  };

  const handleUpdateLogo = (url: string) => {
    if (userRole !== 'admin') return;
    setTeamLogo(url);
    saveTeamLogo(url);
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
      />
    </HashRouter>
  );
};

export default App;
