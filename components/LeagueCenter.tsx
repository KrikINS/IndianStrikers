import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Trash2,
  Edit2,
  Search,
  X,
  BarChart2,
  Award,
  Activity,
  Target,
  Zap,
  Swords
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
  getLeagueStandings,
  deleteLeagueFixture,
  updateLeagueFixture,
  submitLeagueResult,
  getKnockoutMatches,
  setupKnockoutStage,
  updateKnockoutMatch,
  submitKnockoutResult
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
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'schedule' | 'standings' | 'knockout'>('overview');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFixtureModal, setShowAddFixtureModal] = useState(false);
  const [showSetupDrawer, setShowSetupDrawer] = useState(false);
  const [editingFixture, setEditingFixture] = useState<LeagueFixture | null>(null);
  const [scoringFixture, setScoringFixture] = useState<LeagueFixture | null>(null);
  const [scheduleGroupTab, setScheduleGroupTab] = useState<string>('all');
  const [koCrossoverTarget, setKoCrossoverTarget] = useState<string>('');
  const [fixtureSearchQuery, setFixtureSearchQuery] = useState('');
  const [scoreForm, setScoreForm] = useState({ home_runs: '', home_overs: '', away_runs: '', away_overs: '', result_type: 'normal' as 'normal' | 'tie' | 'abandoned' });
  const [knockoutMatches, setKnockoutMatches] = useState<any[]>([]);
  const [scoringKnockout, setScoringKnockout] = useState<any | null>(null);
  const [editingKnockout, setEditingKnockout] = useState<any | null>(null);
  const [knockoutScoreForm, setKnockoutScoreForm] = useState({ home_runs: '', home_overs: '', away_runs: '', away_overs: '' });

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
      const [g, t, f, s, k] = await Promise.all([
        getLeagueGroups(id),
        getLeagueTeams(id),
        getLeagueFixtures(id),
        getLeagueStandings(id),
        getKnockoutMatches(id)
      ]);
      setGroups(g);
      setTeams(t);
      setFixtures(f);
      setStandings(s);
      setKnockoutMatches(k);
    } catch (e) {
      toast.error('Failed to load tournament details');
    }
  };

  const enrichedStandings = useMemo(() => {
    if (!selectedTournament) return [];
    
    // Create a base standing for every team in the tournament
    const baseStandings = teams.map(team => {
      const existing = standings.find(s => s.team_id === team.id);
      if (existing) return existing;
      
      return {
        team_id: team.id,
        team_name: team.team_name,
        logo_url: team.logo_url,
        group_id: team.group_id,
        tournament_id: selectedTournament.id,
        p: 0, w: 0, l: 0, nr: 0, pts: 0, nrr: 0
      } as LeagueStanding;
    });

    // Sort by: Pts (desc), NRR (desc), Team Name (asc)
    return baseStandings.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.nrr !== a.nrr) return b.nrr - a.nrr;
      return a.team_name.localeCompare(b.team_name);
    });
  }, [teams, standings, selectedTournament]);

  const resolveSeed = useCallback((seed: string) => {
    if (!seed || !seed.trim()) return null;
    const match = seed.trim().match(/^([A-Za-z]+)(\d+)$/);
    if (!match) return null;
    const [_, groupNameLetter, rankStr] = match;
    const rank = parseInt(rankStr, 10);
    const group = groups.find(g => g.name.toLowerCase() === groupNameLetter.toLowerCase());
    if (!group) return null;
    const groupStandings = enrichedStandings.filter(s => s.group_id === group.id);
    if (groupStandings.length >= rank) {
      return groupStandings[rank - 1]; // 0-indexed
    }
    return null;
  }, [groups, enrichedStandings]);

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
      const defaultVenue = 'Default Ground';
      const defaultDate = new Date().toISOString().split('T')[0];

      if (selectedTournament.type === 'Groups') {
        // Group-wise generation
        for (const group of groups) {
          const groupTeams = teams.filter(t => t.group_id === group.id);
          if (groupTeams.length < 2) {
            console.log(`[FixtureGen] Skipping Group ${group.name} - insufficient teams (${groupTeams.length})`);
            continue;
          }

          console.log(`[FixtureGen] Generating for Group ${group.name}: ${groupTeams.length} teams`);
          
          for (let i = 0; i < groupTeams.length; i++) {
            for (let j = i + 1; j < groupTeams.length; j++) {
              newFixtures.push({
                tournament_id: selectedTournament.id,
                group_id: group.id,
                home_team_id: groupTeams[i].id,
                away_team_id: groupTeams[j].id,
                home_team_name: groupTeams[i].team_name,
                away_team_name: groupTeams[j].team_name,
                home_team_logo: groupTeams[i].logo_url,
                away_team_logo: groupTeams[j].logo_url,
                date: defaultDate,
                venue: defaultVenue,
                status: 'scheduled',
                group_name: group.name
              });
            }
          }
        }
      } else {
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
              date: defaultDate,
              venue: defaultVenue,
              status: 'scheduled'
            });
          }
        }
      }

      if (newFixtures.length === 0) {
        toast.error('No fixtures could be generated. Check group assignments.');
        return;
      }

      await batchAddLeagueFixtures(newFixtures);
      loadTournamentData(selectedTournament.id);
      toast.success(`${newFixtures.length} fixtures generated`);
    } catch (e) {
      toast.error('Failed to generate fixtures');
    }
  };

  const handleSubmitResult = async () => {
    if (!scoringFixture) return;
    const { home_runs, home_overs, away_runs, away_overs, result_type } = scoreForm;
    if (!home_runs || !home_overs || !away_runs || !away_overs) {
      toast.error('Please fill in all scores and overs');
      return;
    }
    try {
      await submitLeagueResult(scoringFixture.id, {
        home_runs: parseFloat(home_runs),
        home_overs: parseFloat(home_overs),
        away_runs: parseFloat(away_runs),
        away_overs: parseFloat(away_overs),
        result_type
      });
      setScoringFixture(null);
      setScoreForm({ home_runs: '', home_overs: '', away_runs: '', away_overs: '', result_type: 'normal' });
      loadTournamentData(selectedTournament!.id);
      toast.success('Result saved — points table updated!');
    } catch (e) {
      toast.error('Failed to save result');
    }
  };

  const handleUpdateFixture = async () => {
    if (!editingFixture) return;
    try {
      await updateLeagueFixture(editingFixture.id, {
        date: editingFixture.date,
        venue: editingFixture.venue,
        status: editingFixture.status
      });
      setFixtures(fixtures.map(f => f.id === editingFixture.id ? editingFixture : f));
      setEditingFixture(null);
      toast.success('Match updated');
    } catch (e) {
      toast.error('Failed to update match');
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

  const handleDeleteFixture = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this match?')) return;
    try {
      await deleteLeagueFixture(id);
      setFixtures(fixtures.filter(f => f.id !== id));
      toast.success('Match deleted');
    } catch (e) {
      toast.error('Failed to delete match');
    }
  };

  const handleSetupKnockout = async (rounds: string[], crossovers?: any[]) => {
    if (!selectedTournament) return;
    try {
      const data = await setupKnockoutStage(selectedTournament.id, rounds, crossovers);
      setKnockoutMatches(data);
      toast.success(`Knockout stage created — ${data.length} slots`);
    } catch (e) {
      toast.error('Failed to setup knockout stage');
    }
  };

  const handleSubmitKnockoutResult = async () => {
    if (!scoringKnockout) return;
    const { home_runs, home_overs, away_runs, away_overs } = knockoutScoreForm;
    if (!home_runs || !home_overs || !away_runs || !away_overs) {
      toast.error('Please enter all scores and overs');
      return;
    }
    if (parseFloat(home_runs) === parseFloat(away_runs)) {
      toast.error('Knockout matches must have a winner — scores cannot be equal');
      return;
    }
    try {
      if (scoringKnockout.home_team_id && !scoringKnockout.status?.includes('completed')) {
        await updateKnockoutMatch(scoringKnockout.id, {
          home_team_id: scoringKnockout.home_team_id,
          home_team_name: scoringKnockout.home_team_name,
          home_team_logo: scoringKnockout.home_team_logo,
          away_team_id: scoringKnockout.away_team_id,
          away_team_name: scoringKnockout.away_team_name,
          away_team_logo: scoringKnockout.away_team_logo,
        });
      }

      await submitKnockoutResult(scoringKnockout.id, {
        home_runs: parseFloat(home_runs),
        home_overs: parseFloat(home_overs),
        away_runs: parseFloat(away_runs),
        away_overs: parseFloat(away_overs)
      });
      setScoringKnockout(null);
      setKnockoutScoreForm({ home_runs: '', home_overs: '', away_runs: '', away_overs: '' });
      loadTournamentData(selectedTournament!.id);
      toast.success('Result saved!');
    } catch (e) {
      toast.error('Failed to save result');
    }
  };

  const handleUpdateKnockoutMatch = async () => {
    if (!editingKnockout) return;
    try {
      await updateKnockoutMatch(editingKnockout.id, {
        home_team_id: editingKnockout.home_team_id || null,
        home_team_name: editingKnockout.home_team_name || null,
        home_team_logo: editingKnockout.home_team_logo || null,
        away_team_id: editingKnockout.away_team_id || null,
        away_team_name: editingKnockout.away_team_name || null,
        away_team_logo: editingKnockout.away_team_logo || null,
        date: editingKnockout.date || null,
        venue: editingKnockout.venue || null,
        status: editingKnockout.status || 'scheduled'
      });
      setEditingKnockout(null);
      loadTournamentData(selectedTournament!.id);
      toast.success('Match updated');
    } catch (e) {
      toast.error('Failed to update match');
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
            {/* Nav Tabs */}
            <div className="flex items-center gap-2 bg-white rounded-[2rem] p-2 border border-slate-100 shadow-lg shadow-slate-200/50">
              {[
                { id: 'overview', icon: <Activity size={15} />, label: 'Dashboard' },
                { id: 'teams', icon: <Users size={15} />, label: 'Teams' },
                { id: 'schedule', icon: <Calendar size={15} />, label: 'Schedule' },
                { id: 'standings', icon: <TrendingUp size={15} />, label: 'Standings' },
                { id: 'knockout', icon: <Swords size={15} />, label: 'Knockout' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
              <button
                onClick={() => setShowSetupDrawer(true)}
                title="Setup Hub"
                className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-all"
              >
                <Settings size={18} />
              </button>
            </div>

            {/* Tab Panels */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[600px]">
               {activeTab === 'overview' && (() => {
                 const completedFixtures = fixtures.filter(f => f.status === 'completed');
                 const scheduledFixtures = fixtures.filter(f => f.status === 'scheduled');
                 const completionPct = fixtures.length > 0 ? Math.round((completedFixtures.length / fixtures.length) * 100) : 0;
                 const topTeam = enrichedStandings[0];
                 const recentResults = completedFixtures.slice(-3).reverse();
                 return (
                 <div className="p-6 md:p-10 space-y-8">
                   {/* KPI Row */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {[
                       { label: 'Teams', value: teams.length, icon: <Users size={20} />, color: 'from-blue-600 to-blue-400', shadow: 'shadow-blue-200', sub: `${groups.length} Groups` },
                       { label: 'Matches', value: fixtures.length, icon: <Calendar size={20} />, color: 'from-indigo-600 to-violet-500', shadow: 'shadow-indigo-200', sub: `${completedFixtures.length} Completed` },
                       { label: 'Progress', value: `${completionPct}%`, icon: <Target size={20} />, color: 'from-emerald-600 to-teal-400', shadow: 'shadow-emerald-200', sub: `${scheduledFixtures.length} Remaining` },
                       { label: 'Top Team', value: topTeam ? topTeam.pts : '—', icon: <Award size={20} />, color: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-200', sub: topTeam ? topTeam.team_name.split(' ')[0] : 'No Data Yet' }
                     ].map((kpi, i) => (
                       <motion.div
                         key={kpi.label}
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                         className={`bg-gradient-to-br ${kpi.color} rounded-[2rem] p-6 text-white shadow-xl ${kpi.shadow} relative overflow-hidden`}
                       >
                         <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                         <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">{kpi.icon}</div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">{kpi.label}</p>
                         <p className="text-3xl font-black tracking-tighter leading-none">{kpi.value}</p>
                         <p className="text-[10px] font-bold text-white/50 mt-2 uppercase">{kpi.sub}</p>
                       </motion.div>
                     ))}
                   </div>

                   {/* Progress Bar + Groups */}
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-7 shadow-sm">
                       <div className="flex items-center justify-between mb-6">
                         <div>
                           <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tighter">Tournament Progress</h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{selectedTournament.format} · {selectedTournament.year}</p>
                         </div>
                         <span className="text-3xl font-black text-slate-900">{completionPct}<span className="text-sm text-slate-400">%</span></span>
                       </div>
                       <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-8">
                         <motion.div
                           initial={{ width: 0 }}
                           animate={{ width: `${completionPct}%` }}
                           transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
                           className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
                         />
                       </div>
                       <div className="space-y-4">
                         {groups.map((g, gi) => {
                           const gTeams = teams.filter(t => t.group_id === g.id).length;
                           const gFixtures = fixtures.filter(f => f.group_id === g.id);
                           const gDone = gFixtures.filter(f => f.status === 'completed').length;
                           const gPct = gFixtures.length > 0 ? Math.round((gDone / gFixtures.length) * 100) : 0;
                           const colors = ['from-blue-500 to-indigo-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500'];
                           return (
                             <div key={g.id}>
                               <div className="flex items-center justify-between mb-1.5">
                                 <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Group {g.name}</span>
                                   <span className="text-[9px] font-bold text-slate-400">{gTeams} teams · {gFixtures.length} matches</span>
                                 </div>
                                 <span className="text-[10px] font-black text-slate-500">{gDone}/{gFixtures.length}</span>
                               </div>
                               <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                 <motion.div
                                   initial={{ width: 0 }}
                                   animate={{ width: `${gPct}%` }}
                                   transition={{ delay: 0.6 + gi * 0.1, duration: 0.8, ease: 'easeOut' }}
                                   className={`h-full bg-gradient-to-r ${colors[gi % colors.length]} rounded-full`}
                                 />
                               </div>
                             </div>
                           );
                         })}
                         {groups.length === 0 && (
                           <div className="text-center py-4">
                             <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">No groups configured — open Setup Hub to add groups</p>
                           </div>
                         )}
                       </div>
                     </motion.div>

                     {/* Leaderboard */}
                     <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }} className="bg-slate-950 rounded-[2rem] p-7 relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full -mr-24 -mt-24 blur-2xl" />
                       <div className="relative z-10">
                         <div className="flex items-center gap-2 mb-6">
                           <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
                             <Trophy className="text-amber-400" size={16} />
                           </div>
                           <h3 className="text-white font-black uppercase italic tracking-tighter">Leaderboard</h3>
                         </div>
                         <div className="space-y-3">
                           {enrichedStandings.slice(0, 5).map((s, i) => (
                             <motion.div
                               key={s.team_name}
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: 0.5 + i * 0.07 }}
                               className={`flex items-center gap-3 p-3 rounded-2xl ${i === 0 ? 'bg-amber-500/15 border border-amber-500/20' : 'bg-white/5'}`}
                             >
                               <span className={`text-[10px] font-black w-5 text-center ${i === 0 ? 'text-amber-400' : 'text-white/30'}`}>#{i + 1}</span>
                               <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                                 {s.logo_url ? <img src={s.logo_url} className="w-full h-full object-contain" alt="" /> : <Shield className="text-white/20" size={12} />}
                               </div>
                               <p className={`text-[10px] font-black uppercase truncate flex-1 ${i === 0 ? 'text-amber-300' : 'text-white/70'}`}>{s.team_name}</p>
                               <span className={`text-sm font-black ${i === 0 ? 'text-amber-400' : 'text-white/50'}`}>{s.pts}<span className="text-[8px] ml-0.5 opacity-60">pts</span></span>
                             </motion.div>
                           ))}
                           {enrichedStandings.length === 0 && (
                             <div className="text-center py-6">
                               <p className="text-white/20 font-bold uppercase tracking-widest text-[10px]">No data yet</p>
                             </div>
                           )}
                         </div>
                       </div>
                     </motion.div>
                   </div>

                   {/* Recent Results + Quick Actions */}
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="bg-white rounded-[2rem] border border-slate-100 p-7 shadow-sm">
                       <div className="flex items-center gap-2 mb-5">
                         <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                           <Activity className="text-emerald-600" size={15} />
                         </div>
                         <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tighter">Recent Results</h3>
                       </div>
                       {recentResults.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-8 text-center">
                           <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                             <Activity className="text-slate-200" size={22} />
                           </div>
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No results yet</p>
                           <p className="text-[9px] text-slate-300 font-bold mt-1">Enter scores in the Schedule tab</p>
                         </div>
                       ) : (
                         <div className="space-y-3">
                           {recentResults.map((f, i) => {
                             const hw = (f as any).winner_id === f.home_team_id;
                             const aw = (f as any).winner_id === f.away_team_id;
                             return (
                               <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.07 }} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                 <div className={`flex-1 text-right`}>
                                   <p className={`text-[10px] font-black uppercase ${hw ? 'text-emerald-600' : 'text-slate-500'}`}>{f.home_team_name}</p>
                                   <p className="text-lg font-black text-slate-900 leading-none">{(f as any).home_team_runs}</p>
                                   <p className="text-[8px] text-slate-400 font-bold">{(f as any).home_team_overs} ov</p>
                                 </div>
                                 <div className="flex flex-col items-center gap-0.5 px-2">
                                   <span className="text-[8px] font-black text-slate-300 uppercase">vs</span>
                                 </div>
                                 <div className="flex-1">
                                   <p className={`text-[10px] font-black uppercase ${aw ? 'text-emerald-600' : 'text-slate-500'}`}>{f.away_team_name}</p>
                                   <p className="text-lg font-black text-slate-900 leading-none">{(f as any).away_team_runs}</p>
                                   <p className="text-[8px] text-slate-400 font-bold">{(f as any).away_team_overs} ov</p>
                                 </div>
                               </motion.div>
                             );
                           })}
                         </div>
                       )}
                     </motion.div>

                     {/* Quick Actions */}
                     <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-4">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quick Actions</h3>
                       {[
                         { label: 'Manage Teams', sub: `${teams.length} registered`, icon: <Users size={18} />, color: 'bg-blue-600', action: () => setActiveTab('teams') },
                         { label: 'View Schedule', sub: `${fixtures.length} fixtures`, icon: <Calendar size={18} />, color: 'bg-indigo-600', action: () => setActiveTab('schedule') },
                         { label: 'Points Table', sub: `${enrichedStandings.length} teams ranked`, icon: <BarChart2 size={18} />, color: 'bg-amber-500', action: () => setActiveTab('standings') },
                         { label: 'Setup Hub', sub: 'Configure tournament', icon: <Settings size={18} />, color: 'bg-slate-700', action: () => setShowSetupDrawer(true) },
                         ...(fixtures.length === 0 && teams.length >= 2 ? [{ label: 'Generate Fixtures', sub: `${teams.length} teams ready`, icon: <Zap size={18} />, color: 'bg-emerald-600', action: generateFixtures }] : [])
                       ].map((qa, i) => (
                         <motion.button
                           key={qa.label}
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           transition={{ delay: 0.55 + i * 0.06 }}
                           onClick={qa.action}
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           className="w-full bg-white border border-slate-100 rounded-[1.5rem] p-4 flex items-center gap-4 hover:shadow-lg transition-all text-left group"
                         >
                           <div className={`w-10 h-10 ${qa.color} rounded-2xl flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>{qa.icon}</div>
                           <div className="flex-1">
                             <p className="text-xs font-black text-slate-800 uppercase italic">{qa.label}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase">{qa.sub}</p>
                           </div>
                           <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                         </motion.button>
                       ))}
                     </motion.div>
                   </div>
                 </div>
                 );
               })()}

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
                 <div>
                   {/* Group Filter Tabs & Search */}
                   <div className="p-4 border-b border-slate-100 space-y-4 px-8">
                     <div className="flex flex-wrap items-center justify-between gap-3">
                       <div className="flex flex-wrap gap-2">
                         <button
                           onClick={() => setScheduleGroupTab('all')}
                           className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                             scheduleGroupTab === 'all' ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                           }`}
                         >
                           All Groups
                         </button>
                         {groups.map(g => (
                           <button
                             key={g.id}
                             onClick={() => setScheduleGroupTab(g.id)}
                             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                               scheduleGroupTab === g.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                             }`}
                           >
                             Group {g.name}
                           </button>
                         ))}
                       </div>
                       <button 
                         onClick={() => setShowAddFixtureModal(true)}
                         className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                       >
                         <Plus size={14} /> Add Match
                       </button>
                     </div>

                     <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                       <input
                         type="text"
                         placeholder="Search teams..."
                         value={fixtureSearchQuery}
                         onChange={(e) => setFixtureSearchQuery(e.target.value)}
                         className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                       />
                     </div>
                   </div>

                   <div className="overflow-x-auto">
                     <table className="w-full text-left">
                       <thead className="bg-slate-50">
                         <tr>
                           <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                           <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matchup / Result</th>
                           <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Venue</th>
                           <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                           <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {fixtures
                           .filter(f => {
                             const matchesGroup = scheduleGroupTab === 'all' || f.group_id === scheduleGroupTab;
                             const matchesSearch = !fixtureSearchQuery || 
                               f.home_team_name.toLowerCase().includes(fixtureSearchQuery.toLowerCase()) ||
                               f.away_team_name.toLowerCase().includes(fixtureSearchQuery.toLowerCase());
                             return matchesGroup && matchesSearch;
                           })
                           .map(f => {
                             const isCompleted = f.status === 'completed';
                             const homeRuns = (f as any).home_team_runs;
                             const awayRuns = (f as any).away_team_runs;
                             const homeOvers = (f as any).home_team_overs;
                             const awayOvers = (f as any).away_team_overs;
                             const winnerId = (f as any).winner_id;
                             return (
                               <tr key={f.id} className="hover:bg-slate-50/70 transition-colors group">
                                 <td className="px-8 py-5">
                                   <div className="flex items-center gap-2">
                                     <Calendar className="text-slate-300" size={14} />
                                     <div>
                                       <p className="text-xs font-black text-slate-800 uppercase italic">{new Date(f.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}</p>
                                       {f.group_name && <p className="text-[9px] font-black text-blue-500 uppercase mt-0.5">{f.group_name}</p>}
                                     </div>
                                   </div>
                                 </td>
                                 <td className="px-8 py-5">
                                   <div className="flex items-center justify-center gap-3">
                                     <div className="text-right">
                                       <p className={`text-xs font-black uppercase italic truncate max-w-[110px] ${isCompleted && winnerId === f.home_team_id ? 'text-emerald-600' : 'text-slate-800'}`}>{f.home_team_name}</p>
                                       {isCompleted && homeRuns != null && <p className="text-sm font-black text-slate-900">{homeRuns}<span className="text-[9px] text-slate-400 ml-1">({homeOvers} ov)</span></p>}
                                     </div>
                                     <span className="text-[9px] font-black text-slate-300 italic">VS</span>
                                     <div className="text-left">
                                       <p className={`text-xs font-black uppercase italic truncate max-w-[110px] ${isCompleted && winnerId === f.away_team_id ? 'text-emerald-600' : 'text-slate-800'}`}>{f.away_team_name}</p>
                                       {isCompleted && awayRuns != null && <p className="text-sm font-black text-slate-900">{awayRuns}<span className="text-[9px] text-slate-400 ml-1">({awayOvers} ov)</span></p>}
                                     </div>
                                   </div>
                                   {isCompleted && <p className="text-center text-[9px] font-black uppercase mt-1 text-slate-400">{winnerId ? (winnerId === f.home_team_id ? f.home_team_name + ' Won' : f.away_team_name + ' Won') : 'Tie / NR'}</p>}
                                 </td>
                                 <td className="px-8 py-5">
                                   <p className="text-xs font-bold text-slate-500">{f.venue}</p>
                                 </td>
                                 <td className="px-8 py-5">
                                   <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                     f.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                     f.status === 'live' ? 'bg-red-50 text-red-600' :
                                     f.status === 'abandoned' ? 'bg-amber-50 text-amber-600' :
                                     'bg-slate-50 text-slate-400'
                                   }`}>{f.status}</span>
                                 </td>
                                 <td className="px-8 py-5 text-right">
                                   <div className="flex justify-end gap-1.5">
                                     <button
                                       onClick={() => { setScoringFixture(f); setScoreForm({ home_runs: String((f as any).home_team_runs ?? ''), home_overs: String((f as any).home_team_overs ?? ''), away_runs: String((f as any).away_team_runs ?? ''), away_overs: String((f as any).away_team_overs ?? ''), result_type: 'normal' }); }}
                                       title="Enter Score"
                                       className="p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all active:scale-95"
                                     >
                                       <TrendingUp size={15} />
                                     </button>
                                     <button onClick={() => setEditingFixture(f)} title="Edit" className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all active:scale-95">
                                       <Edit2 size={15} />
                                     </button>
                                     <button onClick={() => handleDeleteFixture(f.id)} title="Delete" className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all active:scale-95">
                                       <Trash2 size={15} />
                                     </button>
                                   </div>
                                 </td>
                               </tr>
                             );
                           })}
                       </tbody>
                     </table>
                     {fixtures.filter(f => {
                       const matchesGroup = scheduleGroupTab === 'all' || f.group_id === scheduleGroupTab;
                       const matchesSearch = !fixtureSearchQuery || 
                         f.home_team_name.toLowerCase().includes(fixtureSearchQuery.toLowerCase()) ||
                         f.away_team_name.toLowerCase().includes(fixtureSearchQuery.toLowerCase());
                       return matchesGroup && matchesSearch;
                     }).length === 0 && (
                       <div className="py-16 text-center">
                         <Calendar className="text-slate-200 mx-auto mb-3" size={32} />
                         <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matches found.</p>
                       </div>
                     )}
                   </div>
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
                              entries={enrichedStandings.filter(s => s.group_id === g.id)} 
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
                        <StandingTable entries={enrichedStandings} qCount={4} />
                      </div>
                    )}
                  </div>
                )}

               {/* ─── KNOCKOUT TAB ─── */}
               {activeTab === 'knockout' && (
                 <KnockoutBracket
                   matches={knockoutMatches}
                   teams={teams}
                   tournament={selectedTournament}
                   onReset={() => handleSetupKnockout(['QF','SF','Final'])}
                   onSetup={handleSetupKnockout}
                   onScore={(m) => { setScoringKnockout(m); setKnockoutScoreForm({ home_runs: '', home_overs: '', away_runs: '', away_overs: '' }); }}
                   onEdit={(m) => setEditingKnockout({ ...m })}
                   resolveSeed={resolveSeed}
                 />
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

      {/* Edit Fixture Modal */}
      <AnimatePresence>
        {editingFixture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingFixture(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-slate-900 p-10 text-white relative">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Edit Match</h2>
                 <div className="flex items-center gap-2 mt-4">
                    <span className="text-xs font-black text-white/60 uppercase">{editingFixture.home_team_name}</span>
                    <span className="text-[10px] text-white/20 uppercase font-black">VS</span>
                    <span className="text-xs font-black text-white/60 uppercase">{editingFixture.away_team_name}</span>
                 </div>
              </div>
              <div className="p-10 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Match Date</label>
                      <input 
                        title="Edit Date"
                        type="date"
                        value={editingFixture.date}
                        onChange={e => setEditingFixture({...editingFixture, date: e.target.value})}
                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Venue</label>
                      <input 
                        title="Edit Venue"
                        placeholder="Venue"
                        value={editingFixture.venue}
                        onChange={e => setEditingFixture({...editingFixture, venue: e.target.value})}
                        className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                 </div>

                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Status</label>
                   <select 
                    title="Edit Status"
                    value={editingFixture.status}
                    onChange={e => setEditingFixture({...editingFixture, status: e.target.value as any})}
                    className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                   >
                     <option value="scheduled">Scheduled</option>
                     <option value="live">Live</option>
                     <option value="completed">Completed</option>
                     <option value="abandoned">Abandoned</option>
                   </select>
                 </div>

                 <div className="flex gap-4 mt-6">
                    <button 
                      onClick={() => setEditingFixture(null)}
                      className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpdateFixture}
                      className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-200"
                    >
                      Save Changes
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Score Entry Modal */}
      <AnimatePresence>
        {scoringFixture && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setScoringFixture(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="bg-emerald-900 p-10 text-white relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">Enter Match Result</h2>
                <p className="text-emerald-300/60 text-[11px] font-bold uppercase tracking-widest">Win = 2 pts · Tie = 1 pt · Loss = 0 pts</p>
                <div className="flex items-center gap-2 mt-5">
                  <span className="text-sm font-black text-white uppercase">{scoringFixture.home_team_name}</span>
                  <span className="text-[10px] text-white/20 font-black">VS</span>
                  <span className="text-sm font-black text-white uppercase">{scoringFixture.away_team_name}</span>
                </div>
              </div>
              <div className="p-8 space-y-5">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">{scoringFixture.home_team_name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-2">Runs</label>
                      <input type="number" placeholder="e.g. 145" value={scoreForm.home_runs} onChange={e => setScoreForm({...scoreForm, home_runs: e.target.value})} className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-2">Overs</label>
                      <input type="number" step="0.1" placeholder="e.g. 20.0" value={scoreForm.home_overs} onChange={e => setScoreForm({...scoreForm, home_overs: e.target.value})} className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">{scoringFixture.away_team_name}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-2">Runs</label>
                      <input type="number" placeholder="e.g. 138" value={scoreForm.away_runs} onChange={e => setScoreForm({...scoreForm, away_runs: e.target.value})} className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block px-2">Overs</label>
                      <input type="number" step="0.1" placeholder="e.g. 20.0" value={scoreForm.away_overs} onChange={e => setScoreForm({...scoreForm, away_overs: e.target.value})} className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Result Type</label>
                  <div className="flex gap-2">
                    {(['normal', 'tie', 'abandoned'] as const).map(rt => (
                      <button key={rt} onClick={() => setScoreForm({...scoreForm, result_type: rt})} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${scoreForm.result_type === rt ? (rt === 'normal' ? 'bg-emerald-600 text-white' : rt === 'tie' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white') : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>{rt}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setScoringFixture(null)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                  <button onClick={handleSubmitResult} className="flex-1 bg-emerald-600 text-white py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-200">Save Result</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Knockout Score Entry Modal */}
      <AnimatePresence>
        {scoringKnockout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setScoringKnockout(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-white rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="bg-amber-950 p-10 text-white relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">Knockout Score</h2>
                <p className="text-amber-300/60 text-[11px] font-bold uppercase tracking-widest">{scoringKnockout.round} · {scoringKnockout.home_team_name} vs {scoringKnockout.away_team_name}</p>
              </div>
              <div className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">{scoringKnockout.home_team_name}</label>
                    <input title="Home Runs" type="number" placeholder="Runs" value={knockoutScoreForm.home_runs} onChange={e => setKnockoutScoreForm({...knockoutScoreForm, home_runs: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20" />
                    <input title="Home Overs" type="number" placeholder="Overs" value={knockoutScoreForm.home_overs} onChange={e => setKnockoutScoreForm({...knockoutScoreForm, home_overs: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 mt-2" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">{scoringKnockout.away_team_name}</label>
                    <input title="Away Runs" type="number" placeholder="Runs" value={knockoutScoreForm.away_runs} onChange={e => setKnockoutScoreForm({...knockoutScoreForm, away_runs: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20" />
                    <input title="Away Overs" type="number" placeholder="Overs" value={knockoutScoreForm.away_overs} onChange={e => setKnockoutScoreForm({...knockoutScoreForm, away_overs: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 mt-2" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setScoringKnockout(null)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                  <button onClick={handleSubmitKnockoutResult} className="flex-1 bg-amber-600 text-white py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl shadow-amber-200">Save Result</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Knockout Edit Modal */}
      <AnimatePresence>
        {editingKnockout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingKnockout(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="bg-slate-900 p-10 text-white relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-1">Edit Knockout Match</h2>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{editingKnockout.round} · Slot {editingKnockout.slot_number}</p>
              </div>
              <div className="p-10 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Home Team</label>
                    <select title="Select Home Team" value={editingKnockout.home_team_id || ''} onChange={e => { const t = teams.find(t => t.id === e.target.value); setEditingKnockout({...editingKnockout, home_team_id: e.target.value, home_team_name: t?.team_name || '', home_team_logo: t?.logo_url || ''}); }} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="">-- Select Team --</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Away Team</label>
                    <select title="Select Away Team" value={editingKnockout.away_team_id || ''} onChange={e => { const t = teams.find(t => t.id === e.target.value); setEditingKnockout({...editingKnockout, away_team_id: e.target.value, away_team_name: t?.team_name || '', away_team_logo: t?.logo_url || ''}); }} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="">-- Select Team --</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Match Date</label>
                    <input title="Match Date" type="date" value={editingKnockout.date || ''} onChange={e => setEditingKnockout({...editingKnockout, date: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-2">Venue</label>
                    <input title="Venue" placeholder="Venue" value={editingKnockout.venue || ''} onChange={e => setEditingKnockout({...editingKnockout, venue: e.target.value})} className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>
                <div className="flex gap-4 mt-2">
                  <button onClick={() => setEditingKnockout(null)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                  <button onClick={handleUpdateKnockoutMatch} className="flex-1 bg-blue-600 text-white py-4 rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-200">Save Changes</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Setup Hub Drawer */}
      <AnimatePresence>
        {showSetupDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSetupDrawer(false)}
              className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
              className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="bg-slate-950 p-8 relative overflow-hidden flex-shrink-0">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-24 -mt-24 blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
                        <Settings className="text-white" size={20} />
                      </div>
                      <div>
                        <h2 className="text-white font-black uppercase italic tracking-tighter text-lg">Setup Hub</h2>
                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">Tournament Configuration</p>
                      </div>
                    </div>
                    <button onClick={() => setShowSetupDrawer(false)} title="Close Setup Hub" className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                      <X size={18} />
                    </button>
                  </div>
                  {selectedTournament && (
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                      <Trophy className="text-amber-400" size={16} />
                      <div>
                        <p className="text-white font-black uppercase italic text-sm tracking-tight leading-none">{selectedTournament.name}</p>
                        <p className="text-white/40 text-[9px] font-bold uppercase mt-0.5">{selectedTournament.format} · {selectedTournament.year} · {selectedTournament.type}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {/* Config Card */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Tournament Details</p>
                  <div className="bg-slate-50 rounded-[1.5rem] border border-slate-100 divide-y divide-slate-100">
                    {[
                      { label: 'Format', value: selectedTournament?.format, icon: <BarChart2 size={15} className="text-blue-500" /> },
                      { label: 'Type', value: selectedTournament?.type, icon: <LayoutGrid size={15} className="text-indigo-500" /> },
                      { label: 'Year', value: String(selectedTournament?.year || ''), icon: <Calendar size={15} className="text-emerald-500" /> },
                      { label: 'Status', value: selectedTournament?.status, icon: <Activity size={15} className="text-amber-500" /> },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-4 px-5 py-4">
                        <div className="w-8 h-8 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-sm">{item.icon}</div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                          <p className="text-sm font-black text-slate-800 uppercase italic">{item.value || '—'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Groups */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Groups ({groups.length})</p>
                  <div className="bg-slate-50 rounded-[1.5rem] border border-slate-100 p-5 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {groups.map((g, gi) => {
                        const colors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];
                        return (
                          <motion.span
                            key={g.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: gi * 0.05 }}
                            className={`${colors[gi % colors.length]} px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest`}
                          >
                            Group {g.name}
                          </motion.span>
                        );
                      })}
                    </div>
                    <GroupInput onAdd={handleAddGroup} />
                  </div>
                </div>

                {/* Workflow */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Workflow</p>
                  <div className="space-y-3">
                    <StepItem onClick={() => { setActiveTab('teams'); setShowSetupDrawer(false); }} icon={<Users />} label="Participants" status={teams.length > 0 ? 'done' : 'next'} text={`${teams.length} Teams Registered`} />
                    <StepItem onClick={() => { setActiveTab('schedule'); setShowSetupDrawer(false); }} icon={<Calendar />} label="Fixtures" status={fixtures.length > 0 ? 'done' : teams.length >= 2 ? 'next' : 'todo'} text={`${fixtures.length} Matches Scheduled`} />
                    <StepItem onClick={() => { setActiveTab('standings'); setShowSetupDrawer(false); }} icon={<TrendingUp />} label="Standings" status={fixtures.length > 0 ? 'next' : 'todo'} text="Points Table" />
                  </div>
                </div>

                {/* Knockout Configuration */}
                {selectedTournament?.type === 'Groups' && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Knockout Stage</p>
                    <div className="bg-slate-50 rounded-[1.5rem] border border-slate-100 p-5 space-y-4">
                      {groups.length >= 2 ? (
                        <>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase">Crossover Settings</p>
                            {(() => {
                              const availableGroups = groups.map(g => g.name);
                              const groupA = availableGroups[0];
                              const target = koCrossoverTarget || availableGroups[availableGroups.length - 1];
                              const otherGroups = availableGroups.filter(g => g !== groupA && g !== target);
                              const groupC = otherGroups[0];
                              const groupD = otherGroups[1];

                              return (
                                <div className="space-y-3">
                                  <div className="flex flex-col gap-2 text-[10px] font-bold text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center justify-between">
                                      <span>Group {groupA} Winner plays:</span>
                                      <select 
                                        title="Select Crossover Team"
                                        value={target} 
                                        onChange={(e) => setKoCrossoverTarget(e.target.value)}
                                        className="bg-slate-50 border border-slate-100 rounded px-2 py-1 outline-none text-slate-700"
                                      >
                                        {availableGroups.filter(g => g !== groupA).map(g => (
                                          <option key={g} value={g}>Group {g} Runner-Up</option>
                                        ))}
                                      </select>
                                    </div>
                                    {groupC && groupD && (
                                      <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-50">
                                        <span>Group {groupC} Winner plays:</span>
                                        <span>Group {groupD} Runner-Up</span>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      const crossovers = [
                                        { slot_number: 1, home_seed: `${groupA}1`, away_seed: `${target}2` },
                                        ...(groupC && groupD ? [{ slot_number: 2, home_seed: `${groupC}1`, away_seed: `${groupD}2` }] : []),
                                        ...(groupC && groupD ? [{ slot_number: 3, home_seed: `${groupD}1`, away_seed: `${groupC}2` }] : []),
                                        { slot_number: groupC && groupD ? 4 : 2, home_seed: `${target}1`, away_seed: `${groupA}2` },
                                      ];
                                      handleSetupKnockout(['QF', 'SF', 'Final'], crossovers);
                                      setShowSetupDrawer(false);
                                      setActiveTab('knockout');
                                    }}
                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-blue-200 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                                  >
                                    <Trophy size={14} /> Generate Bracket
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        </>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-500">Requires at least 2 groups.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="flex-shrink-0 p-6 border-t border-slate-100 space-y-3">
                {fixtures.length === 0 && teams.length >= 2 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { generateFixtures(); setShowSetupDrawer(false); }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-blue-200 flex items-center justify-center gap-3 hover:shadow-blue-300 transition-all"
                  >
                    <Zap size={18} /> Generate Match Schedule
                  </motion.button>
                )}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> New Tournament
                </button>
              </div>
            </motion.div>
          </>
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

const StepItem = ({ icon, label, status, text, onClick }: { icon: any, label: string, status: 'done' | 'next' | 'todo', text: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-4 group/item ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
  >
    <div className={`
      w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-white/5 border
      ${status === 'done' ? 'border-emerald-500 text-emerald-500 shadow-lg shadow-emerald-500/20' : 
        status === 'next' ? 'border-white/20 text-white animate-pulse shadow-lg shadow-white/10' : 
        'border-white/5 text-white/20'}
    `}>
      {status === 'done' ? <CheckCircle2 size={24} /> : React.cloneElement(icon, { size: 24 })}
    </div>
    <div className="flex-1 border-b border-white/5 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${status === 'todo' ? 'text-white/20' : 'text-white'}`}>{label}</h4>
          <p className={`text-[11px] font-bold ${status === 'todo' ? 'text-white/10' : 'text-white/40'}`}>{text}</p>
        </div>
        {onClick && status !== 'todo' && (
          <ChevronRight size={14} className="text-white/20 group-hover/item:text-white group-hover/item:translate-x-1 transition-all" />
        )}
      </div>
    </div>
  </div>
);


// ─── Knockout Bracket Component ───────────────────────────────────────────
interface KOProps {
  matches: any[];
  teams: any[];
  tournament: any;
  onReset: () => void;
  onSetup: (rounds: string[], crossovers?: any[]) => void;
  onScore: (m: any) => void;
  onEdit: (m: any) => void;
  resolveSeed?: (s: string) => any;
}

const KOMatchCard: React.FC<{ m: any; barClass: string; onScore: (m: any) => void; onEdit: (m: any) => void; resolveSeed?: (s: string) => any }> = ({ m, barClass, onScore, onEdit, resolveSeed }) => {
  const done = m.status === 'completed';

  let hName = m.home_team_name, hLogo = m.home_team_logo, hId = m.home_team_id;
  if (!hId && m.home_seed && resolveSeed) {
    const r = resolveSeed(m.home_seed);
    if (r) { hName = r.team_name; hLogo = r.logo_url; hId = r.team_id; }
    else { hName = m.home_seed; }
  }

  let aName = m.away_team_name, aLogo = m.away_team_logo, aId = m.away_team_id;
  if (!aId && m.away_seed && resolveSeed) {
    const r = resolveSeed(m.away_seed);
    if (r) { aName = r.team_name; aLogo = r.logo_url; aId = r.team_id; }
    else { aName = m.away_seed; }
  }

  const hw = done && m.winner_id === hId;
  const aw = done && m.winner_id === aId;
  // It's ready to score if both teams are resolved to actual team names (not seeds)
  const ready = hName && aName && hName !== m.home_seed && aName !== m.away_seed;

  const sides = [
    { name: hName as string, logo: hLogo as string, runs: m.home_runs, overs: m.home_overs, won: hw },
    { name: aName as string, logo: aLogo as string, runs: m.away_runs, overs: m.away_overs, won: aw }
  ];

  const handleScoreClick = () => {
    onScore({ ...m, home_team_id: hId, home_team_name: hName, home_team_logo: hLogo, away_team_id: aId, away_team_name: aName, away_team_logo: aLogo });
  };

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className={`bg-white rounded-2xl border-2 overflow-hidden shadow-sm hover:shadow-lg transition-all w-52 flex-shrink-0 ${done ? 'border-emerald-200' : 'border-slate-100'}`}>
      <div className={`h-1 ${barClass}`} />
      <div className="p-4 space-y-1.5">
        {sides.map((s, si) => (
          <div key={si} className={`flex items-center gap-2 p-2 rounded-xl ${s.won ? 'bg-emerald-50' : 'bg-slate-50'}`}>
            <div className="w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {s.logo ? <img src={s.logo} className="w-full h-full object-contain" alt="" /> : <Shield size={10} className="text-slate-200" />}
            </div>
            <p className={`text-[10px] font-black uppercase truncate flex-1 ${s.won ? 'text-emerald-700' : s.name ? 'text-slate-700' : 'text-slate-300'}`}>{s.name || 'TBD'}</p>
            {done && <span className={`text-sm font-black ${s.won ? 'text-emerald-700' : 'text-slate-400'}`}>{s.runs}</span>}
          </div>
        ))}
        {done && m.home_overs && <p className="text-[8px] text-slate-300 font-bold uppercase text-center pt-1">{m.home_overs}ov / {m.away_overs}ov</p>}
        {m.date && <p className="text-[8px] text-slate-300 font-bold text-center">{new Date(m.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</p>}
      </div>
      <div className="px-4 pb-3 flex gap-1 justify-end">
        {ready && !done && (
          <button title="Enter Score" onClick={handleScoreClick} className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all"><TrendingUp size={12} /></button>
        )}
        <button title="Edit Match" onClick={() => onEdit(m)} className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all"><Edit2 size={12} /></button>
      </div>
    </motion.div>
  );
};

const KnockoutBracket: React.FC<KOProps> = ({ matches, teams: _teams, tournament, onReset, onSetup, onScore, onEdit, resolveSeed }) => {
  const qfMatches = matches.filter(m => m.round === 'QF');
  const sfMatches = matches.filter(m => m.round === 'SF');
  const finalMatch = matches.find(m => m.round === 'Final');
  const champion = finalMatch?.winner_name as string | undefined;
  const hasKnockout = matches.length > 0;

  if (!hasKnockout) {
    return (
      <div className="p-6 md:p-8 text-center py-16 space-y-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-amber-100">
            <Trophy className="text-amber-500" size={40} />
          </div>
        </motion.div>
        <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Setup Knockout Stage</h3>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Choose which rounds to generate</p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {[
            { label: 'QF + SF + Final', rounds: ['QF','SF','Final'], sub: '7 matches', g: 'from-blue-600 to-indigo-600', sh: 'shadow-blue-200' },
            { label: 'SF + Final', rounds: ['SF','Final'], sub: '3 matches', g: 'from-emerald-600 to-teal-600', sh: 'shadow-emerald-200' },
            { label: 'Final Only', rounds: ['Final'], sub: '1 match', g: 'from-amber-500 to-orange-500', sh: 'shadow-amber-200' },
          ].map(opt => (
            <motion.button key={opt.label} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.97 }}
              onClick={() => onSetup(opt.rounds)}
              className={`bg-gradient-to-br ${opt.g} text-white px-8 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl ${opt.sh} transition-all`}>
              <div className="text-sm">{opt.label}</div>
              <div className="text-[9px] text-white/60 mt-1">{opt.sub}</div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Road to the Trophy</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{tournament?.name} · Knockout Stage</p>
        </div>
        <button onClick={onReset} className="text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest border border-rose-100 hover:border-rose-300 px-4 py-2 rounded-xl transition-all">Reset Bracket</button>
      </div>
      <div className="overflow-x-auto pb-6">
        <div className="flex items-center gap-6 min-w-max">
          {qfMatches.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest text-center mb-3">Quarter Finals</p>
              <div className="flex flex-col gap-3">
                {qfMatches.map(m => <KOMatchCard key={m.id} m={m} barClass="bg-gradient-to-r from-blue-500 to-indigo-500" onScore={onScore} onEdit={onEdit} resolveSeed={resolveSeed} />)}
              </div>
            </div>
          )}
          {sfMatches.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest text-center mb-3">Semi Finals</p>
              <div className="flex flex-col gap-12">
                {sfMatches.map(m => <KOMatchCard key={m.id} m={m} barClass="bg-gradient-to-r from-violet-500 to-purple-500" onScore={onScore} onEdit={onEdit} resolveSeed={resolveSeed} />)}
              </div>
            </div>
          )}
          {finalMatch && (
            <div>
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest text-center mb-3">Final</p>
              <KOMatchCard m={finalMatch} barClass="bg-gradient-to-r from-amber-500 to-orange-500" onScore={onScore} onEdit={onEdit} resolveSeed={resolveSeed} />
            </div>
          )}
          <div className="flex flex-col items-center gap-3 pl-4">
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}>
              <motion.div
                animate={champion ? { rotate: [0,-10,10,-5,5,0] } : {}}
                transition={{ delay: 0.8, duration: 0.6 }}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ${champion ? 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-amber-300' : 'bg-slate-100'}`}
              >
                <Trophy className={champion ? 'text-white' : 'text-slate-300'} size={36} />
              </motion.div>
              {champion ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="text-center mt-3">
                  <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">🏆 Champion</p>
                  <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight mt-1 max-w-[120px] leading-tight">{champion}</p>
                </motion.div>
              ) : (
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest text-center mt-3">Champions TBD</p>
              )}
            </motion.div>
          </div>
        </div>
      </div>
      <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Edit to assign teams and set match details. Enter score once teams are assigned.</p>
      </div>
    </div>
  );
};


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
