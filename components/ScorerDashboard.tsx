import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  RotateCcw, 
  Undo,
  Settings, 
  MoreVertical,
  AlertCircle,
  MapPin,
  Shield,
  Plus,
  Minus,
  Users,
  Search,
  X,
  User,
  Filter,
  Trophy,
  ChevronRight,
  RefreshCcw,
  Repeat
} from 'lucide-react';
import { useCricketScorer } from './matchStore';
import { useMatchCenter, updateMatchInStore } from './matchCenterStore';
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
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.1);
`;

const BadgeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SandboxBadge = styled.span`
  background: #FAB005;
  color: #000000;
  font-size: 10px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 10px rgba(250, 176, 5, 0.3);
`;
const FreeHitBadge = styled(motion.span)`
  background: #FAB005;
  color: #000;
  font-size: 10px;
  font-weight: 900;
  padding: 4px 12px;
  border-radius: 6px;
  text-transform: uppercase;
  margin-top: 12px;
  display: inline-block;
  box-shadow: 0 4px 15px rgba(250, 176, 5, 0.4);
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
  &:hover { transform: scale(1.1); }
`;

const OverSeparator = styled.div`
  min-width: 2px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 6px;
  display: flex;
  align-items: center;
  position: relative;
  
  &::after {
    content: 'OVER';
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.4rem;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 1px;
  }
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

const ParticipantCard = styled.div<{ $active?: boolean }>`
  padding: 12px;
  border-radius: 8px;
  background: ${props => props.$active ? '#E7F5FF' : '#F8F9FA'};
  border: 1px solid ${props => props.$active ? '#339AF0' : '#E9ECEF'};
  display: flex;
  flex-direction: column;
  position: relative;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
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
  margin: 0 16px 12px; /* Align with other containers */
  padding: 10px 12px;
  background: #001f3f; /* Deep navy broadcast theme */
  border-radius: 8px;
  overflow-x: auto;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
  scrollbar-width: none;
  border: 1px solid rgba(255,255,255,0.05);
  &::-webkit-scrollbar { display: none; }
`;

const BallCircle = styled.div<{ $type: string }>`
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 900;
  color: white;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  background: ${props => {
    if (props.$type === 'W') return 'linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)';
    if (props.$type === '4') return 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)';
    if (props.$type === '6') return 'linear-gradient(135deg, #a8ff78 0%, #78ffd6 100%)';
    if (props.$type.includes('WD') || props.$type.includes('NB')) return 'linear-gradient(135deg, #fcead3 0%, #f7971e 100%)';
    if (props.$type === '0') return 'rgba(255,255,255,0.05)';
    return 'rgba(255,255,255,0.15)';
  }};
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 20px;
`;

const ScoringBtn = styled.button<{ $variant?: 'run' | 'wicket' | 'extra' | 'undo' }>`
  aspect-ratio: 1;
  border-radius: 12px;
  border: none;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
  
  ${props => {
    switch(props.$variant) {
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
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 2000;
`;

const ModalContent = styled.div`
  background: #FFFFFF;
  width: 100%;
  max-width: 480px;
  border-radius: 24px;
  padding: 24px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  position: relative;
`;

const SetupContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #001F3F 0%, #083358 100%);
  display: flex;
  flex-direction: column;
  color: white;
  padding: 20px;
`;

const SetupCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  margin: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
`;

const MatchTitle = styled.h2`
  text-align: center;
  font-size: 1.5rem;
  font-weight: 900;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const GroundText = styled.div`
  text-align: center;
  opacity: 0.6;
  font-size: 0.8rem;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const TeamRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 40px 0;
  position: relative;

  &::after {
    content: 'VS';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-weight: 900;
    color: #FAB005;
    background: #001F3F;
    padding: 8px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.1);
    font-size: 12px;
  }
`;

const TeamBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 40%;
`;

