
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/lib/data');

function align() {
    // 1. Get all available keys from levels
    const allKeys = new Set();
    const levelsDir = path.join(DATA_DIR, 'words/levels');
    fs.readdirSync(levelsDir).forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(levelsDir, file), 'utf-8'));
        data.words.forEach(w => allKeys.add(w));
    });

    // 2. Process each topic
    const topicsDir = path.join(DATA_DIR, 'words/topics');
    fs.readdirSync(topicsDir).forEach(file => {
        const filePath = path.join(topicsDir, file);
        let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        let newWords = [];

        data.words.forEach(w => {
            if (allKeys.has(w)) {
                newWords.push(w);
            } else {
                // Спробуємо знайти семантичний варіант
                const variants = Array.from(allKeys).filter(k => k.startsWith(w + '_') || k === w);
                if (variants.length > 0) {
                    newWords.push(variants[0]); // Беремо перший знайдений (напр. spring -> spring_season)
                } else {
                    // Якщо взагалі немає — залишаємо як є (це помилка в базі рівнів)
                    newWords.push(w);
                }
            }
        });

        data.words = newWords;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    });
}

align();
