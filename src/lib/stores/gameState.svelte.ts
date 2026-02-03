import type { 
    ActiveCard, 
    CardStatus, 
    TranslationDictionary, 
    TranscriptionDictionary, 
    WordPair, 
    GameMode, 
    Language 
} from '../types';
import { shuffle } from '../services/gameCardFactory';
import type { AppSettings } from './settingsStore.svelte';
import type { GameData } from '../services/gameDataService';

const MODE_CONFIG: Record<GameMode, { pairsPerPage: number }> = {
    'levels': { pairsPerPage: 6 },
    'topics': { pairsPerPage: 6 },
    'phrases': { pairsPerPage: 6 },
    'playlists': { pairsPerPage: 6 }
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
    let currentWords = $state<string[]>([]);
    let usedWordKeys = $state(new Set<string>());

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
        words: []
    });

    // Похідний стан (Derived)
    const accuracy = $derived.by(() => {
        const total = correctAnswersHistory.length + mistakesCount;
        return total === 0 ? 100 : Math.round((correctAnswersHistory.length / total) * 100);
    });

    const wordsPerMinute = $derived.by(() => {
        if (correctAnswersHistory.length === 0) return 0;
        const startTime = correctAnswersHistory[0];
        let elapsed = (Date.now() - startTime) - ignoredTime;
        return Math.round((correctAnswersHistory.length / Math.max(elapsed, 1000)) * 60000);
    });

    let isLearningMode = $state(false);

    // API для читання
    return {
        // Getters
        get sourceCards() { return sourceCards; },
        get targetCards() { return targetCards; },
        get selectedCard() { return selectedCard; },
        get isProcessing() { return isProcessing; },
        get isLoading() { return isLoading; },
        get streak() { return streak; },
        get accuracy() { return accuracy; },
        get wordsPerMinute() { return wordsPerMinute; },
        get hasHistory() { return correctAnswersHistory.length > 0; },
        get totalCardsCount() { return sourceCards.length; },
        get isLearningMode() { return isLearningMode; },

        // Методи оновлення (Setters/Actions)
        setLoading(val: boolean) { isLoading = val; },
        setProcessing(val: boolean) { isProcessing = val; },
        setLearningMode(val: boolean) { isLearningMode = val; },
        
        setData(newData: GameData) {
            data = newData;
            currentWords = shuffle(newData.words);
            usedWordKeys.clear();
        },

        setCards(source: ActiveCard[], target: ActiveCard[]) {
            sourceCards = source;
            targetCards = target;
            selectedCard = null;
        },

        updateCardStatus(id: string, status: CardStatus) {
            sourceCards = sourceCards.map(c => c.id === id ? { ...c, status } : c);
            targetCards = targetCards.map(c => c.id === id ? { ...c, status } : c);
        },

        setSelectedCard(card: ActiveCard | null) {
            selectedCard = card;
        },

        recordMatch() {
            streak++;
            correctAnswersHistory = [...correctAnswersHistory, Date.now()];
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
        },

        addIgnoredTime(time: number) {
            ignoredTime += time;
        },

        resetWrongCards(id1: string, id2: string) {
            const reset = (c: ActiveCard): ActiveCard => (c.id === id1 || c.id === id2) && c.status === 'wrong' ? { ...c, status: 'idle' as CardStatus } : c;
            sourceCards = sourceCards.map(reset);
            targetCards = targetCards.map(reset);
        },

        // Helper logic for controller
        getPairsLimit() {
            // В ідеалі settingsStore має передаватись зовні, але для спрощення поки так
            return 6; 
        },

        getVisiblePairCount() {
            return sourceCards.filter(c => c.status !== 'correct').length;
        },

        getAvailableWords(needed: number): string[] {
            let available = currentWords.filter(w => !usedWordKeys.has(w));
            if (available.length < needed) {
                usedWordKeys.clear();
                sourceCards.filter(c => c.isVisible).forEach(c => usedWordKeys.add(c.wordKey));
                available = currentWords.filter(w => !usedWordKeys.has(w));
            }
            return available.slice(0, needed);
        },

        markWordAsUsed(word: string) {
            usedWordKeys.add(word);
        },

        refillCards(newSource: ActiveCard[], newTarget: ActiveCard[]) {
            let sIdx = 0, tIdx = 0;
            sourceCards = sourceCards.map(c => c.status === 'correct' && sIdx < newSource.length ? { ...newSource[sIdx++], slot: c.slot } : c);
            targetCards = targetCards.map(c => c.status === 'correct' && tIdx < newTarget.length ? { ...newTarget[tIdx++], slot: c.slot } : c);
            
            if (sIdx < newSource.length) sourceCards = [...sourceCards, ...newSource.slice(sIdx)];
            if (tIdx < newTarget.length) targetCards = [...targetCards, ...newTarget.slice(tIdx)];
        },

        getTranslations(type: 'source' | 'target') {
            return type === 'source' ? data.sourceTranslations : data.targetTranslations;
        },

        getTranscriptions(type: 'source' | 'target') {
            return type === 'source' ? data.sourceTranscriptions : data.targetTranscriptions;
        },

        constructWordPair(wordKey: string, settings: AppSettings): WordPair {
            const { sourceLanguage, targetLanguage } = settings;
            let english = '', ukrainian = '';

            if (sourceLanguage === 'en') english = data.sourceTranslations[wordKey];
            else if (targetLanguage === 'en') english = data.targetTranslations[wordKey];

            if (sourceLanguage === 'uk') ukrainian = data.sourceTranslations[wordKey];
            else if (targetLanguage === 'uk') ukrainian = data.targetTranslations[wordKey];

            return { id: wordKey, english, ukrainian };
        },

        findAvailableMatch() {
            const idleSrc = sourceCards.filter(c => c.status === 'idle' && c.isVisible);
            const idleTgt = targetCards.filter(c => c.status === 'idle' && c.isVisible);
            
            const matches: { src: ActiveCard, tgt: ActiveCard }[] = [];
            
            for (const src of idleSrc) {
                const tgt = idleTgt.find(t => t.wordKey === src.wordKey);
                if (tgt) matches.push({ src, tgt });
            }
            
            if (matches.length > 0) {
                return matches[Math.floor(Math.random() * matches.length)];
            }
            return null;
        },

        clearHint(id1: string, id2: string, status: CardStatus) {
            const reset = (c: ActiveCard): ActiveCard => (c.id === id1 || c.id === id2) && c.status === status ? { ...c, status: 'idle' as CardStatus } : c;
            sourceCards = sourceCards.map(reset);
            targetCards = targetCards.map(reset);
        }
    };
}

export const gameState = createGameState();
