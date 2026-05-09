import React, { useState, useRef, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Share2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronDown,
  ArrowUp,
  Maximize2,
  Minimize2,
  Star,
  Clock,
  Zap,
  Target,
  Trophy,
  Award,
  Info,
  BarChart2,
  Save,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Users,
  Shield
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { useMatchCenter } from '../store/matchStore';
import { useMasterData } from '../store/tournamentStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, LabelList } from 'recharts';

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
  background-image: linear-gradient(rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.95)), url('/assets/cricket_ground_bg.png');
  background-size: cover;
  background-position: center;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: transparent;
  z-index: 100;
  min-height: 40px;
`;

const IconButton = styled.button`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #64748B;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #F1F5F9;
    color: #0F172A;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0 20px;
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(8px);
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

const InningsAccordionHeader = styled.div<{ $active: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: ${props => props.$active ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.$active ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
`;

const FABContainer = styled.div`
  position: absolute;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
`;

const FloatingButton = styled(motion.button)`
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: #38BDF8;
  color: #FFFFFF;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.9;

  &:hover {
    opacity: 1;
    transform: scale(1.1);
  }
`;


const ScrollContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: transparent;

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
  padding: 16px 20px;
  background-image: linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.9)), url('/assets/cricket_ground_bg.png');
  background-size: cover;
  background-position: center;
  backdrop-filter: blur(10px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  margin-bottom: 12px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
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
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 0;
`;

const TeamBlock = styled.div<{ $reverse?: boolean }>`
  display: flex;
  flex-direction: ${props => props.$reverse ? 'row-reverse' : 'row'};
  align-items: center;
  gap: 10px;
  flex: 0 1 auto;
`;

const TeamLogoFrame = styled.div`
  width: 108px;
  height: 108px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.6));
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  &:hover {
    transform: scale(1.1) rotate(2deg);
  }
`;

const TeamInfo = styled.div<{ $align?: 'left' | 'right' }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$align === 'right' ? 'flex-end' : 'flex-start'};
  min-width: 0;
`;

const TeamNameLabel = styled.div`
  font-size: clamp(0.7rem, 3.5vw, 0.9rem);
  font-weight: 900;
  color: #FFF;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  line-height: 1.1;
  max-width: 100%;
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
    font-size: 1.6rem;
    opacity: 0.8;
    font-weight: 900;
    letter-spacing: -1px;
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
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const MetaItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  text-transform: uppercase;
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
  wides: number;
  noBalls: number;
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
  opponents: any[];
  onClose: () => void;
  isEditable?: boolean;
  onSave?: (data: any) => Promise<void>;
  isLive?: boolean;
  activeInnings?: number;
}

// --- COMPONENT ---

