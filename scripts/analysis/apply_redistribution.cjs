const fs = require('fs');

function updateLevel(level, newWords) {
  const path = `src/lib/data/words/levels/${level}.json`;
  const data = JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  const existing = new Set(data.words.map(w => w.toLowerCase()));
  newWords.forEach(w => {
    if (w && w.length > 1) existing.add(w);
  });
  data.words = Array.from(existing).sort();
  fs.writeFileSync(path, JSON.stringify(data, null, '\t') + '\n', 'utf8');
}

const dist = JSON.parse(fs.readFileSync('.temp/fix_distribution.json', 'utf8'));

// 1. Clean C2
fs.writeFileSync('src/lib/data/words/levels/C2.json', JSON.stringify({id: 'C2', words: []}, null, '\t') + '\n', 'utf8');

// 2. Add missing C1 words to C1
updateLevel('C1', dist.C1_add);

// 3. Add missing B2 words to B2
updateLevel('B2', dist.B2_add);

console.log('Redistribution complete.');
