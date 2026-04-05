import React from 'react';
import { ScheduledMatch } from './matchCenterStore';
import { Calendar, MapPin, Radio, Trophy, Shield, Edit2, Play, TableProperties, FileText } from 'lucide-react';
import { OpponentTeam } from '../types';

interface MatchCenterTileProps {
    match: ScheduledMatch;
    homeTeamName: string;
    homeTeamLogo?: string;
    opponent: OpponentTeam | undefined;
    onSelectPlayingXI: (matchId: string, mode: 'home' | 'away' | 'lock' | 'view') => void;
    onEditMatch: (match: ScheduledMatch) => void;
    onStartScoring: (matchId: string) => void;
    onViewScorecard: (matchId: string) => void;
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
                    </div>
                </div>

                {/* Toss Details Badge */}
                {match.tossDetails && (
                    <div className="px-3 py-1 bg-slate-800/50 border border-slate-700/50 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
                         {match.tossDetails}
                    </div>
                )}

                {/* Result Summary - Displayed for Completed */}
                {isCompleted && match.resultSummary && (
                    <div className="mt-2 text-center">
                        <p className="text-emerald-500 font-black italic text-xs md:text-sm uppercase tracking-tight">
                            {match.resultSummary}
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
                
                {/* REQUIREMENT-DRIVEN ACTIONS */}
                <div className="flex flex-wrap gap-2 pt-2">
                    {/* Requirement 2b: Upcoming actions */}
                    {isUpcoming && (
                        <>
                            <button 
                                onClick={() => onSelectPlayingXI(match.id, 'home')}
                                className="flex-1 px-4 py-2 text-xs font-bold bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white border border-slate-700 transition-all active:scale-95 whitespace-nowrap"
                            >
                                SELECT PLAYING XI
                            </button>
                            <button 
                                onClick={() => onStartScoring(match.id)}
                                className="flex-1 px-4 py-2 text-xs font-black bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2"
                            >
                                <Play size={12} fill="currentColor" /> START LIVE SCORING
                            </button>
                        </>
                    )}

                    {/* Requirement 2e: Completed with Result Summary */}
                    {isCompleted && match.resultSummary && (
                        <>
                            <button 
                                onClick={() => onViewScorecard(match.id)}
                                className="flex-1 px-4 py-2 text-xs font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2"
                            >
                                <TableProperties size={14} /> VIEW FULL SCORECARD
                            </button>
                        </>
                    )}

                    {/* Requirement 2f: Completed without Result Summary */}
                    {isCompleted && !match.resultSummary && (
                        <>
                            <button 
                                onClick={() => onEditMatch(match)}
                                className="flex-1 px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl hover:bg-slate-700 border border-slate-700 transition-all active:scale-95"
                            >
                                UPDATE SUMMARY
                            </button>
                            <button 
                                onClick={() => onViewScorecard(match.id)} // Shared logic for full scorecard edit/view
                                className="flex-1 px-4 py-2 text-xs font-bold bg-slate-800 text-white rounded-xl hover:bg-slate-700 border border-slate-700 transition-all active:scale-95"
                            >
                                EDIT FULL SCORECARD
                            </button>
                        </>
                    )}

                    {/* Live Match Actions */}
                    {isLive && (
                        <button 
                            onClick={() => onStartScoring(match.id)}
                            className="w-full px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-lg shadow-red-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                        >
                            <Radio size={14} /> CONTINUE LIVE SCORING
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchCenterTile;
