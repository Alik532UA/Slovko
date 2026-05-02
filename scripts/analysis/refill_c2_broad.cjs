const fs = require('fs');

const slovkoWords = new Set();
['A1', 'A2', 'B1', 'B2', 'C1'].forEach(lvl => {
    const data = JSON.parse(fs.readFileSync(`src/lib/data/words/levels/${lvl}.json`, 'utf8').replace(/^\uFEFF/, ''));
    (data.words || data).forEach(w => slovkoWords.add(w.toLowerCase()));
});

const files = [
    '.private/The Oxford by CEFR level/The Oxford 5000™ (American English)/The Oxford 5000™ (American English).txt',
    '.private/The Oxford by CEFR level/The Oxford 3000™ (American English)/The Oxford 3000™ (American English).txt'
];

const c2Candidates = new Set();

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    content.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.includes('Oxford')) return;
        
        if (!/\s([ABC][12])(\r)?$/.test(line)) {
            let parts = line.split(/\s+(v\.|n\.|adj\.|adv\.|prep\.|pron\.|conj\.|det\.|number|article|exclamation)/);
            let wordPart = parts[0].trim();
            wordPart.split(',').forEach(w => {
                w = w.trim().toLowerCase().replace(/\d+$/, '');
                if (w.length > 3 && !slovkoWords.has(w)) {
                    c2Candidates.add(w);
                }
            });
        }
    });
});

const finalC2 = Array.from(c2Candidates).sort().slice(0, 300);
fs.writeFileSync('src/lib/data/words/levels/C2.json', JSON.stringify({id: 'C2', words: finalC2}, null, '\t') + '\n', 'utf8');
console.log(`C2 filled with ${finalC2.length} words.`);
