import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Player, PlayerRole, UserRole, Match } from '../types';
import { Trophy, AlertTriangle, Lock, ArrowRight, ArrowLeft, Share2, Loader2, Calendar, MapPin, Sword, Shield, CircleDot, UserX, Clock } from 'lucide-react';
import html2canvas from 'html2canvas';
import styles from './MatchSelection.module.css';

interface MatchSelectionProps {
  players: Player[];
  userRole: UserRole;
  matches: Match[];
  teamLogo: string;
  onUpdateMatch: (match: Match) => void;
}

interface PlayerCardProps {
  player: Player;
  isSelected: boolean;
  onToggle: (id: string) => void;
  canEdit: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isSelected, onToggle, canEdit }) => (
  <button
    type="button"
    onClick={() => onToggle(player.id)}
    className={`
      w-full text-left relative p-3 rounded-xl border flex items-center gap-3 transition-all group
      ${!player.isAvailable && !isSelected
        ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed grayscale'
        : 'cursor-pointer hover:scale-[1.02]'}
      ${isSelected
        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
        : player.isAvailable ? 'bg-white border-slate-100 hover:border-blue-300 hover:bg-blue-50 text-slate-800 shadow-sm' : 'text-slate-400'}
      ${!canEdit ? 'pointer-events-none' : ''}
    `}
  >
    <div className="relative">
      <img
        src={player.avatarUrl}
        alt={player.name}
        className={`w-10 h-10 rounded-full object-cover ${!player.isAvailable ? 'grayscale opacity-80' : ''}`}
      />
      {player.isCaptain && <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white text-[10px] flex items-center justify-center font-bold text-slate-900">C</span>}
      {player.isViceCaptain && <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full border-2 border-white text-[10px] flex items-center justify-center font-bold text-white">V</span>}
      {!player.isAvailable && !isSelected && <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[10px] flex items-center justify-center text-white"><UserX size={10} /></span>}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-sm truncate">{player.name}</h4>
      <p className={`text-xs truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
        {player.role}
      </p>
    </div>
    {canEdit && player.isAvailable && (
      <div className={`p-1 rounded-full ${isSelected ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-blue-200'}`}>
        {isSelected ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
      </div>
    )}
  </button>
);

const MatchSelection: React.FC<MatchSelectionProps> = ({ players, userRole, matches, teamLogo, onUpdateMatch }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const location = useLocation();

  const nextMatchFallback = matches
    .filter(m => m.isUpcoming)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const nextMatch = (location.state as any)?.selectedMatch || nextMatchFallback;

  // Only admin can edit if locked. If unlocked, only admin can select (per user request for lock logic).
  const canEdit = userRole === 'admin' && nextMatch && !nextMatch.isSquadLocked;

  useEffect(() => {
    if (nextMatch && nextMatch.squad) {
      setSelectedIds(new Set(nextMatch.squad));
    } else {
      setSelectedIds(new Set());
    }
  }, [nextMatch]);

  useEffect(() => {
    setImgError(false);
  }, [teamLogo]);

  const toggleSelection = (id: string) => {
    if (!canEdit) return;

    const player = players.find(p => p.id === id);
    if (player && !player.isAvailable && !selectedIds.has(id)) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      if (newSelection.size < 11) {
        newSelection.add(id);
      }
    }
    setSelectedIds(newSelection);
  };

  const selectedPlayers = players.filter(p => selectedIds.has(p.id));
  const availablePlayers = players.filter(p => !selectedIds.has(p.id));

  const batsmen = selectedPlayers.filter(p => p.role === PlayerRole.BATSMAN).length;
  const bowlers = selectedPlayers.filter(p => p.role === PlayerRole.BOWLER).length;
  const allRounders = selectedPlayers.filter(p => p.role === PlayerRole.ALL_ROUNDER).length;
  const keepers = selectedPlayers.filter(p => p.role === PlayerRole.WICKET_KEEPER).length;

  useEffect(() => {
    if (containerRef.current) {
      const bars = containerRef.current.querySelectorAll('[data-width]');
      bars.forEach((bar) => {
        const width = (bar as HTMLElement).getAttribute('data-width');
        if (width) (bar as HTMLElement).style.width = width;
      });
    }
  }, [batsmen, bowlers, allRounders, keepers]);

  const handleGenerateImage = async () => {
    if (!cardRef.current || selectedIds.size === 0) return;
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `IndianStrikers_XI_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Image generation failed", err);
      alert("Could not generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getRoleIcon = (role: string, size = 14) => {
    switch (role) {
      case PlayerRole.BATSMAN: return <Sword size={size} />;
      case PlayerRole.BOWLER: return <CircleDot size={size} />;
      case PlayerRole.WICKET_KEEPER: return <Shield size={size} />;
      default: return <Trophy size={size} />;
    }
  };

  // Reusable Button Component for Sync
  const ActionButtons = () => {
    if (!nextMatch) return null;

    if (!nextMatch.isSquadLocked) {
      return userRole === 'admin' ? (
        <button
          disabled={selectedIds.size !== 11}
          onClick={() => {
            onUpdateMatch({
              ...nextMatch,
              squad: Array.from(selectedIds),
              isSquadLocked: true
            });
          }}
          className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border-2 shadow-sm
            ${selectedIds.size !== 11
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white text-black border-slate-900 hover:bg-slate-50 active:scale-95'
            }
          `}
        >
          {selectedIds.size !== 11 ? `Select ${11 - selectedIds.size} more` : <><Shield size={18} /> Lock Team Sheet</>}
        </button>
      ) : (
        <div className="w-full py-4 bg-slate-50 text-slate-400 font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-200 border-dashed">
          <Clock size={18} /> Team Selection in Progress...
        </div>
      );
    }

    return (
      <div className="space-y-3 w-full">
        <button
          onClick={handleGenerateImage}
          disabled={isGenerating}
          className="w-full py-4 bg-slate-950 text-white rounded-xl font-black flex items-center justify-center gap-2 shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98]"
        >
          {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
          Share Final Squad
        </button>

        {userRole === 'admin' && (
          <button
            onClick={() => {
              onUpdateMatch({
                ...nextMatch,
                isSquadLocked: false
              });
            }}
            className="w-full py-2 text-slate-500 hover:text-red-500 font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Lock size={14} /> Unlock Team Sheet
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Playing XI</h2>
          <p className="text-slate-500 text-sm">
            {nextMatch?.isSquadLocked ? 'Confirmed Team Sheet' : 'Drafting Playing XI'}
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3 md:gap-4 bg-white p-2 pr-6 rounded-xl shadow-sm border border-slate-100 w-full md:w-auto">
            <div className={`
                w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center font-bold text-lg md:text-xl shrink-0
                ${selectedIds.size === 11 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}
              `}>
              {selectedIds.size}
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold">Selected</p>
              <p className="text-sm font-medium text-slate-700">Target: 11</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Pool */}
        <div className="lg:col-span-4 flex flex-col bg-slate-100 rounded-2xl p-4 border border-slate-200 overflow-hidden h-[350px] lg:h-auto order-2 lg:order-1">
          <h3 className="font-bold text-slate-500 uppercase text-xs mb-3 flex justify-between shrink-0">
            Available Squad <span>{availablePlayers.length}</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {availablePlayers.map(player => (
              <PlayerCard key={player.id} player={player} isSelected={false} onToggle={toggleSelection} canEdit={canEdit} />
            ))}
          </div>
        </div>

        {/* Middle Column: Visualizer & Actions */}
        <div ref={containerRef} className="lg:col-span-4 flex flex-col space-y-6 order-3 lg:order-2">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
            <h3 className="text-center font-bold text-slate-800 mb-6 flex items-center justify-center gap-2">
              <Trophy size={18} className="text-yellow-500" /> Team Balance
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Batsmen', val: batsmen, max: 6, fill: styles.progressBarFillBatsmen },
                { label: 'Bowlers', val: bowlers, max: 4, fill: styles.progressBarFillBowlers },
                { label: 'All-Rounders', val: allRounders, max: 2, fill: styles.progressBarFillAllRounders },
                { label: 'Wicket Keeper', val: keepers, max: 1, fill: styles.progressBarFillKeeper },
              ].map(stat => (
                <div key={stat.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">{stat.label}</span>
                    <span className="text-slate-800">{stat.val}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={`${styles.progressBarFill} ${stat.fill}`} data-width={`${(stat.val / stat.max) * 100}%`}></div>
                  </div>
                </div>
              ))}
            </div>

            {selectedIds.size !== 11 && !nextMatch?.isSquadLocked && (
              <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">Select exactly 11 players to lock the team sheet.</p>
              </div>
            )}
          </div>

          <div className="hidden lg:block w-full">
            <ActionButtons />
          </div>
        </div>

        {/* Right Column: Playing XI List */}
        <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl p-4 border-2 border-blue-100 shadow-xl overflow-hidden h-[350px] lg:h-auto order-1 lg:order-3">
          <h3 className="font-bold text-blue-800 uppercase text-xs mb-3 flex justify-between shrink-0">
            Final XI <span>{selectedPlayers.length}/11</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {selectedPlayers.map(player => (
              <PlayerCard key={player.id} player={player} isSelected={true} onToggle={toggleSelection} canEdit={canEdit} />
            ))}
            {selectedPlayers.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 italic py-10">
                <Trophy size={48} className="mb-2" />
                <p className="text-sm">No players selected</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="lg:hidden col-span-full order-last pb-6">
          <ActionButtons />
        </div>
      </div>

      {/* Social Media Card */}
      <div className="absolute left-[-9999px] top-0">
        <div ref={cardRef} className="w-[800px] h-[800px] bg-slate-900 text-white relative overflow-hidden flex flex-col font-sans">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-black"></div>
          <div className="absolute inset-0 opacity-10 bg-dot-white-grid"></div>
          
          {/* Cricket Ground Background */}
          <div 
            className="absolute inset-0 opacity-10 blur-[2px] transition-opacity"
            style={{ 
              backgroundImage: 'url("/assets/cricket_ground_bg.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          ></div>
          
          <div className="relative z-10 p-6 flex justify-between items-center border-b border-white/10 bg-black/30 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/10 rounded-xl p-2 flex items-center justify-center backdrop-blur-md border border-white/20">
                {!imgError ? <img src={teamLogo} className="w-full h-full object-contain" onError={() => setImgError(true)} crossOrigin="anonymous" /> : <Shield className="w-16 h-16 text-blue-400" />}
              </div>
              <div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase">INDIAN STRIKERS</h2>
                <div className="flex items-center gap-6 mt-2 text-blue-200 font-medium">
                  {nextMatch ? (
                    <>
                      <span className="inline-flex items-center gap-2 underline decoration-blue-500/30 underline-offset-4">
                        <Sword size={18} className="text-blue-400 shrink-0" /> <span className="leading-none">vs {nextMatch.opponent}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 underline decoration-blue-500/30 underline-offset-4">
                        <Calendar size={18} className="text-blue-400 shrink-0" /> <span className="leading-none">{new Date(nextMatch.date).toLocaleDateString()}</span>
                      </span>
                    </>
                  ) : (
                    <span>Match TBD</span>
                  )}
                </div>
              </div>
            </div>
            {nextMatch && (
              <div className="text-right">
                <div className="bg-white/10 px-6 py-3 rounded-xl border border-white/10 inline-flex items-center justify-center gap-3 text-sm font-bold tracking-wide backdrop-blur-sm shadow-xl">
                  <MapPin size={18} className="text-orange-400 shrink-0" /> <span className="leading-none">{nextMatch.venue}</span>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-10 flex-1 px-8 py-4 overflow-hidden flex items-center justify-center">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 w-full">
              {selectedPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/10 shadow-sm backdrop-blur-sm">
                  <div className="relative">
                    <img src={p.avatarUrl} className="w-16 h-16 rounded-full border-2 border-white/30 object-cover shadow-lg" crossOrigin="anonymous" alt={p.name} />
                    <div className="absolute -bottom-1 -right-1 bg-slate-900 w-6 h-6 rounded-full border border-slate-600 text-slate-300 shadow-md flex items-center justify-center overflow-hidden">
                      {getRoleIcon(p.role, 12)}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-lg leading-none tracking-tight">{p.name}</h3>
                      {p.isCaptain && <span className="bg-yellow-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border border-yellow-400/50 flex self-center items-center h-[18px]">C</span>}
                      {p.isViceCaptain && <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border border-blue-400/50 flex self-center items-center h-[18px]">VC</span>}
                    </div>
                    <p className="text-xs text-slate-400 uppercase font-black tracking-widest">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 p-4 bg-black/60 text-center border-t border-white/10 flex justify-between items-center px-10 shrink-0">
            <p className="text-sm font-black tracking-[0.3em] text-blue-400/80 uppercase">www.indianstrikers.club</p>
            <div className="flex flex-col items-end">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Official Squad Release</p>
              <p className="text-[9px] text-slate-600">INS MManagement System v2.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchSelection;
