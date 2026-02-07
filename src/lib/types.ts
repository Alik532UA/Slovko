/**
 * Типи для Word Matching Game
 * SSoT: всі типи визначаються тут
 */

// ========================================
// МОВИ ТА РІВНІ
// ========================================

/** Підтримувані мови */
export type Language = "uk" | "en" | "crh" | "nl" | "de" | "el";

/** Назви мов для відображення */
export const LANGUAGE_NAMES: Record<Language, string> = {
	uk: "Українська",
	en: "English",
	crh: "Qırımtatarca",
	nl: "Nederlands",
	de: "Deutsch",
	el: "Ελληνικά",
};

/** Прапори мов (emoji) */
export const LANGUAGE_FLAGS: Record<Language, string> = {
	uk: "🇺🇦",
	en: "🇬🇧",
	crh: "🔵", // Кримськотатарський прапор
	nl: "🇳🇱",
	de: "🇩🇪",
	el: "🇬🇷",
};

/** Теми оформлення */
export type AppTheme = "dark-gray" | "light-gray" | "orange" | "green";

/** Мовний CEFR рівень */
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "ALL";

/** Всі рівні */
export const ALL_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2", "ALL"];

// ========================================
// СТРУКТУРА ДАНИХ СЛІВ
// ========================================

/** Унікальний ідентифікатор слова (зазвичай англійське слово) */
export type WordKey = string;

/**
 * Represents a pair of words for the game logic (runtime only).
 * Not used for storage on disk.
 */
export interface WordPair {
	id: string;
	source: string;
	target: string;
}

/**
 * Structure of a Level JSON file (e.g., A1.json).
 * Contains only the list of English word keys.
 * Translations are stored separately in `data/translations`.
 */
export interface WordLevel {
	id: string; // id can be CEFRLevel or phrase ID
	name: string;
	words: string[];
}

/**
 * Structure of a Topic JSON file (on disk it is just string[]).
 * In runtime, it is enriched with metadata from ALL_TOPICS.
 */
export interface WordTopic {
	id: string;
	icon: string; // Lucide icon name
	words: string[];
}

/**
 * Key-Value map for translations.
 * Key: English word (e.g., "apple")
 * Value: Translated text (e.g., "яблуко")
 */
export type TranslationDictionary = Record<WordKey, string>;

/**
 * Key-Value map for IPA transcriptions.
 * Key: English word (e.g., "apple")
 * Value: IPA string (e.g., "ˈæp.l")
 */
export type TranscriptionDictionary = Record<WordKey, string>;

/**
 * Локальна семантика для мови (semantics.json)
 */
export interface LocalSemantics {
	labels: Record<string, string>;
}

// ========================================
// СТАН ГРИ
// ========================================

/**
 * Game Modes:
 * - 'levels': Sequential progression (A1 -> A2 -> ...)
 * - 'topics': Thematic learning (Food, Travel, etc.)
 * - 'phrases': Learning phrases by level
 * - 'playlists': Custom collections (Favorites, Mistakes, etc.)
 */
export type GameMode = "levels" | "topics" | "phrases" | "playlists";

// ========================================
// ПЛЕЙЛИСТИ
// ========================================

/** Системні плейлисти */
export type SystemPlaylistId = "favorites" | "mistakes" | "extra";

/** Ідентифікатор плейлиста (системний або UUID) */
export type PlaylistId = SystemPlaylistId | string;

/** Кастомне слово, створене користувачем */
export interface CustomWord {
	id: string;
	original: string;
	translation: string;
	transcription?: string;
}

/**
 * Структура плейлиста.
 * Може містити як ключі існуючих слів, так і повністю кастомні слова.
 */
export interface Playlist {
	id: PlaylistId;
	name: string;
	description?: string;
	color?: string; // HEX колір обводки
	icon?: string; // Назва іконки Lucide
	isSystem: boolean;
	words: (WordKey | CustomWord)[];
	createdAt: number;
}

/**
 * Card visual states:
 */
export type CardStatus =
	| "idle"
	| "selected"
	| "correct"
	| "wrong"
	| "hint"
	| "hint-slow";

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
// СОЦІАЛЬНА ВЗАЄМОДІЯ
// ========================================

export interface UserPrivacySettings {
	showInSearch: boolean;
	allowFriendRequests: boolean;
	shareStats: boolean;
}

// ========================================
// ТЕМИ
// ========================================

/** Всі теми з іконками (Lucide names) */
export const ALL_TOPICS = [
	{ id: "nature", icon: "Leaf" },
	{ id: "animals", icon: "PawPrint" },
	{ id: "travel", icon: "Plane" },
	{ id: "food", icon: "Utensils" },
	{ id: "home", icon: "Home" },
	{ id: "cars", icon: "Car" },
	{ id: "it", icon: "Laptop" },
	{ id: "questions", icon: "HelpCircle" },
	{ id: "numbers", icon: "Hash" },
	{ id: "colors", icon: "Palette" },
	{ id: "time", icon: "Clock" },
	{ id: "family_relationships", icon: "Users" },
	{ id: "body_health", icon: "Heart" },
	{ id: "clothes_fashion", icon: "Shirt" },
	{ id: "pronouns_people", icon: "User" },
	{ id: "basic_verbs", icon: "Footprints" },
	{ id: "adjectives", icon: "Sparkles" },
	{ id: "education_work", icon: "GraduationCap" },
	{ id: "abstract_concepts", icon: "Brain" },
	{ id: "society_law", icon: "Scale" },
	{ id: "phrasal_verbs", icon: "Puzzle" },
	{ id: "adverbs_prepositions", icon: "ArrowLeftRight" },
] as const;

export type TopicId = (typeof ALL_TOPICS)[number]["id"];
