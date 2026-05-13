/**
 * extractMatchModals.cjs
 * Extracts the 7 match modals (lines 2235–2675) from ScorerDashboard.tsx
 * into components/Scorer/MatchModals.tsx, and replaces them with
 * a single <MatchModals ... /> call.
 *
 * Run: node scripts/extractMatchModals.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'components', 'ScorerDashboard.tsx');
const OUT = path.join(ROOT, 'components', 'Scorer', 'MatchModals.tsx');

const raw = fs.readFileSync(DASHBOARD, 'utf8');
const lines = raw.split('\n');

// Find exact boundaries by content pattern
let modalStart = -1;
let modalEnd = -1;

for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  // Bowler modal: first modal after ScoringInterface closes
  if (modalStart === -1 && t === '{showBowlerModal && (') {
    modalStart = i;
  }
  // Penalty modal ends, then InningsBreakModal begins
  if (modalStart !== -1 && t === '{isInningsBreak && !showSetupModal && (') {
    modalEnd = i - 1;
    break;
  }
}

if (modalStart === -1 || modalEnd === -1) {
  console.error('ERROR: Could not find modal boundaries.');
  console.error('  modalStart:', modalStart, '  modalEnd:', modalEnd);
  // Show nearby content for debugging
  for (let i = 2230; i < 2240 && i < lines.length; i++) {
    console.log(i + 1, JSON.stringify(lines[i]));
  }
  process.exit(1);
}

console.log(`Modal block: lines ${modalStart + 1}–${modalEnd + 1}`);

// Extract the modal JSX lines
const modalLines = lines.slice(modalStart, modalEnd + 1);

// ─── Build MatchModals.tsx ─────────────────────────────────────────────────
const header = `import React from 'react';
import { User } from 'lucide-react';
import {
  ModalOverlay, ModalContent, SelectionGrid, PlayerCard,
  ScoringBtn, ActionButton
} from './ScorerStyles';
import { Player } from '../../types';
import { InningsState, UnifiedMatchStore } from '../../types';

// ─── Props Interface ────────────────────────────────────────────────────────
export interface MatchModalsProps {
  // Visibility flags
  showBowlerModal: boolean;
  showNBModal: boolean;
  showWicketModal: boolean;
  showFielderModal: boolean;
  runOutInvolved: { victimId: string; runs: number; ballType?: string; subType?: string } | null;
  showBatterSelectModal: boolean;
  showPenaltyModal: boolean;
  // State
  extraType: 'wd' | 'nb' | 'byes' | 'lb';
  nbSubType: 'bat' | 'bye' | 'lb';
  pendingWicketType: string | null;
  pendingFielderId: string | null;
  currentInnings: InningsState;
  store: UnifiedMatchStore;
  isInningsBreak: boolean;
  isBattingFinishing: boolean;
  players: Player[];
  opponentPlayers: any[];
  team1XI: string[];
  team2XI: string[];
  activeMatchId: string;
  // Setters / handlers
  setShowBowlerModal: (v: boolean) => void;
  setShowNBModal: (v: boolean) => void;
  setShowWicketModal: (v: boolean) => void;
  setShowFielderModal: (v: boolean) => void;
  setRunOutInvolved: (v: any) => void;
  setShowBatterSelectModal: (v: boolean) => void;
  setShowPenaltyModal: (v: boolean) => void;
  setNbSubType: (v: 'bat' | 'bye' | 'lb') => void;
  setPendingWicketType: (v: string | null) => void;
  setPendingFielderId: (v: string | null) => void;
  setIsOverComplete: (v: boolean) => void;
  setShowSetupModal: (v: boolean) => void;
  triggerWicketSplash: (type: string) => void;
  attemptRecord: (...args: any[]) => void;
  getPlayerName: (id: any) => string;
}

// ─── Component ─────────────────────────────────────────────────────────────
export const MatchModals: React.FC<MatchModalsProps> = (props) => {
  const {
    showBowlerModal, showNBModal, showWicketModal, showFielderModal,
    runOutInvolved, showBatterSelectModal, showPenaltyModal,
    extraType, nbSubType, pendingWicketType, pendingFielderId,
    currentInnings, store, isInningsBreak, isBattingFinishing,
    players, opponentPlayers, team1XI, team2XI, activeMatchId,
    setShowBowlerModal, setShowNBModal, setShowWicketModal, setShowFielderModal,
    setRunOutInvolved, setShowBatterSelectModal, setShowPenaltyModal,
    setNbSubType, setPendingWicketType, setPendingFielderId,
    setIsOverComplete, setShowSetupModal, triggerWicketSplash,
    attemptRecord, getPlayerName,
  } = props;

  return (
    <>
`;

const footer = `    </>
  );
};

export default MatchModals;
`;

const modalJSX = modalLines.join('\n');
fs.writeFileSync(OUT, header + modalJSX + '\n' + footer, 'utf8');
console.log(`✅ Written: ${OUT}`);

// ─── Replace the modal block in ScorerDashboard.tsx ────────────────────────
const importLine = `import { MatchModals } from './Scorer/MatchModals';`;

// Build the replacement JSX - a single <MatchModals /> call
const replacement = `          <MatchModals
            showBowlerModal={showBowlerModal}
            showNBModal={showNBModal}
            showWicketModal={showWicketModal}
            showFielderModal={showFielderModal}
            runOutInvolved={runOutInvolved}
            showBatterSelectModal={showBatterSelectModal}
            showPenaltyModal={showPenaltyModal}
            extraType={extraType}
            nbSubType={nbSubType}
            pendingWicketType={pendingWicketType}
            pendingFielderId={pendingFielderId}
            currentInnings={currentInnings!}
            store={store}
            isInningsBreak={isInningsBreak}
            isBattingFinishing={isBattingFinishing}
            players={players}
            opponentPlayers={opponentPlayers}
            team1XI={team1XI}
            team2XI={team2XI}
            activeMatchId={activeMatchId || ''}
            setShowBowlerModal={setShowBowlerModal}
            setShowNBModal={setShowNBModal}
            setShowWicketModal={setShowWicketModal}
            setShowFielderModal={setShowFielderModal}
            setRunOutInvolved={setRunOutInvolved}
            setShowBatterSelectModal={setShowBatterSelectModal}
            setShowPenaltyModal={setShowPenaltyModal}
            setNbSubType={setNbSubType}
            setPendingWicketType={setPendingWicketType}
            setPendingFielderId={setPendingFielderId}
            setIsOverComplete={setIsOverComplete}
            setShowSetupModal={setShowSetupModal}
            triggerWicketSplash={triggerWicketSplash}
            attemptRecord={attemptRecord}
            getPlayerName={getPlayerName}
          />`;

// Build new dashboard lines: keep before modal block, insert replacement, keep after
const beforeModals = lines.slice(0, modalStart);
const afterModals = lines.slice(modalEnd + 1);
const newLines = [...beforeModals, replacement, ...afterModals];

// Add import after WagonWheelModal import
const wagonIdx = newLines.findIndex(l => l.includes("from './WagonWheelModal'"));
if (wagonIdx !== -1) {
  newLines.splice(wagonIdx + 1, 0, importLine);
} else {
  // fallback: add after last import
  let lastImport = 0;
  for (let i = 0; i < newLines.length; i++) {
    if (newLines[i].trim().startsWith('import ')) lastImport = i;
  }
  newLines.splice(lastImport + 1, 0, importLine);
}

fs.writeFileSync(DASHBOARD, newLines.join('\n'), 'utf8');
console.log(`✅ Updated: ${DASHBOARD}`);
console.log(`   Removed ${modalEnd - modalStart + 1} lines, added MatchModals component call.`);
console.log('\nDone! Run: npx tsc --noEmit');
