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
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-white/10 shadow-inner">
            <Trophy size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-white uppercase tracking-wider leading-none">Tournaments Hub</h2>
            <p className="text-[11px] text-white/40 mt-1 font-medium">Manage club league participation and yearly schedule.</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd} 
          title="Create New Tournament"
          aria-label="Create New Tournament"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg text-[11px] flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all active:scale-95 uppercase tracking-widest"
        >
          <Plus size={14} /> NEW TOURNAMENT
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/95 border-b border-white/10">
                <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest">Tournament Name</th>
                <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest">Year</th>
                <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tournaments.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-2">
                    <span className="text-[12px] font-bold text-slate-900 leading-tight">{t.name}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 font-medium text-[12px] font-mono">{t.year}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border
                      ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                        t.status === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpenEdit(t)} className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Edit Tournament"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Tournament"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {tournaments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-300 text-[12px] font-bold uppercase tracking-widest">
                    No tournaments scheduled
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                {editingItem ? <Edit2 size={16} className="text-amber-500" /> : <Plus size={16} className="text-amber-500" />}
                {editingItem ? 'Edit' : 'Add New'} Tournament
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-white/40 hover:text-white transition-colors"
                title="Close Modal"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Tournament Name</label>
                <input 
                  required 
                  value={form.name} 
                  placeholder="e.g. ICC T20 World Cup"
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-white/20" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Year</label>
                  <input 
                    type="number" 
                    required 
                    value={form.year} 
                    placeholder="2026"
                    onChange={e => setForm({...form, year: Number(e.target.value)})} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-white/20 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Status</label>
                  <select 
                    value={form.status} 
                    title="Select Tournament Status"
                    onChange={e => setForm({...form, status: e.target.value as any})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="upcoming" className="bg-slate-900">Upcoming</option>
                    <option value="active" className="bg-slate-900">Active</option>
                    <option value="completed" className="bg-slate-900">Completed</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl shadow-xl shadow-amber-900/40 transition-all active:scale-[0.98] uppercase tracking-widest text-[12px]"
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
