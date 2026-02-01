import fs from 'fs';
import path from 'path';

async function translate(text, to) {
    if (!text || text.length === 0) return text;
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${to}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.responseData && data.responseData.translatedText) {
            const result = data.responseData.translatedText;
            // Якщо API повернуло те саме слово, значить переклад не знайдено
            return result.toLowerCase() === text.toLowerCase() ? null : result;
        }
    } catch (e) {
        console.error(`Translation failed for ${text}:`, e);
    }
    return null;
}

const baseDir = 'src/lib/data/translations';
const report = JSON.parse(fs.readFileSync('translation_issues_report.json', 'utf8'));

async function run() {
    // Фільтруємо тільки NL та DE з проблемою відсутнього перекладу
    const targets = report.filter(i => 
        (i.lang === 'nl' || i.lang === 'de') && 
        i.issues.includes('Missing translation (matches English value)')
    );

    console.log(`Starting smart translation for ${targets.length} items...`);

    for (let i = 0; i < targets.length; i++) {
        const item = targets[i];
        console.log(`[${i+1}/${targets.length}] Translating "${item.enValue}" to ${item.lang}...`);
        
        const translated = await translate(item.enValue, item.lang);
        
        if (translated) {
            const content = JSON.parse(fs.readFileSync(item.file, 'utf8'));
            content[item.key] = translated;
            fs.writeFileSync(item.file, JSON.stringify(content, null, 4));
            console.log(`  Success: ${translated}`);
        } else {
            console.log(`  Failed or identical translation.`);
        }

        // Затримка 1 секунда між запитами
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log('Done.');
}

run();
