import React, { useState, useEffect } from 'react';
import { Player, PlayerLegacyStats } from '../types';
import { getPlayers, getLegacyStats, updateLegacyStats } from '../services/storageService';
import { useStore } from '../store/StoreProvider';
import { Save, AlertCircle, CheckCircle2, Search, Filter, User } from 'lucide-react';

interface LegacyEditorProps {}

const LegacyEditor: React.FC<LegacyEditorProps> = () => {
  const { squadPlayers: initialPlayers, updatePlayer: onUpdatePlayer } = useStore();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [legacyStats, setLegacyStats] = useState<Record<string, PlayerLegacyStats>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setPlayers([...initialPlayers].sort((a, b) => a.name.localeCompare(b.name)));
    
    // Force re-fetch if we are stuck in mock data (length < 5)
    if (initialPlayers.length > 0 && initialPlayers.length < 5) {
      console.warn("[LegacyEditor] Detected mock/low player count. Forcing re-sync...");
      if (window.refreshAppData) {
        window.refreshAppData();
      }
    }
    // Cleanup offline cache if we have real data
    if (initialPlayers.length > 2) {
      localStorage.removeItem('ins_offline_players');
    }
  }, [initialPlayers]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allLegacy] = await Promise.all([
        getLegacyStats()
      ]);

      const legacyMap: Record<string, PlayerLegacyStats> = {};
      allLegacy?.forEach((stat) => {
        legacyMap[String(stat.player_id)] = stat;
      });

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
      [String(playerId)]: {
        ...(prev[String(playerId)] || {
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
          bowling_innings: 0,
          four_wickets: 0,
          five_wickets: 0,
          wides: 0,
          no_balls: 0,
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
      
      // Sanitization: Ensure only whitelisted fields are sent to the API
      const sanitizedStats = { ...stats };
      delete (sanitizedStats as any).player_id;
      delete (sanitizedStats as any).updated_at;
      delete (sanitizedStats as any).created_at;

      await updateLegacyStats(playerId, sanitizedStats);
      setMessage({ text: `Statistics successfully persisted for ${players.find(p => String(p.id) === String(playerId))?.name}`, type: 'success' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3500);
    } catch (err) {
      console.error('Save failed:', err);
      setMessage({ text: 'Failed to save statistics. Check console for details.', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const filteredPlayers = (players || [])
    .filter(p => p.teamId === 'IND_STRIKERS')
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
        <div className={`fixed top-6 right-6 z-[10000] p-4 rounded-xl flex items-center gap-3 border shadow-2xl animate-in slide-in-from-right-full duration-500 ${
          message.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="text-[13px] font-bold uppercase tracking-tight">{message.text}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1600px]">
            <thead>
              <tr className="bg-slate-900/95 border-b border-white/10">
                <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase sticky left-0 bg-slate-900 z-20 w-48 border-r border-white/5 text-left">Player</th>
                <th className="px-1 py-2 text-[12px] font-bold text-indigo-400 uppercase bg-indigo-500/10 text-center">Mat</th>
                <th className="px-1 py-2 text-[12px] font-bold text-indigo-400 uppercase bg-indigo-500/10 text-center">Inn</th>
                <th className="px-1 py-2 text-[12px] font-bold text-indigo-400 uppercase bg-indigo-500/10 text-center">NO</th>
                <th className="px-1 py-2 text-[12px] font-bold text-emerald-400 uppercase bg-emerald-500/10 border-l border-white/5 text-center">Runs</th>
                <th className="px-1 py-2 text-[12px] font-bold text-emerald-400 uppercase bg-emerald-500/10 text-center">Balls</th>
                <th className="px-1 py-2 text-[12px] font-bold text-emerald-400 uppercase bg-emerald-500/10 text-center">HS</th>
                <th className="px-1 py-2 text-[12px] font-bold text-emerald-400 uppercase bg-emerald-500/10 text-center">100s</th>
                <th className="px-1 py-2 text-[12px] font-bold text-emerald-400 uppercase bg-emerald-500/10 text-center">50s</th>
                <th className="px-1 py-2 text-[12px] font-bold text-emerald-400 uppercase bg-emerald-500/10 text-center">4s</th>
                <th className="px-1 py-2 text-[12px] font-bold text-emerald-400 uppercase bg-emerald-500/10 text-center">6s</th>
                <th className="px-1 py-2 text-[12px] font-bold text-emerald-400 uppercase bg-emerald-500/10 text-center">0s</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 border-l border-white/5 text-center">Inn</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 text-center">Overs</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 text-center">Mdn</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 text-center">Runs</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 text-center">Wkts</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 text-center">BBI</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 text-center">4W</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 text-center">5W</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 text-center">WD</th>
                <th className="px-1 py-2 text-[12px] font-bold text-amber-400 uppercase bg-amber-500/10 text-center">NB</th>
                <th className="px-1 py-2 text-[12px] font-bold text-white/60 uppercase sticky right-0 bg-slate-900 z-20 text-center border-l border-white/5">Save</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers?.map((player) => {
                const row = legacyStats[String(player.id)] || {
                   player_id: player.id, runs: 0, balls: 0, fours: 0, sixes: 0, hundreds: 0, fifties: 0, ducks: 0,
                   matches: 0, innings: 0, not_outs: 0, highest_score: 0, bowling_innings: 0, overs_bowled: 0, runs_conceded: 0,
                   wickets: 0, maidens: 0, four_wickets: 0, five_wickets: 0, best_bowling: '0/0',
                   wides: 0, no_balls: 0
                };

                return (
                  <tr key={player.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-2 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                          <User size={12} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-slate-900 truncate leading-tight">{player.name}</p>
                          <p className="text-[10px] text-slate-400 truncate leading-none uppercase">{player.role}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* General */}
                    <td className="px-1 py-1 bg-indigo-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.matches} 
                        aria-label="Matches"
                        onChange={e => handleInputChange(player.id, 'matches', parseInt(e.target.value) || 0)} 
                        className="w-12 bg-white border border-slate-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-indigo-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.innings} 
                        aria-label="Innings"
                        onChange={e => handleInputChange(player.id, 'innings', parseInt(e.target.value) || 0)} 
                        className="w-12 bg-white border border-slate-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-indigo-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.not_outs} 
                        aria-label="Not Outs"
                        onChange={e => handleInputChange(player.id, 'not_outs', parseInt(e.target.value) || 0)} 
                        className="w-12 bg-white border border-slate-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm text-center" 
                      />
                    </td>

                    {/* Batting */}
                    <td className="px-1 py-1 bg-emerald-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.runs} 
                        aria-label="Runs"
                        onChange={e => handleInputChange(player.id, 'runs', parseInt(e.target.value) || 0)} 
                        className="w-16 bg-white border border-emerald-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-emerald-500 outline-none font-bold shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.balls} 
                        aria-label="Balls Faced"
                        onChange={e => handleInputChange(player.id, 'balls', parseInt(e.target.value) || 0)} 
                        className="w-14 bg-white border border-emerald-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.highest_score} 
                        aria-label="Highest Score"
                        onChange={e => handleInputChange(player.id, 'highest_score', parseInt(e.target.value) || 0)} 
                        className="w-14 bg-white border border-emerald-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.hundreds} 
                        aria-label="Hundreds"
                        onChange={e => handleInputChange(player.id, 'hundreds', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white border border-emerald-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.fifties} 
                        aria-label="Fifties"
                        onChange={e => handleInputChange(player.id, 'fifties', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white border border-emerald-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.fours} 
                        aria-label="Fours"
                        onChange={e => handleInputChange(player.id, 'fours', parseInt(e.target.value) || 0)} 
                        className="w-14 bg-white border border-emerald-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.sixes} 
                        aria-label="Sixes"
                        onChange={e => handleInputChange(player.id, 'sixes', parseInt(e.target.value) || 0)} 
                        className="w-14 bg-white border border-emerald-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-emerald-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.ducks} 
                        aria-label="Ducks"
                        onChange={e => handleInputChange(player.id, 'ducks', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white border border-emerald-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm text-center" 
                      />
                    </td>

                    {/* Bowling */}
                    <td className="px-1 py-1 bg-amber-50/30 text-center border-l border-slate-100">
                      <input 
                        type="number" 
                        value={row.bowling_innings || 0} 
                        aria-label="Bowling Innings"
                        onChange={e => handleInputChange(player.id, 'bowling_innings', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-50/30 text-center">
                      <input 
                        type="number" 
                        step="0.1" 
                        value={row.overs_bowled} 
                        aria-label="Overs Bowled"
                        onChange={e => handleInputChange(player.id, 'overs_bowled', parseFloat(e.target.value) || 0)} 
                        className="w-14 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.maidens} 
                        aria-label="Maidens"
                        onChange={e => handleInputChange(player.id, 'maidens', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.runs_conceded} 
                        aria-label="Runs Conceded"
                        onChange={e => handleInputChange(player.id, 'runs_conceded', parseInt(e.target.value) || 0)} 
                        className="w-16 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.wickets} 
                        aria-label="Wickets"
                        onChange={e => handleInputChange(player.id, 'wickets', parseInt(e.target.value) || 0)} 
                        className="w-12 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none font-bold shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-50/30 text-center">
                      <input 
                        type="text" 
                        value={row.best_bowling} 
                        aria-label="Best Bowling"
                        onChange={e => handleInputChange(player.id, 'best_bowling', e.target.value)} 
                        className="w-14 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm text-center" 
                        placeholder="w/r" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.four_wickets} 
                        aria-label="4W Hauls"
                        onChange={e => handleInputChange(player.id, 'four_wickets', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.five_wickets} 
                        aria-label="5W Hauls"
                        onChange={e => handleInputChange(player.id, 'five_wickets', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.wides || 0} 
                        aria-label="Wides"
                        onChange={e => handleInputChange(player.id, 'wides', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm text-center" 
                      />
                    </td>
                    <td className="px-1 py-1 bg-amber-50/30 text-center">
                      <input 
                        type="number" 
                        value={row.no_balls || 0} 
                        aria-label="No Balls"
                        onChange={e => handleInputChange(player.id, 'no_balls', parseInt(e.target.value) || 0)} 
                        className="w-10 bg-white border border-amber-200 rounded px-1 py-1 text-slate-900 text-[12px] focus:ring-1 focus:ring-amber-500 outline-none shadow-sm text-center" 
                      />
                    </td>

                    <td className="p-1 sticky right-0 bg-white z-10 border-l border-slate-100 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] text-center">
                      <button
                        onClick={() => saveRow(player.id)}
                        disabled={savingId === player.id}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-all mx-auto ${
                           savingId === player.id 
                             ? 'text-indigo-600/20 cursor-not-allowed' 
                             : 'text-indigo-600 hover:bg-indigo-50 active:scale-90'
                        }`}
                        title="Save Row"
                      >
                        {savingId === player.id ? (
                          <div className="w-2.5 h-2.5 border-2 border-indigo-600 border-b-transparent rounded-full animate-spin"></div>
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
