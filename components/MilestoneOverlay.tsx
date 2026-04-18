import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import confetti from 'canvas-confetti';
import { Trophy, Star, Zap, Flame, Target, Users } from 'lucide-react';

// --- TYPES ---
export type MilestoneType = 
  | 'FOUR' 
  | 'SIX' 
  | 'WICKET' 
  | 'DUCK' 
  | 'GOLDEN_DUCK' 
  | 'FIFTY' 
  | 'HUNDRED' 
  | 'FOUR_WICKET' 
  | 'FIVE_WICKET' 
  | 'HAT_TRICK'
  | 'PARTNERSHIP';

interface MilestoneEvent {
  id: string;
  type: MilestoneType;
  playerName: string;
  subText?: string;
}

// --- STYLED COMPONENTS ---
const OverlayContainer = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const BlurBackdrop = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
`;

const Ribbon = styled(motion.div)`
  position: absolute;
  width: 100%;
  height: 120px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const WicketGlitch = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: rgba(255, 0, 0, 0.2);
  border: 4px solid rgba(255, 0, 0, 0.5);
`;

const MainText = styled(motion.h1)<{ $color?: string }>`
  font-size: 5rem;
  font-weight: 900;
  color: ${props => props.$color || '#FFF'};
  text-transform: uppercase;
  font-style: italic;
  margin: 0;
  text-shadow: 0 10px 30px rgba(0,0,0,0.5);
  letter-spacing: -2px;
  text-align: center;
`;

const SubText = styled(motion.p)`
  font-size: 1.5rem;
  font-weight: 700;
  color: #FFF;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 4px;
  opacity: 0.8;
  text-align: center;
`;

const Spotlight = styled(motion.div)`
  position: absolute;
  width: 600px;
  height: 100%;
  background: radial-gradient(circle at center, rgba(250, 176, 5, 0.2), transparent 70%);
  transform: skewX(-20deg);
