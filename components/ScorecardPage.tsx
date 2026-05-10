import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OpponentTeam } from '../types';
import { useMatchCenter } from '../store/matchStore';
import { useStore } from '../store/StoreProvider';
import { UniversalScorecard } from './UniversalScorecard';
import { ArrowLeft } from 'lucide-react';

interface ScorecardPageProps {
    opponents: OpponentTeam[];
}

export const ScorecardPage: React.FC<ScorecardPageProps> = ({ opponents }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { matches, finalizeMatch, currentUser } = useMatchCenter();
    const { players } = useStore();
    const isAdmin = currentUser?.role === 'admin';
    
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
        <UniversalScorecard 
            match={match}
            players={players}
            opponents={opponents}
            isEditable={isAdmin}
            onClose={() => navigate('/match-center')}
            onSave={async (finalData) => {
                if (!isAdmin) return;
                await finalizeMatch(match.id, { ...finalData, isCareerSynced: true }, finalData.performers || []);
                navigate('/match-center');
            }}
        />
    );
};
