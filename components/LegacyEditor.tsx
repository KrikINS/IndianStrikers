import React, { useState, useEffect } from 'react';
import { Player, PlayerLegacyStats } from '../types';
import { getPlayers, getLegacyStats, updateLegacyStats } from '../services/storageService';
import { Save, AlertCircle, CheckCircle2, Search, Filter, User } from 'lucide-react';

const LegacyEditor: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [legacyStats, setLegacyStats] = useState<Record<string, PlayerLegacyStats>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allPlayers, allLegacy] = await Promise.all([
        getPlayers(),
        getLegacyStats()
      ]);

      const legacyMap: Record<string, PlayerLegacyStats> = {};
      allLegacy.forEach((stat) => {
        legacyMap[stat.player_id] = stat;
      });

      setPlayers(allPlayers.sort((a, b) => a.name.localeCompare(b.name)));
      setLegacyStats(legacyMap);
    } catch (err) {
      console.error('Failed to load legacy data:', err);
      setMessage({ text: 'Failed to load statistics database.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (playerId: string, field: keyof PlayerLegacyStats, value: string | number) => {
    setLegacyStats(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || {
          player_id: playerId,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          hundreds: 0,
          fifties: 0,
          ducks: 0,
          matches: 0,
          innings: 0,
          not_outs: 0,
          highest_score: 0,
          overs_bowled: 0,
          runs_conceded: 0,
          wickets: 0,
          maidens: 0,
          four_wickets: 0,
          five_wickets: 0,
          best_bowling: '0/0'
        }),
        [field]: value
      }
    }));
  };

  const saveRow = async (playerId: string) => {
    const stats = legacyStats[playerId];
    if (!stats) return;

    try {
      setSavingId(playerId);
      await updateLegacyStats(playerId, stats);
      setMessage({ text: `Statistics updated for ${players.find(p => p.id === playerId)?.name}`, type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setMessage({ text: 'Failed to save statistics. Check console for details.', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 text-white/50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
        Loading statistics grid...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Club Legacy Statistics Editor
          </h2>
          <p className="text-white/60 text-[13px] mt-1">
            Manually override historical milestones. Changes trigger immediate career profile recalculation.
          </p>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text"
            placeholder="Filter by player name..."
            className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-white text-[13px] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 w-full md:w-64 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border animate-in slide-in-from-top-4 ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-[13px] font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-center">
                <th className="p-2 text-[12px] font-bold text-white/40 uppercase sticky left-0 bg-black/80 backdrop-blur-md z-10 w-40 border-r border-white/5 text-left">Player</th>
                <th className="p-2 text-[12px] font-bold text-indigo-400/80 uppercase bg-indigo-500/5">Mat</th>
                <th className="p-2 text-[12px] font-bold text-indigo-400/80 uppercase bg-indigo-500/5">Inn</th>
                <th className="p-2 text-[12px] font-bold text-indigo-400/80 uppercase bg-indigo-500/5">NO</th>
                <th className="p-2 text-[12px] font-bold text-emerald-400/80 uppercase bg-emerald-500/5 border-l border-white/5">Runs</th>
                <th className="p-2 text-[12px] font-bold text-emerald-400/80 uppercase bg-emerald-500/5">HS</th>
                <th className="p-2 text-[12px] font-bold text-emerald-400/80 uppercase bg-emerald-500/5">100s</th>
                <th className="p-2 text-[12px] font-bold text-emerald-400/80 uppercase bg-emerald-500/5">50s</th>
                <th className="p-2 text-[12px] font-bold text-emerald-400/80 uppercase bg-emerald-500/5">4s</th>
                <th className="p-2 text-[12px] font-bold text-emerald-400/80 uppercase bg-emerald-500/5">6s</th>
                <th className="p-2 text-[12px] font-bold text-emerald-400/80 uppercase bg-emerald-500/5">0s</th>
                <th className="p-2 text-[12px] font-bold text-amber-400/80 uppercase bg-amber-500/5 border-l border-white/5">Overs</th>
                <th className="p-2 text-[12px] font-bold text-amber-400/80 uppercase bg-amber-500/5">Mdn</th>
                <th className="p-2 text-[12px] font-bold text-amber-400/80 uppercase bg-amber-500/5">Runs</th>
                <th className="p-2 text-[12px] font-bold text-amber-400/80 uppercase bg-amber-500/5">Wkts</th>
                <th className="p-2 text-[12px] font-bold text-amber-400/80 uppercase bg-amber-500/5">BBI</th>
                <th className="p-2 text-[12px] font-bold text-amber-400/80 uppercase bg-amber-500/5">4W</th>
                <th className="p-2 text-[12px] font-bold text-amber-400/80 uppercase bg-amber-500/5">5W</th>
                <th className="p-2 text-[12px] font-bold text-white/40 uppercase sticky right-0 bg-black/80 backdrop-blur-md z-10 text-center border-l border-white/5">Save</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                const row = legacyStats[player.id] || {
                  player_id: player.id, runs: 0, balls: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0,
                  matches: 0, innings: 0, not_outs: 0, highest_score: 0, overs_bowled: 0, runs_conceded: 0,
                  wickets: 0, maidens: 0, four_wickets: 0, five_wickets: 0, best_bowling: '0/0'
                };

                return (
                  <tr key={player.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="p-2 sticky left-0 bg-black/90 backdrop-blur-md z-10 border-r border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-white/10 shrink-0">
                          <User size={12} className="text-white/40" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-white truncate leading-tight">{player.name}</p>
                          <p className="text-[10px] text-white/30 truncate leading-none uppercase">{player.role}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* General */}
                    <td className="px-1 py-1 bg-indigo-500/5">
                      <input 
                        type="number" 
                        value={row.matches} 
                        aria-label="Matches"
                        onChange={e => handleInputChange(player.id, 'matches', parseInt(e.target.value) || 0)} 
                        className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-indigo-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-indigo-500/5">
                      <input 
                        type="number" 
                        value={row.innings} 
                        aria-label="Innings"
                        onChange={e => handleInputChange(player.id, 'innings', parseInt(e.target.value) || 0)} 
                        className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-indigo-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-indigo-500/5">
                      <input 
                        type="number" 
                        value={row.not_outs} 
                        aria-label="Not Outs"
                        onChange={e => handleInputChange(player.id, 'not_outs', parseInt(e.target.value) || 0)} 
                        className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-indigo-500/20 outline-none" 
                      />
                    </td>

                    {/* Batting */}
                    <td className="px-1 py-1 bg-emerald-500/5">
                      <input 
                        type="number" 
                        value={row.runs} 
                        aria-label="Runs"
                        onChange={e => handleInputChange(player.id, 'runs', parseInt(e.target.value) || 0)} 
                        className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-emerald-500/20 outline-none font-medium" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-500/5">
                      <input 
                        type="number" 
                        value={row.highest_score} 
                        aria-label="Highest Score"
                        onChange={e => handleInputChange(player.id, 'highest_score', parseInt(e.target.value) || 0)} 
                        className="w-14 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-emerald-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-500/5">
                      <input 
                        type="number" 
                        value={row.hundreds} 
                        aria-label="Hundreds"
                        onChange={e => handleInputChange(player.id, 'hundreds', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-emerald-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-500/5">
                      <input 
                        type="number" 
                        value={row.fifties} 
                        aria-label="Fifties"
                        onChange={e => handleInputChange(player.id, 'fifties', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-emerald-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-500/5">
                      <input 
                        type="number" 
                        value={row.fours} 
                        aria-label="Fours"
                        onChange={e => handleInputChange(player.id, 'fours', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-emerald-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-500/5">
                      <input 
                        type="number" 
                        value={row.sixes} 
                        aria-label="Sixes"
                        onChange={e => handleInputChange(player.id, 'sixes', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-emerald-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-500/5">
                      <input 
                        type="number" 
                        value={row.ducks} 
                        aria-label="Ducks"
                        onChange={e => handleInputChange(player.id, 'ducks', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-emerald-500/20 outline-none" 
                      />
                    </td>

                    {/* Bowling */}
                    <td className="px-1 py-1 bg-amber-500/5">
                      <input 
                        type="number" 
                        step="0.1" 
                        value={row.overs_bowled} 
                        aria-label="Overs Bowled"
                        onChange={e => handleInputChange(player.id, 'overs_bowled', parseFloat(e.target.value) || 0)} 
                        className="w-14 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-amber-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-500/5">
                      <input 
                        type="number" 
                        value={row.maidens} 
                        aria-label="Maidens"
                        onChange={e => handleInputChange(player.id, 'maidens', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-amber-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-500/5">
                      <input 
                        type="number" 
                        value={row.runs_conceded} 
                        aria-label="Runs Conceded"
                        onChange={e => handleInputChange(player.id, 'runs_conceded', parseInt(e.target.value) || 0)} 
                        className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-amber-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-500/5">
                      <input 
                        type="number" 
                        value={row.wickets} 
                        aria-label="Wickets"
                        onChange={e => handleInputChange(player.id, 'wickets', parseInt(e.target.value) || 0)} 
                        className="w-12 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-amber-500/20 outline-none font-medium" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-500/5">
                      <input 
                        type="text" 
                        value={row.best_bowling} 
                        aria-label="Best Bowling"
                        onChange={e => handleInputChange(player.id, 'best_bowling', e.target.value)} 
                        className="w-14 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-amber-500/20 outline-none" 
                        placeholder="w/r" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-500/5">
                      <input 
                        type="number" 
                        value={row.four_wickets} 
                        aria-label="4W Hauls"
                        onChange={e => handleInputChange(player.id, 'four_wickets', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-amber-500/20 outline-none" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-500/5">
                      <input 
                        type="number" 
                        value={row.five_wickets} 
                        aria-label="5W Hauls"
                        onChange={e => handleInputChange(player.id, 'five_wickets', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-[12px] focus:bg-amber-500/20 outline-none" 
                      />
                    </td>

                    <td className="p-1 sticky right-0 bg-black/90 backdrop-blur-md z-10 border-l border-white/5 text-center">
                      <button
                        onClick={() => saveRow(player.id)}
                        disabled={savingId === player.id}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-all mx-auto ${
                          savingId === player.id 
                            ? 'text-indigo-400/20 cursor-not-allowed' 
                            : 'text-indigo-400 hover:bg-indigo-500/20 active:scale-90'
                        }`}
                        title="Save Row"
                      >
                        {savingId === player.id ? (
                          <div className="w-2.5 h-2.5 border-2 border-indigo-400 border-b-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Save size={12} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LegacyEditor;
