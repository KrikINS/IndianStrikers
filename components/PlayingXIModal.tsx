import React, { useState } from 'react';
import { Player, OpponentTeam } from '../types';
import { X, Users, Check, Save } from 'lucide-react';

interface PlayingXIModalProps {
    matchId: string;
    homePlayers: Player[]; // Roster from PlayerList/SquadRoster
    opponentTeams: OpponentTeam[];
    opponentId: string;
    teamType: 'home' | 'away' | 'view';
    initialSelection?: string[];
    onClose: () => void;
    onSave: (matchId: string, teamType: 'home' | 'away', selection: string[]) => void;
}

export const PlayingXIModal: React.FC<PlayingXIModalProps> = ({ 
    matchId, 
    homePlayers, 
    opponentTeams, 
    opponentId,
    teamType,
    initialSelection = [],
    onClose,
    onSave
}) => {
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>(initialSelection);
    const isViewOnly = teamType === 'view';
    const opponent = opponentTeams.find(t => t.id === opponentId);

    const togglePlayer = (id: string, name: string) => {
        if (isViewOnly) return;
        
        // Use different logic for IDs vs Names if necessary, 
        // but here we treat both as unique identifiers in the selection array
        setSelectedPlayers(prev => {
            const isAlreadySelected = prev.includes(id);
            if (isAlreadySelected) {
                return prev.filter(p => p !== id);
            } else {
                if (prev.length < 11) {
                    return [...prev, id];
                }
                return prev;
            }
        });
    };

    const handleSave = () => {
        if (selectedPlayers.length !== 11) return;
        if (teamType === 'home' || teamType === 'away') {
            onSave(matchId, teamType, selectedPlayers);
        }
        onClose();
    };

    // Use home roster for 'home' and 'view' (Indian Strikers), 
    // for 'away' we use the specific opponent's roster if available
    const displayPlayers = teamType === 'away' ? (opponent?.players || []) : homePlayers;
    const title = teamType === 'home' ? 'Select Indian Strikers XI' : 
                  teamType === 'away' ? `Select ${opponent?.name || 'Opponent'} XI` : 
                  'Match Day Team Sheet';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/90 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-black uppercase text-white flex items-center gap-3">
                            <Users size={28} className="text-blue-500" /> {title}
                        </h2>
                        {!isViewOnly && (
                            <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-wider">
                                {selectedPlayers.length} / 11 Players Selected
                            </p>
                        )}
                    </div>
                    <button 
                        onClick={onClose} 
                        title="Close Modal"
                        aria-label="Close"
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {displayPlayers.map(player => {
                            const isSelected = selectedPlayers.includes(player.id || player.name);
                            // Safety for different player structures
                            const playerImage = (player as any).avatarUrl || (player as any).photo || '';
                            const playerRoleStr = (player as any).role || 'Player';

                            return (
                                <div 
                                    key={player.id || player.name}
                                    onClick={() => togglePlayer(player.id || player.name, player.name)}
                                    className={`group flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer
                                        ${isSelected ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-900/20' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                                >
                                    <div className="relative">
                                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border-2 
                                            ${isSelected ? 'border-blue-500' : 'border-slate-700'}`}
                                        >
                                            {playerImage ? (
                                                <img src={playerImage} alt={player.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                                                    <Users size={24} />
                                                </div>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1 shadow-lg">
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold uppercase tracking-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                            {player.name}
                                        </h4>
                                        <p className="text-xs font-bold text-slate-500 uppercase">{playerRoleStr}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 md:p-8 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <button 
                        onClick={onClose}
                        title="Close Modal"
                        className="px-6 py-3 text-slate-400 font-bold uppercase hover:text-white transition-colors"
                    >
                        Back
                    </button>
                    {!isViewOnly && (
                        <button 
                            onClick={handleSave}
                            disabled={selectedPlayers.length === 0}
                            title={selectedPlayers.length === 11 ? "Save Squad" : `Need ${11 - selectedPlayers.length} more players`}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase transition-all
                                ${selectedPlayers.length === 11 
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' 
                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                        >
                            <Save size={18} />
                            {selectedPlayers.length === 11 ? 'Save Squad' : `Select ${11 - selectedPlayers.length} More`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
