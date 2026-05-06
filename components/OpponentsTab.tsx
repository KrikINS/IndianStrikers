import React, { useState, useRef } from 'react';
import { Swords, Star, TrendingUp, AlertCircle, ChevronDown, ChevronUp, Plus, Upload, UserPlus, X, Edit2, Trash2 } from 'lucide-react';
import { OpponentTeam, UserRole, AppUser } from '../types';
import { useOpponentStore } from '../store/opponentStore';

interface OpponentsTabProps {
  userRole: UserRole;
  currentUser?: AppUser | null;
}

const OpponentsTab: React.FC<OpponentsTabProps> = ({ userRole, currentUser }) => {
  const { opponents: teams, loading, addOpponent: onAddTeam, updateOpponent: onUpdateTeam, deleteOpponent: onDeleteTeam } = useOpponentStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState<string>('');

  // Modal Form State
  const [formData, setFormData] = useState<Partial<OpponentTeam>>({
    name: '',
    rank: 10,
    strength: '',
    weakness: '',
    color: 'bg-slate-500',
    logoUrl: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canEdit = userRole === 'admin' || currentUser?.canScore;

  const toggleAccordion = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      rank: teams.length + 1,
      strength: '',
      weakness: '',
      color: 'bg-slate-500',
      logoUrl: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (team: OpponentTeam, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(team.id);
    setFormData({
      name: team.name,
      rank: team.rank,
      strength: team.strength,
      weakness: team.weakness,
      color: team.color,
      logoUrl: team.logoUrl
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      onDeleteTeam(id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      if (editingId) {
        // Update existing team
        const existingTeam = teams.find(t => t.id === editingId);
        if (existingTeam) {
          const updatedTeam: OpponentTeam = {
            ...existingTeam,
            name: formData.name,
            rank: Number(formData.rank) || 99,
            strength: formData.strength || 'Unknown',
            weakness: formData.weakness || 'Unknown',
            logoUrl: formData.logoUrl,
            color: formData.color
          };
          onUpdateTeam(updatedTeam);
        }
      } else {
        // Create new team
        const newTeam: OpponentTeam = {
          id: Date.now().toString(),
          name: formData.name,
          rank: Number(formData.rank) || 99,
          strength: formData.strength || 'Unknown',
          weakness: formData.weakness || 'Unknown',
          logoUrl: formData.logoUrl,
          players: [],
          color: formData.color
        };
        onAddTeam(newTeam);
      }
      setIsModalOpen(false);
    }
  };

  const handleAddPlayer = (teamId: string) => {
    if (!newPlayerName.trim()) return;

    const team = teams.find(t => t.id === teamId);
    if (team) {
      const updatedTeam = {
        ...team,
        players: [...team.players, { id: Date.now().toString(), name: newPlayerName }]
      };
      onUpdateTeam(updatedTeam);
      setNewPlayerName('');
    }
  };

  const handleRemovePlayer = (teamId: string, playerId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      const updatedTeam = {
        ...team,
        players: team.players.filter(p => p.id !== playerId)
      };
      onUpdateTeam(updatedTeam);
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 3).toUpperCase();
  };

  // Helper to generate a consistent color based on string
  const getAvatarColor = (name: string) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-sky-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="animate-fade-in w-full">
      {/* Sub-Header for the Tab */}
      <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-white/10 shadow-inner">
            <Swords size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-white uppercase tracking-wider leading-none">Opponent Database</h2>
            <p className="text-[11px] text-white/40 mt-1 font-medium">Analyze rivals and manage their rosters</p>
          </div>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg text-[11px] flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all active:scale-95 uppercase tracking-widest"
          >
            <Plus size={14} /> NEW TEAM
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
             <div className="p-20 text-center bg-slate-900/20 rounded-3xl border border-slate-800">
             <div className="w-12 h-12 border-4 border-slate-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] animate-pulse">Scanning Rival Assets...</p>
           </div>
        ) : teams.length > 0 ? (
          teams.map((team) => {
            const isExpanded = expandedId === team.id;
            const avatarColor = team.logoUrl ? '' : getAvatarColor(team.name);

            return (
              <div key={team.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                {/* Accordion Header */}
                <div
                  onClick={() => toggleAccordion(team.id)}
                  className={`
                    w-full text-left p-4 flex items-center justify-between cursor-pointer transition-colors group
                    ${isExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0 overflow-hidden
                      ${avatarColor}
                    `}>
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                      ) : (
                        getInitials(team.name)
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">{team.name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                        <span>{team.players.length} Players</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                          <Star size={10} className="text-yellow-500 fill-yellow-500" />
                          Rank #{team.rank}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleOpenEdit(team, e)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Team"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(team.id, team.name, e)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Team"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    <div className="w-px h-6 bg-slate-100 mx-2"></div>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>

                {/* Accordion Body */}
                <div className={`
                  grid transition-[grid-template-rows] duration-300 ease-out
                  ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                `}>
                  <div className="overflow-hidden">
                    <div className="p-6 border-t border-slate-100 bg-slate-50/30 grid md:grid-cols-3 gap-8">

                      {/* Stats Column */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tactical Profile</h4>
                        <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10">
                          <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <TrendingUp size={16} />
                            <span className="font-black text-[10px] uppercase tracking-widest">Primary Strength</span>
                          </div>
                          <p className="text-slate-600 text-sm font-medium">{team.strength}</p>
                        </div>
                        <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/10">
                          <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <AlertCircle size={16} />
                            <span className="font-black text-[10px] uppercase tracking-widest">Known Weakness</span>
                          </div>
                          <p className="text-slate-600 text-sm font-medium">{team.weakness}</p>
                        </div>
                      </div>

                      {/* Roster Column */}
                      <div className="md:col-span-2 space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
                          Registered Squad
                          <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full text-[9px]">{team.players.length}</span>
                        </h4>

                        <div className="bg-white rounded-xl p-4 min-h-[120px] max-h-[250px] overflow-y-auto border border-slate-200 shadow-inner">
                          {team.players.length === 0 ? (
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest text-center py-8 italic">Intelligence Gap: No players listed</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {team.players.map(player => (
                                <div key={player.id} className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2 group/player uppercase tracking-wider">
                                  {player.name}
                                  {canEdit && (
                                    <button 
                                      onClick={() => handleRemovePlayer(team.id, player.id)}
                                      className="text-slate-400 hover:text-red-500 transition-colors"
                                      title="Remove Player"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {canEdit && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              title="Register Player Name"
                              placeholder="REGISTER PLAYER..."
                              value={newPlayerName}
                              onChange={(e) => setNewPlayerName(e.target.value)}
                              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-xs font-bold uppercase tracking-widest shadow-sm"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(team.id); }}
                            />
                            <button
                              onClick={() => handleAddPlayer(team.id)}
                              disabled={!newPlayerName.trim()}
                              className="bg-slate-900 hover:bg-blue-600 text-white px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200"
                              title="Add Player"
                            >
                              <UserPlus size={18} />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-16 text-center bg-slate-950/40 rounded-3xl border border-dashed border-slate-800 text-slate-500 font-black uppercase tracking-[0.2em] italic">
            Search Terminated: No rivals detected
          </div>
        )}
      </div>

      {/* Add/Edit Team Modal */}
      {
        isModalOpen && canEdit && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-fade-in">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-blue-500/10">
              <div className="bg-slate-950/80 p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-[14px] font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                  <Swords size={18} className="text-blue-500" />
                  {editingId ? 'Edit Intelligence' : 'Add New Team'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white/40 hover:text-white transition-colors p-2" title="Close"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="flex gap-4 items-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-blue-500/50 transition-all group overflow-hidden shadow-inner shrink-0"
                    title="Upload Logo"
                  >
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload size={24} className="text-white/20 group-hover:text-blue-400 mb-2 transition-colors" />
                        <span className="text-[9px] font-black text-white/20 group-hover:text-blue-400 uppercase tracking-widest">Logo</span>
                      </>
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} aria-label="Upload team logo" />
                  
                  <div className="flex-1 space-y-2">
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Logo URL (Optional)</label>
                    <input
                      value={formData.logoUrl}
                      onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 font-medium"
                      placeholder="https://..."
                      title="Logo URL"
                    />
                    <p className="text-[9px] text-white/20 italic px-1 font-medium">Provide a direct link to an image or upload one.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Official Team Name</label>
                    <input
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 font-bold uppercase tracking-wider"
                      placeholder="e.g. Royal Challengers"
                      title="Team Name"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Current Rank</label>
                      <input
                        type="number"
                        value={formData.rank}
                        onChange={e => setFormData({ ...formData, rank: Number(e.target.value) })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 font-mono"
                        placeholder="10"
                        title="Current Rank"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Key Tactical Strength</label>
                    <input
                      value={formData.strength}
                      onChange={e => setFormData({ ...formData, strength: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 uppercase tracking-wide font-bold"
                      placeholder="e.g. Opening Batting"
                      title="Key Tactical Strength"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Key Tactical Weakness</label>
                    <input
                      value={formData.weakness}
                      onChange={e => setFormData({ ...formData, weakness: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-[12px] outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-white/20 uppercase tracking-wide font-bold"
                      placeholder="e.g. Spin Bowling"
                      title="Key Tactical Weakness"
                    />
                  </div>
                </div>

                <button type="submit" className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[12px] rounded-xl shadow-xl shadow-blue-900/40 active:scale-[0.98] transition-all">
                  {editingId ? 'SAVE INTELLIGENCE' : 'CONFIRM REGISTRATION'}
                </button>
              </form>
            </div>
          </div>
        )}
    </div>
  );
};

export default OpponentsTab;
