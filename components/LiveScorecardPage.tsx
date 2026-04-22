import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatch } from '../services/storageService';
import { ScheduledMatch, Player, OpponentTeam } from '../types';
import { UniversalScorecard } from './UniversalScorecard';
import { useMasterData } from '../store/tournamentStore';
import { useStore } from '../store/StoreProvider';
import { Loader2 } from 'lucide-react';

const LiveScorecardPage: React.FC<{ opponents?: OpponentTeam[] }> = ({ opponents = [] }) => {
    const { squadPlayers, opponentPlayers } = useStore();
    const allPlayers = React.useMemo(() => [...squadPlayers, ...opponentPlayers], [squadPlayers, opponentPlayers]);
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [match, setMatch] = useState<ScheduledMatch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { grounds } = useMasterData();

    const fetchMatch = async () => {
        if (!id) return;
        try {
            const m = await getMatch(id);
            if (m) {
                setMatch(m);
            }
        } catch (err) {
            console.error("Failed to fetch live match:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMatch();
        const interval = setInterval(fetchMatch, 5000);
        return () => clearInterval(interval);
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
                <Loader2 size={48} className="text-sky-500 animate-spin mb-4" />
                <h2 className="text-white font-black uppercase tracking-widest animate-pulse">Loading Live Score...</h2>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
                <h2 className="text-2xl font-black uppercase tracking-widest mb-4">Match Not Found</h2>
                <button onClick={() => navigate('/')} className="px-6 py-2 bg-sky-600 rounded-xl font-bold hover:bg-sky-500">Return to Match Center</button>
            </div>
        );
    }

    return (
        <UniversalScorecard 
            match={match}
            onClose={() => navigate('/')}
            players={allPlayers}
            opponents={opponents}
            isLive={match.status === 'live'}
        />
    );
};

export default LiveScorecardPage;