const TeamLogoCircle = styled.div<{ $active?: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${props => props.$active ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${props => props.$active ? '#FAB005' : 'transparent'};
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    transform: scale(1.05);
    border-color: #FAB005;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  border: none;
  font-weight: 800;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$variant === 'primary' ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  color: ${props => props.$variant === 'primary' ? '#000' : '#FFF'};

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const TossOption = styled.div<{ $selected?: boolean }>`
  padding: 16px;
  background: ${props => props.$selected ? 'rgba(250, 176, 5, 0.2)' : 'rgba(255,255,255,0.05)'};
  border: 2px solid ${props => props.$selected ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 700;

  &:hover {
    background: rgba(255,255,255,0.1);
  }
`;

const SettingsSection = styled.div`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.1);
`;

const OversControl = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 12px;
`;

const ControlBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255,255,255,0.1);
    border-color: #FAB005;
  }

  &:active {
    transform: scale(0.9);
  }
`;

const PremiumModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const PremiumModalContent = styled.div`
  background: #111;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PlayerCard = styled.div<{ $selected?: boolean; $disabled?: boolean }>`
  padding: 12px 16px;
  background: ${props => props.$selected ? 'rgba(250, 176, 5, 0.2)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${props => props.$selected ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all 0.2s;

  &:hover {
    ${props => !props.$disabled && 'background: rgba(255,255,255,0.1);'}
  }
`;

const SelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
  max-height: 400px;
`;

const StatRibbon = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
  gap: 8px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StatLabel = styled.span`
  font-size: 8px;
  opacity: 0.5;
  text-transform: uppercase;
  font-weight: 700;
`;

const StatVal = styled.span`
  font-size: 10px;
  font-weight: 800;
  color: #FAB005;
`;

const FilterChip = styled.button<{ $active?: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  background: ${props => props.$active ? '#FAB005' : 'rgba(255,255,255,0.05)'};
  color: ${props => props.$active ? '#000' : 'rgba(255,255,255,0.6)'};
  border: 1px solid ${props => props.$active ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
`;

const SliderTrack = styled.div`
  width: 100%;
  height: 56px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 28px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 4px;
`;

const SliderHandle = styled(motion.div)`
  width: 48px;
  height: 48px;
  background: #ff4d4d;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 2;
  box-shadow: 0 4px 12px rgba(255, 77, 77, 0.4);

  &:active {
    cursor: grabbing;
  }
`;

const SliderText = styled.div`
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.3);
  pointer-events: none;
  text-transform: uppercase;
`;

const SliderProgress = styled(motion.div)`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(255, 77, 77, 0.2);
  z-index: 1;
`;

const CoinWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
  perspective: 1000px;
`;

const Coin3D = styled(motion.div)`
  width: 80px;
  height: 80px;
  position: relative;
  transform-style: preserve-3d;
`;

const CoinFace = styled.div<{ $side: 'front' | 'back' }>`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  backface-visibility: hidden;
  background-size: cover;
  background-position: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  border: 2px solid #E6A100;
  background-image: url(${props => props.$side === 'front' ? '/assets/coin/heads.png' : '/assets/coin/tails.png'});
  transform: ${props => props.$side === 'back' ? 'rotateY(180deg)' : 'none'};
`;

const ScorerDashboard: React.FC<{ matchId?: string, players: any[] }> = ({ matchId: propMatchId, players }) => {
  const store = useCricketScorer();
  const navigate = useNavigate();
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [setupStep, setSetupStep] = useState<'preview' | 'toss' | 'squad_home' | 'squad_away' | 'openers'>('preview');
  const [tossWinner, setTossWinner] = useState<'home' | 'away' | null>(null);
  const [tossChoice, setTossChoice] = useState<'Bat' | 'Bowl' | null>(null);
  const [tempMaxOvers, setTempMaxOvers] = useState(20);
  
  const { homeXI, awayXI } = store;
  const [selStriker, setSelStriker] = useState<string | null>(null);
  const [selNonStriker, setSelNonStriker] = useState<string | null>(null);
  const [selBowler, setSelBowler] = useState<string | null>(null);
  const [showLineups, setShowLineups] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showNBModal, setShowNBModal] = useState(false);
  const [showRunOutModal, setShowRunOutModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [showBatterSelectModal, setShowBatterSelectModal] = useState(false);
  const [showWicketSplash, setShowWicketSplash] = useState(false);
  const [pendingWicketType, setPendingWicketType] = useState<any>(null);
  const [extraType, setExtraType] = useState<'wd' | 'nb' | 'byes' | 'lb'>('nb');
  const [nbSubType, setNbSubType] = useState<'bat' | 'bye' | 'lb'>('bat');
  const [runOutInvolved, setRunOutInvolved] = useState<{ victimId: string, runs: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');

  useEffect(() => {
    if (store.maxOvers) {
      setTempMaxOvers(store.maxOvers);
    }
  }, [store.maxOvers]);

  // Get metadata from MatchCenterStore
  const matches = useMatchCenter(s => s.matches);
  const activeMatchId = propMatchId || store.matchId;
  const matchMeta = matches.find(m => m.id === activeMatchId);

  const syncToDatabase = useCallback(
    _.debounce((state: any) => {
      if (activeMatchId) {
        updateMatchInStore(activeMatchId, { live_data: state, last_updated: new Date().toISOString() });
      }
    }, 3000),
    [activeMatchId]
  );

  useEffect(() => {
    syncToDatabase(store);
  }, [store, syncToDatabase]);

  const currentInnings = store.currentInnings === 1 ? store.innings1 : store.innings2;
  const isBattingFinishing = currentInnings && (
    currentInnings.wickets === 10 || 
    currentInnings.totalBalls >= (store.maxOvers || 20) * 6
  );
  const isMatchComplete = store.currentInnings === 2 && isBattingFinishing;
  const isInningsBreak = store.currentInnings === 1 && isBattingFinishing;

  // Trigger Bowler Selection at start of innings or if bowler missing
  React.useEffect(() => {
    if (currentInnings && !store.currentBowlerId && !showBowlerModal) {
      // Check if match is not finished
      const totalBalls = currentInnings.totalBalls || 0;
      const maxBalls = (store.maxOvers || 20) * 6;
      if (totalBalls < maxBalls) {
        setShowBowlerModal(true);
      }
    }
  }, [store.currentInnings, store.currentBowlerId, currentInnings, showBowlerModal]);

  if (!currentInnings) {
    const isReadyToStart = tossWinner && tossChoice && homeXI.length === 11 && awayXI.length === 11 && selStriker && selNonStriker;

    const handleStartMatch = () => {
      if (!isReadyToStart) return;

      const winnerId = tossWinner === 'home' ? 'HOME' : 'AWAY';
      store.setToss(winnerId, tossChoice);
      
      // Update match settings before starting
      store.updateMatchSettings({ 
        maxOvers: tempMaxOvers 
      });

      // Valid IDs from selection
      const batTeamId = (tossWinner === 'home' && tossChoice === 'Bat') || (tossWinner === 'away' && tossChoice === 'Bowl') ? 'HOME' : 'AWAY';
      const bowlTeamId = batTeamId === 'HOME' ? 'AWAY' : 'HOME';

      // If we are starting match from scratch
      if (!store.innings1?.battingTeamId) {
        store.startInnings(1, batTeamId, bowlTeamId, selStriker!, selNonStriker!, '');
      } else {
        // This is starting 2nd innings
        const i1 = store.innings1!;
        store.startInnings(2, i1.bowlingTeamId, i1.battingTeamId, selStriker!, selNonStriker!, '');
      }
      
      // Persist the toss outcome and match status to the metadata store
      if (activeMatchId) {
        updateMatchInStore(activeMatchId, { 
          isHomeBattingFirst: batTeamId === 'HOME', 
          status: 'live',
          homeTeamXI: homeXI,
          opponentTeamXI: awayXI
        });
      }
    };

    return (
      <SetupContainer>
        <Header>
          <IconButton onClick={() => navigate('/match-center')} aria-label="Go back">
            <ChevronLeft size={24} />
          </IconButton>
          <span style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '1px' }}>MATCH SETUP</span>
          <Settings size={20} />
        </Header>

        <SetupCard>
          {setupStep === 'preview' ? (
            <>
              <MatchTitle>{matchMeta?.tournament || 'System Logic Test'}</MatchTitle>
              <GroundText>
                <MapPin size={14} /> {matchMeta?.groundId || 'Sandbox Ground'}
              </GroundText>

              <TeamRow>
                <TeamBlock>
                  <TeamLogoCircle $active>
                    <Shield size={40} color="#FAB005" />
                  </TeamLogoCircle>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>INDIAN STRIKERS</span>
                </TeamBlock>
                <TeamBlock>
                  <TeamLogoCircle>
                    <Shield size={40} color="rgba(255,255,255,0.3)" />
                  </TeamLogoCircle>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>
                    {matchMeta?.opponentName?.toUpperCase() || 'SANDBOX XI'}
                  </span>
                </TeamBlock>
              </TeamRow>

              <ActionButton $variant="primary" onClick={() => setSetupStep('toss')}>
                Go to Toss
              </ActionButton>
            </>
          ) : setupStep === 'toss' ? (
            <>
              <CoinWrapper>
                <Coin3D 
                  animate={{ 
                    rotateY: [0, 360],
                    y: [0, -15, 0]
                  }}
                  transition={{ 
                    rotateY: { duration: 3, repeat: Infinity, ease: "linear" },
                    y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <CoinFace $side="front" />
                  <CoinFace $side="back" />
                </Coin3D>
              </CoinWrapper>
              
              <h3 style={{ textAlign: 'center', marginBottom: 24, fontWeight: 900 }}>TOSS SELECTION</h3>
              
              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 12 }}>Who won the toss?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <TossOption $selected={tossWinner === 'home'} onClick={() => setTossWinner('home')}>
                  Indian Strikers
                </TossOption>
                <TossOption $selected={tossWinner === 'away'} onClick={() => setTossWinner('away')}>
                  {matchMeta?.opponentName || 'SANDBOX XI'}
                </TossOption>
              </div>

              {tossWinner && (
                <>
                  <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 12 }}>What did they choose?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
                    <TossOption $selected={tossChoice === 'Bat'} onClick={() => setTossChoice('Bat')}>
                      BATTING
                    </TossOption>
                    <TossOption $selected={tossChoice === 'Bowl'} onClick={() => setTossChoice('Bowl')}>
                      BOWLING
                    </TossOption>
                  </div>
                </>
              )}

              <SettingsSection>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 4, textAlign: 'center' }}>Match Adjustments</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 12 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Max Overs Per Side</span>
                  <OversControl>
                    <ControlBtn onClick={() => setTempMaxOvers(Math.max(1, tempMaxOvers - 1))}>
                      <Minus size={16} />
                    </ControlBtn>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#FAB005' }}>{tempMaxOvers}</span>
                    <ControlBtn onClick={() => setTempMaxOvers(tempMaxOvers + 1)}>
                      <Plus size={16} />
                    </ControlBtn>
                  </OversControl>
                </div>
              </SettingsSection>

              <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                <ActionButton onClick={() => setSetupStep('preview')}>Back</ActionButton>
                    <ActionButton $variant="primary" disabled={!tossWinner || !tossChoice} onClick={() => setSetupStep('squad_home')}>
                      Select Squads
                    </ActionButton>
                  </div>
                </>
              ) : setupStep === 'squad_home' || setupStep === 'squad_away' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {setupStep === 'squad_home' ? <Shield size={20} color="#FAB005" /> : <Users size={20} color="#FAB005" />}
                      <h3 style={{ margin: 0, fontWeight: 900 }}>
                        {setupStep === 'squad_home' ? 'HOME SQUAD' : 'AWAY SQUAD'}
                      </h3>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#FAB005' }}>
                      {setupStep === 'squad_home' ? homeXI.length : awayXI.length} / 11
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 8 }}>
                    {['All', 'Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'].map(role => (
                      <FilterChip 
                        key={role} 
                        $active={roleFilter === role}
                        onClick={() => setRoleFilter(role)}
                      >
                        {role}
                      </FilterChip>
                    ))}
                  </div>

                  <SelectionGrid>
                    {players
                      .filter(p => roleFilter === 'All' || p.role === roleFilter)
                      .map(p => {
                        const isSelected = setupStep === 'squad_home' ? homeXI.includes(p.id) : awayXI.includes(p.id);
                        const isOtherSide = setupStep === 'squad_home' ? awayXI.includes(p.id) : homeXI.includes(p.id);
                        
                        return (
                          <PlayerCard 
                            key={p.id}
                            $selected={isSelected}
                            $disabled={isOtherSide}
                            onClick={() => {
                              if (isOtherSide) return;
                              const currentSquad = setupStep === 'squad_home' ? homeXI : awayXI;
                              const isSelected = currentSquad.includes(p.id);
                              
                              let newSquad;
                              if (isSelected) {
                                newSquad = currentSquad.filter(id => id !== p.id);
                              } else if (currentSquad.length < 11) {
                                newSquad = [...currentSquad, p.id];
                              } else {
                                return;
                              }

                              store.updateMatchSettings({
                                [setupStep === 'squad_home' ? 'homeXI' : 'awayXI']: newSquad
                              });
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                              <User size={14} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{p.role}</div>
                              </div>
                            </div>
                            
                            <StatRibbon>
                              <StatItem>
                                <StatLabel>Avg</StatLabel>
                                <StatVal>{p.battingStats?.average || p.average || '0.0'}</StatVal>
                              </StatItem>
                              <StatItem>
                                <StatLabel>SR</StatLabel>
                                <StatVal>{p.battingStats?.strikeRate || '0'}</StatVal>
                              </StatItem>
                              <StatItem>
                                <StatLabel>Wkt</StatLabel>
                                <StatVal>{p.bowlingStats?.wickets || p.wicketsTaken || '0'}</StatVal>
                              </StatItem>
                            </StatRibbon>
                          </PlayerCard>
                        );
                      })}
                  </SelectionGrid>

                  <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                    <ActionButton onClick={() => setSetupStep(setupStep === 'squad_home' ? 'toss' : 'squad_home')}>
                      Back
                    </ActionButton>
                    <ActionButton 
                      $variant="primary" 
                      disabled={(setupStep === 'squad_home' ? homeXI.length : awayXI.length) < 11} 
                      onClick={() => setSetupStep(setupStep === 'squad_home' ? 'squad_away' : 'openers')}
                    >
                      {setupStep === 'squad_home' ? 'Next Team' : 'Choose Openers'}
                    </ActionButton>
                  </div>

                  <button 
                    onClick={() => {
                      const pool = players.filter(p => !(setupStep === 'squad_home' ? awayXI.includes(p.id) : homeXI.includes(p.id)));
                      const selectedIds = pool.slice(0, 11).map(p => p.id);
                      store.updateMatchSettings({
                        [setupStep === 'squad_home' ? 'homeXI' : 'awayXI']: selectedIds
                      });
                    }}
                    style={{ background: 'none', border: 'none', color: '#FAB005', fontSize: '0.7rem', marginTop: 12, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Auto-Fill 11 Players
                  </button>
                </>
              ) : (
                <>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <Users size={20} color="#FAB005" />
                    <h3 style={{ margin: 0, fontWeight: 900 }}>SQUAD SELECTION</h3>
                  </div>

                  <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 8 }}>Select Striker & Non-Striker</p>
                  <SelectionGrid>
                    {players
                      .filter(p => {
                        const batTeamId = (tossWinner === 'home' && tossChoice === 'Bat') || (tossWinner === 'away' && tossChoice === 'Bowl') ? 'HOME' : 'AWAY';
                        const squad = batTeamId === 'HOME' ? homeXI : awayXI;
                        return squad.includes(p.id);
                      })
                      .map(p => (
                      <PlayerCard 
                        key={p.id}
                        $selected={selStriker === p.id || selNonStriker === p.id}
                        onClick={() => {
                          if (selStriker === p.id) setSelStriker(null);
                          else if (selNonStriker === p.id) setSelNonStriker(null);
                          else if (!selStriker) setSelStriker(p.id);
                          else if (!selNonStriker) setSelNonStriker(p.id);
                        }}
                      >
                        <User size={16} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{p.role}</div>
                        </div>
                        {(selStriker === p.id || selNonStriker === p.id) && (
                          <div style={{ marginLeft: 'auto', background: '#FAB005', color: '#111', fontSize: '8px', fontWeight: 900, padding: '2px 4px', borderRadius: 4 }}>
                            {selStriker === p.id ? 'STRIKER' : 'NON-STRIKER'}
                          </div>
                        )}
                      </PlayerCard>
                    ))}
                  </SelectionGrid>

                  <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                    <ActionButton onClick={() => setSetupStep('squad_away')}>Back to Squads</ActionButton>
                    <ActionButton $variant="primary" disabled={!isReadyToStart} onClick={handleStartMatch}>
                      Start Match
                    </ActionButton>
                  </div>
                </>
              )}
        </SetupCard>

        <button 
          onClick={() => navigate('/match-center')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'rgba(255,255,255,0.4)', 
            fontSize: '0.8rem', 
            fontWeight: 600, 
            marginTop: 24, 
            cursor: 'pointer',
            textDecoration: 'underline',
            alignSelf: 'center'
          }}
        >
          Cancel and Return to Match Center
        </button>
      </SetupContainer>
    );
  }

  const handleRecord = (runs: number, type: any = 'legal', isWicket: boolean = false, wicketType?: any, subType: any = 'bat', outPlayerId?: string, newBatterId?: string) => {
    store.recordBall({ runs, type, isWicket, wicketType, subType, outPlayerId, newBatterId });
    if (currentInnings?.totalBalls !== undefined && (currentInnings.totalBalls + (type === 'legal' ? 1 : 0)) % 6 === 0 && type === 'legal') {
      setShowBowlerModal(true);
    }
  };

  const getPlayerName = (id: string | null) => players.find(p => p.id === id)?.name || 'Unknown';
  const strikerStats = currentInnings.battingStats[store.strikerId || ''] || { runs: 0, balls: 0 };
  const nonStrikerStats = currentInnings.battingStats[store.nonStrikerId || ''] || { runs: 0, balls: 0 };
  const bowlerStats = currentInnings?.bowlingStats[store.currentBowlerId || ''] || { overs: 0, runs: 0, wickets: 0 };


  return (
    <DashboardContainer>
      <>
        <Header>
        <IconButton onClick={() => {
          if (window.confirm("Are you sure you want to exit? Unsaved progress for this ball may be lost.")) {
            navigate('/match-center');
          }
        }} aria-label="Go back">
          <ChevronLeft size={24} />
        </IconButton>
        
        <BadgeContainer>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: '13px', letterSpacing: '0.5px' }}>
              {(() => {
                const isInnings1 = store.currentInnings === 1;
                const activeInnings = isInnings1 ? store.innings1 : store.innings2;
                const isHomeBatting = activeInnings?.battingTeamId === 'HOME';
                const teamName = isHomeBatting ? 'Indian Strikers' : (matchMeta?.opponentName || 'SANDBOX XI');
                return `${teamName.toUpperCase()} - INNINGS ${store.currentInnings}`;
              })()}
            </span>
            {store.toss.winnerId && (
              <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginTop: 2 }}>
                {(() => {
                  const winnerName = store.toss.winnerId === 'HOME' ? 'INDIAN STRIKERS' : (matchMeta?.opponentName || 'SANDBOX XI');
                  const target = store.toss.choice === 'Bat' ? 'BAT' : 'BOWL';
                  return `${winnerName} WON TOSS & ELECTED TO ${target}`;
                })()}
              </span>
            )}
            {matchMeta?.is_test && <SandboxBadge style={{ marginTop: 4 }}>Test Sandbox</SandboxBadge>}
          </div>
        </BadgeContainer>

        <div style={{ display: 'flex', gap: 12 }}>
          <IconButton onClick={() => setShowLineups(true)} aria-label="View Lineups">
            <Users size={22} />
          </IconButton>
          <IconButton onClick={() => setShowPurgeConfirm(true)} aria-label="Reset Match">
            <RotateCcw size={20} />
          </IconButton>
          <Settings size={22} />
        </div>
      </Header>

      <AnimatePresence>
        {showPurgeConfirm && (
          <PremiumModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PremiumModalContent style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(255, 77, 77, 0.1)', borderRadius: 32, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <RotateCcw size={32} color="#ff4d4d" />
              </div>
              
              <h2 style={{ margin: '0 0 12px', fontSize: '1.4rem', fontWeight: 900 }}>RESET MATCH?</h2>
              <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: 32, lineHeight: 1.5 }}>
                This will permanently delete all scoring data for this match. You will be returned to the match setup screen.
              </p>

              <SliderTrack>
                <SliderText>Slide to Confirm Reset</SliderText>
                <SliderHandle
                  drag="x"
                  dragConstraints={{ left: 0, right: 240 }}
                  dragElastic={0}
                  onDragEnd={(_, info) => {
                    if (info.offset.x >= 200) {
                      store.clearInnings();
                      setShowPurgeConfirm(false);
                    }
                  }}
                  whileTap={{ scale: 1.1 }}
                >
                  <ChevronRight size={20} color="#fff" />
                </SliderHandle>
              </SliderTrack>

              <button 
                onClick={() => setShowPurgeConfirm(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: 700, marginTop: 24, cursor: 'pointer' }}
              >
                CANCEL
              </button>
            </PremiumModalContent>
          </PremiumModalOverlay>
        )}

        {showLineups && (
          <PremiumModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLineups(false)}
          >
            <PremiumModalContent onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>TEAM SQUADS</h2>
                <IconButton onClick={() => setShowLineups(false)}>
                  <X size={24} />
                </IconButton>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: '0.8rem', color: '#FAB005', marginBottom: 12, textTransform: 'uppercase' }}>Indian Strikers</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {players
                      .filter(p => homeXI.includes(p.id))
                      .map(p => (
                      <div key={p.id} style={{ fontSize: '0.85rem', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        {p.name} <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>({p.role})</span>
                      </div>
                    ))}
                    {homeXI.length === 0 && <div style={{ opacity: 0.4, fontSize: '0.8rem' }}>No XI Selected</div>}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '0.8rem', color: '#FAB005', marginBottom: 12, textTransform: 'uppercase' }}>{matchMeta?.opponentName || 'SANDBOX XI'}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {players
                      .filter(p => awayXI.includes(p.id))
                      .map(p => (
                      <div key={p.id} style={{ fontSize: '0.85rem', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        {p.name} <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>({p.role})</span>
                      </div>
                    ))}
                    {awayXI.length === 0 && <div style={{ opacity: 0.4, fontSize: '0.8rem' }}>No XI Selected</div>}
                  </div>
                </div>
              </div>
            </PremiumModalContent>
          </PremiumModalOverlay>
        )}
      </AnimatePresence>

      <ScoreSection>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#001F3F', opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {store.innings1?.battingTeamId === 'HOME' ? 'Indian Strikers' : (matchMeta?.opponentName || 'SANDBOX XI')} vs {store.innings1?.bowlingTeamId === 'HOME' ? 'Indian Strikers' : (matchMeta?.opponentName || 'SANDBOX XI')}
        </div>
        <MainScore>{currentInnings?.totalRuns || 0}/{currentInnings?.wickets || 0}</MainScore>
        <OversText>OVERS {store.getOvers(currentInnings?.totalBalls || 0)}</OversText>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 12 }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase' }}>CRR</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#001F3F' }}>
              {(() => {
                const totalBalls = currentInnings?.totalBalls || 0;
                if (totalBalls === 0) return '0.00';
                return ((currentInnings?.totalRuns || 0) / (totalBalls / 6)).toFixed(2);
              })()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase' }}>Projected Score</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#001F3F' }}>
              {(() => {
                const totalBalls = currentInnings?.totalBalls || 0;
                const rr = totalBalls === 0 ? 0 : (currentInnings?.totalRuns || 0) / (totalBalls / 6);
                return Math.ceil(rr * (store.maxOvers || 20)) + " Runs";
              })()}
            </div>
          </div>
        </div>

        {store.isFreeHit && (
          <FreeHitBadge
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            FREE HIT
          </FreeHitBadge>
        )}
      </ScoreSection>

      <ActiveParticipants>
        <ParticipantCard $active>
          <CardHeader>
            <NameLabel>Striker*</NameLabel>
            <IconButton 
              onClick={() => store.switchStriker()} 
              style={{ color: '#339AF0', background: 'rgba(51,154,240,0.1)' }}
              title="Switch Striker"
            >
              <RefreshCcw size={12} />
            </IconButton>
          </CardHeader>
          <StatValue>{getPlayerName(store.strikerId)}</StatValue>
          <div style={{ fontSize: '0.8rem' }}>{strikerStats.runs}({strikerStats.balls})</div>
        </ParticipantCard>
        <ParticipantCard>
          <CardHeader>
            <NameLabel>Non-Striker</NameLabel>
          </CardHeader>
          <StatValue>{getPlayerName(store.nonStrikerId)}</StatValue>
          <div style={{ fontSize: '0.8rem' }}>{nonStrikerStats.runs}({nonStrikerStats.balls})</div>
        </ParticipantCard>
        <ParticipantCard style={{ gridColumn: 'span 2' }}>
          <CardHeader>
            <NameLabel>Bowler</NameLabel>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase' }}>This Over</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#001F3F' }}>
                  {(() => {
                    const currentOver = Math.floor((currentInnings?.totalBalls || 0) / 6);
                    return (currentInnings?.history || [])
                      .filter(b => b.overNumber === currentOver)
                      .reduce((sum, b) => sum + b.runs + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                  })()}
                </div>
              </div>
              <IconButton 
                onClick={() => { if(window.confirm("Undo last ball?")) store.undoLastBall(); }}
                style={{ background: 'rgba(0,0,0,0.05)', color: '#001F3F' }}
                title="Undo last ball"
              >
                <Undo size={14} />
              </IconButton>
            </div>
          </CardHeader>
          <StatValue>{getPlayerName(store.currentBowlerId)}</StatValue>
          <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{bowlerStats.wickets}-{bowlerStats.runs} ({bowlerStats.overs})</div>
        </ParticipantCard>
      </ActiveParticipants>

      <TimelineContainer id="match-timeline">
        {(() => {
          const balls = currentInnings?.history || [];
          const last30 = balls.slice(-30);
          
          return last30.map((ball: any, idx: number) => {
            let display = String(ball.runs);
            if (ball.isWicket) display = 'W';
            else if (ball.type === 'wide') display = 'WD';
            else if (ball.type === 'no-ball') display = 'NB';
            else if (ball.type === 'leg-bye') display = `LB${ball.runs}`;
            else if (ball.type === 'bye') display = `B${ball.runs}`;

            const showSeparator = idx > 0 && last30[idx-1].overNumber !== ball.overNumber;

            return (
              <React.Fragment key={`${idx}-${ball.timestamp}`}>
                {showSeparator && <OverSeparator />}
                <BallCircle $type={display}>
                  {display}
                </BallCircle>
              </React.Fragment>
            );
          });
        })()}
        {(currentInnings?.history || []).length === 0 && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>
            WAITING FOR LIVE ACTION...
          </span>
        )}
      </TimelineContainer>

      <ControlsGrid>
        <ScoringBtn onClick={() => handleRecord(0, 'legal')}>0</ScoringBtn>
        <ScoringBtn onClick={() => handleRecord(1, 'legal')}>1</ScoringBtn>
        <ScoringBtn onClick={() => handleRecord(2, 'legal')}>2</ScoringBtn>
        <ScoringBtn onClick={() => handleRecord(3, 'legal')}>3</ScoringBtn>
        <ScoringBtn onClick={() => handleRecord(4, 'legal')}>4</ScoringBtn>
        <ScoringBtn onClick={() => handleRecord(6, 'legal')}>6</ScoringBtn>
        <ScoringBtn $variant="extra" onClick={() => { setExtraType('wd'); setShowNBModal(true); }}>WD</ScoringBtn>
        <ScoringBtn $variant="extra" onClick={() => { setExtraType('nb'); setShowNBModal(true); }}>NB</ScoringBtn>
        <ScoringBtn $variant="extra" onClick={() => { setExtraType('lb'); setShowNBModal(true); }}>LB</ScoringBtn>
        <ScoringBtn $variant="extra" onClick={() => { setExtraType('byes'); setShowNBModal(true); }}>B</ScoringBtn>
        <ScoringBtn $variant="wicket" onClick={() => setShowWicketModal(true)}>W</ScoringBtn>
        <ScoringBtn $variant="extra" style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#FF4D4D', border: '1px solid rgba(255, 77, 77, 0.2)' }} onClick={() => setShowPenaltyModal(true)}>PEN</ScoringBtn>
      </ControlsGrid>

      {showBowlerModal && (
        <ModalOverlay onClick={() => setShowBowlerModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>SELECT NEXT BOWLER</h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 20 }}>Choose the bowler for the next over</p>
            
            <SelectionGrid style={{ maxHeight: '50vh' }}>
              {players
                .filter(p => {
                  const fieldingTeamId = currentInnings.bowlingTeamId;
                  const fieldingTeamXI = fieldingTeamId === 'HOME' ? homeXI : awayXI;
                  const isInCategory = fieldingTeamXI.includes(p.id);
                  const isPrevBowler = p.id === store.currentBowlerId;
                  
                  // Rule: Max overs per bowler (usually match overs / 5)
                  const maxOversPerB = Math.ceil((store.maxOvers || 20) / 5);
                  const stats = currentInnings.bowlingStats[p.id] || { overs: 0 };
                  const hasReachedLimit = stats.overs >= maxOversPerB;

                  return isInCategory && !isPrevBowler && !hasReachedLimit;
                })
                .map(p => {
                  const bStats = currentInnings.bowlingStats[p.id] || { overs: 0, runs: 0, wickets: 0 };
                  return (
                    <PlayerCard 
                      key={p.id} 
                      onClick={() => {
                        store.setNewBowler(p.id);
                        setShowBowlerModal(false);
                      }}
                    >
                      <User size={16} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{bStats.wickets}-{bStats.runs} ({bStats.overs})</div>
                      </div>
                    </PlayerCard>
                  )
                })}
            </SelectionGrid>

            <button 
              onClick={() => setShowBowlerModal(false)}
              style={{ background: 'none', border: 'none', color: '#FAB005', fontSize: '0.9rem', fontWeight: 700, marginTop: 24, cursor: 'pointer', width: '100%' }}
            >
              CANCEL
            </button>
          </ModalContent>
        </ModalOverlay>
      )}
      {showNBModal && (
        <ModalOverlay onClick={() => setShowNBModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>{extraType.toUpperCase()} OPTIONS</h2>
            
            {extraType === 'nb' && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 8 }}>
                {(['bat', 'bye', 'lb'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setNbSubType(t)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 6, border: 'none', fontSize: '0.7rem', fontWeight: 800,
                      background: nbSubType === t ? '#FAB005' : 'transparent',
                      color: nbSubType === t ? '#000' : '#FFF',
                      cursor: 'pointer'
                    }}
                  >
                    {t === 'bat' ? 'OFF BAT' : t.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 20 }}>Select additional runs scored</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[0, 1, 2, 3, 4, 6].map(runs => (
                <ScoringBtn 
                  key={runs} 
                  style={{ height: 60, fontSize: '1.2rem' }}
                  onClick={() => {
                    handleRecord(runs, extraType === 'wd' ? 'wide' : (extraType === 'nb' ? 'no-ball' : (extraType === 'byes' ? 'bye' : 'leg-bye')), false, undefined, (extraType === 'nb' ? nbSubType : 'bat'));
                    setShowNBModal(false);
                  }}
                >
                  {runs}
                </ScoringBtn>
              ))}
            </div>
            
            <button 
              onClick={() => setShowNBModal(false)}
              style={{ background: 'none', border: 'none', color: '#FAB005', fontSize: '0.9rem', fontWeight: 700, marginTop: 24, cursor: 'pointer', width: '100%' }}
            >
              CANCEL
            </button>
          </ModalContent>
        </ModalOverlay>
      )}

      {showWicketModal && !runOutInvolved && !showBatterSelectModal && (
        <ModalOverlay onClick={() => setShowWicketModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 20 }}>DISMISSAL TYPE</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {['Bowled', 'Caught', 'LBW', 'Stumped', 'Hit Wicket', 'Retired Hurt', 'Retired Out'].map(type => (
                <button
                  key={type}
                  style={{ 
                    padding: '12px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', 
                    background: 'rgba(255,255,255,0.05)', color: '#FFF', fontWeight: 700, fontSize: '0.75rem'
                  }}
                  onClick={() => {
                    setPendingWicketType(type);
                    setShowBatterSelectModal(true);
                  }}
                >
                  {type}
                </button>
              ))}
              <button
                style={{ gridColumn: 'span 2', padding: 16, borderRadius: 12, border: '2px solid #FAB005', background: 'rgba(250, 176, 5, 0.1)', color: '#FAB005', fontWeight: 900 }}
                onClick={() => setRunOutInvolved({ victimId: '', runs: 0 })}
              >
                RUN OUT
              </button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {showBatterSelectModal && (
        <ModalOverlay onClick={() => setShowBatterSelectModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>SELECT NEXT BATTER</h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 20 }}>Choose player from the bench</p>
            
            <SelectionGrid style={{ maxHeight: '50vh' }}>
              {players
                .filter(p => {
                  const battingTeamXI = store.currentInnings === 1 ? homeXI : awayXI;
                  const isInCategory = battingTeamXI.includes(p.id);
                  const isAlreadyBatting = p.id === store.strikerId || p.id === store.nonStrikerId;
                  const alreadyOut = currentInnings.battingStats[p.id]?.status === 'out';
                  return isInCategory && !isAlreadyBatting && !alreadyOut;
                })
                .map(p => (
                <PlayerCard 
                  key={p.id} 
                  onClick={() => {
                    if (runOutInvolved) {
                      handleRecord(runOutInvolved.runs, 'legal', true, 'Run Out', 'bat', runOutInvolved.victimId, p.id);
                      setRunOutInvolved(null);
                    } else {
                      handleRecord(0, 'legal', true, pendingWicketType, 'bat', undefined, p.id);
                    }
                    setShowBatterSelectModal(false);
                    setShowWicketModal(false);
                    setPendingWicketType(null);
                    
                    // Trigger Splash
                    setShowWicketSplash(true);
                    setTimeout(() => setShowWicketSplash(false), 1500);
                  }}
                >
                  <User size={16} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{p.role || 'Player'}</div>
                  </div>
                </PlayerCard>
              ))}
              {players.filter(p => {
                const bId = store.currentInnings === 1 ? homeXI : awayXI;
                return bId.includes(p.id) && p.id !== store.strikerId && p.id !== store.nonStrikerId && currentInnings.battingStats[p.id]?.status !== 'out';
              }).length === 0 && (
                <div style={{ textAlign: 'center', opacity: 0.4, padding: 20 }}>No more players available.</div>
              )}
            </SelectionGrid>

            <button 
              onClick={() => setShowBatterSelectModal(false)}
              style={{ background: 'none', border: 'none', color: '#FAB005', fontSize: '0.9rem', fontWeight: 700, marginTop: 24, cursor: 'pointer', width: '100%' }}
            >
              CANCEL
            </button>
          </ModalContent>
        </ModalOverlay>
      )}

      <AnimatePresence>
        {showWicketSplash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255, 77, 77, 0.9)', zIndex: 9999, pointerEvents: 'none'
            }}
          >
            <h1 style={{ color: '#FFF', fontSize: '8rem', fontWeight: 900, textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>OUT!</h1>
          </motion.div>
        )}
      </AnimatePresence>

      {runOutInvolved && (
        <ModalOverlay>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>RUN OUT</h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 24 }}>Select details of the run out</p>
            
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Who is out?</p>
              <div style={{ display: 'flex', gap: 12 }}>
                {[store.strikerId, store.nonStrikerId].map(id => id && (
                  <button
                    key={id}
                    onClick={() => setRunOutInvolved({ ...runOutInvolved, victimId: id })}
                    style={{
                      flex: 1, padding: 16, borderRadius: 12, border: 'none', fontWeight: 700,
                      background: runOutInvolved.victimId === id ? '#FAB005' : 'rgba(255,255,255,0.05)',
                      color: runOutInvolved.victimId === id ? '#000' : '#FFF'
                    }}
                  >
                    {getPlayerName(id)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Runs Completed</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[0, 1, 2, 3].map(r => (
                  <button
                    key={r}
                    onClick={() => setRunOutInvolved({ ...runOutInvolved, runs: r })}
                    style={{
                      padding: 12, borderRadius: 8, border: 'none', fontWeight: 800,
                      background: runOutInvolved.runs === r ? '#FAB005' : 'rgba(255,255,255,0.05)',
                      color: runOutInvolved.runs === r ? '#000' : '#FFF'
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <ActionButton 
              $variant="primary" 
              disabled={!runOutInvolved.victimId}
              onClick={() => {
                setShowBatterSelectModal(true);
              }}
            >
              SELECT NEXT BATTER
            </ActionButton>
            
            <button 
              onClick={() => setRunOutInvolved(null)}
              style={{ background: 'none', border: 'none', color: '#FAB005', fontSize: '0.9rem', fontWeight: 700, marginTop: 20, cursor: 'pointer', width: '100%' }}
            >
              BACK
            </button>
          </ModalContent>
        </ModalOverlay>
      )}

      {showPenaltyModal && (
        <ModalOverlay onClick={() => setShowPenaltyModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>AWARD PENALTY</h2>
            <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 24 }}>Select the incident to award penalty runs</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: 'rgba(250, 176, 5, 0.1)', padding: 16, borderRadius: 12, border: '1px solid rgba(250, 176, 5, 0.2)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#FAB005', marginBottom: 12, textTransform: 'uppercase' }}>FIELDING TEAM ERRORS (+5 to Batting Team)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  {[
                    'Ball Hit Helmet (on ground)',
                    'Fake Fielding / Obstruction',
                    'Illegal Fielder Movement',
                    'Fielder returning without permission',
                    'Slow Over Rate Penalty'
                  ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => {
                        store.recordPenalty('batting', 5);
                        setShowPenaltyModal(false);
                      }}
                      style={{ padding: '12px', textAlign: 'left', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: '#FFF', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 77, 77, 0.1)', padding: 16, borderRadius: 12, border: '1px solid rgba(255, 77, 77, 0.2)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#FF4D4D', marginBottom: 12, textTransform: 'uppercase' }}>BATTING TEAM MISCONDUCT (+5 to Fielding Team)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  {[
                    'Running on Protected Area',
                    'Timewasting by Batsman',
                    'Damage to the Pitch',
                    'Deliberate Short Running'
                  ].map(reason => (
                    <button
                      key={reason}
                      onClick={() => {
                        store.recordPenalty('bowling', 5);
                        setShowPenaltyModal(false);
                      }}
                      style={{ padding: '12px', textAlign: 'left', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: '#FFF', fontSize: '0.8rem', cursor: 'pointer', width: '100%' }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  onClick={() => {
                    const r = window.prompt("Penalty runs for Batting Team:", "5");
                    if (r && !isNaN(parseInt(r))) {
                      store.recordPenalty('batting', parseInt(r));
                      setShowPenaltyModal(false);
                    }
                  }}
                  style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FAB005', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}
                >
                  CUSTOM (BAT)
                </button>
                <button
                  onClick={() => {
                    const r = window.prompt("Penalty runs for Fielding Team:", "5");
                    if (r && !isNaN(parseInt(r))) {
                      store.recordPenalty('bowling', parseInt(r));
                      setShowPenaltyModal(false);
                    }
                  }}
                  style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FF4D4D', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer' }}
                >
                  CUSTOM (BOWL)
                </button>
              </div>
            </div>

            <button 
              onClick={() => setShowPenaltyModal(false)}
              style={{ background: 'none', border: 'none', color: '#FAB005', fontSize: '0.9rem', fontWeight: 700, marginTop: 20, cursor: 'pointer', width: '100%' }}
            >
              CANCEL
            </button>
          </ModalContent>
        </ModalOverlay>
      )}
      {isInningsBreak && (
        <ModalOverlay>
          <ModalContent style={{ textAlign: 'center', padding: 40 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 12 }}>INNINGS COMPLETED!</h1>
            <p style={{ opacity: 0.6, marginBottom: 32 }}>
              {store.innings1?.battingTeamId === 'HOME' ? 'INDIAN STRIKERS' : (matchMeta?.opponentName || 'SANDBOX XI')} finished at {store.innings1?.totalRuns || 0}/{store.innings1?.wickets || 0}
            </p>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 24, borderRadius: 16, marginBottom: 32 }}>
              <p style={{ fontSize: '0.8rem', opacity: 0.4, textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>Target</p>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FAB005' }}>{(store.innings1?.totalRuns || 0) + 1}</h2>
              <p style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: 8 }}>from {(store.maxOvers || 20) * 6} balls</p>
            </div>
            <ActionButton 
              $variant="primary" 
              onClick={() => {
                setSetupStep('openers');
                // The currentInnings will still be 1 until we call startInnings for 2
                // We'll handle selecting openers for the other team
                setSelStriker(null);
                setSelNonStriker(null);
                setSelBowler(null);
              }}
            >
              START 2ND INNINGS
            </ActionButton>
          </ModalContent>
        </ModalOverlay>
      )}

      {isMatchComplete && (
        <ModalOverlay>
          <ModalContent style={{ textAlign: 'center', padding: 40 }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 12 }}>MATCH COMPLETED!</h1>
            <h2 style={{ color: '#FAB005', marginBottom: 32 }}>
              {(() => {
                const i1 = store.innings1?.totalRuns || 0;
                const i2 = store.innings2?.totalRuns || 0;
                if (i2 > i1) {
                  return `${store.innings2?.battingTeamId === 'HOME' ? 'INDIAN STRIKERS' : (matchMeta?.opponentName || 'SANDBOX XI')} WON BY ${10 - (store.innings2?.wickets || 0)} WICKETS`;
                } else if (i1 > i2) {
                  return `${store.innings1?.battingTeamId === 'HOME' ? 'INDIAN STRIKERS' : (matchMeta?.opponentName || 'SANDBOX XI')} WON BY ${i1 - i2} RUNS`;
                }
                return "MATCH TIED";
              })()}
            </h2>
            <ActionButton $variant="primary" onClick={() => navigate('/match-center')}>
              RETURN TO MATCH CENTER
            </ActionButton>
          </ModalContent>
        </ModalOverlay>
      )}
      </>
    </DashboardContainer>
  );
};

export default ScorerDashboard;
