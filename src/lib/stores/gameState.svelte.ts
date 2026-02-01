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
        // Важливо: ми не можемо тут динамічно додавати "поточну" паузу без таймера,
        // але оскільки перерахунок стається при діях, то візуально WPM "заморозиться",
        // а при наступному кліку ми додамо паузу в ignoredTime, і WPM залишиться коректним.

        let adjustedElapsed = (now - startTime) - currentIgnored;

        // Захист від ділення на нуль або від'ємного часу (якщо паузи "з'їли" все)
        if (adjustedElapsed < 1000) adjustedElapsed = 1000;

        return Math.round((history.length / adjustedElapsed) * 60000);
    });

    /**
     * Завантажити переклади для поточних мов та активного режиму
     */
    async function loadTranslationsForLanguages(): Promise<void> {
        const { sourceLanguage, targetLanguage, mode, currentLevel, currentTopic } = settingsStore.value;

        // Визначаємо категорію та ID залежно від режиму
        const category = mode === 'levels' ? 'levels' : 'topics';
        const id = mode === 'levels' ? currentLevel : currentTopic;

        if (!id) {
            console.error('No ID available for translation loading');
            return;
        }

        try {
            sourceTranslations = await loadTranslations(sourceLanguage, category, id);
            targetTranslations = await loadTranslations(targetLanguage, category, id);

            // Завантажуємо транскрипції якщо одна з мов — англійська
            // (Тут можна оптимізувати і завантажувати транскрипції теж по частинах, 
            // але поки вони в одному файлі)
            if (sourceLanguage === 'en' || targetLanguage === 'en') {
                transcriptions = await loadTranscriptions(category, id);
            }
        } catch (e) {
            console.error(`Failed to load translations for ${category}/${id}`, e);
            // Fallback або порожній об'єкт, щоб не крашити гру
            sourceTranslations = {};
            targetTranslations = {};
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
        streak = 0;
        mistakesCount = 0;
        correctAnswersHistory = [];
        ignoredTime = 0;
        lastInteractionTime = Date.now();

        try {
            await loadTranslationsForLanguages();
            const words = await loadWords();
            // Перемішуємо всі слова, щоб порядок появи був випадковим
            currentWords = shuffle(words);

            // Вибрати перші N слів
            const selectedWords = currentWords.slice(0, PAIRS_ON_SCREEN);
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
        const now = Date.now();

        // Логіка пауз: якщо пройшло більше 5с з останньої дії
        if (lastInteractionTime > 0) {
            const diff = now - lastInteractionTime;
            // Враховуємо паузу тільки якщо гра вже йде (є відповіді)
            if (diff > 5000 && correctAnswersHistory.length > 0) {
                // Віднімаємо 5с, які вважаємо "часом на роздуми"
                ignoredTime += (diff - 5000);
            }
        }
        lastInteractionTime = now;

        if (isProcessing) return;
        if ((card.status !== 'idle' && card.status !== 'selected') || !card.isVisible) return;

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

        // Оновлюємо лічильники
        streak += 1;
        correctAnswersHistory = [...correctAnswersHistory, Date.now()];

        // Записуємо прогрес
        progressStore.recordCorrect(card1.wordKey);

        // Відразу дозволяємо вибір наступної пари
        selectedCard = null;
        isProcessing = false;

        setTimeout(() => {
            // Тепер ми не ховаємо картки, вони стають 10% прозорі у WordCard.svelte
            // Але нам все одно треба викликати дозаповнення
            checkAndRefill();
        }, 1000); // Збільшуємо таймаут, щоб дати гравцю побачити результат
    }

    /**
     * Неправильне з'єднання: блимаємо червоним → скидаємо
     */
    function handleWrongMatch(card1: ActiveCard, card2: ActiveCard): void {
        updateCardStatus(card1.id, 'wrong');
        updateCardStatus(card2.id, 'wrong');

        // Скидаємо стрік
        streak = 0;
        mistakesCount += 1;

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
        // Рахуємо тільки ті картки, які ще не знайдені (стан idle або selected)
        return sourceCards.filter((c) => c.status !== 'correct').length;
    }

    /**
     * Безшовний режим: додаємо нові слова коли залишилось мало пар
     */
    function checkAndRefill(): void {
        const visibleCount = getVisiblePairCount();

        if (visibleCount <= REFILL_THRESHOLD) {
            // Знаходимо невикористані слова
            let availableWords = currentWords.filter((w) => !usedWordKeys.has(w));

            // Якщо слова закінчились — скидаємо використані та перемішуємо знову
            if (availableWords.length === 0) {
                usedWordKeys.clear();
                // Залишаємо тільки ті, що ще видимі
                sourceCards.filter((c) => c.isVisible).forEach((c) => usedWordKeys.add(c.wordKey));

                // Знову беремо всі доступні (крім тих, що на екрані)
                availableWords = currentWords.filter((w) => !usedWordKeys.has(w));
                // Перемішуємо знову для різноманітності при другого проходженні
                availableWords = shuffle(availableWords);
            }

            const neededPairs = PAIRS_ON_SCREEN - visibleCount;
            // Беремо слова з вже перемішаного списку (або перемішаного при ресеті)
            const newWords = availableWords.slice(0, neededPairs);

            if (newWords.length > 0) {
                newWords.forEach((w) => usedWordKeys.add(w));

                const { source, target } = createCardsFromWordKeys(newWords, sourceCards.length);

                // Замінюємо приховані картки новими
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

    /**
     * Використати підказку
     */
    function useHint(): void {
        if (isProcessing) return;

        // Знаходимо всі доступні (idle) пари
        const visibleSources = sourceCards.filter(c => c.status === 'idle' && c.isVisible);
        const visibleTargets = targetCards.filter(c => c.status === 'idle' && c.isVisible);

        if (visibleSources.length === 0 || visibleTargets.length === 0) return;

        // Шукаємо пару, яка є в обох списках (за wordKey)
        const availablePairs: string[] = [];
        visibleSources.forEach(src => {
            if (visibleTargets.some(tgt => tgt.wordKey === src.wordKey)) {
                availablePairs.push(src.wordKey);
            }
        });

        if (availablePairs.length === 0) return;

        // Вибираємо випадкову пару
        const randomKey = availablePairs[Math.floor(Math.random() * availablePairs.length)];

        // Знаходимо ID карток
        const srcCard = visibleSources.find(c => c.wordKey === randomKey);
        const tgtCard = visibleTargets.find(c => c.wordKey === randomKey);

        if (srcCard && tgtCard) {
            isProcessing = true; // Блокуємо інтерфейс на час підказки

            updateCardStatus(srcCard.id, 'hint');
            updateCardStatus(tgtCard.id, 'hint');

            setTimeout(() => {
                // Повертаємо назад в idle, тільки якщо вони все ще 'hint'
                // (хоча через isProcessing нічого іншого статись не могло)
                sourceCards = sourceCards.map(c => c.id === srcCard.id && c.status === 'hint' ? { ...c, status: 'idle' } : c);
                targetCards = targetCards.map(c => c.id === tgtCard.id && c.status === 'hint' ? { ...c, status: 'idle' } : c);
                isProcessing = false;
            }, 1000); // Час анімації підказки
        }
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
        initGame,
        selectCard,
        useHint,
        clearSelection
    };
}

// Експортуємо єдиний екземпляр (Singleton для SSoT)
export const gameState = createGameState();
