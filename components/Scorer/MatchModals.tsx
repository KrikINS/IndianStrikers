import React from 'react';
import { User } from 'lucide-react';
import {
  ModalOverlay, ModalContent, SelectionGrid, PlayerCard,
  ScoringBtn, ActionButton, InitialsAvatar
} from './ScorerStyles';
import { getInitials } from './scorerUtils';
import { Player } from '../../types';
import { InningsState, UnifiedMatchStore } from '../../types';

// ─── Props Interface ────────────────────────────────────────────────────────
export interface MatchModalsProps {
  // Visibility flags
  showBowlerModal: boolean;
  showNBModal: boolean;
  showWicketModal: boolean;
  showFielderModal: boolean;
  runOutInvolved: { victimId: string; runs: number; ballType?: string; subType?: string } | null;
  showBatterSelectModal: boolean;
  showPenaltyModal: boolean;
  // State
  extraType: 'wd' | 'nb' | 'byes' | 'lb';
  nbSubType: 'bat' | 'bye' | 'lb';
  pendingWicketType: string | null;
  pendingFielderId: string | null;
  currentInnings: InningsState;
  store: UnifiedMatchStore;
  isInningsBreak: boolean;
  isBattingFinishing: boolean;
  players: Player[];
  opponentPlayers: any[];
  team1XI: string[];
  team2XI: string[];
  activeMatchId: string;
  // Setters / handlers
  setShowBowlerModal: (v: boolean) => void;
  setShowNBModal: (v: boolean) => void;
  setShowWicketModal: (v: boolean) => void;
  setShowFielderModal: (v: boolean) => void;
  setRunOutInvolved: (v: any) => void;
  setShowBatterSelectModal: (v: boolean) => void;
  setShowPenaltyModal: (v: boolean) => void;
  setNbSubType: (v: 'bat' | 'bye' | 'lb') => void;
  setPendingWicketType: (v: string | null) => void;
  setPendingFielderId: (v: string | null) => void;
  setIsOverComplete: (v: boolean) => void;
  setShowSetupModal: (v: boolean) => void;
  triggerWicketSplash: (type: string) => void;
  attemptRecord: (...args: any[]) => void;
  getPlayerName: (id: any) => string;
}

