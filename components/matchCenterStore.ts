import { useState, useEffect } from 'react';

export type MatchStage = 'League' | 'Quarter-Final' | 'Semi-Final' | 'Final' | 'Friendly';
export type MatchStatus = 'Live' | 'Upcoming' | 'Completed';

export interface Match {
    id: string;
    homeTeamId: string;
    opponentTeamId: string;
    groundId: string;
    tournamentId: string;
    matchStage: MatchStage;
    status: MatchStatus;
    date: string; // ISO 8601 Date String
    homeXI?: string[]; // Player IDs
    awayXI?: string[]; // Player IDs (as strings if from OpponentTeam)
    isLocked?: boolean;
}

// Initial mock data just for testing sorting functionality immediately
const MOCK_MATCHES: Match[] = [
    {
        id: '1',
        homeTeamId: 'indian-strikers',
        opponentTeamId: 'desert-vipers',
        groundId: 'icc-academy',
        tournamentId: 'winter-cup',
        matchStage: 'League',
        status: 'Completed',
        date: new Date(Date.now() - 86400000 * 2).toISOString() // 2 days ago
    },
    {
        id: '2',
        homeTeamId: 'indian-strikers',
        opponentTeamId: 'riyadh-kings',
        groundId: 'sheikh-zayed',
        tournamentId: 'winter-cup',
        matchStage: 'Semi-Final',
        status: 'Live',
        date: new Date().toISOString() // Now
    },
    {
        id: '3',
        homeTeamId: 'indian-strikers',
        opponentTeamId: 'royal-challengers',
        groundId: 'dubai-international',
        tournamentId: 'winter-cup',
        matchStage: 'Final',
        status: 'Upcoming',
        date: new Date(Date.now() + 86400000 * 5).toISOString() // 5 days from now
    }
];

export const useMatchCenter = () => {
    const [matches, setMatches] = useState<Match[]>(() => {
        const saved = localStorage.getItem('insMatchCenter');
        return saved ? JSON.parse(saved) : MOCK_MATCHES;
    });

    useEffect(() => {
        localStorage.setItem('insMatchCenter', JSON.stringify(matches));
    }, [matches]);

    const addMatch = (match: Omit<Match, 'id'>) => {
        const newMatch: Match = {
            ...match,
            id: crypto.randomUUID()
        };
        setMatches(prev => [...prev, newMatch]);
    };

    const updateMatch = (id: string, updates: Partial<Match>) => {
        setMatches(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const deleteMatch = (id: string) => {
        setMatches(prev => prev.filter(m => m.id !== id));
    };

    const getSortedMatches = () => {
        return [...matches].sort((a, b) => {
            // 1. Sort by Status Priority: Live (0) -> Upcoming (1) -> Completed (2)
            const statusOrder = { 'Live': 0, 'Upcoming': 1, 'Completed': 2 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }

            // 2. Sort by date if status is the same
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();

            if (a.status === 'Upcoming') {
                // Earliest upcoming match first (Ascending)
                return timeA - timeB;
            } else {
                // Most recent completed match first (Descending)
                return timeB - timeA;
            }
        });
    };

    return { matches, addMatch, updateMatch, deleteMatch, getSortedMatches, setMatches };
};
