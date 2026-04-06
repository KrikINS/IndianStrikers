
import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, MembershipRequest, Player } from '../types';
import { 
  getAppUsers, addAppUser, deleteAppUser, updateAppUser,
  getMembershipRequests, updateMembershipRequestStatus, deleteMembershipRequest,
  getPlayers 
} from '../services/storageService';
import { Plus, Trash2, Edit2, Shield, X, Users, UserPlus, Mail, Phone, Info } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'requests'>('users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AppUser | null>(null);
  const [form, setForm] = useState<Partial<AppUser>>({ name: '', username: '', password: '', role: 'member' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, r, p] = await Promise.all([
        getAppUsers(),
        getMembershipRequests(),
        getPlayers()
      ]);
      setUsers(u);
      setRequests(r);
      setPlayers(p);
    } catch (e) {
      console.error("Failed to load user management data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ name: '', username: '', password: '', role: 'member' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: AppUser) => {
    setEditingItem(u);
    setForm({ ...u, password: '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this user?")) {
      try {
        await deleteAppUser(id);
        setUsers(prev => prev.filter(u => u.id !== id));
      } catch (e) { alert("Delete failed"); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateAppUser(editingItem.id, form);
        setUsers(prev => prev.map(u => u.id === editingItem.id ? { ...u, ...form } : u));
      } else {
        const newUser = await addAppUser(form);
        setUsers(prev => [...prev, newUser]);
      }
      setIsModalOpen(false);
    } catch (e: any) { alert("Save failed: " + e.message); }
  };

  const handleApproveRequest = (req: MembershipRequest) => {
    if (window.confirm(`Approve ${req.name}? This will prepare the user creation form.`)) {
      const match = players.find(p => p.name.toLowerCase() === req.name.toLowerCase());
      setForm({ 
        name: req.name, 
        username: req.email.split('@')[0], 
        password: 'changeme123', 
        role: 'member', 
        playerId: match?.id 
      });
      setActiveSubTab('users');
      setEditingItem(null);
      setIsModalOpen(true);
      updateMembershipRequestStatus(req.id, 'Approved').then(() => loadData());
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50">
        <div className="flex items-center gap-4">
           <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
             <button 
               onClick={() => setActiveSubTab('users')}
               className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeSubTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Manage Users
             </button>
             <button 
               onClick={() => setActiveSubTab('requests')}
               className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all relative ${activeSubTab === 'requests' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Requests
               {requests.filter(r => r.status === 'Pending').length > 0 && (
                 <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
               )}
             </button>
           </div>
        </div>
        {activeSubTab === 'users' && (
          <button 
            onClick={handleOpenAdd} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
          >
            <Plus size={16} /> CREATE NEW USER
          </button>
        )}
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-20 text-center text-slate-500 font-bold animate-pulse uppercase tracking-widest">
            Syncing App Access...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-black/40 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
              {activeSubTab === 'users' ? (
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Credentials</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4">Applicant</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {activeSubTab === 'users' ? users.map(u => (
                <tr key={u.id} className="hover:bg-blue-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-white border border-slate-700 overflow-hidden">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : u.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{u.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                    ${u.role === 'admin' ? 'bg-red-500/10 text-red-500' : 
                      u.role === 'scorer' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button onClick={() => handleOpenEdit(u)} className="p-2 text-slate-600 hover:text-white transition-colors" title="Edit User"><Edit2 size={16} /></button>
                       <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors" title="Delete User"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )) : requests.map(r => (
                <tr key={r.id} className="hover:bg-blue-500/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-200">{r.name}</p>
                    <p className="text-[10px] text-slate-500">{new Date(r.date).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400"><Mail size={10} /> {r.email}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400"><Phone size={10} /> {r.contactNumber}</div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                      ${r.status === 'Pending' ? 'bg-orange-500/20 text-orange-500' : 
                        r.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        {r.status === 'Pending' && (
                           <button 
                             onClick={() => handleApproveRequest(r)} 
                             className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 text-[10px] font-black uppercase rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                             title="Approve Membership Request"
                             aria-label={`Approve ${r.name}`}
                           >
                             APPROVE
                           </button>
                        )}
                        <button onClick={() => deleteMembershipRequest(r.id).then(() => loadData())} className="p-2 text-slate-600 hover:text-red-500 transition-colors" title="Delete Request" aria-label={`Delete request from ${r.name}`}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {((activeSubTab === 'users' && users.length === 0) || (activeSubTab === 'requests' && requests.length === 0)) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-600 font-bold uppercase tracking-widest">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-black/20">
              <h3 className="font-black uppercase tracking-widest text-white flex items-center gap-2">
                {editingItem ? <Shield size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                {editingItem ? 'Edit Auth Access' : 'Create Access'}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Full Name</label>
                  <input required value={form.name} placeholder="John Doe" onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Login UID</label>
                  <input required value={form.username} placeholder="jdoe123" onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600 font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Password</label>
                <input required={!editingItem} type="password" value={form.password} placeholder={editingItem ? 'Leave blank to keep same' : '••••••••'} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-600 font-mono" />
              </div>
              <div>
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Assigned Role</span>
                <div className="grid grid-cols-4 gap-2">
                   {['admin', 'scorer', 'member', 'guest'].map(role => (
                     <button 
                       key={role} type="button" 
                       onClick={() => setForm({...form, role: role as UserRole})}
                       className={`p-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all border
                         ${form.role === role ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'}`}
                     >
                       {role}
                     </button>
                   ))}
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] uppercase tracking-widest"
              >
                {editingItem ? 'SYNC UPDATES' : 'GENERATE ACCESS'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
