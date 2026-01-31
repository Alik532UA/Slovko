/**
 * Game State Store - SSoT для стану гри
 * Використовує Svelte 5 Runes для реактивності
 * UDF: UI → selectCard() → state update → UI
 *
 * Оновлено для підтримки динамічних мов та фіксованих позицій карток
 */
import type { ActiveCard, CardStatus, Language, TranslationDictionary, TranscriptionDictionary } from '../types';
import { settingsStore } from './settingsStore.svelte';
import { progressStore } from './progressStore.svelte';
import { loadLevel, loadTopic, loadTranslations, loadTranscriptions, getTranslation, getTranscription } from '../data/wordService';

const PAIRS_ON_SCREEN = 6;
const REFILL_THRESHOLD = 2;

// Кеш для перекладів та транскрипцій
let sourceTranslations: TranslationDictionary = {};
let targetTranslations: TranslationDictionary = {};
let transcriptions: TranscriptionDictionary = {};

// Використані слова
let usedWordKeys = new Set<string>();

/**
 * Перемішує масив (Fisher-Yates shuffle)
 */
function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Генерує унікальний ID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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

    /**
     * Завантажити переклади для поточних мов
     */
    async function loadTranslationsForLanguages(): Promise<void> {
        const { sourceLanguage, targetLanguage } = settingsStore.value;

        sourceTranslations = await loadTranslations(sourceLanguage);
        targetTranslations = await loadTranslations(targetLanguage);

        // Завантажуємо транскрипції якщо одна з мов — англійська
        if (sourceLanguage === 'en' || targetLanguage === 'en') {
            transcriptions = await loadTranscriptions();
        }
    }

    /**
     * Завантажити слова для поточного рівня/теми
     */
    async function loadWords(): Promise<string[]> {
        const { mode, currentLevel, currentTopic } = settingsStore.value;

        if (mode === 'levels') {
            const level = await loadLevel(currentLevel);
            return level.words;
        } else if (currentTopic) {
            const topic = await loadTopic(currentTopic);
            return topic.words;
        }

        return [];
    }

    /**
     * Створити картки з ключів слів
     */
    function createCardsFromWordKeys(wordKeys: string[], startSlot: number = 0): { source: ActiveCard[]; target: ActiveCard[] } {
        const { sourceLanguage, targetLanguage, showTranscription } = settingsStore.value;
        const sourceList: ActiveCard[] = [];
        const targetList: ActiveCard[] = [];

        wordKeys.forEach((wordKey, index) => {
            const sourceText = getTranslation(wordKey, sourceTranslations);
            const targetText = getTranslation(wordKey, targetTranslations);

            // Транскрипція для англійських слів
            let sourceTranscription: string | undefined;
            let targetTranscription: string | undefined;

            if (showTranscription) {
                if (sourceLanguage === 'en') {
                    sourceTranscription = getTranscription(wordKey, transcriptions);
                }
                if (targetLanguage === 'en') {
                    targetTranscription = getTranscription(wordKey, transcriptions);
                }
            }

            // Source картка
            sourceList.push({
                id: `src-${generateId()}-${index}`,
                wordKey,
                text: sourceText,
                transcription: sourceTranscription,
                language: sourceLanguage,
                status: 'idle',
                slot: startSlot + index,
                isVisible: true
            });

            // Target картка
            targetList.push({
                id: `tgt-${generateId()}-${index}`,
                wordKey,
                text: targetText,
                transcription: targetTranscription,
                language: targetLanguage,
                status: 'idle',
                slot: startSlot + index,
                isVisible: true
            });
        });

        return { source: shuffle(sourceList), target: shuffle(targetList) };
    }

    /**
     * Ініціалізація гри
     */
    async function initGame(): Promise<void> {
        isLoading = true;
        usedWordKeys.clear();

        try {
            await loadTranslationsForLanguages();
            const words = await loadWords();
            currentWords = words;

            // Вибрати перші N слів
            const selectedWords = words.slice(0, PAIRS_ON_SCREEN);
            selectedWords.forEach((w) => usedWordKeys.add(w));

            const { source, target } = createCardsFromWordKeys(selectedWords);
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
     * Обробка натискання на картку (UDF: Action)
     */
    function selectCard(card: ActiveCard): void {
        if (isProcessing) return;
        if (card.status !== 'idle' || !card.isVisible) return;

        // Перший вибір
        if (!selectedCard) {
            updateCardStatus(card.id, 'selected');
            selectedCard = card;
            return;
        }

        // Клік на ту саму картку — скасувати вибір
        if (selectedCard.id === card.id) {
            updateCardStatus(card.id, 'idle');
            selectedCard = null;
            return;
        }

        // Клік на картку тієї ж мови — перемикаємо вибір
        if (selectedCard.language === card.language) {
            updateCardStatus(selectedCard.id, 'idle');
            updateCardStatus(card.id, 'selected');
            selectedCard = card;
            return;
        }

        // Другий вибір — перевіряємо пару
        isProcessing = true;
        updateCardStatus(card.id, 'selected');

        const isMatch = selectedCard.wordKey === card.wordKey;

        if (isMatch) {
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

        // Записуємо прогрес
        progressStore.recordCorrect(card1.wordKey);

        // Відразу дозволяємо вибір наступної пари
        selectedCard = null;
        isProcessing = false;

        setTimeout(() => {
            // Ховаємо картки замість видалення (фіксовані позиції!)
            hideCard(card1.id);
            hideCard(card2.id);

            checkAndRefill();
        }, 500);
    }

    /**
     * Неправильне з'єднання: блимаємо червоним → скидаємо
     */
    function handleWrongMatch(card1: ActiveCard, card2: ActiveCard): void {
        updateCardStatus(card1.id, 'wrong');
        updateCardStatus(card2.id, 'wrong');

        // Записуємо помилку
        progressStore.recordWrong();

        setTimeout(() => {
            updateCardStatus(card1.id, 'idle');
            updateCardStatus(card2.id, 'idle');
            selectedCard = null;
            isProcessing = false;
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
     * Ховаємо картку (isVisible = false)
     */
    function hideCard(cardId: string): void {
        sourceCards = sourceCards.map((c) => (c.id === cardId ? { ...c, isVisible: false } : c));
        targetCards = targetCards.map((c) => (c.id === cardId ? { ...c, isVisible: false } : c));
    }

    /**
     * Підрахунок видимих пар
     */
    function getVisiblePairCount(): number {
        return sourceCards.filter((c) => c.isVisible).length;
    }

    /**
     * Безшовний режим: додаємо нові слова коли залишилось мало пар
     */
    function checkAndRefill(): void {
        const visibleCount = getVisiblePairCount();

        if (visibleCount <= REFILL_THRESHOLD) {
            // Знаходимо невикористані слова
            const availableWords = currentWords.filter((w) => !usedWordKeys.has(w));

            // Якщо слова закінчились — скидаємо використані
            if (availableWords.length === 0) {
                usedWordKeys.clear();
                // Залишаємо тільки ті, що ще видимі
                sourceCards.filter((c) => c.isVisible).forEach((c) => usedWordKeys.add(c.wordKey));
            }

            const neededPairs = PAIRS_ON_SCREEN - visibleCount;
            const newWords = currentWords.filter((w) => !usedWordKeys.has(w)).slice(0, neededPairs);

            if (newWords.length > 0) {
                newWords.forEach((w) => usedWordKeys.add(w));

                const { source, target } = createCardsFromWordKeys(newWords, sourceCards.length);

                // Замінюємо приховані картки новими
                let sourceIndex = 0;
                let targetIndex = 0;

                sourceCards = sourceCards.map((card) => {
                    if (!card.isVisible && sourceIndex < source.length) {
                        const newCard = { ...source[sourceIndex], slot: card.slot };
                        sourceIndex++;
                        return newCard;
                    }
                    return card;
                });

                targetCards = targetCards.map((card) => {
                    if (!card.isVisible && targetIndex < target.length) {
                        const newCard = { ...target[targetIndex], slot: card.slot };
                        targetIndex++;
                        return newCard;
                    }
                    return card;
                });

                // Якщо ще є нові картки — додаємо в кінець
                if (sourceIndex < source.length) {
                    sourceCards = [...sourceCards, ...source.slice(sourceIndex)];
                }
                if (targetIndex < target.length) {
                    targetCards = [...targetCards, ...target.slice(targetIndex)];
                }
            }
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
        initGame,
        selectCard
    };
}

// Експортуємо єдиний екземпляр (Singleton для SSoT)
export const gameState = createGameState();
