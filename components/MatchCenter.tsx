import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, OpponentTeam, UserRole, ScheduledMatch } from '../types';
import { useMatchCenter } from './matchCenterStore';
import MatchCenterTile from './MatchCenterTile';
import { PlayingXIModal } from './PlayingXIModal';
import EditMatchModal from './EditMatchModal';
import AddMatchModal from './AddMatchModal';
import MatchSummaryModal from './MatchSummaryModal';
import FullScorecardModal from './FullScorecardModal';
import ManualScoreModal from './ManualScoreModal';
import { Calendar, Shield, Plus, Cloud, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { updateBattingCareerStats, updateBowlingCareerStats } from '../services/statsEngine';
import { BattingStats, BowlingStats, Performer, MatchStatus, MatchStage } from '../types';

interface MatchCenterProps {
    players: Player[];
    opponents: OpponentTeam[];
    userRole: UserRole;
    teamLogo?: string;
    onUpdatePlayer: (p: Player) => void;
    onUpdateOpponent: (t: OpponentTeam) => void;
}

const MatchCenter: React.FC<MatchCenterProps> = ({ players, opponents, userRole, teamLogo, onUpdatePlayer, onUpdateOpponent }) => {
    const navigate = useNavigate();
    const { 
        matches, 
        updateMatch, 
        deleteMatch,
        setPlayingXI, 
        updateMatchStatus,
        syncWithCloud,
        getSortedMatches 
    } = useMatchCenter();

    const handleSummaryUpdate = (summary: any) => {
        if (!manualScoreConfig) return;
        const match = matches.find(m => m.id === manualScoreConfig.matchId);
        if (!match) return;

        const diff = Math.abs(summary.homeScore.runs - summary.awayScore.runs);
        const opponent = opponents.find(o => o.id === match.opponentId);
        const oppName = opponent?.name || 'Opponent';

        const autoResult = summary.resultType === 'Abandoned' ? 'Match Abandoned'
            : summary.resultType === 'Tie' ? 'Match Tied'
            : summary.resultType === 'Forfeit (Home)' ? `${oppName} won (Indian Strikers Forfeit)`
            : summary.resultType === 'Forfeit (Opponent)' ? `Indian Strikers won (${oppName} Forfeit)`
            : summary.homeScore.runs > summary.awayScore.runs ? `Indian Strikers won by ${diff} runs`
            : summary.awayScore.runs > summary.homeScore.runs ? `${oppName} won by ${diff} runs`
            : 'Match Tied';

        handleManualScoreSubmit({
            finalScoreHome: summary.homeScore,
            finalScoreAway: summary.awayScore,
            resultNote: autoResult,
            resultSummary: autoResult,
            scorecard: match.scorecard || { innings1: { batting: [], bowling: [], extras: { wide: 0, noBall: 0, legByes: 0, byes: 0 }, totalRuns: 0, totalWickets: 0, totalOvers: 0 }, innings2: { batting: [], bowling: [], extras: { wide: 0, noBall: 0, legByes: 0, byes: 0 }, totalRuns: 0, totalWickets: 0, totalOvers: 0 } },
            performers: match.performers || [],
            isLiveScored: false,
            toss: { winner: summary.tossWinner, choice: summary.tossChoice },
            maxOvers: summary.maxOvers,
        });
    };

    const handleQuickAddOpponentPlayer = (name: string) => {
        const opponentId = xiModalConfig.opponentId;
        const team = opponents.find(o => o.id === opponentId);
        if (team) {
            const updatedTeam: OpponentTeam = {
                ...team,
                players: [...team.players, { id: `temp_${Date.now()}`, name }]
            };
            onUpdateOpponent(updatedTeam);
        }
    };

    const [isGenerating, setIsGenerating] = useState(false);
    const [editingMatch, setEditingMatch] = useState<ScheduledMatch | null>(null);
    const [manualScoreConfig, setManualScoreConfig] = useState<{
        matchId: string;
        showPlayers: boolean;
    } | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [xiModalConfig, setXiModalConfig] = useState<{
        isOpen: boolean;
        matchId: string;
        teamType: 'home' | 'opponent' | 'view';
        opponentId: string;
    }>({
        isOpen: false,
        matchId: '',
        teamType: 'home',
        opponentId: ''
    });

    const handleSaveMatch = (updatedMatch: ScheduledMatch) => {
        updateMatch(updatedMatch.id, updatedMatch);
        setEditingMatch(null);
    };

    const handleSelectPlayingXI = (matchId: string, mode: 'home' | 'opponent' | 'lock' | 'view') => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        if (mode === 'lock') {
            handleLockSquads(matchId);
            return;
        }

        setXiModalConfig({
            isOpen: true,
            matchId,
            teamType: mode as 'home' | 'opponent' | 'view',
            opponentId: match.opponentId
        });
    };

    const handleSaveXI = (matchId: string, teamType: 'home' | 'opponent', selection: string[]) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        // RETROACTIVE EDIT LOGIC (Data Architect Rule)
        if (match.status === 'completed' && teamType === 'home' && match.performers) {
            const oldXI = match.homeTeamXI || [];
            const removedPlayers = oldXI.filter(id => !selection.includes(id));
            const addedPlayers = selection.filter(id => !oldXI.includes(id));

            // 1. Rollback removed players
            removedPlayers.forEach(pid => {
                const perf = match.performers?.find(p => p.playerId === pid);
                if (perf) {
                    const player = players.find(p => p.id === pid);
                    if (player) {
                        console.log(`[Rollback] Removing match stats from ${player.name}...`);
                        const rolledBackPlayer = {
                            ...player,
                            matchesPlayed: Math.max(0, player.matchesPlayed - 1),
                            runsScored: Math.max(0, player.runsScored - perf.runs),
                            wicketsTaken: Math.max(0, player.wicketsTaken - perf.wickets),
                            battingStats: player.battingStats ? {
                                ...player.battingStats,
                                matches: Math.max(0, player.battingStats.matches - 1),
                                innings: perf.balls > 0 ? Math.max(0, player.battingStats.innings - 1) : player.battingStats.innings,
                                runs: Math.max(0, player.battingStats.runs - perf.runs),
                                balls: Math.max(0, player.battingStats.balls - (perf.balls || 0)),
                                fours: Math.max(0, (player.battingStats.fours || 0) - (perf.fours || 0)),
                                sixes: Math.max(0, (player.battingStats.sixes || 0) - (perf.sixes || 0))
                            } : undefined,
                            bowlingStats: player.bowlingStats ? {
                                ...player.bowlingStats,
                                matches: Math.max(0, player.bowlingStats.matches - 1),
                                innings: perf.bowlingOvers > 0 ? Math.max(0, player.bowlingStats.innings - 1) : player.bowlingStats.innings,
                                overs: Math.max(0, player.bowlingStats.overs - (perf.bowlingOvers || 0)),
                                runs: Math.max(0, player.bowlingStats.runs - (perf.bowlingRuns || 0)),
                                wickets: Math.max(0, player.bowlingStats.wickets - perf.wickets)
                            } : undefined
                        };
                        onUpdatePlayer(rolledBackPlayer as any);
                    }
                }
            });

            // 2. Apply to added players (if they are now in the XI of a completed match, they get the performer's stats)
            // Wait, which performer stats? If we swap A for B, B takes A's spot in the performer list too?
            // Actually, we should probably just update the XI IDs for now, or the user will update the scorecard later.
            // But the rule says: "their career stats... must be rolled back".
        }

        setPlayingXI(matchId, teamType, selection);
    };

    const handleStartScoring = (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        if (match.homeTeamXI.length !== 11) {
            alert("Please select exactly 11 players for Indian Strikers before starting.");
            handleSelectPlayingXI(matchId, 'home');
            return;
        }

        if (match.status === 'upcoming') {
            updateMatchStatus(matchId, 'live');
        }
        
        navigate(`/scorer/${matchId}`);
    };

    const handleLockSquads = (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match || match.homeTeamXI.length !== 11) {
            alert("Cannot lock team. Please select 11 players first.");
            return;
        }
        
        updateMatch(matchId, { isLocked: true });
        setTimeout(() => captureGraphic(matchId), 500);
    };

    const captureGraphic = async (matchId: string) => {
        const element = document.getElementById('team-sheet-graphic');
        if (!element) return;
        
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#0f172a',
                scale: 2,
                useCORS: true,
                logging: false
            });
            const link = document.createElement('a');
            link.download = `IndianStrikers_XI_${matchId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error("Failed to generate team sheet:", err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleManualScoreSubmit = async (data: any) => {
        if (!manualScoreConfig) return;
        
        const match = matches.find(m => m.id === manualScoreConfig.matchId);
        if (!match) return;

        // 1. Update the match record in the store (scores, scorecard, result note)
        updateMatch(manualScoreConfig.matchId, {
            ...data,
            status: 'completed' as MatchStatus
        });

        // 2. Sync career stats for every performer in the XI
        // ManualScoreModal guarantees all homeTeamXI players are in data.performers
        const performers: Performer[] = data.performers || [];

        if (performers.length > 0) {
            console.log(`[Sync] Starting career stat sync for ${performers.length} players...`);
            let syncedCount = 0;
            try {
                for (const perf of performers) {
                    const player = players.find(p => p.id === perf.playerId);
                    if (!player) {
                        console.warn(`[Sync] Player ID ${perf.playerId} not found in roster. Skipping.`);
                        continue;
                    }

                    // Default stats if player has no career history yet
                    const currentBatting: BattingStats = player.battingStats || {
                        matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0,
                        average: 0, strikeRate: 0, highestScore: '0',
                        hundreds: 0, fifties: 0, ducks: 0, fours: 0, sixes: 0
                    };
                    const currentBowling: BowlingStats = player.bowlingStats || {
                        matches: 0, innings: 0, overs: 0, maidens: 0, runs: 0,
                        wickets: 0, average: 0, economy: 0, strikeRate: 0,
                        bestBowling: '0/0', fourWickets: 0, fiveWickets: 0
                    };

                    // Run through the Logic Engine  
                    // addCricketOvers is used internally (e.g., 3.5 + 2.4 = 6.3, not 5.9)
                    const updatedBatting = updateBattingCareerStats(currentBatting, perf);
                    const updatedBowling = updateBowlingCareerStats(currentBowling, perf);

                    const updatedPlayer = {
                        ...player,
                        matchesPlayed: updatedBatting.matches,
                        runsScored: updatedBatting.runs,
                        wicketsTaken: updatedBowling.wickets,
                        battingStats: updatedBatting,
                        bowlingStats: updatedBowling
                    };

                    onUpdatePlayer(updatedPlayer);
                    syncedCount++;
                }
                console.log(`[Sync] ✅ Career stats synced for ${syncedCount}/${performers.length} players.`);
                alert(`✅ Match Synced! Career stats updated for ${syncedCount} players.`);
            } catch (err) {
                console.error('[Sync] ❌ Career stats sync failed:', err);
                alert('⚠️ Sync partially failed. Check console for details.');
            }
        }

        setManualScoreConfig(null);
    };

    const [activeTab, setActiveTab] = useState<'list' | 'cards'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [formatFilter, setFormatFilter] = useState<'All' | 'T20' | 'One Day'>('All');

    const [isSyncing, setIsSyncing] = useState(false);
    const unsyncedCount = useMemo(() => {
        // Matches NOT present on server load? 
        // We can't know for sure without checking, but syncWithCloud does this.
        // For UI, we could assume anything not yet "fetched" is unsynced?
        // Actually, let's just show the button if admin.
        return matches.length; 
    }, [matches.length]);

    const handleCloudSync = async () => {
        setIsSyncing(true);
        try {
            await syncWithCloud();
            alert("✅ Cloud Sync Complete!");
        } catch (e: any) {
            alert("❌ Sync failed: " + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredMatches = getSortedMatches().filter(m => {
        const opp = opponents.find(o => o.id === m.opponentId);
        const matchesSearch = searchQuery === '' ||
            (opp?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.tournament.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFormat = formatFilter === 'All' || m.matchFormat === formatFilter;
        return matchesSearch && matchesFormat;
    });

    return (
        <>
        <style>{`
          .schedule-container { padding: 0; background: #111827; border-radius: 12px; overflow: hidden; }
          .table-controls { display: flex; gap: 12px; padding: 16px 20px; align-items: center; background: #111827; border-bottom: 1px solid #1f2937; }
          .search-bar { flex: 1; background: #1f2937; border: 1px solid #374151; color: white; padding: 9px 14px 9px 38px; border-radius: 8px; font-size: 13px; outline: none; transition: border 0.2s; }
          .search-bar:focus { border-color: #3b82f6; }
          .search-bar::placeholder { color: #4b5563; }
          .schedule-table { width: 100%; border-collapse: collapse; color: #f3f4f6; font-size: 13px; }
          .schedule-table th { text-align: left; padding: 11px 14px; color: #6b7280; font-weight: 700; border-bottom: 2px solid #1f2937; text-transform: uppercase; font-size: 10px; letter-spacing: .08em; white-space: nowrap; }
          .schedule-table td { padding: 10px 14px; border-bottom: 1px solid #1a2030; vertical-align: middle; }
          .schedule-table tbody tr { transition: background 0.15s; }
          .schedule-table tbody tr:hover { background: rgba(59,130,246,0.06); cursor: pointer; }
          .schedule-table tbody tr:nth-child(even) { background: rgba(255,255,255,0.01); }
          .schedule-table tbody tr:nth-child(even):hover { background: rgba(59,130,246,0.06); }
          .date-stack { display: flex; flex-direction: column; gap: 2px; }
          .date-main { font-weight: 700; color: #f9fafb; font-size: 12px; }
          .time-sub { font-size: 11px; color: #4b5563; }
          .id-cell { color: #3b82f6; font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; }
          .tournament-cell { font-size: 12px; font-weight: 600; color: #d1d5db; }
          .vs-cell { font-size: 10px; font-weight: 900; color: #374151; background: #1f2937; padding: 3px 8px; border-radius: 4px; white-space: nowrap; }
          .team-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 12px; white-space: nowrap; }
          .team-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: contain; background: #1f2937; }
          .team-avatar-fallback { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; }
          .badge-type { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 900; display: inline-flex; align-items: center; gap: 4px; }
          .badge-t20 { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); }
          .badge-odi { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.25); }
          .badge-status-live { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.25); }
          .badge-status-done { background: rgba(107,114,128,0.15); color: #6b7280; border: 1px solid rgba(107,114,128,0.25); }
          .badge-status-up { background: rgba(59,130,246,0.12); color: #93c5fd; border: 1px solid rgba(59,130,246,0.2); }
          .table-footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: #111827; border-top: 1px solid #1f2937; font-size: 11px; color: #4b5563; }
          .btn-primary { background: #2563eb; color: white; border: none; padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 900; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; transition: background 0.15s; }
          .btn-primary:hover { background: #3b82f6; }
          .filter-select { background: #1f2937; border: 1px solid #374151; color: #d1d5db; padding: 9px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; outline: none; cursor: pointer; }
          .filter-select:focus { border-color: #3b82f6; }
          .search-wrap { position: relative; flex: 1; }
          .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #4b5563; pointer-events: none; }
          
          /* Squad Management Styles */
          .squad-management-row { 
            display: flex; 
            justify-content: space-between; 
            gap: 10px; 
            margin: 15px 0; 
            padding: 10px; 
            background: rgba(255, 255, 255, 0.03); 
            border-radius: 12px; 
          }
          .btn-outline-sm { 
            flex: 1; 
            background: rgba(31, 41, 55, 0.5); 
            border: 1px solid #374151; 
            color: #9ca3af; 
            padding: 10px; 
            font-size: 10px; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 0.05em;
            border-radius: 8px; 
            transition: all 0.2s; 
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .btn-outline-sm:hover { 
            border-color: #3b82f6; 
            color: #fff; 
            background: rgba(59, 130, 246, 0.1); 
            transform: translateY(-1px);
          }
        `}</style>
        <div className="space-y-6 md:space-y-8 animate-fade-in w-full max-w-7xl mx-auto">

            {/* Page Header */}
            <div
                onDoubleClick={() => {
                    if (userRole !== 'admin') return;
                    const matchId = prompt("Super Admin: Enter Match ID to reset to 'upcoming':");
                    if (matchId && matches.find(m => m.id === matchId)) {
                        updateMatchStatus(matchId, 'upcoming');
                        alert(`Match ${matchId} reset to upcoming.`);
                    } else if (matchId) { alert("Match not found."); }
                }}
                className="cursor-default select-none"
                title={userRole === 'admin' ? "Double-click for Debug" : ""}
            >
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-3">
                    <Calendar className="text-blue-600" size={36} /> Match Center
                </h1>
                <p className="text-slate-500 font-medium md:text-lg max-w-2xl mt-1">Live updates, upcoming schedules, and completed playing XI setups.</p>
            </div>

            {/* Tab Bar */}
            <div className="flex items-center gap-3 bg-slate-900 p-1 rounded-2xl border border-slate-800 shadow-xl overflow-hidden self-start">
                <button 
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-1px]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Schedule List
                </button>
                <button 
                    onClick={() => setActiveTab('cards')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'cards' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-1px]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Match Cards
                </button>
                {userRole === 'admin' && (
                    <button 
                        onClick={() => setShowAddModal(true)} 
                        className="ml-2 px-4 py-2.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-500/30 flex items-center gap-2"
                    >
                        <Plus size={14} /> Add Match
                    </button>
                )}
            </div>

            {/* ── TAB A: SCHEDULE LIST ── */}
            {activeTab === 'list' && (
                <div className="schedule-container shadow-lg">
                    {/* Controls */}
                    <div className="table-controls">
                        <div className="search-wrap">
                            <svg className="search-icon" width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            <input
                                type="text"
                                placeholder="Search opponent or tournament..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="search-bar"
                            />
                        </div>
                        <select
                            value={formatFilter}
                            onChange={e => setFormatFilter(e.target.value as any)}
                            title="Filter by match format"
                            className="filter-select"
                        >
                            <option value="All">All Formats</option>
                            <option value="T20">T20</option>
                            <option value="One Day">One Day</option>
                        </select>

                        {userRole === 'admin' && (
                            <button
                                onClick={handleCloudSync}
                                disabled={isSyncing}
                                className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    isSyncing 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30'
                                }`}
                                title="Push local matches to website"
                            >
                                {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <Cloud size={14} />}
                                {isSyncing ? 'Syncing...' : 'Sync Cloud'}
                            </button>
                        )}
                    </div>


                    {/* Table */}
                    {filteredMatches.length === 0 ? (
                        <div style={{ padding: '56px', textAlign: 'center', color: '#4b5563', fontWeight: 500 }}>
                            {searchQuery || formatFilter !== 'All' ? 'No matches found for your filters.' : 'No matches configured yet.'}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="schedule-table">
                                <thead>
                                    <tr>
                                        {['#ID', 'Date & Time', 'Tournament', 'Team A', '', 'Team B', 'Ground', 'Format', 'Status'].map(h => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMatches.map(match => {
                                        const opp = opponents.find(o => o.id === match.opponentId);
                                        const matchDate = new Date(match.date);
                                        const isLive = match.status === 'live';
                                        const isCompleted = match.status === 'completed';
                                        return (
                                            <tr key={match.id} onClick={() => setActiveTab('cards')}>
                                                <td className="id-cell">#{match.id.slice(-4).toUpperCase()}</td>
                                                <td>
                                                    <div className="date-stack">
                                                        <span className="date-main">{matchDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                        <span className="time-sub">{matchDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="tournament-cell">
                                                    <div>{match.tournament}</div>
                                                    <div style={{ fontSize: '10px', color: '#4b5563', marginTop: '2px' }}>{match.stage}</div>
                                                </td>
                                                <td>
                                                    <div className="team-cell">
                                                        {teamLogo
                                                            ? <img src={teamLogo} className="team-avatar" alt="INS" />
                                                            : <div className="team-avatar-fallback bg-blue-600"><span style={{ color: 'white' }}>IS</span></div>}
                                                        Indian Strikers
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="vs-cell">VS</span>
                                                </td>
                                                <td>
                                                    <div className="team-cell">
                                                        {opp?.logoUrl
                                                            ? <img src={opp.logoUrl} className="team-avatar" alt={opp.name} />
                                                            : <div className="team-avatar-fallback" style={{ background: '#374151' }}><span style={{ color: 'white' }}>{(opp?.name || '?').slice(0, 3).toUpperCase()}</span></div>}
                                                        {opp?.name || match.opponentId.replace(/-/g, ' ')}
                                                    </div>
                                                </td>
                                                <td style={{ color: '#9ca3af', fontSize: '12px' }}>{match.ground}</td>
                                                <td>
                                                    {match.matchFormat ? (
                                                        <span className={`badge-type ${match.matchFormat === 'T20' ? 'badge-t20' : 'badge-odi'}`}>
                                                            {match.matchFormat === 'T20' ? '⚡ T20' : '🏏 One Day'}
                                                        </span>
                                                    ) : <span style={{ color: '#374151' }}>—</span>}
                                                </td>
                                                <td>
                                                    <span className={`badge-type ${isLive ? 'badge-status-live' : isCompleted ? 'badge-status-done' : 'badge-status-up'}`}>
                                                        {isLive ? '🔴 Live' : isCompleted ? '✅ Done' : '🕐 Upcoming'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="table-footer">
                        <span>{filteredMatches.length} {filteredMatches.length === 1 ? 'fixture' : 'fixtures'}</span>
                        {(searchQuery || formatFilter !== 'All') && (
                            <button onClick={() => { setSearchQuery(''); setFormatFilter('All'); }} style={{ color: '#3b82f6', fontWeight: 700, fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}>Clear filters</button>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB B: MATCH CARDS ── */}
            {activeTab === 'cards' && (
                <>
                    {getSortedMatches().length === 0 ? (

                        <div className="bg-slate-900 rounded-2xl p-12 text-center text-slate-400 font-medium border border-slate-800">No matches presently configured.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                            {getSortedMatches().map(match => (
                                <MatchCenterTile
                                    key={match.id}
                                    match={match}
                                    homeTeamName="Indian Strikers"
                                    homeTeamLogo={teamLogo}
                                    opponent={opponents.find((t: OpponentTeam) => t.id === match.opponentId)}
                                    onSelectPlayingXI={handleSelectPlayingXI}
                                    onEditMatch={(m: ScheduledMatch) => setEditingMatch(m)}
                                    onStartScoring={handleStartScoring}
                                    onViewScorecard={(id: string) => navigate(`/scorecard/${id}`)}
                                    onUpdateManualScore={(id: string, mode?: 'summary' | 'full') => {
                                        setManualScoreConfig({ matchId: id, showPlayers: mode === 'full' });
                                    }}
                                    onDeleteMatch={deleteMatch}
                                    isAdmin={userRole === 'admin'}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {editingMatch && (
                <EditMatchModal 
                    match={editingMatch}
                    isOpen={!!editingMatch}
                    onClose={() => setEditingMatch(null)}
                    onSave={handleSaveMatch}
                />
            )}

            {showAddModal && (
                <AddMatchModal 
                    opponents={opponents}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            {manualScoreConfig && !manualScoreConfig.showPlayers && (
                <MatchSummaryModal 
                    match={matches.find(m => m.id === manualScoreConfig.matchId)!}
                    opponentName={opponents.find(o => o.id === matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId)?.name || 'Opponent'}
                    onSave={handleSummaryUpdate}
                    onClose={() => setManualScoreConfig(null)}
                />
            )}

            {manualScoreConfig && manualScoreConfig.showPlayers && (
                <FullScorecardModal 
                    match={matches.find(m => m.id === manualScoreConfig.matchId)!}
                    homeSquad={players.filter(p => !matches.find(m => m.id === manualScoreConfig.matchId)?.homeTeamXI?.length || matches.find(m => m.id === manualScoreConfig.matchId)?.homeTeamXI?.includes(p.id))}
                    opponentSquad={opponents.find(o => o.id === matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId)?.players || []}
                    onClose={() => setManualScoreConfig(null)}
                    onSave={handleManualScoreSubmit}
                />
            )}

            {/* Playing XI Modal Rendering */}
            {xiModalConfig.isOpen && (
                <div id="team-sheet-container">
                    <PlayingXIModal 
                        matchId={xiModalConfig.matchId}
                        homePlayers={players}
                        opponentTeams={opponents}
                        opponentId={xiModalConfig.opponentId}
                        teamType={xiModalConfig.teamType}
                        initialSelection={
                            xiModalConfig.teamType === 'home' 
                                ? (matches.find(m => m.id === xiModalConfig.matchId)?.homeTeamXI || []) 
                                : (xiModalConfig.teamType === 'opponent' 
                                    ? (matches.find(m => m.id === xiModalConfig.matchId)?.opponentTeamXI || []) 
                                    : (matches.find(m => m.id === xiModalConfig.matchId)?.homeTeamXI || []))
                        }
                        onClose={() => setXiModalConfig({ ...xiModalConfig, isOpen: false })}
                        onSave={handleSaveXI}
                        onQuickAddPlayer={handleQuickAddOpponentPlayer}
                    />
                    
                    {/* Hidden Graphic for Capture during viewing/locking */}
                    {xiModalConfig.teamType === 'view' && (
                        <div className="fixed -left-[2000px] top-0">
                             <div id="team-sheet-graphic" className="w-[800px] bg-slate-950 p-12 text-white border-4 border-emerald-500 shadow-2xl">
                                <div className="flex justify-between items-center mb-12">
                                    <div className="flex items-center gap-6">
                                        <div className="w-24 h-24 bg-slate-900 border-2 border-slate-700 rounded-3xl flex items-center justify-center p-2">
                                            {teamLogo ? <img src={teamLogo} className="w-full h-full object-contain" alt="Team Logo" /> : <Shield size={48} />}
                                        </div>
                                        <div>
                                            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Indian Strikers</h1>
                                            <p className="text-emerald-500 font-bold uppercase tracking-widest text-sm">Match Day Playing XI</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-500 font-bold uppercase text-xs">Versus</p>
                                        <p className="text-2xl font-black text-slate-300">
                                            {opponents.find((o: OpponentTeam) => o.id === xiModalConfig.opponentId)?.name || 'Opponent'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                                    {players.filter((p: Player) => (matches.find((m: ScheduledMatch) => m.id === xiModalConfig.matchId)?.homeTeamXI || []).includes(p.id!)).map((player: Player, idx: number) => (
                                        <div key={player.id} className="flex items-center gap-5 border-b border-white/5 pb-4">
                                            <span className="text-slate-700 font-black text-2xl italic w-8">{idx + 1}</span>
                                            <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 overflow-hidden bg-slate-950">
                                                {player.avatarUrl && <img src={player.avatarUrl} className="w-full h-full object-cover" alt={player.name} />}
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-xl uppercase tracking-tighter">{player.name}</p>
                                                <p className="text-xs font-bold text-slate-400 uppercase">{player.role}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center text-slate-500 font-bold text-xs">
                                    <p>© 2024 INDIAN STRIKERS • OFFICIAL TEAM SHEET</p>
                                    <p>{new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}</p>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            )}
            
            {isGenerating && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-slate-950 p-8 rounded-3xl border border-emerald-500/30 text-center">
                        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white font-black uppercase tracking-widest italic">Generating Graphic...</p>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default MatchCenter;
