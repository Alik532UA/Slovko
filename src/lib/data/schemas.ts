import { z } from "zod";

// ========================================
// БАЗОВІ СХЕМИ
// ========================================

/**
 * Схема для словника перекладів або транскрипцій.
 */
export const DictionarySchema = z.record(z.string(), z.string());

/**
 * Схема для списку слів (масив рядків).
 */
export const WordListSchema = z.array(z.string());

// ========================================
// СХЕМИ ФАЙЛІВ ДАНИХ
// ========================================

export const LevelFileSchema = z
	.object({
		id: z.string().optional(),
		name: z.string().optional(),
		words: WordListSchema,
	})
	.or(
		z
			.array(z.string())
			.transform((words) => ({ words, id: undefined, name: undefined })),
	);

export const TopicFileSchema = z
	.array(z.string())
	.transform((words) => ({ words }));

export const SemanticsSchema = z.object({
	labels: z.record(z.string(), z.string()),
});

// ========================================
// СХЕМИ ПЛЕЙЛІСТІВ (User Data)
// ========================================

export const CustomWordSchema = z.object({
	id: z.string(),
	left: z.string().max(200, "Too long"),
	right: z.string().max(200, "Too long"),
	transcription: z.string().max(200, "Too long").optional(),
});

export const PlaylistWordSchema = z.union([z.string(), CustomWordSchema]);

export const PlaylistSchema = z.object({
	id: z.string(),
	name: z.string().max(50, "Name too long"),
	description: z.string().max(200, "Description too long").optional().default(""),
	color: z.string().optional().default("#3a8fd6"),
	icon: z.string().optional().default("Bookmark"),
	isSystem: z.boolean().default(false),
	words: z.array(PlaylistWordSchema).default([]),
	createdAt: z.number().default(() => Date.now()),
});

// Допоміжні типи для дефолтних значень
const createDefaultSystemPlaylist = (
	id: string,
	name: string,
	color: string,
) => ({
	id,
	name,
	isSystem: true,
	color,
	words: [],
	description: "",
	icon: "Bookmark",
	createdAt: Date.now(),
});

const DEFAULT_FAVORITES = createDefaultSystemPlaylist(
	"favorites",
	"playlists.favorites",
	"#2ecc71",
);
const DEFAULT_MISTAKES = createDefaultSystemPlaylist(
	"mistakes",
	"playlists.mistakes",
	"#e74c3c",
);
const DEFAULT_EXTRA = createDefaultSystemPlaylist(
	"extra",
	"playlists.extra",
	"#3a8fd6",
);

/**
 * Схема стану плейлістів.
 */
const PlaylistStateCoreSchema = z.object({
	customPlaylists: z.array(PlaylistSchema).default([]),
	systemPlaylists: z
		.object({
			favorites: PlaylistSchema.default(DEFAULT_FAVORITES),
			mistakes: PlaylistSchema.default(DEFAULT_MISTAKES),
			extra: PlaylistSchema.default(DEFAULT_EXTRA),
		})
		.default({
			favorites: DEFAULT_FAVORITES,
			mistakes: DEFAULT_MISTAKES,
			extra: DEFAULT_EXTRA,
		}),
	mistakeMetadata: z.record(z.string(), z.number()).default({}),
	updatedAt: z.number().default(0),
	dbVersion: z.number().default(1),
});

