import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatchCenter } from './matchCenterStore';
import { FullScorecard } from './FullScorecard';
import { ArrowLeft, Share2, Download } from 'lucide-react';
import { OpponentTeam } from '../types';

interface ScorecardPageProps {
    opponents: OpponentTeam[];
    homeTeamName: string;
}

export const ScorecardPage: React.FC<ScorecardPageProps> = ({ opponents, homeTeamName }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const matches = useMatchCenter(state => state.matches);
    
    const match = matches.find(m => m.id === id);
    const opponent = opponents.find(o => o.id === match?.opponentId);

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
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <button 
                    onClick={() => navigate('/match-center')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold group w-fit"
                >
                    <div className="p-2 rounded-full border border-white/5 group-hover:bg-white/5 transition-all">
                        <ArrowLeft size={18} />
                    </div>
                    BACK TO MATCH CENTER
                </button>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 font-bold transition-all text-xs">
                        <Share2 size={14} /> SHARE
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 font-bold transition-all text-xs">
                        <Download size={14} /> EXPORT PDF
                    </button>
                </div>
            </div>

            {/* The Main Scorecard */}
            <FullScorecard 
                match={match}
                homeTeamName={homeTeamName}
                opponentName={opponent?.name || match.opponentId.replace(/-/g, ' ')}
            />
        </div>
    );
};
