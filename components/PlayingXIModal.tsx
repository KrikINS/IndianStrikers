import React, { useState } from 'react';
import { Player, OpponentTeam } from '../types';
import { X, Search, CheckCircle2, Circle } from 'lucide-react';

interface PlayingXIModalProps {
    homePlayers: Player[];
    opponentTeams: OpponentTeam[];
    matchId: string;
    opponentId: string;
    teamType: 'home' | 'away' | 'view';
    initialSelection?: string[];
    onClose: () => void;
    onSave?: (matchId: string, teamType: 'home' | 'away', selection: string[]) => void;
}

const PlayingXIModal: React.FC<PlayingXIModalProps> = ({
    homePlayers,
    opponentTeams,
    matchId,
    opponentId,
    teamType,
    initialSelection = [],
    onClose,
    onSave
}) => {
    const [selected, setSelected] = useState<Set<string>>(new Set(initialSelection));
    const isReadOnly = teamType === 'view';

    const opponentTeam = opponentTeams.find(t => t.id === opponentId);
    const awayPlayers = opponentTeam?.players || [];

    const togglePlayer = (id: string) => {
        if (isReadOnly) return;
        const newSet = new Set(selected);
        if (newSet.has(id)) newSet.delete(id);
        else if (newSet.size < 11) newSet.add(id);
        setSelected(newSet);
    };

    const handleSave = () => {
        if (onSave && (teamType === 'home' || teamType === 'away')) {
            onSave(matchId, teamType, Array.from(selected));
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-800">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight">
                            {isReadOnly ? 'Team Sheet' : `Select ${teamType === 'home' ? 'Indian Strikers' : (opponentTeam?.name || 'Opponent')} XI`}
                        </h2>
                        <p className="text-slate-400 text-sm font-medium">
                            {isReadOnly ? 'Confirmed playing squad' : 'Choose 11 players for the match'}
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Close" title="Close" className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors active:scale-90">
                        <X size={20} />
                    </button>
                </div>

                {/* Player List Body */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-950">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {teamType === 'home' || teamType === 'view' ? (
                            homePlayers.map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => togglePlayer(p.id!)}
                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all select-none
                                        ${!isReadOnly ? 'cursor-pointer active:scale-95' : ''}
                                        ${selected.has(p.id!) ? 'bg-slate-800 border-blue-500 shadow-md shadow-blue-500/10' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                >
                                    {selected.has(p.id!) ? <CheckCircle2 size={24} className="text-blue-500" /> : <Circle size={24} className="text-slate-600" />}
                                    <div className="flex items-center gap-3">
                                        <img src={p.avatarUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover bg-slate-800" />
                                        <div>
                                            <p className="font-bold text-slate-200">{p.name}</p>
                                            <p className={`text-xs ${selected.has(p.id!) ? 'text-blue-400' : 'text-slate-500'}`}>{p.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            awayPlayers.length === 0 ? (
                                <div className="col-span-2 text-center p-8 text-slate-400">
                                    No players registered for {opponentTeam?.name}. Please add players in Opponent Teams settings.
                                </div>
                            ) : (
                                awayPlayers.map((p: any) => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => togglePlayer(p.id)}
                                        className={`flex items-center gap-4 p-3 rounded-xl border transition-all select-none
                                            ${!isReadOnly ? 'cursor-pointer active:scale-95' : ''}
                                            ${selected.has(p.id) ? 'bg-slate-800 border-orange-500 shadow-md shadow-orange-500/10' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                                    >
                                        {selected.has(p.id) ? <CheckCircle2 size={24} className="text-orange-500" /> : <Circle size={24} className="text-slate-600" />}
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <p className="font-bold text-slate-200">{p.name}</p>
                                                <p className={`text-xs ${selected.has(p.id) ? 'text-orange-400' : 'text-slate-500'}`}>{p.role || 'Player'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 flex-shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        {isReadOnly ? 'Close' : 'Cancel'}
                    </button>
                    {!isReadOnly && (
                        <button 
                            onClick={handleSave}
                            disabled={selected.size === 0}
                            className="px-8 py-3 font-bold text-slate-900 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-emerald-500/20 transition-colors"
                        >
                            Save Selection
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};

export default PlayingXIModal;