export const PlaylistStateSchema = z.preprocess((val: unknown) => {
	if (!val || typeof val !== "object") return {};

	const v = val as Record<string, unknown>;

	// Функція для нормалізації плейліста (якщо це масив — перетворюємо на об'єкт)
	const normalize = (data: unknown, fallback: Playlist): Playlist => {
		let result: Playlist;

		if (Array.isArray(data)) {
			result = { ...fallback, words: data as (string | CustomWord)[] };
		} else if (data && typeof data === "object") {
			result = { ...fallback, ...(data as Partial<Playlist>) };
		} else {
			result = fallback;
		}

		// Додатково нормалізуємо масив words всередині плейліста
		if (result.words && Array.isArray(result.words)) {
			result.words = result.words.map((w: unknown) => {
				if (typeof w === "string") return w;

				if (w && typeof w === "object") {
					const obj = w as Record<string, unknown>;
					// Якщо це старий формат mistake entry: { pair: { id: '...' } }
					const pair = obj.pair as Record<string, unknown> | undefined;
					if (pair && typeof pair === "object" && pair.id)
						return String(pair.id);

					// Якщо це просто об'єкт з id: { id: '...' }
					if (
						obj.id &&
						!obj.original &&
						!obj.translation &&
						!obj.term &&
						!obj.definition &&
						!obj.left &&
						!obj.right
					)
						return String(obj.id);

					// Legacy migration: original/term -> left, translation/definition -> right
					if (
						obj.id &&
						(obj.original || obj.translation || obj.term || obj.definition)
					) {
						return {
							id: String(obj.id),
							left: String(obj.left || obj.term || obj.original || ""),
							right: String(obj.right || obj.definition || obj.translation || ""),
							transcription: obj.transcription ? String(obj.transcription) : undefined,
						};
					}

					// Якщо це схоже на CustomWord (id, left, right) — залишаємо як є
					if (obj.id && obj.left && obj.right) return obj as unknown as CustomWord;

					// В іншому випадку спробуємо витягнути будь-який id або перетворити на рядок
					return String(obj.id || JSON.stringify(obj));
				}

				return String(w);
			});

			// Дедуплікація слів за ID для запобігання роздуванню БД
			const seen = new Set<string>();
			result.words = result.words.filter((w: string | CustomWord) => {
				const id = typeof w === "string" ? w : w.id;
				if (seen.has(id)) return false;
				seen.add(id);
				return true;
			});
		}

		return result;
	};

	// Legacy migration: дані можуть бути в v.systemPlaylists або на верхньому рівні v
	const systemPlaylists = (v.systemPlaylists as Record<string, unknown>) || {};

	const favorites = normalize(
		systemPlaylists.favorites || v.favorites,
		DEFAULT_FAVORITES,
	);
	const mistakes = normalize(
		systemPlaylists.mistakes || v.mistakes,
		DEFAULT_MISTAKES,
	);
	const extra = normalize(systemPlaylists.extra || v.extra, DEFAULT_EXTRA);

	// Міграція для кастомних плейлістів
	const customPlaylists = Array.isArray(v.customPlaylists)
		? v.customPlaylists.map((p: unknown) => normalize(p, {} as Playlist))
		: [];

	return {
		...v,
		systemPlaylists: {
			favorites,
			mistakes,
			extra,
		},
		customPlaylists,
		mistakeMetadata: (v.mistakeMetadata as Record<string, number>) || {},
	};
}, PlaylistStateCoreSchema);

// ========================================
// СХЕМИ НАЛАШТУВАНЬ (AppSettings)
// ========================================

const AppSettingsCoreSchema = z.object({
	interfaceLanguage: z.enum(["en", "uk", "nl", "de", "el", "crh"]).default("uk"),
	sourceLanguage: z.enum(["en", "uk", "nl", "de", "el", "crh"]).default("en"),
	targetLanguage: z.enum(["en", "uk", "nl", "de", "el", "crh"]).default("uk"),
	mode: z.enum(["levels", "topics", "phrases", "tenses", "playlists"]).default("levels"),
	interactionMode: z.enum(["match", "swipe"]).default("match"),
	currentLevel: z.array(z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "ALL"])).default(["A1"]),
	currentTopic: z.array(z.string()).default(["nature"]),
	currentTenses: z.array(z.string()).default(["present_simple"]),
	currentForms: z.array(z.enum(["aff", "neg", "ques"])).default(["aff", "neg", "ques"]),
	tenseQuantity: z.enum(["1", "3", "many"]).default("3"),
	currentPlaylist: z.string().nullable().default(null),
	hasCompletedOnboarding: z.boolean().default(false),
	enablePronunciationSource: z.boolean().default(true),
	enablePronunciationTarget: z.boolean().default(false),
	showTranscriptionSource: z.boolean().default(true),
	showTranscriptionTarget: z.boolean().default(false),
	voicePreferences: z.record(z.string(), z.string()).default({}),
	theme: z
		.enum(["dark-gray", "light-gray", "orange", "green"])
		.default("dark-gray"),
	lastSeenFollowerAt: z.number().default(0),
	updatedAt: z.number().default(0),
});

export const AppSettingsSchema = z.preprocess((val: unknown) => {
	if (!val || typeof val !== "object") return {};

	const v = val as Record<string, unknown>;
	const result = { ...v };

	// Нормалізація currentLevel (може бути рядком "A1,A2" або поодиноким значенням)
	if (typeof result.currentLevel === "string") {
		result.currentLevel = (result.currentLevel as string)
			.split(",")
			.filter(Boolean);
	}
	if (!Array.isArray(result.currentLevel)) {
		result.currentLevel = undefined; // Дозволяємо дефолтному значенню Zod спрацювати
	}

	// Нормалізація currentTopic
	if (typeof result.currentTopic === "string") {
		result.currentTopic = (result.currentTopic as string)
			.split(",")
			.filter(Boolean);
	}
	if (!Array.isArray(result.currentTopic)) {
		result.currentTopic = undefined;
	}

	// Нормалізація currentTenses
	if (typeof result.currentTenses === "string") {
		result.currentTenses = (result.currentTenses as string)
			.split(",")
			.filter(Boolean);
	}
	if (!Array.isArray(result.currentTenses)) {
		result.currentTenses = undefined;
	}

	// Нормалізація currentForms
	if (typeof result.currentForms === "string") {
		result.currentForms = (result.currentForms as string)
			.split(",")
			.filter(Boolean);
	}
	if (!Array.isArray(result.currentForms)) {
		result.currentForms = undefined;
	}

	return result;
}, AppSettingsCoreSchema);

