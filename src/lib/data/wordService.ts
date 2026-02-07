/**
 * Word Service — Сервіс для завантаження та роботи зі словами
 * Динамічний імпорт JSON файлів для code splitting
 */

import { ALL_TOPICS } from "../types";
import { getBaseKey } from "./semantics";
import { logService } from "../services/logService";
import type {
	WordLevel,
	WordTopic,
	TranslationDictionary,
	TranscriptionDictionary,
	CEFRLevel,
	Language,
	LocalSemantics,
} from "../types";
import {
	DictionarySchema,
	LevelFileSchema,
	TopicFileSchema,
	SemanticsSchema,
} from "./schemas";

/**
 * Допоміжна функція для повторних спроб динамічного імпорту.
 * Корисна при нестабільному з'єднанні.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
	try {
		return await fn();
	} catch (e) {
		if (retries <= 0) throw e;
		await new Promise(resolve => setTimeout(resolve, delay));
		return withRetry(fn, retries - 1, delay * 2);
	}
}

// Кеш для уникнення повторних завантажень
const levelCache = new Map<string, WordLevel>();
const topicCache = new Map<string, WordTopic>();
const phrasesCache = new Map<string, WordLevel>();
const transcriptionCache = new Map<string, TranscriptionDictionary>();
const translationCache = new Map<string, TranslationDictionary>();
const semanticsCache = new Map<string, LocalSemantics>();

// Динамічний імпорт усіх модулів перекладів та транскрипцій через Vite glob
const translationModules = import.meta.glob("./translations/**/*.json");
const transcriptionModules = import.meta.glob("./transcriptions/**/*.json");

/**
 * Завантажити локальну семантику для мови
 */
async function loadLocalSemantics(language: Language): Promise<LocalSemantics> {
	if (semanticsCache.has(language)) {
		return semanticsCache.get(language)!;
	}
	try {
		const path = `./translations/${language}/semantics.json`;
		if (translationModules[path]) {
			const module: any = await translationModules[path]();
			const parsed = SemanticsSchema.parse(module.default || module);
			const data = parsed as LocalSemantics;
			semanticsCache.set(language, data);
			return data;
		}
		return { labels: {} };
	} catch (e) {
		if (import.meta.env.DEV)
			console.error(`Failed to load semantics for ${language}`, e);
		return { labels: {} };
	}
}

/**
 * Завантажити рівень за ID
 */
export async function loadLevel(levelId: CEFRLevel): Promise<WordLevel> {
	if (levelCache.has(levelId)) {
		return levelCache.get(levelId)!;
	}

	const module = await withRetry(() => import(`./words/levels/${levelId}.json`));
	const parsed = LevelFileSchema.parse(module.default);
	// Ensure id/name are present (LevelFileSchema allows them to be optional for backward compat)
	const level: WordLevel = {
		id: parsed.id || levelId,
		name: parsed.name || levelId,
		words: parsed.words,
	};
	levelCache.set(levelId, level);
	return level;
}

/**
 * Завантажити тему за ID
 */
export async function loadTopic(topicId: string): Promise<WordTopic> {
	if (topicCache.has(topicId)) {
		return topicCache.get(topicId)!;
	}

	const module = await withRetry(() => import(`./words/topics/${topicId}.json`));
	// On disk, topic is just string[]. In runtime, we enrich it.
	const parsed = TopicFileSchema.parse(module.default);
	const words = parsed.words;
	const meta = ALL_TOPICS.find((t) => t.id === topicId);

	const topic: WordTopic = {
		id: topicId,
		icon: meta ? meta.icon : "HelpCircle",
		words: words,
	};

	topicCache.set(topicId, topic);
	return topic;
}

/**
 * Завантажити переклади для конкретної мови та категорії
 */
