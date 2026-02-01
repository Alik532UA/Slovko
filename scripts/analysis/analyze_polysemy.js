/**
 * Скрипт для аналізу багатозначних слів у перекладах
 * Запуск: node scripts/analyze_polysemy.js
 * 
 * Шукає слова, де переклад містить "/" (множинні значення)
 * та групує їх для подальшого розділення на семантичні ключі.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, '../src/lib/data/translations');
const LANGUAGES = ['uk', 'en', 'de', 'crh', 'nl'];
const CATEGORIES = ['levels', 'topics'];

/**
 * Аналізує всі файли перекладів та знаходить багатозначні слова
 */
function analyzePolysemy() {
    const results = [];

    for (const category of CATEGORIES) {
        // Отримуємо список файлів з англійської папки (як еталон)
        const enCategoryPath = path.join(TRANSLATIONS_DIR, 'en', category);

        if (!fs.existsSync(enCategoryPath)) {
            console.warn(`⚠️ Папка не існує: ${enCategoryPath}`);
            continue;
        }

        const files = fs.readdirSync(enCategoryPath);

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const allTranslations = {};

            // Зчитуємо переклади для всіх мов
            for (const lang of LANGUAGES) {
                const filePath = path.join(TRANSLATIONS_DIR, lang, category, file);
                if (fs.existsSync(filePath)) {
                    try {
                        allTranslations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    } catch (e) {
                        console.error(`❌ Помилка читання ${filePath}: ${e.message}`);
                    }
                }
            }

            // Аналізуємо кожний ключ
            const enTranslations = allTranslations['en'] || {};
            for (const [key, enValue] of Object.entries(enTranslations)) {
                // Перевіряємо, чи є "/" в будь-якому перекладі
                const translationsWithSlash = {};
                let hasMultipleMeanings = false;

                for (const lang of LANGUAGES) {
                    const translation = allTranslations[lang]?.[key];
                    if (translation) {
                        translationsWithSlash[lang] = translation;
                        if (translation.includes('/')) {
                            hasMultipleMeanings = true;
                        }
                    } else {
                        translationsWithSlash[lang] = '❌ MISSING';
                    }
                }

                if (hasMultipleMeanings) {
                    // Підраховуємо кількість значень
                    const meanings = {};
                    for (const lang of LANGUAGES) {
                        const translation = allTranslations[lang]?.[key];
                        if (translation && translation.includes('/')) {
                            meanings[lang] = translation.split('/').map(s => s.trim());
                        }
                    }

                    results.push({
                        key,
                        category,
                        file: file.replace('.json', ''),
                        translations: translationsWithSlash,
                        meanings,
                        suggestedKeys: generateSuggestedKeys(key, meanings)
                    });
                }
            }
        }
    }

    return results;
}

/**
 * Генерує пропоновані нові ключі на основі аналізу значень
 */
function generateSuggestedKeys(oldKey, meanings) {
    // Базова логіка: беремо англійське слово + суфікс
    // Можна покращити за допомогою словника семантичних категорій

    const meaningCount = Math.max(
        ...Object.values(meanings).map(arr => arr?.length || 1)
    );

    if (meaningCount <= 1) return [oldKey];

    // Простий варіант: key_1, key_2
    return Array.from({ length: meaningCount }, (_, i) => `${oldKey}_${i + 1}`);
}

/**
 * Форматує результати у Markdown таблицю
 */
function formatAsMarkdown(results) {
    let md = '# 📊 Звіт аналізу багатозначних слів\n\n';
    md += `**Дата:** ${new Date().toISOString().split('T')[0]}\n`;
    md += `**Знайдено слів:** ${results.length}\n\n`;

    // Групуємо за категорією та файлом
    const grouped = {};
    for (const item of results) {
        const key = `${item.category}/${item.file}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    }

    for (const [group, items] of Object.entries(grouped)) {
        md += `## ${group}\n\n`;
        md += '| Ключ | UK | EN | DE | CRH | NL |\n';
        md += '|------|----|----|----|----|-----|\n';

        for (const item of items) {
            const { key, translations } = item;
            md += `| \`${key}\` | ${translations.uk} | ${translations.en} | ${translations.de} | ${translations.crh} | ${translations.nl} |\n`;
        }
        md += '\n';
    }

    return md;
}

/**
 * Форматує результати у JSON для міграції
 */
function formatForMigration(results) {
    const migrationMap = {};

    for (const item of results) {
        migrationMap[item.key] = {
            category: item.category,
            file: item.file,
            currentTranslations: item.translations,
            meanings: item.meanings,
            suggestedKeys: item.suggestedKeys,
            // Тут AI або людина заповнить нові переклади
            newKeys: {}
        };
    }

    return migrationMap;
}

// ========== MAIN ==========

console.log('🔍 Аналіз багатозначних слів...\n');

const polysemyWords = analyzePolysemy();

// 1. Виводимо в консоль
console.log(`✅ Знайдено слів з множинними значеннями: ${polysemyWords.length}\n`);

console.log('Список за категоріями:\n');
const byCategory = {};
for (const item of polysemyWords) {
    const key = `${item.category}/${item.file}`;
    byCategory[key] = (byCategory[key] || 0) + 1;
}
for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`  📁 ${cat}: ${count} слів`);
}

console.log('\n' + '='.repeat(60) + '\n');

// 2. Зберігаємо Markdown звіт
const markdownReport = formatAsMarkdown(polysemyWords);
const mdPath = path.join(__dirname, 'polysemy_report.md');
fs.writeFileSync(mdPath, markdownReport);
console.log(`📄 Markdown звіт збережено: ${mdPath}`);

// 3. Зберігаємо JSON для міграції
const migrationData = formatForMigration(polysemyWords);
const jsonPath = path.join(__dirname, 'polysemy_migration.json');
fs.writeFileSync(jsonPath, JSON.stringify(migrationData, null, 2));
console.log(`📦 JSON для міграції збережено: ${jsonPath}`);

// 4. Виводимо детальний список
console.log('\n' + '='.repeat(60));
console.log('📋 ДЕТАЛЬНИЙ СПИСОК СЛІВ ДЛЯ РОЗДІЛЕННЯ:');
console.log('='.repeat(60) + '\n');

for (const item of polysemyWords) {
    console.log(`🔑 ${item.key} (${item.category}/${item.file})`);
    for (const lang of LANGUAGES) {
        console.log(`   ${lang.toUpperCase()}: ${item.translations[lang]}`);
    }
    console.log('');
}

console.log('\n✅ Аналіз завершено!');
console.log('📝 Наступний крок: заповніть polysemy_migration.json новими ключами та перекладами.');
