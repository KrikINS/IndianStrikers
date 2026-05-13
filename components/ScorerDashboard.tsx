import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Settings,
  Shield,
  X,
  ChevronRight,
  LayoutList,
  Zap,
  RotateCcw,
  CloudLightning,
  CloudOff,
  AlertTriangle,
} from 'lucide-react';
import MatchSummaryModal from './MatchSummaryModal';
import { useStore } from '../store/StoreProvider';
import { useMatchCenter } from '../store/matchStore';
import { useTournamentStore } from '../store/tournamentStore';
import { useOpponentStore } from '../store/opponentStore';
import { useNavigate, useParams } from 'react-router-dom';
import { UniversalScorecard } from './UniversalScorecard';
import _ from 'lodash';
import { MilestoneOverlay, MilestoneOverlayRef } from './MilestoneOverlay';
import { Player, ScheduledMatch, Ball, CommentaryTemplate, CommentaryEventType, MatchStatus, MatchSetupData } from '../types';
import { toast } from 'react-hot-toast';
import { toPng, toBlob } from 'html-to-image';
import { useCommentaryStore } from '../store/commentaryStore';
import { SyncStatus } from './common/SyncStatus';
import { MatchSetupModal } from './MatchSetupModal';
import { WagonWheelModal } from './WagonWheelModal';
import { MatchModals } from './Scorer/MatchModals';
import { SettingsDrawer } from './Scorer/SettingsDrawer';
import { AnalyticsDrawer } from './Scorer/AnalyticsDrawer';
import { InningsBreakScreen } from './Scorer/InningsBreakScreen';
import { MatchCompletionFlow } from './Scorer/MatchCompletionFlow';
import { ScorerHeader } from './Scorer/ScorerHeader';
import { ScoringControls } from './Scorer/ScoringControls';
import { ScoreSectionPanel } from './Scorer/ScoreSection';
import {
  DashboardContainer, Header, SyncStatusPill, ModalOverlay, ModalContent, PremiumModalOverlay,
  PremiumModalContent, SelectionGrid, LandscapeLockOverlay, AnalyticsHandleContainer, FloatingAnalyticsButton
} from './Scorer/ScorerStyles';
import { generateDynamicCommentary } from './Scorer/scorerUtils';

