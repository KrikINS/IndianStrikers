
import React, { useState, useRef } from 'react';
import { Player, PlayerRole, BattingStyle, BowlingStyle, UserRole, BattingStats, BowlingStats } from '../types';
import { Plus, Trash2, Edit2, Shield, Sword, CircleDot, X, Upload, Activity, Medal, UserCheck, UserX, Lock, AlertTriangle, Search } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  userRole: UserRole;
  onAddPlayer: (player: Player) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (id: string) => void;
}

const defaultBattingStats: BattingStats = {
  matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, average: 0, strikeRate: 0, highestScore: '0', hundreds: 0, fifties: 0, ducks: 0, fours: 0, sixes: 0
};

const defaultBowlingStats: BowlingStats = {
  matches: 0, innings: 0, overs: 0, maidens: 0, runs: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestBowling: '0/0', fourWickets: 0, fiveWickets: 0
};

const PlayerList: React.FC<PlayerListProps> = ({ players, userRole, onAddPlayer, onUpdatePlayer, onDeletePlayer }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const [activeStatTab, setActiveStatTab] = useState<'batting' | 'bowling'>('batting');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEditTab, setActiveEditTab] = useState<'general' | 'batting' | 'bowling'>('general');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const canEdit = userRole === 'admin';

  const [formData, setFormData] = useState<Partial<Player>>({
    role: PlayerRole.BATSMAN,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.NONE,
    isCaptain: false,
    isViceCaptain: false,
    isAvailable: true,
    avatarUrl: '',
    battingStats: { ...defaultBattingStats },
    bowlingStats: { ...defaultBowlingStats }
  });

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingPlayer(null);
    setFormData({
      role: PlayerRole.BATSMAN,
      battingStyle: BattingStyle.RIGHT_HAND,
      bowlingStyle: BowlingStyle.NONE,
      isCaptain: false,
      isViceCaptain: false,
      isAvailable: true,
      matchesPlayed: 0,
      runsScored: 0,
      wicketsTaken: 0,
      average: 0,
      avatarUrl: `https://picsum.photos/200/200?random=${Date.now()}`,
      battingStats: { ...defaultBattingStats },
      bowlingStats: { ...defaultBowlingStats }
    });
    setActiveEditTab('general');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (player: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    setEditingPlayer(player);
    setFormData({ 
      ...player,
      battingStats: player.battingStats || { ...defaultBattingStats },
      bowlingStats: player.bowlingStats || { ...defaultBowlingStats }
    });
    setActiveEditTab('general');
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
       const checked = (e.target as HTMLInputElement).checked;
       setFormData(prev => ({
         ...prev,
         [name]: checked,
         // Mutex for Captain/VC
         ...(name === 'isCaptain' && checked ? { isViceCaptain: false } : {}),
         ...(name === 'isViceCaptain' && checked ? { isCaptain: false } : {})
       }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleStatChange = (type: 'batting' | 'bowling', field: keyof BattingStats | keyof BowlingStats, value: any) => {
    setFormData(prev => {
      const isBatting = type === 'batting';
      const stats = isBatting ? { ...prev.battingStats } : { ...prev.bowlingStats };
      
      // Update the modified field
      (stats as any)[field] = value;

      // Auto-calculate derived stats
      if (isBatting) {
        const s = stats as BattingStats;
        if (['runs', 'balls', 'innings', 'notOuts'].includes(field as string)) {
            const runs = Number(s.runs || 0);
            const balls = Number(s.balls || 0);
            const innings = Number(s.innings || 0);
            const notOuts = Number(s.notOuts || 0);
            
            s.strikeRate = balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(2)) : 0;
            const dismissals = innings - notOuts;
            s.average = dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : (runs > 0 ? runs : 0);
        }
      } else {
        const s = stats as BowlingStats;
        if (['runs', 'wickets', 'overs'].includes(field as string)) {
             const runs = Number(s.runs || 0);
             const wickets = Number(s.wickets || 0);
             const overs = Number(s.overs || 0);
             
             const wholeOvers = Math.floor(overs);
             const balls = Math.round((overs % 1) * 10);
             const totalBalls = (wholeOvers * 6) + balls;
             const trueOvers = totalBalls / 6;

             s.economy = trueOvers > 0 ? parseFloat((runs / trueOvers).toFixed(2)) : 0;
             if (wickets > 0) {
                 s.average = parseFloat((runs / wickets).toFixed(2));
                 s.strikeRate = parseFloat((totalBalls / wickets).toFixed(2));
             } else {
                 s.average = 0;
                 s.strikeRate = 0;
             }
        }
      }

      return {
        ...prev,
        [isBatting ? 'battingStats' : 'bowlingStats']: stats
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.role) {
      // Auto-update summary stats from detailed stats
      const batting = formData.battingStats || defaultBattingStats;
      const bowling = formData.bowlingStats || defaultBowlingStats;
      
      const summaryMatches = Math.max(Number(batting.matches), Number(bowling.matches));
      const summaryRuns = Number(batting.runs);
      const summaryWickets = Number(bowling.wickets);
      const summaryAvg = Number(batting.average);

      const playerData: Player = {
        id: editingPlayer ? editingPlayer.id : Date.now().toString(),
        name: formData.name,
        role: formData.role as PlayerRole,
        battingStyle: (formData.battingStyle as BattingStyle) || BattingStyle.RIGHT_HAND,
        bowlingStyle: (formData.bowlingStyle as BowlingStyle) || BowlingStyle.NONE,
        matchesPlayed: summaryMatches,
        runsScored: summaryRuns,
        wicketsTaken: summaryWickets,
        average: summaryAvg,
        isCaptain: !!formData.isCaptain,
        isViceCaptain: !!formData.isViceCaptain,
        isAvailable: formData.isAvailable !== undefined ? formData.isAvailable : true,
        avatarUrl: formData.avatarUrl || `https://picsum.photos/200/200?random=${Date.now()}`,
        battingStats: batting,
        bowlingStats: bowling
      };

      if (editingPlayer) {
        onUpdatePlayer(playerData);
      } else {
        onAddPlayer(playerData);
      }
      setIsModalOpen(false);
    }
  };

  const handleToggleAvailability = (player: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdatePlayer({ ...player, isAvailable: !player.isAvailable });
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (editingPlayer) {
      onDeletePlayer(editingPlayer.id);
      setShowDeleteConfirm(false);
      setIsModalOpen(false);
    }
  };

  const getRoleIcon = (role: PlayerRole) => {
    switch (role) {
      case PlayerRole.BATSMAN: return <Sword size={16} className="text-blue-500" />;
      case PlayerRole.BOWLER: return <CircleDot size={16} className="text-red-500" />;
      default: return <Shield size={16} className="text-green-500" />;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Squad Roster</h2>
          <p className="text-slate-500">
            {canEdit ? 'Manage players, stats, and availability' : 'View player profiles and stats'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {canEdit && (
            <button 
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 hover:scale-105 w-full md:w-auto justify-center"
            >
              <Plus size={20} />
              Recruit Player
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Search players by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 shadow-sm transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredPlayers.map((player) => (
          <div 
            key={player.id} 
            onClick={() => { setViewingPlayer(player); setActiveStatTab('batting'); }}
            className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            {/* Header / Background */}
            <div className={`h-20 md:h-24 bg-gradient-to-r ${player.isAvailable ? 'from-slate-800 to-slate-900' : 'from-slate-200 to-slate-300'}`}>
              <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                {player.isCaptain && (
                  <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider">CPT</span>
                )}
                {player.isViceCaptain && (
                  <span className="bg-blue-400 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider">VC</span>
                )}
              </div>
              
              {/* Quick Availability Toggle */}
              {canEdit && (
                <button 
                  onClick={(e) => handleToggleAvailability(player, e)}
                  className={`absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold shadow-md transition-all z-10
                    ${player.isAvailable 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-red-500 text-white hover:bg-red-600'}
                  `}
                  title="Toggle Availability"
                >
                  {player.isAvailable ? <UserCheck size={10} /> : <UserX size={10} />}
                  {player.isAvailable ? 'ACTIVE' : 'AWAY'}
                </button>
              )}
            </div>

            {/* Avatar */}
            <div className="absolute top-8 md:top-10 left-6">
              <div className="relative">
                <img 
                  src={player.avatarUrl} 
                  alt={player.name} 
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 border-white object-cover shadow-md ${!player.isAvailable ? 'grayscale opacity-80' : ''}`}
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white ${player.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} title={player.isAvailable ? 'Available' : 'Unavailable'}></div>
              </div>
            </div>

            <div className="pt-8 md:pt-10 p-4 md:p-6">
              <div className="flex justify-between items-start mb-1">
                <h3 className={`text-base md:text-lg font-bold ${player.isAvailable ? 'text-slate-800' : 'text-slate-500'}`}>{player.name}</h3>
                {canEdit && (
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleOpenEdit(player, e)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Profile"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                {getRoleIcon(player.role)}
                <span className="font-medium">{player.role}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <span className="text-slate-400 block uppercase text-[10px]">Runs</span>
                   <span className="font-bold text-slate-700 text-sm">{player.runsScored}</span>
                 </div>
                 <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                   <span className="text-slate-400 block uppercase text-[10px]">Wickets</span>
                   <span className="font-bold text-slate-700 text-sm">{player.wicketsTaken}</span>
                 </div>
              </div>
            </div>
          </div>
        ))}
        {filteredPlayers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
             No players found matching "{searchQuery}".
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && canEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col">
            <div className="bg-slate-900 p-4 md:p-6 flex justify-between items-center shrink-0">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                {editingPlayer ? <Edit2 size={20} className="text-blue-400" /> : <Plus size={20} className="text-blue-400" />}
                {editingPlayer ? 'Edit Player Profile' : 'New Signing'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button 
                  onClick={() => setActiveEditTab('general')}
                  className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeEditTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                  General Info
                </button>
                <button 
                  onClick={() => setActiveEditTab('batting')}
                  className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeEditTab === 'batting' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                  Batting Stats
                </button>
                <button 
                  onClick={() => setActiveEditTab('bowling')}
                  className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeEditTab === 'bowling' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                >
                  Bowling Stats
                </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 flex-1">
              
              {activeEditTab === 'general' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-slate-100">
                    <div 
                      className="relative w-24 h-24 rounded-full bg-slate-800 border-4 border-slate-700 shadow-inner flex items-center justify-center overflow-hidden cursor-pointer group shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <UserCheck size={32} className="text-slate-500" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload size={20} className="text-white" />
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange} 
                      />
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input 
                          required 
                          name="name" 
                          value={formData.name || ''} 
                          onChange={handleInputChange} 
                          className="w-full p-2 border-b-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-xl bg-transparent placeholder-slate-300 text-slate-800" 
                          placeholder="Player Name" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                      <select name="role" value={formData.role} onChange={handleInputChange} className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.values(PlayerRole).map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Batting Style</label>
                      <select name="battingStyle" value={formData.battingStyle} onChange={handleInputChange} className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.values(BattingStyle).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Bowling Style</label>
                      <select name="bowlingStyle" value={formData.bowlingStyle} onChange={handleInputChange} className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.values(BowlingStyle).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="isCaptain" checked={formData.isCaptain} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                        <span className="text-sm font-semibold text-slate-700">Team Captain</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="isViceCaptain" checked={formData.isViceCaptain} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                        <span className="text-sm font-semibold text-slate-700">Vice Captain</span>
                     </label>
                  </div>
                </div>
              )}

              {activeEditTab === 'batting' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                   {Object.keys(defaultBattingStats).map((key) => (
                     <div key={key}>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <input 
                           type={key === 'highestScore' ? 'text' : 'number'}
                           step={key === 'average' || key === 'strikeRate' ? '0.01' : '1'}
                           value={formData.battingStats ? (formData.battingStats as any)[key] : ''}
                           onChange={(e) => handleStatChange('batting', key as keyof BattingStats, e.target.value)}
                           className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                     </div>
                   ))}
                </div>
              )}

              {activeEditTab === 'bowling' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                   {Object.keys(defaultBowlingStats).map((key) => (
                     <div key={key}>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                        <input 
                           type={key === 'bestBowling' ? 'text' : 'number'}
                           step={key === 'average' || key === 'economy' || key === 'strikeRate' ? '0.01' : '1'}
                           value={formData.bowlingStats ? (formData.bowlingStats as any)[key] : ''}
                           onChange={(e) => handleStatChange('bowling', key as keyof BowlingStats, e.target.value)}
                           className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                        />
                     </div>
                   ))}
                </div>
              )}

              <div className="pt-6 flex justify-between gap-3 border-t border-slate-100 mt-auto">
                <div>
                   {editingPlayer && (
                    <button 
                      type="button"
                      onClick={handleDeleteClick}
                      className="px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl font-medium flex items-center gap-2"
                    >
                      <Trash2 size={18} /> <span className="hidden md:inline">Delete Player</span>
                    </button>
                   )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20">
                    {editingPlayer ? 'Save Changes' : 'Sign Player'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-red-100">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Delete Player?</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Are you sure you want to delete <span className="font-bold text-slate-800">{editingPlayer?.name}</span>? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {viewingPlayer && (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative max-h-[95vh] flex flex-col">
              <button 
                onClick={() => setViewingPlayer(null)} 
                className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white backdrop-blur-md transition-colors"
              >
                <X size={20} />
              </button>

              {/* Hero Section */}
              <div className="relative h-40 md:h-48 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 shrink-0">
                 <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                 <div className="absolute -bottom-12 md:-bottom-16 left-6 md:left-8">
                    <img 
                      src={viewingPlayer.avatarUrl} 
                      alt={viewingPlayer.name} 
                      className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-xl object-cover bg-slate-200"
                    />
                 </div>
                 <div className="absolute bottom-4 left-32 md:left-44 text-white pr-4">
                    <h2 className="text-2xl md:text-3xl font-black truncate">{viewingPlayer.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-blue-200 mt-1 text-xs md:text-sm">
                      <span className="font-medium">{viewingPlayer.role}</span>
                      <span className="w-1 h-1 bg-white/50 rounded-full hidden md:block"></span>
                      <span>{viewingPlayer.battingStyle}</span>
                    </div>
                 </div>
                 <div className="absolute top-4 md:top-6 right-12 md:right-16 flex flex-col md:flex-row gap-2">
                    {viewingPlayer.isCaptain && <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-lg text-center">CAPTAIN</div>}
                    {viewingPlayer.isViceCaptain && <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-lg text-center">VICE CAPTAIN</div>}
                 </div>
              </div>

              {/* Content */}
              <div className="pt-16 md:pt-20 p-4 md:p-8 flex-1 overflow-y-auto">
                 {/* Detailed Stats Section */}
                 <div className="mb-6 md:mb-8">
                     <div className="flex gap-2 md:gap-4 mb-4 overflow-x-auto pb-2">
                        <button 
                          onClick={() => setActiveStatTab('batting')}
                          className={`px-4 md:px-6 py-2 rounded-full font-bold text-xs md:text-sm transition-all border whitespace-nowrap ${activeStatTab === 'batting' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                          BATTING STATISTICS
                        </button>
                        <button 
                           onClick={() => setActiveStatTab('bowling')}
                           className={`px-4 md:px-6 py-2 rounded-full font-bold text-xs md:text-sm transition-all border whitespace-nowrap ${activeStatTab === 'bowling' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                           BOWLING STATISTICS
                        </button>
                     </div>

                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                           {activeStatTab === 'batting' ? (
                             <table className="w-full text-xs md:text-sm text-left">
                               <thead className="bg-[#00703c] text-white font-bold text-xs uppercase">
                                 <tr>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Mat</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Inns</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">NO</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Runs</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Balls</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Ave</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">SR</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">HS</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">100's</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">50's</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">0's</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">4's</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">6's</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 <tr className="border-b border-slate-100 hover:bg-slate-50 text-slate-700 font-medium">
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.matches || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.innings || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.notOuts || '-'}</td>
                                   <td className="p-2 md:p-3 font-bold">{viewingPlayer.battingStats?.runs || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.balls || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.average || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.strikeRate || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.highestScore || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.hundreds || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.fifties || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.ducks || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.fours || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.battingStats?.sixes || '-'}</td>
                                 </tr>
                               </tbody>
                             </table>
                           ) : (
                             <table className="w-full text-xs md:text-sm text-left">
                               <thead className="bg-[#00703c] text-white font-bold text-xs uppercase">
                                 <tr>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Mat</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Inns</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Overs</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Mdns</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Runs</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Wkts</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Ave</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">Econ</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">SR</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">BBI</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">4W</th>
                                   <th className="p-2 md:p-3 whitespace-nowrap">5W</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 <tr className="border-b border-slate-100 hover:bg-slate-50 text-slate-700 font-medium">
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.matches || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.innings || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.overs || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.maidens || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.runs || '-'}</td>
                                   <td className="p-2 md:p-3 font-bold">{viewingPlayer.bowlingStats?.wickets || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.average || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.economy || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.strikeRate || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.bestBowling || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.fourWickets || '-'}</td>
                                   <td className="p-2 md:p-3">{viewingPlayer.bowlingStats?.fiveWickets || '-'}</td>
                                 </tr>
                               </tbody>
                             </table>
                           )}
                        </div>
                     </div>
                 </div>

                 {/* Basic Info Block */}
                 <div className="bg-slate-50 rounded-2xl p-4 md:p-6 border border-slate-100">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                       <UserCheck className="text-blue-500" /> Additional Details
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-sm">
                        <div className="flex justify-between py-2 border-b border-slate-200">
                           <span className="text-slate-500">Batting Style</span>
                           <span className="font-bold text-slate-900">{viewingPlayer.battingStyle}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-200">
                           <span className="text-slate-500">Bowling Style</span>
                           <span className="font-bold text-slate-900">{viewingPlayer.bowlingStyle}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-200">
                           <span className="text-slate-500">Status</span>
                           <span className={`font-bold px-2 py-0.5 rounded-md ${viewingPlayer.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {viewingPlayer.isAvailable ? 'Available' : 'Unavailable'}
                           </span>
                        </div>
                     </div>
                 </div>
                 
                 {canEdit && (
                   <div className="mt-8 flex justify-end">
                     <button 
                       onClick={(e) => { handleOpenEdit(viewingPlayer, e); setViewingPlayer(null); }}
                       className="w-full md:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                     >
                       <Edit2 size={18} /> Edit Full Profile
                     </button>
                   </div>
                 )}
              </div>
           </div>
         </div>
      )}
    </div>
  );
};

export default PlayerList;
