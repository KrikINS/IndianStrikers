import React, { useState } from 'react';
import { Player, OpponentTeam, UserRole } from '../types';
import { useMatchCenter } from './matchCenterStore';
import MatchCenterTile from './MatchCenterTile';
import PlayingXIModal from './PlayingXIModal';
import { Calendar, Shield } from 'lucide-react';

interface MatchCenterProps {
    players: Player[];
    opponents: OpponentTeam[];
    userRole: UserRole;
    teamLogo?: string;
}

const MatchCenter: React.FC<MatchCenterProps> = ({ players, opponents, userRole, teamLogo }) => {
    const { getSortedMatches, updateMatch } = useMatchCenter();
    const sortedMatches = getSortedMatches();
    const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
    const [modalMode, setModalMode] = useState<'home' | 'away' | 'view' | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const activeMatch = sortedMatches.find(m => m.id === activeMatchId);

    const handleSelectPlayingXI = (id: string, mode: 'home' | 'away' | 'lock' | 'view') => {
        if (mode === 'lock') {
            handleLockSquads(id);
        } else {
            setActiveMatchId(id);
            setModalMode(mode);
        }
    };

    const handleSaveXI = (matchId: string, teamType: 'home' | 'away', selection: string[]) => {
        updateMatch(matchId, {
            [teamType === 'home' ? 'homeXI' : 'awayXI']: selection
        });
    };

    const handleLockSquads = async (id: string) => {
        // First lock the match in store
        updateMatch(id, { isLocked: true });
        
        // Then trigger graphic generation if it's the home team (Indian Strikers)
        const match = sortedMatches.find(m => m.id === id);
        if (match && match.homeXI && match.homeXI.length === 11) {
            // We'll show the view modal briefly or use a hidden ref to capture
            setActiveMatchId(id);
            setModalMode('view');
            
            // Give UI time to render the modal
            setTimeout(() => {
                const element = document.getElementById('team-sheet-graphic');
                if (element) {
                    captureGraphic(element, `IndianStrikers_XI_${id}`);
                }
            }, 500);
        }
    };

    const captureGraphic = async (element: HTMLElement, filename: string) => {
        const html2canvas = (await import('html2canvas')).default;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a', // slate-950
                scale: 2,
                useCORS: true,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Failed to generate team sheet:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in w-full max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
                    <Calendar className="text-blue-600" size={36} /> Match Center
                </h1>
                <p className="text-slate-500 font-medium md:text-lg max-w-2xl mt-1">Live updates, upcoming schedules, and completed playing XI setups.</p>
            </div>

            {sortedMatches.length === 0 ? (
                <div className="bg-slate-900 rounded-2xl p-12 text-center text-slate-400 font-medium border border-slate-800">
                    No matches presently configured. Check back soon for scheduling updates!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {sortedMatches.map(m => (
                        <MatchCenterTile
                            key={m.id}
                            match={m}
                            homeTeamName="Indian Strikers"
                            homeTeamLogo={teamLogo}
                            opponent={opponents.find(o => o.id === m.opponentTeamId)}
                            onSelectPlayingXI={handleSelectPlayingXI}
                            isAdmin={userRole === 'admin'}
                        />
                    ))}
                </div>
            )}

            {/* Playing XI Modal Rendering */}
            {activeMatchId && modalMode && (
                <div id="team-sheet-container">
                    <PlayingXIModal 
                        matchId={activeMatchId}
                        homePlayers={players}
                        opponentTeams={opponents}
                        opponentId={activeMatch?.opponentTeamId || ''}
                        teamType={modalMode}
                        initialSelection={modalMode === 'home' ? activeMatch?.homeXI : (modalMode === 'away' ? activeMatch?.awayXI : activeMatch?.homeXI)}
                        onClose={() => {
                            setActiveMatchId(null);
                            setModalMode(null);
                        }}
                        onSave={handleSaveXI}
                    />
                    
                    {/* Hidden Graphic for Capture during viewing/locking */}
                    {modalMode === 'view' && (
                        <div className="fixed -left-[2000px] top-0">
                             <div id="team-sheet-graphic" className="w-[800px] bg-slate-950 p-12 text-white border-4 border-emerald-500 shadow-2xl">
                                <div className="flex justify-between items-center mb-12">
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 bg-slate-900 border-2 border-slate-700 rounded-3xl flex items-center justify-center p-2">
                                            {teamLogo ? <img src={teamLogo} className="w-full h-full object-contain" alt="Team Logo" /> : <Shield size={48} />}
                                        </div>
                                        <div>
                                            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Indian Strikers</h1>
                                            <p className="text-emerald-500 font-bold uppercase tracking-widest text-sm">Match Day Playing XI</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-500 font-bold uppercase text-xs">Versus</p>
                                        <p className="text-2xl font-black text-slate-300">{opponents.find(o => o.id === activeMatch?.opponentTeamId)?.name || 'Opponent'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                                    {players.filter(p => activeMatch?.homeXI?.includes(p.id!)).map((player, idx) => (
                                        <div key={player.id} className="flex items-center gap-5 border-b border-white/5 pb-4">
                                            <span className="text-slate-700 font-black text-2xl italic w-8">{idx + 1}</span>
                                            <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 overflow-hidden bg-slate-950">
                                                <img src={player.avatarUrl} className="w-full h-full object-cover" alt={player.name} />
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-xl uppercase tracking-tighter">{player.name}</p>
                                                <p className="text-xs font-bold text-slate-400 uppercase">{player.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center text-slate-500 font-bold text-xs">
                                    <p>© 2024 INDIAN STRIKERS • OFFICIAL TEAM SHEET</p>
                                    <p>{new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            )}
            
            {isGenerating && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-slate-950 p-8 rounded-3xl border border-emerald-500/30 text-center">
                        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white font-black uppercase tracking-widest italic">Generating Graphic...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MatchCenter;
