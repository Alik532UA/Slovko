import type { WordKey, ActiveCard, CardStatus, WordPair } from "../types";
import { shuffle } from "../services/gameCardFactory";
import { getTranslation } from "../data/wordService";
import { logService } from "../services/logService.svelte";
import { AppSettingsSchema, type AppSettings } from "../data/schemas";
import type { GameData } from "../services/gameDataService";

/**
 * GameState — Чисте сховище стану гри.
 * Використовує Svelte 5 Runes.
 */
class GameState {
	// Стан (Private)
	private _sourceCards = $state<ActiveCard[]>([]);
	private _targetCards = $state<ActiveCard[]>([]);
	private _selectedCard = $state<ActiveCard | null>(null);
	private _isProcessing = $state(false);
	private _isLoading = $state(true);
	private _error = $state<string | null>(null);
	private _currentWords = $state<WordKey[]>([]);
	private _wordPool = $state<WordKey[]>([]);

	// Статистика
	private _streak = $state(0);
	private _mistakesCount = $state(0);
	private _correctAnswersHistory = $state<number[]>([]);
	private _ignoredTime = $state(0);

	// Дані
	private _data = $state<GameData>({
		sourceTranslations: {},
		targetTranslations: {},
		sourceTranscriptions: {},
		targetTranscriptions: {},
		wordLevels: {},
		words: [],
		settings: AppSettingsSchema.parse({}),
	});

	private _isLearningMode = $state(false);

	// Getters
	get sourceCards() { return this._sourceCards; }
	get targetCards() { return this._targetCards; }
	get selectedCard() { return this._selectedCard; }
	get isProcessing() { return this._isProcessing; }
	get isLoading() { return this._isLoading; }
	get error() { return this._error; }
	get streak() { return this._streak; }
	get accuracy() {
		const total = this._correctAnswersHistory.length + this._mistakesCount;
		return total === 0 ? 100 : Math.round((this._correctAnswersHistory.length / total) * 100);
	}
	get totalAttempts() { return this._correctAnswersHistory.length + this._mistakesCount; }
	get wordsPerMinute() {
		if (this._correctAnswersHistory.length === 0) return 0;
		const startTime = this._correctAnswersHistory[0];
		const elapsed = Date.now() - startTime - this._ignoredTime;
		return Math.round((this._correctAnswersHistory.length / Math.max(elapsed, 1000)) * 60000);
	}
	get hasHistory() { return this._correctAnswersHistory.length > 0; }
	get totalCardsCount() { return this._sourceCards.length; }
	get isLearningMode() { return this._isLearningMode; }
	get data() { return this._data; }
	getData() { return this._data; }

	// Setters/Actions
	setLoading(val: boolean) { this._isLoading = val; }
	setError(val: string | null) { this._error = val; }
	setProcessing(val: boolean) { this._isProcessing = val; }
	setLearningMode(val: boolean) { this._isLearningMode = val; }

	setData(newData: GameData) {
		this._data = newData;
		this._currentWords = [...newData.words];
		this._wordPool = shuffle([...newData.words]);
		this._sourceCards = [];
		this._targetCards = [];
	}

	setCards(source: ActiveCard[], target: ActiveCard[]) {
		logService.log("game", `Setting cards: source=${source.length}, target=${target.length}`);
		this._sourceCards = source;
		this._targetCards = target;
		this._selectedCard = null;
	}

	updateCardStatus(id: string, status: CardStatus) {
		const sc = this._sourceCards.find((c) => c.id === id);
		if (sc) sc.status = status;
		const tc = this._targetCards.find((c) => c.id === id);
		if (tc) tc.status = status;
	}

	clearColumnSelection(language: string) {
		const reset = (c: ActiveCard) => {
			if (c.language === language && c.status === "selected") c.status = "idle";
		};
		this._sourceCards.forEach(reset);
		this._targetCards.forEach(reset);
	}

	setSelectedCard(card: ActiveCard | null) { this._selectedCard = card; }

	recordMatch() {
		const now = Date.now();
		this._streak++;
		this._correctAnswersHistory.push(now);
	}

