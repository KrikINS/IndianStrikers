import React from 'react';
import { Calendar, MapPin, Radio, Edit2, Trash2, Users, Check } from 'lucide-react';
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
    userRole: UserRole;
    isAdmin: boolean;
    grounds: Ground[];
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
    userRole,
    isAdmin,
    grounds
}) => {
    const isScorerOrAdmin = userRole === 'admin' || userRole === 'scorer';
    const isLive = match.status === 'live';
    const isUpcoming = match.status === 'upcoming';
    const isCompleted = match.status === 'completed';

    const matchDate = new Date(match.date);
    const dateFormatted = matchDate.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric'
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

    const opponentName = opponent ? opponent.name : (match.opponentId || 'Opponent').replace(/-/g, ' ');

    return (
        <div className={`match-card-compact border transition-all duration-300 ${isLive ? 'border-red-400/40' : 'border-slate-100'}`}>

            {/* TOP INFO STRIP */}
            <div className={`px-4 py-2 border-b flex items-center justify-between text-[10px] font-bold uppercase tracking-tight
                ${isLive ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}
            >
                <div className="flex items-center gap-2">
                    {isLive && (
                        <div className="flex items-center gap-1.5 text-red-500">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span>LIVE</span>
                        </div>
                    )}
                    {isUpcoming && <span className="text-blue-600">Upcoming</span>}
                    {isCompleted && <span className="status-tag-completed">Completed</span>}
                </div>
                <div className="tournament-strip">
                    {(match.tournament || 'No Tournament').toUpperCase()} - {(match.stage || 'League').toUpperCase()} MATCH
                </div>
            </div>

            {/* MAIN SCORE SECTION — Vertical team layout */}
            <div className="vs-container-revised">
                {/* Home Team */}
                <div className="team-vertical">
                    <div className="logo-wrapper">
                        {homeTeamLogo
                            ? <img src={homeTeamLogo} className="team-logo-md" alt={homeTeamName} />
                            : <img src="/INS-LOGO.png" className="team-logo-md" alt="INS" />
                        }
                        <button
                            onClick={() => onSelectPlayingXI(match.id, 'home')}
                            className={`xi-overlay-btn ${match.homeTeamXI?.length ? 'bg-emerald-500 border-white ring-4 ring-emerald-500/20' : 'bg-rose-500 border-white hover:bg-rose-600'}`}
                            title="Playing XI"
                        >
                            <Users size={14} className="text-white" />
                        </button>
                    </div>
                    <h4 className="team-name-display">{(homeTeamName || 'Home Team').toUpperCase()}</h4>
                    {(isLive || isCompleted) && match.finalScoreHome && (
                        <div className="team-score-display">
                            {match.finalScoreHome.runs}/{match.finalScoreHome.wickets}
                            <small className="text-xs text-slate-400 font-medium ml-1">({match.finalScoreHome.overs} ov)</small>
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
                        {opponent?.logoUrl
                            ? <img src={opponent.logoUrl} className="team-logo-md object-contain" alt={opponentName} />
                            : <div className="team-logo-md flex items-center justify-center bg-transparent border border-slate-200 text-slate-400 font-black text-xs rounded-xl">{String(opponentName).slice(0, 3).toUpperCase()}</div>
                        }
                        <button
                            onClick={() => onSelectPlayingXI(match.id, 'opponent')}
                            className={`xi-overlay-btn ${match.opponentTeamXI?.length ? 'bg-emerald-500 border-white ring-4 ring-emerald-500/20' : 'bg-rose-500 border-white hover:bg-rose-600'}`}
                            title="Playing XI"
                        >
                            <Users size={14} className="text-white" />
                        </button>
                    </div>
                    <h4 className="team-name-display">{(opponentName || 'Opponent').toUpperCase()}</h4>
                    {(isLive || isCompleted) && match.finalScoreAway && (
                        <div className="team-score-display">
                            {match.finalScoreAway.runs}/{match.finalScoreAway.wickets}
                            <small className="text-xs text-slate-400 font-medium ml-1">({match.finalScoreAway.overs} ov)</small>
                        </div>
                    )}
                </div>
            </div>

            {/* RESULT RIBBON */}
            {(isCompleted || isLive) && (match.resultSummary || match.resultNote || match.tossDetails) && (
                <div className="result-ribbon-bold">
                    {isLive ? (match.tossDetails || 'Match in Progress') : (match.resultNote || match.resultSummary)}
                </div>
            )}

            {/* ACTION FOOTER */}
            <div className="px-4 pb-4 mt-auto">
                {/* Info + Admin Controls */}
                <div className="flex items-center justify-between mb-3 text-[13.5px] match-meta-info uppercase tracking-tight px-1">
                    <div className="flex gap-3">
                        <span className="flex items-center gap-1"><Calendar size={15} /> {dateFormatted}</span>
                        <span className="flex items-center gap-1">
                            <MapPin size={15} /> 
                            {grounds.find(g => g.id === match.groundId)?.name || 'TBD'}
                        </span>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <button onClick={() => onEditMatch(match)} className="hover:text-blue-600 transition-colors" title="Edit Match"><Edit2 size={10} /></button>
                            <button onClick={() => window.confirm('Delete?') && onDeleteMatch(match.id)} className="hover:text-red-600 transition-colors" title="Delete Match"><Trash2 size={10} /></button>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="card-footer-grid">
                    {isLive ? (
                        <button onClick={() => onStartScoring(match.id)} className="btn-primary-full bg-red-600 text-white border-red-500 hover:bg-red-700 flex items-center justify-center gap-2">
                            <Radio size={12} /> {isScorerOrAdmin ? 'CONTINUE LIVE SCORING' : 'VIEW LIVE SCORING'}
                        </button>
                    ) : isToday && !isCompleted ? (
                        <>
                            {isScorerOrAdmin ? (
                                <>
                                    <button onClick={() => onStartScoring(match.id)} className="btn-action-dark bg-blue-600 text-white border-blue-500 hover:bg-blue-700">START LIVE</button>
                                    <button onClick={() => onUpdateManualScore(match.id, 'summary')} className="btn-action-dark">SUMMARY</button>
                                </>
                            ) : (
                                <button onClick={() => onViewScorecard(match)} className="btn-primary-bold">VIEW MATCH INFO</button>
                            )}
                        </>
                    ) : (isPast || isCompleted) ? (
                        <>
                            {isScorerOrAdmin ? (
                                <>
                                    <button onClick={() => onUpdateManualScore(match.id, 'summary')} className="btn-action-dark">MATCH SUMMARY</button>
                                    <button onClick={() => onUpdateManualScore(match.id, 'full')} className="btn-action-dark">UPDATE SCORECARD</button>
                                    <button onClick={() => onViewScorecard(match)} className="btn-primary-bold">VIEW FULL SCORECARD</button>
                                </>
                            ) : (
                                <button onClick={() => onViewScorecard(match)} className="btn-primary-full">VIEW FULL SCORECARD</button>
                            )}
                        </>
                    ) : (
                        <p className="col-span-2 text-center text-black text-[9px] font-black uppercase tracking-widest py-2 bg-slate-50 rounded-lg">
                            Scoring opens {new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchCenterTile;