export const UniversalScorecard: React.FC<UniversalScorecardProps> = ({ 
  match: initialMatch, 
  players, 
  opponents, 
  onClose, 
  isEditable = false, 
  onSave,
  isLive = false,
  activeInnings = 1
}) => {
  const [tab, setTab] = useState<'info' | 'scorecard' | 'commentary' | 'analytics'>('scorecard');
  
  const normalizedMatch = useMemo(() => {
    const hId = initialMatch.team1Id || initialMatch.homeTeamId || initialMatch.home_team_id || 'HOME';
    const oId = initialMatch.team2Id || initialMatch.opponentId || initialMatch.opponent_id || 'AWAY';
    return {
      ...initialMatch,
      team1Id: hId,
      team2Id: oId,
      team1Name: initialMatch.team1Name || initialMatch.homeTeamName || initialMatch.home_team_name || 'Home Team',
      team2Name: initialMatch.team2Name || initialMatch.opponentName || initialMatch.opponent_name || 'Opponent',
      team1Logo: initialMatch.team1Logo || initialMatch.homeTeamLogo || initialMatch.home_team_logo || initialMatch.homeLogo || '/assets/default_team.png',
      team2Logo: initialMatch.team2Logo || initialMatch.opponentLogo || initialMatch.opponent_logo || '/assets/default_team.png',
      isTeam1BattingFirst: initialMatch.isTeam1BattingFirst !== undefined ? initialMatch.isTeam1BattingFirst : initialMatch.isHomeBattingFirst !== undefined ? initialMatch.isHomeBattingFirst : initialMatch.is_home_batting_first,
      groundId: initialMatch.groundId || initialMatch.ground_id,
      tossWinnerId: initialMatch.tossWinnerId || initialMatch.toss_winner_id,
      tossChoice: initialMatch.tossChoice || initialMatch.toss_choice
    };
  }, [initialMatch]);

  const [selectedInnings, setSelectedInnings] = useState<number>(activeInnings || 1);
  const [openInnings, setOpenInnings] = useState<Set<number>>(new Set([1]));
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editState, setEditState] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const grounds = useMasterData(state => (state as any).grounds || []);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      // Normalize editState to remove temporary IDs
      const finalState = JSON.parse(JSON.stringify(editState));
      
      const cleanBatting = (inn: any) => {
        if (!inn || !inn.batting) return;
        inn.batting = inn.batting.map((b: any) => ({
          ...b,
          playerId: (b.playerId && String(b.playerId).startsWith('new-')) ? undefined : b.playerId
        }));
      };

      // Recalculate totals before saving to ensure consistency
      const recalculateInnings = (inn: any) => {
        if (!inn) return;
        const runs = (inn.batting || []).reduce((s: number, b: any) => s + (Number(b.runs) || 0), 0) + 
                     Object.values(inn.extras || {}).reduce((s: number, e: any) => s + (Number(e) || 0), 0);
        const wickets = (inn.batting || []).filter((b: any) => b.status === 'out' || (b.outHow && b.outHow !== 'Not Out')).length;
        const balls = (inn.batting || []).reduce((s: number, b: any) => s + (Number(b.balls) || 0), 0);
        
        inn.totalRuns = runs;
        inn.wickets = wickets;
        inn.totalBalls = balls;
        inn.totalOvers = Math.floor(balls / 6) + (balls % 6) / 10;
      };

      cleanBatting(finalState.innings1);
      cleanBatting(finalState.innings2);
      recalculateInnings(finalState.innings1);
      recalculateInnings(finalState.innings2);

      await onSave(finalState);
      
      // If we are here, save was successful
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose(); // Only close on success
      }, 2000);
    } catch (err) {
      console.error("Failed to save scorecard:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateFOW = (history: any[]) => {
    const fow: any[] = [];
    let runs = 0;
    let wickets = 0;
    let balls = 0;

    history.forEach(ball => {
      runs += (ball.runs || 0) + (ball.extras || 0);
      balls++;
      if (ball.isWicket) {
        wickets++;
        const overs = Math.floor(balls / 6) + (balls % 6) / 10;
        fow.push({ wicket: wickets, runs, overs, batterName: ball.batterName });
      }
    });
    return fow;
  };

  const getPlayerNameResolved = (id: any, fallbackName?: string) => {
    const p = players.find(p => p.id === id || p.player_id === id);
    if (p) return p.name;
    const opp = opponents.find(o => o.id === normalizedMatch.team2Id);
    const oppP = opp?.players?.find((p: any) => p.id === id);
    if (oppP) return oppP.name;
    return fallbackName || 'Unknown Player';
  };

  const formatOvers = (balls: number, maxOvers?: number): string => {
    const fullOvers = Math.floor(balls / 6);
    const rem = balls % 6;
    if (maxOvers && fullOvers >= maxOvers) return `${fullOvers} Overs`;
    if (rem === 0 && fullOvers > 0) return `${fullOvers} Overs`;
    return `${fullOvers}.${rem}`;
  };

  const renderInningsTable = (data: any, innNo: number) => {
    if (!data) return <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>No data for this innings</div>;
    
    const fowData = calculateFOW(data.history || []);
    const isCurrentInningsEditable = isEditable && editState;
    const innKey = `innings${innNo}` as 'innings1' | 'innings2';
    
    const isTeam1Innings = (innNo === 1 && normalizedMatch.isTeam1BattingFirst) || (innNo === 2 && !normalizedMatch.isTeam1BattingFirst);
    // Support both old (homeTeamXI/opponentTeamXI) and new (team1XI/team2XI) payload keys for backward compat
    const t1XI = initialMatch.team1XI || initialMatch.homeTeamXI || [];
    const t2XI = initialMatch.team2XI || initialMatch.opponentTeamXI || [];
    const battingSquadIds = isTeam1Innings ? t1XI : t2XI;
    const bowlingSquadIds = isTeam1Innings ? t2XI : t1XI;

    const battingSquad = (battingSquadIds || []).map((id: string) => ({ id, name: getPlayerNameResolved(id) }));
    const bowlingSquad = (bowlingSquadIds || []).map((id: string) => ({ id, name: getPlayerNameResolved(id) }));

    return (
      <div style={{ paddingBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <TableTitle style={{ marginBottom: 0 }}><Zap size={14} /> BATTING</TableTitle>
          {isCurrentInningsEditable && (
            <button
              onClick={() => {
                const newBatting = [...editState[innKey].batting, {
                  playerId: `new-${Date.now()}`,
                  name: '',
                  runs: 0,
                  balls: 0,
                  fours: 0,
                  sixes: 0,
                  status: 'batting',
                  index: editState[innKey].batting.length
                }];
                setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
              }}
              style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <Plus size={12} style={{ display: 'inline', marginRight: 4 }} /> ADD BATTER
            </button>
          )}
        </div>
        
        <ScoreCardTable>
          <thead>
            <tr>
              <Th>Batter</Th>
              <Th>Status</Th>
              <Th>Fielder</Th>
              <Th>Bowler</Th>
              <Th style={{ textAlign: 'center' }}>R</Th>
              <Th style={{ textAlign: 'center' }}>B</Th>
              <Th style={{ textAlign: 'center' }}>4s</Th>
              <Th style={{ textAlign: 'center' }}>6s</Th>
              <Th style={{ textAlign: 'right' }}>{isCurrentInningsEditable ? 'Action' : 'SR'}</Th>
            </tr>
          </thead>
          <tbody>
            {(data.batting || []).map((stat: any, idx: number) => (
              <tr key={stat.playerId || idx}>
                <Td>
                  {isCurrentInningsEditable ? (
                    <select 
                      value={stat.playerId || ''} 
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const selectedId = e.target.value;
                        const newBatting = [...editState[innKey].batting];
                        
                        // Prevent duplicates
                        if (selectedId && newBatting.some((b, i) => i !== idx && String(b.playerId) === String(selectedId))) {
                          alert("This player is already in the batting list!");
                          return;
                        }

                        const selectedPlayer = battingSquad.find((p: any) => p.id === selectedId);
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          playerId: selectedId, 
                          name: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Select Batter"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="">Select Batter</option>
                      {battingSquad.map((p: any) => (
                        <option key={p.id} value={p.id} style={{ background: '#FFF', color: '#000' }}>{p.name}</option>
                      ))}
                      {/* Fallback for players not in initial XI */}
                      {stat.playerId && !battingSquad.find((p: any) => p.id === stat.playerId) && (
                        <option value={stat.playerId} style={{ background: '#FFF', color: '#000' }}>{stat.name} (Other)</option>
                      )}
                    </select>
                  ) : (
                    <div style={{ fontWeight: 700 }}>{getPlayerNameResolved(stat.playerId, stat.name)}</div>
                  )}
                </Td>
                <Td style={{ fontSize: '0.65rem', opacity: 0.7, fontWeight: 600 }}>
                  {isCurrentInningsEditable ? (
                    <select
                      value={stat.status === 'batting' ? 'not out' : (stat.outHow || 'out')}
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        const val = e.target.value;
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          status: val === 'not out' ? 'batting' : 'out', 
                          outHow: val === 'not out' ? undefined : val 
                        };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Dismissal Type"
                      title="Select dismissal type"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 4px', borderRadius: '4px', width: '100%', fontSize: '0.7rem' }}
                    >
                      <option value="not out" style={{ background: '#FFF', color: '#000' }}>Not Out</option>
                      <option value="bowled" style={{ background: '#FFF', color: '#000' }}>Bowled</option>
                      <option value="caught" style={{ background: '#FFF', color: '#000' }}>Caught</option>
                      <option value="lbw" style={{ background: '#FFF', color: '#000' }}>LBW</option>
                      <option value="run out" style={{ background: '#FFF', color: '#000' }}>Run Out</option>
                      <option value="stumped" style={{ background: '#FFF', color: '#000' }}>Stumped</option>
                      <option value="hit wicket" style={{ background: '#FFF', color: '#000' }}>Hit Wicket</option>
                      <option value="retired" style={{ background: '#FFF', color: '#000' }}>Retired</option>
                    </select>
                  ) : (
                    <span style={{ color: stat.status === 'batting' ? '#38BDF8' : '#FFF' }}>
                      {stat.status === 'batting' ? 'not out' : (stat.outHow || 'out')}
                    </span>
                  )}
                </Td>
                <Td>
                  {isCurrentInningsEditable ? (
                    <select 
                      value={stat.fielderId || ''} 
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const newBatting = [...editState[innKey].batting];
                        const selectedId = e.target.value;
                        const selectedPlayer = bowlingSquad.find((p: any) => p.id === selectedId);
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          fielderId: selectedId, 
                          fielderName: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Select Fielder"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="">Select Fielder</option>
                      {bowlingSquad.map((p: any) => (
                        <option key={p.id} value={p.id} style={{ background: '#FFF', color: '#000' }}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ opacity: 0.8 }}>{getPlayerNameResolved(stat.fielderId, stat.fielderName)}</div>
                  )}
                </Td>
                <Td>
                  {isCurrentInningsEditable ? (
                    <select 
                      value={stat.bowlerId || ''} 
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const newBatting = [...editState[innKey].batting];
                        const selectedId = e.target.value;
                        const selectedPlayer = bowlingSquad.find((p: any) => p.id === selectedId);
                        newBatting[idx] = { 
                          ...newBatting[idx], 
                          bowlerId: selectedId, 
                          bowlerName: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Select Bowler"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="">Select Bowler</option>
                      {bowlingSquad.map((p: any) => (
                        <option key={p.id} value={p.id} style={{ background: '#FFF', color: '#000' }}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ opacity: 0.8 }}>{getPlayerNameResolved(stat.bowlerId, stat.bowlerName)}</div>
                  )}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.runs} 
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        newBatting[idx] = { ...newBatting[idx], runs: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Runs"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FAB005', padding: '4px', borderRadius: '4px', width: '40px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  ) : <span style={{ color: '#FAB005', fontWeight: 700 }}>{stat.runs}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                   {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.balls} 
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        newBatting[idx] = { ...newBatting[idx], balls: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Balls"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '40px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.8 }}
                    />
                  ) : <span style={{ opacity: 0.6 }}>{stat.balls}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.fours || 0} 
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        newBatting[idx] = { ...newBatting[idx], fours: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Fours"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.7rem', opacity: 0.6 }}
                    />
                  ) : <span style={{ opacity: 0.6 }}>{stat.fours || 0}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.sixes || 0} 
                      onChange={(e) => {
                                const newBatting = [...editState[innKey].batting];
                        newBatting[idx] = { ...newBatting[idx], sixes: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      aria-label="Sixes"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.7rem', opacity: 0.6 }}
                    />
                  ) : <span style={{ opacity: 0.6 }}>{stat.sixes || 0}</span>}
                </Td>
                <Td style={{ textAlign: 'right' }}>
                  {isCurrentInningsEditable ? (
                    <IconButton 
                      onClick={() => {
                        const newBatting = editState[innKey].batting.filter((_: any, i: number) => i !== idx);
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], batting: newBatting } });
                      }}
                      style={{ color: '#ef4444', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  ) : (
                    <span style={{ opacity: 0.8 }}>
                      {stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0'}
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </ScoreCardTable>

        <ExtrasRow>
          <span style={{ opacity: 0.5, fontWeight: 700, textTransform: 'uppercase' }}>EXTRAS</span>
          {isCurrentInningsEditable ? (
             <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
               {/* Read-only auto-calculated extras */}
               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>WD</span>
                 <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                   {data.extras?.wides || data.extras?.wide || 0}
                 </span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>NB</span>
                 <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                   {data.extras?.noBalls || data.extras?.noBall || 0}
                 </span>
               </div>
               {/* Manual input extras */}
               {['bye', 'legBye'].map(exKey => (
                 <div key={exKey} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{exKey === 'bye' ? 'BYE' : 'LB'}</span>
                   <input 
                     type="number"
                     value={(data.extras as any)[exKey] || 0}
                     onChange={(e) => {
                        const newExtras = { ...editState[innKey].extras, [exKey]: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], extras: newExtras } });
                     }}
                     aria-label={`Extra ${exKey}`}
                     style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '2px 4px', borderRadius: '4px', width: '30px', fontSize: '0.7rem' }}
                   />
                 </div>
               ))}
               <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
                 <div style={{ textAlign: 'right' }}>
                   <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800 }}>TEAM TOTAL</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#38BDF8' }}>
                      {editState && editState[innKey].batting.reduce((s: number, b: any) => s + (Number(b.runs) || 0), 0) + 
                       Object.values(editState[innKey].extras).reduce((s: number, e: any) => s + (Number(e) || 0), 0)}
                    </div>
                 </div>
                 <button 
                   onClick={handleSave}
                   disabled={isSaving}
                   style={{ 
                     background: 'linear-gradient(135deg, #3B82F6, #2563EB)', 
                     color: '#FFF', 
                     padding: '8px 24px', 
                     borderRadius: '12px', 
                     fontWeight: 900, 
                     fontSize: '0.8rem', 
                     cursor: isSaving ? 'wait' : 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     gap: 8,
                     opacity: isSaving ? 0.7 : 1,
                     boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                   }}
                 >
                   {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                   {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                 </button>
               </div>
             </div>
          ) : (
            <span style={{ fontWeight: 900 }}>
              {Object.values(data.extras || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0)}{' '}
              <span style={{ opacity: 0.4, fontSize: '0.65rem', marginLeft: 4 }}>
                (wd {data.extras?.wides ?? 0}, nb {data.extras?.noBalls ?? 0}, b {data.extras?.byes ?? 0}, lb {data.extras?.legByes ?? 0})
              </span>
            </span>
          )}
        </ExtrasRow>

        {!isCurrentInningsEditable && fowData.length > 0 && (
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>Fall of Wickets</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {fowData.map((f: any) => (
                <div key={f.wicket} style={{ fontSize: '0.75rem' }}>
                  <span style={{ fontWeight: 800, color: '#38BDF8' }}>{f.runs}-{f.wicket}</span>
                  <span style={{ opacity: 0.5, marginLeft: '4px' }}>({f.batterName}, {f.overs} ov)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Did Not Bat Section */}
        {(() => {
          const battingIds = new Set((data.batting || []).map((b: any) => b.playerId).filter(Boolean));
          const didNotBat = battingSquad.filter((p: any) => p.id && !battingIds.has(p.id));
          if (didNotBat.length === 0) return null;
          return (
            <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.4, marginBottom: '6px', textTransform: 'uppercase' }}>Did Not Bat</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {didNotBat.map((p: any, i: number) => (
                  <span key={p.id}>{p.name}{i < didNotBat.length - 1 ? ',' : ''}</span>
                ))}
              </div>
            </div>
          );
        })()}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '12px' }}>
          <TableTitle style={{ marginBottom: 0 }}><Target size={14} /> BOWLING</TableTitle>
          {isCurrentInningsEditable && (
            <button
              onClick={() => {
                const newBowling = [...editState[innKey].bowling, {
                  playerId: `new-bowler-${Date.now()}`,
                  name: '',
                  overs: 0,
                  maidens: 0,
                  runs: 0,
                  wickets: 0,
                  wides: 0,
                  noBalls: 0,
                  index: editState[innKey].bowling.length
                }];
                setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
              }}
              style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <Plus size={12} style={{ display: 'inline', marginRight: 4 }} /> ADD BOWLER
            </button>
          )}
        </div>

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
               <Th style={{ textAlign: 'right' }}>{isCurrentInningsEditable ? 'Action' : 'Econ'}</Th>
            </tr>
          </thead>
          <tbody>
            {(data.bowling || []).map((stat: any, idx: number) => (
              <tr key={stat.playerId || idx}>
                <Td>
                  {isCurrentInningsEditable ? (
                    <select 
                      value={stat.playerId || ''} 
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const newBowling = [...editState[innKey].bowling];
                        
                        // Prevent duplicates
                        if (selectedId && newBowling.some((b, i) => i !== idx && String(b.playerId) === String(selectedId))) {
                          alert("This bowler is already in the bowling list!");
                          return;
                        }

                        const selectedPlayer = bowlingSquad.find((p: any) => p.id === selectedId);
                        newBowling[idx] = { 
                          ...newBowling[idx], 
                          playerId: selectedId,
                          name: selectedPlayer?.name || '' 
                        };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Select Bowler"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px 8px', borderRadius: '4px', width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="">Select Bowler</option>
                      {bowlingSquad.map((p: any) => (
                        <option key={p.id} value={p.id} style={{ background: '#FFF', color: '#000' }}>{p.name}</option>
                      ))}
                    </select>
                  ) : (
                    getPlayerNameResolved(stat.playerId, stat.name)
                  )}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number" step="0.1"
                      value={stat.overs} 
                      onChange={(e) => {
                        const newBowling = [...editState[innKey].bowling];
                        newBowling[idx] = { ...newBowling[idx], overs: parseFloat(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Overs"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '40px', textAlign: 'center', fontSize: '0.8rem' }}
                    />
                  ) : stat.overs}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.maidens || 0} 
                      onChange={(e) => {
                        const newBowling = [...editState[innKey].bowling];
                        newBowling[idx] = { ...newBowling[idx], maidens: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Maidens"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.6 }}
                    />
                  ) : <span style={{ opacity: 0.6 }}>{stat.maidens}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.runs} 
                      onChange={(e) => {
                                const newBowling = [...editState[innKey].bowling];
                        newBowling[idx] = { ...newBowling[idx], runs: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Runs Conceded"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '40px', textAlign: 'center', fontSize: '0.8rem' }}
                    />
                  ) : stat.runs}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                  {isCurrentInningsEditable ? (
                    <input 
                      type="number"
                      value={stat.wickets} 
                      onChange={(e) => {
                                const newBowling = [...editState[innKey].bowling];
                        newBowling[idx] = { ...newBowling[idx], wickets: parseInt(e.target.value) || 0 };
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      aria-label="Wickets"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#38BDF8', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700 }}
                    />
                  ) : <span style={{ color: '#38BDF8', fontWeight: 700 }}>{stat.wickets}</span>}
                </Td>
                <Td style={{ textAlign: 'center' }}>
                   {isCurrentInningsEditable ? (
                     <input 
                       type="number"
                       value={stat.wides || 0} 
                       onChange={(e) => {
                                  const newBowling = [...editState[innKey].bowling];
                         newBowling[idx] = { ...newBowling[idx], wides: parseInt(e.target.value) || 0 };
                         
                         // Auto-calculate team extras for wides
                         const totalWides = newBowling.reduce((sum: number, b: any) => sum + (b.wides || 0), 0);
                         const newExtras = { ...editState[innKey].extras, wide: totalWides, wides: totalWides };
                         
                         setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling, extras: newExtras } });
                       }}
                       aria-label="Wides"
                       style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.6 }}
                     />
                   ) : <span style={{ opacity: 0.6 }}>{stat.wides || 0}</span>}
                 </Td>
                 <Td style={{ textAlign: 'center' }}>
                   {isCurrentInningsEditable ? (
                     <input 
                       type="number"
                       value={stat.noBalls || 0} 
                       onChange={(e) => {
                                  const newBowling = [...editState[innKey].bowling];
                         newBowling[idx] = { ...newBowling[idx], noBalls: parseInt(e.target.value) || 0 };
                         
                         // Auto-calculate team extras for no balls
                         const totalNoBalls = newBowling.reduce((sum: number, b: any) => sum + (b.noBalls || 0), 0);
                         const newExtras = { ...editState[innKey].extras, noBall: totalNoBalls, noBalls: totalNoBalls };
                         
                         setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling, extras: newExtras } });
                       }}
                       aria-label="No Balls"
                       style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', padding: '4px', borderRadius: '4px', width: '30px', textAlign: 'center', fontSize: '0.8rem', opacity: 0.6 }}
                     />
                   ) : <span style={{ opacity: 0.6 }}>{stat.noBalls || 0}</span>}
                 </Td>
                <Td style={{ textAlign: 'right' }}>
                  {isCurrentInningsEditable ? (
                    <IconButton 
                      onClick={() => {
                                const newBowling = editState[innKey].bowling.filter((_: any, i: number) => i !== idx);
                        setEditState({ ...editState, [innKey]: { ...editState[innKey], bowling: newBowling } });
                      }}
                      style={{ color: '#ef4444', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  ) : (
                    <span style={{ opacity: 0.8 }}>
                      {stat.overs > 0 ? (stat.runs / stat.overs).toFixed(2) : '0.00'}
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 800 }}>
              <Td style={{ fontSize: '0.7rem', opacity: 0.6 }}>TOTAL</Td>
              <Td style={{ textAlign: 'center' }}>
                {(() => {
                  const totalBalls = (data.bowling || []).reduce((s: number, b: any) => {
                    const parts = String(b.overs || 0).split('.');
                    return s + (parseInt(parts[0]) * 6) + (parseInt(parts[1]) || 0);
                  }, 0);
                  return `${Math.floor(totalBalls / 6)}.${totalBalls % 6}`;
                })()}
              </Td>
              <Td style={{ textAlign: 'center' }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.maidens) || 0), 0)}</Td>
              <Td style={{ textAlign: 'center' }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.runs) || 0), 0)}</Td>
              <Td style={{ textAlign: 'center', color: '#38BDF8' }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.wickets) || 0), 0)}</Td>
              <Td style={{ textAlign: 'center', opacity: 0.6 }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.wides) || 0), 0)}</Td>
              <Td style={{ textAlign: 'center', opacity: 0.6 }}>{(data.bowling || []).reduce((s: number, b: any) => s + (Number(b.noBalls) || 0), 0)}</Td>
              <Td></Td>
            </tr>
          </tfoot>
        </ScoreCardTable>
      </div>
    );
  };


  // Real-time data subscription
  const storeMatches = useMatchCenter(state => state.matches);
  const liveMatch = storeMatches.find(m => m.id === initialMatch.id);
  const match = isLive && liveMatch ? liveMatch : initialMatch;

  // Helper: Normalize data from different formats
  const normalizedData = useMemo(() => {
    const transform = (inn: any, innNo: number): Innings | null => {
      if (!inn || (!inn.battingStats && !inn.batting && !inn.bowlingStats && !inn.bowling && !inn.extras && !inn.history)) return null;

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
          const noBalls = bBalls.filter((b: any) => b.isNoBall || b.type === 'no-ball').length;

          return {
            playerId: bowlerId,
            name: bBalls[0].bowlerName || bBalls[0].bowler_name || 'Bowler',
            overs: oversNum,
            maidens: 0,
            runs,
            wickets,
            wides,
            noBalls,
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
          noBalls: stat.noBalls || 0,
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
          noBalls: b.noBalls || 0,
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
        history: (inn.history || []).map((b: any) => ({ ...b, innings: innNo })),
        battingTeamId: inn.battingTeamId || inn.batting_team_id || (innNo === 1 
          ? (normalizedMatch.isHomeBattingFirst ? normalizedMatch.homeTeamId : normalizedMatch.opponentId)
          : (normalizedMatch.isHomeBattingFirst ? normalizedMatch.opponentId : normalizedMatch.homeTeamId))
      };
    };

    const ld = isLive && match.liveData ? (typeof match.liveData === 'string' ? JSON.parse(match.liveData) : match.liveData) : null;
    const source = ld || match.scorecard || {};

    return {
      innings1: transform(source.innings1, 1),
      innings2: transform(source.innings2, 2)
    };
  }, [match, isLive, normalizedMatch]);

  useEffect(() => {
    if (isEditable && !editState) {
      setEditState({
        venue: initialMatch.venue || match.venue || '',
        matchFormat: initialMatch.matchFormat || match.matchFormat || 'T20',
        maxOvers: initialMatch.maxOvers || match.maxOvers || 20,
        toss: initialMatch.toss || match.toss || { winnerId: '', decision: 'bat' },
        innings1: normalizedData.innings1 || {
          batting: [],
          bowling: [],
          extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
          totalRuns: 0,
          wickets: 0,
          totalBalls: 0
        },
        innings2: normalizedData.innings2 || {
          batting: [],
          bowling: [],
          extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, penalty: 0 },
          totalRuns: 0,
          wickets: 0,
          totalBalls: 0
        }
      });
    }
  }, [isEditable, editState, normalizedData, initialMatch, match]);


  // Capture functionality
  const downloadScorecard = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        quality: 0.95,
        backgroundColor: '#0F172A',
        style: {
          transform: 'scale(1)',
          borderRadius: '0'
        }
      });
      const link = document.createElement('a');
      link.download = `scorecard-${match.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error capturing scorecard:', err);
    }
  };

  const getTeamName = (teamId: string | undefined | null) => {
    if (!teamId) return 'Team';
    const hId = String(normalizedMatch.homeTeamId);
    const oId = String(normalizedMatch.opponentId);
    const targetId = String(teamId);
    
    if (targetId === hId) return normalizedMatch.homeTeamName;
    if (targetId === oId) return normalizedMatch.opponentName;
    
    // Fallback for special identifiers
    if (targetId === 'home' || targetId === '00000000-0000-0000-0000-000000000000') return normalizedMatch.homeTeamName;
    if (targetId === 'away' || targetId === 'opponent') return normalizedMatch.opponentName;
    
    return normalizedMatch.opponentName; // Default to opponent if no match
  };

  const getTeamLogo = (teamId: string | undefined | null) => {
    const targetId = String(teamId);
    if (targetId === String(normalizedMatch.homeTeamId)) return normalizedMatch.homeTeamLogo;
    return normalizedMatch.opponentLogo;
  };

  const renderMatchInfo = () => {
    const homeXI = normalizedMatch.homeTeamXI || [];
    const awayXI = normalizedMatch.opponentTeamXI || [];
    
    const resolvePlayer = (id: any, isHome: boolean) => {
      const pool = isHome ? players : opponents.flatMap((o: any) => o.players || []);
      return pool.find((p: any) => String(p.id) === String(id));
    };

    return (
      <div style={{ padding: '0 4px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#38BDF8' }}>
              <Shield size={16} />
              <div style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1 }}>{normalizedMatch.homeTeamName} XI</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {homeXI.length > 0 ? homeXI.map((id: any) => {
                const p = resolvePlayer(id, true);
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                      {p?.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{p?.name || 'Unknown Player'}</div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase' }}>{p?.role || 'All-Rounder'}</div>
                    </div>
                  </div>
                );
              }) : <div style={{ opacity: 0.4, fontSize: '0.75rem' }}>Squad not announced</div>}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#F43F5E' }}>
              <Users size={16} />
              <div style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1 }}>{normalizedMatch.opponentName} XI</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {awayXI.length > 0 ? awayXI.map((id: any) => {
                const p = resolvePlayer(id, false);
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>
                      {p?.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{p?.name || 'Unknown Player'}</div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.5, textTransform: 'uppercase' }}>{p?.role || 'All-Rounder'}</div>
                    </div>
                  </div>
                );
              }) : <div style={{ opacity: 0.4, fontSize: '0.75rem' }}>Squad not announced</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCommentaryTab = () => {
    const history1 = normalizedData.innings1?.history || [];
    const history2 = normalizedData.innings2?.history || [];
    
    const allHistory = [...history1, ...history2].sort((a, b) => {
      if (a.innings !== b.innings) return (b.innings || 0) - (a.innings || 0);
      const aVal = (a.overNumber ?? a.over_no ?? 0) * 6 + (a.ballNumber ?? a.ball_no ?? 0);
      const bVal = (b.overNumber ?? b.over_no ?? 0) * 6 + (b.ballNumber ?? b.ball_no ?? 0);
      return bVal - aVal;
    });

    if (allHistory.length === 0) return <div style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>No commentary available for this match yet.</div>;

    // Helper to get enriched stats at a specific point
    const getStatsAtBall = (targetBall: any) => {
      const hist = targetBall.innings === 1 ? history1 : history2;
      const index = hist.indexOf(targetBall);
      const ballsUntilNow = hist.slice(0, index + 1);
      
      const batsman = targetBall.strikerId;
      const bStats = ballsUntilNow.filter(b => b.strikerId === batsman);
      const bRuns = bStats.reduce((s, b) => s + (b.runs || 0), 0);
      const bBalls = bStats.filter(b => b.type !== 'wide').length;

      const bowler = targetBall.bowlerId;
      const bwlStats = ballsUntilNow.filter(b => b.bowlerId === bowler);
      const bwlRuns = bwlStats.reduce((s, b) => s + (b.runs || 0) + (b.extraRuns || 0), 0);
      const bwlLegalBalls = bwlStats.filter(b => b.isLegal).length;
      const bwlWickets = bwlStats.filter(b => b.isWicket && !['Run Out', 'Retired Hurt'].includes(b.wicketType)).length;

      return { bRuns, bBalls, bwlRuns, bwlWickets, bwlOvers: `${Math.floor(bwlLegalBalls/6)}.${bwlLegalBalls%6}` };
    };

    const groupedOvers: { overNo: number; balls: any[]; innings: number }[] = [];
    let currentGroup: any = null;

    allHistory.forEach((ball: any) => {
      const bOver = ball.overNumber ?? ball.over_no ?? 0;
      const bBall = ball.ballNumber ?? ball.ball_no ?? 1;
      const overNo = Math.floor(ball.overs ?? (bOver + (bBall - 1) / 6));
      const ballInnings = ball.innings || 1;
      
      if (!currentGroup || currentGroup.overNo !== overNo || currentGroup.innings !== ballInnings) {
        currentGroup = { overNo, balls: [], innings: ballInnings };
        groupedOvers.push(currentGroup);
      }
      currentGroup.balls.push(ball);
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: '0 4px' }}>
        {/* Signing Off / Result Summary */}
        {initialMatch.status === 'completed' && (
          <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: 20, borderRadius: 16, border: '1px solid rgba(56, 189, 248, 0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#38BDF8', letterSpacing: 2, marginBottom: 8 }}>MATCH CONCLUDED</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', marginBottom: 12 }}>{initialMatch.matchResult}</div>
            {initialMatch.manOfTheMatch && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                <Star size={14} style={{ color: '#F59E0B' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>POTM: {initialMatch.manOfTheMatch}</span>
              </div>
            )}
          </div>
        )}

        {groupedOvers.map((group, gIdx) => {
          const lastBall = group.balls[0]; // balls are in reverse order
          const firstBall = group.balls[group.balls.length - 1];
          const stats = getStatsAtBall(lastBall);
          const bowlerName = lastBall.bowlerName || getPlayerNameResolved(lastBall.bowlerId);
          
          // Get striker/non-striker for the header
          const striker = lastBall.strikerId;
          const nonStriker = lastBall.nonStrikerId;
          const sName = getPlayerNameResolved(striker);
          const nsName = getPlayerNameResolved(nonStriker);

          return (
            <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Over Intro */}
              <div style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.4, fontStyle: 'italic', paddingLeft: 56 }}>
                {bowlerName} comes into the attack.
              </div>

              {/* Over Header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: 2 }}>Over {group.overNo + 1}</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.4 }}>{getTeamName(group.innings === 1 ? normalizedData.innings1?.battingTeamId : normalizedData.innings2?.battingTeamId)}</div>
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#FFF' }}>{bowlerName}</div>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#38BDF8' }}>{stats.bwlWickets}-{stats.bwlRuns} ({stats.bwlOvers})</div>
                  </div>
                </div>
                <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800 }}>
                  <span style={{ opacity: 0.6 }}>{sName}* & {nsName}</span>
                  <span style={{ color: '#38BDF8' }}>END OF OVER</span>
                </div>
              </div>

              {/* Balls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.balls.map((ball: any, bIdx: number) => {
                  const ballStats = getStatsAtBall(ball);
                  const isWicket = ball.isWicket || ball.is_wicket;
                  const isBoundary = ball.runs === 4 || ball.runs === 6;
                  const bOver = ball.overNumber ?? ball.over_no ?? 0;
                  const bBall = ball.ballNumber ?? ball.ball_no ?? 1;
                  
                  return (
                    <div key={bIdx} style={{ display: 'flex', gap: 16, padding: '14px', background: isWicket ? 'rgba(244, 63, 94, 0.05)' : (isBoundary ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.01)'), borderRadius: 16, border: '1px solid rgba(255,255,255,0.03)', position: 'relative' }}>
                      <div style={{ minWidth: 40, textAlign: 'center', paddingTop: 4 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: isWicket ? '#F43F5E' : '#38BDF8' }}>{bOver}.{bBall}</div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, background: isWicket ? '#F43F5E' : (ball.runs === 6 ? '#A855F7' : (ball.runs === 4 ? '#38BDF8' : 'rgba(255,255,255,0.08)')), color: '#FFF' }}>
                          {isWicket ? 'W' : (ball.isWide ? 'WD' : (ball.isNoBall ? 'NB' : ball.runs))}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FFF', lineHeight: 1.4 }}>{ball.commentary}</div>
                          {isWicket && (
                            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: 8, borderLeft: '3px solid #F43F5E' }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#FFF' }}>{getPlayerNameResolved(ball.strikerId)} OUT</div>
                              <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.6 }}>{ballStats.bRuns} ({ballStats.bBalls} balls) • {ball.wicketType}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Match Start / Toss / XI */}
              {group.innings === 1 && group.overNo === 0 && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', marginTop: 20 }}>
                   <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#38BDF8', letterSpacing: 2, marginBottom: 12 }}>MATCH START</div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <Zap size={16} style={{ color: '#F59E0B' }} />
                      <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{initialMatch.toss?.winner || 'Toss'} won and chose to {initialMatch.toss?.choice || 'Bat'} first.</div>
                   </div>
                   <div style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Opening Batsmen</div>
                   <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#FFF' }}>{getPlayerNameResolved(firstBall.strikerId)} & {getPlayerNameResolved(firstBall.nonStrikerId)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderAnalytics = () => {
    const getChartData = (inn: Innings | null) => {
      if (!inn || !inn.history) return [];
      let total = 0;
      return (inn.history || []).map((ball: any, i: number) => {
        total += (ball.runs || 0) + (ball.extraRuns || ball.extras || 0);
        return {
          over: Math.floor(i / 6) + 1,
          runs: total
        };
      }).filter((_: any, i: number) => (i + 1) % 6 === 0);
    };

    const getManhattanData = (inn: Innings | null) => {
      if (!inn || !inn.history) return [];
      const overDataMap = new Map<number, { runs: number; wickets: number }>();
      
      inn.history.forEach((ball: any) => {
        const bOver = ball.overNumber ?? ball.over_no ?? 0;
        const runs = (ball.runs || 0) + (ball.extraRuns || ball.extras || 0);
        const isWicket = ball.isWicket || ball.is_wicket;
        
        const existing = overDataMap.get(bOver) || { runs: 0, wickets: 0 };
        existing.runs += runs;
        if (isWicket) existing.wickets += 1;
        overDataMap.set(bOver, existing);
      });

      return Array.from(overDataMap.entries()).map(([over, data]) => ({
        over: over + 1,
        runs: data.runs,
        wickets: data.wickets
      })).sort((a, b) => a.over - b.over);
    };

    const data1 = getChartData(normalizedData.innings1);
    const data2 = getChartData(normalizedData.innings2);
    
    const manhattan1 = getManhattanData(normalizedData.innings1);
    const manhattan2 = getManhattanData(normalizedData.innings2);
    
    const combinedData = Array.from({ length: Math.max(data1.length, data2.length) }).map((_, i) => ({
      over: i + 1,
      inn1: data1[i]?.runs,
      inn2: data2[i]?.runs
    }));

    const combinedManhattan = Array.from({ length: Math.max(manhattan1.length, manhattan2.length) }).map((_, i) => ({
      over: i + 1,
      runs1: manhattan1[i]?.runs || 0,
      wickets1: manhattan1[i]?.wickets || 0,
      runs2: manhattan2[i]?.runs || 0,
      wickets2: manhattan2[i]?.wickets || 0
    }));

    const WicketLabel = (props: any) => {
      const { x, y, width, value } = props;
      if (!value || value <= 0) return null;
      return (
        <g>
          {Array.from({ length: value }).map((_, i) => (
            <circle 
              key={i}
              cx={x + width / 2} 
              cy={y - 8 - (i * 10)} 
              r={4} 
              fill="#F43F5E" 
              stroke="#0F172A"
              strokeWidth={1}
            />
          ))}
        </g>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Manhattan Chart */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <TableTitle style={{ margin: 0 }}><BarChart2 size={16} /> Manhattan Chart (Runs per Over)</TableTitle>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.7rem', fontWeight: 800 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, background: '#38BDF8', borderRadius: '50%' }} /> {getTeamName(normalizedData.innings1?.battingTeamId)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, background: '#F43F5E', borderRadius: '50%' }} /> {getTeamName(normalizedData.innings2?.battingTeamId)}</div>
            </div>
          </div>
          
          <div style={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={combinedManhattan} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="over" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: '0.8rem', fontWeight: 800 }}
                  itemStyle={{ color: '#FFF' }}
                />
                <Bar dataKey="runs1" name={getTeamName(normalizedData.innings1?.battingTeamId)} fill="#38BDF8" radius={[4, 4, 0, 0]} barSize={20}>
                  <LabelList dataKey="wickets1" content={<WicketLabel />} />
                </Bar>
                <Bar dataKey="runs2" name={getTeamName(normalizedData.innings2?.battingTeamId)} fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={20}>
                  <LabelList dataKey="wickets2" content={<WicketLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 12 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.65rem', fontWeight: 800, opacity: 0.6 }}>
                <div style={{ width: 8, height: 8, background: '#F43F5E', borderRadius: '50%' }} /> WICKET
             </div>
          </div>
        </div>

        {/* Run Rate Comparison Chart */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <TableTitle style={{ margin: 0 }}><BarChart2 size={16} /> Worm Chart (Accumulated Runs)</TableTitle>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.7rem', fontWeight: 800 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, background: '#38BDF8', borderRadius: '50%' }} /> {getTeamName(normalizedData.innings1?.battingTeamId)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 8, height: 8, background: '#F43F5E', borderRadius: '50%' }} /> {getTeamName(normalizedData.innings2?.battingTeamId)}</div>
            </div>
          </div>
          
          <div style={{ height: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedData}>
                <XAxis dataKey="over" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Overs', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'Runs', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: '0.8rem', fontWeight: 800 }}
                  itemStyle={{ color: '#FFF' }}
                />
                <Line type="monotone" dataKey="inn1" name={getTeamName(normalizedData.innings1?.battingTeamId)} stroke="#38BDF8" strokeWidth={3} dot={{ fill: '#38BDF8', r: 4 }} activeDot={{ r: 6 }} connectNulls />
                <Line type="monotone" dataKey="inn2" name={getTeamName(normalizedData.innings2?.battingTeamId)} stroke="#F43F5E" strokeWidth={3} dot={{ fill: '#F43F5E', r: 4 }} activeDot={{ r: 6 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
            <TableTitle style={{ fontSize: '0.75rem' }}><Target size={14} /> Boundaries</TableTitle>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38BDF8' }}>
                  {(normalizedData.innings1?.batting || []).reduce((s, b) => s + (b.fours || 0), 0) + (normalizedData.innings2?.batting || []).reduce((s, b) => s + (b.fours || 0), 0)}
                </div>
                <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800 }}>FOURS</div>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>
                  {(normalizedData.innings1?.batting || []).reduce((s, b) => s + (b.sixes || 0), 0) + (normalizedData.innings2?.batting || []).reduce((s, b) => s + (b.sixes || 0), 0)}
                </div>
                <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 800 }}>SIXES</div>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
            <TableTitle style={{ fontSize: '0.75rem' }}><Zap size={14} /> Run Rates</TableTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}>{getTeamName(normalizedData.innings1?.battingTeamId)}</span>
                <span style={{ fontWeight: 900, color: '#38BDF8' }}>
                  {normalizedData.innings1?.totalBalls ? ((normalizedData.innings1.totalRuns / normalizedData.innings1.totalBalls) * 6).toFixed(2) : '0.00'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}>{getTeamName(normalizedData.innings2?.battingTeamId)}</span>
                <span style={{ fontWeight: 900, color: '#F43F5E' }}>
                  {normalizedData.innings2?.totalBalls ? ((normalizedData.innings2.totalRuns / normalizedData.innings2.totalBalls) * 6).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring Distribution Table */}
        {(() => {
          const getRunDistribution = (inn: Innings | null) => {
            const dist: any = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 6: 0 };
            if (!inn || !inn.history) return dist;
            inn.history.forEach((ball: any) => {
              const runs = ball.runs || 0;
              const isExtra = ball.isWide || ball.isNoBall || ball.type === 'wide' || ball.type === 'no-ball';
              if (runs === 0 && !isExtra) dist[0]++;
              else if (runs === 1) dist[1]++;
              else if (runs === 2) dist[2]++;
              else if (runs === 3) dist[3]++;
              else if (runs === 4) dist[4]++;
              else if (runs === 6) dist[6]++;
            });
            return dist;
          };

          const dist1 = getRunDistribution(normalizedData.innings1);
          const dist2 = getRunDistribution(normalizedData.innings2);
          const team1 = getTeamName(normalizedData.innings1?.battingTeamId);
          const team2 = getTeamName(normalizedData.innings2?.battingTeamId);

          return (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
              <TableTitle><Target size={16} /> Scoring Distribution</TableTitle>
              <ScoreCardTable style={{ marginBottom: 0 }}>
                <thead>
                  <tr>
                    <Th>Run Type</Th>
                    <Th style={{ textAlign: 'center' }}>{team1}</Th>
                    <Th style={{ textAlign: 'center' }}>{team2}</Th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4, 6].map(val => (
                    <tr key={val}>
                      <Td style={{ opacity: 0.7, fontSize: '0.75rem' }}>
                        {val === 0 ? 'Dot Balls (0s)' : `${val}s`}
                      </Td>
                      <Td style={{ textAlign: 'center', color: '#38BDF8', fontWeight: 900, fontSize: '0.9rem' }}>
                        {dist1[val]}
                      </Td>
                      <Td style={{ textAlign: 'center', color: '#F43F5E', fontWeight: 900, fontSize: '0.9rem' }}>
                        {dist2[val]}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </ScoreCardTable>
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <PremiumModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <PremiumModalContent ref={containerRef}>
        <ModalHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconButton onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', color: '#FFF' }}>
              <ChevronLeft size={18} />
            </IconButton>
            <div style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>
              Match Center
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <IconButton onClick={downloadScorecard} style={{ background: 'rgba(255,255,255,0.05)', color: '#FFF' }}>
              <Share2 size={16} />
            </IconButton>
            <IconButton onClick={onClose} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <X size={16} />
            </IconButton>
          </div>
        </ModalHeader>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 20 }}
              exit={{ opacity: 0, y: -50 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 20,
                zIndex: 6000,
                background: '#10B981',
                color: '#FFF',
                padding: '12px 24px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
                fontWeight: 800
              }}
            >
              <CheckCircle2 size={20} />
              Scorecard Saved Successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <ScrollContent ref={scrollContentRef}>
          <MatchHeaderCard>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 6, 
                background: 'rgba(16, 185, 129, 0.1)', 
                border: '1px solid rgba(16, 185, 129, 0.3)', 
                color: '#10B981', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '0.6rem', 
                fontWeight: 900, 
                textTransform: 'uppercase', 
                letterSpacing: 1.5,
                marginBottom: 12
              }}>
                <CheckCircle2 size={10} />
                System Sync: Active
              </div>
              <TournamentLabel>{initialMatch.tournament || 'Match Details'}</TournamentLabel>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 }}>
                {initialMatch.stage ? `${initialMatch.stage} MATCH` : 'MATCH DETAILS'}
              </div>
            </div>
            
            <TeamsHorizontalRow>
              <TeamBlock>
                <TeamLogoFrame>
                  <img 
                    src={normalizedMatch.homeTeamLogo} 
                    alt="Home" 
                    style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                  />
                </TeamLogoFrame>
                <TeamInfo>
                  <TeamNameLabel>{normalizedMatch.homeTeamName}</TeamNameLabel>
                  <ScoreValue>
                    {normalizedData.innings1?.battingTeamId === normalizedMatch.homeTeamId ? (
                      <>
                        {normalizedData.innings1?.totalRuns}
                        <span>/{normalizedData.innings1?.wickets}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 8 }}>
                          ({formatOvers(normalizedData.innings1?.totalBalls || 0)})
                        </div>
                      </>
                    ) : normalizedData.innings2?.battingTeamId === normalizedMatch.homeTeamId ? (
                      <>
                        {normalizedData.innings2?.totalRuns}
                        <span>/{normalizedData.innings2?.wickets}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 8 }}>
                          ({formatOvers(normalizedData.innings2?.totalBalls || 0)})
                        </div>
                      </>
                    ) : '-'}
                  </ScoreValue>
                </TeamInfo>
              </TeamBlock>

              <VSBadgeHeader>VS</VSBadgeHeader>

              <TeamBlock $reverse>
                <TeamLogoFrame>
                  <img 
                    src={normalizedMatch.opponentLogo} 
                    alt="Away" 
                    style={{ width: '80%', height: '80%', objectFit: 'contain' }} 
                  />
                </TeamLogoFrame>
                <TeamInfo $align="right">
                  <TeamNameLabel>{normalizedMatch.opponentName}</TeamNameLabel>
                  <ScoreValue>
                    {normalizedData.innings1?.battingTeamId === normalizedMatch.opponentId ? (
                      <>
                        {normalizedData.innings1?.totalRuns}
                        <span>/{normalizedData.innings1?.wickets}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 8 }}>
                          ({formatOvers(normalizedData.innings1?.totalBalls || 0)})
                        </div>
                      </>
                    ) : normalizedData.innings2?.battingTeamId === initialMatch.opponentId ? (
                      <>
                        {normalizedData.innings2?.totalRuns}
                        <span>/{normalizedData.innings2?.wickets}</span>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: 8 }}>
                          ({formatOvers(normalizedData.innings2?.totalBalls || 0)})
                        </div>
                      </>
                    ) : '-'}
                  </ScoreValue>
                </TeamInfo>
              </TeamBlock>
            </TeamsHorizontalRow>

            <ResultHighlightBar>
              {match.status === 'live' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}
                  />
                  LIVE MATCH
                </div>
              ) : match.matchResult || 'Match in progress'}
            </ResultHighlightBar>

            {/* Match Info Bar - Single Line */}
            <div style={{ 
              display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', 
              marginTop: 20, padding: '12px', background: 'rgba(255,255,255,0.03)', 
              borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={12} style={{ color: '#38BDF8' }} />
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {grounds.find((g: any) => g.id === normalizedMatch.groundId)?.name || normalizedMatch.venue || 'TBD'}
                </div>
              </div>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={12} style={{ color: '#38BDF8' }} />
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {normalizedMatch.date ? new Date(normalizedMatch.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                </div>
              </div>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={12} style={{ color: '#38BDF8' }} />
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {normalizedMatch.tossWinnerId ? `${getTeamName(normalizedMatch.tossWinnerId)} won & chose to ${normalizedMatch.tossChoice || 'Bat'}` : 'Toss Result'}
                </div>
              </div>
            </div>
          </MatchHeaderCard>

          <TabContainer>
            <TabButton $active={tab === 'scorecard'} onClick={() => setTab('scorecard')}>Scorecard</TabButton>
            <TabButton $active={tab === 'info'} onClick={() => setTab('info')}>Match Info</TabButton>
            <TabButton $active={tab === 'commentary'} onClick={() => setTab('commentary')}>Commentary</TabButton>
            <TabButton $active={tab === 'analytics'} onClick={() => setTab('analytics')}>Analytics</TabButton>
          </TabContainer>

          <div style={{ marginTop: 24 }}>
            {tab === 'scorecard' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <InningsAccordionHeader 
                    $active={openInnings.has(1)}
                    onClick={() => {
                      const newOpen = new Set(openInnings);
                      if (newOpen.has(1)) newOpen.delete(1);
                      else newOpen.add(1);
                      setOpenInnings(newOpen);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ background: '#38BDF8', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900 }}>1st INN</div>
                      <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{getTeamName(normalizedData.innings1?.battingTeamId)}</div>
                    </div>
                    <div style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        {normalizedData.innings1?.totalRuns}/{normalizedData.innings1?.wickets} 
                        <span style={{ opacity: 0.5, fontSize: '0.7rem', marginLeft: 8 }}>({formatOvers(normalizedData.innings1?.totalBalls || 0)})</span>
                      </div>
                      <ChevronDown size={16} style={{ transform: openInnings.has(1) ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', opacity: 0.5 }} />
                    </div>
                  </InningsAccordionHeader>
                  {openInnings.has(1) && renderInningsTable(editState?.innings1 || normalizedData.innings1, 1)}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <InningsAccordionHeader 
                    $active={openInnings.has(2)}
                    onClick={() => {
                      const newOpen = new Set(openInnings);
                      if (newOpen.has(2)) newOpen.delete(2);
                      else newOpen.add(2);
                      setOpenInnings(newOpen);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ background: '#38BDF8', color: '#FFF', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900 }}>2nd INN</div>
                      <div style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{getTeamName(normalizedData.innings2?.battingTeamId)}</div>
                    </div>
                    <div style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div>
                        {normalizedData.innings2?.totalRuns}/{normalizedData.innings2?.wickets} 
                        <span style={{ opacity: 0.5, fontSize: '0.7rem', marginLeft: 8 }}>({formatOvers(normalizedData.innings2?.totalBalls || 0)})</span>
                      </div>
                      <ChevronDown size={16} style={{ transform: openInnings.has(2) ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', opacity: 0.5 }} />
                    </div>
                  </InningsAccordionHeader>
                  {openInnings.has(2) && renderInningsTable(editState?.innings2 || normalizedData.innings2, 2)}
                </div>
              </>
            )}

            {tab === 'info' && renderMatchInfo()}
            {tab === 'commentary' && renderCommentaryTab()}
            {tab === 'analytics' && renderAnalytics()}
          </div>
        </ScrollContent>

        <datalist id="player-names-list">
          {players.map(p => <option key={p.id} value={p.name} />)}
          {opponents.flatMap(o => o.players || []).map((p: any) => <option key={p.id} value={p.name} />)}
        </datalist>
        <FABContainer>
          <FloatingButton
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (openInnings.size > 0) setOpenInnings(new Set());
              else setOpenInnings(new Set([1, 2]));
            }}
            title={openInnings.size > 0 ? "Collapse All" : "Expand All"}
            style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}
          >
            {openInnings.size > 0 ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </FloatingButton>
          <FloatingButton
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => scrollContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}
          >
            <ArrowUp size={14} />
          </FloatingButton>
        </FABContainer>
      </PremiumModalContent>
    </PremiumModalOverlay>
  );
};
