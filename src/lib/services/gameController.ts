import type { gameState as GameStateType } from "../stores/gameState.svelte";
import { settingsStore } from "../stores/settingsStore.svelte";
import { playlistStore } from "../stores/playlistStore.svelte";
import {
	gameDataService,
	type GameDataService,
	type GameData,
} from "./gameDataService";
import { gameAudioHandler, type GameAudioHandler } from "./gameAudioHandler";
import {
	gameFeedbackHandler,
	type GameFeedbackHandler,
} from "./gameFeedbackHandler";
import { createCardsFromWordKeys } from "./gameCardFactory";
import type { ActiveCard, CardStatus, WordPair } from "../types";
import type { Playlist, CustomWord } from "../data/schemas";

/**
 * GameController — сервіс для координації ігрової логіки.
 * Відокремлює "як грати" від "що зберігати".
 * Використовує Dependency Injection для полегшення тестування.
 */
export class GameController {
	private lastInteractionTime = 0;

	constructor(
		private gameState: typeof GameStateType,
		private dataService: GameDataService,
		private audioHandler: GameAudioHandler,
		private feedbackHandler: GameFeedbackHandler,
	) {}

	/**
	 * Ініціалізація нової гри
	 * @param preloadedData - Опціонально: попередньо завантажені дані (наприклад, з SSR/load function)
	 */
	async initGame(preloadedData?: GameData): Promise<void> {
		this.gameState.setLoading(true);
		this.gameState.setError(null);
		this.gameState.setProcessing(false);
		this.lastInteractionTime = Date.now();

		try {
			let data = preloadedData;

			// Якщо даних немає, завантажуємо їх (fallback)
			if (!data) {
				const playlistsData = playlistStore.getSnapshot();
				data = await this.dataService.loadGameData(
					settingsStore.value,
					playlistsData,
				);
			} else {
				// В деяких випадках нам потрібно примусово перевантажити дані
				// (наприклад, якщо ми в режимі English і транскрипції відсутні)
				const { sourceLanguage } = settingsStore.value;
				if (
					sourceLanguage === "en" &&
					Object.keys(data.sourceTranscriptions).length === 0
				) {
					const playlistsData = playlistStore.getSnapshot();
					data = await this.dataService.loadGameData(
						settingsStore.value,
						playlistsData,
					);
				}
			}

			this.gameState.setData(data);

			const { sourceLanguage, targetLanguage, interfaceLanguage } =
				settingsStore.value;
			const initialWords = this.gameState.getAvailableWords(
				this.gameState.getPairsLimit(),
			);

			const { source, target } = createCardsFromWordKeys(
				initialWords,
				sourceLanguage,
				targetLanguage,
				interfaceLanguage,
				data.sourceTranslations,
				data.targetTranslations,
				data.sourceTranscriptions,
				data.targetTranscriptions,
			);

			this.gameState.setCards(source, target);
			initialWords.forEach((w) => this.gameState.markWordAsUsed(w));
		} catch (error: any) {
			console.error("Failed to initialize game:", error);
			this.gameState.setError(error?.message || "Failed to load game data");
		} finally {
			this.gameState.setLoading(false);
		}
	}

	/**
	 * Обробка вибору картки
	 */
	selectCard(card: ActiveCard): void {
		this.updateTimers();

		if (this.gameState.isProcessing || !card.isVisible) return;

		const selectedCard = this.gameState.selectedCard;

		// Перший вибір або скасування
		if (!selectedCard) {
			this.gameState.updateCardStatus(card.id, "selected");
			this.gameState.setSelectedCard(card);
			return;
		}

		if (selectedCard.id === card.id) {
			this.gameState.updateCardStatus(card.id, "idle");
			this.gameState.setSelectedCard(null);
			return;
		}

		// Перемикання мови в межах однієї сторони
		if (selectedCard.language === card.language) {
			this.gameState.updateCardStatus(selectedCard.id, "idle");
			this.gameState.updateCardStatus(card.id, "selected");
			this.gameState.setSelectedCard(card);
			return;
		}

		// Другий вибір — перевірка матчу
		this.gameState.updateCardStatus(card.id, "selected");
		const isMatch = selectedCard.wordKey === card.wordKey;

		if (isMatch) {
			this.handleMatch(selectedCard, card);
		} else {
			this.handleMiss(selectedCard, card);
		}
	}

