import fs from 'fs';
import path from 'path';

const existingA1 = JSON.parse(fs.readFileSync('src/lib/data/words/levels/A1.json', 'utf8')).words;

// Створюємо множину "чистих" слів для швидкої перевірки (без суфіксів)
const existingBaseWords = new Set();
existingA1.forEach(key => {
    const base = key.split('_')[0];
    existingBaseWords.add(base.toLowerCase());
});

const addA1Content = fs.readFileSync('add/A1.txt', 'utf8');
const lines = addA1Content.split('\n');

const missing = [];
lines.forEach(line => {
    if (line.trim() === '' || line.startsWith('//')) return;
    const [word, translation] = line.split(';').map(s => s?.trim());
    if (word && !existingBaseWords.has(word.toLowerCase())) {
        missing.push({ word, translation });
    }
});

console.log(JSON.stringify(missing, null, 2));