// ========================================
// СХЕМИ ПРОГРЕСУ (UserProgress)
// ========================================

export const WordProgressSchema = z.object({
	wordKey: z.string(),
	correctCount: z.number().default(0),
	lastSeen: z.number().default(0),
});

export const LevelStatsSchema = z.object({
	totalCorrect: z.number().default(0),
	totalAttempts: z.number().default(0),
	bestCorrectStreak: z.number().default(0),
	currentCorrectStreak: z.number().default(0),
});

export const RestorationRecordSchema = z.object({
	amount: z.number(),
	reason: z.string(),
	timestamp: z.number().default(() => Date.now()),
	adminId: z.string().optional(),
});

export const ProgressStateSchema = z.object({
	words: z.record(z.string(), WordProgressSchema).default({}),
	levelStats: z.record(z.string(), LevelStatsSchema).default({}),
	totalCorrect: z.number().default(0),
	totalAttempts: z.number().default(0),
	// Поле для зберігання суми відновлених балів (входить у totalCorrect)
	restoredPoints: z.number().default(0),
	// Історія ручних відновлень
	restorationHistory: z.array(RestorationRecordSchema).default([]),
	lastUpdated: z.number().default(() => Date.now()),
	streak: z.number().default(0),
	bestStreak: z.number().default(0),
	currentCorrectStreak: z.number().default(0),
	bestCorrectStreak: z.number().default(0),
	lastCorrectDate: z.string().nullable().default(null),
	lastStreakUpdateDate: z.string().nullable().default(null),
	dailyCorrect: z.number().default(0),
	activeDaysCount: z.number().default(0),
	isActiveDaysRecovered: z.boolean().default(false),
	firstSeenDate: z.number().default(() => Date.now()),
	// Нові поля для відстеження гонитви за лідером
	shownGaps: z.array(z.number()).default([]),
	lastInteractionTimestamp: z.number().default(() => Date.now()),
});

/**
 * Схема для щоденної активності користувача.
 * Використовується для аудиту та відновлення статистики.
 */
export const DailyActivitySchema = z.object({
	date: z.string(), // Формат YYYY-MM-DD
	totalCorrect: z.number().default(0),
	totalAttempts: z.number().default(0),
	levelStats: z.record(
		z.string(),
		z.object({
			correct: z.number().default(0),
			attempts: z.number().default(0),
		}),
	).default({}),
	updatedAt: z.number().default(() => Date.now()),
});

// ========================================
// ТИПИ ZOD
// ========================================

export type Dictionary = z.infer<typeof DictionarySchema>;
export type LevelFile = z.infer<typeof LevelFileSchema>;
export type TopicFile = z.infer<typeof TopicFileSchema>;
export type PlaylistState = z.infer<typeof PlaylistStateSchema>;
export type Playlist = z.infer<typeof PlaylistSchema>;
export type CustomWord = z.infer<typeof CustomWordSchema>;
export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type ProgressState = z.infer<typeof ProgressStateSchema>;
export type LevelStats = z.infer<typeof LevelStatsSchema>;
export type WordProgress = z.infer<typeof WordProgressSchema>;
export type DailyActivity = z.infer<typeof DailyActivitySchema>;
export type RestorationRecord = z.infer<typeof RestorationRecordSchema>;

// ========================================
// СХЕМИ URL (Параметри сторінки)
// ========================================

const commaStringToArray = z.preprocess((val) => {
	if (typeof val === "string" && val.length > 0) return val.split(",");
	if (Array.isArray(val)) return val;
	return undefined;
}, z.array(z.string()).optional());

export const UrlParamsSchema = z.object({
	mode: z.enum(["levels", "topics", "phrases", "tenses", "playlists"]).optional(),
	interaction: z.enum(["match", "swipe"]).optional(),
	level: commaStringToArray,
	topic: commaStringToArray,
	tense: commaStringToArray,
	forms: commaStringToArray,
	qty: z.enum(["1", "3", "many"]).optional(),
	playlist: z.string().optional(),
	source: z.enum(["en", "uk", "nl", "de", "el", "crh"]).optional(),
	target: z.enum(["en", "uk", "nl", "de", "el", "crh"]).optional(),
});

export type UrlParams = z.infer<typeof UrlParamsSchema>;

