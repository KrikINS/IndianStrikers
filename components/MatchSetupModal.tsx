import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Settings,
  MapPin,
  Shield,
  Plus,
  Minus,
  Users,
  User
} from 'lucide-react';
import { Player, ScheduledMatch, MatchSetupData } from '../types';
import { toast } from 'react-hot-toast';

// --- Styled Components (Migrated from ScorerDashboard) ---

const SetupContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: linear-gradient(135deg, #001F3F 0%, #083358 100%);
  display: flex;
  flex-direction: column;
  color: white;
  padding: 20px;
  overflow-y: auto;
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

const Header = styled.header`
  background-color: #001F3F;
  color: #FFFFFF;
  padding: 4px 12px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
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
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${props => props.$active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'};
  transition: all 0.3s ease;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 10px;
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
  background: ${props => props.$variant === 'primary' ? '#38BDF8' : 'rgba(255,255,255,0.1)'};
  color: ${props => props.$variant === 'primary' ? '#001F3F' : '#FFF'};

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

const PlayerCard = styled.div<{ $selected?: boolean; $disabled?: boolean }>`
  padding: 12px 16px;
  background: ${props => props.$selected ? 'rgba(250, 176, 5, 0.2)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${props => props.$selected ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all 0.2s;

  &:hover {
    ${props => !props.$disabled && 'background: rgba(255,255,255,0.1);'}
  }
`;

const SelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  max-height: 400px;

  @media (min-width: 480px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    padding: 16px;
  }
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

// MatchSetupData is defined in ../types.ts (single source of truth)

interface MatchSetupModalProps {
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  team1Logo?: string;
  team2Logo?: string;
  team1XI: string[];
  team2XI: string[];
  players: Player[]; // Team 1 Pool
  opponentPlayers: any[]; // Team 2 Pool
  allOpponents: any[];
  grounds: any[];
  matchMeta: ScheduledMatch | undefined;
  innings1: any;
  onSetupComplete: (data: MatchSetupData) => void;
  onCancel: () => void;
  onOpenSettings: () => void;
}

// --- Component ---

export const MatchSetupModal: React.FC<MatchSetupModalProps> = ({
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  team1Logo,
  team2Logo,
  team1XI: initialTeam1XI,
  team2XI: initialTeam2XI,
  players,
  opponentPlayers,
  allOpponents,
  grounds,
  matchMeta,
  innings1,
  onSetupComplete,
  onCancel,
  onOpenSettings
}) => {
  const [setupStep, setSetupStep] = useState<'preview' | 'toss' | 'squad_team1' | 'squad_team2' | 'openers_bat' | 'openers_bowl'>(innings1 ? 'openers_bat' : 'preview');
  const [tossWinner, setTossWinner] = useState<'TEAM1' | 'TEAM2' | null>(null);
  const [tossChoice, setTossChoice] = useState<'Bat' | 'Bowl' | null>(null);
  const [tempMaxOvers, setTempMaxOvers] = useState(matchMeta?.maxOvers || 20);
  
  const [localTeam1XI, setLocalTeam1XI] = useState<string[]>(initialTeam1XI || []);
  const [localTeam2XI, setLocalTeam2XI] = useState<string[]>(initialTeam2XI || []);
  
  const [selStriker, setSelStriker] = useState<string | null>(null);
  const [selNonStriker, setSelNonStriker] = useState<string | null>(null);
  const [selBowler, setSelBowler] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('All');

  // Helpers
  const isValidMatchId = (mid: any): mid is string => mid && typeof mid === 'string';
  
  const resolveGroundName = (gid: string | undefined, gname: string | undefined) => {
    if (gid && gid !== 'null' && gid !== 'default') {
      const g = grounds?.find(gr => String(gr.id) === String(gid));
      if (g) return g.name;
    }
    return gname || 'Unknown Ground';
  };

  const resolveTournament = (tid: string | undefined, tname: string | undefined) => {
    return tname || 'Unknown Tournament';
  };

  const isTeam1IndianStrikers = team1Id === '00000000-0000-0000-0000-000000000000' || team1Id === 'IND_STRIKERS';
  const isTeam2IndianStrikers = team2Id === '00000000-0000-0000-0000-000000000000' || team2Id === 'IND_STRIKERS';
  
  // Assign the correct player pool based on which team is Indian Strikers
  const team1Pool = isTeam1IndianStrikers ? players : opponentPlayers;
  const team2Pool = isTeam2IndianStrikers ? players : opponentPlayers;

  // For friendly matches, opponents might not have 11 players. Allow bypassing the 11-player rule for opponents.
  const isTeam1Valid = isTeam1IndianStrikers ? localTeam1XI.length === 11 : localTeam1XI.length > 0;
  const isTeam2Valid = isTeam2IndianStrikers ? localTeam2XI.length === 11 : localTeam2XI.length > 0;

  // For 2nd innings: squads are already set from innings 1, only need openers + bowler.
  // For 1st innings: full validation (toss + players each side + openers + bowler).
  const isReadyToStart = innings1
    ? (selStriker && selNonStriker && selBowler)
    : ((tossWinner && tossChoice) &&
       isTeam1Valid &&
       isTeam2Valid &&
       selStriker && selNonStriker && selBowler);

  const handleFinish = () => {
    if (!isReadyToStart) {
      toast.error(innings1 ? "Please select 2 openers and a bowler." : "Please complete all setup selections first.");
      return;
    }
    onSetupComplete({
      tossWinner: innings1 ? (matchMeta?.toss?.winner === team1Id ? 'TEAM1' : 'TEAM2') : tossWinner!,
      tossChoice: innings1 ? (matchMeta?.toss?.choice === 'Field' ? 'Bowl' : (matchMeta?.toss?.choice || 'Bat')) : tossChoice!,
      maxOvers: tempMaxOvers,
      // For 2nd innings, pass back the original XIs (already locked in innings 1).
      team1XI: innings1 ? initialTeam1XI : localTeam1XI,
      team2XI: innings1 ? initialTeam2XI : localTeam2XI,
      strikerId: selStriker!,
      nonStrikerId: selNonStriker!,
      bowlerId: selBowler!
    });
  };

  return (
    <SetupContainer>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button title="Back" onClick={onCancel} className="p-2 hover:bg-slate-100/10 rounded-xl transition-all text-white"><ChevronLeft /></button>
          <span style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '1px' }}>MATCH SETUP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            title="Match Settings"
            onClick={onOpenSettings}
            className="p-2 hover:bg-slate-100/10 rounded-full transition-all text-white"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={20} />
          </button>
        </div>
      </Header>

      <SetupCard>
        {setupStep === 'preview' ? (
          <>
            {(() => {
              const displayTournament = resolveTournament(matchMeta?.tournamentId ?? undefined, matchMeta?.tournament ?? undefined);
              const displayGround = resolveGroundName(matchMeta?.groundId ?? undefined, undefined);
              const opponentMeta = (allOpponents || []).find(o => String(o.id) === String(matchMeta?.team2Id));
              const displayTeam2Name = team2Name || opponentMeta?.name || 'OPPONENT';
              const displayTeam2Logo = team2Logo || opponentMeta?.logoUrl || '';

              return (
                <>
                  <MatchTitle style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>{displayTournament.toUpperCase()}</MatchTitle>
                  <GroundText>
                    <MapPin size={14} /> {String(displayGround).toUpperCase()}
                  </GroundText>

                  <TeamRow>
                    <TeamBlock>
                      <TeamLogoCircle $active>
                        <img src={team1Logo || '/INS%20LOGO.PNG'} alt="T1" />
                      </TeamLogoCircle>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>{team1Name.toUpperCase()}</span>
                    </TeamBlock>
                    <TeamBlock>
                      <TeamLogoCircle>
                        {displayTeam2Logo ? (
                          <img src={displayTeam2Logo} alt="T2" />
                        ) : (
                          <Shield size={40} color="rgba(255,255,255,0.3)" />
                        )}
                      </TeamLogoCircle>
                      <span style={{ fontStyle: 'italic', fontWeight: 900, fontSize: '1rem', textAlign: 'center', color: '#FAB005' }}>
                        {displayTeam2Name.toUpperCase()}
                      </span>
                    </TeamBlock>
                  </TeamRow>
                </>
              );
            })()}

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
              <TossOption $selected={tossWinner === 'TEAM1'} onClick={() => setTossWinner('TEAM1')}>
                {team1Name}
              </TossOption>
              <TossOption $selected={tossWinner === 'TEAM2'} onClick={() => setTossWinner('TEAM2')}>
                {team2Name}
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
              <ActionButton $variant="primary" disabled={!tossWinner || !tossChoice} onClick={() => {
                if (isTeam1Valid && isTeam2Valid) {
                  setSetupStep('openers_bat');
                } else if (!isTeam1Valid) {
                  setSetupStep('squad_team1');
                } else {
                  setSetupStep('squad_team2');
                }
              }}>
                {(isTeam1Valid && isTeam2Valid) ? 'Choose Openers' : 'Select Squads'}
              </ActionButton>
            </div>
          </>
        ) : setupStep === 'squad_team1' || setupStep === 'squad_team2' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {setupStep === 'squad_team1' ? <Shield size={20} color="#FAB005" /> : <Users size={20} color="#FAB005" />}
                <h3 style={{ margin: 0, fontWeight: 900 }}>
                  {setupStep === 'squad_team1' ? `${team1Name.toUpperCase()} ROSTER` : `${team2Name.toUpperCase()} ROSTER`}
                </h3>
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#FAB005' }}>
                {setupStep === 'squad_team1' ? localTeam1XI.length : localTeam2XI.length} / 11
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
              {(setupStep === 'squad_team1' ? team1Pool : team2Pool)
                .filter((p: any) => {
                  const matchesRole = roleFilter === 'All' || p.role === roleFilter;
                  const isActuallyActive = setupStep === 'squad_team2' || (p.isActive && p.status !== 'inactive');
                  return matchesRole && isActuallyActive;
                })
                .map((p: any) => {
                  const currentXI = setupStep === 'squad_team1' ? localTeam1XI : localTeam2XI;
                  const isSelected = currentXI.includes(p.id);

                  return (
                    <PlayerCard
                      key={p.id}
                      $selected={isSelected}
                      onClick={() => {
                        let newSquad;
                        if (isSelected) {
                          newSquad = currentXI.filter(id => id !== p.id);
                        } else if (currentXI.length < 11) {
                          newSquad = [...currentXI, p.id];
                        } else return;

                        if (setupStep === 'squad_team1') setLocalTeam1XI(newSquad);
                        else setLocalTeam2XI(newSquad);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                        <User size={14} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{p.role}</div>
                        </div>
                      </div>
                      {setupStep === 'squad_team1' && (
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
                      )}
                    </PlayerCard>
                  );
                })}
            </SelectionGrid>

            <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
              <ActionButton onClick={() => {
                if (setupStep === 'squad_team1') {
                  setSetupStep('toss');
                } else {
                  if (isTeam1Valid) {
                    setSetupStep('squad_team1');
                  } else {
                    setSetupStep('toss');
                  }
                }
              }}>
                Back
              </ActionButton>
              <ActionButton
                $variant="primary"
                disabled={setupStep === 'squad_team1' ? !isTeam1Valid : !isTeam2Valid}
                onClick={() => setSetupStep(setupStep === 'squad_team1' ? (isTeam2Valid ? 'openers_bat' : 'squad_team2') : 'openers_bat')}
              >
                {setupStep === 'squad_team1' && !isTeam2Valid ? 'Next Team' : 'Choose Openers'}
              </ActionButton>
            </div>
          </>
        ) : setupStep === 'openers_bat' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Users size={20} color="#FAB005" />
              <h3 style={{ margin: 0, fontWeight: 900 }}>CHOOSE OPENING BATSMEN</h3>
            </div>

            {(() => {
              // INNINGS FLIP: For 2nd innings, read the actual battingTeamId from innings1
              // instead of recalculating from toss (toss state is null during innings 2).
              const getInningsBattingTeam = () => {
                if (innings1) {
                  // The 2nd innings batting team is whoever BOWLED in innings 1
                  return innings1.bowlingTeamId === team1Id ? 'TEAM1' : 'TEAM2';
                }
                // 1st innings: derive from toss
                const winnerId = tossWinner;
                return ((winnerId === 'TEAM1' && tossChoice === 'Bat') || (winnerId === 'TEAM2' && tossChoice === 'Bowl')) ? 'TEAM1' : 'TEAM2';
              };

              const batTeamType = getInningsBattingTeam();
              const batTeamName = batTeamType === 'TEAM1' ? team1Name : team2Name;
              const batSquadIds = batTeamType === 'TEAM1' ? localTeam1XI : localTeam2XI;
              const allAvailablePlayers = [...players, ...opponentPlayers];
              const batPool = batSquadIds.map(id => allAvailablePlayers.find(p => p.id === id)).filter(Boolean);

              return (
                <>
                  <div style={{ background: 'rgba(250, 176, 5, 0.1)', border: '1px solid rgba(250, 176, 5, 0.2)', padding: '10px 16px', borderRadius: 12, marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 900, color: '#FAB005', opacity: 0.8, textTransform: 'uppercase' }}>Current Batting Team</p>
                    <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 900, color: '#FFF' }}>{batTeamName}</p>
                  </div>
                  <SelectionGrid>
                    {batPool.map((p: any) => (
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
                </>
              );
            })()}

            <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
              {/* During 2nd innings, squad selection is already done — skip Back to squads */}
              <ActionButton onClick={() => innings1 ? onCancel() : setSetupStep('squad_team2')}>Back</ActionButton>
              <ActionButton $variant="primary" disabled={!selStriker || !selNonStriker} onClick={() => setSetupStep('openers_bowl')}>
                Choose Bowler
              </ActionButton>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Users size={20} color="#FAB005" />
              <h3 style={{ margin: 0, fontWeight: 900 }}>CHOOSE OPENING BOWLER</h3>
            </div>

            {(() => {
              // INNINGS FLIP: For 2nd innings, read the actual bowlingTeamId from innings1.
              const getInningsBowlingTeam = () => {
                if (innings1) {
                  // The 2nd innings bowling team is whoever BATTED in innings 1
                  return innings1.battingTeamId === team1Id ? 'TEAM1' : 'TEAM2';
                }
                // 1st innings: batting team's opposite
                const winnerId = tossWinner;
                const firstInningsBatTeamId = ((winnerId === 'TEAM1' && tossChoice === 'Bat') || (winnerId === 'TEAM2' && tossChoice === 'Bowl')) ? 'TEAM1' : 'TEAM2';
                return firstInningsBatTeamId === 'TEAM1' ? 'TEAM2' : 'TEAM1';
              };

              const bowlTeamType = getInningsBowlingTeam();
              const bowlTeamName = bowlTeamType === 'TEAM1' ? team1Name : team2Name;
              const bowlSquadIds = bowlTeamType === 'TEAM1' ? localTeam1XI : localTeam2XI;
              const allAvailablePlayers = [...players, ...opponentPlayers];
              const bowlPool = bowlSquadIds.map(id => allAvailablePlayers.find(p => p.id === id)).filter(Boolean);

              return (
                <>
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '10px 16px', borderRadius: 12, marginBottom: 20 }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 900, color: '#38BDF8', opacity: 0.8, textTransform: 'uppercase' }}>Current Bowling Team</p>
                    <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 900, color: '#FFF' }}>{bowlTeamName}</p>
                  </div>
                  <SelectionGrid>
                    {bowlPool.map((p: any) => (
                      <PlayerCard
                        key={p.id}
                        $selected={selBowler === p.id}
                        onClick={() => setSelBowler(selBowler === p.id ? null : p.id)}
                      >
                        <User size={16} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{p.role}</div>
                        </div>
                        {selBowler === p.id && (
                          <div style={{ marginLeft: 'auto', background: '#FAB005', color: '#111', fontSize: '8px', fontWeight: 900, padding: '2px 4px', borderRadius: 4 }}>
                            BOWLER
                          </div>
                        )}
                      </PlayerCard>
                    ))}
                  </SelectionGrid>
                </>
              );
            })()}

            <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
              <ActionButton onClick={() => setSetupStep('openers_bat')}>Back</ActionButton>
              <ActionButton $variant="primary" disabled={!isReadyToStart} onClick={handleFinish}>
                {innings1 ? 'Start 2nd Innings' : 'Start Match'}
              </ActionButton>
            </div>
          </>
        )}
      </SetupCard>
    </SetupContainer>
  );
};
