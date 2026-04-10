import React, { useState, useEffect, useRef } from 'react';
import { Player, OpponentTeam, UserRole, ScheduledMatch } from '../types';
import { getOpponents, getTournamentPerformers, getMatches } from '../services/storageService';
import { Trophy, Medal, Star, Flame, Crown, Zap, Award, Target, Calendar, X, Download, Activity, ChevronLeft, ChevronRight, Bell, MapPin, Clock, Loader2 } from 'lucide-react';
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

// --- Carousel Component for Weekly Performers (Hoisted) ---
function WeeklyPerformerCarousel({ 
  performers, 
  onSelectHero,
  opponents,
  grounds
}: { 
  performers: any[], 
  onSelectHero: (data: any) => void,
  opponents: any[],
  grounds: any[] 
}) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const getCardWidth = () => {
    if (typeof window === 'undefined') return 300;
    if (window.innerWidth < 380) return 280;
    if (window.innerWidth < 420) return 300;
    return 320;
  };

  const CARD_WIDTH = getCardWidth();
  const CARD_GAP = 24;
  const TOTAL_WIDTH = CARD_WIDTH + CARD_GAP;

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
                    opponentName: opponents.find((o: any) => o.id === player.opponentId)?.name || player.opponentName || 'TEAM',
                    groundName: player.groundName || grounds.find((g: any) => g.id === player.groundId)?.name || 'CRICKET GROUND',
                    fullStats: player
                  })}
                  className={`bg-[#0f172a] rounded-[3rem] p-8 border ${isActive ? 'border-sky-500/50 shadow-[0_0_50px_rgba(56,189,248,0.3)]' : 'border-white/10'} relative overflow-hidden group transition-all duration-500`}
                >
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-sky-600/20 to-transparent"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className={`absolute inset-0 bg-sky-400 blur-[40px] ${isActive ? 'opacity-20' : 'opacity-10'} transition-opacity`}></div>
                      <img src={player.avatarUrl} className="w-32 h-40 rounded-[2rem] object-cover border-2 border-white/20 shadow-2xl relative z-10" alt={player.name} />
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-sky-400 text-slate-950 text-[9px] font-black px-5 py-1 rounded-full border-[2px] border-slate-950 uppercase z-20">
                        {player.wickets > 0 ? 'Wicket Taker' : 'Run Scorer'}
                      </div>
                    </div>
                    <h4 className="font-black text-2xl uppercase tracking-[0.2rem] italic text-center mb-1 leading-none">{player.name}</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4">{player.role}</p>
                    <div className="mb-6 text-center">
                      <p className="text-4xl font-black text-sky-400 italic">
                        {player.wickets > 0 ? player.wickets : player.runs}
                        <span className="text-sm font-black text-sky-400/50 ml-1 uppercase">{player.wickets > 0 ? 'Wickets' : 'Runs'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
      
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
        <button title="Previous Slide" onClick={() => setIndex(prev => prev - 1)} className="p-3 rounded-full bg-slate-900/50 border border-white/10 text-white pointer-events-auto hover:bg-sky-500 transition-all"><ChevronLeft size={24}/></button>
        <button title="Next Slide" onClick={() => setIndex(prev => prev + 1)} className="p-3 rounded-full bg-slate-900/50 border border-white/10 text-white pointer-events-auto hover:bg-sky-500 transition-all"><ChevronRight size={24}/></button>
      </div>
    </div>
  );
}

