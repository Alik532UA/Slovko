import fs from 'fs';
import path from 'path';

const getAllKeys = (dir) => {
    let keys = [];
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            keys = keys.concat(getAllKeys(filePath));
        } else if (file.endsWith('.json')) {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (content.words) {
                keys = keys.concat(content.words);
            }
        }
    });
    return keys;
};

const levelsKeys = getAllKeys('src/lib/data/words/levels');
const topicsKeys = getAllKeys('src/lib/data/words/topics');
const allExistingKeys = [...new Set([...levelsKeys, ...topicsKeys])];

const suffixes = [
    '_pronoun', '_possessive', '_conjunction', '_adj', '_noun', '_verb', 
    '_direction', '_correct', '_1', '_2', '_3', '_4', '_5',
    '_machine', '_child', '_form', '_transport', '_habit', '_clothes',
    '_device', '_object', '_pair', '_event', '_someone', '_word', '_story',
    '_journey', '_relative', '_hobby', '_time', '_location', '_ord',
    '_pure', '_wash', '_penalty', '_dairy', '_cosmetic', '_calendar', 
    '_romantic', '_goal', '_sleep', '_autumn', '_drop', '_material',
    '_cup', '_jewel', '_sound', '_season', '_area', '_cosmos'
];

const normalize = (s) => s.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');

const existingNormalized = new Set();
allExistingKeys.forEach(key => {
    let base = key.toLowerCase();
    if (base.startsWith('to_')) base = base.substring(3);
    
    // Спробуємо видалити відомі суфікси
    let stripped = base;
    for (const suffix of suffixes) {
        if (base.endsWith(suffix)) {
            stripped = base.substring(0, base.length - suffix.length);
            break;
        }
    }
    existingNormalized.add(normalize(stripped));
    existingNormalized.add(normalize(base)); // Також додаємо повний ключ
});

const processFile = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const missing = [];
    let currentCategory = '';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed === '') return;
        if (trimmed.startsWith('//')) {
            currentCategory = trimmed.replace('// ', '');
            return;
        }
        
        const [word, translation] = trimmed.split(';').map(s => s?.trim());
        if (!word) return;

        const normalized = normalize(word);
        const normalizedTo = normalize('to ' + word);
        const normalizedToUnderscore = normalize('to_' + word);

        if (!existingNormalized.has(normalized) && 
            !existingNormalized.has(normalizedTo) && 
            !existingNormalized.has(normalizedToUnderscore)) {
            missing.push({ word, translation, category: currentCategory, level: path.basename(filePath) });
        }
    });
    return missing;
};

const allMissing = [
    ...processFile('add/A1.txt'),
    ...processFile('add/A2 Basic Елементарний.txt'),
    ...processFile('add/B1 Intermediate Середній.txt'),
    ...processFile('add/B2'),
    ...processFile('add/C1')
];

console.log(`Total truly missing words: ${allMissing.length}`);
fs.writeFileSync('truly_missing.json', JSON.stringify(allMissing, null, 2), 'utf8');