import {
	loadLevel,
	loadTopic,
	loadTranslations,
	loadPhrasesLevel,
	loadAllTranslations,
	loadAllTranscriptions,
	loadTenseRegistry,
} from "../data/wordService";
import { logService } from "./logService.svelte";
import type { AppSettings, CustomWord } from "../data/schemas";
import type {
	TranslationDictionary,
	TranscriptionDictionary,
	WordPair,
	WordKey,
	CEFRLevel,
} from "../types";
import { getSemanticGroup } from "../data/semantics";

export interface GameData {
	sourceTranslations: TranslationDictionary;
	targetTranslations: TranslationDictionary;
	sourceTranscriptions: TranscriptionDictionary;
	targetTranscriptions: TranscriptionDictionary;
	words: WordKey[];
	/** Map of word keys to their source levels */
	wordLevels: Record<WordKey, string>;
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
	custom: { id: string; name: string; words: (string | CustomWord)[] }[];
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
				const hasDifference = (dict: TranslationDictionary) => {
					// Беремо ТІЛЬКИ ті переклади, які є реально у словнику (без fallback)
					const translations = group.specific
						.map((k: string) => dict[k])
						.filter(Boolean);

					const unique = new Set(translations);
					return unique.size > 1;
				};

				if (hasDifference(sourceTrans) || hasDifference(targetTrans)) {
					// Додаємо лише ті специфічні ключі, які реально мають переклади в обох мовах
					const validSpecific = group.specific.filter(
						(k: string) => sourceTrans[k] && targetTrans[k],
					);

					if (validSpecific.length > 0) {
						logService.log(
							"game",
							`Expanding base word "${word}" into:`,
							validSpecific,
						);
						expanded.push(...validSpecific);
					} else {
						// Якщо валідних специфічних немає, залишаємо базове слово
						expanded.push(word);
					}
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

		logService.log("data", "Loading game data", {
			mode,
			currentLevel,
			currentTopic,
			currentTenses,
		});

		let sourceTranslations: TranslationDictionary = {};
		let targetTranslations: TranslationDictionary = {};
		let sourceTranscriptions: TranscriptionDictionary = {};
		let targetTranscriptions: TranscriptionDictionary = {};
		let words: string[] = [];
		const wordLevels: Record<WordKey, string> = {};

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
				let playlistWords: (string | CustomWord)[] = [];
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

				logService.log(
					"data",
					`Extracting words from playlist "${currentPlaylist}":`,
					playlistWords,
				);

				playlistWords.forEach((w) => {
					if (typeof w === "string") {
						const hasSource = !!sourceTranslations[w];
						const hasTarget = !!targetTranslations[w];

						if (hasSource || hasTarget) {
							words.push(w);
							wordLevels[w] = currentPlaylist; // Tag as playlist ID
						} else {
							logService.warn(
								"data",
								`Word "${w}" from playlist not found in any dictionary. Filtering out.`,
							);
						}
					} else if (w && typeof w === "object") {
						const id = w.id || `custom-${Date.now()}`;
						// Map neutral left/right to game dictionaries
						sourceTranslations[id] = w.left || "";
						targetTranslations[id] = w.right || "";
						if (w.transcription) sourceTranscriptions[id] = w.transcription;
						words.push(id);
						wordLevels[id] = currentPlaylist;
					}
				});
			} else {
				const ids = mode === "topics" ? currentTopic : currentLevel;

				if (ids && ids.length > 0) {
					// Обчислюємо множники (скільки разів вибрано рівень/фразу)
					const multipliers: Record<string, number> = {};
					ids.forEach(id => {
						multipliers[id] = (multipliers[id] || 0) + 1;
					});
					const uniqueIds = Object.keys(multipliers);

					if (mode === "levels") {
						await Promise.all(
							uniqueIds.map(async (levelId) => {
								if (levelId === "ALL") {
									const allLevels: CEFRLevel[] = [
										"A1",
										"A2",
										"B1",
										"B2",
										"C1",
										"C2",
									];
									await Promise.all(
										allLevels.map(async (l) => {
											const lvl = await loadLevel(l);
											const multiplier = multipliers[levelId] || 1;
											lvl.words.forEach((w) => {
												// Фільтруємо слова без перекладу в будь-якій з мов
												if (!sourceTranslations[w] || !targetTranslations[w]) {
													logService.warn("data", `Word "${w}" from level ${l} missing translation. Skipping.`);
													return;
												}
												wordLevels[w] = l;
												for (let i = 0; i < multiplier; i++) {
													words.push(w);
												}
											});										}),
									);
								} else {
									const lvl = await loadLevel(levelId as CEFRLevel);
									const multiplier = multipliers[levelId] || 1;
									lvl.words.forEach((w) => {
										// Фільтруємо слова без перекладу в будь-якій з мов
										if (!sourceTranslations[w] || !targetTranslations[w]) {
											logService.warn("data", `Word "${w}" from level ${levelId} missing translation. Skipping.`);
											return;
										}
										wordLevels[w] = levelId;
										for (let i = 0; i < multiplier; i++) {
											words.push(w);
										}
									});
								}
							}),
						);
					} else if (mode === "topics") {
						await Promise.all(
							ids.map(async (id) => {
								const topic = await loadTopic(id);
								topic.words.forEach((w) => {
									if (!wordLevels[w]) {
										// Фільтруємо слова без перекладу
										if (!sourceTranslations[w] || !targetTranslations[w]) {
											logService.warn("data", `Word "${w}" from topic ${id} missing translation. Skipping.`);
											return;
										}
										wordLevels[w] = id;
										words.push(w);
									}
								});
							}),
						);
					} else if (mode === "phrases") {
						await Promise.all(
							uniqueIds.map(async (id) => {
								const phraseLevel = await loadPhrasesLevel(id as CEFRLevel);
								const multiplier = multipliers[id] || 1;
								phraseLevel.words.forEach((w) => {
									// Фільтруємо слова без перекладу
									if (!sourceTranslations[w] || !targetTranslations[w]) {
										logService.warn("data", `Phrase "${w}" missing translation. Skipping.`);
										return;
									}
									wordLevels[w] = id;
									for (let i = 0; i < multiplier; i++) {
										words.push(w);
									}
								});
							}),
						);
					}
				}
			}

			if (mode === "tenses") {
				const registry = await loadTenseRegistry();
				const phraseIds =
					registry.packs[tenseQuantity as keyof typeof registry.packs] ||
					registry.packs["3"];

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
								wordLevels[key] = pId; // Or tenseId if preferred
							}
						}
					}
				}
			}

			// 3. Expansion Logic
			words = this.expandWordList(words, sourceTranslations, targetTranslations);
			// Propagate level to expanded words
			// (Semantic groups usually belong to the same level as the root word)
			for (const word of words) {
				if (!wordLevels[word]) {
					// Find the root word that might have the level
					const root = Object.keys(wordLevels).find((k) => word.startsWith(k));
					if (root) wordLevels[word] = wordLevels[root];
				}
			}

			logService.log(
				"data",
				`Game data prepared with ${words.length} words total.`,
			);
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
			wordLevels,
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
