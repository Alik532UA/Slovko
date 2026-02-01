/**
 * Типи для Word Matching Game
 * SSoT: всі типи визначаються тут
 */

// ========================================
// МОВИ ТА РІВНІ
// ========================================

/** Підтримувані мови */
export type Language = 'uk' | 'en' | 'crh' | 'nl' | 'de';

/** Назви мов для відображення */
export const LANGUAGE_NAMES: Record<Language, string> = {
    uk: 'Українська',
    en: 'English',
    crh: 'Qırımtatarca',
    nl: 'Nederlands',
    de: 'Deutsch'
};

/** Прапори мов (emoji) */
export const LANGUAGE_FLAGS: Record<Language, string> = {
    uk: '🇺🇦',
    en: '🇬🇧',
    crh: '🔵', // Кримськотатарський прапор
    nl: '🇳🇱',
    de: '🇩🇪'
};

/** Теми оформлення */
export type AppTheme = 'dark-gray' | 'light-gray' | 'orange' | 'green';

/** Мовний CEFR рівень */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Всі рівні */
export const ALL_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// ========================================
// СТРУКТУРА ДАНИХ СЛІВ
// ========================================

/**
 * Represents a pair of words for the game logic (runtime only).
 * Not used for storage on disk.
 */
export interface WordPair {
    id: string;
    ukrainian: string;
    english: string;
}

/**
 * Structure of a Level JSON file (e.g., A1.json).
 * Contains only the list of English word keys.
 * Translations are stored separately in `data/translations`.
 */
export interface WordLevel {
    id: CEFRLevel;
    name: string;
    words: string[];
}

/**
 * Structure of a Topic JSON file (e.g., food.json).
 * Contains metadata (icon) and the list of word keys.
 */
export interface WordTopic {
    id: string;
    icon: string;
    words: string[];
}

/**
 * Key-Value map for translations.
 * Key: English word (e.g., "apple")
 * Value: Translated text (e.g., "яблуко")
 */
export type TranslationDictionary = Record<string, string>;

/**
 * Key-Value map for IPA transcriptions.
 * Key: English word (e.g., "apple")
 * Value: IPA string (e.g., "ˈæp.l")
 */
export type TranscriptionDictionary = Record<string, string>;

// ========================================
// СТАН ГРИ
// ========================================

/**
 * Game Modes:
 * - 'levels': Sequential progression (A1 -> A2 -> ...)
 * - 'topics': Thematic learning (Food, Travel, etc.)
 */
export type GameMode = 'levels' | 'topics';

/**
 * Card visual states:
 * - 'idle': Default state
 * - 'selected': Clicked by user (waiting for pair)
 * - 'correct': Successfully matched (green)
 * - 'wrong': Incorrect match (red shake)
 * - 'hint': Highlighted as a hint
 */
export type CardStatus = 'idle' | 'selected' | 'correct' | 'wrong' | 'hint';

/**
 * Runtime representation of a card on the game board.
 */
export interface ActiveCard {
    id: string;
    wordKey: string; // Original key from JSON data
    text: string; // Display text (Translation or Source word)
    transcription?: string; // Only for Source language cards
    language: Language;
    status: CardStatus;
    slot: number; // Grid position index
    isVisible: boolean; // False when matched and removed
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
    { id: 'questions', icon: '❓' },
    { id: 'numbers', icon: '🔢' },
    { id: 'colors', icon: '🎨' },
    { id: 'time', icon: '🕒' },
    { id: 'family_relationships', icon: '👨‍👩‍👧' },
    { id: 'body_health', icon: '🦴' },
    { id: 'clothes_fashion', icon: '👕' },
    { id: 'pronouns_people', icon: '👤' },
    { id: 'basic_verbs', icon: '🏃' },
    { id: 'adjectives', icon: '✨' },
    { id: 'education_work', icon: '🎓' },
    { id: 'abstract_concepts', icon: '💭' },
    { id: 'society_law', icon: '⚖️' },
    { id: 'phrasal_verbs', icon: '🧩' },
    { id: 'adverbs_prepositions', icon: '🔗' }
] as const;

export type TopicId = (typeof ALL_TOPICS)[number]['id'];
