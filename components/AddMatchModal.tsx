import React, { useState } from 'react';
import { useMasterData } from '../store/tournamentStore';
import { useMatchCenter } from '../store/matchStore';
import { OpponentTeam, ScheduledMatch, MatchStatus, MatchStage } from '../types';
import { X, Calendar, MapPin, Trophy, Shield, Save, Zap, Loader2 } from 'lucide-react';

interface AddMatchModalProps {
    onClose: () => void;
    opponents: OpponentTeam[];
}

const AddMatchModal: React.FC<AddMatchModalProps> = ({ onClose, opponents }) => {
    const { grounds, tournaments } = useMasterData();
    const { addMatch } = useMatchCenter();

    const getInitialDate = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${mins}`;
    };

    const [formData, setFormData] = useState({
        team2Id: '',
        date: getInitialDate(),
        groundId: '',
        tournamentId: '',
        stage: 'League' as MatchStage,
        status: 'upcoming' as MatchStatus,
        matchFormat: 'T20' as 'T20' | 'One Day',
        isFriendly: false,
        team1Id: '00000000-0000-0000-0000-000000000000',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const selectedTeam1 = opponents.find(o => o.id === formData.team1Id);
            const selectedTeam2 = opponents.find(o => o.id === formData.team2Id);
            
            const team1Name = formData.team1Id === '00000000-0000-0000-0000-000000000000' ? 'Indian Strikers' : (selectedTeam1?.name || 'Team 1');
            const team1Logo = formData.team1Id === '00000000-0000-0000-0000-000000000000' ? '/INS%20LOGO.PNG' : (selectedTeam1?.logoUrl || '');
            const team2Name = selectedTeam2?.name || 'Team 2';
            const team2Logo = selectedTeam2?.logoUrl || '';
            
            const selectedTournament = formData.isFriendly 
                ? 'Friendly Match' 
                : tournaments.find((t: { id: string, name: string }) => t.id === formData.tournamentId)?.name || 'Friendly Match';
            const selectedVenue = grounds.find(g => g.id === formData.groundId)?.name || 'Local Ground';

            const newMatch: Omit<ScheduledMatch, 'id'> = {
                isNeutral: formData.team1Id !== '00000000-0000-0000-0000-000000000000' && formData.team2Id !== '00000000-0000-0000-0000-000000000000',
                team1Id: formData.team1Id,
                team1Name: team1Name,
                team1Logo: team1Logo,
                team2Id: formData.team2Id || null,
                team2Name: team2Name,
                team2Logo: team2Logo,
                date: (formData.date && !isNaN(new Date(formData.date).getTime())) 
                    ? new Date(formData.date).toISOString() 
                    : new Date().toISOString(),
                groundId: formData.groundId || null,
                venue: selectedVenue,
                tournament: selectedTournament,
                tournamentId: formData.isFriendly ? null : (formData.tournamentId || null),
                stage: formData.stage,
                status: formData.status,
                matchFormat: formData.matchFormat,
                team1XI: [],
                team2XI: [],
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


    const friendlyPressed = formData.isFriendly ? "true" : "false";

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
                    <div className="grid grid-cols-1 gap-4">
                        {/* Friendly Match Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-white uppercase italic">Friendly Match</span>
                                <span className="text-[10px] text-slate-500 font-bold leading-tight">No tournament points tracking</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, isFriendly: !prev.isFriendly, tournamentId: prev.isFriendly ? prev.tournamentId : '' }))}
                                className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${formData.isFriendly ? 'bg-amber-600' : 'bg-slate-700'}`}
                                title="Toggle Friendly Match"
                                aria-pressed={friendlyPressed}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isFriendly ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Team 1 Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                                Team 1 (Slot 1)
                            </label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <select 
                                    required
                                    value={formData.team1Id}
                                    onChange={(e) => setFormData({...formData, team1Id: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                    title="Select Team 1"
                                >
                                    <option value="00000000-0000-0000-0000-000000000000">Indian Strikers</option>
                                    {opponents.map(opp => (
                                        <option key={opp.id} value={opp.id}>{opp.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Team 2 Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                                Team 2 (Slot 2)
                            </label>
                            <div className="relative">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <select 
                                    required
                                    value={formData.team2Id}
                                    onChange={(e) => setFormData({...formData, team2Id: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
                                    title="Select Team 2"
                                >
                                    <option value="">Select Team 2...</option>
                                    <option value="00000000-0000-0000-0000-000000000000">Indian Strikers</option>
                                    {opponents.filter(o => o.id !== formData.team1Id).map(opp => (
                                        <option key={opp.id} value={opp.id}>{opp.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Date & Time */}
                        <div className="space-y-2">
                            <label htmlFor="match-date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Date & Time</label>
                        <div className="relative">
                            <input 
                                id="match-date"
                                required 
                                type="datetime-local" 
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                                title="Match Date and Time"
                            />
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
                                    required={!formData.isFriendly}
                                    disabled={formData.isFriendly}
                                    value={formData.tournamentId}
                                    onChange={(e) => setFormData({...formData, tournamentId: e.target.value})}
                                    className={`w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none ${formData.isFriendly ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    title="Select Tournament"
                                >
                                    <option value="">{formData.isFriendly ? 'Friendly Match' : 'Select Tournament...'}</option>
                                    {!formData.isFriendly && tournaments.map((t: { id: string, name: string }) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
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
