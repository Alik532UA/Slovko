/**
 * Word Service — Сервіс для завантаження та роботи зі словами
 * Динамічний імпорт JSON файлів для code splitting
 */

import { ALL_TOPICS } from "../types";
import { getBaseKey } from "./semantics";
import { logService } from "../services/logService.svelte";
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
					transcriptionModules[path]().then((raw: string) => {
						const data = safeParse<TranscriptionDictionary>(raw);
						return DictionarySchema.parse(data);
					}),
				),
			);
			return Object.assign({}, ...allDicts);
		} else if (category === "topics") {
			const topic = await loadTopic(id);
			const levels = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

			const allPromises: Promise<TranscriptionDictionary>[] = [];
			levels.forEach((l) => {
				const prefix = `./transcriptions/${language}/levels/${l}_`;
				Object.keys(transcriptionModules)
					.filter((p) => p.startsWith(prefix))
					.forEach((p) => {
						allPromises.push(
							transcriptionModules[p]().then((raw: string) => {
								const data = safeParse<TranscriptionDictionary>(raw);
								return DictionarySchema.parse(data);
							}),
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
	} catch (_e) {
		return {};
	}
}
const levelCache = new Map<string, WordLevel>();
const topicCache = new Map<string, WordTopic>();
const phrasesCache = new Map<string, WordLevel>();
const transcriptionCache = new Map<string, TranscriptionDictionary>();
const translationCache = new Map<string, TranslationDictionary>();
const semanticsCache = new Map<string, LocalSemantics>();

// Динамічний імпорт усіх модулів перекладів та транскрипцій через Vite glob
// Використовуємо as: "raw" для підтримки UTF-8 з BOM (Vite JSON plugin може падати на них)
const translationModules = import.meta.glob<string>("./translations/**/*.json", { query: "?raw", import: "default" });
const transcriptionModules = import.meta.glob<string>("./transcriptions/**/*.json", { query: "?raw", import: "default" });
const levelModules = import.meta.glob<string>("./words/levels/*.json", { query: "?raw", import: "default" });
const topicModules = import.meta.glob<string>("./words/topics/*.json", { query: "?raw", import: "default" });
const phrasesLevelModules = import.meta.glob<string>("./phrases/levels/*.json", { query: "?raw", import: "default" });
const tenseRegistryModule = import.meta.glob<string>("./phrases/tenses.json", { query: "?raw", import: "default" });

/**
 * Видалити BOM (Byte Order Mark) та зайві пробіли з початку рядка
 */
const stripBOM = (text: string) => {
	let result = text;
	// Видаляємо BOM, якщо він є (код 0xFEFF)
	if (result.charCodeAt(0) === 0xFEFF) {
		result = result.slice(1);
	}
	// Також про всяк випадок видаляємо BOM через regex та зайві пробіли на початку
	return result.replace(/^\uFEFF/, "").trim();
};

/**
 * Безпечно розпарсити JSON, видаляючи BOM
 */
function safeParse<T>(raw: string): T {
	const stripped = stripBOM(raw);
	try {
		return JSON.parse(stripped) as T;
	} catch (e) {
		logService.error("debug", "Failed to parse JSON. First 10 chars codes:", 
			Array.from(raw.slice(0, 10)).map(c => c.charCodeAt(0)).join(", "));
		logService.error("debug", "Stripped content start:", stripped.slice(0, 20));
		logService.error("debug", "Full error:", e);
		return {} as T;
	}
}

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
			const raw = await translationModules[path]();
			const data = safeParse<LocalSemantics>(raw);
			const parsed = SemanticsSchema.parse(data);
			semanticsCache.set(language, parsed);
			return parsed;
		}
		return { labels: {} };
	} catch (e) {
		if (import.meta.env.DEV)
			logService.error("debug", `Failed to load semantics for ${language}`, e);
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

	const path = `./words/levels/${levelId}.json`;
	if (levelModules[path]) {
		const raw = await levelModules[path]();
		const data = safeParse<unknown>(raw);
		const parsed = LevelFileSchema.parse(data);
		const level: WordLevel = {
			id: parsed.id || levelId,
			name: parsed.name || levelId,
			words: parsed.words,
		};
		levelCache.set(levelId, level);
		return level;
	}
	throw new Error(`Level file not found: ${path}`);
}

/**
 * Завантажити тему за ID
 */
export async function loadTopic(topicId: string): Promise<WordTopic> {
	if (topicCache.has(topicId)) {
		return topicCache.get(topicId)!;
	}

	const path = `./words/topics/${topicId}.json`;
	if (topicModules[path]) {
		const raw = await topicModules[path]();
		const data = safeParse<unknown>(raw);
		const parsed = TopicFileSchema.parse(data);
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
	throw new Error(`Topic file not found: ${path}`);
}

/**
 * Завантажити переклади для конкретної мови та категорії
 */
export async function loadTranslations(
	language: Language,
	category: "levels" | "topics" | "phrases" | "tenses",
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
			const allPromises: Promise<TranslationDictionary>[] = [];

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
						translationModules[path]().then((raw: string) => {
							const data = safeParse<TranslationDictionary>(raw);
							return DictionarySchema.parse(data);
						}).catch((e: unknown) => {
							logService.error("i18n", `Failed to load module ${path}`, e);
							return {} as TranslationDictionary;
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

			const allPromises: Promise<TranslationDictionary>[] = [];
			levels.forEach((l) => {
				const prefix = `./translations/${language}/levels/${l}_`;
				Object.keys(translationModules)
					.filter((p) => p.startsWith(prefix))
					.forEach((p) => {
						allPromises.push(
							translationModules[p]().then((raw: string) => {
								const data = safeParse<TranslationDictionary>(raw);
								return DictionarySchema.parse(data);
							}),
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
						logService.warn("debug", 
							`Missing translation for ${key} in ${language} (Topic: ${id})`,
						);
					topicDict[key] = key;
				}
			});

			translationCache.set(cacheKey, topicDict);
			return topicDict;
		} else if (category === "tenses") {
			// id тут - це phraseId (напр. "p1")
			const path = `./translations/${language}/tenses/${id}.json`;
			if (translationModules[path]) {
				const raw = await translationModules[path]();
				const rawData = safeParse<Record<string, Record<string, string>>>(raw);
				
				// Трансформуємо матрицю фрази у плаский словник ключів
				// t.p1.present_simple.aff -> "I go to school"
				const dict: TranslationDictionary = {};
				for (const [tenseId, forms] of Object.entries(rawData)) {
					for (const [form, text] of Object.entries(forms)) {
						dict[`t.${id}.${tenseId}.${form}`] = text;
					}
				}
				translationCache.set(cacheKey, dict);
				return dict;
			}
			return {};
		} else {
			const path = `./translations/${language}/phrases/${id}.json`;
			if (translationModules[path]) {
				const raw = await translationModules[path]();
				const data = safeParse<TranslationDictionary>(raw);
				const parsed = DictionarySchema.parse(data);
				translationCache.set(cacheKey, parsed);
				return parsed;
			}
			return {};
		}
	} catch (e) {
		logService.warn("debug", `Translations not found for ${language}/${category}/${id}`, e);
		return {};
	}
}

/**
 * Завантажити реєстр часів (списки фраз для пакетів)
 */
export async function loadTenseRegistry(): Promise<{ packs: Record<string, string[]>, all_phrases: string[] }> {
	try {
		const path = "./phrases/tenses.json";
		if (tenseRegistryModule[path]) {
			const raw = await tenseRegistryModule[path]();
			return safeParse<{ packs: Record<string, string[]>, all_phrases: string[] }>(raw);
		}
		throw new Error(`Tense registry file not found: ${path}`);
	} catch (e) {
		logService.error("debug", "Failed to load tense registry", e);
		return { packs: { "3": [] }, all_phrases: [] };
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
		const path = `./phrases/levels/${levelId}.json`;
		if (phrasesLevelModules[path]) {
			const raw = await phrasesLevelModules[path]();
			const data = safeParse<unknown>(raw);
			// Phrases usually follow same structure as Levels
			const parsed = LevelFileSchema.parse(data);
			const result: WordLevel = {
				id: parsed.id || levelId,
				name: parsed.name || levelId,
				words: parsed.words,
			};
			levelCache.set(cacheKey, result);
			return result;
		}
		throw new Error(`Phrases for level ${levelId} not found`);
	} catch (e) {
		logService.error("debug", `Phrases for level ${levelId} not found or invalid`, e);
		return { id: levelId, name: levelId, words: [] };
	}
}

/**
 * Завантажити ВСІ переклади для мови (для плейлистів та пошуку)
 */
export async function loadAllTranslations(language: Language): Promise<TranslationDictionary> {
	// Обов'язково завантажуємо семантику
	await loadLocalSemantics(language);

	const cacheKey = `${language}:all`;
	if (translationCache.has(cacheKey)) {
		return translationCache.get(cacheKey)!;
	}

	const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
	const allPromises: Promise<TranslationDictionary>[] = [];
	const langPattern = `/${language.toLowerCase()}/`;

	// 1. Levels
	levels.forEach((l) => {
		const levelPattern = `/levels/${l.toLowerCase()}_`;
		Object.keys(translationModules)
			.filter((p) => {
				const np = p.toLowerCase().replace(/\\/g, "/");
				return np.includes(levelPattern) && np.includes(langPattern);
			})
			.forEach((p) => {
				allPromises.push(
					translationModules[p]().then((raw: string) => {
						const data = safeParse<TranslationDictionary>(raw);
						return DictionarySchema.parse(data);
					}),
				);
			});
	});

	// 2. Phrases
	levels.forEach((l) => {
		const phrasesPattern = `/phrases/${l.toUpperCase()}.json`;
		Object.keys(translationModules)
			.filter((p) => {
				const np = p.replace(/\\/g, "/");
				return np.includes(phrasesPattern) && np.includes(langPattern);
			})
			.forEach((p) => {
				allPromises.push(
					translationModules[p]().then((raw: string) => {
						const data = safeParse<TranslationDictionary>(raw);
						return DictionarySchema.parse(data);
					}),
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
	const cacheKey = `${language}:tscr:all`;
	if (transcriptionCache.has(cacheKey)) {
		return transcriptionCache.get(cacheKey)!;
	}

	const levels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
	const allPromises: Promise<TranscriptionDictionary>[] = [];
	const langPattern = `/${language.toLowerCase()}/`;

	// 1. Levels
	levels.forEach((l) => {
		const levelPattern = `/levels/${l.toLowerCase()}_`;
		Object.keys(transcriptionModules)
			.filter((p) => {
				const np = p.toLowerCase().replace(/\\/g, "/");
				return np.includes(levelPattern) && np.includes(langPattern);
			})
			.forEach((p) => {
				allPromises.push(
					transcriptionModules[p]().then((raw: string) => {
						const data = safeParse<TranscriptionDictionary>(raw);
						return DictionarySchema.parse(data);
					}),
				);
			});
	});

	// 2. Phrases (if any transcriptions exist for them)
	levels.forEach((l) => {
		const phrasesPattern = `/phrases/${l.toUpperCase()}.json`;
		Object.keys(transcriptionModules)
			.filter((p) => {
				const np = p.replace(/\\/g, "/");
				return np.includes(phrasesPattern) && np.includes(langPattern);
			})
			.forEach((p) => {
				allPromises.push(
					transcriptionModules[p]().then((raw: string) => {
						const data = safeParse<TranscriptionDictionary>(raw);
						return DictionarySchema.parse(data);
					}),
				);
			});
	});

	const allDicts = await Promise.all(allPromises);
	const mergedDict = Object.assign({}, ...allDicts);
	transcriptionCache.set(cacheKey, mergedDict);
	return mergedDict;
}

/**
 * Отримати переклад слова
 */
export function getTranslation(
	word: string,
	translations: TranslationDictionary,
	language: Language = "uk",
): string {
	if (!word) return "";
	let translation = translations[word];
	const baseKey = getBaseKey(word);

	if (import.meta.env.DEV && baseKey && baseKey !== word) {
		logService.log("debug", `[Translation Check] Key: "${word}", Base: "${baseKey}", Direct: "${translation}", BaseTrans: "${translations[baseKey]}"`);
	}

	// Якщо прямого перекладу немає, або він ідентичний базовому (для специфічних ключів)
	// перевіряємо семантичну ієрархію для додавання міток
	if (!translation || (baseKey && baseKey !== word && translation === translations[baseKey])) {
		if (baseKey && translations[baseKey]) {
			const baseTranslation = translations[baseKey];
			const localSemantics = semanticsCache.get(language);
			const label = localSemantics?.labels?.[word];

			// Додаємо мітку ТІЛЬКИ якщо вона не порожня і НЕ збігається з перекладом
			if (label && label.toLowerCase() !== baseTranslation.toLowerCase() && label.toLowerCase() !== translation?.toLowerCase()) {
				const newTranslation = `${baseTranslation} (${label})`;
				if (import.meta.env.DEV) {
					logService.log("debug", `[Semantic Applied] "${word}" -> "${newTranslation}"`);
				}
				return newTranslation;
			}
		}
	}

	if (!translation) {
		if (import.meta.env.DEV) {
			logService.warn("debug", `[Missing Translation] Word: "${word}"`);
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
	let transcription = transcriptions[word];

	// Fallback to base key if specific key doesn't have a transcription
	if (!transcription) {
		const baseKey = getBaseKey(word);
		if (baseKey && transcriptions[baseKey]) {
			transcription = transcriptions[baseKey];
			if (import.meta.env.DEV && !suppressWarning) {
				logService.log("i18n", `[Transcription Fallback] "${word}" -> "${baseKey}" (${transcription})`);
			}
		}
	}
	
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
