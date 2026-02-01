
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

const b2WordsFile = path.join(rootDir, 'src/lib/data/words/levels/B2.json');
const translationsDir = path.join(rootDir, 'src/lib/data/translations');
const transcriptionsFile = path.join(rootDir, 'src/lib/data/transcriptions/levels/B2.json');
const languages = ['uk', 'en', 'de', 'nl', 'crh'];

function formatKeyToLabel(key) {
    // drama_noun -> drama
    // alter_plans -> alter plans
    // argue_1 -> argue
    return key
        .replace(/_\d+$/, '') // remove _1, _2
        .replace(/_(noun|verb|adj|adv)$/, '') // remove _noun, _verb
        .replace(/_/g, ' '); // replace underscores with spaces
}

async function fillRemaining() {
    console.log('Filling remaining B2 gaps...');
    
    const b2Data = JSON.parse(fs.readFileSync(b2WordsFile, 'utf8'));
    const words = b2Data.words;

    // 1. Identify missing keys per language (or globally, assuming sync)
    // We'll treat EN as the reference for "missingness" to keep it simple, 
    // but check all languages to be safe.
    
    for (const lang of languages) {
        const transFile = path.join(translationsDir, lang, 'levels', 'B2.json');
        let transData = {};
        if (fs.existsSync(transFile)) {
            transData = JSON.parse(fs.readFileSync(transFile, 'utf8'));
        }

        let addedCount = 0;
        for (const word of words) {
            if (!transData[word] || transData[word].trim() === '') {
                const label = formatKeyToLabel(word);
                transData[word] = label;
                addedCount++;
            }
        }

        if (addedCount > 0) {
            fs.writeFileSync(transFile, JSON.stringify(transData, null, 4));
            console.log(`Updated ${lang}: filled ${addedCount} missing keys with placeholders.`);
        }
    }

    // 2. Transcriptions
    let transData = {};
    if (fs.existsSync(transcriptionsFile)) {
        transData = JSON.parse(fs.readFileSync(transcriptionsFile, 'utf8'));
    }
    let transAdded = 0;
    for (const word of words) {
        if (!transData[word]) {
            transData[word] = "";
            transAdded++;
        }
    }
    if (transAdded > 0) {
        fs.writeFileSync(transcriptionsFile, JSON.stringify(transData, null, 4));
        console.log(`Updated transcriptions: added ${transAdded} empty keys.`);
    }
}

fillRemaining();
