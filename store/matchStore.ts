import { create } from 'zustand';
import { Player, ScheduledMatch, Performer, MatchStatus, MatchStage, FullScorecardData, BallRecord } from '../types';
import * as api from '../services/storageService';

const ensureId = (id: any): string => {
    if (!id) return '';
    if (typeof id === 'object' && id.id) return String(id.id);
    return String(id);
};

// --- Types from Live Scorer ---
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

export interface MatchScorerState {
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
    historyStack: any[];
    manOfTheMatch: string | null;
    targetScore?: number;
    useWagonWheel: boolean;
    isWaitingForBowler: boolean;
    wagonWheelQuickSave: boolean;
    pendingMilestone: { type: string, player: string, subText?: string } | null;
    partnership_notified: number[];
    pendingIntroduction: string | null;
    offlineQueue: BallRecord[];
    
    // Central Auth State
    currentUser: AppUser | null;

    // Player Management State
    squadPlayers: Player[];
    opponentPlayers: Player[];
    loading: boolean;
    isLoading: boolean; // Match Center loading state
    error: string | null;
}

export interface UnifiedMatchStore extends MatchScorerState {
    // Match Management State
    matches: ScheduledMatch[];

    // Match Management Actions
    setMatches: (matches: ScheduledMatch[]) => void;
    addMatch: (match: Omit<ScheduledMatch, 'id'>) => Promise<string>;
    updateMatch: (id: string, updates: Partial<ScheduledMatch>) => Promise<void>;
    deleteMatch: (id: string) => Promise<void>;
    setPlayingXI: (id: string, teamType: 'home' | 'opponent', playerIds: string[]) => Promise<void>;
    updateMatchXI: (id: string, teamType: 'home' | 'opponent', playerIds: string[]) => Promise<void>;
    updateMatchStatus: (id: string, status: MatchStatus) => Promise<void>;
    finalizeMatch: (id: string, matchData: any, updatedPlayers: any[]) => Promise<void>;
    syncWithCloud: () => Promise<void>;
    getSortedMatches: () => ScheduledMatch[];
    resetZombieMatches: () => void;
    purgeTestData: () => Promise<void>;
    wipeLocalMatches: () => void;

    // Live Scorer Actions
    initializeMatch: (data: any) => void;
    updateMatchSettings: (data: Partial<MatchScorerState>) => void;
    setToss: (winnerId: string | null, choice: 'Bat' | 'Bowl' | null) => void;
    startInnings: (num: 1 | 2, batId: string, bowlId: string, strId: string, nStrId: string, bwlId: string) => void;
    recordBall: (payload: any) => void;
    recordPenalty: (team: 'batting' | 'bowling', runs: number) => void;
    undoLastBall: () => void;
    switchStriker: () => void;
    setNewBowler: (id: string, name?: string) => void;
    changeBowler: (id: string) => void;
    retireBatter: (id: string) => void;
    updateTargetScore: (score: number) => void;
    resetMatch: () => void;
    clearInnings: () => void;
    declareInnings: () => void;
    hardReset: () => void;
    resetStore: () => void;
    getOvers: (balls: number) => string;
    syncOfflineQueue: () => Promise<void>;
    enqueueOfflineBall: (payload: any) => void;
    clearOfflineQueue: () => void;
    setMilestoneNotified: (batterId: string, type: 'fifty' | 'hundred') => void;
    prepareSyncPayload: () => any;

    // Player Management Actions
    fetchPlayers: () => Promise<void>;
    addPlayer: (player: Player) => Promise<void>;
    updatePlayer: (player: Player) => Promise<void>;
    deletePlayer: (id: string) => Promise<void>;
    handleToggleLock: (matchId: string, currentStatus: boolean) => Promise<void>;
    setCurrentUser: (user: AppUser | null) => void;
}

const INITIAL_SCORER_STATE: MatchScorerState = {
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
    wagonWheelQuickSave: false,
    isWaitingForBowler: false,
    pendingMilestone: null,
    partnership_notified: [],
    pendingIntroduction: null,
    offlineQueue: [],

    // Central Auth
    currentUser: null,

    // Player Management Initial State
    squadPlayers: [],
    opponentPlayers: [],
    loading: false,
    isLoading: false,
    error: null
};

