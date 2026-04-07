import React, { useState, useMemo } from 'react';
import { Player, OpponentTeam } from '../types';
import { X, Users, Check, Save, Plus, Loader2 } from 'lucide-react';

interface PlayingXIModalProps {
    matchId: string;
    homePlayers: Player[]; // Roster from PlayerList/SquadRoster
    opponentTeams: OpponentTeam[];
    opponentId: string;
    teamType: 'home' | 'opponent' | 'view';
    initialSelection?: string[];
    onClose: () => void;
    onSave: (matchId: string, teamType: 'home' | 'opponent', selection: string[]) => void;
    onQuickAddPlayer?: (name: string) => void;
}


export const PlayingXIModal: React.FC<PlayingXIModalProps> = ({ 
    matchId, 
    homePlayers, 
    opponentTeams, 
    opponentId,
    teamType,
    initialSelection = [],
    onClose,
    onSave,
    onQuickAddPlayer
}) => {
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>(initialSelection);
    const [isSaving, setIsSaving] = useState(false);
    const [quickAddName, setQuickAddName] = useState('');

    const hasChanged = useMemo(() => {
        if (selectedPlayers.length !== initialSelection.length) return true;
        const sortedA = [...selectedPlayers].sort();
        const sortedB = [...initialSelection].sort();
        return sortedA.some((val, index) => val !== sortedB[index]);
    }, [selectedPlayers, initialSelection]);
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

    const handleQuickAdd = () => {
        if (!quickAddName.trim() || !onQuickAddPlayer) return;
        onQuickAddPlayer(quickAddName.trim());
        setQuickAddName('');
    };

    const handleSave = async () => {
        if (selectedPlayers.length === 0) return;
        setIsSaving(true);
        if (teamType === 'home' || teamType === 'opponent') {
            await onSave(matchId, teamType, selectedPlayers);
        }
        setIsSaving(false);
        onClose();
    };

    // Use home roster for 'home' and 'view' (Indian Strikers), 
    // for 'away' we use the specific opponent's roster if available
    const displayPlayers = teamType === 'opponent' ? (opponent?.players || []) : homePlayers;
    const title = teamType === 'home' ? 'Select Indian Strikers XI' : 
                  teamType === 'opponent' ? `Select ${opponent?.name || 'Opponent'} XI` : 
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

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {/* QUICK ADD SECTION - Only for Opponents */}
                    {teamType === 'opponent' && onQuickAddPlayer && (
                        <div className="flex gap-2 mb-6 p-4 bg-blue-600/5 rounded-2xl border border-blue-500/20 shadow-sm">
                            <input 
                                type="text" 
                                placeholder="Quick Player Name..." 
                                className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600 text-sm"
                                value={quickAddName}
                                onChange={(e) => setQuickAddName(e.target.value)}
                                onKeyDown={(e) => { 
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleQuickAdd();
                                    }
                                }}
                            />
                            <button 
                                onClick={handleQuickAdd}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold uppercase tracking-wider transition-all text-xs"
                            >
                                <Plus size={16} className="stroke-[3]" />
                                Add
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                        {displayPlayers.map(player => {
                            const isSelected = selectedPlayers.includes(player.id || player.name);
                            const playerImage = (player as any).avatarUrl || (player as any).photo || '';

                            return (
                                <div 
                                    key={player.id || player.name}
                                    onClick={() => togglePlayer(player.id || player.name, player.name)}
                                    className={`group flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer shadow-sm
                                        ${isSelected ? 'bg-blue-600/10 border-blue-500 shadow-blue-900/20' : 'bg-slate-800/50 border-transparent hover:border-slate-600'}`}
                                >
                                    <div className="relative shrink-0">
                                        <div className={`w-8 h-8 rounded-full overflow-hidden border 
                                            ${isSelected ? 'border-blue-500' : 'border-slate-700'}`}
                                        >
                                            {playerImage ? (
                                                <img src={playerImage} alt={player.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                                                    <Users size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold uppercase tracking-tighter truncate text-[11px] ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                            {player.name}
                                        </h4>
                                    </div>
                                    {isSelected && <Check size={12} className="text-blue-500 stroke-[4]" />}
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
                            disabled={selectedPlayers.length === 0 || !hasChanged || isSaving}
                            title={selectedPlayers.length === 11 ? "Save Squad" : (hasChanged ? `Need ${11 - selectedPlayers.length} more players` : "No changes made")}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase transition-all
                                ${selectedPlayers.length > 0 && hasChanged && !isSaving
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' 
                                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                        >
                            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {isSaving ? 'Saving...' : (selectedPlayers.length === 11 ? 'Save & Close' : `Select ${11 - selectedPlayers.length} More`)}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
