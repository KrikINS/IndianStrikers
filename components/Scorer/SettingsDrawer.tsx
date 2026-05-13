import React from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  DrawerOverlay, DrawerContent, SettingsGroup, GroupTitle, ControlButton,
  IconButton
} from './ScorerStyles';
import {
  X, Repeat, CloudLightning, Cloud, CloudDownload,
  Settings, Zap, Trophy, RotateCcw, PlusCircle, Edit3, Star, User
} from 'lucide-react';
import { ScheduledMatch } from '../../types';
import { UnifiedMatchStore, InningsState } from '../../types';
import { toast } from 'react-hot-toast';

export interface SettingsDrawerProps {
  isOpen: boolean;
  store: UnifiedMatchStore;
  matchMeta: ScheduledMatch | undefined;
  activeMatchId: string;
  currentInnings: InningsState | null;
  syncStatus: 'idle' | 'loading' | 'success' | 'error';
  teamLogo?: string;
  getPlayerName: (id: any) => string;
  onClose: () => void;
  onChangeScorer: () => void;
  onDeclareInnings: () => void;
  onResetMatch: () => void;
  onOpenQuickScore: () => void;
  updateMatch: (id: string, data: any) => Promise<void>;
  syncWithCloud: () => Promise<void>;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen, store, matchMeta, activeMatchId, currentInnings, syncStatus,
  teamLogo, getPlayerName, onClose, onChangeScorer, onDeclareInnings,
  onResetMatch, onOpenQuickScore, updateMatch, syncWithCloud,
}) => {
  // Alias props to match the original local variable names used in the extracted JSX
  const showSettingsDrawer = isOpen;
  const setShowSettingsDrawer = (v: boolean) => { if (!v) onClose(); };
  const handleChangeScorer = onChangeScorer;
  const handleDeclareInnings = onDeclareInnings;
  const handleResetMatch = onResetMatch;
  const setShowQuickScoreModal = (v: boolean) => { if (v) onOpenQuickScore(); };
  const setShowSettingsDrawer_ = onClose;

  return (
          <AnimatePresence>
            {showSettingsDrawer && (
              <DrawerOverlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettingsDrawer(false)}
              >
                <DrawerContent
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '0.8rem', fontWeight: 900, color: '#FFF', fontStyle: 'italic', margin: 0 }}>MATCH SETTINGS</h2>
                    <IconButton onClick={() => setShowSettingsDrawer(false)} style={{ color: '#FFF' }}>
                      <X size={14} />
                    </IconButton>
                  </div>

                  {/* Change Scorer Action */}
                  <div style={{ marginTop: 12, marginBottom: 4 }}>
                    <button
                      disabled={syncStatus === 'loading'}
                      onClick={handleChangeScorer}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                        background: syncStatus === 'loading' ? 'rgba(56, 189, 248, 0.05)' : 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid #38BDF8',
                        borderRadius: 8, color: '#38BDF8', fontWeight: 800, cursor: syncStatus === 'loading' ? 'not-allowed' : 'pointer',
                        textAlign: 'left', opacity: syncStatus === 'loading' ? 0.7 : 1
                      }}
                    >
                      {syncStatus === 'loading' ? (
                        <>
                          <div style={{ width: 12, height: 12, border: '2px solid rgba(56,189,248,0.3)', borderTopColor: '#38BDF8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: '0.5rem' }}>SYNCING...</div>
                            <div style={{ fontSize: '0.4rem', opacity: 0.6, fontWeight: 500 }}>Please wait, saving to cloud</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Repeat size={12} />
                          <div>
                            <div style={{ fontSize: '0.5rem' }}>CHANGE SCORER</div>
                            <div style={{ fontSize: '0.4rem', opacity: 0.6, fontWeight: 500 }}>Handoff match to another device</div>
                          </div>
                        </>
                      )}
                    </button>
                  </div>

                  {/* FORCE PUSH TOOL */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8, marginTop: 12 }}>EMERGENCY SYNC</div>
                    <button
                      onClick={async () => {
                        if (!activeMatchId) return;
                        if (!window.confirm("CRITICAL: This will take YOUR local score and overwrite the server. Only do this if THIS device has the correct score. Proceed?")) return;

                        try {
                          toast.loading("Force syncing to cloud...");
                          await updateMatch(activeMatchId, {
                            liveData: store,
                            lastUpdated: new Date().toISOString()
                          });
                          toast.dismiss();
                          toast.success("Cloud Overwritten successfully!");
                          setShowSettingsDrawer(false);
                        } catch (e: any) {
                          toast.dismiss();
                          toast.error("Force push failed: " + e.message);
                        }
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
                        background: 'rgba(250, 176, 5, 0.1)',
                        border: '1px solid #FAB005',
                        borderRadius: 8, color: '#FAB005', fontWeight: 800, cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <CloudLightning size={12} />
                      <div>
                        <div style={{ fontSize: '0.5rem' }}>FORCE PUSH TO CLOUD</div>
                        <div style={{ fontSize: '0.4rem', opacity: 0.6, fontWeight: 500 }}>Make THIS score the master truth</div>
                      </div>
                    </button>
                  </div>

                  <SettingsGroup>
                    <GroupTitle>Match Controls</GroupTitle>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <ControlButton
                        $variant="gold"
                        style={{ flex: 1, borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}
                        onClick={() => {
                          const val = window.prompt("Edit Max Overs:", String(store.maxOvers || 20));
                          if (val && !isNaN(parseInt(val))) store.updateMatchSettings({ maxOvers: parseInt(val) });
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '0.4rem', opacity: 0.6, textTransform: 'uppercase' }}>Overs</div>
                          <div style={{ fontSize: '0.6rem', fontWeight: 900 }}>{store.maxOvers || 20}</div>
                        </div>
                        <Settings size={12} />
                      </ControlButton>
                      <ControlButton
                        $variant={store.useWagonWheel ? "emerald" : "gold"}
                        style={{ flex: 1, borderColor: store.useWagonWheel ? '#10b981' : '#f59e0b' }}
                        onClick={() => {
                          const next = !store.useWagonWheel;
                          store.updateMatchSettings({ useWagonWheel: next });
                          localStorage.setItem('ins-wagon-wheel-enabled', String(next));
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '0.4rem', opacity: 0.6, textTransform: 'uppercase' }}>Wagon Wheel</div>
                          <div style={{ fontSize: '0.6rem', fontWeight: 900 }}>{store.useWagonWheel ? 'ON' : 'OFF'}</div>
                        </div>
                        <Zap size={12} fill={store.useWagonWheel ? '#10b981' : 'none'} />
                      </ControlButton>
                    </div>
                    {store.currentInnings === 2 && (
                      <ControlButton
                        $variant="emerald"
                        style={{ marginTop: 4 }}
                        onClick={() => {
                          const val = window.prompt("Override Target Score:", String(store.targetScore || ((store.innings1?.totalRuns || 0) + 1)));
                          if (val && !isNaN(parseInt(val))) store.updateTargetScore(parseInt(val));
                        }}
                      >
                        <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Trophy size={14} />
                          <div>
                            <div style={{ fontSize: '0.4rem', opacity: 0.6, textTransform: 'uppercase' }}>Target Score</div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 900 }}>{store.targetScore || ((store.innings1?.totalRuns || 0) + 1)}</div>
                          </div>
                        </div>
                      </ControlButton>
                    )}
                  </SettingsGroup>

                  <SettingsGroup>
                    <GroupTitle>Active Player Controls</GroupTitle>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <ControlButton $variant="emerald" style={{ flex: 1 }} onClick={() => { store.switchStriker(); setShowSettingsDrawer(false); }}>
                        <span>Swap Strike</span>
                        <Repeat size={14} />
                      </ControlButton>
                      <ControlButton $variant="gold" style={{ flex: 1, borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)' }} onClick={() => {
                        if (store.strikerId && window.confirm(`Retire ${getPlayerName(store.strikerId)}?`)) {
                          store.retireBatter(store.strikerId);
                          setShowSettingsDrawer(false);
                        }
                      }}>
                        <span>Retire</span>
                        <User size={14} />
                      </ControlButton>
                    </div>
                  </SettingsGroup>

                  <SettingsGroup>
                    <GroupTitle>Administrative</GroupTitle>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <ControlButton $variant="danger" style={{ flex: 1 }} onClick={handleDeclareInnings}>
                        <span>Declare</span>
                        <Zap size={14} />
                      </ControlButton>
                      <ControlButton $variant="gold" style={{ flex: 1, borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)' }} onClick={() => {
                        setShowSettingsDrawer(false);
                        setShowQuickScoreModal(true);
                      }}>
                        <span>Quick Finish</span>
                        <Star size={14} style={{ color: '#f59e0b' }} />
                      </ControlButton>
                    </div>
                    <ControlButton 
                      $variant="danger" 
                      style={{ marginTop: 12, width: '100%', borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}
                      onClick={handleResetMatch}
                    >
                      <RotateCcw size={16} />
                      <span>Reset Match</span>
                    </ControlButton>
                  </SettingsGroup>

                  <SettingsGroup>
                    <GroupTitle>Fielding Penalties</GroupTitle>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <ControlButton
                        $variant="gold"
                        style={{ flex: 1, borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}
                        onClick={() => {
                          store.recordPenalty('batting', 5);
                          setShowSettingsDrawer(false);
                        }}
                      >
                        <span>+5 Penalty</span>
                        <PlusCircle size={18} style={{ color: '#f59e0b' }} />
                      </ControlButton>
                      <ControlButton
                        $variant="gold"
                        style={{ flex: 1, borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}
                        onClick={() => {
                          const r = window.prompt("Enter Penalty Runs for Batting Team:", "5");
                          if (r && !isNaN(parseInt(r))) {
                            store.recordPenalty('batting', parseInt(r));
                            setShowSettingsDrawer(false);
                          }
                        }}
                      >
                        <span>Custom</span>
                        <Edit3 size={18} style={{ color: '#f59e0b' }} />
                      </ControlButton>
                    </div>
                  </SettingsGroup>

                  <div style={{ marginTop: 'auto', padding: '16px 0', textAlign: 'center', opacity: 0.4 }}>
                  </div>
                  <SettingsGroup>
                    <GroupTitle>Maintenance & Healing</GroupTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            const totalBalls = currentInnings?.totalBalls || 0;
                            if (totalBalls % 6 === 0) {
                              store.updateMatchSettings({ isWaitingForBowler: true, currentBowlerId: null });
                              toast.success("Ready for new bowler");
                              setShowSettingsDrawer(false);
                            } else {
                              toast.error("Over not finished yet");
                            }
                          }}
                          style={{
                            flex: 1, padding: '10px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)',
                            borderRadius: 10, color: '#38BDF8', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer'
                          }}
                        >
                          HEAL STATE
                        </button>
                        <button
                          onClick={() => {
                            toast.promise(syncWithCloud(), {
                              loading: 'Syncing with cloud...',
                              success: 'Cloud states aligned!',
                              error: 'Sync failed'
                            });
                            setShowSettingsDrawer(false);
                          }}
                          style={{
                            flex: 1, padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 10, color: '#FFF', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                          }}
                        >
                          <Cloud size={14} /> FORCE RE-SYNC
                        </button>
                      </div>

                      {(() => {
                        const localBalls = (store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0);
                        const cloudBalls = (matchMeta?.liveData?.innings1?.totalBalls || 0) + (matchMeta?.liveData?.innings2?.totalBalls || 0);
                        if (cloudBalls > localBalls) {
                          return (
                            <button
                              onClick={() => {
                                if (matchMeta?.liveData) {
                                  store.initializeMatch({
                                    matchId: matchMeta.id,
                                    matchType: matchMeta.matchFormat || 'T20',
                                    tournament: matchMeta.tournament || 'Live Match',
                                    ground: matchMeta.venue || 'Local Ground',
                                    team2Name: matchMeta.team2Name || 'OPPONENT',
                                    maxOvers: matchMeta.maxOvers || 20,
                                    team1XI: matchMeta.team1XI || [],
                                    team2XI: matchMeta.team2XI || [],
                                    team1Logo: teamLogo,
                                    team2Logo: matchMeta.team2Logo || '',
                                    liveData: matchMeta.liveData
                                  });
                                  toast.success("Corrected from Mobile!");
                                  setShowSettingsDrawer(false);
                                }
                              }}
                              style={{
                                width: '100%', background: '#FAB005', border: 'none', borderRadius: 10,
                                padding: '10px', color: '#000', fontSize: '0.65rem',
                                fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                              }}
                            >
                              <CloudDownload size={14} /> DOWNLOAD CLOUD SCORE
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </SettingsGroup>
                </DrawerContent>
              </DrawerOverlay>
            )}
          </AnimatePresence>
  );
};

export default SettingsDrawer;
