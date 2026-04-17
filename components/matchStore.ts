import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- TYPES ---
export interface LivePlayer {
    id: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    status: 'batting' | 'out' | 'dnb' | 'retired_hurt';
    outHow?: string;
    index?: number;
    fifty_notified?: boolean;
    hundred_notified?: boolean;
}

export interface LiveBowler {
    id: string;
    name: string;
    overs: number;
    maidens: number;
    runs: number;
    wickets: number;
    index?: number;
}

export interface BallRecord {
    ballIndex: number; 
    overNumber: number; 
    ballInOver: number; 
    runs: number;
    extraRuns: number;
    type: 'legal' | 'wide' | 'no-ball' | 'bye' | 'leg-bye';
    isWicket: boolean;
    wicketType?: 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped' | 'Hit Wicket' | 'Retired Hurt' | 'Retired Out' | 'Timed Out' | 'Obstructing the Field';
    batterId: string;
    bowlerId: string;
    isLegal: boolean;
    commentary: string;
    zone?: string;
}

export interface InningsState {
    battingTeamId: string;
    bowlingTeamId: string;
    totalRuns: number;
    wickets: number;
    totalBalls: number;
    extras: {
        wides: number;
        noBalls: number;
        byes: number;
        legByes: number;
        penalty: number;
    };
    battingStats: Record<string, LivePlayer>;
    bowlingStats: Record<string, LiveBowler>;
    fallOfWickets: string[];
    history: BallRecord[];
}

export interface MatchState {
    matchId: string | null;
    matchType: 'T20' | 'One Day';
    tournament: string;
    ground: string;
    opponentName: string;
    maxOvers: number;
    toss: {
        winnerId: string | null;
        choice: 'Bat' | 'Bowl' | null;
    };
    innings1: InningsState | null;
    innings2: InningsState | null;
    currentInnings: 1 | 2;
    strikerId: string | null;
    nonStrikerId: string | null;
    currentBowlerId: string | null;
    isFreeHit: boolean;
    isFinished: boolean;
    homeXI: string[];
    awayXI: string[];
    homeLogo?: string;
    awayLogo?: string;
    historyStack: MatchState[];
    manOfTheMatch: string | null;
    targetScore?: number;
    useWagonWheel: boolean;
    setMilestoneNotified: (batterId: string, type: 'fifty' | 'hundred') => void;
    isWaitingForBowler: boolean;
}

interface ScorerStore extends MatchState {
    initializeMatch: (data: {
        matchId: string;
        matchType: 'T20' | 'One Day';
        tournament: string;
        ground: string;
        opponentName: string;
        maxOvers: number;
        homeXI?: string[];
        awayXI?: string[];
        homeLogo?: string;
        awayLogo?: string;
        liveData?: any;
    }) => void;
    updateMatchSettings: (data: Partial<MatchState>) => void;
    setToss: (winnerId: string | null, choice: 'Bat' | 'Bowl' | null) => void;
    startInnings: (num: 1 | 2, batId: string, bowlId: string, strId: string, nStrId: string, bwlId: string) => void;
    recordBall: (payload: {
        runs: number;
        type: BallRecord['type'];
        isWicket: boolean;
        wicketType?: BallRecord['wicketType'];
        subType?: 'bat' | 'bye' | 'lb';
        outPlayerId?: string;
        newBatterId?: string;
        zone?: string;
        commentary?: string;
    }) => void;
    recordPenalty: (team: 'batting' | 'bowling', runs: number) => void;
    undoLastBall: () => void;
    switchStriker: () => void;
    setNewBowler: (id: string) => void;
    changeBowler: (id: string) => void;
    retireBatter: (id: string) => void;
    declareInnings: () => void;
    updateTargetScore: (score: number) => void;
    resetMatch: () => void;
    clearInnings: () => void;
    hardReset: () => void;
    resetStore: () => void;
    getOvers: (balls: number) => string;
}

