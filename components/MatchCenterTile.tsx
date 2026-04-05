import React from 'react';
import { Match } from './matchCenterStore';
import { Calendar, MapPin, Radio, Trophy, Shield } from 'lucide-react';
import { OpponentTeam } from '../types';

interface MatchCenterTileProps {
    match: Match;
    homeTeamName: string;
    homeTeamLogo?: string;
    opponent: OpponentTeam | undefined;
    onSelectPlayingXI: (matchId: string, mode: 'home' | 'away' | 'lock' | 'view') => void;
    isAdmin: boolean;
}

const MatchCenterTile: React.FC<MatchCenterTileProps> = ({ 
    match, 
    homeTeamName, 
    homeTeamLogo, 
    opponent, 
    onSelectPlayingXI,
    isAdmin
}) => {
    const isLive = match.status === 'Live';
    const isUpcoming = match.status === 'Upcoming';
    
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
        <div className={`relative rounded-3xl overflow-hidden shadow-xl border w-full flex flex-col 
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
                            <span className="text-red-500 font-bold text-xs uppercase tracking-widest flex items-center gap-1">
                                <Radio size={12} /> LIVE
                            </span>
                        </div>
                    )}
                    {isUpcoming && <span className="text-blue-600 font-bold text-xs uppercase tracking-widest">Upcoming Match</span>}
                    {!isLive && !isUpcoming && <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Completed</span>}
                </div>
                
                <div className={`flex items-center gap-1 text-xs font-medium ${isLive ? 'text-slate-300' : 'text-slate-500'}`}>
                    <Trophy size={14} className={isLive ? 'text-yellow-500' : 'text-blue-500'} />
                    {match.matchStage} • {match.tournamentId.replace(/-/g, ' ').toUpperCase()}
                </div>
            </div>

            {/* Teams & Versus */}
            <div className="p-6 md:p-8 flex items-center justify-between">
                {/* Home Team */}
                <div className="flex flex-col items-center flex-1">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-800 border border-slate-700 shadow-md flex items-center justify-center overflow-hidden mb-3">
                        {homeTeamLogo ? (
                            <img src={homeTeamLogo} alt={homeTeamName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="font-black text-slate-500">INS</div>
                        )}
                    </div>
                    <h3 className={`font-black text-center text-sm md:text-base uppercase ${isLive ? 'text-white' : 'text-slate-200'}`}>
                        {homeTeamName}
                    </h3>
                </div>

                {/* VS Badge */}
                <div className="px-4 flex flex-col items-center justify-center shrink-0">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black italic text-lg md:text-xl shadow-lg
                        ${isLive ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                    >
                        V<span className="text-sm">S</span>
                    </div>
                </div>

                {/* Opponent Team */}
                <div className="flex flex-col items-center flex-1">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-slate-800 border border-slate-700 shadow-md flex items-center justify-center overflow-hidden mb-3 p-1">
                        {opponent?.logoUrl ? (
                            <img src={opponent.logoUrl} alt={opponent.name} className="w-full h-full object-contain" />
                        ) : (
                            <div className="font-black text-slate-500 capitalize">{match.opponentTeamId.slice(0, 3)}</div>
                        )}
                    </div>
                    <h3 className={`font-black text-center text-sm md:text-base uppercase ${isLive ? 'text-white' : 'text-slate-200'}`}>
                        {opponent ? opponent.name : match.opponentTeamId.replace(/-/g, ' ')}
                    </h3>
                </div>
            </div>

            {/* Footer details */}
            <div className={`px-6 py-4 border-t flex flex-wrap gap-4 items-center justify-between
                ${isLive ? 'border-slate-800 bg-slate-900/50' : 'border-slate-800 bg-slate-900/40'}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-1 text-sm font-medium text-slate-400`}>
                        <Calendar size={16} className="text-slate-500" />
                        {dateFormatted} - {timeFormatted}
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium text-slate-400`}>
                        <MapPin size={16} className="text-slate-500" />
                        {match.groundId.replace(/-/g, ' ').toUpperCase()}
                    </div>
                </div>
                
                {/* Selection / View Actions */}
                <div className="flex gap-2">
                    {match.isLocked ? (
                        <button 
                            onClick={() => onSelectPlayingXI(match.id, 'view')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
                        >
                            <Shield size={16} /> VIEW TEAM SHEET
                        </button>
                    ) : (
                        isAdmin && (isUpcoming || isLive) && (
                            <>
                                <button 
                                    onClick={() => onSelectPlayingXI(match.id, 'home')}
                                    className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2
                                        ${(match.homeXI?.length || 0) === 11 
                                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' 
                                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                                        }`}
                                >
                                    HOME XI {(match.homeXI?.length || 0) > 0 && `(${match.homeXI?.length})`}
                                </button>
                                <button 
                                    onClick={() => onSelectPlayingXI(match.id, 'away')}
                                    className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2
                                        ${(match.awayXI?.length || 0) === 11 
                                            ? 'bg-orange-600/20 text-orange-400 border border-orange-500/50' 
                                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                                        }`}
                                >
                                    AWAY XI {(match.awayXI?.length || 0) > 0 && `(${match.awayXI?.length})`}
                                </button>
                                
                                {(match.homeXI?.length === 11 && match.awayXI?.length === 11) && (
                                    <button 
                                        onClick={() => onSelectPlayingXI(match.id, 'lock')}
                                        className="px-4 py-2 text-xs md:text-sm font-black bg-white text-slate-900 rounded-xl hover:bg-slate-200 shadow-xl transition-all active:scale-95"
                                    >
                                        LOCK SQUADS
                                    </button>
                                )}
                            </>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchCenterTile;
