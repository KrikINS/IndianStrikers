/**
 * fixAuthToken.cjs
 * Replaces hardcoded sessionStorage.getItem('authToken') in syncBallToCloud
 * with the sessionStorage || localStorage fallback pattern.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'components', 'ScorerDashboard.tsx');
let content = fs.readFileSync(FILE, 'utf8');

let changes = 0;

// 1. Add authToken helper at the top of syncBallToCloud, right after baseUrl is defined
const baseUrlLine = `const baseUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api');`;
const helperBlock = `const baseUrl = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4001/api' : '/api');
      // Mirror storageService.ts getHeaders(): sessionStorage first, localStorage fallback
      // Prevents silent 401s for returning users whose token persists in localStorage only
      const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      const authHeaders = { 'Content-Type': 'application/json', 'Authorization': authToken ? \`Bearer \${authToken}\` : '' };`;

if (content.includes(baseUrlLine) && !content.includes('const authToken = sessionStorage.getItem')) {
  content = content.replace(baseUrlLine, helperBlock);
  changes++;
  console.log('✅ 1. Added authToken + authHeaders helper after baseUrl');
} else if (content.includes('const authToken = sessionStorage.getItem')) {
  console.log('ℹ️  1. authToken helper already present — skipping');
} else {
  console.error('❌ 1. baseUrl line not found!');
}

// 2. Fix offline queue flush (sessionStorage only → authHeaders)
const oldQueueHeaders = `headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${sessionStorage.getItem('authToken')}\` },\n              body: JSON.stringify(queuedBall)`;
const newQueueHeaders = `headers: authHeaders,\n              body: JSON.stringify(queuedBall)`;

if (content.includes(oldQueueHeaders)) {
  content = content.replace(oldQueueHeaders, newQueueHeaders);
  changes++;
  console.log('✅ 2. Fixed offline queue flush auth header');
} else {
  console.log('ℹ️  2. Offline queue header already fixed or not found — skipping');
}

// 3. Fix main ball sync (multi-line headers object → authHeaders)
const oldMainHeaders = `'Content-Type': 'application/json',\n            'Authorization': \`Bearer \${sessionStorage.getItem('authToken')}\`\n          },`;
const newMainHeaders = `...authHeaders\n          },`;

if (content.includes(oldMainHeaders)) {
  content = content.replace(oldMainHeaders, newMainHeaders);
  changes++;
  console.log('✅ 3. Fixed main ball sync auth header');
} else {
  // Try alternate form (in case of CRLF)
  const altOld = "            'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`";
  if (content.includes(altOld)) {
    content = content.replace(altOld, "            ...authHeaders");
    // remove the now-redundant 'Content-Type' line above it if it's duplicated
    changes++;
    console.log('✅ 3. Fixed main ball sync auth header (alt form)');
  } else {
    console.log('ℹ️  3. Main ball sync header already fixed or not found — skipping');
  }
}

fs.writeFileSync(FILE, content, 'utf8');
console.log(`\nTotal changes applied: ${changes}`);
console.log('Done. Run: npx tsc --noEmit');
