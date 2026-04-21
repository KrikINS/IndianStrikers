import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Player, OpponentTeam, UserRole, ScheduledMatch } from '../types';
import { useMatchCenter } from '../store/matchStore';
import MatchCenterTile from './MatchCenterTile';
import { UniversalScorecard } from './UniversalScorecard';
import { PlayingXIModal } from './PlayingXIModal';
import { LineupGraphic } from './LineupGraphic';
import EditMatchModal from './EditMatchModal';
import AddMatchModal from './AddMatchModal';
import MatchSummaryModal from './MatchSummaryModal';
import FullScorecardModal from './FullScorecardModal';
import ManualScoreModal from './ManualScoreModal';
import { Calendar, Shield, Plus, X, Cloud, RefreshCw, Loader2, AlertCircle, List, Layout as LayoutIcon, TableProperties, Check, CheckCircle2, ChevronLeft, ChevronRight, Activity, Award, Trophy, MapPin, Hash, Trash2, RefreshCcw, Lock as LockIcon, Unlock, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { updateBattingCareerStats, updateBowlingCareerStats } from '../services/statsEngine';
import { useMasterData } from '../store/tournamentStore';
import { BattingStats, BowlingStats, Performer, MatchStatus, MatchStage } from '../types';
import { useCricketScorer } from '../store/matchStore';
import { usePlayerStore } from '../store/playerStore';
import PointsTable from './PointsTable';
import TournamentsManager from './TournamentsManager';


// Responsive constants for Carousel handled inside component

interface MatchCenterProps {
    opponents: OpponentTeam[];
    userRole: UserRole;
    teamLogo?: string;
    currentUser?: { id?: string; name: string; username: string; avatarUrl?: string; canScore?: boolean };
    onUpdateOpponent: (t: OpponentTeam) => void;
    onRefresh?: () => Promise<void>;
}

const MatchCenter: React.FC<MatchCenterProps> = ({ opponents, userRole, teamLogo, currentUser, onUpdateOpponent, onRefresh }) => {
    const { players, updatePlayer: onUpdatePlayer } = usePlayerStore();
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
        wipeLocalMatches
    } = useMatchCenter();
    const { grounds, tournaments, syncMasterData } = useMasterData();
    const initializeMatch = useCricketScorer(state => state.initializeMatch);
    const isAdmin = userRole === 'admin';

    // Filters and Search
    const [activeTab, setActiveTab] = useState<'list' | 'standings' | 'tournaments'>('list');
    const [selectedCardMatch, setSelectedCardMatch] = useState<ScheduledMatch | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formatFilter, setFormatFilter] = useState<'All' | 'T20' | 'One Day'>('All');
    const [tournamentFilter, setTournamentFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');

    // Available years from matches
    const availableYears = useMemo(() => {
        const years = (matches || []).map(m => new Date(m.date).getFullYear());
        return Array.from(new Set(years)).sort((a, b) => b - a); // Newest first
    }, [matches]);

    // Auto-sync on mount
    React.useEffect(() => {
        if (syncWithCloud) {
            syncWithCloud().catch(err => console.error("Auto-sync error:", err));
        }
        if (syncMasterData) {
            syncMasterData().catch(err => console.error("Master data sync error:", err));
        }
    }, [syncWithCloud, syncMasterData]);

    const handleToggleLock = async (matchId: string, currentStatus: boolean) => {
        if (!isAdmin) return;
        
        try {
            const match = matches.find(m => m.id === matchId);
            if (!match) return;

            // Use explicitly negated status to ensure toggle works even if database/UI are out of sync
            const targetStatus = !currentStatus;
            await updateMatch(matchId, { isLocked: targetStatus } as any);
            console.log(`[Admin] Match ${matchId} ${targetStatus ? 'locked' : 'unlocked'}.`);
        } catch (err) {
            console.error("Failed to toggle lock:", err);
            alert("Failed to update lock status. Please check your connection.");
        }
    };

    const handleManualScoreSubmit = async (data: any, options: { skipCareerSync?: boolean } = {}) => {
        if (!manualScoreConfig) return;

        const match = matches.find(m => m.id === manualScoreConfig.matchId);
        if (!match) return;

        try {
            console.log(`[Sync] Finalizing match ${match.id} on cloud...`);
            
            // Ensure even summary-only matches have a valid scorecard object for the UI
            const finalScorecard = data.scorecard || {
                innings1: { batting: [], bowling: [], extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 }, totalRuns: data.finalScoreHome?.runs || 0, totalWickets: data.finalScoreHome?.wickets || 0, totalOvers: data.finalScoreHome?.overs || 0, history: [] },
                innings2: { batting: [], bowling: [], extras: { wide: 0, no_ball: 0, legByes: 0, byes: 0 }, totalRuns: data.finalScoreAway?.runs || 0, totalWickets: data.finalScoreAway?.wickets || 0, totalOvers: data.finalScoreAway?.overs || 0, history: [] }
            };

            const finalData = { ...data, scorecard: finalScorecard, isCareerSynced: true };

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
            // Re-throw so the modal can handle it and stay open
            throw err;
        }

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

        const summaryScorecard = match.scorecard || {
            innings1: { 
                batting: [], 
                bowling: [], 
                extras: { wide: summary.homeScore?.wides || 0, no_ball: 0, legByes: 0, byes: 0 }, 
                totalRuns: summary.homeScore?.runs || 0, 
                totalWickets: summary.homeScore?.wickets || 0, 
                totalOvers: summary.homeScore?.overs || 0,
                history: []
            }, 
            innings2: { 
                batting: [], 
                bowling: [], 
                extras: { wide: summary.awayScore?.wides || 0, no_ball: 0, legByes: 0, byes: 0 }, 
                totalRuns: summary.awayScore?.runs || 0, 
                totalWickets: summary.awayScore?.wickets || 0, 
                totalOvers: summary.awayScore?.overs || 0,
                history: []
            } 
        };

        try {
            await handleManualScoreSubmit({
                finalScoreHome: summary.homeScore,
                finalScoreAway: summary.awayScore,
                resultNote: autoResult,
                resultSummary: autoResult,
                scorecard: summaryScorecard,
                performers: match.performers || [],
                isLiveScored: false,
                toss: { winner: tossWinnerName, choice: summary.tossChoice },
                toss_winner_id: summary.tossWinner,
                maxOvers: summary.maxOvers,
            }, { skipCareerSync: true });
        } catch (err) {
            console.error('[SummarySync] Error in submission block:', err);
            throw err;
        }
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
    const [summaryMatchId, setSummaryMatchId] = useState<string | null>(null);
    const [summaryPreviewUrl, setSummaryPreviewUrl] = useState<string | null>(null);

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

        try {
            await setPlayingXI(matchId, teamType, selection);
            setShowSyncSuccess(true);
            setTimeout(() => setShowSyncSuccess(false), 3000);
        } catch (err: any) {
            console.error('[SaveXI] Failed:', err);
            alert('Failed to save Playing XI: ' + (err.message || 'Server error'));
        }
    };

    const handleStartScoring = async (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;

        const isScorerOrAdmin = userRole === 'admin' || currentUser?.canScore;

        if (!isScorerOrAdmin) {
            navigate(`/live/${matchId}`);
            return;
        }

        if (match.homeTeamXI.length !== 11) {
            alert("Please select exactly 11 players for Indian Strikers before starting.");
            handleSelectPlayingXI(matchId, 'home');
            return;
        }

        initializeMatch({
            matchId: match.id,
            matchType: match.matchFormat || 'T20',
            tournament: match.tournament || 'Live Match',
            ground: grounds.find(g => g.id === match.groundId)?.name || 'Default Ground',
            opponentName: match.opponentName || 'Opponent',
            maxOvers: match.maxOvers || 20,
            homeXI: match.homeTeamXI,
            awayXI: match.opponentTeamXI
        });

        if (match.status === 'upcoming') {
            await updateMatchStatus(matchId, 'live');
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
                backgroundColor: '#020617',
                scale: 3, 
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
    
    const captureMatchSummary = async (matchId: string) => {
        try {
            console.log("[Generator] Starting High-Res Match Summary capture for:", matchId);
            setSummaryMatchId(matchId);
            setIsGenerating(true);
            
            // Allow time for mount and logo loading
            await new Promise(r => setTimeout(r, 1200));
            
            const element = document.getElementById('match-summary-graphic');
            if (!element) {
                console.error("[Generator] ❌ Summary container not found");
                setIsGenerating(false);
                return;
            }

            // Using html-to-image with CORS and Style filters
            const dataUrl = await toPng(element, {
                quality: 1.0,
                pixelRatio: 3, 
                backgroundColor: '#020617',
                cacheBust: true,
                style: {
                    transform: 'none',
                    display: 'block'
                },
                // Skip problematic external stylesheets that trigger SecurityError
                filter: (node: any) => {
                    if (node?.tagName === 'LINK' && node?.href?.includes('fonts.googleapis')) return false;
                    return true;
                }
            });

            // Set the preview URL instead of direct download
            setSummaryPreviewUrl(dataUrl);
            console.log("[Generator] ✅ Summary generated successfully via html-to-image.");
        } catch (err) {
            console.error("[Generator] ❌ Fatal error during summary capture:", err);
            alert("Failed to generate image. Please check console for details.");
        } finally {
            setIsGenerating(false);
            setSummaryMatchId(null);
        }
    };

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success'>('idle');
    const handleCloudSync = async () => {
        if (!window.confirm("This will refresh all matches and live scores from the cloud. Continue?")) return;

        setIsSyncing(true);
        setSyncStatus('idle');
        try {
            console.log("[Sync] Performing Full Cloud Refresh...");
            wipeLocalMatches();
            useCricketScorer.getState().resetStore();
            
            await syncWithCloud();
            setSyncStatus('success');
            
            setTimeout(() => {
                setSyncStatus('idle');
                window.location.reload(); 
            }, 1000);
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
            padding: 32px 26px 22px;
            gap: 12px;
            background: radial-gradient(circle at center, rgba(30,58,138,0.1) 0%, transparent 70%);
          }
          .team-vertical {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            min-width: 0;
            gap: 16px;
          }

          /* ─── LOGO + XI OVERLAY ─── */
          .logo-wrapper {
            position: relative;
            display: inline-block;
          }
          .team-logo-md {
            width: 126px;
            height: 126px;
            border-radius: 34px;
            border: 2px solid rgba(255,255,255,0.1);
            background: #0f172a !important;
            object-fit: contain;
            display: block;
            box-shadow: 0 14px 28px rgba(0,0,0,0.4);
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
            font-size: 22px;
            text-transform: uppercase;
            text-align: center;
            letter-spacing: 0.05em;
            line-height: 1.2;
            max-width: 168px;
            min-height: 2.4em;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .team-score-display {
            color: #3b82f6;
            font-weight: 950;
            font-size: 28px;
            text-align: center;
            line-height: 1;
            text-shadow: 0 0 20px rgba(59,130,246,0.3);
          }

          .match-meta-info {
             color: #94a3b8 !important;
             font-weight: 700;
             padding-top: 2px;
             font-size: 11px;
             text-transform: uppercase;
             letter-spacing: 0.05em;
             opacity: 0.8;
          }

          /* ─── INTERACTIVE VS ─── */
          .vs-interactive {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-shrink: 0;
          }
          .vs-circle-pulse {
            background: #1e293b;
            color: #f8fafc;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 900;
            border: 2px solid rgba(255,255,255,0.1);
            box-shadow: 0 0 28px rgba(0,0,0,0.5);
          }
          .vs-line {
            width: 3px;
            height: 20px;
            background: linear-gradient(to bottom, transparent, #3b82f6, transparent);
          }

          /* ─── RESULT RIBBON ─── */
          .result-ribbon-bold {
            background: linear-gradient(90deg, rgba(15, 23, 42, 0.9), rgba(30, 58, 138, 0.9));
            color: #f8fafc;
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            padding: 14px 16px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border-top: 1px solid rgba(255,255,255,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            text-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
          }

          .result-won { border-color: rgba(16, 185, 129, 0.4); color: #34d399 !important; }
          .result-lost { border-color: rgba(239, 68, 68, 0.4); color: #f87171 !important; }
          .result-live { border-color: rgba(56, 189, 248, 0.4); color: #7dd3fc !important; }

          /* ─── FOOTER BUTTONS ─── */
          .card-footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding-top: 12px;
          }
          .btn-action-dark {
            padding: 14px 8px;
            background: #f1f5f9;
            color: #1e293b;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            font-size: 14px;
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
            margin-top: 3px;
            padding: 14px;
            background: linear-gradient(135deg, #1e3a8a, #2563eb);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(37,99,235,0.25);
          }
          .btn-primary-bold:hover {
            background: linear-gradient(135deg, #1e40af, #2563eb);
            box-shadow: 0 6px 14px rgba(37,99,235,0.35);
          }
          .btn-primary-full {
            grid-column: span 2;
            margin-top: 6px;
            padding: 14px;
            background: #e0f2fe;
            color: #0369a1;
            border: 1px solid #bae6fd;
            border-radius: 12px;
            font-size: 16px;
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

            <div className="space-y-6 animate-fade-in pb-12 w-full">
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
                                title="Schedule a new match"
                                onClick={() => setShowAddModal(true)}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                            >
                                <Plus size={16} /> <span className="hidden sm:inline">Schedule Match</span><span className="sm:hidden">Match</span>
                            </button>

                            {/* RESTRICTED ADMIN PANEL */}
                            <div className="flex items-center gap-3 border-l border-slate-700 pl-4 ml-2">
                                <div className="hidden lg:flex flex-col items-end mr-2">
                                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Live Scorer</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Access</span>
                                </div>
                                
                                <button
                                    title="Purge All Test Data"
                                    onClick={async () => {
                                        if (window.confirm("FINAL CONFIRMATION: This will permanently delete ALL 'is_test' matches and their associated ledger entries. This action cannot be undone. Proceed?")) {
                                            await purgeTestData();
                                            await syncWithCloud();
                                            alert("Administrative purge complete. Test data removed.");
                                        }
                                    }}
                                    className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-red-600 transition-all shadow-md group border border-slate-700"
                                >
                                    <AlertCircle size={18} className="text-red-400 group-hover:text-white" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Tabs / Filter Navigation */}
                <div className="bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-800">
                    <div className="flex border-b border-slate-800 overflow-x-auto scroller-hide bg-slate-950/40">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`flex items-center gap-2 px-5 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap 
                            ${activeTab === 'list' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-white hover:text-blue-400 hover:border-blue-500 hover:bg-blue-500/5'}`}
                        >
                            <Calendar size={16} /> Schedule List
                        </button>
                        <button
                            onClick={() => setActiveTab('standings')}
                            className={`flex items-center gap-2 px-5 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap
                            ${activeTab === 'standings' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-white hover:text-blue-400 hover:border-blue-500 hover:bg-blue-500/5'}`}
                        >
                            <TableProperties size={16} /> Points Table
                        </button>
                        <button
                            onClick={() => setActiveTab('tournaments')}
                            className={`flex items-center gap-2 px-5 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap
                            ${activeTab === 'tournaments' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-white hover:text-blue-400 hover:border-blue-500 hover:bg-blue-500/5'}`}
                        >
                            <Trophy size={16} /> Tournaments
                        </button>
                    </div>

                    {/* Content Area */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'list' && (
                            <motion.div
                                key="list-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="divide-y divide-slate-800"
                            >
                                {/* Filter Bar */}
                                <div className="table-controls px-6 py-4 flex flex-col md:flex-row gap-4 items-center bg-slate-900/40">
                                    <div className="search-wrap w-full md:w-auto flex-1">
                                        <Activity className="search-icon" size={16} />
                                        <input
                                            type="text"
                                            placeholder="SEARCH BY OPPONENT OR TOURNAMENT..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="search-bar w-full bg-slate-950/40 border-slate-800 text-white placeholder-slate-600 uppercase font-black text-[10px] tracking-widest ring-offset-slate-900 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>

                                    <div className="flex gap-2 w-full md:w-auto">
                                        <select
                                            value={tournamentFilter}
                                            onChange={e => setTournamentFilter(e.target.value)}
                                            className="filter-select bg-slate-950/40 border-slate-800 text-white"
                                            title="Filter by tournament"
                                        >
                                            <option value="All">All Tournaments</option>
                                            {tournaments?.map(t => (
                                                <option key={t.id} value={t.name}>{t.name}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={yearFilter}
                                            onChange={e => setYearFilter(e.target.value)}
                                            className="filter-select bg-slate-950/40 border-slate-800 text-white"
                                            title="Filter by year"
                                        >
                                            <option value="All">All Years</option>
                                            {availableYears?.map(year => (
                                                <option key={year} value={year.toString()}>{year}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={formatFilter}
                                            onChange={e => setFormatFilter(e.target.value as any)}
                                            title="Filter by match format"
                                            className="filter-select bg-slate-950/40 border-slate-800 text-white"
                                        >
                                            <option value="All">All Formats</option>
                                            <option value="T20">T20</option>
                                            <option value="One Day">One Day</option>
                                        </select>
                                    </div>
                                </div>

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
                                                        <th>Date & Time</th>
                                                        <th>Fixture</th>
                                                        <th>Ground</th>
                                                        <th>Format</th>
                                                        <th>Status</th>
                                                        {userRole === 'admin' && <th>Actions</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredMatches?.map(m => {
                                                        const opp = opponents.find(o => o.id === m.opponentId);
                                                        return (
                                                            <tr key={m.id} onClick={() => setSelectedCardMatch(m)}>
                                                                 <td>
                                                                    <div className="date-stack">
                                                                        <span className="date-main">{new Date(m.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                                        <span className="time-sub">{new Date(m.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="flex flex-col gap-1 py-1">
                                                                        <div className="team-cell">
                                                                            <img src="/INS%20LOGO.PNG" alt="INS" className="team-avatar" />
                                                                            <span>INDIAN STRIKERS</span>
                                                                            <span className="vs-cell">VS</span>
                                                                            {opp?.logoUrl ? <img src={opp.logoUrl} alt={opp?.name} className="team-avatar" /> : <div className="team-avatar-fallback text-slate-500">?</div>}
                                                                            <span className="uppercase">{(opp?.name || 'Unknown').toUpperCase()}</span>
                                                                        </div>
                                                                        <div className="match-meta-info pl-1.5 opacity-70">
                                                                            {m.tournament || 'Exhibition Match'}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="text-slate-500 text-xs font-bold uppercase">{grounds.find(g => g.id === m.groundId)?.name || 'TBD'}</td>
                                                                <td>
                                                                    <span className={`badge-type ${m.matchFormat === 'T20' ? 'badge-t20' : 'badge-odi'}`}>
                                                                        {(m.matchFormat || 'T20').toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`badge-type ${m.status === 'live' ? 'badge-status-live' : m.status === 'completed' ? 'badge-status-done' : 'badge-status-up'}`}>
                                                                            {(m.status || "Unknown").toUpperCase()}
                                                                        </span>
                                                                        {m.isLocked && (
                                                                            <span title="This scorecard is locked" onClick={(e) => e.stopPropagation()}>
                                                                                <LockIcon size={12} className="text-emerald-500" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                {userRole === 'admin' && (
                                                                    <td onClick={(e) => e.stopPropagation()}>
                                                                        <div className="flex items-center gap-2">
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); handleToggleLock(m.id, !!(m.isLocked || (m as any).is_locked)); }} 
                                                                                className={`p-1.5 transition-colors ${(m.isLocked || (m as any).is_locked) ? 'text-emerald-500 hover:text-emerald-400' : 'text-slate-500 hover:text-amber-500'}`} 
                                                                                title={(m.isLocked || (m as any).is_locked) ? "Unlock Match (Now Internal)" : "Lock Match (Finalize Stats)"}
                                                                            >
                                                                                {(m.isLocked || (m as any).is_locked) ? <LockIcon size={14} /> : <Unlock size={14} />}
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); setEditingMatch(m); }} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors" title="Edit Metadata"><Plus size={14} /></button>
                                                                            <button onClick={(e) => { e.stopPropagation(); if (window.confirm("Delete Match?")) deleteMatch(m.id); }} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="Delete Match"><Trash2 size={14} /></button>
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
                                </div>
                            </motion.div>
                        )}


                        {activeTab === 'standings' && (
                            <div className="px-6 pb-20 pt-4">
                                <PointsTable 
                                    userRole={userRole}
                                    currentUser={currentUser}
                                    tournaments={tournaments}
                                    opponents={opponents}
                                />
                            </div>
                        )}

                        {activeTab === 'tournaments' && (
                            <div className="px-6 pb-20 pt-4">
                                <TournamentsManager />
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* MODALS (Existing logic preserved) */}
            <AnimatePresence>
                {selectedCardMatch && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
                        onClick={() => setSelectedCardMatch(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <MatchCenterTile
                                match={selectedCardMatch}
                                homeTeamName="Indian Strikers"
                                homeTeamLogo={teamLogo || '/INS%20LOGO.PNG'}
                                opponent={opponents.find(o => o.id === selectedCardMatch.opponentId)}
                                onSelectPlayingXI={handleSelectPlayingXI}
                                onShareSummary={captureMatchSummary}
                                onEditMatch={setEditingMatch}
                                onStartScoring={handleStartScoring}
                                onViewScorecard={setViewScorecardMatch}
                                onUpdateManualScore={(id, mode) => setManualScoreConfig({ matchId: id, showPlayers: mode === 'full' })}
                                onDeleteMatch={deleteMatch}
                                userRole={userRole}
                                isAdmin={isAdmin}
                                canScore={currentUser?.canScore}
                                grounds={grounds}
                                onToggleLock={handleToggleLock}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Other Modals */}
            <AnimatePresence>
                {xiModalConfig.isOpen && (
                    <PlayingXIModal
                        onClose={() => setXiModalConfig(prev => ({ ...prev, isOpen: false }))}
                        matchId={xiModalConfig.matchId}
                        teamType={xiModalConfig.teamType as any}
                        homePlayers={players}
                        opponentTeams={opponents}
                        onSave={handleSaveXI}
                        onShare={(id) => handleSelectPlayingXI(id, 'view')}
                        initialSelection={xiModalConfig.teamType === 'home' ? matches.find(m => m.id === xiModalConfig.matchId)?.homeTeamXI || [] : matches.find(m => m.id === xiModalConfig.matchId)?.opponentTeamXI || []}
                        opponentId={xiModalConfig.opponentId}
                        onQuickAddPlayer={handleQuickAddOpponentPlayer}
                    />
                )}
            </AnimatePresence>

            {editingMatch && (
                <EditMatchModal
                    isOpen={!!editingMatch}
                    onClose={() => setEditingMatch(null)}
                    match={editingMatch}
                    onSave={handleSaveMatch}
                    allOpponents={opponents}
                />
            )}

            {showAddModal && (
                <AddMatchModal
                    onClose={() => setShowAddModal(false)}
                    opponents={opponents}
                />
            )}

            {manualScoreConfig && !manualScoreConfig.showPlayers && (
                <MatchSummaryModal
                    onClose={() => setManualScoreConfig(null)}
                    match={matches.find(m => m.id === manualScoreConfig.matchId)!}
                    opponentName={opponents.find(o => o.id === (matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId))?.name || 'Opponent'}
                    onSave={handleSummaryUpdate}
                />
            )}

            {manualScoreConfig && manualScoreConfig.showPlayers && (
                <ManualScoreModal
                    onClose={() => setManualScoreConfig(null)}
                    match={matches.find(m => m.id === manualScoreConfig.matchId)!}
                    onSubmit={(data) => handleManualScoreSubmit(data)}
                    opponent={opponents.find(o => o.id === (matches.find(m => m.id === manualScoreConfig.matchId)?.opponentId))}
                    players={players}
                />
            )}

            {viewScorecardMatch && (() => {
                const resolvedOpponent = opponents.find(o => o.id === viewScorecardMatch.opponentId);
                return (
                    <FullScorecardModal
                        match={viewScorecardMatch}
                        onClose={() => setViewScorecardMatch(null)}
                        homeSquad={players}
                        opponentSquad={resolvedOpponent?.players || []}
                        opponentName={viewScorecardMatch.opponentName || resolvedOpponent?.name || 'Opponent'}
                        homeTeamLogo={teamLogo}
                        opponentLogo={viewScorecardMatch.opponentLogo || resolvedOpponent?.logoUrl}
                        onSave={(finalData) => {
                            updateMatch(viewScorecardMatch.id, finalData);
                            setViewScorecardMatch(null);
                        }}
                    />
                );
            })()}

            {summaryPreviewUrl && (
                <div className="fixed inset-0 z-[10001] bg-slate-950/90 flex items-center justify-center p-4 backdrop-blur-xl transition-all">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl"
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-white font-black uppercase tracking-tighter">Match Summary Preview</h3>
                            <button title="Close Preview" onClick={() => setSummaryPreviewUrl(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 bg-slate-950/50 flex justify-center overflow-y-auto max-h-[70vh]">
                            <img src={summaryPreviewUrl} alt="Match Summary" className="rounded-xl shadow-2xl border border-white/10 max-w-full h-auto" />
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setSummaryPreviewUrl(null)}
                                className="py-4 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                            >
                                Close
                            </button>
                            <button 
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.download = `Match_Summary.png`;
                                    link.href = summaryPreviewUrl;
                                    link.click();
                                }}
                                className="py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                            >
                                <Download size={18} /> Download
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Sync Success Toast */}
            {showSyncSuccess && (
                <div className="success-toast">
                    <CheckCircle2 size={20} />
                    <span>DATABASE SYNC SUCCESSFUL</span>
                </div>
            )}

            {/* Hidden Graphic Generator */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                {xiModalConfig.matchId && (
                   <div id="team-sheet-graphic" style={{ width: '1080px', height: '1920px' }}>
                       <LineupGraphic 
                         match={matches.find(m => m.id === xiModalConfig.matchId)!}
                         opponents={opponents}
                         players={players}
                         grounds={grounds}
                       />
                   </div>
                )}

                {summaryMatchId && (
                    <div id="match-summary-graphic" style={{ width: '450px', background: '#020617' }}>
                        <MatchCenterTile 
                            match={matches.find(m => m.id === summaryMatchId)!}
                            homeTeamName="Indian Strikers"
                            homeTeamLogo={teamLogo || '/INS%20LOGO.PNG'}
                            opponent={opponents.find(o => o.id === matches.find(m => m.id === summaryMatchId)?.opponentId)}
                            isGraphic={true}
                            grounds={grounds}
                            userRole={userRole}
                            isAdmin={isAdmin}
                            onSelectPlayingXI={() => {}}
                            onEditMatch={() => {}}
                            onStartScoring={() => {}}
                            onViewScorecard={() => {}}
                            onUpdateManualScore={() => {}}
                            onDeleteMatch={() => {}}
                        />
                    </div>
                )}
            </div>

            {isGenerating && (
                <div className="fixed inset-0 z-[10000] bg-slate-950/90 flex flex-col items-center justify-center gap-6 backdrop-blur-xl">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.5)]"
                    >
                        <Shield size={48} className="text-white" />
                    </motion.div>
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">GENERATING ASSET</h2>
                        <div className="flex items-center justify-center gap-2">
                            <RefreshCw size={16} className="text-blue-500 animate-spin" />
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-none">Finalizing Team Sheet Data...</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MatchCenter;