// Helper to get only the scoring-related reset state
const getScoringResetState = (state: UnifiedMatchStore) => ({
    matchId: null,
    matchType: 'T20' as const,
    tournament: '',
    ground: '',
    opponentName: '',
    maxOvers: 20,
    toss: { winnerId: null, choice: null },
    innings1: null,
    innings2: null,
    currentInnings: 1 as (1|2),
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
    wagonWheelQuickSave: false,
    isWaitingForBowler: false,
    pendingMilestone: null,
    partnership_notified: [],
    pendingIntroduction: null,
    offlineQueue: [],
    // Preserve management state
    squadPlayers: state.squadPlayers,
    opponentPlayers: state.opponentPlayers,
    matches: state.matches,
    currentUser: state.currentUser,
    loading: state.loading,
    isLoading: state.isLoading,
    error: state.error
});

export const useMatchCenter = create<UnifiedMatchStore>((set, get) => ({
    // --- Unified State ---
    matches: [],
    ...INITIAL_SCORER_STATE,

    // --- Match Management Actions ---
    setMatches: (matches) => set({ matches }),

    resetZombieMatches: () => set((state: UnifiedMatchStore) => {
        const today = new Date().setHours(0,0,0,0);
        const updatedMatches: ScheduledMatch[] = state.matches.map(match => {
            const matchDate = new Date(match.date).setHours(0,0,0,0);
            if (match.status === 'live' && matchDate < today) {
                return { ...match, status: 'upcoming' as MatchStatus };
            }
            return match;
        });
        return { matches: updatedMatches };
    }),

    addMatch: async (match) => {
        const tempId = (match as any).id || crypto.randomUUID();
        const localMatch = { ...match, id: tempId, status: match.status || 'upcoming' };
        set((state) => ({ matches: [...state.matches, localMatch as ScheduledMatch] }));
        try {
            const savedMatch = await api.addMatch(match);
            set((state) => ({
                matches: state.matches.map(m => m.id === tempId ? savedMatch : m)
            }));
            return savedMatch.id;
        } catch (e) {
            console.error("Cloud save failed:", e);
            return tempId;
        }
    },

    updateMatch: async (id, updates) => {
        const match = get().matches.find(m => m.id === id);
        if (match?.isLocked) {
            console.warn("[Store] Match is locked. Update aborted.");
            return;
        }

        set((state) => ({
            matches: state.matches.map(m => m.id === id ? { ...m, ...updates } : m)
        }));
        try {
            const currentMatch = get().matches.find(m => m.id === id);
            if (!currentMatch) return;
            await api.updateMatch(id, { ...currentMatch, ...updates });
        } catch (e) {
            console.error("Failed to sync update to cloud:", e);
        }
    },

    deleteMatch: async (id) => {
        const match = get().matches.find(m => m.id === id);
        if (match?.isLocked) {
            throw new Error("Cannot delete a locked match.");
        }
        try {
            await api.deleteMatch(id);
            set((state) => ({
                matches: state.matches.filter(m => m.id !== id)
            }));
        } catch (e) {
            console.error("Failed to delete match:", e);
            throw e;
        }
    },

    setPlayingXI: async (id, teamType, playerIds) => {
        const updates = { [teamType === 'home' ? 'homeTeamXI' : 'opponentTeamXI']: playerIds };
        await get().updateMatch(id, updates);
    },

    updateMatchXI: async (id, teamType, playerIds) => {
        const updates = { [teamType === 'home' ? 'homeTeamXI' : 'opponentTeamXI']: playerIds };
        await get().updateMatch(id, updates);
    },

    updateMatchStatus: async (id, status) => {
        await get().updateMatch(id, { status });
    },

    finalizeMatch: async (id, matchData, updatedPlayers) => {
        const match = get().matches.find(m => m.id === id);
        if (match?.isLocked) {
            throw new Error("Match is locked. No further modifications allowed.");
        }

        try {
            await api.finalizeMatch(id, matchData, updatedPlayers);
            set((state) => ({
                matches: state.matches.map(m => m.id === id ? { 
                    ...m, 
                    ...matchData, 
                    status: 'completed' as MatchStatus,
                    isCareerSynced: matchData.isCareerSynced ?? m.isCareerSynced,
                    isLocked: true // Automatically lock on finalize
                } : m)
            }));
        } catch (e: any) {
            console.error("Failed to finalize match:", e);
            throw new Error(`Sync Failed: ${e.message}`);
        }
    },

    syncWithCloud: async () => {
        if (get().isLoading) {
            console.log("[Store] syncWithCloud skipped - already loading");
            return;
        }
        
        set({ isLoading: true, error: null });
        const maxAttempts = 3;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[Store] Syncing matches (attempt ${attempt}/${maxAttempts})...`);
                const rawDbMatches = (await api.getMatches()) || [];
                const dbMatches = rawDbMatches.filter(m => !m.is_test && m.id !== '00000000-0000-0000-0000-000000000001');
                
                // If we got data, set it and break. If we got an empty list on the last attempt, also set it.
                if (dbMatches.length > 0 || attempt === maxAttempts) {
                    set({ matches: dbMatches, isLoading: false });
                    console.log(`[Store] Sync successful. Found ${dbMatches.length} matches.`);
                    return;
                }
                
                // If empty result (race condition fix), wait and retry
                const delay = attempt * 1000;
                console.log(`[Store] Match list empty, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } catch (e: any) {
                console.error(`[Store] Sync attempt ${attempt} failed:`, e.message);
                if (attempt === maxAttempts) {
                    set({ error: "Failed to connect to cloud database.", isLoading: false });
                    break;
                }
                const delay = attempt * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        set({ isLoading: false });
    },

    getSortedMatches: () => {
        const { matches } = get();
        const cleanMatches = matches.filter(m => !m.is_test && m.id !== '00000000-0000-0000-0000-000000000001');
        return [...cleanMatches].sort((a, b) => {
            const statusOrder = { 'live': 0, 'upcoming': 1, 'completed': 2 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            return a.status === 'upcoming' ? timeA - timeB : timeB - timeA;
        });
    },

    purgeTestData: async () => {
        try {
            const testMatches = get().matches.filter(m => 
                m.is_test || m.opponentName === 'Sandbox XI' || (m.opponentId && String(m.opponentId).includes('sandbox'))
            );
            if (testMatches.length === 0) return;
            for (const m of testMatches) {
                await api.deleteMatchStats(m.id);
                await api.deleteMatch(m.id);
            }
            set((state) => ({
                matches: state.matches.filter(m => !testMatches.some(tm => tm.id === m.id))
            }));
        } catch (e) {
            console.error("Purge failed:", e);
        }
    },

    wipeLocalMatches: () => {
        set({ matches: [] });
    },

    // --- Live Scorer Actions ---
    hardReset: () => set(getScoringResetState(get())),
    resetStore: () => set(getScoringResetState(get())),

    initializeMatch: (data) => {
        const current = get();
        // IMMUTABLE LOCK GUARD
        if (data.isLocked) {
            console.log("[Store] Initializing in Read-Only Mode (Locked)");
            set({ 
                ...getScoringResetState(current),
                ...data.liveData,
                matchId: data.matchId,
                matchType: data.matchType,
                isFinished: true // Force finished state for UI
            });
            return;
        }

        if (data.liveData && Object.keys(data.liveData).length > 0) {
            let parsedData = data.liveData;
            if (typeof data.liveData === 'string') {
                try { parsedData = JSON.parse(data.liveData); } catch (e) {}
            }
            if (parsedData.innings1) {
                set({ 
                    ...getScoringResetState(current),
                    ...parsedData,
                    matchId: ensureId(data.matchId),
                    matchType: data.matchType || parsedData.matchType,
                    tournament: data.tournament || parsedData.tournament,
                    ground: data.ground || parsedData.ground,
                    opponentName: data.opponentName || parsedData.opponentName,
                    maxOvers: data.maxOvers || parsedData.maxOvers,
                    homeXI: data.homeXI || (parsedData.homeXI || []),
                    awayXI: data.awayXI || (parsedData.awayXI || []),
                    homeLogo: data.homeLogo || parsedData.homeLogo,
                    awayLogo: data.awayLogo || parsedData.awayLogo,
                    strikerId: ensureId(parsedData.strikerId),
                    nonStrikerId: ensureId(parsedData.nonStrikerId),
                    currentBowlerId: ensureId(parsedData.currentBowlerId)
                });
                return;
            }
        }

        set({ 
            ...getScoringResetState(current), 
            matchId: data.matchId,
            matchType: data.matchType,
            tournament: data.tournament,
            ground: data.ground,
            opponentName: data.opponentName,
            maxOvers: data.maxOvers,
            homeXI: data.homeXI || [],
            awayXI: data.awayXI || [],
            homeLogo: data.homeLogo || '',
            awayLogo: data.awayLogo || ''
        });
    },

    updateMatchSettings: (data) => {
        const { matches, matchId } = get();
        const m = matches.find(x => x.id === matchId);
        if (m?.isLocked) return;
        set((state) => ({ ...state, ...data }));
    },

    setToss: (winnerId, choice) => {
        const { matches, matchId } = get();
        const m = matches.find(x => x.id === matchId);
        if (m?.isLocked) return;
        set({ toss: { winnerId, choice } });
    },

    startInnings: (num, batId, bowlId, strId, nStrId, bwlId) => {
        const { matches, matchId } = get();
        const m = matches.find(x => x.id === matchId);
        if (m?.isLocked) return;

        set({
            currentInnings: num,
            strikerId: ensureId(strId),
            nonStrikerId: ensureId(nStrId),
            currentBowlerId: ensureId(bwlId),
            isFreeHit: false,
            isFinished: false,
            [num === 1 ? 'innings1' : 'innings2']: {
                battingTeamId: batId,
                bowlingTeamId: bowlId,
                totalRuns: 0,
                wickets: 0,
                totalBalls: 0,
                extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
                battingStats: {
                    [ensureId(strId)]: { id: ensureId(strId), name: 'Striker', runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting', index: 0, fifty_notified: false, hundred_notified: false },
                    [ensureId(nStrId)]: { id: ensureId(nStrId), name: 'Non-Striker', runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting', index: 1, fifty_notified: false, hundred_notified: false }
                },
                bowlingStats: {
                    [ensureId(bwlId)]: { id: ensureId(bwlId), name: 'Bowler', overs: 0, maidens: 0, runs: 0, wickets: 0, index: 0 }
                },
                fallOfWickets: [],
                history: []
            },
            partnership_notified: []
        });

        // Force Sync on Innings Start
        const updatedState = get();
        if (updatedState.matchId) {
            api.updateMatch(updatedState.matchId, { 
                live_data: updatedState.prepareSyncPayload(), 
                last_updated: new Date().toISOString() 
            }).catch(console.error);
        }
    },

    recordBall: (payload) => {
        const state = get();
        const m = state.matches.find(x => x.id === state.matchId);
        if (m?.isLocked) return;

        const innings = state.currentInnings === 1 ? state.innings1 : state.innings2;
        if (!innings || state.isWaitingForBowler) return;

        const inningsKey = state.currentInnings === 1 ? 'innings1' : 'innings2';
        if (!state.strikerId || !state.currentBowlerId) return;

        const prevState = JSON.parse(JSON.stringify({ ...state, historyStack: [] }));

        const { runs, type, isWicket, wicketType, subType = 'bat', outPlayerId, newBatterId, zone } = payload;
        const isWide = type === 'wide';
        const isNoBall = type === 'no-ball';
        const isLegal = !isWide && !isNoBall;
        const extraRuns = (isWide || isNoBall) ? 1 : 0;
        const batsmenRuns = (subType === 'bat' && (type === 'legal' || type === 'no-ball')) ? runs : 0;

        const nextInnings = JSON.parse(JSON.stringify(innings));
        nextInnings.totalRuns += runs + extraRuns;
        nextInnings.totalBalls += isLegal ? 1 : 0;
        if (isWicket && wicketType !== 'Retired Hurt') nextInnings.wickets += 1;
        
        if (isWide) nextInnings.extras.wides += 1 + runs;
        if (isNoBall) nextInnings.extras.noBalls += 1;
        if (type === 'bye' || (isNoBall && subType === 'bye')) nextInnings.extras.byes += runs;
        if (type === 'leg-bye' || (isNoBall && subType === 'lb')) nextInnings.extras.legByes += runs;

        const b = nextInnings.battingStats[state.strikerId];
        if (b) {
            b.runs += batsmenRuns;
            b.balls += (type !== 'wide') ? 1 : 0;
            if (batsmenRuns === 4) b.fours += 1;
            if (batsmenRuns === 6) b.sixes += 1;
            if (isWicket) {
                b.status = wicketType === 'Retired Hurt' ? 'retired_hurt' : 'out';
                b.outHow = wicketType;
            }
        }

        const bw = nextInnings.bowlingStats[state.currentBowlerId];
        if (bw) {
            const isTrulyExtra = type === 'bye' || type === 'leg-bye' || (isNoBall && subType !== 'bat');
            bw.runs += (isWide ? (1 + runs) : (isNoBall ? (1 + (subType === 'bat' ? runs : 0)) : (isTrulyExtra ? 0 : runs)));
            if (isWicket && !['Run Out', 'Retired Hurt'].includes(wicketType || '')) bw.wickets += 1;
            const totalBallsByHim = Math.floor(bw.overs) * 6 + Math.round((bw.overs % 1) * 10) + (isLegal ? 1 : 0);
            bw.overs = Math.floor(totalBallsByHim / 6) + (totalBallsByHim % 6 / 10);
        }

        let sId: string | null = state.strikerId;
        let nsId: string | null = state.nonStrikerId;
        if (isWicket) {
            const victimId = outPlayerId || state.strikerId;
            if (victimId === sId) sId = newBatterId || null;
            else nsId = newBatterId || null;
            if (sId && !nextInnings.battingStats[sId]) {
                nextInnings.battingStats[sId] = { id: sId, name: 'Unknown', runs: 0, balls: 0, fours: 0, sixes: 0, status: 'batting', index: Object.keys(nextInnings.battingStats).length, fifty_notified: false, hundred_notified: false };
            }
        }
        if (runs % 2 !== 0) {
            const temp = sId;
            sId = nsId;
            nsId = temp;
        }

        const ballRecord: BallRecord = {
            ballIndex: nextInnings.totalBalls,
            overNumber: Math.floor((nextInnings.totalBalls - (isLegal ? 1 : 0)) / 6),
            ballNumber: ((nextInnings.totalBalls - (isLegal ? 1 : 0)) % 6) + 1,
            runs,
            extraRuns,
            type,
            isWicket,
            wicketType,
            strikerId: state.strikerId || undefined,
            nonStrikerId: state.nonStrikerId || undefined,
            bowlerId: state.currentBowlerId || undefined,
            isLegal,
            commentary: payload.commentary || '',
            wagon_wheel_zone: zone,
            timestamp: new Date().toISOString()
        };

        nextInnings.history = [...(nextInnings.history || []), ballRecord];

        // --- Milestone Detection (Atomic) ---
        let milestone: { type: string, player: string, subText?: string } | null = null;
        
        // Batting Milestones (50, 100)
        if (subType === 'bat' && b) {
            if (b.runs >= 100 && !b.hundred_notified) {
                b.hundred_notified = true;
                milestone = { type: 'hundred', player: b.name };
            } else if (b.runs >= 50 && !b.fifty_notified) {
                b.fifty_notified = true;
                milestone = { type: 'fifty', player: b.name };
            }
        }

        // Bowling Milestones (4W, 5W, Hat-trick)
        if (isWicket && bw) {
            // Check for Hat-trick (3 consecutive wickets in history for this bowler)
            const bowlerBalls = (nextInnings.history || []).filter((bl: BallRecord) => bl.bowlerId === state.currentBowlerId && bl.isLegal);
            if (bowlerBalls.length >= 3) {
                const last3 = bowlerBalls.slice(-3);
                // Wicket types that count for hat-tricks (exclude Run Out, Retired, etc. as per standard rules)
                const isHatTrick = last3.every((bl: BallRecord) => bl.isWicket && !['Run Out', 'Retired Hurt', 'Retired Out', 'Timed Out', 'Obstructing the Field'].includes(bl.wicketType || ''));
                if (isHatTrick) {
                    milestone = { type: 'hat_trick', player: bw.name };
                }
            }

            // Wicket hauls
            if (bw.wickets === 5) {
                milestone = { type: 'five_wicket', player: bw.name, subText: `${bw.wickets}-${bw.runs}` };
            } else if (bw.wickets === 4 && !milestone) { // Don't overwrite hat-trick or 5W if already set
                milestone = { type: 'four_wicket', player: bw.name, subText: `${bw.wickets}-${bw.runs}` };
            }
        }

        let finished = state.isFinished;
        if (state.currentInnings === 2) {
            const innings1Runs = state.innings1?.totalRuns || 0;
            if (nextInnings.totalRuns > innings1Runs || nextInnings.wickets === 10 || nextInnings.totalBalls >= (state.maxOvers * 6)) {
                finished = true;
            }
        }

        const isOverComplete = nextInnings.totalBalls % 6 === 0 && isLegal && !finished;

        // --- OVER END STRIKE ROTATION ---
        // V2.6.8: If over is complete, swap striker/non-striker positions
        if (isOverComplete) {
            const temp = sId;
            sId = nsId;
            nsId = temp;
        }

        set({
            [inningsKey]: nextInnings,
            strikerId: sId,
            nonStrikerId: nsId,
            isFinished: finished,
            isWaitingForBowler: isOverComplete,
            currentBowlerId: isOverComplete ? null : state.currentBowlerId,
            pendingMilestone: milestone,
            historyStack: [...state.historyStack, prevState].slice(-20)
        });

        // --- FORCE IMMEDIATE CLOUD SYNC ---
        // V2.6.8: Push to database immediately after state update
        const updatedState = get();
        if (updatedState.matchId) {
            const payload = updatedState.prepareSyncPayload();
            api.updateMatch(updatedState.matchId, { 
                live_data: payload, 
                last_updated: new Date().toISOString() 
            }).catch(err => console.error("[Store] Immediate sync failed:", err));
        }
    },

    recordPenalty: (side, runs) => {
        const state = get();
        const m = state.matches.find(x => x.id === state.matchId);
        if (m?.isLocked) return;

        const currentKey = state.currentInnings === 1 ? 'innings1' : 'innings2';
        const targetKey = side === 'batting' ? currentKey : (state.currentInnings === 1 ? 'innings2' : 'innings1');
        const targetInnings = state[targetKey];
        if (!targetInnings) return;

        const nextInnings = JSON.parse(JSON.stringify(targetInnings));
        nextInnings.totalRuns += runs;
        nextInnings.extras.penalty += runs;
        set({ [targetKey]: nextInnings });

        // Force Sync on Penalty
        const updatedState = get();
        if (updatedState.matchId) {
            api.updateMatch(updatedState.matchId, { 
                live_data: updatedState.prepareSyncPayload(), 
                last_updated: new Date().toISOString() 
            }).catch(console.error);
        }
    },

    undoLastBall: () => {
        const state = get();
        const m = state.matches.find(x => x.id === state.matchId);
        if (m?.isLocked) return;

        const { historyStack } = state;
        if (historyStack.length === 0) return;
        const prevState = historyStack[historyStack.length - 1];
        set({ ...prevState, historyStack: historyStack.slice(0, -1) });

        // Force Sync on Undo
        const updatedState = get();
        if (updatedState.matchId) {
            api.updateMatch(updatedState.matchId, { 
                live_data: updatedState.prepareSyncPayload(), 
                last_updated: new Date().toISOString() 
            }).catch(console.error);
        }
    },

    switchStriker: () => {
        const { matches, matchId } = get();
        const m = matches.find(x => x.id === matchId);
        if (m?.isLocked) return;
        set((state) => ({ strikerId: state.nonStrikerId, nonStrikerId: state.strikerId }));
    },

    setNewBowler: (id, name) => set({ currentBowlerId: id, isWaitingForBowler: false }),
    changeBowler: (id) => set({ currentBowlerId: id }),
    retireBatter: (id) => {
        const state = get();
        const m = state.matches.find(x => x.id === state.matchId);
        if (m?.isLocked) return;

        const key = state.currentInnings === 1 ? 'innings1' : 'innings2';
        const nextInnings = JSON.parse(JSON.stringify(state[key]));
        if (nextInnings.battingStats[id]) {
            nextInnings.battingStats[id].status = 'retired_hurt';
            nextInnings.battingStats[id].outHow = 'Retired Hurt';
        }
        set({ [key]: nextInnings, strikerId: state.strikerId === id ? null : state.strikerId, nonStrikerId: state.nonStrikerId === id ? null : state.nonStrikerId });
    },
    updateTargetScore: (score) => set({ targetScore: score }),
    resetMatch: () => set(INITIAL_SCORER_STATE),
    clearInnings: () => set(INITIAL_SCORER_STATE),
    declareInnings: () => {
        const state = get();
        set({ isFinished: state.currentInnings === 2, isWaitingForBowler: false });
    },
    getOvers: (balls) => `${Math.floor(balls / 6)}.${balls % 6}`,
    syncOfflineQueue: async () => {},
    enqueueOfflineBall: (payload) => set((s) => ({ offlineQueue: [...s.offlineQueue, payload] })),
    clearOfflineQueue: () => set({ offlineQueue: [] }),
    setMilestoneNotified: (batterId, type) => {
        const state = get();
        const key = state.currentInnings === 1 ? 'innings1' : 'innings2';
        const nextInnings = JSON.parse(JSON.stringify(state[key]));
        if (nextInnings.battingStats[batterId]) {
            if (type === 'fifty') nextInnings.battingStats[batterId].fifty_notified = true;
            if (type === 'hundred') nextInnings.battingStats[batterId].hundred_notified = true;
        }
        set({ [key]: nextInnings });
    },

    // PLAYER MANAGEMENT IMPLEMENTATION
    fetchPlayers: async () => {
        set({ loading: true, error: null });
        try {
            const players = await api.getPlayers();
            const allPlayers = players || [];
            
            set({
                squadPlayers: allPlayers.filter(p => p.teamId === 'IND_STRIKERS'),
                opponentPlayers: allPlayers.filter(p => p.teamId !== 'IND_STRIKERS'),
                loading: false
            });
        } catch (err: any) {
            set({ error: err.message || 'Failed to fetch players', loading: false });
        }
    },

    addPlayer: async (player) => {
        try {
            const res = await api.addPlayer(player);
            // StorageService already returns a mapped Player object with teamId
            const newPlayer = res;
            if (newPlayer.teamId === 'IND_STRIKERS') {
                set((state) => ({ squadPlayers: [newPlayer, ...state.squadPlayers] }));
            } else {
                set((state) => ({ opponentPlayers: [newPlayer, ...state.opponentPlayers] }));
            }
        } catch (err: any) {
            throw err;
        }
    },

    updatePlayer: async (updatedPlayer) => {
        try {
            await api.updatePlayer(updatedPlayer);
            const stablePlayer = {
                ...updatedPlayer,
                teamId: updatedPlayer.isClubPlayer ? 'IND_STRIKERS' : (updatedPlayer.primaryTeamId || 'OPPONENT')
            };
            if (stablePlayer.teamId === 'IND_STRIKERS') {
                set((state) => ({
                    squadPlayers: state.squadPlayers.map(p => p.id === stablePlayer.id ? stablePlayer : p)
                }));
            } else {
                set((state) => ({
                    opponentPlayers: state.opponentPlayers.map(p => p.id === stablePlayer.id ? stablePlayer : p)
                }));
            }
        } catch (err: any) {
            throw err;
        }
    },

    deletePlayer: async (id) => {
        try {
            await api.deletePlayer(id);
            set((state) => ({
                squadPlayers: state.squadPlayers.filter(p => p.id !== id),
                opponentPlayers: state.opponentPlayers.filter(p => p.id !== id)
            }));
        } catch (err: any) {
            throw err;
        }
    },

    handleToggleLock: async (matchId: string, currentStatus: boolean) => {
        const match = get().matches.find(m => m.id === matchId);
        if (!match) return;

        const targetStatus = !currentStatus;
        try {
            if (targetStatus) {
                // LOCKING: Extract primitive values to match database schema
                const score = match.finalScoreHome || { runs: 0, wickets: 0, overs: 0 };
                
                // Convert overs (e.g. 18.2) to total balls
                const overs = Number(score.overs || 0);
                const overParts = String(overs).split('.');
                const balls = (parseInt(overParts[0]) * 6) + (parseInt(overParts[1]) || 0);

                await api.updateMatch(matchId, {
                    final_score_home: score.runs,
                    total_runs: score.runs,
                    total_wickets: score.wickets,
                    total_balls: balls,
                    is_locked: true
                } as any);
            } else {
                // UNLOCKING
                await api.updateMatch(matchId, { is_locked: false } as any);
            }

            set((state) => ({
                matches: state.matches.map(m => m.id === matchId ? { ...m, isLocked: targetStatus } : m)
            }));
        } catch (err) {
            console.error("Failed to toggle lock:", err);
            throw err;
        }
    },

    setCurrentUser: (user) => set({ currentUser: user }),

    prepareSyncPayload: () => {
        const state = get();

        // ── DESTRUCTIVE FILTER ──────────────────────────────────────────────────
        // Only extract the bare minimum needed to rehydrate a live scoring session.
        // NEVER include: squadPlayers, opponentPlayers, matches, historyStack,
        // currentUser (has photoURL), or any nested objects not needed for scoring.
        const payload = {
            // Match identity
            matchId:        state.matchId,
            matchType:      state.matchType,
            tournament:     state.tournament,
            ground:         state.ground,
            opponentName:   state.opponentName,
            maxOvers:       state.maxOvers,
            targetScore:    state.targetScore ?? 0,

            // Toss
            toss: state.toss,

            // Live innings blobs (the real data)
            innings1: state.innings1,
            innings2: state.innings2,
            currentInnings: state.currentInnings,

            // Active player IDs only — never full player objects
            strikerId:      state.strikerId,
            nonStrikerId:   state.nonStrikerId,
            currentBowlerId: state.currentBowlerId,

            // Flags
            isFreeHit:          state.isFreeHit,
            isFinished:         state.isFinished,
            isWaitingForBowler: state.isWaitingForBowler,
            useWagonWheel:      state.useWagonWheel,
            wagonWheelQuickSave: state.wagonWheelQuickSave,

            // XI — IDs only, never full player objects
            homeXI: (state.homeXI || []).map(p => (typeof p === 'object' && p !== null) ? (p as any).id : p),
            awayXI: (state.awayXI || []).map(p => (typeof p === 'object' && p !== null) ? (p as any).id : p),

            // Milestone tracking (tiny)
            partnership_notified: state.partnership_notified ?? [],
        };

        // ── 50 KB SIZE GUARD ────────────────────────────────────────────────────
        const serialized = JSON.stringify(payload);
        const sizeKb = Math.round(serialized.length / 1024);
        if (sizeKb > 50) {
            console.warn(`[prepareSyncPayload] WARNING: payload is ${sizeKb}kb — exceeds 50kb target. Check innings1/innings2 history arrays.`);
        } else {
            console.log(`[prepareSyncPayload] Payload size: ${sizeKb}kb ✓`);
        }

        return payload;
    }
}));

export const useCricketScorer = useMatchCenter;
