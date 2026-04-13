import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, MembershipRequest, Player } from '../types';
import { 
  getAppUsers, addAppUser, deleteAppUser, updateAppUser,
  getMembershipRequests, updateMembershipRequestStatus, deleteMembershipRequest,
  getPlayers 
} from '../services/storageService';
import { Plus, Trash2, Edit2, Shield, X, Users, UserPlus, Mail, Phone, Info, Layout, Loader2 } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'requests'>('users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AppUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Partial<AppUser>>({ name: '', username: '', email: '', password: '', role: 'member' });

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
    setIsSaving(true);
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
    finally { setIsSaving(false); }
  };

  const handleApproveRequest = (req: MembershipRequest) => {
    if (window.confirm(`Approve ${req.name}? This will prepare the user creation form.`)) {
      const match = players.find(p => p.name.toLowerCase() === req.name.toLowerCase());
      setForm({ 
        name: req.name, 
        email: req.email,
        contactNumber: req.contactNumber,
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
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-white/5 rounded-xl border border-white/10 gap-4">
        <div className="flex items-center gap-4">
           <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
             <button 
               onClick={() => setActiveSubTab('users')}
               title="View User Management"
               aria-label="View User Management"
               className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-2 ${activeSubTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
             >
               <Users size={14} /> Manage Users
             </button>
             <button 
               onClick={() => setActiveSubTab('requests')}
               title="View Membership Requests"
               aria-label="View Membership Requests"
               className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-2 relative ${activeSubTab === 'requests' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
             >
               <UserPlus size={14} /> Requests
               {requests.filter(r => r.status === 'Pending').length > 0 && (
                 <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-slate-900"></span>
               )}
             </button>
           </div>
        </div>
        {activeSubTab === 'users' && (
          <button 
            onClick={handleOpenAdd} 
            title="Create New User"
            aria-label="Create New User"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg text-[11px] flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95 uppercase tracking-widest"
          >
            <Plus size={14} /> CREATE NEW USER
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          {loading ? (
            <div className="p-20 text-center text-slate-300 font-bold animate-pulse uppercase tracking-widest text-[12px]">
              Syncing App Access...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/95 border-b border-white/10">
                  {activeSubTab === 'users' ? (
                    <>
                      <th className="px-4 py-3 text-[11px] font-bold text-white/50 uppercase tracking-widest">User Details</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-white/50 uppercase tracking-widest">Login ID</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-white/50 uppercase tracking-widest">Email</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-white/50 uppercase tracking-widest">Contact</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-white/50 uppercase tracking-widest">Role</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-white/50 uppercase tracking-widest text-right">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest">Applicant</th>
                      <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest">Contact</th>
                      <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest">Status</th>
                      <th className="px-4 py-3 text-[12px] font-bold text-white/60 uppercase tracking-widest text-right">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeSubTab === 'users' ? users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-900 text-[10px] border border-slate-200 overflow-hidden shadow-inner shrink-0">
                          {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : u.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-slate-900 leading-tight truncate">{u.name}</p>
                          <p className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase">ID: {String(u.id).substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-indigo-600 font-mono text-[11px] font-bold bg-indigo-50 px-2 py-1 rounded-md">{u.username}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 font-medium">
                      {u.email || <span className="text-slate-300 italic">Not set</span>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 font-medium whitespace-nowrap">
                      { u.contactNumber || <span className="text-slate-300 italic">Not set</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border
                        ${u.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {u.role}
                        </span>

                        {u.canScore && (
                          <span className="w-fit px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100 flex items-center gap-1">
                            <Plus size={10} /> Scorer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                         <button onClick={() => handleOpenEdit(u)} className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Edit User"><Edit2 size={14} /></button>
                         <button onClick={() => handleDelete(u.id)} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete User"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )) : requests.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-2">
                      <p className="text-[12px] font-bold text-slate-900 leading-tight">{r.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">{new Date(r.date).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-2 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-slate-600"><Mail size={12} className="text-slate-300" /> {r.email}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600"><Phone size={12} className="text-slate-300" /> {r.contactNumber}</div>
                    </td>
                    <td className="px-4 py-2">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border
                        ${r.status === 'Pending' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                          r.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                          {r.status === 'Pending' && (
                             <button 
                               onClick={() => handleApproveRequest(r)} 
                               className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                               title="Approve Membership Request"
                             >
                               APPROVE
                             </button>
                          )}
                          <button onClick={() => deleteMembershipRequest(r.id).then(() => loadData())} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Request"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {((activeSubTab === 'users' && users.length === 0) || (activeSubTab === 'requests' && requests.length === 0)) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-300 text-[12px] font-bold uppercase tracking-widest">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl overflow-y-auto max-h-[90vh] shadow-2xl animate-scale-in custom-scrollbar">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                {editingItem ? <Shield size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                {editingItem ? 'Edit Auth Access' : 'Create Access'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                title="Close"
                aria-label="Close Modal"
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Full Name</label>
                  <input required value={form.name} placeholder="John Doe" onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Login UID</label>
                  <input required value={form.username} placeholder="jdoe123" onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 font-mono" />
                </div>
              </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Email ID</label>
                  <input type="email" value={form.email || ''} placeholder="user@example.com" onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Contact Number</label>
                  <input type="tel" value={form.contactNumber || ''} placeholder="+91 00000 00000" onChange={e => setForm({...form, contactNumber: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 font-mono" />
                </div>
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Password</label>
                <input required={!editingItem} type="password" value={form.password} placeholder={editingItem ? 'Leave blank to keep same' : '••••••••'} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 font-mono" />
              </div>
              <div>
                <span className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Assigned Role</span>
                <div className="grid grid-cols-3 gap-2">
                   {['admin', 'member', 'guest'].map(role => (
                     <button 
                       key={role} type="button" 
                       title={`Set role to ${role}`}
                       aria-label={`Set role to ${role}`}
                       onClick={() => setForm({...form, role: role as UserRole})}
                       className={`p-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all border
                         ${form.role === role ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-black/40 text-white/40 border-white/10 hover:bg-white/5'}`}
                     >
                       {role}
                     </button>
                   ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${form.canScore ? 'bg-purple-500/10 text-purple-400' : 'bg-white/5 text-white/20'}`}>
                    <Layout size={20} />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white leading-tight">Scoring Access</p>
                    <p className="text-[10px] text-white/40 font-medium">Allow this user to record matches</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setForm({...form, canScore: !form.canScore})}
                  title={form.canScore ? "Revoke Scoring Access" : "Grant Scoring Access"}
                  aria-label={form.canScore ? "Revoke Scoring Access" : "Grant Scoring Access"}
                  className={`w-12 h-6 rounded-full transition-all relative ${form.canScore ? 'bg-purple-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.canScore ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-white/50 text-white font-black rounded-xl shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] uppercase tracking-widest text-[12px] flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                {isSaving ? 'SYNCING...' : (editingItem ? 'SYNC UPDATES' : 'GENERATE ACCESS')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
