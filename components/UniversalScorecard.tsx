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
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

// --- STYLED COMPONENTS (Ported from ScorerDashboard) ---

const PremiumModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PremiumModalContent = styled.div`
  background: #0F172A;
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
  border-bottom: 1px solid rgba(0,0,0,0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFFFFF;
  position: sticky;
  top: 0;
  z-index: 50;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: #64748B;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  opacity: 0.8;

  &:hover { 
    background: rgba(0, 0, 0, 0.05); 
    opacity: 1;
    transform: scale(1.1);
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0 20px;
  background: #1E293B;
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 14px 0;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#38BDF8' : 'transparent'};
  color: ${props => props.$active ? '#38BDF8' : 'rgba(255, 255, 255, 0.4)'};
  font-weight: 900;
  font-size: 0.75rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -1px;

  &:hover {
    color: ${props => props.$active ? '#38BDF8' : 'rgba(255, 255, 255, 0.7)'};
  }
`;

const ScrollContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #0F172A;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
`;

const MatchHeaderCard = styled.div`
  background: #001F3F; /* Dark navy from the image */
  padding: 36px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  overflow: hidden;
  border-bottom: 3px solid rgba(56, 189, 248, 0.4);
`;

const TournamentLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 900;
  color: #38BDF8;
  text-transform: uppercase;
  letter-spacing: 3px;
  text-align: center;
  opacity: 0.9;
  margin-bottom: 4px;
`;

const TeamsHorizontalRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
`;

const TeamBlock = styled.div<{ $reverse?: boolean }>`
  display: flex;
  flex-direction: ${props => props.$reverse ? 'row-reverse' : 'row'};
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const TeamLogoFrame = styled.div`
  width: 54px;
  height: 54px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
  flex-shrink: 0;
`;

const TeamInfo = styled.div<{ $align?: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$align === 'right' ? 'flex-end' : 'flex-start'};
  min-width: 0;
`;

const TeamNameLabel = styled.div`
  font-size: 0.9rem;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
  color: #FFFFFF;
  letter-spacing: -0.5px;
`;

const ScoreValue = styled.div`
  font-size: 1.6rem;
  font-weight: 900;
  color: #FFFFFF;
  display: flex;
  align-items: baseline;
  gap: 4px;
  letter-spacing: -1px;
  
  span {
    font-size: 0.75rem;
    opacity: 0.6;
    font-weight: 800;
    letter-spacing: 0;
  }
`;

const VSBadgeHeader = styled.div`
  background: rgba(15, 23, 42, 0.8);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 900;
  color: #38BDF8;
  border: 1px solid rgba(56, 189, 248, 0.4);
  flex-shrink: 0;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
`;

const ResultHighlightBar = styled.div`
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0.05) 100%);
  padding: 10px 16px;
  border-radius: 8px;
  text-align: center;
  color: #38BDF8;
  font-weight: 900;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid rgba(56, 189, 248, 0.3);
  margin-top: 4px;
`;

const MetaGrid = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 4px;
`;

const MetaItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 800;
  color: rgba(255,255,255,0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ScoreSummaryCard = styled.div`
  background: #1E293B;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #FFFFFF;
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  opacity: 0.6;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 1.5px;
  color: #38BDF8;
`;

const Td = styled.td`
  padding: 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-weight: 600;
  color: #FFFFFF;
`;

const ExtrasRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 14px 12px;
  background: #1E293B;
  border-radius: 10px;
  font-size: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #FFFFFF;
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
  battingTeamId?: string;
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
      const history = inn.history || [];
      if (history.length > 0) {
        const allBowlers = [...new Set(history.map((b: any) => b.bowlerId || b.bowler_id).filter(Boolean))];
        bowling = allBowlers.map((bowlerId: any) => {
          const bBalls = history.filter((b: any) => (b.bowlerId === bowlerId || b.bowler_id === bowlerId));
          const legalBalls = bBalls.filter((b: any) => b.isLegal || b.is_legal).length;
          const oversStr = `${Math.floor(legalBalls / 6)}${legalBalls % 6 > 0 ? '.' + (legalBalls % 6) : ''}`;
          const oversNum = parseFloat(oversStr) || 0;
          const runs = bBalls.reduce((s: number, b: any) => s + (Number(b.runs) || 0) + (b.isWide || b.isNoBall || b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
          const wickets = bBalls.filter((b: any) => b.isWicket).length;
          const wides = bBalls.filter((b: any) => b.isWide || b.type === 'wide').length;
          const no_balls = bBalls.filter((b: any) => b.isNoBall || b.type === 'no-ball').length;

          return {
            playerId: bowlerId,
            name: bBalls[0].bowlerName || bBalls[0].bowler_name || 'Bowler',
            overs: oversNum,
            maidens: 0,
            runs,
            wickets,
            wides,
            no_balls,
            index: 0
          };
        });
      } else if (inn.bowlingStats && typeof inn.bowlingStats === 'object') {
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
        batting: (batting || []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
        bowling: (bowling || []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0)),
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
        <MatchHeaderCard>
          {/* TOP UTILITIES */}
          <div style={{ position: 'absolute', top: 12, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <IconButton onClick={handleShare} title="Share Link" style={{ background: 'rgba(255,255,255,0.08)', opacity: 1, padding: 8 }}>
                <Share2 size={18} />
              </IconButton>
              <IconButton onClick={handleDownloadImage} title="Download Image" style={{ background: 'rgba(255,255,255,0.08)', opacity: 1, padding: 8 }}>
                <ImageIcon size={18} />
              </IconButton>
            </div>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              title="Close"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', opacity: 1, padding: 8 }}
            >
              <X size={22} />
            </IconButton>
          </div>

          <TournamentLabel>
            {match.tournament || 'RCA T20 TOURNAMENT'}
          </TournamentLabel>

          <TeamsHorizontalRow>
            {/* HOME TEAM */}
            <TeamBlock>
              <TeamLogoFrame>
                <img src="/INS%20LOGO.PNG" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="INS" />
              </TeamLogoFrame>
              <TeamInfo>
                <TeamNameLabel>{match.homeTeamName || 'INDIAN STRIKERS'}</TeamNameLabel>
                <ScoreValue>
                  {match.finalScoreHome?.runs || 0}/{match.finalScoreHome?.wickets || 0}
                  <span>({getOvers(match.finalScoreHome?.balls || 0)})</span>
                </ScoreValue>
              </TeamInfo>
            </TeamBlock>

            <VSBadgeHeader>VS</VSBadgeHeader>

            {/* AWAY TEAM */}
            <TeamBlock $reverse>
              <TeamLogoFrame>
                <div style={{ fontSize: '1.4rem' }}>🏏</div>
              </TeamLogoFrame>
              <TeamInfo $align="right">
                <TeamNameLabel>{match.opponentName || 'OPPONENT'}</TeamNameLabel>
                <ScoreValue>
                  {match.finalScoreAway?.runs || 0}/{match.finalScoreAway?.wickets || 0}
                  <span>({getOvers(match.finalScoreAway?.balls || 0)})</span>
                </ScoreValue>
              </TeamInfo>
            </TeamBlock>
          </TeamsHorizontalRow>

          <ResultHighlightBar>
            {match.resultNote || 'MATCH IN PROGRESS'}
          </ResultHighlightBar>

          <MetaGrid>
            <MetaItemHeader>
              <Clock size={12} style={{ color: '#38BDF8' }} />
              {match.date ? new Date(match.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : 'TODAY'}
            </MetaItemHeader>
            <MetaItemHeader>
              <Target size={12} style={{ color: '#38BDF8' }} />
              {typeof match.venue === 'object' ? (match.venue as any)?.name : (match.venue || 'LOCAL GROUND')}
            </MetaItemHeader>
          </MetaGrid>
        </MatchHeaderCard>

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
                        {currentInningsData?.totalRuns || 0}/{currentInningsData?.wickets || 0}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>OVERS</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>
                        {getOvers(currentInningsData?.totalBalls || 0)}
                      </div>
                    </div>
                  </ScoreSummaryCard>

                  <TableTitle><Zap size={14} /> BATTING</TableTitle>
                  <ScoreCardTable>
                    <thead>
                      <tr>
                        <Th>Batter</Th>
                        <Th style={{ textAlign: 'center' }}>R</Th>
                        <Th style={{ textAlign: 'center' }}>B</Th>
                        <Th style={{ textAlign: 'center' }}>4s</Th>
                        <Th style={{ textAlign: 'center' }}>6s</Th>
                        <Th style={{ textAlign: 'right' }}>SR</Th>
                        <Th>Out</Th>
                        <Th>F</Th>
                        <Th>B</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currentInningsData?.batting || []).map(stat => (
                        <tr key={stat.playerId}>
                          <Td>{getPlayerNameResolved(stat.playerId, stat.name)}</Td>
                          <Td style={{ textAlign: 'center', color: '#FAB005', fontWeight: 700 }}>{stat.runs}</Td>
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.balls}</Td>
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.fours || 0}</Td>
                          <Td style={{ textAlign: 'center', opacity: 0.6 }}>{stat.sixes || 0}</Td>
                          <Td style={{ textAlign: 'right', opacity: 0.8 }}>
                            {stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0'}
                          </Td>
                          <Td style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 600 }}>
                            {stat.status === 'batting' ? <span style={{ color: '#38BDF8' }}>not out</span> : (stat.outHow || 'out')}
                          </Td>
                          <Td style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                            {stat.fielderId ? getPlayerNameResolved(stat.fielderId) : '—'}
                          </Td>
                          <Td style={{ fontSize: '0.65rem', opacity: 0.5 }}>
                            {stat.bowlerId ? getPlayerNameResolved(stat.bowlerId) : '—'}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </ScoreCardTable>

                  {(() => {
                    const batters = currentInningsData?.batting || [];
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
                      {(currentInningsData?.bowling || []).map(stat => (
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
                      {Object.values(currentInningsData?.extras || {}).reduce((a: any, b: any) => (Number(a) || 0) + (Number(b) || 0), 0)}{' '}
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
                            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                            borderRadius: 12,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'row',
                            color: '#FFF',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                            marginBottom: 16,
                            minHeight: 60,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            position: 'sticky', top: 0, zIndex: 10
                          }}>
                            <div style={{ padding: '10px 16px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid rgba(56, 189, 248, 0.2)', minWidth: 90 }}>
                              <div style={{ color: '#38BDF8', fontSize: '0.65rem', letterSpacing: 2 }}>OVER {overNum + 1}</div>
                              <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{overRuns} RUNS</div>
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
                                display: 'flex', gap: 14, padding: '12px', background: '#111827',
                                borderRadius: 10, borderLeft: `3px solid ${ball.isWicket ? '#FF4D4D' : ball.runs >= 4 ? '#38BDF8' : 'rgba(255,255,255,0.1)'}`,
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
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
                                    const isWide = ball.type === 'wide';
                                    const isNoBall = ball.type === 'no-ball';
                                    const isLB = ball.type === 'leg-bye';
                                    const isB = ball.type === 'bye';

                                    if (ball.isWicket) {
                                      const prefix = isNoBall ? 'NB' : isWide ? 'WD' : '';
                                      const amount = ball.runs > 0 ? `+${ball.runs}` : '';
                                      return prefix ? `${prefix}${amount}+W` : 'W';
                                    }
                                    if (isWide) return `WD${ball.runs > 0 ? '+' + ball.runs : ''}`;
                                    if (isNoBall) return `NB${ball.runs > 0 ? '+' + ball.runs : ''}`;
                                    if (isLB) return `LB${ball.runs}`;
                                    if (isB) return `B${ball.runs}`;
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
                    const overStats: Record<number, any> = {};
                    const maxOvers = match.maxOvers || 20;

                    for (let i = 1; i <= maxOvers; i++) {
                      overStats[i] = { over: i, runs1: 0, cumulative1: 0, runs2: 0, cumulative2: 0, wickets1: 0, wickets2: 0 };
                    }

                    const processInn = (inn: any, key: string) => {
                      if (!inn) return;
                      let cum = 0;
                      const h = Array.isArray(inn.history) ? inn.history : [];
                      const groups: Record<number, any[]> = {};
                      h.forEach((b: any) => {
                        const ov = (b.overNumber ?? b.over_number ?? 0) + 1;
                        if (!groups[ov]) groups[ov] = [];
                        groups[ov].push(b);
                      });

                      for (let i = 1; i <= maxOvers; i++) {
                        const balls = groups[i] || [];
                        const runs = balls.reduce((s, b) => s + (Number(b.runs) || 0) + (b.isWide || b.isNoBall || b.type === 'wide' || b.type === 'no-ball' ? 1 : 0), 0);
                        const wkts = balls.filter(b => b.isWicket).length;
                        cum += runs;
                        overStats[i][`runs${key}`] = runs;
                        overStats[i][`cumulative${key}`] = cum;
                        overStats[i][`wickets${key}`] = wkts;
                      }
                    };

                    processInn(normalizedData.innings1, '1');
                    processInn(normalizedData.innings2, '2');

                    const analyticsData = Object.values(overStats);
                    const team1Name = normalizedData.innings1?.battingTeamId === 'HOME' ? (match.homeTeamName || 'INDIAN STRIKERS') : (match.opponentName || 'OPPONENT');
                    const team2Name = normalizedData.innings2?.battingTeamId === 'HOME' ? (match.homeTeamName || 'INDIAN STRIKERS') : (match.opponentName || 'OPPONENT');

                    return (
                      <>
                        <div style={{ background: '#1E293B', padding: '20px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                          <TableTitle style={{ marginLeft: 10 }}><BarChart2 size={14} /> MANHATTAN (Runs per Over)</TableTitle>
                          <div style={{ width: '100%', height: 250, marginTop: 20 }}>
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="over" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} width={30} />
                                <Tooltip
                                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                                <Bar dataKey="runs1" name={team1Name} fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={8}>
                                  {analyticsData.map((entry, index) => (
                                    <Cell key={`c1-${index}`} fill={entry.wickets1 > 0 ? '#ef4444' : '#38BDF8'} />
                                  ))}
                                </Bar>
                                <Bar dataKey="runs2" name={team2Name} fill="#FAB005" radius={[4, 4, 0, 0]} barSize={8}>
                                  {analyticsData.map((entry, index) => (
                                    <Cell key={`c2-${index}`} fill={entry.wickets2 > 0 ? '#ef4444' : '#FAB005'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div style={{ background: '#1E293B', padding: '20px 10px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                          <TableTitle style={{ marginLeft: 10 }}><BarChart2 size={14} /> WORM (Cumulative Runs)</TableTitle>
                          <div style={{ width: '100%', height: 250, marginTop: 20 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="over" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} width={30} />
                                <Tooltip
                                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                                />
                                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
                                <Line type="monotone" name={team1Name} dataKey="cumulative1" stroke="#38BDF8" strokeWidth={3} dot={{ r: 3, fill: '#38BDF8' }} />
                                <Line type="monotone" name={team2Name} dataKey="cumulative2" stroke="#FAB005" strokeWidth={3} dot={{ r: 3, fill: '#FAB005' }} />
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
