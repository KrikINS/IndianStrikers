
import React, { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Player, PlayerRole, BattingStyle, BowlingStyle, UserRole, BattingStats, BowlingStats, AppUser } from '../types';
import { Plus, Minus, Trash2, Edit2, Shield, Sword, CircleDot, X, Upload, Activity, Medal, UserCheck, UserX, Lock, AlertTriangle, Search, Users, UserMinus, LayoutGrid, LayoutList, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { getAppUsers, getPlayerDetailedStats, PlayerDetailedStats, TournamentStat } from '../services/storageService';
import { usePlayerStore } from '../store/playerStore';
import styles from './PlayerList.module.css';

interface PlayerListProps {
  userRole: UserRole;
  currentUser?: { id?: string; name: string; username: string; avatarUrl?: string; canScore?: boolean };
}

const defaultBattingStats: BattingStats = {
  matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, average: 0, strikeRate: 0, highestScore: '0', hundreds: 0, fifties: 0, ducks: 0, fours: 0, sixes: 0
};

const defaultBowlingStats: BowlingStats = {
  matches: 0, innings: 0, overs: 0, maidens: 0, runs: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestBowling: '0/0', fourWickets: 0, fiveWickets: 0,
  wides: 0, no_balls: 0
};

// Simple Password Modal Component
const PasswordConfirmModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // HARDCODED ADMIN PASSWORD FOR NOW or could pass from parent prop if available
    // Assuming 'admin123' or checking against current user password logic which is complex on frontend without real auth 
    // For now, let's assume a standard admin code or just existence
    if (password === 'admin123') {
      onConfirm();
    } else {
      setError('Incorrect Admin Password');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><Lock size={18} /> Admin Verification</h3>
        <p className="text-sm text-slate-500 mb-4">Please enter admin password to edit career stats.</p>
        <div className="space-y-3">
          <input
            type="password"
            autoFocus
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold"
            placeholder="Enter Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
          />
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200">Unlock</button>
          </div>
        </div>
      </form>
    </div>
  );
};

