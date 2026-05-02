const fs = require('fs');
const toAdd = JSON.parse(fs.readFileSync('.temp/final_redistribution.json', 'utf8'));

function updateLevel(level, newWords) {
  const path = `src/lib/data/words/levels/${level}.json`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  const existing = new Set(data.words.map(w => w.toLowerCase()));
  newWords.forEach(w => existing.add(w));
  data.words = Array.from(existing).sort();
  fs.writeFileSync(path, JSON.stringify(data, null, '\t') + '\n', 'utf8');
}

updateLevel('B2', toAdd.B2);
updateLevel('C1', toAdd.C1);
fs.writeFileSync('src/lib/data/words/levels/C2.json', JSON.stringify({id: 'C2', words: toAdd.C2.slice(0, 300).sort()}, null, '\t') + '\n', 'utf8');
console.log('Final redistribution applied.');
