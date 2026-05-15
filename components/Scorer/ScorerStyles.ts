/**
 * ScorerStyles.ts
 * All styled-components for the Scorer Dashboard.
 * Extracted from ScorerDashboard.tsx — no logic changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

export const DashboardContainer = styled.div`
  height: 100dvh;
  width: 100%;
  box-sizing: border-box;
  background-color: hsla(210, 100%, 100%, 1.00);
  color: #1A1A1A;
  font-family: 'Inter', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const MiddleWorkspace = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

export const Header = styled.header`
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

export const FreeHitBadge = styled(motion.span)`
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

export const IconButton = styled.button`
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

export const SyncStatusPill = styled.div<{ $outOfSync: boolean }>`
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

export const OverSeparator = styled.div`
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

export const ScoreSection = styled.div`
  background: #ffffffff;
  padding: 16px 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 16px;
`;

export const ScorecardPillBtn = styled.button`
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  color: #1a73e8;
  font-size: 0.8rem;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(26,115,232,0.08);
  transition: all 0.2s;
  &:hover { background: rgba(26,115,232,0.12); }
`;

export const MainScore = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin: 2px;
  line-height: 1.1;
  color: hsla(0, 0%, 5%, 1.00);
`;

export const OversText = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: hsla(0, 0%, 8%, 0.50);
`;

export const ActiveParticipants = styled.div`
  padding: 4px 12px 4px;
  background: #FFFFFF;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  flex-shrink: 0;

  @media (min-width: 768px) {
    padding: 8px 12px 8px;
    gap: 12px;
  }
`;

export const PartnershipRow = styled.div`
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
  padding: 6px 12px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  margin-top: 4px;
`;

export const BowlerRow = styled.div`
  padding: 8px 12px;
  background: #FFFFFF;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

export const PartnershipMain = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  b {
    font-weight: 900;
    color: #212529;
  }
`;

export const PartnershipSub = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: rgba(73, 80, 87, 0.4);
  letter-spacing: 0.5px;
`;


export const ParticipantCard = styled.div<{ $active?: boolean }>`
  padding: 2px 10px;
  border-radius: 8px;
  background: ${props => props.$active ? '#E7F5FF' : '#F8F9FA'};
  border: 1px solid ${props => props.$active ? '#339AF0' : '#E9ECEF'};
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
`;

export const NameLabel = styled.span`
  font-size: 10px;
  font-weight: 800;
  color: #495057;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  opacity: 0.6;
`;

export const StatValue = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`;

export const TimelineContainer = styled.div`
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

export const BallCircle = styled.div<{ $type: string }>`
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

export const ScoringInterface = styled.div`
  padding: 8px 10px 10px;
  background: #001F3F;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  border-top: none;
  z-index: 100;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.4);
  padding-bottom: max(10px, env(safe-area-inset-bottom));
`;

export const RunGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 8px;
  flex: 1;
`;

export const ExtraStack = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
`;

export const ScoringBtn = styled.button<{ $variant?: 'run' | 'wicket' | 'extra' | 'undo' }>`
  width: 100%;
  height: 100%;
  min-height: 52px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 1.25rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  
  &:active {
    transform: scale(0.94);
    filter: brightness(1.2);
  }
  
  ${props => {
    switch (props.$variant) {
      case 'wicket': return 'background: linear-gradient(135deg, rgba(255, 77, 77, 0.2) 0%, rgba(255, 77, 77, 0.05) 100%); color: #FF4D4D; border-color: rgba(255, 77, 77, 0.3);';
      case 'extra': return 'background: linear-gradient(135deg, rgba(250, 176, 5, 0.15) 0%, rgba(250, 176, 5, 0.05) 100%); color: #FAB005; border-color: rgba(250, 176, 5, 0.3); font-size: 0.85rem;';
      case 'undo': return 'background: rgba(255, 255, 255, 0.03); color: rgba(255, 255, 255, 0.5);';
      default: return 'background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%); color: #FFFFFF;';
    }
  }}
`;

export const ModalOverlay = styled.div`
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

export const ModalContent = styled.div`
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

export const InningsBreakModal = styled.div`
  position: fixed;
  inset: 0;
  background: #FFFFFF;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  color: #001F3F;
  font-family: 'Inter', sans-serif;
`;

export const HeroPosterWrapper = styled.div`
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

export const PosterContainer = styled.div`
  position: fixed;
  left: -9999px;
  top: -9999px;
`;

export const SetupContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #001F3F 0%, #083358 100%);
  display: flex;
  flex-direction: column;
  color: white;
  padding: 20px;
`;

export const SetupCard = styled.div`
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

export const MatchTitle = styled.h2`
  text-align: center;
  font-size: 1.5rem;
  font-weight: 900;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

export const GroundText = styled.div`
  text-align: center;
  opacity: 0.6;
  font-size: 0.8rem;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`;

export const TeamRow = styled.div`
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

export const TeamBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 40%;
`;

export const TeamLogoCircle = styled.div<{ $active?: boolean }>`
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

export const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
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

export const TossOption = styled.div<{ $selected?: boolean }>`
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

export const SettingsSection = styled.div`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.1);
`;

export const OversControl = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-top: 12px;
`;

export const ControlBtn = styled.button`
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

export const PremiumModalOverlay = styled(motion.div)`
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

export const PremiumModalContent = styled.div`
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

export const PlayerCard = styled.div<{ $selected?: boolean; $disabled?: boolean }>`
  padding: 12px 16px;
  background: ${props => props.$selected ? 'rgba(250, 176, 5, 0.2)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${props => props.$selected ? '#FAB005' : 'rgba(255,255,255,0.1)'};
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all 0.2s;

  &:hover {
    ${props => !props.$disabled && 'background: rgba(255,255,255,0.1);'}
  }
`;

export const SelectionGrid = styled.div`
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

export const StatRibbon = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
  gap: 8px;
`;

export const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const StatLabel = styled.span`
  font-size: 8px;
  opacity: 0.5;
  text-transform: uppercase;
  font-weight: 700;
`;

export const StatVal = styled.span`
  font-size: 10px;
  font-weight: 800;
  color: #FAB005;
`;

export const FilterChip = styled.button<{ $active?: boolean }>`
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

export const SliderTrack = styled.div`
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

export const SliderHandle = styled(motion.div)`
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

export const SliderText = styled.div`
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

export const LandscapeLockOverlay = styled.div`
  display: none;
  
  @media screen and (max-width: 768px) and (orientation: landscape) {
    display: flex;
    position: fixed;
    inset: 0;
    background: #001f3f;
    color: white;
    z-index: 99999;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 30px;
    font-weight: 800;
    font-family: 'Inter', sans-serif;
    letter-spacing: 0.5px;
    
    &::after {
      content: "Please rotate your device to portrait mode for the best scoring experience.";
      margin-top: 16px;
      font-size: 1.1rem;
      max-width: 300px;
    }
  }
`;


export const SliderProgress = styled(motion.div)`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: rgba(255, 77, 77, 0.2);
  z-index: 1;
`;

export const CoinWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
  perspective: 1000px;
`;

export const Coin3D = styled(motion.div)`
  width: 80px;
  height: 80px;
  position: relative;
  transform-style: preserve-3d;
`;

export const CoinFace = styled.div<{ $side: 'front' | 'back' }>`
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
export const ScoreCardTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 24px;
  font-size: 0.8rem;
`;

export const Th = styled.th`
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  opacity: 0.5;
  font-weight: 800;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.5px;
`;

export const Td = styled.td`
  padding: 10px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-weight: 600;
`;

export const ScoreSummaryCard = styled.div`
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const DrawerOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  z-index: 5000;
  display: flex;
  justify-content: flex-end;
`;

export const DrawerContent = styled(motion.div)`
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

export const SettingsGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const GroupTitle = styled.h3`
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

export const ControlButton = styled.button<{ $variant?: 'emerald' | 'gold' | 'danger' }>`
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

export const SettingsInput = styled.div`
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

export const AnalyticsDrawerOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(12px);
  z-index: 6000;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 80px 20px;
`;

export const AnalyticsDrawerContent = styled(motion.div)`
  width: 90vw;
  max-width: 650px;
  height: 85vh;
  background: #001F3F;
  border: 2px solid #FAB005;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
  box-shadow: 10px 10px 30px rgba(0,0,0,0.5);
  color: #FFFFFF;
`;

export const AnalyticsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 12px;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 900;
    color: #FAB005;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

export const ChartContainer = styled.div`
  background: rgba(255,255,255,0.03);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255,255,255,0.05);
  
  h3 {
    font-size: 0.8rem;
    font-weight: 800;
    margin-bottom: 16px;
    opacity: 0.6;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

export const AnalyticsHandleContainer = styled.div`
  position: absolute;
  left: 0;
  top: 80px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 999;
`;

export const FloatingAnalyticsButton = styled.button`
  background: #FAB005;
  color: #001F3F;
  border: 1px solid rgba(0,0,0,0.1);
  border-left: none;
  border-radius: 0 8px 8px 0;
  padding: 12px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 4px 2px 10px rgba(0,0,0,0.2);
  font-weight: 900;
  font-size: 0.5rem;
  writing-mode: vertical-rl;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s;
  opacity: 0.9;

  &:hover {
    opacity: 1;
    padding-right: 10px;
    background: #FFD43B;
    transform: translateX(2px);
  }
`;

// Types already imported at the top

export const InitialsAvatar = styled.div<{ size?: string; $bg?: string }>`
  width: ${props => props.size || '40px'};
  height: ${props => props.size || '40px'};
  border-radius: 50%;
  background: ${props => props.$bg || 'linear-gradient(135deg, #001F3F 0%, #083358 100%)'};
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: calc(${props => props.size || '40px'} * 0.4);
  text-transform: uppercase;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  user-select: none;
`;
