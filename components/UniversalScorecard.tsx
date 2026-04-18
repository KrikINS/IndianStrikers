import React, { useState, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Image as ImageIcon,
  ChevronLeft,
  Star,
  Clock,
  RotateCw,
  Zap,
  Target,
  Trophy,
  Award
} from 'lucide-react';
import html2canvas from 'html2canvas';

// --- STYLED COMPONENTS (Ported from ScorerDashboard) ---

const PremiumModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const PremiumModalContent = styled.div`
  background: #111;
  color: #FFFFFF;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
`;

const ModalHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.02);
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #FFF;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  opacity: 0.6;

  &:hover { 
    background: rgba(255, 255, 255, 0.1); 
    opacity: 1;
    transform: scale(1.1);
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding: 0 20px;
  background: rgba(255,255,255,0.01);
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 14px 0;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#38BDF8' : 'transparent'};
  color: ${props => props.$active ? '#38BDF8' : 'rgba(255,255,255,0.4)'};
  font-weight: 900;
  font-size: 0.75rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -1px;

  &:hover {
    color: ${props => props.$active ? '#38BDF8' : 'rgba(255,255,255,0.8)'};
  }
`;

const ScrollContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #111;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.02);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
  }
`;

const ScoreSummaryCard = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TableTitle = styled.h3`
  font-size: 0.8rem;
  color: #FAB005;
  margin-bottom: 12px;
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ScoreCardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 32px;
  font-size: 0.8rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  opacity: 0.5;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.6rem;
  letter-spacing: 1px;
`;

const Td = styled.td`
  padding: 12px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-weight: 600;
  color: rgba(255,255,255,0.9);
`;

const ExtrasRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 14px 12px;
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
  font-size: 0.75rem;
  border: 1px solid rgba(255,255,255,0.05);
`;

// --- INTERFACES ---

interface BattingStat {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  status: 'batting' | 'out' | 'did-not-bat';
  outHow?: string;
  index?: number;
}

interface BowlingStat {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  index?: number;
}

interface Innings {
  batting: BattingStat[];
  bowling: BowlingStat[];
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalty: number;
  };
  totalRuns: number;
  wickets: number;
  totalBalls: number;
  history: any[];
}

interface UniversalScorecardProps {
  match: any;
  players: any[];
  opponents?: any[];
  onClose: () => void;
  isLive?: boolean;
  activeInnings?: number;
}

// --- COMPONENT ---

export const UniversalScorecard: React.FC<UniversalScorecardProps> = ({
  match,
  players,
  opponents = [],
  onClose,
  isLive = false,
  activeInnings = 1
}) => {
  const [tab, setTab] = useState<'scorecard' | 'commentary'>('scorecard');
  const [selectedInnings, setSelectedInnings] = useState<number>(activeInnings || 1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: Normalize data from different formats
  const normalizedData = useMemo(() => {
    const transform = (inn: any): Innings | null => {
      if (!inn || (!inn.battingStats && !inn.batting && !inn.bowlingStats && !inn.bowling)) return null;

      // Handle Store format (Map)
      let batting: BattingStat[] = [];
      if (inn.battingStats && typeof inn.battingStats === 'object') {
        batting = Object.entries(inn.battingStats).map(([id, stat]: [string, any]) => ({
          playerId: id,
          name: stat.name || 'Unknown',
          runs: stat.runs || 0,
          balls: stat.balls || 0,
          fours: stat.fours || 0,
          sixes: stat.sixes || 0,
          status: stat.status || 'out',
          outHow: stat.outHow,
          index: stat.index
        }));
      } else if (Array.isArray(inn.batting)) {
        // Handle API format (Array)
        batting = inn.batting.map((b: any) => ({
          playerId: b.playerId,
          name: b.name,
          runs: b.runs,
          balls: b.balls,
          fours: b.fours,
          sixes: b.sixes,
          status: b.outHow === 'Not Out' ? 'batting' : 'out',
          outHow: b.outHow,
          index: b.index
        }));
      }

      let bowling: BowlingStat[] = [];
      if (inn.bowlingStats && typeof inn.bowlingStats === 'object') {
        bowling = Object.entries(inn.bowlingStats).map(([id, stat]: [string, any]) => ({
          playerId: id,
          name: stat.name,
          overs: stat.overs || 0,
          maidens: stat.maidens || 0,
          runs: stat.runs || 0,
          wickets: stat.wickets || 0,
          index: stat.index
        }));
      } else if (Array.isArray(inn.bowling)) {
        bowling = inn.bowling.map((b: any) => ({
          playerId: b.playerId,
          name: b.name,
          overs: b.overs,
          maidens: b.maidens || 0,
          runs: b.runsConceded || b.runs,
          wickets: b.wickets,
          index: b.index
        }));
      }

      const extras = {
        wides: inn.extras?.wides || inn.extras?.wide || 0,
        noBalls: inn.extras?.noBalls || inn.extras?.no_ball || 0,
        byes: inn.extras?.byes || 0,
        legByes: inn.extras?.legByes || 0,
        penalty: inn.extras?.penalty || 0
      };

      return {
        batting: batting.sort((a,b) => (a.index ?? 0) - (b.index ?? 0)),
        bowling: bowling.sort((a,b) => (a.index ?? 0) - (b.index ?? 0)),
        extras,
        totalRuns: inn.totalRuns || 0,
        wickets: inn.wickets || inn.totalWickets || 0,
        totalBalls: inn.totalBalls || (inn.totalOvers ? Math.floor(inn.totalOvers) * 6 + Math.round((inn.totalOvers % 1) * 10) : 0),
        history: inn.history || []
      };
    };

    const ld = isLive && match.live_data ? (typeof match.live_data === 'string' ? JSON.parse(match.live_data) : match.live_data) : null;
    const source = ld || match.scorecard || {};

    return {
      innings1: transform(source.innings1),
      innings2: transform(source.innings2)
    };
  }, [match, isLive]);

  const currentInningsData = selectedInnings === 1 ? normalizedData.innings1 : normalizedData.innings2;

  const getPlayerNameResolved = (id: string, providedName?: string) => {
    const p = players.find(p => p.id === id || p.player_id === id);
    if (p) return p.name;
    // Check opponent players
    const opp = opponents.find(o => o.id === match.opponentId);
    const oppP = opp?.players?.find((p: any) => p.id === id);
    if (oppP) return oppP.name;
    return providedName || 'Unknown Player';
  };

  const getOvers = (balls: number) => {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  };

  const handleDownloadImage = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#111',
        scale: 2,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `Scorecard_${match.opponentName || 'Match'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Indian Strikers Match Scorecard',
      text: `Checkout the scorecard for ${match.opponentName || 'Match'}: ${match.finalScoreHome?.runs}/${match.finalScoreHome?.wickets} vs ${match.finalScoreAway?.runs}/${match.finalScoreAway?.wickets}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  return (
    <PremiumModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <PremiumModalContent onClick={e => e.stopPropagation()} ref={containerRef}>
        <ModalHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/INS%20LOGO.PNG" style={{ height: 32, width: 32, objectFit: 'contain' }} alt="INS" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.5px' }}>FULL SCORECARD</h2>
              <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {match.tournament || 'Hayes League'} • {match.opponentName || 'Opponent'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <IconButton onClick={handleShare} title="Share Link">
              <Share2 size={20} />
            </IconButton>
            <IconButton onClick={handleDownloadImage} title="Download Image">
              <ImageIcon size={20} />
            </IconButton>
            <IconButton onClick={onClose} title="Close">
              <X size={24} />
            </IconButton>
          </div>
        </ModalHeader>

        {/* Innings Switcher if both exist */}
        {normalizedData.innings1 && normalizedData.innings2 && (
          <div style={{ padding: '12px 20px', display: 'flex', gap: 10, background: 'rgba(255,255,255,0.03)' }}>
            <button 
              onClick={() => setSelectedInnings(1)} 
              style={{ 
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', 
                background: selectedInnings === 1 ? '#38BDF8' : 'rgba(255,255,255,0.05)',
                color: selectedInnings === 1 ? '#000' : '#FFF',
                fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer'
              }}
            >
              1ST INNINGS
            </button>
            <button 
              onClick={() => setSelectedInnings(2)} 
              style={{ 
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', 
                background: selectedInnings === 2 ? '#38BDF8' : 'rgba(255,255,255,0.05)',
                color: selectedInnings === 2 ? '#000' : '#FFF',
                fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer'
              }}
            >
              2ND INNINGS
            </button>
          </div>
        )}

        <TabContainer>
          <TabButton $active={tab === 'scorecard'} onClick={() => setTab('scorecard')}>
            📋 Scorecard
          </TabButton>
          <TabButton $active={tab === 'commentary'} onClick={() => setTab('commentary')}>
            🎙️ Commentary
          </TabButton>
        </TabContainer>

        <ScrollContent>
          {!currentInningsData ? (
            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.4 }}>NO DATA AVAILABLE FOR THIS INNINGS</div>
          ) : (
            <>
              {tab === 'scorecard' && (
                <>
                  <ScoreSummaryCard>
                    <div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>TOTAL SCORE</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FAB005' }}>
                        {currentInningsData.totalRuns}/{currentInningsData.wickets}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>OVERS</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>
                        {getOvers(currentInningsData.totalBalls)}
                      </div>
                    </div>
                  </ScoreSummaryCard>

                  <TableTitle><Zap size={14} /> BATTING</TableTitle>
                  <ScoreCardTable>
                    <thead>
                      <tr>
                        <Th>Batter</Th>
                        <Th>Status</Th>
                        <Th style={{ textAlign: 'center' }}>R</Th>
                        <Th style={{ textAlign: 'center' }}>B</Th>
                        <Th style={{ textAlign: 'right' }}>SR</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInningsData.batting.map(stat => (
                        <tr key={stat.playerId}>
                          <Td>{getPlayerNameResolved(stat.playerId, stat.name)}</Td>
                          <Td style={{ fontSize: '0.65rem', opacity: 0.6 }}>{stat.status === 'batting' ? 'not out' : (stat.outHow || 'out')}</Td>
                          <Td style={{ textAlign: 'center', color: '#FAB005' }}>{stat.runs}</Td>
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.balls}</Td>
                          <Td style={{ textAlign: 'right', opacity: 0.8 }}>
                            {stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0'}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </ScoreCardTable>

                  <TableTitle><Target size={14} /> BOWLING</TableTitle>
                  <ScoreCardTable>
                    <thead>
                      <tr>
                        <Th>Bowler</Th>
                        <Th style={{ textAlign: 'center' }}>O</Th>
                        <Th style={{ textAlign: 'center' }}>M</Th>
                        <Th style={{ textAlign: 'center' }}>R</Th>
                        <Th style={{ textAlign: 'center' }}>W</Th>
                        <Th style={{ textAlign: 'right' }}>Econ</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInningsData.bowling.map(stat => (
                        <tr key={stat.playerId}>
                          <Td>{getPlayerNameResolved(stat.playerId, stat.name)}</Td>
                          <Td style={{ textAlign: 'center' }}>{stat.overs}</Td>
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.maidens}</Td>
                          <Td style={{ textAlign: 'center' }}>{stat.runs}</Td>
                          <Td style={{ textAlign: 'center', color: '#38BDF8' }}>{stat.wickets}</Td>
                          <Td style={{ textAlign: 'right', opacity: 0.8 }}>
                            {stat.overs > 0 ? (stat.runs / stat.overs).toFixed(2) : '0.00'}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </ScoreCardTable>

                  <ExtrasRow>
                    <span style={{ opacity: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>EXTRAS</span>
                    <span style={{ fontWeight: 900 }}>
                      {Object.values(currentInningsData.extras).reduce((a, b) => a + b, 0)}{' '}
                      <span style={{ opacity: 0.4, fontSize: '0.65rem', marginLeft: 4 }}>
                        (wd {currentInningsData.extras.wides}, nb {currentInningsData.extras.noBalls}, b {currentInningsData.extras.byes}, lb {currentInningsData.extras.legByes})
                      </span>
                    </span>
                  </ExtrasRow>
                </>
              )}

              {tab === 'commentary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {(() => {
                    const history = [...currentInningsData.history].reverse();
                    const overGroups: Record<number, any[]> = {};
                    history.forEach(ball => {
                      const ov = ball.overNumber ?? 0;
                      if (!overGroups[ov]) overGroups[ov] = [];
                      overGroups[ov].push(ball);
                    });
                    const sortedOvers = Object.keys(overGroups).map(Number).sort((a,b) => b-a);

                    return sortedOvers.map(overNum => {
                      const balls = overGroups[overNum];
                      const historyAtThisPoint = history.filter(b => (b.overNumber ?? 0) <= overNum);
                      
                      // CUMULATIVE STATS
                      const runsAtEnd = historyAtThisPoint.reduce((s, b) => s + b.runs + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                      const wktsAtEnd = historyAtThisPoint.filter(b => b.isWicket).length;
                      
                      // OVER STATS
                      const overRuns = balls.reduce((s, b) => s + b.runs + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                      const overWkts = balls.filter(b => b.isWicket).length;
                      
                      const lastBall = balls[0];
                      const bName = getPlayerNameResolved(lastBall.bowlerId);
                      const bBalls = historyAtThisPoint.filter(b => b.bowlerId === lastBall.bowlerId);
                      const bRuns = bBalls.reduce((s, b) => s + b.runs + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                      const bWkts = bBalls.filter(b => b.isWicket).length;
                      const bOvers = getOvers(bBalls.filter(b => b.isLegal).length);

                      return (
                        <div key={overNum}>
                          {/* PREMIUM BROADCAST OVER SUMMARY */}
                          <div style={{
                            background: '#10B981', 
                            borderRadius: 12,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'row',
                            color: '#FFF',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                            marginBottom: 16,
                            minHeight: 60,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: '1px solid rgba(255,255,255,0.1)',
                            position: 'sticky', top: 0, zIndex: 10
                          }}>
                            <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', minWidth: 90 }}>
                              <div style={{ opacity: 0.8, fontSize: '0.65rem', letterSpacing: 1 }}>OVER {overNum + 1}</div>
                              <div style={{ fontSize: '1rem', fontWeight: 900 }}>{overRuns} RUNS</div>
                            </div>

                            <div style={{ flex: 1, padding: '10px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ opacity: 0.8, fontSize: '0.65rem' }}>BOWLER: {bName.toUpperCase()}</span>
                                  <span style={{ fontWeight: 900, color: '#FAB005' }}>{bOvers}-{bWkts}-{bRuns}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>INNINGS TOTAL:</span>
                                  <span style={{ fontWeight: 900 }}>{runsAtEnd}/{wktsAtEnd}</span>
                                </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
                            {balls.map((ball, i) => (
                              <div key={i} style={{ 
                                display: 'flex', gap: 14, padding: '12px', background: 'rgba(255,255,255,0.02)', 
                                borderRadius: 10, borderLeft: `3px solid ${ball.isWicket ? '#FF4D4D' : ball.runs >= 4 ? '#38BDF8' : 'rgba(255,255,255,0.08)'}`,
                                transition: 'all 0.2s'
                              }}>
                                <span style={{ opacity: 0.4, fontWeight: 900, fontSize: '0.7rem', minWidth: 28, paddingTop: 2 }}>{overNum}.{ball.ballNumber ?? ball.ball_number ?? i}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: ball.isWicket ? '#FF4D4D' : '#FFF' }}>
                                    {ball.commentary || `${ball.runs} run(s)`}
                                  </div>
                                  <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: 4 }}>
                                    {getPlayerNameResolved(ball.bowlerId)} to {getPlayerNameResolved(ball.strikerId)}
                                  </div>
                                </div>
                                <span style={{ 
                                  fontWeight: 950, fontSize: '1rem',
                                  color: ball.isWicket ? '#FF4D4D' : ball.runs >= 4 ? '#38BDF8' : 'rgba(255,255,255,0.7)',
                                  minWidth: 20, textAlign: 'center'
                                }}>
                                  {ball.isWicket ? 'W' : ball.runs}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div style={{ height: 30 }} />
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </>
          )}
        </ScrollContent>
      </PremiumModalContent>
    </PremiumModalOverlay>
  );
};
