import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { 
  Trophy, 
  Calendar, 
  Target, 
  Users, 
  TrendingUp, 
  Activity, 
  LayoutGrid,
  Shield, 
  ChevronRight, 
  ArrowLeft,
  Star,
  Award,
  Zap,
  Clock,
  MapPin,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/StoreProvider';
import { useMasterData } from '../store/tournamentStore';
import { 
  getMatches, 
  getLeagueStandings, 
  getTournamentPerformers,
  getOpponents
} from '../services/storageService';
import { ScheduledMatch, LeagueStanding, OpponentTeam, Player, UserRole, AppUser } from '../types';
import LeagueStandingTable from './LeagueStandingTable';

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
      active 
        ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
    }`}
  >
    {React.cloneElement(icon, { size: 14 })}
    {label}
  </button>
);

interface TournamentDetailViewProps {
  userRole?: UserRole;
  currentUser?: AppUser | null;
}

export default function TournamentDetailView({ userRole = 'guest', currentUser }: TournamentDetailViewProps) {
  const { id } = useParams<{ id: string }>();
  const query = new URLSearchParams(useLocation().search);
  const focusedPlayerId = query.get('player');
  
  const store = useStore();
  const { tournaments, grounds } = useMasterData();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'standings' | 'fixtures' | 'stats'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentMatches, setTournamentMatches] = useState<ScheduledMatch[]>([]);
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [performers, setPerformers] = useState<any[]>([]);
  const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
  
  const tournament = useMemo(() => 
    tournaments.find(t => String(t.id) === String(id)), 
  [tournaments, id]);

  const focusedPlayer = useMemo(() => 
    store?.squadPlayers.find(p => String(p.id) === String(focusedPlayerId)),
  [store?.squadPlayers, focusedPlayerId]);

  useEffect(() => {
    const loadTournamentData = async () => {
      if (!tournament) return;
      setIsLoading(true);
      try {
        const [allMatches, table, perf, opps] = await Promise.all([
          getMatches(),
          getLeagueStandings(tournament.id),
          getTournamentPerformers(),
          getOpponents()
        ]);

        const filteredMatches = (allMatches || []).filter(m => 
          String(m.tournamentId) === String(id) || 
          (m.tournament && m.tournament.trim().toLowerCase() === tournament.name.trim().toLowerCase())
        );

        setTournamentMatches(filteredMatches);
        setStandings(table || []);
        setPerformers(perf.performers || []);
        setOpponents(opps || []);
      } catch (e) {
        console.error("Failed to load tournament detail data", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadTournamentData();
  }, [id, tournament]);

  // Tournament Stats Aggregation
  const tournamentStats = useMemo(() => {
    if (!performers.length) return null;
    
    // Filter performers for this specific tournament matches
    const tourneyPerformers = performers.filter(p => 
      tournamentMatches.some(m => String(m.id) === String(p.matchId))
    );

    const topScorer = [...tourneyPerformers].sort((a, b) => b.runs - a.runs)[0];
    const topWicketTaker = [...tourneyPerformers].sort((a, b) => b.wickets - a.wickets)[0];
    const totalRuns = tourneyPerformers.reduce((sum, p) => sum + (p.runs || 0), 0);
    const totalWickets = tourneyPerformers.reduce((sum, p) => sum + (p.wickets || 0), 0);

    return {
      topScorer,
      topWicketTaker,
      totalRuns,
      totalWickets,
      matchCount: tournamentMatches.length
    };
  }, [performers, tournamentMatches]);

  // Focused Player Performance
  const playerPerformance = useMemo(() => {
    if (!focusedPlayerId || !performers.length) return null;
    
    const playerMatches = performers.filter(p => 
      String(p.playerId) === String(focusedPlayerId) &&
      tournamentMatches.some(m => String(m.id) === String(p.matchId))
    );

    const runs = playerMatches.reduce((sum, p) => sum + (p.runs || 0), 0);
    const wickets = playerMatches.reduce((sum, p) => sum + (p.wickets || 0), 0);
    const balls = playerMatches.reduce((sum, p) => sum + (p.balls || 0), 0);
    const innings = playerMatches.filter(p => (p.balls || 0) > 0).length;
    const highest = Math.max(...playerMatches.map(p => p.runs || 0), 0);

    return {
      matches: playerMatches.length,
      innings,
      runs,
      wickets,
      highest,
      strikeRate: balls > 0 ? ((runs / balls) * 100).toFixed(1) : '0.0'
    };
  }, [focusedPlayerId, performers, tournamentMatches]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing Tournament Intelligence...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="p-12 text-center bg-white rounded-[3rem] border border-slate-200 shadow-xl max-w-2xl mx-auto mt-20">
        <Shield size={48} className="text-slate-200 mx-auto mb-4" />
        <h2 className="text-xl font-black text-slate-900 uppercase italic">Tournament Not Found</h2>
        <p className="text-slate-500 text-sm mt-2 mb-8">The tournament you are looking for does not exist or has been archived.</p>
        <Link to="/home" className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="relative mb-8 rounded-[2.5rem] overflow-hidden bg-slate-900 text-white border border-white/5 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-white p-4 shadow-2xl flex items-center justify-center border-4 border-white/10 group overflow-hidden">
            {(tournament.logo_url || tournament.logoUrl) ? (
              <img src={tournament.logo_url || tournament.logoUrl} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt={tournament.name} />
            ) : (
              <Trophy size={64} className="text-slate-200" />
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-lg ${
                tournament.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                tournament.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                'bg-slate-500/20 text-slate-400 border-slate-500/30'
              }`}>
                {tournament.status}
              </span>
              <span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                Season {tournament.year}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4 leading-tight">
              {tournament.name}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-white/60">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-widest">{tournament.year} Edition</span>
              </div>
              <div className="flex items-center gap-2">
                <Target size={16} className="text-red-500" />
                <span className="text-xs font-bold uppercase tracking-widest">T20 Format</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-sky-500" />
                <span className="text-xs font-bold uppercase tracking-widest">{standings.length || '—'} Teams</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 min-w-[200px]">
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-900/40 transition-all active:scale-95 flex items-center justify-center gap-2">
              <Activity size={14} /> Full Standings
            </button>
            <Link to="/home" className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 transition-all flex items-center justify-center gap-2">
              <ArrowLeft size={14} /> Back to Hub
            </Link>
          </div>
        </div>
      </div>

      {/* Focused Player Highlight (If available) */}
      {playerPerformance && focusedPlayer && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-1 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 rounded-[2.5rem] shadow-2xl shadow-blue-500/20"
        >
          <div className="bg-white rounded-[2.3rem] p-8 md:p-10 flex flex-col md:flex-row items-center gap-10">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-slate-50 overflow-hidden shadow-2xl bg-slate-100 flex items-center justify-center">
                {focusedPlayer.avatarUrl ? (
                  <img src={focusedPlayer.avatarUrl} className="w-full h-full object-cover" alt={focusedPlayer.name} />
                ) : (
                  <Users size={48} className="text-slate-300" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg">
                <Star size={18} className="fill-yellow-400 text-yellow-400" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">YOUR PERFORMANCE</span>
                <div className="w-10 h-[1px] bg-blue-100" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">
                {focusedPlayer.name}
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Matches', value: playerPerformance.matches, icon: <Activity size={12} className="text-slate-400" /> },
                  { label: 'Total Runs', value: playerPerformance.runs, icon: <Zap size={12} className="text-amber-500" /> },
                  { label: 'Wickets', value: playerPerformance.wickets, icon: <Shield size={12} className="text-sky-500" /> },
                  { label: 'High Score', value: playerPerformance.highest, icon: <Award size={12} className="text-indigo-500" /> }
                ].map(stat => (
                  <div key={stat.label} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      {stat.icon}
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <p className="text-xl font-black text-slate-900 font-mono tracking-tight">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-900 text-white p-8 rounded-[2rem] flex flex-col items-center justify-center min-w-[180px] shadow-2xl relative overflow-hidden">
               <div className="absolute inset-0 bg-blue-600/10" />
               <p className="relative z-10 text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Strike Rate</p>
               <p className="relative z-10 text-4xl font-black italic tracking-tighter">{playerPerformance.strikeRate}</p>
               <div className="relative z-10 mt-4 px-4 py-1.5 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">Tournament Avg: 115.4</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-8 bg-white/50 backdrop-blur-md p-2 rounded-[2rem] border border-slate-200 shadow-sm w-fit mx-auto md:mx-0">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutGrid />} label="Overview" />
        <TabButton active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} icon={<TrendingUp />} label="Standings" />
        <TabButton active={activeTab === 'fixtures'} onClick={() => setActiveTab('fixtures')} icon={<Calendar />} label="Fixtures" />
        <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<Activity />} label="Leaders" />
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Tournament Stats Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-100 shadow-inner">
                      <Target size={24} />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-1">{tournamentStats?.totalRuns || 0}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tournament Runs</p>
                  </div>
                  
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 mb-4 border border-sky-100 shadow-inner">
                      <Shield size={24} />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-1">{tournamentStats?.totalWickets || 0}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tournament Wickets</p>
                  </div>
                  
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100 shadow-inner">
                      <Award size={24} />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-1">{tournamentStats?.matchCount || 0}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matches Played</p>
                  </div>
                </div>

                {/* Top Performers Preview */}
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                   <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase italic leading-none">Tournament Elite</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 pl-0.5">Top individual performers in this edition</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('stats')} 
                        title="View Leaderboards"
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                      >
                        <ChevronRight size={18} />
                      </button>
                   </div>
                   
                   <div className="p-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Batting Leader */}
                        <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group hover:bg-slate-900 hover:text-white transition-all duration-500">
                           <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-100 transition-opacity">
                             <Award size={32} className="text-amber-400" />
                           </div>
                           <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-lg p-1">
                             <img src={tournamentStats?.topScorer?.avatarUrl || "/INS LOGO.PNG"} className="w-full h-full object-cover rounded-xl" alt="" />
                           </div>
                           <div>
                             <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">BATTING ORANGE CAP</p>
                             <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none mb-2">{tournamentStats?.topScorer?.playerName || '—'}</h4>
                             <p className="text-2xl font-black tracking-tighter"><span className="text-blue-500 group-hover:text-amber-400">{tournamentStats?.topScorer?.runs || 0}</span> <span className="text-xs font-bold text-slate-400 group-hover:text-white/40 uppercase">Runs</span></p>
                           </div>
                        </div>
                        
                        {/* Bowling Leader */}
                        <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group hover:bg-slate-900 hover:text-white transition-all duration-500">
                           <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-100 transition-opacity">
                             <Shield size={32} className="text-sky-400" />
                           </div>
                           <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-lg p-1">
                             <img src={tournamentStats?.topWicketTaker?.avatarUrl || "/INS LOGO.PNG"} className="w-full h-full object-cover rounded-xl" alt="" />
                           </div>
                           <div>
                             <p className="text-[9px] font-black text-sky-600 uppercase tracking-[0.2em] mb-1">BOWLING PURPLE CAP</p>
                             <h4 className="text-xl font-black uppercase italic tracking-tighter leading-none mb-2">{tournamentStats?.topWicketTaker?.playerName || '—'}</h4>
                             <p className="text-2xl font-black tracking-tighter"><span className="text-sky-500 group-hover:text-sky-400">{tournamentStats?.topWicketTaker?.wickets || 0}</span> <span className="text-xs font-bold text-slate-400 group-hover:text-white/40 uppercase">Wickets</span></p>
                           </div>
                        </div>
                     </div>
                   </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Recent Results Preview */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Results</h3>
                    <Link to="/home" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All</Link>
                  </div>
                  
                  <div className="space-y-4">
                    {tournamentMatches.filter(m => m.status === 'completed').slice(0, 3).map(match => (
                      <div key={match.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                           <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Final</span>
                        </div>
                        <div className="flex items-center gap-3 justify-between">
                           <div className="text-center flex-1">
                              <p className="text-[10px] font-black text-slate-900 uppercase truncate">INS</p>
                              <p className="text-sm font-black text-slate-900">{match.finalScoreHome?.runs}/{match.finalScoreHome?.wickets}</p>
                           </div>
                           <span className="text-[10px] font-black text-slate-300 italic">VS</span>
                           <div className="text-center flex-1">
                              <p className="text-[10px] font-black text-slate-900 uppercase truncate">{match.opponentName?.substring(0,3)}</p>
                              <p className="text-sm font-black text-slate-900">{match.finalScoreAway?.runs}/{match.finalScoreAway?.wickets}</p>
                           </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 text-center mt-3 border-t border-slate-100 pt-2 italic">
                          {match.resultSummary || 'Match Completed'}
                        </p>
                      </div>
                    ))}
                    {tournamentMatches.filter(m => m.status === 'completed').length === 0 && (
                      <div className="py-12 text-center">
                        <Clock size={24} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase">No completed matches yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Standing Snapshot */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute inset-0 bg-blue-600/10" />
                   <h3 className="relative z-10 text-xs font-black uppercase tracking-widest mb-8 text-white/40">Current Position</h3>
                   <div className="relative z-10 flex items-end gap-3 mb-4">
                      <span className="text-6xl font-black italic tracking-tighter leading-none">#2</span>
                      <div className="mb-2">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Indian Strikers</p>
                        <p className="text-xs font-bold text-white/40">Out of 12 Teams</p>
                      </div>
                   </div>
                   <div className="relative z-10 grid grid-cols-3 gap-2 mt-8 pt-8 border-t border-white/5">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-white/40 uppercase mb-1">Played</p>
                        <p className="text-sm font-black">6</p>
                      </div>
                      <div className="text-center border-x border-white/5">
                        <p className="text-[9px] font-black text-white/40 uppercase mb-1">Won</p>
                        <p className="text-sm font-black text-emerald-400">4</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-black text-white/40 uppercase mb-1">Points</p>
                        <p className="text-sm font-black text-blue-400">8</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'standings' && (
            <div className="space-y-8 max-w-5xl mx-auto bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm">
               <LeagueStandingTable 
                  entries={standings} 
                  qCount={4} 
               />
               
               <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 flex items-center gap-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <Shield size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">Qualification Logic</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">Top 4 teams qualify for the knockout stage. In case of tied points, NRR (Net Run Rate) will be the primary tie-breaker.</p>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
               </div>
            </div>
          )}

          {activeTab === 'fixtures' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournamentMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(match => (
                <div key={match.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                  <div className={`h-2 ${
                    match.status === 'live' ? 'bg-red-500 animate-pulse' : 
                    match.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />
                  
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{match.stage || 'League Match'}</p>
                         <h4 className="text-xs font-black text-slate-900 uppercase italic">vs {match.opponentName || 'Opponent'}</h4>
                       </div>
                       <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-slate-400">
                         <Calendar size={14} />
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-6 mb-8">
                       <div className="flex -space-x-3">
                          <div className="w-14 h-14 rounded-2xl border-4 border-white bg-slate-100 shadow-lg overflow-hidden z-10 flex items-center justify-center p-2">
                             <img src="/INS%20LOGO.PNG" className="w-full h-full object-contain" alt="" />
                          </div>
                          <div className="w-14 h-14 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center text-[10px] font-black uppercase text-slate-300">
                             {match.opponentLogo ? (
                               <img src={match.opponentLogo} className="w-full h-full object-contain" alt="" />
                             ) : (
                               match.opponentName?.substring(0,2) || 'OP'
                             )}
                          </div>
                       </div>
                       
                       <div>
                          <p className="text-lg font-black text-slate-900 leading-none mb-1">
                            {match.status === 'completed' ? `${match.finalScoreHome?.runs || 0}/${match.finalScoreHome?.wickets || 0}` : 'UPCOMING'}
                          </p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {match.status === 'completed' ? `vs ${match.finalScoreAway?.runs || 0}/${match.finalScoreAway?.wickets || 0}` : new Date(match.date).toLocaleDateString()}
                          </p>
                       </div>
                    </div>
                    
                    <div className="space-y-2 mb-8">
                       <div className="flex items-center gap-2 text-slate-400">
                          <MapPin size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{match.venue || 'TBA'}</span>
                       </div>
                       <div className="flex items-center gap-2 text-slate-400">
                          <Clock size={12} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(match.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                    </div>
                    
                    <Link 
                      to={match.status === 'live' ? `/live/${match.id}` : `/scorecard/${match.id}`}
                      className="w-full py-4 bg-slate-50 group-hover:bg-slate-900 group-hover:text-white rounded-2xl border border-slate-100 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm group-hover:shadow-xl"
                    >
                      {match.status === 'completed' ? 'Full Scorecard' : 'Match Preview'} <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              ))}
              
              {tournamentMatches.length === 0 && (
                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                   <Calendar size={64} className="text-slate-200 mx-auto mb-6" />
                   <h3 className="text-2xl font-black text-slate-400 uppercase italic">No Matches Scheduled</h3>
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 px-12">The schedule for this tournament has not been finalized yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Batting Leaders Table */}
               <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                       <Zap size={18} />
                     </div>
                     <div>
                       <h3 className="text-sm font-black text-slate-900 uppercase italic">Batting Leaders</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Most Runs Scored</p>
                     </div>
                  </div>
                  <div className="p-4">
                     <table className="w-full">
                        <thead>
                           <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              <th className="p-4 text-left">Player</th>
                              <th className="p-4 text-center">Mat</th>
                              <th className="p-4 text-center">Inns</th>
                              <th className="p-4 text-right">Runs</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {performers
                             .filter(p => tournamentMatches.some(m => String(m.id) === String(p.matchId)))
                             .reduce((acc: any[], curr) => {
                               const found = acc.find(a => a.playerId === curr.playerId);
                               if (found) {
                                 found.runs += curr.runs;
                                 found.matches += 1;
                                 if (curr.balls > 0) found.innings += 1;
                               } else {
                                 acc.push({ ...curr, matches: 1, innings: curr.balls > 0 ? 1 : 0 });
                               }
                               return acc;
                             }, [])
                             .sort((a, b) => b.runs - a.runs)
                             .slice(0, 10)
                             .map((leader, idx) => (
                               <tr key={leader.playerId} className="group hover:bg-slate-50 transition-colors">
                                  <td className="p-4 flex items-center gap-3">
                                     <span className="text-[10px] font-black text-slate-300 font-mono">#{idx+1}</span>
                                     <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                                        <img src={leader.avatarUrl || "/INS LOGO.PNG"} className="w-full h-full object-cover" alt="" />
                                     </div>
                                     <span className="text-xs font-black text-slate-900 uppercase italic">{leader.playerName}</span>
                                  </td>
                                  <td className="p-4 text-center text-xs font-bold text-slate-600">{leader.matches}</td>
                                  <td className="p-4 text-center text-xs font-bold text-slate-600">{leader.innings}</td>
                                  <td className="p-4 text-right">
                                     <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-black group-hover:bg-blue-600 group-hover:text-white transition-all">{leader.runs}</span>
                                  </td>
                               </tr>
                             ))}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Bowling Leaders Table */}
               <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-lg">
                       <Shield size={18} />
                     </div>
                     <div>
                       <h3 className="text-sm font-black text-slate-900 uppercase italic">Bowling Leaders</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Most Wickets Taken</p>
                     </div>
                  </div>
                  <div className="p-4">
                     <table className="w-full">
                        <thead>
                           <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              <th className="p-4 text-left">Player</th>
                              <th className="p-4 text-center">Mat</th>
                              <th className="p-4 text-center">Overs</th>
                              <th className="p-4 text-right">Wkts</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {performers
                             .filter(p => tournamentMatches.some(m => String(m.id) === String(p.matchId)))
                             .reduce((acc: any[], curr) => {
                               const found = acc.find(a => a.playerId === curr.playerId);
                               if (found) {
                                 found.wickets += curr.wickets;
                                 found.matches += 1;
                                 found.bowlingOvers += (curr.bowlingOvers || 0);
                               } else {
                                 acc.push({ ...curr, matches: 1, bowlingOvers: curr.bowlingOvers || 0 });
                               }
                               return acc;
                             }, [])
                             .sort((a, b) => b.wickets - a.wickets)
                             .slice(0, 10)
                             .map((leader, idx) => (
                               <tr key={leader.playerId} className="group hover:bg-slate-50 transition-colors">
                                  <td className="p-4 flex items-center gap-3">
                                     <span className="text-[10px] font-black text-slate-300 font-mono">#{idx+1}</span>
                                     <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                                        <img src={leader.avatarUrl || "/INS LOGO.PNG"} className="w-full h-full object-cover" alt="" />
                                     </div>
                                     <span className="text-xs font-black text-slate-900 uppercase italic">{leader.playerName}</span>
                                  </td>
                                  <td className="p-4 text-center text-xs font-bold text-slate-600">{leader.matches}</td>
                                  <td className="p-4 text-center text-xs font-bold text-slate-600">{(leader.bowlingOvers || 0).toFixed(1)}</td>
                                  <td className="p-4 text-right">
                                     <span className="px-3 py-1 bg-sky-50 text-sky-600 rounded-lg text-xs font-black group-hover:bg-sky-600 group-hover:text-white transition-all">{leader.wickets}</span>
                                  </td>
                               </tr>
                             ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
