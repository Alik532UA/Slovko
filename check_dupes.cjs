const fs = require('fs');
const content = fs.readFileSync('src/lib/data/translations/nl/levels/B1_general.json', 'utf8');
const lines = content.split('\n');
const counts = {};
lines.forEach(line => {
    const match = line.match(/"([^"]+)":/);
    if (match) {
        const key = match[1];
        counts[key] = (counts[key] || 0) + 1;
    }
});
Object.entries(counts).forEach(([k, v]) => {
    if (v > 1) console.log(`${k}: ${v}`);
});
