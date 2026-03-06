const fs = require('fs');
const path = require('path');

/**
 * Скрипт для агрегації перекладів з різних мов у один файл для аналізу.
 * Тестова версія: збирає лише A1_abstract_concepts.json
 */

const LANGUAGES = ['crh', 'de', 'el', 'en', 'nl', 'pl', 'uk'];
const BASE_PATH = path.join(process.cwd(), 'src/lib/data/translations');
const TARGET_FILE = 'levels/A1_abstract_concepts.json';
const OUTPUT_FILE = path.join(process.cwd(), '.temp/export_A1_abstract.json');

async function exportTest() {
    const result = {};

    console.log(`🚀 Збір перекладів для: ${TARGET_FILE}...`);

    for (const lang of LANGUAGES) {
        const filePath = path.join(BASE_PATH, lang, TARGET_FILE);
        
        if (fs.existsSync(filePath)) {
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
                
                for (const [key, value] of Object.entries(content)) {
                    if (!result[key]) result[key] = {};
                    result[key][lang] = value;
                }
                console.log(`✅ [${lang.toUpperCase()}] додано.`);
            } catch (e) {
                console.error(`❌ Помилка читання ${lang}: ${e.message}`);
            }
        } else {
            console.warn(`⚠️ Файл для ${lang} не знайдено.`);
        }
    }

    // Створюємо папку .temp, якщо її немає
    if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');
    console.log(`\n🎉 Готово! Файл збережено: ${OUTPUT_FILE}`);
}

exportTest();
