import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..'); // Виправлено: скрипт у scripts/analysis/, тому на 2 рівня вгору до кореня
const DATA_DIR = path.join(ROOT_DIR, 'src/lib/data/translations');

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    
    // 1. Пошук дублікатів ключів через регулярні вирази
    const keyRegex = /"([^"]+)"\s*:/g;
    const foundKeys = new Map();
    let match;
    
    while ((match = keyRegex.exec(content)) !== null) {
        const key = match[1];
        if (foundKeys.has(key)) {
            errors.push(`Дублікат КЛЮЧА: "${key}"`);
        }
        foundKeys.set(key, true);
    }

    return errors;
}

function run() {
    console.log('🚀 Запуск перевірки на дублікати...\n');
    console.log(`📁 Папка даних: ${DATA_DIR}\n`);
    
    if (!fs.existsSync(DATA_DIR)) {
        console.error(`❌ Помилка: Папка ${DATA_DIR} не знайдена!`);
        process.exit(1);
    }

    const languages = fs.readdirSync(DATA_DIR);
    let totalErrors = 0;

    for (const lang of languages) {
        const langPath = path.join(DATA_DIR, lang, 'levels');
        if (!fs.existsSync(langPath)) continue;

        const files = fs.readdirSync(langPath).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
            const filePath = path.join(langPath, file);
            const errors = checkFile(filePath);
            
            if (errors.length > 0) {
                console.log(`❌ Файл: src/lib/data/translations/${lang}/levels/${file}`);
                errors.forEach(err => console.log(`   - ${err}`));
                totalErrors += errors.length;
                console.log('');
            }
        }
    }

    if (totalErrors === 0) {
        console.log('✅ Жодних дублікатів ключів не знайдено!');
    } else {
        console.log(`\n⚠️ Всього знайдено помилок: ${totalErrors}`);
        process.exit(1);
    }
}

run();
