
import React, { useState, useEffect } from 'react';
import { AppUser, UserRole, MembershipRequest, Player } from '../types';
import { getAppUsers, addAppUser, deleteAppUser, getMembershipRequests, updateMembershipRequestStatus, deleteMembershipRequest, updateAppUser, getPlayers } from '../services/storageService';
import { Plus, Trash2, Edit2, Shield, User, Ticket, X, Check, Search, Lock, UserPlus, FileText, CheckCircle } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<AppUser>>({
    name: '',
    username: '',
    password: '',
    role: 'member'
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [usersData, requestsData, playersData] = await Promise.all([
          getAppUsers(),
          getMembershipRequests(),
          getPlayers()
        ]);
        setUsers(usersData);
        setRequests(requestsData);
        setPlayers(playersData);
      } catch (e: any) { 
        console.error('Failed to load user management data:', e);
        if (e.message.includes('401') || e.message.includes('Auth session')) {
          alert("Your session has expired. Please log out and log back in as an administrator to manage users.");
        }
      }
    };
    load();
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
      role: user.role,
      playerId: user.playerId
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteAppUser(id).then(() => {
        setUsers(prev => prev.filter(u => u.id !== id));
      }).catch(err => alert("Failed to delete"));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.username && formData.role) {
      if (editingUser) {
        // Update
        updateAppUser(editingUser.id, formData).then((updatedUser) => {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
          alert("User updated successfully");
        }).catch(e => alert("Failed to update user: " + e.message));
      } else {
        // Add
        if (!formData.password) {
          alert("Password is required for new users");
          return;
        }
        addAppUser(formData).then(newUser => {
          setUsers(prev => [...prev, newUser]);
          alert("User created successfully");
        }).catch(e => alert("Failed to create user: " + e.message));
      }
      setIsModalOpen(false);
    }
  };

  const handleApproveRequest = (req: MembershipRequest) => {
    if (window.confirm(`Approve ${req.name}? This will open the user creation form.`)) {
      // Pre-fill form
      // Automatically try to link player if name matches
      const matchingPlayer = players.find(p => p.name.toLowerCase() === req.name.toLowerCase());
      
      setFormData({
        name: req.name,
        username: req.email.split('@')[0], // Suggest username
        password: 'changeme123', // Default password
        role: 'member' as UserRole,
        playerId: matchingPlayer ? String(matchingPlayer.id) : undefined
      });
      setEditingUser(null);
      setIsModalOpen(true);

      // Update status in background
      updateMembershipRequestStatus(req.id, 'Approved').then(() => {
        setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'Approved' } : r));
      });
    }
  };

  const handleRejectRequest = (id: string) => {
    if (window.confirm('Reject this request?')) {
      updateMembershipRequestStatus(id, 'Rejected').then(() => {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
      });
    }
  };

  const handleDeleteRequest = (id: string) => {
    if (window.confirm('Delete this request permanent?')) {
      deleteMembershipRequest(id).then(() => {
        setRequests(prev => prev.filter(r => r.id !== id));
      });
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

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <User size={16} /> All Users
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <UserPlus size={16} /> Membership Requests
          {requests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {requests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'users' ? (
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
                  <th className="p-4">Linked Player</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                          ${user.role === 'admin' ? 'bg-blue-600' :
                            user.role === 'member' ? 'bg-emerald-600' :
                              user.role === 'scorer' ? 'bg-purple-600' : 'bg-orange-500'}
                        `}>
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-full h-full rounded-full"
                            />
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
                         ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'member' ? 'bg-emerald-100 text-emerald-700' :
                            user.role === 'scorer' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}
                      `}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.playerId ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-emerald-500" />
                          <span className="font-medium text-slate-700">
                            {players.find(p => String(p.id) === String(user.playerId))?.name || 'Unknown Player'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(user)} title="Edit User" aria-label="Edit User" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(user.id)} title="Delete User" aria-label="Delete User" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="p-4">Applicant</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">History</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-800">{req.name}</p>
                        <p className="text-xs text-slate-400">{new Date(req.date).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-slate-800 font-medium">{req.email}</p>
                        <p className="text-xs text-slate-400">{req.contactNumber}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      {req.associatedBefore === 'Yes' ? (
                        <span className="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-1 rounded">
                          Ex-Player ({req.associationYear})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-xs">New</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase
                         ${req.status === 'Pending' ? 'bg-orange-100 text-orange-600' :
                          req.status === 'Approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
                       `}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {req.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApproveRequest(req)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
                              title="Approve & Create User"
                            >
                              <CheckCircle size={16} /> <span className="text-xs font-bold hidden md:inline">Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                              title="Reject"
                            >
                              <X size={16} /> <span className="text-xs font-bold hidden md:inline">Reject</span>
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDeleteRequest(req.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete Request" aria-label="Delete Request">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">No membership requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editingUser ? <Edit2 size={20} className="text-orange-400" /> : <Plus size={20} className="text-blue-400" />}
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} title="Close Modal" aria-label="Close Modal" className="text-slate-400 hover:text-white"><X size={20} /></button>

            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User ID (Login)</label>
                <input
                  required
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g. member1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                <input
                  required={!editingUser}
                  type="text"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder={editingUser ? "Enter new password if changing" : "Secure password"}
                />
                {editingUser && (
                  <p className="mt-1 text-[10px] text-blue-600 font-medium italic">
                    Note: Leave blank to keep the current password.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['admin', 'scorer', 'member', 'guest'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r as UserRole })}
                      className={`py-2 rounded-lg text-xs font-bold uppercase transition-all flex flex-col items-center gap-1
                          ${formData.role === r
                          ? (r === 'admin' ? 'bg-blue-600 text-white' :
                            r === 'member' ? 'bg-emerald-600 text-white' :
                              r === 'scorer' ? 'bg-purple-600 text-white' : 'bg-orange-500 text-white')
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                        `}
                    >
                      {r === 'admin' ? <Shield size={16} /> :
                        r === 'member' ? <User size={16} /> :
                          r === 'scorer' ? <Lock size={16} /> : <Ticket size={16} />}
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link to Squad Player</label>
                <select
                  title="Select a player to link this user to"
                  value={formData.playerId || ''}
                  onChange={e => setFormData({ ...formData, playerId: e.target.value || undefined })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Player Linked --</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">
                  Linking a user to a player allows them to see their own stats and edit their profile.
                </p>
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
