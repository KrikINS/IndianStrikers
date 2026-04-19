import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Plus, 
  Users, 
  Calendar, 
  LayoutGrid, 
  Shield, 
  ChevronRight, 
  ArrowRight,
  TrendingUp,
  Settings,
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getLeagueTournaments, 
  addLeagueTournament, 
  getLeagueGroups, 
  addLeagueGroup, 
  getLeagueTeams, 
  getLeagueFixtures, 
  batchAddLeagueFixtures,
  getLeagueStandings 
} from '../services/storageService';
import { 
  LeagueTournament, 
  LeagueGroup, 
  LeagueTeam, 
  LeagueFixture, 
  LeagueStanding 
} from '../types';
import LeagueTeamManager from './LeagueTeamManager';
import { toast } from 'react-hot-toast';

const LeagueCenter: React.FC = () => {
  const [tournaments, setTournaments] = useState<LeagueTournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<LeagueTournament | null>(null);
  const [groups, setGroups] = useState<LeagueGroup[]>([]);
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [fixtures, setFixtures] = useState<LeagueFixture[]>([]);
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'schedule' | 'standings'>('overview');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFixtureModal, setShowAddFixtureModal] = useState(false);

  // Form states for setup
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [newTournament, setNewTournament] = useState<Partial<LeagueTournament>>({
    name: '',
    year: new Date().getFullYear(),
    format: 'T20',
    type: 'League',
    is_home_away: false,
    status: 'upcoming'
  });

  const [newFixture, setNewFixture] = useState<Partial<LeagueFixture>>({
    home_team_id: '',
    away_team_id: '',
    date: new Date().toISOString().split('T')[0],
    venue: '',
    group_id: ''
  });


  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentData(selectedTournament.id);
    }
  }, [selectedTournament]);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const data = await getLeagueTournaments();
      setTournaments(data);
      if (data.length > 0 && !selectedTournament) {
        setSelectedTournament(data[0]);
      }
    } catch (e) {
      toast.error('Failed to load league tournaments');
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentData = async (id: string) => {
    try {
      const [g, t, f, s] = await Promise.all([
        getLeagueGroups(id),
        getLeagueTeams(id),
        getLeagueFixtures(id),
        getLeagueStandings(id)
      ]);
      setGroups(g);
      setTeams(t);
      setFixtures(f);
      setStandings(s);
    } catch (e) {
      toast.error('Failed to load tournament details');
    }
  };

  const handleCreateTournament = async () => {
    if (!newTournament.name) return toast.error('Name is required');
    try {
      const t = await addLeagueTournament(newTournament);
      setTournaments([t, ...tournaments]);
      setSelectedTournament(t);
      setShowAddModal(false);
      setIsSettingUp(true);
      toast.success('Tournament created successfully');
    } catch (e) {
      toast.error('Failed to create tournament');
    }
  };

  const handleAddGroup = async (name: string) => {
    if (!selectedTournament) return;
    try {
      const g = await addLeagueGroup({ tournament_id: selectedTournament.id, name });
      setGroups([...groups, g]);
      toast.success('Group added');
    } catch (e) {
      toast.error('Failed to add group');
    }
  };

  const generateFixtures = async () => {
    if (!selectedTournament || teams.length < 2) {
      toast.error('At least 2 teams are required to generate fixtures');
      return;
    }

    try {
      const newFixtures: Partial<LeagueFixture>[] = [];
      const venue = 'Default Ground';
      const date = new Date().toISOString().split('T')[0];

      // Simple implementation: Everyone plays everyone once
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            newFixtures.push({
                tournament_id: selectedTournament.id,
                home_team_id: teams[i].id,
                away_team_id: teams[j].id,
                home_team_name: teams[i].team_name,
                away_team_name: teams[j].team_name,
                home_team_logo: teams[i].logo_url,
                away_team_logo: teams[j].logo_url,
                date,
                venue,
                status: 'scheduled'
            });
        }
      }

      await batchAddLeagueFixtures(newFixtures);
      loadTournamentData(selectedTournament.id);
      toast.success(`${newFixtures.length} fixtures generated`);
    } catch (e) {
      toast.error('Failed to generate fixtures');
    }
  };

  const handleAddFixture = async () => {
    if (!selectedTournament) return;
    if (!newFixture.home_team_id || !newFixture.away_team_id || !newFixture.date) {
      toast.error('Teams and Date are required');
      return;
    }
    if (newFixture.home_team_id === newFixture.away_team_id) {
      toast.error('Teams must be different');
      return;
    }

    try {
      const homeTeam = teams.find(t => t.id === newFixture.home_team_id);
      const awayTeam = teams.find(t => t.id === newFixture.away_team_id);
      const group = groups.find(g => g.id === newFixture.group_id);

      const fixtureData: Partial<LeagueFixture> = {
        tournament_id: selectedTournament.id,
        group_id: newFixture.group_id || undefined,
        home_team_id: newFixture.home_team_id,
        away_team_id: newFixture.away_team_id,
        home_team_name: homeTeam?.team_name || '',
        away_team_name: awayTeam?.team_name || '',
        home_team_logo: homeTeam?.logo_url,
        away_team_logo: awayTeam?.logo_url,
        date: newFixture.date,
        venue: newFixture.venue || 'TBA',
        group_name: group?.name || ''
      };

      await batchAddLeagueFixtures([fixtureData]);
      setShowAddFixtureModal(false);
      setNewFixture({
        home_team_id: '',
        away_team_id: '',
        date: new Date().toISOString().split('T')[0],
        venue: '',
        group_id: ''
      });
      loadTournamentData(selectedTournament.id);
      toast.success('Match scheduled successfully');
    } catch (e) {
      toast.error('Failed to schedule match');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* ... header ... (no changes needed to header) */}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Trophy className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">LEAGUE CENTER</h1>
            </div>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest pl-13">External League Management Module</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-3">
               <select 
                 title="Select Tournament"
                 value={selectedTournament?.id} 
                 onChange={e => setSelectedTournament(tournaments.find(t => t.id === e.target.value) || null)}
                 className="bg-transparent border-none outline-none text-sm font-black text-slate-700 uppercase italic"
               >
                 {tournaments.map(t => (
                   <option key={t.id} value={t.id}>{t.name} {t.year}</option>
                 ))}
                 {tournaments.length === 0 && <option>No Tournaments</option>}
               </select>
             </div>
             <button 
               title="Create Tournament"
               onClick={() => setShowAddModal(true)}
               className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
             >
               <Plus size={20} />
             </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto">
        {!selectedTournament ? (
          <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Trophy className="text-slate-200" size={40} />
             </div>
             <h2 className="text-2xl font-black text-slate-400 uppercase italic mb-4">No League Tournaments Found</h2>
             <button 
               onClick={() => setShowAddModal(true)}
               className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-200"
             >
               Create Your First League
             </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Stats / Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { id: 'overview', icon: <LayoutGrid size={18} />, label: 'Setup Hub', color: 'blue' },
                { id: 'teams', icon: <Users size={18} />, label: 'Teams', color: 'emerald' },
                { id: 'schedule', icon: <Calendar size={18} />, label: 'Match Schedule', color: 'indigo' },
                { id: 'standings', icon: <TrendingUp size={18} />, label: 'Points Table', color: 'amber' }
              ].map(tab => (

                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    p-6 rounded-[2rem] border transition-all flex items-center gap-4 group
                    ${activeTab === tab.id 
                      ? `bg-slate-900 border-slate-900 text-white shadow-2xl` 
                      : `bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:shadow-lg hover:scale-105`
                    }
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center transition-colors
                    ${activeTab === tab.id ? 'bg-white/10' : 'bg-slate-50 group-hover:bg-slate-100'}
                  `}>
                    {tab.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest leading-none mb-1">{tab.label}</h3>
                    <p className={`text-[10px] font-bold ${activeTab === tab.id ? 'text-white/40' : 'text-slate-300'}`}>Manage Data</p>
                  </div>
                  <ChevronRight size={16} className={`ml-auto opacity-0 group-hover:opacity-100 transition-all ${activeTab === tab.id ? 'translate-x-0' : '-translate-x-2'}`} />
                </button>
              ))}
            </div>

            {/* Tab Panels */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[600px]">
               {activeTab === 'overview' && (
                 <div className="p-8 md:p-12">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     <div>
                       <h3 className="text-lg font-black text-slate-800 uppercase italic mb-8 flex items-center gap-2">
                         <div className="w-2 h-8 bg-blue-600 rounded-full" />
                         Tournament Configuration
                       </h3>
                       <div className="space-y-6">
                         <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                           <div className="flex items-center gap-4 mb-4">
                             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                               <Settings className="text-slate-400" size={20} />
                             </div>
                             <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase">Format</p>
                               <p className="text-sm font-black text-slate-700 uppercase italic">{selectedTournament.format}</p>
                             </div>
                           </div>
                           <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
                               <Calendar className="text-slate-400" size={20} />
                             </div>
                             <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase">Year</p>
                               <p className="text-sm font-black text-slate-700 uppercase italic">{selectedTournament.year}</p>
                             </div>
                           </div>
                         </div>
                         
                         {/* Group Manager */}
                         <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-200">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Groups ({groups.length})</h4>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {groups.map(g => (
                                <span key={g.id} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                  {g.name}
                                  <AlertCircle size={10} className="ml-1" />
                                </span>
                              ))}
                              <GroupInput onAdd={handleAddGroup} />
                            </div>
                         </div>
                       </div>
                     </div>

                     <div className="bg-slate-950 rounded-[3rem] p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-3xl" />
                        <div className="relative z-10 flex flex-col h-full">
                           <div className="mb-auto">
                             <div className="flex items-center gap-3 mb-6">
                               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                 <ArrowRight className="text-white" size={24} />
                               </div>
                               <h3 className="text-white text-xl font-black uppercase italic tracking-tighter">Workflow Engine</h3>
                             </div>
                             <div className="space-y-6">
                               <StepItem icon={<Users />} label="Participants" status={teams.length > 0 ? 'done' : 'next'} text={`${teams.length} Teams Registered`} />
                               <StepItem icon={<Calendar />} label="Fixtures" status={fixtures.length > 0 ? 'done' : teams.length >= 2 ? 'next' : 'todo'} text={`${fixtures.length} Matches Scheduled`} />
                               <StepItem icon={<TrendingUp />} label="Standings" status={fixtures.length > 0 ? 'next' : 'todo'} text="Points Table Ready" />
                             </div>
                           </div>

                           <div className="mt-12">
                             {fixtures.length === 0 && teams.length >= 2 ? (
                               <button 
                                 onClick={generateFixtures}
                                 className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-3"
                               >
                                 <Plus size={20} /> Generate Match Schedule
                               </button>
                             ) : (
                               <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] text-center">
                                 <p className="text-white/40 font-bold uppercase tracking-widest text-[10px]">Ready to receive scores</p>
                               </div>
                             )}
                           </div>
                        </div>
                     </div>
                   </div>
                 </div>
               )}

               {activeTab === 'teams' && (
                 <div className="p-8 md:p-12">
                    <LeagueTeamManager 
                      tournamentId={selectedTournament.id} 
                      groups={groups} 
                      isAdmin={true} 
                    />
                 </div>
               )}

               {activeTab === 'schedule' && (
                 <div className="overflow-x-auto">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center px-8">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Match Schedule</h4>
                       <button 
                         onClick={() => setShowAddFixtureModal(true)}
                         className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                       >
                         <Plus size={14} /> Add Match
                       </button>
                    </div>
                    <table className="w-full text-left">

                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matchup</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Venue</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fixtures.map(f => {
                        const hasConflict = fixtures.filter(other => 
                          other.id !== f.id && 
                          new Date(other.date).toLocaleDateString() === new Date(f.date).toLocaleDateString() &&
                          (other.home_team_id === f.home_team_id || other.home_team_id === f.away_team_id || 
                           other.away_team_id === f.home_team_id || other.away_team_id === f.away_team_id)
                        ).length > 0;

                        return (
                          <tr key={f.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-3">
                                 <Calendar className="text-slate-300 group-hover:text-blue-500 transition-colors" size={16} />
                                 <div>
                                   <p className="text-xs font-black text-slate-900 uppercase italic leading-none">{new Date(f.date).toLocaleDateString()}</p>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">10:00 AM</p>
                                 </div>
                               </div>
                            </td>
                            <td className="px-8 py-6 text-center">
                              <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center gap-4">
                                   <div className="text-right flex-1 hidden sm:block">
                                     <p className="text-xs font-black text-slate-900 uppercase italic truncate max-w-[120px]">{f.home_team_name}</p>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform overflow-hidden">
                                        {f.home_team_logo ? <img src={f.home_team_logo} className="w-full h-full object-contain" alt="" /> : <Shield className="text-slate-200" size={20} />}
                                     </div>
                                     <span className="text-[10px] font-black text-slate-300 italic px-2">VS</span>
                                     <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform overflow-hidden">
                                        {f.away_team_logo ? <img src={f.away_team_logo} className="w-full h-full object-contain" alt="" /> : <Shield className="text-slate-200" size={20} />}
                                     </div>
                                   </div>
                                   <div className="text-left flex-1 hidden sm:block">
                                     <p className="text-xs font-black text-slate-900 uppercase italic truncate max-w-[120px]">{f.away_team_name}</p>
                                   </div>
                                </div>
                                {hasConflict && (
                                  <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 text-rose-500 rounded border border-rose-100">
                                    <AlertCircle size={10} />
                                    <span className="text-[8px] font-black uppercase tracking-tighter">Conflict Detected</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">{f.venue}</p>
                              {f.group_name && <p className="text-[9px] font-black text-blue-500 uppercase mt-1">{f.group_name}</p>}
                            </td>
                            <td className="px-8 py-6 text-right">
                               <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                 f.status === 'live' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'
                               }`}>
                                 {f.status}
                               </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                 </table>
                 {fixtures.length === 0 && (
                   <div className="py-20 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="text-slate-200" size={32} />
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matches scheduled yet.</p>
                   </div>
                 )}
               </div>
               )}

               {activeTab === 'standings' && (
                 <div className="p-8">
                    {groups.length > 0 ? (
                      <div className="space-y-12">
                        {groups.map(g => (
                          <div key={g.id}>
                            <div className="flex items-center gap-3 mb-6 px-4">
                              <h4 className="text-2xl font-black text-slate-900 italic uppercase">Group {g.name}</h4>
                              <div className="flex-1 border-b border-slate-100 h-px relative flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-300 opacity-30" />
                              </div>
                            </div>
                            <StandingTable 
                              entries={standings.filter(s => s.group_id === g.id)} 
                              qCount={g.top_q_count || 2} 
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-[3rem] p-10 border border-slate-100">
                        <div className="flex items-center justify-between mb-8">
                           <h4 className="text-2xl font-black text-slate-900 italic uppercase">Overall Standings</h4>
                           <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                             <LayoutGrid size={24} className="text-slate-200" />
                           </div>
                        </div>
                        <StandingTable entries={standings} qCount={4} />
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-slate-900 p-10 text-white relative">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Create League</h2>
                 <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Standalone Tournament Setup</p>
              </div>
              <div className="p-10 space-y-6">
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Tournament Name</label>
                   <input 
                      value={newTournament.name}
                      onChange={e => setNewTournament({...newTournament, name: e.target.value})}
                      placeholder="E.G. Premier League 2026"
                      className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Format</label>
                       <select 
                         title="Select Format"
                         value={newTournament.format}
                         onChange={e => setNewTournament({...newTournament, format: e.target.value as any})}
                         className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                       >
                         <option value="T20">T20</option>
                         <option value="One Day">One Day</option>
                         <option value="T10">T10</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Structure</label>
                       <select 
                         title="Select Structure"
                         value={newTournament.type}
                         onChange={e => setNewTournament({...newTournament, type: e.target.value as any})}
                         className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                       >
                         <option value="League">Single Table</option>
                         <option value="Groups">Split Groups</option>
                      </select>
                    </div>
                 </div>
                 <button 
                   onClick={handleCreateTournament}
                   className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 mt-4"
                 >
                   Confirm & Proceed
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Fixture Modal */}
      <AnimatePresence>
        {showAddFixtureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddFixtureModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-blue-600 p-10 text-white relative">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Schedule Match</h2>
                 <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Manual Fixture Entry</p>
              </div>
              <div className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Home Team</label>
                       <select 
                         title="Select Home Team"
                         value={newFixture.home_team_id}
                         onChange={e => setNewFixture({...newFixture, home_team_id: e.target.value})}
                         className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                       >
                         <option value="">Select Home Team</option>
                         {teams.map(t => (
                           <option key={t.id} value={t.id}>{t.team_name}</option>
                         ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Away Team</label>
                       <select 
                         title="Select Away Team"
                         value={newFixture.away_team_id}
                         onChange={e => setNewFixture({...newFixture, away_team_id: e.target.value})}
                         className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                       >
                         <option value="">Select Away Team</option>
                         {teams.map(t => (
                           <option key={t.id} value={t.id}>{t.team_name}</option>
                         ))}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Date</label>
                       <input 
                         title="Match Date"
                         type="date"
                         value={newFixture.date}
                         onChange={e => setNewFixture({...newFixture, date: e.target.value})}
                         className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                       />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Venue</label>
                      <input 
                        value={newFixture.venue}
                        onChange={e => setNewFixture({...newFixture, venue: e.target.value})}
                        placeholder="E.G. Ground A"
                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                 </div>

                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Group (Optional)</label>
                   <select 
                    title="Select Group"
                    value={newFixture.group_id}
                    onChange={e => setNewFixture({...newFixture, group_id: e.target.value})}
                    className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                   >
                     <option value="">None</option>
                     {groups.map(g => (
                       <option key={g.id} value={g.id}>{g.name}</option>
                     ))}
                   </select>
                 </div>

                 <button 
                   onClick={handleAddFixture}
                   className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-200 mt-4"
                 >
                   Schedule Match
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


const GroupInput = ({ onAdd }: { onAdd: (name: string) => void }) => {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-1">
      <input 
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="New Group..."
        className="w-32 h-10 bg-slate-50 border border-slate-100 rounded-xl px-4 text-[10px] font-bold text-slate-700 outline-none"
      />
      <button 
        title="Add Group"
        onClick={() => { if(val) onAdd(val); setVal(''); }}
        className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-800"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

const StepItem = ({ icon, label, status, text }: { icon: any, label: string, status: 'done' | 'next' | 'todo', text: string }) => (
  <div className="flex items-center gap-4 group/item">
    <div className={`
      w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-white/5 border
      ${status === 'done' ? 'border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/20' : 
        status === 'next' ? 'border-white/20 text-white animate-pulse shadow-lg shadow-white/10' : 
        'border-white/5 text-white/20'}
    `}>
      {status === 'done' ? <CheckCircle2 size={24} /> : React.cloneElement(icon, { size: 24 })}
    </div>
    <div className="flex-1 border-b border-white/5 pb-4">
      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${status === 'todo' ? 'text-white/20' : 'text-white'}`}>{label}</h4>
      <p className={`text-[11px] font-bold ${status === 'todo' ? 'text-white/10' : 'text-white/40'}`}>{text}</p>
    </div>
  </div>
);

const StandingTable = ({ entries, qCount = 4 }: { entries: LeagueStanding[], qCount?: number }) => {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
        No Data Available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/50">
            <th className="pl-8 pr-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Psn</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Team</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">P</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">W</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">L</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">NR</th>
            <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Pts</th>
            <th className="px-8 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">NRR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((ent, idx) => {
            const isQualifying = idx < qCount;
            return (
              <tr key={`${ent.team_id}-${idx}`} className={`hover:bg-blue-50/30 transition-all group ${isQualifying ? 'bg-emerald-50/10' : ''} relative`}>
                <td className="pl-8 pr-4 py-5">
                   <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm ${
                     isQualifying ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
                   }`}>
                     {idx + 1}
                   </div>
                   {isQualifying && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[2px_0_10px_rgba(16,185,129,0.3)]" />}
                </td>
                <td className="px-4 py-5">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-white border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center">
                       {ent.logo_url ? <img src={ent.logo_url} className="w-full h-full object-contain" alt="" /> : <Shield size={14} className="text-slate-300" />}
                     </div>
                     <span className="text-[11px] font-black text-slate-900 uppercase italic tracking-tight leading-none truncate max-w-[150px]">{ent.team_name}</span>
                   </div>
                </td>
                <td className="px-4 py-5 text-center text-xs font-bold text-slate-600">{ent.p}</td>
                <td className="px-4 py-5 text-center text-xs font-bold text-emerald-600">{ent.w}</td>
                <td className="px-4 py-5 text-center text-xs font-bold text-red-500">{ent.l}</td>
                <td className="px-4 py-5 text-center text-xs font-bold text-slate-400">{ent.nr}</td>
                <td className="px-4 py-5 text-center text-xs font-black text-slate-900 italic tracking-tighter">{ent.pts}</td>
                <td className="px-8 py-5 text-center">
                   <span className={`text-[11px] font-black italic tracking-tighter ${ent.nrr >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                     {ent.nrr >= 0 ? '+' : ''}{parseFloat(String(ent.nrr)).toFixed(3)}
                   </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LeagueCenter;
