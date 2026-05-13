import React, { useState, useMemo } from 'react';
import { X, Trophy, Target, Calendar, Users, Loader2 } from 'lucide-react';
import { ScheduledMatch } from '../types';

interface MatchSummaryModalProps {
  match: ScheduledMatch;
  team1Name: string;
  team2Name: string;
  onSave: (summary: any) => void;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function MatchSummaryModal({ match, team1Name, team2Name, onSave, onClose, isAdmin }: MatchSummaryModalProps) {
  // Resolve team IDs with legacy field fallbacks
  const team1Id = match.team1Id || (match as any).team1_id || 'team1';
  const team2Id = match.team2Id || (match as any).team2_id || 'team2';

  const [summary, setSummary] = useState({
    tossWinner: match.tossWinnerId || (match as any).toss_winner_id || team1Id || '',
    tossChoice: match.tossChoice || match.toss?.choice || 'Bat',
    maxOvers: match.maxOvers || 20,
    resultType: (match as any).resultType || 'Normal Result',
    team1Score: match.team1Score || { runs: 0, wickets: 0, overs: 0 },
    team2Score: match.team2Score || { runs: 0, wickets: 0, overs: 0 },
  });

  const [initialSummary] = useState(summary);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanged = useMemo(() => {
    return JSON.stringify(summary) !== JSON.stringify(initialSummary);
  }, [summary, initialSummary]);

  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    // Safety timeout: If no response in 10s, show error so user can retry
    const timer = setTimeout(() => {
      if (isSaving) {
        setIsSaving(false);
        setError("Update is taking longer than expected. Please check your connection and try again.");
      }
    }, 12000);

    try {
      await onSave(summary);
      clearTimeout(timer);
    } catch (err: any) {
      clearTimeout(timer);
      setIsSaving(false);
      setError(err.message || "Failed to update match summary.");
    }
  };

