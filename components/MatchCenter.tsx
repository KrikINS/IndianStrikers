import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, OpponentTeam, UserRole } from '../types';
import { useMatchCenter, ScheduledMatch } from './matchCenterStore';
import MatchCenterTile from './MatchCenterTile';
import { PlayingXIModal } from './PlayingXIModal';
import EditMatchModal from './EditMatchModal';
import AddMatchModal from './AddMatchModal';
import ManualScoreModal from './ManualScoreModal';
import { Calendar, Shield, Plus } from 'lucide-react';
import html2canvas from 'html2canvas';
import { updateBattingCareerStats, updateBowlingCareerStats } from '../services/statsEngine';
import { BattingStats, BowlingStats, Performer, MatchStatus, MatchStage } from '../types';

interface MatchCenterProps {
    players: Player[];
    opponents: OpponentTeam[];
    userRole: UserRole;
    teamLogo?: string;
    onUpdatePlayer: (p: Player) => void;
}

const MatchCenter: React.FC<MatchCenterProps> = ({ players, opponents, userRole, teamLogo, onUpdatePlayer }) => {
    const navigate = useNavigate();
    const { 
        matches, 
        updateMatch, 
        setPlayingXI, 
        updateMatchStatus,
        getSortedMatches 
    } = useMatchCenter();

    const [isGenerating, setIsGenerating] = useState(false);
    const [editingMatch, setEditingMatch] = useState<ScheduledMatch | null>(null);
    const [manualScoreConfig, setManualScoreConfig] = useState<{
        matchId: string;
        showPlayers: boolean;
    } | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [xiModalConfig, setXiModalConfig] = useState<{
        isOpen: boolean;
        matchId: string;
        teamType: 'home' | 'away' | 'view';
        opponentId: string;
    }>({
        isOpen: false,
        matchId: '',
        teamType: 'home',
        opponentId: ''
    });

    const handleSaveMatch = (updatedMatch: ScheduledMatch) => {
        updateMatch(updatedMatch.id, updatedMatch);
        setEditingMatch(null);
    };

    const handleSelectPlayingXI = (matchId: string, mode: 'home' | 'away' | 'lock' | 'view') => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        if (mode === 'lock') {
            handleLockSquads(matchId);
            return;
        }

        setXiModalConfig({
            isOpen: true,
            matchId,
            teamType: mode as 'home' | 'away' | 'view',
            opponentId: match.opponentId
        });
    };

    const handleSaveXI = (matchId: string, teamType: 'home' | 'away', selection: string[]) => {
        setPlayingXI(matchId, teamType, selection);
    };

    const handleStartScoring = (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        if (match.homeTeamXI.length !== 11) {
            alert("Please select exactly 11 players for Indian Strikers before starting.");
            handleSelectPlayingXI(matchId, 'home');
            return;
        }

        if (match.status === 'upcoming') {
            updateMatchStatus(matchId, 'live');
        }
        
        navigate(`/scorer/${matchId}`);
    };

    const handleLockSquads = (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match || match.homeTeamXI.length !== 11) {
            alert("Cannot lock team. Please select 11 players first.");
            return;
        }
        
        updateMatch(matchId, { isLocked: true });
        setTimeout(() => captureGraphic(matchId), 500);
    };

    const captureGraphic = async (matchId: string) => {
        const element = document.getElementById('team-sheet-graphic');
        if (!element) return;
        
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a',
                scale: 2,
                useCORS: true,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `IndianStrikers_XI_${matchId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Failed to generate team sheet:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleManualScoreSubmit = async (data: any) => {
        if (!manualScoreConfig) return;
        
        const match = matches.find(m => m.id === manualScoreConfig.matchId);
        if (!match) return;

        // 1. Update the match record in the store (scores, scorecard, result note)
        updateMatch(manualScoreConfig.matchId, {
            ...data,
            status: 'completed' as MatchStatus
        });

        // 2. Sync career stats for every performer in the XI
        // ManualScoreModal guarantees all homeTeamXI players are in data.performers
        const performers: Performer[] = data.performers || [];

        if (performers.length > 0) {
            console.log(`[Sync] Starting career stat sync for ${performers.length} players...`);
            let syncedCount = 0;
            try {
                for (const perf of performers) {
                    const player = players.find(p => p.id === perf.playerId);
                    if (!player) {
                        console.warn(`[Sync] Player ID ${perf.playerId} not found in roster. Skipping.`);
                        continue;
                    }

                    // Default stats if player has no career history yet
                    const currentBatting: BattingStats = player.battingStats || {
                        matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0,
                        average: 0, strikeRate: 0, highestScore: '0',
                        hundreds: 0, fifties: 0, ducks: 0, fours: 0, sixes: 0
                    };
                    const currentBowling: BowlingStats = player.bowlingStats || {
                        matches: 0, innings: 0, overs: 0, maidens: 0, runs: 0,
                        wickets: 0, average: 0, economy: 0, strikeRate: 0,
                        bestBowling: '0/0', fourWickets: 0, fiveWickets: 0
                    };

                    // Run through the Logic Engine  
                    // addCricketOvers is used internally (e.g., 3.5 + 2.4 = 6.3, not 5.9)
                    const updatedBatting = updateBattingCareerStats(currentBatting, perf);
                    const updatedBowling = updateBowlingCareerStats(currentBowling, perf);

                    const updatedPlayer = {
                        ...player,
                        matchesPlayed: updatedBatting.matches,
                        runsScored: updatedBatting.runs,
                        wicketsTaken: updatedBowling.wickets,
                        battingStats: updatedBatting,
                        bowlingStats: updatedBowling
                    };

                    onUpdatePlayer(updatedPlayer);
                    syncedCount++;
                }
                console.log(`[Sync] ✅ Career stats synced for ${syncedCount}/${performers.length} players.`);
                alert(`✅ Match Synced! Career stats updated for ${syncedCount} players.`);
            } catch (err) {
                console.error('[Sync] ❌ Career stats sync failed:', err);
                alert('⚠️ Sync partially failed. Check console for details.');
            }
        }

        setManualScoreConfig(null);
    };


    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in w-full max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div 
                    onDoubleClick={() => {
                        if (userRole !== 'admin') return;
                        const matchId = prompt("Super Admin: Enter Match ID to reset to 'upcoming':");
                        if (matchId && matches.find(m => m.id === matchId)) {
                            updateMatchStatus(matchId, 'upcoming');
                            alert(`Match ${matchId} reset to upcoming.`);
                        } else if (matchId) {
                            alert("Match not found.");
                        }
                    }}
                    className="cursor-default select-none"
                    title={userRole === 'admin' ? "Double-click for Debug" : ""}
                >
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
                        <Calendar className="text-blue-600" size={36} /> Match Center
                    </h1>
                    <p className="text-slate-500 font-medium md:text-lg max-w-2xl mt-1">Live updates, upcoming schedules, and completed playing XI setups.</p>
                </div>
                {userRole === 'admin' && (
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus size={20} /> SCHEDULE NEW MATCH
                    </button>
                )}
            </div>

            {getSortedMatches().length === 0 ? (
                <div className="bg-slate-900 rounded-2xl p-12 text-center text-slate-400 font-medium border border-slate-800">
                    No matches presently configured. Check back soon for scheduling updates!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {getSortedMatches().map(match => (
                                <MatchCenterTile 
                                    key={match.id}
                                    match={match}
                                    homeTeamName="Indian Strikers"
                                    homeTeamLogo={teamLogo}
                                    opponent={opponents.find((t: OpponentTeam) => t.id === match.opponentId)}
                                    onSelectPlayingXI={handleSelectPlayingXI}
                                    onEditMatch={(m: ScheduledMatch) => setEditingMatch(m)}
                                    onStartScoring={handleStartScoring}
                                    onViewScorecard={(id: string) => navigate(`/scorecard/${id}`)}
                                    onUpdateManualScore={(id: string, mode?: 'summary' | 'full') => {
                                        setManualScoreConfig({
                                            matchId: id,
                                            showPlayers: mode === 'full'
                                        });
                                    }}
                                    isAdmin={userRole === 'admin'}
                                />
                    ))}
                </div>
            )}

            {editingMatch && (
                <EditMatchModal 
                    match={editingMatch}
                    isOpen={!!editingMatch}
                    onClose={() => setEditingMatch(null)}
                    onSave={handleSaveMatch}
                />
            )}

            {showAddModal && (
                <AddMatchModal 
                    opponents={opponents}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            {manualScoreConfig && (
                <ManualScoreModal 
                    match={matches.find(m => m.id === manualScoreConfig.matchId)!}
                    opponent={opponents.find(o => o.id === matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId)}
                    players={manualScoreConfig.showPlayers ? players : []}
                    onClose={() => setManualScoreConfig(null)}
                    onSubmit={handleManualScoreSubmit}
                />
            )}

            {/* Playing XI Modal Rendering */}
            {xiModalConfig.isOpen && (
                <div id="team-sheet-container">
                    <PlayingXIModal 
                        matchId={xiModalConfig.matchId}
                        homePlayers={players}
                        opponentTeams={opponents}
                        opponentId={xiModalConfig.opponentId}
                        teamType={xiModalConfig.teamType}
                        initialSelection={
                            xiModalConfig.teamType === 'home' 
                                ? (matches.find(m => m.id === xiModalConfig.matchId)?.homeTeamXI || []) 
                                : (xiModalConfig.teamType === 'away' 
                                    ? (matches.find(m => m.id === xiModalConfig.matchId)?.opponentTeamXI || []) 
                                    : (matches.find(m => m.id === xiModalConfig.matchId)?.homeTeamXI || []))
                        }
                        onClose={() => setXiModalConfig({ ...xiModalConfig, isOpen: false })}
                        onSave={handleSaveXI}
                    />
                    
                    {/* Hidden Graphic for Capture during viewing/locking */}
                    {xiModalConfig.teamType === 'view' && (
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
                                        <p className="text-2xl font-black text-slate-300">
                                            {opponents.find((o: OpponentTeam) => o.id === xiModalConfig.opponentId)?.name || 'Opponent'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                                    {players.filter((p: Player) => (matches.find((m: ScheduledMatch) => m.id === xiModalConfig.matchId)?.homeTeamXI || []).includes(p.id!)).map((player: Player, idx: number) => (
                                        <div key={player.id} className="flex items-center gap-5 border-b border-white/5 pb-4">
                                            <span className="text-slate-700 font-black text-2xl italic w-8">{idx + 1}</span>
                                            <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 overflow-hidden bg-slate-950">
                                                {player.avatarUrl && <img src={player.avatarUrl} className="w-full h-full object-cover" alt={player.name} />}
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
