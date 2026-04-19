import * as React from 'react';
import { useState, useMemo } from 'react';
import { X, Save, Award, Zap, Target, ChevronDown, Star } from 'lucide-react';
import { Player, FullScorecardData, InningsData, ScheduledMatch } from '../types';

interface ManualScoreModalProps {
  match: ScheduledMatch;
  opponent?: { name: string; logoUrl?: string; players?: any[] };
  players?: Player[];
  onClose: () => void;
  onSubmit: (finalData: any) => void;
}

const RESULT_OPTIONS = [
  { value: '', label: 'Normal Result' },
  { value: 'Abandoned', label: 'Abandoned' },
  { value: 'Tie', label: 'Tie' },
  { value: 'Forfeit-Home', label: 'Forfeit (Indian Strikers)' },
  { value: 'Forfeit-Away', label: 'Forfeit (Opponent)' },
];

export default function ManualScoreModal({ match, opponent, players = [], onClose, onSubmit }: ManualScoreModalProps) {
  const opponentName = opponent?.name || 'Opponent';

  const [tossWinner, setTossWinner] = useState<string>('Indian Strikers');
  const [tossChoice, setTossChoice] = useState<'Bat' | 'Field'>('Bat');
  const [maxOvers, setMaxOvers] = useState<number>(match.matchFormat === 'One Day' ? 50 : 20);
  const [resultType, setResultType] = useState('');

  const innings1BattingTeam: 'home' | 'away' = useMemo(() => {
    const homeWon = tossWinner === 'Indian Strikers';
    if ((homeWon && tossChoice === 'Bat') || (!homeWon && tossChoice === 'Field')) return 'home';
    return 'away';
  }, [tossWinner, tossChoice]);

  const overOptions = match.matchFormat === 'One Day'
    ? [50, 40, 35, 30, 25, 20]
    : [20, 15, 12, 10, 8, 5];

  const [homeScore, setHomeScore] = useState(match.finalScoreHome || { runs: 0, wickets: 0, overs: 0 });
  const [awayScore, setAwayScore] = useState(match.finalScoreAway || { runs: 0, wickets: 0, overs: 0 });
  const [activeInnings, setActiveInnings] = useState<1 | 2>(1);

  const initialInnings: InningsData = {
    batting: [],
    bowling: [],
    extras: { wide: 0, no_ball: 0, legByes: 0, byes: 1 },
    totalRuns: 0, totalWickets: 0, totalOvers: 0,
    history: []
  };

  const [scorecard, setScorecard] = useState<FullScorecardData>({
    innings1: { ...initialInnings, extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 } },
    innings2: { ...initialInnings, extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 } },
  });

  const [battingRowIds, setBattingRowIds] = useState<Record<1 | 2, string[]>>({
    1: [],
    2: []
  });

  const [bowlingRows, setBowlingRows] = useState<Record<1 | 2, any[]>>({
    1: Array(2).fill(null).map(() => ({ playerId: '', overs: 0, maidens: 0, runs: 0, wickets: 0, wd: 0, nb: 0, is_hero: false })),
    2: Array(2).fill(null).map(() => ({ playerId: '', overs: 0, maidens: 0, runs: 0, wickets: 0, wd: 0, nb: 0, is_hero: false })),
  });

  const updateBowlingRow = (inn: 1 | 2, idx: number, field: string, value: any) => {
    setBowlingRows(prev => {
      const updated = prev[inn].map((r, i) => i === idx ? { ...r, [field]: value } : r);
      return { ...prev, [inn]: updated };
    });
  };

  const addBowlingRow = (inn: 1 | 2) => {
    setBowlingRows(prev => ({
        ...prev,
        [inn]: [...prev[inn], { playerId: '', overs: 0, maidens: 0, runs: 0, wickets: 0, wd: 0, nb: 0, is_hero: false }]
    }));
  };

  const autoWides = (inn: 1 | 2) => bowlingRows[inn].reduce((s, r) => s + (Number(r.wd) || 0), 0);
  const autoNoBalls = (inn: 1 | 2) => bowlingRows[inn].reduce((s, r) => s + (Number(r.nb) || 0), 0);

  const liveTotal = (inn: 1 | 2) => {
    const innKey = inn === 1 ? 'innings1' : 'innings2';
    const battingRuns = scorecard[innKey].batting.reduce((s, b) => s + (b.runs || 0), 0);
    const extrasTotal = (scorecard[innKey].extras.legByes || 0) + (scorecard[innKey].extras.byes || 0)
      + autoWides(inn) + autoNoBalls(inn);
    return battingRuns + extrasTotal;
  };

  const homeSquad = players.filter(p =>
    Array.isArray(match.homeTeamXI) && match.homeTeamXI.length > 0 ? match.homeTeamXI.includes(p.id) : true
  );
  const awaySquad = (opponent?.players || []).filter(p =>
    Array.isArray(match.opponentTeamXI) && match.opponentTeamXI.length > 0 ? match.opponentTeamXI.includes(p.id) : true
  );

  const battingSquad = activeInnings === 1
    ? (innings1BattingTeam === 'home' ? homeSquad : awaySquad)
    : (innings1BattingTeam === 'home' ? awaySquad : homeSquad);

  const bowlingSquad = activeInnings === 1
    ? (innings1BattingTeam === 'home' ? awaySquad : homeSquad)
    : (innings1BattingTeam === 'home' ? homeSquad : awaySquad);

  React.useEffect(() => {
    if (battingRowIds[activeInnings].length === 0) {
        setBattingRowIds(prev => ({
            ...prev,
            [activeInnings]: ['', '']
        }));
    }
  }, [activeInnings]);

  const updateBattingRowId = (inn: 1 | 2, idx: number, newId: string) => {
    setBattingRowIds(prev => {
        const updated = [...prev[inn]];
        updated[idx] = newId;
        return { ...prev, [inn]: updated };
    });
  };

  const addBattingRow = (inn: 1 | 2, playerId: string) => {
    if (!playerId) return;
    setBattingRowIds(prev => ({
        ...prev,
        [inn]: [...new Set([...prev[inn], playerId])]
    }));
  };

  const updateBatting = (inn: 1 | 2, pId: string, name: string, field: string, value: any) => {
    if (!pId) return;
    setScorecard(prev => {
      const key = inn === 1 ? 'innings1' : 'innings2';
      const existing = prev[key].batting.find(b => b.playerId === pId);
      let newBatting = [...prev[key].batting];
      if (existing) {
        newBatting = newBatting.map(b => b.playerId === pId ? { ...b, [field]: value } : b);
      } else {
        newBatting.push({ playerId: pId, name, runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Not Out', is_hero: false, [field]: value });
      }
      return { ...prev, [key]: { ...prev[key], batting: newBatting } };
    });
  };

  const updateExtras = (inn: 1 | 2, field: string, value: number) => {
    setScorecard(prev => {
      const key = inn === 1 ? 'innings1' : 'innings2';
      return { ...prev, [key]: { ...prev[key], extras: { ...prev[key].extras, [field]: value } } };
    });
  };

  const getBattingEntry = (inn: 1 | 2, pId: string) =>
    scorecard[inn === 1 ? 'innings1' : 'innings2'].batting.find(b => b.playerId === pId)
    || { runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Not Out', is_hero: false };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const buildBatting = (inn: 1 | 2) => {
        const innKey = inn === 1 ? 'innings1' : 'innings2';
        const squad = inn === 1 
            ? (innings1BattingTeam === 'home' ? homeSquad : awaySquad)
            : (innings1BattingTeam === 'home' ? awaySquad : homeSquad);
        return squad.map(p => {
             const entry = scorecard[innKey].batting.find(b => b.playerId === p.id);
             if (entry) return entry;
             return { playerId: p.id, name: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Did Not Bat', is_hero: false };
        });
    };
    const buildBowling = (inn: 1 | 2) => bowlingRows[inn]
      .filter(r => r.playerId)
      .map(r => {
        const p = [...homeSquad, ...awaySquad].find(p => p.id === r.playerId);
        return {
          playerId: r.playerId,
          name: p?.name || '',
          overs: parseFloat(String(r.overs)) || 0,
          maidens: parseInt(String(r.maidens)) || 0,
          runsConceded: parseInt(String(r.runs)) || 0,
          wickets: parseInt(String(r.wickets)) || 0,
          wides: parseInt(String(r.wd)) || 0,
          no_balls: parseInt(String(r.nb)) || 0,
          is_hero: !!r.is_hero,
        };
      });

    const finalScorecard = {
      innings1: { ...scorecard.innings1, batting: buildBatting(1), bowling: buildBowling(1), extras: { ...scorecard.innings1.extras, wide: autoWides(1), no_ball: autoNoBalls(1) } },
      innings2: { ...scorecard.innings2, batting: buildBatting(2), bowling: buildBowling(2), extras: { ...scorecard.innings2.extras, wide: autoWides(2), no_ball: autoNoBalls(2) } },
    };

    const performerMap = new Map<string, any>();
    const homeInningsKey = innings1BattingTeam === 'home' ? 'innings1' : 'innings2';
    const homeBowlingKey = innings1BattingTeam === 'home' ? 'innings2' : 'innings1';

    finalScorecard[homeInningsKey].batting.forEach(b => {
      performerMap.set(b.playerId, { playerId: b.playerId, playerName: b.name, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, isNotOut: b.outHow === 'Not Out', is_hero: !!b.is_hero, wickets: 0, bowlingRuns: 0, bowlingOvers: 0, maidens: 0, wides: 0, no_balls: 0 });
    });
    finalScorecard[homeBowlingKey].bowling.forEach(b => {
      const ex = performerMap.get(b.playerId) || { playerId: b.playerId, playerName: b.name, runs: 0, balls: 0, fours: 0, sixes: 0, isNotOut: false, is_hero: false, wickets: 0, bowlingRuns: 0, bowlingOvers: 0, maidens: 0, wides: 0, no_balls: 0 };
      performerMap.set(b.playerId, { 
        ...ex, 
        wickets: b.wickets, 
        bowlingRuns: b.runsConceded, 
        bowlingOvers: b.overs, 
        maidens: b.maidens,
        wides: b.wides || 0,
        no_balls: b.no_balls || 0,
        is_hero: ex.is_hero || !!b.is_hero 
      });
    });

    const diff = Math.abs(homeScore.runs - awayScore.runs);
    const resultSummary = resultType === 'Abandoned' ? 'Match Abandoned'
      : resultType === 'Tie' ? 'Match Tied'
        : resultType === 'Forfeit-Home' ? `${opponentName} won (Indian Strikers Forfeit)`
          : resultType === 'Forfeit-Away' ? `Indian Strikers won (${opponentName} Forfeit)`
            : homeScore.runs > awayScore.runs ? `Indian Strikers won by ${diff} runs`
              : awayScore.runs > homeScore.runs ? `${opponentName} won by ${diff} runs`
                : 'Match Tied';

    onSubmit({
      finalScoreHome: homeScore,
      finalScoreAway: awayScore,
      resultNote: resultSummary,
      resultSummary,
      scorecard: finalScorecard,
      performers: Array.from(performerMap.values()),
      isLiveScored: false,
      toss: { winner: tossWinner, choice: tossChoice },
      maxOvers,
    });
  };

  const inn1BatLabel = innings1BattingTeam === 'home' ? 'Indian Strikers' : opponentName;
  const inn2BatLabel = innings1BattingTeam === 'home' ? opponentName : 'Indian Strikers';
  const homeTeamBattingInnings = innings1BattingTeam === 'home' ? 1 : 2;
  const currentBatLabel = activeInnings === 1 ? inn1BatLabel : inn2BatLabel;
  const currentBowlLabel = activeInnings === 1 ? inn2BatLabel : inn1BatLabel;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/85 backdrop-blur-sm">
      <div className="bg-[#020617] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[96vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-900/40 to-transparent shrink-0">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="text-sky-400" size={18} /> Match Scorecard Entry
            </h2>
            <p className="text-slate-400 text-[11px]">vs {opponentName} · {match.matchFormat || 'T20'} · Max {maxOvers} overs</p>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <style>{`
          .compact-input { background:#000; border:1px solid #334155; color:#38bdf8; width:35px; text-align:center; font-size:12px; border-radius:3px; padding:2px; }
          .player-select-dropdown { background:#0f172a; border:1px solid #334155; color:white; font-size:12px; padding:3px; width:100%; border-radius:4px; }
          .hero-star { transition: all 0.2s; cursor: pointer; }
          .hero-star.active { color: #0ea5e9; fill: #0ea5e9; }
          .compact-score-table { width:100%; border-collapse:collapse; }
          .compact-score-table th { font-size:10px; color:#64748b; padding:4px; text-align:center; border-bottom:1px solid #1e293b; text-transform:uppercase; font-weight:700; white-space:nowrap; }
          .compact-score-table td { padding:2px 4px; border-bottom:1px solid rgba(255,255,255,0.02); vertical-align:middle; }
        `}</style>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Toss Won By</label>
              <div className="flex gap-2 mt-1">
                {['Indian Strikers', opponentName].map(team => (
                  <button key={team} type="button" onClick={() => setTossWinner(team)}
                    className={`flex-1 py-1 px-3 rounded-lg text-[11px] font-black border ${tossWinner === team ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' : 'bg-white/[0.02] border-white/10 text-white'}`}
                  >{team === 'Indian Strikers' ? 'Home' : 'Away'}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Chose To</label>
              <div className="flex gap-2 mt-1">
                {(['Bat', 'Field'] as const).map(c => (
                  <button key={c} type="button" onClick={() => setTossChoice(c)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-black border ${tossChoice === c ? 'bg-blue-600/30 border-blue-500/50 text-blue-300' : 'bg-white/[0.02] border-white/10 text-white'}`}
                  >{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Max Overs</label>
              <select title="Select Max Overs" value={maxOvers} onChange={e => setMaxOvers(parseInt(e.target.value))} className="w-full mt-1 bg-[#0f172a] border border-white/10 rounded-lg py-1 px-2 text-white text-[12px]">
                {overOptions.map(o => <option key={o} value={o}>{o} Overs</option>)}
              </select>
            </div>
          </div>
          <div className="flex bg-white/[0.04] p-0.5 rounded-xl border border-white/5">
            {[1, 2].map(i => (
              <button key={i} type="button" onClick={() => setActiveInnings(i as 1 | 2)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase ${activeInnings === i ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400'}`}>
                Innings {i}: {i === 1 ? inn1BatLabel : inn2BatLabel}
              </button>
            ))}
          </div>
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-[0_1_55%] w-full rounded-xl bg-white/[0.01] border border-white/5">
              <div className="px-4 py-2 border-b border-white/5 font-black text-[10px] uppercase tracking-wider text-white">Batting: {currentBatLabel}</div>
              <table className="compact-score-table">
                <thead><tr><th className="text-left pl-4">Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>Out</th></tr></thead>
                <tbody>
                  {battingRowIds[activeInnings].map((pId, idx) => {
                    const entry = getBattingEntry(activeInnings, pId);
                    const p = battingSquad.find(pl => pl.id === pId);
                    return (
                      <tr key={idx}>
                        <td className="pl-4">
                          <div className="flex items-center gap-2">
                            <button title="Toggle Hero Performance" type="button" onClick={() => updateBatting(activeInnings, pId, p?.name || '', 'is_hero', !entry.is_hero)}
                              className={`hero-star ${entry.is_hero ? 'active' : 'text-slate-600'}`} disabled={!pId}><Star size={14} fill={entry.is_hero ? "currentColor" : "none"} /></button>
                            <select title="Select Batter" className="player-select-dropdown" value={pId} onChange={e => { updateBattingRowId(activeInnings, idx, e.target.value); if (e.target.value) { const s = battingSquad.find(pl => pl.id === e.target.value); if (s) updateBatting(activeInnings, s.id, s.name, 'runs', entry.runs); } }}>
                              <option value="">- Select Batter -</option>
                              {battingSquad.map(pl => <option key={pl.id} value={pl.id} disabled={battingRowIds[activeInnings].includes(pl.id) && pl.id !== pId}>{pl.name}</option>)}
                            </select>
                          </div>
                        </td>
                        <td><input title="Runs" placeholder="0" type="number" className="compact-input" value={entry.runs} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'runs', e.target.valueAsNumber || 0)} /></td>
                        <td><input title="Balls" placeholder="0" type="number" className="compact-input" value={entry.balls} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'balls', e.target.valueAsNumber || 0)} /></td>
                        <td><input title="Fours" placeholder="0" type="number" className="compact-input" value={entry.fours} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'fours', e.target.valueAsNumber || 0)} /></td>
                        <td><input title="Sixes" placeholder="0" type="number" className="compact-input" value={entry.sixes} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'sixes', e.target.valueAsNumber || 0)} /></td>
                        <td><select title="Wicket Type" className="player-select-dropdown" style={{ width: '90px' }} value={entry.outHow} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'outHow', e.target.value)}>
                          {['Not Out', 'Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Did Not Bat', 'Hit Wicket', 'Retired Hurt', 'Retired Out'].map(o => <option key={o}>{o}</option>)}
                        </select></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-3 border-t border-white/5">
                <button type="button" onClick={() => setBattingRowIds(prev => ({ ...prev, [activeInnings]: [...prev[activeInnings], ''] }))} className="text-[10px] text-sky-400 font-black">+ ADD BATSMAN</button>
              </div>
            </div>
            <div className="flex-[0_1_40%] w-full rounded-xl bg-white/[0.01] border border-white/5">
              <div className="px-4 py-2 border-b border-white/5 font-black text-[10px] uppercase tracking-wider text-white">Bowling: {currentBowlLabel}</div>
              <table className="compact-score-table">
                <thead><tr><th className="text-left pl-4">Bowler</th><th>O</th><th>R</th><th>W</th></tr></thead>
                <tbody>
                  {bowlingRows[activeInnings].map((row, idx) => (
                    <tr key={idx}>
                      <td className="pl-4"><select title="Select Bowler" className="player-select-dropdown" value={row.playerId} onChange={e => updateBowlingRow(activeInnings, idx, 'playerId', e.target.value)}>
                        <option value="">- Select -</option>
                        {bowlingSquad.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                      </select></td>
                      <td><input title="Overs" placeholder="0.0" type="number" step="0.1" className="compact-input" value={row.overs} onChange={e => updateBowlingRow(activeInnings, idx, 'overs', e.target.valueAsNumber || 0)} /></td>
                      <td><input title="Runs" placeholder="0" type="number" className="compact-input" value={row.runs} onChange={e => updateBowlingRow(activeInnings, idx, 'runs', e.target.valueAsNumber || 0)} /></td>
                      <td><input title="Wickets" placeholder="0" type="number" className="compact-input" value={row.wickets} onChange={e => updateBowlingRow(activeInnings, idx, 'wickets', e.target.valueAsNumber || 0)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 border-t border-white/5">
                <button type="button" onClick={() => addBowlingRow(activeInnings)} className="text-[10px] text-sky-400 font-black">+ ADD BOWLER</button>
              </div>
            </div>
          </div>
          <div className="p-3 bg-white/[0.05] rounded-xl border border-white/5 flex gap-4 text-[11px] font-black text-slate-400 items-center">
            <span>BYES: <input title="Byes" placeholder="0" type="number" className="compact-input" value={scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras.byes} onChange={e => updateExtras(activeInnings as 1 | 2, 'byes', e.target.valueAsNumber || 0)} /></span>
            <span>LEGBYES: <input title="Leg Byes" placeholder="0" type="number" className="compact-input" value={scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras.legByes} onChange={e => updateExtras(activeInnings as 1 | 2, 'legByes', e.target.valueAsNumber || 0)} /></span>
            <span className="ml-auto text-sky-400">TOTAL: {liveTotal(activeInnings)}</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-white/5 text-white py-3 rounded-xl font-bold">Cancel</button>
            <button type="submit" className="flex-[2] bg-blue-700 text-white py-3 rounded-xl font-black shadow-lg">SYNC SCORECARD</button>
          </div>
        </form>
      </div>
    </div>
  );
}
