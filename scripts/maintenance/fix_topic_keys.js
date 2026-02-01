
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/lib/data/words/topics');

const FIXES = {
    "numbers.json": { "second": "second_ord" },
    "time.json": { "spring": "spring_season" },
    "adjectives.json": { "easy": "easy", "wrong": "wrong" }, // checking if they need suffixes
};

function fix() {
    fs.readdirSync(DATA_DIR).forEach(file => {
        const filePath = path.join(DATA_DIR, file);
        let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        let changed = false;

        if (FIXES[file]) {
            Object.entries(FIXES[file]).forEach(([oldKey, newKey]) => {
                const idx = data.words.indexOf(oldKey);
                if (idx !== -1) {
                    data.words[idx] = newKey;
                    changed = true;
                }
            });
        }

        // Автоматичне виправлення для загальних суфіксів
        data.words = data.words.map(w => {
            if (w === "spring") return "spring_season";
            if (w === "second" && file === "numbers.json") return "second_ord";
            if (w === "second" && file === "time.json") return "second_time";
            return w;
        });

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    });
}
fix();