export async function loadTranslations(
	language: Language,
	category: "levels" | "topics" | "phrases",
	id: string,
): Promise<TranslationDictionary> {
	// Завантажуємо семантику паралельно
	await loadLocalSemantics(language);

	const cacheKey = `${language}:${category}:${id}`;
	if (translationCache.has(cacheKey)) {
		return translationCache.get(cacheKey)!;
	}

	try {
		if (category === "levels") {
			logService.log("i18n", `Loading level translations for ${language}/${id}...`);
			// SSoT: Load all levels up to the current one and merge them.
			const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
			const currentIdx = levels.indexOf(id as CEFRLevel);
			const levelsToLoad =
				currentIdx !== -1 ? levels.slice(0, currentIdx + 1) : [id as CEFRLevel];

			logService.log("i18n", `Levels to merge: ${levelsToLoad.join(", ")}`);

			// Знаходимо всі модулі для кожного рівня
			const allPromises: Promise<any>[] = [];

			for (const l of levelsToLoad) {
				const levelPattern = `/levels/${l.toLowerCase()}_`;
				const langPattern = `/${language.toLowerCase()}/`;
				
				const matchingPaths = Object.keys(translationModules).filter((path) => {
					const normalizedPath = path.toLowerCase().replace(/\\/g, "/");
					return normalizedPath.includes(levelPattern) && normalizedPath.includes(langPattern);
				});

				logService.log("i18n", `Level ${l} (${language}): found ${matchingPaths.length} modules`);

				matchingPaths.forEach((path) => {
					allPromises.push(
						translationModules[path]().then((m: any) =>
							DictionarySchema.parse(m.default || m),
						).catch(e => {
							logService.error("i18n", `Failed to load module ${path}`, e);
							return {};
						})
					);
				});
			}

			const allDicts = await Promise.all(allPromises);
			const mergedDict = Object.assign({}, ...allDicts);

			logService.log("i18n", `Successfully merged ${allDicts.length} modules. Total keys: ${Object.keys(mergedDict).length}`);

			translationCache.set(cacheKey, mergedDict);
			return mergedDict;
		} else if (category === "topics") {
			// Assemble from all levels to ensure we find everything
			const topic = await loadTopic(id);
			const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

			const allPromises: Promise<any>[] = [];
			levels.forEach((l) => {
				const prefix = `./translations/${language}/levels/${l}_`;
				Object.keys(translationModules)
					.filter((p) => p.startsWith(prefix))
					.forEach((p) => {
						allPromises.push(
							translationModules[p]().then((m: any) =>
								DictionarySchema.parse(m.default || m),
							),
						);
					});
			});

			const allDicts = await Promise.all(allPromises);
			const megaDict = Object.assign({}, ...allDicts);

			const topicDict: TranslationDictionary = {};
			topic.words.forEach((key) => {
				if (megaDict[key]) {
					topicDict[key] = megaDict[key];
				} else {
					if (import.meta.env.DEV)
						console.warn(
							`Missing translation for ${key} in ${language} (Topic: ${id})`,
						);
					topicDict[key] = key;
				}
			});

			translationCache.set(cacheKey, topicDict);
			return topicDict;
		} else {
			const path = `./translations/${language}/phrases/${id}.json`;
			if (translationModules[path]) {
				const module: any = await translationModules[path]();
				const data = DictionarySchema.parse(module.default || module);
				translationCache.set(cacheKey, data);
				return data;
			}
			return {};
		}
	} catch (e) {
		console.warn(`Translations not found for ${language}/${category}/${id}`, e);
		return {};
	}
}

/**
 * Завантажити транскрипції для конкретної категорії
 */
export async function loadTranscriptions(
	category: "levels" | "topics" | "phrases",
	id: string,
	language: Language = "en",
): Promise<TranscriptionDictionary> {
	try {
		if (category === "levels") {
			const prefix = `./transcriptions/${language}/levels/${id}_`;
			const matchingPaths = Object.keys(transcriptionModules).filter((path) =>
				path.startsWith(prefix),
			);

			const allDicts = await Promise.all(
				matchingPaths.map((path) =>
					transcriptionModules[path]().then((m: any) =>
						DictionarySchema.parse(m.default || m),
					),
				),
			);
			return Object.assign({}, ...allDicts);
		} else if (category === "topics") {
			const topic = await loadTopic(id);
			const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

			const allPromises: Promise<any>[] = [];
			levels.forEach((l) => {
				const prefix = `./transcriptions/${language}/levels/${l}_`;
				Object.keys(transcriptionModules)
					.filter((p) => p.startsWith(prefix))
					.forEach((p) => {
						allPromises.push(
							transcriptionModules[p]().then((m: any) =>
								DictionarySchema.parse(m.default || m),
							),
						);
					});
			});

			const allData = await Promise.all(allPromises);
			const megaDict = Object.assign({}, ...allData);

			const topicDict: TranscriptionDictionary = {};
			topic.words.forEach((key) => {
				if (megaDict[key]) topicDict[key] = megaDict[key];
			});
			return topicDict;
		} else {
			return {};
		}
	} catch (e) {
		return {};
	}
}

