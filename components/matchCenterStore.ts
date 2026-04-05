import { useState, useEffect } from 'react';

export type MatchStatus = 'upcoming' | 'live' | 'completed';
export type MatchStage = 'League' | 'Quarter-Final' | 'Semi-Final' | 'Final';

export interface ScheduledMatch {
    id: string;
    opponentId: string; // From Opponent Teams
    date: string;
    ground: string;
    tournament: string;
    stage: MatchStage;
    status: MatchStatus;
    homeTeamXI: string[]; // Array of Player IDs from Squad Roster
    opponentTeamXI: string[]; // Array of Names/IDs
    tossDetails?: string;
    resultSummary?: string; // e.g., "Indian Strikers won by 4 wickets"
    isLocked?: boolean; // Persisted from previous UI logic
}

// Initial mock data just for testing sorting functionality immediately
const MOCK_MATCHES: ScheduledMatch[] = [
    {
        id: '1',
        opponentId: 'desert-vipers',
        ground: 'ICC Academy',
        tournament: 'Winter Cup 2024',
        stage: 'League',
        status: 'completed',
        date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        homeTeamXI: [],
        opponentTeamXI: [],
        resultSummary: 'Indian Strikers won by 4 wickets'
    },
    {
        id: '2',
        opponentId: 'riyadh-kings',
        ground: 'Sheikh Zayed Stadium',
        tournament: 'Winter Cup 2024',
        stage: 'Semi-Final',
        status: 'live',
        date: new Date().toISOString(), // Now
        homeTeamXI: [],
        opponentTeamXI: []
    },
    {
        id: '3',
        opponentId: 'royal-challengers',
        ground: 'Dubai International Cricket Stadium',
        tournament: 'Winter Cup 2024',
        stage: 'Final',
        status: 'upcoming',
        date: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
        homeTeamXI: [],
        opponentTeamXI: []
    }
];

export const useMatchCenter = () => {
    const [matches, setMatches] = useState<ScheduledMatch[]>(() => {
        const saved = localStorage.getItem('insMatchCenter');
        return saved ? JSON.parse(saved) : MOCK_MATCHES;
    });

    useEffect(() => {
        localStorage.setItem('insMatchCenter', JSON.stringify(matches));
    }, [matches]);

    const addMatch = (match: Omit<ScheduledMatch, 'id'>) => {
        const newMatch: ScheduledMatch = {
            ...match,
            id: crypto.randomUUID()
        };
        setMatches(prev => [...prev, newMatch]);
    };

    const updateMatch = (id: string, updates: Partial<ScheduledMatch>) => {
        setMatches(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    };

    const deleteMatch = (id: string) => {
        setMatches(prev => prev.filter(m => m.id !== id));
    };

    const getSortedMatches = () => {
        return [...matches].sort((a, b) => {
            // 1. Sort by Status Priority: live (0) -> upcoming (1) -> completed (2)
            const statusOrder = { 'live': 0, 'upcoming': 1, 'completed': 2 };
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }

            // 2. Sort by date if status is the same
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();

            if (a.status === 'upcoming') {
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
