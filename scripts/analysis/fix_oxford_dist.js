import fs from 'fs';
import path from 'path';

const myWordsDir = 'src/lib/data/words/levels';
const oxfordFiles = [
    '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/A1.txt',
    '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/A2.txt',
    '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/B1.txt',
    '.private/The Oxford by CEFR level/The Oxford 3000™ by CEFR level/B2.txt',
    '.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/B2.txt',
    '.private/The Oxford by CEFR level/The Oxford 5000™ by CEFR level/C1.txt',
    '.private/The Oxford by CEFR level/The Oxford 3000™ (American English)/The Oxford 3000™ (American English).txt',
    '.private/The Oxford by CEFR level/The Oxford 5000™ (American English)/The Oxford 5000™ (American English).txt'
];

const oxfordWordToLevel = {}; // word -> set of levels
const posRegex = /\s+(v\.|n\.|adj\.|adv\.|prep\.|pron\.|conj\.|det\.|number|indefinite article|modal v\.|exclamation|auxiliary v\.)/;

// 1. Build a reliable Oxford dictionary
oxfordFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    const basename = path.basename(file);
    let defaultLvl = null;
    if (basename.startsWith('A1')) defaultLvl = 'A1';
    if (basename.startsWith('A2')) defaultLvl = 'A2';
    if (basename.startsWith('B1')) defaultLvl = 'B1';
    if (basename.startsWith('B2')) defaultLvl = 'B2';
    if (basename.startsWith('C1')) defaultLvl = 'C1';

    content.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.includes('Oxford')) return;

        let detectedLevel = defaultLvl;
        const levelMatch = line.match(/\s(A1|A2|B1|B2|C1)$/);
        if (levelMatch) {
            detectedLevel = levelMatch[1];
        }

        let wordPart = line;
        if (levelMatch) wordPart = line.substring(0, levelMatch.index);
        const posMatch = wordPart.match(posRegex);
        if (posMatch) wordPart = wordPart.substring(0, posMatch.index);

        wordPart.split(',').forEach(w => {
            w = w.trim().toLowerCase().replace(/\d+$/, '').replace(/\s+/g, '_');
            if (w && w.length > 1 && !['adj', 'adv', 'prep', 'conj', 'det', 'pron', 'int'].includes(w)) {
                if (detectedLevel) {
                    if (!oxfordWordToLevel[w]) oxfordWordToLevel[w] = new Set();
                    oxfordWordToLevel[w].add(detectedLevel);
                }
            }
        });
    });
});

// 2. Load current Slovko levels
const slovkoWords = {}; // word -> level
['A1', 'A2', 'B1', 'B2', 'C1'].forEach(lvl => {
    const file = `src/lib/data/words/levels/${lvl}.json`;
    if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
        (data.words || data).forEach(w => {
            slovkoWords[w.split('_')[0].toLowerCase()] = lvl;
        });
    }
});

// 3. Find missing words for C1 and B2 (that are actually C1/B2)
const missingForC1 = [];
const missingForB2 = [];
const missingForB1 = [];

for (const [word, levels] of Object.entries(oxfordWordToLevel)) {
    if (slovkoWords[word]) continue; // Already in Slovko

    if (levels.has('C1')) missingForC1.push(word);
    else if (levels.has('B2')) missingForB2.push(word);
    else if (levels.has('B1')) missingForB1.push(word);
}

// 4. Fill C2 with words that are in Oxford but have NO level label A1-C1
// Or words that are "extra"
const allWordsInOxfordFiles = new Set();
// Re-read files to find words without labels
oxfordFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    content.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (!line || line.includes('Oxford')) return;
        const hasLevelLabel = /\s(A1|A2|B1|B2|C1)$/.test(line);
        if (!hasLevelLabel && !path.basename(file).match(/^[ABC][12]/)) {
             // This is a candidate for C2 if it's in a general list but has no level
             let wordPart = line;
             const posMatch = wordPart.match(posRegex);
             if (posMatch) wordPart = wordPart.substring(0, posMatch.index);
             wordPart.split(',').forEach(w => {
                w = w.trim().toLowerCase().replace(/\d+$/, '').replace(/\s+/g, '_');
                if (w && w.length > 1 && !['adj', 'adv', 'prep', 'conj', 'det', 'pron', 'int', 'a1', 'a2', 'b1', 'b2', 'c1'].includes(w)) {
                    if (!oxfordWordToLevel[w]) {
                         allWordsInOxfordFiles.add(w);
                    }
                }
             });
        }
    });
});

const c2Candidates = Array.from(allWordsInOxfordFiles).filter(w => !slovkoWords[w]);

fs.writeFileSync('.temp/fix_distribution.json', JSON.stringify({
    C1_add: missingForC1,
    B2_add: missingForB2,
    C2_new: c2Candidates.slice(0, 300)
}, null, 2));

console.log(`Candidates found: C1=${missingForC1.length}, B2=${missingForB2.length}, C2=${c2Candidates.length}`);
