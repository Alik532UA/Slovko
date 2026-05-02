const fs = require('fs');

const slovkoWords = new Set();
['A1', 'A2', 'B1', 'B2', 'C1'].forEach(lvl => {
    const data = JSON.parse(fs.readFileSync(`src/lib/data/words/levels/${lvl}.json`, 'utf8').replace(/^\uFEFF/, ''));
    data.words.forEach(w => slovkoWords.add(w.toLowerCase()));
});

const oxfordFiles = [
    '.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/C1.txt',
    '.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/B2.txt'
];

const candidates = new Set();
oxfordFiles.forEach(file => {
    const words = fs.readFileSync(file, 'utf8').split('\n').map(l => l.split(/\s+/)[0].replace(/,$/, '').toLowerCase()).filter(w => w.length > 3);
    words.forEach(w => {
        if (!slovkoWords.has(w)) candidates.add(w);
    });
});

const finalC2 = Array.from(candidates).sort().slice(0, 300);
fs.writeFileSync('src/lib/data/words/levels/C2.json', JSON.stringify({id: 'C2', words: finalC2}, null, '\t') + '\n', 'utf8');
console.log(`C2 filled with ${finalC2.length} words.`);
