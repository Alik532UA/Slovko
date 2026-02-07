import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../..');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations/en/levels');
const WORDS_DIR = path.join(ROOT_DIR, 'src/lib/data/words/levels');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

console.log('🚀 Starting Full SSoT Synchronization...');

// 1. Initialize empty word lists for each level
const masterLists = {};
LEVELS.forEach(lvl => {
    masterLists[lvl] = new Set();
});

// 2. Scan all translation files (using EN as reference)
const files = fs.readdirSync(TRANS_DIR).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const levelPrefix = file.split('_')[0]; // e.g., "A1" from "A1_general.json"
    if (!masterLists[levelPrefix]) {
        // Handle files like "common.json" or others if they exist
        return;
    }

    const data = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, file), 'utf8'));
    Object.keys(data).forEach(key => {
        masterLists[levelPrefix].add(key);
    });
});

// 3. Ensure global uniqueness (SSoT) - a word should only be in the LOWEST level
const seen = new Set();
LEVELS.forEach(lvl => {
    const originalWords = Array.from(masterLists[lvl]);
    const uniqueWords = [];
    
    originalWords.forEach(word => {
        if (!seen.has(word)) {
            uniqueWords.push(word);
            seen.add(word);
        }
    });
    
    // 4. Update the Master List files
    const masterPath = path.join(WORDS_DIR, `${lvl}.json`);
    if (fs.existsSync(masterPath)) {
        const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
        const oldSize = masterData.words.length;
        masterData.words = uniqueWords.sort();
        
                fs.writeFileSync(masterPath, JSON.stringify(masterData, null, '\t') + '\n');
        console.log(`[${lvl}] Updated: ${oldSize} -> ${uniqueWords.length} words.`);
    } else {
        console.log(`[${lvl}] Skipping (file not found).`);
    }
});

console.log('✅ Master Lists synchronized with actual translations.');
