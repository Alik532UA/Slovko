import {
	loadLevel,
	loadTopic,
	loadTranslations,
	loadTranscriptions,
	loadPhrasesLevel,
	loadAllTranslations,
	loadAllTranscriptions,
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
			currentPlaylist,
		} = settings;

		logService.log("data", "Loading game data", { mode, currentLevel, currentTopic });

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

				playlistWords.forEach((w) => {
					if (typeof w === "string") {
						if (sourceTranslations[w] || targetTranslations[w]) {
							words.push(w);
						}
					} else if (w && typeof w === "object") {
						const id = w.id || `custom-${Date.now()}`;
						sourceTranslations[id] = w.original;
						targetTranslations[id] = w.translation;
						if (w.transcription) sourceTranscriptions[id] = w.transcription;
						words.push(id);
					}
				});
			} else {
				const ids = mode === "topics" ? currentTopic : currentLevel;

				if (ids && ids.length > 0) {
					if (mode === "levels") {
						for (const levelId of ids) {
							if (levelId === "ALL") {
								const allLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];
								for (const l of allLevels) {
									const lvl = await loadLevel(l as any);
									words.push(...lvl.words);
								}
							} else {
								const lvl = await loadLevel(levelId as any);
								words.push(...lvl.words);
							}
						}
					} else if (mode === "topics") {
						for (const topicId of ids) {
							const topic = await loadTopic(topicId);
							words.push(...topic.words);
						}
					} else if (mode === "phrases") {
						for (const levelId of ids) {
							const phrases = await loadPhrasesLevel(levelId as any);
							words.push(...phrases.words);
						}
					}
				}
			}

			// 3. Expansion Logic
			words = this.expandWordList(words, sourceTranslations, targetTranslations);
			
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
		};
	}
}

export const gameDataService = new GameDataService();