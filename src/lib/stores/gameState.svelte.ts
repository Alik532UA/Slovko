/**
 * Game State Store - SSoT для стану гри
 * Використовує Svelte 5 Runes для реактивності
 * UDF: UI → selectCard() → state update → UI
 *
 * Refactored:
 * - Card creation logic moved to GameCardFactory
 * - Audio logic moved to GameAudioHandler
 * - Data loading logic moved to GameDataService
 * - Feedback/Side-effects moved to GameFeedbackHandler
 */
import type { ActiveCard, CardStatus, TranslationDictionary, TranscriptionDictionary, WordPair, GameMode } from '../types';
import { settingsStore } from './settingsStore.svelte';
import { playlistStore } from './playlistStore.svelte';
import { createCardsFromWordKeys, shuffle } from '../services/gameCardFactory';
import { gameAudioHandler } from '../services/gameAudioHandler';
import { gameDataService } from '../services/gameDataService';
import { gameFeedbackHandler } from '../services/gameFeedbackHandler';

const MODE_CONFIG: Record<GameMode, { pairsPerPage: number }> = {
    'levels': { pairsPerPage: 6 },
    'topics': { pairsPerPage: 6 },
    'phrases': { pairsPerPage: 6 },
    'playlists': { pairsPerPage: 6 }
};

const REFILL_THRESHOLD = 2;

// Кеш для перекладів та транскрипцій (Internal State)
let sourceTranslations: TranslationDictionary = {};
let targetTranslations: TranslationDictionary = {};
let sourceTranscriptions: TranscriptionDictionary = {};
let targetTranscriptions: TranscriptionDictionary = {};

// Використані слова
let usedWordKeys = new Set<string>();

/**
 * Створює стан гри з Svelte 5 Runes
 */
