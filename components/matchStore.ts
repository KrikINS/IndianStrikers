import { useState, useEffect } from 'react';

// --- TYPES ---
export interface Player {
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
    totalRuns: number;
    wickets: number;
    totalBalls: number;
    history: BallRecord[];
    striker: Player;
    nonStriker: Player;
    target: number | null;
    isFirstInnings: boolean;
}

const INITIAL_STATE: MatchState = {
    totalRuns: 0,
    wickets: 0,
    totalBalls: 0,
    history: [],
    striker: { name: "Batsman 1", runs: 0, balls: 0 },
    nonStriker: { name: "Batsman 2", runs: 0, balls: 0 },
    target: null,
    isFirstInnings: true,
};

// --- HOOK ---
export const useCricketScorer = () => {
    const [match, setMatch] = useState<MatchState>(() => {
        const saved = localStorage.getItem('cricketMatch');
        return saved ? JSON.parse(saved) : INITIAL_STATE;
    });

    useEffect(() => {
        localStorage.setItem('cricketMatch', JSON.stringify(match));
    }, [match]);

    const recordBall = (runs: number, type: 'legal' | 'wide' | 'no-ball' = 'legal', isWicket: boolean = false) => {
        setMatch((prev: MatchState) => {
            const extraRun = (type === 'wide' || type === 'no-ball') ? 1 : 0;
            const isLegalBall = type === 'legal';

            let newStriker = {
                ...prev.striker,
                runs: prev.striker.runs + runs,
                balls: prev.striker.balls + (isLegalBall ? 1 : 0)
            };
            let newNonStriker = { ...prev.nonStriker };

            // Strike Rotation: Odd runs swap ends
            if (runs % 2 !== 0) {
                [newStriker, newNonStriker] = [newNonStriker, newStriker];
            }

            // Over End: Swap ends after 6 legal balls
            const overFinished = isLegalBall && (prev.totalBalls + 1) % 6 === 0;
            if (overFinished) {
                [newStriker, newNonStriker] = [newNonStriker, newStriker];
            }

            return {
                ...prev,
                totalRuns: prev.totalRuns + runs + extraRun,
                wickets: isWicket ? prev.wickets + 1 : prev.wickets,
                totalBalls: isLegalBall ? prev.totalBalls + 1 : prev.totalBalls,
                history: [...prev.history, { runs, type, isWicket }],
                striker: isWicket ? { name: `Batsman ${prev.wickets + 3}`, runs: 0, balls: 0 } : newStriker,
                nonStriker: newNonStriker,
            };
        });
    };

    const undoLastBall = () => {
        setMatch((prev: MatchState) => {
            if (prev.history.length === 0) return prev;
            const lastBall = prev.history[prev.history.length - 1];
            const isLegalBall = lastBall.type === 'legal';
            const extraRun = (lastBall.type === 'wide' || lastBall.type === 'no-ball') ? 1 : 0;

            return {
                ...prev,
                totalRuns: Math.max(0, prev.totalRuns - (lastBall.runs + extraRun)),
                wickets: Math.max(0, lastBall.isWicket ? prev.wickets - 1 : prev.wickets),
                totalBalls: Math.max(0, isLegalBall ? prev.totalBalls - 1 : prev.totalBalls),
                history: prev.history.slice(0, -1),
            };
        });
    };

    const startSecondInnings = () => {
        setMatch(prev => ({
            ...INITIAL_STATE,
            target: prev.totalRuns + 1,
            isFirstInnings: false,
        }));
    };

    const resetMatch = () => {
        if (window.confirm("Reset all data?")) {
            setMatch(INITIAL_STATE);
            localStorage.removeItem('cricketMatch');
        }
    };

    const getOvers = () => {
        const overs = Math.floor(match.totalBalls / 6);
        const balls = match.totalBalls % 6;
        return `${overs}.${balls}`;
    };

    return { match, recordBall, undoLastBall, startSecondInnings, resetMatch, getOvers };
};