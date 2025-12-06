
import React, { useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import { getAppUsers, saveAppUsers } from '../services/storageService';
import { Plus, Trash2, Edit2, Shield, User, Ticket, X, Check, Search, Lock } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<AppUser>>({
    name: '',
    username: '',
    password: '',
    role: 'member'
  });

  useEffect(() => {
    setUsers(getAppUsers());
  }, []);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'member'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      saveAppUsers(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.username && formData.password && formData.role) {
      if (editingUser) {
        // Update
        const updated = users.map(u => u.id === editingUser.id ? {
          ...u,
          name: formData.name || u.name,
          username: formData.username!,
          password: formData.password!,
          role: formData.role!
        } : u);
        setUsers(updated);
        saveAppUsers(updated);
      } else {
        // Add
        const newUser: AppUser = {
          id: Date.now().toString(),
          name: formData.name || 'New User',
          username: formData.username!,
          password: formData.password!,
          role: formData.role!,
          avatarUrl: `https://ui-avatars.com/api/?name=${formData.name}&background=random`
        };
        const updated = [...users, newUser];
        setUsers(updated);
        saveAppUsers(updated);
      }
      setIsModalOpen(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
          <p className="text-slate-500 text-sm">Manage access to the application</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            <Search size={20} className="text-slate-400" />
            <input 
              className="bg-transparent outline-none w-full text-sm font-medium text-slate-700" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">User ID (Login)</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                        ${user.role === 'admin' ? 'bg-blue-600' : user.role === 'member' ? 'bg-emerald-600' : 'bg-orange-500'}
                      `}>
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} className="w-full h-full rounded-full" />
                        ) : (
                            user.name[0]
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-400">ID: {user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-600">{user.username}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                       ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' : user.role === 'member' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}
                    `}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => handleOpenEdit(user)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                       </button>
                       <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingUser ? <Edit2 size={20} className="text-orange-400" /> : <Plus size={20} className="text-blue-400" />}
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                 <input 
                   required
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g. John Doe"
                 />
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User ID (Login)</label>
                 <input 
                   required
                   value={formData.username}
                   onChange={e => setFormData({...formData, username: e.target.value})}
                   className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                   placeholder="e.g. member1"
                 />
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                 <input 
                   required
                   type="text" 
                   value={formData.password}
                   onChange={e => setFormData({...formData, password: e.target.value})}
                   className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                   placeholder="Secure password"
                 />
               </div>

               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                 <div className="grid grid-cols-3 gap-2">
                    {['admin', 'member', 'guest'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({...formData, role: r as UserRole})}
                        className={`py-2 rounded-lg text-xs font-bold uppercase transition-all flex flex-col items-center gap-1
                          ${formData.role === r 
                            ? (r === 'admin' ? 'bg-blue-600 text-white' : r === 'member' ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white') 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                        `}
                      >
                        {r === 'admin' ? <Shield size={16} /> : r === 'member' ? <User size={16} /> : <Ticket size={16} />}
                        {r}
                      </button>
                    ))}
                 </div>
               </div>

               <button type="submit" className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black shadow-lg shadow-slate-900/20 mt-4">
                 {editingUser ? 'Save Changes' : 'Create User'}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
