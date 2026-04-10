import React, { useState } from 'react';
import { useMasterData } from './masterDataStore';
import { useMatchCenter } from './matchCenterStore';
import { OpponentTeam, ScheduledMatch, MatchStatus, MatchStage } from '../types';
import { X, Calendar, MapPin, Trophy, Shield, Save, Zap, Loader2 } from 'lucide-react';

interface AddMatchModalProps {
    onClose: () => void;
    opponents: OpponentTeam[];
}

const AddMatchModal: React.FC<AddMatchModalProps> = ({ onClose, opponents }) => {
    const { grounds, tournaments } = useMasterData();
    const { addMatch } = useMatchCenter();

    const [formData, setFormData] = useState({
        opponentId: '',
        date: new Date().toISOString().slice(0, 16),
        groundId: '',
        tournamentId: '',
        stage: 'League' as MatchStage,
        status: 'upcoming' as MatchStatus,
        matchFormat: 'T20' as 'T20' | 'One Day',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const selectedOpponent = opponents.find(o => o.id === formData.opponentId);
            const opponentName = selectedOpponent?.name || 'Opponent';
            const opponentLogo = selectedOpponent?.logoUrl || '';
            const selectedTournament = tournaments.find((t: { id: string, name: string }) => t.id === formData.tournamentId)?.name || 'Friendly';
            const selectedVenue = grounds.find(g => g.id === formData.groundId)?.name || 'Local Ground';

            const newMatch: Omit<ScheduledMatch, 'id'> = {
                opponentId: formData.opponentId,
                opponentName,
                opponentLogo,
                date: (formData.date && !isNaN(new Date(formData.date).getTime())) 
                    ? new Date(formData.date).toISOString() 
                    : new Date().toISOString(),
                groundId: formData.groundId,
                venue: selectedVenue,
                tournament: selectedTournament,
                tournamentId: formData.tournamentId,
                stage: formData.stage,
                status: formData.status,
                matchFormat: formData.matchFormat,
                homeTeamXI: [],
                opponentTeamXI: [],
                isLocked: false
            };

            await addMatch(newMatch);
            onClose();
        } catch (e: any) {
            console.error(e);
            alert("Failed to save match to cloud: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-black/20">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <Calendar className="text-blue-500" size={20} />
                        Schedule New Match
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Opponent Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Opponent Team</label>
                        <div className="relative">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <select 
                                required
                                value={formData.opponentId}
                                onChange={(e) => setFormData({...formData, opponentId: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                title="Select Opponent"
                            >
                                <option value="">Select Opponent...</option>
                                {opponents.map(opp => (
                                    <option key={opp.id} value={opp.id}>{opp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Date & Time */}
                        <div className="space-y-2">
                            <label htmlFor="match-date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Date & Time</label>
                            <div className="relative flex items-center">
                                <input 
                                    id="match-date"
                                    required 
                                    type="datetime-local" 
                                    value={formData.date}
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-16 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                    title="Match Date and Time"
                                />
                                <button 
                                    type="button"
                                    onClick={(e) => {
                                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                        if (input) input.blur();
                                    }}
                                    className="absolute right-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-tighter rounded-lg shadow-lg transition-all active:scale-90"
                                >
                                    Set OK
                                </button>
                            </div>
                        </div>
                        {/* Stage */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Match Stage</label>
                            <select 
                                value={formData.stage}
                                onChange={(e) => setFormData({...formData, stage: e.target.value as MatchStage})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                title="Select Stage"
                            >
                                <option value="League">League</option>
                                <option value="Quarter-Final">Quarter-Final</option>
                                <option value="Semi-Final">Semi-Final</option>
                                <option value="Final">Final</option>
                            </select>
                        </div>
                    </div>

                    {/* Match Format */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Match Format</label>
                        <div className="flex gap-3">
                            {(['T20', 'One Day'] as const).map(fmt => (
                                <button
                                    key={fmt}
                                    type="button"
                                    onClick={() => setFormData({...formData, matchFormat: fmt})}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-black text-sm transition-all ${
                                        formData.matchFormat === fmt
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
                                    }`}
                                >
                                    <Zap size={14} />
                                    {fmt === 'T20' ? 'T20 (20 Overs)' : 'One Day (50 Overs)'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Ground Dropdown */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Ground</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <select 
                                    required 
                                    value={formData.groundId}
                                    onChange={(e) => setFormData({...formData, groundId: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                    title="Select Ground"
                                >
                                    <option value="">Select Ground...</option>
                                    {grounds.map((g: { id: string, name: string }) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Tournament Dropdown */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Tournament</label>
                            <div className="relative">
                                <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <select 
                                    required 
                                    value={formData.tournamentId}
                                    onChange={(e) => setFormData({...formData, tournamentId: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                    title="Select Tournament"
                                >
                                    <option value="">Select Tournament...</option>
                                    {tournaments.map((t: { id: string, name: string }) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="pt-4 flex gap-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 border border-slate-700"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            {isSaving ? 'Scheduling...' : 'Schedule Match'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMatchModal;
