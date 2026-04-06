import React from 'react';
import { ScheduledMatch } from './matchCenterStore';
import { Calendar, MapPin, Radio, Trophy, Shield, Edit2, Play, TableProperties, FileText } from 'lucide-react';
import { OpponentTeam } from '../types';

interface MatchCenterTileProps {
    match: ScheduledMatch;
    homeTeamName: string;
    homeTeamLogo?: string;
    opponent: OpponentTeam | undefined;
    onSelectPlayingXI: (matchId: string, mode: 'home' | 'opponent' | 'lock' | 'view') => void;
    onEditMatch: (match: ScheduledMatch) => void;
    onStartScoring: (matchId: string) => void;
    onViewScorecard: (matchId: string) => void;
    onUpdateManualScore: (matchId: string, mode?: 'summary' | 'full') => void;
    isAdmin: boolean;
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
    isAdmin
}) => {
    const isLive = match.status === 'live';
    const isUpcoming = match.status === 'upcoming';
    const isCompleted = match.status === 'completed';
    
    // Format date carefully based on ISO string
    const matchDate = new Date(match.date);
    const dateFormatted = matchDate.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
    const timeFormatted = matchDate.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });

    const getMatchTimeContext = (matchDate: string) => {
        const now = new Date();
        const matchDateTime = new Date(matchDate);
        
        // Set times to 00:00:00 to compare only the date part for "Today"
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const matchDay = new Date(matchDateTime.getFullYear(), matchDateTime.getMonth(), matchDateTime.getDate());

        if (matchDay.getTime() === today.getTime()) return 'TODAY';
        if (matchDateTime < now) return 'PAST';
        return 'FUTURE';
    };

    const timeContext = getMatchTimeContext(match.date);

    // Derived flags for easier logic
    const isToday = timeContext === 'TODAY';
    const isPast = timeContext === 'PAST';

    return (
        <div className={`relative rounded-3xl overflow-hidden shadow-xl border w-full flex flex-col transition-all duration-300
            ${isLive ? 'bg-gradient-to-br from-slate-900 to-black border-red-900/50 ring-1 ring-red-500/20' : 
              isUpcoming ? 'bg-slate-900 border-slate-800' : 
              'bg-slate-900/80 border-slate-800/80 opacity-80'}`}
        >
            {/* Status Header */}
            <div className={`px-5 py-3 border-b flex items-center justify-between
                ${isLive ? 'border-red-900/30 bg-red-950/20' : 'border-slate-800 bg-slate-900/50'}`}
            >
                <div className="flex items-center gap-2">
                    {isLive && (
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <span className="text-red-500 font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-1">
                                <Radio size={12} /> LIVE
                            </span>
                        </div>
                    )}
                    {isUpcoming && <span className="text-blue-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">Upcoming Match</span>}
                    {isCompleted && <span className="text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-widest">Completed</span>}
                </div>
                
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1 text-[10px] md:text-xs font-medium ${isLive ? 'text-slate-300' : 'text-slate-500'}`}>
                        <Trophy size={14} className={isLive ? 'text-yellow-500' : 'text-blue-500'} />
                        {match.stage} • {match.tournament.toUpperCase()}
                    </div>
                    {match.matchFormat && (
                        <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            match.matchFormat === 'T20'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                            {match.matchFormat === 'T20' ? '⚡ T20' : '🏏 One Day'}
                        </span>
                    )}
                </div>
            </div>

            {/* Teams & Versus */}
            <div className="p-6 md:p-8 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-4">
                    {/* Home Team */}
                    <div className="flex flex-col items-center flex-1">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-800 border border-slate-700 shadow-md flex items-center justify-center overflow-hidden mb-3">
                            {homeTeamLogo ? (
                                <img src={homeTeamLogo} alt={homeTeamName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="font-black text-slate-400 text-xs md:text-base">INS</div>
                            )}
                        </div>
                        <h3 className={`font-black text-center text-[10px] md:text-sm uppercase ${isLive ? 'text-white' : 'text-slate-200'}`}>
                            {homeTeamName}
                        </h3>
                        {isCompleted && match.finalScoreHome && (
                            <div className="mt-1 text-center">
                                <span className="text-lg md:text-xl font-black text-white">
                                    {match.finalScoreHome.runs}/{match.finalScoreHome.wickets}
                                </span>
                                <span className="text-[10px] text-slate-500 block">({match.finalScoreHome.overs} ov)</span>
                            </div>
                        )}
                    </div>

                    {/* VS Badge */}
                    <div className="px-4 flex flex-col items-center justify-center shrink-0">
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-black italic text-sm md:text-base shadow-lg
                            ${isLive ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                        >
                            V<span className="text-[10px]">S</span>
                        </div>
                    </div>

                    {/* Opponent Team */}
                    <div className="flex flex-col items-center flex-1">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-800 border border-slate-700 shadow-md flex items-center justify-center overflow-hidden mb-3 p-1">
                            {opponent?.logoUrl ? (
                                <img src={opponent.logoUrl} alt={opponent.name} className="w-full h-full object-contain" />
                            ) : (
                                <div className="font-black text-slate-400 text-xs md:text-base capitalize">{match.opponentId.slice(0, 3)}</div>
                            )}
                        </div>
                        <h3 className={`font-black text-center text-[10px] md:text-sm uppercase ${isLive ? 'text-white' : 'text-slate-200'}`}>
                            {opponent ? opponent.name : match.opponentId.replace(/-/g, ' ')}
                        </h3>
                        {isCompleted && match.finalScoreAway && (
                            <div className="mt-1 text-center">
                                <span className="text-lg md:text-xl font-black text-white">
                                    {match.finalScoreAway.runs}/{match.finalScoreAway.wickets}
                                </span>
                                <span className="text-[10px] text-slate-500 block">({match.finalScoreAway.overs} ov)</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Toss Details Badge */}
                {match.tossDetails && (
                    <div className="px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                         {match.tossDetails}
                    </div>
                )}

                {/* Result Summary - Displayed for Completed */}
                {isCompleted && (match.resultSummary || match.resultNote) && (
                    <div className="mt-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-full text-center">
                        <p className="text-emerald-500 font-black italic text-xs md:text-sm uppercase tracking-tight">
                            {match.resultNote || match.resultSummary}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer details & Actions */}
            <div className={`px-6 py-4 border-t flex flex-col gap-4
                ${isLive ? 'border-slate-800 bg-slate-900/50' : 'border-slate-800 bg-slate-900/40'}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 text-[10px] md:text-xs font-medium text-slate-400`}>
                            <Calendar size={14} className="text-slate-500" />
                            {dateFormatted}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] md:text-xs font-medium text-slate-400`}>
                            <MapPin size={14} className="text-slate-500" />
                            {match.ground.toUpperCase()}
                        </div>
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={() => onEditMatch(match)}
                            className="p-1 text-slate-500 hover:text-white transition-colors"
                            title="Edit Metadata"
                        >
                            <Edit2 size={14} />
                        </button>
                    )}
                </div>

                {/* SQUAD MANAGEMENT ROW */}
                <div className="squad-management-row">
                    <button 
                        className="btn-outline-sm" 
                        onClick={() => onSelectPlayingXI(match.id, 'home')}
                    >
                        {match.homeTeamXI?.length > 0 ? "EDIT HOME XI" : "SELECT HOME XI"}
                    </button>

                    <button 
                        className="btn-outline-sm" 
                        onClick={() => onSelectPlayingXI(match.id, 'opponent')}
                    >
                        {match.opponentTeamXI?.length > 0 ? "EDIT OPPONENT XI" : "SELECT OPPONENT XI"}
                    </button>
                </div>

                {/* REQUIREMENT-DRIVEN ACTIONS */}
                <div className="flex flex-wrap gap-2 pt-2">
                    {/* Live Match Actions */}
                    {isLive ? (
                        <button 
                            onClick={() => onStartScoring(match.id)}
                            className="w-full px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-lg shadow-red-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                        >
                            <Radio size={14} /> CONTINUE LIVE SCORING
                        </button>
                    ) : (
                        <>
                            {/* CASE 1: Match is Today - Allow Live Scoring */}
                            {isToday && !isCompleted && (
                                <>
                                    <button 
                                        onClick={() => onStartScoring(match.id)}
                                        className="flex-1 px-4 py-2 text-xs font-black bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2"
                                    >
                                        <Play size={12} fill="currentColor" /> START LIVE SCORING
                                    </button>
                                    <button 
                                        onClick={() => onUpdateManualScore(match.id, 'summary')}
                                        className="flex-1 px-4 py-2 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white border border-slate-700 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        QUICK SUMMARY
                                    </button>
                                </>
                            )}

                            {/* CASE 2: Match is in the Past - No Live Scoring, prioritize Summary/Scorecard */}
                            {(isPast || isCompleted) && (
                                <div className="flex flex-wrap gap-2 w-full">
                                    <button 
                                        onClick={() => onUpdateManualScore(match.id, 'summary')}
                                        className="flex-1 px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl hover:bg-slate-700 border border-slate-700 transition-all active:scale-95"
                                    >
                                        MATCH SUMMARY
                                    </button>
                                    <button 
                                        onClick={() => onUpdateManualScore(match.id, 'full')} 
                                        className="flex-1 px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl hover:bg-slate-700 border border-slate-700 transition-all active:scale-95"
                                    >
                                        UPDATE FULL SCORECARD
                                    </button>
                                </div>
                            )}

                            {/* CASE 3: Match is in the Future */}
                            {timeContext === 'FUTURE' && !isCompleted && (
                                <p className="w-full text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">
                                    Scoring opens on {new Date(match.date).toLocaleDateString()}
                                </p>
                            )}

                            {/* Always show View Scorecard if completed */}
                            {isCompleted && (
                                <button 
                                    onClick={() => onViewScorecard(match.id)}
                                    className="w-full px-4 py-2 text-xs font-black bg-emerald-600/20 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white border border-emerald-500/20 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2 mt-2"
                                >
                                    <TableProperties size={14} /> VIEW FULL SCORECARD
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchCenterTile;
