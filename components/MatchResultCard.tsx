import React from 'react';
import styled from 'styled-components';
import { Trophy, Star, TrendingUp, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

const Card = styled.div`
  background: #1a1d21;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  color: white;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const HeadRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding-bottom: 12px;
`;

const TournamentTag = styled.span`
  font-size: 0.65rem;
  font-weight: 900;
  color: #3b82f6;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const ScoresWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TeamScore = styled.div<{ $align: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$align === 'left' ? 'flex-start' : 'flex-end'};
  gap: 4px;
  flex: 1;
`;

const TeamName = styled.div`
  font-size: 0.75rem;
  font-weight: 800;
  opacity: 0.7;
`;

const RunWkt = styled.div`
  font-size: 1.8rem;
  font-weight: 900;
  color: #fff;
  line-height: 1;
`;

const OversLabel = styled.div`
  font-size: 0.7rem;
  opacity: 0.4;
  font-weight: 700;
`;

const VsDivider = styled.div`
  padding: 0 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const VsBubble = styled.div`
  background: #334155;
  color: #94a3b8;
  font-size: 0.6rem;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 12px;
`;

const ResultStm = styled.div`
  background: rgba(46, 204, 113, 0.1);
  border: 1px solid rgba(46, 204, 113, 0.2);
  color: #2ecc71;
  padding: 10px;
  border-radius: 12px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PerformerSection = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(255, 255, 255, 0.03);
  padding: 15px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const AvatarCircle = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #2ecc71;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #052e16;
`;

const StatGrid = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

interface MatchResultCardProps {
  match: any;
  homeTeam: { name: string, score: number, wickets: number, overs: string };
  awayTeam: { name: string, score: number, wickets: number, overs: string };
  result: string;
  topPerformer: { name: string, stat: string };
  allowDownload?: boolean;
}

export default function MatchResultCard({ match, homeTeam, awayTeam, result, topPerformer, allowDownload = true }: MatchResultCardProps) {
  const handleDownload = async () => {
    const element = document.getElementById('match-result-card');
    if (!element) return;
    
    // Temporarily hide the download button if it's inside the card
    const btn = element.querySelector('.download-btn') as HTMLElement;
    if (btn) btn.style.display = 'none';

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#1a1d21', // Match card background
        scale: 2, // Higher quality
        logging: false,
        useCORS: true
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Match_Result_${match.id || 'export'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      if (btn) btn.style.display = 'flex';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <Card id="match-result-card">
        <HeadRow>
          <TournamentTag>{match.tournament || 'Live Match'}</TournamentTag>
          <Trophy size={14} color="#FAB005" />
        </HeadRow>

        <ScoresWrapper>
          <TeamScore $align="left">
            <TeamName>{homeTeam.name}</TeamName>
            <RunWkt>{homeTeam.score}/{homeTeam.wickets}</RunWkt>
            <OversLabel>{homeTeam.overs} OV</OversLabel>
          </TeamScore>

          <VsDivider>
            <VsBubble>VS</VsBubble>
          </VsDivider>

          <TeamScore $align="right">
            <TeamName>{awayTeam.name}</TeamName>
            <RunWkt>{awayTeam.score}/{awayTeam.wickets}</RunWkt>
            <OversLabel>{awayTeam.overs} OV</OversLabel>
          </TeamScore>
        </ScoresWrapper>

        <ResultStm>{result}</ResultStm>

        <PerformerSection>
          <AvatarCircle>
            <Star size={24} fill="currentColor" />
          </AvatarCircle>
          <StatGrid>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.4, textTransform: 'uppercase' }}>Top Performer</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fff' }}>{topPerformer.name}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2ecc71' }}>{topPerformer.stat}</span>
          </StatGrid>
          <TrendingUp size={20} color="#2ecc71" opacity={0.5} />
        </PerformerSection>
      </Card>

      {allowDownload && (
        <button
          className="download-btn"
          onClick={handleDownload}
          style={{
            position: 'absolute', top: '10px', right: '-40px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '50%', padding: '8px', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
          }}
          title="Download Result Card"
        >
          <Download size={16} />
        </button>
      )}
    </div>
  );
}
