import React, { useState, useMemo } from 'react';
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
    extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 },
    totalRuns: 0, totalWickets: 0, totalOvers: 0,
    history: []
  };

  const [scorecard, setScorecard] = useState<FullScorecardData>({
    innings1: { ...initialInnings },
    innings2: { ...initialInnings },
  });

  const [battingRowIds, setBattingRowIds] = useState<Record<1 | 2, string[]>>({
    1: [],
    2: []
  });

  const [bowlingRows, setBowlingRows] = useState<Record<1 | 2, any[]>>({
    1: Array(2).fill(null).map(() => ({ playerId: '', overs: '', maidens: '', runs: '', wickets: '', wd: '', nb: '', is_hero: false })),
    2: Array(2).fill(null).map(() => ({ playerId: '', overs: '', maidens: '', runs: '', wickets: '', wd: '', nb: '', is_hero: false })),
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
        [inn]: [...prev[inn], { playerId: '', overs: '', maidens: '', runs: '', wickets: '', wd: '', nb: '', is_hero: false }]
    }));
  };

  const autoWides = (inn: 1 | 2) => bowlingRows[inn].reduce((s, r) => s + (parseInt(r.wd) || 0), 0);
  const autoNoBalls = (inn: 1 | 2) => bowlingRows[inn].reduce((s, r) => s + (parseInt(r.nb) || 0), 0);

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
      .map(r => ({
        playerId: r.playerId,
        name: [...homeSquad, ...awaySquad].find((p: { id: string }) => p.id === r.playerId)?.name || '',
        overs: parseFloat(r.overs) || 0,
        maidens: parseInt(r.maidens) || 0,
        runsConceded: parseInt(r.runs) || 0,
        wickets: parseInt(r.wickets) || 0,
        wides: parseInt(r.wd) || 0,
        no_balls: parseInt(r.nb) || 0,
        is_hero: !!r.is_hero,
      }));

    const finalScorecard = {
      innings1: { ...scorecard.innings1, batting: buildBatting(1), bowling: buildBowling(1), extras: { ...scorecard.innings1.extras, wide: autoWides(1), no_ball: autoNoBalls(1) } },
      innings2: { ...scorecard.innings2, batting: buildBatting(2), bowling: buildBowling(2), extras: { ...scorecard.innings2.extras, wide: autoWides(2), no_ball: autoNoBalls(2) } },
    };

    const performerMap = new Map<string, any>();
    const homeInningsKey = innings1BattingTeam === 'home' ? 'innings1' : 'innings2';
    const homeBowlingKey = innings1BattingTeam === 'home' ? 'innings2' : 'innings1';

    finalScorecard[homeInningsKey].batting.forEach(b => {
      performerMap.set(b.playerId, { playerId: b.playerId, playerName: b.name, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, isNotOut: b.outHow === 'Not Out', is_hero: b.is_hero, wickets: 0, bowlingRuns: 0, bowlingOvers: 0, maidens: 0 });
    });
    finalScorecard[homeBowlingKey].bowling.forEach(b => {
      const ex = performerMap.get(b.playerId) || { playerId: b.playerId, playerName: b.name, runs: 0, balls: 0, fours: 0, sixes: 0, isNotOut: false, is_hero: false };
      performerMap.set(b.playerId, { ...ex, wickets: b.wickets, bowlingRuns: b.runsConceded, bowlingOvers: b.overs, maidens: b.maidens, is_hero: ex.is_hero || b.is_hero });
    });

    const diff = Math.abs(homeScore.runs - awayScore.runs);
    const autoResult = resultType === 'Abandoned' ? 'Match Abandoned'
      : resultType === 'Tie' ? 'Match Tied'
        : resultType === 'Forfeit-Home' ? ${opponentName} won (Indian Strikers Forfeit)
          : resultType === 'Forfeit-Away' ? Indian Strikers won ( Forfeit)
            : homeScore.runs > awayScore.runs ? Indian Strikers won by  runs
              : awayScore.runs > homeScore.runs ? ${opponentName} won by  runs
                : 'Match Tied';

    onSubmit({
      finalScoreHome: homeScore,
      finalScoreAway: awayScore,
      resultNote: autoResult,
      resultSummary: autoResult,
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
    <>
      <style>{
        .si { background:#0f172a; border:1px solid rgba(255,255,255,0.12); color:#f8fafc; font-size:12px; padding:3px 6px; border-radius:4px; width:52px; text-align:center; }
        .si:focus { border-color:#38bdf8; outline:none; }
        .si-sm { width:42px; }
        .si-ro { background:#090e1a; border:1px solid rgba(255,255,255,0.05); color:#475569; font-size:12px; padding:3px 6px; border-radius:4px; width:52px; text-align:center; cursor:not-allowed; }
        .ps { background:#0f172a; border:1px solid rgba(255,255,255,0.12); color:#f8fafc; font-size:11px; padding:3px 6px; border-radius:4px; min-width:110px; }
        .ps:focus { border-color:#38bdf8; outline:none; }
        .th { font-size:9px; font-weight:900; color:#475569; text-transform:uppercase; letter-spacing:.08em; padding:8px 4px 6px; white-space:nowrap; }
        .td { padding:4px; border-bottom:1px solid rgba(255,255,255,0.04); }
        .hero-star { transition: all 0.2s; cursor: pointer; }
        .hero-star:hover { transform: scale(1.2); }
        .hero-star.active { color: #0ea5e9; fill: #0ea5e9; filter: drop-shadow(0 0 5px rgba(14, 165, 233, 0.4)); }
        .compact-modal-body { padding: 12px !important; max-height: 85vh; overflow-y: auto; }
        .scorecard-header-summary { display:flex; justify-content:space-between; align-items:center; background:#0f172a; padding:10px 20px; border-radius:8px; margin-bottom:12px; border-left:5px solid #0ea5e9; }
        .scorecard-header-summary .team-name { font-size:11px; font-weight:900; color:#9ca3af; text-transform:uppercase; letter-spacing:.08em; }
        .scorecard-header-summary .team-score { font-size:22px; font-weight:900; color:#fff; line-height:1; }
        .scorecard-header-summary .vs-divider { font-size:10px; font-weight:900; color:#374151; background:#111827; padding:4px 10px; border-radius:4px; }
        .compact-score-table { width:100%; border-collapse:collapse; margin-bottom:8px; }
        .compact-score-table th { font-size:10px; color:#64748b; padding:4px; text-align:center; border-bottom:1px solid #1e293b; font-weight:700; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
        .compact-score-table td { padding:2px 4px; border-bottom:1px solid rgba(255,255,255,0.02); vertical-align:middle; }
        .compact-score-table td:first-child { text-align:left; font-size:12px; font-weight:700; color:#f8fafc; padding-left:8px; white-space:nowrap; }
        .compact-input { background:#000; border:1px solid #334155; color:#38bdf8; width:35px; text-align:center; font-size:12px; border-radius:3px; padding:2px; }
        .compact-input:focus { border-color:#38bdf8; outline:none; }
        .compact-input-ro { background:#050505; border:1px solid #1e293b; color:#334155; width:35px; text-align:center; font-size:12px; border-radius:3px; padding:2px; cursor:not-allowed; }
        .compact-input-wide { width:52px; }
        .player-select-dropdown { background:#0f172a; border:1px solid #334155; color:white; font-size:12px; padding:3px; width:100%; border-radius:4px; }
        .player-select-dropdown:focus { border-color:#38bdf8; outline:none; }
        .dismissal-select { background:#0f172a; border:1px solid #334155; color:white; font-size:11px; padding:3px 4px; border-radius:4px; min-width:90px; }
        .dismissal-select:focus { border-color:#38bdf8; outline:none; }
        .auto-extras-box { background:rgba(14,165,233,0.1); border:1px solid #0ea5e9; padding:8px 14px; border-radius:6px; display:flex; flex-wrap:wrap; gap:15px; font-size:11px; color:#7dd3fc; align-items:center; }
        .auto-extras-box .extras-field { display:flex; align-items:center; gap:5px; }
        .auto-extras-box .extras-label { font-size:10px; font-weight:700; text-transform:uppercase; color:#38bdf8; }
        .read-only-val { font-weight:bold; color:#fff; margin-left:5px; }
        .auto-extras-box .extras-total { margin-left:auto; display:flex; align-items:center; gap:8px; }
        .auto-extras-box .extras-total-val { font-size: 13px; font-weight: 900; color: #fff; }
      }</style>
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
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="compact-modal-body space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Toss Won By</label>
                  <div className="flex gap-2">
                    {['Indian Strikers', opponentName].map(team => (
                      <button key={team} type="button" onClick={() => setTossWinner(team)}
                        className={lex-1 py-1.5 px-3 rounded-lg text-[11px] font-black border transition-all }
                      >{team === 'Indian Strikers' ? 'Home' : team.split(' ')[0]}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chose To</label>
                  <div className="flex gap-2">
                    {(['Bat', 'Field'] as const).map(c => (
                      <button key={c} type="button" onClick={() => setTossChoice(c)}
                        className={lex-1 py-1.5 rounded-lg text-[11px] font-black border transition-all }
                      >{c}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max Overs</label>
                  <div className="relative">
                    <select value={maxOvers} onChange={e => setMaxOvers(parseInt(e.target.value))} title="Max overs"
                      className="w-full bg-[#0f172a] border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-white text-[12px] font-black focus:border-sky-500 outline-none appearance-none">
                      {overOptions.map(o => <option key={o} value={o}>{o} Overs</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="scorecard-header-summary">
                <div style={{ textAlign: 'center' }}>
                  <div className="team-name">Indian Strikers</div>
                  <div className="team-score" style={{ color: '#38bdf8' }}>{liveTotal(homeTeamBattingInnings)}<span style={{ fontSize: '14px', color: '#475569' }}>/{homeScore.wickets}</span></div>
                </div>
                <div className="vs-divider">VS</div>
                <div style={{ textAlign: 'center' }}>
                  <div className="team-name">{opponentName}</div>
                  <div className="team-score" style={{ color: '#7dd3fc' }}>{liveTotal(homeTeamBattingInnings === 1 ? 2 : 1)}<span style={{ fontSize: '14px', color: '#475569' }}>/{awayScore.wickets}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[9px] font-black text-sky-400 uppercase tracking-widest mb-1.5">Home - Edit Totals</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Runs', 'runs'], ['Wkts', 'wickets'], ['Overs', 'overs']].map(([label, field]) => (
                      <div key={field}>
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-0.5">{label}</div>
                        <input type="number" step={field === 'overs' ? 0.1 : 1} title={Home } className="compact-input compact-input-wide"
                          value={(homeScore as any)?.[field] || 0} onChange={e => setHomeScore({ ...homeScore, [field]: e.target.valueAsNumber || 0 })} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Away - Edit Totals</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Runs', 'runs'], ['Wkts', 'wickets'], ['Overs', 'overs']].map(([label, field]) => (
                      <div key={field}>
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-0.5">{label}</div>
                        <input type="number" step={field === 'overs' ? 0.1 : 1} title={Away } className="compact-input compact-input-wide"
                          value={(awayScore as any)?.[field] || 0} onChange={e => setAwayScore({ ...awayScore, [field]: e.target.valueAsNumber || 0 })} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex bg-white/[0.04] p-0.5 rounded-xl border border-white/5 shadow-inner">
                {([1, 2] as const).map(i => (
                  <button key={i} type="button" onClick={() => setActiveInnings(i)}
                    className={lex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all }>
                    Innings {i}
                  </button>
                ))}
              </div>
              <div className="flex flex-col xl:flex-row gap-6 justify-center items-start w-full max-w-6xl mx-auto">
                <div className="flex-[0_1_55%] w-full rounded-xl bg-white/[0.01] border border-white/5 overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-slate-900/40">
                    <Target size={12} className="text-sky-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">{currentBatLabel} - Batting</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="compact-score-table">
                      <thead><tr><th style={{ textAlign: 'left', paddingLeft: '8px' }}>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>Status</th></tr></thead>
                      <tbody>
                        {battingRowIds[activeInnings].map((pId, idx) => {
                          const entry = getBattingEntry(activeInnings, pId);
                          const p = battingSquad.find(pl => pl.id === pId);
                          return (
                            <tr key={idx}>
                              <td style={{ paddingLeft: '8px' }}>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => updateBatting(activeInnings, pId, p?.name || '', 'is_hero', !entry.is_hero)}
                                    className={hero-star } disabled={!pId}><Star size={14} fill={entry.is_hero ? "currentColor" : "none"} /></button>
                                  <select title="Select" className="player-select-dropdown" value={pId} onChange={e => { updateBattingRowId(activeInnings, idx, e.target.value); if (e.target.value) { const s = battingSquad.find(pl => pl.id === e.target.value); if (s) updateBatting(activeInnings, s.id, s.name, 'runs', entry.runs); } }}>
                                    <option value="">- Select -</option>
                                    {battingSquad.map(pl => <option key={pl.id} value={pl.id} disabled={battingRowIds[activeInnings].includes(pl.id) && pl.id !== pId}>{pl.name}</option>)}
                                  </select>
                                </div>
                              </td>
                              <td><input type="number" title="R" className="compact-input" value={entry.runs} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'runs', e.target.valueAsNumber || 0)} /></td>
                              <td><input type="number" title="B" className="compact-input" value={entry.balls} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'balls', e.target.valueAsNumber || 0)} /></td>
                              <td><input type="number" title="4" className="compact-input" value={entry.fours} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'fours', e.target.valueAsNumber || 0)} /></td>
                              <td><input type="number" title="6" className="compact-input" value={entry.sixes} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'sixes', e.target.valueAsNumber || 0)} /></td>
                              <td><select title="Out" className="dismissal-select" value={entry.outHow} disabled={!pId} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'outHow', e.target.value)}>
                                {['Not Out', 'Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Did Not Bat', 'Hit Wicket', 'Retired Hurt', 'Retired Out'].map(o => <option key={o}>{o}</option>)}
                              </select></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between gap-4">
                      <select title="Add" className="flex-1 player-select-dropdown max-w-[200px]" onChange={e => { if (e.target.value) { addBattingRow(activeInnings, e.target.value); e.target.value = ""; } }}>
                        <option value="">+ ADD BATSMAN</option>
                        {battingSquad.filter(p => !battingRowIds[activeInnings].includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex-[0_1_40%] w-full rounded-xl bg-white/[0.01] border border-white/5 overflow-hidden">
                  <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-slate-900/40"><Zap size={12} className="text-sky-400" /> Bowling</div>
                  <table className="compact-score-table">
                    <thead><tr><th style={{ textAlign: 'left', paddingLeft: '8px' }}>Bowler</th><th>O</th><th>R</th><th>W</th></tr></thead>
                    <tbody>
                      {bowlingRows[activeInnings].map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ paddingLeft: '8px' }}><select title="Bowler" className="player-select-dropdown" value={row.playerId} onChange={e => updateBowlingRow(activeInnings, idx, 'playerId', e.target.value)}>
                            <option value="">- Select -</option>
                            {bowlingSquad.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select></td>
                          <td><input type="number" step="0.1" title="O" className="compact-input" value={row.overs} onChange={e => updateBowlingRow(activeInnings, idx, 'overs', e.target.valueAsNumber || 0)} /></td>
                          <td><input type="number" title="R" className="compact-input" value={row.runs} onChange={e => updateBowlingRow(activeInnings, idx, 'runs', e.target.valueAsNumber || 0)} /></td>
                          <td><input type="number" title="W" className="compact-input" value={row.wickets} onChange={e => updateBowlingRow(activeInnings, idx, 'wickets', e.target.valueAsNumber || 0)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5"><button type="button" onClick={() => addBowlingRow(activeInnings)} className="text-[10px] font-black text-sky-400 uppercase tracking-widest">+ ADD BOWLER</button></div>
                </div>
              </div>
              <div className="auto-extras-box">
                <div className="extras-field"><span className="extras-label">WIDE</span><span className="read-only-val">{autoWides(activeInnings)}</span></div>
                <div className="extras-field"><span className="extras-label">NB</span><span className="read-only-val">{autoNoBalls(activeInnings)}</span></div>
                <div className="extras-total"><span className="extras-label">TOTAL EXTRAS</span><span className="extras-total-val">{autoWides(activeInnings) + autoNoBalls(activeInnings) + (scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras.legByes || 0) + (scorecard[activeInnings === 1 ? 'innings2' : 'innings1'].extras.byes || 0)}</span></div>
              </div>
            </div>
            <div className="px-4 py-3 bg-white/[0.03] border-t border-white/5 flex gap-3 shrink-0">
              <button type="button" onClick={onClose} className="flex-1 bg-white/5 text-white py-3 rounded-xl">Cancel</button>
              <button type="submit" className="flex-[2] bg-blue-800 text-white font-black py-3 rounded-xl shadow-lg border border-blue-700">SYNC SCORECARD</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
