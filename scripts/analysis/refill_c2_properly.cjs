const fs = require('fs');

const slovkoWords = new Set();
['A1', 'A2', 'B1', 'B2', 'C1'].forEach(lvl => {
    const data = JSON.parse(fs.readFileSync(`src/lib/data/words/levels/${lvl}.json`, 'utf8').replace(/^\uFEFF/, ''));
    (data.words || data).forEach(w => slovkoWords.add(w.toLowerCase()));
});

// Also exclude any words that have an explicit level in ANY Oxford file
const oxfordLabeled = new Set();
const oxfordFiles = [
    '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/A1.txt',
    '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/A2.txt',
    '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/B1.txt',
    '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/B2.txt',
    '.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/B2.txt',
    '.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/C1.txt'
];

oxfordFiles.forEach(f => {
    if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf8');
        content.split('\n').forEach(line => {
            let w = line.split(/\s+/)[0].trim().toLowerCase().replace(/,$/, '').replace(/\d+$/, '');
            if (w.length > 1) oxfordLabeled.add(w);
        });
    }
});

const americanFile = '.private/The Oxford by CEFR level/The Oxford 5000™ (American English)/The Oxford 5000™ (American English).txt';
const americanContent = fs.readFileSync(americanFile, 'utf8');
const c2Candidates = new Set();

americanContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.includes('Oxford')) return;
    
    // EXCLUDE if it has A1-C1 label
    if (/\s(A1|A2|B1|B2|C1)$/.test(line)) return;

    let wordPart = line.split(/\s+(v\.|n\.|adj\.)/)[0].trim();
    wordPart.split(',').forEach(w => {
        w = w.trim().toLowerCase().replace(/\d+$/, '');
        if (w.length > 3 && !slovkoWords.has(w) && !oxfordLabeled.has(w)) {
            c2Candidates.add(w);
        }
    });
});

const finalC2 = Array.from(c2Candidates).sort().slice(0, 300);
fs.writeFileSync('src/lib/data/words/levels/C2.json', JSON.stringify({id: 'C2', words: finalC2}, null, '\t') + '\n', 'utf8');
console.log(`C2 filled with ${finalC2.length} words. Example: ${finalC2[0]}`);