	private handleMatch(card1: ActiveCard, card2: ActiveCard) {
		this.gameState.setProcessing(true);
		this.gameState.updateCardStatus(card1.id, "correct");
		this.gameState.updateCardStatus(card2.id, "correct");

		this.audioHandler.playMatch(card1, card2);
		this.gameState.recordMatch();

		const levelId = this.getCurrentContextId();
		const isMistakesPlaylist =
			settingsStore.value.currentPlaylist === "mistakes";
		this.feedbackHandler.handleCorrect(
			card1.wordKey,
			levelId,
			isMistakesPlaylist,
		);

		this.gameState.setSelectedCard(null);
		this.gameState.setProcessing(false);

		setTimeout(() => this.checkAndRefill(), 1000);
	}

	private handleMiss(card1: ActiveCard, card2: ActiveCard) {
		this.gameState.updateCardStatus(card1.id, "wrong");
		this.gameState.updateCardStatus(card2.id, "wrong");

		this.gameState.recordMiss();

		const pair1 = this.constructWordPair(card1.wordKey);
		const pair2 = this.constructWordPair(card2.wordKey);
		const levelId = this.getCurrentContextId();
		this.feedbackHandler.handleWrong(pair1, pair2, levelId);

		this.gameState.setSelectedCard(null);

		setTimeout(() => {
			this.gameState.resetWrongCards(card1.id, card2.id);
		}, 500);
	}

	private checkAndRefill() {
		const visibleCount = this.gameState.getVisiblePairCount();
		const limit = this.gameState.getPairsLimit();

		if (visibleCount <= 2) {
			// REFILL_THRESHOLD
			const newWords = this.gameState.getAvailableWords(limit - visibleCount);
			if (newWords.length === 0) return;

			const { sourceLanguage, targetLanguage, interfaceLanguage } =
				settingsStore.value;
			const { source, target } = createCardsFromWordKeys(
				newWords,
				sourceLanguage,
				targetLanguage,
				interfaceLanguage,
				this.gameState.getTranslations("source"),
				this.gameState.getTranslations("target"),
				this.gameState.getTranscriptions("source"),
				this.gameState.getTranscriptions("target"),
				this.gameState.totalCardsCount,
			);

			this.gameState.refillCards(source, target);
			newWords.forEach((w) => this.gameState.markWordAsUsed(w));
		}
	}

	private getCurrentContextId(): string {
		const { mode, currentLevel, currentTopic, currentPlaylist } =
			settingsStore.value;
		if (mode === "topics") return currentTopic;
		if (mode === "playlists") return currentPlaylist || "mixed";
		return currentLevel; // levels or phrases
	}

	private updateTimers() {
		const now = Date.now();
		if (this.lastInteractionTime > 0) {
			const diff = now - this.lastInteractionTime;
			if (diff > 5000 && this.gameState.hasHistory) {
				this.gameState.addIgnoredTime(diff - 5000);
			}
		}
		this.lastInteractionTime = now;
	}

	private constructWordPair(wordKey: string): WordPair {
		return this.gameState.constructWordPair(wordKey, settingsStore.value);
	}

	useHint(isSlow = false): boolean {
		const pair = this.gameState.findAvailableMatch();
		if (!pair) return false;

		const { src, tgt } = pair;
		const status: CardStatus = isSlow ? "hint-slow" : "hint";

		this.gameState.updateCardStatus(src.id, status);
		this.gameState.updateCardStatus(tgt.id, status);

		setTimeout(
			() => {
				this.gameState.clearHint(src.id, tgt.id, status);
			},
			isSlow ? 5000 : 1000,
		);

		return true;
	}

	toggleLearningMode(): void {
		const newState = !this.gameState.isLearningMode;
		this.gameState.setLearningMode(newState);
		if (newState) {
			this.runLearningLoop();
		}
	}

	private async runLearningLoop() {
		if (!this.gameState.isLearningMode) return;
		if (this.gameState.isProcessing) {
			setTimeout(() => this.runLearningLoop(), 500);
			return;
		}

		const success = this.useHint(true);
		setTimeout(() => this.runLearningLoop(), success ? 5500 : 1000);
	}
}

import { gameState } from "../stores/gameState.svelte";

export const gameController = new GameController(
	gameState,
	gameDataService,
	gameAudioHandler,
	gameFeedbackHandler,
);