`;

// --- COMPONENT ---
export interface MilestoneOverlayRef {
  trigger: (event: Omit<MilestoneEvent, 'id'>) => void;
}

export const MilestoneOverlay = forwardRef<MilestoneOverlayRef>((_, ref) => {
  const [activeEvent, setActiveEvent] = useState<MilestoneEvent | null>(null);

  useImperativeHandle(ref, () => ({
    trigger: (event) => {
      const id = Math.random().toString(36).substring(7);
      setActiveEvent({ ...event, id });
      
      // Auto-clear after animation
      setTimeout(() => {
        setActiveEvent(prev => prev?.id === id ? null : prev);
      }, 3500);

      // Trigger standard effects
      handleEffects(event.type);
    }
  }));

  const handleEffects = (type: MilestoneType) => {
    // 1. Haptics
    if ('vibrate' in navigator) {
      if (type === 'WICKET' || type === 'SIX') {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate(50);
      }
    }

    // 2. Confetti
    if (type === 'SIX') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FAB005', '#FFD700', '#FFFFFF']
      });
    } else if (type === 'FIFTY' || type === 'HUNDRED' || type === 'PARTNERSHIP' || type.includes('WICKET')) {
      const end = Date.now() + (2 * 1000);
      const colors = ['#FAB005', '#FFFFFF'];

      (function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  };

  const renderContent = () => {
    if (!activeEvent) return null;

    switch (activeEvent.type) {
      case 'FOUR':
        return (
          <>
            <Ribbon
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: '0%', opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            >
              <div style={{ position: 'relative' }}>
                <MainText 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >FOUR</MainText>
              </div>
            </Ribbon>
          </>
        );

      case 'SIX':
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ position: 'absolute', width: 400, height: 400, border: '2px dashed rgba(250, 176, 5, 0.3)', borderRadius: '50%' }}
            />
            <MainText $color="#FAB005" style={{ fontSize: '6rem', marginBottom: '1rem' }}>MAXIMUM</MainText>
            <SubText>{activeEvent.playerName}</SubText>
          </motion.div>
        );

      case 'WICKET':
        return (
          <>
            <WicketGlitch 
              animate={{ 
                x: [-10, 10, -5, 5, 0],
                opacity: [0.5, 0.8, 0.3, 1, 0.8]
              }}
              transition={{ duration: 0.2, repeat: 2 }}
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="px-20 py-10 bg-red-600 skew-x-[-12deg] shadow-2xl"
            >
              <MainText>WICKET</MainText>
              <SubText style={{ color: '#000', letterSpacing: 2 }}>{activeEvent.playerName}</SubText>
            </motion.div>
          </>
        );

      case 'DUCK':
      case 'GOLDEN_DUCK':
        return (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 20 }}
            style={{ textAlign: 'center' }}
          >
            <motion.div
              animate={activeEvent.type === 'GOLDEN_DUCK' ? { 
                scale: [1, 1.1, 1],
                filter: ["brightness(1)", "brightness(1.5)", "brightness(1)"]
              } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ fontSize: '10rem', color: activeEvent.type === 'GOLDEN_DUCK' ? '#FAB005' : '#FFF' }}
            >
              🦆
            </motion.div>
            <MainText $color={activeEvent.type === 'GOLDEN_DUCK' ? '#FAB005' : '#FFF'}>
              {activeEvent.type === 'GOLDEN_DUCK' ? 'GOLDEN DUCK' : 'DUCK'}
            </MainText>
            <SubText>{activeEvent.playerName}</SubText>
          </motion.div>
        );

      case 'FIFTY':
      case 'HUNDRED':
        return (
          <div style={{ textAlign: 'center' }}>
            <Spotlight 
              animate={{ x: [-1000, 1000] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Star size={80} color="#FAB005" fill="#FAB005" className="mx-auto mb-6" />
              <MainText $color="#FAB005">{activeEvent.type === 'FIFTY' ? 'FANTASTIC 50' : 'SUPER 100'}</MainText>
              <SubText>{activeEvent.playerName}</SubText>
            </motion.div>
          </div>
        );

      case 'HAT_TRICK':
        return (
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="absolute bottom-0 left-0 right-0 h-96 flex flex-col items-center justify-end"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-red-600/50 to-transparent" />
            <div className="flex gap-4 mb-8">
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -20, 0] }}
                  transition={{ delay: i * 0.1, duration: 1, repeat: Infinity }}
                >
                  <Flame size={48} color="#f97316" fill="#f97316" />
                </motion.div>
              ))}
            </div>
            <MainText $color="#f97316" style={{ fontSize: '7rem' }}>HAT-TRICK</MainText>
            <SubText className="mb-20">{activeEvent.playerName}</SubText>
          </motion.div>
        );

      case 'FOUR_WICKET':
      case 'FIVE_WICKET':
        return (
          <div style={{ textAlign: 'center' }}>
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(250,176,5,0.1),transparent)]"
             />
             <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
             >
                <Trophy size={100} color="#FAB005" className="mx-auto mb-8" />
                <MainText $color="#FAB005">{activeEvent.type === 'FOUR_WICKET' ? '4-WICKET HAUL' : '5-WICKET CRUSHER'}</MainText>
                <SubText>{activeEvent.playerName} • {activeEvent.subText}</SubText>
              </motion.div>
          </div>
        )

      case 'PARTNERSHIP':
        return (
          <div style={{ textAlign: 'center' }}>
             <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
             >
                <div style={{ background: 'rgba(250, 176, 5, 0.1)', width: 120, height: 120, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                  <Users size={64} color="#FAB005" />
                </div>
                <MainText $color="#FAB005" style={{ fontSize: '5.5rem' }}>{activeEvent.playerName} PARTNERSHIP</MainText>
                <SubText style={{ color: '#FFF', opacity: 1, fontWeight: 900 }}>{activeEvent.subText}</SubText>
                
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: 200 }}
                  style={{ height: 2, background: '#FAB005', margin: '24px auto', borderRadius: 1 }}
                />
             </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  return createPortal(
    <OverlayContainer>
      <AnimatePresence>
        {activeEvent && (
          <>
            <BlurBackdrop 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            {renderContent()}
          </>
        )}
      </AnimatePresence>
    </OverlayContainer>,
    document.body
  );
});

MilestoneOverlay.displayName = 'MilestoneOverlay';
