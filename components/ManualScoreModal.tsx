import React, { useState, useMemo } from 'react';
import { X, Save, Award, Zap, Target, ChevronDown } from 'lucide-react';
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
  { value: 'Abandoned', label: '☁️ Abandoned' },
  { value: 'Tie', label: '🤝 Tie' },
  { value: 'Forfeit-Home', label: '🏳️ Forfeit (Indian Strikers)' },
  { value: 'Forfeit-Away', label: '🏳️ Forfeit (Opponent)' },
];

export default function ManualScoreModal({ match, opponent, players = [], onClose, onSubmit }: ManualScoreModalProps) {
  const opponentName = opponent?.name || 'Opponent';

  // ─── Toss & Context State ───────────────────────────────────────────────────
  const [tossWinner, setTossWinner] = useState<string>('Indian Strikers');
  const [tossChoice, setTossChoice] = useState<'Bat' | 'Field'>('Bat');
  const [maxOvers, setMaxOvers] = useState<number>(match.matchFormat === 'One Day' ? 50 : 20);
  const [resultType, setResultType] = useState('');

  // Derived: who bats in Innings 1 (logic-driven)
  const innings1BattingTeam: 'home' | 'away' = useMemo(() => {
    const homeWon = tossWinner === 'Indian Strikers';
    if ((homeWon && tossChoice === 'Bat') || (!homeWon && tossChoice === 'Field')) return 'home';
    return 'away';
  }, [tossWinner, tossChoice]);

  const overOptions = match.matchFormat === 'One Day'
    ? [50, 40, 35, 30, 25, 20]
    : [20, 15, 12, 10, 8, 5];

  // ─── Score State ────────────────────────────────────────────────────────────
  const [homeScore, setHomeScore] = useState(match.finalScoreHome || { runs: 0, wickets: 0, overs: 0 });
  const [awayScore, setAwayScore] = useState(match.finalScoreAway || { runs: 0, wickets: 0, overs: 0 });
  const [activeInnings, setActiveInnings] = useState<1 | 2>(1);

  const initialInnings: InningsData = {
    batting: [],
    bowling: [],
    extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 },
    totalRuns: 0, totalWickets: 0, totalOvers: 0,
  };

  const [scorecard, setScorecard] = useState<FullScorecardData>({
    innings1: { ...initialInnings },
    innings2: { ...initialInnings },
  });

  // ─── Bowling rows state: separate from scorecard for WD/NB/DOTS columns ────
  // bowlingRows[inn][idx] = { playerId, overs, maidens, runs, wickets, wd, nb }
  const [bowlingRows, setBowlingRows] = useState<Record<1 | 2, any[]>>({
    1: Array(6).fill(null).map(() => ({ playerId: '', overs: '', maidens: '', runs: '', wickets: '', wd: '', nb: '' })),
    2: Array(6).fill(null).map(() => ({ playerId: '', overs: '', maidens: '', runs: '', wickets: '', wd: '', nb: '' })),
  });

  const updateBowlingRow = (inn: 1 | 2, idx: number, field: string, value: any) => {
    setBowlingRows(prev => {
      const updated = prev[inn].map((r, i) => i === idx ? { ...r, [field]: value } : r);
      return { ...prev, [inn]: updated };
    });
  };

  // ─── Auto-calculated Extras from Bowling ───────────────────────────────────
  const autoWides = (inn: 1 | 2) => bowlingRows[inn].reduce((s, r) => s + (parseInt(r.wd) || 0), 0);
  const autoNoBalls = (inn: 1 | 2) => bowlingRows[inn].reduce((s, r) => s + (parseInt(r.nb) || 0), 0);

  // ─── Live total from batting rows + extras ─────────────────────────────────
  const liveTotal = (inn: 1 | 2) => {
    const innKey = inn === 1 ? 'innings1' : 'innings2';
    const battingRuns = scorecard[innKey].batting.reduce((s, b) => s + (b.runs || 0), 0);
    const extrasTotal = (scorecard[innKey].extras.legByes || 0) + (scorecard[innKey].extras.byes || 0)
      + autoWides(inn) + autoNoBalls(inn);
    return battingRuns + extrasTotal;
  };

  // ─── Players & squads ───────────────────────────────────────────────────────
  const homeSquad = players.filter(p =>
    match.homeTeamXI && match.homeTeamXI.length > 0 ? match.homeTeamXI.includes(p.id) : true
  );
  const awaySquad: any[] = opponent?.players || [];

  // Batting players for current innings
  const battingSquad = activeInnings === 1
    ? (innings1BattingTeam === 'home' ? homeSquad : awaySquad)
    : (innings1BattingTeam === 'home' ? awaySquad : homeSquad);

  // Bowling players for current innings (opposite team bowls)
  const bowlingSquad = activeInnings === 1
    ? (innings1BattingTeam === 'home' ? awaySquad : homeSquad)
    : (innings1BattingTeam === 'home' ? homeSquad : awaySquad);

  // Which squad are the home team bowling in? (for career sync)
  const homeTeamBowlingInnings: 1 | 2 = innings1BattingTeam === 'home' ? 2 : 1;
  const homeTeamBattingInnings: 1 | 2 = innings1BattingTeam === 'home' ? 1 : 2;

  // ─── Update scorecard batting ────────────────────────────────────────────────
  const updateBatting = (inn: 1 | 2, pId: string, name: string, field: string, value: any) => {
    setScorecard(prev => {
      const key = inn === 1 ? 'innings1' : 'innings2';
      const existing = prev[key].batting.find(b => b.playerId === pId);
      let newBatting = [...prev[key].batting];
      if (existing) {
        newBatting = newBatting.map(b => b.playerId === pId ? { ...b, [field]: value } : b);
      } else {
        newBatting.push({ playerId: pId, name, runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Not Out', [field]: value });
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
    || { runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Not Out' };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build scorecard bowling from bowlingRows
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
      }));

    const finalScorecard = {
      innings1: { ...scorecard.innings1, bowling: buildBowling(1), extras: { ...scorecard.innings1.extras, wide: autoWides(1), no_ball: autoNoBalls(1) } },
      innings2: { ...scorecard.innings2, bowling: buildBowling(2), extras: { ...scorecard.innings2.extras, wide: autoWides(2), no_ball: autoNoBalls(2) } },
    };

    // Performer map for career sync
    const performerMap = new Map<string, any>();
    const homeBatting = finalScorecard[homeTeamBattingInnings === 1 ? 'innings1' : 'innings2'];
    const homeBowling = finalScorecard[homeTeamBowlingInnings === 1 ? 'innings1' : 'innings2'];

    homeBatting.batting.forEach(b => {
      performerMap.set(b.playerId, { playerId: b.playerId, playerName: b.name, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, isNotOut: b.outHow === 'Not Out', wickets: 0, bowlingRuns: 0, bowlingOvers: 0, maidens: 0 });
    });
    homeBowling.bowling.forEach(b => {
      const ex = performerMap.get(b.playerId) || { playerId: b.playerId, playerName: b.name, runs: 0, balls: 0, fours: 0, sixes: 0, isNotOut: false };
      performerMap.set(b.playerId, { ...ex, wickets: b.wickets, bowlingRuns: b.runsConceded, bowlingOvers: b.overs, maidens: b.maidens });
    });

    (match.homeTeamXI || []).forEach(pid => {
      if (!performerMap.has(pid)) {
        const p = players.find(pl => pl.id === pid);
        performerMap.set(pid, { playerId: pid, playerName: p?.name || '', runs: 0, balls: 0, fours: 0, sixes: 0, isNotOut: false, wickets: 0, bowlingRuns: 0, bowlingOvers: 0, maidens: 0 });
      }
    });

    const diff = Math.abs(homeScore.runs - awayScore.runs);
    const autoResult = resultType === 'Abandoned' ? 'Match Abandoned'
      : resultType === 'Tie' ? 'Match Tied'
        : resultType === 'Forfeit-Home' ? `${opponentName} won (Indian Strikers Forfeit)`
          : resultType === 'Forfeit-Away' ? `Indian Strikers won (${opponentName} Forfeit)`
            : homeScore.runs > awayScore.runs ? `Indian Strikers won by ${diff} runs`
              : awayScore.runs > homeScore.runs ? `${opponentName} won by ${diff} runs`
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

  // ─── Innings labels ─────────────────────────────────────────────────────────
  const inn1BatLabel = innings1BattingTeam === 'home' ? 'Indian Strikers' : opponentName;
  const inn2BatLabel = innings1BattingTeam === 'home' ? opponentName : 'Indian Strikers';
  const currentBatLabel = activeInnings === 1 ? inn1BatLabel : inn2BatLabel;
  const currentBowlLabel = activeInnings === 1 ? inn2BatLabel : inn1BatLabel;

  return (
    <>
      <style>{`
        /* ── Legacy compact aliases ── */
        .si { background:#0f172a; border:1px solid rgba(255,255,255,0.12); color:#f8fafc; font-size:12px; padding:3px 6px; border-radius:4px; width:52px; text-align:center; }
        .si:focus { border-color:#3b82f6; outline:none; }
        .si-sm { width:42px; }
        .si-ro { background:#090e1a; border:1px solid rgba(255,255,255,0.05); color:#475569; font-size:12px; padding:3px 6px; border-radius:4px; width:52px; text-align:center; cursor:not-allowed; }
        .ps { background:#0f172a; border:1px solid rgba(255,255,255,0.12); color:#f8fafc; font-size:11px; padding:3px 6px; border-radius:4px; min-width:110px; }
        .ps:focus { border-color:#3b82f6; outline:none; }
        .th { font-size:9px; font-weight:900; color:#475569; text-transform:uppercase; letter-spacing:.08em; padding:8px 4px 6px; white-space:nowrap; }
        .td { padding:4px; border-bottom:1px solid rgba(255,255,255,0.04); }

        /* ── Modal body ── */
        .compact-modal-body { padding: 15px !important; max-height: 85vh; overflow-y: auto; }

        /* ── Score header summary bar ── */
        .scorecard-header-summary { display:flex; justify-content:space-between; align-items:center; background:#1f2937; padding:10px 20px; border-radius:8px; margin-bottom:15px; border-left:5px solid #3b82f6; }
        .scorecard-header-summary .team-name { font-size:11px; font-weight:900; color:#9ca3af; text-transform:uppercase; letter-spacing:.08em; }
        .scorecard-header-summary .team-score { font-size:22px; font-weight:900; color:#fff; line-height:1; }
        .scorecard-header-summary .vs-divider { font-size:10px; font-weight:900; color:#374151; background:#111827; padding:4px 10px; border-radius:4px; }

        /* ── Compact tables ── */
        .compact-score-table { width:100%; border-collapse:collapse; margin-bottom:10px; }
        .compact-score-table th { font-size:10px; color:#6b7280; padding:4px; text-align:center; border-bottom:1px solid #374151; font-weight:700; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
        .compact-score-table td { padding:2px 4px; border-bottom:1px solid rgba(255,255,255,0.03); vertical-align:middle; }
        .compact-score-table td:first-child { text-align:left; font-size:12px; font-weight:700; color:#f9fafb; padding-left:8px; white-space:nowrap; }

        /* ── Inputs ── */
        .compact-input { background:#000; border:1px solid #4b5563; color:#10b981; width:35px; text-align:center; font-size:12px; border-radius:3px; padding:2px; }
        .compact-input:focus { border-color:#10b981; outline:none; }
        .compact-input-ro { background:#050505; border:1px solid #1f2937; color:#374151; width:35px; text-align:center; font-size:12px; border-radius:3px; padding:2px; cursor:not-allowed; }
        .compact-input-wide { width:52px; }

        /* ── Player dropdown ── */
        .player-select-dropdown { background:#111827; border:1px solid #374151; color:white; font-size:12px; padding:3px; width:100%; border-radius:4px; }
        .player-select-dropdown:focus { border-color:#3b82f6; outline:none; }

        /* ── Dismissal dropdown ── */
        .dismissal-select { background:#111827; border:1px solid #374151; color:white; font-size:11px; padding:3px 4px; border-radius:4px; min-width:90px; }
        .dismissal-select:focus { border-color:#3b82f6; outline:none; }

        /* ── Extras box ── */
        .auto-extras-box { background:rgba(59,130,246,0.1); border:1px solid #3b82f6; padding:8px 14px; border-radius:6px; display:flex; flex-wrap:wrap; gap:15px; font-size:11px; color:#93c5fd; align-items:center; }
        .auto-extras-box .extras-field { display:flex; align-items:center; gap:5px; }
        .auto-extras-box .extras-label { font-size:10px; font-weight:700; text-transform:uppercase; color:#60a5fa; }
        .read-only-val { font-weight:bold; color:#fff; margin-left:5px; }
        .auto-extras-box .extras-total { margin-left:auto; display:flex; align-items:center; gap:8px; }
        .auto-extras-box .extras-total-val { font-size:18px; font-weight:900; color:#fff; }
      `}</style>

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/85 backdrop-blur-sm">
        <div className="bg-[#1A1D21] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[96vh] overflow-hidden flex flex-col shadow-2xl">

          {/* ── Header ── */}
          <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent shrink-0">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Award className="text-blue-500" size={18} /> Match Scorecard Entry
              </h2>
              <p className="text-slate-400 text-[11px]">vs {opponentName} · {match.matchFormat || 'T20'} · Max {maxOvers} overs</p>
            </div>
            <button onClick={onClose} title="Close" className="p-1.5 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="compact-modal-body space-y-4">

              {/* ── SECTION 1: TOSS + OVERS CONTEXT ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Toss Won By</label>
                  <div className="flex gap-2">
                    {['Indian Strikers', opponentName].map(team => (
                      <button key={team} type="button"
                        onClick={() => setTossWinner(team)}
                        className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-black border transition-all ${tossWinner === team ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' : 'bg-white/[0.03] border-white/10 text-white hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-200'}`}
                      >{team === 'Indian Strikers' ? '🏠 Home' : `🏟️ ${team.split(' ')[0]}`}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chose To</label>
                  <div className="flex gap-2">
                    {(['Bat', 'Field'] as const).map(c => (
                      <button key={c} type="button"
                        onClick={() => setTossChoice(c)}
                        className={`flex-1 py-2 rounded-lg text-[11px] font-black border transition-all ${tossChoice === c ? 'bg-blue-600/30 border-blue-500/50 text-blue-300' : 'bg-white/[0.03] border-white/10 text-white hover:bg-blue-600/10 hover:border-blue-500/30 hover:text-blue-200'}`}
                      >{c === 'Bat' ? '🏏 Bat' : '🫸 Field'}</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max Overs</label>
                  <div className="relative">
                    <select
                      value={maxOvers}
                      onChange={e => setMaxOvers(parseInt(e.target.value))}
                      title="Max overs per innings"
                      className="w-full bg-[#0f172a] border border-white/10 rounded-lg pl-3 pr-8 py-2 text-white text-[12px] font-black focus:border-blue-500 outline-none appearance-none"
                    >
                      {overOptions.map(o => <option key={o} value={o}>{o} Overs</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Auto-derived innings banner */}
                <div className="md:col-span-3 flex items-center gap-3 pt-1">
                  <div className="flex-1 flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 rounded-lg px-3 py-2">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">📌 Innings 1 Batting:</span>
                    <span className="text-white font-black text-[12px]">{inn1BatLabel}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2 bg-slate-800/50 border border-white/5 rounded-lg px-3 py-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">📌 Innings 2 Batting:</span>
                    <span className="text-white font-black text-[12px]">{inn2BatLabel}</span>
                  </div>
                </div>
              </div>

              {/* ── SECTION 2: SCORE SUMMARY HEADER + EDIT FIELDS ── */}
              <div className="scorecard-header-summary">
                <div style={{ textAlign: 'center' }}>
                  <div className="team-name">🏠 Indian Strikers</div>
                  <div className="team-score" style={{ color: '#60a5fa' }}>{liveTotal(homeTeamBattingInnings)}<span style={{ fontSize: '14px', color: '#475569' }}>/{homeScore.wickets}</span></div>
                </div>
                <div className="vs-divider">VS</div>
                <div style={{ textAlign: 'center' }}>
                  <div className="team-name">🏟️ {opponentName}</div>
                  <div className="team-score" style={{ color: '#34d399' }}>{liveTotal(homeTeamBowlingInnings)}<span style={{ fontSize: '14px', color: '#475569' }}>/{awayScore.wickets}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Home edit fields */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Indian Strikers — Edit Totals</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Runs', 'runs'], ['Wkts', 'wickets'], ['Overs', 'overs']].map(([label, field]) => (
                      <div key={field}>
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">{label}</div>
                        <input type="number" min="0" max={field === 'wickets' ? 10 : undefined}
                          step={field === 'overs' ? 0.1 : 1}
                          title={`Home ${label}`}
                          className="compact-input compact-input-wide"
                          value={(homeScore as any)?.[field] || 0}
                          onChange={e => setHomeScore({ ...homeScore, [field]: e.target.valueAsNumber || 0 })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Away edit fields */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{opponentName} — Edit Totals</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Runs', 'runs'], ['Wkts', 'wickets'], ['Overs', 'overs']].map(([label, field]) => (
                      <div key={field}>
                        <div className="text-[9px] font-black text-slate-500 uppercase mb-1">{label}</div>
                        <input type="number" min="0" max={field === 'wickets' ? 10 : undefined}
                          step={field === 'overs' ? 0.1 : 1}
                          title={`Away ${label}`}
                          className="compact-input compact-input-wide"
                          value={(awayScore as any)?.[field] || 0}
                          onChange={e => setAwayScore({ ...awayScore, [field]: e.target.valueAsNumber || 0 })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: RESULT ── */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">Result</span>
                <div className="flex flex-wrap gap-2">
                  {RESULT_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setResultType(opt.value)}
                      className={`py-1.5 px-3 rounded-lg text-[11px] font-black border transition-all ${resultType === opt.value ? 'bg-blue-600/30 border-blue-500/50 text-blue-200' : 'bg-white/[0.03] border-white/10 text-white hover:bg-blue-600/10 hover:border-blue-500/30 hover:text-blue-200'}`}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* ── SECTION 4: INNINGS TABS ── */}
              <div className="flex bg-white/[0.04] p-0.5 rounded-xl border border-white/5">
                {([1, 2] as const).map(i => (
                  <button key={i} type="button" onClick={() => setActiveInnings(i)}
                    className={`flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${activeInnings === i ? 'bg-blue-600 text-white shadow-lg' : 'text-white hover:bg-blue-600/30 hover:text-white'}`}
                  >
                    Innings {i}: {i === 1 ? inn1BatLabel : inn2BatLabel} Batting
                  </button>
                ))}
              </div>

              {/* ── SECTION 5: BATTING TABLE ── */}
              <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                  <Target size={12} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">{currentBatLabel} — Batting</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="compact-score-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', paddingLeft: '8px' }}>Batter</th>
                        <th>R</th><th>B</th><th>4s</th><th>6s</th>
                        <th style={{ textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battingSquad.map((p: any) => {
                        const entry = getBattingEntry(activeInnings, p.id);
                        return (
                          <tr key={p.id}>
                            <td style={{ paddingLeft: '8px' }}>{p.name}</td>
                            <td><input type="number" min="0" title="Runs" className="compact-input" value={entry.runs} onChange={e => updateBatting(activeInnings, p.id, p.name, 'runs', e.target.valueAsNumber || 0)} /></td>
                            <td><input type="number" min="0" title="Balls" className="compact-input" value={entry.balls} onChange={e => updateBatting(activeInnings, p.id, p.name, 'balls', e.target.valueAsNumber || 0)} /></td>
                            <td><input type="number" min="0" title="Fours" className="compact-input" value={entry.fours} onChange={e => updateBatting(activeInnings, p.id, p.name, 'fours', e.target.valueAsNumber || 0)} /></td>
                            <td><input type="number" min="0" title="Sixes" className="compact-input" value={entry.sixes} onChange={e => updateBatting(activeInnings, p.id, p.name, 'sixes', e.target.valueAsNumber || 0)} /></td>
                            <td>
                              <select title="Dismissal" className="dismissal-select" value={entry.outHow} onChange={e => updateBatting(activeInnings, p.id, p.name, 'outHow', e.target.value)}>
                                {['Not Out', 'Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Did Not Bat', 'Hit Wicket'].map(o => <option key={o}>{o}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                      {battingSquad.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: '#374151', fontSize: '11px', padding: '20px' }}>No players — set Playing XI first</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SECTION 6: BOWLING TABLE ── */}
              <div className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                  <Zap size={12} className="text-blue-500" />
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">{currentBowlLabel} — Bowling</span>
                  <span className="ml-auto text-[9px] text-slate-600 font-medium">WD + NB auto-summed ↓</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="compact-score-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', paddingLeft: '8px' }}>Bowler</th>
                        <th>O</th><th>M</th><th>R</th><th>W</th>
                        <th style={{ color: '#ca8a04' }}>WD</th>
                        <th style={{ color: '#f97316' }}>NB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bowlingRows[activeInnings].map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ paddingLeft: '8px', width: '140px' }}>
                            {bowlingSquad.length > 0 ? (
                              <select
                                title={`Bowler ${idx + 1}`}
                                className="player-select-dropdown"
                                value={row.playerId}
                                onChange={e => updateBowlingRow(activeInnings, idx, 'playerId', e.target.value)}
                              >
                                <option value="">— Select —</option>
                                {bowlingSquad.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            ) : (
                              <span style={{ color: '#374151', fontSize: '11px' }}>No squad</span>
                            )}
                          </td>
                          {['overs', 'maidens', 'runs', 'wickets', 'wd', 'nb'].map(field => (
                            <td key={field} style={{ textAlign: 'center' }}>
                              <input
                                type="number" min="0" title={field}
                                step={field === 'overs' ? 0.1 : 1}
                                className="compact-input"
                                value={row[field]}
                                onChange={e => updateBowlingRow(activeInnings, idx, field, e.target.valueAsNumber || 0)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SECTION 7: EXTRAS (Auto-Calculated) ── */}
              <div className="auto-extras-box">
                <div className="extras-field">
                  <span className="extras-label">WIDE</span>
                  <span className="read-only-val" style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 900 }}>{autoWides(activeInnings)}</span>
                </div>
                <div className="extras-field">
                  <span className="extras-label">NO BALL</span>
                  <span className="read-only-val" style={{ color: '#f87171', fontSize: '13px', fontWeight: 900 }}>{autoNoBalls(activeInnings)}</span>
                </div>
                <div className="extras-field">
                  <span className="extras-label">LEGBYES</span>
                  <input
                    type="number" min="0" title="Leg Byes"
                    className="compact-input"
                    value={scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras.legByes || 0}
                    onChange={e => updateExtras(activeInnings, 'legByes', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="extras-field">
                  <span className="extras-label">BYES</span>
                  <input
                    type="number" min="0" title="Byes"
                    className="compact-input"
                    value={scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras.byes || 0}
                    onChange={e => updateExtras(activeInnings, 'byes', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="extras-total">
                  <span className="extras-label">TOTAL EXTRAS</span>
                  <span className="extras-total-val" style={{ color: '#3b82f6', fontSize: '16px', fontWeight: 900 }}>
                    {autoWides(activeInnings) + autoNoBalls(activeInnings)
                      + (scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras.legByes || 0)
                      + (scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras.byes || 0)}
                  </span>
                </div>
              </div>


            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-3 bg-white/[0.03] border-t border-white/5 flex gap-3 shrink-0">
              <button type="button" onClick={onClose}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all text-sm">
                Cancel
              </button>
              <button type="submit"
                className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 text-sm">
                <Save size={16} /> SYNC SCORECARD
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
