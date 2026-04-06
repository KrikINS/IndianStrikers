
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
    <div style={{ padding: '40px' }} className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 style={{ color: 'white' }} className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
            <MapPin className="text-blue-500" size={32} /> Grounds Master List
          </h1>
          <p style={{ color: '#aaa' }} className="text-sm font-medium uppercase tracking-widest mt-1">Manage match venues and locations here.</p>
        </div>
        <button 
          onClick={handleOpenAdd} 
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          title="Add New Ground"
        >
          <Plus size={16} /> ADD GROUND
        </button>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-black/40 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
            <tr>
              <th className="px-6 py-4">Ground Details</th>
              <th className="px-6 py-4">City / Location</th>
              <th className="px-6 py-4">Capacity</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {grounds.map(g => (
              <tr key={g.id} className="hover:bg-blue-500/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 group-hover:text-blue-300 transition-colors">
                      <MapPin size={20} />
                    </div>
                    <span className="font-bold text-slate-200">{g.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400 font-medium">{g.location}</td>
                <td className="px-6 py-4 text-slate-400 font-medium">{g.capacity || 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenEdit(g)} className="p-2 text-slate-600 hover:text-white transition-colors" title="Edit Ground"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(g.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors" title="Delete Ground"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {grounds.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-600 font-bold uppercase tracking-widest">
                  No grounds configured yet
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
                {editingItem ? <Edit2 size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                {editingItem ? 'Edit' : 'Add New'} Ground
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
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Ground Name</label>
                <input 
                  required 
                  value={form.name} 
                  placeholder="e.g. Lords Cricket Ground"
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">City</label>
                  <input 
                    required 
                    value={form.location} 
                    placeholder="e.g. London"
                    onChange={e => setForm({...form, location: e.target.value})} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Capacity</label>
                  <input 
                    type="number" 
                    value={form.capacity} 
                    placeholder="e.g. 30000"
                    onChange={e => setForm({...form, capacity: Number(e.target.value)})} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] uppercase tracking-widest"
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
