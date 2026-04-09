import React, { useState, useEffect, useRef } from 'react';
import { Player, OpponentTeam, UserRole, ScheduledMatch } from '../types';
import { getOpponents, getTournamentPerformers, getMatches } from '../services/storageService';
import { Trophy, Medal, Star, Flame, Crown, Zap, Award, Target, Calendar, History as HistoryIcon, X, Share2, Loader2, Download, Activity, ChevronLeft, ChevronRight, Bell, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useMasterData } from './masterDataStore';
import './Dashboard.css';

interface DashboardProps {
  players: Player[];
  userRole?: UserRole;
  teamLogo?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ players, userRole = 'guest', teamLogo }) => {
  const { legacy, tournaments, grounds } = useMasterData();
  const [tournamentName, setTournamentName] = useState(tournaments.length > 0 ? tournaments[0].name : '');
  const [groupNumber, setGroupNumber] = useState('A');
  const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
  const [selectedHero, setSelectedHero] = useState<{ 
    player: Player, 
    statsType: 'batting' | 'bowling', 
    statsValue: string,
    matchDate?: string,
    matchTime?: string,
    opponentName?: string,
    groundName?: string,
    fullStats?: any
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const heroPosterRef = useRef<HTMLDivElement>(null);
  const [nextMatch, setNextMatch] = useState<ScheduledMatch | null>(null);




  // Load opponents and next match
  useEffect(() => {
    const load = async () => {
      try {
        const [opp, allMatches] = await Promise.all([getOpponents(), getMatches()]);
        setOpponents(opp);

        const upcoming = allMatches
          .filter(m => m.status === 'upcoming')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

        if (upcoming) {
          const opponent = opp.find(o => o.id === upcoming.opponentId);
          setNextMatch({
            ...upcoming,
            opponentName: upcoming.opponentName || (opponent ? opponent.name : (upcoming.opponentId || 'Opponent').replace(/-/g, ' '))
          });
        } else {
          setNextMatch(null);
        }
      } catch (e) { console.error("Failed to load dashboard data", e); }
    };
    load();
  }, [tournaments]); // Re-run when tournaments change (since we use it to calculate tournamentName)

  // -- Top Performers Logic (Career) --
  const processedPlayers = players.map(p => ({
    ...p,
    displayRuns: p.runsScored,
    displayWickets: p.wicketsTaken
  }));

  const topRunScorers = [...processedPlayers]
    .sort((a, b) => b.displayRuns - a.displayRuns)
    .slice(0, 5);

  const topWicketTakers = [...processedPlayers]
    .sort((a, b) => b.displayWickets - a.displayWickets)
    .slice(0, 5);

  // -- Tournament Performers Logic --
  const [performerData, setPerformerData] = useState<{ tournamentName: string, performers: any[], isSeasonOpener: boolean }>({
    tournamentName: '',
    performers: [],
    isSeasonOpener: false
  });

  useEffect(() => {
    const loadPerformers = async () => {
      try {
        const data = await getTournamentPerformers();
        setPerformerData(data);
      } catch (e) { console.error("Failed to load tournament performers", e); }
    };
    loadPerformers();
  }, []);

  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (statsRef.current) {
      const bars = statsRef.current.querySelectorAll('[data-width]');
      bars.forEach((bar: any) => {
        const width = (bar as HTMLElement).getAttribute('data-width');
        if (width) (bar as HTMLElement).style.width = width;
      });
    }
  }, [topRunScorers, topWicketTakers]);

  const canEdit = userRole === 'admin' || userRole === 'scorer';


  const handleGenerateHeroPoster = async () => {
    if (!heroPosterRef.current || !selectedHero) return;
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Ensure render
      const canvas = await html2canvas(heroPosterRef.current, {
        backgroundColor: '#0c1222',
        scale: 3, // High density for social media
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      const link = document.createElement('a');
      link.download = `MatchHero_${selectedHero.player.name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Poster generation failed", err);
      alert("Failed to generate poster.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-7xl mx-auto overflow-hidden px-4 md:px-0">
      {/* Standardized Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6 mb-2">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
            <Activity className="text-blue-600 animate-pulse" size={32} /> 
            <span>Dashboard</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="h-0.5 w-8 bg-blue-600/20 rounded-full"></div>
            <p className="text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.3em] italic">Performance Overview</p>
          </div>
        </div>
        
        <div className="relative">
          {/* Subtle Outer Glow */}
          <div className="absolute -inset-0.5 bg-sky-500/20 rounded-full blur-md"></div>
          
          <div className="relative bg-[#0f172a]/80 backdrop-blur-xl border border-sky-400/30 px-6 py-2 rounded-full shadow-2xl">
            <p className="text-[10px] md:text-xs font-black italic uppercase tracking-[0.15rem] animate-bounce-shimmer leading-none flex items-center">
              ONE TEAM <span className="mx-2 text-sky-400/40 text-[8px]">•</span> ONE DREAM
            </p>
          </div>
        </div>
      </div>

      {/* Hero Poster Modal */}      {selectedHero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col md:flex-row border border-white/10">
            {/* Visualizer Area */}
            <div className="flex-[1.5] bg-slate-950 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-slate-950"></div>
              
              {/* Rendering Container - 1080x1920 optimized (360x640 preview) */}
              <div 
                ref={heroPosterRef} 
                className="w-[360px] h-[640px] bg-[#0c1222] relative overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] shrink-0"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {/* 1. BRANDING LAYER (TOP) */}
                <div className="absolute top-0 left-0 right-0 z-50">
                  {/* Header Content: Logo + Title */}
                  <div className="absolute top-4 left-2 flex items-center gap-1.5">
                    <img src="/INS%20LOGO.PNG" className="w-[110px] h-[110px] object-contain drop-shadow-2xl" alt="Logo" />
                    <div className="flex flex-col -mt-1">
                      <h1 className="text-[20px] font-[1000] italic text-white uppercase leading-none tracking-tighter drop-shadow-md">
                        MATCH DAY
                      </h1>
                      <h2 className="text-[26px] font-[1000] italic text-sky-400 uppercase leading-none tracking-tight -mt-0.5 drop-shadow-lg">
                        HERO
                      </h2>
                    </div>
                  </div>
                  
                  {/* Motto - Page Separator Style (Right Aligned) */}
                  <div className="absolute top-2 right-0 bg-white/5 backdrop-blur-3xl border-l border-b border-white/10 pl-4 pr-3 py-1 rounded-bl-2xl shadow-2xl">
                    <span className="text-[7px] font-black italic text-white tracking-[0.25em] uppercase">One Team, One Dream</span>
                  </div>
                </div>

                {/* 2. BACKGROUND WATERMARK */}
                <div 
                  className="absolute left-1/2 -translate-x-1/2 text-[260px] font-black text-sky-400 opacity-[0.05] select-none z-0 tracking-tighter italic"
                  style={{ top: '30%' }}
                >
                   {selectedHero.player.jerseyNumber || 99}
                </div>

                {/* 3. CONTENT STACK: PLAYER IMAGE -> NAME -> DETAILS -> BOXES */}
                <div className="absolute inset-x-0 bottom-[30px] flex flex-col items-center z-30 px-8">
                   
                   {/* Player Picture - Now sits precisely above the name with a cinematic fade */}
                   <div className="w-full flex justify-center mb-6">
                      <img 
                        src={selectedHero.player.avatarUrl} 
                        className="max-h-[380px] w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" 
                        style={{ 
                          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 95%)',
                          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 95%)'
                        }}
                        crossOrigin="anonymous" 
                        alt={selectedHero.player.name}
                      />
                   </div>

                   {/* Player Name */}
                   <div className="text-center mb-3 w-full">
                      <h2 className="text-[26px] font-extrabold text-sky-400 uppercase italic tracking-[0.1rem] leading-none mb-1 animate-bounce-shimmer drop-shadow-2xl">
                        {selectedHero.player.name}
                      </h2>
                   </div>

                   {/* Match Details Stack */}
                   <div className="flex flex-col items-center mb-6 space-y-1">
                      <div className="flex items-center gap-2 opacity-90">
                        <Calendar size={11} className="text-sky-400" />
                        <p className="text-[10px] font-black text-white tracking-[0.15em] uppercase">
                          {selectedHero.matchDate ? new Date(selectedHero.matchDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Season Match'}
                        </p>
                      </div>
                      <h3 className="text-[14px] font-black text-white italic tracking-widest uppercase mt-1">
                        VS <span className="text-sky-400">{selectedHero.opponentName || 'OPPONENT'}</span>
                      </h3>
                   </div>
                   
                   {/* Replicated Hero Card Boxes */}
                   <div className="grid grid-cols-2 gap-3 w-full">
                      <div className="bg-sky-400/10 rounded-2xl p-4 border border-sky-400/20 backdrop-blur-3xl flex flex-col items-center justify-center shadow-xl">
                        <p className="text-[9px] uppercase font-black text-sky-400/70 mb-1 tracking-widest">Impact</p>
                        <p className="font-black text-sky-400 text-lg leading-none">
                          {selectedHero.fullStats?.runs ?? 0} ({selectedHero.fullStats?.balls ?? 0})
                        </p>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-3xl flex flex-col items-center justify-center shadow-xl">
                        <p className="text-[9px] uppercase font-black text-slate-500 mb-1 tracking-widest whitespace-nowrap">
                          {selectedHero.fullStats?.wickets > 0 ? 'Economy' : 'Strike Rate'}
                        </p>
                        <p className="font-black text-white text-lg leading-none">
                          {selectedHero.fullStats?.wickets > 0 
                            ? (selectedHero.fullStats?.bowlingRuns / (selectedHero.fullStats?.bowlingOvers || 1)).toFixed(2)
                            : ((selectedHero.fullStats?.runs / (selectedHero.fullStats?.balls || 1)) * 100).toFixed(1)}
                        </p>
                      </div>
                    </div>
                </div>

                {/* 4. BRANDING LAYER (BOTTOM) */}
                <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center gap-0.5 z-50">
                   <p className="text-[6px] font-black text-white/20 uppercase tracking-[0.4em]">
                     IMAGE GENERATED BY INDIAN STRIKERS APP
                   </p>
                   <p className="text-[7px] font-black text-sky-400/30 uppercase tracking-[0.1em]">
                     WWW.INDIANSTRIKERS.COM
                   </p>
                </div>
              </div>
            </div>

            {/* Content & Action Panel */}
            <div className="flex-1 bg-white p-8 md:p-12 flex flex-col justify-between md:max-w-md">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex flex-col">
                    <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tight">HERO POSTER</h3>
                    <div className="h-1 w-12 bg-blue-600 rounded-full mt-1"></div>
                  </div>
                  <button 
                    onClick={() => setSelectedHero(null)} 
                    className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900" 
                    title="Close Poster Modal"
                    aria-label="Close"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 italic">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      "Player photo is now perfectly centered between the header and match information for a balanced social media layout."
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-12 space-y-4">
                <button
                  onClick={handleGenerateHeroPoster}
                  disabled={isGenerating}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-70 group"
                >
                  {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
                  {isGenerating ? 'GENERATING...' : 'DOWNLOAD POSTER'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top Section: 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
        {/* Left Column (25%): Team Logo */}
        <div className="md:col-span-1 flex items-center justify-center relative overflow-hidden group">
          <img
            src="/INS%20LOGO.PNG"
            className="max-h-48 md:max-h-72 w-auto object-contain transition-all duration-500 group-hover:scale-110 drop-shadow-[0_0_20px_rgba(30,58,138,0.6)]"
            alt="Indian Strikers Logo"
          />
        </div>

        {/* Center Column (50%): Team Legacy */}
        <div className="md:col-span-2 bg-slate-900 rounded-3xl shadow-xl px-6 py-3 md:px-8 md:py-4 text-white relative overflow-hidden flex flex-col justify-center border border-slate-800 ring-1 ring-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-black/90 backdrop-blur-xl"></div>
          <div className="absolute top-0 right-0 p-8 opacity-10"><Trophy size={155} /></div>

          <h3 className="text-base md:text-lg font-black mb-6 relative z-10 flex items-center gap-3 text-white uppercase tracking-wider">
            <Award className="text-yellow-400" size={20} /> Team Legacy
          </h3>

          <div className="grid grid-cols-3 gap-3 md:gap-4 relative z-10">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 md:p-4 text-center border border-white/10 hover:bg-white/10 transition-all">
              <div className="text-yellow-400 mb-1 flex justify-center"><Trophy size={30} /></div>
              <div className="text-xl md:text-2xl font-black mb-0.5">{legacy.winnersTrophies}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Winners</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 md:p-4 text-center border border-white/10 hover:bg-white/10 transition-all">
              <div className="text-slate-300 mb-1 flex justify-center"><Medal size={30} /></div>
              <div className="text-xl md:text-2xl font-black mb-0.5">{legacy.runnersUp}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Finalists</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 md:p-4 text-center border border-white/10 hover:bg-white/10 transition-all">
              <div className="text-orange-400 mb-1 flex justify-center"><Star size={30} /></div>
              <div className="text-xl md:text-2xl font-black mb-0.5">{legacy.runnersUp + 17}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Semis</div>
            </div>
          </div>
        </div>

        {/* Right Column (25%): Match Alert */}
        <div className="md:col-span-1 bg-slate-900 rounded-3xl px-6 py-3 border border-slate-800 relative overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-bl from-emerald-600/5 via-transparent to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/20">
                <Bell size={16} className="text-emerald-400 animate-bounce" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] relative">
                <span className="animate-match-alert-shimmer">MATCH ALERT</span>
              </h3>
            </div>

            {nextMatch ? (
              <div className="space-y-4">
                <div className="flex items-baseline gap-2 border-l-4 border-emerald-500 pl-3 py-1">
                  <span className="text-[11px] font-black text-emerald-400 whitespace-nowrap">VS</span>
                  <p className="text-base font-black text-white italic pr-2 leading-tight uppercase tracking-tight">
                    {nextMatch.opponentName}
                  </p>
                </div>

                <div className="space-y-2 pt-1 border-t border-white/5 mt-2">
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Calendar size={13} className="text-sky-400" />
                    <span className="text-[11px] font-bold tracking-tight">
                      {new Date(nextMatch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <Clock size={13} className="text-sky-400" />
                    <span className="text-[11px] font-bold tracking-tight">
                      {new Date(nextMatch.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} • {nextMatch.matchFormat || 'T20'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <MapPin size={13} className="text-sky-400" />
                    <span className="text-[11px] font-bold tracking-tight whitespace-normal">
                      {grounds.find(g => g.id === nextMatch.groundId)?.name || nextMatch.groundId || 'TBA'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center py-4">
                <p className="text-[11px] font-bold text-slate-500 italic">No matches scheduled at the moment. Check back later!</p>
              </div>
            )}
          </div>

          <div className="relative z-10 pt-4 mt-auto border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">Live Updates</span>
            <Link to="/matches" className="text-[9px] font-black text-white hover:text-sky-400 transition-colors flex items-center gap-1">
              SCHEDULE <ChevronRight size={10} />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Weekly Performers (Infinite Loop Carousel) */}
      <div className="w-full flex flex-col justify-center space-y-4 overflow-hidden bg-slate-900 md:px-10 md:pt-5 md:pb-1 rounded-[2.5rem] border border-slate-800 shadow-2xl relative">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sky-400/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 px-6">
          <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic drop-shadow-[0_0_12px_rgba(56,189,248,0.4)]">
            <Zap className="text-sky-400 fill-sky-400 animate-pulse" size={24} /> PERFORMER SPOTLIGHT
          </h3>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400/60 bg-sky-400/10 px-4 py-1.5 rounded-full border border-sky-400/20">
            {performerData.tournamentName || "Alpha Season"} Highlights
          </span>
        </div>

        <div className="relative z-10">
          {performerData.performers.length === 0 ? (
            <div className="bg-slate-800/50 rounded-3xl p-12 text-center text-slate-500 font-bold border border-white/5 mx-6">
              {performerData.isSeasonOpener ? "Season Opener! Watch this space for upcoming stars." : "Recruiting top talent. No performers this week."}
            </div>
          ) : (
            <WeeklyPerformerCarousel
              performers={performerData.performers}
              onSelectHero={(data) => setSelectedHero(data)}
              opponents={opponents}
              grounds={grounds}
            />
          )}
        </div>
      </div>

      {/* 4. Top Stats (Full Width) */}
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg border border-slate-100 p-4 md:p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5"><Target size={120} /></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 relative z-10 gap-3">
          <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <Crown size={28} className="text-yellow-500 fill-yellow-500" />
            Leaderboard
          </h3>

        </div>

        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10">
          {/* Batting */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-slate-100 pb-2 mb-2">
              <Flame size={12} className="text-orange-500" /> Run Machines
            </h4>
            {topRunScorers.map((player, idx) => (
              <div key={player.id} className="flex items-center gap-2 md:gap-3 group">
                <div className="relative shrink-0">
                  <img src={player.avatarUrl} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-slate-100 object-cover" alt={player.name} />
                  <span className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[9px] md:text-[10px] font-bold w-3.5 h-3.5 md:w-4 md:h-4 flex items-center justify-center rounded-full border border-white">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{player.name}</p>
                    <span className="text-xs font-black text-slate-600">{player.displayRuns}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-1000 progress-bar-fill" data-width={`${(player.displayRuns / (topRunScorers[0]?.displayRuns || 1)) * 100}%`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bowling */}
          <div className="space-y-3 md:space-y-4 md:border-l border-slate-100 md:pl-8">
            <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-slate-100 pb-2 mb-2">
              <Zap size={12} className="text-blue-500" /> Wicket Takers
            </h4>
            {topWicketTakers.map((player, idx) => (
              <div key={player.id} className="flex items-center gap-2 md:gap-3 group">
                <div className="relative shrink-0">
                  <img src={player.avatarUrl} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-slate-100 object-cover" alt={player.name} />
                  <span className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[9px] md:text-[10px] font-bold w-3.5 h-3.5 md:w-4 md:h-4 flex items-center justify-center rounded-full border border-white">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{player.name}</p>
                    <span className="text-xs font-black text-slate-600">{player.displayWickets}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 progress-bar-fill" data-width={`${(player.displayWickets / (topWicketTakers[0]?.displayWickets || 1)) * 100}%`}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>



      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-950 p-8 rounded-3xl border border-blue-500/30 text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-black uppercase tracking-widest italic">Crafting Hero Poster...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Carousel Component for Weekly Performers ---
const WeeklyPerformerCarousel = ({ 
  performers, 
  onSelectHero,
  opponents,
  grounds
}: { 
  performers: any[], 
  onSelectHero: (data: any) => void,
  opponents: OpponentTeam[],
  grounds: any[] // Should technically be Ground[] if typed
}) => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const CARD_WIDTH = 300;
  const CARD_GAP = 32;
  const TOTAL_WIDTH = CARD_WIDTH + CARD_GAP;

  // Auto-Play
  useEffect(() => {
    if (isPaused || performers.length <= 1) return;
    const interval = setInterval(() => {
      setIndex(prev => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, performers.length]);

  const getPlayerIndex = (virtualIndex: number) => {
    const len = performers.length;
    if (len === 0) return 0;
    return ((virtualIndex % len) + len) % len;
  };

  const handleDragEnd = (_: any, info: any) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      setIndex(prev => prev + 1);
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      setIndex(prev => prev - 1);
    }
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  };

  return (
    <div
      className="relative w-full h-[480px] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        <motion.div
          className="flex items-center absolute"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragStart={() => setIsPaused(true)}
          onDragEnd={handleDragEnd}
          animate={{ x: -index * TOTAL_WIDTH }}
          transition={{ type: "spring", stiffness: 150, damping: 20, mass: 1 }}
        >
          {/* Virtual Window of 11 cards */}
          {Array.from({ length: 11 }).map((_, i) => {
            const virtualPos = index + (i - 5);
            const playerIdx = getPlayerIndex(virtualPos);
            const player = performers[playerIdx];
            if (!player) return null;

            const isActive = virtualPos === index;
            const distance = Math.abs(virtualPos - index);

            return (
              <motion.div
                key={virtualPos}
                style={{
                  width: CARD_WIDTH,
                  position: 'absolute',
                  left: virtualPos * TOTAL_WIDTH - (CARD_WIDTH / 2),
                  x: 0
                }}
                animate={{
                  scale: isActive ? 1.05 : Math.max(0.85, 1 - distance * 0.1),
                  opacity: isActive ? 1 : Math.max(0.4, 1 - distance * 0.3),
                  filter: isActive ? "blur(0px)" : `blur(${Math.min(3, distance * 1.5)}px)`,
                  zIndex: 10 - distance,
                  rotateY: isActive ? 0 : (virtualPos < index ? 15 : -15),
                  y: isActive ? -15 : 0
                }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className={isActive ? 'pointer-events-auto' : 'pointer-events-none'}
              >
                <div
                  onClick={() => isActive && onSelectHero({
                    player,
                    statsType: player.wickets > 0 ? 'bowling' : 'batting',
                    statsValue: player.wickets > 0 ? `${player.wickets}/${player.bowlingRuns}` : `${player.runs} (${player.balls})`,
                    matchDate: player.matchDate,
                    matchTime: player.matchTime || (player.matchDate ? new Date(player.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined),
                    opponentName: player.opponentName || opponents.find((o: any) => o.id === player.opponentId)?.name || 'TEAM',
                    groundName: player.groundName || grounds.find((g: any) => g.id === player.groundId)?.name || 'CRICKET GROUND',
                    fullStats: player
                  })}
                  title={`View ${player.name}'s Hero Poster`}
                  aria-label={`View performance poster for ${player.name}`}
                  className={`bg-[#0f172a] rounded-[3rem] p-8 border ${isActive ? 'border-sky-500/50 shadow-[0_0_50px_rgba(56,189,248,0.3)]' : 'border-white/10'} relative overflow-hidden group transition-all duration-500`}
                >
                  {/* Jersey Watermark - Tilted Background */}
                  <div className="absolute inset-0 opacity-[0.05] pointer-events-none rotate-[-15deg] scale-150 select-none">
                    <div className="grid grid-cols-4 gap-6 p-4">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="text-sky-400 font-black text-6xl italic">7</div>
                      ))}
                    </div>
                  </div>

                  {/* Gradient Accents */}
                  <div className={`absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t ${isActive ? 'from-sky-600/20' : 'from-blue-600/10'} to-transparent transition-colors duration-500`}></div>

                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className={`absolute inset-0 bg-sky-400 blur-[40px] ${isActive ? 'opacity-20' : 'opacity-10'} transition-opacity`}></div>
                      <img
                        src={player.avatarUrl}
                        className="w-32 h-40 rounded-[2rem] object-cover border-2 border-white/20 shadow-2xl relative z-10 transition-transform group-hover:scale-105"
                        alt={player.name}
                      />
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-sky-400 text-slate-950 text-[9px] font-black px-5 py-1 rounded-full border-[2px] border-slate-950 uppercase tracking-tighter z-20 shadow-xl whitespace-nowrap">
                        {player.wickets > 0 ? 'Wicket Taker' : 'Run Scorer'}
                      </div>
                    </div>
                    <h4 className="font-black text-2xl uppercase tracking-[0.2rem] italic text-center mb-1 leading-none animate-bounce-shimmer">
                      {player.name}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4">{player.role}</p>

                    {/* Impact Stat: Largest Element */}
                    <div className="mb-6 text-center">
                      <p className="text-4xl font-black text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)] italic">
                        {player.wickets > 0 ? player.wickets : player.runs}
                        <span className="text-sm font-black text-sky-400/50 ml-1 uppercase">
                          {player.wickets > 0 ? 'Wickets' : 'Runs'}
                        </span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      {/* Box 1: Impact Detail */}
                      <div className="bg-sky-400/10 rounded-2xl p-3 border border-sky-400/20 backdrop-blur-md flex flex-col items-center justify-center">
                        <p className="text-[8px] uppercase font-black text-sky-400/70 mb-1 tracking-widest">Impact</p>
                        <p className="font-black text-sky-400 text-lg leading-none">
                          {player.runs} ({player.balls || 0})
                        </p>
                      </div>

                      {/* Box 2: Efficiency (SR or Economy) */}
                      <div className="bg-white/5 rounded-2xl p-3 border border-white/5 backdrop-blur-md flex flex-col items-center justify-center">
                        <p className="text-[8px] uppercase font-black text-slate-500 mb-1 tracking-widest whitespace-nowrap">
                          {player.wickets > 0 ? 'Economy' : 'Strike Rate'}
                        </p>
                        <p className="font-black text-white text-lg leading-none">
                          {player.wickets > 0 
                            ? (player.bowlingRuns / (player.bowlingOvers || 1)).toFixed(2)
                            : ((player.runs / (player.balls || 1)) * 100).toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 hidden md:flex justify-between pointer-events-none">
        <button
          onClick={() => setIndex(prev => prev - 1)}
          title="Previous Performer"
          aria-label="View previous weekly performer"
          className="w-12 h-12 rounded-full bg-slate-900/80 border border-white/10 text-white flex items-center justify-center hover:bg-sky-500 transition-all pointer-events-auto active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => setIndex(prev => prev + 1)}
          title="Next Performer"
          aria-label="View next weekly performer"
          className="w-12 h-12 rounded-full bg-slate-900/80 border border-white/10 text-white flex items-center justify-center hover:bg-sky-500 transition-all pointer-events-auto active:scale-90"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
