
import React, { useState, useEffect } from 'react';
import { Player, Match, TournamentTableEntry, OpponentTeam } from '../types';
import { getOpponents, getTournamentTable, saveTournamentTable } from '../services/storageService';
import { Trophy, Medal, Star, Flame, Crown, Plus, Trash2, Zap, Award, Target, Hash, Calendar, History } from 'lucide-react';

interface DashboardProps {
  players: Player[];
  matches: Match[];
}

const Dashboard: React.FC<DashboardProps> = ({ players, matches }) => {
  const [tournamentName, setTournamentName] = useState('Winter Cup 2024');
  const [groupNumber, setGroupNumber] = useState('A');
  const [tableData, setTableData] = useState<TournamentTableEntry[]>([]);
  const [opponents, setOpponents] = useState<OpponentTeam[]>([]);
  
  // Stats Mode State (Default: Career)
  const [statsMode, setStatsMode] = useState<'career' | 'season'>('career');

  // Load opponents and table data
  useEffect(() => {
    setOpponents(getOpponents());
    setTableData(getTournamentTable());
  }, []);

  // -- Top Performers Logic --
  const processedPlayers = players.map(p => {
    const isCareer = statsMode === 'career';
    return {
        ...p,
        displayRuns: isCareer ? p.runsScored : Math.round(p.runsScored * 0.34), // Simulation for demo
        displayWickets: isCareer ? p.wicketsTaken : Math.round(p.wicketsTaken * 0.34) // Simulation for demo
    };
  });

  const topRunScorers = [...processedPlayers]
    .sort((a, b) => b.displayRuns - a.displayRuns)
    .slice(0, 5);

  const topWicketTakers = [...processedPlayers]
    .sort((a, b) => b.displayWickets - a.displayWickets)
    .slice(0, 5);

  // -- Latest Match Performers Logic --
  // Find the most recent completed match
  const lastCompletedMatch = matches
    .filter(m => !m.isUpcoming && m.result)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const latestMatchHeroes = players.filter(p => {
    const isBatsmanHero = (p.role === 'Batsman' || p.role === 'All-Rounder') && p.runsScored > 200;
    const isBowlerHero = (p.role === 'Bowler' || p.role === 'All-Rounder') && p.wicketsTaken > 10;
    return isBatsmanHero || isBowlerHero;
  }).slice(0, 6); 

  // -- Table Logic --
  const handleAddRow = () => {
    const newEntry: TournamentTableEntry = {
      id: Date.now().toString(),
      teamId: '',
      teamName: '',
      matches: 0,
      won: 0,
      lost: 0,
      nr: 0,
      points: 0,
      nrr: '0.000'
    };
    const updated = [...tableData, newEntry];
    setTableData(updated);
    saveTournamentTable(updated);
  };

  const handleDeleteRow = (id: string) => {
    const updated = tableData.filter(t => t.id !== id);
    setTableData(updated);
    saveTournamentTable(updated);
  };

  const handleTableChange = (id: string, field: keyof TournamentTableEntry, value: any) => {
    const updated = tableData.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    });
    setTableData(updated);
    saveTournamentTable(updated);
  };

  const handleTeamSelect = (id: string, teamId: string) => {
    if (teamId === 'home') {
      handleTableChange(id, 'teamName', 'Indian Strikers');
      handleTableChange(id, 'teamId', 'home');
    } else {
      const opp = opponents.find(o => o.id === teamId);
      if (opp) {
        handleTableChange(id, 'teamName', opp.name);
        handleTableChange(id, 'teamId', opp.id);
      }
    }
  };

  const calculateWinPercentage = (won: number, matches: number) => {
    if (!matches) return '0.00%';
    return `${((won / matches) * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-fade-in pb-12 w-full overflow-hidden">
      
      {/* 1. Hero Section */}
      <div className="text-center py-4 md:py-6">
        <h1 className="text-3xl md:text-6xl font-black tracking-tighter uppercase transparent bg-clip-text bg-gradient-to-r from-orange-500 via-white to-green-500 drop-shadow-sm leading-tight" style={{ WebkitTextStroke: '1px #cbd5e1' }}>
          One Team, One Dream
        </h1>
        <div className="h-1 w-16 md:w-24 bg-blue-600 mx-auto mt-2 md:mt-4 rounded-full"></div>
      </div>

      {/* 2. Team Legacy & Match Heroes */}
      <div className="grid lg:grid-cols-12 gap-4 md:gap-8">
        {/* Team Achievements */}
        <div className="lg:col-span-5 xl:col-span-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl md:rounded-3xl shadow-xl p-6 md:p-8 text-white relative overflow-hidden flex flex-col justify-center min-h-[250px]">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Trophy size={180} /></div>
            
            <h3 className="text-xl md:text-2xl font-black mb-6 md:mb-8 relative z-10 flex items-center gap-3">
              <Award className="text-yellow-400" /> Team Legacy
            </h3>

            <div className="grid grid-cols-3 gap-3 md:gap-4 relative z-10">
               <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-4 text-center border border-white/10 hover:bg-white/20 transition-colors">
                  <div className="text-yellow-400 mb-2 flex justify-center"><Trophy size={24} className="md:w-7 md:h-7" /></div>
                  <div className="text-2xl md:text-3xl font-black mb-1">7</div>
                  <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-300">Winners</div>
               </div>
               <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-4 text-center border border-white/10 hover:bg-white/20 transition-colors">
                  <div className="text-slate-300 mb-2 flex justify-center"><Medal size={24} className="md:w-7 md:h-7" /></div>
                  <div className="text-2xl md:text-3xl font-black mb-1">5</div>
                  <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-300">Runners-Up</div>
               </div>
               <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 md:p-4 text-center border border-white/10 hover:bg-white/20 transition-colors">
                  <div className="text-orange-400 mb-2 flex justify-center"><Star size={24} className="md:w-7 md:h-7" /></div>
                  <div className="text-2xl md:text-3xl font-black mb-1">22</div>
                  <div className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-300">Semi Finalist</div>
               </div>
            </div>
        </div>

        {/* Latest Match Performers Carousel */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col justify-center space-y-3 md:space-y-4">
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 px-1">
              <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                 <Zap className="text-yellow-500 fill-yellow-500" size={20} /> Match Day Heroes
              </h3>
              {lastCompletedMatch && (
                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                  vs {lastCompletedMatch.opponent} ({new Date(lastCompletedMatch.date).toLocaleDateString()})
                </span>
              )}
           </div>

           {!lastCompletedMatch ? (
             <div className="bg-slate-100 rounded-2xl p-8 text-center text-slate-400 font-medium border border-slate-200 h-full flex items-center justify-center">
               No completed matches to show performers.
             </div>
           ) : (
             <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                {latestMatchHeroes.map((player) => (
                  <div key={player.id} className="min-w-[160px] md:min-w-[200px] bg-white rounded-2xl p-4 border border-slate-100 shadow-sm snap-center hover:shadow-md transition-shadow">
                     <div className="flex flex-col items-center text-center">
                        <div className="relative mb-3">
                           <img src={player.avatarUrl} className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover shadow-md" />
                           <div className="absolute -bottom-2 bg-slate-900 text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">
                             {player.role === 'Bowler' ? '2+ Wkts' : '40+ Runs'}
                           </div>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm md:text-base">{player.name}</h4>
                        <p className="text-xs text-slate-500 mb-3">{player.role}</p>
                        
                        <div className="flex gap-2 w-full">
                           {player.role === 'Bowler' ? (
                              <div className="flex-1 bg-red-50 rounded-lg p-2">
                                 <p className="text-[9px] md:text-[10px] uppercase font-bold text-red-400">Figures</p>
                                 <p className="font-bold text-red-700 text-xs md:text-sm">3/24</p>
                              </div>
                           ) : (
                              <div className="flex-1 bg-green-50 rounded-lg p-2">
                                 <p className="text-[9px] md:text-[10px] uppercase font-bold text-green-400">Score</p>
                                 <p className="font-bold text-green-700 text-xs md:text-sm">45(28)</p>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
      
      {/* 3. Tournament Group Table (Moved Up) */}
      <div className="bg-slate-900 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 w-full">
         <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 md:p-6 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
               <h3 className="text-white font-black text-lg md:text-xl flex items-center gap-2">
                 <Hash className="text-blue-500" /> Points Table
               </h3>
               <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tournament</label>
                    <input 
                      value={tournamentName} 
                      onChange={(e) => setTournamentName(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white text-sm font-bold px-3 py-1.5 rounded-lg w-full focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Group</label>
                    <input 
                      value={groupNumber} 
                      onChange={(e) => setGroupNumber(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-white text-sm font-bold px-3 py-1.5 rounded-lg w-20 text-center focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
               </div>
            </div>
            <button 
              onClick={handleAddRow}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-xs md:text-sm transition-colors w-full md:w-auto justify-center"
            >
              <Plus size={16} /> Add Team
            </button>
         </div>

         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs md:text-sm min-w-[600px]">
               <thead className="bg-[#00703c] text-white font-bold uppercase text-[10px] md:text-xs">
                  <tr>
                     <th className="p-2 md:p-4 text-left">#</th>
                     <th className="p-2 md:p-4 text-left min-w-[120px]">Team</th>
                     <th className="p-2 md:p-4 text-center">Mat</th>
                     <th className="p-2 md:p-4 text-center">Won</th>
                     <th className="p-2 md:p-4 text-center">Lost</th>
                     <th className="p-2 md:p-4 text-center hidden sm:table-cell">N/R</th>
                     <th className="p-2 md:p-4 text-center text-yellow-300">Pts</th>
                     <th className="p-2 md:p-4 text-center text-slate-300 font-mono text-[10px] md:text-xs">Win %</th>
                     <th className="p-2 md:p-4 text-center hidden sm:table-cell">Net RR</th>
                     <th className="p-2 md:p-4 w-8"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                  {tableData.length === 0 ? (
                    <tr><td colSpan={10} className="p-8 text-center text-slate-500 italic">No teams added to the group table yet.</td></tr>
                  ) : (
                    tableData.map((row, idx) => (
                      <tr key={row.id} className="bg-slate-900 hover:bg-slate-800 transition-colors group">
                         <td className="p-2 md:p-4 text-slate-400 font-mono">{idx + 1}</td>
                         <td className="p-2 md:p-4">
                            <select 
                              value={row.teamId} 
                              onChange={(e) => handleTeamSelect(row.id, e.target.value)}
                              className="bg-transparent text-white font-bold w-full outline-none cursor-pointer text-xs md:text-sm"
                            >
                               <option value="" className="bg-slate-900 text-slate-500">Select...</option>
                               <option value="home" className="bg-slate-900 text-white font-bold">Indian Strikers</option>
                               {opponents.map(opp => (
                                 <option key={opp.id} value={opp.id} className="bg-slate-900 text-white">{opp.name}</option>
                               ))}
                            </select>
                         </td>
                         <td className="p-2 md:p-4 text-center"><input type="number" value={row.matches} onChange={(e) => handleTableChange(row.id, 'matches', Number(e.target.value))} className="w-8 md:w-12 bg-transparent text-center text-white outline-none focus:bg-slate-800 rounded" /></td>
                         <td className="p-2 md:p-4 text-center"><input type="number" value={row.won} onChange={(e) => handleTableChange(row.id, 'won', Number(e.target.value))} className="w-8 md:w-12 bg-transparent text-center text-green-400 font-bold outline-none focus:bg-slate-800 rounded" /></td>
                         <td className="p-2 md:p-4 text-center"><input type="number" value={row.lost} onChange={(e) => handleTableChange(row.id, 'lost', Number(e.target.value))} className="w-8 md:w-12 bg-transparent text-center text-red-400 font-bold outline-none focus:bg-slate-800 rounded" /></td>
                         <td className="p-2 md:p-4 text-center hidden sm:table-cell"><input type="number" value={row.nr} onChange={(e) => handleTableChange(row.id, 'nr', Number(e.target.value))} className="w-8 md:w-12 bg-transparent text-center text-slate-400 outline-none focus:bg-slate-800 rounded" /></td>
                         <td className="p-2 md:p-4 text-center"><input type="number" value={row.points} onChange={(e) => handleTableChange(row.id, 'points', Number(e.target.value))} className="w-8 md:w-12 bg-transparent text-center text-yellow-400 font-black text-sm md:text-lg outline-none focus:bg-slate-800 rounded" /></td>
                         <td className="p-2 md:p-4 text-center text-slate-300 font-mono text-[10px] md:text-xs">{calculateWinPercentage(row.won, row.matches)}</td>
                         <td className="p-2 md:p-4 text-center hidden sm:table-cell"><input type="text" value={row.nrr} onChange={(e) => handleTableChange(row.id, 'nrr', e.target.value)} className="w-16 bg-transparent text-center text-blue-300 font-mono outline-none focus:bg-slate-800 rounded" /></td>
                         <td className="p-2 md:p-4 text-center">
                            <button onClick={() => handleDeleteRow(row.id)} className="text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                         </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* 4. Top Stats (Full Width) */}
      <div className="bg-white rounded-2xl md:rounded-3xl shadow-lg border border-slate-100 p-4 md:p-6 overflow-hidden relative">
           <div className="absolute top-0 right-0 p-4 opacity-5"><Target size={120} /></div>
           
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 md:mb-6 relative z-10 gap-3">
              <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                <Crown size={20} className="text-yellow-500 fill-yellow-500" /> 
                {statsMode === 'career' ? 'All-Time Leaders' : 'Season Leaders'}
              </h3>
              
              {/* Toggle Switch */}
              <div className="bg-slate-100 p-1 rounded-full flex items-center border border-slate-200 self-end sm:self-auto">
                 <button 
                   onClick={() => setStatsMode('career')}
                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statsMode === 'career' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <History size={12} /> Career
                 </button>
                 <button 
                   onClick={() => setStatsMode('season')}
                   className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${statsMode === 'season' ? 'bg-white shadow-sm text-green-700' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                    <Calendar size={12} /> Season
                 </button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10">
              {/* Batting */}
              <div className="space-y-3 md:space-y-4">
                 <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-slate-100 pb-2 mb-2">
                   <Flame size={12} className="text-orange-500" /> Run Machines
                 </h4>
                 {topRunScorers.map((player, idx) => (
                   <div key={player.id} className="flex items-center gap-2 md:gap-3 group">
                      <div className="relative shrink-0">
                        <img src={player.avatarUrl} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-slate-100 object-cover" />
                        <span className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[9px] md:text-[10px] font-bold w-3.5 h-3.5 md:w-4 md:h-4 flex items-center justify-center rounded-full border border-white">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{player.name}</p>
                            <span className="text-xs font-black text-slate-600">{player.displayRuns}</span>
                         </div>
                         <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                            <div className="h-full bg-orange-500 rounded-full transition-all duration-1000" style={{ width: `${(player.displayRuns / (topRunScorers[0]?.displayRuns || 1)) * 100}%` }}></div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>

              {/* Bowling */}
              <div className="space-y-3 md:space-y-4 md:border-l border-slate-100 md:pl-8">
                 <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-slate-100 pb-2 mb-2">
                   <Zap size={12} className="text-blue-500" /> Wicket Takers
                 </h4>
                 {topWicketTakers.map((player, idx) => (
                   <div key={player.id} className="flex items-center gap-2 md:gap-3 group">
                      <div className="relative shrink-0">
                        <img src={player.avatarUrl} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-slate-100 object-cover" />
                        <span className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[9px] md:text-[10px] font-bold w-3.5 h-3.5 md:w-4 md:h-4 flex items-center justify-center rounded-full border border-white">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{player.name}</p>
                            <span className="text-xs font-black text-slate-600">{player.displayWickets}</span>
                         </div>
                         <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                            <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${(player.displayWickets / (topWicketTakers[0]?.displayWickets || 1)) * 100}%` }}></div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
      </div>
    </div>
  );
};

export default Dashboard;
