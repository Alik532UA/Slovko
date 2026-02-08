import type {
	WordKey,
	ActiveCard,
	CardStatus,
	WordPair,
	GameMode,
} from "../types";
import { shuffle } from "../services/gameCardFactory";
import { getTranslation } from "../data/wordService";
import { logService } from "../services/logService";
import type { AppSettings } from "../data/schemas";
import type { GameData } from "../services/gameDataService";

const MODE_CONFIG: Record<GameMode, { pairsPerPage: number }> = {
	levels: { pairsPerPage: 6 },
	topics: { pairsPerPage: 6 },
	phrases: { pairsPerPage: 6 },
	playlists: { pairsPerPage: 6 },
};

/**
 * Game State Store — Чисте сховище стану гри.
 * Використовує Svelte 5 Runes.
 */
function createGameState() {
	// Стан (Private)
	let sourceCards = $state<ActiveCard[]>([]);
	let targetCards = $state<ActiveCard[]>([]);
	let selectedCard = $state<ActiveCard | null>(null);
	let isProcessing = $state(false);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let currentWords = $state<WordKey[]>([]);
	let usedWordKeys = $state(new Set<WordKey>());

	// Статистика
	let streak = $state(0);
	let mistakesCount = $state(0);
	let correctAnswersHistory = $state<number[]>([]);
	let ignoredTime = $state(0);

	// Дані (Translations/Transcriptions)
	let data = $state<GameData>({
		sourceTranslations: {},
		targetTranslations: {},
		sourceTranscriptions: {},
		targetTranscriptions: {},
		words: [],
	});

	// Похідний стан (Derived)
	const accuracy = $derived.by(() => {
		const total = correctAnswersHistory.length + mistakesCount;
		return total === 0
			? 100
			: Math.round((correctAnswersHistory.length / total) * 100);
	});

	const wordsPerMinute = $derived.by(() => {
		if (correctAnswersHistory.length === 0) return 0;
		const startTime = correctAnswersHistory[0];
		let elapsed = Date.now() - startTime - ignoredTime;
		return Math.round(
			(correctAnswersHistory.length / Math.max(elapsed, 1000)) * 60000,
		);
	});

	let isLearningMode = $state(false);

	// API для читання
	return {
		// Getters
		get sourceCards() {
			return sourceCards;
		},
		get targetCards() {
			return targetCards;
		},
		get selectedCard() {
			return selectedCard;
		},
		get isProcessing() {
			return isProcessing;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},
		get streak() {
			return streak;
		},
		get accuracy() {
			return accuracy;
		},
		get totalAttempts() {
			return correctAnswersHistory.length + mistakesCount;
		},
		get wordsPerMinute() {
			return wordsPerMinute;
		},
		get hasHistory() {
			return correctAnswersHistory.length > 0;
		},
		get totalCardsCount() {
			return sourceCards.length;
		},
		get isLearningMode() {
			return isLearningMode;
		},

		// Методи оновлення (Setters/Actions)
		setLoading(val: boolean) {
			isLoading = val;
		},
		setError(val: string | null) {
			error = val;
		},
		setProcessing(val: boolean) {
			isProcessing = val;
		},
		setLearningMode(val: boolean) {
			isLearningMode = val;
		},

		setData(newData: GameData) {
			data = newData;
			currentWords = shuffle(newData.words);
			usedWordKeys.clear();
			sourceCards = [];
			targetCards = [];
		},

		setCards(source: ActiveCard[], target: ActiveCard[]) {
			logService.log("game", `Setting cards: source=${source.length}, target=${target.length}`);
			sourceCards = source;
			targetCards = target;
			selectedCard = null;
		},

		updateCardStatus(id: string, status: CardStatus) {
			const sc = sourceCards.find((c) => c.id === id);
			if (sc) sc.status = status;
			const tc = targetCards.find((c) => c.id === id);
			if (tc) tc.status = status;
		},

		setSelectedCard(card: ActiveCard | null) {
			selectedCard = card;
		},

		recordMatch() {
			const now = Date.now();
			const lastAnswer = correctAnswersHistory[correctAnswersHistory.length - 1] || 0;
			
			// Integrity Check: якщо між відповідями менше 200мс - це підозріло (автоклікер)
			// Ми зараховуємо бали, але не враховуємо цей час для статистики швидкості,
			// щоб не спотворювати слова за хвилину.
			if (now - lastAnswer < 200) {
				logService.warn("game", "Extremely fast match detected, possible automation or race condition.");
			}

			streak++;
			correctAnswersHistory.push(now);
		},

		recordMiss() {
			streak = 0;
			mistakesCount++;
		},

		resetStats() {
			streak = 0;
			mistakesCount = 0;
			correctAnswersHistory = [];
			ignoredTime = 0;
			usedWordKeys.clear();
			sourceCards = [];
			targetCards = [];
		},

		addIgnoredTime(time: number) {
			ignoredTime += time;
		},

		resetWrongCards(id1: string, id2: string) {
			const reset = (c: ActiveCard) => {
				if ((c.id === id1 || c.id === id2) && c.status === "wrong") {
					c.status = "idle";
				}
			};
			sourceCards.forEach(reset);
			targetCards.forEach(reset);
		},

		// Helper logic for controller
		getPairsLimit() {
			// В ідеалі settingsStore має передаватись зовні, але для спрощення поки так
			return 6;
		},

		getVisiblePairCount() {
			return sourceCards.filter((c) => c.status !== "correct").length;
		},

		getAvailableWords(needed: number): WordKey[] {
			let available = currentWords.filter((w) => !usedWordKeys.has(w));
			if (available.length < needed) {
				usedWordKeys.clear();
				sourceCards
					.filter((c) => c.isVisible)
					.forEach((c) => usedWordKeys.add(c.wordKey));
				available = currentWords.filter((w) => !usedWordKeys.has(w));
			}
			return available.slice(0, needed);
		},

		markWordAsUsed(word: WordKey) {
			usedWordKeys.add(word);
		},

		refillCards(newSource: ActiveCard[], newTarget: ActiveCard[]) {
			let sIdx = 0,
				tIdx = 0;

			// Точкова заміна в існуючих масивах (slots)
			sourceCards.forEach((c, i) => {
				if (c.status === "correct" && sIdx < newSource.length) {
					sourceCards[i] = { ...newSource[sIdx++], slot: c.slot };
				}
			});

			targetCards.forEach((c, i) => {
				if (c.status === "correct" && tIdx < newTarget.length) {
					targetCards[i] = { ...newTarget[tIdx++], slot: c.slot };
				}
			});

			// Додавання нових, якщо масив був меншим (хоча зазвичай вони однакового розміру)
			if (sIdx < newSource.length) {
				sourceCards.push(...newSource.slice(sIdx));
			}
			if (tIdx < newTarget.length) {
				targetCards.push(...newTarget.slice(tIdx));
			}
		},

		getTranslations(type: "source" | "target") {
			return type === "source"
				? data.sourceTranslations
				: data.targetTranslations;
		},

		getTranscriptions(type: "source" | "target") {
			return type === "source"
				? data.sourceTranscriptions
				: data.targetTranscriptions;
		},

		constructWordPair(wordKey: WordKey, settings: AppSettings): WordPair {
			const source = getTranslation(
				wordKey,
				data.sourceTranslations,
				settings.sourceLanguage,
			);
			const target = getTranslation(
				wordKey,
				data.targetTranslations,
				settings.targetLanguage,
			);

			logService.log("game", "Constructing word pair for report:", {
				wordKey,
				source,
				target,
			});

			return {
				id: wordKey,
				source,
				target,
			};
		},

		findAvailableMatch() {
			const idleSrc = sourceCards.filter(
				(c) => c.status === "idle" && c.isVisible,
			);
			const idleTgt = targetCards.filter(
				(c) => c.status === "idle" && c.isVisible,
			);

			const matches: { src: ActiveCard; tgt: ActiveCard }[] = [];

			for (const src of idleSrc) {
				const tgt = idleTgt.find((t) => t.wordKey === src.wordKey);
				if (tgt) matches.push({ src, tgt });
			}

			if (matches.length > 0) {
				return matches[Math.floor(Math.random() * matches.length)];
			}
			return null;
		},

		clearHint(id1: string, id2: string, status: CardStatus) {
			const reset = (c: ActiveCard) => {
				if ((c.id === id1 || c.id === id2) && c.status === status) {
					c.status = "idle";
				}
			};
			sourceCards.forEach(reset);
			targetCards.forEach(reset);
		},
	};
}

export const gameState = createGameState();
