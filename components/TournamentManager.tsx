import React, { useState, useEffect } from 'react';
import { 
  TMTournament, 
  TMGroup, 
  TMTeam, 
  TMFixture, 
  TMStanding 
} from '../types';
import { 
  getTMTournaments, 
  addTMTournament, 
  updateTMTournament, 
  deleteTMTournament,
  getTMGroups,
  addTMGroup,
  deleteTMGroup,
  getTMTeams,
  addTMTeam,
  getTMFixtures,
  batchAddTMFixtures,
  getTMStandings
} from '../services/storageService';
import { 
  Trophy, 
  Plus, 
  Users, 
  Calendar, 
  Settings, 
  ChevronRight, 
  PlusCircle, 
  Trash2, 
  Save, 
  RefreshCw,
  LayoutGrid,
  Shield,
  ArrowRight,
  ChevronDown,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamRosterTable } from './TeamRosterTable';
import { toast } from 'react-hot-toast';

interface TournamentManagerProps {
  isAdmin?: boolean;
}

const TournamentManager: React.FC<TournamentManagerProps> = ({ isAdmin = false }) => {
  const [tournaments, setTournaments] = useState<TMTournament[]>([]);
  const [selectedTourney, setSelectedTourney] = useState<TMTournament | null>(null);
  const [groups, setGroups] = useState<TMGroup[]>([]);
  const [teams, setTeams] = useState<TMTeam[]>([]);
  const [fixtures, setFixtures] = useState<TMFixture[]>([]);
  const [standings, setStandings] = useState<TMStanding[]>([]);
  const [activeTab, setActiveTab] = useState<'setup' | 'teams' | 'schedule' | 'standings'>('setup');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTourneyForm, setNewTourneyForm] = useState<Partial<TMTournament>>({
    name: '',
    format: 'T20',
    type: 'League',
    is_home_away: false,
    status: 'upcoming'
  });

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const data = await getTMTournaments();
      setTournaments(data);
    } catch (e) {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const loadTourneyDetails = async (tourney: TMTournament) => {
    setLoading(true);
    setSelectedTourney(tourney);
    try {
      const g = await getTMGroups(tourney.id);
      const t = await getTMTeams(tourney.id);
      const f = await getTMFixtures(tourney.id);
      const s = await getTMStandings(tourney.id);
      
      setGroups(g);
      setTeams(t);
      setFixtures(f);
      setStandings(s);
    } catch (e) {
      toast.error('Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTournament = async () => {
    if (!newTourneyForm.name) return toast.error('Name is required');
    try {
      const res = await addTMTournament(newTourneyForm);
      setTournaments([res, ...tournaments]);
      setShowAddModal(false);
      setNewTourneyForm({ name: '', format: 'T20', type: 'League', is_home_away: false, status: 'upcoming' });
      toast.success('Tournament created');
      loadTourneyDetails(res);
    } catch (e) {
      toast.error('Failed to create tournament');
    }
  };

  const handleAddGroup = async (name: string) => {
    if (!selectedTourney) return;
    try {
      const g = await addTMGroup({ name, tournament_id: selectedTourney.id });
      setGroups([...groups, g]);
      toast.success('Group added');
    } catch (e) {
      toast.error('Failed to add group');
    }
  };

  // Circle Method Algorithm for Fixture Generation
  const generateSchedule = async (type: 'Single' | 'Double' = 'Single') => {
    if (!selectedTourney || teams.length < 2) return toast.error('Need at least 2 teams');
    
    const teamIds = teams.map(t => t.id);
    const fixturesToAdd: Partial<TMFixture>[] = [];
    
    // Circle Method logic
    const generateForTeams = (ids: string[]) => {
      const n = ids.length;
      const isOdd = n % 2 !== 0;
      const workIds = isOdd ? [...ids, 'BYE'] : [...ids];
      const numTeams = workIds.length;
      const rounds = numTeams - 1;
      const half = numTeams / 2;
      
      const localFixtures = [];
      
      for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < half; i++) {
          const home = workIds[i];
          const away = workIds[numTeams - 1 - i];
          
          if (home !== 'BYE' && away !== 'BYE') {
            localFixtures.push({
              tournament_id: selectedTourney.id,
              home_team_id: home,
              away_team_id: away,
              date: new Date().toISOString(), // User will adjust later
              venue: 'Stadium TBD',
              status: 'upcoming' as const
            });
          }
        }
        // Rotate
        const last = workIds.pop();
        workIds.splice(1, 0, last!);
      }
      return localFixtures;
    };

    if (selectedTourney.type === 'Groups') {
      groups.forEach(g => {
        const groupTeams = teams.filter(t => t.group_id === g.id);
        if (groupTeams.length > 1) {
          const groupFixtures = generateForTeams(groupTeams.map(gt => gt.id));
          fixturesToAdd.push(...groupFixtures.map(f => ({ ...f, group_id: g.id })));
        }
      });
    } else {
      fixturesToAdd.push(...generateForTeams(teamIds));
    }

    if (type === 'Double' || selectedTourney.is_home_away) {
      const double = fixturesToAdd.map(f => ({
        ...f,
        home_team_id: f.away_team_id,
        away_team_id: f.home_team_id
      }));
      fixturesToAdd.push(...double);
    }

    try {
      await batchAddTMFixtures(fixturesToAdd);
      loadTourneyDetails(selectedTourney);
      toast.success(`Generated ${fixturesToAdd.length} fixtures`);
      setActiveTab('schedule');
    } catch (e) {
      toast.error('Batch generation failed');
    }
  };

  if (!selectedTourney) {
    return (
      <div className="space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
              <Trophy className="text-amber-500" /> Tournament Hub
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage league structures and standings</p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95"
            >
              <Plus size={16} /> Create Tournament
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map(t => (
            <button
              key={t.id}
              onClick={() => loadTourneyDetails(t)}
              className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all text-left group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors" />
              <div className="relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${t.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Trophy size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase italic leading-tight mb-1">{t.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.format}</span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.type}</span>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                    t.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    {t.status}
                  </span>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>
          ))}
          
          {tournaments.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LayoutGrid className="text-slate-200" size={32} />
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No tournaments created yet</p>
            </div>
          )}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 italic">Configure Tournament</h3>
                <button title="Close Modal" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block px-1">Tournament Title</label>
                  <input 
                    value={newTourneyForm.name} 
                    onChange={e => setNewTourneyForm({ ...newTourneyForm, name: e.target.value })}
                    placeholder="E.G. Hayes League T20"
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block px-1">Format</label>
                    <select 
                      title="Select Format"
                      value={newTourneyForm.format}
                      onChange={e => setNewTourneyForm({ ...newTourneyForm, format: e.target.value })}
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                    >
                      <option value="T20">T20</option>
                      <option value="One Day">One Day</option>
                      <option value="Test">Test/Multi-Day</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block px-1">Type</label>
                    <select 
                      title="Select Type"
                      value={newTourneyForm.type}
                      onChange={e => setNewTourneyForm({ ...newTourneyForm, type: e.target.value as any })}
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                    >
                      <option value="League">League (Single Table)</option>
                      <option value="Groups">Groups (A, B, C...)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <input 
                    type="checkbox" 
                    id="home_away"
                    checked={newTourneyForm.is_home_away}
                    onChange={e => setNewTourneyForm({ ...newTourneyForm, is_home_away: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-blue-200 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="home_away" className="text-[11px] font-bold text-blue-900 leading-tight">Enable Home/Away logic (Double fixture generation)</label>
                </div>
                <button 
                  onClick={handleAddTournament}
                  className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-slate-200 uppercase tracking-widest text-[11px] flex items-center justify-center gap-2"
                >
                  Confirm & Initialize <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Detail Header */}
      <header className="mb-8">
        <button onClick={() => setSelectedTourney(null)} className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest hover:text-blue-600 transition-colors mb-4 group">
          <Trash2 size={12} className="group-hover:scale-110 transition-transform" /> Back to Dashboard
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-amber-200 text-white">
              <Trophy size={40} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest">{selectedTourney.format}</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-widest">{selectedTourney.type}</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">{selectedTourney.name}</h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Users size={14} /> {teams.length} Teams Registered</p>
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar size={14} /> {fixtures.length} Fixtures Scheduled</p>
              </div>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200">
            {[
              { id: 'setup', icon: Settings, label: 'Setup' },
              { id: 'teams', icon: Users, label: 'Teams' },
              { id: 'schedule', icon: Calendar, label: 'Schedule' },
              { id: 'standings', icon: LayoutGrid, label: 'Standings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'setup' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 italic mb-6 flex items-center gap-2">
                    <Shield size={18} className="text-blue-500" /> Administrative Setup
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Tournament Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['upcoming', 'active', 'completed'].map(st => (
                          <button
                            key={st}
                            onClick={() => setSelectedTourney({...selectedTourney, status: st as any})}
                            className={`py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                              selectedTourney.status === st 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:border-blue-200'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedTourney.type === 'Groups' && (
                      <div className="animate-in fade-in slide-in-from-top-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">Tournament Groups</label>
                        <div className="space-y-2 mb-4">
                          {groups.map(g => (
                            <div key={g.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl group transition-all hover:bg-white hover:border-blue-200">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-blue-600 shadow-sm uppercase tracking-tighter italic">
                                  {g.name.substring(0,1)}
                                </div>
                                <span className="text-sm font-bold text-slate-800 uppercase">{g.name}</span>
                              </div>
                              <button title="Delete Group" onClick={() => deleteTMGroup(g.id).then(() => setGroups(groups.filter(x => x.id !== g.id)))} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input 
                            id="group-name-input"
                            placeholder="Add New Group (e.g. Group A)"
                            className="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                handleAddGroup((e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                          <button 
                            onClick={() => {
                              const el = document.getElementById('group-name-input') as HTMLInputElement;
                              handleAddGroup(el.value);
                              el.value = '';
                            }}
                            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-200 transition-all font-black text-xs uppercase"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => updateTMTournament(selectedTourney.id, selectedTourney).then(() => toast.success('Tournament Updated'))}
                      className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all mt-8"
                    >
                      <Save size={18} /> Save Global Settings
                    </button>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-all duration-500" />
                  <div className="relative z-10">
                    <h2 className="text-lg font-black uppercase italic tracking-tighter mb-2">Automated Scheduler</h2>
                    <p className="text-blue-100 text-[11px] font-bold uppercase tracking-widest leading-relaxed mb-8 opacity-80">
                      Generate a professional round-robin schedule using the Circle Method algorithm. Ensure all teams participate in balanced fixtures.
                    </p>
                    
                    <div className="space-y-3">
                      <button 
                        onClick={() => generateSchedule('Single')}
                        className="w-full py-4 bg-white text-blue-700 font-black rounded-2xl shadow-xl hover:bg-slate-50 transition-all active:scale-[0.98] uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 group"
                      >
                        Generate Single Round <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                      <button 
                        onClick={() => generateSchedule('Double')}
                        className="w-full py-4 bg-white/10 border border-white/20 text-white font-black rounded-2xl hover:bg-white/20 transition-all active:scale-[0.98] uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 backdrop-blur-md"
                      >
                        Generate Home/Away Cycle <RefreshCw size={16} />
                      </button>
                    </div>

                    <div className="mt-8 flex items-center gap-3 p-4 bg-black/20 rounded-2xl border border-white/10 backdrop-blur-sm">
                      <AlertCircle className="text-blue-300" size={24} />
                      <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest leading-normal">
                        Note: This will overwrite any manual fixtures. Use this as a foundation to start your tournament schedule.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TeamRosterTable 
                tournamentId={selectedTourney.id} 
                groups={groups}
                isAdmin={isAdmin}
                onTeamAdded={(team: TMTeam) => setTeams([...teams, team])}
                onTeamDeleted={(id: string) => setTeams(teams.filter(t => t.id !== id))}
              />
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 italic">Fixture Manifest</h3>
                  <button onClick={() => loadTourneyDetails(selectedTourney)} className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline flex items-center gap-1">
                    <RefreshCw size={12} /> Sync Fixtures
                  </button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50">
                       <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
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
                                 f.status === 'live' ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-50 text-slate-400'
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
                     <Calendar className="text-slate-100 mx-auto mb-4" size={48} />
                     <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No fixtures generated yet</p>
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'standings' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               {selectedTourney.type === 'Groups' ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   {groups.map(g => (
                     <div key={g.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                          <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 italic">{g.name} Standings</h3>
                          <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
                 <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                    <div className="px-8 py-8 border-b border-slate-100 flex items-center justify-between">
                       <div>
                         <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 italic leading-none">Overall Points Table</h3>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                           <AlertCircle size={12} className="text-blue-400" /> Top 4 qualify for knockouts
                         </p>
                       </div>
                       <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shadow-inner">
                         <LayoutGrid size={24} className="text-slate-200" />
                       </div>
                    </div>
                    <StandingTable entries={standings} qCount={4} />

                 </div>
               )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const StandingTable = ({ entries, qCount = 4 }: { entries: TMStanding[], qCount?: number }) => {
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


export default TournamentManager;
