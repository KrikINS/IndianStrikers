import React from 'react';
import { Shield } from 'lucide-react';
import {
  InningsBreakModal, ActionButton, ScoreSummaryCard,
  ScoreCardTable, Th, Td
} from './ScorerStyles';
import { ScheduledMatch } from '../../types';
import { UnifiedMatchStore } from '../../types';

export interface InningsBreakScreenProps {
  store: UnifiedMatchStore;
  matchMeta: ScheduledMatch | undefined;
  teamLogo?: string;
  calculateTopPerformers: () => any[];
  onUndoLastBall: () => void;
  onStartSecondInnings: () => void;
}

export const InningsBreakScreen: React.FC<InningsBreakScreenProps> = ({
  store, matchMeta, teamLogo, calculateTopPerformers, onUndoLastBall, onStartSecondInnings,
}) => {
  // Alias to match original variable names used in extracted JSX
  const setShowInningsReview = (v: boolean) => { if (v) onStartSecondInnings(); };
  const setShowSetupModal = (v: boolean) => { if (v) onStartSecondInnings(); };
  const handleUndoLastBall = onUndoLastBall;
  const isInningsBreak = true;
  const showSetupModal = false;

  return (
            <InningsBreakModal>
              <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 24 }}>
                    <img src={store.team1Logo || teamLogo || '/INS%20LOGO.PNG'} style={{ width: 60, height: 60, objectFit: 'contain' }} alt="H" />
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'rgba(0,0,0,0.1)' }}>VS</span>
                    {store.team2Logo || matchMeta?.opponentLogo ? (
                      <img src={store.team2Logo || matchMeta?.opponentLogo} style={{ width: 60, height: 60, objectFit: 'contain' }} alt="A" />
                    ) : <Shield size={40} color="rgba(0,0,0,0.1)" />}
                  </div>
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#001F3F', margin: 0 }}>INNINGS BREAK</h1>
                  <p style={{ fontWeight: 700, opacity: 0.5, letterSpacing: 1 }}>{store.tournament?.toUpperCase() || 'LIVE MATCH'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
                  <div style={{ background: '#F8F9FA', padding: 24, borderRadius: 24, textAlign: 'center', border: '1px solid #E9ECEF' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', marginBottom: 8 }}>Total Score</p>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#001F3F', margin: 0 }}>
                      {store.innings1?.totalRuns}/{store.innings1?.wickets}
                    </h2>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, opacity: 0.6 }}>in {store.getOvers(store.innings1?.totalBalls || 0)}.0 Overs</p>
                  </div>
                  <div style={{ background: '#001F3F', padding: 24, borderRadius: 24, textAlign: 'center', color: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Target</p>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FAB005', margin: 0 }}>{(store.innings1?.totalRuns || 0) + 1}</h2>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.5 }}>Req. RR {(((store.innings1?.totalRuns || 0) + 1) / (store.maxOvers || 20)).toFixed(2)}</p>
                  </div>
                </div>

                <div style={{ marginBottom: 40 }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: 16, borderLeft: '4px solid #FAB005', paddingLeft: 12 }}>TOP PERFORMERS</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {calculateTopPerformers().slice(0, 2).map((p, i) => (
                      <div key={p.id} style={{ background: '#F8F9FA', padding: '14px', borderRadius: 14, border: '1px solid #E9ECEF' }}>
                        <p style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 4, color: '#001F3F' }}>{p.name}</p>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FAB005' }}>
                          {p.runs > 0 ? `${p.runs} (${p.balls})` : `${p.wickets} Wickets`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ padding: '20px', borderTop: '1px solid #E9ECEF', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={() => {
                    if (window.confirm("Undo last ball and resume 1st Innings?")) {
                      onUndoLastBall();
                    }
                  }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #FAB005',
                    background: 'transparent', color: '#FAB005', fontWeight: 800, fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  UNDO LAST BALL
                </button>
                <ActionButton
                  $variant="primary"
                  style={{ background: '#001F3F', color: '#FFF', height: 64, borderRadius: 16 }}
                  onClick={() => {
                    console.log('Start Button Clicked, showSetupModal set to true');
                    setShowInningsReview(false);
                    setShowSetupModal(true);
                  }}
                >
                  START {(store.toss.winnerId === 'HOME' ? (store.toss.choice === 'Bat' ? (store.team2Name || 'OPPONENT') : 'INDIAN STRIKERS') : (store.toss.choice === 'Bat' ? 'INDIAN STRIKERS' : (store.team2Name || 'OPPONENT')))} INNINGS
                </ActionButton>
              </div>
            </InningsBreakModal>
  );
};

export default InningsBreakScreen;
