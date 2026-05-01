import fs from 'fs';
import path from 'path';

const MASTER_DIR = 'src/lib/data/words/levels';
const TRANS_DIR = 'src/lib/data/translations';

async function translate(text, to) {
    if (to === 'en') return text;
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${to}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
    } catch (e) {
        console.error(`Translation failed for ${text} to ${to}:`, e);
    }
    return text;
}

function readJson(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
    if (!content) return {};
    try {
        return JSON.parse(content);
    } catch (e) {
        console.error(`Failed to parse JSON: ${filePath}`);
        return {};
    }
}

async function run() {
    const level = 'A1';
    const masterPath = path.join(MASTER_DIR, `${level}.json`);
    const masterData = readJson(masterPath);
    const masterKeys = masterData.words || [];

    const languages = fs.readdirSync(TRANS_DIR).filter(l => fs.lstatSync(path.join(TRANS_DIR, l)).isDirectory());

    for (const lang of languages) {
        console.log(`Processing language: ${lang}`);
        const langLevelsDir = path.join(TRANS_DIR, lang, 'levels');
        if (!fs.existsSync(langLevelsDir)) continue;

        const subFiles = fs.readdirSync(langLevelsDir).filter(f => f.startsWith(`${level}_`));
        const translatedKeys = new Set();
        const allData = {};

        for (const file of subFiles) {
            const content = readJson(path.join(langLevelsDir, file));
            Object.keys(content).forEach(k => translatedKeys.add(k));
        }

        const missing = masterKeys.filter(k => !translatedKeys.has(k));
        if (missing.length === 0) {
            console.log(`✅ [${lang.toUpperCase()}] No missing translations.`);
            continue;
        }

        console.log(`❌ [${lang.toUpperCase()}] Found ${missing.length} missing. Translating...`);

        // Use A1_general.json as target for missing words
        // Check if it exists with or without extension
        let generalFileName = subFiles.find(f => f === `${level}_general.json` || f === `${level}_general`) || `${level}_general.json`;
        const generalPath = path.join(langLevelsDir, generalFileName);
        const generalData = readJson(generalPath);

        let count = 0;
        for (const key of missing) {
            const baseText = key.split('_')[0];
            const translated = await translate(baseText, lang);
            generalData[key] = translated;
            count++;

            if (count % 5 === 0) {
                process.stdout.write('.');
                await new Promise(r => setTimeout(r, 1000));
            }
            if (count >= 50) {
                console.log('\nStopping at 50 to respect API limits.');
                break;
            }
        }
        console.log(`\nAdded ${count} translations to ${generalFileName}`);
        fs.writeFileSync(generalPath, JSON.stringify(generalData, null, 4));
    }
}

run();
