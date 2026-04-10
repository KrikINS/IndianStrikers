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
    status: 'batting' | 'out' | 'dnb';
    outHow?: string;
}

export interface LiveBowler {
    id: string;
    name: string;
    overs: number;
    maidens: number;
    runs: number;
    wickets: number;
}

export interface BallRecord {
    ballIndex: number; 
    overNumber: number; 
    ballInOver: number; 
    runs: number;
    extraRuns: number;
    type: 'legal' | 'wide' | 'no-ball' | 'bye' | 'leg-bye';
    isWicket: boolean;
    wicketType?: 'Bowled' | 'Caught' | 'LBW' | 'Run Out' | 'Stumped' | 'Hit Wicket' | 'Retired';
    batterId: string;
    bowlerId: string;
    commentary: string;
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
    };
    battingStats: Record<string, LivePlayer>;
    bowlingStats: Record<string, LiveBowler>;
    fallOfWickets: string[];
    history: BallRecord[];
}

export interface MatchState {
    matchId: string | null;
    matchType: 'T20' | 'One Day';
    maxOvers: number;
    ground: string;
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
    historyStack: MatchState[];
}

interface ScorerStore extends MatchState {
    initializeMatch: (data: {
        matchId: string;
        matchType: 'T20' | 'One Day';
        ground: string;
        maxOvers: number;
    }) => void;
    updateMatchSettings: (data: Partial<MatchState>) => void;
    setToss: (winnerId: string | null, choice: 'Bat' | 'Bowl' | null) => void;
    startInnings: (num: 1 | 2, batId: string, bowlId: string, strId: string, nStrId: string, bwlId: string) => void;
    recordBall: (payload: {
        runs: number;
        type: BallRecord['type'];
        isWicket: boolean;
        wicketType?: BallRecord['wicketType'];
        newBatterId?: string;
    }) => void;
    undoLastBall: () => void;
    setNewBowler: (id: string) => void;
    resetMatch: () => void;
    clearInnings: () => void;
    getOvers: (balls: number) => string;
}

const INITIAL_STATE: MatchState = {
    matchId: null,
    matchType: 'T20',
    maxOvers: 20,
    ground: '',
    toss: { winnerId: null, choice: null },
    innings1: null,
    innings2: null,
    currentInnings: 1,
    strikerId: null,
    nonStrikerId: null,
    currentBowlerId: null,
    isFreeHit: false,
    isFinished: false,
    historyStack: [],
};

export const useCricketScorer = create<ScorerStore>()(
    persist(
        (set, get) => ({
            ...INITIAL_STATE,

            initializeMatch: (data) => set({ ...INITIAL_STATE, ...data }),

            updateMatchSettings: (data) => set((state) => ({ ...state, ...data })),

            setToss: (winnerId, choice) => set({ toss: { winnerId, choice } }),

            startInnings: (num, batId, bowlId, strId, nStrId, bwlId) => set({
                currentInnings: num,
                strikerId: strId,
                nonStrikerId: nStrId,
                currentBowlerId: bwlId,
                [num === 1 ? 'innings1' : 'innings2']: {
                    battingTeamId: batId,
                    bowlingTeamId: bowlId,
                    totalRuns: 0,
                    wickets: 0,
                    totalBalls: 0,
                    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
                    battingStats: {},
                    bowlingStats: {},
                    fallOfWickets: [],
                    history: []
                }
            }),

            recordBall: (payload) => {
                const state = get();
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
                    isFinished: state.isFinished
                }));

                const { runs, type, isWicket, wicketType, newBatterId } = payload;
                const inningsKey = state.currentInnings === 1 ? 'innings1' : 'innings2';
                const innings = state[inningsKey];
                if (!innings || !state.strikerId || !state.currentBowlerId) return;

                const isWide = type === 'wide';
                const isNoBall = type === 'no-ball';
                const isLegal = !isWide && !isNoBall;
                const extraRuns = (isWide || isNoBall) ? 1 : 0;
                const batsmenRuns = (type === 'legal') ? runs : 0;

                // Deep Clone Innings to avoid direct mutation
                const nextInnings = JSON.parse(JSON.stringify(innings));
                nextInnings.totalRuns += runs + extraRuns;
                nextInnings.totalBalls += isLegal ? 1 : 0;
                if (isWicket) nextInnings.wickets += 1;
                
                if (isWide) nextInnings.extras.wides += 1;
                if (isNoBall) nextInnings.extras.noBalls += 1;
                if (type === 'bye') nextInnings.extras.byes += runs;
                if (type === 'leg-bye') nextInnings.extras.legByes += runs;

                // Update Batsman Stats
                if (!nextInnings.battingStats[state.strikerId]) {
                    nextInnings.battingStats[state.strikerId] = { id: state.strikerId, name: 'Unknown', runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting' };
                }
                const b = nextInnings.battingStats[state.strikerId];
                b.runs += batsmenRuns;
                b.balls += (type !== 'wide') ? 1 : 0;
                if (batsmenRuns === 4) b.fours += 1;
                if (batsmenRuns === 6) b.sixes += 1;
                if (isWicket) b.status = 'out';

                // Update Bowler Stats
                if (!nextInnings.bowlingStats[state.currentBowlerId]) {
                    nextInnings.bowlingStats[state.currentBowlerId] = { id: state.currentBowlerId, name: 'Unknown', overs: 0, maidens: 0, runs: 0, wickets: 0 };
                }
                const bw = nextInnings.bowlingStats[state.currentBowlerId];
                bw.runs += (batsmenRuns + extraRuns + (type === 'bye' || type === 'leg-bye' ? 0 : 0)); // Byes don't count against bowler
                if (isWicket && wicketType !== 'Run Out') bw.wickets += 1;
                const totalBallsByHim = Math.floor(bw.overs) * 6 + Math.round((bw.overs % 1) * 10) + (isLegal ? 1 : 0);
                bw.overs = Math.floor(totalBallsByHim / 6) + (totalBallsByHim % 6 / 10);

                // Strike Rotation
                let sId = state.strikerId;
                let nsId = state.nonStrikerId;
                if (batsmenRuns % 2 !== 0) [sId, nsId] = [nsId, sId];
                if (isLegal && nextInnings.totalBalls % 6 === 0) [sId, nsId] = [nsId, sId];
                if (isWicket && newBatterId) sId = newBatterId;

                set({
                    [inningsKey]: nextInnings,
                    strikerId: sId,
                    nonStrikerId: nsId,
                    isFreeHit: isNoBall,
                    historyStack: [...state.historyStack, prevState].slice(-20)
                });
            },

            undoLastBall: () => {
                const { historyStack } = get();
                if (historyStack.length === 0) return;
                const prevState = historyStack[historyStack.length - 1];
                set({
                    ...prevState,
                    historyStack: historyStack.slice(0, -1)
                });
            },

            setNewBowler: (id) => set({ currentBowlerId: id }),
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
            getOvers: (balls) => `${Math.floor(balls / 6)}.${balls % 6}`
        }),
        { name: 'ins-cricket-scorer' }
    )
);