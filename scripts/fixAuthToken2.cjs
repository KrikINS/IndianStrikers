/**
 * fixAuthToken2.cjs
 * Fixes remaining auth token issues by operating on the raw buffer.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'components', 'ScorerDashboard.tsx');
let content = fs.readFileSync(FILE, 'utf8');
let changes = 0;

// Normalize CRLF for searching, then restore after
const normalised = content.replace(/\r\n/g, '\n');

// Fix 1: offline queue flush — replace the sessionStorage-only header
const oldQueue = `headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${sessionStorage.getItem('authToken')}\` },\n              body: JSON.stringify(queuedBall)`;
const newQueue = `headers: authHeaders,\n              body: JSON.stringify(queuedBall)`;

let fixed = normalised;
if (fixed.includes(oldQueue)) {
  fixed = fixed.replace(oldQueue, newQueue);
  changes++;
  console.log('✅ 1. Fixed offline queue flush auth header');
} else {
  console.log('ℹ️  1. Offline queue header — pattern not matched, trying line-by-line...');
  // Find and replace the specific line
  const lines = fixed.split('\n');
  const idx = lines.findIndex(l => l.includes('sessionStorage.getItem') && l.includes('queuedBall') === false && l.includes('headers'));
  if (idx > -1) {
    const before = lines[idx - 1] || '';
    const after = lines[idx + 1] || '';
    if (after.includes('queuedBall')) {
      lines[idx] = lines[idx].replace(
        `headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${sessionStorage.getItem('authToken')}\` },`,
        `headers: authHeaders,`
      );
      fixed = lines.join('\n');
      changes++;
      console.log('✅ 1. Fixed offline queue flush auth header (line-by-line)');
    }
  } else {
    console.log('❌ 1. Could not find offline queue auth header');
  }
}

// Fix 2: Main sync — remove the redundant Content-Type + spread, leave just authHeaders
const oldMain = `          headers: {\n            'Content-Type': 'application/json',\n            ...authHeaders\n          },\n          body: JSON.stringify(payload)`;
const newMain = `          headers: authHeaders,\n          body: JSON.stringify(payload)`;

if (fixed.includes(oldMain)) {
  fixed = fixed.replace(oldMain, newMain);
  changes++;
  console.log('✅ 2. Cleaned main sync headers (removed redundant Content-Type spread)');
} else {
  console.log('ℹ️  2. Main sync headers already clean or not found');
}

// Restore original line endings where they existed
// Re-apply CRLF only to lines that originally had it
const originalLines = content.split('\r\n');
const fixedLines = fixed.split('\n');

// If the file originally used CRLF, write it back with CRLF
const hasCRLF = content.includes('\r\n');
const finalContent = hasCRLF ? fixed.replace(/\n/g, '\r\n') : fixed;

fs.writeFileSync(FILE, finalContent, 'utf8');
console.log(`\nTotal changes applied: ${changes}`);
console.log('Done. Run: npx tsc --noEmit');
