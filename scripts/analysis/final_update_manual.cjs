const fs = require('fs');

function updateLevel(level, newWords) {
  const path = `src/lib/data/words/levels/${level}.json`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  const existing = new Set(data.words.map(w => w.toLowerCase()));
  newWords.forEach(w => existing.add(w));
  data.words = Array.from(existing).sort();
  fs.writeFileSync(path, JSON.stringify(data, null, '\t') + '\n', 'utf8');
}

const dist = JSON.parse(fs.readFileSync('.temp/final_redistribution.json', 'utf8'));
updateLevel('C1', dist.C1);
updateLevel('B2', dist.B2);
fs.writeFileSync('src/lib/data/words/levels/C2.json', JSON.stringify({id: 'C2', words: dist.C2.sort()}, null, '\t') + '\n', 'utf8');
console.log('Master Lists updated.');
