import fs from 'fs';
import path from 'path';

const getAllTranslations = (dir) => {
    let translations = new Set();
    if (!fs.existsSync(dir)) return translations;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            const sub = getAllTranslations(filePath);
            sub.forEach(t => translations.add(t));
        } else if (file.endsWith('.json')) {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            Object.values(content).forEach(val => {
                if (typeof val === 'string') {
                    translations.add(normalize(val));
                }
            });
        }
    });
    return translations;
};

const normalize = (s) => {
    let n = s.toLowerCase().trim();
    if (n.startsWith('to ')) n = n.substring(3).trim();
    n = n.replace(/\./g, '');
    return n;
};

const existingEnglish = getAllTranslations('src/lib/data/translations/en');

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

        if (!existingEnglish.has(normalized)) {
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

console.log(`Total truly missing words based on English translations (REFINED): ${allMissing.length}`);
fs.writeFileSync('truly_missing_v3.json', JSON.stringify(allMissing, null, 2), 'utf8');
