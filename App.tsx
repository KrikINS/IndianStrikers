import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PlayerList from './components/PlayerList';
import FieldingMap from './components/FieldingMap';
import OpponentTeams from './components/OpponentTeams';
import Memories from './components/Memories';
import SplashScreen from './components/SplashScreen';
const ScorerDashboard = lazy(() => import('./components/ScorerDashboard'));
const MatchCenter = lazy(() => import('./components/MatchCenter'));

// Themed Loader for Suspense
const StrikersLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 bg-blue-600 rounded-xl animate-pulse"></div>
      </div>
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Powering Up Live Feed...</p>
  </div>
);
import ControlPanel from './components/ControlPanel';
import { useMatchCenter } from './store/matchStore';
import { useMasterData } from './components/masterDataStore';
import { usePlayerStore } from './store/playerStore';
import { useOpponentStore } from './store/opponentStore';
import GroundsManager from './components/GroundsManager';
import TournamentManager from './components/TournamentManager';
import UserManagement from './components/UserManagement';

import CommentaryManager from './components/CommentaryManager';
import LegacyEditor from './components/LegacyEditor';
import { ScorecardPage } from './components/ScorecardPage';
import LiveScorecardPage from './components/LiveScorecardPage';
import { Player, UserRole, OpponentTeam } from './types';
import { getOpponents, addOpponent, updateOpponent, deleteOpponent, getTeamLogo, saveTeamLogo, getMatches } from './services/storageService';
import { Menu, Shield, ArrowRight, Plus, MapPin, Trophy, Settings, Users, Layout, MessageSquare } from 'lucide-react';
import KirikINSLogo from './components/KirikINSLogo';
import GlobalChat from './components/GlobalChat';
import { Toaster, toast } from 'react-hot-toast';

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

const TournamentDetailViewPlaceholder = () => {
  const { id } = useLocation().pathname.split('/').pop()?.split('?')?.[0] ? { id: useLocation().pathname.split('/').pop() } : { id: 'unknown' };
  const query = new URLSearchParams(useLocation().search);
  const playerId = query.get('player');
  
  return (
    <div className="p-8 bg-white rounded-[2rem] border border-slate-200 shadow-xl max-w-4xl mx-auto mt-12 text-center">
      <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
        <Shield size={40} className="text-blue-600" />
      </div>
      <h1 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tight">Tournament Detail View</h1>
      <p className="text-slate-500 font-medium mb-8">This view is currently under development.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-xs mx-auto mb-10">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tournament ID</div>
          <div className="font-mono text-sm font-bold text-slate-700">{id}</div>
        </div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Focused Player</div>
          <div className="font-mono text-sm font-bold text-slate-700">{playerId || 'None'}</div>
        </div>
      </div>
      
      <Link to="/home" className="text-blue-600 font-black uppercase text-xs tracking-widest hover:underline">Return to Dashboard</Link>
    </div>
  );
};

