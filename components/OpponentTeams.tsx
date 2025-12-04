
import React, { useState, useRef } from 'react';
import { Swords, Star, TrendingUp, AlertCircle, ChevronDown, ChevronUp, Plus, Upload, UserPlus, X, Edit2, Trash2 } from 'lucide-react';
import { OpponentTeam, UserRole } from '../types';

interface OpponentTeamsProps {
  teams: OpponentTeam[];
  onAddTeam: (team: OpponentTeam) => void;
  onUpdateTeam: (team: OpponentTeam) => void;
  onDeleteTeam: (id: string) => void;
  userRole: UserRole;
}

const OpponentTeams: React.FC<OpponentTeamsProps> = ({ teams, onAddTeam, onUpdateTeam, onDeleteTeam, userRole }) => {
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
  const canEdit = userRole === 'admin';

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

  const getInitials = (name: string) => {
    return name.slice(0, 3).toUpperCase();
  };

  // Helper to generate a consistent color based on string
  const getAvatarColor = (name: string) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Opponent Management</h2>
          <p className="text-slate-500">Analyze rivals and manage their squads</p>
        </div>
        {canEdit && (
          <button 
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            Add Team
          </button>
        )}
      </div>

      <div className="space-y-4">
        {teams.map((team) => {
          const isExpanded = expandedId === team.id;
          const avatarColor = team.logoUrl ? '' : getAvatarColor(team.name);

          return (
            <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300">
              {/* Accordion Header */}
              <div 
                onClick={() => toggleAccordion(team.id)}
                className={`
                  p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors group
                  ${isExpanded ? 'bg-slate-50 border-b border-slate-100' : ''}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0 overflow-hidden
                    ${avatarColor}
                  `}>
                    {team.logoUrl ? (
                      <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(team.name)
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{team.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{team.players.length} Players</span>
                      <span>•</span>
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
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit Team"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => handleDelete(team.id, team.name, e)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete Team"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                  <div className="w-px h-6 bg-slate-200 mx-2"></div>
                  {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </div>
              </div>

              {/* Accordion Body */}
              <div className={`
                grid transition-[grid-template-rows] duration-300 ease-out
                ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
              `}>
                <div className="overflow-hidden">
                  <div className="p-6 border-t border-slate-100 grid md:grid-cols-3 gap-8">
                    
                    {/* Stats Column */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tactical Analysis</h4>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-800 mb-1">
                          <TrendingUp size={16} />
                          <span className="font-bold text-sm">Key Strength</span>
                        </div>
                        <p className="text-slate-700">{team.strength}</p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <div className="flex items-center gap-2 text-orange-800 mb-1">
                          <AlertCircle size={16} />
                          <span className="font-bold text-sm">Key Weakness</span>
                        </div>
                        <p className="text-slate-700">{team.weakness}</p>
                      </div>
                    </div>

                    {/* Roster Column */}
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                        Squad List
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{team.players.length}</span>
                      </h4>
                      
                      <div className="bg-slate-50 rounded-xl p-4 min-h-[150px] max-h-[300px] overflow-y-auto">
                        {team.players.length === 0 ? (
                           <p className="text-slate-400 text-sm text-center py-4">No players listed yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                             {team.players.map(player => (
                               <div key={player.id} className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 shadow-sm flex items-center gap-2">
                                  {player.name}
                               </div>
                             ))}
                          </div>
                        )}
                      </div>

                      {canEdit && (
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Add player name..." 
                            value={newPlayerName}
                            onChange={(e) => setNewPlayerName(e.target.value)}
                            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(team.id); }}
                          />
                          <button 
                            onClick={() => handleAddPlayer(team.id)}
                            disabled={!newPlayerName.trim()}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        })}
      </div>

      {/* Add/Edit Team Modal */}
      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-slate-900 p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Swords size={20} className="text-orange-400" />
                {editingId ? 'Edit Opponent' : 'Add New Opponent'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-center mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700 hover:border-blue-500 transition-all group overflow-hidden"
                >
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload size={24} className="text-slate-500 group-hover:text-blue-500 mb-1" />
                      <span className="text-xs text-slate-500 group-hover:text-blue-400">Logo</span>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Team Name</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400" 
                  placeholder="e.g. Royal Challengers" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Current Rank</label>
                    <input 
                      type="number"
                      value={formData.rank}
                      onChange={e => setFormData({...formData, rank: Number(e.target.value)})}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                 </div>
                 {/* Color picker could go here, relying on default for now */}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Key Strength</label>
                <input 
                  value={formData.strength}
                  onChange={e => setFormData({...formData, strength: e.target.value})}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400" 
                  placeholder="e.g. Opening Batting" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Key Weakness</label>
                <input 
                  value={formData.weakness}
                  onChange={e => setFormData({...formData, weakness: e.target.value})}
                  className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400" 
                  placeholder="e.g. Spin Bowling" 
                />
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 mt-2">
                {editingId ? 'Update Team' : 'Create Team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpponentTeams;
