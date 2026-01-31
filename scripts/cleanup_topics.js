
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/lib/data');

function cleanup() {
    const allKeys = new Set();
    const levelsDir = path.join(DATA_DIR, 'words/levels');
    fs.readdirSync(levelsDir).forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(levelsDir, file), 'utf-8'));
        data.words.forEach(w => allKeys.add(w));
    });

    const topicsDir = path.join(DATA_DIR, 'words/topics');
    fs.readdirSync(topicsDir).forEach(file => {
        const filePath = path.join(topicsDir, file);
        let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        const validWords = data.words.filter(w => allKeys.has(w));
        const removed = data.words.length - validWords.length;
        
        if (removed > 0) {
            console.log(`Topic ${file}: removed ${removed} missing words.`);
            data.words = validWords;
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
        }
    });
}

cleanup();
