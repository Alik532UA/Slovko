import { gameState } from '../stores/gameState.svelte';
import { settingsStore } from '../stores/settingsStore.svelte';
import { playlistStore } from '../stores/playlistStore.svelte';
import { gameDataService } from './gameDataService';
import { gameAudioHandler } from './gameAudioHandler';
import { gameFeedbackHandler } from './gameFeedbackHandler';
import { createCardsFromWordKeys, shuffle } from './gameCardFactory';
import type { ActiveCard, CardStatus, WordPair } from '../types';

/**
 * GameController — сервіс для координації ігрової логіки.
 * Відокремлює "як грати" від "що зберігати".
 */
class GameController {
    private lastInteractionTime = 0;

    /**
     * Ініціалізація нової гри
     */
    async initGame(): Promise<void> {
        gameState.setLoading(true);
        gameState.setProcessing(false);
        gameState.resetStats();
        this.lastInteractionTime = Date.now();

        try {
            const data = await gameDataService.loadGameData(settingsStore.value, playlistStore);
            gameState.setData(data);

            const { sourceLanguage, targetLanguage } = settingsStore.value;
            const initialWords = data.words.slice(0, gameState.getPairsLimit());
            
            const { source, target } = createCardsFromWordKeys(
                initialWords,
                sourceLanguage,
                targetLanguage,
                data.sourceTranslations,
                data.targetTranslations,
                data.sourceTranscriptions,
                data.targetTranscriptions
            );

            gameState.setCards(source, target);
            initialWords.forEach(w => gameState.markWordAsUsed(w));
        } catch (error) {
            console.error('Failed to initialize game:', error);
        } finally {
            gameState.setLoading(false);
        }
    }

    /**
     * Обробка вибору картки
     */
    selectCard(card: ActiveCard): void {
        this.updateTimers();

        if (gameState.isProcessing || !card.isVisible) return;
        
        const selectedCard = gameState.selectedCard;

        // Перший вибір або скасування
        if (!selectedCard) {
            gameState.updateCardStatus(card.id, 'selected');
            gameState.setSelectedCard(card);
            return;
        }

        if (selectedCard.id === card.id) {
            gameState.updateCardStatus(card.id, 'idle');
            gameState.setSelectedCard(null);
            return;
        }

        // Перемикання мови в межах однієї сторони
        if (selectedCard.language === card.language) {
            gameState.updateCardStatus(selectedCard.id, 'idle');
            gameState.updateCardStatus(card.id, 'selected');
            gameState.setSelectedCard(card);
            return;
        }

        // Другий вибір — перевірка матчу
        gameState.updateCardStatus(card.id, 'selected');
        const isMatch = selectedCard.wordKey === card.wordKey;

        if (isMatch) {
            this.handleMatch(selectedCard, card);
        } else {
            this.handleMiss(selectedCard, card);
        }
    }

    private handleMatch(card1: ActiveCard, card2: ActiveCard) {
        gameState.setProcessing(true);
        gameState.updateCardStatus(card1.id, 'correct');
        gameState.updateCardStatus(card2.id, 'correct');

        gameAudioHandler.playMatch(card1, card2);
        gameState.recordMatch();

        const isMistakesPlaylist = settingsStore.value.currentPlaylist === 'mistakes';
        gameFeedbackHandler.handleCorrect(card1.wordKey, isMistakesPlaylist);

        gameState.setSelectedCard(null);
        gameState.setProcessing(false);

        setTimeout(() => this.checkAndRefill(), 1000);
    }

    private handleMiss(card1: ActiveCard, card2: ActiveCard) {
        gameState.updateCardStatus(card1.id, 'wrong');
        gameState.updateCardStatus(card2.id, 'wrong');

        gameState.recordMiss();
        
        const pair1 = this.constructWordPair(card1.wordKey);
        const pair2 = this.constructWordPair(card2.wordKey);
        gameFeedbackHandler.handleWrong(pair1, pair2);

        gameState.setSelectedCard(null);

        setTimeout(() => {
            gameState.resetWrongCards(card1.id, card2.id);
        }, 500);
    }

    private checkAndRefill() {
        const visibleCount = gameState.getVisiblePairCount();
        const limit = gameState.getPairsLimit();

        if (visibleCount <= 2) { // REFILL_THRESHOLD
            const newWords = gameState.getAvailableWords(limit - visibleCount);
            if (newWords.length === 0) return;

            const { sourceLanguage, targetLanguage } = settingsStore.value;
            const { source, target } = createCardsFromWordKeys(
                newWords,
                sourceLanguage,
                targetLanguage,
                gameState.getTranslations('source'),
                gameState.getTranslations('target'),
                gameState.getTranscriptions('source'),
                gameState.getTranscriptions('target'),
                gameState.totalCardsCount
            );

            gameState.refillCards(source, target);
            newWords.forEach(w => gameState.markWordAsUsed(w));
        }
    }

    private updateTimers() {
        const now = Date.now();
        if (this.lastInteractionTime > 0) {
            const diff = now - this.lastInteractionTime;
            if (diff > 5000 && gameState.hasHistory) {
                gameState.addIgnoredTime(diff - 5000);
            }
        }
        this.lastInteractionTime = now;
    }

    private constructWordPair(wordKey: string): WordPair {
        return gameState.constructWordPair(wordKey, settingsStore.value);
    }

    useHint(isSlow = false): boolean {
        const pair = gameState.findAvailableMatch();
        if (!pair) return false;

        const { src, tgt } = pair;
        const status: CardStatus = isSlow ? 'hint-slow' : 'hint';
        
        gameState.updateCardStatus(src.id, status);
        gameState.updateCardStatus(tgt.id, status);

        setTimeout(() => {
            gameState.clearHint(src.id, tgt.id, status);
        }, isSlow ? 5000 : 1000);

        return true;
    }

    toggleLearningMode(): void {
        const newState = !gameState.isLearningMode;
        gameState.setLearningMode(newState);
        if (newState) {
            this.runLearningLoop();
        }
    }

    private async runLearningLoop() {
        if (!gameState.isLearningMode) return;
        if (gameState.isProcessing) {
            setTimeout(() => this.runLearningLoop(), 500);
            return;
        }

        const success = this.useHint(true);
        setTimeout(() => this.runLearningLoop(), success ? 5500 : 1000);
    }
}

export const gameController = new GameController();
