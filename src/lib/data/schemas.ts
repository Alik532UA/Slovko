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
	original: z.string(),
	translation: z.string(),
	transcription: z.string().optional(),
});

export const PlaylistWordSchema = z.union([z.string(), CustomWordSchema]);

export const PlaylistSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().optional().default(""),
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
});

export const PlaylistStateSchema = z.preprocess((val: unknown) => {

	if (!val || typeof val !== "object") return {};



	const v = val as Record<string, any>;



		// Функція для нормалізації плейліста (якщо це масив — перетворюємо на об'єкт)



		const normalize = (data: any, fallback: any) => {



			let result: any;



			if (Array.isArray(data)) {



				result = { ...fallback, words: data };



			} else if (data && typeof data === "object") {



				result = { ...fallback, ...data };



			} else {



				result = fallback;



			}



	



			// Додатково нормалізуємо масив words всередині плейліста



			if (result.words && Array.isArray(result.words)) {



				result.words = result.words.map((w: any) => {



					if (typeof w === "string") return w;



					if (w && typeof w === "object") {



						// Якщо це старий формат mistake entry: { pair: { id: '...' } }



						if (w.pair && typeof w.pair === "object" && w.pair.id) return w.pair.id;



						// Якщо це просто об'єкт з id: { id: '...' }



						if (w.id && !w.original && !w.translation) return w.id;



						// Якщо це схоже на CustomWord (id, original, translation) — залишаємо як є



						if (w.id && w.original && w.translation) return w;



						// В іншому випадку спробуємо витягнути будь-який id або перетворити на рядок



						return w.id || JSON.stringify(w);



					}



					return String(w);



				});



			}



			return result;



		};



	// Legacy migration: дані можуть бути в v.systemPlaylists або на верхньому рівні v

	const systemPlaylists = v.systemPlaylists || {};



	const favorites = normalize(

		systemPlaylists.favorites || v.favorites,

		DEFAULT_FAVORITES,

	);

	const mistakes = normalize(

		systemPlaylists.mistakes || v.mistakes,

		DEFAULT_MISTAKES,

	);

	const extra = normalize(systemPlaylists.extra || v.extra, DEFAULT_EXTRA);



	return {

		...v,

		systemPlaylists: {

			favorites,

			mistakes,

			extra,

		},

		mistakeMetadata: v.mistakeMetadata || {},

	};

}, PlaylistStateCoreSchema);

// ========================================
// ТИПИ ZOD
// ========================================

export type Dictionary = z.infer<typeof DictionarySchema>;
export type LevelFile = z.infer<typeof LevelFileSchema>;
export type TopicFile = z.infer<typeof TopicFileSchema>;
export type PlaylistState = z.infer<typeof PlaylistStateSchema>;
export type Playlist = z.infer<typeof PlaylistSchema>;
export type CustomWord = z.infer<typeof CustomWordSchema>;
