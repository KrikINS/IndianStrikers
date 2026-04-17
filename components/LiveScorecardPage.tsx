import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatch } from '../services/storageService';
import { ScheduledMatch, Player, OpponentTeam } from '../types';
import ScorecardViewModal from './ScorecardViewModal';
import { useMasterData } from './masterDataStore';
import { usePlayerStore } from '../store/playerStore';
import { Loader2 } from 'lucide-react';

const LiveScorecardPage: React.FC<{ opponents?: OpponentTeam[] }> = ({ opponents = [] }) => {
    const { players } = usePlayerStore();
    const { id } = useParams<{ id: string }>();
    const query = new URLSearchParams(window.location.search);
    const initialTab = (query.get('tab') === 'commentary' ? 'commentary' : 'scorecard') as 'scorecard' | 'commentary';
    const navigate = useNavigate();
    const [match, setMatch] = useState<ScheduledMatch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
    const { grounds } = useMasterData();

    const transformInnings = (inn: any): any => {
        if (!inn) return { batting: [], bowling: [], extras: { wide: 0, no_ball: 0, byes: 0, legByes: 0 }, totalRuns: 0, totalWickets: 0, totalOvers: 0 };
        
        const batting = Object.values(inn.battingStats || {}).map((p: any) => ({
            playerId: p.id,
            name: p.name,
            runs: p.runs,
            balls: p.balls,
            fours: p.fours,
            sixes: p.sixes,
            index: p.index,
            outHow: p.status === 'batting' ? 'Not Out' : (p.outHow || 'Out')
        }));

        const bowling = Object.values(inn.bowlingStats || {}).map((b: any) => ({
            playerId: b.id,
            name: b.name,
            overs: b.overs,
            maidens: b.maidens,
            runsConceded: b.runs,
            wickets: b.wickets,
            index: b.index
        }));

        const balls = inn.totalBalls || 0;
        const overNum = Math.floor(balls / 6);
        const ballNum = balls % 6;
        const totalOvers = parseFloat(`${overNum}.${ballNum}`);

        return {
            batting,
            bowling,
            extras: {
                wide: inn.extras?.wides || 0,
                no_ball: inn.extras?.noBalls || 0,
                byes: inn.extras?.byes || 0,
                legByes: inn.extras?.legByes || 0
            },
            totalRuns: inn.totalRuns || 0,
            totalWickets: inn.wickets || 0,
            totalOvers,
            history: inn.history || []
        };
    };

    const fetchMatch = async () => {
        if (!id) return;
        try {
            const m = await getMatch(id);
            if (m) {
                // Extract structured live_data into scorecard payload
                if (m.live_data) {
                    let parsedData = m.live_data;
                    if (typeof m.live_data === 'string') {
                        try { parsedData = JSON.parse(m.live_data); } catch (e) {}
                    }
                    
                    // Map Zustand state format to Scorecard format expected by modal
                    m.scorecard = {
                        innings1: transformInnings(parsedData.innings1),
                        innings2: transformInnings(parsedData.innings2)
                    };

                    // Sync Toss and other metadata if missing
                    m.isHomeBattingFirst = parsedData.isHomeBattingFirst;
                }
                setMatch(m);
                setLastUpdated(m.last_updated || new Date().toISOString());
            }
        } catch (err) {
            console.error("Failed to fetch live match:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMatch();
        // Poll every 5 seconds for live updates
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
        <ScorecardViewModal 
            match={match}
            isOpen={true}
            onClose={() => navigate('/')}
            players={players}
            allOpponents={opponents}
            grounds={grounds}
            initialTab={initialTab}
            onRefresh={fetchMatch}
            lastUpdated={lastUpdated}
        />
    );
};

export default LiveScorecardPage;
