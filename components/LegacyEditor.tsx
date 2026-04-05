import React, { useState } from 'react';
import { Player } from '../types';
import { History, Save, TrendingUp, Target, Swords, Users, Clock, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LegacyEditorProps {
    players: Player[];
    onUpdatePlayer: (player: Player) => void | Promise<void>;
}

const LegacyEditor: React.FC<LegacyEditorProps> = ({ players, onUpdatePlayer }) => {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    
    // Core match context
    const [matchDetails, setMatchDetails] = useState({
        date: new Date().toISOString().split('T')[0],
        opponentName: '',
        homeTotal: '',
        awayTotal: '',
        result: 'Won'
    });

    // We keep track of the stats inputted for each player who participated
    // Keyed by player ID
    const [stats, setStats] = useState<Record<string, { runs: number, balls: number, wickets: number, included: boolean }>>({});

    const handleStatChange = (id: string, field: 'runs' | 'balls' | 'wickets' | 'included', value: number | boolean) => {
        setStats(prev => ({
            ...prev,
            [id]: {
                ...(prev[id] || { runs: 0, balls: 0, wickets: 0, included: true }),
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        if (!matchDetails.opponentName) {
            alert("Please enter the Opponent Team name.");
            return;
        }

        const playersToUpdate = Object.keys(stats).filter(id => stats[id].included);
        
        if (playersToUpdate.length === 0) {
            alert("Please include at least one player in the scorecard.");
            return;
        }

        if (!window.confirm(`You are about to permanently update career stats for ${playersToUpdate.length} players. Continue?`)) return;

        setIsSaving(true);
        try {
            // Concurrently map over and append stats to the career totals of included players
            await Promise.all(playersToUpdate.map(async (id) => {
                const playerRecord = players.find(p => p.id === id);
                if (!playerRecord) return;

                const inputStat = stats[id];

                // Append new stats to existing career variables
                const updatedPlayer: Player = {
                    ...playerRecord,
                    matchesPlayed: (playerRecord.matchesPlayed || 0) + 1,
                    runsScored: (playerRecord.runsScored || 0) + (inputStat.runs || 0),
                    wicketsTaken: (playerRecord.wicketsTaken || 0) + (inputStat.wickets || 0)
                };

                await onUpdatePlayer(updatedPlayer);
            }));

            alert("Scorecard Saved! Career stats updated successfully.");
            navigate('/home');
        } catch (error) {
            console.error(error);
            alert("Failed to save scorecard completely. Check your connection.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in w-full max-w-5xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <button 
                        onClick={() => navigate('/home')}
                        className="text-slate-500 hover:text-slate-800 mb-2 flex items-center gap-1 font-bold text-sm bg-slate-200 px-3 py-1.5 rounded-lg active:scale-95 transition-all w-max"
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
                        <History className="text-blue-600" size={36} /> Legacy Editor
                    </h1>
                    <p className="text-slate-500 font-medium md:text-lg max-w-2xl mt-1">Retroactively record a completed match. Data entered here permanently updates player career statistics.</p>
                </div>
                
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-600/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {isSaving ? 'Processing Update...' : 'Commit to Database'}
                </button>
            </div>

            {/* Match Details Form */}
            <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2"><Swords className="text-orange-500" /> Match Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Match Date</label>
                            <input 
                                type="date" 
                                title="Match Date"
                                value={matchDetails.date}
                                onChange={(e) => setMatchDetails({...matchDetails, date: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Opponent Team</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Desert Vipers"
                                value={matchDetails.opponentName}
                                onChange={(e) => setMatchDetails({...matchDetails, opponentName: e.target.value})}
                                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-4 md:border-l border-slate-800 md:pl-6">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2"><Target className="text-emerald-500" /> Team Scores</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">Indian Strikers</label>
                            <input 
                                type="text" 
                                placeholder="Total (e.g. 154/6)"
                                value={matchDetails.homeTotal}
                                onChange={(e) => setMatchDetails({...matchDetails, homeTotal: e.target.value})}
                                className="w-full bg-emerald-950/20 border border-emerald-900/50 text-emerald-400 rounded-xl px-4 py-3 font-black text-center focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-emerald-900 placeholder:font-medium"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-orange-500 uppercase tracking-wider mb-2">Opponent Total</label>
                            <input 
                                type="text" 
                                placeholder="Total (e.g. 142/9)"
                                value={matchDetails.awayTotal}
                                onChange={(e) => setMatchDetails({...matchDetails, awayTotal: e.target.value})}
                                className="w-full bg-orange-950/20 border border-orange-900/50 text-orange-400 rounded-xl px-4 py-3 font-black text-center focus:ring-2 focus:ring-orange-500 outline-none placeholder:text-orange-900 placeholder:font-medium"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Individual Stats Matrix */}
            <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2"><TrendingUp className="text-yellow-400" /> Individual Performance Matrix</h3>
                    <div className="text-slate-400 text-xs font-medium">Tick the checkbox to include a player in this match record.</div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="border-b border-slate-800 uppercase text-[10px] font-black tracking-widest text-slate-500">
                                <th className="p-3 w-12 text-center">Play</th>
                                <th className="p-3 font-bold text-slate-400">Player</th>
                                <th className="p-3 text-center">Role</th>
                                <th className="p-3 text-center">Runs</th>
                                <th className="p-3 text-center">Balls Faced</th>
                                <th className="p-3 text-center">Wickets</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {players.map(player => {
                                const pData = stats[player.id!] || { runs: '', balls: '', wickets: '', included: false };
                                
                                return (
                                    <tr key={player.id} className={`transition-colors hover:bg-slate-800/50 ${pData.included ? 'bg-slate-800/30' : ''}`}>
                                        <td className="p-3 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={pData.included}
                                                onChange={(e) => handleStatChange(player.id!, 'included', e.target.checked)}
                                                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                                                aria-label={`Include ${player.name}`}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-3">
                                                <img src={player.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-slate-800" />
                                                <span className={`font-bold text-sm ${pData.included ? 'text-white' : 'text-slate-400'}`}>{player.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center text-xs text-slate-500 font-medium">
                                            {player.role}
                                        </td>
                                        <td className="p-3 whitespace-nowrap px-2">
                                            <input 
                                                type="number" 
                                                disabled={!pData.included}
                                                value={pData.runs} 
                                                onChange={(e) => handleStatChange(player.id!, 'runs', parseInt(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-20 bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-center font-black focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed mx-auto block"
                                                aria-label={`${player.name} runs`}
                                            />
                                        </td>
                                        <td className="p-3 whitespace-nowrap px-2">
                                            <input 
                                                type="number" 
                                                disabled={!pData.included}
                                                value={pData.balls} 
                                                onChange={(e) => handleStatChange(player.id!, 'balls', parseInt(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-20 bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-center font-bold focus:ring-2 focus:ring-blue-500 disabled:opacity-30 disabled:cursor-not-allowed mx-auto block"
                                                aria-label={`${player.name} balls faced`}
                                            />
                                        </td>
                                        <td className="p-3 whitespace-nowrap px-2">
                                            <input 
                                                type="number" 
                                                disabled={!pData.included}
                                                value={pData.wickets} 
                                                onChange={(e) => handleStatChange(player.id!, 'wickets', parseInt(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-20 bg-slate-950 border border-slate-700 text-amber-400 rounded-lg px-2 py-1.5 text-center font-black focus:ring-2 focus:ring-amber-500 disabled:opacity-30 disabled:cursor-not-allowed mx-auto block"
                                                aria-label={`${player.name} wickets`}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 pb-8">Internal Protocol • Secure Database Gateway</p>
        </div>
    );
};

export default LegacyEditor;
