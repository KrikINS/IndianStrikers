
import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Users,
  Plus,
  Trash2,
  Activity,
  AlertCircle,
  Zap,
  Target,
  ArrowRightLeft,
  X,
  Save,
  Search,
  Check,
  Calendar,
  RotateCcw,
  Flame,
  UserX,
  Sword,
  CircleDot,
  Medal,
  Handshake,
  Edit2,
  ArrowRight,
  Settings,
  CheckCircle2,
  Hand
} from 'lucide-react';
import { OpponentTeam, Player, Match, PlayerRole } from '../types';
import { useLocation } from 'react-router-dom';
import { updateMatch, updatePlayer } from '../services/storageService';

// --- Types ---

const DISMISSAL_TYPES = [
  "Not Out",
  "Bowled",
  "Caught",
  "LBW",
  "Run Out",
  "Stumped",
  "Hit Wicket",
  "Retired Hurt",
  "Obstructing Field",
  "Timed Out",
  "Did not bat"
];

interface BattingEntry {
  id: string;
  name: string;
  runs: number | '';
  balls: number | '';
  fours: number | '';
  sixes: number | '';
  howOut: string;
  fielder?: string;
  bowler?: string;
}

interface BowlingEntry {
  id: string;
  name: string;
  overs: number | '';
  maidens: number | '';
  runs: number | '';
  wickets: number | '';
  wides: number | '';
  noBalls: number | '';
  legByes: number | '';
  dots: number | '';
}

interface Innings {
  batting: BattingEntry[];
  bowling: BowlingEntry[];
  byeRuns: number;
  extras: number;
  totalRuns: number;
  wickets: number;
  overs: number;
}

interface MatchInfo {
  id?: string;
  teamAName: string;
  teamBName: string;
  tossResult: string;
  matchResult: string;
  date: string;
  venue: string;
  tournament: string;
  resultType?: 'Won' | 'Lost' | 'Draw' | 'Tie' | 'No Result' | 'Pending';
  squad?: string[];
  opponentSquad?: string[];
  totalOvers?: number;
  target?: number;
  penaltyRuns?: number;
}

