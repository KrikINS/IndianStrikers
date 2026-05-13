import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, LayoutList } from 'lucide-react';
import {
  MiddleWorkspace, ScoreSection, FreeHitBadge, ScorecardPillBtn,
  MainScore, OversText, ActiveParticipants, PartnershipRow, BowlerRow,
  PartnershipMain, PartnershipSub, ParticipantCard, CardHeader,
  NameLabel, StatValue
} from './ScorerStyles';
import { ScheduledMatch } from '../../types';
import { InningsState, UnifiedMatchStore } from '../../types';

export interface ScoreSectionProps {
  store: UnifiedMatchStore;
  currentInnings: InningsState | null;
  matchMeta: ScheduledMatch | undefined;
  partnershipData: { totalRuns: number; totalBalls: number };
  strikerStats: { runs: number; balls: number };
  nonStrikerStats: { runs: number; balls: number };
  bowlerStats: { overs: number; runs: number; wickets: number };
  isLocked: boolean;
  isOverComplete: boolean;
  getPlayerName: (id: any) => string;
  onScorecardOpen: () => void;
  onBowlerChange: () => void;
  onStrikerSwitch: () => void;
}

export const ScoreSectionPanel: React.FC<ScoreSectionProps> = ({
  store, currentInnings, matchMeta, partnershipData,
  strikerStats, nonStrikerStats, bowlerStats,
  isLocked, isOverComplete, getPlayerName,
  onScorecardOpen, onBowlerChange, onStrikerSwitch,
}) => {
  // Alias to match original variable names in extracted JSX
  const setShowScorecardModal = (v: boolean) => { if (v) onScorecardOpen(); };
  const setShowBowlerModal = (v: boolean) => { if (v) onBowlerChange(); };

  return (
          <MiddleWorkspace>
            <ScoreSection style={{ position: 'relative' }}>
              {/* FREE HIT BADGE */}
              {store.isFreeHit && (
                <div style={{ position: 'absolute', top: 10, left: 20 }}>
                  <FreeHitBadge
                    animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ fontSize: '10px', padding: '4px 12px', background: '#FF4D4D' }}
                  >
                    FREE HIT
                  </FreeHitBadge>
                </div>
              )}

              {/* LEFT: SCORECARD BUTTON */}
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                <ScorecardPillBtn onClick={() => setShowScorecardModal(true)}>
                  <LayoutList size={14} /> SCORECARD
                </ScorecardPillBtn>
              </div>

              {/* CENTER: MAIN SCORE */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <MainScore style={{ fontSize: '3rem', margin: 0, fontWeight: 900, letterSpacing: '-2px', color: '#001F3F' }}>
                  {currentInnings?.totalRuns || 0}/{currentInnings?.wickets || 0}
                </MainScore>
                <OversText style={{ fontSize: '1.1rem', fontWeight: 900, opacity: 0.8, color: '#1a73e8', letterSpacing: 1, marginTop: 4 }}>
                  {store.getOvers(currentInnings?.totalBalls || 0)} OVERS
                </OversText>
                
                {store.currentInnings === 2 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 900, 
                      marginTop: 8, 
                      color: '#001F3F', 
                      background: '#FFF', 
                      padding: '6px 14px', 
                      borderRadius: 100, 
                      letterSpacing: 0.5,
                      whiteSpace: 'nowrap',
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10
                    }}
                  >
                    {(() => {
                      const target = (store.innings1?.totalRuns || 0) + 1;
                      const runsNeeded = target - (store.innings2?.totalRuns || 0);
                      const ballsRemaining = (store.maxOvers || 20) * 6 - (store.innings2?.totalBalls || 0);
                      const battingTeam = store.innings2?.battingTeamId === 'HOME' ? 'INDIAN STRIKERS' : (matchMeta?.team2Name || 'OPPONENT');
                      
                      if (runsNeeded <= 0) return `${battingTeam.toUpperCase()} WON`;
                      if (ballsRemaining <= 0) return 'INNINGS OVER';
                      return `${battingTeam.toUpperCase()} REQUIRE ${runsNeeded} RUNS IN ${ballsRemaining} BALLS`;
                    })()}
                  </motion.div>
                )}
              </div>

              {/* RIGHT: CRR & PROJ & RRR */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>CRR</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#001F3F' }}>
                    {(() => {
                      const totalBalls = currentInnings?.totalBalls || 0;
                      if (totalBalls === 0) return '0.00';
                      return ((currentInnings?.totalRuns || 0) / (totalBalls / 6)).toFixed(2);
                    })()}
                  </div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>PROJ</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FAB005' }}>
                    {(() => {
                      const totalBalls = currentInnings?.totalBalls || 0;
                      const rr = totalBalls === 0 ? 0 : (currentInnings?.totalRuns || 0) / (totalBalls / 6);
                      return Math.ceil(rr * (store.maxOvers || 20));
                    })()}
                  </div>
                </div>

                {store.currentInnings === 2 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>RRR</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FF4D4D' }}>
                      {(() => {
                        const target = (store.innings1?.totalRuns || 0) + 1;
                        const runsNeeded = target - (store.innings2?.totalRuns || 0);
                        const ballsRemaining = (store.maxOvers || 20) * 6 - (store.innings2?.totalBalls || 0);
                        if (runsNeeded <= 0) return '0.00';
                        if (ballsRemaining <= 0) return '-';
                        return (runsNeeded / (ballsRemaining / 6)).toFixed(2);
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </ScoreSection>

            <ActiveParticipants>
              <ParticipantCard $active>
                <CardHeader>
                  <NameLabel>Striker*</NameLabel>
                  <button
                    title="Switch Striker"
                    onClick={() => {
                      if (isLocked) return;
                      store.switchStriker();
                    }}
                    style={{
                      color: '#070707ff',
                      background: 'rgba(51,154,240,0.1)',
                      border: 'none',
                      borderRadius: '50%',
                      padding: '4px',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.5 : 1
                    }}
                  >
                    <RefreshCcw size={12} />
                  </button>
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
            </ActiveParticipants>

            <PartnershipRow>
              <PartnershipMain>
                PARTNERSHIP: <b>{partnershipData.totalRuns}</b> ({partnershipData.totalBalls})
              </PartnershipMain>
              <PartnershipSub>
                {getPlayerName(store.strikerId)} <b>{strikerStats.runs}({strikerStats.balls})*</b> &nbsp;|&nbsp; {getPlayerName(store.nonStrikerId)} <b>{nonStrikerStats.runs}({nonStrikerStats.balls})</b>
              </PartnershipSub>
            </PartnershipRow>

            <BowlerRow>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#495057', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.6 }}>Bowler</span>
                  <button
                    onClick={() => {
                      if (isLocked) return;
                      setShowBowlerModal(true);
                    }}
                    style={{
                      background: 'rgba(51,154,240,0.1)', border: 'none', borderRadius: 12, padding: '2px 8px', color: '#339AF0', fontSize: '9px', fontWeight: 800, cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.5 : 1
                    }}
                  >
                    CHANGE
                  </button>
                </div>
                <StatValue style={{ color: (bowlerStats.overs >= Math.ceil((store.maxOvers || 20) / 5)) ? '#FF4D4D' : 'inherit' }}>
                  {getPlayerName(store.currentBowlerId)}
                </StatValue>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: (bowlerStats.overs >= Math.ceil((store.maxOvers || 20) / 5)) ? '#FF4D4D' : 'inherit' }}>
                  {bowlerStats.wickets}-{bowlerStats.runs} ({bowlerStats.overs})
                  {bowlerStats.overs >= Math.ceil((store.maxOvers || 20) / 5) && " • QUOTA DONE"}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#495057', textTransform: 'uppercase', opacity: 0.6 }}>This Over</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#001F3F' }}>
                  {(() => {
                    const ballsCount = currentInnings?.totalBalls || 0;
                    const displayOver = (isOverComplete && ballsCount % 6 === 0)
                      ? Math.floor(ballsCount / 6) - 1
                      : Math.floor(ballsCount / 6);
                    return (currentInnings?.history || [])
                      .filter(b => b.overNumber === displayOver)
                      .reduce((sum, b) => sum + b.runs + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                  })()}
                </div>
              </div>
            </BowlerRow>
          </MiddleWorkspace>
  );
};

export default ScoreSectionPanel;
