import React, { useState, useEffect } from 'react';
import { ScheduledMatch, MatchStatus, MatchStage, OpponentTeam } from '../types';
import { useMasterData } from './masterDataStore';
import { X, Save, AlertCircle, Shield } from 'lucide-react';

interface EditMatchModalProps {
    match: ScheduledMatch;
    allOpponents: OpponentTeam[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedMatch: ScheduledMatch) => void;
}

const EditMatchModal: React.FC<EditMatchModalProps> = ({ match, allOpponents, isOpen, onClose, onSave }) => {
    const { grounds, tournaments } = useMasterData();
    const formatForInput = (isoString: string) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}`;
    };

    const [formData, setFormData] = useState<ScheduledMatch>(match);
    const [localDate, setLocalDate] = useState(formatForInput(match.date));

    // Only re-sync if the match object itself changes (different ID or major refresh)
    useEffect(() => {
        if (match.id !== formData.id || match.date !== formData.date) {
            setFormData(match);
            setLocalDate(formatForInput(match.date));
        }
    }, [match]);

    if (!isOpen) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // Final sync of date before saving
        const d = new Date(localDate);
        const finalData = { ...formData };
        if (!isNaN(d.getTime())) {
            finalData.date = d.toISOString();
        }

        // Ensure metadata is synced
        if (finalData.opponentId) {
            const opp = allOpponents.find(o => o.id === finalData.opponentId);
            if (opp) {
                finalData.opponentName = opp.name;
                finalData.opponentLogo = opp.logoUrl;
            }
        }

        if (finalData.tournamentId) {
            const tour = tournaments.find(t => t.id === finalData.tournamentId);
            if (tour) finalData.tournament = tour.name;
        }

        if (finalData.groundId) {
            const g = grounds.find(g => g.id === finalData.groundId);
            if (g) finalData.venue = g.name;
        }

        onSave(finalData);
    };

    const statusOptions: MatchStatus[] = ['upcoming', 'live', 'completed'];
    const stageOptions: MatchStage[] = ['League', 'Quarter-Final', 'Semi-Final', 'Final'];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <AlertCircle className="text-blue-500" size={20} />
                        Edit Match Details
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Opponent Selection (Added) */}
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Opponent Team</label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <select 
                                    value={formData.opponentId || ''}
                                    onChange={(e) => setFormData({...formData, opponentId: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                    title="Select Opponent"
                                >
                                    <option value="">Select Opponent...</option>
                                    {allOpponents.map(opp => (
                                        <option key={opp.id} value={opp.id}>{opp.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Match Status</label>
                            <select 
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value as MatchStatus})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                title="Select Match Status"
                            >
                                {statusOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>

                        {/* Stage */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Match Stage</label>
                            <select 
                                value={formData.stage}
                                onChange={(e) => setFormData({...formData, stage: e.target.value as MatchStage})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                title="Select Match Stage"
                            >
                                {stageOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date/Time */}
                    <div className="space-y-1.5 group">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Match Date & Time</label>
                        <div className="relative">
                            <input 
                                type="datetime-local"
                                value={localDate}
                                onChange={(e) => setLocalDate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                title="Match Date and Time"
                            />
                        </div>
                    </div>

                    {/* Ground & Tournament */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Ground</label>
                            <select 
                                value={formData.groundId}
                                onChange={(e) => setFormData({...formData, groundId: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                title="Select Ground"
                            >
                                <option value="">Select Ground...</option>
                                {grounds.map(g => (
                                    <option key={g.id} value={g.id}>{g.name} ({g.location})</option>
                                ))}
                                <option value="Other">Other Ground</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Tournament</label>
                            <select 
                                value={formData.tournamentId || ''}
                                onChange={(e) => {
                                    const tourId = e.target.value;
                                    const tour = tournaments.find(t => t.id === tourId);
                                    setFormData({
                                        ...formData, 
                                        tournamentId: tourId,
                                        tournament: tour ? tour.name : (tourId === 'Other' ? 'Other' : '')
                                    });
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                title="Select Tournament"
                            >
                                <option value="">Select Tournament...</option>
                                {tournaments.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} ({t.year})</option>
                                ))}
                                <option value="Other">Other Tournament</option>
                            </select>
                        </div>
                    </div>

                    {/* Toss Details */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Toss Details</label>
                        <input 
                            type="text"
                            value={formData.tossDetails || ''}
                            onChange={(e) => setFormData({...formData, tossDetails: e.target.value})}
                            placeholder="e.g. INS won & chose to bat"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Result Summary */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Result Summary</label>
                        <textarea 
                            value={formData.resultSummary || ''}
                            onChange={(e) => setFormData({...formData, resultSummary: e.target.value})}
                            placeholder="e.g. Indian Strikers won by 4 wickets"
                            rows={2}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors active:scale-95"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <Save size={18} /> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditMatchModal;
