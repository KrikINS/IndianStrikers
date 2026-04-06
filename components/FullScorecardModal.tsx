import React, { useState, useMemo } from 'react';
import { X, Award, Target, Zap } from 'lucide-react';
import { Player, FullScorecardData, InningsData, ScheduledMatch } from '../types';
import { Performer } from './matchCenterStore';

interface FullScorecardModalProps {
  match: ScheduledMatch;
  homeSquad: Player[];
  opponentSquad: any[];
  opponentName: string;
  homeTeamLogo?: string;
  opponentLogo?: string;
  onSave: (finalData: any) => void;
  onClose: () => void;
}

export default function FullScorecardModal({ match, homeSquad, opponentSquad, opponentName, homeTeamLogo, opponentLogo, onSave, onClose }: FullScorecardModalProps) {
  const [activeInnings, setActiveInnings] = useState<1 | 2>(1);

  // 1. Logic to determine which team bats in which Innings based on Toss
  const isHomeBattingFirst = useMemo(() => {
    if (!match.toss) return true;
    const homeWon = match.toss.winner === 'Indian Strikers';
    return (homeWon && match.toss.choice === 'Bat') || (!homeWon && match.toss.choice === 'Field');
  }, [match.toss]);

  const opponentDisplay = opponentName || match.opponentName || 'Opponent';

  const innings1Team = isHomeBattingFirst ? { name: 'INDIAN STRIKERS', squad: homeSquad, type: 'home' as const, logo: homeTeamLogo || match.homeLogo } 
                                          : { name: opponentDisplay.toUpperCase(), squad: opponentSquad, type: 'away' as const, logo: opponentLogo || match.opponentLogo };
  
  const innings2Team = isHomeBattingFirst ? { name: opponentDisplay.toUpperCase(), squad: opponentSquad, type: 'away' as const, logo: opponentLogo || match.opponentLogo } 
                                          : { name: 'INDIAN STRIKERS', squad: homeSquad, type: 'home' as const, logo: homeTeamLogo || match.homeLogo };

  const initialInnings: InningsData = {
    batting: [],
    bowling: [],
    extras: { wide: 0, noBall: 0, legByes: 0, byes: 1 },
    totalRuns: 0, totalWickets: 0, totalOvers: 0,
  };

  // 2. Scorecard State
  const [scorecard, setScorecard] = useState<FullScorecardData>(() => {
    const base = match.scorecard || {
      innings1: { ...initialInnings, extras: { wide: 0, noBall: 0, legByes: 0, byes: 0 } },
      innings2: { ...initialInnings, extras: { wide: 0, noBall: 0, legByes: 0, byes: 0 } },
    };

    if (!base.innings1.batting.length) base.innings1.batting = [...Array(11)].map(() => ({ playerId: '', name: '', runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Not Out', fielderId: '', bowlerId: '' }));
    if (!base.innings1.bowling.length) base.innings1.bowling = [...Array(6)].map(() => ({ playerId: '', name: '', overs: 0, maidens: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0, dotBalls: 0 }));
    if (!base.innings2.batting.length) base.innings2.batting = [...Array(11)].map(() => ({ playerId: '', name: '', runs: 0, balls: 0, fours: 0, sixes: 0, outHow: 'Not Out', fielderId: '', bowlerId: '' }));
    if (!base.innings2.bowling.length) base.innings2.bowling = [...Array(6)].map(() => ({ playerId: '', name: '', overs: 0, maidens: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0, dotBalls: 0 }));

    return base;
  });

  const inningsData = scorecard[activeInnings === 1 ? 'innings1' : 'innings2'];

  const addBowlerRow = () => {
    setScorecard(prev => {
      const key = activeInnings === 1 ? 'innings1' : 'innings2';
      return {
        ...prev,
        [key]: {
          ...prev[key],
          bowling: [...prev[key].bowling, { playerId: '', name: '', overs: 0, maidens: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0, dotBalls: 0 }]
        }
      };
    });
  };

  const updateBatting = (inn: 1 | 2, idx: number, field: string, value: any) => {
    setScorecard(prev => {
      const key = inn === 1 ? 'innings1' : 'innings2';
      const newBatting = [...prev[key].batting];
      const squad = inn === 1 ? innings1Team.squad : innings2Team.squad;
      if (field === 'playerId') {
        const player = squad.find((p: any) => p.id === value);
        newBatting[idx] = { ...newBatting[idx], playerId: value, name: player?.name || '' };
      } else {
        newBatting[idx] = { ...newBatting[idx], [field]: value };
      }
      return { ...prev, [key]: { ...prev[key], batting: newBatting } };
    });
  };

  const updateBowling = (inn: 1 | 2, idx: number, field: string, value: any) => {
    setScorecard(prev => {
      const key = inn === 1 ? 'innings1' : 'innings2';
      const newBowling = [...prev[key].bowling];
      const squad = inn === 1 ? innings2Team.squad : innings1Team.squad;
      if (field === 'playerId') {
        const player = squad.find((p: any) => p.id === value);
        newBowling[idx] = { ...newBowling[idx], playerId: value, name: player?.name || '' };
      } else {
        newBowling[idx] = { ...newBowling[idx], [field]: value };
      }
      return { ...prev, [key]: { ...prev[key], bowling: newBowling } };
    });
  };

  const updateExtras = (field: 'legByes' | 'byes', value: number) => {
    setScorecard(prev => {
      const key = activeInnings === 1 ? 'innings1' : 'innings2';
      return {
        ...prev,
        [key]: { ...prev[key], extras: { ...prev[key].extras, [field]: value } }
      };
    });
  };

  const updateFOW = (value: string) => {
    setScorecard(prev => {
      const key = activeInnings === 1 ? 'innings1' : 'innings2';
      return { ...prev, [key]: { ...prev[key], fallOfWickets: value } };
    });
  };

  const calculateInningsTotal = (inn: InningsData) => {
    const batSum = inn.batting.reduce((acc: number, b) => acc + (b.runs || 0), 0);
    const bowlExtras = inn.bowling.reduce((acc: number, b) => acc + (b.wides || 0) + (b.noBalls || 0), 0);
    return batSum + bowlExtras + (inn.extras.legByes || 0) + (inn.extras.byes || 0);
  };

  const calculateInningsWickets = (inn: InningsData) => {
    return inn.batting.filter(b => b.outHow !== 'Not Out' && b.outHow !== 'Did Not Bat' && b.playerId).length;
  };

  const handleSave = () => {
    const performerMap = new Map<string, Performer>();
    
    // Process home batting
    const homeBattingInnings = isHomeBattingFirst ? scorecard.innings1 : scorecard.innings2;
    homeBattingInnings.batting.filter(b => b.playerId && homeSquad.some(p => p.id === b.playerId)).forEach(b => {
      performerMap.set(b.playerId, {
        playerId: b.playerId,
        playerName: b.name,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        isNotOut: b.outHow === 'Not Out',
        wickets: 0, bowlingRuns: 0, bowlingOvers: 0, maidens: 0, dotBalls: 0
      });
    });

    // Process home bowling
    const homeBowlingInnings = isHomeBattingFirst ? scorecard.innings2 : scorecard.innings1;
    homeBowlingInnings.bowling.filter(b => b.playerId && homeSquad.some(p => p.id === b.playerId)).forEach(b => {
      const existing = performerMap.get(b.playerId) || {
        playerId: b.playerId, playerName: b.name, runs: 0, balls: 0, fours: 0, sixes: 0, isNotOut: false,
        wickets: 0, bowlingRuns: 0, bowlingOvers: 0, maidens: 0, dotBalls: 0
      };
      performerMap.set(b.playerId, {
        ...existing,
        wickets: b.wickets,
        bowlingRuns: b.runsConceded,
        bowlingOvers: b.overs,
        maidens: b.maidens,
        dotBalls: b.dotBalls || 0
      });
    });

    const finalScorecard = { ...scorecard };
    finalScorecard.innings1.totalRuns = calculateInningsTotal(finalScorecard.innings1);
    finalScorecard.innings1.totalWickets = calculateInningsWickets(finalScorecard.innings1);
    finalScorecard.innings2.totalRuns = calculateInningsTotal(finalScorecard.innings2);
    finalScorecard.innings2.totalWickets = calculateInningsWickets(finalScorecard.innings2);

    onSave({
      scorecard: finalScorecard,
      performers: Array.from(performerMap.values()),
      isLocked: true
    });
  };

  const autoWides = inningsData.bowling.reduce((acc: number, b) => acc + (b.wides || 0), 0);
  const autoNBs = inningsData.bowling.reduce((acc: number, b) => acc + (b.noBalls || 0), 0);

  const homeInnings = isHomeBattingFirst ? scorecard.innings1 : scorecard.innings2;
  const awayInnings = isHomeBattingFirst ? scorecard.innings2 : scorecard.innings1;
  const homeRuns = calculateInningsTotal(homeInnings);
  const homeWkts = calculateInningsWickets(homeInnings);
  const awayRuns = calculateInningsTotal(awayInnings);
  const awayWkts = calculateInningsWickets(awayInnings);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in">
      <style>{`
        .scorecard-modal {
          width: 100%;
          max-width: 900px;
          max-height: 95vh;
          background: #0f172a;
          border-radius: 24px;
          padding: 0;
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.7);
        }

        .read-only-summary-bar {
          background: #1e293b;
          padding: 10px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          text-align: center;
        }

        .context-info { font-size: 0.6rem; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 2px; }
        .toss-result-strip { font-size: 0.75rem; font-weight: bold; color: #94a3b8; margin: 4px 0; }
        
        .team-score-block {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          margin-top: 4px;
        }

        .team-logo-small {
          width: 35px;
          height: 35px;
          object-fit: contain;
          filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.5));
          border-radius: 50%;
        }

        .team-name-big { font-size: 1.15rem; font-weight: 950; color: #fff; letter-spacing: -0.5px; }
        .vs-divider { font-size: 0.7rem; font-weight: 950; color: #334155; padding: 3px 8px; background: #0f172a; border-radius: 6px; }

        .tab-control-row {
          display: flex;
          background: #111827;
          padding: 4px;
          gap: 4px;
        }

        .tab-control-row button {
          flex: 1;
          padding: 8px;
          border-radius: 8px;
          font-size: 0.65rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.2s;
          color: #475569;
        }

        .tab-control-row button.active {
          background: #3b82f6;
          color: white;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .scorecard-content {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .scorecard-section { margin-bottom: 20px; }
        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 4px;
        }
        .section-title { font-size: 0.65rem; font-weight: 950; color: #3b82f6; letter-spacing: 2px; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }

        .btn-add-row {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid #3b82f6;
          color: #3b82f6;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
        }
        .btn-add-row:hover { background: #3b82f6; color: white; }

        .compact-table { width: 100%; border-collapse: collapse; }
        .compact-table th { font-size: 8px; color: #f8fafc; opacity: 1; padding: 4px; border-bottom: 1px solid #1e293b; text-transform: uppercase; font-weight: 900; text-align: center; }
        .compact-table td { padding: 2px; border-bottom: 1px solid rgba(255,255,255,0.02); }

        .player-dropdown, .status-dropdown {
          background: #0f172a;
          border: 1px solid #1e293b;
          color: #fff;
          font-size: 10px;
          padding: 4px;
          border-radius: 4px;
          width: 100%;
          font-weight: 700;
          outline: none;
        }

        .cell-input {
          background: #000;
          border: 1px solid #1e293b;
          color: #10b981;
          text-align: center;
          font-size: 10px;
          font-weight: 900;
          padding: 4px;
          border-radius: 4px;
        }

        .sr-cell {
          font-size: 9px;
          font-weight: 900;
          color: #94a3b8;
          text-align: center;
          background: rgba(148, 163, 184, 0.05);
          border-radius: 4px;
          padding: 4px;
          min-width: 45px;
        }

        .extras-fow-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 15px 0;
          font-size: 11px;
        }

        .extras-box, .fow-box {
          background: #0f172a;
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #1e293b;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .extras-box .label, .fow-box .label {
          font-weight: 900;
          color: #3b82f6;
          min-width: 60px;
        }

        .extra-input {
          width: 35px;
          background: transparent;
          border: 1px solid #334151;
          color: #10b981;
          margin-left: 5px;
          text-align: center;
          padding: 2px;
          border-radius: 4px;
          font-size: 10px;
        }

        .total-extras {
          margin-left: auto;
          font-weight: 900;
          color: #10b981;
          background: #064e3b;
          padding: 2px 8px;
          border-radius: 20px;
          font-size: 10px;
        }

        .fow-input {
          width: 80%;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-style: italic;
          outline: none;
          font-size: 11px;
        }

        .modal-footer {
          padding: 12px 20px;
          background: #111827;
          border-top: 1px solid rgba(255,255,255,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .btn-save { background: #3b82f6; color: white; padding: 8px 20px; border-radius: 8px; font-weight: 900; text-transform: uppercase; font-size: 0.65rem; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }
      `}</style>

      <div className="scorecard-modal">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-900 border-b border-white/5">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Match Day Scorecard</h3>
           <button title="Close Modal" onClick={onClose} className="p-1 hover:bg-white/5 rounded-full text-slate-500"><X size={16} /></button>
        </div>

        {/* 1. READ-ONLY SUMMARY BAR */}
        <div className="read-only-summary-bar">
          <div className="context-info">
            <span>{match.tournament}</span> • <span>{match.matchFormat || 'T20'}</span> • <span>Max {match.maxOvers} Overs</span>
          </div>
          <div className="toss-result-strip">
            Toss: {match.toss?.winner} elected to {match.toss?.choice}
          </div>
          
          <div className="team-score-block">
            <img src={match.homeLogo || ""} alt="Home" className="team-logo-small" />
            <span className="team-name-big">INDIAN STRIKERS: {homeRuns}/{homeWkts}</span>
            <span className="vs-divider">VS</span>
            <span className="team-name-big">{(match as any).opponentName || opponentName}: {awayRuns}/{awayWkts}</span>
            <img src={match.opponentLogo || ""} alt="Away" className="team-logo-small" />
          </div>
        </div>

        {/* 2. INNINGS TABS */}
        <div className="tab-control-row">
          <button className={activeInnings === 1 ? 'active' : ''} onClick={() => setActiveInnings(1)}>Innings 1: {innings1Team.name}</button>
          <button className={activeInnings === 2 ? 'active' : ''} onClick={() => setActiveInnings(2)}>Innings 2: {innings2Team.name}</button>
        </div>

        <div className="scorecard-content custom-scrollbar">
          {/* BATTING SECTION */}
          <div className="scorecard-section">
            <div className="section-header-row">
              <h4 className="section-title"><Target size={14} /> {activeInnings === 1 ? innings1Team.name : innings2Team.name} — BATTING</h4>
            </div>
            <table className="compact-table">
              <thead>
                <tr>
                  <th className="text-left">BATTER</th>
                  <th style={{ width: '100px' }}>STATUS</th>
                  <th style={{ width: '120px' }}>FIELDER</th>
                  <th style={{ width: '120px' }}>BOWLER</th>
                  <th style={{ width: '45px' }}>R</th>
                  <th style={{ width: '45px' }}>B</th>
                  <th style={{ width: '35px' }}>4S</th>
                  <th style={{ width: '35px' }}>6S</th>
                  <th style={{ width: '50px' }}>SR</th>
                </tr>
              </thead>
              <tbody>
                {inningsData.batting.map((data, i) => {
                  const squad = activeInnings === 1 ? innings1Team.squad : innings2Team.squad;
                  return (
                    <tr key={i}>
                      <td>
                        <select title="Select Batter" className="player-dropdown" value={data.playerId} onChange={(e) => updateBatting(activeInnings, i, 'playerId', e.target.value)}>
                          <option value="">Select Player...</option>
                          {squad.map((p: any) => {
                            const isSelectedElsewhere = inningsData.batting.some((b, idx) => b.playerId === p.id && idx !== i);
                            return (
                              <option key={p.id} value={p.id} disabled={isSelectedElsewhere}>
                                {p.name} {isSelectedElsewhere ? '(Already Selected)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td>
                        <select 
                          title="Dismissal Status" 
                          className="status-dropdown" 
                          value={data.outHow} 
                          onChange={(e) => updateBatting(activeInnings, i, 'outHow', e.target.value)}
                        >
                          {['Not Out','Bowled','Caught','LBW','Run Out','Stumped','Did Not Bat','Hit Wicket','Retired Hurt','Retired Out'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          title="Select Fielder"
                          className="status-dropdown"
                          value={data.fielderId}
                          disabled={['Not Out', 'Bowled', 'LBW', 'Hit Wicket', 'Retired Hurt', 'Retired Out', 'Did Not Bat'].includes(data.outHow)}
                          onChange={(e) => updateBatting(activeInnings, i, 'fielderId', e.target.value)}
                        >
                          <option value="">Select...</option>
                          {(activeInnings === 1 ? innings2Team.squad : innings1Team.squad).map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          title="Select Bowler"
                          className="status-dropdown"
                          value={data.bowlerId}
                          disabled={['Not Out', 'Run Out', 'Retired Hurt', 'Retired Out', 'Did Not Bat'].includes(data.outHow)}
                          onChange={(e) => updateBatting(activeInnings, i, 'bowlerId', e.target.value)}
                        >
                          <option value="">Select...</option>
                          {(activeInnings === 1 ? innings2Team.squad : innings1Team.squad).map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td><input title="Runs" type="number" className="cell-input" style={{ width: '45px' }} value={data.runs} onChange={(e) => updateBatting(activeInnings, i, 'runs', parseInt(e.target.value) || 0)} /></td>
                      <td><input title="Balls" type="number" className="cell-input" style={{ width: '45px' }} value={data.balls} onChange={(e) => updateBatting(activeInnings, i, 'balls', parseInt(e.target.value) || 0)} /></td>
                      <td><input title="Fours" type="number" className="cell-input" style={{ width: '35px' }} value={data.fours} onChange={(e) => updateBatting(activeInnings, i, 'fours', parseInt(e.target.value) || 0)} /></td>
                      <td><input title="Sixes" type="number" className="cell-input" style={{ width: '35px' }} value={data.sixes} onChange={(e) => updateBatting(activeInnings, i, 'sixes', parseInt(e.target.value) || 0)} /></td>
                      <td>
                        <div className="sr-cell">
                          {data.balls > 0 ? ((data.runs / data.balls) * 100).toFixed(2) : '0.00'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="extras-fow-container">
            <div className="extras-box">
              <span className="label">EXTRAS:</span>
              <span className="value">Wd: <strong>{autoWides}</strong></span>
              <span className="value">Nb: <strong>{autoNBs}</strong></span>
              <input 
                title="Leg Byes"
                type="number" 
                placeholder="LB" 
                className="extra-input" 
                value={inningsData.extras.legByes || ''}
                onChange={(e) => updateExtras('legByes', parseInt(e.target.value) || 0)} 
              />
              <input 
                title="Byes"
                type="number" 
                placeholder="B" 
                className="extra-input" 
                value={inningsData.extras.byes || ''}
                onChange={(e) => updateExtras('byes', parseInt(e.target.value) || 0)} 
              />
              <span className="total-extras">
                Total: {autoWides + autoNBs + (inningsData.extras.legByes || 0) + (inningsData.extras.byes || 0)}
              </span>
            </div>
            
            <div className="fow-box">
              <span className="label">FALL OF WICKETS:</span>
              <input 
                title="Fall of Wickets Timeline"
                type="text" 
                placeholder="1-22 (Adil, 4.2 ov), 2-45..." 
                className="fow-input" 
                value={inningsData.fallOfWickets || ''}
                onChange={(e) => updateFOW(e.target.value)}
              />
            </div>
          </div>

          <div className="scorecard-section">
            <div className="section-header-row">
              <h4 className="section-title"><Zap size={14} /> {activeInnings === 1 ? innings2Team.name : innings1Team.name} — BOWLING</h4>
              <button type="button" onClick={addBowlerRow} className="btn-add-row">+ Add Bowler</button>
            </div>
            <table className="compact-table">
              <thead>
                <tr>
                  <th className="text-left">BOWLER</th>
                  <th style={{ width: '45px' }}>O</th>
                  <th style={{ width: '35px' }}>M</th>
                  <th style={{ width: '45px' }}>R</th>
                  <th style={{ width: '35px' }}>W</th>
                  <th style={{ width: '35px' }}>WD</th>
                  <th style={{ width: '35px' }}>NB</th>
                  <th style={{ width: '40px' }}>DOTS</th>
                  <th style={{ width: '50px' }}>ECON</th>
                </tr>
              </thead>
              <tbody>
                {inningsData.bowling.map((data, i) => {
                  const squad = activeInnings === 1 ? innings2Team.squad : innings1Team.squad;
                  return (
                    <tr key={i}>
                      <td>
                        <select title="Select Bowler" className="player-dropdown" value={data.playerId} onChange={(e) => updateBowling(activeInnings, i, 'playerId', e.target.value)}>
                          <option value="">Select Player...</option>
                          {squad.map((p: any) => {
                            const isSelectedElsewhere = inningsData.bowling.some((b, idx) => b.playerId === p.id && idx !== i);
                            return (
                              <option key={p.id} value={p.id} disabled={isSelectedElsewhere}>
                                {p.name} {isSelectedElsewhere ? '(Already Selected)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td><input title="Overs" type="number" step="0.1" className="cell-input" style={{ width: '45px' }} value={data.overs} onChange={(e) => updateBowling(activeInnings, i, 'overs', parseFloat(e.target.value) || 0)} /></td>
                      <td><input title="Maidens" type="number" className="cell-input" style={{ width: '35px' }} value={data.maidens} onChange={(e) => updateBowling(activeInnings, i, 'maidens', parseInt(e.target.value) || 0)} /></td>
                      <td><input title="Runs" type="number" className="cell-input" style={{ width: '45px' }} value={data.runsConceded} onChange={(e) => updateBowling(activeInnings, i, 'runsConceded', parseInt(e.target.value) || 0)} /></td>
                      <td><input title="Wickets" type="number" className="cell-input" style={{ width: '35px' }} value={data.wickets} onChange={(e) => updateBowling(activeInnings, i, 'wickets', parseInt(e.target.value) || 0)} /></td>
                      <td><input title="Wides" type="number" className="cell-input" style={{ width: '35px' }} value={data.wides} onChange={(e) => updateBowling(activeInnings, i, 'wides', parseInt(e.target.value) || 0)} /></td>
                      <td><input title="No Balls" type="number" className="cell-input" style={{ width: '35px' }} value={data.noBalls} onChange={(e) => updateBowling(activeInnings, i, 'noBalls', parseInt(e.target.value) || 0)} /></td>
                      <td><input title="Dot Balls" type="number" className="cell-input" style={{ width: '40px' }} value={data.dotBalls} onChange={(e) => updateBowling(activeInnings, i, 'dotBalls', parseInt(e.target.value) || 0)} /></td>
                      <td className="sr-cell">
                        {(() => {
                          const oversVal = Number(data.overs || 0);
                          const oversPart = Math.floor(oversVal);
                          const ballsPart = Math.round((oversVal % 1) * 10);
                          const totalBalls = (oversPart * 6) + ballsPart;
                          return totalBalls > 0 ? ((data.runsConceded * 6) / totalBalls).toFixed(2) : '0.00';
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancel text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-400">Discard Changes</button>
          <button onClick={handleSave} className="btn-save">
              <Award size={18} /> Finalize Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}

