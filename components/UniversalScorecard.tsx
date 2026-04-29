import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Award,
  Info,
  BarChart2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { useMatchCenter } from '../store/matchStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- STYLED COMPONENTS (Ported from ScorerDashboard) ---

const PremiumModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: hsla(0, 0%, 100%, 0.85);
  backdrop-filter: blur(8px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PremiumModalContent = styled.div`
  background: #111;
  color: #FFFFFF;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  max-height: none !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0;
  border: none;
`;

const ModalHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255,255,255,0.02);
  position: sticky;
  top: 0;
  z-index: 50;
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
  fielderId?: string;
  bowlerId?: string;
  index?: number;
}

interface BowlingStat {
  playerId: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  wides?: number;
  no_balls?: number;
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
  match: initialMatch,
  players,
  opponents = [],
  onClose,
  isLive = false,
  activeInnings = 1
}) => {
  const [tab, setTab] = useState<'info' | 'scorecard' | 'commentary' | 'analytics'>('scorecard');
  const [selectedInnings, setSelectedInnings] = useState<number>(activeInnings || 1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Real-time data subscription
  const storeMatches = useMatchCenter(state => state.matches);
  const liveMatch = storeMatches.find(m => m.id === initialMatch.id);
  const match = isLive && liveMatch ? liveMatch : initialMatch;

  // Helper: Normalize data from different formats
  const normalizedData = useMemo(() => {
    const transform = (inn: any): Innings | null => {
      if (!inn || (!inn.battingStats && !inn.batting && !inn.bowlingStats && !inn.bowling && !inn.extras)) return null;

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
          fielderId: stat.fielderId,
          bowlerId: stat.bowlerId,
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
          fielderId: b.fielderId,
          bowlerId: b.bowlerId,
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
          wides: stat.wides || 0,
          no_balls: stat.no_balls || 0,
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
          wides: b.wides || 0,
          no_balls: b.no_balls || 0,
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
        batting: batting.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
        bowling: bowling.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
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
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Close"
            >
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
          <TabButton $active={tab === 'info'} onClick={() => setTab('info')}>
            <Info size={14} style={{ display: 'inline', marginBottom: '-2px' }} /> Info
          </TabButton>
          <TabButton $active={tab === 'scorecard'} onClick={() => setTab('scorecard')}>
            📋 Scorecard
          </TabButton>
          <TabButton $active={tab === 'commentary'} onClick={() => setTab('commentary')}>
            🎙️ Commentary
          </TabButton>
          <TabButton $active={tab === 'analytics'} onClick={() => setTab('analytics')}>
            <BarChart2 size={14} style={{ display: 'inline', marginBottom: '-2px' }} /> Analytics
          </TabButton>
        </TabContainer>

        <ScrollContent>
          {!currentInningsData ? (
            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.4 }}>NO DATA AVAILABLE FOR THIS INNINGS</div>
          ) : (
            <>
              {tab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <ScoreSummaryCard style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>MATCH FORMAT</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#FFF' }}>{match.matchType || match.matchFormat || 'T20'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>TOSS</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FAB005' }}>{match.tossResult || 'Toss result pending'}</div>
                    </div>
                  </ScoreSummaryCard>

                  <div style={{ display: 'flex', gap: 20 }}>
                    <div style={{ flex: 1 }}>
                      <TableTitle>{match.homeTeamName || 'Home Team'} XI</TableTitle>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                        {(match.homeTeamXI || []).map((id: string) => (
                          <div key={id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', fontWeight: 600 }}>
                            {getPlayerNameResolved(id)}
                          </div>
                        ))}
                        {(!match.homeTeamXI || match.homeTeamXI.length === 0) && <div style={{ opacity: 0.4, fontSize: '0.8rem' }}>Playing XI not announced</div>}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <TableTitle>{match.opponentName || 'Away Team'} XI</TableTitle>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                        {(match.opponentTeamXI || []).map((id: string) => (
                          <div key={id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', fontWeight: 600 }}>
                            {getPlayerNameResolved(id)}
                          </div>
                        ))}
                        {(!match.opponentTeamXI || match.opponentTeamXI.length === 0) && <div style={{ opacity: 0.4, fontSize: '0.8rem' }}>Playing XI not announced</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                        <Th style={{ textAlign: 'center' }}>4s</Th>
                        <Th style={{ textAlign: 'center' }}>6s</Th>
                        <Th style={{ textAlign: 'right' }}>SR</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInningsData.batting.map(stat => (
                        <tr key={stat.playerId}>
                          <Td>{getPlayerNameResolved(stat.playerId, stat.name)}</Td>
                          <Td style={{ fontSize: '0.65rem', opacity: 0.6 }}>
                            {stat.status === 'batting' ? 'not out' : (() => {
                              const outHow = stat.outHow || 'out';
                              const fName = stat.fielderId ? getPlayerNameResolved(stat.fielderId) : '';
                              const bName = stat.bowlerId ? getPlayerNameResolved(stat.bowlerId) : '';

                              if (outHow === 'Caught') return `ct ${fName} b ${bName}`;
                              if (outHow === 'Bowled') return `b ${bName}`;
                              if (outHow === 'LBW') return `lbw b ${bName}`;
                              if (outHow === 'Run Out') return `run out (${fName})`;
                              if (outHow === 'Stumped') return `st ${fName} b ${bName}`;
                              if (outHow === 'Hit Wicket') return `hit wicket b ${bName}`;
                              return outHow.toLowerCase();
                            })()}
                          </Td>
                          <Td style={{ textAlign: 'center', color: '#FAB005' }}>{stat.runs}</Td>
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.balls}</Td>
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.fours || 0}</Td>
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.sixes || 0}</Td>
                          <Td style={{ textAlign: 'right', opacity: 0.8 }}>
                            {stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0'}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </ScoreCardTable>

                  {(() => {
                    const batters = currentInningsData.batting;
                    // Detect if Home team is batting by checking if any batter exists in the Home players list
                    let isHomeBatting = batters.some(b => players.some(p => p.id === b.playerId || p.player_id === b.playerId));

                    // Fallback to match metadata if no one has batted yet
                    if (batters.length === 0) {
                      isHomeBatting = (selectedInnings === 1 && match.isHomeBattingFirst) ||
                        (selectedInnings === 2 && !match.isHomeBattingFirst);
                    }

                    const playingXI = isHomeBatting ? (match.homeTeamXI || []) : (match.opponentTeamXI || []);
                    const battingIds = new Set(batters.map(b => b.playerId));
                    const dnbPlayers = playingXI.filter((id: string) => !battingIds.has(id));

                    if (dnbPlayers.length === 0) return null;

                    return (
                      <div style={{
                        padding: '12px 8px',
                        fontSize: '0.7rem',
                        color: 'rgba(255,255,255,0.4)',
                        fontStyle: 'italic',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: '24px'
                      }}>
                        <span style={{ fontWeight: 800, textTransform: 'uppercase', marginRight: 6, fontStyle: 'normal', opacity: 0.8 }}>Did Not Bat:</span>
                        {dnbPlayers.map((id: string, idx: number) => (
                          <span key={id}>
                            {getPlayerNameResolved(id)}{idx < dnbPlayers.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  <TableTitle><Target size={14} /> BOWLING</TableTitle>
                  <ScoreCardTable>
                    <thead>
                      <tr>
                        <Th>Bowler</Th>
                        <Th style={{ textAlign: 'center' }}>O</Th>
                        <Th style={{ textAlign: 'center' }}>M</Th>
                        <Th style={{ textAlign: 'center' }}>R</Th>
                        <Th style={{ textAlign: 'center' }}>W</Th>
                        <Th style={{ textAlign: 'center' }}>WD</Th>
                        <Th style={{ textAlign: 'center' }}>NB</Th>
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
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.wides || 0}</Td>
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.no_balls || 0}</Td>
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
                        (wd {currentInningsData?.extras?.wides || 0}, nb {currentInningsData?.extras?.noBalls || 0}, b {currentInningsData?.extras?.byes || 0}, lb {currentInningsData?.extras?.legByes || 0})
                      </span>
                    </span>
                  </ExtrasRow>
                </>
              )}

              {tab === 'commentary' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {(() => {
                    const historyData = currentInningsData?.history;
                    const historyFiltered = (Array.isArray(historyData) ? historyData : [])
                      .filter(b => b && typeof b === 'object')
                      .reverse();

                    if (historyFiltered.length === 0) {
                      return <div key="no-comm" style={{ padding: '40px', textAlign: 'center', opacity: 0.4 }}>NO COMMENTARY AVAILABLE FOR THIS MATCH SUMMARY</div>;
                    }

                    const overGroups: Record<number, any[]> = {};
                    historyFiltered.forEach(ball => {
                      const ov = ball.overNumber ?? ball.over_number ?? 0;
                      if (!overGroups[ov]) overGroups[ov] = [];
                      overGroups[ov].push(ball);
                    });
                    const sortedOvers = Object.keys(overGroups).map(Number).sort((a, b) => b - a);

                    return sortedOvers.map(overNum => {
                      const balls = overGroups[overNum];
                      if (!balls || balls.length === 0) return null;

                      const historyAtThisPoint = historyFiltered.filter(b => (b.overNumber ?? b.over_number ?? 0) <= overNum);

                      const runsAtEnd = historyAtThisPoint.reduce((s, b) => s + (Number(b.runs) || 0) + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                      const wktsAtEnd = historyAtThisPoint.filter(b => b.isWicket).length;

                      const overRuns = balls.reduce((s, b) => s + (Number(b.runs) || 0) + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                      const overWkts = balls.filter(b => b.isWicket).length;

                      const lastBall = balls[0];
                      const bName = getPlayerNameResolved(lastBall?.bowlerId || lastBall?.bowler_id);
                      const bBalls = historyAtThisPoint.filter(b => lastBall && (b.bowlerId === (lastBall.bowlerId || lastBall.bowler_id) || b.bowler_id === (lastBall.bowlerId || lastBall.bowler_id)));
                      const bRuns = bBalls.reduce((s, b) => s + (Number(b.runs) || 0) + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                      const bWkts = bBalls.filter(b => b.isWicket).length;
                      const bOvers = getOvers(bBalls.filter(b => b.isLegal || b.is_legal).length);

                      return (
                        <div key={overNum}>
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
                                  {(() => {
                                    if (ball.isWicket) {
                                      const prefix = ball.isNoBall ? 'NB' : ball.isWide ? 'WD' : '';
                                      const amount = ball.runs > 0 ? `+${ball.runs}` : '';
                                      return prefix ? `${prefix}${amount}+W` : 'W';
                                    }
                                    if (ball.isWide) return `WD${ball.runs > 0 ? ' + ' + ball.runs : ''}`;
                                    if (ball.isNoBall) return `NB${ball.runs > 0 ? ' + ' + ball.runs : ''}`;
                                    if (ball.type === 'leg-bye') return `LB${ball.runs}`;
                                    if (ball.type === 'bye') return `B${ball.runs}`;
                                    return ball.runs;
                                  })()}
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

              {tab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
                  {(() => {
                    const historyData = currentInningsData?.history;
                    const historyFiltered = (Array.isArray(historyData) ? historyData : [])
                      .filter(b => b && typeof b === 'object');

                    if (historyFiltered.length === 0) {
                      return <div key="no-comm" style={{ padding: '40px', textAlign: 'center', opacity: 0.4 }}>NO DATA AVAILABLE FOR CHARTS</div>;
                    }

                    const overGroups: Record<number, any[]> = {};
                    historyFiltered.forEach(ball => {
                      const ov = ball.overNumber ?? ball.over_number ?? 0;
                      if (!overGroups[ov]) overGroups[ov] = [];
                      overGroups[ov].push(ball);
                    });
                    const sortedOversAsc = Object.keys(overGroups).map(Number).sort((a, b) => a - b);

                    let cumulativeRuns = 0;
                    const analyticsData = sortedOversAsc.map(ov => {
                      const balls = overGroups[ov];
                      const overRuns = balls.reduce((s, b) => s + (Number(b.runs) || 0) + (b.isWide || b.isNoBall || b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                      cumulativeRuns += overRuns;
                      return {
                        over: ov + 1,
                        runs: overRuns,
                        cumulative: cumulativeRuns
                      };
                    });

                    return (
                      <>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                          <TableTitle style={{ marginLeft: 10 }}><BarChart2 size={14} /> MANHATTAN (Runs per Over)</TableTitle>
                          <div style={{ width: '100%', height: 250, marginTop: 20 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analyticsData}>
                                <XAxis dataKey="over" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} width={30} />
                                <Tooltip
                                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="runs" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                          <TableTitle style={{ marginLeft: 10 }}><BarChart2 size={14} /> WORM (Cumulative Runs)</TableTitle>
                          <div style={{ width: '100%', height: 250, marginTop: 20 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={analyticsData}>
                                <XAxis dataKey="over" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} width={30} />
                                <Tooltip
                                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                                />
                                <Line type="monotone" dataKey="cumulative" stroke="#FAB005" strokeWidth={3} dot={{ r: 4, fill: '#FAB005' }} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </>
                    );
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