  // Generate over options from 20 down to 5
  const overOptions = Array.from({ length: 16 }, (_, i) => 20 - i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <style>{`
        .summary-modal {
          width: 100%;
          max-width: 550px;
          background: #1a1d21;
          border-radius: 24px;
          padding: 32px;
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .modal-header-simple { text-align: center; margin-bottom: 30px; }
        .tournament-tag { font-size: 0.7rem; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; display: block; }
        .fixture-title { font-weight: 900; font-size: 1.4rem; margin-top: 12px; color: #fff; display: flex; align-items: center; justify-content: center; gap: 15px; }
        .vs-pill { background: #334155; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-black; color: #94a3b8; }

        .summary-score-row {
          display: flex;
          justify-content: space-around;
          background: rgba(255,255,255,0.03);
          padding: 24px;
          border-radius: 20px;
          margin-bottom: 30px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .score-box { text-align: center; flex: 1; }
        .team-label { font-size: 0.65rem; color: #64748b; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; display: block; }
        .main-score { font-size: 2.5rem; font-weight: 900; color: #2ecc71; line-height: 1; margin: 10px 0; font-variant-numeric: tabular-nums; }
        .over-label { font-size: 0.85rem; color: #475569; font-weight: 700; }

        .control-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .input-group label {
          display: block;
          font-size: 0.65rem;
          font-weight: 900;
          color: #475569;
          margin-bottom: 10px;
          letter-spacing: 1px;
        }

        .input-group select {
          width: 100%;
          background: #0f172a;
          border: 1px solid #334155;
          color: white;
          padding: 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          outline: none;
          transition: all 0.2s;
        }

        .input-group select:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

        .result-selector label {
          display: block;
          font-size: 0.65rem;
          font-weight: 900;
          color: #475569;
          margin-bottom: 15px;
          letter-spacing: 1px;
        }

        .btn-group-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }

        .btn-group-row button {
          background: #25282c;
          border: 1px solid #334155;
          color: #94a3b8;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-group-row button:hover { border-color: #475569; color: #fff; }

        .btn-group-row button.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .modal-footer {
          display: flex;
          gap: 15px;
          margin-top: 40px;
        }

        .btn-cancel {
          flex: 1;
          padding: 14px;
          background: transparent;
          border: 1px solid #334155;
          color: #94a3b8;
          border-radius: 14px;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 1px;
          transition: all 0.2s;
        }

        .btn-save {
          flex: 2;
          padding: 14px;
          background: #2ecc71;
          border: none;
          color: #052e16;
          border-radius: 14px;
          font-weight: 900;
          text-transform: uppercase;
          font-size: 0.8rem;
          letter-spacing: 1px;
          box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
          transition: all 0.2s;
        }

        .btn-save:hover { background: #27ae60; transform: translateY(-1px); }
      `}</style>

      <div className="summary-modal">
        {/* Header Section */}
        <div className="modal-header-simple">
          <span className="tournament-tag">{match.tournament || 'Friendly Match'}</span>
          <div className="fixture-title uppercase">
            <div className="flex flex-col items-center gap-2">
               <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center p-1.5 border border-white/10">
                  {match.team1Logo ? (
                    <img src={match.team1Logo} className="max-h-full max-w-full object-contain" alt={team1Name} />
                  ) : (
                    <div className="text-[10px] text-slate-500 font-black">{String(team1Name).slice(0,3)}</div>
                  )}
               </div>
               <span className="text-xs">{team1Name}</span> 
            </div>
            
            <span className="vs-pill">VS</span> 
            
            <div className="flex flex-col items-center gap-2">
               <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center p-1.5 border border-white/10">
                  {match.team2Logo ? (
                    <img src={match.team2Logo} className="max-h-full max-w-full object-contain" alt={team2Name} />
                  ) : (
                    <div className="text-[10px] text-slate-500 font-black">{String(team2Name).slice(0,3)}</div>
                  )}
               </div>
               <span className="text-xs">{team2Name}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-[#475569] font-bold text-xs uppercase letter-spacing-1">
             <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(match.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
             <span className="flex items-center gap-1"><Users size={12} /> {match.matchFormat || 'T20'}</span>
          </div>
        </div>

        {/* 1. Score Entry Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Team 1 Inputs */}
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
            <span className="team-label text-center mb-4 text-blue-400">{team1Name}</span>
            <div className="space-y-4">
              <div className="flex items-end gap-2 justify-center">
                <div className="text-center w-20">
                  <label className="text-[10px] text-slate-500 font-black block mb-1">TOTAL RUNS</label>
                  <input 
                    id="team1-runs"
                    title={`${team1Name} Runs`}
                    type="number" 
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg text-center font-black text-xl focus:border-blue-500 outline-none"
                    value={summary.team1Score.runs}
                    onChange={(e) => setSummary({...summary, team1Score: {...summary.team1Score, runs: parseInt(e.target.value) || 0}})}
                  />
                </div>
                <span className="text-2xl text-slate-600 font-black pb-1">/</span>
                <div className="text-center w-16">
                  <label className="text-[10px] text-slate-500 font-black block mb-1">WKTS</label>
                  <input 
                    id="team1-wickets"
                    title={`${team1Name} Wickets`}
                    type="number" 
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg text-center font-black text-xl focus:border-blue-500 outline-none"
                    value={summary.team1Score.wickets}
                    onChange={(e) => setSummary({...summary, team1Score: {...summary.team1Score, wickets: parseInt(e.target.value) || 0}})}
                  />
                </div>
              </div>
              <div className="text-center">
                <label className="text-[10px] text-slate-500 font-black block mb-1">OVERS COMPLETED</label>
                <input 
                  id="team1-overs"
                  title={`${team1Name} Overs`}
                  type="number"
                  step="0.1"
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg text-center font-bold text-base focus:border-blue-500 outline-none max-w-[120px] mx-auto block"
                  value={summary.team1Score.overs}
                  onChange={(e) => setSummary({...summary, team1Score: {...summary.team1Score, overs: parseFloat(e.target.value) || 0}})}
                />
              </div>
            </div>
          </div>

          {/* Team 2 Inputs */}
          <div className="bg-emerald-900/10 p-5 rounded-2xl border border-emerald-900/20">
            <span className="team-label text-center mb-4 text-emerald-400">{team2Name}</span>
            <div className="space-y-4">
              <div className="flex items-end gap-2 justify-center">
                <div className="text-center w-20">
                  <label className="text-[10px] text-emerald-900/50 font-black block mb-1">TOTAL RUNS</label>
                  <input 
                    id="team2-runs"
                    title={`${team2Name} Runs`}
                    type="number" 
                    className="w-full bg-slate-900 border border-emerald-900/30 text-white p-2 rounded-lg text-center font-black text-xl focus:border-emerald-500 outline-none"
                    value={summary.team2Score.runs}
                    onChange={(e) => setSummary({...summary, team2Score: {...summary.team2Score, runs: parseInt(e.target.value) || 0}})}
                  />
                </div>
                <span className="text-2xl text-emerald-900/30 font-black pb-1">/</span>
                <div className="text-center w-16">
                  <label className="text-[10px] text-emerald-900/50 font-black block mb-1">WKTS</label>
                  <input 
                    id="team2-wickets"
                    title={`${team2Name} Wickets`}
                    type="number" 
                    className="w-full bg-slate-900 border border-emerald-900/30 text-white p-2 rounded-lg text-center font-black text-xl focus:border-emerald-500 outline-none"
                    value={summary.team2Score.wickets}
                    onChange={(e) => setSummary({...summary, team2Score: {...summary.team2Score, wickets: parseInt(e.target.value) || 0}})}
                  />
                </div>
              </div>
              <div className="text-center">
                <label className="text-[10px] text-emerald-900/50 font-black block mb-1">OVERS COMPLETED</label>
                <input 
                  id="team2-overs"
                  title={`${team2Name} Overs`}
                  type="number"
                  step="0.1"
                  className="w-full bg-slate-900 border border-emerald-900/30 text-white p-2 rounded-lg text-center font-bold text-base focus:border-emerald-500 outline-none max-w-[120px] mx-auto block"
                  value={summary.team2Score.overs}
                  onChange={(e) => setSummary({...summary, team2Score: {...summary.team2Score, overs: parseFloat(e.target.value) || 0}})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Toss & Overs Section */}
        <div className="control-grid">
          <div className="input-group">
            <label>TOSS WON BY</label>
            <select title="Toss Winner" value={summary.tossWinner || ''} onChange={(e) => setSummary({...summary, tossWinner: e.target.value})}>
              <option value="">Select Team</option>
              <option value={team1Id}>{team1Name}</option>
              <option value={team2Id}>{team2Name}</option>
            </select>
          </div>
          <div className="input-group">
            <label>CHOSE TO</label>
            <select title="Toss Choice" value={summary.tossChoice} onChange={(e) => setSummary({...summary, tossChoice: e.target.value as 'Bat' | 'Field'})}>
              <option value="Bat">Bat</option>
              <option value="Field">Field</option>
            </select>
          </div>
          <div className="input-group">
            <label>MAX OVERS</label>
            <select title="Max Overs" value={summary.maxOvers} onChange={(e) => setSummary({...summary, maxOvers: parseInt(e.target.value)})}>
              {overOptions.map(ov => <option key={ov} value={ov}>{ov} Overs</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <div className="text-rose-500 font-bold text-xs uppercase tracking-wider mb-1">Update Failed</div>
              <div className="text-slate-300 text-sm leading-relaxed">{error}</div>
              <button 
                onClick={() => setError(null)} 
                className="mt-2 text-[10px] font-black text-rose-500/70 hover:text-rose-500 uppercase tracking-tighter"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {match.isLocked && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 border text-xs font-bold uppercase tracking-wider ${
            isAdmin
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <span>{isAdmin ? '⚠️' : '🔒'}</span>
            <span>
              {isAdmin
                ? 'Admin Override — This match is locked, but your changes will be saved.'
                : 'Match is locked. Contact an admin to make changes.'}
            </span>
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          <button 
            type="button" 
            className="btn-save" 
            onClick={handleSave} 
            disabled={isSaving || (!isAdmin && !!match.isLocked)}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
            {isSaving ? 'Updating...' : 'UPDATE'}
          </button>
        </div>
      </div>
    </div>
  );
}
