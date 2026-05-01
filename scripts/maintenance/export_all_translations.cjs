const fs = require('fs');
const path = require('path');

/**
 * Скрипт для агрегації УСІХ перекладів проекту Slovko.
 * Збирає дані з src/lib/data/translations для подальшого аналізу.
 */

const LANGUAGES = ['crh', 'de', 'el', 'en', 'nl', 'pl', 'uk'];
const BASE_PATH = path.join(process.cwd(), 'src/lib/data/translations');
const OUTPUT_FILE = path.join(process.cwd(), '.temp/all_translations_export.json');

const stripBOM = (text) => {
    let result = text;
    if (result.charCodeAt(0) === 0xFEFF) {
        result = result.slice(1);
    }
    return result.replace(/^\uFEFF/, "").trim();
};

/**
 * Рекурсивний пошук файлів
 */
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else if (file.endsWith('.json')) {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

async function exportAll() {
    const result = {};

    console.log(`🚀 Початок глобального збору перекладів...`);

    for (const lang of LANGUAGES) {
        const langPath = path.join(BASE_PATH, lang);
        if (!fs.existsSync(langPath)) continue;

        const files = getAllFiles(langPath);
        console.log(`🔍 [${lang.toUpperCase()}] Знаforward: ${files.length} файлів.`);

        for (const fullPath of files) {
            // Отримуємо відносний шлях (напр. levels/A1_food.json)
            const relativePath = path.relative(langPath, fullPath).replace(/\\/g, '/');
            
            try {
                const rawContent = fs.readFileSync(fullPath, 'utf8');
                const content = JSON.parse(stripBOM(rawContent));
                
                for (const [key, value] of Object.entries(content)) {
                    // Структура: result[key][lang]
                    // Ми також можемо додати метадані про те, з якого файлу це прийшло
                    if (!result[key]) result[key] = { _origin: relativePath };
                    result[key][lang] = value;
                }
            } catch (e) {
                console.error(`❌ Помилка в ${lang}/${relativePath}: ${e.message}`);
            }
        }
    }

    if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
        fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');
    
    const keysCount = Object.keys(result).length;
    console.log(`\n🎉 ГОТОВО! Зібрано ${keysCount} унікальних ключів.`);
    console.log(`📁 Файл збережено: ${OUTPUT_FILE}`);
}

exportAll();