	recordMiss() {
		this._streak = 0;
		this._mistakesCount++;
	}

	resetStats() {
		this._streak = 0;
		this._mistakesCount = 0;
		this._correctAnswersHistory = [];
		this._ignoredTime = 0;
		this._wordPool = shuffle([...this._currentWords]);
		this._sourceCards = [];
		this._targetCards = [];
	}

	addIgnoredTime(time: number) { this._ignoredTime += time; }

	resetWrongCards(id1: string, id2: string) {
		const reset = (c: ActiveCard) => {
			if ((c.id === id1 || c.id === id2) && c.status === "wrong") c.status = "idle";
		};
		this._sourceCards.forEach(reset);
		this._targetCards.forEach(reset);
	}

	getPairsLimit() { return 6; }
	getVisiblePairCount() { return this._sourceCards.filter((c) => c.status !== "correct").length; }

	getAvailableWords(needed: number): WordKey[] {
		if (this._currentWords.length === 0) return [];
		const selected: WordKey[] = [];
		const currentlyOnBoard = new Set(this._sourceCards.filter((c) => c.status !== "correct").map((c) => c.wordKey));

		let attempts = 0;
		const maxAttempts = Math.max(this._wordPool.length * 2, 50);

		while (selected.length < needed && attempts < maxAttempts) {
			if (this._wordPool.length === 0) this._wordPool = shuffle([...this._currentWords]);
			const w = this._wordPool.pop();
			if (!w) { attempts++; continue; }
			if (currentlyOnBoard.has(w) || selected.includes(w)) {
				this._wordPool.splice(Math.floor(Math.random() * (this._wordPool.length + 1)), 0, w);
				attempts++;
			} else {
				selected.push(w);
				attempts = 0;
			}
		}
		return selected;
	}

	markWordAsUsed(_word: WordKey) {}

	refillCards(newSource: ActiveCard[], newTarget: ActiveCard[]) {
		let sIdx = 0, tIdx = 0;
		this._sourceCards.forEach((c, i) => {
			if (c.status === "correct" && sIdx < newSource.length) {
				this._sourceCards[i] = { ...newSource[sIdx++], slot: c.slot };
			}
		});
		this._targetCards.forEach((c, i) => {
			if (c.status === "correct" && tIdx < newTarget.length) {
				this._targetCards[i] = { ...newTarget[tIdx++], slot: c.slot };
			}
		});
		if (sIdx < newSource.length) this._sourceCards.push(...newSource.slice(sIdx));
		if (tIdx < newTarget.length) this._targetCards.push(...newTarget.slice(tIdx));
	}

	getTranslations(type: "source" | "target") {
		return type === "source" ? this._data.sourceTranslations : this._data.targetTranslations;
	}

	getTranscriptions(type: "source" | "target") {
		return type === "source" ? this._data.sourceTranscriptions : this._data.targetTranscriptions;
	}

	constructWordPair(wordKey: WordKey, settings: AppSettings): WordPair {
		return {
			id: wordKey,
			source: getTranslation(wordKey, this._data.sourceTranslations, settings.sourceLanguage),
			target: getTranslation(wordKey, this._data.targetTranslations, settings.targetLanguage),
		};
	}

	findAvailableMatch() {
		const idleSrc = this._sourceCards.filter((c) => c.status === "idle" && c.isVisible);
		const idleTgt = this._targetCards.filter((c) => c.status === "idle" && c.isVisible);
		const matches: { src: ActiveCard; tgt: ActiveCard }[] = [];
		for (const src of idleSrc) {
			const tgt = idleTgt.find((t) => t.wordKey === src.wordKey);
			if (tgt) matches.push({ src, tgt });
		}
		return matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : null;
	}

	clearHint(id1: string, id2: string, status: CardStatus) {
		const reset = (c: ActiveCard) => {
			if ((c.id === id1 || c.id === id2) && c.status === status) c.status = "idle";
		};
		this._sourceCards.forEach(reset);
		this._targetCards.forEach(reset);
	}
}

export const gameState = new GameState();
