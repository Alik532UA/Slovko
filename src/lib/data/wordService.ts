/**
 * Word Service — Сервіс для завантаження та роботи зі словами
 * Динамічний імпорт JSON файлів для code splitting
 */

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
    const topic = module.default as WordTopic;
    topicCache.set(topicId, topic);
    return topic;
}

/**
 * Завантажити переклади для мови та конкретної категорії (рівень або тема)
 */
export async function loadTranslations(
    lang: Language,
    category: 'levels' | 'topics',
    id: string
): Promise<TranslationDictionary> {
    const cacheKey = `${lang}:${category}:${id}`;

    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey)!;
    }

    // Динамічний імпорт специфічного файлу
    // Vite потребує, щоб шлях був відносно статичним для аналізу глобів
    let module;
    if (category === 'levels') {
        module = await import(`./translations/${lang}/levels/${id}.json`);
    } else {
        module = await import(`./translations/${lang}/topics/${id}.json`);
    }

    const translations = module.default as TranslationDictionary;
    translationCache.set(cacheKey, translations);
    return translations;
}

/**
 * Завантажити транскрипції для конкретної категорії (рівень або тема)
 */
export async function loadTranscriptions(
    category: 'levels' | 'topics',
    id: string,
    language: Language = 'en'
): Promise<TranscriptionDictionary> {
    try {
        let module;
        if (category === 'levels') {
            module = await import(`./transcriptions/${language}/levels/${id}.json`);
        } else {
            module = await import(`./transcriptions/${language}/topics/${id}.json`);
        }

        return module.default as TranscriptionDictionary;
    } catch (e) {
        console.warn(`Transcriptions not found for ${language}/${category}/${id}`, e);
        return {};
    }
}

/**
 * Завантажити фрази за рівнем
 */
export async function loadPhrasesLevel(levelId: CEFRLevel): Promise<any[]> {
    if (phrasesCache.has(levelId)) {
        return phrasesCache.get(levelId)!;
    }

    try {
        const module = await import(`./phrases/${levelId.toLowerCase()}.json`);
        // Force TypeScript/Vite to include this glob
        const phrases = module.default;
        phrasesCache.set(levelId, phrases);
        return phrases;
    } catch (e) {
        console.warn(`Phrases for ${levelId} not found`, e);
        return [];
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
