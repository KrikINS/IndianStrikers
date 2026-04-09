import React, { useState, useEffect, useRef } from 'react';
import { Player, OpponentTeam, UserRole } from '../types';
import { getOpponents, getTournamentPerformers } from '../services/storageService';
import { Trophy, Medal, Star, Flame, Crown, Zap, Award, Target, Calendar, History as HistoryIcon, X, Share2, Loader2, Download, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const { legacy, tournaments } = useMasterData();
  const [tournamentName, setTournamentName] = useState(tournaments.length > 0 ? tournaments[0].name : '');
  const [groupNumber, setGroupNumber] = useState('A');
  const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
  const [selectedHero, setSelectedHero] = useState<{ player: Player, statsType: 'batting' | 'bowling', statsValue: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const heroPosterRef = useRef<HTMLDivElement>(null);

  // Stats Mode State (Default: Career)
  const [statsMode, setStatsMode] = useState<'career' | 'season'>('career');



  // Load opponents
  useEffect(() => {
    const load = async () => {
      try {
        const opp = await getOpponents();
        setOpponents(opp);
      } catch (e) { console.error("Failed to load dashboard data", e); }
    };
    load();
  }, [tournamentName]);

  // -- Top Performers Logic --
  const processedPlayers = players.map(p => {
    const isCareer = statsMode === 'career';
    return {
      ...p,
      displayRuns: isCareer ? p.runsScored : Math.round(p.runsScored * 0.34), // Simulation for demo
      displayWickets: isCareer ? p.wicketsTaken : Math.round(p.wicketsTaken * 0.34) // Simulation for demo
    };
  });

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
      bars.forEach((bar) => {
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
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-2">
            <Activity className="text-emerald-600" size={28} /> Dashboard
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5 italic">One Team, One Dream • Performance Overview</p>
        </div>
      </div>

      {/* Hero Poster Modal */}
      {selectedHero && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            <div className="flex-1 bg-slate-100 p-8 flex items-center justify-center relative overflow-hidden bg-slate-900">
              {/* Rendering Container - We display this directly but capture ref */}
              <div ref={heroPosterRef} className="w-[400px] h-[500px] bg-slate-900 relative overflow-hidden flex flex-col shadow-2xl shrink-0">
                {/* Background FX */}
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-blue-900 to-slate-900"></div>
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-orange-500/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2"></div>

                {/* Corner Logo */}
                <div className="absolute top-4 left-4 z-20 w-12 h-12 bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20">
                  {teamLogo ? (
                    <img src={teamLogo} className="w-full h-full object-contain" alt="Team Logo" />
                  ) : (
                    <img src="/INS%20LOGO.PNG" className="w-full h-full object-contain" alt="INS" />
                  )}
                </div>

                {/* Player Image */}
                <div className="absolute top-16 left-1/2 -translate-x-1/2 w-64 h-64 z-10">
                  <img src={selectedHero.player.avatarUrl} className="w-full h-full object-cover rounded-full border-4 border-white/20 shadow-xl" crossOrigin="anonymous" alt={selectedHero.player.name} />
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 h-[220px] bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent z-20 flex flex-col justify-end p-6 text-center">
                  <div className="mb-2">
                    <span className="bg-yellow-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded uppercase tracking-wider">Match Day Hero</span>
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">{selectedHero.player.name}</h2>
                  <p className="text-slate-400 text-sm font-medium mb-4">Match Day</p>

                  <div className="flex items-center justify-center gap-4">
                    <div className="bg-white/10 backdrop-blur border border-white/10 rounded-xl px-4 py-2 min-w-[120px]">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">{selectedHero.statsType === 'bowling' ? 'Figures' : 'Score'}</p>
                      <p className="text-2xl font-black text-white">{selectedHero.statsValue}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white p-6 flex flex-col justify-between shrink-0 md:w-80">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-slate-800">Match Hero Poster</h3>
                  <button onClick={() => setSelectedHero(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title="Close" aria-label="Close Modal"><X size={20} /></button>
                </div>
                <p className="text-sm text-slate-500 mb-6">High-quality poster generated for social media sharing. Click the download button below to save.</p>
              </div>

              <button
                onClick={handleGenerateHeroPoster}
                disabled={isGenerating}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-70"
              >
                {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                {isGenerating ? 'Generating...' : 'Download Poster'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Team Legacy */}
      <div className="w-full bg-slate-900 rounded-2xl md:rounded-3xl shadow-xl p-6 md:p-8 text-white relative overflow-hidden flex flex-col justify-center min-h-[200px] border border-slate-800 ring-1 ring-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-black/90 backdrop-blur-xl"></div>
        <div className="absolute top-0 right-0 p-8 opacity-10"><Trophy size={180} /></div>

        <h3 className="text-xl md:text-2xl font-black mb-6 relative z-10 flex items-center gap-3 text-white">
          <Award className="text-yellow-400" /> Team Legacy
        </h3>

        <div className="grid grid-cols-3 gap-3 md:gap-6 relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-5 text-center border border-white/10 hover:bg-white/20 transition-all hover:-translate-y-1">
            <div className="text-yellow-400 mb-2 flex justify-center"><Trophy size={28} /></div>
            <div className="text-2xl md:text-4xl font-black mb-1">{legacy.winnersTrophies}</div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Winners</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-5 text-center border border-white/10 hover:bg-white/20 transition-all hover:-translate-y-1">
            <div className="text-slate-300 mb-2 flex justify-center"><Medal size={28} /></div>
            <div className="text-2xl md:text-4xl font-black mb-1">{legacy.runnersUp}</div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Runners-Up</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-5 text-center border border-white/10 hover:bg-white/20 transition-all hover:-translate-y-1">
            <div className="text-orange-400 mb-2 flex justify-center"><Star size={28} /></div>
            <div className="text-2xl md:text-4xl font-black mb-1">{legacy.runnersUp + 17}</div>
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Semi-Finals</div>
          </div>
        </div>
      </div>

      {/* 3. Weekly Performers (Infinite Loop Carousel) */}
      <div className="w-full flex flex-col justify-center space-y-4 overflow-hidden bg-slate-900 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sky-400/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 px-6">
          <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
            <Zap className="text-sky-400 fill-sky-400" size={24} /> Tournament Performers
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

          {/* Toggle Switch */}
          <div className="bg-slate-100 p-1 rounded-full flex items-center border border-slate-200 self-end sm:self-auto">
            <button
              onClick={() => setStatsMode('career')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statsMode === 'career' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <HistoryIcon size={12} /> Career
            </button>
            <button
              onClick={() => setStatsMode('season')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statsMode === 'season' ? 'bg-white shadow-sm text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calendar size={12} /> Season
            </button>
          </div>
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
const WeeklyPerformerCarousel = ({ performers, onSelectHero }: { performers: any[], onSelectHero: (data: any) => void }) => {
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
                    statsValue: player.wickets > 0 ? `${player.wickets}/${player.bowlingRuns}` : `${player.runs} (${player.balls})`
                  })}
                  title={`View ${player.name}'s Hero Poster`}
                  aria-label={`View performance poster for ${player.name}`}
                  className="bg-slate-950 rounded-[3rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden group transition-all"
                >
                  {/* Jersey Watermark - Tilted Background */}
                  <div className="absolute inset-0 opacity-[0.08] pointer-events-none rotate-[-15deg] scale-150 select-none">
                    <div className="grid grid-cols-4 gap-6 p-4">
                      {Array.from({length: 12}).map((_, i) => (
                        <div key={i} className="text-sky-400 font-black text-6xl italic">7</div>
                      ))}
                    </div>
                  </div>

                  {/* Gradient Accents */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-600/20 to-transparent"></div>
                  
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-sky-400 blur-[40px] opacity-10 group-hover:opacity-30 transition-opacity"></div>
                      <img 
                        src={player.avatarUrl} 
                        className="w-36 h-44 rounded-[2.5rem] object-cover border-2 border-white/20 shadow-2xl relative z-10 transition-transform group-hover:scale-105" 
                        alt={player.name} 
                      />
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-sky-400 text-slate-950 text-[10px] font-black px-6 py-1.5 rounded-full border-[3px] border-slate-950 uppercase tracking-tighter z-20 shadow-xl whitespace-nowrap">
                        {player.wickets > 0 ? 'Wicket Taker' : 'Run Scorer'}
                      </div>
                    </div>

                    <h4 className="font-black text-white text-2xl uppercase tracking-tighter italic text-center mb-1 leading-none">{player.name}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">{player.role}</p>

                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="bg-white/5 rounded-3xl p-4 border border-white/5 backdrop-blur-md">
                        <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Impact</p>
                        <p className="font-black text-white text-xl leading-none">
                          {player.wickets > 0 ? `${player.wickets}/${player.bowlingRuns}` : `${player.runs}(${player.balls})`}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-3xl p-4 border border-white/5 backdrop-blur-md">
                        <p className="text-[9px] uppercase font-bold text-slate-500 mb-1 tracking-widest">{player.wickets > 0 ? 'ECN' : 'SR'}</p>
                        <p className="font-black text-sky-400 text-xl leading-none">
                          {player.wickets > 0 ? (player.bowlingRuns / player.bowlingOvers).toFixed(2) : ((player.runs / (player.balls || 1)) * 100).toFixed(1)}
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
