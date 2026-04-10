import React, { useState, useEffect } from 'react';
import { TournamentTableEntry, OpponentTeam, UserRole } from '../types';
import { getTournamentTable, saveTournamentTableEntry, deleteTournamentTableEntry } from '../services/storageService';
import { Hash, Loader2, Plus, Trash2 } from 'lucide-react';

interface PointsTableProps {
  userRole?: UserRole;
  opponents: OpponentTeam[];
  tournaments: any[];
}

const PointsTable: React.FC<PointsTableProps> = ({ userRole = 'guest', opponents, tournaments }) => {
  const [tournamentName, setTournamentName] = useState(tournaments.length > 0 ? tournaments[0].name : '');
  const [groupNumber, setGroupNumber] = useState('A');
  const [tableData, setTableData] = useState<TournamentTableEntry[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const tbl = await getTournamentTable(tournamentName);
        const hydratedTable = tbl.map(row => {
          if (!row.teamName || row.teamName.trim() === '') {
            if (row.teamId === 'home') return { ...row, teamName: 'Indian Strikers' };
            const found = opponents.find(o => o.id === row.teamId);
            if (found) return { ...row, teamName: found.name };
          }
          return row;
        });
        setTableData(hydratedTable);
        setIsDirty(false);
      } catch (e) {
        console.error("Failed to load table data", e);
      }
    };
    if (tournamentName) load();
  }, [tournamentName, opponents]);

  const canEdit = userRole === 'admin' || userRole === 'scorer';

  const handleAddRow = () => {
    const newEntry: TournamentTableEntry = {
      id: crypto.randomUUID(),
      teamId: '',
      teamName: '',
      tournamentName: tournamentName,
      matches: 0,
      won: 0,
      lost: 0,
      nr: 0,
      points: 0,
      nrr: '0.000'
    };
    setTableData([...tableData, newEntry]);
    setIsDirty(true);
  };

  const handleDeleteRow = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this row?')) return;
    setTableData(tableData.filter(t => t.id !== id));
    setIsDirty(true);
    try {
      await deleteTournamentTableEntry(id);
    } catch (e) {
      console.warn("Backend delete failed:", e);
    }
  };

  const handleTableChange = (id: string, field: keyof TournamentTableEntry, value: any) => {
    setTableData(tableData.map(row => (row.id === id ? { ...row, [field]: value } : row)));
    setIsDirty(true);
  };

  const handleSaveTable = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    try {
      const validRows = tableData.filter(entry => entry.teamId);
      await Promise.all(validRows.map(entry => saveTournamentTableEntry({ ...entry, tournamentName: entry.tournamentName || tournamentName })));
      setIsDirty(false);
    } catch (e: any) {
      alert(`Failed to save table: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
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
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 w-full">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 md:p-6 border-b border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h3 className="text-white font-black text-lg md:text-xl flex items-center gap-2">
            <Hash className="text-blue-500" /> Points Table
          </h3>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tournament</label>
              <select
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                title="Select Tournament"
                aria-label="Select tournament for standings"
                className="bg-slate-950 border border-slate-700 text-white text-sm font-bold px-3 py-1.5 rounded-lg w-full focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="">Select Tournament...</option>
                {tournaments.map((t: any) => (
                  <option key={t.id} value={t.name}>{t.name} ({t.year})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Group</label>
              <input
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
                title="Group Name"
                aria-label="Enter group designation (e.g. A, B)"
                placeholder="Group"
                className="bg-slate-950 border border-slate-700 text-white text-sm font-bold px-3 py-1.5 rounded-lg w-20 text-center focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleSaveTable}
              disabled={!isDirty || isSaving}
              className={`px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all shadow-lg ${
                isDirty && !isSaving ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500'
              }`}
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
            </button>
            <button
              onClick={handleAddRow}
              className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-lg"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-xs md:text-sm min-w-[600px]">
          <thead className="bg-[#1e3a8a] text-white font-bold uppercase text-[10px]">
            <tr>
              <th className="p-2 md:p-4 text-left">#</th>
              <th className="p-2 md:p-4 text-left min-w-[120px]">Team</th>
              <th className="p-2 md:p-4 text-center">Mat</th>
              <th className="p-2 md:p-4 text-center">Won</th>
              <th className="p-2 md:p-4 text-center">Lost</th>
              <th className="p-2 md:p-4 text-center hidden sm:table-cell">N/R</th>
              <th className="p-2 md:p-4 text-center text-yellow-300">Pts</th>
              <th className="p-2 md:p-4 text-center text-slate-300 font-mono">Win %</th>
              <th className="p-2 md:p-4 text-center hidden sm:table-cell">Net RR</th>
              <th className="p-2 md:p-4 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tableData.length === 0 ? (
              <tr><td colSpan={10} className="p-8 text-center text-slate-500 italic">No teams added yet.</td></tr>
            ) : (
              tableData.map((row, idx) => (
                <tr key={row.id || idx} className="bg-slate-900 hover:bg-slate-800 transition-colors">
                  <td className="p-2 md:p-4 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="p-2 md:p-4">
                    {canEdit ? (
                      <select
                        value={row.teamId}
                        onChange={(e) => handleTeamSelect(row.id, e.target.value)}
                        title="Select Team"
                        aria-label="Select team for this row"
                        className="bg-transparent text-white font-bold w-full outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="home">Indian Strikers</option>
                        {opponents.map(opp => (
                          <option key={opp.id} value={opp.id}>{opp.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-white font-bold">{row.teamName || '—'}</span>
                    )}
                  </td>
                  <td className="p-2 md:p-4 text-center">
                    <input 
                      type="number" 
                      value={row.matches} 
                      onChange={e => handleTableChange(row.id, 'matches', +e.target.value)} 
                      readOnly={!canEdit}
                      title="Matches Played"
                      aria-label="Matches played counter"
                      className="w-8 md:w-12 bg-transparent text-center text-white outline-none" 
                    />
                  </td>
                  <td className="p-2 md:p-4 text-center p-2 text-sky-400 font-bold">
                    <input 
                      type="number" 
                      value={row.won} 
                      onChange={e => handleTableChange(row.id, 'won', +e.target.value)} 
                      readOnly={!canEdit}
                      title="Matches Won"
                      aria-label="Matches won counter"
                      className="w-8 md:w-12 bg-transparent text-center text-sky-400 font-bold outline-none" 
                    />
                  </td>
                  <td className="p-2 md:p-4 text-center p-2 text-red-400 font-bold">
                    <input 
                      type="number" 
                      value={row.lost} 
                      onChange={e => handleTableChange(row.id, 'lost', +e.target.value)} 
                      readOnly={!canEdit}
                      title="Matches Lost"
                      aria-label="Matches lost counter"
                      className="w-8 md:w-12 bg-transparent text-center text-red-400 font-bold outline-none" 
                    />
                  </td>
                  <td className="p-2 md:p-4 text-center hidden sm:table-cell text-slate-400">
                    <input 
                      type="number" 
                      value={row.nr} 
                      onChange={e => handleTableChange(row.id, 'nr', +e.target.value)} 
                      readOnly={!canEdit}
                      title="No Result"
                      aria-label="No result matches counter"
                      className="w-8 md:w-12 bg-transparent text-center text-slate-400 outline-none" 
                    />
                  </td>
                  <td className="p-2 md:p-4 text-center text-yellow-400 font-black">
                    <input 
                      type="number" 
                      value={row.points} 
                      onChange={e => handleTableChange(row.id, 'points', +e.target.value)} 
                      readOnly={!canEdit}
                      title="Total Points"
                      aria-label="Total points earned"
                      className="w-8 md:w-12 bg-transparent text-center text-yellow-400 font-black outline-none" 
                    />
                  </td>
                  <td className="p-2 md:p-4 text-center text-slate-300 font-mono">{calculateWinPercentage(row.won, row.matches)}</td>
                  <td className="p-2 md:p-4 text-center hidden sm:table-cell text-blue-300 font-mono">
                    <input 
                      type="text" 
                      value={row.nrr} 
                      onChange={e => handleTableChange(row.id, 'nrr', e.target.value)} 
                      readOnly={!canEdit}
                      title="Net Run Rate"
                      aria-label="Net run rate decimal"
                      className="w-16 bg-transparent text-center text-blue-300 font-mono outline-none" 
                    />
                  </td>
                  <td className="p-2 md:p-4 text-center">
                    {canEdit && (
                      <button 
                        onClick={() => handleDeleteRow(row.id)} 
                        title="Delete Row"
                        aria-label="Delete this team row"
                        className="text-slate-600 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PointsTable;
