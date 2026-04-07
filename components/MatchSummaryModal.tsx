import React, { useState, useMemo } from 'react';
import { X, Trophy, Target, Calendar, Users, Loader2 } from 'lucide-react';
import { ScheduledMatch } from '../types';

interface MatchSummaryModalProps {
  match: ScheduledMatch;
  opponentName: string;
  onSave: (summary: any) => void;
  onClose: () => void;
}

export default function MatchSummaryModal({ match, opponentName, onSave, onClose }: MatchSummaryModalProps) {
  const HOME_TEAM_ID = '00000000-0000-0000-0000-000000000000';

  const [summary, setSummary] = useState({
    tossWinner: match.toss_winner_id || (match.toss?.winner === 'Indian Strikers' ? HOME_TEAM_ID : match.opponentId) || '',
    tossChoice: match.toss_choice || match.toss?.choice || 'Bat',
    maxOvers: match.maxOvers || 20,
    resultType: match.resultType || 'Normal Result',
    homeScore: match.finalScoreHome || { runs: 0, wickets: 0, overs: 0 },
    awayScore: match.finalScoreAway || { runs: 0, wickets: 0, overs: 0 },
  });

  const [initialSummary] = useState(summary);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanged = useMemo(() => {
    return JSON.stringify(summary) !== JSON.stringify(initialSummary);
  }, [summary, initialSummary]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(summary);
    // Modal will close via parent
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
            <span>INDIAN STRIKERS</span> 
            <span className="vs-pill">VS</span> 
            <span>{opponentName}</span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-[#475569] font-bold text-xs uppercase letter-spacing-1">
             <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(match.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
             <span className="flex items-center gap-1"><Users size={12} /> {match.matchFormat || 'T20'}</span>
          </div>
        </div>

        {/* 1. Score Entry Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Home Team Inputs */}
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
            <span className="team-label text-center mb-4 text-blue-400">Indian Strikers</span>
            <div className="space-y-4">
              <div className="flex items-end gap-2 justify-center">
                <div className="text-center w-20">
                  <label className="text-[10px] text-slate-500 font-black block mb-1">TOTAL RUNS</label>
                  <input 
                    id="home-runs"
                    title="Home Runs"
                    type="number" 
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg text-center font-black text-xl focus:border-blue-500 outline-none"
                    value={summary.homeScore.runs}
                    onChange={(e) => setSummary({...summary, homeScore: {...summary.homeScore, runs: parseInt(e.target.value) || 0}})}
                  />
                </div>
                <span className="text-2xl text-slate-600 font-black pb-1">/</span>
                <div className="text-center w-16">
                  <label className="text-[10px] text-slate-500 font-black block mb-1">WKTS</label>
                  <input 
                    id="home-wickets"
                    title="Home Wickets"
                    type="number" 
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg text-center font-black text-xl focus:border-blue-500 outline-none"
                    value={summary.homeScore.wickets}
                    onChange={(e) => setSummary({...summary, homeScore: {...summary.homeScore, wickets: parseInt(e.target.value) || 0}})}
                  />
                </div>
              </div>
              <div className="text-center">
                <label className="text-[10px] text-slate-500 font-black block mb-1">OVERS COMPLETED</label>
                <input 
                  id="home-overs"
                  title="Home Overs"
                  type="number"
                  step="0.1"
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg text-center font-bold text-base focus:border-blue-500 outline-none max-w-[120px] mx-auto block"
                  value={summary.homeScore.overs}
                  onChange={(e) => setSummary({...summary, homeScore: {...summary.homeScore, overs: parseFloat(e.target.value) || 0}})}
                />
              </div>
            </div>
          </div>

          {/* Away Team Inputs */}
          <div className="bg-emerald-900/10 p-5 rounded-2xl border border-emerald-900/20">
            <span className="team-label text-center mb-4 text-emerald-400">{opponentName}</span>
            <div className="space-y-4">
              <div className="flex items-end gap-2 justify-center">
                <div className="text-center w-20">
                  <label className="text-[10px] text-emerald-900/50 font-black block mb-1">TOTAL RUNS</label>
                  <input 
                    id="away-runs"
                    title="Away Runs"
                    type="number" 
                    className="w-full bg-slate-900 border border-emerald-900/30 text-white p-2 rounded-lg text-center font-black text-xl focus:border-emerald-500 outline-none"
                    value={summary.awayScore.runs}
                    onChange={(e) => setSummary({...summary, awayScore: {...summary.awayScore, runs: parseInt(e.target.value) || 0}})}
                  />
                </div>
                <span className="text-2xl text-emerald-900/30 font-black pb-1">/</span>
                <div className="text-center w-16">
                  <label className="text-[10px] text-emerald-900/50 font-black block mb-1">WKTS</label>
                  <input 
                    id="away-wickets"
                    title="Away Wickets"
                    type="number" 
                    className="w-full bg-slate-900 border border-emerald-900/30 text-white p-2 rounded-lg text-center font-black text-xl focus:border-emerald-500 outline-none"
                    value={summary.awayScore.wickets}
                    onChange={(e) => setSummary({...summary, awayScore: {...summary.awayScore, wickets: parseInt(e.target.value) || 0}})}
                  />
                </div>
              </div>
              <div className="text-center">
                <label className="text-[10px] text-emerald-900/50 font-black block mb-1">OVERS COMPLETED</label>
                <input 
                  id="away-overs"
                  title="Away Overs"
                  type="number"
                  step="0.1"
                  className="w-full bg-slate-900 border border-emerald-900/30 text-white p-2 rounded-lg text-center font-bold text-base focus:border-emerald-500 outline-none max-w-[120px] mx-auto block"
                  value={summary.awayScore.overs}
                  onChange={(e) => setSummary({...summary, awayScore: {...summary.awayScore, overs: parseFloat(e.target.value) || 0}})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Toss & Overs Section */}
        <div className="control-grid">
          <div className="input-group">
            <label>TOSS WON BY</label>
            <select title="Toss Winner" value={summary.tossWinner} onChange={(e) => setSummary({...summary, tossWinner: e.target.value})}>
              <option value="">Select Team</option>
              <option value={HOME_TEAM_ID}>Indian Strikers</option>
              <option value={match.opponentId}>{opponentName}</option>
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

        {/* 3. Result Section */}
        <div className="result-selector">
          <label>MATCH STATUS / RESULT TYPE</label>
          <div className="btn-group-row">
            {['Normal Result', 'Abandoned', 'Tie', 'Forfeit (Home)', 'Forfeit (Opponent)'].map(res => (
              <button 
                key={res}
                type="button"
                className={summary.resultType === res ? 'active' : ''}
                onClick={() => setSummary({...summary, resultType: res})}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          <button 
            type="button" 
            className="btn-save" 
            onClick={handleSave} 
            disabled={!hasChanged || isSaving}
            style={(!hasChanged || isSaving) ? { background: '#334155', color: '#94a3b8', cursor: 'not-allowed', boxShadow: 'none' } : {}}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
