
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/lib/data/words/levels');

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const existingWords = new Set();

levels.forEach(lvl => {
    const p = path.join(DATA_DIR, `${lvl}.json`);
    if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        data.words.forEach(w => existingWords.add(w));
    }
});

console.log(JSON.stringify(Array.from(existingWords)));
