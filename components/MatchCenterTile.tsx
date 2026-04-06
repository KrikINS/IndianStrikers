import { Calendar, MapPin, Radio, Trophy, Edit2, Play, TableProperties, FileText, Trash2, Users } from 'lucide-react';
import { ScheduledMatch, OpponentTeam } from '../types';

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
    onDeleteMatch: (matchId: string) => void;
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
    onDeleteMatch,
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

    const opponentName = opponent ? opponent.name : (match.opponentId || "Opponent").replace(/-/g, ' ');
    const formattedId = (match.id || "ID-ERROR").toString().replace('match_', '#');

    return (
        <div className={`match-card-compact border transition-all duration-300
            ${isLive ? 'border-red-500/30' : 'border-slate-100'}`}
        >
            {/* TOP INFO STRIP */}
            <div className={`px-4 py-2 border-b flex items-center justify-between text-[10px] md:text-xs font-bold uppercase tracking-tight
                ${isLive ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-50'}`}
            >
                <div className="flex items-center gap-2">
                    {isLive && (
                        <div className="flex items-center gap-1 text-red-500">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span>LIVE</span>
                        </div>
                    )}
                    {isUpcoming && <span className="text-blue-600">Upcoming</span>}
                    {isCompleted && <span className="text-slate-400">Completed</span>}
                    <span className="text-slate-300 ml-2 font-mono">{formattedId}</span>
                </div>
                
                <div className="flex items-center gap-2 text-slate-500">
                    {(match.stage || "League").toUpperCase()} • {(match.tournament || "No Tournament").toUpperCase()}
                </div>
            </div>

            {/* MAIN SCORE SECTION (Tight Padding) */}
            <div className="p-4 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-2">
                    {/* Home Team */}
                    <div className="flex items-center flex-1 gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            {homeTeamLogo ? <img src={homeTeamLogo} alt={homeTeamName} className="w-full h-full object-cover" /> : <div className="text-[10px] font-black text-slate-300">INS</div>}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="name-with-action">
                                <h4 className="font-extrabold text-[11px] md:text-xs text-slate-800 uppercase truncate max-w-[80px]">{(homeTeamName || "Home Team").split(' ')[0]}</h4>
                                <button onClick={() => onSelectPlayingXI(match.id, 'home')} className="icon-btn-squad" title="Edit Playing XI">
                                    <Users size={12} />
                                </button>
                            </div>
                            {(isLive || isCompleted) && match.finalScoreHome && (
                                <div className="text-xs md:text-sm font-black text-slate-900 leading-none mt-1">
                                    {match.finalScoreHome.runs}/{match.finalScoreHome.wickets} <small className="text-[9px] text-slate-400 font-medium">({match.finalScoreHome.overs} ov)</small>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* VS Circle */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black italic bg-slate-50 text-slate-300 border border-slate-100 shrink-0">
                        VS
                    </div>

                    {/* Opponent Team */}
                    <div className="flex items-center flex-1 gap-3 min-w-0 flex-row-reverse text-right">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0 p-0.5">
                            {opponent?.logoUrl ? <img src={opponent.logoUrl} alt={opponentName} className="w-full h-full object-contain" /> : <div className="text-[10px] font-black text-slate-300 uppercase">{(String(opponentName).slice(0, 3) || "???").toUpperCase()}</div>}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <div className="name-with-action flex-row-reverse">
                                <h4 className="font-extrabold text-[11px] md:text-xs text-slate-800 uppercase truncate max-w-[80px]">{(opponentName || "Opponent").split(' ')[0]}</h4>
                                <button onClick={() => onSelectPlayingXI(match.id, 'opponent')} className="icon-btn-squad" title="Edit Playing XI">
                                    <Users size={12} />
                                </button>
                            </div>
                            {(isLive || isCompleted) && match.finalScoreAway && (
                                <div className="text-xs md:text-sm font-black text-slate-900 leading-none mt-1">
                                    {match.finalScoreAway.runs}/{match.finalScoreAway.wickets} <small className="text-[9px] text-slate-400 font-medium">({match.finalScoreAway.overs} ov)</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SLIM RESULT RIBBON */}
                {(isCompleted || isLive) && (match.resultSummary || match.resultNote || match.tossDetails) && (
                    <div className="result-ribbon-slim">
                        {isLive ? (match.tossDetails || 'Match in Progress') : (match.resultNote || match.resultSummary)}
                    </div>
                )}
            </div>

            {/* ACTION FOOTER */}
            <div className="px-4 pb-4 mt-auto">
                {/* Info Line */}
                <div className="flex items-center justify-between mb-3 text-[9px] font-bold text-slate-400 uppercase tracking-tight px-1">
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1"><Calendar size={10} /> {dateFormatted}</span>
                        <span className="flex items-center gap-1"><MapPin size={10} /> {(match.ground || "TBD").split(' ')[0]}</span>
                    </div>
                    {isAdmin && (
                        <div className="flex gap-2">
                            <button onClick={() => onEditMatch(match)} className="hover:text-blue-600 transition-colors" title="Edit Match Details"><Edit2 size={10} /></button>
                            <button onClick={() => window.confirm("Delete?") && onDeleteMatch(match.id)} className="hover:text-red-600 transition-colors" title="Delete Match"><Trash2 size={10} /></button>
                        </div>
                    )}
                </div>

                {/* Card Footer Grid */}
                <div className="card-footer-grid">
                    {isLive ? (
                        <button onClick={() => onStartScoring(match.id)} className="btn-primary-full bg-red-600 text-white border-red-500 hover:bg-red-700 flex items-center justify-center gap-2">
                            <Radio size={12} /> CONTINUE LIVE SCORING
                        </button>
                    ) : isToday && !isCompleted ? (
                        <>
                            <button onClick={() => onStartScoring(match.id)} className="btn-secondary-sm bg-blue-600 text-white border-blue-500 hover:bg-blue-700">START LIVE</button>
                            <button onClick={() => onUpdateManualScore(match.id, 'summary')} className="btn-secondary-sm">SUMMARY</button>
                        </>
                    ) : (isPast || isCompleted) ? (
                        <>
                            <button onClick={() => onUpdateManualScore(match.id, 'summary')} className="btn-secondary-sm" title="Match Summary">MATCH SUMMARY</button>
                            <button onClick={() => onUpdateManualScore(match.id, 'full')} className="btn-secondary-sm" title="Update Scorecard">UPDATE SCORECARD</button>
                            <button onClick={() => onViewScorecard(match.id)} className="btn-primary-full" title="View Full Scorecard">VIEW FULL SCORECARD</button>
                        </>
                    ) : (
                        <p className="col-span-2 text-center text-slate-400 text-[9px] font-black uppercase tracking-widest py-1 bg-slate-50 rounded-lg">
                            Scoring opens {new Date(match.date).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchCenterTile;
