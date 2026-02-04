import {
	loadLevel,
	loadTopic,
	loadTranslations,
	loadTranscriptions,
	loadPhrasesLevel,
} from "../data/wordService";
import { logService } from "./logService";
import { SUPPORTED_LEVELS } from "../config";
import type { AppSettings } from "../stores/settingsStore.svelte";
import type {
	TranslationDictionary,
	TranscriptionDictionary,
	WordPair,
} from "../types";
import { DictionarySchema } from "../data/schemas";

export interface GameData {
	sourceTranslations: TranslationDictionary;
	targetTranslations: TranslationDictionary;
	sourceTranscriptions: TranscriptionDictionary;
	targetTranscriptions: TranscriptionDictionary;
	words: string[];
}

export interface PlaylistData {
	mistakes: { pair: WordPair }[];
	favorites: WordPair[];
	extra: WordPair[];
}

/**
 * Game Data Service - Handles fetching and preparing data for the game.
 * Decouples data loading from game logic.
 */
export class GameDataService {
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

		let sourceTranslations: TranslationDictionary = {};
		let targetTranslations: TranslationDictionary = {};
		let sourceTranscriptions: TranscriptionDictionary = {};
		let targetTranscriptions: TranscriptionDictionary = {};
		let words: string[] = [];

		try {
			// 1. Load Translations & Transcriptions
			if (mode === "playlists" && currentPlaylist) {
				// SSoT: For playlists, we load all levels to find translations for any word
				const [sourceAll, targetAll] = await Promise.all([
					Promise.all(
						SUPPORTED_LEVELS.map((l) =>
							import(`../data/translations/${sourceLanguage}/levels/${l}.json`)
								.then((m) => DictionarySchema.parse(m.default))
								.catch((e) => {
									logService.warn(
										"game",
										`Failed to load ${sourceLanguage} level ${l}`,
										e,
									);
									return {};
								}),
						),
					),
					Promise.all(
						SUPPORTED_LEVELS.map((l) =>
							import(`../data/translations/${targetLanguage}/levels/${l}.json`)
								.then((m) => DictionarySchema.parse(m.default))
								.catch((e) => {
									logService.warn(
										"game",
										`Failed to load ${targetLanguage} level ${l}`,
										e,
									);
									return {};
								}),
						),
					),
				]);

				// Helper to find translation in multiple dictionaries
				const findInDicts = (key: string, dicts: TranslationDictionary[]) => {
					for (const dict of dicts) {
						if (dict[key]) return dict[key];
					}
					return null;
				};

				const playlistPairs =
					currentPlaylist === "mistakes"
						? playlists.mistakes.map((m) => m.pair)
						: currentPlaylist === "favorites"
							? playlists.favorites
							: playlists.extra;

				// Filter translations for only the words in the playlist to save memory/state size
				playlistPairs.forEach((p) => {
					const srcVal = findInDicts(p.id, sourceAll);
					const tgtVal = findInDicts(p.id, targetAll);

					if (!srcVal) {
						logService.warn(
							"game",
							`Missing source translation for ID: ${p.id} (${sourceLanguage})`,
						);
					}
					if (!tgtVal) {
						logService.warn(
							"game",
							`Missing target translation for ID: ${p.id} (${targetLanguage})`,
						);
					}
					sourceTranslations[p.id] = srcVal || p.id;
					targetTranslations[p.id] = tgtVal || p.id;
				});

				// Set words
				words = playlistPairs.map((p) => p.id);
			} else {
				// Normal modes (levels, topics, phrases)
				let category: "levels" | "topics" | "phrases" = "levels";
				if (mode === "topics") category = "topics";
				else if (mode === "phrases") category = "phrases";

				const id = mode === "topics" ? currentTopic : currentLevel;

				if (id) {
					// Parallel loading
					const [srcTrans, tgtTrans, srcTscr, tgtTscr] = await Promise.all([
						loadTranslations(sourceLanguage, category, id),
						loadTranslations(targetLanguage, category, id),
						loadTranscriptions(category, id, sourceLanguage),
						loadTranscriptions(category, id, targetLanguage),
					]);

					sourceTranslations = srcTrans;
					targetTranslations = tgtTrans;
					sourceTranscriptions = srcTscr;
					targetTranscriptions = tgtTscr;

					// Load words
					if (mode === "levels") {
						const level = await loadLevel(currentLevel);
						words = level.words;
					} else if (mode === "topics" && currentTopic) {
						const topic = await loadTopic(currentTopic);
						words = topic.words;
					} else if (mode === "phrases") {
						const phrases = await loadPhrasesLevel(currentLevel);
						words = phrases.words;
					}
				}
			}
		} catch (e) {
			console.error(`Failed to load game data for ${mode}`, e);
			throw e; // Re-throw to allow GameController to handle it
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
