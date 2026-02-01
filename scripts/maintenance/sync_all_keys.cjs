const fs = require('fs');
const path = require('path');

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const languages = ['uk', 'crh', 'de', 'nl', 'en'];

levels.forEach(level => {
    const wordsPath = path.join(__dirname, '..', '..', 'src', 'lib', 'data', 'words', 'levels', `${level}.json`);
    if (!fs.existsSync(wordsPath)) return;
    
    const wordsData = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
    const validKeys = new Set(wordsData.words);

    languages.forEach(lang => {
        const translationPath = path.join(__dirname, '..', '..', 'src', 'lib', 'data', 'translations', lang, 'levels', `${level}.json`);
        if (fs.existsSync(translationPath)) {
            const translationData = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
            const newTranslationData = {};
            
            // Keep only valid keys that are in the words list
            wordsData.words.forEach(key => {
                if (translationData[key] !== undefined) {
                    newTranslationData[key] = translationData[key];
                } else {
                    newTranslationData[key] = key; // Placeholder if missing
                }
            });

            fs.writeFileSync(translationPath, JSON.stringify(newTranslationData, null, 4), 'utf8');
            console.log(`Synchronized ${lang} translations for ${level}`);
        }
    });
});
