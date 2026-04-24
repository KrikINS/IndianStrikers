import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Radio, Edit2, Trash2, Users, Share2, Lock as LockIcon, Unlock, RefreshCcw } from 'lucide-react';
import { ScheduledMatch, OpponentTeam, Ground, UserRole } from '../types';

interface MatchCenterTileProps {
    match: ScheduledMatch;
    homeTeamName: string;
    homeTeamLogo?: string;
    opponent: OpponentTeam | undefined;
    onSelectPlayingXI: (matchId: string, mode: 'home' | 'opponent' | 'lock' | 'view') => void;
    onEditMatch: (match: ScheduledMatch) => void;
    onStartScoring: (matchId: string) => void;
    onViewScorecard: (match: ScheduledMatch) => void;
    onUpdateManualScore: (matchId: string, mode?: 'summary' | 'full') => void;
    onDeleteMatch: (matchId: string) => void;
    onToggleLock?: (matchId: string, currentStatus: boolean) => void;
    userRole: UserRole;
    isAdmin: boolean;
    canScore?: boolean;
    grounds: Ground[];
    isCarouselActive?: boolean;
    isGraphic?: boolean;
    onShareSummary?: (matchId: string) => void;
    tournaments?: any[];
}

const MatchCenterTile: React.FC<MatchCenterTileProps> = ({
    match,
    homeTeamName,
    homeTeamLogo,
    opponent,
    onSelectPlayingXI,
    onEditMatch,
    onStartScoring,
    onViewScorecard,
    onUpdateManualScore,
    onDeleteMatch,
    onToggleLock,
    userRole,
    isAdmin,
    canScore,
    grounds,
    isCarouselActive,
    isGraphic = false,
    onShareSummary,
    tournaments = []
}) => {
    const isScorerOrAdmin = userRole === 'admin' || canScore;
    const isLive = match.status === 'live';
    const isUpcoming = match.status === 'upcoming';
    const isCompleted = match.status === 'completed';

    const matchDate = new Date(match.date);
    const dateFormatted = matchDate.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric'
    }) + ' @ ' + matchDate.toLocaleTimeString(undefined, {
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    const getMatchTimeContext = (matchDate: string) => {
        const now = new Date();
        const matchDateTime = new Date(matchDate);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const matchDay = new Date(matchDateTime.getFullYear(), matchDateTime.getMonth(), matchDateTime.getDate());
        if (matchDay.getTime() === today.getTime()) return 'TODAY';
        if (matchDateTime < now) return 'PAST';
        return 'FUTURE';
    };

    const timeContext = getMatchTimeContext(match.date);
    const isToday = timeContext === 'TODAY';
    const isPast = timeContext === 'PAST';

    const opponentName = opponent?.name || match.opponentName || (match.opponentId && !match.opponentId.includes('-') ? match.opponentId : 'Opponent');
    const opponentLogo = opponent?.logoUrl || match.opponentLogo;

    return (
        <div 
            className={`match-card-compact border transition-all duration-300 ${isLive ? 'border-red-500' : isCarouselActive ? 'border-blue-500/50 shadow-2xl shadow-blue-500/10' : 'border-white/5'}`}
            style={{ backgroundColor: isCarouselActive ? '#0f172a' : '#020617' }}
        >

            {/* HEADER HERO SECTION (Mirroring Player Profile Style) */}
            <div 
                className={`relative h-20 overflow-hidden border-b border-white/5 flex items-center px-6`}
                style={{ backgroundColor: isLive ? 'rgba(69, 10, 10, 0.2)' : '#0f172a' }}
            >
                {/* Jersey-style Watermark */}
                <div 
                    className="absolute -top-5 -right-3 text-6xl font-black italic select-none z-0 pointer-events-none text-white/5 leading-none"
                    style={{ 
                        transform: 'rotate(-10deg)', 
                        fontFamily: '"Graduate", serif',
                    }}
                >
                    {match.tournament?.substring(0, 3) || 'INS'}
                </div>

                <div className={`relative z-10 flex items-center w-full h-full ${isGraphic ? 'justify-center' : 'justify-between'}`}>
                    {/* Status Badge - Hidden in Graphic Mode */}
                    {!isGraphic && (
                        <div className="flex items-center gap-4">
                            {isLive ? (
                                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-[15px] font-black" style={{ background: '#FF0000', color: '#ffffff', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)', border: '1px solid rgba(255,255,255,0.2)' }}>
                                    <span className="relative flex h-3.5 w-3.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                                    </span>
                                    LIVE
                                </div>
                            ) : isUpcoming ? (
                                <div className="px-3 py-1.5 rounded-xl text-[14px] font-black uppercase tracking-wider" style={{ background: '#2563eb', color: '#ffffff', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.1)' }}>Upcoming</div>
                            ) : (
                                <div className="flex items-center gap-2.5">
                                    <div 
                                        className={`px-3 py-1.5 rounded-xl text-[14px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm`}
                                        style={{ 
                                            backgroundColor: '#1e3a8a',
                                            color: '#ffffff'
                                        }}
                                    >
                                        Completed
                                    </div>
                                    {(match as any).is_local_only_override && (
                                        <div className="bg-amber-500 text-black px-3 py-1.5 rounded-xl text-[14px] font-black shadow-lg shadow-amber-500/10 uppercase tracking-wider flex items-center gap-1.5">
                                            <RefreshCcw size={14} className="animate-spin" />
                                            <span>Local Only</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tournament Info - Centered Fixed Position for Graphics */}
                    <div className={`${isGraphic ? 'absolute inset-0 flex flex-col items-center justify-center pointer-events-none' : 'text-right flex items-center justify-end gap-3'}`}>
                        {!isGraphic && isCompleted && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onShareSummary?.(match.id); }}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-sky-400 transition-all flex items-center gap-2 border border-white/5"
                                title="Share Match Summary"
                            >
                                <Share2 size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Summary</span>
                            </button>
                        )}
                        <div className={isGraphic ? 'text-center' : ''}>
                            {(() => {
                                const tId = match.tournamentId || tournaments.find(t => t.name === match.tournament)?.id;
                                if (tId) {
                                    return (
                                        <Link 
                                            to={`/tournaments/${tId}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-[16px] font-black text-white uppercase tracking-tighter leading-tight hover:text-blue-400 hover:underline transition-all block"
                                        >
                                            {match.tournament || 'Exhibition Match'}
                                        </Link>
                                    );
                                }
                                return (
                                    <div className="text-[16px] font-black text-white uppercase tracking-tighter leading-tight">
                                        {match.tournament || 'Exhibition Match'}
                                    </div>
                                );
                            })()}
                            <div className="text-[11px] font-bold uppercase tracking-widest mt-0.5" style={{ color: '#94a3b8' }}>
                                {match.stage || 'Official'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN SCORE SECTION — Vertical team layout */}
            <div className="vs-container-revised">
                {/* Home Team */}
                <div className="team-vertical">
                    <div className="logo-wrapper">
                        {homeTeamLogo
                            ? <img src={homeTeamLogo} className="team-logo-md" alt={homeTeamName} />
                            : <img src="/INS%20LOGO.PNG" className="team-logo-md object-contain" alt="INS" />
                        }
                        {!isGraphic && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectPlayingXI(match.id, 'home'); }}
                                className={`xi-overlay-btn ${match.homeTeamXI?.length ? 'bg-emerald-500 border-white ring-4 ring-emerald-500/20' : 'bg-rose-500 border-white hover:bg-rose-600'}`}
                                title="Playing XI"
                                data-html2canvas-ignore="true"
                            >
                                <Users size={14} className="text-white" />
                            </button>
                        )}
                    </div>
                    <h4 className="team-name-display" style={{ color: '#ffffff' }}>{(homeTeamName || 'Home Team').toUpperCase()}</h4>
                    {(isLive || isCompleted) && match.finalScoreHome && (
                        <div className="team-score-display font-black text-2xl mt-1.5" style={{ color: '#ffffff' }}>
                            {match.finalScoreHome.runs ?? 0}/{match.finalScoreHome.wickets ?? 0}
                            <small className="text-[14px] font-bold ml-1.5 uppercase tracking-tighter" style={{ color: '#94a3b8' }}>({match.finalScoreHome.overs ?? 0} ov)</small>
                        </div>
                    )}
                </div>

                {/* Interactive VS */}
                <div className="vs-interactive">
                    <div className="vs-line"></div>
                    <div className="vs-circle-pulse">VS</div>
                    <div className="vs-line"></div>
                </div>

                {/* Away Team */}
                <div className="team-vertical">
                    <div className="logo-wrapper">
                        {opponentLogo
                            ? <img src={opponentLogo} className="team-logo-md object-contain" alt={opponentName} />
                            : <div className="team-logo-md flex items-center justify-center bg-transparent border border-white/10 text-white/20 font-black text-xs rounded-xl">{String(opponentName).slice(0, 3).toUpperCase()}</div>
                        }
                        {!isGraphic && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectPlayingXI(match.id, 'opponent'); }}
                                className={`xi-overlay-btn ${match.opponentTeamXI?.length ? 'bg-emerald-500 border-white ring-4 ring-emerald-500/20' : 'bg-rose-500 border-white hover:bg-rose-600'}`}
                                title="Playing XI"
                                data-html2canvas-ignore="true"
                            >
                                <Users size={14} className="text-white" />
                            </button>
                        )}
                    </div>
                    <h4 className="team-name-display" style={{ color: '#ffffff' }}>{(opponentName || 'Opponent').toUpperCase()}</h4>
                    {(isLive || isCompleted) && match.finalScoreAway && (
                        <div className="team-score-display font-black text-2xl mt-1.5" style={{ color: '#ffffff' }}>
                            {match.finalScoreAway.runs ?? 0}/{match.finalScoreAway.wickets ?? 0}
                            <small className="text-[14px] font-bold ml-1.5 uppercase tracking-tighter" style={{ color: '#94a3b8' }}>({match.finalScoreAway.overs ?? 0} ov)</small>
                        </div>
                    )}
                </div>
            </div>

            {/* RESULT RIBBON */}
            {!isUpcoming && (
                <div 
                    className={`result-ribbon-bold ${
                        isLive ? 'result-live' :
                        (match.resultNote?.toLowerCase().includes('won') || match.resultSummary?.toLowerCase().includes('won') || 
                         (match.finalScoreHome && match.finalScoreAway && (match.finalScoreHome.runs ?? 0) !== (match.finalScoreAway.runs ?? 0)))
                            ? ((match.resultNote?.includes('Indian Strikers') || match.resultSummary?.includes('Indian Strikers') || (match.finalScoreHome && (match.finalScoreHome.runs ?? 0) > (match.finalScoreAway?.runs ?? 0))) ? 'result-won' : 'result-lost')
                            : ''
                    }`}
                    style={{ 
                        backgroundColor: isLive ? 'rgba(8, 51, 68, 0.6)' : 
                                       ((match.resultNote?.includes('Indian Strikers') || match.resultSummary?.includes('Indian Strikers') || (match.finalScoreHome && match.finalScoreAway && (match.finalScoreHome.runs ?? 0) > (match.finalScoreAway.runs ?? 0))) 
                                            ? 'rgba(16, 185, 129, 0.9)' 
                                            : ((match.resultNote?.toLowerCase().includes('won') || match.resultSummary?.toLowerCase().includes('won') || (match.finalScoreHome && match.finalScoreAway && (match.finalScoreHome.runs ?? 0) < (match.finalScoreAway.runs ?? 0))))
                                                ? 'rgba(244, 63, 94, 0.9)'
                                                : 'rgba(30, 41, 59, 1)')
                    }}
                >
                    {isLive 
                        ? (match.tossDetails || 'MATCH IN PROGRESS') 
                        : (match.resultSummary || match.resultNote || (() => {
                            if (!match.finalScoreHome || !match.finalScoreAway) return match.resultType || 'MATCH COMPLETED';
                            const diff = Math.abs((match.finalScoreHome.runs ?? 0) - (match.finalScoreAway.runs ?? 0));
                            const winner = (match.finalScoreHome.runs ?? 0) > (match.finalScoreAway.runs ?? 0) ? 'Indian Strikers' : opponentName;
                            if (diff === 0) return 'MATCH TIED';
                            return `${winner.toUpperCase()} WON BY ${diff} RUNS`;
                          })())
                    }
                </div>
            )}

            {/* ACTION FOOTER */}
            <div className="px-6 pb-6 mt-auto">
                {/* Info + Admin Controls */}
                <div className="flex items-center justify-between mb-4 text-[20px] match-meta-info uppercase tracking-tight px-1.5">
                    <div className="flex gap-6">
                        <span className="flex items-center gap-2.5" style={{ color: '#cbd5e1' }}><Calendar size={20} style={{ color: '#38bdf8' }} /> {dateFormatted}</span>
                        <span className="flex items-center gap-2.5" style={{ color: '#cbd5e1' }}>
                            <MapPin size={20} style={{ color: '#10b981' }} /> 
                            {(() => {
                                const ground = grounds.find(g => g.id === match.groundId);
                                return ground?.name || 'TBD';
                            })()}
                        </span>
                    </div>
                    {!isGraphic && isAdmin && (
                        <div className="flex gap-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onSelectPlayingXI(match.id, 'view'); }} 
                                className="hover:text-blue-500 transition-colors text-slate-400" 
                                title="Share Squad Graphic"
                            >
                                <Share2 size={16} />
                            </button>
                             <button 
                                onClick={(match.isLocked || (match as any).is_locked) ? undefined : (e) => { e.stopPropagation(); onEditMatch(match); }} 
                                className={`transition-colors ${(match.isLocked || (match as any).is_locked) ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`} 
                                title={(match.isLocked || (match as any).is_locked) ? "Match is Locked" : "Edit Match"}
                                disabled={!!(match.isLocked || (match as any).is_locked)}
                             >
                                <Edit2 size={14} />
                             </button>
                             <button 
                                onClick={(match.isLocked || (match as any).is_locked) ? undefined : (e) => { e.stopPropagation(); if (window.confirm('Delete?')) onDeleteMatch(match.id); }} 
                                className={`transition-colors ${(match.isLocked || (match as any).is_locked) ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-red-600'}`} 
                                title={(match.isLocked || (match as any).is_locked) ? "Match is Locked" : "Delete Match"}
                                disabled={!!(match.isLocked || (match as any).is_locked)}
                             >
                                <Trash2 size={14} />
                             </button>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                {!isGraphic && (
                    <div className="card-footer-grid">
                        {isLive ? (
                            <button onClick={() => onStartScoring(match.id)} className="btn-primary-full bg-red-600 text-white border-red-500 hover:bg-red-700 flex items-center justify-center gap-3">
                                <Radio size={18} /> {isScorerOrAdmin ? 'CONTINUE LIVE SCORING' : 'VIEW LIVE SCORING'}
                            </button>
                        ) : isToday && !isCompleted ? (
                            <>
                                {isScorerOrAdmin ? (
                                    <>
                                        <button onClick={() => onStartScoring(match.id)} className="btn-action-dark bg-blue-600 text-white border-blue-500 hover:bg-blue-700">START LIVE</button>
                                        <button onClick={() => onUpdateManualScore(match.id, 'summary')} className="btn-action-dark">SUMMARY</button>
                                    </>
                                ) : (
                                    <button onClick={() => onViewScorecard(match)} className="btn-primary-bold">
                                        VIEW MATCH INFO
                                        {(match.isLocked) && (
                                            <span title="This scorecard is locked">
                                                <LockIcon size={12} className="text-emerald-500" />
                                            </span>
                                        )}
                                    </button>
                                )}
                            </>
                        ) : (isPast || isCompleted) ? (
                            <>
                                {isScorerOrAdmin ? (
                                    <>
                                        {match.isLocked ? (
                                            <button onClick={() => onViewScorecard(match)} className="btn-primary-full col-span-2 flex items-center justify-center gap-3 py-6">
                                                <LockIcon size={14} /> VIEW LOCKED SCORECARD
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => onUpdateManualScore(match.id, 'summary')} className="btn-action-dark">MATCH SUMMARY</button>
                                                <button onClick={() => onUpdateManualScore(match.id, 'full')} className="btn-action-dark">UPDATE SCORECARD</button>
                                                <button onClick={() => onViewScorecard(match)} className="btn-primary-bold">VIEW FULL SCORECARD</button>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <button onClick={() => onViewScorecard(match)} className="btn-primary-full">VIEW FULL SCORECARD</button>
                                )}
                            </>
                        ) : (
                            <p className="col-span-2 text-center text-white/40 text-[9px] font-black uppercase tracking-widest py-2 bg-slate-900 rounded-lg">
                                Scoring opens {new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MatchCenterTile;
