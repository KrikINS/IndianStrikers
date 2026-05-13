import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Zap, Share2, Star } from 'lucide-react';
import {
  ModalOverlay, ModalContent, HeroPosterWrapper, PosterContainer, ActionButton
} from './ScorerStyles';
import { toPng, toBlob } from 'html-to-image';
import { toast } from 'react-hot-toast';
import MatchSummaryModal from '../MatchSummaryModal';
import { ScheduledMatch, Player } from '../../types';
import { UnifiedMatchStore } from '../../types';

export interface MatchCompletionFlowProps {
  isMatchComplete: boolean;
  store: UnifiedMatchStore;
  matchMeta: ScheduledMatch | undefined;
  venueName: string;
  isGeneratingPoster: boolean;
  posterRef: React.RefObject<HTMLDivElement>;
  showMatchSummaryModal: boolean;
  activeMatchId: string;
  calculateTopPerformers: () => any[];
  getPlayerName: (id: any) => string;
  getPlayerAvatar: (id: string | null) => string | null;
  downloadHeroPoster: () => void;
  handleShareHeroPoster: () => void;
  onUpdateMatchSettings: (settings: any) => void;
  onSaveMatchSummary: (summary: any) => Promise<void>;
  onCloseMatchSummary: () => void;
  players: Player[];
  allOpponents: any[];
  setSyncStatus: (status: 'idle' | 'loading' | 'success' | 'error') => void;
  teamLogo?: string;
  onUpdateMatchStatus: (status: string) => void;
}

