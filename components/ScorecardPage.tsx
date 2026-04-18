import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatchCenter } from '../store/matchStore';
import { useMasterData } from './masterDataStore';
import { usePlayerStore } from '../store/playerStore';
import { UniversalScorecard } from './UniversalScorecard';
import { ArrowLeft, Share2, Download } from 'lucide-react';

interface ScorecardPageProps {
    opponents: OpponentTeam[];
    homeTeamName: string;
}

export const ScorecardPage: React.FC<ScorecardPageProps> = ({ opponents, homeTeamName }) => {
    const { players } = usePlayerStore();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const matches = useMatchCenter(state => state.matches);
    const grounds = useMasterData(state => state.grounds);
    
    const match = matches.find(m => m.id === id);

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
        <div className="pb-20">
            {/* The Main Scorecard */}
            <UniversalScorecard 
                match={match}
                onClose={() => navigate('/match-center')}
                players={players}
                opponents={opponents}
                isLive={match.status === 'live'}
            />
        </div>
    );
};
