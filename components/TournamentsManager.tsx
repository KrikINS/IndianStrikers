
import React, { useState } from 'react';
import { Tournament } from '../types';
import { useMasterData } from './masterDataStore';
import { Plus, Trash2, Edit2, Trophy, X } from 'lucide-react';

const TournamentsManager: React.FC = () => {
  const { tournaments, addTournament: addTourneyStore, updateTournament: updateTourneyStore, removeTournament } = useMasterData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Tournament | null>(null);
  const [form, setForm] = useState<Partial<Tournament>>({ 
    name: '', 
    year: new Date().getFullYear(), 
    status: 'upcoming' 
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ name: '', year: new Date().getFullYear(), status: 'upcoming' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Tournament) => {
    setEditingItem(t);
    setForm(t);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this tournament?")) {
      removeTournament(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateTourneyStore({ ...editingItem, ...form } as Tournament);
    } else {
      addTourneyStore({ 
        name: form.name || '', 
        year: form.year || new Date().getFullYear(), 
        status: form.status as any || 'upcoming' 
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Trophy className="text-amber-500" size={24} /> Tournaments Hub
          </h2>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Manage club participation and schedule</p>
        </div>
        <button 
          onClick={handleOpenAdd} 
          className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all active:scale-95"
        >
          <Plus size={16} /> NEW TOURNAMENT
        </button>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-black/40 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Tournament Name</th>
              <th className="px-6 py-4">Year</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {tournaments.map(t => (
              <tr key={t.id} className="hover:bg-amber-500/5 transition-colors group">
                <td className="px-6 py-4">
                  <span className="font-bold text-slate-200">{t.name}</span>
                </td>
                <td className="px-6 py-4 text-slate-400 font-bold">{t.year}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                    ${t.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 
                      t.status === 'upcoming' ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-800 text-slate-500'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenEdit(t)} className="p-2 text-slate-600 hover:text-white transition-colors" title="Edit Tournament"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors" title="Delete Tournament"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {tournaments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-600 font-bold uppercase tracking-widest">
                  No tournaments scheduled
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-black/20">
              <h3 className="font-black uppercase tracking-widest text-white flex items-center gap-2">
                {editingItem ? <Edit2 size={18} className="text-amber-500" /> : <Plus size={18} className="text-amber-500" />}
                {editingItem ? 'Edit' : 'Add New'} Tournament
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-500 hover:text-white transition-colors"
                title="Close Modal"
                aria-label="Close Modal"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Tournament Name</label>
                <input 
                  required 
                  value={form.name} 
                  placeholder="e.g. ICC T20 World Cup"
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-slate-600" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Year</label>
                  <input 
                    type="number" 
                    required 
                    value={form.year} 
                    placeholder="2026"
                    onChange={e => setForm({...form, year: Number(e.target.value)})} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-slate-600" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Status</label>
                  <select 
                    value={form.status} 
                    title="Select Tournament Status"
                    onChange={e => setForm({...form, status: e.target.value as any})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl shadow-xl shadow-amber-900/40 transition-all active:scale-[0.98] uppercase tracking-widest"
              >
                {editingItem ? 'SAVE TOURNAMENT' : 'CONFIRM TOURNAMENT'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentsManager;