function createGameState() {
    // SSoT: весь стан гри
    let sourceCards = $state<ActiveCard[]>([]); // Картки "з якої мови"
    let targetCards = $state<ActiveCard[]>([]); // Картки "на яку мову"
    let selectedCard = $state<ActiveCard | null>(null);
    let isProcessing = $state(false);
    let isLoading = $state(true);
    let currentWords = $state<string[]>([]);

    let streak = $state(0);
    let mistakesCount = $state(0);
    let correctAnswersHistory = $state<number[]>([]);

    // Для відстеження пауз
    let lastInteractionTime = $state(0);
    let ignoredTime = $state(0);

    // Derived state for accuracy percentage
    let accuracy = $derived.by(() => {
        const matches = correctAnswersHistory.length;
        const total = matches + mistakesCount;
        if (total === 0) return 100;
        return Math.round((matches / total) * 100);
    });

    // Derived state for words per minute
    let wordsPerMinute = $derived.by(() => {
        const history = correctAnswersHistory;
        if (history.length === 0) return 0;

        // Щоб зчитувати реактивно, звертаємось до ignoredTime тут
        const currentIgnored = ignoredTime;

        const now = Date.now();
        const startTime = history[0];

        // Час, який ми "ігноруємо" (паузи)
        let adjustedElapsed = (now - startTime) - currentIgnored;

        // Захист від ділення на нуль або від'ємного часу
        if (adjustedElapsed < 1000) adjustedElapsed = 1000;

        return Math.round((history.length / adjustedElapsed) * 60000);
    });

    function getPairsLimit() {
        const mode = settingsStore.value.mode;
        return MODE_CONFIG[mode].pairsPerPage;
    }

    /**
     * Ініціалізація гри
     */
    async function initGame(): Promise<void> {
        isLoading = true;
        usedWordKeys.clear();
        streak = 0;
        mistakesCount = 0;
        correctAnswersHistory = [];
        ignoredTime = 0;
        lastInteractionTime = Date.now();

        try {
            // Load all game data via service
            const data = await gameDataService.loadGameData(settingsStore.value, playlistStore);

            sourceTranslations = data.sourceTranslations;
            targetTranslations = data.targetTranslations;
            sourceTranscriptions = data.sourceTranscriptions;
            targetTranscriptions = data.targetTranscriptions;

            const words = data.words;
            // Перемішуємо всі слова
            currentWords = shuffle(words);

            const limit = getPairsLimit();
            // Вибрати перші N слів
            const selectedWords = currentWords.slice(0, limit);
            selectedWords.forEach((w) => usedWordKeys.add(w));

            const { sourceLanguage, targetLanguage } = settingsStore.value;
            const { source, target } = createCardsFromWordKeys(
                selectedWords,
                sourceLanguage,
                targetLanguage,
                sourceTranslations,
                targetTranslations,
                sourceTranscriptions,
                targetTranscriptions
            );

            sourceCards = source;
            targetCards = target;
            selectedCard = null;
            isProcessing = false;
        } catch (error) {
            console.error('Failed to initialize game:', error);
        } finally {
            isLoading = false;
        }
    }

    /**
     * Helper to construct WordPair from current state
     */
    function constructWordPair(wordKey: string): WordPair {
        const { sourceLanguage, targetLanguage } = settingsStore.value;
        // Attempt to find EN/UK values
        let english = '';
        let ukrainian = '';

        if (sourceLanguage === 'en') english = sourceTranslations[wordKey];
        else if (targetLanguage === 'en') english = targetTranslations[wordKey];

        if (sourceLanguage === 'uk') ukrainian = sourceTranslations[wordKey];
        else if (targetLanguage === 'uk') ukrainian = targetTranslations[wordKey];

        return { id: wordKey, english, ukrainian };
    }

    /**
     * Обробка натискання на картку (UDF: Action)
     */
    function selectCard(card: ActiveCard): void {
        const now = Date.now();

        // Логіка пауз
        if (lastInteractionTime > 0) {
            const diff = now - lastInteractionTime;
            if (diff > 5000 && correctAnswersHistory.length > 0) {
                ignoredTime += (diff - 5000);
            }
        }
        lastInteractionTime = now;

        if (isProcessing) return;

        const allowedStatuses = ['idle', 'selected', 'hint', 'hint-slow', 'wrong'];
        if (!allowedStatuses.includes(card.status) || !card.isVisible) return;

        // Перший вибір
        if (!selectedCard) {
            updateCardStatus(card.id, 'selected');
            selectedCard = card;
            return;
        }

        // Скасування вибору
        if (selectedCard.id === card.id) {
            updateCardStatus(card.id, 'idle');
            selectedCard = null;
            return;
        }

        // Перемикання вибору (та сама мова)
        if (selectedCard.language === card.language) {
            updateCardStatus(selectedCard.id, 'idle');
            updateCardStatus(card.id, 'selected');
            selectedCard = card;
            return;
        }

        // Другий вибір — перевірка
        updateCardStatus(card.id, 'selected');

        const isMatch = selectedCard.wordKey === card.wordKey;

        if (isMatch) {
            isProcessing = true;
            handleCorrectMatch(selectedCard, card);
        } else {
            handleWrongMatch(selectedCard, card);
        }
    }

    /**
     * Правильне з'єднання: зеленіємо → ховаємо
     */
    function handleCorrectMatch(card1: ActiveCard, card2: ActiveCard): void {
        updateCardStatus(card1.id, 'correct');
        updateCardStatus(card2.id, 'correct');

        // Delegating audio to AudioHandler
        gameAudioHandler.playMatch(card1, card2);

        // Оновлюємо лічильники
        streak += 1;
        correctAnswersHistory = [...correctAnswersHistory, Date.now()];

        // Delegating progress/playlist updates to FeedbackHandler
        const isMistakesPlaylist = settingsStore.value.currentPlaylist === 'mistakes';
        gameFeedbackHandler.handleCorrect(card1.wordKey, isMistakesPlaylist);

        selectedCard = null;
        isProcessing = false;

        setTimeout(() => {
            checkAndRefill();
        }, 1000);
    }

    /**
     * Неправильне з'єднання: блимаємо червоним → скидаємо
     */
    function handleWrongMatch(card1: ActiveCard, card2: ActiveCard): void {
        const c1Id = card1.id;
        const c2Id = card2.id;

        updateCardStatus(c1Id, 'wrong');
        updateCardStatus(c2Id, 'wrong');

        streak = 0;
        mistakesCount += 1;

        const pair1 = constructWordPair(card1.wordKey);
        const pair2 = constructWordPair(card2.wordKey);

        // Delegating progress/playlist updates to FeedbackHandler
        gameFeedbackHandler.handleWrong(pair1, pair2);

        selectedCard = null;

        setTimeout(() => {
            sourceCards = sourceCards.map(c => c.id === c1Id && c.status === 'wrong' ? { ...c, status: 'idle' } : c);
            sourceCards = sourceCards.map(c => c.id === c2Id && c.status === 'wrong' ? { ...c, status: 'idle' } : c);
            targetCards = targetCards.map(c => c.id === c1Id && c.status === 'wrong' ? { ...c, status: 'idle' } : c);
            targetCards = targetCards.map(c => c.id === c2Id && c.status === 'wrong' ? { ...c, status: 'idle' } : c);
        }, 500);
    }

    /**
     * Оновлення статусу картки
     */
    function updateCardStatus(cardId: string, status: CardStatus): void {
        sourceCards = sourceCards.map((c) => (c.id === cardId ? { ...c, status } : c));
        targetCards = targetCards.map((c) => (c.id === cardId ? { ...c, status } : c));
    }

    /**
     * Підрахунок видимих пар
     */
    function getVisiblePairCount(): number {
        return sourceCards.filter((c) => c.status !== 'correct').length;
    }

    /**
     * Безшовний режим: додаємо нові слова коли залишилось мало пар
     */
    function checkAndRefill(): void {
        const visibleCount = getVisiblePairCount();
        const limit = getPairsLimit();

        if (visibleCount <= REFILL_THRESHOLD) {
            let availableWords = currentWords.filter((w) => !usedWordKeys.has(w));

            if (availableWords.length === 0) {
                usedWordKeys.clear();
                sourceCards.filter((c) => c.isVisible).forEach((c) => usedWordKeys.add(c.wordKey));
                availableWords = currentWords.filter((w) => !usedWordKeys.has(w));
                availableWords = shuffle(availableWords);
            }

            const neededPairs = limit - visibleCount;
            const newWords = availableWords.slice(0, neededPairs);

            if (newWords.length > 0) {
                newWords.forEach((w) => usedWordKeys.add(w));

                const { sourceLanguage, targetLanguage } = settingsStore.value;
                const { source, target } = createCardsFromWordKeys(
                    newWords,
                    sourceLanguage,
                    targetLanguage,
                    sourceTranslations,
                    targetTranslations,
                    sourceTranscriptions,
                    targetTranscriptions,
                    sourceCards.length
                );

                let sourceIndex = 0;
                let targetIndex = 0;

                sourceCards = sourceCards.map((card) => {
                    if (card.status === 'correct' && sourceIndex < source.length) {
                        const newCard = { ...source[sourceIndex], slot: card.slot };
                        sourceIndex++;
                        return newCard;
                    }
                    return card;
                });

                targetCards = targetCards.map((card) => {
                    if (card.status === 'correct' && targetIndex < target.length) {
                        const newCard = { ...target[targetIndex], slot: card.slot };
                        targetIndex++;
                        return newCard;
                    }
                    return card;
                });

                if (sourceIndex < source.length) {
                    sourceCards = [...sourceCards, ...source.slice(sourceIndex)];
                }
                if (targetIndex < target.length) {
                    targetCards = [...targetCards, ...target.slice(targetIndex)];
                }
            }
        }
    }

    let isLearningMode = $state(false);

    /**
     * Перемикач режиму навчання
     */
    function toggleLearningMode(): void {
        isLearningMode = !isLearningMode;
        if (isLearningMode) {
            runLearningLoop();
        }
    }

    /**
     * Цикл режиму навчання
     */
    async function runLearningLoop() {
        if (!isLearningMode) return;
        if (isProcessing) {
            setTimeout(runLearningLoop, 500);
            return;
        }

        const success = useHint(true);

        if (success) {
            setTimeout(runLearningLoop, 5500);
        } else {
            setTimeout(runLearningLoop, 1000);
        }
    }

    /**
     * Використати підказку
     */
    function useHint(isSlow = false): boolean {
        if (isProcessing) return false;

        const visibleSources = sourceCards.filter(c => c.status === 'idle' && c.isVisible);
        const visibleTargets = targetCards.filter(c => c.status === 'idle' && c.isVisible);

        if (visibleSources.length === 0 || visibleTargets.length === 0) return false;

        const availablePairs: string[] = [];
        visibleSources.forEach(src => {
            if (visibleTargets.some(tgt => tgt.wordKey === src.wordKey)) {
                availablePairs.push(src.wordKey);
            }
        });

        if (availablePairs.length === 0) return false;

        const randomKey = availablePairs[Math.floor(Math.random() * availablePairs.length)];

        const srcCard = visibleSources.find(c => c.wordKey === randomKey);
        const tgtCard = visibleTargets.find(c => c.wordKey === randomKey);

        if (srcCard && tgtCard) {
            const status: CardStatus = isSlow ? 'hint-slow' : 'hint';
            const duration = isSlow ? 5000 : 1000;

            updateCardStatus(srcCard.id, status);
            updateCardStatus(tgtCard.id, status);

            setTimeout(() => {
                sourceCards = sourceCards.map(c => c.id === srcCard.id && c.status === status ? { ...c, status: 'idle' } : c);
                targetCards = targetCards.map(c => c.id === tgtCard.id && c.status === status ? { ...c, status: 'idle' } : c);
            }, duration);

            return true;
        }
        return false;
    }

    /**
     * Скинути вибір (тап по фону)
     */
    function clearSelection(): void {
        if (selectedCard) {
            updateCardStatus(selectedCard.id, 'idle');
            selectedCard = null;
        }
    }

    return {
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
        get streak() {
            return streak;
        },
        get accuracy() {
            return accuracy;
        },
        get wordsPerMinute() {
            return wordsPerMinute;
        },
        get isLearningMode() {
            return isLearningMode;
        },
        initGame,
        selectCard,
        useHint,
        toggleLearningMode,
        clearSelection,
        constructWordPair
    };
}

// Експортуємо єдиний екземпляр (Singleton для SSoT)
export const gameState = createGameState();
