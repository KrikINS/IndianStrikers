/**
 * extractStyles.js
 * One-shot script: extracts all styled-components from ScorerDashboard.tsx
 * (lines 66-1108) into components/Scorer/ScorerStyles.ts with proper exports.
 * Also strips those lines + generateDynamicCommentary from ScorerDashboard.tsx
 * and adds import statements at the top.
 *
 * Run: node scripts/extractStyles.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DASHBOARD = path.join(ROOT, 'components', 'ScorerDashboard.tsx');
const SCORER_DIR = path.join(ROOT, 'components', 'Scorer');
const STYLES_OUT = path.join(SCORER_DIR, 'ScorerStyles.ts');

// Ensure output directory exists
if (!fs.existsSync(SCORER_DIR)) fs.mkdirSync(SCORER_DIR, { recursive: true });

const raw = fs.readFileSync(DASHBOARD, 'utf8');
const lines = raw.split('\n');

// ─── 1. Identify extraction boundaries ───────────────────────────────────────
// Styled-components block starts after the lucide/recharts/etc imports end.
// We detect this as the first `const X = styled.` or `const X = styled(` line.
// The block ends just before `const ScorerDashboard: React.FC` (the component).

let styledStart = -1;
let styledEnd = -1;
let commentaryStart = -1;
let commentaryEnd = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Start of styled block: first styled.xxx or styled(xxx) declaration
  if (styledStart === -1 && /^const \w+ = styled[.(]/.test(line.trim())) {
    styledStart = i;
  }

  // generateDynamicCommentary function
  if (/^const generateDynamicCommentary/.test(line.trim())) {
    commentaryStart = i;
  }
  if (commentaryStart !== -1 && commentaryEnd === -1 && i > commentaryStart) {
    // Function ends at the closing `};` at column 0
    if (/^};/.test(line)) {
      commentaryEnd = i;
    }
  }

  // End of styled block: the ScorerDashboard component declaration
  if (/^const ScorerDashboard: React\.FC/.test(line.trim())) {
    styledEnd = i - 1;
    break;
  }
}

if (styledStart === -1 || styledEnd === -1) {
  console.error('ERROR: Could not find styled-component block boundaries.');
  process.exit(1);
}

console.log(`Styled block: lines ${styledStart + 1}–${styledEnd + 1}`);
if (commentaryStart !== -1) {
  console.log(`generateDynamicCommentary: lines ${commentaryStart + 1}–${commentaryEnd + 1}`);
}

// ─── 2. Extract the styled-components block ───────────────────────────────────
const styledLines = lines.slice(styledStart, styledEnd + 1);

// Add `export ` before every `const X = styled` or `const X = styled(` declaration
const exportedLines = styledLines.map(line => {
  // Match top-level const declarations of styled components (not indented)
  if (/^const \w+ = styled[.(]/.test(line)) {
    return 'export ' + line;
  }
  return line;
});

// ─── 3. Build ScorerStyles.ts ─────────────────────────────────────────────────
const stylesHeader = `/**
 * ScorerStyles.ts
 * All styled-components for the Scorer Dashboard.
 * Extracted from ScorerDashboard.tsx — no logic changes.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';

`;

const stylesContent = stylesHeader + exportedLines.join('\n') + '\n';
fs.writeFileSync(STYLES_OUT, stylesContent, 'utf8');
console.log(`✅ Written: ${STYLES_OUT}`);

// ─── 4. Collect all exported names for the import statement ──────────────────
const exportedNames = [];
for (const line of exportedLines) {
  const match = line.match(/^export const (\w+) = styled/);
  if (match) exportedNames.push(match[1]);
}
console.log(`   Exported ${exportedNames.length} styled components.`);

// ─── 5. Build import line for ScorerDashboard.tsx ────────────────────────────
// Split into chunks of 4 for readability
const chunks = [];
for (let i = 0; i < exportedNames.length; i += 4) {
  chunks.push(exportedNames.slice(i, i + 4).join(', '));
}
const importBlock = `import {\n  ${chunks.join(',\n  ')}\n} from './Scorer/ScorerStyles';`;
const utilsImport = `import { generateDynamicCommentary } from './Scorer/scorerUtils';`;

// ─── 6. Build new ScorerDashboard.tsx ────────────────────────────────────────
// Keep: lines 0..styledStart-1 (imports section), then skip styledStart..styledEnd,
// then keep styledEnd+1..end.
// Also skip the generateDynamicCommentary function if found.

const skipRanges = [
  [styledStart, styledEnd],
];
if (commentaryStart !== -1 && commentaryEnd !== -1) {
  skipRanges.push([commentaryStart, commentaryEnd]);
}
// Sort ranges by start
skipRanges.sort((a, b) => a[0] - b[0]);

// Build filtered lines
const newDashboardLines = [];
let skipIdx = 0;
for (let i = 0; i < lines.length; i++) {
  // Check if we're in a skip range
  let inSkip = false;
  for (const [s, e] of skipRanges) {
    if (i >= s && i <= e) { inSkip = true; break; }
  }
  if (!inSkip) newDashboardLines.push(lines[i]);
}

// Find the insertion point: after the last existing import line at the top
// We insert BEFORE the first non-import, non-blank line after the imports
let insertAfter = 0;
for (let i = 0; i < newDashboardLines.length; i++) {
  const l = newDashboardLines[i].trim();
  if (l.startsWith('import ') || l === '') {
    insertAfter = i;
  } else {
    break;
  }
}

// Insert our two new import lines
newDashboardLines.splice(insertAfter + 1, 0, importBlock, utilsImport, '');

const newDashboard = newDashboardLines.join('\n');
fs.writeFileSync(DASHBOARD, newDashboard, 'utf8');
console.log(`✅ Updated: ${DASHBOARD}`);
console.log(`   Removed styled block (${styledEnd - styledStart + 1} lines) + generateDynamicCommentary.`);
console.log(`   Added imports for ScorerStyles and scorerUtils.`);
console.log('\nDone! Now run: npx tsc --noEmit');