const PlayerList: React.FC<PlayerListProps> = ({ userRole, currentUser }) => {
  const { players, loading, addPlayer: onAddPlayer, updatePlayer: onUpdatePlayer, deletePlayer: onDeletePlayer } = usePlayerStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false); // New State
  const [pendingStatTab, setPendingStatTab] = useState<'batting' | 'bowling' | null>(null); // To resume after password
  const [isStatsUnlocked, setIsStatsUnlocked] = useState(false); // Session unlock state for current modal

  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null);
  const [rosterTab, setRosterTab] = useState<'active' | 'inactive'>('active');
  const [activeStatTab, setActiveStatTab] = useState<'batting' | 'bowling'>('batting');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEditTab, setActiveEditTab] = useState<'general' | 'batting' | 'bowling'>('general');
  const [detailedStats, setDetailedStats] = useState<PlayerDetailedStats | null>(null);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const [users, setUsers] = useState<AppUser[]>([]); // New State for user linking
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle deep-linking to player profile
  useEffect(() => {
    const playerId = searchParams.get('id');
    if (playerId && players.length > 0) {
      const player = players.find((p: Player) => p.id === playerId);
      if (player) {
        setViewingPlayer(player);
        setActiveStatTab('batting');
        // Clear param to avoid re-opening if user closes modal
        const newParams = new Set(searchParams);
        searchParams.delete('id');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, players, setSearchParams]);

  // Force re-fetch if we are stuck in mock data (length < 5)
  useEffect(() => {
    if (players.length > 0 && players.length < 5) {
      console.warn("[PlayerList] Detected mock/low player count. Forcing re-sync...");
      if (window.refreshAppData) {
        window.refreshAppData();
      }
    }
    // Cleanup offline cache if we have real data
    if (players.length > 2) {
      localStorage.removeItem('ins_offline_players');
    }
  }, [players.length]);

  // Fetch detailed stats when viewing a player
  useEffect(() => {
    if (viewingPlayer?.id) {
      const fetchDetailed = async () => {
        setIsStatsLoading(true);
        try {
          const stats = await getPlayerDetailedStats(viewingPlayer.id);
          setDetailedStats(stats);
        } catch (e) {
          console.error("Failed to fetch detailed stats", e);
          setDetailedStats(null);
        } finally {
          setIsStatsLoading(false);
        }
      };
      fetchDetailed();
      setIsStatsExpanded(false); // Reset expansion on new player
    } else {
      setDetailedStats(null);
    }
  }, [viewingPlayer]);

  const fetchUsers = async () => {
    if (userRole === 'admin') {
      try {
        const u = await getAppUsers();
        setUsers(u);
      } catch (e) { console.error("Failed to load users", e); }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = userRole === 'admin';
  const canManagePlayers = userRole === 'admin' || currentUser?.canScore;
  const canEditProfile = userRole === 'admin' || currentUser?.canScore;

  const [formData, setFormData] = useState<Partial<Player>>({
    role: PlayerRole.BATSMAN,
    battingStyle: BattingStyle.RIGHT_HAND,
    bowlingStyle: BowlingStyle.NONE,
    isCaptain: false,
    isViceCaptain: false,
    isAvailable: true,
    avatarUrl: '',
    dob: '',
    externalId: '',
    jerseyNumber: undefined,
    battingStats: { ...defaultBattingStats },
    bowlingStats: { ...defaultBowlingStats }
  });


  // Filter by search query first
  const searchingPlayers = (players || []).filter((p: Player) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Subscribe to the rosterTab for filtering (active vs inactive)
  const displayedPlayers = (searchingPlayers || []).filter((p: Player) => {
    // Determine active status accurately
    const isActuallyActive = p.isActive && p.status !== 'inactive';

    if (rosterTab === 'active') {
      return isActuallyActive;
    }
    // Inactive tab shows everyone else
    return !isActuallyActive;
  });

  // TEMP DEBUG: Log this to see if players exist but are filtered out
  console.log("[PlayerList] Total in Store:", players.length);
  console.log("[PlayerList] Filtered for UI:", displayedPlayers.length);
  console.log("[PlayerList] Current Tab:", rosterTab);

  const handleOpenAdd = () => {
    setEditingPlayer(null);
    setFormData({
      role: PlayerRole.BATSMAN,
      battingStyle: BattingStyle.RIGHT_HAND,
      bowlingStyle: BowlingStyle.NONE,
      isCaptain: false,
      isViceCaptain: false,
      isAvailable: true,
      isActive: true,
      matchesPlayed: 0,
      runsScored: 0,
      wicketsTaken: 0,
      average: 0,
      avatarUrl: `https://picsum.photos/200/200?random=${Date.now()}`,
      dob: '',
      externalId: '',
      jerseyNumber: undefined,
      battingStats: { ...defaultBattingStats },
      bowlingStats: { ...defaultBowlingStats },
      linkedUserId: ''
    });
    setActiveEditTab('general');
    setIsStatsUnlocked(false);
    setIsModalOpen(true);
    if (userRole === 'admin') fetchUsers(); // Fetch users immediately
  };

  const handleOpenEdit = (player: Player, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditProfile) return;
    setEditingPlayer(player);
    setFormData({
      ...player,
      battingStats: player.battingStats || { ...defaultBattingStats },
      bowlingStats: player.bowlingStats || { ...defaultBowlingStats },
      linkedUserId: player.linkedUserId || '' // Explicitly set ensure fallback
    });
    setActiveEditTab('general');
    setIsStatsUnlocked(false);
    setIsModalOpen(true);
    if (userRole === 'admin') fetchUsers(); // Fetch users immediately
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

          // Batting SR: (Runs / Balls) * 100
          s.strikeRate = balls > 0 ? parseFloat(((runs / balls) * 100).toFixed(2)) : 0;
          
          // Batting AVE: Runs / (Innings - Not Outs)
          const dismissals = innings - notOuts;
          s.average = dismissals > 0 ? parseFloat((runs / dismissals).toFixed(2)) : 0;
        }
      } else {
        const s = stats as BowlingStats;
        if (['runs', 'wickets', 'overs'].includes(field as string)) {
          const runs = Number(s.runs || 0);
          const wickets = Number(s.wickets || 0);
          const oversInput = Number(s.overs || 0);

          // Calculate "True Overs" for Economy (Total Balls / 6)
          const wholeOvers = Math.floor(oversInput);
          const ballsRemaining = Math.round((oversInput % 1) * 10);
          const totalBalls = (wholeOvers * 6) + ballsRemaining;
          const trueOvers = totalBalls / 6;

          // Bowling ECON: Runs / True Overs
          s.economy = trueOvers > 0 ? parseFloat((runs / trueOvers).toFixed(2)) : 0;
          
          if (wickets > 0) {
            // Bowling AVE: Runs / Wickets
            s.average = parseFloat((runs / wickets).toFixed(2));
            // Bowling SR: Total Balls / Wickets
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
        isActive: formData.isActive !== false,
        isAvailable: formData.isAvailable !== false,
        avatarUrl: formData.avatarUrl || `https://picsum.photos/200/200?random=${Date.now()}`,
        dob: formData.dob,
        externalId: formData.externalId,
        jerseyNumber: (formData.jerseyNumber !== undefined && (formData.jerseyNumber as any) !== '' && formData.jerseyNumber !== null) ? Number(formData.jerseyNumber) : undefined,
        battingStats: batting,
        bowlingStats: bowling,
        linkedUserId: formData.linkedUserId
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

  const [isExpanded, setIsExpanded] = useState(false);

  const getRoleIcon = (role: PlayerRole) => {
    switch (role) {
      case PlayerRole.BATSMAN: return <Sword size={16} className="text-blue-500" />;
      case PlayerRole.BOWLER: return <CircleDot size={16} className="text-red-500" />;
      default: return <Shield size={16} className="text-sky-500" />;
    }
  };

  const handleExportExcel = () => {
    if (players.length === 0) return;
    
    const headers = [
      'Player Name', 'Primary Role', 'Batting Style', 'Bowling Style', 'Jersey #', 'Matches Played', 
      'Batting Runs', 'Innings', 'Not Outs', 'Strike Rate', 'Average', 'Highest Score', '4s', '6s',
      'Runs Conceded', 'Bowling Innings', 'Wickets Taken', 'Economy', 'Bowling SR', 'Best Bowling', 'Maidens'
    ];


    const rows = (players || []).map((p: Player) => {
      const b = p.battingStats || defaultBattingStats;
      const w = p.bowlingStats || defaultBowlingStats;
      return [
        p.name, p.role, p.battingStyle, p.bowlingStyle, p.jerseyNumber || '-', p.matchesPlayed,
        b.runs, b.innings, b.notOuts, b.strikeRate, b.average, b.highestScore, b.fours, b.sixes,
        w.runs, w.innings, w.wickets, w.economy, w.strikeRate, w.bestBowling, w.maidens
      ];
    });

    // Create Excel-friendly HTML table string
    const tableMarkup = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Squad Stats</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>
        <table border="1">
          <tr style="background-color: #1e293b; color: #ffffff; font-weight: bold;">
            ${(headers || []).map(h => `<th>${h}</th>`).join('')}
          </tr>
          ${(rows || []).map(row => `
            <tr>
              ${row.map(val => `<td>${val}</td>`).join('')}
            </tr>
          `).join('')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableMarkup], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `INS_Squad_Statistics_${timestamp}.xls`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderPlayerCard = (player: Player) => (
    <div
      key={player.id}
      onClick={() => { setViewingPlayer(player); setActiveStatTab('batting'); }}
      className="group relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
    >
      {/* Header / Background */}
      <div className={`h-[60px] md:h-[72px] ${player.isAvailable ? 'bg-slate-900' : 'bg-slate-100'} relative overflow-hidden`}>
        {/* Jersey Number Watermark (Unified Style) */}
        {/* Jersey Number Watermark (Proportioned to Header) */}
        {(player.jerseyNumber !== undefined && player.jerseyNumber !== null) && (
          <div 
            className="absolute -top-1 right-2 text-5xl font-black select-none z-0 pointer-events-none text-sky-400/20 leading-none"
            style={{ 
              transform: 'rotate(-15deg) scale(1.6)', 
              fontFamily: '"Graduate", serif',
              transformOrigin: 'center right'
            }}
          >
            {player.jerseyNumber}
          </div>
        )}

        <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-10">

          {player.isCaptain && (
            <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider">CPT</span>
          )}
          {player.isViceCaptain && (
            <span className="bg-blue-400 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider">VC</span>
          )}
        </div>
      </div>

      {/* Avatar */}
      <div className="absolute top-5 left-6 z-10 transition-transform duration-300 group-hover:scale-110">
        <div className="relative">
          <img
            src={player.avatarUrl}
            alt={player.name}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl border-4 border-white object-cover shadow-md ${!player.isAvailable ? 'grayscale opacity-80' : ''}`}
          />
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-white ${player.isAvailable ? 'bg-blue-500' : 'bg-red-500'}`} title={player.isAvailable ? 'Available' : 'Unavailable'}></div>
        </div>
      </div>

      <div className="pt-8 md:pt-10 px-4 md:px-6 pb-2 md:pb-3">
        <div className="flex justify-between items-center mb-1">
          <h3 className={`text-base md:text-lg font-bold truncate pr-1 ${player.isAvailable ? 'text-slate-800' : 'text-slate-500'}`}>{player.name}</h3>
          
          <div className="flex items-center gap-2">
            {/* Quick Availability Toggle */}
            {canManagePlayers && (
              <button
                onClick={(e) => handleToggleAvailability(player, e)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm transition-all whitespace-nowrap
                  ${player.isAvailable
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'}
                `}
                title="Toggle Availability"
              >
                {player.isAvailable ? <UserCheck size={10} /> : <UserX size={10} />}
                {player.isAvailable ? 'ACTIVE' : 'AWAY'}
              </button>
            )}

            {canEdit && canEditProfile && (
              <button
                onClick={(e) => handleOpenEdit(player, e)}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Profile"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
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
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full">
      {/* Standardized Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600" size={28} /> Squad Roster
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">
            {canEdit ? 'Manage players, stats, and availability' : 'View player profiles and stats'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {userRole === 'admin' && (
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-white text-blue-700 border border-blue-100 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm hover:bg-blue-50 flex items-center gap-2"
            >
              <Activity size={16} className="text-blue-500" /> Export Excel
            </button>
          )}
          
          {canManagePlayers && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <Plus size={16} /> Recruit Player
            </button>
          )}
        </div>
      </div>

      {/* Standardized Glassmorphism Controls Section */}
      <div className="bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row gap-4 items-center">
        {/* Roster Tabs */}
        <div className="flex bg-slate-800/50 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setRosterTab('active')}
            className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${rosterTab === 'active' ? 'bg-blue-600 text-white shadow-lg' : 'text-white hover:bg-blue-600/30 hover:text-white'}`}
          >
             <Users size={14} /> Active Squad
          </button>
          <button
            onClick={() => setRosterTab('inactive')}
            className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${rosterTab === 'inactive' ? 'bg-red-600 text-white shadow-lg' : 'text-white hover:bg-red-600/30 hover:text-white'}`}
          >
             <UserMinus size={14} /> Inactive
          </button>
        </div>

        {/* Search Bar - Integrated into the glass bar */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search roster by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-800/30 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200 text-xs font-medium placeholder:text-slate-600 transition-all"
          />
        </div>
      </div>

      <div className="space-y-10">
        {rosterTab === 'active' ? (
          /* Active Players Section */
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
              Current Squad
              <span className="text-slate-400 text-sm font-normal bg-slate-100 px-2 py-0.5 rounded-full">{displayedPlayers.length}</span>
            </h3>
            {loading ? (
              <div className="p-24 text-center">
                <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 font-bold animate-pulse">Recruiting Squad Data...</p>
              </div>
            ) : displayedPlayers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {displayedPlayers?.map(renderPlayerCard)}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold italic">
                No active players found matching your criteria.
              </div>
            )}
          </section>
        ) : (
          /* Inactive Players Section */
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
              Inactive / Retired Players
              <span className="text-slate-400 text-sm font-normal bg-slate-100 px-2 py-0.5 rounded-full">{displayedPlayers.length}</span>
            </h3>
            {displayedPlayers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {displayedPlayers?.map(renderPlayerCard)}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold italic">
                No inactive players found.
              </div>
            )}
          </section>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && canEditProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl max-h-[95vh] flex flex-col">
            <div className="bg-slate-900 p-4 md:p-6 flex justify-between items-center shrink-0">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                {editingPlayer ? <Edit2 size={20} className="text-blue-400" /> : <Plus size={20} className="text-blue-400" />}
                {editingPlayer ? 'Edit Player Profile' : 'New Signing'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors" title="Close"><X size={24} /></button>
            </div>

            <div className="flex border-b border-slate-200 overflow-x-auto">
              <button
                onClick={() => setActiveEditTab('general')}
                className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeEditTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
              >
                General Info
              </button>
              <button
                onClick={() => {
                  // If stats unlocked or creating new player or just viewing? 
                  // Requirement: "locked and only admin can edit... re confirm password"
                  if (isStatsUnlocked || !editingPlayer) {
                    setActiveEditTab('batting');
                  } else {
                    setPendingStatTab('batting');
                    setShowPasswordModal(true);
                  }
                }}
                className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeEditTab === 'batting' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:bg-slate-50'} ${!isStatsUnlocked && editingPlayer ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-center gap-2">
                  Batting Stats
                  {!isStatsUnlocked && editingPlayer && <Lock size={12} />}
                </div>
              </button>
              <button
                onClick={() => {
                  if (isStatsUnlocked || !editingPlayer) {
                    setActiveEditTab('bowling');
                  } else {
                    setPendingStatTab('bowling');
                    setShowPasswordModal(true);
                  }
                }}
                className={`flex-1 py-3 px-4 whitespace-nowrap text-sm font-bold border-b-2 transition-colors ${activeEditTab === 'bowling' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:bg-slate-50'} ${!isStatsUnlocked && editingPlayer ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-center gap-2">
                  Bowling Stats
                  {!isStatsUnlocked && editingPlayer && <Lock size={12} />}
                </div>
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
                        title="Upload Avatar"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              title="Active Status"
                              name="isActive"
                              id="isActive"
                              checked={formData.isActive !== false}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Active Squad Member</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              title="Match Availability"
                              name="isAvailable"
                              id="isAvailable"
                              checked={formData.isAvailable || false}
                              onChange={handleInputChange}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isAvailable" className="text-sm font-bold text-slate-700">Available for Matches</label>
                          </div>
                        </div>
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
                      <label htmlFor="field-role" className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                      <select id="field-role" name="role" title="Role" value={formData.role} onChange={handleInputChange} className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.values(PlayerRole).map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-battingStyle" className="block text-sm font-medium text-slate-700 mb-1">Batting Style</label>
                      <select id="field-battingStyle" name="battingStyle" title="Batting Style" value={formData.battingStyle} onChange={handleInputChange} className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.values(BattingStyle).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="field-bowlingStyle" className="block text-sm font-medium text-slate-700 mb-1">Bowling Style</label>
                      <select id="field-bowlingStyle" name="bowlingStyle" title="Bowling Style" value={formData.bowlingStyle} onChange={handleInputChange} className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.values(BowlingStyle).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* New Fields: ID, DOB, Jersey */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="dob"
                        title="Date of Birth"
                        value={formData.dob || ''}
                        onChange={handleInputChange}
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Player ID / External ID</label>
                      <input
                        type="text"
                        name="externalId"
                        value={formData.externalId || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. INS-001"
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Jersey Number</label>
                      <input
                        type="number"
                        name="jerseyNumber"
                        value={formData.jerseyNumber || ''}
                        onChange={handleInputChange}
                        placeholder="e.g. 18"
                        className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isCaptain" checked={formData.isCaptain} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      <span className="text-sm font-semibold text-slate-700">Captain</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name="isViceCaptain" checked={formData.isViceCaptain} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      <span className="text-sm font-semibold text-slate-700">Vice Capt</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer border-l border-slate-200 pl-6">
                      <input type="checkbox" name="isActive" checked={formData.isActive !== false} onChange={handleInputChange} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-700">Active Squad member</span>
                    </label>
                  </div>

                  {/* Linked User Account - ADMIN ONLY */}
                  {userRole === 'admin' && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                          <UserCheck size={16} /> Link App Account (Optional)
                        </label>
                        <button
                          type="button"
                          onClick={fetchUsers}
                          title="Refresh User List"
                          className="text-blue-600 hover:text-blue-800 text-xs font-bold underline"
                        >
                          Refresh List {users.length > 0 && `(${users.length})`}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        Linking a user account will automatically sync their profile picture.
                      </p>
                      <select
                        name="linkedUserId"
                        title="Select Linked User"
                        value={formData.linkedUserId || ''}
                        onChange={(e) => {
                          const uid = e.target.value;
                          const user = users.find(u => u.id === uid);
                          setFormData(prev => ({
                            ...prev,
                            linkedUserId: uid,
                            avatarUrl: user?.avatarUrl || prev.avatarUrl // Auto update avatar
                          }));
                        }}
                        className="w-full p-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- No Linked Account --</option>
                        {(users || []).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.username}) - {u.role}
                          </option>
                        ))}
                      </select>
                    </div>

                  )}
                </div>
              )}

              {activeEditTab === 'batting' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                  {Object.keys(defaultBattingStats).map((key) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                      <input
                        type={key === 'highestScore' ? 'text' : 'number'}
                        title={key.replace(/([A-Z])/g, ' $1').trim()}
                        placeholder={key.replace(/([A-Z])/g, ' $1').trim()}
                        step={key === 'average' || key === 'strikeRate' ? '0.01' : '1'}
                        value={formData.battingStats ? (formData.battingStats as any)[key] : ''}
                        onChange={(e) => handleStatChange('batting', key as keyof BattingStats, e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                        title={key.replace(/([A-Z])/g, ' $1').trim()}
                        placeholder={key.replace(/([A-Z])/g, ' $1').trim()}
                        step={key === 'average' || key === 'economy' || key === 'strikeRate' ? '0.01' : '1'}
                        value={formData.bowlingStats ? (formData.bowlingStats as any)[key] : ''}
                        onChange={(e) => handleStatChange('bowling', key as keyof BowlingStats, e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                      title="Delete Player"
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

      {/* Password Modal */}
      <PasswordConfirmModal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); setPendingStatTab(null); }}
        onConfirm={() => {
          setIsStatsUnlocked(true);
          setShowPasswordModal(false);
          if (pendingStatTab) setActiveEditTab(pendingStatTab);
          setPendingStatTab(null);
        }}
      />

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
              title="Close"
            >
              <X size={20} />
            </button>

            {/* Hero Section */}
            <div className="relative h-44 md:h-52 bg-slate-900 shrink-0 border-b border-white/5">
              <div className="absolute inset-0 opacity-20 bg-dot-white-grid"></div>
              {/* Jersey Number Watermark (Unified Style) */}
              {(viewingPlayer.jerseyNumber !== undefined && viewingPlayer.jerseyNumber !== null) && (
                <div 
                  className="absolute top-0 right-4 text-[6rem] md:text-[9rem] font-black select-none z-0 pointer-events-none text-blue-400/20 leading-none"
                  style={{ 
                    transform: 'rotate(-15deg) scale(1.2)', 
                    fontFamily: '"Graduate", serif',
                    transformOrigin: 'top right'
                  }}
                >
                  {viewingPlayer.jerseyNumber}
                </div>
              )}
              {/* Profile Picture Box */}
              <div className="absolute top-8 left-6 md:left-8 z-10 w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-white shadow-2xl overflow-hidden bg-slate-200">
                <img
                  src={viewingPlayer.avatarUrl}
                  alt={viewingPlayer.name}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
              <div className="absolute top-14 md:top-16 left-36 md:left-48 text-white pr-4">
                <h2 className="text-2xl md:text-3xl font-black truncate">{viewingPlayer.name}</h2>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 text-blue-200 mt-1 text-xs md:text-sm">
                  <span className="font-medium">{viewingPlayer.role}</span>
                  <span className="w-1 h-1 bg-white/50 rounded-full hidden md:block"></span>
                  <span>{viewingPlayer.battingStyle}</span>
                </div>
              </div>
              <div className="absolute top-4 md:top-6 right-12 md:right-16 flex flex-col md:flex-row gap-2">
                {viewingPlayer.isCaptain && <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-lg text-center">CAPTAIN</div>}
                {viewingPlayer.isViceCaptain && <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-lg text-center">VICE CAPTAIN</div>}
              </div>
            </div>

            {/* Content */}
            <div className="pt-16 md:pt-20 p-4 md:p-8 flex-1 overflow-y-auto">
              {/* General Info Grid */}
              <div className="flex flex-col md:flex-row gap-4 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center min-w-[100px] text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jersey No.</div>
                    <div className="text-3xl font-black text-slate-800 italic leading-none">{viewingPlayer.jerseyNumber || '-'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center min-w-[160px]">
                    <div className="flex items-center justify-between text-xs mb-1.5 pb-1.5 border-b border-slate-50">
                      <span className="text-slate-400 font-bold uppercase">Bat:</span>
                      <span className="font-black text-slate-800">{viewingPlayer.battingStyle || 'RHB'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold uppercase">Bowl:</span>
                      <span className="font-black text-slate-800">{viewingPlayer.bowlingStyle || 'None'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="text-blue-500" size={12} /> Recent Form
                    </h3>
                    <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Last 5 Innings</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {(detailedStats as any)?.recentForm?.length > 0 ? (
                      (detailedStats as any)?.recentForm?.map((match: any, i: number) => (
                        <div 
                          key={i} 
                          className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-black text-xs shadow-sm transition-transform hover:scale-110 cursor-help ${
                            match.runs >= 50 ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-200' : 
                            match.runs >= 30 ? 'bg-sky-500 text-white' : 
                            match.runs === 0 && !match.isNotOut ? 'bg-slate-800 text-white ring-2 ring-red-400' :
                            'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}
                          title={match.isNotOut ? `${match.runs}* (Not Out)` : `${match.runs} Runs`}
                        >
                          {match.runs}{match.isNotOut ? '*' : ''}
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">No recent matches played</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Stats Section */}
              <div className="mb-6 md:mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2">
                    <button
                      onClick={() => setActiveStatTab('batting')}
                      className={`px-4 md:px-6 py-2 rounded-full font-bold text-xs md:text-sm transition-all border whitespace-nowrap ${activeStatTab === 'batting' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                      BATTING STATISTICS
                    </button>
                    <button
                      onClick={() => setActiveStatTab('bowling')}
                      className={`px-4 md:px-6 py-2 rounded-full font-bold text-xs md:text-sm transition-all border whitespace-nowrap ${activeStatTab === 'bowling' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                      BOWLING STATISTICS
                    </button>
                  </div>
                  
                  <div className={`shrink-0 px-4 py-1.5 rounded-lg border font-black text-[10px] tracking-wider transition-all shadow-sm ${viewingPlayer.isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {viewingPlayer.isAvailable ? 'MATCH READY' : 'UNAVAILABLE'}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    {activeStatTab === 'batting' ? (
                      <div className="relative">
                        <table className="w-full text-[11px] md:text-xs text-left">
                          <thead className="text-white font-bold uppercase sticky top-0 z-20 shadow-sm">
                            <tr className="bg-[#1e3a8a]">
                              <th className="p-2 md:p-3 whitespace-nowrap sticky left-0 bg-[#1e3a8a] z-30 min-w-[140px]">Tournament</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Mat</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Inn</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a] hidden md:table-cell">NO</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-blue-800/80">Runs</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a] hidden md:table-cell">Balls</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Ave</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">SR</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">HS</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a] hidden lg:table-cell">100s</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a] hidden lg:table-cell">50s</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a] hidden lg:table-cell">0s</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a] hidden lg:table-cell">4s</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a] hidden lg:table-cell">6s</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Detailed Rows with dynamic expansion */}
                            {isExpanded ? (
                              <>
                                {detailedStats?.legacy && (
                                  <tr className="bg-slate-50/80 text-[10px] md:text-xs text-black border-b border-slate-100 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <td className="p-2 md:p-3 font-bold text-slate-600 italic sticky left-0 bg-slate-50/80 z-10 transition-colors group-hover:bg-slate-100" style={{ fontSize: '9px' }}>Legacy Baseline</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats.legacy.matches}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats.legacy.innings}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats.legacy.not_outs}</td>
                                    <td className="p-2 md:p-3 text-center font-bold text-black">{detailedStats.legacy.runs}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats.legacy.balls}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.average}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.strikeRate}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.highest_score}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.hundreds}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.fifties}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.ducks}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.fours}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.sixes}</td>
                                  </tr>
                                )}

                                {detailedStats?.tournaments.map((t, idx) => (
                                  <tr key={t.tournamentId || idx} className="bg-white text-[10px] md:text-xs text-black border-b border-slate-100 group hover:bg-slate-50 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <td className="p-2 md:p-3 font-bold text-sky-600 sticky left-0 bg-white group-hover:bg-slate-50 z-10 transition-colors" style={{ fontSize: '9px', lineHeight: '1.2' }}>
                                      {t.tournamentId && t.tournamentId !== '00000000-0000-0000-0000-000000000000' ? (
                                        <Link to={`/tournaments/${t.tournamentId}?player=${viewingPlayer.id}`} className="hover:underline flex items-center gap-1">
                                          {t.tournamentName} <ExternalLink size={8} />
                                        </Link>
                                      ) : t.tournamentName}
                                    </td>
                                    <td className="p-2 md:p-3 text-center">{t.batting.matches}</td>
                                    <td className="p-2 md:p-3 text-center">{t.batting.innings}</td>
                                    <td className="p-2 md:p-3 text-center hidden md:table-cell">{t.batting.notOuts}</td>
                                    <td className="p-2 md:p-3 text-center font-bold text-black whitespace-nowrap">{t.batting.runs}</td>
                                    <td className="p-2 md:p-3 text-center hidden md:table-cell">{t.batting.balls || '-'}</td>
                                    <td className="p-2 md:p-3 text-center">{t.batting.average}</td>
                                    <td className="p-2 md:p-3 text-center">{t.batting.strikeRate}</td>
                                    <td className="p-2 md:p-3 text-center">{t.batting.highestScore}</td>
                                    <td className="p-2 md:p-3 text-center hidden lg:table-cell">{t.batting.hundreds}</td>
                                    <td className="p-2 md:p-3 text-center hidden lg:table-cell">{t.batting.fifties}</td>
                                    <td className="p-2 md:p-3 text-center hidden lg:table-cell">{t.batting.ducks || '0'}</td>
                                    <td className="p-2 md:p-3 text-center hidden lg:table-cell">{t.batting.fours || '0'}</td>
                                    <td className="p-2 md:p-3 text-center hidden lg:table-cell">{t.batting.sixes || '0'}</td>
                                  </tr>
                                ))}
                              </>
                            ) : null}

                            {!isExpanded && !detailedStats?.tournaments.length && !detailedStats?.legacy && (
                              <tr><td colSpan={14} className="p-8 text-center text-slate-400 italic font-medium">No tournament records found for this player.</td></tr>
                            )}
                          </tbody>
                          <tfoot className="sticky bottom-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
                            <tr className="bg-slate-900 text-white font-black uppercase text-[10px] md:text-xs">
                              <td className="p-2 md:p-3 sticky left-0 bg-slate-900 z-30 flex items-center justify-between gap-2 min-h-[44px]">
                                <span>Career Total</span>
                                <button 
                                  onClick={() => setIsExpanded(!isExpanded)}
                                  className="p-1 hover:bg-slate-800 rounded transition-colors"
                                  title={isExpanded ? 'Minimize' : 'Expand'}
                                >
                                  {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                                </button>
                              </td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.batting.matches || '0'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.batting.innings || '0'}</td>
                              <td className="p-2 md:p-3 text-center hidden md:table-cell">{detailedStats?.total?.batting.notOuts || '0'}</td>
                              <td className="p-2 md:p-3 text-center font-black text-sky-400 bg-slate-800">{detailedStats?.total?.batting.runs || '0'}</td>
                              <td className="p-2 md:p-3 text-center hidden md:table-cell">{detailedStats?.total?.batting.balls || '0'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.batting.average || '0.00'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.batting.strikeRate || '0.00'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.batting.highestScore || '0'}</td>
                              <td className="p-2 md:p-3 text-center hidden lg:table-cell">{detailedStats?.total?.batting.hundreds || '0'}</td>
                              <td className="p-2 md:p-3 text-center hidden lg:table-cell">{detailedStats?.total?.batting.fifties || '0'}</td>
                              <td className="p-2 md:p-3 text-center hidden lg:table-cell">{detailedStats?.total?.batting.ducks || '0'}</td>
                              <td className="p-2 md:p-3 text-center hidden lg:table-cell">{detailedStats?.total?.batting.fours || '0'}</td>
                              <td className="p-2 md:p-3 text-center hidden lg:table-cell">{detailedStats?.total?.batting.sixes || '0'}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="relative">
                        <table className="w-full text-[11px] md:text-xs text-left">
                          <thead className="text-white font-bold uppercase sticky top-0 z-20 shadow-sm">
                            <tr className="bg-[#1e3a8a]">
                              <th className="p-2 md:p-3 whitespace-nowrap sticky left-0 bg-[#1e3a8a] z-30 min-w-[140px]">Tournament</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Mat</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Inn</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Overs</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Maid</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Runs</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-blue-800/80">Wkts</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Best</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Ave</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">Econ</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">SR</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">4W</th>
                              <th className="p-2 md:p-3 text-center whitespace-nowrap bg-[#1e3a8a]">5W</th>
                            </tr>
                          </thead>
                           <tbody>
                            {/* Detailed Rows with dynamic expansion */}
                            {isExpanded ? (
                              <>
                                {detailedStats?.legacy && (
                                  <tr className="bg-slate-50/80 text-[10px] md:text-xs text-black border-b border-slate-100 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <td className="p-2 md:p-3 font-bold text-slate-600 italic sticky left-0 bg-slate-50/80 z-10" style={{ fontSize: '9px' }}>Legacy Baseline</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats.legacy.matches}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats.legacy.bowling_innings || detailedStats.legacy.innings}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats.legacy.overs_bowled}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats.legacy.maidens}</td>
                                    <td className="p-2 md:p-3 text-center font-bold text-black">{detailedStats.legacy.runs_conceded}</td>
                                    <td className="p-2 md:p-3 text-center font-bold text-slate-600">{detailedStats.legacy.wickets}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.bowling_average || '-'}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.economy || '-'}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.bowling_strikeRate || '-'}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.best_bowling}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.four_wickets}</td>
                                    <td className="p-2 md:p-3 text-center">{detailedStats?.legacy?.five_wickets}</td>
                                  </tr>
                                )}

                                {detailedStats?.tournaments.map((t, idx) => (
                                  <tr key={t.tournamentId || idx} className="bg-white text-[10px] md:text-xs text-black border-b border-slate-100 group hover:bg-slate-50 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <td className="p-2 md:p-3 font-bold text-sky-600 sticky left-0 bg-white group-hover:bg-slate-50 z-10" style={{ fontSize: '9px', lineHeight: '1.2' }}>
                                      {t.tournamentId && t.tournamentId !== '00000000-0000-0000-0000-000000000000' ? (
                                        <Link to={`/tournaments/${t.tournamentId}?player=${viewingPlayer.id}`} className="hover:underline flex items-center gap-1">
                                          {t.tournamentName} <ExternalLink size={8} />
                                        </Link>
                                      ) : t.tournamentName}
                                    </td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.matches}</td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.innings}</td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.overs}</td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.maidens || '0'}</td>
                                    <td className="p-2 md:p-3 text-center font-bold text-black">{t.bowling.runs || '0'}</td>
                                    <td className="p-2 md:p-3 text-center font-bold text-slate-700 whitespace-nowrap">{t.bowling.wickets}</td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.bestBowling}</td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.average}</td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.economy}</td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.strikeRate || '-'}</td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.fourWickets || '0'}</td>
                                    <td className="p-2 md:p-3 text-center">{t.bowling.fiveWickets || '0'}</td>
                                  </tr>
                                ))}
                              </>
                            ) : null}
                          </tbody>
                          <tfoot className="sticky bottom-0 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
                            <tr className="bg-slate-900 text-white font-black uppercase text-[10px] md:text-xs">
                              <td className="p-2 md:p-3 sticky left-0 bg-slate-900 z-30 flex items-center justify-between gap-2 min-h-[44px]">
                                <span>Career Total</span>
                                <button 
                                  onClick={() => setIsExpanded(!isExpanded)}
                                  className="p-1 hover:bg-slate-800 rounded transition-colors"
                                  title={isExpanded ? 'Minimize' : 'Expand'}
                                >
                                  {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                                </button>
                              </td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.matches || '0'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.innings || '0'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.overs || '0.0'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.maidens || '0'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.runs || '0'}</td>
                              <td className="p-2 md:p-3 text-center font-black text-sky-400 bg-slate-800">{detailedStats?.total?.bowling.wickets || '0'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.average || '0.00'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.economy || '0.00'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.strikeRate || '0.00'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.bestBowling || '-'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.fourWickets || '0'}</td>
                              <td className="p-2 md:p-3 text-center">{detailedStats?.total?.bowling.fiveWickets || '0'}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
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
