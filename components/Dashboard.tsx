import React, { useState, useEffect, useRef } from 'react';
import { Player, OpponentTeam, UserRole, ScheduledMatch } from '../types';
import { getOpponents, getTournamentPerformers, getMatches } from '../services/storageService';
import { Trophy, Medal, Star, Flame, Crown, Zap, Award, Target, Calendar, X, Download, Activity, ChevronLeft, ChevronRight, Bell, MapPin, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { useMasterData } from './masterDataStore';
import { usePlayerStore } from '../store/playerStore';
import './Dashboard.css';

interface DashboardProps {
  userRole?: UserRole;
  teamLogo?: string;
  currentUser?: { id?: string; name: string; username: string; avatarUrl?: string; canScore?: boolean };
}

const MILESTONE_TAGLINES = {
  batting: {
    century: [
      "Century Mastery: A Masterclass in the Middle.",
      "Triple Digits, Infinite Impact.",
      "The 100-Run Landmark: Pure Class in Every Stroke.",
      "Centurion Status: Commanding the Crease.",
      "Ton Up. Bat Down."
    ],
    halfCentury: [
      "Fifty & Flourishing: Setting the Tempo.",
      "Half-Century Grit: The Backbone of the Innings.",
      "50 Not Out: Lighting Up the Scorecard.",
      "Half-Century Heroics: Turning the Tide.",
      "The Fifty Club: Impact Delivered."
    ]
  },
  bowling: {
    fifer: [
      "Five-Star Performance: Ripping Through the Lineup.",
      "Fifer Club: A Rare and Dominant Display.",
      "The Perfect Five: Bowling at its Finest.",
      "Five-Wicket Heroics: The Ultimate Match-Winning Spell.",
      "Five Down. Pure Dominance."
    ],
    haul: [
      "Triple Strike: Breaking the Opposition's Back.",
      "Clinical Bowling: Three Big Scalps.",
      "In the Zone: A Triple-Wicket Masterclass.",
      "3-Wicket Haul: Turning the Game on its Head.",
      "Triple Threat. Mission Accomplished."
    ],
    hatTrick: [
      "The Hat-Trick: Three Balls, Three Wickets, Absolute Magic.",
      "The Golden Hat-Trick: A Rare Feat of Bowling Perfection.",
      "Hat-Trick Heroics: Dismantling the Lineup in Record Time.",
      "Unstoppable Force: Three-in-a-Row Mastery.",
      "The Triple Kill. Hat-Trick Achieved."
    ]
  }
};

const getRandomTagline = (type: 'batting' | 'bowling', value: number, isHatTrick: boolean = false) => {
  if (type === 'bowling' && isHatTrick) {
    return MILESTONE_TAGLINES.bowling.hatTrick[Math.floor(Math.random() * MILESTONE_TAGLINES.bowling.hatTrick.length)];
  }

  if (type === 'batting') {
    if (value >= 100) {
      return MILESTONE_TAGLINES.batting.century[Math.floor(Math.random() * MILESTONE_TAGLINES.batting.century.length)];
    } else if (value >= 50) {
      return MILESTONE_TAGLINES.batting.halfCentury[Math.floor(Math.random() * MILESTONE_TAGLINES.batting.halfCentury.length)];
    }
  } else if (type === 'bowling') {
    if (value >= 5) {
      return MILESTONE_TAGLINES.bowling.fifer[Math.floor(Math.random() * MILESTONE_TAGLINES.bowling.fifer.length)];
    } else if (value >= 3) {
      return MILESTONE_TAGLINES.bowling.haul[Math.floor(Math.random() * MILESTONE_TAGLINES.bowling.haul.length)];
    }
  }
  return null;
};

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
                  onClick={() => {
                    const hasMoreImpactFromBowling = (player.wickets || 0) * 35 > (player.runs || 0);
                    if (isActive) onSelectHero({
                      player,
                      statsType: hasMoreImpactFromBowling ? 'bowling' : 'batting',
                      statsValue: hasMoreImpactFromBowling 
                        ? `${player.wickets}/${player.bowlingRuns}` 
                        : `${player.runs} (${player.balls})`,
                      matchDate: player.matchDate,
                      matchTime: player.matchTime || (player.matchDate ? new Date(player.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined),
                      opponentName: opponents.find((o: any) => o.id === player.opponentId)?.name || player.opponentName || 'TEAM',
                      groundName: player.groundName || grounds.find((g: any) => g.id === player.groundId)?.name || 'CRICKET GROUND',
                      fullStats: player,
                      isSuperStriker: player.isSuperStriker
                    });
                  }}
                  className={`bg-[#0f172a] rounded-[3rem] p-8 border ${isActive ? 'border-sky-500/50 shadow-[0_0_50px_rgba(56,189,248,0.3)]' : 'border-white/10'} relative overflow-hidden group transition-all duration-500`}
                >
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-sky-600/20 to-transparent"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative mb-6">
                      <div className={`absolute inset-0 bg-sky-400 blur-[40px] ${isActive ? 'opacity-20' : 'opacity-10'} transition-opacity`}></div>
                      <img src={player.avatarUrl} className="w-32 h-40 rounded-[2rem] object-cover border-2 border-white/20 shadow-2xl relative z-10" alt={player.name} />
                      <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 ${player.isSuperStriker ? 'bg-orange-500 text-white' : 'bg-sky-400 text-slate-950'} text-[9px] font-black px-5 py-1 rounded-full border-[2px] border-slate-950 uppercase z-20 whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.3)]`}>
                        {player.isSuperStriker ? '🚀 Super Striker' : (player.wickets > 0 ? 'Wicket Taker' : 'Run Scorer')}
                      </div>
                    </div>
                    <h4 className="font-black text-2xl uppercase tracking-[0.2rem] italic text-center mb-1 leading-none">{player.name}</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4">{player.role}</p>
                    <div className="mb-6 text-center">
                      <p className="text-4xl font-black text-sky-400 italic">
                        {player.wickets * 35 > player.runs ? player.wickets : player.runs}
                        <span className="text-sm font-black text-sky-400/50 ml-1 uppercase">
                          {player.wickets * 35 > player.runs ? 'Wickets' : 'Runs'}
                        </span>
                      </p>
                      
                      {/* Dynamic Milestone Tagline */}
                      {(player.runs >= 50 || player.wickets >= 3 || player.isHatTrick) && (
                        <p className="mt-3 text-[10px] font-black text-white/40 uppercase tracking-widest max-w-[200px] leading-relaxed animate-pulse">
                          {getRandomTagline(
                            (player.wickets >= 3 || player.isHatTrick) ? 'bowling' : 'batting', 
                            (player.wickets >= 3 || player.isHatTrick) ? player.wickets : player.runs,
                            player.isHatTrick
                          )}
                        </p>
                      )}
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
export default function Dashboard({ userRole = 'guest', teamLogo, currentUser }: DashboardProps) {
  const { players, fetchPlayers } = usePlayerStore();
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
          getTournamentPerformers(),
          fetchPlayers()
        ]);
        setOpponents(opp);
        setPerformerData(perf);

        // Prioritize Live matches, then the nearest upcoming match
        const priorityMatch = (allMatches || [])
          .filter(m => (m.status === 'live' || m.status === 'upcoming') && !m.is_test)
          .sort((a, b) => {
            // Live matches always come first
            if (a.status === 'live' && b.status !== 'live') return -1;
            if (b.status === 'live' && a.status !== 'live') return 1;
            // Otherwise, sort by date
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          })[0];

        if (priorityMatch) {
          const opponent = opp.find(o => o.id === priorityMatch.opponentId);
          setNextMatch({ ...priorityMatch, opponentName: priorityMatch.opponentName || (opponent ? opponent.name : 'Opponent') });
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const topRunScorers = [...(players || [])]
    .sort((a, b) => ((b.battingStats?.runs || b.runsScored) || 0) - ((a.battingStats?.runs || a.runsScored) || 0))
    .slice(0, 5);
  const topWicketTakers = [...(players || [])]
    .sort((a, b) => ((b.bowlingStats?.wickets || b.wicketsTaken) || 0) - ((a.bowlingStats?.wickets || a.wicketsTaken) || 0))
    .slice(0, 5);

  const topInningsRuns = [...(players || [])]
    .filter(p => p.battingStats?.highestScore && p.battingStats.highestScore !== '0')
    .sort((a, b) => {
      const valA = parseInt((a.battingStats?.highestScore || '0').replace('*', '')) || 0;
      const valB = parseInt((b.battingStats?.highestScore || '0').replace('*', '')) || 0;
      return valB - valA;
    })
    .slice(0, 5);

  const topInningsWickets = [...(players || [])]
    .filter(p => p.bowlingStats?.bestBowling && p.bowlingStats.bestBowling !== '0/0')
    .sort((a, b) => {
      const [wA, rA] = (a.bowlingStats?.bestBowling || '0/0').split('/').map(Number);
      const [wB, rB] = (b.bowlingStats?.bestBowling || '0/0').split('/').map(Number);
      if (wB !== wA) return wB - wA;
      return rA - rB;
    })
    .slice(0, 5);

  const topSixHitters = [...players]
    .sort((a, b) => (b.battingStats?.sixes || 0) - (a.battingStats?.sixes || 0))
    .slice(0, 5);

  const topFourHitters = [...players]
    .sort((a, b) => (b.battingStats?.fours || 0) - (a.battingStats?.fours || 0))
    .slice(0, 5);

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
    <div className="space-y-8 animate-fade-in pb-12 w-full px-4 md:px-0">
      {/* Standardized Page Header */}
      <div className="flex flex-row justify-between items-center gap-4 border-b border-slate-200 pb-3 mb-2">
        <div className="flex flex-col">
          <h1 className="text-lg md:text-3xl font-black uppercase tracking-tighter text-slate-900 flex items-center gap-3 whitespace-nowrap">
            <span>STRIKERS PULSE</span>
          </h1>
          <div className="flex items-center mt-1">
            <p className="text-slate-400 font-bold text-[8px] md:text-[10px] uppercase tracking-[0.2em] md:tracking-[0.3em] italic whitespace-nowrap">INS Team Management Portal</p>
          </div>
        </div>
        
        <div className="bg-[#0f172a] text-white px-3 md:px-6 py-1.5 md:py-2 rounded-full font-black italic uppercase tracking-tighter md:tracking-widest text-[9px] md:text-sm shadow-xl border border-sky-400/20 whitespace-nowrap shrink-0">
          <span className="animate-bounce-shimmer">
            ONE TEAM <span className="mx-1 md:mx-2 text-sky-400/40">•</span> ONE DREAM
          </span>
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
                        <p className={`text-2xl font-black italic ${selectedHero.isSuperStriker ? 'text-orange-500' : 'text-sky-400'} leading-none`}>
                          {selectedHero.isSuperStriker ? 'SUPER STRIKER' : 'HERO'}
                        </p>
                      </div>
                   </div>
                   <div className="flex-1 flex flex-col items-center justify-center pt-16 px-6">
                      <img src={selectedHero.player.avatarUrl} className="h-[320px] w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] mb-6" alt="Player" crossOrigin="anonymous" />
                      <h2 className="text-3xl font-black text-sky-400 uppercase italic tracking-tighter text-center leading-none mb-2">{selectedHero.player.name}</h2>
                      <div className="h-1 w-12 bg-white/20 rounded-full mb-4"></div>
                      <p className="text-white font-black text-lg uppercase italic tracking-widest">{selectedHero.statsValue}</p>
                      {(selectedHero.player.runs >= 50 || selectedHero.player.wickets >= 3 || selectedHero.player.isHatTrick) && (
                        <p className="mt-4 px-10 text-[8px] font-black text-sky-400/60 uppercase tracking-[0.2em] text-center leading-relaxed italic">
                          {getRandomTagline(
                             (selectedHero.player.wickets >= 3 || selectedHero.player.isHatTrick) ? 'bowling' : 'batting', 
                             (selectedHero.player.wickets >= 3 || selectedHero.player.isHatTrick) ? selectedHero.player.wickets : selectedHero.player.runs,
                             selectedHero.player.isHatTrick
                           )}
                        </p>
                      )}
                      <p className="text-sky-400/50 text-[10px] font-black uppercase mt-4 tracking-[0.2em]">VS {selectedHero.opponentName || 'OPPONENT'}</p>
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
        <div className="md:col-span-1 flex items-center justify-center bg-transparent rounded-3xl p-6">
          <img src="/INS%20LOGO.PNG" className="h-44 object-contain drop-shadow-[0_0_25px_rgba(56,189,248,0.5)]" alt="Team Logo" />
        </div>
        
        <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col justify-center border border-slate-800 shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy size={160} /></div>
          <div className="relative z-10">
            <h3 className="text-lg font-black mb-6 uppercase tracking-widest flex items-center gap-3 text-white">
              <Award className="text-yellow-400" /> Team Legacy
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center relative group overflow-hidden">
                <div className="absolute -top-1 -right-1 opacity-10 group-hover:opacity-20 transition-opacity"><Medal size={48} className="text-yellow-400" /></div>
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5">
                    <Medal size={16} className="text-yellow-400 shrink-0" />
                    <p className="text-2xl md:text-3xl font-black text-yellow-400 leading-none">{legacy.winnersTrophies}</p>
                  </div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter mt-2">Winners</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center relative group overflow-hidden">
                <div className="absolute -top-1 -right-1 opacity-10 group-hover:opacity-20 transition-opacity"><Medal size={48} className="text-slate-300" /></div>
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5">
                    <Medal size={16} className="text-slate-300 shrink-0" />
                    <p className="text-2xl md:text-3xl font-black text-slate-300 leading-none">{legacy.runnersUp}</p>
                  </div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter mt-2">Finalists</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center relative group overflow-hidden">
                <div className="absolute -top-1 -right-1 opacity-10 group-hover:opacity-20 transition-opacity"><Medal size={48} className="text-orange-400" /></div>
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5">
                    <Medal size={16} className="text-orange-400 shrink-0" />
                    <p className="text-2xl md:text-3xl font-black text-orange-400 leading-none">17</p>
                  </div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter mt-2">Semis</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-1 bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {nextMatch?.status === 'live' ? (
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Live Now</h3>
                </div>
              ) : (
                <>
                  <Bell size={18} className="text-blue-600" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Match Alert</h3>
                </>
              )}
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
          {nextMatch?.status === 'live' ? (
            <Link to={`/live/${nextMatch.id}?tab=commentary`} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black rounded-lg flex items-center justify-center gap-2 uppercase tracking-widest mt-4 transition-all animate-pulse">
              <Activity size={14} /> View Live Score
            </Link>
          ) : (
            <Link to="/match-center" className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest mt-4">
              Full Schedule <ChevronRight size={12} />
            </Link>
          )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14 relative z-10">
          {/* Batting Leaderboard */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-100 pb-3">
              <Flame size={14} className="text-orange-500" /> Run Machines
            </h4>
            <div className="space-y-4">
              {topRunScorers.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 group">
                  <div className="relative shrink-0">
                    <img src={p.avatarUrl} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover shadow-sm group-hover:border-blue-500 transition-colors" alt={p.name} />
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate mr-2">{p.name}</span>
                      <span className="text-[11px] font-black text-blue-600">{p.battingStats?.runs || p.runsScored || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Highest Innings Runs */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-100 pb-3">
              <Award size={14} className="text-yellow-500" /> Best Innings
            </h4>
            <div className="space-y-4">
              {topInningsRuns.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 group">
                  <div className="relative shrink-0">
                    <img src={p.avatarUrl} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover shadow-sm group-hover:border-yellow-500 transition-colors" alt={p.name} />
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate mr-2">{p.name}</span>
                      <span className="text-[11px] font-black text-yellow-600">{p.battingStats?.highestScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard: Sixes */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap size={14} className="text-sky-500" /> Six Hitters
            </h4>
            <div className="space-y-4">
              {topSixHitters.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 group">
                  <div className="relative shrink-0">
                    <img src={p.avatarUrl} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover shadow-sm group-hover:border-sky-500 transition-colors" alt={p.name} />
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate mr-2">{p.name}</span>
                      <span className="text-[11px] font-black text-sky-600">{p.battingStats?.sixes || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bowling Leaderboard */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity size={14} className="text-blue-500" /> Wicket Takers
            </h4>
            <div className="space-y-4">
              {topWicketTakers.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 group">
                  <div className="relative shrink-0">
                    <img src={p.avatarUrl} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover shadow-sm group-hover:border-blue-500 transition-colors" alt={p.name} />
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate mr-2">{p.name}</span>
                      <span className="text-[11px] font-black text-blue-600">{p.bowlingStats?.wickets || p.wicketsTaken || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Bowling Figures */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-100 pb-3">
              <Target size={14} className="text-purple-500" /> Best Spell
            </h4>
            <div className="space-y-4">
              {topInningsWickets.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 group">
                  <div className="relative shrink-0">
                    <img src={p.avatarUrl} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover shadow-sm group-hover:border-purple-500 transition-colors" alt={p.name} />
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate mr-2">{p.name}</span>
                      <span className="text-[11px] font-black text-purple-600">{p.bowlingStats?.bestBowling}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard: Fours */}
          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-slate-100 pb-3">
              <Star size={14} className="text-rose-500" /> Boundary Kings
            </h4>
            <div className="space-y-4">
              {topFourHitters.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 group">
                  <div className="relative shrink-0">
                    <img src={p.avatarUrl} className="w-10 h-10 rounded-full border-2 border-slate-100 object-cover shadow-sm group-hover:border-rose-500 transition-colors" alt={p.name} />
                    <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate mr-2">{p.name}</span>
                      <span className="text-[11px] font-black text-rose-600">{p.battingStats?.fours || 0}</span>
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
