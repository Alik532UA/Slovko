const fs = require('fs');
const path = require('path');

const langs = ['en', 'uk', 'el', 'de', 'nl', 'pl', 'crh'];
const dictionary = {}; // word -> { lang -> translation }
const wordToOriginalFile = {}; // word -> original_basename (e.g. A1_general)

langs.forEach(lang => {
    const dir = path.join('src/lib/data/translations', lang, 'levels');
    if (!fs.existsSync(dir)) return;
    
    fs.readdirSync(dir).forEach(file => {
        if (!file.endsWith('.json')) return;
        const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\uFEFF/, ''));
        const category = file.split('_').slice(1).join('_').replace('.json', '');
        
        Object.entries(content).forEach(([word, trans]) => {
            const cleanW = word.toLowerCase();
            if (!dictionary[cleanW]) dictionary[cleanW] = {};
            dictionary[cleanW][lang] = trans;
            
            if (lang === 'en') {
                wordToOriginalFile[cleanW] = category;
            }
        });
    });
});

if (!fs.existsSync('.temp')) fs.mkdirSync('.temp');
fs.writeFileSync('.temp/full_dictionary.json', JSON.stringify(dictionary, null, 2));
fs.writeFileSync('.temp/word_categories.json', JSON.stringify(wordToOriginalFile, null, 2));
console.log('Dictionary and categories mapped.');
