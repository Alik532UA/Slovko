import fs from 'fs';
const content = JSON.parse(fs.readFileSync('src/lib/data/translations/uk/levels/B1.json', 'utf8'));
const bad = Object.entries(content)
    .filter(([k]) => k.match(/_\d+$/))
    .map(([k, v]) => `${k} -> ${v}`);
console.log(bad.join('\n'));
