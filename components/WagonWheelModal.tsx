import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types & Interfaces ---
interface WagonWheelModalProps {
  isOpen: boolean;
  strikerName: string;
  isLeftHanded: boolean;
  quickSaveEnabled?: boolean;
  onToggleQuickSave?: () => void;
  onZoneSelected: (zone: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

// Map 360 degrees to the 8 standard cricket zones. 
// We calculate angle where 0° is Straight (top of screen), 90° is Right, 180° is Behind, 270° is Left.
const calculateZone = (angle: number, isLeftHanded: boolean): string => {
  // Normalize angle to 0-360
  let normalizedAngle = angle < 0 ? angle + 360 : angle;

  // Determine the raw octant (0 to 7) based on 45-degree slices centered on specific angles.
  // We shift by 22.5 degrees so the "zones" straddle the main axes.
  const octant = Math.floor(((normalizedAngle + 22.5) % 360) / 45);

  // RHB Mapping
  // 0: Straight, 1: Cover, 2: Point, 3: Third Man, 4: Fine Leg, 5: Square Leg, 6: Mid Wicket, 7: Mid On
  const rhbZones = [
    'Straight',     // 0° (Top)
    'Cover',        // 45° (Top Right)
    'Point',        // 90° (Right)
    'Third Man',    // 135° (Bottom Right)
    'Fine Leg',     // 180° (Bottom)
    'Square Leg',   // 225° (Bottom Left)
    'Mid Wicket',   // 270° (Left)
    'Mid On'        // 315° (Top Left)
  ];

  // LHB Mapping (Mirrored across the Y-axis)
  const lhbZones = [
    'Straight',     // 0°
    'Mid On',       // 45°
    'Mid Wicket',   // 90°
    'Square Leg',   // 135°
    'Fine Leg',     // 180°
    'Third Man',    // 225°
    'Point',        // 270°
    'Cover'         // 315°
  ];

  return isLeftHanded ? lhbZones[octant] : rhbZones[octant];
};

export const WagonWheelModal: React.FC<WagonWheelModalProps> = ({
  isOpen,
  strikerName,
  isLeftHanded,
  quickSaveEnabled = false,
  onToggleQuickSave,
  onZoneSelected,
  onSkip,
  onClose,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // State to track the user's touch interaction
  const [isDragging, setIsDragging] = useState(false);
  const [activeCoords, setActiveCoords] = useState<{ x: number; y: number } | null>(null);
  const [previewZone, setPreviewZone] = useState<string | null>(null);

  // Center of our SVG canvas
  const centerX = 150;
  const centerY = 150;

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    svgRef.current.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateShotPosition(e);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    updateShotPosition(e);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (previewZone) {
      onZoneSelected(previewZone);
    }

    // Clear the line after recording
    setActiveCoords(null);
    setPreviewZone(null);
    if (svgRef.current) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const updateShotPosition = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();

    // Calculate touch position relative to the SVG container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setActiveCoords({ x, y });

    // Calculate delta from the pitch (center)
    const dx = x - centerX;
    const dy = y - centerY;

    // Calculate angle in degrees
    // Math.atan2 returns -PI to PI. In SVG, Y goes down, so we adjust.
    let angleRadians = Math.atan2(dy, dx);
    let angleDegrees = angleRadians * (180 / Math.PI);

    // Shift the coordinates so 0 degrees is facing straight "North" (top of the screen)
    angleDegrees = angleDegrees + 90;

    const calculatedZone = calculateZone(angleDegrees, isLeftHanded);
    setPreviewZone(calculatedZone);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <ModalOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <ModalContent
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
        >
          <Header>
            <Title>Shot Direction</Title>
            <Subtitle>{strikerName} {isLeftHanded ? '(LHB)' : '(RHB)'}</Subtitle>
          </Header>

          <FieldContainer>
            {/* The Touch-Sensitive SVG Ground */}
            <svg
              ref={svgRef}
              width="300"
              height="300"
              viewBox="0 0 300 300"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ touchAction: 'none', cursor: 'crosshair', borderRadius: '50%', backgroundColor: '#2E7D32' }}
            >
              {/* Outer Boundary */}
              <circle cx={centerX} cy={centerY} r={145} fill="none" stroke="#A5D6A7" strokeWidth="2" />

              {/* 30 Yard Circle */}
              <circle cx={centerX} cy={centerY} r={70} fill="none" stroke="#A5D6A7" strokeWidth="1" strokeDasharray="5,5" />

              {/* Pitch */}
              <rect x={centerX - 10} y={centerY - 25} width={20} height={50} fill="#D7CCC8" />

              {/* Dynamic Shot Line - Renders only when dragging */}
              {activeCoords && (
                <motion.line
                  x1={centerX}
                  y1={centerY}
                  x2={activeCoords.x}
                  y2={activeCoords.y}
                  stroke="#FFEB3B"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.1 }}
                />
              )}
            </svg>

            {/* Display the zone actively being hovered/dragged over */}
            <ZonePreviewBadge>
              {previewZone || 'Touch & Drag to Select'}
            </ZonePreviewBadge>
          </FieldContainer>

          <Footer>
            {onToggleQuickSave && (
              <QuickSaveToggle onClick={onToggleQuickSave} $active={quickSaveEnabled}>
                {quickSaveEnabled ? '⚡ Quick Save: ON' : 'Quick Save: OFF'}
              </QuickSaveToggle>
            )}
            <ButtonGroup>
              <Button onClick={onSkip}>Skip</Button>
              <Button $primary onClick={onClose}>Close</Button>
            </ButtonGroup>
          </Footer>
        </ModalContent>
      </ModalOverlay>
    </AnimatePresence>
  );
};

// --- Styled Components ---
const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  touch-action: none; 
`;

const ModalContent = styled(motion.div)`
  background: #1A237E;
  padding: 24px;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
`;

const Header = styled.div`
  text-align: center;
`;

const Title = styled.h2`
  color: white;
  margin: 0 0 4px 0;
  font-size: 1.2rem;
`;

const Subtitle = styled.div`
  color: #B0BEC5;
  font-size: 0.9rem;
`;

const FieldContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const ZonePreviewBadge = styled.div`
  background: rgba(255, 255, 255, 0.1);
  color: #FFEB3B;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 1.1rem;
  min-height: 24px;
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button<{ $primary?: boolean }>`
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  background: ${props => props.$primary ? '#1976D2' : '#3949AB'};
  color: white;
  
  &:hover {
    background: ${props => props.$primary ? '#1565C0' : '#283593'};
  }
`;

const QuickSaveToggle = styled.button<{ $active: boolean }>`
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${props => props.$active ? '#FFEB3B' : '#5C6BC0'};
  background: ${props => props.$active ? 'rgba(255, 235, 59, 0.1)' : 'transparent'};
  color: ${props => props.$active ? '#FFEB3B' : '#C5CAE9'};
  font-weight: 600;
  cursor: pointer;
`;