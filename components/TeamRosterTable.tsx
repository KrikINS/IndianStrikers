import React, { useState, useEffect } from 'react';
import { TMTeam, TMGroup } from '../types';
import { getTMTeams, addTMTeam, deleteTMTeam } from '../services/storageService';
import { 
  Users, 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Shield, 
  Search,
  CheckCircle2,
  XCircle,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface TeamRosterTableProps {
  tournamentId: string;
  groups: TMGroup[];
  isAdmin?: boolean;
  onTeamAdded?: (team: TMTeam) => void;
  onTeamDeleted?: (id: string) => void;
}

const TeamRosterTable: React.FC<TeamRosterTableProps> = ({ 
  tournamentId, 
  groups, 
  isAdmin = false,
  onTeamAdded,
  onTeamDeleted
}) => {
  const [teams, setTeams] = useState<TMTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTeam, setNewTeam] = useState<Partial<TMTeam>>({
    name: '',
    logo_url: '',
    group_id: ''
  });

  useEffect(() => {
    loadTeams();
  }, [tournamentId]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await getTMTeams(tournamentId);
      setTeams(data);
    } catch (e) {
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeam.name) return toast.error('Team name is required');
    try {
      const res = await addTMTeam({
        ...newTeam,
        tournament_id: tournamentId
      });
      setTeams([...teams, res]);
      if (onTeamAdded) onTeamAdded(res);
      setShowAddForm(false);
      setNewTeam({ name: '', logo_url: '', group_id: '' });
      toast.success('Team registered successfully');
    } catch (e) {
      toast.error('Failed to register team');
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Are you sure? This will remove the team from all fixtures.')) return;
    try {
      await deleteTMTeam(id);
      setTeams(teams.filter(t => t.id !== id));
      if (onTeamDeleted) onTeamDeleted(id);
      toast.success('Team removed');
    } catch (e) {
      toast.error('Failed to remove team');
    }
  };

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    groups.find(g => g.id === t.group_id)?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter teams or groups..."
            className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            {showAddForm ? <Trash2 size={16} /> : <Plus size={16} />}
            {showAddForm ? 'Cancel' : 'Register New Team'}
          </button>
        )}
      </div>

      {/* Quick Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Team Name</label>
                  <input 
                    value={newTeam.name}
                    onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                    placeholder="E.G. Blue Vipers"
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Logo URL (Optional)</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                      value={newTeam.logo_url}
                      onChange={e => setNewTeam({...newTeam, logo_url: e.target.value})}
                      placeholder="https://..."
                      className="w-full h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Group (If Applicable)</label>
                  <div className="flex gap-2">
                    <select 
                      value={newTeam.group_id}
                      onChange={e => setNewTeam({...newTeam, group_id: e.target.value})}
                      className="flex-1 h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold text-white outline-none focus:border-blue-500 transition-all appearance-none"
                    >
                      <option value="">No Group</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id} className="text-slate-900">{g.name}</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleAddTeam}
                      className="bg-blue-600 text-white px-6 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map(team => (
          <motion.div
            layout
            key={team.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group relative"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                {team.logo_url ? (
                  <img src={team.logo_url} className="w-full h-full object-contain p-2" alt={team.name} />
                ) : (
                  <Shield size={32} className="text-slate-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                    {groups.find(g => g.id === team.group_id)?.name || 'Unassigned'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter truncate leading-none">
                  {team.name}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Team Registered</p>
              </div>
            </div>

            {isAdmin && (
              <button 
                onClick={() => handleDeleteTeam(team.id)}
                className="absolute top-4 right-4 p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            )}

            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                    <Users size={10} className="text-slate-300" />
                  </div>
                ))}
                <div className="w-6 h-6 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400">
                  +12
                </div>
              </div>
              <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                View Roster <ArrowRight size={12} />
              </button>
            </div>
          </motion.div>
        ))}

        {filteredTeams.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="text-slate-200" size={32} />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No teams found matching Search</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamRosterTable;
