import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { useCricketScorer, BallRecord } from './matchStore';
import { useMatchCenter } from './matchCenterStore';
import { RotateCcw, History, Zap, TrendingUp, AlertCircle, Shield, Home } from 'lucide-react';

/* --- STYLED COMPONENTS: DARK SPORTS THEME --- */
const DashboardContainer = styled.div`
  min-height: 100vh;
  background-color: #1A1D21; /* Charcoal gray */
  padding-bottom: 5rem;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  color: #FFFFFF;
`;

const PremiumHeader = styled.div<{ $isFirstInnings: boolean }>`
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  background-color: #111417;
  border-bottom: 2px solid ${props => props.$isFirstInnings ? '#2ECC71' : '#E67E22'};
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
`;

const DecorLayer = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  padding: 2rem;
  opacity: 0.05;
  transform: rotate(-12deg) translate(3rem, -1.5rem);
`;

const ScoreDisplay = styled.h1`
  font-size: 4.5rem;
  line-height: 1;
  font-weight: 900;
  font-style: italic;
  letter-spacing: -0.05em;
  margin: 0.5rem 0;
  text-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: baseline;
  justify-content: center;
`;

const StatAccent = styled.span`
  color: #2ECC71; /* Electric Green */
`;

const OversBadge = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  border-radius: 0.5rem;
  padding: 0.25rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #A0AEC0;
`;

const ScoreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
`;

const ScoreButton = styled.button<{ $boundaryType?: 'four' | 'six' }>`
  height: 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  font-size: 1.5rem;
  font-weight: 900;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
  
  /* Charcoal Panels */
  background-color: #262B32; 
  color: ${props => 
    props.$boundaryType === 'four' ? '#E67E22' : 
    props.$boundaryType === 'six' ? '#2ECC71' : 
    '#FFFFFF'};
    
  border-bottom: 4px solid ${props => 
    props.$boundaryType === 'four' ? '#E67E22' : 
    props.$boundaryType === 'six' ? '#2ECC71' : 
    '#1A1D21'};

  &:active {
    transform: scale(1.05);
    background-color: ${props => 
      props.$boundaryType === 'four' ? '#E67E22' : 
      props.$boundaryType === 'six' ? '#2ECC71' : 
      '#FFFFFF'};
    color: ${props => (props.$boundaryType ? '#FFFFFF' : '#1A1D21')};
  }

  @media (min-width: 768px) {
    height: 5rem;
  }
`;

const TargetBox = styled.div`
  margin: -1rem 1rem 0;
  position: relative;
  z-index: 20;
  background-color: #262B32;
  border-radius: 1rem;
  padding: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
