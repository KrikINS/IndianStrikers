/**
 * fixScoreSectionName.cjs
 * Fixes the ScoreSection name collision and restores LayoutList import.
 */
const fs = require('fs');
const path = require('path');

// ─── Fix ScoreSection.tsx: rename component to ScoreSectionPanel ────────────
const scorePath = path.join(__dirname, '..', 'components', 'Scorer', 'ScoreSection.tsx');
let c = fs.readFileSync(scorePath, 'utf8');
c = c.replace('export const ScoreSection:', 'export const ScoreSectionPanel:');
c = c.replace('export default ScoreSection;', 'export default ScoreSectionPanel;');
fs.writeFileSync(scorePath, c, 'utf8');
console.log('Fixed: ScoreSection → ScoreSectionPanel in ScoreSection.tsx');

// ─── Fix ScorerDashboard.tsx ─────────────────────────────────────────────────
const dashPath = path.join(__dirname, '..', 'components', 'ScorerDashboard.tsx');
let dash = fs.readFileSync(dashPath, 'utf8');

// 1. Restore LayoutList in lucide import (was accidentally removed)
if (!dash.includes('LayoutList')) {
  dash = dash.replace('  ChevronLeft,', '  ChevronLeft,\n  LayoutList,');
  console.log('Restored: LayoutList in lucide imports');
}

// 2. Update import name
dash = dash.replace(
  "{ ScoreSection } from './Scorer/ScoreSection'",
  "{ ScoreSectionPanel } from './Scorer/ScoreSection'"
);

// 3. Update JSX usage
dash = dash.replace('<ScoreSection\n', '<ScoreSectionPanel\n');
dash = dash.replace('<ScoreSection ', '<ScoreSectionPanel ');

fs.writeFileSync(dashPath, dash, 'utf8');
console.log('Fixed: ScoreSection → ScoreSectionPanel in ScorerDashboard.tsx');
console.log('\nDone! Run: npx tsc --noEmit');
