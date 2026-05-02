const fs = require('fs');

const slovkoWords = new Set();
['A1', 'A2', 'B1', 'B2', 'C1'].forEach(lvl => {
    const data = JSON.parse(fs.readFileSync(`src/lib/data/words/levels/${lvl}.json`, 'utf8').replace(/^\uFEFF/, ''));
    (data.words || data).forEach(w => slovkoWords.add(w.toLowerCase()));
});

const allTranslations = new Set();
const langs = ['en', 'uk', 'el', 'de', 'nl', 'pl', 'crh'];
langs.forEach(lang => {
    const dir = `src/lib/data/translations/${lang}/levels`;
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
            const content = JSON.parse(fs.readFileSync(`${dir}/${file}`, 'utf8').replace(/^\uFEFF/, ''));
            Object.keys(content).forEach(k => allTranslations.add(k.split('_')[0].toLowerCase()));
        });
    }
});

const c2Final = Array.from(allTranslations)
    .filter(w => !slovkoWords.has(w) && w.length > 3)
    .sort();

fs.writeFileSync('src/lib/data/words/levels/C2.json', JSON.stringify({id: 'C2', words: c2Final}, null, '\t') + '\n', 'utf8');
console.log(`C2 filled with ${c2Final.length} words.`);