const ScorerDashboard: React.FC<{ matchId?: string, teamLogo?: string }> = ({ matchId: propMatchId, teamLogo }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Unified State & Actions using Selectors for maximum stability
  const squadPlayers = useMatchCenter(state => state.squadPlayers);
  const fetchPlayers = useMatchCenter(state => state.fetchPlayers);
  const isPlayersLoading = useMatchCenter(state => state.loading);

  // Scorer State Selectors (Breaking the dependency on the whole store object)
  const innings1 = useMatchCenter(state => state.innings1);
  const innings2 = useMatchCenter(state => state.innings2);
  const toss = useMatchCenter(state => state.toss);
  const team1XI = useMatchCenter(state => state.team1XI);
  const team2XI = useMatchCenter(state => state.team2XI);
  const matchId = useMatchCenter(state => state.matchId);
  const isWaitingForBowler = useMatchCenter(state => state.isWaitingForBowler);

  // Scorer Actions
  const store = useMatchCenter(); // Temporarily keeping for deep nested logic, but usage is now more stable
  const isOfflineStore = useTournamentStore(state => state.isOffline);
  const { squadPlayers: players } = useStore();
  const [tempMaxOvers, setTempMaxOvers] = useState<number>(20);

  const resolveGroundName = (gid: string | undefined, gname: string | undefined) => {
    if (gid && gid !== 'null' && gid !== 'default') {
      const g = grounds?.find((gr: any) => String(gr.id) === String(gid));
      if (g) return g.name;
    }
    return gname || 'Unknown Ground';
  };

  // Master Data
  const grounds = useTournamentStore(state => state.grounds);
  const tournaments = useTournamentStore(state => state.tournaments);
  const syncMasterData = useTournamentStore(state => state.syncMasterData);
  const allOpponents = useOpponentStore(state => state.opponents);
  const updateMatch = useMatchCenter(state => state.updateMatch);
  const updateMatchStatus = useMatchCenter(state => state.updateMatchStatus);

  const [extraSubType, setExtraSubType] = useState<'bat' | 'bye' | 'lb' | 'keeper'>('bat');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const { matchId: storeMatchId } = store;
  const [showLineups, setShowLineups] = useState(false);
  const [showNBModal, setShowNBModal] = useState(false);
  const [showRunOutModal, setShowRunOutModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [showBatterSelectModal, setShowBatterSelectModal] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [showFielderModal, setShowFielderModal] = useState(false);
  const [pendingFielderId, setPendingFielderId] = useState<string | null>(null);
  const [pendingWicketType, setPendingWicketType] = useState<any>(null);
  const [extraType, setExtraType] = useState<'wd' | 'nb' | 'byes' | 'lb'>('nb');
  const [nbSubType, setNbSubType] = useState<'bat' | 'bye' | 'lb'>('bat');
  const [runOutInvolved, setRunOutInvolved] = useState<{ victimId: string, runs: number, ballType?: any, subType?: any } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [isOverComplete, setIsOverComplete] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const milestoneRef = useRef<MilestoneOverlayRef>(null);
  const [showWagonWheelModal, setShowWagonWheelModal] = useState<any>(null);
  const [scorecardTab, setScorecardTab] = useState<'scorecard' | 'commentary'>('scorecard');
  const [showInningsReview, setShowInningsReview] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showQuickScoreModal, setShowQuickScoreModal] = useState(false);
  const [quickRuns, setQuickRuns] = useState(0);
  const [quickWickets, setQuickWickets] = useState(0);
  const [quickOvers, setQuickOvers] = useState(0);
  const [showAnalyticsDrawer, setShowAnalyticsDrawer] = useState(false);
  const [activeChart, setActiveChart] = useState<'manhattan' | 'worm'>('manhattan');
  const [isFinalizingInnings, setIsFinalizingInnings] = useState(false);
  const [showMatchSummaryModal, setShowMatchSummaryModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncTimedOut, setSyncTimedOut] = useState(false);
  const lastSplashRef = useRef<string | null>(null);
  const [commentaryTemplates, setCommentaryTemplates] = useState<CommentaryTemplate[]>([]);
  const [nextCommentarySuggestions, setNextCommentarySuggestions] = useState<Record<CommentaryEventType, string[]>>({
    FOUR: [], SIX: [], WICKET: [], DOT: [], SINGLE: [], DOUBLE: [], TRIPLE: [], MILESTONE: []
  });
  const [currentPreviews, setCurrentPreviews] = useState<Record<CommentaryEventType, string>>({
    FOUR: '', SIX: '', WICKET: '', DOT: '', SINGLE: '', DOUBLE: '', TRIPLE: '', MILESTONE: ''
  });

  // Opponent players fetched separately from the opponents table
  const [opponentPlayers, setOpponentPlayers] = useState<{ id: string; name: string; role?: string }[]>([]);

  // Helper: resolve player name from either squad
  const getPlayerName = (id: any): string => {
    if (!id) return '—';
    // Robust check for object-based IDs or legacy participation
    const searchId = (typeof id === 'object' && id !== null) ? (id.id || id.name || String(id)) : String(id);
    if (searchId === '[object Object]') return 'Unknown Player';

    const homePlayer = players.find((p: Player) => String(p.id) === searchId);
    if (homePlayer) return homePlayer.name;
    const awayPlayer = opponentPlayers.find(p => String(p.id) === searchId);
    if (awayPlayer) return awayPlayer.name;
    // team2XI may store names directly for opponent teams without registered IDs
    return searchId;
  };

  const getPlayerAvatar = (id: string | null): string | null => {
    if (!id) return null;
    const player = players.find((p: Player) => p.id === id);
    return player?.avatarUrl || null;
  };

  useEffect(() => {
    // Master data is now automatically synced by the stores, 
    // we don't need to manually fetch opponents into a local state here.
    useCommentaryStore.getState().fetchTemplates();
  }, []);

  useEffect(() => {
    if (store.maxOvers) {
      setTempMaxOvers(store.maxOvers);
    }
  }, [store.maxOvers]);

  // Fetch Commentary Templates and prime the previews
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/commentary/templates`);
        if (!res.ok) return;
        const data: CommentaryTemplate[] = await res.json();
        setCommentaryTemplates(data);

        // Group by type for fast lookup
        const grouped: Record<CommentaryEventType, string[]> = {
          FOUR: [], SIX: [], WICKET: [], DOT: [], SINGLE: [], DOUBLE: [], TRIPLE: [], MILESTONE: []
        };
        data.forEach(t => {
          if (grouped[t.eventType]) grouped[t.eventType].push(t.text);
        });
        setNextCommentarySuggestions(grouped);

        // Prime initial random selections
        const initialPreviews: Record<CommentaryEventType, string> = {
          FOUR: '', SIX: '', WICKET: '', DOT: '', SINGLE: '', DOUBLE: '', TRIPLE: '', MILESTONE: ''
        };
        (Object.keys(grouped) as CommentaryEventType[]).forEach(type => {
          const list = grouped[type];
          if (list.length > 0) {
            initialPreviews[type] = list[Math.floor(Math.random() * list.length)];
          }
        });
        setCurrentPreviews(initialPreviews);
      } catch (err) {
        console.error("Failed to load commentary templates:", err);
      }
    };
    fetchTemplates();
  }, []);

  const shufflePreview = (type: CommentaryEventType) => {
    const list = nextCommentarySuggestions[type];
    if (list && list.length > 0) {
      const randomText = list[Math.floor(Math.random() * list.length)];
      setCurrentPreviews(prev => ({ ...prev, [type]: randomText }));
    }
  };
  // Load Wagon Wheel Preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ins-wagon-wheel-enabled');
    if (saved !== null) {
      store.updateMatchSettings({ useWagonWheel: saved === 'true' });
    }
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<number>(0);

  // Escape hatch: if no innings for >4s, reveal action buttons instead of infinite spinner.
  // MUST be here (before any early returns) to satisfy React Rules of Hooks.
  // IMPORTANT: Do NOT reference `currentInnings` here — it is declared at line ~1521 (TDZ crash).
  // Use store.innings1 + store.currentInnings (available via selectors) instead.
  const _hasInnings = store.currentInnings === 1 ? !!store.innings1 : !!store.innings2;
  useEffect(() => {
    if (_hasInnings) { setSyncTimedOut(false); return; }
    const t = setTimeout(() => setSyncTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, [_hasInnings]);

  // Ref to hold the latest cloud liveData WITHOUT adding it as a useCallback dependency.
  // This breaks the: sync → cloud update → matchMeta change → syncToDatabase recreated → sync cycle.
  const cloudLiveDataRef = useRef<any>(null);

  // One-shot guard: prevent re-fetching players every time squadPlayers becomes empty.
  const hasFetchedPlayersRef = useRef(false);

  // One-shot rehydration guard: Ensure we only pull from cloud once on mount
  const hasInitialRehydrated = useRef(false);

  // Transition guard: prevents the innings-finish useEffect from re-triggering
  // the review modal immediately after the user confirms innings 1 and we close it.
  const isTransitioningToSecondInnings = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Auto-trigger bowler selection modal at end of over
  useEffect(() => {
    // INNINGS-BREAK GUARD: Never show the bowler modal during an innings break or when
    // the setup modal is active. Both states manage their own bowler selection flow.
    const isBreak = store.currentInnings === 1 && !store.innings2 && (store.innings1?.totalBalls || 0) >= (store.maxOvers || 20) * 6;
    if (isWaitingForBowler && !showBowlerModal && !showInningsReview && !showMatchSummaryModal && !showSetupModal && !isBreak) {
      const timer = setTimeout(() => {
        setShowBowlerModal(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isWaitingForBowler, showInningsReview, showMatchSummaryModal, showBowlerModal, showSetupModal, store.currentInnings, store.innings2, store.innings1?.totalBalls]);


  // Get metadata from MatchCenterStore
  const matches = useMatchCenter(state => state.matches);
  const syncWithCloud = useMatchCenter(state => state.syncWithCloud);
  const finalizeMatch = useMatchCenter(state => state.finalizeMatch);

  const activeMatchId = id || propMatchId || matchId;

  const resolveTournament = (tid: string | undefined, tname: string | undefined) => {
    const fromMaster = (tournaments || []).find((t: any) => tid && String(t.id) === String(tid))?.name;
    return fromMaster || tname || 'EXHIBITION MATCH';
  };

  useEffect(() => {
    // Only reset if we are switching to a DIFFERENT match that isn't already the active one
    // Ensure both are compared as strings to avoid object-mismatch wipes
    if (activeMatchId && String(activeMatchId) !== String(matchId)) {
      console.log(`[Scorer] Different match detected (${activeMatchId} vs ${matchId}). Preparing fresh session...`);
      // Reset the one-shot player-fetch guard when the match changes.
      hasFetchedPlayersRef.current = false;
    }

    if (syncWithCloud) {
      syncWithCloud().catch(console.error);
    }
    if (syncMasterData) {
      syncMasterData().catch(console.error);
    }
    // CRITICAL: Ensure players are loaded for squad selection.
    // Use a one-shot ref guard instead of watching squadPlayers.length,
    // which caused an infinite loop when the squad was empty.
    if (fetchPlayers && !isPlayersLoading && !hasFetchedPlayersRef.current) {
      hasFetchedPlayersRef.current = true;
      console.log("[Scorer] One-shot: Fetching squad players...");
      fetchPlayers().catch(console.error);
    }
  }, [activeMatchId]); // Only re-run when the active match ID changes

  const matchMeta = (matches || []).find(m => m.id === activeMatchId);
  const venueName = typeof matchMeta?.venue === 'object' ? (matchMeta.venue as any)?.name : (matchMeta?.venue || 'LOCAL GROUND');

  // V2.6.7-Payload-Optimized: DATA TRANSFORMATION FOR ANALYTICS
  const manhattanData = useMemo(() => {
    const overStats: Record<number, { over: number, runs1: number, wickets1: number, runs2: number, wickets2: number }> = {};
    const maxOvers = store.maxOvers || 20;

    // Pre-populate with all overs to ensure consistent chart width
    for (let i = 1; i <= maxOvers; i++) {
      overStats[i] = { over: i, runs1: 0, wickets1: 0, runs2: 0, wickets2: 0 };
    }

    const processHistory = (history: any[], innNum: 1 | 2) => {
      (history || []).forEach((ball: any) => {
        if (!ball) return;
        const overNum = ((ball.overNumber ?? ball.over_number ?? 0) as number) + 1;
        if (overStats[overNum]) {
          const bRuns = Number(ball.runs || 0) + Number(ball.extraRuns || 0);
          if (innNum === 1) {
            overStats[overNum].runs1 += bRuns;
            if (ball.isWicket) overStats[overNum].wickets1 += 1;
          } else {
            overStats[overNum].runs2 += bRuns;
            if (ball.isWicket) overStats[overNum].wickets2 += 1;
          }
        }
      });
    };

    processHistory(store.innings1?.history || [], 1);
    processHistory(store.innings2?.history || [], 2);

    return Object.values(overStats).sort((a, b) => a.over - b.over);
  }, [store.innings1?.history?.length, store.innings2?.history?.length, store.maxOvers]);

  const analyticsWormData = useMemo(() => {
    const transformHistory = (history: any[]) => {
      let cumulative = 0;
      return (history || []).map((ball: any, idx: number) => {
        cumulative += (ball.runs || 0) + (ball.extraRuns || 0);
        return {
          ballIndex: idx + 1,
          over: ball.overNumber + (ball.ballNumber / 6),
          runs: cumulative,
          isWicket: ball.isWicket,
          outPlayer: ball.isWicket ? (ball.strikerId || 'Batsman') : null
        };
      });
    };

    const inn1Worm = transformHistory(store.innings1?.history || []);
    const inn2Worm = transformHistory(store.innings2?.history || []);

    return {
      innings1: inn1Worm,
      innings2: inn2Worm
    };
  }, [store.innings1, store.innings2]);

  // Helper for names in chart tooltips
  const getPlayerNameForChart = (id: string) => {
    if (!id) return 'Batsman';
    const p = squadPlayers?.find(p => p.id === id);
    if (p) return p.name;
    for (const opp of (allOpponents || [])) {
      const op = opp.players?.find((op: any) => op.id === id);
      if (op) return op.name;
    }
    return 'Batsman';
  };


  // Sync with URL ID: Initialize match data into store when navigating from a match card
  useEffect(() => {
    if (!activeMatchId) return;

    const initFromMeta = (meta: any) => {
      if (!meta) return;

      const isActuallyLive = meta.status === 'live';
      console.log(`[Scorer] Sync Check: Cloud Total Balls: ${(meta.liveData?.innings1?.totalBalls || 0) + (meta.liveData?.innings2?.totalBalls || 0)} | Local Total Balls: ${(store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0)}`);

      // PERMANENT V5 ABSOLUTE RESOLUTION: Use the Failsafe Helpers
      const resolvedTournament = resolveTournament(meta.tournamentId, meta.tournament);
      const resolvedGroundName = resolveGroundName(meta.groundId, meta.venue);

      const opponentMeta = (allOpponents || []).find((o: any) => String(o.id) === String(meta.team2Id));
      const resolvedTeam2Name = opponentMeta?.name || meta.team2Name || 'OPPONENT';
      const resolvedTeam2Logo = meta.team2Logo || opponentMeta?.logoUrl || '';

      store.initializeMatch({
        matchId: meta.id,
        matchType: meta.matchFormat || 'T20',
        tournament: resolvedTournament,
        ground: resolvedGroundName,
        team2Name: resolvedTeam2Name,
        maxOvers: meta.maxOvers || 20,
        team1XI: meta.team1XI || [],
        team2XI: meta.team2XI || [],
        team1Logo: meta.team1Logo || teamLogo || '/INS%20LOGO.PNG',
        team2Logo: resolvedTeam2Logo,
        liveData: meta.liveData
      });
    };

    // ALWAYS Deep Fetch on mount/activeMatchId change to ensure we have the liveData blob
    // list endpoints (/matches) often omit the heavy liveData field.
    console.log(`[Scorer] Deep Fetching match ${activeMatchId} for Cloud Truth...`);
    import('../services/storageService').then(({ getMatch }) => {
      getMatch(activeMatchId).then(freshMeta => {
        if (freshMeta) {
          initFromMeta(freshMeta);
        }
      }).catch(console.error);
    });
  }, [activeMatchId, grounds, teamLogo]);

  // Trigger Milestone Splash Screen based on store events
  useEffect(() => {
    if (store.pendingMilestone && milestoneRef.current) {
      const { type, player, subText } = store.pendingMilestone;

      // STRICT FIX: Only trigger milestone celebrations for home team (Indian Strikers) players.
      // We check if the player involved is part of the players store and marked as a club player.
      const isClubPlayer = players.some((p: Player) => p.name === player && !!p.isClubPlayer);

      // Partnerships are allowed if at least one striker is a club member (usually true for home team matches)
      const shouldTrigger = type === 'partnership' || isClubPlayer;

      if (shouldTrigger) {
        milestoneRef.current.trigger({
          type: type === 'hundred' ? 'HUNDRED' : (type === 'partnership' ? 'PARTNERSHIP' : 'FIFTY'),
          playerName: player,
          subText: subText
        });
      }
      // Note: pendingMilestone is reset by the store on the next ball and cleared on UNDO.
    }
  }, [store.pendingMilestone, players]);

  // Sync setupStep when store state changes (Rehydration check)
  useEffect(() => {
    // Rehydration handled by MatchSetupModal visibility logic
  }, []);

  // --- RESUME LOGIC (Device B): Match is live in DB but local store is empty or behind ---
  useEffect(() => {
    if (activeMatchId === store.matchId && matchMeta?.status === 'live' && matchMeta?.liveData) {
      if (hasInitialRehydrated.current) return;

      const ld = matchMeta.liveData as any;
      const localIsEmpty = !store.innings1;

      if (!localIsEmpty) return; // If local state exists, we assume master role immediately

      if (ld && ld.innings1) {
        console.log("[Scorer] Sync-on-Mount Rehydration: Loading initial state from Cloud...");
        hasInitialRehydrated.current = true;

        // PERMANENT RESOLUTION LAW: Resolve IDs to Names/Logos from master data
        const groundMeta = grounds.find(g => g.id === matchMeta.groundId);
        const opponentMeta = allOpponents.find((o: any) => o.id === matchMeta.team2Id || o.name === matchMeta.team2Name);

        const resolvedGroundName = groundMeta?.name || (typeof matchMeta.venue === 'object' ? (matchMeta.venue as any)?.name : matchMeta.venue) || 'Local Ground';
        const resolvedTeam2Name = opponentMeta?.name || matchMeta.team2Name || 'OPPONENT';
        const resolvedTeam2Logo = matchMeta.team2Logo || opponentMeta?.logoUrl || '';

        store.initializeMatch({
          matchId: matchMeta.id,
          matchType: matchMeta.matchFormat || 'T20',
          tournament: matchMeta.tournament || 'Live Match',
          ground: resolvedGroundName,
          team2Name: resolvedTeam2Name,
          maxOvers: matchMeta.maxOvers || ld.maxOvers || 20,
          team1XI: matchMeta.team1XI || [],
          team2XI: matchMeta.team2XI || [],
          team1Logo: matchMeta.team1Logo || teamLogo || '/INS%20LOGO.PNG',
          team2Logo: resolvedTeam2Logo,
          liveData: ld
        });
      }
    }
    // Handover dependency: reactive to match ID changes
    // Removed ball counts to prevent rehydration wipes when cloud returns partial/empty payload
  }, [
    store.matchId,
    matchMeta?.id,
    matchMeta?.status
  ]);

  // Real-Time Polling: Check for cloud updates every 30 seconds for seamless handover
  useEffect(() => {
    if (!activeMatchId) return;
    const interval = setInterval(() => {
      console.log("[Sync] Periodic cloud poll triggered...");
      syncWithCloud().catch(console.error);
    }, 30000);
    return () => clearInterval(interval);
  }, [activeMatchId, syncWithCloud]);

  // Keep the cloud liveData in a ref so syncToDatabase doesn't need it as a dep.
  // Without this, every cloud write updated matchMeta.liveData → recreated the
  // syncToDatabase callback → triggered the sync effect → called syncToDatabase again.
  useEffect(() => {
    cloudLiveDataRef.current = matchMeta?.liveData ?? null;
  }, [matchMeta?.liveData]);

  const syncToDatabase = useCallback(
    async (state: any) => {
      if (!activeMatchId) return;

      // LAST WRITE WINS: Local state always overwrites cloud state during live scoring.
      // This ensures the current device is the source of truth.

      try {
        setIsSyncing(true);
        // CRITICAL: Only sync the slimmed payload, not the full store object which contains lists of all players
        const payload = state.prepareSyncPayload ? state.prepareSyncPayload() : state;
        await updateMatch(activeMatchId, { liveData: payload, lastUpdated: new Date().toISOString() });
        setIsSyncing(false);
      } catch (err) {
        console.error("[Sync] Failed to update match:", err);
        setIsSyncing(false);
      }
    },
    [activeMatchId] // matchMeta?.liveData intentionally removed; read via ref instead
  );

  // Fetch opponent players when we know the opponent ID
  useEffect(() => {
    // Try opponentId first, then fall back to team2Id (some matches use team2Id directly)
    const opponentId = matchMeta?.opponentId || matchMeta?.team2Id;
    if (!opponentId) return;
    import('../services/storageService').then(({ getOpponents }) => {
      getOpponents().then(teams => {
        const team = teams.find(t => String(t.id) === String(opponentId));
        if (team && team.players && team.players.length > 0) {
          setOpponentPlayers(team.players.map(p => ({ id: p.id, name: p.name, role: p.role })));
        }
      }).catch(console.error);
    });
  }, [matchMeta?.opponentId, matchMeta?.team2Id]);

  const handleUpdateMatchStatus = async (status: MatchStatus) => {
    if (activeMatchId) {
      await updateMatchStatus(activeMatchId, status);
    }
  };

  const handleChangeScorer = async () => {
    if (!activeMatchId) return;

    const confirmMessage = "FORCE SAVE AND EXIT SCORING?\n\nThis will sync the latest state to the cloud and allow another scorer to take over. You will be redirected to the match list.";
    if (!window.confirm(confirmMessage)) return;

    setSyncStatus('loading');
    try {
      // 1. Force a final atomic sync and AWAIT the result
      // We send full liveData (store) and summarized liveState
      await updateMatch(activeMatchId, {
        liveData: {
          ...store,
          strikerId: store.strikerId,
          nonStrikerId: store.nonStrikerId,
          currentBowlerId: store.currentBowlerId,
          currentInnings: store.currentInnings,
        },
        liveState: {
          striker_id: store.strikerId,
          non_striker_id: store.nonStrikerId,
          bowler_id: store.currentBowlerId,
          current_innings: store.currentInnings,
        } as any,
        lastUpdated: new Date().toISOString(),
        status: 'live' // Ensure status is explicitly live
      });

      // 2. Clear match-specific local keys (prevents re-opening stale match)
      // Keep user logged in (sessionStorage)
      localStorage.removeItem('ins-cricket-scorer');
      localStorage.removeItem('active_match_id');

      // 3. Success Feedback
      setSyncStatus('idle');
      toast.success("Match synced. Safe to hand over!", {
        duration: 5000,
        icon: '🤝'
      });

      // 4. Clean exit
      navigate('/match-center');
    } catch (error) {
      console.error("Change Scorer sync failed:", error);
      setSyncStatus('error');
      toast.error("Sync Failed! Please check internet and try again.");
    } finally {
      setSyncStatus('idle');
    }
  };

  const currentInnings = store.currentInnings === 1 ? store.innings1 : store.innings2;

  // Auto-scroll timeline to the end when a new ball is added
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTo({
        left: timelineRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [currentInnings?.history?.length]);
  const isBattingFinishing = currentInnings && (
    currentInnings.isDeclared || 
    ((currentInnings.totalBalls || 0) > 0 && (
      currentInnings.wickets === 10 ||
      (currentInnings.totalBalls >= (store.maxOvers || 20) * 6) ||
      (store.currentInnings === 2 && currentInnings.totalRuns > (store.innings1?.totalRuns || 0))
    ))
  );
  const isMatchComplete = store.isFinished;
  const isInningsBreak = store.currentInnings === 1 && isBattingFinishing && !store.isFinished;


  // Trigger Review Modal when innings condition is met
  useEffect(() => {
    // V5 ROBUST GUARD: Only trigger review if we have actually recorded balls in the current innings
    // or if the innings has been explicitly declared/quick-finished.
    const hasMeaningfulInningsStarted = currentInnings && (
      currentInnings.totalBalls > 0 || 
      currentInnings.wickets > 0 || 
      currentInnings.isDeclared
    );

    // LOOP BREAKER: If we are in the middle of transitioning to 2nd innings, do NOT
    // re-trigger the review modal. The confirmation handler will manage the next step.
    if (isTransitioningToSecondInnings.current) return;
    
    if (hasMeaningfulInningsStarted && isBattingFinishing && !showInningsReview && !store.isFinished && !isFinalizingInnings) {
      console.log("[Scorer] Innings finish detected. Triggering review modal...");
      setShowInningsReview(true);
    }
  }, [isBattingFinishing, store.isFinished, isFinalizingInnings, showInningsReview, currentInnings?.totalBalls, currentInnings?.isDeclared]);

  // Trigger Bowler Selection at start of innings or if bowler missing
  React.useEffect(() => {
    if (currentInnings && !store.currentBowlerId && !showBowlerModal) {
      const totalBalls = currentInnings.totalBalls || 0;
      const maxBalls = (store.maxOvers || 20) * 6;
      // ZERO-BALL GUARD: Only trigger if balls have actually been bowled.
      // Without this, the bowler modal fires immediately at the start of innings 2
      // before the MatchSetupModal has a chance to collect the opening bowler.
      if (totalBalls > 0 && totalBalls < maxBalls) {
        setShowBowlerModal(true);
      }
    }
  }, [store.currentInnings, store.currentBowlerId, currentInnings, showBowlerModal]);

  // Nuclear trace detection for Sandbox matches
  useEffect(() => {
    if (activeMatchId && (String(activeMatchId).toLowerCase().includes('sandbox') || matchMeta?.team2Name === 'Sandbox XI' || matchMeta?.isTest)) {
      console.warn("[Scorer] Sandbox/Test match detected. Redirecting to safety.");
      navigate('/match-center');
    }
  }, [activeMatchId, matchMeta, navigate]);

  const partnershipData = useMemo(() => {
    const balls = currentInnings?.history || [];
    let pruns = 0;
    let plegalBalls = 0;
    let pextras = 0;

    let lastWicketIdx = -1;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i] as any;
      if (b.isWicket && !['Retired Hurt'].includes(b.wicketType || '')) {
        lastWicketIdx = i;
        break;
      }
    }

    const currentStandBalls = lastWicketIdx === -1 ? balls : balls.slice(lastWicketIdx + 1);

    const sId = store.strikerId;
    const nsId = store.nonStrikerId;
    let sPRuns = 0; let sPBalls = 0;
    let nsPRuns = 0; let nsPBalls = 0;

    currentStandBalls.forEach((b: any) => {
      pruns += b.runs;
      if (b.isLegal) plegalBalls++;

      if (b.type !== 'legal') {
        if (b.type === 'wide' || b.type === 'no-ball') {
          pruns += 1;
          pextras += 1 + b.runs;
        } else {
          pextras += b.runs;
        }
      }

      // Individual contributions in this stand
      if (b.strikerId === sId) {
        if (b.subType === 'bat') sPRuns += b.runs;
        if (b.isLegal) sPBalls++;
      } else if (b.strikerId === nsId) {
        if (b.strikerId === nsId) {
          if (b.subType === 'bat') nsPRuns += b.runs;
          if (b.isLegal) nsPBalls++;
        }
      }
    });

    return {
      totalRuns: pruns,
      totalBalls: plegalBalls,
      s: { name: getPlayerName(sId || null).split(' ')[0], runs: sPRuns, balls: sPBalls },
      ns: { name: getPlayerName(nsId || null).split(' ')[0], runs: nsPRuns, balls: nsPBalls },
      extras: pextras
    };
  }, [currentInnings?.history, store.strikerId, store.nonStrikerId]);

  const lastWicketData = useMemo(() => {
    const balls = currentInnings?.history || [];
    let lastBall = null;
    let totalRunsAtW = 0;
    let wicketsAtW = 0;

    let cRuns = 0;
    let cWickets = 0;

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i] as any;
      cRuns += b.runs + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0);
      if (b.isWicket && !['Retired Hurt'].includes(b.wicketType || '')) {
        cWickets++;
        lastBall = b;
        totalRunsAtW = cRuns;
        wicketsAtW = cWickets;
      }
    }

    if (!lastBall) return null;
    const victimId = lastBall.outPlayerId || lastBall.strikerId;
    const victimName = getPlayerName(victimId).split(' ')[0];
    const bStat = currentInnings?.battingStats[victimId];

    return {
      name: victimName,
      runs: bStat?.runs || 0,
      balls: bStat?.balls || 0,
      score: `${totalRunsAtW}/${wicketsAtW}`
    };
  }, [currentInnings?.history, currentInnings?.battingStats]);

  // INITIAL STATE: If no ID is provided, show upcoming matches list
  if (!activeMatchId) {
    const upcoming = (matches || []).filter(m => m.status !== 'completed');
    return (
      <DashboardContainer>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button title="Back" onClick={() => navigate('/match-center')} className="p-2 hover:bg-slate-100/10 rounded-xl transition-all text-white"><ChevronLeft /></button>
            <span style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '1px' }}>STRIKERS PULSE</span>
          </div>
          <button
            title="Global Settings"
            onClick={() => setShowSettingsDrawer(true)}
            className="p-2 hover:bg-slate-100/10 rounded-full transition-all text-white"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={20} />
          </button>
        </Header>
        <div style={{ padding: '24px 16px', maxWidth: 500, margin: '0 auto', width: '100%' }}>
          {/* SYNC STATUS BANNER */}
          {(() => {
            const localBalls = (store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0);
            const cloudBalls = (matchMeta?.liveData?.innings1?.totalBalls || 0) + (matchMeta?.liveData?.innings2?.totalBalls || 0);
            if (cloudBalls > localBalls) {
              return (
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  style={{ background: 'rgba(250, 176, 5, 0.1)', border: '1px solid rgba(250, 176, 5, 0.3)', padding: '12px 16px', borderRadius: 12, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FAB005', fontWeight: 900, fontSize: '0.75rem' }}>
                    <CloudLightning size={16} /> CLOUD SCORE IS AHEAD
                  </div>
                  <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.7, color: '#001F3F', fontWeight: 600 }}>
                    The cloud has {cloudBalls} balls compared to {localBalls} locally. Your mobile might be ahead.
                  </p>
                  <button
                    onClick={() => {
                      if (matchMeta?.liveData) {
                        store.initializeMatch({
                          matchId: matchMeta.id,
                          matchType: matchMeta.matchFormat || 'T20',
                          tournament: matchMeta.tournament || 'Live Match',
                          ground: matchMeta.venue || 'Local Ground',
                          team2Name: matchMeta.team2Name || 'OPPONENT',
                          maxOvers: matchMeta.maxOvers || 20,
                          team1XI: matchMeta.team1XI || [],
                          team2XI: matchMeta.team2XI || [],
                          team1Logo: teamLogo,
                          team2Logo: matchMeta.team2Logo || '',
                          liveData: matchMeta.liveData
                        });
                        toast.success("Synchronized with Cloud!");
                      }
                    }}
                    style={{ background: '#FAB005', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#000', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer', width: 'fit-content' }}
                  >
                    DOWNLOAD CLOUD VERSION
                  </button>
                </motion.div>
              );
            }
            return null;
          })()}

          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <Zap size={32} color="#FAB005" style={{ marginBottom: 12 }} />
            <h2 style={{ fontWeight: 900, color: '#001F3F', margin: '0 0 8px 0' }}>SCORER DASHBOARD</h2>
            <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Select an active or upcoming match to start recording balls.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#FAB005', letterSpacing: '1px', marginBottom: 4 }}>AVAILABLE MATCHES</div>
            {upcoming.map(m => (
              <motion.div
                key={m.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/scorer/${m.id}`)}
                style={{
                  background: 'white', padding: '16px 20px', borderRadius: 16,
                  border: '1px solid #E9ECEF', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.team1Logo || m.homeLogo ? (
                        <img src={m.team1Logo || m.homeLogo} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="T1" />
                      ) : <Shield size={16} color="#001F3F" opacity={0.3} />}
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#001F3F' }}>{m.team1Name || 'INS'}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, opacity: 0.2 }}>VS</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#001F3F' }}>{m.team2Name || 'OPP'}</span>
                      {m.team2Logo || m.opponentLogo ? (
                        <img src={m.team2Logo || m.opponentLogo} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="T2" />
                      ) : <Shield size={16} color="#001F3F" opacity={0.3} />}
                    </div>
                    {m.status === 'live' && (
                      <span style={{ background: '#FF4B2B', color: 'white', fontSize: '8px', fontWeight: 900, padding: '2px 6px', borderRadius: 4, marginLeft: 'auto' }}>LIVE</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 600, paddingLeft: 4 }}>
                    {m.tournament || 'EXHIBITION MATCH'} • {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <ChevronRight size={20} color="#FAB005" />
              </motion.div>
            ))}
            {upcoming.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8F9FA', borderRadius: 16, border: '1px dashed #DEE2E6' }}>
                <LayoutList size={24} color="#ADB5BD" style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#ADB5BD', fontWeight: 600 }}>No upcoming matches scheduled.</p>
                <button
                  onClick={() => navigate('/match-center')}
                  style={{ background: 'none', border: 'none', color: '#339AF0', fontSize: '0.8rem', fontWeight: 700, marginTop: 12, cursor: 'pointer' }}
                >
                  Schedule in Match Center
                </button>
              </div>
            )}
          </div>
        </div>

        <SyncStatusPill $outOfSync={((store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0)) !== ((matchMeta?.liveData?.innings1?.totalBalls || 0) + (matchMeta?.liveData?.innings2?.totalBalls || 0))}>
          {((store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0)) === ((matchMeta?.liveData?.innings1?.totalBalls || 0) + (matchMeta?.liveData?.innings2?.totalBalls || 0)) ? (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
          ) : (
            <CloudLightning size={10} />
          )}
          L:{(store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0)} | C:{(matchMeta?.liveData?.innings1?.totalBalls || 0) + (matchMeta?.liveData?.innings2?.totalBalls || 0)}
        </SyncStatusPill>
      </DashboardContainer>
    );
  }

  const handleRecord = (score: number, type: any = 'legal', isWicket: boolean = false, wicketType?: any, subType: any = 'bat', outPlayerId?: string, newBatterId?: string, zone?: string, commentary?: string) => {
    if (isOverComplete && store.isWaitingForBowler) {
      console.warn("Over complete. Selection required.");
      toast.error("Finish over selection first", { id: 'bowler-lock' });
      return;
    }

    const innings = store.currentInnings === 1 ? store.innings1 : store.innings2;
    if (!innings) return;
    const isTest = matchMeta?.isTest ?? false;
    const isLegal = type !== 'wide' && type !== 'no-ball';

    const currentStrikerId = store.strikerId;
    const currentNonStrikerId = store.nonStrikerId;
    const currentBowlerId = store.currentBowlerId;

    store.recordBall({ runs: score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, zone, commentary });

    const syncBallToCloud = async (retryCount = 0) => {
      if (!activeMatchId || isTest) return;

      const baseUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api');
      // Mirror storageService.ts getHeaders(): sessionStorage first, localStorage fallback
      // Prevents silent 401s for returning users whose token persists in localStorage only
      const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const authHeaders = { 'Content-Type': 'application/json', 'Authorization': authToken ? `Bearer ${authToken}` : '' };
      const payload: any = {
        match_id: activeMatchId,
        striker_id: currentStrikerId,
        non_striker_id: currentNonStrikerId,
        bowler_id: currentBowlerId,
        over_number: Math.floor(innings.totalBalls / 6),
        ball_number: ((innings.totalBalls - (isLegal ? 1 : 0)) % 6) + 1,
        is_legal_ball: isLegal,
        shot_zone: zone,
        wagonWheelZone: zone,
        runs_scored: score,
        extras_runs: type === 'wide' || type === 'no-ball' ? 1 : 0,
        extras_type: type === 'legal' ? null : type,
        eventType: isWicket ? 'wicket' : (type === 'legal' ? 'ball' : 'extra'),
        innings_number: store.currentInnings,
        wicket_type: wicketType,
        is_penalty: false,
        commentary: commentary || '',
        generated_commentary: commentary || '',
        tournament_id: matchMeta?.tournamentId || null
      };

      if (!navigator.onLine || isOfflineStore) {
        store.enqueueOfflineBall(payload);
        toast.error(`Offline: Ball queued (${store.offlineQueue.length + 1}/10)`);
        syncToDatabase(store); // retain local state mirror
        return;
      }

      setIsSyncing(true);
      setSyncQueue(prev => prev + 1);

      try {
        // If coming back online with a queue, do a sanity check on Database "Split-Brain" State
        if (store.offlineQueue.length > 0) {
          const dbStateRaw = await fetch(`${baseUrl}/matches/${activeMatchId}`);
          if (dbStateRaw.ok) {
            const dbMatch = await dbStateRaw.json();
            // Just pull the current dbBalls via dbMatch innings length if we want split brain logic
            // For now, we will flush the queue unconditionally, but if you want strict checking:
            // if (dbMatch.historyLength !== localLength) { flushQueue }
          }

          // Flush Offline Queue sequentially
          for (const queuedBall of store.offlineQueue) {
            await fetch(`${baseUrl}/score/ball`, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify(queuedBall)
            });
          }
          store.clearOfflineQueue();
          toast.success("Offline queue fully synced!");
        }

        const response = await fetch(`${baseUrl}/score/ball`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Cloud sync returned ${response.status}`);
        }

        // Success! Force MatchCenter to update so public view is in sync
        syncWithCloud().catch(() => { });
        syncToDatabase(store);

      } catch (err) {
        console.error(`[Sync] Ball sync failed (Attempt ${retryCount + 1}):`, err);

        if (retryCount < 2) {
          // Exponential backoff: 1s, 2s
          const delay = (retryCount + 1) * 1000;
          setTimeout(() => syncBallToCloud(retryCount + 1), delay);
        } else {
          // If we hard fail even after retries, enqueue the ball
          store.enqueueOfflineBall(payload);
          toast.error("Cloud Sync Failed. Ball saved to Offline Queue.", { id: 'sync-fail' });
          syncToDatabase(store);
        }
      } finally {
        setSyncQueue(prev => Math.max(0, prev - 1));
        if (syncQueue <= 1) setIsSyncing(false);
      }
    };

    syncBallToCloud();

    const sId = store.strikerId || '';
    const bId = store.currentBowlerId || '';
    const sName = getPlayerName(sId);
    const bName = getPlayerName(bId);

    // Milestone Detection is now handled atomically inside matchStore.ts recordBall action.
    // The store sets pendingMilestone which triggers the UI effect above.

    syncToDatabase(store);

    if (score === 4 && subType === 'bat') {
      milestoneRef.current?.trigger({ type: 'FOUR', playerName: sName });
    } else if (score === 6 && subType === 'bat') {
      milestoneRef.current?.trigger({ type: 'SIX', playerName: sName });
    }

    if (isWicket) {
      const victimId = outPlayerId || sId;
      const bStat = innings.battingStats[victimId];
      // Note: WICKET splash moved to triggerWicketSplash to avoid double appearance.
      // Keeping Hat-trick and multi-wicket logic here as they fire on ball record.

      const bowlerBalls = (innings.history || []).filter(b => b.bowlerId === bId && b.isLegal);
      if (bowlerBalls.length >= 3) {
        const last3 = bowlerBalls.slice(-3);
        const isHatTrick = last3.every(b => b.isWicket && !['Run Out', 'Retired Hurt', 'Retired Out'].includes(b.wicketType || ''));
        if (isHatTrick) {
          milestoneRef.current?.trigger({ type: 'HAT_TRICK', playerName: bName });
        }
      }

      const bwStat = innings.bowlingStats[bId];
      if (bwStat) {
        if (bwStat.wickets === 5) {
          milestoneRef.current?.trigger({ type: 'FIVE_WICKET', playerName: bName, subText: `${bwStat.wickets}-${bwStat.runs}` });
        } else if (bwStat.wickets === 4) {
          milestoneRef.current?.trigger({ type: 'FOUR_WICKET', playerName: bName, subText: `${bwStat.wickets}-${bwStat.runs}` });
        }
      }
    }

    // Milestone logic moved up before syncToDatabase to ensure notification flags are persisted.

    const isLegalBall = type !== 'wide' && type !== 'no-ball';
    if (isLegalBall) {
      const updatedTotalBalls = innings.totalBalls + 1;

      const willInningsFinish =
        (innings.wickets + (isWicket && wicketType !== 'Retired Hurt' ? 1 : 0) === 10) ||
        (updatedTotalBalls >= (store.maxOvers || 20) * 6) ||
        (store.currentInnings === 2 && (innings.totalRuns + score) > (store.innings1?.totalRuns || 0));

      if (updatedTotalBalls % 6 === 0 && updatedTotalBalls > 0 && !willInningsFinish) {
        setIsOverComplete(true);
        store.updateMatchSettings({
          isWaitingForBowler: true,
          currentBowlerId: null
        });

        setTimeout(() => setShowBowlerModal(true), 1200);
      }
    }
  };

  const attemptRecord = (score: number, type: any = 'legal', isWicket: boolean = false, wicketType?: any, subType: any = 'bat', outPlayerId?: string, newBatterId?: string) => {
    let typeKey: CommentaryEventType = 'DOT';
    if (isWicket) typeKey = 'WICKET';
    else if (score === 6 && subType === 'bat') typeKey = 'SIX';
    else if (score === 4 && subType === 'bat') typeKey = 'FOUR';
    else if (score === 3 && subType === 'bat') typeKey = 'TRIPLE';
    else if (score === 2 && subType === 'bat') typeKey = 'DOUBLE';
    else if (score === 1 && subType === 'bat') typeKey = 'SINGLE';
    else if (score === 0 && subType === 'bat') typeKey = 'DOT';

    let comm = currentPreviews[typeKey] || "";

    if (!comm) {
      const list = nextCommentarySuggestions[typeKey];
      if (list && list.length > 0) {
        comm = list[Math.floor(Math.random() * list.length)];
      } else {
        comm = useCommentaryStore.getState().getRandomDialogue(typeKey) || "";
      }
    }

    // Dynamic substitution
    const strikerName = getPlayerName(store.strikerId);
    comm = comm.replace(/\{batsman\}/g, strikerName)
      .replace(/\{striker\}/g, strikerName)
      .replace(/\{bowler\}/g, getPlayerName(store.currentBowlerId));

    shufflePreview(typeKey);

    const worthWickets = ['Caught', 'Stumped', 'Run Out', 'Bowled', 'LBW'];
    const isWagonWorthy = (score > 0) || (isWicket && worthWickets.some(w => String(wicketType || '').includes(w)));

    if (store.useWagonWheel && subType === 'bat' && isWagonWorthy) {
      if (store.wagonWheelQuickSave) {
        const finalComm = comm.replace(/\{zone\}/g, 'Straight');
        hapticFeedback(score >= 4 ? 'heavy' : 'light');
        handleRecord(score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, 'Straight', finalComm);
      } else {
        setShowWagonWheelModal({ score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, commentary: comm });
      }
    } else {
      const finalComm = comm.replace(/\{zone\}/g, '');
      hapticFeedback(score >= 4 ? 'heavy' : 'light');
      handleRecord(score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, undefined, finalComm);
    }
  };

  const triggerWicketSplash = (type: string) => {
    const vId = runOutInvolved?.victimId || store.strikerId;
    if (!vId) return;

    // Guard against multiple splashes for the same wicket event
    const splashId = `${vId}_${currentInnings?.totalBalls || 0}`;
    if (lastSplashRef.current === splashId) return;
    lastSplashRef.current = splashId;

    const vName = getPlayerName(vId);
    const bStat = currentInnings?.battingStats[vId];

    // Detect duck/golden duck before ball is recorded (balls will be 0 for golden duck at this point)
    if (bStat && bStat.runs === 0) {
      if (bStat.balls === 0) {
        milestoneRef.current?.trigger({ type: 'GOLDEN_DUCK', playerName: vName });
      } else {
        milestoneRef.current?.trigger({ type: 'DUCK', playerName: vName });
      }
    } else {
      milestoneRef.current?.trigger({ type: 'WICKET', playerName: vName });
    }

    // NEW: Detect if this wicket results in All Out (10 wickets)
    const isNowAllOut = currentInnings && (currentInnings.wickets + 1) >= 10;

    if (isNowAllOut || isBattingFinishing) {
      if (isNowAllOut) {
        // Record the wicket IMMEDIATELY since no new batter is needed
        let dismissal = type;
        if (pendingFielderId && (type === 'Caught' || type === 'Stumped')) {
          const fielder = [...players, ...opponentPlayers].find(fp => fp.id === pendingFielderId);
          dismissal = `${type === 'Caught' ? 'c' : 'st'} ${fielder?.name || 'Fielder'}`;
        }

        if (runOutInvolved) {
          handleRecord(runOutInvolved.runs, runOutInvolved.ballType || 'legal', true, 'Run Out', runOutInvolved.subType || 'bat', runOutInvolved.victimId, undefined);
          setRunOutInvolved(null);
        } else {
          handleRecord(0, 'legal', true, dismissal, 'bat', undefined, undefined);
        }
      }

      setTimeout(() => setShowInningsReview(true), 1500);
      return;
    }

    setTimeout(() => {
      setShowBatterSelectModal(true);
    }, 1500);
  };

  const handleConfirmInnings = async () => {
    if (!activeMatchId || !currentInnings) return;

    // Safety check: Don't finalize an innings that hasn't even started
    if (currentInnings.totalBalls === 0 && currentInnings.totalRuns === 0) {
      console.warn("[Scorer] Finalization blocked: No balls recorded in current innings.");
      setShowInningsReview(false);
      return;
    }

    setSyncStatus('loading');

    try {
      const totalScore = currentInnings.totalRuns;
      const totalWickets = currentInnings.wickets;
      const target = (store.innings1?.totalRuns || 0) + 1;

      // use the new centralized slimmer
      const exportableStore = store.prepareSyncPayload();

      const updatePayload: any = {
        tournamentId: matchMeta?.tournamentId,
        isNeutral: matchMeta?.isNeutral,
        liveData: exportableStore
      };

      const playerStatsUpdate: any[] = [];
      const team1XI = store.team1XI || [];

      team1XI.forEach(pid => {
        let runs = 0;
        let balls = 0;
        let fours = 0;
        let sixes = 0;
        let isNotOut = false;
        let playedInnings = false;

        let wickets = 0;
        let bowlingRuns = 0;
        let bowlingOvers = 0;
        let maidens = 0;
        let wides = 0;
        let noBalls = 0;
        let bowledInnings = false;
        let lastBStat: any = null;

        [store.innings1, store.innings2].forEach((inn) => {
          if (!inn) return;

          const bStat = inn.battingStats[pid];
          if (bStat) {
            lastBStat = bStat;
            runs += (bStat.runs || 0);
            balls += (bStat.balls || 0);
            fours += (bStat.fours || 0);
            sixes += (bStat.sixes || 0);
            if (bStat.status === 'batting') isNotOut = true;
            // Only count as an innings if the player actually faced a ball or was at the crease (not DNB)
            if ((bStat.balls || 0) > 0 || bStat.status !== 'dnb') playedInnings = true;
          }

          const bwStat = inn.bowlingStats[pid];
          if (bwStat) {
            wickets += (bwStat.wickets || 0);
            bowlingRuns += (bwStat.runs || 0);
            bowlingOvers += (bwStat.overs || 0);
            maidens += (bwStat.maidens || 0);

            // Calculate extras from history
            const bowlerEvents = (inn.history || []).filter(b => String(b.bowlerId) === String(pid));
            wides += bowlerEvents.filter(b => b.type === 'wide').length;
            noBalls += bowlerEvents.filter(b => b.type === 'no-ball').length;

            if (bwStat.overs > 0) bowledInnings = true;
          }
        });

        if ((playedInnings || bowledInnings) && !matchMeta?.isNeutral) {
          playerStatsUpdate.push({
            playerId: pid,
            matchId: activeMatchId,
            tournamentId: matchMeta?.tournamentId || null,
            runs,
            balls,
            fours,
            sixes,
            wickets,
            bowlingRuns,
            bowlingOvers,
            maidens,
            wides,
            noBalls,
            isNotOut,
            outHow: lastBStat?.outHow || (lastBStat?.status === 'dnb' ? 'Did Not Bat' : isNotOut ? 'Not Out' : 'Out')
          });
        }
      });

      if (store.currentInnings === 1) {
        updatePayload.team1Score = { 
          runs: totalScore, 
          wickets: totalWickets, 
          overs: store.getOvers(currentInnings.totalBalls) 
        };
        updatePayload.targetScore = target;
      } else {
        updatePayload.status = 'completed';
        updatePayload.team1Score = { 
          runs: store.innings1?.totalRuns || 0, 
          wickets: store.innings1?.wickets || 0, 
          overs: store.getOvers(store.innings1?.totalBalls || 0) 
        };
        updatePayload.team2Score = { 
          runs: store.innings2?.totalRuns || 0, 
          wickets: store.innings2?.wickets || 0, 
          overs: store.getOvers(store.innings2?.totalBalls || 0) 
        };
        updatePayload.scorecard = {
          innings1: store.innings1,
          innings2: store.innings2
        };

        const inn2BatName = store.innings2?.battingTeamId === 'HOME'
          ? (store.team1Name || matchMeta?.team1Name || 'TEAM 1')
          : (store.team2Name || matchMeta?.team2Name || 'OPPONENT');
        const inn1BatName = store.innings1?.battingTeamId === 'HOME'
          ? (store.team1Name || matchMeta?.team1Name || 'TEAM 1')
          : (store.team2Name || matchMeta?.team2Name || 'OPPONENT');

        let resultMessage = '';
        if (totalScore >= target) {
          resultMessage = `${inn2BatName.toUpperCase()} WON BY ${10 - totalWickets} WICKETS`;
        } else if (totalScore === target - 1) {
          resultMessage = "MATCH TIED";
        } else {
          resultMessage = `${inn1BatName.toUpperCase()} WON BY ${target - 1 - totalScore} RUNS`;
        }
        updatePayload.resultSummary = resultMessage;
      }

      if (updatePayload.status === 'completed') {
        await finalizeMatch(activeMatchId, updatePayload, playerStatsUpdate);
      } else {
        await updateMatch(activeMatchId, updatePayload);
      }
      if (updatePayload.status === 'completed') {
        fetchPlayers(); // Sync global stats after match completion
      }
      setSyncStatus('success');

      if (store.currentInnings === 1) {
        // LOOP BREAKER: Immediately arm the guard so the innings-finish useEffect
        // cannot re-open the review modal while we are mid-transition.
        isTransitioningToSecondInnings.current = true;
      }

      setTimeout(() => {
        setShowInningsReview(false);
        setShowBowlerModal(false); // Force-close stale end-of-over bowler modal from innings 1
        setSyncStatus('idle');

        if (store.currentInnings === 1) {
          // Open the MatchSetupModal for 2nd innings openers/bowler selection.
          // The guard ref will be reset once the store advances to innings 2
          // inside handleSetupComplete → store.startInnings(2, ...).
          setShowSetupModal(true);
        } else {
          // Match is over — reset the guard and show summary.
          isTransitioningToSecondInnings.current = false;
          setShowMatchSummaryModal(true);
        }
      }, 1500);


    } catch (err) {
      console.error("Failed to finalize innings:", err);
      setSyncStatus('error');
    }
  };

  const handleDeclareInnings = () => {
    if (window.confirm("Are you sure you want to DECLARE the current innings?")) {
      store.declareInnings();
      setShowSettingsDrawer(false);
      setShowInningsReview(true);
    }
  };

  const handleResetMatch = async () => {
    if (window.confirm("CRITICAL: Are you SURE you want to completely reset this match? All live data, innings, scores, and finalized stats will be permanently deleted.")) {
      if (activeMatchId) {
        try {
          // store.resetMatch() handles all 3 steps atomically:
          // 1) Clears Zustand state  2) POSTs /reset on server (NULLs scorecard + score cols,
          //    deletes player_match_stats)  3) syncWithCloud() to refresh match list
          await store.resetMatch(activeMatchId);
          toast.success("Match reset successfully");
          setShowSettingsDrawer(false);
          setShowSetupModal(true);
        } catch (err) {
          console.error("[Scorer] Reset failed:", err);
          toast.error("Failed to reset match");
        }
      }
    }
  };

  const calculateTopPerformers = () => {
    const scores: Record<string, { id: string, name: string, score: number, runs: number, balls: number, wickets: number, maidens: number, runsConceded: number, overs: number, fours: number, sixes: number }> = {};

    [store.innings1, store.innings2].forEach(inn => {
      if (!inn) return;
      Object.entries(inn.battingStats || {}).forEach(([id, s]: [string, any]) => {
        if (!scores[id]) scores[id] = { id, name: getPlayerName(id), score: 0, runs: 0, balls: 0, wickets: 0, maidens: 0, runsConceded: 0, overs: 0, fours: 0, sixes: 0 };
        scores[id].runs += s.runs;
        scores[id].balls += s.balls;
        scores[id].fours += s.fours || 0;
        scores[id].sixes += s.sixes || 0;
        scores[id].score += s.runs + ((s.fours || 0) * 2) + ((s.sixes || 0) * 4);
        if (s.runs >= 50) scores[id].score += 50;
        if (s.runs >= 100) scores[id].score += 100;
      });
      Object.entries(inn.bowlingStats || {}).forEach(([id, s]: [string, any]) => {
        if (!scores[id]) scores[id] = { id, name: getPlayerName(id), score: 0, runs: 0, balls: 0, wickets: 0, maidens: 0, runsConceded: 0, overs: 0, fours: 0, sixes: 0 };
        scores[id].wickets += s.wickets;
        scores[id].runsConceded += s.runs;
        scores[id].overs += s.overs || 0;
        scores[id].maidens += s.maidens || 0;
        scores[id].score += (s.wickets * 25) + ((s.maidens || 0) * 10);
      });
    });

    // Only include Indian Strikers players in the spotlight
    return Object.values(scores)
      .filter(p => players.some((hp: Player) => String(hp.id) === String(p.id)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  };

  const downloadHeroPoster = async () => {
    if (!posterRef.current || isGeneratingPoster) return;
    setIsGeneratingPoster(true);
    const toastId = toast.loading("Generating Match Day Hero Poster...");
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const blob = await toBlob(posterRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#020617',
      });

      if (!blob) throw new Error("Failed to capture image");

      const playerName = getPlayerName(store.manOfTheMatch);
      const fileName = `MatchHero_${playerName.replace(/\s+/g, '_')}_${new Date().getTime()}.png`;
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast.success("Hero poster downloaded!", { id: toastId });
    } catch (err) {
      console.error("Poster Generation Failed:", err);
      toast.error("Failed to generate poster.", { id: toastId });
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const handleShareHeroPoster = async () => {
    if (!posterRef.current || isGeneratingPoster) return;
    setIsGeneratingPoster(true);
    const toastId = toast.loading("Preparing for share...");
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const blob = await toBlob(posterRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#020617',
      });

      if (!blob) throw new Error("Failed to generate image blob");

      const playerName = getPlayerName(store.manOfTheMatch);
      const fileName = `Hero_${playerName.replace(/\s+/g, '_')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Indian Strikers Hero Poster',
          text: `Check out the Player of the Match: ${playerName}!`,
        });
        toast.success("Shared successfully!", { id: toastId });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        link.click();
        toast.success("Sharing not supported - downloaded instead!", { id: toastId });
      }
    } catch (err) {
      console.error("Share Failed:", err);
      toast.error("Could not share. Download instead.", { id: toastId });
    } finally {
      setIsGeneratingPoster(false);
    }
  };


  const isLocked = (matches || []).find(m => m.id === activeMatchId)?.isLocked;

  const handleSetupComplete = (data: MatchSetupData) => {
    store.setToss(data.tossWinner, data.tossChoice);
    store.updateMatchSettings({
      maxOvers: data.maxOvers !== store.maxOvers ? data.maxOvers : store.maxOvers,
      team1XI: data.team1XI,
      team2XI: data.team2XI
    });
    
    // Determine batting/bowling team
    let batId;
    let bowlId;
    
    if (store.currentInnings === 1 && store.innings1) {
      // 2nd Innings: Reverse teams
      batId = store.innings1.bowlingTeamId;
      bowlId = store.innings1.battingTeamId;
    } else {
      // 1st Innings: Based on toss
      const isTeam1Batting = (data.tossWinner === 'HOME' && data.tossChoice === 'Bat') || 
                             (data.tossWinner === 'AWAY' && data.tossChoice === 'Bowl');
      batId = isTeam1Batting ? matchMeta?.team1Id : matchMeta?.team2Id;
      bowlId = isTeam1Batting ? matchMeta?.team2Id : matchMeta?.team1Id;
    }
    
    if (batId && bowlId) {
      store.startInnings(
        store.currentInnings === null ? 1 : 2,
        batId,
        bowlId,
        data.strikerId,
        data.nonStrikerId,
        data.bowlerId
      );
      // LOOP BREAKER RESET: Now that the store has advanced to innings 2,
      // disarm the guard so the innings-finish effect can run normally for innings 2.
      isTransitioningToSecondInnings.current = false;
    }
    
    setShowSetupModal(false);
  };

  const handleWagonWheelZoneSelected = (zoneName: string) => {
    const p = showWagonWheelModal;
    if (!p) return;
    
    const strikerN = getPlayerName(store.strikerId);
    const finalComm = p.commentary.replace(/\{batsman\}/g, strikerN)
      .replace(/\{striker\}/g, strikerN)
      .replace(/\{bowler\}/g, getPlayerName(store.currentBowlerId))
      .replace(/\{zone\}/g, zoneName);
      
    hapticFeedback(p.score >= 4 ? 'heavy' : 'light');
    handleRecord(p.score, p.type, p.isWicket, p.wicketType, p.subType, p.outPlayerId, p.newBatterId, zoneName, finalComm);
    setShowWagonWheelModal(null);
  };

  const handleWagonWheelSkip = () => {
    const p = showWagonWheelModal;
    if (!p) return;
    
    handleRecord(p.score, p.type, p.isWicket, p.wicketType, p.subType, p.outPlayerId, p.newBatterId, 'Unknown', p.commentary);
    setShowWagonWheelModal(null);
  };

  if (!currentInnings) {
    // KEY FIX: If the Setup modal is already requested (e.g. after a reset),
    // bypass the spinner entirely and fall through to the main render so
    // MatchSetupModal can mount. Without this, the spinner blocks the modal.
    if (!showSetupModal) {
      // Timed-out: show actionable escape instead of infinite spinner
      if (syncTimedOut) {
        return (
          <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#001F3F', color: '#FFF', gap: 16, padding: 24 }}>
            <div style={{ fontSize: '2rem' }}>🏏</div>
            <p style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: 1, textAlign: 'center' }}>NO INNINGS DATA FOUND</p>
            <p style={{ opacity: 0.5, fontSize: '0.75rem', textAlign: 'center', maxWidth: 280 }}>
              The match is live but has no innings recorded yet.
              Start the innings setup to begin scoring.
            </p>
            <button
              onClick={() => { setSyncTimedOut(false); setShowSetupModal(true); }}
              style={{ marginTop: 8, padding: '12px 32px', background: '#FAB005', color: '#001F3F', fontWeight: 900, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.85rem', letterSpacing: 1, textTransform: 'uppercase' }}
            >
              Setup Innings →
            </button>
            <button
              onClick={() => navigate('/match-center')}
              style={{ padding: '10px 24px', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontWeight: 700, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              ← Back to Match Centre
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        );
      }

      // Still within the 4-second grace period — show the spinner
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#001F3F', color: '#FFF' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FAB005', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 16, fontSize: '0.8rem', opacity: 0.6, fontWeight: 900, letterSpacing: 1 }}>SYNCHRONIZING MATCH STATE...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      );
    }
    // showSetupModal === true: fall through to main render so <MatchSetupModal> can mount
  }


  const strikerStats = currentInnings?.battingStats[store.strikerId || ''] || { runs: 0, balls: 0 };
  const nonStrikerStats = currentInnings?.battingStats[store.nonStrikerId || ''] || { runs: 0, balls: 0 };
  const bowlerStats = currentInnings?.bowlingStats[store.currentBowlerId || ''] || { overs: 0, runs: 0, wickets: 0 };


  const isQueueFull = store.offlineQueue && store.offlineQueue.length >= 10 && isOfflineStore;

  try {
    return (
      <DashboardContainer>
        {/* Vertical Analytics Handles on Left Wall */}
        <AnalyticsHandleContainer>
          <FloatingAnalyticsButton
            onClick={() => { setActiveChart('manhattan'); setShowAnalyticsDrawer(true); }}
          >
            MANHATTAN
          </FloatingAnalyticsButton>
          <FloatingAnalyticsButton
            onClick={() => { setActiveChart('worm'); setShowAnalyticsDrawer(true); }}
          >
            WORM CHART
          </FloatingAnalyticsButton>
        </AnalyticsHandleContainer>

        {isQueueFull && (
          <PremiumModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ zIndex: 9999 }}>
            <div style={{ background: '#001F3F', padding: '32px', borderRadius: '16px', textAlign: 'center', border: '2px solid #FF4D4D' }}>
              <CloudOff size={48} color="#FF4D4D" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 8 }}>WAITING FOR CONNECTION</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: 16 }}>Offline queue limit reached (10 balls). Please reconnect to the internet to sync and continue scoring.</p>
              <div style={{ fontSize: '0.8rem', color: '#FAB005', fontWeight: 700 }}>{store.offlineQueue?.length || 0} balls waiting to sync.</div>
            </div>
          </PremiumModalOverlay>
        )}
        <>
          <ScorerHeader
            store={store}
            matchMeta={matchMeta}
            teamLogo={teamLogo}
            isOnline={isOnline}
            isSyncing={isSyncing}
            onBack={() => {
              if (window.confirm("Are you sure you want to exit? Unsaved progress for this ball may be lost.")) {
                navigate('/match-center');
              }
            }}
            onSettingsOpen={() => setShowSettingsDrawer(true)}
          />

          <AnimatePresence>

            {showLineups && (
              <PremiumModalOverlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLineups(false)}
              >
                <PremiumModalContent onClick={e => e.stopPropagation()}>
                  <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>TEAM SQUADS</h2>
                    <button title="Close" onClick={() => setShowLineups(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', color: 'rgba(84, 147, 202, 1)', marginBottom: 8, textTransform: 'uppercase' }}>Indian Strikers</h3>
                      <SelectionGrid style={{ maxHeight: '50vh' }}>
                        {(players || [])
                          .filter((p: Player) => (team1XI || []).includes(p.id))
                          .map((p: Player) => (
                            <div key={p.id} style={{
                              fontSize: '0.6rem',
                              padding: '4px 4px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              color: '#FFFFFF',
                              border: '1px solid rgba(255,255,255,0.05)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontWeight: 700 }}>{p.name}</span>
                              <span style={{ opacity: 0.6, fontSize: '0.55rem', fontWeight: 400, textTransform: 'uppercase' }}>{p.role}</span>
                            </div>
                          ))}
                        {team1XI.length === 0 && <div style={{ opacity: 0.4, fontSize: '0.55rem' }}>No XI Selected</div>}
                      </SelectionGrid>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', color: '#FAB005', marginBottom: 8, textTransform: 'uppercase' }}>{matchMeta?.team2Name || 'OPPONENT'}</h3>
                      <SelectionGrid style={{ maxHeight: '50vh' }}>
                        {(opponentPlayers || [])
                          .filter(p => (team2XI || []).includes(p.id))
                          .map(p => (
                            <div key={p.id} style={{
                              fontSize: '0.6rem',
                              padding: '4px 4px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: 8,
                              color: '#FFFFFF',
                              border: '1px solid rgba(255,255,255,0.05)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <span style={{ fontWeight: 600 }}>{p.name}</span>
                              <span style={{ opacity: 0.6, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{p.role}</span>
                            </div>
                          ))}
                        {team2XI.length === 0 && <div style={{ opacity: 0.4, fontSize: '0.8rem' }}>No XI Selected</div>}
                      </SelectionGrid>
                    </div>
                  </div>
                </PremiumModalContent>
              </PremiumModalOverlay>
            )}
          </AnimatePresence>


          <ScoreSectionPanel
            store={store}
            currentInnings={currentInnings}
            matchMeta={matchMeta}
            partnershipData={partnershipData}
            strikerStats={strikerStats}
            nonStrikerStats={nonStrikerStats}
            bowlerStats={bowlerStats}
            isLocked={!!isLocked}
            isOverComplete={isOverComplete}
            getPlayerName={getPlayerName}
            onScorecardOpen={() => setShowScorecardModal(true)}
            onBowlerChange={() => setShowBowlerModal(true)}
            onStrikerSwitch={() => { if (!isLocked) store.switchStriker(); }}
          />

          <ScoringControls
            store={store}
            currentInnings={currentInnings}
            isLocked={!!isLocked}
            isWaitingForBowler={store.isWaitingForBowler}
            timelineRef={timelineRef as React.RefObject<HTMLDivElement>}
            onRecord={(runs, type) => attemptRecord(runs, type as any)}
            onWicket={() => setShowWicketModal(true)}
            onExtra={(type) => { setExtraType(type); setShowNBModal(true); }}
            onUndo={() => { if (!isLocked) { store.undoLastBall(); setIsOverComplete(false); } }}
            onLineups={() => setShowLineups(true)}
            onBowlerSelect={() => setShowBowlerModal(true)}
          />

          <MatchModals
            showBowlerModal={showBowlerModal}
            showNBModal={showNBModal}
            showWicketModal={showWicketModal}
            showFielderModal={showFielderModal}
            runOutInvolved={runOutInvolved}
            showBatterSelectModal={showBatterSelectModal}
            showPenaltyModal={showPenaltyModal}
            extraType={extraType}
            nbSubType={nbSubType}
            pendingWicketType={pendingWicketType}
            pendingFielderId={pendingFielderId}
            currentInnings={currentInnings!}
            store={store}
            isInningsBreak={!!isInningsBreak}
            isBattingFinishing={!!isBattingFinishing}
            players={players}
            opponentPlayers={opponentPlayers}
            team1XI={team1XI}
            team2XI={team2XI}
            activeMatchId={activeMatchId || ''}
            setShowBowlerModal={setShowBowlerModal}
            setShowNBModal={setShowNBModal}
            setShowWicketModal={setShowWicketModal}
            setShowFielderModal={setShowFielderModal}
            setRunOutInvolved={setRunOutInvolved}
            setShowBatterSelectModal={setShowBatterSelectModal}
            setShowPenaltyModal={setShowPenaltyModal}
            setNbSubType={setNbSubType}
            setPendingWicketType={setPendingWicketType}
            setPendingFielderId={setPendingFielderId}
            setIsOverComplete={setIsOverComplete}
            setShowSetupModal={setShowSetupModal}
            triggerWicketSplash={triggerWicketSplash}
            attemptRecord={attemptRecord}
            getPlayerName={getPlayerName}
          />
          {isInningsBreak && !showSetupModal && (
            <InningsBreakScreen
              store={store}
              matchMeta={matchMeta}
              teamLogo={teamLogo}
              calculateTopPerformers={calculateTopPerformers}
              onUndoLastBall={() => { store.undoLastBall(); setIsOverComplete(false); }}
              onStartSecondInnings={() => {
                setShowInningsReview(false);
                setShowSetupModal(true);
              }}
            />
          )}

          <MatchCompletionFlow
            isMatchComplete={isMatchComplete}
            store={store}
            matchMeta={matchMeta}
            venueName={venueName}
            isGeneratingPoster={isGeneratingPoster}
            posterRef={posterRef as React.RefObject<HTMLDivElement>}
            showMatchSummaryModal={showMatchSummaryModal}
            activeMatchId={activeMatchId || ''}
            calculateTopPerformers={calculateTopPerformers}
            getPlayerName={getPlayerName}
            getPlayerAvatar={getPlayerAvatar}
            downloadHeroPoster={downloadHeroPoster}
            handleShareHeroPoster={handleShareHeroPoster}
            onUpdateMatchSettings={(s) => store.updateMatchSettings(s)}
            onSaveMatchSummary={async (summary) => {
              setSyncStatus('loading');
              try {
                const allParticipatingIds = new Set([
                  ...Object.keys(store.innings1?.battingStats || {}),
                  ...Object.keys(store.innings1?.bowlingStats || {}),
                  ...Object.keys(store.innings2?.battingStats || {}),
                  ...Object.keys(store.innings2?.bowlingStats || {}),
                ]);
                const performers = Array.from(allParticipatingIds).map(pid => ({
                  playerId: pid,
                  playerName: getPlayerName(pid),
                  runs: (store.innings1?.battingStats[pid]?.runs || 0) + (store.innings2?.battingStats[pid]?.runs || 0),
                  balls: (store.innings1?.battingStats[pid]?.balls || 0) + (store.innings2?.battingStats[pid]?.balls || 0),
                  fours: (store.innings1?.battingStats[pid]?.fours || 0) + (store.innings2?.battingStats[pid]?.fours || 0),
                  sixes: (store.innings1?.battingStats[pid]?.sixes || 0) + (store.innings2?.battingStats[pid]?.sixes || 0),
                  wickets: (store.innings1?.bowlingStats[pid]?.wickets || 0) + (store.innings2?.bowlingStats[pid]?.wickets || 0),
                  bowlingRuns: (store.innings1?.bowlingStats[pid]?.runs || 0) + (store.innings2?.bowlingStats[pid]?.runs || 0),
                  bowlingOvers: (store.innings1?.bowlingStats[pid]?.overs || 0) + (store.innings2?.bowlingStats[pid]?.overs || 0),
                  maidens: (store.innings1?.bowlingStats[pid]?.maidens || 0) + (store.innings2?.bowlingStats[pid]?.maidens || 0),
                  isNotOut: (store.innings1?.battingStats[pid] && store.innings1.battingStats[pid].status !== 'out') ||
                            (store.innings2?.battingStats[pid] && store.innings2.battingStats[pid].status !== 'out'),
                }));
                const finalizeToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
                const finalizeHeaders = { 'Content-Type': 'application/json', 'Authorization': finalizeToken ? `Bearer ${finalizeToken}` : '' };
                await fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/matches/${activeMatchId}/finalize`, {
                  method: 'POST',
                  headers: finalizeHeaders,
                  body: JSON.stringify({ matchData: { ...summary, performers }, updatedPlayers: performers })
                });
                toast.success('Match Finalized & Career Stats Updated!');
                localStorage.removeItem('ins-cricket-scorer');
                localStorage.removeItem('active_match_id');
                navigate('/match-center');
              } catch (err) {
                console.error('Finalization failed:', err);
                toast.error('Finalization failed. Please check connection.');
              } finally {
                setSyncStatus('idle');
              }
            }}
            onCloseMatchSummary={() => setShowMatchSummaryModal(false)}
            players={players}
            allOpponents={allOpponents}
            setSyncStatus={setSyncStatus}
            teamLogo={teamLogo}
            onUpdateMatchStatus={(s) => { handleUpdateMatchStatus(s as any); }}
          />

          <MilestoneOverlay ref={milestoneRef} />

          <AnalyticsDrawer
            isOpen={showAnalyticsDrawer}
            activeChart={activeChart}
            manhattanData={manhattanData}
            analyticsWormData={analyticsWormData}
            store={store}
            onClose={() => setShowAnalyticsDrawer(false)}
            onChartChange={setActiveChart}
            getPlayerNameForChart={getPlayerNameForChart}
          />
        </>
        <LandscapeLockOverlay>
          <RotateCcw size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
        </LandscapeLockOverlay>
      </DashboardContainer>
    );
  } catch (error) {
    console.error("[ScorerDashboard] Critical Render Error:", error);
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#081c15', color: '#FFF', padding: 20, textAlign: 'center' }}>
        <AlertTriangle size={48} color="#FF4D4D" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>RENDERING ERROR</h2>
        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 24 }}>A UI component failed to load. We've captured the error and are synchronizing state.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '12px 24px', borderRadius: 12, background: '#10b981', border: 'none', color: '#FFF', fontWeight: 900, cursor: 'pointer' }}
        >
          RELOAD DASHBOARD
        </button>
      </div>
    );
  }
};

export default ScorerDashboard;
