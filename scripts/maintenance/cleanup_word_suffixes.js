const fs = require('fs');
const path = require('path');

const wordsDir = path.join(process.cwd(), 'src/lib/data/words/levels');

const conjunctions = ['and', 'but', 'because', 'so', 'if', 'or'];
const pronouns = ['he', 'she', 'it', 'they', 'i', 'we', 'me', 'us', 'him', 'them', 'this', 'that', 'these', 'those'];
const others = [
    'camp', 'cross', 'dance', 'film', 'iron', 'paint', 'spell', 'wish',
    'admit', 'float', 'knock', 'murder', 'respect', 'scream', 'search',
    'target', 'touch', 'transport', 'trust', 'upset', 'wave', 'address',
    'applaud', 'circulate', 'cite', 'cooperate', 'criticise', 'dramatise',
    'eject', 'realise', 'recognise', 'regulate', 'rid', 'unify'
];

const suffixGroups = [
    { suffix: '_conjunction', words: conjunctions },
    { suffix: '_pronoun', words: pronouns },
    { suffix: '_verb', words: others },
    { suffix: '_noun', words: others },
    { suffix: '_adj', words: others }
];

fs.readdirSync(wordsDir).forEach(file => {
    if (!file.endsWith('.json')) return;
    const filePath = path.join(wordsDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    let changed = false;
    content.words = content.words.map(word => {
        for (const group of suffixGroups) {
            if (word.endsWith(group.suffix)) {
                const base = word.slice(0, -group.suffix.length);
                if (group.words.includes(base)) {
                    changed = true;
                    return base;
                }
            }
        }
        return word;
    });

    if (changed) {
        // Remove duplicates if any were introduced (e.g. if 'dance' and 'dance_verb' both existed)
        const originalLength = content.words.length;
        content.words = [...new Set(content.words)];
        if (content.words.length !== originalLength) {
            console.log(`Removed ${originalLength - content.words.length} duplicates in ${file}`);
        }
        fs.writeFileSync(filePath, JSON.stringify(content, null, '\t') + '\n');
        console.log(`Updated ${file}`);
    }
});
