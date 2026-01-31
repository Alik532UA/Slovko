import fs from 'fs';
import path from 'path';

const getAllKeys = (dir) => {
    let keys = [];
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

fs.writeFileSync('all_existing_keys.json', JSON.stringify(allExistingKeys, null, 2));

const existingBaseWords = new Set();
allExistingKeys.forEach(key => {
    // Очищаємо від суфіксів та префіксів
    let base = key.toLowerCase();
    if (base.startsWith('to_')) base = base.substring(3);
    base = base.split('_')[0];
    existingBaseWords.add(base.replace(/ /g, '_'));
});

const addA2Content = fs.readFileSync('add/A2 Basic Елементарний.txt', 'utf8');
const lines = addA2Content.split('\n');

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

    const normalizedWord = word.toLowerCase().replace(/ /g, '_');
    
    if (!existingBaseWords.has(normalizedWord)) {
        missing.push({ word, translation, category: currentCategory });
    }
});

console.log(`Total missing words found in A2: ${missing.length}`);
fs.writeFileSync('missing_a2.json', JSON.stringify(missing, null, 2));