`;

export default function ScorerDashboard() {
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();
    const { matches } = useMatchCenter();
    const { 
        matchId: currentMatchId,
        totalRuns,
        wickets,
        totalBalls,
        history,
        striker,
        nonStriker,
        target,
        isFirstInnings,
        initializeMatch, 
        recordBall, 
        undoLastBall, 
        startSecondInnings, 
        resetMatch, 
        getOvers 
    } = useCricketScorer();
    const [showWicketModal, setShowWicketModal] = useState(false);

    // Initialize store with match data if provided
    useEffect(() => {
        if (matchId) {
            const matchData = matches.find(m => m.id === matchId);
            if (matchData) {
                // Determine who bats first (simplified: home team bats first if it's 1st innings)
                // In a real app, this would be based on tossDetails
                initializeMatch(
                    matchId, 
                    matchData.homeTeamXI, 
                    matchData.opponentTeamXI
                );
            }
        }
    }, [matchId, matches, initializeMatch]);

    // Calculation for Chase
    const runsNeeded = target ? target - totalRuns : 0;
    const ballsRemaining = 120 - totalBalls; // 20 Over match simulation
    const rrr = ballsRemaining > 0 ? (runsNeeded / (ballsRemaining / 6)).toFixed(2) : "0.00";

    const getBallColor = (ball: BallRecord) => {
        if (ball.isWicket) return 'bg-rose-600 text-white shadow-rose-200';
        if (ball.type !== 'legal') return 'bg-amber-500 text-white shadow-amber-200';
        if (ball.runs === 4) return 'bg-orange-500 text-white shadow-orange-200';
        if (ball.runs === 6) return 'bg-[#2ECC71] text-white shadow-green-200';
        return 'bg-[#262B32] text-white border border-white/10';
    };

    return (
        <DashboardContainer>
            {/* 1. Header & Innings Control - STYLED COMPONENTS APPLIED */}
            <PremiumHeader $isFirstInnings={isFirstInnings}>
                <DecorLayer>
                    <img src="/INS-LOGO.png" className="w-[180px] h-[180px] object-contain opacity-20" alt="Team Logo" />
                </DecorLayer>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-4">
                        <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-1.5">
                            <Zap size={12} className="text-[#2ECC71] fill-[#2ECC71]" />
                            {isFirstInnings ? "1st Innings" : "2nd Innings"}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => navigate('/match-center')} 
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                                title="Back to Match Center"
                            >
                                <Home size={18} />
                            </button>
                            <button 
                                onClick={resetMatch} 
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                                aria-label="Refresh Match"
                                title="Refresh Match"
                            >
                                <RotateCcw size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col items-center space-y-1">
                        <ScoreDisplay>
                            {totalRuns}<span className="text-3xl opacity-40 mx-2 font-normal">/</span><StatAccent>{wickets}</StatAccent>
                        </ScoreDisplay>
                        <OversBadge>
                            Overs: <StatAccent>{getOvers()}</StatAccent><span className="opacity-40 text-xs ml-1 font-normal">/ 20.0</span>
                        </OversBadge>
                    </div>
                </div>
            </PremiumHeader>

            {/* 2. Target Info - STYLED COMPONENTS APPLIED */}
            {!isFirstInnings && target && (
                <TargetBox>
                    <div className="pl-2">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target</p>
                        <p className="text-2xl font-black text-white">{target}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-[#2ECC71]">Need {runsNeeded} of {ballsRemaining}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">Req RR: {rrr}</p>
                    </div>
                </TargetBox>
            )}

            <div className="max-w-md mx-auto p-4 space-y-6">
                {/* 3. Batsmen Tracking (Adapted to Dark theme via Tailwind) */}
                <div className="grid grid-cols-2 gap-3">
                    {[striker, nonStriker].map((p, idx) => (
                        <div key={idx} className={`bg-[#262B32] rounded-2xl p-4 transition-all ${idx === 0 ? 'border border-[#2ECC71]/30 ring-2 ring-[#2ECC71]/20' : 'border border-white/5'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-[#2ECC71] shadow-[0_0_8px_#2ECC71] animate-pulse' : 'bg-slate-600'}`}></div>
                                <span className={`text-xs font-bold truncate ${idx === 0 ? 'text-white' : 'text-slate-400'}`}>{p.name}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white">{p.runs}</span>
                                <span className="text-xs text-slate-500 font-medium italic">({p.balls})</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 4. Recent Balls Timeline (Dark mode adapted) */}
                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-1.5 justify-center py-2 px-4 bg-[#262B32] rounded-full border border-white/5">
                        {history.length === 0 ? (
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Waiting for first ball</span>
                        ) : (
                            history.slice(-6).map((ball: BallRecord, i: number, arr: BallRecord[]) => {
                                const actualIndex = history.length - arr.length + i;
                                const isNewest = actualIndex === history.length - 1;
                                const animClass = isNewest 
                                    ? (ball.isWicket ? 'animate-wicket-shake' : 'animate-slide-pulse') 
                                    : '';

                                return (
                                    <div 
                                        key={actualIndex} 
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shadow-md transition-all duration-300 ${animClass} ${getBallColor(ball)}`}
                                    >
                                        {ball.isWicket ? 'W' : ball.type === 'wide' ? 'wd' : ball.type === 'no-ball' ? 'nb' : ball.runs}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 5. PRIMARY SCORING GRID - STYLED COMPONENTS APPLIED */}
                <div className="space-y-4">
                    <ScoreGrid>
                        {[0, 1, 2, 3, 4, 6].map(n => {
                            const boundaryType = n === 4 ? 'four' : n === 6 ? 'six' : undefined;
                            const label = n === 0 ? 'Dot' : n === 1 ? 'Single' : n === 4 ? 'Boundary' : n === 6 ? 'Maximum' : 'Runs';
                            
                            return (
                                <ScoreButton 
                                    key={n} 
                                    onClick={() => recordBall(n, 'legal', false)}
                                    $boundaryType={boundaryType}
                                >
                                    {n}
                                    <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginTop: '2px' }}>
                                        {label}
                                    </span>
                                </ScoreButton>
                            );
                        })}
                    </ScoreGrid>

                    {/* 6. EXTRAS & WICKET ACTIONS (Dark Mode Tailwind) */}
                    <div className="grid grid-cols-3 gap-3">
                        <button 
                            onClick={() => recordBall(0, 'wide', false)} 
                            className="bg-[#262B32] border border-amber-500/50 text-amber-500 hover:bg-amber-500/10 h-14 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all"
                        >
                            WIDE
                        </button>
                        <button 
                            onClick={() => recordBall(0, 'no-ball', false)} 
                            className="bg-[#262B32] border border-orange-500/50 text-orange-500 hover:bg-orange-500/10 h-14 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-all"
                        >
                            NB
                        </button>
                        <button 
                            onClick={() => setShowWicketModal(true)} 
                            className="bg-rose-600 text-white h-14 rounded-xl font-black text-sm shadow-lg shadow-rose-900/50 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <AlertCircle size={16} /> WICKET
                        </button>
                    </div>

                    {/* 7. UTILITY ACTIONS (Dark Mode Tailwind) */}
                    <div className="flex gap-3">
                        <button 
                            onClick={undoLastBall} 
                            className="flex-1 bg-[#262B32] border border-white/10 hover:bg-white/5 text-slate-300 h-12 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-95"
                        >
                            <History size={14} /> Undo Ball
                        </button>
                        {isFirstInnings && (
                            <button 
                                onClick={startSecondInnings} 
                                className="flex-1 bg-[#2ECC71] hover:bg-[#27AE60] text-[#1A1D21] h-12 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-[#2ECC71]/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <TrendingUp size={14} /> Finish 1st Inn.
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* WICKET CONFIRMATION MODAL */}
            {showWicketModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-[#262B32] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-pulse text-white">
                        <div className="w-12 h-12 bg-rose-600/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <AlertCircle className="text-rose-500" size={24} />
                        </div>
                        <h3 className="text-xl font-black text-center text-white mb-2">Confirm Wicket?</h3>
                        <p className="text-sm text-center text-slate-400 mb-6 font-medium">Are you sure you want to record a wicket?</p>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowWicketModal(false)}
                                className="flex-1 bg-[#1A1D21] border border-white/10 hover:bg-white/5 text-white font-bold py-3 rounded-xl transition-colors active:scale-95"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    recordBall(0, 'legal', true);
                                    setShowWicketModal(false);
                                }}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-3 rounded-xl shadow-lg shadow-rose-900/50 transition-colors active:scale-95"
                            >
                                Confirm Wicket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardContainer>
    );
}
