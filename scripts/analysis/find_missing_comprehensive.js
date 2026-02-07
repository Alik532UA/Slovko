import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const MASTER_DIR = path.join(ROOT_DIR, 'src/lib/data/words/levels');
const TRANS_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');

/**
 * COMPREHENSIVE TRANSLATION AUDIT
 * Звіряє Master List кожного рівня з усіма тематичними модулями перекладів.
 */

function audit() {
    console.log('🔍 Запуск повного аудиту перекладів (Модульна структура)...\n');
    
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const languages = fs.readdirSync(TRANS_DIR).filter(l => fs.lstatSync(path.join(TRANS_DIR, l)).isDirectory());
    
    let totalGaps = 0;

    for (const level of levels) {
        const masterPath = path.join(MASTER_DIR, `${level}.json`);
        if (!fs.existsSync(masterPath)) continue;

        const masterData = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
        const masterKeys = masterData.words;

        console.log(`--- Рівень ${level} (${masterKeys.length} слів) ---`);

        for (const lang of languages) {
            const langLevelsDir = path.join(TRANS_DIR, lang, 'levels');
            if (!fs.existsSync(langLevelsDir)) continue;

            // Збираємо всі ключі з усіх файлів, що починаються на [Level]_
            const subFiles = fs.readdirSync(langLevelsDir).filter(f => f.startsWith(`${level}_`));
            const translatedKeys = new Set();

            for (const file of subFiles) {
                const content = JSON.parse(fs.readFileSync(path.join(langLevelsDir, file), 'utf8'));
                Object.keys(content).forEach(k => translatedKeys.add(k));
            }

            const missing = masterKeys.filter(k => !translatedKeys.has(k));

            if (missing.length > 0) {
                console.log(`❌ [${lang.toUpperCase()}] Відсутні переклади: ${missing.length}`);
                missing.forEach(k => console.log(`   - ${k}`));
                totalGaps += missing.length;
            } else {
                console.log(`✅ [${lang.toUpperCase()}] OK`);
            }
        }
        console.log('');
    }

    if (totalGaps === 0) {
        console.log('✨ Аудит завершено: Жодних пропусків не знайдено!');
    } else {
        console.log(`⚠️ Аудит завершено: Знайдено ${totalGaps} пропусків.`);
        process.exit(1);
    }
}

audit();