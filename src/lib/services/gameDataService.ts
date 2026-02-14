import {
	loadLevel,
	loadTopic,
	loadTranslations,
	loadTranscriptions,
	loadPhrasesLevel,
	loadAllTranslations,
	loadAllTranscriptions,
	loadTenseRegistry,
} from "../data/wordService";
import { logService } from "./logService";
import type { AppSettings } from "../data/schemas";
import type {
	TranslationDictionary,
	TranscriptionDictionary,
	WordPair,
	WordKey,
} from "../types";
import { getSemanticGroup } from "../data/semantics";

export interface GameData {
	sourceTranslations: TranslationDictionary;
	targetTranslations: TranslationDictionary;
	sourceTranscriptions: TranscriptionDictionary;
	targetTranscriptions: TranscriptionDictionary;
	words: WordKey[];
	/** Snapshot of settings used to generate this data */
	settings: {
		mode: string;
		currentLevel: string[];
		currentTopic: string[];
		currentTenses: string[];
		currentForms: string[];
		tenseQuantity: string;
		currentPlaylist: string | null;
		sourceLanguage: string;
		targetLanguage: string;
	};
}

export interface PlaylistData {
	mistakes: { pair: WordPair; correctStreak: number }[];
	favorites: WordPair[];
	extra: WordPair[];
	custom: { id: string; name: string; words: (string | any)[] }[];
}

/**
 * Game Data Service - Handles fetching and preparing data for the game.
 * Decouples data loading from game logic.
 */
export class GameDataService {
	/**
	 * Розширює список слів на основі семантичних груп.
	 * Якщо хоча б в одній мові слова різні — додає специфічні ключі.
	 */
	private expandWordList(
		words: WordKey[],
		sourceTrans: TranslationDictionary,
		targetTrans: TranslationDictionary,
	): WordKey[] {
		const expanded: WordKey[] = [];

		for (const word of words) {
			const group = getSemanticGroup(word);

			if (group) {
				// Перевіряємо, чи розрізняються слова в будь-якій з мов
				let shouldExpand = false;

				const hasDifference = (dict: TranslationDictionary) => {
					// Беремо ТІЛЬКИ ті переклади, які є реально у словнику (без fallback)
					const translations = group.specific
						.map((k) => dict[k])
						.filter(Boolean);

					const unique = new Set(translations);
					return unique.size > 1;
				};

				if (hasDifference(sourceTrans) || hasDifference(targetTrans)) {
					shouldExpand = true;
				}

				if (shouldExpand) {
					logService.log(
						"game",
						`Expanding base word "${word}" into:`,
						group.specific,
					);
					expanded.push(...group.specific);
				} else {
					expanded.push(word);
				}
			} else {
				expanded.push(word);
			}
		}

		return expanded;
	}

