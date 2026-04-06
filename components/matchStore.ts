import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- TYPES ---
export interface ScorerPlayer {
    id?: string;
    name: string;
    runs: number;
    balls: number;
}

export interface BallRecord {
    runs: number;
    type: 'legal' | 'wide' | 'no-ball';
    isWicket: boolean;
}

export interface MatchState {
    matchId: string | null;
    totalRuns: number;
    wickets: number;
    totalBalls: number;
    history: BallRecord[];
    striker: ScorerPlayer;
    nonStriker: ScorerPlayer;
    battingTeamXI: string[]; // IDs or Names
    bowlingTeamXI: string[]; // IDs or Names
    target: number | null;
    isFirstInnings: boolean;
}

interface ScorerStore extends MatchState {
    initializeMatch: (matchId: string, battingXI: string[], bowlingXI: string[]) => void;
    recordBall: (runs: number, type: 'legal' | 'wide' | 'no-ball', isWicket: boolean) => void;
    undoLastBall: () => void;
    startSecondInnings: () => void;
    resetMatch: () => void;
    getOvers: () => string;
}

const INITIAL_STATE: MatchState = {
    matchId: null,
    totalRuns: 0,
    wickets: 0,
    totalBalls: 0,
    history: [],
    striker: { name: "Striker", runs: 0, balls: 0 },
    nonStriker: { name: "Non-Striker", runs: 0, balls: 0 },
    battingTeamXI: [],
    bowlingTeamXI: [],
    target: null,
    isFirstInnings: true,
};

export const useCricketScorer = create<ScorerStore>()(
    persist(
        (set, get) => ({
            ...INITIAL_STATE,

            initializeMatch: (matchId, battingXI, bowlingXI) => {
                const state = get();
                // Avoid re-initializing if same match is already loaded and has progress
                if (state.matchId === matchId && state.history.length > 0) return;

                set({
                    ...INITIAL_STATE,
                    matchId,
                    battingTeamXI: battingXI,
                    bowlingTeamXI: bowlingXI,
                    striker: { name: battingXI[0] || "Striker", runs: 0, balls: 0 },
                    nonStriker: { name: battingXI[1] || "Non-Striker", runs: 0, balls: 0 },
                });
            },

            recordBall: (runs, type = 'legal', isWicket = false) => set((state) => {
                const extraRun = (type === 'wide' || type === 'no-ball') ? 1 : 0;
                const isLegalBall = type === 'legal';

                let newStriker = {
                    ...state.striker,
                    runs: state.striker.runs + runs,
                    balls: state.striker.balls + (isLegalBall ? 1 : 0)
                };
                let newNonStriker = { ...state.nonStriker };

                if (runs % 2 !== 0) {
                    [newStriker, newNonStriker] = [newNonStriker, newStriker];
                }

                const overFinished = isLegalBall && (state.totalBalls + 1) % 6 === 0;
                if (overFinished) {
                    [newStriker, newNonStriker] = [newNonStriker, newStriker];
                }

                const nextBatsmanIndex = state.wickets + 2; // +2 because 0 and 1 are already in
                const nextBatsmanName = state.battingTeamXI[nextBatsmanIndex] || `Batsman ${state.wickets + 3}`;

                return {
                    totalRuns: state.totalRuns + runs + extraRun,
                    wickets: isWicket ? state.wickets + 1 : state.wickets,
                    totalBalls: isLegalBall ? state.totalBalls + 1 : state.totalBalls,
                    history: [...state.history, { runs, type, isWicket }],
                    striker: isWicket ? { name: nextBatsmanName, runs: 0, balls: 0 } : newStriker,
                    nonStriker: newNonStriker,
                };
            }),

            undoLastBall: () => set((state) => {
                if (state.history.length === 0) return state;
                const lastBall = state.history[state.history.length - 1];
                const isLegalBall = lastBall.type === 'legal';
                const extraRun = (lastBall.type === 'wide' || lastBall.type === 'no-ball') ? 1 : 0;

                // Note: Full undo logic for striker rotation would be complex without full state snapshots,
                // but for now we follow the existing simple logic.
                return {
                    totalRuns: Math.max(0, state.totalRuns - (lastBall.runs + extraRun)),
                    wickets: Math.max(0, lastBall.isWicket ? state.wickets - 1 : state.wickets),
                    totalBalls: Math.max(0, isLegalBall ? state.totalBalls - 1 : state.totalBalls),
                    history: state.history.slice(0, -1),
                };
            }),

            startSecondInnings: () => {
                const state = get();
                set({
                    ...INITIAL_STATE,
                    matchId: state.matchId,
                    target: state.totalRuns + 1,
                    isFirstInnings: false,
                    // Swap teams
                    battingTeamXI: state.bowlingTeamXI,
                    bowlingTeamXI: state.battingTeamXI,
                    striker: { name: state.bowlingTeamXI[0] || "Striker", runs: 0, balls: 0 },
                    nonStriker: { name: state.bowlingTeamXI[1] || "Non-Striker", runs: 0, balls: 0 },
                });
            },

            resetMatch: () => {
                if (window.confirm("Reset all scorer data?")) {
                    set(INITIAL_STATE);
                }
            },

            getOvers: () => {
                const state = get();
                const overs = Math.floor(state.totalBalls / 6);
                const balls = state.totalBalls % 6;
                return `${overs}.${balls}`;
            },
        }),
        {
            name: 'ins-live-scorer-storage',
        }
    )
);