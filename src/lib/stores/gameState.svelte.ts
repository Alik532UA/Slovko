/**
 * Game State Store - SSoT для стану гри
 * Використовує Svelte 5 Runes для реактивності
 * UDF: UI → selectCard() → state update → UI
 *
 * Оновлено для підтримки динамічних мов та фіксованих позицій карток
 */
import type { ActiveCard, CardStatus, Language, TranslationDictionary, TranscriptionDictionary, WordPair } from '../types';
import { settingsStore } from './settingsStore.svelte';
import { progressStore } from './progressStore.svelte';
import { playlistStore } from './playlistStore.svelte';
import { loadLevel, loadTopic, loadTranslations, loadTranscriptions, getTranslation, getTranscription, loadPhrasesLevel } from '../data/wordService';
import { generateRulesIPA } from '../services/transcriptionService';
import { convertIPAToTarget } from '../services/phoneticsService';

const DEFAULT_PAIRS_ON_SCREEN = 6;
const PHRASES_PAIRS_ON_SCREEN = 4;
const REFILL_THRESHOLD = 2;

// Кеш для перекладів та транскрипцій
let sourceTranslations: TranslationDictionary = {};
let targetTranslations: TranslationDictionary = {};
let sourceTranscriptions: TranscriptionDictionary = {};
let targetTranscriptions: TranscriptionDictionary = {};

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
        let adjustedElapsed = (now - startTime) - currentIgnored;

        // Захист від ділення на нуль або від'ємного часу
        if (adjustedElapsed < 1000) adjustedElapsed = 1000;

        return Math.round((history.length / adjustedElapsed) * 60000);
    });

    function getPairsLimit() {
        return settingsStore.value.mode === 'phrases' ? PHRASES_PAIRS_ON_SCREEN : DEFAULT_PAIRS_ON_SCREEN;
    }

    /**
     * Завантажити переклади для поточних мов та активного режиму
     */
    async function loadTranslationsForLanguages(): Promise<void> {
        const { sourceLanguage, targetLanguage, mode, currentLevel, currentTopic, currentPlaylist } = settingsStore.value;
        const category = mode === 'levels' ? 'levels' : 'topics';

        // Clear previous
        sourceTranslations = {};
        targetTranslations = {};
        sourceTranscriptions = {};
        targetTranscriptions = {};

        try {
            if (mode === 'phrases') {
                const phrases = await loadPhrasesLevel(currentLevel);
                phrases.forEach((p: any) => {
                    const getVal = (lang: string) => {
                        if (lang === 'en') return p.english;
                        if (lang === 'uk') return p.ukrainian;
                        if (lang === 'nl') return p.nl;
                        if (lang === 'de') return p.de;
                        if (lang === 'crh') return p.crh;
                        return p.id;
                    };

                    sourceTranslations[p.id] = getVal(sourceLanguage);
                    targetTranslations[p.id] = getVal(targetLanguage);
                });
                return;
            } else if (mode === 'playlists' && currentPlaylist) {
                const mistakes = playlistStore.mistakes;
                const pairs = currentPlaylist === 'mistakes'
                    ? mistakes.map(m => m.pair)
                    : (currentPlaylist === 'favorites' ? playlistStore.favorites : playlistStore.extra);

                pairs.forEach(p => {
                    if (sourceLanguage === 'en') sourceTranslations[p.id] = p.english;
                    else if (sourceLanguage === 'uk') sourceTranslations[p.id] = p.ukrainian;

                    if (targetLanguage === 'en') targetTranslations[p.id] = p.english;
                    else if (targetLanguage === 'uk') targetTranslations[p.id] = p.ukrainian;
                });
                return;
            }

            const id = mode === 'levels' ? currentLevel : currentTopic;
            if (!id) return; // Should not happen

            sourceTranslations = await loadTranslations(sourceLanguage, category, id);
            targetTranslations = await loadTranslations(targetLanguage, category, id);

            // Load transcriptions for Source and Target
            sourceTranscriptions = await loadTranscriptions(category, id, sourceLanguage);
            targetTranscriptions = await loadTranscriptions(category, id, targetLanguage);
        } catch (e) {
            console.error(`Failed to load translations for ${mode}`, e);
            sourceTranslations = {};
            targetTranslations = {};
        }
    }

    /**
     * Завантажити слова для поточного рівня/теми
     */
    async function loadWords(): Promise<string[]> {
        const { mode, currentLevel, currentTopic, currentPlaylist } = settingsStore.value;

        if (mode === 'levels') {
            const level = await loadLevel(currentLevel);
            return level.words;
        } else if (mode === 'topics' && currentTopic) {
            const topic = await loadTopic(currentTopic);
            return topic.words;
        } else if (mode === 'phrases') {
            const phrases = await loadPhrasesLevel(currentLevel);
            return phrases.map((p: any) => p.id);
        } else if (mode === 'playlists' && currentPlaylist) {
            if (currentPlaylist === 'mistakes') return playlistStore.mistakes.map(m => m.pair.id);
            if (currentPlaylist === 'favorites') return playlistStore.favorites.map(p => p.id);
            if (currentPlaylist === 'extra') return playlistStore.extra.map(p => p.id);
        }

        return [];
    }

    /**
     * Створити картки з ключів слів
     */
    function createCardsFromWordKeys(wordKeys: string[], startSlot: number = 0): { source: ActiveCard[]; target: ActiveCard[] } {
        const { sourceLanguage, targetLanguage } = settingsStore.value;
        const sourceList: ActiveCard[] = [];
        const targetList: ActiveCard[] = [];

        wordKeys.forEach((wordKey, index) => {
            const sourceText = getTranslation(wordKey, sourceTranslations);
            const targetText = getTranslation(wordKey, targetTranslations);

            // Source Transcription (Word -> IPA -> Target Alphabet)
            let sourceIPA = getTranscription(wordKey, sourceTranscriptions, true);
            let sourceTranscription: string | undefined;

            // If no dictionary IPA, generate on the fly
            if (!sourceIPA) {
                sourceIPA = generateRulesIPA(sourceText, sourceLanguage);
            }

            if (sourceLanguage === 'en' && sourceIPA) {
                // English shows raw IPA
                sourceTranscription = sourceIPA;
            } else if (sourceIPA) {
                // Convert IPA to Target language alphabet
                sourceTranscription = convertIPAToTarget(sourceIPA, targetLanguage);
            }

            // Target Transcription (Word -> IPA -> Source Alphabet)
            let targetIPA = getTranscription(wordKey, targetTranscriptions, true);
            let targetTranscription: string | undefined;

            // If no dictionary IPA, generate on the fly
            if (!targetIPA) {
                targetIPA = generateRulesIPA(targetText, targetLanguage);
            }

            if (targetLanguage === 'en' && targetIPA) {
                // English shows raw IPA
                targetTranscription = targetIPA;
            } else if (targetIPA) {
                // Convert IPA to Source language alphabet
                targetTranscription = convertIPAToTarget(targetIPA, sourceLanguage);
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

            const limit = getPairsLimit();
            // Вибрати перші N слів
            const selectedWords = currentWords.slice(0, limit);
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

        // Дозволяємо вибір навіть якщо картка підсвічена підказкою
        const allowedStatuses = ['idle', 'selected', 'hint', 'hint-slow'];
        if (!allowedStatuses.includes(card.status) || !card.isVisible) return;

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

        // Check if in mistakes playlist
        if (settingsStore.value.currentPlaylist === 'mistakes') {
            playlistStore.recordCorrect(card1.wordKey);
        }

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

        // Add to mistakes playlist
        // We need to construct WordPair. 
        // We have keys card1.wordKey.
        // We can map it using sourceTranslations and targetTranslations (if available)
        // Note: card1.wordKey === card2.wordKey usually? No, wrong match means they DIFFER.
        // Wait, handleWrongMatch is called when keys DIFFER.
        // So we have TWO errors? `card1` is wrong and `card2` is wrong.
        // Usually we record mistakes for the PAIR the user intended?
        // Actually, user paired A with B. Neither A nor B is "correct" for each other.
        // We should probably add BOTH to mistakes? Or just ignoring for now?
        // User said "Mistakes playlist automatically adds words which were error pairs".
        // If I pair "Apple" with "Cat", I don't know "Apple" AND I don't know "Cat".
        // So I should add both to mistakes.

        const pair1 = constructWordPair(card1.wordKey);
        const pair2 = constructWordPair(card2.wordKey);

        playlistStore.recordMistake(pair1);
        playlistStore.recordMistake(pair2);

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
        const limit = getPairsLimit();

        if (visibleCount <= REFILL_THRESHOLD) {
            // Знаходимо невикористані слова
            let availableWords = currentWords.filter((w) => !usedWordKeys.has(w));

            // Якщо слова закінчились
            if (availableWords.length === 0) {
                // For playlists or phrases, we just recycle
                usedWordKeys.clear();
                sourceCards.filter((c) => c.isVisible).forEach((c) => usedWordKeys.add(c.wordKey));
                availableWords = currentWords.filter((w) => !usedWordKeys.has(w));
                availableWords = shuffle(availableWords);
            }

            const neededPairs = limit - visibleCount;
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
        constructWordPair // Added export for UI usage if needed (e.g. adding to favorites manually)
    };
}

// Експортуємо єдиний екземпляр (Singleton для SSoT)
export const gameState = createGameState();
