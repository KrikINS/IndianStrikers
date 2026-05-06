import * as React from 'react';
import { useState } from 'react';
import { Tournament } from '../types';
import { Plus, Trash2, Edit2, Trophy, X, ChevronDown, ChevronUp, ExternalLink, Calendar as CalendarIcon, Shield, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreProvider';

interface TournamentsManagerProps {
  isAdmin?: boolean;
}

const TournamentsManager: React.FC<TournamentsManagerProps> = ({ isAdmin = false }) => {
  const store = useStore();
  
  if (!store) {
    return <div className="p-12 text-center text-white/20 uppercase font-black text-[10px] tracking-widest animate-pulse">Initializing Hub...</div>;
  }

  const { tournaments, addTournament: addTourneyStore, updateTournament: updateTourneyStore, removeTournament } = store.tournaments;
  const { matches } = store.matchCenter;
  const { opponents } = store.opponents;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Tournament | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Tournament>>({ 
    name: '', 
    year: new Date().getFullYear(), 
    status: 'upcoming' 
  });

  const toggleAccordion = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm({ name: '', year: new Date().getFullYear(), status: 'upcoming' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Tournament) => {
    setEditingItem(t);
    setForm(t);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this tournament?")) {
      removeTournament(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateTourneyStore({ ...editingItem, ...form } as Tournament);
    } else {
      addTourneyStore({ 
        name: form.name || '', 
        year: form.year || new Date().getFullYear(), 
        status: form.status as any || 'upcoming' 
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-white/10 shadow-inner">
            <Trophy size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-[13px] font-black text-white uppercase tracking-wider leading-none">Tournaments Hub</h2>
            <p className="text-[11px] text-white/40 mt-1 font-medium">Manage club league participation and yearly schedule.</p>
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={handleOpenAdd} 
            title="Create New Tournament"
            aria-label="Create New Tournament"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg text-[11px] flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all active:scale-95 uppercase tracking-widest"
          >
            <Plus size={14} /> NEW TOURNAMENT
          </button>
        )}
      </div>

      <div className="space-y-3">
        {tournaments.length === 0 ? (
          <div className="bg-white/5 rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <Trophy size={48} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No tournaments scheduled</p>
          </div>
        ) : (
          tournaments.map(t => {
            const tourneyMatches = (matches || []).filter(m => 
              String(m.tournamentId) === String(t.id) || 
              (m.tournament && t.name && m.tournament.trim().toLowerCase() === t.name.trim().toLowerCase() && !m.tournamentId)
            );
            const isExpanded = expandedId === t.id;

            return (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                {/* Accordion Header */}
                <div 
                  onClick={() => toggleAccordion(t.id)}
                  className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${t.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Trophy size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tournament</span>
                        <Link 
                          to={`/tournaments/${t.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-black text-slate-900 uppercase tracking-tight hover:text-blue-600 hover:underline flex items-center gap-1.5 group"
                        >
                          {t.name || (t as any).tournament_name || 'Unnamed Tournament'}
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Season {t.year}</span>
                        {isAdmin ? (
                          <select 
                            value={t.status}
                            title="Change Tournament Status"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateTourneyStore({ ...t, status: e.target.value as any });
                            }}
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border outline-none cursor-pointer
                              ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                                t.status === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                          >
                            <option value="upcoming" className="bg-slate-900 text-white">Upcoming</option>
                            <option value="active" className="bg-slate-900 text-white">Active</option>
                            <option value="completed" className="bg-slate-900 text-white">Completed</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border
                            ${t.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                              t.status === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {t.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matches</span>
                      <span className="text-sm font-black text-slate-900">{tourneyMatches.length}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 border-r border-slate-100 pr-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(t); }} 
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit Tournament"
                          aria-label="Edit Tournament"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} 
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Tournament"
                          aria-label="Delete Tournament"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30 p-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Shield size={12} className="text-blue-500" /> Linked Match Fixtures
                      </h4>
                      
                      {tourneyMatches.length === 0 ? (
                        <div className="py-8 text-center bg-white/50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matches linked to this tournament yet</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {tourneyMatches.map(match => {
                            const opp = opponents.find(o => o.id === match.opponentId);
                            const oppLogo = opp?.logoUrl || match.opponentLogo;
                            const oppName = opp?.name || match.opponentName || 'Opponent';

                            return (
                              <div key={match.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-blue-200 transition-colors shadow-sm">
                                <div className="flex items-center gap-4">
                                  <div className="hidden sm:flex flex-col items-center justify-center bg-slate-100 rounded-lg p-2 min-w-[60px] border border-slate-200 shadow-inner">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(match.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                    <span className="text-lg font-black text-slate-900 leading-none">{new Date(match.date).getDate()}</span>
                                  </div>
                                  
                                  {/* Team Info with Logos */}
                                  <div className="flex items-center gap-4">
                                    <div className="flex -space-x-2">
                                      {/* Home Logo */}
                                      <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-100 shadow-sm z-10">
                                        <img src="/INS%20LOGO.PNG" className="w-full h-full object-contain" alt="INS" crossOrigin="anonymous" />
                                      </div>
                                      {/* Away Logo */}
                                      <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-white shadow-sm flex items-center justify-center text-[10px] font-black">
                                        {oppLogo ? (
                                          <img src={oppLogo} className="w-full h-full object-contain" alt={oppName} crossOrigin="anonymous" />
                                        ) : (
                                          <span className="text-slate-400">{String(oppName).substring(0,2).toUpperCase()}</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Indian Strikers</span>
                                        <span className="text-[10px] font-black text-slate-300 italic">VS</span>
                                        <span className="text-xs font-black text-blue-600 uppercase tracking-tight">{oppName}</span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                          <CalendarIcon size={10} /> {new Date(match.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-slate-200">•</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{match.venue}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              
                              <div className="flex items-center gap-3 justify-end">
                                {match.status === 'completed' ? (
                                  <div className="text-right mr-4 hidden sm:block">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Final Result</p>
                                    <p className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{match.resultSummary || 'Match Completed'}</p>
                                  </div>
                                ) : (
                                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${match.status === 'live' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-50 text-blue-500'}`}>
                                    {match.status}
                                  </span>
                                )}
                                
                                <Link 
                                  to={`/scorecard/${match.id}`}
                                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white text-[10px] font-black rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-slate-200"
                                >
                                  Full Scorecard <ExternalLink size={12} />
                                </Link>
                              </div>
                            </div>
                          )})}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h3 className="text-[14px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                {editingItem ? <Edit2 size={16} className="text-amber-500" /> : <Plus size={16} className="text-amber-500" />}
                {editingItem ? 'Edit' : 'Add New'} Tournament
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-white/40 hover:text-white transition-colors"
                title="Close Modal"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Tournament Name</label>
                <input 
                  required 
                  value={form.name} 
                  placeholder="e.g. ICC T20 World Cup"
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-white/20" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Year</label>
                  <input 
                    type="number" 
                    required 
                    value={form.year} 
                    placeholder="2026"
                    onChange={e => setForm({...form, year: Number(e.target.value)})} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-white/20 font-mono" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 px-1">Status</label>
                  <select 
                    value={form.status} 
                    title="Select Tournament Status"
                    onChange={e => setForm({...form, status: e.target.value as any})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-[12px] outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="upcoming" className="bg-slate-900">Upcoming</option>
                    <option value="active" className="bg-slate-900">Active</option>
                    <option value="completed" className="bg-slate-900">Completed</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl shadow-xl shadow-amber-900/40 transition-all active:scale-[0.98] uppercase tracking-widest text-[12px]"
              >
                {editingItem ? 'SAVE TOURNAMENT' : 'CONFIRM TOURNAMENT'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentsManager;
