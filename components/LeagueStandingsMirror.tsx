import React, { useState, useEffect } from 'react';
import { getLeagueStandings, getLeagueTournaments, getLeagueGroups, getLeagueTeams } from '../services/storageService';
import { LeagueStanding, LeagueTournament, LeagueGroup, LeagueTeam } from '../types';
import LeagueStandingTable from './LeagueStandingTable';
import { LayoutGrid, Trophy, TrendingUp } from 'lucide-react';

const LeagueStandingsMirror: React.FC = () => {
  const [standings, setStandings] = useState<LeagueStanding[]>([]);
  const [groups, setGroups] = useState<LeagueGroup[]>([]);
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<LeagueTournament | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tourneys = await getLeagueTournaments();
        const active = tourneys.find(t => t.status === 'ongoing') || tourneys[0];
        if (active) {
          setTournament(active);
          const [stand, grps, teamList] = await Promise.all([
            getLeagueStandings(active.id),
            getLeagueGroups(active.id),
            getLeagueTeams(active.id)
          ]);
          setStandings(stand);
          setGroups(grps);
          setTeams(teamList);
        }
      } catch (err) {
        console.error('Failed to fetch mirror standings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Syncing League Standings...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="py-20 text-center">
        <Trophy className="text-slate-200 mx-auto mb-4" size={48} />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active league found.</p>
      </div>
    );
  }

  const enrichedStandings = standings.map(s => {
    const team = teams.find(t => t.id === s.team_id);
    return {
      ...s,
      team_name: team?.team_name || s.team_name,
      logo_url: team?.logo_url || s.logo_url
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[1.5rem] bg-white p-2 shadow-2xl flex items-center justify-center border-4 border-white/10">
              {tournament.logo_url ? (
                <img src={tournament.logo_url} className="w-full h-full object-contain" alt="" />
              ) : (
                <Trophy size={32} className="text-slate-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">Active League</span>
                <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Season {tournament.year}</span>
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">{tournament.name}</h2>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 flex gap-8">
            <div className="text-center">
              <p className="text-[9px] font-black text-white/40 uppercase mb-1">Teams</p>
              <p className="text-xl font-black">{standings.length}</p>
            </div>
            <div className="text-center border-x border-white/10 px-8">
              <p className="text-[9px] font-black text-white/40 uppercase mb-1">Status</p>
              <p className="text-xl font-black text-emerald-400 uppercase italic text-sm">{tournament.status}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black text-white/40 uppercase mb-1">Format</p>
              <p className="text-xl font-black">{tournament.format}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm">
        {groups.length > 0 ? (
          <div className="space-y-12">
            {groups.map(g => (
              <div key={g.id}>
                <div className="flex items-center gap-3 mb-6 px-4">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                    <TrendingUp size={16} className="text-blue-500" />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 italic uppercase">Group {g.name}</h4>
                  <div className="flex-1 border-b border-slate-100 h-px" />
                </div>
                <LeagueStandingTable 
                  entries={enrichedStandings.filter(s => s.group_id === g.id)} 
                  qCount={g.top_q_count || 2} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                  <LayoutGrid size={24} className="text-blue-600" />
                </div>
                <h4 className="text-2xl font-black text-slate-900 italic uppercase">League Table</h4>
              </div>
            </div>
            <LeagueStandingTable entries={enrichedStandings} qCount={4} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeagueStandingsMirror;
