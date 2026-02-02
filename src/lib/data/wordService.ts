/**
 * Word Service — Сервіс для завантаження та роботи зі словами
 * Динамічний імпорт JSON файлів для code splitting
 */

import { ALL_TOPICS } from '../types';
import type {
    WordLevel,
    WordTopic,
    TranslationDictionary,
    TranscriptionDictionary,
    CEFRLevel,
    Language
} from '../types';

// Кеш для уникнення повторних завантажень
const levelCache = new Map<string, WordLevel>();
const topicCache = new Map<string, WordTopic>();
const phrasesCache = new Map<string, any[]>();
const translationCache = new Map<string, TranslationDictionary>();
let transcriptionCache: TranscriptionDictionary | null = null;

/**
 * Завантажити рівень за ID
 */
export async function loadLevel(levelId: CEFRLevel): Promise<WordLevel> {
    if (levelCache.has(levelId)) {
        return levelCache.get(levelId)!;
    }

    const module = await import(`./words/levels/${levelId}.json`);
    const level = module.default as WordLevel;
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
    const words = module.default as string[];
    const meta = ALL_TOPICS.find(t => t.id === topicId);

    const topic: WordTopic = {
        id: topicId,
        icon: meta ? meta.icon : 'HelpCircle',
        words: words
    };

    topicCache.set(topicId, topic);
    return topic;
}

/**
 * Завантажити переклади для конкретної мови та категорії
 */
export async function loadTranslations(
    language: Language,
    category: 'levels' | 'topics' | 'phrases',
    id: string
): Promise<TranslationDictionary> {
    const cacheKey = `${language}:${category}:${id}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey)!;
    }

    try {
        let module;
        if (category === 'levels') {
            module = await import(`./translations/${language}/levels/${id}.json`);
            const data = module.default as TranslationDictionary;
            translationCache.set(cacheKey, data);
            return data;
        } else if (category === 'topics') {
            // SSoT Refactoring: Topics don't have own translation files.
            // We assemble them from levels.
            
            // 1. Get keys
            const topic = await loadTopic(id);
            
            // 2. Load all levels
            // We load them all to ensure we find the word wherever it is.
            // In a PWA this is acceptable (~100KB JSON total).
            const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
            const levelPromises = levels.map(l => 
                import(`./translations/${language}/levels/${l}.json`)
                    .then(m => m.default as TranslationDictionary)
                    .catch(() => ({}))
            );
            
            const allLevelsData = await Promise.all(levelPromises);
            
            // 3. Merge all dictionaries
            const megaDict = Object.assign({}, ...allLevelsData);
            
            // 4. Filter for this topic
            const topicDict: TranslationDictionary = {};
            topic.words.forEach(key => {
                if (megaDict[key]) {
                    topicDict[key] = megaDict[key];
                } else {
                    if (import.meta.env.DEV) console.warn(`Missing translation for ${key} in ${language} (Topic: ${id})`);
                    topicDict[key] = key; // Fallback
                }
            });
            
            translationCache.set(cacheKey, topicDict);
            return topicDict;
        } else {
            module = await import(`./translations/${language}/phrases/${id}.json`);
            const data = module.default as TranslationDictionary;
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
    category: 'levels' | 'topics' | 'phrases',
    id: string,
    language: Language = 'en'
): Promise<TranscriptionDictionary> {
    try {
        let module;
        if (category === 'levels') {
            module = await import(`./transcriptions/${language}/levels/${id}.json`);
            return module.default as TranscriptionDictionary;
        } else if (category === 'topics') {
             // SSoT for Transcriptions
             const topic = await loadTopic(id);
             const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
             const promises = levels.map(l => 
                import(`./transcriptions/${language}/levels/${l}.json`)
                    .then(m => m.default as TranscriptionDictionary)
                    .catch(() => ({}))
             );
             const allData = await Promise.all(promises);
             const megaDict = Object.assign({}, ...allData);
             
             const topicDict: TranscriptionDictionary = {};
             topic.words.forEach(key => {
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
        const data = module.default as WordLevel;
        levelCache.set(cacheKey, data);
        return data;
    } catch (e) {
        console.error(`Phrases for level ${levelId} not found`, e);
        return { id: levelId, words: [] };
    }
}


/**
 * Отримати переклад слова
 */
export function getTranslation(word: string, translations: TranslationDictionary): string {
    const translation = translations[word];
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
    suppressWarning: boolean = false
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
    transcriptionCache = null;
}