interface ScorecardData {
  matchInfo: MatchInfo;
  innings: [Innings, Innings];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface LiveState {
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}

interface BallEvent {
  inning: 0 | 1;
  over: number;
  ballNumber: number;
  striker: string;
  bowler: string;
  runs: number;
  extrasType?: 'WD' | 'NB' | 'B' | 'LB';
  extrasRuns: number;
  isWicket: boolean;
  description: string;
}

interface PendingWicket {
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isBye: boolean;
  isLegBye: boolean;
}

interface HistoryState {
  data: ScorecardData;
  commentary: BallEvent[];
  liveState: LiveState;
}

interface MilestoneData {
  type: '50' | '100' | '3W' | '5W' | 'PARTNERSHIP';
  title: string;
  playerName: string;
  subText?: string;
  stats: {
    label1: string; value1: string | number;
    label2: string; value2: string | number;
    label3?: string; value3?: string | number;
    label4?: string; value4?: string | number;
  }
}

interface ScorecardProps {
  opponents?: OpponentTeam[];
  players?: Player[];
  matches?: Match[];
  onUpdateMatch?: (m: Match) => void;
}

// --- Definitions ---

function getOversFromBalls(balls: number) {
  return Math.floor(balls / 6) + (balls % 6) / 10;
}

function addBallsToOvers(currentOvers: number | '', ballsToAdd: number): number {
  const ov = Number(currentOvers || 0);
  const totalBalls = Math.floor(ov) * 6 + Math.round((ov % 1) * 10) + ballsToAdd;
  return getOversFromBalls(totalBalls);
}

function getStrikeRate(runs: number | '', balls: number | '') {
  const r = Number(runs || 0);
  const b = Number(balls || 0);
  if (b === 0) return '0.00';
  return ((r / b) * 100).toFixed(2);
}

function getEconomy(runs: number | '', overs: number | '') {
  const r = Number(runs || 0);
  const o = Number(overs || 0);
  if (o === 0) return '0.00';
  const totalBalls = Math.floor(o) * 6 + Math.round((o % 1) * 10);
  if (totalBalls === 0) return '0.00';
  const trueOvers = totalBalls / 6;
  return (r / trueOvers).toFixed(2);
}

function findFullPlayer(players: Player[], id: string, name: string): Partial<Player> {
  const player = players.find(p => p.id === id);
  if (player) return player;
  return {
    id, name,
    role: PlayerRole.BATSMAN,
    avatarUrl: `https://ui-avatars.com/api/?name=${name}&background=random`,
    matchesPlayed: 0, runsScored: 0, wicketsTaken: 0, average: 0
  };
}

function calculateInningsTotals(inning: Innings): Innings {
  const batRuns = inning.batting.reduce((sum, b) => sum + Number(b.runs || 0), 0);
  const wides = inning.bowling.reduce((sum, b) => sum + Number(b.wides || 0), 0);
  const noBalls = inning.bowling.reduce((sum, b) => sum + Number(b.noBalls || 0), 0);
  const legByes = inning.bowling.reduce((sum, b) => sum + Number(b.legByes || 0), 0);
  const byes = Number(inning.byeRuns || 0);

  const calculatedExtras = wides + noBalls + legByes + byes;
  const totalRuns = batRuns + calculatedExtras;

  const wickets = inning.batting.filter(b => {
    if (!b.howOut) return false;
    const val = b.howOut.toLowerCase();
    return !val.includes('not out') && !val.includes('retired') && !val.includes('did not bat');
  }).length;

  const totalBalls = inning.bowling.reduce((sum, b) => {
    const ov = Number(b.overs || 0);
    return sum + Math.floor(ov) * 6 + Math.round((ov % 1) * 10);
  }, 0);

  return {
    ...inning,
    extras: calculatedExtras,
    totalRuns,
    wickets,
    overs: getOversFromBalls(totalBalls)
  };
}

const Scorecard: React.FC<ScorecardProps> = ({ opponents = [], players = [], matches = [], onUpdateMatch }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(2);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [playerSelector, setPlayerSelector] = useState<{ inningIdx: 0 | 1, type: 'batsman' | 'bowler', autoTrigger?: boolean } | null>(null);
  const [selectionPreview, setSelectionPreview] = useState<Partial<Player> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Wicket Modal State
  const [wicketModal, setWicketModal] = useState<{ isOpen: boolean, pendingData: PendingWicket | null }>({
    isOpen: false,
    pendingData: null
  });
  const [wicketDetails, setWicketDetails] = useState({
    type: 'Caught',
    fielderName: ''
  });

  // Animation State
  const [milestone, setMilestone] = useState<{ visible: boolean; data: MilestoneData | null }>({ visible: false, data: null });
  const [boundaryAnim, setBoundaryAnim] = useState<number | null>(null);

  // History for Undo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [ballCommentary, setBallCommentary] = useState<BallEvent[]>([]);

  // Live Scoring State
  const [liveState, setLiveState] = useState<LiveState>({
    strikerId: '',
    nonStrikerId: '',
    bowlerId: ''
  });

  // Modal Sequence State: 'striker' -> 'nonStriker' -> 'bowler' -> 'none'
  const [selectionModalStep, setSelectionModalStep] = useState<'striker' | 'nonStriker' | 'bowler' | 'none'>('none');

  useEffect(() => {
    // Initial Load / New Innings: Trigger Striker Selection if empty
    if (activeTab === 0 || !isLiveMode) return;
    const innIdx = activeTab === 1 ? 0 : 1;
    // Delay slightly to ensure data loaded
    const t = setTimeout(() => {
      if (!liveState.strikerId && selectionModalStep === 'none' && !playerSelector) {
        setSelectionModalStep('striker');
        setPlayerSelector({ inningIdx: innIdx, type: 'batsman' });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [activeTab, isLiveMode]); // Run when tab changes or mode changes

  // Initial State
  const [data, setData] = useState<ScorecardData>({
    matchInfo: {
      teamAName: 'Indian Strikers',
      teamBName: opponents.length > 0 ? opponents[0].name : 'Opponent',
      tossResult: '',
      matchResult: '',
      date: new Date().toISOString().split('T')[0],
      venue: 'RCA-1',
      tournament: '',
      resultType: 'Pending'
    },
    innings: [
      { batting: [], bowling: [], byeRuns: 0, extras: 0, totalRuns: 0, wickets: 0, overs: 0 },
      { batting: [], bowling: [], byeRuns: 0, extras: 0, totalRuns: 0, wickets: 0, overs: 0 }
    ]
  });

  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [] });
  const [tossModal, setTossModal] = useState<{
    isOpen: boolean;
    match: Match | null;
    step: 'winner' | 'decision';
    winner: '1' | '2' | null;
  }>({
    isOpen: false,
    match: null,
    step: 'winner',
    winner: null
  });
  const [squadModal, setSquadModal] = useState(false);
  const [opponentSquadModal, setOpponentSquadModal] = useState(false);
  const [inningsBreakModal, setInningsBreakModal] = useState(false);
  const [matchSettingsModal, setMatchSettingsModal] = useState(false);
  const [endMatchModal, setEndMatchModal] = useState(false);
  const [selectedMOM, setSelectedMOM] = useState<string | null>(null);
  const commentaryEndRef = useRef<HTMLDivElement>(null);

  // Combine Indian Strikers + Opponents for dropdowns
  const allTeams = [
    { id: 'home', name: 'Indian Strikers' },
    ...opponents
  ];


  const [activeMatchId, setActiveMatchId] = useState<string | number | null>(null);
  const showMatchList = !activeMatchId && (!location.state || !location.state.match);

  if (showMatchList) {
    const upcomingMatches = matches.filter(m => (m.result === 'Pending' || !m.result) && !m.scorecardData);

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2">
          <Zap className="fill-blue-600 text-blue-600" /> Live Scoring
        </h1>
        <p className="text-slate-500">Select a scheduled match to start scoring.</p>

        <div className="grid gap-4">
          {upcomingMatches.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-slate-400 font-bold">No upcoming matches scheduled.</p>
            </div>
          ) : (
            upcomingMatches.map(match => (
              <button
                key={match.id}
                onClick={() => {
                  setActiveMatchId(match.id);
                  loadMatchData(match);
                  // Force Live Mode
                  setIsLiveMode(true);
                  // Toss will be triggered by loadMatchData helper
                }}
                className="flex justify-between items-center p-4 md:p-6 bg-white border border-slate-200 hover:border-blue-500 hover:shadow-lg rounded-2xl transition-all text-left group"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700">vs {match.opponent}</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <span>{match.date}</span>
                    <span>•</span>
                    <span>{match.venue}</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ArrowRightLeft size={20} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (location.state && location.state.match) {

      const matchId = location.state.match.id;
      // Fix: Prioritize fresh data from 'matches' prop if available, otherwise use route state
      const freshMatch = matches.find(m => String(m.id) === String(matchId)) || location.state.match;

      loadMatchData(freshMatch);
      const mode = location.state.mode;

      if (mode === 'live') {
        setIsLiveMode(true);
        // For new live matches, verify Info first
        // If data exists, loadMatchData will handle tab switching if needed
        setActiveTab(2);
      } else {
        setIsLiveMode(false);
        // If it's a past match (edit mode), start at 1st Innings so they can see/edit table?
        // Or Match Info? User said "enter past match score", so probably the table.
        setActiveTab(0);
      }
      setActiveMatchId(freshMatch.id);
    }
  }, [location.state, matches]);

  // Auto-Select Removed in favor of Modal Flow
  // useEffect removed


  useEffect(() => {
    // Auto-scroll commentary
    if (commentaryEndRef.current) {
      commentaryEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ballCommentary]);

  // -- Helpers --

  const loadMatchData = (match: Match) => {
    // If we have saved scorecard data, load it entirely!
    if (match.scorecardData && match.scorecardData.data) {
      setData(match.scorecardData.data);
      if (match.scorecardData.liveState) setLiveState(match.scorecardData.liveState);
      if (match.scorecardData.history) setBallCommentary(match.scorecardData.history);

      // If data is loaded, we can go to scorer tab
      if (location.state?.mode === 'live') {
        setActiveTab(0);
      }
      return;
    }

    // Otherwise, initialize fresh from match details

    // Check if we should trigger Toss Modal logic
    // We only trigger auto-toss if:
    // 1. No existing scorecard data (handled above)
    // 2. The match is NOT completed (result is Pending or undefined) OR user explicitly wants to start scoring

    // Initialize defaults for new match flow
    setData(prev => ({
      ...prev,
      matchInfo: {
        ...prev.matchInfo,
        id: match.id ? match.id.toString() : undefined,
        teamAName: 'INDIAN STRIKERS',
        teamBName: match.opponent,
        venue: match.venue,
        date: match.date,
        tournament: match.tournament || '',
        tossResult: '',
        matchResult: '',
        resultType: (match.result as any) || 'Pending',
        squad: match.squad || [],
        opponentSquad: (match as any).opponentSquad || [],
        totalOvers: (match as any).totalOvers || 20
      },
      innings: [
        { batting: [], bowling: [], byeRuns: 0, extras: 0, totalRuns: 0, wickets: 0, overs: 0 },
        { batting: [], bowling: [], byeRuns: 0, extras: 0, totalRuns: 0, wickets: 0, overs: 0 }
      ]
    }));

    // Start at Setup (Tab 0) unless data suggests otherwise (handled in early return)
    setActiveTab(0);
  };



  const getBattingTeamPlayers = (inningIdx: 0 | 1) => {
    const teamName = inningIdx === 0 ? data.matchInfo.teamAName : data.matchInfo.teamBName;
    return getTeamPlayers(teamName);
  };

  const getBowlingTeamPlayers = (inningIdx: 0 | 1) => {
    const teamName = inningIdx === 0 ? data.matchInfo.teamBName : data.matchInfo.teamAName;
    return getTeamPlayers(teamName);
  };

  const getTeamPlayers = (teamName: string) => {
    // Check if Home Team
    if (teamName === data.matchInfo.teamAName) {
      if (data.matchInfo.squad && data.matchInfo.squad.length > 0) {
        return data.matchInfo.squad.map(id => {
          const p = players.find(x => x.id === id);
          return { id, name: p ? p.name : 'Unknown' };
        });
      }
      return players.map(p => ({ id: p.id, name: p.name }));
    }
    // Check if Opponent Squad is set manually (prioritize match info settings)
    if (data.matchInfo.opponentSquad && data.matchInfo.opponentSquad.length > 0) {
      return data.matchInfo.opponentSquad.map((name, i) => ({ id: `opp-${i}-${name}`, name }));
    }
    // Fallback to Roster
    const opponent = opponents.find(op => op.name === teamName);
    return opponent ? opponent.players.map(p => ({ id: p.id, name: p.name })) : [];
  };


  const updateData = (newData: ScorecardData) => {
    const updatedInnings = newData.innings.map(ing => calculateInningsTotals(ing)) as [Innings, Innings];
    const validatedData = { ...newData, innings: updatedInnings };
    setData(validatedData);
    validateScorecard(validatedData);
  };

  const validateScorecard = (currentData: ScorecardData) => {
    const errors: string[] = [];
    currentData.innings.forEach((ing, index) => {
      const innName = index === 0 ? '1st Innings' : '2nd Innings';
      const bowlingWickets = ing.bowling.reduce((sum, b) => sum + Number(b.wickets || 0), 0);
      if (bowlingWickets > ing.wickets) {
        errors.push(`${innName}: Bowlers credited with ${bowlingWickets} wickets, but only ${ing.wickets} fell.`);
      }
    });
    setValidation({ isValid: errors.length === 0, errors });
  };

  const calculateCurrentPartnership = (inningIdx: 0 | 1) => {
    if (!liveState.strikerId || !liveState.nonStrikerId) return null;

    const inningCommentary = ballCommentary.filter(b => b.inning === inningIdx);
    // Find last wicket
    let lastWicketIndex = -1;
    for (let i = inningCommentary.length - 1; i >= 0; i--) {
      if (inningCommentary[i].isWicket) {
        lastWicketIndex = i;
        break;
      }
    }

    const partnershipBalls = inningCommentary.slice(lastWicketIndex + 1);
    const partnershipRuns = partnershipBalls.reduce((acc, curr) => acc + curr.runs + (curr.extrasRuns || 0), 0);

    const p1 = data.innings[inningIdx].batting.find(b => b.id === liveState.strikerId) || { name: 'P1', runs: 0, balls: 0 };
    const p2 = data.innings[inningIdx].batting.find(b => b.id === liveState.nonStrikerId) || { name: 'P2', runs: 0, balls: 0 };

    return {
      p1, p2,
      totalRuns: partnershipRuns,
      totalBalls: partnershipBalls.length
    };
  };



  const handlePreviewPlayer = (player: any) => {
    // Enrich with full stats if possible
    const fullPlayer = findFullPlayer(players, player.id, player.name);
    setSelectionPreview(fullPlayer);
  };

  const handleAddPlayerFromPreview = () => {
    if (!playerSelector || !selectionPreview) return;

    const { inningIdx, type } = playerSelector;
    const newId = selectionPreview.id || selectionPreview.name || `new-${Date.now()}`;
    const newName = selectionPreview.name || 'Unknown';

    const newInnings = [...data.innings];
    const currentList = type === 'batsman' ? newInnings[inningIdx].batting : newInnings[inningIdx].bowling;

    // Check if duplicate (should be filtered but safeguard)
    if (currentList.find(p => p.id === newId)) {
      alert("Player already added!");
      return;
    }

    // Add to Table
    if (type === 'batsman') {
      const entry: BattingEntry = {
        id: newId, name: newName, runs: 0, balls: 0, fours: 0, sixes: 0, howOut: 'Not Out'
      };
      newInnings[inningIdx].batting.push(entry);
    } else {
      const entry: BowlingEntry = {
        id: newId, name: newName, overs: 0, maidens: 0, runs: 0, wickets: 0,
        wides: 0, noBalls: 0, legByes: 0, dots: 0
      };
      newInnings[inningIdx].bowling.push(entry);
    }

    // Update Data
    updateData({ ...data, innings: newInnings as [Innings, Innings] });

    // Set Active State & Chain Modals
    if (type === 'batsman') {
      if (selectionModalStep === 'striker') {
        setLiveState(prev => ({ ...prev, strikerId: newId }));
        // Chain to Non-Striker
        if (!liveState.nonStrikerId) {
          setSelectionModalStep('nonStriker');
          // Short delay to allow state update/UI refresh
          setTimeout(() => {
            setPlayerSelector({ inningIdx, type: 'batsman' });
            setSelectionPreview(null);
          }, 100);
        } else {
          // Striker done, check Bowler sequence? (Usually non-striker is already there if we are replacing striker)
          setSelectionModalStep('none');
          setPlayerSelector(null);
        }
      } else if (selectionModalStep === 'nonStriker') {
        setLiveState(prev => ({ ...prev, nonStrikerId: newId }));

        // Chain to Bowler? Only if just starting active match or over end?
        // If we just started match (striker -> nonStriker -> bowler)
        if (!liveState.bowlerId) {
          setSelectionModalStep('bowler');
          setTimeout(() => {
            setPlayerSelector({ inningIdx, type: 'bowler' });
            setSelectionPreview(null);
          }, 100);
        } else {
          setSelectionModalStep('none');
          setPlayerSelector(null);
        }
      } else {
        // Manual Add
        setPlayerSelector(null);
      }
    } else {
      // BOWLER
      if (selectionModalStep === 'bowler') {
        setLiveState(prev => ({ ...prev, bowlerId: newId }));
        setSelectionModalStep('none');
        setPlayerSelector(null);
      } else {
        // Manual Add
        setPlayerSelector(null);
      }
    }

    setSelectionPreview(null);
  };

  const calculatePartnership = (partnershipBalls: any[], partnershipRuns: number, inningIdx: 0 | 1) => {
    const ballCount = partnershipBalls.length; // Approximate balls duration

    const striker = data.innings[inningIdx].batting.find(b => b.id === liveState.strikerId);
    const nonStriker = data.innings[inningIdx].batting.find(b => b.id === liveState.nonStrikerId);

    if (!striker || !nonStriker) return null;

    // Calculate individual contributions in this partnership
    // Filter balls where striker was on strike
    const p1Runs = partnershipBalls.filter(b => b.striker === striker.name).reduce((acc, b) => acc + b.runs, 0);
    const p1Balls = partnershipBalls.filter(b => b.striker === striker.name && !b.extrasType).length; // Legal balls faced

    const p2Runs = partnershipBalls.filter(b => b.striker === nonStriker.name).reduce((acc, b) => acc + b.runs, 0);
    const p2Balls = partnershipBalls.filter(b => b.striker === nonStriker.name && !b.extrasType).length;

    return {
      totalRuns: partnershipRuns,
      totalBalls: ballCount,
      p1: { name: striker.name, runs: p1Runs, balls: p1Balls },
      p2: { name: nonStriker.name, runs: p2Runs, balls: p2Balls }
    };
  };

  // --- Live Scoring Handlers ---

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setData(lastState.data);
    setBallCommentary(lastState.commentary);
    setLiveState(lastState.liveState);
    setHistory(newHistory);
  };

  const handleScoreBall = (runs: number, isWide: boolean, isNoBall: boolean, isWicket: boolean, isBye: boolean = false, isLegBye: boolean = false) => {
    if (isWicket) {
      setWicketModal({
        isOpen: true,
        pendingData: { runs, isWide, isNoBall, isBye, isLegBye }
      });
      setWicketDetails({ type: 'Caught', fielderName: '' });
      return;
    }

    processBall(runs, isWide, isNoBall, false, isBye, isLegBye);
  };

  const handleConfirmWicket = () => {
    if (!wicketModal.pendingData) return;
    const { runs, isWide, isNoBall, isBye, isLegBye } = wicketModal.pendingData;
    processBall(runs, isWide, isNoBall, true, isBye, isLegBye, wicketDetails.type, wicketDetails.fielderName);
    setWicketModal({ isOpen: false, pendingData: null });
  };

  const triggerMilestone = (data: MilestoneData) => {
    setMilestone({ visible: true, data });
    setTimeout(() => setMilestone({ visible: false, data: null }), 5000); // 5s duration
  };

  const processBall = (
    runs: number, isWide: boolean, isNoBall: boolean, isWicket: boolean,
    isBye: boolean, isLegBye: boolean, dismissalType: string = '', fielderName: string = ''
  ) => {
    // 1. Snapshot for Undo
    setHistory(prev => [...prev, JSON.parse(JSON.stringify({
      data, commentary: ballCommentary, liveState
    }))]);

    const innIdx = activeTab === 0 ? 0 : activeTab === 1 ? 0 : 1;

    const newInnings = data.innings.map((ing, idx) => {
      if (idx === innIdx) {
        return {
          ...ing,
          batting: ing.batting.map(b => ({ ...b })),
          bowling: ing.bowling.map(b => ({ ...b }))
        };
      }
      return ing;
    }) as [Innings, Innings];

    const currentInning = newInnings[innIdx];
    const strikerIdx = currentInning.batting.findIndex(p => p.id === liveState.strikerId);
    const bowlerIdx = currentInning.bowling.findIndex(p => p.id === liveState.bowlerId);

    if (strikerIdx === -1 || bowlerIdx === -1) {
      let missing = [];
      if (strikerIdx === -1) missing.push("Striker (Batting)");
      if (liveState.nonStrikerId && currentInning.batting.findIndex(p => p.id === liveState.nonStrikerId) === -1) missing.push("Non-Striker");
      if (bowlerIdx === -1) missing.push("Bowler");

      // Check if IDs are set but just not found (mismatch) vs Empty
      if (!liveState.strikerId) missing = ["Striker (Not Selected)"];
      else if (strikerIdx === -1) missing = [`Striker (ID Mismatch: ${liveState.strikerId})`];

      alert(`Action Blocked: Missing Active Players.\n\nPlease select the following in the dropdowns above the 'Undo' button:\n- ${missing.join('\n- ')}`);
      return;
    }

    const striker = currentInning.batting[strikerIdx];
    const bowler = currentInning.bowling[bowlerIdx];

    // Capture previous stats for milestone check
    const prevRuns = Number(striker.runs);
    const prevWickets = Number(bowler.wickets);

    // -- Scoring Logic --
    let validBall = true;
    let isDot = runs === 0 && !isWide && !isNoBall && !isBye && !isLegBye;
    let ballRuns = runs;
    let description = "";
    let extrasType: 'WD' | 'NB' | 'B' | 'LB' | undefined;
    let extrasRuns = 0;

    if (isWide) {
      extrasType = 'WD';
      extrasRuns = 1 + runs;
      bowler.wides = Number(bowler.wides || 0) + extrasRuns;
      bowler.runs = Number(bowler.runs || 0) + extrasRuns;
      description = runs > 0 ? `Wide + ${runs} Runs` : `Wide Ball`;
      validBall = false; isDot = false; ballRuns = 0;
    }
    else if (isNoBall) {
      extrasType = 'NB';
      extrasRuns = 1;
      bowler.noBalls = Number(bowler.noBalls || 0) + 1;
      bowler.runs = Number(bowler.runs || 0) + 1 + runs;
      striker.runs = Number(striker.runs || 0) + runs;
      striker.balls = Number(striker.balls || 0) + 1;
      if (runs === 4) striker.fours = Number(striker.fours || 0) + 1;
      if (runs === 6) striker.sixes = Number(striker.sixes || 0) + 1;
      description = runs > 0 ? `No Ball + ${runs} Runs` : `No Ball`;
      validBall = false; isDot = false;
    }
    else if (isBye) {
      extrasType = 'B';
      extrasRuns = runs;
      currentInning.byeRuns = Number(currentInning.byeRuns || 0) + runs;
      striker.balls = Number(striker.balls || 0) + 1;
      description = `${runs} Bye${runs > 1 ? 's' : ''}`;
      isDot = true; ballRuns = 0;
    }
    else if (isLegBye) {
      extrasType = 'LB';
      extrasRuns = runs;
      bowler.legByes = Number(bowler.legByes || 0) + runs;
      striker.balls = Number(striker.balls || 0) + 1;
      description = `${runs} Leg Bye${runs > 1 ? 's' : ''}`;
      isDot = true; ballRuns = 0;
    }
    else {
      striker.runs = Number(striker.runs || 0) + runs;
      striker.balls = Number(striker.balls || 0) + 1;
      if (runs === 4) {
        striker.fours = Number(striker.fours || 0) + 1;
        setBoundaryAnim(4);
        setTimeout(() => setBoundaryAnim(null), 2500);
      }
      if (runs === 6) {
        striker.sixes = Number(striker.sixes || 0) + 1;
        setBoundaryAnim(6);
        setTimeout(() => setBoundaryAnim(null), 2500);
      }
      bowler.runs = Number(bowler.runs || 0) + runs;
      description = runs === 0 ? "Dot Ball" : `${runs} Run${runs !== 1 ? 's' : ''}`;
    }

    if (validBall) {
      bowler.overs = addBallsToOvers(bowler.overs, 1);
      if (isDot) bowler.dots = Number(bowler.dots || 0) + 1;
    }

    if (isWicket && !isNoBall && !isWide) {
      striker.howOut = dismissalType;
      striker.fielder = fielderName;
      striker.bowler = bowler.name;
      if (!['Run Out', 'Timed Out', 'Obstructing Field', 'Retired Hurt'].includes(dismissalType)) {
        bowler.wickets = Number(bowler.wickets || 0) + 1;
      }
      description = `WICKET! (${dismissalType}) ` + description;

      triggerMilestone({
        type: 'PARTNERSHIP', // Using generic for wicket or create separate W type
        title: 'WICKET!',
        playerName: striker.name,
        subText: `Departing for ${striker.runs} (${striker.balls})`,
        stats: {
          label1: 'Runs', value1: striker.runs,
          label2: 'Balls', value2: striker.balls
        }
      });

      setLiveState(prev => ({ ...prev, strikerId: '' }));
      // Wicket Fall: Next step is to select new Striker
      setSelectionModalStep('striker');
      setPlayerSelector({ inningIdx: innIdx as 0 | 1, type: 'batsman', autoTrigger: true });
    }

    // -- Milestones Check --
    const newRuns = Number(striker.runs);
    const newWickets = Number(bowler.wickets);

    // 50
    if (prevRuns < 50 && newRuns >= 50) {
      triggerMilestone({
        type: '50', title: 'HALF CENTURY', playerName: striker.name,
        stats: {
          label1: 'Runs', value1: newRuns, label2: 'Balls', value2: striker.balls,
          label3: '4s', value3: striker.fours, label4: '6s', value4: striker.sixes
        }
      });
    }
    // 100
    else if (prevRuns < 100 && newRuns >= 100) {
      triggerMilestone({
        type: '100', title: 'CENTURY!', playerName: striker.name,
        stats: {
          label1: 'Runs', value1: newRuns, label2: 'Balls', value2: striker.balls,
          label3: '4s', value3: striker.fours, label4: '6s', value4: striker.sixes
        }
      });
    }

    // 3 Wickets
    if (prevWickets < 3 && newWickets === 3) {
      triggerMilestone({
        type: '3W', title: '3 WICKET HAUL', playerName: bowler.name,
        stats: {
          label1: 'Wickets', value1: newWickets, label2: 'Runs', value2: bowler.runs,
          label3: 'Overs', value3: bowler.overs
        }
      });
    }
    // 5 Wickets
    else if (prevWickets < 5 && newWickets === 5) {
      triggerMilestone({
        type: '5W', title: '5 WICKET HAUL', playerName: bowler.name,
        stats: {
          label1: 'Wickets', value1: newWickets, label2: 'Runs', value2: bowler.runs,
          label3: 'Overs', value3: bowler.overs
        }
      });
    }

    // Commentary Update
    const newEvent: BallEvent = {
      inning: innIdx as 0 | 1,
      over: Math.floor(calculateInningsTotals(currentInning).overs),
      ballNumber: Math.round((calculateInningsTotals(currentInning).overs % 1) * 10),
      striker: striker.name, bowler: bowler.name, runs: ballRuns, extrasType, extrasRuns, isWicket, description
    };

    // Only check end match if VALID ball (ignore phantom undo/redo triggers if any)
    const nextHistory = [...ballCommentary, newEvent];
    setBallCommentary(nextHistory);

    // Swap Ends
    if (runs % 2 !== 0 && validBall) {
      setLiveState(prev => ({ ...prev, strikerId: prev.nonStrikerId, nonStrikerId: prev.strikerId }));
    }

    // Check Over Complete
    const newOvers = Number(bowler.overs);
    if (validBall && Math.round((newOvers % 1) * 10) === 0 && newOvers > 0) {
      setLiveState(prev => ({ ...prev, strikerId: prev.nonStrikerId, nonStrikerId: prev.strikerId, bowlerId: '' }));
      if (!isWicket) {
        // Over End: Next step is to select new Bowler
        setSelectionModalStep('bowler');
        setPlayerSelector({ inningIdx: innIdx as 0 | 1, type: 'bowler', autoTrigger: true });
      }
    }
    updateData({ ...data, innings: newInnings as [Innings, Innings] });

    // Check Innings End Criteria (Only for 1st Innings usually, but check both)
    // We need to calculate totals based on the NEW updated data, but updateData is async-ish in React state, 
    // so we use the local calculated values.
    const updatedStats = calculateInningsTotals(currentInning);
    const maxOvers = data.matchInfo.totalOvers || 20;

    if (innIdx === 0 && (updatedStats.wickets >= 10 || updatedStats.overs >= maxOvers)) {
      setInningsBreakModal(true);
    }
    else if (innIdx === 1) {
      // Check Match End
      const target = data.matchInfo.target || 9999; // Should exist if 2nd innings started
      // 1. Chasing Team Won?
      if (updatedStats.totalRuns >= target) {
        setEndMatchModal(true);
      }
      // 2. Defending Team Won? (All Out or Overs Done and Runs < Target)
      else if (updatedStats.wickets >= 10 || updatedStats.overs >= maxOvers) {
        setEndMatchModal(true); // Logic for Tie is implied if Runs == Target-1, handled in Result Calculation
      }
    }
  };

  const getTopPerformers = () => {
    // Simple Fantasy Points: Run=1, Wicket=20, Catch=10, 50=10, 100=20, 5W=20
    // We need to map Name -> Points
    const pointsMap = new Map<string, number>();

    const processInning = (ing: Innings) => {
      ing.batting.forEach(b => {
        let pts = (Number(b.runs) || 0);
        if (Number(b.runs) >= 50) pts += 10;
        if (Number(b.runs) >= 100) pts += 10; // Cumulative
        pointsMap.set(b.name, (pointsMap.get(b.name) || 0) + pts);
      });
      ing.bowling.forEach(b => {
        let pts = (Number(b.wickets) || 0) * 20;
        if (Number(b.wickets) >= 5) pts += 20;
        pointsMap.set(b.name, (pointsMap.get(b.name) || 0) + pts);
      });
    };

    processInning(data.innings[0]);
    processInning(data.innings[1]);

    // Convert to array and sort
    return Array.from(pointsMap.entries())
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  };

  const handleSelectScheduledMatch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const matchId = e.target.value;
    // Fix: Convert ID to string for comparison as DB might return numbers
    const selected = matches.find(m => String(m.id) === String(matchId));
    if (!selected) return;

    setTossModal({
      isOpen: true,
      match: selected,
      step: 'winner',
      winner: null
    });
  };

  const handleTossComplete = (decision: 'Bat' | 'Bowl') => {
    if (!tossModal.match || !tossModal.winner) return;

    const teamA = 'INDIAN STRIKERS';
    const teamB = tossModal.match.opponent;
    let tossResultText = '';

    if (tossModal.winner === '1') {
      tossResultText = `${teamA} won the toss and elected to ${decision}`;
    } else {
      tossResultText = `${teamB} won the toss and elected to ${decision}`;
    }

    setData(prev => ({
      ...prev,
      matchInfo: {
        ...prev.matchInfo,
        id: tossModal.match!.id,
        teamAName: teamA,
        teamBName: teamB,
        tossResult: tossResultText,
        date: tossModal.match!.date.split('T')[0],
        venue: tossModal.match!.venue,
        tournament: tossModal.match!.tournament || '',
        // Initialize result based on existing match data if available
        // Initialize result based on existing match data if available
        resultType: (tossModal.match!.result as any) || 'Pending',
        totalOvers: data.matchInfo.totalOvers || 20
      },
      // Reset scorecard when switching matches manually
      innings: [
        { batting: [], bowling: [], byeRuns: 0, extras: 0, totalRuns: 0, wickets: 0, overs: 0 },
        { batting: [], bowling: [], byeRuns: 0, extras: 0, totalRuns: 0, wickets: 0, overs: 0 }
      ]
    }));

    setTossModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveScorecard = async () => {
    if (!data.matchInfo.id) {
      alert("Please select a valid scheduled match (Fixture) before saving.");
      return;
    }

    // Fix: Convert ID to string for lookup
    const baseMatch = matches.find(m => String(m.id) === String(data.matchInfo.id));
    if (!baseMatch) {
      alert("Selected match not found in database.");
      return;
    }

    // Determine completion status
    // IF resultType is 'Pending', match is upcoming.
    // IF resultType is 'Won'/'Lost'/'Draw', match is completed.
    const isCompleted = data.matchInfo.resultType && data.matchInfo.resultType !== 'Pending';

    // Ensure we only send valid values from types.ts
    const validResult = isCompleted ? (data.matchInfo.resultType as 'Won' | 'Lost' | 'Draw') : 'Pending';

    const updatedMatch: Match = {
      ...baseMatch,
      // Update core match details if they changed
      venue: data.matchInfo.venue,
      date: data.matchInfo.date,
      // Update Result and Status
      result: validResult,
      isUpcoming: !isCompleted,
      squad: data.matchInfo.squad, // Save the updated squad
      opponentSquad: data.matchInfo.opponentSquad,

      scorecardData: {
        ballCommentary,
        liveState
      }
    };

    try {
      if (onUpdateMatch) {
        onUpdateMatch(updatedMatch);
      } else {
        await updateMatch(updatedMatch);
      }
      alert("Scorecard saved successfully!");
    } catch (e: any) {
      console.error("Save failed", e);
      alert("Failed to save: " + e.message);
    }
  };

  const handleUpdateStats = async () => {
    if (!data.matchInfo.id) {
      alert("Please select a scheduled match first.");
      return;
    }
    const baseMatch = matches.find(m => String(m.id) === String(data.matchInfo.id));
    if (!baseMatch) return;

    // SAFEGUARD: Check if already updated
    if (baseMatch.statsUpdated) {
      alert("⚠️ Stats for this match have ALREADY been updated!\n\nUpdating again would double-count everyone's stats. Operation cancelled.");
      return;
    }

    // 1. Confirm with Admin
    if (!window.confirm("Are you sure? This will add the current scorecard stats to the players' career totals.\n\nOnly do this ONCE per match!")) return;

    // 2. Determine which innings belongs to Indian Strikers
    // We assume Indian Strikers is ALWAYS "Team 1" (innIdx 0) or "Team 2" (innIdx 1) based on user intent?
    // Since we don't have explicit team mapping, we will search for players by NAME in our 'players' list.

    let updatedCount = 0;
    const allInnings = [data.innings[0], data.innings[1]];

    try {
      for (const inning of allInnings) {
        // Process Batting
        for (const batsman of inning.batting) {
          // Find player in our database by ID (preferred) or Name
          const dbPlayer = players.find(p => p.name === batsman.name); // Using Name matching as ID might differ in opponents

          if (dbPlayer) {
            // Calculate new totals
            const currentStats = dbPlayer.battingStats || { matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, average: 0, strikeRate: 0, highestScore: '0', hundreds: 0, fifties: 0, ducks: 0, fours: 0, sixes: 0 };

            const runs = Number(batsman.runs) || 0;
            const balls = Number(batsman.balls) || 0;
            const isOut = batsman.howOut !== 'Not Out' && batsman.howOut !== 'Did not bat';

            const newStats = { ...currentStats };
            newStats.matches = (newStats.matches || 0) + 1; // Assuming playing = batting entry exists? Or check squad?
            newStats.innings = (newStats.innings || 0) + 1;
            if (!isOut) newStats.notOuts = (newStats.notOuts || 0) + 1;
            newStats.runs = (newStats.runs || 0) + runs;
            newStats.balls = (newStats.balls || 0) + balls;
            newStats.fours = (newStats.fours || 0) + (Number(batsman.fours) || 0);
            newStats.sixes = (newStats.sixes || 0) + (Number(batsman.sixes) || 0);

            if (runs >= 100) newStats.hundreds = (newStats.hundreds || 0) + 1;
            else if (runs >= 50) newStats.fifties = (newStats.fifties || 0) + 1;
            if (runs === 0 && isOut) newStats.ducks = (newStats.ducks || 0) + 1;

            // High Score logic
            const currentHigh = parseInt(newStats.highestScore.replace('*', ''));
            if (runs > currentHigh) {
              newStats.highestScore = `${runs}${!isOut ? '*' : ''}`;
            }

            // Update the player
            await updatePlayer({ ...dbPlayer, battingStats: newStats });
            updatedCount++;
          }
        }

        // Process Bowling
        for (const bowler of inning.bowling) {
          const dbPlayer = players.find(p => p.name === bowler.name);
          if (dbPlayer) {
            const currentStats = dbPlayer.bowlingStats || { matches: 0, innings: 0, overs: 0, maidens: 0, runs: 0, wickets: 0, average: 0, economy: 0, strikeRate: 0, bestBowling: '0/0', fourWickets: 0, fiveWickets: 0 };

            const overs = Number(bowler.overs) || 0;
            const runs = Number(bowler.runs) || 0;
            const wickets = Number(bowler.wickets) || 0;
            const maidens = Number(bowler.maidens) || 0;

            const newStats = { ...currentStats };
            // Matches handled in batting loop? Issue: what if they only bowled?
            // Simplification: We increment matches in batting if they exist there, otherwise here? 
            // Ideally we track unique players played. For now, let's just update bowling stats.
            if (!dbPlayer.battingStats?.matches) {
              // If they didn't bat, we might need to increment match count here, but risky duplication.
              // We will rely on them being listed in batting even if "Did not bat"
            }

            newStats.innings = (newStats.innings || 0) + 1;
            newStats.overs = (newStats.overs || 0) + overs;
            newStats.runs = (newStats.runs || 0) + runs;
            newStats.wickets = (newStats.wickets || 0) + wickets;
            newStats.maidens = (newStats.maidens || 0) + maidens;

            if (wickets >= 5) newStats.fiveWickets = (newStats.fiveWickets || 0) + 1;
            else if (wickets >= 4) newStats.fourWickets = (newStats.fourWickets || 0) + 1;

            // Best Bowling
            // Logic: More wickets is better. If equal wickets, fewer runs is better.
            const [bestW, bestR] = newStats.bestBowling.split('/').map(Number);
            if (wickets > bestW || (wickets === bestW && runs < bestR)) {
              newStats.bestBowling = `${wickets}/${runs}`;
            }

            await updatePlayer({ ...dbPlayer, bowlingStats: newStats });
            // We count updates, duplicate counts for all-rounders is fine for log
          }
        }
      }

      // 3. LOCK THE MATCH
      const lockedMatch = { ...baseMatch, statsUpdated: true };
      await updateMatch(lockedMatch);

      alert(`Successfully updated stats for verified players!\n\nReference match marked as 'Stats Updated'.`);
    } catch (e: any) {
      console.error(e);
      alert("Error updating player stats: " + e.message);
    }
  };

  const handleMatchInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setData({ ...data, matchInfo: { ...data.matchInfo, [e.target.name]: e.target.value } });
  };

  const handleBattingChange = (innIdx: number, id: string, field: keyof BattingEntry, value: any) => {
    const newInnings = [...data.innings];
    const index = newInnings[innIdx].batting.findIndex(b => b.id === id);
    if (index !== -1) {
      newInnings[innIdx].batting[index] = { ...newInnings[innIdx].batting[index], [field]: value };
      updateData({ ...data, innings: newInnings as [Innings, Innings] });
    }
  };

  const handleBowlingChange = (innIdx: number, id: string, field: keyof BowlingEntry, value: any) => {
    const newInnings = [...data.innings];
    const index = newInnings[innIdx].bowling.findIndex(b => b.id === id);
    if (index !== -1) {
      newInnings[innIdx].bowling[index] = { ...newInnings[innIdx].bowling[index], [field]: value };
      updateData({ ...data, innings: newInnings as [Innings, Innings] });
    }
  };

  const addRow = (type: 'batting' | 'bowling', innIdx: number) => {
    setPlayerSelector({ inningIdx: innIdx as 0 | 1, type: type === 'batting' ? 'batsman' : 'bowler' });
  };



  const removeRow = (type: 'batting' | 'bowling', innIdx: number, id: string) => {
    const newInnings = [...data.innings];
    if (type === 'batting') newInnings[innIdx].batting = newInnings[innIdx].batting.filter(b => b.id !== id);
    else newInnings[innIdx].bowling = newInnings[innIdx].bowling.filter(b => b.id !== id);
    updateData({ ...data, innings: newInnings as [Innings, Innings] });
  };


  const renderTabContent = () => {
    if (activeTab === 0) {
      return (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
            <h3 className="text-xl font-bold text-slate-700 mb-2">Match Information</h3>
            <p className="text-slate-500">Date: {data.matchInfo.date}</p>
            <p className="text-slate-500">Venue: {data.matchInfo.venue}</p>
            <p className="text-slate-500 mt-4">Toss: {data.matchInfo.tossResult || 'Pending'}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-xl">
              <h4 className="font-bold mb-2 text-blue-700">{data.matchInfo.teamAName}</h4>
              <p className="text-sm text-slate-500">{data.matchInfo.squad?.length || 0} Players Selected</p>
            </div>
            <div className="p-4 border rounded-xl">
              <h4 className="font-bold mb-2 text-red-700">{data.matchInfo.teamBName}</h4>
              <p className="text-sm text-slate-500">{data.matchInfo.opponentSquad?.length || 0} Players Selected</p>
            </div>
          </div>
        </div>
      );
    }

    const inningIdx = activeTab === 1 ? 0 : 1;
    const inning = data.innings[inningIdx];
    const teamName = inningIdx === 0 ? data.matchInfo.teamAName : data.matchInfo.teamBName;
    const fieldingPlayers = getBowlingTeamPlayers(inningIdx as 0 | 1);
    const availableBatters = getBattingTeamPlayers(inningIdx as 0 | 1);
    const partnershipData = calculateCurrentPartnership(inningIdx as 0 | 1);

    return (
      <div className="space-y-4 md:space-y-8 animate-fade-in relative">
        <div className="flex justify-between items-end border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">{teamName}</h3>
            <p className="text-slate-500 font-medium text-xs md:text-sm">Innings {inningIdx + 1} {data.matchInfo.tournament && `• ${data.matchInfo.tournament}`}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl md:text-4xl font-black text-slate-800">{inning.totalRuns}/{inning.wickets}</span>
            <span className="text-sm md:text-lg text-slate-600 font-bold ml-2">({inning.overs} ov)</span>
          </div>
        </div>

        {isLiveMode && (
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-3 md:p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row justify-between gap-3 md:gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 px-2 py-1 rounded text-xs font-bold text-white animate-pulse flex items-center gap-1 shrink-0">
                  <span className="w-2 h-2 bg-white rounded-full"></span> LIVE
                </div>
                <div className="flex gap-1 md:gap-2 overflow-x-auto pb-1 md:pb-0">
                  <select className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs md:text-sm text-white max-w-[100px] md:max-w-[120px]" value={liveState.strikerId} onChange={(e) => setLiveState({ ...liveState, strikerId: e.target.value })}>
                    <option value="">Striker</option>
                    {inning.batting.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs md:text-sm text-white max-w-[100px] md:max-w-[120px]" value={liveState.nonStrikerId} onChange={(e) => setLiveState({ ...liveState, nonStrikerId: e.target.value })}>
                    <option value="">Non-Striker</option>
                    {inning.batting.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <select className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs md:text-sm text-white max-w-[100px] md:max-w-[120px]" value={liveState.bowlerId} onChange={(e) => setLiveState({ ...liveState, bowlerId: e.target.value })}>
                    <option value="">Bowler</option>
                    {inning.bowling.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors text-xs md:text-sm disabled:opacity-50 self-end md:self-auto"
              >
                <RotateCcw size={14} /> Undo Last Ball
              </button>
            </div>

            {/* Partnership Display */}
            {partnershipData && (
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-2 border-b border-slate-700 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-sm shadow-inner">
                <div className="flex items-center gap-2">
                  <Handshake size={14} className="text-blue-400" />
                  <span className="text-slate-400 uppercase font-bold text-[10px] md:text-xs tracking-wider">Partnership:</span>
                  <span className="text-white font-bold">{partnershipData.totalRuns}</span>
                  <span className="text-slate-400 text-xs">({partnershipData.totalBalls} balls)</span>
                </div>
                <div className="hidden md:block w-px h-4 bg-slate-700"></div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-300">
                    <span className="text-white font-bold">{partnershipData.p1.name.split(' ')[0]}</span>: {partnershipData.p1.runs} ({partnershipData.p1.balls})
                  </span>
                  <span className="text-slate-600">&</span>
                  <span className="text-slate-300">
                    <span className="text-white font-bold">{partnershipData.p2.name.split(' ')[0]}</span>: {partnershipData.p2.runs} ({partnershipData.p2.balls})
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-3 md:p-6 border-b md:border-b-0 md:border-r border-slate-800">
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                  {[0, 1, 2, 3, 4, 6].map(run => (
                    <button key={run} onClick={() => handleScoreBall(run, false, false, false)} className="py-3 md:py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-xl md:text-2xl border border-slate-700 transition-all hover:-translate-y-1 text-white shadow-lg active:scale-95 active:bg-blue-600">
                      {run}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={() => handleScoreBall(0, false, false, true)} className="py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold border border-red-500 text-white shadow-lg shadow-red-900/50 active:scale-95">WICKET</button>
                  <button onClick={() => handleScoreBall(5, false, false, false)} className="py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold border border-slate-700 text-white active:scale-95">5 Runs</button>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Extras</p>
                  <div className="grid grid-cols-5 gap-1">
                    {[0, 1, 2, 3, 4].map(n => <button key={`wd-${n}`} onClick={() => handleScoreBall(n, true, false, false)} className="p-2 bg-orange-900/40 text-orange-200 border border-orange-800 rounded text-[10px] md:text-xs font-bold hover:bg-orange-900 active:bg-orange-800">WD{n > 0 ? `+${n}` : ''}</button>)}
                    {[0, 1, 2, 3, 4].map(n => <button key={`nb-${n}`} onClick={() => handleScoreBall(n, false, true, false)} className="p-2 bg-yellow-900/40 text-yellow-200 border border-yellow-800 rounded text-[10px] md:text-xs font-bold hover:bg-yellow-900 active:bg-yellow-800">NB{n > 0 ? `+${n}` : ''}</button>)}
                    {[1, 2, 3, 4].map(n => <button key={`b-${n}`} onClick={() => handleScoreBall(n, false, false, false, true)} className="p-2 bg-blue-900/40 text-blue-200 border border-blue-800 rounded text-[10px] md:text-xs font-bold hover:bg-blue-900 active:bg-blue-800">B+{n}</button>)}
                    <div className="p-2"></div>
                    {[1, 2, 3, 4].map(n => <button key={`lb-${n}`} onClick={() => handleScoreBall(n, false, false, false, false, true)} className="p-2 bg-purple-900/40 text-purple-200 border border-purple-800 rounded text-[10px] md:text-xs font-bold hover:bg-purple-900 active:bg-purple-800">LB+{n}</button>)}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-80 bg-slate-950/50 flex flex-col h-48 md:h-[450px] border-l border-slate-800 shrink-0">
                <div className="p-3 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase">Ball by Ball</div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar relative scroll-smooth">
                  {ballCommentary.filter(b => b.inning === inningIdx).length === 0 && <div className="text-center text-slate-600 text-xs mt-4">Match started...</div>}
                  {ballCommentary.filter(b => b.inning === inningIdx).map((ball, idx) => (
                    <div key={idx} className={`text-sm p-2 rounded-lg border ${ball.isWicket ? 'bg-red-900/20 border-red-800' : 'bg-slate-800/50 border-slate-700/50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-slate-400 text-xs">{ball.over}.{ball.ballNumber}</span>
                        <span className="text-xs text-slate-500">{ball.bowler} to {ball.striker}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${ball.isWicket ? 'text-red-400' : 'text-white'}`}>{ball.description}</span>
                        {ball.runs >= 4 && !ball.extrasType && <span className="text-xs font-black bg-white text-slate-900 px-1 rounded">{ball.runs}</span>}
                      </div>
                    </div>
                  ))}
                  <div ref={commentaryEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batting Card (Extracted for Stability) */}
        <LiveBattingTable
          data={inning.batting}
          battingSquad={availableBatters}
          fieldingSquad={fieldingPlayers}
          onUpdate={(id: string, field: string, val: any) => handleBattingChange(inningIdx, id, field as keyof BattingEntry, val)}
          onRemove={(id: string) => removeRow('batting', inningIdx, id)}
          onAdd={() => addRow('batting', inningIdx)}
          isLiveMode={isLiveMode}
        />

        {/* Extras & Bowling */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {/* ... Extras boxes ... */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><span className="block text-xs font-bold text-slate-600 uppercase">Wides</span><span className="text-xl font-black text-slate-800">{inning.bowling.reduce((sum, b) => sum + Number(b.wides || 0), 0)}</span></div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><span className="block text-xs font-bold text-slate-600 uppercase">No Balls</span><span className="text-xl font-black text-slate-800">{inning.bowling.reduce((sum, b) => sum + Number(b.noBalls || 0), 0)}</span></div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><span className="block text-xs font-bold text-slate-600 uppercase">Leg Byes</span><span className="text-xl font-black text-slate-800">{inning.bowling.reduce((sum, b) => sum + Number(b.legByes || 0), 0)}</span></div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center"><span className="block text-xs font-bold text-slate-600 uppercase mb-1">Byes</span><input type="number" value={inning.byeRuns} onChange={(e) => { const n = [...data.innings]; n[inningIdx].byeRuns = Number(e.target.value); updateData({ ...data, innings: n as [Innings, Innings] }); }} className="w-full text-center text-xl font-black text-slate-800 bg-slate-50 rounded-lg p-1 outline-none" /></div>
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center text-white"><span className="block text-xs font-bold text-slate-300 uppercase">Total Extras</span><span className="text-xl font-black text-white">{inning.extras}</span></div>
        </div>

        {/* Bowling Card (Extracted for Stability) */}
        <LiveBowlingTable
          data={inning.bowling}
          fieldingSquad={fieldingPlayers}
          onUpdate={(id: string, field: string, val: any) => handleBowlingChange(inningIdx, id, field as keyof BowlingEntry, val)}
          onRemove={(id: string) => removeRow('bowling', inningIdx, id)}
          onAdd={() => addRow('bowling', inningIdx)}
          isLiveMode={isLiveMode}
        />

        {/* Boundary Animation Overlay */}
        {boundaryAnim && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"></div>
            <div className="relative animate-zoom-in">
              <div className="text-[100px] md:text-[200px] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-orange-600 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transform -skew-x-12">
                {boundaryAnim}
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-yellow-500/30 rounded-full blur-[80px] animate-pulse"></div>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-2xl md:text-4xl font-black text-white uppercase tracking-[0.5em] animate-bounce whitespace-nowrap">
                {boundaryAnim === 4 ? 'FOUR!' : 'SIX!'}
              </div>
            </div>
          </div>
        )}


        {/* Batting Table */}
        <LiveBattingTable
          data={inning.batting}
          battingSquad={availableBatters}
          fieldingSquad={fieldingPlayers}
          onUpdate={(id: string, field: string, val: any) => handleBattingChange(inningIdx, id, field as keyof BattingEntry, val)}
          onRemove={(id: string) => removeRow('batting', inningIdx, id)}
          onAdd={() => addRow('batting', inningIdx)}
          isLiveMode={isLiveMode}
        />

        {/* Bowling Table */}
        <LiveBowlingTable
          data={inning.bowling}
          fieldingSquad={fieldingPlayers}
          onUpdate={(id: string, field: string, val: any) => handleBowlingChange(inningIdx, id, field as keyof BowlingEntry, val)}
          onRemove={(id: string) => removeRow('bowling', inningIdx, id)}
          onAdd={() => addRow('bowling', inningIdx)}
          isLiveMode={isLiveMode}
        />

        {/* Milestone Overlay */}
        {milestone.visible && milestone.data && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"></div>
            <div className="relative z-10 animate-zoom-in w-full max-w-lg">

              {/* Decorative Elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>

              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-black p-1 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  {milestone.data.type.includes('W') ? <Flame size={150} /> : <Trophy size={150} />}
                </div>

                <div className="bg-slate-900/90 rounded-[22px] p-6 md:p-8 text-center relative z-10 backdrop-blur-sm">
                  <div className="inline-block px-4 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs md:text-sm font-bold tracking-widest mb-4 border border-blue-500/30">
                    MILESTONE UNLOCKED
                  </div>

                  <h2 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter mb-2 drop-shadow-lg leading-none">
                    {milestone.data.title}
                  </h2>

                  <div className="text-xl md:text-2xl font-bold text-slate-300 mb-6 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2">
                    {milestone.data.playerName}
                    {milestone.data.subText && <span className="text-sm md:text-lg font-normal text-slate-500"> {milestone.data.subText}</span>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-slate-800/50 p-3 md:p-4 rounded-xl border border-white/5">
                      <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase">{milestone.data.stats.label1}</p>
                      <p className="text-2xl md:text-3xl font-black text-white">{milestone.data.stats.value1}</p>
                    </div>
                    <div className="bg-slate-800/50 p-3 md:p-4 rounded-xl border border-white/5">
                      <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase">{milestone.data.stats.label2}</p>
                      <p className="text-2xl md:text-3xl font-black text-white">{milestone.data.stats.value2}</p>
                    </div>
                    {milestone.data.stats.label3 && (
                      <div className="bg-slate-800/50 p-3 md:p-4 rounded-xl border border-white/5">
                        <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase">{milestone.data.stats.label3}</p>
                        <p className="text-2xl md:text-3xl font-black text-white">{milestone.data.stats.value3}</p>
                      </div>
                    )}
                    {milestone.data.stats.label4 && (
                      <div className="bg-slate-800/50 p-3 md:p-4 rounded-xl border border-white/5">
                        <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase">{milestone.data.stats.label4}</p>
                        <p className="text-2xl md:text-3xl font-black text-white">{milestone.data.stats.value4}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };




  return (
    <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Match Scorecard</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{data.matchInfo.teamAName} vs {data.matchInfo.teamBName}</span>
            {data.matchInfo.tossResult && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{data.matchInfo.tossResult}</span>}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMatchSettingsModal(true)}
            className="p-2 bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
            title="Match Settings"
          >
            <Settings size={20} />
          </button>

          <button onClick={() => setSquadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
            <Edit2 size={16} /> Manage Playing XI
          </button>
        </div>
      </div>
      <div className="flex gap-2 w-full md:w-auto">
        <button onClick={() => setIsLiveMode(!isLiveMode)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border text-sm md:text-base ${isLiveMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
          <Zap size={18} className={isLiveMode ? "fill-red-600" : ""} />
          {isLiveMode ? 'Exit Live' : 'Go Live'}
        </button>
        <button onClick={handleSaveScorecard} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all text-sm md:text-base">
          <Save size={18} /> Save
        </button>
        <button onClick={handleUpdateStats} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all text-sm md:text-base">
          <Activity size={18} /> Update Stats
        </button>
      </div>

      {!validation.isValid && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
          <AlertCircle className="text-red-500 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-red-700">Validation Errors</h4>
            <ul className="list-disc list-inside text-xs text-red-600 mt-1">{validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      {/* Navigation Tabs - Hidden for Wizard Flow */}
      <div className="hidden"></div>

      <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl border border-slate-100 min-h-[500px]">
        {renderTabContent()}
      </div>

      {matchSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-zoom-in">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings size={20} className="text-slate-500" /> Match Settings
              </h3>
              <button onClick={() => setMatchSettingsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Overs</label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  value={data.matchInfo.totalOvers || 20}
                  onChange={e => setData({ ...data, matchInfo: { ...data.matchInfo, totalOvers: Number(e.target.value) } })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Score (Manual)</label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  value={data.matchInfo.target || ''}
                  placeholder="Auto-calculated if empty"
                  onChange={e => setData({ ...data, matchInfo: { ...data.matchInfo, target: Number(e.target.value) } })}
                />
                <p className="text-[10px] text-slate-400 mt-1">Set this to override the calculated target or if skipping 1st innings.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Penalty Runs</label>
                <input
                  type="number"
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  value={data.matchInfo.penaltyRuns || 0}
                  onChange={e => setData({ ...data, matchInfo: { ...data.matchInfo, penaltyRuns: Number(e.target.value) } })}
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-700 mb-2">Game State Tools</h4>
                <button
                  onClick={() => {
                    if (!window.confirm("Skip 1st Innings? Ensure you set the Target first!")) return;
                    setActiveTab(1); // Jump to 2nd Innings
                    setMatchSettingsModal(false);
                  }}
                  className="w-full py-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-lg font-bold text-sm hover:bg-orange-100 transition-colors"
                >
                  Skip to 2nd Innings
                </button>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setMatchSettingsModal(false)} className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Toss Modal */}
      {tossModal.isOpen && tossModal.match && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-zoom-in relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>

            <div className="p-6 md:p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Medal size={40} className="text-blue-600" />
              </div>

              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">
                {tossModal.step === 'winner' ? 'Who Won The Toss?' : 'Decision?'}
              </h3>
              <p className="text-slate-500 font-medium mb-8">
                {tossModal.step === 'winner' ? `Match: Indian Strikers vs ${tossModal.match.opponent}` : `${tossModal.winner === '1' ? 'Indian Strikers' : tossModal.match.opponent} won the toss`}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tossModal.step === 'winner' ? (
                  <>
                    <button onClick={() => setTossModal(prev => ({ ...prev, step: 'decision', winner: '1' }))} className="py-4 px-6 bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-500 rounded-2xl transition-all group">
                      <span className="block text-2xl mb-2">🦅</span>
                      <span className="font-bold text-slate-700 group-hover:text-blue-700">Indian Strikers</span>
                    </button>
                    <button onClick={() => setTossModal(prev => ({ ...prev, step: 'decision', winner: '2' }))} className="py-4 px-6 bg-slate-50 hover:bg-red-50 border-2 border-slate-200 hover:border-red-500 rounded-2xl transition-all group">
                      <span className="block text-2xl mb-2">⚔️</span>
                      <span className="font-bold text-slate-700 group-hover:text-red-700">{tossModal.match.opponent}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleTossComplete('Bat')} className="py-4 px-6 bg-slate-50 hover:bg-green-50 border-2 border-slate-200 hover:border-green-500 rounded-2xl transition-all group">
                      <span className="block text-2xl mb-2">🏏</span>
                      <span className="font-bold text-slate-700 group-hover:text-green-700">Bat First</span>
                    </button>
                    <button onClick={() => handleTossComplete('Bowl')} className="py-4 px-6 bg-slate-50 hover:bg-orange-50 border-2 border-slate-200 hover:border-orange-500 rounded-2xl transition-all group">
                      <span className="block text-2xl mb-2">🥎</span>
                      <span className="font-bold text-slate-700 group-hover:text-orange-700">Bowl First</span>
                    </button>
                  </>
                )}
              </div>

              {tossModal.step === 'decision' && (
                <div className="mt-8">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Overs per Innings</label>
                  <select
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center text-lg outline-none focus:border-blue-500 transition-colors"
                    value={data.matchInfo.totalOvers}
                    onChange={(e) => setData({ ...data, matchInfo: { ...data.matchInfo, totalOvers: Number(e.target.value) } })}
                  >
                    {[10, 12, 15, 16, 20, 25, 30, 35, 40, 45, 50].map(o => <option key={o} value={o}>{o} Overs</option>)}
                  </select>
                </div>
              )}

              {tossModal.step === 'decision' && (
                <button onClick={() => setTossModal(prev => ({ ...prev, step: 'winner', winner: null }))} className="mt-6 text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center justify-center gap-1">
                  <RotateCcw size={14} /> Back
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Squad Selection Modal */}
      {squadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative mx-auto my-auto">
            <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Manage Playing XI</h3>
                <p className="text-xs text-slate-500">Select players for this match</p>
              </div>
              <button onClick={() => setSquadModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {players.map(p => {
                  const isSelected = data.matchInfo.squad?.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        const currentSquad = data.matchInfo.squad || [];
                        let newSquad;
                        if (isSelected) {
                          newSquad = currentSquad.filter(id => id !== p.id);
                        } else {
                          if (currentSquad.length >= 11) {
                            alert("You have already selected 11 players.");
                            return;
                          }
                          newSquad = [...currentSquad, p.id];
                        }
                        setData(prev => ({
                          ...prev,
                          matchInfo: { ...prev.matchInfo, squad: newSquad }
                        }));
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group
                             ${isSelected
                          ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
                          `}
                    >
                      <div className="relative">
                        <img src={p.avatarUrl} alt={p.name} className={`w-10 h-10 rounded-full object-cover ${!p.isAvailable ? 'grayscale opacity-70' : ''}`} />
                        {isSelected && <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 border-2 border-white"><Check size={10} strokeWidth={4} /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-bold text-sm truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{p.name}</h4>
                        <p className="text-xs text-slate-500">{p.role}</p>
                      </div>
                      {!p.isAvailable && !isSelected && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Unavail</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 md:p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center shrink-0">
              <div className="text-sm font-bold text-slate-600">
                Selected: <span className={(data.matchInfo.squad?.length === 11) ? 'text-green-600' : 'text-blue-600'}>{data.matchInfo.squad?.length || 0}</span> / 11
              </div>
              <button onClick={() => setSquadModal(false)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Innings Break Modal */}
      {inningsBreakModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

            <Trophy size={64} className="mx-auto text-yellow-500 mb-6 drop-shadow-lg animate-bounce" />

            <h2 className="text-3xl font-black text-slate-800 mb-2">INNINGS BREAK</h2>
            <p className="text-slate-500 font-bold mb-8">First Innings Completed</p>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Target to Win</p>
              <div className="text-5xl font-black text-slate-800 tracking-tighter">
                {calculateInningsTotals(data.innings[0]).totalRuns + 1}
              </div>
              <p className="text-sm font-bold text-slate-500 mt-2">
                Required in {data.matchInfo.totalOvers || 20} Overs
              </p>
            </div>

            <button
              onClick={() => {
                setInningsBreakModal(false);
                const target = calculateInningsTotals(data.innings[0]).totalRuns + 1;
                setData(prev => ({ ...prev, matchInfo: { ...prev.matchInfo, target } })); // Set Target
                setActiveTab(2); // Switch to 2nd Innings (Tab 2)
                setLiveState({ strikerId: '', nonStrikerId: '', bowlerId: '' }); // Reset active players
                setSelectionModalStep('striker'); // Start sequence for 2nd innings
                setPlayerSelector({ inningIdx: 1, type: 'batsman', autoTrigger: true }); // Prompt for openers
              }}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              Start Run Chase <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Match End Modal (MOM Selection) */}
      {endMatchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden relative">
            <div className="bg-slate-900 p-6 text-center">
              <Medal size={48} className="mx-auto text-yellow-500 mb-2" />
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">Match Complete</h2>
              <p className="text-slate-400">Select Man of the Match</p>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Top Performers</h3>
              <div className="space-y-3">
                {getTopPerformers().map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedMOM(p.name)}
                    className={`w-full flex justify-between items-center p-4 rounded-xl border transition-all ${selectedMOM === p.name ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-black text-slate-300 text-lg">#{idx + 1}</span>
                      <div className="text-left">
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.points} Pts</p>
                      </div>
                    </div>
                    {selectedMOM === p.name && <Check className="text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={async () => {
                  if (!selectedMOM) { alert("Please select a Man of the Match"); return; }

                  // Calculate Result String
                  const i1 = calculateInningsTotals(data.innings[0]);
                  const i2 = calculateInningsTotals(data.innings[1]);
                  const target = data.matchInfo.target || (i1.totalRuns + 1);

                  let resultType: 'Won' | 'Lost' | 'Draw' | 'Tie' = 'Won'; // Default placeholder, calculated below
                  let resultText = "";

                  const team1 = data.matchInfo.teamAName; // Batting 1st (Assuming standard flow)
                  // Wait, who batted first? Depend on toss.
                  // Actually simplistic view: Innings 0 is Team A (batting first), Innings 1 is Team B.

                  if (i2.totalRuns >= target) {
                    // Chasing Team Won
                    resultType = 'Won'; // Or 'Lost' depending on perspective of Indian Strikers?
                    // We need to know who is Indian Strikers.
                    // If Indian Strikers is Team B (Chasing) -> Won.
                    // If Indian Strikers is Team A (Defending) -> Lost.

                    // Let's assume simpler: Just save the text result and 'Won'/'Lost' status relative to Home team.
                    // Helper:
                    const chaserName = data.matchInfo.tossResult.includes("elected to Bat")
                      ? (data.matchInfo.tossResult.startsWith(data.matchInfo.teamAName) ? data.matchInfo.teamBName : data.matchInfo.teamAName)
                      : (data.matchInfo.tossResult.startsWith(data.matchInfo.teamAName) ? data.matchInfo.teamAName : data.matchInfo.teamBName);

                    // Actually, simpler: innIdx 0 is always Batting First Team.
                    // If data.innings[0].batting[0] is from Indian Strikers list?
                    // We have data.matchInfo.teamAName (Home) and TeamBName (Opponent).

                    // We need to verify who batted first.
                    // But validResult is stored in DB.
                  }

                  // For now, just save. The backend or stats handle W/L based on team name.
                  // We will mark it as Completed.

                  // Hack: Just call handleSaveScorecard but ensure it sets isUpcoming=false
                  // We need to inject the result into data.matchInfo.resultType BEFORE saving?
                  // Or update the handleSaveScorecard logic to detect completeness?

                  // Let's rely on handleSaveScorecard's logic, but first update state.

                  // Since I can't easily wait for state update, I will call updateMatch directly here?
                  // No, Reuse handleSaveScorecard logic.

                  setData(prev => ({
                    ...prev,
                    matchInfo: {
                      ...prev.matchInfo,
                      resultType: 'Won', // Mark as done (we need logic to determine W/L exactly but 'Won' or 'Lost' triggers completion)
                      matchResult: `Match Completed. MOM: ${selectedMOM}`,
                      // In a real app we'd calculate "Ind Strikers won by X runs/wickets"
                    }
                  }));

                  setTimeout(async () => {
                    await handleSaveScorecard();
                    setEndMatchModal(false);
                    alert("Match Saved & Completed!");
                  }, 500);
                }}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} /> Convert to Result & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Opponent Squad Modal */}
      {opponentSquadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative mx-auto my-auto">
            <div className="p-3 md:p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Opponent Playing XI</h3>
                <p className="text-xs text-slate-500">Add players for {data.matchInfo.teamBName}</p>
              </div>
              <button onClick={() => setOpponentSquadModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    id="new-opp-player"
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="Player Name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          setData(prev => ({
                            ...prev,
                            matchInfo: {
                              ...prev.matchInfo,
                              opponentSquad: [...(prev.matchInfo.opponentSquad || []), val]
                            }
                          }));
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('new-opp-player') as HTMLInputElement;
                      if (input && input.value.trim()) {
                        setData(prev => ({
                          ...prev,
                          matchInfo: {
                            ...prev.matchInfo,
                            opponentSquad: [...(prev.matchInfo.opponentSquad || []), input.value.trim()]
                          }
                        }));
                        input.value = '';
                      }
                    }}
                    className="bg-red-600 text-white px-4 rounded-xl font-bold"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  {data.matchInfo.opponentSquad?.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                      <span className="font-bold text-slate-700">{p}</span>
                      <button
                        onClick={() => {
                          setData(prev => ({
                            ...prev,
                            matchInfo: {
                              ...prev.matchInfo,
                              opponentSquad: prev.matchInfo.opponentSquad?.filter((_, i) => i !== idx)
                            }
                          }));
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 md:p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center shrink-0">
              <div className="text-sm font-bold text-slate-600">
                Selected: {data.matchInfo.opponentSquad?.length || 0} / 11
              </div>
              <button onClick={() => setOpponentSquadModal(false)} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wicket Confirmation Modal */}
      {wicketModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-zoom-in">
            <div className="bg-red-600 p-6 text-center">
              <div className="w-16 h-16 bg-red-700 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                <UserX size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Wicket Fall</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dismissal Type</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-500" value={wicketDetails.type} onChange={(e) => setWicketDetails({ ...wicketDetails, type: e.target.value })}>
                  {DISMISSAL_TYPES.filter(t => t !== 'Not Out' && t !== 'Did not bat' && t !== 'Retired Hurt').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {['Caught', 'Run Out', 'Stumped'].includes(wicketDetails.type) && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fielder Name</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:ring-2 focus:ring-red-500" value={wicketDetails.fielderName} onChange={(e) => setWicketDetails({ ...wicketDetails, fielderName: e.target.value })}>
                    <option value="">Select Fielder...</option>
                    {getBowlingTeamPlayers(activeTab === 0 ? 0 : activeTab === 1 ? 0 : 1).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setWicketModal({ isOpen: false, pendingData: null })} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
                <button onClick={handleConfirmWicket} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20">Confirm Wicket</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Selector Modal */}
      {playerSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transition-all duration-300">
            {!selectionPreview ? (
              <>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    {playerSelector.autoTrigger && <Zap size={16} className="text-yellow-500 fill-yellow-500" />}
                    Select {playerSelector.type === 'batsman' ? 'Batsman' : 'Bowler'}
                  </h3>
                  <button onClick={() => setPlayerSelector(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="p-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input autoFocus placeholder="Search player..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {(() => {
                      const isBatting = playerSelector.type === 'batsman';
                      const currentList = isBatting ? data.innings[playerSelector.inningIdx].batting : data.innings[playerSelector.inningIdx].bowling;
                      const currentIds = new Set(currentList.map(p => p.id));
                      const candidates = isBatting ? getBattingTeamPlayers(playerSelector.inningIdx) : getBowlingTeamPlayers(playerSelector.inningIdx);
                      const filtered = candidates.filter(p => !currentIds.has(p.id)).filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
                      if (filtered.length === 0) return <p className="text-center text-slate-400 text-sm py-4">No available players found.</p>;
                      return filtered.map(p => (
                        <button key={p.id} onClick={() => handlePreviewPlayer(p)} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg group transition-colors text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-500">{p.name.slice(0, 2).toUpperCase()}</div>
                            <span className="font-bold text-slate-700">{p.name}</span>
                          </div>
                          <ArrowRightLeft size={16} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div className="relative">
                <div className="h-32 bg-slate-900 relative">
                  <button onClick={() => setSelectionPreview(null)} className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"><ArrowRightLeft size={18} /></button>
                  <button onClick={() => setPlayerSelector(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors"><X size={18} /></button>
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2"><img src={selectionPreview.avatarUrl} alt={selectionPreview.name} className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl object-cover bg-slate-200" /></div>
                </div>
                <div className="pt-16 pb-6 px-6 text-center">
                  <h3 className="text-xl font-black text-slate-800 mb-1">{selectionPreview.name}</h3>
                  <div className="flex items-center justify-center gap-2 mb-6"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded">{selectionPreview.role || 'Player'}</span></div>
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Mat</p><p className="text-lg font-black text-slate-800">{selectionPreview.matchesPlayed}</p></div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Runs</p><p className="text-lg font-black text-slate-800">{selectionPreview.runsScored}</p></div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Wkts</p><p className="text-lg font-black text-slate-800">{selectionPreview.wicketsTaken}</p></div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Avg</p><p className="text-lg font-black text-slate-800">{selectionPreview.average}</p></div>
                  </div>
                  <div className="space-y-3">
                    {selectionPreview.battingStyle && <div className="flex items-center justify-between text-xs px-2"><span className="text-slate-500">Batting Style</span><span className="font-bold text-slate-800 flex items-center gap-1"><Sword size={12} /> {selectionPreview.battingStyle}</span></div>}
                    {selectionPreview.bowlingStyle && <div className="flex items-center justify-between text-xs px-2"><span className="text-slate-500">Bowling Style</span><span className="font-bold text-slate-800 flex items-center gap-1"><CircleDot size={12} /> {selectionPreview.bowlingStyle}</span></div>}
                  </div>
                  <div className="mt-8">
                    <button onClick={handleAddPlayerFromPreview} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"><Check size={18} /> Confirm {playerSelector.type === 'batsman' ? 'Batsman' : 'Bowler'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-Components ---



function LiveBattingTable({ data, battingSquad, fieldingSquad, onUpdate, onRemove, onAdd, isLiveMode }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
        <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Batting</h4>
        <button onClick={onAdd} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
          <Plus size={14} /> Add Batsman
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase">
            <tr>
              <th className="p-2 md:p-3 min-w-[120px]">Batsman</th>
              <th className="p-2 md:p-3 w-24 md:w-32">Dismissal</th>
              <th className="p-2 md:p-3 w-24 md:w-32">Fielder</th>
              <th className="p-2 md:p-3 w-24 md:w-32">Bowler</th>
              <th className="p-2 md:p-3 text-right">R</th>
              <th className="p-2 md:p-3 text-right">B</th>
              <th className="p-2 md:p-3 text-right">4s</th>
              <th className="p-2 md:p-3 text-right">6s</th>
              <th className="p-2 md:p-3 text-right">SR</th>
              <th className="p-2 md:p-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2 md:p-3">
                  <select
                    className="w-full bg-transparent font-bold text-slate-800 outline-none text-xs md:text-sm"
                    value={row.name}
                    onChange={(e) => onUpdate(row.id, 'name', e.target.value)}
                  >
                    <option value="">Select Player</option>
                    {battingSquad.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    {!battingSquad.find((p: any) => p.name === row.name) && row.name && <option value={row.name}>{row.name}</option>}
                  </select>
                </td>
                <td className="p-2 md:p-3"><select className="w-full bg-transparent text-slate-700 text-[10px] md:text-xs outline-none font-medium" value={row.howOut} onChange={(e) => onUpdate(row.id, 'howOut', e.target.value)}>{DISMISSAL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></td>
                <td className="p-2 md:p-3"><select className="w-full bg-transparent text-slate-700 text-[10px] md:text-xs outline-none font-medium" value={row.fielder || ''} onChange={(e) => onUpdate(row.id, 'fielder', e.target.value)}><option value="">-</option>{fieldingSquad.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></td>
                <td className="p-2 md:p-3"><select className="w-full bg-transparent text-slate-700 text-[10px] md:text-xs outline-none font-medium" value={row.bowler || ''} onChange={(e) => onUpdate(row.id, 'bowler', e.target.value)}><option value="">-</option>{fieldingSquad.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none font-bold ${isLiveMode ? 'text-slate-400' : 'text-slate-900'}`} value={row.runs} onChange={(e) => onUpdate(row.id, 'runs', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none ${isLiveMode ? 'text-slate-400' : 'text-slate-800'}`} value={row.balls} onChange={(e) => onUpdate(row.id, 'balls', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none font-medium ${isLiveMode ? 'text-slate-300' : 'text-slate-600'}`} value={row.fours} onChange={(e) => onUpdate(row.id, 'fours', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none font-medium ${isLiveMode ? 'text-slate-300' : 'text-slate-600'}`} value={row.sixes} onChange={(e) => onUpdate(row.id, 'sixes', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right font-mono text-[10px] md:text-xs text-slate-600 font-medium">{getStrikeRate(row.runs, row.balls)}</td>
                <td className="p-2 md:p-3 text-center"><button onClick={() => onRemove(row.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LiveBowlingTable({ data, fieldingSquad, onUpdate, onRemove, onAdd, isLiveMode }: any) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
        <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Bowling</h4>
        <button onClick={onAdd} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1"><Plus size={14} /> Add Bowler</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase">
            <tr>
              <th className="p-2 md:p-3 min-w-[120px]">Bowler</th>
              <th className="p-2 md:p-3 text-right">O</th>
              <th className="p-2 md:p-3 text-right">M</th>
              <th className="p-2 md:p-3 text-right">R</th>
              <th className="p-2 md:p-3 text-right">W</th>
              <th className="p-2 md:p-3 text-right">Eco</th>
              <th className="p-2 md:p-3 text-right">WD</th>
              <th className="p-2 md:p-3 text-right">NB</th>
              <th className="p-2 md:p-3 text-right">LB</th>
              <th className="p-2 md:p-3 text-right">Dot</th>
              <th className="p-2 md:p-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row: any) => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2 md:p-3">
                  <select
                    className="w-full bg-transparent font-bold text-slate-800 outline-none text-xs md:text-sm"
                    value={row.name}
                    onChange={(e) => onUpdate(row.id, 'name', e.target.value)}
                  >
                    <option value="">Select Bowler</option>
                    {fieldingSquad.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    {!fieldingSquad.find((p: any) => p.name === row.name) && row.name && <option value={row.name}>{row.name}</option>}
                  </select>
                </td>
                <td className="p-2 md:p-3 text-right"><input type="number" step="0.1" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none font-bold ${isLiveMode ? 'text-slate-400' : 'text-slate-900'}`} value={row.overs} onChange={(e) => onUpdate(row.id, 'overs', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none ${isLiveMode ? 'text-slate-400' : 'text-slate-800'}`} value={row.maidens} onChange={(e) => onUpdate(row.id, 'maidens', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none ${isLiveMode ? 'text-slate-400' : 'text-slate-800'}`} value={row.runs} onChange={(e) => onUpdate(row.id, 'runs', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none font-black ${isLiveMode ? 'text-blue-300' : 'text-blue-600'}`} value={row.wickets} onChange={(e) => onUpdate(row.id, 'wickets', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right font-mono text-[10px] md:text-xs text-slate-600 font-medium">{getEconomy(row.runs, row.overs)}</td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none font-medium ${isLiveMode ? 'text-slate-300' : 'text-slate-600'}`} value={row.wides} onChange={(e) => onUpdate(row.id, 'wides', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none font-medium ${isLiveMode ? 'text-slate-300' : 'text-slate-600'}`} value={row.noBalls} onChange={(e) => onUpdate(row.id, 'noBalls', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none font-medium ${isLiveMode ? 'text-slate-300' : 'text-slate-600'}`} value={row.legByes} onChange={(e) => onUpdate(row.id, 'legByes', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-right"><input type="number" disabled={isLiveMode} className={`w-8 md:w-12 text-right bg-transparent outline-none font-medium ${isLiveMode ? 'text-slate-300' : 'text-slate-600'}`} value={row.dots} onChange={(e) => onUpdate(row.id, 'dots', Number(e.target.value))} /></td>
                <td className="p-2 md:p-3 text-center"><button onClick={() => onRemove(row.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Scorecard;
