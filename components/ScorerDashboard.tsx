import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  ChevronLeft, 
  RotateCcw, 
  Settings, 
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { useCricketScorer } from './matchStore';
import { updateMatchInStore } from './matchCenterStore';
import { useNavigate } from 'react-router-dom';
import _ from 'lodash';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background-color: #FFFFFF;
  color: #1A1A1A;
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  background-color: #001F3F;
  color: #FFFFFF;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;

  &:hover { background: rgba(255, 255, 255, 0.1); }
  &:active { transform: scale(0.9); }
`;

const ScoreSection = styled.div`
  background: #F8F9FA;
  padding: 24px 16px;
  border-bottom: 1px solid #E9ECEF;
  text-align: center;
`;

const MainScore = styled.h1`
  font-size: 3.5rem;
  font-weight: 800;
  margin: 0;
  color: #001F3F;
`;

const OversText = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #6C757D;
`;

const ActiveParticipants = styled.div`
  padding: 16px;
  background: #FFFFFF;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  border-bottom: 1px solid #F1F3F5;
`;

const ParticipantCard = styled.div<{ active?: boolean }>`
  padding: 12px;
  border-radius: 8px;
  background: ${props => props.active ? '#E7F5FF' : '#F8F9FA'};
  border: 1px solid ${props => props.active ? '#339AF0' : '#E9ECEF'};
  display: flex;
  flex-direction: column;
`;

const NameLabel = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
`;

const StatValue = styled.span`
  font-size: 1.1rem;
  font-weight: 700;
  color: #212529;
`;

const TimelineContainer = styled.div`
  padding: 12px 16px;
  background: #F8F9FA;
  overflow-x: auto;
  white-space: nowrap;
  display: flex;
  gap: 8px;
`;

const BallCircle = styled.div<{ type?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => {
    if (props.type === 'W') return '#E03131';
    if (['4', '6'].includes(props.type || '')) return '#2F9E44';
    return '#ADB5BD';
  }};
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 20px;
`;

const ScoringBtn = styled.button<{ variant?: 'run' | 'wicket' | 'extra' | 'undo' }>`
  aspect-ratio: 1;
  border-radius: 12px;
  border: none;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  
  ${props => {
    switch(props.variant) {
      case 'wicket': return 'background: #FFE3E3; color: #E03131;';
      case 'extra': return 'background: #FFF4E6; color: #D9480F;';
      case 'undo': return 'background: #F1F3F5; color: #495057;';
      default: return 'background: #E7F5FF; color: #1971C2;';
    }
  }}
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #FFFFFF;
  width: 100%;
  border-radius: 20px 20px 0 0;
  padding: 24px;
`;

