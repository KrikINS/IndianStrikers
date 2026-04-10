import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Player, OpponentTeam, UserRole, ScheduledMatch } from '../types';
import { useMatchCenter } from './matchCenterStore';
import MatchCenterTile from './MatchCenterTile';
import ScorecardViewModal from './ScorecardViewModal';
import { PlayingXIModal } from './PlayingXIModal';
import EditMatchModal from './EditMatchModal';
import AddMatchModal from './AddMatchModal';
import MatchSummaryModal from './MatchSummaryModal';
import FullScorecardModal from './FullScorecardModal';
import ManualScoreModal from './ManualScoreModal';
import { Calendar, Shield, Plus, Cloud, RefreshCw, Loader2, AlertCircle, List, Layout as LayoutIcon, TableProperties, Check, CheckCircle2, ChevronLeft, ChevronRight, Activity, Award, Trophy, MapPin, Hash } from 'lucide-react';
import html2canvas from 'html2canvas';
import { updateBattingCareerStats, updateBowlingCareerStats } from '../services/statsEngine';
import { useMasterData } from './masterDataStore';
import { BattingStats, BowlingStats, Performer, MatchStatus, MatchStage } from '../types';
import { useCricketScorer } from './matchStore';
import PointsTable from './PointsTable';

// Constants for Carousel
const CARD_WIDTH = 340;
const GAP = 24;
const VISIBLE_COUNT = 3; // Number of items cloned for infinite feel

interface MatchCenterProps {
    players: Player[];
    opponents: OpponentTeam[];
    userRole: UserRole;
    teamLogo?: string;
    onUpdatePlayer: (p: Player) => void;
    onUpdateOpponent: (t: OpponentTeam) => void;
    onRefresh?: () => Promise<void>;
}

