import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations/en/levels');

function analyze() {
    console.log('--- GLOBAL DUPLICATE ANALYSIS (EN) ---');
    
    if (!fs.existsSync(TRANS_DIR)) {
        console.error('Directory not found:', TRANS_DIR);
        return;
    }

    const files = fs.readdirSync(TRANS_DIR).filter(f => f.endsWith('.json'));
    const keyMap = new Map();

    for (const file of files) {
        const filePath = path.join(TRANS_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        Object.keys(data).forEach(key => {
            if (!keyMap.has(key)) {
                keyMap.set(key, []);
            }
            keyMap.get(key).push(file);
        });
    }

    let duplicateCount = 0;
    const sortedKeys = Array.from(keyMap.keys()).sort();

    console.log('Count | Key | Files');
    console.log('-------------------');

    for (const key of sortedKeys) {
        const occurrences = keyMap.get(key);
        if (occurrences.length > 1) {
            duplicateCount++;
            const countStr = String(occurrences.length).padEnd(5, ' ');
            const keyStr = key.padEnd(25, ' ');
            console.log(`${countStr} | ${keyStr} | ${occurrences.join(', ')}`);
        }
    }

    console.log('\nTotal unique duplicate keys found:', duplicateCount);
}

analyze();