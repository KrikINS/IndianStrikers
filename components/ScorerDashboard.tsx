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
  RotateCcw
} from 'lucide-react';
import { useCricketScorer } from './matchStore';
import { useMatchCenter, updateMatchInStore } from './matchCenterStore';
import { useNavigate, useParams } from 'react-router-dom';
import { useMasterData } from './masterDataStore';
import { usePlayerStore } from '../store/playerStore';
import _ from 'lodash';
import { MilestoneOverlay, MilestoneOverlayRef } from './MilestoneOverlay';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { getRandomCommentary } from '../data/commentary';

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
  padding: 4px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  align-items: center;
  gap: 6px;
  
  span {
    color: #495057;
    font-weight: 700;
  }
`;

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
  width: 360px;
  height: 640px;
  background: #0c1222;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
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

import {
  InningsBattingEntry,
  InningsBowlingEntry,
  Player,
  ScheduledMatch,
  MatchStatus,
  OpponentTeam,
  CommentaryTemplate,
  CommentaryEventType
} from '../types';
import MatchSummaryModal from './MatchSummaryModal';

const ScorerDashboard: React.FC<{ matchId?: string, teamLogo?: string }> = ({ matchId: propMatchId, teamLogo }) => {
  const { players } = usePlayerStore();
  const store = useCricketScorer();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [setupStep, setSetupStep] = useState<'preview' | 'toss' | 'squad_home' | 'squad_away' | 'openers_bat' | 'openers_bowl' | null>(store.innings1 ? null : 'preview');
  const [tossWinner, setTossWinner] = useState<'home' | 'away' | null>(store.toss.winnerId ? (store.toss.winnerId === 'HOME' ? 'home' : 'away') : null);
  const [tossChoice, setTossChoice] = useState<'Bat' | 'Bowl' | null>(store.toss.choice || null);
  const [tempMaxOvers, setTempMaxOvers] = useState(20);

  const { homeXI, awayXI } = store;
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

  const [allOpponents, setAllOpponents] = useState<any[]>([]);
  const [commentaryTemplates, setCommentaryTemplates] = useState<CommentaryTemplate[]>([]);
  const [nextCommentarySuggestions, setNextCommentarySuggestions] = useState<Record<CommentaryEventType, string[]>>({
    FOUR: [], SIX: [], WICKET: [], DOT: [], MILESTONE: []
  });
  const [currentPreviews, setCurrentPreviews] = useState<Record<CommentaryEventType, string>>({
    FOUR: '', SIX: '', WICKET: '', DOT: '', MILESTONE: ''
  });

  // Opponent players fetched separately from the opponents table
  const [opponentPlayers, setOpponentPlayers] = useState<{ id: string; name: string; role?: string }[]>([]);

  // Helper: resolve player name from either squad
  const getPlayerName = (id: string | null): string => {
    if (!id) return 'â€”';
    const homePlayer = players.find((p: Player) => p.id === id);
    if (homePlayer) return homePlayer.name;
    const awayPlayer = opponentPlayers.find(p => p.id === id);
    if (awayPlayer) return awayPlayer.name;
    // awayXI may store names directly for opponent teams without registered IDs
    return id;
  };

  useEffect(() => {
    import('../services/storageService').then(({ getOpponents }) => {
      getOpponents().then(data => setAllOpponents(data || [])).catch(console.error);
    });
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
          FOUR: [], SIX: [], WICKET: [], DOT: [], MILESTONE: []
        };
        data.forEach(t => {
          if (grouped[t.event_type]) grouped[t.event_type].push(t.text);
        });
        setNextCommentarySuggestions(grouped);

        // Prime initial random selections
        const initialPreviews: Record<CommentaryEventType, string> = {
          FOUR: '', SIX: '', WICKET: '', DOT: '', MILESTONE: ''
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

  useEffect(() => {
    if (store.toss.winnerId) {
      setTossWinner(store.toss.winnerId === 'HOME' ? 'home' : 'away');
      setTossChoice(store.toss.choice);
    }
  }, [store.toss]);

  // Get metadata from MatchCenterStore
  const { matches, syncWithCloud, updateMatchStatus } = useMatchCenter();
  const { grounds, syncMasterData } = useMasterData();
  const activeMatchId = id || propMatchId || store.matchId;

  useEffect(() => {
    // Only reset if we are switching to a DIFFERENT match that isn't already the active one
    if (activeMatchId && activeMatchId !== store.matchId) {
      console.log("[Scorer] Different match detected. Preparing fresh session...");
      // We don't call hardReset() immediately anymore to allow rehydration from liveData
    }

    if (matches.length === 0) {
      syncWithCloud().catch(console.error);
    }
    syncMasterData().catch(console.error);
  }, [activeMatchId]); // Re-run if ID changes

  const matchMeta = (matches || []).find(m => m.id === activeMatchId);

  // Sync with URL ID: Initialize match data into store when navigating from a match card
  useEffect(() => {
    if (!activeMatchId) return;

    const initFromMeta = (meta: typeof matchMeta) => {
      if (!meta) return;

      // FORCE SERVER-SIDE TRUTH: If match is live, prioritize its live_data
      const isActuallyLive = meta.status === 'live';
      const resolvedOpponentName = (meta.opponentName === 'Sandbox XI' && !meta.is_test)
        ? 'OPPONENT'
        : (meta.opponentName || 'OPPONENT');

      // Resolve Opponent Logo from allOpponents if missing in meta
      const opponentMeta = allOpponents.find(o => o.id === meta.opponentId || o.name === meta.opponentName);
      const resolvedAwayLogo = meta.opponentLogo || opponentMeta?.logoUrl || '';

      console.log(`[Scorer] Initializing Match: ${activeMatchId} | Live: ${isActuallyLive}`);

      store.initializeMatch({
        matchId: meta.id,
        matchType: meta.matchFormat || 'T20',
        tournament: meta.tournament || 'Live Match',
        ground: meta.venue || meta.groundId || (grounds.find(g => g.id === meta.groundId)?.name) || 'Local Ground',
        opponentName: resolvedOpponentName,
        maxOvers: meta.maxOvers || 20,
        homeXI: meta.homeTeamXI || [],
        awayXI: meta.opponentTeamXI || [],
        homeLogo: teamLogo || '/INS%20LOGO.PNG',
        awayLogo: resolvedAwayLogo,
        liveData: meta.live_data
      });
    };

    if (activeMatchId !== store.matchId) {
      if (matchMeta) {
        initFromMeta(matchMeta);
      } else {
        // matchMeta not in local store yet â€” fetch directly from API
        console.log(`[Scorer] matchMeta not found locally, fetching match ${activeMatchId} directly...`);
        import('../services/storageService').then(({ getMatch }) => {
          getMatch(activeMatchId).then(freshMeta => {
            if (freshMeta) {
              initFromMeta(freshMeta);
            }
          }).catch(console.error);
        });
      }
    }
  }, [activeMatchId, matchMeta, store.matchId, grounds, teamLogo]);

  // Sync setupStep when store state changes (Rehydration check)
  useEffect(() => {
    if (store.innings1) {
      setSetupStep(null); // Jump straight to scoring if we have innings data
    } else if (activeMatchId === store.matchId && matchMeta?.status === 'live' && matchMeta?.live_data) {
      // --- RESUME LOGIC (Device B): Match is live in DB but local store is empty ---
      // Rehydrate from live_data and skip toss
      console.log('[Scorer] Match is live in DB. Rehydrating store from live_data...');
      const ld = matchMeta.live_data as any;
      if (ld && ld.innings1) {
        // Resolve Opponent Logo from allOpponents if missing in meta
        const opponentMeta = allOpponents.find(o => o.id === matchMeta.opponentId || o.name === matchMeta.opponentName);
        const resolvedAwayLogo = matchMeta.opponentLogo || opponentMeta?.logoUrl || '';

        // live_data has innings - reinitialize the full store state
        store.initializeMatch({
          matchId: matchMeta.id,
          matchType: matchMeta.matchFormat || 'T20',
          tournament: matchMeta.tournament || 'Live Match',
          ground: matchMeta.venue || 'Local Ground',
          opponentName: matchMeta.opponentName || 'OPPONENT',
          maxOvers: matchMeta.maxOvers || ld.maxOvers || 20,
          homeXI: matchMeta.homeTeamXI || [],
          awayXI: matchMeta.opponentTeamXI || [],
          homeLogo: teamLogo || '/INS%20LOGO.PNG',
          awayLogo: resolvedAwayLogo,
          liveData: ld
        });
        // setSetupStep(null) will fire on next render when store.innings1 is set
      }
    }
  }, [!!store.innings1, store.matchId, matchMeta?.status, matchMeta?.live_data]);

  const syncToDatabase = useCallback(
    _.debounce((state: any) => {
      if (activeMatchId) {
        updateMatchInStore(activeMatchId, { live_data: state, last_updated: new Date().toISOString() });
      }
    }, 3000),
    [activeMatchId]
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

  useEffect(() => {
    syncToDatabase(store);
  }, [store, syncToDatabase]);

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
      await updateMatchInStore(activeMatchId, {
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
        icon: 'ðŸ¤'
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
  const isBattingFinishing = currentInnings && (
    currentInnings.wickets === 10 ||
    currentInnings.totalBalls >= (store.maxOvers || 20) * 6 ||
    (store.currentInnings === 2 && currentInnings.totalRuns > (store.innings1?.totalRuns || 0))
  );
  const isMatchComplete = store.isFinished;
  const isInningsBreak = store.currentInnings === 1 && isBattingFinishing && !store.isFinished;

  // Trigger Review Modal when innings condition is met
  useEffect(() => {
    if (isBattingFinishing && !showInningsReview && !store.isFinished && !isFinalizingInnings) {
      setShowInningsReview(true);
    }
  }, [isBattingFinishing, store.isFinished, isFinalizingInnings]);

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
        if (b.subType === 'bat') nsPRuns += b.runs;
        if (b.isLegal) nsPBalls++;
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
            <span style={{ fontWeight: 900, fontSize: '14px', letterSpacing: '1px' }}>LIVE SCORER</span>
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
                    {m.tournament} â€¢ {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
      </DashboardContainer>
    );
  }

  if (setupStep !== null) {
    const isReadyToStart = tossWinner && tossChoice && homeXI.length === 11 && awayXI.length === 11 && selStriker && selNonStriker && selBowler;

    const handleStartMatch = () => {
      if (!isReadyToStart) return;

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
        updateMatchInStore(activeMatchId, {
          isHomeBattingFirst: startBatTeamId === 'HOME',
          status: 'live',
          homeTeamXI: homeXI,
          opponentTeamXI: awayXI
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
            {store.innings1 && (
              <button
                onClick={() => {
                  if (window.confirm("RESET SCORER? This will permanently clear all recorded balls for THIS session. You will need to re-select toss and openers. Proceed?")) {
                    store.hardReset();
                    setSetupStep('preview');
                  }
                }}
                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: 8, fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}
              >
                RESET SCORER
              </button>
            )}
          </div>
        </Header>

        <SetupCard>
          {setupStep === 'preview' ? (
            <>
              <MatchTitle>{store.tournament || matchMeta?.tournament || 'LIVE MATCH'}</MatchTitle>
              <GroundText>
                <MapPin size={14} /> {store.ground || matchMeta?.venue || 'Local Ground'}
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
                    {store.awayLogo || matchMeta?.opponentLogo ? (
                      <img src={store.awayLogo || matchMeta?.opponentLogo} alt="A" />
                    ) : (
                      <Shield size={40} color="rgba(255,255,255,0.3)" />
                    )}
                  </TeamLogoCircle>
                  <span style={{ fontStyle: 'italic', fontWeight: 900, fontSize: '1rem', textAlign: 'center', color: '#FAB005' }}>
                    {(store.opponentName || matchMeta?.opponentName || 'OPPONENT').toUpperCase()}
                  </span>
                </TeamBlock>
              </TeamRow>

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

    const syncBallToCloud = async (isRetry = false) => {
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
        runs_scored: score,
        extras_runs: type === 'wide' || type === 'no-ball' ? 1 : 0,
        extras_type: type === 'legal' ? null : type,
        event_type: isWicket ? 'wicket' : (type === 'legal' ? 'ball' : 'extra'),
        innings_number: store.currentInnings,
        wicket_type: wicketType,
        is_penalty: false,
        commentary: commentary || ''
      };

      if (!isRetry) {
        payload.shot_zone = zone;
        payload.is_not_out = !isWicket;
        payload.fifty_notified = store.innings1?.battingStats[store.strikerId || '']?.fifty_notified ?? false;
        payload.tournament_id = matchMeta?.tournamentId || null;
      }

      try {
        const response = await fetch(`${baseUrl}/score/ball`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          if (response.status === 400 && !isRetry) {
            console.warn("[Sync] Interceptor conflict detected. Ball saved using minimalist fallback.");
            return syncBallToCloud(true);
          }
          const errorText = await response.text();
          throw new Error(`Sync Error (${response.status}): ${errorText}`);
        }
      } catch (err) {
        console.error("[Sync] Ball-by-ball sync failed:", err);
      }
    };

    syncBallToCloud();

    syncToDatabase(store);

    const sId = store.strikerId || '';
    const bId = store.currentBowlerId || '';
    const sName = getPlayerName(sId);
    const bName = getPlayerName(bId);

    if (score === 4 && subType === 'bat') {
      milestoneRef.current?.trigger({ type: 'FOUR', playerName: sName });
    } else if (score === 6 && subType === 'bat') {
      milestoneRef.current?.trigger({ type: 'SIX', playerName: sName });
    }

    if (isWicket) {
      const victimId = outPlayerId || sId;
      const victimName = getPlayerName(victimId);
      const bStat = innings.battingStats[victimId];

      if (bStat && bStat.runs === 0) {
        if (bStat.balls === 1) {
          milestoneRef.current?.trigger({ type: 'GOLDEN_DUCK', playerName: victimName });
        } else {
          milestoneRef.current?.trigger({ type: 'DUCK', playerName: victimName });
        }
      } else {
        milestoneRef.current?.trigger({ type: 'WICKET', playerName: victimName });
      }

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

    const strikerStat = innings.battingStats[sId];
    if (strikerStat && subType === 'bat') {
      if (strikerStat.runs >= 100 && !strikerStat.hundred_notified) {
        milestoneRef.current?.trigger({ type: 'HUNDRED', playerName: sName });
        store.setMilestoneNotified(sId, 'hundred');
      } else if (strikerStat.runs >= 50 && !strikerStat.fifty_notified) {
        milestoneRef.current?.trigger({ type: 'FIFTY', playerName: sName });
        store.setMilestoneNotified(sId, 'fifty');
      }
    }

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
    let comm = "";
    if (isWicket) comm = currentPreviews.WICKET;
    else if (score === 6 && subType === 'bat') comm = currentPreviews.SIX;
    else if (score === 4 && subType === 'bat') comm = currentPreviews.FOUR;
    else if (score === 0 && subType === 'bat') comm = currentPreviews.DOT;

    if (!comm) {
      if (isWicket) comm = getRandomCommentary('WICKET');
      else if (score === 6 && subType === 'bat') comm = getRandomCommentary('SIX');
      else if (score === 4 && subType === 'bat') comm = getRandomCommentary('FOUR');
      else if (score === 0 && subType === 'bat') comm = getRandomCommentary('DOT');
    }

    if (isWicket) shufflePreview('WICKET');
    else if (score === 6 && subType === 'bat') shufflePreview('SIX');
    else if (score === 4 && subType === 'bat') shufflePreview('FOUR');
    else if (score === 0 && subType === 'bat') shufflePreview('DOT');

    const isWagonWorthy = (score > 0) || (isWicket && !['Bowled', 'LBW', 'Retired Hurt', 'Retired Out', 'Hit Wicket'].includes(wicketType));

    if (store.useWagonWheel && subType === 'bat' && isWagonWorthy) {
      setShowWagonWheelModal({ score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, commentary: comm });
    } else {
      handleRecord(score, type, isWicket, wicketType, subType, outPlayerId, newBatterId, undefined, comm);
    }
  };

  const triggerWicketSplash = (type: string) => {
    const victimName = getPlayerName(runOutInvolved?.victimId || store.strikerId);
    milestoneRef.current?.trigger({ type: 'WICKET', playerName: victimName });

    if (isBattingFinishing) {
      setTimeout(() => setShowInningsReview(true), 1500);
      return;
    }

    setTimeout(() => {
      setShowBatterSelectModal(true);
    }, 1500);
  };

  const handleConfirmInnings = async () => {
    if (!activeMatchId || !currentInnings) return;
    setSyncStatus('loading');

    try {
      const totalScore = currentInnings.totalRuns;
      const totalWickets = currentInnings.wickets;
      const target = (store.innings1?.totalRuns || 0) + 1;

      const updatePayload: any = {
        tournament_id: matchMeta?.tournamentId,
        live_data: {
          ...store,
          backup_data: JSON.parse(JSON.stringify(store))
        }
      };

      const playerStatsUpdate = Object.entries(currentInnings.battingStats).map(([pid, stat]) => ({
        player_id: pid,
        match_id: activeMatchId,
        tournament_id: matchMeta?.tournamentId || null,
        runs: stat.runs,
        balls: stat.balls,
        fours: stat.fours,
        sixes: stat.sixes,
        is_not_out: stat.status === 'batting',
        is_batting_innings: stat.balls > 0 || (stat.status !== 'dnb' && stat.status !== 'batting')
      }));

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

      await updateMatchInStore(activeMatchId, updatePayload);
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
    const scores: Record<string, { id: string, name: string, score: number, runs: number, balls: number, wickets: number, maidens: number, runsConceded: number, overs: number }> = {};

    [store.innings1, store.innings2].forEach(inn => {
      if (!inn) return;
      Object.entries(inn.battingStats || {}).forEach(([id, s]: [string, any]) => {
        if (!scores[id]) scores[id] = { id, name: getPlayerName(id), score: 0, runs: 0, balls: 0, wickets: 0, maidens: 0, runsConceded: 0, overs: 0 };
        scores[id].runs += s.runs;
        scores[id].balls += s.balls;
        scores[id].score += s.runs + (s.fours * 2) + (s.sixes * 4);
        if (s.runs >= 50) scores[id].score += 50;
        if (s.runs >= 100) scores[id].score += 100;
      });
      Object.entries(inn.bowlingStats || {}).forEach(([id, s]: [string, any]) => {
        if (!scores[id]) scores[id] = { id, name: getPlayerName(id), score: 0, runs: 0, balls: 0, wickets: 0, maidens: 0, runsConceded: 0, overs: 0 };
        scores[id].wickets += s.wickets;
        scores[id].runsConceded += s.runs;
        scores[id].overs += s.overs || 0;
        scores[id].maidens += s.maidens || 0;
        scores[id].score += (s.wickets * 25) + ((s.maidens || 0) * 10);
      });
    });

    return Object.values(scores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  };

  const downloadHeroPoster = async () => {
    if (!posterRef.current || isGeneratingPoster) return;
    setIsGeneratingPoster(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(posterRef.current, {
        backgroundColor: '#0c1222',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `StrikersPulse_Hero_${getPlayerName(store.manOfTheMatch).replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Poster Generation Failed:", err);
    } finally {
      setIsGeneratingPoster(false);
    }
  };


  if (!currentInnings) return null;

  const strikerStats = currentInnings?.battingStats[store.strikerId || ''] || { runs: 0, balls: 0 };
  const nonStrikerStats = currentInnings?.battingStats[store.nonStrikerId || ''] || { runs: 0, balls: 0 };
  const bowlerStats = currentInnings?.bowlingStats[store.currentBowlerId || ''] || { overs: 0, runs: 0, wickets: 0 };


  return (
    <DashboardContainer>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
            <div style={{ fontSize: '8px', fontWeight: 800, opacity: 0.9, marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {store.toss.winnerId && (
                <span style={{ color: '#FAB005' }}>
                  {store.toss.winnerId === 'HOME' ? 'Indian Strikers' : (store.opponentName || 'OPPONENT')} won toss & elected to {store.toss.choice} â€¢
                </span>
              )}
              {` Innings ${store.currentInnings} `}
              {store.maxOvers ? `â€¢ ${store.maxOvers} Overs` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 0 }}>
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

        <ScoreSection>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 4px' }}>
            <div style={{ textAlign: 'left', minWidth: 45 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase' }}>CRR</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#001F3F' }}>
                {(() => {
                  const totalBalls = currentInnings?.totalBalls || 0;
                  if (totalBalls === 0) return '0.00';
                  return ((currentInnings?.totalRuns || 0) / (totalBalls / 6)).toFixed(2);
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <ScoreTitle style={{ fontSize: '1.4rem', lineHeight: 1 }}>
                  {currentInnings?.totalRuns}/{currentInnings?.wickets}
                </ScoreTitle>
                <OversText style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 2 }}>
                  {store.getOvers(currentInnings?.totalBalls || 0)} OVERS
                </OversText>
              </div>

              <button
                title="Full Scorecard"
                onClick={() => setShowScorecardModal(true)}
                style={{
                  background: 'hsla(210, 73%, 58%, 0.1)', border: '1px solid hsla(210, 73%, 58%, 0.3)', 
                  borderRadius: 6, display: 'flex', alignItems: 'center',
                  gap: 4, padding: '6px 14px', color: '#1a73e8', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer'
                }}
              >
                <LayoutList size={10} /> FULL SCORECARD
              </button>
            </div>

            <div style={{ textAlign: 'right', minWidth: 45 }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase' }}>Projected Score</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#001F3F' }}>
                {(() => {
                  const totalBalls = currentInnings?.totalBalls || 0;
                  const rr = totalBalls === 0 ? 0 : (currentInnings?.totalRuns || 0) / (totalBalls / 6);
                  return Math.ceil(rr * (store.maxOvers || 20));
                })()}
              </div>
            </div>
          </div>

          {store.isFreeHit && (
            <FreeHitBadge
              animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ marginTop: 4 }}
            >
              FREE HIT
            </FreeHitBadge>
          )}
        </ScoreSection>



        <ActiveParticipants style={{ borderBottom: 'none' }}>
          <ParticipantCard $active>
            <CardHeader>
              <NameLabel>Striker*</NameLabel>
              <button
                title="Switch Striker"
                onClick={() => store.switchStriker()}
                style={{ color: '#070707ff', background: 'rgba(51,154,240,0.1)', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}
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
            <StatValue>{getPlayerName(store.currentBowlerId)}</StatValue>
            <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{bowlerStats.wickets}-{bowlerStats.runs} ({bowlerStats.overs})</div>
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
              onClick={() => { store.undoLastBall(); setIsOverComplete(false); }}
              title="Undo Last Ball"
              style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: 1, visibility: 'visible' }}
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
            {store.isWaitingForBowler && (
              <div style={{ position: 'absolute', inset: -4, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', borderRadius: 12 }}>
                <button
                  onClick={() => setShowBowlerModal(true)}
                  style={{ background: '#FAB005', color: '#000', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 8px 25px rgba(250, 176, 5, 0.4)' }}
                >
                  SELECT NEXT BOWLER
                </button>
              </div>
            )}

            <div style={{ opacity: store.isWaitingForBowler ? 0.3 : 1, pointerEvents: store.isWaitingForBowler ? 'none' : 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                            store.setNewBowler(p.id);
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
                SELECT NEXT BATTER
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
                  {store.awayLogo ? (
                    <img src={store.awayLogo} style={{ width: 60, height: 60, objectFit: 'contain' }} alt="A" />
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {calculateTopPerformers().slice(0, 2).map((p, i) => (
                    <div key={p.id} style={{ background: '#F8F9FA', padding: 16, borderRadius: 16, border: '1px solid #E9ECEF' }}>
                      <p style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 4 }}>{p.name}</p>
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
                <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 4 }}>PERFORMER SPOTLIGHT</h1>
                <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>Select the Man of the Match based on performance</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 24 }}>
                {calculateTopPerformers().map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => store.updateMatchSettings({ manOfTheMatch: p.id })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16,
                      background: idx === 0 ? 'rgba(250, 176, 5, 0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${idx === 0 ? 'rgba(250, 176, 5, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                      color: '#FFF', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ background: idx === 0 ? '#FAB005' : 'rgba(255,255,255,0.1)', color: idx === 0 ? '#000' : '#FFF', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem' }}>
                      #{idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: idx === 0 ? '#FAB005' : '#FFF' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 2 }}>
                        {p.runs > 0 && <span>{p.runs} Runs • </span>}
                        {p.wickets > 0 && <span>{p.wickets} Wickets • </span>}
                        {p.maidens > 0 && <span>{p.maidens} Maidens</span>}
                      </div>
                    </div>
                    <Zap size={18} color={idx === 0 ? '#FAB005' : 'rgba(255,255,255,0.2)'} fill={idx === 0 ? '#FAB005' : 'none'} />
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
                    navigate('/match-center');
                  }}
                >
                  RETURN TO MATCH CENTER
                </ActionButton>
              </div>

              <PosterContainer>
                <HeroPosterWrapper ref={posterRef}>
                  <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
                    <img src="/INS%20LOGO.PNG" className="w-16 h-16 object-contain" alt="Logo" />
                    <div className="text-white">
                      <p className="text-[10px] font-black italic tracking-widest leading-none">MATCH DAY</p>
                      <p className="text-2xl font-black italic text-sky-400 leading-none">HERO</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center pt-16 px-6">
                    <User size={120} color="#38bdf8" />
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', fontStyle: 'italic', textAlign: 'center', lineHeight: 1, marginBottom: 8 }}>
                      {getPlayerName(store.manOfTheMatch)}
                    </h2>
                    <div style={{ height: 4, width: 48, background: 'rgba(255,255,255,0.2)', borderRadius: 2, marginBottom: 16 }}></div>

                    {(() => {
                      const heroStats = calculateTopPerformers().find(p => p.id === store.manOfTheMatch);
                      return (
                        <>
                          <p style={{ color: '#FFF', fontSize: '1.5rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
                            {heroStats ? (
                              heroStats.wickets > 0 ? `${heroStats.wickets}/${heroStats.runsConceded}` : `${heroStats.runs} (${heroStats.balls})`
                            ) : ''}
                          </p>
                          <p style={{ color: '#38bdf8', opacity: 0.5, fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', marginTop: 4 }}>
                            VS {(matchMeta?.opponentName || 'OPPONENT').toUpperCase()}
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  <div style={{ padding: 16, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 4 }}>
                      STRIKERS PULSE OFFICIAL SCORECARD
                    </p>
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
          <PremiumModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowScorecardModal(false)}
          >
            <PremiumModalContent onClick={e => e.stopPropagation()} style={{ paddingBottom: 40 }}>
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>FULL SCORECARD</h2>
                <IconButton onClick={() => setShowScorecardModal(false)}>
                  <X size={24} />
                </IconButton>
              </div>

              {/* Tab Bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0 20px' }}>
                {(['scorecard', 'commentary'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setScorecardTab(tab)}
                    style={{
                      flex: 1, padding: '12px 0', background: 'none', border: 'none',
                      borderBottom: scorecardTab === tab ? '2px solid #38BDF8' : '2px solid transparent',
                      color: scorecardTab === tab ? '#38BDF8' : 'rgba(255,255,255,0.4)',
                      fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px',
                      textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
                      marginBottom: '-1px'
                    }}
                  >
                    {tab === 'scorecard' ? '📋 Scorecard' : '🎙️ Commentary'}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>

                {/* ————————————————— SCORECARD TAB ————————————————— */}
                {scorecardTab === 'scorecard' && (
                  <>
                    <ScoreSummaryCard style={{ marginTop: 20 }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 800 }}>TOTAL SCORE</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FAB005' }}>
                          {(currentInnings as any).totalRuns}/{(currentInnings as any).wickets}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 800 }}>OVERS</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>
                          {store.getOvers((currentInnings as any).totalBalls)} / {store.maxOvers}
                        </div>
                      </div>
                    </ScoreSummaryCard>

                    <h3 style={{ fontSize: '0.8rem', color: '#FAB005', marginBottom: 12, textTransform: 'uppercase', fontWeight: 900 }}>Batting</h3>
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
                        {(Object.entries((currentInnings as any).battingStats) as [string, any][])
                          .sort(([, a], [, b]) => (a.index ?? 0) - (b.index ?? 0))
                          .map(([id, stat]) => (
                            <tr key={id}>
                              <Td style={{ color: (store.strikerId === id || store.nonStrikerId === id) ? '#FAB005' : '#FFF' }}>
                                {getPlayerName(id)}{(store.strikerId === id || store.nonStrikerId === id) ? '*' : ''}
                                {(store as any).manOfTheMatch === id && <Star size={10} fill="#FAB005" color="#FAB005" style={{ marginLeft: 6 }} />}
                              </Td>
                              <Td style={{ fontSize: '0.7rem', opacity: 0.6 }}>{stat.status === 'batting' ? 'not out' : (stat.outHow || 'out')}</Td>
                              <Td style={{ textAlign: 'center' }}>{stat.runs}</Td>
                              <Td style={{ textAlign: 'center' }}>{stat.balls}</Td>
                              <Td style={{ textAlign: 'center' }}>{stat.fours}</Td>
                              <Td style={{ textAlign: 'center' }}>{stat.sixes}</Td>
                              <Td style={{ textAlign: 'right', opacity: 0.8 }}>
                                {stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : '0.0'}
                              </Td>
                            </tr>
                          ))}
                      </tbody>
                    </ScoreCardTable>

                    <h3 style={{ fontSize: '0.8rem', color: '#FAB005', marginBottom: 12, textTransform: 'uppercase', fontWeight: 900 }}>Bowling</h3>
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
                        {(Object.entries((currentInnings as any).bowlingStats) as [string, any][])
                          .sort(([, a], [, b]) => (a.index ?? 0) - (b.index ?? 0))
                          .map(([id, stat]) => (
                            <tr key={id}>
                              <Td style={{ color: store.currentBowlerId === id ? '#FAB005' : '#FFF' }}>
                                {getPlayerName(id)}{store.currentBowlerId === id ? '*' : ''}
                                {(store as any).manOfTheMatch === id && <Star size={10} fill="#FAB005" color="#FAB005" style={{ marginLeft: 6 }} />}
                              </Td>
                              <Td style={{ textAlign: 'center' }}>{stat.overs}</Td>
                              <Td style={{ textAlign: 'center' }}>{stat.maidens || 0}</Td>
                              <Td style={{ textAlign: 'center' }}>{stat.runs}</Td>
                              <Td style={{ textAlign: 'center' }}>{stat.wickets}</Td>
                              <Td style={{ textAlign: 'right', opacity: 0.8 }}>
                                {stat.overs > 0 ? (stat.runs / stat.overs).toFixed(2) : '0.00'}
                              </Td>
                            </tr>
                          ))}
                      </tbody>
                    </ScoreCardTable>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.75rem' }}>
                      <span style={{ opacity: 0.5, fontWeight: 700 }}>EXTRAS</span>
                      <span style={{ fontWeight: 900 }}>
                        {((currentInnings as any)?.extras?.wides || 0) + ((currentInnings as any)?.extras?.noBalls || 0) + ((currentInnings as any)?.extras?.byes || 0) + ((currentInnings as any)?.extras?.legByes || 0) + ((currentInnings as any)?.extras?.penalty || 0)}{' '}
                        (wd {(currentInnings as any)?.extras?.wides || 0}, nb {(currentInnings as any)?.extras?.noBalls || 0}, b {(currentInnings as any)?.extras?.byes || 0}, lb {(currentInnings as any)?.extras?.legByes || 0}, pen {(currentInnings as any)?.extras?.penalty || 0})
                      </span>
                    </div>
                  </>
                )}

                {/* ————————————————— COMMENTARY TAB ————————————————— */}
                {scorecardTab === 'commentary' && (
                  <div style={{ paddingTop: 16 }}>
                    {(() => {
                      const history = [...(currentInnings?.history || [])].reverse();
                      const overGroups: Record<number, any[]> = {};
                      history.forEach(ball => {
                        const ov = ball.overNumber ?? 0;
                        if (!overGroups[ov]) overGroups[ov] = [];
                        overGroups[ov].push(ball);
                      });

                      const sortedOvers = Object.keys(overGroups)
                        .map(Number)
                        .sort((a, b) => b - a); // Latest over first

                      return sortedOvers.map(overNum => {
                        const balls = overGroups[overNum]; // already reversed (latest ball first)
                        const overRuns = balls.reduce((s: number, b: any) => s + b.runs + (!b.isLegal ? 1 : 0), 0);
                        const overWkts = balls.filter((b: any) => b.isWicket).length;
                        const isMaiden = overRuns === 0 && balls.filter((b: any) => b.isLegal).length === 6;
                        const isComplete = balls.filter((b: any) => b.isLegal).length === 6;

                        return (
                          <div key={overNum} style={{ marginBottom: 20 }}>
                            {/* Over Summary Card */}
                            <div style={{
                              background: isMaiden ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${isMaiden ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: 10,
                              padding: '10px 14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 8
                            }}>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ fontWeight: 900, fontSize: '0.8rem', color: '#38BDF8' }}>
                                  OVER {overNum + 1}{!isComplete ? ' (live)' : ''}
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {[...balls].reverse().map((b: any, i: number) => {
                                    let display = b.isWicket ? 'W' : `${b.runs}`;
                                    if (b.type === 'wide') display = `wd${b.runs > 0 ? `+${b.runs}` : ''}`;
                                    else if (b.type === 'no-ball') display = `nb${b.runs > 0 ? `+${b.runs}` : ''}`;
                                    else if (b.type === 'leg-bye') display = `lb${b.runs}`;
                                    else if (b.type === 'bye') display = `b${b.runs}`;
                                    const dot = b.isLegal;
                                    return (
                                      <span key={i} style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        minWidth: 22, height: 22, borderRadius: '50%', fontSize: '0.6rem', fontWeight: 900,
                                        background: b.isWicket ? 'rgba(255,77,77,0.25)' : b.runs === 4 || b.runs === 6 ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.07)',
                                        color: b.isWicket ? '#FF4D4D' : b.runs === 4 || b.runs === 6 ? '#38BDF8' : 'rgba(255,255,255,0.7)',
                                        border: `1px solid ${b.isWicket ? 'rgba(255,77,77,0.3)' : 'rgba(255,255,255,0.1)'}`
                                      }}>{display}</span>
                                    );
                                  })}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 900, color: '#FAB005', fontSize: '0.9rem' }}>{overRuns}</span>
                                <span style={{ opacity: 0.4, fontSize: '0.7rem' }}> runs</span>
                                {overWkts > 0 && <span style={{ color: '#FF4D4D', fontWeight: 900, fontSize: '0.8rem', marginLeft: 6 }}>· {overWkts}W</span>}
                                {isMaiden && <span style={{ color: '#38BDF8', fontWeight: 900, fontSize: '0.7rem', marginLeft: 6 }}>· M</span>}
                              </div>
                            </div>

                            {/* Ball-by-Ball commentary rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {balls.map((ball: any, i: number) => {
                                const bowlerN = getPlayerName(ball.bowlerId);
                                const strikerN = getPlayerName(ball.strikerId);
                                let result = ball.commentary || '';
                                let resultColor = 'rgba(255,255,255,0.7)';
                                if (ball.isWicket) {
                                  if (!result) result = `OUT! ${ball.wicketType || 'Wicket'} — ${strikerN}`;
                                  resultColor = '#FF4D4D';
                                } else if (ball.runs === 6) {
                                  if (!result) result = `SIX! ${strikerN} hits it clean`;
                                  resultColor = '#38BDF8';
                                } else if (ball.runs === 4) {
                                  if (!result) result = `FOUR! ${strikerN} finds the boundary`;
                                  resultColor = '#38BDF8';
                                } else if (ball.type === 'wide') result = `Wide${ball.runs > 0 ? ` + ${ball.runs} run(s)` : ''}`;
                                else if (ball.type === 'no-ball') result = `No Ball${ball.runs > 0 ? ` + ${ball.runs} run(s)` : ''}`;
                                else if (ball.type === 'leg-bye') result = `Leg Bye — ${ball.runs} run(s)`;
                                else if (ball.type === 'bye') result = `Bye — ${ball.runs} run(s)`;
                                else if (ball.runs === 0) {
                                  if (!result) result = `Dot ball`;
                                  resultColor = 'rgba(255,255,255,0.4)';
                                } else {
                                  if (!result) result = `${ball.runs} run(s)`;
                                };

                                const ballLabel = ball.isLegal
                                  ? `${overNum}.${ball.ballNumber}`
                                  : `${overNum}.${ball.ballNumber}*`;

                                return (
                                  <div key={i} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 10,
                                    padding: '8px 10px', borderRadius: 8,
                                    background: ball.isWicket ? 'rgba(255,77,77,0.05)' : 'transparent',
                                    borderLeft: `2px solid ${ball.isWicket ? '#FF4D4D' : ball.runs >= 4 ? '#38BDF8' : 'rgba(255,255,255,0.08)'}`
                                  }}>
                                    <span style={{ minWidth: 32, fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.35)', paddingTop: 2 }}>
                                      {ballLabel}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: resultColor }}>{result}</div>
                                      <div style={{ fontSize: '0.65rem', opacity: 0.4, marginTop: 2 }}>
                                        {bowlerN} to {strikerN}
                                      </div>
                                    </div>
                                    <span style={{
                                      fontWeight: 900, fontSize: '0.85rem',
                                      color: ball.isWicket ? '#FF4D4D' : ball.runs >= 4 ? '#38BDF8' : 'rgba(255,255,255,0.6)'
                                    }}>
                                      {ball.isWicket ? 'W' : ball.runs}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              <ActionButton
                $variant="primary"
                onClick={() => setShowScorecardModal(false)}
                style={{ margin: '30px 20px 0', width: 'auto' }}
              >
                CLOSE SCORECARD
              </ActionButton>
            </PremiumModalContent>
          </PremiumModalOverlay>
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
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#38BDF8' }}>{store.innings1.totalRuns + 1}</div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, opacity: 0.5 }}>SCORE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FAB005' }}>{currentInnings.totalRuns}/{currentInnings.wickets}</div>
                  </div>
                </div>
              )}

              <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: 24 }}>Review the final stats before proceeding.</p>

              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, marginBottom: 32, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 900, opacity: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>Total Score</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: syncStatus === 'success' ? '#4ADE80' : '#FAB005' }}>{currentInnings.totalRuns}/{currentInnings.wickets}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 900, opacity: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>Overs Bowled</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{store.getOvers(currentInnings.totalBalls)}</div>
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

                <div style={{ marginTop: 'auto', padding: '12px 0' }}>
                  <p style={{ fontSize: '0.6rem', opacity: 0.3, textAlign: 'center', letterSpacing: '1px' }}>
                    RIYADH NIGHTS EDITION • STRIKERS PULSE v2.5
                  </p>
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
                      { name: 'Third Man', top: '15%', left: isLH ? '85%' : '15%' },
                      { name: 'Point', top: '50%', left: isLH ? '95%' : '5%' },
                      { name: 'Cover', top: '80%', left: isLH ? '85%' : '15%' },
                      { name: 'Mid Off', top: '92%', left: '50%' },
                      { name: 'Mid On', top: '80%', left: isLH ? '15%' : '85%' },
                      { name: 'Mid Wicket', top: '50%', left: isLH ? '5%' : '95%' },
                      { name: 'Square Leg', top: '15%', left: isLH ? '15%' : '85%' },
                      { name: 'Fine Leg', top: '8%', left: '50%' }
                    ];

                    return zones.map(zone => (
                      <button
                        key={zone.name}
                        onClick={() => {
                          const p = showWagonWheelModal;
                          handleRecord(p.score, p.type, p.isWicket, p.wicketType, p.subType, p.outPlayerId, p.newBatterId, zone.name, p.commentary);
                          setShowWagonWheelModal(null);
                        }}
                        style={{
                          position: 'absolute', top: zone.top, left: zone.left, transform: 'translate(-50%, -50%)',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 20, padding: '4px 10px', color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                          cursor: 'pointer', whiteSpace: 'nowrap', zIndex: 10
                        }}
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

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button
                    onClick={() => {
                      const p = showWagonWheelModal;
                      handleRecord(p.score, p.type, p.isWicket, p.wicketType, p.subType, p.outPlayerId, p.newBatterId, 'Unknown', p.commentary);
                      setShowWagonWheelModal(null);
                    }}
                    style={{ flex: 1, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}
                  >
                    SKIP
                  </button>
                </div>
              </ModalContent>
            </ModalOverlay>
          )}
        </AnimatePresence>

        {showMatchSummaryModal && matchMeta && (
          <MatchSummaryModal
            match={matchMeta}
            opponentName={matchMeta.opponentName || 'Opponent'}
            onClose={() => setShowMatchSummaryModal(false)}
            onSave={async (summary) => {
              setSyncStatus('loading');
              try {
                // Prepare performer data for career update
                const performers = calculateTopPerformers().map(p => ({
                  playerId: p.id,
                  playerName: p.name,
                  runs: p.runs,
                  balls: p.balls,
                  fours: 0, // Simplified for this sync
                  sixes: 0,
                  wickets: p.wickets,
                  bowlingRuns: p.runsConceded,
                  bowlingOvers: p.overs || 0,
                  maidens: p.maidens,
                  isNotOut: true // Summary view fallback
                }));

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
};

export default ScorerDashboard;
