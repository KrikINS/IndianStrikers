import * as React from 'react';
import { useState, useMemo } from 'react';
import { X, Save, Award, Zap, Target, ChevronDown, Star, Loader2 } from 'lucide-react';
import { Player, FullScorecardData, InningsData, ScheduledMatch } from '../types';

import { useStore } from '../store/StoreProvider';
import { addCricketOvers } from '../services/statsEngine';
import * as api from '../services/storageService';

interface MatchScorecardEntryProps {
  match: ScheduledMatch;
  opponent?: { name: string; logoUrl?: string };
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

export default function MatchScorecardEntry({ match, opponent, onClose, onSubmit }: MatchScorecardEntryProps) {
  const { squadPlayers: masterHomePlayers, opponentPlayers: masterOpponentPlayers } = useStore();
  const opponentName = opponent?.name || match.opponentName || 'Opponent';

  const HOME_TEAM_ID = '00000000-0000-0000-0000-000000000000';
  const [tossWinner, setTossWinner] = useState<string>(match.toss?.winner || 'Indian Strikers');
  const [tossChoice, setTossChoice] = useState<'Bat' | 'Field'>(match.toss?.choice as any || 'Bat');
  const [maxOvers, setMaxOvers] = useState<number>(match.maxOvers || (match.matchFormat === 'One Day' ? 50 : 20));
  const [resultType, setResultType] = useState(match.resultType || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isLocked = !!(match.isLocked || (match as any).is_locked);

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

  const [scorecard, setScorecard] = useState<FullScorecardData>(() => {
    const raw: any = match.scorecard || {};
    const base = {
      innings1: { ...initialInnings, ...(raw.innings1 || {}) },
      innings2: { ...initialInnings, ...(raw.innings2 || {}) }
    };
    
    // Fallback to summary scores if innings data is completely missing
    if (!raw.innings1) {
       base.innings1.totalRuns = (innings1BattingTeam === 'home' ? match.finalScoreHome?.runs : match.finalScoreAway?.runs) || 0;
       base.innings1.totalWickets = (innings1BattingTeam === 'home' ? match.finalScoreHome?.wickets : match.finalScoreAway?.wickets) || 0;
       base.innings1.totalOvers = (innings1BattingTeam === 'home' ? match.finalScoreHome?.overs : match.finalScoreAway?.overs) || 0;
    }
    if (!raw.innings2) {
       base.innings2.totalRuns = (innings1BattingTeam === 'home' ? match.finalScoreAway?.runs : match.finalScoreHome?.runs) || 0;
       base.innings2.totalWickets = (innings1BattingTeam === 'home' ? match.finalScoreAway?.wickets : match.finalScoreHome?.wickets) || 0;
       base.innings2.totalOvers = (innings1BattingTeam === 'home' ? match.finalScoreAway?.overs : match.finalScoreHome?.overs) || 0;
    }

    // Ensure extras exists and has all properties for internal state stability
    const ensureExtras = (inn: InningsData) => {
      if (!inn.extras) inn.extras = { wide: 0, no_ball: 0, legByes: 0, byes: 0 };
      else {
        inn.extras.wide = inn.extras.wide || 0;
        inn.extras.no_ball = inn.extras.no_ball || 0;
        inn.extras.legByes = inn.extras.legByes || 0;
        inn.extras.byes = inn.extras.byes || 0;
      }
    };
    ensureExtras(base.innings1);
    ensureExtras(base.innings2);
    
    return base as FullScorecardData;
  });

  const [battingRowIds, setBattingRowIds] = useState<Record<1 | 2, string[]>>(() => {
    const s = match.scorecard || (match.live_data as any);
    return {
      1: s?.innings1?.batting?.map((b: any) => b.playerId) || [],
      2: s?.innings2?.batting?.map((b: any) => b.playerId) || []
    };
  });

  const [bowlingRows, setBowlingRows] = useState<Record<1 | 2, any[]>>(() => {
    const s = match.scorecard || (match.live_data as any);
    const mapRow = (r: any) => ({
      playerId: r.playerId || '',
      overs: r.overs || 0,
      maidens: r.maidens || 0,
      runs: r.runsConceded || r.runs || 0,
      wickets: r.wickets || 0,
      wd: r.wides || r.wd || 0,
      nb: r.no_balls || r.nb || 0,
      is_hero: !!r.is_hero
    });
    return {
      1: s?.innings1?.bowling?.map(mapRow) || Array(2).fill(null).map(() => ({ playerId: '', overs: 0, maidens: 0, runs: 0, wickets: 0, wd: 0, nb: 0, is_hero: false })),
      2: s?.innings2?.bowling?.map(mapRow) || Array(2).fill(null).map(() => ({ playerId: '', overs: 0, maidens: 0, runs: 0, wickets: 0, wd: 0, nb: 0, is_hero: false }))
    };
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
    const innData = scorecard[innKey];
    if (!innData) return 0;
    
    const battingRuns = (innData.batting || []).reduce((s, b) => s + (b.runs || 0), 0);
    const extrasTotal = (innData.extras?.legByes || 0) + (innData.extras?.byes || 0)
      + autoWides(inn) + autoNoBalls(inn);
    return battingRuns + extrasTotal;
  };

  const homeSquad = useMemo(() => {
    // 1. Strict Filter: Only show players assigned to the Match Day XI if it exists
    if (Array.isArray(match.homeTeamXI) && match.homeTeamXI.length > 0) {
      return masterHomePlayers.filter(p => match.homeTeamXI!.includes(p.id));
    }
    // 2. Fallback: Show all club players (Case-insensitive check)
    return masterHomePlayers.filter(p => p.teamId?.toUpperCase() === 'IND_STRIKERS');
  }, [masterHomePlayers, match.homeTeamXI]);

  const awaySquad = useMemo(() => {
    // 1. Strict Filter: Only show players assigned to the Match Day XI if it exists
    if (Array.isArray(match.opponentTeamXI) && match.opponentTeamXI.length > 0) {
        return masterOpponentPlayers.filter(p => match.opponentTeamXI!.includes(p.id));
    }
    // 2. Fallback: Show players assigned to this specific opponent
    return masterOpponentPlayers.filter(p => p.teamId === match.opponentId);
  }, [masterOpponentPlayers, match.opponentTeamXI, match.opponentId]);

  const battingSquad = activeInnings === 1
    ? (innings1BattingTeam === 'home' ? homeSquad : awaySquad)
    : (innings1BattingTeam === 'home' ? awaySquad : homeSquad);

  const bowlingSquad = activeInnings === 1
    ? (innings1BattingTeam === 'home' ? awaySquad : homeSquad)
    : (innings1BattingTeam === 'home' ? homeSquad : awaySquad);

  React.useEffect(() => {
    const rehydrate = async () => {
      // Prioritize immediately available live_data/scorecard from props
      const initialData = match.scorecard || (match.live_data as any);
      if (initialData) {
        const s = initialData;
        setScorecard(s);
        if (s.innings1?.batting) setBattingRowIds(prev => ({ ...prev, 1: s.innings1.batting.map((b: any) => b.playerId) }));
        if (s.innings2?.batting) setBattingRowIds(prev => ({ ...prev, 2: s.innings2.batting.map((b: any) => b.playerId) }));
        
        const mapRow = (r: any) => ({
          playerId: r.playerId || '',
          overs: r.overs || 0,
          maidens: r.maidens || 0,
          runs: r.runsConceded || r.runs || 0,
          wickets: r.wickets || 0,
          wd: r.wides || r.wd || 0,
          nb: r.no_balls || r.nb || 0,
          is_hero: !!r.is_hero
        });

        if (s.innings1?.bowling) setBowlingRows(prev => ({ ...prev, 1: s.innings1.bowling.map(mapRow) }));
        if (s.innings2?.bowling) setBowlingRows(prev => ({ ...prev, 2: s.innings2.bowling.map(mapRow) }));
      }

      // Secondary check: Fetch fresh from API if ID exists
      if (match.id) {
        try {
          const fresh = await api.getMatch(match.id);
          if (fresh) {
            const s = fresh.scorecard || (fresh.live_data as any);
            if (s) {
              setScorecard(s);
              if (s.innings1?.batting) setBattingRowIds(prev => ({ ...prev, 1: s.innings1.batting.map((b: any) => b.playerId) }));
              if (s.innings2?.batting) setBattingRowIds(prev => ({ ...prev, 2: s.innings2.batting.map((b: any) => b.playerId) }));
              
              const mapRow = (r: any) => ({
                playerId: r.playerId || '',
                overs: r.overs || 0,
                maidens: r.maidens || 0,
                runs: r.runsConceded || r.runs || 0,
                wickets: r.wickets || 0,
                wd: r.wides || r.wd || 0,
                nb: r.no_balls || r.nb || 0,
                is_hero: !!r.is_hero
              });

              if (s.innings1?.bowling) setBowlingRows(prev => ({ ...prev, 1: s.innings1.bowling.map(mapRow) }));
              if (s.innings2?.bowling) setBowlingRows(prev => ({ ...prev, 2: s.innings2.bowling.map(mapRow) }));
            }
          }
        } catch (err) {
          console.error("Failed to rehydrate match scorecard:", err);
        }
      }
    };
    rehydrate();
  }, [match]);

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
    || { runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Not Out', is_hero: false, fielderId: '', bowlerId: '' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      alert("This match is locked. Please unlock it to save changes.");
      return;
    }
    setIsSaving(true);
    setSyncError(null);
    const buildBatting = (inn: 1 | 2) => {
        const innKey = inn === 1 ? 'innings1' : 'innings2';
        // Only return players who actually have an entry in the scorecard
        return scorecard[innKey].batting.map(entry => {
             return { ...entry, fielderId: entry.fielderId || '', bowlerId: entry.bowlerId || '' };
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

    const inn1Runs = buildBatting(1).reduce((s, b) => s + (b.runs || 0), 0) + (scorecard.innings1?.extras?.legByes || 0) + (scorecard.innings1?.extras?.byes || 0) + autoWides(1) + autoNoBalls(1);
    const inn1Wickets = buildBatting(1).filter(b => !['Not Out', 'Did Not Bat', 'Retired Hurt'].includes(b.outHow)).length;
    const inn1Overs = buildBowling(1).reduce((s, b) => addCricketOvers(s, b.overs || 0), 0);

    const inn2Runs = buildBatting(2).reduce((s, b) => s + (b.runs || 0), 0) + (scorecard.innings2?.extras?.legByes || 0) + (scorecard.innings2?.extras?.byes || 0) + autoWides(2) + autoNoBalls(2);
    const inn2Wickets = buildBatting(2).filter(b => !['Not Out', 'Did Not Bat', 'Retired Hurt'].includes(b.outHow)).length;
    const inn2Overs = buildBowling(2).reduce((s, b) => addCricketOvers(s, b.overs || 0), 0);

    const finalScorecard = {
      innings1: { 
        ...scorecard.innings1, 
        batting: buildBatting(1), 
        bowling: buildBowling(1), 
        extras: { ...scorecard.innings1.extras, wide: autoWides(1), no_ball: autoNoBalls(1) },
        totalRuns: inn1Runs,
        totalWickets: inn1Wickets,
        totalOvers: inn1Overs
      },
      innings2: { 
        ...scorecard.innings2, 
        batting: buildBatting(2), 
        bowling: buildBowling(2), 
        extras: { ...scorecard.innings2.extras, wide: autoWides(2), no_ball: autoNoBalls(2) },
        totalRuns: inn2Runs,
        totalWickets: inn2Wickets,
        totalOvers: inn2Overs
      },
    };

    const fScoreHome = innings1BattingTeam === 'home' ? { runs: inn1Runs, wickets: inn1Wickets, overs: inn1Overs } : { runs: inn2Runs, wickets: inn2Wickets, overs: inn2Overs };
    const fScoreAway = innings1BattingTeam === 'home' ? { runs: inn2Runs, wickets: inn2Wickets, overs: inn2Overs } : { runs: inn1Runs, wickets: inn1Wickets, overs: inn1Overs };

    const performerMap = new Map<string, any>();
    const homeInningsKey = innings1BattingTeam === 'home' ? 'innings1' : 'innings2';
    const homeBowlingKey = innings1BattingTeam === 'home' ? 'innings2' : 'innings1';

    finalScorecard[homeInningsKey].batting.forEach(b => {
      // Database Sync: Do not create a performer row for DNB players
      if (b.outHow === 'Did Not Bat' && (b.balls || 0) === 0) return;
      
      performerMap.set(b.playerId, { 
        playerId: b.playerId, 
        playerName: b.name, 
        runs: b.runs, 
        balls: b.balls, 
        fours: b.fours, 
        sixes: b.sixes, 
        isNotOut: b.outHow === 'Not Out', 
        outHow: b.outHow, // Include outHow for better stat tracking
        is_hero: !!b.is_hero, 
        wickets: 0, 
        bowlingRuns: 0, 
        bowlingOvers: 0, 
        maidens: 0, 
        wides: 0, 
        no_balls: 0 
      });
    });
    finalScorecard[homeBowlingKey].bowling.forEach(b => {
      // Skip if they didn't actually bowl any balls
      if ((b.overs || 0) === 0) return;
      
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

    const diff = Math.abs(fScoreHome.runs - fScoreAway.runs);
    const resultSummary = resultType === 'Abandoned' ? 'Match Abandoned'
      : resultType === 'Tie' ? 'Match Tied'
        : resultType === 'Forfeit-Home' ? `${opponentName} won (Indian Strikers Forfeit)`
          : resultType === 'Forfeit-Away' ? `Indian Strikers won (${opponentName} Forfeit)`
            : fScoreHome.runs > fScoreAway.runs ? `Indian Strikers won by ${diff} runs`
              : fScoreAway.runs > fScoreHome.runs ? `${opponentName} won by ${diff} runs`
                : 'Match Tied';

    try {
      await onSubmit({
        finalScoreHome: fScoreHome,
        finalScoreAway: fScoreAway,
        resultNote: resultSummary,
        resultSummary,
        scorecard: finalScorecard,
        performers: Array.from(performerMap.values()),
        isLiveScored: false,
        toss: { winner: tossWinner, choice: tossChoice },
        maxOvers,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error("[MatchScorecardEntry] ❌ Submission failed:", err);
      setSyncError(err.message || 'Sync Failed. Data is preserved locally.');
      setIsSaving(false);
    }
  };

  const inn1BatLabel = innings1BattingTeam === 'home' ? 'Indian Strikers' : opponentName;
  const inn2BatLabel = innings1BattingTeam === 'home' ? opponentName : 'Indian Strikers';
  const homeTeamBattingInnings = innings1BattingTeam === 'home' ? 1 : 2;
  const currentBatLabel = activeInnings === 1 ? inn1BatLabel : inn2BatLabel;
  const currentBowlLabel = activeInnings === 1 ? inn2BatLabel : inn1BatLabel;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-black/85 backdrop-blur-sm">
      <div className="bg-[#020617] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[96vh] overflow-hidden flex flex-col shadow-2xl relative">
        {isSaving && (
          <div className="absolute inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
            <Loader2 size={48} className="text-blue-500 animate-spin" />
            <div className="text-white font-black uppercase tracking-widest animate-pulse">Syncing to Cloud SQL...</div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-tighter">Writing atomic record to database</div>
          </div>
        )}
        <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-900/40 to-transparent shrink-0">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="text-sky-400" size={18} /> {isLocked ? 'VIEW LOCKED SCORECARD' : 'Match Scorecard Entry'}
            </h2>
            <p className="text-slate-400 text-[11px]">vs {opponentName} · {match.matchFormat || 'T20'} · Max {maxOvers} overs</p>
          </div>
          <button onClick={onClose} title="Close" className="p-1.5 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X size={18} />
          </button>
        </div>
        <style>{`
          .compact-input { background:#000; border:1px solid #334155; color:#38bdf8; width:35px; text-align:center; font-size:12px; border-radius:3px; padding:2px; }
          .player-select-dropdown { background:#0f172a; border:1px solid #334155; color:white; font-size:12px; padding:3px; width:100%; border-radius:4px; min-width: 100px; }
          .hero-star { transition: all 0.2s; cursor: pointer; }
          .hero-star.active { color: #0ea5e9; fill: #0ea5e9; }
          .compact-score-table { width:100%; border-collapse:collapse; }
          .compact-score-table th { font-size:10px; color:#64748b; padding:4px; text-align:center; border-bottom:1px solid #1e293b; text-transform:uppercase; font-weight:700; white-space:nowrap; }
          .compact-score-table td { padding:2px 4px; border-bottom:1px solid rgba(255,255,255,0.02); vertical-align:middle; }
          
          /* iPad Mini 7 Responsiveness */
          @media (max-width: 1024px) {
            .scorecard-grid { flex-direction: column !important; }
            .batting-section { flex: 1 1 100% !important; }
            .bowling-section { flex: 1 1 100% !important; }
            .table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          }
        `}</style>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Toss Won By</label>
              <div className="flex gap-2 mt-1">
                {['Indian Strikers', opponentName].map(team => (
                  <button key={team} type="button" onClick={() => !isLocked && setTossWinner(team)}
                    className={`flex-1 py-1 px-3 rounded-lg text-[11px] font-black border ${tossWinner === team ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' : 'bg-white/[0.02] border-white/10 text-white'} ${isLocked ? 'cursor-default opacity-80' : ''}`}
                  >{team}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Chose To</label>
              <div className="flex gap-2 mt-1">
                {(['Bat', 'Field'] as const).map(c => (
                  <button key={c} type="button" onClick={() => !isLocked && setTossChoice(c)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-black border ${tossChoice === c ? 'bg-blue-600/30 border-blue-500/50 text-blue-300' : 'bg-white/[0.02] border-white/10 text-white'} ${isLocked ? 'cursor-default opacity-80' : ''}`}
                  >{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase">Max Overs</label>
              <select disabled={isLocked} title="Select Max Overs" value={maxOvers} onChange={e => setMaxOvers(parseInt(e.target.value))} className="w-full mt-1 bg-[#0f172a] border border-white/10 rounded-lg py-1 px-2 text-white text-[12px] disabled:opacity-50">
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
          <div className="flex flex-col lg:flex-row gap-6 scorecard-grid">
            <div className="flex-[0_1_60%] w-full rounded-xl bg-white/[0.01] border border-white/5 batting-section">
              <div className="px-4 py-2 border-b border-white/5 font-black text-[10px] uppercase tracking-wider text-white">Batting: {currentBatLabel}</div>
              <div className="table-container">
              <table className="compact-score-table">
                <thead><tr><th className="text-left pl-4">Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>Out</th><th>F</th><th>B</th></tr></thead>
                <tbody>
                  {battingRowIds[activeInnings].map((pId, idx) => {
                    const entry = getBattingEntry(activeInnings, pId);
                    const p = battingSquad.find(pl => pl.id === pId);
                    return (
                      <tr key={idx}>
                        <td className="pl-4">
                          <div className="flex items-center gap-2">
                            <button title="Toggle Hero Performance" type="button" onClick={() => !isLocked && updateBatting(activeInnings, pId, p?.name || '', 'is_hero', !entry.is_hero)}
                              className={`hero-star ${entry.is_hero ? 'active' : 'text-slate-600'} ${isLocked ? 'cursor-default' : ''}`} disabled={!pId || isLocked}><Star size={14} fill={entry.is_hero ? "currentColor" : "none"} /></button>
                            <select disabled={isLocked} title="Select Batter" className="player-select-dropdown disabled:opacity-50" value={pId} onChange={e => { updateBattingRowId(activeInnings, idx, e.target.value); if (e.target.value) { const s = battingSquad.find(pl => pl.id === e.target.value); if (s) updateBatting(activeInnings, s.id, s.name, 'runs', entry.runs); } }}>
                              <option value="">- Select Batter -</option>
                              {battingSquad.map(pl => <option key={pl.id} value={pl.id} disabled={battingRowIds[activeInnings].includes(pl.id) && pl.id !== pId}>{pl.name}</option>)}
                            </select>
                          </div>
                        </td>
                        <td>{entry.outHow === 'Did Not Bat' ? <span className="text-slate-600 font-bold block text-center">—</span> : <input title="Runs" placeholder="0" type="number" className="compact-input" value={entry.runs} disabled={!pId || isLocked} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'runs', e.target.valueAsNumber || 0)} />}</td>
                        <td>{entry.outHow === 'Did Not Bat' ? <span className="text-slate-600 font-bold block text-center">—</span> : <input title="Balls" placeholder="0" type="number" className="compact-input" value={entry.balls} disabled={!pId || isLocked} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'balls', e.target.valueAsNumber || 0)} />}</td>
                        <td>{entry.outHow === 'Did Not Bat' ? <span className="text-slate-600 font-bold block text-center">—</span> : <input title="Fours" placeholder="0" type="number" className="compact-input" value={entry.fours} disabled={!pId || isLocked} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'fours', e.target.valueAsNumber || 0)} />}</td>
                        <td>{entry.outHow === 'Did Not Bat' ? <span className="text-slate-600 font-bold block text-center">—</span> : <input title="Sixes" placeholder="0" type="number" className="compact-input" value={entry.sixes} disabled={!pId || isLocked} onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'sixes', e.target.valueAsNumber || 0)} />}</td>
                        <td><select title="Wicket Type" className="player-select-dropdown" style={{ width: '90px' }} value={entry.outHow} disabled={!pId || isLocked} onChange={e => {
                          const val = e.target.value;
                          updateBatting(activeInnings, pId, p?.name || '', 'outHow', val);
                          // Reset F/B if not applicable
                          if (val === 'Not Out' || val === 'Did Not Bat') {
                            updateBatting(activeInnings, pId, p?.name || '', 'fielderId', '');
                            updateBatting(activeInnings, pId, p?.name || '', 'bowlerId', '');
                          }
                        }}>
                          {['Not Out', 'Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Did Not Bat', 'Hit Wicket', 'Retired Hurt', 'Retired Out'].map(o => <option key={o}>{o}</option>)}
                        </select></td>
                        <td>
                          <select title="Fielder" className="player-select-dropdown" style={{ width: '80px' }} value={entry.fielderId || ''} 
                            disabled={!pId || isLocked || ['Not Out', 'Did Not Bat', 'Bowled', 'LBW', 'Hit Wicket'].includes(entry.outHow)}
                            onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'fielderId', e.target.value)}>
                            <option value="">-</option>
                            {bowlingSquad.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                          </select>
                        </td>
                        <td>
                          <select title="Bowler" className="player-select-dropdown" style={{ width: '80px' }} value={entry.bowlerId || ''} 
                            disabled={!pId || isLocked || ['Not Out', 'Did Not Bat', 'Run Out'].includes(entry.outHow)}
                            onChange={e => updateBatting(activeInnings, pId, p?.name || '', 'bowlerId', e.target.value)}>
                            <option value="">-</option>
                            {bowlingSquad.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              {!isLocked && (
                <div className="p-3 border-t border-white/5">
                  <button type="button" onClick={() => setBattingRowIds(prev => ({ ...prev, [activeInnings]: [...prev[activeInnings], ''] }))} className="text-[10px] text-sky-400 font-black tracking-widest">+ ADD BATSMAN</button>
                </div>
              )}
            </div>
            <div className="flex-[0_1_40%] w-full rounded-xl bg-white/[0.01] border border-white/5 bowling-section">
              <div className="px-4 py-2 border-b border-white/5 font-black text-[10px] uppercase tracking-wider text-white">Bowling: {currentBowlLabel}</div>
              <div className="table-container">
              <table className="compact-score-table">
                <thead><tr><th className="text-left pl-4">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>WD</th><th>NB</th></tr></thead>
                <tbody>
                  {bowlingRows[activeInnings].map((row, idx) => (
                    <tr key={idx}>
                      <td className="pl-4"><select disabled={isLocked} title="Select Bowler" className="player-select-dropdown disabled:opacity-50" value={row.playerId} onChange={e => updateBowlingRow(activeInnings, idx, 'playerId', e.target.value)}>
                        <option value="">- Select -</option>
                        {bowlingSquad.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                      </select></td>
                      <td><input title="Overs" placeholder="0.0" type="number" step="0.1" className="compact-input" value={row.overs} disabled={isLocked} onChange={e => updateBowlingRow(activeInnings, idx, 'overs', e.target.valueAsNumber || 0)} /></td>
                      <td><input title="Maidens" placeholder="0" type="number" className="compact-input" value={row.maidens} disabled={isLocked} onChange={e => updateBowlingRow(activeInnings, idx, 'maidens', e.target.valueAsNumber || 0)} /></td>
                      <td><input title="Runs" placeholder="0" type="number" className="compact-input" value={row.runs} disabled={isLocked} onChange={e => updateBowlingRow(activeInnings, idx, 'runs', e.target.valueAsNumber || 0)} /></td>
                      <td><input title="Wickets" placeholder="0" type="number" className="compact-input" value={row.wickets} disabled={isLocked} onChange={e => updateBowlingRow(activeInnings, idx, 'wickets', e.target.valueAsNumber || 0)} /></td>
                      <td><input title="Wides" placeholder="0" type="number" className="compact-input" value={row.wd} disabled={isLocked} onChange={e => updateBowlingRow(activeInnings, idx, 'wd', e.target.valueAsNumber || 0)} /></td>
                      <td><input title="No Balls" placeholder="0" type="number" className="compact-input" value={row.nb} disabled={isLocked} onChange={e => updateBowlingRow(activeInnings, idx, 'nb', e.target.valueAsNumber || 0)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {!isLocked && (
                <div className="p-3 border-t border-white/5">
                  <button type="button" onClick={() => addBowlingRow(activeInnings)} className="text-[10px] text-sky-400 font-black tracking-widest">+ ADD BOWLER</button>
                </div>
              )}
            </div>
          </div>
          <div className="p-3 bg-white/[0.05] rounded-xl border border-white/5 flex gap-4 text-[11px] font-black text-slate-400 items-center overflow-x-auto">
            <span>BYES: <input title="Byes" placeholder="0" type="number" className="compact-input" value={scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras?.byes || 0} onChange={e => updateExtras(activeInnings as 1 | 2, 'byes', e.target.valueAsNumber || 0)} /></span>
            <span>LEGBYES: <input title="Leg Byes" placeholder="0" type="number" className="compact-input" value={scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras?.legByes || 0} onChange={e => updateExtras(activeInnings as 1 | 2, 'legByes', e.target.valueAsNumber || 0)} /></span>
            <span>WIDES: <input title="Wides" placeholder="0" type="number" className="compact-input opacity-60" value={autoWides(activeInnings)} disabled /></span>
            <span>NO BALLS: <input title="No Balls" placeholder="0" type="number" className="compact-input opacity-60" value={autoNoBalls(activeInnings)} disabled /></span>
            <span className="ml-auto text-sky-400 whitespace-nowrap">TOTAL: {liveTotal(activeInnings)}</span>
          </div>
          {syncError && (
            <div className="mx-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold animate-in slide-in-from-top-2">
              <Zap size={14} className="shrink-0" />
              <span>{syncError}</span>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button type="button" onClick={onClose} className="flex-1 bg-white/5 text-white py-3 rounded-xl font-bold hover:bg-white/10 transition-colors">Close</button>
            {!isLocked && (
              <button 
                type="submit" 
                disabled={isSaving}
                className={`flex-[2] py-3 rounded-xl font-black shadow-lg transition-all flex items-center justify-center gap-2 ${isSaving ? 'bg-blue-800 cursor-not-allowed opacity-80' : 'bg-blue-700 hover:bg-blue-600 active:scale-[0.98]'}`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>SYNCING...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>SYNC SCORECARD</span>
                  </>
                )}
              </button>
            )}
          </div>

          {isSaving && (
            <div className="absolute inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className={`w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full ${!showSuccess ? 'animate-spin' : ''} ${showSuccess ? 'border-emerald-500/20 border-t-emerald-500' : ''}`} />
                {showSuccess ? (
                  <Zap className="absolute inset-0 m-auto text-emerald-400" size={24} />
                ) : (
                  <Loader2 className="absolute inset-0 m-auto text-sky-400 animate-pulse" size={24} />
                )}
              </div>
              <h3 className="text-xl font-black text-white mt-6 tracking-tight uppercase">
                {showSuccess ? 'Data Cemented!' : 'Syncing to Cloud SQL...'}
              </h3>
              <p className="text-slate-400 text-sm mt-2 max-w-[240px] font-medium text-center">
                {showSuccess 
                  ? 'Stats successfully finalized in Google Cloud SQL.' 
                  : 'Please wait while we finalize the stats in Google Cloud SQL.'}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
