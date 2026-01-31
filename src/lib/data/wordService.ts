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
    id: string
): Promise<TranscriptionDictionary> {
    const cacheKey = `transcriptions:${category}:${id}`;

    // Перевіряємо, чи є вже завантажені транскрипції в кеші (потрібно змінити тип кешу або логіку зберігання)
    // Для простоти, поки що не використовуємо глобальний кеш для транскрипцій так само, як для перекладів,
    // але якщо потрібно - можна додати.
    // Тут ми просто повертаємо проміс імпорту.

    let module;
    if (category === 'levels') {
        module = await import(`./transcriptions/levels/${id}.json`);
    } else {
        module = await import(`./transcriptions/topics/${id}.json`);
    }

    return module.default as TranscriptionDictionary;
}

/**
 * Отримати переклад слова
 */
export function getTranslation(word: string, translations: TranslationDictionary): string {
    return translations[word] || word;
}

/**
 * Отримати транскрипцію слова
 */
export function getTranscription(
    word: string,
    transcriptions: TranscriptionDictionary
): string | undefined {
    return transcriptions[word];
}

/**
 * Очистити кеш (для тестування або перезавантаження)
 */
export function clearCache(): void {
    levelCache.clear();
    topicCache.clear();
    translationCache.clear();
    transcriptionCache = null;
}