const INITIAL_STATE: MatchState = {
    matchId: null,
    matchType: 'T20',
    tournament: '',
    ground: '',
    opponentName: '',
    maxOvers: 20,
    toss: { winnerId: null, choice: null },
    innings1: null,
    innings2: null,
    currentInnings: 1,
    strikerId: null,
    nonStrikerId: null,
    currentBowlerId: null,
    isFreeHit: false,
    isFinished: false,
    homeXI: [],
    awayXI: [],
    homeLogo: '',
    awayLogo: '',
    historyStack: [],
    manOfTheMatch: null,
    targetScore: 0,
    useWagonWheel: false,
    setMilestoneNotified: () => {},
    isWaitingForBowler: false
};

export const useCricketScorer = create<ScorerStore>()(
    persist(
        (set, get) => ({
            ...INITIAL_STATE,

            hardReset: () => {
                sessionStorage.removeItem('ins-cricket-scorer');
                set({ ...INITIAL_STATE });
            },
            resetStore: () => {
                sessionStorage.removeItem('ins-cricket-scorer');
                set({ ...INITIAL_STATE });
            },

            initializeMatch: (data) => {
                const current = get();

                // 1. REHYDRATION LOGIC: If server provides liveData, override completely
                if (data.liveData && Object.keys(data.liveData).length > 0) {
                    // Try parsing if it's a string from db
                    let parsedData = data.liveData;
                    if (typeof data.liveData === 'string') {
                      try { parsedData = JSON.parse(data.liveData); } catch (e) {}
                    }
                    if (parsedData.innings1) {
                         console.log("[Scorer] Rehydrating perfectly from live_data!");
                         set({ 
                             ...INITIAL_STATE,
                             ...parsedData,
                             matchId: data.matchId,
                             matchType: data.matchType,
                             tournament: data.tournament,
                             ground: data.ground,
                             opponentName: data.opponentName,
                             maxOvers: data.maxOvers,
                             homeXI: Array.isArray(data.homeXI) ? data.homeXI : (Array.isArray(parsedData.homeXI) ? parsedData.homeXI : []),
                             awayXI: Array.isArray(data.awayXI) ? data.awayXI : (Array.isArray(parsedData.awayXI) ? parsedData.awayXI : []),
                             isWaitingForBowler: !!parsedData.isWaitingForBowler
                         });
                         return;
                    }
                }

                // If we're already scoring this match and have innings data, don't wipe it — just update metadata & branding
                if (current.matchId === data.matchId && current.innings1) {
                    set({
                        matchType: data.matchType,
                        tournament: data.tournament,
                        ground: data.ground,
                        opponentName: data.opponentName || current.opponentName,
                        maxOvers: data.maxOvers,
                        homeLogo: data.homeLogo || current.homeLogo,
                        awayLogo: data.awayLogo || current.awayLogo,
                        homeXI: (data.homeXI && data.homeXI.length > 0) ? data.homeXI : current.homeXI,
                        awayXI: (data.awayXI && data.awayXI.length > 0) ? data.awayXI : current.awayXI,
                    });
                    return;
                }

                set({ 
                    ...INITIAL_STATE, 
                    matchId: data.matchId,
                    matchType: data.matchType,
                    tournament: data.tournament,
                    ground: data.ground,
                    opponentName: data.opponentName,
                    maxOvers: data.maxOvers,
                    homeXI: Array.isArray(data.homeXI) ? data.homeXI : [],
                    awayXI: Array.isArray(data.awayXI) ? data.awayXI : [],
                    homeLogo: data.homeLogo || '',
                    awayLogo: data.awayLogo || ''
                });
            },

            updateMatchSettings: (data) => set((state) => ({ ...state, ...data })),

            setToss: (winnerId, choice) => set({ toss: { winnerId, choice } }),

            startInnings: (num, batId, bowlId, strId, nStrId, bwlId) => set({
                currentInnings: num,
                strikerId: strId,
                nonStrikerId: nStrId,
                currentBowlerId: bwlId,
                isFreeHit: false, // Reset Free Hit at start of innings
                isFinished: false, // CRITICAL: Reset finish flag
                manOfTheMatch: null, // Reset MOTM
                [num === 1 ? 'innings1' : 'innings2']: {
                    battingTeamId: batId,
                    bowlingTeamId: bowlId,
                    totalRuns: 0,
                    wickets: 0,
                    totalBalls: 0,
                    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
                    battingStats: {
                        [strId]: { id: strId, name: 'Striker', runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting', index: 0 },
                        [nStrId]: { id: nStrId, name: 'Non-Striker', runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting', index: 1 }
                    },
                    bowlingStats: {
                        [bwlId]: { id: bwlId, name: 'Bowler', overs: 0, maidens: 0, runs: 0, wickets: 0, index: 0 }
                    },
                    fallOfWickets: [],
                    history: []
                }
            }),

            recordBall: (payload) => {
                const state = get();
                const innings = state.currentInnings === 1 ? state.innings1 : state.innings2;
                const inningsKey = state.currentInnings === 1 ? 'innings1' : 'innings2';
                
                if (!innings || !state.strikerId || !state.currentBowlerId) {
                    console.error("Missing innings, striker or bowler ID");
                    return;
                }

                // Save current state to stack for UNDO
                const prevState = JSON.parse(JSON.stringify({
                    matchId: state.matchId,
                    toss: state.toss,
                    innings1: state.innings1,
                    innings2: state.innings2,
                    currentInnings: state.currentInnings,
                    strikerId: state.strikerId,
                    nonStrikerId: state.nonStrikerId,
                    currentBowlerId: state.currentBowlerId,
                    isFreeHit: state.isFreeHit,
                    isFinished: state.isFinished,
                    homeXI: state.homeXI,
                    awayXI: state.awayXI,
                    isWaitingForBowler: state.isWaitingForBowler
                }));

                const { runs, type, isWicket, wicketType, subType = 'bat', outPlayerId, newBatterId, zone } = payload;
                const isWide = type === 'wide';
                const isNoBall = type === 'no-ball';
                const isLegal = !isWide && !isNoBall;
                const extraRuns = (isWide || isNoBall) ? 1 : 0;
                
                // Rules: 
                // - Only 'bat' subType counts for batsman runs.
                // - Wides are NEVER bat runs.
                // - No balls can be bat runs or byes/lb.
                const batsmenRuns = (subType === 'bat' && (type === 'legal' || type === 'no-ball')) ? runs : 0;

                // Deep Clone Innings to avoid direct mutation
                const nextInnings = JSON.parse(JSON.stringify(innings));
                nextInnings.totalRuns += runs + extraRuns;
                nextInnings.totalBalls += isLegal ? 1 : 0;
                if (isWicket && wicketType !== 'Retired Hurt') nextInnings.wickets += 1;
                
                if (isWide) nextInnings.extras.wides += 1 + runs;
                if (isNoBall) nextInnings.extras.noBalls += 1;
                if (type === 'bye' || (isNoBall && subType === 'bye')) nextInnings.extras.byes += runs;
                if (type === 'leg-bye' || (isNoBall && subType === 'lb')) nextInnings.extras.legByes += runs;

                // Update Batsman Stats
                const sId_active = state.strikerId!;
                if (!nextInnings.battingStats[sId_active]) {
                    const currentIndex = Object.keys(nextInnings.battingStats).length;
                    nextInnings.battingStats[sId_active] = { id: sId_active, name: 'Unknown', runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting', index: currentIndex };
                }
                const b = nextInnings.battingStats[sId_active];
                b.runs += batsmenRuns;
                b.balls += (type !== 'wide') ? 1 : 0;
                if (batsmenRuns === 4) b.fours += 1;
                if (batsmenRuns === 6) b.sixes += 1;
                if (isWicket) {
                    if (wicketType === 'Retired Hurt') {
                        b.status = 'retired_hurt';
                        b.outHow = 'Retired Hurt';
                    } else {
                        b.status = 'out';
                        b.outHow = wicketType;
                    }
                }

                // Update Bowler Stats
                const bwlId_active = state.currentBowlerId!;
                if (!nextInnings.bowlingStats[bwlId_active]) {
                    const currentIndex = Object.keys(nextInnings.bowlingStats).length;
                    nextInnings.bowlingStats[bwlId_active] = { id: bwlId_active, name: 'Unknown', overs: 0, maidens: 0, runs: 0, wickets: 0, index: currentIndex };
                }
                const bw = nextInnings.bowlingStats[bwlId_active];
                // Bowler runs: bat runs + wides + no-balls. Byes/Leg-byes NOT counted for bowler.
                const isTrulyExtra = type === 'bye' || type === 'leg-bye' || (isNoBall && subType !== 'bat');
                bw.runs += (isWide ? (1 + runs) : (isNoBall ? (1 + (subType === 'bat' ? runs : 0)) : (isTrulyExtra ? 0 : runs)));
                
                const isBowlerWicket = isWicket && !['Run Out', 'Retired Hurt', 'Retired Out', 'Timed Out', 'Obstructing the Field'].includes(wicketType || '');
                if (isBowlerWicket) bw.wickets += 1;
                const totalBallsByHim = Math.floor(bw.overs) * 6 + Math.round((bw.overs % 1) * 10) + (isLegal ? 1 : 0);
                bw.overs = Math.floor(totalBallsByHim / 6) + (totalBallsByHim % 6 / 10);

                // Strike Rotation
                let sId: string | null = state.strikerId;
                let nsId: string | null = state.nonStrikerId;
                
                // Handle Wicket specific rotation
                if (isWicket) {
                    const victimId = outPlayerId || state.strikerId;
                    if (victimId === sId) sId = newBatterId || null;
                    else nsId = newBatterId || null;

                    // If a new batter is coming in (and we're NOT in a final wicket situation)
                    if (sId && !nextInnings.battingStats[sId]) {
                        nextInnings.battingStats[sId] = { 
                            id: sId, 
                            name: 'Unknown', 
                            runs: 0, 
                            balls: 0, 
                            fours: 0, 
                            sixes: 0, 
                            status: 'batting', 
                            index: Object.keys(nextInnings.battingStats).length,
                            fifty_notified: false,
                            hundred_notified: false
                        };
                    }
                    if (nsId && !nextInnings.battingStats[nsId]) {
                        nextInnings.battingStats[nsId] = { 
                            id: nsId, 
                            name: 'Unknown', 
                            runs: 0, 
                            balls: 0, 
                            fours: 0, 
                            sixes: 0, 
                            status: 'batting', 
                            index: Object.keys(nextInnings.battingStats).length,
                            fifty_notified: false,
                            hundred_notified: false
                        };
                    }
                    if (newBatterId && nextInnings.battingStats[newBatterId]) {
                        if (nextInnings.battingStats[newBatterId].status === 'retired_hurt') {
                            nextInnings.battingStats[newBatterId].status = 'batting';
                        }
                    }
                }

                // Normal rotation based on runs
                if (runs % 2 !== 0) [sId, nsId] = [nsId, sId];
                // Construct Ball Record for Timeline
                const ballRecord: any = {
                    runs,
                    type,
                    isWicket,
                    wicketType,
                    bowlerId: bwlId_active,
                    strikerId: sId_active,
                    nonStrikerId: state.nonStrikerId,
                    overNumber: Math.floor((nextInnings.totalBalls - (isLegal ? 1 : 0)) / 6),
                    ballNumber: ((nextInnings.totalBalls - (isLegal ? 1 : 0)) % 6) + 1,
                    isLegal,
                    zone,
                    commentary: payload.commentary || (() => {
                        if (!zone || zone === 'Unknown') return '';
                        const sName = b.name;
                        const zoneMap: any = {
                            'Third Man': runs === 4 ? `Cracking shot! ${sName} steers it past Third Man for four.` : `${sName} guides it towards Third Man for ${runs}.`,
                            'Point': runs === 4 ? `${sName} slices it through Point for a magnificent boundary!` : `Punched away through Point by ${sName}.`,
                            'Cover': runs === 4 ? `Shot! That's creamed through the covers for four.` : `${sName} drives it into the covers.`,
                            'Mid Off': runs === 4 ? `${sName} punches it straight past Mid Off for four.` : `Driven to Mid Off by ${sName}.`,
                            'Mid On': runs === 4 ? `Beautifully timed past Mid On for four!` : `${sName} clips it towards Mid On.`,
                            'Mid Wicket': runs === 4 ? `Pulled away through Mid-wicket for a boundary!` : `Ticked away into the leg side for ${runs}.`,
                            'Square Leg': runs === 4 ? `${sName} flicks it behind Square Leg for four.` : `Tucked away through Square Leg.`,
                            'Fine Leg': runs === 4 ? `${sName} glances it fine for a boundary.` : `Glanced away to Fine Leg.`
                        };
                        return zoneMap[zone] || `${sName} hit it to ${zone} for ${runs}`;
                    })(),
                    timestamp: new Date().toISOString()
                };
                nextInnings.history = [...(nextInnings.history || []), ballRecord];

                // Match Complete check
                let finished = state.isFinished;
                if (state.currentInnings === 2) {
                    const maxBalls = (state.maxOvers || 20) * 6;
                    const innings1Runs = state.innings1?.totalRuns || 0;
                    const runsNeeded = innings1Runs + 1;
                    
                    if (nextInnings.totalRuns >= runsNeeded || nextInnings.wickets === 10 || nextInnings.totalBalls >= maxBalls) {
                        finished = true;
                    }
                }

                set({
                    [inningsKey]: nextInnings,
                    strikerId: sId,
                    nonStrikerId: nsId,
                    isFreeHit: isNoBall || (state.isFreeHit && (isWide || isNoBall)),
                    isFinished: finished,
                    historyStack: [...state.historyStack, prevState].slice(-50)
                });
            },

            recordPenalty: (side, runs) => {
                const state = get();
                const prevState = JSON.parse(JSON.stringify(state));
                delete prevState.historyStack; 

                const currentKey = state.currentInnings === 1 ? 'innings1' : 'innings2';
                const otherKey = state.currentInnings === 1 ? 'innings2' : 'innings1';
                
                const targetKey = side === 'batting' ? currentKey : otherKey;
                const targetInnings = state[targetKey];

                if (targetInnings) {
                    const nextInnings = JSON.parse(JSON.stringify(targetInnings));
                    nextInnings.totalRuns += runs;
                    nextInnings.extras.penalty += runs;

                    const penaltyRecord: any = {
                        runs: 0,
                        penaltyRuns: runs,
                        type: 'penalty',
                        commentary: `Penalty Runs Awarded: ${runs} runs added to the ${side} team total.`,
                        timestamp: new Date().toISOString()
                    };
                    nextInnings.history = [...(nextInnings.history || []), penaltyRecord];

                    set({ 
                        [targetKey]: nextInnings,
                        historyStack: [...state.historyStack, prevState].slice(-50)
                    });
                } else {
                    const currentInningsState = state[currentKey];
                    if (!currentInningsState) return;

                    set({
                        [targetKey]: {
                            battingTeamId: currentInningsState.bowlingTeamId,
                            bowlingTeamId: currentInningsState.battingTeamId,
                            totalRuns: runs,
                            wickets: 0,
                            totalBalls: 0,
                            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: runs },
                            battingStats: {},
                            bowlingStats: {},
                            fallOfWickets: [],
                            history: []
                        },
                        historyStack: [...state.historyStack, prevState].slice(-50)
                    });

                    // Append commentary to the newly created innings
                    const finalState = get();
                    const newInnings = finalState[targetKey];
                    if (newInnings) {
                      const penaltyRecord: any = {
                          runs: 0,
                          penaltyRuns: runs,
                          type: 'penalty',
                          commentary: `Penalty Runs Awarded: ${runs} runs added to the ${side} team total.`,
                          timestamp: new Date().toISOString()
                      };
                      const nextNewInnings = JSON.parse(JSON.stringify(newInnings));
                      nextNewInnings.history = [...(nextNewInnings.history || []), penaltyRecord];
                      set({ [targetKey]: nextNewInnings });
                    }
                }
            },

            undoLastBall: () => {
                const { historyStack, currentInnings, innings2 } = get();
                if (historyStack.length === 0) return;
                
                // Cross-Innings Boundary Protection: 
                // Only block if we are trying to undo the very first action of the 2nd innings 
                // which would revert the match to 1st innings state (potentially dangerous).
                const prevState = historyStack[historyStack.length - 1];
                if (currentInnings === 2 && prevState.currentInnings === 1) {
                    console.warn("Undo blocked: Cannot undo across innings boundary.");
                    return;
                }


                set({
                    ...prevState,
                    historyStack: historyStack.slice(0, -1),
                    isWaitingForBowler: !!prevState.isWaitingForBowler
                });
            },

            switchStriker: () => {
                const state = get();
                const prevState = JSON.parse(JSON.stringify(state));
                delete prevState.historyStack;

                set({
                    strikerId: state.nonStrikerId,
                    nonStrikerId: state.strikerId,
                    historyStack: [...state.historyStack, prevState].slice(-50)
                });
            },

            setNewBowler: (id) => {
                const state = get();
                const currentKey = state.currentInnings === 1 ? 'innings1' : 'innings2';
                const innings = state[currentKey];
                
                if (innings && !innings.bowlingStats[id]) {
                    const nextInnings = JSON.parse(JSON.stringify(innings));
                    nextInnings.bowlingStats[id] = { id, name: 'Unknown', overs: 0, maidens: 0, runs: 0, wickets: 0, index: Object.keys(nextInnings.bowlingStats).length };
                    set({ [currentKey]: nextInnings });
                }

                set({
                    currentBowlerId: id,
                    strikerId: state.nonStrikerId,
                    nonStrikerId: state.strikerId,
                    isWaitingForBowler: false
                });
            },
            changeBowler: (id) => {
                const state = get();
                const currentKey = state.currentInnings === 1 ? 'innings1' : 'innings2';
                const innings = state[currentKey];
                
                if (innings && !innings.bowlingStats[id]) {
                    const nextInnings = JSON.parse(JSON.stringify(innings));
                    nextInnings.bowlingStats[id] = { id, name: 'Unknown', overs: 0, maidens: 0, runs: 0, wickets: 0, index: Object.keys(nextInnings.bowlingStats).length };
                    set({ [currentKey]: nextInnings });
                }
                set({ currentBowlerId: id });
            },
            retireBatter: (id) => {
                const state = get();
                const key = state.currentInnings === 1 ? 'innings1' : 'innings2';
                const innings = state[key];
                if (!innings || !innings.battingStats[id]) return;

                const nextInnings = JSON.parse(JSON.stringify(innings));
                nextInnings.battingStats[id].status = 'retired_hurt';
                nextInnings.battingStats[id].outHow = 'Retired Hurt';

                set({
                    [key]: nextInnings,
                    strikerId: state.strikerId === id ? null : state.strikerId,
                    nonStrikerId: state.nonStrikerId === id ? null : state.nonStrikerId
                });
            },
            declareInnings: () => {
                // Logic handled via UI break modal usually, 
                // but can be used for state-only termination
            },
            updateTargetScore: (score) => set({ targetScore: score }),
            resetMatch: () => set(INITIAL_STATE),
            clearInnings: () => {
                const state = get();
                set({
                    ...INITIAL_STATE,
                    matchId: state.matchId,
                    matchType: state.matchType,
                    ground: state.ground,
                    maxOvers: state.maxOvers,
                    toss: state.toss
                });
            },
            setMilestoneNotified: (batterId, type) => {
                const state = get();
                const key = state.currentInnings === 1 ? 'innings1' : 'innings2';
                const innings = state[key];
                if (!innings || !innings.battingStats[batterId]) return;

                const nextInnings = JSON.parse(JSON.stringify(innings));
                if (type === 'fifty') nextInnings.battingStats[batterId].fifty_notified = true;
                if (type === 'hundred') nextInnings.battingStats[batterId].hundred_notified = true;

                set({ [key]: nextInnings });
            },
            getOvers: (balls) => `${Math.floor(balls / 6)}.${balls % 6}`
        }),
        { 
            name: 'ins-cricket-scorer-storage',
            storage: {
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    try {
                        return str ? JSON.parse(str) : null;
                    } catch (e) {
                        return null;
                    }
                },
                setItem: (name, value) => {
                    const state = { ...value.state };
                    // We keep historyStack in local storage now for better recovery, 
                    // but we prune it if it gets too large (> 200 balls) to stay under 5MB limit
                    if (state.historyStack && state.historyStack.length > 200) {
                        state.historyStack = state.historyStack.slice(-200);
                    }
                    localStorage.setItem(name, JSON.stringify({ state, version: value.version }));
                },
                removeItem: (name) => localStorage.removeItem(name)
            }
        }
    )
);