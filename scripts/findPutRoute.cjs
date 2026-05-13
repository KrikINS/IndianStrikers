const fs = require('fs');
const content = fs.readFileSync('api/index.js', 'utf8');
const lines = content.split('\n');
let start = -1;
lines.forEach((l, i) => {
  if ((l.includes("app.put('/api/matches/:") || l.includes('app.put("/api/matches/:')) && !l.includes('status') && !l.includes('finalize') && !l.includes('lock') && !l.includes('tournament')) {
    console.log('FOUND PUT at line ' + (i+1) + ': ' + l.trim());
    if (start === -1) start = i;
  }
});
if (start > -1) {
  for (let i = start; i < Math.min(start + 80, lines.length); i++) {
    console.log((i+1) + ': ' + lines[i].substring(0, 110));
  }
}
