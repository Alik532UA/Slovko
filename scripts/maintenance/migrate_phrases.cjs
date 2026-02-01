const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', '..', 'src', 'lib', 'data');
const oldPhrasesDir = path.join(baseDir, 'phrases');
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const languages = {
    'ukrainian': 'uk',
    'english': 'en',
    'nl': 'nl',
    'de': 'de',
    'crh': 'crh'
};

levels.forEach(level => {
    const oldFile = path.join(oldPhrasesDir, `${level}.json`);
    if (!fs.existsSync(oldFile)) return;

    console.log(`Migrating ${level}...`);
    const data = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
    
    // 1. Create phrase list (only IDs)
    const phraseIds = data.map(item => item.id);
    const listFile = path.join(oldPhrasesDir, 'levels', `${level.toUpperCase()}.json`);
    fs.writeFileSync(listFile, JSON.stringify({ id: level.toUpperCase(), words: phraseIds }, null, 4));

    // 2. Create translations for each language
    Object.entries(languages).forEach(([oldKey, langCode]) => {
        const translations = {};
        data.forEach(item => {
            translations[item.id] = item[oldKey];
        });

        const langFile = path.join(baseDir, 'translations', langCode, 'phrases', `${level.toUpperCase()}.json`);
        fs.writeFileSync(langFile, JSON.stringify(translations, null, 4));
    });
});

console.log('Migration finished successfully!');
