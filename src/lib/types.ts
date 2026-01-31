/**
 * Типи для Word Matching Game
 * SSoT: всі типи визначаються тут
 */

// ========================================
// МОВИ ТА РІВНІ
// ========================================

/** Підтримувані мови */
export type Language = 'uk' | 'en' | 'crh' | 'nl';

/** Назви мов для відображення */
export const LANGUAGE_NAMES: Record<Language, string> = {
    uk: 'Українська',
    en: 'English',
    crh: 'Qırımtatarca',
    nl: 'Nederlands'
};

/** Прапори мов (emoji) */
export const LANGUAGE_FLAGS: Record<Language, string> = {
    uk: '🇺🇦',
    en: '🇬🇧',
    crh: '🔵', // Кримськотатарський прапор
    nl: '🇳🇱'
};

/** Мовний CEFR рівень */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Всі рівні */
export const ALL_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// ========================================
// СТРУКТУРА ДАНИХ СЛІВ
// ========================================

/** Рівень слів */
export interface WordLevel {
    id: CEFRLevel;
    name: string;
    words: string[];
}

/** Тема слів */
export interface WordTopic {
    id: string;
    icon: string;
    words: string[];
}

/** Словник перекладів */
export type TranslationDictionary = Record<string, string>;

/** Словник транскрипцій */
export type TranscriptionDictionary = Record<string, string>;

// ========================================
// СТАН ГРИ
// ========================================

/** Статус картки в грі */
export type CardStatus = 'idle' | 'selected' | 'correct' | 'wrong';

/** Активна картка на ігровому полі */
export interface ActiveCard {
    id: string;
    wordKey: string; // Ключ слова (англійською)
    text: string; // Відображуваний текст (переклад)
    transcription?: string; // Транскрипція (для англійської)
    language: Language;
    status: CardStatus;
    slot: number; // Фіксована позиція в сітці
    isVisible: boolean; // Чи видима картка
}

// ========================================
// ТЕМИ
// ========================================

/** Всі теми з іконками */
export const ALL_TOPICS = [
    { id: 'nature', icon: '🌿' },
    { id: 'animals', icon: '🐾' },
    { id: 'travel', icon: '✈️' },
    { id: 'food', icon: '🍕' },
    { id: 'home', icon: '🏠' },
    { id: 'cars', icon: '🚗' },
    { id: 'it', icon: '💻' },
    { id: 'questions', icon: '❓' }
] as const;

export type TopicId = (typeof ALL_TOPICS)[number]['id'];
