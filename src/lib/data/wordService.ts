/**
 * Word Service — Сервіс для завантаження та роботи зі словами
 * Динамічний імпорт JSON файлів для code splitting
 */

import { ALL_TOPICS } from "../types";
import { getBaseKey } from "./semantics";
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

// Кеш для уникнення повторних завантажень
const levelCache = new Map<string, WordLevel>();
const topicCache = new Map<string, WordTopic>();
const phrasesCache = new Map<string, WordLevel>();
const transcriptionCache = new Map<string, TranscriptionDictionary>();
const translationCache = new Map<string, TranslationDictionary>();
const semanticsCache = new Map<string, LocalSemantics>();

/**
 * Завантажити локальну семантику для мови
 */
async function loadLocalSemantics(language: Language): Promise<LocalSemantics> {
	if (semanticsCache.has(language)) {
		return semanticsCache.get(language)!;
	}
	try {
		const module = await import(`./translations/${language}/semantics.json`);
		const parsed = SemanticsSchema.parse(module.default);
		const data = parsed as LocalSemantics;
		semanticsCache.set(language, data);
		return data;
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

	const module = await import(`./words/levels/${levelId}.json`);
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

	const module = await import(`./words/topics/${topicId}.json`);
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
			// SSoT: Load all levels up to the current one and merge them.
			// This ensures words from A1/A2 are available in B1/B2.
			const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
			const currentIdx = levels.indexOf(id as CEFRLevel);
			const levelsToLoad =
				currentIdx !== -1 ? levels.slice(0, currentIdx + 1) : [id as CEFRLevel];

			const levelPromises = levelsToLoad.map((l) =>
				import(`./translations/${language}/levels/${l}.json`)
					.then((m) => DictionarySchema.parse(m.default))
					.catch((e) => {
						if (import.meta.env.DEV)
							console.warn(`Failed validation/load ${language}/${l}`, e);
						return {};
					}),
			);

			const allLevelsData = await Promise.all(levelPromises);
			const mergedDict = Object.assign({}, ...allLevelsData);

			translationCache.set(cacheKey, mergedDict);
			return mergedDict;
		} else if (category === "topics") {
			// SSoT Refactoring: Topics don't have own translation files.
			// We assemble them from levels.

			// 1. Get keys
			const topic = await loadTopic(id);

			// 2. Load all levels
			// We load them all to ensure we find the word wherever it is.
			const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
			const levelPromises = levels.map((l) =>
				import(`./translations/${language}/levels/${l}.json`)
					.then((m) => DictionarySchema.parse(m.default))
					.catch(() => ({})),
			);

			const allLevelsData = await Promise.all(levelPromises);

			// 3. Merge all dictionaries
			const megaDict = Object.assign({}, ...allLevelsData);

			// 4. Filter for this topic
			const topicDict: TranslationDictionary = {};
			topic.words.forEach((key) => {
				if (megaDict[key]) {
					topicDict[key] = megaDict[key];
				} else {
					if (import.meta.env.DEV)
						console.warn(
							`Missing translation for ${key} in ${language} (Topic: ${id})`,
						);
					topicDict[key] = key; // Fallback
				}
			});

			translationCache.set(cacheKey, topicDict);
			return topicDict;
		} else {
			const module = await import(
				`./translations/${language}/phrases/${id}.json`
			);
			const data = DictionarySchema.parse(module.default);
			translationCache.set(cacheKey, data);
			return data;
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
		let module;
		if (category === "levels") {
			module = await import(
				`$lib/data/transcriptions/${language}/levels/${id}.json`
			);
			return DictionarySchema.parse(module.default);
		} else if (category === "topics") {
			// SSoT for Transcriptions
			const topic = await loadTopic(id);
			const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
			const promises = levels.map((l) =>
				import(`$lib/data/transcriptions/${language}/levels/${l}.json`)
					.then((m) => DictionarySchema.parse(m.default))
					.catch(() => ({})),
			);
			const allData = await Promise.all(promises);
			const megaDict = Object.assign({}, ...allData);

			const topicDict: TranscriptionDictionary = {};
			topic.words.forEach((key) => {
				if (megaDict[key]) topicDict[key] = megaDict[key];
			});
			return topicDict;
		} else {
			// Phrases currently don't have static transcriptions (mostly generative)
			return {};
		}
	} catch (e) {
		// Normal if some languages/levels don't have static transcriptions
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
			console.warn(`[Missing Transcription] Word: "${word}"`);
		}
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
