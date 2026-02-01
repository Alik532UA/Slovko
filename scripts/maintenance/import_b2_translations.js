import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

const inputFile = path.join(rootDir, 'add/B2');
const translationsDir = path.join(rootDir, 'src/lib/data/translations');
const transcriptionsFile = path.join(rootDir, 'src/lib/data/transcriptions/levels/B2.json');

const languages = ['uk', 'en', 'de', 'nl', 'crh'];

async function importB2Translations() {
    console.log(`Reading input file: ${inputFile}`);
    if (!fs.existsSync(inputFile)) {
        console.error('Input file not found!');
        return;
    }

    const fileContent = fs.readFileSync(inputFile, 'utf8');
    const lines = fileContent.split('\n');

    const newTranslations = {}; // word -> uk_translation

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) continue;

        const parts = trimmed.split(';');
        if (parts.length >= 2) {
            const word = parts[0].trim();
            const translation = parts[1].trim();
            newTranslations[word] = translation;
        }
    }

    console.log(`Found ${Object.keys(newTranslations).length} words in source file.`);

    // Update translations
    for (const lang of languages) {
        const transFile = path.join(translationsDir, lang, 'levels', 'B2.json');
        let transData = {};
        if (fs.existsSync(transFile)) {
            transData = JSON.parse(fs.readFileSync(transFile, 'utf8'));
        }

        let updatedCount = 0;
        for (const [word, ukTrans] of Object.entries(newTranslations)) {
            if (!transData[word] || transData[word].trim() === '') {
                if (lang === 'uk') {
                    transData[word] = ukTrans;
                } else if (lang === 'en') {
                    transData[word] = word;
                } else {
                    // Fallback to English for other languages
                    transData[word] = word; 
                }
                updatedCount++;
            }
        }

        fs.writeFileSync(transFile, JSON.stringify(transData, null, 4));
        console.log(`Updated ${lang}: added/fixed ${updatedCount} translations.`);
    }

    // Update transcriptions (init with empty or skip? Better to have key present)
    let transData = {};
    if (fs.existsSync(transcriptionsFile)) {
        transData = JSON.parse(fs.readFileSync(transcriptionsFile, 'utf8'));
    }

    let transUpdated = 0;
    for (const word of Object.keys(newTranslations)) {
        if (!transData[word]) {
            transData[word] = ""; // Placeholder
            transUpdated++;
        }
    }
    fs.writeFileSync(transcriptionsFile, JSON.stringify(transData, null, 4));
    console.log(`Updated transcriptions: added ${transUpdated} keys.`);
}

importB2Translations();