/**
 * Завантажити фрази за рівнем
 */
export async function loadPhrasesLevel(levelId: CEFRLevel): Promise<WordLevel> {
	const cacheKey = `phrases:${levelId}`;
	if (levelCache.has(cacheKey)) {
		return levelCache.get(cacheKey)!;
	}

	try {
		const module = await import(`./phrases/levels/${levelId}.json`);
		// Phrases usually follow same structure as Levels
		const parsed = LevelFileSchema.parse(module.default);
		const data: WordLevel = {
			id: parsed.id || levelId,
			name: parsed.name || levelId,
			words: parsed.words,
		};
		levelCache.set(cacheKey, data);
		return data;
	} catch (e) {
		console.error(`Phrases for level ${levelId} not found or invalid`, e);
		return { id: levelId, name: levelId, words: [] };
	}
}

/**
 * Завантажити ВСІ переклади для мови (для плейлистів та пошуку)
 */
export async function loadAllTranslations(language: Language): Promise<TranslationDictionary> {
	const cacheKey = `${language}:all`;
	if (translationCache.has(cacheKey)) {
		return translationCache.get(cacheKey)!;
	}

	const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
	const allPromises: Promise<any>[] = [];

	levels.forEach((l) => {
		const prefix = `./translations/${language}/levels/${l}_`;
		Object.keys(translationModules)
			.filter((p) => p.startsWith(prefix))
			.forEach((p) => {
				allPromises.push(
					translationModules[p]().then((m: any) =>
						DictionarySchema.parse(m.default || m),
					),
				);
			});
	});

	const allDicts = await Promise.all(allPromises);
	const mergedDict = Object.assign({}, ...allDicts);
	translationCache.set(cacheKey, mergedDict);
	return mergedDict;
}

/**
 * Завантажити ВСІ транскрипції для мови
 */
export async function loadAllTranscriptions(language: Language = "en"): Promise<TranscriptionDictionary> {
	const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
	const allPromises: Promise<any>[] = [];

	levels.forEach((l) => {
		const prefix = `./transcriptions/${language}/levels/${l}_`;
		Object.keys(transcriptionModules)
			.filter((p) => p.startsWith(prefix))
			.forEach((p) => {
				allPromises.push(
					transcriptionModules[p]().then((m: any) =>
						DictionarySchema.parse(m.default || m),
					),
				);
			});
	});

	const allDicts = await Promise.all(allPromises);
	return Object.assign({}, ...allDicts);
}

/**
 * Отримати переклад слова
 */
export function getTranslation(
	word: string,
	translations: TranslationDictionary,
	language: Language = "uk",
): string {
	let translation = translations[word];

	// Якщо прямого перекладу немає, перевіряємо семантичну ієрархію
	if (!translation) {
		const baseKey = getBaseKey(word);
		if (baseKey && translations[baseKey]) {
			const baseTranslation = translations[baseKey];

			// Беремо мітку з локальної семантики мови
			const localSemantics = semanticsCache.get(language);
			const label = localSemantics?.labels?.[word];

			// Якщо є мітка (напр. "старший"), додаємо її до базового перекладу
			translation = label ? `${baseTranslation} (${label})` : baseTranslation;

			if (import.meta.env.DEV) {
				console.log(
					`[Semantic Fallback] Key: "${word}", Base: "${baseKey}", Translation: "${translation}" (${language})`,
				);
			}
		}
	}

	if (!translation) {
		if (import.meta.env.DEV) {
			console.warn(`[Missing Translation] Word: "${word}"`);
		}
		return word;
	}
	return translation;
}

/**
 * Отримати транскрипцію слова
 */
export function getTranscription(
	word: string,
	transcriptions: TranscriptionDictionary,
	suppressWarning: boolean = false,
): string | undefined {
	const transcription = transcriptions[word];
	
	if (!transcription) {
		if (import.meta.env.DEV && !suppressWarning) {
			logService.warn("i18n", `[Missing Transcription] Word: "${word}"`);
		}
		// Системний fallback: якщо транскрипції немає, ми не повертаємо нічого (або могли б генерувати)
		// UI сам вирішить, чи показувати щось.
	}
	
	return transcription;
}

/**
 * Очистити кеш (для тестування або перезавантаження)
 */
export function clearCache(): void {
	levelCache.clear();
	topicCache.clear();
	translationCache.clear();
	phrasesCache.clear();
	transcriptionCache.clear();
}
