
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

const b2WordsFile = path.join(rootDir, 'src/lib/data/words/levels/B2.json');
const translationsDir = path.join(rootDir, 'src/lib/data/translations');
const languages = ['uk', 'en', 'de', 'nl', 'crh'];

async function checkB2() {
    console.log('Checking B2 words translations...');
    
    if (!fs.existsSync(b2WordsFile)) {
        console.error('B2 words file not found!');
        return;
    }

    const b2Data = JSON.parse(fs.readFileSync(b2WordsFile, 'utf8'));
    const words = b2Data.words;

    console.log(`Total words in B2: ${words.length}`);

    const missingReport = {};

    for (const lang of languages) {
        const transFile = path.join(translationsDir, lang, 'levels', 'B2.json');
        if (!fs.existsSync(transFile)) {
            console.error(`Translation file not found for ${lang}: ${transFile}`);
            continue;
        }

        const transData = JSON.parse(fs.readFileSync(transFile, 'utf8'));
        const missing = [];

        for (const word of words) {
            if (!transData[word] || transData[word].trim() === '') {
                missing.push(word);
            }
        }

        if (missing.length > 0) {
            missingReport[lang] = missing;
            console.log(`Missing ${missing.length} translations for ${lang}`);
        } else {
            console.log(`All translations present for ${lang}`);
        }
    }

    if (Object.keys(missingReport).length > 0) {
        console.log(JSON.stringify(missingReport, null, 2));
    }
}

checkB2();
