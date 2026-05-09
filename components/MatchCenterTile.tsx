import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Radio, Edit2, Trash2, Users, Share2, Lock as LockIcon, Unlock, RefreshCcw, Camera, Download, Zap, X } from 'lucide-react';
import { ScheduledMatch, OpponentTeam, Ground, UserRole } from '../types';

interface MatchCenterTileProps {
    match: ScheduledMatch;
    homeTeamName: string;
    homeTeamLogo?: string;
    allOpponents?: OpponentTeam[];
    opponent: OpponentTeam | undefined;
    onSelectPlayingXI: (matchId: string, mode: 'team1' | 'team2' | 'lock' | 'view') => void;
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
    homeTeamName: defaultHomeTeamName,
    homeTeamLogo: defaultHomeTeamLogo,
    allOpponents = [],
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
    const [showActions, setShowActions] = useState(false);
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

    const homeTeamName = match.team1Name || defaultHomeTeamName;
    const homeTeamLogo = match.team1Logo || defaultHomeTeamLogo;

    const opponentName = match.team2Name;
    const opponentLogo = match.team2Logo;

    return (
        <div 
            className={`match-card-compact border transition-all duration-300 ${isLive ? 'border-red-500' : isCarouselActive ? 'border-blue-500/50 shadow-2xl shadow-blue-500/10' : 'border-white/5'}`}
            style={{ 
                backgroundColor: isCarouselActive ? '#0f172a' : '#020617',
                backgroundImage: isGraphic ? `linear-gradient(rgba(2, 6, 23, 0.95), rgba(2, 6, 23, 0.95)), url('/assets/cricket_ground_bg.png')` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >

            {/* HEADER HERO SECTION (Mirroring Player Profile Style) */}
            <div 
                className={`relative ${isGraphic ? 'py-8' : 'h-20'} overflow-hidden border-b border-white/5 flex items-center px-6`}
                style={{ 
                    backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.85), rgba(2, 6, 23, 0.85)), url('/assets/cricket_ground_bg.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
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
                    {/* Header Info - Left Side (Tournament) */}
                    <div className={isGraphic ? 'text-center' : 'flex flex-col'}>
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
                            {match.stage === 'League' ? 'League Match' : (match.stage || 'Official')}
                        </div>

                        {/* Graphic Mode Metadata */}
                        {isGraphic && (
                            <div className="flex flex-col items-center mt-3 gap-1.5 animate-in fade-in slide-in-from-top-1 duration-500">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                    <Calendar size={10} className="text-blue-500" /> {dateFormatted}
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                    <MapPin size={10} className="text-emerald-500" /> 
                                    {grounds.find(g => g.id === match.groundId)?.name || 'TBD'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Branding/Status - Right Side */}

                </div>
            </div>

            {/* MAIN SCORE SECTION — Vertical team layout */}
            <div className="vs-container-revised">
                {/* Slot 1 (Home) */}
                <div className="team-vertical">
                    <div className="logo-wrapper">
                        {homeTeamLogo ? (
                            <img 
                                src={homeTeamLogo} 
                                className="team-logo-md object-contain" 
                                alt={homeTeamName} 
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fb = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fb) fb.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className="team-logo-md flex items-center justify-center bg-transparent text-white/20 font-black text-xs" style={{ display: homeTeamLogo ? 'none' : 'flex' }}>
                            {String(homeTeamName).slice(0, 3).toUpperCase()}
                        </div>
                        {!isGraphic && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectPlayingXI(match.id, 'team1'); }}
                                className={`xi-overlay-btn ${match.team1XI?.length ? 'bg-emerald-500 border-white ring-4 ring-emerald-500/20' : 'bg-rose-500 border-white hover:bg-rose-600'}`}
                                title="Playing XI"
                                data-html2canvas-ignore="true"
                            >
                                <Users size={14} className="text-white" />
                            </button>
                        )}
                    </div>
                    <h4 className="team-name-display" style={{ color: '#ffffff' }}>{homeTeamName.toUpperCase()}</h4>
                    {(isLive || isCompleted) && match.team1Score && (
                        <div className="team-score-display font-black text-2xl mt-1.5" style={{ color: '#ffffff' }}>
                            <span>{match.team1Score.runs ?? 0}/{match.team1Score.wickets ?? 0}</span>
                            <span className="text-[14px] font-bold uppercase tracking-tighter" style={{ color: '#94a3b8' }}>
                                ({Number.isInteger(match.team1Score.overs || 0) ? (match.team1Score.overs || 0) : (match.team1Score.overs || 0).toFixed(1)} ov)
                            </span>
                        </div>
                    )}
                </div>

                {/* Interactive VS */}
                <div className="vs-interactive">
                    <div className="vs-line"></div>
                    <div className="vs-circle-pulse">VS</div>
                    <div className="vs-line"></div>
                </div>

                {/* Slot 2 (Away) */}
                <div className="team-vertical">
                    <div className="logo-wrapper">
                        {opponentLogo ? (
                            <img 
                                src={opponentLogo} 
                                className="team-logo-md object-contain" 
                                alt={opponentName} 
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fb = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fb) fb.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className="team-logo-md flex items-center justify-center bg-transparent text-white/20 font-black text-xs" style={{ display: opponentLogo ? 'none' : 'flex' }}>
                            {String(opponentName).slice(0, 3).toUpperCase()}
                        </div>
                        {!isGraphic && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onSelectPlayingXI(match.id, 'team2'); }}
                                className={`xi-overlay-btn ${match.team2XI?.length ? 'bg-emerald-500 border-white ring-4 ring-emerald-500/20' : 'bg-rose-500 border-white hover:bg-rose-600'}`}
                                title="Playing XI"
                                data-html2canvas-ignore="true"
                            >
                                <Users size={14} className="text-white" />
                            </button>
                        )}
                    </div>
                    <h4 className="team-name-display" style={{ color: '#ffffff' }}>{(opponentName || 'Opponent').toUpperCase()}</h4>
                    {(isLive || isCompleted) && match.team2Score && (
                        <div className="team-score-display font-black text-2xl mt-1.5" style={{ color: '#ffffff' }}>
                            <span>{match.team2Score.runs ?? 0}/{match.team2Score.wickets ?? 0}</span>
                            <span className="text-[14px] font-bold uppercase tracking-tighter" style={{ color: '#94a3b8' }}>
                                ({Number.isInteger(match.team2Score.overs || 0) ? (match.team2Score.overs || 0) : (match.team2Score.overs || 0).toFixed(1)} ov)
                            </span>
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
                         (match.team1Score && match.team2Score && (match.team1Score.runs ?? 0) !== (match.team2Score.runs ?? 0)))
                            ? (() => {
                                const homeWin = (match.team1Score?.runs ?? 0) > (match.team2Score?.runs ?? 0);
                                const awayWin = (match.team1Score?.runs ?? 0) < (match.team2Score?.runs ?? 0);
                                const isInsHome = match.team1Id === '00000000-0000-0000-0000-000000000000' || match.team1Id === 'IND_STRIKERS';
                                const isInsAway = match.team2Id === '00000000-0000-0000-0000-000000000000' || match.team2Id === 'IND_STRIKERS';
                                
                                if ((isInsHome && homeWin) || (isInsAway && awayWin)) return 'result-won';
                                if ((isInsHome && awayWin) || (isInsAway && homeWin)) return 'result-lost';
                                return 'result-neutral'; // Neutral match win
                            })()
                            : ''
                    }`}
                    style={{ 
                        backgroundColor: isLive ? 'rgba(8, 51, 68, 0.6)' : 
                                       (() => {
                                            const homeWin = (match.team1Score?.runs ?? 0) > (match.team2Score?.runs ?? 0);
                                            const awayWin = (match.team1Score?.runs ?? 0) < (match.team2Score?.runs ?? 0);
                                            const isInsHome = match.team1Id === '00000000-0000-0000-0000-000000000000' || match.team1Id === 'IND_STRIKERS';
                                            const isInsAway = match.team2Id === '00000000-0000-0000-0000-000000000000' || match.team2Id === 'IND_STRIKERS';
                                            
                                            if ((isInsHome && homeWin) || (isInsAway && awayWin)) return 'rgba(16, 185, 129, 0.9)'; // Green
                                            if ((isInsHome && awayWin) || (isInsAway && homeWin)) return 'rgba(244, 63, 94, 0.9)'; // Red
                                            return 'rgba(56, 189, 248, 0.8)'; // Blue for neutral results
                                       })()
                    }}
                >
                    {isLive 
                        ? (match.tossDetails || 'MATCH IN PROGRESS') 
                        : (match.resultSummary || match.resultNote || (() => {
                            if (!match.team1Score || !match.team2Score) return match.resultType || 'MATCH COMPLETED';
                            const diff = Math.abs((match.team1Score.runs ?? 0) - (match.team2Score.runs ?? 0));
                            const winner = (match.team1Score.runs ?? 0) > (match.team2Score.runs ?? 0) ? homeTeamName : opponentName;
                            if (diff === 0) return 'MATCH TIED';
                            return `${winner.toUpperCase()} WON BY ${diff} RUNS`;
                          })())
                    }
                </div>
            )}

            {/* ACTION FOOTER */}
            <div className="px-6 pb-6 mt-auto" data-html2canvas-ignore="true">
                {/* Info + Admin Controls */}
                <div className="flex flex-col gap-3 mb-6 mt-4">
                    <div className="flex items-center justify-center">
                        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 w-full">
                            {/* Consolidated Status, Date, and Ground into one horizontal line */}
                            {isLive && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-900/40 text-red-500 text-[9px] font-black border border-red-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                    LIVE
                                </div>
                            )}
                            {isUpcoming && (
                                <div className="px-2 py-0.5 rounded bg-blue-900/40 text-blue-400 text-[9px] font-black border border-blue-500/30">UPCOMING</div>
                            )}
                            {isCompleted && (
                                <div className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-400 text-[9px] font-black border border-emerald-500/30">COMPLETED</div>
                            )}
                            
                            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tight text-slate-300">
                                <Calendar size={13} className="text-blue-500" /> {dateFormatted}
                            </span>

                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tight text-slate-400">
                                <MapPin size={13} className="text-emerald-500" /> 
                                {(() => {
                                    const ground = grounds.find(g => g.id === match.groundId);
                                    return ground?.name || 'TBD';
                                })()}
                            </div>
                        </div>

                        {/* Moved Admin Actions to Dropdown */}
                    </div>
                </div>

                {/* Footer Buttons - Action Dropdown */}
                {!isGraphic && (
                        <div className="flex gap-2 relative">
                            {/* Primary View Action */}
                            <button 
                                onClick={() => onViewScorecard(match)} 
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] text-[11px] uppercase tracking-widest"
                            >
                                <Users size={16} /> MATCH CENTER
                            </button>

                            {/* Action Menu Toggle */}
                            <div className="relative">
                                {(() => {
                                    const isPressed = showActions ? "true" : "false";
                                    return (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
                                            className={`px-6 h-full font-black rounded-xl border flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all ${showActions ? 'bg-white border-white text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                                            aria-pressed={isPressed}
                                        >
                                            {showActions ? <X size={16} /> : <Zap size={16} className="text-yellow-400" />} 
                                            {showActions ? 'CLOSE' : 'ACTIONS'}
                                        </button>
                                    );
                                })()}

                                {/* Dropdown Menu */}
                                {showActions && (
                                    <div 
                                        className="absolute bottom-full right-0 mb-3 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-bottom-2 duration-200 action-dropdown"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* 1. Primary Feature Actions (Available to Everyone) */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setShowActions(false); onShareSummary?.(match.id); }}
                                            className="w-full px-5 py-4 text-left text-[11px] font-black text-white hover:bg-white/5 flex items-center gap-3 border-b border-white/5 transition-colors uppercase tracking-widest"
                                        >
                                            <Camera size={14} className="text-sky-400" /> CAPTURE CARD
                                        </button>

                                        {/* 2. Admin/Scorer Actions */}
                                        {isScorerOrAdmin && (
                                            <>
                                                {isLive ? (
                                                    <button 
                                                        onClick={() => { setShowActions(false); onStartScoring(match.id); }} 
                                                        className="w-full px-5 py-4 text-left text-[11px] font-black text-white hover:bg-red-600/20 hover:text-red-400 flex items-center gap-3 border-b border-white/5 transition-colors uppercase tracking-widest"
                                                    >
                                                        <Radio size={14} className="text-red-500" /> CONTINUE SCORING
                                                    </button>
                                                ) : (
                                                    <>
                                                        {!match.isLocked && (
                                                            <>
                                                                <button 
                                                                    onClick={() => { setShowActions(false); onUpdateManualScore(match.id, 'summary'); }} 
                                                                    className="w-full px-5 py-4 text-left text-[11px] font-black text-white hover:bg-blue-600/20 flex items-center gap-3 border-b border-white/5 transition-colors uppercase tracking-widest"
                                                                >
                                                                    <Edit2 size={14} className="text-blue-500" /> EDIT SUMMARY
                                                                </button>
                                                                <button 
                                                                    onClick={() => { setShowActions(false); onUpdateManualScore(match.id, 'full'); }} 
                                                                    className="w-full px-5 py-4 text-left text-[11px] font-black text-white hover:bg-emerald-600/20 flex items-center gap-3 border-b border-white/5 transition-colors uppercase tracking-widest"
                                                                >
                                                                    <RefreshCcw size={14} className="text-emerald-500" /> UPDATE SCORECARD
                                                                </button>
                                                            </>
                                                        )}
                                                        {isToday && !isCompleted && (
                                                            <button 
                                                                onClick={() => { setShowActions(false); onStartScoring(match.id); }} 
                                                                className="w-full px-5 py-4 text-left text-[11px] font-black text-white hover:bg-yellow-600/20 flex items-center gap-3 border-b border-white/5 transition-colors uppercase tracking-widest"
                                                            >
                                                                <Zap size={14} className="text-yellow-400" /> START SCORING
                                                            </button>
                                                        )}
                                                    </>
                                                )}

                                                {/* Admin Only: Edit/Delete */}
                                                {isAdmin && !match.isLocked && !isCompleted && (
                                                    <>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setShowActions(false); onEditMatch(match); }}
                                                            className="w-full px-5 py-4 text-left text-[11px] font-black text-white hover:bg-blue-600/20 flex items-center gap-3 border-b border-white/5 transition-colors uppercase tracking-widest"
                                                        >
                                                            <Edit2 size={14} className="text-slate-400" /> CONFIGURE MATCH
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setShowActions(false); if (window.confirm('Delete this match?')) onDeleteMatch(match.id); }}
                                                            className="w-full px-5 py-4 text-left text-[11px] font-black text-rose-500 hover:bg-rose-600/20 flex items-center gap-3 transition-colors uppercase tracking-widest"
                                                        >
                                                            <Trash2 size={14} /> DELETE MATCH
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                )}
            </div>
            {isGraphic && (
                <div className="pb-6 pt-2 text-center border-t border-white/5 bg-transparent">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic">
                        © WWW.INDIANSTRIKERS.CLUB
                    </p>
                </div>
            )}
        </div>
    );
};

export default MatchCenterTile;