	/**
	 * Loads all necessary data (translations, transcriptions, word list) for the current game settings.
	 */
	async loadGameData(
		settings: AppSettings,
		playlists: PlaylistData,
	): Promise<GameData> {
		const {
			sourceLanguage,
			targetLanguage,
			mode,
			currentLevel,
			currentTopic,
			currentTenses,
			currentForms,
			tenseQuantity,
			currentPlaylist,
		} = settings;

		logService.log("data", "Loading game data", { mode, currentLevel, currentTopic, currentTenses });

		let sourceTranslations: TranslationDictionary = {};
		let targetTranslations: TranslationDictionary = {};
		let sourceTranscriptions: TranscriptionDictionary = {};
		let targetTranscriptions: TranscriptionDictionary = {};
		let words: string[] = [];

		try {
			// 1. Load Dictionaries (always load everything for multi-select support)
			const [srcTrans, tgtTrans, srcTscr, tgtTscr] = await Promise.all([
				loadAllTranslations(sourceLanguage),
				loadAllTranslations(targetLanguage),
				loadAllTranscriptions(sourceLanguage),
				loadAllTranscriptions(targetLanguage),
			]);

			sourceTranslations = srcTrans;
			targetTranslations = tgtTrans;
			sourceTranscriptions = srcTscr;
			targetTranscriptions = tgtTscr;

			// 2. Load Words Pool
			if (mode === "playlists" && currentPlaylist) {
				let playlistWords: (string | any)[] = [];
				if (currentPlaylist === "mistakes") {
					playlistWords = playlists.mistakes.map((m) => m.pair.id);
				} else if (currentPlaylist === "favorites") {
					playlistWords = playlists.favorites.map((p) => p.id);
				} else if (currentPlaylist === "extra") {
					playlistWords = playlists.extra.map((p) => p.id);
				} else {
					const customP = playlists.custom.find((p) => p.id === currentPlaylist);
					if (customP) playlistWords = customP.words;
				}

				logService.log("data", `Extracting words from playlist "${currentPlaylist}":`, playlistWords);

				playlistWords.forEach((w) => {
					if (typeof w === "string") {
						const hasSource = !!sourceTranslations[w];
						const hasTarget = !!targetTranslations[w];
						
						if (hasSource || hasTarget) {
							words.push(w);
						} else {
							logService.warn("data", `Word "${w}" from playlist not found in any dictionary. Filtering out.`);
						}
					} else if (w && typeof w === "object") {
						const id = w.id || `custom-${Date.now()}`;
						// Map neutral left/right to game dictionaries
						sourceTranslations[id] = w.left || w.original || "";
						targetTranslations[id] = w.right || w.translation || "";
						if (w.transcription) sourceTranscriptions[id] = w.transcription;
						words.push(id);
					}
				});
			} else {
				const ids = mode === "topics" ? currentTopic : currentLevel;

				if (ids && ids.length > 0) {
					if (mode === "levels") {
						const levelResults = await Promise.all(
							ids.map(async (levelId) => {
								if (levelId === "ALL") {
									const allLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
									const results = await Promise.all(allLevels.map((l) => loadLevel(l as any)));
									return results.flatMap((r) => r.words);
								} else {
									const lvl = await loadLevel(levelId as any);
									return lvl.words;
								}
							}),
						);
						words.push(...levelResults.flat());
					} else if (mode === "topics") {
						const topicResults = await Promise.all(ids.map((id) => loadTopic(id)));
						words.push(...topicResults.flatMap((t) => t.words));
					} else if (mode === "phrases") {
						const phraseResults = await Promise.all(ids.map((id) => loadPhrasesLevel(id as any)));
						words.push(...phraseResults.flatMap((p) => p.words));
					}
				}
			}

			if (mode === "tenses") {
				const registry = await loadTenseRegistry();
				const phraseIds = registry.packs[tenseQuantity as keyof typeof registry.packs] || registry.packs["3"];

				// Завантажуємо матриці для кожної фрази паралельно
				const translationResults = await Promise.all(
					phraseIds.map(async (pId) => {
						const [srcDict, tgtDict] = await Promise.all([
							loadTranslations(sourceLanguage, "tenses", pId),
							loadTranslations(targetLanguage, "tenses", pId),
						]);
						return { pId, srcDict, tgtDict };
					}),
				);

				for (const { pId, srcDict, tgtDict } of translationResults) {
					// Мержимо в основні словники
					Object.assign(sourceTranslations, srcDict);
					Object.assign(targetTranslations, tgtDict);

					// Генеруємо ключі для обраних часів та форм
					for (const tenseId of currentTenses) {
						for (const form of currentForms) {
							const key = `t.${pId}.${tenseId}.${form}`;
							if (sourceTranslations[key] && targetTranslations[key]) {
								words.push(key);
							}
						}
					}
				}
			}

			// 3. Expansion Logic
			words = this.expandWordList(words, sourceTranslations, targetTranslations);
			
			logService.log("data", `Game data prepared with ${words.length} words total.`);
		} catch (e) {
			logService.error("data", `Failed to load game data for ${mode}`, e);
			throw e;
		}

		return {
			sourceTranslations,
			targetTranslations,
			sourceTranscriptions,
			targetTranscriptions,
			words,
			settings: {
				mode,
				currentLevel: [...currentLevel],
				currentTopic: [...currentTopic],
				currentTenses: [...currentTenses],
				currentForms: [...currentForms],
				tenseQuantity,
				currentPlaylist,
				sourceLanguage,
				targetLanguage,
			},
		};
	}
}

export const gameDataService = new GameDataService();