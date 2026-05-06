import React from 'react';
import { Player, OpponentTeam, Ground, ScheduledMatch } from '../types';
import { Shield, MapPin, Calendar, Hash } from 'lucide-react';

interface LineupGraphicProps {
    match: ScheduledMatch;
    opponents: OpponentTeam[];
    players: Player[];
    grounds: Ground[];
    homeTeamName?: string;
    homeTeamLogo?: string;
}

export const LineupGraphic: React.FC<LineupGraphicProps> = ({
    match,
    opponents,
    players,
    grounds,
    homeTeamName = 'Indian Strikers',
    homeTeamLogo = '/INS%20LOGO.PNG'
}) => {
    const opponent = opponents.find(o => o.id === match.opponentId);
    const opponentName = opponent?.name || match.opponentName || 'Opponent';
    const opponentLogo = opponent?.logoUrl || match.opponentLogo;
    const ground = grounds.find(g => g.id === match.groundId);
    
    // Get home XI players from the full squad roster
    const homeXIPlayers = match.homeTeamXI
        .map(id => players.find(p => String(p.id) === String(id)))
        .filter((p): p is Player => !!p);

    const matchDate = new Date(match.date);
    const dateFormatted = matchDate.toLocaleDateString(undefined, { 
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
    }).toUpperCase();
    const timeFormatted = matchDate.toLocaleTimeString(undefined, { 
        hour: '2-digit', minute: '2-digit', hour12: true 
    }).toUpperCase();

    return (
        <div 
            id="team-sheet-graphic"
            className="flex flex-col bg-[#020617] text-white overflow-hidden p-0 m-0"
            style={{ 
                width: '1080px', 
                height: '1920px', 
                fontFamily: "'Outfit', sans-serif",
                backgroundImage: 'radial-gradient(circle at 50% 0%, #1e3a8a 0%, #020617 70%)'
            }}
        >
            {/* TOP OVERLAY GRAPHIC BASE */}
            <div className="absolute top-0 left-0 w-full h-[600px] opacity-10 pointer-events-none">
                <div 
                    className="absolute -top-20 -right-20 text-[600px] font-black italic select-none"
                    style={{ transform: 'rotate(-15deg)', fontFamily: '"Graduate", serif' }}
                >
                    INS
                </div>
            </div>

            {/* HEADER SECTION */}
            <div className="relative pt-24 px-12 pb-12 flex flex-col items-center text-center">
                <div className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-2xl font-black uppercase tracking-[0.2em] mb-6 shadow-2xl shadow-blue-500/20">
                    {match.tournament || 'Exhibition Match'}
                </div>
                <h1 className="text-7xl font-black uppercase tracking-tighter mb-4 italic">
                    MATCH DAY SQUAD
                </h1>
                <div className="flex items-center gap-6 text-2xl font-bold text-blue-400 uppercase tracking-widest bg-white/5 px-8 py-3 rounded-full border border-white/10">
                    <span className="flex items-center gap-3"><Calendar size={28} /> {dateFormatted}</span>
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>{timeFormatted}</span>
                </div>
            </div>

            {/* VS SECTION */}
            <div className="relative flex items-center justify-between px-20 py-16 bg-white/5 border-y border-white/10 backdrop-blur-md">
                <div className="flex flex-col items-center gap-6 flex-1">
                    <div className="w-48 h-48 rounded-[3rem] bg-[#0f172a] p-4 border-2 border-white/20 shadow-2xl overflow-hidden flex items-center justify-center">
                        <img src={homeTeamLogo} className="w-full h-full object-contain" alt="Home" crossOrigin="anonymous" />
                    </div>
                    <div className="text-3xl font-black uppercase tracking-tight text-center">{homeTeamName}</div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="text-5xl font-black italic text-blue-500 opacity-50 mb-2">VS</div>
                    <div className="w-16 h-1 bg-blue-500/30 rounded-full"></div>
                </div>

                <div className="flex flex-col items-center gap-6 flex-1">
                    <div className="w-48 h-48 rounded-[3rem] bg-[#0f172a] p-4 border-2 border-white/20 shadow-2xl overflow-hidden flex items-center justify-center">
                        {opponentLogo ? (
                            <img src={opponentLogo} className="w-full h-full object-contain" alt="Away" crossOrigin="anonymous" />
                        ) : (
                            <div className="text-6xl font-black text-white/20">{opponentName.substring(0,3).toUpperCase()}</div>
                        )}
                    </div>
                    <div className="text-3xl font-black uppercase tracking-tight text-center">{opponentName}</div>
                </div>
            </div>

            {/* VENUE BAR */}
            <div className="flex items-center justify-center gap-10 py-10 bg-blue-600/10 border-b border-white/10">
                <div className="flex items-center gap-4 text-3xl font-black uppercase tracking-widest text-blue-400">
                    <MapPin size={40} className="text-blue-500" />
                    {ground?.name || 'Venue TBD'}
                </div>
                <div className="flex items-center gap-3 text-3xl font-black uppercase tracking-widest text-blue-400 bg-blue-500/20 px-6 py-2 rounded-2xl border border-blue-500/30">
                    <Hash size={32} />
                    {ground?.name.match(/\d+/) ? ground.name.match(/\d+/)![0] : 'MAIN'}
                </div>
                <div className="px-6 py-2 border-2 border-blue-500/50 rounded-2xl text-2xl font-black text-white uppercase tracking-wider">
                    {match.matchFormat || 'T20'}
                </div>
            </div>

            {/* SQUAD SECTION */}
            <div className="relative flex-1 flex flex-col items-center pt-16 px-24">
                <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none">
                    <Shield size={800} />
                </div>

                <div className="relative w-full">
                    <div className="flex items-center gap-4 mb-12 border-l-8 border-blue-600 pl-8">
                        <h2 className="text-5xl font-black uppercase italic tracking-tighter">THE STARTING XI</h2>
                        <div className="h-0.5 bg-white/10 flex-1 ml-4"></div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {homeXIPlayers.length > 0 ? (
                            homeXIPlayers.map((player, idx) => (
                                <div 
                                    key={player.id} 
                                    className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-[2rem] p-6 shadow-xl"
                                >
                                    <div className="flex items-center gap-8">
                                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black italic shadow-lg shadow-blue-500/20">
                                            {idx + 1}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="text-4xl font-black uppercase tracking-tight flex items-center gap-4">
                                                {player.name}
                                                {player.isCaptain && <span className="text-xl bg-amber-500 text-black px-3 py-1 rounded-lg font-black italic">(C)</span>}
                                                {player.isViceCaptain && <span className="text-xl bg-slate-200 text-black px-3 py-1 rounded-lg font-black italic">(VC)</span>}
                                            </div>
                                            <div className="text-xl font-bold uppercase tracking-widest text-blue-400 mt-1">{player.role}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-2xl font-black italic text-white/10 pr-4">INDIAN STRIKERS</div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 text-4xl font-black uppercase text-white/10 italic">
                                NO PLAYING XI SELECTED YET
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BRANDING FOOTER */}
            <div className="bg-[#020617] border-t-8 border-blue-600 py-16 px-24 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <img src={homeTeamLogo} alt="Logo" className="w-24 h-24 object-contain" crossOrigin="anonymous" />
                    <div>
                        <div className="text-4xl font-black uppercase tracking-tighter">INDIAN STRIKERS</div>
                        <div className="text-xl font-bold uppercase tracking-widest text-blue-500">Official Team Sheet</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-black italic text-white/20">GENERATED BY</div>
                    <div className="text-3xl font-black uppercase tracking-widest text-blue-500 italic">STRIKERS PULSE</div>
                </div>
            </div>
        </div>
    );
};
