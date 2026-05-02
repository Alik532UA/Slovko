const fs = require('fs');

const oxfordLabeled = {}; // word -> level
const oxfordFiles = [
    {file: '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/A1.txt', lvl: 'A1'},
    {file: '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/A2.txt', lvl: 'A2'},
    {file: '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/B1.txt', lvl: 'B1'},
    {file: '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/B2.txt', lvl: 'B2'},
    {file: '.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/B2.txt', lvl: 'B2'},
    {file: '.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/C1.txt', lvl: 'C1'}
];

const posRegex = /\s+(v\.|n\.|adj\.|adv\.|prep\.|pron\.|conj\.|det\.|number|article|exclamation)/;

oxfordFiles.forEach(({file, lvl}) => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    content.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.includes('Oxford') || line === lvl) return;
        let wordPart = line;
        const posMatch = line.match(posRegex);
        if (posMatch) wordPart = line.substring(0, posMatch.index);
        wordPart.split(',').forEach(w => {
            w = w.trim().toLowerCase().replace(/\d+$/, '').replace(/\s+/g, '_');
            if (w.length > 1) {
                const rank = {'A1':1, 'A2':2, 'B1':3, 'B2':4, 'C1':5};
                if (!oxfordLabeled[w] || rank[lvl] < rank[oxfordLabeled[w]]) {
                    oxfordLabeled[w] = lvl;
                }
            }
        });
    });
});

const americanFiles = [
    '.private/The Oxford by CEFR level/The Oxford 5000™ (American English)/The Oxford 5000™ (American English).txt',
    '.private/The Oxford by CEFR level/The Oxford 3000™ (American English)/The Oxford 3000™ (American English).txt'
];

americanFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    content.split('\n').forEach(line => {
        line = line.trim();
        const m = line.match(/\s([ABC][12])(\r)?$/);
        if (m) {
            const lvl = m[1];
            let wordPart = line.substring(0, m.index);
            const posMatch = wordPart.match(posRegex);
            if (posMatch) wordPart = wordPart.substring(0, posMatch.index);
            wordPart.split(',').forEach(w => {
                w = w.trim().toLowerCase().replace(/\d+$/, '').replace(/\s+/g, '_');
                if (w.length > 1) {
                    const rank = {'A1':1, 'A2':2, 'B1':3, 'B2':4, 'C1':5};
                    if (!oxfordLabeled[w] || rank[lvl] < rank[oxfordLabeled[w]]) {
                        oxfordLabeled[w] = lvl;
                    }
                }
            });
        }
    });
});

const currentSlovko = {}; 
['A1', 'A2', 'B1', 'B2', 'C1'].forEach(lvl => {
    const data = JSON.parse(fs.readFileSync(`src/lib/data/words/levels/${lvl}.json`, 'utf8').replace(/^\uFEFF/, ''));
    data.words.forEach(w => currentSlovko[w.toLowerCase()] = lvl);
});

const toAdd = {B2: [], C1: [], C2: []};

for (const [word, lvl] of Object.entries(oxfordLabeled)) {
    if (!currentSlovko[word]) {
        if (lvl === 'C1') toAdd.C1.push(word);
        if (lvl === 'B2') toAdd.B2.push(word);
    }
}

const allOxfordWordsEver = new Set(Object.keys(oxfordLabeled));
americanFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    content.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.includes('Oxford')) return;
        if (!/\s([ABC][12])(\r)?$/.test(line)) {
            let parts = line.split(posRegex);
            let wordPart = parts[0].trim();
            wordPart.split(',').forEach(w => {
                w = w.trim().toLowerCase().replace(/\d+$/, '').replace(/\s+/g, '_');
                if (w.length > 3 && !allOxfordWordsEver.has(w) && !currentSlovko[w]) {
                    toAdd.C2.push(w);
                }
            });
        }
    });
});

fs.writeFileSync('.temp/final_redistribution.json', JSON.stringify(toAdd, null, 2));
console.log('Analysis complete. final_redistribution.json generated.');
