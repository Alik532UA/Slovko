
import fs from 'fs';
import path from 'path';

async function translate(text, from, to) {
    if (!text || text.length === 0) return text;
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
    } catch (e) {
        console.error(`Translation failed for ${text}:`, e);
    }
    return text;
}

async function processFile(filePath, lang) {
    console.log(`\nProcessing ${filePath}...`);
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changed = false;

    const keysToTranslate = Object.keys(data).filter(key => {
        const value = data[key];
        const baseKey = key.split('_')[0];
        // Translate if value is English or equals key
        return value.toLowerCase() === baseKey.toLowerCase() || value === key;
    });

    console.log(`Found ${keysToTranslate.length} keys to translate.`);

    for (let i = 0; i < keysToTranslate.length; i++) {
        const key = keysToTranslate[i];
        const textToTranslate = key.split('_')[0];
        const translated = await translate(textToTranslate, 'en', lang);

        if (translated && translated.toLowerCase() !== textToTranslate.toLowerCase()) {
            data[key] = translated;
            changed = true;
            process.stdout.write(`.`);
        } else {
            process.stdout.write(`x`);
        }

        // Delay to avoid rate limits (1 request per second)
        await new Promise(r => setTimeout(r, 1000));

        if (i > 0 && i % 20 === 0) {
            console.log(`\nProgress: ${i}/${keysToTranslate.length}`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`\nSaved changes to ${filePath}`);
    }
}

async function run() {
    const levels = ['A2', 'B1', 'B2', 'C1', 'C2'];
    for (const level of levels) {
        const filePath = `src/lib/data/translations/el/levels/${level}.json`;
        await processFile(filePath, 'el');
    }
}

run();
