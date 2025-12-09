
import React, { useState, useRef, useEffect } from 'react';
import { Player, PlayerRole, UserRole, Match } from '../types';
import { Trophy, AlertTriangle, Lock, ArrowRight, ArrowLeft, Share2, Loader2, Calendar, MapPin, Sword, Shield, CircleDot, UserX } from 'lucide-react';
import html2canvas from 'html2canvas';

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
  <div
    onClick={() => onToggle(player.id)}
    className={`
      relative p-3 rounded-xl border flex items-center gap-3 transition-all group
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
  </div>
);

const MatchSelection: React.FC<MatchSelectionProps> = ({ players, userRole, matches, teamLogo, onUpdateMatch }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Find next match
  const nextMatch = matches
    .filter(m => m.isUpcoming)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const canEdit = userRole === 'admin' && nextMatch && (!nextMatch.isSquadLocked || userRole === 'admin');
  // Admin can always edit? "can only be changed by the admin once locked" -> implies admin CAN change it.
  // Actually, standard logic: If locked, ONLY admin can edit. If not locked, maybe others could? 
  // But usually this page is Admin only?
  // User says "can only be changed by the admin once locked".
  // Let's assume if locked: readonly for everyone EXCEPT admin.
  // But currently `canEdit = userRole === 'admin'`. So only admin can edit ANYWAY.
  // Unless "Match Selection" is available to others? 
  // Route is /selection. 

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

    // Check if player is available
    const player = players.find(p => p.id === id);
    if (player && !player.isAvailable && !selectedIds.has(id)) {
      // Do not allow selection if unavailable
      return;
    }

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

  // Stats
  const batsmen = selectedPlayers.filter(p => p.role === PlayerRole.BATSMAN).length;
  const bowlers = selectedPlayers.filter(p => p.role === PlayerRole.BOWLER).length;
  const allRounders = selectedPlayers.filter(p => p.role === PlayerRole.ALL_ROUNDER).length;
  const keepers = selectedPlayers.filter(p => p.role === PlayerRole.WICKET_KEEPER).length;

  const handleGenerateImage = async () => {
    if (!cardRef.current || selectedIds.size === 0) return;
    setIsGenerating(true);
    try {
      // Wait a tick to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2, // High resolution
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case PlayerRole.BATSMAN: return <Sword size={14} />;
      case PlayerRole.BOWLER: return <CircleDot size={14} />;
      case PlayerRole.WICKET_KEEPER: return <Shield size={14} />;
      default: return <Trophy size={14} />;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 relative h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Match Selection</h2>
          <p className="text-slate-500 text-sm">
            {canEdit ? 'Click to select playing XI' : 'Confirmed Team Sheet'}
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Stats Badge */}
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
        {/* Left Column: Available Pool */}
        <div className="lg:col-span-4 flex flex-col bg-slate-100 rounded-2xl p-4 border border-slate-200 overflow-hidden h-[300px] lg:h-auto order-2 lg:order-1">
          <h3 className="font-bold text-slate-500 uppercase text-xs mb-3 flex justify-between shrink-0">
            Available Squad <span>{availablePlayers.length}</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {availablePlayers.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                isSelected={false}
                onToggle={toggleSelection}
                canEdit={canEdit}
              />
            ))}
            {availablePlayers.length === 0 && (
              <p className="text-center text-slate-400 text-sm mt-10">All players selected.</p>
            )}
          </div>
        </div>

        {/* Middle Column: Visualizer (Desktop) or Spacer */}
        <div className="lg:col-span-4 hidden lg:flex flex-col justify-center items-center space-y-6 order-2">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full border border-slate-100">
            <h3 className="text-center font-bold text-slate-800 mb-6 flex items-center justify-center gap-2">
              <Trophy size={18} className="text-yellow-500" /> Balance
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Batsmen</span>
                  <span className="text-slate-800">{batsmen}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(batsmen / 6) * 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Bowlers</span>
                  <span className="text-slate-800">{bowlers}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(bowlers / 4) * 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">All-Rounders</span>
                  <span className="text-slate-800">{allRounders}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${(allRounders / 2) * 100}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-500">Wicket Keeper</span>
                  <span className="text-slate-800">{keepers}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${(keepers / 1) * 100}%` }}></div>
                </div>
              </div>
            </div>

            {selectedIds.size !== 11 && (
              <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium">
                  Select exactly 11 players.
                </p>
              </div>
            )}
          </div>

          {canEdit ? (
            <button
              disabled={selectedIds.size !== 11 && !nextMatch?.isSquadLocked}
              onClick={() => {
                if (!nextMatch) return;
                const isLocked = !!nextMatch.isSquadLocked;
                console.log("Button Clicked. Current Locked:", isLocked, "Next Match ID:", nextMatch.id);
                onUpdateMatch({
                  ...nextMatch,
                  squad: Array.from(selectedIds),
                  isSquadLocked: !isLocked
                });
              }}
              className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2
                    ${nextMatch?.isSquadLocked
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : selectedIds.size !== 11
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/30 hover:shadow-xl hover:scale-105'
                }
                  `}
            >
              {nextMatch?.isSquadLocked ? <><Lock size={16} /> Unlock Team Sheet</> : (selectedIds.size !== 11 ? `Select ${11 - selectedIds.size} more` : <><Shield size={16} /> Lock & Confirm Squad</>)}
            </button>
          ) : (
            <button
              disabled={true}
              className="w-full py-4 rounded-xl font-bold bg-slate-200 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock size={16} /> Team Locked
            </button>
          )}

          <button
            onClick={handleGenerateImage}
            disabled={!nextMatch?.isSquadLocked || isGenerating}
            className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-xl
                  ${!nextMatch?.isSquadLocked
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-900 text-white hover:bg-black'
              }
                `}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
            Share Squad (Locked Only)
          </button>
        </div>

        {/* Right Column: Playing XI */}
        <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl p-4 border-2 border-blue-100 shadow-xl overflow-hidden h-[300px] lg:h-auto order-1 lg:order-3">
          <h3 className="font-bold text-blue-800 uppercase text-xs mb-3 flex justify-between shrink-0">
            Playing XI <span>{selectedPlayers.length}/11</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {selectedPlayers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                <Trophy size={48} className="mb-2" />
                <p className="text-sm">Select players from squad</p>
              </div>
            ) : (
              selectedPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isSelected={true}
                  onToggle={toggleSelection}
                  canEdit={canEdit}
                />
              ))
            )}
          </div>
        </div>

        {/* Mobile Stats Panel (Shown only on small screens) */}
        <div className="lg:hidden col-span-full space-y-3 order-3">
          {canEdit ? (
            <button
              disabled={selectedIds.size !== 11 && !nextMatch?.isSquadLocked}
              onClick={() => {
                if (!nextMatch) return;
                const isLocked = !!nextMatch.isSquadLocked;
                onUpdateMatch({
                  ...nextMatch,
                  squad: Array.from(selectedIds),
                  isSquadLocked: !isLocked
                });
              }}
              className={`w-full py-3 rounded-xl font-bold transition-all
                  ${nextMatch?.isSquadLocked
                  ? 'bg-amber-500 text-white'
                  : selectedIds.size !== 11
                    ? 'bg-slate-300 text-slate-500 disabled:opacity-100'
                    : 'bg-blue-600 text-white'
                }
                `}
            >
              {nextMatch?.isSquadLocked ? 'Unlock Team Sheet' : (selectedIds.size !== 11 ? `Select ${11 - selectedIds.size} more` : 'Lock & Confirm Squad')}
            </button>
          ) : (
            <button
              disabled={true}
              className="w-full py-3 rounded-xl font-bold transition-all bg-slate-200 text-slate-500 cursor-not-allowed"
            >
              Team Locked
            </button>
          )}

          <button
            onClick={handleGenerateImage}
            disabled={!nextMatch?.isSquadLocked || isGenerating}
            className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                  ${!nextMatch?.isSquadLocked
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-900 text-white hover:bg-black'
              }
                `}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
            Share Squad (Locked Only)
          </button>
        </div>
      </div>

      {/* Hidden Social Media Card - Positioned off-screen but rendered for Capture */}
      <div className="absolute left-[-9999px] top-0">
        <div ref={cardRef} className="w-[800px] h-[800px] bg-slate-900 text-white relative overflow-hidden flex flex-col font-sans">
          {/* Dynamic Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-black z-0"></div>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>

          {/* Header: Match Info */}
          <div className="relative z-10 p-8 flex justify-between items-start border-b border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/10 rounded-xl p-2 flex items-center justify-center backdrop-blur-md border border-white/20">
                {teamLogo && !imgError ? (
                  <img
                    src={teamLogo}
                    alt="Logo"
                    className="w-full h-full object-contain drop-shadow-lg"
                    onError={() => setImgError(true)}
                    crossOrigin={teamLogo.startsWith('data:') ? undefined : "anonymous"}
                  />
                ) : (
                  <Shield className="w-16 h-16 text-blue-400" />
                )}
              </div>
              <div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">
                  INDIAN STRIKERS
                </h2>
                <div className="flex items-center gap-4 mt-2 text-blue-200 font-medium">
                  {nextMatch ? (
                    <>
                      <span className="flex items-center gap-1.5"><Sword size={18} /> vs {nextMatch.opponent}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={18} /> {new Date(nextMatch.date).toLocaleDateString()}</span>
                    </>
                  ) : (
                    <span>Next Match TBD</span>
                  )}
                </div>
              </div>
            </div>
            {nextMatch && (
              <div className="text-right">
                <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/10 inline-flex items-center gap-2 text-sm font-bold tracking-wide">
                  <MapPin size={16} className="text-orange-400" /> {nextMatch.venue}
                </div>
              </div>
            )}
          </div>

          {/* Main Content: Player Grid */}
          <div className="relative z-10 flex-1 p-8">
            <div className="grid grid-cols-2 gap-4 h-full content-center">
              {selectedPlayers.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 shadow-sm">
                  <div className="relative">
                    <img
                      src={p.avatarUrl}
                      className="w-14 h-14 rounded-full border-2 border-white/30 object-cover"
                      crossOrigin="anonymous"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-slate-800 text-[10px] p-1 rounded-full border border-slate-600 text-slate-300">
                      {getRoleIcon(p.role)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg leading-none">{p.name}</h3>
                      {p.isCaptain && <span className="bg-yellow-500 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded">C</span>}
                      {p.isViceCaptain && <span className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded">VC</span>}
                    </div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mt-0.5">{p.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 p-4 bg-black/40 text-center border-t border-white/10 flex justify-between items-center px-8">
            <p className="text-sm font-bold tracking-[0.2em] text-slate-400 uppercase">#IndianStrikers</p>
            <p className="text-xs text-slate-500">Generated by IS Management App</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchSelection;
