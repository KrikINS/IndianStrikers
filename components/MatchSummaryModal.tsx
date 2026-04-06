import React, { useState } from 'react';
import { X, Trophy, Target, Calendar, Users } from 'lucide-react';
import { ScheduledMatch } from './matchCenterStore';

interface MatchSummaryModalProps {
  match: ScheduledMatch;
  opponentName: string;
  onSave: (summary: any) => void;
  onClose: () => void;
}

export default function MatchSummaryModal({ match, opponentName, onSave, onClose }: MatchSummaryModalProps) {
  const [summary, setSummary] = useState({
    tossWinner: match.toss?.winner || '',
    tossChoice: match.toss?.choice || 'Bat',
    maxOvers: match.maxOvers || 20,
    resultType: match.resultType || 'Normal Result',
    homeScore: match.finalScoreHome || { runs: 0, wickets: 0, overs: 0 },
    awayScore: match.finalScoreAway || { runs: 0, wickets: 0, overs: 0 },
  });

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

        {/* 1. Score Display */}
        <div className="summary-score-row">
          <div className="score-box">
            <span className="team-label">Indian Strikers</span>
            <div className="main-score">
              {summary.homeScore.runs}
              <span className="text-slate-600 text-2xl font-black">/</span>
              <span className="text-slate-500 text-3xl font-black">{summary.homeScore.wickets}</span>
            </div>
            <span className="over-label">{summary.homeScore.overs} OV</span>
          </div>
          <div className="score-box px-4 opacity-20 border-r border-white/10 h-10 my-auto"></div>
          <div className="score-box">
            <span className="team-label text-emerald-400">{opponentName}</span>
            <div className="main-score text-emerald-400">
              {summary.awayScore.runs}
              <span className="text-emerald-900 text-2xl font-black">/</span>
              <span className="text-emerald-800 text-3xl font-black">{summary.awayScore.wickets}</span>
            </div>
            <span className="over-label text-emerald-900/50">{summary.awayScore.overs} OV</span>
          </div>
        </div>

        {/* 2. Toss & Overs Section */}
        <div className="control-grid">
          <div className="input-group">
            <label>TOSS WON BY</label>
            <select title="Toss Winner" value={summary.tossWinner} onChange={(e) => setSummary({...summary, tossWinner: e.target.value})}>
              <option value="">Select Team</option>
              <option value="Indian Strikers">Indian Strikers</option>
              <option value={opponentName}>{opponentName}</option>
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
          <button type="button" className="btn-save" onClick={() => onSave(summary)}>Update Summary</button>
        </div>
      </div>
    </div>
  );
}
