import React, { useState } from 'react';
import { Ground } from '../types';
import { useMasterData } from './masterDataStore';
import { Plus, Trash2, Edit2, MapPin, X } from 'lucide-react';

const GroundsManager: React.FC = () => {
  const { grounds, addGround: addGroundStore, updateGround: updateGroundStore, removeGround } = useMasterData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Ground | null>(null);
  const [form, setForm] = useState<Partial<Ground>>({ name: '', location: '', capacity: 0 });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ name: '', location: '', capacity: 0 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: Ground) => {
    setEditingItem(g);
    setForm(g);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this ground?")) {
      removeGround(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateGroundStore({ ...editingItem, ...form } as Ground);
    } else {
      addGroundStore({ name: form.name || '', location: form.location || '', capacity: form.capacity || 0 });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-white/10 shadow-inner">
            <MapPin size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-white uppercase tracking-wider leading-none">Grounds Master List</h2>
            <p className="text-[11px] text-white/40 mt-1 font-medium">Configure match venues and stadium details.</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd} 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg text-[11px] flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95 uppercase tracking-widest"
          title="Add New Ground"
        >
          <Plus size={14} /> ADD GROUND
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/95 border-b border-white/10">
                <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest">Ground Details</th>
                <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest">City / Location</th>
                <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest">Capacity</th>
                <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grounds.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-blue-600 group-hover:bg-white transition-colors border border-slate-100">
                        <MapPin size={14} />
                      </div>
                      <span className="text-[12px] font-bold text-slate-900 leading-tight">{g.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600 font-medium text-[12px]">{g.location}</td>
                  <td className="px-4 py-2 text-slate-500 font-medium text-[12px] font-mono">{g.capacity?.toLocaleString() || 'N/A'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleOpenEdit(g)} className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Edit Ground"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(g.id)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Ground"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {grounds.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-300 text-[12px] font-bold uppercase tracking-widest">
                    No grounds configured yet
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
                {editingItem ? <Edit2 size={16} className="text-blue-500" /> : <Plus size={16} className="text-blue-500" />}
                {editingItem ? 'Edit' : 'Add New'} Ground
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
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Ground Name</label>
                <input 
                  required 
                  value={form.name} 
                  placeholder="e.g. Lords Cricket Ground"
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">City</label>
                  <input 
                    required 
                    value={form.location} 
                    placeholder="e.g. London"
                    onChange={e => setForm({...form, location: e.target.value})} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Capacity</label>
                  <input 
                    type="number" 
                    value={form.capacity} 
                    placeholder="e.g. 30000"
                    onChange={e => setForm({...form, capacity: Number(e.target.value)})} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 font-mono" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] uppercase tracking-widest text-[12px]"
              >
                {editingItem ? 'SAVE UPDATES' : 'CONFIRM & CREATE'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroundsManager;