const MatchCenter: React.FC<MatchCenterProps> = ({ players, opponents, userRole, teamLogo, onUpdatePlayer, onUpdateOpponent, onRefresh }) => {
    const navigate = useNavigate();
    const {
        matches,
        updateMatch,
        deleteMatch,
        setPlayingXI,
        updateMatchStatus,
        finalizeMatch,
        syncWithCloud,
        getSortedMatches,
        purgeTestData,
        createSandboxMatch
    } = useMatchCenter();
    const { grounds, tournaments, syncMasterData } = useMasterData();

    // Filters and Search
    const [activeTab, setActiveTab] = useState<'list' | 'cards'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [formatFilter, setFormatFilter] = useState<'All' | 'T20' | 'One Day'>('All');
    const [tournamentFilter, setTournamentFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');

    // Available years from matches
    const availableYears = useMemo(() => {
        const years = matches.map(m => new Date(m.date).getFullYear());
        return Array.from(new Set(years)).sort((a, b) => b - a); // Newest first
    }, [matches]);

    // Auto-sync on mount
    React.useEffect(() => {
        syncWithCloud().catch(err => console.error("Auto-sync error:", err));
        syncMasterData().catch(err => console.error("Master data sync error:", err));
    }, [syncWithCloud, syncMasterData]);

    // Default tournament selection to active one
    React.useEffect(() => {
        if (tournamentFilter === 'All' && tournaments.length > 0) {
            const active = tournaments.find(t => t.status === 'active');
            if (active) setTournamentFilter(active.name);
        }
    }, [tournaments, tournamentFilter]);

    const handleManualScoreSubmit = async (data: any, options: { skipCareerSync?: boolean } = {}) => {
        if (!manualScoreConfig) return;

        const match = matches.find(m => m.id === manualScoreConfig.matchId);
        if (!match) return;

        try {
            console.log(`[Sync] Finalizing match ${match.id} on cloud...`);
            const finalData = { ...data, isCareerSynced: true };

            // Pass the performers array if they exist (Full Scorecard) or empty array (Summary Update)
            const performersToSync = options.skipCareerSync ? [] : (data.performers || []);
            await finalizeMatch(match.id, finalData, performersToSync);

            if (onRefresh) {
                console.log('[Sync] Triggering global UI refresh...');
                await onRefresh();
            }

            console.log(`[Sync] ✅ Match finalized and career stats summed via Ledger.`);

            // Show custom success toast
            setManualScoreConfig(null);
            setShowSyncSuccess(true);
            setTimeout(() => setShowSyncSuccess(false), 3000);

        } catch (err: any) {
            console.error('[Sync] ❌ Finalize failed:', err);
            alert('⚠️ Sync failed: ' + (err.message || 'Check console.'));
        }

        setManualScoreConfig(null);
    };

    const handleSummaryUpdate = async (summary: any) => {
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

        const HOME_TEAM_ID = '00000000-0000-0000-0000-000000000000';
        const tossWinnerName = summary.tossWinner === HOME_TEAM_ID ? 'Indian Strikers' : oppName;

        await handleManualScoreSubmit({
            finalScoreHome: summary.homeScore,
            finalScoreAway: summary.awayScore,
            resultNote: autoResult,
            resultSummary: autoResult,
            scorecard: match.scorecard || { innings1: { batting: [], bowling: [], extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 }, totalRuns: 0, totalWickets: 0, totalOvers: 0 }, innings2: { batting: [], bowling: [], extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 }, totalRuns: 0, totalWickets: 0, totalOvers: 0 } },
            performers: match.performers || [],
            isLiveScored: false,
            toss: { winner: tossWinnerName, choice: summary.tossChoice },
            toss_winner_id: summary.tossWinner,
            maxOvers: summary.maxOvers,
        }, { skipCareerSync: true });
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
    const [showSyncSuccess, setShowSyncSuccess] = useState(false);
    const [viewScorecardMatch, setViewScorecardMatch] = useState<ScheduledMatch | null>(null);
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

        if (mode === 'view') {
            setXiModalConfig({
                isOpen: false,
                matchId,
                teamType: 'view',
                opponentId: match.opponentId
            });
            // Give time for state to update and hidden div to render
            setTimeout(() => {
                captureGraphic(matchId);
            }, 1000);
            return;
        }

        setXiModalConfig({
            isOpen: true,
            matchId,
            teamType: mode as 'home' | 'opponent' | 'view',
            opponentId: match.opponentId
        });
    };

    const handleSaveXI = async (matchId: string, teamType: 'home' | 'opponent', selection: string[]) => {
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

        await setPlayingXI(matchId, teamType, selection);
        setShowSyncSuccess(true);
        setTimeout(() => setShowSyncSuccess(false), 3000);
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
        setIsGenerating(true);
        // Robustness: wait specifically for the element to appear if needed
        let element = document.getElementById('team-sheet-graphic');

        if (!element) {
            await new Promise(r => setTimeout(r, 500));
            element = document.getElementById('team-sheet-graphic');
        }

        if (!element) {
            console.error("Team sheet element not found for match:", matchId);
            setIsGenerating(false);
            return;
        }

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#020617', // Slate 950
                scale: 3, // Higher quality
                useCORS: true,
                logging: false,
                onclone: (doc) => {
                    const el = doc.getElementById('team-sheet-graphic');
                    if (el) {
                        el.style.display = 'block';
                        el.style.position = 'relative';
                        el.style.left = '0';
                    }
                }
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

    const [isSyncing, setIsSyncing] = useState(false);
    const unsyncedCount = useMemo(() => {
        // Matches NOT present on server load? 
        // We can't know for sure without checking, but syncWithCloud does this.
        // For UI, we could assume anything not yet "fetched" is unsynced?
        // Actually, let's just show the button if admin.
        return matches.length;
    }, [matches.length]);

    const [syncStatus, setSyncStatus] = useState<'idle' | 'success'>('idle');
    const handleCloudSync = async () => {
        setIsSyncing(true);
        setSyncStatus('idle');
        try {
            await syncWithCloud();
            setSyncStatus('success');
            // Revert back to idle after 5 seconds
            setTimeout(() => setSyncStatus('idle'), 5000);
            alert("✅ Cloud Sync Complete!");
        } catch (e: any) {
            alert("❌ Sync failed: " + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const filteredMatches = useMemo(() => {
        return getSortedMatches().filter(m => {
            const opp = opponents.find(o => o.id === m.opponentId);
            const matchesSearch = searchQuery === '' ||
                (opp?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.tournament || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFormat = formatFilter === 'All' || m.matchFormat === formatFilter;
            const matchesTournament = tournamentFilter === 'All' || m.tournament === tournamentFilter;
            const matchesYear = yearFilter === 'All' || new Date(m.date).getFullYear().toString() === yearFilter;
            
            return matchesSearch && matchesFormat && matchesTournament && matchesYear;
        });
    }, [getSortedMatches, opponents, searchQuery, formatFilter, tournamentFilter, yearFilter]);

    return (
        <>
            <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
          .schedule-container { padding: 0; background: #ffffff; border-radius: 0; overflow: hidden; }
          .table-controls { display: flex; gap: 12px; padding: 16px 20px; align-items: center; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
          .search-bar { flex: 1; background: #ffffff; border: 1px solid #cbd5e1; color: #1e293b; padding: 9px 14px 9px 38px; border-radius: 8px; font-size: 13px; outline: none; transition: border 0.2s; }
          .search-bar:focus { border-color: #3b82f6; }
          .search-bar::placeholder { color: #94a3b8; }
          .schedule-table { width: 100%; border-collapse: collapse; color: #111827; font-size: 13px; }
          .schedule-table thead { background: #1e293b; }
          .schedule-table th { text-align: left; padding: 11px 14px; color: #94a3b8; font-weight: 700; border-bottom: 2px solid #1f2937; text-transform: uppercase; font-size: 10px; letter-spacing: .08em; white-space: nowrap; }
          .schedule-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
          .schedule-table tbody tr { background: #ffffff; transition: background 0.15s; }
          .schedule-table tbody tr:hover { background: #f1f5f9; cursor: pointer; }
          .date-stack { display: flex; flex-direction: column; gap: 2px; }
          .date-main { font-weight: 700; color: #111827; font-size: 12px; }
          .time-sub { font-size: 11px; color: #64748b; }
          .id-cell { color: #2563eb; font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; }
          .tournament-cell { font-size: 12px; font-weight: 700; color: #334155; }
          .vs-cell { 
            font-size: 11px; 
            font-weight: 500; 
            color: #000000; 
            background: transparent !important; 
            padding: 0 4px; 
            white-space: nowrap; 
            display: inline-block; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
            text-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
          }
          .team-cell { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 12px; white-space: nowrap; color: #111827; }
          .team-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: contain; background: transparent; border: 1px solid #e2e8f0; }
          .team-avatar-fallback { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 10px; font-weight: 900; }
          .badge-type { padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 900; display: inline-flex; align-items: center; gap: 4px; }
          .badge-t20 { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
          .badge-odi { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
          .badge-status-live { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
          .badge-status-done { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
          .badge-status-up { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
          .table-footer { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
          .filter-select { 
            background: #ffffff; 
            border: 1px solid #e2e8f0; 
            color: #1e293b; 
            padding: 9px 12px; 
            border-radius: 12px; 
            font-size: 11px; 
            font-weight: 800; 
            outline: none; 
            cursor: pointer; 
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 10px center;
            background-size: 14px;
            padding-right: 32px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .filter-select:hover { 
            border-color: #3b82f6; 
            background: #f8fafc; 
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.1);
          }
          .filter-select:focus { 
            border-color: #3b82f6; 
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          .search-wrap { position: relative; flex: 1; }

          @media (max-width: 768px) {
            .table-controls { flex-wrap: wrap; gap: 8px; padding: 12px 16px; }
            .search-wrap { width: 100%; flex: none; order: 1; }
            .filter-select { flex: 1; min-width: 120px; order: 2; padding: 8px 10px; font-size: 11px; }
          }
          .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
          
          /* ─── TABS ─── */
          .tab-inactive {
            color: #FFFFFF !important;
            opacity: 0.85;
            transition: all 0.3s ease;
          }
          .tab-inactive:hover {
            background-color: rgba(59,130,246,0.15);
            color: #FFFFFF;
            opacity: 1;
          }

          /* ─── COMPACT CARD ─── */
          .match-card-compact {
            background: #020617;
            border-radius: 20px;
            padding: 0;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* ─── VERTICAL TEAM LAYOUT ─── */
          .vs-container-revised {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24px 20px 16px;
            gap: 8px;
            background: radial-gradient(circle at center, rgba(30,58,138,0.1) 0%, transparent 70%);
          }
          .team-vertical {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            min-width: 0;
            gap: 12px;
          }

          /* ─── LOGO + XI OVERLAY ─── */
          .logo-wrapper {
            position: relative;
            display: inline-block;
          }
          .team-logo-md {
            width: 90px;
            height: 90px;
            border-radius: 24px;
            border: 2px solid rgba(255,255,255,0.1);
            background: #0f172a !important;
            object-fit: contain;
            display: block;
            box-shadow: 0 10px 20px rgba(0,0,0,0.4);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .team-logo-md:hover {
            transform: scale(1.1) rotate(2deg);
            border-color: #3b82f6;
          }

          /* ─── TEAM TEXT ─── */
          .team-name-display {
            font-family: 'Outfit', sans-serif;
            color: #f8fafc;
            font-weight: 900;
            font-size: 16px;
            text-transform: uppercase;
            text-align: center;
            letter-spacing: 0.05em;
            line-height: 1.2;
            max-width: 120px;
            min-height: 2.4em;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .team-score-display {
            color: #3b82f6;
            font-weight: 950;
            font-size: 20px;
            text-align: center;
            line-height: 1;
            text-shadow: 0 0 15px rgba(59,130,246,0.3);
          }

          .match-meta-info {
             color: #94a3b8 !important;
             font-weight: 700;
             padding-top: 8px;
             font-size: 11px;
             text-transform: uppercase;
             letter-spacing: 0.1em;
          }

          /* ─── INTERACTIVE VS ─── */
          .vs-interactive {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            flex-shrink: 0;
          }
          .vs-circle-pulse {
            background: #1e293b;
            color: #f8fafc;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 900;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
          }
          .vs-line {
            width: 2px;
            height: 14px;
            background: linear-gradient(to bottom, transparent, #3b82f6, transparent);
          }

          /* ─── RESULT RIBBON ─── */
          .result-ribbon-bold {
            background: linear-gradient(90deg, rgba(30, 58, 138, 0.3), rgba(29, 78, 216, 0.3));
            color: #bae6fd;
            text-align: center;
            font-size: 11px;
            font-weight: 800;
            padding: 8px 12px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          /* ─── FOOTER BUTTONS ─── */
          .card-footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding-top: 8px;
          }
          .btn-action-dark {
            padding: 9px 6px;
            background: #f1f5f9;
            color: #1e293b;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-action-dark:hover {
            background: #e2e8f0;
            color: #0f172a;
            border-color: #cbd5e1;
          }
          .btn-primary-bold {
            grid-column: span 2;
            margin-top: 2px;
            padding: 10px;
            background: linear-gradient(135deg, #1e3a8a, #2563eb);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(37,99,235,0.25);
          }
          .btn-primary-bold:hover {
            background: linear-gradient(135deg, #1e40af, #2563eb);
            box-shadow: 0 4px 12px rgba(37,99,235,0.35);
          }
          .btn-primary-full {
            grid-column: span 2;
            margin-top: 4px;
            padding: 10px;
            background: #e0f2fe;
            color: #0369a1;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: all 0.2s;
          }
          .btn-primary-full:hover {
            background: #2563eb;
            color: white;
          }

          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }

          .success-toast {
            position: fixed;
            top: 24px;
            right: 24px;
            background: #059669;
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            z-index: 10000;
            animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            font-weight: 700;
            font-size: 0.9rem;
            border-left: 4px solid #064e3b;
          }
        `}</style>

            <div className="space-y-6 animate-fade-in pb-12 w-full max-w-7xl mx-auto">
                {/* Standardized Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-2">
                            <Calendar className="text-blue-600" size={28} /> Match Center
                        </h1>
                        <p className="text-slate-500 font-medium text-sm mt-0.5">Live updates, upcoming schedules, and completed playing XI setups.</p>
                    </div>

                    {userRole === 'admin' && (
                        <div className="flex items-center gap-2 md:gap-3">
                            <button
                                onClick={handleCloudSync}
                                disabled={isSyncing}
                                className={`px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isSyncing
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : syncStatus === 'success'
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm'
                                    }`}
                                title="Sync matches with cloud database"
                            >
                                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : syncStatus === 'success' ? <CheckCircle2 size={16} /> : <RefreshCw size={16} />}
                                <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : syncStatus === 'success' ? 'Synced' : 'Sync Cloud'}</span>
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                            >
                                <Plus size={16} /> <span className="hidden sm:inline">Schedule Match</span><span className="sm:hidden">Match</span>
                            </button>

                            {/* RESTRICTED ADMIN PANEL */}
                            <div className="flex items-center gap-3 border-l border-slate-700 pl-4 ml-2">
                                <div className="hidden lg:flex flex-col items-end mr-2">
                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Restricted</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Panel</span>
                                </div>
                                
                                <button
                                    onClick={async () => {
                                        if (window.confirm("Initialize a New System Logic Test? This will create a local sandbox environment.")) {
                                            try {
                                                const matchId = await createSandboxMatch();
                                                console.log('Sandbox Created:', matchId);
                                                
                                                // Initialize the Scorer Store with this match
                                                useCricketScorer.getState().initializeMatch({
                                                    matchId,
                                                    matchType: 'T20',
                                                    ground: 'Sandbox Virtual Ground',
                                                    maxOvers: 20
                                                });

                                                navigate('/scorer');
                                            } catch (err: any) {
                                                alert("Failed to initialize sandbox: " + err.message);
                                                console.error(err);
                                            }
                                        }
                                    }}
                                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border border-slate-700 hover:border-sky-500 hover:bg-slate-800 flex items-center gap-2 group"
                                >
                                    <Activity size={14} className="text-sky-400 group-hover:scale-110 transition-transform" />
                                    <span>Launch Test Sandbox</span>
                                </button>

                                <button
                                    onClick={async () => {
                                        if (window.confirm("FINAL CONFIRMATION: This will permanently delete ALL 'is_test' matches and their associated ledger entries. This action cannot be undone. Proceed?")) {
                                            await purgeTestData();
                                            await syncWithCloud();
                                            alert("Administrative purge complete. Test data removed.");
                                        }
                                    }}
                                    className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-red-600 transition-all shadow-md group border border-slate-700"
                                    title="Purge All Test Data"
                                >
                                    <AlertCircle size={18} className="text-red-400 group-hover:text-white" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Standardized Glassmorphism Tabs Container */}
                <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    {/* Tabs Header */}
                    <div className="flex overflow-x-auto border-b border-slate-800 no-scrollbar">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`flex items-center gap-2 px-5 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap
                            ${activeTab === 'list' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-white hover:text-blue-400 hover:border-blue-500 hover:bg-blue-500/5'}`}
                        >
                            <List size={16} /> Schedule List
                        </button>
                        <button
                            onClick={() => setActiveTab('cards')}
                            className={`flex items-center gap-2 px-5 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap
                            ${activeTab === 'cards' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-white hover:text-blue-400 hover:border-blue-500 hover:bg-blue-500/5'}`}
                        >
                            <LayoutIcon size={16} /> Match Cards
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-0">
                        {/* Global Controls - Persist across tabs */}
                        <div className="table-controls px-6">
                            <div className="search-wrap relative flex-1">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search opponent or tournament..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-900 pl-10 pr-4 py-2 rounded-xl text-sm outline-none focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                            <select
                                value={tournamentFilter}
                                onChange={e => setTournamentFilter(e.target.value)}
                                className="filter-select border-blue-200 text-blue-600"
                                title="Filter by tournament"
                            >
                                <option value="All">All Tournaments</option>
                                {tournaments.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                            </select>

                            <select
                                value={yearFilter}
                                onChange={e => setYearFilter(e.target.value)}
                                className="filter-select border-slate-200 text-slate-600"
                                title="Filter by year"
                            >
                                <option value="All">All Years</option>
                                {availableYears.map(year => (
                                    <option key={year} value={year.toString()}>{year}</option>
                                ))}
                            </select>

                            <select
                                value={formatFilter}
                                onChange={e => setFormatFilter(e.target.value as any)}
                                title="Filter by match format"
                                className="filter-select border-slate-200 text-slate-600"
                            >
                                <option value="All">All Formats</option>
                                <option value="T20">T20</option>
                                <option value="One Day">One Day</option>
                            </select>
                        </div>

                        {activeTab === 'list' && (
                            <div className="schedule-container">


                                {/* Table */}
                                {filteredMatches.length === 0 ? (
                                    <div className="p-14 text-center text-slate-500 font-medium bg-slate-900/20">
                                        {searchQuery || formatFilter !== 'All' ? 'No matches found matches your filters.' : 'No matches configured yet.'}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="schedule-table">
                                            <thead>
                                                <tr>
                                                    <th>#ID</th>
                                                    <th>Date & Time</th>
                                                    <th>Tournament</th>
                                                    <th>Fixture</th>
                                                    <th>Ground</th>
                                                    <th>Format</th>
                                                    <th>Status</th>
                                                    {userRole === 'admin' && <th>Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredMatches.map(m => {
                                                    const opp = opponents.find(o => o.id === m.opponentId);
                                                    return (
                                                        <tr key={m.id} onClick={() => setActiveTab('cards')}>
                                                            <td className="id-cell">#{(String(m.id).slice(-4) || "0000").toUpperCase()}</td>
                                                            <td>
                                                                <div className="date-stack">
                                                                    <span className="date-main">{new Date(m.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                                    <span className="time-sub">{new Date(m.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                            </td>
                                                            <td className="tournament-cell uppercase">{(m.tournament || "No Tournament").toUpperCase()}</td>
                                                            <td>
                                                                <div className="team-cell">
                                                                    <img src="/INS%20LOGO.PNG" alt="INS" className="team-avatar" />
                                                                    <span>INDIAN STRIKERS</span>
                                                                    <span className="vs-cell">VS</span>
                                                                    {opp?.logoUrl ? <img src={opp.logoUrl} alt={opp?.name} className="team-avatar" /> : <div className="team-avatar-fallback text-slate-500">?</div>}
                                                                    <span className="uppercase">{(opp?.name || 'Unknown').toUpperCase()}</span>
                                                                </div>
                                                            </td>
                                                            <td className="text-slate-500 text-xs font-bold uppercase">{grounds.find(g => g.id === m.groundId)?.name || 'TBD'}</td>
                                                            <td>
                                                                <span className={`badge-type ${m.matchFormat === 'T20' ? 'badge-t20' : 'badge-odi'}`}>
                                                                    {(m.matchFormat || 'T20').toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`badge-type ${m.status === 'live' ? 'badge-status-live' : m.status === 'completed' ? 'badge-status-done' : 'badge-status-up'}`}>
                                                                    {(m.status || "Unknown").toUpperCase()}
                                                                </span>
                                                            </td>
                                                            {userRole === 'admin' && (
                                                                <td onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={() => setEditingMatch(m)} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors" title="Edit Metadata"><Plus size={14} /></button>
                                                                        <button onClick={() => { if (window.confirm("Delete Match?")) deleteMatch(m.id); }} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Delete Match"><Shield size={14} /></button>
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="table-footer px-6">
                                    <span>{filteredMatches.length} {filteredMatches.length === 1 ? 'fixture' : 'fixtures'} found</span>
                                    {(searchQuery || formatFilter !== 'All' || tournamentFilter !== 'All' || yearFilter !== 'All') && (
                                        <button 
                                            onClick={() => { 
                                                setSearchQuery(''); 
                                                setFormatFilter('All'); 
                                                setTournamentFilter('All');
                                                setYearFilter('All');
                                            }} 
                                            className="text-blue-500 font-bold hover:underline"
                                        >
                                            Clear all filters
                                        </button>
                                    )}
                                </div>

                                {/* STANDINGS / POINTS TABLE SECTION */}
                                <div className="px-6 pb-20">
                                    <PointsTable 
                                        tournaments={tournaments} 
                                        userRole={userRole} 
                                        opponents={opponents} 
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'cards' && (
                            <div className="py-12 px-4 bg-slate-950 overflow-hidden relative min-h-[600px] flex items-center justify-center">
                                {filteredMatches.length === 0 ? (
                                    <div className="text-center flex flex-col items-center justify-center">
                                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-500 mb-4 border border-slate-800">
                                            <AlertCircle size={32} />
                                        </div>
                                        <h3 className="text-white font-black text-lg uppercase tracking-tight">No matches found</h3>
                                        <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search criteria.</p>
                                    </div>
                                ) : (
                                    <div className="relative w-full max-w-7xl mx-auto flex items-center justify-center">
                                        {/* Swipe Guide */}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                                            <span>Swipe to explore matches</span>
                                        </div>

                                        <MatchCardCarousel
                                            matches={filteredMatches}
                                            teamLogo={teamLogo || '/INS%20LOGO.PNG'}
                                            opponents={opponents}
                                            grounds={grounds}
                                            userRole={userRole}
                                            onSelectPlayingXI={handleSelectPlayingXI}
                                            onEditMatch={(m: ScheduledMatch) => setEditingMatch(m)}
                                            onStartScoring={handleStartScoring}
                                            onViewScorecard={(m: ScheduledMatch) => setViewScorecardMatch(m)}
                                            onUpdateManualScore={(id: string, mode?: 'summary' | 'full') => {
                                                setManualScoreConfig({ matchId: id, showPlayers: mode === 'full' });
                                            }}
                                            onDeleteMatch={deleteMatch}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>



                {/* Modals & Overlays */}
                {viewScorecardMatch && (
                    <ScorecardViewModal
                        match={viewScorecardMatch}
                        isOpen={!!viewScorecardMatch}
                        onClose={() => setViewScorecardMatch(null)}
                        players={players}
                        allOpponents={opponents}
                        grounds={grounds}
                    />
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
                        match={{
                            ...matches.find(m => m.id === manualScoreConfig.matchId)!,
                            homeLogo: teamLogo || '/INS%20LOGO.PNG',
                            opponentLogo: opponents.find(o => o.id === matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId)?.logoUrl
                        }}
                        opponentName={opponents.find(o => o.id === matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId)?.name || 'Opponent'}
                        onSave={handleSummaryUpdate}
                        onClose={() => setManualScoreConfig(null)}
                    />
                )}

                {manualScoreConfig && manualScoreConfig.showPlayers && (
                    <FullScorecardModal
                        match={matches.find(m => m.id === manualScoreConfig.matchId)!}
                        homeSquad={players}
                        opponentSquad={(opponents.find(o => o.id === matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId)?.players || []).filter(p => {
                            const m = matches.find(match => match.id === manualScoreConfig.matchId);
                            const xi = m?.opponentTeamXI || [];
                            return (xi.length === 0 || xi.some(pid => String(pid) === String(p.id)));
                        })}
                        opponentName={opponents.find(o => o.id === matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId)?.name || 'Opponent'}
                        homeTeamLogo={teamLogo || '/INS%20LOGO.PNG'}
                        opponentLogo={opponents.find(o => o.id === matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId)?.logoUrl}
                        onClose={() => setManualScoreConfig(null)}
                        onSave={handleManualScoreSubmit}
                    />
                )}

                {/* Playing XI Modal Rendering */}
                {xiModalConfig.isOpen && (
                    <div id="team-sheet-container">
                        <PlayingXIModal
                            matchId={xiModalConfig.matchId}
                            homePlayers={players.filter(p => p.isActive !== false && p.isAvailable !== false)}
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
                            onShare={(id) => handleSelectPlayingXI(id, 'view')}
                        />
                    </div>
                )}

                {/* Hidden Graphic for Capture (Independent of Modal Open State) */}
                {xiModalConfig.matchId && matches.find(m => m.id === xiModalConfig.matchId) && (
                    <div className="fixed -left-[2000px] top-0 pointer-events-none">
                        <div id="team-sheet-graphic" className="w-[1080px] min-h-[1350px] bg-slate-950 p-12 text-white border-[1px] border-white/10 shadow-2xl relative overflow-hidden flex flex-col">
                            {/* Background Branding */}
                            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

                            {/* BROADCAST HEADER */}
                            {(() => {
                                const currentMatch = matches.find(m => m.id === xiModalConfig.matchId);
                                if (!currentMatch) return null;
                                const opp = opponents.find((o: OpponentTeam) => o.id === currentMatch.opponentId);
                                const oppName = (opp?.name || currentMatch.opponentName || 'Opponent').toUpperCase();
                                const matchYear = new Date(currentMatch.date).getFullYear();
                                
                                return (
                                    <div className="relative z-10 flex flex-col gap-6 mb-8">
                                        <div className="flex items-center gap-12 bg-slate-900/60 p-8 rounded-[40px] border border-white/5 backdrop-blur-2xl shadow-2xl">
                                            {/* Left: Logo Only */}
                                            <div className="flex items-center justify-center p-1 w-28 h-28 shrink-0">
                                                {xiModalConfig.teamType === 'opponent' && opp?.logoUrl ? (
                                                    <img src={opp.logoUrl} className="w-full h-full object-contain" alt="Opponent" />
                                                ) : (
                                                    <img src="/INS%20LOGO.PNG" className="w-full h-full object-contain" alt="INS" />
                                                )}
                                            </div>

                                            {/* Extended Center: Tournament Info */}
                                            <div className="flex flex-col items-center flex-1 text-center border-l border-white/10 pl-12 pr-6">
                                                <div className="text-sky-400 text-lg font-black uppercase tracking-[0.5em] mb-3 drop-shadow-sm">
                                                    {(currentMatch.tournament || 'Official Tournament').toUpperCase()} — {matchYear}
                                                </div>
                                                <div className="text-white text-4xl font-black uppercase tracking-[0.2em] italic leading-tight graduate">
                                                    MATCH DAY XI <span className="mx-3 text-white/20">|</span> {currentMatch.matchFormat?.toUpperCase() || 'T20'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* REFINED: Match Detail Bar (Date, Time, Ground, VS) */}
                                        <div className="flex items-center justify-between gap-6 bg-slate-100/5 backdrop-blur-md px-10 py-6 rounded-3xl border border-white/10 shadow-lg">
                                            <div className="flex items-center gap-12">
                                                <div className="flex items-center gap-4">
                                                    <Calendar size={22} className="text-sky-500 shrink-0" />
                                                    <span className="text-sm font-black uppercase tracking-[0.2em] text-white/90 whitespace-nowrap">
                                                        {new Date(currentMatch.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 border-l border-white/10 pl-12">
                                                    <Cloud size={22} className="text-sky-500 shrink-0" />
                                                    <span className="text-sm font-black uppercase tracking-[0.2em] text-white/90 whitespace-nowrap">
                                                        {new Date(currentMatch.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 border-l border-white/10 pl-12 flex-1">
                                                    <MapPin size={22} className="text-sky-500 shrink-0" />
                                                    <span className="text-sm font-black uppercase tracking-[0.2em] text-white/90 min-w-fit">
                                                        {grounds.find(g => g.id === currentMatch.groundId)?.name || 'Stadium Outfield'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-5 bg-sky-500/10 px-8 py-3 rounded-2xl border border-sky-500/30 shadow-inner">
                                                <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em]">VERSUS</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-base font-black text-white uppercase italic tracking-tight">{xiModalConfig.teamType === 'opponent' ? 'INDIAN STRIKERS' : oppName}</span>
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white/5 border border-white/10">
                                                        {xiModalConfig.teamType === 'opponent' ? (
                                                            <img src="/INS%20LOGO.PNG" className="w-full h-full object-contain" alt="INS" />
                                                        ) : (
                                                            opp?.logoUrl ? <img src={opp.logoUrl} className="w-full h-full object-contain" alt="Opp" /> : <Activity size={20} className="text-sky-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ROSTER GRID with Refined Player Cards & Background */}
                            <div className="relative z-10 flex-1 bg-slate-900/50 rounded-[45px] p-12 border border-white/5 backdrop-blur-xl grid grid-cols-2 gap-x-20 gap-y-12 overflow-hidden">
                                {/* Ground Background Overlay */}
                                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay">
                                    <img 
                                        src="https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=2070" 
                                        className="w-full h-full object-cover scale-110"
                                        alt="Cricket Ground" 
                                    />
                                </div>
                                {(() => {
                                    const match = matches.find(m => m.id === xiModalConfig.matchId);
                                    if (!match) return null;
                                    
                                    const isOpponent = xiModalConfig.teamType === 'opponent';
                                    const opp = opponents.find(o => o.id === match.opponentId);
                                    const xiIds = (isOpponent ? match.opponentTeamXI : match.homeTeamXI) || [];
                                    const roster = isOpponent ? (opp?.players || []) : players;

                                    return roster
                                        .filter((p: any) => xiIds.includes(String(p.id || p.name)))
                                        .map((player: any, idx: number) => (
                                            <div key={player.id || player.name} className="flex items-center gap-10 group">
                                                <div className="relative shrink-0">
                                                    {/* Round Profile Picture - Reduced size by approx 25% from original rect container area */}
                                                    <div className="w-28 h-28 rounded-full border-[3px] border-white/10 overflow-hidden bg-slate-950 shadow-2xl transition-all duration-500 group-hover:border-sky-500/50 group-hover:scale-105">
                                                        {(player.avatarUrl || player.photo) ? (
                                                            <img src={player.avatarUrl || player.photo} className="w-full h-full object-cover object-top" alt={player.name} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
                                                                <span className="text-slate-700 font-black text-4xl italic opacity-50">{idx + 1}</span>
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>
                                                    </div>
                                                    <span className="absolute -top-1 -right-1 bg-sky-500 text-blue-950 font-black w-10 h-10 rounded-full border-[5px] border-[#0a0f1d] flex items-center justify-center text-sm shadow-2xl z-20">
                                                        {idx + 1}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-black text-2xl uppercase tracking-tight text-white leading-none graduate group-hover:text-sky-400 transition-colors duration-300">{player.name}</p>
                                                    {(player.isCaptain || (typeof player.designation === 'string' && player.designation.includes('Captain'))) && (
                                                        <div className="mt-3 flex items-center gap-2 bg-yellow-500/10 w-fit px-4 py-1.5 rounded-xl border border-yellow-500/30 shadow-lg shadow-yellow-500/5">
                                                            <Award size={14} className="text-yellow-500" />
                                                            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em]">Captain</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ));
                                })()}
                            </div>

                            {/* CLEAN DETAILED FOOTER */}
                            {(() => {
                                const currentMatch = matches.find(m => m.id === xiModalConfig.matchId);
                                if (!currentMatch) return null;
                                
                                return (
                                    <div className="relative z-10 mt-10 flex justify-end items-center px-4">
                                        <div className="flex flex-col items-end gap-1 text-right">
                                            <div className="flex items-center gap-4">
                                                <div className="h-[2px] w-12 bg-sky-500"></div>
                                                <div className="text-lg font-black text-white tracking-[0.2em] italic graduate">WWW.INDIANSTRIKERS.CLUB</div>
                                            </div>
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] opacity-50 pr-1">
                                                IMAGE GENERATED BY INS TEAM MANAGEMENT SYSTEM
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {isGenerating && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-slate-950 p-8 rounded-3xl border border-blue-500/30 text-center">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-white font-black uppercase tracking-widest italic">Generating Graphic...</p>
                        </div>
                    </div>
                )}

                {showSyncSuccess && (
                    <div className="success-toast">
                        <CheckCircle2 size={24} className="text-white" />
                        <div>
                            <p className="text-white font-black uppercase tracking-widest text-[10px]">Success</p>
                            <p className="text-blue-50 text-[13px]">Match details updated and saved successfully</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};


// ─── INFINITE CAROUSEL COMPONENT ───
const MatchCardCarousel = ({ 
    matches, 
    teamLogo, 
    opponents, 
    grounds, 
    userRole, 
    onSelectPlayingXI, 
    onEditMatch, 
    onStartScoring, 
    onViewScorecard, 
    onUpdateManualScore, 
    onDeleteMatch 
}: any) => {
    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const CARD_WIDTH = 340;
    const CARD_GAP = 32;
    const TOTAL_WIDTH = CARD_WIDTH + CARD_GAP;

    // Auto-Play Logic
    useEffect(() => {
        if (isPaused || matches.length <= 1) return;
        const interval = setInterval(() => {
            setIndex(prev => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, [isPaused, matches.length]);

    // Calculate wrapping for data
    const getMatchIndex = (virtualIndex: number) => {
        const len = matches.length;
        if (len === 0) return 0;
        return ((virtualIndex % len) + len) % len;
    };

    const handleDragEnd = (_: any, info: any) => {
        const swipeThreshold = 50;
        const velocityThreshold = 500;
        
        if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
            setIndex(prev => prev + 1);
        } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
            setIndex(prev => prev - 1);
        }
        
        // Brief pause after interaction
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 3000);
    };

    return (
        <div 
            className="relative w-full h-[600px] flex items-center justify-center overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* The "Camera" view - we center this viewport */}
            <div className="relative w-full h-full flex items-center justify-center">
                <motion.div
                    className="flex items-center absolute"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }} // Elastic drag
                    onDragStart={() => setIsPaused(true)}
                    onDragEnd={handleDragEnd}
                    animate={{ x: -index * TOTAL_WIDTH }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 150, 
                        damping: 20,
                        mass: 1
                    }}
                >
                    {/* 
                        Render a window of 15 virtual cards.
                        We always render cards at relative positions to the CURRENT index.
                        By using the 'index' in the key and the position, we avoid jumps.
                    */}
                    {Array.from({ length: 15 }).map((_, i) => {
                        const virtualPos = index + (i - 7);
                        const matchIdx = getMatchIndex(virtualPos);
                        const match = matches[matchIdx];
                        if (!match) return null;

                        const isActive = virtualPos === index;
                        // Calculate distance from center for scaling/opacity
                        const distance = Math.abs(virtualPos - index);

                        return (
                            <motion.div
                                key={virtualPos}
                                style={{
                                    width: CARD_WIDTH,
                                    position: 'absolute',
                                    left: virtualPos * TOTAL_WIDTH - (CARD_WIDTH / 2),
                                    x: 0 // Avoid conflict with parent X
                                }}
                                initial={false}
                                animate={{
                                    scale: isActive ? 1.1 : Math.max(0.8, 1 - distance * 0.15),
                                    opacity: isActive ? 1 : Math.max(0.3, 1 - distance * 0.4),
                                    filter: isActive ? "blur(0px)" : `blur(${Math.min(4, distance * 2)}px)`,
                                    zIndex: 10 - distance,
                                    rotateY: isActive ? 0 : (virtualPos < index ? 25 : -25),
                                    y: isActive ? -20 : 0
                                }}
                                transition={{ 
                                    type: "spring", 
                                    stiffness: 250, 
                                    damping: 25 
                                }}
                                className={`perspective-1000 ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}
                            >
                                <MatchCenterTile
                                    match={match}
                                    homeTeamName="Indian Strikers"
                                    homeTeamLogo={teamLogo || '/INS%20LOGO.PNG'}
                                    opponent={opponents.find((t: any) => t.id === match.opponentId)}
                                    onSelectPlayingXI={onSelectPlayingXI}
                                    onEditMatch={onEditMatch}
                                    onStartScoring={onStartScoring}
                                    onViewScorecard={onViewScorecard}
                                    onUpdateManualScore={onUpdateManualScore}
                                    onDeleteMatch={onDeleteMatch}
                                    userRole={userRole}
                                    isAdmin={userRole === 'admin'}
                                    grounds={grounds}
                                    isCarouselActive={isActive}
                                />
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* Navigation Arrows for accessibility */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex justify-between px-4">
                <button 
                    onClick={() => setIndex(prev => prev - 1)}
                    className="w-12 h-12 rounded-full bg-slate-900/50 backdrop-blur-md border border-slate-700 text-white flex items-center justify-center hover:bg-blue-600 transition-all pointer-events-auto"
                    title="Previous Match"
                    aria-label="Previous Match"
                >
                    <ChevronLeft size={24} />
                </button>
                <button 
                    onClick={() => setIndex(prev => prev + 1)}
                    className="w-12 h-12 rounded-full bg-slate-900/50 backdrop-blur-md border border-slate-700 text-white flex items-center justify-center hover:bg-blue-600 transition-all pointer-events-auto"
                    title="Next Match"
                    aria-label="Next Match"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
            
            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {matches.map((_: any, i: number) => {
                    const activeIdx = ((index % matches.length) + matches.length) % matches.length;
                    return (
                        <div 
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeIdx === i ? 'bg-blue-500 w-6' : 'bg-slate-700'}`}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default MatchCenter;
