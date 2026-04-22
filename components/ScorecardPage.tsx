import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OpponentTeam } from '../types';
import { useMatchCenter } from '../store/matchStore';
import { useStore } from '../store/StoreProvider';
import MatchScorecardEntry from './MatchScorecardEntry';
import { ArrowLeft } from 'lucide-react';

interface ScorecardPageProps {
    opponents: OpponentTeam[];
    homeTeamName: string;
}

export const ScorecardPage: React.FC<ScorecardPageProps> = ({ opponents, homeTeamName }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { matches, updateMatch } = useMatchCenter();
    
    const match = matches.find(m => m.id === id);
    const resolvedOpponent = opponents.find(o => o.id === match?.opponentId);

    if (!match) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
                <p className="text-xl font-bold mb-4">Match not found</p>
                <button 
                    onClick={() => navigate('/match-center')}
                    className="flex items-center gap-2 text-blue-500 hover:text-blue-400 font-bold"
                >
                    <ArrowLeft size={18} /> Back to Match Center
                </button>
            </div>
        );
    }

    return (
        <MatchScorecardEntry 
            match={match}
            opponent={resolvedOpponent}
            onClose={() => navigate('/match-center')}
            onSubmit={async (finalData) => {
                await updateMatch(match.id, finalData);
                navigate('/match-center');
            }}
        />
    );
};
