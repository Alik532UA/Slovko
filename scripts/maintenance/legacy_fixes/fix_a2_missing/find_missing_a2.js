import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const wordsPath = path.join(__dirname, '../src/lib/data/words/levels/A2.json');
const langs = ['en', 'uk', 'de', 'nl', 'crh'];
const translationsBase = path.join(__dirname, '../src/lib/data/translations');

const wordsData = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
const allWords = new Set(wordsData.words);

const report = {};

langs.forEach(lang => {
    const transPath = path.join(translationsBase, lang, 'levels/A2.json');
    if (fs.existsSync(transPath)) {
        const transData = JSON.parse(fs.readFileSync(transPath, 'utf8'));
        const transKeys = new Set(Object.keys(transData));

        const missing = [];
        allWords.forEach(word => {
            if (!transKeys.has(word)) {
                missing.push(word);
            }
        });
        report[lang] = missing;
    } else {
        report[lang] = "File missing";
    }
});

fs.writeFileSync(path.join(__dirname, 'missing_a2_report.json'), JSON.stringify(report, null, 2));
console.log('Report saved to scripts/missing_a2_report.json');
