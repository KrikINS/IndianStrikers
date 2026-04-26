import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Undo,
  Settings,
  MapPin,
  Shield,
  Plus,
  Minus,
  Users,
  X,
  User,
  Trophy,
  ChevronRight,
  RefreshCcw,
  Repeat,
  LayoutList,
  Star,
  Zap,
  PlusCircle,
  Edit3,
  Share2,
  MessageSquare,
  Mic,
  RotateCcw,
  Cloud,
  CloudLightning,
  CloudDownload,
  CloudOff,
  LineChart as ChartIcon,
  Lock as LockIcon,
  Award,
  Target,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import MatchSummaryModal from './MatchSummaryModal';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine 
} from 'recharts';
import { useStore } from '../store/StoreProvider';
import { useMatchCenter } from '../store/matchStore';
import { useTournamentStore } from '../store/tournamentStore';
import { useOpponentStore } from '../store/opponentStore';
import { useNavigate, useParams } from 'react-router-dom';
import { UniversalScorecard } from './UniversalScorecard';
import _ from 'lodash';
import { MilestoneOverlay, MilestoneOverlayRef } from './MilestoneOverlay';
import { Player, ScheduledMatch, Ball, CommentaryTemplate, BallRecord, CommentaryEventType, MatchStatus } from '../types';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';
import { getRandomCommentary } from '../data/commentary';
import { SyncStatus } from './common/SyncStatus';

const DashboardContainer = styled.div`
  height: 100dvh;
  background-color: hsla(210, 100%, 100%, 1.00);
  color: #1A1A1A;
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-bottom: 300px; // Space for fixed scoring interface
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Header = styled.header`
  background-color: #001F3F;
  color: #FFFFFF;
  padding: 4px 12px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 100;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  flex-shrink: 0;
`;

const FreeHitBadge = styled(motion.span)`
  background: #FAB005;
  color: #000;
  font-size: 10px;
  font-weight: 900;
  padding: 4px 12px;
  border-radius: 6px;
  text-transform: uppercase;
  margin-top: 12px;
  display: inline-block;
  box-shadow: 0 4px 15px rgba(250, 176, 5, 0.4);
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;

  &:hover { background: rgba(255, 255, 255, 0.1); }
  &:hover { transform: scale(1.1); }
`;

const SyncStatusPill = styled.div<{ $outOfSync: boolean }>`
  position: fixed;
  bottom: 310px; // Above the scoring interface
  right: 12px;
  background: ${props => props.$outOfSync ? 'rgba(250, 176, 5, 0.95)' : 'rgba(0, 31, 63, 0.8)'};
  backdrop-filter: blur(8px);
  color: ${props => props.$outOfSync ? '#000' : '#FFF'};
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.6rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 1000;
  border: 1px solid ${props => props.$outOfSync ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  pointer-events: none;
`;

const OverSeparator = styled.div`
  min-width: 2px;
  height: 15px;
  background: rgba(255, 255, 255, 0.2);
  margin: 6px 2px;
  display: flex;
  align-items: center;
  position: relative;
  
  &::after {
    content: 'OVER';
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.4rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 0.5px;
  }
`;

const ScoreSection = styled.div`
  background: #ffffffff;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: space-between;
  flex-shrink: 0;
  min-height: 140px;
  gap: 16px;
`;

const MainScore = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin: 2px;
  line-height: 1.1;
  color: hsla(0, 0%, 5%, 1.00);
`;

const OversText = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: hsla(0, 0%, 8%, 0.50);
`;

const ActiveParticipants = styled.div`
  padding: 2px 12px 4px;
  background: #FFFFFF;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  border-bottom: 1px solid #F1F3F5;
  flex-shrink: 0;

  @media (min-width: 768px) {
    padding: 2px 12px 8px;
    gap: 12px;
  }
`;

const PartnershipRow = styled.div`
  background: rgba(0, 31, 63, 0.03);
  border-bottom: 1px solid #F1F3F5;
  padding: 4px 12px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 24px;
  gap: 8px;
`;

const PartnershipMain = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #1A1A1A;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  b {
    font-weight: 900;
    color: #001F3F;
  }
`;

const PartnershipSub = styled.div`
  font-size: 9px;
  font-weight: 600;
  color: #6c757d;
  display: flex;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const generateDynamicCommentary = (player: string, runs: number, zone?: string, isWicket?: boolean): string => {
  const z = zone || "the gap";
  const firstName = player.split(' ')[0];
  
  if (isWicket) {
    const base = getRandomCommentary('WICKET');
    return `${base} ${firstName} is out! Trapped while trying to hit towards ${z}.`;
  }
  
  const baseFour = getRandomCommentary('FOUR');
  const baseSix = getRandomCommentary('SIX');
  const baseDot = getRandomCommentary('DOT');

  switch (runs) {
    case 6:
      return `${baseSix} ${firstName} clears the ropes at ${z} with pure power.`;
    case 4:
      return `${baseFour} ${firstName} pierces the field at ${z} for a boundary.`;
    case 1:
      return `Quick single! ${firstName} taps it into ${z} and scampers through.`;
    case 2:
      return `Good placement! ${firstName} finds the gap in ${z} and returns for the second.`;
    case 3:
      return `Excellent running from ${firstName}! He hits it deep into ${z} and they run three.`;
    case 0:
      return `${baseDot} ${firstName} looks for room in ${z} but can't find a way past.`;
    default:
      return `${firstName} scores ${runs} run(s) towards ${z}.`;
  }
};

const ParticipantCard = styled.div<{ $active?: boolean }>`
  padding: 2px 10px;
  border-radius: 8px;
  background: ${props => props.$active ? '#E7F5FF' : '#F8F9FA'};
  border: 1px solid ${props => props.$active ? '#339AF0' : '#E9ECEF'};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
`;

const NameLabel = styled.span`
  font-size: 10px;
  font-weight: 800;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  opacity: 0.6;
`;

const StatValue = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

const TimelineContainer = styled.div`
  margin: 0;
  padding: 8px 10px;
  background: #001f3f;
  border-radius: 0;
  overflow-x: auto;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 3px;
  box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
  scrollbar-width: none;
  border-bottom: none;
  flex-shrink: 0;
  &::-webkit-scrollbar { display: none; }
`;

const BallCircle = styled.div<{ $type: string }>`
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.45rem;
  font-weight: 700;
  color: white;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  background: ${props => {
    if (props.$type === 'W') return 'linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)';
    if (props.$type === '4') return 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)';
    if (props.$type === '6') return 'linear-gradient(135deg, rgba(14, 132, 100, 1) 0%, #78ffd6 100%)';
    if (props.$type.startsWith('WD') || props.$type.startsWith('NB')) return 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)';
    if (props.$type === '0') return 'rgba(255,255,255,0.05)';
    return 'rgba(255,255,255,0.15)';
  }};
`;

const ScoringInterface = styled.div`
  padding: 8px 10px 10px;
  background: #001F3F;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  border-top: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.4);
`;

const RunGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 8px;
  flex: 1;
`;

const ExtraStack = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
`;

const ScoringBtn = styled.button<{ $variant?: 'run' | 'wicket' | 'extra' | 'undo' }>`
  width: 100%;
  height: 100%;
  min-height: 44px;
  border-radius: 12px;
  border: none;
  font-size: 1.1rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.1s;
  
  &:active {
    transform: scale(0.92);
    opacity: 0.8;
  }
  
  ${props => {
    switch (props.$variant) {
      case 'wicket': return 'background: rgba(255, 77, 77, 0.15); color: #FF4D4D; border: 1px solid rgba(255, 77, 77, 0.3);';
      case 'extra': return 'background: rgba(250, 176, 5, 0.1); color: #FAB005; border: 1px solid rgba(250, 176, 5, 0.3); font-size: 0.75rem;';
      case 'undo': return 'background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.6);';
      default: return 'background: rgba(255, 255, 255, 0.05); color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.1);';
    }
  }}
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 2000;
`;

const ModalContent = styled.div`
  background: #001F3F; /* Dark Navy Blue */
  color: #FFFFFF;
  width: 100%;
  max-width: 480px;
  border-radius: 24px;
  padding: 20px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
  position: relative;

  @media (min-width: 480px) {
    padding: 32px;
  }
`;

const InningsBreakModal = styled.div`
  position: fixed;
  inset: 0;
  background: #FFFFFF;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  color: #001F3F;
  font-family: 'Inter', sans-serif;
`;

const HeroPosterWrapper = styled.div`
  width: 400px;
  height: 600px;
  background: #020617;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  font-family: 'Inter', sans-serif;
`;

const PosterContainer = styled.div`
  position: fixed;
  left: -9999px;
  top: -9999px;
`;

const SetupContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #001F3F 0%, #083358 100%);
  display: flex;
  flex-direction: column;
  color: white;
  padding: 20px;
`;

const SetupCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  margin: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
`;

const MatchTitle = styled.h2`
  text-align: center;
  font-size: 1.5rem;
  font-weight: 900;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const GroundText = styled.div`
  text-align: center;
  opacity: 0.6;
  font-size: 0.8rem;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

const TeamRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 40px 0;
  position: relative;

  &::after {
    content: 'VS';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-weight: 900;
    color: #FAB005;
    background: #001F3F;
    padding: 8px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.1);
    font-size: 12px;
  }
`;

const TeamBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 40%;
`;

const TeamLogoCircle = styled.div<{ $active?: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid ${props => props.$active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'};
  transition: all 0.3s ease;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 10px;
  }
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  border: none;
  font-weight: 800;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$variant === 'primary' ? '#38BDF8' : 'rgba(255,255,255,0.1)'};
  color: ${props => props.$variant === 'primary' ? '#001F3F' : '#FFF'};

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:active {
    transform: scale(0.98);
  }
`;

const TossOption = styled.div<{ $selected?: boolean }>`
  padding: 16px;
  background: ${props => props.$selected ? 'rgba(250, 176, 5, 0.2)' : 'rgba(255,255,255,0.05)'};
  border: 2px solid ${props => props.$selected ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 700;

  &:hover {
    background: rgba(255,255,255,0.1);
  }
`;

const SettingsSection = styled.div`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.1);
`;

const OversControl = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 12px;
`;

const ControlBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255,255,255,0.1);
    border-color: #FAB005;
  }

  &:active {
    transform: scale(0.9);
  }
`;

const PremiumModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  z-index: 2000;
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
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PlayerCard = styled.div<{ $selected?: boolean; $disabled?: boolean }>`
  padding: 12px 16px;
  background: ${props => props.$selected ? 'rgba(250, 176, 5, 0.2)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${props => props.$selected ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all 0.2s;

  &:hover {
    ${props => !props.$disabled && 'background: rgba(255,255,255,0.1);'}
  }
`;

const SelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  max-height: 400px;

  @media (min-width: 480px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    padding: 16px;
  }
`;

const StatRibbon = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
  gap: 8px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StatLabel = styled.span`
  font-size: 8px;
  opacity: 0.5;
  text-transform: uppercase;
  font-weight: 700;
`;

const StatVal = styled.span`
  font-size: 10px;
  font-weight: 800;
  color: #FAB005;
`;

const FilterChip = styled.button<{ $active?: boolean }>`
  padding: 6px 14px;
  border-radius: 20px;
  background: ${props => props.$active ? '#FAB005' : 'rgba(255,255,255,0.05)'};
  color: ${props => props.$active ? '#000' : 'rgba(255,255,255,0.6)'};
  border: 1px solid ${props => props.$active ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
`;

const SliderTrack = styled.div`
  width: 100%;
  height: 56px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 28px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 4px;
`;

const SliderHandle = styled(motion.div)`
  width: 48px;
  height: 48px;
  background: #ff4d4d;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 2;
  box-shadow: 0 4px 12px rgba(255, 77, 77, 0.4);

  &:active {
    cursor: grabbing;
  }
`;

const SliderText = styled.div`
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.3);
  pointer-events: none;
  text-transform: uppercase;
`;

const SliderProgress = styled(motion.div)`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(255, 77, 77, 0.2);
  z-index: 1;
`;

const CoinWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
  perspective: 1000px;
`;

const Coin3D = styled(motion.div)`
  width: 80px;
  height: 80px;
  position: relative;
  transform-style: preserve-3d;
`;

const CoinFace = styled.div<{ $side: 'front' | 'back' }>`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  backface-visibility: hidden;
  background-size: cover;
  background-position: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  border: 2px solid #E6A100;
  background-image: url(${props => props.$side === 'front' ? '/assets/coin/heads.png' : '/assets/coin/tails.png'});
  transform: ${props => props.$side === 'back' ? 'rotateY(180deg)' : 'none'};
`;
const ScoreCardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
  font-size: 0.8rem;
`;

const Th = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  opacity: 0.5;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.5px;
`;

const Td = styled.td`
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-weight: 600;
`;

const ScoreSummaryCard = styled.div`
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DrawerOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  z-index: 5000;
  display: flex;
  justify-content: flex-end;
`;

const DrawerContent = styled(motion.div)`
  width: 100%;
  max-width: 400px;
  height: 100%;
  background: #0d1117; /* Riyadh Nights: Dark Obsidian */
  border-left: 1px solid rgba(16, 185, 129, 0.2); /* Emerald accent */
  padding: 8px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
`;

const SettingsGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const GroupTitle = styled.h3`
  font-size: 0.45rem;
  font-weight: 900;
  color: #10b981; /* Riyadh Emerald */
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgba(16, 185, 129, 0.2), transparent);
  }
`;

const ControlButton = styled.button<{ $variant?: 'emerald' | 'gold' | 'danger' }>`
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.03);
  color: white;
  font-weight: 700;
  font-size: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.08);
    transform: translateY(-2px);
    border-color: ${props => props.$variant === 'emerald' ? '#10b981' : (props.$variant === 'gold' ? '#fbbf24' : '#ef4444')};
  }

  svg {
    color: ${props => props.$variant === 'emerald' ? '#10b981' : (props.$variant === 'gold' ? '#fbbf24' : '#ef4444')};
  }
`;

const SettingsInput = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.03);
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.05);

  label {
    font-size: 0.5rem;
    font-weight: 600;
    color: #FFF;
  }

  input {
    background: none;
    border: none;
    color: #FFF;
    font-weight: 900;
    font-size: 0.8rem;
    width: 45px;
    text-align: right;
    outline: none;
  }
`;

// Types already imported at the top

