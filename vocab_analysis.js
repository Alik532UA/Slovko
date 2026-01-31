
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.resolve(__dirname, 'src/lib/data');
const WORDS_DIR = path.join(BASE_DIR, 'words');
const TRANSLATIONS_DIR = path.join(BASE_DIR, 'translations');
const LANGUAGES = ['en', 'uk', 'crh', 'nl', 'de'];

function getJson(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function analyze() {
    console.log('--- Analysis Start ---');
    console.log(`Checking languages: ${LANGUAGES.join(', ')}`);

    const categories = ['levels', 'topics'];
    let totalMissing = 0;

    for (const category of categories) {
        const categoryPath = path.join(WORDS_DIR, category);
        if (!fs.existsSync(categoryPath)) continue;

        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'));

        for (const file of files) {
            const wordFile = path.join(categoryPath, file);
            const data = getJson(wordFile);
            const wordList = data.words || [];
            const fileName = file.replace('.json', '');

            console.log(`\nCategory: ${category} | File: ${fileName} | Count: ${wordList.length}`);

            for (const lang of LANGUAGES) {
                const transPath = path.join(TRANSLATIONS_DIR, lang, category, file);
                const transData = getJson(transPath) || {};

                const missing = wordList.filter(w => !transData[w]);
                if (missing.length > 0) {
                    console.log(`  [MISSING] ${lang}: ${missing.length} words missing.`);
                    // console.log(`    Examples: ${missing.slice(0, 5).join(', ')}`);
                    totalMissing += missing.length;
                } else {
                    console.log(`  [OK] ${lang}`);
                }
            }
        }
    }
    console.log('--- Analysis End ---');
    console.log(`Total missing translations: ${totalMissing}`);
}

analyze();
