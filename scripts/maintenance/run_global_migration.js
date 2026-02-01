import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, '../src/lib/data/translations');
const WORDS_DIR = path.join(__dirname, '../src/lib/data/words');
const TRANSCRIPTIONS_DIR = path.join(__dirname, '../src/lib/data/transcriptions');
const MIGRATION_DATA_PATH = path.join(__dirname, 'polysemy_migration.json');

const LANGUAGES = ['uk', 'en', 'de', 'crh', 'nl'];

/**
 * Очищує рядок від зайвих символів для ключа
 */
function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '_')           // Замінює пробіли на _
        .replace(/[^\wа-яіїєґ]+/g, '')  // Видаляє все крім букв і цифр
        .replace(/--+/g, '_')           // Замінює подвійні _ на одне
        .replace(/^-+/, '')             // Видаляє _ на початку
        .replace(/-+$/, '');            // Видаляє _ в кінці
}

async function runFullMigration() {
    if (!fs.existsSync(MIGRATION_DATA_PATH)) {
        console.error('❌ Файл polysemy_migration.json не знайдено!');
        return;
    }

    const migrationData = JSON.parse(fs.readFileSync(MIGRATION_DATA_PATH, 'utf-8'));
    const allWords = Object.keys(migrationData);

    // Групуємо слова за файлами для пакетної обробки
    const filesToProcess = {};
    for (const key of allWords) {
        const item = migrationData[key];
        // Пропускаємо A2, бо ми його вже зробили вручну (або можна переробити, але краще не чіпати)
        if (item.file === 'A2' && item.category === 'levels') continue;

        const fileKey = `${item.category}/${item.file}.json`;
        if (!filesToProcess[fileKey]) filesToProcess[fileKey] = [];
        filesToProcess[fileKey].push(key);
    }

    console.log(`🚀 Початок глобальної міграції для ${Object.keys(filesToProcess).length} файлів...\n`);

    for (const [fileKey, keys] of Object.entries(filesToProcess)) {
        const [category, fileName] = fileKey.split('/');
        console.log(`- Обробка ${fileKey}...`);

        // 1. Формуємо карту замін для цього файлу
        const localMigrationMap = {};
        for (const oldKey of keys) {
            const item = migrationData[oldKey];
            const translations = item.currentTranslations;

            // Визначаємо кількість значень (макс по всіх мовах)
            const meaningsByLang = {};
            let maxMeanings = 1;
            for (const lang of LANGUAGES) {
                const parts = (translations[lang] || '').split('/').map(p => p.trim());
                meaningsByLang[lang] = parts;
                if (parts.length > maxMeanings) maxMeanings = parts.length;
            }

            localMigrationMap[oldKey] = {};

            for (let i = 0; i < maxMeanings; i++) {
                // Створюємо змістовний суфікс на основі англійського або українського значення
                // або просто індекс якщо слово однакове
                let suffix = i + 1;
                const ukMeaning = meaningsByLang['uk'][i] || meaningsByLang['uk'][0];

                // Якщо значень більше 1, додаємо суфікс
                const newKey = maxMeanings > 1 ? `${oldKey}_${i + 1}` : oldKey;

                localMigrationMap[oldKey][newKey] = {};
                for (const lang of LANGUAGES) {
                    const langMeanings = meaningsByLang[lang];
                    // Якщо в мові менше значень ніж maxMeanings, беремо останнє доступне або перше
                    const val = langMeanings[i] || langMeanings[langMeanings.length - 1] || langMeanings[0];
                    localMigrationMap[oldKey][newKey][lang] = val;
                }
            }
        }

        // 2. Оновити файл слів
        const wordsPath = path.join(WORDS_DIR, category, fileName);
        if (fs.existsSync(wordsPath)) {
            const wordsData = JSON.parse(fs.readFileSync(wordsPath, 'utf-8'));
            const newWords = [];
            for (const wordKey of wordsData.words) {
                if (localMigrationMap[wordKey]) {
                    newWords.push(...Object.keys(localMigrationMap[wordKey]));
                } else {
                    newWords.push(wordKey);
                }
            }
            wordsData.words = [...new Set(newWords)];
            fs.writeFileSync(wordsPath, JSON.stringify(wordsData, null, 4));
        }

        // 3. Оновити переклади
        for (const lang of LANGUAGES) {
            const transPath = path.join(TRANSLATIONS_DIR, lang, category, fileName);
            if (fs.existsSync(transPath)) {
                const transData = JSON.parse(fs.readFileSync(transPath, 'utf-8'));
                const newTransData = {};

                for (const [key, value] of Object.entries(transData)) {
                    if (localMigrationMap[key]) {
                        for (const [newKey, langMap] of Object.entries(localMigrationMap[key])) {
                            newTransData[newKey] = langMap[lang];
                        }
                    } else {
                        newTransData[key] = value;
                    }
                }
                fs.writeFileSync(transPath, JSON.stringify(newTransData, null, 4));
            }
        }

        // 4. Оновити транскрипції
        const transcPath = path.join(TRANSCRIPTIONS_DIR, category, fileName);
        if (fs.existsSync(transcPath)) {
            const transcData = JSON.parse(fs.readFileSync(transcPath, 'utf-8'));
            const newTranscData = {};
            for (const [key, value] of Object.entries(transcData)) {
                if (localMigrationMap[key]) {
                    for (const newKey of Object.keys(localMigrationMap[key])) {
                        newTranscData[newKey] = value;
                    }
                } else {
                    newTranscData[key] = value;
                }
            }
            fs.writeFileSync(transcPath, JSON.stringify(newTranscData, null, 4));
        }
    }

    console.log('\n✅ Глобальна міграція завершена успішно!');
}

runFullMigration().catch(console.error);