// ─── Component ─────────────────────────────────────────────────────────────
export const MatchModals: React.FC<MatchModalsProps> = (props) => {
  const {
    showBowlerModal, showNBModal, showWicketModal, showFielderModal,
    runOutInvolved, showBatterSelectModal, showPenaltyModal,
    extraType, nbSubType, pendingWicketType, pendingFielderId,
    currentInnings, store, isInningsBreak, isBattingFinishing,
    players, opponentPlayers, team1XI, team2XI, activeMatchId,
    setShowBowlerModal, setShowNBModal, setShowWicketModal, setShowFielderModal,
    setRunOutInvolved, setShowBatterSelectModal, setShowPenaltyModal,
    setNbSubType, setPendingWicketType, setPendingFielderId,
    setIsOverComplete, setShowSetupModal, triggerWicketSplash,
    attemptRecord, getPlayerName,
  } = props;

  return (
    <>
          {showBowlerModal && (
            <ModalOverlay onClick={() => setShowBowlerModal(false)}>
              <ModalContent onClick={e => e.stopPropagation()}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>SELECT NEXT BOWLER</h2>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 20 }}>Choose the bowler for the next over</p>

                {/* INNINGS-BREAK ESCAPE HATCH: If innings 1 is complete but innings 2 hasn't
                    started yet, the bowler modal has no players to show. Guide the user to setup. */}
                {(isInningsBreak || (store.currentInnings === 1 && !store.innings2 && isBattingFinishing)) ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>🏏</div>
                    <p style={{ fontWeight: 700, color: '#FFF', marginBottom: 8 }}>2nd Innings Not Set Up Yet</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
                      Select the opening batsmen and bowler to begin the 2nd innings.
                    </p>
                    <button
                      onClick={() => {
                        setShowBowlerModal(false);
                        setShowSetupModal(true);
                      }}
                      style={{
                        background: '#FAB005', color: '#001F3F', border: 'none',
                        padding: '14px 28px', borderRadius: 12, fontWeight: 900,
                        fontSize: '0.9rem', cursor: 'pointer', width: '100%',
                        letterSpacing: 0.5, textTransform: 'uppercase',
                        boxShadow: '0 4px 20px rgba(250,176,5,0.4)'
                      }}
                    >
                      Set Up 2nd Innings →
                    </button>
                  </div>
                ) : (
                  <SelectionGrid style={{ maxHeight: '50vh' }}>
                    {(() => {
                      const fieldingTeamId = currentInnings.bowlingTeamId;
                      const fieldingTeamXI = fieldingTeamId === 'TEAM1' ? team1XI : team2XI;
                      const fieldingPool = fieldingTeamId === 'TEAM1' ? players : opponentPlayers;
                      const maxOversPerB = Math.ceil((store.maxOvers || 20) / 5);
                      return (fieldingPool || [])
                        .filter((p: any) => {
                          const isInXI = (fieldingTeamXI || []).includes(p.id);
                          const isPrevBowler = p.id === store.currentBowlerId;
                          const stats = currentInnings.bowlingStats[p.id] || { overs: 0 };
                          const hasReachedLimit = stats.overs >= maxOversPerB;
                          return isInXI && !isPrevBowler && !hasReachedLimit;
                        })
                        .map((p: any) => {
                          const bStats = currentInnings.bowlingStats[p.id] || { overs: 0, runs: 0, wickets: 0 };
                          return (
                            <PlayerCard
                              key={p.id}
                              onClick={() => {
                                store.setNewBowler(p.id, p.name);
                                setShowBowlerModal(false);
                                setIsOverComplete(false);
                              }}
                            >
                              {p.avatarUrl ? (
                                <img src={p.avatarUrl} alt={p.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <InitialsAvatar size="32px">{getInitials(p.name)}</InitialsAvatar>
                              )}

                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{bStats.wickets}-{bStats.runs} ({bStats.overs})</div>
                              </div>
                            </PlayerCard>
                          );
                        });
                    })()}
                  </SelectionGrid>
                )}

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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                  {[0, 1, 2, 3, 4, 6].map(runs => (
                    <ScoringBtn
                      key={runs}
                      style={{ height: 60, fontSize: '1.2rem' }}
                      onClick={() => {
                        const type = extraType === 'wd' ? 'wide' : (extraType === 'nb' ? 'no-ball' : (extraType === 'byes' ? 'bye' : 'leg-bye'));
                        const finalSubType = extraType === 'nb' ? nbSubType : (extraType === 'wd' ? 'bye' : (extraType === 'byes' ? 'bye' : 'lb'));
                        attemptRecord(runs, type, false, undefined, finalSubType);
                        setShowNBModal(false);
                      }}
                    >
                      {runs}
                    </ScoringBtn>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const type = extraType === 'wd' ? 'wide' : (extraType === 'nb' ? 'no-ball' : (extraType === 'byes' ? 'bye' : 'leg-bye'));
                    const finalSubType = extraType === 'nb' ? nbSubType : (extraType === 'wd' ? 'bye' : (extraType === 'byes' ? 'bye' : 'lb'));
                    setRunOutInvolved({
                      victimId: '',
                      runs: 0,
                      ballType: type,
                      subType: finalSubType
                    });
                  }}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 12, border: '2px solid #FAB005',
                    background: 'rgba(250, 176, 5, 0.1)', color: '#FAB005', fontWeight: 900,
                    fontSize: '0.9rem', cursor: 'pointer', marginBottom: 12
                  }}
                >
                  RUN OUT
                </button>

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
                        if (type === 'Caught' || type === 'Stumped') {
                          setShowWicketModal(false);
                          setShowFielderModal(true);
                        } else {
                          setShowWicketModal(false);
                          triggerWicketSplash(type);
                        }
                      }}
                    >
                      {type}
                    </button>
                  ))}
                  <button
                    style={{ gridColumn: 'span 2', padding: 16, borderRadius: 12, border: '2px solid #FAB005', background: 'rgba(250, 176, 5, 0.1)', color: '#FAB005', fontWeight: 900 }}
                    onClick={() => setRunOutInvolved({ victimId: '', runs: 0, ballType: 'legal', subType: 'bat' })}
                  >
                    RUN OUT
                  </button>
                </div>
              </ModalContent>
            </ModalOverlay>
          )}

          {showFielderModal && (
            <ModalOverlay onClick={() => setShowFielderModal(false)}>
              <ModalContent onClick={e => e.stopPropagation()}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>SELECT FIELDER</h2>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 20 }}>Who made the {pendingWicketType === 'Caught' ? 'catch' : 'stumping'}?</p>

                <SelectionGrid style={{ maxHeight: '50vh' }}>
                  {(() => {
                    const fieldingTeamId = currentInnings.bowlingTeamId;
                    const fieldingTeamXI = fieldingTeamId === 'TEAM1' ? team1XI : team2XI;
                    const fieldingPool = fieldingTeamId === 'TEAM1' ? players : opponentPlayers;
                    return (fieldingPool || [])
                      .filter((p: any) => (fieldingTeamXI || []).includes(p.id))
                      .map((p: any) => (
                        <PlayerCard key={p.id} onClick={() => {
                          setPendingFielderId(p.id);
                          setShowFielderModal(false);
                          triggerWicketSplash(pendingWicketType ?? '');
                        }}>
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt={p.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <InitialsAvatar size="32px">{getInitials(p.name)}</InitialsAvatar>
                          )}

                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                        </PlayerCard>
                      ));
                  })()}
                </SelectionGrid>
                <button
                  onClick={() => setShowFielderModal(false)}
                  style={{ background: 'none', border: 'none', color: '#FAB005', fontSize: '0.9rem', fontWeight: 700, marginTop: 24, cursor: 'pointer', width: '100%' }}
                >
                  CANCEL
                </button>
              </ModalContent>
            </ModalOverlay>
          )}

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
                    triggerWicketSplash('Run Out');
                  }}
                >
                  {currentInnings && currentInnings.wickets === 9 ? 'FINISH INNINGS' : 'SELECT NEXT BATTER'}
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
                            if (activeMatchId) {
                              fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/score/ball`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                                },
                                body: JSON.stringify({
                                  match_id: activeMatchId,
                                  over_number: 0,
                                  ball_number: 0,
                                  runs_scored: 0,
                                  penalty_runs: 5,
                                  is_penalty: true,
                                  eventType: 'extra',
                                  innings_number: store.currentInnings,
                                  is_legal_ball: false
                                })
                              }).catch(err => console.error("[Sync] Penalty sync failed:", err));
                            }
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
                          const runs = parseInt(r);
                          store.recordPenalty('batting', runs);
                          if (activeMatchId) {
                            fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/score/ball`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                              },
                              body: JSON.stringify({
                                match_id: activeMatchId,
                                over_number: 0,
                                ball_number: 0,
                                runs_scored: 0,
                                penalty_runs: runs,
                                is_penalty: true,
                                eventType: 'extra',
                                innings_number: store.currentInnings,
                                is_legal_ball: false
                              })
                            }).catch(err => console.error("[Sync] Penalty sync failed:", err));
                          }
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
                          const runs = parseInt(r);
                          store.recordPenalty('bowling', runs);
                          if (activeMatchId) {
                            fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/score/ball`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                              },
                              body: JSON.stringify({
                                match_id: activeMatchId,
                                over_number: 0,
                                ball_number: 0,
                                runs_scored: 0,
                                penalty_runs: runs,
                                is_penalty: true,
                                eventType: 'extra',
                                innings_number: store.currentInnings,
                                is_legal_ball: false
                              })
                            }).catch(err => console.error("[Sync] Penalty sync failed:", err));
                          }
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
    </>
  );
};

export default MatchModals;