// --- Main Dashboard Component ---
export default function Dashboard({ players, userRole = 'guest' }: DashboardProps) {
  const { legacy, tournaments, grounds } = useMasterData();
  const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
  const [selectedHero, setSelectedHero] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const heroPosterRef = useRef<HTMLDivElement>(null);
  const [nextMatch, setNextMatch] = useState<ScheduledMatch | null>(null);
  const [performerData, setPerformerData] = useState<{ tournamentName: string, performers: any[] }>({ tournamentName: '', performers: [] });

  useEffect(() => {
    const load = async () => {
      try {
        const [opp, allMatches, perf] = await Promise.all([
          getOpponents(), 
          getMatches(),
          getTournamentPerformers()
        ]);
        setOpponents(opp);
        setPerformerData(perf);

        const upcoming = allMatches
          .filter(m => m.status === 'upcoming' && !m.is_test)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        if (upcoming) {
          const opponent = opp.find(o => o.id === upcoming.opponentId);
          setNextMatch({ ...upcoming, opponentName: upcoming.opponentName || (opponent ? opponent.name : 'Opponent') });
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const topRunScorers = [...players].sort((a, b) => b.runsScored - a.runsScored).slice(0, 5);
  const topWicketTakers = [...players].sort((a, b) => b.wicketsTaken - a.wicketsTaken).slice(0, 5);

  const handleGenerateHeroPoster = async () => {
    if (!heroPosterRef.current || !selectedHero) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(heroPosterRef.current, { backgroundColor: '#0c1222', scale: 3, useCORS: true });
      const link = document.createElement('a');
      link.download = `Hero_${selectedHero.player.name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) { console.error(err); } finally { setIsGenerating(false); }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 w-full max-w-7xl mx-auto px-4 md:px-0">
      {/* Standardized Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6 mb-2">
        <div className="flex flex-col">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3">
            <img src="/INS%20LOGO.PNG" className="w-10 h-10 object-contain" alt="INS" /> 
            <span>STRIKERS PULSE</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="h-0.5 w-8 bg-blue-600/20 rounded-full"></div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] italic">Indian Strikers Official</p>
          </div>
        </div>
        
        <div className="bg-[#0f172a] text-white px-6 py-2 rounded-full font-black italic uppercase tracking-widest text-sm shadow-xl border border-sky-400/20">
          ONE TEAM <span className="mx-2 text-sky-400/40">•</span> ONE DREAM
        </div>
      </div>

      {/* Hero Poster Modal */}
      <AnimatePresence>
        {selectedHero && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col md:flex-row border border-white/10"
            >
              {/* Visualizer Area */}
              <div className="flex-[1.5] bg-slate-950 p-4 md:p-8 flex items-center justify-center relative overflow-hidden min-h-[500px]">
                <div ref={heroPosterRef} className="w-[360px] h-[640px] bg-[#0c1222] relative overflow-hidden flex flex-col shrink-0 shadow-2xl">
                   {/* Poster Content */}
                   <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
                      <img src="/INS%20LOGO.PNG" className="w-16 h-16 object-contain" alt="Logo" />
                      <div className="text-white">
                        <p className="text-[10px] font-black italic tracking-widest leading-none">MATCH DAY</p>
                        <p className="text-2xl font-black italic text-sky-400 leading-none">HERO</p>
                      </div>
                   </div>
                   <div className="flex-1 flex flex-col items-center justify-center pt-16 px-6">
                      <img src={selectedHero.player.avatarUrl} className="h-[320px] w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] mb-6" alt="Player" crossOrigin="anonymous" />
                      <h2 className="text-3xl font-black text-sky-400 uppercase italic tracking-tighter text-center leading-none mb-2">{selectedHero.player.name}</h2>
                      <div className="h-1 w-12 bg-white/20 rounded-full mb-4"></div>
                      <p className="text-white font-black text-lg uppercase italic tracking-widest">{selectedHero.statsValue}</p>
                      <p className="text-sky-400/50 text-[10px] font-black uppercase mt-1 tracking-[0.2em]">VS {selectedHero.opponentName || 'OPPONENT'}</p>
                   </div>
                   <div className="p-4 text-center border-t border-white/5">
                      <p className="text-[7px] text-white/20 font-black uppercase tracking-[0.4em]">INDIAN STRIKERS OFFICIAL APP</p>
                   </div>
                </div>
              </div>

              {/* Action Panel */}
              <div className="flex-1 bg-white p-8 md:p-12 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-black text-2xl text-slate-900 uppercase">Poster Created</h3>
                      <div className="h-1 w-12 bg-blue-600 rounded-full mt-1"></div>
                    </div>
                    <button title="Close Poster" onClick={() => setSelectedHero(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X /></button>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic mb-8">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      "Showcase this performance to the club. Perfect for social media sharing!"
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleGenerateHeroPoster} 
                  disabled={isGenerating}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="animate-spin"/> : <Download />} 
                  {isGenerating ? 'GENERATING...' : 'DOWNLOAD POSTER'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Grid: Logo, Legacy, and Match Alert */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 flex items-center justify-center bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <img src="/INS%20LOGO.PNG" className="h-44 object-contain drop-shadow-lg" alt="Team Logo" />
        </div>
        
        <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col justify-center border border-slate-800 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy size={160} /></div>
          <div className="relative z-10">
            <h3 className="text-lg font-black mb-6 uppercase tracking-widest flex items-center gap-3 text-white">
              <Award className="text-yellow-400" /> Team Legacy
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-2xl md:text-3xl font-black text-yellow-400">{legacy.winnersTrophies}</p>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Winners</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-2xl md:text-3xl font-black text-slate-300">{legacy.runnersUp}</p>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Finalists</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-2xl md:text-3xl font-black text-orange-400">17</p>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">Semis</p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-1 bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-blue-600" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Match Alert</h3>
            </div>
            {nextMatch ? (
              <div className="space-y-4">
                <p className="font-black text-slate-900 text-2xl uppercase tracking-tighter italic">VS {nextMatch.opponentName}</p>
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                    <Calendar size={14} /> {new Date(nextMatch.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                    <MapPin size={14} /> {grounds.find(g => g.id === nextMatch.groundId)?.name || 'Ground TBA'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6"><p className="text-xs font-bold text-slate-400 italic">Exploring new seasons...</p></div>
            )}
          </div>
          <Link to="/matches" className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest mt-4">
            Full Schedule <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* Performer Spotlight Section */}
      <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
          <h3 className="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter italic">
            <Zap className="text-sky-400 fill-sky-400" size={28} /> Performer Spotlight
          </h3>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400/80 bg-sky-400/10 px-4 py-2 rounded-full border border-sky-400/20">
            Weekly Highlights
          </span>
        </div>

        <div className="relative z-10">
          {performerData.performers.length > 0 ? (
            <WeeklyPerformerCarousel 
              performers={performerData.performers} 
              onSelectHero={setSelectedHero} 
              opponents={opponents} 
              grounds={grounds} 
            />
          ) : (
            <div className="py-20 text-center bg-white/5 rounded-3xl border border-white/5">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Waiting for this week's heroes...</p>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Target size={140} /></div>
        <div className="flex items-center gap-3 mb-10 relative z-10">
          <Crown className="text-yellow-500 fill-yellow-500" size={32} />
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Leaderboard</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
          {/* Batting Leaderboard */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-100 pb-3">
              <Flame size={16} className="text-orange-500" /> Run Machines
            </h4>
            <div className="space-y-5">
              {topRunScorers.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-4 group">
                  <div className="relative">
                    <img src={p.avatarUrl} className="w-12 h-12 rounded-full border-2 border-slate-100 object-cover shadow-sm group-hover:border-blue-500 transition-colors" alt={p.name} />
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{p.name}</span>
                      <span className="text-sm font-black text-blue-600">{p.runsScored}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${(p.runsScored / (topRunScorers[0].runsScored || 1)) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-orange-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bowling Leaderboard */}
          <div className="space-y-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap size={16} className="text-blue-500" /> Wicket Takers
            </h4>
            <div className="space-y-5">
              {topWicketTakers.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-4 group">
                  <div className="relative">
                    <img src={p.avatarUrl} className="w-12 h-12 rounded-full border-2 border-slate-100 object-cover shadow-sm group-hover:border-blue-500 transition-colors" alt={p.name} />
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{p.name}</span>
                      <span className="text-sm font-black text-blue-600">{p.wicketsTaken}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${(p.wicketsTaken / (topWicketTakers[0].wicketsTaken || 1)) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Global Persistence/Wait State */}
      {isGenerating && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-950 p-8 rounded-3xl border border-blue-500/30 text-center">
            <Loader2 className="animate-spin text-blue-500 mb-4 mx-auto" size={48} />
            <p className="text-white font-black uppercase tracking-widest italic animate-pulse">Crafting Hero Poster...</p>
          </div>
        </div>
      )}
    </div>
  );
}