const AppContent: React.FC<{
  opponents: OpponentTeam[],
  userRole: UserRole,
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
  onRefresh: () => Promise<void>,
  isOffline?: boolean
}> = ({ opponents, userRole, onAddOpponent, onUpdateOpponent, onDeleteOpponent, onSignOut, teamLogo, onUpdateLogo, isAdminView, onToggleAdminView, currentUser, linkedPlayer, onRefresh, isOffline }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const effectiveRole = userRole === 'admin' ? (isAdminView ? 'admin' : 'member') : userRole;

  useEffect(() => {
    const handleBackButton = async () => {
      if (location.pathname === '/home' || location.pathname === '/') {
        await CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    };

    const listener = CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [location, navigate]);

  const isScorerActive = location.pathname.startsWith('/scorer');

  return (
    <>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
          <div className={`${isScorerActive ? 'hidden md:block' : ''}`}>
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
              isOffline={isOffline}
            />
          </div>

          <main className={`flex-1 min-w-0 transition-all duration-300 relative h-screen overflow-y-auto ${isScorerActive ? 'p-0 h-[100dvh] overflow-hidden' : ''}`}>
            <div className="p-3 md:p-6 lg:p-8 w-full pb-24 md:pb-8">
              <Routes>
                <Route path="/home" element={<Dashboard userRole={effectiveRole} teamLogo={teamLogo} currentUser={currentUser} />} />
                <Route
                  path="/roster"
                  element={
                    <PlayerList
                      userRole={effectiveRole}
                      currentUser={currentUser}
                    />
                  }
                />
                <Route path="/fielding" element={<FieldingMap userRole={effectiveRole} currentUser={currentUser} />} />
                <Route
                  path="/opponents"
                  element={
                    <OpponentTeams
                      userRole={effectiveRole}
                      currentUser={currentUser}
                    />
                  }
                />
                <Route path="/memories" element={<Memories userRole={effectiveRole} currentUser={currentUser} />} />
                <Route 
                  path="/match-center" 
                  element={
                    <Suspense fallback={<StrikersLoader />}>
                      <MatchCenter opponents={opponents} userRole={effectiveRole} currentUser={currentUser} teamLogo={teamLogo} onUpdateOpponent={onUpdateOpponent} onRefresh={onRefresh} />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/scorer" 
                  element={
                    (effectiveRole === 'admin' || currentUser?.canScore) ? (
                      <Suspense fallback={<StrikersLoader />}>
                        <ScorerDashboard teamLogo={teamLogo} />
                      </Suspense>
                    ) : <Unauthorized />
                  } 
                />
                <Route 
                  path="/scorer/:id" 
                  element={
                    (effectiveRole === 'admin' || currentUser?.canScore) ? (
                      <Suspense fallback={<StrikersLoader />}>
                        <ScorerDashboard teamLogo={teamLogo} />
                      </Suspense>
                    ) : <Unauthorized />
                  } 
                />
                <Route path="/live/:id" element={<LiveScorecardPage opponents={opponents} />} />
                <Route path="/control-panel" element={effectiveRole === 'admin' ? <ControlPanel /> : <Unauthorized />}>
                  <Route index element={<Navigate to="grounds" replace />} />
                  <Route path="grounds" element={<GroundsManager />} />
                  <Route path="tournaments" element={<TournamentManager isAdmin={true} />} />

                  <Route path="legacy" element={<LegacyEditor />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="commentary" element={<CommentaryManager />} />
                </Route>
              
              <Route path="/scorecard/:id" element={<ScorecardPage opponents={opponents} homeTeamName={teamLogo ? 'Indian Strikers' : 'Indian Strikers'} />} />
              <Route path="/tournaments/:id" element={<TournamentDetailViewPlaceholder />} />
              
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </div>
          
          <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none select-none opacity-40 transition-opacity hover:opacity-100 hidden md:block">
            <div className="scale-50 origin-bottom-right">
              <KirikINSLogo size="medium" />
            </div>
          </div>

        </main>
        
        {/* Global Club Chat - Only for Members & Admins */}
        {currentUser && userRole !== 'guest' && (
          <GlobalChat currentUser={currentUser} />
        )}
      </div>

      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '0.85rem',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px -10px rgba(0,0,0,0.5)',
          },
          success: { iconTheme: { primary: '#4ade80', secondary: '#fff' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#fff' } },
        }}
      />
    </>
  );
};

const App: React.FC = () => {
  const { players, fetchPlayers, addPlayer: storeAddPlayer, updatePlayer: storeUpdatePlayer, deletePlayer: storeDeletePlayer } = usePlayerStore();
  const { opponents, fetchOpponents, addOpponent: handleAddOpponent, updateOpponent: handleUpdateOpponent, deleteOpponent: handleDeleteOpponent } = useOpponentStore();
  const [showSplash, setShowSplash] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [isAdminView, setIsAdminView] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id?: string; name: string; username: string; avatarUrl?: string; canScore?: boolean }>();
  const [teamLogo, setTeamLogo] = useState<string>('');
  const [isOffline, setIsOffline] = useState(false);
  const resetZombieMatches = useMatchCenter(state => state.resetZombieMatches);
  const syncWithCloud = useMatchCenter(state => state.syncWithCloud);
  const isOfflineStore = useMasterData(state => state.isOffline);
  const setOfflineStore = useMasterData(state => state.setOffline);
  const syncMasterData = useMasterData(state => state.syncMasterData);

  useEffect(() => {
    resetZombieMatches();
  }, [resetZombieMatches]);

  const loadData = async () => {
    try {
      console.log("Fetching data from backend...");
      // Fetch data via stores
      const syncCheck = async () => {
          if (syncWithCloud) {
              return await syncWithCloud();
          }
      };

      await Promise.allSettled([
        fetchPlayers(),
        fetchOpponents(),
        syncMasterData(),
        syncCheck(),
        getTeamLogo().then(l => setTeamLogo(l || ''))
      ]);

      setIsOffline(false);
      setOfflineStore(false);
    } catch (error) {
      console.error("Failed to load data:", error);
      setIsOffline(true);
      setOfflineStore(true);
    }
  };

  useEffect(() => {
    window.refreshAppData = loadData;
    
    // Ensure store is rehydrated before first data fetch
    const initApp = async () => {
      await usePlayerStore.persist.rehydrate();
      loadData();
    };
    initApp();

    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      const savedRole = sessionStorage.getItem('userRole') as UserRole;
      if (savedRole) setUserRole(savedRole);
      
      const savedAdminView = sessionStorage.getItem('isAdminView');
      if (savedAdminView === 'true') setIsAdminView(true);

      syncWithCloud();

      const savedUser = sessionStorage.getItem('currentUser');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));

      setShowSplash(false);
    }
  }, []);

  const handleLoginComplete = (role: UserRole, user?: { id?: string; name: string; username: string; avatarUrl?: string; canScore?: boolean }) => {
    setUserRole(role);
    setIsAdminView(false);
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
      await storeAddPlayer(player);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to add player: ${e.message || 'Unknown Error'}`);
    }
  };

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    if (userRole !== 'admin') return;
    try {
      await storeUpdatePlayer(updatedPlayer);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to update player: ${e.message || 'Unknown Error'}`);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await storeDeletePlayer(id);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to delete player: ${e.message || 'Unknown Error'}`);
    }
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
          opponents={opponents}
          userRole={userRole}
          isAdminView={isAdminView}
          onToggleAdminView={handleToggleAdminView}
          onAddOpponent={handleAddOpponent}
          onUpdateOpponent={handleUpdateOpponent}
          onDeleteOpponent={handleDeleteOpponent}
          onSignOut={handleSignOut}
          teamLogo={teamLogo}
          onUpdateLogo={handleUpdateLogo}
          currentUser={currentUser}
          linkedPlayer={currentUser?.id ? players.find(p => String(p.linkedUserId) === String(currentUser?.id)) : undefined}
          onRefresh={loadData}
          isOffline={isOffline}
        />
      )}
    </HashRouter>
  );
};

export default App;
