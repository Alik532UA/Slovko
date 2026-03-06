/**
 * Скрипт для аналізу багатозначних слів у перекладах
 * Запуск: node scripts/analysis/analyze_polysemy.js
 *
 * Шукає слова, де переклад містить "/" (множинні значення)
 * та групує їх для подальшого розділення на семантичні ключі.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, "../../src/lib/data/translations");
const LANGUAGES = ["uk", "en", "de", "crh", "nl", "el", "pl"];
const CATEGORIES = ["levels", "phrases", "tenses"];

/**
 * Аналізує всі файли перекладів та знаходить багатозначні слова
 */
function analyzePolysemy() {
	const results = [];

	for (const category of CATEGORIES) {
		// Отримуємо список файлів з англійської папки (як еталон)
		const enCategoryPath = path.join(TRANSLATIONS_DIR, "en", category);

		if (!fs.existsSync(enCategoryPath)) {
			console.warn(`⚠️ Папка не існує: ${enCategoryPath}`);
			continue;
		}

		const files = fs.readdirSync(enCategoryPath);

		for (const file of files) {
			if (!file.endsWith(".json")) continue;

			const allTranslations = {};

			// Зчитуємо переклади для всіх мов
			for (const lang of LANGUAGES) {
				const filePath = path.join(TRANSLATIONS_DIR, lang, category, file);
				if (fs.existsSync(filePath)) {
					try {
						let content = fs.readFileSync(filePath, "utf-8");
						content = content.replace(/^\uFEFF+/, '');
						allTranslations[lang] = JSON.parse(content);
					} catch (e) {
						console.error(`❌ Помилка читання ${filePath}: ${e.message}`);
					}
				}
			}

			// Аналізуємо кожний ключ
			const enTranslations = allTranslations["en"] || {};
			for (const [key, enValue] of Object.entries(enTranslations)) {
				// Перевіряємо, чи є "/" в будь-якому перекладі
				const translationsWithSlash = {};
				let hasMultipleMeanings = false;

				for (const lang of LANGUAGES) {
					const translation = allTranslations[lang]?.[key];
					if (translation && typeof translation === 'string') {
						translationsWithSlash[lang] = translation;
						if (translation.includes("/")) {
							hasMultipleMeanings = true;
						}
					} else if (translation !== undefined) {
						translationsWithSlash[lang] = JSON.stringify(translation);
					} else {
						translationsWithSlash[lang] = "❌ MISSING";
					}
				}

				if (hasMultipleMeanings) {
					// Підраховуємо кількість значень
					const meanings = {};
					for (const lang of LANGUAGES) {
						const translation = allTranslations[lang]?.[key];
						if (translation && typeof translation === 'string' && translation.includes("/")) {
							meanings[lang] = translation.split("/").map((s) => s.trim());
						}
					}

					results.push({
						key,
						category,
						file: file.replace(".json", ""),
						translations: translationsWithSlash,
						meanings,
						suggestedKeys: generateSuggestedKeys(key, meanings),
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
	const meaningCount = Math.max(
		...Object.values(meanings).map((arr) => arr?.length || 1),
	);

	if (meaningCount <= 1) return [oldKey];

	return Array.from({ length: meaningCount }, (_, i) => `${oldKey}_${i + 1}`);
}

/**
 * Форматує результати у Markdown таблицю
 */
function formatAsMarkdown(results) {
	let md = "# 📊 Звіт аналізу багатозначних слів\n\n";
	md += `**Дата:** ${new Date().toISOString().split("T")[0]}\n`;
	md += `**Знайдено слів:** ${results.length}\n\n`;

	const grouped = {};
	for (const item of results) {
		const key = `${item.category}/${item.file}`;
		if (!grouped[key]) grouped[key] = [];
		grouped[key].push(item);
	}

	for (const [group, items] of Object.entries(grouped)) {
		md += `## ${group}\n\n`;
		md += "| Ключ | UK | EN | DE | CRH | NL | EL | PL |\n";
		md += "|------|----|----|----|----|-----|----|----|\n";

		for (const item of items) {
			const { key, translations } = item;
			md += `| \`${key}\` | ${translations.uk} | ${translations.en} | ${translations.de} | ${translations.crh} | ${translations.nl} | ${translations.el} | ${translations.pl} |\n`;
		}
		md += "\n";
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
			newKeys: {},
		};
	}

	return migrationMap;
}

// ========== MAIN ==========

console.log("🔍 Аналіз багатозначних слів...\n");

const polysemyWords = analyzePolysemy();

console.log(
	`✅ Знайдено слів з множинними значеннями: ${polysemyWords.length}\n`,
);

console.log("Список за категоріями:\n");
const byCategory = {};
for (const item of polysemyWords) {
	const key = `${item.category}/${item.file}`;
	byCategory[key] = (byCategory[key] || 0) + 1;
}
for (const [cat, count] of Object.entries(byCategory)) {
	console.log(`  📁 ${cat}: ${count} слів`);
}

const markdownReport = formatAsMarkdown(polysemyWords);
const mdPath = path.join(__dirname, "polysemy_report.md");
fs.writeFileSync(mdPath, markdownReport);
console.log(`📄 Markdown звіт збережено: ${mdPath}`);

const migrationData = formatForMigration(polysemyWords);
const jsonPath = path.join(__dirname, "polysemy_migration.json");
fs.writeFileSync(jsonPath, JSON.stringify(migrationData, null, 2));
console.log(`📦 JSON для міграції збережено: ${jsonPath}`);

console.log("\n✅ Аналіз завершено!");
