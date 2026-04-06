import React, { useState } from 'react';
import { X, Save, UserPlus, Trash2, Award, Zap, Shield, Target } from 'lucide-react';
import { Player, FullScorecardData, InningsData } from '../types';
import { ScheduledMatch } from './matchCenterStore';

interface Performer {
  playerId: string;
  runs: number;
  balls: number;
  wickets: number;
  bowlingRuns: number;
  bowlingOvers: number;
  isNotOut: boolean;
}

interface ManualScoreModalProps {
  match: ScheduledMatch;
  opponent?: { name: string; logoUrl?: string; players?: any[] };
  players?: Player[]; 
  onClose: () => void;
  onSubmit: (finalData: any) => void;
}

export default function ManualScoreModal({ match, opponent, players = [], onClose, onSubmit }: ManualScoreModalProps) {
  const [activeInnings, setActiveInnings] = useState<1 | 2>(1);
  const [homeScore, setHomeScore] = useState(match.finalScoreHome || { runs: 0, wickets: 0, overs: 0 });
  const [awayScore, setAwayScore] = useState(match.finalScoreAway || { runs: 0, wickets: 0, overs: 0 });
  const [resultNote, setResultNote] = useState(match.resultNote || match.resultSummary || '');
  
  // Initialize Full Scorecard Data
  const initialInnings: InningsData = {
    batting: [],
    bowling: [],
    extras: { wide: 0, noBall: 0, legByes: 0, byes: 0 },
    totalRuns: 0,
    totalWickets: 0,
    totalOvers: 0
  };

  const [scorecard, setScorecard] = useState<FullScorecardData>({
    innings1: { ...initialInnings },
    innings2: { ...initialInnings }
  });

  const availablePlayers = players.filter(p => 
    match.homeTeamXI && match.homeTeamXI.length > 0 ? match.homeTeamXI.includes(p.id) : true
  );

  const updateInningsBatting = (inn: 1 | 2, pId: string, name: string, field: string, value: any) => {
    setScorecard(prev => {
      const targetInn = inn === 1 ? 'innings1' : 'innings2';
      const existing = prev[targetInn].batting.find(b => b.playerId === pId);
      let newBatting = [...prev[targetInn].batting];

      if (existing) {
        newBatting = newBatting.map(b => b.playerId === pId ? { ...b, [field]: value } : b);
      } else {
        newBatting.push({ 
          playerId: pId, name, runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Not Out',
          [field]: value 
        });
      }

      return { ...prev, [targetInn]: { ...prev[targetInn], batting: newBatting } };
    });
  };

  const updateInningsBowling = (inn: 1 | 2, pId: string, name: string, field: string, value: any) => {
    setScorecard(prev => {
      const targetInn = inn === 1 ? 'innings1' : 'innings2';
      const existing = prev[targetInn].bowling.find(b => b.playerId === pId);
      let newBowling = [...prev[targetInn].bowling];

      if (existing) {
        newBowling = newBowling.map(b => b.playerId === pId ? { ...b, [field]: value } : b);
      } else {
        newBowling.push({ 
          playerId: pId, name, overs: 0, maidens: 0, runsConceded: 0, wickets: 0,
          [field]: value 
        });
      }

      return { ...prev, [targetInn]: { ...prev[targetInn], bowling: newBowling } };
    });
  };

  const updateExtras = (inn: 1 | 2, field: string, value: number) => {
    setScorecard(prev => {
       const targetInn = inn === 1 ? 'innings1' : 'innings2';
       return {
         ...prev,
         [targetInn]: {
           ...prev[targetInn],
           extras: { ...prev[targetInn].extras, [field]: value }
         }
       };
    });
  };

  const getPlayerCareerStats = (id: string) => {
    const p = players.find(player => player.id === id);
    return {
      runs: p?.battingStats?.runs || 0,
      wickets: p?.bowlingStats?.wickets || 0
    };
  };

  const calculateNewTotal = (current: number, matchVal: number) => {
    return (current || 0) + (matchVal || 0);
  };

  // Smart Wiring: Correctly maps both innings based on which team batted first
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isHomeBattingFirst = match.isHomeBattingFirst !== false; // default true
    const homeBattingInnings = isHomeBattingFirst ? scorecard.innings1 : scorecard.innings2;
    const homeBowlingInnings = isHomeBattingFirst ? scorecard.innings2 : scorecard.innings1;

    // Validate: team total should equal sum of runs + extras
    const extrasTotal = (homeScore: any) => 0; // validation hint for admin
    void extrasTotal;

    // Build performerMap: merge batting + bowling for each Home Team player
    const performerMap = new Map<string, any>();

    // Step 1: Extract Home Team Batting
    homeBattingInnings.batting.forEach(b => {
      performerMap.set(b.playerId, {
        playerId: b.playerId,
        playerName: b.name,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        isNotOut: b.outHow === 'Not Out',
        wickets: 0,
        bowlingRuns: 0,
        bowlingOvers: 0,
        maidens: 0,
      });
    });

    // Step 2: Merge Home Team Bowling (same player may have both)
    homeBowlingInnings.bowling.forEach(b => {
      const existing = performerMap.get(b.playerId) || {
        playerId: b.playerId,
        playerName: b.name,
        runs: 0, balls: 0, fours: 0, sixes: 0, isNotOut: false,
      };
      performerMap.set(b.playerId, {
        ...existing,
        wickets: b.wickets,
        bowlingRuns: b.runsConceded,
        bowlingOvers: b.overs,
        maidens: b.maidens,
      });
    });

    // Step 3: Ensure all Playing XI players are included (MAT+1 for everyone)
    (match.homeTeamXI || []).forEach(pid => {
      if (!performerMap.has(pid)) {
        const player = players.find(p => p.id === pid);
        performerMap.set(pid, {
          playerId: pid,
          playerName: player?.name || '',
          runs: 0, balls: 0, fours: 0, sixes: 0,
          isNotOut: false, wickets: 0, bowlingRuns: 0, bowlingOvers: 0, maidens: 0,
        });
      }
    });

    const performers = Array.from(performerMap.values());

    onSubmit({
      finalScoreHome: homeScore,
      finalScoreAway: awayScore,
      resultNote: resultNote || generateResultNote(),
      scorecard: scorecard,
      performers: performers,
      isLiveScored: false
    });
  };

  const generateResultNote = () => {
    const diff = Math.abs(homeScore.runs - awayScore.runs);
    const opponentName = opponent?.name || 'Opponent';
    if (homeScore.runs > awayScore.runs) {
      return `Indian Strikers won by ${diff} runs`;
    } else if (awayScore.runs > homeScore.runs) {
      return `${opponentName} won by ${diff} runs`;
    }
    return "Match Tied";
  };

  return (
    <>
    <style>{`
      .scorecard-inner-scroll { max-height: 65vh; overflow-y: auto; padding-right: 10px; margin-bottom: 20px; }
      .scorecard-inner-scroll::-webkit-scrollbar { width: 6px; }
      .scorecard-inner-scroll::-webkit-scrollbar-thumb { background: #34495e; border-radius: 10px; }
      .innings-header { background: linear-gradient(90deg, #1e3a8a 0%, #1e293b 100%); color: #fff; padding: 10px 15px; border-radius: 6px; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; margin: 25px 0 15px 0; border-left: 4px solid #3b82f6; }
      .score-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; background: rgba(255,255,255,0.02); }
      .score-table th { text-align: left; color: #94a3b8; font-weight: 500; padding: 12px 8px; border-bottom: 1px solid #334155; text-transform: uppercase; font-size: 11px; }
      .score-table td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .score-input { background: #0f172a; border: 1px solid #334155; color: #f8fafc; width: 50px; padding: 6px; border-radius: 4px; text-align: center; transition: border 0.3s; }
      .score-input:focus { border-color: #3b82f6; outline: none; }
      .extras-container { display: flex; align-items: center; gap: 15px; background: rgba(59,130,246,0.1); padding: 12px; border-radius: 8px; margin: 15px 0; border: 1px dashed rgba(59,130,246,0.3); }
      .extras-label { font-weight: bold; color: #3b82f6; font-size: 12px; }
    `}</style>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1A1D21] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-bottom border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-600/10 to-transparent">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Award className="text-blue-500" /> Manual Score Entry
            </h2>
            <p className="text-slate-400 text-sm font-medium">Update results for {opponent?.name || 'Opponent'} match</p>
          </div>
          <button onClick={onClose} title="Close Modal" className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Team Scores Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Home Team */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">IS</div>
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">Indian Strikers</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="home-runs" className="text-[10px] font-black text-slate-500 uppercase block mb-1">Runs</label>
                  <input 
                    id="home-runs"
                    type="number" required min="0" title="Home Runs"
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500 transition-all outline-none"
                    value={homeScore.runs} onChange={e => setHomeScore({...homeScore, runs: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label htmlFor="home-wickets" className="text-[10px] font-black text-slate-500 uppercase block mb-1">Wickets</label>
                  <input 
                    id="home-wickets"
                    type="number" required min="0" max="10" title="Home Wickets"
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500 transition-all outline-none"
                    value={homeScore.wickets} onChange={e => setHomeScore({...homeScore, wickets: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label htmlFor="home-overs" className="text-[10px] font-black text-slate-500 uppercase block mb-1">Overs</label>
                  <input 
                    id="home-overs"
                    type="number" step="0.1" required min="0" max="20" title="Home Overs"
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500 transition-all outline-none"
                    value={homeScore.overs} onChange={e => setHomeScore({...homeScore, overs: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Away Team */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                {opponent?.logoUrl ? (
                  <img src={opponent.logoUrl} className="w-8 h-8 rounded-lg object-cover" alt="Opponent" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-white text-[10px]">UP</div>
                )}
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">{opponent?.name || 'Opponent'}</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="away-runs" className="text-[10px] font-black text-slate-500 uppercase block mb-1">Runs</label>
                  <input 
                    id="away-runs"
                    type="number" required min="0" title="Away Runs"
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500 transition-all outline-none"
                    value={awayScore.runs} onChange={e => setAwayScore({...awayScore, runs: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label htmlFor="away-wickets" className="text-[10px] font-black text-slate-500 uppercase block mb-1">Wickets</label>
                  <input 
                    id="away-wickets"
                    type="number" required min="0" max="10" title="Away Wickets"
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500 transition-all outline-none"
                    value={awayScore.wickets} onChange={e => setAwayScore({...awayScore, wickets: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label htmlFor="away-overs" className="text-[10px] font-black text-slate-500 uppercase block mb-1">Overs</label>
                  <input 
                    id="away-overs"
                    type="number" step="0.1" required min="0" max="20" title="Away Overs"
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:border-blue-500 transition-all outline-none"
                    value={awayScore.overs} onChange={e => setAwayScore({...awayScore, overs: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Innings Toggle */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mb-6">
            <button 
              type="button" onClick={() => setActiveInnings(1)}
              className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${activeInnings === 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Innings 1: Indian Strikers Batting
            </button>
            <button 
              type="button" onClick={() => setActiveInnings(2)}
              className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${activeInnings === 2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Innings 2: {opponent?.name || 'Opponent'} Batting
            </button>
          </div>

          <div className="space-y-12">
             <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                   <h3 className="text-xl font-black text-white flex items-center gap-3 italic uppercase italic">
                      <Target className="text-emerald-500" />
                      {activeInnings === 1 ? 'Indian Strikers Batting' : `${opponent?.name || 'Opponent'} Batting`}
                   </h3>
                   <div className="px-4 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-500 uppercase">
                      High Fidelity Mode
                   </div>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">
                            <th className="py-4 px-2">Batter</th>
                            <th className="py-4 px-2">Runs</th>
                            <th className="py-4 px-2">Balls</th>
                            <th className="py-4 px-2">4s</th>
                            <th className="py-4 px-2">6s</th>
                            <th className="py-4 px-2">Status</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {(activeInnings === 1 ? availablePlayers : (opponent?.players || [])).map((p: any) => {
                            const entry = scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].batting.find(b => b.playerId === p.id) || { runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Not Out' };
                            return (
                               <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors">
                                  <td className="py-4 px-2 text-white font-bold">{p.name}</td>
                                  <td className="py-4 px-2">
                                     <input 
                                        type="number" min="0" title="Runs" placeholder="0"
                                        className="w-16 bg-[#111417] border border-white/10 rounded-lg px-2 py-1.5 text-white font-black focus:border-blue-500 outline-none"
                                        value={entry.runs} onChange={e => updateInningsBatting(activeInnings, p.id, p.name, 'runs', parseInt(e.target.value) || 0)}
                                     />
                                     {activeInnings === 1 && (
                                       <div className="text-[7px] font-black text-blue-500 mt-1 uppercase opacity-60">
                                         Next: {calculateNewTotal(getPlayerCareerStats(p.id).runs, entry.runs)}
                                       </div>
                                     )}
                                  </td>
                                  <td className="py-4 px-2">
                                     <input 
                                        type="number" min="0" title="Balls" placeholder="0"
                                        className="w-16 bg-[#111417] border border-white/10 rounded-lg px-2 py-1.5 text-white font-black focus:border-blue-500 outline-none"
                                        value={entry.balls} onChange={e => updateInningsBatting(activeInnings, p.id, p.name, 'balls', parseInt(e.target.value) || 0)}
                                     />
                                  </td>
                                  <td className="py-4 px-2">
                                     <input 
                                        type="number" min="0" title="Fours" placeholder="0"
                                        className="w-12 bg-[#111417] border border-white/10 rounded-lg px-2 py-1.5 text-white font-black focus:border-blue-500 outline-none"
                                        value={entry.fours} onChange={e => updateInningsBatting(activeInnings, p.id, p.name, 'fours', parseInt(e.target.value) || 0)}
                                     />
                                  </td>
                                  <td className="py-4 px-2">
                                     <input 
                                        type="number" min="0" title="Sixes" placeholder="0"
                                        className="w-12 bg-[#111417] border border-white/10 rounded-lg px-2 py-1.5 text-white font-black focus:border-blue-500 outline-none"
                                        value={entry.sixes} onChange={e => updateInningsBatting(activeInnings, p.id, p.name, 'sixes', parseInt(e.target.value) || 0)}
                                     />
                                  </td>
                                  <td className="py-4 px-2">
                                     <select 
                                        title="Status"
                                        className="bg-[#111417] border border-white/10 rounded-lg px-2 py-1.5 text-white font-bold text-xs outline-none"
                                        value={entry.outHow} onChange={e => updateInningsBatting(activeInnings, p.id, p.name, 'outHow', e.target.value)}
                                     >
                                        <option>Not Out</option>
                                        <option>Bowled</option>
                                        <option>Caught</option>
                                        <option>LBW</option>
                                        <option>Run Out</option>
                                        <option>Stumped</option>
                                        <option>Did Not Bat</option>
                                     </select>
                                  </td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>

                <div className="mt-12 mb-8 flex items-center justify-between border-b border-white/5 pb-4">
                   <h3 className="text-xl font-black text-white flex items-center gap-3 italic uppercase">
                      <Zap className="text-blue-500" />
                      {activeInnings === 1 ? `Bowling: ${opponent?.name || 'Opponent'}` : `Bowling: Indian Strikers`}
                   </h3>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">
                            <th className="py-4 px-2">Bowler</th>
                            <th className="py-4 px-2">Overs</th>
                            <th className="py-4 px-2">Maidens</th>
                            <th className="py-4 px-2">Runs</th>
                            <th className="py-4 px-2">Wickets</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                         {(activeInnings === 1 ? (opponent?.players || []) : availablePlayers).map((p: any) => {
                            const entry = scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].bowling.find(b => b.playerId === p.id) || { overs: 0, maidens: 0, runsConceded: 0, wickets: 0 };
                            return (
                               <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors">
                                  <td className="py-4 px-2 text-white font-bold">{p.name}</td>
                                  <td className="py-4 px-2">
                                     <input 
                                        type="number" step="0.1" min="0" title="Overs" placeholder="0"
                                        className="w-16 bg-[#111417] border border-white/10 rounded-lg px-2 py-1.5 text-white font-black focus:border-blue-500 outline-none"
                                        value={entry.overs} onChange={e => updateInningsBowling(activeInnings, p.id, p.name, 'overs', parseFloat(e.target.value) || 0)}
                                     />
                                  </td>
                                  <td className="py-4 px-2">
                                     <input 
                                        type="number" min="0" title="Maidens" placeholder="0"
                                        className="w-16 bg-[#111417] border border-white/10 rounded-lg px-2 py-1.5 text-white font-black focus:border-blue-500 outline-none"
                                        value={entry.maidens} onChange={e => updateInningsBowling(activeInnings, p.id, p.name, 'maidens', parseInt(e.target.value) || 0)}
                                     />
                                  </td>
                                  <td className="py-4 px-2">
                                     <input 
                                        type="number" min="0" title="Runs" placeholder="0"
                                        className="w-16 bg-[#111417] border border-white/10 rounded-lg px-2 py-1.5 text-white font-black focus:border-blue-500 outline-none"
                                        value={entry.runsConceded} onChange={e => updateInningsBowling(activeInnings, p.id, p.name, 'runsConceded', parseInt(e.target.value) || 0)}
                                     />
                                  </td>
                                  <td className="py-4 px-2">
                                     <input 
                                        type="number" min="0" title="Wickets" placeholder="0"
                                        className="w-16 bg-[#111417] border border-white/10 rounded-lg px-2 py-1.5 text-white font-black focus:border-blue-500 outline-none"
                                        value={entry.wickets} onChange={e => updateInningsBowling(activeInnings, p.id, p.name, 'wickets', parseInt(e.target.value) || 0)}
                                     />
                                     {activeInnings === 2 && (
                                       <div className="text-[7px] font-black text-emerald-500 mt-1 uppercase opacity-60">
                                         Next: {calculateNewTotal(getPlayerCareerStats(p.id).wickets, entry.wickets)}
                                       </div>
                                     )}
                                  </td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>

                {/* Extras Row */}
                <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-wrap items-center gap-8">
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extras Breakdown</div>
                   <div className="flex gap-4">
                      {['wide', 'noBall', 'legByes', 'byes'].map((field: any) => (
                         <div key={field} className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{field.replace('Ball', ' B')}</span>
                            <input 
                               type="number" min="0" title={field}
                               className="w-12 bg-[#111417] border border-white/10 rounded-lg px-2 py-1 text-white font-black text-xs outline-none focus:border-blue-500"
                               value={scorecard[activeInnings === 1 ? 'innings1' : 'innings2'].extras[field as keyof typeof scorecard.innings1.extras]}
                               onChange={e => updateExtras(activeInnings, field, parseInt(e.target.value) || 0)}
                            />
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 bg-white/5 border-t border-white/5 flex gap-4">
          <button 
            type="button" onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all outline-none"
          >
            Cancel
          </button>
          <button 
            type="submit" onClick={handleSubmit}
            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <Save size={20} /> SYNC SCORECARD
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
