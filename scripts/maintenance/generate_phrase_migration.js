import fs from 'fs';
import path from 'path';

const enPhrasesDir = 'src/lib/data/translations/en/phrases';
const files = fs.readdirSync(enPhrasesDir).filter(f => f.endsWith('.json'));

const phraseMapping = {};

files.forEach(file => {
    const content = JSON.parse(fs.readFileSync(path.join(enPhrasesDir, file), 'utf8'));
    Object.entries(content).forEach(([key, value]) => {
        // Генеруємо ключ: беремо перші 3-4 слова, прибираємо символи, робимо snake_case
        const cleanValue = value.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .slice(0, 4)
            .join('_');
        
        const newKey = `phrase_${cleanValue}`;
        phraseMapping[key] = newKey;
    });
});

// Додаємо нові ключі до існуючої мапи міграції
const existingMapping = JSON.parse(fs.readFileSync('polysemy_migration.json', 'utf8'));
const finalMapping = { ...existingMapping, ...phraseMapping };

fs.writeFileSync('polysemy_migration.json', JSON.stringify(finalMapping, null, 4));
console.log(`Added ${Object.keys(phraseMapping).length} phrases to migration map.`);
