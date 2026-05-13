import React from 'react';
import { motion } from 'framer-motion';
import { Users, Share2, RotateCcw, Lock as LockIcon } from 'lucide-react';
import {
  ScoringInterface, RunGrid, ExtraStack, ScoringBtn,
  TimelineContainer, BallCircle, OverSeparator
} from './ScorerStyles';
import { toast } from 'react-hot-toast';
import { InningsState, UnifiedMatchStore } from '../../types';

export interface ScoringControlsProps {
  store: UnifiedMatchStore;
  currentInnings: InningsState | null;
  isLocked: boolean;
  isWaitingForBowler: boolean;
  timelineRef: React.RefObject<HTMLDivElement>;
  onRecord: (runs: number, type: string) => void;
  onWicket: () => void;
  onExtra: (type: 'wd' | 'nb' | 'byes' | 'lb') => void;
  onUndo: () => void;
  onLineups: () => void;
  onBowlerSelect: () => void;
}

export const ScoringControls: React.FC<ScoringControlsProps> = ({
  store, currentInnings, isLocked, isWaitingForBowler,
  timelineRef, onRecord, onWicket, onExtra, onUndo, onLineups, onBowlerSelect,
}) => {
  // Alias to match original variable names in extracted JSX
  const attemptRecord = (runs: number, type: string) => onRecord(runs, type);
  const setShowLineups = (v: boolean) => { if (v) onLineups(); };
  const setShowBowlerModal = (v: boolean) => { if (v) onBowlerSelect(); };
  const setShowWicketModal = (v: boolean) => { if (v) onWicket(); };
  const setExtraType = (type: 'wd' | 'nb' | 'byes' | 'lb') => onExtra(type);
  const setShowNBModal = (v: boolean) => {};  // noop — extra modal triggered via onExtra
  const setIsOverComplete = (v: boolean) => {};

  return (
          <ScoringInterface>
            {/* UNDO & UTILITY ROW */}
            <div style={{ padding: '0 4px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 30 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setShowLineups(true)}
                  title="View Lineups"
                  style={{ background: 'rgba(250, 176, 5, 0.15)', border: 'none', borderRadius: 6, padding: '6px 10px', color: '#FAB005', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Users size={12} />
                  <span style={{ fontSize: '10px', fontWeight: 800 }}>LINEUPS</span>
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Match Scorecard',
                        text: `Score: ${currentInnings?.totalRuns}/${currentInnings?.wickets} (${store.getOvers(currentInnings?.totalBalls || 0)} ovs)`,
                        url: window.location.href
                      }).catch(console.error);
                    } else {
                      toast.success("Link copied!");
                      navigator.clipboard.writeText(window.location.href);
                    }
                  }}
                  title="Share Scorecard"
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, padding: '6px 10px', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Share2 size={12} />
                  <span style={{ fontSize: '10px', fontWeight: 800 }}>SHARE</span>
                </button>
              </div>

              <button
                onClick={() => {
                  if (isLocked) return;
                  store.undoLastBall();
                  setIsOverComplete(false);
                }}
                title="Undo Last Ball"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  color: '#ef4444',
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: isLocked ? 0.5 : 1,
                  visibility: 'visible'
                }}
              >
                <div style={{ pointerEvents: 'none' }}><RotateCcw size={14} /></div>
                <span style={{ fontSize: '11px', fontWeight: 900 }}>UNDO</span>
              </button>
            </div>

            <div style={{ background: '#001F3F', margin: '6px 0 2px', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 0' }}>
              {/* SYSTEM NARRATIVE FEED */}
              {store.systemCommentary && store.systemCommentary.length > 0 && (
                <div className="bg-slate-900/80 px-3 py-2 max-h-[80px] overflow-y-auto custom-scrollbar border-b border-white/5 space-y-1.5 flex flex-col-reverse">
                  {[...store.systemCommentary].slice(-10).reverse().map((comm, index) => (
                    <motion.div
                      key={comm.id}
                      className="text-xs text-white/90 font-medium leading-tight rounded p-1"
                      initial={index === 0 ? { backgroundColor: "rgba(16, 185, 129, 0.5)" } : false}
                      animate={{ backgroundColor: "rgba(16, 185, 129, 0)" }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    >
                      <span className="text-amber-500/80 font-bold mr-1.5 text-[10px]">
                        {new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {comm.text}
                    </motion.div>
                  ))}
                </div>
              )}
              <TimelineContainer ref={timelineRef} id="match-timeline" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {(() => {
                  const balls = currentInnings?.history || [];
                  const last30 = balls.slice(-30);
                    return last30.map((ball: any, idx: number) => {
                      const isWide = ball.type === 'wide';
                      const isNoBall = ball.type === 'no-ball';
                      const isLB = ball.type === 'leg-bye';
                      const isB = ball.type === 'bye';
                      
                      let display = ball.runs.toString();
                      if (ball.isWicket) {
                        const prefix = isNoBall ? 'NB' : isWide ? 'WD' : '';
                        const amount = ball.runs > 0 ? `+${ball.runs}` : '';
                        display = prefix ? `${prefix}${amount}+W` : 'W';
                      }
                      else if (isWide) display = `WD${ball.runs > 0 ? '+' + ball.runs : ''}`;
                      else if (isNoBall) display = `NB${ball.runs > 0 ? '+' + ball.runs : ''}`;
                      else if (isLB) display = `LB${ball.runs}`;
                      else if (isB) display = `B${ball.runs}`;
                    const ballInOverNum = ball.ballNumber;
                    const isLastBallOfOver = ballInOverNum === 6 && ball.isLegal;
                    const showSeparator = isLastBallOfOver && idx < last30.length - 1;
                    return (
                      <React.Fragment key={`${idx}-${ball.timestamp}`}>
                        <BallCircle $type={display}>{display}</BallCircle>
                        {showSeparator && <OverSeparator />}
                      </React.Fragment>
                    );
                  });
                })()}
                {(currentInnings?.history || []).length === 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '1px' }}>WAITING...</span>
                )}
              </TimelineContainer>
            </div>

            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(store.isWaitingForBowler || isLocked) && (
                <div style={{
                  position: 'absolute',
                  inset: -4,
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(2px)',
                  borderRadius: 12
                }}>
                  {isLocked ? (
                    <div style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      padding: '12px 24px',
                      borderRadius: 16,
                      textAlign: 'center'
                    }}>
                      <LockIcon size={24} color="#FAB005" style={{ marginBottom: 8 }} />
                      <div style={{ color: '#FFF', fontWeight: 900, fontSize: '0.9rem', letterSpacing: 1 }}>MATCH LOCKED</div>
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 700, marginTop: 4 }}>READ-ONLY MODE ACTIVE</div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowBowlerModal(true)}
                      style={{ background: '#FAB005', color: '#000', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 8px 25px rgba(250, 176, 5, 0.4)' }}
                    >
                      SELECT NEXT BOWLER
                    </button>
                  )}
                </div>
              )}

              <div style={{ opacity: (store.isWaitingForBowler || isLocked) ? 0.3 : 1, pointerEvents: (store.isWaitingForBowler || isLocked) ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <RunGrid>
                  <ScoringBtn onClick={() => attemptRecord(0, 'legal')}>0</ScoringBtn>
                  <ScoringBtn onClick={() => attemptRecord(1, 'legal')}>1</ScoringBtn>
                  <ScoringBtn onClick={() => attemptRecord(2, 'legal')}>2</ScoringBtn>
                  <ScoringBtn onClick={() => attemptRecord(3, 'legal')}>3</ScoringBtn>
                  <ScoringBtn onClick={() => attemptRecord(4, 'legal')}>4</ScoringBtn>
                  <ScoringBtn onClick={() => attemptRecord(5, 'legal')}>5</ScoringBtn>
                  <ScoringBtn onClick={() => attemptRecord(6, 'legal')}>6</ScoringBtn>
                  <ScoringBtn $variant="wicket" style={{ background: '#FF4D4D', color: '#FFF' }} onClick={() => setShowWicketModal(true)}>WKT</ScoringBtn>
                </RunGrid>

                <ExtraStack>
                  <ScoringBtn $variant="extra" onClick={() => { setExtraType('wd'); setShowNBModal(true); }}>WD</ScoringBtn>
                  <ScoringBtn $variant="extra" onClick={() => { setExtraType('nb'); setShowNBModal(true); }}>NB</ScoringBtn>
                  <ScoringBtn $variant="extra" onClick={() => { setExtraType('byes'); setShowNBModal(true); }}>B</ScoringBtn>
                  <ScoringBtn $variant="extra" onClick={() => { setExtraType('lb'); setShowNBModal(true); }}>LB</ScoringBtn>
                </ExtraStack>
              </div>
            </div>
          </ScoringInterface>
  );
};

export default ScoringControls;
