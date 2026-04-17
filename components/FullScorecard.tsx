import React from 'react';
import { ScheduledMatch, Performer, Player } from '../types';
import { Trophy, Calendar, MapPin, User, Target, Shield, Award, Zap } from 'lucide-react';

interface FullScorecardProps {
  match: ScheduledMatch;
  homeTeamName: string;
  opponentName: string;
  groundName?: string;
  players?: Player[];
}

export const FullScorecard: React.FC<FullScorecardProps> = ({ match, homeTeamName, opponentName, groundName, players = [] }) => {
  const battingPerformers = (Array.isArray(match.performers) ? match.performers : []).filter((p: Performer) => p.runs > 0 || p.balls > 0 || p.isNotOut) || [];
  const bowlingPerformers = (Array.isArray(match.performers) ? match.performers : []).filter((p: Performer) => p.bowlingOvers > 0) || [];

  return (
    <div className="scorecard-container shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      {/* Scorecard Header */}
      <div className="mb-10 px-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                    {match.tournament}
                </span>
                <span className="px-3 py-1 bg-sky-600/20 text-sky-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-sky-500/20">
                    {match.stage}
                </span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Full Scorecard</h2>
            <div className="flex flex-wrap items-center gap-4 text-slate-400 text-sm font-medium">
              <span className="flex items-center gap-1.5"><Calendar size={16} className="text-blue-500" /> {match.date ? new Date(match.date).toDateString() : 'Date TBD'}</span>
              <span className="flex items-center gap-1.5"><MapPin size={16} className="text-sky-500" /> {(groundName || (match as any).ground || 'Home Ground').toUpperCase()}</span>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[200px]">
                <div className="text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Match Status</p>
                    <p className="text-sky-400 font-bold italic text-sm">{match.resultNote || match.resultSummary || 'Outcome Pending'}</p>
                </div>
          </div>
        </div>
      </div>

      {/* BATTING SECTION */}
      <section className="mb-10">
        <h4 className="table-title">BATTING: {(homeTeamName || 'Home Team').toUpperCase()}</h4>
        <table className="scorecard-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Batter</th>
              <th>Status</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            {(battingPerformers as Performer[]).length > 0 ? (battingPerformers as Performer[]).map((player: Performer, idx: number) => (
              <tr key={idx}>
                <td style={{ fontWeight: 'bold' }}>{player.playerName || 'Player Name'}</td>
                <td style={{ fontSize: '11px', color: player.isNotOut ? '#38bdf8' : '#888' }}>
                    {player.isNotOut ? 'not out' : (player.outHow || 'out')}
                </td>
                <td className="font-black text-white">{player.runs}</td>
                <td>{player.balls}</td>
                <td>{player.fours || '-'}</td>
                <td>{player.sixes || '-'}</td>
                <td style={{ color: '#3498db', fontWeight: 'bold' }}>
                    {player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0'}
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-600 italic">No batting stats available</td>
                </tr>
            )}
          </tbody>
        </table>

        {/* DNB Logic */}
        {match.homeTeamXI && match.homeTeamXI.length > 0 && (
          <div className="mt-2 py-2 px-3 bg-white/5 rounded-lg border border-white/5 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Did Not Bat:</span>
            <div className="flex flex-wrap gap-x-2 text-[11px] font-bold text-slate-300">
              {match.homeTeamXI
                .filter(id => !battingPerformers.some(p => p.playerId === id || p.playerName === id))
                .map((id, i, arr) => (
                  <span key={id}>
                    {players.find(p => p.id === id)?.name || id}{i < arr.length - 1 ? ',' : ''}
                  </span>
                ))
              }
              {match.homeTeamXI.filter(name => !battingPerformers.some(p => p.playerName === name)).length === 0 && (
                <span className="italic opacity-40">None</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* BOWLING SECTION */}
      <section>
        <h4 className="table-title">BOWLING: {(homeTeamName || 'Home Team').toUpperCase()}</h4>
        <table className="scorecard-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Bowler</th>
              <th>O</th>
              <th>M</th>
              <th>R</th>
              <th>W</th>
              <th>ECON</th>
            </tr>
          </thead>
          <tbody>
            {(bowlingPerformers as Performer[]).length > 0 ? (bowlingPerformers as Performer[]).map((bowler: Performer, idx: number) => (
              <tr key={idx}>
                <td style={{ fontWeight: 'bold' }}>{bowler.playerName || 'Bowler Name'}</td>
                <td>{bowler.bowlingOvers}</td>
                <td>{bowler.maidens || 0}</td>
                <td>{bowler.bowlingRuns}</td>
                <td style={{ color: '#38bdf8', fontWeight: 'bold' }}>{bowler.wickets}</td>
                <td style={{ color: '#3498db', fontWeight: 'bold' }}>
                    {bowler.bowlingOvers > 0 ? (bowler.bowlingRuns / bowler.bowlingOvers).toFixed(2) : '0.00'}
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-600 italic">No bowling stats available</td>
                </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Footer Branding */}
      <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
            <div className="flex items-center gap-2">
                <Zap size={12} className="text-yellow-500" /> INDIAN STRIKERS MATCH CENTER
            </div>
            <div>RECORD ID: {match.id.slice(0, 8)}</div>
      </div>
    </div>
  );
};