export const MatchCompletionFlow: React.FC<MatchCompletionFlowProps> = ({
  isMatchComplete, store, matchMeta, venueName, isGeneratingPoster,
  posterRef, showMatchSummaryModal, activeMatchId,
  calculateTopPerformers, getPlayerName, getPlayerAvatar,
  downloadHeroPoster, handleShareHeroPoster, onUpdateMatchSettings,
  onSaveMatchSummary, onCloseMatchSummary,
  players, allOpponents, setSyncStatus, teamLogo, onUpdateMatchStatus,
}) => {
  const navigate = useNavigate();
  const setShowMatchSummaryModal = (v: boolean) => { if (!v) onCloseMatchSummary(); };

  if (!isMatchComplete) return null;

  return (
    <>
          {isMatchComplete && !store.manOfTheMatch && (
            <ModalOverlay>
              <ModalContent style={{ maxWidth: 640 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ background: 'rgba(250, 176, 5, 0.1)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Trophy size={32} color="#FAB005" />
                  </div>
                  <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 4 }}>PERFORMER SPOTLIGHT</h1>
                  <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Select the Man of the Match based on performance</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 24 }}>
                  {calculateTopPerformers().map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => store.updateMatchSettings({ manOfTheMatch: p.id })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px', borderRadius: 14,
                        background: idx === 0 ? 'rgba(250, 176, 5, 0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${idx === 0 ? 'rgba(250, 176, 5, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                        color: '#FFF', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ background: idx === 0 ? '#FAB005' : 'rgba(255,255,255,0.1)', color: idx === 0 ? '#000' : '#FFF', width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.75rem' }}>
                        #{idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFF' }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: 2 }}>
                          {p.runs > 0 && <span>{p.runs} Runs • </span>}
                          {p.wickets > 0 && <span>{p.wickets} Wickets • </span>}
                          {p.maidens > 0 && <span>{p.maidens} Maidens</span>}
                        </div>
                      </div>
                      <Zap size={16} color={idx === 0 ? '#FAB005' : 'rgba(255,255,255,0.2)'} fill={idx === 0 ? '#FAB005' : 'none'} />
                    </button>
                  ))}
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.7rem', opacity: 0.4, fontStyle: 'italic' }}>
                  Ranking is suggested based on runs, wickets, and match impact.
                </p>
              </ModalContent>
            </ModalOverlay>
          )}

          {isMatchComplete && store.manOfTheMatch && (
            <ModalOverlay>
              <ModalContent style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ marginBottom: 24 }}>
                  <Star size={48} color="#FAB005" fill="#FAB005" style={{ filter: 'drop-shadow(0 0 10px rgba(250, 176, 5, 0.5))' }} />
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 12 }}>MATCH COMPLETED!</h1>
                <h2 style={{ color: '#FAB005', marginBottom: 12 }}>
                  {(() => {
                    const i1 = store.innings1?.totalRuns || 0;
                    const i2 = store.innings2?.totalRuns || 0;
                    if (i2 > i1) {
                      return `${store.innings2?.battingTeamId === 'TEAM1' ? (store.team1Name || 'INDIAN STRIKERS') : (matchMeta?.team2Name || 'OPPONENT')} WON BY ${10 - (store.innings2?.wickets || 0)} WICKETS`;
                    } else if (i1 > i2) {
                      return `${store.innings1?.battingTeamId === 'TEAM1' ? (store.team1Name || 'INDIAN STRIKERS') : (matchMeta?.team2Name || 'OPPONENT')} WON BY ${i1 - i2} RUNS`;
                    }
                    return "MATCH TIED";
                  })()}
                </h2>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 32 }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 900, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Man of the Match</p>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>{getPlayerName(store.manOfTheMatch)}</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ActionButton
                    $variant="primary"
                    onClick={downloadHeroPoster}
                    disabled={isGeneratingPoster}
                  >
                    {isGeneratingPoster ? 'GENERATING POSTER...' : 'DOWNLOAD HERO POSTER'}
                  </ActionButton>

                  <ActionButton
                    onClick={handleShareHeroPoster}
                    disabled={isGeneratingPoster}
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#FFF' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Share2 size={18} />
                      SHARE POSTER
                    </div>
                  </ActionButton>

                  <ActionButton
                    onClick={() => {
                      onUpdateMatchStatus('completed');
                      store.resetStore(); // Clear scoring state from memory after finishing
                      navigate('/match-center');
                    }}
                  >
                    RETURN TO MATCH CENTER
                  </ActionButton>
                </div>

                <PosterContainer>
                  <HeroPosterWrapper ref={posterRef} data-poster-root>
                    {/* Premium Background Elements */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-[#020617]" />
                    <div
                      className="absolute inset-0 z-0 opacity-15"
                      style={{
                        backgroundImage: 'url(/assets/cricket_ground_bg.png)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#FFF 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    {/* Header: Logos & Status */}
                    <div className="absolute top-8 inset-x-8 z-20 flex items-center justify-between">
                      <img src={store.team1Logo || teamLogo || '/INS%20LOGO.PNG'} className="w-14 h-14 object-contain filter drop-shadow-2xl" alt="Logo" />
                      <div className="text-right">
                        <p className="text-[10px] font-black italic tracking-[0.2em] text-sky-400 uppercase">Match Official Feed</p>
                        <p className="text-xl font-black italic text-white leading-none tracking-tighter">PLAYER OF THE MATCH</p>
                      </div>
                    </div>

                    {/* Hero Content */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pt-12">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-sky-500/20 blur-2xl rounded-full scale-150" />
                        <div className="relative bg-slate-900/50 p-1.5 rounded-full border border-white/10 backdrop-blur-md overflow-hidden">
                          {getPlayerAvatar(store.manOfTheMatch) ? (
                            <img
                              src={getPlayerAvatar(store.manOfTheMatch)!}
                              className="w-32 h-32 rounded-full object-cover border-4 border-sky-400/30 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                              alt="Hero"
                            />
                          ) : (
                            <div className="w-32 h-32 flex items-center justify-center bg-slate-800 rounded-full border-4 border-sky-400/30">
                              <Star size={64} color="#FAB005" fill="#FAB005" />
                            </div>
                          )}
                        </div>
                      </div>

                      <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter text-center leading-tight mb-2 drop-shadow-2xl">
                        {getPlayerName(store.manOfTheMatch)}
                      </h2>

                      <div className="h-1 w-12 bg-sky-500 rounded-full mb-8 shadow-[0_0_15px_rgba(56,189,248,0.5)]" />

                      {/* Stats Grid */}
                      {(() => {
                        const heroStats = calculateTopPerformers().find(p => p.id === store.manOfTheMatch);
                        const isBowler = heroStats && heroStats.wickets > 0;

                        return (
                          <div className="w-full grid grid-cols-2 gap-3 mb-8">
                            {heroStats ? (
                              isBowler ? (
                                <>
                                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">Wickets</p>
                                    <p className="text-3xl font-black text-white italic">{heroStats.wickets}</p>
                                  </div>
                                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">Econ</p>
                                    <p className="text-3xl font-black text-white italic">
                                      {(heroStats.runsConceded / (heroStats.overs || 1)).toFixed(1)}
                                    </p>
                                  </div>
                                  <div className="col-span-2 bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex justify-between items-center">
                                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Figures</p>
                                    <p className="text-xl font-black text-white italic">{heroStats.wickets}/{heroStats.runsConceded} ({heroStats.overs} OV)</p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">Runs</p>
                                    <p className="text-3xl font-black text-white italic">{heroStats.runs}</p>
                                  </div>
                                  <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center">
                                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-1">S.R.</p>
                                    <p className="text-3xl font-black text-white italic">
                                      {((heroStats.runs / (heroStats.balls || 1)) * 100).toFixed(1)}
                                    </p>
                                  </div>
                                  <div className="col-span-2 bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 flex justify-between items-center">
                                    <div className="flex gap-4">
                                      <div className="text-center">
                                        <p className="text-[8px] font-bold text-white/40 uppercase">4s</p>
                                        <p className="text-sm font-black text-white italic">{heroStats.fours || 0}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-[8px] font-bold text-white/40 uppercase">6s</p>
                                        <p className="text-sm font-black text-white italic">{heroStats.sixes || 0}</p>
                                      </div>
                                    </div>
                                    <p className="text-base font-black text-sky-400 italic uppercase">Dominant Performance</p>
                                  </div>
                                </>
                              )
                            ) : (
                              <div className="col-span-2 p-8 text-white/20 text-center italic">No Statistics Available</div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Fixture Info */}
                      <div className="w-full text-center">
                        <p className="text-xs font-black text-white italic uppercase tracking-[0.2em] mb-1">
                          INDIAN STRIKERS VS {(matchMeta?.team2Name || 'OPPONENT').toUpperCase()}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sky-400/60 font-black italic text-[10px] uppercase">
                          <span>{venueName}</span>
                          <span className="w-1 h-1 bg-sky-400/40 rounded-full" />
                          <span>{matchMeta?.date ? new Date(matchMeta.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'MATCH DAY'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Branding */}
                    <div className="relative z-10 px-8 py-6 flex items-center justify-between border-t border-white/5">
                      <p className="text-[8px] color-white/20 font-black tracking-widest uppercase">official strikers pulse capture</p>
                      <div className="flex gap-1">
                        {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-sky-500 rounded-full" />)}
                      </div>
                    </div>
                  </HeroPosterWrapper>
                </PosterContainer>
              </ModalContent>
            </ModalOverlay>
          )}
          {showMatchSummaryModal && matchMeta && (
            <MatchSummaryModal
              match={{
                ...matchMeta,
                team1Score: {
                  runs: store.innings1?.battingTeamId === matchMeta.team1Id ? store.innings1?.totalRuns || 0 : store.innings2?.totalRuns || 0,
                  wickets: store.innings1?.battingTeamId === matchMeta.team1Id ? store.innings1?.wickets || 0 : store.innings2?.wickets || 0,
                  overs: Number(store.getOvers(store.innings1?.battingTeamId === matchMeta.team1Id ? store.innings1?.totalBalls || 0 : store.innings2?.totalBalls || 0))
                },
                team2Score: {
                  runs: store.innings1?.battingTeamId === matchMeta.team2Id ? store.innings1?.totalRuns || 0 : store.innings2?.totalRuns || 0,
                  wickets: store.innings1?.battingTeamId === matchMeta.team2Id ? store.innings1?.wickets || 0 : store.innings2?.wickets || 0,
                  overs: Number(store.getOvers(store.innings1?.battingTeamId === matchMeta.team2Id ? store.innings1?.totalBalls || 0 : store.innings2?.totalBalls || 0))
                }
              }}
              team1Name={matchMeta.team1Name || 'Indian Strikers'}
              team2Name={matchMeta.team2Name || 'Opponent'}
              onClose={() => setShowMatchSummaryModal(false)}
              onSave={async (summary) => {
                setSyncStatus('loading');
                try {
                  // Prepare performer data for career update
                  // Aggregate all participating players across both innings
                  const allParticipatingIds = new Set([
                    ...Object.keys(store.innings1?.battingStats || {}),
                    ...Object.keys(store.innings1?.bowlingStats || {}),
                    ...(store.innings2 ? [
                      ...Object.keys(store.innings2?.battingStats || {}),
                      ...Object.keys(store.innings2?.bowlingStats || {})
                    ] : [])
                  ]);

                  const performers = Array.from(allParticipatingIds).map(pid => {
                    const b1 = store.innings1?.battingStats[pid];
                    const b2 = store.innings2?.battingStats[pid];
                    const w1 = store.innings1?.bowlingStats[pid];
                    const w2 = store.innings2?.bowlingStats[pid];

                    return {
                      playerId: pid,
                      playerName: getPlayerName(pid),
                      runs: (b1?.runs || 0) + (b2?.runs || 0),
                      balls: (b1?.balls || 0) + (b2?.balls || 0),
                      fours: (b1?.fours || 0) + (b2?.fours || 0),
                      sixes: (b1?.sixes || 0) + (b2?.sixes || 0),
                      wickets: (w1?.wickets || 0) + (w2?.wickets || 0),
                      bowlingRuns: (w1?.runs || 0) + (w2?.runs || 0),
                      bowlingOvers: (w1?.overs || 0) + (w2?.overs || 0),
                      maidens: (w1?.maidens || 0) + (w2?.maidens || 0),
                      isNotOut: (b1 && b1.status !== 'out') || (b2 && b2.status !== 'out')
                    };
                  });

                  await fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/matches/${activeMatchId}/finalize`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({
                      matchData: { ...summary, performers },
                      updatedPlayers: performers
                    })
                  });

                  toast.success("Match Finalized & Career Stats Updated!");
                  localStorage.removeItem('ins-cricket-scorer');
                  localStorage.removeItem('active_match_id');
                  navigate('/match-center');
                } catch (err) {
                  console.error("Finalization failed:", err);
                  toast.error("Finalization failed. Please check connection.");
                } finally {
                  setSyncStatus('idle');
                }
              }}
            />
          )}
    </>
  );
};

export default MatchCompletionFlow;