const ScorerDashboard: React.FC<{ matchId?: string, teamLogo?: string }> = ({ matchId: propMatchId, teamLogo }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Unified State & Actions using Selectors for maximum stability
  const squadPlayers = useMatchCenter(state => state.squadPlayers);
  const fetchPlayers = useMatchCenter(state => state.fetchPlayers);
  const isPlayersLoading = useMatchCenter(state => state.loading);
  
  // Scorer State Selectors (Breaking the dependency on the whole store object)
  const innings1 = useMatchCenter(state => state.innings1);
  const innings2 = useMatchCenter(state => state.innings2);
  const toss = useMatchCenter(state => state.toss);
  const homeXI = useMatchCenter(state => state.homeXI);
  const awayXI = useMatchCenter(state => state.awayXI);
  const matchId = useMatchCenter(state => state.matchId);
  const isWaitingForBowler = useMatchCenter(state => state.isWaitingForBowler);
  
  // Scorer Actions
  const store = useMatchCenter(); // Temporarily keeping for deep nested logic, but usage is now more stable
  const isOfflineStore = useTournamentStore(state => state.isOffline);
  
  // Master Data
  const grounds = useTournamentStore(state => state.grounds);
  const tournaments = useTournamentStore(state => state.tournaments);
  const syncMasterData = useTournamentStore(state => state.syncMasterData);
  const allOpponents = useOpponentStore(state => state.opponents);
  const updateMatch = useMatchCenter(state => state.updateMatch);
  const updateMatchStatus = useMatchCenter(state => state.updateMatchStatus);
  
  const [extraSubType, setExtraSubType] = useState<'bat' | 'bye' | 'lb' | 'keeper'>('bat');
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [setupStep, setSetupStep] = useState<'preview' | 'toss' | 'squad_home' | 'squad_away' | 'openers_bat' | 'openers_bowl' | null>(innings1 ? null : 'preview');
  const [tossWinner, setTossWinner] = useState<'home' | 'away' | null>(toss.winnerId ? (toss.winnerId === 'HOME' ? 'home' : 'away') : null);
  const [tossChoice, setTossChoice] = useState<'Bat' | 'Bowl' | null>(toss.choice || null);
  const [tempMaxOvers, setTempMaxOvers] = useState(20);

  // Derive players for convenience
  const players = squadPlayers;

  // homeXI and awayXI are now defined via selectors at the top
  const { matchId: storeMatchId } = store;
  const [selStriker, setSelStriker] = useState<string | null>(null);
  const [selNonStriker, setSelNonStriker] = useState<string | null>(null);
  const [selBowler, setSelBowler] = useState<string | null>(null);
  const [showLineups, setShowLineups] = useState(false);
  const [showNBModal, setShowNBModal] = useState(false);
  const [showRunOutModal, setShowRunOutModal] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [showBatterSelectModal, setShowBatterSelectModal] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [showFielderModal, setShowFielderModal] = useState(false);
  const [pendingFielderId, setPendingFielderId] = useState<string | null>(null);
  const [pendingWicketType, setPendingWicketType] = useState<any>(null);
  const [extraType, setExtraType] = useState<'wd' | 'nb' | 'byes' | 'lb'>('nb');
  const [nbSubType, setNbSubType] = useState<'bat' | 'bye' | 'lb'>('bat');
  const [runOutInvolved, setRunOutInvolved] = useState<{ victimId: string, runs: number, ballType?: any, subType?: any } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [isOverComplete, setIsOverComplete] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const milestoneRef = useRef<MilestoneOverlayRef>(null);
  const [showWagonWheelModal, setShowWagonWheelModal] = useState<any>(null);
  const [scorecardTab, setScorecardTab] = useState<'scorecard' | 'commentary'>('scorecard');
  const [showInningsReview, setShowInningsReview] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isFinalizingInnings, setIsFinalizingInnings] = useState(false);
  const [showMatchSummaryModal, setShowMatchSummaryModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const lastSplashRef = useRef<string | null>(null);
  const [commentaryTemplates, setCommentaryTemplates] = useState<CommentaryTemplate[]>([]);
  const [nextCommentarySuggestions, setNextCommentarySuggestions] = useState<Record<CommentaryEventType, string[]>>({
    FOUR: [], SIX: [], WICKET: [], DOT: [], SINGLE: [], DOUBLE: [], TRIPLE: [], MILESTONE: []
  });
  const [currentPreviews, setCurrentPreviews] = useState<Record<CommentaryEventType, string>>({
    FOUR: '', SIX: '', WICKET: '', DOT: '', SINGLE: '', DOUBLE: '', TRIPLE: '', MILESTONE: ''
  });

  // Opponent players fetched separately from the opponents table
  const [opponentPlayers, setOpponentPlayers] = useState<{ id: string; name: string; role?: string }[]>([]);

  // Helper: resolve player name from either squad
  const getPlayerName = (id: any): string => {
    if (!id) return '—';
    // Robust check for object-based IDs or legacy participation
    const searchId = (typeof id === 'object' && id !== null) ? (id.id || id.name || String(id)) : String(id);
    if (searchId === '[object Object]') return 'Unknown Player';
    
    const homePlayer = players.find((p: Player) => String(p.id) === searchId);
    if (homePlayer) return homePlayer.name;
    const awayPlayer = opponentPlayers.find(p => String(p.id) === searchId);
    if (awayPlayer) return awayPlayer.name;
    // awayXI may store names directly for opponent teams without registered IDs
    return searchId;
  };

  const getPlayerAvatar = (id: string | null): string | null => {
    if (!id) return null;
    const player = players.find((p: Player) => p.id === id);
    return player?.avatarUrl || null;
  };

  useEffect(() => {
    // Master data is now automatically synced by the stores, 
    // we don't need to manually fetch opponents into a local state here.
  }, []);

  useEffect(() => {
    if (store.maxOvers) {
      setTempMaxOvers(store.maxOvers);
    }
  }, [store.maxOvers]);

  // Fetch Commentary Templates and prime the previews
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api')}/commentary/templates`);
        if (!res.ok) return;
        const data: CommentaryTemplate[] = await res.json();
        setCommentaryTemplates(data);

        // Group by type for fast lookup
        const grouped: Record<CommentaryEventType, string[]> = {
          FOUR: [], SIX: [], WICKET: [], DOT: [], SINGLE: [], DOUBLE: [], TRIPLE: [], MILESTONE: []
        };
        data.forEach(t => {
          if (grouped[t.event_type]) grouped[t.event_type].push(t.text);
        });
        setNextCommentarySuggestions(grouped);

        // Prime initial random selections
        const initialPreviews: Record<CommentaryEventType, string> = {
          FOUR: '', SIX: '', WICKET: '', DOT: '', SINGLE: '', DOUBLE: '', TRIPLE: '', MILESTONE: ''
        };
        (Object.keys(grouped) as CommentaryEventType[]).forEach(type => {
          const list = grouped[type];
          if (list.length > 0) {
            initialPreviews[type] = list[Math.floor(Math.random() * list.length)];
          }
        });
        setCurrentPreviews(initialPreviews);
      } catch (err) {
        console.error("Failed to load commentary templates:", err);
      }
    };
    fetchTemplates();
  }, []);

  const shufflePreview = (type: CommentaryEventType) => {
    const list = nextCommentarySuggestions[type];
    if (list && list.length > 0) {
      const randomText = list[Math.floor(Math.random() * list.length)];
      setCurrentPreviews(prev => ({ ...prev, [type]: randomText }));
    }
  };
  // Load Wagon Wheel Preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ins-wagon-wheel-enabled');
    if (saved !== null) {
      store.updateMatchSettings({ useWagonWheel: saved === 'true' });
    }
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueue, setSyncQueue] = useState<number>(0);

  // Ref to hold the latest cloud live_data WITHOUT adding it as a useCallback dependency.
  // This breaks the: sync → cloud update → matchMeta change → syncToDatabase recreated → sync cycle.
  const cloudLiveDataRef = useRef<any>(null);

  // One-shot guard: prevent re-fetching players every time squadPlayers becomes empty.
  const hasFetchedPlayersRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  useEffect(() => {
    if (store.toss.winnerId) {
      setTossWinner(store.toss.winnerId === 'HOME' ? 'home' : 'away');
      setTossChoice(store.toss.choice);
    }
  }, [store.toss]);

  // Reset the player fetch guard if we enter the squad selection step
  // This ensures that if the roster was empty due to a sync issue, it can be retried
  useEffect(() => {
    if (setupStep === 'squad_home') {
      console.log("[Scorer] Entering squad selection. Resetting fetch guard...");
      hasFetchedPlayersRef.current = false;
    }
  }, [setupStep]);

  // Auto-trigger bowler selection modal at end of over
  useEffect(() => {
    if (isWaitingForBowler && !showBowlerModal && !showInningsReview && !showMatchSummaryModal) {
      const timer = setTimeout(() => {
        setShowBowlerModal(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isWaitingForBowler, showInningsReview, showMatchSummaryModal, showBowlerModal]);

  // Get metadata from MatchCenterStore
  const matches = useMatchCenter(state => state.matches);
  const syncWithCloud = useMatchCenter(state => state.syncWithCloud);
  const finalizeMatch = useMatchCenter(state => state.finalizeMatch);
  
  const activeMatchId = id || propMatchId || matchId;

  // Add robust guard for match_id validation
  const isValidMatchId = (mid: any): mid is string => {
    return mid && typeof mid === 'string' && mid.length > 10;
  };

  // ABSOLUTE METADATA LAW (V5): Guaranteed resolution for active tournament
  const METADATA_LAW: any = {
    grounds: {
      'a2903265-670b-4886-8699-661b0546e46c': 'RCA GROUND'
    },
    tournaments: {
        'RCA T20 TOURNAMENT': 'PRINCE ABDULAZIZ BIN NASSER T20 TOURNAMENT',
        'default': 'PRINCE ABDULAZIZ BIN NASSER T20 TOURNAMENT'
    },
    opponents: {
        'SAUDI KNIGHTS': 'SAUDI KNIGHTS',
        'OPPONENT': 'SAUDI KNIGHTS'
    }
  };

  const resolveGroundName = (gid: string | undefined, gname: string | undefined) => {
    if (!gid) return gname || 'RCA GROUND';
    const fromMaster = (grounds || []).find(g => String(g.id) === String(gid))?.name;
    return fromMaster || METADATA_LAW.grounds[gid] || gname || 'RCA GROUND';
  };

  const resolveTournament = (tid: string | undefined, tname: string | undefined) => {
    if (!tid && !tname) return METADATA_LAW.tournaments['default'];
    const fromMaster = (tournaments || []).find((t: any) => tid && String(t.id) === String(tid))?.name;
    if (fromMaster && fromMaster !== 'RCA T20 TOURNAMENT') return fromMaster;
    if (tname === 'RCA T20 TOURNAMENT') return METADATA_LAW.tournaments['RCA T20 TOURNAMENT'];
    return tname || METADATA_LAW.tournaments['default'];
  };

  useEffect(() => {
    // Only reset if we are switching to a DIFFERENT match that isn't already the active one
    if (activeMatchId && activeMatchId !== matchId) {
      console.log("[Scorer] Different match detected. Preparing fresh session...");
      // Reset the one-shot player-fetch guard when the match changes.
      hasFetchedPlayersRef.current = false;
    }

    if (syncWithCloud) {
      syncWithCloud().catch(console.error);
    }
    if (syncMasterData) {
        syncMasterData().catch(console.error);
    }
    // CRITICAL: Ensure players are loaded for squad selection.
    // Use a one-shot ref guard instead of watching squadPlayers.length,
    // which caused an infinite loop when the squad was empty.
    if (fetchPlayers && !isPlayersLoading && !hasFetchedPlayersRef.current) {
        hasFetchedPlayersRef.current = true;
        console.log("[Scorer] One-shot: Fetching squad players...");
        fetchPlayers().catch(console.error);
    }
  }, [activeMatchId]); // Only re-run when the active match ID changes

  const matchMeta = (matches || []).find(m => m.id === activeMatchId);
  const venueName = typeof matchMeta?.venue === 'object' ? (matchMeta.venue as any)?.name : (matchMeta?.venue || 'LOCAL GROUND');

  // Sync with URL ID: Initialize match data into store when navigating from a match card
  useEffect(() => {
    if (!activeMatchId) return;

    const initFromMeta = (meta: any) => {
      if (!meta) return;

      const isActuallyLive = meta.status === 'live';
      console.log(`[Scorer] Sync Check: Cloud Total Balls: ${(meta.live_data?.innings1?.totalBalls || 0) + (meta.live_data?.innings2?.totalBalls || 0)} | Local Total Balls: ${(store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0)}`);

      // PERMANENT V5 ABSOLUTE RESOLUTION: Use the Failsafe Helpers
      const resolvedTournament = resolveTournament(meta.tournamentId, meta.tournament);
      const resolvedGroundName = resolveGroundName(meta.groundId, meta.venue);
      
      const opponentMeta = (allOpponents || []).find((o: any) => String(o.id) === String(meta.opponentId) || o.name === meta.opponentName);
      const resolvedOpponentName = (opponentMeta?.name && opponentMeta.name !== 'OPPONENT') ? opponentMeta.name : (meta.opponentName === 'OPPONENT' ? 'SAUDI KNIGHTS' : (meta.opponentName || 'SAUDI KNIGHTS'));
      const resolvedAwayLogo = meta.opponentLogo || opponentMeta?.logoUrl || '';

      store.initializeMatch({
        matchId: meta.id,
        matchType: meta.matchFormat || 'T20',
        tournament: resolvedTournament,
        ground: resolvedGroundName,
        opponentName: resolvedOpponentName,
        maxOvers: meta.maxOvers || 20,
        homeXI: meta.homeTeamXI || [],
        awayXI: meta.opponentTeamXI || [],
        homeLogo: teamLogo || '/INS%20LOGO.PNG',
        awayLogo: resolvedAwayLogo,
        liveData: meta.live_data
      });
    };

    // ALWAYS Deep Fetch on mount/activeMatchId change to ensure we have the live_data blob
    // list endpoints (/matches) often omit the heavy live_data field.
    console.log(`[Scorer] Deep Fetching match ${activeMatchId} for Cloud Truth...`);
    import('../services/storageService').then(({ getMatch }) => {
      getMatch(activeMatchId).then(freshMeta => {
        if (freshMeta) {
          initFromMeta(freshMeta);
        }
      }).catch(console.error);
    });
  }, [activeMatchId, grounds, teamLogo]);
  
  // Trigger Milestone Splash Screen based on store events
  useEffect(() => {
    if (store.pendingMilestone && milestoneRef.current) {
      const { type, player, subText } = store.pendingMilestone;
      
      // STRICT FIX: Only trigger milestone celebrations for home team (Indian Strikers) players.
      // We check if the player involved is part of the players store and marked as a club player.
      const isClubPlayer = players.some((p: Player) => p.name === player && !!p.isClubPlayer);
      
      // Partnerships are allowed if at least one striker is a club member (usually true for home team matches)
      const shouldTrigger = type === 'partnership' || isClubPlayer;

      if (shouldTrigger) {
        milestoneRef.current.trigger({ 
          type: type === 'hundred' ? 'HUNDRED' : (type === 'partnership' ? 'PARTNERSHIP' : 'FIFTY'), 
          playerName: player,
          subText: subText
        });
      }
      // Note: pendingMilestone is reset by the store on the next ball and cleared on UNDO.
    }
  }, [store.pendingMilestone, players]);

  // Sync setupStep when store state changes (Rehydration check)
  useEffect(() => {
    // Only auto-close setup if we are in initial preview and already have innings data
    if (store.innings1 && setupStep === 'preview') {
      setSetupStep(null); // Jump straight to scoring if we have innings data
      return;
    }

    // --- RESUME LOGIC (Device B): Match is live in DB but local store is empty or behind ---
    if (activeMatchId === store.matchId && matchMeta?.status === 'live' && matchMeta?.live_data) {
      const ld = matchMeta.live_data as any;
      if (ld && ld.innings1) {
        const localBalls = (store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0);
        const cloudBalls = (ld.innings1?.totalBalls || 0) + (ld.innings2?.totalBalls || 0);
        const localInnings = store.currentInnings || 1;
        const cloudInnings = ld.currentInnings || 1;

        // ROOT CAUSE FIX: Only rehydrate if cloud is STRICTLY ahead OR local store has no innings.
        // Previously, when we synced a ball to the cloud, matchMeta.live_data updated,
        // which triggered this effect and called initializeMatch, resetting the store.
        const cloudIsAhead =
          cloudInnings > localInnings ||
          (cloudInnings === localInnings && cloudBalls > localBalls);
        const localIsEmpty = !store.innings1;

        if (!localIsEmpty && !cloudIsAhead) {
          // Local state is equal to or ahead of cloud — skip rehydration.
          return;
        }

        if (cloudInnings < localInnings) {
          console.log("[Scorer] Rehydration blocked: Cloud innings is behind local state.");
          return;
        }
        if (cloudInnings === localInnings && cloudBalls < localBalls) {
          console.log("[Scorer] Rehydration blocked: Cloud ball count is behind local state.");
          return;
        }

        console.log(`[Scorer] Rehydration: Cloud(${cloudBalls} balls, inn${cloudInnings}) > Local(${localBalls} balls, inn${localInnings}). Rehydrating...`);

        // PERMANENT RESOLUTION LAW: Resolve IDs to Names/Logos from master data
        const groundMeta = grounds.find(g => g.id === matchMeta.groundId);
        const opponentMeta = allOpponents.find((o: any) => o.id === matchMeta.opponentId || o.name === matchMeta.opponentName);

        const resolvedGroundName = groundMeta?.name || (typeof matchMeta.venue === 'object' ? (matchMeta.venue as any)?.name : matchMeta.venue) || 'Local Ground';
        const resolvedOpponentName = opponentMeta?.name || matchMeta.opponentName || 'OPPONENT';
        const resolvedAwayLogo = matchMeta.opponentLogo || opponentMeta?.logoUrl || '';

        store.initializeMatch({
          matchId: matchMeta.id,
          matchType: matchMeta.matchFormat || 'T20',
          tournament: matchMeta.tournament || 'Live Match',
          ground: resolvedGroundName,
          opponentName: resolvedOpponentName,
          maxOvers: matchMeta.maxOvers || ld.maxOvers || 20,
          homeXI: matchMeta.homeTeamXI || [],
          awayXI: matchMeta.opponentTeamXI || [],
          homeLogo: teamLogo || '/INS%20LOGO.PNG',
          awayLogo: resolvedAwayLogo,
          liveData: ld
        });
      }
    }
  // Depend on ball-count primitives rather than the full live_data object to prevent
  // the effect from firing every time we write to the cloud.
  }, [
    !!store.innings1,
    store.matchId,
    matchMeta?.status,
    store.innings1?.totalBalls,
    store.innings2?.totalBalls,
    (matchMeta?.live_data as any)?.innings1?.totalBalls,
    (matchMeta?.live_data as any)?.innings2?.totalBalls,
    (matchMeta?.live_data as any)?.currentInnings,
  ]);

  // Keep the cloud live_data in a ref so syncToDatabase doesn't need it as a dep.
  // Without this, every cloud write updated matchMeta.live_data → recreated the
  // syncToDatabase callback → triggered the sync effect → called syncToDatabase again.
  useEffect(() => {
    cloudLiveDataRef.current = matchMeta?.live_data ?? null;
  }, [matchMeta?.live_data]);

  const syncToDatabase = useCallback(
    async (state: any) => {
      if (!activeMatchId) return;

      // GUARDED SYNC: Only push if local totalBalls >= Cloud totalBalls.
      // Read cloud state from the ref to avoid adding matchMeta to the dep array.
      const localBalls = (state.innings1?.totalBalls || 0) + (state.innings2?.totalBalls || 0);
      const cloudBalls = ((cloudLiveDataRef.current as any)?.innings1?.totalBalls || 0) +
                         ((cloudLiveDataRef.current as any)?.innings2?.totalBalls || 0);

      if (cloudBalls > localBalls) {
        console.warn(`[Sync] Stale overwrite prevented: Cloud(${cloudBalls}) > Local(${localBalls})`);
        return;
      }

      try {
        setIsSyncing(true);
        await updateMatch(activeMatchId, { live_data: state, last_updated: new Date().toISOString() });
        setIsSyncing(false);
      } catch (err) {
        console.error("[Sync] Failed to update match:", err);
        setIsSyncing(false);
      }
    },
    [activeMatchId] // matchMeta?.live_data intentionally removed; read via ref instead
  );

  // Fetch opponent players when we know the opponent ID
  useEffect(() => {
    const opponentId = matchMeta?.opponentId;
    if (!opponentId) return;
    import('../services/storageService').then(({ getOpponents }) => {
      getOpponents().then(teams => {
        const team = teams.find(t => String(t.id) === String(opponentId));
        if (team && team.players && team.players.length > 0) {
          setOpponentPlayers(team.players.map(p => ({ id: p.id, name: p.name, role: p.role })));
        }
      }).catch(console.error);
    });
  }, [matchMeta?.opponentId]);

  // Prevent the infinite sync loop by using a ref to track the last synced ball count.
  const lastSyncedBallCount = useRef<number>(-1);

  useEffect(() => {
    const currentBalls = (store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0);
    if (currentBalls > 0 && currentBalls !== lastSyncedBallCount.current) {
      lastSyncedBallCount.current = currentBalls;
      syncToDatabase(store);
    }
  // syncToDatabase is now stable (only depends on activeMatchId), so this effect
  // only fires when the ball count genuinely increases.
  }, [store.innings1?.totalBalls, store.innings2?.totalBalls, syncToDatabase]);

  const handleUpdateMatchStatus = async (status: MatchStatus) => {
    if (activeMatchId) {
      await updateMatchStatus(activeMatchId, status);
    }
  };

  const handleChangeScorer = async () => {
    if (!activeMatchId) return;

    const confirmMessage = "FORCE SAVE AND EXIT SCORING?\n\nThis will sync the latest state to the cloud and allow another scorer to take over. You will be redirected to the match list.";
    if (!window.confirm(confirmMessage)) return;

    setSyncStatus('loading');
    try {
      // 1. Force a final atomic sync and AWAIT the result
      // We send full live_data (store) and summarized live_state
      await updateMatch(activeMatchId, {
        live_data: {
          ...store,
          strikerId: store.strikerId,
          nonStrikerId: store.nonStrikerId,
          currentBowlerId: store.currentBowlerId,
          currentInnings: store.currentInnings,
        },
        live_state: {
          striker_id: store.strikerId,
          non_striker_id: store.nonStrikerId,
          bowler_id: store.currentBowlerId,
          current_innings: store.currentInnings,
        } as any,
        last_updated: new Date().toISOString(),
        status: 'live' // Ensure status is explicitly live
      });

      // 2. Clear match-specific local keys (prevents re-opening stale match)
      // Keep user logged in (sessionStorage)
      localStorage.removeItem('ins-cricket-scorer');
      localStorage.removeItem('active_match_id');

      // 3. Success Feedback
      setSyncStatus('idle');
      toast.success("Match synced. Safe to hand over!", {
        duration: 5000,
        icon: '🤝'
      });

      // 4. Clean exit
      navigate('/match-center');
    } catch (error) {
      console.error("Change Scorer sync failed:", error);
      setSyncStatus('error');
      toast.error("Sync Failed! Please check internet and try again.");
    } finally {
      setSyncStatus('idle');
    }
  };

  const currentInnings = store.currentInnings === 1 ? store.innings1 : store.innings2;

  // Auto-scroll timeline to the end when a new ball is added
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTo({
        left: timelineRef.current.scrollWidth,
        behavior: 'smooth'
      });
    }
  }, [currentInnings?.history?.length]);
  const isBattingFinishing = currentInnings && (currentInnings.totalBalls || 0) > 0 && (
    currentInnings.wickets === 10 ||
    (currentInnings.totalBalls >= (store.maxOvers || 20) * 6) ||
    (store.currentInnings === 2 && currentInnings.totalRuns > (store.innings1?.totalRuns || 0))
  );
  const isMatchComplete = store.isFinished;
  const isInningsBreak = store.currentInnings === 1 && isBattingFinishing && !store.isFinished;

  // WORM CHART CALCULATION
  const wormData = useMemo(() => {
    const maxOvers = store.maxOvers || 20;
    const data = Array.from({ length: maxOvers + 1 }, (_, i) => ({ over: i }));
    
    const calculateCumulative = (history: any[]) => {
      const perOver: number[] = new Array(maxOvers + 1).fill(null);
      perOver[0] = 0;
      
      let cumulativeRuns = 0;
      let currentOver = 0;
      
      (history || []).forEach(ball => {
        cumulativeRuns += (ball.runs || 0) + (ball.extras || 0);
        if (ball.isLegal) {
          const ballsBowled = history.filter((b, idx) => idx <= history.indexOf(ball) && b.isLegal).length;
          if (ballsBowled % 6 === 0) {
            currentOver = ballsBowled / 6;
            if (currentOver <= maxOvers) perOver[currentOver] = cumulativeRuns;
          }
        }
      });
      
      // Interpolate current over if incomplete
      const totalLegalBalls = (history || []).filter(b => b.isLegal).length;
      const incompleteOver = Math.floor(totalLegalBalls / 6) + 1;
      if (totalLegalBalls % 6 !== 0 && incompleteOver <= maxOvers) {
        perOver[incompleteOver] = cumulativeRuns;
      }
      
      return perOver;
    };

    const inn1Runs = calculateCumulative(store.innings1?.history || []);
    const inn2Runs = calculateCumulative(store.innings2?.history || []);

    return data.map((d, i) => ({
      over: d.over,
      inn1: inn1Runs[i],
      inn2: inn2Runs[i]
    }));
  }, [store.innings1?.history, store.innings2?.history, store.maxOvers]);

  // Trigger Review Modal when innings condition is met
  useEffect(() => {
    if (isBattingFinishing && !showInningsReview && !store.isFinished && !isFinalizingInnings && setupStep === null) {
      setShowInningsReview(true);
    }
  }, [isBattingFinishing, store.isFinished, isFinalizingInnings, setupStep, showInningsReview]);

  // Trigger Bowler Selection at start of innings or if bowler missing
  React.useEffect(() => {
    if (currentInnings && !store.currentBowlerId && !showBowlerModal) {
      // Check if match is not finished
      const totalBalls = currentInnings.totalBalls || 0;
      const maxBalls = (store.maxOvers || 20) * 6;
      if (totalBalls < maxBalls) {
        setShowBowlerModal(true);
      }
    }
  }, [store.currentInnings, store.currentBowlerId, currentInnings, showBowlerModal]);

  // Nuclear trace detection for Sandbox matches
  useEffect(() => {
    if (activeMatchId && (String(activeMatchId).toLowerCase().includes('sandbox') || matchMeta?.opponentName === 'Sandbox XI' || matchMeta?.is_test)) {
      console.warn("[Scorer] Sandbox/Test match detected. Redirecting to safety.");
      navigate('/match-center');
    }
  }, [activeMatchId, matchMeta, navigate]);

  const partnershipData = useMemo(() => {
    const balls = currentInnings?.history || [];
    let pruns = 0;
    let plegalBalls = 0;
    let pextras = 0;

    let lastWicketIdx = -1;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i] as any;
      if (b.isWicket && !['Retired Hurt'].includes(b.wicketType || '')) {
        lastWicketIdx = i;
        break;
      }
    }

    const currentStandBalls = lastWicketIdx === -1 ? balls : balls.slice(lastWicketIdx + 1);

    const sId = store.strikerId;
    const nsId = store.nonStrikerId;
    let sPRuns = 0; let sPBalls = 0;
    let nsPRuns = 0; let nsPBalls = 0;

    currentStandBalls.forEach((b: any) => {
      pruns += b.runs;
      if (b.isLegal) plegalBalls++;

      if (b.type !== 'legal') {
        if (b.type === 'wide' || b.type === 'no-ball') {
          pruns += 1;
          pextras += 1 + b.runs;
        } else {
          pextras += b.runs;
        }
      }

      // Individual contributions in this stand
      if (b.strikerId === sId) {
        if (b.subType === 'bat') sPRuns += b.runs;
        if (b.isLegal) sPBalls++;
      } else if (b.strikerId === nsId) {
        if (b.strikerId === nsId) {
          if (b.subType === 'bat') nsPRuns += b.runs;
          if (b.isLegal) nsPBalls++;
        }
      }
    });

    return {
      totalRuns: pruns,
      totalBalls: plegalBalls,
      s: { name: getPlayerName(sId || null).split(' ')[0], runs: sPRuns, balls: sPBalls },
      ns: { name: getPlayerName(nsId || null).split(' ')[0], runs: nsPRuns, balls: nsPBalls },
      extras: pextras
    };
  }, [currentInnings?.history, store.strikerId, store.nonStrikerId]);

  const lastWicketData = useMemo(() => {
    const balls = currentInnings?.history || [];
    let lastBall = null;
    let totalRunsAtW = 0;
    let wicketsAtW = 0;

    let cRuns = 0;
    let cWickets = 0;

    for (let i = 0; i < balls.length; i++) {
      const b = balls[i] as any;
      cRuns += b.runs + (b.type === 'wide' || b.type === 'no-ball' ? 1 : 0);
      if (b.isWicket && !['Retired Hurt'].includes(b.wicketType || '')) {
        cWickets++;
        lastBall = b;
        totalRunsAtW = cRuns;
        wicketsAtW = cWickets;
      }
    }

    if (!lastBall) return null;
    const victimId = lastBall.outPlayerId || lastBall.strikerId;
    const victimName = getPlayerName(victimId).split(' ')[0];
    const bStat = currentInnings?.battingStats[victimId];

    return {
      name: victimName,
      runs: bStat?.runs || 0,
      balls: bStat?.balls || 0,
      score: `${totalRunsAtW}/${wicketsAtW}`
    };
  }, [currentInnings?.history, currentInnings?.battingStats]);

  // INITIAL STATE: If no ID is provided, show upcoming matches list
  if (!activeMatchId) {
    const upcoming = (matches || []).filter(m => m.status !== 'completed');
    return (
      <DashboardContainer>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button title="Back" onClick={() => navigate('/match-center')} className="p-2 hover:bg-slate-100/10 rounded-xl transition-all text-white"><ChevronLeft /></button>
            <span style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '1px' }}>STRIKERS PULSE</span>
            <span style={{ fontSize: '8px', opacity: 0.3, marginLeft: 6, fontWeight: 700 }}>v0.1.0</span>
          </div>
          <button
            title="Global Settings"
            onClick={() => setShowSettingsDrawer(true)}
            className="p-2 hover:bg-slate-100/10 rounded-full transition-all text-white"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={20} />
          </button>
        </Header>
        <div style={{ padding: '24px 16px', maxWidth: 500, margin: '0 auto', width: '100%' }}>
          {/* SYNC STATUS BANNER */}
          {(() => {
             const localBalls = (store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0);
             const cloudBalls = (matchMeta?.live_data?.innings1?.totalBalls || 0) + (matchMeta?.live_data?.innings2?.totalBalls || 0);
             if (cloudBalls > localBalls) {
               return (
                 <motion.div 
                   initial={{ y: -20, opacity: 0 }} 
                   animate={{ y: 0, opacity: 1 }}
                   style={{ background: 'rgba(250, 176, 5, 0.1)', border: '1px solid rgba(250, 176, 5, 0.3)', padding: '12px 16px', borderRadius: 12, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}
                 >
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FAB005', fontWeight: 900, fontSize: '0.75rem' }}>
                     <CloudLightning size={16} /> CLOUD SCORE IS AHEAD
                   </div>
                   <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.7, color: '#001F3F', fontWeight: 600 }}>
                     The cloud has {cloudBalls} balls compared to {localBalls} locally. Your mobile might be ahead.
                   </p>
                   <button 
                     onClick={() => {
                        if (matchMeta?.live_data) {
                           store.initializeMatch({
                             matchId: matchMeta.id,
                             matchType: matchMeta.matchFormat || 'T20',
                             tournament: matchMeta.tournament || 'Live Match',
                             ground: matchMeta.venue || 'Local Ground',
                             opponentName: matchMeta.opponentName || 'OPPONENT',
                             maxOvers: matchMeta.maxOvers || 20,
                             homeXI: matchMeta.homeTeamXI || [],
                             awayXI: matchMeta.opponentTeamXI || [],
                             homeLogo: teamLogo,
                             awayLogo: matchMeta.opponentLogo || '',
                             liveData: matchMeta.live_data
                           });
                           toast.success("Synchronized with Cloud!");
                        }
                     }}
                     style={{ background: '#FAB005', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#000', fontSize: '0.7rem', fontWeight: 900, cursor: 'pointer', width: 'fit-content' }}
                   >
                     DOWNLOAD CLOUD VERSION
                   </button>
                 </motion.div>
               );
             }
             return null;
          })()}

          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <Zap size={32} color="#FAB005" style={{ marginBottom: 12 }} />
            <h2 style={{ fontWeight: 900, color: '#001F3F', margin: '0 0 8px 0' }}>SCORER DASHBOARD</h2>
            <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Select an active or upcoming match to start recording balls.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#FAB005', letterSpacing: '1px', marginBottom: 4 }}>AVAILABLE MATCHES</div>
            {upcoming.map(m => (
              <motion.div
                key={m.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/scorer/${m.id}`)}
                style={{
                  background: 'white', padding: '16px 20px', borderRadius: 16,
                  border: '1px solid #E9ECEF', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={14} color="#001F3F" />
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#001F3F' }}>{m.opponentName}</div>
                    {m.status === 'live' && (
                      <span style={{ background: '#FF4B2B', color: 'white', fontSize: '8px', fontWeight: 900, padding: '2px 6px', borderRadius: 4 }}>LIVE</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: 4, fontWeight: 600 }}>
                    {m.tournament} • {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <ChevronRight size={20} color="#FAB005" />
              </motion.div>
            ))}
            {upcoming.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8F9FA', borderRadius: 16, border: '1px dashed #DEE2E6' }}>
                <LayoutList size={24} color="#ADB5BD" style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#ADB5BD', fontWeight: 600 }}>No upcoming matches scheduled.</p>
                <button
                  onClick={() => navigate('/match-center')}
                  style={{ background: 'none', border: 'none', color: '#339AF0', fontSize: '0.8rem', fontWeight: 700, marginTop: 12, cursor: 'pointer' }}
                >
                  Schedule in Match Center
                </button>
              </div>
            )}
          </div>
        </div>

        <SyncStatusPill $outOfSync={( (store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0) ) !== ( (matchMeta?.live_data?.innings1?.totalBalls || 0) + (matchMeta?.live_data?.innings2?.totalBalls || 0) )}>
          {( (store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0) ) === ( (matchMeta?.live_data?.innings1?.totalBalls || 0) + (matchMeta?.live_data?.innings2?.totalBalls || 0) ) ? (
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
          ) : (
            <CloudLightning size={10} />
          )}
          L:{(store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0)} | C:{(matchMeta?.live_data?.innings1?.totalBalls || 0) + (matchMeta?.live_data?.innings2?.totalBalls || 0)}
        </SyncStatusPill>
      </DashboardContainer>
    );
  }

  if (setupStep !== null) {
    const isReadyToStart = tossWinner && tossChoice && 
                          (homeXI?.length || 0) === 11 && 
                          (awayXI?.length || 0) === 11 && 
                          selStriker && selNonStriker && selBowler;

    const handleStartMatch = () => {
      if (!isReadyToStart) {
        toast.error("Please complete all setup selections first.");
        return;
      }
      
      if (!isValidMatchId(activeMatchId)) {
        toast.error("Invalid Match ID. Cannot start scoring.");
        console.error("[Scorer] Start match failed: activeMatchId is invalid", activeMatchId);
        return;
      }

      const winnerId = tossWinner === 'home' ? 'HOME' : 'AWAY';
      store.setToss(winnerId, tossChoice!);

      const homeBatting = (winnerId === 'HOME' && tossChoice === 'Bat') || (winnerId === 'AWAY' && tossChoice === 'Bowl');
      const startBatTeamId = homeBatting ? 'HOME' : 'AWAY';
      const startBowlTeamId = startBatTeamId === 'HOME' ? 'AWAY' : 'HOME';

      const currentBatTeamId = store.innings1 ? (startBatTeamId === 'HOME' ? 'AWAY' : 'HOME') : startBatTeamId;
      const currentBowlTeamId = currentBatTeamId === 'HOME' ? 'AWAY' : 'HOME';

      store.updateMatchSettings({ maxOvers: tempMaxOvers });
      store.startInnings(
        store.innings1 ? 2 : 1,
        currentBatTeamId,
        currentBowlTeamId,
        selStriker!,
        selNonStriker!,
        selBowler!
      );

      // Persist the toss outcome and match status to the metadata store
      if (activeMatchId) {
        // Fetch fresh state to ensure new innings is included
        const freshStore = useMatchCenter.getState();
        
        // V5 ROBUSTNESS: Clean the store state of functions before persisting
        const cleanedStore = Object.fromEntries(
          Object.entries(freshStore).filter(([_, value]) => typeof value !== 'function')
        );

        updateMatch(activeMatchId, {
          isHomeBattingFirst: startBatTeamId === 'HOME',
          status: 'live',
          homeTeamXI: homeXI || [],
          opponentTeamXI: awayXI || [],
          live_data: {
            ...cleanedStore,
            strikerId: selStriker!,
            nonStrikerId: selNonStriker!,
            currentBowlerId: selBowler!,
            currentInnings: freshStore.innings1 ? 2 : 1
          } as any
        });
      }

      setSetupStep(null);
    };

    return (
      <SetupContainer>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button title="Back to Match Center" onClick={() => navigate('/match-center')} className="p-2 hover:bg-slate-100/10 rounded-xl transition-all text-white"><ChevronLeft /></button>
            <span style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '1px' }}>MATCH SETUP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              title="Match Settings"
              onClick={() => setShowSettingsDrawer(true)}
              className="p-2 hover:bg-slate-100/10 rounded-full transition-all text-white"
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Settings size={20} />
            </button>

          </div>
        </Header>

        <SetupCard>
          {setupStep === 'preview' ? (
            <>
              {(() => {
                  // V5 ABSOLUTE RESOLUTION: Forced overrides for RCA match
                  const resolvedTournament = resolveTournament(matchMeta?.tournamentId, matchMeta?.tournament || store.tournament);
                  const displayTournament = resolvedTournament || 'PRINCE ABDULAZIZ BIN NASSER T20 TOURNAMENT';

                  const groundId = matchMeta?.groundId || store.ground;
                  const displayGround = resolveGroundName(groundId, store.ground);
                  
                  const opponentMeta = (allOpponents || []).find(o => String(o.id) === String(matchMeta?.opponentId) || o.name === store.opponentName);
                  const displayOpponentName = (opponentMeta?.name && opponentMeta.name !== 'OPPONENT') ? opponentMeta.name : (store.opponentName === 'OPPONENT' ? 'SAUDI KNIGHTS' : (store.opponentName || 'SAUDI KNIGHTS'));
                  const displayOpponentLogo = (store.awayLogo && !store.awayLogo.includes('null') && store.awayLogo.length > 5) ? store.awayLogo : (matchMeta?.opponentLogo || opponentMeta?.logoUrl || '');

                  return (
                    <>
                      <MatchTitle style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>{displayTournament.toUpperCase()}</MatchTitle>
                      <GroundText>
                        <MapPin size={14} /> {String(displayGround).toUpperCase()}
                      </GroundText>

                      <TeamRow>
                        <TeamBlock>
                          <TeamLogoCircle $active>
                            <img src={store.homeLogo || teamLogo || '/INS%20LOGO.PNG'} alt="H" />
                          </TeamLogoCircle>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', textAlign: 'center' }}>INDIAN STRIKERS</span>
                        </TeamBlock>
                        <TeamBlock>
                          <TeamLogoCircle>
                            {displayOpponentLogo ? (
                              <img src={displayOpponentLogo} alt="A" />
                            ) : (
                              <Shield size={40} color="rgba(255,255,255,0.3)" />
                            )}
                          </TeamLogoCircle>
                          <span style={{ fontStyle: 'italic', fontWeight: 900, fontSize: '1rem', textAlign: 'center', color: '#FAB005' }}>
                            {displayOpponentName.toUpperCase()}
                          </span>
                        </TeamBlock>
                      </TeamRow>
                    </>
                  );
              })()}

              <ActionButton $variant="primary" onClick={() => setSetupStep('toss')}>
                Go to Toss
              </ActionButton>
            </>
          ) : setupStep === 'toss' ? (
            <>
              <CoinWrapper>
                <Coin3D
                  animate={{
                    rotateY: [0, 360],
                    y: [0, -15, 0]
                  }}
                  transition={{
                    rotateY: { duration: 3, repeat: Infinity, ease: "linear" },
                    y: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                  }}
                >
                  <CoinFace $side="front" />
                  <CoinFace $side="back" />
                </Coin3D>
              </CoinWrapper>

              <h3 style={{ textAlign: 'center', marginBottom: 24, fontWeight: 900 }}>TOSS SELECTION</h3>

              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 12 }}>Who won the toss?</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <TossOption $selected={tossWinner === 'home'} onClick={() => setTossWinner('home')}>
                  Indian Strikers
                </TossOption>
                <TossOption $selected={tossWinner === 'away'} onClick={() => setTossWinner('away')}>
                  {store.opponentName || matchMeta?.opponentName || 'OPPONENT'}
                </TossOption>
              </div>

              {tossWinner && (
                <>
                  <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 12 }}>What did they choose?</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
                    <TossOption $selected={tossChoice === 'Bat'} onClick={() => setTossChoice('Bat')}>
                      BATTING
                    </TossOption>
                    <TossOption $selected={tossChoice === 'Bowl'} onClick={() => setTossChoice('Bowl')}>
                      BOWLING
                    </TossOption>
                  </div>
                </>
              )}

              <SettingsSection>
                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 4, textAlign: 'center' }}>Match Adjustments</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: 12 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Max Overs Per Side</span>
                  <OversControl>
                    <ControlBtn onClick={() => setTempMaxOvers(Math.max(1, tempMaxOvers - 1))}>
                      <Minus size={16} />
                    </ControlBtn>
                    <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#FAB005' }}>{tempMaxOvers}</span>
                    <ControlBtn onClick={() => setTempMaxOvers(tempMaxOvers + 1)}>
                      <Plus size={16} />
                    </ControlBtn>
                  </OversControl>
                </div>
              </SettingsSection>

              <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                <ActionButton onClick={() => setSetupStep('preview')}>Back</ActionButton>
                <ActionButton $variant="primary" disabled={!tossWinner || !tossChoice} onClick={() => setSetupStep('squad_home')}>
                  Select Squads
                </ActionButton>
              </div>
            </>
          ) : setupStep === 'squad_home' || setupStep === 'squad_away' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {setupStep === 'squad_home' ? <Shield size={20} color="#FAB005" /> : <Users size={20} color="#FAB005" />}
                  <h3 style={{ margin: 0, fontWeight: 900 }}>
                    {setupStep === 'squad_home' ? 'INDIAN STRIKERS ROSTER' : `${(store.opponentName || 'OPPONENT').toUpperCase()} ROSTER`}
                  </h3>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#FAB005' }}>
                  {setupStep === 'squad_home' ? homeXI.length : awayXI.length} / 11
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 8 }}>
                {['All', 'Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'].map(role => (
                  <FilterChip
                    key={role}
                    $active={roleFilter === role}
                    onClick={() => setRoleFilter(role)}
                  >
                    {role}
                  </FilterChip>
                ))}
              </div>

              <SelectionGrid>
                {((setupStep === 'squad_home' ? (players || []) : (opponentPlayers || [])) as any[])
                  .filter((p: any) => roleFilter === 'All' || p.role === roleFilter)
                  .map((p: any) => {
                    const currentXI = setupStep === 'squad_home' ? homeXI : awayXI;
                    const isSelected = (currentXI || []).includes(p.id);

                    return (
                      <PlayerCard
                        key={p.id}
                        $selected={isSelected}
                        onClick={() => {
                          const isAlreadySel = (currentXI || []).includes(p.id);
                          let newSquad;
                          if (isAlreadySel) {
                            newSquad = (currentXI || []).filter(id => id !== p.id);
                          } else if (currentXI.length < 11) {
                            newSquad = [...currentXI, p.id];
                          } else {
                            return;
                          }
                          store.updateMatchSettings({
                            [setupStep === 'squad_home' ? 'homeXI' : 'awayXI']: newSquad
                          });
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                          <User size={14} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>{p.role}</div>
                          </div>
                        </div>
                        {setupStep === 'squad_home' && (
                          <StatRibbon>
                            <StatItem>
                              <StatLabel>Avg</StatLabel>
                              <StatVal>{(p as any).battingStats?.average || (p as any).average || '0.0'}</StatVal>
                            </StatItem>
                            <StatItem>
                              <StatLabel>SR</StatLabel>
                              <StatVal>{(p as any).battingStats?.strikeRate || '0'}</StatVal>
                            </StatItem>
                            <StatItem>
                              <StatLabel>Wkt</StatLabel>
                              <StatVal>{(p as any).bowlingStats?.wickets || (p as any).wicketsTaken || '0'}</StatVal>
                            </StatItem>
                          </StatRibbon>
                        )}
                      </PlayerCard>
                    );
                  })}
              </SelectionGrid>

              <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                <ActionButton onClick={() => setSetupStep(setupStep === 'squad_home' ? 'toss' : 'squad_home')}>
                  Back
                </ActionButton>
                <ActionButton
                  $variant="primary"
                  disabled={(setupStep === 'squad_home' ? homeXI.length : awayXI.length) < 11}
                  onClick={() => setSetupStep(setupStep === 'squad_home' ? 'squad_away' : 'openers_bat')}
                >
                  {setupStep === 'squad_home' ? 'Next Team' : 'Choose Openers'}
                </ActionButton>
              </div>

              <button
                onClick={() => {
                  const pool = setupStep === 'squad_home' ? players : opponentPlayers;
                  const selectedIds = pool.slice(0, 11).map((p: any) => p.id);
                  store.updateMatchSettings({
                    [setupStep === 'squad_home' ? 'homeXI' : 'awayXI']: selectedIds
                  });
                }}
                style={{ background: 'none', border: 'none', color: '#FAB005', fontSize: '0.7rem', marginTop: 12, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Auto-Fill 11 Players
              </button>
            </>
          ) : setupStep === 'openers_bat' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Users size={20} color="#FAB005" />
                <h3 style={{ margin: 0, fontWeight: 900 }}>CHOOSE OPENING BATSMEN</h3>
              </div>

              {(() => {
                const firstInningsBatTeamId = (tossWinner === 'home' && tossChoice === 'Bat') || (tossWinner === 'away' && tossChoice === 'Bowl') ? 'HOME' : 'AWAY';
                const batTeamId = store.innings1 ? (firstInningsBatTeamId === 'HOME' ? 'AWAY' : 'HOME') : firstInningsBatTeamId;
                const batSquadIds = batTeamId === 'HOME' ? homeXI : awayXI;
                const batPool = batTeamId === 'HOME'
                  ? (players || []).filter((p: any) => (batSquadIds || []).includes(p.id))
                  : (opponentPlayers || []).filter((p: any) => (batSquadIds || []).includes(p.id));

                return (
                  <>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 8 }}>Select Striker & Non-Striker ({batTeamId === 'HOME' ? 'Indian Strikers' : (store.opponentName || matchMeta?.opponentName || 'OPPONENT')})</p>
                    <SelectionGrid>
                      {batPool.map((p: any) => (
                        <PlayerCard
                          key={p.id}
                          $selected={selStriker === p.id || selNonStriker === p.id}
                          onClick={() => {
                            if (selStriker === p.id) setSelStriker(null);
                            else if (selNonStriker === p.id) setSelNonStriker(null);
                            else if (!selStriker) setSelStriker(p.id);
                            else if (!selNonStriker) setSelNonStriker(p.id);
                          }}
                        >
                          <User size={16} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{p.role}</div>
                          </div>
                          {(selStriker === p.id || selNonStriker === p.id) && (
                            <div style={{ marginLeft: 'auto', background: '#FAB005', color: '#111', fontSize: '8px', fontWeight: 900, padding: '2px 4px', borderRadius: 4 }}>
                              {selStriker === p.id ? 'STRIKER' : 'NON-STRIKER'}
                            </div>
                          )}
                        </PlayerCard>
                      ))}
                    </SelectionGrid>
                  </>
                );
              })()}

              <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                <ActionButton onClick={() => setSetupStep('squad_away')}>Back</ActionButton>
                <ActionButton $variant="primary" disabled={!selStriker || !selNonStriker} onClick={() => setSetupStep('openers_bowl')}>
                  Choose Bowler
                </ActionButton>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Users size={20} color="#FAB005" />
                <h3 style={{ margin: 0, fontWeight: 900 }}>CHOOSE OPENING BOWLER</h3>
              </div>

              {(() => {
                const firstBatTeamId = (tossWinner === 'home' && tossChoice === 'Bat') || (tossWinner === 'away' && tossChoice === 'Bowl') ? 'HOME' : 'AWAY';
                const batTeamId = store.innings1 ? (firstBatTeamId === 'HOME' ? 'AWAY' : 'HOME') : firstBatTeamId;
                const bowlTeamId = batTeamId === 'HOME' ? 'AWAY' : 'HOME';
                const bowlSquadIds = bowlTeamId === 'HOME' ? homeXI : awayXI;
                const bowlPool = bowlTeamId === 'HOME'
                  ? (players || []).filter((p: any) => (bowlSquadIds || []).includes(p.id))
                  : (opponentPlayers || []).filter((p: any) => (bowlSquadIds || []).includes(p.id));

                return (
                  <>
                    <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 8 }}>Select Opening Bowler ({bowlTeamId === 'HOME' ? 'Indian Strikers' : (store.opponentName || matchMeta?.opponentName || 'OPPONENT')})</p>
                    <SelectionGrid>
                      {bowlPool.map((p: any) => (
                        <PlayerCard
                          key={p.id}
                          $selected={selBowler === p.id}
                          onClick={() => setSelBowler(selBowler === p.id ? null : p.id)}
                        >
                          <User size={16} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.6rem', opacity: 0.6 }}>{p.role}</div>
                          </div>
                          {selBowler === p.id && (
                            <div style={{ marginLeft: 'auto', background: '#FAB005', color: '#111', fontSize: '8px', fontWeight: 900, padding: '2px 4px', borderRadius: 4 }}>
                              BOWLER
                            </div>
                          )}
                        </PlayerCard>
                      ))}
                    </SelectionGrid>
                  </>
                );
              })()}

              <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
                <ActionButton onClick={() => setSetupStep('openers_bat')}>Back to Batsmen</ActionButton>
                <ActionButton $variant="primary" disabled={!isReadyToStart} onClick={handleStartMatch}>
                  {store.innings1 ? 'Start 2nd Innings' : 'Start Match'}
                </ActionButton>
              </div>
            </>
          )}
        </SetupCard>

        <button
          onClick={() => navigate('/match-center')}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginTop: 24,
            cursor: 'pointer',
            textDecoration: 'underline',
            alignSelf: 'center'
          }}
        >
          Cancel and Return to Match Center
        </button>
      </SetupContainer>
    );
  }

  const handleRecord = (score: number, type: any = 'legal', isWicket: boolean = false, wicketType?: any, subType: any = 'bat', outPlayerId?: string, newBatterId?: string, zone?: string, commentary?: string) => {
    if (isOverComplete && store.isWaitingForBowler) {
      console.warn("Over complete. Selection required.");
      toast.error("Finish over selection first", { id: 'bowler-lock' });
      return;
    }

    const innings = store.currentInnings === 1 ? store.innings1 : store.innings2;
    if (!innings) return;
    const is_test = matchMeta?.is_test ?? false;
    const isLegal = type !== 'wide' && type !== 'no-ball';

    const currentStrikerId = store.strikerId;
    const currentNonStrikerId = store.nonStrikerId;
    const currentBowlerId = store.currentBowlerId;

    store.recordBall({ runs: score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, zone, commentary });

    const syncBallToCloud = async (retryCount = 0) => {
      if (!activeMatchId || is_test) return;

      const baseUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api');
      const payload: any = {
        match_id: activeMatchId,
        striker_id: currentStrikerId,
        non_striker_id: currentNonStrikerId,
        bowler_id: currentBowlerId,
        over_number: Math.floor(innings.totalBalls / 6),
        ball_number: ((innings.totalBalls - (isLegal ? 1 : 0)) % 6) + 1,
        is_legal_ball: isLegal,
        shot_zone: zone,
        wagon_wheel_zone: zone,
        runs_scored: score,
        extras_runs: type === 'wide' || type === 'no-ball' ? 1 : 0,
        extras_type: type === 'legal' ? null : type,
        event_type: isWicket ? 'wicket' : (type === 'legal' ? 'ball' : 'extra'),
        innings_number: store.currentInnings,
        wicket_type: wicketType,
        is_penalty: false,
        commentary: commentary || '',
        generated_commentary: commentary || '',
        tournament_id: matchMeta?.tournamentId || null
      };

      if (!navigator.onLine || isOfflineStore) {
        store.enqueueOfflineBall(payload);
        toast.error(`Offline: Ball queued (${store.offlineQueue.length + 1}/10)`);
        syncToDatabase(store); // retain local state mirror
        return;
      }
      
      setIsSyncing(true);
      setSyncQueue(prev => prev + 1);

      try {
        // If coming back online with a queue, do a sanity check on Database "Split-Brain" State
        if (store.offlineQueue.length > 0) {
           const dbStateRaw = await fetch(`${baseUrl}/matches/${activeMatchId}`);
           if (dbStateRaw.ok) {
             const dbMatch = await dbStateRaw.json();
             // Just pull the current dbBalls via dbMatch innings length if we want split brain logic
             // For now, we will flush the queue unconditionally, but if you want strict checking:
             // if (dbMatch.historyLength !== localLength) { flushQueue }
           }
           
           // Flush Offline Queue sequentially
           for (const queuedBall of store.offlineQueue) {
             await fetch(`${baseUrl}/score/ball`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}` },
               body: JSON.stringify(queuedBall)
             });
           }
           store.clearOfflineQueue();
           toast.success("Offline queue fully synced!");
        }

        const response = await fetch(`${baseUrl}/score/ball`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Cloud sync returned ${response.status}`);
        }

        // Success! Force MatchCenter to update so public view is in sync
        syncWithCloud().catch(() => {});
        syncToDatabase(store);
        
      } catch (err) {
        console.error(`[Sync] Ball sync failed (Attempt ${retryCount + 1}):`, err);
        
        if (retryCount < 2) {
          // Exponential backoff: 1s, 2s
          const delay = (retryCount + 1) * 1000;
          setTimeout(() => syncBallToCloud(retryCount + 1), delay);
        } else {
          // If we hard fail even after retries, enqueue the ball
          store.enqueueOfflineBall(payload);
          toast.error("Cloud Sync Failed. Ball saved to Offline Queue.", { id: 'sync-fail' });
          syncToDatabase(store);
        }
      } finally {
        setSyncQueue(prev => Math.max(0, prev - 1));
        if (syncQueue <= 1) setIsSyncing(false);
      }
    };

    syncBallToCloud();

    const sId = store.strikerId || '';
    const bId = store.currentBowlerId || '';
    const sName = getPlayerName(sId);
    const bName = getPlayerName(bId);

    // Milestone Detection is now handled atomically inside matchStore.ts recordBall action.
    // The store sets pendingMilestone which triggers the UI effect above.

    syncToDatabase(store);

    if (score === 4 && subType === 'bat') {
      milestoneRef.current?.trigger({ type: 'FOUR', playerName: sName });
    } else if (score === 6 && subType === 'bat') {
      milestoneRef.current?.trigger({ type: 'SIX', playerName: sName });
    }

    if (isWicket) {
      const victimId = outPlayerId || sId;
      const bStat = innings.battingStats[victimId];
      // Note: WICKET splash moved to triggerWicketSplash to avoid double appearance.
      // Keeping Hat-trick and multi-wicket logic here as they fire on ball record.

      const bowlerBalls = (innings.history || []).filter(b => b.bowlerId === bId && b.isLegal);
      if (bowlerBalls.length >= 3) {
        const last3 = bowlerBalls.slice(-3);
        const isHatTrick = last3.every(b => b.isWicket && !['Run Out', 'Retired Hurt', 'Retired Out'].includes(b.wicketType || ''));
        if (isHatTrick) {
          milestoneRef.current?.trigger({ type: 'HAT_TRICK', playerName: bName });
        }
      }

      const bwStat = innings.bowlingStats[bId];
      if (bwStat) {
        if (bwStat.wickets === 5) {
          milestoneRef.current?.trigger({ type: 'FIVE_WICKET', playerName: bName, subText: `${bwStat.wickets}-${bwStat.runs}` });
        } else if (bwStat.wickets === 4) {
          milestoneRef.current?.trigger({ type: 'FOUR_WICKET', playerName: bName, subText: `${bwStat.wickets}-${bwStat.runs}` });
        }
      }
    }

    // Milestone logic moved up before syncToDatabase to ensure notification flags are persisted.

    const isLegalBall = type !== 'wide' && type !== 'no-ball';
    if (isLegalBall) {
      const updatedTotalBalls = innings.totalBalls + 1;

      const willInningsFinish =
        (innings.wickets + (isWicket && wicketType !== 'Retired Hurt' ? 1 : 0) === 10) ||
        (updatedTotalBalls >= (store.maxOvers || 20) * 6) ||
        (store.currentInnings === 2 && (innings.totalRuns + score) > (store.innings1?.totalRuns || 0));

      if (updatedTotalBalls % 6 === 0 && updatedTotalBalls > 0 && !willInningsFinish) {
        setIsOverComplete(true);
        store.updateMatchSettings({
          isWaitingForBowler: true,
          currentBowlerId: null
        });

        setTimeout(() => setShowBowlerModal(true), 1200);
      }
    }
  };

  const attemptRecord = (score: number, type: any = 'legal', isWicket: boolean = false, wicketType?: any, subType: any = 'bat', outPlayerId?: string, newBatterId?: string) => {
    let typeKey: CommentaryEventType = 'DOT';
    if (isWicket) typeKey = 'WICKET';
    else if (score === 6 && subType === 'bat') typeKey = 'SIX';
    else if (score === 4 && subType === 'bat') typeKey = 'FOUR';
    else if (score === 3 && subType === 'bat') typeKey = 'TRIPLE';
    else if (score === 2 && subType === 'bat') typeKey = 'DOUBLE';
    else if (score === 1 && subType === 'bat') typeKey = 'SINGLE';
    else if (score === 0 && subType === 'bat') typeKey = 'DOT';

    let comm = currentPreviews[typeKey] || "";

    if (!comm) {
      const list = nextCommentarySuggestions[typeKey];
      if (list && list.length > 0) {
        comm = list[Math.floor(Math.random() * list.length)];
      } else {
        comm = getRandomCommentary(typeKey);
      }
    }

    // Dynamic substitution
    const strikerName = getPlayerName(store.strikerId);
    comm = comm.replace(/\{batsman\}/g, strikerName)
               .replace(/\{striker\}/g, strikerName)
               .replace(/\{bowler\}/g, getPlayerName(store.currentBowlerId));

    shufflePreview(typeKey);

    const worthWickets = ['Caught', 'Stumped', 'Run Out', 'Bowled', 'LBW'];
    const isWagonWorthy = (score > 0) || (isWicket && worthWickets.some(w => String(wicketType || '').includes(w)));

    if (store.useWagonWheel && subType === 'bat' && isWagonWorthy) {
      if (store.wagonWheelQuickSave) {
        const finalComm = comm.replace(/\{zone\}/g, 'Straight');
        hapticFeedback(score >= 4 ? 'heavy' : 'light');
        handleRecord(score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, 'Straight', finalComm);
      } else {
        setShowWagonWheelModal({ score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, commentary: comm });
      }
    } else {
      const finalComm = comm.replace(/\{zone\}/g, '');
      hapticFeedback(score >= 4 ? 'heavy' : 'light');
      handleRecord(score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, undefined, finalComm);
    }
  };

  const triggerWicketSplash = (type: string) => {
    const vId = runOutInvolved?.victimId || store.strikerId;
    if (!vId) return;

    // Guard against multiple splashes for the same wicket event
    const splashId = `${vId}_${currentInnings?.totalBalls || 0}`;
    if (lastSplashRef.current === splashId) return;
    lastSplashRef.current = splashId;

    const vName = getPlayerName(vId);
    const bStat = currentInnings?.battingStats[vId];

    // Detect duck/golden duck before ball is recorded (balls will be 0 for golden duck at this point)
    if (bStat && bStat.runs === 0) {
      if (bStat.balls === 0) {
        milestoneRef.current?.trigger({ type: 'GOLDEN_DUCK', playerName: vName });
      } else {
        milestoneRef.current?.trigger({ type: 'DUCK', playerName: vName });
      }
    } else {
      milestoneRef.current?.trigger({ type: 'WICKET', playerName: vName });
    }

    // NEW: Detect if this wicket results in All Out (10 wickets)
    // currentInnings.wickets is currently 9 if this is the 10th wicket.
    const isNowAllOut = currentInnings && currentInnings.wickets === 9;
    
    if (isNowAllOut || isBattingFinishing) {
      if (isNowAllOut) {
        // Record the wicket IMMEDIATELY since no new batter is needed
        let dismissal = type;
        if (pendingFielderId && (type === 'Caught' || type === 'Stumped')) {
          const fielder = [...players, ...opponentPlayers].find(fp => fp.id === pendingFielderId);
          dismissal = `${type === 'Caught' ? 'c' : 'st'} ${fielder?.name || 'Fielder'}`;
        }
        
        if (runOutInvolved) {
          handleRecord(runOutInvolved.runs, runOutInvolved.ballType || 'legal', true, 'Run Out', runOutInvolved.subType || 'bat', runOutInvolved.victimId, undefined);
          setRunOutInvolved(null);
        } else {
          handleRecord(0, 'legal', true, dismissal, 'bat', undefined, undefined);
        }
      }

      setTimeout(() => setShowInningsReview(true), 1500);
      return;
    }

    setTimeout(() => {
      setShowBatterSelectModal(true);
    }, 1500);
  };

  const handleConfirmInnings = async () => {
    if (!activeMatchId || !currentInnings) return;
    
    // Safety check: Don't finalize an innings that hasn't even started
    if (currentInnings.totalBalls === 0 && currentInnings.totalRuns === 0) {
      console.warn("[Scorer] Finalization blocked: No balls recorded in current innings.");
      setShowInningsReview(false);
      return;
    }

    setSyncStatus('loading');

    try {
      const totalScore = currentInnings.totalRuns;
      const totalWickets = currentInnings.wickets;
      const target = (store.innings1?.totalRuns || 0) + 1;

      // Clean store to avoid massive payload (strip UNDO historyStack)
      const exportableStore = JSON.parse(JSON.stringify(store));
      delete exportableStore.historyStack;
      if (exportableStore.backup_data) delete exportableStore.backup_data;

      const updatePayload: any = {
        tournament_id: matchMeta?.tournamentId,
        live_data: exportableStore
      };

      const playerStatsUpdate: any[] = [];
      const homeXI = store.homeXI || [];

      homeXI.forEach(pid => {
        let runs = 0;
        let balls = 0;
        let fours = 0;
        let sixes = 0;
        let isNotOut = false;
        let playedInnings = false;
        
        let wickets = 0;
        let bowlingRuns = 0;
        let bowlingOvers = 0;
        let maidens = 0;
        let wides = 0;
        let no_balls = 0;
        let bowledInnings = false;
        let lastBStat: any = null;

        [store.innings1, store.innings2].forEach((inn) => {
          if (!inn) return;
          
          const bStat = inn.battingStats[pid];
          if (bStat) {
            lastBStat = bStat;
            runs += (bStat.runs || 0);
            balls += (bStat.balls || 0);
            fours += (bStat.fours || 0);
            sixes += (bStat.sixes || 0);
            if (bStat.status === 'batting') isNotOut = true;
            // Only count as an innings if the player actually faced a ball or was at the crease (not DNB)
            if ((bStat.balls || 0) > 0 || bStat.status !== 'dnb') playedInnings = true;
          }

          const bwStat = inn.bowlingStats[pid];
          if (bwStat) {
            wickets += (bwStat.wickets || 0);
            bowlingRuns += (bwStat.runs || 0);
            bowlingOvers += (bwStat.overs || 0);
            maidens += (bwStat.maidens || 0);
            
            // Calculate extras from history
            const bowlerEvents = (inn.history || []).filter(b => String(b.bowlerId) === String(pid));
            wides += bowlerEvents.filter(b => b.type === 'wide').length;
            no_balls += bowlerEvents.filter(b => b.type === 'no-ball').length;
            
            if (bwStat.overs > 0) bowledInnings = true;
          }
        });

        if (playedInnings || bowledInnings) {
          playerStatsUpdate.push({
            playerId: pid,
            matchId: activeMatchId,
            tournamentId: matchMeta?.tournamentId || null,
            runs,
            balls,
            fours,
            sixes,
            wickets,
            bowlingRuns,
            bowlingOvers,
            maidens,
            wides,
            no_balls,
            isNotOut,
            outHow: lastBStat?.outHow || (lastBStat?.status === 'dnb' ? 'Did Not Bat' : isNotOut ? 'Not Out' : 'Out')
          });
        }
      });

      if (store.currentInnings === 1) {
        updatePayload.innings_1_score = totalScore;
        updatePayload.innings_1_wickets = totalWickets;
        updatePayload.targetScore = target;
      } else {
        updatePayload.status = 'completed';
        updatePayload.finalScoreHome = store.innings1?.totalRuns;
        updatePayload.finalScoreAway = store.innings2?.totalRuns;

        let resultMessage = '';
        if (totalScore >= target) {
          resultMessage = `${(store.innings2?.battingTeamId === 'HOME' ? 'INDIAN STRIKERS' : store.opponentName).toUpperCase()} WON BY ${10 - totalWickets} WICKETS`;
        } else if (totalScore === target - 1) {
          resultMessage = "MATCH TIED";
        } else {
          resultMessage = `${(store.innings1?.battingTeamId === 'HOME' ? 'INDIAN STRIKERS' : store.opponentName).toUpperCase()} WON BY ${target - 1 - totalScore} RUNS`;
        }
        updatePayload.resultSummary = resultMessage;
      }

      if (updatePayload.status === 'completed') {
        await finalizeMatch(activeMatchId, updatePayload, playerStatsUpdate);
      } else {
        await updateMatch(activeMatchId, updatePayload);
      }
      if (updatePayload.status === 'completed') {
        fetchPlayers(); // Sync global stats after match completion
      }
      setSyncStatus('success');

      setTimeout(() => {
        setShowInningsReview(false);
        setSyncStatus('idle');

        if (store.currentInnings === 1) {
          setSetupStep('openers_bat');
          setSelStriker(null);
          setSelNonStriker(null);
          setSelBowler(null);
        } else {
          setShowMatchSummaryModal(true);
        }
      }, 1500);

    } catch (err) {
      console.error("Failed to finalize innings:", err);
      setSyncStatus('error');
    }
  };

  const handleDeclareInnings = () => {
    if (window.confirm("Are you sure you want to DECLARE the current innings?")) {
      store.declareInnings();
      setShowSettingsDrawer(false);
      setShowInningsReview(true);
    }
  };

  const calculateTopPerformers = () => {
    const scores: Record<string, { id: string, name: string, score: number, runs: number, balls: number, wickets: number, maidens: number, runsConceded: number, overs: number, fours: number, sixes: number }> = {};

    [store.innings1, store.innings2].forEach(inn => {
      if (!inn) return;
      Object.entries(inn.battingStats || {}).forEach(([id, s]: [string, any]) => {
        if (!scores[id]) scores[id] = { id, name: getPlayerName(id), score: 0, runs: 0, balls: 0, wickets: 0, maidens: 0, runsConceded: 0, overs: 0, fours: 0, sixes: 0 };
        scores[id].runs += s.runs;
        scores[id].balls += s.balls;
        scores[id].fours += s.fours || 0;
        scores[id].sixes += s.sixes || 0;
        scores[id].score += s.runs + ((s.fours || 0) * 2) + ((s.sixes || 0) * 4);
        if (s.runs >= 50) scores[id].score += 50;
        if (s.runs >= 100) scores[id].score += 100;
      });
      Object.entries(inn.bowlingStats || {}).forEach(([id, s]: [string, any]) => {
        if (!scores[id]) scores[id] = { id, name: getPlayerName(id), score: 0, runs: 0, balls: 0, wickets: 0, maidens: 0, runsConceded: 0, overs: 0, fours: 0, sixes: 0 };
        scores[id].wickets += s.wickets;
        scores[id].runsConceded += s.runs;
        scores[id].overs += s.overs || 0;
        scores[id].maidens += s.maidens || 0;
        scores[id].score += (s.wickets * 25) + ((s.maidens || 0) * 10);
      });
    });

    // Only include Indian Strikers players in the spotlight
    return Object.values(scores)
      .filter(p => players.some((hp: Player) => String(hp.id) === String(p.id)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  };

  const downloadHeroPoster = async () => {
    if (!posterRef.current || isGeneratingPoster) return;
    setIsGeneratingPoster(true);
    try {
      // Ensure element is ready for capture
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#020617',
        scale: 3, // Higher resolution for premium feel
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: (clonedDoc) => {
          // You can modify the clone here if needed to fix rendering issues
          const el = clonedDoc.querySelector('[data-poster-root]');
          if (el) (el as HTMLElement).style.left = '0';
        }
      });
      
      const playerName = getPlayerName(store.manOfTheMatch);
      const link = document.createElement('a');
      link.download = `MatchHero_${playerName.replace(/\s+/g, '_')}_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error("Poster Generation Failed:", err);
    } finally {
      setIsGeneratingPoster(false);
    }
  };


  const isLocked = (matches || []).find(m => m.id === activeMatchId)?.isLocked;

  if (!currentInnings) {
    if (setupStep !== null) return null; // Component handles its own setup view
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#001F3F', color: '#FFF' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#FAB005', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 16, fontSize: '0.8rem', opacity: 0.6, fontWeight: 900, letterSpacing: 1 }}>SYNCHRONIZING MATCH STATE...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const strikerStats = currentInnings?.battingStats[store.strikerId || ''] || { runs: 0, balls: 0 };
  const nonStrikerStats = currentInnings?.battingStats[store.nonStrikerId || ''] || { runs: 0, balls: 0 };
  const bowlerStats = currentInnings?.bowlingStats[store.currentBowlerId || ''] || { overs: 0, runs: 0, wickets: 0 };


  const isQueueFull = store.offlineQueue && store.offlineQueue.length >= 10 && isOfflineStore;

  try {
    return (
    <DashboardContainer>
      {isQueueFull && (
        <PremiumModalOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ zIndex: 9999 }}>
          <div style={{ background: '#001F3F', padding: '32px', borderRadius: '16px', textAlign: 'center', border: '2px solid #FF4D4D' }}>
             <CloudOff size={48} color="#FF4D4D" style={{ margin: '0 auto 16px' }} />
             <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFFFFF', marginBottom: 8 }}>WAITING FOR CONNECTION</h2>
             <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: 16 }}>Offline queue limit reached (10 balls). Please reconnect to the internet to sync and continue scoring.</p>
             <div style={{ fontSize: '0.8rem', color: '#FAB005', fontWeight: 700 }}>{store.offlineQueue?.length || 0} balls waiting to sync.</div>
          </div>
        </PremiumModalOverlay>
      )}
      <>
        <Header>
          <button
            title="Back to Match Center"
            onClick={() => {
              if (window.confirm("Are you sure you want to exit? Unsaved progress for this ball may be lost.")) {
                navigate('/match-center');
              }
            }}
            className="p-1 hover:bg-slate-100 rounded-lg transition-all text-slate-500 flex items-center"
          >
            <ChevronLeft size={18} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '0 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
              <img
                src={store.homeLogo || '/INS%20LOGO.PNG'}
                style={{ width: 30, height: 30, objectFit: 'contain' }}
                alt="H"
              />
              <span style={{ fontSize: '12px', fontWeight: 900, color: 'rgba(248, 248, 249, 1)', letterSpacing: '-0.2px' }}>
                {store.innings1?.battingTeamId === 'HOME' ? 'INDIAN STRIKERS' : (store.opponentName || 'OPPONENT').toUpperCase()}
              </span>
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#FAB005' }}>VS</span>
              <span style={{ fontSize: '12px', fontWeight: 900, color: 'rgba(252, 253, 253, 1)', letterSpacing: '-0.2px' }}>
                {store.innings1?.battingTeamId === 'AWAY' ? 'INDIAN STRIKERS' : (store.opponentName || 'OPPONENT').toUpperCase()}
              </span>
              {store.awayLogo || matchMeta?.opponentLogo ? (
                <img
                  src={store.awayLogo || matchMeta?.opponentLogo}
                  style={{ width: 30, height: 30, objectFit: 'contain' }}
                  alt="A"
                />
              ) : <Shield size={24} color="#338feba9" />}
            </div>
            <div style={{ fontSize: '7.5px', fontWeight: 900, opacity: 0.9, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
              {store.toss.winnerId && (
                <div style={{ color: '#FAB005' }}>
                  {store.toss.winnerId === 'HOME' ? 'Indian Strikers' : (store.opponentName || 'OPPONENT')} won toss & elected to {store.toss.choice}
                </div>
              )}
              <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                {`Innings ${store.currentInnings}  •  ${store.maxOvers || 20} Overs`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SyncStatus />
            <button
              title="Match Settings"
              onClick={() => setShowSettingsDrawer(true)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            >
              <Settings size={16} />
            </button>
          </div>
        </Header>

        <AnimatePresence>

          {showLineups && (
            <PremiumModalOverlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLineups(false)}
            >
              <PremiumModalContent onClick={e => e.stopPropagation()}>
                <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>TEAM SQUADS</h2>
                  <button title="Close" onClick={() => setShowLineups(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', color: 'rgba(84, 147, 202, 1)', marginBottom: 8, textTransform: 'uppercase' }}>Indian Strikers</h3>
                    <SelectionGrid style={{ maxHeight: '50vh' }}>
                      {(players || [])
                        .filter((p: Player) => (homeXI || []).includes(p.id))
                        .map((p: Player) => (
                          <div key={p.id} style={{
                            fontSize: '0.6rem',
                            padding: '4px 4px',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: '#FFFFFF',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontWeight: 700 }}>{p.name}</span>
                            <span style={{ opacity: 0.6, fontSize: '0.55rem', fontWeight: 400, textTransform: 'uppercase' }}>{p.role}</span>
                          </div>
                        ))}
                      {homeXI.length === 0 && <div style={{ opacity: 0.4, fontSize: '0.55rem' }}>No XI Selected</div>}
                    </SelectionGrid>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', color: '#FAB005', marginBottom: 8, textTransform: 'uppercase' }}>{matchMeta?.opponentName || 'OPPONENT'}</h3>
                    <SelectionGrid style={{ maxHeight: '50vh' }}>
                      {(opponentPlayers || [])
                        .filter(p => (awayXI || []).includes(p.id))
                        .map(p => (
                          <div key={p.id} style={{
                            fontSize: '0.6rem',
                            padding: '4px 4px',
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            color: '#FFFFFF',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                            <span style={{ opacity: 0.6, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{p.role}</span>
                          </div>
                        ))}
                      {awayXI.length === 0 && <div style={{ opacity: 0.4, fontSize: '0.8rem' }}>No XI Selected</div>}
                    </SelectionGrid>
                  </div>
                </div>
              </PremiumModalContent>
            </PremiumModalOverlay>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: !isOnline ? '#EF4444' : (isSyncing ? '#FAB005' : '#10B981'),
              boxShadow: isOnline && !isSyncing ? '0 0 8px rgba(16,185,129,0.5)' : 'none'
            }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#001F3F', opacity: 0.6, letterSpacing: 0.5 }}>
              {!isOnline ? 'OFFLINE' : (isSyncing ? 'SYNCING...' : 'LIVE TUNNEL')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(() => {
                const localBalls = (store.innings1?.totalBalls || 0) + (store.innings2?.totalBalls || 0);
                const cloudBalls = (matchMeta?.live_data?.innings1?.totalBalls || 0) + (matchMeta?.live_data?.innings2?.totalBalls || 0);
                if (cloudBalls > localBalls) {
                  return (
                    <button 
                      onClick={() => {
                        if (matchMeta?.live_data) {
                          store.initializeMatch({
                            matchId: matchMeta.id,
                            matchType: matchMeta.matchFormat || 'T20',
                            tournament: matchMeta.tournament || 'Live Match',
                            ground: matchMeta.venue || 'Local Ground',
                            opponentName: matchMeta.opponentName || 'OPPONENT',
                            maxOvers: matchMeta.maxOvers || 20,
                            homeXI: matchMeta.homeTeamXI || [],
                            awayXI: matchMeta.opponentTeamXI || [],
                            homeLogo: teamLogo,
                            awayLogo: matchMeta.opponentLogo || '',
                            liveData: matchMeta.live_data
                          });
                          toast.success("Corrected from Mobile!");
                        }
                      }}
                      style={{ 
                        background: '#FAB005', border: 'none', borderRadius: 4, 
                        padding: '2px 8px', color: '#000', fontSize: '0.6rem', 
                        fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <CloudDownload size={10} /> DOWNLOAD CLOUD SCORE
                    </button>
                  );
                }
                return null;
            })()}
            <button 
              onClick={() => {
                const totalBalls = currentInnings?.totalBalls || 0;
                if (totalBalls % 6 === 0) {
                  store.updateMatchSettings({ isWaitingForBowler: true, currentBowlerId: null });
                  toast.success("Ready for new bowler");
                } else {
                  toast.error("Over not finished yet");
                }
              }}
              style={{
                background: 'rgba(51,154,240,0.1)', border: '1px solid rgba(51,154,240,0.2)',
                borderRadius: 4, padding: '2px 6px', color: '#339AF0', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer'
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
              }}
              style={{ 
                background: 'none', border: 'none', color: 'rgba(0,31,63,0.4)', 
                fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <Cloud size={10} /> FORCE RE-SYNC
            </button>
          </div>
        </div>

        <ScoreSection>
          {/* LEFT: STATS & SCORE */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid #f1f3f5', paddingRight: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              {/* CRR */}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase' }}>CRR</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#001F3F' }}>
                  {(() => {
                    const totalBalls = currentInnings?.totalBalls || 0;
                    if (totalBalls === 0) return '0.00';
                    return ((currentInnings?.totalRuns || 0) / (totalBalls / 6)).toFixed(2);
                  })()}
                </div>
              </div>

              {/* PROJECTED */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase' }}>Proj</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#001F3F' }}>
                  {(() => {
                    const totalBalls = currentInnings?.totalBalls || 0;
                    const rr = totalBalls === 0 ? 0 : (currentInnings?.totalRuns || 0) / (totalBalls / 6);
                    return Math.ceil(rr * (store.maxOvers || 20));
                  })()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <MainScore style={{ fontSize: '2.4rem', margin: 0 }}>
                  {currentInnings?.totalRuns || 0}/{currentInnings?.wickets || 0}
                </MainScore>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <OversText style={{ fontSize: '0.8rem', fontWeight: 900, opacity: 0.8, color: '#1a73e8' }}>
                  {store.getOvers(currentInnings?.totalBalls || 0)} OVERS
                </OversText>
                <button
                  onClick={() => setShowScorecardModal(true)}
                  style={{
                    border: 'none', padding: '2px 8px', borderRadius: 4,
                    color: '#1a73e8', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(26,115,232,0.05)'
                  }}
                >
                  <LayoutList size={10} /> S/C
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: WORM CHART */}
          <div style={{ flex: 1.5, position: 'relative', minWidth: 0 }}>
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wormData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="over" 
                    fontSize={8} 
                    fontWeight={700} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#adb5bd' }}
                  />
                  <YAxis 
                    fontSize={8} 
                    fontWeight={700} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#adb5bd' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 700 }}
                    itemStyle={{ padding: '0' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="inn1" 
                    name="1st Inn" 
                    stroke="#1a73e8" 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    animationDuration={1000}
                    connectNulls
                  />
                  {store.innings2 && (
                    <Line 
                      type="monotone" 
                      dataKey="inn2" 
                      name="2nd Inn" 
                      stroke="#FF4B2B" 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      animationDuration={1000}
                      connectNulls
                    />
                  )}
                </LineChart>
             </ResponsiveContainer>

             {store.isFreeHit && (
               <div style={{ position: 'absolute', top: 0, left: 0 }}>
                  <FreeHitBadge
                    animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ fontSize: '8px', padding: '2px 8px' }}
                  >
                    FREE HIT
                  </FreeHitBadge>
               </div>
             )}
          </div>
        </ScoreSection>



        <ActiveParticipants style={{ borderBottom: 'none' }}>
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
          <ParticipantCard style={{ gridColumn: 'span 2' }}>
            <CardHeader>
              <span style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bowler</span>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button
                  onClick={() => {
                    if (isLocked) return;
                    setShowBowlerModal(true);
                  }}
                  style={{
                    background: 'rgba(51,154,240,0.1)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '2px 8px',
                    color: '#339AF0',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.5 : 1
                  }}
                >
                  CHANGE
                </button>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.4, textTransform: 'uppercase' }}>This Over</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#001F3F' }}>
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
              </div>
            </CardHeader>
            <StatValue style={{ 
              color: (bowlerStats.overs >= Math.ceil((store.maxOvers || 20) / 5)) ? '#FF4D4D' : 'inherit'
            }}>
              {getPlayerName(store.currentBowlerId)}
            </StatValue>
            <div style={{ 
              fontSize: '0.9rem', 
              fontWeight: 700,
              color: (bowlerStats.overs >= Math.ceil((store.maxOvers || 20) / 5)) ? '#FF4D4D' : 'inherit'
            }}>
              {bowlerStats.wickets}-{bowlerStats.runs} ({bowlerStats.overs})
              {bowlerStats.overs >= Math.ceil((store.maxOvers || 20) / 5) && " • QUOTA DONE"}
            </div>
          </ParticipantCard>
        </ActiveParticipants>

        <PartnershipRow style={{ background: 'rgba(0, 31, 63, 0.05)', padding: '4px 10px', marginBottom: 0 }}>
          <PartnershipMain style={{ fontSize: '10px' }}>
            PARTNERSHIP: <b>{partnershipData.totalRuns}</b> ({partnershipData.totalBalls})
          </PartnershipMain>
          <PartnershipSub style={{ fontSize: '10px' }}>
            {getPlayerName(store.strikerId)} <b>{strikerStats.runs}({strikerStats.balls})*</b> | {getPlayerName(store.nonStrikerId)} <b>{nonStrikerStats.runs}({nonStrikerStats.balls})</b>
          </PartnershipSub>
        </PartnershipRow>

        <ScoringInterface style={{ position: 'fixed', padding: '10px 10px 10px' }}>
          {/* UNDO & UTILITY ROW - FIXED FOOTER */}
          <div style={{ padding: '0 10px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 30 }}>
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

          <div style={{ background: '#001F3F', margin: '0 0 2px', borderRadius: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TimelineContainer ref={timelineRef} id="match-timeline" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {(() => {
                const balls = currentInnings?.history || [];
                const last30 = balls.slice(-30);
                return last30.map((ball: any, idx: number) => {
                  let display = ball.runs.toString();
                  if (ball.isWicket) {
                    const prefix = ball.type === 'no-ball' ? 'NB' : ball.type === 'wide' ? 'WD' : '';
                    const amount = ball.runs > 0 ? `+${ball.runs}` : '';
                    display = prefix ? `${prefix}${amount}+W` : 'W';
                  }
                  else if (ball.type === 'wide') display = `WD${ball.runs > 0 ? '+' + ball.runs : ''}`;
                  else if (ball.type === 'no-ball') display = `NB${ball.runs > 0 ? '+' + ball.runs : ''}`;
                  else if (ball.type === 'leg-bye') display = `LB${ball.runs}`;
                  else if (ball.type === 'bye') display = `B${ball.runs}`;
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

        {showBowlerModal && (
          <ModalOverlay onClick={() => setShowBowlerModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>SELECT NEXT BOWLER</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 20 }}>Choose the bowler for the next over</p>

              <SelectionGrid style={{ maxHeight: '50vh' }}>
                {(() => {
                  const fieldingTeamId = currentInnings.bowlingTeamId;
                  const fieldingTeamXI = fieldingTeamId === 'HOME' ? homeXI : awayXI;
                  const fieldingPool = fieldingTeamId === 'HOME' ? players : opponentPlayers;
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
                          <User size={16} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{bStats.wickets}-{bStats.runs} ({bStats.overs})</div>
                          </div>
                        </PlayerCard>
                      );
                    });
                })()}
              </SelectionGrid>

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
                  const fieldingTeamXI = fieldingTeamId === 'HOME' ? homeXI : awayXI;
                  const fieldingPool = fieldingTeamId === 'HOME' ? players : opponentPlayers;
                  return (fieldingPool || [])
                    .filter((p: any) => (fieldingTeamXI || []).includes(p.id))
                    .map((p: any) => (
                      <PlayerCard key={p.id} onClick={() => {
                        setPendingFielderId(p.id);
                        setShowFielderModal(false);
                        triggerWicketSplash(pendingWicketType);
                      }}>
                        <User size={16} />
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
                                event_type: 'extra',
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
                              event_type: 'extra',
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
                              event_type: 'extra',
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
        {isInningsBreak && (
          <InningsBreakModal>
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20px' }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 24 }}>
                  <img src={store.homeLogo || '/INS%20LOGO.PNG'} style={{ width: 60, height: 60, objectFit: 'contain' }} alt="H" />
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'rgba(0,0,0,0.1)' }}>VS</span>
                  {store.awayLogo || matchMeta?.opponentLogo ? (
                    <img src={store.awayLogo || matchMeta?.opponentLogo} style={{ width: 60, height: 60, objectFit: 'contain' }} alt="A" />
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
                    <div key={p.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '14px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 4, color: '#FFF' }}>{p.name}</p>
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
                    store.undoLastBall();
                    setIsOverComplete(false);
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
                  setSetupStep('openers_bat');
                  setSelStriker(null);
                  setSelNonStriker(null);
                  setSelBowler(null);
                }}
              >
                START 2ND INNINGS
              </ActionButton>
            </div>
          </InningsBreakModal>
        )}

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
                    return `${store.innings2?.battingTeamId === 'HOME' ? 'INDIAN STRIKERS' : (matchMeta?.opponentName || 'Away')} WON BY ${10 - (store.innings2?.wickets || 0)} WICKETS`;
                  } else if (i1 > i2) {
                    return `${store.innings1?.battingTeamId === 'HOME' ? 'INDIAN STRIKERS' : (matchMeta?.opponentName || 'Away')} WON BY ${i1 - i2} RUNS`;
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
                  onClick={() => {
                    handleUpdateMatchStatus('completed');
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
                    <img src="/INS%20LOGO.PNG" className="w-14 h-14 object-contain filter drop-shadow-2xl" alt="Logo" />
                    <div className="text-right">
                      <p className="text-[10px] font-black italic tracking-[0.2em] text-sky-400 uppercase">Indian Strikers Official</p>
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
                            crossOrigin="anonymous"
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
                        INDIAN STRIKERS VS {(matchMeta?.opponentName || 'OPPONENT').toUpperCase()}
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
                      {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-sky-500 rounded-full" />)}
                    </div>
                  </div>
                </HeroPosterWrapper>
              </PosterContainer>
            </ModalContent>
          </ModalOverlay>
        )}
        {showBatterSelectModal && (
          <ModalOverlay onClick={() => setShowBatterSelectModal(false)}>
            <ModalContent onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>SELECT NEXT BATTER</h2>
              <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 20 }}>Choose player from the bench</p>

              <SelectionGrid style={{ maxHeight: '50vh' }}>
                {(() => {
                  const battingTeamId = currentInnings.battingTeamId;
                  const battingTeamXI = battingTeamId === 'HOME' ? homeXI : awayXI;
                  const battingPool = battingTeamId === 'HOME' ? players : opponentPlayers;
                  const available = (battingPool || []).filter((p: any) =>
                    battingTeamXI.includes(p.id) &&
                    !['out', 'batting', 'retired'].includes(currentInnings.battingStats[p.id]?.status || '')
                  );
                  return available
                    .filter((p: any) => {
                      const isAlreadyBatting = p.id === store.strikerId || p.id === store.nonStrikerId;
                      const alreadyOut = currentInnings.battingStats[p.id]?.status === 'out';
                      return !isAlreadyBatting && !alreadyOut;
                    })
                    .map((p: any) => (
                      <PlayerCard
                        key={p.id}
                        onClick={() => {
                          if (runOutInvolved) {
                            attemptRecord(
                              runOutInvolved.runs,
                              runOutInvolved.ballType || 'legal',
                              true,
                              'Run Out',
                              runOutInvolved.subType || 'bat',
                              runOutInvolved.victimId,
                              p.id
                            );
                            setRunOutInvolved(null);
                          } else {
                            let dismissal = pendingWicketType;
                            if (pendingFielderId && (pendingWicketType === 'Caught' || pendingWicketType === 'Stumped')) {
                              const fielder = [...players, ...opponentPlayers].find(fp => fp.id === pendingFielderId);
                              dismissal = `${pendingWicketType === 'Caught' ? 'c' : 'st'} ${fielder?.name || 'Fielder'}`;
                            }
                            attemptRecord(0, 'legal', true, dismissal, 'bat', undefined, p.id);
                          }
                          setShowBatterSelectModal(false);
                          setShowWicketModal(false);
                          setPendingWicketType(null);
                          setPendingFielderId(null);
                        }}
                      >
                        <User size={16} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                            {currentInnings.battingStats[p.id]?.status === 'retired_hurt' ? 'RETIRED HURT' : (p.role || 'Player')}
                          </div>
                        </div>
                      </PlayerCard>
                    ));
                })()}
                {(() => {
                  const battingTeamId = currentInnings.battingTeamId;
                  const battingXI = battingTeamId === 'HOME' ? homeXI : awayXI;
                  const battingPool = battingTeamId === 'HOME' ? players : opponentPlayers;
                  const available = (battingPool || []).filter((p: any) =>
                    battingXI.includes(p.id) &&
                    !['out', 'batting', 'retired'].includes(currentInnings.battingStats[p.id]?.status || '')
                  );
                  return available.length === 0 ? (
                    <div style={{ textAlign: 'center', opacity: 0.4, padding: 20 }}>No more players available.</div>
                  ) : null;
                })()}
              </SelectionGrid>

              <button
                onClick={() => setShowBatterSelectModal(false)}
                style={{ background: 'none', border: 'none', color: '#FAB005', fontSize: '0.9rem', fontWeight: 700, marginTop: 24, cursor: 'pointer', width: '100%' }}
              >
                CANCEL
              </button>
            </ModalContent>
          </ModalOverlay>
        )}
        {showScorecardModal && (
          <UniversalScorecard
            match={matchMeta as any}
            players={players}
            opponents={allOpponents}
            onClose={() => setShowScorecardModal(false)}
            isLive={true}
            activeInnings={store.currentInnings}
          />
        )}

        {/* ——— INNINGS REVIEW MODAL ——— */}
        {showInningsReview && (
          <PremiumModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PremiumModalContent style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(56, 189, 248, 0.1)', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Trophy size={32} color="#38BDF8" />
              </div>

              <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 900 }}>
                {store.currentInnings === 1 ? 'INNINGS 1 COMPLETE' : 'MATCH COMPLETE'}
              </h2>

              {store.currentInnings === 2 && store.innings1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, opacity: 0.5 }}>TARGET</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#38BDF8' }}>{(store.innings1?.totalRuns || 0) + 1}</div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, opacity: 0.5 }}>SCORE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FAB005' }}>{currentInnings?.totalRuns || 0}/{currentInnings?.wickets || 0}</div>
                  </div>
                </div>
              )}

              <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: 24 }}>Review the final stats before proceeding.</p>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, marginBottom: 32, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 900, opacity: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>Total Score</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: syncStatus === 'success' ? '#4ADE80' : '#FAB005' }}>{currentInnings?.totalRuns || 0}/{currentInnings?.wickets || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 900, opacity: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>Overs Bowled</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{store.getOvers(currentInnings?.totalBalls || 0)}</div>
                  </div>
                </div>
              </div>

              {syncStatus === 'error' && (
                <div style={{ background: 'rgba(255,77,77,0.1)', color: '#FF4D4D', padding: '12px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 600, marginBottom: 20 }}>
                  Network Error: Could not finalize match data.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ActionButton
                  $variant="primary"
                  onClick={handleConfirmInnings}
                  disabled={syncStatus === 'loading' || syncStatus === 'success'}
                  style={{ background: syncStatus === 'success' ? '#4ADE80' : undefined }}
                >
                  {syncStatus === 'loading' ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFF', borderRadius: '50%' }} />
                      FINALIZING...
                    </div>
                  ) : syncStatus === 'success' ? 'SUCCESS! ✅' : (
                    syncStatus === 'error' ? 'RETRY SYNC' : (store.currentInnings === 1 ? 'CONFIRM & START 2ND INNINGS' : 'CONFIRM & FINISH MATCH')
                  )}
                </ActionButton>

                {syncStatus !== 'success' && (
                  <button
                    onClick={() => {
                      store.undoLastBall();
                      setIsOverComplete(false);
                      setShowInningsReview(false);
                    }}
                    disabled={syncStatus === 'loading'}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#FFF', padding: '16px', borderRadius: 12, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Undo size={18} />
                    UNDO LAST BALL
                  </button>
                )}
              </div>
            </PremiumModalContent>
          </PremiumModalOverlay>
        )}

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
                          live_data: store, 
                          last_updated: new Date().toISOString() 
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
                  <ControlButton $variant="danger" onClick={handleDeclareInnings}>
                    <span>Declare Innings</span>
                    <Zap size={18} />
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
              </DrawerContent>
            </DrawerOverlay>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showWagonWheelModal && (
            <ModalOverlay onClick={() => setShowWagonWheelModal(null)}>
              <ModalContent onClick={e => e.stopPropagation()} style={{ background: '#081c15', maxWidth: 400 }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981', margin: 0 }}>SELECT SHOT ZONE</h2>
                  <p style={{ fontSize: '0.7rem', opacity: 0.6 }}>Tap the field where the ball was hit</p>
                  {(() => {
                    const sId = store.strikerId;
                    const striker = (players.find((p: Player) => p.id === sId) || opponentPlayers.find((p: any) => p.id === sId)) as any;
                    const isLH = striker?.battingStyle === 'Left Handed';
                    if (isLH) return <p style={{ fontSize: '0.6rem', color: '#FAB005', fontWeight: 900, marginTop: 4, letterSpacing: 1 }}>BATTING: LEFT-HANDED VIEW</p>;
                    return null;
                  })()}
                </div>

                <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: '#1b4332', borderRadius: '50%', border: '4px solid #2d6a4f', overflow: 'hidden' }}>
                  {/* 8 Zones with LH/RH Detection */}
                  {(() => {
                    const sId = store.strikerId;
                    const striker = (players.find((p: Player) => p.id === sId) || opponentPlayers.find((p: any) => p.id === sId)) as any;
                    const isLH = striker?.battingStyle === 'Left Handed';

                    const zones = [
                      { name: 'Third Man', top: '15%', left: isLH ? '85%' : '15%', color: '#94a3b8' },
                      { name: 'Point', top: '50%', left: isLH ? '95%' : '5%', color: '#38bdf8' },
                      { name: 'Cover', top: '80%', left: isLH ? '85%' : '15%', color: '#60a5fa' },
                      { name: 'Mid Off', top: '92%', left: '50%', color: '#818cf8' },
                      { name: 'Mid On', top: '80%', left: isLH ? '15%' : '85%', color: '#a78bfa' },
                      { name: 'Mid Wicket', top: '50%', left: isLH ? '5%' : '95%', color: '#c084fc' },
                      { name: 'Square Leg', top: '15%', left: isLH ? '15%' : '85%', color: '#f472b6' },
                      { name: 'Fine Leg', top: '8%', left: '50%', color: '#fb7185' }
                    ];

                    return zones.map(zone => (
                      <button
                        key={zone.name}
                        onClick={() => {
                          const p = showWagonWheelModal;
                          const strikerN = getPlayerName(store.strikerId);
                          const finalComm = p.commentary.replace(/\{batsman\}/g, strikerN)
                                                       .replace(/\{striker\}/g, strikerN)
                                                       .replace(/\{bowler\}/g, getPlayerName(store.currentBowlerId))
                                                       .replace(/\{zone\}/g, zone.name);
                          hapticFeedback(p.score >= 4 ? 'heavy' : 'light');
                          handleRecord(p.score, p.type, p.isWicket, p.wicketType, p.subType, p.outPlayerId, p.newBatterId, zone.name, finalComm);
                          setShowWagonWheelModal(null);
                        }}
                        style={{
                          position: 'absolute', top: zone.top, left: zone.left, transform: 'translate(-50%, -50%)',
                          background: 'rgba(15, 23, 42, 0.8)', border: `1px solid ${zone.color}44`,
                          borderRadius: 20, padding: '4px 10px', color: zone.color, fontSize: '0.6rem', fontWeight: 900,
                          cursor: 'pointer', whiteSpace: 'nowrap', zIndex: 10,
                          boxShadow: `0 4px 12px ${zone.color}22`,
                          transition: 'all 0.2s',
                          backdropFilter: 'blur(4px)'
                        }}
                        onMouseEnter={(e: any) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'}
                        onMouseLeave={(e: any) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
                      >
                        {zone.name}
                      </button>
                    ));
                  })()}
                  {/* Pitch */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '15%', height: '40%', background: '#b79d71', borderRadius: 4 }}></div>
                  {/* Field Markings */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '90%', height: '90%', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
                  <div 
                    onClick={() => store.updateMatchSettings({ wagonWheelQuickSave: !store.wagonWheelQuickSave })}
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, 
                      padding: '8px 16px', borderRadius: 20, background: store.wagonWheelQuickSave ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${store.wagonWheelQuickSave ? '#38BDF8' : 'rgba(255,255,255,0.1)'}`,
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <Zap size={14} color={store.wagonWheelQuickSave ? '#38BDF8' : '#FFF'} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: store.wagonWheelQuickSave ? '#38BDF8' : '#FFF' }}>
                      {store.wagonWheelQuickSave ? 'QUICK SAVE ON' : 'QUICK SAVE OFF'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const p = showWagonWheelModal;
                      handleRecord(p.score, p.type, p.isWicket, p.wicketType, p.subType, p.outPlayerId, p.newBatterId, 'Unknown', p.commentary);
                      setShowWagonWheelModal(null);
                    }}
                    style={{ width: '100%', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}
                  >
                    SKIP ZONE
                  </button>
                </div>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {showMatchSummaryModal && matchMeta && (
          <MatchSummaryModal
            match={{
              ...matchMeta,
              finalScoreHome: {
                runs: store.innings1?.battingTeamId === 'HOME' ? store.innings1.totalRuns : store.innings2?.totalRuns || 0,
                wickets: store.innings1?.battingTeamId === 'HOME' ? store.innings1.wickets : store.innings2?.wickets || 0,
                overs: Number(store.getOvers(store.innings1?.battingTeamId === 'HOME' ? store.innings1.totalBalls : store.innings2?.totalBalls || 0))
              },
              finalScoreAway: {
                runs: store.innings1?.battingTeamId === 'AWAY' ? store.innings1.totalRuns : store.innings2?.totalRuns || 0,
                wickets: store.innings1?.battingTeamId === 'AWAY' ? store.innings1.wickets : store.innings2?.wickets || 0,
                overs: Number(store.getOvers(store.innings1?.battingTeamId === 'AWAY' ? store.innings1.totalBalls : store.innings2?.totalBalls || 0))
              }
            }}
            opponentName={matchMeta.opponentName || 'Opponent'}
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
                    ...Object.keys(store.innings2.battingStats || {}),
                    ...Object.keys(store.innings2.bowlingStats || {})
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

        <MilestoneOverlay ref={milestoneRef} />
      </>
    </DashboardContainer>
    );
  } catch (error) {
    console.error("[ScorerDashboard] Critical Render Error:", error);
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#081c15', color: '#FFF', padding: 20, textAlign: 'center' }}>
        <AlertTriangle size={48} color="#FF4D4D" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: 8 }}>RENDERING ERROR</h2>
        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 24 }}>A UI component failed to load. We've captured the error and are synchronizing state.</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '12px 24px', borderRadius: 12, background: '#10b981', border: 'none', color: '#FFF', fontWeight: 900, cursor: 'pointer' }}
        >
          RELOAD DASHBOARD
        </button>
      </div>
    );
  }
};

export default ScorerDashboard;
