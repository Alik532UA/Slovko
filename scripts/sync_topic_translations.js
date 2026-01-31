
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/lib/data');

const LANGUAGES = ['en', 'uk', 'crh', 'de', 'nl'];

function sync() {
    // 1. Collect all translations from levels
    const allTranslations = {};
    const allIPAs = {};

    LANGUAGES.forEach(lang => {
        allTranslations[lang] = {};
        const levelsDir = path.join(DATA_DIR, 'translations', lang, 'levels');
        if (fs.existsSync(levelsDir)) {
            fs.readdirSync(levelsDir).forEach(file => {
                const data = JSON.parse(fs.readFileSync(path.join(levelsDir, file), 'utf-8'));
                Object.assign(allTranslations[lang], data);
            });
        }
    });

    const ipaLevelsDir = path.join(DATA_DIR, 'transcriptions', 'levels');
    if (fs.existsSync(ipaLevelsDir)) {
        fs.readdirSync(ipaLevelsDir).forEach(file => {
            const data = JSON.parse(fs.readFileSync(path.join(ipaLevelsDir, file), 'utf-8'));
            Object.assign(allIPAs, data);
        });
    }

    // 2. Sync with topics
    const topicsDir = path.join(DATA_DIR, 'words', 'topics');
    fs.readdirSync(topicsDir).forEach(topicFile => {
        const topicId = topicFile.replace('.json', '');
        const topicData = JSON.parse(fs.readFileSync(path.join(topicsDir, topicFile), 'utf-8'));
        const wordKeys = topicData.words || [];

        // Update translations
        LANGUAGES.forEach(lang => {
            const transPath = path.join(DATA_DIR, 'translations', lang, 'topics', topicFile);
            let transData = { id: topicId, name: "", description: "" };
            if (fs.existsSync(transPath)) {
                transData = JSON.parse(fs.readFileSync(transPath, 'utf-8'));
            }

            wordKeys.forEach(key => {
                if (allTranslations[lang][key]) {
                    transData[key] = allTranslations[lang][key];
                }
            });

            fs.writeFileSync(transPath, JSON.stringify(transData, null, 4));
        });

        // Update transcriptions
        const ipaPath = path.join(DATA_DIR, 'transcriptions', 'topics', topicFile);
        const ipaDir = path.join(DATA_DIR, 'transcriptions', 'topics');
        if (!fs.existsSync(ipaDir)) fs.mkdirSync(ipaDir, { recursive: true });

        let ipaData = {};
        if (fs.existsSync(ipaPath)) {
            ipaData = JSON.parse(fs.readFileSync(ipaPath, 'utf-8'));
        }

        wordKeys.forEach(key => {
            if (allIPAs[key]) {
                ipaData[key] = allIPAs[key];
            }
        });

        fs.writeFileSync(ipaPath, JSON.stringify(ipaData, null, 4));
    });

    console.log("Topics synced with level data.");
}

sync();