const ScorerDashboard: React.FC<{ matchId?: string, players: any[] }> = ({ matchId, players }) => {
  const store = useCricketScorer();
  const navigate = useNavigate();
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);

  const syncToDatabase = useCallback(
    _.debounce((state: any) => {
      if (matchId) {
        updateMatchInStore(matchId, { live_data: state, last_updated: new Date().toISOString() });
      }
    }, 3000),
    [matchId]
  );

  useEffect(() => {
    syncToDatabase(store);
  }, [store, syncToDatabase]);

  const currentInnings = store.currentInnings === 1 ? store.innings1 : store.innings2;

  if (!currentInnings) {
    return (
      <DashboardContainer>
        <Header>
          <IconButton onClick={() => {
            if (window.confirm("Are you sure you want to exit? Unsaved progress for this ball may be lost.")) {
              navigate('/match-center');
            }
          }} aria-label="Go back">
            <ChevronLeft size={24} />
          </IconButton>
          <span style={{ fontWeight: 700 }}>Initialize Match</span>
          <MoreVertical size={24} />
        </Header>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={48} color="#001F3F" style={{ marginBottom: 16 }} />
          <h3>Match Ready to Start</h3>
          <button 
            style={{ background: '#001F3F', color: 'white', padding: '12px 24px', borderRadius: 8, border: 'none', marginTop: 16 }}
            onClick={() => {
                const b1 = players[0]?.id;
                const b2 = players[1]?.id;
                const bw = players[players.length - 1]?.id;
                store.startInnings(1, 'team1', 'team2', b1, b2, bw);
            }}
          >
            Start Scoring
          </button>
        </div>
      </DashboardContainer>
    );
  }

  const handleRecord = (runs: number, type: any = 'legal') => {
    store.recordBall({ runs, type, isWicket: false });
    if (currentInnings.totalBalls > 0 && (currentInnings.totalBalls + 1) % 6 === 0 && type === 'legal') {
      setShowBowlerModal(true);
    }
  };

  const getPlayerName = (id: string | null) => players.find(p => p.id === id)?.name || 'Unknown';
  const strikerStats = currentInnings.battingStats[store.strikerId || ''] || { runs: 0, balls: 0 };
  const nonStrikerStats = currentInnings.battingStats[store.nonStrikerId || ''] || { runs: 0, balls: 0 };
  const bowlerStats = currentInnings.bowlingStats[store.currentBowlerId || ''] || { overs: 0, runs: 0, wickets: 0 };

  return (
    <DashboardContainer>
      <Header>
        <IconButton onClick={() => {
          if (window.confirm("Are you sure you want to exit? Unsaved progress for this ball may be lost.")) {
            navigate('/match-center');
          }
        }} aria-label="Go back">
          <ChevronLeft size={24} />
        </IconButton>
        <span style={{ fontWeight: 700 }}>SCORER DASHBOARD</span>
        <Settings size={22} />
      </Header>

      <ScoreSection>
        <MainScore>{currentInnings.totalRuns}/{currentInnings.wickets}</MainScore>
        <OversText>OVERS {store.getOvers(currentInnings.totalBalls)}</OversText>
      </ScoreSection>

      <ActiveParticipants>
        <ParticipantCard active>
          <NameLabel>Striker*</NameLabel>
          <StatValue>{getPlayerName(store.strikerId)}</StatValue>
          <div style={{ fontSize: '0.8rem' }}>{strikerStats.runs}({strikerStats.balls})</div>
        </ParticipantCard>
        <ParticipantCard>
          <NameLabel>Non-Striker</NameLabel>
          <StatValue>{getPlayerName(store.nonStrikerId)}</StatValue>
          <div style={{ fontSize: '0.8rem' }}>{nonStrikerStats.runs}({nonStrikerStats.balls})</div>
        </ParticipantCard>
        <ParticipantCard style={{ gridColumn: 'span 2' }}>
          <NameLabel>Bowler</NameLabel>
          <StatValue>{getPlayerName(store.currentBowlerId)}</StatValue>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{bowlerStats.wickets}-{bowlerStats.runs} ({bowlerStats.overs})</div>
        </ParticipantCard>
      </ActiveParticipants>

      <TimelineContainer>
        {currentInnings.history.slice(-12).map((ball, i) => (
          <BallCircle key={i} type={ball.isWicket ? 'W' : ball.runs.toString()}>
            {ball.isWicket ? 'W' : ball.runs}
          </BallCircle>
        ))}
      </TimelineContainer>

      <ControlsGrid>
        {[0, 1, 2, 3, 4, 6].map(run => (
          <ScoringBtn key={run} onClick={() => handleRecord(run)}>{run}</ScoringBtn>
        ))}
        <ScoringBtn variant="extra" onClick={() => handleRecord(0, 'wide')}>Wd</ScoringBtn>
        <ScoringBtn variant="extra" onClick={() => handleRecord(0, 'no-ball')}>Nb</ScoringBtn>
        <ScoringBtn variant="wicket" onClick={() => setShowWicketModal(true)}>W</ScoringBtn>
        <ScoringBtn variant="undo" onClick={() => store.undoLastBall()}>
          <RotateCcw size={18} />
        </ScoringBtn>
      </ControlsGrid>

      {showWicketModal && (
        <ModalOverlay onClick={() => setShowWicketModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2>Dismissal</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {['Bowled', 'Caught', 'LBW', 'Run Out'].map(type => (
                <button
                  key={type}
                  style={{ padding: 16, borderRadius: 8, border: '1px solid #CCC', background: 'white' }}
                  onClick={() => {
                    const next = players.find(p => p.id !== store.strikerId && p.id !== store.nonStrikerId)?.id;
                    store.recordBall({ runs: 0, type: 'legal', isWicket: true, wicketType: type as any, newBatterId: next });
                    setShowWicketModal(false);
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </DashboardContainer>
  );
};

export default ScorerDashboard;
